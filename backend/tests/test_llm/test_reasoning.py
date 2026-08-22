import unittest
from unittest.mock import patch
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from llm.reasoning import generate_rationale, ReasoningTrace, run_llm_reasoning
from models import DelayEvent, Train

class TestReasoningTrace(unittest.TestCase):

    def test_generate_rationale_structure_and_inputs(self):
        """Verify ReasoningTrace references specific actual input values."""
        event = DelayEvent(train_id="t1", station_code="CNB", delay_minutes=45, reason="Signal Failure")
        train = Train(id="t1", name="Vande Bharat Express", number="22436", route=["NDLS", "CNB", "PRYJ"], schedule={"NDLS": "06:00", "CNB": "10:08", "PRYJ": "12:00"})
        
        context = {
            "delay_event": event,
            "train": train,
            "passenger_impact": 1525,
            "financial_cost": 177500
        }
        
        trace = generate_rationale(context, decision="Hold at CNB for loop track clear", agent_name="Rescheduler Agent")
        
        self.assertIsInstance(trace, ReasoningTrace)
        self.assertEqual(trace.agent_name, "Rescheduler Agent")
        self.assertGreaterEqual(len(trace.inputs_considered), 3)
        
        inputs_text = " ".join(trace.inputs_considered)
        self.assertIn("CNB", inputs_text)
        self.assertIn("45", inputs_text)
        self.assertIn("Vande Bharat Express", inputs_text)
        self.assertTrue("177,500" in inputs_text or "177500" in inputs_text)
        self.assertGreater(len(trace.reasoning_summary), 20)

    @patch("llm.reasoning.generate", return_value='{"reasoning_summary": "Rescheduler evaluated 20 min delay at NDLS for Rajdhani Express."}')
    def test_run_llm_reasoning_compatibility(self, mock_gen):
        """Verify backward-compatibility wrapper for graph state integration."""
        event = DelayEvent(train_id="t1", station_code="NDLS", delay_minutes=20, reason="Track Maintenance")
        train = Train(id="t1", name="Rajdhani Express", number="12301", route=["NDLS", "CNB"], schedule={"NDLS": "16:55", "CNB": "21:35"})
        
        res = run_llm_reasoning(event, train, [train])
        self.assertIn("reasoning_trace", res)
        self.assertIn("inputs_considered", res)

if __name__ == "__main__":
    unittest.main()
