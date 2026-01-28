/**
 * Service for looking up principal (user/team) information
 */

// Cache for principal (user/team) names - Map of cacheKey -> name
const principalNameCache = new Map<string, string>();

/**
 * Look up a principal (user or team) name from Dataverse
 */
export async function lookupPrincipalName(principalId: string, principalType: string): Promise<string> {
  // Check cache first
  const cacheKey = `${principalType}:${principalId}`;
  const cached = principalNameCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    let name = 'Unknown';

    if (principalType === 'systemuser') {
      // Look up user
      const response = await window.dataverseAPI.queryData(
        `systemusers(${principalId})?$select=fullname`
      );
      if (response && (response as Record<string, unknown>).fullname) {
        name = (response as Record<string, unknown>).fullname as string;
      }
    } else if (principalType === 'team') {
      // Look up team
      const response = await window.dataverseAPI.queryData(
        `teams(${principalId})?$select=name`
      );
      if (response && (response as Record<string, unknown>).name) {
        name = (response as Record<string, unknown>).name as string;
      }
    }

    // Cache the result
    principalNameCache.set(cacheKey, name);
    return name;
  } catch (error) {
    console.warn(`[PrincipalService] Failed to look up ${principalType} ${principalId}:`, error);
    return 'Unknown';
  }
}

/**
 * Clear the principal name cache
 */
export function clearPrincipalCache(): void {
  principalNameCache.clear();
}
