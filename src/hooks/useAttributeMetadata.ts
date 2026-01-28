import { useState, useEffect, useCallback } from 'react';
import { AttributeOption } from '../model/metadata';
import { getEntityAttributes, getAuditableAttributes } from '../services/metadataService';

interface UseAttributeMetadataResult {
  attributes: AttributeOption[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage attribute metadata for a specific entity
 */
export function useAttributeMetadata(
  entityLogicalName: string | null,
  auditableOnly: boolean = false
): UseAttributeMetadataResult {
  const [attributes, setAttributes] = useState<AttributeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttributes = useCallback(async () => {
    if (!entityLogicalName) {
      setAttributes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const attrs = auditableOnly
        ? await getAuditableAttributes(entityLogicalName)
        : await getEntityAttributes(entityLogicalName);
      setAttributes(attrs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load attributes';
      setError(message);
      setAttributes([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityLogicalName, auditableOnly]);

  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  return {
    attributes,
    isLoading,
    error,
    refresh: fetchAttributes,
  };
}
