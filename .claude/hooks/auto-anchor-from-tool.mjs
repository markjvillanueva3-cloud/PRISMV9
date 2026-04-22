#!/usr/bin/env node
/**
 * auto-anchor-from-tool.mjs — PostToolUse hook
 *
 * Records anchors automatically from tool-call patterns:
 *   - Edit/Write to source files → file_modified anchor
 *   - Bash containing `git commit` → milestone anchor (parses commit subject)
 *   - Bash containing test runner with non-zero exit → mark for next-pass error_resolved
 *
 * Model-aware: only fires for Opus 4.7 1M.
 * Non-blocking: never denies tool execution.
 */

import * as fs from "fs";
import * as path from "path";

function resolveSessionId() {
  const candidates = [
    process.env.CLAUDE_SESSION_ID,
    process.env.TERM_SESSION_ID,
    process.env.CLAUDE_TERMINAL_ID,
    process.env.SSH_TTY,
    process.env.WT_SESSION,
    process.ppid ? `ppid_${process.ppid}` : null,
  ];
  for (const c of candidates) {
    if (c && String(c).trim().length > 0) {
      return String(c).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
    }
  }
  return "default";
}

const SESSION_ID = resolveSessionId();
const STATE_DIR = "H:/prism/state/session-reorientation";
const STATE_FILE = path.join(STATE_DIR, `reorientation-${SESSION_ID}.json`);

function isOpus47OneMillion(payloadModel) {
  const raw = payloadModel || process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || "";
  return /(?:claude-)?opus[-.]?4[-.]?7\b|opus[-.]?4[-.]?7.*?1m/i.test(raw);
}

function generateId() {
  return `anc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {}
  return null;
}

function saveState(state) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    const tmp = `${STATE_FILE}.tmp.${process.pid}.${Date.now().toString(36)}`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, STATE_FILE);
  } catch {}
}

function recordAnchor(state, type, summary, options = {}) {
  state.anchors = state.anchors || [];
  state.anchors.push({
    id: generateId(),
    type,
    timestamp: new Date().toISOString(),
    summary: String(summary).slice(0, 200),
    files: options.files || [],
    importance: options.importance || (type === "milestone" ? 8 : type === "file_modified" ? 3 : 5),
    active: true,
    tags: options.tags || [],
    ...(options.rationale ? { rationale: options.rationale } : {}),
  });
  state.stats = state.stats || {};
  state.stats.anchorsRecorded = (state.stats.anchorsRecorded || 0) + 1;
}

async function main() {
  let input;
  try {
    input = JSON.parse(await fs.promises.readFile("/dev/stdin", "utf8"));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (!isOpus47OneMillion(input?.model)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const tool = input?.tool || input?.tool_name || "";
  const toolInput = input?.input || input?.tool_input || {};
  const result = input?.result || input?.tool_result || null;

  const state = loadState();
  if (!state) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let recorded = false;

  try {
    // Edit/Write → file_modified anchor
    if ((tool === "Edit" || tool === "Write" || tool === "MultiEdit" || tool === "NotebookEdit") && toolInput?.file_path) {
      const fp = String(toolInput.file_path);
      // Dedupe: don't record if same file was anchored within last 5 anchors
      const recent = (state.anchors || []).slice(-5);
      const alreadyAnchored = recent.some(
        (a) => a.type === "file_modified" && (a.files || []).includes(fp)
      );
      if (!alreadyAnchored) {
        recordAnchor(state, "file_modified", `${tool} ${fp.split(/[/\\]/).pop()}`, {
          files: [fp],
          importance: 3,
          tags: [`mod:${fp.split(/[/\\]/).slice(-2, -1)[0] || "?"}`],
        });
        recorded = true;
      }
    }

    // Bash with git commit → milestone anchor
    if (tool === "Bash" && typeof toolInput?.command === "string") {
      const cmd = toolInput.command;
      const commitMatch = cmd.match(/git\s+commit[\s\S]*?-m\s+(?:"\$\(cat\s+<<['"]?\w+['"]?\s*\n([^\n]+)|"([^"]+)"|'([^']+)')/);
      if (commitMatch) {
        const subject = (commitMatch[1] || commitMatch[2] || commitMatch[3] || "").trim();
        if (subject) {
          recordAnchor(state, "milestone", subject, {
            importance: 8,
            tags: ["kw:commit"],
          });
          recorded = true;
        }
      }

      // Test runner with success after prior failure → error_resolved
      // Heuristic: find prior anchor of failed test in last 10, then record resolution
      if (/vitest|jest|pytest|npm test/.test(cmd) && result) {
        const exitCode = result?.exit_code ?? result?.exitCode ?? 0;
        if (exitCode === 0) {
          // Check for prior test_failed anchor in recent history
          const recent = (state.anchors || []).slice(-15);
          const priorFailure = recent.find(
            (a) => (a.tags || []).includes("kw:test_failed")
          );
          if (priorFailure) {
            recordAnchor(state, "error_resolved", `Tests now passing (was: ${priorFailure.summary.slice(0, 80)})`, {
              importance: 6,
              tags: ["kw:test", "kw:resolved"],
            });
            recorded = true;
          }
        } else {
          recordAnchor(state, "error_resolved", `Test failure: exit ${exitCode}`, {
            importance: 5,
            tags: ["kw:test_failed"],
          });
          recorded = true;
        }
      }
    }

    if (recorded) saveState(state);
  } catch {
    // never block
  }

  console.log(JSON.stringify({ continue: true }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
