import { useState, useCallback, useMemo } from 'react';
import { AuditLogEntry, SortState, SortColumn, initialSortState } from '../model/auditLog';

export interface UseAuditSortingResult {
  sort: SortState;
  setSort: (column: SortColumn) => void;
  sortedEntries: AuditLogEntry[];
}

/**
 * Hook for managing audit log sorting state
 * @param entries - The entries to sort
 */
export function useAuditSorting(entries: AuditLogEntry[]): UseAuditSortingResult {
  const [sort, setSortState] = useState<SortState>(initialSortState);

  // Handle column sort - toggles between asc, desc, null
  const setSort = useCallback((column: SortColumn) => {
    setSortState(prev => {
      if (prev.column === column) {
        // Cycle: desc -> asc -> null -> desc
        if (prev.direction === 'desc') {
          return { column, direction: 'asc' };
        } else if (prev.direction === 'asc') {
          return { column: null, direction: null };
        } else {
          return { column, direction: 'desc' };
        }
      }
      // New column - start with desc
      return { column, direction: 'desc' };
    });
  }, []);

  // Sort entries client-side based on sort state
  const sortedEntries = useMemo(() => {
    if (!sort.column || !sort.direction) {
      return entries;
    }

    return [...entries].sort((a, b) => {
      let comparison = 0;
      switch (sort.column) {
        case 'createdOn':
          comparison = new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime();
          break;
        case 'operation':
          comparison = a.operation - b.operation;
          break;
        case 'action':
          comparison = a.action - b.action;
          break;
        case 'objectName':
          comparison = (a.objectName || '').localeCompare(b.objectName || '');
          break;
        case 'userName':
          comparison = (a.userName || '').localeCompare(b.userName || '');
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [entries, sort.column, sort.direction]);

  return {
    sort,
    setSort,
    sortedEntries,
  };
}
