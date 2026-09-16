"""
Explanation Agent.

Takes the raw, heterogeneous outputs of every specialist agent that ran
for this turn and synthesizes ONE coherent, non-technical, appropriately
hedged answer -- in the user's language. This is the agent responsible
for surfacing confidence/staleness as visible caveats rather than letting
low-confidence subsurface data or a degraded-mode fallback masquerade as
a confident recommendation (a core USP claim in the project doc).
"""
from __future__ import annotations

import logging
from typing import List

from app.llm_client import LLMError, llm_client
from app.schemas import AgentResult, Plan

logger = logging.getLogger("agentic_core.explanation")

SYSTEM_PROMPT = """You are the Explanation agent of a conversational marine \
safety assistant for Indian fishermen and marine authorities.

You receive the outputs of several specialist agents (weather, ocean/PFZ, \
risk, route, hazard, welfare) for one user query. The user query may be in \
English, Hindi, Marathi, or mixed Hinglish (Romanized Hindi-English like 'Kal subah fishing ke liye jaana safe hai?').

Write ONE short, clear, plain-language answer that:
- directly answers the user's question first
- mentions safety-relevant numbers (wind, waves, risk band) simply
- explicitly flags low-confidence or stale/degraded data instead of hiding it \
  (e.g. "this subsurface estimate is less certain because Argo float coverage \
  is sparse here" or "showing last known conditions, live data unavailable")
- avoids jargon; assume the reader may have low technical literacy
- responds in the requested language (or Hindi/Hinglish if query is in Hindi/Hinglish)
- stays under ~120 words unless the question needs a safety-critical detail

Never invent numbers that are not in the agent outputs provided to you."""


def _format_results(results: List[AgentResult]) -> str:
    lines = []
    for r in results:
        tag = "OK" if r.ok else "FAILED"
        stale = " (STALE/DEGRADED)" if r.stale else ""
        conf = f", confidence={r.confidence}" if r.confidence is not None else ""
        lines.append(f"- {r.agent.value} [{tag}{stale}{conf}]: {r.data or r.error}")
    return "\n".join(lines) if lines else "(no specialist agents ran for this query)"


class ExplanationAgent:
    async def synthesize(self, plan: Plan, results: List[AgentResult]) -> str:
        user_prompt = (
            f"User's question ({plan.language}): {plan.query}\n\n"
            f"Agent outputs:\n{_format_results(results)}\n\n"
            f"Write the final answer in language code '{plan.language}'."
        )
        try:
            return await llm_client.complete_text(SYSTEM_PROMPT, user_prompt, max_tokens=400)
        except LLMError as exc:
            # Never fabricate an answer. Fall back to a plain, honest
            # concatenation of the real agent data so the user still gets
            # something usable, with the LLM outage stated up front.
            logger.warning("Explanation LLM call failed: %s", exc)
            lines = [f"(Live explanation generation unavailable: {exc})", "Raw specialist agent results:"]
            lines.append(_format_results(results))
            return "\n".join(lines)


explanation_agent = ExplanationAgent()
