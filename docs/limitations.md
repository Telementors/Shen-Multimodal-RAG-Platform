# Limitations

## Current Limitations

### 1. PDF-Only Input
- Currently only supports PDF document uploads as the primary format
- No support for Word documents, PowerPoint, or other formats
- Scanned PDFs with poor OCR quality may produce degraded results
- DOCX files in the corpus are read but PDF parsing is the primary pipeline

### 2. LLM Dependency
- Requires either a running Ollama instance (local mode) or an active OpenAI API key (cloud mode) with internet connection
- Query quality is dependent on the chosen LLM model's performance
- API rate limits may affect throughput under heavy load (OpenAI mode)

### 3. Local LLM Quality
- Ollama with llama3.2 produces lower quality answers compared to GPT-4o-mini
- Trade-off for zero cost and offline capability
- Smaller local embedding models (nomic-embed-text, 768-dim) vs. OpenAI embeddings (text-embedding-3-small, 1536-dim) may affect retrieval precision

### 4. Image Understanding
- Image chunks rely on LLM vision descriptions for embedding — quality depends on the vision model used
- Complex diagrams with minimal text annotations may not be well-indexed
- Vector figure detection relies on clustering drawing paths and anchoring to captions, which may miss some diagram types

### 5. Scale
- Designed for moderate document collections (hundreds of documents)
- HNSW index performance may degrade with millions of vectors
- Single-node PostgreSQL deployment limits horizontal scaling

### 6. Language Support
- Primarily optimized for English-language documents
- Multilingual documents may have reduced retrieval quality
- Table parsing heuristics are tuned for common English table formats

### 7. Hybrid Route Latency
- Hybrid queries (spanning multiple modalities) search all 3 tables sequentially
- Each modality search is performed and results are merged by similarity score
- No result caching for repeated queries

### 8. Evaluation Coverage
- Golden dataset covers a curated set of Q&A pairs across text, table, and image modalities
- May not represent all edge cases in real-world usage
- LLM-as-judge scoring has inherent subjectivity

## Planned Improvements

- [ ] Support for additional document formats (DOCX, PPTX)
- [ ] Vision model integration for direct image understanding
- [ ] Query result caching
- [ ] Parallel hybrid retrieval
- [ ] Multilingual embedding support
- [ ] Streaming answer generation
