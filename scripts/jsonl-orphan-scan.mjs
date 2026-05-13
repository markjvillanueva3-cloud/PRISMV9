#!/usr/bin/env node
/**
 * jsonl-orphan-scan.mjs — JSONL Orphan Scanner (CLEANUP-MS0/U-CLEANUP-G3)
 *
 * Flags every `state/shared/*.jsonl` file that has lines>0 AND no codebase
 * consumer (no source / hook / doc file references its basename). Surfaces
 * the ERROR_LEDGER.jsonl-class drift: append-only files that hooks/engines
 * write to but nothing ever reads.
 *
 * Read-only / advisory-only. Exit 0 always. Operator reviews + decides
 * whether to delete, wire up, archive, or rename each orphan.
 *
 * Output:
 *   - state/shared/JSONL_ORPHAN_REPORT.json (machine)
 *   - state/shared/JSONL_ORPHAN_REPORT.md   (human)
 *
 * Usage:
 *   node scripts/jsonl-orphan-scan.mjs              # write reports
 *   node scripts/jsonl-orphan-scan.mjs --json       # stdout JSON, no MD
 *   node scripts/jsonl-orphan-scan.mjs --min-lines 10
 *   node scripts/jsonl-orphan-scan.mjs --frozen-time 2026-05-13T22:00:00Z
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-G3.
 * Companion to: scripts/audit-close-out-candidates.mjs (same advisory contract).
 */

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  statSync,
  mkdirSync,
  createReadStream,
} from "node:fs";
import { join, basename, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_REPO = "H:/prism";

// Default scan target — overridable via scanJsonlOrphans({ targetDir }).
const DEFAULT_TARGET = "state/shared";

// Where to look for files that mention a jsonl basename. Each root is walked
// recursively (bounded depth) and exclusions are applied per-directory.
const DEFAULT_SEARCH_ROOTS = [
  "mcp-server/src",
  "mcp-server/data/docs",
  "scripts",
  ".claude/hooks",
  ".claude/commands",
  ".claude/helpers",
  "knowledge/wiki",
  "CLAUDE.md",
  "AGENTS.md",
  "mcp-server/CLAUDE.md",
];

// Always probed in addition (out-of-repo Claude harness dirs on Windows).
const DEFAULT_EXTRA_ABS_ROOTS = ["H:/.claude/hooks", "H:/.claude/commands"];

// Directories we never recurse into (perf + noise).
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".vite",
  ".next",
  ".turbo",
  "system-viz",       // gigabytes of auto-regen graphs
  ".archive",         // archived dashboards
  ".serena",
  "_BUILD",
  ".plans-archive",
  "plans-archive",
]);

// File extensions we consider "consumer text". Anything binary / image /
// sqlite / pdf is skipped on size grounds even if the extension matches.
const CONSUMER_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".md", ".mdx",
  ".json", ".yaml", ".yml",
  ".sh", ".ps1", ".py",
  ".txt",
]);

const MAX_DEPTH = 8;
const MAX_CONSUMER_FILE_BYTES = 4 * 1024 * 1024; // 4 MiB — skip the elephants

// Some basenames are mentioned in places that aren't real consumers (this
// script's own output, prior scan reports, etc.). The scanner never counts
// itself or the report files it writes as consumers.
const SELF_REFERENCE_FILES = new Set([
  "JSONL_ORPHAN_REPORT.json",
  "JSONL_ORPHAN_REPORT.md",
  "jsonl-orphan-scan.mjs",
]);

// ──────────────────────────────────────────────────────────────────────
// argv parsing
// ──────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = {
    json: false,
    minLines: 1,
    frozenTime: null,
    targetDir: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--min-lines") {
      const v = Number.parseInt(argv[++i], 10);
      if (Number.isFinite(v) && v >= 0) args.minLines = v;
    } else if (a === "--frozen-time") args.frozenTime = argv[++i];
    else if (a === "--target") args.targetDir = argv[++i];
  }
  if (!args.frozenTime && process.env.PRISM_AUDIT_FROZEN_TIME) {
    args.frozenTime = process.env.PRISM_AUDIT_FROZEN_TIME;
  }
  return args;
}

// ──────────────────────────────────────────────────────────────────────
// Streaming line counter (handles GB-sized jsonls + no-trailing-newline)
// ──────────────────────────────────────────────────────────────────────

export function countLines(filePath) {
  return new Promise((resolve) => {
    let lines = 0;
    let lastByte = -1;
    let bytes = 0;
    let saw = false;
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => {
      saw = saw || chunk.length > 0;
      bytes += chunk.length;
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === 0x0a) lines++;
        lastByte = chunk[i];
      }
    });
    stream.on("end", () => {
      // Count the last partial line (file does not end with \n).
      if (saw && lastByte !== 0x0a) lines++;
      resolve({ lines, bytes });
    });
    stream.on("error", () => resolve({ lines: 0, bytes: 0, error: true }));
  });
}

// ──────────────────────────────────────────────────────────────────────
// Walk a directory tree, collect every text file we'd grep
// ──────────────────────────────────────────────────────────────────────

function walkConsumerFiles(absRoot, out, depth = 0) {
  if (depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = readdirSync(absRoot, { withFileTypes: true });
  } catch {
    return; // missing root is fine — caller already filtered against existsSync
  }
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      // Always skip dot-dirs except .claude (which is itself a search root
      // and intentionally allowed to recurse). This used to be a tangled
      // single guard that silently let through .github / .vscode / etc.
      if (ent.name.startsWith(".") && ent.name !== ".claude") continue;
      walkConsumerFiles(join(absRoot, ent.name), out, depth + 1);
    } else if (ent.isFile()) {
      const ext = extname(ent.name).toLowerCase();
      if (!CONSUMER_EXTS.has(ext)) continue;
      if (SELF_REFERENCE_FILES.has(ent.name)) continue;
      // Skip target jsonls themselves — they'd self-reference via line content.
      if (ent.name.endsWith(".jsonl")) continue;
      const abs = join(absRoot, ent.name).replace(/\\/g, "/");
      out.push(abs);
    }
  }
}

// Resolve a search-root spec (may be a relative dir, an absolute dir, or a
// single file path) against the repo root, then walk it.
function resolveAndWalk(repo, spec, out) {
  const abs = spec.includes(":") || spec.startsWith("/") ? spec : join(repo, spec);
  if (!existsSync(abs)) return;
  const st = statSync(abs);
  if (st.isFile()) {
    const ext = extname(abs).toLowerCase();
    if (CONSUMER_EXTS.has(ext)) out.push(abs.replace(/\\/g, "/"));
    return;
  }
  walkConsumerFiles(abs, out);
}

// ──────────────────────────────────────────────────────────────────────
// Find consumers for a set of basenames in one walk over the consumer set
// ──────────────────────────────────────────────────────────────────────

export function findConsumers(basenames, consumerFiles) {
  const hits = new Map(); // basename → [consumer paths]
  const meta = { skippedTooLarge: 0, skippedReadError: 0, skippedNonFile: 0 };
  if (basenames.length === 0) return { hits, meta };
  for (const b of basenames) hits.set(b, []);
  for (const file of consumerFiles) {
    let st;
    try {
      st = statSync(file);
    } catch {
      meta.skippedReadError++;
      continue;
    }
    if (!st.isFile()) { meta.skippedNonFile++; continue; }
    if (st.size > MAX_CONSUMER_FILE_BYTES) { meta.skippedTooLarge++; continue; }
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      meta.skippedReadError++;
      continue;
    }
    for (const b of basenames) {
      // Plain substring check. Filenames don't contain regex metacharacters
      // for any of our targets, so includes() is correct + safe + fast.
      if (content.includes(b)) {
        hits.get(b).push(file.replace(/\\/g, "/"));
      }
    }
  }
  return { hits, meta };
}

// ──────────────────────────────────────────────────────────────────────
// Core: scan a target dir, return a report object
// ──────────────────────────────────────────────────────────────────────

export async function scanJsonlOrphans(opts = {}) {
  const repo = opts.repo || DEFAULT_REPO;
  const targetRel = opts.targetDir || DEFAULT_TARGET;
  const absTarget = targetRel.includes(":") || targetRel.startsWith("/")
    ? targetRel
    : join(repo, targetRel);
  const minLines = Number.isFinite(opts.minLines) ? opts.minLines : 1;
  const searchRoots = Array.isArray(opts.searchRoots) ? opts.searchRoots : DEFAULT_SEARCH_ROOTS;
  const extraAbsRoots = Array.isArray(opts.extraAbsRoots)
    ? opts.extraAbsRoots
    : (opts.includeAbsRoots === false ? [] : DEFAULT_EXTRA_ABS_ROOTS);
  const now = opts.frozenTime || new Date().toISOString();

  if (!existsSync(absTarget)) {
    return {
      ok: false,
      reason: `target directory not found: ${absTarget}`,
      generated_at: now,
      candidates: [],
      stats: { totalJsonl: 0, withLines: 0, orphans: 0, consumed: 0, errors: 0 },
    };
  }

  // 1. Enumerate jsonls in the target dir (non-recursive — spec says state/shared/*.jsonl).
  let jsonls = [];
  try {
    jsonls = readdirSync(absTarget)
      .filter((n) => n.endsWith(".jsonl"))
      .sort()
      .map((n) => ({ basename: n, abs: join(absTarget, n).replace(/\\/g, "/") }));
  } catch (err) {
    return {
      ok: false,
      reason: `cannot read target dir: ${String(err && err.message || err)}`,
      generated_at: now,
      candidates: [],
      stats: { totalJsonl: 0, withLines: 0, orphans: 0, consumed: 0, errors: 0 },
    };
  }

  // 2. Count lines for each.
  const enriched = [];
  for (const { basename: b, abs } of jsonls) {
    let lineInfo = { lines: 0, bytes: 0 };
    let readErr = false;
    try {
      lineInfo = await countLines(abs);
      if (lineInfo.error) readErr = true;
    } catch {
      readErr = true;
    }
    enriched.push({ basename: b, abs, lines: lineInfo.lines, bytes: lineInfo.bytes, readErr });
  }

  // 3. Build consumer-file list once.
  const consumerFiles = [];
  for (const spec of searchRoots) resolveAndWalk(repo, spec, consumerFiles);
  for (const spec of extraAbsRoots) resolveAndWalk(repo, spec, consumerFiles);

  // 4. For jsonls with lines >= minLines, search for consumers.
  const targets = enriched.filter((e) => e.lines >= minLines && !e.readErr);
  const basenames = targets.map((e) => e.basename);
  const { hits: consumerHits, meta: consumerScanMeta } = findConsumers(basenames, consumerFiles);

  // 5. Classify.
  const orphans = [];
  const consumed = [];
  for (const e of enriched) {
    if (e.readErr) continue;
    if (e.lines < minLines) continue;
    const hits = consumerHits.get(e.basename) || [];
    const sample = hits.slice(0, 5);
    if (hits.length === 0) {
      orphans.push({
        basename: e.basename,
        abs: e.abs,
        lines: e.lines,
        bytes: e.bytes,
      });
    } else {
      consumed.push({
        basename: e.basename,
        abs: e.abs,
        lines: e.lines,
        consumerCount: hits.length,
        sampleConsumers: sample,
      });
    }
  }

  // Stable sort: most-lines-first (largest drift first).
  orphans.sort((a, b) => b.lines - a.lines || a.basename.localeCompare(b.basename));
  consumed.sort((a, b) => a.basename.localeCompare(b.basename));

  const errors = enriched.filter((e) => e.readErr).map((e) => ({
    basename: e.basename,
    reason: "read error",
  }));

  return {
    ok: true,
    schemaVersion: 1,
    generated_at: now,
    target_dir: absTarget.replace(/\\/g, "/"),
    min_lines: minLines,
    consumer_files_scanned: consumerFiles.length,
    stats: {
      totalJsonl: enriched.length,
      withLines: enriched.filter((e) => e.lines >= minLines).length,
      orphans: orphans.length,
      consumed: consumed.length,
      errors: errors.length,
      skippedTooLargeConsumers: consumerScanMeta.skippedTooLarge,
      skippedReadErrorConsumers: consumerScanMeta.skippedReadError,
    },
    orphans,
    consumed,
    errors,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Atomic file write — write to .tmp then rename so cron readers never see
// a partial JSON. Mirrors the pattern in audit-close-out-candidates.mjs.
// ──────────────────────────────────────────────────────────────────────

export function writeAtomic(absPath, content) {
  const dir = dirname(absPath);
  mkdirSync(dir, { recursive: true });
  const tmp = `${absPath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, absPath);
}

// ──────────────────────────────────────────────────────────────────────
// Markdown render
// ──────────────────────────────────────────────────────────────────────

export function renderMarkdown(report) {
  if (!report.ok) {
    return `# JSONL_ORPHAN_REPORT\n\n**ERROR:** ${report.reason}\n\nGenerated: ${report.generated_at}\n`;
  }
  const lines = [];
  lines.push("# JSONL Orphan Report");
  lines.push("");
  lines.push(`> Generated: ${report.generated_at}`);
  lines.push(`> Source: \`scripts/jsonl-orphan-scan.mjs\``);
  lines.push(`> Target: \`${report.target_dir}\``);
  lines.push(`> Min lines: ${report.min_lines}`);
  lines.push("");
  lines.push("**Rule:** Advisory only — an orphan flag means no codebase file references the basename, but doesn't prove no consumer exists (operators may grep externally). Verify before deleting; wiring up is usually the right move.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- JSONLs found: ${report.stats.totalJsonl}`);
  lines.push(`- JSONLs with ≥${report.min_lines} line(s): ${report.stats.withLines}`);
  lines.push(`- **Orphans (no consumer): ${report.stats.orphans}**`);
  lines.push(`- Consumed: ${report.stats.consumed}`);
  lines.push(`- Errors: ${report.stats.errors}`);
  lines.push(`- Consumer files scanned: ${report.consumer_files_scanned}`);
  if (report.stats.skippedTooLargeConsumers || report.stats.skippedReadErrorConsumers) {
    lines.push(`- Consumer files skipped: ${report.stats.skippedTooLargeConsumers || 0} too-large, ${report.stats.skippedReadErrorConsumers || 0} read-error`);
  }
  lines.push("");
  if (report.orphans.length > 0) {
    lines.push("## Orphans");
    lines.push("");
    lines.push("| Basename | Lines | Bytes | Path |");
    lines.push("|----------|-------|-------|------|");
    for (const o of report.orphans) {
      lines.push(`| ${o.basename} | ${o.lines} | ${o.bytes} | \`${o.abs}\` |`);
    }
    lines.push("");
  } else {
    lines.push("## Orphans");
    lines.push("");
    lines.push("_None — every jsonl with content has at least one codebase consumer._");
    lines.push("");
  }
  if (report.consumed.length > 0) {
    lines.push("<details><summary>Consumed JSONLs (collapsed)</summary>");
    lines.push("");
    lines.push("| Basename | Lines | Consumers | Sample |");
    lines.push("|----------|-------|-----------|--------|");
    for (const c of report.consumed) {
      const sample = c.sampleConsumers.map((s) => `\`${s.split("/").slice(-2).join("/")}\``).join(" · ");
      lines.push(`| ${c.basename} | ${c.lines} | ${c.consumerCount} | ${sample} |`);
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }
  if (report.errors.length > 0) {
    lines.push("## Read errors");
    lines.push("");
    for (const e of report.errors) lines.push(`- \`${e.basename}\` — ${e.reason}`);
    lines.push("");
  }
  lines.push("## What to do with an orphan");
  lines.push("");
  lines.push("1. **Wire it up** — append a reader hook/script to the codebase. Usually the right move; the data was being collected for a reason.");
  lines.push("2. **Archive** — move to `state/shared/.archive/<YYYY-MM>/` if the collection era is over but the data is worth keeping.");
  lines.push("3. **Delete** — only if the writer is also removed in the same commit.");
  lines.push("4. **Rename** — if the file should be consumed under a different name (refactor signal).");
  lines.push("");
  lines.push("Companion: `scripts/audit-close-out-candidates.mjs` (envelope-drift sister).");
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────────────
// CLI entry
// ──────────────────────────────────────────────────────────────────────

export async function runCli(argv = process.argv, opts = {}) {
  const args = parseArgs(argv);
  const repo = opts.repo || DEFAULT_REPO;
  const report = await scanJsonlOrphans({
    repo,
    targetDir: args.targetDir,
    minLines: args.minLines,
    frozenTime: args.frozenTime,
    ...opts,
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return report;
  }

  // Write both files atomically (tmp+rename). Mirrors sibling scripts so
  // cron readers never observe a partial JSON.
  const outJson = join(repo, "state/shared/JSONL_ORPHAN_REPORT.json");
  const outMd = join(repo, "state/shared/JSONL_ORPHAN_REPORT.md");
  try {
    writeAtomic(outJson, JSON.stringify(report, null, 2) + "\n");
    writeAtomic(outMd, renderMarkdown(report));
  } catch (err) {
    process.stderr.write(`jsonl-orphan-scan: write failed — ${String(err && err.message || err)}\n`);
    process.exitCode = 0; // still advisory
  }

  // Brief stdout summary.
  if (report.ok) {
    const s = report.stats;
    process.stdout.write(
      `jsonl-orphan-scan: ${s.orphans} orphan(s) / ${s.consumed} consumed / ${s.totalJsonl} total · ${report.consumer_files_scanned} consumer files scanned\n`,
    );
    if (s.orphans > 0) {
      process.stdout.write(
        `  top orphans: ${report.orphans.slice(0, 3).map((o) => `${o.basename}(${o.lines})`).join(", ")}\n`,
      );
    }
  } else {
    process.stdout.write(`jsonl-orphan-scan: not ok — ${report.reason}\n`);
  }
  return report;
}

// Run when invoked directly. Detection works across symlinks/Win path quirks.
const invokedDirectly = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  // Intentional fire-and-forget — runCli internalises all errors and never
  // throws a rejection that isn't already handled by the .catch below.
  void runCli().catch((err) => {
    process.stderr.write(`jsonl-orphan-scan: unhandled — ${String(err && err.stack || err)}\n`);
    process.exitCode = 0; // advisory: never fail CI
  });
}
