import { AuditOperation, AuditAction } from '../model/auditLog';

// Operation labels
export const operationLabels: Record<AuditOperation, string> = {
  [AuditOperation.Create]: 'Create',
  [AuditOperation.Update]: 'Update',
  [AuditOperation.Delete]: 'Delete',
  [AuditOperation.Access]: 'Access',
};

// Action labels
export const actionLabels: Record<number, string> = {
  [AuditAction.Unknown]: 'Unknown',
  [AuditAction.Create]: 'Create',
  [AuditAction.Update]: 'Update',
  [AuditAction.Delete]: 'Delete',
  [AuditAction.Activate]: 'Activate',
  [AuditAction.Deactivate]: 'Deactivate',
  [AuditAction.Cascade]: 'Cascade',
  [AuditAction.Merge]: 'Merge',
  [AuditAction.Assign]: 'Assign',
  [AuditAction.Share]: 'Share',
  [AuditAction.Retrieve]: 'Retrieve',
  [AuditAction.Close]: 'Close',
  [AuditAction.Cancel]: 'Cancel',
  [AuditAction.Complete]: 'Complete',
  [AuditAction.Resolve]: 'Resolve',
  [AuditAction.Reopen]: 'Reopen',
  [AuditAction.Fulfill]: 'Fulfill',
  [AuditAction.Paid]: 'Paid',
  [AuditAction.Qualify]: 'Qualify',
  [AuditAction.Disqualify]: 'Disqualify',
  [AuditAction.Submit]: 'Submit',
  [AuditAction.Reject]: 'Reject',
  [AuditAction.Approve]: 'Approve',
  [AuditAction.Invoice]: 'Invoice',
  [AuditAction.Hold]: 'Hold',
  [AuditAction.AddMember]: 'Add Member',
  [AuditAction.RemoveMember]: 'Remove Member',
  [AuditAction.AssociateEntities]: 'Associate',
  [AuditAction.DisassociateEntities]: 'Disassociate',
  [AuditAction.AddMembers]: 'Add Members',
  [AuditAction.RemoveMembers]: 'Remove Members',
  [AuditAction.AddItem]: 'Add Item',
  [AuditAction.RemoveItem]: 'Remove Item',
  [AuditAction.AddSubstitute]: 'Add Substitute',
  [AuditAction.RemoveSubstitute]: 'Remove Substitute',
  [AuditAction.SetState]: 'Set State',
  [AuditAction.SetStateDynamicEntity]: 'Set State',
  [AuditAction.Renew]: 'Renew',
  [AuditAction.Revise]: 'Revise',
  [AuditAction.Win]: 'Win',
  [AuditAction.Lose]: 'Lose',
  [AuditAction.InternalProcessing]: 'Internal Processing',
  [AuditAction.ModifyShare]: 'Modify Share',
  [AuditAction.Unshare]: 'Unshare',
  [AuditAction.Book]: 'Book',
  [AuditAction.GenerateQuoteFromOpportunity]: 'Generate Quote',
  // M:N Relationship events - Role assignments
  [AuditAction.AssignRoleToTeam]: 'Assign Role to Team',
  [AuditAction.RemoveRoleFromTeam]: 'Remove Role from Team',
  [AuditAction.AssignRoleToUser]: 'Assign Role to User',
  [AuditAction.RemoveRoleFromUser]: 'Remove Role from User',
  [AuditAction.AddPrivilegesToRole]: 'Add Privileges to Role',
  [AuditAction.RemovePrivilegesFromRole]: 'Remove Privileges from Role',
  [AuditAction.ReplacePrivilegesInRole]: 'Replace Privileges in Role',
  [AuditAction.UserAccessViaWeb]: 'User Access via Web',
  [AuditAction.UserAccessViaWebServices]: 'User Access via Web Services',
  [AuditAction.Clone]: 'Clone',
  [AuditAction.UserAccessAuditStarted]: 'User Access Audit Started',
  [AuditAction.UserAccessAuditStopped]: 'User Access Audit Stopped',
  // Audit Change Events
  [AuditAction.EntityAuditStarted]: 'Entity Audit Started',
  [AuditAction.AttributeAuditStarted]: 'Attribute Audit Started',
  [AuditAction.AuditEnabled]: 'Audit Enabled',
  [AuditAction.EntityAuditStopped]: 'Entity Audit Stopped',
  [AuditAction.AttributeAuditStopped]: 'Attribute Audit Stopped',
  [AuditAction.AuditDisabled]: 'Audit Disabled',
  [AuditAction.AuditLogDeletion]: 'Audit Log Deletion',
};

// Get operation label with fallback
export function getOperationLabel(operation: number): string {
  return operationLabels[operation as AuditOperation] || `Operation ${operation}`;
}

// Get action label with fallback
export function getActionLabel(action: number): string {
  return actionLabels[action] || `Action ${action}`;
}

// Filter dropdown options for operations
export const operationOptions = [
  { value: AuditOperation.Create, label: 'Create' },
  { value: AuditOperation.Update, label: 'Update' },
  { value: AuditOperation.Delete, label: 'Delete' },
  { value: AuditOperation.Access, label: 'Access' },
];

// Common action filter options (most frequently used) - for Audit Details tab
export const commonActionOptions = [
  { value: AuditAction.Create, label: 'Create' },
  { value: AuditAction.Update, label: 'Update' },
  { value: AuditAction.Delete, label: 'Delete' },
  { value: AuditAction.Assign, label: 'Assign' },
  { value: AuditAction.Merge, label: 'Merge' },
  { value: AuditAction.SetState, label: 'Set State' },
];

// Share action options - for Record Shares tab
export const shareActionOptions = [
  { value: AuditAction.Share, label: 'Share' },
  { value: AuditAction.ModifyShare, label: 'Modify Share' },
  { value: AuditAction.Unshare, label: 'Unshare' },
];

// User access action options - for User Access tab
export const userAccessActionOptions = [
  { value: AuditAction.UserAccessViaWeb, label: 'Access via Web' },
  { value: AuditAction.UserAccessViaWebServices, label: 'Access via Web Services' },
  { value: AuditAction.UserAccessAuditStarted, label: 'Audit Started' },
  { value: AuditAction.UserAccessAuditStopped, label: 'Audit Stopped' },
];

// Role change action options - for Role Changes tab (security role privilege changes only)
export const roleActionOptions = [
  { value: AuditAction.AddPrivilegesToRole, label: 'Add Privileges to Role' },       // 57
  { value: AuditAction.RemovePrivilegesFromRole, label: 'Remove Privileges from Role' }, // 58
  { value: AuditAction.ReplacePrivilegesInRole, label: 'Replace Privileges in Role' },   // 59
];

// Metadata change action options - for Metadata Changes tab
export const metadataActionOptions = [
  { value: 100, label: 'Delete Entity' },
  { value: 101, label: 'Delete Attribute' },
  { value: 102, label: 'Audit Change at Entity Level' },
  { value: 103, label: 'Audit Change at Attribute Level' },
  { value: 104, label: 'Audit Change at Org Level' },
];

// Relationship change action options - for N:N Relationships tab
export const relationshipActionOptions = [
  { value: AuditAction.AssociateEntities, label: 'Associate' },           // 33
  { value: AuditAction.DisassociateEntities, label: 'Disassociate' },     // 34
  { value: AuditAction.AssignRoleToTeam, label: 'Assign Role to Team' },  // 53
  { value: AuditAction.RemoveRoleFromTeam, label: 'Remove Role from Team' }, // 54
  { value: AuditAction.AssignRoleToUser, label: 'Assign Role to User' },  // 55
  { value: AuditAction.RemoveRoleFromUser, label: 'Remove Role from User' }, // 56
];

// Audit change action options - for Audit Changes tab
export const auditChangeActionOptions = [
  { value: AuditAction.EntityAuditStarted, label: 'Entity Audit Started' },       // 105
  { value: AuditAction.AttributeAuditStarted, label: 'Attribute Audit Started' }, // 106
  { value: AuditAction.AuditEnabled, label: 'Audit Enabled' },                    // 107
  { value: AuditAction.EntityAuditStopped, label: 'Entity Audit Stopped' },       // 108
  { value: AuditAction.AttributeAuditStopped, label: 'Attribute Audit Stopped' }, // 109
  { value: AuditAction.AuditDisabled, label: 'Audit Disabled' },                  // 110
  { value: AuditAction.AuditLogDeletion, label: 'Audit Log Deletion' },           // 111
];

// Page size options
export const pageSizeOptions = [
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 250, label: '250' },
];

// Default page size
export const DEFAULT_PAGE_SIZE = 50;

// Debounce delay for search inputs
export const SEARCH_DEBOUNCE_MS = 300;
