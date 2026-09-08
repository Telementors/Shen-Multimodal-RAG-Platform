"""Business logic for indexing and RAG queries."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from openai import OpenAI

from agent.router_agent import RouterAgent
from api.config import DEFAULT_TOP_K, LANGFUSE_ENABLED, UPLOAD_DIR
from config import settings
from api.schemas import (
    AnswerBlock,
    DocumentInfo,
    ImageItem,
    IndexResponse,
    IndexResult,
    QueryResponse,
    SourceItem,
    TableItem,
)
from indexer.pgvector_indexer import PGVectorIndexer
from retriever.pgvector_retriever import ChunkHit

logger = logging.getLogger(__name__)

ANSWER_SYSTEM_PROMPT = """\
You are the Ashen Era Archive AI — an expert lorekeeper and archivist of the Ashen Era
fantasy franchise. You answer questions using the retrieved lore documents, codex entries,
chronicles, wiki articles, and in-world ephemera.

CRITICAL INSTRUCTION FOR RICH ANSWERS:
When your answer references a retrieved image or figure, place the marker [[IMAGE:N]] at
the exact point in your text where the reader should see it (N = the 1-based index of the
image hit). When referencing a table, place [[TABLE:N]] similarly.

Example:
  "The sigil of House Valdremor [[IMAGE:1]] is described in the Codex as a silver serpent..."
  "The power statistics of the Ember Drake are shown below: [[TABLE:1]]"

Rules:
- Use only information from the provided context. Do not invent lore.
- Always cite doc_id and page when stating facts.
- Place markers INLINE — not at the end.
- If no image/table is relevant, do not force a marker.
"""


def _get_langfuse_client() -> Any:
    """Returns Langfuse client or None if disabled/failed."""
    if not LANGFUSE_ENABLED:
        return None
    try:
        from langfuse import Langfuse
        client = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
        # Verify credentials are valid before returning
        client.auth_check()
        return client
    except Exception:
        logger.warning("Langfuse disabled: auth check failed. Check your API keys.")
        return None


class QueryService:
    def __init__(self, router: RouterAgent | None = None) -> None:
        self.router = router or RouterAgent(top_k=DEFAULT_TOP_K)
        self._openai = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
        self._langfuse = _get_langfuse_client()

    def answer_query(
        self,
        query: str,
        *,
        doc_id: str | None = None,
        top_k: int = DEFAULT_TOP_K,
    ) -> QueryResponse:
        if self._langfuse:
            trace = self._langfuse.trace(
                name="query-pipeline",
                input={"query": query, "doc_id": doc_id},
            )
            try:
                result = self._run_query(query, doc_id=doc_id, top_k=top_k)
                trace.update(output={"answer": result.answer})
                return result
            except Exception as e:
                trace.update(output={"error": str(e)})
                raise
        return self._run_query(query, doc_id=doc_id, top_k=top_k)

    def _run_query(self, query: str, *, doc_id: str | None, top_k: int) -> QueryResponse:
        decision = self.router.classify_query(query)
        hits = self.router.retrieve(
            query, route=decision.route, top_k=top_k,
            doc_id=doc_id, with_content=True,
        )
        typed_hits: list[ChunkHit] = [h for h in hits if _is_chunk_hit(h)]  # type: ignore
        sources, tables, images = _partition_hits(typed_hits)
        context = _build_context(typed_hits)
        answer = self._generate_answer(query, context)
        answer_blocks = _build_rich_answer_blocks(answer, images, tables)
        return QueryResponse(
            answer=answer,
            answer_blocks=answer_blocks,
            route=decision.route,
            reasoning=decision.reasoning,
            sources=sources,
            tables=tables,
            images=images,
        )

    def _generate_answer(self, query: str, context: str) -> str:
        messages = [
            {"role": "system", "content": ANSWER_SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"},
        ]
        response = self._openai.chat.completions.create(
            model=settings.openai_answer_model,
            messages=messages,
            temperature=0.2,
            max_tokens=1024,
        )
        return (response.choices[0].message.content or "").strip()


class IndexService:
    def __init__(
        self,
        upload_dir: Path | None = None,
        indexer: PGVectorIndexer | None = None,
        parser: Any | None = None,
    ) -> None:
        self.upload_dir = upload_dir or UPLOAD_DIR
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.indexer = indexer or PGVectorIndexer()
        self._parser = parser
        self._langfuse = _get_langfuse_client()
        self.indexer.ensure_schema()

    def _get_parser(self) -> Any:
        if self._parser is None:
            from parser.pdf_parser import PDFParser
            self._parser = PDFParser()
        return self._parser

    def index_files(
        self,
        file_paths: list[tuple[str, Path]],
        *,
        replace: bool = True,
    ) -> IndexResponse:
        results: list[IndexResult] = []

        for filename, path in file_paths:
            doc_id = Path(filename).stem
            logger.info("Indexing %s as doc_id=%s", filename, doc_id)

            if self._langfuse:
                trace = self._langfuse.trace(
                    name=f"index:{doc_id}",
                    input={"filename": filename},
                )
                try:
                    counts = self._index_single(path, doc_id, replace)
                    trace.update(output={"counts": counts})
                except Exception as e:
                    trace.update(output={"error": str(e)})
                    raise
            else:
                counts = self._index_single(path, doc_id, replace)

            logger.info("Indexed %s: %s", doc_id, counts)
            results.append(IndexResult(doc_id=doc_id, filename=filename, counts=counts))

        return IndexResponse(indexed=results)

    def _index_single(self, path: Path, doc_id: str, replace: bool) -> dict:
        blocks = self._get_parser().parse(path, doc_id=doc_id)
        logger.info("Parsed %d blocks from %s", len(blocks), doc_id)
        return self.indexer.index_blocks(blocks, replace_document=replace)


class DocumentService:
    def __init__(self, router: RouterAgent | None = None) -> None:
        self.router = router or RouterAgent()

    def list_documents(self) -> list[DocumentInfo]:
        rows = self.router.retriever.list_documents()
        return [DocumentInfo(**row) for row in rows]


def _is_chunk_hit(hit: Any) -> bool:
    return isinstance(hit, dict) and "content" in hit


def _partition_hits(
    hits: list[ChunkHit],
) -> tuple[list[SourceItem], list[TableItem], list[ImageItem]]:
    sources: list[SourceItem] = []
    tables: list[TableItem] = []
    images: list[ImageItem] = []

    for hit in hits:
        meta = hit.get("metadata") or {}
        if hit["type"] == "table":
            tables.append(TableItem(
                doc_id=hit["doc_id"], page=hit["page"],
                similarity=hit["similarity"], description=hit["content"],
                raw_table=meta.get("raw_table"), metadata=meta,
            ))
        elif hit["type"] == "image":
            images.append(ImageItem(
                doc_id=hit["doc_id"], page=hit["page"],
                similarity=hit["similarity"], description=hit["content"],
                image_path=meta.get("image_path"), metadata=meta,
            ))
        else:
            sources.append(SourceItem(
                doc_id=hit["doc_id"], page=hit["page"], type=hit["type"],
                similarity=hit["similarity"], content=hit["content"], metadata=meta,
            ))
    return sources, tables, images


def _build_context(hits: list[ChunkHit]) -> str:
    parts: list[str] = []
    for i, hit in enumerate(hits, start=1):
        meta = hit.get("metadata") or {}
        header = (
            f"[{i}] doc_id={hit['doc_id']} page={hit['page']} "
            f"type={hit['type']} similarity={hit['similarity']:.3f}"
        )
        body = hit["content"]
        if hit["type"] == "table" and meta.get("raw_table"):
            body = f"{body}\nRaw table: {meta['raw_table']}"
        parts.append(f"{header}\n{body}")
    return "\n\n".join(parts)


def _build_rich_answer_blocks(
    answer: str,
    images: list[ImageItem],
    tables: list[TableItem],
) -> list[AnswerBlock]:
    """
    Parse LLM answer text for [[IMAGE:N]] and [[TABLE:N]] markers.
    Split into text + image + table blocks in reading order.

    If the LLM did not reference some images/tables via markers,
    append them automatically after the text so they always appear.
    """
    import re

    blocks: list[AnswerBlock] = []
    referenced_images: set[int] = set()
    referenced_tables: set[int] = set()

    # Pattern matches [[IMAGE:N]] or [[TABLE:N]]
    pattern = re.compile(r"\[\[(IMAGE|TABLE):(\d+)\]\]")

    last_end = 0
    for match in pattern.finditer(answer):
        # Add preceding text block
        text_before = answer[last_end : match.start()].strip()
        if text_before:
            blocks.append(AnswerBlock(type="text", content=text_before))

        marker_type = match.group(1)  # IMAGE or TABLE
        marker_idx = int(match.group(2)) - 1  # 0-based

        if marker_type == "IMAGE" and 0 <= marker_idx < len(images):
            img = images[marker_idx]
            blocks.append(AnswerBlock(
                type="image",
                image_path=img.image_path,
                image_description=img.description,
                doc_id=img.doc_id,
                page=img.page,
                similarity=img.similarity,
            ))
            referenced_images.add(marker_idx)
        elif marker_type == "TABLE" and 0 <= marker_idx < len(tables):
            tbl = tables[marker_idx]
            blocks.append(AnswerBlock(
                type="table",
                raw_table=tbl.raw_table,
                table_description=tbl.description,
                doc_id=tbl.doc_id,
                page=tbl.page,
                similarity=tbl.similarity,
            ))
            referenced_tables.add(marker_idx)

        last_end = match.end()

    # Add any trailing text
    trailing = answer[last_end:].strip()
    if trailing:
        blocks.append(AnswerBlock(type="text", content=trailing))

    # If no markers were found, return the full answer as a single text block
    if not blocks:
        blocks.append(AnswerBlock(type="text", content=answer))

    # ── Auto-append un-referenced images and tables ──────────────
    # When the LLM omits markers (common with smaller models),
    # ensure retrieved images/tables still appear in the response.
    for idx, img in enumerate(images):
        if idx not in referenced_images:
            blocks.append(AnswerBlock(
                type="image",
                image_path=img.image_path,
                image_description=img.description,
                doc_id=img.doc_id,
                page=img.page,
                similarity=img.similarity,
            ))

    for idx, tbl in enumerate(tables):
        if idx not in referenced_tables:
            blocks.append(AnswerBlock(
                type="table",
                raw_table=tbl.raw_table,
                table_description=tbl.description,
                doc_id=tbl.doc_id,
                page=tbl.page,
                similarity=tbl.similarity,
            ))

    return blocks