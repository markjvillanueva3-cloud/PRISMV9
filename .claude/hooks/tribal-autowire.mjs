#!/usr/bin/env node
// tier: T4
/**
 * tribal-autowire.mjs — L6 of TRIBAL × AI
 *
 * PostToolUse hook. When the assistant edits/writes a file inside
 * knowledge/wiki/ or knowledge/memories/, re-embed that single file
 * into the unified tribal index by invoking
 *   node tribal-embed-index.mjs --add <path>
 *
 * Silent on success. On failure, prints to stderr but never blocks
 * (this is a learning hook, not a safety hook).
 */

import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const SCRIPT = "H:/prism/.claude/scripts/tribal-embed-index.mjs";
const MATCH = /[\\/]knowledge[\\/](wiki|memories)[\\/].+\.md$/i;

let payload = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => { payload += c; });
process.stdin.on("end", () => {
  let parsed;
  try { parsed = JSON.parse(payload); }
  catch { process.stdout.write(JSON.stringify({ continue: true })); return; }

  const tool = parsed.tool_name || parsed.toolName || "";
  if (!/^(Edit|Write|MultiEdit)$/.test(tool)) {
    process.stdout.write(JSON.stringify({ continue: true })); return;
  }

  const fp = parsed.tool_input?.file_path
          || parsed.tool_input?.filePath
          || parsed.tool_input?.path
          || "";
  if (!fp || !MATCH.test(fp.replace(/\\/g, "/"))) {
    process.stdout.write(JSON.stringify({ continue: true })); return;
  }

  const abs = path.resolve(fp);
  if (!fs.existsSync(abs)) {
    process.stdout.write(JSON.stringify({ continue: true })); return;
  }

  // Detached, fire-and-forget. Re-embed should NEVER block the chat.
  try {
    const child = spawn(process.execPath, [SCRIPT, "--add", abs], {
      detached: true, stdio: "ignore", windowsHide: true,
    });
    child.unref();
  } catch (e) {
    // swallow — never block on indexer failure
    process.stderr.write(`[tribal-autowire] spawn failed: ${e.message}\n`);
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
