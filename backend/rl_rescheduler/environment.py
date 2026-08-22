from typing import Dict, Any, Tuple, List, Optional
import random
from digital_twin.corridor import PHYSICAL_CORRIDOR
from digital_twin.simulator import PHYSICS_SIMULATOR, time_to_minutes, minutes_to_time

class RailwayDisruptionEnv:
    """
    Reinforcement Learning environment for railway disruption recovery under
    physical constraints (platforms, block headways, loop overtaking sidings).
    """
    ACTIONS = [
        "HOLD_AT_LOOP",               # Action 0: Hold train in siding loop to allow higher priority train to overtake
        "REASSIGN_PLATFORM",          # Action 1: Reassign incoming train to free platform to avoid clash
        "SPEED_REGULATE_GREEN_WAVE",  # Action 2: Dynamic cruising speed regulation to hit green wave slot
        "STANDBY_RELIEF_DISPATCH",    # Action 3: Insert hot-standby rake from junction on scheduled timetable
        "CHORD_BYPASS_DIVERSION"      # Action 4: Divert through high-speed freight/express chord bypass
    ]

    def __init__(self, train_map: Dict[str, Any], stations_map: Dict[str, Any]):
        self.train_map = train_map
        self.stations_map = stations_map
        self.reset()

    def reset(self, delay_event: Optional[Dict[str, Any]] = None) -> Tuple[int, int, int, int]:
        """
        Resets environment to a disruption state.
        State tuple: (delay_tier, station_idx, num_affected_trains, standby_avail)
        """
        if delay_event:
            self.delay_minutes = delay_event.get("delay_minutes", 30)
            self.target_train = delay_event.get("train_id", "t1")
            self.station_code = delay_event.get("station_code", "CNB")
        else:
            self.delay_minutes = random.choice([15, 30, 45, 60, 90])
            self.target_train = random.choice(list(self.train_map.keys()))
            self.station_code = random.choice(["NDLS", "CNB", "PRYJ", "BSB", "PNBE"])

        # Discretize state
        delay_tier = 0 if self.delay_minutes < 20 else (1 if self.delay_minutes < 45 else 2)
        st_list = ["NDLS", "CNB", "PRYJ", "BSB", "PNBE", "HWH"]
        station_idx = st_list.index(self.station_code) if self.station_code in st_list else 1
        affected_count = len([t for t in self.train_map.values() if self.station_code in t.route])
        standby_avail = 1 if self.station_code in ["CNB", "NDLS", "PRYJ"] else 0

        self.current_state = (delay_tier, station_idx, affected_count, standby_avail)
        return self.current_state

    def step(self, action_idx: int) -> Tuple[Tuple[int, int, int, int], float, bool, Dict[str, Any]]:
        """
        Executes an action, evaluates against physical Digital Twin,
        and computes reward.
        """
        action_name = self.ACTIONS[action_idx]
        
        # 1. Generate timetable and platform allocation based on action
        reschedule_plan, platform_allocs, explanation = self._apply_action(action_name)
        
        # 2. Evaluate physical constraints via PhysicsSimulator
        eval_result = PHYSICS_SIMULATOR.evaluate_timetable_conflicts(
            timetable=reschedule_plan,
            train_map=self.train_map,
            platform_assignments=platform_allocs
        )

        # 3. Calculate passenger delay minutes
        total_pax_delay_minutes = 0
        for tid, sched in reschedule_plan.items():
            orig_sched = self.train_map[tid].schedule
            pax = 1200 if "rajdhani" in self.train_map[tid].name.lower() else (1128 if "vande" in self.train_map[tid].name.lower() else 850)
            for st, new_t in sched.items():
                orig_t = orig_sched.get(st)
                if orig_t:
                    delay_m = max(0, time_to_minutes(new_t) - time_to_minutes(orig_t))
                    total_pax_delay_minutes += (delay_m * (pax // 100))

        # 4. Compute Reward Function
        # Huge penalty for physical collisions / violations
        violation_penalty = eval_result["total_violations"] * 1000.0
        # Scaled penalty for passenger delay minutes
        delay_penalty = total_pax_delay_minutes * 0.05
        # Reward bonus for 0 violations and high punctuality
        bonus = 500.0 if eval_result["is_physically_valid"] else 0.0
        if action_name == "STANDBY_RELIEF_DISPATCH" and self.current_state[3] == 1 and self.delay_minutes >= 45:
            bonus += 300.0 # Excellent strategic choice for severe disruptions
        elif action_name == "REASSIGN_PLATFORM" and eval_result["is_physically_valid"]:
            bonus += 150.0

        reward = bonus - violation_penalty - delay_penalty
        done = True # Single step episodic decision per disruption event

        info = {
            "action": action_name,
            "reschedule_plan": reschedule_plan,
            "platform_allocations": platform_allocs,
            "explanation": explanation,
            "eval_result": eval_result,
            "pax_delay_minutes": total_pax_delay_minutes,
            "reward": reward
        }

        return self.current_state, reward, done, info

    def _apply_action(self, action: str) -> Tuple[Dict[str, Dict[str, str]], Dict[str, Dict[str, int]], str]:
        """Applies tactical action to produce physical schedule and platform assignments."""
        reschedule_plan = {}
        platform_allocs = {}

        primary_train = self.train_map[self.target_train]
        
        if action == "STANDBY_RELIEF_DISPATCH" and self.current_state[3] == 1:
            # Standby Relief Rake takes over original slot on time!
            for tid, t in self.train_map.items():
                reschedule_plan[tid] = {}
                platform_allocs[tid] = {}
                for st in t.route:
                    orig_t = t.schedule.get(st)
                    if tid == self.target_train and st == self.station_code:
                        # Delayed rake is set aside (+60m), relief rake runs on time
                        reschedule_plan[tid][st] = orig_t # Passengers catch relief rake on time!
                        platform_allocs[tid][st] = 2       # Platform 2 reserved for relief
                    else:
                        reschedule_plan[tid][st] = orig_t
                        platform_allocs[tid][st] = 1
            expl = f"Dispatched hot-standby rake from {self.station_code} Platform 2. Maintained 100% on-time timetable for downstream stations."

        elif action == "REASSIGN_PLATFORM":
            # Reassign platforms to separate conflicting trains
            for tid, t in self.train_map.items():
                reschedule_plan[tid] = {}
                platform_allocs[tid] = {}
                apply_del = False
                for st in t.route:
                    orig_t = t.schedule.get(st)
                    if st == self.station_code:
                        apply_del = True
                    if tid == self.target_train and apply_del:
                        reschedule_plan[tid][st] = minutes_to_time(time_to_minutes(orig_t) + self.delay_minutes)
                        platform_allocs[tid][st] = 3 # Reallocated to PF 3 to prevent PF1 gridlock!
                    else:
                        reschedule_plan[tid][st] = orig_t
                        platform_allocs[tid][st] = 1
            expl = f"Reassigned {primary_train.name} to Platform 3 at {self.station_code} and downstream hubs. Preserved Platform 1 for on-time express traffic."

        elif action == "HOLD_AT_LOOP":
            # Hold delayed train at siding loop to let higher priority express overtake
            for tid, t in self.train_map.items():
                reschedule_plan[tid] = {}
                platform_allocs[tid] = {}
                apply_del = False
                for st in t.route:
                    orig_t = t.schedule.get(st)
                    if st == self.station_code:
                        apply_del = True
                    if tid == self.target_train and apply_del:
                        # Extra 10 min hold at loop siding
                        reschedule_plan[tid][st] = minutes_to_time(time_to_minutes(orig_t) + self.delay_minutes + 10)
                        platform_allocs[tid][st] = 4 # Siding Loop Track
                    else:
                        reschedule_plan[tid][st] = orig_t
                        platform_allocs[tid][st] = 1
            expl = f"Diverted {primary_train.name} into {self.station_code} Overtake Loop Siding. High-speed express trains cleared on main line with zero headway penalties."

        elif action == "SPEED_REGULATE_GREEN_WAVE":
            # Regulate cruising speeds between 110-130 km/h to hit green wave
            for tid, t in self.train_map.items():
                reschedule_plan[tid] = {}
                platform_allocs[tid] = {}
                apply_del = False
                for st in t.route:
                    orig_t = t.schedule.get(st)
                    if st == self.station_code:
                        apply_del = True
                    if tid == self.target_train and apply_del:
                        # Recover 8 minutes via top MPS running
                        recovered = max(5, self.delay_minutes - 8)
                        reschedule_plan[tid][st] = minutes_to_time(time_to_minutes(orig_t) + recovered)
                        platform_allocs[tid][st] = 2
                    else:
                        reschedule_plan[tid][st] = orig_t
                        platform_allocs[tid][st] = 1
            expl = f"Green-Wave speed regulation active: commanded maximum permissible 130 km/h cruise between block sections, recovering 8 minutes of delay."

        else: # CHORD_BYPASS_DIVERSION
            for tid, t in self.train_map.items():
                reschedule_plan[tid] = {}
                platform_allocs[tid] = {}
                apply_del = False
                for st in t.route:
                    orig_t = t.schedule.get(st)
                    if st == self.station_code:
                        apply_del = True
                    if tid == self.target_train and apply_del:
                        reschedule_plan[tid][st] = minutes_to_time(time_to_minutes(orig_t) + self.delay_minutes)
                        platform_allocs[tid][st] = 5 # Bypass Track
                    else:
                        reschedule_plan[tid][st] = orig_t
                        platform_allocs[tid][st] = 1
            expl = f"Engaged AI Dynamic Chord Bypass around {self.station_code}. Bypassed high-density terminal throat lines."

        return reschedule_plan, platform_allocs, expl
