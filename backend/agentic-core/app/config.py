"""
Central configuration, loaded from environment variables (.env supported).
Keep every tunable in one place so the demo can be reconfigured without
touching agent logic.
"""
import os
from dotenv import load_dotenv

load_dotenv()


def _f(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


class Settings:
    # LLM (Google Gemini free-tier API — https://ai.google.dev)
    # Accept either env var name since people copy-paste both.
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    # Downstream service URLs (Prachi / Lavanya's modules)
    WEATHER_AGENT_URL: str = os.getenv("WEATHER_AGENT_URL", "")
    OCEAN_AGENT_URL: str = os.getenv("OCEAN_AGENT_URL", "")
    RISK_AGENT_URL: str = os.getenv("RISK_AGENT_URL", "")
    ROUTE_AGENT_URL: str = os.getenv("ROUTE_AGENT_URL", "")
    HAZARD_AGENT_URL: str = os.getenv("HAZARD_AGENT_URL", "")
    AUTHORITY_DASHBOARD_WEBHOOK_URL: str = os.getenv(
        "AUTHORITY_DASHBOARD_WEBHOOK_URL", ""
    )

    # Multilingual
    BHASHINI_API_URL: str = os.getenv("BHASHINI_API_URL", "")
    BHASHINI_API_KEY: str = os.getenv("BHASHINI_API_KEY", "")

    # Session store backend: "memory" (default, single-process, zero setup)
    # or "redis" (multi-instance deploy). Falls back to memory automatically
    # if redis isn't installed/reachable -- see session_manager.py.
    SESSION_BACKEND: str = os.getenv("SESSION_BACKEND", "memory").strip().lower()
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Real, free, no-key public data sources used as stand-ins until
    # Prachi's INCOIS/IMD/MOSDAC pipeline and OceanEmbed model are live.
    OPEN_METEO_FORECAST_URL: str = os.getenv("OPEN_METEO_FORECAST_URL", "https://api.open-meteo.com/v1/forecast")
    OPEN_METEO_MARINE_URL: str = os.getenv("OPEN_METEO_MARINE_URL", "https://marine-api.open-meteo.com/v1/marine")
    OPEN_METEO_GEOCODING_URL: str = os.getenv(
        "OPEN_METEO_GEOCODING_URL", "https://geocoding-api.open-meteo.com/v1/search"
    )

    # Behaviour
    TOOL_TIMEOUT_SECONDS: float = _f("TOOL_TIMEOUT_SECONDS", 4)
    DEGRADED_MODE_STALE_AFTER_MINUTES: float = _f(
        "DEGRADED_MODE_STALE_AFTER_MINUTES", 30
    )
    SESSION_TTL_MINUTES: float = _f("SESSION_TTL_MINUTES", 60)


settings = Settings()
