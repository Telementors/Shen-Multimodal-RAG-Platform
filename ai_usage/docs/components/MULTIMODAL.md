# Multimodal Evidence

## Goal

Make text, tables, diagrams, screenshots, and images retrievable while preserving the original source asset.

## Supported Evidence Types

- text
- table
- diagram
- image

## Visual Evidence Record

A visual should retain:
- asset ID
- document ID
- document version
- page number
- content type
- caption or semantic description
- nearby text
- parent heading if available
- bounding box if available

## Searchable Representation

A searchable caption/description may be used for retrieval, but it must not replace the original asset.

Think of the two as:

`description = retrieval representation`

`asset = visual evidence`

## Tables

Keep table semantics intact.

A table representation should preserve:
- table title
- columns
- row meaning
- units
- source page

For large tables, split logically while repeating the necessary headers.

## Diagrams

For diagrams:
- retain the original image
- include figure caption
- include nearby explanatory text
- optionally create a grounded diagram description

Do not invent labels not visible in the source.

## Query-Type Awareness

Queries such as:
- "show the architecture"
- "what does this diagram mean?"
- "which value is in the table?"
may prioritize specific modalities.

Use modality preference as a retrieval hint, not as a hard rule that excludes strong evidence.

## Response Behavior

If visual evidence directly improves the answer:
- return the asset reference
- cite its source page/chunk
- include only the visuals relevant to the answer

Do not flood the response with every retrieved image.

## OCR and Vision

Use expensive OCR/vision selectively.

Prefer:
1. native text extraction when reliable
2. layout detection
3. targeted OCR for regions that need it
4. vision understanding only where semantic interpretation is needed

## Hallucination Rule

Generated captions are secondary representations.

If a caption conflicts with the original visual or trusted extracted text, do not treat the caption as authoritative.
