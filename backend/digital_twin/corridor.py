from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field

@dataclass
class Platform:
    id: str
    number: int
    station_code: str
    length_meters: int = 600
    is_electrified: bool = True
    current_occupant: Optional[str] = None  # train_id or None
    reserved_until_min: Optional[int] = None

@dataclass
class SidingLoop:
    id: str
    station_code: str
    name: str
    capacity_trains: int = 2
    occupied_by: List[str] = field(default_factory=list)

@dataclass
class BlockSection:
    id: str
    from_km: float
    to_km: float
    direction: str  # "UP" (NDLS -> HWH) or "DOWN" (HWH -> NDLS)
    signal_aspect: str = "GREEN"  # "GREEN", "DOUBLE_YELLOW", "YELLOW", "RED"
    occupied_by: Optional[str] = None  # train_id
    speed_limit_kmh: int = 130
    kavach_active: bool = True

@dataclass
class PhysicalStation:
    code: str
    name: str
    km_mark: float
    platforms: List[Platform]
    loops: List[SidingLoop]
    zone: str
    division: str

class CorridorNetwork:
    """
    Physical Digital Twin of the 1,521 km Golden Trunk Railway Corridor (NDLS - HWH).
    Models real track geometry, automatic block signals (ABS), platforms, and siding loops.
    """
    def __init__(self):
        self.stations: Dict[str, PhysicalStation] = {}
        self.block_sections: Dict[str, BlockSection] = {}
        self._build_corridor()

    def _build_corridor(self):
        # 1. Build Physical Stations with real platform layouts
        station_configs = [
            {"code": "NDLS", "name": "New Delhi", "km": 0.0, "pfs": 16, "loops": 4, "zone": "NR", "div": "DLI"},
            {"code": "CNB", "name": "Kanpur Central", "km": 440.0, "pfs": 10, "loops": 3, "zone": "NCR", "div": "PRYJ"},
            {"code": "PRYJ", "name": "Prayagraj Junction", "km": 634.0, "pfs": 10, "loops": 3, "zone": "NCR", "div": "PRYJ"},
            {"code": "BSB", "name": "Varanasi Junction", "km": 759.0, "pfs": 9, "loops": 2, "zone": "NR", "div": "LKO"},
            {"code": "PNBE", "name": "Patna Junction", "km": 989.0, "pfs": 10, "loops": 3, "zone": "ECR", "div": "DNR"},
            {"code": "HWH", "name": "Howrah Junction", "km": 1521.0, "pfs": 23, "loops": 6, "zone": "ER", "div": "HWH"}
        ]

        for cfg in station_configs:
            code = cfg["code"]
            platforms = [
                Platform(id=f"{code}_PF{i+1}", number=i+1, station_code=code)
                for i in range(cfg["pfs"])
            ]
            loops = [
                SidingLoop(id=f"{code}_LOOP{i+1}", station_code=code, name=f"Overtake Siding {i+1}")
                for i in range(cfg["loops"])
            ]
            self.stations[code] = PhysicalStation(
                code=code,
                name=cfg["name"],
                km_mark=cfg["km"],
                platforms=platforms,
                loops=loops,
                zone=cfg["zone"],
                division=cfg["div"]
            )

        # 2. Build 52 Automatic Block Signal Sections (ABS) along the corridor
        section_pairs = [
            ("NDLS", "CNB", 0.0, 440.0, 14),
            ("CNB", "PRYJ", 440.0, 634.0, 7),
            ("PRYJ", "BSB", 634.0, 759.0, 5),
            ("BSB", "PNBE", 759.0, 989.0, 8),
            ("PNBE", "HWH", 989.0, 1521.0, 18)
        ]

        sec_idx = 1
        for from_st, to_st, start_km, end_km, count in section_pairs:
            step = (end_km - start_km) / count
            for i in range(count):
                b_start = start_km + i * step
                b_end = b_start + step
                # UP Direction Section
                up_id = f"BLK_UP_{sec_idx:02d}_{from_st}_{to_st}_{i+1}"
                self.block_sections[up_id] = BlockSection(
                    id=up_id,
                    from_km=round(b_start, 1),
                    to_km=round(b_end, 1),
                    direction="UP",
                    speed_limit_kmh=130 if to_st != "BSB" else 110
                )
                # DOWN Direction Section
                dn_id = f"BLK_DN_{sec_idx:02d}_{to_st}_{from_st}_{i+1}"
                self.block_sections[dn_id] = BlockSection(
                    id=dn_id,
                    from_km=round(b_end, 1),
                    to_km=round(b_start, 1),
                    direction="DOWN",
                    speed_limit_kmh=130 if to_st != "BSB" else 110
                )
                sec_idx += 1

    def get_station(self, code: str) -> Optional[PhysicalStation]:
        return self.stations.get(code)

    def get_distance_between(self, from_code: str, to_code: str) -> float:
        st1 = self.get_station(from_code)
        st2 = self.get_station(to_code)
        if not st1 or not st2:
            return 0.0
        return abs(st2.km_mark - st1.km_mark)

    def get_all_platforms_state(self) -> Dict[str, Any]:
        """Returns snapshot of all platforms across all stations."""
        result = {}
        for code, st in self.stations.items():
            result[code] = {
                "name": st.name,
                "km": st.km_mark,
                "platforms": [
                    {
                        "id": pf.id,
                        "number": pf.number,
                        "occupied_by": pf.current_occupant,
                        "reserved_until_min": pf.reserved_until_min
                    }
                    for pf in st.platforms[:6] # Top 6 platforms for visual clarity
                ],
                "loops": [
                    {
                        "id": lp.id,
                        "name": lp.name,
                        "occupied_by": lp.occupied_by
                    }
                    for lp in st.loops
                ]
            }
        return result

# Global Corridor Digital Twin instance
PHYSICAL_CORRIDOR = CorridorNetwork()
