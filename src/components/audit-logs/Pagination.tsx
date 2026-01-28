import React, { useCallback } from 'react';
import { PaginationState } from '../../model/auditLog';
import { pageSizeOptions } from '../../utils/constants';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '../common/Icons';

interface PaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  canNavigateToPage?: (page: number) => boolean;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  canNavigateToPage,
  disabled = false,
}) => {
  const { pageNumber, pageSize, totalCount, hasMoreRecords } = pagination;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRecord = totalCount > 0 ? (pageNumber - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(pageNumber * pageSize, totalCount);

  const canGoPrevious = pageNumber > 1;
  const canGoNext = pageNumber < totalPages || hasMoreRecords;
  // Can only go to last page if we can navigate there (have cached paging cookie)
  const canGoToLast = canGoNext && totalPages > pageNumber &&
    (canNavigateToPage ? canNavigateToPage(totalPages) : true);

  const handleFirstPage = useCallback(() => {
    if (canGoPrevious) {
      onPageChange(1);
    }
  }, [canGoPrevious, onPageChange]);

  const handlePreviousPage = useCallback(() => {
    if (canGoPrevious) {
      onPageChange(pageNumber - 1);
    }
  }, [canGoPrevious, pageNumber, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (canGoNext) {
      onPageChange(pageNumber + 1);
    }
  }, [canGoNext, pageNumber, onPageChange]);

  const handleLastPage = useCallback(() => {
    if (canGoToLast && totalPages > 0) {
      onPageChange(totalPages);
    }
  }, [canGoToLast, totalPages, onPageChange]);

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onPageSizeChange(Number(e.target.value));
    },
    [onPageSizeChange]
  );

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2">
        <button
          className="btn-icon btn-subtle"
          onClick={handleFirstPage}
          disabled={disabled || !canGoPrevious}
          title="First page"
        >
          <ChevronDoubleLeftIcon className="w-5 h-5" />
        </button>
        <button
          className="btn-icon btn-subtle"
          onClick={handlePreviousPage}
          disabled={disabled || !canGoPrevious}
          title="Previous page"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <span className="text-foreground-2 whitespace-nowrap text-sm">
          Page {pageNumber} of {totalPages}
        </span>
        <button
          className="btn-icon btn-subtle"
          onClick={handleNextPage}
          disabled={disabled || !canGoNext}
          title="Next page"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
        <button
          className="btn-icon btn-subtle"
          onClick={handleLastPage}
          disabled={disabled || !canGoToLast}
          title="Last page"
        >
          <ChevronDoubleRightIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-foreground-2 whitespace-nowrap text-sm">
          Showing {startRecord}-{endRecord} of {totalCount}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-foreground-2 text-sm">Page size:</span>
          <select
            className="select min-w-[80px] py-1"
            value={String(pageSize)}
            onChange={handlePageSizeChange}
            disabled={disabled}
          >
            {pageSizeOptions.map(opt => (
              <option key={opt.value} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
