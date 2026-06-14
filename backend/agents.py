import time
from datetime import datetime, timedelta
from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from models import GraphState, DelayEvent, AgentLog, Announcement
from mock_data import TRAIN_MAP, STATION_MAP

STATION_TRANSLATIONS = {
    "NDLS": {"hi": "नई दिल्ली", "ta": "புது தில்லி", "en": "New Delhi", "ja": "ニューデリー"},
    "CNB": {"hi": "कानपुर सेंट्रल", "ta": "கான்பூர் சென்ட்ரல்", "en": "Kanpur Central", "ja": "カーンプル・セントラル"},
    "PRYJ": {"hi": "प्रयागराज जंक्शन", "ta": "பிரயாக்ராஜ் சந்திப்பு", "en": "Prayagraj Junction", "ja": "プラヤグラージ"},
    "BSB": {"hi": "वाराणसी जंक्शन", "ta": "வாரணாசி சந்திப்பு", "en": "Varanasi Junction", "ja": "ヴァーラーナシー"},
    "PNBE": {"hi": "पटना जंक्शन", "ta": "பாட்னா சந்திப்பு", "en": "Patna Junction", "ja": "パトナ"},
    "HWH": {"hi": "हावड़ा जंक्शन", "ta": "ஹவுரா சந்திப்பு", "en": "Howrah Junction", "ja": "ハウラー"}
}

TRAIN_TRANSLATIONS = {
    "Vande Bharat Express": {"hi": "वंदे भारत एक्सप्रेस", "ta": "வந்தே பாரத் எக்ஸ்பிரஸ்", "ja": "ヴァンデ・バーラト・エクスプレス"},
    "Rajdhani Express": {"hi": "राजधानी एक्सप्रेस", "ta": "ராஜ்தானி எக்ஸ்பிரஸ்", "ja": "ラージダーニー・エクスプレス"},
    "Shatabdi Express": {"hi": "शताब्दी एक्सप्रेस", "ta": "சதாப்தி எக்ஸ்பிரஸ்", "ja": "シャターブディー・エクスプレス"}
}

def get_time_diff_minutes(time1_str: str, time2_str: str) -> int:
    t1 = datetime.strptime(time1_str, "%H:%M")
    t2 = datetime.strptime(time2_str, "%H:%M")
    diff = t2 - t1
    if diff.days < 0:
        diff += timedelta(days=1)
    return int(diff.total_seconds() / 60)

def create_log(agent: str, message: str, details: Dict[str, Any] = None) -> AgentLog:
    return AgentLog(
        agent=agent,
        timestamp=datetime.now().strftime("%H:%M:%S"),
        message=message,
        details=details or {}
    )

def add_minutes(time_str: str, minutes: int) -> str:
    t = datetime.strptime(time_str, "%H:%M")
    t += timedelta(minutes=minutes)
    return t.strftime("%H:%M")

def delay_detector_agent(state: GraphState) -> Dict[str, Any]:
    # Simulates detecting a delay event from an external source or manual injection
    event = state.get("delay_event")
    train = TRAIN_MAP.get(event.train_id)
    
    log = create_log(
        "Delay Detector", 
        f"Detected {event.delay_minutes} min delay for {train.name} at {STATION_MAP[event.station_code].name}. Reason: {event.reason}",
        {"train_id": event.train_id, "station": event.station_code, "delay": event.delay_minutes}
    )
    
    # Simulate processing time
    time.sleep(1)
    
    return {"train": train, "logs": [log]}

def impact_analyzer_agent(state: GraphState) -> Dict[str, Any]:
    event = state.get("delay_event")
    primary_train = state.get("train")
    
    # Mock logic: Find other trains that share the delayed station
    affected_trains = [primary_train]
    for tid, t in TRAIN_MAP.items():
        if tid != primary_train.id and event.station_code in t.route:
            affected_trains.append(t)
            
    # Calculate Impact Metrics
    passenger_impact = len(affected_trains) * 850 + (event.delay_minutes * 15)
    financial_cost = passenger_impact * 250 + (event.delay_minutes * 5000) # Assuming refund penalties
            
    # Determine severity
    if event.delay_minutes >= 60 or len(affected_trains) > 2:
        severity = "Critical"
    elif event.delay_minutes >= 30 or len(affected_trains) > 1:
        severity = "Major"
    else:
        severity = "Minor"

    affected_names = [t.name for t in affected_trains if t.id != primary_train.id]
    msg = f"Analyzed impact. Primary train: {primary_train.name}. Severity: {severity}."
    if affected_names:
        msg += f" Cascading impact on: {', '.join(affected_names)}."
    else:
        msg += " No cascading impact on other trains."
        
    log = create_log("Impact Analyzer", msg, {
        "affected_count": len(affected_trains),
        "est_passengers_stranded": passenger_impact,
        "est_financial_loss_inr": financial_cost,
        "severity": severity
    })
    time.sleep(1.5)
    
    return {
        "affected_trains": affected_trains, 
        "passenger_impact": passenger_impact,
        "financial_cost": financial_cost,
        "severity": severity,
        "logs": [log]
    }

def rescheduler_agent(state: GraphState) -> Dict[str, Any]:
    event = state.get("delay_event")
    affected_trains = state.get("affected_trains", [])
    
    reschedule_plan = {}
    
    for t in affected_trains:
        reschedule_plan[t.id] = {}
        # Apply delay to the affected station and all subsequent stations
        apply_delay = False
        delay_to_apply = event.delay_minutes if t.id == event.train_id else min(event.delay_minutes // 2, 15) # Cascade delay is smaller
        
        for station in t.route:
            original_time = t.schedule.get(station)
            if station == event.station_code:
                apply_delay = True
                
            if apply_delay and original_time:
                new_time = add_minutes(original_time, delay_to_apply)
                reschedule_plan[t.id][station] = new_time
            else:
                reschedule_plan[t.id][station] = original_time

    log = create_log(
        "Rescheduler", 
        "Generated new schedules for affected trains to optimize network flow.",
        {"plan": reschedule_plan}
    )
    time.sleep(2)
    
    return {"reschedule_plan": reschedule_plan, "logs": [log]}

def notifier_agent(state: GraphState) -> Dict[str, Any]:
    reschedule_plan = state.get("reschedule_plan", {})
    affected_trains = state.get("affected_trains", [])
    event = state.get("delay_event")
    severity = state.get("severity", "Minor")
    timestamp_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    notifications = []
    announcements = []
    
    # Notify stations and generate announcements
    for t in affected_trains:
        for station_code in t.route:
            orig_time = t.schedule.get(station_code)
            new_time = reschedule_plan.get(t.id, {}).get(station_code)
            
            if orig_time and new_time and orig_time != new_time:
                st_name_en = STATION_MAP[station_code].name
                st_name_hi = STATION_TRANSLATIONS.get(station_code, {}).get("hi", st_name_en)
                st_name_ta = STATION_TRANSLATIONS.get(station_code, {}).get("ta", st_name_en)
                st_name_ja = STATION_TRANSLATIONS.get(station_code, {}).get("ja", st_name_en)
                
                t_name_en = t.name
                t_name_hi = TRAIN_TRANSLATIONS.get(t.name, {}).get("hi", t.name)
                t_name_ta = TRAIN_TRANSLATIONS.get(t.name, {}).get("ta", t.name)
                t_name_ja = TRAIN_TRANSLATIONS.get(t.name, {}).get("ja", t.name)
                
                diff_min = get_time_diff_minutes(orig_time, new_time)
                
                notifications.append({
                    "station": st_name_en,
                    "message": f"ALERT: {t.name} rescheduled. New ETA is {new_time}."
                })
                
                # English Text
                text_en = f"Attention passengers. Train number {t.number}, {t_name_en}, is running late by {diff_min} minutes. It is now expected to arrive at {st_name_en} at {new_time}. We deeply regret the inconvenience caused."
                
                # Hindi Text
                text_hi = f"कृपया ध्यान दें। गाड़ी संख्या {t.number}, {t_name_hi}, अपने निर्धारित समय से {diff_min} मिनट की देरी से चल रही है। इसके अब {new_time} बजे {st_name_hi} पहुँचने की संभावना है। आपको हुई असुविधा के लिए हमें खेद है।"
                
                # Tamil Text
                text_ta = f"பயணிகளின் கவனத்திற்கு. வண்டி எண் {t.number}, {t_name_ta}, {diff_min} நிமிடங்கள் தாமதமாக இயங்குகிறது. இது இப்போது {new_time} மணிக்கு {st_name_ta} நிலையத்திற்கு வந்து சேரும் என எதிர்பார்க்கப்படுகிறது. உங்களுக்கு ஏற்பட்ட அசௌகரியத்திற்கு வருந்துகிறோம்."
                
                # Japanese Text
                text_ja = f"乗客の皆様にご案内いたします。列車番号 {t.number}、{t_name_ja} は、{diff_min} 分遅れて運行しております。{st_name_ja} 駅への到着は {new_time} 頃になる見込みです。ご不便をおかけして大変申し訳ございません。"
                
                announcements.append(Announcement(
                    train_id=t.id,
                    train_name=t.name,
                    train_number=t.number,
                    station_code=station_code,
                    station_name=st_name_en,
                    delay_minutes=diff_min,
                    new_time=new_time,
                    text_en=text_en,
                    text_hi=text_hi,
                    text_ta=text_ta,
                    text_ja=text_ja,
                    severity=severity,
                    timestamp=timestamp_now
                ))
                
    log = create_log(
        "Notifier", 
        f"Dispatched {len(notifications)} alerts and generated {len(announcements)} voice announcement scripts.",
        {"notifications": notifications, "announcement_count": len(announcements)}
    )
    time.sleep(1)
    
    return {"notifications": notifications, "announcements": announcements, "logs": [log]}

def reporter_agent(state: GraphState) -> Dict[str, Any]:
    event = state.get("delay_event")
    train = state.get("train")
    severity = state.get("severity", "Minor")
    affected_trains = state.get("affected_trains", [])
    affected = len(affected_trains) - 1
    passenger_impact = state.get("passenger_impact", 0)
    financial_cost = state.get("financial_cost", 0)
    
    report = f"""
## Incident Report: {event.reason}
**Time:** {datetime.now().strftime("%Y-%m-%d %H:%M")}
**Severity:** {severity}
**Primary Train:** {train.name} ({train.number})
**Location:** {STATION_MAP[event.station_code].name}
**Delay:** {event.delay_minutes} minutes

### Financial & Operations Impact
- **Stranded Passengers:** ~{passenger_impact:,}
- **Estimated Compensation / Loss:** ₹{financial_cost:,} INR

### Impact Summary
- Cascading impact on {affected} other trains.
- New schedules generated and synchronized.
- Station authorities notified.
    """
    
    # Structured explanation generator
    explanation = f"Incident '{event.reason}' detected at {STATION_MAP[event.station_code].name} affecting {train.name} ({train.number}) with a delay of {event.delay_minutes} minutes. "
    if affected > 0:
        affected_list = [t.name for t in affected_trains if t.id != train.id]
        explanation += f"This caused a cascading impact on {affected} other train(s): {', '.join(affected_list)}. "
    else:
        explanation += "No other trains were affected by this delay. "
    explanation += f"The Rescheduler Agent recalculates schedules dynamically to minimize overlap and passenger disruption. Total estimated passenger impact: {passenger_impact:,} commuters. Financial cost estimate: ₹{financial_cost:,} INR."

    log = create_log("Reporter", "Incident report and explanation generated.", {"report_preview": report[:100] + "..."})
    time.sleep(1)
    
    return {"incident_report": report.strip(), "incident_explanation": explanation, "logs": [log]}

# Build LangGraph
workflow = StateGraph(GraphState)

workflow.add_node("detector", delay_detector_agent)
workflow.add_node("analyzer", impact_analyzer_agent)
workflow.add_node("rescheduler", rescheduler_agent)
workflow.add_node("notifier", notifier_agent)
workflow.add_node("reporter", reporter_agent)

workflow.add_edge("detector", "analyzer")
workflow.add_edge("analyzer", "rescheduler")
workflow.add_edge("rescheduler", "notifier")
workflow.add_edge("notifier", "reporter")
workflow.add_edge("reporter", END)

workflow.set_entry_point("detector")

app = workflow.compile()
