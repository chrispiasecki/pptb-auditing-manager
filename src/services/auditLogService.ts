import {
  AuditLogEntry,
  AuditFiltersState,
  PaginationState,
  AuditDetail,
  AuditRecord,
} from '../model/auditLog';
import { toAuditLogEntry } from '../utils/auditHelpers';
import { METADATA_ACTION_CODES, MetadataActionLabels } from '../utils/accessRightsConstants';
import { getAttributeMap } from './metadataService';
import { parseMetadataAuditDetail, parseAuditDetail } from './auditDetailParsers';

// Cache for audit details
const detailsCache = new Map<string, AuditDetail[]>();

/**
 * Escape special XML characters in a string
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Decode the FetchXML paging cookie from the API response.
 * The cookie is URL-encoded twice, so we need to decode it twice.
 * @see https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/page-results
 */
function decodePagingCookie(rawCookie: string): string {
  try {
    // The paging cookie from the response is in XML format with a pagingcookie attribute
    // that is URL-encoded twice. We need to extract and decode it.

    // First, try to parse as XML to extract the pagingcookie attribute
    const match = rawCookie.match(/pagingcookie="([^"]+)"/);
    if (match) {
      // Decode twice as per Microsoft docs
      return decodeURIComponent(decodeURIComponent(match[1]));
    }

    // If not in expected format, try decoding the whole thing twice
    return decodeURIComponent(decodeURIComponent(rawCookie));
  } catch (e) {
    console.warn('[AuditService] Failed to decode paging cookie:', e);
    return rawCookie;
  }
}

/**
 * Build FetchXML filter conditions from the filter state
 */
function buildFetchXmlFilters(filters: AuditFiltersState): string {
  const conditions: string[] = [];

  // Table filter (objecttypecode)
  if (filters.tableLogicalNames.length > 0) {
    if (filters.tableLogicalNames.length === 1) {
      conditions.push(`<condition attribute="objecttypecode" operator="eq" value="${escapeXml(filters.tableLogicalNames[0])}" />`);
    } else {
      const tableConditions = filters.tableLogicalNames
        .map(t => `<condition attribute="objecttypecode" operator="eq" value="${escapeXml(t)}" />`)
        .join('\n            ');
      conditions.push(`<filter type="or">\n            ${tableConditions}\n          </filter>`);
    }
  }

  // Record filter
  if (filters.recordId) {
    conditions.push(`<condition attribute="objectid" operator="eq" value="${escapeXml(filters.recordId)}" />`);
  }

  // Operation filter
  if (filters.operations.length > 0) {
    if (filters.operations.length === 1) {
      conditions.push(`<condition attribute="operation" operator="eq" value="${filters.operations[0]}" />`);
    } else {
      const opConditions = filters.operations
        .map(op => `<condition attribute="operation" operator="eq" value="${op}" />`)
        .join('\n            ');
      conditions.push(`<filter type="or">\n            ${opConditions}\n          </filter>`);
    }
  }

  // Action filter
  if (filters.actions.length > 0) {
    if (filters.actions.length === 1) {
      conditions.push(`<condition attribute="action" operator="eq" value="${filters.actions[0]}" />`);
    } else {
      const actionConditions = filters.actions
        .map(a => `<condition attribute="action" operator="eq" value="${a}" />`)
        .join('\n            ');
      conditions.push(`<filter type="or">\n            ${actionConditions}\n          </filter>`);
    }
  }

  // Date range filters
  if (filters.fromDate) {
    conditions.push(`<condition attribute="createdon" operator="ge" value="${filters.fromDate.toISOString()}" />`);
  }
  if (filters.toDate) {
    const endDate = new Date(filters.toDate);
    endDate.setDate(endDate.getDate() + 1);
    conditions.push(`<condition attribute="createdon" operator="lt" value="${endDate.toISOString()}" />`);
  }

  // User filter
  if (filters.selectedUsers.length > 0) {
    if (filters.selectedUsers.length === 1) {
      conditions.push(`<condition attribute="userid" operator="eq" value="${escapeXml(filters.selectedUsers[0].id)}" />`);
    } else {
      const userConditions = filters.selectedUsers
        .map(u => `<condition attribute="userid" operator="eq" value="${escapeXml(u.id)}" />`)
        .join('\n            ');
      conditions.push(`<filter type="or">\n            ${userConditions}\n          </filter>`);
    }
  }

  // Security role filter (for role changes, objectid is the security role)
  if (filters.selectedSecurityRoles.length > 0) {
    if (filters.selectedSecurityRoles.length === 1) {
      conditions.push(`<condition attribute="objectid" operator="eq" value="${escapeXml(filters.selectedSecurityRoles[0].id)}" />`);
    } else {
      const roleConditions = filters.selectedSecurityRoles
        .map(r => `<condition attribute="objectid" operator="eq" value="${escapeXml(r.id)}" />`)
        .join('\n            ');
      conditions.push(`<filter type="or">\n            ${roleConditions}\n          </filter>`);
    }
  }

  return conditions.length > 0 ? conditions.join('\n          ') : '';
}

/**
 * Build FetchXML query for audit logs
 */
function buildAuditFetchXml(
  filters: AuditFiltersState,
  pageSize: number,
  pageNumber: number,
  pagingCookie?: string
): string {
  const filterConditions = buildFetchXmlFilters(filters);

  // Build paging attributes
  let pagingAttrs = `count="${pageSize}" page="${pageNumber}"`;
  if (pagingCookie) {
    // The paging cookie needs to be XML-escaped when used as an attribute value
    pagingAttrs += ` paging-cookie="${escapeXml(pagingCookie)}"`;
  }

  const fetchXml = `
<fetch ${pagingAttrs} returntotalrecordcount="true">
  <entity name="audit">
    <attribute name="auditid" />
    <attribute name="createdon" />
    <attribute name="operation" />
    <attribute name="action" />
    <attribute name="objecttypecode" />
    <attribute name="objectid" />
    <attribute name="userid" />
    <attribute name="useradditionalinfo" />
    <attribute name="attributemask" />
    <attribute name="changedata" />
    <order attribute="createdon" descending="true" />
    <order attribute="auditid" descending="true" />
    ${filterConditions ? `<filter type="and">\n          ${filterConditions}\n        </filter>` : ''}
  </entity>
</fetch>`.trim();

  return fetchXml;
}

/**
 * Query audit logs with filters using FetchXML
 *
 * Paging notes (per Microsoft docs):
 * - Uses FetchXML with page and count attributes
 * - Uses paging cookie for efficient navigation between pages
 * - Ordering MUST include unique identifier (auditid) for deterministic results
 * - Paging is forward-only; going backward requires starting over
 *
 * @see https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/page-results
 */
export async function queryAuditLogs(
  filters: AuditFiltersState,
  pagination: PaginationState
): Promise<{
  entries: AuditLogEntry[];
  totalCount: number;
  hasMoreRecords: boolean;
  pagingCookie?: string;
}> {
  try {
    console.log('[AuditService] queryAuditLogs called, page:', pagination.pageNumber, 'pagingCookie:', pagination.pagingCookie ? 'present' : 'none');

    // Build FetchXML query
    const fetchXml = buildAuditFetchXml(
      filters,
      pagination.pageSize,
      pagination.pageNumber,
      pagination.pagingCookie
    );

    console.log('[AuditService] FetchXML query:', fetchXml);

    let response;
    try {
      response = await window.dataverseAPI.fetchXmlQuery(fetchXml);
      console.log('[AuditService] FetchXML response received');
    } catch (apiError) {
      console.error('[AuditService] FetchXML API call failed:', apiError);
      return { entries: [], totalCount: 0, hasMoreRecords: false };
    }

    // Handle empty response
    if (!response) {
      console.log('[AuditService] Empty response');
      return { entries: [], totalCount: 0, hasMoreRecords: false };
    }

    // Cast response to access FetchXML-specific properties
    // The FetchXmlResult type doesn't include all properties returned by the API
    const responseData = response as DataverseAPI.FetchXmlResult & {
      '@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'?: string;
      '@Microsoft.Dynamics.CRM.morerecords'?: boolean;
      '@Microsoft.Dynamics.CRM.totalrecordcount'?: number;
    };

    // Extract records from response
    const records = responseData.value || [];

    // Extract paging cookie and more records flag from response
    const rawPagingCookie = responseData['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'];
    const moreRecords = responseData['@Microsoft.Dynamics.CRM.morerecords'];
    const totalRecordCount = responseData['@Microsoft.Dynamics.CRM.totalrecordcount'];

    console.log('[AuditService] Response metadata - moreRecords:', moreRecords, 'totalCount:', totalRecordCount, 'pagingCookie:', rawPagingCookie ? 'present' : 'missing');

    // Decode the paging cookie for use in next request
    let pagingCookie: string | undefined;
    if (rawPagingCookie) {
      pagingCookie = decodePagingCookie(rawPagingCookie);
      console.log('[AuditService] Decoded paging cookie');
    }

    if (!records || records.length === 0) {
      console.log('[AuditService] No records in response');
      return { entries: [], totalCount: totalRecordCount || 0, hasMoreRecords: false };
    }

    console.log('[AuditService] Processing', records.length, 'records');

    // Map records to AuditLogEntry
    const entries: AuditLogEntry[] = [];
    for (const record of records as unknown as AuditRecord[]) {
      try {
        if (record && record.auditid) {
          entries.push(toAuditLogEntry(record));
        }
      } catch (err) {
        console.warn('[AuditService] Skipping invalid audit record:', err);
      }
    }

    // Determine if there are more records
    // If moreRecords is explicitly set, use it; otherwise check if we got a full page
    const hasMoreRecords = moreRecords ?? (records.length >= pagination.pageSize);

    // Use totalRecordCount if available, otherwise estimate
    const totalCount = totalRecordCount || (hasMoreRecords ? entries.length * (pagination.pageNumber + 1) : entries.length + (pagination.pageNumber - 1) * pagination.pageSize);

    console.log('[AuditService] Returning', entries.length, 'entries, hasMore:', hasMoreRecords, 'totalCount:', totalCount);
    return { entries, totalCount, hasMoreRecords, pagingCookie };
  } catch (error) {
    console.error('[AuditService] queryAuditLogs error:', error);
    return { entries: [], totalCount: 0, hasMoreRecords: false };
  }
}

/**
 * Get audit details for a specific audit record
 * Uses RetrieveAuditDetails function via Web API
 * For metadata changes (actions 100-105), uses the changeData from the entry
 */
export async function getAuditDetails(
  auditId: string,
  entityLogicalName: string,
  entry?: AuditLogEntry
): Promise<AuditDetail[]> {
  console.log('[AuditService] getAuditDetails called for:', auditId, 'entity:', entityLogicalName);

  try {
    // Check if this is a metadata change action
    if (entry && (METADATA_ACTION_CODES as readonly number[]).includes(entry.action)) {
      console.log('[AuditService] Metadata action detected:', entry.action);
      const details = await parseMetadataAuditDetail(entry);
      detailsCache.set(auditId, details);
      return details;
    }

    let response: Record<string, unknown> | null = null;

    console.log('[AuditService] Calling RetrieveAuditDetails');
    response = await (window.dataverseAPI as { execute: (params: unknown) => Promise<Record<string, unknown>> }).execute({
      operationName: 'RetrieveAuditDetails',
      operationType: 'function',
      entityName: 'audit',
      entityId: auditId,
    });
    console.log('[AuditService] Execute response:', response);

    if (!response) {
      console.log('[AuditService] No response received');
      return [];
    }

    // The response might have AuditDetail directly or nested
    const auditDetail = (response.AuditDetail || response) as Record<string, unknown>;
    console.log('[AuditService] AuditDetail:', auditDetail);

    if (!auditDetail) {
      console.log('[AuditService] No AuditDetail in response');
      detailsCache.set(auditId, []);
      return [];
    }

    // Get attribute map for attribute lookups
    const attributeMap = await getAttributeMap(entityLogicalName);

    // Use the shared parser dispatcher
    const details = await parseAuditDetail(auditDetail, entityLogicalName, attributeMap);

    // Cache the result
    detailsCache.set(auditId, details);

    console.log('[AuditService] Returning', details.length, 'details');
    return details;
  } catch (error) {
    console.error('[AuditService] Error fetching audit details:', error);
    detailsCache.set(auditId, []);
    return [];
  }
}

/**
 * Get record change history (for specific record filtering)
 * Uses FetchXML query filtered by record ID
 *
 * @see https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/page-results
 */
export async function getRecordChangeHistory(
  _entityLogicalName: string,
  recordId: string,
  pagination: PaginationState
): Promise<{
  entries: AuditLogEntry[];
  details: Map<string, AuditDetail[]>;
  totalCount: number;
  hasMoreRecords: boolean;
  pagingCookie?: string;
}> {
  // Build paging attributes
  let pagingAttrs = `count="${pagination.pageSize}" page="${pagination.pageNumber}"`;
  if (pagination.pagingCookie) {
    pagingAttrs += ` paging-cookie="${escapeXml(pagination.pagingCookie)}"`;
  }

  const fetchXml = `
<fetch ${pagingAttrs} returntotalrecordcount="true">
  <entity name="audit">
    <attribute name="auditid" />
    <attribute name="createdon" />
    <attribute name="operation" />
    <attribute name="action" />
    <attribute name="objecttypecode" />
    <attribute name="objectid" />
    <attribute name="userid" />
    <attribute name="useradditionalinfo" />
    <attribute name="attributemask" />
    <attribute name="changedata" />
    <order attribute="createdon" descending="true" />
    <order attribute="auditid" descending="true" />
    <filter type="and">
      <condition attribute="objectid" operator="eq" value="${escapeXml(recordId)}" />
    </filter>
  </entity>
</fetch>`.trim();

  console.log('[AuditService] getRecordChangeHistory FetchXML:', fetchXml);

  let response;
  try {
    response = await window.dataverseAPI.fetchXmlQuery(fetchXml);
  } catch (apiError) {
    console.error('[AuditService] getRecordChangeHistory API call failed:', apiError);
    return {
      entries: [],
      details: new Map(),
      totalCount: 0,
      hasMoreRecords: false,
    };
  }

  // Handle empty response
  if (!response) {
    return {
      entries: [],
      details: new Map(),
      totalCount: 0,
      hasMoreRecords: false,
    };
  }

  // Cast response to access FetchXML-specific properties
  const responseData = response as DataverseAPI.FetchXmlResult & {
    '@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'?: string;
    '@Microsoft.Dynamics.CRM.morerecords'?: boolean;
    '@Microsoft.Dynamics.CRM.totalrecordcount'?: number;
  };

  const records = responseData.value || [];
  const rawPagingCookie = responseData['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'];
  const moreRecords = responseData['@Microsoft.Dynamics.CRM.morerecords'];
  const totalRecordCount = responseData['@Microsoft.Dynamics.CRM.totalrecordcount'];

  // Decode the paging cookie
  let pagingCookie: string | undefined;
  if (rawPagingCookie) {
    pagingCookie = decodePagingCookie(rawPagingCookie);
  }

  if (!records || records.length === 0) {
    return {
      entries: [],
      details: new Map(),
      totalCount: totalRecordCount || 0,
      hasMoreRecords: false,
    };
  }

  // Map records to AuditLogEntry
  const entries: AuditLogEntry[] = [];
  for (const record of records as unknown as AuditRecord[]) {
    try {
      if (record && record.auditid) {
        entries.push(toAuditLogEntry(record));
      }
    } catch (err) {
      console.warn('[AuditService] Skipping invalid audit record:', err);
    }
  }

  const hasMoreRecords = moreRecords ?? (records.length >= pagination.pageSize);
  const totalCount = totalRecordCount || entries.length;

  return {
    entries,
    details: new Map(),
    totalCount,
    hasMoreRecords,
    pagingCookie,
  };
}

/**
 * Get full record change history using RetrieveRecordChangeHistory
 * This is an unbound function that takes a Target entity reference and PagingInfo
 * @param entityLogicalName - The logical name of the entity
 * @param recordId - The GUID of the record
 * @param pageSize - Number of records per page (default 50)
 * @param pageNumber - Page number to retrieve (default 1)
 */
export async function retrieveRecordChangeHistory(
  entityLogicalName: string,
  recordId: string,
  pageSize: number = 50,
  pageNumber: number = 1
): Promise<AuditLogEntry[]> {
  console.log('[AuditService] retrieveRecordChangeHistory called for:', entityLogicalName, recordId, 'page:', pageNumber);

  try {
    const response = await window.dataverseAPI.execute({
      operationName: 'RetrieveRecordChangeHistory',
      operationType: 'function',
      parameters: {
        Target: {
          '@odata.type': `Microsoft.Dynamics.CRM.${entityLogicalName}`,
          [`${entityLogicalName}id`]: recordId,
        },
        PagingInfo: {
          Count: pageSize,
          PageNumber: pageNumber,
        },
      },
    });

    console.log('[AuditService] RetrieveRecordChangeHistory response:', response);

    if (!response) {
      console.log('[AuditService] No response received');
      return [];
    }

    // The response should have an AuditDetailCollection
    const auditDetails = (response as Record<string, unknown>).AuditDetailCollection || response;

    if (!auditDetails || !Array.isArray(auditDetails)) {
      console.log('[AuditService] No audit details in response');
      return [];
    }

    // Map the audit details to entries
    const entries: AuditLogEntry[] = [];
    for (const detail of auditDetails as Array<{ AuditRecord?: AuditRecord }>) {
      try {
        if (detail && detail.AuditRecord) {
          entries.push(toAuditLogEntry(detail.AuditRecord));
        }
      } catch (err) {
        console.warn('[AuditService] Error mapping audit record:', err);
      }
    }

    console.log('[AuditService] Returning', entries.length, 'history entries');
    return entries;
  } catch (error) {
    console.error('[AuditService] Error retrieving record change history:', error);
    throw error;
  }
}

/**
 * Query all audit logs matching filters (for export)
 * Iterates through all pages to fetch complete results
 *
 * @param filters - Filter criteria
 * @param maxRecords - Maximum number of records to fetch (0 = unlimited)
 * @param onProgress - Optional callback to report progress
 */
export async function queryAllAuditLogs(
  filters: AuditFiltersState,
  maxRecords: number = 0,
  onProgress?: (fetched: number, total: number) => void
): Promise<{
  entries: AuditLogEntry[];
  totalCount: number;
}> {
  const allEntries: AuditLogEntry[] = [];
  const pageSize = 250; // Use larger page size for bulk fetching
  let pageNumber = 1;
  let pagingCookie: string | undefined;
  let hasMoreRecords = true;
  let totalCount = 0;

  console.log('[AuditService] queryAllAuditLogs started, maxRecords:', maxRecords);

  while (hasMoreRecords) {
    // Check if we've reached the limit
    if (maxRecords > 0 && allEntries.length >= maxRecords) {
      console.log('[AuditService] Reached max records limit:', maxRecords);
      break;
    }

    // Build pagination state for this page
    const pagination: PaginationState = {
      pageNumber,
      pageSize,
      totalCount: 0,
      hasMoreRecords: false,
      pagingCookie,
    };

    // Fetch this page
    const result = await queryAuditLogs(filters, pagination);

    if (result.entries.length === 0) {
      break;
    }

    // Add entries (respecting limit if set)
    if (maxRecords > 0) {
      const remaining = maxRecords - allEntries.length;
      allEntries.push(...result.entries.slice(0, remaining));
    } else {
      allEntries.push(...result.entries);
    }

    // Update pagination state
    totalCount = result.totalCount;
    hasMoreRecords = result.hasMoreRecords;
    pagingCookie = result.pagingCookie;
    pageNumber++;

    // Report progress
    if (onProgress) {
      onProgress(allEntries.length, totalCount);
    }

    console.log('[AuditService] Fetched page', pageNumber - 1, '- total entries:', allEntries.length);
  }

  console.log('[AuditService] queryAllAuditLogs complete, total entries:', allEntries.length);
  return { entries: allEntries, totalCount };
}

/**
 * Clear audit details cache
 */
export function clearAuditDetailsCache(): void {
  detailsCache.clear();
}

/**
 * Get cached details for an audit entry
 */
export function getCachedDetails(auditId: string): AuditDetail[] | undefined {
  return detailsCache.get(auditId);
}

// Re-export metadata action labels for backward compatibility
export { MetadataActionLabels };
