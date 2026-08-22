import unittest
from unittest.mock import patch, MagicMock
import requests
import json
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from llm.client import generate, LLMUnavailableError

class TestLLMClient(unittest.TestCase):

    def test_client_loud_failure_when_ollama_down(self):
        """Verify client fails loudly with LLMUnavailableError when Ollama endpoint is unreachable."""
        with patch("requests.post", side_effect=requests.exceptions.ConnectionError("Connection refused")):
            with self.assertRaises(LLMUnavailableError) as exc_info:
                generate("test prompt")
            self.assertIn("CRITICAL: Local Ollama LLM service is unreachable", str(exc_info.exception))

    def test_client_successful_response(self):
        """Verify normal successful text response from Ollama API."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"response": "Processed response"}
        
        with patch("requests.post", return_value=mock_resp):
            res = generate("Hello LLM")
            self.assertEqual(res, "Processed response")

    def test_client_json_mode_valid(self):
        """Verify json_mode appends instructions and parses valid JSON response."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"response": '{"status": "ok", "reason": "valid"}'}
        
        with patch("requests.post", return_value=mock_resp):
            res = generate("Format this as JSON", json_mode=True)
            parsed = json.loads(res)
            self.assertEqual(parsed["status"], "ok")

    def test_client_json_mode_invalid_raises_value_error(self):
        """Verify json_mode raises ValueError if Ollama returns non-JSON text."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"response": "This is plain text with no json"}
        
        with patch("requests.post", return_value=mock_resp):
            with self.assertRaises(ValueError) as exc_info:
                generate("Format this as JSON", json_mode=True)
            self.assertIn("LLM output for json_mode could not be parsed as valid JSON", str(exc_info.exception))

if __name__ == "__main__":
    unittest.main()
