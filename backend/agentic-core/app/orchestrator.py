"""
Orchestrator: executes a Planner-produced Plan as a small async DAG.

This deliberately avoids pulling in the full LangGraph dependency for the
prototype (fewer moving parts for a hackathon build) while matching its
mental model exactly: nodes = subtasks, edges = depends_on, independent
nodes run concurrently via asyncio.gather, dependent nodes wait on their
upstream results. Swapping in real LangGraph later means replacing this
file's `run()` body only -- the Plan/AgentResult contracts don't change.

Also owns: emergency short-circuiting, and degraded-mode detection
(if a subtask's result comes back stale, the overall response is flagged
degraded so the UI can show it, per the project doc's Layer-4 requirement).
"""
from __future__ import annotations

import asyncio
from typing import Dict, List

from app.schemas import AgentName, AgentResult, Plan, SubTask, TraceStep
from app.tool_clients import (
    call_hazard_agent,
    call_ocean_agent,
    call_risk_agent,
    call_route_agent,
    call_weather_agent,
)

_NO_UPSTREAM_ARG = {AgentName.WEATHER, AgentName.OCEAN, AgentName.HAZARD}


async def _dispatch(subtask: SubTask, upstream: Dict[str, AgentResult]) -> AgentResult:
    if subtask.agent == AgentName.WEATHER:
        return await call_weather_agent(subtask)
    if subtask.agent == AgentName.OCEAN:
        return await call_ocean_agent(subtask)
    if subtask.agent == AgentName.HAZARD:
        return await call_hazard_agent(subtask)
    if subtask.agent == AgentName.RISK:
        return await call_risk_agent(subtask, upstream)
    if subtask.agent == AgentName.ROUTE:
        return await call_route_agent(subtask, upstream)
    # WELFARE and EMERGENCY are handled outside this graph (see main.py) --
    # WELFARE is a RAG call, EMERGENCY is deterministic and latency-critical.
    return AgentResult(agent=subtask.agent, ok=False, error="not dispatched by orchestrator")


class Orchestrator:
    async def run(self, plan: Plan) -> tuple[List[AgentResult], List[TraceStep]]:
        trace: List[TraceStep] = [TraceStep(step="plan", detail=plan.notes)]
        remaining = {st.id: st for st in plan.subtasks if st.agent not in (AgentName.WELFARE, AgentName.EMERGENCY)}
        results: Dict[str, AgentResult] = {}

        # Topological "waves": run everything whose deps are satisfied,
        # concurrently, then repeat. Simple and sufficient for the shallow
        # graphs this planner produces (depth <= 2).
        while remaining:
            ready = [st for st in remaining.values() if all(d in results for d in st.depends_on)]
            if not ready:
                # circular or unresolved dependency -- fail safe, don't hang
                for st in remaining.values():
                    results[st.id] = AgentResult(agent=st.agent, ok=False, error="unresolved dependency")
                break

            trace.append(
                TraceStep(
                    step="dispatch_wave",
                    detail=f"Running in parallel: {[st.agent.value for st in ready]}",
                )
            )
            coros = [_dispatch(st, results) for st in ready]
            wave_results = await asyncio.gather(*coros, return_exceptions=True)

            for st, res in zip(ready, wave_results):
                if isinstance(res, Exception):
                    res = AgentResult(agent=st.agent, ok=False, error=str(res))
                results[st.id] = res
                trace.append(
                    TraceStep(
                        step="agent_result",
                        detail=(
                            f"{st.agent.value}: ok={res.ok} "
                            f"confidence={res.confidence} stale={res.stale}"
                        ),
                    )
                )
                del remaining[st.id]

        return list(results.values()), trace

    @staticmethod
    def is_degraded(results: List[AgentResult]) -> bool:
        return any((not r.ok) or r.stale for r in results)


orchestrator = Orchestrator()
