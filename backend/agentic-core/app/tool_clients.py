"""
Tool clients for Weather, Ocean, Risk, Route, and Hazard.

Design principle for this file (per explicit product decision: NO demo/
random data anywhere): for each agent, in order of preference —

  1. Call Prachi's / Lavanya's real microservice if its URL is configured
     (this is the eventual production path).
  2. Otherwise, call a REAL free public data source directly (Open-Meteo:
     no API key required) so the numbers returned are genuine current
     conditions, not fabricated placeholders.
  3. If neither is available/working, return ok=False with an explicit,
     honest error — never a made-up number.

Two agents have NO free public equivalent (subsurface ocean reconstruction
and SAR+AIS hazard correlation are genuinely proprietary/research-grade
capabilities being built by Prachi and Lavanya). For those, this file is
explicit that the capability is "pending integration" rather than
inventing a plausible-looking result.
"""
from __future__ import annotations

import logging
import math
import time
from typing import Any, Dict, Optional

import httpx

from app.config import settings
from app.schemas import AgentName, AgentResult, SubTask

logger = logging.getLogger("agentic_core.tools")


async def _fetch_json(url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Single seam for outbound GET+JSON calls -- tests monkeypatch this
    function directly instead of hitting the real network."""
    async with httpx.AsyncClient(timeout=settings.TOOL_TIMEOUT_SECONDS) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()


async def _call_downstream_service(base_url: str, path: str, args: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Try a teammate's real microservice. Returns None (not an error) if
    no URL is configured, so callers can fall through to the public-API
    path without treating "not configured yet" as a failure."""
    if not base_url:
        return None
    try:
        payload = await _fetch_json(f"{base_url}{path}", args)
        return payload
    except Exception as exc:
        logger.warning("Live call to %s%s failed (%s); falling back to public data source.", base_url, path, exc)
        return {"__error__": str(exc)}


async def geocode_place(place: str) -> Optional[Dict[str, float]]:
    try:
        data = await _fetch_json(settings.OPEN_METEO_GEOCODING_URL, {"name": place, "count": 1, "language": "en"})
        results = data.get("results") or []
        if not results:
            return None
        top = results[0]
        return {"lat": top["latitude"], "lon": top["longitude"]}
    except Exception as exc:
        logger.warning("Geocoding failed for '%s': %s", place, exc)
        return None


async def _resolve_location(args: Dict[str, Any]) -> tuple[Optional[float], Optional[float], Optional[str]]:
    """Returns (lat, lon, error). Prefers explicit coordinates, else
    geocodes a place name via the real Open-Meteo geocoding API."""
    lat, lon = args.get("lat"), args.get("lon")
    if lat is not None and lon is not None:
        return float(lat), float(lon), None
    place = args.get("place")
    if place:
        geo = await geocode_place(place)
        if geo:
            return geo["lat"], geo["lon"], None
        return None, None, f"could not geocode place name '{place}'"
    return None, None, "no location (lat/lon or place) provided in query"


def _day_offset(date_arg: Optional[str]) -> int:
    if not date_arg:
        return 0
    try:
        return int(date_arg.replace("+", "").replace("d", ""))
    except ValueError:
        return 0


# ---------------------------------------------------------------- weather
async def call_weather_agent(subtask: SubTask) -> AgentResult:
    start = time.time()
    args = subtask.args

    live = await _call_downstream_service(settings.WEATHER_AGENT_URL, "/weather", args)
    if live and "__error__" not in live:
        return AgentResult(
            agent=live.get("agent", AgentName.WEATHER),
            ok=True,
            data=live.get("data", live),
            confidence=live.get("confidence"),
            stale=live.get("stale", False),
            source_note=live.get("source_note", settings.WEATHER_AGENT_URL),
            latency_ms=int((time.time() - start) * 1000),
        )

    lat, lon, err = await _resolve_location(args)
    if err:
        return AgentResult(agent=AgentName.WEATHER, ok=False, error=err, latency_ms=int((time.time() - start) * 1000))

    day = _day_offset(args.get("date"))
    stale = bool(live and "__error__" in live)  # a configured service existed but failed

    try:
        forecast = await _fetch_json(
            settings.OPEN_METEO_FORECAST_URL,
            {
                "latitude": lat, "longitude": lon,
                "daily": "wind_speed_10m_max,wind_gusts_10m_max,precipitation_sum,weathercode",
                "forecast_days": max(day + 1, 1),
                "timezone": "auto",
            },
        )
        marine = await _fetch_json(
            settings.OPEN_METEO_MARINE_URL,
            {
                "latitude": lat, "longitude": lon,
                "daily": "wave_height_max,wave_period_max,sea_level_height_msl",
                "forecast_days": max(day + 1, 1),
                "timezone": "auto",
            },
        )
        daily_w = forecast.get("daily", {})
        daily_m = marine.get("daily", {})

        def _at(series: list, idx: int):
            return series[idx] if series and idx < len(series) else None

        data = {
            "place": args.get("place", f"{lat:.3f},{lon:.3f}"),
            "forecast_date": _at(daily_w.get("time", []), day),
            "wind_kmph": _at(daily_w.get("wind_speed_10m_max", []), day),
            "wind_gusts_kmph": _at(daily_w.get("wind_gusts_10m_max", []), day),
            "precipitation_mm": _at(daily_w.get("precipitation_sum", []), day),
            "wave_height_m": _at(daily_m.get("wave_height_max", []), day),
            "wave_period_s": _at(daily_m.get("wave_period_max", []), day),
            "sea_level_height_m": _at(daily_m.get("sea_level_height_msl", []), day),
            # Not available from a public generic NWP model -- these are
            # official-advisory-only signals pending Prachi's IMD/INCOIS feed.
            "cyclone_alert": None,
            "lightning_alert": None,
            "cyclone_lightning_note": "pending integration with IMD/INCOIS advisory feed",
        }
        return AgentResult(
            agent=AgentName.WEATHER,
            ok=True,
            data=data,
            confidence=0.75,  # general-purpose NWP model, not an official IMD/INCOIS product
            stale=stale,
            source_note=(
                "live: Open-Meteo public forecast + marine APIs (stand-in for IMD/INCOIS feed "
                "pending Prachi's integration)" + (" [WEATHER_AGENT_URL configured but unreachable]" if stale else "")
            ),
            latency_ms=int((time.time() - start) * 1000),
        )
    except Exception as exc:
        return AgentResult(
            agent=AgentName.WEATHER, ok=False, error=str(exc),
            source_note="Open-Meteo call failed", latency_ms=int((time.time() - start) * 1000),
        )


# ------------------------------------------------------------------ ocean
async def call_ocean_agent(subtask: SubTask) -> AgentResult:
    start = time.time()
    args = subtask.args

    live = await _call_downstream_service(settings.OCEAN_AGENT_URL, "/ocean", args)
    if live and "__error__" not in live:
        return AgentResult(
            agent=live.get("agent", AgentName.OCEAN),
            ok=True,
            data=live.get("data", live),
            confidence=live.get("confidence"),
            stale=live.get("stale", False),
            source_note=live.get("source_note", settings.OCEAN_AGENT_URL),
            latency_ms=int((time.time() - start) * 1000),
        )

    lat, lon, err = await _resolve_location(args)
    if err:
        return AgentResult(agent=AgentName.OCEAN, ok=False, error=err, latency_ms=int((time.time() - start) * 1000))

    stale = bool(live and "__error__" in live)

    try:
        marine = await _fetch_json(
            settings.OPEN_METEO_MARINE_URL,
            {
                "latitude": lat, "longitude": lon,
                "current": "sea_surface_temperature,wave_height,swell_wave_height",
                "timezone": "auto",
            },
        )
        current = marine.get("current", {})
        data = {
            "place": args.get("place", f"{lat:.3f},{lon:.3f}"),
            "sea_surface_temperature_c": current.get("sea_surface_temperature"),
            "wave_height_m": current.get("wave_height"),
            "swell_wave_height_m": current.get("swell_wave_height"),
            # Genuinely not available from any free public source. Honest
            # rather than fabricated -- these are exactly what Prachi's
            # OceanEmbed model and satellite chlorophyll pipeline deliver.
            "chlorophyll_mg_m3": None,
            "subsurface_temp_profile_c": None,
            "pfz_recommended": None,
            "argo_float_density": None,
            "pending_integration": "chlorophyll + subsurface reconstruction await Prachi's OceanEmbed model",
        }
        return AgentResult(
            agent=AgentName.OCEAN,
            ok=True,
            data=data,
            confidence=0.6,  # surface-only public model data; explicitly not the subsurface product
            stale=stale,
            source_note=(
                "live: Open-Meteo marine API, surface data only "
                "(subsurface/chlorophyll pending OceanEmbed integration)"
                + (" [OCEAN_AGENT_URL configured but unreachable]" if stale else "")
            ),
            latency_ms=int((time.time() - start) * 1000),
        )
    except Exception as exc:
        return AgentResult(
            agent=AgentName.OCEAN, ok=False, error=str(exc),
            source_note="Open-Meteo marine call failed", latency_ms=int((time.time() - start) * 1000),
        )


# ------------------------------------------------------------------- risk
def _normalize(value: Optional[float], cap: float) -> float:
    if value is None:
        return 0.0
    return max(0.0, min(1.0, value / cap))


async def call_risk_agent(subtask: SubTask, upstream: Dict[str, AgentResult]) -> AgentResult:
    """No free public 'risk score' API exists, nor should one be faked.
    Instead this computes a transparent, documented composite score from
    the REAL weather/ocean figures already fetched upstream in this turn
    -- genuine derived data, not a random placeholder."""
    start = time.time()

    live = await _call_downstream_service(settings.RISK_AGENT_URL, "/risk", subtask.args)
    if live and "__error__" not in live:
        return AgentResult(
            agent=live.get("agent", AgentName.RISK), ok=True, data=live.get("data", live),
            confidence=live.get("confidence"), stale=live.get("stale", False),
            source_note=live.get("source_note", settings.RISK_AGENT_URL),
            latency_ms=int((time.time() - start) * 1000),
        )
    stale = bool(live and "__error__" in live)

    weather = next((r for r in upstream.values() if r.agent == AgentName.WEATHER and r.ok), None)
    ocean = next((r for r in upstream.values() if r.agent == AgentName.OCEAN and r.ok), None)

    if not weather and not ocean:
        return AgentResult(
            agent=AgentName.RISK, ok=False,
            error="risk score requires at least one successful upstream weather or ocean result",
            latency_ms=int((time.time() - start) * 1000),
        )

    wave_m = (weather.data.get("wave_height_m") if weather else None) or (ocean.data.get("wave_height_m") if ocean else None)
    wind_kmph = weather.data.get("wind_kmph") if weather else None

    # Documented, fixed weights -- not tuned/learned, deliberately simple
    # and auditable pending Lavanya's full composite Risk Agent (which
    # will add cyclone proximity, hazard proximity, subsurface confidence).
    wave_component = _normalize(wave_m, cap=4.0)   # 4m+ treated as max risk
    wind_component = _normalize(wind_kmph, cap=60.0)  # 60kmph+ treated as max risk
    score = round(0.55 * wave_component + 0.45 * wind_component, 2)
    band = "high" if score > 0.66 else "moderate" if score > 0.33 else "low"

    return AgentResult(
        agent=AgentName.RISK,
        ok=True,
        data={
            "composite_risk_score": score,
            "band": band,
            "inputs_used": {"wave_height_m": wave_m, "wind_kmph": wind_kmph},
            "formula": "0.55*normalize(wave_height,4m) + 0.45*normalize(wind_speed,60kmph)",
            "not_yet_included": "cyclone proximity, hazard proximity, subsurface-data confidence (Lavanya's Risk Agent)",
        },
        confidence=0.65 if (wave_m is not None and wind_kmph is not None) else 0.4,
        stale=stale,
        source_note="derived from this turn's real weather/ocean data" + (
            " [RISK_AGENT_URL configured but unreachable]" if stale else ""
        ),
        latency_ms=int((time.time() - start) * 1000),
    )


# ------------------------------------------------------------------ route
# Approximate coastal reference points for major Indian fishing harbours
# (public-knowledge city/harbour-level coordinates). These are NOT
# jetty-precise -- Lavanya's PostGIS harbour layer is the source of truth
# once built. Labelled honestly in source_note below.
REFERENCE_HARBORS = [
    {"name": "Veraval Fishing Harbour", "lat": 20.9077, "lon": 70.3667},
    {"name": "Porbandar Harbour", "lat": 21.6417, "lon": 69.6293},
    {"name": "Okha Port", "lat": 22.4707, "lon": 69.0762},
    {"name": "Mumbai (Sassoon Dock area)", "lat": 18.9067, "lon": 72.8147},
    {"name": "Ratnagiri Fishing Harbour", "lat": 16.9902, "lon": 73.3120},
    {"name": "New Mangalore Port", "lat": 12.9141, "lon": 74.8022},
    {"name": "Kochi (Thoppumpady) Fisheries Harbour", "lat": 9.9312, "lon": 76.2673},
    {"name": "Tuticorin Port", "lat": 8.7642, "lon": 78.1348},
    {"name": "Chennai Fishing Harbour (Kasimedu)", "lat": 13.1147, "lon": 80.2975},
    {"name": "Visakhapatnam Fishing Harbour", "lat": 17.6958, "lon": 83.3025},
    {"name": "Kakinada Port", "lat": 16.9891, "lon": 82.2475},
    {"name": "Paradip Port", "lat": 20.3167, "lon": 86.6167},
    {"name": "Digha Fishing Harbour", "lat": 21.6270, "lon": 87.5090},
    {"name": "Rameswaram Fishing Harbour", "lat": 9.2876, "lon": 79.3129},
]


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def call_route_agent(subtask: SubTask, upstream: Dict[str, AgentResult]) -> AgentResult:
    start = time.time()
    args = subtask.args

    live = await _call_downstream_service(settings.ROUTE_AGENT_URL, "/route", args)
    if live and "__error__" not in live:
        return AgentResult(
            agent=live.get("agent", AgentName.ROUTE), ok=True, data=live.get("data", live),
            confidence=live.get("confidence"), stale=live.get("stale", False),
            source_note=live.get("source_note", settings.ROUTE_AGENT_URL),
            latency_ms=int((time.time() - start) * 1000),
        )
    stale = bool(live and "__error__" in live)

    lat, lon, err = await _resolve_location(args)
    if err:
        return AgentResult(agent=AgentName.ROUTE, ok=False, error=err, latency_ms=int((time.time() - start) * 1000))

    ranked = sorted(REFERENCE_HARBORS, key=lambda h: _haversine_km(lat, lon, h["lat"], h["lon"]))
    nearest = ranked[0]
    distance_km = round(_haversine_km(lat, lon, nearest["lat"], nearest["lon"]), 1)

    return AgentResult(
        agent=AgentName.ROUTE,
        ok=True,
        data={
            "nearest_safe_harbor": nearest,
            "distance_km": distance_km,
            "bearing_only": True,
            "note": (
                "Straight-line distance to nearest known harbour reference point. "
                "This is NOT a routed path avoiding restricted zones/hazards -- "
                "that requires Lavanya's Route Agent (Turf.js + PostGIS + live hazard layer)."
            ),
        },
        confidence=0.55,
        stale=stale,
        source_note="haversine distance to a curated list of major Indian coastal harbours (city-level accuracy)"
        + (" [ROUTE_AGENT_URL configured but unreachable]" if stale else ""),
        latency_ms=int((time.time() - start) * 1000),
    )


# ----------------------------------------------------------------- hazard
async def call_hazard_agent(subtask: SubTask) -> AgentResult:
    start = time.time()
    live = await _call_downstream_service(settings.HAZARD_AGENT_URL, "/hazard", subtask.args)
    if live and "__error__" not in live:
        return AgentResult(
            agent=live.get("agent", AgentName.HAZARD), ok=True, data=live.get("data", live),
            confidence=live.get("confidence"), stale=live.get("stale", False),
            source_note=live.get("source_note", settings.HAZARD_AGENT_URL),
            latency_ms=int((time.time() - start) * 1000),
        )

    # No free public equivalent exists for SAR oil-slick detection or AIS
    # vessel correlation -- faking a detection result here would be exactly
    # the kind of demo data this build is explicitly avoiding.
    return AgentResult(
        agent=AgentName.HAZARD,
        ok=False,
        error=(
            "Hazard detection (SAR oil-slick segmentation + AIS correlation) is not yet "
            "available: it requires Lavanya's pipeline. Configure HAZARD_AGENT_URL once "
            "that service is live."
        ),
        source_note="pending integration -- no public free data source exists for this capability",
        latency_ms=int((time.time() - start) * 1000),
    )


# ---------------------------------------------------------- SOS dashboard
async def push_sos_to_dashboard(payload: Dict[str, Any]) -> bool:
    if not settings.AUTHORITY_DASHBOARD_WEBHOOK_URL:
        logger.error(
            "AUTHORITY_DASHBOARD_WEBHOOK_URL is not configured -- SOS payload was "
            "NOT delivered anywhere: %s", payload,
        )
        return False
    try:
        async with httpx.AsyncClient(timeout=settings.TOOL_TIMEOUT_SECONDS) as client:
            resp = await client.post(settings.AUTHORITY_DASHBOARD_WEBHOOK_URL, json=payload)
            resp.raise_for_status()
        return True
    except Exception as exc:
        logger.error("SOS dashboard push failed: %s", exc)
        return False
