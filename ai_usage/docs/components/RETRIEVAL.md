# Retrieval

## Goal

Return the smallest strong set of evidence needed to answer the question.

## Query Flow

Question
→ query representation
→ candidate retrieval
→ metadata filtering
→ reranking
→ deduplication
→ thresholding
→ final evidence candidates

## Candidate Retrieval

Retrieve more candidates than the final answer needs.

Example:

Vector search:
`topK = 20`

Reranker:
`20 → 5`

Context builder:
select only the strongest evidence under the token budget.

Exact values must be configurable and evaluated against real data.

## Similarity Search

Raw vector similarity is only a candidate signal.

Do not assume:
highest cosine score = definitely correct evidence.

## Metadata Filters

Apply when relevant:
- tenant/owner
- document ID
- document version
- content type
- page range
- collection

Authorization filters must not be optional.

## Hybrid Retrieval

If supported, combine:
- dense vector similarity
- lexical/BM25-style matching
- metadata constraints

Hybrid retrieval is useful for:
- exact identifiers
- error codes
- product names
- rare technical terms

## Reranking

Use reranking when candidate quality benefits from deeper query-document comparison.

The reranker should operate on candidate evidence, not the full corpus.

## Duplicate Suppression

Avoid sending several near-identical chunks from the same passage.

Prefer evidence diversity when several chunks carry the same information.

## Low-Confidence Behavior

If no candidate meets the minimum evidence threshold:
- return "insufficient evidence" to the generation layer
- do not force weak chunks into the prompt

## Performance

Prefer:
- indexed metadata
- bounded candidate sets
- batched reranking
- query/result caching where safe

Do not retrieve hundreds of chunks only to discard almost all of them later.
