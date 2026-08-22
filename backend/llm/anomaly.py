from typing import Dict, Any, Optional

# Synthetic historical delay statistics per station segment
HISTORICAL_STATS_DEFAULT = {
    "NDLS": {"mean": 10.0, "std": 5.0, "q1": 5.0, "q3": 15.0},
    "CNB": {"mean": 12.0, "std": 6.0, "q1": 7.0, "q3": 17.0},
    "PRYJ": {"mean": 15.0, "std": 7.0, "q1": 8.0, "q3": 20.0},
    "BSB": {"mean": 14.0, "std": 5.5, "q1": 9.0, "q3": 18.0},
    "PNBE": {"mean": 18.0, "std": 8.0, "q1": 10.0, "q3": 24.0},
    "HWH": {"mean": 20.0, "std": 9.0, "q1": 12.0, "q3": 28.0}
}

def flag_anomaly(
    delay_event: Any,
    historical_stats: Optional[Dict[str, Dict[str, float]]] = None
) -> bool:
    """
    Lightweight classical statistical flagging layer run BEFORE the LLM reasoning step.
    Uses Z-score or Interquartile Range (IQR) check against historical delay distributions.
    
    :param delay_event: DelayEvent object or dict containing station_code and delay_minutes.
    :param historical_stats: Optional station-level historical stats override.
    :return: True if the delay is statistically anomalous (Z > 2.0 or > Q3 + 1.5*IQR).
    """
    details = get_anomaly_details(delay_event, historical_stats)
    return details["is_anomaly"]

def get_anomaly_details(
    delay_event: Any,
    historical_stats: Optional[Dict[str, Dict[str, float]]] = None
) -> Dict[str, Any]:
    """
    Returns full statistical diagnostic details for the statistical anomaly layer.
    """
    if historical_stats is None:
        historical_stats = HISTORICAL_STATS_DEFAULT
        
    station = "CNB"
    delay = 0.0
    
    if isinstance(delay_event, dict):
        station = delay_event.get("station_code", "CNB")
        delay = float(delay_event.get("delay_minutes", 0))
    elif delay_event is not None:
        station = getattr(delay_event, "station_code", "CNB")
        delay = float(getattr(delay_event, "delay_minutes", 0))
        
    stats = historical_stats.get(station, {"mean": 15.0, "std": 7.0, "q1": 8.0, "q3": 20.0})
    mean = stats["mean"]
    std = stats["std"]
    q1 = stats.get("q1", mean - std)
    q3 = stats.get("q3", mean + std)
    iqr = q3 - q1
    
    # Calculate Z-score
    z_score = abs(delay - mean) / std if std > 0 else 0.0
    
    # Flag as anomaly if Z-score > 2.0 or delay > q3 + 1.5 * iqr
    z_anom = z_score > 2.0
    iqr_anom = delay > (q3 + 1.5 * iqr)
    is_anomaly = z_anom or iqr_anom
    
    return {
        "station_code": station,
        "observed_delay_minutes": delay,
        "mean_delay": mean,
        "std_dev": std,
        "z_score": round(z_score, 2),
        "iqr_upper_bound": round(q3 + 1.5 * iqr, 2),
        "is_anomaly": is_anomaly,
        "method": "Z-Score (>2.0) / IQR Check"
    }
