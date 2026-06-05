import React, { useState } from 'react';
import { Check, Shield, Activity, Terminal, Globe, Package } from '../utils/icons';

interface FeatureDetail {
  name: string;
  subtitle: string;
  purpose: string;
  expectedBenefits: string[];
  plannedPhase: string;
  phaseProgress: number; // percentage
  status: string;
}

const FEATURE_DATA: Record<string, FeatureDetail> = {
  'coming-soon-fleet': {
    name: 'Fleet Management',
    subtitle: 'Enterprise Fleet Orchestration',
    purpose: 'Unified orchestrator to discover, update, and manage multi-machine deployments across cloud and hybrid infrastructure.',
    expectedBenefits: [
      'Scale operations from a single host to thousands of endpoints with zero-touch policies.',
      'Deploy and synchronize assessment cycles globally across server groups.',
      'Aggregated health dashboards and comparative host telemetry analysis.'
    ],
    plannedPhase: 'Phase 2 (Q3 2026)',
    phaseProgress: 65,
    status: 'In Development'
  },
  'coming-soon-correlation': {
    name: 'Correlation & Causal Inference',
    subtitle: 'Graph-Based Threat Propagation Core',
    purpose: 'Causal mapping engine that correlates multi-signal events, logs, and assessments into unified causal chains.',
    expectedBenefits: [
      'Reduce alarm fatigue by 90% by grouping unrelated warnings into single causal trees.',
      'Trace exact path of impact from process crash up to user-facing service outage.',
      'Explainable AI reasoning for automated root-cause determinations.'
    ],
    plannedPhase: 'Phase 2 (Q3 2026)',
    phaseProgress: 45,
    status: 'Prototyping'
  },
  'coming-soon-healing': {
    name: 'Auto-Healing & Self-Recovery',
    subtitle: 'Closed-Loop Drift Remediation',
    purpose: 'Automated policy enforcement engine that detects configuration drifts and runs localized runbooks to self-heal systems.',
    expectedBenefits: [
      'Remediate security configuration drifts automatically in under 60 seconds.',
      'Zero-human intervention required for common operational failures.',
      'Failsafe rollback logic that protects system integrity if repair scripts fail.'
    ],
    plannedPhase: 'Phase 3 (Q4 2026)',
    phaseProgress: 20,
    status: 'Researching Architecture'
  },
  'coming-soon-ai-eng': {
    name: 'Autonomous AI Ops Engineer',
    subtitle: 'Agentic Diagnostics Loop',
    purpose: 'Multi-agent localized AI loop that goes beyond simple chatbot answers to run deep diagnostic investigations and author custom code fixes.',
    expectedBenefits: [
      'Offload complex diagnostic triage tasks to localized, self-directed AI workers.',
      'Natural language task delegation for writing compliance test suites.',
      'Self-validating execution loops that test fixes in safe sandbox regions before applying.'
    ],
    plannedPhase: 'Phase 4 (Q1 2027)',
    phaseProgress: 10,
    status: 'Planning Research'
  },
  'coming-soon-vuln': {
    name: 'Vulnerability & Threat Intelligence',
    subtitle: 'Real-Time Exploit Correlation',
    purpose: 'Live threat mapping engine correlating inventory packages with global CVE feeds and active threat intelligence databases.',
    expectedBenefits: [
      'Prioritize software upgrades based on active real-world threat feeds rather than static CVSS scores.',
      'Instant zero-day vulnerability checks and zero-hour hotfixing options.',
      'Compliance and supply-chain risk indexing of all runtime libraries.'
    ],
    plannedPhase: 'Phase 3 (Q4 2026)',
    phaseProgress: 35,
    status: 'Designing Integration'
  },
  'coming-soon-execution': {
    name: 'Active Remediation Execution',
    subtitle: 'Safe OS Commands Dispatcher',
    purpose: 'Secure remote command dispatcher built to safely apply fixes, patches, and upgrades directly to host operating systems with pre/post checks.',
    expectedBenefits: [
      'Deploy hotfixes across target groups with transactional safety guarantees.',
      'Automatic pre-flight state snapshots and post-flight validation runs.',
      'Granular auditing and role-based access approvals for all write actions.'
    ],
    plannedPhase: 'Phase 2 (Q3 2026)',
    phaseProgress: 75,
    status: 'In Alpha Testing'
  }
};

interface ComingSoonPageProps {
  featureKey: string;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ featureKey }) => {
  const data = FEATURE_DATA[featureKey];
  const [requested, setRequested] = useState<boolean>(() => {
    return localStorage.getItem(`requested-${featureKey}`) === 'true';
  });
  const [votes, setVotes] = useState<number>(() => {
    const base = Math.abs(featureKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 100 + 40;
    return requested ? base + 1 : base;
  });

  if (!data) {
    return (
      <div className="coming-soon-panel" style={{ textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-pink)' }}>Feature Configuration Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>The selected feature key could not be mapped to metadata.</p>
      </div>
    );
  }

  const handleRequestAccess = () => {
    if (requested) {
      localStorage.setItem(`requested-${featureKey}`, 'false');
      setRequested(false);
      setVotes(prev => prev - 1);
    } else {
      localStorage.setItem(`requested-${featureKey}`, 'true');
      setRequested(true);
      setVotes(prev => prev + 1);
    }
  };

  const getFeatureIcon = () => {
    switch (featureKey) {
      case 'coming-soon-fleet': return <Globe size={32} color="var(--color-cyan)" />;
      case 'coming-soon-correlation': return <Activity size={32} color="var(--color-cyan)" />;
      case 'coming-soon-healing': return <Shield size={32} color="var(--color-cyan)" />;
      case 'coming-soon-ai-eng': return <Terminal size={32} color="var(--color-cyan)" />;
      case 'coming-soon-vuln': return <Package size={32} color="var(--color-cyan)" />;
      case 'coming-soon-execution': return <Check size={32} color="var(--color-green)" />;
      default: return <Shield size={32} color="var(--color-cyan)" />;
    }
  };

  return (
    <div className="coming-soon-panel">
      {/* Visual Header */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '12px',
          background: 'rgba(6, 182, 212, 0.05)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)',
          flexShrink: 0
        }}>
          {getFeatureIcon()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{data.name}</h2>
              <span style={{ fontSize: '12px', color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>{data.subtitle}</span>
            </div>
            <span className="cyber-badge badge-orange" style={{ padding: '4px 10px', fontSize: '10px' }}>
              ✦ {data.status}
            </span>
          </div>
        </div>
      </div>

      {/* Main Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        {/* Left column: Purpose & Benefits */}
        <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Scope & Core Purpose</h3>
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
              {data.purpose}
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Key Planned Capabilities</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.expectedBenefits.map((benefit, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-green)',
                    fontSize: '11px',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    ✓
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {benefit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Target Phase & Interactive */}
        <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '12px' }}>Deployment Target</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Release Goal:</span>
              <span className="cyber-badge badge-cyan" style={{ fontSize: '11px' }}>{data.plannedPhase}</span>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <span>Phase Progress:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{data.phaseProgress}%</span>
              </div>
              <div className="progress-bar-container" style={{ margin: 0, height: '8px' }}>
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${data.phaseProgress}%`, 
                    backgroundColor: data.phaseProgress > 50 ? 'var(--color-cyan)' : 'var(--color-orange)' 
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(6, 182, 212, 0.02)', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Co-Pilot Early Adopters Program</div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Express interest in this module to prioritize development tasks and join the private developer preview.
            </p>
            
            <div style={{ margin: '4px 0', fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)' }}>
              {votes} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', letterSpacing: 'normal' }}>Commanders Interested</span>
            </div>

            <button 
              onClick={handleRequestAccess}
              className={`cyber-btn ${requested ? 'cyber-btn-primary' : ''}`}
              style={{ width: '100%', padding: '10px', fontSize: '12px', fontWeight: 'bold', border: requested ? 'none' : '1px solid var(--border-color)' }}
            >
              {requested ? '✓ Early Access Requested' : 'Express Interest & Vote'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
