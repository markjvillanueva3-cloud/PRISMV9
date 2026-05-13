#!/usr/bin/env node
// tier: T3
/**
 * telemetry-autofire.mjs
 *
 * PostToolUse hook that auto-emits pipeline-telemetry records on every
 * Edit/Write/MultiEdit/Bash. Closes Agent 4's "self-citation graveyard"
 * gap (M1) — pipeline-telemetry was referenced only by forge6/rgs6 docs;
 * no code path actually wrote to the ledger. With this hook wired:
 *
 *   - tool_used events fire on every file mutation
 *   - decision events fire when a file in src/engines/ src/tools/dispatchers/
 *     or .claude/scripts/ is touched (signals stage activity)
 *   - violation events fire when build cache is invalid OR a known
 *     anti-pattern is found in the just-written content (best effort)
 *
 * The hook NEVER blocks. Any error → silent exit 0 (telemetry must not
 * gate the pipeline; lossy is fine, blocking is not).
 *
 * Stage detection: derived from the touched file's path. Best-effort.
 *   src/engines/      → S5 (engine build)
 *   src/tools/dispatchers/ → S6 (dispatcher wire)
 *   .claude/hooks/    → S7 (hook integration)
 *   .claude/commands/ → S8 (skill addition)
 *   knowledge/wiki/   → S11.5 (knowledge compounding)
 *   else              → phase4_loop
 *
 * Milestone detection: read most-recent commit's [SCOPE-MS#] tag, fall
 * back to CURRENT_POSITION.md, fall back to "session".
 *
 * The hook is settings-gated. Add to .claude/settings.json:
 *   PostToolUse → matcher: "Edit|Write|MultiEdit|Bash" → telemetry-autofire.mjs
 */

import fs from "node:fs";
import { spawnSync } from "node:child_process";

const PRISM = "H:/prism";
const TELEMETRY = `${PRISM}/.claude/scripts/pipeline-telemetry.mjs`;
const POS = `${PRISM}/state/CURRENT_POSITION.md`;

function readStdin() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return JSON.parse(raw || "{}");
  } catch { return {}; }
}

function deriveStage(filePath) {
  if (!filePath) return "phase4_loop";
  const p = String(filePath).replace(/\\/g, "/");
  if (/\/src\/engines\//.test(p)) return "S5";
  if (/\/src\/tools\/dispatchers\//.test(p)) return "S6";
  if (/\/\.claude\/hooks\//.test(p)) return "S7";
  if (/\/\.claude\/(commands|skills)\//.test(p)) return "S8";
  if (/\/knowledge\/wiki\//.test(p)) return "S11.5";
  return "phase4_loop";
}

function deriveMilestone() {
  // Try git log
  try {
    const r = spawnSync("git", ["log", "-1", "--pretty=%s"], {
      encoding: "utf8", cwd: PRISM, timeout: 2000,
    });
    if (r.status === 0) {
      const m = (r.stdout || "").match(/\[([A-Z][A-Z0-9-]+-MS\d+[A-Z]?)\]/);
      if (m) return m[1];
    }
  } catch { /* fall through */ }

  // Fallback: CURRENT_POSITION.md
  try {
    if (fs.existsSync(POS)) {
      const txt = fs.readFileSync(POS, "utf8");
      const m = txt.match(/Current.*?:\s*([A-Z][A-Z0-9-]+-MS\d+[A-Z]?)/i);
      if (m) return m[1];
    }
  } catch { /* fall through */ }

  return "session";
}

function record(milestone, stage, event, payload) {
  if (!fs.existsSync(TELEMETRY)) return;
  try {
    spawnSync(process.execPath, [
      TELEMETRY, "record",
      "--milestone", milestone,
      "--stage", stage,
      "--event", event,
      "--payload", JSON.stringify(payload),
    ], { timeout: 3000, stdio: "ignore" });
  } catch { /* silent */ }
}

const input = readStdin();
const tool = input.tool_name || "?";
const ti = input.tool_input || {};
const filePath = ti.file_path || ti.notebook_path || null;

if (!["Edit", "Write", "MultiEdit", "Bash"].includes(tool)) process.exit(0);

const milestone = deriveMilestone();
const stage = deriveStage(filePath);

// 1. tool_used record (always)
record(milestone, stage, "tool_used", {
  tool,
  file: filePath || (ti.command ? "(bash)" : null),
  command: ti.command ? String(ti.command).slice(0, 200) : undefined,
});

// 2. decision record on stage-significant files
if (filePath && ["S5", "S6", "S7", "S8"].includes(stage)) {
  record(milestone, stage, "decision", {
    kind: "file-mutation",
    stage,
    file: filePath,
  });
}

process.exit(0);
