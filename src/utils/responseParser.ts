/**
 * Shared utilities for parsing OData responses from Dataverse
 */

/**
 * Extract array from various OData response formats
 * Handles: raw array, { value: [...] }, or object with values
 */
export function extractArrayFromResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === 'object') {
    if ('value' in response && Array.isArray((response as Record<string, unknown>).value)) {
      return (response as Record<string, unknown>).value as T[];
    }
    return Object.values(response) as T[];
  }

  return [];
}

/**
 * Extract OData metadata from response
 */
export function extractODataMetadata(response: unknown): {
  count?: number;
  nextLink?: string;
} {
  if (!response || typeof response !== 'object') {
    return {};
  }

  const resp = response as Record<string, unknown>;
  return {
    count: resp['@odata.count'] as number | undefined,
    nextLink: resp['@odata.nextLink'] as string | undefined,
  };
}
