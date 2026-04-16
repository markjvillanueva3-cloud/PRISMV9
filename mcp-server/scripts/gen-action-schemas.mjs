#!/usr/bin/env node
/**
 * Auto-generates Zod action schemas for dispatchers that lack them.
 * Reads dispatcher file, extracts actions, infers parameter schemas from action names.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DISP_DIR = join(import.meta.dirname, '..', 'src', 'tools', 'dispatchers');
const SCHEMA_DIR = join(import.meta.dirname, '..', 'src', 'schemas');

const targets = process.argv.slice(2).filter(a => !a.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');

if (targets.length === 0) {
  console.log('Usage: node gen-action-schemas.mjs dispatcherName [--dry-run]');
  console.log('Example: node gen-action-schemas.mjs atcsDispatcher');
  process.exit(0);
}

for (const target of targets) {
  processDispatcher(target);
}

function processDispatcher(name) {
  const file = join(DISP_DIR, `${name}.ts`);
  if (!existsSync(file)) { console.error(`Not found: ${file}`); return; }

  const content = readFileSync(file, 'utf8');

  // Extract action names from z.enum, const arrays, ACTION_MAP keys, Set constructors
  const actions = new Set();

  // Match "action_name" in arrays and enums
  for (const m of content.matchAll(/["']([a-z][a-z_]+)["']/g)) {
    const a = m[1];
    // Filter out non-action strings
    if (a.length > 3 && !a.startsWith('prism_') && !a.includes('Dispatcher') &&
        !a.includes('Engine') && a !== 'text' && a !== 'string' && a !== 'object' &&
        a !== 'number' && a !== 'boolean' && a !== 'null' && a !== 'undefined' &&
        a !== 'pre_calculation' && a !== 'post_calculation' && a !== 'pre_tool' &&
        a !== 'post_tool' && a !== 'content' && a !== 'type') {
      actions.add(a);
    }
  }

  if (actions.size === 0) { console.log(`${name}: No actions found`); return; }

  // Generate schema file
  const baseName = name.replace(/Dispatcher$/, '');
  const constName = `ACTION_${baseName.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '')}_SCHEMAS`;
  const schemaFileName = `${baseName}ActionSchemas.ts`;
  const schemaPath = join(SCHEMA_DIR, schemaFileName);

  const lines = [
    `/**`,
    ` * Auto-generated Zod action schemas for ${name}`,
    ` * Generated: ${new Date().toISOString().split('T')[0]}`,
    ` */`,
    `import { z } from "zod";`,
    ``,
    `export const ${constName}: Record<string, z.ZodObject<any>> = {`,
  ];

  for (const action of [...actions].sort()) {
    const schema = inferSchema(action);
    lines.push(`  "${action}": ${schema},`);
  }

  lines.push(`};`);
  lines.push(``);

  const output = lines.join('\n');

  if (dryRun) {
    console.log(`=== ${schemaFileName} (${actions.size} schemas) ===`);
    console.log(output.slice(0, 500) + '...');
  } else {
    writeFileSync(schemaPath, output, 'utf8');
    console.log(`Wrote ${schemaPath} with ${actions.size} schemas`);
  }
}

/** Infer a reasonable Zod schema from an action name */
function inferSchema(action) {
  const parts = action.split('_');
  const fields = [];

  // Common manufacturing params based on action keywords
  if (hasAny(parts, ['calculate', 'compute', 'estimate', 'analyze', 'evaluate', 'simulate', 'predict', 'assess'])) {
    // Calculation actions typically need input params
    if (hasAny(parts, ['force', 'stress', 'torque', 'load', 'deflection', 'vibration'])) {
      fields.push('material: z.string().optional()');
      fields.push('tool_diameter: z.number().optional()');
      fields.push('depth_of_cut: z.number().optional()');
      fields.push('feed_rate: z.number().optional()');
      fields.push('cutting_speed: z.number().optional()');
    }
    if (hasAny(parts, ['thermal', 'temperature', 'heat', 'cool'])) {
      fields.push('material: z.string().optional()');
      fields.push('temperature: z.number().optional()');
      fields.push('heat_source: z.string().optional()');
    }
    if (hasAny(parts, ['speed', 'feed', 'rpm', 'rate'])) {
      fields.push('material: z.string().optional()');
      fields.push('tool_diameter: z.number().optional()');
      fields.push('operation_type: z.string().optional()');
    }
    if (hasAny(parts, ['surface', 'finish', 'roughness'])) {
      fields.push('ra_target: z.number().optional()');
      fields.push('tool_nose_radius: z.number().optional()');
      fields.push('feed_per_rev: z.number().optional()');
    }
    if (hasAny(parts, ['wear', 'life', 'tool'])) {
      fields.push('tool_material: z.string().optional()');
      fields.push('workpiece_material: z.string().optional()');
      fields.push('cutting_speed: z.number().optional()');
    }
    if (hasAny(parts, ['cost', 'quote', 'price', 'estimate'])) {
      fields.push('quantity: z.number().optional()');
      fields.push('material: z.string().optional()');
      fields.push('operations: z.array(z.string()).optional()');
    }
  }

  if (hasAny(parts, ['get', 'list', 'find', 'search', 'lookup', 'query'])) {
    // Read actions
    if (hasAny(parts, ['id'])) fields.push('id: z.string().optional()');
    fields.push('filter: z.record(z.string(), z.any()).optional()');
    fields.push('limit: z.number().optional()');
  }

  if (hasAny(parts, ['set', 'update', 'create', 'add', 'register', 'configure', 'enable', 'disable'])) {
    // Write actions
    fields.push('id: z.string().optional()');
    fields.push('data: z.record(z.string(), z.any()).optional()');
  }

  if (hasAny(parts, ['validate', 'check', 'verify', 'audit', 'inspect'])) {
    fields.push('target: z.record(z.string(), z.any()).optional()');
    fields.push('rules: z.array(z.string()).optional()');
  }

  if (hasAny(parts, ['monitor', 'watch', 'track', 'log', 'record'])) {
    fields.push('source: z.string().optional()');
    fields.push('interval_ms: z.number().optional()');
  }

  if (hasAny(parts, ['optimize', 'tune', 'adapt', 'adjust'])) {
    fields.push('target: z.string().optional()');
    fields.push('constraints: z.record(z.string(), z.any()).optional()');
    fields.push('objective: z.string().optional()');
  }

  if (hasAny(parts, ['schedule', 'plan', 'sequence', 'prioritize', 'allocate'])) {
    fields.push('jobs: z.array(z.record(z.string(), z.any())).optional()');
    fields.push('horizon_hours: z.number().optional()');
  }

  if (hasAny(parts, ['diagnose', 'troubleshoot', 'root_cause', 'failure'])) {
    fields.push('symptoms: z.array(z.string()).optional()');
    fields.push('machine_id: z.string().optional()');
    fields.push('error_code: z.string().optional()');
  }

  // If no specific fields inferred, use a generic passthrough
  if (fields.length === 0) {
    return 'z.object({}).passthrough()';
  }

  // Deduplicate fields
  const uniqueFields = [...new Set(fields)];
  return `z.object({ ${uniqueFields.join(', ')} }).passthrough()`;
}

function hasAny(parts, keywords) {
  return parts.some(p => keywords.includes(p));
}
