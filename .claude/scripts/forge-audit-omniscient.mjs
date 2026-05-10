#!/usr/bin/env node
// forge-audit-omniscient.mjs
// Top-level orchestrator for /forge-audit upgraded to omniscient mode.
// Runs phases 0/2/4/5 inline (pure file I/O) and emits dispatch plans for
// phases 1 (parallel domain scrutiny) and 3 (CoVe verification) which the
// caller (Claude) reads and dispatches Agents from.
//
// First-ship behavior: phase 1 fan-out is satisfied by the existing
// agent-findings-v3/ corpus (10 domains × 1 agent). Phase 3 verification
// is suppressed unless --verify is passed (v3 confidence already ~0.82).
//
// Spec: H:/prism/state/shared/specs/2026-05-09-U-FORGE-AUDIT-OMNISCIENT.md

import { spawnSync } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "H:/prism";
const SCRIPTS = join(ROOT, ".claude/scripts");
const SHARED = join(ROOT, "state/shared");
const VIZ = join(SHARED, "system-viz");
const ARGS = new Set(process.argv.slice(2));
const VERBOSE = ARGS.has("--verbose") || ARGS.has("-v");
const QUICK = ARGS.has("--quick");
const NO_COMPOUND = ARGS.has("--no-phase5");
const VERIFY = ARGS.has("--verify"); // emits phase3 dispatch plan

const FINDINGS_FLAG = "--findings-dir";
const BASELINE_FLAG = "--baseline";
function flagValue(name) {
  const i = process.argv.indexOf(name);
  return i > 0 && i < process.argv.length - 1 ? process.argv[i + 1] : null;
}
const FINDINGS_DIR =
  flagValue(FINDINGS_FLAG) || join(VIZ, "agent-findings-v3");
const BASELINE_PATH =
  flagValue(BASELINE_FLAG) || join(SHARED, "audit-baseline.json");

function log(...m) {
  if (VERBOSE) console.log("[orch]", ...m);
}

function runPhase(scriptName, extraArgs = []) {
  const start = Date.now();
  const script = join(SCRIPTS, scriptName);
  if (!existsSync(script)) {
    return { ok: false, error: `missing script: ${script}`, elapsedMs: 0 };
  }
  const args = [script, ...extraArgs];
  if (VERBOSE) args.push("--verbose");
  const r = spawnSync(process.execPath, args, {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const elapsedMs = Date.now() - start;
  if (VERBOSE && r.stdout) process.stdout.write(r.stdout);
  if (r.status !== 0 || r.signal) {
    const why = r.signal ? `signal=${r.signal}` : `exit=${r.status}`;
    return {
      ok: false,
      error: `${scriptName} ${why}\nSTDOUT-tail:\n${(r.stdout || "").slice(-400)}\nSTDERR-tail:\n${(r.stderr || "").slice(-800)}`,
      elapsedMs,
    };
  }
  return {
    ok: true,
    stdoutTail: (r.stdout || "").split(/\r?\n/).slice(-3).join("\n"),
    elapsedMs,
  };
}

function emitPhase1DispatchPlan() {
  // Spec §70-78: 10 domains × {code-archaeologist, code-analyzer, [physics-reviewer]}.
  // Claude reads this and dispatches Agents in subsequent turns.
  // First-ship default: skip — v3 corpus already covers it.
  const domains = [
    { name: "ai-reasoning", physics: false },
    { name: "cad-ingest", physics: false },
    { name: "cam-bridges", physics: false },
    { name: "edm", physics: true },
    { name: "knowledge-memory", physics: false },
    { name: "lathe", physics: true },
    { name: "mill", physics: true },
    { name: "physics-safety", physics: true },
    { name: "quote-erp-biz", physics: false },
    { name: "ux-studios", physics: false },
  ];
  const tasks = [];
  for (const d of domains) {
    const roles = ["code-archaeologist", "code-analyzer"];
    if (d.physics) roles.push("physics-reviewer");
    for (const role of roles) {
      tasks.push({
        domain: d.name,
        subagent_type: role,
        outputPath: `state/shared/system-viz/agent-findings-v4/${d.name}/${role}.json`,
        timeBoxMin: 6,
      });
    }
  }
  const plan = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    phase: 1,
    note:
      "First-ship: skipped — v3 corpus at agent-findings-v3/ provides phase 1 coverage. " +
      "Re-run /forge-audit with --refresh-phase1 to dispatch these 25 agents.",
    parallelism: "mesh",
    tasks,
  };
  const out = join(VIZ, "phase1-dispatch-plan.json");
  writeFileSync(out, JSON.stringify(plan, null, 2));
  log(`phase1: dispatch plan written (${tasks.length} tasks) → ${out}`);
  return out;
}

function emitPhase3DispatchPlan(findingsCount) {
  if (!VERIFY) {
    log("phase3: skipped (no --verify flag)");
    return null;
  }
  const plan = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    phase: 3,
    pattern: "Chain-of-Verification (Dhuliawala et al. 2023)",
    note:
      "Spawn 1-shot general-purpose verifier per finding. Confirm or refute with file:line evidence. " +
      "Only ≥0.7 confidence findings advance to AUDIT-LATEST.",
    findingsCount,
    perFindingTimeBoxMin: 2,
    deleteConsensus: {
      subagent: "byzantine-coordinator",
      threshold: "3-of-3",
      rationale: "Dead-code deletion is irreversible; require strict consensus.",
    },
  };
  const out = join(VIZ, "phase3-dispatch-plan.json");
  writeFileSync(out, JSON.stringify(plan, null, 2));
  log(`phase3: dispatch plan written → ${out}`);
  return out;
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

async function main() {
  ensureDir(VIZ);
  const overall = { startedAt: new Date().toISOString(), phases: {} };

  console.log("forge-audit-omniscient: starting");
  console.log(`  findings-dir: ${FINDINGS_DIR}`);
  console.log(`  baseline: ${BASELINE_PATH}`);
  console.log(
    `  flags: ${[QUICK && "quick", VERIFY && "verify", NO_COMPOUND && "no-phase5"].filter(Boolean).join(",") || "(default)"}`,
  );

  // Phase 0
  console.log("\n[0/5] awareness load");
  overall.phases.phase0 = runPhase("audit-phase0-awareness.mjs");
  if (!overall.phases.phase0.ok) {
    console.error("phase0 failed:", overall.phases.phase0.error);
    process.exit(2);
  }
  console.log(`  ✓ phase0 (${overall.phases.phase0.elapsedMs}ms)`);

  // Phase 1 — emit dispatch plan; first-ship uses v3
  console.log("\n[1/5] domain scrutiny (dispatch plan)");
  const plan1 = emitPhase1DispatchPlan();
  overall.phases.phase1 = {
    ok: true,
    dispatchPlan: plan1,
    note: "first-ship uses v3 corpus",
  };
  console.log(`  ✓ phase1 plan emitted (v3 corpus consumed)`);

  // Phase 2
  console.log("\n[2/5] cross-domain analysis");
  const phase2Args = QUICK ? ["--quick"] : [];
  overall.phases.phase2 = runPhase("audit-phase2-crossdomain.mjs", phase2Args);
  if (!overall.phases.phase2.ok) {
    console.error("phase2 failed:", overall.phases.phase2.error);
    process.exit(2);
  }
  console.log(`  ✓ phase2 (${overall.phases.phase2.elapsedMs}ms)`);

  // Phase 4 — synthesis (must run before phase 3 dispatch plan needs counts)
  console.log("\n[4/5] synthesis");
  overall.phases.phase4 = runPhase("audit-phase4-synthesize.mjs", [
    FINDINGS_FLAG,
    FINDINGS_DIR,
    BASELINE_FLAG,
    BASELINE_PATH,
  ]);
  if (!overall.phases.phase4.ok) {
    console.error("phase4 failed:", overall.phases.phase4.error);
    process.exit(2);
  }
  console.log(`  ✓ phase4 (${overall.phases.phase4.elapsedMs}ms)`);

  // Phase 3 dispatch plan (post-synthesis so we know finding count)
  console.log("\n[3/5] verification (dispatch plan)");
  const plan3 = emitPhase3DispatchPlan(0); // counts unused first-ship
  overall.phases.phase3 = {
    ok: true,
    dispatchPlan: plan3,
    skipped: !VERIFY,
  };
  console.log(`  ✓ phase3 ${VERIFY ? "plan emitted" : "skipped (no --verify)"}`);

  // Phase 5 — compound
  if (NO_COMPOUND) {
    console.log("\n[5/5] compound (skipped)");
    overall.phases.phase5 = { ok: true, skipped: true };
  } else {
    console.log("\n[5/5] compound");
    overall.phases.phase5 = runPhase("audit-phase5-compound.mjs");
    if (!overall.phases.phase5.ok) {
      console.error("phase5 failed:", overall.phases.phase5.error);
      // Phase 5 failure is non-fatal — artifacts already exist
    }
    console.log(`  ${overall.phases.phase5.ok ? "✓" : "⚠"} phase5 (${overall.phases.phase5.elapsedMs || 0}ms)`);
  }

  overall.finishedAt = new Date().toISOString();
  overall.totalMs = Object.values(overall.phases).reduce(
    (s, p) => s + (p.elapsedMs || 0),
    0,
  );

  console.log("\nforge-audit-omniscient: complete");
  console.log(`  total: ${overall.totalMs}ms`);
  console.log(
    "  artifacts:\n" +
      "    state/shared/AUDIT-LATEST.json\n" +
      "    state/shared/AUDIT-LATEST.md\n" +
      "    state/shared/system-viz/audit-overlay.json   ★ load-bearing\n" +
      "    state/shared/AUDIT-DELTA.md",
  );

  writeFileSync(
    join(VIZ, "forge-audit-orchestration.json"),
    JSON.stringify(overall, null, 2),
  );
}

main().catch((e) => {
  console.error("orchestrator failed:", e);
  process.exit(1);
});
