import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowDownloadIcon, TableSimpleIcon, CheckmarkCircleIcon } from '../common/Icons';
import { exportTableSettings, TableExportScope } from '../../services/exportService';
import { TableAuditInfo, AttributeAuditInfo } from '../../model/audit';

// Table icon for the menu
const TableIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
);

interface TableSettingsExportMenuProps {
  tables: TableAuditInfo[];
  getAttributesForTable: (logicalName: string) => Promise<AttributeAuditInfo[]>;
  disabled?: boolean;
}

export const TableSettingsExportMenu: React.FC<TableSettingsExportMenuProps> = ({
  tables,
  getAttributesForTable,
  disabled = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [auditEnabledOnly, setAuditEnabledOnly] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleExport = useCallback(async (scope: TableExportScope) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      // Build attributes map if needed
      let attributesMap = new Map<string, AttributeAuditInfo[]>();

      if (scope === 'tables-with-attributes') {
        // Show loading notification
        await window.toolboxAPI.utils.showNotification({
          title: 'Exporting',
          body: 'Fetching attribute data for all tables...',
          type: 'info',
          duration: 2000,
        });

        // Fetch attributes for each table (filter by audit enabled if needed)
        const tablesToProcess = auditEnabledOnly
          ? tables.filter(t => t.isAuditEnabled)
          : tables;

        for (const table of tablesToProcess) {
          try {
            const attributes = await getAttributesForTable(table.logicalName);
            attributesMap.set(table.logicalName, attributes);
          } catch (err) {
            console.error(`Failed to get attributes for ${table.logicalName}:`, err);
            // Continue with other tables
          }
        }
      }

      const result = await exportTableSettings(tables, attributesMap, {
        format: 'csv',
        scope,
        auditEnabledOnly,
      });

      if (result.success) {
        await window.toolboxAPI.utils.showNotification({
          title: 'Export Complete',
          body: `Saved to ${result.filename}`,
          type: 'success',
          duration: 3000,
        });
      } else if (result.error !== 'Export cancelled') {
        await window.toolboxAPI.utils.showNotification({
          title: 'Export Failed',
          body: result.error || 'Unknown error',
          type: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      await window.toolboxAPI.utils.showNotification({
        title: 'Export Failed',
        body: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsExporting(false);
    }
  }, [tables, getAttributesForTable, auditEnabledOnly]);

  const toggleAuditEnabledOnly = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAuditEnabledOnly(prev => !prev);
  }, []);

  const isDisabled = disabled || isExporting || tables.length === 0;

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="btn-subtle flex items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
      >
        {isExporting ? (
          <div className="spinner spinner-sm" />
        ) : (
          <ArrowDownloadIcon className="w-5 h-5" />
        )}
        Export
      </button>

      {isOpen && (
        <div className="dropdown-menu right-0 w-56">
          {/* Options */}
          <div className="px-3 py-1.5 text-xs font-semibold text-foreground-3 uppercase">
            Options
          </div>
          <button
            className="dropdown-item w-full text-left"
            onClick={toggleAuditEnabledOnly}
          >
            <span className="w-4">
              {auditEnabledOnly && <CheckmarkCircleIcon className="w-4 h-4" />}
            </span>
            Audit enabled only
          </button>

          <div className="dropdown-divider" />

          {/* Export Options */}
          <div className="px-3 py-1.5 text-xs font-semibold text-foreground-3 uppercase">
            Export to CSV
          </div>
          <button
            className="dropdown-item w-full text-left"
            onClick={() => handleExport('tables-only')}
          >
            <TableSimpleIcon className="w-5 h-5" />
            Tables Only
          </button>
          <button
            className="dropdown-item w-full text-left"
            onClick={() => handleExport('tables-with-attributes')}
          >
            <TableIcon className="w-5 h-5" />
            Tables with Attributes
          </button>
        </div>
      )}
    </div>
  );
};
