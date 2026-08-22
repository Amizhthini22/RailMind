"""
Member B — LLM / Reasoning / Intelligence Layer
"""
from llm.client import generate, LLMUnavailableError
from llm.reasoning import generate_rationale, ReasoningTrace
from llm.confidence import score_confidence, ConfidenceScore
from llm.counterfactual import generate_alternatives, CandidateAction
from llm.explainability import build_explanation, Explanation
from llm.feedback import log_outcome, get_similar_past_outcomes
from llm.negotiation import negotiate, RescheduleAction
from llm.anomaly import flag_anomaly, get_anomaly_details

__all__ = [
    "generate",
    "LLMUnavailableError",
    "generate_rationale",
    "ReasoningTrace",
    "score_confidence",
    "ConfidenceScore",
    "generate_alternatives",
    "CandidateAction",
    "build_explanation",
    "Explanation",
    "log_outcome",
    "get_similar_past_outcomes",
    "negotiate",
    "RescheduleAction",
    "flag_anomaly",
    "get_anomaly_details"
]
