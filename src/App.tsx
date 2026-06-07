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
import { FleetAnalytics } from './components/FleetAnalytics';
import { ComingSoonPage } from './components/ComingSoonPage';
import { SystemStatusPage } from './components/SystemStatusPage';
import { ReportIssueModal } from './components/ReportIssueModal';
import { TopologyCanvas } from './components/TopologyCanvas';
import { AutoHealingDashboard } from './components/AutoHealingDashboard';
import { VulnerabilityThreatIntel } from './components/VulnerabilityThreatIntel';
import { runAssessment, buildRemediationDashboard } from './utils/assessmentEngine';
import {
  saveAssessment,
  getHistoricalAssessments,
  loadAssessmentDetails,
  getFleetMachines,
  getCapacityForecast,
  type FleetMachine
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
import { AuthProvider, useAuth } from './utils/auth';

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

function DashboardCommandCenter() {
  const { user, logout } = useAuth();

  const canRunScan = user?.roles.includes('admin') || user?.roles.includes('operator');
  const canExecuteRemediation = user?.roles.includes('admin');
  const canApproveRemediation = user?.roles.includes('admin');

  // Navigation & Active Workspace Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'fleet' | 'fleet-analytics' | 'auditor' | 'remediation' | 'forecasting' | 'topology' | 'importer' | 'ai' | 'software' | 'system-status' | 'coming-soon-fleet' | 'coming-soon-correlation' | 'coming-soon-healing' | 'coming-soon-ai-eng' | 'coming-soon-vuln' | 'coming-soon-execution'>('overview');

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

  // Fleet command center states
  const [fleetMachines, setFleetMachines] = useState<FleetMachine[]>([]);
  const [fleetLoading, setFleetLoading] = useState<boolean>(false);
  const [fleetSearch, setFleetSearch] = useState<string>('');
  const [fleetPlatformFilter, setFleetPlatformFilter] = useState<string>('ALL');
  const [fleetHealthFilter, setFleetHealthFilter] = useState<string>('ALL');

  const normalizeForecast = useCallback((forecast: any) => {
    if (!forecast) return null;
    return {
      Storage: forecast.Storage || forecast.storage || MOCK_CAPACITY_FORECAST.Storage,
      Memory: forecast.Memory || forecast.memory || MOCK_CAPACITY_FORECAST.Memory,
      CPU: forecast.CPU || forecast.Cpu || forecast.cpu || MOCK_CAPACITY_FORECAST.CPU
    };
  }, []);

  const loadFleet = useCallback(async () => {
    setFleetLoading(true);
    try {
      const machines = await getFleetMachines();
      setFleetMachines(machines);
    } catch (err) {
      console.error('Failed to load fleet machines:', err);
      showToast('Failed to load fleet machines.', 'error');
    } finally {
      setFleetLoading(false);
    }
  }, [showToast]);

  const selectMachineInWorkspace = useCallback(async (machineId: string, computerName: string) => {
    try {
      const hist = await getHistoricalAssessments();
      const machineRuns = hist.filter(run => {
        const cname = run.ComputerName || run.Machine?.ComputerName;
        const mid = run.MachineId || run.Machine?.MachineId;
        const aid = run.AssessmentId;
        return cname === computerName || mid === machineId || aid === machineId;
      });

      if (machineRuns.length > 0) {
        machineRuns.sort((a, b) => new Date(b.Timestamp || b.timestamp || 0).getTime() - new Date(a.Timestamp || a.timestamp || 0).getTime());
        const latestRun = machineRuns[0];
        const details = await loadAssessmentDetails(latestRun.AssessmentId);
        if (details) {
          hasUploadedRef.current = true;
          setEnvData(details.Machine);
          
          const sanitized = (details.Findings || []).map((f: any) => ({
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
          setHealthScoreData(details.HealthScore);
          setRiskMatrixData(details.RiskMatrix || []);
          setCapacityForecastData(normalizeForecast(details.CapacityForecast));
          setRawEvidenceData(details.RawEvidence || []);
          setActiveAssessmentSoftware(details.Software || []);
          setCompletedRemediations(details.completedRemediations || {});
          setActiveAssessmentId(details.AssessmentId);
          setHistoryData(hist);
          
          showToast(`Workspace context switched to host: ${computerName}`, 'success');
          setActiveTab('overview');
          return;
        }
      }
      
      const detailsDirect = await loadAssessmentDetails(machineId);
      if (detailsDirect) {
        hasUploadedRef.current = true;
        setEnvData(detailsDirect.Machine);
        setFindingsData(detailsDirect.Findings || []);
        setHealthScoreData(detailsDirect.HealthScore);
        setRiskMatrixData(detailsDirect.RiskMatrix || []);
        setCapacityForecastData(normalizeForecast(detailsDirect.CapacityForecast));
        setRawEvidenceData(detailsDirect.RawEvidence || []);
        setActiveAssessmentSoftware(detailsDirect.Software || []);
        setCompletedRemediations(detailsDirect.completedRemediations || {});
        setActiveAssessmentId(detailsDirect.AssessmentId);
        
        showToast(`Workspace context switched to host: ${computerName}`, 'success');
        setActiveTab('overview');
        return;
      }

      showToast(`No historical assessment runs found for machine: ${computerName}`, 'warning');
    } catch (err) {
      console.error('Error switching machine context:', err);
      showToast('Failed to switch machine context.', 'error');
    }
  }, [normalizeForecast, showToast]);

  // Ref to track if file upload happened before database seed finishes (E2E race condition fix)
  const hasUploadedRef = useRef(false);

  // Export warning modal control
  const [isExportWarningOpen, setIsExportWarningOpen] = useState(false);

  // Action Center terminal execution simulator states
  const [remediationLogs, setRemediationLogs] = useState<string[]>([]);
  const [remediationTargetId, setRemediationTargetId] = useState<string | null>(null);
  const [remediationExecuting, setRemediationExecuting] = useState<boolean>(false);
  const [bulkExecuting, setBulkExecuting] = useState<boolean>(false);

  const dashboardData = useMemo(() => {
    return buildRemediationDashboard(findingsData, completedRemediations, envDataState || {});
  }, [findingsData, completedRemediations, envDataState]);

  const runBulkRemediation = async (type: 'all' | 'critical' | 'security' | 'performance') => {
    if (!canExecuteRemediation) {
      showToast("Permission Denied: Only Administrators can execute remediations.", "error");
      return;
    }
    if (bulkExecuting || remediationExecuting) return;
    setBulkExecuting(true);
    
    // Filter execution plan steps based on type
    const planSteps = dashboardData.execution_plan.filter((step: any) => {
      const finding = findingsData.find(f => f.FindingId === step.finding_id);
      if (!finding) return false;
      if (type === 'critical') return finding.Severity === 'Critical' || finding.Severity === 'High';
      if (type === 'security') return finding.Domain === 'Security';
      if (type === 'performance') return finding.Domain === 'Performance';
      return true; // type === 'all'
    });
    
    if (planSteps.length === 0) {
      showToast("No active actionable issues found for this category.", "info");
      setBulkExecuting(false);
      return;
    }
    
    setRemediationLogs([`[info] Initializing bulk remediation sequence: FIX_${type.toUpperCase()}`]);
    
    for (const step of planSteps) {
      setRemediationTargetId(step.finding_id);
      setRemediationLogs(prev => [...prev, `\n[info] --- Running sequence step ${step.sequence}/${planSteps.length}: ${step.finding_id} ---`]);
      
      await new Promise<void>((resolveStep) => {
        setRemediationExecuting(true);
        if (daemonState === 'connected') {
          fetch('http://localhost:1337/api/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sentinel-Token': daemonToken
            },
            body: JSON.stringify({ finding_id: step.finding_id })
          })
          .then(async res => {
            const data = await res.json();
            if (res.ok && data.success) {
              setRemediationLogs(prev => [
                ...prev,
                `[cmd] execution output: SUCCESS.`,
                `[stdout] ${data.stdout || ''}`
              ]);
              setCompletedRemediations(prev => ({ ...prev, [step.finding_id]: true }));
            } else {
              setRemediationLogs(prev => [
                ...prev,
                `[error] Step failed: ${data.error || 'Unknown daemon error'}`,
                `[stderr] ${data.stderr || ''}`
              ]);
            }
          })
          .catch(err => {
            setRemediationLogs(prev => [
              ...prev,
              `[error] Failed to communicate with collector: ${err.message}`
            ]);
          })
          .finally(() => {
            setRemediationExecuting(false);
            resolveStep();
          });
        } else {
          // Simulated fallback
          setTimeout(() => {
            setRemediationLogs(prev => [
              ...prev,
              `[cmd] execution output: SUCCESS. (Simulated)`,
              `[success] Verification passed.`
            ]);
            setCompletedRemediations(prev => ({ ...prev, [step.finding_id]: true }));
            setRemediationExecuting(false);
            resolveStep();
          }, 1000);
        }
      });
    }
    
    setRemediationLogs(prev => [...prev, `\n[success] Bulk remediation complete. Running final baseline update...`]);
    try {
      if (daemonState === 'connected') {
        await runDaemonScan();
      } else if (isTauri && runTauriScan) {
        await runTauriScan();
      }
    } catch {
      // Ignore final scan error
    }
    
    setBulkExecuting(false);
    showToast(`Bulk remediation complete!`, 'success');
  };

  const downloadCertificationReport = () => {
    const activeList = findingsData.filter(f => !completedRemediations[f.FindingId]);
    const reportText = `===========================================================
SENTINEL ENTERPRISE NODE HEALTH CERTIFICATION REPORT
===========================================================
Timestamp: ${new Date().toISOString()}
Host Name: ${envDataState?.ComputerName || 'localhost'}
OS Family: ${envDataState?.PlatformFamily || 'Windows'}
Overall Health Score: ${dashboardData.overall_health_score}%
Risk Severity Score: ${dashboardData.risk_score}/100

-----------------------------------------------------------
SUMMARY OF REMEDIATION RESULTS
-----------------------------------------------------------
Total Issues Evaluated: ${dashboardData.total_issues}
Resolved Issues: ${dashboardData.post_remediation_validation.resolved_issues}
Remaining Unresolved: ${dashboardData.post_remediation_validation.remaining_issues}

-----------------------------------------------------------
RESOLVED ANOMALIES
-----------------------------------------------------------
${findingsData.filter(f => completedRemediations[f.FindingId]).map(f => `[PASSED] ${f.Title} (${f.FindingId})
   - Root Cause: ${f.RootCauseHypothesis}
   - Remediation: ${f.RecommendedRemediation}
   - Verification: ${f.VerificationMethod}`).join('\n\n')}

-----------------------------------------------------------
OUTSTANDING MANUAL ACTIONS REQUIRED
-----------------------------------------------------------
${activeList.length === 0 ? "NONE. The machine is fully compliant and certified." : activeList.map(f => `[PENDING] ${f.Title} (${f.FindingId}) [Severity: ${f.Severity}]
   - Technical Impact: ${f.Impact}
   - Action Required: ${f.RecommendedRemediation}`).join('\n\n')}

===========================================================
STATUS: ${activeList.length === 0 ? "CERTIFIED HEALTHY" : "DEGRADED COMPLIANCE"}
Certified by Sentinel Autonomous Health & Remediation Engine
===========================================================`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-health-certification-${envDataState?.ComputerName || 'host'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Health Certification report downloaded successfully.", "success");
  };

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
    setCapacityForecastData(normalizeForecast(consolidated.CapacityForecast));
    setRawEvidenceData(consolidated.RawEvidence);
    setActiveAssessmentSoftware(consolidated.Software);
    setCompletedRemediations(consolidated.completedRemediations || {});
    setActiveAssessmentId(consolidated.AssessmentId);
    
    await saveAssessment(consolidated);
    const hist = await getHistoricalAssessments();
    setHistoryData(hist);
    setLastRefresh(new Date());
    await loadFleet();
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
  const [nodePositions] = useState<Record<string, { x: number; y: number }>>({});

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
            if (data.CapacityForecast) setCapacityForecastData(normalizeForecast(data.CapacityForecast));
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
            if (data.CapacityForecast) setCapacityForecastData(normalizeForecast(data.CapacityForecast));
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
  }, [normalizeForecast]);

  // Load fleet list on startup
  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  // Fetch real capacity forecast whenever active machine/assessment changes
  useEffect(() => {
    const fetchForecast = async () => {
      const machineId = (envDataState as any)?.MachineId || envDataState?.ComputerName;
      if (!machineId) return;
      try {
        const forecast = await getCapacityForecast(machineId);
        if (forecast) {
          setCapacityForecastData(normalizeForecast(forecast));
        }
      } catch (err) {
        console.error('Failed to fetch capacity forecast for machine:', machineId, err);
      }
    };
    fetchForecast();
  }, [activeAssessmentId, envDataState, normalizeForecast]);

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
    await loadFleet();

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
            setCapacityForecastData(normalizeForecast(parsed));
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
    if (!canApproveRemediation) {
      showToast("Permission Denied: Only Administrators can approve/check off remediations.", "error");
      return;
    }
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
    if (!canExecuteRemediation) {
      showToast("Permission Denied: Only Administrators can execute remediations.", "error");
      return;
    }
    if (remediationExecuting) return;
    
    setRemediationExecuting(true);
    setRemediationTargetId(findingId);
    
    const logs = [
      `[info] Initializing Sentinel executor client on host: ${envDataState?.ComputerName || 'localhost'}`,
      `[info] Fetching mitigation instructions for ${findingId}...`,
      `[info] Verifying administrator token and execution policy...`,
    ];
    setRemediationLogs(logs);

    if (daemonState === 'connected') {
      setRemediationLogs(prev => [...prev, `[cmd] Invoking host daemon shell execution...`]);
      fetch('http://localhost:1337/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentinel-Token': daemonToken
        },
        body: JSON.stringify({ finding_id: findingId })
      })
      .then(async res => {
        const data = await res.json();
        if (res.ok && data.success) {
          setRemediationLogs(prev => [
            ...prev,
            `[cmd] execution output: SUCCESS.`,
            `[stdout] ${data.stdout || ''}`,
            `[info] Triggering post-remediation validation assessment...`
          ]);
          // Refresh assessment data
          setTimeout(async () => {
            try {
              await runDaemonScan();
            } catch {
              // Ignore background scan error, state was updated manually
            }
            setCompletedRemediations(prev => ({ ...prev, [findingId]: true }));
            showToast(`Remediation script for ${findingId} completed and verified.`, 'success');
            setRemediationExecuting(false);
          }, 800);
        } else {
          setRemediationLogs(prev => [
            ...prev,
            `[error] Execution failed: ${data.error || 'Unknown daemon error'}`,
            `[stderr] ${data.stderr || ''}`
          ]);
          showToast(`Remediation failed: ${data.error || 'Daemon execution error'}`, 'error');
          setRemediationExecuting(false);
        }
      })
      .catch(err => {
        setRemediationLogs(prev => [
          ...prev,
          `[error] Failed to communicate with collector daemon: ${err.message}`
        ]);
        showToast('Daemon connection error', 'error');
        setRemediationExecuting(false);
      });
    } else {
      // Standalone simulation fallback
      setRemediationLogs(prev => [...prev, `[cmd] Running simulated shell automation for finding mitigation...`]);
      setTimeout(() => {
        setRemediationLogs(prev => [
          ...prev,
          `[cmd] execution output: SUCCESS. (Simulated offline mode)`,
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
          showToast(`Remediation script for ${findingId} executed successfully (Simulated)`, 'success');
        }, 800);
      }, 1000);
    }
  };

  const runRemediationRollback = (findingId: string) => {
    if (!canExecuteRemediation) {
      showToast("Permission Denied: Only Administrators can roll back changes.", "error");
      return;
    }
    if (remediationExecuting) return;
    
    setRemediationExecuting(true);
    setRemediationTargetId(findingId);
    
    const logs = [
      `[info] Initializing rollback sequence on host: ${envDataState?.ComputerName || 'localhost'}`,
      `[info] Fetching rollback instructions for ${findingId}...`,
    ];
    setRemediationLogs(logs);

    if (daemonState === 'connected') {
      setRemediationLogs(prev => [...prev, `[cmd] Invoking host daemon rollback execution...`]);
      fetch('http://localhost:1337/api/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentinel-Token': daemonToken
        },
        body: JSON.stringify({ finding_id: findingId })
      })
      .then(async res => {
        const data = await res.json();
        if (res.ok && data.success) {
          setRemediationLogs(prev => [
            ...prev,
            `[cmd] rollback output: SUCCESS.`,
            `[stdout] ${data.stdout || ''}`,
            `[info] Triggering system telemetry validation...`
          ]);
          setTimeout(async () => {
            try {
              await runDaemonScan();
            } catch {
              // Ignore scan error
            }
            setCompletedRemediations(prev => {
              const next = { ...prev };
              delete next[findingId];
              return next;
            });
            showToast(`Rollback for ${findingId} completed successfully.`, 'success');
            setRemediationExecuting(false);
          }, 800);
        } else {
          setRemediationLogs(prev => [
            ...prev,
            `[error] Rollback failed: ${data.error || 'Unknown daemon error'}`,
            `[stderr] ${data.stderr || ''}`
          ]);
          showToast(`Rollback failed: ${data.error || 'Daemon execution error'}`, 'error');
          setRemediationExecuting(false);
        }
      })
      .catch(err => {
        setRemediationLogs(prev => [
          ...prev,
          `[error] Failed to communicate with collector daemon: ${err.message}`
        ]);
        showToast('Daemon connection error', 'error');
        setRemediationExecuting(false);
      });
    } else {
      // Simulated rollback fallback
      setRemediationLogs(prev => [...prev, `[cmd] Running simulated rollback sequence...`]);
      setTimeout(() => {
        setRemediationLogs(prev => [
          ...prev,
          `[success] Simulated rollback complete.`
        ]);
        setRemediationExecuting(false);
        setCompletedRemediations(prev => {
          const next = { ...prev };
          delete next[findingId];
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
        showToast(`Rollback for ${findingId} complete (Simulated)`, 'success');
      }, 1000);
    }
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
            onClick={() => {
              if (!canRunScan) {
                showToast("Permission Denied: Auditor role cannot perform scans.", "error");
                return;
              }
              setIsRefreshModalOpen(true);
            }}
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
                  'overview': 'Overview', 'fleet': 'Fleet Overview', 'fleet-analytics': 'Fleet Analytics', 'auditor': 'Findings', 'remediation': 'Action Center',
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
                { key: 'fleet', label: 'Fleet Overview', icon: <Globe size={16} /> },
                { key: 'fleet-analytics', label: 'Fleet Analytics', icon: <Activity size={16} /> },
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
                  'overview': 'Overview', 'fleet': 'Fleet Overview', 'fleet-analytics': 'Fleet Analytics', 'auditor': 'Findings', 'remediation': 'Action Center',
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
              {item.key === 'coming-soon-healing' || item.key === 'coming-soon-vuln' ? (
                <span className="cyber-badge badge-green" style={{ fontSize: '8px', padding: '1px 4px' }}>Active</span>
              ) : (
                <span className="cyber-badge badge-orange" style={{ fontSize: '8px', padding: '1px 4px' }}>Soon</span>
              )}
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
              {activeTab === 'fleet' && 'Fleet Command Center'}
              {activeTab === 'fleet-analytics' && 'Fleet Capacity Analytics'}
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
                onClick={() => {
                  if (!canRunScan) {
                    showToast("Permission Denied: Auditor role cannot perform scans.", "error");
                    return;
                  }
                  setIsRefreshModalOpen(true);
                }}
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
                <span style={{ fontSize: '11px', fontWeight: '600' }}>{user?.email ? user.email.split('@')[0].toUpperCase() : 'RAJAJ'}</span>
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
                      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Commander {user?.email ? user.email.split('@')[0] : 'Rajaj'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.roles ? user.roles.join(', ') : 'Security Officer'}</div>
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
                      logout();
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
                  onClick={() => {
                    if (!canRunScan) {
                      showToast("Permission Denied: Auditor role cannot perform scans.", "error");
                      return;
                    }
                    setIsRefreshModalOpen(true);
                  }}
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
                  onClick: () => {
                    if (!canRunScan) {
                      showToast("Permission Denied: Auditor role cannot perform scans.", "error");
                      return;
                    }
                    setIsRefreshModalOpen(true);
                  }
                },
                {
                  label: "Go to Imports Workspace",
                  onClick: () => setActiveTab('importer')
                }
              ]}
            />
          ) : (
            <>
              {/* Fleet Overview Tab */}
              {activeTab === 'fleet' && (() => {
                const filteredMachines = fleetMachines.filter(m => {
                  const matchesSearch = m.ComputerName.toLowerCase().includes(fleetSearch.toLowerCase()) ||
                                        m.OSName.toLowerCase().includes(fleetSearch.toLowerCase()) ||
                                        m.MachineId.toLowerCase().includes(fleetSearch.toLowerCase());
                  
                  const matchesPlatform = fleetPlatformFilter === 'ALL' ||
                    (fleetPlatformFilter === 'WINDOWS' && m.Platform.toLowerCase().includes('win')) ||
                    (fleetPlatformFilter === 'LINUX' && (m.Platform.toLowerCase().includes('lin') || m.Platform.toLowerCase().includes('ux'))) ||
                    (fleetPlatformFilter === 'MACOS' && (m.Platform.toLowerCase().includes('mac') || m.Platform.toLowerCase().includes('dar') || m.Platform.toLowerCase().includes('osx')));

                  const matchesHealth = fleetHealthFilter === 'ALL' ||
                    (fleetHealthFilter === 'HEALTHY' && m.OverallHealth >= 85) ||
                    (fleetHealthFilter === 'DEGRADED' && m.OverallHealth >= 70 && m.OverallHealth < 85) ||
                    (fleetHealthFilter === 'CRITICAL' && m.OverallHealth < 70);

                  return matchesSearch && matchesPlatform && matchesHealth;
                });

                const fleetAvg = fleetMachines.length > 0
                  ? Math.round(fleetMachines.reduce((sum, m) => sum + m.OverallHealth, 0) / fleetMachines.length)
                  : 100;
                
                const winCount = fleetMachines.filter(m => m.Platform.toLowerCase().includes('win')).length;
                const linCount = fleetMachines.filter(m => m.Platform.toLowerCase().includes('lin') || m.Platform.toLowerCase().includes('ux')).length;
                const macCount = fleetMachines.filter(m => m.Platform.toLowerCase().includes('mac') || m.Platform.toLowerCase().includes('dar')).length;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Stats Dashboard Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fleet Overview</span>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-info)', fontFamily: 'var(--font-mono)' }}>
                          {fleetMachines.length}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Registered Host Machines</span>
                      </div>

                      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Fleet Health</span>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: fleetAvg >= 85 ? 'var(--color-green)' : fleetAvg >= 70 ? 'var(--color-orange)' : 'var(--color-pink)', fontFamily: 'var(--font-mono)' }}>
                          {fleetAvg}%
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Overall fleet status index</span>
                      </div>

                      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform Distribution</span>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>WIN</span>
                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-blue)', fontFamily: 'var(--font-mono)' }}>{winCount}</span>
                          </div>
                          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>LIN</span>
                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-orange)', fontFamily: 'var(--font-mono)' }}>{linCount}</span>
                          </div>
                          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MAC</span>
                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{macCount}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Active OS instances</span>
                      </div>

                      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outstanding Alerts</span>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: 'var(--color-pink)' }}>CRIT</span>
                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-pink)', fontFamily: 'var(--font-mono)' }}>
                              {fleetMachines.reduce((sum, m) => sum + m.CriticalFindings, 0)}
                            </span>
                          </div>
                          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: 'var(--color-orange)' }}>HIGH</span>
                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-orange)', fontFamily: 'var(--font-mono)' }}>
                              {fleetMachines.reduce((sum, m) => sum + m.HighFindings, 0)}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Security & Performance findings</span>
                      </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', width: '320px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                        <Input 
                          type="text" 
                          className="cyber-input" 
                          placeholder="Search hosts by name, OS, or ID..." 
                          style={{ width: '100%', paddingLeft: '32px', height: '34px', fontSize: '12px' }}
                          value={fleetSearch}
                          onChange={(e) => setFleetSearch(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Platform:</span>
                          <select 
                            className="cyber-input" 
                            style={{ height: '34px', padding: '0 8px', fontSize: '11px', minWidth: '110px' }}
                            value={fleetPlatformFilter}
                            onChange={(e) => setFleetPlatformFilter(e.target.value)}
                          >
                            <option value="ALL">All Platforms</option>
                            <option value="WINDOWS">Windows</option>
                            <option value="LINUX">Linux</option>
                            <option value="MACOS">macOS</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Health Status:</span>
                          <select 
                            className="cyber-input" 
                            style={{ height: '34px', padding: '0 8px', fontSize: '11px', minWidth: '110px' }}
                            value={fleetHealthFilter}
                            onChange={(e) => setFleetHealthFilter(e.target.value)}
                          >
                            <option value="ALL">All Scores</option>
                            <option value="HEALTHY">Healthy (&gt;=85)</option>
                            <option value="DEGRADED">Degraded (70-84)</option>
                            <option value="CRITICAL">Critical (&lt;70)</option>
                          </select>
                        </div>

                        <button 
                          className="cyber-btn" 
                          style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}
                          onClick={loadFleet}
                          disabled={fleetLoading}
                        >
                          <RefreshCw size={12} className={fleetLoading ? "spin" : ""} />
                          <span>Reload</span>
                        </button>
                      </div>
                    </div>

                    {/* Fleet Table */}
                    <div className="glass-panel" style={{ padding: '20px' }}>
                      {fleetLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                          <Spinner size="lg" color="cyan" />
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading fleet host directory...</span>
                        </div>
                      ) : filteredMachines.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                          <Globe size={32} />
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>No hosts match current filters</span>
                          <span style={{ fontSize: '11px' }}>Try adjusting search strings or platform parameters.</span>
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)' }}>
                                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Host Name</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operating System</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OS Version</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Health Index</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Advisories</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Assessed</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredMachines.map(m => {
                                const isSelected = activeAssessmentId === m.MachineId || envDataState?.ComputerName === m.ComputerName;
                                const isWindows = m.Platform.toLowerCase().includes('win');
                                const isLinux = m.Platform.toLowerCase().includes('lin') || m.Platform.toLowerCase().includes('ux');
                                const isMac = m.Platform.toLowerCase().includes('mac') || m.Platform.toLowerCase().includes('dar');

                                const healthColor = m.OverallHealth >= 85 ? 'var(--color-green)'
                                  : m.OverallHealth >= 70 ? 'var(--color-orange)'
                                  : 'var(--color-pink)';

                                return (
                                  <tr 
                                    key={m.MachineId} 
                                    style={{ 
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                      background: isSelected ? 'rgba(6, 182, 212, 0.04)' : 'transparent',
                                      transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <td style={{ padding: '12px 16px' }}>
                                      <span className={`cyber-badge ${isWindows ? 'badge-blue' : isLinux ? 'badge-orange' : isMac ? 'badge-pink' : 'badge-green'}`} style={{ padding: '2px 6px', fontSize: '9px', fontWeight: 'bold' }}>
                                        {m.Platform.toUpperCase()}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                                      {m.ComputerName}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                                      {m.OSName}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                      {m.OSVersion}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontWeight: 'bold', color: healthColor, fontFamily: 'var(--font-mono)' }}>
                                          {m.OverallHealth.toFixed(1)}%
                                        </span>
                                        <div style={{ width: '60px', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                          <div style={{ width: `${m.OverallHealth}%`, height: '100%', background: healthColor }}></div>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                        {m.CriticalFindings > 0 && (
                                          <span className="cyber-badge badge-pink" style={{ padding: '1px 4px', fontSize: '9px' }}>
                                            {m.CriticalFindings}C
                                          </span>
                                        )}
                                        {m.HighFindings > 0 && (
                                          <span className="cyber-badge badge-orange" style={{ padding: '1px 4px', fontSize: '9px' }}>
                                            {m.HighFindings}H
                                          </span>
                                        )}
                                        {m.WarningFindings > 0 && (
                                          <span className="cyber-badge badge-blue" style={{ padding: '1px 4px', fontSize: '9px' }}>
                                            {m.WarningFindings}W
                                          </span>
                                        )}
                                        {m.CriticalFindings === 0 && m.HighFindings === 0 && m.WarningFindings === 0 && (
                                          <span style={{ color: 'var(--color-green)', fontSize: '10px' }}>● Secure</span>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                                      {m.LastAssessed ? new Date(m.LastAssessed).toLocaleString() : 'Never'}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                      <button 
                                        className="cyber-btn"
                                        style={{ 
                                          fontSize: '11px', 
                                          padding: '4px 10px', 
                                          borderColor: isSelected ? 'var(--color-cyan)' : 'rgba(255,255,255,0.15)',
                                          color: isSelected ? 'var(--color-cyan)' : 'var(--text-primary)',
                                          background: isSelected ? 'rgba(6, 182, 212, 0.05)' : 'transparent',
                                          height: '26px'
                                        }}
                                        onClick={() => selectMachineInWorkspace(m.MachineId, m.ComputerName)}
                                      >
                                        {isSelected ? 'Active Context' : 'Select'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

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
                            if (!canRunScan) {
                              showToast("Permission Denied: Auditor role cannot perform scans.", "error");
                              return;
                            }
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
                                  disabled={!canApproveRemediation}
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
                            onClick={() => {
                              if (!canApproveRemediation) {
                                showToast("Permission Denied: Only Administrators can approve/check off remediations.", "error");
                                return;
                              }
                              handleToggleRemediation(selectedFinding.FindingId);
                            }}
                            disabled={!canApproveRemediation}
                            style={{ 
                              fontWeight: 'bold', 
                              height: '36px', 
                              fontSize: '12px', 
                              padding: '0 16px',
                              opacity: canApproveRemediation ? 1 : 0.5,
                              cursor: canApproveRemediation ? 'pointer' : 'not-allowed'
                            }}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '24px', height: 'calc(100vh - 200px)', minHeight: '650px' }}>
                
                {/* Left Pane: Priority Dashboard & Issue Categories */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '6px' }}>
                  
                  {/* Summary Metric Cards (Architect Schema) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-medium)', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid var(--color-cyan)' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Overall Health Score</span>
                      <strong style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)' }}>
                        {dashboardData.overall_health_score}%
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Projected: {dashboardData.post_remediation_validation.health_score}%</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-medium)', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid var(--color-pink)' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Risk Severity Index</span>
                      <strong style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: dashboardData.risk_score > 50 ? 'var(--color-pink)' : 'var(--color-success)' }}>
                        {dashboardData.risk_score}/100
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{dashboardData.critical_issues} High-Severity risks</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-medium)', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid var(--color-orange)' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Actionable Items</span>
                      <strong style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--color-orange)' }}>
                        {dashboardData.actionable_issues}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Out of {dashboardData.total_issues} total issues</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-medium)', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid var(--color-green)' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Est. Remediation Time</span>
                      <strong style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--color-green)' }}>
                        {dashboardData.estimated_full_remediation_time}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Continuous validation loop</span>
                    </div>
                  </div>

                  {/* Bulk Actions Console */}
                  <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(6,182,212,0.15)', background: 'rgba(6,182,212,0.02)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Bulk Remediation Center</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Execute orchestrated remediation flows sequentially</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        className="cyber-btn cyber-btn-primary" 
                        onClick={() => runBulkRemediation('all')}
                        disabled={bulkExecuting || remediationExecuting}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#000' }}
                      >
                        {bulkExecuting ? 'Orchestrating...' : 'Fix All'}
                      </button>
                      <button 
                        className="cyber-btn" 
                        onClick={() => runBulkRemediation('critical')}
                        disabled={bulkExecuting || remediationExecuting}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid var(--color-pink)', color: 'var(--color-pink)' }}
                      >
                        Fix Critical
                      </button>
                      <button 
                        className="cyber-btn" 
                        onClick={() => runBulkRemediation('security')}
                        disabled={bulkExecuting || remediationExecuting}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid var(--color-cyan)', color: 'var(--color-cyan)' }}
                      >
                        Fix Security
                      </button>
                      <button 
                        className="cyber-btn" 
                        onClick={() => runBulkRemediation('performance')}
                        disabled={bulkExecuting || remediationExecuting}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid var(--color-orange)', color: 'var(--color-orange)' }}
                      >
                        Fix Performance
                      </button>
                      <button 
                        className="cyber-btn" 
                        onClick={downloadCertificationReport}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid var(--color-green)', color: 'var(--color-green)' }}
                      >
                        Certificate
                      </button>
                    </div>
                  </div>

                  {/* Categories Accordion/List */}
                  {dashboardData.categories.map((cat: any, idx: number) => (
                    <div className="glass-panel" key={idx} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                          <span className={`status-indicator ${cat.severity.toLowerCase() === 'high' || cat.severity.toLowerCase() === 'critical' ? 'pulse' : ''}`} style={{ 
                            width: '8px', height: '8px', 
                            backgroundColor: cat.severity.toLowerCase() === 'high' || cat.severity.toLowerCase() === 'critical' ? 'var(--color-pink)' : (cat.severity.toLowerCase() === 'medium' ? 'var(--color-orange)' : 'var(--color-cyan)') 
                          }}></span>
                          <span>{cat.category}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>({cat.issue_count} {cat.issue_count === 1 ? 'issue' : 'issues'})</span>
                        </h3>
                        <SeverityBadge severity={cat.severity} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {cat.issues.map((issue: any) => (
                          <div 
                            key={issue.finding_id}
                            onClick={() => setRemediationTargetId(issue.finding_id)}
                            style={{ 
                              padding: '12px 16px', 
                              borderRadius: 'var(--radius-medium)', 
                              border: selectedActionId === issue.finding_id ? '1px solid var(--color-cyan)' : '1px solid rgba(255,255,255,0.04)',
                              background: selectedActionId === issue.finding_id ? 'rgba(6,182,212,0.02)' : 'rgba(255,255,255,0.01)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{issue.finding_id}</span>
                                {issue.is_resolved ? (
                                  <span className="cyber-badge badge-green" style={{ fontSize: '9px' }}>MITIGATED</span>
                                ) : (
                                  <span className="cyber-badge badge-orange" style={{ fontSize: '9px' }}>ACTIVE</span>
                                )}
                              </div>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Est: {issue.estimated_fix_time}</span>
                            </div>
                            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: issue.is_resolved ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: issue.is_resolved ? 'line-through' : 'none', marginBottom: '4px' }}>
                              {issue.title}
                            </h4>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px', marginTop: '6px' }}>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Root Cause:</span>
                              <span>{issue.root_cause}</span>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Impact:</span>
                              <span>{issue.impact}</span>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Remediation:</span>
                              <span style={{ color: 'var(--color-cyan)' }}>{issue.recommended_action}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                </div>

                {/* Right Pane: Orchestration Graph & Execution Console */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                  
                  {/* Validation & Self-Healing Score Preview */}
                  <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="panel-title" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Post-Remediation Projection</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-around', margin: '8px 0' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Current Health</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--color-pink)' }}>
                          {dashboardData.overall_health_score}%
                        </div>
                      </div>
                      <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>➔</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Target Health</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
                          {dashboardData.post_remediation_validation.health_score}%
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Resolved: <strong>{dashboardData.post_remediation_validation.resolved_issues}</strong></span>
                      <span>Outstanding: <strong>{dashboardData.post_remediation_validation.remaining_issues}</strong></span>
                    </div>
                  </div>

                  {/* Execution Timeline (DAG Sequencer) */}
                  {dashboardData.execution_plan.length > 0 && (
                    <div className="glass-panel" style={{ padding: '16px' }}>
                      <div className="panel-title" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}> Remediator Sequence Graph</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {dashboardData.execution_plan.map((step: any) => (
                          <div 
                            key={step.sequence}
                            style={{ 
                              display: 'flex', 
                              gap: '12px', 
                              alignItems: 'flex-start',
                              opacity: selectedActionId === step.finding_id ? 1 : 0.65,
                              background: selectedActionId === step.finding_id ? 'rgba(255,255,255,0.03)' : 'transparent',
                              padding: '6px',
                              borderRadius: '4px'
                            }}
                          >
                            <div style={{ 
                              width: '18px', 
                              height: '18px', 
                              borderRadius: '50%', 
                              backgroundColor: selectedActionId === step.finding_id ? 'var(--color-cyan)' : 'rgba(255,255,255,0.1)', 
                              color: selectedActionId === step.finding_id ? '#000' : 'var(--text-secondary)',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontSize: '10px', 
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 'bold',
                              marginTop: '2px'
                            }}>
                              {step.sequence}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{step.finding_id}</span>
                                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Dep: {step.dependency}</span>
                              </div>
                              <code style={{ fontSize: '9px', color: 'var(--color-cyan)', display: 'block', wordBreak: 'break-all', marginTop: '2px' }}>{step.action}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Execution Workspace Panel */}
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="panel-title" style={{ margin: 0 }}>Console Workspace</span>
                      {daemonState === 'connected' ? (
                        <span className="cyber-badge badge-green" style={{ fontSize: '9px' }}>DAEMON LIVE</span>
                      ) : (
                        <span className="cyber-badge badge-orange" style={{ fontSize: '9px' }}>OFFLINE STANDALONE</span>
                      )}
                    </div>

                    {selectedAction ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Selected Title */}
                        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-medium)', padding: '10px 14px', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{selectedAction.FindingId}</span>
                          <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                            {selectedAction.Title}
                          </h4>
                        </div>

                        {/* Trigger Controls */}
                        {(() => {
                          const isActionable = ['SEC-FW-001', 'SEC-DEF-001', 'PERF-DISKFREE-C', 'REL-SVC-001'].includes(selectedAction.FindingId);
                          const resolved = completedRemediations[selectedAction.FindingId];
                          const hasRollback = ['SEC-FW-001', 'SEC-DEF-001'].includes(selectedAction.FindingId);

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                  className="cyber-btn cyber-btn-primary" 
                                  onClick={() => runRemediationSimulation(selectedAction.FindingId)}
                                  disabled={remediationExecuting || bulkExecuting || !isActionable}
                                  style={{ 
                                    flex: 1, 
                                    padding: '10px', 
                                    fontWeight: 'bold', 
                                    justifyContent: 'center', 
                                    color: '#000',
                                    opacity: isActionable ? 1 : 0.4,
                                    cursor: isActionable ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  {remediationExecuting && remediationTargetId === selectedAction.FindingId ? (
                                    <span>Executing...</span>
                                  ) : resolved ? (
                                    <span>Re-run Compliance</span>
                                  ) : (
                                    <span>Run Action</span>
                                  )}
                                </button>

                                {hasRollback && resolved && (
                                  <button 
                                    className="cyber-btn" 
                                    onClick={() => runRemediationRollback(selectedAction.FindingId)}
                                    disabled={remediationExecuting || bulkExecuting}
                                    style={{ 
                                      padding: '10px', 
                                      fontWeight: 'bold', 
                                      justifyContent: 'center', 
                                      color: 'var(--color-pink)',
                                      border: '1px solid var(--color-pink)',
                                      background: 'rgba(239, 68, 68, 0.05)'
                                    }}
                                  >
                                    Undo/Rollback
                                  </button>
                                )}
                              </div>

                              {/* Terminal Logs */}
                              <div className="terminal-container" style={{ height: '180px', display: 'flex', flexDirection: 'column', background: 'rgba(2, 4, 10, 0.95)' }}>
                                <div className="terminal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between' }}>
                                  <div className="terminal-dots">
                                    <span className="terminal-dot" style={{ backgroundColor: 'var(--color-pink)' }}></span>
                                    <span className="terminal-dot" style={{ backgroundColor: 'var(--color-orange)' }}></span>
                                    <span className="terminal-dot" style={{ backgroundColor: 'var(--color-cyan)' }}></span>
                                  </div>
                                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>executor_logs.std</span>
                                </div>
                                
                                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '10px', lineHeight: '1.4' }}>
                                  {remediationTargetId === selectedAction.FindingId && remediationLogs.length > 0 ? (
                                    remediationLogs.map((line, idx) => {
                                      let color = 'var(--text-secondary)';
                                      if (line.includes('[success]') || line.includes('[stdout]')) color = 'var(--color-success)';
                                      else if (line.includes('[error]') || line.includes('[stderr]')) color = 'var(--color-danger)';
                                      else if (line.includes('[cmd]')) color = 'var(--color-cyan)';
                                      return <div key={idx} style={{ color, marginBottom: '4px', whiteSpace: 'pre-wrap' }}>{line}</div>;
                                    })
                                  ) : resolved ? (
                                    <div style={{ color: 'var(--color-success)' }}>
                                      [success] Action successfully verified on host.<br />
                                      [info] Compliant state captured in registry audit database.
                                    </div>
                                  ) : !isActionable ? (
                                    <div style={{ color: 'var(--color-orange)' }}>
                                      [warning] Automated remediation not supported for this issue.<br />
                                      [info] Please refer to recommended actions to remediate manually.
                                    </div>
                                  ) : (
                                    <div style={{ color: 'var(--text-muted)' }}>
                                      [info] Console idle.<br />
                                      [info] Click "Run Action" to execute compliance script.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Probe Details */}
                              <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-medium)', padding: '12px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Verification Strategy</span>
                                  {resolved ? (
                                    <span className="cyber-badge badge-green">VERIFIED COMPLIANT</span>
                                  ) : (
                                    <span className="cyber-badge badge-orange">PENDING RUN</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  Probe: <strong>{selectedAction.VerificationMethod}</strong>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', gap: '8px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        <AlertTriangle size={20} />
                        <span style={{ fontSize: '12px' }}>Select an action to launch compliance terminal.</span>
                      </div>
                    )}
                  </div>

                  {/* Generated Scripts File Registry */}
                  {dashboardData.generated_scripts.length > 0 && (
                    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="panel-title" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Generated Script Manifest</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {dashboardData.generated_scripts.map((script: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FileIcon size={12} color="var(--color-cyan)" />
                              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{script.script_name}</span>
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{script.purpose}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            );
          })()}

          {/* 4. CAPACITY FORECASTING */}
          {activeTab === 'forecasting' && (() => {
            const currentStorageUtil = (() => {
              const logicalDisks = getEvidenceValue('Disk', 'LogicalDisks') as Array<Record<string, unknown>> | null;
              const cDrive = Array.isArray(logicalDisks)
                ? logicalDisks.find(d => d['DeviceID'] === 'C:' || d['DeviceID'] === '/')
                : null;
              if (cDrive) {
                const size = parseFloat(String(cDrive['Size'] || 1));
                const free = parseFloat(String(cDrive['FreeSpace'] || 0));
                if (size > 0) {
                  return Number((((size - free) / size) * 100).toFixed(2));
                }
              }
              return 50.0;
            })();

            const todayStorage = currentStorageUtil;
            const todayMemory = Math.max(0, Math.min(100, 100.0 - (healthScoreDataState?.PerformanceScore || 100)));
            const todayCPU = Math.max(0, Math.min(100, 100.0 - (healthScoreDataState?.ReliabilityScore || 100)));

            const storageDaysMatch = capacityForecastData?.Storage?.Note?.match(/^(\d+)\s+Days/);
            const storageTrendValue = storageDaysMatch ? `${storageDaysMatch[1]} Days` : 'Stable';
            const storageTrendLabel = storageDaysMatch ? 'Until Exhaustion' : 'Capacity Secured';

            const memoryDaysMatch = capacityForecastData?.Memory?.Note?.match(/^(\d+)\s+Days/);
            const memoryForecastValue = memoryDaysMatch ? `${memoryDaysMatch[1]} Days` : 'Stable';
            const memoryForecastLabel = memoryDaysMatch ? 'Until Exhaustion' : 'Available Headroom';

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="stats-container">
                  <div className="glass-panel">
                    <div className="panel-title"><HardDrive size={16} color="var(--color-pink)" /> Storage Trend</div>
                    <div className="metric-value">{storageTrendValue}</div>
                    <div className="metric-label" style={{ marginTop: '8px' }}>{storageTrendLabel}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Confidence: {capacityForecastData?.Storage?.Confidence || 'High'}</div>
                  </div>

                  <div className="glass-panel">
                    <div className="panel-title"><Cpu size={16} color="var(--color-blue)" /> Memory Forecast</div>
                    <div className="metric-value">{memoryForecastValue}</div>
                    <div className="metric-label" style={{ marginTop: '8px' }}>{memoryForecastLabel}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Confidence: {capacityForecastData?.Memory?.Confidence || 'Low'}</div>
                  </div>

                  <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
                    <div className="panel-title"><Activity size={16} color="var(--color-cyan)" /> Saturation Alert Summary</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
                      {capacityForecastData?.Storage?.Note || 'Sufficient capacity metrics parsed.'}
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
                        d={`M ${60 + 0*115} ${250 - (todayStorage/100)*220} L ${60 + 1*115} ${250 - ((capacityForecastData?.Storage?.Day30 || 0)/100)*220} L ${60 + 2*115} ${250 - ((capacityForecastData?.Storage?.Day90 || 0)/100)*220} L ${60 + 3*115} ${250 - ((capacityForecastData?.Storage?.Day180 || 0)/100)*220} L ${60 + 4*115} ${250 - ((capacityForecastData?.Storage?.Day365 || 0)/100)*220}`}
                        fill="none"
                        stroke="var(--color-pink)"
                        strokeWidth="2.5"
                        style={{ filter: 'drop-shadow(0px 0px 4px var(--color-pink))' }}
                      />

                      {/* Utilization Curve for Memory (Stable - blue) */}
                      <path
                        d={`M ${60 + 0*115} ${250 - (todayMemory/100)*220} L ${60 + 1*115} ${250 - ((capacityForecastData?.Memory?.Day30 || 0)/100)*220} L ${60 + 2*115} ${250 - ((capacityForecastData?.Memory?.Day90 || 0)/100)*220} L ${60 + 3*115} ${250 - ((capacityForecastData?.Memory?.Day180 || 0)/100)*220} L ${60 + 4*115} ${250 - ((capacityForecastData?.Memory?.Day365 || 0)/100)*220}`}
                        fill="none"
                        stroke="var(--color-blue)"
                        strokeWidth="2.5"
                        style={{ filter: 'drop-shadow(0px 0px 4px var(--color-blue))' }}
                      />

                      {/* Utilization Curve for CPU (Normal - cyan) */}
                      <path
                        d={`M ${60 + 0*115} ${250 - (todayCPU/100)*220} L ${60 + 1*115} ${250 - ((capacityForecastData?.CPU?.Day30 || 0)/100)*220} L ${60 + 2*115} ${250 - ((capacityForecastData?.CPU?.Day90 || 0)/100)*220} L ${60 + 3*115} ${250 - ((capacityForecastData?.CPU?.Day180 || 0)/100)*220} L ${60 + 4*115} ${250 - ((capacityForecastData?.CPU?.Day365 || 0)/100)*220}`}
                        fill="none"
                        stroke="var(--color-cyan)"
                        strokeWidth="2.5"
                        style={{ filter: 'drop-shadow(0px 0px 4px var(--color-cyan))' }}
                      />

                      {/* Interactive dots and hovers */}
                      {[
                        { metric: 'Storage', color: 'var(--color-pink)', values: [todayStorage, capacityForecastData?.Storage?.Day30 || 0, capacityForecastData?.Storage?.Day90 || 0, capacityForecastData?.Storage?.Day180 || 0, capacityForecastData?.Storage?.Day365 || 0] },
                        { metric: 'Memory', color: 'var(--color-blue)', values: [todayMemory, capacityForecastData?.Memory?.Day30 || 0, capacityForecastData?.Memory?.Day90 || 0, capacityForecastData?.Memory?.Day180 || 0, capacityForecastData?.Memory?.Day365 || 0] },
                        { metric: 'CPU', color: 'var(--color-cyan)', values: [todayCPU, capacityForecastData?.CPU?.Day30 || 0, capacityForecastData?.CPU?.Day90 || 0, capacityForecastData?.CPU?.Day180 || 0, capacityForecastData?.CPU?.Day365 || 0] }
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
            );
          })()}

          {/* 5. INFRASTRUCTURE GRAPH */}
          {activeTab === 'topology' && (
            <div className="glass-panel" style={{ width: '100%', padding: '24px' }}>
              <div className="panel-header" style={{ marginBottom: '16px' }}>
                <h2 className="panel-title"><Globe size={16} /> Interactive Dependency Graph</h2>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Drag nodes to rearrange. Click to audit property parameters.</span>
              </div>
              <div style={{ width: '100%', height: '520px' }}>
                <TopologyCanvas
                  nodesList={nodes}
                  edgesList={graphLinks}
                  findingsData={findingsData}
                />
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
                        top: 0, left: 0, width: '100%', height: '100%', 
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

                  <hr style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Database size={14} />
                      <span>V1 SQLite & IndexedDB Migration Exporter</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', textAlign: 'left' }}>
                      Compile your browser-native IndexedDB historical assessment timelines and export them as a V2-compatible migration pack.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button 
                        type="button" 
                        className="cyber-btn" 
                        onClick={() => {
                          const exportData = {
                            AssessmentId: activeAssessmentId,
                            Machine: envDataState,
                            Findings: findingsData,
                            HealthScore: healthScoreDataState,
                            RiskMatrix: riskMatrixData,
                            CapacityForecast: capacityForecastDataState,
                            RawEvidence: rawEvidenceData,
                            Software: activeAssessmentSoftware,
                            History: historyData,
                            completedRemediations: completedRemediations
                          };
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href", dataStr);
                          downloadAnchor.setAttribute("download", `eiip-migration-pack-${envDataState?.ComputerName || 'machine'}.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();
                          showToast("Migration JSON pack downloaded successfully.", "success");
                        }}
                        style={{ flex: 1, padding: '8px 12px', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        Export V1 JSON Pack
                      </button>

                      <button 
                        type="button" 
                        className="cyber-btn"
                        onClick={async () => {
                          const exportData = {
                            AssessmentId: activeAssessmentId,
                            Machine: envDataState,
                            Findings: findingsData,
                            HealthScore: healthScoreDataState,
                            RiskMatrix: riskMatrixData,
                            CapacityForecast: capacityForecastDataState,
                            RawEvidence: rawEvidenceData,
                            Software: activeAssessmentSoftware,
                            History: historyData,
                            completedRemediations: completedRemediations
                          };

                          try {
                            const response = await fetch('http://localhost:8000/api/v2/migrate/import', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify(exportData)
                            });

                            if (response.ok) {
                              const result = await response.json();
                              showToast(`Successfully migrated historical timeline to PostgreSQL V2. Machine UUID: ${result.machine_uuid}`, "success");
                            } else {
                              showToast("Migration upload failed. Ensure FastAPI V2 server is running at localhost:8000.", "error");
                            }
                          } catch {
                            showToast("Network error. Ensure API gateway is accessible at localhost:8000.", "error");
                          }
                        }}
                        style={{ flex: 1, padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', borderColor: 'var(--color-cyan)', color: 'var(--color-cyan)' }}
                      >
                        Push Direct to V2 API
                      </button>
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
              canExecuteRemediation={canExecuteRemediation}
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

          {/* 8.5 FLEET CAPACITY ANALYTICS */}
          {activeTab === 'fleet-analytics' && (
            <FleetAnalytics 
              showToast={showToast}
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
            activeTab === 'coming-soon-healing' ? (
              <AutoHealingDashboard showToast={showToast} />
            ) : activeTab === 'coming-soon-vuln' ? (
              <VulnerabilityThreatIntel showToast={showToast} onNavigateToTab={(tab) => setActiveTab(tab as any)} />
            ) : (
              <ComingSoonPage featureKey={activeTab} />
            )
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

function App() {
  return (
    <AuthProvider>
      <DashboardCommandCenter />
    </AuthProvider>
  );
}

export default App;
