# ADR-008: Pliego / AnexoProceso Split

**Status**: Accepted

## Decision

Maintain `pliego` and `anexo_proceso` as two distinct tables with two distinct tipo enums, rather than a single `documento` table with a discriminator column.

## Rationale

- `Pliego` semantics are narrow: a pliego is a document that CONTAINS requisitos habilitantes. Mixing it with technical annexes and resolutions under one table conflates documents with fundamentally different roles in the domain.
- Two distinct enums (`PliegoTipo`, `AnexoProcesoTipo`) make the split visible in code and prevent accidentally sending an anexo through the requisito-extraction pipeline.
- `ADR-008` directly cancels the earlier `Documento` entity name, which was too generic and caused naming drift across the spec revisions.

## Consequences

- Sharing a "DocumentBase" mixin or inheritance is **prohibited** — the separation must be visible at the code level, not just at the table layer.
- Consumers of the old `Documento*` name must be migrated to either `Pliego*` or `AnexoProceso*`.
- Adding a new document type requires explicit discussion of which table it belongs to, not a discriminator value addition.
