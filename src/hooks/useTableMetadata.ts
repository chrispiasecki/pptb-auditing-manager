import { useState, useEffect, useCallback } from 'react';
import { EntityOption } from '../model/metadata';
import { getAllEntities } from '../services/metadataService';

interface UseTableMetadataResult {
  tables: EntityOption[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage table metadata
 * @param isConnected - Whether there's an active Dataverse connection
 */
export function useTableMetadata(isConnected: boolean = false): UseTableMetadataResult {
  const [tables, setTables] = useState<EntityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    console.log('[useTableMetadata] fetchTables called, isConnected:', isConnected);

    if (!isConnected) {
      console.log('[useTableMetadata] Not connected, skipping fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useTableMetadata] Fetching all entities');
      const entities = await getAllEntities();
      console.log('[useTableMetadata] Received entities:', entities.length);
      setTables(entities);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tables';
      console.error('[useTableMetadata] Error fetching tables:', message, err);
      setError(message);
      setTables([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    console.log('[useTableMetadata] useEffect triggered, isConnected:', isConnected);
    if (isConnected) {
      fetchTables();
    }
  }, [isConnected, fetchTables]);

  console.log('[useTableMetadata] Returning state - tables:', tables.length, 'isLoading:', isLoading, 'error:', error);

  return {
    tables,
    isLoading,
    error,
    refresh: fetchTables,
  };
}
