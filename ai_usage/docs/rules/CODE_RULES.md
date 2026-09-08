# Code Rules

## Objective

Produce code that is simple to inspect, easy to test, and aligned with the documented architecture.

## Functions

A function should:
- have one clear responsibility
- have explicit inputs and outputs
- avoid hidden side effects
- remain small enough to understand quickly

Prefer decomposition when a function:
- validates
- transforms
- stores
- calls remote services
- formats output
all at once.

## Naming

Names should describe intent.

Prefer:
- `retrieveCandidates`
- `buildEvidenceContext`
- `validateUpload`

Avoid vague names:
- `Manager`
- `Helper`
- `Utils`
- `Processor` without a domain qualifier

## Classes

Use a class when there is meaningful state, lifecycle, or domain responsibility.

Do not create classes only to wrap one trivial function.

## Dependencies

- Inject external dependencies where practical.
- Keep provider SDK usage behind adapters.
- Do not spread database or LLM provider calls across unrelated modules.

## Control Flow

Prefer:
- guard clauses
- early validation
- explicit branches

Avoid:
- deep nesting
- hidden mutation
- large switch statements when responsibilities should be separated

## Comments

Comments should explain:
- why a decision exists
- non-obvious constraints
- external assumptions

Do not comment obvious syntax.

## Refactoring Rule

For a focused feature request:
- change only what the task requires
- do not perform unrelated large-scale cleanup
- do not rename stable concepts without need

## AI-Agent Rule

Do not generate abstractions merely because they might be useful later.

Implement the smallest design that satisfies:
- current business flow
- current contracts
- current security rules
- current tests
