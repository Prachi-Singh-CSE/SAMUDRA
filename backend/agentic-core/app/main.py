"""
Agentic Core API surface.

Endpoints:
  POST /chat          text query -> plan -> orchestrated agent run -> answer
  POST /chat/voice     audio upload -> ASR -> /chat pipeline -> TTS (if configured)
  POST /sos            one-tap emergency beacon
  GET  /session/{id}   inspect session state (demo/debug aid)
  GET  /health         liveness + which downstream services are configured

Run: uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

import logging
import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import settings
from app.emergency_agent import emergency_agent
from app.explanation_agent import explanation_agent
from app.llm_client import llm_client
from app.multilingual import detect_language, multilingual_pipeline
from app.orchestrator import orchestrator
from app.planner_agent import planner_agent
from app.schemas import (
    AgentName,
    AgentResult,
    ChatRequest,
    ChatResponse,
    SosRequest,
    SosResponse,
    SubTask,
    TraceStep,
)
from app.session_manager import Turn, session_manager
from app.welfare_agent import call_welfare_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agentic_core.main")

app = FastAPI(title="Marine Intelligence - Agentic Core", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production; fine for hackathon demo
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _run_chat_pipeline(req: ChatRequest) -> ChatResponse:
    session = session_manager.get_or_create(req.session_id)
    if req.location:
        session.location = req.location

    language = req.language or detect_language(req.text)
    session.language = language
    # Persist the location/language set above before doing anything else --
    # required for correctness on the Redis backend, where get_or_create()
    # returns a fresh deserialized copy each call rather than a shared
    # in-memory reference (see session_manager.save's docstring).
    session_manager.save(session)

    plan = await planner_agent.plan(req.text, language, session)

    trace: list[TraceStep] = []
    results: list[AgentResult] = []

    # Emergency short-circuits the rest of the pipeline.
    emergency_tasks = [st for st in plan.subtasks if st.agent == AgentName.EMERGENCY]
    if emergency_tasks:
        trace.append(TraceStep(step="emergency_shortcircuit", detail="distress language detected"))
        sos = await emergency_agent.handle_sos(
            SosRequest(
                session_id=req.session_id,
                lat=(req.location or {}).get("lat", 0.0),
                lon=(req.location or {}).get("lon", 0.0),
                note=req.text,
            )
        )
        trace.extend(sos.trace)
        answer = (
            "Emergency signal received. Your location and the nearest safe harbor "
            f"({sos.nearest_harbor.get('name', 'unknown')}) have been sent to the authority "
            "dashboard. Stay near your last reported position if it is safe to do so."
        )
        results.append(AgentResult(agent=AgentName.EMERGENCY, ok=sos.dispatched_to_dashboard, data=sos.model_dump()))
        turn = Turn(query=req.text, plan=plan, agent_results=results, answer=answer)
        session_manager.record_turn(req.session_id, turn)
        return ChatResponse(
            session_id=req.session_id, answer=answer, language=language, plan=plan,
            agent_results=results, trace=trace, degraded=not sos.dispatched_to_dashboard,
        )

    # Welfare runs outside the DAG orchestrator (pure RAG, no dependencies).
    welfare_tasks = [st for st in plan.subtasks if st.agent == AgentName.WELFARE]
    graph_results, graph_trace = await orchestrator.run(plan)
    results.extend(graph_results)
    trace.extend(graph_trace)

    for st in welfare_tasks:
        st.args.setdefault("query", req.text)
        res = await call_welfare_agent(st)
        results.append(res)
        trace.append(TraceStep(step="agent_result", detail=f"welfare_agent: ok={res.ok} confidence={res.confidence}"))

    degraded = orchestrator.is_degraded(results)
    answer = await explanation_agent.synthesize(plan, results)

    turn = Turn(query=req.text, plan=plan, agent_results=results, answer=answer)
    session_manager.record_turn(req.session_id, turn)

    return ChatResponse(
        session_id=req.session_id,
        answer=answer,
        language=language,
        plan=plan,
        agent_results=results,
        trace=trace,
        degraded=degraded,
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    t0 = time.time()
    try:
        resp = await _run_chat_pipeline(req)
    except Exception as exc:
        logger.exception("chat pipeline failed")
        raise HTTPException(status_code=500, detail=str(exc))
    logger.info("chat turn handled in %dms (session=%s)", int((time.time() - t0) * 1000), req.session_id)
    return resp


@app.post("/chat/voice")
async def chat_voice(
    session_id: str = Form(...),
    language_hint: str | None = Form(None),
    lat: float | None = Form(None),
    lon: float | None = Form(None),
    audio: UploadFile = File(...),
):
    audio_bytes = await audio.read()
    asr = await multilingual_pipeline.speech_to_text(audio_bytes, language_hint)
    if asr.get("error") or not asr.get("text"):
        raise HTTPException(
            status_code=503,
            detail=asr.get("error", "ASR returned empty transcript"),
        )

    location = {"lat": lat, "lon": lon} if lat is not None and lon is not None else None
    chat_resp = await _run_chat_pipeline(
        ChatRequest(session_id=session_id, text=asr["text"], language=asr["language"], location=location)
    )

    audio_out = await multilingual_pipeline.text_to_speech(chat_resp.answer, chat_resp.language)
    if audio_out:
        # Return audio directly; client can also hit /chat again for the
        # structured JSON (trace, plan, agent_results) if it wants both.
        return Response(content=audio_out, media_type="audio/wav")
    return chat_resp


@app.post("/sos", response_model=SosResponse)
async def sos(req: SosRequest):
    return await emergency_agent.handle_sos(req)


@app.get("/session/{session_id}")
def get_session(session_id: str):
    session = session_manager.get_or_create(session_id)
    return {
        "session_id": session.session_id,
        "language": session.language,
        "location": session.location,
        "entities": session.entities,
        "turns": [
            {"query": t.query, "answer": t.answer, "timestamp": t.timestamp}
            for t in session.turns
        ],
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "llm_live": llm_client.is_live(),
        "bhashini_configured": multilingual_pipeline.is_configured(),
        "session_backend": "redis" if type(session_manager._store).__name__ == "_RedisStore" else "memory",
        "downstream_services": {
            "weather_agent_url": bool(settings.WEATHER_AGENT_URL),
            "ocean_agent_url": bool(settings.OCEAN_AGENT_URL),
            "risk_agent_url": bool(settings.RISK_AGENT_URL),
            "route_agent_url": bool(settings.ROUTE_AGENT_URL),
            "hazard_agent_url": bool(settings.HAZARD_AGENT_URL),
            "authority_dashboard_webhook": bool(settings.AUTHORITY_DASHBOARD_WEBHOOK_URL),
        },
    }
