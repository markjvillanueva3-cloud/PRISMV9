#!/usr/bin/env node
// tier: T1
/**
 * warn-redundant-read.mjs — PreToolUse hook (Read only)
 *
 * Warns when about to Read a file that was already read in this session
 * with a covering range. Helps prevent token waste from re-reads.
 *
 * Does NOT block — Claude may have a valid reason (file modified externally).
 * Records every Read to FileReadDeduplicationEngine state.
 */

import * as fs from "fs";
import * as path from "path";

const STATE_DIR = "H:/prism/state/file-read-dedup";
const SESSION_ID = process.env.CLAUDE_SESSION_ID || "default";
const STATE_FILE = path.join(STATE_DIR, `dedup-${SESSION_ID}.json`);

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch {}
  return { sessionId: SESSION_ID, reads: [], flags: [] };
}

function rangeContains(prior, proposed) {
  if (prior.limit === 0) return true;
  if (proposed.limit === 0) return false;
  const aEnd = prior.offset + prior.limit;
  const bEnd = proposed.offset + proposed.limit;
  return prior.offset <= proposed.offset && bEnd <= aEnd;
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

  const tool = input.tool || input.tool_name;
  if (tool !== "Read") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const inputs = input.input || input.tool_input || {};
  const filePath = inputs.file_path;
  if (!filePath) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  try {
    const state = loadState();
    let currentMtime = 0;
    try {
      currentMtime = fs.statSync(filePath).mtimeMs;
    } catch {}

    const proposed = {
      offset: inputs.offset || 0,
      limit: inputs.limit || 0,
    };

    for (let i = state.reads.length - 1; i >= 0; i--) {
      const prior = state.reads[i];
      if (prior.path !== filePath) continue;
      if (currentMtime && prior.fileMtimeMs !== currentMtime) break; // file modified
      if (rangeContains(prior, proposed)) {
        console.log(
          JSON.stringify({
            continue: true,
            message: `⚠️  REDUNDANT READ: ${filePath} already in context (read ${prior.id}). Reuse existing content.`,
          })
        );
        return;
      }
    }
  } catch {
    // never block on hook failure
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
