import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from llm.negotiation import negotiate, CandidateAction, RescheduleAction

class TestNegotiation(unittest.TestCase):

    def test_negotiate_combined_cost_resolution(self):
        """Verify negotiation compares total combined cost across both trains."""
        prop_a = CandidateAction(
            action_id="cand_a", train_id="t1", train_name="Vande Bharat Express",
            station_code="CNB", proposed_delay=40, cost=165000, action_type="delay"
        )
        prop_b = CandidateAction(
            action_id="cand_b", train_id="t2", train_name="Rajdhani Express",
            station_code="CNB", proposed_delay=40, cost=165000, action_type="delay"
        )
        
        res = negotiate([prop_a, prop_b])
        
        self.assertIsInstance(res, RescheduleAction)
        self.assertEqual(len(res.selected_actions), 2)
        self.assertGreater(res.total_cost, 0)
        self.assertIn("Multi-agent negotiation", res.explanation)
        self.assertIn("Total Combined Cost:", res.explanation)

if __name__ == "__main__":
    unittest.main()
