import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from llm.feedback import log_outcome, get_similar_past_outcomes

TEST_DB = "test_feedback_temp.db"

class TestFeedbackLoop(unittest.TestCase):

    def setUp(self):
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)

    def tearDown(self):
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)

    def test_feedback_log_and_lookup(self):
        """Verify outcome logging to SQLite and rule-based pattern lookup retrieval."""
        plan_id = "plan_test_101"
        pred = {"station_code": "CNB", "delay_cause": "Signal Defect", "cost": 50000}
        act = {"station_code": "CNB", "delay_cause": "Signal Defect", "cost": 48000}
        
        log_outcome(plan_id, pred, act, db_path=TEST_DB)
        
        context = {"station_code": "CNB", "delay_cause": "Signal Defect"}
        outcomes = get_similar_past_outcomes(context, k=3, db_path=TEST_DB)
        
        self.assertGreaterEqual(len(outcomes), 1)
        matched = outcomes[0]
        self.assertEqual(matched["lookup_type"], "rule_based_pattern_lookup")
        self.assertEqual(matched["station_code"], "CNB")
        self.assertEqual(matched["plan_id"], plan_id)

if __name__ == "__main__":
    unittest.main()
