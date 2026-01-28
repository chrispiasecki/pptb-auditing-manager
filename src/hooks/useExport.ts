import { useState, useCallback } from 'react';
import { AuditDetail, AuditFiltersState } from '../model/auditLog';
import { ExportFormat, ExportResult, AuditTabType } from '../model/export';
import { exportAuditLogs } from '../services/exportService';
import { getAuditDetails, queryAllAuditLogs } from '../services/auditLogService';

// Maximum records when including details (due to additional API calls)
const MAX_RECORDS_WITH_DETAILS = 5000;

interface UseExportResult {
  isExporting: boolean;
  exportProgress: string | null;
  error: string | null;
  lastExport: ExportResult | null;
  exportToCSV: (includeDetails?: boolean) => Promise<ExportResult>;
  exportData: (format: ExportFormat, includeDetails?: boolean) => Promise<ExportResult>;
}

/**
 * Hook to manage export functionality
 * Fetches ALL records matching the current filters for export
 *
 * @param filters - Current filter state to fetch all matching records
 * @param detailsMap - Cached details map (used as starting point)
 * @param tabType - Current tab type for formatting
 */
export function useExport(
  filters: AuditFiltersState,
  detailsMap: Map<string, AuditDetail[]>,
  tabType: AuditTabType = 'details'
): UseExportResult {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  const exportData = useCallback(async (
    format: ExportFormat,
    includeDetails: boolean = true
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setError(null);
    setExportProgress('Fetching records...');

    try {
      // Determine max records based on whether we're including details
      // Details require additional API calls, so we cap at 5000
      const shouldIncludeDetails = tabType === 'access' ? false : includeDetails;
      const maxRecords = shouldIncludeDetails ? MAX_RECORDS_WITH_DETAILS : 0;

      console.log('[Export] Starting export, includeDetails:', shouldIncludeDetails, 'maxRecords:', maxRecords);

      // Fetch ALL records matching the current filters
      const { entries } = await queryAllAuditLogs(
        filters,
        maxRecords,
        (fetched, total) => {
          const limitInfo = maxRecords > 0 ? ` (max ${maxRecords})` : '';
          setExportProgress(`Fetching records: ${fetched} of ${total}${limitInfo}...`);
        }
      );

      if (entries.length === 0) {
        const result = { success: false, error: 'No data to export' };
        setLastExport(result);
        return result;
      }

      console.log('[Export] Fetched', entries.length, 'entries for export');

      // If including details, load details for all entries
      let exportDetailsMap = new Map(detailsMap);

      if (shouldIncludeDetails) {
        // Find entries that don't have details loaded yet
        const entriesToLoad = entries.filter(entry => !exportDetailsMap.has(entry.id));

        if (entriesToLoad.length > 0) {
          setExportProgress(`Loading change details: 0 of ${entriesToLoad.length}...`);
          console.log(`[Export] Loading details for ${entriesToLoad.length} entries...`);

          // Process in batches to avoid overwhelming the API
          const batchSize = 50;
          let loadedCount = 0;

          for (let i = 0; i < entriesToLoad.length; i += batchSize) {
            const batch = entriesToLoad.slice(i, i + batchSize);

            // Create promises for this batch
            const detailsPromises = batch.map(async (entry) => {
              try {
                const details = await getAuditDetails(entry.id, entry.objectTypeCode, entry);
                return { entryId: entry.id, details };
              } catch (err) {
                console.warn(`[Export] Failed to load details for ${entry.id}:`, err);
                return { entryId: entry.id, details: [] };
              }
            });

            // Use toolbox executeParallel to run batch requests concurrently
            const results = await window.toolboxAPI.utils.executeParallel(...detailsPromises);

            // Add results to the map
            for (const { entryId, details } of results) {
              exportDetailsMap.set(entryId, details);
            }

            loadedCount += batch.length;
            setExportProgress(`Loading change details: ${loadedCount} of ${entriesToLoad.length}...`);
          }

          console.log(`[Export] Details loaded for ${entriesToLoad.length} entries`);
        }
      }

      setExportProgress('Generating CSV...');

      const result = await exportAuditLogs(entries, exportDetailsMap, {
        format,
        includeDetails: shouldIncludeDetails,
        tabType,
      });

      setLastExport(result);

      if (!result.success) {
        setError(result.error || 'Export failed');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      const result = { success: false, error: message };
      setError(message);
      setLastExport(result);
      return result;
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  }, [filters, detailsMap, tabType]);

  const exportToCSV = useCallback(
    (includeDetails: boolean = true) => exportData('csv', includeDetails),
    [exportData]
  );

  return {
    isExporting,
    exportProgress,
    error,
    lastExport,
    exportToCSV,
    exportData,
  };
}
