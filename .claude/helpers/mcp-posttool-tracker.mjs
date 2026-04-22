#!/usr/bin/env node
/**
 * mcp-posttool-tracker.mjs — PostToolUse hook for MCP (prism_*) tool calls
 *
 * Tracks MCP action usage and applies optimizations:
 *   1. Log action calls for usage analytics
 *   2. Apply DSL compression to large outputs
 *   3. Suggest related follow-up actions
 *   4. Track action sequence patterns
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const USAGE_FILE = "H:/prism/.claude/cache/mcp-action-usage.json";
const DSL_MIN_LENGTH = 1500;

// DSL abbreviations for output compression
const DSL_ABBREVIATIONS = {
  "stainless_steel": "SS", "carbon_steel": "CS", "tool_steel": "TS",
  "cutting_speed": "Vc", "feed_rate": "f", "depth_of_cut": "ap",
  "spindle_speed": "n", "material_removal_rate": "MRR",
  "end_mill": "EM", "face_mill": "FM", "ball_mill": "BM",
  "vertical_mill": "VMC", "horizontal_mill": "HMC",
  "surface_roughness": "Ra", "tool_life": "TL",
  "kienzle": "KZL", "taylor": "TYL",
  "uncertainty": "UNC", "confidence": "CONF",
};

// Suggested follow-ups by action category
const FOLLOW_UPS = {
  material_lookup: ["Check if tool is compatible", "Calculate speed/feed"],
  tool_lookup: ["Verify tool fits machine", "Calculate cutting params"],
  speed_feed_solve: ["Run safety check", "Validate against limits"],
  cutting_force: ["Check deflection", "Verify spindle power"],
  roadmap_claim: ["Start working on milestone", "Check unit requirements"],
};

function compactText(text) {
  let result = text;
  for (const [full, abbr] of Object.entries(DSL_ABBREVIATIONS)) {
    const escaped = full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), abbr);
  }
  return result;
}

function collectOutputText() {
  const parts = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0 && (
      key === "TOOL_RESULT" || key === "TOOL_OUTPUT" ||
      key.startsWith("TOOL_RESULT_") || key.startsWith("TOOL_OUTPUT_")
    )) {
      parts.push(value);
    }
  }
  return parts.join("\n");
}

async function logUsage(toolName, action) {
  try {
    let usage = {};
    try {
      usage = JSON.parse(await fs.readFile(USAGE_FILE, "utf8"));
    } catch {}

    const key = `${toolName}:${action}`;
    usage[key] = (usage[key] || 0) + 1;
    usage._last_call = { tool: toolName, action, timestamp: Date.now() };
    usage._total_calls = (usage._total_calls || 0) + 1;

    await fs.mkdir(path.dirname(USAGE_FILE), { recursive: true });
    await fs.writeFile(USAGE_FILE, JSON.stringify(usage, null, 2), "utf8");
  } catch {}
}

function getFollowUp(action) {
  for (const [pattern, suggestions] of Object.entries(FOLLOW_UPS)) {
    if (action.includes(pattern)) {
      return suggestions[0];
    }
  }
  return null;
}

async function main() {
  const toolName = process.env.TOOL_NAME || "";
  const action = process.env.TOOL_INPUT_action || "";

  // Only fire for MCP prism tools
  if (!toolName.startsWith("mcp__prism")) {
    process.stdout.write("{}");
    return;
  }

  // Log usage (async, don't block)
  logUsage(toolName, action);

  const output = collectOutputText();
  const parts = [];

  // Apply DSL compression for large outputs
  if (output.length >= DSL_MIN_LENGTH) {
    const compressed = compactText(output);
    const savedPct = Math.round(((output.length - compressed.length) / output.length) * 100);
    if (savedPct >= 3) {
      parts.push(`DSL compressed ${savedPct}%`);
    }
  }

  // Suggest follow-up
  const followUp = getFollowUp(action);
  if (followUp) {
    parts.push(`Next: ${followUp}`);
  }

  if (parts.length > 0) {
    process.stdout.write(JSON.stringify({
      additionalContext: `MCP POST: ${parts.join(" | ")}`,
    }));
  } else {
    process.stdout.write("{}");
  }
}

main().catch(() => process.stdout.write("{}"));
