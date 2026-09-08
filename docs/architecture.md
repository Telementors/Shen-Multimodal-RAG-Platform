# Architecture

## System Overview

Shen is a multimodal RAG (Retrieval-Augmented Generation) platform designed for technical documentation that indexes and retrieves across **text, tables, and images** separately. It supports **dual LLM backends** — fully local with Ollama (zero cost) or cloud-based with OpenAI — switchable via environment variables.

## Architecture Diagram

```
User Browser (http://localhost:3000)
     |
     v
Shen_App (Next.js 16 / React 19, port 3000)
  Tailwind CSS v4 · shadcn/ui · Radix Primitives
  ├── Sidebar, ChatInput, ChatMessage, AnswerBlocks
  ├── WelcomeView, ThinkingIndicator
  └── hooks/useRAG.ts → lib/ragService.ts
     |
     | REST API (JSON)
     v
Shen_RAG_Core – FastAPI backend (port 8000)
     |
     v
Services layer (QueryService / IndexService / DocumentService)
     |
     +---------------------------+
     |  on upload                |  on query
     v                           v
PDF parser (1218 lines)     Router agent (LangChain structured output)
  ├─ Vision LLM table          ├─ classify → text/table/image/hybrid
  │  extraction                 ├─ retrieve (cosine similarity)
  ├─ Camelot lattice fallback   └─ compose answer with citations
  ├─ pdfplumber lines fallback
  ├─ pdfplumber default
  ├─ Raster image extraction
  └─ Vector figure detection
     |                           |
     v                           v
pgvector indexer            pgvector retriever (cosine search)
  (embed + batch insert)      (search + hybrid merge)
     |                           |
     +------------+--------------+
                  v
       PostgreSQL 16 + pgvector
   (text_chunks / table_chunks / image_chunks)
   Each table: doc_id, page_num, content, metadata, embedding (HNSW)
                  |
        +---------+---------+-----------+
        v                   v           v
   Ollama Server       OpenAI API    Langfuse
  (llama3.2 +         (gpt-4o-mini + (tracing,
   nomic-embed-text)   text-embed-    optional)
                       3-small)
```

## Components

### Shen_RAG_Core (Backend)
- **api/**: FastAPI application, routes, Pydantic v2 schemas, services (QueryService, IndexService, DocumentService)
- **agent/**: LangChain-based router agent for query classification (text/table/image/hybrid) with JSON fallback parsing
- **parser/**: PDF parsing engine (1218 lines) — vision-first 4-stage table extraction cascade, raster + vector image extraction
- **indexer/**: Embedding + pgvector batch storage, schema.sql with HNSW indices
- **retriever/**: pgvector cosine similarity search, hybrid merge, document listing
- **config/**: Settings class (env vars → typed attributes)
- **corpus/**: Pre-indexing system — auto-indexes document corpora on startup (idempotent, batched, background thread)
- **evaluation/**: Golden dataset + evaluation harness (F1, route accuracy, LLM-as-judge)
- **scripts/**: Database initialization utilities

### Shen_App (Frontend)
- **app/**: Next.js App Router pages (chat interface, about page)
- **components/shen/**: App-specific components (sidebar, chat-message with rich answer blocks, chat-input with file upload, welcome-view, thinking-indicator)
- **components/ui/**: shadcn/ui component library (Radix UI primitives)
- **hooks/**: Custom React hooks (useQuery, useDocuments, useHealth, useIndexFiles)
- **lib/**: API client (ragService.ts) and utilities

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, Radix UI primitives |
| Backend | FastAPI, Uvicorn, Python 3.11, Pydantic v2 |
| Parsing | unstructured, pdfplumber, PyMuPDF, Camelot (vision-first 4-stage cascade) |
| LLM (Local) | Ollama — `llama3.2` (chat/routing/answer), `nomic-embed-text` (768-dim embeddings) |
| LLM (Cloud) | OpenAI — `gpt-4o-mini` (chat/routing/answer), `text-embedding-3-small` (1536-dim embeddings) |
| Routing agent | LangChain structured output with JSON fallback parsing |
| Vector store | PostgreSQL 16 + pgvector (HNSW indexing, cosine distance, 3 separate chunk tables) |
| Observability | Langfuse (optional) |
| Deployment | Docker Compose (4 containers: postgres, ollama, backend, frontend) |

## Data Flow

### Indexing Pipeline
1. User uploads PDF via frontend
2. Backend parses PDF page-by-page using `unstructured` into typed blocks (heading, text, table, image)
3. **Table Extraction** — 4-stage vision-first cascade:
   - Stage 1: Vision LLM renders each page as PNG → extracts tables as JSON (handles LaTeX math, merged cells)
   - Stage 2: Camelot lattice fallback for bordered tables
   - Stage 3: pdfplumber with line detection
   - Stage 4: pdfplumber default as last resort
4. **Image Extraction** — Two complementary strategies:
   - Raster images: Embedded image XObjects via PyMuPDF
   - Vector figures: matplotlib plots, architecture diagrams, flowcharts detected by clustering drawing paths
5. Table rows are converted into natural-language descriptions (LLM-summarised or deterministic formatting, configurable)
6. Each block is embedded (via `nomic-embed-text` / `text-embedding-3-small`) and stored in one of three Postgres tables (text_chunks, table_chunks, image_chunks)

### Query Pipeline
1. User submits a question
2. LLM router classifies query into `text`, `table`, `image`, or `hybrid` with reasoning transparency
3. Retriever searches the relevant table(s) using cosine similarity via pgvector
4. For `hybrid` queries, all three tables are searched and results merged by similarity score
5. LLM composes the final answer with citations, embedding `[[IMAGE:N]]` and `[[TABLE:N]]` markers inline
6. Response is parsed into structured `AnswerBlock` objects (text / image / table) rendered in reading order

### Corpus Pre-Indexing
- On first startup, the **Ashen Era Archive** corpus (included in the repo) is automatically indexed in a background thread
- Indexing is idempotent — documents are not re-indexed if already present
- Status can be monitored via `/corpus/status` endpoint
