import React from 'react';
import {
  Terminal,
  AlertTriangle
} from '../utils/icons';
import type { HistoricalAssessment } from '../utils/mockData';
import { Badge, Box, Flex, Text, Heading, VStack, SimpleGrid, Code, Button } from '@chakra-ui/react';

// Simple Icons defined inline or imported
export const CheckCircleIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#16C784' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const FileIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const ArrowRightIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// 1. Severity Badge
export const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const sev = severity.toLowerCase();
  let colorPalette = 'blue';
  if (sev === 'critical' || sev === 'high') {
    colorPalette = 'red';
  } else if (sev === 'medium') {
    colorPalette = 'orange';
  } else if (sev === 'success' || sev === 'low') {
    colorPalette = 'green';
  } else if (sev === 'info' || sev === 'informational') {
    colorPalette = 'cyan';
  }

  return (
    <Badge colorPalette={colorPalette} variant="solid" size="sm" fontSize="11px" fontWeight="bold" textTransform="uppercase">
      {severity}
    </Badge>
  );
};

// 2. Trend Badge
export const TrendBadge: React.FC<{ trend: 'improving' | 'degrading' | 'stable'; text?: string }> = ({ trend, text }) => {
  const isUp = trend === 'improving';
  const isDown = trend === 'degrading';
  const color = isUp ? '#16C784' : isDown ? '#EF4444' : '#F5A524';
  const icon = isUp ? '↑' : isDown ? '↓' : '→';

  return (
    <Flex align="center" gap="1" color={color} fontWeight="bold" fontSize="12px">
      <Text as="span">{icon}</Text>
      <Text as="span">{text || (trend.charAt(0).toUpperCase() + trend.slice(1))}</Text>
    </Flex>
  );
};

// 3. Risk Indicator
export const RiskIndicator: React.FC<{ risk: string }> = ({ risk }) => {
  const r = risk.toLowerCase();
  let color = '#16C784';
  let icon = <CheckCircleIcon size={14} color="#16C784" />;

  if (r === 'critical' || r === 'high') {
    color = '#EF4444';
    icon = <AlertTriangle size={14} color="#EF4444" />;
  } else if (r === 'medium' || r === 'warn') {
    color = '#F5A524';
    icon = <AlertTriangle size={14} color="#F5A524" />;
  }

  return (
    <Flex align="center" gap="1.5" color={color} fontWeight="bold" fontSize="12px">
      {icon}
      <Text as="span" textTransform="uppercase">{risk}</Text>
    </Flex>
  );
};

// 4. Lifecycle Component
export interface StageState {
  name: string;
  status: 'complete' | 'active' | 'blocked' | 'pending';
}

export const LifecycleComponent: React.FC<{ stages: StageState[] }> = ({ stages }) => {
  return (
    <Flex
      align="center"
      gap="3"
      bg="rgba(0, 0, 0, 0.25)"
      px="4"
      py="1.5"
      borderRadius="full"
      border="1px solid"
      borderColor="rgba(255, 255, 255, 0.1)"
      overflowX="auto"
      maxW="100%"
    >
      {stages.map((stage, idx) => {
        const isActive = stage.status === 'active';
        const isComplete = stage.status === 'complete';
        const isBlocked = stage.status === 'blocked';
        
        let color = 'rgba(255,255,255,0.4)';
        let badgeBg = 'transparent';
        let badgeBorder = '1px solid rgba(255, 255, 255, 0.15)';
        
        if (isActive) {
          color = '#3B82F6';
          badgeBg = 'rgba(59, 130, 246, 0.1)';
          badgeBorder = '1px solid #3B82F6';
        } else if (isComplete) {
          color = '#16C784';
          badgeBg = 'rgba(22, 199, 132, 0.05)';
          badgeBorder = '1px solid #16C784';
        } else if (isBlocked) {
          color = '#EF4444';
          badgeBg = 'rgba(239, 68, 68, 0.1)';
          badgeBorder = '1px solid #EF4444';
        }

        return (
          <React.Fragment key={stage.name}>
            <Flex
              align="center"
              gap="1.5"
              fontSize="11px"
              fontWeight={isActive || isComplete ? 'bold' : 'normal'}
              color={color}
              whiteSpace="nowrap"
            >
              <Flex
                align="center"
                justify="center"
                w="18px"
                h="18px"
                borderRadius="full"
                fontSize="10px"
                bg={badgeBg}
                border="1px solid"
                borderColor={badgeBorder.split(' ').pop()}
                fontWeight="bold"
                fontFamily="mono"
              >
                {isComplete ? '✓' : isBlocked ? '!' : idx + 1}
              </Flex>
              <Text as="span" textTransform="uppercase" letterSpacing="0.5px">{stage.name}</Text>
            </Flex>
            {idx < stages.length - 1 && (
              <Text as="span" color="rgba(255,255,255,0.15)" fontSize="10px" userSelect="none">▶</Text>
            )}
          </React.Fragment>
        );
      })}
    </Flex>
  );
};

// 5. Assessment Header (Context Bar)
interface AssessmentHeaderProps {
  computerName: string;
  osName: string;
  lastBootTime: string;
  timestamp: string;
  psVersion: string;
  activeAssessmentId: string | null;
  daemonState: 'connected' | 'disconnected' | 'scanning' | 'error' | 'upgrade-required';
  findingsCount: number;
  completedRemediationsCount: number;
}

export const AssessmentHeader: React.FC<AssessmentHeaderProps> = ({
  computerName,
  osName,
  lastBootTime,
  timestamp,
  psVersion,
  activeAssessmentId,
  daemonState,
  findingsCount,
  completedRemediationsCount
}) => {
  const stages: StageState[] = [
    { 
      name: 'Collect', 
      status: daemonState === 'scanning' ? 'active' : (activeAssessmentId ? 'complete' : (daemonState === 'error' ? 'blocked' : 'pending')) 
    },
    { 
      name: 'Analyze', 
      status: activeAssessmentId ? 'complete' : 'pending' 
    },
    { 
      name: 'Identify', 
      status: findingsCount > 0 ? 'complete' : 'pending' 
    },
    { 
      name: 'Prioritize', 
      status: findingsCount > 0 ? 'complete' : 'pending' 
    },
    { 
      name: 'Remediate', 
      status: findingsCount === 0 ? 'pending' : (completedRemediationsCount === findingsCount ? 'complete' : 'active') 
    },
    { 
      name: 'Verify', 
      status: completedRemediationsCount === 0 ? 'pending' : (completedRemediationsCount === findingsCount ? 'complete' : 'active') 
    },
    { 
      name: 'Monitor', 
      status: daemonState === 'connected' ? 'active' : (daemonState === 'upgrade-required' || daemonState === 'error' ? 'blocked' : 'pending') 
    }
  ];

  return (
    <Flex
      direction="column"
      gap="3"
      px="6"
      py="4"
      bg="bg.secondary"
      borderBottom="1px solid"
      borderColor="rgba(255,255,255,0.1)"
      zIndex={5}
    >
      <Flex justify="space-between" align="center" gap="6" wrap="wrap">
        <Flex align="center" gap="4" wrap="wrap">
          <Flex align="center" gap="2">
            <Text as="span" fontSize="11px" color="text.muted" textTransform="uppercase">Host:</Text>
            <Text as="span" fontSize="13px" fontWeight="bold" fontFamily="mono" color="text.primary">{computerName || 'No host loaded'}</Text>
          </Flex>

          <Flex align="center" gap="2">
            <Text as="span" fontSize="11px" color="text.muted" textTransform="uppercase">OS:</Text>
            <Text as="span" fontSize="12px" color="text.secondary" title={osName}>{osName ? (osName.length > 28 ? osName.substring(0, 25) + '...' : osName) : 'Unknown OS'}</Text>
          </Flex>

          <Flex align="center" gap="2">
            <Text as="span" fontSize="11px" color="text.muted" textTransform="uppercase">ID:</Text>
            <Text as="span" fontSize="11px" fontFamily="mono" color="text.muted">{activeAssessmentId ? activeAssessmentId.substring(0, 8) + '...' : 'None'}</Text>
          </Flex>

          <Flex align="center" gap="2">
            <Text as="span" fontSize="11px" color="text.muted" textTransform="uppercase">Collected:</Text>
            <Text as="span" fontSize="12px" color="text.secondary">{timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}</Text>
          </Flex>

          <Flex align="center" gap="2">
            <Text as="span" fontSize="11px" color="text.muted" textTransform="uppercase">Boot:</Text>
            <Text as="span" fontSize="12px" color="text.secondary">{lastBootTime ? (lastBootTime.includes(' ') ? lastBootTime.split(' ')[0] : lastBootTime.substring(0, 10)) : 'N/A'}</Text>
          </Flex>

          <Flex align="center" gap="2">
            <Text as="span" fontSize="11px" color="text.muted" textTransform="uppercase">PS:</Text>
            <Text as="span" fontSize="12px" color="text.secondary" fontFamily="mono">v{psVersion || 'N/A'}</Text>
          </Flex>
        </Flex>

        <LifecycleComponent stages={stages} />
      </Flex>

      <div className="glass-panel" style={{ display: 'none' }}>
        Environment Overview Details: {computerName}
      </div>
    </Flex>
  );
};

// 6. Health Card
interface HealthCardProps {
  label: string;
  value: number | string;
  context: string;
  trend: 'improving' | 'degrading' | 'stable';
  trendText?: string;
  onActionClick?: () => void;
  actionText?: string;
}

export const HealthCard: React.FC<HealthCardProps> = ({
  label,
  value,
  context,
  trend,
  trendText,
  onActionClick,
  actionText = 'View Details'
}) => {
  return (
    <Box
      className="glass-panel"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      gap="3"
      p="4"
      borderRadius="12px"
      bg="bg.card"
      border="1px solid"
      borderColor="rgba(255,255,255,0.1)"
    >
      <Flex justify="space-between" align="flex-start">
        <Text fontSize="12px" fontWeight="bold" color="text.muted" textTransform="uppercase" letterSpacing="1px">
          {label}
        </Text>
        <TrendBadge trend={trend} text={trendText} />
      </Flex>

      <Box my="2">
        <Text fontSize="36px" fontWeight="bold" fontFamily="mono" color="text.primary">
          {value}
        </Text>
        <Text fontSize="12px" color="text.secondary" mt="1">
          {context}
        </Text>
      </Box>

      {onActionClick && (
        <Button 
          variant="outline"
          size="sm"
          onClick={onActionClick} 
          w="full"
          fontSize="11px"
          h="32px"
          borderColor="rgba(255, 255, 255, 0.15)"
          _hover={{ bg: 'rgba(255,255,255,0.05)' }}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
};

// 7. Action Card (Recommended Action Card)
interface ActionCardProps {
  title: string;
  findingId: string;
  severity: string;
  priority: number;
  effort: string;
  actionDescription: string;
  validationText: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onInspectClick?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  findingId,
  severity,
  priority,
  effort,
  actionDescription,
  validationText,
  isCompleted,
  onToggleComplete,
  onInspectClick
}) => {
  return (
    <Box
      display="flex"
      alignItems="flex-start"
      gap="4"
      p="4"
      border="1px solid"
      borderRadius="12px"
      bg={isCompleted ? 'rgba(22, 199, 132, 0.02)' : 'transparent'}
      borderColor={isCompleted ? 'rgba(22, 199, 132, 0.2)' : 'rgba(255,255,255,0.1)'}
      transition="all 0.2s ease"
    >
      <Box pt="1">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => onToggleComplete()}
          title="Mark remediation complete"
          style={{
            cursor: 'pointer',
            width: '16px',
            height: '16px',
            accentColor: '#16C784',
          }}
        />
      </Box>

      <Box flex="1">
        <Flex justify="space-between" align="center" mb="2" wrap="wrap" gap="2">
          <Flex align="center" gap="2">
            <Text fontSize="11px" fontFamily="mono" color="info" fontWeight="bold">
              {findingId} (Priority {priority})
            </Text>
            <SeverityBadge severity={severity} />
          </Flex>
          <Text fontSize="11px" color="text.muted">
            Effort: <Text as="strong" color="text.secondary">{effort}</Text>
          </Text>
        </Flex>

        <Heading
          as="h3"
          fontSize="15px"
          fontWeight="bold"
          mb="1.5"
          textDecoration={isCompleted ? 'line-through' : 'none'}
          color={isCompleted ? 'text.muted' : 'text.primary'}
        >
          {title}
        </Heading>

        <Text fontSize="13px" color="text.secondary" mb="3" lineHeight="1.4">
          {actionDescription}
        </Text>

        <Flex justify="space-between" align="center" wrap="wrap" gap="2">
          <Text fontSize="11px" color="text.muted">
            Verification: <Text as="strong" color="text.secondary">{validationText}</Text>
          </Text>
          {onInspectClick && (
            <Button 
              variant="outline"
              size="xs"
              onClick={onInspectClick}
              h="24px"
              fontSize="11px"
              px="2"
              borderColor="rgba(255, 255, 255, 0.15)"
            >
              Inspect Evidence
            </Button>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

// 8. Empty State Component
interface EmptyStateProps {
  title: string;
  description: string;
  causes: string[];
  actions: Array<{ label: string; onClick: () => void; primary?: boolean }>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  causes,
  actions
}) => {
  return (
    <VStack
      align="center"
      justify="center"
      p="12"
      textAlign="center"
      bg="bg.secondary"
      border="1px dashed"
      borderColor="rgba(255,255,255,0.15)"
      borderRadius="12px"
      gap="4"
      w="full"
    >
      <AlertTriangle size={48} color="#F5A524" style={{ opacity: 0.8 }} />
      
      <Box maxW="480px">
        <Heading as="h3" fontSize="18px" fontWeight="bold" color="text.primary" mb="2">
          {title}
        </Heading>
        <Text fontSize="14px" color="text.secondary" lineHeight="1.5">
          {description}
        </Text>
      </Box>

      {causes && causes.length > 0 && (
        <Box
          textAlign="left"
          bg="rgba(0, 0, 0, 0.15)"
          p="4"
          borderRadius="8px"
          border="1px solid"
          borderColor="rgba(255,255,255,0.1)"
          fontSize="13px"
          maxW="400px"
          w="full"
        >
          <Text as="strong" color="text.primary" display="block" mb="2">Possible Causes:</Text>
          <VStack align="stretch" gap="1.5" pl="4" as="ul" style={{ listStyleType: 'disc' }}>
            {causes.map((cause, idx) => (
              <Text as="li" key={idx} color="text.secondary" fontSize="13px">
                {cause}
              </Text>
            ))}
          </VStack>
        </Box>
      )}

      {actions && actions.length > 0 && (
        <Flex gap="3" mt="2" wrap="wrap" justify="center">
          {actions.map((act, idx) => (
            <Button 
              key={idx} 
              colorPalette={act.primary ? 'cyber' : 'gray'}
              variant={act.primary ? 'solid' : 'outline'}
              onClick={act.onClick}
              fontWeight={act.primary ? 'bold' : 'normal'}
              size="sm"
            >
              {act.label}
            </Button>
          ))}
        </Flex>
      )}
    </VStack>
  );
};

// 9. Evidence Panel
interface EvidencePanelProps {
  evidence: Array<{
    Source: string;
    Name: string;
    Value: unknown;
    ValidationState?: string;
    Collector?: string;
  }>;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence }) => {
  const renderValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <VStack align="stretch" gap="2" w="full">
      {evidence.map((ev, idx) => (
        <Box
          key={idx}
          bg="rgba(0, 0, 0, 0.2)"
          border="1px solid"
          borderColor="rgba(255,255,255,0.1)"
          borderRadius="8px"
          p="3"
        >
          <Flex justify="space-between" fontSize="11px" color="text.muted" mb="2" wrap="wrap" gap="2">
            <Text as="span">
              Source: <Text as="strong" color="text.secondary">{ev.Source}</Text> • Name: <Text as="strong" color="text.secondary">{ev.Name}</Text>
            </Text>
            {ev.Collector && <Text as="span">Collector: {ev.Collector}</Text>}
          </Flex>
          <Code
            display="block"
            fontSize="12px"
            fontFamily="mono"
            color="info"
            whiteSpace="pre-wrap"
            p="2"
            bg="rgba(2, 4, 10, 0.4)"
            borderRadius="4px"
            overflowX="auto"
          >
            {renderValue(ev.Value)}
          </Code>
          {ev.ValidationState && (
            <Flex justify="flex-end" mt="2">
              <Badge colorPalette="cyan" variant="solid" fontSize="9px" px="1.5" py="0.5">
                State: {ev.ValidationState}
              </Badge>
            </Flex>
          )}
        </Box>
      ))}
    </VStack>
  );
};

export interface TimelinePoint {
  run: HistoricalAssessment;
  x: number;
  y: number;
}

// 10. Timeline Component
interface TimelineComponentProps {
  historyData: HistoricalAssessment[];
  onPointClick: (assessmentId: string) => void;
  hoveredPoint: TimelinePoint | null;
  onPointEnter: (point: TimelinePoint) => void;
  onPointLeave: () => void;
}

export const TimelineComponent: React.FC<TimelineComponentProps> = ({
  historyData,
  onPointClick,
  hoveredPoint,
  onPointEnter,
  onPointLeave
}) => {
  if (!historyData || historyData.length === 0) {
    return (
      <Box
        p="8"
        textAlign="center"
        color="text.muted"
        border="1px dashed"
        borderColor="rgba(255, 255, 255, 0.15)"
        borderRadius="12px"
      >
        No historical assessments recorded.
      </Box>
    );
  }

  return (
    <Box position="relative" overflow="visible" my="5">
      <svg width="100%" height="240" viewBox="0 0 600 240" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'visible' }}>
        {/* Grid Lines */}
        {[20, 40, 60, 80, 100].map(val => {
          const y = 210 - (val / 100) * 180;
          return (
            <g key={val}>
              <line x1="50" y1={y} x2="560" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <text x="25" y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">{val}%</text>
            </g>
          );
        })}

        {/* Data Line Path */}
        {(() => {
          const points = historyData.map((run, idx) => {
            const x = 60 + (idx / Math.max(1, historyData.length - 1)) * 480;
            const y = 210 - (run.OverallHealth / 100) * 180;
            return { x, y };
          });
          const dAttr = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          return (
            <path
              d={dAttr}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
              style={{ filter: 'drop-shadow(0px 0px 6px #3B82F6)' }}
            />
          );
        })()}

        {/* Data Dots & Text Labels */}
        {historyData.map((run, idx) => {
          const x = 60 + (idx / Math.max(1, historyData.length - 1)) * 480;
          const y = 210 - (run.OverallHealth / 100) * 180;
          const dateStr = new Date(run.Timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return (
            <g key={run.AssessmentId}>
              <circle cx={x} cy={y} r="8" fill="#3B82F6" opacity="0.1" />
              <circle
                cx={x}
                cy={y}
                r="5"
                fill="#0B0F14"
                stroke="#3B82F6"
                strokeWidth="2.5"
                cursor="pointer"
                onMouseEnter={() => onPointEnter({ run, x, y })}
                onMouseLeave={onPointLeave}
                onClick={() => onPointClick(run.AssessmentId)}
              />
              <text x={x} y="225" fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle">{dateStr}</text>
              <text x={x} y={y - 12} fill="rgba(255,255,255,0.9)" fontSize="10" fontWeight="bold" textAnchor="middle" style={{ fontFamily: 'monospace' }}>
                {run.OverallHealth.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredPoint && (
        <Box
          position="absolute"
          left={`${(hoveredPoint.x / 600) * 100}%`}
          top={`${hoveredPoint.y - 85}px`}
          transform="translateX(-50%)"
          bg="rgba(6,9,19,0.95)"
          border="1px solid"
          borderColor="rgba(255,255,255,0.1)"
          boxShadow="0 0 12px rgba(59,130,246,0.35)"
          p="3"
          borderRadius="8px"
          fontSize="11px"
          pointerEvents="none"
          zIndex={20}
          display="flex"
          flexDirection="column"
          gap="1"
          whiteSpace="nowrap"
        >
          <Text fontWeight="bold" color="info" borderBottom="1px solid" borderColor="rgba(255,255,255,0.05)" pb="1" mb="1">
            ASSESSMENT SUMMARY
          </Text>
          <Text>Date: <Text as="strong" color="text.primary">{new Date(hoveredPoint.run.Timestamp).toLocaleString()}</Text></Text>
          <Text>Overall Score: <Text as="strong" color="info" fontFamily="mono">{hoveredPoint.run.OverallHealth.toFixed(1)}/100</Text></Text>
          <SimpleGrid columns={2} gap="1" mt="1" fontSize="10px" color="text.muted">
            <Box>Perf: {hoveredPoint.run.Performance}</Box>
            <Box>Sec: {hoveredPoint.run.Security}</Box>
            <Box>Rel: {hoveredPoint.run.Reliability}</Box>
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

// 11. Node Inspector (Topology Sidebar)
interface NodeInspectorProps {
  label: string;
  type: string;
  status: string;
  details: Record<string, unknown>;
  alertText?: string | null;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  label,
  type,
  status,
  details,
  alertText
}) => {
  const statusColor = status === 'error' ? '#EF4444' : status === 'warn' ? '#F5A524' : '#16C784';

  return (
    <VStack align="stretch" gap="4">
      <Flex gap="3" align="center" pb="3" borderBottom="1px solid" borderColor="rgba(255,255,255,0.05)">
        <Box
          w="3"
          h="3"
          borderRadius="full"
          bg={statusColor}
          boxShadow={`0 0 8px ${statusColor}`}
        />
        <Box>
          <Heading as="h3" fontSize="15px" fontWeight="bold" color="text.primary">{label}</Heading>
          <Text fontSize="10px" textTransform="uppercase" color="text.muted">Class: {type}</Text>
        </Box>
      </Flex>

      <VStack align="stretch" gap="2.5" fontSize="12px">
        <Flex justify="space-between" borderBottom="1px solid" borderColor="rgba(255,255,255,0.02)" pb="1.5">
          <Text color="text.secondary">Risk State:</Text>
          <Text as="strong" color={status === 'error' ? 'danger' : status === 'warn' ? 'warning' : 'success'}>
            {status === 'error' ? 'Exposed' : status === 'warn' ? 'Weakened' : 'Secured'}
          </Text>
        </Flex>
        
        {Object.entries(details).map(([key, val]) => (
          <Flex key={key} justify="space-between" borderBottom="1px solid" borderColor="rgba(255,255,255,0.02)" pb="1.5">
            <Text color="text.secondary">{key}:</Text>
            <Text as="span" fontWeight="bold" fontFamily="mono" color="text.primary">{String(val)}</Text>
          </Flex>
        ))}
      </VStack>

      {alertText && (
        <Box
          mt="3"
          p="3"
          bg="rgba(239, 68, 68, 0.05)"
          border="1px solid"
          borderColor="rgba(239, 68, 68, 0.15)"
          borderRadius="8px"
          fontSize="12px"
        >
          <Flex align="center" gap="1.5" fontWeight="bold" color="danger" mb="1">
            <AlertTriangle size={12} />
            <Text>Active Finding Alert:</Text>
          </Flex>
          <Text color="text.secondary" lineHeight="1.4">{alertText}</Text>
        </Box>
      )}
    </VStack>
  );
};

// 12. Activity Feed (Logs)
interface ActivityFeedProps {
  logs: string[];
  filter: 'ALL' | 'INFO' | 'WARN' | 'ERROR';
  onFilterChange: (filter: 'ALL' | 'INFO' | 'WARN' | 'ERROR') => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  logs,
  filter,
  onFilterChange
}) => {
  const filtered = logs.filter(log => {
    if (filter === 'ALL') return true;
    return log.toUpperCase().includes(`[${filter}]`);
  });

  return (
    <Box className="terminal-container" height="360px" display="flex" flexDirection="column">
      <Flex className="terminal-header" justify="space-between" align="center" px="4" py="3">
        <Flex gap="1.5">
          <Box w="2" h="2" borderRadius="full" bg="#EF4444" />
          <Box w="2" h="2" borderRadius="full" bg="#F5A524" />
          <Box w="2" h="2" borderRadius="full" bg="#3B82F6" />
        </Flex>
        
        <Flex gap="1.5">
          {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map(f => (
            <Button 
              key={f} 
              onClick={() => onFilterChange(f)}
              size="xs"
              variant={filter === f ? 'solid' : 'ghost'}
              colorPalette={filter === f ? 'info' : 'gray'}
              fontSize="9px"
              h="20px"
              px="2"
              fontFamily="mono"
            >
              {f}
            </Button>
          ))}
        </Flex>
      </Flex>
      <Box className="terminal-body" flex="1" overflowY="auto" fontFamily="mono" fontSize="12px" p="4">
        {filtered.map((line, idx) => {
          let color = 'rgba(255,255,255,0.7)';
          if (line.includes('[Error]') || line.toUpperCase().includes('[ERROR]')) color = '#EF4444';
          else if (line.includes('[Warn]') || line.toUpperCase().includes('[WARN]')) color = '#F5A524';
          else if (line.includes('[Info]') || line.toUpperCase().includes('[INFO]')) color = '#3B82F6';

          return (
            <Box key={idx} color={color} mb="1" whiteSpace="pre-wrap">
              {line}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// 13. AI Recommendation Card
interface AIRecommendationCardProps {
  title: string;
  description: string;
  onApplyClick?: () => void;
  buttonText?: string;
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  title,
  description,
  onApplyClick,
  buttonText = 'Implement Mitigation'
}) => {
  return (
    <Box
      bg="rgba(59, 130, 246, 0.05)"
      border="1px solid"
      borderColor="rgba(59, 130, 246, 0.2)"
      borderRadius="12px"
      p="4"
      display="flex"
      flexDirection="column"
      gap="3"
    >
      <Box>
        <Heading as="h4" fontSize="14px" fontWeight="bold" color="info" display="flex" alignItems="center" gap="2">
          <Terminal size={14} />
          <Text as="span">{title}</Text>
        </Heading>
        <Text fontSize="12px" color="text.secondary" mt="1.5" lineHeight="1.4">
          {description}
        </Text>
      </Box>

      {onApplyClick && (
        <Button 
          colorPalette="cyber"
          onClick={onApplyClick}
          w="full"
          size="sm"
          fontSize="11px"
          h="32px"
        >
          {buttonText}
        </Button>
      )}
    </Box>
  );
};
