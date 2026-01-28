import React, { useCallback } from 'react';
import { useAttributeAudit } from '../../hooks/useAttributeAudit';
import { SearchInput, SelectionToolbar, LoadingState, EmptyState, TableSimpleIcon } from '../common';
import { AttributeList } from './AttributeList';
import type { TableAuditInfo } from '../../model/audit';

interface AttributePanelProps {
  selectedTable: TableAuditInfo | null;
}

export const AttributePanel: React.FC<AttributePanelProps> = ({ selectedTable }) => {
  const {
    filteredAttributes,
    isLoading,
    isUpdating,
    searchTerm,
    setSearchTerm,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkToggleAudit,
  } = useAttributeAudit(selectedTable?.logicalName ?? null);

  const handleEnableSelected = useCallback(() => {
    bulkToggleAudit(true);
  }, [bulkToggleAudit]);

  const handleDisableSelected = useCallback(() => {
    bulkToggleAudit(false);
  }, [bulkToggleAudit]);

  // No table selected
  if (!selectedTable) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="flex flex-col items-center gap-4 text-foreground-3">
          <TableSimpleIcon className="w-12 h-12 text-foreground-4" />
          <span className="text-lg font-semibold">Select a table</span>
          <span className="text-center">
            Click on a table to view and manage its attribute auditing settings
          </span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading attributes..." />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-stroke-1 bg-background-2">
        <TableSimpleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <span className="flex-1 min-w-0 font-semibold text-base text-truncate">
          {selectedTable.displayName}
        </span>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-stroke-1">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search attributes..."
        />
      </div>

      {/* Selection Toolbar */}
      <SelectionToolbar
        selectedCount={selectedIds.size}
        totalCount={filteredAttributes.length}
        isUpdating={isUpdating}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onEnableSelected={handleEnableSelected}
        onDisableSelected={handleDisableSelected}
        entityName="attributes"
        disableAuditButtons={true}
      />

      {/* Attribute List */}
      <div className="flex-1 overflow-auto">
        {filteredAttributes.length === 0 ? (
          <EmptyState
            icon="search"
            title="No attributes found"
            description="Try adjusting your search criteria"
          />
        ) : (
          <AttributeList
            attributes={filteredAttributes}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
          />
        )}
      </div>
    </div>
  );
};
