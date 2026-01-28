import {
  AuditRecord,
  AuditLogEntry,
  AuditOperation,
  AuditDetail,
  AttributeAuditDetail,
  AuditDetailsResponse,
} from '../model/auditLog';
import { AttributeOption } from '../model/metadata';
import { getOperationLabel, getActionLabel } from './constants';
import { formatGuid } from './formatters';

// Convert raw audit record to display entry
export function toAuditLogEntry(record: AuditRecord): AuditLogEntry {
  if (!record || !record.auditid) {
    throw new Error('Invalid audit record: missing auditid');
  }

  return {
    id: record.auditid,
    createdOn: record.createdon ? new Date(record.createdon) : new Date(),
    operation: (record.operation as AuditOperation) || AuditOperation.Update,
    operationLabel: record['operation@OData.Community.Display.V1.FormattedValue'] || getOperationLabel(record.operation || 0),
    action: record.action || 0,
    actionLabel: record['action@OData.Community.Display.V1.FormattedValue'] || getActionLabel(record.action || 0),
    objectTypeCode: record.objecttypecode || '',
    objectId: formatGuid(record._objectid_value) || '',
    objectName: record['_objectid_value@OData.Community.Display.V1.FormattedValue'] || record._objectid_value || '',
    userId: formatGuid(record._userid_value) || '',
    userName: record['_userid_value@OData.Community.Display.V1.FormattedValue'] || record._userid_value || '',
    attributeMask: record.attributemask,
    changeData: record.changedata,
    isExpanded: false,
    details: undefined,
  };
}

// Parse audit details response into AuditDetail array
export function parseAuditDetails(
  response: AuditDetailsResponse,
  attributeMetadata: Map<string, AttributeOption>
): AuditDetail[] {
  const details: AuditDetail[] = [];
  const auditDetail = response.AuditDetail;

  if (!auditDetail) return details;

  const oldValue = auditDetail.OldValue || {};
  const newValue = auditDetail.NewValue || {};

  // Get all changed attributes
  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

  for (const key of allKeys) {
    // Skip internal/metadata fields
    if (key.startsWith('@') || key.endsWith('@OData.Community.Display.V1.FormattedValue')) {
      continue;
    }

    const oldVal = oldValue[key];
    const newVal = newValue[key];

    // Skip if both are undefined/null
    if (oldVal === undefined && newVal === undefined) continue;
    if (oldVal === null && newVal === null) continue;

    // Skip if values are the same
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    const attrMeta = attributeMetadata.get(key);

    const detail: AttributeAuditDetail = {
      type: 'attribute',
      attributeName: key,
      attributeDisplayName: attrMeta?.displayName || key,
      oldValue: formatAuditValue(oldVal),
      newValue: formatAuditValue(newVal),
      oldFormattedValue: oldValue[`${key}@OData.Community.Display.V1.FormattedValue`],
      newFormattedValue: newValue[`${key}@OData.Community.Display.V1.FormattedValue`],
    };

    details.push(detail);
  }

  return details;
}

// Format a single audit value for display
function formatAuditValue(value: any): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    // Handle Lookup/EntityReference
    if (value.Id && value.LogicalName) {
      return value.Name || value.Id;
    }
    // Handle OptionSet
    if (value.Value !== undefined && value.Label) {
      return value.Label;
    }
    // Handle Money
    if (value.Value !== undefined) {
      return String(value.Value);
    }
    // Fallback
    return JSON.stringify(value);
  }

  return String(value);
}

// Build OData filter for audit query
export function buildAuditFilter(
  tableLogicalNames: string[],
  recordId: string | null,
  operations: AuditOperation[],
  actions: number[],
  fromDate: Date | null,
  toDate: Date | null,
  userIds: string[] = [],
  securityRoleIds: string[] = []
): string {
  const filters: string[] = [];

  if (tableLogicalNames.length > 0) {
    if (tableLogicalNames.length === 1) {
      filters.push(`objecttypecode eq '${tableLogicalNames[0]}'`);
    } else {
      const tableFilter = tableLogicalNames.map(t => `objecttypecode eq '${t}'`).join(' or ');
      filters.push(`(${tableFilter})`);
    }
  }

  if (recordId) {
    filters.push(`_objectid_value eq ${recordId}`);
  }

  if (operations.length > 0) {
    const opFilter = operations.map(op => `operation eq ${op}`).join(' or ');
    filters.push(`(${opFilter})`);
  }

  if (actions.length > 0) {
    const actionFilter = actions.map(a => `action eq ${a}`).join(' or ');
    filters.push(`(${actionFilter})`);
  }

  if (fromDate) {
    filters.push(`createdon ge ${fromDate.toISOString()}`);
  }

  if (toDate) {
    // Add one day to include the entire end date
    const endDate = new Date(toDate);
    endDate.setDate(endDate.getDate() + 1);
    filters.push(`createdon lt ${endDate.toISOString()}`);
  }

  if (userIds.length > 0) {
    if (userIds.length === 1) {
      filters.push(`_userid_value eq ${userIds[0]}`);
    } else {
      const userFilter = userIds.map(id => `_userid_value eq ${id}`).join(' or ');
      filters.push(`(${userFilter})`);
    }
  }

  if (securityRoleIds.length > 0) {
    // For role changes, the objectid is the security role
    if (securityRoleIds.length === 1) {
      filters.push(`_objectid_value eq ${securityRoleIds[0]}`);
    } else {
      const roleFilter = securityRoleIds.map(id => `_objectid_value eq ${id}`).join(' or ');
      filters.push(`(${roleFilter})`);
    }
  }

  return filters.join(' and ');
}

// Get operation badge color
export function getOperationColor(operation: AuditOperation): 'success' | 'warning' | 'danger' | 'informative' {
  switch (operation) {
    case AuditOperation.Create:
      return 'success';
    case AuditOperation.Update:
      return 'warning';
    case AuditOperation.Delete:
      return 'danger';
    case AuditOperation.Access:
      return 'informative';
    default:
      return 'informative';
  }
}

// Check if an audit entry has changed specific attributes
export function hasChangedAttributes(
  entry: AuditLogEntry,
  selectedAttributes: string[]
): boolean {
  if (!entry.details || entry.details.length === 0 || selectedAttributes.length === 0) {
    return true; // No filter applied or no details loaded
  }

  return entry.details.some(detail => {
    if (detail.type === 'attribute') {
      return selectedAttributes.includes(detail.attributeName);
    }
    return false;
  });
}

// Filter audit entries by selected attributes (client-side)
export function filterByAttributes(
  entries: AuditLogEntry[],
  selectedAttributes: string[]
): AuditLogEntry[] {
  if (selectedAttributes.length === 0) {
    return entries;
  }

  return entries.filter(entry => hasChangedAttributes(entry, selectedAttributes));
}

// Sort audit entries
export function sortAuditEntries(
  entries: AuditLogEntry[],
  sortBy: 'createdOn' | 'operation' | 'action' | 'objectName' | 'userName',
  sortDirection: 'asc' | 'desc'
): AuditLogEntry[] {
  return [...entries].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'createdOn':
        comparison = a.createdOn.getTime() - b.createdOn.getTime();
        break;
      case 'operation':
        comparison = a.operation - b.operation;
        break;
      case 'action':
        comparison = a.action - b.action;
        break;
      case 'objectName':
        comparison = a.objectName.localeCompare(b.objectName);
        break;
      case 'userName':
        comparison = a.userName.localeCompare(b.userName);
        break;
    }

    return sortDirection === 'desc' ? -comparison : comparison;
  });
}
