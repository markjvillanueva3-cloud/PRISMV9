// cimco-nav-planner.mjs — PRISM → CIMCO Edit 2026 goal-driven blind-navigation PLANNER.
//
// "Continue plotting the entire CIMCO app for full blind navigation so we can utilize it to test
//  all PRISM-generated post processors." (CIMCO-INTEGRATION-MS0, slot:echo, operator goal)
//
// Where cimco-nav-map.mjs is the EXHAUSTIVE *static* surface index (511 menus/dialogs/tabs keyed by
// automation channel) and `synthesis.criticalProcedures` is a *passive* baked-in step list, THIS
// module is the EXECUTABLE layer: given a concrete proof job — "prove THIS post on THIS JM machine"
// — it composes the ordered, channel-prioritized, fail-loud step plan, resolves the JM machine →
// CIMCO sim .mcfg (via jm-fleet-sim-map.json), substitutes the real file/machine into each launch
// template, and classifies WHICH proof arm is actually available offline vs. what blocks the rest.
//
// It is the planner SPINE-2 (the UIA Simulation-Report driver) consumes: SPINE-2 executes the UIA
// steps this planner emits; the blind-safe arms (CLI launch, External-Command FILE verdict, offline
// byte-equivalence) it emits are runnable TODAY with no GUI.
//
// HONEST about reach (R12 — never fake a verdict):
//   • open / verify-external / compare → blind-driveable (CLI launch + FILE-channel verdict /
//     offline compareNC math). These need NO GUI and NO live license.
//   • simulate (the collision/gouge Machine-Simulation verdict) → UIA-ONLY on the live licensed app.
//     The plan emits the exact UIA steps but flags blindDriveable:false + the real blockers
//     (SPINE-2 UIA driver unbuilt, live license, units/kinematics verify).
//   • EDM machines (status:not-applicable) → CIMCO models mill/lathe only; routed to discharge-physics.
//
// A launch pattern is only marked verified:true if launch-surface.json proved it (exe present AND
// documented). An unverified pattern (e.g. the open-pair File-Compare CLI) carries needsLiveVerify
// — the planner NEVER promotes an inferred flag to verified (the 25.4×/fail-open class of trap).
//
// Canonical loaders are reused from ./cimco-nav-map.mjs (loadNavMap/queryNav/CHANNEL_RANK) — no dup.
// Wiki: [[cimco-verification-simulation-integration]] · siblings: cimco-nav-map.mjs, cimco-launch-probe.mjs
// Tests: scripts/cimco-nav-planner.test.mjs. Data: state/shared/cimco/{nav-map,launch-surface,jm-fleet-sim-map}.json.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadNavMap, queryNav, CHANNEL_RANK } from "./cimco-nav-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

export const LAUNCH_SURFACE_PATH =
  process.env.PRISM_CIMCO_LAUNCH_SURFACE || resolve(REPO, "state/shared/cimco/launch-surface.json");
export const JM_SIM_MAP_PATH =
  process.env.PRISM_CIMCO_JM_SIM_MAP || resolve(REPO, "state/shared/cimco/jm-fleet-sim-map.json");

/**
 * Proof arms — the distinct ways PRISM can produce a verdict on a post. Ordered most→least blind-safe.
 * The planner classifies each job onto exactly one PRIMARY arm + lists the available alternatives.
 */
export const PROOF_ARMS = Object.freeze({
  BYTE_EQUIV: "byte-equiv", // offline compareNC vs a golden NC (no GUI, no license). Needs same-source CAM for TRUE parity.
  EXTERNAL_CMD: "external-cmd", // CIMCO External-Commands FILE-channel hook → PRISM verifier writes $OUTFILE. Blind-safe, in-app, STATIC verdict (dialect/structure), NOT collision.
  SIM_UIA: "sim-uia", // Machine-Simulation collision/gouge/over-travel verdict. UIA + live license (SPINE-2). The only TRUE kinematic verdict.
  DISCHARGE_PHYSICS: "discharge-physics", // EDM — CIMCO can't model; PRISM discharge-physics sim owns it.
});

/** The proof jobs a caller can request. Each declares its required fields (validated fail-loud). */
export const JOB_TYPES = Object.freeze(["open", "verify-external", "compare", "simulate"]);

/** Phases a plan step can belong to (ordered as they execute). */
export const PHASES = Object.freeze([
  "launch",
  "load-input",
  "load-machine",
  "compare",
  "run-sim",
  "read-verdict",
]);

// ─── Fail-loud loaders (a blind-nav driver must never silently operate on empty inputs) ──────────

/** Load launch-surface.json (U-CIMCO-LAUNCH-PROBE). Throws if absent/corrupt. */
export function loadLaunchSurface(src = LAUNCH_SURFACE_PATH) {
  return _loadJson(src, "cimco launch-surface", "run scripts/cimco-launch-probe.mjs author (U-CIMCO-LAUNCH-PROBE)");
}

/** Load jm-fleet-sim-map.json (U-CIMCO-JM-MACHINE-MAP). Throws if absent/corrupt. */
export function loadSimMap(src = JM_SIM_MAP_PATH) {
  return _loadJson(src, "cimco jm-fleet-sim-map", "run scripts/cimco-jm-machine-map.mjs author (U-CIMCO-JM-MACHINE-MAP)");
}

function _loadJson(src, label, regenHint) {
  if (src && typeof src === "object") return src;
  const p = String(src);
  if (!existsSync(p)) throw new Error(`${label} not found: ${p} (${regenHint})`);
  let raw;
  try {
    raw = readFileSync(p, "utf8");
  } catch (e) {
    throw new Error(`${label} not readable: ${p} (${e.code || e.message})`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`${label} not valid JSON: ${p} (${e.message})`);
  }
}

/**
 * Resolve a JM machine entry by id (e.g. "VMC-03"). FAIL-LOUD on an unknown id — a silent miss would
 * let a caller "prove" a post against the wrong (or no) machine, the kinematic-mismatch trap.
 * @param {object} simMap - loaded jm-fleet-sim-map.json
 * @param {string} jmMachineId
 * @returns {object} the machine entry
 */
export function resolveJmMachine(simMap, jmMachineId) {
  const machines = Array.isArray(simMap?.machines) ? simMap.machines : [];
  const want = String(jmMachineId || "").trim().toLowerCase();
  if (!want) throw new Error("resolveJmMachine: jmMachineId is required");
  const hit = machines.find((m) => String(m.machine_id || "").toLowerCase() === want);
  if (!hit) {
    const known = machines.map((m) => m.machine_id).join(", ");
    throw new Error(`resolveJmMachine: unknown JM machine "${jmMachineId}". Known: ${known}`);
  }
  return hit;
}

// ─── Nav-surface attachment (back each UIA/file step with the real nav-map surface ids) ──────────

/**
 * Best-effort: ids of proof-relevant nav surfaces whose id/label/area/action/path matches ANY keyword.
 * Returns [] (honest empty — not a throw) when the map doesn't cover the phase; an empty list is itself
 * a signal that the static map is missing that surface (feeds the blind-nav gap list).
 */
export function surfaceIdsMatching(navMap, keywords, { proofRelevant = true, limit = 6 } = {}) {
  const kws = (Array.isArray(keywords) ? keywords : [keywords]).map((k) => String(k).toLowerCase());
  const rows = queryNav(navMap, { proofRelevant }).surfaces || [];
  const out = [];
  for (const s of rows) {
    const hay = [s.id, s.label, s.area, s.action, s.path].map((f) => String(f ?? "").toLowerCase());
    if (kws.some((kw) => hay.some((h) => h.includes(kw)))) {
      out.push(s.id);
      if (out.length >= limit) break;
    }
  }
  return out;
}

// ─── Step builders ───────────────────────────────────────────────────────────────────────────

/**
 * The verified blind CLI launch step (open the candidate NC in CIMCO Edit, bypassing File>Open).
 * Uses the launch-surface "open-file" pattern ONLY if it is verified:true; otherwise emits the step
 * but marks verified:false + blindSafe:false (never promotes an unverified launch to blind-safe).
 */
function launchOpenFileStep(seq, launchSurface, ncFile) {
  const patterns = Array.isArray(launchSurface?.launchPatterns) ? launchSurface.launchPatterns : [];
  const open = patterns.find((p) => p.id === "open-file");
  const verified = !!(open && open.verified === true && open.needsLiveVerify !== true);
  const template = (open?.template || 'CIMCOEdit.exe "<ncFilePath>"').replace(/<ncFilePath>/g, ncFile);
  return {
    seq,
    phase: "launch",
    channel: "cli",
    blindSafe: verified, // verified CLI launch is the one truly blind-safe entry point
    requiresUia: false,
    requiresLicense: false,
    verified,
    action: "Launch CIMCO Edit with the candidate NC as a command-line arg (bypasses the File>Open modal).",
    template,
    note: verified
      ? "Verified blind launch (exe present + documented file-association behavior)."
      : "open-file pattern NOT verified in launch-surface.json — treat as needs-live-verify, not blind-safe.",
  };
}

/** The blind-safe FILE-channel External-Command verdict steps (no UIA, no license). */
function externalCommandSteps(seqStart, launchSurface, ncFile) {
  const hook = launchSurface?.integrationHook;
  if (!hook || hook.blindSafe !== true) {
    return {
      steps: [],
      blocked: ["external-command-hook-unavailable (launch-surface.integrationHook missing or not blindSafe)"],
    };
  }
  const macros = hook.macros || {};
  const outfile = macros.$OUTFILE ? String(macros.$OUTFILE) : "$PATH\\$FILENOEXT.NEW";
  return {
    steps: [
      {
        seq: seqStart,
        phase: "read-verdict",
        channel: "file",
        blindSafe: true,
        requiresUia: false,
        requiresLicense: false,
        action:
          "Invoke the registered External Command 'PRISM Verify' on the open NC ($FILEPATH). CIMCO calls the PRISM verifier; the verdict is written to $OUTFILE — a FILE-channel result PRISM reads back. One-time setup: Editor Setup > External Commands.",
        template: `PRISM-verify "${ncFile}"  →  ${outfile}`,
        navSurfaceIds: ["editor.setup.externalcommands"],
        note:
          "STATIC/STRUCTURAL verdict (dialect-vocab lint + byte-equiv if a golden is provided) — NOT the collision/gouge Machine-Simulation verdict. This is the blind-safe arm that covers EVERY post with no GUI.",
        prerequisite: `Register PRISM verifier once as External Command 1 (where: ${hook.where || "Editor Setup > External Commands"}).`,
      },
    ],
    blocked: [],
  };
}

// ─── Core planner ────────────────────────────────────────────────────────────────────────────

/**
 * Compose the blind-navigation plan for a single proof job.
 * @param {object} job
 * @param {"open"|"verify-external"|"compare"|"simulate"} job.jobType
 * @param {string} job.ncFile - path to the candidate NC program (always required)
 * @param {string} [job.jmMachineId] - JM fleet id (required for "simulate")
 * @param {string} [job.goldenFile] - golden NC path (required for "compare")
 * @param {object} [ctx] - { navMap, launchSurface, simMap } (loaded once; auto-loaded fail-loud if absent)
 * @returns {object} { job, machine, steps, verdictArm, alternativeArms, blindDriveable, blockedBy, warnings, note }
 */
export function planNavigation(job = {}, ctx = {}) {
  const jobType = String(job.jobType || "").trim().toLowerCase();
  if (!JOB_TYPES.includes(jobType)) {
    throw new Error(`planNavigation: invalid jobType "${job.jobType}". One of: ${JOB_TYPES.join(", ")}`);
  }
  const ncFile = String(job.ncFile || "").trim();
  if (!ncFile) throw new Error(`planNavigation: ncFile is required for jobType "${jobType}"`);

  const navMap = ctx.navMap || loadNavMap();
  const launchSurface = ctx.launchSurface || loadLaunchSurface();
  const simMap = ctx.simMap || loadSimMap();

  const steps = [];
  const blockedBy = [];
  const warnings = [];
  const alternativeArms = [];
  let verdictArm = null;
  let machineOut = null;

  // Every job starts by launching/opening the candidate NC (verified blind CLI launch).
  const launchStep = launchOpenFileStep(1, launchSurface, ncFile);
  steps.push(launchStep);
  if (!launchStep.blindSafe) blockedBy.push("launch-pattern-unverified");

  if (jobType === "open") {
    // Just load it for inspection — no verdict produced.
    verdictArm = null;
    return _finish(jobType, ncFile, machineOut, steps, verdictArm, alternativeArms, blockedBy, warnings,
      "Opens the candidate NC in CIMCO Edit for inspection. No verdict — pair with verify-external/compare/simulate.");
  }

  if (jobType === "verify-external") {
    const ext = externalCommandSteps(2, launchSurface, ncFile);
    for (const s of ext.steps) steps.push(s);
    blockedBy.push(...ext.blocked);
    verdictArm = ext.steps.length ? PROOF_ARMS.EXTERNAL_CMD : null;
    if (verdictArm) alternativeArms.push(PROOF_ARMS.BYTE_EQUIV);
    const note = verdictArm
      ? "Blind-safe in-app static verdict via the External-Commands FILE hook — covers every post, no GUI/license. Static (dialect/structure), not collision."
      : "NO verdict producible: the External-Commands integration hook is unavailable in launch-surface.json (integrationHook missing or not blindSafe). Re-run cimco-launch-probe or use compare/simulate.";
    return _finish(jobType, ncFile, machineOut, steps, verdictArm, alternativeArms, blockedBy, warnings, note);
  }

  if (jobType === "compare") {
    const goldenFile = String(job.goldenFile || "").trim();
    if (!goldenFile) throw new Error('planNavigation: goldenFile is required for jobType "compare"');
    // The REAL verdict is offline compareNC (nc-normalize + dialect masks) — no CIMCO, no GUI, no license.
    steps.push({
      seq: 2,
      phase: "compare",
      channel: "file",
      blindSafe: true,
      requiresUia: false,
      requiresLicense: false,
      action:
        "Offline byte-equivalence: PRISM compareNC(golden, candidate) via nc-normalize + per-dialect volatileCommentMask → byte-identical | volatile-header-only | semantic-drift. This IS the verdict; CIMCO is not needed for the math.",
      template: `compareNC "${goldenFile}" "${ncFile}"`,
      note: "TRUE parity requires the golden be from the SAME CAM source as the candidate (else apples-to-oranges — surfaced as a warning, not a pass).",
    });
    // Optional human-review-only CIMCO File Compare (UIA, open-pair is needsLiveVerify — NOT blind-safe).
    const patterns = Array.isArray(launchSurface?.launchPatterns) ? launchSurface.launchPatterns : [];
    const pair = patterns.find((p) => p.id === "open-pair");
    steps.push({
      seq: 3,
      phase: "read-verdict",
      channel: "uia",
      blindSafe: false,
      requiresUia: true,
      requiresLicense: false,
      optional: true,
      action: "OPTIONAL human review: open golden+candidate side-by-side in CIMCO's File Compare (visual only).",
      template: (pair?.template || 'CIMCOEdit.exe "<goldenPath>" "<candidatePath>"')
        .replace(/<goldenPath>/g, goldenFile)
        .replace(/<candidatePath>/g, ncFile),
      verified: false,
      note: "open-pair launch is needsLiveVerify and the Compare ACTION is UIA-only — for human eyes, not the blind verdict.",
    });
    warnings.push("byte-equivalence parity is only valid if golden + candidate share a CAM source");
    verdictArm = PROOF_ARMS.BYTE_EQUIV;
    alternativeArms.push(PROOF_ARMS.EXTERNAL_CMD);
    // The offline math is blind-safe even though the optional CIMCO view is UIA → plan stays blind-driveable.
    return _finish(jobType, ncFile, machineOut, steps, verdictArm, alternativeArms, blockedBy, warnings,
      "Offline byte-equivalence is the blind-safe verdict; the CIMCO File-Compare step is optional human review only.", { ignoreOptionalForBlind: true });
  }

  // jobType === "simulate" — the collision/gouge Machine-Simulation verdict (the hard, UIA-gated one).
  const jmMachineId = String(job.jmMachineId || "").trim();
  if (!jmMachineId) throw new Error('planNavigation: jmMachineId is required for jobType "simulate"');
  const machine = resolveJmMachine(simMap, jmMachineId);
  machineOut = {
    machine_id: machine.machine_id,
    machine_name: machine.machine_name,
    type: machine.type,
    status: machine.status,
    cimcoMatch: machine.cimcoMatch
      ? { file: machine.cimcoMatch.file, displayName: machine.cimcoMatch.displayName, unitsResolved: machine.cimcoMatch.unitsResolved }
      : null,
    mustVerifyKinematics: !!machine.mustVerifyKinematics,
  };

  if (machine.status === "not-applicable") {
    // EDM — CIMCO models mill/lathe only. Opening the NC in CIMCO to "simulate" is pointless, so the
    // CIMCO launch step is dropped and the plan routes the verdict to PRISM discharge-physics. The
    // resulting blindDriveable:true HONESTLY means "PRISM produces this verdict blind" — not via CIMCO.
    steps.length = 0;
    blockedBy.length = 0; // the launch-derived blocker is moot once the launch step is dropped
    blockedBy.push("cimco-cannot-model-edm");
    steps.push({
      seq: 1,
      phase: "read-verdict",
      channel: "file",
      blindSafe: true,
      requiresUia: false,
      requiresLicense: false,
      action: `${machine.type} verdict belongs to PRISM discharge-physics sim, NOT CIMCO (which models mill/lathe kinematics only).`,
      template: `prism discharge-physics sim "${ncFile}" (${machine.machine_name})`,
      note: "CIMCO Machine-Simulation is structurally inapplicable to EDM (tribal tip #10). Byte-equivalence is the only CIMCO-adjacent arm, and only with a same-source golden.",
    });
    verdictArm = PROOF_ARMS.DISCHARGE_PHYSICS;
    alternativeArms.push(PROOF_ARMS.BYTE_EQUIV);
    warnings.push(`${machine.machine_id} is ${machine.type} — CIMCO Machine-Simulation models mill/lathe only (tribal tip #10).`);
    return _finish(jobType, ncFile, machineOut, steps, verdictArm, alternativeArms, blockedBy, warnings,
      "EDM machine: the verdict is PRISM discharge-physics (blind-safe); CIMCO sim is not applicable. Byte-equivalence available if a same-source golden exists.");
  }

  // Data-integrity fail-loud: a mill/lathe (status != not-applicable) MUST carry a sim .mcfg. A null
  // cimcoMatch here = corrupt sim-map; never silently invent an EDM/discharge-physics verdict for it.
  if (!machine.cimcoMatch) {
    throw new Error(
      `planNavigation: ${machine.machine_id} (${machine.type}, status=${machine.status}) has no cimcoMatch — corrupt jm-fleet-sim-map (a mill/lathe must resolve to a sim .mcfg). Re-run cimco-jm-machine-map.mjs.`,
    );
  }
  // Load the mapped sim .mcfg into Machine Simulation (UIA).
  const mcfg = machine.cimcoMatch;
  steps.push({
    seq: 2,
    phase: "load-machine",
    channel: "uia",
    blindSafe: false,
    requiresUia: true,
    requiresLicense: false,
    action: `Open Machine Simulation setup and select the mapped sim machine "${mcfg.displayName}" (${mcfg.file}).`,
    template: `Setup > Machine Simulation > Machine = "${mcfg.displayName}"`,
    navSurfaceIds: surfaceIdsMatching(navMap, ["machine", "simulation setup", "setup"], { limit: 4 }),
    note: `Mapping is a CANDIDATE (${machine.status}, score ${mcfg.score ?? "n/a"}). mustVerifyKinematics=${!!machine.mustVerifyKinematics}.`,
  });
  // Run the simulation (UIA + live license).
  steps.push({
    seq: 3,
    phase: "run-sim",
    channel: "uia",
    blindSafe: false,
    requiresUia: true,
    requiresLicense: true,
    action: "Run Machine Simulation over the loaded NC (collision / over-travel / gouge detection).",
    template: "Machine Simulation > Run",
    navSurfaceIds: surfaceIdsMatching(navMap, ["simulat", "backplot", "run"], { limit: 4 }),
    note: "Requires a valid CIMCO license (Sys/KeyManager.exe). The collision verdict is GUI-only.",
  });
  // Read the Simulation Report → parse via the existing prism_cimco:cimco_sim_report_evaluate gate.
  steps.push({
    seq: 4,
    phase: "read-verdict",
    channel: "uia",
    blindSafe: false,
    requiresUia: true,
    requiresLicense: true,
    action:
      "Export / read the Simulation Report, then parse it through prism_cimco:cimco_sim_report_evaluate for the pass/fail gate (fail-CLOSED: an empty report ≠ cleared-for-live-run).",
    template: "Machine Simulation > Simulation Report → cimco_sim_report_evaluate",
    navSurfaceIds: surfaceIdsMatching(navMap, ["report", "simulation report", "collision"], { limit: 4 }),
    note: "This is the SPINE-2 UIA report-reader keystone — the only TRUE kinematic verdict.",
  });

  verdictArm = PROOF_ARMS.SIM_UIA;
  alternativeArms.push(PROOF_ARMS.EXTERNAL_CMD, PROOF_ARMS.BYTE_EQUIV);
  blockedBy.push("uia-driver-unbuilt (SPINE-2 UIA report reader)", "live-cimco-license-required");
  if (machine.mustVerifyKinematics) blockedBy.push("must-verify-kinematics-vs-real-machine");
  if (mcfg.unitsResolved === false) {
    blockedBy.push("units-unverified-25.4x-guard");
    warnings.push(`${machine.machine_id} sim .mcfg units unresolved (candidate=${mcfg.unit}; JM convention=INCH) — resolve before any live run (25.4× scale-error guard).`);
  }
  return _finish(jobType, ncFile, machineOut, steps, verdictArm, alternativeArms, blockedBy, warnings,
    "The collision/gouge verdict is UIA + live-license gated (SPINE-2). Blind-safe today: External-Command static verdict + offline byte-equivalence. A CIMCO-clean result is conformance-clean, NOT controller-verified.");
}

/**
 * Assemble the final plan object. `blindDriveable` means "PRISM can obtain the job's RESULT blind"
 * — so it requires both (a) all required steps blind-safe AND (b) a producible verdict arm (except
 * for "open", which is verdict-less by design). A verdict-bearing job whose arm came back null (e.g.
 * verify-external with no integration hook) is therefore NOT blind-driveable — never read true when
 * no verdict is produced (the safety-adjacent honesty gap arm-B caught).
 */
function _finish(jobType, ncFile, machine, steps, verdictArm, alternativeArms, blockedBy, warnings, note, opts = {}) {
  const required = opts.ignoreOptionalForBlind ? steps.filter((s) => !s.optional) : steps;
  const stepsBlind = required.length > 0 && required.every((s) => s.blindSafe === true);
  const verdictProducible = verdictArm !== null;
  const blindDriveable = stepsBlind && (jobType === "open" || verdictProducible);
  return {
    schemaVersion: "1.0.0",
    job: { jobType, ncFile, ...(machine ? { jmMachineId: machine.machine_id } : {}) },
    machine,
    steps: steps.sort((a, b) => a.seq - b.seq),
    stepCount: steps.length,
    channelPlan: steps.map((s) => s.channel),
    verdictArm,
    verdictProducible,
    alternativeArms: [...new Set(alternativeArms)],
    blindDriveable,
    blockedBy: [...new Set(blockedBy)],
    warnings: [...new Set(warnings)],
    note,
  };
}

/**
 * Fleet rollup: the simulate-plan verdict-arm + driveability for EVERY JM machine. The single
 * "how do we prove out the whole fleet, and what blocks each one?" answer the operator goal needs.
 * @param {object} [ctx] - { navMap, launchSurface, simMap }
 * @param {string} [ncFilePlaceholder] - a representative NC path used in every plan's launch template
 */
export function planFleet(ctx = {}, ncFilePlaceholder = "<candidate.nc>") {
  const simMap = ctx.simMap || loadSimMap();
  const navMap = ctx.navMap || loadNavMap();
  const launchSurface = ctx.launchSurface || loadLaunchSurface();
  const fullCtx = { navMap, launchSurface, simMap };
  const machines = Array.isArray(simMap?.machines) ? simMap.machines : [];
  const rows = machines.map((m) => {
    const plan = planNavigation({ jobType: "simulate", ncFile: ncFilePlaceholder, jmMachineId: m.machine_id }, fullCtx);
    return {
      machine_id: m.machine_id,
      machine_name: m.machine_name,
      type: m.type,
      status: m.status,
      verdictArm: plan.verdictArm,
      blindDriveable: plan.blindDriveable,
      blockedBy: plan.blockedBy,
      simMcfg: m.cimcoMatch ? m.cimcoMatch.displayName : null,
    };
  });
  const byArm = {};
  for (const r of rows) byArm[r.verdictArm || "none"] = (byArm[r.verdictArm || "none"] || 0) + 1;
  return {
    schemaVersion: "1.0.0",
    machineCount: rows.length,
    byVerdictArm: byArm,
    simUiaGated: rows.filter((r) => r.verdictArm === PROOF_ARMS.SIM_UIA).length,
    edmNotApplicable: rows.filter((r) => r.verdictArm === PROOF_ARMS.DISCHARGE_PHYSICS).length,
    note: "Every simulate verdict is UIA + license gated (SPINE-2). Blind-safe fleet-wide arms today: external-cmd (static) + byte-equiv (offline, golden-gated). EDM is discharge-physics.",
    machines: rows,
  };
}

/** Compact summary (the headline a caller reads first). */
export function summary(ctx = {}) {
  const fleet = planFleet(ctx);
  return {
    jobTypes: JOB_TYPES,
    proofArms: Object.values(PROOF_ARMS),
    fleet: { machineCount: fleet.machineCount, byVerdictArm: fleet.byVerdictArm, simUiaGated: fleet.simUiaGated, edmNotApplicable: fleet.edmNotApplicable },
    note: "planNavigation(job) composes the ordered, channel-prioritized, fail-loud blind-nav step plan for proving a post; planFleet() rolls it up across all JM machines.",
  };
}

// ─── CLI (argv-guarded, mirrors cimco-nav-map.mjs) ─────────────────────────────────────────────
function _arg(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function _main(argv) {
  const cmd = argv[0];
  try {
    if (cmd === "plan") {
      const jobType = _arg(argv, "--job") || "simulate";
      const ncFile = _arg(argv, "--nc") || "<candidate.nc>";
      const jmMachineId = _arg(argv, "--machine");
      const goldenFile = _arg(argv, "--golden");
      const plan = planNavigation({ jobType, ncFile, jmMachineId, goldenFile });
      console.log(JSON.stringify(plan, null, 2));
    } else if (cmd === "fleet") {
      console.log(JSON.stringify(planFleet({}, _arg(argv, "--nc") || "<candidate.nc>"), null, 2));
    } else if (cmd === "summary" || !cmd) {
      console.log(JSON.stringify(summary(), null, 2));
    } else {
      console.error(`Unknown command: ${cmd}. Use: plan --job <type> --nc <path> [--machine ID] [--golden path] | fleet | summary`);
      process.exit(2);
    }
  } catch (e) {
    console.error(`cimco-nav-planner: ${e.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  _main(process.argv.slice(2));
}

// Channel-rank re-export so consumers can prioritize without re-importing cimco-nav-map.mjs.
export { CHANNEL_RANK };
