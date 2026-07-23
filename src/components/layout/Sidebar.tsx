import React from 'react';
import {
  Activity,
  Shield,
  Cpu,
  HardDrive,
  Globe,
  AlertTriangle,
  Package,
  Terminal as TerminalIcon,
  Database
} from '../../utils/icons';

export type TabKey = 
  | 'overview' 
  | 'workspace' 
  | 'fleet' 
  | 'fleet-analytics' 
  | 'auditor' 
  | 'remediation' 
  | 'forecasting' 
  | 'topology' 
  | 'importer' 
  | 'ai' 
  | 'software' 
  | 'system-status' 
  | 'coming-soon-fleet' 
  | 'coming-soon-correlation' 
  | 'coming-soon-healing' 
  | 'coming-soon-ai-eng' 
  | 'coming-soon-vuln' 
  | 'coming-soon-execution';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  overallScore?: number;
  findingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  overallScore = 100,
  findingCount = 0
}) => {
  const menuItems: Array<{ key: TabKey; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { key: 'overview', label: 'Overview', icon: <Activity style={{ width: '16px', height: '16px' }} /> },
    { key: 'workspace', label: 'Workspace Git Catalog', icon: <Database style={{ width: '16px', height: '16px' }} /> },
    { key: 'fleet', label: 'Fleet Registry', icon: <Globe style={{ width: '16px', height: '16px' }} /> },
    { key: 'fleet-analytics', label: 'Fleet Analytics', icon: <Cpu style={{ width: '16px', height: '16px' }} /> },
    { key: 'auditor', label: 'Assessment Auditor', icon: <Shield style={{ width: '16px', height: '16px' }} />, badge: findingCount },
    { key: 'remediation', label: 'Self-Healing Actions', icon: <AlertTriangle style={{ width: '16px', height: '16px' }} /> },
    { key: 'forecasting', label: 'Capacity Forecast', icon: <HardDrive style={{ width: '16px', height: '16px' }} /> },
    { key: 'topology', label: 'Topology Graph', icon: <Globe style={{ width: '16px', height: '16px' }} /> },
    { key: 'software', label: 'Software Intelligence', icon: <Package style={{ width: '16px', height: '16px' }} /> },
    { key: 'ai', label: 'Local AI Copilot', icon: <TerminalIcon style={{ width: '16px', height: '16px' }} /> },
    { key: 'system-status', label: 'System Health Status', icon: <Activity style={{ width: '16px', height: '16px' }} /> }
  ];

  return (
    <aside style={{
      width: '240px',
      backgroundColor: '#111827',
      borderRight: '1px solid #1f2937',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px 12px'
    }}>
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '0 8px 8px 8px'
        }}>
          Bounded Contexts
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map(item => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isActive ? '#1f2937' : 'transparent',
                  color: isActive ? '#3b82f6' : '#9ca3af',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge !== 0 && (
                  <span style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Overall Health Summary */}
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '8px',
        padding: '12px',
        marginTop: '16px',
        border: '1px solid #374151'
      }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Overall System Health</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444'
          }}>
            {Math.round(overallScore)}%
          </span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            {overallScore >= 80 ? 'Optimal' : overallScore >= 60 ? 'Warning' : 'Critical'}
          </span>
        </div>
      </div>
    </aside>
  );
};
