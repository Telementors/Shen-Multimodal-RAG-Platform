# Ingestion

## Purpose

Convert an uploaded source document into structured, traceable content ready for chunking.

## Inputs

Supported examples:
- PDF
- PNG
- JPEG
- WebP

Support only formats explicitly enabled by configuration.

## Responsibilities

1. Validate file.
2. Create document identity/version.
3. Extract page-level structure.
4. Detect content regions.
5. Classify regions as:
   - text
   - heading
   - table
   - diagram
   - image
6. Extract or reference visual assets.
7. Preserve page numbers and source coordinates when available.
8. Forward structured content to chunking.

## Non-Responsibilities

Ingestion must not:
- answer user questions
- perform final retrieval
- decide final top-k
- build the LLM answer prompt
- silently discard failed pages

## Output Concept

```ts
type ParsedPage = {
  pageNumber: number;
  blocks: ParsedBlock[];
};
```

Each block should have enough metadata for later traceability.

## Selective Parsing

For performance, expensive processing may be selective.

Example:
- fast page scan
- detect likely text/table/diagram/image regions
- apply heavier OCR or vision only to needed areas

This is allowed only if important evidence is not systematically lost.

## Duplicate Documents

Use a stable content hash or equivalent strategy when useful to identify exact duplicates.

Do not reprocess identical documents unnecessarily unless the user explicitly requests it.

## Failure Strategy

- reject invalid files early
- allow safe partial processing when useful
- record failed pages/blocks
- expose ingestion status clearly
