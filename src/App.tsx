import { useCallback, useEffect, useState } from 'react';
import { useConnection, useToolboxEvents } from './hooks/useToolboxAPI';
import { GlobalAuditSettings } from './components/global-settings/GlobalAuditSettings';
import { TableAuditManager } from './components/table-settings/TableAuditManager';
import { AuditLogExplorer } from './components/audit-logs/AuditLogExplorer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { logAvailableAPIMethods } from './services/auditService';
import type { AuditView } from './model/audit';

// Icons as SVG components
const ShieldCheckmarkIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const TableIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
);

const PlugDisconnectedIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 2l20 20M7 7l-4 4 6 6 4-4M17 17l4-4-6-6-4 4" />
  </svg>
);

const HistoryIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const DocumentEditIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const ShareIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const PersonIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ShieldKeyholeIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="10" r="2" />
    <path d="M12 12v4" />
  </svg>
);

const DatabaseIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const LinkIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const SettingsIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// Audit sub-tab types
type AuditTab = 'details' | 'shares' | 'access' | 'roles' | 'metadata' | 'relationships' | 'auditchanges';

function App() {
  const { connection, isLoading: isConnectionLoading, refreshConnection } = useConnection();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeView, setActiveView] = useState<AuditView>('logs');
  const [auditTab, setAuditTab] = useState<AuditTab>('details');

  // Handle platform events
  const handleEvent = useCallback(
    (event: string, _data: unknown) => {
      switch (event) {
        case 'connection:updated':
        case 'connection:created':
        case 'connection:deleted':
          refreshConnection();
          break;
      }
    },
    [refreshConnection]
  );

  useToolboxEvents(handleEvent);

  // Log available API methods on startup for debugging
  useEffect(() => {
    logAvailableAPIMethods();
  }, []);

  // Get theme from Toolbox API and apply to document
  useEffect(() => {
    const getTheme = async () => {
      try {
        const currentTheme = await window.toolboxAPI.utils.getCurrentTheme();
        const isDark = currentTheme === 'dark';
        setTheme(isDark ? 'dark' : 'light');
        // Apply dark class to document for Tailwind dark mode
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        console.error('Error getting theme:', error);
      }
    };
    getTheme();
  }, []);

  // Load saved view preference
  useEffect(() => {
    const loadSavedView = async () => {
      try {
        const savedView = await window.toolboxAPI.settings.get('activeView') || 'logs';
        setActiveView(savedView as AuditView);
      } catch (error) {
        console.error('Error loading saved view:', error);
      }
    };
    loadSavedView();
  }, []);

  // Save view preference when it changes
  const handleViewChange = useCallback(async (view: AuditView) => {
    setActiveView(view);
    try {
      await window.toolboxAPI.settings.set('activeView', view);
    } catch (error) {
      console.error('Error saving view preference:', error);
    }
  }, []);

  const renderContent = () => {
    if (isConnectionLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-foreground-3">
          <span className="text-lg">Loading...</span>
        </div>
      );
    }

    if (!connection) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-foreground-3">
          <PlugDisconnectedIcon className="w-16 h-16 text-foreground-4" />
          <span className="text-xl font-semibold">No Connection</span>
          <span>Please connect to a Dataverse environment to manage audit settings</span>
        </div>
      );
    }

    switch (activeView) {
      case 'logs':
        return <AuditLogExplorer isConnected={!!connection} selectedTab={auditTab} />;
      case 'global':
        return (
          <div className="p-6 overflow-auto">
            <GlobalAuditSettings />
          </div>
        );
      case 'tables':
        return <TableAuditManager />;
      default:
        return null;
    }
  };

  const mainTabs = [
    { value: 'logs', label: 'Audit Logs', icon: HistoryIcon },
    { value: 'global', label: 'Global Settings', icon: ShieldCheckmarkIcon },
    { value: 'tables', label: 'Table Settings', icon: TableIcon },
  ];

  const auditTabs = [
    { value: 'details', label: 'Data Changes', icon: DocumentEditIcon },
    { value: 'shares', label: 'Record Shares', icon: ShareIcon },
    { value: 'access', label: 'User Access', icon: PersonIcon },
    { value: 'roles', label: 'Role Changes', icon: ShieldKeyholeIcon },
    { value: 'metadata', label: 'Metadata Changes', icon: DatabaseIcon },
    { value: 'relationships', label: 'N:N Relationships', icon: LinkIcon },
    { value: 'auditchanges', label: 'Audit Changes', icon: SettingsIcon },
  ];

  return (
    <div className={`flex flex-col h-screen bg-background-1 overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 border-b border-stroke-1 bg-background-1">
        <ShieldCheckmarkIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h1 className="flex-1 text-xl font-semibold text-foreground-1">
          Audit Manager
        </h1>
        <div className="flex items-center gap-2">
          {connection ? (
            <span
              className="badge badge-success"
              title={connection.url}
            >
              {connection.name || 'Connected'}
            </span>
          ) : (
            <span className="badge badge-danger flex items-center gap-1">
              <PlugDisconnectedIcon className="w-4 h-4" />
              Not Connected
            </span>
          )}
        </div>
      </header>

      {/* Primary Navigation */}
      <nav className="border-b border-stroke-1 bg-background-2">
        <div className="flex px-4">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => handleViewChange(tab.value as AuditView)}
                className={`tab ${activeView === tab.value ? 'tab-active' : ''}`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Secondary Navigation for Audit Logs */}
      {activeView === 'logs' && connection && (
        <nav className="border-b border-stroke-1 bg-background-1">
          <div className="flex px-4">
            {auditTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setAuditTab(tab.value as AuditTab)}
                  className={`tab text-sm ${auditTab === tab.value ? 'tab-active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
