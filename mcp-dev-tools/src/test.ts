// Quick functional test for MCP Dev Tools
import { taskSpawn, taskList } from './tools/tasks.js';
import { checkpointCreate, checkpointList } from './tools/checkpoints.js';
import { semanticIndexBuild, semanticSearch } from './tools/semantic.js';
import { codeImpact } from './tools/impact.js';
import { contextWatchStart, contextWatchStop } from './tools/context.js';

async function test() {
  console.log('=== MCP Dev Tools Functional Test ===\n');
  
  // Test 1: Task spawn
  console.log('1. Testing task_spawn...');
  const task = await taskSpawn({ command: 'echo hello', label: 'test-echo' });
  console.log(`   ✓ Task spawned: ${task.task_id}\n`);
  
  // Wait for task
  await new Promise(r => setTimeout(r, 1000));
  
  // Test 2: Task list
  console.log('2. Testing task_list...');
  const tasks = taskList({});
  console.log(`   ✓ Tasks found: ${tasks.tasks.length}\n`);
  
  // Test 3: Checkpoint create
  console.log('3. Testing checkpoint_create...');
  const cp = await checkpointCreate({ label: 'test-checkpoint', paths: ['src'] });
  console.log(`   ✓ Checkpoint: ${cp.checkpoint_id} (${cp.files_captured} files)\n`);
  
  // Test 4: Semantic index
  console.log('4. Testing semantic_index_build...');
  const idx = await semanticIndexBuild({ paths: ['src'] });
  console.log(`   ✓ Indexed: ${idx.files_indexed} files, ${idx.chunks_created} chunks\n`);
  
  // Test 5: Semantic search
  console.log('5. Testing semantic_search...');
  const search = await semanticSearch({ query: 'task spawn process', top_k: 3 });
  console.log(`   ✓ Found: ${search.results.length} results\n`);
  
  // Test 6: Code impact
  console.log('6. Testing code_impact...');
  const impact = await codeImpact({ file: 'src/index.ts' });
  console.log(`   ✓ Risk: ${impact.breaking_risk}, Importers: ${impact.direct_importers.length}\n`);
  
  // Test 7: Context watch
  console.log('7. Testing context_watch_start...');
  const watcher = contextWatchStart({ paths: ['src'] });
  console.log(`   ✓ Watcher: ${watcher.watcher_id}`);
  contextWatchStop(watcher.watcher_id);
  console.log(`   ✓ Stopped\n`);
  
  console.log('=== ALL 7 TESTS PASSED ===');
}

test().catch(e => { console.error('TEST FAILED:', e); process.exit(1); });
