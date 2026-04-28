# T6: Cleanup + Domain-Model Side-Edit

## Scope

- `.env.example` — rewrite the `# para migraciones Prisma` comment.
- `.gitignore` — remove the `/src/generated/prisma` line.
- `docs/domain-model/spec/spec.md` — side-edit NFR-01 (`pnpm typecheck` → `npm run typecheck`).
- `docs/domain-model/deltas.md` — append a new delta entry recording the side-edit.

## Changes

### Edit `.env.example` (REQ-009, TC-011)

Current line (line ~4):

```
# PostgreSQL directo (para migraciones Prisma)
DIRECT_URL=
```

Replacement:

```
# PostgreSQL directo (para `supabase db push` y conexiones sin pooling)
DIRECT_URL=
```

Rationale: ADR-001 chose Kysely over Prisma; this comment was stale from a pre-spec exploration. The new comment reflects the actual usage — `supabase db push` requires a non-pooled connection (per Supabase CLI docs) and Kysely uses the pooled `DATABASE_URL` for runtime queries.

All other env keys (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `SMMLV_2026`) are preserved verbatim.

### Edit `.gitignore` (REQ-010, TC-011)

Current last entry:

```
/src/generated/prisma
```

Action: **delete the line entirely**. (The trailing blank line at end-of-file is preserved.)

After this edit, grep for `prisma` (case-insensitive) across `.env.example` AND `.gitignore` returns zero matches (TC-011).

### Side-edit [docs/domain-model/spec/spec.md](../../domain-model/spec/spec.md) (REQ-012, TC-013)

Current NFR-01 (line 48):

```
| NFR-01 | Performance | `pnpm typecheck` completes under 10s in strict mode across the full repo |
```

Replacement:

```
| NFR-01 | Performance | `npm run typecheck` completes under 10s in strict mode across the full repo |
```

This is the **only** `pnpm` reference in any approved spec. After this edit, `grep -rn 'pnpm' docs/` returns zero matches.

### Append delta entry to [docs/domain-model/deltas.md](../../domain-model/deltas.md) (REQ-012, TC-013)

Append at the end of the file:

```markdown
---

## Delta 2026-04-27 — edit | Tooling-consistency rename: pnpm typecheck → npm run typecheck (NFR-01)

**Mode:** edit
**Rationale:** The architectural-guardrails audit identified that domain-model NFR-01 was the single `pnpm` reference in any approved spec, while every other surface (`.github/workflows/ci.yml`, `AGENTS.md`, the new project-bootstrap spec) uses `npm`. project-bootstrap REQ-012 / RN-001 codifies npm as the project package manager (per ADR-014); converging NFR-01 on `npm run typecheck` removes the only inconsistency. One-line edit; no functional change to the underlying gate (still `tsc --noEmit --strict`, still <10s).
**Affected domains:** infrastructure (no product-domain impact)

### Tasks added
- None.

### Tasks modified
- None (the change is in the spec text, not the task plans).

### Tasks removed
- None.

### Spec sections modified
- **NFR-01**: `pnpm typecheck` → `npm run typecheck` — the only edit.
- All other NFRs, REQs, RNs, TCs unchanged. Task plans, contract, verify, progress files unchanged.

### Impact on memory
- **Convention reinforcement:** project-bootstrap RN-001 (npm as package manager) is now consistent across every spec surface. Future specs that reference `pnpm` should be flagged as drift; the convention is durable enough to add to `.nybo/foundation/conventions.yaml` via `/nybo-curate conventions add` if a third inconsistency emerges.
```

### Verify (TC-011, TC-013)

```bash
# Prisma cleanup:
grep -i 'prisma' .env.example .gitignore
# Expected: zero matches.

# pnpm cleanup:
grep -rn 'pnpm' docs/
# Expected: zero matches.

# Side-edit shape:
grep -n 'npm run typecheck' docs/domain-model/spec/spec.md
# Expected: at least one match in NFR-01.

# Delta entry shape:
grep -n 'Delta 2026-04-27 — edit | Tooling-consistency' docs/domain-model/deltas.md
# Expected: 1 match.
```

### Design Rationale (Single Responsibility)

T6 is purely textual cleanup. It does not touch `package.json`, `tsconfig.json`, or any runtime config. The edits are bundled here (rather than scattered across T1-T5) because they share a single rationale: "make the documentation match the package-manager and dialect choices the bootstrap codified." Splitting the side-edit into a separate `/nybo-plan edit domain-model` round would create another revision (and another delta entry) with the same rationale; bundling it costs one shared delta entry that documents the cross-spec coupling.

## Dependencies

Requires **T1** — the basic project structure must exist before `.env.example` references make sense in context.

Independent of T2/T3/T4/T5 — purely textual edits to existing files.

## Done When

- [ ] `.env.example` line 4 rewritten; the word `Prisma` does not appear (TC-011).
- [ ] `.gitignore` no longer contains `/src/generated/prisma` (TC-011).
- [ ] [docs/domain-model/spec/spec.md NFR-01](../../domain-model/spec/spec.md#L48) reads `npm run typecheck`, not `pnpm typecheck` (TC-013).
- [ ] [docs/domain-model/deltas.md](../../domain-model/deltas.md) carries a new entry dated 2026-04-27 with the rename rationale (TC-013).
- [ ] `grep -rn 'pnpm' docs/` returns zero matches.
- [ ] `grep -i 'prisma' .env.example .gitignore` returns zero matches.
