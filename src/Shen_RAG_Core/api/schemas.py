"""Pydantic request/response models for the HTTP API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    doc_id: str | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class SourceItem(BaseModel):
    doc_id: str
    page: int
    type: str
    similarity: float
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class TableItem(BaseModel):
    doc_id: str
    page: int
    similarity: float
    description: str
    raw_table: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ImageItem(BaseModel):
    doc_id: str
    page: int
    similarity: float
    description: str
    image_path: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnswerBlock(BaseModel):
    """Rich inline answer block — text, image, or table rendered in reading order."""

    type: Literal["text", "image", "table"]
    content: str | None = None           # text blocks
    image_path: str | None = None        # image blocks — served via /images/
    image_description: str | None = None
    raw_table: str | None = None         # JSON string — [[row1], [row2], ...]
    table_description: str | None = None
    doc_id: str | None = None
    page: int | None = None
    similarity: float | None = None
    corpus_type: str | None = None       # "chronicle" | "codex" | "wiki" | "ephemera"


class QueryResponse(BaseModel):
    answer: str                          # plain text fallback
    answer_blocks: list[AnswerBlock] = Field(default_factory=list)  # rich inline blocks
    route: str
    reasoning: str = ""
    sources: list[SourceItem]
    images: list[ImageItem]
    tables: list[TableItem]


class DocumentInfo(BaseModel):
    doc_id: str
    text_chunks: int
    table_chunks: int
    image_chunks: int
    last_indexed_at: str | None = None


class DocumentsResponse(BaseModel):
    documents: list[DocumentInfo]


class IndexResult(BaseModel):
    doc_id: str
    filename: str
    counts: dict[str, int]


class IndexResponse(BaseModel):
    indexed: list[IndexResult]