import { useState, useCallback } from 'react';
import { useTableAudit } from '../../hooks/useTableAudit';
import { SearchInput, SelectionToolbar, LoadingState, EmptyState, ArrowSyncIcon } from '../common';
import { TableList } from './TableList';
import { AttributePanel } from './AttributePanel';
import { TableSettingsExportMenu } from './TableSettingsExportMenu';
import { getAttributesForTable } from '../../services/auditService';
import type { TableAuditInfo, TableFilterType } from '../../model/audit';

const FILTER_OPTIONS: { value: TableFilterType; label: string }[] = [
  { value: 'all', label: 'All Tables' },
  { value: 'auditEnabled', label: 'Audit Enabled' },
  { value: 'auditDisabled', label: 'Audit Disabled' },
  { value: 'custom', label: 'Custom Tables' },
  { value: 'system', label: 'System Tables' },
];

export const TableAuditManager: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<TableAuditInfo | null>(null);

  const {
    tables,
    filteredTables,
    isLoading,
    isUpdating,
    error,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkToggleAudit,
    refresh,
  } = useTableAudit();

  const handleTableSelect = useCallback((table: TableAuditInfo) => {
    setSelectedTable(prev =>
      prev?.metadataId === table.metadataId ? null : table
    );
  }, []);

  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilterType((e.target.value as TableFilterType) || 'all');
    },
    [setFilterType]
  );

  const handleEnableSelected = useCallback(() => {
    bulkToggleAudit(true);
  }, [bulkToggleAudit]);

  const handleDisableSelected = useCallback(() => {
    bulkToggleAudit(false);
  }, [bulkToggleAudit]);

  if (isLoading) {
    return <LoadingState message="Loading tables..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-12">
        <span className="text-xl font-semibold">Failed to load tables</span>
        <span className="text-red-600 dark:text-red-400 text-center">{error}</span>
        <button className="btn-secondary flex items-center gap-2" onClick={refresh}>
          <ArrowSyncIcon className="w-5 h-5" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter Bar */}
      <div className="flex items-center gap-4 p-3 border-b border-stroke-1 bg-background-1">
        <div className="flex items-center gap-4 flex-1">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search tables..."
          />
          <select
            className="select min-w-[180px]"
            value={filterType}
            onChange={handleFilterChange}
          >
            {FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <TableSettingsExportMenu
            tables={tables}
            getAttributesForTable={getAttributesForTable}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Selection Toolbar */}
      <SelectionToolbar
        selectedCount={selectedIds.size}
        totalCount={filteredTables.length}
        isUpdating={isUpdating}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onEnableSelected={handleEnableSelected}
        onDisableSelected={handleDisableSelected}
        entityName="tables"
        disableAuditButtons={true}
      />

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table List Pane */}
        <div className="flex-1 min-w-[300px] max-w-[50%] flex flex-col border-r border-stroke-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            {filteredTables.length === 0 ? (
              <EmptyState
                icon="search"
                title="No tables found"
                description="Try adjusting your search or filter criteria"
              />
            ) : (
              <TableList
                tables={filteredTables}
                selectedIds={selectedIds}
                activeTableId={selectedTable?.metadataId}
                onToggleSelection={toggleSelection}
                onTableClick={handleTableSelect}
              />
            )}
          </div>
        </div>

        {/* Attribute Pane */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AttributePanel selectedTable={selectedTable} />
        </div>
      </div>
    </div>
  );
};
