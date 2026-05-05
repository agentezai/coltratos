## Delta 2026-05-04 — edit | Rename API filter params valor_min/max → cuantia_min/max

**Mode:** edit
**Rationale:** User preference for `cuantia_min/max` naming (consistent with `cuantia` field in `secop_procesos` and COP domain language). Frontend spec also adopted same names. Both sides now use `cuantia_min/max` as the HTTP query param and SQL function param names.
**Affected domains:** integrations, database

### Tasks modified
- P4: Zod schema `valor_min/valor_max` → `cuantia_min/cuantia_max`; structural path filter conditions renamed; RPC call args `filter_valor_min/max` → `filter_cuantia_min/max`; SQL function params renamed accordingly; Done When checklist updated
- Spec REQ-012 and API Contract table updated
- verify.md P4 test scenario URL updated

### Tasks added
- None

### Tasks removed
- None

### Impact on memory
- None: change is purely a naming convention alignment across both specs. Company profile JSONB field `alcance_comercial.valor_max` intentionally preserved (different concept from the API filter param).
