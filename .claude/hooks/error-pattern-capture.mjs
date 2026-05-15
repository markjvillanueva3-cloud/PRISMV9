#!/usr/bin/env node
// tier: T2
// error-pattern-capture.mjs — EXTENSION to existing error-block-capture infrastructure.
//
// SYSTEM-VIZ-BRAIN-MS0/U-P1-ERROR-LEARN-LOOP — user directive 2026-05-15:
// "errors and mistakes, bugs, mistakes and typos are learned and avoided
//  the moment they happen so we don't waste tokens going through the same
//  process over and over again."
//
// SCOPE — additive only. The existing pair (`error-block-capture.mjs` +
// `error-block-prewarn.mjs` + `helpers/error-learn-store.mjs` +
// `/error-learn-review` skill) already covers HOOK_BLOCK + TOOL_ERROR
// decisions. This extension captures the broader class of NON-BLOCK errors
// the existing capture misses:
//
//   - Bash fork-storms (Cygwin OOM: `dofork: child -1`, xmalloc, errno 12)
//   - Ripgrep timeouts (Grep/Glob "Ripgrep search timed out")
//   - git index.lock contention (concurrent commit collisions)
//   - Edit string-not-unique / not-found errors
//   - tsc build errors (TS#### in stdout/stderr without response.error)
//   - test-fail summaries that bypass response.error
//
// Output: appends to the SAME ledger via `recordEvent()` so the existing
// prewarn surfaces these on the next similar PreToolUse. No new ledger file.
//
// Knobs:
//   PRISM_ERROR_PATTERN_EXT_DISABLE=1   no-op
//   PRISM_ERROR_PATTERN_EXT_VERBOSE=1   echo capture as additionalContext

import { readFileSync } from "node:fs";
import { recordEvent, fingerprint, fileSuffix, ERROR_CLASSES } from "../helpers/error-learn-store.mjs";

const DISABLE = process.env.PRISM_ERROR_PATTERN_EXT_DISABLE === "1";
const VERBOSE = process.env.PRISM_ERROR_PATTERN_EXT_VERBOSE === "1";

const MAX_SNIPPET = 240;

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function approve(extra) {
  const base = { continue: true };
  if (extra) Object.assign(base, extra);
  process.stdout.write(JSON.stringify(base));
}

function truncate(s, n) {
  if (!s) return "";
  s = String(s);
  return s.length > n ? s.slice(0, n) + "…" : s;
}

const DETECTORS = [
  function forkStorm(tool, out, err) {
    if (tool !== "Bash") return null;
    const text = out + "\n" + err;
    if (/fork:\s*(?:Cannot allocate memory|retry|Resource temporarily unavailable)|dofork:\s*child\s*-1|xmalloc.*cannot allocate|child_copy.*cygheap|errno\s*1[12]/i.test(text)) {
      return {
        error_class: ERROR_CLASSES.TOOL_ERROR,
        hook_id: null,
        trigger: "fork-storm",
        snippet: "Cygwin bash fork-storm — run node-process-janitor.mjs --full to reap orphans. See [[reference_harness_hang_prevention]]",
      };
    }
    return null;
  },
  function rgTimeout(tool, out, err) {
    if (!/^(Grep|Glob)$/.test(tool || "")) return null;
    const text = out + "\n" + err;
    if (/Ripgrep search timed out|ripgrep.*timed?\s*out/i.test(text)) {
      return {
        error_class: ERROR_CLASSES.TOOL_ERROR,
        hook_id: null,
        trigger: "rg-timeout",
        snippet: "Ripgrep timed out — narrow path/glob or use master_index_query / system-viz-query first. See [[reference_master_index_surface]]",
      };
    }
    return null;
  },
  function gitLock(tool, out, err) {
    if (tool !== "Bash") return null;
    const text = out + "\n" + err;
    if (/index\.lock|Another git process|unable to create.*lock/i.test(text)) {
      return {
        error_class: ERROR_CLASSES.TOOL_ERROR,
        hook_id: null,
        trigger: "git-lock-contention",
        snippet: "git index.lock contention — rm -f .git/index.lock OR fork to your own worktree. See [[feedback_conflict_fork_rule]]",
      };
    }
    return null;
  },
  function editMismatch(tool, out, err) {
    if (!/^(Edit|MultiEdit)$/.test(tool || "")) return null;
    const text = out + "\n" + err;
    if (/old_string\s+not\s+found|not\s+unique|String to replace not found|file\s+has\s+not\s+been\s+read/i.test(text)) {
      return {
        error_class: ERROR_CLASSES.TOOL_ERROR,
        hook_id: null,
        trigger: "edit-mismatch",
        snippet: truncate("Edit mismatch — re-Read the file then retry with more surrounding context for uniqueness. " + text.slice(0, 120), MAX_SNIPPET),
      };
    }
    return null;
  },
  function tscError(tool, out, err) {
    if (tool !== "Bash") return null;
    const text = out + "\n" + err;
    const m = text.match(/error\s+TS\d{4}[^\n]{0,200}/i);
    if (m) {
      return {
        error_class: ERROR_CLASSES.TYPE_ERROR,
        hook_id: null,
        trigger: "tsc",
        snippet: truncate(m[0], MAX_SNIPPET),
      };
    }
    return null;
  },
  function testFail(tool, out, err) {
    if (tool !== "Bash") return null;
    const text = out + "\n" + err;
    const m = text.match(/(?:Test\s+Files|Tests)\s*\d+\s*failed|FAIL\s+[\w./-]+\.test\.(?:ts|mjs|js)|✗\s+\w+/);
    if (m) {
      return {
        error_class: ERROR_CLASSES.TEST_FAIL,
        hook_id: null,
        trigger: "test-fail",
        snippet: truncate(m[0], MAX_SNIPPET),
      };
    }
    return null;
  },
];

function classify(tool, payload) {
  const resp = payload.tool_response || payload.toolResponse || payload.response || {};
  const stdout = String(resp.stdout || resp.output || (typeof resp === "string" ? resp : "") || "");
  const stderr = String(resp.stderr || resp.error || "");
  for (const detect of DETECTORS) {
    try {
      const hit = detect(tool, stdout, stderr);
      if (hit) return hit;
    } catch { /* never block */ }
  }
  return null;
}

function extractFile(tool, payload) {
  const inp = payload.tool_input || payload.input || {};
  if (/^(Edit|Write|MultiEdit|Read)$/.test(tool)) return inp.file_path || inp.path || "";
  if (tool === "Bash") return inp.command || "";
  return "";
}

function main() {
  if (DISABLE) { approve(); return; }
  const j = readStdin();
  if (!j) { approve(); return; }

  const tool = j.tool_name || j.toolName || j.tool || "";
  if (!tool) { approve(); return; }

  const finding = classify(tool, j);
  if (!finding) { approve(); return; }

  const fileRef = extractFile(tool, j);
  try {
    recordEvent({
      tool,
      error_class: finding.error_class,
      hook_id: finding.hook_id,
      file_suffix: fileSuffix(fileRef),
      trigger: finding.trigger,
      fingerprint: fingerprint(fileRef + " " + finding.trigger),
      snippet: finding.snippet,
    });
  } catch { /* capture must NEVER block */ }

  if (VERBOSE) {
    approve({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `⚠ error-learn extension captured trigger="${finding.trigger}" (class=${finding.error_class}) — will surface on next similar PreToolUse via error-block-prewarn.mjs`,
      },
    });
    return;
  }
  approve();
}

main();
