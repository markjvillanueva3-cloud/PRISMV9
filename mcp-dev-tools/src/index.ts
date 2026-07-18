#!/usr/bin/env node
/**
 * MCP Dev Tools Server - Main Entry Point
 * Tier 1: Background Tasks, Checkpoints, Impact Analysis, Semantic Search, Context Sync
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { taskSpawn, taskStatus, taskStream, taskKill, taskList } from './tools/tasks.js';
import { checkpointCreate, checkpointList, checkpointDiff, checkpointRestore, checkpointDelete } from './tools/checkpoints.js';
import { contextWatchStart, contextWatchStop, contextChanges, contextSnapshot } from './tools/context.js';
import { codeImpact, impactTestMap, impactDependencyGraph } from './tools/impact.js';
import { semanticIndexBuild, semanticSearch, semanticSimilar } from './tools/semantic.js';
import { cleanupAll } from './state.js';

const server = new Server({ name: 'mcp-dev-tools', version: '1.0.0' }, { capabilities: { tools: {} } });

// ============ TOOL DEFINITIONS ============
const TOOLS = [
  // Background Tasks
  { name: 'task_spawn', description: 'Start a background process (tests, builds, lints). Returns immediately with task_id.', inputSchema: { type: 'object', properties: { command: { type: 'string', description: 'Shell command to run' }, label: { type: 'string', description: 'Human-readable label' }, working_dir: { type: 'string' }, timeout_minutes: { type: 'number' }, env: { type: 'object' } }, required: ['command', 'label'] } },
  { name: 'task_status', description: 'Get status, output, and exit code of a task', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'task_stream', description: 'Get incremental output from running task (for long processes)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, since_line: { type: 'number' } }, required: ['task_id'] } },
  { name: 'task_kill', description: 'Terminate a running task', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'task_list', description: 'List all tasks with optional filtering', inputSchema: { type: 'object', properties: { status_filter: { type: 'string', enum: ['running', 'completed', 'failed', 'timeout', 'killed'] }, limit: { type: 'number' } } } },
  
  // Checkpoints
  { name: 'checkpoint_create', description: 'Snapshot current file state for rollback. Captures files as tar.gz archive.', inputSchema: { type: 'object', properties: { label: { type: 'string', description: 'Descriptive label' }, paths: { type: 'array', items: { type: 'string' }, description: 'Paths to include (default: current dir)' }, include_untracked: { type: 'boolean' } }, required: ['label'] } },
  { name: 'checkpoint_list', description: 'List available checkpoints', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
  { name: 'checkpoint_diff', description: 'Compare current state to a checkpoint', inputSchema: { type: 'object', properties: { checkpoint_id: { type: 'string' }, paths: { type: 'array', items: { type: 'string' } } }, required: ['checkpoint_id'] } },
  { name: 'checkpoint_restore', description: 'Restore files from checkpoint. Use dry_run first!', inputSchema: { type: 'object', properties: { checkpoint_id: { type: 'string' }, paths: { type: 'array', items: { type: 'string' } }, dry_run: { type: 'boolean', description: 'Preview without changing files' } }, required: ['checkpoint_id'] } },
  { name: 'checkpoint_delete', description: 'Remove a checkpoint to free space', inputSchema: { type: 'object', properties: { checkpoint_id: { type: 'string' } }, required: ['checkpoint_id'] } },
  
  // Impact Analysis
  { name: 'code_impact', description: 'Analyze impact of changing a file. Shows importers, test coverage, breaking risk.', inputSchema: { type: 'object', properties: { file: { type: 'string', description: 'File to analyze' }, line_range: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }, symbol: { type: 'string' } }, required: ['file'] } },
  { name: 'impact_test_map', description: 'Find tests that cover a file or function', inputSchema: { type: 'object', properties: { file: { type: 'string' }, function_name: { type: 'string' } }, required: ['file'] } },
  { name: 'impact_dependency_graph', description: 'Build dependency graph around a file', inputSchema: { type: 'object', properties: { file: { type: 'string' }, depth: { type: 'number', description: 'Max depth (default: 3)' }, direction: { type: 'string', enum: ['importers', 'imports', 'both'] } }, required: ['file'] } },
  
  // Semantic Search
  { name: 'semantic_index_build', description: 'Build/rebuild semantic code index for searching', inputSchema: { type: 'object', properties: { paths: { type: 'array', items: { type: 'string' } }, force_rebuild: { type: 'boolean' } } } },
  { name: 'semantic_search', description: 'Search code by meaning/concept, not just keywords', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Natural language query' }, top_k: { type: 'number' }, file_pattern: { type: 'string' }, min_score: { type: 'number' } }, required: ['query'] } },
  { name: 'semantic_similar', description: 'Find code similar to a given snippet', inputSchema: { type: 'object', properties: { file: { type: 'string' }, start_line: { type: 'number' }, end_line: { type: 'number' }, top_k: { type: 'number' } }, required: ['file', 'start_line', 'end_line'] } },
  
  // Context Sync
  { name: 'context_watch_start', description: 'Start watching paths for file changes', inputSchema: { type: 'object', properties: { paths: { type: 'array', items: { type: 'string' } }, events: { type: 'array', items: { type: 'string', enum: ['create', 'modify', 'delete', 'rename'] } }, ignore_patterns: { type: 'array', items: { type: 'string' } } }, required: ['paths'] } },
  { name: 'context_watch_stop', description: 'Stop a file watcher', inputSchema: { type: 'object', properties: { watcher_id: { type: 'string' } }, required: ['watcher_id'] } },
  { name: 'context_changes', description: 'Get file changes detected since watcher started or since timestamp', inputSchema: { type: 'object', properties: { watcher_id: { type: 'string' }, since: { type: 'string', description: 'ISO timestamp' } }, required: ['watcher_id'] } },
  { name: 'context_snapshot', description: 'Get current state of watched paths', inputSchema: { type: 'object', properties: { watcher_id: { type: 'string' } }, required: ['watcher_id'] } },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// ============ TOOL HANDLERS ============
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result: unknown;
    
    switch (name) {
      // Tasks
      case 'task_spawn': result = await taskSpawn(args as any); break;
      case 'task_status': result = taskStatus(args as any); break;
      case 'task_stream': result = taskStream(args as any); break;
      case 'task_kill': result = await taskKill(args as any); break;
      case 'task_list': result = taskList(args as any); break;
      
      // Checkpoints
      case 'checkpoint_create': result = await checkpointCreate(args as any); break;
      case 'checkpoint_list': result = checkpointList(args as any); break;
      case 'checkpoint_diff': result = await checkpointDiff(args as any); break;
      case 'checkpoint_restore': result = await checkpointRestore(args as any); break;
      case 'checkpoint_delete': result = await checkpointDelete(args as any); break;
      
      // Impact Analysis
      case 'code_impact': result = await codeImpact(args as any); break;
      case 'impact_test_map': result = await impactTestMap(args as any); break;
      case 'impact_dependency_graph': result = await impactDependencyGraph(args as any); break;
      
      // Semantic Search
      case 'semantic_index_build': result = await semanticIndexBuild(args as any); break;
      case 'semantic_search': result = await semanticSearch(args as any); break;
      case 'semantic_similar': result = await semanticSimilar(args as any); break;
      
      // Context Sync
      case 'context_watch_start': result = contextWatchStart(args as any); break;
      case 'context_watch_stop': result = contextWatchStop((args as any).watcher_id); break;
      case 'context_changes': result = contextChanges((args as any).watcher_id, (args as any).since); break;
      case 'context_snapshot': result = await contextSnapshot((args as any).watcher_id); break;
      
      default: throw new Error(`Unknown tool: ${name}`);
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true };
  }
});

// ============ MAIN ============
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Dev Tools Server v1.0.0 - 20 tools ready');
}

main().catch((error) => { console.error('Fatal error:', error); cleanupAll(); process.exit(1); });
