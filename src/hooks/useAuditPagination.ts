import { useState, useCallback, useRef } from 'react';
import { PaginationState, initialPaginationState } from '../model/auditLog';

export interface UseAuditPaginationResult {
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  pagingCookieRef: React.MutableRefObject<string | undefined>;
  pagingCookieCacheRef: React.MutableRefObject<Map<number, string>>;
  setPage: (page: number) => void;
  canNavigateToPage: (page: number) => boolean;
  goToNextPage: () => void;
  goToFirstPage: () => void;
  setPageSize: (size: number) => void;
  resetPagination: () => void;
}

/**
 * Hook for managing audit log pagination state
 *
 * Dataverse FetchXML paging notes:
 * - Uses page number and count attributes in FetchXML
 * - Uses paging cookie for efficient navigation
 * - Paging cookies are cached by page number to enable backward navigation
 *
 * @see https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/page-results
 */
export function useAuditPagination(): UseAuditPaginationResult {
  const [pagination, setPagination] = useState<PaginationState>(initialPaginationState);

  // Ref to track current paging cookie for pagination (avoids dependency cycle)
  const pagingCookieRef = useRef<string | undefined>(undefined);

  // Cache of paging cookies by page number (to enable backward navigation)
  // Key is the page number, value is the paging cookie needed to fetch that page
  // Page 1 doesn't need a cookie, page 2 needs the cookie from page 1's response, etc.
  const pagingCookieCacheRef = useRef<Map<number, string>>(new Map());

  /**
   * Go to the next page using the stored paging cookie.
   */
  const goToNextPage = useCallback(() => {
    setPagination(p => ({ ...p, pageNumber: p.pageNumber + 1 }));
  }, []);

  /**
   * Go back to the first page by clearing the paging cookie and resetting page number.
   */
  const goToFirstPage = useCallback(() => {
    pagingCookieRef.current = undefined;
    setPagination(p => ({ ...p, pageNumber: 1, pagingCookie: undefined }));
  }, []);

  /**
   * Check if we can navigate to a specific page.
   * Returns true if:
   * - It's page 1 (no cookie needed)
   * - It's the next page (current + 1, cookie is in pagingCookieRef)
   * - We have a cached cookie for that page
   */
  const canNavigateToPage = useCallback((page: number): boolean => {
    if (page === 1) return true;
    if (page === pagination.pageNumber + 1 && pagingCookieRef.current) return true;
    if (pagingCookieCacheRef.current.has(page)) return true;
    return false;
  }, [pagination.pageNumber]);

  /**
   * Navigate to a specific page.
   * Supports forward, backward, and jump navigation using cached paging cookies.
   */
  const setPage = useCallback((page: number) => {
    setPagination(p => {
      if (page === p.pageNumber) {
        // Same page, no change needed
        return p;
      }

      if (page === 1) {
        // Going to first page - no paging cookie needed
        pagingCookieRef.current = undefined;
        return { ...p, pageNumber: 1, pagingCookie: undefined };
      }

      if (page === p.pageNumber + 1) {
        // Going forward by one - use current paging cookie (already set)
        return { ...p, pageNumber: page };
      }

      // Going backward or jumping - try to use cached paging cookie
      const cachedCookie = pagingCookieCacheRef.current.get(page);
      if (cachedCookie) {
        pagingCookieRef.current = cachedCookie;
        return { ...p, pageNumber: page };
      }

      // No cached cookie available - stay on current page
      // This happens when trying to jump to a page we haven't visited yet
      console.warn(`[Pagination] No cached paging cookie for page ${page}, staying on current page`);
      return p;
    });
  }, []);

  const setPageSize = useCallback((size: number) => {
    // Clear all paging state when page size changes
    pagingCookieRef.current = undefined;
    pagingCookieCacheRef.current.clear();
    setPagination(p => ({ ...p, pageSize: size, pageNumber: 1, pagingCookie: undefined }));
  }, []);

  const resetPagination = useCallback(() => {
    setPagination(initialPaginationState);
    pagingCookieRef.current = undefined;
    pagingCookieCacheRef.current.clear();
  }, []);

  return {
    pagination,
    setPagination,
    pagingCookieRef,
    pagingCookieCacheRef,
    setPage,
    canNavigateToPage,
    goToNextPage,
    goToFirstPage,
    setPageSize,
    resetPagination,
  };
}
