import React from 'react';
import {
  Shield,
  Activity,
  Terminal as TerminalIcon,
  Settings,
  Search,
  User,
  RefreshCw,
  Database
} from '../../utils/icons';

interface HeaderProps {
  user: { username: string; roles: string[]; tenant_id: string } | null;
  logout: () => void;
  isBackendConnected: boolean;
  selectedMachineId: string;
  fleetMachines: Array<{ MachineId: string; ComputerName: string; Platform: string }>;
  onSelectMachine: (machineId: string) => void;
  onOpenCommandPalette: () => void;
  onOpenRefreshModal: () => void;
  onOpenWebhookModal: () => void;
  onOpenReportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  logout,
  isBackendConnected,
  selectedMachineId,
  fleetMachines,
  onSelectMachine,
  onOpenCommandPalette,
  onOpenRefreshModal,
  onOpenWebhookModal,
  onOpenReportModal
}) => {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      backgroundColor: '#111827',
      borderBottom: '1px solid #1f2937',
      color: '#f9fafb'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '18px' }}>
          <Shield style={{ color: '#3b82f6', width: '24px', height: '24px' }} />
          <span>Sentinel <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'normal' }}>EIIP v2.0</span></span>
        </div>

        {/* Machine Selector */}
        {fleetMachines.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
            <Database style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
            <select
              value={selectedMachineId}
              onChange={(e) => onSelectMachine(e.target.value)}
              style={{
                backgroundColor: '#1f2937',
                color: '#f3f4f6',
                border: '1px solid #374151',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '13px'
              }}
            >
              <option value="">Local Environment</option>
              {fleetMachines.map(m => (
                <option key={m.MachineId} value={m.MachineId}>
                  {m.ComputerName} ({m.Platform})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1f2937',
            color: '#9ca3af',
            border: '1px solid #374151',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <Search style={{ width: '14px', height: '14px' }} />
          <span>Search or Command (Ctrl+K)</span>
        </button>

        {/* Refresh Scan */}
        <button
          onClick={onOpenRefreshModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <RefreshCw style={{ width: '14px', height: '14px' }} />
          <span>Scan / Refresh</span>
        </button>

        {/* Backend Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          backgroundColor: isBackendConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: isBackendConnected ? '#10b981' : '#ef4444',
          border: `1px solid ${isBackendConnected ? '#059669' : '#dc2626'}`
        }}>
          <Activity style={{ width: '12px', height: '12px' }} />
          <span>{isBackendConnected ? 'Backend Live' : 'Local Offline'}</span>
        </div>

        {/* Settings / Webhooks */}
        <button
          onClick={onOpenWebhookModal}
          title="Webhook & Integration Settings"
          style={{
            backgroundColor: 'transparent',
            color: '#9ca3af',
            border: 'none',
            padding: '6px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          <Settings style={{ width: '18px', height: '18px' }} />
        </button>

        {/* Report Issue */}
        <button
          onClick={onOpenReportModal}
          title="Report Issue"
          style={{
            backgroundColor: 'transparent',
            color: '#9ca3af',
            border: 'none',
            padding: '6px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          <TerminalIcon style={{ width: '18px', height: '18px' }} />
        </button>

        {/* User Badge / Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid #374151' }}>
            <User style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
            <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{user.username}</span>
            <button
              onClick={logout}
              style={{
                backgroundColor: '#374151',
                color: '#d1d5db',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
