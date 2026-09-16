import pytest

from app.planner_agent import planner_agent
from app.schemas import AgentName
from app.session_manager import SessionManager, Turn


@pytest.mark.asyncio
async def test_fresh_plan_fans_out_weather_ocean_risk():
    sm = SessionManager()
    session = sm.get_or_create("s1")
    plan = await planner_agent.plan("should I go fishing tomorrow near Ratnagiri", "en", session)

    agents = {st.agent for st in plan.subtasks}
    assert AgentName.WEATHER in agents
    assert AgentName.OCEAN in agents
    assert AgentName.RISK in agents
    assert not plan.is_followup

    risk_task = next(st for st in plan.subtasks if st.agent == AgentName.RISK)
    assert len(risk_task.depends_on) >= 1  # risk waits on weather/ocean


@pytest.mark.asyncio
async def test_entity_extraction_place_and_date():
    sm = SessionManager()
    session = sm.get_or_create("s2")
    plan = await planner_agent.plan("what's the weather near Kochi tomorrow", "en", session)
    weather_task = next(st for st in plan.subtasks if st.agent == AgentName.WEATHER)
    assert weather_task.args.get("place") == "Kochi"
    assert weather_task.args.get("date") == "+1d"


@pytest.mark.asyncio
async def test_followup_inherits_place_from_session():
    sm = SessionManager()
    session = sm.get_or_create("s3")
    plan1 = await planner_agent.plan("weather near Goa tomorrow", "en", session)
    sm.record_turn("s3", Turn(query="weather near Goa tomorrow", plan=plan1, agent_results=[], answer="n/a"))

    plan2 = await planner_agent.plan("what about the day after", "en", session)
    assert plan2.is_followup
    weather_task = next((st for st in plan2.subtasks if st.agent == AgentName.WEATHER), None)
    assert weather_task is not None
    assert weather_task.args.get("place") == "Goa"
    assert weather_task.args.get("date") == "+2d"


@pytest.mark.asyncio
async def test_emergency_query_produces_emergency_subtask():
    sm = SessionManager()
    session = sm.get_or_create("s4")
    plan = await planner_agent.plan("SOS help me my boat is sinking", "en", session)
    assert any(st.agent == AgentName.EMERGENCY for st in plan.subtasks)


@pytest.mark.asyncio
async def test_welfare_query_routes_to_welfare_agent():
    sm = SessionManager()
    session = sm.get_or_create("s5")
    plan = await planner_agent.plan("am I eligible for the diesel subsidy?", "en", session)
    assert any(st.agent == AgentName.WELFARE for st in plan.subtasks)
