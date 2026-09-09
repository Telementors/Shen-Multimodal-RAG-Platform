<p align="center">
  <img src="src/Shen_App/app/icon.png" alt="Shen Logo" width="120" />
</p>

<h1 align="center">Shen — Multimodal RAG Platform</h1>

<p align="center">
  <strong>An intelligent multimodal knowledge engine that indexes and retrieves across text, tables, and images with agentic routing.</strong>
</p>
---

## Table of Contents

- [Overview](#overview)
- [Why This Exists](#why-this-exists)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Ashen Era Archive — Demo Corpus](#ashen-era-archive--demo-corpus)
- [Evaluation](#evaluation)
- [Project Structure](#project-structure)
- [Design Decisions](#design-decisions)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)

---

## Overview

Shen is a retrieval-augmented generation (RAG) platform purpose-built for **technical documentation** — research papers, product manuals, datasheets, lore codexes, and any document where critical information lives in tables, figures, and diagrams rather than just prose.

Unlike standard text-only RAG pipelines that flatten everything into one undifferentiated index, Shen maintains **three separate vector indices** (text, table, image) and uses an **LLM-powered agentic router** to intelligently classify each query and search the right modality — then composes a rich, citation-backed answer with inline images and tables.

The platform supports **dual LLM backends**: run fully local and free with **Ollama** (llama3.2 + nomic-embed-text), or connect to **OpenAI** (gpt-4o-mini + text-embedding-3-small) for higher quality outputs.

---

## Why This Exists

Technical documents routinely combine prose, tables, and screenshots/diagrams. Text-only RAG pipelines either:

1. **Drop non-text content entirely** — losing tables, figures, and diagrams
2. **Convert everything into one index** — where tables and figures get drowned out by the much larger volume of narrative text

Shen solves this by keeping **three separate indices** and using an **LLM router** to decide, per query, whether the answer should come from text, a table, an image, or a combination — then composes a single answer citing the source document and page.

---

## Key Features

| Feature | Description |
|---|---|
| 🔀 **Agentic Query Router** | LLM classifies each query as `text`, `table`, `image`, or `hybrid` with reasoning transparency |
| 📊 **Multimodal Indexing** | Separate pgvector indices for text, tables, and images with HNSW cosine similarity |
| 🖼️ **Vision-First PDF Parsing** | 4-stage table extraction cascade: Vision LLM → Camelot → pdfplumber lines → pdfplumber default |
| 🎨 **Rich Answer Blocks** | Inline `[[IMAGE:N]]` and `[[TABLE:N]]` markers rendered as structured answer blocks |
| 📦 **Corpus Pre-Indexing** | Automatic background indexing of document corpora on startup |
| 🦙 **Dual LLM Backend** | Ollama (100% free, local) or OpenAI — switchable via environment variables |
| 📈 **Evaluation Harness** | Golden dataset with F1 scoring, route accuracy, and LLM-as-judge (0–5) |
| 🔍 **Langfuse Tracing** | Optional observability integration for query and indexing pipelines |
| 🐳 **One-Command Deployment** | Docker Compose with 4 services — database, Ollama, backend, frontend |
| 💬 **Chat Interface** | Modern dark-themed chat UI with conversation history (localStorage) |

---

## Architecture

```

```
<img width="802" height="2242" alt="Shen" src="https://github.com/user-attachments/assets/d6ce12d5-7003-40e0-991b-ad7adf574700" />

---

## How It Works

### Indexing Pipeline

```
PDF Upload ──▶ Unstructured Parser ──▶ Typed Blocks ──▶ Embedding ──▶ pgvector
                     │
                     ├── heading  ──▶ text_chunks
                     ├── text     ──▶ text_chunks
                     ├── table    ──▶ table_chunks  (with LLM/deterministic descriptions)
                     └── image    ──▶ image_chunks  (with vision model descriptions)
```

1. **PDF Parsing** — Uploaded PDFs are parsed page-by-page using `unstructured` into typed blocks (heading, text, table, image).
2. **Table Extraction** — A 4-stage vision-first cascade:
   - **Stage 1**: Vision LLM (GPT-4o / llama3.2) renders each page as PNG → extracts tables as JSON (handles LaTeX math, merged cells, multi-line headers)
   - **Stage 2**: Camelot lattice fallback for bordered tables
   - **Stage 3**: pdfplumber with line detection
   - **Stage 4**: pdfplumber default as last resort
3. **Image Extraction** — Two complementary strategies:
   - **Raster images**: Embedded image XObjects via PyMuPDF (`get_images()`)
   - **Vector figures**: matplotlib plots, architecture diagrams, flowcharts detected by clustering drawing paths and anchoring to captions; rendered to PNG via page crop
4. **Table Descriptions** — Table rows are converted into natural-language descriptions (LLM-summarised or deterministic formatting, configurable via `USE_LLM_TABLE_DESCRIPTIONS`)
5. **Embedding** — Each block is embedded (via `nomic-embed-text` / `text-embedding-3-small`) and stored in one of three Postgres tables, each indexed with HNSW for cosine similarity search

### Query Pipeline

```
User Question ──▶ Router Agent ──▶ Retriever ──▶ LLM Answer ──▶ Rich Response
                      │               │
                      ▼               ▼
               text / table /    cosine similarity
               image / hybrid    search (pgvector)
```

1. **Routing** — An LLM router classifies each incoming question into `text`, `table`, `image`, or `hybrid`, with a short reasoning string returned alongside the answer for transparency
2. **Retrieval** — The retriever searches the relevant table(s) using cosine similarity via pgvector. For `hybrid` queries, all three tables are searched and results are merged by similarity score
3. **Answer Generation** — An LLM composes the final answer with citations, embedding `[[IMAGE:N]]` and `[[TABLE:N]]` markers inline
4. **Rich Blocks** — The response is parsed into structured `AnswerBlock` objects (text / image / table) rendered in reading order. Un-referenced images/tables are auto-appended

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 16, React 19 | Tailwind CSS v4, shadcn/ui, Radix UI primitives |
| **Backend** | FastAPI, Uvicorn | Python 3.11, async-capable, Pydantic v2 schemas |
| **PDF Parsing** | unstructured, pdfplumber, PyMuPDF, Camelot | Vision-first cascade, raster + vector image extraction |
| **LLM (Local)** | Ollama | `llama3.2` (chat/routing/answer), `nomic-embed-text` (768-dim embeddings) |
| **LLM (Cloud)** | OpenAI | `gpt-4o-mini` (chat/routing/answer), `text-embedding-3-small` (1536-dim embeddings) |
| **Routing Agent** | LangChain | Structured output classification with JSON fallback parsing |
| **Vector Store** | PostgreSQL 16 + pgvector | HNSW indexing, cosine distance, 3 separate chunk tables |
| **Observability** | Langfuse | Optional tracing for query and indexing pipelines |
| **Deployment** | Docker Compose | 4 containers: postgres, ollama, backend, frontend |

---

## Getting Started

### Prerequisites

- **Docker Desktop** (with Compose v2)
- **~4 GB disk space** (for Ollama models + dependencies)
- **OpenAI API key** *(only if using OpenAI mode — Ollama mode requires no API key)*

### Quick Start with Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone <repo-url>
cd multimodal-rag-platform

# 2. Configure environment (Ollama mode is pre-configured — zero cost)
#    For OpenAI mode, copy and edit the env file:
cp src/Shen_RAG_Core/.env.example src/Shen_RAG_Core/.env
# Edit src/Shen_RAG_Core/.env if switching to OpenAI

# 3. Build and start all services
cd src
docker compose up --build
```

This builds and starts **four containers**:

| # | Container | Service | Port |
|---|---|---|---|
| 1 | `shen-rag-db` | PostgreSQL 16 + pgvector | `5432` |
| 2 | `shen-ollama` | Ollama LLM server | `11434` |
| 3 | `shen-rag-backend` | FastAPI backend | `8000` |
| 4 | `shen-app-frontend` | Next.js frontend | `3000` |

Plus a one-shot init container (`shen-ollama-init`) that automatically pulls required Ollama models (`nomic-embed-text` + `llama3.2`) on first run.

The database schema is created automatically on first run. The **Ashen Era Archive** corpus (included in the repo) is pre-indexed in a background thread on startup.

| Service | URL |
|---|---|
| 🌐 Frontend | [http://localhost:3000](http://localhost:3000) |
| 📡 Backend API Docs | [http://localhost:8000/docs](http://localhost:8000/docs) |
| ❤️ Health Check | [http://localhost:8000/health](http://localhost:8000/health) |
| 📊 Corpus Status | [http://localhost:8000/corpus/status](http://localhost:8000/corpus/status) |

Subsequent runs (no code changes) only need:

```bash
cd src
docker compose up
```

### Run Locally Without Docker

**Backend**

```bash
cd src/Shen_RAG_Core

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

Ensure a local PostgreSQL instance has the `vector` extension available, and Ollama is running locally (or set OpenAI credentials). Set `DATABASE_URL` in `.env` accordingly, then:

```bash
python -m uvicorn api.main:app --reload
```

**Frontend**

```bash
cd src/Shen_App
npm install
npm run dev
```

---

## Configuration

All configuration is managed through environment variables. See [`src/Shen_RAG_Core/.env.example`](./src/Shen_RAG_Core/.env.example) for the full reference.

### LLM Configuration (Ollama — Default, Free)

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | `ollama` | Set to `ollama` for local mode |
| `OPENAI_BASE_URL` | `http://ollama:11434/v1` | Ollama OpenAI-compatible endpoint |
| `OPENAI_EMBEDDING_MODEL` | `nomic-embed-text` | 768-dim embedding model |
| `EMBEDDING_DIMENSIONS` | `768` | Must match embedding model output |
| `OPENAI_ROUTER_MODEL` | `llama3.2` | Query classification model |
| `OPENAI_ANSWER_MODEL` | `llama3.2` | Answer generation model |
| `OPENAI_VISION_MODEL` | `llama3.2` | PDF image description model |
| `OPENAI_TABLE_DESCRIPTION_MODEL` | `llama3.2` | Table description model |

### LLM Configuration (OpenAI — Cloud)

| Variable | Value | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | `sk-your-key-here` | Your OpenAI API key |
| `OPENAI_BASE_URL` | *(remove or leave empty)* | Uses OpenAI default |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | 1536-dim embedding model |
| `EMBEDDING_DIMENSIONS` | `1536` | Must match embedding model output |
| `OPENAI_ROUTER_MODEL` | `gpt-4o-mini` | Query classification model |
| `OPENAI_ANSWER_MODEL` | `gpt-4o-mini` | Answer generation model |

### Database & API

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/multimodal_rag` | PostgreSQL connection string |
| `API_HOST` | `0.0.0.0` | Backend bind address |
| `API_PORT` | `8000` | Backend port |
| `API_RELOAD` | `true` | Auto-reload on code changes |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Allowed CORS origins |

### Parser & RAG

| Variable | Default | Purpose |
|---|---|---|
| `UNSTRUCTURED_STRATEGY` | `fast` | PDF parsing strategy (`fast` / `hi_res`) |
| `USE_LLM_TABLE_DESCRIPTIONS` | `false` | Toggle LLM table summarisation vs. deterministic formatting |
| `RAG_TOP_K` | `5` | Default number of chunks retrieved per query |
| `UPLOAD_DIR` | `data/uploads` | Directory for uploaded PDFs |

### Corpus Auto-Indexing

| Variable | Default | Purpose |
|---|---|---|
| `CORPUS_DIR` | `Ashen_Era_Data/Ashen_Era_Archive` | Path to document corpus for pre-indexing |
| `CORPUS_NAME` | `Ashen Era Archive` | Display name for the corpus |
| `CORPUS_CLEAN_ON_START` | `false` | If `true`, re-indexes all documents on startup |

### Observability (Optional)

| Variable | Default | Purpose |
|---|---|---|
| `LANGFUSE_PUBLIC_KEY` | *(empty)* | Langfuse public API key |
| `LANGFUSE_SECRET_KEY` | *(empty)* | Langfuse secret API key |
| `LANGFUSE_HOST` | `https://cloud.langfuse.com` | Langfuse host URL |

---

## API Reference

Full interactive documentation is available at [`/docs`](http://localhost:8000/docs) once the backend is running (Swagger UI).

| Endpoint | Method | Description |
|---|---|---|
| `/query` | `POST` | Ask a question — returns answer, rich answer blocks, route, reasoning, sources, images, and tables |
| `/index` | `POST` | Upload one or more PDFs for parsing and indexing (multipart form) |
| `/documents` | `GET` | List indexed documents with chunk counts per modality |
| `/corpus/status` | `GET` | Show corpus indexing status (documents indexed, chunk counts, corpus name) |
| `/health` | `GET` | Liveness check |
| `/images/{path}` | `GET` | Serve extracted images (static files) |
| `/` | `GET` | Redirects to `/docs` |

### Query Request / Response

**Request** (`POST /query`):
```json
{
  "query": "What is the central emblem on the banner of House Morvain?",
  "doc_id": null,
  "top_k": 5
}
```

**Response**:
```json
{
  "answer": "The banner of House Morvain features...",
  "answer_blocks": [
    { "type": "text", "content": "The banner of House Morvain features..." },
    { "type": "image", "image_path": "images/doc/figure.png", "image_description": "...", "doc_id": "...", "page": 3 },
    { "type": "table", "raw_table": "[[...]]", "table_description": "...", "doc_id": "...", "page": 5 }
  ],
  "route": "image",
  "reasoning": "The query asks about a visual emblem, which is best found in image chunks.",
  "sources": [...],
  "images": [...],
  "tables": [...]
}
```

---

## Ashen Era Archive — Demo Corpus

The platform ships with a built-in demo corpus: the **Ashen Era Archive** — an entirely fictional fantasy franchise created for the SLIIT Codefest 2026 AI Competition. The corpus includes **341 files** across 5 categories:

| Category | Directory | Description | Files |
|---|---|---|---|
| 📜 Chronicles | `chronicles/` | Narrative novels (PDF/DOCX), long chapters | Multi-chapter lore |
| 📖 Codex | `codex/` | Official lore codexes and annals with plates | Structured references |
| 📰 Ephemera | `ephemera/` | In-world letters, ledgers, transcripts | Mixed formats, scanned pages |
| 📚 Wiki | `wiki/` | Fan-wiki articles (Markdown) with images | Encyclopedic entries |
| 🖼️ Images | `images/` | Standalone figure plates | Visual assets |

The corpus is **automatically indexed on first startup** via the pre-indexing system (background thread). Indexing status can be monitored at `/corpus/status`.

> ⚠️ **Note**: In-world authors in the ephemera section are _not always reliable_ — this is by design to test the RAG system's ability to handle conflicting sources.

---

## Evaluation

A golden-dataset evaluation harness lives in [`src/Shen_RAG_Core/evaluation/`](./src/Shen_RAG_Core/evaluation/). It runs a curated set of question/answer pairs — spanning text-, table-, and image-routed queries across the Ashen Era Archive — against the live `/query` endpoint.

### Metrics

| Metric | Description |
|---|---|
| **Token-Overlap F1** | Precision/recall harmonic mean on token overlap between predicted and reference answers |
| **Route Accuracy** | Whether the router classified the query to the correct modality |
| **LLM-as-Judge** | An LLM scores each response on a 0–5 scale (optional, via `--llm-judge` flag) |

### Running the Evaluation

```bash
cd src/Shen_RAG_Core

# Run all questions
python evaluation/evaluate.py

# With LLM-as-judge scoring
python evaluation/evaluate.py --llm-judge

# Filter by document
python evaluation/evaluate.py --doc-id codex_vaeloria_ii_armory_of_relics_and_bestiary

# Limit number of questions
python evaluation/evaluate.py --limit 10 --top-k 5
```

Reports are output to `evaluation/reports/` in both Markdown and JSON format.

---

## Project Structure

```
multimodal-rag-platform/
├── README.md                              # This file
├── submission_report.pdf                  # Project submission report
│
├── docs/                                  # Documentation
│   ├── architecture.md                    # System architecture overview
│   ├── decisions.md                       # Design decision rationale
│   ├── limitations.md                     # Known limitations & planned improvements
│   └── diagrams/                          # Architecture diagrams
│
├── ai_usage/                              # AI usage disclosure
│   ├── ai-usage-disclosure.md
│   ├── claude.md
│   ├── context.md
│   └── skills
│
├── configuration-example/                 # Example configuration files
│
└── src/
    ├── docker-compose.yml                 # 4-service orchestration (pg, ollama, backend, frontend)
    │
    ├── Shen_RAG_Core/                     # ── Python Backend ─────────────────────
    │   ├── Dockerfile                     # Python 3.11-slim + system deps
    │   ├── requirements.txt               # 20 Python dependencies
    │   ├── .env                           # Active environment configuration
    │   ├── .env.example                   # Configuration reference template
    │   │
    │   ├── api/                           # FastAPI application layer
    │   │   ├── main.py                    # App setup, routes, CORS, startup hooks
    │   │   ├── schemas.py                 # Pydantic request/response models (9 schemas)
    │   │   ├── services.py                # Business logic (QueryService, IndexService, DocumentService)
    │   │   └── config.py                  # API-layer settings aliases
    │   │
    │   ├── agent/                         # Agentic query routing
    │   │   └── router_agent.py            # LangChain router (classify → retrieve → compose)
    │   │
    │   ├── parser/                        # PDF document parsing
    │   │   ├── pdf_parser.py              # 1218-line vision-first parsing engine
    │   │   └── types.py                   # ParsedBlock TypedDict (heading/text/table/image)
    │   │
    │   ├── indexer/                       # Vector embedding & storage
    │   │   ├── pgvector_indexer.py         # Embed + batch insert into pgvector tables
    │   │   └── schema.sql                 # Database schema (3 tables, HNSW indices)
    │   │
    │   ├── retriever/                     # Similarity search
    │   │   └── pgvector_retriever.py      # Cosine search, hybrid merge, document listing
    │   │
    │   ├── config/                        # Configuration management
    │   │   └── settings.py                # Settings class (env vars → typed attributes)
    │   │
    │   ├── corpus/                        # Corpus pre-indexing system
    │   │   └── pre_index.py               # Auto-index corpus on startup (idempotent, batched)
    │   │
    │   ├── evaluation/                    # Evaluation framework
    │   │   ├── evaluate.py                # Evaluation harness (F1, route accuracy, LLM judge)
    │   │   ├── golden_dataset.json        # Curated Q&A pairs across all modalities
    │   │   └── reports/                   # Generated evaluation reports
    │   │
    │   ├── scripts/                       # Utility scripts
    │   │   └── init_db.py                 # Database initialization
    │   │
    │   ├── Ashen_Era_Data/                # Demo corpus (Ashen Era Archive)
    │   │   └── Ashen_Era_Archive/         # 341 files across 5 categories
    │   │       ├── chronicles/            # Narrative novels
    │   │       ├── codex/                 # Official lore codexes
    │   │       ├── ephemera/              # In-world documents
    │   │       ├── wiki/                  # Fan-wiki articles
    │   │       └── images/                # Standalone figure plates
    │   │
    │   └── data/                          # Runtime data directories
    │       ├── uploads/                   # Uploaded PDF storage
    │       └── images/                    # Extracted image storage
    │
    └── Shen_App/                          # ── Next.js Frontend ──────────────────
        ├── Dockerfile                     # Multi-stage build (node:20)
        ├── package.json                   # 40+ dependencies (React 19, Next.js 16)
        ├── next.config.mjs                # Next.js configuration
        ├── tsconfig.json                  # TypeScript configuration
        │
        ├── app/                           # Next.js App Router
        │   ├── layout.tsx                 # Root layout (Inter font, dark mode)
        │   ├── page.tsx                   # Main chat interface (329 lines)
        │   ├── globals.css                # Global styles & design tokens
        │   ├── icon.png                   # App icon
        │   └── about/                     # About page
        │       └── page.tsx
        │
        ├── components/
        │   ├── shen/                      # App-specific components
        │   │   ├── sidebar.tsx            # Navigation sidebar with chat history
        │   │   ├── chat-message.tsx        # Message renderer (text + rich blocks)
        │   │   ├── chat-input.tsx         # Input with file upload support
        │   │   ├── welcome-view.tsx       # Landing page with quick-start prompts
        │   │   └── thinking-indicator.tsx # Loading animation
        │   └── ui/                        # shadcn/ui component library
        │
        ├── hooks/
        │   └── useRAG.ts                  # React hooks (useQuery, useDocuments, useHealth, useIndexFiles)
        │
        └── lib/
            ├── ragService.ts              # API client (query, index, documents, health, corpus)
            └── utils.ts                   # Utility functions (cn)
```

---

## Design Decisions

### 1. Separate Indices per Modality
Maintain three separate pgvector indices (text, table, image) instead of a single merged index. Technical documents combine prose, tables, and diagrams — a single index causes tables and figures to be drowned out by narrative text. Separate indices ensure each modality gets fair representation during retrieval.

### 2. LLM Router vs. Keyword Heuristics
Use an LLM-based router agent with reasoning transparency rather than keyword-based heuristics. Keyword heuristics are brittle and fail on ambiguous queries. The LLM router understands query intent and context, with a JSON fallback parser for robustness with smaller local models.

### 3. Dual LLM Backend (Ollama + OpenAI)
Support both fully-local (Ollama, zero cost) and cloud (OpenAI) backends via an OpenAI-compatible API interface. Switching requires only environment variable changes — no code modifications.

### 4. PostgreSQL + pgvector over Dedicated Vector DB
Use PostgreSQL with pgvector instead of Pinecone/Weaviate/etc. Simplifies deployment (single database), reduces infrastructure complexity, and HNSW indexing provides competitive performance at moderate scale.

### 5. Vision-First Table Extraction
A 4-stage cascade ensures maximum table extraction quality while handling edge cases (LaTeX math, merged cells) that traditional parsers miss. Rate limiting with exponential backoff guarantees no pages are skipped.

### 6. Rich Answer Blocks
Structured `AnswerBlock` responses allow the frontend to render inline images and tables in reading order, rather than dumping all media at the end. Auto-append logic ensures retrieved media always appears even if the LLM omits markers.

For detailed rationale and trade-offs, see [`docs/decisions.md`](./docs/decisions.md).

---

## Known Limitations

| Area | Limitation |
|---|---|
| **Input Format** | Currently PDF-only; no DOCX/PPTX support (DOCX files in corpus are read but PDF parsing is primary) |
| **Scale** | Designed for moderate collections (hundreds of documents); HNSW may degrade at millions of vectors |
| **Language** | Primarily optimized for English-language documents |
| **Hybrid Latency** | Hybrid queries search all 3 tables sequentially; no result caching |
| **Image Understanding** | Image chunks rely on LLM vision descriptions; complex diagrams with minimal text may not be well-indexed |
| **Local LLM Quality** | Ollama/llama3.2 produces lower quality answers than GPT-4o-mini; trade-off for zero cost |

For the full limitations document, see [`docs/limitations.md`](./docs/limitations.md).

---

<p align="center">
  Built for the <strong>SLIIT Codefest 2026 — AI Competition</strong><br/>
  <sub>Powered by FastAPI · Next.js · pgvector · Ollama · LangChain</sub>
</p>
