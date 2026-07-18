#!/usr/bin/env node
/**
 * cam-awareness-snapshot.mjs — custom CAM-domain prism-awareness generator (slot:kilo)
 *
 * The CAM-scoped sibling of scripts/awareness-snapshot.mjs. Where the fleet-wide
 * awareness snapshot answers "what's built / unused / drifted across all of PRISM",
 * THIS answers "what is the CAM galaxy right now" so a kilo session always boots with
 * its own domain in view — engines, dispatcher surface, AI/LoRA wiring, recent CAM
 * commits, galaxy freshness, high-ROI memories, PSN edges, invariants.
 *
 * Output: state/shared/CAM-AWARENESS-SNAPSHOT.md (+ .json sidecar).
 * Consumed by: .claude/hooks/cam-awareness-inject.mjs (SessionStart, slot=kilo-gated)
 *              + referenced from mcp-server/src/engines/cam/MEMORY.md (galaxy brain).
 *
 * Design notes:
 *  - Root is resolved from THIS script's location so it works identically in the slot
 *    worktree (H:/prism-slot-kilo) AND on main after golf merges slot/kilo.
 *  - NO child_process: git branch + recent commits are read from .git/HEAD and the
 *    .git/logs/HEAD reflog via fs (worktree .git-file indirection handled). Pure fs.
 *  - Every section is fail-soft (R12): an unavailable source yields an explicit
 *    "(unknown — <reason>)" marker, never a fabricated count.
 *  - Deterministic structure; the only non-deterministic field is the generatedAt stamp.
 *
 * CLI: node scripts/cam-awareness-snapshot.mjs            # write the snapshot
 *      node scripts/cam-awareness-snapshot.mjs --json     # also print the JSON sidecar
 *      node scripts/cam-awareness-snapshot.mjs --stdout   # print MD to stdout, do not write
 */

import { readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES = path.join(ROOT, "mcp-server", "src", "engines");
const DISPATCHERS = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const GALAXY = path.join(ENGINES, "cam");
const OUT_MD = path.join(ROOT, "state", "shared", "CAM-AWARENESS-SNAPSHOT.md");
const OUT_JSON = path.join(ROOT, "state", "shared", "CAM-AWARENESS-SNAPSHOT.json");
// Memories are machine-global (outside the repo); fail-soft if absent on another host.
const MEM_DIR = "C:/Users/wompu/.claude/projects/H--prism/memory";

// Named constants (no magic numbers).
const RECENT_COMMIT_LIMIT = 6;
const DISPATCHER_FAMILY_PREVIEW = 18;
const MS_PER_HOUR = 3_600_000;
const HOUR_ROUND_FACTOR = 10; // 0.1h precision

const unknown = (why) => `(unknown — ${why})`;

function countEnginesByGlob(dir, prefix) {
  try {
    return readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(".ts")).length;
  } catch {
    return null;
  }
}

function countDir(dir, suffix = ".ts") {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(suffix)).length;
  } catch {
    return null;
  }
}

function camDispatcherActionFamilies() {
  // Count distinct cam_<family>_ action groups in camDispatcher.ts (best-effort, fail-soft).
  const file = path.join(DISPATCHERS, "camDispatcher.ts");
  try {
    const src = readFileSync(file, "utf8");
    const fams = new Set();
    let total = 0;
    const re = /\bcam_([a-z]+)_[a-z0-9_]+\b/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      fams.add(m[1]);
      total++;
    }
    return { families: [...fams].sort(), distinctFamilies: fams.size, occurrences: total };
  } catch {
    return { families: [], distinctFamilies: null, occurrences: null };
  }
}

/**
 * Resolve the real git directory for ROOT, handling the worktree case where
 * `<root>/.git` is a FILE containing `gitdir: <path>` rather than a directory.
 */
function resolveGitDir() {
  const dotGit = path.join(ROOT, ".git");
  try {
    const st = statSync(dotGit);
    if (st.isDirectory()) return dotGit;
    if (st.isFile()) {
      const txt = readFileSync(dotGit, "utf8").trim();
      const m = txt.match(/^gitdir:\s*(.+)$/m);
      if (m) return path.resolve(ROOT, m[1].trim());
    }
  } catch {
    /* fall through */
  }
  return null;
}

function currentBranch(gitDir) {
  if (!gitDir) return null;
  try {
    const head = readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
    const m = head.match(/^ref:\s*refs\/heads\/(.+)$/);
    return m ? m[1].trim() : head.slice(0, 12); // detached → short sha
  } catch {
    return null;
  }
}

function recentCamCommits(gitDir, n = RECENT_COMMIT_LIMIT) {
  if (!gitDir) return [];
  try {
    const reflog = readFileSync(path.join(gitDir, "logs", "HEAD"), "utf8");
    const lines = reflog.split(/\r?\n/).filter(Boolean);
    const out = [];
    // Reflog is chronological (oldest first); walk from newest backward.
    for (let i = lines.length - 1; i >= 0 && out.length < n; i--) {
      const tab = lines[i].indexOf("\t");
      if (tab < 0) continue;
      const meta = lines[i].slice(0, tab);
      const msg = lines[i].slice(tab + 1);
      if (!/^commit(\s|:)/.test(msg)) continue; // only commit movements
      if (!/cam/i.test(msg)) continue;
      const newSha = meta.split(/\s+/)[1];
      const subject = msg.replace(/^commit(\s*\([^)]*\))?:\s*/, "");
      out.push(`${(newSha || "").slice(0, 9)} ${subject}`.trim());
    }
    return out;
  } catch {
    return [];
  }
}

function galaxyFreshness() {
  const out = {};
  for (const f of ["CLAUDE.md", "MEMORY.md", "PATHS.md", "TOOLBELT.md"]) {
    const p = path.join(GALAXY, f);
    try {
      const ageH = (Date.now() - statSync(p).mtimeMs) / MS_PER_HOUR;
      out[f] = Math.round(ageH * HOUR_ROUND_FACTOR) / HOUR_ROUND_FACTOR;
    } catch {
      out[f] = null;
    }
  }
  return out;
}

function highRoiMemories() {
  try {
    return readdirSync(MEM_DIR)
      .filter((f) => /(_kilo_cam|^reference_cam_|^feedback_kilo_cam)/.test(f) && f.endsWith(".md"))
      .sort();
  } catch {
    return null;
  }
}

function collect() {
  const gitDir = resolveGitDir();
  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    branch: currentBranch(gitDir),
    engines: {
      camTopLevel: countEnginesByGlob(ENGINES, "CAM"),
      hyperMillTopLevel: countEnginesByGlob(ENGINES, "HyperMill"),
      hyperMillSubdir: countDir(path.join(ENGINES, "hypermill")),
      galaxyMdFiles: countDir(GALAXY, ".md"),
    },
    dispatcher: camDispatcherActionFamilies(),
    recentCamCommits: recentCamCommits(gitDir),
    galaxyFreshnessHours: galaxyFreshness(),
    highRoiMemories: highRoiMemories(),
  };
}

function renderMd(d) {
  const eng = d.engines;
  const camN = eng.camTopLevel == null ? unknown("engines dir unreadable") : `${eng.camTopLevel}`;
  const hyperN = (eng.hyperMillTopLevel == null && eng.hyperMillSubdir == null)
    ? unknown("hypermill dirs unreadable")
    : `${eng.hyperMillTopLevel ?? "?"} top-level + ${eng.hyperMillSubdir ?? "?"} in hypermill/ subdir`;
  const dispN = d.dispatcher.distinctFamilies == null
    ? unknown("camDispatcher unreadable")
    : `${d.dispatcher.distinctFamilies} distinct cam_* families · ${d.dispatcher.occurrences} action refs`;
  const memN = d.highRoiMemories == null
    ? unknown("memory dir not on this host")
    : `${d.highRoiMemories.length} CAM memories`;
  const memMtime = d.galaxyFreshnessHours["MEMORY.md"];
  const freshN = memMtime == null ? unknown("cam/MEMORY.md missing") : `${memMtime}h since last galaxy-brain edit`;

  const L = [];
  L.push("# 🛠️ CAM Awareness Snapshot (slot:kilo domain context)");
  L.push("");
  L.push(`_Generated ${d.generatedAt} · branch \`${d.branch ?? unknown("no git")}\` · regen: \`node scripts/cam-awareness-snapshot.mjs\`_`);
  L.push("");
  L.push("## Headline");
  L.push(`- **Engines:** ${camN} \`CAM*.ts\` top-level · hyperMILL ${hyperN} · ${eng.galaxyMdFiles ?? "?"} galaxy \`.md\` files`);
  L.push(`- **Dispatcher surface:** ${dispN} (prism_cam / camFunctionDispatcher / prism_toolpath)`);
  L.push(`- **Galaxy brain:** ${freshN} · ${memN}`);
  L.push("");
  L.push("## CAM in the print-to-part pipeline");
  L.push("CAM is the **middle**: `CAD (delta) ──features──▶ CAM (kilo: strategy + validated toolpath) ──▶ post-processor (echo: G-code)`.");
  L.push("Kilo emits strategy + collision-validated path; it does NOT own G-code dialect (echo), cut physics (foxtrot/whiskey/mike), speed/feed numerics (oscar), feature recognition (delta), or retrain (india).");
  L.push("");
  L.push("## Triad + key dispatcher families");
  L.push("- **Triad:** `cam_strategy_recommend` → `toolpath_generate` → `collision_check_full` (+ `cam_safety_validate`).");
  if (d.dispatcher.families.length > 0) {
    const fam = d.dispatcher.families.slice(0, DISPATCHER_FAMILY_PREVIEW).join(", ");
    L.push(`- **cam_* families:** ${fam}${d.dispatcher.families.length > DISPATCHER_FAMILY_PREVIEW ? " …" : ""}`);
  }
  L.push("- **AI/LoRA/closed-loop:** `cam_ai_orchestrate/validate`, `cam_lora_*`, `cam_calibration_*`, `cam_feedback_*` (incl `cam_feedback_lora_training_export`).");
  L.push("");
  L.push("## Invariants (kilo doctrine — never violate)");
  L.push("1. Canonical physics constants from `src/physics/constants.ts` — never inline in a strategy/toolpath calc.");
  L.push("2. No toolpath ships without `collision_check_full` at the operating engagement — verdict carries a CLEARANCE NUMBER, never bare \"safe\".");
  L.push("3. Cross-CAM transfer via `CAM_VENDOR_REGISTRY` / `CAMCrossSystemTranslator` — same-physics-class ≠ same-parameter-name.");
  L.push("4. shop_floor tier (Ω≥0.95, S(x)≥0.98) on every recommendation.");
  L.push("5. CAM terminates in a validated strategy handoff to echo — never emits `O####`/`G##` dialect.");
  L.push("");
  L.push("## PSN edges (this galaxy)");
  L.push("delta→CAM (features) · CAM→echo (G-code handoff) · foxtrot/whiskey/mike↔CAM (cut physics) · oscar→CAM (speed/feed) · CAM→india (`xproc_outcome_publish` → GNN tier-5 + retrain) · tango→CAM (NURBS/geodesic/BVH).");
  L.push("");
  L.push("## High-ROI CAM memories");
  if (d.highRoiMemories == null) {
    L.push(`- ${unknown("memory dir not on this host")}`);
  } else if (d.highRoiMemories.length === 0) {
    L.push("- (none found — investigate: galaxy buildout should have seeded ≥6)");
  } else {
    for (const m of d.highRoiMemories) L.push(`- ${m.replace(/\.md$/, "")}`);
  }
  L.push("");
  L.push("## Recent CAM commits");
  if (d.recentCamCommits.length === 0) {
    L.push(`- ${unknown("no CAM commits in reflog / git unavailable")}`);
  } else {
    for (const c of d.recentCamCommits) L.push(`- ${c}`);
  }
  L.push("");
  L.push("_Full galaxy: `mcp-server/src/engines/cam/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md` · soul: `state/shared/slot-souls/kilo.md` · wiki: `knowledge/wiki/architecture/cam-galaxy.md`._");
  return L.join("\n");
}

function main() {
  const argv = process.argv.slice(2);
  const d = collect();
  const md = renderMd(d);
  if (argv.includes("--stdout")) {
    process.stdout.write(md + "\n");
  } else {
    writeFileSync(OUT_MD, md + "\n", "utf8");
    writeFileSync(OUT_JSON, JSON.stringify(d, null, 2) + "\n", "utf8");
    process.stdout.write(`[cam-awareness-snapshot] wrote ${path.relative(ROOT, OUT_MD)} + .json\n`);
    if (argv.includes("--json")) process.stdout.write(JSON.stringify(d, null, 2) + "\n");
  }
}

try {
  main();
} catch (e) {
  process.stderr.write(`[cam-awareness-snapshot] ${e?.message || e}\n`);
  process.exit(1);
}
