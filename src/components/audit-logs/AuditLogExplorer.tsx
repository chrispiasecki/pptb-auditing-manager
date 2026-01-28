import React, { useCallback, useEffect, useMemo } from 'react';
import { useTableMetadata } from '../../hooks/useTableMetadata';
import { useRecordSearch } from '../../hooks/useRecordSearch';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { useExport } from '../../hooks/useExport';
import { RecordSearch } from './RecordSearch';
import { RecordSearchResults } from './RecordSearchResults';
import { AuditLogTable } from './AuditLogTable';
import { Pagination } from './Pagination';
import { ExportMenu } from './ExportMenu';
import { FilterDismissIcon, ArrowSyncIcon } from '../common/Icons';
import { ExportFormat } from '../../model/export';
import { AuditAction, AuditOperation } from '../../model/auditLog';
import {
  commonActionOptions,
  shareActionOptions,
  userAccessActionOptions,
  roleActionOptions,
  metadataActionOptions,
  relationshipActionOptions,
  auditChangeActionOptions,
} from '../../utils/constants';

// Tab types (also exported for App.tsx)
export type AuditTab = 'details' | 'shares' | 'access' | 'roles' | 'metadata' | 'relationships' | 'auditchanges';

// Actions for Record Shares tab
const SHARE_ACTIONS = [
  AuditAction.Share,       // 14 - GrantAccess
  AuditAction.ModifyShare, // 48 - ModifyAccess
  AuditAction.Unshare,     // 49 - RevokeAccess
];

// Actions for Security Role Changes tab
const ROLE_ACTIONS = [
  AuditAction.AddPrivilegesToRole,      // 57 - Privileges added to a security role
  AuditAction.RemovePrivilegesFromRole, // 58 - Privileges removed from a security role
  AuditAction.ReplacePrivilegesInRole,  // 59 - Privileges for a security role replaced
];

// Actions for User Access tab (also uses operation=4)
const USER_ACCESS_ACTIONS = [
  AuditAction.UserAccessViaWeb,         // 64
  AuditAction.UserAccessViaWebServices, // 65
  AuditAction.UserAccessAuditStarted,   // 112
  AuditAction.UserAccessAuditStopped,   // 113
];

// Actions for Metadata Changes tab
const METADATA_ACTIONS = [
  100, // Delete Entity
  101, // Delete Attribute
  102, // Audit Change at Entity Level
  103, // Audit Change at Attribute Level
  104, // Audit Change at Org Level
];

// Actions for N:N Relationships tab (Associate/Disassociate and Role assignments)
const RELATIONSHIP_ACTIONS = [
  AuditAction.AssociateEntities,    // 33
  AuditAction.DisassociateEntities, // 34
  AuditAction.AssignRoleToTeam,     // 53
  AuditAction.RemoveRoleFromTeam,   // 54
  AuditAction.AssignRoleToUser,     // 55
  AuditAction.RemoveRoleFromUser,   // 56
];

// Actions for Audit Changes tab (changes to audit settings)
const AUDIT_CHANGE_ACTIONS = [
  AuditAction.EntityAuditStarted,      // 105 - Table audit enabled
  AuditAction.AttributeAuditStarted,   // 106 - Column audit enabled
  AuditAction.AuditEnabled,            // 107 - Org audit enabled
  AuditAction.EntityAuditStopped,      // 108 - Table audit disabled
  AuditAction.AttributeAuditStopped,   // 109 - Column audit disabled
  AuditAction.AuditDisabled,           // 110 - Org audit disabled
  AuditAction.AuditLogDeletion,        // 111 - Audit log deleted
];

// Operations for non-access tabs (Create, Update, Delete - excludes Access)
const NON_ACCESS_OPERATIONS = [
  AuditOperation.Create,
  AuditOperation.Update,
  AuditOperation.Delete,
];

// Actions to exclude from main details tab (client-side filter)
const EXCLUDED_FROM_DETAILS = [
  ...SHARE_ACTIONS,
  ...ROLE_ACTIONS,
  ...USER_ACCESS_ACTIONS,
  ...METADATA_ACTIONS,
  ...RELATIONSHIP_ACTIONS,
  ...AUDIT_CHANGE_ACTIONS,
];

interface AuditLogExplorerProps {
  isConnected: boolean;
  selectedTab: AuditTab;
}

export const AuditLogExplorer: React.FC<AuditLogExplorerProps> = ({ isConnected, selectedTab }) => {
  const [showAuditableOnly, setShowAuditableOnly] = React.useState(true);
  const [componentError, setComponentError] = React.useState<string | null>(null);
  const [filtersReady, setFiltersReady] = React.useState(false);

  // Catch any unhandled errors from effects
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[AuditLogExplorer] Unhandled error:', event.error);
      setComponentError(event.message || 'An unexpected error occurred');
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Table metadata - only fetch when connected
  const { tables, isLoading: isLoadingTables, error: tableError } = useTableMetadata(isConnected);

  // Audit logs state - only fetch when connected AND filters are ready
  const {
    entries,
    detailsMap,
    isLoading: isLoadingLogs,
    isLoadingDetails,
    pagination,
    setPage,
    setPageSize,
    canNavigateToPage,
    sort,
    setSort,
    filters,
    setTables,
    setRecord,
    setOperations,
    setActions,
    setFromDate,
    setToDate,
    setUsers,
    clearFilters,
    loadDetails,
    refresh,
    error,
  } = useAuditLogs(isConnected && filtersReady);

  // Record search
  const {
    searchTerm,
    setSearchTerm,
    results: searchResults,
    isSearching,
    selectedRecord,
    selectRecord,
    clearSelection: clearRecordSelection,
  } = useRecordSearch(filters.tableLogicalNames.length === 1 ? filters.tableLogicalNames[0] : null);

  // Filter entries for main details tab (exclude certain action types)
  const filteredEntries = useMemo(() => {
    return selectedTab === 'details'
      ? entries.filter(e => !EXCLUDED_FROM_DETAILS.includes(e.action))
      : entries;
  }, [entries, selectedTab]);

  // Export functionality - uses filters to fetch ALL matching records
  const { isExporting, exportProgress, exportData } = useExport(filters, detailsMap, selectedTab);

  // Create a map of table logical names to display names
  const tableDisplayNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const table of tables) {
      map.set(table.logicalName, table.displayName);
    }
    return map;
  }, [tables]);

  // Get action options based on selected tab
  const currentActionOptions = useMemo(() => {
    switch (selectedTab) {
      case 'shares':
        return shareActionOptions;
      case 'access':
        return userAccessActionOptions;
      case 'roles':
        return roleActionOptions;
      case 'metadata':
        return metadataActionOptions;
      case 'relationships':
        return relationshipActionOptions;
      case 'auditchanges':
        return auditChangeActionOptions;
      case 'details':
      default:
        return commonActionOptions;
    }
  }, [selectedTab]);

  // Update filters when selectedTab changes
  useEffect(() => {
    switch (selectedTab) {
      case 'shares':
        setOperations([]);
        setActions(SHARE_ACTIONS);
        break;
      case 'access':
        setOperations([]);
        setActions(USER_ACCESS_ACTIONS);
        break;
      case 'roles':
        setOperations([]);
        setActions(ROLE_ACTIONS);
        break;
      case 'metadata':
        setOperations([]);
        setActions(METADATA_ACTIONS);
        break;
      case 'relationships':
        setOperations([]);
        setActions(RELATIONSHIP_ACTIONS);
        break;
      case 'auditchanges':
        setOperations([]);
        setActions(AUDIT_CHANGE_ACTIONS);
        break;
      case 'details':
      default:
        setOperations(NON_ACCESS_OPERATIONS);
        setActions([]);
        break;
    }
    setFiltersReady(true);
  }, [selectedTab, setOperations, setActions]);

  // Handle table selection
  const handleTableSelect = useCallback(
    (logicalNames: string[]) => {
      console.log('[AuditLogExplorer] Tables selected:', logicalNames);
      try {
        setTables(logicalNames);
        clearRecordSelection();
      } catch (err) {
        console.error('[AuditLogExplorer] Error in handleTableSelect:', err);
      }
    },
    [setTables, clearRecordSelection]
  );

  // Handle record selection
  const handleRecordSelect = useCallback(
    (record: any) => {
      selectRecord(record);
      setRecord(record.id, record.name);
    },
    [selectRecord, setRecord]
  );

  // Handle record clear
  const handleRecordClear = useCallback(() => {
    clearRecordSelection();
    setRecord(null, null);
  }, [clearRecordSelection, setRecord]);

  // Get default actions for the current tab
  const getDefaultActionsForTab = useCallback(() => {
    switch (selectedTab) {
      case 'shares':
        return SHARE_ACTIONS;
      case 'access':
        return USER_ACCESS_ACTIONS;
      case 'roles':
        return ROLE_ACTIONS;
      case 'metadata':
        return METADATA_ACTIONS;
      case 'relationships':
        return RELATIONSHIP_ACTIONS;
      case 'auditchanges':
        return AUDIT_CHANGE_ACTIONS;
      case 'details':
      default:
        return [];
    }
  }, [selectedTab]);

  // Get default operations for the current tab
  const getDefaultOperationsForTab = useCallback(() => {
    return selectedTab === 'details' ? NON_ACCESS_OPERATIONS : [];
  }, [selectedTab]);

  // Handle clear filters - reset to tab defaults instead of clearing everything
  const handleClearFilters = useCallback(() => {
    // Clear user-specified filters
    clearFilters();
    // Re-apply tab-specific defaults
    setOperations(getDefaultOperationsForTab());
    setActions(getDefaultActionsForTab());
  }, [clearFilters, setOperations, setActions, getDefaultOperationsForTab, getDefaultActionsForTab]);

  // Handle export
  const handleExport = useCallback(
    async (format: ExportFormat, includeDetails: boolean) => {
      const result = await exportData(format, includeDetails);
      if (result.success) {
        await window.toolboxAPI.utils.showNotification({
          title: 'Export Complete',
          body: `Audit logs exported to ${result.filename}`,
          type: 'success',
          duration: 3000,
        });
      } else {
        await window.toolboxAPI.utils.showNotification({
          title: 'Export Failed',
          body: result.error || 'An error occurred during export',
          type: 'error',
          duration: 5000,
        });
      }
    },
    [exportData]
  );

  // Show error notification
  useEffect(() => {
    const errorMessage = error || tableError;
    if (errorMessage) {
      window.toolboxAPI.utils.showNotification({
        title: 'Error',
        body: errorMessage,
        type: 'error',
        duration: 5000,
      });
    }
  }, [error, tableError]);

  // Helper to compare arrays (order-independent)
  const arraysEqual = useCallback((a: number[], b: number[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }, []);

  // Check if any user-specified filters are active (beyond tab defaults)
  const hasActiveFilters = useMemo(() => {
    const defaultOps = getDefaultOperationsForTab();
    const defaultActions = getDefaultActionsForTab();

    // User-specified filters (not tab defaults)
    const hasTableFilter = filters.tableLogicalNames.length > 0;
    const hasDateFilter = filters.fromDate !== null || filters.toDate !== null;
    const hasUserFilter = filters.selectedUsers.length > 0;

    // Check if operations differ from tab default
    const operationsChanged = !arraysEqual(filters.operations, defaultOps);

    // Check if actions differ from tab default
    const actionsChanged = !arraysEqual(filters.actions, defaultActions);

    return hasTableFilter || hasDateFilter || hasUserFilter || operationsChanged || actionsChanged;
  }, [
    filters.tableLogicalNames,
    filters.fromDate,
    filters.toDate,
    filters.selectedUsers,
    filters.operations,
    filters.actions,
    getDefaultOperationsForTab,
    getDefaultActionsForTab,
    arraysEqual,
  ]);

  // Column filters object for the table
  const columnFilters = useMemo(() => ({
    operations: filters.operations,
    actions: filters.actions,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    users: filters.selectedUsers,
    tables: filters.tableLogicalNames,
  }), [filters.operations, filters.actions, filters.fromDate, filters.toDate, filters.selectedUsers, filters.tableLogicalNames]);

  // Available tables for the filter (optionally filtered to auditable only)
  const availableTables = useMemo(() => {
    const filtered = showAuditableOnly ? tables.filter(t => t.isAuditEnabled) : tables;
    return filtered.map(t => ({
      logicalName: t.logicalName,
      displayName: t.displayName,
    }));
  }, [tables, showAuditableOnly]);

  if (componentError) {
    return (
      <div className="flex flex-col h-full overflow-hidden p-2 gap-2">
        <div className="flex items-center justify-center flex-1 text-foreground-3">
          <span className="text-base">Error: {componentError}</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col h-full overflow-hidden p-2 gap-2">
        <div className="flex items-center justify-center flex-1 text-foreground-3">
          <span className="text-base">
            Please connect to a Dataverse environment to view audit logs.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-2 gap-2">
      {/* Record Search - only show when single table is selected */}
      {filters.tableLogicalNames.length === 1 && (
        <div className="flex flex-col gap-1 flex-shrink-0">
          <div className="flex items-center gap-2 relative">
            <RecordSearch
              entityLogicalName={filters.tableLogicalNames[0]}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              isSearching={isSearching}
              selectedRecord={selectedRecord}
              onClearSelection={handleRecordClear}
              disabled={false}
            />
            <RecordSearchResults
              results={searchResults}
              isSearching={isSearching}
              searchTerm={searchTerm}
              onSelect={handleRecordSelect}
              visible={searchTerm.length >= 2 && !selectedRecord}
            />
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-end flex-shrink-0 mb-1">
          <div className="flex items-center gap-2">
            <button
              className="btn-subtle flex items-center gap-1 text-sm"
              onClick={refresh}
              disabled={isLoadingLogs}
              title="Refresh data"
            >
              <ArrowSyncIcon className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {hasActiveFilters && (
              <button
                className="btn-subtle flex items-center gap-1 text-sm"
                onClick={handleClearFilters}
              >
                <FilterDismissIcon className="w-4 h-4" />
                Clear Filters
              </button>
            )}
            <ExportMenu
              onExport={handleExport}
              isExporting={isExporting}
              exportProgress={exportProgress}
              disabled={false}
              hasData={filteredEntries.length > 0}
              tabType={selectedTab}
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-[100px]">
          <AuditLogTable
            entries={filteredEntries}
            detailsMap={detailsMap}
            isLoading={isLoadingLogs || isLoadingTables}
            isLoadingDetails={isLoadingDetails}
            loadDetails={loadDetails}
            tableSelected={filters.tableLogicalNames.length > 0}
            showTableColumn={selectedTab !== 'access'}
            tableDisplayNames={tableDisplayNames}
            selectedTab={selectedTab}
            sort={sort}
            onSort={setSort}
            columnFilters={columnFilters}
            onOperationsChange={setOperations}
            onActionsChange={setActions}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onUsersChange={setUsers}
            onTablesChange={handleTableSelect}
            actionOptions={currentActionOptions}
            availableTables={availableTables}
            showAuditableOnly={showAuditableOnly}
            onShowAuditableOnlyChange={setShowAuditableOnly}
          />
        </div>

        {/* Pagination */}
        {filteredEntries.length > 0 && (
          <div className="border-t border-stroke-1 pt-1 flex-shrink-0">
            <Pagination
              pagination={{
                ...pagination,
                totalCount: selectedTab === 'details' ? filteredEntries.length : pagination.totalCount,
              }}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              canNavigateToPage={canNavigateToPage}
              disabled={isLoadingLogs}
            />
          </div>
        )}
      </div>
    </div>
  );
};
