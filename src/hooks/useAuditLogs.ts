import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AuditLogEntry,
  AuditFiltersState,
  PaginationState,
  AuditDetail,
  SortState,
  SortColumn,
} from '../model/auditLog';
import {
  queryAuditLogs,
  getAuditDetails,
  getRecordChangeHistory,
  getCachedDetails,
  clearAuditDetailsCache,
} from '../services/auditLogService';
import { useAuditFilters } from './useAuditFilters';
import { useAuditPagination } from './useAuditPagination';
import { useAuditSorting } from './useAuditSorting';

interface UseAuditLogsResult {
  // Data
  entries: AuditLogEntry[];
  detailsMap: Map<string, AuditDetail[]>;

  // Loading states
  isLoading: boolean;
  isLoadingDetails: boolean;

  // Pagination
  pagination: PaginationState;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  canNavigateToPage: (page: number) => boolean;

  // Sorting
  sort: SortState;
  setSort: (column: SortColumn) => void;

  // Filters
  filters: AuditFiltersState;
  setTables: (logicalNames: string[]) => void;
  setRecord: (id: string | null, name: string | null) => void;
  setSelectedAttributes: (attributes: string[]) => void;
  setOperations: (operations: number[]) => void;
  setActions: (actions: number[]) => void;
  setFromDate: (date: Date | null) => void;
  setToDate: (date: Date | null) => void;
  setUsers: (users: Array<{ id: string; name: string }>) => void;
  setSecurityRoles: (roles: Array<{ id: string; name: string }>) => void;
  clearFilters: () => void;

  // Actions
  refresh: () => Promise<void>;
  loadDetails: (entryId: string, entityLogicalName?: string) => Promise<void>;
  toggleExpanded: (entryId: string) => void;

  // Error
  error: string | null;
}

/**
 * Main hook for managing audit log state
 * Composes useAuditFilters, useAuditPagination, and useAuditSorting
 * @param isConnected - Whether there's an active Dataverse connection
 */
export function useAuditLogs(isConnected: boolean = false): UseAuditLogsResult {
  // Entry state
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [detailsMap, setDetailsMap] = useState<Map<string, AuditDetail[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to track latest entries for use in callbacks
  const entriesRef = useRef<AuditLogEntry[]>(entries);
  entriesRef.current = entries;

  // Compose pagination hook
  const {
    pagination,
    setPagination,
    pagingCookieRef,
    pagingCookieCacheRef,
    setPage,
    canNavigateToPage,
    setPageSize,
    resetPagination,
  } = useAuditPagination();

  // Handle filter changes by resetting pagination and clearing cache
  const handleFilterChange = useCallback(() => {
    resetPagination();
    setDetailsMap(new Map());
    clearAuditDetailsCache();
  }, [resetPagination]);

  // Compose filters hook with pagination reset callback
  const {
    filters,
    setTables: setTablesBase,
    setRecord: setRecordBase,
    setSelectedAttributes,
    setOperations,
    setActions,
    setFromDate,
    setToDate,
    setUsers,
    setSecurityRoles,
    clearFilters: clearFiltersBase,
  } = useAuditFilters(handleFilterChange);

  // Wrap setTables to also clear details
  const setTables = useCallback((logicalNames: string[]) => {
    setTablesBase(logicalNames);
    setDetailsMap(new Map());
    clearAuditDetailsCache();
  }, [setTablesBase]);

  // Wrap setRecord to keep the filter change behavior
  const setRecord = useCallback((id: string | null, name: string | null) => {
    setRecordBase(id, name);
  }, [setRecordBase]);

  // Wrap clearFilters
  const clearFilters = useCallback(() => {
    clearFiltersBase();
  }, [clearFiltersBase]);

  // Compose sorting hook
  const { sort, setSort, sortedEntries } = useAuditSorting(entries);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    console.log('[AuditLogs] fetchAuditLogs called, isConnected:', isConnected, 'tables:', filters.tableLogicalNames, 'page:', pagination.pageNumber, 'pagingCookie:', pagingCookieRef.current ? 'present' : 'none');

    if (!isConnected) {
      console.log('[AuditLogs] Not connected, skipping fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[AuditLogs] Querying audit logs...');
      let result;

      // Build pagination object with current paging cookie from ref
      const paginationWithCookie = {
        ...pagination,
        pagingCookie: pagingCookieRef.current,
      };

      // Use different API based on whether a specific record is selected
      if (filters.recordId && filters.tableLogicalNames.length === 1) {
        console.log('[AuditLogs] Fetching record change history');
        const historyResult = await getRecordChangeHistory(
          filters.tableLogicalNames[0],
          filters.recordId,
          paginationWithCookie
        );
        result = {
          entries: historyResult.entries || [],
          totalCount: historyResult.totalCount || 0,
          hasMoreRecords: historyResult.hasMoreRecords || false,
          pagingCookie: historyResult.pagingCookie,
        };
        // Merge details from history API
        if (historyResult.details) {
          setDetailsMap(prev => new Map([...prev, ...historyResult.details]));
        }
      } else {
        // Fetch audit logs (with or without table filter)
        console.log('[AuditLogs] Fetching audit logs');
        result = await queryAuditLogs(filters, paginationWithCookie);
      }

      console.log('[AuditLogs] Query complete, entries:', result?.entries?.length || 0, 'hasMore:', result?.hasMoreRecords);
      setEntries(result?.entries || []);

      // Update the paging cookie ref for next pagination
      pagingCookieRef.current = result?.pagingCookie;

      // Cache the paging cookie for backward navigation
      // The cookie returned from page N is needed to fetch page N+1
      if (result?.pagingCookie) {
        pagingCookieCacheRef.current.set(pagination.pageNumber + 1, result.pagingCookie);
      }

      setPagination(p => ({
        ...p,
        totalCount: result?.totalCount || 0,
        hasMoreRecords: result?.hasMoreRecords || false,
      }));
    } catch (err) {
      console.error('[AuditLogs] Error fetching audit logs:', err);
      const message = err instanceof Error ? err.message : 'Failed to load audit logs';
      setError(message);
      setEntries([]);
    } finally {
      console.log('[AuditLogs] Fetch complete, setting isLoading to false');
      setIsLoading(false);
    }
  }, [isConnected, filters, pagination.pageNumber, pagination.pageSize, pagingCookieRef, setPagination]);

  // Fetch when connected and filters or pagination changes
  useEffect(() => {
    if (isConnected) {
      fetchAuditLogs();
    }
  }, [isConnected, fetchAuditLogs]);

  // Load details for a specific entry
  const loadDetails = useCallback(async (entryId: string, entityLogicalName?: string) => {
    console.log('[AuditLogs] loadDetails called for:', entryId, 'entity:', entityLogicalName);

    // Check if already loaded
    if (detailsMap.has(entryId)) {
      console.log('[AuditLogs] Details already loaded for:', entryId);
      return;
    }

    // Check cache
    const cached = getCachedDetails(entryId);
    if (cached) {
      console.log('[AuditLogs] Using cached details for:', entryId);
      setDetailsMap(prev => new Map(prev).set(entryId, cached));
      return;
    }

    // Find the entry
    const entry = entries.find(e => e.id === entryId);

    // Determine entity logical name
    let resolvedEntityName = entityLogicalName;
    if (!resolvedEntityName) {
      resolvedEntityName = (filters.tableLogicalNames.length === 1 ? filters.tableLogicalNames[0] : null) || entry?.objectTypeCode;
    }

    if (!resolvedEntityName) {
      console.warn('[AuditLogs] Cannot load details: no entity logical name');
      return;
    }

    console.log('[AuditLogs] Fetching details for:', entryId, 'entity:', resolvedEntityName);
    setIsLoadingDetails(true);

    try {
      const details = await getAuditDetails(entryId, resolvedEntityName, entry);
      console.log('[AuditLogs] Got details:', details?.length || 0, 'items');
      setDetailsMap(prev => new Map(prev).set(entryId, details));
    } catch (err) {
      console.error('[AuditLogs] Failed to load audit details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [entries, filters.tableLogicalNames, detailsMap]);

  // Toggle expanded state for an entry
  const toggleExpanded = useCallback((entryId: string) => {
    // Check current state using ref to avoid stale closure
    const entry = entriesRef.current.find(e => e.id === entryId);
    const isCurrentlyExpanded = entry?.isExpanded || false;

    // Update the expanded state
    setEntries(prev =>
      prev.map(e =>
        e.id === entryId
          ? { ...e, isExpanded: !e.isExpanded }
          : e
      )
    );

    // If we're expanding (not currently expanded), load details
    if (!isCurrentlyExpanded) {
      loadDetails(entryId);
    }
  }, [loadDetails]);

  return {
    entries: sortedEntries,
    detailsMap,
    isLoading,
    isLoadingDetails,
    pagination,
    setPage,
    setPageSize,
    canNavigateToPage,
    sort,
    setSort,
    filters,
    setTables,
    setRecord,
    setSelectedAttributes,
    setOperations,
    setActions,
    setFromDate,
    setToDate,
    setUsers,
    setSecurityRoles,
    clearFilters,
    refresh: fetchAuditLogs,
    loadDetails,
    toggleExpanded,
    error,
  };
}
