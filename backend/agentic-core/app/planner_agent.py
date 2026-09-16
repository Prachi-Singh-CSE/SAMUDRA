"""
Planner / Intent Agent.

This is the agent that makes the system "genuinely agentic" per the
project doc: it decomposes a natural-language query into parallel
subtasks for specialist agents, wires dependencies between them (e.g.
Route needs Risk's output), and can *revise* a previous plan using
session state instead of treating every message as stateless.

Design: rule-based entity/intent extraction (fast, free, always available)
optionally refined by an LLM call when ANTHROPIC_API_KEY is set. The
rule-based path alone is enough to drive the full multi-agent demo, which
matters for "Live Demo Integrity" / degraded-mode requirements in the doc
-- the planner must not go dark just because the LLM call fails or is slow.
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional

from app.llm_client import llm_client
from app.schemas import AgentName, Plan, SubTask
from app.session_manager import SessionState

FOLLOWUP_MARKERS = (
    "what about", "and the day after", "same for", "what if", "also",
    "and tomorrow", "how about", "and near", "instead", "aur", "kal", "parso", "kal subah",
)

WEATHER_KEYWORDS = ("weather", "wind", "wave", "tide", "rain", "storm", "cyclone", "lightning", "sea state", "mausam", "toofan", "tufan", "hawa", "barish", "baarish")
OCEAN_KEYWORDS = ("fish", "fishing", "pfz", "fishing zone", "sst", "chlorophyll", "subsurface", "machli", "machi", "matsya")
ROUTE_KEYWORDS = ("route", "sail", "safe way", "harbor", "harbour", "navigate", "go to", "path", "raasta", "rasta", "bandar", "bunder")
HAZARD_KEYWORDS = ("oil", "spill", "slick", "suspicious vessel", "hazard", "vessel", "khatra", "khatre")
WELFARE_KEYWORDS = ("subsidy", "scheme", "pmmsy", "pmsby", "insurance", "welfare", "eligible", "eligibility", "diesel", "bima", "yojana")
EMERGENCY_KEYWORDS = ("sos", "emergency", "help me", "distress", "danger", "stranded", "sinking", "bachao", "madad")
RISK_TRIGGER_KEYWORDS = WEATHER_KEYWORDS + OCEAN_KEYWORDS + ROUTE_KEYWORDS  # risk score backs these up

_PLACE_RE = re.compile(
    r"\b(?:near|at|in|around|off)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)"
)
_RELATIVE_DATE_MAP = {
    "today": 0, "tonight": 0, "tomorrow": 1, "day after tomorrow": 2,
    "day after": 2, "next week": 7, "aaj": 0, "kal": 1, "kal subah": 1, "parso": 2,
}


def _extract_place(text: str) -> Optional[str]:
    m = _PLACE_RE.search(text)
    return m.group(1) if m else None


def _extract_relative_date(text: str) -> Optional[str]:
    low = text.lower()
    for phrase, offset in sorted(_RELATIVE_DATE_MAP.items(), key=lambda x: -len(x[0])):
        if phrase in low:
            return f"+{offset}d"
    return None


def _looks_like_followup(text: str) -> bool:
    low = text.lower().strip()
    if any(m in low for m in FOLLOWUP_MARKERS):
        return True
    # very short queries with no place/verb of their own are usually follow-ups
    return len(low.split()) <= 6 and not any(low.startswith(w) for w in ("what", "how", "is", "are", "can", "kya"))


class PlannerAgent:
    async def plan(self, query: str, language: str, session: SessionState) -> Plan:
        is_followup = bool(session.last_turn) and _looks_like_followup(query)

        place = _extract_place(query) or (session.entities.get("place") if is_followup else None)
        rel_date = _extract_relative_date(query) or (session.entities.get("date") if is_followup else None)
        lat = session.location.get("lat") if session.location else None
        lon = session.location.get("lon") if session.location else None

        base_args: Dict = {}
        if place:
            base_args["place"] = place
        if rel_date:
            base_args["date"] = rel_date
        if lat is not None and lon is not None:
            base_args["lat"] = lat
            base_args["lon"] = lon

        low = query.lower()
        subtasks: List[SubTask] = []

        def add(agent: AgentName, reason: str, depends_on: Optional[List[str]] = None, extra: Optional[Dict] = None):
            args = dict(base_args)
            if extra:
                args.update(extra)
            sid = f"{agent.value}_{len(subtasks)}"
            subtasks.append(SubTask(id=sid, agent=agent, args=args, depends_on=depends_on or [], reason=reason))
            return sid

        wants_weather = any(k in low for k in WEATHER_KEYWORDS)
        wants_ocean = any(k in low for k in OCEAN_KEYWORDS)
        wants_route = any(k in low for k in ROUTE_KEYWORDS)
        wants_hazard = any(k in low for k in HAZARD_KEYWORDS)
        wants_welfare = any(k in low for k in WELFARE_KEYWORDS)
        wants_emergency = any(k in low for k in EMERGENCY_KEYWORDS)

        # A carried-forward follow-up with no new keywords re-runs the same
        # agent set as the previous turn, over the updated entities.
        if is_followup and session.last_turn and not any(
            [wants_weather, wants_ocean, wants_route, wants_hazard, wants_welfare, wants_emergency]
        ):
            prev_agents = {st.agent for st in session.last_turn.plan.subtasks}
            wants_weather = AgentName.WEATHER in prev_agents
            wants_ocean = AgentName.OCEAN in prev_agents
            wants_route = AgentName.ROUTE in prev_agents
            wants_hazard = AgentName.HAZARD in prev_agents
            wants_welfare = AgentName.WELFARE in prev_agents

        if wants_emergency:
            add(AgentName.EMERGENCY, "distress language detected in query")
            # Emergency short-circuits everything else in the orchestrator.

        generic_safety_query = any(p in low for p in ("should i go", "safe to", "is it safe", "go fishing", "jaana safe", "safe hai", "fishing ke liye", "ja sakte", "kya main"))
        no_keywords_matched = not any(
            [wants_weather, wants_ocean, wants_route, wants_hazard, wants_welfare, wants_emergency]
        )
        if wants_weather or wants_ocean or generic_safety_query or (no_keywords_matched and not wants_emergency):
            # "should I go fishing tomorrow near X" / "Kal subah fishing ke liye jaana safe hai?"
            # has no literal "weather" keyword but implies it -- default weather+ocean+risk fan-out.
            add(AgentName.WEATHER, "conditions requested or implied by a general safety/fishing query")

        if wants_ocean or generic_safety_query:
            add(AgentName.OCEAN, "PFZ / subsurface ocean data relevant to fishing decision")

        risk_id = None
        if wants_weather or wants_ocean or wants_route or generic_safety_query or "safe" in low:
            weather_ids = [st.id for st in subtasks if st.agent == AgentName.WEATHER]
            ocean_ids = [st.id for st in subtasks if st.agent == AgentName.OCEAN]
            risk_id = add(
                AgentName.RISK,
                "composite marine risk score reconciles weather + ocean + hazard signals",
                depends_on=weather_ids + ocean_ids,
            )

        if wants_route:
            add(AgentName.ROUTE, "safe-route / nearest-harbor requested", depends_on=[risk_id] if risk_id else [])

        if wants_hazard:
            add(AgentName.HAZARD, "oil slick / suspicious vessel query")

        if wants_welfare:
            add(AgentName.WELFARE, "government scheme / subsidy / insurance question -> RAG agent")

        plan = Plan(
            query=query,
            language=language,
            subtasks=subtasks,
            is_followup=is_followup,
            revised_from_previous=is_followup and bool(session.last_turn),
            notes=self._trace_note(subtasks, is_followup),
        )

        if llm_client.is_live():
            plan = await self._llm_refine(plan, session)

        return plan

    def _trace_note(self, subtasks: List[SubTask], is_followup: bool) -> str:
        agents = ", ".join(st.agent.value for st in subtasks) or "none"
        prefix = "Revised prior plan using session context" if is_followup else "Fresh plan"
        return f"{prefix}. Dispatching to: {agents}."

    async def _llm_refine(self, plan: Plan, session: SessionState) -> Plan:
        """Optional LLM pass: ask the model to sanity-check / relabel the
        reasoning strings so the demo trace reads naturally, without
        letting a flaky LLM call break subtask wiring (that stays rule-driven
        and validated against the AgentName enum upstream)."""
        system = (
            "You are the Planner agent of a marine safety assistant. "
            "You will be given a machine-generated plan (list of agents and why "
            "they were chosen). Improve the 'reason' text for each subtask to be "
            "one clear sentence, and return ONLY JSON: "
            '{"reasons": {"<subtask_id>": "<improved reason>"}}. '
            "Do not add, remove, or rename subtasks or ids."
        )
        user = f"Query: {plan.query}\nPlan: {plan.model_dump_json()}"
        try:
            result = await llm_client.complete_json(system, user)
            reasons = result.get("reasons", {})
            for st in plan.subtasks:
                if st.id in reasons and isinstance(reasons[st.id], str):
                    st.reason = reasons[st.id]
        except Exception as exc:
            # LLM refinement is cosmetic; never let it break planning, but
            # don't hide the failure either — it's visible in the notes.
            plan.notes += f" (LLM reason-refinement skipped: {exc})"
        return plan


planner_agent = PlannerAgent()
