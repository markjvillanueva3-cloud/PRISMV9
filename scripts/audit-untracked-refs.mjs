#!/usr/bin/env node
// audit-untracked-refs.mjs — classify every untracked source file in
// mcp-server/{src,web/src} as KEEP / TEST / AMBIGUOUS / ORPHAN based on
// whether tracked code imports it. Read-only; emits markdown + JSON + the
// system-viz untracked-files layer (consumed by the live PRISM OS indexer).
//
// V2 (2026-05-14): adds per-file metadata so each entry carries enough
// evidence for an operator to make a per-file keep/restore/delete decision:
//
//   loc                     — line count on disk
//   bytes                   — file size on disk
//   mtimeIso                — last modified time (UTC)
//   lastDeletionCommit      — SHA of the commit that deleted the file from
//                             HEAD (typically 3010a9613 ARCHIVE-FORGE-ORPHANS).
//                             Null if the file never existed in git OR is
//                             still tracked elsewhere.
//   lastGitCommit           — SHA of the most recent commit that touched the
//                             file (deletion or otherwise). Null if no history.
//   outbound               — number of import specifiers in the file
//   entryPointType         — heuristic: 'vite-entry' | 'type-decl' |
//                             'dispatcher' | 'cli' | 'bot' | 'route' |
//                             'migration' | 'data-catalog' | 'storybook' |
//                             null (regular module)
//   valueScore             — 0..100 composite score (see scoreFile())
//
// The system-viz layer (state/shared/system-viz/untracked-files.json) is
// consumed by the graph regenerator to surface untracked files as a distinct
// node class with the attributes above. Operators query the 3D viz at
// /system-viz to navigate the un-tracked surface.
//
// Why this exists:
//   commit 3010a9613 (ARCHIVE-FORGE-ORPHANS/T1) mis-classified large swaths
//   of live Codex frontend work as "forge orphans" and removed them from
//   git. The files continued to evolve on disk and remain referenced from
//   tracked entry points (App.tsx, dispatchers, tracked tests). Restoring
//   them as one bulk commit needs a per-file justification — that's this
//   script.
//
// Usage:
//   node scripts/audit-untracked-refs.mjs                 # markdown to stdout
//   node scripts/audit-untracked-refs.mjs --json          # machine-readable
//   node scripts/audit-untracked-refs.mjs --out path.md   # write markdown
//
// Method:
//   1. List untracked files under the two roots via `git ls-files --others
//      --exclude-standard`.
//   2. Build the reference index: for each tracked .ts/.tsx file, extract
//      every `import`/`require`/`import(...)` specifier.
//   3. Resolve each specifier into a candidate filesystem path (with .ts /
//      .tsx / index variants) and check if it lands on an untracked file.
//   4. Classify each untracked file:
//      • TEST     — path matches __tests__/**/*.test.{ts,tsx} (vitest auto-discovers)
//      • KEEP     — at least one TRACKED file imports it (system breaks otherwise)
//      • AMBIGUOUS — only UNTRACKED files import it (referenced by other Codex work)
//      • ORPHAN   — no inbound import detected (possibly dead code)

import { execFileSync } from "node:child_process";
import { readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, relative, resolve, posix } from "node:path";

const REPO = process.cwd();
const ROOTS = ["mcp-server/src", "mcp-server/web/src"];
const TEST_PATTERN = /__tests__\/.+\.test\.(ts|tsx)$/;

const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const outArgIdx = args.indexOf("--out");
const outPath = outArgIdx >= 0 ? args[outArgIdx + 1] : null;

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { cwd: REPO, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

function toPosix(p) {
  return p.split(/[\\/]/).join("/");
}

// --- 1. enumerate untracked + tracked files ---------------------------------

const trackedAll = git("ls-files").split("\n").filter(Boolean).map(toPosix);
const trackedSet = new Set(trackedAll);

const untracked = [];
for (const root of ROOTS) {
  const lines = git("ls-files", "--others", "--exclude-standard", root)
    .split("\n").filter(Boolean).map(toPosix);
  for (const f of lines) {
    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)) untracked.push(f);
  }
}

// --- 1b. per-file metadata --------------------------------------------------

// LOC + mtime + bytes for every untracked file.
const fileMeta = new Map();
for (const f of untracked) {
  let loc = 0, bytes = 0, mtimeIso = null;
  try {
    const st = statSync(join(REPO, f));
    bytes = st.size;
    mtimeIso = new Date(st.mtimeMs).toISOString();
    const txt = readFileSync(join(REPO, f), "utf8");
    loc = txt.split("\n").length;
  } catch { /* leave defaults */ }
  fileMeta.set(f, { loc, bytes, mtimeIso });
}

// Deletion history via a single `git log` over all untracked paths at once.
// We capture the SHA of the most-recent commit that touched each path (a
// deletion shows up here too because git log --all walks all refs). If a
// path has no history, it remains absent from the map.
const lastCommitByPath = new Map();      // path -> latest commit SHA
const lastDeletionByPath = new Map();    // path -> commit that deleted it
if (untracked.length > 0) {
  // Batch git log into chunks to stay under the Windows command-line limit
  // (8191 chars on cmd.exe; conservatively 2000 chars per chunk to leave room
  // for the rest of the argv). 787 paths × ~80 chars/path = ~63 KB total, so
  // chunk by character count.
  const PATH_CHUNK_BYTES = 2000;
  const chunks = [];
  let cur = [], curLen = 0;
  for (const p of untracked) {
    if (curLen + p.length + 1 > PATH_CHUNK_BYTES && cur.length > 0) {
      chunks.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(p);
    curLen += p.length + 1;
  }
  if (cur.length > 0) chunks.push(cur);
  for (const chunk of chunks) {
    try {
      const args2 = [
        "log", "--all", "--name-status", "--format=__SHA__ %H",
        "--", ...chunk,
      ];
      const log = execFileSync("git", args2, {
        cwd: REPO, encoding: "utf8", maxBuffer: 512 * 1024 * 1024,
      });
      let curSha = null;
      for (const ln of log.split("\n")) {
        if (ln.startsWith("__SHA__")) { curSha = ln.slice(8).trim(); continue; }
        if (!curSha || !ln.trim()) continue;
        const m = ln.match(/^([ADMRCT])\d*\s+(.+)$/);
        if (!m) continue;
        const [, status, rawPath] = m;
        const p = toPosix(rawPath);
        if (!lastCommitByPath.has(p)) lastCommitByPath.set(p, curSha);
        if (status === "D" && !lastDeletionByPath.has(p)) {
          lastDeletionByPath.set(p, curSha);
        }
      }
    } catch (e) {
      process.stderr.write(`[audit] git log chunk failed (${chunk.length} paths): ${e.message}\n`);
    }
  }
}

// Entry-point heuristic — files the static-import scanner cannot see (HTML
// entry, .d.ts ambient, dispatchers loaded via registry, CLI/bot mains,
// schema migrations loaded by version-detect, data catalogs loaded by name).
function classifyEntryPoint(path) {
  if (/\/main\.tsx$/.test(path)) return "vite-entry";
  if (/\.d\.ts$/.test(path)) return "type-decl";
  if (/\/dispatchers\/[A-Za-z0-9_-]+Dispatcher\.ts$/.test(path)) return "dispatcher";
  if (/\/cli\/[^/]+\.ts$/.test(path)) return "cli";
  if (/\/bot\/[^/]+\.ts$/.test(path)) return "bot";
  if (/\/routes\/[^/]+\.ts$/.test(path)) return "route";
  if (/\/migrations\/[^/]+\.ts$/.test(path)) return "migration";
  if (/\/data\/[A-Za-z0-9_-]+\.ts$/.test(path)) return "data-catalog";
  if (/\.stories\.tsx?$/.test(path)) return "storybook";
  if (/\/(scripts|tools)\/[^/]+\.ts$/.test(path)) return "script";
  if (/\/schemas\/[^/]+\.ts$/.test(path)) return "schema";
  if (/\/queue\/[^/]+Engine\.ts$/.test(path)) return "queue-engine";
  if (/\/storage\/[^/]+Engine\.ts$/.test(path)) return "storage-engine";
  return null;
}

// --- 2. build reference index from TRACKED .ts/.tsx -------------------------

// We scan every tracked file under the two roots for import-like statements.
// For each import specifier, we resolve it into a candidate file path and
// record the importer if the resolved path lands on a file we know about.
//
// Supported patterns (matches the conventions in this codebase):
//   import ... from 'x';
//   import 'x';
//   import('x')
//   require('x')
//   export ... from 'x';

const IMPORT_RE = /(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?\s+from\s+|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g;

function listScannableTracked() {
  return trackedAll.filter((f) =>
    (f.startsWith("mcp-server/src/") || f.startsWith("mcp-server/web/src/")) &&
    /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)
  );
}

function resolveSpec(spec, fromFile) {
  // ignore bare module specifiers (no leading . or /) — those are npm deps
  if (!spec.startsWith(".") && !spec.startsWith("/")) return [];
  let base = spec;
  // strip query / hash if any
  base = base.split("?")[0].split("#")[0];
  const fromDir = dirname(fromFile);
  const abs = posix.normalize(posix.join(fromDir, base));
  // candidate extensions + index files
  const cand = [];
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(abs)) {
    cand.push(abs);
  } else {
    for (const e of exts) cand.push(abs + e);
    for (const e of exts) cand.push(posix.join(abs, "index" + e));
  }
  return cand;
}

const inboundFromTracked = new Map(); // resolvedPath -> Set<importer>
const inboundFromUntracked = new Map();
const outboundCount = new Map();       // file -> count of resolved import specifiers (any target)
const untrackedSet = new Set(untracked);

function scan(file, fromTracked) {
  let text;
  try {
    text = readFileSync(join(REPO, file), "utf8");
  } catch {
    return;
  }
  IMPORT_RE.lastIndex = 0;
  let m;
  let outboundForFile = 0;
  while ((m = IMPORT_RE.exec(text)) !== null) {
    outboundForFile += 1;
    const spec = m[1];
    const cands = resolveSpec(spec, file);
    for (const c of cands) {
      const target = untrackedSet.has(c) ? c : (trackedSet.has(c) ? c : null);
      if (!target) continue;
      const bucket = fromTracked ? inboundFromTracked : inboundFromUntracked;
      if (!bucket.has(target)) bucket.set(target, new Set());
      bucket.get(target).add(file);
    }
  }
  outboundCount.set(file, outboundForFile);
}

for (const f of listScannableTracked()) scan(f, true);
for (const f of untracked) scan(f, false);

// --- 3. classify each untracked file + score --------------------------------

// valueScore (0..100) — composite heuristic for "how essential is this file":
//   +30  inbound from tracked > 0 (system imports it)
//   +20  per additional tracked inbound (capped at +40)
//   +15  has any untracked inbound (it's part of an active module graph)
//   +10  matches TEST pattern (vitest auto-discovers — represents test surface)
//   +20  entryPointType is non-null (script can't see HTML/registry references)
//   +10  was deleted by a known mis-archive commit (history says we should restore)
//   + (loc / 50)  capped at +15  (substantial code is rarely safe to delete)
//   −10  loc < 5  (likely a stub)
function scoreFile({ inboundTracked, inboundUntracked, isTest, entryPointType, lastDeletionCommit, loc }) {
  let s = 0;
  if (inboundTracked > 0) s += 30;
  s += Math.min(40, Math.max(0, (inboundTracked - 1) * 20));
  if (inboundUntracked > 0) s += 15;
  if (isTest) s += 10;
  if (entryPointType) s += 20;
  if (lastDeletionCommit) s += 10;
  s += Math.min(15, Math.max(0, Math.floor(loc / 50)));
  if (loc > 0 && loc < 5) s -= 10;
  return Math.max(0, Math.min(100, s));
}

function buildRecord(f) {
  const meta = fileMeta.get(f) ?? { loc: 0, bytes: 0, mtimeIso: null };
  const t = inboundFromTracked.get(f);
  const u = inboundFromUntracked.get(f);
  const tn = t ? t.size : 0;
  const un = u ? u.size : 0;
  const isTest = TEST_PATTERN.test(f);
  const entryPointType = classifyEntryPoint(f);
  const lastDeletionCommit = lastDeletionByPath.get(f) ?? null;
  const lastGitCommit = lastCommitByPath.get(f) ?? null;
  const outbound = outboundCount.get(f) ?? 0;
  const valueScore = scoreFile({
    inboundTracked: tn,
    inboundUntracked: un,
    isTest,
    entryPointType,
    lastDeletionCommit,
    loc: meta.loc,
  });
  return {
    file: f,
    loc: meta.loc,
    bytes: meta.bytes,
    mtimeIso: meta.mtimeIso,
    inboundTracked: tn,
    inboundUntracked: un,
    outbound,
    isTest,
    entryPointType,
    lastDeletionCommit,
    lastGitCommit,
    valueScore,
    sampleImporters: [...(t ?? new Set())].slice(0, 3).concat([...(u ?? new Set())].slice(0, 3)),
  };
}

const KEEP = [];
const TEST = [];
const AMBIGUOUS = [];
const ORPHAN = [];

const allRecords = [];

for (const f of untracked.sort()) {
  const rec = buildRecord(f);
  allRecords.push(rec);
  if (rec.isTest) {
    TEST.push(rec);
    continue;
  }
  // entry-point heuristic upgrades the classification — if a file is clearly
  // an entry point (main.tsx, *.d.ts, dispatcher, CLI, migration, etc.) we
  // treat it as KEEP even if the static-import scan didn't see an importer.
  if (rec.inboundTracked > 0 || rec.entryPointType !== null) KEEP.push(rec);
  else if (rec.inboundUntracked > 0) AMBIGUOUS.push(rec);
  else ORPHAN.push(rec);
}

// Sort each bucket by valueScore desc — most-essential files surface first
// in the dossier so reviewers can clear them quickly.
for (const arr of [KEEP, AMBIGUOUS, ORPHAN]) {
  arr.sort((a, b) => b.valueScore - a.valueScore || a.file.localeCompare(b.file));
}

// --- 3b. system-viz untracked-files layer -----------------------------------
// Per user directive 2026-05-14: "we're using /system-viz as a live indexer
// and visualizer for every bit of data contained in the h drive which is the
// prism obsidian os". The system-viz graph regenerator picks up
// state/shared/system-viz/untracked-files.json and emits each file as a
// node of class "untracked-file" with the metadata above.

const vizLayer = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "scripts/audit-untracked-refs.mjs",
  roots: ROOTS,
  counts: {
    KEEP: KEEP.length,
    TEST: TEST.length,
    AMBIGUOUS: AMBIGUOUS.length,
    ORPHAN: ORPHAN.length,
    total: allRecords.length,
  },
  files: allRecords.map((r) => ({
    file: r.file,
    layer: "untracked",
    classification: r.isTest ? "TEST" : (r.inboundTracked > 0 || r.entryPointType ? "KEEP" : (r.inboundUntracked > 0 ? "AMBIGUOUS" : "ORPHAN")),
    loc: r.loc,
    bytes: r.bytes,
    mtimeIso: r.mtimeIso,
    inboundTracked: r.inboundTracked,
    inboundUntracked: r.inboundUntracked,
    outbound: r.outbound,
    entryPointType: r.entryPointType,
    lastDeletionCommit: r.lastDeletionCommit,
    lastGitCommit: r.lastGitCommit,
    valueScore: r.valueScore,
  })),
};

// Always write the viz layer (independent of --out / --json flags); other
// tooling consumes it.
const vizPath = join(REPO, "state/shared/system-viz/untracked-files.json");
try {
  writeFileSync(vizPath, JSON.stringify(vizLayer, null, 2));
  process.stderr.write(`[audit] viz layer → ${vizPath}\n`);
} catch (e) {
  process.stderr.write(`[audit] viz layer write failed: ${e.message}\n`);
}

// --- 4. emit report ---------------------------------------------------------

const summary = {
  total_untracked_scanned: untracked.length,
  KEEP: KEEP.length,
  TEST: TEST.length,
  AMBIGUOUS: AMBIGUOUS.length,
  ORPHAN: ORPHAN.length,
  generated_at: new Date().toISOString(),
  roots: ROOTS,
};

if (wantJson) {
  const out = { summary, KEEP, TEST, AMBIGUOUS, ORPHAN };
  process.stdout.write(JSON.stringify(out, null, 2));
} else {
  const lines = [];
  lines.push(`# Untracked-file Reference Audit`);
  lines.push("");
  lines.push(`Generated: ${summary.generated_at}`);
  lines.push(`Roots scanned: \`${ROOTS.join("`, `")}\``);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Category | Count | Action |`);
  lines.push(`|---|---|---|`);
  lines.push(`| **KEEP** (referenced by tracked code) | ${KEEP.length} | restore in CALC-RESTORE-MS0 |`);
  lines.push(`| **TEST** (vitest auto-discovers) | ${TEST.length} | restore alongside KEEP |`);
  lines.push(`| **AMBIGUOUS** (only untracked importers) | ${AMBIGUOUS.length} | review with user — likely keep if a KEEP file imports them transitively |`);
  lines.push(`| **ORPHAN** (no inbound imports) | ${ORPHAN.length} | review — candidates for deletion |`);
  lines.push(`| **TOTAL** | ${summary.total_untracked_scanned} | |`);
  lines.push("");

  function section(title, rows, mode) {
    lines.push(`## ${title} (${rows.length})`);
    lines.push("");
    if (rows.length === 0) {
      lines.push(`_(none)_`);
      lines.push("");
      return;
    }
    if (mode === "rich") {
      lines.push(`| Score | File | LOC | Inbound tracked / untracked | Entry-point | Deleted by | Sample importer |`);
      lines.push(`|---:|---|---:|---|---|---|---|`);
      for (const r of rows) {
        const sample = r.sampleImporters?.[0] ?? "—";
        const ep = r.entryPointType ?? "—";
        const del = r.lastDeletionCommit ? r.lastDeletionCommit.slice(0, 9) : "—";
        lines.push(
          `| **${r.valueScore}** | \`${r.file}\` | ${r.loc} | ${r.inboundTracked} / ${r.inboundUntracked} | ${ep} | ${del} | \`${sample}\` |`,
        );
      }
    } else if (mode === "tests") {
      lines.push(`| Score | File | LOC |`);
      lines.push(`|---:|---|---:|`);
      for (const r of rows) {
        lines.push(`| **${r.valueScore}** | \`${r.file}\` | ${r.loc} |`);
      }
    }
    lines.push("");
  }

  section("KEEP — tracked code imports them OR entry-point heuristic flagged", KEEP, "rich");
  section("TEST — vitest auto-discovers under __tests__/", TEST, "tests");
  section("AMBIGUOUS — only untracked files import them", AMBIGUOUS, "rich");
  section("ORPHAN — no inbound import detected (candidates for deletion)", ORPHAN, "rich");

  // Per-classification recommendations footer
  lines.push("## Recommendations");
  lines.push("");
  lines.push(`- **KEEP (${KEEP.length})** — restore in one commit \`[CALC-RESTORE-MS0]/U-CALC-RESTORE-01\`. The system is broken-by-git-but-running-from-disk without these.`);
  lines.push(`- **TEST (${TEST.length})** — restore alongside KEEP. Vitest auto-discovers them; without git tracking they are at risk of stomp.`);
  lines.push(`- **AMBIGUOUS (${AMBIGUOUS.length})** — restore in the same commit. These are transitive dependencies of KEEP files; restoring KEEP without AMBIGUOUS leaves broken imports.`);
  lines.push(`- **ORPHAN (${ORPHAN.length})** — review per-file. Sort by valueScore: items >= 30 likely have hidden references (HTML, registry, CLI entrypoints); items < 15 are strong dead-code candidates.`);
  lines.push("");
  lines.push(`Sister surface: \`state/shared/system-viz/untracked-files.json\` is consumed by the /system-viz graph regenerator to surface untracked files as a distinct node class.`);
  lines.push("");

  const out = lines.join("\n") + "\n";
  if (outPath) {
    writeFileSync(outPath, out);
    process.stderr.write(`[audit] wrote ${outPath}\n`);
  } else {
    process.stdout.write(out);
  }
}
