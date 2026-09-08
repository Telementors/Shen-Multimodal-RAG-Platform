# Test Rules

## Test Behavior, Not Implementation

Tests should verify externally meaningful behavior rather than internal function choreography.

## Minimum Cases for Important Logic

Each important unit should normally cover:
1. normal success
2. expected failure
3. boundary or edge case

## Retrieval Tests

Test:
- relevant candidate ranking
- metadata filters
- duplicate suppression
- low-evidence behavior
- tenant/document isolation when applicable

## Chunking Tests

Test:
- headings remain associated with child text
- table headers are preserved
- visual captions remain attached
- page references survive splitting

## Security Tests

Test:
- unsupported uploads are rejected
- path traversal inputs are neutralized
- retrieved prompt-injection text does not change system behavior
- cross-tenant retrieval is blocked

## Generation Tests

Avoid asserting exact prose unless required.

Prefer asserting:
- citations exist when evidence is used
- unsupported claims are not produced
- insufficient evidence produces an uncertainty response
- relevant visual evidence is attached when required

## Mocking

Mock infrastructure boundaries:
- embedding provider
- vector store
- object storage
- external LLM

Do not mock the core business rule being tested.

## Integration Tests

Cover the critical path:

document
→ chunks
→ embeddings
→ retrieval
→ evidence
→ response

Use a tiny deterministic fixture corpus.

## Test Naming

Good:

`returns_no_evidence_when_similarity_is_below_threshold`

Bad:

`test_retriever_1`
