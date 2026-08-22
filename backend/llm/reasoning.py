from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import json
from llm.client import generate, LLMUnavailableError

# Try to import from backend.schemas if Member A created it, otherwise define locally
try:
    from schemas import ReasoningTrace
except ImportError:
    try:
        from backend.schemas import ReasoningTrace
    except ImportError:
        class ReasoningTrace(BaseModel):
            agent_name: str
            inputs_considered: List[str]
            reasoning_summary: str
            decision: Any
            timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

def _extract_inputs(context: Any) -> List[str]:
    """Helper to extract concrete input descriptions from context dict or object."""
    inputs = []
    
    if isinstance(context, dict):
        ctx_dict = context
    elif hasattr(context, "dict") and callable(getattr(context, "dict")):
        ctx_dict = context.dict()
    elif hasattr(context, "__dict__"):
        ctx_dict = vars(context)
    else:
        ctx_dict = {"context_str": str(context)}
        
    delay_event = ctx_dict.get("delay_event") or ctx_dict.get("event")
    if delay_event:
        if isinstance(delay_event, dict):
            train_id = delay_event.get("train_id", "Unknown")
            station = delay_event.get("station_code", "Unknown")
            delay = delay_event.get("delay_minutes", 0)
            reason = delay_event.get("reason", "N/A")
        else:
            train_id = getattr(delay_event, "train_id", "Unknown")
            station = getattr(delay_event, "station_code", "Unknown")
            delay = getattr(delay_event, "delay_minutes", 0)
            reason = getattr(delay_event, "reason", "N/A")
        inputs.append(f"Delay Event: Train '{train_id}' delayed {delay} mins at {station} due to '{reason}'.")
        
    train = ctx_dict.get("train")
    if train:
        t_name = getattr(train, "name", str(train)) if not isinstance(train, dict) else train.get("name", str(train))
        inputs.append(f"Primary Train: {t_name}")
        
    affected = ctx_dict.get("affected_trains")
    if affected:
        aff_names = []
        for t in affected:
            t_n = getattr(t, "name", str(t)) if not isinstance(t, dict) else t.get("name", str(t))
            aff_names.append(t_n)
        inputs.append(f"Affected Downstream Trains: {', '.join(aff_names)}")
        
    fin_cost = ctx_dict.get("financial_cost")
    if fin_cost is not None:
        inputs.append(f"Financial Cost: ₹{fin_cost:,} INR")
        
    pass_impact = ctx_dict.get("passenger_impact")
    if pass_impact is not None:
        inputs.append(f"Passenger Impact: {pass_impact} passenger-minutes")
        
    contention = ctx_dict.get("contention_records")
    if contention:
        inputs.append(f"Track/Platform Contentions Detected: {len(contention)} conflicts")

    if not inputs:
        inputs.append(f"Raw Context Input: {str(ctx_dict)}")
        
    return inputs

def generate_rationale(context: Any, decision: Any, agent_name: str = "Rescheduler Agent") -> ReasoningTrace:
    """
    Generates a structured reasoning trace explaining WHY an agent made a decision,
    referencing actual numerical inputs (delay minutes, contention conflicts, cost figures).
    
    :param context: Dict or object containing operational context (delay event, train info, costs).
    :param decision: The action or plan decided upon.
    :param agent_name: Name of the agent emitting the trace.
    :return: ReasoningTrace instance.
    """
    inputs_considered = _extract_inputs(context)
    timestamp = datetime.now().isoformat()
    
    system_prompt = (
        "You are an AI Railway Operations Reasoning Engine. "
        "Your job is to provide clear, transparent, and structured rationale for agent decisions. "
        "CRITICAL REQUIREMENT: Explain WHY in 2-3 plain language sentences, explicitly citing "
        "the actual inputs provided (e.g., delay minutes, station codes, train names, cost figures). "
        "Do NOT use generic filler sentences. Output MUST be valid JSON."
    )
    
    prompt = (
        f"Agent Name: {agent_name}\n"
        f"Inputs Considered:\n" + "\n".join(f"- {inp}" for inp in inputs_considered) + "\n\n"
        f"Decision Taken: {decision}\n\n"
        "Generate a JSON object with keys:\n"
        '{"reasoning_summary": "2-3 plain language sentences citing actual input figures explaining why this decision was taken."}'
    )
    
    try:
        response_json_str = generate(prompt=prompt, system=system_prompt, json_mode=True)
        parsed = json.loads(response_json_str)
        reasoning_summary = parsed.get("reasoning_summary", "")
        if not reasoning_summary:
            reasoning_summary = (
                f"{agent_name} evaluated inputs: {'; '.join(inputs_considered)}. "
                f"Based on delay severity and calculated costs, decision '{decision}' was selected."
            )
    except Exception as e:
        # Fallback if Ollama raises error or during synthetic offline mode test
        # Build structured trace referencing exact inputs
        reasoning_summary = (
            f"{agent_name} evaluated delay inputs ({', '.join(inputs_considered)}). "
            f"The decision '{decision}' was selected to minimize cascading delays and passenger inconvenience."
        )
        
    return ReasoningTrace(
        agent_name=agent_name,
        inputs_considered=inputs_considered,
        reasoning_summary=reasoning_summary,
        decision=decision,
        timestamp=timestamp
    )

def run_llm_reasoning(event: Any, train: Any, affected_trains: List[Any]) -> Dict[str, Any]:
    """Backward compatibility wrapper for graph nodes."""
    context = {
        "delay_event": event,
        "train": train,
        "affected_trains": affected_trains
    }
    trace = generate_rationale(context, decision="Reschedule downstream arrival times", agent_name="Multi-Agent Reasoning")
    return {
        "reasoning_trace": trace.reasoning_summary,
        "inputs_considered": trace.inputs_considered,
        "trace_object": trace.model_dump() if hasattr(trace, "model_dump") else (trace.dict() if hasattr(trace, "dict") else trace)
    }
