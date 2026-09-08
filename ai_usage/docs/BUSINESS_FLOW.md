# Business Flow

## Primary User Goal

A user asks a question about one or more ingested documents and receives a grounded answer supported by the most relevant textual or visual evidence.

## Document Ingestion Flow

1. User submits a supported document.
2. System validates the file.
3. System extracts document metadata and page structure.
4. System detects content types:
   - text
   - headings
   - tables
   - diagrams
   - images
5. Each content type is routed to the correct processor.
6. Retrieval units are created.
7. Embeddings are generated.
8. Vector records and source metadata are stored.
9. Ingestion status is returned.

If a page cannot be fully processed, the system should preserve partial usable evidence when safe and report the processing limitation.

## Question Answering Flow

1. Validate the question.
2. Determine whether the query likely needs:
   - text evidence
   - table evidence
   - visual evidence
   - mixed evidence
3. Build the query representation.
4. Retrieve a wider candidate set.
5. Apply metadata filters when relevant.
6. Rerank candidates.
7. Drop weak or duplicate evidence.
8. Build a compact evidence package within the token budget.
9. Send:
   - system instruction
   - user question
   - evidence
   - citation rules
   to the LLM.
10. Generate a grounded response.
11. Return:
   - answer
   - citations/source references
   - relevant image/diagram/table references when useful

## Grounding Rule

The system must not present unsupported facts as if they came from the source documents.

If the evidence is insufficient:
- say that the available evidence is insufficient
- identify what is missing when possible
- do not fabricate a source-backed answer

## Multimodal Answer Rule

When a retrieved visual materially improves comprehension, return or reference the visual rather than only describing it.

Examples:
- architecture diagram
- flowchart
- data table
- labeled equipment image
- screenshot of a UI state

## Query Failure Flow

If retrieval fails:
1. distinguish technical failure from no relevant evidence
2. do not treat "no evidence" as "system error"
3. return a safe user-facing result
4. log internal diagnostic context without leaking secrets

## Reprocessing Flow

If the same document changes:
- create a new document version or reindex safely
- avoid duplicate active chunks
- preserve stable source identity where practical
