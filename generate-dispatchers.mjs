#!/usr/bin/env node
// ============================================================================
// PRISM Dispatcher Generator - Parallel Claude API Calls
// Generates TypeScript dispatcher modules that consolidate N tools → 1
// ============================================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(import.meta.dirname, '.env') });

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('❌ ANTHROPIC_API_KEY not found in .env'); process.exit(1); }

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8000;
const OUT_DIR = join(import.meta.dirname, 'src', 'tools', 'dispatchers');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ============================================================================
// DISPATCHER SPECIFICATIONS - Batch 1 (84 tools → 5 dispatchers)
// ============================================================================
const SPECS = [
  {
    name: 'prism_safety',
    desc: 'Safety-critical validations: collision detection, coolant flow, spindle protection, tool breakage prediction, workholding validation. SAFETY CRITICAL - all manufacturing safety checks consolidated.',
    sourceFiles: [
      'src/tools/collisionTools.ts',
      'src/tools/coolantValidationTools.ts',
      'src/tools/spindleProtectionTools.ts',
      'src/tools/toolBreakageTools.ts',
      'src/tools/workholdingTools.ts'
    ],
    actions: [
      'check_toolpath_collision','validate_rapid_moves','check_fixture_clearance',
      'calculate_safe_approach','detect_near_miss','generate_collision_report',
      'validate_tool_clearance','check_5axis_head_clearance',
      'validate_coolant_flow','check_through_spindle_coolant','calculate_chip_evacuation',
      'validate_mql_parameters','get_coolant_recommendations',
      'check_spindle_torque','check_spindle_power','validate_spindle_speed',
      'monitor_spindle_thermal','get_spindle_safe_envelope',
      'predict_tool_breakage','calculate_tool_stress','check_chip_load_limits',
      'estimate_tool_fatigue','get_safe_cutting_limits',
      'calculate_clamp_force_required','validate_workholding_setup',
      'check_pullout_resistance','analyze_liftoff_moment',
      'calculate_part_deflection','validate_vacuum_fixture'
    ],
    outFile: 'safetyDispatcher.ts'
  },
  {
    name: 'prism_thread',
    desc: 'Threading calculations: tap drill sizing, thread milling parameters, depth, engagement %, specifications, Go/No-Go gauges, pitch/minor/major diameters, insert selection, cutting params, fit class validation, G-code generation.',
    sourceFiles: ['src/tools/threadTools.ts'],
    actions: [
      'calculate_tap_drill','calculate_thread_mill_params','calculate_thread_depth',
      'calculate_engagement_percent','get_thread_specifications','get_go_nogo_gauges',
      'calculate_pitch_diameter','calculate_minor_major_diameter','select_thread_insert',
      'calculate_thread_cutting_params','validate_thread_fit_class','generate_thread_gcode'
    ],
    outFile: 'threadDispatcher.ts'
  },
  {
    name: 'prism_toolpath',
    desc: 'Toolpath strategy engine: strategy selection for features, parameter calculation, strategy search/list/info, statistics, material-specific strategies, PRISM novel strategies.',
    sourceFiles: ['src/tools/toolpathTools.ts'],
    actions: [
      'strategy_select','params_calculate','strategy_search','strategy_list',
      'strategy_info','stats','material_strategies','prism_novel'
    ],
    outFile: 'toolpathDispatcher.ts'
  },
  {
    name: 'prism_calc',
    desc: 'Manufacturing physics calculations: Kienzle cutting force, Taylor tool life, speed/feed optimization, Johnson-Cook flow stress, surface finish prediction, MRR, spindle power, chip load, chatter stability, tool deflection, thermal analysis, cost optimization, multi-objective optimization, productivity analysis, engagement angles, trochoidal milling, HSM parameters, scallop height, stepover optimization, cycle time estimation, arc fitting.',
    sourceFiles: [
      'src/tools/calculationsV2.ts',
      'src/tools/advancedCalculationsV2.ts',
      'src/tools/toolpathCalculationsV2.ts'
    ],
    actions: [
      'cutting_force','tool_life','speed_feed','flow_stress','surface_finish',
      'mrr','power','chip_load','stability','deflection','thermal',
      'cost_optimize','multi_optimize','productivity','engagement',
      'trochoidal','hsm','scallop','stepover','cycle_time','arc_fit'
    ],
    outFile: 'calcDispatcher.ts'
  },
  {
    name: 'prism_data',
    desc: 'Data access layer: material get/search/compare, machine get/search/capabilities, cutting tool get/search/recommend, alarm decode/search/fix, formula get/calculate.',
    sourceFiles: ['src/tools/dataAccessV2.ts'],
    actions: [
      'material_get','material_search','material_compare',
      'machine_get','machine_search','machine_capabilities',
      'tool_get','tool_search','tool_recommend',
      'alarm_decode','alarm_search','alarm_fix',
      'formula_get','formula_calculate'
    ],
    outFile: 'dataDispatcher.ts'
  }
];

// ============================================================================
// CLAUDE API CALL
// ============================================================================
async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL, max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()).content[0].text;
}

// ============================================================================
// GENERATION PROMPTS
// ============================================================================
const SYS_PROMPT = `You are a TypeScript code generator for the PRISM Manufacturing MCP server.
Generate a dispatcher module that consolidates multiple individual MCP tools into ONE dispatcher tool.

CRITICAL RULES:
1. Output ONLY valid TypeScript. No markdown fences, no explanation text.
2. Register ONE tool via server.tool(name, description, inputSchema, handler).
3. inputSchema uses zod: z.object({ action: z.enum([...actions]), params: z.record(z.any()).optional() })
4. The handler switch/cases on action, calling the ORIGINAL handler for each.
5. Import original handler functions from the source tool files.
6. For tools with empty params (like collision/thread), just call the handler directly.
7. For tools with params, spread params into the original handler call.
8. Export: export function registerXDispatcher(server: any): void
9. Include z import: import { z } from "zod";
10. Return format: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
11. The tool description MUST list all actions so LLM clients know what's available.
12. Preserve ALL safety metadata and warnings in responses.`;

function userPrompt(spec, sources) {
  return `Generate dispatcher: ${spec.name}

TOOL NAME: ${spec.name}
DESCRIPTION: ${spec.desc}
ACTIONS ENUM: ${JSON.stringify(spec.actions)}
OUTPUT FILE: src/tools/dispatchers/${spec.outFile}

SOURCE FILES (the existing implementations to wrap):
${sources.map(s => `\n=== ${s.file} ===\n${s.code}`).join('\n')}

Generate the complete TypeScript dispatcher file. Route each action to its original handler.
For parameterless handlers (empty schemas), just call the handler and return result.
For parameterized handlers, pass params through to the original function.
Output ONLY TypeScript code.`;
}

// ============================================================================
// MAIN: READ SOURCES → PARALLEL API CALLS → SAVE RESULTS
// ============================================================================
async function main() {
  console.log(`\n🚀 PRISM Dispatcher Generator`);
  console.log(`   ${SPECS.length} dispatchers, ${SPECS.reduce((n,s) => n + s.actions.length, 0)} actions total\n`);
  const t0 = Date.now();

  // 1. Read all source files
  const jobs = SPECS.map(spec => {
    const sources = spec.sourceFiles.map(file => {
      try {
        const code = readFileSync(join(import.meta.dirname, file), 'utf-8');
        return { file, code: code.length > 15000 ? code.slice(0, 15000) + '\n// ... truncated for token limit ...' : code };
      } catch (e) {
        console.warn(`  ⚠️  ${file}: ${e.message}`);
        return { file, code: '// FILE NOT FOUND' };
      }
    });
    return { spec, sources };
  });

  // 2. Fire all API calls in parallel
  console.log(`📡 Firing ${jobs.length} parallel API calls to ${MODEL}...\n`);
  const results = await Promise.all(
    jobs.map(({ spec, sources }) => {
      console.log(`  → ${spec.name} (${spec.actions.length} actions)`);
      return callClaude(SYS_PROMPT, userPrompt(spec, sources))
        .then(text => ({ spec, text, ok: true }))
        .catch(err => ({ spec, text: null, ok: false, err: err.message }));
    })
  );

  // 3. Save generated files
  console.log(`\n💾 Saving dispatchers to ${OUT_DIR}/\n`);
  let pass = 0, fail = 0;
  for (const r of results) {
    if (!r.ok) { console.error(`  ❌ ${r.spec.name}: ${r.err}`); fail++; continue; }
    let code = r.text;
    if (code.startsWith('```')) code = code.replace(/^```(?:typescript|ts)?\n?/, '').replace(/\n?```\s*$/, '');
    const out = join(OUT_DIR, r.spec.outFile);
    writeFileSync(out, code, 'utf-8');
    console.log(`  ✅ ${r.spec.name} → ${r.spec.outFile} (${code.split('\n').length} lines)`);
    pass++;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n📊 Done in ${elapsed}s — ${pass} success, ${fail} failed`);
  if (pass > 0) {
    console.log(`\n🔧 Next: review files, wire into index.ts, npm run build, restart server`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
