import pytest

import app.tool_clients as tool_clients
from app.orchestrator import orchestrator
from app.planner_agent import planner_agent
from app.session_manager import SessionManager

# These tests stub the single outbound HTTP seam (_fetch_json) with
# realistic canned Open-Meteo-shaped responses, so the orchestrator's
# dependency-wave logic and AgentResult normalization can be verified
# without hitting the real network in CI/sandboxes. Production code path
# (app/tool_clients.py) is unchanged and calls the real APIs.

FAKE_GEOCODE = {"results": [{"latitude": 16.99, "longitude": 73.31}]}
FAKE_FORECAST_DAILY = {
    "daily": {
        "time": ["2026-09-14"],
        "wind_speed_10m_max": [22.4],
        "wind_gusts_10m_max": [35.0],
        "precipitation_sum": [1.2],
        "weathercode": [3],
    }
}
FAKE_MARINE_DAILY = {
    "daily": {
        "wave_height_max": [1.8],
        "wave_period_max": [7.0],
        "sea_level_height_msl": [0.3],
    }
}
FAKE_MARINE_CURRENT = {
    "current": {
        "sea_surface_temperature": 28.1,
        "wave_height": 1.5,
        "swell_wave_height": 0.9,
    }
}


async def fake_fetch_json(url, params):
    if "geocoding" in url:
        return FAKE_GEOCODE
    if "marine" in url:
        return FAKE_MARINE_CURRENT if "current" in params else FAKE_MARINE_DAILY
    return FAKE_FORECAST_DAILY


@pytest.fixture(autouse=True)
def patch_network(monkeypatch):
    monkeypatch.setattr(tool_clients, "_fetch_json", fake_fetch_json)


@pytest.mark.asyncio
async def test_orchestrator_runs_full_plan_and_resolves_dependencies():
    sm = SessionManager()
    session = sm.get_or_create("t1")
    plan = await planner_agent.plan("should I go fishing tomorrow near Ratnagiri", "en", session)

    results, trace = await orchestrator.run(plan)

    assert len(results) == len(plan.subtasks)
    assert all(r.ok for r in results)
    assert any(step.step == "dispatch_wave" for step in trace)

    risk_result = next(r for r in results if r.agent.value == "risk_agent")
    # Risk score should be a real derived value from the fetched wave/wind data.
    assert 0.0 <= risk_result.data["composite_risk_score"] <= 1.0


@pytest.mark.asyncio
async def test_mock_network_results_carry_confidence_scores():
    sm = SessionManager()
    session = sm.get_or_create("t2")
    plan = await planner_agent.plan("weather near Kochi", "en", session)
    results, _ = await orchestrator.run(plan)
    for r in results:
        assert r.confidence is not None


@pytest.mark.asyncio
async def test_hazard_agent_is_honest_about_missing_capability():
    from app.schemas import AgentName, SubTask
    from app.tool_clients import call_hazard_agent

    result = await call_hazard_agent(SubTask(id="h1", agent=AgentName.HAZARD, args={}))
    assert result.ok is False
    assert "Lavanya" in result.error or "pending" in result.error.lower()
