# Error Rules

## Error Categories

### Validation Error
User input is invalid.

Examples:
- unsupported file type
- empty question
- file too large

### Domain Error
The operation is valid but cannot be completed under domain rules.

Examples:
- document not indexed
- chunk references missing source asset

### Infrastructure Error
A dependency failed.

Examples:
- vector database unavailable
- object storage timeout
- embedding provider failure

### Internal Error
Unexpected application failure.

## Handling Rules

- Validate early.
- Preserve the original internal cause for logs.
- Return safe external messages.
- Do not leak stack traces, secrets, paths, provider tokens, or internal topology.

## Never Do This

```ts
try {
  await operation();
} catch {
  return null;
}
```

Silent failure makes retrieval behavior impossible to trust.

## Preferred Pattern

```ts
try {
  return await repository.save(record);
} catch (error) {
  logger.error("Failed to save embedding record", {
    documentId: record.documentId,
    cause: error
  });

  throw new InfrastructureError("Embedding storage failed");
}
```

## Partial Ingestion

Partial success may be acceptable when:
- usable content was processed
- failed items are tracked
- the final ingestion status clearly communicates the limitation

Do not mark a partially failed ingestion as fully successful.

## Retry Rules

Retry only transient failures such as:
- timeouts
- rate limits
- temporary service errors

Do not retry deterministic validation failures.

Use bounded retries with backoff. Avoid infinite retry loops.
