# T6: Document Upload Service — Legal Certificates

## Scope

- `src/lib/services/documento-juridico.ts` — upload service + expiry logic (new file)
- `src/app/api/empresa/documentos-juridicos/route.ts` — multipart POST handler (new file)

## Changes

### documento-juridico.ts

```typescript
export interface DocumentoJuridicoExpiry {
  tipo_documento: TipoDocumentoJuridico
  fecha_vencimiento: Date
  diasRestantes: number          // negative = expired
  estado: 'vigente' | 'por_vencer' | 'vencido'
}

export interface UploadDocumentoResult {
  ok: true
  id: EmpresaDocumentoJuridicoId
  fecha_vencimiento: Date
} | { ok: false; error: string }
```

**`uploadDocumentoJuridico(empresaId, tipo, file, fechaEmision)`:**
1. Compute SHA-256 hash of file buffer
2. Compute `fecha_vencimiento = fechaEmision + 30 days`
3. Upload to Supabase Storage: `empresas/<empresaId>/documentos-juridicos/<tipo>/<hash>.pdf`
4. Insert into `empresa_documento_juridico`; on conflict (empresa_id, tipo, file_hash) upsert
5. Return `{ ok: true, id, fecha_vencimiento }`; on storage or DB error return `{ ok: false, error }`

**`getDocumentosJuridicos(empresaId): Promise<DocumentoJuridicoExpiry[]>`:**
- Query latest row per `tipo_documento` for empresa (most recent `uploaded_at`)
- Compute `diasRestantes = differenceInDays(fecha_vencimiento, now())`
- `estado`: `vencido` if `diasRestantes < 0`; `por_vencer` if `0 ≤ diasRestantes ≤ 7`; `vigente` otherwise
- Return one entry per tipo even if no upload exists (status `vencido`, `diasRestantes = -Infinity`)

**`VALIDEZ_DOCUMENTO_DIAS = 30`** — single constant; change here propagates everywhere.

### API route (documentos-juridicos/route.ts)

- `POST /api/empresa/documentos-juridicos`
- Accepts `multipart/form-data`: `tipo_documento`, `fecha_emision` (date string), `file` (PDF ≤5MB)
- Validates with `DocumentUploadSchema`
- Calls `uploadDocumentoJuridico`
- Returns `{ ok: true, id, fecha_vencimiento }` or 400/500
- Requires authenticated session (empresa membership check)

### Design Rationale (SRP)

Storage, hashing, DB insert all in one service — they are tightly coupled by the upload transaction. Route handles HTTP multipart parsing only.

## Dependencies

Requires T3 (Kysely types for `empresa_documento_juridico`) and T1 (`TipoDocumentoJuridico`, `DocumentUploadSchema`).

## Done When

- [ ] `uploadDocumentoJuridico` uploads file to correct storage path and inserts DB row
- [ ] `getDocumentosJuridicos` returns one entry per tipo with correct `estado` and `diasRestantes`
- [ ] `estado = 'vencido'` for tipo with no upload on record
- [ ] `estado = 'por_vencer'` when 5 days remain
- [ ] API route `POST /api/empresa/documentos-juridicos` returns 200 on valid upload, 400 on invalid
- [ ] File > 5MB rejected with 413
- [ ] Unit tests for expiry computation (mock `now()`)
- [ ] Storage path matches convention: `empresas/<id>/documentos-juridicos/<tipo>/<hash>.pdf`
- [ ] `npm run build` succeeds
