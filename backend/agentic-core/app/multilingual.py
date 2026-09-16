"""
Multilingual voice & text pipeline.

Wraps AI4Bharat / Bhashini ASR + TTS behind a small interface so the rest
of the app (session_manager, main.py) never talks to the Bhashini API
directly. When BHASHINI_API_URL/KEY aren't configured, ASR/TTS fall back
to no-ops (text passthrough / no audio) so text-only chat keeps working
during development.

Language detection here is a lightweight Unicode-script heuristic --
enough to route "which language did the user type in" without a network
call. For voice input, language typically comes from the Bhashini ASR
response itself instead.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger("agentic_core.multilingual")

# Unicode block starts, used only for a cheap script-based guess.
_SCRIPT_RANGES = {
    "hi": (0x0900, 0x097F),  # Devanagari (Hindi, Marathi share this block)
    "bn": (0x0980, 0x09FF),  # Bengali
    "ta": (0x0B80, 0x0BFF),  # Tamil
    "te": (0x0C00, 0x0C7F),  # Telugu
    "kn": (0x0C80, 0x0CFF),  # Kannada
    "ml": (0x0D00, 0x0D7F),  # Malayalam
    "gu": (0x0A80, 0x0AFF),  # Gujarati
    "pa": (0x0A00, 0x0A7F),  # Gurmukhi (Punjabi)
    "or": (0x0B00, 0x0B7F),  # Odia
}


def detect_language(text: str) -> str:
    counts = {code: 0 for code in _SCRIPT_RANGES}
    for ch in text:
        cp = ord(ch)
        for code, (lo, hi) in _SCRIPT_RANGES.items():
            if lo <= cp <= hi:
                counts[code] += 1
                break
    best = max(counts, key=counts.get)
    return best if counts[best] > 0 else "en"


class MultilingualPipeline:
    def is_configured(self) -> bool:
        return bool(settings.BHASHINI_API_URL and settings.BHASHINI_API_KEY)

    async def speech_to_text(self, audio_bytes: bytes, source_language_hint: Optional[str] = None) -> dict:
        """Returns {"text": str, "language": str}. Falls back to an
        explicit error the caller can surface, rather than pretending to
        transcribe -- silent fake ASR would be worse than no ASR."""
        if not self.is_configured():
            return {"text": "", "language": source_language_hint or "en",
                     "error": "Bhashini not configured; use text chat instead."}
        try:
            async with httpx.AsyncClient(timeout=settings.TOOL_TIMEOUT_SECONDS * 2) as client:
                resp = await client.post(
                    f"{settings.BHASHINI_API_URL}/asr",
                    headers={"Authorization": f"Bearer {settings.BHASHINI_API_KEY}"},
                    files={"audio": ("input.wav", audio_bytes, "audio/wav")},
                    data={"language_hint": source_language_hint or ""},
                )
                resp.raise_for_status()
                payload = resp.json()
                return {"text": payload.get("text", ""), "language": payload.get("language", "en")}
        except Exception as exc:
            logger.error("Bhashini ASR call failed: %s", exc)
            return {"text": "", "language": source_language_hint or "en", "error": str(exc)}

    async def text_to_speech(self, text: str, language: str) -> Optional[bytes]:
        if not self.is_configured():
            return None
        try:
            async with httpx.AsyncClient(timeout=settings.TOOL_TIMEOUT_SECONDS * 2) as client:
                resp = await client.post(
                    f"{settings.BHASHINI_API_URL}/tts",
                    headers={"Authorization": f"Bearer {settings.BHASHINI_API_KEY}"},
                    json={"text": text, "language": language},
                )
                resp.raise_for_status()
                return resp.content
        except Exception as exc:
            logger.error("Bhashini TTS call failed: %s", exc)
            return None


multilingual_pipeline = MultilingualPipeline()
