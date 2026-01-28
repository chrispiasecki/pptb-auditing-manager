import React, { useCallback, useState, useRef, useEffect } from 'react';
import { ArrowDownloadIcon, DocumentTableIcon, CheckmarkCircleIcon } from '../common/Icons';
import { ExportFormat, AuditTabType } from '../../model/export';

// Maximum records when including details (due to additional API calls)
const MAX_RECORDS_WITH_DETAILS = 5000;

interface ExportMenuProps {
  onExport: (format: ExportFormat, includeDetails: boolean) => Promise<void>;
  isExporting: boolean;
  exportProgress?: string | null;
  disabled?: boolean;
  hasData: boolean;
  tabType?: AuditTabType;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  onExport,
  isExporting,
  exportProgress,
  disabled = false,
  hasData,
  tabType = 'details',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [includeDetails, setIncludeDetails] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // User Access tab doesn't have attribute details
  const showDetailsOption = tabType !== 'access';

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

  const handleExportCSV = useCallback(async () => {
    setIsOpen(false);
    await onExport('csv', showDetailsOption && includeDetails);
  }, [onExport, includeDetails, showDetailsOption]);

  const toggleIncludeDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIncludeDetails(prev => !prev);
  }, []);

  const isDisabled = disabled || !hasData || isExporting;

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-2">
        <button
          className="btn-primary flex items-center gap-2 min-w-[100px]"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isDisabled}
        >
          {isExporting ? (
            <div className="spinner spinner-sm" />
          ) : (
            <ArrowDownloadIcon className="w-5 h-5" />
          )}
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
        {isExporting && exportProgress && (
          <span className="text-foreground-2 text-sm whitespace-nowrap">
            {exportProgress}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="dropdown-menu right-0 w-72">
          <button
            className="dropdown-item w-full text-left"
            onClick={handleExportCSV}
            disabled={isDisabled}
          >
            <DocumentTableIcon className="w-5 h-5" />
            Export to CSV
          </button>

          {showDetailsOption && (
            <>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item w-full text-left"
                onClick={toggleIncludeDetails}
              >
                <span className="w-4">
                  {includeDetails && <CheckmarkCircleIcon className="w-4 h-4" />}
                </span>
                Include change details
              </button>
              {includeDetails && (
                <div className="px-3 py-2 text-xs text-foreground-3">
                  Limited to {MAX_RECORDS_WITH_DETAILS.toLocaleString()} records when including details
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
