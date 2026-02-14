/** PRISM Orchestration Tools */
export const orchestrationTools = [
  { name: 'prism_agent_list', description: 'List available agents', inputSchema: { type: 'object', properties: { tier: { type: 'string' }, capability: { type: 'string' } } } },
  { name: 'prism_agent_invoke', description: 'Invoke single agent', inputSchema: { type: 'object', required: ['agent_id', 'task'], properties: { agent_id: { type: 'string' }, task: { type: 'string' }, context: { type: 'object' }, timeout_ms: { type: 'integer' } } } },
  { name: 'prism_agent_swarm', description: 'Execute parallel agent swarm', inputSchema: { type: 'object', required: ['agents', 'tasks'], properties: { agents: { type: 'array' }, tasks: { type: 'array' }, pattern: { type: 'string' }, max_parallel: { type: 'integer' } } } },
  { name: 'prism_agent_coordinate', description: 'Coordinate agents for complex task', inputSchema: { type: 'object', required: ['task'], properties: { task: { type: 'string' }, auto_select: { type: 'boolean' }, budget_limit: { type: 'number' } } } },
  { name: 'prism_agent_status', description: 'Get status of running agent', inputSchema: { type: 'object', required: ['execution_id'], properties: { execution_id: { type: 'string' } } } },
  { name: 'prism_agent_result', description: 'Get result from completed agent', inputSchema: { type: 'object', required: ['execution_id'], properties: { execution_id: { type: 'string' } } } },
  { name: 'prism_workflow_start', description: 'Start a workflow execution', inputSchema: { type: 'object', required: ['workflow_id'], properties: { workflow_id: { type: 'string' }, inputs: { type: 'object' }, async: { type: 'boolean' } } } },
  { name: 'prism_workflow_status', description: 'Get workflow execution status', inputSchema: { type: 'object', required: ['execution_id'], properties: { execution_id: { type: 'string' } } } },
  { name: 'prism_workflow_cancel', description: 'Cancel running workflow', inputSchema: { type: 'object', required: ['execution_id'], properties: { execution_id: { type: 'string' } } } },
  { name: 'prism_ralph_loop', description: 'Execute Ralph validation loop', inputSchema: { type: 'object', required: ['target', 'validators'], properties: { target: { type: 'string' }, validators: { type: 'array' }, iterations: { type: 'integer' }, convergence_threshold: { type: 'number' } } } },
];
export default orchestrationTools;
