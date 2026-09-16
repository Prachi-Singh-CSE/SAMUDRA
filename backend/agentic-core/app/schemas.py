"""
Shared data contracts between Planner -> Orchestrator -> sub-agents ->
Explanation agent. Keeping these explicit is what lets four teammates'
modules plug together without guessing each other's shapes.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AgentName(str, Enum):
    WEATHER = "weather_agent"
    OCEAN = "ocean_agent"
    RISK = "risk_agent"
    ROUTE = "route_agent"
    HAZARD = "hazard_agent"
    WELFARE = "welfare_agent"
    EMERGENCY = "emergency_agent"


class SubTask(BaseModel):
    """One node in the Planner's execution plan."""
    id: str
    agent: AgentName
    # Free-form args resolved by the planner from the user's query
    # (location, date, radius_km, etc.)
    args: Dict[str, Any] = Field(default_factory=dict)
    # ids of other SubTasks that must complete first (e.g. route needs risk)
    depends_on: List[str] = Field(default_factory=list)
    reason: str = ""  # why the planner included this agent (shown in trace)


class Plan(BaseModel):
    """The Planner/Intent agent's output for one user turn."""
    query: str
    language: str = "en"
    subtasks: List[SubTask] = Field(default_factory=list)
    is_followup: bool = False
    revised_from_previous: bool = False
    notes: str = ""


class AgentResult(BaseModel):
    """Normalized result returned by every sub-agent / tool client."""
    agent: AgentName
    ok: bool
    data: Dict[str, Any] = Field(default_factory=dict)
    confidence: Optional[float] = None  # 0-1, None if not applicable
    stale: bool = False
    source_note: str = ""
    error: Optional[str] = None
    latency_ms: Optional[int] = None


class ChatRequest(BaseModel):
    session_id: str
    text: str
    language: Optional[str] = None  # BCP-47ish; auto-detected if omitted
    location: Optional[Dict[str, float]] = None  # {"lat":..,"lon":..}


class TraceStep(BaseModel):
    step: str
    detail: str


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    language: str
    plan: Plan
    agent_results: List[AgentResult]
    trace: List[TraceStep]
    degraded: bool = False


class SosRequest(BaseModel):
    session_id: str
    lat: float
    lon: float
    fisherman_id: Optional[str] = None
    note: Optional[str] = None


class SosResponse(BaseModel):
    accepted: bool
    nearest_harbor: Dict[str, Any]
    dispatched_to_dashboard: bool
    trace: List[TraceStep]
