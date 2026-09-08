# AI Usage Disclosure

## Project: Shen — Multimodal RAG Platform

### AI Tools Used

| Tool | Purpose | Extent of Use |
|---|---|---|
| GitHub Copilot | Code completion and suggestions | Used for boilerplate code generation and code suggestions during development |
| Claude (Anthropic) | Architecture design, debugging, code review | Used for discussing design decisions, debugging complex issues, and reviewing code quality |
| ChatGPT (OpenAI) | Research and documentation | Used for researching best practices and generating initial documentation drafts |
| Google Gemini / Antigravity IDE | Code development, debugging, documentation | Used for code editing, project structure refinement, and documentation updates |

### AI-Generated Code

- AI tools were used as assistants during the development process
- All AI-generated code was reviewed, tested, and modified as needed
- The core architecture and design decisions were made by the developer
- AI suggestions were critically evaluated before incorporation

### AI as Part of the Product

- The platform supports **dual LLM backends** for its RAG pipeline:
  - **Ollama (Local, Free)**:
    - **Embeddings**: `nomic-embed-text` for 768-dimensional document chunk embeddings
    - **LLM Router**: `llama3.2` for query classification (text/table/image/hybrid)
    - **Answer Generation**: `llama3.2` for composing answers with citations
    - **Vision**: `llama3.2` for PDF page image description and table extraction
    - **Table Descriptions**: `llama3.2` for table summarisation
  - **OpenAI (Cloud)**:
    - **Embeddings**: `text-embedding-3-small` for 1536-dimensional document chunk embeddings
    - **LLM Router**: `gpt-4o-mini` for query classification
    - **Answer Generation**: `gpt-4o-mini` for composing answers with citations
    - **Table Descriptions**: Optional LLM-based table summarisation

### Transparency

This disclosure is provided in the interest of academic integrity and transparency regarding the use of AI tools in this project.
