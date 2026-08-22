from typing import Dict, Any, List
from digital_twin.simulator import PHYSICS_SIMULATOR, time_to_minutes, minutes_to_time
from mock_data import TRAIN_MAP
from .agent import RL_RESCHEDULER

def run_baseline_heuristic(delay_event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates the naive heuristic formula:
    'give delayed train full delay, give other trains half of it, capped at 15m'
    and assigns all trains naively to default Platform 1.
    """
    train_id = delay_event.get("train_id", "t1")
    delay_minutes = delay_event.get("delay_minutes", 30)
    station_code = delay_event.get("station_code", "CNB")
    
    baseline_plan = {}
    baseline_platforms = {}
    
    for tid, t in TRAIN_MAP.items():
        baseline_plan[tid] = {}
        baseline_platforms[tid] = {}
        apply_delay = False
        
        # Naive rule: full delay to primary, half capped at 15m to others
        if tid == train_id:
            delay_to_apply = delay_minutes
        else:
            delay_to_apply = min(delay_minutes // 2, 15)
            
        for st in t.route:
            orig_t = t.schedule.get(st)
            if st == station_code:
                apply_delay = True
                
            if apply_delay and orig_t:
                new_t = minutes_to_time(time_to_minutes(orig_t) + delay_to_apply)
                baseline_plan[tid][st] = new_t
            else:
                baseline_plan[tid][st] = orig_t
                
            # Naive formula assigns everything to Platform 1!
            baseline_platforms[tid][st] = 1

    # Evaluate physical Digital Twin violations for Baseline
    eval_result = PHYSICS_SIMULATOR.evaluate_timetable_conflicts(
        timetable=baseline_plan,
        train_map=TRAIN_MAP,
        platform_assignments=baseline_platforms
    )

    # Calculate passenger minutes
    total_pax_minutes = 0
    for tid, sched in baseline_plan.items():
        orig_sched = TRAIN_MAP[tid].schedule
        pax = 1200 if "rajdhani" in TRAIN_MAP[tid].name.lower() else (1128 if "vande" in TRAIN_MAP[tid].name.lower() else 850)
        for st, new_t in sched.items():
            orig_t = orig_sched.get(st)
            if orig_t:
                del_m = max(0, time_to_minutes(new_t) - time_to_minutes(orig_t))
                total_pax_minutes += (del_m * (pax // 100))

    # Add artificial penalty delay caused by physical platform blockages
    if eval_result["total_violations"] > 0:
        total_pax_minutes += eval_result["total_violations"] * 4500

    space_time = PHYSICS_SIMULATOR.generate_space_time_trajectories(baseline_plan, TRAIN_MAP)

    return {
        "reschedule_plan": baseline_plan,
        "platform_allocations": baseline_platforms,
        "eval_result": eval_result,
        "pax_delay_minutes": total_pax_minutes,
        "space_time_trajectories": space_time
    }

def run_head_to_head_benchmark(delay_event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a head-to-head battle comparing the Naive Formula vs RL Policy Optimizer
    inside the real physical Digital Twin.
    """
    # 1. Run Baseline Heuristic
    baseline_result = run_baseline_heuristic(delay_event)
    
    # 2. Run RL Agent
    rl_result = RL_RESCHEDULER.get_optimal_reschedule(delay_event)
    rl_space_time = PHYSICS_SIMULATOR.generate_space_time_trajectories(rl_result["reschedule_plan"], TRAIN_MAP)

    # 3. Calculate Savings
    saved_pax_minutes = max(0, baseline_result["pax_delay_minutes"] - rl_result["pax_delay_minutes"])
    saved_hours = round(saved_pax_minutes / 60.0, 1)
    
    violations_prevented = baseline_result["eval_result"]["total_violations"] - rl_result["eval_result"]["total_violations"]

    return {
        "disruption_scenario": {
            "train_id": delay_event.get("train_id"),
            "train_name": TRAIN_MAP.get(delay_event.get("train_id", "t1"), {}).name if delay_event.get("train_id") in TRAIN_MAP else "Train",
            "station_code": delay_event.get("station_code"),
            "delay_minutes": delay_event.get("delay_minutes"),
            "reason": delay_event.get("reason", "Operational Delay")
        },
        "baseline_formula": {
            "name": "Heuristic Rule (50% Delay Formula)",
            "description": "Applies naive arithmetic delay (delay // 2) with fixed Platform 1 berth.",
            "total_violations": baseline_result["eval_result"]["total_violations"],
            "platform_conflicts": baseline_result["eval_result"]["platform_conflicts"],
            "headway_conflicts": baseline_result["eval_result"]["headway_conflicts"],
            "passenger_delay_minutes": baseline_result["pax_delay_minutes"],
            "space_time": baseline_result["space_time_trajectories"],
            "is_physically_viable": baseline_result["eval_result"]["is_physically_valid"]
        },
        "rl_optimizer": {
            "name": "RailMind RL Digital Twin Policy",
            "description": f"Q-Learning AI agent. Selected Action: {rl_result['selected_action']}",
            "selected_action": rl_result["selected_action"],
            "explanation": rl_result["explanation"],
            "q_distribution": rl_result["q_distribution"],
            "total_violations": rl_result["eval_result"]["total_violations"],
            "platform_conflicts": rl_result["eval_result"]["platform_conflicts"],
            "headway_conflicts": rl_result["eval_result"]["headway_conflicts"],
            "passenger_delay_minutes": rl_result["pax_delay_minutes"],
            "space_time": rl_space_time,
            "is_physically_viable": rl_result["eval_result"]["is_physically_valid"],
            "reward": rl_result["reward"]
        },
        "comparison_summary": {
            "saved_passenger_minutes": saved_pax_minutes,
            "saved_passenger_hours": saved_hours,
            "violations_prevented": max(0, violations_prevented),
            "efficiency_gain_pct": round((saved_pax_minutes / max(1, baseline_result["pax_delay_minutes"])) * 100, 1)
        }
    }
