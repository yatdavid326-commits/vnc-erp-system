'use client';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  itemLabel: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  page,
  pageSize,
  total,
  itemLabel,
  disabled = false,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={`Paginación de ${itemLabel}`}
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-sm text-gray-600" aria-live="polite">
        Mostrando {firstItem}-{lastItem} de {total} {itemLabel} · Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={disabled || page <= 1}
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={disabled || page >= totalPages}
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente →
        </button>
      </div>
    </nav>
  );
}
