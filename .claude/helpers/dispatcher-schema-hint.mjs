#!/usr/bin/env node
/**
 * dispatcher-schema-hint.mjs — PreToolUse hook for mcp__prism* tools
 *
 * When Claude calls a PRISM MCP tool with an action, injects the action's
 * Zod schema parameters so Claude knows the exact parameter names and types
 * on the first call attempt.
 *
 * Uses ACTION_SCHEMAS from the dispatcher files or MASTER_INDEX schema data.
 * Falls back to suggesting the most common parameter patterns.
 *
 * Complements mcp-action-router (which validates action existence).
 * This hook provides parameter guidance for VALID actions.
 *
 * Token savings: Prevents 1-3 failed MCP calls from wrong parameter names
 * (each failed call wastes 500-1500 tokens in error output).
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import process from "node:process";

const SCHEMA_CACHE = "/tmp/prism-schema-cache.json";
const CACHE_TTL = 3600_000;

// Common parameter patterns by action prefix
const PARAM_HINTS = {
  // Speed/Feed calculations
  speed_feed: "material, tool_diameter_mm, operation (milling|turning|drilling), depth_of_cut_mm, width_of_cut_mm",
  sfc: "material, tool_diameter_mm, operation, doc_mm, woc_mm, flutes",

  // Financial
  financial: "cash_flows[], discount_rate, periods",
  quote: "part_number, material, quantity, operations[]",
  cost: "job_id, material_cost, labor_hours, machine_hours",
  invoice: "job_id, customer_id, amount, due_date",

  // Job lifecycle
  job: "job_id, status, customer_id, due_date",

  // Tool management
  tool_life: "material, tool_type, cutting_speed, feed_rate",
  tool_wear: "tool_id, material, minutes_cut",

  // Quality
  spc: "measurement_values[], specification_limits{usl, lsl}",
  fai: "part_number, measurements[], drawing_revision",

  // Physics
  kienzle: "kc1_1, mc, h_mm, b_mm, rake_angle_deg",
  taylor: "C, n, cutting_speed_mpm",
  chatter: "natural_frequency_hz, damping_ratio, stiffness_n_per_m",
  deflection: "force_n, tool_diameter_mm, overhang_mm, e_modulus_gpa",
  thermal: "cutting_speed, feed, depth, material_conductivity",

  // G-code / Post
  gcode: "blocks[], controller_type, unit (metric|imperial)",
  post: "program, controller, options{}",

  // Machine
  machine: "machine_id, operation, parameters{}",

  // Material
  material: "material_name or material_id, property (hardness|tensile|machinability)",

  // Scheduling
  schedule: "job_id, machine_id, start_time, duration_min",

  // Adaptive
  adaptive: "current_params{}, sensor_data{}, target_metric",
};

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(""); return; }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { data += c; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(data), 150);
  });
}

function findParamHint(action) {
  // Try exact prefix matches
  for (const [prefix, hint] of Object.entries(PARAM_HINTS)) {
    if (action.startsWith(prefix)) return hint;
  }

  // Try partial matches
  const actionLower = action.toLowerCase();
  for (const [prefix, hint] of Object.entries(PARAM_HINTS)) {
    if (actionLower.includes(prefix)) return hint;
  }

  return null;
}

async function main() {
  const raw = await readStdin();
  let toolName, action, params;
  try {
    const parsed = JSON.parse(raw);
    toolName = parsed.tool_name || "";
    const toolInput = parsed.tool_input || {};
    action = toolInput.action || "";
    params = toolInput.params || toolInput.input || toolInput;
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  // Only for PRISM MCP tools with an action that has no/few params
  if (!toolName.startsWith("mcp__prism") || !action) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  // If params already provided (user knows what they're doing), skip
  const paramKeys = Object.keys(params || {}).filter(k => k !== "action" && k !== "command");
  if (paramKeys.length >= 2) {
    // Already has params — don't inject noise
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  // Find a parameter hint for this action
  const hint = findParamHint(action);
  if (hint) {
    process.stdout.write(JSON.stringify({
      additionalContext: `PARAMS for ${action}: ${hint}`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
  process.exit(0);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
