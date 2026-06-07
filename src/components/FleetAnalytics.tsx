import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Cpu, HardDrive, Shield, AlertTriangle, Globe, RefreshCw, Package
} from 'lucide-react';
import { Box, Flex, Heading, Text, SimpleGrid, Button, Spinner } from '@chakra-ui/react';

interface FleetAnalyticsProps {
  showToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

interface EolSoftwareItem {
  name: string;
  version: string;
  publisher: string;
  type: string;
  cve: string;
  severity: string;
  host_count: number;
  hosts: string[];
}

interface HistoricalPoint {
  date: string;
  health: number;
}

interface FleetAnalyticsData {
  total_machines: number;
  total_cores: number;
  total_memory_gb: number;
  total_storage_gb: number;
  total_storage_used_gb: number;
  average_health: number;
  machines_saturating_90_days: number;
  eol_software: EolSoftwareItem[];
  recent_history: HistoricalPoint[];
}

const MOCK_FLEET_DATA: FleetAnalyticsData = {
  total_machines: 4,
  total_cores: 24,
  total_memory_gb: 96.0,
  total_storage_gb: 2048.0,
  total_storage_used_gb: 1240.5,
  average_health: 84.5,
  machines_saturating_90_days: 1,
  eol_software: [
    { name: 'Python', version: '3.10.12', publisher: 'Python Software Foundation', type: 'EOL', cve: 'CVE-2023-27043', severity: 'High', host_count: 2, hosts: ['DEV-WORKSTATION-01', 'PROD-NGINX-01'] },
    { name: 'Node.js', version: '18.16.0', publisher: 'OpenJS Foundation', type: 'Vulnerability', cve: 'CVE-2023-32002', severity: 'Medium', host_count: 1, hosts: ['DEV-WORKSTATION-02'] },
    { name: 'Docker Desktop', version: '4.19.0', publisher: 'Docker Inc.', type: 'Vulnerability', cve: 'CVE-2023-3899', severity: 'High', host_count: 1, hosts: ['DEV-WORKSTATION-01'] }
  ],
  recent_history: [
    { date: '2026-05-08', health: 88.0 },
    { date: '2026-05-15', health: 87.2 },
    { date: '2026-05-22', health: 86.5 },
    { date: '2026-05-29', health: 85.0 },
    { date: '2026-06-05', health: 84.5 }
  ]
};

export const FleetAnalytics: React.FC<FleetAnalyticsProps> = ({ showToast }) => {
  const [data, setData] = useState<FleetAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);

  const fetchFleetAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v2/fleet/analytics');
      if (response.ok) {
        const result = await response.json();
        if (result.total_machines > 0) {
          setData(result);
          setIsSimulated(false);
        } else {
          // If DB is empty, use mock data but flag as simulated
          setData(MOCK_FLEET_DATA);
          setIsSimulated(true);
          showToast('No active fleet machines in FastAPI database. Displaying simulated fleet telemetry.', 'info');
        }
      } else {
        throw new Error('API server returned error status.');
      }
    } catch (err) {
      console.warn('FastAPI fleet analytics endpoint unavailable, falling back to simulation layer:', err);
      setData(MOCK_FLEET_DATA);
      setIsSimulated(true);
      showToast('FastAPI fleet analytics service offline. Displaying local-first simulated telemetry.', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchFleetAnalytics();
  }, [fetchFleetAnalytics]);

  if (loading || !data) {
    return (
      <Flex direction="column" justify="center" align="center" minH="400px" gap="4">
        <Spinner size="xl" color="#06B6D4" />
        <Text color="text.secondary" fontSize="14px">Aggregating global fleet capacity metrics...</Text>
      </Flex>
    );
  }

  // Calculate percentages
  const storageUsedPercent = data.total_storage_gb > 0 
    ? Math.round((data.total_storage_used_gb / data.total_storage_gb) * 100)
    : 0;

  return (
    <Flex direction="column" gap="6" width="100%">
      {isSimulated && (
        <Box 
          bg="rgba(245, 165, 36, 0.05)" 
          border="1px solid rgba(245, 165, 36, 0.2)" 
          borderRadius="8px" 
          p="4" 
          mb="-2"
          display="flex"
          alignItems="center"
          gap="3"
        >
          <AlertTriangle size={18} color="var(--color-warning)" />
          <Text fontSize="13px" color="var(--text-secondary)">
            V2 FastAPI service offline or empty. Displaying local-first <strong>Simulated Fleet Telemetry</strong>.
          </Text>
          <Button 
            size="xs" 
            variant="outline" 
            ml="auto" 
            onClick={fetchFleetAnalytics}
            borderColor="rgba(245, 165, 36, 0.2)"
            color="var(--color-warning)"
            _hover={{ bg: 'rgba(245, 165, 36, 0.1)' }}
          >
            Retry Sync
          </Button>
        </Box>
      )}

      {/* Fleet KPI Header Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="6">
        <Box className="glass-panel">
          <Flex justify="space-between" align="start">
            <Box>
              <Text className="metric-label">Total Fleet Nodes</Text>
              <Text className="metric-value">{data.total_machines}</Text>
            </Box>
            <Box p="2" bg="rgba(6, 182, 212, 0.1)" borderRadius="8px">
              <Globe size={20} color="#06B6D4" />
            </Box>
          </Flex>
          <Text fontSize="11px" color="text.secondary" mt="3">
            Active macOS, Linux & Windows hosts
          </Text>
        </Box>

        <Box className="glass-panel">
          <Flex justify="space-between" align="start">
            <Box>
              <Text className="metric-label">Compute Capacity</Text>
              <Text className="metric-value">{data.total_cores} Cores</Text>
            </Box>
            <Box p="2" bg="rgba(59, 130, 246, 0.1)" borderRadius="8px">
              <Cpu size={20} color="#3B82F6" />
            </Box>
          </Flex>
          <Text fontSize="11px" color="text.secondary" mt="3">
            {data.total_memory_gb.toFixed(1)} GB Total RAM Footprint
          </Text>
        </Box>

        <Box className="glass-panel">
          <Flex justify="space-between" align="start">
            <Box>
              <Text className="metric-label">Average Fleet Health</Text>
              <Text className="metric-value" color={data.average_health >= 80 ? 'var(--color-success)' : 'var(--color-warning)'}>
                {data.average_health.toFixed(1)}%
              </Text>
            </Box>
            <Box p="2" bg={data.average_health >= 80 ? 'rgba(22, 199, 132, 0.1)' : 'rgba(245, 165, 36, 0.1)'} borderRadius="8px">
              <Shield size={20} color={data.average_health >= 80 ? 'var(--color-success)' : 'var(--color-warning)'} />
            </Box>
          </Flex>
          <Text fontSize="11px" color="text.secondary" mt="3">
            Aggregated cross-domain diagnostics
          </Text>
        </Box>

        <Box className="glass-panel">
          <Flex justify="space-between" align="start">
            <Box>
              <Text className="metric-label">Saturating in 90 Days</Text>
              <Text className="metric-value" color={data.machines_saturating_90_days > 0 ? 'var(--color-danger)' : 'var(--text-primary)'}>
                {data.machines_saturating_90_days}
              </Text>
            </Box>
            <Box p="2" bg="rgba(239, 68, 68, 0.1)" borderRadius="8px">
              <AlertTriangle size={20} color="var(--color-danger)" />
            </Box>
          </Flex>
          <Text fontSize="11px" color="text.secondary" mt="3">
            Hosts nearing storage/memory depletion
          </Text>
        </Box>
      </SimpleGrid>

      {/* Main Charts Row */}
      <SimpleGrid columns={{ base: 1, lg: 12 }} gap="6">
        
        {/* Storage Capacity Gauge */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 5' }}>
          <Box className="panel-header">
            <Heading as="h3" className="panel-title">
              <HardDrive size={16} color="var(--color-cyan)" />
              <Text as="span">Fleet Storage Footprint</Text>
            </Heading>
          </Box>
          
          <Flex direction="column" justify="center" height="240px" gap="4">
            <Flex align="baseline" gap="2">
              <Text fontSize="36px" fontWeight="800" fontFamily="mono" color="#fff">
                {data.total_storage_used_gb.toFixed(1)}
              </Text>
              <Text fontSize="16px" color="text.secondary">
                / {data.total_storage_gb.toFixed(1)} GB Used
              </Text>
            </Flex>

            <Box>
              <Flex justify="space-between" mb="1.5">
                <Text fontSize="12px" color="text.secondary" fontWeight="bold">STORAGE SATURATION</Text>
                <Text fontSize="12px" fontWeight="bold" fontFamily="mono" color="var(--color-cyan)">{storageUsedPercent}%</Text>
              </Flex>
              <Box className="progress-bar-container">
                <Box 
                  className="progress-bar-fill" 
                  bg="linear-gradient(90deg, var(--color-info), var(--color-cyan))"
                  style={{ width: `${storageUsedPercent}%` }}
                />
              </Box>
            </Box>

            <SimpleGrid columns={2} gap="4" mt="2" bg="rgba(0,0,0,0.15)" p="3" borderRadius="8px" border="1px solid var(--border-color)">
              <Box>
                <Text fontSize="10px" color="text.secondary">AVAILABLE FOOTPRINT</Text>
                <Text fontSize="14px" fontWeight="bold" fontFamily="mono" color="var(--color-success)">
                  {(data.total_storage_gb - data.total_storage_used_gb).toFixed(1)} GB
                </Text>
              </Box>
              <Box>
                <Text fontSize="10px" color="text.secondary">SATURATION RATE</Text>
                <Text fontSize="14px" fontWeight="bold" fontFamily="mono" color={data.machines_saturating_90_days > 0 ? 'var(--color-danger)' : 'var(--text-primary)'}>
                  {data.machines_saturating_90_days > 0 ? 'ACCELERATING' : 'STABLE'}
                </Text>
              </Box>
            </SimpleGrid>
          </Flex>
        </Box>

        {/* Fleet Health Timeline (SVG Chart) */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 7' }}>
          <Box className="panel-header" display="flex" justifyContent="space-between" alignItems="center">
            <Heading as="h3" className="panel-title">
              <Activity size={16} color="var(--color-success)" />
              <Text as="span">Fleet Health Index (30-Day Trend)</Text>
            </Heading>
            <Button 
              size="xs" 
              variant="outline" 
              onClick={fetchFleetAnalytics} 
              borderColor="rgba(255,255,255,0.1)"
              _hover={{ bg: 'rgba(255,255,255,0.05)' }}
            >
              <RefreshCw size={11} />
            </Button>
          </Box>

          <Box height="240px" width="100%" position="relative">
            {data.recent_history.length >= 2 ? (
              <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(22, 199, 132, 0.2)" />
                    <stop offset="100%" stopColor="rgba(22, 199, 132, 0.0)" />
                  </linearGradient>
                </defs>
                
                {/* Grid Lines */}
                <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                <line x1="0" y1="160" x2="500" y2="160" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                
                {/* SVG Area & Path */}
                {(() => {
                  const xInterval = 500 / (data.recent_history.length - 1);
                  const points = data.recent_history.map((pt, i) => {
                    const x = i * xInterval;
                    // Scale health score (0-100) to svg height (200-40)
                    const y = 200 - ((pt.health - 50) / 50) * 160;
                    return { x, y, ...pt };
                  });
                  
                  const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
                  const areaD = `${pathD} L ${points[points.length - 1].x} 200 L 0 200 Z`;
                  
                  return (
                    <>
                      <path d={areaD} fill="url(#chartGlow)" />
                      <path d={pathD} fill="none" stroke="var(--color-success)" strokeWidth="2.5" />
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="4.5" fill="var(--bg-card)" stroke="var(--color-success)" strokeWidth="2" />
                          <text x={p.x} y={p.y - 12} fill="#fff" fontSize="10px" fontFamily="mono" textAnchor="middle">
                            {p.health.toFixed(1)}%
                          </text>
                          <text x={p.x} y="196" fill="var(--text-muted)" fontSize="9px" textAnchor="middle">
                            {p.date.substring(5)}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            ) : (
              <Flex height="100%" justify="center" align="center">
                <Text fontSize="13px" color="text.secondary">Insufficient timeline events. Perform more scans to seed health trends.</Text>
              </Flex>
            )}
          </Box>
        </Box>
      </SimpleGrid>

      {/* Outdated/EOL Software Vectors */}
      <Box className="glass-panel">
        <Box className="panel-header">
          <Heading as="h3" className="panel-title">
            <Package size={16} color="var(--color-orange)" />
            <Text as="span">Vulnerable & EOL Software Vectors across Fleet</Text>
          </Heading>
        </Box>

        {data.eol_software.length > 0 ? (
          <Box overflowX="auto">
            <table className="cyber-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 12px' }}>PACKAGE NAME</th>
                  <th style={{ padding: '10px 12px' }}>VERSION</th>
                  <th style={{ padding: '10px 12px' }}>THREAT CLASSIFICATION</th>
                  <th style={{ padding: '10px 12px' }}>CVE INDEX</th>
                  <th style={{ padding: '10px 12px' }}>SEVERITY</th>
                  <th style={{ padding: '10px 12px' }}>AFFECTED HOSTS</th>
                </tr>
              </thead>
              <tbody>
                {data.eol_software.map((sw, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '44px' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{sw.name}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{sw.version}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`cyber-badge ${sw.type === 'Vulnerability' ? 'badge-pink' : 'badge-orange'}`} style={{ fontSize: '10px' }}>
                        {sw.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{sw.cve || 'N/A'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: sw.severity === 'High' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                      {sw.severity}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Flex gap="1.5" align="center" flexWrap="wrap">
                        {sw.hosts.map((h, i) => (
                          <Box 
                            key={i} 
                            fontSize="10px" 
                            bg="rgba(255,255,255,0.05)" 
                            border="1px solid rgba(255,255,255,0.1)" 
                            borderRadius="4px" 
                            px="2" 
                            py="0.5"
                            fontFamily="mono"
                          >
                            {h}
                          </Box>
                        ))}
                      </Flex>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        ) : (
          <Flex py="8" direction="column" align="center" justify="center">
            <Shield size={32} color="var(--color-success)" style={{ opacity: 0.5, marginBottom: '8px' }} />
            <Text fontSize="13px" color="text.secondary">All packages clean. No fleet-wide EOL software vulnerabilities identified.</Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
};
