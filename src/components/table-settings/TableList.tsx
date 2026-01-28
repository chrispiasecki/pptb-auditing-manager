import React, { useCallback } from 'react';
import { StatusBadge } from '../common';
import type { TableAuditInfo } from '../../model/audit';

interface TableListProps {
  tables: TableAuditInfo[];
  selectedIds: Set<string>;
  activeTableId?: string;
  onToggleSelection: (id: string) => void;
  onTableClick: (table: TableAuditInfo) => void;
}

export const TableList: React.FC<TableListProps> = ({
  tables,
  selectedIds,
  activeTableId,
  onToggleSelection,
  onTableClick,
}) => {
  const handleCheckboxChange = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onToggleSelection(id);
    },
    [onToggleSelection]
  );

  return (
    <div className="flex flex-col">
      {tables.map(table => {
        const isSelected = selectedIds.has(table.metadataId);
        const isActive = activeTableId === table.metadataId;

        let rowClasses = 'flex items-center gap-2 px-4 py-2 border-b border-stroke-2 cursor-pointer transition-colors';
        if (isActive) {
          rowClasses += ' bg-background-3';
        } else if (isSelected) {
          rowClasses += ' bg-blue-50 dark:bg-blue-900/20';
        } else {
          rowClasses += ' hover:bg-background-2';
        }

        return (
          <div
            key={table.metadataId}
            className={rowClasses}
            onClick={() => onTableClick(table)}
          >
            <input
              type="checkbox"
              className="checkbox flex-shrink-0"
              checked={isSelected}
              disabled={!table.canModifyAuditSettings}
              onClick={(e) => handleCheckboxChange(e, table.metadataId)}
              onChange={() => {}}
            />

            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="font-semibold text-truncate">
                {table.displayName}
              </span>
              <span className="text-xs text-foreground-3 text-truncate">
                {table.logicalName}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {table.isCustomEntity && (
                <span className="badge badge-outline text-2xs">
                  Custom
                </span>
              )}
              <StatusBadge
                isEnabled={table.isAuditEnabled}
                canModify={table.canModifyAuditSettings}
                size="small"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
