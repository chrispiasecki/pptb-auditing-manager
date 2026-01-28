import React, { useState, useEffect, useCallback } from 'react';
import { AuditLogEntry, AuditDetail } from '../../model/auditLog';
import { retrieveRecordChangeHistory, getAuditDetails } from '../../services/auditLogService';
import { formatDateTime } from '../../utils/formatters';
import { getOperationColor } from '../../utils/auditHelpers';
import { DismissIcon, InfoIcon } from '../common/Icons';

interface RecordHistoryDialogProps {
  entry: AuditLogEntry | null;
  isOpen: boolean;
  onClose: () => void;
  tableDisplayName?: string;
}

// Map operation color to Tailwind class
function getOperationBadgeClass(operation: number): string {
  const color = getOperationColor(operation);
  switch (color) {
    case 'success':
      return 'badge-success';
    case 'warning':
      return 'badge-warning';
    case 'danger':
      return 'badge-danger';
    case 'informative':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
}

export const RecordHistoryDialog: React.FC<RecordHistoryDialogProps> = ({
  entry,
  isOpen,
  onClose,
  tableDisplayName,
}) => {
  const [historyEntries, setHistoryEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [entryDetails, setEntryDetails] = useState<Map<string, AuditDetail[]>>(new Map());
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Fetch record history when dialog opens
  useEffect(() => {
    if (isOpen && entry?.objectTypeCode && entry?.objectId) {
      setIsLoading(true);
      setError(null);
      setHistoryEntries([]);
      setExpandedEntryId(null);
      setEntryDetails(new Map());

      retrieveRecordChangeHistory(entry.objectTypeCode, entry.objectId)
        .then(entries => {
          setHistoryEntries(entries);
        })
        .catch(err => {
          console.error('[RecordHistoryDialog] Error:', err);
          setError(err.message || 'Failed to retrieve record history');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, entry?.objectTypeCode, entry?.objectId]);

  // Handle viewing details for a specific entry
  const handleViewDetails = useCallback(async (historyEntry: AuditLogEntry) => {
    if (expandedEntryId === historyEntry.id) {
      setExpandedEntryId(null);
      return;
    }

    setExpandedEntryId(historyEntry.id);

    // Check if we already have details
    if (entryDetails.has(historyEntry.id)) {
      return;
    }

    setIsLoadingDetails(true);
    try {
      const details = await getAuditDetails(historyEntry.id, historyEntry.objectTypeCode, historyEntry);
      setEntryDetails(prev => new Map(prev).set(historyEntry.id, details));
    } catch (err) {
      console.error('[RecordHistoryDialog] Error loading details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [expandedEntryId, entryDetails]);

  if (!isOpen || !entry) return null;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner spinner-md text-blue-600" />
            <span className="text-foreground-3">Loading record history...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-6 text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      );
    }

    if (historyEntries.length === 0) {
      return (
        <div className="py-12 text-center text-foreground-3">
          No change history found for this record
        </div>
      );
    }

    return (
      <div className="overflow-auto border border-stroke-1 rounded max-h-[400px]">
        <table className="table w-full min-w-[600px]">
          <thead className="table-header sticky top-0 bg-background-3 z-10">
            <tr>
              <th className="w-10 p-0" />
              <th className="px-3 py-2 font-semibold text-left">Date/Time</th>
              <th className="px-3 py-2 font-semibold text-left">Operation</th>
              <th className="px-3 py-2 font-semibold text-left">Action</th>
              <th className="px-3 py-2 font-semibold text-left">Changed By</th>
            </tr>
          </thead>
          <tbody>
            {historyEntries.map(historyEntry => {
              const isExpanded = expandedEntryId === historyEntry.id;
              const details = entryDetails.get(historyEntry.id) || [];
              const attributeDetails = details.filter(d => d.type === 'attribute');
              const badgeClass = getOperationBadgeClass(historyEntry.operation);

              return (
                <React.Fragment key={historyEntry.id}>
                  <tr className="table-row">
                    <td className="p-1 text-center">
                      <button
                        className="btn-icon btn-subtle p-1"
                        onClick={() => handleViewDetails(historyEntry)}
                        title={isExpanded ? 'Hide details' : 'Show details'}
                      >
                        <InfoIcon className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                      {formatDateTime(historyEntry.createdOn)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`badge ${badgeClass}`}>
                        {historyEntry.operationLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {historyEntry.actionLabel}
                    </td>
                    <td className="px-3 py-2 text-truncate" title={historyEntry.userName}>
                      {historyEntry.userName}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="bg-background-2 p-3">
                        {isLoadingDetails && !entryDetails.has(historyEntry.id) ? (
                          <div className="flex items-center gap-2">
                            <div className="spinner spinner-sm text-blue-600" />
                            <span className="text-sm text-foreground-3">Loading details...</span>
                          </div>
                        ) : attributeDetails.length === 0 ? (
                          <span className="text-xs text-foreground-3">No attribute changes recorded</span>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-2 pb-1 border-b border-stroke-2">
                              <span className="font-semibold text-xs">Attribute</span>
                              <span className="font-semibold text-xs">Old Value</span>
                              <span className="font-semibold text-xs">New Value</span>
                            </div>
                            {attributeDetails.map((detail, idx) => (
                              <div key={idx} className="grid grid-cols-3 gap-2 py-1 border-b border-stroke-2 text-xs">
                                <span>{detail.type === 'attribute' ? detail.attributeDisplayName : ''}</span>
                                <span className="text-red-600 dark:text-red-400">
                                  {detail.type === 'attribute' ? (detail.oldValue || '(empty)') : ''}
                                </span>
                                <span className="text-green-600 dark:text-green-400">
                                  {detail.type === 'attribute' ? (detail.newValue || '(empty)') : ''}
                                </span>
                              </div>
                            ))}
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div className="dialog-backdrop" onClick={onClose} />

      {/* Dialog */}
      <div className="dialog max-w-4xl w-[95vw] max-h-[80vh]">
        <div className="dialog-header">
          <span className="font-semibold text-lg">Record Change History</span>
          <button className="btn-icon btn-subtle" onClick={onClose}>
            <DismissIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="dialog-body">
          {/* Record info header */}
          <div className="flex gap-8 p-3 bg-background-3 rounded mb-4">
            {tableDisplayName && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-foreground-3">Table</span>
                <span className="font-semibold">{tableDisplayName}</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-foreground-3">Record</span>
              <span className="font-semibold">{entry.objectName}</span>
            </div>
          </div>

          {/* History entries */}
          {renderContent()}
        </div>
        <div className="dialog-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
};
