import React from 'react';
import { RecordSearchResult } from '../../model/metadata';

interface RecordSearchResultsProps {
  results: RecordSearchResult[];
  isSearching: boolean;
  searchTerm: string;
  onSelect: (record: RecordSearchResult) => void;
  visible: boolean;
}

export const RecordSearchResults: React.FC<RecordSearchResultsProps> = ({
  results,
  isSearching,
  searchTerm,
  onSelect,
  visible,
}) => {
  if (!visible) {
    return null;
  }

  // Don't show until user has typed at least 2 characters
  if (searchTerm.length < 2 && !isSearching) {
    return null;
  }

  if (isSearching) {
    return (
      <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[300px] overflow-auto shadow-lg card">
        <div className="p-4 text-center text-foreground-3">
          Searching...
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[300px] overflow-auto shadow-lg card">
        <div className="p-4 text-center text-foreground-3">
          No records found
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[300px] overflow-auto shadow-lg card">
      <div className="p-1 flex flex-col gap-0.5">
        {results.map(record => (
          <div
            key={record.id}
            className="px-4 py-2 cursor-pointer rounded-md hover:bg-background-2 flex flex-col gap-0.5"
            onClick={() => onSelect(record)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelect(record);
              }
            }}
          >
            <span className="font-semibold">{record.name}</span>
            <span className="text-xs text-foreground-3 font-mono">{record.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
