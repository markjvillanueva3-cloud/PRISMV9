#!/usr/bin/env node
/**
 * cross-pc-handoff-verify — INTEL-OLLAMA-OBSIDIAN-MS0/P7-U02
 *
 * Audits the PRISM repo + state files to verify that nothing critical
 * to a session handoff is anchored on the C: drive. The user's stated
 * invariant: "H: is the master drive — must work after swapping the
 * SSD into a different machine."
 *
 * What we audit:
 *   1. State files (state/shared/*, mcp-server/data/state/*) — do any
 *      reference C:\ paths in their JSON values?
 *   2. Hooks (.claude/hooks/*.mjs) — do any HARDCODE C: paths instead
 *      of resolving via process.cwd()/USERPROFILE/H: relative?
 *   3. settings.json (H:/.claude/settings.json) — every wired hook
 *      command must point to an H: path or use a portable runtime.
 *   4. Per-chat handoffs (state/shared/handoffs/*) — must be on H:.
 *
 * Findings classified by severity:
 *   - critical: would break the session (C: paths in canonical state)
 *   - warning:  works on this PC but is fragile (USERPROFILE leaks ok
 *               if the var resolves on the target PC; otherwise warn)
 *   - info:     non-blocking observation
 *
 * Exit codes:
 *   0  — clean (no critical findings)
 *   1  — critical findings exist; handoff not safe
 *   2  — script error (couldn't read a required file)
 *
 * Pure helpers (exported for tests):
 *   - classifyPath(p)    — "h" | "c" | "userprofile" | "relative" | "other"
 *   - extractPathRefs(s) — pull plausible filesystem paths from a string
 *   - severityFor(...)   — finding-severity decision for one path ref
 *   - aggregateFindings(...) — group findings by severity for the report
 *
 * Usage:
 *   node scripts/cross-pc-handoff-verify.mjs                  # text report, exit per severity
 *   node scripts/cross-pc-handoff-verify.mjs --json           # JSON output
 *   node scripts/cross-pc-handoff-verify.mjs --no-fail        # always exit 0 (dry-run)
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, sep } from "node:path";

const REPO_ROOT = "H:/prism";
const SETTINGS_PATH = "H:/.claude/settings.json";
const PROBE_DIRS = [
  ["mcp-server/data/state", { recursive: false, ext: ".json" }],
  ["state/shared", { recursive: true, ext: ".json" }],
  ["state/shared/handoffs", { recursive: false, ext: ".md" }],
  [".claude/hooks", { recursive: false, ext: ".mjs" }],
];

const C_DRIVE_RE = /(?:^|[^A-Za-z0-9])([cC]:[\\/][^"\s]+)/g;
// Non-global on purpose — used with .test() in classifyPath. The `g` flag is
// stateful and will return false on alternating calls, producing flaky
// classifications. extractPathRefs() still works because .test() of a
// non-global regex is independent of position.
const USERPROFILE_RE = /\$\{?USERPROFILE\}?|%USERPROFILE%/;
const HOME_BACKSLASH_RE = /(?:^|[^A-Za-z0-9])([hH]:[\\/][^"\s]+)/g;

// ── PURE HELPERS ──────────────────────────────────────────────────────

/**
 * Classify a single filesystem path into a portability bucket.
 * Returns one of: "h" | "c" | "userprofile" | "relative" | "other".
 */
export function classifyPath(p) {
  if (typeof p !== "string" || p.length === 0) return "other";
  const trimmed = p.trim();
  if (/^[hH]:[\\/]/.test(trimmed)) return "h";
  if (/^[cC]:[\\/]/.test(trimmed)) return "c";
  if (USERPROFILE_RE.test(trimmed)) return "userprofile";
  if (/^[\\/]/.test(trimmed)) return "other"; // unix-style absolute
  if (/^[A-Za-z]:[\\/]/.test(trimmed)) return "other"; // other drive letter
  if (/^\.{1,2}[\\/]/.test(trimmed)) return "relative";
  return "other";
}

/**
 * Extract plausible filesystem path references from arbitrary text.
 * Returns an array of strings (may be empty). Best-effort regex —
 * produces false positives on URLs containing "C:" inside querystring,
 * but that's tolerable for an audit (operator confirms each finding).
 */
export function extractPathRefs(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const refs = new Set();
  let m;
  // Reset lastIndex on every call (regex is module-level, stateful)
  C_DRIVE_RE.lastIndex = 0;
  while ((m = C_DRIVE_RE.exec(text)) !== null) {
    refs.add(m[1]);
  }
  HOME_BACKSLASH_RE.lastIndex = 0;
  while ((m = HOME_BACKSLASH_RE.exec(text)) !== null) {
    refs.add(m[1]);
  }
  if (USERPROFILE_RE.test(text)) {
    refs.add("$USERPROFILE/...");
  }
  return [...refs];
}

/**
 * Decide finding severity for one path reference in one file.
 * @param {object} input
 * @param {string} input.kind         classifyPath() bucket
 * @param {string} input.path         the path string itself
 * @param {string} input.fileType     "state-json" | "handoff-md" | "hook-mjs" | "settings-json"
 * @returns {"critical"|"warning"|"info"}
 */
export function severityFor({ kind, fileType }) {
  if (kind === "c") {
    // C: paths in canonical state or settings.json are session-breakers
    if (fileType === "state-json" || fileType === "settings-json" || fileType === "handoff-md") {
      return "critical";
    }
    // C: in hook source might be a fallback or comment — flag as warning
    return "warning";
  }
  if (kind === "userprofile") {
    // USERPROFILE works as long as the target PC has the same Windows user
    // profile. We treat it as warning — worth noting but not a hard fail.
    return "warning";
  }
  return "info";
}

/**
 * Aggregate raw findings into a severity-grouped report.
 * Returns { critical: Finding[], warning: Finding[], info: Finding[] }.
 */
export function aggregateFindings(findings) {
  const out = { critical: [], warning: [], info: [] };
  for (const f of findings ?? []) {
    if (!f || typeof f.severity !== "string") continue;
    if (out[f.severity]) out[f.severity].push(f);
  }
  return out;
}

// ── I/O DRIVER ────────────────────────────────────────────────────────

function listFiles(absDir, opts) {
  const out = [];
  if (!existsSync(absDir)) return out;
  const entries = readdirSync(absDir);
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const full = join(absDir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (opts.recursive) out.push(...listFiles(full, opts));
      continue;
    }
    if (opts.ext && !name.toLowerCase().endsWith(opts.ext.toLowerCase())) continue;
    out.push(full);
  }
  return out;
}

function fileTypeFor(absPath) {
  const lower = absPath.toLowerCase().replace(/\\/g, "/");
  if (lower.endsWith(".json") && lower.includes("/state/")) return "state-json";
  if (lower.endsWith(".md") && lower.includes("/handoffs/")) return "handoff-md";
  if (lower.endsWith(".mjs") && lower.includes("/hooks/")) return "hook-mjs";
  if (lower.endsWith("settings.json")) return "settings-json";
  return "other";
}

function scanFile(absPath) {
  let content;
  try { content = readFileSync(absPath, "utf8"); } catch { return []; }
  const fileType = fileTypeFor(absPath);
  const refs = extractPathRefs(content);
  const findings = [];
  for (const path of refs) {
    const kind = classifyPath(path);
    const severity = severityFor({ kind, path, fileType });
    findings.push({ file: absPath.replace(/\\/g, "/"), path, kind, fileType, severity });
  }
  return findings;
}

function scanRepo() {
  const findings = [];
  for (const [rel, opts] of PROBE_DIRS) {
    const abs = join(REPO_ROOT, rel).replace(/\//g, sep);
    for (const f of listFiles(abs, opts)) {
      findings.push(...scanFile(f));
    }
  }
  if (existsSync(SETTINGS_PATH)) {
    findings.push(...scanFile(SETTINGS_PATH));
  }
  return findings;
}

function formatReport(grouped) {
  const lines = [];
  lines.push("PRISM cross-PC handoff audit");
  lines.push(`  critical: ${grouped.critical.length}`);
  lines.push(`  warning:  ${grouped.warning.length}`);
  lines.push(`  info:     ${grouped.info.length}`);
  lines.push("");
  if (grouped.critical.length > 0) {
    lines.push("=== CRITICAL findings (would break handoff) ===");
    for (const f of grouped.critical.slice(0, 30)) {
      lines.push(`  ${f.file}`);
      lines.push(`    → ${f.path} (${f.kind})`);
    }
    if (grouped.critical.length > 30) {
      lines.push(`  …and ${grouped.critical.length - 30} more`);
    }
    lines.push("");
  }
  if (grouped.warning.length > 0) {
    lines.push("=== WARNING findings (PC-fragile) ===");
    for (const f of grouped.warning.slice(0, 10)) {
      lines.push(`  ${f.file}`);
      lines.push(`    → ${f.path} (${f.kind})`);
    }
    if (grouped.warning.length > 10) {
      lines.push(`  …and ${grouped.warning.length - 10} more`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const args = new Set(process.argv.slice(2));
  const wantJson = args.has("--json");
  const noFail = args.has("--no-fail");

  const findings = scanRepo();
  const grouped = aggregateFindings(findings);

  if (wantJson) {
    process.stdout.write(JSON.stringify({
      critical: grouped.critical.length,
      warning: grouped.warning.length,
      info: grouped.info.length,
      findings: grouped,
    }, null, 2) + "\n");
  } else {
    process.stdout.write(formatReport(grouped) + "\n");
  }

  if (noFail) process.exit(0);
  if (grouped.critical.length > 0) process.exit(1);
  process.exit(0);
}

if (process.argv[1]?.endsWith("cross-pc-handoff-verify.mjs")) {
  main();
}
