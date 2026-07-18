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

// Skip files larger than this when scanning (default 16 MB). The recursive state/shared scan
// otherwise tries to readFileSync 700MB+ generated dumps (system-graph.json, tribal-embed shards)
// -> heap OOM (the V8 string-cap THROW is caught, but accumulating hundred-MB strings exhausts the
// heap, which is NOT catchable). A C: path inside a multi-hundred-MB graph dump is irrelevant to
// handoff portability anyway; legit handoffs are KB and state JSONs are low-MB. Knob:
// PRISM_CROSS_PC_VERIFY_MAX_BYTES. (Bug: the CLI full-audit OOM'd on the large repo, 2026-06-14.)
const MAX_SCAN_BYTES = Number(process.env.PRISM_CROSS_PC_VERIFY_MAX_BYTES) || 16 * 1024 * 1024;

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

/**
 * Partition candidate files into {scan, skipped} by a size cap, using an INJECTED size function
 * (so it is testable without touching the filesystem). Files at/under `cap` -> scan; files over
 * the cap (or whose size can't be determined) -> skipped (recorded, never silently dropped -> R12).
 * This is the OOM guard: it stops the driver from readFileSync-ing the 700MB+ generated dumps.
 * PURE (no I/O of its own).
 * @param {string[]} files
 * @param {(f:string)=>number} statSizeFn  returns byte size for a file (may throw)
 * @param {number} [cap]
 * @returns {{scan:string[], skipped:{file:string,bytes:number|null}[]}}
 */
export function partitionBySize(files, statSizeFn, cap = MAX_SCAN_BYTES) {
  const scan = [];
  const skipped = [];
  for (const f of files ?? []) {
    let bytes = null;
    try { bytes = statSizeFn(f); } catch { bytes = null; }
    if (Number.isFinite(bytes) && bytes <= cap) scan.push(f);
    else skipped.push({ file: typeof f === "string" ? f.replace(/\\/g, "/") : String(f), bytes: Number.isFinite(bytes) ? bytes : null });
  }
  return { scan, skipped };
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
  const allFiles = [];
  for (const [rel, opts] of PROBE_DIRS) {
    const abs = join(REPO_ROOT, rel).replace(/\//g, sep);
    allFiles.push(...listFiles(abs, opts));
  }
  if (existsSync(SETTINGS_PATH)) allFiles.push(SETTINGS_PATH);
  // Size-gate BEFORE reading so the 700MB+ generated dumps never hit readFileSync (heap OOM guard).
  const { scan, skipped } = partitionBySize(allFiles, (p) => statSync(p).size);
  const findings = [];
  for (const f of scan) findings.push(...scanFile(f));
  return { findings, skipped };
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

  const { findings, skipped } = scanRepo();
  const grouped = aggregateFindings(findings);

  if (wantJson) {
    process.stdout.write(JSON.stringify({
      critical: grouped.critical.length,
      warning: grouped.warning.length,
      info: grouped.info.length,
      findings: grouped,
      skipped: { count: skipped.length, capBytes: MAX_SCAN_BYTES, files: skipped.slice(0, 20) },
    }, null, 2) + "\n");
  } else {
    let report = formatReport(grouped);
    if (skipped.length > 0) {
      const capMb = (MAX_SCAN_BYTES / 1048576).toFixed(0);
      // R12: "content UNVERIFIED" not "not handoff-relevant" -- we did NOT read these, so we cannot
      // assert they're clean (a skipped 60MB cache CAN hold a C: path). The operator verifies manually.
      report += `\n=== SKIPPED ${skipped.length} file(s) > ${capMb} MB (too large to scan; content UNVERIFIED for C: paths -- check manually if portability-critical) ===\n`;
      for (const s of skipped.slice(0, 10)) {
        report += `  ${s.file}${s.bytes != null ? ` (${(s.bytes / 1048576).toFixed(1)} MB)` : " (size unknown)"}\n`;
      }
      if (skipped.length > 10) report += `  ...and ${skipped.length - 10} more\n`;
    }
    process.stdout.write(report + "\n");
  }

  if (noFail) process.exit(0);
  if (grouped.critical.length > 0) process.exit(1);
  process.exit(0);
}

// Require a path separator before the basename so a SUPERSTRING filename (e.g. a sibling
// hook stop-cross-pc-handoff-verify.mjs that IMPORTS this module) does NOT spuriously trigger
// the full-repo audit. Normalize backslashes for Windows argv. (Bug found 2026-06-14 wiring the
// Stop-hook consumer: the old bare endsWith ran main() on import -> full recursive scan -> OOM.)
const __argvMain = (process.argv[1] || "").replace(/\\/g, "/");
if (__argvMain.endsWith("/cross-pc-handoff-verify.mjs")) {
  main();
}
