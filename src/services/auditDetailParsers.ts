/**
 * Parsers for different types of audit details
 */

import {
  AuditLogEntry,
  AuditDetail,
  AttributeAuditDetail,
  ShareAuditDetail,
  RolePrivilegeAuditDetail,
  UserAccessAuditDetail,
  RelationshipAuditDetail,
  MetadataAuditDetail,
  RolePrivilege,
  InvalidPrivilege,
} from '../model/auditLog';
import { AttributeOption } from '../model/metadata';
import { MetadataActionLabels } from '../utils/accessRightsConstants';
import { formatAccessRights, formatPrivilegeDepth } from './accessRightsFormatter';
import { lookupPrincipalName } from './principalService';
import { getAttributeByColumnNumber, getRecord } from './metadataService';
import { loadPrivileges } from './privilegeService';

/**
 * Parse metadata audit detail (actions 100-104)
 * Uses the changeData field from the audit entry
 * For action 103 (Audit Change at Attribute Level), looks up the attribute by column number
 */
export async function parseMetadataAuditDetail(entry: AuditLogEntry): Promise<MetadataAuditDetail[]> {
  const details: MetadataAuditDetail[] = [];

  try {
    let parsedChangeData: Record<string, unknown> | undefined;
    let attributeDisplayName: string | undefined;
    let attributeLogicalName: string | undefined;
    let auditEnabled: boolean | undefined;

    // Try to parse changeData as JSON
    if (entry.changeData) {
      try {
        parsedChangeData = JSON.parse(entry.changeData);
      } catch {
        // Not JSON, will display as raw string
        console.log('[AuditDetailParsers] changeData is not JSON, displaying as raw string');
      }
    }

    const actionNum = entry.action as number;

    // For actions 102, 103, 104 (Audit Change events), convert "True"/"False" to Enabled/Disabled
    if (actionNum >= 102 && actionNum <= 104 && entry.changeData) {
      const changeDataLower = entry.changeData.toLowerCase().trim();
      if (changeDataLower === 'true') {
        auditEnabled = true;
      } else if (changeDataLower === 'false') {
        auditEnabled = false;
      }
    }

    // For action 103 (Audit Change at Attribute Level), also look up the attribute
    if (actionNum === 103 && entry.attributeMask && entry.objectTypeCode) {
      console.log('[AuditDetailParsers] Action 103 - looking up attribute by column number');
      console.log('[AuditDetailParsers] attributeMask:', entry.attributeMask, 'objectTypeCode:', entry.objectTypeCode);

      // The attributeMask is the column number
      const columnNumber = parseInt(entry.attributeMask, 10);
      if (!isNaN(columnNumber)) {
        try {
          const attribute = await getAttributeByColumnNumber(entry.objectTypeCode, columnNumber);
          if (attribute) {
            attributeDisplayName = attribute.displayName;
            attributeLogicalName = attribute.logicalName;
            console.log('[AuditDetailParsers] Found attribute:', attributeDisplayName, '(', attributeLogicalName, ')');
          } else {
            console.log('[AuditDetailParsers] Attribute not found for column number:', columnNumber);
          }
        } catch (err) {
          console.warn('[AuditDetailParsers] Error looking up attribute:', err);
        }
      }
    }

    details.push({
      type: 'metadata',
      action: entry.action,
      actionLabel: MetadataActionLabels[entry.action] || `Action ${entry.action}`,
      changeData: entry.changeData || null,
      parsedChangeData,
      attributeDisplayName,
      attributeLogicalName,
      auditEnabled,
    });

    console.log('[AuditDetailParsers] Parsed metadata detail:', details[0]);
  } catch (err) {
    console.error('[AuditDetailParsers] Error parsing metadata audit detail:', err);
  }

  return details;
}

/**
 * Parse AttributeAuditDetail (data changes)
 */
export function parseAttributeAuditDetail(
  auditDetail: Record<string, unknown>,
  attributeMap: Map<string, AttributeOption>
): AttributeAuditDetail[] {
  const details: AttributeAuditDetail[] = [];

  try {
    let oldValues: Record<string, unknown> = {};
    let newValues: Record<string, unknown> = {};

    const oldValue = auditDetail.OldValue as Record<string, unknown> | undefined;
    const newValue = auditDetail.NewValue as Record<string, unknown> | undefined;

    if (oldValue) {
      const attrs = oldValue.Attributes as Array<{ key: string; value: unknown }> | undefined;
      if (attrs && Array.isArray(attrs)) {
        for (const attr of attrs) {
          if (attr.key) {
            oldValues[attr.key] = attr.value;
          }
        }
      } else if (typeof oldValue === 'object') {
        oldValues = oldValue;
      }
    }

    if (newValue) {
      const attrs = newValue.Attributes as Array<{ key: string; value: unknown }> | undefined;
      if (attrs && Array.isArray(attrs)) {
        for (const attr of attrs) {
          if (attr.key) {
            newValues[attr.key] = attr.value;
          }
        }
      } else if (typeof newValue === 'object') {
        newValues = newValue;
      }
    }

    const allAttributes = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);

    for (const attrName of allAttributes) {
      if (attrName.startsWith('@') || attrName.startsWith('_')) {
        continue;
      }

      const oldVal = oldValues[attrName];
      const newVal = newValues[attrName];

      if (oldVal === undefined && newVal === undefined) {
        continue;
      }

      const attrMeta = attributeMap.get(attrName);
      const displayName = attrMeta?.displayName || attrName;

      const oldFormatted = formatAuditValue(oldVal, oldValues, attrName);
      const newFormatted = formatAuditValue(newVal, newValues, attrName);

      details.push({
        type: 'attribute',
        attributeName: attrName,
        attributeDisplayName: displayName,
        oldValue: oldFormatted,
        newValue: newFormatted,
      });
    }
  } catch (err) {
    console.error('[AuditDetailParsers] Error parsing attribute audit detail:', err);
  }

  return details;
}

/**
 * Parse ShareAuditDetail (actions 14, 48, 49)
 */
export async function parseShareAuditDetail(auditDetail: Record<string, unknown>): Promise<ShareAuditDetail[]> {
  const details: ShareAuditDetail[] = [];

  try {
    // Log the full structure for debugging
    console.log('[AuditDetailParsers] ShareAuditDetail - Full object:', JSON.stringify(auditDetail, null, 2));

    const principal = auditDetail.Principal as Record<string, unknown> | undefined;
    const oldPrivileges = auditDetail.OldPrivileges;
    const newPrivileges = auditDetail.NewPrivileges;

    console.log('[AuditDetailParsers] ShareAuditDetail - Principal:', JSON.stringify(principal, null, 2));
    console.log('[AuditDetailParsers] ShareAuditDetail - OldPrivileges:', oldPrivileges, typeof oldPrivileges);
    console.log('[AuditDetailParsers] ShareAuditDetail - NewPrivileges:', newPrivileges, typeof newPrivileges);

    // Extract principal info
    let principalName = 'Unknown';
    let principalId = '';
    let principalType = 'systemuser';

    if (principal) {
      // Get the principal type from @odata.type (e.g., "#Microsoft.Dynamics.CRM.systemuser" or "#Microsoft.Dynamics.CRM.team")
      const odataType = (principal['@odata.type'] as string) || '';
      principalType = odataType.replace('#Microsoft.Dynamics.CRM.', '') || 'systemuser';

      // Get the principal ID - it's in the 'ownerid' field
      principalId = (principal.ownerid || principal.Id || principal.id || principal.systemuserid || principal.teamid || '') as string;

      // First check if the name is already in the response
      principalName = (principal.Name
        || principal.name
        || principal.fullname
        || principal.FullName
        || principal['@OData.Community.Display.V1.FormattedValue']
        || principal['name@OData.Community.Display.V1.FormattedValue']
        || '') as string;

      // If we don't have a name but have an ID, look it up
      if (!principalName && principalId) {
        console.log(`[AuditDetailParsers] Looking up ${principalType} name for ID: ${principalId}`);
        principalName = await lookupPrincipalName(principalId, principalType);
      }

      // Final fallback
      if (!principalName || principalName === 'Unknown') {
        principalName = principalId ? `${principalType === 'team' ? 'Team' : 'User'} (${principalId.substring(0, 8)}...)` : 'Unknown';
      }
    }

    // Format privileges - handle both numeric flags and string representations
    const formattedOldPrivileges = formatAccessRights(oldPrivileges);
    const formattedNewPrivileges = formatAccessRights(newPrivileges);

    console.log('[AuditDetailParsers] ShareAuditDetail - Principal Name:', principalName);
    console.log('[AuditDetailParsers] ShareAuditDetail - Formatted Old:', formattedOldPrivileges);
    console.log('[AuditDetailParsers] ShareAuditDetail - Formatted New:', formattedNewPrivileges);

    details.push({
      type: 'share',
      principalId,
      principalName,
      principalType,
      oldPrivileges: formattedOldPrivileges,
      newPrivileges: formattedNewPrivileges,
    });
  } catch (err) {
    console.error('[AuditDetailParsers] Error parsing share audit detail:', err);
  }

  return details;
}

/**
 * Parse RolePrivilegeAuditDetail (actions 57, 58, 59)
 * Resolves privilege names from the privilege cache
 */
export async function parseRolePrivilegeAuditDetail(auditDetail: Record<string, unknown>): Promise<RolePrivilegeAuditDetail[]> {
  const details: RolePrivilegeAuditDetail[] = [];

  try {
    const oldPrivileges = (auditDetail.OldRolePrivileges || []) as Array<Record<string, unknown>>;
    const newPrivileges = (auditDetail.NewRolePrivileges || []) as Array<Record<string, unknown>>;
    const invalidPrivileges = (auditDetail.InvalidNewPrivileges || []) as string[];

    console.log('[AuditDetailParsers] RolePrivilegeAuditDetail - OldPrivileges:', oldPrivileges?.length);
    console.log('[AuditDetailParsers] RolePrivilegeAuditDetail - NewPrivileges:', newPrivileges?.length);

    // Load privilege cache (will only fetch once, then use cache)
    const privilegeCache = await loadPrivileges();

    const mapPrivilege = (p: Record<string, unknown>): RolePrivilege => {
      const privilegeId = (p.PrivilegeId || p.privilegeId || '') as string;
      // Try to get the name from the audit response first, then from cache, then fallback to ID
      let privilegeName = (p.PrivilegeName || p.privilegeName) as string | undefined;

      if (!privilegeName && privilegeId) {
        const cachedPrivilege = privilegeCache.get(privilegeId);
        // Prefer displayName (friendly name from roleeditorlayouts) over name
        privilegeName = cachedPrivilege?.displayName || cachedPrivilege?.name;
      }

      return {
        privilegeId,
        privilegeName: privilegeName || privilegeId,
        depth: (p.Depth || p.depth || 0) as number,
        depthLabel: formatPrivilegeDepth((p.Depth || p.depth || 0) as number),
      };
    };

    // Map invalid privileges to include resolved names
    const mapInvalidPrivilege = (privId: string): InvalidPrivilege => {
      const cachedPrivilege = privilegeCache.get(privId);
      return {
        privilegeId: privId,
        // Prefer displayName (friendly name from roleeditorlayouts) over name
        privilegeName: cachedPrivilege?.displayName || cachedPrivilege?.name || privId,
      };
    };

    details.push({
      type: 'rolePrivilege',
      oldRolePrivileges: Array.isArray(oldPrivileges) ? oldPrivileges.map(mapPrivilege) : [],
      newRolePrivileges: Array.isArray(newPrivileges) ? newPrivileges.map(mapPrivilege) : [],
      invalidNewPrivileges: Array.isArray(invalidPrivileges) ? invalidPrivileges.map(mapInvalidPrivilege) : [],
    });
  } catch (err) {
    console.error('[AuditDetailParsers] Error parsing role privilege audit detail:', err);
  }

  return details;
}

/**
 * Parse UserAccessAuditDetail (actions 64, 65, 112, 113)
 */
export function parseUserAccessAuditDetail(auditDetail: Record<string, unknown>): UserAccessAuditDetail[] {
  const details: UserAccessAuditDetail[] = [];

  try {
    const accessTime = auditDetail.AccessTime as string | undefined;
    const interval = auditDetail.Interval as number | undefined;

    console.log('[AuditDetailParsers] UserAccessAuditDetail - AccessTime:', accessTime);
    console.log('[AuditDetailParsers] UserAccessAuditDetail - Interval:', interval);

    details.push({
      type: 'userAccess',
      accessTime: accessTime ? new Date(accessTime) : new Date(),
      interval: interval || 0,
    });
  } catch (err) {
    console.error('[AuditDetailParsers] Error parsing user access audit detail:', err);
  }

  return details;
}

/**
 * Parse RelationshipAuditDetail (actions 33, 34, 53, 54, 55, 56)
 */
export async function parseRelationshipAuditDetail(auditDetail: Record<string, unknown>): Promise<RelationshipAuditDetail[]> {
  const details: RelationshipAuditDetail[] = [];

  try {
    const relationshipName = (auditDetail.RelationshipName || '') as string;
    const targetRecords = (auditDetail.TargetRecords || []) as Array<Record<string, unknown>>;

    console.log('[AuditDetailParsers] RelationshipAuditDetail - RelationshipName:', relationshipName);
    console.log('[AuditDetailParsers] RelationshipAuditDetail - TargetRecords:', targetRecords?.length);
    console.log('[AuditDetailParsers] RelationshipAuditDetail - Raw targets:', JSON.stringify(targetRecords, null, 2));

    // Map and look up names for each target record
    const mappedTargets: Array<{ id: string; name: string; logicalName: string }> = [];

    if (Array.isArray(targetRecords)) {
      for (const r of targetRecords) {
        const id = (r.Id || r.id || '') as string;
        const logicalName = (r.LogicalName || r.logicalName || '') as string;
        let name = (r.Name || r.name || '') as string;

        // If no name provided, look it up using the primary name attribute
        if (!name && id && logicalName) {
          console.log(`[AuditDetailParsers] Looking up record name for ${logicalName}:${id}`);
          try {
            const record = await getRecord(logicalName, id);
            if (record) {
              name = record.name;
              console.log(`[AuditDetailParsers] Found record name: ${name}`);
            }
          } catch (err) {
            console.warn(`[AuditDetailParsers] Failed to look up record ${logicalName}:${id}`, err);
          }
        }

        mappedTargets.push({
          id,
          name: name || id || 'Unknown',
          logicalName,
        });
      }
    }

    details.push({
      type: 'relationship',
      relationshipName,
      targetRecords: mappedTargets,
    });
  } catch (err) {
    console.error('[AuditDetailParsers] Error parsing relationship audit detail:', err);
  }

  return details;
}

/**
 * Format a value from the audit detail for display
 */
export function formatAuditValue(value: unknown, allValues: Record<string, unknown>, attrName: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const formattedKey = `${attrName}@OData.Community.Display.V1.FormattedValue`;
  if (allValues[formattedKey]) {
    return String(allValues[formattedKey]);
  }

  if (typeof value === 'object' && value !== null) {
    const objValue = value as Record<string, unknown>;
    if (objValue.Name) {
      return String(objValue.Name);
    }
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Dispatch to the correct parser based on audit detail type
 */
export async function parseAuditDetail(
  auditDetail: Record<string, unknown>,
  _entityLogicalName: string,
  attributeMap: Map<string, AttributeOption>
): Promise<AuditDetail[]> {
  // Detect the type of audit detail from @odata.type
  const odataType = (auditDetail['@odata.type'] || '') as string;
  console.log('[AuditDetailParsers] AuditDetail @odata.type:', odataType);

  if (odataType.includes('ShareAuditDetail')) {
    return parseShareAuditDetail(auditDetail);
  } else if (odataType.includes('RolePrivilegeAuditDetail')) {
    return parseRolePrivilegeAuditDetail(auditDetail);
  } else if (odataType.includes('UserAccessAuditDetail')) {
    return parseUserAccessAuditDetail(auditDetail);
  } else if (odataType.includes('RelationshipAuditDetail')) {
    return parseRelationshipAuditDetail(auditDetail);
  } else {
    // Default to AttributeAuditDetail
    if (auditDetail.OldValue || auditDetail.NewValue) {
      return parseAttributeAuditDetail(auditDetail, attributeMap);
    }
  }

  return [];
}
