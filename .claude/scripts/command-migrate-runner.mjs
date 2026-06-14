#!/usr/bin/env node
/**
 * .claude/scripts/command-migrate-runner.mjs — U-CK08 (COMMAND-KERNEL-MS0)
 *
 * The per-category EXECUTOR for U-CK07's command-migrate.mjs codemod.
 * U-CK08's deliverable is "Migrate the command corpus: standardize
 * frontmatter, de-hardcode, register as os/commands/ entities", run
 * per-category with a scrutiny pass each (~13 categories per ACP-MS0).
 *
 * R8 + DOCTRINE PIVOT (mirrors U-CK05's pattern):
 *   - The codemod (U-CK07) is the ONLY source of mechanical edits.
 *     This runner wraps it; it does NOT add new edit rules.
 *   - DE-HARDCODING bodies (the 807 hardcoded-path findings) requires
 *     human judgment per CK07's own comment "deferred to the
 *     human-supervised U-CK08 pass". This runner DETECTS + REPORTS
 *     them per-category; it never silently rewrites prose. The Stop
 *     hook scrutiny gate is the operator-in-the-loop checkpoint.
 *   - Each command gets a wiki/os/commands/<slug>.md ARCHITECTURE
 *     stub (frontmatter-only; the skill .md remains the EXECUTABLE
 *     spec). No fabricated description / triggers — those live in the
 *     skill .md, surfaced via `mirrors_skill:` pointer.
 *
 * Categories: filename-prefix derived (first hyphen-separated segment
 * before the .md), with a `misc` fallback for prefix-less slugs. This
 * is deterministic, operator-friendly, and matches the existing
 * naming convention (wedm-*, lathe-*, mill-*, fleet-*, checkin-*,
 * handoff-*, precompact-*, startup-*, forge-*, hypermill-*, etc.).
 *
 * CLI:
 *   node .claude/scripts/command-migrate-runner.mjs                  # dry-run, all categories
 *   node .claude/scripts/command-migrate-runner.mjs --category fleet # dry-run, one category
 *   node .claude/scripts/command-migrate-runner.mjs --apply --category fleet
 *   node .claude/scripts/command-migrate-runner.mjs --report-only    # report, no wiki writes
 *   node .claude/scripts/command-migrate-runner.mjs --list-categories
 *
 * Knobs:
 *   PRISM_ROOT   — override prism repo root
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runMigration as runCodemod,
  migrateCommand,
  parseFrontmatter as parseFm,
} from "./command-migrate.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PRISM_ROOT = process.env.PRISM_ROOT
  ? path.resolve(process.env.PRISM_ROOT)
  : path.resolve(__dirname, "..", "..");
const DEFAULT_COMMANDS_DIR = path.join(DEFAULT_PRISM_ROOT, ".claude", "commands");
const DEFAULT_OS_COMMANDS_DIR = path.join(DEFAULT_PRISM_ROOT, "knowledge", "wiki", "os", "commands");
const DEFAULT_REPORT_FILE = path.join(DEFAULT_PRISM_ROOT, "state", "shared", "U-CK08-migration-report.md");

/**
 * Derive a category from a command slug. The first hyphen-segment is
 * the category; slugs with no hyphen fall under `misc`. Pure.
 */
export function categoryOf(slug) {
  const s = String(slug || "").toLowerCase();
  if (!s) return "misc";
  const idx = s.indexOf("-");
  // Leading-hyphen slug ("-foo") has an empty first segment → degenerate → misc.
  if (idx === 0) return "misc";
  // No hyphen → the slug IS the category (e.g. "status", "checkin").
  if (idx < 0) return s;
  return s.slice(0, idx);
}

/**
 * Group an array of commands by `categoryOf(slug)`. Returns a
 * { category: [command, ...] } map with categories sorted alpha,
 * commands within each category sorted by slug. Pure.
 */
export function groupByCategory(commands) {
  const map = new Map();
  for (const c of commands) {
    const cat = categoryOf(c.slug);
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(c);
  }
  // Sort categories alpha, commands within each by slug.
  const sorted = new Map();
  for (const cat of [...map.keys()].sort()) {
    const list = map.get(cat).slice().sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    sorted.set(cat, list);
  }
  return sorted;
}

/**
 * Build a wiki/os/commands/<slug>.md stub from a migrated command.
 * Frontmatter-only architecture record; the skill `.md` remains the
 * executable spec, linked via `mirrors_skill:`. Returns the full
 * markdown text. Pure.
 *
 * Title is derived from slug (kebab → Title Case). NEVER fabricates
 * description / triggers — those belong in the skill `.md`. The
 * `author` field carries provenance; `date` is the migration date.
 */
export function buildOsCommandStub(slug, opts = {}) {
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const author = opts.author || "claude (U-CK08 migration runner)";
  const titleCase = String(slug)
    .split("-")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  return [
    "---",
    `title: /${slug} — ${titleCase}`,
    `slug: ${slug}`,
    `kind: command`,
    `status: shipped`,
    `date: ${today}`,
    `milestone: COMMAND-KERNEL-MS0`,
    `unit: U-CK08`,
    `author: ${author}`,
    `mirrors_skill: .claude/commands/${slug}.md`,
    "---",
    "",
    `# /${slug} — wiki/os/commands architecture record`,
    "",
    `Auto-generated stub by U-CK08 migration runner. This entry is the`,
    `wiki/os/ ARCHITECTURE record; the executable spec / runbook lives`,
    `at \`.claude/commands/${slug}.md\` (linked via \`mirrors_skill:\`).`,
    "",
    `Edit the executable spec at \`.claude/commands/${slug}.md\` for`,
    `trigger / dispatcher / behavioral changes; edit THIS entry only for`,
    `architecture-level documentation about how \`/${slug}\` composes`,
    `with other commands, pipelines, syscalls.`,
    "",
    `See: [[checkin]] for the canonical hand-curated pattern · [[u-ck05-mirror-gen]] for the catalog mirror.`,
    "",
  ].join("\n");
}

/**
 * Decide whether an existing wiki/os/commands/<slug>.md entry is
 * runner-owned (safe to overwrite) or hand-curated (preserve, never
 * clobber). Hand-curated entries DO NOT carry the U-CK08 unit tag.
 *
 * Returns { hasFile, isRunnerOwned, fmUnit } — pure given readFileImpl.
 */
export function classifyExistingStub(filePath, readFileImpl) {
  if (!readFileImpl(filePath, "exists")) return { hasFile: false, isRunnerOwned: false, fmUnit: null };
  let text = "";
  try {
    text = readFileImpl(filePath, "read");
  } catch {
    return { hasFile: true, isRunnerOwned: false, fmUnit: null, error: "read-failed" };
  }
  const fm = parseFm(text);
  if (!fm.hasFrontmatter) return { hasFile: true, isRunnerOwned: false, fmUnit: null };
  const unitLine = fm.fmLines.find((l) => /^unit:/.test(l));
  const fmUnit = unitLine ? unitLine.replace(/^unit:\s*/, "").trim() : null;
  return {
    hasFile: true,
    isRunnerOwned: fmUnit === "U-CK08",
    fmUnit,
  };
}

/**
 * Format a per-category verdict block for the migration report.
 * Tracks per-command counts: applied / anti-patterns / warnings /
 * runner-created stubs / preserved hand-curated stubs.
 */
function formatCategoryBlock(category, commands, stubResults) {
  const lines = [];
  const apCount = commands.reduce((n, c) => n + (c.antiPatterns?.length || 0), 0);
  const warnCount = commands.reduce((n, c) => n + (c.warnings?.length || 0), 0);
  const changeCount = commands.reduce((n, c) => n + (c.changes?.length || 0), 0);
  const created = stubResults.filter((s) => s.action === "created").length;
  const overwritten = stubResults.filter((s) => s.action === "overwrote-runner-owned").length;
  const preserved = stubResults.filter((s) => s.action === "preserved-hand-curated").length;
  const stubDryrun = stubResults.filter((s) => s.action === "would-create" || s.action === "would-overwrite").length;
  lines.push(`### \`${category}-*\` — ${commands.length} commands`);
  lines.push("");
  lines.push(`- Codemod: ${changeCount} normalizations, ${apCount} anti-patterns, ${warnCount} warnings`);
  lines.push(`- Wiki stubs: ${created} created, ${overwritten} overwrote-runner-owned, ${preserved} preserved-hand-curated${stubDryrun ? `, ${stubDryrun} would-create (dry-run)` : ""}`);
  if (apCount > 0) {
    const byType = {};
    for (const c of commands) for (const ap of c.antiPatterns || []) byType[ap.type] = (byType[ap.type] || 0) + 1;
    lines.push(`- Anti-pattern breakdown: ${Object.entries(byType).map(([t, n]) => `${t}=${n}`).join(", ")}`);
  }
  // Per-command detail capped to commands with findings to keep report scannable.
  const withFindings = commands.filter((c) => (c.antiPatterns?.length || 0) > 0 || (c.warnings?.length || 0) > 0);
  if (withFindings.length > 0) {
    lines.push("");
    lines.push("| command | anti-patterns | warnings | stub |");
    lines.push("|---|---|---|---|");
    for (const c of withFindings) {
      const sr = stubResults.find((s) => s.slug === c.slug);
      lines.push(`| ${c.slug} | ${c.antiPatterns?.length || 0} | ${c.warnings?.length || 0} | ${sr?.action || "-"} |`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Top-level orchestrator. Reads the command corpus, runs the codemod
 * (always dry-run in this layer; --apply only writes the os/commands/
 * stubs unless --codemod-apply is also set), categorizes, emits the
 * per-category report.
 *
 * @param opts.commandsDir       (default .claude/commands)
 * @param opts.osCommandsDir     (default knowledge/wiki/os/commands)
 * @param opts.reportFile        (default state/shared/U-CK08-migration-report.md)
 * @param opts.category          (optional) restrict to one category
 * @param opts.apply             write wiki/os/commands stubs?
 * @param opts.codemodApply      apply codemod normalizations too?
 * @param opts.reportOnly        skip ALL writes (still emits report)?
 * @param opts.today             ISO date for stub frontmatter
 * @param opts.author            author for stub frontmatter
 * @param opts.readers           { readFileImpl, writeFileImpl, mkdirImpl, existsImpl }
 */
export function runRunner(opts = {}) {
  const commandsDir = opts.commandsDir || DEFAULT_COMMANDS_DIR;
  const osCommandsDir = opts.osCommandsDir || DEFAULT_OS_COMMANDS_DIR;
  const reportFile = opts.reportFile || DEFAULT_REPORT_FILE;
  const apply = opts.apply === true;
  const codemodApply = opts.codemodApply === true;
  const reportOnly = opts.reportOnly === true;
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const author = opts.author || "claude (U-CK08 migration runner)";
  const restrictCategory = opts.category ? String(opts.category).toLowerCase() : null;

  const readers = opts.readers || {};
  const realExists = readers.existsImpl || ((p) => fs.existsSync(p));
  const realRead = readers.readFileImpl || ((p) => fs.readFileSync(p, "utf8"));
  const realWrite = readers.writeFileImpl || ((p, data) => fs.writeFileSync(p, data, "utf8"));
  const realMkdir = readers.mkdirImpl || ((p) => fs.mkdirSync(p, { recursive: true }));

  // Codemod returns per-command results; codemod-apply only fires when
  // BOTH apply AND codemodApply are set (defensive: stub creation is
  // the common operator action; rewriting source is the careful one).
  const codemodResult = runCodemod({ commandsDir, apply: apply && codemodApply });
  const commands = codemodResult.commands;
  const allGroups = groupByCategory(commands);

  // Filter to one category if requested.
  let groups = allGroups;
  if (restrictCategory) {
    groups = new Map();
    if (allGroups.has(restrictCategory)) groups.set(restrictCategory, allGroups.get(restrictCategory));
  }

  // Per-category stub emission.
  const stubResultsByCategory = new Map();
  for (const [cat, cmds] of groups.entries()) {
    const sr = [];
    for (const c of cmds) {
      if (!c.ok) {
        sr.push({ slug: c.slug, action: "skipped-codemod-failed", reason: c.error });
        continue;
      }
      const targetFile = path.join(osCommandsDir, c.slug + ".md");
      const stubExistsAdapter = (p, op) => {
        if (op === "exists") return realExists(p);
        if (op === "read") return realRead(p);
        return realExists(p);
      };
      const classification = classifyExistingStub(targetFile, stubExistsAdapter);
      const willOverwrite = classification.hasFile && classification.isRunnerOwned;
      const wouldPreserve = classification.hasFile && !classification.isRunnerOwned;
      // Cross-day idempotency: when REFRESHING a runner-owned stub, keep
      // its ORIGINAL `date:` so a re-run on a later day does not rewrite
      // every stub (which would churn ~232 files into every commit).
      // First creation stamps `today`; refresh preserves prior date.
      let stubDate = today;
      if (willOverwrite) {
        try {
          const priorFm = parseFm(realRead(targetFile));
          const priorDateLine = priorFm.hasFrontmatter
            ? priorFm.fmLines.find((l) => /^date:/.test(l))
            : null;
          if (priorDateLine) {
            const d = priorDateLine.replace(/^date:\s*/, "").trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) stubDate = d;
          }
        } catch {
          // prior unreadable — fall back to today (already the default)
        }
      }
      const content = buildOsCommandStub(c.slug, { today: stubDate, author });
      if (wouldPreserve) {
        sr.push({ slug: c.slug, action: "preserved-hand-curated", fmUnit: classification.fmUnit });
        continue;
      }
      if (reportOnly || !apply) {
        sr.push({ slug: c.slug, action: willOverwrite ? "would-overwrite" : "would-create", target: targetFile });
        continue;
      }
      // Idempotency: skip write if current content is byte-identical.
      if (classification.hasFile) {
        try {
          const current = realRead(targetFile);
          if (current === content) {
            sr.push({ slug: c.slug, action: "unchanged", target: targetFile });
            continue;
          }
        } catch {
          // fall through to write
        }
      }
      try {
        realMkdir(path.dirname(targetFile));
        realWrite(targetFile, content);
        sr.push({ slug: c.slug, action: willOverwrite ? "overwrote-runner-owned" : "created", target: targetFile });
      } catch (e) {
        sr.push({ slug: c.slug, action: "write-failed", reason: String(e?.message || e) });
      }
    }
    stubResultsByCategory.set(cat, sr);
  }

  // Build the per-category report.
  const reportLines = [
    `# U-CK08 Command-Corpus Migration Report`,
    "",
    `Generated: ${new Date().toISOString()}`,
    `Commands dir: \`${path.relative(opts.prismRoot || DEFAULT_PRISM_ROOT, commandsDir).replace(/\\/g, "/")}\``,
    `OS-commands dir: \`${path.relative(opts.prismRoot || DEFAULT_PRISM_ROOT, osCommandsDir).replace(/\\/g, "/")}\``,
    `Mode: ${reportOnly ? "report-only" : apply ? (codemodApply ? "apply (stubs + codemod)" : "apply (stubs only)") : "dry-run"}`,
    restrictCategory ? `Category filter: \`${restrictCategory}-*\`` : `Categories: all (${allGroups.size} total)`,
    "",
    `## Corpus summary`,
    "",
    `- Total commands scanned: ${commands.length}`,
    `- Codemod ok: ${codemodResult.summary.ok} · failed: ${codemodResult.summary.failed}`,
    `- Total anti-patterns surfaced: ${codemodResult.summary.antiPatternTotal}`,
    `- Categories: ${allGroups.size} (${[...allGroups.keys()].join(", ")})`,
    "",
    `## Per-category verdicts`,
    "",
  ];
  for (const [cat, cmds] of groups.entries()) {
    reportLines.push(formatCategoryBlock(cat, cmds, stubResultsByCategory.get(cat) || []));
  }

  // Write the report (always — except when reportOnly is the only ask
  // and the caller passed --no-report-write; we don't expose that flag).
  if (!opts.skipReportWrite) {
    try {
      realMkdir(path.dirname(reportFile));
      realWrite(reportFile, reportLines.join("\n"));
    } catch (e) {
      // Report write failure surfaces but does not abort the run.
      reportLines.push(`\n*Report write failed: ${e?.message || e}*`);
    }
  }

  return {
    commandsDir,
    osCommandsDir,
    reportFile,
    mode: reportOnly ? "report-only" : apply ? (codemodApply ? "apply-both" : "apply-stubs") : "dry-run",
    category: restrictCategory,
    totals: {
      commands: commands.length,
      codemodOk: codemodResult.summary.ok,
      codemodFailed: codemodResult.summary.failed,
      antiPatterns: codemodResult.summary.antiPatternTotal,
      categories: allGroups.size,
    },
    groups: [...groups.keys()],
    stubResults: Object.fromEntries(stubResultsByCategory),
    reportText: reportLines.join("\n"),
  };
}

// ---------- CLI -------------------------------------------------------------

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") opts.apply = true;
    else if (a === "--codemod-apply") opts.codemodApply = true;
    else if (a === "--report-only") opts.reportOnly = true;
    else if (a === "--list-categories") opts._listCats = true;
    else if (a === "--category" && argv[i + 1]) opts.category = argv[++i];
    else if (a === "--commands-dir" && argv[i + 1]) opts.commandsDir = path.resolve(argv[++i]);
    else if (a === "--os-commands-dir" && argv[i + 1]) opts.osCommandsDir = path.resolve(argv[++i]);
    else if (a === "--report-file" && argv[i + 1]) opts.reportFile = path.resolve(argv[++i]);
    else if (a === "--today" && argv[i + 1]) opts.today = argv[++i];
    else if (a === "--author" && argv[i + 1]) opts.author = argv[++i];
    else if (a === "--help" || a === "-h") opts._help = true;
  }
  return opts;
}

function printHelp() {
  console.log(`command-migrate-runner.mjs — U-CK08 per-category executor

USAGE
  node .claude/scripts/command-migrate-runner.mjs [options]

OPTIONS
  --category <name>     Restrict to one category prefix (e.g. fleet, wedm, lathe)
  --apply               Write wiki/os/commands/ stubs (default: dry-run)
  --codemod-apply       ALSO apply the codemod normalizations to .claude/commands/
                        (requires --apply; defensive default OFF)
  --report-only         Emit report + return; no wiki/os writes
  --list-categories     Print every category in the corpus and exit
  --commands-dir <p>    Override .claude/commands/ dir
  --os-commands-dir <p> Override knowledge/wiki/os/commands/ dir
  --report-file <p>     Override state/shared/U-CK08-migration-report.md
  --today <YYYY-MM-DD>  Override stub date frontmatter
  --author <name>       Override stub author frontmatter
  --help, -h            Show this help

Per-category protocol (per U-CK08 envelope):
  for each category: run --category <cat>, scrutiny gate, commit, next.`);
}

const invokedAsCli = (() => {
  if (!process.argv[1]) return false;
  try {
    return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (invokedAsCli) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts._help) {
    printHelp();
    process.exit(0);
  }
  if (opts._listCats) {
    const codemodResult = runCodemod({ commandsDir: opts.commandsDir || DEFAULT_COMMANDS_DIR, apply: false });
    const groups = groupByCategory(codemodResult.commands);
    console.log(`categories (${groups.size}):`);
    for (const [cat, cmds] of groups.entries()) {
      console.log(`  ${cat.padEnd(20)} ${String(cmds.length).padStart(4)} commands`);
    }
    process.exit(0);
  }
  try {
    const res = runRunner(opts);
    console.log(`runner: mode=${res.mode}${res.category ? ` category=${res.category}` : ""}`);
    console.log(`  commands=${res.totals.commands} ok=${res.totals.codemodOk} failed=${res.totals.codemodFailed} anti-patterns=${res.totals.antiPatterns}`);
    console.log(`  categories scanned=${res.groups.length}/${res.totals.categories}`);
    for (const [cat, sr] of Object.entries(res.stubResults)) {
      const byAction = sr.reduce((acc, s) => { acc[s.action] = (acc[s.action] || 0) + 1; return acc; }, {});
      console.log(`  ${cat.padEnd(20)} ${JSON.stringify(byAction)}`);
    }
    console.log(`  report: ${res.reportFile}`);
    process.exit(0);
  } catch (e) {
    console.error(`runner failed: ${e?.message || e}`);
    if (process.env.PRISM_RUNNER_DEBUG === "1") console.error(e?.stack);
    process.exit(1);
  }
}
