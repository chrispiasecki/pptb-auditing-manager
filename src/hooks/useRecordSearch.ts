import { useState, useEffect, useCallback } from 'react';
import { RecordSearchResult } from '../model/metadata';
import { searchRecords, getRecord } from '../services/metadataService';
import { useDebounce } from './useDebounce';
import { SEARCH_DEBOUNCE_MS } from '../utils/constants';

interface UseRecordSearchResult {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  results: RecordSearchResult[];
  isSearching: boolean;
  error: string | null;
  selectedRecord: RecordSearchResult | null;
  selectRecord: (record: RecordSearchResult | null) => void;
  clearSelection: () => void;
}

/**
 * Hook to manage record search with debouncing
 */
export function useRecordSearch(entityLogicalName: string | null): UseRecordSearchResult {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<RecordSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordSearchResult | null>(null);

  // Debounce the search term
  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS);

  // Perform search when debounced term changes
  const performSearch = useCallback(async () => {
    if (!entityLogicalName || !debouncedSearchTerm || debouncedSearchTerm.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchResults = await searchRecords(entityLogicalName, debouncedSearchTerm);
      setResults(searchResults);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [entityLogicalName, debouncedSearchTerm]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Clear results when entity changes
  useEffect(() => {
    setSearchTerm('');
    setResults([]);
    setSelectedRecord(null);
    setError(null);
  }, [entityLogicalName]);

  const selectRecord = useCallback((record: RecordSearchResult | null) => {
    setSelectedRecord(record);
    if (record) {
      setSearchTerm('');
      setResults([]);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRecord(null);
    setSearchTerm('');
    setResults([]);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    results,
    isSearching,
    error,
    selectedRecord,
    selectRecord,
    clearSelection,
  };
}

/**
 * Hook to load a specific record by ID
 */
export function useRecordById(
  entityLogicalName: string | null,
  recordId: string | null
): {
  record: RecordSearchResult | null;
  isLoading: boolean;
  error: string | null;
} {
  const [record, setRecord] = useState<RecordSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityLogicalName || !recordId) {
      setRecord(null);
      return;
    }

    const loadRecord = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getRecord(entityLogicalName, recordId);
        setRecord(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load record';
        setError(message);
        setRecord(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecord();
  }, [entityLogicalName, recordId]);

  return { record, isLoading, error };
}
