import React from 'react';
import { useOrganizationAudit } from '../../hooks/useOrganizationAudit';
import { ShieldCheckmarkIcon, ArrowSyncIcon, InfoIcon, PersonIcon } from '../common/Icons';

// Custom Switch component
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`switch ${checked ? 'switch-enabled' : 'switch-disabled'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span className={`switch-thumb ${checked ? 'switch-thumb-enabled' : 'switch-thumb-disabled'}`} />
  </button>
);

export const GlobalAuditSettings: React.FC = () => {
  const {
    settings,
    isLoading,
    isUpdating,
    error,
    toggleAuditEnabled,
    toggleUserAccessAuditEnabled,
    refresh,
  } = useOrganizationAudit();

  if (isLoading) {
    return (
      <div className="card max-w-xl">
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner spinner-md text-blue-600" />
            <span className="text-foreground-3">Loading organization settings...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-xl">
        <div className="flex items-center gap-4 p-6 text-red-600 dark:text-red-400">
          <span>Error: {error}</span>
          <button
            onClick={refresh}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ArrowSyncIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="card max-w-xl">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center gap-2">
          <ShieldCheckmarkIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-lg">Global Audit Settings</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-6">
        {/* Global Audit Toggle */}
        <div className="flex items-center justify-between p-4 bg-background-2 rounded-lg">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <ShieldCheckmarkIcon className="w-5 h-5 text-foreground-3" />
              <span className="font-semibold text-base">Enable Auditing</span>
            </div>
            <span className="text-sm text-foreground-3">
              When enabled, changes to records will be logged in the audit history
            </span>
            {settings.auditRetentionPeriodV2 !== null && (
              <span className="badge badge-outline mt-2 w-fit">
                Retention: {settings.auditRetentionPeriodV2} days
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isUpdating && <div className="spinner spinner-sm text-blue-600" />}
            <Switch
              checked={settings.isAuditEnabled}
              onChange={toggleAuditEnabled}
              disabled={isUpdating}
            />
          </div>
        </div>

        {/* User Access Audit Toggle */}
        <div className="flex items-center justify-between p-4 bg-background-2 rounded-lg">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <PersonIcon className="w-5 h-5 text-foreground-3" />
              <span className="font-semibold text-base">Enable User Access Auditing</span>
            </div>
            <span className="text-sm text-foreground-3">
              When enabled, user read access to records will be logged in the audit history
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isUpdating && <div className="spinner spinner-sm text-blue-600" />}
            <Switch
              checked={settings.isUserAccessAuditEnabled}
              onChange={toggleUserAccessAuditEnabled}
              disabled={isUpdating || !settings.isAuditEnabled}
            />
          </div>
        </div>

        {/* Info Section */}
        <div className="flex items-start gap-2 p-4 bg-background-3 rounded-lg">
          <InfoIcon className="w-5 h-5 text-foreground-3 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-foreground-2">
            Global auditing must be enabled before you can configure table-level,
            attribute-level, or user access auditing. When disabled, no audit logs
            will be recorded regardless of individual settings.
          </span>
        </div>
      </div>
    </div>
  );
};
