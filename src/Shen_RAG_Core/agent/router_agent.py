"""LangChain router agent: classify query modality and retrieve from pgvector."""

from __future__ import annotations

import logging
from typing import Any, Literal, cast

from pydantic import BaseModel, Field

from config import settings
from retriever.pgvector_retriever import (
    ChunkHit,
    ChunkType,
    PGVectorRetriever,
    RetrievalResult,
)

RouteType = Literal["text", "table", "image", "hybrid"]

logger = logging.getLogger(__name__)

ROUTER_SYSTEM_PROMPT = """\
You are a query router for the Ashen Era Archive — a fantasy franchise lore database.
The index contains:
- text chunks: narrative lore, history, character descriptions, story events, wiki articles
- table chunks: statistics, power levels, ability scores, timelines, comparison charts
- image chunks: maps, sigils, creature illustrations, diagrams, scanned ephemera, artwork

Classify the user query into exactly one route:
- text: lore questions, history, character backstories, event descriptions, definitions
- table: numeric comparisons, metrics, stats, garrison strengths, attunement costs, rankings
- image: sigils, maps, portraits, creature appearances, figure plates, visual layouts
- hybrid: clearly needs more than one modality (e.g. "tell me about House Valdremor including their sigil and statistics")

Choose hybrid only when multiple modalities are required. Otherwise pick the single best route.
"""


class RouteDecision(BaseModel):
    """Structured routing label for a user query."""

    route: Literal["text", "table", "image", "hybrid"] = Field(
        description="Retrieval modality: text, table, image, or hybrid"
    )
    reasoning: str = Field(
        default="",
        description="Brief justification for the chosen route",
    )


class RouterAgent:
    """Classify queries with LangChain, then search pgvector chunk tables."""

    def __init__(
        self,
        retriever: PGVectorRetriever | None = None,
        *,
        database_url: str | None = None,
        router_model: str | None = None,
        top_k: int = 5,
    ) -> None:
        self.retriever = retriever or PGVectorRetriever(
            database_url=database_url or settings.database_url
        )
        self.router_model = router_model or settings.openai_router_model
        self.default_top_k = top_k
        self._structured_llm = self._build_structured_llm()

    def _build_structured_llm(self) -> Any:
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as exc:
            raise ImportError(
                "langchain-openai is required for RouterAgent. "
                "Install with: pip install langchain-openai"
            ) from exc

        llm = ChatOpenAI(
            model=self.router_model,
            temperature=0,
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
        return llm

    def classify_query(self, query: str) -> RouteDecision:
        """Classify a query with reasoning — works with Ollama (no structured output needed)."""
        import json as _json
        import re as _re

        prompt = (
            ROUTER_SYSTEM_PROMPT
            + "\n\nRespond with ONLY a JSON object like: "
            "{\"route\": \"text\", \"reasoning\": \"...\"}\n\n"
            f"User query: {query}"
        )
        response = self._structured_llm.invoke(
            [{"role": "user", "content": prompt}]
        )
        raw = response.content if hasattr(response, "content") else str(response)

        # Try to parse JSON from response
        try:
            # Find JSON object in response
            json_match = _re.search(r'\{[^}]*"route"\s*:\s*"[^"]*"[^}]*\}', raw)
            if json_match:
                data = _json.loads(json_match.group())
                route = data.get("route", "hybrid").lower().strip()
                if route not in ("text", "table", "image", "hybrid"):
                    route = "hybrid"
                return RouteDecision(
                    route=route,
                    reasoning=data.get("reasoning", ""),
                )
        except (_json.JSONDecodeError, ValueError):
            pass

        # Fallback: look for keywords in raw response
        raw_lower = raw.lower()
        if "table" in raw_lower:
            route = "table"
        elif "image" in raw_lower:
            route = "image"
        elif "hybrid" in raw_lower:
            route = "hybrid"
        else:
            route = "text"

        logger.info("Routed query to %s (fallback parse)", route)
        return RouteDecision(route=route, reasoning=f"Fallback: {raw[:100]}")

    def classify(self, query: str) -> RouteType:
        """Classify a query as text, table, image, or hybrid."""
        return self.classify_query(query).route

    def retrieve(
        self,
        query: str,
        route: RouteType | None = None,
        *,
        top_k: int | None = None,
        doc_id: str | None = None,
        with_content: bool = False,
    ) -> list[RetrievalResult] | list[ChunkHit]:
        """Classify (if needed), search pgvector, return ranked results."""
        k = top_k if top_k is not None else self.default_top_k
        chosen = route or self.classify(query)

        if chosen == "hybrid":
            return self.retriever.search_hybrid(
                query, top_k=k, doc_id=doc_id, with_content=with_content
            )

        return self.retriever.search(
            query,
            cast(ChunkType, chosen),
            top_k=k,
            doc_id=doc_id,
            with_content=with_content,
        )

    def run(
        self,
        query: str,
        *,
        top_k: int | None = None,
        doc_id: str | None = None,
    ) -> dict[str, Any]:
        """
        End-to-end: classify, retrieve, return route label and results.

        Each result has: doc_id, page, type, similarity.
        """
        decision = self.classify_query(query)
        results = self.retrieve(
            query,
            route=decision.route,
            top_k=top_k,
            doc_id=doc_id,
        )
        return {
            "route": decision.route,
            "reasoning": decision.reasoning,
            "results": results,
        }


def route_and_retrieve(
    query: str,
    *,
    database_url: str | None = None,
    top_k: int = 5,
    doc_id: str | None = None,
) -> dict[str, Any]:
    """Convenience wrapper around :class:`RouterAgent`."""
    return RouterAgent(database_url=database_url, top_k=top_k).run(
        query, top_k=top_k, doc_id=doc_id
    )


if __name__ == "__main__":
    import argparse
    import json

    logging.basicConfig(level=logging.INFO)
    cli = argparse.ArgumentParser(description="Route a query and retrieve pgvector chunks.")
    cli.add_argument("query")
    cli.add_argument("--top-k", type=int, default=5)
    cli.add_argument("--doc-id", default=None)
    args = cli.parse_args()

    output = route_and_retrieve(
        args.query,
        top_k=args.top_k,
        doc_id=args.doc_id,
    )
    print(json.dumps(output, indent=2))