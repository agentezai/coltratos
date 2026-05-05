// Patterns authored against the NFD-normalized lowercase form produced by pdf-ingestion.
// Bump HABILITANTE_PATTERNS_VERSION whenever any pattern changes — downstream caches must invalidate (RN-003).
export const HABILITANTE_HEADING_PATTERNS: readonly RegExp[] = [
  /\brequisitos\s+habilitantes\b/,
  /\bcapacidad\s+juridica\b/,
  /\bcapacidad\s+financiera\b/,
  /\bcapacidad\s+tecnica\b/,
  /\bexperiencia\s+(minima|acreditada|requerida)\b/,
]

export const HABILITANTE_PATTERNS_VERSION = 'v1.0.0' as const
