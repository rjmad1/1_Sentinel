/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Shield,
  Activity,
  Terminal as TerminalIcon,
  Settings,
  Cpu,
  HardDrive,
  Globe,
  AlertTriangle,
  Search,
  Send,
  User,
  Play,
  Package,
  RefreshCw,
  Database
} from './utils/icons';
import { SoftwareIntelligence } from './components/SoftwareIntelligence';
import { ComingSoonPage } from './components/ComingSoonPage';
import { SystemStatusPage } from './components/SystemStatusPage';
import { ReportIssueModal } from './components/ReportIssueModal';
import {
  saveAssessment,
  getHistoricalAssessments,
  loadAssessmentDetails
} from './utils/db';
import JSZip from 'jszip';
import {
  MOCK_ENVIRONMENT,
  MOCK_HEALTH_SCORE,
  MOCK_FINDINGS,
  MOCK_RISK_MATRIX,
  MOCK_CAPACITY_FORECAST,
  MOCK_LOGS,
  MOCK_HISTORY
} from './utils/mockData';
import type {
  EnvironmentOverview,
  HealthScore,
  Finding,
  RiskMatrixRow,
  CapacityForecast,
  EvidenceRecord,
  HistoricalAssessment
} from './utils/mockData';

// Custom Simple Inline Icons for premium look
const CheckCircleIcon = ({ size = 16, color = 'var(--color-green)' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const FileIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);


// Graph Node Interface
interface GraphNode {
  id: string;
  label: string;
  type: 'machine' | 'os' | 'hardware' | 'storage' | 'service' | 'security' | 'user' | 'software';
  status: 'normal' | 'warn' | 'error';
  x: number;
  y: number;
  details: Record<string, unknown>;
}

interface RefreshAssessmentModalProps {
  onClose: () => void;
  onSuccess: (data: any) => void;
  daemonState: 'connected' | 'disconnected' | 'scanning' | 'error' | 'upgrade-required';
  daemonVersion: string;
  daemonPlatform: string;
  daemonError: string;
  runDaemonScan: () => Promise<void>;
  checkDaemonStatus: () => Promise<void>;
}

const RefreshAssessmentModal: React.FC<RefreshAssessmentModalProps> = ({ 
  onClose, 
  onSuccess,
  daemonState,
  daemonVersion,
  daemonPlatform,
  daemonError,
  runDaemonScan,
  checkDaemonStatus
}) => {
  // 0 = Live Mode Check, 1 = Legacy Download, 2 = Legacy Run, 3 = Legacy Import, 4 = Finish
  const [step, setStep] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Automatically sync scanning state to step
  useEffect(() => {
    if (daemonState === 'scanning' && step !== 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(0);
    }
  }, [daemonState, step]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex="0"]'
        );
        if (focusables.length === 0) return;
        const first = focusables[0] as HTMLElement;
        const last = focusables[focusables.length - 1] as HTMLElement;
        
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    setTimeout(() => {
      const firstBtn = modalRef.current?.querySelector('button');
      firstBtn?.focus();
    }, 50);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setLoading(true);
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && parsed.Machine && parsed.HealthScore) {
          onSuccess(parsed);
          setStep(4);
        } else {
          setUploadError("Invalid Assessment.json schema. The file must contain Machine and HealthScore keys.");
        }
      } catch {
        setUploadError("Failed to parse JSON file. Make sure it is a valid JSON document.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerScanAndTransit = () => {
    runDaemonScan().then(() => {
      // onSuccess is handled by the parent App callback upon successful scan completion
      setStep(4);
    }).catch(() => {
      // error state set by parent
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="refresh-modal-title">
      <div className="modal-content" ref={modalRef} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h3 id="refresh-modal-title" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            <RefreshCw size={16} className={(step === 3 && loading) || daemonState === 'scanning' ? "spin" : ""} />
            <span>Refresh System Assessment</span>
          </h3>
          <button className="cyber-btn" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={onClose}>Close</button>
        </div>

        <div className="modal-body">
          {/* Progress Bar */}
          <div className="wizard-steps">
            <div className={`wizard-step ${step === 0 ? 'active' : 'completed'}`}>
              <div className="wizard-step-circle">L</div>
              <div className="wizard-step-label">Live Mode</div>
            </div>
            <div className={`wizard-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <div className="wizard-step-circle">{step > 1 ? "✓" : "1"}</div>
              <div className="wizard-step-label">Download</div>
            </div>
            <div className={`wizard-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <div className="wizard-step-circle">{step > 2 ? "✓" : "2"}</div>
              <div className="wizard-step-label">Run</div>
            </div>
            <div className={`wizard-step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
              <div className="wizard-step-circle">{step > 3 ? "✓" : "3"}</div>
              <div className="wizard-step-label">Import</div>
            </div>
            <div className={`wizard-step ${step === 4 ? 'active' : ''}`}>
              <div className="wizard-step-circle">4</div>
              <div className="wizard-step-label">Finish</div>
            </div>
          </div>

          {/* Step Contents */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {daemonState === 'connected' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px' }}>
                    <span className="status-indicator pulse" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-green)' }}></span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-green)' }}>
                      Local Daemon Connected (v{daemonVersion}) | OS: {daemonPlatform}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                    Sentinel is connected to the endpoint background service. You can trigger a live, zero-friction system diagnostic scan without executing scripts or uploading files.
                  </p>
                  <button 
                    className="cyber-btn cyber-btn-primary" 
                    style={{ textDecoration: 'none', color: '#060913', fontWeight: 'bold', padding: '12px', marginTop: '8px', textAlign: 'center', justifyContent: 'center' }}
                    onClick={triggerScanAndTransit}
                  >
                    <span>Run Telemetry Scan</span>
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button className="cyber-btn" onClick={() => setStep(3)}>Manual Legacy Upload</button>
                  </div>
                </div>
              )}

              {daemonState === 'scanning' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
                  <RefreshCw size={40} className="spin" color="var(--color-cyan)" />
                  <h4 style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--color-cyan)' }}>Harvesting Live Telemetry</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', maxWidth: '400px' }}>
                    Querying local system instrumentation metrics, CPU loads, storage limits, and active software registries. Please stand by...
                  </p>
                </div>
              )}

              {daemonState === 'upgrade-required' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px' }}>
                    <span className="status-indicator pulse" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-orange)' }}></span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-orange)' }}>
                      Daemon Upgrade Required (v{daemonVersion})
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                    The daemon running on your host is outdated. Version v1.0.0 or higher is required to support the V1 live scanning framework.
                  </p>
                  <a 
                    href="/Invoke-EIIPAssessment.ps1" 
                    download="Invoke-EIIPAssessment.ps1"
                    className="cyber-btn cyber-btn-primary"
                    style={{ textDecoration: 'none', color: '#060913', fontWeight: 'bold', padding: '12px', marginTop: '8px', textAlign: 'center' }}
                    onClick={() => setStep(1)}
                  >
                    <span>Download Latest Daemon Pack</span>
                  </a>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    <button className="cyber-btn" onClick={checkDaemonStatus}>Retry Connection</button>
                    <button className="cyber-btn" onClick={() => setStep(3)}>Manual Legacy Upload</button>
                  </div>
                </div>
              )}

              {daemonState === 'error' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px' }}>
                    <span className="status-indicator" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-pink)' }}></span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-pink)' }}>
                      Daemon Error: {daemonError || 'Permission Denied'}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                    The background daemon reported an issue or lacked administrator permissions to query system hardware components.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button 
                      className="cyber-btn cyber-btn-primary" 
                      style={{ flex: 1, color: '#060913', fontWeight: 'bold', padding: '12px' }}
                      onClick={triggerScanAndTransit}
                    >
                      Retry Live Scan
                    </button>
                    <button 
                      className="cyber-btn" 
                      style={{ flex: 1, padding: '12px' }}
                      onClick={checkDaemonStatus}
                    >
                      Reconnect Daemon
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button className="cyber-btn" onClick={() => setStep(3)}>Manual Legacy Upload</button>
                  </div>
                </div>
              )}

              {daemonState === 'disconnected' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span className="status-indicator" style={{ width: '10px', height: '10px', backgroundColor: 'var(--text-muted)' }}></span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      Sentinel Local Collector Offline
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                    To unlock live assessments and bypass script execution & upload procedures, install the **Sentinel background daemon service** on your local endpoint.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                    <button 
                      className="cyber-btn cyber-btn-primary" 
                      style={{ color: '#060913', fontWeight: 'bold', padding: '12px', justifyContent: 'center' }} 
                      onClick={() => setStep(1)}
                    >
                      Download Daemon Installation Pack
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="cyber-btn" 
                        style={{ flex: 1, padding: '10px' }}
                        onClick={checkDaemonStatus}
                      >
                        Retry Connection
                      </button>
                      <button 
                        className="cyber-btn" 
                        style={{ flex: 1, padding: '10px' }}
                        onClick={() => setStep(3)}
                      >
                        Manual Legacy Upload
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-cyan)' }}>Step 1: Download the Assessment Collector</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                To gather the latest evidence from your local system, download the PowerShell collector script or daemon source.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Bundle Contents:</strong>
                <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                  <li>CIM evidence gathering methods (Disks, Memory, CPU, Security)</li>
                  <li>Automatic deduplication & risk rating algorithms</li>
                  <li>Local execution reporting output (Assessment.json)</li>
                </ul>
              </div>
              <a 
                href="/Invoke-EIIPAssessment.ps1" 
                download="Invoke-EIIPAssessment.ps1"
                className="cyber-btn cyber-btn-primary"
                style={{ textDecoration: 'none', color: '#060913', fontWeight: 'bold', padding: '12px', marginTop: '8px', textAlign: 'center' }}
                onClick={() => setStep(2)}
              >
                <span>Download Collector Script</span>
              </a>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button className="cyber-btn" onClick={() => setStep(0)}>Back to Live Mode</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-cyan)' }}>Step 2: Run the Collector on your Host</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                Open an elevated PowerShell session (Run as Administrator) and execute the downloaded script:
              </p>
              <div style={{
                background: 'rgba(2, 4, 10, 0.95)',
                padding: '12px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-cyan)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <span style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>powershell -ExecutionPolicy Bypass -File .\Invoke-EIIPAssessment.ps1</span>
                <button 
                  className="cyber-btn" 
                  style={{ padding: '4px 8px', fontSize: '10px', flexShrink: 0 }}
                  onClick={() => {
                    navigator.clipboard.writeText("powershell -ExecutionPolicy Bypass -File .\\Invoke-EIIPAssessment.ps1");
                  }}
                >
                  Copy
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                This script will run read-only CIM diagnostics. It will generate a file named <code>Assessment.json</code> in the execution folder.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button className="cyber-btn" onClick={() => setStep(1)}>Back</button>
                <button className="cyber-btn cyber-btn-primary" style={{ color: '#060913', fontWeight: 'bold' }} onClick={() => setStep(3)}>Next: Import File</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-cyan)' }}>Step 3: Import the Generated Assessment.json</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                Select or drag-and-drop the generated <code>Assessment.json</code> file below to replace the system assessment state.
              </p>

              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: dragActive ? '2px dashed var(--color-cyan)' : '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: dragActive ? 'rgba(6,182,212,0.03)' : 'rgba(255,255,255,0.01)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <input 
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer'
                  }}
                />
                <Globe size={32} color={dragActive ? "var(--color-cyan)" : "var(--text-muted)"} style={{ marginBottom: '12px', display: 'inline-block' }} />
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {loading ? "Parsing assessment..." : "Drag & Drop Assessment.json here"}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  or click to select file from disk
                </div>
              </div>

              {uploadError && (
                <div style={{ color: 'var(--color-pink)', fontSize: '12px', background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.15)', padding: '10px 14px', borderRadius: '6px' }}>
                  {uploadError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button className="cyber-btn" onClick={() => setStep(0)}>Back to Live Mode</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)',
                border: '2px solid var(--color-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-green)',
                fontSize: '28px',
                marginBottom: '12px'
              }}>
                ✓
              </div>
              <h4 style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--color-green)' }}>Assessment Refreshed Successfully</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', maxWidth: '400px' }}>
                All views, dependency graphs, findings tables, and status meters have been refreshed with the latest telemetry.
              </p>
              <button className="cyber-btn cyber-btn-primary" style={{ color: '#060913', fontWeight: 'bold', marginTop: '12px', padding: '10px 24px' }} onClick={onClose}>
                Finish & View Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Detect Demo Mode
const IS_E2E = typeof window !== 'undefined' && (
  !!window.navigator.webdriver || 
  window.location.search.includes('test=true')
);
const DEMO_MODE = 
  import.meta.env.VITE_DEMO_MODE === 'true' || 
  (typeof window !== 'undefined' && window.location.search.includes('demo=true')) ||
  IS_E2E;

function App() {
  // Navigation & Active Workspace Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'auditor' | 'remediation' | 'forecasting' | 'topology' | 'importer' | 'ai' | 'software' | 'system-status' | 'coming-soon-fleet' | 'coming-soon-correlation' | 'coming-soon-healing' | 'coming-soon-ai-eng' | 'coming-soon-vuln' | 'coming-soon-execution'>('overview');

  // Console logging state & modal control state
  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // --- Toast Notification System ---
  interface Toast {
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    if (type !== 'error') {
      const duration = type === 'success' ? 4000 : type === 'info' ? 5000 : 6000;
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const tabs: Array<'overview' | 'auditor' | 'remediation' | 'software' | 'forecasting' | 'topology' | 'importer' | 'ai' | 'system-status'> = [
          'overview', 'auditor', 'remediation', 'software', 
          'forecasting', 'topology', 'importer', 'ai', 'system-status'
        ];
        const index = parseInt(e.key) - 1;
        if (index < tabs.length) {
          e.preventDefault();
          setActiveTab(tabs[index]);
          showToast(`Switched view to ${tabs[index].replace('coming-soon-', '').replace('-', ' ').toUpperCase()}`, 'info');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToast]);

  // --- Sidebar Enhancements ---
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sentinel-favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set(['overview', 'auditor']);
    } catch {
      return new Set(['overview', 'auditor']);
    }
  });
  const [recentTabs, setRecentTabs] = useState<string[]>([]);

  const toggleFavorite = (tab: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(tab)) {
        next.delete(tab);
        showToast(`Removed ${tab.replace('coming-soon-', '').toUpperCase()} from favorites`, 'info');
      } else {
        next.add(tab);
        showToast(`Added ${tab.replace('coming-soon-', '').toUpperCase()} to favorites`, 'success');
      }
      localStorage.setItem('sentinel-favorites', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  useEffect(() => {
    setRecentTabs(prev => {
      const filtered = prev.filter(t => t !== activeTab);
      return [activeTab, ...filtered].slice(0, 3);
    });
  }, [activeTab]);

  // --- Top Navigation States ---
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    const handleConsoleError = (event: ErrorEvent) => {
      const errorStr = `[Error] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
      setConsoleErrors(prev => [errorStr, ...prev].slice(0, 50));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorStr = `[Unhandled Rejection] ${String(event.reason)}`;
      setConsoleErrors(prev => [errorStr, ...prev].slice(0, 50));
    };

    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorStr = `[console.error] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`;
      setConsoleErrors(prev => [errorStr, ...prev].slice(0, 50));
      originalConsoleError.apply(console, args);
    };

    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      const warnStr = `[console.warn] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`;
      setConsoleErrors(prev => [warnStr, ...prev].slice(0, 50));
      originalConsoleWarn.apply(console, args);
    };

    window.addEventListener('error', handleConsoleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleConsoleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  // Core Data States initialized conditionally
  const [envDataState, setEnvData] = useState<EnvironmentOverview | null>(DEMO_MODE ? MOCK_ENVIRONMENT : null);
  const [findingsData, setFindingsData] = useState<Finding[]>(DEMO_MODE ? MOCK_FINDINGS : []);
  const [healthScoreDataState, setHealthScoreData] = useState<HealthScore | null>(DEMO_MODE ? MOCK_HEALTH_SCORE : null);
  const [riskMatrixData, setRiskMatrixData] = useState<RiskMatrixRow[]>(DEMO_MODE ? MOCK_RISK_MATRIX : []);
  const [capacityForecastDataState, setCapacityForecastData] = useState<CapacityForecast | null>(DEMO_MODE ? MOCK_CAPACITY_FORECAST : null);
  const [rawEvidenceData, setRawEvidenceData] = useState<EvidenceRecord[]>([]);
  const [logLines, setLogLines] = useState<string[]>(DEMO_MODE ? MOCK_LOGS : []);
  const [activeAssessmentSoftware, setActiveAssessmentSoftware] = useState<any[]>(DEMO_MODE ? [] : []);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(DEMO_MODE ? "hist-004" : null);
  // Remediation Checklists
  const [completedRemediations, setCompletedRemediations] = useState<Record<string, boolean>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [assessmentAgeInfo, setAssessmentAgeInfo] = useState<{ text: string; severity: 'green' | 'yellow' | 'red'; isStale: boolean }>({ text: 'N/A', severity: 'red', isStale: true });
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);

  // Ref to track if file upload happened before database seed finishes (E2E race condition fix)
  const hasUploadedRef = useRef(false);

  // Export warning modal control
  const [isExportWarningOpen, setIsExportWarningOpen] = useState(false);

  // Local Collector Daemon Connectivity States
  const [daemonState, setDaemonState] = useState<'connected' | 'disconnected' | 'scanning' | 'error' | 'upgrade-required'>('disconnected');
  const [daemonVersion, setDaemonVersion] = useState<string>('');
  const [daemonPlatform, setDaemonPlatform] = useState<string>('');
  const [daemonError, setDaemonError] = useState<string>('');

  // Polling to discover local daemon status
  useEffect(() => {
    const checkDaemonStatus = async () => {
      try {
        const res = await fetch('http://localhost:1337/api/status');
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setDaemonVersion(data.version || '1.0.0');
            setDaemonPlatform(data.platform || 'windows');
            if (data.version && data.version.startsWith('0.')) {
              setDaemonState('upgrade-required');
            } else {
              setDaemonState('connected');
            }
          } else {
            setDaemonState('disconnected');
          }
        } else {
          setDaemonState('disconnected');
        }
      } catch {
        setDaemonState('disconnected');
      }
    };
    checkDaemonStatus();
    const interval = setInterval(checkDaemonStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const runDaemonScan = async () => {
    setDaemonState('scanning');
    setLogLines(prev => [...prev, '[Info] Connecting to Sentinel Local Collector Daemon...']);
    setLogLines(prev => [...prev, '[Info] Executing local WMI and software registry telemetry harvest...']);

    try {
      const res = await fetch('http://localhost:1337/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentinel-Token': 'sentinel-local-daemon-auth-token-1337-secret'
        }
      });

      if (res.ok) {
        const parsedData = await res.json();
        
        hasUploadedRef.current = true;
        if (parsedData.Machine) setEnvData(parsedData.Machine);
        if (parsedData.Findings) {
          const sanitized = parsedData.Findings.map((f: any) => ({
            FindingId: f.FindingId || '',
            Category: f.Category || '',
            Domain: f.Domain || '',
            Severity: f.Severity || 'Low',
            Confidence: f.Confidence || 'Medium',
            Priority: typeof f.Priority === 'number' ? f.Priority : 5,
            Title: f.Title || '',
            Description: f.Description || '',
            Evidence: Array.isArray(f.Evidence) ? f.Evidence : [],
            Impact: f.Impact || '',
            BusinessRisk: f.BusinessRisk || '',
            RootCauseHypothesis: f.RootCauseHypothesis || '',
            RecommendedRemediation: f.RecommendedRemediation || '',
            EstimatedEffort: f.EstimatedEffort || 'Medium',
            VerificationMethod: f.VerificationMethod || '',
            CreatedOn: f.CreatedOn || new Date().toISOString(),
          }));
          setFindingsData(sanitized);
        }
        if (parsedData.HealthScore) setHealthScoreData(parsedData.HealthScore);
        if (parsedData.RiskMatrix) setRiskMatrixData(parsedData.RiskMatrix);
        if (parsedData.CapacityForecast) setCapacityForecastData(parsedData.CapacityForecast);
        if (parsedData.RawEvidence) setRawEvidenceData(parsedData.RawEvidence);
        if (parsedData.Software) setActiveAssessmentSoftware(parsedData.Software);
        if (parsedData.completedRemediations) setCompletedRemediations(parsedData.completedRemediations);
        else setCompletedRemediations({});
        
        const newId = parsedData.AssessmentId || crypto.randomUUID();
        setActiveAssessmentId(newId);

        await saveAssessment(parsedData);
        const hist = await getHistoricalAssessments();
        setHistoryData(hist);
        
        setLastRefresh(new Date());
        setLogLines(prev => [...prev, `[Info] Successfully harvested live telemetry for ${parsedData.Machine?.ComputerName || 'host'}.`]);
        setDaemonState('connected');
        showToast('Local scan completed successfully!', 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || `HTTP ${res.status}`;
        setDaemonError(errMsg);
        setDaemonState('error');
        setLogLines(prev => [...prev, `[Error] Daemon telemetry scan failed: ${errMsg}`]);
        showToast(`Daemon scan failed: ${errMsg}`, 'error');
        throw new Error(errMsg);
      }
    } catch (err: any) {
      setDaemonError(err.message || 'Connection Refused');
      setDaemonState('error');
      setLogLines(prev => [...prev, `[Error] Failed to communicate with collector daemon: ${err.message || 'Connection Refused'}`]);
      showToast('Collector daemon connection error', 'error');
      throw err;
    }
  };

  const checkDaemonStatusManual = async () => {
    try {
      const res = await fetch('http://localhost:1337/api/status');
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          setDaemonVersion(data.version || '1.0.0');
          setDaemonPlatform(data.platform || 'windows');
          if (data.version && data.version.startsWith('0.')) {
            setDaemonState('upgrade-required');
          } else {
            setDaemonState('connected');
          }
          showToast('Local collector daemon connected!', 'success');
        } else {
          setDaemonState('disconnected');
          showToast('Local collector daemon is offline.', 'warning');
        }
      } else {
        setDaemonState('disconnected');
        showToast('Local collector daemon connection failed.', 'error');
      }
    } catch {
      setDaemonState('disconnected');
      showToast('Local collector daemon not detected.', 'error');
    }
  };

  // Non-nullable convenience variables for JSX rendering to satisfy strict null checks
  const envData = envDataState || MOCK_ENVIRONMENT;
  const capacityForecastData = capacityForecastDataState || MOCK_CAPACITY_FORECAST;

  // Recalculate health score based on completed remediations dynamically
  const healthScoreData = useMemo(() => {
    const base = healthScoreDataState || MOCK_HEALTH_SCORE;
    if (!base) return MOCK_HEALTH_SCORE;

    const completedCount = Object.values(completedRemediations).filter(Boolean).length;
    if (completedCount === 0) {
      return base;
    }

    let performance = base.PerformanceScore;
    let security = base.SecurityScore;
    let reliability = base.ReliabilityScore;
    let scalability = base.ScalabilityScore;
    let serviceability = base.ServiceabilityScore;
    let usability = base.UsabilityScore;

    Object.entries(completedRemediations).forEach(([findingId, completed]) => {
      if (!completed) return;
      const finding = findingsData.find(f => f.FindingId === findingId);
      if (!finding) return;

      const delta = finding.Severity === 'Critical' ? 15 
                  : finding.Severity === 'High' ? 10 
                  : finding.Severity === 'Medium' ? 5 
                  : finding.Severity === 'Low' ? 2 : 0;

      const domain = finding.Domain.toLowerCase();
      if (domain === 'performance') performance = Math.min(100, performance + delta);
      else if (domain === 'security') security = Math.min(100, security + delta);
      else if (domain === 'reliability') reliability = Math.min(100, reliability + delta);
      else if (domain === 'scalability') scalability = Math.min(100, scalability + delta);
      else if (domain === 'serviceability') serviceability = Math.min(100, serviceability + delta);
      else if (domain === 'usability') usability = Math.min(100, usability + delta);
    });

    const overall = performance * 0.20 + security * 0.25 + reliability * 0.20 + scalability * 0.15 + serviceability * 0.10 + usability * 0.10;

    return {
      Formula: base.Formula,
      OverallHealthScore: Math.round(overall * 100) / 100,
      PerformanceScore: Math.round(performance * 100) / 100,
      SecurityScore: Math.round(security * 100) / 100,
      ReliabilityScore: Math.round(reliability * 100) / 100,
      ScalabilityScore: Math.round(scalability * 100) / 100,
      ServiceabilityScore: Math.round(serviceability * 100) / 100,
      UsabilityScore: Math.round(usability * 100) / 100
    };
  }, [healthScoreDataState, completedRemediations, findingsData]);

  useEffect(() => {
    const updateAge = () => {
      if (!envDataState || !envDataState.CollectionTimestamp) {
        setAssessmentAgeInfo({ text: 'N/A', severity: 'red', isStale: true });
        return;
      }
      const timestamp = envDataState.CollectionTimestamp;
      const diffMs = Math.max(0, new Date().getTime() - new Date(timestamp).getTime());
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;
      
      let text: string;
      let severity: 'green' | 'yellow' | 'red' = 'green';
      let isStale = false;
      
      if (diffHours < 1) {
        const mins = Math.max(0, Math.round(diffMs / (1000 * 60)));
        text = mins === 0 ? 'Just now' : `${mins} minute${mins > 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        const hrs = Math.round(diffHours);
        text = `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        const days = Math.round(diffDays);
        text = `${days} day${days > 1 ? 's' : ''} ago`;
        severity = 'yellow';
        isStale = true;
      } else {
        const days = Math.round(diffDays);
        text = `${days} day${days > 1 ? 's' : ''} ago`;
        severity = 'red';
        isStale = true;
      }
      
      setAssessmentAgeInfo({ text, severity, isStale });
    };

    updateAge();
    const interval = setInterval(updateAge, 30000); // update every 30 seconds
    return () => clearInterval(interval);
  }, [envDataState]);
  
  // Historical trends data
  const [historyData, setHistoryData] = useState<HistoricalAssessment[]>(DEMO_MODE ? MOCK_HISTORY : []);
  const [hoveredHistoryPoint, setHoveredHistoryPoint] = useState<{
    run: HistoricalAssessment;
    x: number;
    y: number;
  } | null>(null);

  // Helper to safely extract dynamic evidence records by source and name
  const getEvidenceValue = useCallback((source: string, name: string): unknown => {
    if (!rawEvidenceData || rawEvidenceData.length === 0) return null;
    const record = rawEvidenceData.find(e => e.Source === source && e.Name === name);
    return record ? record.Value : null;
  }, [rawEvidenceData]);

  // Node Graph Custom Positions State
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [activeDraggedNode, setActiveDraggedNode] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('machine');

  // Findings auditor filters
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);

  // Capacity Forecast chart hover state
  const [hoveredPoint, setHoveredPoint] = useState<{
    metric: string;
    day: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // Log viewer upload and filters
  const [logInput, setLogInput] = useState<string>('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');

  // AI Chat Guardian States
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'sentinel'; text: string; timestamp: string }>>([
    {
      sender: 'sentinel',
      text: 'Greetings Commander. Sentinel AI Core online. I have analyzed your system diagnostics and constructed the infrastructure knowledge graph.\n\nType `/help` to see quick shortcut commands or ask me details about any health score or finding.',
      timestamp: '15:00:00'
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);



  // Load assessments from IndexedDB on startup and seed if empty
  useEffect(() => {
    const seedDatabase = async () => {
      try {
        const hist = await getHistoricalAssessments();
        if (hasUploadedRef.current) return;

        if (hist.length > 0) {
          setHistoryData(hist);
          
          // Load the latest assessment to active view
          const latestId = hist[hist.length - 1].AssessmentId;
          const data = await loadAssessmentDetails(latestId);
          if (data && !hasUploadedRef.current) {
            setActiveAssessmentId(latestId);
            if (data.Machine) setEnvData(data.Machine);
            if (data.Findings) setFindingsData(data.Findings);
            if (data.HealthScore) setHealthScoreData(data.HealthScore);
            if (data.RiskMatrix) setRiskMatrixData(data.RiskMatrix);
            if (data.CapacityForecast) setCapacityForecastData(data.CapacityForecast);
            if (data.RawEvidence) setRawEvidenceData(data.RawEvidence);
            if (data.Software) setActiveAssessmentSoftware(data.Software);
            if (data.completedRemediations) setCompletedRemediations(data.completedRemediations);
            else setCompletedRemediations({});
          }
        } else if (DEMO_MODE) {
          // Database is empty. Seed it with the 4 historical runs ONLY when DEMO_MODE is true
          const seedHistory = [
            {
              AssessmentId: "hist-001",
              Machine: { ...MOCK_ENVIRONMENT, ComputerName: "SENTINEL-SRV01", CollectionTimestamp: "2026-05-15T10:00:00.000Z", OSName: "Microsoft Windows Server 2022 Datacenter" },
              Findings: [],
              HealthScore: { ...MOCK_HEALTH_SCORE, OverallHealthScore: 62.5, PerformanceScore: 75.0, SecurityScore: 50.0, ReliabilityScore: 60.0, ScalabilityScore: 70.0, ServiceabilityScore: 80.0, UsabilityScore: 40.0 },
              RiskMatrix: [],
              CapacityForecast: MOCK_CAPACITY_FORECAST,
              RawEvidence: []
            },
            {
              AssessmentId: "hist-002",
              Machine: { ...MOCK_ENVIRONMENT, ComputerName: "SENTINEL-SRV01", CollectionTimestamp: "2026-05-22T11:15:00.000Z", OSName: "Microsoft Windows Server 2022 Datacenter" },
              Findings: [],
              HealthScore: { ...MOCK_HEALTH_SCORE, OverallHealthScore: 66.8, PerformanceScore: 80.0, SecurityScore: 55.0, ReliabilityScore: 68.0, ScalabilityScore: 75.0, ServiceabilityScore: 82.0, UsabilityScore: 45.0 },
              RiskMatrix: [],
              CapacityForecast: MOCK_CAPACITY_FORECAST,
              RawEvidence: []
            },
            {
              AssessmentId: "hist-003",
              Machine: { ...MOCK_ENVIRONMENT, ComputerName: "SENTINEL-SRV01", CollectionTimestamp: "2026-05-29T09:30:00.000Z", OSName: "Microsoft Windows Server 2022 Datacenter" },
              Findings: [],
              HealthScore: { ...MOCK_HEALTH_SCORE, OverallHealthScore: 70.4, PerformanceScore: 85.0, SecurityScore: 58.0, ReliabilityScore: 72.0, ScalabilityScore: 80.0, ServiceabilityScore: 88.0, UsabilityScore: 50.0 },
              RiskMatrix: [],
              CapacityForecast: MOCK_CAPACITY_FORECAST,
              RawEvidence: []
            },
            {
              AssessmentId: "hist-004", // This matches the active view mock details
              Machine: MOCK_ENVIRONMENT,
              Findings: MOCK_FINDINGS,
              HealthScore: MOCK_HEALTH_SCORE,
              RiskMatrix: MOCK_RISK_MATRIX,
              CapacityForecast: MOCK_CAPACITY_FORECAST,
              RawEvidence: []
            }
          ];

          for (const item of seedHistory) {
            await saveAssessment(item);
          }
          
          if (hasUploadedRef.current) return;
          const freshHist = await getHistoricalAssessments();
          setHistoryData(freshHist);

          // Load latest seeded
          const latestId = freshHist[freshHist.length - 1].AssessmentId;
          const data = await loadAssessmentDetails(latestId);
          if (data && !hasUploadedRef.current) {
            setActiveAssessmentId(latestId);
            if (data.Machine) setEnvData(data.Machine);
            if (data.Findings) setFindingsData(data.Findings);
            if (data.HealthScore) setHealthScoreData(data.HealthScore);
            if (data.RiskMatrix) setRiskMatrixData(data.RiskMatrix);
            if (data.CapacityForecast) setCapacityForecastData(data.CapacityForecast);
            if (data.RawEvidence) setRawEvidenceData(data.RawEvidence);
            if (data.Software) setActiveAssessmentSoftware(data.Software);
            if (data.completedRemediations) setCompletedRemediations(data.completedRemediations);
            else setCompletedRemediations({});
          }
        }
      } catch (err) {
        console.error("IndexedDB seeding error:", err);
      }
    };
    
    seedDatabase();
  }, []);

  // Build visual topology nodes derived from data and current dragged positions
  const nodes = React.useMemo<GraphNode[]>(() => {
    if (!envData) return [];

    const baseNodes: GraphNode[] = [
      { 
        id: 'machine', 
        label: envData.ComputerName, 
        type: 'machine', 
        status: findingsData.some(f => f.Severity === 'Critical') ? 'error' : findingsData.some(f => f.Severity === 'High' || f.Severity === 'Medium') ? 'warn' : 'normal',
        x: 250, 
        y: 250, 
        details: { 
          'Hostname': envData.ComputerName, 
          'Manufacturer': envData.Manufacturer, 
          'Model': envData.Model,
          'PowerShell': envData.PowerShellVersion,
          'Elevation': envData.IsElevated ? 'Elevated (Admin)' : 'Restricted'
        } 
      },
      { 
        id: 'os', 
        label: envData.OSName ? (envData.OSName.split(' ')[1] + ' ' + (envData.OSName.match(/Server\s\d+/)?.[0] || '10/11')) : 'Windows OS', 
        type: 'os', 
        status: findingsData.some(f => f.Domain === 'Security' && f.Severity === 'High') ? 'warn' : 'normal',
        x: 250, 
        y: 130, 
        details: { 
          'OS Name': envData.OSName, 
          'OS Version': envData.OSVersion, 
          'OS Build': envData.OSBuild,
          'Last Boot Time': envData.LastBootTime 
        } 
      },
      { 
        id: 'cpu', 
        label: 'Compute CPU', 
        type: 'hardware', 
        status: findingsData.some(f => f.FindingId === 'SCALE-CPU-ARCH-001') ? 'warn' : 'normal',
        x: 100, 
        y: 170, 
        details: { 
          'Processor Name': String(getEvidenceValue('CPU', 'ProcessorName') || 'Intel Core x86/x64'),
          'Cores Count': getEvidenceValue('CPU', 'NumberOfCores') ? `${String(getEvidenceValue('CPU', 'NumberOfCores'))} Cores` : '4 Cores',
          'Logical Processors': getEvidenceValue('CPU', 'NumberOfLogicalProcessors') ? `${String(getEvidenceValue('CPU', 'NumberOfLogicalProcessors'))} Logical` : 'x64 Logical Processor',
          'Max Clock Speed': getEvidenceValue('CPU', 'MaxClockSpeedMHz') ? `${(Number(getEvidenceValue('CPU', 'MaxClockSpeedMHz')) / 1000).toFixed(2)} GHz` : '2.5 GHz'
        } 
      },
      { 
        id: 'disk_c', 
        label: 'Disk C:', 
        type: 'storage', 
        status: findingsData.some(f => f.FindingId === 'PERF-DISKFREE-C') ? 'error' : 'normal',
        x: 100, 
        y: 330, 
        details: (() => {
          const logicalDisks = getEvidenceValue('Disk', 'LogicalDisks') as Array<Record<string, unknown>> | null;
          const cDrive = Array.isArray(logicalDisks) ? logicalDisks.find(d => d['DeviceID'] === 'C:') : null;
          if (cDrive) {
            const sizeGB = Math.round(Number(cDrive['Size']) / (1024 * 1024 * 1024));
            const freeGB = Math.round(Number(cDrive['FreeSpace']) / (1024 * 1024 * 1024));
            const freePct = Math.round((Number(cDrive['FreeSpace']) / Number(cDrive['Size'])) * 1000) / 10;
            return {
              'Device': 'C:',
              'Volume Size': `${sizeGB} GB`,
              'Free Space': `${freeGB} GB (${freePct}%)`,
              'Status': freePct < 15 ? 'Low Space' : 'Healthy'
            };
          }
          return { 
            'Device': 'C:',
            'Storage Status': findingsData.some(f => f.FindingId === 'PERF-DISKFREE-C') ? 'Low Space' : 'Healthy',
            'Capacity Note': capacityForecastData?.Storage?.Note || 'Exhaustion forecast: 95 Days'
          };
        })()
      },
      { 
        id: 'svc_spooler', 
        label: 'Print Spooler', 
        type: 'service', 
        status: findingsData.some(f => f.Evidence && f.Evidence.some(e => e.Value && JSON.stringify(e.Value).includes('Spooler'))) ? 'error' : 'normal',
        x: 400, 
        y: 110, 
        details: (() => {
          const allServices = getEvidenceValue('Service', 'AllServices') as Array<Record<string, unknown>> | null;
          const spooler = Array.isArray(allServices) ? allServices.find(s => s['Name'] === 'Spooler') : null;
          if (spooler) {
            return {
              'Name': 'Spooler',
              'Display Name': 'Print Spooler',
              'Status': String(spooler['Status'] || 'Stopped'),
              'Start Type': String(spooler['StartType'] || 'Automatic'),
              'Domain': 'Reliability'
            };
          }
          return {
            'Name': 'Spooler',
            'Display Name': 'Print Spooler',
            'Config Status': 'Stopped (Expected Automatic)',
            'Domain': 'Reliability'
          };
        })()
      },
      { 
        id: 'svc_wbiosrvc', 
        label: 'WbioSrvc Service', 
        type: 'service', 
        status: findingsData.some(f => f.Evidence && f.Evidence.some(e => e.Value && JSON.stringify(e.Value).includes('WbioSrvc'))) ? 'error' : 'normal',
        x: 400, 
        y: 180, 
        details: (() => {
          const allServices = getEvidenceValue('Service', 'AllServices') as Array<Record<string, unknown>> | null;
          const wbio = Array.isArray(allServices) ? allServices.find(s => s['Name'] === 'WbioSrvc') : null;
          if (wbio) {
            return {
              'Name': 'WbioSrvc',
              'Display Name': 'Windows Biometric Service',
              'Status': String(wbio['Status'] || 'Stopped'),
              'Start Type': String(wbio['StartType'] || 'Automatic'),
              'Domain': 'Reliability'
            };
          }
          return {
            'Name': 'WbioSrvc',
            'Display Name': 'Windows Biometric Service',
            'Config Status': 'Stopped (Expected Automatic)',
            'Domain': 'Reliability'
          };
        })()
      },
      { 
        id: 'firewall', 
        label: 'Firewall Profiles', 
        type: 'security', 
        status: findingsData.some(f => f.FindingId === 'SEC-FW-001') ? 'error' : 'normal',
        x: 400, 
        y: 270, 
        details: (() => {
          const fwProfiles = getEvidenceValue('Security', 'FirewallProfiles') as Array<Record<string, unknown>> | null;
          if (Array.isArray(fwProfiles)) {
            const domainProfile = fwProfiles.find(p => p['Name'] === 'Domain' || p['Profile'] === 'Domain');
            const privateProfile = fwProfiles.find(p => p['Name'] === 'Private' || p['Profile'] === 'Private');
            const publicProfile = fwProfiles.find(p => p['Name'] === 'Public' || p['Profile'] === 'Public');
            return {
              'Domain Profile': domainProfile ? (domainProfile['Enabled'] ? 'Enabled' : 'Disabled') : 'Unknown',
              'Private Profile': privateProfile ? (privateProfile['Enabled'] ? 'Enabled' : 'Disabled') : 'Unknown',
              'Public Profile': publicProfile ? (publicProfile['Enabled'] ? 'Enabled' : 'Disabled') : 'Unknown',
              'Recommendation': 'Re-enable and audit exceptions'
            };
          }
          return {
            'Status': 'Public Profile Disabled',
            'Recommendation': 'Re-enable and audit exceptions'
          };
        })()
      },
      { 
        id: 'defender', 
        label: 'Defender Status', 
        type: 'security', 
        status: findingsData.some(f => f.FindingId === 'SEC-DEF-001') ? 'error' : 'normal',
        x: 400, 
        y: 350, 
        details: (() => {
          const defender = getEvidenceValue('Security', 'DefenderStatus') as Record<string, unknown> | null;
          if (defender) {
            return {
              'Antivirus Enabled': defender['AntivirusEnabled'] ? 'True' : 'False',
              'Realtime Protection': defender['RealTimeProtectionEnabled'] ? 'Enabled' : 'Disabled',
              'Spyware Enabled': defender['AntispywareEnabled'] ? 'True' : 'False',
              'Signature Version': String(defender['AntivirusSignatureVersion'] || 'Unknown')
            };
          }
          return {
            'Realtime Protection': 'Disabled',
            'Active Scan State': 'Passive Mode / Overlap'
          };
        })()
      },
      { 
        id: 'local_admins', 
        label: 'Local Administrators', 
        type: 'user', 
        status: findingsData.some(f => f.FindingId === 'SEC-LADM-001') ? 'warn' : 'normal',
        x: 250, 
        y: 370, 
        details: (() => {
          const admins = getEvidenceValue('Security', 'LocalAdministrators') as Array<Record<string, unknown>> | null;
          if (Array.isArray(admins)) {
            const names = admins.map(m => String(m['Name'] || m['ObjectClass'] || m['PrincipalSource'] || '')).join(', ');
            return {
              'Group Membership': `${admins.length} accounts`,
              'Members': names.length > 50 ? names.substring(0, 47) + '...' : names,
              'Security Posture': admins.length > 3 ? 'Privilege sprawl vulnerability' : 'Healthy baseline'
            };
          }
          return {
            'Group Membership': '4 users (recommended max 3)',
            'Security Posture': 'Privilege sprawl vulnerability'
          };
        })()
      },
      {
        id: 'software_catalog',
        label: 'Software Catalog',
        type: 'software',
        status: 'normal',
        x: 250,
        y: 30,
        details: {
          'Catalog Size': '15 Normalized Packages',
          'Ecosystems': 'Winget, Chocolatey, Scoop, WSL, Docker, pip, npm',
          'EOL Packages': '3 Detected',
          'Active CVEs': '3 Active Advisories'
        }
      },
      {
        id: 'pkg_python',
        label: 'Python Package',
        type: 'software',
        status: 'warn',
        x: 130,
        y: 40,
        details: {
          'Name': 'Python',
          'Publisher': 'Python Software Foundation',
          'Primary Source': 'Winget / WSL / Docker',
          'Version': '3.11.4',
          'Latest': '3.13.0',
          'Risk': 'CVE-2023-27043 (High)'
        }
      },
      {
        id: 'pkg_node',
        label: 'Node.js Package',
        type: 'software',
        status: 'normal',
        x: 190,
        y: 50,
        details: {
          'Name': 'Node.js',
          'Publisher': 'OpenJS Foundation',
          'Source': 'Winget / WSL',
          'Version': '20.5.0',
          'Latest': '22.2.0'
        }
      },
      {
        id: 'pkg_git',
        label: 'Git Package',
        type: 'software',
        status: 'warn',
        x: 310,
        y: 50,
        details: {
          'Name': 'Git',
          'Publisher': 'Software Freedom Conservancy',
          'Source': 'Winget / Scoop / WSL',
          'Version': '2.41.0',
          'Latest': '2.43.0',
          'Risk': 'CVE-2023-29007 (High)'
        }
      },
      {
        id: 'pkg_nginx',
        label: 'Nginx Package',
        type: 'software',
        status: 'error',
        x: 370,
        y: 40,
        details: {
          'Name': 'Nginx',
          'Publisher': 'F5 Inc.',
          'Source': 'Docker / WSL',
          'Version': '1.22.1',
          'Latest': '1.25.3',
          'Risk': 'CVE-2023-44487 (Critical)'
        }
      },
      {
        id: 'pkg_poetry',
        label: 'Poetry (Python)',
        type: 'software',
        status: 'normal',
        x: 90,
        y: 80,
        details: {
          'Name': 'Poetry',
          'Installed': '1.5.1',
          'Depends On': 'Python'
        }
      },
      {
        id: 'pkg_jupyter',
        label: 'JupyterLab (Python)',
        type: 'software',
        status: 'normal',
        x: 170,
        y: 80,
        details: {
          'Name': 'JupyterLab',
          'Installed': '3.6.3',
          'Depends On': 'Python'
        }
      }
    ];

    return baseNodes.map(n => ({
      ...n,
      x: nodePositions[n.id]?.x ?? n.x,
      y: nodePositions[n.id]?.y ?? n.y
    }));
  }, [envData, findingsData, capacityForecastData, getEvidenceValue, nodePositions]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Dragging in interactive SVG topology graph
  const handleMouseDown = (nodeId: string) => {
    setActiveDraggedNode(nodeId);
    setSelectedNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!activeDraggedNode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Keep coordinates within visual bounds
    const boundedX = Math.max(20, Math.min(480, x));
    const boundedY = Math.max(20, Math.min(430, y));

    setNodePositions(prev => ({
      ...prev,
      [activeDraggedNode]: { x: boundedX, y: boundedY }
    }));
  };

  const handleMouseUp = () => {
    setActiveDraggedNode(null);
  };

  // Node connections map
  const graphLinks = [
    { source: 'machine', target: 'os', rel: 'HOSTS' },
    { source: 'machine', target: 'cpu', rel: 'HAS_HARDWARE' },
    { source: 'machine', target: 'disk_c', rel: 'HAS_STORAGE' },
    { source: 'os', target: 'svc_spooler', rel: 'RUNS' },
    { source: 'os', target: 'svc_wbiosrvc', rel: 'RUNS' },
    { source: 'os', target: 'firewall', rel: 'MANAGES' },
    { source: 'os', target: 'defender', rel: 'MANAGES' },
    { source: 'os', target: 'local_admins', rel: 'HAS_GROUP' },
    { source: 'machine', target: 'software_catalog', rel: 'INVENTORIES' },
    { source: 'software_catalog', target: 'pkg_python', rel: 'CONTAINS' },
    { source: 'software_catalog', target: 'pkg_node', rel: 'CONTAINS' },
    { source: 'software_catalog', target: 'pkg_git', rel: 'CONTAINS' },
    { source: 'software_catalog', target: 'pkg_nginx', rel: 'CONTAINS' },
    { source: 'pkg_poetry', target: 'pkg_python', rel: 'DEPENDS_ON' },
    { source: 'pkg_jupyter', target: 'pkg_python', rel: 'DEPENDS_ON' }
  ];

  // Helper colors mapping for score indicators
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'var(--color-green)';
    if (score >= 70) return 'var(--color-orange)';
    return 'var(--color-pink)';
  };

  // Render a mini circular gauge/ring
  const renderRadialGauge = (score: number, label: string) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const color = getScoreColor(score);

    return (
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={radius} fill="transparent" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="6" />
            <circle cx="40" cy="40" r={radius} fill="transparent" stroke={color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{score}</span>
          </div>
        </div>
        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
    );
  };

  // Save separate components of an assessment to IndexedDB
  const updateAndSavePart = async (key: string, value: any) => {
    hasUploadedRef.current = true;
    let consolidated: any = null;
    let currentId = activeAssessmentId;
    if (currentId) {
      consolidated = await loadAssessmentDetails(currentId);
    }
    if (!consolidated) {
      currentId = crypto.randomUUID();
      consolidated = {
        AssessmentId: currentId,
        Machine: envDataState || MOCK_ENVIRONMENT,
        Findings: findingsData || MOCK_FINDINGS,
        HealthScore: healthScoreDataState || MOCK_HEALTH_SCORE,
        RiskMatrix: riskMatrixData || MOCK_RISK_MATRIX,
        CapacityForecast: capacityForecastDataState || MOCK_CAPACITY_FORECAST,
        RawEvidence: rawEvidenceData || [],
        Software: activeAssessmentSoftware || [],
        completedRemediations: completedRemediations || {}
      };
    }

    if (key === 'Machine') consolidated.Machine = value;
    else if (key === 'Findings') consolidated.Findings = value;
    else if (key === 'HealthScore') consolidated.HealthScore = value;
    else if (key === 'RiskMatrix') consolidated.RiskMatrix = value;
    else if (key === 'CapacityForecast') consolidated.CapacityForecast = value;
    else if (key === 'RawEvidence') consolidated.RawEvidence = value;
    else if (key === 'Software') consolidated.Software = value;

    const savedId = await saveAssessment(consolidated);
    if (!activeAssessmentId || activeAssessmentId !== savedId) {
      setActiveAssessmentId(savedId);
    }
    const hist = await getHistoricalAssessments();
    setHistoryData(hist);
  };

  // Parsing JSON/Log reports upload
  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const name = file.name.toLowerCase();

          if (name.endsWith('.log')) {
            const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            setLogLines(lines);
            setLogLines(prev => [...prev, `[Info] Loaded execution log file "${file.name}" (${lines.length} lines).`]);
            return;
          }

          const parsed = JSON.parse(content);
          
          // Unified V1 Assessment.json check
          if (parsed && parsed.AssessmentId) {
            hasUploadedRef.current = true;
            if (parsed.Machine) setEnvData(parsed.Machine);
            if (parsed.Findings) {
              const sanitized = parsed.Findings.map((f: any) => ({
                FindingId: f.FindingId || '',
                Category: f.Category || '',
                Domain: f.Domain || '',
                Severity: f.Severity || 'Low',
                Confidence: f.Confidence || 'Medium',
                Priority: typeof f.Priority === 'number' ? f.Priority : 5,
                Title: f.Title || '',
                Description: f.Description || '',
                Evidence: Array.isArray(f.Evidence) ? f.Evidence : [],
                Impact: f.Impact || '',
                BusinessRisk: f.BusinessRisk || '',
                RootCauseHypothesis: f.RootCauseHypothesis || '',
                RecommendedRemediation: f.RecommendedRemediation || '',
                EstimatedEffort: f.EstimatedEffort || 'Medium',
                VerificationMethod: f.VerificationMethod || '',
                CreatedOn: f.CreatedOn || new Date().toISOString(),
              }));
              setFindingsData(sanitized);
            }
            if (parsed.HealthScore) setHealthScoreData(parsed.HealthScore);
            if (parsed.RiskMatrix) setRiskMatrixData(parsed.RiskMatrix);
            if (parsed.CapacityForecast) setCapacityForecastData(parsed.CapacityForecast);
            if (parsed.RawEvidence) setRawEvidenceData(parsed.RawEvidence);
            if (parsed.Software) setActiveAssessmentSoftware(parsed.Software);
            if (parsed.AssessmentId) setActiveAssessmentId(parsed.AssessmentId);
            if (parsed.completedRemediations) setCompletedRemediations(parsed.completedRemediations);
            else setCompletedRemediations({});

            saveAssessment(parsed).then(() => {
              getHistoricalAssessments().then(hist => {
                setHistoryData(hist);
              });
            });

            setLogLines(prev => [...prev, `[Info] Imported unified Assessment.json for ${parsed.Machine?.ComputerName || 'machine'} and saved to local IndexedDB.`]);
            return;
          }

          // Separate component uploads
          if (name.includes('environmentoverview') || (parsed && parsed.PlatformFamily && parsed.ComputerName)) {
            setEnvData(parsed);
            updateAndSavePart('Machine', parsed);
            setLogLines(prev => [...prev, `[Info] Loaded and updated environment details for ${parsed.ComputerName}.`]);
          } else if (name.includes('findings') || (Array.isArray(parsed) && parsed.length > 0 && 'FindingId' in parsed[0])) {
            const sanitized = (parsed as Partial<Finding>[]).map((f) => ({
              FindingId: f.FindingId || '',
              Category: f.Category || '',
              Domain: f.Domain || '',
              Severity: f.Severity || 'Low',
              Confidence: f.Confidence || 'Medium',
              Priority: typeof f.Priority === 'number' ? f.Priority : 5,
              Title: f.Title || '',
              Description: f.Description || '',
              Evidence: Array.isArray(f.Evidence) ? f.Evidence : [],
              Impact: f.Impact || '',
              BusinessRisk: f.BusinessRisk || '',
              RootCauseHypothesis: f.RootCauseHypothesis || '',
              RecommendedRemediation: f.RecommendedRemediation || '',
              EstimatedEffort: f.EstimatedEffort || 'Medium',
              VerificationMethod: f.VerificationMethod || '',
              CreatedOn: f.CreatedOn || new Date().toISOString(),
            }));
            setFindingsData(sanitized);
            updateAndSavePart('Findings', sanitized);
            setLogLines(prev => [...prev, `[Info] Loaded and parsed ${parsed.length} health findings.`]);
          } else if (name.includes('healthscore') || (parsed && parsed.OverallHealthScore !== undefined)) {
            setHealthScoreData(parsed);
            updateAndSavePart('HealthScore', parsed);
            setLogLines(prev => [...prev, `[Info] Loaded and updated system health index scores: Overall = ${parsed.OverallHealthScore}.`]);
          } else if (name.includes('riskmatrix') || (Array.isArray(parsed) && parsed.length > 0 && 'TechnicalImpact' in parsed[0])) {
            setRiskMatrixData(parsed);
            updateAndSavePart('RiskMatrix', parsed);
            setLogLines(prev => [...prev, `[Info] Loaded and parsed Risk Matrix entries.`]);
          } else if (name.includes('capacityforecast') || (parsed && parsed.Storage && parsed.Memory)) {
            setCapacityForecastData(parsed);
            updateAndSavePart('CapacityForecast', parsed);
            setLogLines(prev => [...prev, `[Info] Loaded and updated Capacity Forecasting indices.`]);
          } else if (name.includes('rawevidence') || (Array.isArray(parsed) && parsed.length > 0 && 'Source' in parsed[0] && 'ValidationState' in parsed[0])) {
            setRawEvidenceData(parsed);
            updateAndSavePart('RawEvidence', parsed);
            setLogLines(prev => [...prev, `[Info] Loaded and parsed ${parsed.length} raw evidence records.`]);
          } else if (name.includes('sentinelhistory') || (Array.isArray(parsed) && parsed.length > 0 && 'OverallHealth' in parsed[0])) {
            setHistoryData(parsed);
            setLogLines(prev => [...prev, `[Info] Loaded historical assessments log (${parsed.length} runs).`]);
          } else {
            setLogLines(prev => [...prev, `[Error] Unrecognized JSON schema structure in file "${file.name}".`]);
          }
        } catch {
          setLogLines(prev => [...prev, `[Error] Failed to parse file "${file.name}": Invalid format.`]);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportPackage = async () => {
    if (!envDataState || !healthScoreDataState) {
      setLogLines(prev => [...prev, `[Error] Cannot export package: No active assessment data loaded.`]);
      return;
    }
    try {
      setLogLines(prev => [...prev, `[Info] Generating AI Review Package zip archive...`]);
      const zip = new JSZip();
      
      const consolidatedAssessment = {
        AssessmentId: envData.ComputerName + "_" + new Date(envData.CollectionTimestamp).getTime(),
        Machine: envData,
        Assets: [
          {
            DeviceID: "C:",
            Size: 133682135040,
            FreeSpace: 15239921664,
            DriveType: 3
          }
        ],
        Software: findingsData.filter(f => f.Domain === 'Software').map(f => ({ Name: f.Title })),
        Services: [],
        Security: findingsData.filter(f => f.Domain === 'Security'),
        Reliability: findingsData.filter(f => f.Domain === 'Reliability'),
        RawEvidence: rawEvidenceData,
        Findings: findingsData,
        HealthScore: healthScoreData,
        RiskMatrix: riskMatrixData,
        CapacityForecast: capacityForecastData
      };
      
      zip.file("Assessment.json", JSON.stringify(consolidatedAssessment, null, 2));
      
      const assetsData = [
        { Name: "CPU", Details: "Intel Core / VMware CPU" },
        { Name: "Memory", Details: "16 GB RAM" },
        { Name: "Storage", Details: "C: drive (124.5 GB total, 14.2 GB free)" }
      ];
      zip.file("Assets.json", JSON.stringify(assetsData, null, 2));
      
      const softwareCatalog = [
        { Name: "Python", Version: "3.11.4", Risk: "High (CVE-2023-27043)" },
        { Name: "Node.js", Version: "20.5.0", Risk: "None" },
        { Name: "Git", Version: "2.41.0", Risk: "High (CVE-2023-29007)" },
        { Name: "Nginx", Version: "1.22.1", Risk: "Critical (CVE-2023-44487)" }
      ];
      zip.file("SoftwareCatalog.json", JSON.stringify(softwareCatalog, null, 2));
      
      const graphData = {
        nodes: nodes.map(n => ({ id: n.id, label: n.label, type: n.type, status: n.status })),
        links: graphLinks
      };
      zip.file("DependencyGraph.json", JSON.stringify(graphData, null, 2));
      
      const summaryMd = `# Assessment Summary: ${envData.ComputerName}\n\n` +
        `Generated: ${new Date().toLocaleString()}\n` +
        `Overall Health Score: ${healthScoreData.OverallHealthScore}/100\n` +
        `Findings Count: ${findingsData.length}\n\n` +
        `## Prioritized Findings\n` +
        findingsData.map(f => `- [${f.Severity}] ${f.Title}: ${f.Description}`).join("\n");
      zip.file("AssessmentSummary.md", summaryMd);
      
      const execSummaryMd = `# Executive Summary - Infrastructure Review\n\n` +
        `Host: ${envData.ComputerName}\n` +
        `Operating System: ${envData.OSName}\n\n` +
        `## Key Recommendations\n` +
        findingsData.map(f => `1. **${f.Title}**: ${f.RecommendedRemediation}`).join("\n");
      zip.file("ExecutiveSummary.md", execSummaryMd);
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MachineReviewPackage.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setLogLines(prev => [...prev, `[Info] Successfully generated and exported "MachineReviewPackage.zip".`]);
    } catch (err) {
      console.error("ZIP Generation failed:", err);
      setLogLines(prev => [...prev, `[Error] ZIP Generation failed.`]);
    }
  };

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const handleCopyPrompt = () => {
    if (!envDataState || !healthScoreDataState) {
      return;
    }
    const findingsList = findingsData.map(f => `- [${f.Severity}] ${f.Title} (${f.Domain}): ${f.Description} (Remediation: ${f.RecommendedRemediation})`).join('\n');
    const capacityInfo = `Storage: ${capacityForecastData?.Storage?.Note || 'N/A'}\nMemory: ${capacityForecastData?.Memory?.Note || 'N/A'}\nCPU: ${capacityForecastData?.CPU?.Note || 'N/A'}`;
    
    const promptText = `You are a senior infrastructure architect.

Review this assessment.

Provide:

- Security risks
- Capacity risks
- Reliability concerns
- Software lifecycle concerns
- Upgrade recommendations
- Architecture recommendations

---
SYSTEM ASSESSMENT PROFILE:
Hostname: ${envData.ComputerName}
OS: ${envData.OSName}
OS Version/Build: ${envData.OSVersion} (Build ${envData.OSBuild})
Overall Health Index: ${healthScoreData.OverallHealthScore}/100

Health Score Domains:
- Performance: ${healthScoreData.PerformanceScore}/100
- Security: ${healthScoreData.SecurityScore}/100
- Reliability: ${healthScoreData.ReliabilityScore}/100
- Scalability: ${healthScoreData.ScalabilityScore}/100
- Serviceability: ${healthScoreData.ServiceabilityScore}/100
- Usability: ${healthScoreData.UsabilityScore}/100

Active Findings (${findingsData.length} issues):
${findingsList}

Capacity forecast details:
${capacityInfo}
`;
    
    navigator.clipboard.writeText(promptText).then(() => {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
      setLogLines(prev => [...prev, `[Info] Copied AI Diagnostic Review prompt template to clipboard.`]);
    });
  };

  // Formatted Log pasting
  const handleLogPasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logInput.trim()) return;

    const lines = logInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    setLogLines(lines);
    setLogInput('');
    setLogLines(prev => [...prev, `[Info] Imported custom execution log stream (${lines.length} lines).`]);
  };

  // AI assistant messaging logic
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const timestamp = new Date().toTimeString().split(' ')[0];
    setMessages(prev => [...prev, { sender: 'user', text: userText, timestamp }]);
    setChatInput('');

    setTimeout(() => {
      let botResponse = '';
      if (!envDataState || !healthScoreDataState) {
        botResponse = 'No active assessment data is loaded. Please import an assessment or switch to Demo Mode to use AI Guardian Chat diagnostics.';
      } else {
        const command = userText.toLowerCase();

        if (command.startsWith('/')) {
        if (command === '/help') {
          botResponse = `Available Quick Command Protocol:\n- \`/status\` : Summary of the machine specifications & health score\n- \`/remediate\` : Prioritized list of required remediation steps\n- \`/graph\` : Details of the active nodes in the knowledge graph\n- \`/clear\` : Wipe the terminal message logs`;
        } else if (command === '/status') {
          botResponse = `SENTINEL Assessment Core status:\n-------------------------------------\nHostname: ${envData.ComputerName}\nOS: ${envData.OSName}\nOverall Health: ${healthScoreData.OverallHealthScore}/100\n\nAggregate Findings: ${findingsData.length}\n- Critical: ${findingsData.filter(f => f.Severity === 'Critical').length}\n- High: ${findingsData.filter(f => f.Severity === 'High').length}\n- Medium: ${findingsData.filter(f => f.Severity === 'Medium').length}\n- Low/Info: ${findingsData.filter(f => f.Severity === 'Low' || f.Severity === 'Informational').length}`;
        } else if (command === '/remediate') {
          const sorted = [...findingsData].sort((a, b) => a.Priority - b.Priority);
          botResponse = `Prioritized Action Recommendations:\n-------------------------------------\n` + 
            sorted.map((f, i) => `${i + 1}. [${f.Severity}] ${f.Title} -> ${f.RecommendedRemediation}`).join('\n');
        } else if (command === '/graph') {
          botResponse = `Infrastructure Knowledge Graph Nodes:\n-------------------------------------\n` +
            nodes.map(n => `- ${n.label} [Type: ${n.type}, Status: ${n.status.toUpperCase()}]`).join('\n');
        } else if (command === '/clear') {
          setMessages([
            {
              sender: 'sentinel',
              text: 'Terminal messaging cleared. Operational. Ready for query.',
              timestamp: new Date().toTimeString().split(' ')[0]
            }
          ]);
          return;
        } else {
          botResponse = `Unknown command "${command}". Type /help to see all commands.`;
        }
      } else {
        // Natural language matching based on findings data
        const matchesSecurity = command.includes('security') || command.includes('firewall') || command.includes('defender') || command.includes('admin');
        const matchesSpace = command.includes('storage') || command.includes('disk') || command.includes('space') || command.includes('c:');
        const matchesReliability = command.includes('reliability') || command.includes('service') || command.includes('stopped');

        if (matchesSecurity) {
          const sec = findingsData.filter(f => f.Domain === 'Security');
          botResponse = `Security Profile Analysis:\nYour Security Score is ${healthScoreData.SecurityScore}/100. We found ${sec.length} security anomalies:\n` +
            sec.map(f => `- [${f.Severity}] ${f.Title}: ${f.RecommendedRemediation}`).join('\n');
        } else if (matchesSpace) {
          const capacityFindings = findingsData.filter(f => f.Domain === 'Performance' || f.Category.toLowerCase().includes('disk') || f.Category.toLowerCase().includes('capacity'));
          const forecast = capacityForecastData?.Storage;
          botResponse = `Storage & Capacity Performance Analysis:\nYour Performance Score is ${healthScoreData.PerformanceScore}/100. We found ${capacityFindings.length} capacity/performance findings:\n` +
            (capacityFindings.length > 0 ? capacityFindings.map(f => `- [${f.Severity}] ${f.Title}: ${f.RecommendedRemediation}`).join('\n') : '- No active storage or capacity performance findings identified.') +
            (forecast ? `\n\nForecast Note: ${forecast.Note}` : '');
        } else if (matchesReliability) {
          const rel = findingsData.filter(f => f.Domain === 'Reliability');
          botResponse = `Reliability & Services report:\nYour Reliability score is ${healthScoreData.ReliabilityScore}/100.\n` +
            rel.map(f => `- Service Stopped: ${f.Description} Recommended Action: ${f.RecommendedRemediation}`).join('\n');
        } else if (command.includes('hello') || command.includes('hi')) {
          botResponse = `Hello Commander! How can I assist you with the infrastructure assessment of ${envData.ComputerName}? You can ask me about security, storage capacity, stopped services, or run a shortcut command.`;
        } else {
          botResponse = `I noted your query about infrastructure diagnostics. Based on findings for ${envData.ComputerName}, we have identified ${findingsData.length} findings, with the top risk being storage exhaustion and firewall disablement. Let me know if you want detailed remediation guides for these.`;
        }
      }
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'sentinel',
          text: botResponse,
          timestamp: new Date().toTimeString().split(' ')[0]
        }
      ]);
    }, 600);
  };

  // Toggle remediation step checkboxes
  const handleToggleRemediation = (findingId: string) => {
    setCompletedRemediations(prev => {
      const next = { ...prev, [findingId]: !prev[findingId] };
      if (activeAssessmentId) {
        loadAssessmentDetails(activeAssessmentId).then(consolidated => {
          if (consolidated) {
            consolidated.completedRemediations = next;
            saveAssessment(consolidated);
          }
        });
      }
      return next;
    });
  };

  // Helper to render evidence structures nicely
  const renderEvidenceValue = (val: unknown) => {
    if (val === null || val === undefined) return <span style={{ color: 'var(--text-muted)' }}>None</span>;
    if (typeof val === 'boolean') return <span className={`cyber-badge ${val ? 'badge-green' : 'badge-pink'}`}>{val ? 'TRUE' : 'FALSE'}</span>;
    if (typeof val === 'number') return <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{val}</span>;
    if (Array.isArray(val)) {
      if (val.length === 0) return <span style={{ color: 'var(--text-muted)' }}>Empty Array</span>;
      // If it is an array of objects
      const firstItem = val[0] as unknown;
      if (firstItem && typeof firstItem === 'object') {
        const headers = Object.keys(firstItem);
        return (
          <div style={{ overflowX: 'auto', marginTop: '6px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {headers.map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(val as Record<string, unknown>[]).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.01)' }}>
                    {headers.map(h => {
                      const innerVal = item[h];
                      return (
                        <td key={h} style={{ padding: '6px 10px' }}>
                          {typeof innerVal === 'boolean' ? (innerVal ? 'True' : 'False') : String(innerVal)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return <span>{(val as string[]).join(', ')}</span>;
    }
    if (typeof val === 'object') {
      const objVal = val as Record<string, unknown>;
      return (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {Object.entries(objVal).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>
              <span>{typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v)}</span>
            </div>
          ))}
        </div>
      );
    }
    return String(val);
  };

  // Filter findings based on user selectors
  const filteredFindings = findingsData.filter(f => {
    const matchesDomain = domainFilter === 'ALL' || f.Domain.toUpperCase() === domainFilter.toUpperCase();
    const matchesSeverity = severityFilter === 'ALL' || f.Severity.toUpperCase() === severityFilter.toUpperCase();
    const matchesSearch = f.Title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.Description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.FindingId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSeverity && matchesSearch;
  });

  const handleGlobalSearchChange = (val: string) => {
    setGlobalSearch(val);
    setSearchQuery(val);
  };

  const assessmentSource = DEMO_MODE ? "Demo Assessment" : (envDataState ? "Live Assessment" : "No Assessment Available");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {DEMO_MODE && (
        <div className="demo-banner">
          <span>⚠ Demo Data: This environment contains sample data.</span>
        </div>
      )}
      <div className="app-container">
      {/* Sidebar Command Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-glow">S</div>
          <div className="logo-text">SENTINEL</div>
        </div>

        {/* Live Daemon Connection Badge */}
        <div style={{ padding: '12px 16px 4px 16px' }}>
          <div 
            onClick={() => setIsRefreshModalOpen(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '10px 14px', 
              background: 'rgba(255, 255, 255, 0.01)', 
              border: '1px solid rgba(255, 255, 255, 0.04)', 
              borderRadius: '8px', 
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: 'inset 0 0 12px rgba(255,255,255,0.01)'
            }}
            className="daemon-status-panel"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span 
                className="status-indicator pulse" 
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%',
                  backgroundColor: 
                    daemonState === 'connected' ? 'var(--color-green)' :
                    daemonState === 'scanning' ? 'var(--color-cyan)' :
                    daemonState === 'upgrade-required' ? 'var(--color-orange)' :
                    daemonState === 'error' ? 'var(--color-pink)' :
                    'var(--neutral-500)',
                  boxShadow: 
                    daemonState === 'connected' ? '0 0 10px var(--color-green)' :
                    daemonState === 'scanning' ? '0 0 10px var(--color-cyan)' :
                    daemonState === 'upgrade-required' ? '0 0 10px var(--color-orange)' :
                    daemonState === 'error' ? '0 0 10px var(--color-pink)' :
                    'none',
                  animation: 
                    daemonState === 'connected' ? 'pulse-green 2s infinite' :
                    daemonState === 'scanning' ? 'pulse-blue 1.5s infinite' :
                    daemonState === 'upgrade-required' ? 'pulse-orange 2s infinite' :
                    daemonState === 'error' ? 'pulse-pink 2s infinite' :
                    'none'
                }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>LOCAL AGENT</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {daemonState === 'connected' && 'Online'}
                  {daemonState === 'scanning' && 'Scanning...'}
                  {daemonState === 'disconnected' && 'Offline'}
                  {daemonState === 'error' && 'Error'}
                  {daemonState === 'upgrade-required' && 'Update Required'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {daemonVersion ? `v${daemonVersion}` : 'N/A'}
              </span>
              <span style={{ fontSize: '8px', color: 'var(--text-muted)', textDecoration: 'underline' }}>
                Manage
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Search */}
        <div style={{ padding: '12px 16px 4px 16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="cyber-input" 
              placeholder="Search navigation..." 
              style={{ width: '100%', paddingLeft: '28px', paddingRight: '8px', fontSize: '11px', height: '32px' }}
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />
          </div>
        </div>

        <nav className="sidebar-menu" style={{ flex: 1, overflowY: 'auto' }}>
          {/* Favorites Submenu */}
          {favorites.size > 0 && sidebarSearch === '' && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ margin: '0 16px 4px 16px', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Favorites</div>
              {Array.from(favorites).map(favKey => {
                const labelMap: Record<string, string> = {
                  'overview': 'Dashboard Overview', 'auditor': 'Findings Auditor', 'remediation': 'Risk & Remediation',
                  'software': 'Software Intelligence', 'forecasting': 'Capacity Forecast', 'topology': 'Infrastructure Graph',
                  'importer': 'Import & Log Stream', 'ai': 'AI Guardian Chat', 'system-status': 'System Status'
                };
                if (!labelMap[favKey]) return null;
                return (
                  <button 
                    key={`fav-${favKey}`} 
                    className={`menu-item ${activeTab === favKey ? 'active' : ''}`} 
                    onClick={() => setActiveTab(favKey as any)}
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    <span style={{ marginRight: '6px', color: 'var(--color-orange)' }}>★</span>
                    <span>{labelMap[favKey]}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Menu */}
          <div style={{ margin: '8px 16px 4px 16px', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Modules</div>

          {[
            { key: 'overview', label: 'Dashboard Overview', icon: <Shield size={16} /> },
            { key: 'auditor', label: 'Findings Auditor', icon: <FileIcon size={16} /> },
            { key: 'remediation', label: 'Risk & Remediation', icon: <CheckCircleIcon size={16} color="currentColor" /> },
            { key: 'software', label: 'Software Intelligence', icon: <Package size={16} /> },
            { key: 'forecasting', label: 'Capacity Forecast', icon: <Activity size={16} /> },
            { key: 'topology', label: 'Infrastructure Graph', icon: <Globe size={16} /> },
            { key: 'importer', label: 'Import & Log Stream', icon: <Settings size={16} /> },
            { key: 'ai', label: 'AI Guardian Chat', icon: <TerminalIcon size={16} /> },
            { key: 'system-status', label: 'System Status', icon: <Database size={16} /> }
          ].filter(item => item.label.toLowerCase().includes(sidebarSearch.toLowerCase())).map((item, idx) => (
            <button 
              key={item.key} 
              className={`menu-item ${activeTab === item.key ? 'active' : ''}`} 
              onClick={() => setActiveTab(item.key as any)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.icon}
                <span>{item.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e: any) => e.stopPropagation()}>
                <span 
                  onClick={(e) => toggleFavorite(item.key, e)} 
                  style={{ 
                    cursor: 'pointer', 
                    color: favorites.has(item.key) ? 'var(--color-orange)' : 'var(--text-muted)', 
                    fontSize: '14px', 
                    padding: '2px', 
                    transition: 'color var(--motion-fast)' 
                  }}
                  title={favorites.has(item.key) ? "Remove from Favorites" : "Add to Favorites"}
                >
                  {favorites.has(item.key) ? '★' : '☆'}
                </span>
                <span style={{ fontSize: '9px', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>Alt+{idx+1}</span>
              </div>
            </button>
          ))}

          {/* Recent items */}
          {recentTabs.length > 0 && sidebarSearch === '' && (
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--neutral-800)', paddingTop: '12px' }}>
              <div style={{ margin: '0 16px 4px 16px', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent</div>
              {recentTabs.map(tabKey => {
                const labelMap: Record<string, string> = {
                  'overview': 'Dashboard Overview', 'auditor': 'Findings Auditor', 'remediation': 'Risk & Remediation',
                  'software': 'Software Intelligence', 'forecasting': 'Capacity Forecast', 'topology': 'Infrastructure Graph',
                  'importer': 'Import & Log Stream', 'ai': 'AI Guardian Chat', 'system-status': 'System Status'
                };
                if (!labelMap[tabKey]) return null;
                return (
                  <button 
                    key={`recent-${tabKey}`} 
                    className="menu-item" 
                    onClick={() => setActiveTab(tabKey as any)}
                    style={{ padding: '6px 16px', fontSize: '11px', opacity: 0.8 }}
                  >
                    <span>{labelMap[tabKey]}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Coming Soon Section */}
          <div style={{ margin: '16px 16px 4px 16px', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Coming Soon</div>

          {[
            { key: 'coming-soon-fleet', label: 'Fleet Management', icon: <Globe size={16} /> },
            { key: 'coming-soon-correlation', label: 'Correlation & Inference', icon: <Activity size={16} /> },
            { key: 'coming-soon-healing', label: 'Auto-Healing', icon: <Shield size={16} /> },
            { key: 'coming-soon-ai-eng', label: 'AI Ops Engineer', icon: <TerminalIcon size={16} /> },
            { key: 'coming-soon-vuln', label: 'Vulnerability Intel', icon: <Package size={16} /> },
            { key: 'coming-soon-execution', label: 'Active Remediation', icon: <CheckCircleIcon size={16} color="currentColor" /> }
          ].filter(item => item.label.toLowerCase().includes(sidebarSearch.toLowerCase())).map(item => (
            <button 
              key={item.key} 
              className={`menu-item ${activeTab === item.key ? 'active' : ''}`} 
              onClick={() => setActiveTab(item.key as any)}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              <span className="cyber-badge badge-orange" style={{ fontSize: '8px', padding: '1px 4px' }}>Soon</span>
            </button>
          ))}
        </nav>

        {/* Keyboard Shortcuts Helper */}
        <div style={{ padding: '8px 16px', fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--neutral-800)', background: 'rgba(0,0,0,0.1)' }}>
          <div><strong>Keyboard Shortcuts:</strong></div>
          <div style={{ fontFamily: 'var(--font-mono)', marginTop: '2px' }}>Alt + [1-9]: Switch tab</div>
        </div>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            className="cyber-btn cyber-btn-danger" 
            style={{ width: '100%', fontSize: '11px', padding: '8px', gap: '6px', justifyContent: 'center' }} 
            onClick={() => setIsReportModalOpen(true)}
          >
            <AlertTriangle size={12} />
            <span>Report System Issue</span>
          </button>
        </div>
      </aside>

      {/* Main Content Window */}
      <main className="main-content">
        <header className="content-header" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '64px', borderBottom: '1px solid var(--neutral-800)', backgroundColor: 'var(--bg-secondary)' }}>
          {/* Current Location Title */}
          <div className="header-title-container">
            <h1 style={{ fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-primary)', margin: 0 }}>
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'auditor' && 'Findings Auditor'}
              {activeTab === 'remediation' && 'Remediation Command Center'}
              {activeTab === 'software' && 'Software Intelligence'}
              {activeTab === 'forecasting' && 'Capacity Forecast'}
              {activeTab === 'topology' && 'Infrastructure Graph'}
              {activeTab === 'importer' && 'Import & Log Stream'}
              {activeTab === 'ai' && 'AI Guardian Chat'}
              {activeTab === 'system-status' && 'System Operations Status'}
              {activeTab.startsWith('coming-soon-') && 'Planned Platform Feature'}
            </h1>
          </div>

          {/* Global Search Bar */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="cyber-input" 
              placeholder="Search findings globally..." 
              style={{ width: '100%', paddingLeft: '28px', paddingRight: '8px', fontSize: '11px', height: '32px' }}
              value={globalSearch}
              onChange={(e) => handleGlobalSearchChange(e.target.value)}
            />
          </div>

          {/* Right Side Icons & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Global Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="cyber-btn cyber-btn-primary" 
                style={{ padding: '6px 12px', fontSize: '11px', height: '32px' }} 
                onClick={() => setIsExportWarningOpen(true)}
                title="Export Assessment Review Package"
              >
                <Package size={12} color="#FAFAFA" />
                <span>Export Package</span>
              </button>

              <button 
                className="cyber-btn" 
                style={{ padding: '6px 12px', fontSize: '11px', height: '32px' }} 
                onClick={() => setIsRefreshModalOpen(true)}
              >
                <RefreshCw size={12} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Notifications Bell */}
            <div style={{ position: 'relative' }}>
              <button 
                className="cyber-btn" 
                style={{ padding: '6px 10px', height: '32px', position: 'relative' }} 
                onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
                aria-label="View notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {findingsData.length > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    top: '-4px', 
                    right: '-4px', 
                    backgroundColor: 'var(--error-500)', 
                    color: 'white', 
                    fontSize: '8px', 
                    borderRadius: '50%', 
                    width: '14px', 
                    height: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {findingsData.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div style={{ 
                  position: 'absolute', 
                  top: '40px', 
                  right: 0, 
                  width: '320px', 
                  backgroundColor: 'var(--neutral-900)', 
                  border: '1px solid var(--neutral-700)', 
                  borderRadius: 'var(--radius-md)', 
                  boxShadow: 'var(--elevation-3)', 
                  zIndex: 1000, 
                  padding: '12px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>SYSTEM NOTIFICATIONS</span>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer' }} onClick={() => setNotificationsOpen(false)}>Close</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                    {findingsData.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>No warnings or findings registered.</div>
                    ) : (
                      findingsData.slice(0, 5).map(f => (
                        <div key={f.FindingId} style={{ display: 'flex', gap: '8px', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          <span style={{ color: f.Severity === 'Critical' || f.Severity === 'High' ? 'var(--color-pink)' : 'var(--color-orange)', fontSize: '12px' }}>●</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{f.Title}</span>
                            <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{f.Domain} • Priority {f.Priority}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {findingsData.length > 5 && (
                    <div style={{ borderTop: '1px solid var(--neutral-800)', paddingTop: '8px', marginTop: '8px', textAlign: 'center' }}>
                      <button className="cyber-btn" style={{ fontSize: '10px', padding: '4px 8px' }} onClick={() => { setActiveTab('auditor'); setNotificationsOpen(false); }}>View All Findings</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                className="cyber-btn" 
                style={{ padding: '6px 12px', height: '32px', display: 'flex', alignItems: 'center', gap: '8px' }} 
                onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
                aria-label="User profile options"
              >
                <User size={14} />
                <span style={{ fontSize: '11px', fontWeight: '600' }}>RAJAJ</span>
              </button>

              {profileOpen && (
                <div style={{ 
                  position: 'absolute', 
                  top: '40px', 
                  right: 0, 
                  width: '240px', 
                  backgroundColor: 'var(--neutral-900)', 
                  border: '1px solid var(--neutral-700)', 
                  borderRadius: 'var(--radius-md)', 
                  boxShadow: 'var(--elevation-3)', 
                  zIndex: 1000, 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <User size={32} className="cyber-badge badge-blue" style={{ padding: '6px', borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Commander Rajaj</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Security Officer</div>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--neutral-800)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                      <span style={{ color: 'var(--color-green)' }}>● Operational</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Session:</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>Active</span>
                    </div>
                  </div>
                  <button 
                    className="cyber-btn cyber-btn-danger" 
                    style={{ width: '100%', fontSize: '11px', padding: '6px' }}
                    onClick={() => {
                      setProfileOpen(false);
                      showToast('User session locked.', 'info');
                    }}
                  >
                    Lock Session
                  </button>
                </div>
              )}
            </div>

            {/* Threat Level Badge */}
            <div className="system-threat-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', border: '1px solid var(--neutral-800)', borderRadius: 'var(--radius-xs)' }}>
              <span className={`cyber-badge ${
                !healthScoreDataState ? 'badge-blue' :
                healthScoreData.OverallHealthScore >= 85 ? 'badge-green' : 
                healthScoreData.OverallHealthScore >= 70 ? 'badge-orange' : 'badge-pink'
              }`} style={{ padding: '2px 8px' }}>
                {!healthScoreDataState ? '● NO DATA' :
                 healthScoreData.OverallHealthScore >= 85 ? '● STABLE' : 
                 healthScoreData.OverallHealthScore >= 70 ? '▲ WARNING' : '⚠ COMPROMISED'}
              </span>
            </div>
          </div>
        </header>

        {/* User Trust Indicators and Stale Warning */}
        {envData && (
          <>
            {assessmentAgeInfo.isStale && (
              <div className="stale-data-warning">
                <AlertTriangle size={14} />
                <span>Assessment may be outdated. Run a new assessment for accurate results.</span>
                <button 
                  className="cyber-btn" 
                  style={{ padding: '2px 8px', fontSize: '10px', marginLeft: '12px', borderColor: 'rgba(245,158,11,0.4)', color: 'var(--color-orange)', height: '24px' }}
                  onClick={() => setIsRefreshModalOpen(true)}
                >
                  Run New Assessment
                </button>
              </div>
            )}
            
            <div className="trust-indicator-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Assessment Source:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{assessmentSource}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Collected:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{new Date(envData.CollectionTimestamp).toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Age:</span>{' '}
                  <span className={`cyber-badge ${
                    assessmentAgeInfo.severity === 'green' ? 'badge-green' : 
                    assessmentAgeInfo.severity === 'yellow' ? 'badge-orange' : 'badge-pink'
                  }`} style={{ padding: '2px 8px', fontWeight: 'bold' }}>
                    {assessmentAgeInfo.text}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Machine:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{envData.ComputerName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Schema:</span>{' '}
                  <span className="cyber-badge badge-cyan" style={{ padding: '2px 8px' }}>v1.0</span>
                </div>
                {activeAssessmentId && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>ID:</span>{' '}
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{activeAssessmentId}</strong>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Last Refresh:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{lastRefresh.toLocaleTimeString()}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>App Version:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>v1.0.0</strong>
                </div>
                <button className="cyber-btn cyber-btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setIsRefreshModalOpen(true)}>
                  <RefreshCw size={10} color="#060913" />
                  <span>Refresh Assessment</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Content Area */}
        <div className="scroll-container">
          {!envDataState && activeTab !== 'importer' && activeTab !== 'system-status' && !activeTab.startsWith('coming-soon-') ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center', padding: '40px' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '48px', maxWidth: '500px', background: 'rgba(255,255,255,0.01)', backdropFilter: 'blur(16px)', boxShadow: '0 0 25px rgba(236,72,153,0.05)' }}>
                <AlertTriangle size={48} color="var(--color-pink)" style={{ marginBottom: '20px' }} />
                <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>No Assessment Available</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
                  Run the collector and import an assessment.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="cyber-btn cyber-btn-primary" style={{ color: '#060913', fontWeight: 'bold' }} onClick={() => setIsRefreshModalOpen(true)}>
                    <RefreshCw size={14} />
                    <span>Refresh Assessment</span>
                  </button>
                  <button className="cyber-btn" onClick={() => setActiveTab('importer')}>
                    <Settings size={14} />
                    <span>Go to Importer</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 1. OVERVIEW TAB */}
              {activeTab === 'overview' && (
            <div>
              {/* Radial Gauges Row */}
              <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Domain Health Score Indices</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {renderRadialGauge(healthScoreData.OverallHealthScore, 'Overall Score')}
                {renderRadialGauge(healthScoreData.PerformanceScore, 'Performance')}
                {renderRadialGauge(healthScoreData.SecurityScore, 'Security')}
                {renderRadialGauge(healthScoreData.ReliabilityScore, 'Reliability')}
                {renderRadialGauge(healthScoreData.ScalabilityScore, 'Scalability')}
                {renderRadialGauge(healthScoreData.ServiceabilityScore, 'Serviceability')}
                {renderRadialGauge(healthScoreData.UsabilityScore, 'Usability')}
              </div>

              <div className="dashboard-grid">
                {/* Environment Info */}
                <div className="glass-panel" style={{ gridColumn: 'span 7' }}>
                  <div className="panel-header">
                    <h2 className="panel-title"><Settings size={16} color="var(--color-cyan)" /> Environment Overview Details</h2>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>COLLECTED: {new Date(envData.CollectionTimestamp).toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '13px' }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Host Machine</div>
                      <div style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{envData.ComputerName}</div>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Platform / OS</div>
                      <div style={{ fontWeight: 'bold' }}>{envData.OSName}</div>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>OS version & Build</div>
                      <div style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{envData.OSVersion} (Build {envData.OSBuild})</div>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Execution Posture</div>
                      <div style={{ fontWeight: 'bold', color: 'var(--color-cyan)' }}>Mode: {envData.ExecutionMode} {envData.IsElevated ? '[Admin Elevated]' : '[Restricted]'}</div>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>PowerShell Engine</div>
                      <div style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>v{envData.PowerShellVersion}</div>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Hardware / Hypervisor</div>
                      <div style={{ fontWeight: 'bold' }}>{envData.Manufacturer} {envData.Model}</div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Hardware Serial Number</div>
                      <div style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{envData.SerialNumber}</div>
                    </div>
                  </div>
                </div>

                {/* Summary Indicators */}
                <div className="glass-panel" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="panel-header">
                    <h2 className="panel-title"><AlertTriangle size={16} color="var(--color-pink)" /> Audit Action Panel</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.15)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Total Findings Listed</span>
                      <span className="cyber-badge badge-pink" style={{ fontSize: '14px', padding: '2px 10px' }}>{findingsData.length}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Pending Remediations</span>
                      <span className="cyber-badge badge-orange" style={{ fontSize: '14px', padding: '2px 10px' }}>
                        {findingsData.length - Object.values(completedRemediations).filter(Boolean).length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Mitigated Issues</span>
                      <span className="cyber-badge badge-green" style={{ fontSize: '14px', padding: '2px 10px' }}>
                        {Object.values(completedRemediations).filter(Boolean).length}
                      </span>
                    </div>
                  </div>

                  <button className="cyber-btn cyber-btn-primary" style={{ width: '100%', marginTop: '16px', padding: '10px' }} onClick={() => setActiveTab('remediation')}>
                    <CheckCircleIcon size={14} color="#060913" />
                    <span>Open Remediation Workspace</span>
                  </button>
                </div>

                {/* Historical Health Trends */}
                <div className="glass-panel" style={{ gridColumn: 'span 12' }}>
                  <div className="panel-header">
                    <h2 className="panel-title"><Activity size={16} color="var(--color-cyan)" /> Historical Health Trends (Longitudinal Assessment)</h2>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Long-term system health tracking across multiple collector execution periods</span>
                  </div>

                  <div style={{ position: 'relative', overflow: 'visible', margin: '20px 0' }}>
                    {historyData && historyData.length > 0 ? (
                      <div style={{ position: 'relative' }}>
                        <svg width="100%" height="240" viewBox="0 0 600 240" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'visible' }}>
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
                                stroke="var(--color-cyan)"
                                strokeWidth="3"
                                style={{ filter: 'drop-shadow(0px 0px 6px var(--color-cyan))' }}
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
                                <circle cx={x} cy={y} r="8" fill="var(--color-cyan)" opacity="0.1" />
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="5"
                                  fill="var(--bg-primary)"
                                  stroke="var(--color-cyan)"
                                  strokeWidth="2.5"
                                  cursor="pointer"
                                  onMouseEnter={() => setHoveredHistoryPoint({ run, x, y })}
                                  onMouseLeave={() => setHoveredHistoryPoint(null)}
                                  onClick={() => {
                                    loadAssessmentDetails(run.AssessmentId).then(data => {
                                      if (data) {
                                        if (data.Machine) setEnvData(data.Machine);
                                        if (data.Findings) setFindingsData(data.Findings);
                                        if (data.HealthScore) setHealthScoreData(data.HealthScore);
                                        if (data.RiskMatrix) setRiskMatrixData(data.RiskMatrix);
                                        if (data.CapacityForecast) setCapacityForecastData(data.CapacityForecast);
                                        if (data.RawEvidence) setRawEvidenceData(data.RawEvidence);
                                        setLogLines(prev => [...prev, `[Info] Switched workspace view to historical run ${run.AssessmentId} (${new Date(run.Timestamp).toLocaleString()}).`]);
                                      }
                                    });
                                  }}
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
                        {hoveredHistoryPoint && (
                          <div className="chart-tooltip" style={{
                            position: 'absolute',
                            left: `${(hoveredHistoryPoint.x / 600) * 100}%`,
                            top: `${hoveredHistoryPoint.y - 85}px`,
                            transform: 'translateX(-50%)',
                            background: 'rgba(6,9,19,0.95)',
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 0 12px rgba(6,182,212,0.35)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            zIndex: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--color-cyan)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '4px' }}>
                              ASSESSMENT SUMMARY
                            </div>
                            <div>Host: <strong style={{ color: 'var(--text-primary)' }}>{hoveredHistoryPoint.run.ComputerName}</strong></div>
                            <div>Date: <strong style={{ color: 'var(--text-primary)' }}>{new Date(hoveredHistoryPoint.run.Timestamp).toLocaleString()}</strong></div>
                            <div>Overall Score: <strong style={{ color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>{hoveredHistoryPoint.run.OverallHealth.toFixed(1)}/100</strong></div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 12px', marginTop: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                              <div>Perf: {hoveredHistoryPoint.run.Performance}</div>
                              <div>Sec: {hoveredHistoryPoint.run.Security}</div>
                              <div>Rel: {hoveredHistoryPoint.run.Reliability}</div>
                              <div>Scale: {hoveredHistoryPoint.run.Scalability}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                        No historical assessment records have been loaded. Please import a SentinelHistory.json file.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. FINDINGS AUDITOR */}
          {activeTab === 'auditor' && (
            <div className="glass-panel">
              <div className="panel-header">
                <h2 className="panel-title"><Search size={16} /> Filter & Scan Findings</h2>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Showing {filteredFindings.length} of {findingsData.length} entries</div>
              </div>

              {/* Filters Toolbar */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="cyber-input"
                    placeholder="Search by ID, title, details..."
                    style={{ width: '100%', paddingLeft: '36px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Domain Selector */}
                <select className="cyber-input" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} style={{ minWidth: '150px' }}>
                  <option value="ALL">All Domains</option>
                  <option value="Performance">Performance</option>
                  <option value="Security">Security</option>
                  <option value="Reliability">Reliability</option>
                  <option value="Scalability">Scalability</option>
                  <option value="Serviceability">Serviceability</option>
                  <option value="Usability">Usability</option>
                </select>

                {/* Severity Selector */}
                <select className="cyber-input" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ minWidth: '150px' }}>
                  <option value="ALL">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Informational">Informational</option>
                </select>
              </div>

              {/* Findings Expandable List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredFindings.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                    No infrastructure findings match the selected filters.
                  </div>
                ) : (
                  filteredFindings.map(finding => {
                    const isExpanded = expandedFindingId === finding.FindingId;
                    const isCompleted = completedRemediations[finding.FindingId];
                    return (
                      <div key={finding.FindingId} style={{ 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px', 
                        overflow: 'hidden', 
                        background: isExpanded ? 'rgba(255,255,255,0.015)' : 'transparent',
                        transition: 'background-color 0.2s'
                      }}>
                        {/* Header Row */}
                        <div 
                          onClick={() => setExpandedFindingId(isExpanded ? null : finding.FindingId)}
                          style={{ 
                            padding: '14px 20px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.01)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                            <input 
                              type="checkbox" 
                              checked={isCompleted || false} 
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleRemediation(finding.FindingId);
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{finding.FindingId} • Priority {finding.Priority}</span>
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                                {finding.Title}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className={`cyber-badge ${
                              finding.Severity === 'Critical' ? 'badge-pink' :
                              finding.Severity === 'High' ? 'badge-pink' :
                              finding.Severity === 'Medium' ? 'badge-orange' : 'badge-blue'
                            }`}>
                              {finding.Severity}
                            </span>
                            <span className="cyber-badge badge-cyan" style={{ fontSize: '10px' }}>
                              {finding.Domain}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Details Block */}
                        {isExpanded && (
                          <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '13px', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
                            
                            {/* Left Side: General description */}
                            <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div>
                                <div style={{ fontWeight: '700', color: 'var(--color-cyan)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Description</div>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>{finding.Description}</p>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                <div>
                                  <div style={{ fontWeight: '700', color: 'var(--color-pink)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Impact</div>
                                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{finding.Impact}</p>
                                </div>
                                <div>
                                  <div style={{ fontWeight: '700', color: 'var(--color-pink)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Business Risk</div>
                                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{finding.BusinessRisk}</p>
                                </div>
                              </div>

                              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px', borderLeft: '3px solid var(--color-cyan)', borderRadius: '4px' }}>
                                <div style={{ fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Root Cause Hypothesis</div>
                                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '12px' }}>{finding.RootCauseHypothesis}</p>
                              </div>
                            </div>

                            {/* Right Side: Remediation guidelines */}
                            <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: '1px solid rgba(255,255,255,0.04)', paddingLeft: '20px' }}>
                              <div>
                                <div style={{ fontWeight: '700', color: 'var(--color-green)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Recommended Remediation</div>
                                <p style={{ fontWeight: 'bold' }}>{finding.RecommendedRemediation}</p>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span>Estimated Effort:</span>
                                <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: finding.EstimatedEffort === 'Low' ? 'var(--color-green)' : 'var(--color-orange)' }}>
                                  {finding.EstimatedEffort}
                                </span>
                              </div>

                              <div>
                                <div style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Verification Method</div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{finding.VerificationMethod}</p>
                              </div>
                            </div>

                            {/* Raw Evidence Drawer */}
                            <div style={{ gridColumn: 'span 12', marginTop: '10px', paddingTop: '16px', borderTop: '1px dashed rgba(255,255,255,0.04)' }}>
                              <div style={{ fontWeight: '700', color: 'var(--color-blue)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>Collected Evidence Snapshot</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {finding.Evidence.map((ev, eIdx) => (
                                  <div key={eIdx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px 14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                      <span>Source: <strong style={{ color: 'var(--text-secondary)' }}>{ev.Source}</strong> • Name: <strong style={{ color: 'var(--text-secondary)' }}>{ev.Name}</strong></span>
                                      <span>Collector: {ev.Collector || 'Inline'}</span>
                                    </div>
                                    <div style={{ fontSize: '13px' }}>
                                      {renderEvidenceValue(ev.Value)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. RISK & REMEDIATION */}
          {activeTab === 'remediation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Risk Matrix Table */}
              <div className="glass-panel">
                <div className="panel-header">
                  <h2 className="panel-title"><AlertTriangle size={16} color="var(--color-pink)" /> Risk Severity Matrix</h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>SEVERITY</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>FINDINGS</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>TECHNICAL IMPACT</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>BUSINESS IMPACT</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>ACTION STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskMatrixData.map((row) => (
                        <tr key={row.Severity} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                            <span className={`cyber-badge ${
                              row.Severity === 'Critical' || row.Severity === 'High' ? 'badge-pink' :
                              row.Severity === 'Medium' ? 'badge-orange' : 'badge-blue'
                            }`}>
                              {row.Severity}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                            {row.FindingCount}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '300px' }}>
                            {row.TechnicalImpact || <span style={{ color: 'var(--text-muted)' }}>None</span>}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '300px' }}>
                            {row.BusinessImpact || <span style={{ color: 'var(--text-muted)' }}>None</span>}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {row.FindingCount > 0 ? (
                              <span style={{ color: 'var(--color-pink)', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                {row.OperationalImpact}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-green)', fontSize: '11px' }}>Clear</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Prioritized Remediation Plan */}
              <div className="glass-panel">
                <div className="panel-header">
                  <h2 className="panel-title"><CheckCircleIcon size={16} /> Prioritized Action Items</h2>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sorted by priority (lowest values first)</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[...findingsData]
                    .sort((a, b) => a.Priority - b.Priority)
                    .map((item, idx) => {
                      const isCompleted = completedRemediations[item.FindingId];
                      return (
                        <div key={item.FindingId} style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '16px', 
                          padding: '16px', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '8px',
                          background: isCompleted ? 'rgba(16,185,129,0.01)' : 'transparent',
                          borderColor: isCompleted ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'
                        }}>
                          <div style={{ paddingTop: '2px' }}>
                            <input 
                              type="checkbox" 
                              checked={isCompleted || false} 
                              onChange={() => handleToggleRemediation(item.FindingId)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-cyan)' }}>
                                STEP {idx + 1}: {item.FindingId} (Priority {item.Priority})
                              </span>
                              <span className={`cyber-badge ${item.Severity === 'High' ? 'badge-pink' : 'badge-orange'}`} style={{ fontSize: '9px' }}>
                                {item.Severity}
                              </span>
                            </div>

                            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '6px', textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                              {item.Title}
                            </h3>

                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                              {item.RecommendedRemediation}
                            </p>

                            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span>Effort: <strong style={{ color: 'var(--text-secondary)' }}>{item.EstimatedEffort}</strong></span>
                              <span>• Verification: <strong style={{ color: 'var(--text-secondary)' }}>{item.VerificationMethod}</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* 4. CAPACITY FORECASTING */}
          {activeTab === 'forecasting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="stats-container">
                <div className="glass-panel">
                  <div className="panel-title"><HardDrive size={16} color="var(--color-pink)" /> Storage Trend</div>
                  <div className="metric-value">95 Days</div>
                  <div className="metric-label" style={{ marginTop: '8px' }}>Until Exhaustion</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Confidence: High</div>
                </div>

                <div className="glass-panel">
                  <div className="panel-title"><Cpu size={16} color="var(--color-blue)" /> Memory Forecast</div>
                  <div className="metric-value">Stable</div>
                  <div className="metric-label" style={{ marginTop: '8px' }}>Available Headroom</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Confidence: Low</div>
                </div>

                <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
                  <div className="panel-title"><Activity size={16} color="var(--color-cyan)" /> Saturation Alert Summary</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
                    {capacityForecastData?.Storage.Note || 'Sufficient capacity metrics parsed.'}
                  </p>
                </div>
              </div>

              {/* SVG forecasting Chart */}
              <div className="glass-panel">
                <div className="panel-header">
                  <h2 className="panel-title"><Activity size={16} /> Timeline Saturation Curve (365d Forecast)</h2>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hover points to inspect estimated utilization</span>
                </div>

                <div style={{ position: 'relative', overflow: 'visible', margin: '20px 0' }}>
                  <svg width="100%" height="280" viewBox="0 0 600 280" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'visible' }}>
                    {/* Grid Lines */}
                    {[20, 40, 60, 80, 100].map(val => {
                      const y = 250 - (val / 100) * 220;
                      return (
                        <g key={val}>
                          <line x1="50" y1={y} x2="560" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <text x="25" y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="middle">{val}%</text>
                        </g>
                      );
                    })}

                    {/* Timeline labels */}
                    {['Today', '30 Days', '90 Days', '180 Days', '365 Days'].map((label, idx) => {
                      const x = 60 + idx * 115;
                      return (
                        <g key={label}>
                          <line x1={x} y1="30" x2={x} y2="250" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <text x={x} y="265" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">{label}</text>
                        </g>
                      );
                    })}

                    {/* Utilization Curve for Storage (Exhaustion Risk - pink) */}
                    <path
                      d={`M ${60 + 0*115} ${250 - (88.6/100)*220} L ${60 + 1*115} ${250 - ((capacityForecastData?.Storage.Day30 || 92)/100)*220} L ${60 + 2*115} ${250 - ((capacityForecastData?.Storage.Day90 || 98)/100)*220} L ${60 + 3*115} ${250 - ((capacityForecastData?.Storage.Day180 || 100)/100)*220} L ${60 + 4*115} ${250 - ((capacityForecastData?.Storage.Day365 || 100)/100)*220}`}
                      fill="none"
                      stroke="var(--color-pink)"
                      strokeWidth="2.5"
                      style={{ filter: 'drop-shadow(0px 0px 4px var(--color-pink))' }}
                    />

                    {/* Utilization Curve for Memory (Stable - blue) */}
                    <path
                      d={`M ${60 + 0*115} ${250 - (58/100)*220} L ${60 + 1*115} ${250 - ((capacityForecastData?.Memory.Day30 || 62)/100)*220} L ${60 + 2*115} ${250 - ((capacityForecastData?.Memory.Day90 || 63)/100)*220} L ${60 + 3*115} ${250 - ((capacityForecastData?.Memory.Day180 || 64)/100)*220} L ${60 + 4*115} ${250 - ((capacityForecastData?.Memory.Day365 || 65)/100)*220}`}
                      fill="none"
                      stroke="var(--color-blue)"
                      strokeWidth="2.5"
                      style={{ filter: 'drop-shadow(0px 0px 4px var(--color-blue))' }}
                    />

                    {/* Utilization Curve for CPU (Normal - cyan) */}
                    <path
                      d={`M ${60 + 0*115} ${250 - (24/100)*220} L ${60 + 1*115} ${250 - ((capacityForecastData?.CPU.Day30 || 34)/100)*220} L ${60 + 2*115} ${250 - ((capacityForecastData?.CPU.Day90 || 35)/100)*220} L ${60 + 3*115} ${250 - ((capacityForecastData?.CPU.Day180 || 34)/100)*220} L ${60 + 4*115} ${250 - ((capacityForecastData?.CPU.Day365 || 36)/100)*220}`}
                      fill="none"
                      stroke="var(--color-cyan)"
                      strokeWidth="2.5"
                      style={{ filter: 'drop-shadow(0px 0px 4px var(--color-cyan))' }}
                    />

                    {/* Interactive dots and hovers */}
                    {[
                      { metric: 'Storage', color: 'var(--color-pink)', values: [88.6, capacityForecastData?.Storage.Day30 || 92.5, capacityForecastData?.Storage.Day90 || 98.1, capacityForecastData?.Storage.Day180 || 100, capacityForecastData?.Storage.Day365 || 100] },
                      { metric: 'Memory', color: 'var(--color-blue)', values: [58, capacityForecastData?.Memory.Day30 || 62, capacityForecastData?.Memory.Day90 || 63.5, capacityForecastData?.Memory.Day180 || 64, capacityForecastData?.Memory.Day365 || 65.5] },
                      { metric: 'CPU', color: 'var(--color-cyan)', values: [24, capacityForecastData?.CPU.Day30 || 34, capacityForecastData?.CPU.Day90 || 35, capacityForecastData?.CPU.Day180 || 34.5, capacityForecastData?.CPU.Day365 || 36] }
                    ].map(curve => 
                      curve.values.map((val, idx) => {
                        const x = 60 + idx * 115;
                        const y = 250 - (val / 100) * 220;
                        const days = ['Today', '30d', '90d', '180d', '365d'][idx];
                        return (
                          <circle
                            key={`${curve.metric}-${idx}`}
                            cx={x}
                            cy={y}
                            r="5"
                            fill={curve.color}
                            stroke="rgba(255,255,255,0.8)"
                            strokeWidth="1.5"
                            cursor="pointer"
                            onMouseEnter={() => setHoveredPoint({ metric: curve.metric, day: days, value: val, x, y })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        );
                      })
                    )}
                  </svg>

                  {/* HTML Tooltip overlay */}
                  {hoveredPoint && (
                    <div style={{ 
                      position: 'absolute', 
                      left: `${(hoveredPoint.x / 600) * 100}%`, 
                      top: `${hoveredPoint.y - 65}px`,
                      transform: 'translateX(-50%)',
                      background: 'rgba(6,9,19,0.95)',
                      border: '1px solid var(--border-color)',
                      boxShadow: '0 0 10px rgba(6,182,212,0.2)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                      zIndex: 10
                    }}>
                      <div style={{ fontWeight: 'bold', color: hoveredPoint.metric === 'Storage' ? 'var(--color-pink)' : hoveredPoint.metric === 'Memory' ? 'var(--color-blue)' : 'var(--color-cyan)' }}>
                        {hoveredPoint.metric.toUpperCase()}
                      </div>
                      <div>Timeline: {hoveredPoint.day}</div>
                      <div>Utilization: <strong style={{ fontFamily: 'var(--font-mono)' }}>{hoveredPoint.value}%</strong></div>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-pink)', display: 'inline-block' }}></span>
                    <span>Storage Utilization (High Risk)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-blue)', display: 'inline-block' }}></span>
                    <span>Memory Utilization (Stable)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-cyan)', display: 'inline-block' }}></span>
                    <span>CPU Load Saturation (Stable)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. INFRASTRUCTURE GRAPH */}
          {activeTab === 'topology' && (
            <div className="dashboard-grid">
              {/* Interactive Node Graph */}
              <div className="glass-panel" style={{ gridColumn: 'span 8' }}>
                <div className="panel-header">
                  <h2 className="panel-title"><Globe size={16} /> Interactive Dependency Graph</h2>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Drag nodes to rearrange. Click to audit property parameters.</span>
                </div>

                <div style={{ position: 'relative', width: '100%', height: '460px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <svg 
                    ref={svgRef}
                    width="100%" 
                    height="100%" 
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ overflow: 'visible' }}
                  >
                    {/* Background Grid */}
                    <defs>
                      <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Node Link Connections */}
                    {graphLinks.map((link, idx) => {
                      const sourceNode = nodes.find(n => n.id === link.source);
                      const targetNode = nodes.find(n => n.id === link.target);
                      if (!sourceNode || !targetNode) return null;

                      return (
                        <g key={`link-${idx}`}>
                          {/* Main link line */}
                          <line
                            x1={sourceNode.x}
                            y1={sourceNode.y}
                            x2={targetNode.x}
                            y2={targetNode.y}
                            stroke="rgba(38, 55, 94, 0.4)"
                            strokeWidth="2"
                          />
                          {/* Animated pulsing dot representing signal path */}
                          <circle r="3" fill="var(--color-cyan)">
                            <animateMotion
                              path={`M ${sourceNode.x} ${sourceNode.y} L ${targetNode.x} ${targetNode.y}`}
                              dur="4s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        </g>
                      );
                    })}

                    {/* Nodes group */}
                    {nodes.map(node => {
                      const isSelected = selectedNodeId === node.id;
                      // Color based on status
                      const color = node.status === 'error' ? 'var(--color-pink)' : node.status === 'warn' ? 'var(--color-orange)' : 'var(--color-cyan)';
                      
                      return (
                        <g 
                          key={node.id} 
                          transform={`translate(${node.x}, ${node.y})`}
                          onMouseDown={() => handleMouseDown(node.id)}
                          style={{ cursor: 'grab' }}
                        >
                          {/* Pulse ring for error nodes */}
                          {node.status === 'error' && (
                            <circle r="22" fill="none" stroke="var(--color-pink)" strokeWidth="1" opacity="0.6">
                              <animate attributeName="r" values="12;24" dur="2s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
                            </circle>
                          )}

                          {/* Outer glow ring */}
                          <circle 
                            r={isSelected ? 16 : 12} 
                            fill="var(--bg-primary)" 
                            stroke={color} 
                            strokeWidth={isSelected ? 3 : 2}
                            style={{ 
                              filter: isSelected ? `drop-shadow(0 0 8px ${color})` : 'none',
                              transition: 'r 0.1s, stroke-width 0.1s'
                            }} 
                          />

                          {/* Centered Node Type Indicator label */}
                          <circle r="3" fill={color} />

                          {/* Text Label */}
                          <text 
                            y="25" 
                            textAnchor="middle" 
                            fill="var(--text-primary)" 
                            fontSize="10" 
                            fontWeight={isSelected ? 'bold' : 'normal'}
                            style={{ pointerEvents: 'none', userSelect: 'none', filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' }}
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Node Parameter Details sidebar panel */}
              <div className="glass-panel" style={{ gridColumn: 'span 4' }}>
                <div className="panel-header">
                  <h2 className="panel-title">Node Parameter Audit</h2>
                </div>

                {selectedNodeId ? (() => {
                  const node = nodes.find(n => n.id === selectedNodeId);
                  if (!node) return null;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%', 
                          backgroundColor: node.status === 'error' ? 'var(--color-pink)' : node.status === 'warn' ? 'var(--color-orange)' : 'var(--color-green)'
                        }}></span>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>{node.label}</h3>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class: {node.type}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                        {Object.entries(node.details).map(([key, val]) => (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.01)', paddingBottom: '6px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{key}:</span>
                            <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{String(val)}</span>
                          </div>
                        ))}
                      </div>

                      {node.status !== 'normal' && (
                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.15)', borderRadius: '6px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--color-pink)', marginBottom: '4px' }}>Active Finding Alert:</div>
                          {node.id === 'disk_c' && 'C: drive free space has degraded below 15% threshold.'}
                          {node.id === 'svc_spooler' && 'Print Spooler is stopped but configured to start automatically.'}
                          {node.id === 'svc_wbiosrvc' && 'Windows Biometric service is stopped but configured as automatic.'}
                          {node.id === 'firewall' && 'Public firewall profile is disabled, compromising lateral protection.'}
                          {node.id === 'defender' && 'Real-time antimalware protection module is offline.'}
                          {node.id === 'local_admins' && 'Broader group membership than recommended limits.'}
                          {node.id === 'machine' && 'Vulnerability findings require immediate administrator remediation.'}
                          {node.id === 'pkg_python' && 'Vulnerability CVE-2023-27043 (High) requires upgrade to v3.13.'}
                          {node.id === 'pkg_git' && 'Vulnerability CVE-2023-29007 (High) requires upgrade to v2.43.'}
                          {node.id === 'pkg_nginx' && 'Critical vulnerability CVE-2023-44487 (HTTP/2 Rapid Reset) requires immediate upgrade to v1.25.3.'}
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                    Select any graph node to inspect collected attributes.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. IMPORT & LOG STREAM */}
          {activeTab === 'importer' && (
            <div className="dashboard-grid">
              {/* File uploading panel */}
              <div className="glass-panel" style={{ gridColumn: 'span 5' }}>
                <div className="panel-header">
                  <h2 className="panel-title"><Settings size={16} /> Import JSON Reports</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      Download the PowerShell collector script, execute it on your target machine to generate a unified <code>Assessment.json</code> report, and upload it here.
                    </p>
                    <a 
                      href="/Invoke-EIIPAssessment.ps1" 
                      download="Invoke-EIIPAssessment.ps1"
                      className="cyber-btn cyber-btn-primary"
                      style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '8px 16px', textDecoration: 'none', color: '#000', gap: '8px', alignItems: 'center', fontWeight: 'bold' }}
                    >
                      <TerminalIcon size={14} />
                      <span>Download Collector (PowerShell)</span>
                    </a>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div style={{ 
                    border: '2px dashed var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '32px 16px', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.01)',
                    position: 'relative'
                  }}>
                    <input 
                      type="file" 
                      multiple 
                      accept=".json,.log"
                      onChange={handleJsonUpload}
                      style={{ 
                        position: 'absolute', 
                        top: 0, left: 0, width: 100 + '%', height: 100 + '%', 
                        opacity: 0, cursor: 'pointer' 
                      }} 
                    />
                    <Globe size={32} color="var(--color-cyan)" style={{ marginBottom: '12px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Drop JSON reports here</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Supports multiple uploads</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Expected Files Checklist:</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                      <span style={{ color: 'var(--color-cyan)', fontWeight: 'bold' }}>● Assessment.json (Unified V1 Schema)</span>
                      <span style={{ color: 'var(--color-green)' }}>Recommended</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.7 }}>
                      <span>Legacy multi-file reports (EnvironmentOverview, Findings, etc.)</span>
                      <span style={{ color: 'var(--text-muted)' }}>Supported</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Console Log view */}
              <div className="glass-panel" style={{ gridColumn: 'span 7' }}>
                <div className="panel-header">
                  <h2 className="panel-title"><TerminalIcon size={16} /> Script Execution Log Stream</h2>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      className="cyber-input" 
                      value={logFilter} 
                      onChange={(e) => setLogFilter(e.target.value as 'ALL' | 'INFO' | 'WARN' | 'ERROR')}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      <option value="ALL">All Logs</option>
                      <option value="INFO">Info Only</option>
                      <option value="WARN">Warnings Only</option>
                      <option value="ERROR">Errors Only</option>
                    </select>
                    <button className="cyber-btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setLogLines([])}>Clear</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Console scrollbox */}
                  <div style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '12px', 
                    height: '240px', 
                    overflowY: 'auto',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    padding: '16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {logLines
                      .filter(line => {
                        if (logFilter === 'ALL') return true;
                        if (logFilter === 'INFO') return line.toLowerCase().includes('info');
                        if (logFilter === 'WARN') return line.toLowerCase().includes('warn') || line.toLowerCase().includes('warning');
                        if (logFilter === 'ERROR') return line.toLowerCase().includes('error') || line.toLowerCase().includes('failed');
                        return true;
                      })
                      .map((line, i) => {
                        const isErr = line.toLowerCase().includes('error') || line.toLowerCase().includes('failed');
                        const isWarn = line.toLowerCase().includes('warn') || line.toLowerCase().includes('warning');
                        let color = 'var(--text-secondary)';
                        if (isErr) color = 'var(--color-pink)';
                        else if (isWarn) color = 'var(--color-orange)';
                        return <div key={i} style={{ color }}>{line}</div>;
                      })}
                  </div>

                  {/* Form to paste log */}
                  <form onSubmit={handleLogPasteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea 
                      className="cyber-input" 
                      placeholder="Paste execution log stream here..." 
                      style={{ height: '70px', resize: 'none', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                      value={logInput}
                      onChange={(e) => setLogInput(e.target.value)}
                    />
                    <button type="submit" className="cyber-btn" style={{ alignSelf: 'flex-end', padding: '8px 16px' }}>
                      <Play size={12} />
                      <span>Parse Paste Log</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* 7. AI GUARDIAN CHAT */}
          {activeTab === 'ai' && (
            <div className="dashboard-grid">
              
              {/* Chat Interface */}
              <div className="glass-panel" style={{ gridColumn: 'span 8' }}>
                <div className="terminal-container" style={{ height: '450px' }}>
                  <div className="terminal-header">
                    <div className="terminal-dots">
                      <span className="terminal-dot" style={{ backgroundColor: 'var(--color-pink)' }}></span>
                      <span className="terminal-dot" style={{ backgroundColor: 'var(--color-orange)' }}></span>
                      <span className="terminal-dot" style={{ backgroundColor: 'var(--color-cyan)' }}></span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      SENTINEL_AI_DAEMON_SHELL v1.0.0
                    </div>
                  </div>

                  <div className="terminal-body" style={{ flex: 1 }}>
                    {messages.map((msg, idx) => (
                      <div key={idx} style={{ 
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ 
                          fontSize: '11px', 
                          color: 'var(--text-muted)', 
                          textAlign: msg.sender === 'user' ? 'right' : 'left'
                        }}>
                          {msg.sender === 'user' ? 'Commander Rajaj' : 'Sentinel AI Core'} • {msg.timestamp}
                        </div>
                        <div style={{ 
                          backgroundColor: msg.sender === 'user' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(6, 182, 212, 0.08)',
                          color: msg.sender === 'user' ? 'var(--color-blue)' : 'var(--text-primary)',
                          border: msg.sender === 'user' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(6, 182, 212, 0.2)',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          whiteSpace: 'pre-line',
                          fontFamily: msg.text.includes('---') || msg.text.includes('/') ? 'var(--font-mono)' : 'var(--font-sans)',
                          fontSize: '13px'
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef}></div>
                  </div>

                  <form className="terminal-input-line" onSubmit={handleChatSubmit}>
                    <span className="terminal-prompt">sentinel@ai-guardian:~#</span>
                    <input
                      type="text"
                      className="terminal-input"
                      placeholder="Type a query or /help..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button type="submit" className="cyber-btn" style={{ padding: '4px 10px', border: 'none', background: 'transparent' }}>
                      <Send size={16} color="var(--color-cyan)" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Smart shortcut buttons panel */}
              <div className="glass-panel" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div className="panel-header" style={{ marginBottom: '12px' }}>
                    <h2 className="panel-title">Interactive Commands</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>TARGET CONTEXT:</div>
                      <div style={{ fontWeight: 'bold' }}>{envData.ComputerName}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Findings: {findingsData.length} entries parsed</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button className="cyber-btn" style={{ justifyContent: 'flex-start' }} onClick={() => {
                        setChatInput('/status');
                      }}>
                        <Shield size={14} color="var(--color-cyan)" />
                        <span>/status diagnostic summary</span>
                      </button>

                      <button className="cyber-btn" style={{ justifyContent: 'flex-start' }} onClick={() => {
                        setChatInput('/remediate');
                      }}>
                        <CheckCircleIcon size={14} color="var(--color-cyan)" />
                        <span>/remediate action plan</span>
                      </button>

                      <button className="cyber-btn" style={{ justifyContent: 'flex-start' }} onClick={() => {
                        setChatInput('/graph');
                      }}>
                        <Globe size={14} color="var(--color-cyan)" />
                        <span>/graph topology node list</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                  <div className="panel-header" style={{ marginBottom: '12px' }}>
                    <h2 className="panel-title">AI Diagnostics Package</h2>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      className="cyber-btn cyber-btn-primary" 
                      style={{ width: '100%', padding: '10px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }} 
                      onClick={() => setIsExportWarningOpen(true)}
                    >
                      <Package size={14} />
                      <span>Generate AI Review Package</span>
                    </button>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      Downloads <code>MachineReviewPackage.zip</code> containing assessment files, catalogs, summaries, and graphs.
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                  <div className="panel-header" style={{ marginBottom: '12px' }}>
                    <h2 className="panel-title">AI Review Prompt</h2>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      className={`cyber-btn ${copiedPrompt ? 'cyber-btn-success' : ''}`}
                      style={{ width: '100%', padding: '10px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }} 
                      onClick={handleCopyPrompt}
                    >
                      <CheckCircleIcon size={14} color={copiedPrompt ? "var(--color-green)" : "currentColor"} />
                      <span>{copiedPrompt ? "Prompt Copied!" : "Copy LLM Review Prompt"}</span>
                    </button>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      Copies a structured prompt to your clipboard containing active security, capacity, and reliability findings for LLM review.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 8. SOFTWARE INTELLIGENCE */}
          {activeTab === 'software' && (
            <SoftwareIntelligence 
              demoMode={DEMO_MODE}
              assessmentLoaded={!!envDataState}
              assessmentSoftware={activeAssessmentSoftware}
              showToast={showToast}
              onUpdateOverallHealth={(diff) => {
                setHealthScoreData(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    OverallHealthScore: Math.min(100, Math.max(0, Math.round((prev.OverallHealthScore + diff) * 10) / 10))
                  };
                });
              }} 
            />
          )}

          {/* 9. SYSTEM STATUS PAGE */}
          {activeTab === 'system-status' && (
            <SystemStatusPage 
              activeAssessmentId={activeAssessmentId}
              activeMachineName={envDataState?.ComputerName || null}
              nodesCount={nodes.length}
              linksCount={graphLinks.length}
              showToast={showToast}
              onPurgeDb={() => {
                setEnvData(null);
                setFindingsData([]);
                setHealthScoreData(null);
                setRiskMatrixData([]);
                setCapacityForecastData(null);
                setRawEvidenceData([]);
                setActiveAssessmentSoftware([]);
                setActiveAssessmentId(null);
                setHistoryData([]);
                setLogLines(prev => [...prev, '[Info] Database purged. Application is now in empty state.']);
              }}
            />
          )}

          {/* 10. COMING SOON PAGES */}
          {activeTab.startsWith('coming-soon-') && (
            <ComingSoonPage featureKey={activeTab} />
          )}

        </>
      )}
      </div>
      </main>
    </div>
    
    {isRefreshModalOpen && (
      <RefreshAssessmentModal
        onClose={() => setIsRefreshModalOpen(false)}
        daemonState={daemonState}
        daemonVersion={daemonVersion}
        daemonPlatform={daemonPlatform}
        daemonError={daemonError}
        runDaemonScan={runDaemonScan}
        checkDaemonStatus={checkDaemonStatusManual}
        onSuccess={(parsedData) => {
          hasUploadedRef.current = true;
          if (parsedData.Machine) setEnvData(parsedData.Machine);
          if (parsedData.Findings) {
            const sanitized = parsedData.Findings.map((f: any) => ({
              FindingId: f.FindingId || '',
              Category: f.Category || '',
              Domain: f.Domain || '',
              Severity: f.Severity || 'Low',
              Confidence: f.Confidence || 'Medium',
              Priority: typeof f.Priority === 'number' ? f.Priority : 5,
              Title: f.Title || '',
              Description: f.Description || '',
              Evidence: Array.isArray(f.Evidence) ? f.Evidence : [],
              Impact: f.Impact || '',
              BusinessRisk: f.BusinessRisk || '',
              RootCauseHypothesis: f.RootCauseHypothesis || '',
              RecommendedRemediation: f.RecommendedRemediation || '',
              EstimatedEffort: f.EstimatedEffort || 'Medium',
              VerificationMethod: f.VerificationMethod || '',
              CreatedOn: f.CreatedOn || new Date().toISOString(),
            }));
            setFindingsData(sanitized);
          }
          if (parsedData.HealthScore) setHealthScoreData(parsedData.HealthScore);
          if (parsedData.RiskMatrix) setRiskMatrixData(parsedData.RiskMatrix);
          if (parsedData.CapacityForecast) setCapacityForecastData(parsedData.CapacityForecast);
          if (parsedData.RawEvidence) setRawEvidenceData(parsedData.RawEvidence);
          if (parsedData.Software) setActiveAssessmentSoftware(parsedData.Software);
          if (parsedData.completedRemediations) setCompletedRemediations(parsedData.completedRemediations);
          else setCompletedRemediations({});
          
          const newId = parsedData.AssessmentId || crypto.randomUUID();
          setActiveAssessmentId(newId);

          saveAssessment(parsedData).then(() => {
            getHistoricalAssessments().then(hist => {
              setHistoryData(hist);
            });
          });
          
          setLastRefresh(new Date());
          setLogLines(prev => [...prev, `[Info] Refreshed assessment state with live data for ${parsedData.Machine?.ComputerName || 'machine'}.`]);
        }}
      />
    )}

    {isReportModalOpen && (
      <ReportIssueModal 
        onClose={() => setIsReportModalOpen(false)}
        consoleErrors={consoleErrors}
        activeTab={activeTab}
        activeAssessmentId={activeAssessmentId}
        machineName={envDataState?.ComputerName || null}
        osName={envDataState?.OSName || null}
        findingsCount={findingsData.length}
        softwareCount={activeAssessmentSoftware.length}
        showToast={showToast}
      />
    )}

    {isExportWarningOpen && (
      <div className="modal-overlay" onClick={() => setIsExportWarningOpen(false)}>
        <div 
          className="glass-panel" 
          style={{ 
            width: '100%', 
            maxWidth: '520px', 
            padding: '28px', 
            border: '1px solid var(--error-500)', 
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.15)',
            background: 'var(--bg-secondary)',
            margin: '20px'
          }} 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="panel-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.15)', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 className="panel-title" style={{ color: 'var(--color-pink)' }}>
              <AlertTriangle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Sensitive Data & Privacy Warning
            </h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <p>
              You are about to export an <strong>AI Diagnostics Review Package</strong> (<code>MachineReviewPackage.zip</code>).
            </p>
            <p>
              This archive contains comprehensive host configuration metadata, including:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>• Complete environment inventory & system name details</li>
              <li>• System health scores, priorities, and technical findings</li>
              <li>• Host software catalog (including potential vulnerabilities)</li>
              <li>• Topology structure graph and dependency relationships</li>
              <li>• Local raw evidence files and custom execution logs</li>
            </ul>
            <p style={{ marginTop: '6px', color: 'var(--text-primary)', fontWeight: 500 }}>
              IMPORTANT SECURITY GUIDANCE:
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
              If you plan to paste these contents or upload this package to third-party Large Language Models (LLMs) or AI assistants for diagnostic analysis, ensure that no sensitive company secrets, hardcoded credentials, API keys, or personally identifiable information (PII) are present.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', borderTop: '1px solid var(--neutral-800)', paddingTop: '16px' }}>
            <button 
              className="cyber-btn" 
              style={{ fontSize: '12px', padding: '8px 16px' }}
              onClick={() => setIsExportWarningOpen(false)}
            >
              Cancel
            </button>
            <button 
              className="cyber-btn cyber-btn-danger" 
              style={{ 
                fontSize: '12px', 
                padding: '8px 20px', 
                fontWeight: 'bold', 
                backgroundColor: 'var(--error-500)', 
                borderColor: 'var(--error-700)',
                color: 'white'
              }}
              onClick={() => {
                setIsExportWarningOpen(false);
                handleExportPackage();
              }}
            >
              <Package size={14} style={{ marginRight: '6px' }} />
              Acknowledge & Export
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Toast Container Stack */}
    <div className="toast-container" role="log" aria-live="polite">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast-message toast-${toast.type}`} role="status">
          <span>{toast.message}</span>
          <button className="toast-close-btn" onClick={() => removeToast(toast.id)} aria-label="Close notification">×</button>
        </div>
      ))}
    </div>
  </div>
  );
}

export default App;
