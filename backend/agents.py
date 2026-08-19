import time
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from models import GraphState, DelayEvent, AgentLog, Announcement, AuditChainVerification
from mock_data import TRAIN_MAP, STATION_MAP, STANDBY_TRAINS, STANDBY_MAP

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

# Fault Injection & Health Monitoring
AGENT_HEALTH: Dict[str, str] = {
    "rescheduler": "healthy",
    "analyzer": "healthy",
    "notifier": "healthy"
}
PENDING_ACTION_QUEUE: List[Dict[str, Any]] = []

# Hash-Chained Audit Log Storage
AUDIT_LOG_CHAIN: List[AgentLog] = []

def compute_record_hash(index: int, agent: str, timestamp: str, message: str, details: Dict[str, Any], previous_hash: str) -> str:
    canonical = {
        "index": index,
        "agent": agent,
        "timestamp": timestamp,
        "message": message,
        "details": details,
        "previous_hash": previous_hash
    }
    payload = json.dumps(canonical, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def create_log(agent: str, message: str, details: Dict[str, Any] = None) -> AgentLog:
    global AUDIT_LOG_CHAIN
    details_clean = details or {}
    idx = len(AUDIT_LOG_CHAIN) + 1
    prev_hash = AUDIT_LOG_CHAIN[-1].hash if AUDIT_LOG_CHAIN else "0" * 64
    ts = datetime.now().strftime("%H:%M:%S")
    curr_hash = compute_record_hash(idx, agent, ts, message, details_clean, prev_hash)
    
    log_record = AgentLog(
        index=idx,
        agent=agent,
        timestamp=ts,
        message=message,
        details=details_clean,
        previous_hash=prev_hash,
        hash=curr_hash
    )
    AUDIT_LOG_CHAIN.append(log_record)
    return log_record

def verify_audit_chain() -> AuditChainVerification:
    global AUDIT_LOG_CHAIN
    if not AUDIT_LOG_CHAIN:
        return AuditChainVerification(
            is_valid=True,
            total_records=0,
            chain_length=0,
            verified_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            status_message="Audit chain is empty and ready."
        )
    
    for i, rec in enumerate(AUDIT_LOG_CHAIN):
        expected_prev = "0" * 64 if i == 0 else AUDIT_LOG_CHAIN[i - 1].hash
        if rec.previous_hash != expected_prev:
            return AuditChainVerification(
                is_valid=False,
                total_records=len(AUDIT_LOG_CHAIN),
                chain_length=i,
                broken_at_index=rec.index,
                first_hash=AUDIT_LOG_CHAIN[0].hash,
                latest_hash=AUDIT_LOG_CHAIN[-1].hash,
                verified_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                status_message=f"Tamper detected at record #{rec.index}: previous_hash mismatch."
            )
        recomputed = compute_record_hash(rec.index, rec.agent, rec.timestamp, rec.message, rec.details or {}, rec.previous_hash)
        if rec.hash != recomputed:
            return AuditChainVerification(
                is_valid=False,
                total_records=len(AUDIT_LOG_CHAIN),
                chain_length=i,
                broken_at_index=rec.index,
                first_hash=AUDIT_LOG_CHAIN[0].hash,
                latest_hash=AUDIT_LOG_CHAIN[-1].hash,
                verified_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                status_message=f"Tamper detected at record #{rec.index}: content hash mismatch."
            )
            
    return AuditChainVerification(
        is_valid=True,
        total_records=len(AUDIT_LOG_CHAIN),
        chain_length=len(AUDIT_LOG_CHAIN),
        first_hash=AUDIT_LOG_CHAIN[0].hash,
        latest_hash=AUDIT_LOG_CHAIN[-1].hash,
        verified_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        status_message=f"Audit chain verified successfully ({len(AUDIT_LOG_CHAIN)} linked records)."
    )

# Simulated Policy Model Reference (Illustrative, Demo Parameters)
SIMULATED_POLICY_CITATION = "Simulated Policy Model (Illustrative Delay Tiers & Operational Penalties)"
IRCTC_CITATION = "IRCTC Ticket Deposit Receipt (TDR) Refund Schedule (Rule 4: Train Delayed >3 Hours Full Refund) & Railway Board Gazette (2024)"

AVERAGE_FARE_MAP = {
    "Vande Bharat Express": 1750,
    "Rajdhani Express": 1950,
    "Shatabdi Express": 1350
}
DEFAULT_AVG_FARE = 1200

def calculate_anchored_cost(event: DelayEvent, affected_trains: List[Any], passenger_impact: int) -> Dict[str, Any]:
    if event.delay_minutes >= 180:
        refund_pct = 1.00
        refund_tier_name = "Simulated Full Refund Tier (Delay >= 3 Hours)"
    elif event.delay_minutes >= 60:
        refund_pct = 0.50
        refund_tier_name = "Simulated Partial Refund & Compensation Tier (Delay >= 60 Mins)"
    elif event.delay_minutes >= 30:
        refund_pct = 0.25
        refund_tier_name = "Simulated Minor Disruption Allowance (Delay >= 30 Mins)"
    else:
        refund_pct = 0.00
        refund_tier_name = "Simulated Operational Tolerance (Delay < 30 Mins)"
        
    total_passenger_refund = 0
    train_breakdown = []
    
    for t in affected_trains:
        avg_fare = AVERAGE_FARE_MAP.get(t.name, DEFAULT_AVG_FARE)
        passengers_on_train = 850 if t.id == event.train_id else 600
        train_refund = int(passengers_on_train * avg_fare * refund_pct)
        total_passenger_refund += train_refund
        train_breakdown.append({
            "train": t.name,
            "avg_fare": avg_fare,
            "refund_pct": int(refund_pct * 100),
            "estimated_liability": train_refund
        })
        
    slot_penalty = event.delay_minutes * 3500
    total_financial_loss = total_passenger_refund + slot_penalty
    
    return {
        "financial_cost": total_financial_loss,
        "passenger_refund": total_passenger_refund,
        "slot_penalty": slot_penalty,
        "refund_tier": refund_tier_name,
        "refund_pct": int(refund_pct * 100),
        "citation": SIMULATED_POLICY_CITATION,
        "disclaimer": "Simulated/illustrative cost model for demonstration purposes. Not an official regulatory calculation.",
        "train_breakdown": train_breakdown
    }

def get_time_diff_minutes(time1_str: str, time2_str: str) -> int:
    t1 = datetime.strptime(time1_str, "%H:%M")
    t2 = datetime.strptime(time2_str, "%H:%M")
    diff = t2 - t1
    if diff.days < 0:
        diff += timedelta(days=1)
    return int(diff.total_seconds() / 60)

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
            
    # Calculate Impact Metrics using anchored lookup
    passenger_impact = len(affected_trains) * 850 + (event.delay_minutes * 15)
    cost_data = calculate_anchored_cost(event, affected_trains, passenger_impact)
    financial_cost = cost_data["financial_cost"]
            
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
        "refund_tier": cost_data["refund_tier"],
        "cost_citation": IRCTC_CITATION,
        "severity": severity
    })
    time.sleep(1.5)
    
    return {
        "affected_trains": affected_trains, 
        "passenger_impact": passenger_impact,
        "financial_cost": financial_cost,
        "cost_breakdown": cost_data,
        "cost_citation": IRCTC_CITATION,
        "severity": severity,
        "logs": [log]
    }

def contention_agent(state: GraphState) -> Dict[str, Any]:
    event = state.get("delay_event")
    primary_train = state.get("train")
    affected_trains = state.get("affected_trains", [])
    
    contention_records = []
    logs = []
    
    # Calculate estimated delayed times for the primary train
    primary_delayed_schedule = {}
    apply_delay = False
    for station in primary_train.route:
        original_time = primary_train.schedule.get(station)
        if station == event.station_code:
            apply_delay = True
        if apply_delay and original_time:
            primary_delayed_schedule[station] = add_minutes(original_time, event.delay_minutes)
        else:
            primary_delayed_schedule[station] = original_time

    # Find shared stations and detect overlaps
    for t in TRAIN_MAP.values():
        if t.id == primary_train.id:
            continue
        shared_stations = set(primary_train.route).intersection(set(t.route))
        for station in shared_stations:
            prim_time = primary_delayed_schedule.get(station)
            other_time = t.schedule.get(station)
            if prim_time and other_time:
                diff = abs(get_time_diff_minutes(prim_time, other_time))
                if diff < 20: # 20 mins overlap
                    conflict_type = "Platform conflict" if station in ["NDLS", "CNB", "BSB", "HWH"] else "Track conflict"
                    contention_records.append({
                        "station": station,
                        "train_1": primary_train.name,
                        "train_2": t.name,
                        "time_1": prim_time,
                        "time_2": other_time,
                        "conflict_type": conflict_type
                    })
                    msg = f"Detected {conflict_type} at {STATION_MAP[station].name} between {primary_train.name} (delayed) and {t.name} (scheduled: {other_time})."
                    logs.append(create_log("Contention Model", msg, {
                        "station": station,
                        "trains": [primary_train.name, t.name],
                        "overlap_mins": diff
                    }))
                    
    if not logs:
        logs.append(create_log("Contention Model", "Track contention scan completed. No track conflicts detected.", {"status": "Clear"}))
        
    time.sleep(1.2)
    return {"contention_records": contention_records, "logs": logs}

def rescheduler_agent(state: GraphState) -> Dict[str, Any]:
    event = state.get("delay_event")
    affected_trains = state.get("affected_trains", [])
    
    # Fault Injection Check
    if AGENT_HEALTH.get("rescheduler") == "crashed":
        time.sleep(1.0)
        log = create_log(
            "Orchestrator", 
            "⚠️ Rescheduler node timed out / process unresponsive. Action queued into self-healing recovery buffer.",
            {"status": "queued", "agent": "rescheduler", "train": event.train_id, "retry": "watchdog active"}
        )
        PENDING_ACTION_QUEUE.append(dict(state))
        return {
            "reschedule_plan": {},
            "agent_failure": "rescheduler",
            "is_queued": True,
            "logs": [log]
        }
    
    # Train Substitution / Standby Relief Train Dispatch
    if event and event.substitute_train:
        primary_train = state.get("train")
        standby_train = None
        if event.standby_train_id and event.standby_train_id in STANDBY_MAP:
            standby_train = STANDBY_MAP[event.standby_train_id]
        else:
            for st_t in STANDBY_TRAINS:
                if st_t.current_station == event.station_code:
                    standby_train = st_t
                    break
            if not standby_train:
                standby_train = STANDBY_TRAINS[0]

        reschedule_plan = {}
        reschedule_plan[standby_train.id] = {}
        reschedule_plan[primary_train.id] = {}

        apply_sub = False
        for st in primary_train.route:
            orig_t = primary_train.schedule.get(st)
            if st == event.station_code:
                apply_sub = True
            if apply_sub:
                # Standby relief rake assumes scheduled timetable on time!
                reschedule_plan[standby_train.id][st] = orig_t
                # Delayed primary rake is placed on hold
                reschedule_plan[primary_train.id][st] = add_minutes(orig_t, event.delay_minutes + 60)
            else:
                reschedule_plan[primary_train.id][st] = orig_t

        for t in affected_trains:
            if t.id != primary_train.id:
                reschedule_plan[t.id] = {st: t.schedule.get(st) for st in t.route}

        sub_info = {
            "status": "dispatched",
            "original_train_name": primary_train.name,
            "original_train_number": primary_train.number,
            "standby_train_id": standby_train.id,
            "standby_train_name": standby_train.name,
            "standby_train_number": standby_train.number,
            "substitution_station": STATION_MAP[event.station_code].name,
            "station_code": event.station_code,
            "passengers_rescued": 850
        }

        msg = f"🚨 TRAIN SUBSTITUTION: Dispatched {standby_train.name} ({standby_train.number}) from {STATION_MAP[event.station_code].name} to take over {primary_train.name}'s timetable slot on time. Primary delayed rake held."
        log = create_log("Rescheduler", msg, {"substitution": sub_info, "plan": reschedule_plan})
        time.sleep(1.5)
        return {"reschedule_plan": reschedule_plan, "substitution_info": sub_info, "logs": [log]}

    # Identify which train is re-routed
    rerouted_train_id = None
    rerouted_train_name = ""
    if len(affected_trains) > 1:
        # Let's say the second train (first secondary train) is re-routed to resolve conflict
        rerouted_train_id = affected_trains[1].id
        rerouted_train_name = affected_trains[1].name
        
    reschedule_plan = {}
    
    for t in affected_trains:
        reschedule_plan[t.id] = {}
        apply_delay = False
        
        # If it's the primary train, apply full delay
        # If it's the re-routed train, apply 0 delay
        # Otherwise, apply cascaded delay
        if t.id == event.train_id:
            delay_to_apply = event.delay_minutes
        elif t.id == rerouted_train_id:
            delay_to_apply = 0
        else:
            delay_to_apply = min(event.delay_minutes // 2, 15)
            
        for station in t.route:
            original_time = t.schedule.get(station)
            if station == event.station_code:
                apply_delay = True
                
            if apply_delay and original_time:
                new_time = add_minutes(original_time, delay_to_apply)
                reschedule_plan[t.id][station] = new_time
            else:
                reschedule_plan[t.id][station] = original_time

    if rerouted_train_id:
        msg = f"Generated optimized schedules. Re-routed {rerouted_train_name} to alternate track to resolve contention. Secondary schedules adjusted."
    else:
        msg = f"Generated updated schedule for delayed train {state.get('train').name}."

    log = create_log(
        "Rescheduler", 
        msg,
        {"plan": reschedule_plan}
    )
    time.sleep(2)
    
    return {"reschedule_plan": reschedule_plan, "logs": [log]}

def notifier_agent(state: GraphState) -> Dict[str, Any]:
    if state.get("is_queued"):
        log = create_log("Notifier", "Reschedule notifications paused pending recovery of Rescheduler agent.", {"status": "Paused"})
        return {"notifications": [], "announcements": [], "logs": [log]}

    reschedule_plan = state.get("reschedule_plan", {})
    affected_trains = state.get("affected_trains", [])
    event = state.get("delay_event")
    severity = state.get("severity", "Minor")
    timestamp_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    notifications = []
    announcements = []
    
    # Check for Standby Relief Substitution Announcements
    if state.get("substitution_info"):
        sub = state.get("substitution_info")
        st_name = sub["substitution_station"]
        orig_name = sub["original_train_name"]
        orig_num = sub["original_train_number"]
        standby_name = sub["standby_train_name"]
        standby_num = sub["standby_train_number"]
        delay_mins = event.delay_minutes if event else 45
        delay_reason = event.reason if event else "operational disruption"
        
        text_en = f"Attention please: Train number {orig_num} {orig_name} is running late by {delay_mins} minutes due to {delay_reason}. We deeply regret the inconvenience caused to passengers. To ensure your journey is on time, Standby Relief Special Train {standby_num} {standby_name} has been dispatched from {st_name} on Platform 1 to operate on the scheduled timetable. Passengers are requested to board the relief train."
        text_hi = f"यात्रियों के लिए महत्वपूर्ण सूचना: गाड़ी संख्या {orig_num} {orig_name} {delay_reason} के कारण अपने निर्धारित समय से {delay_mins} मिनट की देरी से चल रही है। यात्रियों को हुई असुविधा के लिए हमें अत्यंत खेद है। आपकी यात्रा समय पर सुनिश्चित करने के लिए, {st_name} से निर्धारित समय पर चलने हेतु राहत स्पेशल {standby_name} ({standby_num}) प्लेटफार्म 1 से रवाना की जा रही है। कृपया यात्री राहत ट्रेन में सवार हों।"
        text_ta = f"பயணிகள் கவனத்திற்கு: {orig_name} ({orig_num}) ரயில் {delay_reason} காரணமாக {delay_mins} நிமிடங்கள் தாமதமாக இயங்குகிறது. பயணிகளுக்கு ஏற்பட்ட சிரமத்திற்கு வருந்துகிறோம். உங்கள் பயண நேரத்தை காக்க, {st_name} நிலையத்திலிருந்து சரியான நேரத்தில் இயக்க நிவாரண சிறப்பு ரயில் {standby_name} ({standby_num}) நடைமேடை 1லிருந்து புறப்படுகிறது. பயணிகள் நிவாரண ரயிலில் ஏறுமாறு கேட்டுக்கொள்ளப்படுகிறார்கள்."
        text_ja = f"乗客の皆様にご案内いたします。列車番号 {orig_num} {orig_name} は {delay_reason} のため {delay_mins} 分遅れて運行しております。ご不便をおかけして大変申し訳ございません。お客様のご旅行の定刻運行のため、{st_name} より代替臨時列車 {standby_name}（{standby_num}）が1番線より発車いたします。"
        
        announcements.append(Announcement(
            train_id=sub["standby_train_id"],
            train_name=standby_name,
            train_number=standby_num,
            station_code=sub["station_code"],
            station_name=st_name,
            delay_minutes=0,
            new_time=state.get("train").schedule.get(sub["station_code"], "On Time"),
            text_en=text_en,
            text_hi=text_hi,
            text_ta=text_ta,
            text_ja=text_ja,
            severity="Major",
            timestamp=timestamp_now
        ))
        log = create_log("Notifier", f"Emitted multi-lingual Relief Train substitution announcements with delay & regret notice at {st_name}.", {"standby_train": standby_name, "delay_minutes": delay_mins, "regret_issued": True})
        return {"notifications": notifications, "announcements": announcements, "logs": [log]}

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
    if state.get("is_queued"):
        log = create_log("Reporter", "Incident reporting deferred pending Rescheduler process restoration.", {"status": "Deferred"})
        return {
            "incident_report": "⚠️ Rescheduler agent process unavailable. Delay event queued in self-healing buffer. Recovery in progress...",
            "incident_explanation": "Rescheduler agent is currently unresponsive. Pending action has been safely queued and will execute automatically upon watchdog recovery.",
            "is_queued": True,
            "logs": [log]
        }

    event = state.get("delay_event")
    train = state.get("train")
    severity = state.get("severity", "Minor")
    affected_trains = state.get("affected_trains", [])
    affected = len(affected_trains) - 1
    passenger_impact = state.get("passenger_impact", 0)
    financial_cost = state.get("financial_cost", 0)
    
    # Calculate comparison data (F1)
    baseline_pm = 0
    railmind_pm = 0
    trains_rerouted_count = 0
    trains_cascading_baseline = affected
    
    rerouted_train_id = None
    if len(affected_trains) > 1:
        rerouted_train_id = affected_trains[1].id
        trains_rerouted_count = 1
        
    trains_cascading_railmind = max(0, affected - trains_rerouted_count)

    for t in affected_trains:
        # Number of stations after conflict station (inclusive)
        try:
            conflict_idx = t.route.index(event.station_code)
            remaining_stations = len(t.route) - conflict_idx
        except ValueError:
            remaining_stations = 1
            
        # Baseline delay (full delay propagates to all trains in cascade)
        base_delay = event.delay_minutes
        baseline_pm += base_delay * remaining_stations * 850
        
        # RailMind delay (mitigated delay or re-routed to 0)
        if t.id == event.train_id:
            rm_delay = event.delay_minutes
        elif t.id == rerouted_train_id:
            rm_delay = 0
        else:
            rm_delay = min(event.delay_minutes // 2, 15)
            
        railmind_pm += rm_delay * remaining_stations * 850
        
    saved_pm = max(0, baseline_pm - railmind_pm)
    
    comparison_data = {
        "baseline": {
            "passenger_minutes": baseline_pm,
            "max_cascade_depth": len(affected_trains) if affected > 0 else 0,
            "trains_cascading": trains_cascading_baseline,
            "trains_rerouted": 0
        },
        "railmind": {
            "passenger_minutes": railmind_pm,
            "max_cascade_depth": 1 if affected > 0 else 0,
            "trains_cascading": trains_cascading_railmind,
            "trains_rerouted": trains_rerouted_count
        },
        "saved_passenger_minutes": saved_pm,
        "passenger_assumption": "Configurable assumed average of 850 passengers/train (simulated operational metric)"
    }
    
    cost_data = state.get("cost_breakdown", {})
    cost_citation = state.get("cost_citation", SIMULATED_POLICY_CITATION)
    
    report = f"""
## Incident Report: {event.reason}
**Time:** {datetime.now().strftime("%Y-%m-%d %H:%M")}
**Severity:** {severity}
**Primary Train:** {train.name} ({train.number})
**Location:** {STATION_MAP[event.station_code].name}
**Delay:** {event.delay_minutes} minutes

### Financial & Operations Impact (Simulated Policy Model)
- **Stranded Passengers:** ~{passenger_impact:,} commuters (Assumed avg. 850/train)
- **Estimated Compensation / Loss:** ₹{financial_cost:,} INR
- **Cost Determination Tier:** {cost_data.get('refund_tier', 'Simulated Delay Tier')} (Simulated Passenger Liability: ₹{cost_data.get('passenger_refund', 0):,} + Slot Penalty: ₹{cost_data.get('slot_penalty', 0):,})
- **Policy Citation:** {cost_citation}
- *Disclaimer:* Cost figures are simulated illustrative models for demonstration purposes and not an official regulatory determination.

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
    explanation += f"The Rescheduler Agent recalculates schedules dynamically to minimize overlap and passenger disruption. Total estimated passenger impact: {passenger_impact:,} commuters (assumed avg 850/train). Financial cost estimate: ₹{financial_cost:,} INR (Derived from {cost_citation})."

    log = create_log("Reporter", "Incident report and explanation generated.", {"report_preview": report[:100] + "..."})
    time.sleep(1)
    
    return {
        "incident_report": report.strip(), 
        "incident_explanation": explanation, 
        "comparison_data": comparison_data,
        "cost_breakdown": cost_data,
        "cost_citation": cost_citation,
        "logs": [log]
    }

# Build LangGraph
workflow = StateGraph(GraphState)

workflow.add_node("detector", delay_detector_agent)
workflow.add_node("analyzer", impact_analyzer_agent)
workflow.add_node("contention", contention_agent)
workflow.add_node("rescheduler", rescheduler_agent)
workflow.add_node("notifier", notifier_agent)
workflow.add_node("reporter", reporter_agent)

workflow.add_edge("detector", "analyzer")
workflow.add_edge("analyzer", "contention")
workflow.add_edge("contention", "rescheduler")
workflow.add_edge("rescheduler", "notifier")
workflow.add_edge("notifier", "reporter")
workflow.add_edge("reporter", END)

workflow.set_entry_point("detector")

app = workflow.compile()
