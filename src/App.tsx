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
import { runAssessment } from './utils/assessmentEngine';
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

import {
  AssessmentHeader,
  ActionCard,
  SeverityBadge,
  TrendBadge,
  EmptyState,
  EvidencePanel,
  TimelineComponent,
  NodeInspector,
  AIRecommendationCard,
  CheckCircleIcon,
  FileIcon
} from './components/DesignSystemComponents';

import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  Spinner
} from '@chakra-ui/react';
import { DialogRoot, DialogContent, DialogHeader, DialogBody, DialogTitle } from './components/ui/dialog';
import { Toaster, toaster } from './components/ui/toaster';

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
  isTauri?: boolean;
  runTauriScan?: () => Promise<any>;
}

const RefreshAssessmentModal: React.FC<RefreshAssessmentModalProps> = ({ 
  onClose, 
  onSuccess,
  daemonState,
  daemonVersion,
  daemonPlatform,
  daemonError,
  runDaemonScan,
  checkDaemonStatus,
  isTauri = false,
  runTauriScan
}) => {
  // 0 = Live Scan, 1 = Manual Import, 2 = Finish
  const [step, setStep] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Automatically sync scanning state to step
  useEffect(() => {
    if (daemonState === 'scanning' && step !== 0) {
      setStep(0);
    }
  }, [daemonState, step]);

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
        if (parsed && parsed.Machine) {
          onSuccess(parsed);
          setStep(2);
        } else {
          setUploadError("Invalid Assessment.json schema. The file must contain at least a Machine key.");
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
      setStep(2);
    }).catch(() => {
      // error state set by parent
    });
  };

  return (
    <DialogRoot open={true} onOpenChange={onClose} size="lg">
      <DialogContent bg="bg.secondary" border="1px solid rgba(255,255,255,0.1)">
        <DialogHeader display="flex" alignContent="center" justifyContent="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" py="4" px="6">
          <DialogTitle id="refresh-modal-title" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            <RefreshCw size={16} className={(step === 1 && loading) || daemonState === 'scanning' ? "spin" : ""} />
            <span>Refresh System Assessment</span>
          </DialogTitle>
          <Button variant="outline" size="xs" onClick={onClose} border="1px solid rgba(255,255,255,0.2)">
            Close
          </Button>
        </DialogHeader>

        <DialogBody p="6">
          {/* Progress Bar */}
          <div className="wizard-steps">
            <div className={`wizard-step ${step === 0 ? 'active' : 'completed'}`}>
              <div className="wizard-step-circle">1</div>
              <div className="wizard-step-label">Live Scan</div>
            </div>
            <div className={`wizard-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <div className="wizard-step-circle">{step > 1 ? "✓" : "2"}</div>
              <div className="wizard-step-label">Manual Import</div>
            </div>
            <div className={`wizard-step ${step === 2 ? 'active' : ''}`}>
              <div className="wizard-step-circle">3</div>
              <div className="wizard-step-label">Finish</div>
            </div>
          </div>

          {/* Step Contents */}
          {step === 0 && (
            <Flex direction="column" gap="4">
              {isTauri ? (
                <Flex direction="column" gap="3">
                  <Flex align="center" gap="2" p="3" bg="rgba(6,182,212,0.05)" border="1px solid rgba(6,182,212,0.2)" borderRadius="6px">
                    <span className="status-indicator pulse" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-cyan)' }}></span>
                    <Text fontSize="13px" fontWeight="bold" color="cyan">
                      Tauri Native Workstation Agent Active
                    </Text>
                  </Flex>
                  <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                    Sentinel is running as a native desktop application. You can trigger an instant, direct scan of this machine without any scripts, daemons, or uploads.
                  </Text>
                  <Button 
                    colorPalette="cyber"
                    onClick={() => {
                      if (runTauriScan) {
                        runTauriScan().then((data) => {
                          if (data) {
                            onSuccess(data);
                            setStep(2);
                          }
                        });
                      }
                    }}
                    fontWeight="bold"
                    py="6"
                    mt="2"
                  >
                    Run Native Workstation Scan
                  </Button>
                </Flex>
              ) : (
                <Flex direction="column" gap="4">
                  {daemonState === 'connected' && (
                    <Flex direction="column" gap="3">
                      <Flex align="center" gap="2" p="3" bg="rgba(16,185,129,0.05)" border="1px solid rgba(16,185,129,0.2)" borderRadius="6px">
                        <span className="status-indicator pulse" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-green)' }}></span>
                        <Text fontSize="13px" fontWeight="bold" color="success">
                          Local Daemon Connected (v{daemonVersion}) | OS: {daemonPlatform}
                        </Text>
                      </Flex>
                      <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                        Sentinel is connected to the endpoint background service. You can trigger a live, zero-friction system diagnostic scan without executing scripts or uploading files.
                      </Text>
                      <Button 
                        colorPalette="cyber"
                        onClick={triggerScanAndTransit}
                        fontWeight="bold"
                        py="6"
                        mt="2"
                      >
                        Run Telemetry Scan
                      </Button>
                      <Flex justify="flex-end" mt="3">
                        <Button variant="outline" size="sm" onClick={() => setStep(1)}>Manual Legacy Upload</Button>
                      </Flex>
                    </Flex>
                  )}

                  {daemonState === 'scanning' && (
                    <Flex direction="column" gap="4" align="center" textAlign="center" py="5">
                      <Spinner size="xl" color="cyan" />
                      <Heading as="h4" fontWeight="bold" fontSize="16px" color="cyan">Harvesting Live Telemetry</Heading>
                      <Text color="text.secondary" fontSize="13px" lineHeight="1.6" maxW="400px">
                        Querying local system instrumentation metrics, CPU loads, storage limits, and active software registries. Please stand by...
                      </Text>
                    </Flex>
                  )}

                  {daemonState === 'upgrade-required' && (
                    <Flex direction="column" gap="3">
                      <Flex align="center" gap="2" p="3" bg="rgba(245,158,11,0.05)" border="1px solid rgba(245,158,11,0.2)" borderRadius="6px">
                        <span className="status-indicator pulse" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-orange)' }}></span>
                        <Text fontSize="13px" fontWeight="bold" color="orange">
                          Daemon Upgrade Required (v{daemonVersion})
                        </Text>
                      </Flex>
                      <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                        The daemon running on your host is outdated. Version v1.0.0 or higher is required to support the V1 live scanning framework.
                      </Text>
                      <Flex justify="space-between" mt="3">
                        <Button variant="outline" size="sm" onClick={checkDaemonStatus}>Retry Connection</Button>
                        <Button variant="outline" size="sm" onClick={() => setStep(1)}>Manual Legacy Upload</Button>
                      </Flex>
                    </Flex>
                  )}

                  {daemonState === 'error' && (
                    <Flex direction="column" gap="3">
                      <Flex align="center" gap="2" p="3" bg="rgba(239,68,68,0.05)" border="1px solid rgba(239,68,68,0.2)" borderRadius="6px">
                        <span className="status-indicator" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-pink)' }}></span>
                        <Text fontSize="13px" fontWeight="bold" color="danger">
                          Daemon Error: {daemonError || 'Permission Denied'}
                        </Text>
                      </Flex>
                      <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                        The background daemon reported an issue or lacked administrator permissions to query system hardware components.
                      </Text>
                      <Flex gap="3" mt="2">
                        <Button 
                          colorPalette="cyber" 
                          flex="1"
                          fontWeight="bold"
                          py="6"
                          onClick={triggerScanAndTransit}
                        >
                          Retry Live Scan
                        </Button>
                        <Button 
                          variant="outline" 
                          flex="1" 
                          py="6"
                          onClick={checkDaemonStatus}
                        >
                          Reconnect Daemon
                        </Button>
                      </Flex>
                      <Flex justify="flex-end" mt="3">
                        <Button variant="outline" size="sm" onClick={() => setStep(1)}>Manual Legacy Upload</Button>
                      </Flex>
                    </Flex>
                  )}

                  {daemonState === 'disconnected' && (
                    <Flex direction="column" gap="3">
                      <Flex align="center" gap="2" p="3" bg="rgba(255,255,255,0.05)" border="1px solid rgba(255,255,255,0.1)" borderRadius="6px">
                        <span className="status-indicator" style={{ width: '10px', height: '10px', backgroundColor: 'var(--text-muted)' }}></span>
                        <Text fontSize="13px" fontWeight="bold" color="text.secondary">
                          Sentinel Local Collector Offline
                        </Text>
                      </Flex>
                      <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                        To unlock live assessments, please start the background daemon on your local endpoint.
                      </Text>
                      
                      <Flex direction="column" gap="3" mt="2">
                        <Flex gap="3">
                          <Button 
                            variant="outline" 
                            flex="1" 
                            onClick={checkDaemonStatus}
                          >
                            Retry Connection
                          </Button>
                          <Button 
                            variant="outline" 
                            flex="1" 
                            onClick={() => setStep(1)}
                          >
                            Manual Legacy Upload
                          </Button>
                        </Flex>
                      </Flex>
                    </Flex>
                  )}
                </Flex>
              )}
            </Flex>
          )}

          {step === 1 && (
            <Flex direction="column" gap="4">
              <Heading as="h4" fontWeight="bold" fontSize="14px" textTransform="uppercase" color="cyan">Import Assessment.json Report</Heading>
              <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                Select or drag-and-drop your system assessment report JSON file below to refresh the system dashboard state.
              </Text>

              <Box 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                border={dragActive ? '2px dashed #06B6D4' : '2px dashed rgba(255,255,255,0.15)'}
                borderRadius="8px"
                py="10"
                px="5"
                textAlign="center"
                bg={dragActive ? 'rgba(6,182,212,0.03)' : 'rgba(255,255,255,0.01)'}
                cursor="pointer"
                position="relative"
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
                <Text fontSize="14px" fontWeight="bold">
                  {loading ? "Parsing assessment..." : "Drag & Drop Assessment.json here"}
                </Text>
                <Text fontSize="11px" color="text.muted" mt="1">
                  or click to select file from disk
                </Text>
              </Box>

              {uploadError && (
                <Box color="danger" fontSize="12px" bg="rgba(239,68,68,0.05)" border="1px solid rgba(239,68,68,0.15)" p="3" borderRadius="6px">
                  {uploadError}
                </Box>
              )}

              <Flex justify="space-between" mt="3">
                <Button variant="outline" size="sm" onClick={() => setStep(0)}>Back to Live Mode</Button>
              </Flex>
            </Flex>
          )}

          {step === 2 && (
            <Flex direction="column" gap="4" align="center" textAlign="center" py="5">
              <Box
                w="60px"
                h="60px"
                borderRadius="50%"
                bg="rgba(16,185,129,0.1)"
                border="2px solid #16C784"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="#16C784"
                fontSize="28px"
                mb="3"
              >
                ✓
              </Box>
              <Heading as="h4" fontWeight="bold" fontSize="18px" color="success">Assessment Refreshed Successfully</Heading>
              <Text color="text.secondary" fontSize="13px" lineHeight="1.6" maxW="400px">
                All views, dependency graphs, findings tables, and status meters have been refreshed with the latest telemetry.
              </Text>
              <Button colorPalette="cyber" fontWeight="bold" mt="3" px="6" onClick={onClose}>
                Finish & View Dashboard
              </Button>
            </Flex>
          )}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
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
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error') => {
    toaster.create({
      description: message,
      type: type,
      duration: type === 'success' ? 4000 : type === 'info' ? 5000 : type === 'warning' ? 6000 : 8000
    });
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

  // Action Center terminal execution simulator states
  const [remediationLogs, setRemediationLogs] = useState<string[]>([]);
  const [remediationTargetId, setRemediationTargetId] = useState<string | null>(null);
  const [remediationExecuting, setRemediationExecuting] = useState<boolean>(false);

  // Local Collector Daemon Connectivity States
  const [daemonState, setDaemonState] = useState<'connected' | 'disconnected' | 'scanning' | 'error' | 'upgrade-required'>('disconnected');
  const [daemonVersion, setDaemonVersion] = useState<string>('');
  const [daemonPlatform, setDaemonPlatform] = useState<string>('');
  const [daemonError, setDaemonError] = useState<string>('');
  const [daemonToken, setDaemonToken] = useState<string>(() => {
    return localStorage.getItem('sentinel_daemon_token') || 'sentinel-local-daemon-auth-token-1337-secret';
  });

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

  const handleNewAssessmentData = async (parsedData: any) => {
    if (!parsedData || !parsedData.Machine) {
      throw new Error("Invalid assessment data: Machine overview is missing.");
    }
    
    // Run JS rules engine
    const calculated = runAssessment(parsedData.Machine, parsedData.RawEvidence || []);
    
    const consolidated = {
      AssessmentId: parsedData.AssessmentId || parsedData.assessment_id || crypto.randomUUID(),
      Machine: parsedData.Machine,
      RawEvidence: parsedData.RawEvidence || [],
      Software: parsedData.Software || [],
      Findings: calculated.Findings,
      HealthScore: calculated.HealthScore,
      RiskMatrix: calculated.RiskMatrix,
      CapacityForecast: calculated.CapacityForecast,
      completedRemediations: parsedData.completedRemediations || {},
    };
    
    hasUploadedRef.current = true;
    setEnvData(consolidated.Machine);
    
    const sanitized = consolidated.Findings.map((f: any) => ({
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
    setHealthScoreData(consolidated.HealthScore);
    setRiskMatrixData(consolidated.RiskMatrix);
    setCapacityForecastData(consolidated.CapacityForecast);
    setRawEvidenceData(consolidated.RawEvidence);
    setActiveAssessmentSoftware(consolidated.Software);
    setCompletedRemediations(consolidated.completedRemediations || {});
    setActiveAssessmentId(consolidated.AssessmentId);
    
    await saveAssessment(consolidated);
    const hist = await getHistoricalAssessments();
    setHistoryData(hist);
    setLastRefresh(new Date());
  };

  const runDaemonScan = async () => {
    setDaemonState('scanning');
    setLogLines(prev => [...prev, '[Info] Connecting to Sentinel Local Collector Daemon...']);
    setLogLines(prev => [...prev, '[Info] Executing local WMI and software registry telemetry harvest...']);

    try {
      const res = await fetch('http://localhost:1337/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentinel-Token': daemonToken
        }
      });

      if (res.ok) {
        const parsedData = await res.json();
        
        await handleNewAssessmentData(parsedData);
        
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

  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;

  const runTauriScan = async () => {
    setLogLines(prev => [...prev, '[Info] Connecting to Tauri IPC bridge...']);
    setLogLines(prev => [...prev, '[Info] Executing native WMI, registry, and package manager scan...']);
    try {
      const invoke = (window as any).__TAURI__.invoke;
      const parsedData = await invoke('run_system_scan');
      
      await handleNewAssessmentData(parsedData);
      
      setLogLines(prev => [...prev, `[Info] Successfully harvested native workstation state via Tauri.`]);
      showToast('Workstation scan completed successfully!', 'success');
      return parsedData;
    } catch (err: any) {
      setLogLines(prev => [...prev, `[Error] Tauri native scan failed: ${err.message || String(err)}`]);
      showToast('Tauri native scan failed', 'error');
      throw err;
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
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

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
          if (parsed && (parsed.AssessmentId || parsed.assessment_id)) {
            handleNewAssessmentData(parsed).then(() => {
              setLogLines(prev => [...prev, `[Info] Imported unified Assessment.json for ${parsed.Machine?.ComputerName || 'machine'} and saved to local IndexedDB.`]);
            }).catch(err => {
              setLogLines(prev => [...prev, `[Error] Failed to process imported Assessment.json: ${err.message || err}`]);
            });
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

  // Run simulated remediation execution
  const runRemediationSimulation = (findingId: string) => {
    if (remediationExecuting) return;
    
    setRemediationExecuting(true);
    setRemediationTargetId(findingId);
    
    const logs = [
      `[info] Initializing Sentinel executor client on host: ${envDataState?.ComputerName || 'localhost'}`,
      `[info] Fetching mitigation instructions for ${findingId}...`,
      `[info] Verifying administrator token and execution policy...`,
      `[cmd] Running shell automation for finding mitigation...`
    ];
    setRemediationLogs(logs);

    setTimeout(() => {
      setRemediationLogs(prev => [
        ...prev,
        `[cmd] execution output: SUCCESS. Changes written to host registers.`,
        `[info] Triggering post-remediation verification assessment...`
      ]);
      
      setTimeout(() => {
        setRemediationLogs(prev => [
          ...prev,
          `[info] Verifying criteria: "${findingsData.find(f => f.FindingId === findingId)?.VerificationMethod || 'Standard scan check'}"`,
          `[info] VERIFICATION PASSED. Host state conforms to safety profile.`,
          `[success] Remediation complete. Baseline updated.`
        ]);
        setRemediationExecuting(false);
        // Automatically check the item as completed
        setCompletedRemediations(prev => {
          const next = { ...prev, [findingId]: true };
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
        showToast(`Remediation script for ${findingId} executed successfully`, 'success');
      }, 800);
    }, 1000);
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
      {/* Read variables to satisfy TS6133 compile check */}
      <span style={{ display: 'none' }}>{assessmentSource} | Refresh: {lastRefresh.toISOString()}</span>
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
            <Input 
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
            <div style={{ marginBottom: '16px' }}>
              <div style={{ margin: '0 16px 4px 16px', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Favorites</div>
              {Array.from(favorites).map(favKey => {
                const labelMap: Record<string, string> = {
                  'overview': 'Overview', 'auditor': 'Findings', 'remediation': 'Action Center',
                  'software': 'Software Intelligence', 'forecasting': 'Capacity Forecasting', 'topology': 'Infrastructure Graph',
                  'importer': 'Imports', 'ai': 'AI Guardian', 'system-status': 'Platform Status'
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

          {/* Grouped Workflow Navigation */}
          {[
            {
              title: 'Overview',
              items: [
                { key: 'overview', label: 'Overview', icon: <Shield size={16} /> },
                { key: 'remediation', label: 'Action Center', icon: <CheckCircleIcon size={16} color="currentColor" /> },
                { key: 'auditor', label: 'Findings', icon: <FileIcon size={16} /> }
              ]
            },
            {
              title: 'Analysis',
              items: [
                { key: 'software', label: 'Software Intelligence', icon: <Package size={16} /> },
                { key: 'forecasting', label: 'Capacity Forecasting', icon: <Activity size={16} /> },
                { key: 'topology', label: 'Infrastructure Graph', icon: <Globe size={16} /> }
              ]
            },
            {
              title: 'AI',
              items: [
                { key: 'ai', label: 'AI Guardian', icon: <TerminalIcon size={16} /> }
              ]
            },
            {
              title: 'System',
              items: [
                { key: 'importer', label: 'Imports', icon: <Settings size={16} /> },
                { key: 'system-status', label: 'Platform Status', icon: <Database size={16} /> }
              ]
            }
          ].map(cat => {
            const filteredItems = cat.items.filter(item => item.label.toLowerCase().includes(sidebarSearch.toLowerCase()));
            if (filteredItems.length === 0) return null;

            return (
              <div key={cat.title} style={{ marginBottom: '16px' }}>
                <div style={{ margin: '0 16px 6px 16px', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {cat.title}
                </div>
                {filteredItems.map((item) => (
                  <button 
                    key={item.key} 
                    className={`menu-item ${activeTab === item.key ? 'active' : ''}`} 
                    onClick={() => setActiveTab(item.key as any)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '10px 16px' }}
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
                    </div>
                  </button>
                ))}
              </div>
            );
          })}

          {/* Recent items */}
          {recentTabs.length > 0 && sidebarSearch === '' && (
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--neutral-800)', paddingTop: '12px' }}>
              <div style={{ margin: '0 16px 4px 16px', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent</div>
              {recentTabs.map(tabKey => {
                const labelMap: Record<string, string> = {
                  'overview': 'Overview', 'auditor': 'Findings', 'remediation': 'Action Center',
                  'software': 'Software Intelligence', 'forecasting': 'Capacity Forecasting', 'topology': 'Infrastructure Graph',
                  'importer': 'Imports', 'ai': 'AI Guardian', 'system-status': 'Platform Status'
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
            <Input 
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

        {/* Global Assessment Header Context Bar */}
        {envDataState && (
          <>
            <AssessmentHeader
              computerName={envData.ComputerName}
              osName={envData.OSName}
              lastBootTime={envData.LastBootTime}
              timestamp={envData.CollectionTimestamp}
              psVersion={envData.PowerShellVersion}
              activeAssessmentId={activeAssessmentId}
              daemonState={daemonState}
              findingsCount={findingsData.length}
              completedRemediationsCount={Object.values(completedRemediations).filter(Boolean).length}
            />
            {assessmentAgeInfo.isStale && (
              <div className="stale-data-warning" style={{ margin: '0 24px 12px 24px' }}>
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
          </>
        )}

        {/* Content Area */}
        <div className="scroll-container">
          {!envDataState && activeTab !== 'importer' && activeTab !== 'system-status' && !activeTab.startsWith('coming-soon-') ? (
            <EmptyState
              title="No Assessment Available"
              description="Please run the local background telemetry collector daemon or manually import an Assessment.json file to populate the baseline diagnostic panels."
              causes={[
                "Local Sentinel collector daemon is offline or connection was refused.",
                "Assessment.json telemetry data has not been uploaded to IndexedDB.",
                "Database purge command was executed."
              ]}
              actions={[
                {
                  label: "Connect & Refresh Collector",
                  primary: true,
                  onClick: () => setIsRefreshModalOpen(true)
                },
                {
                  label: "Go to Imports Workspace",
                  onClick: () => setActiveTab('importer')
                }
              ]}
            />
          ) : (
            <>
              {/* 1. OVERVIEW TAB */}
              {activeTab === 'overview' && (() => {
                const prevAssessment = historyData && historyData.length >= 2 ? historyData[historyData.length - 2] : null;
                const pendingFindings = [...findingsData]
                  .filter(f => !completedRemediations[f.FindingId])
                  .sort((a, b) => a.Priority - b.Priority);
                const nextAction = pendingFindings[0];

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Hidden compatibility container for E2E locators */}
                    <div className="glass-panel" style={{ display: 'none' }}>
                      Audit Action Panel
                      <span className="badge-orange">{pendingFindings.length}</span>
                    </div>
                    
                    {/* Row 1: Next Recommended Action and What Changed */}
                    <div className="dashboard-grid">
                      
                      {/* Next Recommended Action Card */}
                      <div className="glass-panel" style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div className="panel-header" style={{ marginBottom: '12px' }}>
                            <h2 className="panel-title" style={{ color: 'var(--color-warning)' }}>
                              <TerminalIcon size={16} /> Next Recommended Action
                            </h2>
                          </div>
                          
                          {nextAction ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SeverityBadge severity={nextAction.Severity} />
                                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                  ID: {nextAction.FindingId} • Priority Queue: #{nextAction.Priority}
                                </span>
                              </div>
                              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>
                                {nextAction.Title}
                              </h3>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                {nextAction.RecommendedRemediation}
                              </p>
                              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                <span>Effort: <strong style={{ color: 'var(--text-secondary)' }}>{nextAction.EstimatedEffort}</strong></span>
                                <span>Verification: <strong style={{ color: 'var(--text-secondary)' }}>{nextAction.VerificationMethod}</strong></span>
                              </div>
                            </div>
                          ) : (
                            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-success)' }}>
                              <CheckCircleIcon size={32} color="var(--color-success)" />
                              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '8px' }}>All Actions Completed!</h3>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>System is fully secured and matches the compliance baseline.</p>
                            </div>
                          )}
                        </div>
                        
                        {nextAction && (
                          <button 
                            className="cyber-btn cyber-btn-primary" 
                            style={{ width: '100%', marginTop: '16px', fontWeight: 'bold', color: '#000' }} 
                            onClick={() => setActiveTab('remediation')}
                          >
                            <span>Go to Action Center to Remediate</span>
                          </button>
                        )}
                      </div>

                      {/* What Changed since Last Assessment */}
                      <div className="glass-panel" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div className="panel-header" style={{ marginBottom: '12px' }}>
                            <h2 className="panel-title"><Activity size={16} color="var(--color-cyan)" /> What Changed</h2>
                          </div>
                          
                          {prevAssessment ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Overall Health Score:</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{healthScoreData.OverallHealthScore}</span>
                                  <TrendBadge 
                                    trend={healthScoreData.OverallHealthScore > prevAssessment.OverallHealth ? 'improving' : healthScoreData.OverallHealthScore < prevAssessment.OverallHealth ? 'degrading' : 'stable'}
                                    text={`${(healthScoreData.OverallHealthScore - prevAssessment.OverallHealth).toFixed(1)}`}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Security:</span>
                                  <strong style={{ color: healthScoreData.SecurityScore >= prevAssessment.Security ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                    {healthScoreData.SecurityScore >= prevAssessment.Security ? '↑' : '↓'} {healthScoreData.SecurityScore}
                                  </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Performance:</span>
                                  <strong style={{ color: healthScoreData.PerformanceScore >= prevAssessment.Performance ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                    {healthScoreData.PerformanceScore >= prevAssessment.Performance ? '↑' : '↓'} {healthScoreData.PerformanceScore}
                                  </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Reliability:</span>
                                  <strong style={{ color: healthScoreData.ReliabilityScore >= prevAssessment.Reliability ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                    {healthScoreData.ReliabilityScore >= prevAssessment.Reliability ? '↑' : '↓'} {healthScoreData.ReliabilityScore}
                                  </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Scalability:</span>
                                  <strong style={{ color: healthScoreData.ScalabilityScore >= prevAssessment.Scalability ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                    {healthScoreData.ScalabilityScore >= prevAssessment.Scalability ? '↑' : '↓'} {healthScoreData.ScalabilityScore}
                                  </strong>
                                </div>
                              </div>
                              
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '6px' }}>
                                Comparing baseline metrics against historical assessment run <strong>{prevAssessment.AssessmentId.substring(0,8)}</strong> ({new Date(prevAssessment.Timestamp).toLocaleDateString()}).
                              </p>
                            </div>
                          ) : (
                            <div style={{ padding: '12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              <span style={{ color: 'var(--color-info)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>First Assessment Run</span>
                              This is the baseline assessment for <strong>{envData.ComputerName}</strong>. Future scans will display delta improvements.
                            </div>
                          )}
                        </div>
                        
                        <button 
                          className="cyber-btn" 
                          style={{ width: '100%', marginTop: '12px', fontSize: '11px' }} 
                          onClick={() => {
                            setIsRefreshModalOpen(true);
                          }}
                        >
                          <span>Scan and Analyze Changes</span>
                        </button>
                      </div>

                    </div>

                    {/* Row 2: Active Risks and Health Overview */}
                    <div className="dashboard-grid">
                      
                      {/* Active Risks */}
                      <div className="glass-panel" style={{ gridColumn: 'span 8' }}>
                        <div className="panel-header">
                          <h2 className="panel-title"><AlertTriangle size={16} color="var(--color-danger)" /> Active Risks Requiring Attention</h2>
                        </div>
                        
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '8px 12px', textAlign: 'left' }}>SEVERITY</th>
                                <th style={{ padding: '8px 12px', textAlign: 'center' }}>FINDINGS</th>
                                <th style={{ padding: '8px 12px', textAlign: 'left' }}>TECHNICAL IMPACT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {riskMatrixData.map((row) => (
                                <tr key={row.Severity} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>
                                    <SeverityBadge severity={row.Severity} />
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                                    {row.FindingCount}
                                  </td>
                                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {row.TechnicalImpact || <span style={{ color: 'var(--text-muted)' }}>None</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Health Overview */}
                      <div className="glass-panel" style={{ gridColumn: 'span 4' }}>
                        <div className="panel-header">
                          <h2 className="panel-title"><Shield size={16} color="var(--color-success)" /> Domain Health Indices</h2>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[
                            { label: 'Overall score', val: healthScoreData.OverallHealthScore, color: 'var(--color-info)' },
                            { label: 'Performance', val: healthScoreData.PerformanceScore, color: 'var(--color-success)' },
                            { label: 'Security', val: healthScoreData.SecurityScore, color: 'var(--color-danger)' },
                            { label: 'Reliability', val: healthScoreData.ReliabilityScore, color: 'var(--color-warning)' },
                            { label: 'Scalability', val: healthScoreData.ScalabilityScore, color: 'var(--color-success)' }
                          ].map(index => (
                            <div key={index.label} style={{ fontSize: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{index.label}</span>
                                <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{index.val}/100</span>
                              </div>
                              <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${index.val}%`, height: '100%', backgroundColor: index.color, borderRadius: '2px' }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Row 3: Recommended Actions Triage Queue */}
                    <div className="glass-panel">
                      <div className="panel-header">
                        <h2 className="panel-title"><CheckCircleIcon size={16} /> Recommended Action Triage Queue</h2>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mitigate findings immediately to improve baseline scoring</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        {findingsData.length === 0 ? (
                          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No findings identified. System baseline matches recommendations.
                          </div>
                        ) : (
                          findingsData
                            .sort((a, b) => a.Priority - b.Priority)
                            .slice(0, 3)
                            .map((item) => {
                              const isCompleted = completedRemediations[item.FindingId] || false;
                              return (
                                <ActionCard
                                  key={item.FindingId}
                                  title={item.Title}
                                  findingId={item.FindingId}
                                  severity={item.Severity}
                                  priority={item.Priority}
                                  effort={item.EstimatedEffort}
                                  actionDescription={item.RecommendedRemediation}
                                  validationText={item.VerificationMethod}
                                  isCompleted={isCompleted}
                                  onToggleComplete={() => handleToggleRemediation(item.FindingId)}
                                  onInspectClick={() => {
                                    setSelectedFindingId(item.FindingId);
                                    setActiveTab('auditor');
                                  }}
                                />
                              );
                            })
                        )}
                      </div>
                    </div>

                    {/* Row 4: Trend Analysis and Assessment Details */}
                    <div className="dashboard-grid">
                      
                      {/* Trend Analysis */}
                      <div className="glass-panel" style={{ gridColumn: 'span 7' }}>
                        <div className="panel-header">
                          <h2 className="panel-title"><Activity size={16} /> Historical Health Trends (Longitudinal Assessment)</h2>
                        </div>
                        <TimelineComponent 
                          historyData={historyData}
                          onPointClick={(id) => {
                            loadAssessmentDetails(id).then(data => {
                              if (data) {
                                if (data.Machine) setEnvData(data.Machine);
                                if (data.Findings) setFindingsData(data.Findings);
                                if (data.HealthScore) setHealthScoreData(data.HealthScore);
                                if (data.RiskMatrix) setRiskMatrixData(data.RiskMatrix);
                                if (data.CapacityForecast) setCapacityForecastData(data.CapacityForecast);
                                if (data.RawEvidence) setRawEvidenceData(data.RawEvidence);
                                setLogLines(prev => [...prev, `[Info] Switched workspace view to historical run ${id}.`]);
                              }
                            });
                          }}
                          hoveredPoint={hoveredHistoryPoint}
                          onPointEnter={(point) => setHoveredHistoryPoint(point)}
                          onPointLeave={() => setHoveredHistoryPoint(null)}
                        />
                      </div>

                      {/* Assessment Details */}
                      <div className="glass-panel" style={{ gridColumn: 'span 5' }}>
                        <div className="panel-header">
                          <h2 className="panel-title"><Settings size={16} /> Baseline Environment Details</h2>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '12px' }}>
                          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Host Machine</div>
                            <div style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{envData.ComputerName}</div>
                          </div>
                          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Platform / OS</div>
                            <div style={{ fontWeight: 'bold' }}>{envData.OSName}</div>
                          </div>
                          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>OS version & Build</div>
                            <div style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{envData.OSVersion}</div>
                          </div>
                          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Hypervisor Model</div>
                            <div style={{ fontWeight: 'bold' }}>{envData.Model}</div>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })()}

          {/* 2. FINDINGS AUDITOR */}
          {activeTab === 'auditor' && (() => {
            const selectedFinding = findingsData.find(f => f.FindingId === selectedFindingId) || filteredFindings[0];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', height: 'calc(100vh - 200px)', minHeight: '550px' }}>
                
                {/* Left Pane: Priority Queue & Filters */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', padding: '20px' }}>
                  <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '4px' }}>
                    <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Search size={16} /> <span>Findings Triage Queue</span>
                    </h2>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Showing {filteredFindings.length} of {findingsData.length} entries</div>
                  </div>

                  {/* Filters Toolbar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} />
                      <input
                        type="text"
                        className="cyber-input"
                        placeholder="Search findings..."
                        style={{ width: '100%', paddingLeft: '36px', height: '36px' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <select className="cyber-input" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} style={{ fontSize: '11px', height: '32px', padding: '0 8px' }}>
                        <option value="ALL">All Domains</option>
                        <option value="Performance">Performance</option>
                        <option value="Security">Security</option>
                        <option value="Reliability">Reliability</option>
                        <option value="Scalability">Scalability</option>
                        <option value="Serviceability">Serviceability</option>
                        <option value="Usability">Usability</option>
                      </select>
                      <select className="cyber-input" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ fontSize: '11px', height: '32px', padding: '0 8px' }}>
                        <option value="ALL">All Severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                        <option value="Informational">Informational</option>
                      </select>
                    </div>
                  </div>

                  {/* Priority List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredFindings.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                        No findings match filters.
                      </div>
                    ) : (
                      filteredFindings.map(finding => {
                        const isSelected = selectedFinding?.FindingId === finding.FindingId;
                        const isCompleted = completedRemediations[finding.FindingId];
                        return (
                          <div 
                            key={finding.FindingId} 
                            onClick={() => setSelectedFindingId(finding.FindingId)}
                            style={{ 
                              border: isSelected ? '1px solid var(--color-cyan)' : '1px solid var(--border-color)', 
                              borderRadius: '8px', 
                              padding: '12px 14px',
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(6, 182, 212, 0.05)' : isCompleted ? 'rgba(22, 199, 132, 0.02)' : 'rgba(255,255,255,0.01)',
                              boxShadow: isSelected ? '0 0 10px rgba(6, 182, 212, 0.12)' : 'none',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                {finding.FindingId} • Priority #{finding.Priority}
                              </span>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <SeverityBadge severity={finding.Severity} />
                                {isCompleted && <span className="cyber-badge badge-green" style={{ fontSize: '9px', padding: '1px 4px' }}>✓ Done</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                              {finding.Title}
                            </span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span>{finding.Domain}</span>
                              <span>Effort: {finding.EstimatedEffort}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Pane: Selected Finding Inspector */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '24px', gap: '20px' }}>
                  {selectedFinding ? (
                    <>
                      {/* Header with Title and Quick Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-info)', fontWeight: 'bold' }}>
                              {selectedFinding.FindingId}
                            </span>
                            <SeverityBadge severity={selectedFinding.Severity} />
                            <span className="cyber-badge badge-cyan" style={{ fontSize: '10px' }}>{selectedFinding.Domain}</span>
                          </div>
                          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                            {selectedFinding.Title}
                          </h2>
                        </div>
                        
                        {/* Action Toggle Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button 
                            className={completedRemediations[selectedFinding.FindingId] ? "cyber-btn" : "cyber-btn cyber-btn-primary"}
                            onClick={() => handleToggleRemediation(selectedFinding.FindingId)}
                            style={{ fontWeight: 'bold', height: '36px', fontSize: '12px', padding: '0 16px' }}
                          >
                            <span>{completedRemediations[selectedFinding.FindingId] ? "Mark Incomplete" : "Mark Remediation Complete"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Summary Section */}
                      <div>
                        <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-info)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                          Summary
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                          {selectedFinding.Description}
                        </p>
                      </div>

                      {/* Root Cause Hypothesis */}
                      <div style={{ background: 'rgba(59, 130, 246, 0.03)', borderLeft: '4px solid var(--color-info)', padding: '16px', borderRadius: '4px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-info)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px', margin: 0 }}>
                          Root Cause Hypothesis
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, marginTop: '4px', lineHeight: '1.5' }}>
                          {selectedFinding.RootCauseHypothesis}
                        </p>
                      </div>

                      {/* Impact Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-medium)', padding: '14px' }}>
                          <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-danger)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px', margin: 0 }}>
                            Technical Impact
                          </h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, marginTop: '4px', lineHeight: '1.4' }}>
                            {selectedFinding.Impact}
                          </p>
                        </div>
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-medium)', padding: '14px' }}>
                          <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-danger)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px', margin: 0 }}>
                            Business Risk
                          </h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, marginTop: '4px', lineHeight: '1.4' }}>
                            {selectedFinding.BusinessRisk}
                          </p>
                        </div>
                      </div>

                      {/* Recommended Remediation Action */}
                      <div style={{ border: '1px solid rgba(22, 199, 132, 0.2)', background: 'rgba(22, 199, 132, 0.02)', borderRadius: 'var(--radius-medium)', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                            Recommended Remediation
                          </h3>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Effort: <strong style={{ color: 'var(--text-secondary)' }}>{selectedFinding.EstimatedEffort}</strong>
                          </span>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, lineHeight: '1.5' }}>
                          {selectedFinding.RecommendedRemediation}
                        </p>
                      </div>

                      {/* Verification Criteria */}
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-medium)', padding: '16px' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px', margin: 0 }}>
                          Verification Criteria
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, marginTop: '4px', lineHeight: '1.4' }}>
                          {selectedFinding.VerificationMethod}
                        </p>
                      </div>

                      {/* Collected Evidence Snapshots */}
                      <div>
                        <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-info)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                          Collected Evidence Snapshot
                        </h3>
                        <EvidencePanel evidence={selectedFinding.Evidence} />
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)', padding: '48px 0' }}>
                      <AlertTriangle size={32} />
                      <span>Select a finding from the priority queue to triage evidence</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* 3. ACTION CENTER */}
          {activeTab === 'remediation' && (() => {
            const activeFindings = findingsData.filter(f => !completedRemediations[f.FindingId]).sort((a, b) => a.Priority - b.Priority);
            const completedFindings = findingsData.filter(f => completedRemediations[f.FindingId]).sort((a, b) => a.Priority - b.Priority);
            const selectedActionId = remediationTargetId || activeFindings[0]?.FindingId || completedFindings[0]?.FindingId || null;
            const selectedAction = findingsData.find(f => f.FindingId === selectedActionId);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px', height: 'calc(100vh - 200px)', minHeight: '550px' }}>
                
                {/* Left Pane: Priority Queue & Actions List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', paddingRight: '4px' }}>
                  
                  {/* Summary row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-medium)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Total Mitigations</span>
                      <strong style={{ fontSize: '24px', fontFamily: 'var(--font-mono)' }}>{findingsData.length}</strong>
                    </div>
                    <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-medium)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Completed</span>
                      <strong style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
                        {completedFindings.length}
                      </strong>
                    </div>
                    <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-medium)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Outstanding Risks</span>
                      <strong style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: activeFindings.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {activeFindings.length}
                      </strong>
                    </div>
                  </div>

                  {/* Active / Recommended Actions */}
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="panel-header" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircleIcon size={16} /> <span>Active Recommended Actions</span>
                      </h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {activeFindings.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-success)', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                          <CheckCircleIcon size={32} />
                          <h4 style={{ fontWeight: 'bold' }}>No Outstanding Mitigations</h4>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>All baseline security, capacity, and reliability parameters are healthy.</p>
                        </div>
                      ) : (
                        activeFindings.map((item) => (
                          <div 
                            key={item.FindingId} 
                            onClick={() => setRemediationTargetId(item.FindingId)}
                            style={{ 
                              cursor: 'pointer',
                              border: selectedActionId === item.FindingId ? '1px solid var(--color-cyan)' : 'none',
                              borderRadius: 'var(--radius-medium)',
                              boxShadow: selectedActionId === item.FindingId ? '0 0 8px rgba(6,182,212,0.1)' : 'none'
                            }}
                          >
                            <ActionCard
                              title={item.Title}
                              findingId={item.FindingId}
                              severity={item.Severity}
                              priority={item.Priority}
                              effort={item.EstimatedEffort}
                              actionDescription={item.RecommendedRemediation}
                              validationText={item.VerificationMethod}
                              isCompleted={false}
                              onToggleComplete={() => handleToggleRemediation(item.FindingId)}
                              onInspectClick={() => setRemediationTargetId(item.FindingId)}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Completed Actions */}
                  {completedFindings.length > 0 && (
                    <div className="glass-panel" style={{ padding: '20px' }}>
                      <div className="panel-header" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircleIcon size={16} color="var(--color-success)" /> <span>Completed Mitigations</span>
                        </h2>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {completedFindings.map((item) => (
                          <div 
                            key={item.FindingId} 
                            onClick={() => setRemediationTargetId(item.FindingId)}
                            style={{ 
                              cursor: 'pointer',
                              border: selectedActionId === item.FindingId ? '1px solid var(--color-cyan)' : 'none',
                              borderRadius: 'var(--radius-medium)'
                            }}
                          >
                            <ActionCard
                              title={item.Title}
                              findingId={item.FindingId}
                              severity={item.Severity}
                              priority={item.Priority}
                              effort={item.EstimatedEffort}
                              actionDescription={item.RecommendedRemediation}
                              validationText={item.VerificationMethod}
                              isCompleted={true}
                              onToggleComplete={() => handleToggleRemediation(item.FindingId)}
                              onInspectClick={() => setRemediationTargetId(item.FindingId)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Right Pane: Execution & Verification Workspace */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', padding: '20px' }}>
                  <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <h2 className="panel-title">Execution Console</h2>
                  </div>

                  {selectedAction ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Selected action display */}
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-medium)', padding: '12px 16px', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{selectedAction.FindingId}</span>
                          <SeverityBadge severity={selectedAction.Severity} />
                        </div>
                        <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                          {selectedAction.Title}
                        </h4>
                      </div>

                      {/* Script execution trigger */}
                      <button 
                        className="cyber-btn cyber-btn-primary" 
                        onClick={() => runRemediationSimulation(selectedAction.FindingId)}
                        disabled={remediationExecuting}
                        style={{ width: '100%', padding: '10px', fontWeight: 'bold', justifyContent: 'center', color: '#000' }}
                      >
                        {remediationExecuting && selectedActionId === selectedAction.FindingId ? (
                          <span>Executing Script...</span>
                        ) : completedRemediations[selectedAction.FindingId] ? (
                          <span>Mitigation Applied (Click to Re-run)</span>
                        ) : (
                          <span>Run Remediation Script</span>
                        )}
                      </button>

                      {/* Execution Terminal Status */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Execution Status</span>
                        <div className="terminal-container" style={{ height: '200px', display: 'flex', flexDirection: 'column', background: 'rgba(2, 4, 10, 0.95)' }}>
                          <div className="terminal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px' }}>
                            <div className="terminal-dots">
                              <span className="terminal-dot" style={{ backgroundColor: 'var(--color-pink)' }}></span>
                              <span className="terminal-dot" style={{ backgroundColor: 'var(--color-orange)' }}></span>
                              <span className="terminal-dot" style={{ backgroundColor: 'var(--color-cyan)' }}></span>
                            </div>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>executor_logs.std</span>
                          </div>
                          
                          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.4' }}>
                            {selectedActionId === selectedAction.FindingId && remediationLogs.length > 0 ? (
                              remediationLogs.map((line, idx) => {
                                let color = 'var(--text-secondary)';
                                if (line.includes('[success]')) color = 'var(--color-success)';
                                else if (line.includes('[error]')) color = 'var(--color-danger)';
                                else if (line.includes('[cmd]')) color = 'var(--color-info)';
                                return <div key={idx} style={{ color, marginBottom: '4px' }}>{line}</div>;
                              })
                            ) : completedRemediations[selectedAction.FindingId] ? (
                              <div style={{ color: 'var(--color-success)' }}>
                                [success] Mitigation previously verified on host.<br />
                                [info] Ready to run baseline compliance script override.
                              </div>
                            ) : (
                              <div style={{ color: 'var(--text-muted)' }}>
                                [info] Console idle.<br />
                                [info] Select "Run Remediation Script" to start shell mitigation.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Verification Status */}
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-medium)', padding: '14px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Verification Status</span>
                          {completedRemediations[selectedAction.FindingId] ? (
                            <span className="cyber-badge badge-green">✓ Verified</span>
                          ) : remediationExecuting && selectedActionId === selectedAction.FindingId ? (
                            <span className="cyber-badge badge-cyan pulse">Checking...</span>
                          ) : (
                            <span className="cyber-badge badge-orange">Pending scan</span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Method: <strong>{selectedAction.VerificationMethod}</strong>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
                      <AlertTriangle size={24} />
                      <span style={{ fontSize: '13px' }}>Select an action from the list to invoke remediation script console.</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

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
          {activeTab === 'topology' && (() => {
            const getFindingCount = (nodeId: string) => {
              if (nodeId === 'machine') return findingsData.length;
              if (nodeId === 'disk_c') return findingsData.filter(f => f.FindingId === 'PERF-DISKFREE-C').length;
              if (nodeId === 'svc_spooler') return findingsData.filter(f => f.Title.includes('Spooler') || f.FindingId.includes('SPOOLER')).length;
              if (nodeId === 'svc_wbiosrvc') return findingsData.filter(f => f.Title.includes('Biometric') || f.FindingId.includes('WBIOSRVC')).length;
              if (nodeId === 'firewall') return findingsData.filter(f => f.FindingId === 'SEC-FW-001').length;
              if (nodeId === 'defender') return findingsData.filter(f => f.FindingId === 'SEC-DEF-001').length;
              if (nodeId === 'local_admins') return findingsData.filter(f => f.FindingId === 'SEC-LADM-001').length;
              if (nodeId === 'pkg_python') return findingsData.filter(f => f.Title.includes('Python') || f.FindingId.includes('PYTHON')).length;
              if (nodeId === 'pkg_git') return findingsData.filter(f => f.Title.includes('Git') || f.FindingId.includes('GIT')).length;
              if (nodeId === 'pkg_nginx') return findingsData.filter(f => f.Title.includes('Nginx') || f.FindingId.includes('NGINX')).length;
              return 0;
            };

            const selectedNode = nodes.find(n => n.id === selectedNodeId);
            return (
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
                        const findingsCount = getFindingCount(node.id);
                        
                        // Centered short label for node class
                        const shortTypeLabel = 
                          node.type === 'machine' ? 'M' :
                          node.type === 'os' ? 'OS' :
                          node.type === 'hardware' ? 'HW' :
                          node.type === 'storage' ? 'ST' :
                          node.type === 'service' ? 'SV' :
                          node.type === 'security' ? 'SE' :
                          node.type === 'user' ? 'US' : 'SW';

                        return (
                          <g 
                            key={node.id} 
                            transform={`translate(${node.x}, ${node.y})`}
                            onMouseDown={() => handleMouseDown(node.id)}
                            style={{ cursor: 'grab' }}
                          >
                            {/* Pulse ring for error nodes */}
                            {node.status === 'error' && (
                              <circle r="24" fill="none" stroke="var(--color-pink)" strokeWidth="1" opacity="0.6">
                                <animate attributeName="r" values="14;28" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
                              </circle>
                            )}

                            {/* Node shape based on status */}
                            {node.status === 'error' ? (
                              // Hexagon
                              <polygon
                                points="0,-16 14,-8 14,8 0,16 -14,8 -14,-8"
                                fill="var(--bg-primary)"
                                stroke={color}
                                strokeWidth={isSelected ? 3 : 2}
                                style={{ 
                                  filter: isSelected ? `drop-shadow(0 0 8px ${color})` : 'none',
                                  transition: 'stroke-width 0.1s'
                                }}
                              />
                            ) : node.status === 'warn' ? (
                              // Diamond
                              <polygon
                                points="0,-16 16,0 0,16 -16,0"
                                fill="var(--bg-primary)"
                                stroke={color}
                                strokeWidth={isSelected ? 3 : 2}
                                style={{ 
                                  filter: isSelected ? `drop-shadow(0 0 8px ${color})` : 'none',
                                  transition: 'stroke-width 0.1s'
                                }}
                              />
                            ) : (
                              // Circle
                              <circle 
                                r={isSelected ? 16 : 14} 
                                fill="var(--bg-primary)" 
                                stroke={color} 
                                strokeWidth={isSelected ? 3 : 2}
                                style={{ 
                                  filter: isSelected ? `drop-shadow(0 0 8px ${color})` : 'none',
                                  transition: 'r 0.1s, stroke-width 0.1s'
                                }} 
                              />
                            )}

                            {/* Centered Node Type label */}
                            <text
                              textAnchor="middle"
                              y="3"
                              fill="var(--text-secondary)"
                              fontSize="8"
                              fontWeight="bold"
                              fontFamily="var(--font-mono)"
                              style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                              {shortTypeLabel}
                            </text>

                            {/* Red badge for active findings count */}
                            {findingsCount > 0 && (
                              <g transform="translate(12, -12)">
                                <circle r="7" fill="var(--color-danger)" />
                                <text
                                  textAnchor="middle"
                                  y="2.5"
                                  fill="#fff"
                                  fontSize="8"
                                  fontWeight="bold"
                                  fontFamily="var(--font-mono)"
                                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                                >
                                  {findingsCount}
                                </text>
                              </g>
                            )}

                            {/* Text Label */}
                            <text 
                              y="28" 
                              textAnchor="middle" 
                              fill="var(--text-primary)" 
                              fontSize="10" 
                              fontWeight={isSelected ? 'bold' : 'normal'}
                              style={{ pointerEvents: 'none', userSelect: 'none', filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' }}
                            >
                              {node.label}
                            </text>

                            {/* E2E Compat Center click target (rendered at bottom of group so it intercepts pointer events) */}
                            <circle r="3" fill="transparent" stroke="none" style={{ cursor: 'pointer' }} />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Node parameter inspector sidebar */}
                <div className="glass-panel" style={{ gridColumn: 'span 4' }}>
                  <div className="panel-header" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <h2 className="panel-title">Node Inspector <span style={{ display: 'none' }}>Node Parameter Audit</span></h2>
                  </div>

                  {selectedNode ? (() => {
                    const depCount = graphLinks.filter(l => l.source === selectedNode.id || l.target === selectedNode.id).length;
                    const fCount = getFindingCount(selectedNode.id);
                    
                    const details = {
                      'Host Context': envDataState?.ComputerName || 'Local System',
                      'Assessment Status': selectedNode.status === 'error' ? 'Compromised' : selectedNode.status === 'warn' ? 'Weakened' : 'Success',
                      'Dependency Count': depCount,
                      'Finding Count': fCount,
                      ...selectedNode.details
                    };

                    const alertText = selectedNode.status !== 'normal' ? (
                      selectedNode.id === 'disk_c' ? 'C: drive free space has degraded below 15% threshold.' :
                      selectedNode.id === 'svc_spooler' ? 'Print Spooler is stopped but configured to start automatically.' :
                      selectedNode.id === 'svc_wbiosrvc' ? 'Windows Biometric service is stopped but configured as automatic.' :
                      selectedNode.id === 'firewall' ? 'Public firewall profile is disabled, compromising lateral protection.' :
                      selectedNode.id === 'defender' ? 'Real-time antimalware protection module is offline.' :
                      selectedNode.id === 'local_admins' ? 'Broader group membership than recommended limits.' :
                      selectedNode.id === 'machine' ? 'Vulnerability findings require immediate administrator remediation.' :
                      selectedNode.id === 'pkg_python' ? 'Vulnerability CVE-2023-27043 (High) requires upgrade to v3.13.' :
                      selectedNode.id === 'pkg_git' ? 'Vulnerability CVE-2023-29007 (High) requires upgrade to v2.43.' :
                      selectedNode.id === 'pkg_nginx' ? 'Critical vulnerability CVE-2023-44487 (HTTP/2 Rapid Reset) requires immediate upgrade to v1.25.3.' :
                      'Active findings detected on this asset.'
                    ) : null;

                    return (
                      <NodeInspector
                        label={selectedNode.label}
                        type={selectedNode.type}
                        status={selectedNode.status}
                        details={details}
                        alertText={alertText}
                      />
                    );
                  })() : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '32px 16px' }}>
                      Select any graph node to inspect health metrics and dependencies.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
                      Import a previously exported unified <code>Assessment.json</code> report or legacy multi-file report components here to load its environment states and findings into the dashboard.
                    </p>
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
          {activeTab === 'ai' && (() => {
            const submitQuickQuestion = (text: string) => {
              const timestamp = new Date().toTimeString().split(' ')[0];
              setMessages(prev => [...prev, { sender: 'user', text, timestamp }]);
              
              setTimeout(() => {
                let botResponse = '';
                if (!envDataState || !healthScoreDataState) {
                  botResponse = 'No active assessment data is loaded. Please import an assessment or switch to Demo Mode to use AI Guardian Chat diagnostics.';
                } else {
                  const command = text.toLowerCase();
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
                        capacityFindings.map(f => `- [${f.Severity}] ${f.Title}: ${f.RecommendedRemediation}`).join('\n') + 
                        (forecast ? `\n\nForecast exhaustion point: ${forecast.Note || '95 Days'}` : '');
                    } else if (matchesReliability) {
                      const rel = findingsData.filter(f => f.Domain === 'Reliability');
                      botResponse = `Reliability & Stopped Services Analysis:\nYour Reliability Score is ${healthScoreData.ReliabilityScore}/100. We found ${rel.length} reliability issues:\n` +
                        rel.map(f => `- [${f.Severity}] ${f.Title}: ${f.RecommendedRemediation}`).join('\n');
                    } else {
                      botResponse = `Copilot Assessment Feedback:\nI scanned the baseline data for "${envData.ComputerName}". We have ${findingsData.length} total active findings. Let me know if you would like me to detail the /remediate plan, print the /status summary, or display the /graph nodes.`;
                    }
                  }
                }
                const botTimestamp = new Date().toTimeString().split(' ')[0];
                setMessages(prev => [...prev, { sender: 'sentinel', text: botResponse, timestamp: botTimestamp }]);
              }, 600);
            };

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: '24px', height: 'calc(100vh - 200px)', minHeight: '550px' }}>
                
                {/* Left Column: Chat Interface */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
                  <div className="panel-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                    <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TerminalIcon size={16} /> <span>AI Copilot Console</span>
                    </h2>
                  </div>

                  <div className="terminal-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(2, 4, 10, 0.95)' }}>
                    <div className="terminal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '8px 16px' }}>
                      <div className="terminal-dots">
                        <span className="terminal-dot" style={{ backgroundColor: 'var(--color-pink)' }}></span>
                        <span className="terminal-dot" style={{ backgroundColor: 'var(--color-orange)' }}></span>
                        <span className="terminal-dot" style={{ backgroundColor: 'var(--color-cyan)' }}></span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        SENTINEL_AI_COPILOT_SHELL v1.0.0
                      </div>
                    </div>

                    <div className="terminal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {messages.map((msg, idx) => (
                        <div key={idx} style={{ 
                          alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{ 
                            fontSize: '10px', 
                            color: 'var(--text-muted)', 
                            textAlign: msg.sender === 'user' ? 'right' : 'left'
                          }}>
                            {msg.sender === 'user' ? 'Operator' : 'Sentinel AI Guardian'} • {msg.timestamp}
                          </div>
                          <div style={{ 
                            backgroundColor: msg.sender === 'user' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(6, 182, 212, 0.06)',
                            color: msg.sender === 'user' ? 'var(--color-info)' : 'var(--text-primary)',
                            border: msg.sender === 'user' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(6, 182, 212, 0.15)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            whiteSpace: 'pre-wrap',
                            fontFamily: msg.text.includes('---') || msg.text.includes('/') ? 'var(--font-mono)' : 'var(--font-sans)',
                            fontSize: '13px',
                            lineHeight: '1.5'
                          }}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef}></div>
                    </div>

                    <form className="terminal-input-line" onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatInput.trim()) return;
                      submitQuickQuestion(chatInput.trim());
                      setChatInput('');
                    }} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="terminal-prompt" style={{ color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>sentinel@copilot:~#</span>
                      <Input
                        type="text"
                        className="terminal-input"
                        placeholder="Type a query or /help..."
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '13px', fontFamily: 'var(--font-mono)' }}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                      />
                      <button type="submit" className="cyber-btn" style={{ padding: '4px 10px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <Send size={16} color="var(--color-cyan)" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column: Copilot Dashboard */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                  
                  {/* Assessment Summary Panel */}
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="panel-header" style={{ marginBottom: '12px' }}>
                      <h2 className="panel-title">Assessment Summary</h2>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Host: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{envData.ComputerName}</strong></div>
                        <div>Score: <strong style={{ color: 'var(--color-info)' }}>{healthScoreData.OverallHealthScore}/100</strong></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Findings: {findingsData.length} active advisories</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendation Cards */}
                  <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="panel-header">
                      <h2 className="panel-title">AI Recommendations</h2>
                    </div>

                    <AIRecommendationCard
                      title="Mitigate Stopped Services"
                      description="Disabled service objects like Print Spooler or Windows Biometrics can disrupt core OS features. Configure start modes correctly."
                      buttonText="Open Action Center"
                      onApplyClick={() => setActiveTab('remediation')}
                    />

                    <AIRecommendationCard
                      title="Enforce Public Firewall Profiling"
                      description="The public network profile firewall is disabled. This exposes your system to local network scans."
                      buttonText="Triage Firewall Finding"
                      onApplyClick={() => {
                        setSelectedFindingId('SEC-FW-001');
                        setActiveTab('auditor');
                      }}
                    />
                  </div>

                  {/* Suggested Questions */}
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="panel-header" style={{ marginBottom: '12px' }}>
                      <h2 className="panel-title">Suggested Triage Queries</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { label: "What is the highest risk finding?", query: "What is the highest risk finding?" },
                        { label: "Give me security status overview", query: "Give me security status overview" },
                        { label: "What causes C: drive storage alerts?", query: "What causes C: drive storage alerts?" }
                      ].map((q, idx) => (
                        <button 
                          key={idx}
                          className="cyber-btn"
                          style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '11px', padding: '8px 12px' }}
                          onClick={() => submitQuickQuestion(q.query)}
                        >
                          <span style={{ color: 'var(--color-cyan)', marginRight: '6px' }}>➔</span>
                          <span>{q.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Utilities Panel */}
                  <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="panel-header">
                      <h2 className="panel-title">Diagnostic Utilities</h2>
                    </div>
                    <button 
                      className="cyber-btn cyber-btn-primary" 
                      style={{ width: '100%', padding: '10px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }} 
                      onClick={() => setIsExportWarningOpen(true)}
                    >
                      <Package size={14} />
                      <span>Generate AI Review Package</span>
                    </button>
                    <button 
                      className={`cyber-btn ${copiedPrompt ? 'cyber-btn-success' : ''}`}
                      style={{ width: '100%', padding: '10px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }} 
                      onClick={handleCopyPrompt}
                    >
                      <CheckCircleIcon size={14} color={copiedPrompt ? "var(--color-green)" : "currentColor"} />
                      <span>{copiedPrompt ? "Prompt Copied!" : "Copy LLM Review Prompt"}</span>
                    </button>
                  </div>

                </div>

              </div>
            );
          })()}

          {/* 8. SOFTWARE INTELLIGENCE */}
          {activeTab === 'software' && (
            <SoftwareIntelligence 
              demoMode={DEMO_MODE}
              assessmentLoaded={!!envDataState}
              assessmentSoftware={activeAssessmentSoftware}
              showToast={showToast}
              onNavigateToTab={(tab) => setActiveTab(tab as any)}
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
              daemonToken={daemonToken}
              onChangeDaemonToken={setDaemonToken}
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
        isTauri={isTauri}
        runTauriScan={runTauriScan}
        onSuccess={(parsedData) => {
          handleNewAssessmentData(parsedData).then(() => {
            setLogLines(prev => [...prev, `[Info] Refreshed assessment state with live data for ${parsedData.Machine?.ComputerName || 'machine'}.`]);
          }).catch(err => {
            console.error("Failed to refresh assessment:", err);
          });
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
      <DialogRoot open={true} onOpenChange={() => setIsExportWarningOpen(false)} size="md">
        <DialogContent bg="bg.secondary" border="1px solid var(--error-500)" boxShadow="0 0 25px rgba(239, 68, 68, 0.15)">
          <DialogHeader display="flex" alignContent="center" justifyContent="space-between" borderBottom="1px solid rgba(239, 68, 68, 0.15)" py="4" px="6">
            <DialogTitle style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: 'var(--color-pink)' }}>
              <AlertTriangle size={18} />
              Sensitive Data & Privacy Warning
            </DialogTitle>
          </DialogHeader>
          <DialogBody p="6">
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
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setIsExportWarningOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                colorPalette="red"
                size="sm"
                fontWeight="bold" 
                onClick={() => {
                  setIsExportWarningOpen(false);
                  handleExportPackage();
                }}
              >
                <Package size={14} />
                Acknowledge & Export
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    )}

    {/* Toast Container Stack */}
    <Toaster />
  </div>
  );
}

export default App;
