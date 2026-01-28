import { useState, useCallback, useEffect, useMemo } from 'react';
import type { AttributeAuditInfo, BulkOperationResult } from '../model/audit';
import {
  getAttributesForTable,
  bulkUpdateAttributeAudit,
  publishCustomizations,
} from '../services/auditService';

export function useAttributeAudit(entityLogicalName: string | null) {
  const [attributes, setAttributes] = useState<AttributeAuditInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchAttributes = useCallback(async () => {
    if (!entityLogicalName) {
      setAttributes([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedIds(new Set());

    try {
      const result = await getAttributesForTable(entityLogicalName);
      setAttributes(result);
    } catch (err) {
      setError((err as Error).message);
      setAttributes([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityLogicalName]);

  // Filter attributes by search term
  const filteredAttributes = useMemo(() => {
    if (searchTerm === '') return attributes;
    return attributes.filter(
      attr =>
        attr.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attr.logicalName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [attributes, searchTerm]);

  // Get selected attributes
  const selectedAttributes = useMemo(() => {
    return attributes.filter(a => selectedIds.has(a.metadataId));
  }, [attributes, selectedIds]);

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
    const ids = filteredAttributes
      .filter(a => a.canModifyAuditSettings)
      .map(a => a.metadataId);
    setSelectedIds(new Set(ids));
  }, [filteredAttributes]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk update
  const bulkToggleAudit = useCallback(async (isEnabled: boolean): Promise<BulkOperationResult> => {
    if (!entityLogicalName) {
      return { success: 0, failed: 0, errors: ['No table selected'] };
    }

    const attributesToUpdate = selectedAttributes.filter(a => a.canModifyAuditSettings);

    if (attributesToUpdate.length === 0) {
      return { success: 0, failed: 0, errors: ['No attributes selected'] };
    }

    setIsUpdating(true);
    setError(null);

    try {
      const result = await bulkUpdateAttributeAudit(entityLogicalName, attributesToUpdate, isEnabled);

      // Publish customizations if any succeeded
      if (result.success > 0) {
        try {
          await publishCustomizations(entityLogicalName);
        } catch (pubErr) {
          console.error('Failed to publish customizations:', pubErr);
        }
      }

      // Refresh data
      await fetchAttributes();
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
        message = `Updated ${result.success} attributes. ${result.failed} failed: ${result.errors[0] || 'Unknown error'}`;
        notificationType = 'warning';
      } else {
        // All succeeded
        message = `Successfully updated ${result.success} attribute${result.success !== 1 ? 's' : ''}`;
        notificationType = 'success';
      }

      await window.toolboxAPI.utils.showNotification({
        title: isEnabled ? 'Attribute Audit Enabled' : 'Attribute Audit Disabled',
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
  }, [entityLogicalName, selectedAttributes, fetchAttributes, clearSelection]);

  // Fetch attributes when entity changes
  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  // Clear search when entity changes
  useEffect(() => {
    setSearchTerm('');
  }, [entityLogicalName]);

  return {
    attributes,
    filteredAttributes,
    isLoading,
    isUpdating,
    error,
    searchTerm,
    setSearchTerm,
    selectedIds,
    selectedAttributes,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkToggleAudit,
    refresh: fetchAttributes,
  };
}
