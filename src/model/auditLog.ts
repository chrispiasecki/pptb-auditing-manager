// Audit Operation types (from Dataverse)
export enum AuditOperation {
  Create = 1,
  Update = 2,
  Delete = 3,
  Access = 4,
}

// Audit Action types (from Dataverse)
// Reference: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/auditing/retrieve-audit-data
export enum AuditAction {
  Unknown = 0,
  Create = 1,
  Update = 2,
  Delete = 3,
  Activate = 4,
  Deactivate = 5,
  Cascade = 11,
  Merge = 12,
  Assign = 13,
  Share = 14,  // GrantAccess - user granted privileges to a record
  Retrieve = 15,
  Close = 16,
  Cancel = 17,
  Complete = 18,
  Resolve = 19,
  Reopen = 20,
  Fulfill = 21,
  Paid = 22,
  Qualify = 23,
  Disqualify = 24,
  Submit = 25,
  Reject = 26,
  Approve = 27,
  Invoice = 28,
  Hold = 29,
  AddMember = 30,
  RemoveMember = 31,
  AssociateEntities = 33,
  DisassociateEntities = 34,
  AddMembers = 35,
  RemoveMembers = 36,
  AddItem = 37,
  RemoveItem = 38,
  AddSubstitute = 39,
  RemoveSubstitute = 40,
  SetState = 41,
  SetStateDynamicEntity = 42,
  Renew = 43,
  Revise = 44,
  Win = 45,
  Lose = 46,
  InternalProcessing = 47,
  ModifyShare = 48,  // ModifyAccess - privileges granted to a user changed
  Unshare = 49,  // RevokeAccess - user's access to a record removed
  Book = 51,
  GenerateQuoteFromOpportunity = 52,
  // M:N Relationship events - Role assignments
  AssignRoleToTeam = 53,     // Security role assigned to a team (M:N relationship)
  RemoveRoleFromTeam = 54,   // Security role removed from a team (M:N relationship)
  AssignRoleToUser = 55,     // Security role assigned to a user (M:N relationship)
  RemoveRoleFromUser = 56,   // Security role removed from a user (M:N relationship)
  // Security Role Changes
  AddPrivilegesToRole = 57,  // Privileges added to a security role
  RemovePrivilegesFromRole = 58,  // Privileges removed from a security role
  ReplacePrivilegesInRole = 59,  // Privileges for a security role replaced
  // User Access (operation=4)
  UserAccessViaWeb = 64,  // User accessing via model-driven app
  UserAccessViaWebServices = 65,  // User accessing via web services
  // Other actions
  Clone = 68,
  // User Access Audit
  UserAccessAuditStarted = 112,  // User access audit began
  UserAccessAuditStopped = 113,  // User access audit ended
  // Audit Change Events (changes to audit settings)
  EntityAuditStarted = 105,      // Auditing enabled for a table
  AttributeAuditStarted = 106,   // Auditing enabled for a column
  AuditEnabled = 107,            // Auditing enabled for the organization
  EntityAuditStopped = 108,      // Auditing disabled for a table
  AttributeAuditStopped = 109,   // Auditing disabled for a column
  AuditDisabled = 110,           // Auditing disabled for the organization
  AuditLogDeletion = 111,        // An audit log was deleted
}

// Raw audit record from API
export interface AuditRecord {
  auditid: string;
  createdon: string;
  operation: number;
  action: number;
  objecttypecode: string;
  _objectid_value: string;
  _userid_value: string;
  useradditionalinfo?: string;
  attributemask?: string;
  changedata?: string;
  'objectid_account@odata.bind'?: string;
  '_objectid_value@OData.Community.Display.V1.FormattedValue'?: string;
  '_userid_value@OData.Community.Display.V1.FormattedValue'?: string;
  'operation@OData.Community.Display.V1.FormattedValue'?: string;
  'action@OData.Community.Display.V1.FormattedValue'?: string;
}

// Formatted audit log entry for display
export interface AuditLogEntry {
  id: string;
  createdOn: Date;
  operation: AuditOperation;
  operationLabel: string;
  action: AuditAction;
  actionLabel: string;
  objectTypeCode: string;
  objectId: string;
  objectName: string;
  userId: string;
  userName: string;
  attributeMask?: string;
  changeData?: string;
  isExpanded?: boolean;
  details?: AuditDetail[];
}

// Attribute audit detail (for data changes)
export interface AttributeAuditDetail {
  type: 'attribute';
  attributeName: string;
  attributeDisplayName: string;
  oldValue: string | null;
  newValue: string | null;
  oldFormattedValue?: string;
  newFormattedValue?: string;
}

// Share audit detail (for actions 14, 48, 49 - share/modify share/unshare)
export interface ShareAuditDetail {
  type: 'share';
  principalId: string;
  principalName: string;
  principalType: string;  // 'systemuser' or 'team'
  oldPrivileges: string;  // AccessRights flags
  newPrivileges: string;  // AccessRights flags
}

// Role privilege item
export interface RolePrivilege {
  privilegeId: string;
  privilegeName?: string;
  depth: number;  // 1=User, 2=BU, 4=ParentChild, 8=Global
  depthLabel: string;
}

// Invalid privilege item (with resolved name)
export interface InvalidPrivilege {
  privilegeId: string;
  privilegeName: string;
}

// Role privilege audit detail (for actions 57, 58, 59)
export interface RolePrivilegeAuditDetail {
  type: 'rolePrivilege';
  oldRolePrivileges: RolePrivilege[];
  newRolePrivileges: RolePrivilege[];
  invalidNewPrivileges: InvalidPrivilege[];
}

// User access audit detail (for actions 64, 65, 112, 113)
export interface UserAccessAuditDetail {
  type: 'userAccess';
  accessTime: Date;
  interval: number;
}

// Relationship audit detail (for actions 33, 34, 53, 54, 55, 56)
export interface RelationshipAuditDetail {
  type: 'relationship';
  relationshipName: string;
  targetRecords: Array<{
    id: string;
    name: string;
    logicalName: string;
  }>;
}

// Metadata audit detail (for actions 100-104 - metadata changes)
export interface MetadataAuditDetail {
  type: 'metadata';
  action: number;
  actionLabel: string;
  changeData: string | null;
  parsedChangeData?: Record<string, any>;
  // For action 103 (Audit Change at Attribute Level)
  attributeDisplayName?: string;
  attributeLogicalName?: string;
  auditEnabled?: boolean;
}

// Union type for all audit details
export type AuditDetail =
  | AttributeAuditDetail
  | ShareAuditDetail
  | RolePrivilegeAuditDetail
  | UserAccessAuditDetail
  | RelationshipAuditDetail
  | MetadataAuditDetail;

// Audit API response
export interface AuditQueryResponse {
  '@odata.context': string;
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
  value: AuditRecord[];
}

// RetrieveAuditDetails response
export interface AuditDetailsResponse {
  AuditDetail: {
    '@odata.type': string;
    OldValue?: Record<string, any>;
    NewValue?: Record<string, any>;
    DeletedAttributes?: { key: string }[];
    InvalidNewValueAttributes?: { key: string }[];
  };
}

// RetrieveRecordChangeHistory response
export interface RecordChangeHistoryResponse {
  AuditDetailCollection: {
    MoreRecords: boolean;
    PagingCookie: string;
    TotalRecordCount: number;
    AuditDetails: Array<{
      AuditRecord: AuditRecord;
      OldValue?: Record<string, any>;
      NewValue?: Record<string, any>;
    }>;
  };
}

// Sort direction
export type SortDirection = 'asc' | 'desc' | null;

// Sortable columns
export type SortColumn = 'createdOn' | 'operation' | 'action' | 'objectName' | 'userName';

// Sort state
export interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

// Filter state
export interface AuditFiltersState {
  tableLogicalNames: string[];
  recordId: string | null;
  recordName: string | null;
  selectedAttributes: string[];
  operations: AuditOperation[];
  actions: AuditAction[];
  fromDate: Date | null;
  toDate: Date | null;
  selectedUsers: Array<{ id: string; name: string }>;
  selectedSecurityRoles: Array<{ id: string; name: string }>;
}

// Pagination state
export interface PaginationState {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  pagingCookie?: string;
  nextLink?: string;
  hasMoreRecords: boolean;
}

// Initial filter state
export const initialFiltersState: AuditFiltersState = {
  tableLogicalNames: [],
  recordId: null,
  recordName: null,
  selectedAttributes: [],
  operations: [],
  actions: [],
  fromDate: null,
  toDate: null,
  selectedUsers: [],
  selectedSecurityRoles: [],
};

// Initial pagination state
export const initialPaginationState: PaginationState = {
  pageNumber: 1,
  pageSize: 50,
  totalCount: 0,
  hasMoreRecords: false,
};

// Initial sort state
export const initialSortState: SortState = {
  column: 'createdOn',
  direction: 'desc',
};
