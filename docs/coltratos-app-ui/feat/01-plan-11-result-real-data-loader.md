# T11: Resultado — real-data loader (RLS-scoped Kysely)

## Scope

| File | Change |
|------|--------|
| `app/dashboard/analisis/[id]/page.tsx` | **Rewrite** — replace mock import with server-side data fetch |
| `src/lib/queries/analysis-detail.ts` | New — RLS-scoped Kysely query returning `AnalysisDetail` aggregate |
| `src/types/domain/analysis.ts` | Extend — add `AnalysisDetail`, `RequisitoView`, `VerdictView` types |
| `src/lib/server/auth-context.ts` | Use existing — `auth.company_id()` for RLS scoping |

## Requirements

REQ-012, REQ-013, REQ-014, REQ-027, REQ-028, NFR-07.

## Changes

### `getAnalysisDetail(id, companyId)` (Kysely)

Single round-trip query joining:
- `analyses` (filtered by `id` and `company_id`)
- `verdicts` (LEFT JOIN on `analysis_id`)
- `requisitos` (JOIN on `verdicts.requisito_id`)
- `pliego_uploads` (JOIN on `analyses.pliego_upload_id`)

Returns `AnalysisDetail | null`. Returning `null` triggers `notFound()` in the page.

```ts
export type AnalysisDetail = {
  id: string;
  procesoId: string;
  pliegoUploadId: string;
  overallVerdict: 'verde' | 'amarillo' | 'rojo' | null;
  procesoLookupStatus: 'verified' | 'unverified' | 'failed';
  procesoMetadata: ProcesoMetadataSnapshot;  // JSONB
  extractionStatus: 'pending' | 'extracting' | 'partial' | 'completed' | 'failed';
  extractionStage: string | null;             // for REQ-028 loader
  pagesFlagged: number;
  flaggedPagesList: number[];                 // populated only if pagesFlagged > 0
  costUsd: number | null;
  latencyMs: number | null;
  createdAt: string;
  pliegoSha256: string;
  pliegoStorageKey: string;
  requisitos: RequisitoView[];
  feedbackByMe: { rating: 'up' | 'down' | null; comment: string | null };
};

export type RequisitoView = {
  id: string;
  tipo: 'juridico' | 'tecnico' | 'financiero';
  texto: string;
  quoteFuente: string | null;
  paginaFuente: number | null;
  verdict: { value: 'verde' | 'amarillo' | 'rojo'; reason: string; confidence: number } | null;
};
```

### `app/dashboard/analisis/[id]/page.tsx`

Server Component. Reads `params.id`, calls `getAnalysisDetail`, branches:
- `null` → `notFound()`
- `extractionStatus ∈ {pending, extracting}` → render `<ExtractionLoading detail={detail}/>` (T20)
- `extractionStatus ∈ {partial, completed}` → render `<ResultPage detail={detail}/>` with header (T12), warning banner if `pagesFlagged > 0` (T17), verdict banner (T13), requisito tabs (T14), sidebar
- `extractionStatus = failed` → render error state with re-run button (T16)

## Done When

- [ ] `getAnalysisDetail` returns `null` for analyses owned by another `company_id` (RLS test)
- [ ] `getAnalysisDetail` returns the full aggregate in a single query for the happy path
- [ ] Page renders `notFound()` for missing IDs
- [ ] Mock import in `[id]/page.tsx` is removed
- [ ] `npm run build` no type errors

## Dependencies

`domain-model-mvp` rev 3 (table shapes), `requisitos-extraction` (requisitos rows), `semaforo-aggregation` (verdicts rows).
