import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { EntityOption } from '../../model/metadata';
import { ChevronDownIcon } from '../common/Icons';

interface AuditTableSelectorProps {
  tables: EntityOption[];
  selectedTables: string[];
  onSelect: (logicalNames: string[]) => void;
  isLoading: boolean;
  showAuditableOnly: boolean;
  onAuditableOnlyChange: (checked: boolean) => void;
}

export const AuditTableSelector: React.FC<AuditTableSelectorProps> = ({
  tables,
  selectedTables,
  onSelect,
  isLoading,
  showAuditableOnly,
  onAuditableOnlyChange,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter tables based on auditable filter and search term
  const filteredTables = useMemo(() => {
    let filtered = tables;

    if (showAuditableOnly) {
      filtered = filtered.filter(t => t.isAuditEnabled);
    }

    if (searchValue) {
      const search = searchValue.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.displayName.toLowerCase().includes(search) ||
          t.logicalName.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [tables, showAuditableOnly, searchValue]);

  // Get display text for selected tables
  const selectedText = useMemo(() => {
    if (selectedTables.length === 0) return '';
    if (selectedTables.length === 1) {
      const table = tables.find(t => t.logicalName === selectedTables[0]);
      return table ? `${table.displayName} (${table.logicalName})` : selectedTables[0];
    }
    return `${selectedTables.length} tables selected`;
  }, [selectedTables, tables]);

  const handleToggle = useCallback((logicalName: string) => {
    if (selectedTables.includes(logicalName)) {
      onSelect(selectedTables.filter(t => t !== logicalName));
    } else {
      onSelect([...selectedTables, logicalName]);
    }
  }, [selectedTables, onSelect]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 w-full">
        <div className="spinner spinner-sm text-blue-600" />
        <span className="text-sm text-foreground-3">Loading tables...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="relative min-w-[350px] flex-1 max-w-[550px]" ref={containerRef}>
        <div className="relative">
          <input
            type="text"
            className="input pr-8"
            placeholder="Search and select tables..."
            value={searchValue || selectedText}
            onChange={handleInput}
            onFocus={() => {
              setSearchValue('');
              setIsOpen(true);
            }}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDownIcon className={`w-4 h-4 text-foreground-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[300px] overflow-auto shadow-lg card">
            {filteredTables.length === 0 ? (
              <div className="p-3 text-center text-foreground-3 text-sm">
                No tables found
              </div>
            ) : (
              <div className="p-1">
                {filteredTables.map(table => {
                  const isSelected = selectedTables.includes(table.logicalName);
                  return (
                    <div
                      key={table.logicalName}
                      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-background-2 ${isSelected ? 'bg-background-2' : ''}`}
                      onClick={() => handleToggle(table.logicalName)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-stroke-1"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>{table.displayName}</span>
                          {table.isAuditEnabled ? (
                            <span className="text-xs text-green-600">(audited)</span>
                          ) : (
                            <span className="text-xs text-foreground-4">(not audited)</span>
                          )}
                        </div>
                        <span className="text-xs text-foreground-4">{table.logicalName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 whitespace-nowrap cursor-pointer">
        <input
          type="checkbox"
          checked={showAuditableOnly}
          onChange={(e) => onAuditableOnlyChange(e.target.checked)}
          className="w-4 h-4 rounded border-stroke-1"
        />
        <span className="text-sm">Show only auditable tables</span>
      </label>
    </div>
  );
};
