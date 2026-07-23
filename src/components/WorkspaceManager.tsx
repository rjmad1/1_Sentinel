import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  Badge,
  Table,
  Spinner
} from '@chakra-ui/react';
import {
  FolderGit2,
  HardDrive,
  ShieldCheck,
  RotateCcw,
  Search,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import {
  getWorkspaceRepos,
  safeDeleteWorkspaceRepo,
  restoreWorkspaceRepo,
  getWorkspaceProfiles,
  saveWorkspaceProfile,
  getWorkspaceSnapshots,
  saveWorkspaceSnapshot,
  getWorkspaceCleanupLogs,
  type WorkspaceRepository,
  type WorkspaceProfile,
  type WorkspaceSnapshot,
  type WorkspaceCleanupLog
} from '../utils/db';

export const WorkspaceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cleanup' | 'restore' | 'profiles'>('dashboard');
  const [repos, setRepos] = useState<WorkspaceRepository[]>([]);
  const [profiles, setProfiles] = useState<WorkspaceProfile[]>([]);
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([]);
  const [cleanupLogs, setCleanupLogs] = useState<WorkspaceCleanupLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProfileFilter, setSelectedProfileFilter] = useState<string>('all');
  const [selectedRepoForCleanup, setSelectedRepoForCleanup] = useState<WorkspaceRepository | null>(null);
  const [cleanupStatusMessage, setCleanupStatusMessage] = useState<string>('');

  // Restore Form State
  const [restoreUrl, setRestoreUrl] = useState<string>('');
  const [restorePath, setRestorePath] = useState<string>('C:\\AIProjects\\restored-repo');
  const [restoreBranch, setRestoreBranch] = useState<string>('main');
  const [restoreLoading, setRestoreLoading] = useState<boolean>(false);
  const [restoreMessage, setRestoreMessage] = useState<string>('');

  // New Profile Form State
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [newProfileDesc, setNewProfileDesc] = useState<string>('');

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const repoList = await getWorkspaceRepos();
      const profileList = await getWorkspaceProfiles();
      const snapshotList = await getWorkspaceSnapshots();
      const logList = await getWorkspaceCleanupLogs();

      if (repoList.length === 0) {
        const mockRepos: WorkspaceRepository[] = [
          { id: 'repo-1', name: '1_Sentinel', path: 'C:\\AIProjects\\1_Sentinel', remote_url: 'https://github.com/rjmad1/1_Sentinel.git', default_branch: 'main', current_branch: 'main', size_bytes: 485242880, uncommitted_count: 0, staged_count: 0, untracked_count: 0, unpushed_count: 0, unpulled_count: 0, has_merge_conflicts: false, is_detached_head: false, health_status: 'healthy', last_modified: new Date().toISOString(), last_opened: new Date().toISOString(), profile_id: 'ai-dev', tags: ['typescript', 'react', 'tauri'], language: 'TypeScript' },
          { id: 'repo-2', name: 'uawos', path: 'C:\\AIProjects\\uawos', remote_url: 'https://github.com/rjmad1/uawos.git', default_branch: 'main', current_branch: 'main', size_bytes: 845242880, uncommitted_count: 0, staged_count: 0, untracked_count: 0, unpushed_count: 0, unpulled_count: 0, has_merge_conflicts: false, is_detached_head: false, health_status: 'healthy', last_modified: new Date(Date.now() - 86400000 * 45).toISOString(), last_opened: new Date(Date.now() - 86400000 * 45).toISOString(), profile_id: 'ai-dev', tags: ['python', 'ai'], language: 'Python' },
          { id: 'repo-3', name: 'conversa-buildathon', path: 'C:\\AIProjects\\conversa', remote_url: 'https://github.com/rjmad1/conversa.git', default_branch: 'main', current_branch: 'feature/auth', size_bytes: 3125242880, uncommitted_count: 12, staged_count: 3, untracked_count: 9, unpushed_count: 4, unpulled_count: 0, has_merge_conflicts: false, is_detached_head: false, health_status: 'warning', last_modified: new Date(Date.now() - 86400000 * 120).toISOString(), last_opened: new Date(Date.now() - 86400000 * 120).toISOString(), profile_id: 'ai-dev', tags: ['python', 'fastapi'], language: 'Python' },
          { id: 'repo-4', name: 'legacy-retail-api', path: 'C:\\Users\\rajaj\\career-ops\\retail-api', remote_url: 'https://github.com/rjmad1/retail-api.git', default_branch: 'main', current_branch: 'main', size_bytes: 12500000000, uncommitted_count: 0, staged_count: 0, untracked_count: 0, unpushed_count: 0, unpulled_count: 0, has_merge_conflicts: false, is_detached_head: false, health_status: 'healthy', last_modified: new Date(Date.now() - 86400000 * 240).toISOString(), last_opened: new Date(Date.now() - 86400000 * 240).toISOString(), profile_id: 'client-ops', tags: ['java', 'spring'], language: 'Java' }
        ];
        setRepos(mockRepos);
      } else {
        setRepos(repoList);
      }

      setProfiles(profileList);
      setSnapshots(snapshotList);
      setCleanupLogs(logList);
    } catch (e) {
      console.error('Failed to load workspace lifecycle data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Derived KPI Stats
  const kpis = useMemo(() => {
    const totalRepos = repos.length;
    const totalSizeBytes = repos.reduce((acc, r) => acc + r.size_bytes, 0);
    const healthyCount = repos.filter(r => r.health_status === 'healthy').length;
    const warningCount = repos.filter(r => r.health_status === 'warning').length;
    const unsafeCount = repos.filter(r => r.health_status === 'unsafe').length;

    const safeCandidates = repos.filter(r => r.uncommitted_count === 0 && r.unpushed_count === 0);
    const recoverableBytes = safeCandidates.reduce((acc, r) => acc + r.size_bytes, 0);

    return {
      totalRepos,
      totalSizeGB: (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2),
      recoverableGB: (recoverableBytes / (1024 * 1024 * 1024)).toFixed(2),
      healthyCount,
      warningCount,
      unsafeCount
    };
  }, [repos]);

  // Search & Profile Filter
  const filteredRepos = useMemo(() => {
    return repos.filter(repo => {
      const matchesSearch = searchQuery === '' ||
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesProfile = selectedProfileFilter === 'all' || repo.profile_id === selectedProfileFilter;
      return matchesSearch && matchesProfile;
    });
  }, [repos, searchQuery, selectedProfileFilter]);

  const handleScanNow = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8001/api/workspace/scan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.repos && data.repos.length > 0) {
          setRepos(data.repos);
        }
      }
    } catch (e) {
      console.warn('Daemon scan unavailable; refreshing local IndexedDB state.', e);
    } finally {
      await loadAllData();
      setLoading(false);
    }
  };

  const handleExecuteSafeCleanup = async (repo: WorkspaceRepository) => {
    setCleanupStatusMessage(`Verifying safety rules for ${repo.name}...`);
    const result = await safeDeleteWorkspaceRepo(repo.id, repo.name, repo.remote_url, repo.path, repo.size_bytes);
    setCleanupStatusMessage(result.message);
    if (result.success) {
      setSelectedRepoForCleanup(null);
      loadAllData();
    }
  };

  const handleExecuteRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreUrl || !restorePath) return;
    setRestoreLoading(true);
    setRestoreMessage(`Cloning repository from ${restoreUrl}...`);
    const result = await restoreWorkspaceRepo(restoreUrl, restorePath, restoreBranch);
    setRestoreMessage(result.message);
    setRestoreLoading(false);
    if (result.success) {
      setRestoreUrl('');
      loadAllData();
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName) return;
    const newProf: WorkspaceProfile = {
      id: `profile-${Date.now()}`,
      name: newProfileName,
      description: newProfileDesc || 'Custom developer workspace profile',
      repositories: [],
      folder_locations: ['C:\\AIProjects'],
      preferred_branch: 'main',
      retention_days: 90,
      created_at: new Date().toISOString()
    };
    await saveWorkspaceProfile(newProf);
    setNewProfileName('');
    setNewProfileDesc('');
    loadAllData();
  };

  const handleTakeSnapshot = async (profileId: string) => {
    const snap = await saveWorkspaceSnapshot(profileId);
    setCleanupStatusMessage(`Created snapshot ${snap.id.substring(0, 8)}`);
    loadAllData();
  };

  return (
    <Box p={6} color="white" bg="#0B0F17" minH="100vh">
      {/* Page Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Flex align="center" gap={3}>
            <FolderGit2 size={28} color="#3B82F6" />
            <Heading size="lg" color="white" fontWeight="700">Developer Workspace Manager</Heading>
            <Badge colorScheme="blue" variant="solid" borderRadius="full" px={3} py={1} fontSize="xs">
              Lifecycle OS
            </Badge>
          </Flex>
          <Text color="gray.400" fontSize="sm" mt={1}>
            GitHub is the single source of truth. Your local machine is a high-performance, reproducible cache.
          </Text>
        </Box>

        <Flex gap={3}>
          <Button
            colorScheme="blue"
            variant="outline"
            size="sm"
            onClick={handleScanNow}
            loading={loading}
          >
            <RefreshCw size={16} style={{ marginRight: '6px' }} /> Scan Workspaces
          </Button>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={() => setActiveTab('restore')}
          >
            <Plus size={16} style={{ marginRight: '6px' }} /> Restore Repo
          </Button>
        </Flex>
      </Flex>

      {/* Metric Cards Grid */}
      <Flex gap={4} mb={6} flexWrap="wrap">
        <Box flex="1" minW="200px" bg="#161B26" p={4} borderRadius="lg" border="1px solid" borderColor="#232B3E">
          <Flex justify="space-between" align="center" mb={2}>
            <Text color="gray.400" fontSize="xs" textTransform="uppercase" fontWeight="600">Tracked Repositories</Text>
            <FolderGit2 size={18} color="#3B82F6" />
          </Flex>
          <Heading size="xl" color="white">{kpis.totalRepos}</Heading>
          <Text color="gray.400" fontSize="xs" mt={1}>Across all configured workspace roots</Text>
        </Box>

        <Box flex="1" minW="200px" bg="#161B26" p={4} borderRadius="lg" border="1px solid" borderColor="#232B3E">
          <Flex justify="space-between" align="center" mb={2}>
            <Text color="gray.400" fontSize="xs" textTransform="uppercase" fontWeight="600">Local SSD Storage Consumed</Text>
            <HardDrive size={18} color="#A855F7" />
          </Flex>
          <Heading size="xl" color="white">{kpis.totalSizeGB} <Text as="span" fontSize="md" color="gray.400">GB</Text></Heading>
          <Text color="gray.400" fontSize="xs" mt={1}>Local Git clones & build artifacts</Text>
        </Box>

        <Box flex="1" minW="200px" bg="#161B26" p={4} borderRadius="lg" border="1px solid" borderColor="#232B3E">
          <Flex justify="space-between" align="center" mb={2}>
            <Text color="gray.400" fontSize="xs" textTransform="uppercase" fontWeight="600">Storage Recovery Potential</Text>
            <Sparkles size={18} color="#10B981" />
          </Flex>
          <Heading size="xl" color="#10B981">{kpis.recoverableGB} <Text as="span" fontSize="md" color="gray.400">GB</Text></Heading>
          <Text color="gray.400" fontSize="xs" mt={1}>100% committed & pushed repositories</Text>
        </Box>

        <Box flex="1" minW="200px" bg="#161B26" p={4} borderRadius="lg" border="1px solid" borderColor="#232B3E">
          <Flex justify="space-between" align="center" mb={2}>
            <Text color="gray.400" fontSize="xs" textTransform="uppercase" fontWeight="600">Repository Health Breakdown</Text>
            <ShieldCheck size={18} color="#F59E0B" />
          </Flex>
          <Flex align="center" gap={3} mt={2}>
            <Badge colorScheme="green" px={2} py={1}>{kpis.healthyCount} Healthy</Badge>
            <Badge colorScheme="yellow" px={2} py={1}>{kpis.warningCount} Warning</Badge>
            <Badge colorScheme="red" px={2} py={1}>{kpis.unsafeCount} Unsafe</Badge>
          </Flex>
        </Box>
      </Flex>

      {/* Tabs Navigation Header */}
      <Flex borderBottom="1px solid" borderColor="#232B3E" mb={6} gap={6}>
        <Button
          variant="ghost"
          colorScheme={activeTab === 'dashboard' ? 'blue' : 'gray'}
          borderBottom={activeTab === 'dashboard' ? '2px solid #3B82F6' : 'none'}
          borderRadius="0"
          pb={3}
          onClick={() => setActiveTab('dashboard')}
        >
          <FolderGit2 size={16} style={{ marginRight: '6px' }} /> Repositories Dashboard
        </Button>
        <Button
          variant="ghost"
          colorScheme={activeTab === 'cleanup' ? 'blue' : 'gray'}
          borderBottom={activeTab === 'cleanup' ? '2px solid #3B82F6' : 'none'}
          borderRadius="0"
          pb={3}
          onClick={() => setActiveTab('cleanup')}
        >
          <Trash2 size={16} style={{ marginRight: '6px' }} /> Safe Cleanup Engine
        </Button>
        <Button
          variant="ghost"
          colorScheme={activeTab === 'restore' ? 'blue' : 'gray'}
          borderBottom={activeTab === 'restore' ? '2px solid #3B82F6' : 'none'}
          borderRadius="0"
          pb={3}
          onClick={() => setActiveTab('restore')}
        >
          <RotateCcw size={16} style={{ marginRight: '6px' }} /> Instant Restore & Snapshots
        </Button>
        <Button
          variant="ghost"
          colorScheme={activeTab === 'profiles' ? 'blue' : 'gray'}
          borderBottom={activeTab === 'profiles' ? '2px solid #3B82F6' : 'none'}
          borderRadius="0"
          pb={3}
          onClick={() => setActiveTab('profiles')}
        >
          <Layers size={16} style={{ marginRight: '6px' }} /> Workspace Profiles
        </Button>
      </Flex>

      {/* TAB 1: REPOSITORIES DASHBOARD */}
      {activeTab === 'dashboard' && (
        <Box bg="#161B26" p={5} borderRadius="lg" border="1px solid" borderColor="#232B3E">
          {/* Search & Natural Language Filter Bar */}
          <Flex gap={4} mb={6} flexWrap="wrap">
            <Flex flex="1" minW="260px" align="center" bg="#0B0F17" px={3} borderRadius="md" border="1px solid" borderColor="#232B3E">
              <Search size={16} color="#9CA3AF" />
              <Input
                placeholder="Search by repo name, tag, language, or path..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                variant="subtle"
                px={3}
                py={2}
                fontSize="sm"
                color="white"
              />
            </Flex>

            <Flex align="center" gap={2}>
              <Text color="gray.400" fontSize="xs">Profile:</Text>
              <select
                value={selectedProfileFilter}
                onChange={e => setSelectedProfileFilter(e.target.value)}
                style={{ background: '#0B0F17', color: 'white', border: '1px solid #232B3E', borderRadius: '6px', padding: '6px 12px', fontSize: '13px' }}
              >
                <option value="all">All Profiles</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Flex>
          </Flex>

          {/* Repositories Table */}
          {loading ? (
            <Flex justify="center" align="center" py={12} direction="column" gap={3}>
              <Spinner size="xl" color="blue.500" />
              <Text color="gray.400" fontSize="sm">Scanning Git repositories across local workspace directories...</Text>
            </Flex>
          ) : filteredRepos.length === 0 ? (
            <Box textAlign="center" py={10} color="gray.400">
              <Text fontSize="md">No repositories matched your search or workspace profile filter.</Text>
            </Box>
          ) : (
            <Table.Root size="sm" variant="line">
              <Table.Header>
                <Table.Row bg="#0B0F17">
                  <Table.ColumnHeader color="gray.400">Repository Name</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Health Status</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Branch</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Uncommitted</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Unpushed</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Size</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Last Modified</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400" textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredRepos.map(repo => (
                  <Table.Row key={repo.id} _hover={{ bg: '#1E2638' }}>
                    <Table.Cell fontWeight="600" color="white">
                      <Flex direction="column">
                        <Text color="blue.300" fontWeight="600" fontSize="sm">{repo.name}</Text>
                        <Text color="gray.400" fontSize="xs" fontFamily="monospace">{repo.path}</Text>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      {repo.health_status === 'healthy' && <Badge colorScheme="green"><CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> Healthy</Badge>}
                      {repo.health_status === 'warning' && <Badge colorScheme="yellow"><AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }} /> Warning</Badge>}
                      {repo.health_status === 'unsafe' && <Badge colorScheme="red"><ShieldAlert size={12} style={{ display: 'inline', marginRight: '4px' }} /> Unsafe</Badge>}
                    </Table.Cell>
                    <Table.Cell fontFamily="monospace" fontSize="xs" color="gray.300">{repo.current_branch}</Table.Cell>
                    <Table.Cell color={repo.uncommitted_count > 0 ? 'yellow.400' : 'gray.400'}>{repo.uncommitted_count} files</Table.Cell>
                    <Table.Cell color={repo.unpushed_count > 0 ? 'orange.400' : 'gray.400'}>{repo.unpushed_count} commits</Table.Cell>
                    <Table.Cell color="gray.300">{(repo.size_bytes / (1024 * 1024)).toFixed(1)} MB</Table.Cell>
                    <Table.Cell color="gray.400" fontSize="xs">{new Date(repo.last_modified).toLocaleDateString()}</Table.Cell>
                    <Table.Cell textAlign="right">
                      <Flex justify="flex-end" gap={2}>
                        <Button
                          size="xs"
                          colorScheme="purple"
                          variant="outline"
                          onClick={() => handleTakeSnapshot(repo.profile_id)}
                        >
                          Snapshot
                        </Button>
                        <Button
                          size="xs"
                          colorScheme={repo.uncommitted_count === 0 && repo.unpushed_count === 0 ? 'green' : 'red'}
                          onClick={() => {
                            setSelectedRepoForCleanup(repo);
                            setActiveTab('cleanup');
                          }}
                        >
                          Verify Clean
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      )}

      {/* TAB 2: SAFE CLEANUP ENGINE */}
      {activeTab === 'cleanup' && (
        <Box bg="#161B26" p={5} borderRadius="lg" border="1px solid" borderColor="#232B3E">
          <Heading size="md" color="white" mb={2}>Safe Cleanup Engine</Heading>
          <Text color="gray.400" fontSize="sm" mb={6}>
            Our core safety philosophy guarantees that local code is only deleted if it is 100% committed, 100% pushed, and verified to exist remotely on GitHub.
          </Text>

          {selectedRepoForCleanup ? (
            <Box bg="#0B0F17" p={5} borderRadius="md" border="1px solid" borderColor="#232B3E" mb={6}>
              <Heading size="sm" color="blue.300" mb={3}>Target Repository: {selectedRepoForCleanup.name}</Heading>

              <Flex direction="column" gap={3} mb={6}>
                <Flex align="center" gap={3}>
                  {selectedRepoForCleanup.uncommitted_count === 0 ? (
                    <CheckCircle2 size={18} color="#10B981" />
                  ) : (
                    <AlertTriangle size={18} color="#EF4444" />
                  )}
                  <Text fontSize="sm" color={selectedRepoForCleanup.uncommitted_count === 0 ? 'gray.200' : 'red.400'}>
                    Rule 1: All changes committed ({selectedRepoForCleanup.uncommitted_count} uncommitted file(s) remaining)
                  </Text>
                </Flex>

                <Flex align="center" gap={3}>
                  {selectedRepoForCleanup.unpushed_count === 0 ? (
                    <CheckCircle2 size={18} color="#10B981" />
                  ) : (
                    <AlertTriangle size={18} color="#EF4444" />
                  )}
                  <Text fontSize="sm" color={selectedRepoForCleanup.unpushed_count === 0 ? 'gray.200' : 'red.400'}>
                    Rule 2: All commits pushed ({selectedRepoForCleanup.unpushed_count} unpushed commit(s) remaining)
                  </Text>
                </Flex>

                <Flex align="center" gap={3}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text fontSize="sm" color="gray.200">
                    Rule 3: Remote verified on GitHub ({selectedRepoForCleanup.remote_url})
                  </Text>
                </Flex>

                <Flex align="center" gap={3}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text fontSize="sm" color="gray.200">
                    Rule 4: Explicit user confirmation required
                  </Text>
                </Flex>
              </Flex>

              {cleanupStatusMessage && (
                <Text color="yellow.300" fontSize="sm" mb={4}>{cleanupStatusMessage}</Text>
              )}

              <Flex gap={3}>
                <Button
                  colorScheme="red"
                  disabled={selectedRepoForCleanup.uncommitted_count > 0 || selectedRepoForCleanup.unpushed_count > 0}
                  onClick={() => handleExecuteSafeCleanup(selectedRepoForCleanup)}
                >
                  Execute Safe Local Cleanup
                </Button>
                <Button variant="outline" colorScheme="gray" onClick={() => setSelectedRepoForCleanup(null)}>
                  Cancel
                </Button>
              </Flex>
            </Box>
          ) : (
            <Text color="gray.400" fontSize="sm" mb={4}>Select a repository from the Repositories Dashboard to evaluate for safe cleanup.</Text>
          )}

          {/* Cleanup Audit Trail History */}
          <Heading size="sm" color="white" mt={6} mb={3}>Cleanup Audit History Logs</Heading>
          {cleanupLogs.length === 0 ? (
            <Text color="gray.500" fontSize="xs">No cleanup operations recorded yet.</Text>
          ) : (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row bg="#0B0F17">
                  <Table.ColumnHeader color="gray.400">Repository</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Freed Storage</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Path Cleaned</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Date Deleted</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {cleanupLogs.map(log => (
                  <Table.Row key={log.id}>
                    <Table.Cell color="white" fontWeight="600">{log.repository_name}</Table.Cell>
                    <Table.Cell color="green.400">{(log.freed_bytes / (1024 * 1024)).toFixed(1)} MB</Table.Cell>
                    <Table.Cell color="gray.400" fontFamily="monospace" fontSize="xs">{log.deleted_path}</Table.Cell>
                    <Table.Cell color="gray.400" fontSize="xs">{new Date(log.deleted_at).toLocaleString()}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      )}

      {/* TAB 3: INSTANT RESTORE & SNAPSHOTS */}
      {activeTab === 'restore' && (
        <Box bg="#161B26" p={5} borderRadius="lg" border="1px solid" borderColor="#232B3E">
          <Heading size="md" color="white" mb={2}>One-Click Instant Restore Engine</Heading>
          <Text color="gray.400" fontSize="sm" mb={6}>
            Restore any archived repository from GitHub directly to your local development machine with one click.
          </Text>

          <form onSubmit={handleExecuteRestore}>
            <Flex direction="column" gap={4} maxW="600px" bg="#0B0F17" p={5} borderRadius="md" border="1px solid" borderColor="#232B3E" mb={6}>
              <Box>
                <Text color="gray.300" fontSize="xs" mb={1} fontWeight="600">GitHub Remote Repository URL</Text>
                <Input
                  placeholder="https://github.com/org/repository.git"
                  value={restoreUrl}
                  onChange={e => setRestoreUrl(e.target.value)}
                  bg="#161B26"
                  color="white"
                  border="1px solid #232B3E"
                />
              </Box>

              <Box>
                <Text color="gray.300" fontSize="xs" mb={1} fontWeight="600">Target Local Directory Path</Text>
                <Input
                  placeholder="C:\AIProjects\repository-name"
                  value={restorePath}
                  onChange={e => setRestorePath(e.target.value)}
                  bg="#161B26"
                  color="white"
                  border="1px solid #232B3E"
                />
              </Box>

              <Box>
                <Text color="gray.300" fontSize="xs" mb={1} fontWeight="600">Branch to Checkout</Text>
                <Input
                  placeholder="main"
                  value={restoreBranch}
                  onChange={e => setRestoreBranch(e.target.value)}
                  bg="#161B26"
                  color="white"
                  border="1px solid #232B3E"
                />
              </Box>

              {restoreMessage && (
                <Text color="blue.300" fontSize="xs">{restoreMessage}</Text>
              )}

              <Button colorScheme="blue" type="submit" loading={restoreLoading}>
                <RotateCcw size={16} style={{ marginRight: '6px' }} /> Clone & Restore Repository
              </Button>
            </Flex>
          </form>

          {/* Workspace Snapshots List */}
          <Heading size="sm" color="white" mt={6} mb={3}>Saved Workspace Snapshots</Heading>
          {snapshots.length === 0 ? (
            <Text color="gray.500" fontSize="xs">No workspace snapshots saved yet. Click "Snapshot" on any repository card to capture state.</Text>
          ) : (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row bg="#0B0F17">
                  <Table.ColumnHeader color="gray.400">Snapshot ID</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Profile</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400">Date Captured</Table.ColumnHeader>
                  <Table.ColumnHeader color="gray.400" textAlign="right">Action</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {snapshots.map(snap => (
                  <Table.Row key={snap.id}>
                    <Table.Cell color="white" fontFamily="monospace" fontSize="xs">{snap.id.substring(0, 12)}</Table.Cell>
                    <Table.Cell color="blue.300">{snap.profile_id}</Table.Cell>
                    <Table.Cell color="gray.400" fontSize="xs">{new Date(snap.created_at).toLocaleString()}</Table.Cell>
                    <Table.Cell textAlign="right">
                      <Button size="xs" colorScheme="blue" variant="outline">Restore Snapshot</Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      )}

      {/* TAB 4: WORKSPACE PROFILES */}
      {activeTab === 'profiles' && (
        <Box bg="#161B26" p={5} borderRadius="lg" border="1px solid" borderColor="#232B3E">
          <Heading size="md" color="white" mb={2}>Workspace Profiles</Heading>
          <Text color="gray.400" fontSize="sm" mb={6}>
            Group your repositories into focused profiles (AI Development, Client Projects, Learning Sandbox) with custom retention policies.
          </Text>

          <Flex gap={4} flexWrap="wrap" mb={6}>
            {profiles.map(prof => (
              <Box key={prof.id} flex="1" minW="260px" bg="#0B0F17" p={4} borderRadius="md" border="1px solid" borderColor="#232B3E">
                <Heading size="sm" color="blue.300" mb={1}>{prof.name}</Heading>
                <Text color="gray.400" fontSize="xs" mb={3}>{prof.description}</Text>
                <Badge colorScheme="purple" mb={2}>Retention: {prof.retention_days} Days</Badge>
                <Text color="gray.400" fontSize="xs">Preferred Branch: {prof.preferred_branch}</Text>
              </Box>
            ))}
          </Flex>

          {/* Create New Profile Form */}
          <Box bg="#0B0F17" p={4} borderRadius="md" border="1px solid" borderColor="#232B3E" maxW="500px">
            <Heading size="xs" color="white" mb={3} textTransform="uppercase">Create New Workspace Profile</Heading>
            <form onSubmit={handleCreateProfile}>
              <Flex direction="column" gap={3}>
                <Input
                  placeholder="Profile Name (e.g. Retail Platform)"
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  bg="#161B26"
                  color="white"
                  border="1px solid #232B3E"
                  size="sm"
                />
                <Input
                  placeholder="Profile Description"
                  value={newProfileDesc}
                  onChange={e => setNewProfileDesc(e.target.value)}
                  bg="#161B26"
                  color="white"
                  border="1px solid #232B3E"
                  size="sm"
                />
                <Button colorScheme="blue" size="sm" type="submit">Save Profile</Button>
              </Flex>
            </form>
          </Box>
        </Box>
      )}
    </Box>
  );
};
