from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class ConfidenceScore(BaseModel):
    score: float  # Float from 0.0 to 1.0
    reasons: List[str]  # Explanations of factors that lowered confidence
    escalate: bool  # True if score < threshold (default 0.60)
    state_update: Dict[str, Any]  # Pipeline state update dictionary

def score_confidence(
    plan: Any,
    reasoning_trace: Any,
    critic_result: Any,
    threshold: float = 0.60
) -> ConfidenceScore:
    """
    Computes a 0.0 - 1.0 confidence score for a proposed plan based on the
    reasoning trace, critic agent evaluation, and operational risk factors.
    
    If score < threshold, returns escalate=True and emits state_update with NeedsHumanReview=True.
    
    :param plan: The proposed reschedule/recovery plan object or dict.
    :param reasoning_trace: The ReasoningTrace object or dict from reasoning.py.
    :param critic_result: CriticResult object or dict from Member A's critic agent.
    :param threshold: Confidence threshold below which human review is required (default 0.60).
    :return: ConfidenceScore instance.
    """
    base_score = 1.0
    reasons = []
    
    # 1. Parse critic result (dict or object)
    critic_score_val = None
    violations = []
    
    if isinstance(critic_result, dict):
        critic_score_val = critic_result.get("score") if "score" in critic_result else critic_result.get("critic_score")
        violations = critic_result.get("violations") or critic_result.get("safety_violations") or []
    elif critic_result is not None:
        critic_score_val = getattr(critic_result, "score", getattr(critic_result, "critic_score", None))
        violations = getattr(critic_result, "violations", getattr(critic_result, "safety_violations", []))
        
    # Evaluate critic score (scale out of 10 or 1.0)
    if critic_score_val is not None:
        # If score is out of 10 (e.g., 3, 4, 8)
        if critic_score_val > 1.0:
            norm_critic = critic_score_val / 10.0
        else:
            norm_critic = float(critic_score_val)
            
        if norm_critic < 0.6:
            deduction = (0.6 - norm_critic) * 0.8  # Penalty proportional to deficiency
            base_score -= deduction
            reasons.append(f"Critic agent assigned low safety/quality score: {critic_score_val}")
            
    if violations:
        base_score -= min(0.4, 0.2 * len(violations))
        reasons.append(f"Critic agent flagged safety/rule violation(s): {', '.join(str(v) for v in violations)}")
        
    # 2. Inspect reasoning trace
    reasoning_summary = ""
    inputs_considered = []
    
    if isinstance(reasoning_trace, dict):
        reasoning_summary = reasoning_trace.get("reasoning_summary", "")
        inputs_considered = reasoning_trace.get("inputs_considered", [])
    elif reasoning_trace is not None:
        reasoning_summary = getattr(reasoning_trace, "reasoning_summary", "")
        inputs_considered = getattr(reasoning_trace, "inputs_considered", [])
        
    if not reasoning_summary or len(reasoning_summary.strip()) < 30:
        base_score -= 0.15
        reasons.append("LLM reasoning trace was short or missing specific details.")
        
    if not inputs_considered:
        base_score -= 0.10
        reasons.append("Reasoning trace did not specify inputs considered.")
        
    # 3. Inspect plan & operational risk (e.g. delay minutes >= 90)
    delay_minutes = 0
    if isinstance(plan, dict):
        delay_minutes = plan.get("delay_minutes", 0)
        if "event" in plan and isinstance(plan["event"], dict):
            delay_minutes = plan["event"].get("delay_minutes", delay_minutes)
    elif plan is not None:
        delay_minutes = getattr(plan, "delay_minutes", 0)
        if hasattr(plan, "event"):
            delay_minutes = getattr(plan.event, "delay_minutes", delay_minutes)
            
    if delay_minutes >= 90:
        base_score -= 0.25
        reasons.append(f"Extreme delay magnitude ({delay_minutes} mins >= 90 mins threshold).")
    elif delay_minutes >= 60:
        base_score -= 0.10
        reasons.append(f"High delay magnitude ({delay_minutes} mins).")
        
    # Clamp score to [0.0, 1.0]
    final_score = round(max(0.0, min(1.0, base_score)), 2)
    escalate = final_score < threshold
    
    state_update = {
        "NeedsHumanReview": escalate,
        "confidence_score": final_score,
        "escalation_reasons": reasons if escalate else []
    }
    
    return ConfidenceScore(
        score=final_score,
        reasons=reasons,
        escalate=escalate,
        state_update=state_update
    )
