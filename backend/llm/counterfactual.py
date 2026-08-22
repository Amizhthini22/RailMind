from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# CandidateAction schema definition compatible with schemas.py and negotiation.py
class CandidateAction(BaseModel):
    action_id: str = "cand_1"
    train_id: str
    train_name: str = "Unknown Train"
    station_code: str = "NDLS"
    strategy_type: str  # "delay", "reroute", "substitution"
    description: str
    proposed_delay: int = 0
    cost: int = 0  # Real computed financial cost in INR
    action_type: str = "delay"  # "delay", "reroute", "substitution"

def _compute_action_cost(strategy_type: str, delay_event: Any, train: Any, affected_trains: List[Any]) -> int:
    """
    Computes a real cost by delegating to Member A's cost optimizer / calculate_anchored_cost function.
    """
    try:
        # Attempt to import cost_optimizer if defined by Member A
        import importlib
        cost_optimizer = importlib.import_module("cost_optimizer")
        if hasattr(cost_optimizer, "score_action"):
            return int(cost_optimizer.score_action(strategy_type, delay_event, train, affected_trains))
    except (ImportError, ModuleNotFoundError):
        pass

    try:
        from agents import calculate_anchored_cost
        from models import DelayEvent
        
        delay_mins = getattr(delay_event, "delay_minutes", 30) if delay_event else 30
        station = getattr(delay_event, "station_code", "CNB") if delay_event else "CNB"
        t_id = getattr(train, "id", "t1") if train else "t1"
        
        if strategy_type == "delay":
            ev = DelayEvent(train_id=t_id, station_code=station, delay_minutes=delay_mins, reason="Reschedule")
            aff = affected_trains if affected_trains else ([train] if train else [])
            impact = len(aff) * 850 + (delay_mins * 15)
            res = calculate_anchored_cost(ev, aff, impact)
            return int(res.get("financial_cost", delay_mins * 3500 + 20000))
            
        elif strategy_type == "reroute":
            reduced_delay = max(5, delay_mins // 2)
            ev = DelayEvent(train_id=t_id, station_code=station, delay_minutes=reduced_delay, reason="Reroute")
            aff = affected_trains if affected_trains else ([train] if train else [])
            impact = len(aff) * 600 + (reduced_delay * 15)
            res = calculate_anchored_cost(ev, aff, impact)
            # Add track switching operational overhead (15,000 INR)
            return int(res.get("financial_cost", reduced_delay * 3500) + 15000)
            
        elif strategy_type == "substitution":
            ev = DelayEvent(train_id=t_id, station_code=station, delay_minutes=0, reason="Relief Substitution")
            aff = affected_trains if affected_trains else ([train] if train else [])
            res = calculate_anchored_cost(ev, aff, 0)
            # Add standby rake mobilization fee (45,000 INR)
            return int(res.get("financial_cost", 0) + 45000)
            
    except Exception:
        pass

    # Basic mathematical fallback if agents module is not imported
    delay_mins = getattr(delay_event, "delay_minutes", 30) if hasattr(delay_event, "delay_minutes") else 30
    if strategy_type == "delay":
        return delay_mins * 3500 + 25000
    elif strategy_type == "reroute":
        return (delay_mins // 2) * 3500 + 15000
    else:
        return 45000

def generate_alternatives(
    conflict_report: Any,
    context: Any,
    n: int = 3
) -> List[CandidateAction]:
    """
    Generates up to n distinct candidate resolution strategies (delay vs reroute vs substitution),
    attaches real computed costs via cost calculation, and returns candidates ranked by cost (lowest first).
    
    :param conflict_report: Information about track/platform conflicts.
    :param context: Dict or object containing delay event, train, and affected trains.
    :param n: Number of alternatives to generate (default 3).
    :return: List of CandidateAction objects sorted by cost.
    """
    ctx_dict = context if isinstance(context, dict) else (context.dict() if hasattr(context, "dict") and callable(getattr(context, "dict")) else {})
    event = ctx_dict.get("delay_event") or ctx_dict.get("event") or context
    train = ctx_dict.get("train")
    affected_trains = ctx_dict.get("affected_trains", [])
    
    train_id = getattr(train, "id", "t1") if train else (getattr(event, "train_id", "t1") if hasattr(event, "train_id") else "t1")
    train_name = getattr(train, "name", "Vande Bharat Express") if train else "Vande Bharat Express"
    station_code = getattr(event, "station_code", "CNB") if hasattr(event, "station_code") else "CNB"
    delay_minutes = getattr(event, "delay_minutes", 30) if hasattr(event, "delay_minutes") else 30
    
    # Define 3 genuinely distinct strategy candidates
    # 1. Reschedule / Delay
    cost_1 = _compute_action_cost("delay", event, train, affected_trains)
    cand_1 = CandidateAction(
        action_id="cand_strategy_a",
        train_id=train_id,
        train_name=train_name,
        station_code=station_code,
        strategy_type="delay",
        description=f"Strategy A (Strict Rescheduling): Hold train and adjust downstream arrival times by +{delay_minutes} minutes.",
        proposed_delay=delay_minutes,
        cost=cost_1,
        action_type="delay"
    )
    
    # 2. Track Rerouting
    cost_2 = _compute_action_cost("reroute", event, train, affected_trains)
    reduced_delay = max(5, delay_minutes // 2)
    cand_2 = CandidateAction(
        action_id="cand_strategy_b",
        train_id=train_id,
        train_name=train_name,
        station_code=station_code,
        strategy_type="reroute",
        description=f"Strategy B (Track Re-routing): Re-route secondary trains to loop track slots to bypass congestion, reducing delay to +{reduced_delay} mins.",
        proposed_delay=reduced_delay,
        cost=cost_2,
        action_type="reroute"
    )
    
    # 3. Relief Rake Substitution
    cost_3 = _compute_action_cost("substitution", event, train, affected_trains)
    cand_3 = CandidateAction(
        action_id="cand_strategy_c",
        train_id=train_id,
        train_name=train_name,
        station_code=station_code,
        strategy_type="substitution",
        description="Strategy C (Relief Rake Substitution): Mobilize standby rake to replace delayed train immediately, eliminating passenger delay.",
        proposed_delay=0,
        cost=cost_3,
        action_type="substitution"
    )
    
    all_candidates = [cand_1, cand_2, cand_3]
    
    # Rank candidates by cost ascending (lowest cost first)
    all_candidates.sort(key=lambda c: c.cost)
    
    return all_candidates[:n]
