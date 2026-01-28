import { useState, useCallback, useEffect, useMemo } from 'react';
import type { TableAuditInfo, TableFilterType, BulkOperationResult } from '../model/audit';
import {
  getAllTablesWithAuditInfo,
  bulkUpdateTableAudit,
  publishCustomizations,
} from '../services/auditService';

export function useTableAudit() {
  const [tables, setTables] = useState<TableAuditInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TableFilterType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchTables = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAllTablesWithAuditInfo();
      setTables(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter and search tables
  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      // Apply search filter
      const matchesSearch =
        searchTerm === '' ||
        table.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        table.logicalName.toLowerCase().includes(searchTerm.toLowerCase());

      // Apply type filter
      let matchesFilter = true;
      switch (filterType) {
        case 'auditEnabled':
          matchesFilter = table.isAuditEnabled;
          break;
        case 'auditDisabled':
          matchesFilter = !table.isAuditEnabled;
          break;
        case 'custom':
          matchesFilter = table.isCustomEntity;
          break;
        case 'system':
          matchesFilter = !table.isCustomEntity;
          break;
      }

      return matchesSearch && matchesFilter;
    });
  }, [tables, searchTerm, filterType]);

  // Get selected tables
  const selectedTables = useMemo(() => {
    return tables.filter(t => selectedIds.has(t.metadataId));
  }, [tables, selectedIds]);

  // Selection handlers
  const toggleSelection = useCallback((metadataId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(metadataId)) {
        next.delete(metadataId);
      } else {
        next.add(metadataId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const ids = filteredTables
      .filter(t => t.canModifyAuditSettings)
      .map(t => t.metadataId);
    setSelectedIds(new Set(ids));
  }, [filteredTables]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk update
  const bulkToggleAudit = useCallback(async (isEnabled: boolean): Promise<BulkOperationResult> => {
    const tablesToUpdate = selectedTables.filter(t => t.canModifyAuditSettings);

    if (tablesToUpdate.length === 0) {
      return { success: 0, failed: 0, errors: ['No tables selected'] };
    }

    setIsUpdating(true);
    setError(null);

    try {
      const result = await bulkUpdateTableAudit(tablesToUpdate, isEnabled);

      // Publish customizations if any succeeded
      if (result.success > 0) {
        try {
          await publishCustomizations();
        } catch (pubErr) {
          console.error('Failed to publish customizations:', pubErr);
        }
      }

      // Refresh data
      await fetchTables();
      clearSelection();

      // Build notification message with error details if any
      let message: string;
      let notificationType: 'success' | 'warning' | 'error';

      if (result.failed > 0 && result.success === 0) {
        // All failed
        message = result.errors.length > 0
          ? result.errors[0]
          : `All ${result.failed} updates failed`;
        notificationType = 'error';
      } else if (result.failed > 0) {
        // Some failed
        message = `Updated ${result.success} tables. ${result.failed} failed: ${result.errors[0] || 'Unknown error'}`;
        notificationType = 'warning';
      } else {
        // All succeeded
        message = `Successfully updated ${result.success} table${result.success !== 1 ? 's' : ''}`;
        notificationType = 'success';
      }

      await window.toolboxAPI.utils.showNotification({
        title: isEnabled ? 'Audit Enabled' : 'Audit Disabled',
        body: message,
        type: notificationType,
        duration: result.failed > 0 ? 5000 : 3000,
      });

      return result;
    } catch (err) {
      const errorMessage = (err as Error).message || String(err);
      setError(errorMessage);
      await window.toolboxAPI.utils.showNotification({
        title: 'Update Failed',
        body: errorMessage,
        type: 'error',
        duration: 5000,
      });
      return { success: 0, failed: 1, errors: [errorMessage] };
    } finally {
      setIsUpdating(false);
    }
  }, [selectedTables, fetchTables, clearSelection]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return {
    tables,
    filteredTables,
    isLoading,
    isUpdating,
    error,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    selectedIds,
    selectedTables,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkToggleAudit,
    refresh: fetchTables,
  };
}
