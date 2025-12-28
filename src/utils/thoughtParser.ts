
import { ToolExecutionLog } from '../types';
import { ThoughtNode } from '../components/ThoughtGraph';
import { NodeStatus } from '../components/TaskNode';
import { PipelineStep } from '../components/ExecutionPipeline';

/**
 * Parse tool execution logs into thought visualization nodes
 */
export const parseToolLogsToThoughtNodes = (toolLogs: ToolExecutionLog[]): ThoughtNode[] => {
  const nodes: ThoughtNode[] = [];
  const nodeMap = new Map<string, ThoughtNode>();

  toolLogs.forEach((log, index) => {
    // Determine node status
    let status: NodeStatus = 'PENDING';
    if (log.result.includes('ERROR') || log.result.includes('FAILED')) {
      status = 'ERROR';
    } else if (log.result.includes('SUCCESS') || log.result.includes('COMPLETE')) {
      status = 'SUCCESS';
    } else if (index === toolLogs.length - 1 && !log.result.includes('ERROR')) {
      status = 'PROCESSING';
    } else {
      status = 'COMPLETE';
    }

    // Extract tool name and create label
    const toolName = log.toolName;
    const label = toolName.replace(/([A-Z])/g, ' $1').trim() || 'Task';
    
    // Find parent (previous tool in sequence)
    const parentId = index > 0 ? `node-${index - 1}` : undefined;

    const node: ThoughtNode = {
      id: `node-${index}`,
      label,
      toolName,
      status,
      details: log.result.substring(0, 100),
      parentId,
      timestamp: log.timestamp
    };

    nodes.push(node);
    nodeMap.set(node.id, node);
  });

  return nodes;
};

/**
 * Parse tool execution logs into pipeline steps
 */
export const parseToolLogsToPipelineSteps = (toolLogs: ToolExecutionLog[]): PipelineStep[] => {
  return toolLogs.map((log, index) => {
    // Determine step status
    let status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'SKIPPED' = 'PENDING';
    
    if (log.result.includes('ERROR') || log.result.includes('FAILED')) {
      status = 'ERROR';
    } else if (log.result.includes('SUCCESS') || log.result.includes('COMPLETE')) {
      status = 'SUCCESS';
    } else if (index === toolLogs.length - 1) {
      status = 'PROCESSING';
    }

    // Calculate duration (if we have timestamps)
    const duration = index > 0 
      ? (log.timestamp - toolLogs[index - 1].timestamp) / 1000
      : undefined;

    // Extract error message
    const error = log.result.includes('ERROR') 
      ? log.result.match(/ERROR[:\s]+(.*)/i)?.[1] || log.result
      : undefined;

    return {
      id: `step-${index}`,
      label: log.toolName.replace(/([A-Z])/g, ' $1').trim() || 'Step',
      status,
      toolName: log.toolName,
      details: log.result.substring(0, 150),
      duration,
      error
    };
  });
};

/**
 * Extract complex task structure from tool logs
 */
export const extractTaskStructure = (toolLogs: ToolExecutionLog[]) => {
  // Group related tools
  const taskGroups: Array<{ name: string; tools: ToolExecutionLog[] }> = [];
  let currentGroup: ToolExecutionLog[] = [];

  toolLogs.forEach((log) => {
    // Detect task boundaries (e.g., new user command)
    if (log.toolName === 'SYSTEM_KERNEL' || log.toolName.includes('COMMAND')) {
      if (currentGroup.length > 0) {
        taskGroups.push({
          name: currentGroup[0].toolName,
          tools: currentGroup
        });
        currentGroup = [];
      }
    }
    currentGroup.push(log);
  });

  if (currentGroup.length > 0) {
    taskGroups.push({
      name: currentGroup[0].toolName,
      tools: currentGroup
    });
  }

  return taskGroups;
};