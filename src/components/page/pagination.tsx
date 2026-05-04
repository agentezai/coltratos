export interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPage?: (n: number) => void;
}

export function Pagination({ total, page, perPage, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-graphite-100 text-sm">
      <span className="text-graphite-500">
        Mostrando {from} a {to} de {total} resultados
      </span>
      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage?.(n)}
            className={[
              "w-8 h-8 rounded-md text-sm font-medium transition-colors",
              n === page
                ? "bg-blue-600 text-white"
                : "text-graphite-600 hover:bg-graphite-100",
            ].join(" ")}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
