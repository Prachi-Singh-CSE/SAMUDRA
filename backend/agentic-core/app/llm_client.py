"""
LLM client wrapper — Google Gemini (free tier) via the REST API directly
(no SDK dependency; one fewer thing to install/break). Endpoint and auth
per https://ai.google.dev/api.

No silent fabrication: if GOOGLE_API_KEY isn't set, or the call fails,
callers get an explicit error string back instead of a fake "mock"
answer — consistent with the "no demo data" requirement. The Explanation
and Welfare agents are responsible for surfacing that error to the user
plainly (e.g. "explanation generation is temporarily unavailable").
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict

import httpx

from app.config import settings

logger = logging.getLogger("agentic_core.llm")

_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class LLMError(RuntimeError):
    pass


class LLMClient:
    def __init__(self, model: str = None):
        self.model = model or settings.GEMINI_MODEL

    def is_live(self) -> bool:
        return bool(settings.GOOGLE_API_KEY)

    async def _generate(self, system: str, user: str, max_tokens: int, json_mode: bool) -> str:
        if not settings.GOOGLE_API_KEY:
            raise LLMError(
                "GOOGLE_API_KEY is not set. Add it to .env to enable real LLM "
                "responses (Planner refinement, Explanation, Welfare RAG)."
            )

        url = f"{_BASE_URL}/{self.model}:generateContent"
        generation_config: Dict[str, Any] = {"maxOutputTokens": max_tokens}
        if json_mode:
            generation_config["responseMimeType"] = "application/json"

        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": generation_config,
        }

        async with httpx.AsyncClient(timeout=settings.TOOL_TIMEOUT_SECONDS * 3) as client:
            resp = await client.post(
                url,
                headers={"x-goog-api-key": settings.GOOGLE_API_KEY, "Content-Type": "application/json"},
                json=payload,
            )
            if resp.status_code != 200:
                raise LLMError(f"Gemini API error {resp.status_code}: {resp.text[:300]}")
            data = resp.json()

        try:
            candidate = data["candidates"][0]
            parts = candidate["content"]["parts"]
            return "".join(p.get("text", "") for p in parts).strip()
        except (KeyError, IndexError) as exc:
            finish_reason = data.get("candidates", [{}])[0].get("finishReason", "unknown")
            raise LLMError(f"Gemini returned no usable content (finishReason={finish_reason})") from exc

    async def complete_json(self, system: str, user: str, max_tokens: int = 1024) -> Dict[str, Any]:
        text = await self._generate(system, user, max_tokens, json_mode=True)
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise LLMError(f"Gemini did not return valid JSON: {text[:200]}") from exc

    async def complete_text(self, system: str, user: str, max_tokens: int = 800) -> str:
        return await self._generate(system, user, max_tokens, json_mode=False)


llm_client = LLMClient()
