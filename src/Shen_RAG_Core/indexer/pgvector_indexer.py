"""Embed and store parsed blocks into pgvector tables (text, table, image)."""

from __future__ import annotations

import json
import logging
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg2
from pgvector.psycopg2 import register_vector
from psycopg2.extensions import connection as PsycopgConnection
from openai import OpenAI

from config import settings
from parser.types import ParsedBlock

logger = logging.getLogger(__name__)

# ── Module-level constants (re-exported by indexer.__init__) ─────────────
EMBEDDING_MODEL: str = settings.openai_embedding_model  # e.g. "text-embedding-3-small"
EMBEDDING_DIMENSIONS: int = settings.embedding_dimensions  # e.g. 1536

# Mapping from ParsedBlock.type → database table name
_TABLE_MAP: dict[str, str] = {
    "text": "text_chunks",
    "heading": "text_chunks",  # headings are stored as text chunks
    "table": "table_chunks",
    "image": "image_chunks",
}

# ── SQL used by ensure_schema() ──────────────────────────────────────────
_SCHEMA_SQL = f"""
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS text_chunks (
    id          BIGSERIAL PRIMARY KEY,
    doc_id      TEXT        NOT NULL,
    page_num    INTEGER     NOT NULL,
    content     TEXT        NOT NULL,
    metadata    JSONB       DEFAULT '{{}}'::jsonb,
    embedding   vector({EMBEDDING_DIMENSIONS}),
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_text_chunks_doc_id     ON text_chunks (doc_id);
CREATE INDEX IF NOT EXISTS idx_text_chunks_embedding  ON text_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS table_chunks (
    id          BIGSERIAL PRIMARY KEY,
    doc_id      TEXT        NOT NULL,
    page_num    INTEGER     NOT NULL,
    content     TEXT        NOT NULL,
    metadata    JSONB       DEFAULT '{{}}'::jsonb,
    embedding   vector({EMBEDDING_DIMENSIONS}),
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_table_chunks_doc_id    ON table_chunks (doc_id);
CREATE INDEX IF NOT EXISTS idx_table_chunks_embedding ON table_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS image_chunks (
    id          BIGSERIAL PRIMARY KEY,
    doc_id      TEXT        NOT NULL,
    page_num    INTEGER     NOT NULL,
    content     TEXT        NOT NULL,
    metadata    JSONB       DEFAULT '{{}}'::jsonb,
    embedding   vector({EMBEDDING_DIMENSIONS}),
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_image_chunks_doc_id    ON image_chunks (doc_id);
CREATE INDEX IF NOT EXISTS idx_image_chunks_embedding ON image_chunks USING hnsw (embedding vector_cosine_ops);
"""


class PGVectorIndexer:
    """Embed text with OpenAI and store chunks in pgvector tables."""

    def __init__(
        self,
        database_url: str | None = None,
        *,
        openai_client: OpenAI | None = None,
    ) -> None:
        self.database_url: str = database_url or settings.database_url or ""
        self._openai = openai_client or OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )

    # ── Connection helper ────────────────────────────────────────────────
    @contextmanager
    def _connection(self) -> Iterator[PsycopgConnection]:
        conn = psycopg2.connect(self.database_url)
        register_vector(conn)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    # ── Schema bootstrap ─────────────────────────────────────────────────
    def ensure_schema(self) -> None:
        """Create tables and indexes if they don't exist yet."""
        with self._connection() as conn:
            with conn.cursor() as cur:
                cur.execute(_SCHEMA_SQL)
        logger.info("Database schema ensured.")

    # ── Embedding ────────────────────────────────────────────────────────
    def embed_text(self, text: str) -> list[float]:
        """Return an embedding vector for a single text string."""
        response = self._openai.embeddings.create(
            input=text,
            model=EMBEDDING_MODEL,
        )
        return response.data[0].embedding

    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts in one API call (max ~8 K tokens each)."""
        if not texts:
            return []
        response = self._openai.embeddings.create(
            input=texts,
            model=EMBEDDING_MODEL,
        )
        # Responses may come back in arbitrary order; sort by index
        sorted_data = sorted(response.data, key=lambda d: d.index)
        return [d.embedding for d in sorted_data]

    # ── Indexing ─────────────────────────────────────────────────────────
    def index_blocks(
        self,
        blocks: list[ParsedBlock],
        *,
        replace_document: bool = True,
    ) -> dict[str, int]:
        """
        Embed and insert a list of ParsedBlocks into the appropriate tables.

        If *replace_document* is True the existing rows for each doc_id are
        deleted before insertion (upsert-style).

        Returns a dict with counts per chunk type, e.g.
        ``{"text": 12, "table": 3, "image": 2}``.
        """
        if not blocks:
            return {}

        # Group blocks by table
        by_table: dict[str, list[ParsedBlock]] = {}
        for block in blocks:
            table_name = _TABLE_MAP.get(block["type"], "text_chunks")
            by_table.setdefault(table_name, []).append(block)

        # Embed all content at once
        all_texts = [b["content"] for b in blocks]
        all_embeddings = self._embed_batch(all_texts)

        # Create a mapping from block index → embedding
        emb_map: dict[int, list[float]] = {
            id(b): e for b, e in zip(blocks, all_embeddings)
        }

        counts: dict[str, int] = {}
        doc_ids_cleaned: set[str] = set()

        with self._connection() as conn:
            with conn.cursor() as cur:
                for table_name, table_blocks in by_table.items():
                    # Delete existing rows for this document if requested
                    if replace_document:
                        for block in table_blocks:
                            if block["doc_id"] not in doc_ids_cleaned:
                                cur.execute(
                                    f"DELETE FROM {table_name} WHERE doc_id = %s",
                                    (block["doc_id"],),
                                )
                                doc_ids_cleaned.add(block["doc_id"])

                    for block in table_blocks:
                        embedding = emb_map[id(block)]
                        metadata_json = json.dumps(block.get("metadata") or {})
                        cur.execute(
                            f"""
                            INSERT INTO {table_name}
                                (doc_id, page_num, content, metadata, embedding)
                            VALUES (%s, %s, %s, %s::jsonb, %s::vector)
                            """,
                            (
                                block["doc_id"],
                                block["page"],
                                block["content"],
                                metadata_json,
                                str(embedding),
                            ),
                        )

                    # Track count using the friendly type name
                    friendly = {
                        "text_chunks": "text",
                        "table_chunks": "table",
                        "image_chunks": "image",
                    }.get(table_name, table_name)
                    counts[friendly] = len(table_blocks)

        logger.info("Indexed %d blocks across %s", len(blocks), list(counts.keys()))
        return counts


def index_parsed_blocks(
    blocks: list[ParsedBlock],
    *,
    database_url: str | None = None,
    replace_document: bool = True,
) -> dict[str, int]:
    """Convenience function: embed and store blocks in one call."""
    indexer = PGVectorIndexer(database_url=database_url)
    return indexer.index_blocks(blocks, replace_document=replace_document)
