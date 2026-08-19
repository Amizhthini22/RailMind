import os
import json
import re
import difflib
from enum import Enum
from typing import Dict, Any, Tuple, Optional

class CommandIntent(str, Enum):
    RESCHEDULE = "reschedule"
    FOCUS_TRAIN = "focus_train"
    SHOW_DELAYS = "show_delays"
    SHOW_SUBSTITUTION = "show_substitution"
    ESCALATE = "escalate"
    SHOW_AGENTS = "show_agents"
    SHOW_METRICS = "show_metrics"
    SHOW_INCIDENTS = "show_incidents"
    SHOW_STATUS = "show_status"
    CONFIRM = "confirm"
    CANCEL = "cancel"
    MUTE = "mute"
    UNMUTE = "unmute"
    ENABLE_VOICE = "enable_voice"
    UNKNOWN = "unknown"

_COMMAND_CACHE: Dict[str, Dict[str, str]] = {}
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FILLER_WORDS = [
    "please", "could you", "can you", "kindly", "hey", "railmind",
    "assistant", "now", "just", "system", "tell me", "display",
    "right now", "immediately", "view"
]

def get_command_dict(lang: str) -> Dict[str, str]:
    clean_lang = lang.lower().split("-")[0] if "-" in lang else lang.lower()
    if clean_lang not in ["en", "hi", "ta", "ja"]:
        clean_lang = "en"
        
    if clean_lang in _COMMAND_CACHE:
        return _COMMAND_CACHE[clean_lang]
        
    file_path = os.path.join(BASE_DIR, f"commands_{clean_lang}.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                commands = data.get("commands", {})
                _COMMAND_CACHE[clean_lang] = commands
                return commands
        except Exception:
            pass
            
    return {}

def clean_text(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip().lower()
    cleaned = re.sub(r"[?!.,;:]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

def extract_slots(text: str, lang: str = "en") -> Dict[str, Any]:
    slots: Dict[str, Any] = {}
    
    # 1. Train ID extraction (check prefixed forms first before bare digits)
    train_patterns = [
        r'([a-zA-Z]{1,3}-[0-9]{4,5})',
        r'\b(ir-?\d+|vb-?\d+|t_standby_[a-z0-9_]+)\b',
        r'\b(t[1-3])\b',
        r'\b(?:train|ரயில்|ट्रेन|列車|rake|special)\s+([0-9]{4,5}|t[1-3]|ir-?\d+|vb-?\d+)\b',
        r'\b(22436|12302|12004|02401|02244|02302|22435|12301|12003)\b',
    ]
    
    for pat in train_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = m.group(1).upper()
            slots["train_id"] = val
            break

    # 2. Time extraction
    time_match = re.search(r'\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b', text, re.IGNORECASE)
    if time_match:
        hr = int(time_match.group(1))
        mn = time_match.group(2)
        ampm = time_match.group(3)
        if ampm and ampm.lower() == "pm" and hr < 12:
            hr += 12
        elif ampm and ampm.lower() == "am" and hr == 12:
            hr = 0
        slots["time"] = f"{hr:02d}:{mn}"
    else:
        time_ta = re.search(r'(\d{1,2})\s*மணி\s*(\d{2})?', text)
        if time_ta:
            hr = int(time_ta.group(1))
            mn = time_ta.group(2) if time_ta.group(2) else "00"
            slots["time"] = f"{hr:02d}:{mn}"
            
        time_hi = re.search(r'(\d{1,2})\s*बजे\s*(\d{2})?', text)
        if time_hi:
            hr = int(time_hi.group(1))
            mn = time_hi.group(2) if time_hi.group(2) else "00"
            slots["time"] = f"{hr:02d}:{mn}"
            
        time_ja = re.search(r'(\d{1,2})\s*時\s*(\d{1,2})?\s*分?', text)
        if time_ja:
            hr = int(time_ja.group(1))
            mn = int(time_ja.group(2)) if time_ja.group(2) else 0
            slots["time"] = f"{hr:02d}:{mn:02d}"

    # 3. Delay minutes extraction
    delay_match = re.search(r'(\d+)\s*(?:minutes?|mins?|நிமிடம்|நிமிடங்கள்|मिनट|分)', text, re.IGNORECASE)
    if delay_match:
        slots["delay_minutes"] = int(delay_match.group(1))
        
    return slots

def _strip_fillers(text: str) -> str:
    cleaned = text
    for f in sorted(FILLER_WORDS, key=len, reverse=True):
        cleaned = re.sub(rf'\b{re.escape(f)}\b', '', cleaned, flags=re.IGNORECASE)
    return clean_text(cleaned)

def match_command(transcript: str, lang: str = "en") -> Tuple[CommandIntent, Dict[str, Any]]:
    if not transcript or not transcript.strip():
        return (CommandIntent.UNKNOWN, {})
        
    cleaned = clean_text(transcript)
    if not cleaned or cleaned in ["...", "?", "!", "."]:
        return (CommandIntent.UNKNOWN, {})

    slots = extract_slots(cleaned, lang)
    stripped = _strip_fillers(cleaned)

    # Load dictionaries (current language + English fallback)
    primary_dict = get_command_dict(lang)
    en_dict = get_command_dict("en") if lang.lower().split("-")[0] != "en" else {}
    all_dicts = [primary_dict, en_dict]

    # 1. Exact Match on Non-Template Phrases First
    for c_dict in all_dicts:
        for phrase, intent_str in c_dict.items():
            if "{" not in phrase:
                p_clean = clean_text(phrase)
                if cleaned == p_clean or stripped == p_clean:
                    return (CommandIntent(intent_str), slots)

    # 2. Template Matches (for phrases with slots)
    for c_dict in all_dicts:
        for phrase, intent_str in c_dict.items():
            if "{" in phrase:
                pattern = re.escape(phrase)
                pattern = pattern.replace(r'\{train_id\}', r'([a-zA-Z0-9_\-]+)')
                pattern = pattern.replace(r'\{time\}', r'([0-9:.apmAPM\s]+)')
                pattern = pattern.replace(r'\{delay_minutes\}', r'([0-9]+)')
                regex = f"^{pattern}$"
                if re.match(regex, cleaned, re.IGNORECASE) or re.match(regex, stripped, re.IGNORECASE):
                    return (CommandIntent(intent_str), slots)

    # 3. High-confidence multi-lingual keywords & intent mapping
    # Substitution / Relief
    if any(k in cleaned for k in ["substitution", "substitute", "relief train", "relief status", "மாற்று ரயில்", "நிவாரண ரயில்", "बदली ट्रेन", "राहत ट्रेन", "代替列車", "救援列車"]):
        return (CommandIntent.SHOW_SUBSTITUTION, slots)

    # Escalation
    if any(k in cleaned for k in ["escalat", "விஸ்தார", "உயர்த்து", "அறிவிப்பு உயர்த்து", "एस्केलेट", "विस्तार", "エスカレーション"]):
        return (CommandIntent.ESCALATE, slots)

    # Confirmation
    if any(k in cleaned for k in ["confirm", "yes confirm", "proceed", "execute", "உறுதிப்படுத்து", "ஆம் உறுதிப்படுத்து", "உறுதி செய்", "पुष्टि करें", "हाँ पुष्टि करें", "पुष्टि", "はい、確認", "確認", "実行"]):
        return (CommandIntent.CONFIRM, slots)

    # Cancellation
    if any(k in cleaned for k in ["cancel", "abort", "stop", "ரத்து செய்", "ரத்து", "நிறுத்து", "रद्द करें", "रद्द", "रोकें", "キャンセル", "中止", "停止"]):
        return (CommandIntent.CANCEL, slots)

    # Reschedule
    if any(k in cleaned for k in ["resched", "schedul", "மாற்று", "ரீशेड्यूल", "फिर से शेड्यूल", "रीशेड्यूल", "変更", "スケジュール変更"]):
        return (CommandIntent.RESCHEDULE, slots)

    # Delays
    if any(k in cleaned for k in ["delay", "தாமதம்", "தாமதங்கள்", "தேரி", "देरी", "遅延"]):
        return (CommandIntent.SHOW_DELAYS, slots)

    # Agents / Metrics / Incidents / Status
    if any(k in cleaned for k in ["agent status", "agent health", "show agents", "முகவர் நிலை", "एजेंट स्थिति", "एजेंट की स्थिति", "エージェント状態", "エージェントステータス"]):
        return (CommandIntent.SHOW_AGENTS, slots)
    if any(k in cleaned for k in ["metrics", "passenger metrics", "மெட்ரிக்ஸ்", "நிலைமெட்ரிக்ஸ்", "मेट्रिक्स", "メトリクス"]):
        return (CommandIntent.SHOW_METRICS, slots)
    if any(k in cleaned for k in ["incident report", "show report", "சம்பவ அறிக்கை", "घटना रिपोर्ट", "インシデントレポート"]):
        return (CommandIntent.SHOW_INCIDENTS, slots)
    if any(k in cleaned for k in ["system status", "status", "நிகழ்நிலை", "सिस्टम स्थिति", "システムステータス"]):
        return (CommandIntent.SHOW_STATUS, slots)

    # Focus train
    if slots.get("train_id") and any(k in cleaned for k in ["train", "track", "show", "focus", "ரயில்", "ट्रेन", "列車", "rake", "t1", "t2", "t3"]):
        return (CommandIntent.FOCUS_TRAIN, slots)

    # 4. Fuzzy SequenceMatcher fallback
    best_intent = CommandIntent.UNKNOWN
    best_score = 0.0

    for c_dict in all_dicts:
        for phrase, intent_str in c_dict.items():
            p_clean = clean_text(re.sub(r'\{[a-z_]+\}', '', phrase))
            if not p_clean:
                continue
            ratio = difflib.SequenceMatcher(None, stripped, p_clean).ratio()
            raw_ratio = difflib.SequenceMatcher(None, cleaned, p_clean).ratio()
            max_r = max(ratio, raw_ratio)
            if max_r > best_score:
                best_score = max_r
                try:
                    best_intent = CommandIntent(intent_str)
                except ValueError:
                    best_intent = CommandIntent.UNKNOWN

    # Strict threshold for fuzzy match acceptance (0.65)
    if best_score >= 0.65:
        return (best_intent, slots)

    return (CommandIntent.UNKNOWN, {})
