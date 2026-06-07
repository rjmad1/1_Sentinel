import React, { useState } from 'react';
import { Check, Shield, Activity, Terminal, Globe, Package } from '../utils/icons';
import { Box, Flex, Heading, Text, Badge, SimpleGrid, Button } from '@chakra-ui/react';

interface FeatureDetail {
  name: string;
  subtitle: string;
  purpose: string;
  expectedBenefits: string[];
  plannedPhase: string;
  phaseProgress: number; // percentage
  status: string;
}

const FEATURE_DATA: Record<string, FeatureDetail> = {
  'coming-soon-fleet': {
    name: 'Fleet Management',
    subtitle: 'Enterprise Fleet Orchestration',
    purpose: 'Unified orchestrator to discover, update, and manage multi-machine deployments across cloud and hybrid infrastructure.',
    expectedBenefits: [
      'Scale operations from a single host to thousands of endpoints with zero-touch policies.',
      'Deploy and synchronize assessment cycles globally across server groups.',
      'Aggregated health dashboards and comparative host telemetry analysis.'
    ],
    plannedPhase: 'Phase 2 (Q3 2026)',
    phaseProgress: 65,
    status: 'In Development'
  },
  'coming-soon-correlation': {
    name: 'Correlation & Causal Inference',
    subtitle: 'Graph-Based Threat Propagation Core',
    purpose: 'Causal mapping engine that correlates multi-signal events, logs, and assessments into unified causal chains.',
    expectedBenefits: [
      'Reduce alarm fatigue by 90% by grouping unrelated warnings into single causal trees.',
      'Trace exact path of impact from process crash up to user-facing service outage.',
      'Explainable AI reasoning for automated root-cause determinations.'
    ],
    plannedPhase: 'Phase 2 (Q3 2026)',
    phaseProgress: 45,
    status: 'Prototyping'
  },
  'coming-soon-healing': {
    name: 'Auto-Healing & Self-Recovery',
    subtitle: 'Closed-Loop Drift Remediation',
    purpose: 'Automated policy enforcement engine that detects configuration drifts and runs localized runbooks to self-heal systems.',
    expectedBenefits: [
      'Remediate security configuration drifts automatically in under 60 seconds.',
      'Zero-human intervention required for common operational failures.',
      'Failsafe rollback logic that protects system integrity if repair scripts fail.'
    ],
    plannedPhase: 'Phase 3 (Q4 2026)',
    phaseProgress: 20,
    status: 'Researching Architecture'
  },
  'coming-soon-ai-eng': {
    name: 'Autonomous AI Ops Engineer',
    subtitle: 'Agentic Diagnostics Loop',
    purpose: 'Multi-agent localized AI loop that goes beyond simple chatbot answers to run deep diagnostic investigations and author custom code fixes.',
    expectedBenefits: [
      'Offload complex diagnostic triage tasks to localized, self-directed AI workers.',
      'Natural language task delegation for writing compliance test suites.',
      'Self-validating execution loops that test fixes in safe sandbox regions before applying.'
    ],
    plannedPhase: 'Phase 4 (Q1 2027)',
    phaseProgress: 10,
    status: 'Planning Research'
  },
  'coming-soon-vuln': {
    name: 'Vulnerability & Threat Intelligence',
    subtitle: 'Real-Time Exploit Correlation',
    purpose: 'Live threat mapping engine correlating inventory packages with global CVE feeds and active threat intelligence databases.',
    expectedBenefits: [
      'Prioritize software upgrades based on active real-world threat feeds rather than static CVSS scores.',
      'Instant zero-day vulnerability checks and zero-hour hotfixing options.',
      'Compliance and supply-chain risk indexing of all runtime libraries.'
    ],
    plannedPhase: 'Phase 3 (Q4 2026)',
    phaseProgress: 35,
    status: 'Designing Integration'
  },
  'coming-soon-execution': {
    name: 'Active Remediation Execution',
    subtitle: 'Safe OS Commands Dispatcher',
    purpose: 'Secure remote command dispatcher built to safely apply fixes, patches, and upgrades directly to host operating systems with pre/post checks.',
    expectedBenefits: [
      'Deploy hotfixes across target groups with transactional safety guarantees.',
      'Automatic pre-flight state snapshots and post-flight validation runs.',
      'Granular auditing and role-based access approvals for all write actions.'
    ],
    plannedPhase: 'Phase 2 (Q3 2026)',
    phaseProgress: 75,
    status: 'In Alpha Testing'
  }
};

interface ComingSoonPageProps {
  featureKey: string;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ featureKey }) => {
  const data = FEATURE_DATA[featureKey];
  const [requested, setRequested] = useState<boolean>(() => {
    return localStorage.getItem(`requested-${featureKey}`) === 'true';
  });
  const [votes, setVotes] = useState<number>(() => {
    const base = Math.abs(featureKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 100 + 40;
    return requested ? base + 1 : base;
  });

  if (!data) {
    return (
      <Box className="coming-soon-panel" textAlign="center" p="8">
        <Heading color="red" size="lg" mb="4">Feature Configuration Not Found</Heading>
        <Text color="text.secondary">The selected feature key could not be mapped to metadata.</Text>
      </Box>
    );
  }

  const handleRequestAccess = () => {
    if (requested) {
      localStorage.setItem(`requested-${featureKey}`, 'false');
      setRequested(false);
      setVotes(prev => prev - 1);
    } else {
      localStorage.setItem(`requested-${featureKey}`, 'true');
      setRequested(true);
      setVotes(prev => prev + 1);
    }
  };

  const getFeatureIcon = () => {
    switch (featureKey) {
      case 'coming-soon-fleet': return <Globe size={32} color="#06B6D4" />;
      case 'coming-soon-correlation': return <Activity size={32} color="#06B6D4" />;
      case 'coming-soon-healing': return <Shield size={32} color="#06B6D4" />;
      case 'coming-soon-ai-eng': return <Terminal size={32} color="#06B6D4" />;
      case 'coming-soon-vuln': return <Package size={32} color="#06B6D4" />;
      case 'coming-soon-execution': return <Check size={32} color="#16C784" />;
      default: return <Shield size={32} color="#06B6D4" />;
    }
  };

  return (
    <Box className="coming-soon-panel">
      {/* Visual Header */}
      <Flex gap="5" align="center" mb="6" pb="5" borderBottom="1px solid" borderColor="rgba(255,255,255,0.1)">
        <Flex
          w="16"
          h="16"
          borderRadius="12px"
          bg="rgba(59, 130, 246, 0.05)"
          border="1px solid"
          borderColor="rgba(255,255,255,0.1)"
          align="center"
          justify="center"
          boxShadow="0 2px 8px rgba(0, 0, 0, 0.15)"
          flexShrink={0}
        >
          {getFeatureIcon()}
        </Flex>
        
        <Box flex="1">
          <Flex justify="space-between" align="flex-start" wrap="wrap" gap="2">
            <Box>
              <Heading as="h2" fontSize="20px" fontWeight="bold" textTransform="uppercase" letterSpacing="0.5px" mb="1">
                {data.name}
              </Heading>
              <Text fontSize="12px" color="cyan" fontFamily="mono">
                {data.subtitle}
              </Text>
            </Box>
            <Badge colorPalette="orange" variant="solid" size="md" px="3" py="1">
              ✦ {data.status}
            </Badge>
          </Flex>
        </Box>
      </Flex>

      {/* Main Details grid */}
      <SimpleGrid columns={{ base: 1, md: 12 }} gap="6">
        {/* Left column: Purpose & Benefits */}
        <Flex gridColumn={{ md: 'span 7' }} direction="column" gap="5">
          <Box>
            <Heading as="h3" fontSize="11px" textTransform="uppercase" letterSpacing="1px" color="text.secondary" mb="2">
              Scope & Core Purpose
            </Heading>
            <Text
              color="text.primary"
              fontSize="14px"
              lineHeight="1.5"
              bg="bg.secondary"
              p="4"
              borderRadius="12px"
              border="1px solid"
              borderColor="rgba(255,255,255,0.1)"
            >
              {data.purpose}
            </Text>
          </Box>

          <Box>
            <Heading as="h3" fontSize="11px" textTransform="uppercase" letterSpacing="1px" color="text.secondary" mb="2">
              Key Planned Capabilities
            </Heading>
            <Flex direction="column" gap="3">
              {data.expectedBenefits.map((benefit, idx) => (
                <Flex key={idx} gap="3" align="stretch">
                  <Flex
                    w="5"
                    h="5"
                    borderRadius="full"
                    bg="rgba(16, 185, 129, 0.1)"
                    border="1px solid rgba(16, 185, 129, 0.2)"
                    align="center"
                    justify="center"
                    color="#16C784"
                    fontSize="11px"
                    flexShrink={0}
                    mt="0.5"
                  >
                    ✓
                  </Flex>
                  <Text fontSize="12px" color="text.secondary" lineHeight="1.5">
                    {benefit}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Box>
        </Flex>

        {/* Right column: Target Phase & Interactive */}
        <Flex
          gridColumn={{ md: 'span 5' }}
          direction="column"
          gap="5"
          borderLeft={{ md: '1px solid' }}
          borderColor={{ md: 'rgba(255,255,255,0.1)' }}
          pl={{ md: '6' }}
        >
          <Box bg="bg.secondary" border="1px solid" borderColor="rgba(255,255,255,0.1)" borderRadius="12px" p="4">
            <Heading as="h3" fontSize="11px" textTransform="uppercase" letterSpacing="1px" color="text.muted" mb="3">
              Deployment Target
            </Heading>
            
            <Flex justify="space-between" align="center" mb="2">
              <Text fontSize="12px" fontWeight="bold">Release Goal:</Text>
              <Badge colorPalette="cyan" variant="solid" fontSize="11px">{data.plannedPhase}</Badge>
            </Flex>

            <Box mt="4">
              <Flex justify="space-between" fontSize="11px" color="text.secondary" mb="2">
                <Text>Phase Progress:</Text>
                <Text fontFamily="mono" fontWeight="bold">{data.phaseProgress}%</Text>
              </Flex>
              <Box w="full" bg="rgba(255,255,255,0.05)" borderRadius="full" h="2" overflow="hidden">
                <Box
                  h="full"
                  bg={data.phaseProgress > 50 ? '#06B6D4' : '#F5A524'}
                  w={`${data.phaseProgress}%`}
                  borderRadius="full"
                  transition="width 0.5s ease-out"
                />
              </Box>
            </Box>
          </Box>

          <Flex
            bg="rgba(59, 130, 246, 0.02)"
            border="1px dashed"
            borderColor="rgba(255,255,255,0.15)"
            borderRadius="12px"
            p="5"
            textAlign="center"
            direction="column"
            gap="3"
            align="center"
          >
            <Text fontSize="12px" fontWeight="bold" color="text.primary">Co-Pilot Early Adopters Program</Text>
            <Text fontSize="12px" color="text.secondary" lineHeight="1.5">
              Express interest in this module to prioritize development tasks and join the private developer preview.
            </Text>
            
            <Box my="1" fontSize="20px" fontWeight="800" fontFamily="mono" color="#06B6D4">
              {votes} <Text as="span" fontSize="11px" color="text.muted" fontWeight="normal" letterSpacing="normal">Commanders Interested</Text>
            </Box>

            <Button
              onClick={handleRequestAccess}
              colorPalette={requested ? 'cyber' : 'gray'}
              variant={requested ? 'solid' : 'outline'}
              w="full"
              size="sm"
              fontWeight="bold"
            >
              {requested ? '✓ Early Access Requested' : 'Express Interest & Vote'}
            </Button>
          </Flex>
        </Flex>
      </SimpleGrid>
    </Box>
  );
};
