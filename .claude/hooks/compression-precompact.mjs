#!/usr/bin/env node
/**
 * compression-precompact.mjs — Context Compression Before Compact
 * ================================================================
 *
 * PreToolUse hook that triggers hierarchical compression when
 * /compact or /precompact is invoked. Uses ContextCompressionEngine
 * principles to create tier-1 summaries of session artifacts.
 *
 * FIRES ON: UserPromptSubmit (detects /compact or /precompact in prompt)
 *
 * Behavior:
 *   1. Detect compact intent in prompt
 *   2. Summarize recent file edits (head+tail+entities)
 *   3. Write compressed session summary
 *   4. Inject: "Pre-compression complete. Ratio: 4.2:1"
 */

import * as fs from "fs";
import * as path from "path";

const CHECKPOINT_STATE = "H:/prism/mcp-server/data/state/CHECKPOINT_TRACKER.json";
const COMPRESSION_OUTPUT = "H:/prism/mcp-server/data/state/SESSION_COMPRESSED.json";
const HEAD_CHARS = 200;
const TAIL_CHARS = 100;
const MAX_ENTITIES = 20;

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 200);
  });
}

function extractEntities(text) {
  // Extract identifier-like tokens (camelCase, snake_case, UPPER)
  const matches = text.match(/\b[A-Za-z_][A-Za-z0-9_]{2,40}\b/g) || [];
  const unique = [...new Set(matches)];
  return unique.slice(0, MAX_ENTITIES);
}

function compressFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf-8");
    const originalSize = content.length;

    if (originalSize <= HEAD_CHARS + TAIL_CHARS + 50) {
      return { path: filePath, tier: 0, content, ratio: 1 };
    }

    const head = content.slice(0, HEAD_CHARS);
    const tail = content.slice(-TAIL_CHARS);
    const entities = extractEntities(content);

    const summary = {
      head,
      tail,
      entities,
      originalSize,
    };

    const compressedSize = JSON.stringify(summary).length;
    const ratio = originalSize / compressedSize;

    return {
      path: filePath,
      tier: 1,
      summary,
      ratio: Math.round(ratio * 10) / 10,
    };
  } catch {
    return null;
  }
}

function loadCheckpointState() {
  try {
    if (fs.existsSync(CHECKPOINT_STATE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_STATE, "utf-8"));
    }
  } catch { /* ignore */ }
  return { filesEdited: [], editCount: 0 };
}

function writeCompressedSession(compressed) {
  try {
    const dir = path.dirname(COMPRESSION_OUTPUT);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const output = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      fileCount: compressed.length,
      avgRatio: compressed.reduce((sum, c) => sum + c.ratio, 0) / compressed.length,
      files: compressed,
    };

    fs.writeFileSync(COMPRESSION_OUTPUT, JSON.stringify(output, null, 2));
    return output;
  } catch {
    return null;
  }
}

async function main() {
  const input = await readStdin();
  const prompt = (input.prompt || input.message || "").toLowerCase();

  // Only trigger on compact-related prompts
  if (!prompt.includes("compact") && !prompt.includes("/precompact")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const state = loadCheckpointState();
  const files = state.filesEdited || [];

  if (files.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Compress recent files
  const compressed = files
    .slice(-10) // Last 10 files
    .map(compressFile)
    .filter(Boolean);

  if (compressed.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const result = writeCompressedSession(compressed);

  if (result) {
    const ctx = `📦 Pre-compression complete: ${result.fileCount} files · avg ratio ${result.avgRatio.toFixed(1)}:1`;
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: ctx,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
