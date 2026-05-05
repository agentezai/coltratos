# TDD Contract: domain-model-postgres

Markdown TDD guide for `nybo-run`. The Executor Agent reads this file and writes failing tests
before implementing each task (Red phase), then implements (Green), then refactors (Refactor).

**Test framework:** vitest (standard for Next.js/TypeScript projects), psql for DB-level assertions
**Test file root:** `src/__tests__/domain/`

---

## Task T1: Postgres Migration

### Behavior: Pliego file_hash dedup is scoped within pliego; same hash accepted in anexo_proceso (RN-003) — TC-004

**Given** a pliego row exists with `file_hash = 'a'.repeat(64)`
**When** a second INSERT into `pliego` uses the same `file_hash`
**Then** Postgres rejects the insert (unique constraint violation)

**When** a row is inserted into `anexo_proceso` with the same `file_hash = 'a'.repeat(64)`
**Then** Postgres accepts the insert (independent dedup space)

**Test file:** DB-level integration test
**Framework:** psql / Supabase local

---

### Behavior: AnexoProceso file_hash dedup is independent from pliego (RN-003) — TC-018

**Given** an `anexo_proceso` row with a given `file_hash`
**When** a second INSERT into `anexo_proceso` uses the same hash
**Then** Postgres rejects the insert

**When** the same hash is inserted into `pliego`
**Then** Postgres accepts it

**Test file:** DB-level integration test
**Framework:** psql / Supabase local

---

### Behavior: Segmento page_range_start <= page_range_end (RN-011) — TC-011

**Given** a valid segmento object
**When** inserted with `page_range_start: 5`, `page_range_end: 3`
**Then** Postgres rejects the insert (CHECK constraint violation on `segmento_page_range_valid`)

**When** inserted with `page_range_start: 1`, `page_range_end: 1`
**Then** Postgres accepts the insert

**Test file:** DB-level integration test
**Framework:** psql / Supabase local

---

### Behavior: Segmento heading both-or-neither (RN-010) — TC-012

**Given** a valid segmento
**When** inserted with `heading_normalized = 'foo'`, `heading_original = NULL`
**Then** Postgres rejects the insert (CHECK `segmento_heading_both_or_neither`)

**When** inserted with `heading_normalized = NULL`, `heading_original = NULL`
**Then** Postgres accepts the insert (both null is valid for synthetic segments)

**Test file:** DB-level integration test
**Framework:** psql / Supabase local

---

### Behavior: Segmento is_synthetic ⟺ heading_normalized IS NULL (RN-010) — TC-013

**Given** a valid segmento
**When** inserted with `is_synthetic = true`, `heading_normalized = 'capacidad juridica'`, `heading_original = 'CAPACIDAD JURÍDICA'`
**Then** Postgres rejects the insert (CHECK `segmento_synthetic_iff_null_heading`)

**When** inserted with `is_synthetic = false`, `heading_normalized = NULL`, `heading_original = NULL`
**Then** Postgres rejects the insert (same CHECK — non-synthetic must have heading)

**Test file:** DB-level integration test
**Framework:** psql / Supabase local

---

### Behavior: Pliego tipo rejects anexo values; AnexoProceso tipo rejects pliego values (RN-012) — TC-015

**Given** valid pliego data
**When** inserted with `tipo = 'anexo_tecnico'`
**Then** Postgres rejects the insert (enum type mismatch)

**Given** valid anexo_proceso data
**When** inserted with `tipo = 'pliego_condiciones'`
**Then** Postgres rejects the insert (enum type mismatch)

**Test file:** DB-level integration test
**Framework:** psql / Supabase local

---

### Behavior: AnexoProcesoTipo enum has exactly 4 values — TC-016

**Given** the Postgres enum `anexo_proceso_tipo`
**When** `SELECT enum_range(NULL::anexo_proceso_tipo)` is called
**Then** it returns exactly: `{anexo_tecnico,estudio_previo,resolucion,otro}`

**Test file:** DB-level integration test
**Framework:** psql / Supabase local

---

### Behavior: Requisito categoria rejects 'general'; is_habilitante_source rejects 'auto' (REQ-008, RN-017) — TC-029

**Given** valid requisito data
**When** inserted with `categoria = 'general'`
**Then** Postgres rejects the insert (CHECK `requisito_categoria_narrow`)

**When** inserted with `is_habilitante_source = 'auto'`
**Then** Postgres rejects the insert (CHECK `requisito_is_habilitante_source_valid`)

**Test file:** DB-level integration test
**Framework:** psql / Supabase local

---

### Behavior: Requisito citation_quote length CHECK rejects > 200 chars (REQ-007) — TC-023

**Given** valid requisito data
**When** inserted with `citation_quote` of length 201
**Then** Postgres rejects the insert (CHECK `requisito_citation_quote_length`)

**When** inserted with `citation_quote` of length 200
**Then** Postgres accepts the insert

**Test file:** DB-level integration test
**Framework:** psql / Supabase local

---

### Behavior: empresa.profile_updated_at auto-bumps on nombre/nit change (REQ-011, RN-014) — TC-024

**Given** an empresa row with `profile_updated_at = T0`
**When** `UPDATE empresa SET nombre = 'New Name' WHERE id = ...` is executed
**Then** `profile_updated_at` is updated to a timestamp > T0

**When** `UPDATE empresa SET updated_at = updated_at WHERE id = ...` is executed (no-op update)
**Then** `profile_updated_at` is NOT changed

**Test file:** DB-level integration test
**Framework:** psql / Supabase local

---

## Task T2: RLS Policies

### Behavior: proceso is readable by users from different empresas (bifurcated RLS) — TC-008

**Given** two users A and B each belonging to different empresas
**And** a proceso row exists
**When** each user queries `SELECT * FROM proceso WHERE id = ...`
**Then** both receive the same row (public-read policy)

**Test file:** DB-level RLS integration test
**Framework:** psql / Supabase local (set_config for role impersonation)

---

### Behavior: analisis is invisible to users from a different empresa — TC-009

**Given** user A (empresa X) and user B (empresa Y)
**And** an analisis row belonging to empresa X
**When** user B queries `SELECT * FROM analisis WHERE empresa_id = X`
**Then** zero rows are returned

**When** user A queries the same
**Then** one row is returned

**Test file:** DB-level RLS integration test
**Framework:** psql / Supabase local

---

### Behavior: analisis SELECT returns zero rows for wrong empresa (empresa_member join) — TC-006

**Given** a user that is NOT a member of empresa X
**When** that user queries `SELECT * FROM analisis WHERE empresa_id = X`
**Then** zero rows are returned (RLS empresa_member policy)

**Test file:** DB-level RLS integration test
**Framework:** psql / Supabase local

---

### Behavior: anexo_proceso SELECT returns same row to users of different empresas — TC-017

**Given** two authenticated users from different empresas
**And** an anexo_proceso row
**When** each user queries `SELECT * FROM anexo_proceso WHERE id = ...`
**Then** both receive the same row (public-read parity with pliego)

**Test file:** DB-level RLS integration test
**Framework:** psql / Supabase local

---

### Behavior: pliego hard-delete is blocked; soft-delete works (RN-004)

**Given** an authenticated user
**When** `DELETE FROM pliego WHERE id = ...` is executed
**Then** Postgres rejects the operation (restrictive DELETE policy returns false)

**When** `UPDATE pliego SET deleted_at = now() WHERE id = ...` is executed
**Then** Postgres accepts the operation

**Test file:** DB-level RLS integration test
**Framework:** psql / Supabase local

---

### Behavior: Both migrations apply without errors

**Given** a clean Supabase local instance
**When** `supabase db push` is run with both migration files
**Then** no errors are emitted and all 9 tables exist

**Test file:** CI step
**Framework:** Supabase CLI

---
