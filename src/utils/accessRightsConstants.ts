/**
 * Constants for Dataverse access rights, privilege depths, and metadata actions
 */

/** Dataverse AccessRights bit flags */
export const AccessRights = {
  None: 0,
  Read: 1,
  Write: 2,
  Append: 4,
  AppendTo: 16,
  Create: 32,
  Delete: 65536,
  Share: 262144,
  Assign: 524288,
} as const;

/** Privilege depth values */
export const PrivilegeDepth = {
  User: 1,
  BusinessUnit: 2,
  ParentChildBusinessUnits: 4,
  Organization: 8,
} as const;

export const PrivilegeDepthLabels: Record<number, string> = {
  [PrivilegeDepth.User]: 'User',
  [PrivilegeDepth.BusinessUnit]: 'Business Unit',
  [PrivilegeDepth.ParentChildBusinessUnits]: 'Parent: Child Business Units',
  [PrivilegeDepth.Organization]: 'Organization',
};

/** Metadata action codes */
export const MetadataActions = {
  DeleteEntity: 100,
  DeleteAttribute: 101,
  AuditChangeEntity: 102,
  AuditChangeAttribute: 103,
  AuditChangeOrg: 104,
} as const;

export const MetadataActionLabels: Record<number, string> = {
  [MetadataActions.DeleteEntity]: 'Delete Entity',
  [MetadataActions.DeleteAttribute]: 'Delete Attribute',
  [MetadataActions.AuditChangeEntity]: 'Audit Change at Entity Level',
  [MetadataActions.AuditChangeAttribute]: 'Audit Change at Attribute Level',
  [MetadataActions.AuditChangeOrg]: 'Audit Change at Org Level',
};

/** Array of all metadata action codes for checking */
export const METADATA_ACTION_CODES = [
  MetadataActions.DeleteEntity,
  MetadataActions.DeleteAttribute,
  MetadataActions.AuditChangeEntity,
  MetadataActions.AuditChangeAttribute,
  MetadataActions.AuditChangeOrg,
] as const;
