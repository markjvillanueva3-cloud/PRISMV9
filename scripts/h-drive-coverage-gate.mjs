#!/usr/bin/env node
/**
 * H-DRIVE-VAULT-SYNERGY / U-8 -- coverage anti-rot gate.
 *
 * The U-1 indexer (`h-drive-to-vault.mjs`) categorizes every substantive H:/ top-level folder
 * into the Obsidian 2nd brain and writes `state/shared/H-DRIVE-COVERAGE.json`. That map ROTS the
 * instant a NEW top-level folder lands on the drive between reindexes -- the brain silently goes
 * incomplete. This gate is the anti-rot watchdog: a CHEAP shallow scan (readdir of H:/ top-level,
 * no walk) compared against the saved coverage map. It NEVER reindexes and NEVER writes the vault --
 * it only reports drift so an operator (or the daily U-2 cron) re-runs the indexer.
 *
 * A top-level dir is a COVERAGE GAP when classifyTopLevel says it is substantive
 * (`skip === false`) AND it is not a worktree-clone (those dedupe to canonical `prism` via the
 * coverage map's cloneAggregate) AND its name is absent from the saved map's "H:/ top-level" scope.
 * The inverse (mapped domains no longer on disk) is reported as `staleCovered` -- advisory only,
 * it does NOT fail the gate (a removed folder is outdated, not an incompleteness).
 *
 * Surfaces: CLI exit code (CI / cron / pre-commit gate). An in-session Stop-advisory surface
 * (h-drive-coverage-gate-stop.mjs) is DEFERRED -- it is a fleet-wide harness change best made from
 * a main-tree session, and the daily U-2 reindex already bounds drift to ~24h. See the U-8 handoff.
 *
 * KNOWN DELEGATED LIMITATION (suspectClones): classifyTopLevel is a name-only classifier, so a
 * standalone product that merely starts with "prism" (e.g. PRISM_FLOW -- Claude-Flow V3, NOT a PRISM
 * worktree) is labelled "worktree-clone" and would be silently deduped away. The gate cross-checks
 * each name-classified clone for a real `.git` entry; a clone-by-name with NO `.git` is surfaced in
 * an advisory `suspectClones` bucket (NOT gating -- prism-derived debris like prism-backups must not
 * cry wolf) so a genuinely-uncategorized standalone product is never silently lost.
 *
 * CLI:
 *   node scripts/h-drive-coverage-gate.mjs            # human text, exit 0 clean / 1 gaps / 2 fail
 *   node scripts/h-drive-coverage-gate.mjs --json     # machine-readable report
 *   node scripts/h-drive-coverage-gate.mjs --root H:/ --coverage <path>
 *
 * Pure exports (hermetic-testable): findUncoveredDomains, readLiveTopLevel, loadCoverage.
 *
 * @milestone H-DRIVE-VAULT-SYNERGY
 * @unit U-8
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED + H-DRIVE-VAULT autonomous loop.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyTopLevel } from "./lib/h-drive-taxonomy.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const H_ROOT = "H:/";
const MAP_JSON = path.join(REPO_ROOT, "state", "shared", "H-DRIVE-COVERAGE.json");
const TOP_LEVEL_SCOPE = "H:/ top-level"; // matches buildCoverageMap()'s scope label

/**
 * Default real-worktree predicate: a name-classified "worktree-clone" is only a TRUE clone of the
 * canonical repo if the dir actually contains a `.git` entry (a worktree carries a `.git` FILE; a
 * full clone a `.git` DIR). Fail-soft -> false (treat as NOT a real clone -> surface it). Bound to
 * a root via makeGitCloneCheck so `--root` works.
 */
export function makeGitCloneCheck(root) {
  return (name) => {
    try { return fs.existsSync(path.join(root, name, ".git")); } catch { return false; }
  };
}
const defaultIsWorktreeClone = makeGitCloneCheck(H_ROOT);

/**
 * Pure detector. Compares the live top-level dir names against the saved coverage map.
 * @param {object} args
 * @param {any} args.coverage      Parsed H-DRIVE-COVERAGE.json (shape: { domains: [{scope,name,class,...}] }).
 * @param {string[]} args.liveTopLevel  Top-level dir NAMES currently on disk.
 * @param {(name:string)=>{class:string,skip:boolean,dedupeTo?:string}} [args.classify]  Injectable for tests.
 * @param {(name:string)=>boolean} [args.isWorktreeClone]  Confirms a name-classified clone is a REAL git clone. Injectable.
 * @returns {{ok:boolean, uncovered:Array<{name:string,class:string}>, suspectClones:Array<{name:string,class:string}>, staleCovered:Array<{name:string,class:string}>, coveredCount:number, liveCount:number}}
 */
export function findUncoveredDomains({ coverage, liveTopLevel, classify = classifyTopLevel, isWorktreeClone = defaultIsWorktreeClone }) {
  const domains = Array.isArray(coverage?.domains) ? coverage.domains : [];
  const coveredTop = new Set(
    domains
      .filter((d) => d && d.scope === TOP_LEVEL_SCOPE && typeof d.name === "string")
      .map((d) => d.name.toLowerCase()),
  );

  const uncovered = [];
  const suspectClones = []; // classified clone-by-name but NO real .git -> surface, do NOT gate
  const seenLive = new Set();
  for (const raw of Array.isArray(liveTopLevel) ? liveTopLevel : []) {
    const name = String(raw || "").trim();
    if (!name) continue;
    const low = name.toLowerCase();
    if (seenLive.has(low)) continue; // de-dup a case-collision on disk
    seenLive.add(low);
    const cls = classify(name) || { class: "skip-junk", skip: true };
    if (cls.skip) continue; // junk (node_modules/.git/caches/...) is not a coverage obligation
    if (cls.class === "worktree-clone") {
      // Trust the name classifier only if it is a REAL git clone (has .git). A standalone product
      // that merely starts with "prism" (PRISM_FLOW) has no .git -> never silently swallow it.
      if (isWorktreeClone(name)) continue; // real clone -> deduped to canonical 'prism' (cloneAggregate)
      if (!coveredTop.has(low)) suspectClones.push({ name, class: cls.class });
      continue;
    }
    if (!coveredTop.has(low)) uncovered.push({ name, class: cls.class });
  }

  // Inverse: mapped top-level domains no longer present on disk (advisory only).
  const staleCovered = [];
  for (const d of domains) {
    if (!d || d.scope !== TOP_LEVEL_SCOPE || typeof d.name !== "string") continue;
    if (!seenLive.has(d.name.toLowerCase())) {
      staleCovered.push({ name: d.name, class: typeof d.class === "string" ? d.class : "unknown" });
    }
  }

  return {
    ok: uncovered.length === 0, // suspectClones + staleCovered are advisory, NOT gating
    uncovered,
    suspectClones,
    staleCovered,
    coveredCount: coveredTop.size,
    liveCount: seenLive.size,
  };
}

/** Shallow list of immediate sub-directory NAMES of `root`. Fail-soft -> null on error (R12). */
export function readLiveTopLevel(root) {
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => {
        try { return e.isDirectory(); } catch { return false; }
      })
      .map((e) => e.name);
  } catch {
    return null;
  }
}

/** Read + parse the coverage map. Fail-soft -> null on missing/corrupt file (R12). */
export function loadCoverage(mapPath) {
  try {
    return JSON.parse(fs.readFileSync(mapPath, "utf8"));
  } catch {
    return null;
  }
}

function main(argv) {
  const jsonOnly = argv.includes("--json");
  const rootIdx = argv.indexOf("--root");
  const root = rootIdx >= 0 && argv[rootIdx + 1] ? argv[rootIdx + 1] : H_ROOT;
  const covIdx = argv.indexOf("--coverage");
  const covPath = covIdx >= 0 && argv[covIdx + 1] ? argv[covIdx + 1] : MAP_JSON;

  const coverage = loadCoverage(covPath);
  const liveTopLevel = readLiveTopLevel(root);

  // Measurement failure -> exit 2 (R12: never report "clean" when we could not measure).
  if (coverage === null || liveTopLevel === null) {
    const reason = coverage === null ? `coverage map unreadable: ${covPath}` : `cannot scan root: ${root}`;
    if (jsonOnly) {
      process.stdout.write(JSON.stringify({ ok: false, measurementFailure: true, reason }, null, 2) + "\n");
    } else {
      process.stderr.write(`[hdrive-gate] MEASUREMENT FAILURE -- ${reason}\n`);
    }
    return 2;
  }

  const report = findUncoveredDomains({ coverage, liveTopLevel, isWorktreeClone: makeGitCloneCheck(root) });

  // Advisory note (non-gating): clone-by-name dirs with no real .git -> may be standalone products.
  const suspectNote = report.suspectClones.length
    ? `\n[hdrive-gate] NOTE -- ${report.suspectClones.length} prism-named dir(s) with NO .git (standalone product or debris -- review/categorize or add to taxonomy skip): ${report.suspectClones.map((s) => s.name).join(", ")}`
    : "";

  if (jsonOnly) {
    process.stdout.write(JSON.stringify({ ...report, root, coveragePath: covPath }, null, 2) + "\n");
    return report.ok ? 0 : 1;
  }

  if (report.ok) {
    process.stdout.write(
      `[hdrive-gate] OK -- ${report.coveredCount} top-level domains covered, ${report.liveCount} live on disk; 0 uncovered.` +
        (report.staleCovered.length ? ` (${report.staleCovered.length} stale map entries: ${report.staleCovered.map((s) => s.name).join(", ")})` : "") +
        suspectNote +
        "\n",
    );
    return 0;
  }

  process.stdout.write(
    `[hdrive-gate] DRIFT -- ${report.uncovered.length} uncategorized top-level H:/ domain(s) (run \`node scripts/h-drive-to-vault.mjs --reindex\`):\n` +
      report.uncovered.map((u) => `  - ${u.name} [${u.class}]`).join("\n") +
      suspectNote +
      "\n",
  );
  return 1;
}

// Case-insensitive compare: Windows paths are case-insensitive (e.g. h:\ vs H:\), so an exact
// string compare could silently fail to run main() -> a quiet exit-0 no-op masquerading as clean.
const __isCli =
  !!process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (__isCli) {
  process.exit(main(process.argv.slice(2)));
}
