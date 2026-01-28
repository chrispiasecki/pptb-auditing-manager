import { AuditLogEntry, AuditDetail } from './auditLog';

// Export format options
export type ExportFormat = 'csv';

// Audit tab type for export customization
export type AuditTabType = 'details' | 'shares' | 'access' | 'roles' | 'metadata' | 'relationships' | 'auditchanges';

// Export options
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeDetails: boolean;
  selectedColumns?: string[];
  tabType?: AuditTabType;
}

// Export column definition
export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

// Default export columns
export const defaultExportColumns: ExportColumn[] = [
  { key: 'createdOn', header: 'Date/Time', width: 150 },
  { key: 'operationLabel', header: 'Operation', width: 100 },
  { key: 'actionLabel', header: 'Action', width: 100 },
  { key: 'objectName', header: 'Record', width: 200 },
  { key: 'userName', header: 'Changed By', width: 150 },
];

// Export data row
export interface ExportDataRow {
  entry: AuditLogEntry;
  details?: AuditDetail[];
}

// Export result
export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}
