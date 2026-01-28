import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AttributeOption } from '../../model/metadata';
import { DismissIcon, ChevronDownIcon } from '../common/Icons';

interface AttributeFilterProps {
  attributes: AttributeOption[];
  selectedAttributes: string[];
  onSelectionChange: (attributes: string[]) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const AttributeFilter: React.FC<AttributeFilterProps> = ({
  attributes,
  selectedAttributes,
  onSelectionChange,
  isLoading,
  disabled = false,
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

  // Filter attributes based on search
  const filteredAttributes = useMemo(() => {
    if (!searchValue) return attributes;

    const search = searchValue.toLowerCase();
    return attributes.filter(
      a =>
        a.displayName.toLowerCase().includes(search) ||
        a.logicalName.toLowerCase().includes(search)
    );
  }, [attributes, searchValue]);

  // Get display names for selected attributes
  const selectedDisplay = useMemo(() => {
    return selectedAttributes.map(logicalName => {
      const attr = attributes.find(a => a.logicalName === logicalName);
      return {
        logicalName,
        displayName: attr?.displayName || logicalName,
      };
    });
  }, [selectedAttributes, attributes]);

  const handleToggle = useCallback((logicalName: string) => {
    if (selectedAttributes.includes(logicalName)) {
      onSelectionChange(selectedAttributes.filter(a => a !== logicalName));
    } else {
      onSelectionChange([...selectedAttributes, logicalName]);
    }
  }, [selectedAttributes, onSelectionChange]);

  const handleRemove = useCallback(
    (logicalName: string) => {
      onSelectionChange(selectedAttributes.filter(a => a !== logicalName));
    },
    [selectedAttributes, onSelectionChange]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-start gap-4 w-full flex-wrap">
        <span className="text-foreground-3 font-semibold whitespace-nowrap">Attributes:</span>
        <div className="flex items-center gap-2">
          <div className="spinner spinner-sm text-blue-600" />
          <span className="text-sm text-foreground-3">Loading attributes...</span>
        </div>
      </div>
    );
  }

  const isDisabled = disabled || attributes.length === 0;

  return (
    <div className="flex items-start gap-4 w-full flex-wrap">
      <span className="text-foreground-3 font-semibold whitespace-nowrap">Attributes:</span>

      <div className="relative min-w-[300px] flex-1 max-w-[500px]" ref={containerRef}>
        <div className="relative">
          <input
            type="text"
            className="input pr-8"
            placeholder={isDisabled ? 'Select a table first' : 'Filter by attributes...'}
            value={searchValue}
            onChange={handleInput}
            onFocus={() => setIsOpen(true)}
            disabled={isDisabled}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-2"
            onClick={() => setIsOpen(!isOpen)}
            disabled={isDisabled}
          >
            <ChevronDownIcon className={`w-4 h-4 text-foreground-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isOpen && !isDisabled && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[300px] overflow-auto shadow-lg card">
            {filteredAttributes.length === 0 ? (
              <div className="p-3 text-center text-foreground-3 text-sm">
                No attributes found
              </div>
            ) : (
              <div className="p-1">
                {filteredAttributes.map(attr => {
                  const isSelected = selectedAttributes.includes(attr.logicalName);
                  return (
                    <div
                      key={attr.logicalName}
                      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-background-2 ${isSelected ? 'bg-background-2' : ''}`}
                      onClick={() => handleToggle(attr.logicalName)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-stroke-1"
                      />
                      <div className="flex items-center gap-2">
                        <span>{attr.displayName}</span>
                        {attr.isAuditEnabled && (
                          <span className="text-xs text-green-600">(audited)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedDisplay.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {selectedDisplay.map(attr => (
            <span
              key={attr.logicalName}
              className="badge badge-info flex items-center gap-1"
            >
              {attr.displayName}
              <button
                className="p-0.5 hover:bg-blue-600/20 rounded"
                onClick={() => handleRemove(attr.logicalName)}
              >
                <DismissIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
