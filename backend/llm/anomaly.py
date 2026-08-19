from typing import Dict, Any

# Synthetic historical delay statistics per station segment
HISTORICAL_STATS_DEFAULT = {
    "NDLS": {"mean": 10.0, "std": 5.0},
    "CNB": {"mean": 12.0, "std": 6.0},
    "PRYJ": {"mean": 15.0, "std": 7.0},
    "BSB": {"mean": 14.0, "std": 5.5},
    "PNBE": {"mean": 18.0, "std": 8.0},
    "HWH": {"mean": 20.0, "std": 9.0}
}

def flag_anomaly(event: Any, historical_stats: Dict[str, Dict[str, float]] = None) -> bool:
    """
    Performs a lightweight statistical z-score check on the delay event.
    Flags as anomaly if the delay is significantly outside normal distributions (Z > 2.0).
    """
    if historical_stats is None:
        historical_stats = HISTORICAL_STATS_DEFAULT
        
    station = event.station_code
    delay = float(event.delay_minutes)
    
    stats = historical_stats.get(station, {"mean": 15.0, "std": 7.0})
    mean = stats["mean"]
    std = stats["std"]
    
    # Calculate Z-score
    z_score = abs(delay - mean) / std if std > 0 else 0.0
    
    # Flag as anomaly if Z-score > 2.0 (more than 2 standard deviations away)
    is_anomaly = z_score > 2.0
    return is_anomaly
