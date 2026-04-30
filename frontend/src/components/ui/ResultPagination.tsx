type ResultPaginationProps = {
  currentPage: number;
  isLoading?: boolean;
  label: string;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
};

type PaginationPageItem = number | 'gap';

export function ResultPagination({
  currentPage,
  isLoading = false,
  label,
  onPageChange,
  pageSize,
  totalItems,
}: ResultPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  if (totalItems <= pageSize) {
    return null;
  }

  return (
    <nav className="result-pagination" aria-label={`Paginacao de ${label}`}>
      <span className="pagination-summary">
        {startItem}-{endItem} de {totalItems.toLocaleString('pt-BR')}
      </span>

      <div className="pagination-controls">
        <button
          className="pagination-button"
          disabled={isLoading || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          type="button"
        >
          Anterior
        </button>

        <div className="pagination-pages">
          {buildPaginationPages(safePage, totalPages).map((pageItem, index) =>
            pageItem === 'gap' ? (
              <span className="pagination-gap" key={`gap-${index}`}>
                ...
              </span>
            ) : (
              <button
                aria-current={pageItem === safePage ? 'page' : undefined}
                className={
                  pageItem === safePage
                    ? 'pagination-page current'
                    : 'pagination-page'
                }
                disabled={isLoading}
                key={pageItem}
                onClick={() => onPageChange(pageItem)}
                type="button"
              >
                {pageItem}
              </button>
            ),
          )}
        </div>

        <button
          className="pagination-button"
          disabled={isLoading || safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          type="button"
        >
          Proxima
        </button>
      </div>
    </nav>
  );
}

function buildPaginationPages(
  currentPage: number,
  totalPages: number,
): PaginationPageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    2,
    totalPages - 1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  return sorted.reduce<PaginationPageItem[]>((accumulator, page, index) => {
    const previousPage = sorted[index - 1];

    if (previousPage && page - previousPage > 1) {
      accumulator.push('gap');
    }

    accumulator.push(page);

    return accumulator;
  }, []);
}
