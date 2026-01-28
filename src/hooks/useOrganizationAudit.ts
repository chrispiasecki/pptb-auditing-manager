import { useState, useCallback, useEffect } from 'react';
import type { OrganizationAuditSettings } from '../model/audit';
import {
  getOrganizationAuditSettings,
  updateOrganizationAuditEnabled,
  updateOrganizationUserAccessAuditEnabled,
} from '../services/auditService';

export function useOrganizationAudit() {
  const [settings, setSettings] = useState<OrganizationAuditSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getOrganizationAuditSettings();
      setSettings(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleAuditEnabled = useCallback(async (isEnabled: boolean) => {
    if (!settings) return;

    setIsUpdating(true);
    setError(null);
    try {
      await updateOrganizationAuditEnabled(settings.organizationId, isEnabled);
      setSettings(prev => prev ? { ...prev, isAuditEnabled: isEnabled } : null);
      await window.toolboxAPI.utils.showNotification({
        title: 'Audit Settings Updated',
        body: `Global auditing has been ${isEnabled ? 'enabled' : 'disabled'}`,
        type: 'success',
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = (err as Error).message || String(err);
      setError(errorMessage);
      await window.toolboxAPI.utils.showNotification({
        title: 'Update Failed',
        body: errorMessage,
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  }, [settings]);

  const toggleUserAccessAuditEnabled = useCallback(async (isEnabled: boolean) => {
    if (!settings) return;

    setIsUpdating(true);
    setError(null);
    try {
      await updateOrganizationUserAccessAuditEnabled(settings.organizationId, isEnabled);
      setSettings(prev => prev ? { ...prev, isUserAccessAuditEnabled: isEnabled } : null);
      await window.toolboxAPI.utils.showNotification({
        title: 'Audit Settings Updated',
        body: `User access auditing has been ${isEnabled ? 'enabled' : 'disabled'}`,
        type: 'success',
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = (err as Error).message || String(err);
      setError(errorMessage);
      await window.toolboxAPI.utils.showNotification({
        title: 'Update Failed',
        body: errorMessage,
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  }, [settings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    isUpdating,
    error,
    toggleAuditEnabled,
    toggleUserAccessAuditEnabled,
    refresh: fetchSettings,
  };
}
