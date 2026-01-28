import React from 'react';
import {
  AuditLogEntry,
  AuditDetail,
  AttributeAuditDetail,
  ShareAuditDetail,
  RolePrivilegeAuditDetail,
  UserAccessAuditDetail,
  RelationshipAuditDetail,
  MetadataAuditDetail,
} from '../../model/auditLog';
import { formatDateTime } from '../../utils/formatters';
import { getOperationColor } from '../../utils/auditHelpers';
import { DismissIcon } from '../common/Icons';

interface AuditDetailsDialogProps {
  entry: AuditLogEntry | null;
  details: AuditDetail[] | undefined;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  tableDisplayName?: string;
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

export const AuditDetailsDialog: React.FC<AuditDetailsDialogProps> = ({
  entry,
  details,
  isLoading,
  isOpen,
  onClose,
  tableDisplayName,
  selectedTab,
}) => {
  if (!isOpen || !entry) return null;

  const isUserAccessTab = selectedTab === 'access';
  const isMetadataTab = selectedTab === 'metadata';

  const badgeClass = getOperationBadgeClass(entry.operation);

  // Get table display name with fallback for metadata changes (deleted tables)
  const getTableDisplayForDialog = (): string => {
    // If we have a valid display name, use it
    if (tableDisplayName && tableDisplayName.toLowerCase() !== 'none' && tableDisplayName !== '') {
      return tableDisplayName;
    }
    // Fall back to objectTypeCode if valid
    if (entry.objectTypeCode && entry.objectTypeCode.toLowerCase() !== 'none' && entry.objectTypeCode !== '') {
      return entry.objectTypeCode;
    }
    // For Delete Entity (action 100), use changeData which contains the table logical name
    if (isMetadataTab && entry.changeData && (entry.action as number) === 100) {
      return entry.changeData;
    }
    return 'Unknown';
  };

  // Filter details by type
  const attributeDetails = details?.filter(
    (d): d is AttributeAuditDetail => d.type === 'attribute'
  ) || [];
  const shareDetails = details?.filter(
    (d): d is ShareAuditDetail => d.type === 'share'
  ) || [];
  const rolePrivilegeDetails = details?.filter(
    (d): d is RolePrivilegeAuditDetail => d.type === 'rolePrivilege'
  ) || [];
  const userAccessDetails = details?.filter(
    (d): d is UserAccessAuditDetail => d.type === 'userAccess'
  ) || [];
  const relationshipDetails = details?.filter(
    (d): d is RelationshipAuditDetail => d.type === 'relationship'
  ) || [];
  const metadataDetails = details?.filter(
    (d): d is MetadataAuditDetail => d.type === 'metadata'
  ) || [];

  // Format value for display
  const formatValue = (
    value: string | null,
    formattedValue?: string
  ): React.ReactNode => {
    const displayValue = formattedValue || value;

    if (displayValue === null || displayValue === undefined || displayValue === '') {
      return <span className="text-foreground-4 italic">(empty)</span>;
    }

    return displayValue;
  };

  // Render share details
  const renderShareDetails = () => {
    if (shareDetails.length === 0) return null;

    return shareDetails.map((detail, index) => (
      <div key={index} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 mb-3">
        <span className="font-semibold text-foreground-3">Shared With:</span>
        <span>{detail.principalName} ({detail.principalType})</span>

        <span className="font-semibold text-foreground-3">Previous Access:</span>
        <span className="text-red-600 dark:text-red-400">{detail.oldPrivileges || 'None'}</span>

        <span className="font-semibold text-foreground-3">New Access:</span>
        <span className="text-green-600 dark:text-green-400">{detail.newPrivileges || 'None'}</span>
      </div>
    ));
  };

  // Render role privilege details
  const renderRolePrivilegeDetails = () => {
    if (rolePrivilegeDetails.length === 0) return null;

    return rolePrivilegeDetails.map((detail, index) => (
      <div key={index}>
        {detail.oldRolePrivileges.length > 0 && (
          <>
            <span className="font-semibold text-foreground-3">
              Previous Privileges ({detail.oldRolePrivileges.length}):
            </span>
            <div className="flex flex-col gap-0.5 max-h-[200px] overflow-auto p-2 bg-background-2 rounded mt-1 mb-2">
              {detail.oldRolePrivileges.map((priv, i) => (
                <span key={i} className="text-xs">
                  {priv.privilegeName || priv.privilegeId} - {priv.depthLabel}
                </span>
              ))}
            </div>
          </>
        )}

        {detail.newRolePrivileges.length > 0 && (
          <>
            <span className="font-semibold text-foreground-3 mt-2">
              New Privileges ({detail.newRolePrivileges.length}):
            </span>
            <div className="flex flex-col gap-0.5 max-h-[200px] overflow-auto p-2 bg-background-2 rounded mt-1 mb-2">
              {detail.newRolePrivileges.map((priv, i) => (
                <span key={i} className="text-xs">
                  {priv.privilegeName || priv.privilegeId} - {priv.depthLabel}
                </span>
              ))}
            </div>
          </>
        )}

        {detail.invalidNewPrivileges.length > 0 && (
          <>
            <span className="font-semibold text-red-600 dark:text-red-400 mt-2">
              Invalid Privileges ({detail.invalidNewPrivileges.length}):
            </span>
            <div className="flex flex-col gap-0.5 max-h-[200px] overflow-auto p-2 bg-background-2 rounded mt-1">
              {detail.invalidNewPrivileges.map((priv, i) => (
                <span key={i} className="text-xs">{priv.privilegeName || priv.privilegeId}</span>
              ))}
            </div>
          </>
        )}
      </div>
    ));
  };

  // Render user access details
  const renderUserAccessDetails = () => {
    if (userAccessDetails.length === 0) return null;

    return userAccessDetails.map((detail, index) => (
      <div key={index} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 mb-3">
        <span className="font-semibold text-foreground-3">Access Time:</span>
        <span>{formatDateTime(detail.accessTime)}</span>

        {detail.interval > 0 && (
          <>
            <span className="font-semibold text-foreground-3">Interval:</span>
            <span>{detail.interval} minutes</span>
          </>
        )}
      </div>
    ));
  };

  // Render relationship details
  const renderRelationshipDetails = () => {
    if (relationshipDetails.length === 0) return null;

    return relationshipDetails.map((detail, index) => (
      <div key={index}>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 mb-2">
          <span className="font-semibold text-foreground-3">Relationship:</span>
          <span>{detail.relationshipName}</span>
        </div>

        {detail.targetRecords.length > 0 && (
          <>
            <span className="font-semibold text-foreground-3">
              Related Records ({detail.targetRecords.length}):
            </span>
            <div className="mt-1">
              {detail.targetRecords.map((record, i) => (
                <div key={i} className="px-2 py-0.5 bg-background-2 rounded mb-0.5">
                  <span>{record.name || record.id}</span>
                  {record.logicalName && (
                    <span className="text-xs text-foreground-3"> ({record.logicalName})</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    ));
  };

  // Render metadata change details
  const renderMetadataDetails = () => {
    if (metadataDetails.length === 0) return null;

    // Actions that show Enabled/Disabled status
    const auditChangeActions = [102, 103, 104];

    return metadataDetails.map((detail, index) => {
      const isAuditChangeAction = auditChangeActions.includes(detail.action);

      return (
        <div key={index}>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 mb-2">
            {/* For action 103 (Audit Change at Attribute Level), show column name */}
            {detail.action === 103 && detail.attributeDisplayName && (
              <>
                <span className="font-semibold text-foreground-3">Column:</span>
                <span>{detail.attributeDisplayName} ({detail.attributeLogicalName})</span>
              </>
            )}

            {/* For actions 102, 103, 104 show Enabled/Disabled status */}
            {isAuditChangeAction && detail.auditEnabled !== undefined && (
              <>
                <span className="font-semibold text-foreground-3">Audit Status:</span>
                <span className={detail.auditEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {detail.auditEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </>
            )}
          </div>

          {/* Show raw change data for non-audit-change actions */}
          {detail.changeData && !isAuditChangeAction && (
            <>
              {detail.action === 100 ? (
                // For Delete Entity (100), show inline
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <span className="font-semibold text-foreground-3">Deleted Table:</span>
                  <span>{detail.changeData}</span>
                </div>
              ) : detail.action === 101 ? (
                // For Delete Attribute (101), format the tilde-separated list
                <>
                  <span className="font-semibold text-foreground-3">Deleted Columns:</span>
                  <div className="mt-1 p-3 bg-background-2 rounded overflow-auto max-h-[300px]">
                    <div className="flex flex-col gap-0.5">
                      {detail.changeData.includes('~')
                        ? detail.changeData.split('~').map((column, i) => (
                            <span key={i} className="text-xs font-mono">{column}</span>
                          ))
                        : <span className="text-xs font-mono">{detail.changeData}</span>
                      }
                    </div>
                  </div>
                </>
              ) : detail.parsedChangeData ? (
                <div className="mt-1 p-3 bg-background-2 rounded overflow-auto max-h-[300px]">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(detail.parsedChangeData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="mt-1 p-3 bg-background-2 rounded overflow-auto max-h-[300px]">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                    {detail.changeData}
                  </pre>
                </div>
              )}
            </>
          )}

          {/* For audit change actions without auditEnabled, show raw data as fallback */}
          {isAuditChangeAction && detail.auditEnabled === undefined && detail.changeData && (
            <>
              <span className="font-semibold text-foreground-3">Change Data:</span>
              <div className="mt-1 p-3 bg-background-2 rounded overflow-auto max-h-[300px]">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                  {detail.changeData}
                </pre>
              </div>
            </>
          )}

          {!detail.changeData && !isAuditChangeAction && (
            <div className="text-foreground-3 italic">No change data recorded</div>
          )}
        </div>
      );
    });
  };

  // Determine what type of details we have
  const hasAttributeDetails = attributeDetails.length > 0;
  const hasShareDetails = shareDetails.length > 0;
  const hasRoleDetails = rolePrivilegeDetails.length > 0;
  const hasUserAccessDetails = userAccessDetails.length > 0;
  const hasRelationshipDetails = relationshipDetails.length > 0;
  const hasMetadataDetails = metadataDetails.length > 0;
  const hasAnyDetails = hasAttributeDetails || hasShareDetails || hasRoleDetails || hasUserAccessDetails || hasRelationshipDetails || hasMetadataDetails;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner spinner-md text-blue-600" />
            <span className="text-foreground-3">Loading details...</span>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Metadata section */}
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 mb-4">
          <span className="font-semibold text-foreground-3">Date/Time:</span>
          <span>{formatDateTime(entry.createdOn)}</span>

          <span className="font-semibold text-foreground-3">Operation:</span>
          <div>
            <span className={`badge ${badgeClass}`}>{entry.operationLabel}</span>
          </div>

          <span className="font-semibold text-foreground-3">Action:</span>
          <span>{entry.actionLabel}</span>

          {/* Hide Table for User Access tab (always systemuser) */}
          {!isUserAccessTab && (
            <>
              <span className="font-semibold text-foreground-3">Table:</span>
              <span>{getTableDisplayForDialog()}</span>
            </>
          )}

          {/* Hide Record for Metadata tab (always empty GUID), rename to User for User Access tab */}
          {!isMetadataTab && (
            <>
              <span className="font-semibold text-foreground-3">
                {isUserAccessTab ? 'User:' : 'Record:'}
              </span>
              <span>{entry.objectName}</span>
            </>
          )}

          {/* Hide Changed By for User Access tab (not relevant) */}
          {!isUserAccessTab && (
            <>
              <span className="font-semibold text-foreground-3">Changed By:</span>
              <span>{entry.userName}</span>
            </>
          )}
        </div>

        <hr className="border-stroke-1 my-4" />

        {/* Changes section */}
        <div>
          {!hasAnyDetails ? (
            <div className="py-6 text-center text-foreground-3">
              No details recorded for this audit entry
            </div>
          ) : (
            <>
              {/* Attribute Changes */}
              {hasAttributeDetails && (
                <>
                  <span className="font-semibold mb-2 block">Attribute Changes</span>
                  <table className="table w-full border border-stroke-1 rounded mb-4">
                    <thead className="table-header bg-background-2">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-left">Attribute</th>
                        <th className="px-3 py-2 font-semibold text-left">Old Value</th>
                        <th className="px-3 py-2 font-semibold text-left">New Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attributeDetails.map((detail, index) => (
                        <tr key={`${detail.attributeName}-${index}`} className="table-row">
                          <td className="px-3 py-2 font-semibold">{detail.attributeDisplayName}</td>
                          <td className="px-3 py-2 text-red-600 dark:text-red-400 break-words max-w-[200px]">
                            {formatValue(detail.oldValue, detail.oldFormattedValue)}
                          </td>
                          <td className="px-3 py-2 text-green-600 dark:text-green-400 break-words max-w-[200px]">
                            {formatValue(detail.newValue, detail.newFormattedValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Share Details */}
              {hasShareDetails && (
                <>
                  <span className="font-semibold mb-2 block">Sharing Changes</span>
                  {renderShareDetails()}
                </>
              )}

              {/* Role Privilege Details */}
              {hasRoleDetails && (
                <>
                  <span className="font-semibold mb-2 block">Role Privilege Changes</span>
                  {renderRolePrivilegeDetails()}
                </>
              )}

              {/* User Access Details */}
              {hasUserAccessDetails && (
                <>
                  <span className="font-semibold mb-2 block">User Access Details</span>
                  {renderUserAccessDetails()}
                </>
              )}

              {/* Relationship Details */}
              {hasRelationshipDetails && (
                <>
                  <span className="font-semibold mb-2 block">Relationship Changes</span>
                  {renderRelationshipDetails()}
                </>
              )}

              {/* Metadata Details */}
              {hasMetadataDetails && (
                <>
                  <span className="font-semibold mb-2 block">Metadata Change Details</span>
                  {renderMetadataDetails()}
                </>
              )}
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div className="dialog-backdrop" onClick={onClose} />

      {/* Dialog */}
      <div className="dialog">
        <div className="dialog-header">
          <span className="font-semibold text-lg">Audit Details</span>
          <button className="btn-icon btn-subtle" onClick={onClose}>
            <DismissIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="dialog-body">
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
