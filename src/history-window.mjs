export const HISTORY_PAGE_SIZE = 15;

/**
 * The automatic page follows the current timeline cursor, not the absolute
 * end of history. A manual page is clamped to the available range.
 */
export function getHistoryPage(totalMoves, completedMoves, requestedPage = null, pageSize = HISTORY_PAGE_SIZE) {
  const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : HISTORY_PAGE_SIZE;
  const total = Math.max(0, Math.trunc(totalMoves) || 0);
  const completed = Math.max(0, Math.min(total, Math.trunc(completedMoves) || 0));
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.max(0, Math.ceil(completed / size) - 1);
  const page = Number.isInteger(requestedPage)
    ? Math.max(0, Math.min(pageCount - 1, requestedPage))
    : current;
  return {
    page,
    pageCount,
    start: page * size,
    end: Math.min(total, (page + 1) * size),
    canPrevious: page > 0,
    canNext: page < pageCount - 1,
  };
}
