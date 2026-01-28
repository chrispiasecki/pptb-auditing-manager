import React, { useState, useCallback, useMemo } from 'react';
import { AuditLogEntry, AuditDetail, SortState, SortColumn } from '../../model/auditLog';
import { AuditLogRow } from './AuditLogRow';
import { AuditDetailsDialog } from './AuditDetailsDialog';
import { RecordHistoryDialog } from './RecordHistoryDialog';
import { operationOptions } from '../../utils/constants';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  FilterIcon,
  FilterFilledIcon,
  DismissIcon,
} from '../common/Icons';

interface TableOption {
  logicalName: string;
  displayName: string;
}

interface ColumnFilter {
  operations: number[];
  actions: number[];
  fromDate: Date | null;
  toDate: Date | null;
  users: Array<{ id: string; name: string }>;
  tables: string[];
}

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  detailsMap: Map<string, AuditDetail[]>;
  isLoading: boolean;
  isLoadingDetails: boolean;
  loadDetails: (entryId: string, entityLogicalName?: string) => void;
  tableSelected: boolean;
  showTableColumn?: boolean;
  tableDisplayNames?: Map<string, string>;
  selectedTab?: string;
  sort: SortState;
  onSort: (column: SortColumn) => void;
  columnFilters: ColumnFilter;
  onOperationsChange: (operations: number[]) => void;
  onActionsChange: (actions: number[]) => void;
  onFromDateChange: (date: Date | null) => void;
  onToDateChange: (date: Date | null) => void;
  onUsersChange: (users: Array<{ id: string; name: string }>) => void;
  onTablesChange: (tables: string[]) => void;
  actionOptions: Array<{ value: number; label: string }>;
  availableTables: TableOption[];
  showAuditableOnly: boolean;
  onShowAuditableOnlyChange: (value: boolean) => void;
}

// Column Header with Sort and Filter
interface ColumnHeaderProps {
  label: string;
  sortColumn?: SortColumn;
  currentSort: SortState;
  onSort?: (column: SortColumn) => void;
  filterContent?: React.ReactNode;
  hasActiveFilter?: boolean;
  className?: string;
}

const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  label,
  sortColumn,
  currentSort,
  onSort,
  filterContent,
  hasActiveFilter,
  className,
}) => {
  const [filterOpen, setFilterOpen] = useState(false);

  const isSorted = sortColumn && currentSort.column === sortColumn;
  const sortIcon = isSorted
    ? currentSort.direction === 'asc'
      ? <ArrowUpIcon className="w-4 h-4" />
      : <ArrowDownIcon className="w-4 h-4" />
    : null;

  const handleSortClick = useCallback(() => {
    if (sortColumn && onSort) {
      onSort(sortColumn);
    }
  }, [sortColumn, onSort]);

  return (
    <th className={`table-header th px-3 py-2 ${className || ''}`}>
      <div className="flex items-center gap-1">
        <span className="flex-1">{label}</span>
        <div className="flex items-center gap-0.5">
          {sortColumn && onSort && (
            <button
              className="p-0.5 rounded hover:bg-background-3"
              onClick={handleSortClick}
              title={`Sort by ${label}`}
            >
              {sortIcon || <ArrowDownIcon className="w-4 h-4 opacity-30" />}
            </button>
          )}
          {filterContent && (
            <div className="relative">
              <button
                className={`p-0.5 rounded hover:bg-background-3 ${hasActiveFilter ? 'text-blue-600' : ''}`}
                onClick={() => setFilterOpen(!filterOpen)}
                title={`Filter by ${label}`}
              >
                {hasActiveFilter ? <FilterFilledIcon className="w-4 h-4" /> : <FilterIcon className="w-4 h-4" />}
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                  <div className="popover top-full right-0 z-50 mt-1 min-w-[200px] max-w-[300px] max-h-[400px] overflow-y-auto">
                    {filterContent}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </th>
  );
};

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  entries,
  detailsMap,
  isLoading,
  isLoadingDetails,
  loadDetails,
  tableSelected,
  showTableColumn = false,
  tableDisplayNames = new Map(),
  selectedTab = 'details',
  sort,
  onSort,
  columnFilters,
  onOperationsChange,
  onActionsChange,
  onFromDateChange,
  onToDateChange,
  onUsersChange,
  onTablesChange,
  actionOptions,
  availableTables,
  showAuditableOnly,
  onShowAuditableOnlyChange,
}) => {
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: string; name: string }>>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [tableSearchTerm, setTableSearchTerm] = useState('');

  // Dialog state
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Record history dialog state
  const [historyEntry, setHistoryEntry] = useState<AuditLogEntry | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // Handle viewing details
  const handleViewDetails = useCallback((entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setIsDialogOpen(true);
    loadDetails(entry.id, entry.objectTypeCode);
  }, [loadDetails]);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedEntry(null);
  }, []);

  // Handle viewing record history
  const handleViewRecordHistory = useCallback((entry: AuditLogEntry) => {
    console.log('[AuditLogTable] View record history for:', entry.objectTypeCode, entry.objectId);
    if (entry.objectTypeCode && entry.objectId) {
      setHistoryEntry(entry);
      setIsHistoryDialogOpen(true);
    }
  }, []);

  const handleCloseHistoryDialog = useCallback(() => {
    setIsHistoryDialogOpen(false);
    setHistoryEntry(null);
  }, []);

  // Filter tables by search term
  const filteredTables = useMemo(() => {
    if (!tableSearchTerm) return availableTables.slice(0, 50);
    const term = tableSearchTerm.toLowerCase();
    return availableTables
      .filter(t => t.displayName.toLowerCase().includes(term) || t.logicalName.toLowerCase().includes(term))
      .slice(0, 50);
  }, [availableTables, tableSearchTerm]);

  // User search handler
  const searchUsers = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const response = await window.dataverseAPI.queryData(
        `systemusers?$select=systemuserid,fullname&$filter=contains(fullname,'${searchTerm}')&$top=10`
      );
      const users = (response as any).value || response || [];
      const mappedUsers = Array.isArray(users)
        ? users.map((u: any) => ({ id: u.systemuserid, name: u.fullname || 'Unknown' }))
        : [];
      setUserSearchResults(mappedUsers.filter(
        (u: { id: string }) => !columnFilters.users.some(su => su.id === u.id)
      ));
    } catch (err) {
      console.error('Error searching users:', err);
      setUserSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  }, [columnFilters.users]);

  const handleUserSelect = useCallback((userId: string) => {
    const user = userSearchResults.find(u => u.id === userId);
    if (user) {
      onUsersChange([...columnFilters.users, user]);
      setUserSearchTerm('');
      setUserSearchResults([]);
    }
  }, [userSearchResults, columnFilters.users, onUsersChange]);

  // Filter content renderers
  const dateFilterContent = (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">From</label>
      <input
        type="date"
        className="input"
        value={columnFilters.fromDate ? columnFilters.fromDate.toISOString().split('T')[0] : ''}
        onChange={(e) => onFromDateChange(e.target.value ? new Date(e.target.value) : null)}
      />
      <label className="text-sm font-medium">To</label>
      <input
        type="date"
        className="input"
        value={columnFilters.toDate ? columnFilters.toDate.toISOString().split('T')[0] : ''}
        onChange={(e) => onToDateChange(e.target.value ? new Date(e.target.value) : null)}
      />
      {(columnFilters.fromDate || columnFilters.toDate) && (
        <button
          className="btn-subtle text-sm self-end"
          onClick={() => {
            onFromDateChange(null);
            onToDateChange(null);
          }}
        >
          Clear
        </button>
      )}
    </div>
  );

  const operationFilterContent = (
    <div className="flex flex-col gap-1">
      {operationOptions.map(op => (
        <label key={op.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox"
            checked={columnFilters.operations.includes(op.value)}
            onChange={(e) => {
              if (e.target.checked) {
                onOperationsChange([...columnFilters.operations, op.value]);
              } else {
                onOperationsChange(columnFilters.operations.filter(o => o !== op.value));
              }
            }}
          />
          {op.label}
        </label>
      ))}
      {columnFilters.operations.length > 0 && (
        <button className="btn-subtle text-sm self-end mt-2" onClick={() => onOperationsChange([])}>
          Clear
        </button>
      )}
    </div>
  );

  const actionFilterContent = (
    <div className="flex flex-col gap-1">
      {actionOptions.map(action => (
        <label key={action.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox"
            checked={columnFilters.actions.includes(action.value)}
            onChange={(e) => {
              if (e.target.checked) {
                onActionsChange([...columnFilters.actions, action.value]);
              } else {
                onActionsChange(columnFilters.actions.filter(a => a !== action.value));
              }
            }}
          />
          {action.label}
        </label>
      ))}
      {columnFilters.actions.length > 0 && (
        <button className="btn-subtle text-sm self-end mt-2" onClick={() => onActionsChange([])}>
          Clear
        </button>
      )}
    </div>
  );

  const tableFilterContent = (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="checkbox"
          checked={showAuditableOnly}
          onChange={(e) => onShowAuditableOnlyChange(e.target.checked)}
        />
        Show auditable tables only
      </label>
      <input
        placeholder="Search tables..."
        className="input"
        value={tableSearchTerm}
        onChange={(e) => setTableSearchTerm(e.target.value)}
      />
      <div className="max-h-[200px] overflow-auto flex flex-col gap-1">
        {filteredTables.map(table => (
          <label key={table.logicalName} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox"
              checked={columnFilters.tables.includes(table.logicalName)}
              onChange={(e) => {
                if (e.target.checked) {
                  onTablesChange([...columnFilters.tables, table.logicalName]);
                } else {
                  onTablesChange(columnFilters.tables.filter(t => t !== table.logicalName));
                }
              }}
            />
            {table.displayName}
          </label>
        ))}
      </div>
      {columnFilters.tables.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {columnFilters.tables.map(logicalName => (
            <span key={logicalName} className="tag tag-dismissible">
              {tableDisplayNames.get(logicalName) || logicalName}
              <button
                className="tag-dismiss-btn"
                onClick={() => onTablesChange(columnFilters.tables.filter(t => t !== logicalName))}
              >
                <DismissIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {columnFilters.tables.length > 0 && (
        <button className="btn-subtle text-sm self-end mt-2" onClick={() => onTablesChange([])}>
          Clear
        </button>
      )}
    </div>
  );

  const userFilterContent = (
    <div className="flex flex-col gap-2">
      <input
        placeholder="Search users..."
        className="input"
        value={userSearchTerm}
        onChange={(e) => {
          setUserSearchTerm(e.target.value);
          searchUsers(e.target.value);
        }}
      />
      {isSearchingUsers && (
        <div className="text-sm text-foreground-3">Searching...</div>
      )}
      {!isSearchingUsers && userSearchResults.length > 0 && (
        <div className="flex flex-col gap-1 max-h-[150px] overflow-auto">
          {userSearchResults.map(user => (
            <button
              key={user.id}
              className="text-left px-2 py-1 rounded hover:bg-background-2"
              onClick={() => handleUserSelect(user.id)}
            >
              {user.name}
            </button>
          ))}
        </div>
      )}
      {columnFilters.users.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {columnFilters.users.map(user => (
            <span key={user.id} className="tag tag-dismissible">
              {user.name}
              <button
                className="tag-dismiss-btn"
                onClick={() => onUsersChange(columnFilters.users.filter(u => u.id !== user.id))}
              >
                <DismissIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {columnFilters.users.length > 0 && (
        <button className="btn-subtle text-sm self-end mt-2" onClick={() => onUsersChange([])}>
          Clear
        </button>
      )}
    </div>
  );

  const hasDateFilter = columnFilters.fromDate !== null || columnFilters.toDate !== null;
  const hasOperationFilter = columnFilters.operations.length > 0;
  const hasActionFilter = columnFilters.actions.length > 0;
  const hasUserFilter = columnFilters.users.length > 0;
  const hasTableFilter = columnFilters.tables.length > 0;

  // Calculate column count for empty/loading row
  // Base: Date/Time, Operation, Action = 3
  // + buttons column (not for access tab)
  // + table column (if shown AND not roles tab)
  // + Record/Object column (not for metadata tab)
  // + Changed By column (not for access tab)
  const isUserAccessTab = selectedTab === 'access';
  const isRoleChangesTab = selectedTab === 'roles';
  const isMetadataTab = selectedTab === 'metadata';
  const showTableColumnEffective = showTableColumn && !isRoleChangesTab;
  const showObjectColumn = !isMetadataTab;
  const columnCount = 3 + (isUserAccessTab ? 0 : 1) + (showTableColumnEffective ? 1 : 0) + (showObjectColumn ? 1 : 0) + (isUserAccessTab ? 0 : 1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto border border-stroke-1 rounded-sm min-h-[100px]">
        <table className="table w-full">
          <thead className="table-header sticky top-0 bg-background-3 z-10">
            <tr>
              {/* Hide buttons column header for User Access tab */}
              {!isUserAccessTab && (
                <th className="w-[52px] min-w-[52px] max-w-[52px] p-0" />
              )}
              <ColumnHeader
                label="Date/Time"
                sortColumn="createdOn"
                currentSort={sort}
                onSort={onSort}
                filterContent={dateFilterContent}
                hasActiveFilter={hasDateFilter}
                className="w-[140px]"
              />
              <ColumnHeader
                label="Operation"
                sortColumn="operation"
                currentSort={sort}
                onSort={onSort}
                filterContent={selectedTab === 'details' ? operationFilterContent : undefined}
                hasActiveFilter={hasOperationFilter}
                className="w-[90px]"
              />
              <ColumnHeader
                label="Action"
                sortColumn="action"
                currentSort={sort}
                onSort={onSort}
                filterContent={actionFilterContent}
                hasActiveFilter={hasActionFilter}
                className={isUserAccessTab ? "w-[180px]" : isRoleChangesTab ? "w-[200px]" : "w-[100px]"}
              />
              {/* Hide Table column for Role Changes tab (always Security Role) */}
              {showTableColumn && selectedTab !== 'roles' && (
                <ColumnHeader
                  label="Table"
                  filterContent={tableFilterContent}
                  hasActiveFilter={hasTableFilter}
                  currentSort={sort}
                  className="w-[120px]"
                />
              )}
              {/* Hide Object column for Metadata tab */}
              {showObjectColumn && (
                <ColumnHeader
                  label={
                    selectedTab === 'access' ? 'User'
                    : selectedTab === 'roles' ? 'Security Role'
                    : 'Record'
                  }
                  sortColumn="objectName"
                  currentSort={sort}
                  onSort={onSort}
                />
              )}
              {selectedTab !== 'access' && (
                <ColumnHeader
                  label="Changed By"
                  sortColumn="userName"
                  currentSort={sort}
                  onSort={onSort}
                  filterContent={userFilterContent}
                  hasActiveFilter={hasUserFilter}
                  className="w-[150px]"
                />
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columnCount} className="text-center py-10">
                  <div className="flex flex-col items-center gap-4">
                    <div className="spinner spinner-md text-blue-600" />
                    <span className="text-foreground-3">Loading audit logs...</span>
                  </div>
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="text-center py-10 text-foreground-3">
                  {tableSelected
                    ? 'No audit logs found for the selected criteria'
                    : 'No audit logs found'}
                </td>
              </tr>
            ) : (
              entries.map(entry => (
                <AuditLogRow
                  key={entry.id}
                  entry={entry}
                  onViewDetails={handleViewDetails}
                  onViewRecordHistory={handleViewRecordHistory}
                  showTableColumn={showTableColumn}
                  tableDisplayNames={tableDisplayNames}
                  selectedTab={selectedTab}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Dialog */}
      <AuditDetailsDialog
        entry={selectedEntry}
        details={selectedEntry ? detailsMap.get(selectedEntry.id) : undefined}
        isLoading={isLoadingDetails}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        tableDisplayName={selectedEntry ? tableDisplayNames.get(selectedEntry.objectTypeCode) : undefined}
        selectedTab={selectedTab}
      />

      {/* Record History Dialog */}
      <RecordHistoryDialog
        entry={historyEntry}
        isOpen={isHistoryDialogOpen}
        onClose={handleCloseHistoryDialog}
        tableDisplayName={historyEntry ? tableDisplayNames.get(historyEntry.objectTypeCode) : undefined}
      />
    </div>
  );
};
