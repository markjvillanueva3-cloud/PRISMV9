#!/usr/bin/env node
/**
 * fleet-recurring-patterns-digest.mjs -- CLI/IO wrapper for the pure fleet-recurring-patterns lib.
 *
 * Aggregates cross-session signal that no single-session tool sees:
 *   - regression lines  <- CLAUDE.md "## Recent regressions" + every handoff's same section
 *   - commit subjects   <- git log --all --oneline --since=<window>
 *   - citations         <- [[wiki-links]] across handoffs + the auto-memory dir
 * then runs the pure lib's buildDigest + renderDigest and writes:
 *   state/shared/dashboards/FLEET-RECURRING-PATTERNS.md   (+ .json sidecar)
 *
 * golf-domain (fleet-hygiene). Advisory only -- surfaces recurring pain so a chat can act;
 * never mutates code/envelopes. Wired into prism_session:fleet_recurring_patterns.
 *
 * Knobs: PRISM_FRP_DISABLE=1, PRISM_FRP_WINDOW_DAYS (default 7),
 *        PRISM_FRP_MIN_REGRESSION_HITS, PRISM_FRP_MIN_SCOPE_HITS.
 * Flags:  --weeks=N --days=N --top=N --json --print
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  buildDigest,
  renderDigest,
  extractWikiLinks,
  DEFAULT_MIN_REGRESSION_HITS,
  DEFAULT_MIN_SCOPE_HITS,
} from "./lib/fleet-recurring-patterns.mjs";

const ROOT = (() => {
  // scripts/ -> repo root
  const here = dirname(fileURLToPath(import.meta.url));
  return dirname(here);
})();

const HANDOFF_DIR = join(ROOT, "state", "shared", "handoffs");
const DASH_DIR = join(ROOT, "state", "shared", "dashboards");
const CLAUDE_MD = join(ROOT, "CLAUDE.md");
const MEMORY_DIR = "C:/Users/wompu/.claude/projects/H--prism/memory";
const OUT_MD = join(DASH_DIR, "FLEET-RECURRING-PATTERNS.md");
const OUT_JSON = join(DASH_DIR, "fleet-recurring-patterns.json");

function parseArgs(argv) {
  const a = { json: false, print: false };
  for (const arg of argv) {
    let m;
    if ((m = arg.match(/^--weeks=(\d+)$/))) a.windowDays = parseInt(m[1], 10) * 7;
    else if ((m = arg.match(/^--days=(\d+)$/))) a.windowDays = parseInt(m[1], 10);
    else if ((m = arg.match(/^--top=(\d+)$/))) a.topLimit = parseInt(m[1], 10);
    else if (arg === "--json") a.json = true;
    else if (arg === "--print") a.print = true;
  }
  return a;
}

/** Pull lines from a "## Recent regressions" section of a markdown body. */
function extractRegressionSection(body) {
  if (typeof body !== "string" || !body) return [];
  const lines = body.split(/\r?\n/);
  const out = [];
  let inSection = false;
  for (const line of lines) {
    if (/^##+\s+Recent regressions/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (/^##+\s/.test(line)) break; // next heading ends the section
      const t = line.trim();
      if (t.startsWith("- ") && t.length > 4) out.push(t.replace(/^- /, ""));
    }
  }
  return out;
}

function safeRead(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function collectRegressionLines() {
  const lines = [];
  // CLAUDE.md
  lines.push(...extractRegressionSection(safeRead(CLAUDE_MD)));
  // every handoff
  let files = [];
  try {
    files = readdirSync(HANDOFF_DIR).filter((f) => /^HANDOFF-.*\.md$/.test(f));
  } catch {
    files = [];
  }
  for (const f of files) {
    lines.push(...extractRegressionSection(safeRead(join(HANDOFF_DIR, f))));
  }
  return { lines, handoffFileCount: files.length };
}

function collectCitations() {
  const links = [];
  // handoffs
  let hfiles = [];
  try {
    hfiles = readdirSync(HANDOFF_DIR).filter((f) => /\.md$/.test(f));
  } catch {
    hfiles = [];
  }
  for (const f of hfiles) links.push(...extractWikiLinks(safeRead(join(HANDOFF_DIR, f))));
  // auto-memory dir
  let mfiles = [];
  try {
    mfiles = readdirSync(MEMORY_DIR).filter((f) => /\.md$/.test(f));
  } catch {
    mfiles = [];
  }
  for (const f of mfiles) links.push(...extractWikiLinks(safeRead(join(MEMORY_DIR, f))));
  return links;
}

function collectCommitSubjects(windowDays) {
  try {
    const out = execFileSync(
      "git",
      ["-C", ROOT, "log", "--all", "--oneline", "--format=%s", `--since=${windowDays} days ago`],
      { encoding: "utf8", timeout: 60000, maxBuffer: 32 * 1024 * 1024 }
    );
    return out.split(/\r?\n/).filter((l) => l.trim().length > 0);
  } catch {
    return [];
  }
}

function main() {
  if (process.env.PRISM_FRP_DISABLE === "1") {
    process.stdout.write("fleet-recurring-patterns: disabled via PRISM_FRP_DISABLE\n");
    return;
  }
  const args = parseArgs(process.argv.slice(2));
  // Guard against a non-numeric PRISM_FRP_WINDOW_DAYS (parseInt -> NaN -> `git --since=NaN days ago`
  // silently covers ALL history). Fall back to the 7-day default on NaN.
  const envWindow = parseInt(process.env.PRISM_FRP_WINDOW_DAYS || "7", 10);
  const windowDays = args.windowDays ?? (Number.isFinite(envWindow) && envWindow > 0 ? envWindow : 7);
  const minRegressionHits = parseInt(
    process.env.PRISM_FRP_MIN_REGRESSION_HITS || String(DEFAULT_MIN_REGRESSION_HITS),
    10
  );
  const minScopeHits = parseInt(
    process.env.PRISM_FRP_MIN_SCOPE_HITS || String(DEFAULT_MIN_SCOPE_HITS),
    10
  );

  const { lines: regressionLines, handoffFileCount } = collectRegressionLines();
  const commitSubjects = collectCommitSubjects(windowDays);
  const allCitations = collectCitations();

  const digest = buildDigest(
    { regressionLines, commitSubjects, allCitations, regressionFileCount: handoffFileCount + 1 },
    { windowDays, minRegressionHits, minScopeHits, topLimit: args.topLimit }
  );
  // generatedAt is stamped here in the IO layer (the pure lib never reads the clock).
  digest.generatedAt = new Date().toISOString();

  const md = renderDigest(digest);

  if (!existsSync(DASH_DIR)) mkdirSync(DASH_DIR, { recursive: true });
  writeFileSync(OUT_MD, md, "utf8");
  writeFileSync(OUT_JSON, JSON.stringify(digest, null, 2), "utf8");

  if (args.print) process.stdout.write(md + "\n");
  if (args.json) {
    process.stdout.write(JSON.stringify(digest) + "\n");
  } else {
    process.stdout.write(
      `fleet-recurring-patterns: ${digest.regressionPatterns.length} regression class(es), ` +
        `${digest.scopePatterns.length} scope-focus, ${digest.topCitations.length} top citation(s), ` +
        `${digest.fixRebreakLoops.length} fix-rebreak loop(s) over ${windowDays}d ` +
        `(${commitSubjects.length} commits, ${regressionLines.length} regression lines). -> ${OUT_MD}\n`
    );
  }
}

main();
