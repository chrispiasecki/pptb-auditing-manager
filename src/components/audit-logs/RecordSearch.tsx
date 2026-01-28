import React, { useCallback } from 'react';
import { RecordSearchResult } from '../../model/metadata';
import { SearchIcon, DismissIcon } from '../common/Icons';

interface RecordSearchProps {
  entityLogicalName: string | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isSearching: boolean;
  selectedRecord: RecordSearchResult | null;
  onClearSelection: () => void;
  disabled?: boolean;
}

export const RecordSearch: React.FC<RecordSearchProps> = ({
  entityLogicalName,
  searchTerm,
  onSearchChange,
  isSearching,
  selectedRecord,
  onClearSelection,
  disabled = false,
}) => {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  const isDisabled = disabled || !entityLogicalName;

  // Show selected record badge
  if (selectedRecord) {
    return (
      <div className="flex items-center gap-4 w-full">
        <span className="text-foreground-3 font-semibold">Record:</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background-3 rounded-md">
            <span className="badge badge-info text-xs">Selected</span>
            <span className="font-semibold">{selectedRecord.name}</span>
          </div>
          <button
            className="btn-icon btn-subtle"
            onClick={onClearSelection}
            title="Clear selection"
          >
            <DismissIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 w-full">
      <span className="text-foreground-3 font-semibold">Record:</span>
      <div className="flex-1 max-w-lg relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <SearchIcon className="w-5 h-5 text-foreground-4" />
        </div>
        <input
          type="text"
          className="input pl-10 pr-10"
          placeholder={
            entityLogicalName
              ? 'Search for a record...'
              : 'Select a table first'
          }
          value={searchTerm}
          onChange={handleInputChange}
          disabled={isDisabled}
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className="spinner spinner-sm text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
};
