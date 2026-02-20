/**
 * Parallel Dispatcher Generator - Spawns 6 Claude instances to write dispatchers simultaneously
 * Uses Anthropic API with claude-sonnet-4-20250514 for speed
 */
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || fs.readFileSync('C:\\PRISM\\mcp-server\\.env', 'utf8').match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim()
});

const DISPATCHERS_DIR = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers';

// Read source files for context
function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return '// FILE NOT FOUND: ' + p; }
}

const TOOLS_DIR = 'C:\\PRISM\\mcp-server\\src\\tools';

// Template: show the pattern from a working dispatcher
const PATTERN_EXAMPLE = `
// PATTERN: Every dispatcher follows this exact structure:
import { z } from "zod";
import { log } from "../../utils/Logger.js";
// ... domain imports ...

const ACTIONS = ["action1", "action2"] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerXxxDispatcher(server: any): void {
  server.tool(
    "prism_xxx",
    \`Description (N actions). Actions: \${ACTIONS.join(", ")}\`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(\`[prism_xxx] \${action}\`);
      try {
        switch (action) {
          case "action1": { /* ... */ return ok({ result }); }
          default: return ok({ error: \`Unknown action: \${action}\`, available: ACTIONS });
        }
      } catch (err: any) {
        return ok({ error: err.message, action });
      }
    }
  );
}
`;

// Define the 6 dispatchers to generate
const TASKS = [
  {
    name: 'spDispatcher',
    file: 'spDispatcher.ts',
    exportName: 'registerSpDispatcher',
    toolName: 'prism_sp',
    description: 'Superpowers + Cognitive + ILP + Evidence + Gates (24 tools → 1)',
    sourceFiles: ['developmentProtocolTools.ts'],
    instructions: `Consolidate ALL 24 tools from developmentProtocolTools.ts into one dispatcher.
The tools are: prism_sp_brainstorm, prism_sp_plan, prism_sp_execute, prism_sp_review_spec, prism_sp_review_quality, prism_sp_debug,
prism_cognitive_init, prism_cognitive_check, prism_cognitive_bayes, prism_cognitive_rl,
prism_combination_ilp, prism_context_kv_optimize, prism_context_attention_anchor, prism_context_error_preserve,
prism_evidence_level, prism_validate_gates_full, prism_validate_mathplan.
Map to actions: brainstorm, plan, execute, review_spec, review_quality, debug, cognitive_init, cognitive_check, cognitive_bayes, cognitive_rl, combination_ilp, kv_optimize, attention_anchor, error_preserve, evidence_level, validate_gates, validate_mathplan.
Import hookEngine from "../../orchestration/HookEngine.js" and fire hooks where the source does.
Import fs and path for file operations. Use the stateDir pattern from the source.
For each action, replicate the EXACT logic from the source tool handler, just return ok(result) instead of markdown formatting.`
  },
  {
    name: 'contextDispatcher',
    file: 'contextDispatcher.ts', 
    exportName: 'registerContextDispatcher',
    toolName: 'prism_context',
    description: 'Context Engineering - Manus 6 Laws + TeammateTool (14 tools → 1)',
    sourceFiles: ['contextEngineeringTools.ts'],
    instructions: `Consolidate ALL 14 tools from contextEngineeringTools.ts into one dispatcher.
The tools implement Manus 6 Laws: KV-cache, tool masking, memory externalize/restore, todo update/read, error preserve/patterns, vary response.
Plus TeammateTool: team_spawn, team_broadcast, team_create_task, team_heartbeat.
Map to actions: kv_sort_json, kv_check_stability, tool_mask_state, memory_externalize, memory_restore, todo_update, todo_read, error_preserve, error_patterns, vary_response, team_spawn, team_broadcast, team_create_task, team_heartbeat.
Import the actual implementations from the source - look for state management via JSON files, memory externalization to filesystem, todo.md management, etc.`
  },
  {
    name: 'sessionDispatcher',
    file: 'sessionDispatcher.ts',
    exportName: 'registerSessionDispatcher', 
    toolName: 'prism_session',
    description: 'Session state + lifecycle (state 8 + sessionLifecycle 12 = 20 tools → 1)',
    sourceFiles: ['state.ts', 'sessionLifecycleTools.ts'],
    instructions: `Consolidate state.ts (8 tools) + sessionLifecycleTools.ts (12 tools) into one dispatcher.
State tools: prism_state_load, prism_state_save, prism_state_checkpoint, prism_state_diff, prism_handoff_prepare, prism_resume_session, prism_memory_save, prism_memory_recall.
Session lifecycle: prism_context_pressure, prism_context_size, prism_context_compress, prism_context_expand, prism_compaction_detect, prism_transcript_read, prism_state_reconstruct, prism_session_recover, prism_quick_resume_v2, prism_session_start_v2, prism_session_end_v2, prism_auto_checkpoint.
Map to actions: state_load, state_save, state_checkpoint, state_diff, handoff_prepare, resume_session, memory_save, memory_recall, context_pressure, context_size, context_compress, context_expand, compaction_detect, transcript_read, state_reconstruct, session_recover, quick_resume, session_start, session_end, auto_checkpoint.
NOTE: state.ts uses server.registerTool() not server.tool() - different API. Read it carefully.
Import fs/path for file ops. State files are in C:\\PRISM\\state\\.`
  },
  {
    name: 'skillScriptDispatcher',
    file: 'skillScriptDispatcher.ts',
    exportName: 'registerSkillScriptDispatcher',
    toolName: 'prism_skill_script',
    description: 'Skills + Scripts + Knowledge V2 (12+6+5 = 23 tools → 1)',
    sourceFiles: ['knowledgeV2.ts', 'skillToolsV2.ts', 'scriptToolsV2.ts'],
    instructions: `Consolidate knowledgeV2.ts (12 tools) + skillToolsV2.ts (6 tools) + scriptToolsV2.ts (5 tools) into one dispatcher.
KnowledgeV2 tools: skill_list, skill_get, skill_search, skill_find_for_task, skill_content, skill_stats, script_list, script_get, script_search, script_command, script_execute, script_stats.
SkillV2 tools: skill_load, skill_recommend, skill_analyze, skill_chain, skill_search_v2, skill_stats_v2.
ScriptV2 tools: script_execute_v2, script_queue, script_recommend, script_search_v2, script_history.
Map to actions matching the tool names (without prism_ prefix where applicable).
Import from registries: skillRegistry, scriptRegistry. Import skill/script engines as needed.`
  },
  {
    name: 'generatorDispatcher',
    file: 'generatorDispatcher.ts',
    exportName: 'registerGeneratorDispatcher',
    toolName: 'prism_generator',
    description: 'Hook generator tools (7 tools → 1)',
    sourceFiles: ['generatorTools.ts'],
    instructions: `Consolidate ALL tools from generatorTools.ts into one dispatcher.
The tools are: get_hook_generator_stats, list_hook_domains, generate_hooks, generate_hooks_batch, validate_generated_hooks, get_domain_template.
Plus any 7th tool in that file.
Map to actions: stats, list_domains, generate, generate_batch, validate, get_template.
This is a small file - replicate the logic precisely.`
  },
  {
    name: 'guardDispatcher',
    file: 'guardDispatcher.ts',
    exportName: 'registerGuardDispatcher',
    toolName: 'prism_guard',
    description: 'Reasoning + Enforcement + AutoHook diagnostics (3+3+2 = 8 tools → 1)',
    sourceFiles: ['reasoningTools.ts', 'enforcementTools.ts', 'autoHookWrapper.ts'],
    instructions: `Consolidate reasoningTools.ts (3) + enforcementTools.ts (3) + autoHookWrapper.ts (2 diagnostic tools) into one dispatcher.
Reasoning: prism_decision_log (record/search/revisit/list), prism_failure_library (record/check/stats/search), prism_error_capture.
Enforcement: prism_pre_write_gate (approve/check/status), prism_pre_write_diff (register_read/check_write/status), prism_pre_call_validate.
AutoHook: prism_autohook_status, prism_autohook_test.
Map to actions: decision_log, failure_library, error_capture, pre_write_gate, pre_write_diff, pre_call_validate, autohook_status, autohook_test.
Each of the first 5 has sub-actions via params.action - pass through to the underlying implementation.`
  }
];

// Generate a dispatcher via Claude API
async function generateDispatcher(task) {
  const startTime = Date.now();
  console.log(`[${task.name}] Starting generation...`);
  
  // Read all source files for this dispatcher
  const sourceContents = task.sourceFiles.map(f => {
    const content = readFile(path.join(TOOLS_DIR, f));
    return `=== SOURCE: ${f} ===\n${content}`;
  }).join('\n\n');
  
  const prompt = `You are a TypeScript code generator for the PRISM MCP server. Generate a COMPLETE dispatcher file.

${PATTERN_EXAMPLE}

TASK: Create ${task.file}
- Export function: ${task.exportName}
- Tool name: "${task.toolName}"
- Description: ${task.description}

INSTRUCTIONS:
${task.instructions}

SOURCE FILES TO CONSOLIDATE:
${sourceContents}

CRITICAL RULES:
1. Output ONLY the TypeScript code. No markdown fences, no explanations.
2. Follow the EXACT pattern shown above (z.enum ACTIONS, ok() helper, switch/case).
3. Import paths use "../../" prefix (file is in src/tools/dispatchers/).
4. Every action must have working logic - NO placeholders, NO TODOs.
5. Return ok(data) with JSON - NO markdown formatting.
6. Handle errors with try/catch, return ok({ error: err.message }).
7. Use \`params\` (Record<string, any>) for all action parameters.
8. Match the EXACT import paths from the source files (adjust ../../ prefix).
9. If source uses fs/path, import them.
10. Keep it compact but complete - every tool's core logic must be preserved.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    let code = response.content[0].text;
    
    // Strip markdown fences if present
    code = code.replace(/^```typescript\n?/m, '').replace(/^```\n?$/m, '').trim();
    
    const outputPath = path.join(DISPATCHERS_DIR, task.file);
    fs.writeFileSync(outputPath, code, 'utf8');
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const lines = code.split('\n').length;
    console.log(`[${task.name}] ✅ Done in ${elapsed}s — ${lines} lines → ${task.file}`);
    return { name: task.name, success: true, lines, elapsed, tokens: response.usage };
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[${task.name}] ❌ Failed in ${elapsed}s: ${err.message}`);
    return { name: task.name, success: false, error: err.message, elapsed };
  }
}

// Main: run all 6 in parallel
async function main() {
  console.log(`\n🚀 Spawning 6 Claude instances in parallel...\n`);
  const startTime = Date.now();
  
  const results = await Promise.all(TASKS.map(t => generateDispatcher(t)));
  
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 PARALLEL GENERATION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total time: ${totalElapsed}s (wall clock)`);
  console.log(`Succeeded: ${succeeded}/6`);
  if (failed > 0) console.log(`Failed: ${failed}/6`);
  
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    const detail = r.success ? `${r.lines} lines, ${r.elapsed}s` : r.error;
    console.log(`  ${icon} ${r.name}: ${detail}`);
    if (r.tokens) {
      console.log(`     Tokens: ${r.tokens.input_tokens} in / ${r.tokens.output_tokens} out`);
    }
  });
  
  console.log(`\nFiles written to: ${DISPATCHERS_DIR}`);
}

main().catch(console.error);
