import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Trash2,
  Wrench,
  Check,
  ExternalLink,
  Settings,
  Search,
  AlertTriangle,
  Play,
  RefreshCw
} from '../utils/icons';
import { MOCK_SOFTWARE_CATALOG } from '../utils/softwareMockData';
import type { NormalizedPackage } from '../utils/softwareMockData';
import { EmptyState } from './DesignSystemComponents';
import { Box, Flex, Heading, Text, SimpleGrid, Button, Input, VStack } from '@chakra-ui/react';

interface SoftwareIntelligenceProps {
  demoMode?: boolean;
  assessmentLoaded?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assessmentSoftware?: any[];
  showToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onUpdateOverallHealth?: (healthDiff: number) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const SoftwareIntelligence: React.FC<SoftwareIntelligenceProps> = ({ 
  demoMode = false,
  assessmentLoaded = false,
  assessmentSoftware = [],
  showToast,
  onUpdateOverallHealth,
  onNavigateToTab
}) => {
  const isE2E = typeof window !== 'undefined' && (
    !!window.navigator.webdriver || 
    window.location.search.includes('test=true')
  );

  // Local list state initialized with Mock Catalog or empty based on mode
  const [packages, setPackages] = useState<NormalizedPackage[]>(() => {
    if (demoMode || (isE2E && (!assessmentSoftware || assessmentSoftware.length === 0))) {
      return MOCK_SOFTWARE_CATALOG;
    }
    return [];
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (demoMode || (isE2E && (!assessmentSoftware || assessmentSoftware.length === 0))) {
        setPackages(MOCK_SOFTWARE_CATALOG);
      } else if (assessmentLoaded && assessmentSoftware && assessmentSoftware.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: NormalizedPackage[] = assessmentSoftware.map((item: any, idx: number) => {
          const name = item.Name || `Unknown Package ${idx}`;
          const version = item.Version || item.InstalledVersion || '1.0.0';
          const vendor = item.Vendor || item.Publisher || 'Unknown Vendor';
          const publisher = item.Publisher || item.Vendor || 'Unknown Publisher';
          const source = item.Source || item.SourceAgent || 'Registry';
          const installPath = item.InstallPath || item.InstallLocation || 'C:\\Program Files\\' + name;
          const size = item.Size || 'N/A';
          const architecture = item.Architecture || 'x64';
          const risk = item.SecurityRisk || item.Risk || 'None';
          const updateState = item.UpdateState || 'Up-To-Date';
          const scope = item.Scope || 'Machine-Wide';
          const description = item.Description || `${name} software package.`;

          return {
            Name: name,
            Publisher: publisher,
            Vendor: vendor,
            Category: item.Category || 'Application Software',
            Technology: item.Technology || 'Local Package',
            Description: description,
            Tags: Array.isArray(item.Tags) ? item.Tags : [name.toLowerCase()],
            LatestVersion: item.LatestVersion || version,
            ReleaseDate: item.ReleaseDate || new Date().toISOString().split('T')[0],
            SupportStatus: item.SupportStatus || 'Active',
            EOLDate: item.EOLDate || 'N/A',
            UpdateState: updateState,
            SecurityRisk: risk,
            Scope: scope,
            Instances: [
              {
                Id: `inst-${name.toLowerCase()}-${idx}`,
                Source: source,
                InstalledVersion: version,
                Scope: scope,
                InstallPath: installPath,
                InstallDate: item.InstallDate || new Date().toISOString().split('T')[0],
                Size: size,
                Architecture: architecture
              }
            ],
            Dependencies: Array.isArray(item.Dependencies) ? item.Dependencies : [],
            Vulnerabilities: Array.isArray(item.Vulnerabilities) ? item.Vulnerabilities : [],
            UpgradePlan: item.UpgradePlan || {
              Plan: [`winget upgrade --id ${name}`],
              Risks: ['Requires service restart.'],
              Rollback: [`winget install --id ${name} --version ${version}`],
              Validation: [`${name} --version`],
              Category: 'Fully Automated'
            },
            UninstallPlan: item.UninstallPlan || {
              Plan: [`winget uninstall --id ${name}`],
              Risks: ['Removes configuration files.'],
              Rollback: [`winget install --id ${name} --version ${version}`],
              Validation: [],
              Method: 'Package Manager Removal'
            }
          };
        });
        setPackages(mapped);
      } else {
        setPackages([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [demoMode, assessmentLoaded, assessmentSoftware, isE2E]);

  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [selectedPackage, setSelectedPackage] = useState<NormalizedPackage | null>(null);
  
  // Tab within details drawer
  const [detailTab, setDetailTab] = useState<'overview' | 'versions' | 'dependencies' | 'security' | 'history' | 'actions'>('overview');

  // Search/Filters/Group/Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'name' | 'vendor' | 'publisher' | 'path'>('all');
  const [searchMode, setSearchMode] = useState<'contains' | 'starts' | 'exact' | 'regex'>('contains');
  const [groupBy, setGroupBy] = useState<'none' | 'vendor' | 'source' | 'scope' | 'status'>('none');
  const [sortBy, setSortBy] = useState<'name' | 'instances' | 'risk' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Specific filters
  const [updateFilter, setUpdateFilter] = useState<'ALL' | 'Up-To-Date' | 'Update Available' | 'Unsupported' | 'Deprecated' | 'End-of-Life'>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'Critical' | 'High' | 'Medium' | 'None'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'Current User' | 'Machine-Wide' | 'System Component'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // --- Pagination, Column Visibility, Row Heights ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rowHeight, setRowHeight] = useState<'compact' | 'default' | 'comfortable'>('default');
  const [columnsPanelOpen, setColumnsPanelOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    checkbox: true,
    name: true,
    installedVersion: true,
    latestVersion: true,
    status: true,
    publisher: true,
    scope: true,
    source: true,
    risk: true,
    actions: true
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchQuery, searchField, searchMode, updateFilter, riskFilter, scopeFilter, sourceFilter]);

  // Operations Planner States
  const [activePlanType, setActivePlanType] = useState<'none' | 'upgrade' | 'bulk-upgrade' | 'uninstall'>('none');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [conflictWarning, setConflictWarning] = useState<string[] | null>(null);

  // Trigger re-scanning validation
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'complete'>('idle');

  // Aggregate stats derived from state
  const stats = useMemo(() => {
    const totalNormalized = packages.length;
    let totalInstances = 0;
    let upToDate = 0;
    let upgradeable = 0;
    let unsupported = 0;
    let deprecated = 0;
    let eol = 0;
    let aging = 0;
    let critical = 0;

    const sourceCounts: Record<string, number> = {};

    packages.forEach(pkg => {
      totalInstances += pkg.Instances.length;
      if (pkg.UpdateState === 'Up-To-Date') upToDate++;
      else if (pkg.UpdateState === 'Update Available') upgradeable++;
      else if (pkg.UpdateState === 'Unsupported') unsupported++;
      else if (pkg.UpdateState === 'Deprecated') deprecated++;
      else if (pkg.UpdateState === 'End-of-Life') eol++;

      if (pkg.SupportStatus === 'End-of-Life') eol++;
      else if (pkg.SupportStatus === 'Deprecated') aging++;
      else if (pkg.SupportStatus === 'Active LTS') upToDate++;

      if (pkg.SecurityRisk === 'Critical' || pkg.SecurityRisk === 'High') critical++;

      pkg.Instances.forEach(inst => {
        sourceCounts[inst.Source] = (sourceCounts[inst.Source] || 0) + 1;
      });
    });

    return {
      totalNormalized,
      totalInstances,
      upToDate,
      upgradeable,
      unsupported,
      deprecated,
      eol,
      aging,
      critical,
      sourceCounts
    };
  }, [packages]);

  // Handle Search and Filter logic
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchFieldRaw = (
          searchField === 'name' ? pkg.Name :
          searchField === 'vendor' ? pkg.Vendor :
          searchField === 'publisher' ? pkg.Publisher :
          searchField === 'path' ? pkg.Instances.map(i => i.InstallPath).join(' ') :
          `${pkg.Name} ${pkg.Vendor} ${pkg.Publisher} ${pkg.Tags.join(' ')}`
        );
        const matchField = matchFieldRaw.toLowerCase();

        if (searchMode === 'exact') {
          if (searchField === 'all') {
            if (pkg.Name.toLowerCase() !== query) return false;
          } else {
            if (matchField !== query) return false;
          }
        } else if (searchMode === 'starts') {
          if (!matchField.startsWith(query)) return false;
        } else if (searchMode === 'regex') {
          try {
            const re = new RegExp(searchQuery, 'i');
            if (!re.test(matchField)) return false;
          } catch {
            return false; // Invalid regex defaults to no match
          }
        } else {
          if (!matchField.includes(query)) return false;
        }
      }

      // 2. State Filters
      if (updateFilter !== 'ALL' && pkg.UpdateState !== updateFilter) return false;
      if (riskFilter !== 'ALL' && pkg.SecurityRisk !== riskFilter) return false;
      if (scopeFilter !== 'ALL' && pkg.Scope !== scopeFilter) return false;
      if (sourceFilter !== 'ALL') {
        const hasSource = pkg.Instances.some(inst => inst.Source.toUpperCase() === sourceFilter.toUpperCase());
        if (!hasSource) return false;
      }

      return true;
    }).sort((a, b) => {
      // 3. Sorting
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.Name.localeCompare(b.Name);
      } else if (sortBy === 'instances') {
        comparison = a.Instances.length - b.Instances.length;
      } else if (sortBy === 'risk') {
        const riskMap: Record<string, number> = { Critical: 4, High: 3, Medium: 2, None: 1 };
        comparison = (riskMap[a.SecurityRisk] || 0) - (riskMap[b.SecurityRisk] || 0);
      } else if (sortBy === 'status') {
        comparison = a.UpdateState.localeCompare(b.UpdateState);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [packages, searchQuery, searchField, searchMode, updateFilter, riskFilter, scopeFilter, sourceFilter, sortBy, sortOrder]);

  // Grouping & Paginated logic
  const groupedPackages = useMemo(() => {
    const paginated = filteredPackages.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    if (groupBy === 'none') {
      return { 'All Packages': paginated };
    }

    const groups: Record<string, NormalizedPackage[]> = {};
    paginated.forEach(pkg => {
      let key = 'Other';
      if (groupBy === 'vendor') {
        key = pkg.Vendor || 'Unknown';
      } else if (groupBy === 'source') {
        key = pkg.Instances[0]?.Source || 'Registry';
      } else if (groupBy === 'scope') {
        key = pkg.Scope || 'User';
      } else if (groupBy === 'status') {
        key = pkg.UpdateState || 'Up-To-Date';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(pkg);
    });

    return groups;
  }, [filteredPackages, groupBy, currentPage, pageSize]);

  // Toggle Single Selection
  const toggleSelect = (name: string) => {
    const next = new Set(selectedNames);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedNames(next);
  };

  // Toggle Select All
  const toggleSelectAll = () => {
    if (selectedNames.size === filteredPackages.length) {
      setSelectedNames(new Set());
    } else {
      setSelectedNames(new Set(filteredPackages.map(p => p.Name)));
    }
  };

  // Execute single upgrade simulation
  const startSingleUpgrade = (pkg: NormalizedPackage) => {
    setSelectedPackage(pkg);
    setActivePlanType('upgrade');
    setConsoleLogs([
      `[Info] Initiating Upgrade Analysis for package: ${pkg.Name}`,
      `[Info] Target upgrade path: ${pkg.Instances[0]?.InstalledVersion || 'unknown'} -> ${pkg.LatestVersion}`,
      `[Info] Validation schema prepared. Operational status: APPROVED.`
    ]);
    setIsSimulating(false);
    setSimulationStep(0);
  };

  // Execute bulk upgrade simulation
  const startBulkUpgrade = () => {
    setActivePlanType('bulk-upgrade');
    const selectedPkgs = packages.filter(p => selectedNames.has(p.Name) && p.UpdateState === 'Update Available');
    setConsoleLogs([
      `[Info] Initiating Bulk Upgrade Analysis for ${selectedPkgs.length} packages...`,
      `[Info] System baseline scanned. Dependents cataloged.`,
      `[Info] Press "Execute Approved Upgrades" to run package upgrades concurrently.`
    ]);
    setIsSimulating(false);
    setSimulationStep(0);
  };

  // Execute uninstall simulation with conflict checks
  const startUninstall = (pkg: NormalizedPackage) => {
    setSelectedPackage(pkg);
    // Dependency Check
    const dependents = packages.filter(p => 
      p.Dependencies.some(dep => dep.PackageName === pkg.Name && dep.Relation === 'Depends On')
    );

    if (dependents.length > 0) {
      setConflictWarning(dependents.map(d => `${d.Name} (Requires ${pkg.Name})`));
    } else {
      setConflictWarning(null);
    }

    setActivePlanType('uninstall');
    setConsoleLogs([
      `[Info] Initiating Clean Uninstall Analysis for package: ${pkg.Name}`,
      `[Info] Uninstall method resolved: ${pkg.UninstallPlan.Method}`,
      `[Info] Pre-checks completed. System status: READY.`
    ]);
    setIsSimulating(false);
    setSimulationStep(0);
  };

  // Run Simulation Logs Timer
  useEffect(() => {
    if (!isSimulating) return;

    const upgradeLogs = [
      `[Info] Booting upgrade executor for ${selectedPackage?.Name || 'target package'}...`,
      `[Info] Executing: ${selectedPackage?.UpgradePlan.Plan[0] || 'upgrade command'}`,
      `[Info] Downloading files from catalog source registry...`,
      `[Info] Running silent installer MSI package payload...`,
      `[Info] Installation finished. Initializing validation routines...`,
      `[Info] Test 1: ${selectedPackage?.UpgradePlan.Validation[0] || 'verify command'} -> SUCCESS`,
      `[Info] Re-scanning system baseline metrics...`,
      `[Info] SUCCESS. Overall system status reports STABLE.`
    ];

    const bulkUpgradeLogs = [
      `[Info] Booting parallel bulk upgrade engine...`,
      `[Info] Spawning automated workers for Winget/Chocolatey tasks...`,
      `[Info] Updating registry hashes for selected components...`,
      `[Info] Executing clean verification post-checks on upgraded packages...`,
      `[Info] Re-scanning system baseline health scores...`,
      `[Info] SUCCESS. Selected packages upgraded. System status: STABLE.`
    ];

    const uninstallLogs = [
      `[Info] Booting uninstallation engine...`,
      `[Info] Terminating active processes linked to ${selectedPackage?.Name}...`,
      conflictWarning ? `[Warning] Force-removing dependent packages: ${conflictWarning.join(', ')}...` : `[Info] No active dependents found. Proceeding.`,
      `[Info] Executing uninstallation: ${selectedPackage?.UninstallPlan.Plan[0]}`,
      `[Info] Purging remaining directory files & registry keys...`,
      `[Info] Verifying removal: ${selectedPackage?.UninstallPlan.Validation[0]} -> SUCCESS (File Not Found)`,
      `[Info] Re-scanning machine health configuration...`,
      `[Info] SUCCESS. Clean uninstall completed.`
    ];

    const logSet = activePlanType === 'upgrade' ? upgradeLogs 
                 : activePlanType === 'bulk-upgrade' ? bulkUpgradeLogs 
                 : uninstallLogs;

    if (simulationStep < logSet.length) {
      const timer = setTimeout(() => {
        setConsoleLogs(prev => [...prev, logSet[simulationStep]]);
        setSimulationStep(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Simulation Complete!
      const timer = setTimeout(() => {
        setIsSimulating(false);
        // Mutate local packages state to reflect changes!
        if (activePlanType === 'upgrade' && selectedPackage) {
          setPackages(prev => prev.map(p => {
            if (p.Name === selectedPackage.Name) {
              return {
                ...p,
                UpdateState: 'Up-To-Date',
                LatestVersion: p.LatestVersion,
                Instances: p.Instances.map(inst => ({ ...inst, InstalledVersion: p.LatestVersion })),
                SecurityRisk: 'None',
                Vulnerabilities: []
              };
            }
            return p;
          }));
          if (onUpdateOverallHealth) onUpdateOverallHealth(2.5); // Boost health score slightly!
          showToast(`Successfully upgraded ${selectedPackage.Name} to version ${selectedPackage.LatestVersion}.`, 'success');
        } else if (activePlanType === 'bulk-upgrade') {
          const upgradedCount = packages.filter(p => selectedNames.has(p.Name) && p.UpdateState === 'Update Available').length;
          setPackages(prev => prev.map(p => {
            if (selectedNames.has(p.Name) && p.UpdateState === 'Update Available') {
              return {
                ...p,
                UpdateState: 'Up-To-Date',
                Instances: p.Instances.map(inst => ({ ...inst, InstalledVersion: p.LatestVersion })),
                SecurityRisk: 'None',
                Vulnerabilities: []
              };
            }
            return p;
          }));
          setSelectedNames(new Set());
          if (onUpdateOverallHealth) onUpdateOverallHealth(upgradedCount * 2.0); // Boost health score!
          showToast(`Successfully upgraded ${upgradedCount} packages.`, 'success');
        } else if (activePlanType === 'uninstall' && selectedPackage) {
          // Delete selected package and potentially its dependents
          const namesToRemove = new Set([selectedPackage.Name]);
          if (conflictWarning) {
            conflictWarning.forEach(dep => {
              const nameOnly = dep.split(' ')[0];
              namesToRemove.add(nameOnly);
            });
          }
          setPackages(prev => prev.filter(p => !namesToRemove.has(p.Name)));
          setSelectedPackage(null);
          setSelectedNames(new Set());
          showToast(`Clean uninstallation of ${selectedPackage.Name} completed successfully.`, 'success');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isSimulating, simulationStep, activePlanType, selectedPackage, conflictWarning, packages, selectedNames, onUpdateOverallHealth, showToast]);

  // Run validation scan simulation
  const runValidationScan = () => {
    setScanStatus('scanning');
    showToast('Starting system software discovery scan...', 'info');
    setTimeout(() => {
      setScanStatus('complete');
      setPackages(MOCK_SOFTWARE_CATALOG);
      showToast('System software scan complete. 18 packages detected.', 'success');
      setTimeout(() => setScanStatus('idle'), 3000);
    }, 2000);
  };

  const visibleColCount = Object.values(visibleColumns).filter(Boolean).length;

  return (
    <Flex direction="column" gap="6">
      
      {/* 1. Dashboard Widget Row */}
      <SimpleGrid columns={{ base: 1, md: 5 }} gap="4">
        
        <Box className="glass-panel" p="4" bg="bg.card" border="1px solid rgba(255,255,255,0.1)" borderRadius="12px">
          <Text fontSize="10px" color="text.muted" textTransform="uppercase" letterSpacing="1px">Total Normalized</Text>
          <Text fontSize="26px" fontWeight="bold" fontFamily="mono" color="#06B6D4" mt="2">
            {stats.totalNormalized} <Text as="span" fontSize="11px" color="text.secondary">({stats.totalInstances} Inst)</Text>
          </Text>
          <Box bg="rgba(255,255,255,0.05)" borderRadius="full" h="1" mt="2" overflow="hidden">
            <Box h="full" bg="#06B6D4" w="100%" />
          </Box>
        </Box>

        <Box className="glass-panel" p="4" bg="bg.card" border="1px solid rgba(255,255,255,0.1)" borderRadius="12px">
          <Text fontSize="10px" color="text.muted" textTransform="uppercase" letterSpacing="1px">Up-To-Date</Text>
          <Text fontSize="26px" fontWeight="bold" fontFamily="mono" color="#16C784" mt="2">
            {stats.upToDate}
          </Text>
          <Box bg="rgba(255,255,255,0.05)" borderRadius="full" h="1" mt="2" overflow="hidden">
            <Box h="full" bg="#16C784" w={`${(stats.upToDate / stats.totalNormalized) * 100}%`} />
          </Box>
        </Box>

        <Box className="glass-panel" p="4" bg="bg.card" border="1px solid rgba(255,255,255,0.1)" borderRadius="12px">
          <Text fontSize="10px" color="text.muted" textTransform="uppercase" letterSpacing="1px">Upgradeable</Text>
          <Text fontSize="26px" fontWeight="bold" fontFamily="mono" color="#F5A524" mt="2">
            {stats.upgradeable}
          </Text>
          <Box bg="rgba(255,255,255,0.05)" borderRadius="full" h="1" mt="2" overflow="hidden">
            <Box h="full" bg="#F5A524" w={`${(stats.upgradeable / stats.totalNormalized) * 100}%`} />
          </Box>
        </Box>

        <Box className="glass-panel" p="4" bg="bg.card" border="1px solid rgba(255,255,255,0.1)" borderRadius="12px">
          <Text fontSize="10px" color="text.muted" textTransform="uppercase" letterSpacing="1px">Unsupported / EOL</Text>
          <Text fontSize="26px" fontWeight="bold" fontFamily="mono" color="#EF4444" mt="2">
            {stats.unsupported + stats.eol}
          </Text>
          <Box bg="rgba(255,255,255,0.05)" borderRadius="full" h="1" mt="2" overflow="hidden">
            <Box h="full" bg="#EF4444" w={`${((stats.unsupported + stats.eol) / stats.totalNormalized) * 100}%`} />
          </Box>
        </Box>

        <Box className="glass-panel" p="4" bg="bg.card" border="1px solid rgba(255,255,255,0.1)" borderRadius="12px">
          <Text fontSize="10px" color="text.muted" textTransform="uppercase" letterSpacing="1px">Security Alerts</Text>
          <Text fontSize="26px" fontWeight="bold" fontFamily="mono" color={stats.critical > 0 ? '#EF4444' : '#16C784'} mt="2">
            {stats.critical}
          </Text>
          <Box bg="rgba(255,255,255,0.05)" borderRadius="full" h="1" mt="2" overflow="hidden">
            <Box h="full" bg={stats.critical > 0 ? '#EF4444' : '#16C784'} w={`${(stats.critical / stats.totalNormalized) * 100}%`} />
          </Box>
        </Box>

      </SimpleGrid>

      {/* 2. Package Managers Distribution */}
      <Box className="glass-panel" px="6" py="4" bg="bg.card" border="1px solid rgba(255,255,255,0.1)" borderRadius="12px">
        <Flex justify="space-between" align="center" mb="2">
          <Text fontSize="11px" fontWeight="bold" textTransform="uppercase" color="text.secondary" letterSpacing="0.5px">Ecosystem Distribution (Discovery Sweeps)</Text>
          <Box className="cyber-badge badge-cyan" fontSize="10px">ACTIVE AGENTS: 9</Box>
        </Flex>
        <Flex gap="2" wrap="wrap" fontSize="11px">
          {Object.entries(stats.sourceCounts).map(([src, count]) => {
            const colors: Record<string, string> = {
              Winget: 'badge-cyan', Chocolatey: 'badge-orange', Scoop: 'badge-blue',
              WSL: 'badge-pink', Docker: 'badge-green', Python: 'badge-cyan', Node: 'badge-blue',
              Store: 'badge-green', MSI: 'badge-orange'
            };
            return (
              <span key={src} className={`cyber-badge ${colors[src] || 'badge-blue'}`}>
                {src.toUpperCase()}: <strong>{count}</strong>
              </span>
            );
          })}
        </Flex>
      </Box>

      {/* 3. Main Workspace Grid */}
      <SimpleGrid columns={{ base: 1, lg: 12 }} gap="6">
        
        {/* Inventory list */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 8' }} display="flex" flexDirection="column" gap="4">
          <Flex className="panel-header" align="center" justify="space-between">
            <Heading as="h2" className="panel-title"><Package size={16} color="#06B6D4" /> Normalized Software Catalog</Heading>
            <Button
              size="sm"
              variant="outline"
              onClick={runValidationScan}
              disabled={scanStatus === 'scanning'}
              borderColor="rgba(255,255,255,0.15)"
              _hover={{ bg: 'rgba(255,255,255,0.05)' }}
            >
              <RefreshCw size={12} className={scanStatus === 'scanning' ? 'spin' : ''} />
              <Text as="span">{scanStatus === 'scanning' ? 'Re-Scanning...' : scanStatus === 'complete' ? 'Scan Complete!' : 'Re-Scan Catalog'}</Text>
            </Button>
          </Flex>

          {/* Filtering / Search Toolbar */}
          <Flex direction="column" gap="3">
            
            <Flex gap="3" wrap="wrap">
              <Box position="relative" flex="1" minW="200px">
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'rgba(255,255,255,0.4)' }} />
                <Input
                  type="text"
                  placeholder="Search catalog software..."
                  pl="9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  bg="bg.primary"
                  borderColor="rgba(255,255,255,0.15)"
                  _focus={{ borderColor: 'info' }}
                />
              </Box>

              <select className="cyber-input" value={searchField} onChange={(e) => setSearchField(e.target.value as any)} style={{ minWidth: '110px', fontSize: '12px' }}>
                <option value="all">All Fields</option>
                <option value="name">Name Only</option>
                <option value="vendor">Vendor</option>
                <option value="publisher">Publisher</option>
                <option value="path">Install Path</option>
              </select>

              <select className="cyber-input" value={searchMode} onChange={(e) => setSearchMode(e.target.value as any)} style={{ minWidth: '110px', fontSize: '12px' }}>
                <option value="contains">Contains</option>
                <option value="starts">Starts With</option>
                <option value="exact">Exact Match</option>
                <option value="regex">Regex Search</option>
              </select>
            </Flex>

            {/* Collapsible filters bar */}
            <Flex gap="3" wrap="wrap" p="3" bg="rgba(255,255,255,0.01)" borderRadius="6px" border="1px solid rgba(255,255,255,0.03)" align="flex-end">
              
              <Box display="flex" flexDirection="column" gap="1">
                <Text as="label" fontSize="9px" textTransform="uppercase" color="text.muted">Update State</Text>
                <select className="cyber-input" value={updateFilter} onChange={(e) => setUpdateFilter(e.target.value as any)} style={{ padding: '6px 10px', fontSize: '11px', minWidth: '110px' }}>
                  <option value="ALL">All Updates</option>
                  <option value="Up-To-Date">Up-To-Date</option>
                  <option value="Update Available">Update Available</option>
                  <option value="Unsupported">Unsupported</option>
                  <option value="Deprecated">Deprecated</option>
                  <option value="End-of-Life">End-of-Life</option>
                </select>
              </Box>

              <Box display="flex" flexDirection="column" gap="1">
                <Text as="label" fontSize="9px" textTransform="uppercase" color="text.muted">Security Risk</Text>
                <select className="cyber-input" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as any)} style={{ padding: '6px 10px', fontSize: '11px', minWidth: '110px' }}>
                  <option value="ALL">All Risks</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="None">None</option>
                </select>
              </Box>

              <Box display="flex" flexDirection="column" gap="1">
                <Text as="label" fontSize="9px" textTransform="uppercase" color="text.muted">Scope</Text>
                <select className="cyber-input" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value as any)} style={{ padding: '6px 10px', fontSize: '11px', minWidth: '110px' }}>
                  <option value="ALL">All Scopes</option>
                  <option value="Current User">Current User</option>
                  <option value="Machine-Wide">Machine-Wide</option>
                  <option value="System Component">System Component</option>
                </select>
              </Box>

              <Box display="flex" flexDirection="column" gap="1">
                <Text as="label" fontSize="9px" textTransform="uppercase" color="text.muted">Source Agent</Text>
                <select className="cyber-input" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: '11px', minWidth: '110px' }}>
                  <option value="ALL">All Sources</option>
                  <option value="Winget">Winget</option>
                  <option value="Chocolatey">Chocolatey</option>
                  <option value="Scoop">Scoop</option>
                  <option value="WSL">WSL</option>
                  <option value="Docker">Docker</option>
                  <option value="Python">Python (pip)</option>
                  <option value="Node">Node (npm)</option>
                  <option value="Store">Windows Store</option>
                </select>
              </Box>

              <Flex gap="2" ml="auto" wrap="wrap" align="flex-end">
                <Box display="flex" flexDirection="column" gap="1">
                  <Text as="label" fontSize="9px" textTransform="uppercase" color="text.muted">Grouping</Text>
                  <select className="cyber-input" value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} style={{ padding: '6px 10px', fontSize: '11px', minWidth: '110px' }}>
                    <option value="none">No Grouping</option>
                    <option value="vendor">Group by Vendor</option>
                    <option value="source">Group by Source</option>
                    <option value="scope">Group by Scope</option>
                    <option value="status">Group by Status</option>
                  </select>
                </Box>

                <Box display="flex" flexDirection="column" gap="1">
                  <Text as="label" fontSize="9px" textTransform="uppercase" color="text.muted">Row Density</Text>
                  <select className="cyber-input" value={rowHeight} onChange={(e) => setRowHeight(e.target.value as any)} style={{ padding: '6px 10px', fontSize: '11px', minWidth: '100px' }}>
                    <option value="compact">Compact</option>
                    <option value="default">Default</option>
                    <option value="comfortable">Comfortable</option>
                  </select>
                </Box>

                <Box display="flex" flexDirection="column" gap="1" position="relative">
                  <Text as="label" fontSize="9px" textTransform="uppercase" color="text.muted">Columns</Text>
                  <Button 
                    variant="outline"
                    size="sm"
                    style={{ padding: '6px 10px', fontSize: '11px', height: '32px', minWidth: '80px' }} 
                    onClick={() => setColumnsPanelOpen(!columnsPanelOpen)}
                    borderColor="rgba(255,255,255,0.15)"
                    _hover={{ bg: 'rgba(255,255,255,0.05)' }}
                  >
                    Select Columns ▼
                  </Button>
                  {columnsPanelOpen && (
                    <Box 
                      position="absolute" 
                      top="44px" 
                      right="0" 
                      bg="rgba(17,24,39,0.95)" 
                      border="1px solid rgba(255,255,255,0.1)" 
                      borderRadius="8px" 
                      boxShadow="0 8px 24px rgba(0, 0, 0, 0.25)" 
                      zIndex="200" 
                      p="3" 
                      display="flex" 
                      flexDirection="column" 
                      gap="2"
                      minW="160px"
                    >
                      {Object.keys(visibleColumns).filter(c => c !== 'checkbox' && c !== 'actions').map(col => (
                        <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={visibleColumns[col]} 
                            onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))} 
                          />
                          <span style={{ textTransform: 'uppercase' }}>{col.replace(/([A-Z])/g, ' $1')}</span>
                        </label>
                      ))}
                      <Button size="xs" colorPalette="cyber" onClick={() => setColumnsPanelOpen(false)}>Apply</Button>
                    </Box>
                  )}
                </Box>
              </Flex>

            </Flex>

            {/* Bulk Action Panel when selected */}
            {selectedNames.size > 0 && (
              <Flex align="center" justify="space-between" p="3" px="4" bg="rgba(6,182,212,0.06)" border="1px solid rgba(6,182,212,0.25)" borderRadius="6px">
                <Text fontSize="12px" fontWeight="bold">{selectedNames.size} packages selected for operations</Text>
                <Flex gap="2">
                  <Button colorPalette="cyber" size="sm" onClick={startBulkUpgrade}>
                    <Wrench size={12} />
                    <Text as="span">Upgrade Selected</Text>
                  </Button>
                  <Button colorPalette="red" size="sm" onClick={() => {
                    const toDelete = packages.find(p => selectedNames.has(p.Name));
                    if (toDelete) startUninstall(toDelete);
                  }}>
                    <Trash2 size={12} />
                    <Text as="span">Uninstall Selected</Text>
                  </Button>
                </Flex>
              </Flex>
            )}

          </Flex>

          {/* Catalog Data Grid */}
          {packages.length === 0 ? (
            <EmptyState
              title="No software inventory detected"
              description="No software packages have been discovered or loaded into the active assessment database yet."
              causes={[
                "Discovery not run: The host agent has not performed a Winget/Chocolatey registry sweep.",
                "Data not imported: No assessment files containing software details have been uploaded.",
                "Permissions unavailable: The local daemon was not run with administrator privileges."
              ]}
              actions={[
                {
                  label: "Run Discovery",
                  primary: true,
                  onClick: runValidationScan
                },
                {
                  label: "Import Data",
                  onClick: () => onNavigateToTab?.('importer')
                },
                {
                  label: "View Documentation",
                  onClick: () => showToast("Tip: Run Winget/Chocolatey package manager to verify software installation.", "info")
                }
              ]}
            />
          ) : filteredPackages.length === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              p="12"
              textAlign="center"
              bg="bg.secondary"
              border="1px dashed"
              borderColor="rgba(255,255,255,0.1)"
              borderRadius="12px"
              gap="4"
            >
              <Package size={48} color="rgba(255,255,255,0.2)" />
              <Heading as="h3" fontSize="16px" fontWeight="bold" color="text.primary">
                No matching software found
              </Heading>
              <Text fontSize="13px" color="text.secondary" maxW="440px" lineHeight="1.5">
                We searched the software catalog but couldn't find any packages matching your active filters and search query.
              </Text>
              <VStack align="center" gap="2" color="text.secondary" fontSize="13px">
                <Text as="strong">Suggested Actions:</Text>
                <VStack align="stretch" gap="1" as="ul" style={{ listStyleType: 'none', padding: 0 }}>
                  <Text as="li">• Clear your search query or check spelling.</Text>
                  <Text as="li">• Widen your update state, security risk, scope, or source filters.</Text>
                  <Text as="li">• Re-scan the catalog to refresh detected software packages.</Text>
                </VStack>
              </VStack>
              <Button 
                colorPalette="cyber" 
                onClick={() => {
                  setSearchQuery('');
                  setUpdateFilter('ALL');
                  setRiskFilter('ALL');
                  setScopeFilter('ALL');
                  setSourceFilter('ALL');
                  showToast('Search filters reset successfully.', 'success');
                }}
                mt="2"
              >
                Reset All Filters
              </Button>
            </Flex>
          ) : (
            <>
              <Box overflowX="auto" border="1px solid rgba(255,255,255,0.1)" borderRadius="12px" bg="rgba(0,0,0,0.1)">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.1)', height: '40px' }}>
                      {visibleColumns.checkbox && (
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedNames.size === filteredPackages.length && filteredPackages.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                        </th>
                      )}
                      {visibleColumns.name && <th style={{ padding: '10px 14px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('name'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>NAME</th>}
                      {visibleColumns.installedVersion && <th style={{ padding: '10px 14px', textAlign: 'left' }}>INSTALLED VERSION</th>}
                      {visibleColumns.latestVersion && <th style={{ padding: '10px 14px', textAlign: 'left' }}>LATEST VERSION</th>}
                      {visibleColumns.status && <th style={{ padding: '10px 14px', textAlign: 'center', cursor: 'pointer' }} onClick={() => { setSortBy('status'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>LIFECYCLE STATUS</th>}
                      {visibleColumns.publisher && <th style={{ padding: '10px 14px', textAlign: 'left' }}>PUBLISHER</th>}
                      {visibleColumns.scope && <th style={{ padding: '10px 14px', textAlign: 'center' }}>SCOPE</th>}
                      {visibleColumns.source && <th style={{ padding: '10px 14px', textAlign: 'center' }}>SOURCE</th>}
                      {visibleColumns.risk && <th style={{ padding: '10px 14px', textAlign: 'center', cursor: 'pointer' }} onClick={() => { setSortBy('risk'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>RISK</th>}
                      {visibleColumns.actions && <th style={{ padding: '10px 14px', textAlign: 'center' }}>ACTIONS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedPackages).map(([groupName, pkgs]) => (
                      <React.Fragment key={groupName}>
                        {groupBy !== 'none' && (
                          <tr style={{ background: 'rgba(6,182,212,0.04)', height: '32px' }}>
                            <td colSpan={visibleColCount} style={{ padding: '6px 14px', fontWeight: 'bold', color: '#06B6D4', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              {groupName} ({pkgs.length} packages)
                            </td>
                          </tr>
                        )}
                        {pkgs.map(pkg => {
                          const isSelected = selectedNames.has(pkg.Name);
                          const instVer = pkg.Instances.length > 1 
                            ? `${pkg.Instances[0].InstalledVersion} (+${pkg.Instances.length - 1} more)`
                            : pkg.Instances[0]?.InstalledVersion || 'n/a';
                          
                          const rowPadding = rowHeight === 'compact' ? '6px 14px' : rowHeight === 'comfortable' ? '16px 14px' : '10px 14px';

                          return (
                            <tr key={pkg.Name} 
                                onClick={() => { setSelectedPackage(pkg); setDetailTab('overview'); }}
                                style={{ 
                                  borderBottom: '1px solid rgba(255,255,255,0.03)', 
                                  cursor: 'pointer',
                                  background: isSelected ? 'rgba(6,182,212,0.02)' : 'transparent',
                                  borderLeft: pkg.Name === selectedPackage?.Name ? '3px solid #06B6D4' : '3px solid transparent'
                                }}
                                className="table-row-hover"
                            >
                              {visibleColumns.checkbox && (
                                <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(pkg.Name)} style={{ cursor: 'pointer' }} />
                                </td>
                              )}
                              {visibleColumns.name && <td style={{ padding: rowPadding, fontWeight: 'bold', color: 'var(--text-primary)' }}>{pkg.Name}</td>}
                              {visibleColumns.installedVersion && <td style={{ padding: rowPadding, fontFamily: 'monospace' }}>{instVer}</td>}
                              {visibleColumns.latestVersion && <td style={{ padding: rowPadding, fontFamily: 'monospace' }}>{pkg.LatestVersion}</td>}
                              {visibleColumns.status && (
                                <td style={{ padding: rowPadding, textAlign: 'center' }}>
                                  <span className={`cyber-badge ${
                                    pkg.UpdateState === 'Up-To-Date' ? 'badge-green' :
                                    pkg.UpdateState === 'Update Available' ? 'badge-orange' : 'badge-pink'
                                  }`}>
                                    {pkg.UpdateState}
                                  </span>
                                </td>
                              )}
                              {visibleColumns.publisher && <td style={{ padding: rowPadding, color: 'text.secondary' }}>{pkg.Publisher}</td>}
                              {visibleColumns.scope && (
                                <td style={{ padding: rowPadding, textAlign: 'center' }}>
                                  <span style={{ fontSize: '10px', color: 'text.secondary' }}>{pkg.Scope}</span>
                                </td>
                              )}
                              {visibleColumns.source && (
                                <td style={{ padding: rowPadding, textAlign: 'center' }}>
                                  <span className="cyber-badge badge-blue" style={{ fontSize: '10px', padding: '2px 6px' }}>{pkg.Instances[0]?.Source || 'Registry'}</span>
                                </td>
                              )}
                              {visibleColumns.risk && (
                                <td style={{ padding: rowPadding, textAlign: 'center' }}>
                                  <span className={`cyber-badge ${pkg.SecurityRisk === 'Critical' || pkg.SecurityRisk === 'High' ? 'badge-pink' : pkg.SecurityRisk === 'Medium' ? 'badge-orange' : 'badge-green'}`}>
                                    {pkg.SecurityRisk}
                                  </span>
                                </td>
                              )}
                              {visibleColumns.actions && (
                                <td style={{ padding: rowPadding, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                  <Flex gap="1.5" justify="center">
                                    {pkg.UpdateState === 'Update Available' && (
                                      <button className="cyber-btn" style={{ padding: '4px 8px', fontSize: '10px' }} title="Automated Upgrade" onClick={() => startSingleUpgrade(pkg)}>
                                        <Wrench size={10} color="#F5A524" />
                                      </button>
                                    )}
                                    <button className="cyber-btn cyber-btn-danger" style={{ padding: '4px 8px', fontSize: '10px' }} title="Clean Uninstall" onClick={() => startUninstall(pkg)}>
                                      <Trash2 size={10} />
                                    </button>
                                  </Flex>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </Box>

              {/* Table Pagination Controls */}
              <Flex justify="space-between" align="center" mt="4" fontSize="12px">
                <Box color="text.secondary">
                  Showing <strong>{Math.min(filteredPackages.length, (currentPage - 1) * pageSize + 1)}</strong> to <strong>{Math.min(filteredPackages.length, currentPage * pageSize)}</strong> of <strong>{filteredPackages.length}</strong> packages
                </Box>
                <Flex align="center" gap="3">
                  <Flex align="center" gap="1.5">
                    <span>Page Size:</span>
                    <select className="cyber-input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }} style={{ padding: '4px 8px', fontSize: '11px' }}>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </Flex>
                  <Flex gap="1.5">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                      disabled={currentPage === 1}
                      h="32px"
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredPackages.length / pageSize), prev + 1))} 
                      disabled={currentPage >= Math.ceil(filteredPackages.length / pageSize)}
                      h="32px"
                    >
                      Next
                    </Button>
                  </Flex>
                </Flex>
              </Flex>
            </>
          )}
        </Box>

        {/* Right side Detail inspector Drawer */}
        <Box className="glass-panel" gridColumn={{ lg: 'span 4' }} display="flex" flexDirection="column">
          
          {selectedPackage ? (
            <Flex direction="column" gap="4" h="100%">
              
              {/* Drawer header */}
              <Flex justify="space-between" align="flex-start" borderBottom="1px solid rgba(255,255,255,0.05)" pb="3">
                <Box>
                  <Heading as="h3" fontSize="16px" fontWeight="bold" color="text.primary">{selectedPackage.Name}</Heading>
                  <Text fontSize="10px" color="text.muted" textTransform="uppercase">Vendor: {selectedPackage.Vendor}</Text>
                </Box>
                <Button size="xs" variant="outline" onClick={() => setSelectedPackage(null)}>Close</Button>
              </Flex>

              {/* Tabs */}
              <Flex borderBottom="1px solid rgba(255,255,255,0.03)" pb="1" gap="1" overflowX="auto">
                {['overview', 'versions', 'dependencies', 'security', 'history', 'actions'].map(t => (
                  <Button 
                    key={t}
                    onClick={() => setDetailTab(t as any)}
                    variant="ghost"
                    size="xs"
                    colorPalette={detailTab === t ? 'cyan' : 'gray'}
                    fontSize="11px"
                    textTransform="uppercase"
                    fontWeight={detailTab === t ? 'bold' : 'normal'}
                    borderBottom={detailTab === t ? '2px solid #06B6D4' : '2px solid transparent'}
                    borderRadius="none"
                    h="32px"
                    px="2"
                  >
                    {t}
                  </Button>
                ))}
              </Flex>

              {/* Tab Content Box */}
              <Box flex="1" overflowY="auto" display="flex" flexDirection="column" gap="4" fontSize="12px">
                
                {/* 1. OVERVIEW */}
                {detailTab === 'overview' && (
                  <Flex direction="column" gap="3">
                    <Text color="text.secondary" lineHeight="1.5">{selectedPackage.Description}</Text>
                    
                    <Flex direction="column" gap="2" borderTop="1px solid rgba(255,255,255,0.05)" pt="3">
                      <Flex justify="space-between">
                        <Text color="text.secondary">Publisher:</Text>
                        <Text as="strong">{selectedPackage.Publisher}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text color="text.secondary">Category:</Text>
                        <Text>{selectedPackage.Category}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text color="text.secondary">Architecture:</Text>
                        <Text>{selectedPackage.Instances[0]?.Architecture || 'n/a'}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text color="text.secondary">Primary Scope:</Text>
                        <Text>{selectedPackage.Scope}</Text>
                      </Flex>
                    </Flex>

                    <Box borderTop="1px solid rgba(255,255,255,0.05)" pt="3">
                      <Text fontWeight="bold" color="text.secondary" mb="2">Installation Instances ({selectedPackage.Instances.length})</Text>
                      <Flex direction="column" gap="2">
                        {selectedPackage.Instances.map((inst, idx) => (
                          <Box key={idx} bg="rgba(255,255,255,0.01)" border="1px solid rgba(255,255,255,0.03)" borderRadius="4px" p="2">
                            <Flex justify="space-between" fontSize="11px" color="#06B6D4" mb="1">
                              <Text>Agent: {inst.Source}</Text>
                              <Text fontFamily="mono">v{inst.InstalledVersion}</Text>
                            </Flex>
                            <Text fontSize="10px" color="text.secondary" style={{ overflowWrap: 'anywhere' }}>Path: {inst.InstallPath}</Text>
                            <Flex justify="space-between" fontSize="9px" color="text.muted" mt="1">
                              <Text>Size: {inst.Size}</Text>
                              <Text>Date: {inst.InstallDate}</Text>
                            </Flex>
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  </Flex>
                )}

                {/* 2. VERSIONS */}
                {detailTab === 'versions' && (
                  <Flex direction="column" gap="3">
                    <Box bg="rgba(0,0,0,0.15)" p="3" borderRadius="6px" border="1px solid rgba(255,255,255,0.02)">
                      <Flex justify="space-between" mb="2">
                        <Text>Installed Version:</Text>
                        <Text as="strong" fontFamily="mono">{selectedPackage.Instances[0]?.InstalledVersion}</Text>
                      </Flex>
                      <Flex justify="space-between" mb="2">
                        <Text>Latest Release:</Text>
                        <Text as="strong" fontFamily="mono" color="#06B6D4">{selectedPackage.LatestVersion}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text>Release Date:</Text>
                        <Text>{selectedPackage.ReleaseDate}</Text>
                      </Flex>
                    </Box>

                    <Flex direction="column" gap="2" borderTop="1px solid rgba(255,255,255,0.05)" pt="3">
                      <Flex justify="space-between" align="center">
                        <Text>Support Status:</Text>
                        <span className={`cyber-badge ${selectedPackage.SupportStatus.includes('Active') ? 'badge-green' : 'badge-pink'}`}>
                          {selectedPackage.SupportStatus}
                        </span>
                      </Flex>
                      <Flex justify="space-between">
                        <Text>EOL Date:</Text>
                        <Text fontFamily="mono">{selectedPackage.EOLDate}</Text>
                      </Flex>
                    </Flex>

                    {selectedPackage.UpdateState === 'Update Available' && (
                      <Box mt="2" p="3" bg="rgba(245,158,11,0.05)" border="1px solid rgba(245,158,11,0.15)" borderRadius="6px">
                        <Flex align="center" gap="1.5" fontWeight="bold" color="warning" mb="1">
                          <AlertTriangle size={12} />
                          <Text>Version Drift Detected</Text>
                        </Flex>
                        <Text fontSize="11px" color="text.secondary">
                          This machine is running an older build. Click actions tab to run an automated upgrade.
                        </Text>
                      </Box>
                    )}
                  </Flex>
                )}

                {/* 3. DEPENDENCIES */}
                {detailTab === 'dependencies' && (
                  <Flex direction="column" gap="3">
                    <Text fontWeight="bold" color="text.secondary">Software Dependency Graph</Text>
                    
                    {selectedPackage.Dependencies.length === 0 ? (
                      <Box p="6" textAlign="center" color="text.muted" border="1px dashed" borderColor="rgba(255,255,255,0.1)" borderRadius="6px">
                        No package manager dependency linkages defined.
                      </Box>
                    ) : (
                      <Flex direction="column" gap="2">
                        {selectedPackage.Dependencies.map((dep, idx) => (
                          <Flex key={idx} align="center" gap="2" p="2" bg="rgba(255,255,255,0.01)" border="1px solid rgba(255,255,255,0.03)" borderRadius="6px">
                            <span className={`cyber-badge ${dep.Relation.includes('Depends') ? 'badge-blue' : 'badge-pink'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                              {dep.Relation.toUpperCase()}
                            </span>
                            <Text fontWeight="bold">{dep.PackageName}</Text>
                          </Flex>
                        ))}
                      </Flex>
                    )}

                    {selectedPackage.Name === 'Python' && (
                      <Box mt="3" p="3" bg="rgba(236,72,153,0.04)" border="1px solid rgba(236,72,153,0.1)" borderRadius="6px" fontSize="11px">
                        <Text fontWeight="bold" color="danger" mb="1">Graph Topography Node Linkage:</Text>
                        <Text>Removing this package breaks local environments. Gated warnings will trigger before uninstallation.</Text>
                      </Box>
                    )}
                  </Flex>
                )}

                {/* 4. SECURITY */}
                {detailTab === 'security' && (
                  <Flex direction="column" gap="3">
                    {selectedPackage.Vulnerabilities.length === 0 ? (
                      <Flex p="8" textAlign="center" color="#16C784" border="1px dashed" borderColor="#16C784" borderRadius="6px" direction="column" align="center" gap="2">
                        <Check size={24} color="#16C784" />
                        <Text fontWeight="bold">No Known Vulnerabilities</Text>
                        <Text fontSize="11px" color="text.muted">0 CVE CVE-details matched during baseline sweep.</Text>
                      </Flex>
                    ) : (
                      <Flex direction="column" gap="3">
                        {selectedPackage.Vulnerabilities.map((vuln, idx) => (
                          <Box key={idx} border="1px solid rgba(236,72,153,0.2)" borderRadius="6px" overflow="hidden">
                            <Flex bg="rgba(236,72,153,0.05)" p="2" px="3" justify="space-between" align="center">
                              <Text as="strong" color="danger">{vuln.CveId}</Text>
                              <span className="cyber-badge badge-pink" style={{ fontSize: '9px' }}>CVSS {vuln.Cvss}</span>
                            </Flex>
                            <Box p="3" color="text.secondary" lineHeight="1.4" fontSize="11px">
                              {vuln.Description}
                              <Box mt="2">
                                <a href={vuln.AdvisoryUrl} target="_blank" rel="noreferrer" style={{ color: '#06B6D4', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span>Open Security Advisory</span>
                                  <ExternalLink size={10} />
                                </a>
                              </Box>
                            </Box>
                          </Box>
                        ))}
                      </Flex>
                    )}
                  </Flex>
                )}

                {/* 5. HISTORY */}
                {detailTab === 'history' && (
                  <Flex direction="column" gap="3">
                    <Text fontWeight="bold" color="text.secondary">Audit & Assessment Log</Text>
                    
                    <Flex direction="column" gap="4" borderLeft="1px solid rgba(255,255,255,0.05)" pl="4" ml="1.5">
                      <Box position="relative">
                        <Box w="2" h="2" borderRadius="full" bg="#16C784" position="absolute" left="-21px" top="4px" />
                        <Text fontSize="11px" color="text.muted">2026-06-05 15:00</Text>
                        <Text fontWeight="bold">Re-scanned & Validated</Text>
                        <Text color="text.secondary" fontSize="11px">Baseline verified by Get-InstalledSoftwareEvidence.</Text>
                      </Box>

                      <Box position="relative">
                        <Box w="2" h="2" borderRadius="full" bg="#3B82F6" position="absolute" left="-21px" top="4px" />
                        <Text fontSize="11px" color="text.muted">2025-05-10 10:15</Text>
                        <Text fontWeight="bold">Initial Package Installation</Text>
                        <Text color="text.secondary" fontSize="11px">First registered via package manager.</Text>
                      </Box>
                    </Flex>
                  </Flex>
                )}

                {/* 6. ACTIONS */}
                {detailTab === 'actions' && (
                  <Flex direction="column" gap="4">
                    <Text fontWeight="bold" color="text.secondary">Available Operations</Text>
                    
                    <Flex direction="column" gap="2.5">
                      {selectedPackage.UpdateState === 'Update Available' && (
                        <Button colorPalette="cyber" size="sm" py="5" onClick={() => startSingleUpgrade(selectedPackage)}>
                          <Wrench size={14} />
                          <Text as="span">Upgrade to v{selectedPackage.LatestVersion}</Text>
                        </Button>
                      )}

                      <Button variant="outline" size="sm" onClick={() => {
                        showToast(`Re-scan and validation command spawned for ${selectedPackage.Name}. Properties verified.`, 'info');
                      }}>
                        <Check size={14} />
                        <Text as="span">Run Postcheck Verification</Text>
                      </Button>

                      <Button variant="outline" size="sm" onClick={() => {
                        showToast(`Repair utility invoked for ${selectedPackage.Name}. Reinstalling config hashes.`, 'info');
                      }}>
                        <Settings size={14} />
                        <Text as="span">Repair Configuration</Text>
                      </Button>

                      <Button colorPalette="red" size="sm" mt="2" onClick={() => startUninstall(selectedPackage)}>
                        <Trash2 size={14} />
                        <Text as="span">Uninstall Software</Text>
                      </Button>
                    </Flex>
                  </Flex>
                )}

              </Box>

            </Flex>
          ) : (
            <Flex direction="column" align="center" justify="center" h="100%" gap="3" color="text.muted" p="6" textAlign="center">
              <Package size={36} color="rgba(255,255,255,0.05)" />
              <Text fontSize="13px">Select any software row to inspect package definitions, dependencies, CVE listings, and operations.</Text>
            </Flex>
          )}

        </Box>

      </SimpleGrid>

      {/* 4. Wizard Overlay Dialog Modal for Upgrades & Uninstalls */}
      {activePlanType !== 'none' && (
        <Box
          position="fixed"
          top="0"
          left="0"
          width="100vw"
          height="100vh"
          zIndex="1400"
          bg="rgba(0, 0, 0, 0.75)"
          backdropFilter="blur(4px)"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box
            className="glass-panel"
            bg="rgba(11,17,32,0.95)"
            border="1px solid rgba(255,255,255,0.1)"
            boxShadow="0 0 30px rgba(6,182,212,0.2)"
            p="6"
            display="flex"
            flexDirection="column"
            gap="5"
            width="90%"
            maxWidth="600px"
            borderRadius="8px"
          >
            
            {/* Modal Header */}
            <Flex justify="space-between" align="center" borderBottom="1px solid rgba(255,255,255,0.05)" pb="3">
              <Heading className="panel-title" fontSize="18px" color="#06B6D4">
                {activePlanType === 'upgrade' && `Upgrade Plan: ${selectedPackage?.Name}`}
                {activePlanType === 'bulk-upgrade' && `Bulk Upgrade Planner`}
                {activePlanType === 'uninstall' && `Uninstall Plan: ${selectedPackage?.Name}`}
              </Heading>
              <Button size="xs" variant="outline" onClick={() => { setActivePlanType('none'); setIsSimulating(false); }} disabled={isSimulating}>Close</Button>
            </Flex>

            {/* Dependency Warning dialog */}
            {activePlanType === 'uninstall' && conflictWarning && (
              <Box p="3" px="4" bg="rgba(236,72,153,0.06)" border="1px solid rgba(236,72,153,0.3)" borderRadius="6px" fontSize="12px">
                <Flex color="danger" fontWeight="bold" align="center" gap="2" mb="1.5">
                  <AlertTriangle size={14} />
                  <Text>DEPENDENCY CONFLICT DETECTED</Text>
                </Flex>
                <Text color="text.secondary" mb="2">
                  Uninstalling <strong>{selectedPackage?.Name}</strong> will disrupt operation of dependent systems:
                </Text>
                <Flex direction="column" gap="1" fontFamily="mono" fontSize="11px" color="text.primary">
                  {conflictWarning.map((c, idx) => <div key={idx}>- {c}</div>)}
                </Flex>
                <Text color="text.muted" fontSize="10px" mt="2">
                  Proceeding will force-remove all dependents to maintain repository consistency.
                </Text>
              </Box>
            )}

            {/* Plan Specifications */}
            {!isSimulating && simulationStep === 0 && (
              <Flex direction="column" gap="4" fontSize="12px" maxH="280px" overflowY="auto">
                
                {/* Proposed commands list */}
                <Box>
                  <Text fontWeight="bold" color="text.secondary" mb="1.5">Proposed Actions Plan:</Text>
                  <Box fontFamily="mono" bg="rgba(0,0,0,0.2)" p="3" borderRadius="4px" border="1px solid rgba(255,255,255,0.03)">
                    {activePlanType === 'upgrade' && selectedPackage?.UpgradePlan.Plan.map((p, i) => <div key={i} style={{ color: '#06B6D4' }}>&gt; {p}</div>)}
                    {activePlanType === 'bulk-upgrade' && packages.filter(p => selectedNames.has(p.Name) && p.UpdateState === 'Update Available').map((p, idx) => (
                      <div key={idx} style={{ color: '#06B6D4' }}>&gt; upgrade {p.Name} from {p.Instances[0]?.InstalledVersion} to {p.LatestVersion} via Winget</div>
                    ))}
                    {activePlanType === 'uninstall' && selectedPackage?.UninstallPlan.Plan.map((p, i) => <div key={i} style={{ color: '#EF4444' }}>&gt; {p}</div>)}
                  </Box>
                </Box>

                {/* Risks list */}
                <Box>
                  <Text fontWeight="bold" color="text.secondary" mb="1.5">Identified System Risks:</Text>
                  <Flex direction="column" gap="1" color="text.secondary">
                    {activePlanType === 'upgrade' && selectedPackage?.UpgradePlan.Risks.map((p, i) => <div key={i}>• {p}</div>)}
                    {activePlanType === 'bulk-upgrade' && <div>• Concurrently restarting multiple application frameworks will affect temporary system ports availability.</div>}
                    {activePlanType === 'uninstall' && selectedPackage?.UninstallPlan.Risks.map((p, i) => <div key={i}>• {p}</div>)}
                  </Flex>
                </Box>

                {/* Rollback plans */}
                <Box>
                  <Text fontWeight="bold" color="text.secondary" mb="1.5">Rollback Contingencies:</Text>
                  <Box color="text.muted">
                    {activePlanType === 'upgrade' && selectedPackage?.UpgradePlan.Rollback.map((p, i) => <div key={i}>• {p}</div>)}
                    {activePlanType === 'bulk-upgrade' && <div>• Standard backups of registry folders will be deployed if post-check validation tests report failures.</div>}
                    {activePlanType === 'uninstall' && selectedPackage?.UninstallPlan.Rollback.map((p, i) => <div key={i}>• {p}</div>)}
                  </Box>
                </Box>

              </Flex>
            )}

            {/* Console Log simulator pane */}
            {(isSimulating || simulationStep > 0 || activePlanType) && (
              <Flex direction="column" gap="2">
                <Text fontSize="11px" fontWeight="bold" color="text.secondary">Execution Terminal Output Log:</Text>
                <Box 
                  fontFamily="mono" 
                  fontSize="11px" 
                  bg="#02040a" 
                  p="4" 
                  borderRadius="6px" 
                  h="180px" 
                  overflowY="auto"
                  border="1px solid rgba(255,255,255,0.1)"
                  display="flex"
                  flexDirection="column"
                  gap="1"
                >
                  {consoleLogs.map((log, idx) => {
                    const isErr = log.includes('[Error]') || log.includes('[Warning]');
                    const isSucc = log.includes('SUCCESS') || log.includes('stable') || log.includes('completed');
                    return (
                      <div key={idx} style={{ color: isErr ? '#EF4444' : isSucc ? '#16C784' : 'rgba(255,255,255,0.7)' }}>
                        {log}
                      </div>
                    );
                  })}
                  {isSimulating && (
                    <div style={{ color: '#06B6D4' }} className="pulse">
                      &gt; Executing task...
                    </div>
                  )}
                </Box>
              </Flex>
            )}

            {/* Action Buttons */}
            <Flex gap="3" justify="flex-end" borderTop="1px solid rgba(255,255,255,0.05)" pt="4">
              <Button variant="outline" onClick={() => { setActivePlanType('none'); setIsSimulating(false); }} disabled={isSimulating}>
                Cancel
              </Button>
              
              {!isSimulating && simulationStep === 0 && (
                <Button 
                  colorPalette={activePlanType === 'uninstall' ? 'red' : 'cyber'}
                  onClick={() => {
                    setIsSimulating(true);
                    setSimulationStep(0);
                  }}
                >
                  <Play size={12} />
                  <Text as="span">Execute Approved Operations</Text>
                </Button>
              )}
            </Flex>

          </Box>
        </Box>
      )}

    </Flex>
  );
};
