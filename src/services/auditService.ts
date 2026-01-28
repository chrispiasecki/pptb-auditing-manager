import type {
  OrganizationAuditSettings,
  TableAuditInfo,
  AttributeAuditInfo,
  BulkOperationResult,
} from '../model/audit';

// Debug helper: log available API methods
export function logAvailableAPIMethods(): void {
  console.log('=== DataverseAPI Methods ===');
  const api = window.dataverseAPI as unknown as Record<string, unknown>;
  console.log('Available methods:', Object.keys(api));
  console.log('Full API object:', api);

  // Check for any undocumented methods
  for (const key of Object.keys(api)) {
    console.log(`  ${key}:`, typeof api[key]);
  }
}

// Helper to extract display name from metadata
function getDisplayName(displayName: unknown): string {
  if (!displayName) return '';
  if (typeof displayName === 'string') return displayName;
  const dn = displayName as Record<string, unknown>;
  const userLabel = dn.UserLocalizedLabel as Record<string, unknown> | undefined;
  if (userLabel?.Label) {
    return String(userLabel.Label);
  }
  const labels = dn.LocalizedLabels as Array<Record<string, unknown>> | undefined;
  if (labels?.[0]?.Label) {
    return String(labels[0].Label);
  }
  return '';
}

// ============ Organization Settings ============

export async function getOrganizationAuditSettings(): Promise<OrganizationAuditSettings> {
  const result = await window.dataverseAPI.queryData(
    'organizations?$select=organizationid,isauditenabled,isuseraccessauditenabled,auditretentionperiodv2'
  );

  if (!result.value || result.value.length === 0) {
    throw new Error('Unable to retrieve organization settings');
  }

  const org = result.value[0] as Record<string, unknown>;
  return {
    organizationId: String(org.organizationid || ''),
    isAuditEnabled: org.isauditenabled === true,
    isUserAccessAuditEnabled: org.isuseraccessauditenabled === true,
    auditRetentionPeriodV2: typeof org.auditretentionperiodv2 === 'number'
      ? org.auditretentionperiodv2
      : null,
  };
}

export async function updateOrganizationAuditEnabled(
  organizationId: string,
  isEnabled: boolean
): Promise<void> {
  await window.dataverseAPI.update('organization', organizationId, {
    isauditenabled: isEnabled,
  });
}

export async function updateOrganizationUserAccessAuditEnabled(
  organizationId: string,
  isEnabled: boolean
): Promise<void> {
  await window.dataverseAPI.update('organization', organizationId, {
    isuseraccessauditenabled: isEnabled,
  });
}

// ============ Table/Entity Audit ============

export async function getAllTablesWithAuditInfo(): Promise<TableAuditInfo[]> {
  const response = await window.dataverseAPI.getAllEntitiesMetadata([
    'MetadataId',
    'LogicalName',
    'DisplayName',
    'IsCustomEntity',
    'IsAuditEnabled',
    'CanModifyAdditionalSettings',
  ]);

  // EntityMetadataCollection has a .value property with the array
  const entities = response.value || [];

  return entities
    .filter((entity: unknown) => {
      const e = entity as Record<string, unknown>;
      return e && e.LogicalName;
    })
    .map((entity: unknown) => {
      const e = entity as Record<string, unknown>;
      const canModify = e.CanModifyAdditionalSettings as Record<string, unknown> | undefined;
      // IsAuditEnabled can be a boolean or a managed property object with a Value property
      const isAuditEnabled = e.IsAuditEnabled;
      let auditEnabled = false;
      if (typeof isAuditEnabled === 'boolean') {
        auditEnabled = isAuditEnabled;
      } else if (isAuditEnabled && typeof isAuditEnabled === 'object') {
        auditEnabled = (isAuditEnabled as Record<string, unknown>).Value === true;
      }
      return {
        metadataId: String(e.MetadataId || ''),
        logicalName: String(e.LogicalName || ''),
        displayName: getDisplayName(e.DisplayName) || String(e.LogicalName || ''),
        isCustomEntity: e.IsCustomEntity === true,
        isAuditEnabled: auditEnabled,
        canModifyAuditSettings: canModify?.Value !== false,
      };
    })
    .sort((a: TableAuditInfo, b: TableAuditInfo) =>
      a.displayName.localeCompare(b.displayName)
    );
}

export async function updateTableAuditEnabled(
  logicalName: string,
  isEnabled: boolean
): Promise<void> {
  // Log available API methods for debugging
  logAvailableAPIMethods();

  // Get full entity metadata
  const entityMetadata = await window.dataverseAPI.getEntityMetadata(logicalName, true);
  console.log('Entity metadata retrieved:', entityMetadata);

  const metadataId = entityMetadata.MetadataId;
  console.log('MetadataId:', metadataId);

  // Approach 1: Try execute with UpdateEntity action (SDK message)
  try {
    console.log('Attempting UpdateEntity action...');

    const updatedMetadata = {
      '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
      MetadataId: metadataId,
      LogicalName: logicalName,
      IsAuditEnabled: {
        Value: isEnabled,
        CanBeChanged: true,
        ManagedPropertyLogicalName: 'canmodifyauditsettings',
      },
    };

    await window.dataverseAPI.execute({
      operationName: 'UpdateEntity',
      operationType: 'action',
      parameters: {
        Entity: updatedMetadata,
        SolutionUniqueName: '',
        MergeLabels: true,
      },
    });

    console.log('UpdateEntity action succeeded');
    return;
  } catch (error) {
    console.error('UpdateEntity action failed:', error);

    // Approach 2: Try using update method directly on EntityDefinitions
    // (This likely won't work as it uses PATCH, but let's log the error)
    try {
      console.log('Attempting direct update on EntityDefinitions...');

      await window.dataverseAPI.update(
        'EntityDefinition',
        metadataId,
        {
          IsAuditEnabled: {
            Value: isEnabled,
            CanBeChanged: true,
            ManagedPropertyLogicalName: 'canmodifyauditsettings',
          },
        }
      );

      console.log('Direct update succeeded');
      return;
    } catch (error2) {
      console.error('Direct update failed:', error2);
    }

    // Both approaches failed
    const err = error as Error;
    const message = err.message || JSON.stringify(error) || String(error);
    throw new Error(`Cannot update entity metadata. The PPTB API may not support metadata updates. Error: ${message}`);
  }
}

export async function bulkUpdateTableAudit(
  tables: TableAuditInfo[],
  isEnabled: boolean
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const table of tables) {
    try {
      await updateTableAuditEnabled(table.logicalName, isEnabled);
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(`${table.displayName}: ${(error as Error).message}`);
    }
  }

  return result;
}

// ============ Attribute Audit ============

export async function getAttributesForTable(
  entityLogicalName: string
): Promise<AttributeAuditInfo[]> {
  const result = await window.dataverseAPI.getEntityRelatedMetadata(
    entityLogicalName,
    'Attributes',
    [
      'MetadataId',
      'LogicalName',
      'DisplayName',
      'AttributeType',
      'IsAuditEnabled',
      'CanModifyAdditionalSettings',
    ]
  );

  // Result has .value property containing the array of attributes
  const attributes = result.value || [];

  return attributes
    .filter((attr) => {
      return (
        attr.LogicalName &&
        !String(attr.LogicalName).startsWith('yomi') &&
        attr.AttributeType !== 'Virtual' &&
        attr.AttributeType !== 'EntityName'
      );
    })
    .map((attr) => {
      const canModify = attr.CanModifyAdditionalSettings as Record<string, unknown> | undefined;
      // IsAuditEnabled can be a boolean or a managed property object with a Value property
      const isAuditEnabled = attr.IsAuditEnabled;
      let auditEnabled = false;
      if (typeof isAuditEnabled === 'boolean') {
        auditEnabled = isAuditEnabled;
      } else if (isAuditEnabled && typeof isAuditEnabled === 'object') {
        auditEnabled = (isAuditEnabled as Record<string, unknown>).Value === true;
      }
      return {
        metadataId: String(attr.MetadataId || ''),
        logicalName: String(attr.LogicalName || ''),
        displayName: getDisplayName(attr.DisplayName) || String(attr.LogicalName || ''),
        attributeType: String(attr.AttributeType || 'Unknown'),
        isAuditEnabled: auditEnabled,
        canModifyAuditSettings: canModify?.Value !== false,
      };
    })
    .sort((a: AttributeAuditInfo, b: AttributeAuditInfo) =>
      a.displayName.localeCompare(b.displayName)
    );
}

export async function updateAttributeAuditEnabled(
  entityLogicalName: string,
  attributeLogicalName: string,
  isEnabled: boolean
): Promise<void> {
  // Get the full attribute metadata
  const attrResult = await window.dataverseAPI.getEntityRelatedMetadata(
    entityLogicalName,
    `Attributes(LogicalName='${attributeLogicalName}')` as 'Attributes',
  );

  const attribute = attrResult as Record<string, unknown>;

  if (!attribute || !attribute.MetadataId) {
    throw new Error(`Attribute ${attributeLogicalName} not found on ${entityLogicalName}`);
  }

  // Update the IsAuditEnabled property on the attribute
  const updatedAttribute = {
    ...attribute,
    '@odata.type': attribute['@odata.type'] || `Microsoft.Dynamics.CRM.${attribute.AttributeType}AttributeMetadata`,
    IsAuditEnabled: {
      Value: isEnabled,
      CanBeChanged: true,
      ManagedPropertyLogicalName: 'canmodifyauditsettings',
    },
  };

  try {
    await window.dataverseAPI.execute({
      operationName: 'UpdateAttribute',
      operationType: 'action',
      parameters: {
        EntityLogicalName: entityLogicalName,
        Attribute: updatedAttribute,
        SolutionUniqueName: '',
        MergeLabels: true,
      },
    });
  } catch (error) {
    const err = error as Error;
    const message = err.message || String(error);
    throw new Error(`Failed to update audit for ${attributeLogicalName}: ${message}`);
  }
}

export async function bulkUpdateAttributeAudit(
  entityLogicalName: string,
  attributes: AttributeAuditInfo[],
  isEnabled: boolean
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const attr of attributes) {
    try {
      await updateAttributeAuditEnabled(entityLogicalName, attr.logicalName, isEnabled);
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(`${attr.displayName}: ${(error as Error).message}`);
    }
  }

  return result;
}

// ============ Publishing ============

export async function publishCustomizations(entityLogicalName?: string): Promise<void> {
  await window.dataverseAPI.publishCustomizations(entityLogicalName);
}
