from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from .corridor import PHYSICAL_CORRIDOR, CorridorNetwork

def time_to_minutes(time_str: str) -> int:
    """Converts HH:MM to minutes from midnight."""
    parts = time_str.strip().split(":")
    return int(parts[0]) * 60 + int(parts[1])

def minutes_to_time(minutes: int) -> str:
    """Converts minutes from midnight to HH:MM."""
    normalized = minutes % 1440
    hrs = normalized // 60
    mins = normalized % 60
    return f"{hrs:02d}:{mins:02d}"

class PhysicsSimulator:
    """
    Simulates train dynamics, spatio-temporal trajectories, platform dwell times,
    and automatic block signaling headways across the physical corridor.
    """
    def __init__(self, corridor: Optional[CorridorNetwork] = None):
        self.corridor = corridor or PHYSICAL_CORRIDOR
        self.MIN_PLATFORM_HEADWAY_MINS = 15  # Minimum separation before next train can berth
        self.MIN_BLOCK_HEADWAY_MINS = 5      # ABS 5-minute safety spacing
        self.PLATFORM_DWELL_MINS = 5         # Normal station dwell time

    def evaluate_timetable_conflicts(
        self, 
        timetable: Dict[str, Dict[str, str]], 
        train_map: Dict[str, Any],
        platform_assignments: Optional[Dict[str, Dict[str, int]]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a candidate timetable against the real physical railway network.
        Returns physical violations (platform clashes, headway violations) and metrics.
        """
        platform_allocs = platform_assignments or {}
        platform_conflicts = []
        headway_conflicts = []
        
        # 1. Check Platform Conflicts at each station
        all_stations = list(self.corridor.stations.keys())
        for st_code in all_stations:
            station = self.corridor.get_station(st_code)
            if not station:
                continue

            # Gather arrivals at this station
            st_arrivals = []
            for tid, sched in timetable.items():
                if st_code in sched:
                    arr_time_str = sched[st_code]
                    arr_min = time_to_minutes(arr_time_str)
                    t_obj = train_map.get(tid)
                    # Platform allocation (default: t1 -> PF1, t2 -> PF1 to expose naive formula clash, etc.)
                    assigned_pf = platform_allocs.get(tid, {}).get(st_code, 1)
                    st_arrivals.append({
                        "train_id": tid,
                        "train_name": t_obj.name if t_obj else tid,
                        "train_number": t_obj.number if t_obj else "",
                        "time_str": arr_time_str,
                        "time_min": arr_min,
                        "platform": assigned_pf
                    })

            # Sort by arrival time
            st_arrivals.sort(key=lambda x: x["time_min"])

            # Check overlap on same platform
            for i in range(len(st_arrivals)):
                for j in range(i + 1, len(st_arrivals)):
                    a1 = st_arrivals[i]
                    a2 = st_arrivals[j]
                    time_diff = a2["time_min"] - a1["time_min"]

                    # If they share the same platform within turnaround clearance
                    if a1["platform"] == a2["platform"] and time_diff < self.MIN_PLATFORM_HEADWAY_MINS:
                        platform_conflicts.append({
                            "type": "PLATFORM_COLLISION",
                            "station_code": st_code,
                            "station_name": station.name,
                            "platform": a1["platform"],
                            "train_1": f"{a1['train_name']} ({a1['train_number']})",
                            "train_2": f"{a2['train_name']} ({a2['train_number']})",
                            "time_1": a1["time_str"],
                            "time_2": a2["time_str"],
                            "overlap_mins": self.MIN_PLATFORM_HEADWAY_MINS - time_diff,
                            "severity": "CRITICAL_PHYSICAL_VIOLATION"
                        })

        # 2. Check Track Block Headway Safety Separation
        # Compare intermediate trajectories along corridor
        train_ids = list(timetable.keys())
        for i in range(len(train_ids)):
            for j in range(i + 1, len(train_ids)):
                tid1 = train_ids[i]
                tid2 = train_ids[j]
                sched1 = timetable[tid1]
                sched2 = timetable[tid2]
                shared_stations = [s for s in all_stations if s in sched1 and s in sched2]

                for k in range(len(shared_stations) - 1):
                    s_curr = shared_stations[k]
                    s_next = shared_stations[k + 1]

                    t1_dep = time_to_minutes(sched1[s_curr])
                    t1_arr = time_to_minutes(sched1[s_next])
                    t2_dep = time_to_minutes(sched2[s_curr])
                    t2_arr = time_to_minutes(sched2[s_next])

                    # Check if train 2 overtakes or violates 5-min headway on single track block
                    if (t1_dep < t2_dep and t1_arr > t2_arr) or (abs(t1_arr - t2_arr) < self.MIN_BLOCK_HEADWAY_MINS and abs(t1_dep - t2_dep) < self.MIN_BLOCK_HEADWAY_MINS):
                        t1_obj = train_map.get(tid1)
                        t2_obj = train_map.get(tid2)
                        headway_conflicts.append({
                            "type": "BLOCK_HEADWAY_VIOLATION",
                            "from_station": s_curr,
                            "to_station": s_next,
                            "train_1": t1_obj.name if t1_obj else tid1,
                            "train_2": t2_obj.name if t2_obj else tid2,
                            "headway_gap_mins": abs(t1_arr - t2_arr),
                            "severity": "HEADWAY_VIOLATION"
                        })

        total_violations = len(platform_conflicts) + len(headway_conflicts)
        return {
            "is_physically_valid": total_violations == 0,
            "total_violations": total_violations,
            "platform_conflicts": platform_conflicts,
            "headway_conflicts": headway_conflicts
        }

    def generate_space_time_trajectories(
        self, 
        timetable: Dict[str, Dict[str, str]], 
        train_map: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generates Marey Space-Time coordinates (KM Distance vs Time Minutes)
        for visual stringline plotting in the frontend.
        """
        trajectories = []
        for tid, sched in timetable.items():
            t_obj = train_map.get(tid)
            coords = []
            for st_code, time_str in sched.items():
                st = self.corridor.get_station(st_code)
                if st:
                    t_min = time_to_minutes(time_str)
                    coords.append({
                        "station_code": st_code,
                        "station_name": st.name,
                        "km": st.km_mark,
                        "time_min": t_min,
                        "time_str": time_str
                    })

            # Sort coordinates by KM
            coords.sort(key=lambda x: x["km"])
            trajectories.append({
                "train_id": tid,
                "train_name": t_obj.name if t_obj else tid,
                "train_number": t_obj.number if t_obj else "",
                "coordinates": coords
            })

        return trajectories

PHYSICS_SIMULATOR = PhysicsSimulator()
