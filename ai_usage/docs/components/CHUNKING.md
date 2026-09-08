# Chunking

## Goal

Create semantically meaningful retrieval units instead of arbitrary fragments.

## Text

Prefer boundaries in this order:
1. heading/subheading
2. paragraph
3. sentence boundary
4. token-size fallback

Do not split purely every N characters unless no better structure exists.

## Chunk Size

Chunk size is a retrieval tradeoff, not a fixed universal constant.

A chunk should be:
- large enough to preserve meaning
- small enough to retrieve precisely
- small enough to fit several strong evidence items into the final context

## Overlap

Use overlap only where continuity requires it.

Avoid excessive overlap because it:
- wastes index space
- returns duplicates
- consumes context budget

## Tables

Preserve:
- title/caption
- column headers
- row relationships
- page number
- relevant surrounding explanation

A row without its headers is usually a poor retrieval unit.

## Diagrams and Images

A visual retrieval unit should preserve:
- visual asset reference
- caption
- nearby explanatory text
- page number
- parent heading when available

Do not replace the original visual with only a generated caption.

The caption is searchable representation; the original asset remains authoritative visual evidence.

## Metadata

Every chunk must retain:
- chunk ID
- document ID/version
- page number
- content type
- source filename
- heading/caption where available

## Deduplication

Avoid creating several nearly identical chunks from:
- overlapping OCR
- repeated headers/footers
- duplicate page elements

Common repeated headers/footers should usually be filtered before indexing.
