import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from llm.counterfactual import generate_alternatives, CandidateAction
from models import DelayEvent, Train

class TestCounterfactualSimulation(unittest.TestCase):

    def test_generate_alternatives_distinct_strategies_and_cost_ranking(self):
        """Verify 3 distinct candidate strategies are generated and sorted by computed cost."""
        event = DelayEvent(train_id="t1", station_code="CNB", delay_minutes=60, reason="Signal Failure")
        train = Train(id="t1", name="Vande Bharat Express", number="22436", route=["NDLS", "CNB", "PRYJ"], schedule={"NDLS": "06:00", "CNB": "10:08", "PRYJ": "12:00"})
        
        context = {"delay_event": event, "train": train, "affected_trains": [train]}
        
        candidates = generate_alternatives(conflict_report=None, context=context, n=3)
        
        self.assertEqual(len(candidates), 3)
        strategies = [c.strategy_type for c in candidates]
        
        self.assertIn("delay", strategies)
        self.assertIn("reroute", strategies)
        self.assertIn("substitution", strategies)
        
        costs = [c.cost for c in candidates]
        self.assertEqual(costs, sorted(costs))
        self.assertTrue(all(c > 0 for c in costs))

if __name__ == "__main__":
    unittest.main()
