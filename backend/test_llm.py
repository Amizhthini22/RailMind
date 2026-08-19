import sys
import os

# Configure stdout to print unicode characters without error on Windows
sys.stdout.reconfigure(encoding='utf-8')

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import DelayEvent
from llm.anomaly import flag_anomaly
from llm.negotiation import negotiate, CandidateAction
from llm.client import query_llm

print("--- Testing Anomaly Detector ---")
event_normal = DelayEvent(train_id="t1", station_code="CNB", delay_minutes=10, reason="Signal")
event_anomalous = DelayEvent(train_id="t1", station_code="CNB", delay_minutes=90, reason="Signal")

print("Z-Score normal check (10 mins):", flag_anomaly(event_normal))
print("Z-Score anomalous check (90 mins):", flag_anomaly(event_anomalous))

print("\n--- Testing Negotiation ---")
prop_a = CandidateAction(
    train_id="t1",
    train_name="Vande Bharat Express",
    station_code="CNB",
    proposed_delay=30,
    cost=0,
    action_type="delay"
)
prop_b = CandidateAction(
    train_id="t2",
    train_name="Rajdhani Express",
    station_code="CNB",
    proposed_delay=30,
    cost=0,
    action_type="delay"
)
res = negotiate([prop_a, prop_b])
print("Negotiated Explanation:")
print(res.explanation)
print("Negotiated Selected Actions:")
for action in res.selected_actions:
    print(f"  Train: {action.train_name}, Delay: {action.proposed_delay} min, Action: {action.action_type}, Cost: {action.cost}")

print("\n--- Testing Ollama Client (Loud Failure Check) ---")
try:
    print("Attempting to query Ollama...")
    res = query_llm("test prompt")
    print("Ollama response:", res)
except Exception as e:
    print("Ollama failed loudly (as expected if down):")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Message: {e}")
