import React from 'react';
import { SearchIcon, DatabaseIcon } from './Icons';

interface EmptyStateProps {
  icon?: 'search' | 'database';
  title: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'database',
  title,
  description,
}) => {
  const IconComponent = icon === 'search' ? SearchIcon : DatabaseIcon;

  return (
    <div className="flex flex-col items-center justify-center p-12 gap-4 text-foreground-3">
      <IconComponent className="w-12 h-12 text-foreground-4" />
      <span className="text-base font-semibold">{title}</span>
      {description && (
        <span className="text-sm text-center max-w-xs">{description}</span>
      )}
    </div>
  );
};
