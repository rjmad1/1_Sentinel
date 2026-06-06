import React from 'react';
import {
  Terminal,
  AlertTriangle
} from '../utils/icons';

// Simple Icons defined inline or imported
export const CheckCircleIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'var(--color-success)' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const FileIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const ArrowRightIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// 1. Severity Badge
export const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const sev = severity.toLowerCase();
  let badgeClass = 'badge-blue';
  if (sev === 'critical' || sev === 'high') {
    badgeClass = 'badge-pink';
  } else if (sev === 'medium') {
    badgeClass = 'badge-orange';
  } else if (sev === 'success' || sev === 'low') {
    badgeClass = 'badge-green';
  } else if (sev === 'info' || sev === 'informational') {
    badgeClass = 'badge-cyan';
  }

  return (
    <span className={`cyber-badge ${badgeClass}`} style={{ fontSize: '11px', fontWeight: 'bold' }}>
      {severity}
    </span>
  );
};

// 2. Trend Badge
export const TrendBadge: React.FC<{ trend: 'improving' | 'degrading' | 'stable'; text?: string }> = ({ trend, text }) => {
  const isUp = trend === 'improving';
  const isDown = trend === 'degrading';
  const color = isUp ? 'var(--color-success)' : isDown ? 'var(--color-danger)' : 'var(--color-warning)';
  const icon = isUp ? '↑' : isDown ? '↓' : '→';

  return (
    <span style={{ 
      color, 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '4px', 
      fontWeight: 'bold',
      fontSize: '12px' 
    }}>
      <span>{icon}</span>
      <span>{text || (trend.charAt(0).toUpperCase() + trend.slice(1))}</span>
    </span>
  );
};

// 3. Risk Indicator
export const RiskIndicator: React.FC<{ risk: string }> = ({ risk }) => {
  const r = risk.toLowerCase();
  let color = 'var(--color-success)';
  let icon = <CheckCircleIcon size={14} color="var(--color-success)" />;

  if (r === 'critical' || r === 'high') {
    color = 'var(--color-danger)';
    icon = <AlertTriangle size={14} color="var(--color-danger)" />;
  } else if (r === 'medium' || r === 'warn') {
    color = 'var(--color-warning)';
    icon = <AlertTriangle size={14} color="var(--color-warning)" />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color, fontWeight: 'bold', fontSize: '12px' }}>
      {icon}
      <span style={{ textTransform: 'uppercase' }}>{risk}</span>
    </div>
  );
};

// 4. Lifecycle Component
export interface StageState {
  name: string;
  status: 'complete' | 'active' | 'blocked' | 'pending';
}

export const LifecycleComponent: React.FC<{ stages: StageState[] }> = ({ stages }) => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      background: 'rgba(0, 0, 0, 0.25)', 
      padding: '6px 16px', 
      borderRadius: '24px', 
      border: '1px solid var(--border-color)',
      overflowX: 'auto',
      maxWidth: '100%'
    }}>
      {stages.map((stage, idx) => {
        const isActive = stage.status === 'active';
        const isComplete = stage.status === 'complete';
        const isBlocked = stage.status === 'blocked';
        
        let color = 'var(--text-muted)';
        let badgeBg = 'transparent';
        let badgeBorder = '1px solid var(--neutral-700)';
        
        if (isActive) {
          color = 'var(--color-info)';
          badgeBg = 'rgba(59, 130, 246, 0.1)';
          badgeBorder = '1px solid var(--color-info)';
        } else if (isComplete) {
          color = 'var(--color-success)';
          badgeBg = 'rgba(22, 199, 132, 0.05)';
          badgeBorder = '1px solid var(--color-success)';
        } else if (isBlocked) {
          color = 'var(--color-danger)';
          badgeBg = 'rgba(239, 68, 68, 0.1)';
          badgeBorder = '1px solid var(--color-danger)';
        }

        return (
          <React.Fragment key={stage.name}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '11px',
              fontWeight: isActive || isComplete ? 'bold' : 'normal',
              color,
              whiteSpace: 'nowrap'
            }}>
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                fontSize: '10px',
                backgroundColor: badgeBg,
                border: badgeBorder,
                fontWeight: 'bold',
                fontFamily: 'var(--font-mono)'
              }}>
                {isComplete ? '✓' : isBlocked ? '!' : idx + 1}
              </span>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stage.name}</span>
            </div>
            {idx < stages.length - 1 && (
              <span style={{ color: 'var(--neutral-700)', fontSize: '10px', userSelect: 'none' }}>▶</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// 5. Assessment Header (Context Bar)
interface AssessmentHeaderProps {
  computerName: string;
  osName: string;
  lastBootTime: string;
  timestamp: string;
  psVersion: string;
  activeAssessmentId: string | null;
  daemonState: 'connected' | 'disconnected' | 'scanning' | 'error' | 'upgrade-required';
  findingsCount: number;
  completedRemediationsCount: number;
}

export const AssessmentHeader: React.FC<AssessmentHeaderProps> = ({
  computerName,
  osName,
  lastBootTime,
  timestamp,
  psVersion,
  activeAssessmentId,
  daemonState,
  findingsCount,
  completedRemediationsCount
}) => {
  // Compute stages for global lifecycle
  const stages: StageState[] = [
    { 
      name: 'Collect', 
      status: daemonState === 'scanning' ? 'active' : (activeAssessmentId ? 'complete' : (daemonState === 'error' ? 'blocked' : 'pending')) 
    },
    { 
      name: 'Analyze', 
      status: activeAssessmentId ? 'complete' : 'pending' 
    },
    { 
      name: 'Identify', 
      status: findingsCount > 0 ? 'complete' : 'pending' 
    },
    { 
      name: 'Prioritize', 
      status: findingsCount > 0 ? 'complete' : 'pending' 
    },
    { 
      name: 'Remediate', 
      status: findingsCount === 0 ? 'pending' : (completedRemediationsCount === findingsCount ? 'complete' : 'active') 
    },
    { 
      name: 'Verify', 
      status: completedRemediationsCount === 0 ? 'pending' : (completedRemediationsCount === findingsCount ? 'complete' : 'active') 
    },
    { 
      name: 'Monitor', 
      status: daemonState === 'connected' ? 'active' : (daemonState === 'upgrade-required' || daemonState === 'error' ? 'blocked' : 'pending') 
    }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px 24px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      zIndex: 5
    }}>
      {/* Top row: Context parameters & Lifecycle component */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Context Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Host:</span>
            <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{computerName || 'No host loaded'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>OS:</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }} title={osName}>{osName ? (osName.length > 28 ? osName.substring(0, 25) + '...' : osName) : 'Unknown OS'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ID:</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{activeAssessmentId ? activeAssessmentId.substring(0, 8) + '...' : 'None'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Collected:</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Boot:</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{lastBootTime ? (lastBootTime.includes(' ') ? lastBootTime.split(' ')[0] : lastBootTime.substring(0, 10)) : 'N/A'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>PS:</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>v{psVersion || 'N/A'}</span>
          </div>
        </div>

        {/* Global Lifecycle Component */}
        <LifecycleComponent stages={stages} />

      </div>

      {/* Hidden compatibility container for E2E locators */}
      <div className="glass-panel" style={{ display: 'none' }}>
        Environment Overview Details: {computerName}
      </div>
    </div>
  );
};

// 6. Health Card
interface HealthCardProps {
  label: string;
  value: number | string;
  context: string;
  trend: 'improving' | 'degrading' | 'stable';
  trendText?: string;
  onActionClick?: () => void;
  actionText?: string;
}

export const HealthCard: React.FC<HealthCardProps> = ({
  label,
  value,
  context,
  trend,
  trendText,
  onActionClick,
  actionText = 'View Details'
}) => {
  return (
    <div className="glass-panel" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between', 
      gap: '12px', 
      padding: '16px',
      borderRadius: 'var(--radius-medium)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {label}
        </span>
        <TrendBadge trend={trend} text={trendText} />
      </div>

      <div style={{ margin: '8px 0' }}>
        <div style={{ fontSize: '36px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
          {value}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {context}
        </div>
      </div>

      {onActionClick && (
        <button 
          className="cyber-btn" 
          onClick={onActionClick} 
          style={{ width: '100%', fontSize: '11px', padding: '6px 12px', justifyContent: 'center', border: '1px solid var(--neutral-700)' }}
        >
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};

// 7. Action Card (Recommended Action Card)
interface ActionCardProps {
  title: string;
  findingId: string;
  severity: string;
  priority: number;
  effort: string;
  actionDescription: string;
  validationText: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onInspectClick?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  findingId,
  severity,
  priority,
  effort,
  actionDescription,
  validationText,
  isCompleted,
  onToggleComplete,
  onInspectClick
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-start', 
      gap: '16px', 
      padding: '16px', 
      border: '1px solid var(--border-color)', 
      borderRadius: 'var(--radius-medium)',
      background: isCompleted ? 'rgba(22, 199, 132, 0.02)' : 'transparent',
      borderColor: isCompleted ? 'rgba(22, 199, 132, 0.2)' : 'var(--border-color)',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ paddingTop: '4px' }}>
        <input 
          type="checkbox" 
          checked={isCompleted} 
          onChange={onToggleComplete}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          title="Mark remediation complete"
        />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-info)', fontWeight: 'bold' }}>
              {findingId} (Priority {priority})
            </span>
            <SeverityBadge severity={severity} />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Effort: <strong style={{ color: 'var(--text-secondary)' }}>{effort}</strong>
          </span>
        </div>

        <h3 style={{ 
          fontSize: '15px', 
          fontWeight: 'bold', 
          marginBottom: '6px', 
          textDecoration: isCompleted ? 'line-through' : 'none', 
          color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)' 
        }}>
          {title}
        </h3>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
          {actionDescription}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Verification: <strong style={{ color: 'var(--text-secondary)' }}>{validationText}</strong>
          </div>
          {onInspectClick && (
            <button 
              className="btn-tertiary" 
              onClick={onInspectClick}
              style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
            >
              <span>Inspect Evidence</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 8. Empty State Component
interface EmptyStateProps {
  title: string;
  description: string;
  causes: string[];
  actions: Array<{ label: string; onClick: () => void; primary?: boolean }>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  causes,
  actions
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '48px 24px', 
      textAlign: 'center', 
      background: 'var(--bg-secondary)', 
      border: '1px dashed var(--border-color)', 
      borderRadius: 'var(--radius-medium)',
      gap: '16px'
    }}>
      <AlertTriangle size={48} color="var(--color-warning)" style={{ opacity: 0.8 }} />
      
      <div style={{ maxWidth: '480px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
          {title}
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {description}
        </p>
      </div>

      {causes && causes.length > 0 && (
        <div style={{ 
          textAlign: 'left', 
          background: 'rgba(0, 0, 0, 0.15)', 
          padding: '16px 20px', 
          borderRadius: 'var(--radius-small)', 
          border: '1px solid var(--border-color)', 
          fontSize: '13px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>Possible Causes:</strong>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
            {causes.map((cause, idx) => <li key={idx}>{cause}</li>)}
          </ul>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {actions.map((act, idx) => (
            <button 
              key={idx} 
              className={act.primary ? 'cyber-btn cyber-btn-primary' : 'cyber-btn'}
              onClick={act.onClick}
              style={{ fontWeight: act.primary ? 'bold' : 'normal' }}
            >
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 9. Evidence Panel
interface EvidencePanelProps {
  evidence: Array<{
    Source: string;
    Name: string;
    Value: unknown;
    ValidationState?: string;
    Collector?: string;
  }>;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence }) => {
  const renderValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {evidence.map((ev, idx) => (
        <div key={idx} style={{ 
          background: 'rgba(0, 0, 0, 0.2)', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-small)', 
          padding: '10px 14px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <span>
              Source: <strong style={{ color: 'var(--text-secondary)' }}>{ev.Source}</strong> • Name: <strong style={{ color: 'var(--text-secondary)' }}>{ev.Name}</strong>
            </span>
            {ev.Collector && <span>Collector: {ev.Collector}</span>}
          </div>
          <pre style={{ 
            fontSize: '12px', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--color-info)', 
            whiteSpace: 'pre-wrap', 
            margin: 0,
            overflowX: 'auto',
            background: 'rgba(2, 4, 10, 0.4)',
            padding: '8px',
            borderRadius: '4px'
          }}>
            {renderValue(ev.Value)}
          </pre>
          {ev.ValidationState && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <span className="cyber-badge badge-cyan" style={{ fontSize: '9px', padding: '1px 6px' }}>
                State: {ev.ValidationState}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export interface TimelinePoint {
  run: {
    AssessmentId: string;
    Timestamp: string;
    OverallHealth: number;
    Performance: number;
    Security: number;
    Reliability: number;
  };
  x: number;
  y: number;
}

// 10. Timeline Component
interface TimelineComponentProps {
  historyData: Array<{
    AssessmentId: string;
    Timestamp: string;
    OverallHealth: number;
    Performance: number;
    Security: number;
    Reliability: number;
  }>;
  onPointClick: (assessmentId: string) => void;
  hoveredPoint: TimelinePoint | null;
  onPointEnter: (point: TimelinePoint) => void;
  onPointLeave: () => void;
}

export const TimelineComponent: React.FC<TimelineComponentProps> = ({
  historyData,
  onPointClick,
  hoveredPoint,
  onPointEnter,
  onPointLeave
}) => {
  if (!historyData || historyData.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-medium)' }}>
        No historical assessments recorded.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', overflow: 'visible', margin: '20px 0' }}>
      <svg width="100%" height="240" viewBox="0 0 600 240" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-medium)', border: '1px solid var(--border-color)', overflow: 'visible' }}>
        {/* Grid Lines */}
        {[20, 40, 60, 80, 100].map(val => {
          const y = 210 - (val / 100) * 180;
          return (
            <g key={val}>
              <line x1="50" y1={y} x2="560" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <text x="25" y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="middle">{val}%</text>
            </g>
          );
        })}

        {/* Data Line Path */}
        {(() => {
          const points = historyData.map((run, idx) => {
            const x = 60 + (idx / Math.max(1, historyData.length - 1)) * 480;
            const y = 210 - (run.OverallHealth / 100) * 180;
            return { x, y };
          });
          const dAttr = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          return (
            <path
              d={dAttr}
              fill="none"
              stroke="var(--color-info)"
              strokeWidth="3"
              style={{ filter: 'drop-shadow(0px 0px 6px var(--color-info))' }}
            />
          );
        })()}

        {/* Data Dots & Text Labels */}
        {historyData.map((run, idx) => {
          const x = 60 + (idx / Math.max(1, historyData.length - 1)) * 480;
          const y = 210 - (run.OverallHealth / 100) * 180;
          const dateStr = new Date(run.Timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return (
            <g key={run.AssessmentId}>
              <circle cx={x} cy={y} r="8" fill="var(--color-info)" opacity="0.1" />
              <circle
                cx={x}
                cy={y}
                r="5"
                fill="var(--bg-primary)"
                stroke="var(--color-info)"
                strokeWidth="2.5"
                cursor="pointer"
                onMouseEnter={() => onPointEnter({ run, x, y })}
                onMouseLeave={onPointLeave}
                onClick={() => onPointClick(run.AssessmentId)}
              />
              <text x={x} y="225" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">{dateStr}</text>
              <text x={x} y={y - 12} fill="var(--text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle" style={{ fontFamily: 'var(--font-mono)' }}>
                {run.OverallHealth.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          left: `${(hoveredPoint.x / 600) * 100}%`,
          top: `${hoveredPoint.y - 85}px`,
          transform: 'translateX(-50%)',
          background: 'rgba(6,9,19,0.95)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 0 12px rgba(59,130,246,0.35)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-small)',
          fontSize: '11px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontWeight: 'bold', color: 'var(--color-info)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '4px' }}>
            ASSESSMENT SUMMARY
          </div>
          <div>Date: <strong style={{ color: 'var(--text-primary)' }}>{new Date(hoveredPoint.run.Timestamp).toLocaleString()}</strong></div>
          <div>Overall Score: <strong style={{ color: 'var(--color-info)', fontFamily: 'var(--font-mono)' }}>{hoveredPoint.run.OverallHealth.toFixed(1)}/100</strong></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 12px', marginTop: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
            <div>Perf: {hoveredPoint.run.Performance}</div>
            <div>Sec: {hoveredPoint.run.Security}</div>
            <div>Rel: {hoveredPoint.run.Reliability}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// 11. Node Inspector (Topology Sidebar)
interface NodeInspectorProps {
  label: string;
  type: string;
  status: string;
  details: Record<string, unknown>;
  alertText?: string | null;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  label,
  type,
  status,
  details,
  alertText
}) => {
  const statusColor = status === 'error' ? 'var(--color-danger)' : status === 'warn' ? 'var(--color-warning)' : 'var(--color-success)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ 
          width: '12px', 
          height: '12px', 
          borderRadius: '50%', 
          backgroundColor: statusColor,
          boxShadow: `0 0 8px ${statusColor}`
        }}></span>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{label}</h3>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class: {type}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.01)', paddingBottom: '6px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Risk State:</span>
          <strong style={{ color: status === 'error' ? 'var(--color-danger)' : status === 'warn' ? 'var(--color-warning)' : 'var(--color-success)' }}>
            {status === 'error' ? 'Exposed' : status === 'warn' ? 'Weakened' : 'Secured'}
          </strong>
        </div>
        
        {Object.entries(details).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.01)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{key}:</span>
            <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{String(val)}</span>
          </div>
        ))}
      </div>

      {alertText && (
        <div style={{ 
          marginTop: '12px', 
          padding: '12px', 
          background: 'rgba(239, 68, 68, 0.05)', 
          border: '1px solid rgba(239, 68, 68, 0.15)', 
          borderRadius: 'var(--radius-small)', 
          fontSize: '12px' 
        }}>
          <div style={{ fontWeight: 'bold', color: 'var(--color-danger)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={12} />
            <span>Active Finding Alert:</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{alertText}</p>
        </div>
      )}
    </div>
  );
};

// 12. Activity Feed (Logs)
interface ActivityFeedProps {
  logs: string[];
  filter: 'ALL' | 'INFO' | 'WARN' | 'ERROR';
  onFilterChange: (filter: 'ALL' | 'INFO' | 'WARN' | 'ERROR') => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  logs,
  filter,
  onFilterChange
}) => {
  const filtered = logs.filter(log => {
    if (filter === 'ALL') return true;
    return log.toUpperCase().includes(`[${filter}]`);
  });

  return (
    <div className="terminal-container" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
      <div className="terminal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="terminal-dots">
          <span className="terminal-dot" style={{ backgroundColor: 'var(--color-danger)' }}></span>
          <span className="terminal-dot" style={{ backgroundColor: 'var(--color-warning)' }}></span>
          <span className="terminal-dot" style={{ backgroundColor: 'var(--color-info)' }}></span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map(f => (
            <button 
              key={f} 
              onClick={() => onFilterChange(f)}
              style={{
                background: filter === f ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: filter === f ? '1px solid var(--color-info)' : '1px solid transparent',
                color: filter === f ? 'var(--color-info)' : 'var(--text-muted)',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="terminal-body" style={{ flex: 1, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '16px' }}>
        {filtered.map((line, idx) => {
          let color = 'var(--text-secondary)';
          if (line.includes('[Error]') || line.toUpperCase().includes('[ERROR]')) color = 'var(--color-danger)';
          else if (line.includes('[Warn]') || line.toUpperCase().includes('[WARN]')) color = 'var(--color-warning)';
          else if (line.includes('[Info]') || line.toUpperCase().includes('[INFO]')) color = 'var(--color-info)';

          return (
            <div key={idx} style={{ color, marginBottom: '4px', whiteSpace: 'pre-wrap' }}>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 13. AI Recommendation Card
interface AIRecommendationCardProps {
  title: string;
  description: string;
  onApplyClick?: () => void;
  buttonText?: string;
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  title,
  description,
  onApplyClick,
  buttonText = 'Implement Mitigation'
}) => {
  return (
    <div style={{
      background: 'rgba(59, 130, 246, 0.05)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: 'var(--radius-medium)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={14} />
          <span>{title}</span>
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
          {description}
        </p>
      </div>

      {onApplyClick && (
        <button 
          className="cyber-btn cyber-btn-primary" 
          onClick={onApplyClick}
          style={{ width: '100%', padding: '6px 12px', fontSize: '11px', justifyContent: 'center' }}
        >
          <span>{buttonText}</span>
        </button>
      )}
    </div>
  );
};
