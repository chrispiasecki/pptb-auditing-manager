import React, { useCallback } from 'react';
import { AuditLogEntry } from '../../model/auditLog';
import { formatDateTime } from '../../utils/formatters';
import { getOperationColor } from '../../utils/auditHelpers';
import { InfoIcon, HistoryIcon } from '../common/Icons';

interface AuditLogRowProps {
  entry: AuditLogEntry;
  onViewDetails: (entry: AuditLogEntry) => void;
  onViewRecordHistory: (entry: AuditLogEntry) => void;
  showTableColumn?: boolean;
  tableDisplayNames?: Map<string, string>;
  selectedTab?: string;
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

export const AuditLogRow: React.FC<AuditLogRowProps> = ({
  entry,
  onViewDetails,
  onViewRecordHistory,
  showTableColumn = false,
  tableDisplayNames = new Map(),
  selectedTab = 'details',
}) => {
  const handleViewDetails = useCallback(() => {
    onViewDetails(entry);
  }, [entry, onViewDetails]);

  const handleViewRecordHistory = useCallback(() => {
    onViewRecordHistory(entry);
  }, [entry, onViewRecordHistory]);

  // For metadata tab, check if objectName is just a GUID and show something more useful
  const isGuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const getRecordDisplay = () => {
    if (selectedTab === 'metadata' && isGuid(entry.objectName)) {
      const typeDisplay = tableDisplayNames.get(entry.objectTypeCode) || entry.objectTypeCode;
      return typeDisplay;
    }
    return entry.objectName;
  };

  const recordDisplay = getRecordDisplay();
  const badgeClass = getOperationBadgeClass(entry.operation);
  const isUserAccessTab = selectedTab === 'access';
  const isRoleChangesTab = selectedTab === 'roles';
  const isMetadataTab = selectedTab === 'metadata';

  // Disable record history button for now (TODO: re-enable when feature is complete)
  const canViewRecordHistory = false;

  // For Table column display - fall back to logical name if display name not found (e.g., deleted tables)
  const getTableDisplay = () => {
    const displayName = tableDisplayNames.get(entry.objectTypeCode);
    // Check if we have a valid display name (not empty, "none", or other invalid values)
    if (displayName && displayName.toLowerCase() !== 'none' && displayName !== '') {
      return displayName;
    }
    // Fall back to logical name for deleted tables - use objectTypeCode if valid
    if (entry.objectTypeCode && entry.objectTypeCode.toLowerCase() !== 'none' && entry.objectTypeCode !== '') {
      return entry.objectTypeCode;
    }
    // For metadata changes, the changeData might contain the table name
    if (isMetadataTab && entry.changeData) {
      // For Delete Entity (100), changeData is the table logical name
      // For Delete Attribute (101), changeData contains columns, not useful here
      const actionNum = entry.action as number;
      if (actionNum === 100) {
        return entry.changeData;
      }
    }
    return 'Unknown';
  };

  return (
    <tr className="table-row">
      {/* Hide action buttons for User Access tab */}
      {!isUserAccessTab && (
        <td className="w-[52px] min-w-[52px] max-w-[52px] p-0 text-center">
          <button
            className="btn-icon btn-subtle p-1"
            onClick={handleViewDetails}
            title="View details"
          >
            <InfoIcon className="w-4 h-4" />
          </button>
          <button
            className="btn-icon btn-subtle p-1"
            onClick={handleViewRecordHistory}
            title="View record change history"
            disabled={!canViewRecordHistory}
          >
            <HistoryIcon className="w-4 h-4" />
          </button>
        </td>
      )}
      <td className="w-[140px] whitespace-nowrap text-foreground-2 font-mono text-xs">
        {formatDateTime(entry.createdOn)}
      </td>
      <td className="w-[90px]">
        <span className={`badge ${badgeClass}`}>
          {entry.operationLabel}
        </span>
      </td>
      {/* Wider Action column for User Access and Role Changes tabs */}
      <td className={isUserAccessTab ? "w-[180px]" : isRoleChangesTab ? "w-[200px]" : "w-[100px]"}>
        {entry.actionLabel}
      </td>
      {/* Hide Table column for Role Changes tab (always Security Role) */}
      {showTableColumn && selectedTab !== 'roles' && (
        <td className="w-[120px] text-truncate" title={entry.objectTypeCode}>
          {getTableDisplay()}
        </td>
      )}
      {/* Hide Object column for Metadata tab */}
      {!isMetadataTab && (
        <td className="text-truncate" title={entry.objectName}>
          {recordDisplay}
        </td>
      )}
      {selectedTab !== 'access' && (
        <td className="w-[150px] text-truncate" title={entry.userName}>
          {entry.userName}
        </td>
      )}
    </tr>
  );
};
