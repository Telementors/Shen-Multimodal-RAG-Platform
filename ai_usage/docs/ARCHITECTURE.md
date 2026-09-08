# Architecture

## Goal

Keep the multimodal RAG pipeline modular so ingestion, retrieval, and generation can evolve independently.

## Core Pipeline

### Indexing Path

Source Document
→ Ingestion
→ Content Detection
→ Chunking
→ Representation
→ Embedding
→ Vector Index

### Query Path

User Question
→ Query Validation
→ Query Representation
→ Candidate Retrieval
→ Metadata Filtering
→ Reranking
→ Context Builder
→ LLM
→ Response

## Main Responsibilities

### Ingestion Layer
Accepts supported files, validates them, extracts pages/assets/metadata, and identifies content types.

### Chunking Layer
Creates meaningful retrieval units while preserving document structure and source references.

### Embedding Layer
Converts retrievable representations into vectors. It does not answer questions.

### Vector Store
Stores vector records and metadata needed for retrieval and filtering.

### Retrieval Layer
Finds candidate evidence for a query.

### Reranking Layer
Reorders candidates using a stronger relevance signal than raw vector similarity alone.

### Context Builder
Selects the best evidence under the model token budget and preserves citation references.

### Generation Layer
Uses only the final evidence package and user question to generate the answer.

## Multimodal Flow

PDF / Image
├── Text → Text chunks
├── Table → Structured table representation
├── Diagram → Visual asset + caption + nearby text
└── Image → Visual asset + caption/description + nearby text

All retrievable items must retain:
- document ID
- page number
- content type
- asset/chunk ID
- source filename
- parent heading when available

## Boundary Rules

- Ingestion must not perform final answer generation.
- Chunking must not call the user-facing LLM.
- Embedding must not mutate source meaning.
- Retrieval must not directly compose the final answer.
- Generation must not perform its own undocumented retrieval.
- Shared contracts must not be redefined differently in separate modules.

## Recommended Deployment Shape

Start as a modular monolith unless scaling pressure proves a need for separate services.

Suggested modules:
- ingestion
- parsing
- chunking
- embeddings
- retrieval
- reranking
- context
- generation
- storage
- API

Split services only when there is a measurable need such as:
- independent scaling
- separate GPU workloads
- queue-based ingestion
- fault isolation
- security boundary

## Performance Philosophy

Optimize in this order:

1. Correct retrieval
2. Small relevant context
3. Reduced redundant model calls
4. Cached stable computations
5. Parallelizable preprocessing
6. Infrastructure scaling

Do not trade away source traceability for speed.
