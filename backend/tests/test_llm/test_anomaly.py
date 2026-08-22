import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from llm.anomaly import flag_anomaly, get_anomaly_details
from models import DelayEvent

class TestAnomalyDetector(unittest.TestCase):

    def test_anomaly_detector_normal_and_extreme(self):
        """Verify statistical anomaly detector flags unusual delay distributions."""
        normal_event = DelayEvent(train_id="t1", station_code="CNB", delay_minutes=10, reason="Signal")
        anomalous_event = DelayEvent(train_id="t1", station_code="CNB", delay_minutes=90, reason="Signal")
        
        self.assertFalse(flag_anomaly(normal_event))
        self.assertTrue(flag_anomaly(anomalous_event))

    def test_anomaly_details_structure(self):
        """Verify get_anomaly_details returns complete statistical metadata."""
        event = DelayEvent(train_id="t1", station_code="NDLS", delay_minutes=85, reason="Equipment Breakdown")
        details = get_anomaly_details(event)
        
        self.assertEqual(details["station_code"], "NDLS")
        self.assertEqual(details["observed_delay_minutes"], 85.0)
        self.assertGreater(details["z_score"], 2.0)
        self.assertTrue(details["is_anomaly"])
        self.assertIn("method", details)

if __name__ == "__main__":
    unittest.main()
