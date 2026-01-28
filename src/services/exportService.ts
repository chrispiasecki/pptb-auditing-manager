import {
  AuditLogEntry,
  AuditDetail,
  AttributeAuditDetail,
  ShareAuditDetail,
  RolePrivilegeAuditDetail,
} from '../model/auditLog';
import { ExportOptions, ExportResult, AuditTabType } from '../model/export';
import { TableAuditInfo, AttributeAuditInfo } from '../model/audit';
import { formatDateTime, escapeCSV } from '../utils/formatters';

// Table settings export options
export type TableExportFormat = 'csv';
export type TableExportScope = 'tables-only' | 'tables-with-attributes';

export interface TableExportOptions {
  format: TableExportFormat;
  scope: TableExportScope;
  auditEnabledOnly?: boolean;
}

/**
 * Get column headers based on tab type
 */
function getHeadersForTab(tabType: AuditTabType, includeDetails: boolean): string[] {
  switch (tabType) {
    case 'access':
      // User Access: Date/Time, Operation, Action, User (no details)
      return ['Date/Time', 'Operation', 'Action', 'User'];
    case 'shares':
      // Record Shares with sharing details
      return includeDetails
        ? ['Date/Time', 'Operation', 'Action', 'Table', 'Record', 'Changed By', 'Shared With', 'Previous Access', 'New Access']
        : ['Date/Time', 'Operation', 'Action', 'Table', 'Record', 'Changed By'];
    case 'roles':
      // Role Changes with privilege details
      return includeDetails
        ? ['Date/Time', 'Operation', 'Action', 'Table', 'Record', 'Changed By', 'Change Type', 'Privileges']
        : ['Date/Time', 'Operation', 'Action', 'Table', 'Record', 'Changed By'];
    case 'metadata':
      // Metadata Changes
      return includeDetails
        ? ['Date/Time', 'Operation', 'Action', 'Object', 'Changed By', 'Attribute', 'Old Value', 'New Value']
        : ['Date/Time', 'Operation', 'Action', 'Object', 'Changed By'];
    case 'details':
    default:
      // Data Changes: attribute changes
      return includeDetails
        ? ['Date/Time', 'Operation', 'Action', 'Table', 'Record', 'Changed By', 'Attribute', 'Old Value', 'New Value']
        : ['Date/Time', 'Operation', 'Action', 'Table', 'Record', 'Changed By'];
  }
}

/**
 * Get base row data based on tab type
 */
function getBaseRowForTab(entry: AuditLogEntry, tabType: AuditTabType): string[] {
  switch (tabType) {
    case 'access':
      // User Access: Date/Time, Operation, Action, User (objectName is the user)
      return [
        formatDateTime(entry.createdOn),
        entry.operationLabel,
        entry.actionLabel,
        entry.objectName,
      ];
    case 'shares':
    case 'roles':
    case 'details':
    default:
      // Include Table column
      return [
        formatDateTime(entry.createdOn),
        entry.operationLabel,
        entry.actionLabel,
        entry.objectTypeCode,
        entry.objectName,
        entry.userName,
      ];
    case 'metadata':
      return [
        formatDateTime(entry.createdOn),
        entry.operationLabel,
        entry.actionLabel,
        entry.objectName,
        entry.userName,
      ];
  }
}

/**
 * Export audit logs to CSV format
 */
export function generateCSV(
  entries: AuditLogEntry[],
  detailsMap: Map<string, AuditDetail[]>,
  includeDetails: boolean,
  tabType: AuditTabType = 'details'
): string {
  const lines: string[] = [];

  // For User Access tab, never include details
  const shouldIncludeDetails = tabType === 'access' ? false : includeDetails;

  // Header row based on tab type
  const headers = getHeadersForTab(tabType, shouldIncludeDetails);
  lines.push(headers.map(escapeCSV).join(','));

  // Data rows
  for (const entry of entries) {
    const baseRow = getBaseRowForTab(entry, tabType);

    if (shouldIncludeDetails) {
      const details = detailsMap.get(entry.id) || [];

      // Handle different detail types based on tab
      if (tabType === 'shares') {
        const shareDetails = details.filter(d => d.type === 'share') as ShareAuditDetail[];
        if (shareDetails.length === 0) {
          lines.push([...baseRow, '', '', ''].map(escapeCSV).join(','));
        } else {
          for (const detail of shareDetails) {
            lines.push([
              ...baseRow,
              `${detail.principalName} (${detail.principalType})`,
              detail.oldPrivileges || 'None',
              detail.newPrivileges || 'None',
            ].map(v => escapeCSV(String(v ?? ''))).join(','));
          }
        }
      } else if (tabType === 'roles') {
        const roleDetails = details.filter(d => d.type === 'rolePrivilege') as RolePrivilegeAuditDetail[];
        if (roleDetails.length === 0) {
          lines.push([...baseRow, '', ''].map(escapeCSV).join(','));
        } else {
          for (const detail of roleDetails) {
            // Summarize privilege changes
            const oldCount = detail.oldRolePrivileges.length;
            const newCount = detail.newRolePrivileges.length;
            let changeType = 'Modified';
            if (oldCount === 0 && newCount > 0) changeType = 'Added';
            else if (oldCount > 0 && newCount === 0) changeType = 'Removed';

            const privilegesSummary = detail.newRolePrivileges.length > 0
              ? detail.newRolePrivileges.map(p => p.privilegeName || p.privilegeId).join('; ')
              : detail.oldRolePrivileges.map(p => p.privilegeName || p.privilegeId).join('; ');

            lines.push([
              ...baseRow,
              changeType,
              privilegesSummary || '(none)',
            ].map(v => escapeCSV(String(v ?? ''))).join(','));
          }
        }
      } else {
        // Default: attribute details (for 'details' and 'metadata' tabs)
        const attrDetails = details.filter(d => d.type === 'attribute') as AttributeAuditDetail[];

        if (attrDetails.length === 0) {
          lines.push([...baseRow, '', '', ''].map(escapeCSV).join(','));
        } else {
          for (const detail of attrDetails) {
            lines.push([
              ...baseRow,
              detail.attributeDisplayName,
              detail.oldFormattedValue || detail.oldValue || '',
              detail.newFormattedValue || detail.newValue || '',
            ].map(v => escapeCSV(String(v ?? ''))).join(','));
          }
        }
      }
    } else {
      lines.push(baseRow.map(v => escapeCSV(String(v ?? ''))).join(','));
    }
  }

  return lines.join('\n');
}

/**
 * Get filename suffix based on tab type
 */
function getFilenameSuffix(tabType: AuditTabType): string {
  switch (tabType) {
    case 'access':
      return 'user-access';
    case 'shares':
      return 'record-shares';
    case 'roles':
      return 'role-changes';
    case 'metadata':
      return 'metadata-changes';
    case 'relationships':
      return 'relationship-changes';
    case 'auditchanges':
      return 'audit-setting-changes';
    case 'details':
    default:
      return 'data-changes';
  }
}

/**
 * Export audit logs using toolbox file system API
 */
export async function exportAuditLogs(
  entries: AuditLogEntry[],
  detailsMap: Map<string, AuditDetail[]>,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    let content: string;
    let filename: string;

    const tabType = options.tabType || 'details';
    const timestamp = new Date().toISOString().slice(0, 10);
    const tabSuffix = getFilenameSuffix(tabType);
    const baseFilename = options.filename || `audit-${tabSuffix}-${timestamp}`;

    content = generateCSV(entries, detailsMap, options.includeDetails, tabType);
    filename = `${baseFilename}.csv`;

    // Use toolbox file system API to save file with native dialog
    const savedPath = await window.toolboxAPI.fileSystem.saveFile(filename, content);

    if (!savedPath) {
      // User cancelled the save dialog
      return { success: false, error: 'Export cancelled' };
    }

    return { success: true, filename: savedPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}


/**
 * Generate CSV for table settings export (tables only)
 */
function generateTableSettingsCSV(
  tables: TableAuditInfo[],
  auditEnabledOnly: boolean
): string {
  const lines: string[] = [];

  // Header
  lines.push(['Table Display Name', 'Logical Name', 'Audit Enabled', 'Custom Table'].map(escapeCSV).join(','));

  // Filter tables if needed
  const filteredTables = auditEnabledOnly ? tables.filter(t => t.isAuditEnabled) : tables;

  // Data rows
  for (const table of filteredTables) {
    lines.push([
      table.displayName,
      table.logicalName,
      table.isAuditEnabled ? 'Yes' : 'No',
      table.isCustomEntity ? 'Yes' : 'No',
    ].map(escapeCSV).join(','));
  }

  return lines.join('\n');
}

/**
 * Generate CSV for table settings export (tables with attributes)
 */
function generateTableAttributesCSV(
  tables: TableAuditInfo[],
  attributesMap: Map<string, AttributeAuditInfo[]>,
  auditEnabledOnly: boolean
): string {
  const lines: string[] = [];

  // Header
  lines.push([
    'Table Display Name',
    'Table Logical Name',
    'Table Audit Enabled',
    'Attribute Display Name',
    'Attribute Logical Name',
    'Attribute Type',
    'Attribute Audit Enabled',
  ].map(escapeCSV).join(','));

  // Filter tables if needed
  const filteredTables = auditEnabledOnly ? tables.filter(t => t.isAuditEnabled) : tables;

  // Data rows
  for (const table of filteredTables) {
    const attributes = attributesMap.get(table.logicalName) || [];
    const filteredAttributes = auditEnabledOnly
      ? attributes.filter(a => a.isAuditEnabled)
      : attributes;

    if (filteredAttributes.length === 0) {
      // Output table row without attributes
      lines.push([
        table.displayName,
        table.logicalName,
        table.isAuditEnabled ? 'Yes' : 'No',
        '',
        '',
        '',
        '',
      ].map(escapeCSV).join(','));
    } else {
      // Output a row for each attribute
      for (const attr of filteredAttributes) {
        lines.push([
          table.displayName,
          table.logicalName,
          table.isAuditEnabled ? 'Yes' : 'No',
          attr.displayName,
          attr.logicalName,
          attr.attributeType,
          attr.isAuditEnabled ? 'Yes' : 'No',
        ].map(escapeCSV).join(','));
      }
    }
  }

  return lines.join('\n');
}

/**
 * Export table settings using toolbox file system API
 */
export async function exportTableSettings(
  tables: TableAuditInfo[],
  attributesMap: Map<string, AttributeAuditInfo[]>,
  options: TableExportOptions
): Promise<ExportResult> {
  try {
    let content: string;
    let filename: string;

    const timestamp = new Date().toISOString().slice(0, 10);
    const scopeLabel = options.scope === 'tables-with-attributes' ? 'tables-attributes' : 'tables';
    const baseFilename = `audit-settings-${scopeLabel}-${timestamp}`;

    if (options.scope === 'tables-with-attributes') {
      content = generateTableAttributesCSV(tables, attributesMap, options.auditEnabledOnly || false);
    } else {
      content = generateTableSettingsCSV(tables, options.auditEnabledOnly || false);
    }
    filename = `${baseFilename}.csv`;

    // Use toolbox file system API to save file with native dialog
    const savedPath = await window.toolboxAPI.fileSystem.saveFile(filename, content);

    if (!savedPath) {
      // User cancelled the save dialog
      return { success: false, error: 'Export cancelled' };
    }

    return { success: true, filename: savedPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}
