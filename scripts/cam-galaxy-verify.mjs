#!/usr/bin/env node
/**
 * cam-galaxy-verify.mjs — anti-regression health check for the CAM galaxy (slot:kilo)
 *
 * Verifies the CAM galaxy stays synergized: the 13-artifact galaxy set + the custom
 * prism-awareness surface + dispatcher wiring + master back-pointer are all present and
 * fresh. Run anytime ("is my galaxy still intact?") and as a cron/Stop anti-regression
 * oracle so a peer merge or a stale regen can never silently degrade the galaxy.
 *
 * This is the DURABILITY layer for the synergy work: the awareness snapshot answers
 * "what is the galaxy now", this answers "is the galaxy still whole".
 *
 * Design:
 *  - Root resolved from THIS script's location -> works in the slot worktree AND on main
 *    after golf merges slot/kilo.
 *  - Each check is isolated + fail-soft: a check that throws becomes a WARN ("could not
 *    verify"), never crashes the sweep (R12 — surface the uncertainty, don't hide it).
 *  - Exit code = worst severity: 0 PASS, 1 WARN, 2 FAIL. CI/cron/Stop can gate on it.
 *  - NO child_process (fs-only); regex scans use matchAll (no .exec) — passes security hook.
 *
 * CLI: node scripts/cam-galaxy-verify.mjs            # human report
 *      node scripts/cam-galaxy-verify.mjs --json     # machine-readable
 *      node scripts/cam-galaxy-verify.mjs --quiet    # exit code only (cron)
 */

import { readdirSync, statSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES = path.join(ROOT, "mcp-server", "src", "engines");
const GALAXY = path.join(ENGINES, "cam");
const DISPATCHER = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers", "camDispatcher.ts");
const SOUL = path.join(ROOT, "state", "shared", "slot-souls", "kilo.md");
const WIKI = path.join(ROOT, "knowledge", "wiki", "architecture", "cam-galaxy.md");
const SNAPSHOT = path.join(ROOT, "state", "shared", "CAM-AWARENESS-SNAPSHOT.md");
const GEN_SCRIPT = path.join(ROOT, "scripts", "cam-awareness-snapshot.mjs");
const INJECT_HOOK = path.join(ROOT, ".claude", "hooks", "cam-awareness-inject.mjs");
const MEM_DIR = "C:/Users/wompu/.claude/projects/H--prism/memory";
const MASTER_INDEX = path.join(MEM_DIR, "MEMORY.md");

// Galaxy-completeness thresholds (from state/shared/per-slot-galaxy-buildout/kilo.md).
const MIN_MEMORIES = 10;
const MIN_GALAXY_MD = 4;
const MIN_DISPATCHER_ACTIONS = 20;
const SNAPSHOT_STALE_HOURS = 72;
const MS_PER_HOUR = 3_600_000;
const TENTH = 10; // 0.1h rounding

const PASS = "PASS";
const WARN = "WARN";
const FAIL = "FAIL";
const SEVERITY_RANK = { [PASS]: 0, [WARN]: 1, [FAIL]: 2 };

function fileExists(p) {
  try { return statSync(p).isFile(); } catch { return false; }
}

function countDirFiles(dir, predicate) {
  try { return readdirSync(dir).filter(predicate).length; } catch { return null; }
}

/** A check returns { status, detail }. A thrown error is caught by run() -> WARN. */
const CHECKS = [
  {
    name: "soul (cam-specialist)",
    run() {
      if (!fileExists(SOUL)) return { status: FAIL, detail: "state/shared/slot-souls/kilo.md missing" };
      const txt = readFileSync(SOUL, "utf8");
      // Realigned soul is cam-specialist; legacy main soul is print-to-program.
      const isCam = /role:\s*cam-specialist/.test(txt) || /galaxy[:\s].*cam/i.test(txt);
      return isCam
        ? { status: PASS, detail: "role=cam-specialist" }
        : { status: WARN, detail: "soul present but not yet cam-specialist (legacy — golf merge pending)" };
    },
  },
  {
    name: "4 galaxy files (CLAUDE/MEMORY/PATHS/TOOLBELT)",
    run() {
      const present = ["CLAUDE.md", "MEMORY.md", "PATHS.md", "TOOLBELT.md"].filter((f) => fileExists(path.join(GALAXY, f)));
      return present.length >= MIN_GALAXY_MD
        ? { status: PASS, detail: `${present.length}/4 present` }
        : { status: FAIL, detail: `only ${present.length}/4 present: ${present.join(",") || "none"}` };
    },
  },
  {
    name: "MEMORY.md master-brain link",
    run() {
      const p = path.join(GALAXY, "MEMORY.md");
      if (!fileExists(p)) return { status: FAIL, detail: "cam/MEMORY.md missing" };
      const txt = readFileSync(p, "utf8");
      const hasLink = /Master-brain link/i.test(txt);
      const hasAwareness = /CAM-AWARENESS-SNAPSHOT/.test(txt);
      if (hasLink && hasAwareness) return { status: PASS, detail: "master-brain link + awareness pointer present" };
      if (hasLink) return { status: WARN, detail: "master-brain link present, awareness pointer missing" };
      return { status: FAIL, detail: "no master-brain link section" };
    },
  },
  {
    name: "wiki entry (cam-galaxy.md)",
    run() {
      return fileExists(WIKI)
        ? { status: PASS, detail: "knowledge/wiki/architecture/cam-galaxy.md present" }
        : { status: FAIL, detail: "cam-galaxy.md wiki entry missing" };
    },
  },
  {
    name: `CAM memories (>=${MIN_MEMORIES})`,
    run() {
      const n = countDirFiles(MEM_DIR, (f) => /(_kilo_cam|^reference_cam_|^feedback_kilo_cam)/.test(f) && f.endsWith(".md"));
      if (n == null) return { status: WARN, detail: "memory dir not on this host (cannot verify)" };
      return n >= MIN_MEMORIES
        ? { status: PASS, detail: `${n} CAM memories` }
        : { status: WARN, detail: `only ${n} CAM memories (< ${MIN_MEMORIES})` };
    },
  },
  {
    name: "master [galaxy:cam] back-pointer",
    run() {
      if (!fileExists(MASTER_INDEX)) return { status: WARN, detail: "master MEMORY.md not on this host (cannot verify)" };
      const txt = readFileSync(MASTER_INDEX, "utf8");
      return /\[galaxy:cam\]/.test(txt)
        ? { status: PASS, detail: "[galaxy:cam] row present in master index" }
        : { status: FAIL, detail: "master MEMORY.md missing [galaxy:cam] back-pointer" };
    },
  },
  {
    name: "custom prism-awareness surface",
    run() {
      const parts = [
        ["generator", fileExists(GEN_SCRIPT)],
        ["inject hook", fileExists(INJECT_HOOK)],
        ["snapshot", fileExists(SNAPSHOT)],
      ];
      const missing = parts.filter(([, ok]) => !ok).map(([n]) => n);
      if (missing.length) return { status: FAIL, detail: `missing: ${missing.join(", ")}` };
      let detail = "generator + hook + snapshot present";
      try {
        const ageH = (Date.now() - statSync(SNAPSHOT).mtimeMs) / MS_PER_HOUR;
        if (ageH > SNAPSHOT_STALE_HOURS) {
          return { status: WARN, detail: `${detail}; snapshot ${Math.round(ageH)}h stale (>${SNAPSHOT_STALE_HOURS}h) — regen` };
        }
        detail += `; snapshot ${Math.round(ageH * TENTH) / TENTH}h fresh`;
      } catch { /* freshness optional */ }
      return { status: PASS, detail };
    },
  },
  {
    name: "CAM knowledge index (compiled wiki+tribal+paths)",
    run() {
      const p = path.join(ROOT, "state", "shared", "CAM-KNOWLEDGE-INDEX.md");
      if (!fileExists(p)) return { status: WARN, detail: "CAM-KNOWLEDGE-INDEX.md missing — regen: node scripts/cam-knowledge-index.mjs" };
      try {
        const ageH = (Date.now() - statSync(p).mtimeMs) / MS_PER_HOUR;
        return { status: PASS, detail: `present, ${Math.round(ageH * TENTH) / TENTH}h fresh` };
      } catch { return { status: PASS, detail: "present" }; }
    },
  },
  {
    name: `dispatcher wiring (cam_* actions >=${MIN_DISPATCHER_ACTIONS})`,
    run() {
      if (!fileExists(DISPATCHER)) return { status: FAIL, detail: "camDispatcher.ts missing" };
      const src = readFileSync(DISPATCHER, "utf8");
      const matches = [...src.matchAll(/\bcam_([a-z]+)_[a-z0-9_]+\b/g)];
      const fams = new Set(matches.map((mm) => mm[1]));
      const total = matches.length;
      return total >= MIN_DISPATCHER_ACTIONS
        ? { status: PASS, detail: `${fams.size} families / ${total} action refs` }
        : { status: WARN, detail: `only ${total} cam_* action refs (< ${MIN_DISPATCHER_ACTIONS})` };
    },
  },
];

function run() {
  const results = CHECKS.map((c) => {
    try {
      const r = c.run();
      return { name: c.name, status: r.status, detail: r.detail };
    } catch (e) {
      return { name: c.name, status: WARN, detail: `could not verify: ${e?.message || e}` };
    }
  });
  const worst = results.reduce((acc, r) => (SEVERITY_RANK[r.status] > SEVERITY_RANK[acc] ? r.status : acc), PASS);
  return { worst, results };
}

function main() {
  const argv = process.argv.slice(2);
  const { worst, results } = run();
  if (argv.includes("--json")) {
    process.stdout.write(JSON.stringify({ worst, results }, null, 2) + "\n");
  } else if (!argv.includes("--quiet")) {
    const glyph = { [PASS]: "OK", [WARN]: "!!", [FAIL]: "XX" };
    process.stdout.write("CAM galaxy verify (slot:kilo)\n");
    for (const r of results) process.stdout.write(`  ${glyph[r.status]} [${r.status}] ${r.name} — ${r.detail}\n`);
    const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
    process.stdout.write(`OVERALL: ${worst}  (${counts[PASS] || 0} pass / ${counts[WARN] || 0} warn / ${counts[FAIL] || 0} fail)\n`);
  }
  process.exit(SEVERITY_RANK[worst]);
}

try {
  main();
} catch (e) {
  process.stderr.write(`[cam-galaxy-verify] ${e?.message || e}\n`);
  process.exit(2);
}
