import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, RefreshCw, ToggleLeft, ToggleRight, Terminal, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { Box, Flex, Heading, Text, SimpleGrid, Button, Spinner } from '@chakra-ui/react';

interface AutoHealingDashboardProps {
  showToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

interface Policy {
  enabled: boolean;
  execution_mode: 'autonomous' | 'approval_gated';
}

interface RunLog {
  id: string;
  machine_id: string;
  computer_name: string;
  finding_id: string;
  status: 'success' | 'failed' | 'running';
  error_message: string | null;
  stdout: string | null;
  stderr: string | null;
  executed_at: string;
}

const POLICY_DETAILS: Record<string, { title: string; desc: string; domain: string; severity: string }> = {
  'SEC-FW-001': { title: 'Enable Public Firewall', desc: 'Automatically re-enables the public network firewall profile if disabled.', domain: 'Security', severity: 'High' },
  'SEC-DEF-001': { title: 'Enable Windows Defender', desc: 'Enforces real-time Defender protection settings on drift detection.', domain: 'Security', severity: 'High' },
  'PERF-DISKFREE-C': { title: 'Clean Temporary Caches', desc: 'Prunes temporary directories when C: volume free space drops below 15%.', domain: 'Performance', severity: 'High' },
  'REL-SVC-001': { title: 'Restart Stopped Services', desc: 'Restarts crashed or stopped services marked with automatic startup.', domain: 'Reliability', severity: 'Medium' }
};

export const AutoHealingDashboard: React.FC<AutoHealingDashboardProps> = ({ showToast }) => {
  const [policies, setPolicies] = useState<Record<string, Policy>>({});
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPolicy, setUpdatingPolicy] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunLog | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch policies
      const policyRes = await fetch('http://localhost:8000/api/v2/self-healing/policies');
      if (policyRes.ok) {
        setPolicies(await policyRes.json());
      }
      
      // Fetch runs
      const runsRes = await fetch('http://localhost:8000/api/v2/self-healing/runs');
      if (runsRes.ok) {
        setRuns(await runsRes.json());
      }
    } catch (err) {
      console.warn("FastAPI offline, using standalone fallback for policies and runs:", err);
      // Fallback data
      setPolicies({
        'SEC-FW-001': { enabled: true, execution_mode: 'autonomous' },
        'SEC-DEF-001': { enabled: false, execution_mode: 'autonomous' },
        'PERF-DISKFREE-C': { enabled: true, execution_mode: 'approval_gated' },
        'REL-SVC-001': { enabled: false, execution_mode: 'autonomous' }
      });
      setRuns([
        {
          id: 'run-1',
          machine_id: 'mach-1',
          computer_name: 'DEV-WORKSTATION-01',
          finding_id: 'SEC-FW-001',
          status: 'success',
          error_message: null,
          stdout: '[cmd] Set-NetFirewallProfile -Profile Public -Enabled True\nSUCCESS. Firewall is enabled.',
          stderr: '',
          executed_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'run-2',
          machine_id: 'mach-2',
          computer_name: 'PROD-NGINX-01',
          finding_id: 'REL-SVC-001',
          status: 'failed',
          error_message: 'Service startup timeout.',
          stdout: '[cmd] Start-Service -Name nginx',
          stderr: 'Error: Service nginx did not start in the expected timeframe.',
          executed_at: new Date(Date.now() - 7200000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePolicy = async (findingId: string) => {
    setUpdatingPolicy(findingId);
    const current = policies[findingId] || { enabled: false, execution_mode: 'autonomous' };
    const updated = { ...current, enabled: !current.enabled };
    
    try {
      const res = await fetch('http://localhost:8000/api/v2/self-healing/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding_id: findingId,
          enabled: updated.enabled,
          execution_mode: updated.execution_mode
        })
      });
      if (res.ok) {
        setPolicies(prev => ({ ...prev, [findingId]: updated }));
        showToast(`Auto-healing for ${findingId} ${updated.enabled ? 'ENABLED' : 'DISABLED'}.`, 'success');
      } else {
        throw new Error();
      }
    } catch {
      // Local update fallback if offline
      setPolicies(prev => ({ ...prev, [findingId]: updated }));
      showToast(`Standalone mode: Auto-healing toggled locally.`, 'info');
    } finally {
      setUpdatingPolicy(null);
    }
  };

  const changeExecutionMode = async (findingId: string, mode: 'autonomous' | 'approval_gated') => {
    const current = policies[findingId] || { enabled: false, execution_mode: 'autonomous' };
    const updated = { ...current, execution_mode: mode };
    
    try {
      const res = await fetch('http://localhost:8000/api/v2/self-healing/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding_id: findingId,
          enabled: updated.enabled,
          execution_mode: updated.execution_mode
        })
      });
      if (res.ok) {
        setPolicies(prev => ({ ...prev, [findingId]: updated }));
        showToast(`Remediation mode for ${findingId} changed to ${mode === 'autonomous' ? 'Autonomous' : 'Approval Gated'}.`, 'success');
      } else {
        throw new Error();
      }
    } catch {
      setPolicies(prev => ({ ...prev, [findingId]: updated }));
      showToast(`Standalone mode: Policy mode updated locally.`, 'info');
    }
  };

  if (loading) {
    return (
      <Flex direction="column" justify="center" align="center" minH="400px" gap="4">
        <Spinner size="xl" color="#06B6D4" />
        <Text color="text.secondary" fontSize="14px">Loading drift protection & self-healing logs...</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="6" width="100%">
      {/* Top Banner KPI row */}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap="6">
        <Box className="glass-panel" borderLeft="3px solid var(--color-success)">
          <Text className="metric-label">Active Policies</Text>
          <Text className="metric-value">
            {Object.values(policies).filter(p => p.enabled).length} / {Object.keys(POLICY_DETAILS).length}
          </Text>
          <Text fontSize="11px" color="text.secondary" mt="2">
            Automated healing tasks currently armed
          </Text>
        </Box>
        <Box className="glass-panel" borderLeft="3px solid var(--color-cyan)">
          <Text className="metric-label">Autonomous Remediations</Text>
          <Text className="metric-value">
            {runs.filter(r => r.status === 'success').length}
          </Text>
          <Text fontSize="11px" color="text.secondary" mt="2">
            Outages prevented via background repair runs
          </Text>
        </Box>
        <Box className="glass-panel" borderLeft="3px solid var(--color-pink)">
          <Text className="metric-label">Policy Failures</Text>
          <Text className="metric-value" color={runs.some(r => r.status === 'failed') ? 'var(--color-pink)' : 'var(--text-primary)'}>
            {runs.filter(r => r.status === 'failed').length}
          </Text>
          <Text fontSize="11px" color="text.secondary" mt="2">
            Self-healing errors requiring human triage
          </Text>
        </Box>
      </SimpleGrid>

      {/* Main Grid */}
      <SimpleGrid columns={{ base: 1, lg: 12 }} gap="6">
        
        {/* Left Column: Policy Management (span 7) */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 7' }}>
          <Box className="panel-header" display="flex" justifyContent="space-between" alignContent="center">
            <Heading as="h3" className="panel-title">
              <Shield size={16} color="var(--color-success)" />
              <Text as="span">Closed-Loop Self-Healing Policies</Text>
            </Heading>
            <Button size="xs" variant="outline" onClick={fetchData} borderColor="rgba(255,255,255,0.1)">
              <RefreshCw size={11} />
            </Button>
          </Box>

          <Flex direction="column" gap="4" mt="4">
            {Object.entries(POLICY_DETAILS).map(([findingId, info]) => {
              const policy = policies[findingId] || { enabled: false, execution_mode: 'autonomous' };
              const isPending = updatingPolicy === findingId;

              return (
                <Flex 
                  key={findingId}
                  p="4"
                  bg="rgba(0,0,0,0.12)"
                  border="1px solid var(--border-color)"
                  borderRadius="8px"
                  justify="space-between"
                  align="center"
                  wrap="wrap"
                  gap="4"
                >
                  <Box flex="1" minW="260px">
                    <Flex align="center" gap="2" mb="1">
                      <span className="cyber-badge badge-cyan" style={{ fontSize: '9px' }}>{info.domain}</span>
                      <span className="cyber-badge badge-orange" style={{ fontSize: '9px' }}>{info.severity}</span>
                      <Text fontSize="11px" fontFamily="mono" color="text.muted">{findingId}</Text>
                    </Flex>
                    <Heading as="h4" fontSize="14px" fontWeight="bold" color="text.primary" mb="1">
                      {info.title}
                    </Heading>
                    <Text fontSize="12px" color="text.secondary" lineHeight="1.4">
                      {info.desc}
                    </Text>
                  </Box>

                  <Flex align="center" gap="4">
                    {/* Mode selector */}
                    <Box>
                      <select 
                        className="cyber-input" 
                        value={policy.execution_mode}
                        onChange={(e) => changeExecutionMode(findingId, e.target.value as any)}
                        style={{ fontSize: '11px', height: '30px', padding: '0 8px' }}
                      >
                        <option value="autonomous">Fully Auto</option>
                        <option value="approval_gated">Gated approval</option>
                      </select>
                    </Box>

                    {/* Toggle button */}
                    <Button 
                      onClick={() => togglePolicy(findingId)}
                      disabled={isPending}
                      variant="plain"
                      p="0"
                      height="auto"
                      cursor="pointer"
                    >
                      {isPending ? (
                        <Spinner size="xs" color="#06B6D4" />
                      ) : policy.enabled ? (
                        <ToggleRight size={36} color="var(--color-success)" />
                      ) : (
                        <ToggleLeft size={36} color="var(--text-muted)" />
                      )}
                    </Button>
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
        </Box>

        {/* Right Column: Execution Log Audit (span 5) */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 5' }}>
          <Box className="panel-header">
            <Heading as="h3" className="panel-title">
              <Terminal size={16} color="var(--color-cyan)" />
              <Text as="span">Healing Execution Logs</Text>
            </Heading>
          </Box>

          <Flex direction="column" gap="3" mt="4" maxH="380px" overflowY="auto">
            {runs.length === 0 ? (
              <Flex direction="column" justify="center" align="center" py="10" color="text.muted" gap="2">
                <Clock size={24} style={{ opacity: 0.5 }} />
                <Text fontSize="12px">No self-healing events recorded yet.</Text>
              </Flex>
            ) : (
              runs.map((run) => {
                const isSelected = selectedRun?.id === run.id;
                return (
                  <Box 
                    key={run.id}
                    onClick={() => setSelectedRun(isSelected ? null : run)}
                    p="3"
                    borderRadius="6px"
                    bg={isSelected ? 'rgba(6,182,212,0.03)' : 'rgba(255,255,255,0.01)'}
                    border="1px solid"
                    borderColor={isSelected ? 'var(--color-cyan)' : 'var(--border-color)'}
                    cursor="pointer"
                    transition="all 0.2s"
                  >
                    <Flex justify="space-between" align="center" mb="2">
                      <Flex align="center" gap="2">
                        {run.status === 'success' ? (
                          <CheckCircle size={14} color="var(--color-success)" />
                        ) : run.status === 'failed' ? (
                          <XCircle size={14} color="var(--color-pink)" />
                        ) : (
                          <Spinner size="xs" color="var(--color-cyan)" />
                        )}
                        <Text fontSize="12px" fontWeight="bold" fontFamily="mono" color="text.primary">
                          {run.finding_id}
                        </Text>
                      </Flex>
                      <Text fontSize="10px" color="text.muted" fontFamily="mono">
                        {new Date(run.executed_at).toLocaleTimeString()}
                      </Text>
                    </Flex>

                    <Text fontSize="11px" color="text.secondary" mb="1">
                      Host: <strong>{run.computer_name}</strong>
                    </Text>
                    
                    {run.status === 'failed' && run.error_message && (
                      <Text fontSize="11px" color="var(--color-pink)" fontWeight="bold" mb="1">
                        Err: {run.error_message}
                      </Text>
                    )}

                    {isSelected && (
                      <Box className="terminal-container" mt="3" style={{ background: '#02040a', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Flex justify="space-between" align="center" bg="rgba(255,255,255,0.02)" px="3" py="1.5" borderBottom="1px solid rgba(255,255,255,0.05)">
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'mono' }}>output.stdout</span>
                        </Flex>
                        <Box p="3" fontFamily="mono" fontSize="10px" whiteSpace="pre-wrap" overflowX="auto" maxH="150px" color={run.status === 'failed' ? 'var(--color-pink)' : 'var(--color-success)'}>
                          {run.stdout || run.error_message || 'No log output recorded.'}
                          {run.stderr && `\n\n[STDERR]\n${run.stderr}`}
                        </Box>
                      </Box>
                    )}
                  </Box>
                );
              })
            )}
          </Flex>
        </Box>

      </SimpleGrid>
    </Flex>
  );
};
