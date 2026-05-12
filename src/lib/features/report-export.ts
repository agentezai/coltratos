/**
 * T19: report-export feature flag (REQ-025)
 *
 * Single source of truth for whether the `report-export` feature is available
 * at runtime. Evaluated once at module load from the public env var.
 *
 * Mode A — NEXT_PUBLIC_REPORT_EXPORT_ENABLED=true:
 *   ExportButton is enabled and delegates to the `report-export` pipeline.
 *
 * Mode B — flag absent or false (current state):
 *   ExportButton renders disabled with a "Próximamente" tooltip.
 *
 * The actual report rendering pipeline, signed-URL pickup, file format, and
 * storage cleanup are owned by the future `report-export` feature spec —
 * never couple this module to unspecced code.
 */

export const REPORT_EXPORT_ENABLED =
  process.env.NEXT_PUBLIC_REPORT_EXPORT_ENABLED === "true";
