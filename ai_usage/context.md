# Context

## Project Context

### Problem Statement
Technical documents (research papers, product manuals, datasheets) routinely combine prose, tables, and screenshots/diagrams. Traditional text-only RAG pipelines either drop non-text content entirely or convert everything into one undifferentiated index, where tables and figures get drowned out by the much larger volume of narrative text.

### Solution
Shen is a multimodal RAG platform that keeps three separate indices (text, table, image) and uses an LLM router to decide, per query, whether the answer should come from text, a table, an image, or a combination — then composes a single answer citing the source document and page. The platform supports dual LLM backends: fully local and free with Ollama (`llama3.2` + `nomic-embed-text`), or cloud-based with OpenAI (`gpt-4o-mini` + `text-embedding-3-small`) for higher quality outputs.

### Key Technical Highlights
- **Vision-first table extraction**: 4-stage cascade (Vision LLM → Camelot → pdfplumber lines → pdfplumber default) handles LaTeX math, merged cells, and complex tables
- **Rich answer blocks**: Structured `AnswerBlock` responses with inline `[[IMAGE:N]]` and `[[TABLE:N]]` markers rendered in reading order
- **Agentic routing**: LangChain-based query classification with reasoning transparency and JSON fallback parsing
- **Corpus pre-indexing**: Automatic background indexing of document corpora on startup

### Target Users
- Researchers working with technical papers
- Engineers referencing product manuals and datasheets
- Anyone who needs to query across mixed-modality documents

### Academic Context
This project was developed as part of the **SLIIT Codefest 2026 — AI Competition** to demonstrate:
- Understanding of RAG architectures
- Ability to handle multimodal data
- Full-stack development skills (FastAPI + Next.js)
- System design and deployment knowledge (Docker Compose)
- Dual LLM backend support (local + cloud)

### Dataset
The platform ships with the **Ashen Era Archive** demo corpus — an entirely fictional fantasy franchise created for the competition. The corpus includes 341 files across 5 categories (chronicles, codex, ephemera, wiki, images), containing documents that showcase text, table, and image retrieval capabilities. The corpus is automatically indexed on first startup via the pre-indexing system.
