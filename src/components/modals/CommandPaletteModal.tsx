import React, { useState, useEffect, useRef } from 'react';
import { Search, Activity, Package, Shield, Cpu, Terminal, FileText, Zap, RefreshCw, Layers } from '../../utils/icons';
import { Box, Flex, Text, Input, Badge } from '@chakra-ui/react';
import { DialogRoot, DialogContent } from '../ui/dialog';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Action' | 'Software' | 'Security';
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  onTriggerScan: () => void;
  onExportAIPackage: () => void;
  onExportExecutiveReport: () => void;
  onOpenWebhooks: () => void;
  softwareItems?: Array<{ name: string; version: string; manager: string }>;
  findingsCount?: number;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onTriggerScan,
  onExportAIPackage,
  onExportExecutiveReport,
  onOpenWebhooks,
  softwareItems = [],
  findingsCount = 0
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command options
  const defaultCommands: CommandItem[] = [
    {
      id: 'nav-overview',
      title: 'Go to Overview Dashboard',
      category: 'Navigation',
      icon: <Activity size={16} className="text-blue-400" />,
      shortcut: 'Alt+1',
      action: () => { onSelectTab('overview'); onClose(); }
    },
    {
      id: 'nav-software',
      title: 'Go to Unified Software Intelligence Catalog',
      category: 'Navigation',
      icon: <Package size={16} className="text-purple-400" />,
      shortcut: 'Alt+4',
      action: () => { onSelectTab('software'); onClose(); }
    },
    {
      id: 'nav-topology',
      title: 'Go to Dependency Topology Graph',
      category: 'Navigation',
      icon: <Layers size={16} className="text-emerald-400" />,
      shortcut: 'Alt+6',
      action: () => { onSelectTab('topology'); onClose(); }
    },
    {
      id: 'nav-vuln',
      title: 'Go to Vulnerability & Threat Intelligence',
      category: 'Navigation',
      icon: <Shield size={16} className="text-red-400" />,
      action: () => { onSelectTab('coming-soon-vuln'); onClose(); }
    },
    {
      id: 'nav-healing',
      title: 'Go to Closed-Loop Auto-Healing Policies',
      category: 'Navigation',
      icon: <Zap size={16} className="text-amber-400" />,
      action: () => { onSelectTab('coming-soon-healing'); onClose(); }
    },
    {
      id: 'nav-fleet-analytics',
      title: 'Go to Multi-Node Fleet Analytics',
      category: 'Navigation',
      icon: <Cpu size={16} className="text-cyan-400" />,
      action: () => { onSelectTab('fleet-analytics'); onClose(); }
    },
    {
      id: 'nav-workspace',
      title: 'Go to Workspace & Environment Manager',
      category: 'Navigation',
      icon: <Terminal size={16} className="text-gray-400" />,
      action: () => { onSelectTab('workspace'); onClose(); }
    },
    {
      id: 'act-scan',
      title: 'Run System Telemetry Scan',
      category: 'Action',
      icon: <RefreshCw size={16} className="text-emerald-400" />,
      action: () => { onTriggerScan(); onClose(); }
    },
    {
      id: 'act-ai-zip',
      title: 'Export AI Review Package (.zip)',
      category: 'Action',
      icon: <FileText size={16} className="text-indigo-400" />,
      action: () => { onExportAIPackage(); onClose(); }
    },
    {
      id: 'act-exec-report',
      title: 'Export Executive ROI & Compliance PDF/HTML Report',
      category: 'Action',
      icon: <FileText size={16} className="text-amber-400" />,
      action: () => { onExportExecutiveReport(); onClose(); }
    },
    {
      id: 'act-webhooks',
      title: 'Configure ServiceNow / Jira / PagerDuty Webhooks',
      category: 'Action',
      icon: <Zap size={16} className="text-purple-400" />,
      action: () => { onOpenWebhooks(); onClose(); }
    }
  ];

  // Dynamic software package results matching query
  const dynamicSoftwareCommands: CommandItem[] = softwareItems
    .filter(item => item.name.toLowerCase().includes(query.toLowerCase()) || item.manager.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map(item => ({
      id: `sw-${item.name}`,
      title: `Inspect Package: ${item.name} (${item.version})`,
      category: 'Software',
      icon: <Package size={16} className="text-purple-400" />,
      action: () => { onSelectTab('software'); onClose(); }
    }));

  const filteredCommands = query.trim() === ''
    ? defaultCommands
    : [...defaultCommands, ...dynamicSoftwareCommands].filter(cmd => 
        cmd.title.toLowerCase().includes(query.toLowerCase()) || 
        cmd.category.toLowerCase().includes(query.toLowerCase())
      );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(details) => { if (!details.open) onClose(); }}>
      <DialogContent className="max-w-2xl bg-gray-900 border border-gray-700 text-white rounded-xl shadow-2xl overflow-hidden p-0">
        <Flex align="center" className="px-4 py-3 border-b border-gray-800 bg-gray-950">
          <Search size={18} className="text-gray-400 mr-3" />
          <Input
            ref={inputRef}
            placeholder="Type a command, package, host, or action... (Esc to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            variant="flushed"
            className="text-gray-100 placeholder-gray-500 text-base focus:outline-none border-none shadow-none"
          />
          <Badge className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded">
            Cmd+K
          </Badge>
        </Flex>

        <Box className="max-h-96 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <Box className="p-8 text-center text-gray-500">
              No matching commands or resources found for "{query}".
            </Box>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <Flex
                  key={cmd.id}
                  align="center"
                  justify="space-between"
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-150 ${
                    isSelected ? 'bg-indigo-600/30 border border-indigo-500/50 text-white' : 'text-gray-300 hover:bg-gray-800/60'
                  }`}
                >
                  <Flex align="center" gap={3}>
                    <Box className="p-1.5 rounded-md bg-gray-800 border border-gray-700">
                      {cmd.icon}
                    </Box>
                    <Box>
                      <Text className="text-sm font-medium text-gray-100">{cmd.title}</Text>
                      <Text className="text-xs text-gray-500">{cmd.category}</Text>
                    </Box>
                  </Flex>

                  {cmd.shortcut && (
                    <Badge className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded border border-gray-700">
                      {cmd.shortcut}
                    </Badge>
                  )}
                </Flex>
              );
            })
          )}
        </Box>

        <Flex align="center" justify="space-between" className="px-4 py-2 border-t border-gray-800 bg-gray-950 text-xs text-gray-500">
          <Flex align="center" gap={4}>
            <span><strong className="text-gray-400">↑↓</strong> Navigate</span>
            <span><strong className="text-gray-400">↵</strong> Select</span>
            <span><strong className="text-gray-400">esc</strong> Dismiss</span>
          </Flex>
          <Text className="text-gray-500">{findingsCount} findings active</Text>
        </Flex>
      </DialogContent>
    </DialogRoot>
  );
};
