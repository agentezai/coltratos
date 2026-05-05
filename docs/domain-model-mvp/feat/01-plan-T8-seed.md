# T8: Seed Migration — Multi-tenant Isolation Demo

## Scope

- `supabase/migrations/20260504000008_seed.sql` — seed data demonstrating 2-company RLS isolation

## Changes

### Seed data

```sql
-- Two companies
INSERT INTO companies (id, name, nit) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Empresa Alfa S.A.S.', '900111111-1'),
  ('22222222-2222-2222-2222-222222222222', 'Constructora Beta Ltda.', '900222222-2');

-- Users table links auth.users identity to company
-- Note: matching rows in auth.users must be created via Supabase Auth admin API before this migration
INSERT INTO users (id, company_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner');

-- Company profiles
INSERT INTO company_profiles (company_id, juridica, financiera, experiencia, capacidad_tecnica) VALUES
  ('11111111-1111-1111-1111-111111111111', '{"rup_activo": true}', '{"liquidez": 1.8}', '[]', '{}'),
  ('22222222-2222-2222-2222-222222222222', '{"rup_activo": true}', '{"liquidez": 2.1}', '[]', '{}');

-- One shared proceso (no company_id — public row)
INSERT INTO procesos (id, numero_proceso, entidad, objeto_a_contratar, modalidad, datos_gov_snapshot, proceso_lookup_status) VALUES
  ('33333333-3333-3333-3333-333333333333', 'SECOP-TEST-001', 'Ministerio de Pruebas', 'Suministro de software de prueba', 'Licitación Pública', '{"numero": "SECOP-TEST-001"}', 'verified');

-- One procesos_index row with zero vector (demonstrates pgvector column accepts 1536-dim input)
INSERT INTO procesos_index (numero_proceso, entidad, objeto_a_contratar, modalidad, embedding) VALUES
  ('SECOP-TEST-001', 'Ministerio de Pruebas', 'Suministro de software de prueba', 'Licitación Pública',
   array_fill(0::float8, ARRAY[1536])::vector);

-- Two pliego_uploads with identical file_sha256 (hash collision — both must persist per RN-009)
INSERT INTO pliego_uploads (id, proceso_id, uploaded_by_company_id, file_sha256, file_storage_key, declaration_accepted_at, declaration_text_version, status) VALUES
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'abc123def456abc123def456abc123def456abc123def456abc123def456abc1', 'companies/11111111-1111-1111-1111-111111111111/pliegos/abc123.pdf', now(), 'v1', 'active'),
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
   'abc123def456abc123def456abc123def456abc123def456abc123def456abc1', 'companies/22222222-2222-2222-2222-222222222222/pliegos/abc123.pdf', now(), 'v1', 'active');

-- Two analyses — one per company, same proceso, different pliego_upload
INSERT INTO analyses (id, proceso_id, company_id, pliego_upload_id, proceso_metadata_snapshot, proceso_lookup_status, estado) VALUES
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   '44444444-4444-4444-4444-444444444444', '{"numero": "SECOP-TEST-001"}', 'verified', 'completed'),
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
   '55555555-5555-5555-5555-555555555555', '{"numero": "SECOP-TEST-001"}', 'verified', 'completed');

-- Two requisitos — one per analysis
INSERT INTO requisitos (id, analysis_id, tipo, texto) VALUES
  ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', 'juridico',
   'Acreditar existencia y representación legal mediante certificado de Cámara de Comercio'),
  ('99999999-9999-9999-9999-999999999999', '77777777-7777-7777-7777-777777777777', 'financiero',
   'Demostrar índice de liquidez mínimo de 1.5 en el último año fiscal');

-- Two verdicts — one per requisito
INSERT INTO verdicts (requisito_id, verdict, reason, confidence) VALUES
  ('88888888-8888-8888-8888-888888888888', 'verde', 'RUP activo y vigente confirmado en perfil de empresa', 0.9500),
  ('99999999-9999-9999-9999-999999999999', 'verde', 'Liquidez 2.1 supera el umbral mínimo de 1.5', 0.9000);
```

### RLS isolation verification

Executed as part of the acceptance test (not embedded in the migration SQL itself):

```sql
-- Simulate user_a session
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';

SELECT count(*) FROM analyses;      -- expect 1 (only company A)
SELECT count(*) FROM pliego_uploads; -- expect 1 (only company A)
SELECT count(*) FROM requisitos;    -- expect 1 (via analyses chain)
SELECT count(*) FROM verdicts;      -- expect 1 (via requisitos chain)
SELECT count(*) FROM procesos;      -- expect 1 (shared — both companies)
```

## Design Rationale

Deterministic UUIDs make the seed reproducible and grep-able across test files. The hash collision (same `file_sha256` for two companies) exercises RN-009 — both rows must persist with no uniqueness error. The zero vector on `procesos_index` proves the `vector(1536)` column accepts real input without requiring an OpenAI API call during tests.

## Dependencies

All prior tasks must complete first: T1 (extensions), T2–T5 (tables), T6 (RLS policies so isolation can be verified), T7 (indexes for accurate EXPLAIN output).

## Done When

- [ ] `supabase/migrations/20260504000008_seed.sql` exists
- [ ] Migration applies cleanly on a fresh Supabase project after T1–T7
- [ ] `SELECT count(*) FROM analyses` as user_a returns 1 (not 2)
- [ ] `SELECT count(*) FROM pliego_uploads` as user_a returns 1 (not 2)
- [ ] `SELECT count(*) FROM requisitos` as user_a returns 1 (only company A's via chain)
- [ ] `SELECT count(*) FROM verdicts` as user_a returns 1 (chain-scoped)
- [ ] `SELECT count(*) FROM procesos` as user_a returns 1 (shared table, not filtered)
- [ ] Two `pliego_uploads` rows with identical `file_sha256` but different `uploaded_by_company_id` exist
- [ ] `SELECT array_length(embedding::float8[], 1) FROM procesos_index LIMIT 1` returns 1536
