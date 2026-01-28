/**
 * Privilege Service
 * Caches and retrieves privilege metadata from Dataverse
 * Also fetches friendly display names from roleeditorlayouts table
 */

export interface Privilege {
  privilegeId: string;
  name: string;
  displayName?: string; // Friendly name from roleeditorlayouts
  accessRight: number;
}

// Cache for privileges - Map of privilegeId -> Privilege
let privilegeCache: Map<string, Privilege> | null = null;
let privilegeCachePromise: Promise<Map<string, Privilege>> | null = null;

// Cache for role editor layouts - Map of privilegename -> displayname
let roleEditorLayoutCache: Map<string, string> | null = null;
let roleEditorLayoutCachePromise: Promise<Map<string, string>> | null = null;

/**
 * Load role editor layouts from Dataverse and cache them
 * These contain user-friendly display names for privileges
 */
async function loadRoleEditorLayouts(): Promise<Map<string, string>> {
  // Return cached data if available
  if (roleEditorLayoutCache) {
    return roleEditorLayoutCache;
  }

  // If already loading, wait for that request
  if (roleEditorLayoutCachePromise) {
    return roleEditorLayoutCachePromise;
  }

  // Start loading
  roleEditorLayoutCachePromise = fetchRoleEditorLayouts();

  try {
    roleEditorLayoutCache = await roleEditorLayoutCachePromise;
    return roleEditorLayoutCache;
  } finally {
    roleEditorLayoutCachePromise = null;
  }
}

/**
 * Fetch role editor layouts from Dataverse
 */
async function fetchRoleEditorLayouts(): Promise<Map<string, string>> {
  const cache = new Map<string, string>();

  try {
    console.log('[PrivilegeService] Fetching role editor layouts...');

    let nextLink: string | null = 'roleeditorlayouts?$select=privilegename,displayname';
    let totalFetched = 0;

    while (nextLink) {
      const response = await window.dataverseAPI.queryData(nextLink);

      if (!response) {
        console.warn('[PrivilegeService] Empty response from role editor layouts query');
        break;
      }

      // Handle response format
      const records = Array.isArray(response) ? response : (response as any).value;

      if (records && Array.isArray(records)) {
        for (const record of records) {
          if (record.privilegename && record.displayname) {
            cache.set(record.privilegename, record.displayname);
          }
        }
        totalFetched += records.length;
      }

      // Check for more pages
      nextLink = (response as any)['@odata.nextLink'] || null;

      // Safety limit
      if (totalFetched > 5000) {
        console.warn('[PrivilegeService] Reached safety limit of 5000 role editor layouts');
        break;
      }
    }

    console.log('[PrivilegeService] Loaded', cache.size, 'role editor layouts');
    return cache;
  } catch (error) {
    console.error('[PrivilegeService] Error fetching role editor layouts:', error);
    return cache; // Return what we have
  }
}

/**
 * Load all privileges from Dataverse and cache them
 * Also loads role editor layouts for friendly display names
 * Uses singleton pattern to avoid multiple simultaneous requests
 */
export async function loadPrivileges(): Promise<Map<string, Privilege>> {
  // Return cached data if available
  if (privilegeCache) {
    return privilegeCache;
  }

  // If already loading, wait for that request
  if (privilegeCachePromise) {
    return privilegeCachePromise;
  }

  // Start loading both in parallel
  privilegeCachePromise = fetchAllPrivileges();

  try {
    privilegeCache = await privilegeCachePromise;
    return privilegeCache;
  } finally {
    privilegeCachePromise = null;
  }
}

/**
 * Fetch all privileges from Dataverse
 * The privilege table typically has ~1000+ records, so we need to handle paging
 */
async function fetchAllPrivileges(): Promise<Map<string, Privilege>> {
  const cache = new Map<string, Privilege>();

  try {
    console.log('[PrivilegeService] Fetching all privileges...');

    // Load role editor layouts first (or in parallel)
    const layoutsPromise = loadRoleEditorLayouts();

    let nextLink: string | null = 'privileges?$select=privilegeid,name,accessright&$orderby=name';
    let totalFetched = 0;

    while (nextLink) {
      const response = await window.dataverseAPI.queryData(nextLink);

      if (!response) {
        console.warn('[PrivilegeService] Empty response from privilege query');
        break;
      }

      // Handle response format
      const records = Array.isArray(response) ? response : (response as any).value;

      if (records && Array.isArray(records)) {
        for (const record of records) {
          if (record.privilegeid) {
            cache.set(record.privilegeid, {
              privilegeId: record.privilegeid,
              name: record.name || record.privilegeid,
              accessRight: record.accessright || 0,
            });
          }
        }
        totalFetched += records.length;
      }

      // Check for more pages
      nextLink = (response as any)['@odata.nextLink'] || null;

      // Safety limit to prevent infinite loops
      if (totalFetched > 5000) {
        console.warn('[PrivilegeService] Reached safety limit of 5000 privileges');
        break;
      }
    }

    console.log('[PrivilegeService] Loaded', cache.size, 'privileges');

    // Wait for layouts to finish loading and apply display names
    const layouts = await layoutsPromise;

    // Apply display names from role editor layouts
    for (const [, privilege] of cache) {
      const displayName = layouts.get(privilege.name);
      if (displayName) {
        privilege.displayName = displayName;
      }
    }

    console.log('[PrivilegeService] Applied display names from role editor layouts');
    return cache;
  } catch (error) {
    console.error('[PrivilegeService] Error fetching privileges:', error);
    return cache; // Return what we have
  }
}

/**
 * Get privilege display name by ID
 * Returns the friendly displayName if available, otherwise the name, otherwise the ID
 */
export async function getPrivilegeName(privilegeId: string): Promise<string> {
  const cache = await loadPrivileges();
  const privilege = cache.get(privilegeId);
  return privilege?.displayName || privilege?.name || privilegeId;
}

/**
 * Get multiple privilege names by their IDs
 * Returns a map of privilegeId -> displayName (or name as fallback)
 */
export async function getPrivilegeNames(privilegeIds: string[]): Promise<Map<string, string>> {
  const cache = await loadPrivileges();
  const result = new Map<string, string>();

  for (const id of privilegeIds) {
    const privilege = cache.get(id);
    result.set(id, privilege?.displayName || privilege?.name || id);
  }

  return result;
}

/**
 * Get privilege by ID
 */
export async function getPrivilege(privilegeId: string): Promise<Privilege | undefined> {
  const cache = await loadPrivileges();
  return cache.get(privilegeId);
}

/**
 * Clear the privilege cache
 */
export function clearPrivilegeCache(): void {
  privilegeCache = null;
  privilegeCachePromise = null;
  roleEditorLayoutCache = null;
  roleEditorLayoutCachePromise = null;
  console.log('[PrivilegeService] Cache cleared');
}

/**
 * Check if privileges are already cached
 */
export function isPrivilegeCacheLoaded(): boolean {
  return privilegeCache !== null;
}
