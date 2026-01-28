import React, { useCallback } from 'react';
import { StatusBadge } from '../common';
import type { AttributeAuditInfo } from '../../model/audit';

interface AttributeListProps {
  attributes: AttributeAuditInfo[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
}

// Format attribute type for display
function formatAttributeType(type: string): string {
  // Remove "Type" suffix and add spaces before capitals
  return type
    .replace(/Type$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

export const AttributeList: React.FC<AttributeListProps> = ({
  attributes,
  selectedIds,
  onToggleSelection,
}) => {
  const handleRowClick = useCallback(
    (id: string, canModify: boolean) => {
      if (canModify) {
        onToggleSelection(id);
      }
    },
    [onToggleSelection]
  );

  return (
    <div className="flex flex-col">
      {attributes.map(attr => {
        const isSelected = selectedIds.has(attr.metadataId);

        let rowClasses = 'flex items-center gap-2 px-4 py-2 border-b border-stroke-2 cursor-pointer transition-colors';
        if (isSelected) {
          rowClasses += ' bg-blue-50 dark:bg-blue-900/20';
        } else {
          rowClasses += ' hover:bg-background-2';
        }

        return (
          <div
            key={attr.metadataId}
            className={rowClasses}
            onClick={() => handleRowClick(attr.metadataId, attr.canModifyAuditSettings)}
          >
            <input
              type="checkbox"
              className="checkbox flex-shrink-0"
              checked={isSelected}
              disabled={!attr.canModifyAuditSettings}
              onChange={() => {}}
            />

            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="font-semibold text-truncate">
                {attr.displayName}
              </span>
              <span className="text-xs text-foreground-3 text-truncate">
                {attr.logicalName}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="badge badge-outline text-2xs">
                {formatAttributeType(attr.attributeType)}
              </span>
              <StatusBadge
                isEnabled={attr.isAuditEnabled}
                canModify={attr.canModifyAuditSettings}
                size="small"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
