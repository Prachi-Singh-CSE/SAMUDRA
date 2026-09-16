# Agentic Core — Millyshree's Module

Conversational Marine Intelligence Platform (SIH 2026), Layer 1 —
Conversational Agentic Core. **No demo/mock/random data anywhere.** Every
number the system returns is either live from a real free public API,
a real derived computation from that live data, or an honest "not yet
available" error naming exactly which teammate's pipeline it's waiting on.

## Real data policy (read this first)

| Agent | Data source right now | When Prachi/Lavanya's service is ready |
|---|---|---|
| Weather | **Live**: [Open-Meteo Forecast + Marine APIs](https://open-meteo.com) (free, no key) — real wind, gusts, precipitation, wave height/period for the actual place/date | Set `WEATHER_AGENT_URL` in `.env`; the code prefers it automatically and falls back to Open-Meteo only if that call fails |
| Ocean | **Live**: Open-Meteo Marine API — real sea-surface temperature, wave height, swell height | Set `OCEAN_AGENT_URL` for chlorophyll + OceanEmbed subsurface reconstruction (no free public equivalent exists, so this stays `null` + explicitly labelled `pending_integration` until then) |
| Risk | **Real, derived**: composite score computed from *this turn's actual* wave height + wind speed via a documented, fixed formula (see `tool_clients.call_risk_agent`) | Set `RISK_AGENT_URL` for the full composite score (cyclone proximity, hazard proximity, subsurface confidence) |
| Route | **Real, derived**: haversine distance to the nearest of 14 real major Indian coastal fishing harbours (public-knowledge coordinates) | Set `ROUTE_AGENT_URL` for jetty-precise PostGIS harbour data and an actual hazard-avoiding routed path (this build only gives straight-line distance, labelled as such) |
| Hazard | **Honest failure**: returns `ok:false` with an explicit message that SAR oil-slick detection + AIS correlation isn't available yet — no free public substitute exists, so nothing is fabricated | Set `HAZARD_AGENT_URL` — required, there's no fallback for this one |
| Welfare | **Real RAG**: TF-IDF retrieval over the 3 scheme documents in `app/rag/documents/`, generated answer grounded only in retrieved text | N/A — this agent is complete as designed |
| Emergency/SOS | **Real**: reuses the real Route computation for nearest harbour; pushes to `AUTHORITY_DASHBOARD_WEBHOOK_URL` if configured, otherwise **honestly reports `dispatched_to_dashboard: false`** rather than pretending it was delivered | Set the webhook URL once the authority dashboard exists |
| Planner reasoning / Explanation / Welfare answer generation | **Live**: Google Gemini free-tier API (`GOOGLE_API_KEY`) | Already production-grade; just needs your key |

If any live call fails (network down, API changed, no key configured),
you get `ok: false` and a plain-English `error` field — **never** a
silently-substituted fake number. This is what makes the platform's
"honest under real-world conditions" USP (§9.4 of the project doc)
actually true rather than aspirational.

## LLM: Google Gemini (free tier)

Get a free key at https://aistudio.google.com/apikey, then:
```
GOOGLE_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.0-flash
```
`app/llm_client.py` calls the REST API directly (`generateContent`), no
SDK dependency. Used by:
- Planner (`_llm_refine`) — polishes the trace's reasoning text; cosmetic only, plan structure is rule-based and never depends on it
- Explanation agent — synthesizes the final answer from real agent data
- Welfare agent — generates the grounded answer from retrieved scheme excerpts

Without a key, `/chat` still runs end-to-end (real weather/ocean/risk/route
data, real plan, real trace) — the answer field just says explanation
generation is unavailable and shows the raw agent data instead of faking
a summary.

## Quickstart

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: add GOOGLE_API_KEY
uvicorn app.main:app --reload --port 8000
```

```bash
curl -X POST localhost:8000/chat -H "Content-Type: application/json" \
  -d '{"session_id":"s1","text":"should I go fishing tomorrow near Ratnagiri","location":{"lat":17.0,"lon":73.3}}'

# follow-up — reuses session context
curl -X POST localhost:8000/chat -H "Content-Type: application/json" \
  -d '{"session_id":"s1","text":"what about the day after"}'

curl -X POST localhost:8000/chat -H "Content-Type: application/json" \
  -d '{"session_id":"s2","text":"am I eligible for the diesel subsidy?"}'

curl -X POST localhost:8000/sos -H "Content-Type: application/json" \
  -d '{"session_id":"s3","lat":16.99,"lon":73.31,"fisherman_id":"F123"}'
```

Note: this sandbox I built it in has no outbound internet access to
open-meteo.com, so live weather/ocean calls here return an honest network
error — that's the correct behavior in a blocked environment. Run it on
your own machine/server (normal internet access) and you'll get real
current conditions.

## Architecture — unchanged from before, still genuinely agentic

- **Planner** (`app/planner_agent.py`) builds a real dependency graph
  (`SubTask.depends_on`) and does cross-turn revision using session state.
- **Orchestrator** (`app/orchestrator.py`) runs independent subtasks
  concurrently in topological waves, traced step by step.
- **Session manager** (`app/session_manager.py`) carries place/date/location
  across turns for follow-ups like "what about the day after?"
- **Explanation agent** synthesizes one coherent answer and is instructed
  to surface low confidence / stale / missing data as visible caveats,
  never hide them.
- **Emergency agent** is deliberately non-agentic (no LLM call) — speed
  and reliability over generation, per the project doc.

## Tests

```bash
pytest tests/ -v
```
8 tests. The orchestrator tests monkeypatch the single outbound HTTP seam
(`tool_clients._fetch_json`) with realistic Open-Meteo-shaped fixture data
so they run offline/in CI — production code (`app/tool_clients.py`) is
untouched and always calls the real APIs. This is standard test isolation,
not "demo data" in the shipped app.

## Known, honestly-scoped gaps

- **Hazard agent has no fallback** — there's no free public SAR+AIS
  substitute worth pretending to have. It reports `ok:false` until
  `HAZARD_AGENT_URL` (Lavanya's service) is set. Don't try to fake this
  one; a wrong "no oil spill detected" is worse than an honest "unknown."
- **Ocean agent's subsurface fields are always `null`** until Prachi's
  OceanEmbed model is wired in via `OCEAN_AGENT_URL` — by design.
- **Route agent gives straight-line distance, not a routed path** — it's
  explicit about this in `data.note`. Real routing (avoiding restricted
  zones/hazards) is Lavanya's Turf.js/PostGIS Route Agent.
- **Risk formula is a simple, documented 2-input placeholder** (wave +
  wind only) — intentionally transparent rather than a black box, and
  clearly labelled `not_yet_included` for what Lavanya's full Risk Agent adds.

## Session storage

`SESSION_BACKEND` (`.env`) picks the store:

- `memory` (default) — a plain per-process dict, zero setup. Matches the
  original hackathon behaviour exactly. Sessions vanish on restart and
  aren't shared across instances — fine for a single-server demo.
- `redis` — sessions are JSON-serialized into Redis (`REDIS_URL`) with a
  sliding TTL (`SESSION_TTL_MINUTES`), so they survive restarts and are
  shared across multiple app instances. If Redis is unreachable at
  startup, the service logs a loud warning and falls back to the
  in-memory store rather than crashing — same "never silently pretend it
  worked" rule as the rest of this module.

`GET /health` reports which backend is actually active (`session_backend`),
so this is verifiable rather than something you have to take on faith.

```bash
# .env
SESSION_BACKEND=redis
REDIS_URL=redis://localhost:6379/0
```
