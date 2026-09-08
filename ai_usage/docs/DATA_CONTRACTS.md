# Data Contracts

These contracts define the conceptual shapes shared across components. Concrete language-specific types may vary, but semantics must remain consistent.

## Document

```ts
type DocumentRecord = {
  id: string;
  filename: string;
  mimeType: string;
  version: string;
  pageCount?: number;
  createdAt: string;
};
```

## Chunk

```ts
type Chunk = {
  id: string;
  documentId: string;
  documentVersion: string;
  type: "text" | "table" | "image" | "diagram";
  content: string;
  pageNumber: number;
  source: {
    filename: string;
  };
  metadata: {
    heading?: string;
    caption?: string;
    assetId?: string;
    bbox?: [number, number, number, number];
  };
};
```

`content` must be the searchable semantic representation. For visual items, it may contain a grounded caption or structured description, while `assetId` points to the original visual.

## Embedding Record

```ts
type EmbeddingRecord = {
  chunkId: string;
  documentId: string;
  vector: number[];
  metadata: {
    type: "text" | "table" | "image" | "diagram";
    pageNumber: number;
    heading?: string;
  };
};
```

## Retrieved Candidate

```ts
type RetrievedCandidate = {
  chunk: Chunk;
  similarityScore: number;
  rerankScore?: number;
};
```

## Evidence Item

```ts
type EvidenceItem = {
  chunkId: string;
  documentId: string;
  type: "text" | "table" | "image" | "diagram";
  content: string;
  pageNumber: number;
  sourceLabel: string;
  assetId?: string;
  score?: number;
};
```

## Generation Request

```ts
type GenerationRequest = {
  question: string;
  evidence: EvidenceItem[];
};
```

## Generation Response

```ts
type GenerationResponse = {
  answer: string;
  citations: {
    chunkId: string;
    documentId: string;
    pageNumber: number;
  }[];
  visualEvidence?: {
    assetId: string;
    chunkId: string;
  }[];
};
```

## Contract Rules

- IDs must be stable inside a document version.
- Page numbers must remain attached through the entire pipeline.
- Components must not invent alternate field names for the same concept.
- Raw provider-specific response objects must not leak across domain boundaries.
- Optional values must be explicit.
- Scores must document their interpretation if normalized or transformed.
