import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from llm.confidence import score_confidence, ConfidenceScore
from llm.reasoning import ReasoningTrace

class TestConfidenceScoring(unittest.TestCase):

    def test_confidence_good_critic_result(self):
        """Verify high confidence for good critic result and detailed reasoning trace."""
        trace = ReasoningTrace(
            agent_name="Rescheduler Agent",
            inputs_considered=["Delay: 15 min at CNB", "Primary Train: Vande Bharat Express", "Cost: ₹30,000"],
            reasoning_summary="Minor delay of 15 minutes at CNB is absorbed by buffer time. Downstream connections preserved.",
            decision="Adjust arrival time by +15 mins"
        )
        critic_result = {"score": 9, "violations": [], "evaluation": "Plan is safe and optimal."}
        plan = {"delay_minutes": 15}
        
        cs = score_confidence(plan, trace, critic_result)
        self.assertIsInstance(cs, ConfidenceScore)
        self.assertGreaterEqual(cs.score, 0.80)
        self.assertFalse(cs.escalate)
        self.assertFalse(cs.state_update["NeedsHumanReview"])

    def test_confidence_escalation_on_bad_critic_result(self):
        """Verify escalation triggers when critic score is low (< 5/10) or safety violations flagged."""
        trace = ReasoningTrace(
            agent_name="Rescheduler Agent",
            inputs_considered=["Delay: 90 min at CNB"],
            reasoning_summary="Short summary.",
            decision="Hold train indefinitely"
        )
        critic_result = {
            "score": 3,
            "violations": ["Headway safety interval violated between T1 and T2 at CNB"],
            "evaluation": "Extremely unsafe plan."
        }
        plan = {"delay_minutes": 90}
        
        cs = score_confidence(plan, trace, critic_result)
        self.assertLess(cs.score, 0.60)
        self.assertTrue(cs.escalate)
        self.assertTrue(cs.state_update["NeedsHumanReview"])
        self.assertGreaterEqual(len(cs.reasons), 2)

if __name__ == "__main__":
    unittest.main()
