import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from llm.explainability import build_explanation, Explanation
from llm.counterfactual import CandidateAction

class TestExplainability(unittest.TestCase):

    def test_build_explanation_payload_structure(self):
        """Verify build_explanation returns complete structured decision trail."""
        cand1 = CandidateAction(
            action_id="cand_1", train_id="t1", train_name="Train A", station_code="CNB",
            strategy_type="substitution", description="Relief Rake Substitution", proposed_delay=0, cost=45000, action_type="substitution"
        )
        cand2 = CandidateAction(
            action_id="cand_2", train_id="t1", train_name="Train A", station_code="CNB",
            strategy_type="delay", description="Strict Rescheduling", proposed_delay=60, cost=235000, action_type="delay"
        )
        
        critic_res = {"score": 9, "violations": []}
        
        exp = build_explanation(
            conflict_report="Platform 2 conflict at CNB",
            candidates=[cand1, cand2],
            critic_result=critic_res,
            chosen=cand1
        )
        
        self.assertIsInstance(exp, Explanation)
        self.assertIn("conflict_report", exp.inputs)
        self.assertGreaterEqual(len(exp.constraints_checked), 3)
        self.assertEqual(len(exp.alternatives_considered), 2)
        self.assertIn("cand_2", exp.alternatives_rejected_because)
        self.assertEqual(exp.chosen_action["action_id"], "cand_1")
        self.assertIn("Relief Rake Substitution", exp.chosen_because)

if __name__ == "__main__":
    unittest.main()
