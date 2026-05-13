#!/usr/bin/env node
// tier: T3
/**
 * auto-record-tool-call.mjs — PostToolUse hook
 *
 * Automatically records every tool call to ToolCallParallelizationEngine
 * so /parallel-audit has data to analyze. Records both single calls and
 * detects parallel-batch context (multiple tool_use entries in same message).
 *
 * Non-blocking: never denies a call, only observes.
 */

import * as fs from "fs";
import * as path from "path";

const STATE_DIR = "H:/prism/state/tool-call-parallelization";
const SESSION_ID = process.env.CLAUDE_SESSION_ID || "default";
const STATE_FILE = path.join(STATE_DIR, `parallelization-${SESSION_ID}.json`);

// Same constants as the engine
const MAX_CALLS = 1000;
const ROUND_TRIP_TOKEN_COST = 30;

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch {}
  return { sessionId: SESSION_ID, calls: [], reports: [] };
}

function saveState(state) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    if (state.calls.length > MAX_CALLS) {
      state.calls = state.calls.slice(-MAX_CALLS);
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

function extractFiles(inputs) {
  const files = [];
  if (!inputs) return files;
  if (inputs.file_path) files.push(String(inputs.file_path));
  if (inputs.path) files.push(String(inputs.path));
  if (inputs.notebook_path) files.push(String(inputs.notebook_path));
  if (Array.isArray(inputs.paths)) {
    for (const p of inputs.paths) files.push(String(p));
  }
  return files;
}

function generateId() {
  return `tc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

async function main() {
  let input;
  try {
    const _raw = readStdinSafe();
    if (!_raw) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    input = JSON.parse(_raw);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const tool = input.tool || input.tool_name || "Other";
  const inputs = input.input || input.tool_input || {};
  // Detect parallel batch via PARALLEL_BATCH_SIZE env var or hint flag
  const inParallelBatch = !!input.parallel_batch || !!input.in_parallel_batch;

  try {
    const state = loadState();
    state.calls.push({
      id: generateId(),
      tool,
      timestamp: new Date().toISOString(),
      inputs,
      filesReferenced: extractFiles(inputs),
      inParallelBatch,
      tokenCost: ROUND_TRIP_TOKEN_COST,
    });
    saveState(state);
  } catch {
    // Silent failure — never block tool execution
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
