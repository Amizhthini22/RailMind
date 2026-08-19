from pydantic import BaseModel
from typing import List, Any, Dict

class CandidateAction(BaseModel):
    train_id: str
    train_name: str
    station_code: str
    proposed_delay: int
    cost: int
    action_type: str

class RescheduleAction(BaseModel):
    selected_actions: List[CandidateAction]
    total_cost: int
    explanation: str

def negotiate(conflicting_proposals: List[CandidateAction]) -> RescheduleAction:
    """
    Resolves conflicts between two trains' optimal fixes by comparing the sum
    of passenger-minutes costs across both trains combined.
    """
    from agents import calculate_anchored_cost, TRAIN_MAP
    from models import DelayEvent
    
    if len(conflicting_proposals) < 2:
        # No conflict to resolve, just pick the first proposal
        return RescheduleAction(
            selected_actions=conflicting_proposals,
            total_cost=sum(p.cost for p in conflicting_proposals),
            explanation="No conflict detected: insufficient proposals to negotiate."
        )
        
    prop_a = conflicting_proposals[0]
    prop_b = conflicting_proposals[1]
    
    train_a = TRAIN_MAP.get(prop_a.train_id)
    train_b = TRAIN_MAP.get(prop_b.train_id)
    
    # We compare 3 candidate combinations (strategies)
    # Combination 1: Train A delayed by full amount, Train B on-time (rerouted)
    event_a1 = DelayEvent(
        train_id=prop_a.train_id,
        station_code=prop_a.station_code,
        delay_minutes=prop_a.proposed_delay,
        reason="Primary Delay"
    )
    impact_a1 = 850 + (prop_a.proposed_delay * 15)
    cost_a1 = calculate_anchored_cost(event_a1, [train_a], impact_a1)["financial_cost"]
    
    event_b1 = DelayEvent(
        train_id=prop_b.train_id,
        station_code=prop_b.station_code,
        delay_minutes=0,
        reason="Re-routed"
    )
    cost_b1 = calculate_anchored_cost(event_b1, [train_b], 0)["financial_cost"]
    
    total_cost_combo_1 = cost_a1 + cost_b1
    
    # Combination 2: Train B delayed by full amount, Train A on-time (substituted)
    event_a2 = DelayEvent(
        train_id=prop_a.train_id,
        station_code=prop_a.station_code,
        delay_minutes=0,
        reason="Substituted"
    )
    cost_a2 = calculate_anchored_cost(event_a2, [train_a], 0)["financial_cost"]
    
    event_b2 = DelayEvent(
        train_id=prop_b.train_id,
        station_code=prop_b.station_code,
        delay_minutes=prop_b.proposed_delay,
        reason="Delayed"
    )
    impact_b2 = 850 + (prop_b.proposed_delay * 15)
    cost_b2 = calculate_anchored_cost(event_b2, [train_b], impact_b2)["financial_cost"]
    
    total_cost_combo_2 = cost_a2 + cost_b2
    
    # Combination 3: Shared delays (both delayed by half the delay minutes)
    delay_half_a = max(5, prop_a.proposed_delay // 2)
    delay_half_b = max(5, prop_b.proposed_delay // 2)
    
    event_a3 = DelayEvent(
        train_id=prop_a.train_id,
        station_code=prop_a.station_code,
        delay_minutes=delay_half_a,
        reason="Shared Delay"
    )
    impact_a3 = 850 + (delay_half_a * 15)
    cost_a3 = calculate_anchored_cost(event_a3, [train_a], impact_a3)["financial_cost"]
    
    event_b3 = DelayEvent(
        train_id=prop_b.train_id,
        station_code=prop_b.station_code,
        delay_minutes=delay_half_b,
        reason="Shared Delay"
    )
    impact_b3 = 850 + (delay_half_b * 15)
    cost_b3 = calculate_anchored_cost(event_b3, [train_b], impact_b3)["financial_cost"]
    
    total_cost_combo_3 = cost_a3 + cost_b3
    
    # Choose combination with lowest total cost
    costs = {
        "combo_1": (total_cost_combo_1, "Option 1: Hold/Delay Train A (cost: ₹{cost1:,}) and Reroute Train B (cost: ₹{cost2:,})"),
        "combo_2": (total_cost_combo_2, "Option 2: Substitute Train A (cost: ₹{cost1:,}) and Delay Train B (cost: ₹{cost2:,})"),
        "combo_3": (total_cost_combo_3, "Option 3: Share delay between both trains (Train A delay: {delay_a}m (cost: ₹{cost1:,}), Train B delay: {delay_b}m (cost: ₹{cost2:,}))")
    }
    
    min_combo = min(costs, key=lambda k: costs[k][0])
    best_cost = costs[min_combo][0]
    
    selected_actions = []
    if min_combo == "combo_1":
        selected_actions = [
            CandidateAction(train_id=prop_a.train_id, train_name=prop_a.train_name, station_code=prop_a.station_code, proposed_delay=prop_a.proposed_delay, cost=cost_a1, action_type="delay"),
            CandidateAction(train_id=prop_b.train_id, train_name=prop_b.train_name, station_code=prop_b.station_code, proposed_delay=0, cost=cost_b1, action_type="re-route")
        ]
        explanation = f"Resolved conflict by prioritizing Train B on-time performance. " + costs["combo_1"][1].format(cost1=cost_a1, cost2=cost_b1)
    elif min_combo == "combo_2":
        selected_actions = [
            CandidateAction(train_id=prop_a.train_id, train_name=prop_a.train_name, station_code=prop_a.station_code, proposed_delay=0, cost=cost_a2, action_type="substitute"),
            CandidateAction(train_id=prop_b.train_id, train_name=prop_b.train_name, station_code=prop_b.station_code, proposed_delay=prop_b.proposed_delay, cost=cost_b2, action_type="delay")
        ]
        explanation = f"Resolved conflict by substituting Train A and holding Train B. " + costs["combo_2"][1].format(cost1=cost_a2, cost2=cost_b2)
    else:
        selected_actions = [
            CandidateAction(train_id=prop_a.train_id, train_name=prop_a.train_name, station_code=prop_a.station_code, proposed_delay=delay_half_a, cost=cost_a3, action_type="shared-delay"),
            CandidateAction(train_id=prop_b.train_id, train_name=prop_b.train_name, station_code=prop_b.station_code, proposed_delay=delay_half_b, cost=cost_b3, action_type="shared-delay")
        ]
        explanation = f"Resolved conflict by sharing delays to minimize overall cascading cost. " + costs["combo_3"][1].format(delay_a=delay_half_a, cost1=cost_a3, delay_b=delay_half_b, cost2=cost_b3)
        
    explanation += f" Combined Cost: ₹{best_cost:,} INR."
    
    return RescheduleAction(
        selected_actions=selected_actions,
        total_cost=best_cost,
        explanation=explanation
    )
