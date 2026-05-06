# Use Cases: procesos-listing

## Actors

| Actor | Description |
|-------|-------------|
| Pilot (usuario autenticado) | Colombian company rep discovering SECOP II opportunities in COLTRATOS |
| Sistema (frontend) | Next.js client; manages URL state, fetch, render, and click logging |
| Cron job | Vercel cron; fires every 6 h to sync SODA → `procesos_index` |
| `/api/procesos` | Backend endpoint delivering enriched Proceso data |
| `/api/cron/sync-secop` | Backend cron route triggering bulk sync + embedding |
| `/api/procesos/[numero_proceso]` | Direct lookup endpoint; local index first, SODA fallback |

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | Pilot | See real SECOP procesos without setting up filters | I can immediately assess available opportunities |
| US-02 | Pilot | Filter procesos by departamento, modalidad, UNSPSC, valor range, and fecha cierre | I see only procesos matching my company's scope |
| US-03 | Pilot | Search by free text and see semantic match scores | I find procesos that match my domain even if exact keywords differ |
| US-04 | Pilot | Enable "Coincide con mi perfil" toggle to auto-filter by my company profile | I skip manual filter setup for procesos I'm plausibly eligible for |
| US-05 | Pilot | Know which procesos I've already worked on | I don't waste time re-reviewing analyzed procesos |
| US-06 | Pilot | Share a filtered view with a colleague | We collaborate on the same opportunity set |
| US-07 | Pilot | Click a result and land on the upload flow | I can immediately start analyzing a Proceso I found |
| US-08 | Pilot | Look up a specific Proceso by its `numero_proceso` | I can still access closed or pre-publication procesos not in the index |

## Use Case Scenarios

### UC-01 — Personalized listing on first visit

**Precondition:** User authenticated; `procesos_index` has synced rows; localStorage may have saved preferences.

**Main Scenario:**
1. User navigates to `/dashboard/procesos`
2. Page checks URL params — none present
3. Page checks localStorage for `coltratos_procesos_filter_prefs`
4. If preferences found: URL updated with saved params; fetch fires
5. If no preferences: defaults applied (sort=recent, page_size=20); fetch fires
6. Table renders real SECOP rows; stat cards show filtered aggregates

**Alt — no data synced:**
- Fetch returns `data: [], total: 0` with no filters
- Empty state B shown: "Aún no hay procesos sincronizados"

### UC-02 — Multi-filter by departamento + modalidad

**Main Scenario:**
1. User opens departamento multi-select; selects "Bolívar" and "Cundinamarca"
2. URL updates to `departamento=Bolívar%2CCundinamarca`; `page` resets to 1
3. Skeleton rows shown while fetch in-flight
4. Results update; stat cards refresh to reflect filtered subset

### UC-03 — Semantic keyword search

**Main Scenario:**
1. User types "software gestión documental"
2. After 400ms debounce: URL updates `q=software+gestión+documental`; fetch fires
3. API embeds query via OpenAI; vector search returns rows with `match_score`
4. Table shows "Match" column with "87% relevante" per row; ordered by relevance

### UC-04 — Cron bulk sync

**Precondition:** Vercel cron fires; `CRON_SECRET` header matches env var.

**Main Scenario:**
1. `/api/cron/sync-secop` receives POST from Vercel
2. SODA client fetches all Procesos with `estado = abierto`
3. Mapper translates SODA field names → `procesos_index` columns (e.g. `id_proceso` → `numero_proceso`)
4. Upsert on `numero_proceso`; rows with `fecha_limite_de_recepcion` < now() are deleted
5. Changed rows (new or `objeto_a_contratar` updated) queued for B4 embedding
6. Sync errors logged; `sync_failure_count` incremented; cron returns 200 with summary

**Alt — SODA unreachable:**
- Error logged; `sync_failure_count` incremented; existing index rows preserved; returns 200 with error summary

### UC-05 — Embedding sync

**Precondition:** B3 cron has run; `procesos_index` has rows with `embedded_at IS NULL` or stale embeddings.

**Main Scenario:**
1. `lib/secop/embeddings.ts` selects rows where `embedded_at IS NULL OR objeto_a_contratar` hash changed
2. Batch-embeds `objeto_a_contratar` via OpenAI `text-embedding-3-small`
3. Updates `embedding vector(1536)` and `embedded_at = now()` on each row
4. Writes one `embedding_events` row per batch: `use_case='sync'`, `company_id=null`, `input_tokens`, `cost_usd`, `model`
5. Rate limit respected (batch size ≤ 100 rows per OpenAI call)

### UC-06 — Cost logging

**Main Scenario:**
- Every call to `/api/procesos` with `q` non-empty: `logEmbeddingEvent` (query embed) + `logSearchEvent` (query, filters, results) written via TelemetryLogger
- Every sync batch: `logEmbeddingEvent` written with `use_case='sync'`
- Failures are fire-and-forget: logged to stderr, never thrown to caller

### UC-07 — Profile-match toggle

**Precondition:** Company profile has `alcance_comercial` with UNSPSC codes, cuantia range, ciudad list.

**Main Scenario:**
1. User enables "Coincide con mi perfil" toggle
2. URL updates `profile_match=true`; fetch fires
3. API reads `company_profiles.alcance_comercial`; derives UNSPSC, cuantia_min/max, ciudad filters
4. Results narrowed to procesos matching company's profile
5. Filter bar shows "Perfil activo" badge

### UC-08 — Direct Proceso ID lookup

**Precondition:** Pilot has a `numero_proceso` (e.g. from a colleague's email or SECOP UI).

**Main Scenario:**
1. User types "CO1.BDOS.XXXXXXX" in "Buscar por ID" input and clicks Buscar
2. Frontend calls `GET /api/procesos/CO1.BDOS.XXXXXXX`
3. API checks `procesos_index` first; if found → returns row
4. If not in index: calls SODA single-record lookup (24h TTL); maps result
5. On success: navigates to `/dashboard/upload?procesoId=CO1.BDOS.XXXXXXX`
6. On 404: shows "Proceso no encontrado en SECOP" inline error

---

## Use Cases UC-01 through UC-12 (frontend scenarios)

The frontend use cases UC-01 through UC-12 from rev 2 remain valid and are not reproduced here in full. UC-04 (cron sync), UC-05 (embedding sync), UC-06 (cost logging), and UC-07/UC-08 above are the new backend-layer additions.

See [spec.md](./spec.md) for consolidated requirements covering both backend and frontend behavior.
