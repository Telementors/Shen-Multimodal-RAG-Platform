# Design Decisions

## 1. Separate Indices per Modality

**Decision:** Maintain three separate pgvector indices (text, table, image) instead of a single merged index.

**Rationale:** Technical documents combine prose, tables, and diagrams. A single undifferentiated index causes tables and figures to be drowned out by the larger volume of narrative text. Separate indices ensure each modality gets fair representation during retrieval.

**Trade-off:** Slightly more complex query routing, but significantly better retrieval quality for non-text modalities.

## 2. LLM Router vs. Keyword Heuristics

**Decision:** Use an LLM-based router agent to classify incoming queries by modality rather than keyword-based heuristics.

**Rationale:** Keyword heuristics are brittle and fail on ambiguous queries. An LLM router can understand query intent and context, providing more accurate routing with reasoning transparency. A JSON fallback parser ensures robustness with smaller local models (e.g., llama3.2).

**Trade-off:** Additional latency per query (~200-500ms for router call), but improved accuracy justifies the cost.

## 3. Dual LLM Backend (Ollama + OpenAI)

**Decision:** Support both fully-local Ollama (zero cost) and cloud-based OpenAI backends via an OpenAI-compatible API interface.

**Rationale:** Enables the platform to run entirely free and offline using Ollama with `llama3.2` + `nomic-embed-text`, while also supporting higher-quality outputs with OpenAI's `gpt-4o-mini` + `text-embedding-3-small`. Switching requires only environment variable changes — no code modifications.

**Trade-off:** Local models (llama3.2) produce lower quality answers than GPT-4o-mini, but the zero-cost option makes it accessible without API keys or internet access.

## 4. PostgreSQL + pgvector over Dedicated Vector DB

**Decision:** Use PostgreSQL with the pgvector extension instead of a dedicated vector database (Pinecone, Weaviate, etc.).

**Rationale:** Simplifies deployment (single database for both relational data and vectors), reduces infrastructure complexity, and pgvector with HNSW indexing provides competitive performance for our scale.

## 5. Vision-First Table Extraction Cascade

**Decision:** Implement a 4-stage table extraction cascade: Vision LLM → Camelot → pdfplumber lines → pdfplumber default.

**Rationale:** Traditional table extraction tools fail on complex tables with LaTeX math, merged cells, and multi-line headers. A vision LLM approach (rendering pages as PNG and extracting tables as JSON) handles these edge cases effectively. Fallback stages with rate limiting and exponential backoff guarantee no pages are skipped.

**Trade-off:** Higher latency for initial indexing, but significantly better table extraction quality.

## 6. Rich Answer Blocks

**Decision:** Use structured `AnswerBlock` responses with inline `[[IMAGE:N]]` and `[[TABLE:N]]` markers rather than appending all media at the end.

**Rationale:** Allows the frontend to render inline images and tables in reading order, creating a more natural and contextual answer presentation. Auto-append logic ensures retrieved media always appears even if the LLM omits markers.

## 7. Next.js Frontend with shadcn/ui

**Decision:** Use Next.js 16 with shadcn/ui component library for the frontend.

**Rationale:** Next.js provides excellent developer experience with server-side rendering capabilities. shadcn/ui offers accessible, customizable components built on Radix UI primitives. Tailwind CSS v4 provides the styling system.

## 8. Docker Compose Deployment

**Decision:** Use Docker Compose for local development and deployment with 4 services (PostgreSQL, Ollama, backend, frontend).

**Rationale:** Simplifies the multi-service setup into a single command, ensuring consistent environments. A one-shot init container automatically pulls required Ollama models on first run.

## 9. Corpus Pre-Indexing on Startup

**Decision:** Automatically index the demo corpus (Ashen Era Archive) in a background thread on first startup.

**Rationale:** Provides an immediate out-of-the-box demo experience without requiring manual document upload. Idempotent indexing ensures documents are not re-processed on subsequent startups.
