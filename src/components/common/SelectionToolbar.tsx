import React from 'react';
import {
  CheckmarkCircleIcon,
  DismissCircleIcon,
  SelectAllOnIcon,
  SelectAllOffIcon,
} from './Icons';

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  isUpdating: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onEnableSelected: () => void;
  onDisableSelected: () => void;
  entityName?: string;
  disableAuditButtons?: boolean;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedCount,
  totalCount,
  isUpdating,
  onSelectAll,
  onClearSelection,
  onEnableSelected,
  onDisableSelected,
  entityName = 'items',
  disableAuditButtons = false,
}) => {
  const auditButtonsDisabled = isUpdating || selectedCount === 0 || disableAuditButtons;

  return (
    <div className="toolbar">
      <div className="flex items-center gap-2 mr-4">
        <span className="font-semibold">
          {selectedCount} of {totalCount} {entityName} selected
        </span>
        {isUpdating && <div className="spinner spinner-sm text-blue-600" />}
      </div>

      <button
        className="btn-subtle flex items-center gap-1"
        onClick={onSelectAll}
        disabled={isUpdating}
      >
        <SelectAllOnIcon className="w-5 h-5" />
        Select All
      </button>

      <button
        className="btn-subtle flex items-center gap-1"
        onClick={onClearSelection}
        disabled={isUpdating || selectedCount === 0}
      >
        <SelectAllOffIcon className="w-5 h-5" />
        Clear
      </button>

      <div className="w-px h-6 bg-stroke-1 mx-2" />

      <div title={disableAuditButtons ? 'Feature coming soon' : undefined}>
        <button
          className="btn-primary flex items-center gap-1"
          onClick={onEnableSelected}
          disabled={auditButtonsDisabled}
        >
          <CheckmarkCircleIcon className="w-5 h-5" />
          Enable Audit
        </button>
      </div>

      <div title={disableAuditButtons ? 'Feature coming soon' : undefined}>
        <button
          className="btn-secondary flex items-center gap-1"
          onClick={onDisableSelected}
          disabled={auditButtonsDisabled}
        >
          <DismissCircleIcon className="w-5 h-5" />
          Disable Audit
        </button>
      </div>
    </div>
  );
};
