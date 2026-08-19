import pytest
import sys
import os

# Ensure backend package is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from voice.fuzzy_match import match_command, CommandIntent

# Table-driven test cases: (transcript, lang, expected_intent, expected_train_id_or_none)
FUZZY_MATCH_TEST_CASES = [
    # --- Category 1: Standard Multilingual Commands ---
    ("reschedule train 22436 to 10:30", "en", CommandIntent.RESCHEDULE, "22436"),
    ("show delays", "en", CommandIntent.SHOW_DELAYS, None),
    ("show substitution", "en", CommandIntent.SHOW_SUBSTITUTION, None),
    ("substitute with relief train", "en", CommandIntent.SHOW_SUBSTITUTION, None),
    ("trigger escalation", "en", CommandIntent.ESCALATE, None),
    ("show agent status", "en", CommandIntent.SHOW_AGENTS, None),
    ("show metrics", "en", CommandIntent.SHOW_METRICS, None),
    ("incident report", "en", CommandIntent.SHOW_INCIDENTS, None),
    ("confirm", "en", CommandIntent.CONFIRM, None),
    ("cancel", "en", CommandIntent.CANCEL, None),
    
    # Tamil
    ("ரயில் 22436 நேரம் 10:30 மாற்று", "ta", CommandIntent.RESCHEDULE, "22436"),
    ("மாற்று ரயில்", "ta", CommandIntent.SHOW_SUBSTITUTION, None),
    ("தாமதம் நிலை", "ta", CommandIntent.SHOW_DELAYS, None),
    ("அறிவிப்பு உயர்த்து", "ta", CommandIntent.ESCALATE, None),
    ("உறுதிப்படுத்து", "ta", CommandIntent.CONFIRM, None),
    ("ரத்து செய்", "ta", CommandIntent.CANCEL, None),
    
    # Hindi
    ("ट्रेन 12302 को 10:30 पर फिर से शेड्यूल करें", "hi", CommandIntent.RESCHEDULE, "12302"),
    ("बदली ट्रेन", "hi", CommandIntent.SHOW_SUBSTITUTION, None),
    ("देरी की स्थिति", "hi", CommandIntent.SHOW_DELAYS, None),
    ("विस्तार ट्रिगर करें", "hi", CommandIntent.ESCALATE, None),
    ("पुष्टि करें", "hi", CommandIntent.CONFIRM, None),
    ("रद्द करें", "hi", CommandIntent.CANCEL, None),

    # Japanese
    ("列車 22436 を 10:30 に変更", "ja", CommandIntent.RESCHEDULE, "22436"),
    ("代替列車", "ja", CommandIntent.SHOW_SUBSTITUTION, None),
    ("遅延状況", "ja", CommandIntent.SHOW_DELAYS, None),
    ("エスカレーション", "ja", CommandIntent.ESCALATE, None),
    ("確認", "ja", CommandIntent.CONFIRM, None),
    ("キャンセル", "ja", CommandIntent.CANCEL, None),

    # --- Category 2: Partial & Non-standard Train ID Matches ---
    ("track 22436", "en", CommandIntent.FOCUS_TRAIN, "22436"),
    ("train 12004", "en", CommandIntent.FOCUS_TRAIN, "12004"),
    ("t1", "en", CommandIntent.FOCUS_TRAIN, "T1"),
    ("focus train t2", "en", CommandIntent.FOCUS_TRAIN, "T2"),
    ("IR-22436 focus", "en", CommandIntent.FOCUS_TRAIN, "IR-22436"),
    ("rake 02401", "en", CommandIntent.FOCUS_TRAIN, "02401"),

    # --- Category 3: Conversational Filler Words & Politeness ---
    ("please could you kindly show train 12302 now", "en", CommandIntent.FOCUS_TRAIN, "12302"),
    ("hey railmind can you display the delay status please", "en", CommandIntent.SHOW_DELAYS, None),
    ("kindly trigger escalation immediately", "en", CommandIntent.ESCALATE, None),
    ("assistant tell me the relief train status now", "en", CommandIntent.SHOW_SUBSTITUTION, None),
    ("please confirm the reschedule action right now", "en", CommandIntent.CONFIRM, None),

    # --- Category 4: Mixed-Language Input ---
    ("reschedule train 22436 10 நிமிடம்", "ta", CommandIntent.RESCHEDULE, "22436"),
    ("ट्रेन 12302 reschedule now", "hi", CommandIntent.RESCHEDULE, "12302"),
    ("show substitution மாற்று ரயில்", "ta", CommandIntent.SHOW_SUBSTITUTION, None),
    ("relief train बदली ट्रेन status", "hi", CommandIntent.SHOW_SUBSTITUTION, None),

    # --- Category 5: Minor Typo / Fuzzy Matches ---
    ("reschedul tran 22436 to 10:30", "en", CommandIntent.RESCHEDULE, "22436"),
    ("sho delais", "en", CommandIntent.SHOW_DELAYS, None),
    ("shw substitutn", "en", CommandIntent.SHOW_SUBSTITUTION, None),
    ("triger escalatn", "en", CommandIntent.ESCALATE, None),

    # --- Category 6: Empty, Whitespace, and Garbage / Unrelated Transcripts ---
    ("", "en", CommandIntent.UNKNOWN, None),
    ("   ", "en", CommandIntent.UNKNOWN, None),
    ("...", "en", CommandIntent.UNKNOWN, None),
    ("umm ahhh blah blah random noise 999999", "en", CommandIntent.UNKNOWN, None),
    ("what is the weather in paris today", "en", CommandIntent.UNKNOWN, None),
]

@pytest.mark.parametrize("transcript,lang,expected_intent,expected_train_id", FUZZY_MATCH_TEST_CASES)
def test_table_driven_fuzzy_match(transcript, lang, expected_intent, expected_train_id):
    """
    Table-driven regression test suite for fuzzy command matcher and slot extractor.
    Enables adding single-line regression test cases for any future edge-case bugs.
    """
    intent, slots = match_command(transcript, lang=lang)
    
    assert intent == expected_intent, (
        f"Failed on transcript='{transcript}', lang='{lang}'. "
        f"Expected intent={expected_intent}, got={intent}"
    )
    
    if expected_train_id is not None:
        assert slots.get("train_id") == expected_train_id, (
            f"Failed slot extraction on transcript='{transcript}'. "
            f"Expected train_id={expected_train_id}, got={slots.get('train_id')}"
        )
