// Simplified entity option for dropdowns
export interface EntityOption {
  logicalName: string;
  displayName: string;
  displayCollectionName: string;
  isAuditEnabled: boolean;
  primaryIdAttribute: string;
  primaryNameAttribute: string;
  objectTypeCode: number;
}

// Simplified attribute option for dropdowns
export interface AttributeOption {
  logicalName: string;
  displayName: string;
  attributeType: string;
  isAuditEnabled: boolean;
  columnNumber?: number;
}

// Record search result
export interface RecordSearchResult {
  id: string;
  name: string;
  entityLogicalName: string;
  entityDisplayName?: string;
}

// Entity metadata from API
export interface EntityMetadataResponse {
  LogicalName: string;
  DisplayName: {
    UserLocalizedLabel: {
      Label: string;
    } | null;
  };
  DisplayCollectionName: {
    UserLocalizedLabel: {
      Label: string;
    } | null;
  };
  IsAuditEnabled: {
    Value: boolean;
  };
  PrimaryIdAttribute: string;
  PrimaryNameAttribute: string;
  ObjectTypeCode: number;
}

// Attribute metadata from API
export interface AttributeMetadataResponse {
  LogicalName: string;
  DisplayName: {
    UserLocalizedLabel: {
      Label: string;
    } | null;
  };
  AttributeType: string;
  IsAuditEnabled: {
    Value: boolean;
  };
  ColumnNumber?: number;
}

// Helper to convert entity metadata to EntityOption
export function toEntityOption(metadata: EntityMetadataResponse): EntityOption {
  return {
    logicalName: metadata.LogicalName,
    displayName: metadata.DisplayName?.UserLocalizedLabel?.Label || metadata.LogicalName,
    displayCollectionName: metadata.DisplayCollectionName?.UserLocalizedLabel?.Label || metadata.LogicalName,
    isAuditEnabled: metadata.IsAuditEnabled?.Value ?? false,
    primaryIdAttribute: metadata.PrimaryIdAttribute,
    primaryNameAttribute: metadata.PrimaryNameAttribute,
    objectTypeCode: metadata.ObjectTypeCode,
  };
}

// Helper to convert attribute metadata to AttributeOption
export function toAttributeOption(metadata: AttributeMetadataResponse): AttributeOption {
  return {
    logicalName: metadata.LogicalName,
    displayName: metadata.DisplayName?.UserLocalizedLabel?.Label || metadata.LogicalName,
    attributeType: metadata.AttributeType,
    isAuditEnabled: metadata.IsAuditEnabled?.Value ?? false,
    columnNumber: metadata.ColumnNumber,
  };
}
