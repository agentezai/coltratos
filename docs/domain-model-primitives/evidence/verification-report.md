# Verification Report — domain-model-primitives

**Date:** 2026-04-30
**Verdict:** VERIFIED

## Evidence Summary

| Check | Result | Detail |
|-------|--------|--------|
| Build | PASS | 0 errors, 0 warnings |
| Unit tests | PASS | 89/89 |
| Type tests | PASS | 34/34, 0 TypeCheckErrors |
| Typecheck | PASS | 0 errors, ~2s |
| Coverage | INFO | 76.07% statements, 71.05% branches |
| Diff | PASS | 21 new files, ~1,224 lines; 1 minor modification |
| Design principles | PASS | Clarity + Consistency upheld |

## Human Decisions

All checklist items accepted. Coverage below 80% accepted — Kysely interface types have no runtime call paths; type tests cover shape exhaustively.

## Open Items (deferred)

- [S008]: `AnalisisSchema.pliego_ids` length constraint — defer to domain-model spec revision.
