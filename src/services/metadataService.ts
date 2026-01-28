import {
  EntityOption,
  AttributeOption,
  EntityMetadataResponse,
  AttributeMetadataResponse,
  RecordSearchResult,
  toEntityOption,
  toAttributeOption,
} from '../model/metadata';
import { extractArrayFromResponse } from '../utils/responseParser';

// Cache for entity metadata
let entityCache: EntityOption[] | null = null;
const attributeCache = new Map<string, AttributeOption[]>();

/**
 * Get all entities with their audit status
 */
export async function getAllEntities(): Promise<EntityOption[]> {
  console.log('[MetadataService] getAllEntities called');

  if (entityCache) {
    console.log('[MetadataService] Returning cached entities:', entityCache.length);
    return entityCache;
  }

  const selectColumns = [
    'LogicalName',
    'DisplayName',
    'DisplayCollectionName',
    'IsAuditEnabled',
    'PrimaryIdAttribute',
    'PrimaryNameAttribute',
    'ObjectTypeCode',
  ];

  try {
    console.log('[MetadataService] Checking dataverseAPI availability');
    if (!window.dataverseAPI) {
      throw new Error('dataverseAPI is not available');
    }
    if (!window.dataverseAPI.getAllEntitiesMetadata) {
      throw new Error('getAllEntitiesMetadata method is not available');
    }
    console.log('[MetadataService] Calling dataverseAPI.getAllEntitiesMetadata');
    const response = await window.dataverseAPI.getAllEntitiesMetadata(selectColumns);
    console.log('[MetadataService] Raw API response:', response);
    console.log('[MetadataService] API response type:', typeof response, Array.isArray(response) ? `array of ${response.length}` : 'not array');

    // Use shared response parser
    const entityArray = extractArrayFromResponse<EntityMetadataResponse>(response);
    console.log('[MetadataService] Extracted', entityArray.length, 'entities from response');

    if (entityArray.length === 0) {
      console.warn('[MetadataService] No entities returned from API');
      return [];
    }

    console.log('[MetadataService] Processing', entityArray.length, 'entities');
    // Log first entity to see the actual structure
    console.log('[MetadataService] Sample entity structure:', JSON.stringify(entityArray[0], null, 2));

    const entities: EntityOption[] = [];
    for (const e of entityArray) {
      try {
        if (e && e.LogicalName && !e.LogicalName.startsWith('msdyn_')) {
          entities.push(toEntityOption(e as EntityMetadataResponse));
        }
      } catch (err) {
        console.warn('[MetadataService] Error converting entity:', e?.LogicalName, err);
      }
    }

    entities.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const auditableCount = entities.filter(e => e.isAuditEnabled).length;
    console.log('[MetadataService] Filtered to', entities.length, 'entities,', auditableCount, 'are auditable');
    entityCache = entities;
    return entities;
  } catch (error) {
    console.error('[MetadataService] Error in getAllEntities:', error);
    throw error;
  }
}

/**
 * Get only auditable entities
 */
export async function getAuditableEntities(): Promise<EntityOption[]> {
  const entities = await getAllEntities();
  return entities.filter(e => e.isAuditEnabled);
}

/**
 * Get entity by logical name
 */
export async function getEntityByLogicalName(logicalName: string): Promise<EntityOption | undefined> {
  const entities = await getAllEntities();
  return entities.find(e => e.logicalName === logicalName);
}

/**
 * Get attributes for an entity
 */
export async function getEntityAttributes(entityLogicalName: string): Promise<AttributeOption[]> {
  console.log('[MetadataService] getEntityAttributes called for:', entityLogicalName);

  try {
    const cached = attributeCache.get(entityLogicalName);
    if (cached) {
      console.log('[MetadataService] Returning cached attributes');
      return cached;
    }

    const columns = [
      'LogicalName',
      'DisplayName',
      'AttributeType',
      'IsAuditEnabled',
      'ColumnNumber',
    ];

    console.log('[MetadataService] Fetching attributes from API');
    const response = await window.dataverseAPI.getEntityRelatedMetadata(
      entityLogicalName,
      'Attributes',
      columns
    );

    console.log('[MetadataService] Raw attributes response:', response);

    // Use shared response parser
    const attributeArray = extractArrayFromResponse<AttributeMetadataResponse>(response);
    console.log('[MetadataService] Processing', attributeArray.length, 'attributes');
    const attributes: AttributeOption[] = [];

    for (const item of attributeArray) {
      try {
        if (item && item.LogicalName && !item.LogicalName.startsWith('yomi')) {
          attributes.push(toAttributeOption(item as AttributeMetadataResponse));
        }
      } catch (err) {
        console.warn('[MetadataService] Error converting attribute:', err);
      }
    }

    attributes.sort((a, b) => a.displayName.localeCompare(b.displayName));

    attributeCache.set(entityLogicalName, attributes);
    console.log('[MetadataService] Returning', attributes.length, 'attributes');
    return attributes;
  } catch (error) {
    console.error('[MetadataService] Error fetching attributes:', error);
    return [];
  }
}

/**
 * Get auditable attributes for an entity
 */
export async function getAuditableAttributes(entityLogicalName: string): Promise<AttributeOption[]> {
  const attributes = await getEntityAttributes(entityLogicalName);
  return attributes.filter(a => a.isAuditEnabled);
}

/**
 * Get attribute metadata as a Map for quick lookup
 */
export async function getAttributeMap(entityLogicalName: string): Promise<Map<string, AttributeOption>> {
  const attributes = await getEntityAttributes(entityLogicalName);
  return new Map(attributes.map(a => [a.logicalName, a]));
}

/**
 * Get attribute by column number
 * The attributemask in audit records corresponds to the ColumnNumber in attribute metadata
 */
export async function getAttributeByColumnNumber(
  entityLogicalName: string,
  columnNumber: number
): Promise<AttributeOption | undefined> {
  const attributes = await getEntityAttributes(entityLogicalName);
  return attributes.find(a => a.columnNumber === columnNumber);
}

/**
 * Search records by name
 */
export async function searchRecords(
  entityLogicalName: string,
  searchTerm: string,
  top: number = 25
): Promise<RecordSearchResult[]> {
  const entity = await getEntityByLogicalName(entityLogicalName);
  if (!entity) {
    throw new Error(`Entity ${entityLogicalName} not found`);
  }

  const primaryId = entity.primaryIdAttribute;
  const primaryName = entity.primaryNameAttribute;

  if (!primaryName) {
    throw new Error(`Entity ${entityLogicalName} does not have a primary name attribute`);
  }

  // Build FetchXML for search
  const fetchXml = `
    <fetch top="${top}">
      <entity name="${entityLogicalName}">
        <attribute name="${primaryId}" />
        <attribute name="${primaryName}" />
        <filter type="and">
          <condition attribute="${primaryName}" operator="like" value="%${escapeXml(searchTerm)}%" />
        </filter>
        <order attribute="${primaryName}" />
      </entity>
    </fetch>
  `;

  const response = await window.dataverseAPI.fetchXmlQuery(fetchXml);

  if (!response || !response.value) {
    return [];
  }

  return response.value.map((record: any) => ({
    id: record[primaryId],
    name: record[primaryName] || record[primaryId],
    entityLogicalName,
    entityDisplayName: entity.displayName,
  }));
}

/**
 * Get a single record by ID
 */
export async function getRecord(
  entityLogicalName: string,
  recordId: string
): Promise<RecordSearchResult | null> {
  const entity = await getEntityByLogicalName(entityLogicalName);
  if (!entity) {
    return null;
  }

  const primaryName = entity.primaryNameAttribute;

  try {
    const record = await window.dataverseAPI.retrieve(
      entityLogicalName,
      recordId,
      primaryName ? [primaryName] : []
    );

    if (!record) {
      return null;
    }

    const recordName = primaryName && record[primaryName] ? String(record[primaryName]) : recordId;
    return {
      id: recordId,
      name: recordName,
      entityLogicalName,
      entityDisplayName: entity.displayName,
    };
  } catch {
    return null;
  }
}

/**
 * Clear metadata cache
 */
export function clearMetadataCache(): void {
  entityCache = null;
  attributeCache.clear();
}

// Helper to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
