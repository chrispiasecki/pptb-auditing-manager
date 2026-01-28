// Organization audit settings
export interface OrganizationAuditSettings {
  organizationId: string;
  isAuditEnabled: boolean;
  isUserAccessAuditEnabled: boolean;
  auditRetentionPeriodV2: number | null;
}

// Table/Entity audit info
export interface TableAuditInfo {
  metadataId: string;
  logicalName: string;
  displayName: string;
  isCustomEntity: boolean;
  isAuditEnabled: boolean;
  canModifyAuditSettings: boolean;
}

// Attribute audit info
export interface AttributeAuditInfo {
  metadataId: string;
  logicalName: string;
  displayName: string;
  attributeType: string;
  isAuditEnabled: boolean;
  canModifyAuditSettings: boolean;
}

// Filter options for table list
export type TableFilterType = 'all' | 'auditEnabled' | 'auditDisabled' | 'custom' | 'system';

// View/Tab types
export type AuditView = 'logs' | 'global' | 'tables';

// Bulk operation result
export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: string[];
}
