import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  Handle
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Text } from '@chakra-ui/react';
import { NodeInspector } from './DesignSystemComponents';

// Custom Node component props definition
interface CustomNodeProps {
  data: {
    label: string;
    type: string;
    status: 'normal' | 'warn' | 'error';
    details: Record<string, unknown>;
  };
}

const CustomNode: React.FC<CustomNodeProps> = ({ data }) => {
  const statusColor = data.status === 'error' ? '#EF4444' : data.status === 'warn' ? '#F5A524' : '#16C784';
  const shadowGlow = `0 0 10px ${statusColor}`;

  return (
    <Box
      px="4"
      py="2.5"
      borderRadius="8px"
      bg="rgba(17,24,39,0.95)"
      border="1.5px solid"
      borderColor={statusColor}
      boxShadow={shadowGlow}
      minW="140px"
      textAlign="center"
      position="relative"
    >
      <Handle type="target" position={Position.Top} style={{ background: statusColor }} />
      
      <Text fontSize="9px" color="text.muted" textTransform="uppercase" letterSpacing="0.5px">
        {data.type}
      </Text>
      <Text fontSize="12px" fontWeight="bold" color="text.primary" mt="0.5">
        {data.label}
      </Text>

      <Handle type="source" position={Position.Bottom} style={{ background: statusColor }} />
    </Box>
  );
};

// Register custom node templates in React Flow
const nodeTypes = {
  infraNode: CustomNode
};

interface TopologyCanvasProps {
  nodesList?: any[];
  edgesList?: any[];
  findingsData?: any[];
  onInspectNode?: (nodeId: string) => void;
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  nodesList = [],
  edgesList = [],
  findingsData = [],
  onInspectNode
}) => {
  // Map incoming database nodes into React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    if (nodesList.length === 0) {
      // Default fallback demo topology
      return [
        {
          id: 'tenant',
          type: 'infraNode',
          data: { label: 'Sentinel Corp', type: 'Tenant', status: 'normal', details: { id: 'sentinel' } },
          position: { x: 250, y: 0 }
        },
        {
          id: 'site',
          type: 'infraNode',
          data: { label: 'Primary Datacenter', type: 'Site', status: 'normal', details: { id: 'site-1' } },
          position: { x: 250, y: 100 }
        },
        {
          id: 'machine',
          type: 'infraNode',
          data: { label: 'DB-Server-01', type: 'Machine', status: 'error', details: { RAM: '64GB', IP: '10.0.0.12' } },
          position: { x: 250, y: 200 }
        },
        {
          id: 'os',
          type: 'infraNode',
          data: { label: 'Windows Server 2022', type: 'OS', status: 'normal', details: { Patch: 'KB502369', Version: '21H2' } },
          position: { x: 100, y: 320 }
        },
        {
          id: 'svc_sql',
          type: 'infraNode',
          data: { label: 'MSSQLSERVER', type: 'Service', status: 'error', details: { Port: 1433, State: 'Stopped' } },
          position: { x: 400, y: 320 }
        }
      ];
    }

    return nodesList.map((node: any, index: number) => {
      let x = node.x;
      let y = node.y;
      if (x === undefined || y === undefined) {
        let hash = 0;
        const idStr = String(node.id || '');
        for (let i = 0; i < idStr.length; i++) {
          hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        x = 50 + (Math.abs(hash) % 400);
        y = 50 + (Math.abs(hash >> 8) % 300) + (index * 20) % 100;
      }

      return {
        id: node.id,
        type: 'infraNode',
        data: {
          label: node.label,
          type: node.type,
          status: node.status || 'normal',
          details: node.details || {}
        },
        position: node.position || { x, y }
      };
    });
  }, [nodesList]);

  // Map incoming relationships into React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    if (edgesList.length === 0) {
      // Default fallback demo edges
      return [
        { id: 'e-t-s', source: 'tenant', target: 'site', animated: true, label: 'HOSTS' },
        { id: 'e-s-m', source: 'site', target: 'machine', animated: true, label: 'HOSTS' },
        { id: 'e-m-o', source: 'machine', target: 'os', label: 'HOSTS' },
        { id: 'e-m-s', source: 'machine', target: 'svc_sql', label: 'RUNS', style: { stroke: '#EF4444' } }
      ];
    }

    return edgesList.map((edge: any) => ({
      id: edge.id || `e-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || 'DEPENDS_ON',
      animated: edge.animated || false,
      style: edge.style || {}
    }));
  }, [edgesList]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Keep state synchronized with incoming props changes
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Selected Node tracking and zoom scale tracking
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);

  const onMove = React.useCallback((_: any, viewport: any) => {
    setZoom(viewport.zoom);
  }, []);

  // Compute scale-aware dynamic level-of-detail nodes and edges
  const visibleNodes = useMemo(() => {
    if (zoom > 0.6) {
      return nodes;
    }

    // Zoom is <= 0.6: Aggregate OS and Service nodes under their parent Machine node
    const machines = nodes.filter(n => n.data?.type === 'Machine');
    const machineIds = new Set(machines.map(m => m.id));

    // Keep top-level boundary nodes
    const rootNodes = nodes.filter(n => n.data?.type === 'Tenant' || n.data?.type === 'Site');

    // Stats calculations per Machine
    const machineChildren: Record<string, { os: number; services: number; errors: number; warns: number }> = {};
    machineIds.forEach(id => {
      machineChildren[id] = { os: 0, services: 0, errors: 0, warns: 0 };
    });

    edges.forEach(edge => {
      if (machineIds.has(edge.source)) {
        const machineId = edge.source;
        const childNode = nodes.find(n => n.id === edge.target);
        if (childNode && childNode.data?.type !== 'Machine') {
          if (childNode.data?.type === 'OS') {
            machineChildren[machineId].os++;
          } else {
            machineChildren[machineId].services++;
          }
          if (childNode.data?.status === 'error') {
            machineChildren[machineId].errors++;
          } else if (childNode.data?.status === 'warn') {
            machineChildren[machineId].warns++;
          }
        }
      }
    });

    // Map machines with aggregated stats
    const aggregatedMachines = machines.map(machine => {
      const stats = machineChildren[machine.id];
      if (!stats || (stats.os === 0 && stats.services === 0)) {
        return machine;
      }

      const aggLabel = `${machine.data?.label || ''} (${stats.os} OS, ${stats.services} Svc)`;
      let aggStatus = machine.data?.status || 'normal';
      if (stats.errors > 0) {
        aggStatus = 'error';
      } else if (stats.warns > 0 && aggStatus !== 'error') {
        aggStatus = 'warn';
      }

      return {
        ...machine,
        data: {
          ...machine.data,
          label: aggLabel,
          status: aggStatus,
          details: {
            ...(machine.data?.details as any || {}),
            _aggregated: true,
            'Aggregated OS': stats.os,
            'Aggregated Services': stats.services,
            'Child Errors': stats.errors,
            'Child Warnings': stats.warns
          }
        }
      } as Node;
    });

    return [...rootNodes, ...aggregatedMachines] as Node[];
  }, [nodes, edges, zoom]);

  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return edges.filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  }, [edges, visibleNodes]);

  const onNodeClick = (_: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
    if (onInspectNode) {
      onInspectNode(node.id);
    }
  };

  const selectedNode = visibleNodes.find(n => n.id === selectedNodeId);

  // Extract active finding alerts for the selected node
  const activeAlert = useMemo(() => {
    if (!selectedNodeId || findingsData.length === 0) return null;
    
    // Simple substring matches for finding association in demo
    const matches = findingsData.filter(f => 
      f.Title.toLowerCase().includes(selectedNodeId.toLowerCase()) || 
      f.Description.toLowerCase().includes(selectedNodeId.toLowerCase())
    );
    return matches.length > 0 ? matches[0].Description : null;
  }, [selectedNodeId, findingsData]);

  return (
    <Box position="relative" w="100%" h="100%" display="flex" gap="6">
      {/* 1. React Flow Viewport Canvas */}
      <Box
        flex="1"
        h="480px"
        bg="rgba(0,0,0,0.3)"
        border="1px solid rgba(255,255,255,0.1)"
        borderRadius="8px"
        overflow="hidden"
        position="relative"
      >
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onMove={onMove}
          fitView
        >
          <Background color="rgba(255,255,255,0.02)" gap={20} size={1} />
          <Controls />
          <MiniMap
            bgColor="rgba(17,24,39,0.95)"
            nodeColor={(n: any) => {
              const status = n.data?.status;
              return status === 'error' ? '#EF4444' : status === 'warn' ? '#F5A524' : '#16C784';
            }}
          />
        </ReactFlow>
      </Box>

      {/* 2. Side Inspector panel */}
      {selectedNode && (
        <Box
          w="260px"
          h="480px"
          className="glass-panel"
          p="4"
          bg="bg.card"
          border="1px solid rgba(255,255,255,0.1)"
          borderRadius="8px"
          overflowY="auto"
        >
          <Text fontSize="12px" fontWeight="bold" mb="3" color="text.primary">Node Parameter Audit</Text>
          <NodeInspector
            label={selectedNode.data.label as string}
            type={selectedNode.data.type as string}
            status={selectedNode.data.status as string}
            details={(selectedNode.data.details || {}) as Record<string, unknown>}
            alertText={activeAlert}
          />
        </Box>
      )}
    </Box>
  );
};
