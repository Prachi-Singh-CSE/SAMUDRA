"""
Multi-turn session state.

This is what lets the Planner do genuine plan *revision* ("what about the
day after?") instead of treating every message as a fresh, context-free
query.

Two backends, selected by SESSION_BACKEND in config.py:

- "memory" (default): a plain per-process dict. Zero setup, matches the
  original hackathon/demo behaviour exactly. Sessions vanish on restart
  and aren't shared across instances.
- "redis": sessions are JSON-serialized into Redis with a sliding TTL, so
  they survive restarts and are shared across multiple app instances --
  what a real (non-single-server) deployment needs. If SESSION_BACKEND is
  "redis" but Redis can't be reached at startup, this falls back to the
  in-memory store rather than crashing the whole service, and logs a loud
  warning -- same "never silently pretend it worked" philosophy as the
  rest of this module.

Both backends are exposed through the same synchronous SessionManager API,
so callers (main.py) don't need to know or care which one is active.
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.config import settings
from app.schemas import AgentResult, Plan

logger = logging.getLogger("agentic_core.session_manager")


@dataclass
class Turn:
    query: str
    plan: Plan
    agent_results: List[AgentResult]
    answer: str
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "query": self.query,
            "plan": self.plan.model_dump(mode="json"),
            "agent_results": [r.model_dump(mode="json") for r in self.agent_results],
            "answer": self.answer,
            "timestamp": self.timestamp,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Turn":
        return cls(
            query=d["query"],
            plan=Plan.model_validate(d["plan"]),
            agent_results=[AgentResult.model_validate(r) for r in d.get("agent_results", [])],
            answer=d["answer"],
            timestamp=d.get("timestamp", time.time()),
        )


@dataclass
class SessionState:
    session_id: str
    language: str = "en"
    location: Optional[Dict[str, float]] = None  # last known lat/lon
    entities: Dict[str, Any] = field(default_factory=dict)  # e.g. {"place":"Ratnagiri","date":"2026-09-14"}
    turns: List[Turn] = field(default_factory=list)
    last_touched: float = field(default_factory=time.time)

    def touch(self):
        self.last_touched = time.time()

    @property
    def last_turn(self) -> Optional[Turn]:
        return self.turns[-1] if self.turns else None

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "language": self.language,
            "location": self.location,
            "entities": self.entities,
            "turns": [t.to_dict() for t in self.turns],
            "last_touched": self.last_touched,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "SessionState":
        return cls(
            session_id=d["session_id"],
            language=d.get("language", "en"),
            location=d.get("location"),
            entities=d.get("entities", {}),
            turns=[Turn.from_dict(t) for t in d.get("turns", [])],
            last_touched=d.get("last_touched", time.time()),
        )


class _SessionStore:
    """Backend interface. Deliberately synchronous (not async) so it's a
    drop-in swap behind the existing SessionManager API used by main.py."""

    def get(self, session_id: str) -> Optional[SessionState]:
        raise NotImplementedError

    def save(self, state: SessionState) -> None:
        raise NotImplementedError

    def delete(self, session_id: str) -> None:
        raise NotImplementedError

    def all_ids(self) -> List[str]:
        raise NotImplementedError


class _InMemoryStore(_SessionStore):
    """Original behaviour: a plain process-wide dict."""

    def __init__(self):
        self._data: Dict[str, SessionState] = {}

    def get(self, session_id):
        return self._data.get(session_id)

    def save(self, state):
        self._data[state.session_id] = state

    def delete(self, session_id):
        self._data.pop(session_id, None)

    def all_ids(self):
        return list(self._data.keys())


class _RedisStore(_SessionStore):
    """Backed by a synchronous redis-py client. Each session is one JSON
    string under `agentic_core:session:{id}`, with Redis's own TTL doing
    expiry (refreshed on every save) -- so eviction is correct even with
    several app instances sharing one Redis, unlike a manual local sweep.
    """

    def __init__(self, url: str, ttl_seconds: int):
        import redis  # local import: only required when SESSION_BACKEND=redis

        self._ttl = max(ttl_seconds, 1)
        self._client = redis.Redis.from_url(url, decode_responses=True)
        self._client.ping()  # fail fast here if Redis is unreachable

    def _key(self, session_id: str) -> str:
        return f"agentic_core:session:{session_id}"

    def get(self, session_id):
        raw = self._client.get(self._key(session_id))
        if not raw:
            return None
        try:
            return SessionState.from_dict(json.loads(raw))
        except Exception:
            logger.exception(
                "Failed to deserialize session %s from Redis; treating as missing", session_id
            )
            return None

    def save(self, state):
        self._client.set(self._key(state.session_id), json.dumps(state.to_dict()), ex=self._ttl)

    def delete(self, session_id):
        self._client.delete(self._key(session_id))

    def all_ids(self):
        prefix = self._key("")
        return [k[len(prefix):] for k in self._client.keys(f"{prefix}*")]


def _build_store() -> _SessionStore:
    ttl_seconds = int(settings.SESSION_TTL_MINUTES * 60)
    if settings.SESSION_BACKEND == "redis":
        try:
            store = _RedisStore(settings.REDIS_URL, ttl_seconds)
            logger.info("Session store: Redis (%s)", settings.REDIS_URL)
            return store
        except Exception as exc:
            logger.warning(
                "SESSION_BACKEND=redis but Redis is unreachable (%s) -- falling back to "
                "in-memory sessions. Sessions will NOT survive a restart or be shared "
                "across instances until this is fixed.",
                exc,
            )
    logger.info("Session store: in-memory (single-process)")
    return _InMemoryStore()


class SessionManager:
    def __init__(self):
        self._store = _build_store()

    def get_or_create(self, session_id: str) -> SessionState:
        self._evict_expired()
        state = self._store.get(session_id)
        if state is None:
            state = SessionState(session_id=session_id)
        state.touch()
        self._store.save(state)
        return state

    def save(self, state: SessionState) -> None:
        """Persist in-place mutations made to a SessionState the caller
        already holds (e.g. main.py setting session.language/location).
        Required for the Redis backend, since get() there returns a fresh
        deserialized copy each time rather than a shared reference."""
        state.touch()
        self._store.save(state)

    def record_turn(self, session_id: str, turn: Turn):
        state = self.get_or_create(session_id)
        state.turns.append(turn)
        # Fold newly-mentioned entities forward so follow-ups inherit them.
        for st in turn.plan.subtasks:
            for k in ("place", "location_name", "date", "radius_km"):
                if k in st.args and st.args[k]:
                    state.entities[k] = st.args[k]
        state.touch()
        self._store.save(state)

    def _evict_expired(self):
        # Redis expires keys natively (ex=ttl on every save); this manual
        # sweep is only meaningful -- and only run -- for the in-memory store.
        if not isinstance(self._store, _InMemoryStore):
            return
        cutoff = time.time() - settings.SESSION_TTL_MINUTES * 60
        expired = [sid for sid in self._store.all_ids() if self._store.get(sid).last_touched < cutoff]
        for sid in expired:
            self._store.delete(sid)


# Process-wide singleton; backend chosen at import time from settings.
session_manager = SessionManager()
