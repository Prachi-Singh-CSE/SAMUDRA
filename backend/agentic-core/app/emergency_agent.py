"""
Emergency Agent.

Per the project doc: "Emergency is a deterministic, latency-critical
action (speed and reliability matter more than generation)". So unlike
every other agent here, this one makes NO LLM call on the critical path --
it packages GPS + nearest safe harbor (reusing the Route agent, per the
doc's explicit reuse note) and pushes straight to the authority dashboard.
"""
from __future__ import annotations

from typing import List

from app.schemas import SosRequest, SosResponse, SubTask, TraceStep, AgentName
from app.tool_clients import call_route_agent, push_sos_to_dashboard


class EmergencyAgent:
    async def handle_sos(self, req: SosRequest) -> SosResponse:
        trace: List[TraceStep] = [
            TraceStep(step="sos_received", detail=f"session={req.session_id} lat={req.lat} lon={req.lon}")
        ]

        route_subtask = SubTask(
            id="sos_route",
            agent=AgentName.ROUTE,
            args={"lat": req.lat, "lon": req.lon},
        )
        route_result = await call_route_agent(route_subtask, upstream={})
        harbor = route_result.data.get("nearest_safe_harbor", {})
        trace.append(TraceStep(step="nearest_harbor_resolved", detail=str(harbor)))

        payload = {
            "type": "SOS",
            "session_id": req.session_id,
            "fisherman_id": req.fisherman_id,
            "location": {"lat": req.lat, "lon": req.lon},
            "nearest_safe_harbor": harbor,
            "note": req.note,
        }
        dispatched = await push_sos_to_dashboard(payload)
        trace.append(
            TraceStep(
                step="dashboard_dispatch",
                detail="delivered" if dispatched else "FAILED - retry / escalate via backup channel",
            )
        )

        return SosResponse(
            accepted=True,
            nearest_harbor=harbor,
            dispatched_to_dashboard=dispatched,
            trace=trace,
        )


emergency_agent = EmergencyAgent()
