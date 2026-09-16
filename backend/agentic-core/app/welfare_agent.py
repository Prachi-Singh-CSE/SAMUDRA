"""
Welfare / Scheme Agent.

Answers eligibility/subsidy/insurance questions (PMMSY, PMSBY, diesel
subsidy, etc.) using retrieval-augmented generation over the documents in
app/rag/documents/. Deliberately reuses llm_client (the same seam the
Explanation agent uses) rather than being a separate LLM integration --
per the project doc, Welfare "reuses the existing LLM/Explanation Agent
infrastructure" rather than being new core technology.
"""
from __future__ import annotations

from app.llm_client import LLMError, llm_client
from app.rag.retriever import welfare_retriever
from app.schemas import AgentName, AgentResult, SubTask

SYSTEM_PROMPT = (
    "You are the Welfare/Scheme agent of a marine safety assistant for Indian "
    "fishermen. Answer ONLY using the provided scheme excerpts. Be concrete "
    "about who is eligible and the general application steps. If the excerpts "
    "don't cover the question, say so plainly and suggest the fisher contact "
    "their local Fisheries Department. Do not invent subsidy amounts, premium "
    "amounts, or dates that are not in the excerpts -- these vary by state and "
    "year. Keep the answer short, plain-language, and non-technical."
)


async def call_welfare_agent(subtask: SubTask) -> AgentResult:
    query = subtask.args.get("query") or subtask.reason
    chunks = welfare_retriever.retrieve(query, top_k=4)

    if not chunks:
        return AgentResult(
            agent=AgentName.WELFARE,
            ok=False,
            error="no matching scheme documents found",
            source_note="RAG retriever returned zero results",
        )

    context = "\n\n".join(f"[{c.doc_name}] {c.text}" for c in chunks)
    user_prompt = f"Scheme excerpts:\n{context}\n\nFisher's question: {query}"

    try:
        answer = await llm_client.complete_text(SYSTEM_PROMPT, user_prompt, max_tokens=500)
    except LLMError as exc:
        # Don't fabricate an eligibility answer. Return the raw retrieved
        # excerpts so the fisher still gets real, grounded information.
        return AgentResult(
            agent=AgentName.WELFARE,
            ok=True,
            data={
                "answer": f"(Live answer generation unavailable: {exc})",
                "raw_excerpts": [f"[{c.doc_name}] {c.text}" for c in chunks],
                "sources": sorted({c.doc_name for c in chunks}),
            },
            confidence=None,
            stale=True,
            source_note="LLM synthesis unavailable; showing raw retrieved excerpts instead",
        )

    avg_score = sum(c.score for c in chunks) / len(chunks)
    return AgentResult(
        agent=AgentName.WELFARE,
        ok=True,
        data={"answer": answer, "sources": sorted({c.doc_name for c in chunks})},
        confidence=round(min(0.95, 0.5 + avg_score), 2),
        source_note=f"RAG over {len(chunks)} chunks from {sorted({c.doc_name for c in chunks})}",
    )
