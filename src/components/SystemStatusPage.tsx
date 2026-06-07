import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/db';
import { Database, Shield, HardDrive, RefreshCw, Trash2, Settings } from '../utils/icons';
import { Box, Flex, Heading, Text, SimpleGrid, Button } from '@chakra-ui/react';

interface SystemStatusProps {
  activeAssessmentId: string | null;
  activeMachineName: string | null;
  nodesCount: number;
  linksCount: number;
  showToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onPurgeDb: () => void;
}

export const SystemStatusPage: React.FC<SystemStatusProps> = ({
  activeAssessmentId,
  activeMachineName,
  nodesCount,
  linksCount,
  showToast,
  onPurgeDb
}) => {
  const [counts, setCounts] = useState({
    assessments: 0,
    assets: 0,
    software: 0,
    findings: 0,
    risks: 0,
    exports: 0
  });
  const [storage, setStorage] = useState({
    used: 'N/A',
    quota: 'N/A',
    percentage: 0
  });
  const [localStorageUsage, setLocalStorageUsage] = useState('0 Bytes');
  const [dbOpen, setDbOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Get table row counts
      const assessmentsCount = await db.assessments.count();
      const assetsCount = await db.assets.count();
      const softwareCount = await db.software.count();
      const findingsCount = await db.findings.count();
      const risksCount = await db.risks.count();
      const exportsCount = await db.exports.count();

      setCounts({
        assessments: assessmentsCount,
        assets: assetsCount,
        software: softwareCount,
        findings: findingsCount,
        risks: risksCount,
        exports: exportsCount
      });

      setDbOpen(db.isOpen());

      // Storage Estimate
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 1;
        const pct = Math.round((usageBytes / quotaBytes) * 10000) / 100;
        
        setStorage({
          used: formatBytes(usageBytes),
          quota: formatBytes(quotaBytes),
          percentage: pct
        });
      }

      // LocalStorage usage
      let lsBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          lsBytes += key.length + (localStorage.getItem(key) || '').length;
        }
      }
      setLocalStorageUsage(formatBytes(lsBytes));
    } catch (err) {
      console.error('Failed to retrieve system status telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClearDatabase = async () => {
    if (!window.confirm('WARNING: Are you sure you want to purge all assessment database tables? This will delete all imported and demo assessments from IndexedDB.')) {
      return;
    }
    
    setIsPurging(true);
    try {
      await db.transaction('rw', [db.assessments, db.assets, db.software, db.findings, db.risks, db.exports], async () => {
        await db.assessments.clear();
        await db.assets.clear();
        await db.software.clear();
        await db.findings.clear();
        await db.risks.clear();
        await db.exports.clear();
      });
      
      onPurgeDb();
      await fetchStats();
      showToast('Assessment database cleared successfully.', 'success');
    } catch (err) {
      showToast('Error clearing database: ' + String(err), 'error');
    } finally {
      setIsPurging(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStats();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStats]);

  return (
    <Flex direction="column" gap="6">
      
      {/* 5-Section Layout grid */}
      <SimpleGrid columns={{ base: 1, lg: 12 }} gap="6">
        
        {/* 1. Platform Health */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 4' }}>
          <Box className="panel-header" mb="5">
            <Heading as="h2" className="panel-title">
              <Database size={16} color="#06B6D4" /> 
              <Text as="span">Platform Health</Text>
            </Heading>
          </Box>
          <Flex direction="column" gap="3" fontSize="13px">
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">IndexedDB Connection:</Text>
              <Text as="strong" color={dbOpen ? '#16C784' : '#EF4444'}>
                {dbOpen ? 'CONNECTED' : 'DISCONNECTED'}
              </Text>
            </Flex>
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">DB Store Name:</Text>
              <Text as="strong" fontFamily="mono">{db.name} (v{db.verno})</Text>
            </Flex>
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">Application Version:</Text>
              <Text as="strong" color="#06B6D4" fontFamily="mono">v1.0.0</Text>
            </Flex>
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">Build Timestamp:</Text>
              <Text as="strong" fontFamily="mono">2026-06-05.1</Text>
            </Flex>
          </Flex>
        </Box>

        {/* 2. Assessment Health */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 4' }}>
          <Box className="panel-header" mb="5">
            <Heading as="h2" className="panel-title">
              <Shield size={16} color="#3B82F6" /> 
              <Text as="span">Assessment Health</Text>
            </Heading>
          </Box>
          <Flex direction="column" gap="3" fontSize="13px">
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">Active Host:</Text>
              <Text as="strong" fontFamily="mono" wordBreak="break-all">{activeAssessmentId ? activeMachineName : 'NONE'}</Text>
            </Flex>
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">Assessment ID:</Text>
              <Text as="strong" fontFamily="mono" fontSize="11px">{activeAssessmentId ? activeAssessmentId : 'No file loaded'}</Text>
            </Flex>
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">Total Historical Imports:</Text>
              <Text as="strong" fontFamily="mono">{counts.assessments}</Text>
            </Flex>
          </Flex>
        </Box>

        {/* 3. Storage Health */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 4' }}>
          <Box className="panel-header" mb="5">
            <Heading as="h2" className="panel-title">
              <HardDrive size={16} color="#EF4444" /> 
              <Text as="span">Storage Health</Text>
            </Heading>
          </Box>
          <Flex direction="column" gap="3" fontSize="13px">
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">IndexedDB Storage Used:</Text>
              <Text as="strong" fontFamily="mono">{storage.used}</Text>
            </Flex>
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">Browser Allocation Quota:</Text>
              <Text as="strong" fontFamily="mono">{storage.quota}</Text>
            </Flex>
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">LocalStorage Usage:</Text>
              <Text as="strong" fontFamily="mono">{localStorageUsage}</Text>
            </Flex>
            <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
              <Text color="text.secondary">Storage Quota Used %:</Text>
              <Text as="strong" fontFamily="mono">{storage.percentage}%</Text>
            </Flex>
          </Flex>
        </Box>

        {/* 4. Data Health */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 7' }}>
          <Box className="panel-header" mb="5" display="flex" justifyContent="space-between" alignItems="center">
            <Heading as="h2" className="panel-title"><Database size={16} /> Data Health & Table Statistics</Heading>
            <Button
              size="xs"
              variant="outline"
              onClick={fetchStats}
              disabled={loading}
              borderColor="rgba(255,255,255,0.15)"
              _hover={{ bg: 'rgba(255,255,255,0.05)' }}
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
              <Text as="span">Refresh Stats</Text>
            </Button>
          </Box>

          <Flex direction="column" gap="3">
            {[
              { name: 'assessments', label: 'Assessments Master', count: counts.assessments, desc: 'Stores core host metrics & config blocks.' },
              { name: 'findings', label: 'Findings Registry', count: counts.findings, desc: 'Aggregated list of security & performance alerts.' },
              { name: 'software', label: 'Software Catalog', count: counts.software, desc: 'Normalized list of packages discovered on targets.' },
              { name: 'assets', label: 'Logical Assets', count: counts.assets, desc: 'Disk volumes and CPU evidence nodes.' },
              { name: 'risks', label: 'Risk Indices', count: counts.risks, desc: 'Historical severity counters and drift levels.' },
              { name: 'exports', label: 'Export Packages', count: counts.exports, desc: 'Stored diagnostic snapshots.' }
            ].map(table => (
              <Flex key={table.name} align="center" justify="space-between" borderBottom="1px solid rgba(255,255,255,0.07)" pb="2">
                <Box>
                  <Text fontWeight="bold" fontSize="13px" color="text.primary">{table.label}</Text>
                  <Text fontSize="11px" color="text.muted" fontFamily="mono">table: {table.name} • {table.desc}</Text>
                </Box>
                <Flex align="center" gap="3">
                  <Box className="cyber-badge badge-cyan" fontSize="11px" minW="12">
                    {table.count}
                  </Box>
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Box>

        {/* 5. System Diagnostics */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 5' }} display="flex" flexDirection="column" justifyContent="space-between">
          <Box>
            <Box className="panel-header" mb="5">
              <Heading as="h2" className="panel-title"><Settings size={16} /> System Diagnostics</Heading>
            </Box>

            <Flex direction="column" gap="3" fontSize="13px">
              <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
                <Text color="text.secondary">Graph Nodes Loaded:</Text>
                <Text as="strong" fontFamily="mono">{nodesCount} Nodes</Text>
              </Flex>
              <Flex justify="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" pb="1.5">
                <Text color="text.secondary">Graph Links Rendered:</Text>
                <Text as="strong" fontFamily="mono">{linksCount} Links</Text>
              </Flex>
            </Flex>
          </Box>

          <Box mt="6">
            <Button 
              colorPalette="red"
              variant="solid"
              w="full"
              py="5"
              onClick={handleClearDatabase}
              disabled={isPurging}
            >
              <Trash2 size={14} />
              <Text as="span">{isPurging ? 'Purging Tables...' : 'Purge Assessment Database'}</Text>
            </Button>
            <Text fontSize="11px" color="text.muted" mt="2" textAlign="center" lineHeight="1.4">
              Purging deletes all raw metrics, tables, and history in IndexedDB. Use with caution.
            </Text>
          </Box>

        </Box>

      </SimpleGrid>

    </Flex>
  );
};
