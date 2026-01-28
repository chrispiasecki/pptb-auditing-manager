// Format date for display
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Format date only (no time)
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Format date for API (ISO format)
export function formatDateForApi(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}

// Format value for display (handles various types)
export function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '(empty)';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  if (value instanceof Date) {
    return formatDateTime(value);
  }

  if (typeof value === 'object') {
    // Handle EntityReference
    if (value.Name) {
      return value.Name;
    }
    // Handle OptionSetValue
    if (value.Label) {
      return value.Label;
    }
    // Handle Money
    if (value.Value !== undefined) {
      return formatCurrency(value.Value);
    }
    // Fallback to JSON
    return JSON.stringify(value);
  }

  return String(value);
}

// Format currency value
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(value);
}

// Truncate long text
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Escape CSV value
export function escapeCSV(value: string): string {
  if (!value) return '';

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

// Format GUID (remove curly braces if present)
export function formatGuid(guid: string | null | undefined): string {
  if (!guid) return '';
  return guid.replace(/[{}]/g, '').toLowerCase();
}

// Parse GUID from various formats
export function parseGuid(value: string | null | undefined): string | null {
  if (!value) return null;

  // Remove curly braces and whitespace
  const cleaned = value.replace(/[{}\s]/g, '').toLowerCase();

  // Validate GUID format
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (guidRegex.test(cleaned)) {
    return cleaned;
  }

  // Try without dashes
  const noDashRegex = /^[0-9a-f]{32}$/i;
  if (noDashRegex.test(cleaned)) {
    return `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`;
  }

  return null;
}
