/**
 * error-learn-store — append-only JSONL ledger of hook-blocks and tool errors.
 *
 * Used by:
 *   error-block-capture.mjs  — PostToolUse, writes events
 *   error-block-prewarn.mjs  — PreToolUse, reads to surface warnings
 *   /error-learn-review      — skill that lists patterns + offers hook scaffolds
 *
 * Storage: mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl (one JSON object per line).
 * Bounded at 500 entries (oldest dropped on overflow) so ledger reads stay <50ms.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { writeAtomicSync } from "./atomic-write.mjs";

const LEDGER_REL = "mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl";
const MAX_ENTRIES = 500;

export const ERROR_CLASSES = {
  HOOK_BLOCK: "hook_block",
  TYPE_ERROR: "type_error",
  TEST_FAIL: "test_fail",
  TOOL_ERROR: "tool_error",
};

function findProjectRoot(startDir) {
  let cur = startDir || process.cwd();
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startDir || process.cwd();
}

function ledgerPath() {
  return path.join(findProjectRoot(), LEDGER_REL);
}

/**
 * Reduce arbitrary string content to a short stable signature for grouping.
 * 60 chars max, lowercased, collapsed whitespace, alphanumerics + a few separators.
 */
export function fingerprint(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .slice(0, 800)
    .toLowerCase()
    .replace(/[\s\r\n]+/g, " ")
    .replace(/[^a-z0-9 :=\-_/.]/g, "")
    .trim()
    .slice(0, 60);
}

export function fileSuffix(filePath) {
  if (!filePath || typeof filePath !== "string") return "";
  const base = path.basename(filePath);
  // A real filename carries no shell metacharacters/whitespace. When it
  // does, the caller passed a command string (Bash events have no file) —
  // return "" rather than emit a polluted suffix like "ts 2>&1 | tail -80"
  // that fragments error-pattern grouping.
  if (/[\s|&;<>$`*?]/.test(base)) return "";
  if (base.endsWith(".test.ts") || base.endsWith(".spec.ts")) return "test.ts";
  if (base.endsWith(".test.mjs") || base.endsWith(".spec.mjs")) return "test.mjs";
  const ext = path.extname(base).toLowerCase();
  return ext.replace(/^\./, "");
}

/**
 * Append an event. Schema:
 *   { ts, tool, error_class, hook_id?, file_suffix?, trigger?, fingerprint, snippet? }
 */
export function recordEvent(event) {
  const entry = {
    ts: new Date().toISOString(),
    tool: event.tool || "unknown",
    error_class: event.error_class || ERROR_CLASSES.TOOL_ERROR,
    hook_id: event.hook_id || null,
    file_suffix: event.file_suffix || null,
    trigger: event.trigger || null,
    fingerprint: event.fingerprint || "",
    snippet: (event.snippet || "").slice(0, 240),
  };
  const p = ledgerPath();
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, JSON.stringify(entry) + "\n");
    pruneIfNeeded(p);
  } catch {
    // Best-effort — don't crash the hook
  }
  // INTEL-OLLAMA-OBSIDIAN-MS0/P2-U02: also mirror to unified ledger via MCP.
  // Lazy import keeps the helper fast when MCP is down (timeout=4s).
  import("./unified-ledger-mirror.mjs").then((mod) => {
    mod.mirrorToUnifiedLedgerAsync({
      source: "hook_block",
      tool: entry.tool,
      errorClass: entry.error_class,
      message: entry.snippet,
      context: { hook_id: entry.hook_id, file_suffix: entry.file_suffix, trigger: entry.trigger, fingerprint: entry.fingerprint },
      ts: entry.ts,
    });
  }).catch(() => { /* mirror is best-effort */ });
  return entry;
}

function pruneIfNeeded(p) {
  try {
    const data = fs.readFileSync(p, "utf-8");
    const lines = data.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length <= MAX_ENTRIES) return;
    const trimmed = lines.slice(lines.length - MAX_ENTRIES);
    writeAtomicSync(p, trimmed.join("\n") + "\n", { fsync: false });
  } catch {
    // Best-effort
  }
}

/**
 * Read all entries (newest last). Returns array.
 */
export function readAll() {
  const p = ledgerPath();
  if (!fs.existsSync(p)) return [];
  try {
    return fs
      .readFileSync(p, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Search for past entries matching the given context. Ranked by recency-weighted frequency.
 * Returns at most `limit` matches.
 */
export function searchSimilar({ tool, file_suffix, trigger, limit = 3 }) {
  const all = readAll();
  if (all.length === 0) return [];
  const now = Date.now();
  const matched = all.filter((e) => {
    if (tool && e.tool !== tool) return false;
    if (file_suffix && e.file_suffix !== file_suffix) return false;
    if (trigger && e.trigger && !e.trigger.toLowerCase().includes(trigger.toLowerCase())) return false;
    return true;
  });
  // Group by (hook_id, fingerprint) — count occurrences, take most-recent ts
  const groups = new Map();
  for (const e of matched) {
    const key = `${e.hook_id || ""}|${e.fingerprint || ""}|${e.error_class}`;
    const g = groups.get(key) || { ...e, count: 0, latest_ts: e.ts };
    g.count += 1;
    if (e.ts > g.latest_ts) g.latest_ts = e.ts;
    groups.set(key, g);
  }
  const ranked = [...groups.values()].sort((a, b) => {
    // Recency-weighted: count + 1 / age-in-days
    const ageA = Math.max(1, (now - new Date(a.latest_ts).getTime()) / 86400000);
    const ageB = Math.max(1, (now - new Date(b.latest_ts).getTime()) / 86400000);
    return (b.count + 1 / ageB) - (a.count + 1 / ageA);
  });
  return ranked.slice(0, limit);
}

/**
 * Generate a soft-warn hook DRAFT (markdown comment) for a captured pattern.
 * Drafts are NEVER auto-activated — user reviews via /error-learn-review and
 * copies into .claude/hooks/ when ready. Hard-block hooks must always be
 * human-authored — auto-generated blocks risk locking the harness.
 */
export function proposeHookDraft(pattern) {
  const id = `learned-${(pattern.hook_id || pattern.trigger || pattern.fingerprint || "unknown")
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase()
    .slice(0, 32)}`;
  return [
    "#!/usr/bin/env node",
    `// DRAFT — review before activating. Source: ${pattern.count}× block since ${pattern.latest_ts}`,
    `// Trigger: ${pattern.trigger || "(unspecified)"}`,
    `// Hook: ${pattern.hook_id || "(no upstream hook)"}`,
    `// Severity: WARN ONLY. Never promote to hard-block without verifying false-positive rate.`,
    "import fs from 'node:fs';",
    "function readStdinSafe(){try{if(process.stdin.isTTY)return '';return fs.readFileSync(0,'utf-8');}catch{return '';}}",
    "async function main(){",
    "  const raw = readStdinSafe();",
    "  let payload; try { payload = JSON.parse(raw); } catch { console.log(JSON.stringify({continue:true})); return; }",
    `  const tool = payload.tool_name || '';`,
    `  if (tool !== '${pattern.tool}') { console.log(JSON.stringify({continue:true})); return; }`,
    `  const input = payload.tool_input || {};`,
    `  const content = input.content || input.new_string || input.command || '';`,
    `  const triggerRe = ${pattern.trigger ? `/${pattern.trigger.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&")}/i` : "/__never_match__/"};`,
    "  if (triggerRe.test(content)) {",
    "    console.log(JSON.stringify({",
    "      continue: true,",
    "      hookSpecificOutput: {",
    `        hookEventName: 'PreToolUse',`,
    `        additionalContext: '⚠️ ${id}: this pattern was blocked ${pattern.count}× before. Review before proceeding.'`,
    "      }",
    "    }));",
    "    return;",
    "  }",
    "  console.log(JSON.stringify({continue:true}));",
    "}",
    "main().catch(()=>console.log(JSON.stringify({continue:true})));",
    `export const metadata = { id: '${id}', event: 'PreToolUse', blocking: false, learned: true };`,
  ].join("\n");
}

export function clearLedger(predicate) {
  const p = ledgerPath();
  if (!fs.existsSync(p)) return 0;
  if (!predicate) {
    writeAtomicSync(p, "", { fsync: false });
    return 0;
  }
  const all = readAll();
  const kept = all.filter((e) => !predicate(e));
  writeAtomicSync(p, kept.map((e) => JSON.stringify(e)).join("\n") + (kept.length ? "\n" : ""), { fsync: false });
  return all.length - kept.length;
}
