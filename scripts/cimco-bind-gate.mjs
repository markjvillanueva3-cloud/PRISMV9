#!/usr/bin/env node
/**
 * CIMCO machine + controller BIND GATE — U-CIMCO-SIM-4.
 *
 * After the driver loads a machine into CIMCO Edit's Machine-Simulation setup,
 * this PURE gate asserts that what is ACTUALLY LOADED matches the machine the
 * post is FOR — before any sim run is allowed to count toward a verdict. It
 * closes three load-time traps, all fail-CLOSED:
 *
 *   1. kinematic-mismatch — loaded sim .mcfg ≠ the resolved JM machine's .mcfg
 *      (proving a post against the wrong/another machine).
 *   2. wrong-controller-post — a Haas PRE-NGC machine (VMC-03/04) loaded with
 *      the NGC RPost instead of the VR/classic variant (different G/M dialect →
 *      a "clean" sim of the wrong post is worthless).
 *   3. 25.4× units — every CIMCO .mcfg is mm and JM convention is INCH; an inch
 *      NC simulated against a mm machine is a 25.4× scale-error. Units must be
 *      DECLARED + matching on both NC and .mcfg, never inferred (spec §E1).
 *
 * Distinct from CimcoVerificationBridgeEngine.assessLiveRunClearance (TS, the
 * FINAL machine-clearance gate at the dispatcher). This is the UPSTREAM load
 * read-back precondition: a bind verdict is an INPUT to clearance, never a
 * replacement (R7, single-source). `controllerVerified` is structurally false
 * here — a bound machine is still NOT controller-verified (the irreducible
 * floor, spec §E).
 *
 * Pure (no I/O, no CIMCO contact). The live read-back is supplied by the caller
 * (driver modeVerify, live read wires at U-CIMCO-SIM-5); this module only judges
 * an {expected, loaded} pair.
 */

/** Bind blocker codes. A non-null `blocker` means bound:false, fail-CLOSED. */
export const BIND_BLOCKERS = Object.freeze({
  EDM_NOT_SIMULABLE: "bind-edm-not-cimco-simulable", // routed verdict, not a fault
  NO_READBACK: "bind-no-readback",                   // live read returned nothing
  MACHINE_MISMATCH: "bind-machine-mismatch",         // loaded .mcfg ≠ expected
  WRONG_POST_NGC: "bind-wrong-post-ngc-on-pre-ngc",  // NGC post on a PRE-NGC machine
  POST_UNVERIFIED: "bind-post-generation-unverified", // can't confirm VR-not-NGC
  UNITS_UNRESOLVED: "bind-units-unresolved-25_4x-risk",
  UNITS_MISMATCH: "bind-units-mismatch-25_4x",
});

/** Normalize a machine/post name for comparison: lowercase, collapse ws, trim. */
function norm(s) {
  return String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Is this resolved JM machine an EDM (CIMCO models mill/lathe kinematics only)?
 * Sinker/wire EDM entries carry cimcoMatch=null + status "not-applicable" +
 * a *_edm type — any one of those is sufficient (defence in depth).
 */
export function isEdmMachine(expected) {
  if (!expected) return false;
  const type = norm(expected.type);
  return (
    /edm/.test(type) ||
    expected.cimcoMatch == null ||
    norm(expected.status) === "not-applicable"
  );
}

/** A Haas PRE-NGC machine (VMC-03/04) — must NOT load the NGC RPost. */
export function isPreNgcHaas(expected) {
  return (
    norm(expected?.controller_family) === "haas" &&
    /pre-?ngc/.test(norm(expected?.controller_model))
  );
}

/**
 * Classify the GENERATION of a loaded Haas RPost name. Order matters: "pre-NGC"
 * contains the substring "ngc", and VR/classic ARE the pre-NGC variants — so the
 * classic patterns are tested BEFORE the ngc pattern (else "pre-NGC" would be
 * mis-read as NGC, the exact inversion of the trap we guard).
 *   'classic' → the correct generation for a PRE-NGC machine
 *   'ngc'     → the WRONG generation for a PRE-NGC machine (different dialect)
 *   'unknown' → unclassifiable → fail-CLOSED (can't confirm VR-not-NGC)
 */
export function classifyHaasPostGeneration(postName) {
  const s = norm(postName);
  if (!s) return "unknown";
  if (/pre-?ngc|classic|\bvr\b/.test(s)) return "classic";
  if (/\bngc\b|next ?gen/.test(s)) return "ngc";
  return "unknown";
}

/**
 * Synthesize the read-back a CORRECT load would produce, for mock E2E + tests.
 * Derived from the expected machine; `overrides` lets a test inject a BAD
 * read-back (wrong machine, NGC post, wrong units) to exercise each blocker.
 * @param {object} expected - a resolveJmMachine() entry
 * @param {object} [overrides] - partial read-back to merge over the correct one
 */
export function synthesizeMockReadback(expected, overrides = {}) {
  const mcfg = expected?.cimcoMatch || {};
  const correctPost = isPreNgcHaas(expected)
    ? `${expected.controller_family} VR (classic)` // the right pre-NGC variant
    : `${expected?.controller_family ?? "generic"} post`;
  return {
    machineFile: mcfg.file ?? null,
    machineDisplayName: mcfg.displayName ?? null,
    controllerPost: correctPost,
    units: mcfg.unit ?? null, // every .mcfg is mm
    ...overrides,
  };
}

/**
 * Assess whether the LOADED CIMCO machine/controller/units bind the EXPECTED JM
 * machine. Returns a fail-CLOSED bind verdict — never throws on a DOMAIN failure
 * (those are blockers); throws ONLY on a programming error (missing expected).
 *
 * @param {object} expected - a resolveJmMachine() entry (machine_id, type,
 *   controller_family, controller_model, status, cimcoMatch{file,displayName,
 *   unit,unitsResolved}, mustVerifyKinematics).
 * @param {object|null} loaded - the live read-back {machineFile|machineDisplayName,
 *   controllerPost, units}; null when no read-back is available (fail-CLOSED).
 * @param {object} [opts]
 * @param {string} [opts.ncUnits] - the units the NC PROGRAM is declared in
 *   (from G20/G21 or post metadata; NEVER inferred). Absent → units unresolved.
 * @param {boolean} [opts.unitsDoubleChecked] - operator/system confirmed units
 *   for a machine whose mapping carries unitsResolved:false (VMC-03/04).
 * @returns {object} bind verdict
 */
export function assessMachineBind(expected, loaded, opts = {}) {
  if (!expected || !expected.machine_id) {
    throw new Error("assessMachineBind: expected machine entry is required (programming error, not a bind failure)");
  }

  const base = {
    bound: false,
    blocker: null,
    machineId: expected.machine_id,
    expected: {
      displayName: expected.cimcoMatch?.displayName ?? null,
      file: expected.cimcoMatch?.file ?? null,
      controllerFamily: expected.controller_family ?? null,
      controllerModel: expected.controller_model ?? null,
      status: expected.status ?? null,
      mcfgUnit: expected.cimcoMatch?.unit ?? null,
    },
    loaded: loaded ? { ...loaded } : null,
    controllerVerified: false, // irreducible floor (spec §E) — ALWAYS false
    checks: { machineMatch: false, postGeneration: null, unitsDeclared: false, unitsMatch: false },
    downgrades: [],
    notes: [],
    verdictArm: null,
  };

  // 1. EDM short-circuit — a routed verdict, not a fault. Don't attempt to bind.
  if (isEdmMachine(expected)) {
    return { ...base, blocker: BIND_BLOCKERS.EDM_NOT_SIMULABLE, verdictArm: "discharge-physics",
      notes: ["CIMCO models mill/lathe kinematics only — EDM stays on PRISM discharge-physics (spec §F, tribal #10)."] };
  }

  // 2. No read-back — fail-CLOSED. A missing read is NEVER a pass (same doctrine
  //    as an empty sim report). Live read wires at U-CIMCO-SIM-5.
  if (!loaded || typeof loaded !== "object") {
    return { ...base, blocker: BIND_BLOCKERS.NO_READBACK,
      notes: ["No machine read-back available — cannot confirm the loaded machine. Live read-back wires at U-CIMCO-SIM-5."] };
  }

  // 3. Machine match — loaded .mcfg file OR display name must equal expected.
  const expFile = norm(expected.cimcoMatch?.file);
  const expName = norm(expected.cimcoMatch?.displayName);
  const gotFile = norm(loaded.machineFile);
  const gotName = norm(loaded.machineDisplayName);
  const machineMatch = (!!expFile && expFile === gotFile) || (!!expName && expName === gotName);
  base.checks.machineMatch = machineMatch;
  if (!machineMatch) {
    return { ...base, blocker: BIND_BLOCKERS.MACHINE_MISMATCH,
      notes: [`Loaded machine "${loaded.machineDisplayName ?? loaded.machineFile ?? "?"}" ≠ expected "${expected.cimcoMatch?.displayName ?? expected.cimcoMatch?.file}". Kinematic-mismatch trap — refusing the bind.`] };
  }

  // 4. Controller post — VR-not-NGC hard-assert for PRE-NGC Haas (VMC-03/04).
  if (isPreNgcHaas(expected)) {
    const gen = classifyHaasPostGeneration(loaded.controllerPost);
    base.checks.postGeneration = gen;
    if (gen === "ngc") {
      return { ...base, blocker: BIND_BLOCKERS.WRONG_POST_NGC,
        notes: [`${expected.machine_id} is Haas PRE-NGC — loaded post "${loaded.controllerPost}" is the NGC generation (wrong G/M dialect). Must be the VR/classic post.`] };
    }
    if (gen !== "classic") {
      return { ...base, blocker: BIND_BLOCKERS.POST_UNVERIFIED,
        notes: [`${expected.machine_id} is Haas PRE-NGC — loaded post "${loaded.controllerPost ?? "(none)"}" could not be confirmed as the VR/classic generation. Fail-CLOSED until verified.`] };
    }
  } else {
    base.checks.postGeneration = "not-gated"; // post-generation hard-gate is PRE-NGC-Haas-only (the operator-locked trap)
    if (loaded.controllerPost) base.notes.push(`Controller post "${loaded.controllerPost}" recorded; family-match not hard-gated for ${expected.controller_family ?? "this"} controllers (no verified RPost-name table — surfaced, not asserted).`);
  }

  // 5. Units — declared + matching, no inference (the 25.4× guard, spec §E1).
  const mcfgUnit = norm(expected.cimcoMatch?.unit);
  const ncUnits = opts.ncUnits != null ? norm(opts.ncUnits) : null;
  if (!ncUnits) {
    return { ...base, blocker: BIND_BLOCKERS.UNITS_UNRESOLVED,
      notes: ["NC program units not declared (no G20/G21 / post metadata). Units must be declared, never inferred — fail-CLOSED (25.4× guard)."] };
  }
  base.checks.unitsDeclared = true;
  const loadedUnits = loaded.units != null ? norm(loaded.units) : null;
  if (ncUnits !== mcfgUnit || (loadedUnits && loadedUnits !== mcfgUnit)) {
    return { ...base, blocker: BIND_BLOCKERS.UNITS_MISMATCH,
      notes: [`Units mismatch — NC=${ncUnits}, .mcfg=${mcfgUnit}${loadedUnits ? `, loaded=${loadedUnits}` : ""}. Post the NC in ${mcfgUnit} to match the machine or refuse (25.4× scale-error trap).`] };
  }
  // VMC-03/04 carry unitsResolved:false — require an explicit double-check.
  if (expected.cimcoMatch?.unitsResolved === false && opts.unitsDoubleChecked !== true) {
    return { ...base, blocker: BIND_BLOCKERS.UNITS_UNRESOLVED,
      notes: [`${expected.machine_id} mapping has unitsResolved:false — a double units check (opts.unitsDoubleChecked) is required before bind (25.4× guard).`] };
  }
  base.checks.unitsMatch = true;

  // BOUND — record honest downgrades (bound ≠ controller-verified).
  if (norm(expected.status) === "generic-template") {
    base.downgrades.push("generic-template");
    base.notes.push("Generic Cimco kinematic template — a clean sim is conformance + kinematics-CANDIDATE only, NOT controller-verified. Author an exact vendor .mcfg for full fidelity.");
  } else if (norm(expected.status) === "native-cimco-match") {
    base.notes.push("Same-vendor .mcfg class — kinematics representative, but verify travels/axis vs the real machine.");
  }
  if (expected.mustVerifyKinematics === true) base.downgrades.push("verify-kinematics-vs-real-machine");

  return { ...base, bound: true };
}
