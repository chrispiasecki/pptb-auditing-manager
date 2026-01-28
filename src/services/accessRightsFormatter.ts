/**
 * Formatters for access rights and privilege depth values
 */

import { AccessRights, PrivilegeDepthLabels } from '../utils/accessRightsConstants';

/**
 * Format AccessRights flags to readable string
 * Handles various input formats: number, string, or object
 */
export function formatAccessRights(rights: unknown): string {
  if (rights === null || rights === undefined) return 'None';

  // If it's already a readable string (e.g., "ReadAccess, WriteAccess"), return it
  if (typeof rights === 'string') {
    // Check if it's a numeric string
    const numValue = parseInt(rights, 10);
    if (isNaN(numValue)) {
      // It's a descriptive string - clean it up and return
      return rights
        .replace(/Access/g, '')  // Remove "Access" suffix if present
        .replace(/,\s*/g, ', ')  // Normalize comma spacing
        .trim() || 'None';
    }
    // It's a numeric string, convert to number and process
    return formatAccessRightsFromNumber(numValue);
  }

  if (typeof rights === 'number') {
    return formatAccessRightsFromNumber(rights);
  }

  // If it's an object, try to extract a value
  if (typeof rights === 'object') {
    const val = (rights as Record<string, unknown>).Value ?? (rights as Record<string, unknown>).value ?? rights;
    if (typeof val === 'number') {
      return formatAccessRightsFromNumber(val);
    }
    if (typeof val === 'string') {
      return val || 'None';
    }
  }

  return String(rights) || 'None';
}

/**
 * Convert numeric AccessRights flags to readable string
 */
export function formatAccessRightsFromNumber(value: number): string {
  if (value === 0) return 'None';

  const flags: string[] = [];
  if (value & AccessRights.Read) flags.push('Read');
  if (value & AccessRights.Write) flags.push('Write');
  if (value & AccessRights.Append) flags.push('Append');
  if (value & AccessRights.AppendTo) flags.push('AppendTo');
  if (value & AccessRights.Create) flags.push('Create');
  if (value & AccessRights.Delete) flags.push('Delete');
  if (value & AccessRights.Share) flags.push('Share');
  if (value & AccessRights.Assign) flags.push('Assign');

  return flags.length > 0 ? flags.join(', ') : 'None';
}

/**
 * Format privilege depth to readable string
 */
export function formatPrivilegeDepth(depth: number): string {
  return PrivilegeDepthLabels[depth] || `Level ${depth}`;
}
