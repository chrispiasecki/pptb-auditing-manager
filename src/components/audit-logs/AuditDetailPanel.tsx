import React from 'react';
import { AuditDetail, AttributeAuditDetail } from '../../model/auditLog';

interface AuditDetailPanelProps {
  details: AuditDetail[] | undefined;
  isLoading: boolean;
  selectedAttributes: string[];
}

export const AuditDetailPanel: React.FC<AuditDetailPanelProps> = ({
  details,
  isLoading,
  selectedAttributes,
}) => {
  if (isLoading) {
    return (
      <div className="px-4 py-2 bg-background-2 border-t border-stroke-2">
        <div className="flex items-center justify-center py-4">
          <div className="spinner spinner-sm text-blue-600" />
          <span className="ml-2 text-sm text-foreground-3">Loading details...</span>
        </div>
      </div>
    );
  }

  if (!details || details.length === 0) {
    return (
      <div className="px-4 py-2 bg-background-2 border-t border-stroke-2">
        <div className="py-3 text-center text-foreground-3 text-sm">
          No attribute changes recorded
        </div>
      </div>
    );
  }

  // Filter to only attribute details
  const attributeDetails = details.filter(
    (d): d is AttributeAuditDetail => d.type === 'attribute'
  );

  if (attributeDetails.length === 0) {
    return (
      <div className="px-4 py-2 bg-background-2 border-t border-stroke-2">
        <div className="py-3 text-center text-foreground-3 text-sm">
          No attribute changes recorded
        </div>
      </div>
    );
  }

  // Check if an attribute should be highlighted
  const isHighlighted = (attributeName: string) => {
    return selectedAttributes.length > 0 && selectedAttributes.includes(attributeName);
  };

  // Format value for display
  const formatValue = (
    value: string | null,
    formattedValue?: string
  ): React.ReactNode => {
    const displayValue = formattedValue || value;

    if (displayValue === null || displayValue === undefined || displayValue === '') {
      return <span className="text-foreground-4 italic">(empty)</span>;
    }

    return displayValue;
  };

  return (
    <div className="px-4 py-2 bg-background-2 border-t border-stroke-2">
      <table className="table w-full bg-background-1 rounded">
        <thead className="table-header">
          <tr>
            <th className="px-3 py-2 font-semibold text-left">Attribute</th>
            <th className="px-3 py-2 font-semibold text-left">Old Value</th>
            <th className="px-3 py-2 font-semibold text-left">New Value</th>
          </tr>
        </thead>
        <tbody>
          {attributeDetails.map((detail, index) => (
            <tr
              key={`${detail.attributeName}-${index}`}
              className={`table-row ${isHighlighted(detail.attributeName) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <td className="px-3 py-2 font-semibold">
                {detail.attributeDisplayName}
              </td>
              <td className="px-3 py-2 text-red-600 dark:text-red-400 break-words max-w-[300px]">
                {formatValue(detail.oldValue, detail.oldFormattedValue)}
              </td>
              <td className="px-3 py-2 text-green-600 dark:text-green-400 break-words max-w-[300px]">
                {formatValue(detail.newValue, detail.newFormattedValue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
