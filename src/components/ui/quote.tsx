import type { ReactNode } from "react";

/**
 * Quote — generic quotation primitive (T14, DS extension).
 *
 * Pure presentational. Accepts an `accent` Tailwind token for the left-border
 * color so callers (CitationBlock, audit log, analytics) can customize it.
 *
 * Usage:
 *   <Quote accent="border-blue-200" attribution="Página 12 del pliego">
 *     El proponente debe…
 *   </Quote>
 */
export interface QuoteProps {
  /** Tailwind border-color token applied to the left accent, e.g. "border-blue-200" */
  accent: string;
  /** Optional footer attribution line */
  attribution?: string;
  children: ReactNode;
}

export function Quote({ accent, attribution, children }: QuoteProps) {
  return (
    <blockquote
      data-component="quote"
      className={[
        "border-l-4 pl-4 py-1",
        accent,
      ].join(" ")}
    >
      <p className="text-xs text-graphite-600 italic">{children}</p>
      {attribution && (
        <footer
          data-quote-attribution="true"
          className="text-xs text-graphite-400 mt-1"
        >
          {attribution}
        </footer>
      )}
    </blockquote>
  );
}
