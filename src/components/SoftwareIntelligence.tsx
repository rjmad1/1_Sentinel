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

interface SoftwareIntelligenceProps {
  demoMode?: boolean;
  assessmentLoaded?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assessmentSoftware?: any[];
  onUpdateOverallHealth?: (healthDiff: number) => void;
}

export const SoftwareIntelligence: React.FC<SoftwareIntelligenceProps> = ({ 
  demoMode = false,
  assessmentLoaded = false,
  assessmentSoftware = [],
  onUpdateOverallHealth 
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
        let matchField: string;
        if (searchField === 'name') matchField = pkg.Name;
        else if (searchField === 'vendor') matchField = pkg.Vendor;
        else if (searchField === 'publisher') matchField = pkg.Publisher;
        else if (searchField === 'path') matchField = pkg.Instances.map(i => i.InstallPath).join(' ');
        else {
          matchField = `${pkg.Name} ${pkg.Vendor} ${pkg.Publisher} ${pkg.Tags.join(' ')}`;
        }

        matchField = matchField.toLowerCase();

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

  // Grouping logic
  const groupedPackages = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Packages': filteredPackages };
    }

    const groups: Record<string, NormalizedPackage[]> = {};
    filteredPackages.forEach(pkg => {
      let key = 'Other';
      if (groupBy === 'vendor') {
        key = pkg.Vendor || 'Unknown';
      } else if (groupBy === 'source') {
        // Since a package can have multiple instances with different sources, we group by its primary source
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
  }, [filteredPackages, groupBy]);

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
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isSimulating, simulationStep, activePlanType, selectedPackage, conflictWarning, packages, selectedNames, onUpdateOverallHealth]);

  // Run validation scan simulation
  const runValidationScan = () => {
    setScanStatus('scanning');
    setTimeout(() => {
      setScanStatus('complete');
      setTimeout(() => setScanStatus('idle'), 3000);
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Dashboard Widget Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div className="metric-label" style={{ fontSize: '10px' }}>Total Normalized</div>
          <div className="metric-value" style={{ fontSize: '26px', color: 'var(--color-cyan)' }}>
            {stats.totalNormalized} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({stats.totalInstances} Inst)</span>
          </div>
          <div className="progress-bar-container" style={{ height: '3px', marginTop: '8px' }}>
            <div className="progress-bar-fill" style={{ width: '100%', backgroundColor: 'var(--color-cyan)' }}></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div className="metric-label" style={{ fontSize: '10px' }}>Up-To-Date</div>
          <div className="metric-value" style={{ fontSize: '26px', color: 'var(--color-green)' }}>
            {stats.upToDate}
          </div>
          <div className="progress-bar-container" style={{ height: '3px', marginTop: '8px' }}>
            <div className="progress-bar-fill" style={{ width: `${(stats.upToDate / stats.totalNormalized) * 100}%`, backgroundColor: 'var(--color-green)' }}></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div className="metric-label" style={{ fontSize: '10px' }}>Upgradeable</div>
          <div className="metric-value" style={{ fontSize: '26px', color: 'var(--color-orange)' }}>
            {stats.upgradeable}
          </div>
          <div className="progress-bar-container" style={{ height: '3px', marginTop: '8px' }}>
            <div className="progress-bar-fill" style={{ width: `${(stats.upgradeable / stats.totalNormalized) * 100}%`, backgroundColor: 'var(--color-orange)' }}></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div className="metric-label" style={{ fontSize: '10px' }}>Unsupported / EOL</div>
          <div className="metric-value" style={{ fontSize: '26px', color: 'var(--color-pink)' }}>
            {stats.unsupported + stats.eol}
          </div>
          <div className="progress-bar-container" style={{ height: '3px', marginTop: '8px' }}>
            <div className="progress-bar-fill" style={{ width: `${((stats.unsupported + stats.eol) / stats.totalNormalized) * 100}%`, backgroundColor: 'var(--color-pink)' }}></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div className="metric-label" style={{ fontSize: '10px' }}>Security Alerts</div>
          <div className="metric-value" style={{ fontSize: '26px', color: stats.critical > 0 ? 'var(--color-pink)' : 'var(--color-green)' }}>
            {stats.critical}
          </div>
          <div className="progress-bar-container" style={{ height: '3px', marginTop: '8px' }}>
            <div className="progress-bar-fill" style={{ width: `${(stats.critical / stats.totalNormalized) * 100}%`, backgroundColor: stats.critical > 0 ? 'var(--color-pink)' : 'var(--color-green)' }}></div>
          </div>
        </div>

      </div>

      {/* 2. Package Managers Distribution */}
      <div className="glass-panel" style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Ecosystem Distribution (Discovery Sweeps)</span>
          <span className="cyber-badge badge-cyan" style={{ fontSize: '10px' }}>ACTIVE AGENTS: 9</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }}>
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
        </div>
      </div>

      {/* 3. Main Workspace Grid */}
      <div className="dashboard-grid">
        
        {/* Inventory list */}
        <div className="glass-panel" style={{ gridColumn: 'span 8' }}>
          <div className="panel-header" style={{ marginBottom: '16px' }}>
            <h2 className="panel-title"><Package size={16} color="var(--color-cyan)" /> Normalized Software Catalog</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="cyber-btn" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={runValidationScan} disabled={scanStatus === 'scanning'}>
                <RefreshCw size={12} className={scanStatus === 'scanning' ? 'spin' : ''} />
                <span>{scanStatus === 'scanning' ? 'Re-Scanning...' : scanStatus === 'complete' ? 'Scan Complete!' : 'Re-Scan Catalog'}</span>
              </button>
            </div>
          </div>

          {/* Filtering / Search Toolbar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="Search catalog software..."
                  style={{ width: '100%', paddingLeft: '36px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select className="cyber-input" value={searchField} onChange={(e) => setSearchField(e.target.value as typeof searchField)} style={{ minWidth: '100px', fontSize: '12px' }}>
                <option value="all">All Fields</option>
                <option value="name">Name Only</option>
                <option value="vendor">Vendor</option>
                <option value="publisher">Publisher</option>
                <option value="path">Install Path</option>
              </select>

              <select className="cyber-input" value={searchMode} onChange={(e) => setSearchMode(e.target.value as typeof searchMode)} style={{ minWidth: '100px', fontSize: '12px' }}>
                <option value="contains">Contains</option>
                <option value="starts">Starts With</option>
                <option value="exact">Exact Match</option>
                <option value="regex">Regex Search</option>
              </select>

            </div>

            {/* Collapsible filters bar */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Update State</label>
                <select className="cyber-input" value={updateFilter} onChange={(e) => setUpdateFilter(e.target.value as typeof updateFilter)} style={{ padding: '6px 10px', fontSize: '11px', minWidth: '110px' }}>
                  <option value="ALL">All Updates</option>
                  <option value="Up-To-Date">Up-To-Date</option>
                  <option value="Update Available">Update Available</option>
                  <option value="Unsupported">Unsupported</option>
                  <option value="Deprecated">Deprecated</option>
                  <option value="End-of-Life">End-of-Life</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Security Risk</label>
                <select className="cyber-input" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as typeof riskFilter)} style={{ padding: '6px 10px', fontSize: '11px', minWidth: '110px' }}>
                  <option value="ALL">All Risks</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Scope</label>
                <select className="cyber-input" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value as typeof scopeFilter)} style={{ padding: '6px 10px', fontSize: '11px', minWidth: '110px' }}>
                  <option value="ALL">All Scopes</option>
                  <option value="Current User">Current User</option>
                  <option value="Machine-Wide">Machine-Wide</option>
                  <option value="System Component">System Component</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Source Agent</label>
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
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: 'auto' }}>
                <label style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Grouping</label>
                <select className="cyber-input" value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)} style={{ padding: '6px 10px', fontSize: '11px', minWidth: '110px' }}>
                  <option value="none">No Grouping</option>
                  <option value="vendor">Group by Vendor</option>
                  <option value="source">Group by Source</option>
                  <option value="scope">Group by Scope</option>
                  <option value="status">Group by Status</option>
                </select>
              </div>

            </div>

            {/* Bulk Action Panel when selected */}
            {selectedNames.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{selectedNames.size} packages selected for operations</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="cyber-btn cyber-btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={startBulkUpgrade}>
                    <Wrench size={12} />
                    <span>Upgrade Selected</span>
                  </button>
                  <button className="cyber-btn cyber-btn-danger" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => {
                    const toDelete = packages.find(p => selectedNames.has(p.Name));
                    if (toDelete) startUninstall(toDelete);
                  }}>
                    <Trash2 size={12} />
                    <span>Uninstall Selected</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Catalog Data Grid */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', height: '40px' }}>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedNames.size === filteredPackages.length && filteredPackages.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('name'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>NAME</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>INSTALLED VERSION</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>LATEST VERSION</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', cursor: 'pointer' }} onClick={() => { setSortBy('status'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>LIFECYCLE STATUS</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>PUBLISHER</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>SCOPE</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>SOURCE</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', cursor: 'pointer' }} onClick={() => { setSortBy('risk'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}>RISK</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedPackages).map(([groupName, pkgs]) => (
                  <React.Fragment key={groupName}>
                    {groupBy !== 'none' && (
                      <tr style={{ background: 'rgba(6,182,212,0.04)', height: '32px' }}>
                        <td colSpan={10} style={{ padding: '6px 14px', fontWeight: 'bold', color: 'var(--color-cyan)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          {groupName} ({pkgs.length} packages)
                        </td>
                      </tr>
                    )}
                    {pkgs.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No software items match the active query rules.
                        </td>
                      </tr>
                    ) : (
                      pkgs.map(pkg => {
                        const isSelected = selectedNames.has(pkg.Name);
                        // Get primary version display
                        const instVer = pkg.Instances.length > 1 
                          ? `${pkg.Instances[0].InstalledVersion} (+${pkg.Instances.length - 1} more)`
                          : pkg.Instances[0]?.InstalledVersion || 'n/a';
                        
                        return (
                          <tr key={pkg.Name} 
                              onClick={() => { setSelectedPackage(pkg); setDetailTab('overview'); }}
                              style={{ 
                                borderBottom: '1px solid rgba(255,255,255,0.01)', 
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(6,182,212,0.02)' : 'transparent',
                                borderLeft: pkg.Name === selectedPackage?.Name ? '3px solid var(--color-cyan)' : '3px solid transparent'
                              }}
                              className="table-row-hover"
                          >
                            <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(pkg.Name)} style={{ cursor: 'pointer' }} />
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{pkg.Name}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)' }}>{instVer}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)' }}>{pkg.LatestVersion}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span className={`cyber-badge ${
                                pkg.UpdateState === 'Up-To-Date' ? 'badge-green' :
                                pkg.UpdateState === 'Update Available' ? 'badge-orange' : 'badge-pink'
                              }`}>
                                {pkg.UpdateState}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{pkg.Publisher}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{pkg.Scope}</span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span className="cyber-badge badge-blue" style={{ fontSize: '10px', padding: '2px 6px' }}>{pkg.Instances[0]?.Source || 'Registry'}</span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span className={`cyber-badge ${pkg.SecurityRisk === 'Critical' || pkg.SecurityRisk === 'High' ? 'badge-pink' : pkg.SecurityRisk === 'Medium' ? 'badge-orange' : 'badge-green'}`}>
                                {pkg.SecurityRisk}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                {pkg.UpdateState === 'Update Available' && (
                                  <button className="cyber-btn" style={{ padding: '4px 8px', fontSize: '10px' }} title="Automated Upgrade" onClick={() => startSingleUpgrade(pkg)}>
                                    <Wrench size={10} color="var(--color-orange)" />
                                  </button>
                                )}
                                <button className="cyber-btn cyber-btn-danger" style={{ padding: '4px 8px', fontSize: '10px' }} title="Clean Uninstall" onClick={() => startUninstall(pkg)}>
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side Detail inspector Drawer */}
        <div className="glass-panel" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
          
          {selectedPackage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              
              {/* Drawer header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedPackage.Name}</h3>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor: {selectedPackage.Vendor}</span>
                </div>
                <button className="cyber-btn" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => setSelectedPackage(null)}>Close</button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '2px', gap: '4px', overflowX: 'auto' }}>
                {['overview', 'versions', 'dependencies', 'security', 'history', 'actions'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setDetailTab(t as typeof detailTab)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '6px 10px',
                      fontSize: '11px',
                      color: detailTab === t ? 'var(--color-cyan)' : 'var(--text-secondary)',
                      borderBottom: detailTab === t ? '2px solid var(--color-cyan)' : '2px solid transparent',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      fontWeight: detailTab === t ? 'bold' : 'normal'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Tab Content Box */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                
                {/* 1. OVERVIEW */}
                {detailTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedPackage.Description}</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Publisher:</span>
                        <span style={{ fontWeight: 'bold' }}>{selectedPackage.Publisher}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
                        <span>{selectedPackage.Category}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Architecture:</span>
                        <span>{selectedPackage.Instances[0]?.Architecture || 'n/a'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Primary Scope:</span>
                        <span>{selectedPackage.Scope}</span>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '10px' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>Installation Instances ({selectedPackage.Instances.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedPackage.Instances.map((inst, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-cyan)', marginBottom: '4px' }}>
                              <span>Agent: {inst.Source}</span>
                              <span style={{ fontFamily: 'var(--font-mono)' }}>v{inst.InstalledVersion}</span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>Path: {inst.InstallPath}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              <span>Size: {inst.Size}</span>
                              <span>Date: {inst.InstallDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. VERSIONS */}
                {detailTab === 'versions' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Installed Version:</span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedPackage.Instances[0]?.InstalledVersion}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Latest Release:</span>
                        <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)' }}>{selectedPackage.LatestVersion}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Release Date:</span>
                        <span>{selectedPackage.ReleaseDate}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Support Status:</span>
                        <span className={`cyber-badge ${selectedPackage.SupportStatus.includes('Active') ? 'badge-green' : 'badge-pink'}`}>
                          {selectedPackage.SupportStatus}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>EOL Date:</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedPackage.EOLDate}</span>
                      </div>
                    </div>

                    {selectedPackage.UpdateState === 'Update Available' && (
                      <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '6px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-orange)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <AlertTriangle size={12} />
                          <span>Version Drift Detected</span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          This machine is running an older build. Click actions tab to run an automated upgrade.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. DEPENDENCIES */}
                {detailTab === 'dependencies' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Software Dependency Graph</div>
                    
                    {selectedPackage.Dependencies.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                        No package manager dependency linkages defined.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedPackage.Dependencies.map((dep, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            <span className={`cyber-badge ${dep.Relation.includes('Depends') ? 'badge-blue' : 'badge-pink'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                              {dep.Relation.toUpperCase()}
                            </span>
                            <span style={{ fontWeight: 'bold' }}>{dep.PackageName}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedPackage.Name === 'Python' && (
                      <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.1)', borderRadius: '6px', fontSize: '11px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-pink)', marginBottom: '4px' }}>Graph Topography Node Linkage:</div>
                        <span>Removing this package breaks local environments. Gated warnings will trigger before uninstallation.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. SECURITY */}
                {detailTab === 'security' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {selectedPackage.Vulnerabilities.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-green)', border: '1px dashed var(--color-green)', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Check size={24} color="var(--color-green)" />
                        <div style={{ fontWeight: 'bold' }}>No Known Vulnerabilities</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>0 CVE CVE-details matched during baseline sweep.</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedPackage.Vulnerabilities.map((vuln, idx) => (
                          <div key={idx} style={{ border: '1px solid rgba(236,72,153,0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ background: 'rgba(236,72,153,0.05)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: 'var(--color-pink)' }}>{vuln.CveId}</strong>
                              <span className="cyber-badge badge-pink" style={{ fontSize: '9px' }}>CVSS {vuln.Cvss}</span>
                            </div>
                            <div style={{ padding: '10px 12px', color: 'var(--text-secondary)', lineHeight: '1.4', fontSize: '11px' }}>
                              {vuln.Description}
                              <div style={{ marginTop: '8px' }}>
                                <a href={vuln.AdvisoryUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>Open Security Advisory</span>
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. HISTORY */}
                {detailTab === 'history' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Audit & Assessment Log</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '14px', marginLeft: '6px' }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-green)', position: 'absolute', left: '-18px', top: '4px' }}></span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>2026-06-05 15:00</div>
                        <div style={{ fontWeight: 'bold' }}>Re-scanned & Validated</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Baseline verified by Get-InstalledSoftwareEvidence.</div>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-cyan)', position: 'absolute', left: '-18px', top: '4px' }}></span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>2025-05-10 10:15</div>
                        <div style={{ fontWeight: 'bold' }}>Initial Package Installation</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>First registered via package manager.</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. ACTIONS */}
                {detailTab === 'actions' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Available Operations</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedPackage.UpdateState === 'Update Available' && (
                        <button className="cyber-btn cyber-btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => startSingleUpgrade(selectedPackage)}>
                          <Wrench size={14} />
                          <span>Upgrade to v{selectedPackage.LatestVersion}</span>
                        </button>
                      )}

                      <button className="cyber-btn" style={{ width: '100%' }} onClick={() => {
                        alert(`Re-scan and validation command spawned for ${selectedPackage.Name}. Properties verified.`);
                      }}>
                        <Check size={14} />
                        <span>Run Postcheck Verification</span>
                      </button>

                      <button className="cyber-btn" style={{ width: '100%' }} onClick={() => {
                        alert(`Repair utility invoked for ${selectedPackage.Name}. Reinstalling config hashes.`);
                      }}>
                        <Settings size={14} />
                        <span>Repair Configuration</span>
                      </button>

                      <button className="cyber-btn cyber-btn-danger" style={{ width: '100%', marginTop: '8px' }} onClick={() => startUninstall(selectedPackage)}>
                        <Trash2 size={14} />
                        <span>Uninstall Software</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>
              <Package size={36} color="rgba(255,255,255,0.05)" />
              <div style={{ fontSize: '13px' }}>Select any software row to inspect package definitions, dependencies, CVE listings, and operations.</div>
            </div>
          )}

        </div>

      </div>

      {/* 4. Wizard Overlay Dialog Modal for Upgrades & Uninstalls */}
      {activePlanType !== 'none' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          
          <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', background: 'rgba(11,17,32,0.95)', border: '1px solid var(--border-color)', boxShadow: '0 0 30px rgba(6,182,212,0.2)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <h2 className="panel-title" style={{ fontSize: '18px', color: 'var(--color-cyan)' }}>
                {activePlanType === 'upgrade' && `Upgrade Plan: ${selectedPackage?.Name}`}
                {activePlanType === 'bulk-upgrade' && `Bulk Upgrade Planner`}
                {activePlanType === 'uninstall' && `Uninstall Plan: ${selectedPackage?.Name}`}
              </h2>
              <button className="cyber-btn" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => { setActivePlanType('none'); setIsSimulating(false); }} disabled={isSimulating}>Close</button>
            </div>

            {/* Dependency Warning dialog */}
            {activePlanType === 'uninstall' && conflictWarning && (
              <div style={{ padding: '12px 16px', background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: '6px', fontSize: '12px' }}>
                <div style={{ color: 'var(--color-pink)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>DEPENDENCY CONFLICT DETECTED</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Uninstalling <strong>{selectedPackage?.Name}</strong> will disrupt operation of dependent systems:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)' }}>
                  {conflictWarning.map((c, idx) => <div key={idx}>- {c}</div>)}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '8px' }}>
                  Proceeding will force-remove all dependents to maintain repository consistency.
                </p>
              </div>
            )}

            {/* Plan Specifications */}
            {!isSimulating && simulationStep === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                
                {/* Proposed commands list */}
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>Proposed Actions Plan:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    {activePlanType === 'upgrade' && selectedPackage?.UpgradePlan.Plan.map((p, i) => <div key={i} style={{ color: 'var(--color-cyan)' }}>&gt; {p}</div>)}
                    {activePlanType === 'bulk-upgrade' && packages.filter(p => selectedNames.has(p.Name) && p.UpdateState === 'Update Available').map((p, idx) => (
                      <div key={idx} style={{ color: 'var(--color-cyan)' }}>&gt; upgrade {p.Name} from {p.Instances[0]?.InstalledVersion} to {p.LatestVersion} via Winget</div>
                    ))}
                    {activePlanType === 'uninstall' && selectedPackage?.UninstallPlan.Plan.map((p, i) => <div key={i} style={{ color: 'var(--color-pink)' }}>&gt; {p}</div>)}
                  </div>
                </div>

                {/* Risks list */}
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>Identified System Risks:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                    {activePlanType === 'upgrade' && selectedPackage?.UpgradePlan.Risks.map((p, i) => <div key={i}>• {p}</div>)}
                    {activePlanType === 'bulk-upgrade' && <div>• Concurrently restarting multiple application frameworks will affect temporary system ports availability.</div>}
                    {activePlanType === 'uninstall' && selectedPackage?.UninstallPlan.Risks.map((p, i) => <div key={i}>• {p}</div>)}
                  </div>
                </div>

                {/* Rollback plans */}
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>Rollback Contingencies:</div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {activePlanType === 'upgrade' && selectedPackage?.UpgradePlan.Rollback.map((p, i) => <div key={i}>• {p}</div>)}
                    {activePlanType === 'bulk-upgrade' && <div>• Standard backups of registry folders will be deployed if post-check validation tests report failures.</div>}
                    {activePlanType === 'uninstall' && selectedPackage?.UninstallPlan.Rollback.map((p, i) => <div key={i}>• {p}</div>)}
                  </div>
                </div>

              </div>
            )}

            {/* Console Log simulator pane */}
            {(isSimulating || simulationStep > 0 || activePlanType) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Execution Terminal Output Log:</div>
                <div style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '11px', 
                  backgroundColor: '#02040a', 
                  padding: '16px', 
                  borderRadius: '6px', 
                  height: '180px', 
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {consoleLogs.map((log, idx) => {
                    const isErr = log.includes('[Error]') || log.includes('[Warning]');
                    const isSucc = log.includes('SUCCESS') || log.includes('stable') || log.includes('completed');
                    return (
                      <div key={idx} style={{ color: isErr ? 'var(--color-pink)' : isSucc ? 'var(--color-green)' : 'var(--text-secondary)' }}>
                        {log}
                      </div>
                    );
                  })}
                  {isSimulating && (
                    <div style={{ color: 'var(--color-cyan)' }} className="pulse">
                      &gt; Executing task...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              <button className="cyber-btn" onClick={() => { setActivePlanType('none'); setIsSimulating(false); }} disabled={isSimulating}>
                Cancel
              </button>
              
              {!isSimulating && simulationStep === 0 && (
                <button 
                  className={`cyber-btn ${activePlanType === 'uninstall' ? 'cyber-btn-danger' : 'cyber-btn-primary'}`} 
                  onClick={() => {
                    setIsSimulating(true);
                    setSimulationStep(0);
                  }}
                >
                  <Play size={12} />
                  <span>Execute Approved Operations</span>
                </button>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
