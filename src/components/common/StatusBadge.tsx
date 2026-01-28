import React from 'react';
import {
  CheckmarkCircleFilledIcon,
  CircleIcon,
  LockClosedIcon,
} from './Icons';

interface StatusBadgeProps {
  isEnabled: boolean;
  canModify?: boolean;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isEnabled,
  canModify = true,
  size = 'medium',
}) => {
  const iconSize = size === 'small' ? 'w-4 h-4' : 'w-5 h-5';

  if (!canModify) {
    return (
      <span
        className={`inline-flex items-center ${iconSize} text-foreground-3`}
        title="Cannot be modified"
      >
        <LockClosedIcon className={iconSize} />
      </span>
    );
  }

  if (isEnabled) {
    return (
      <span
        className={`inline-flex items-center ${iconSize} text-green-600 dark:text-green-400`}
        title="Audit Enabled"
      >
        <CheckmarkCircleFilledIcon className={iconSize} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center ${iconSize} text-foreground-4`}
      title="Audit Disabled"
    >
      <CircleIcon className={iconSize} />
    </span>
  );
};
