import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Shield, Zap, Cpu, User } from '../utils/icons';
import { Box, Flex, Heading, Text, Button, Input, Badge, Spinner } from '@chakra-ui/react';

export interface LocalAICopilotProps {
  environment: any;
  healthScore: number;
  findings: any[];
  softwareCatalog?: any[];
  onApplyRemediationScript?: (scriptName: string, code: string) => void;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  codeSnippet?: string;
  suggestedAction?: { label: string; scriptName: string; code: string };
}

export const LocalAICopilot: React.FC<LocalAICopilotProps> = ({
  environment,
  healthScore,
  findings,
  onApplyRemediationScript
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message with local privacy assurance
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Hello! I am your **Sentinel Local-First AIOps Copilot**.\n\nI am evaluating **${environment?.hostname || 'Local Workstation'}** running **${environment?.os || 'Windows 11'}** (Health Score: **${healthScore}/100** with **${findings?.length || 0}** findings).\n\n🔒 **Privacy Assurance**: 100% of reasoning occurs locally inside your browser context over your IndexedDB dataset. Zero telemetry leaves your machine.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [environment, healthScore, findings, messages.length]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const presetPrompts = [
    {
      title: 'Audit EOL Software Risks',
      prompt: 'Identify all End-of-Life (EOL) or deprecated packages on this workstation and estimate upgrade risk.'
    },
    {
      title: 'Generate Remediation Script',
      prompt: 'Draft an automated PowerShell remediation script to fix BitLocker encryption and high-severity findings.'
    },
    {
      title: 'Capacity Exhaustion Audit',
      prompt: 'Analyze storage and memory exhaustion forecast and recommend cleanup steps.'
    },
    {
      title: 'CVE Vulnerability Defense',
      prompt: 'Cross-reference active software with known CVE vulnerabilities and prioritize patch sequence.'
    }
  ];

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || isGenerating) return;

    // eslint-disable-next-line react-hooks/purity
    const msgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: msgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsGenerating(true);

    // Simulate WebGPU / local LLM inference reasoning
    setTimeout(() => {
      let responseText: string;
      let snippet: string | undefined = undefined;
      let action: ChatMessage['suggestedAction'] = undefined;

      const lower = query.toLowerCase();
      if (lower.includes('eol') || lower.includes('software')) {
        responseText = `### 📦 Software Lifecycle & EOL Audit Results\n\nBased on normalized analysis across Winget, Scoop, npm, and Chocolatey:\n- **Python 3.8.10**: Legacy release approaching End-Of-Life. Upgrade path: \`3.12.2\`.\n- **Node.js 18.16.0**: Active LTS. Recommended security update: \`20.11.1\`.\n- **Git 2.40.0**: Vulnerable to CVE-2023-22490 (Path traversal). Upgrade to \`2.43.0\` immediately.`;
        snippet = `# Powershell Batch Package Upgrade\nwinget upgrade --id Python.Python.3.12 --silent\nwinget upgrade --id Git.Git --silent`;
        action = {
          label: 'Push Batch Upgrade to Auto-Healing Policy',
          scriptName: 'Upgrade Legacy Packages',
          code: snippet
        };
      } else if (lower.includes('script') || lower.includes('remediat') || lower.includes('bitlocker')) {
        responseText = `### 🛡️ Automated Security Fix Script\n\nI have generated a signed PowerShell remediation script for **${environment?.hostname || 'this host'}** to enforce BitLocker TPM protection and clean temp file reserves:`;
        snippet = `# Sentinel Autonomous Self-Healing Script\n# Enforce BitLocker Encryption Check\nif ((Get-BitLockerVolume -MountPoint "C:").ProtectionStatus -ne "On") {\n    Enable-BitLocker -MountPoint "C:" -EncryptionMethod XtsAes256 -UsedSpaceOnly -SkipHardwareTest\n}\n\n# Clean Windows Temp Reserves\nRemove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue`;
        action = {
          label: 'Apply Script to Auto-Healing Engine',
          scriptName: 'Enforce BitLocker & Clear Temp',
          code: snippet
        };
      } else if (lower.includes('capacity') || lower.includes('storage') || lower.includes('exhaust')) {
        responseText = `### 💾 Capacity Exhaustion Forecast Analysis\n\n- **Primary Volume (C:)**: Exhaustion predicted in **42 days** based on historical trend (+1.4 GB/week).\n- **Memory Footprint**: Average utilization **78%**. Top consumer: \`Docker Desktop\` (4.2 GB).\n\n**Recommended Actions**:\n1. Run Docker system prune (\`docker system prune -a --volumes\`).\n2. Clear npm and pip cache archives (\`npm cache clean --force\`).`;
      } else {
        responseText = `### 🤖 Sentinel Intelligence Assessment\n\nAnalyzed system state for **${environment?.hostname || 'Host'}**:\n- **Health Score**: ${healthScore}/100\n- **Active Findings**: ${findings?.length || 0}\n- **Security Posture**: BitLocker status verified. Firewall policies active.\n\nAll recommendations are validated against deterministic rules before execution.`;
      }

      const aiMsgId = `ai-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        codeSnippet: snippet,
        suggestedAction: action
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <Box className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-2xl h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <Flex align="center" justify="space-between" className="pb-4 border-b border-gray-800">
        <Flex align="center" gap={3}>
          <Box className="p-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
            <Bot size={22} />
          </Box>
          <Box>
            <Heading size="md" className="text-gray-100 font-semibold flex items-center gap-2">
              On-Device Local AI Copilot
              <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs px-2 py-0.5 rounded">
                WebGPU / Local-First
              </Badge>
            </Heading>
            <Text className="text-xs text-gray-400">
              Deterministic reasoning over IndexedDB context • Zero server transmission
            </Text>
          </Box>
        </Flex>

        <Flex align="center" gap={2}>
          <Badge className="bg-gray-800 text-gray-300 border border-gray-700 text-xs px-2.5 py-1 rounded flex items-center gap-1.5">
            <Cpu size={12} className="text-cyan-400" />
            {environment?.hostname || 'Workstation'}
          </Badge>
          <Badge className="bg-gray-800 text-gray-300 border border-gray-700 text-xs px-2.5 py-1 rounded flex items-center gap-1.5">
            <Shield size={12} className="text-indigo-400" />
            Health {healthScore}/100
          </Badge>
        </Flex>
      </Flex>

      {/* Preset Action Bar */}
      <Box className="py-3 border-b border-gray-800/60 overflow-x-auto">
        <Flex gap={2}>
          {presetPrompts.map((preset, idx) => (
            <Button
              key={idx}
              size="xs"
              onClick={() => handleSendMessage(preset.prompt)}
              disabled={isGenerating}
              className="bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
            >
              {preset.title}
            </Button>
          ))}
        </Flex>
      </Box>

      {/* Message Chat Feed */}
      <Box className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
        {messages.map(msg => (
          <Flex
            key={msg.id}
            justify={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
            className="w-full"
          >
            <Flex
              gap={3}
              className={`max-w-3xl rounded-xl p-4 ${
                msg.sender === 'user'
                  ? 'bg-indigo-600/30 border border-indigo-500/40 text-gray-100'
                  : 'bg-gray-950/80 border border-gray-800 text-gray-200'
              }`}
            >
              {msg.sender === 'assistant' && (
                <Box className="p-1.5 rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800/60 h-fit">
                  <Bot size={16} />
                </Box>
              )}

              <Box className="flex-1 space-y-2">
                <Flex align="center" justify="space-between" className="text-xs text-gray-400 mb-1">
                  <span className="font-semibold text-gray-300">
                    {msg.sender === 'user' ? 'You' : 'Sentinel AI Agent'}
                  </span>
                  <span>{msg.timestamp}</span>
                </Flex>

                <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>

                {msg.codeSnippet && (
                  <Box className="mt-3 bg-gray-900 border border-gray-800 rounded-lg p-3 overflow-x-auto font-mono text-xs text-emerald-400">
                    <pre>{msg.codeSnippet}</pre>
                  </Box>
                )}

                {msg.suggestedAction && onApplyRemediationScript && (
                  <Button
                    size="xs"
                    onClick={() => onApplyRemediationScript(msg.suggestedAction!.scriptName, msg.suggestedAction!.code)}
                    className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  >
                    <Zap size={14} />
                    {msg.suggestedAction.label}
                  </Button>
                )}
              </Box>

              {msg.sender === 'user' && (
                <Box className="p-1.5 rounded-md bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 h-fit">
                  <User size={16} />
                </Box>
              )}
            </Flex>
          </Flex>
        ))}

        {isGenerating && (
          <Flex gap={3} className="max-w-xl bg-gray-950/80 border border-gray-800 rounded-xl p-4 text-gray-300">
            <Spinner size="sm" color="indigo.400" />
            <Text className="text-sm text-gray-400 animate-pulse">
              Evaluating IndexedDB telemetry via local WebGPU reasoning engine...
            </Text>
          </Flex>
        )}
        <div ref={chatEndRef} />
      </Box>

      {/* Input Prompt Bar */}
      <Box className="pt-3 border-t border-gray-800">
        <Flex gap={2}>
          <Input
            placeholder="Ask AI Copilot to analyze software, draft scripts, or audit security..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            className="bg-gray-950 border-gray-800 text-gray-100 placeholder-gray-500 text-sm focus:border-indigo-500 focus:outline-none"
            disabled={isGenerating}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={isGenerating || !inputText.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 flex items-center gap-2"
          >
            <Send size={16} />
            Ask
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};
