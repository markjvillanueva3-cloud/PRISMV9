#!/usr/bin/env node
// handoff-memory-seed.mjs
// SYSTEM-VIZ-BRAIN-MS0/U-P1-HANDOFF-MEMORY-SEED
//
// Append a ## MEMORY_SEED section to a per-agent handoff so the next chat
// starts with top-K distilled learnings rather than a blank slate.
//
// Sources, in order:
//   1. mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl — top-3 most-recent
//      error-class events with non-empty snippets (the "things to avoid" tier)
//   2. <obsidian-mem-dir>/reference_post_ship_*.md — most-recent (post-ship-
//      distill output — the "what just shipped" tier). Dir resolved via
//      resolveObsidianMemDir() (homedir-derived, NOT a hardcoded username).
//   3. knowledge/wiki/code-tribal/learnings/*.md — most-recent (alt distill output)
//
// Idempotent: if a `## MEMORY_SEED` section already exists, replace it.
//
// CLI:
//   node scripts/handoff-memory-seed.mjs --file <handoff.md>
//   node scripts/handoff-memory-seed.mjs --instance <claude-id>   # auto-resolve newest handoff
//   node scripts/handoff-memory-seed.mjs --dry-run                # echo the block, don't write

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import { resolveObsidianMemDir } from "./lib/obsidian-mem-dir.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const HANDOFFS_DIR = path.join(PRISM_ROOT, "state", "shared", "handoffs");
const ERROR_LEDGER = path.join(PRISM_ROOT, "mcp-server", "data", "state", "ERROR_LEARN_LEDGER.jsonl");
const OBSIDIAN_MEM_DIR = resolveObsidianMemDir();
const WIKI_LEARN_DIR = path.join(PRISM_ROOT, "knowledge", "wiki", "code-tribal", "learnings");
const TOP_ERRORS = 3;
const TOP_RECENT_MEMOS = 2;
const TOP_RECENT_LEARNINGS = 1;
const MAX_SNIPPET_LEN = 180;

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (flag) => { const i = a.indexOf(flag); return i >= 0 ? a[i + 1] : null; };
  return {
    file: get("--file"),
    instance: get("--instance"),
    dryRun: a.includes("--dry-run"),
  };
}

function truncate(s, n) {
  if (!s) return "";
  s = String(s).replace(/\r?\n/g, " ").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function readErrorLedger(limit) {
  if (!existsSync(ERROR_LEDGER)) return [];
  try {
    const raw = readFileSync(ERROR_LEDGER, "utf8");
    const entries = raw.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    // Newest last; reverse for newest-first; dedup by (error_class + trigger + hook_id)
    const seen = new Set();
    const out = [];
    for (let i = entries.length - 1; i >= 0 && out.length < limit; i--) {
      const e = entries[i];
      const key = `${e.error_class}|${e.trigger || ""}|${e.hook_id || ""}`;
      if (seen.has(key)) continue;
      if (!e.snippet || e.snippet.length < 10) continue;
      seen.add(key);
      out.push(e);
    }
    return out;
  } catch { return []; }
}

function readRecentDirEntries(dir, glob, limit) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith(".md") && (!glob || glob.test(f)))
      .map(f => {
        const p = path.join(dir, f);
        try { return { file: f, path: p, mtime: statSync(p).mtimeMs }; } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit);
  } catch { return []; }
}

function extractDescriptionLine(filePath) {
  try {
    const raw = readFileSync(filePath, "utf8");
    const desc = raw.match(/^description:\s*(.+)$/m);
    if (desc) return desc[1].trim();
    const firstH1 = raw.match(/^#\s+(.+)$/m);
    if (firstH1) return firstH1[1].trim();
    return path.basename(filePath, ".md");
  } catch { return path.basename(filePath, ".md"); }
}

function buildMemorySeed() {
  const lines = [];
  lines.push("## MEMORY_SEED");
  lines.push("_Auto-attached by `scripts/handoff-memory-seed.mjs` — top distilled signals for the next chat._");
  lines.push("");

  const recentErrors = readErrorLedger(TOP_ERRORS);
  if (recentErrors.length) {
    lines.push("### Recent error signals (avoid repeating)");
    for (const e of recentErrors) {
      const trig = e.trigger ? `\`${e.trigger}\`` : `class \`${e.error_class}\``;
      const tool = e.tool ? ` (tool=${e.tool})` : "";
      lines.push(`- ${trig}${tool} — ${truncate(e.snippet, MAX_SNIPPET_LEN)}`);
    }
    lines.push("");
  }

  const recentMemos = readRecentDirEntries(OBSIDIAN_MEM_DIR, /^reference_post_ship_/, TOP_RECENT_MEMOS);
  if (recentMemos.length) {
    lines.push("### Just-shipped distillations (Obsidian)");
    for (const m of recentMemos) {
      lines.push(`- [[${path.basename(m.file, ".md")}]] — ${truncate(extractDescriptionLine(m.path), MAX_SNIPPET_LEN)}`);
    }
    lines.push("");
  }

  const recentLearnings = readRecentDirEntries(WIKI_LEARN_DIR, null, TOP_RECENT_LEARNINGS);
  if (recentLearnings.length) {
    lines.push("### Recent wiki code-tribal learnings");
    for (const l of recentLearnings) {
      lines.push(`- \`${path.relative(PRISM_ROOT, l.path).replace(/\\\\/g, "/")}\` — ${truncate(extractDescriptionLine(l.path), MAX_SNIPPET_LEN)}`);
    }
    lines.push("");
  }

  if (lines.length <= 3) {
    lines.push("_No distilled signals available yet — ledger/memory dirs empty._");
    lines.push("");
  }

  return lines.join("\n");
}

function resolveHandoffByInstance(instance) {
  if (!existsSync(HANDOFFS_DIR)) return null;
  const files = readdirSync(HANDOFFS_DIR)
    .filter(f => f.startsWith(`HANDOFF-${instance}`) && f.endsWith(".md"))
    .map(f => {
      const p = path.join(HANDOFFS_DIR, f);
      try { return { file: f, path: p, mtime: statSync(p).mtimeMs }; } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.path || null;
}

function injectOrReplaceSeed(content, seedBlock) {
  if (/^## MEMORY_SEED$/m.test(content)) {
    return content.replace(/^## MEMORY_SEED[\s\S]*?(?=^## |\Z)/m, seedBlock + "\n");
  }
  const trimmed = content.replace(/\n+$/, "");
  return trimmed + "\n\n" + seedBlock + "\n";
}

function main() {
  const args = parseArgs();
  let filePath = args.file;
  if (!filePath && args.instance) filePath = resolveHandoffByInstance(args.instance);
  if (!filePath) {
    console.error("usage: handoff-memory-seed --file <path> | --instance <claude-id>");
    process.exit(1);
  }
  if (!existsSync(filePath)) {
    console.error(`handoff-memory-seed: file does not exist — ${filePath}`);
    process.exit(1);
  }

  const seed = buildMemorySeed();
  if (args.dryRun) {
    console.error(`handoff-memory-seed: DRY-RUN against ${filePath}`);
    console.log(seed);
    process.exit(0);
  }

  const before = readFileSync(filePath, "utf8");
  const after = injectOrReplaceSeed(before, seed);
  if (before === after) {
    console.error(`handoff-memory-seed: no change (seed already current) — ${filePath}`);
    process.exit(0);
  }
  writeFileSync(filePath, after, "utf8");
  console.error(`handoff-memory-seed: appended MEMORY_SEED — ${filePath} (+${after.length - before.length} bytes)`);
  process.stdout.write(JSON.stringify({ ok: true, file: filePath, delta: after.length - before.length }) + "\n");
}

main();
