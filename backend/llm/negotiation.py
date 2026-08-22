from typing import List, Any, Dict
from pydantic import BaseModel, Field

class CandidateAction(BaseModel):
    action_id: str = "cand_1"
    train_id: str
    train_name: str = "Unknown Train"
    station_code: str = "NDLS"
    strategy_type: str = "delay"
    description: str = ""
    proposed_delay: int = 0
    cost: int = 0
    action_type: str = "delay"

class RescheduleAction(BaseModel):
    selected_actions: List[CandidateAction]
    total_cost: int
    explanation: str

def _calculate_combined_cost(event_a: Any, train_a: Any, impact_a: int, event_b: Any, train_b: Any, impact_b: int) -> tuple[int, int, int]:
    """Helper to call Member A's cost function for both trains combined."""
    cost_a = 0
    cost_b = 0
    
    try:
        from agents import calculate_anchored_cost
        res_a = calculate_anchored_cost(event_a, [train_a] if train_a else [], impact_a)
        res_b = calculate_anchored_cost(event_b, [train_b] if train_b else [], impact_b)
        cost_a = int(res_a.get("financial_cost", 0))
        cost_b = int(res_b.get("financial_cost", 0))
    except Exception:
        # Fallback cost calculation if agents module unavailable
        delay_a = getattr(event_a, "delay_minutes", 0)
        delay_b = getattr(event_b, "delay_minutes", 0)
        cost_a = delay_a * 3500 + (10000 if delay_a > 0 else 0)
        cost_b = delay_b * 3500 + (10000 if delay_b > 0 else 0)
        
    return cost_a, cost_b, cost_a + cost_b

def negotiate(conflicting_proposals: List[CandidateAction]) -> RescheduleAction:
    """
    Resolves conflicts between two trains' optimal fixes by comparing the sum
    of passenger-minutes and financial costs across both trains combined.
    
    :param conflicting_proposals: List of CandidateAction objects for conflicting trains.
    :return: RescheduleAction containing chosen combination, total combined cost, and explainable rationale.
    """
    if len(conflicting_proposals) < 2:
        # Single or no proposal: no conflict to resolve
        total_c = sum(getattr(p, "cost", 0) for p in conflicting_proposals)
        return RescheduleAction(
            selected_actions=conflicting_proposals,
            total_cost=total_c,
            explanation="No conflict detected: single proposal processed."
        )
        
    prop_a = conflicting_proposals[0]
    prop_b = conflicting_proposals[1]
    
    train_a = None
    train_b = None
    try:
        from mock_data import TRAIN_MAP
        train_a = TRAIN_MAP.get(prop_a.train_id)
        train_b = TRAIN_MAP.get(prop_b.train_id)
    except Exception:
        pass

    from models import DelayEvent
    
    # Combination 1: Delay Train A, Keep Train B on-time (Reroute B)
    ev_a1 = DelayEvent(train_id=prop_a.train_id, station_code=prop_a.station_code, delay_minutes=prop_a.proposed_delay, reason="Primary Delay")
    ev_b1 = DelayEvent(train_id=prop_b.train_id, station_code=prop_b.station_code, delay_minutes=0, reason="Re-routed")
    cost_a1, cost_b1, total_combo_1 = _calculate_combined_cost(ev_a1, train_a, 850 + prop_a.proposed_delay * 15, ev_b1, train_b, 0)
    
    # Combination 2: Substitute Train A, Delay Train B
    ev_a2 = DelayEvent(train_id=prop_a.train_id, station_code=prop_a.station_code, delay_minutes=0, reason="Substituted")
    ev_b2 = DelayEvent(train_id=prop_b.train_id, station_code=prop_b.station_code, delay_minutes=prop_b.proposed_delay, reason="Secondary Delay")
    cost_a2, cost_b2, total_combo_2 = _calculate_combined_cost(ev_a2, train_a, 0, ev_b2, train_b, 850 + prop_b.proposed_delay * 15)
    
    # Combination 3: Shared Delays (both delayed by half)
    delay_half_a = max(5, prop_a.proposed_delay // 2)
    delay_half_b = max(5, prop_b.proposed_delay // 2)
    ev_a3 = DelayEvent(train_id=prop_a.train_id, station_code=prop_a.station_code, delay_minutes=delay_half_a, reason="Shared Delay")
    ev_b3 = DelayEvent(train_id=prop_b.train_id, station_code=prop_b.station_code, delay_minutes=delay_half_b, reason="Shared Delay")
    cost_a3, cost_b3, total_combo_3 = _calculate_combined_cost(ev_a3, train_a, 850 + delay_half_a * 15, ev_b3, train_b, 850 + delay_half_b * 15)
    
    combinations = {
        "combo_1": (total_combo_1, cost_a1, cost_b1, prop_a.proposed_delay, 0, "delay", "reroute"),
        "combo_2": (total_combo_2, cost_a2, cost_b2, 0, prop_b.proposed_delay, "substitute", "delay"),
        "combo_3": (total_combo_3, cost_a3, cost_b3, delay_half_a, delay_half_b, "shared-delay", "shared-delay")
    }
    
    best_key = min(combinations, key=lambda k: combinations[k][0])
    best_total, best_cost_a, best_cost_b, del_a, del_b, act_a, act_b = combinations[best_key]
    
    selected_actions = [
        CandidateAction(
            action_id=f"neg_{prop_a.train_id}",
            train_id=prop_a.train_id,
            train_name=prop_a.train_name,
            station_code=prop_a.station_code,
            strategy_type=act_a,
            description=f"Negotiated action for {prop_a.train_name}: {act_a} with {del_a} min delay.",
            proposed_delay=del_a,
            cost=best_cost_a,
            action_type=act_a
        ),
        CandidateAction(
            action_id=f"neg_{prop_b.train_id}",
            train_id=prop_b.train_id,
            train_name=prop_b.train_name,
            station_code=prop_b.station_code,
            strategy_type=act_b,
            description=f"Negotiated action for {prop_b.train_name}: {act_b} with {del_b} min delay.",
            proposed_delay=del_b,
            cost=best_cost_b,
            action_type=act_b
        )
    ]
    
    explanation = (
        f"Multi-agent negotiation resolved conflict between {prop_a.train_name} and {prop_b.train_name} "
        f"by evaluating total combined passenger-minutes cost across both trains. "
        f"Selected Option '{best_key}': {prop_a.train_name} ({act_a}, cost ₹{best_cost_a:,}) and "
        f"{prop_b.train_name} ({act_b}, cost ₹{best_cost_b:,}). Total Combined Cost: ₹{best_total:,} INR."
    )
    
    return RescheduleAction(
        selected_actions=selected_actions,
        total_cost=best_total,
        explanation=explanation
    )
