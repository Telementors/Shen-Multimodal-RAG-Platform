# Embedding

## Purpose

Create vector representations used for retrieval.

## Input

A valid `Chunk` or a derived searchable representation.

## Output

An `EmbeddingRecord` linked back to the original chunk.

## Text

Embed the semantic chunk content.

## Tables

Preferred options:
- structured textual serialization preserving headers and relationships
- table-aware representation if supported

Do not flatten a table so aggressively that row/column meaning is lost.

## Visuals

Possible strategies:

### Strategy A — Caption/Description Embedding
Visual
→ grounded caption/description
→ text embedding

Simple and broadly supported.

### Strategy B — Multimodal Embedding
Visual
→ multimodal encoder
→ shared vector space

Use only when the chosen model and vector strategy support compatible query retrieval.

## Rules

- preserve chunk ID and metadata
- do not mutate source meaning
- do not generate the final answer
- do not hide provider-specific failures
- do not mix incompatible vector dimensions in one index unless explicitly supported

## Batching

Batch embedding requests when supported to reduce latency and cost.

Batch size must respect provider and memory limits.

## Caching

Stable chunks may cache embeddings using a key derived from:
- content hash
- embedding model version
- representation version

Changing the embedding model should invalidate incompatible cached embeddings.
