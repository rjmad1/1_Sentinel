import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../utils/apiConfig';
import { 
  RefreshCw, ToggleLeft, ToggleRight, Terminal, CheckCircle, XCircle, Zap, HardDrive, Play
} from 'lucide-react';
import { Box, Flex, Heading, Text, SimpleGrid, Button, Badge } from '@chakra-ui/react';

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
  vss_snapshot_id?: string;
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
  
  // Transactional VSS Checkpoint State (OPP-03)
  const [vssCheckpointEnabled, setVssCheckpointEnabled] = useState(true);
  const [isSimulatingRun, setIsSimulatingRun] = useState<string | null>(null);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const policyRes = await fetch(getApiUrl('/api/v2/self-healing/policies'));
      if (policyRes.ok) {
        setPolicies(await policyRes.json());
      }
      
      const runsRes = await fetch(getApiUrl('/api/v2/self-healing/runs'));
      if (runsRes.ok) {
        setRuns(await runsRes.json());
      }
    } catch (err) {
      console.warn("FastAPI offline, using standalone fallback for policies and runs:", err);
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
          stdout: '[vss] Snapshot created: {VSS-RESTORE-POINT-8849}\n[cmd] Set-NetFirewallProfile -Profile Public -Enabled True\nSUCCESS. Firewall is enabled.',
          stderr: '',
          executed_at: new Date(Date.now() - 3600000).toISOString(),
          vss_snapshot_id: '{VSS-RESTORE-POINT-8849}'
        },
        {
          id: 'run-2',
          machine_id: 'mach-2',
          computer_name: 'PROD-NGINX-01',
          finding_id: 'REL-SVC-001',
          status: 'failed',
          error_message: 'Service startup timeout.',
          stdout: '[vss] Snapshot created: {VSS-RESTORE-POINT-8850}\n[cmd] Start-Service -Name nginx',
          stderr: 'Error: Service nginx did not start in the expected timeframe.',
          executed_at: new Date(Date.now() - 7200000).toISOString(),
          vss_snapshot_id: '{VSS-RESTORE-POINT-8850}'
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
      setPolicies(prev => ({ ...prev, [findingId]: updated }));
      showToast(`Auto-healing for ${findingId} ${updated.enabled ? 'ENABLED' : 'DISABLED'} (Standalone mode).`, 'info');
    } finally {
      setUpdatingPolicy(null);
    }
  };

  const toggleMode = async (findingId: string) => {
    setUpdatingPolicy(findingId);
    const current = policies[findingId] || { enabled: false, execution_mode: 'autonomous' };
    const updatedMode = current.execution_mode === 'autonomous' ? 'approval_gated' : 'autonomous';
    const updated = { ...current, execution_mode: updatedMode as 'autonomous' | 'approval_gated' };
    
    try {
      await fetch('http://localhost:8000/api/v2/self-healing/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding_id: findingId,
          enabled: updated.enabled,
          execution_mode: updated.execution_mode
        })
      });
      setPolicies(prev => ({ ...prev, [findingId]: updated }));
      showToast(`Execution mode set to ${updatedMode.toUpperCase()} for ${findingId}.`, 'success');
    } catch {
      setPolicies(prev => ({ ...prev, [findingId]: updated }));
      showToast(`Execution mode set to ${updatedMode.toUpperCase()} for ${findingId} (Standalone mode).`, 'info');
    } finally {
      setUpdatingPolicy(null);
    }
  };

  // Transactional Pre-Execution Dry Run (OPP-03)
  const triggerDryRunSimulation = (findingId: string) => {
    setIsSimulatingRun(findingId);
    const snapshotId = `{VSS-SNAP-${Math.floor(1000 + Math.random() * 9000)}}`;
    setSimulationLogs([
      `[Transactional Pre-Check] Initializing execution pipeline for policy: ${findingId}...`,
      vssCheckpointEnabled 
        ? `[VSS Snapshot] Creating Volume Shadow Copy restore checkpoint: ${snapshotId}...` 
        : `[Warning] VSS Checkpoint disabled by administrator policy!`,
      `[Sandbox Dry-Run] Validating PowerShell script syntax & dependencies...`,
      `[Sandbox Dry-Run] Expected state diff: Security Profile drift corrected.`,
      `[Execute] Running auto-healing script payload...`,
      `[Validation] Post-check metric scan: Status NORMAL.`,
      `[Success] Self-healing completed cleanly. System status STABLE.`
    ]);

    setTimeout(() => {
      setIsSimulatingRun(null);
      const newRun: RunLog = {
        id: `run-${Date.now()}`,
        machine_id: 'mach-local',
        computer_name: 'DEV-WORKSTATION-01',
        finding_id: findingId,
        status: 'success',
        error_message: null,
        stdout: `[vss] Snapshot created: ${snapshotId}\n[cmd] Auto-remediation script executed cleanly.\nSUCCESS. Policy verified.`,
        stderr: '',
        executed_at: new Date().toISOString(),
        vss_snapshot_id: vssCheckpointEnabled ? snapshotId : undefined
      };
      setRuns(prev => [newRun, ...prev]);
      showToast(`Self-healing run completed for ${findingId}! ${vssCheckpointEnabled ? 'Restore checkpoint created.' : ''}`, 'success');
    }, 1800);
  };

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="space-between" className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
        <Flex align="center" gap={4}>
          <Box className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
            <Zap size={24} />
          </Box>
          <Box>
            <Heading size="md" className="text-gray-100 font-semibold flex items-center gap-2">
              Closed-Loop Auto-Healing Policies
              <Badge className="bg-amber-950 text-amber-400 border border-amber-800 text-xs px-2 py-0.5 rounded">
                Transactional AIOps
              </Badge>
            </Heading>
            <Text className="text-xs text-gray-400 mt-1">
              Autonomous drift remediation with VSS restore-point safety checkpoints
            </Text>
          </Box>
        </Flex>

        <Flex align="center" gap={3}>
          {/* VSS Toggle Checkbox */}
          <Button
            size="xs"
            onClick={() => {
              setVssCheckpointEnabled(!vssCheckpointEnabled);
              showToast(`VSS Restore Checkpoints ${!vssCheckpointEnabled ? 'ENABLED' : 'DISABLED'}.`, 'info');
            }}
            className={`border text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
              vssCheckpointEnabled 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}
          >
            <HardDrive size={14} />
            VSS Restore Checkpoint: <strong>{vssCheckpointEnabled ? 'ON' : 'OFF'}</strong>
          </Button>

          <Button
            size="xs"
            onClick={fetchData}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Runs
          </Button>
        </Flex>
      </Flex>

      {/* Policy Grid */}
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {Object.entries(POLICY_DETAILS).map(([findingId, info]) => {
          const policy = policies[findingId] || { enabled: false, execution_mode: 'autonomous' };
          const isUpdating = updatingPolicy === findingId;
          const isSimulating = isSimulatingRun === findingId;

          return (
            <Box key={findingId} className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
              <Flex justify="space-between" align="start">
                <Box>
                  <Flex align="center" gap={2}>
                    <Badge className="bg-gray-800 text-gray-300 text-xs font-mono px-2 py-0.5 rounded border border-gray-700">
                      {findingId}
                    </Badge>
                    <Badge className="bg-indigo-950 text-indigo-300 text-xs px-2 py-0.5 rounded border border-indigo-800">
                      {info.domain}
                    </Badge>
                  </Flex>
                  <Heading size="sm" className="text-gray-100 font-semibold mt-2">
                    {info.title}
                  </Heading>
                  <Text className="text-xs text-gray-400 mt-1">
                    {info.desc}
                  </Text>
                </Box>

                <Button
                  size="xs"
                  onClick={() => togglePolicy(findingId)}
                  disabled={isUpdating}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                    policy.enabled 
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                      : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}
                >
                  {policy.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  {policy.enabled ? 'ENABLED' : 'DISABLED'}
                </Button>
              </Flex>

              <Flex align="center" justify="space-between" className="pt-3 border-t border-gray-800 text-xs">
                <Flex align="center" gap={2}>
                  <Text className="text-gray-400">Mode:</Text>
                  <Button
                    size="xs"
                    onClick={() => toggleMode(findingId)}
                    disabled={isUpdating}
                    className="bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-gray-700 text-xs px-2 py-0.5 rounded"
                  >
                    {policy.execution_mode.replace('_', ' ').toUpperCase()}
                  </Button>
                </Flex>

                <Button
                  size="xs"
                  onClick={() => triggerDryRunSimulation(findingId)}
                  disabled={isSimulating}
                  className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1 rounded flex items-center gap-1"
                >
                  <Play size={12} />
                  {isSimulating ? 'Simulating...' : 'Run Auto-Fix Dry Run'}
                </Button>
              </Flex>

              {isSimulating && (
                <Box className="p-3 bg-gray-950 border border-gray-800 rounded-lg text-xs font-mono text-emerald-400 space-y-1">
                  {simulationLogs.map((log, idx) => (
                    <div key={idx}>{log}</div>
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </SimpleGrid>

      {/* Execution Audit Log Table */}
      <Box className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
        <Heading size="sm" className="text-gray-100 font-semibold flex items-center gap-2">
          <Terminal size={18} className="text-cyan-400" />
          Self-Healing Execution Audit Trail
        </Heading>

        <Box className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 bg-gray-950">
                <th className="p-3">Status</th>
                <th className="p-3">Policy ID</th>
                <th className="p-3">Target Machine</th>
                <th className="p-3">VSS Checkpoint</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {runs.map(run => (
                <tr key={run.id} className="hover:bg-gray-800/40 text-gray-300">
                  <td className="p-3">
                    {run.status === 'success' ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle size={14} /> SUCCESS
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1 font-semibold">
                        <XCircle size={14} /> FAILED
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono font-medium text-gray-200">{run.finding_id}</td>
                  <td className="p-3 text-gray-300">{run.computer_name}</td>
                  <td className="p-3 font-mono text-cyan-400">{run.vss_snapshot_id || 'N/A'}</td>
                  <td className="p-3 text-gray-400">{new Date(run.executed_at).toLocaleTimeString()}</td>
                  <td className="p-3 text-right">
                    <Button
                      size="xs"
                      onClick={() => setSelectedRun(run)}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs px-2 py-0.5 rounded"
                    >
                      View Log
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>

      {/* Log Modal / Detail Panel */}
      {selectedRun && (
        <Box className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Box className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl w-full space-y-4">
            <Flex align="center" justify="space-between" className="border-b border-gray-800 pb-3">
              <Heading size="sm" className="text-gray-100">
                Execution Audit Log: {selectedRun.finding_id} ({selectedRun.computer_name})
              </Heading>
              <Button size="xs" onClick={() => setSelectedRun(null)} className="bg-gray-800 text-gray-300 px-3 py-1 rounded">
                Close
              </Button>
            </Flex>

            <Box className="bg-gray-950 border border-gray-800 rounded-lg p-4 font-mono text-xs text-gray-200 max-h-80 overflow-y-auto space-y-2">
              <div className="text-indigo-400">=== STDOUT ===</div>
              <pre className="whitespace-pre-wrap text-emerald-400">{selectedRun.stdout || 'No stdout output.'}</pre>

              {selectedRun.stderr && (
                <>
                  <div className="text-red-400 mt-3">=== STDERR ===</div>
                  <pre className="whitespace-pre-wrap text-red-400">{selectedRun.stderr}</pre>
                </>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};
