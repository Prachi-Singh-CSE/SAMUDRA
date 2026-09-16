"""
Lightweight RAG retriever for the Welfare / Scheme Agent.

Uses TF-IDF + cosine similarity (scikit-learn) rather than a neural
embedding model, on purpose: the corpus is a handful of short government
scheme documents, so a heavy embedding model buys nothing but slower
cold-starts and an extra multi-GB dependency. Swap in a sentence-transformer
or a hosted embeddings API later by re-implementing `retrieve()` --
the interface (query -> list[Chunk]) stays the same.
"""
from __future__ import annotations

import glob
import os
from dataclasses import dataclass
from typing import List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DOCS_DIR = os.path.join(os.path.dirname(__file__), "documents")


@dataclass
class Chunk:
    doc_name: str
    text: str
    score: float = 0.0


def _load_chunks() -> List[Chunk]:
    chunks: List[Chunk] = []
    for path in sorted(glob.glob(os.path.join(DOCS_DIR, "*.txt"))):
        name = os.path.splitext(os.path.basename(path))[0]
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        # paragraph-level chunking -- documents are short and already
        # organized into logical sections (Overview / Who can apply / etc.)
        for para in [p.strip() for p in text.split("\n\n") if p.strip()]:
            chunks.append(Chunk(doc_name=name, text=para))
    return chunks


class WelfareRetriever:
    def __init__(self):
        self._chunks = _load_chunks()
        self._vectorizer = TfidfVectorizer(stop_words="english")
        corpus = [c.text for c in self._chunks] or [""]
        self._matrix = self._vectorizer.fit_transform(corpus)

    def retrieve(self, query: str, top_k: int = 4) -> List[Chunk]:
        if not self._chunks:
            return []
        q_vec = self._vectorizer.transform([query])
        sims = cosine_similarity(q_vec, self._matrix)[0]
        ranked = sorted(zip(self._chunks, sims), key=lambda x: -x[1])[:top_k]
        return [Chunk(doc_name=c.doc_name, text=c.text, score=float(s)) for c, s in ranked if s > 0]

    def reload(self):
        """Call after adding/editing files in rag/documents/ at runtime."""
        self.__init__()


welfare_retriever = WelfareRetriever()
