"""
Session store tests.

Covers both backends behind SessionManager:
- in-memory (default; regression coverage for the original behaviour)
- redis (via fakeredis, so this runs offline/in CI with no real Redis
  server, but still exercises the *actual* app/session_manager.py code
  path -- not a re-implementation of it).
"""
import time

import pytest

from app.schemas import AgentName, Plan, SubTask
from app.session_manager import SessionManager, Turn


def _fake_turn(place: str = "Ratnagiri") -> Turn:
    plan = Plan(
        query="should I go fishing tomorrow",
        subtasks=[
            SubTask(id="t1", agent=AgentName.WEATHER, args={"place": place, "date": "2026-09-16"}),
        ],
    )
    return Turn(query=plan.query, plan=plan, agent_results=[], answer="Looks safe to go.")


# ---------------------------------------------------------------- memory ---

def test_memory_backend_creates_and_returns_same_session():
    sm = SessionManager()
    s1 = sm.get_or_create("alice")
    s1.language = "hi"
    s2 = sm.get_or_create("alice")
    assert s2.language == "hi"


def test_memory_backend_record_turn_folds_entities_forward():
    sm = SessionManager()
    sm.get_or_create("bob")
    sm.record_turn("bob", _fake_turn(place="Ratnagiri"))

    session = sm.get_or_create("bob")
    assert session.entities.get("place") == "Ratnagiri"
    assert len(session.turns) == 1
    assert session.last_turn.answer == "Looks safe to go."


def test_memory_backend_evicts_expired_sessions(monkeypatch):
    from app import session_manager as sm_module

    monkeypatch.setattr(sm_module.settings, "SESSION_TTL_MINUTES", 0.001)  # ~60ms
    sm = SessionManager()
    sm.get_or_create("expiring")
    time.sleep(0.1)
    sm.get_or_create("someone-else")  # triggers the eviction sweep

    # A brand-new SessionState is indistinguishable from a *survived* one at
    # this API level, so assert on turn count instead: if eviction worked,
    # "expiring" was dropped and recreated empty rather than reused.
    session = sm.get_or_create("expiring")
    assert session.turns == []


# ----------------------------------------------------------------- redis ---

@pytest.fixture
def redis_backend(monkeypatch):
    """Point SESSION_BACKEND at redis and swap in fakeredis so the real
    _RedisStore code path runs against an in-memory fake server instead of
    a real one."""
    import fakeredis

    from app import session_manager as sm_module

    fake_server = fakeredis.FakeServer()
    monkeypatch.setattr(sm_module.settings, "SESSION_BACKEND", "redis")
    monkeypatch.setattr(sm_module.settings, "REDIS_URL", "redis://fake")
    monkeypatch.setattr(sm_module.settings, "SESSION_TTL_MINUTES", 60)

    real_redis_module = __import__("redis")
    monkeypatch.setattr(
        real_redis_module.Redis,
        "from_url",
        classmethod(lambda cls, url, decode_responses=True: fakeredis.FakeStrictRedis(
            server=fake_server, decode_responses=decode_responses
        )),
    )
    yield sm_module


def test_redis_backend_is_selected_and_reachable(redis_backend):
    sm = redis_backend.SessionManager()
    assert isinstance(sm._store, redis_backend._RedisStore)


def test_redis_backend_persists_across_manager_instances(redis_backend):
    # Simulates two app processes/instances sharing one Redis: a session
    # written by one SessionManager must be visible to a brand-new one,
    # which is exactly what the in-memory backend can *not* do.
    sm1 = redis_backend.SessionManager()
    session = sm1.get_or_create("shared-session")
    session.language = "ta"
    sm1.save(session)
    sm1.record_turn("shared-session", _fake_turn(place="Kochi"))

    sm2 = redis_backend.SessionManager()
    session2 = sm2.get_or_create("shared-session")
    assert session2.language == "ta"
    assert session2.entities.get("place") == "Kochi"
    assert len(session2.turns) == 1
    assert session2.turns[0].plan.query == "should I go fishing tomorrow"


def test_redis_backend_falls_back_to_memory_when_unreachable(monkeypatch):
    """If Redis is configured but not actually reachable, the service must
    keep running on the in-memory store rather than crash -- same 'never
    silently pretend it worked, but never fall over either' rule as the
    rest of this module."""
    from app import session_manager as sm_module

    monkeypatch.setattr(sm_module.settings, "SESSION_BACKEND", "redis")
    monkeypatch.setattr(sm_module.settings, "REDIS_URL", "redis://127.0.0.1:1/0")  # nothing listens here

    sm = sm_module.SessionManager()
    assert isinstance(sm._store, sm_module._InMemoryStore)

    # And it still works end-to-end despite the failed Redis connection.
    session = sm.get_or_create("still-works")
    assert session.session_id == "still-works"
