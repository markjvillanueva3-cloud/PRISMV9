// cimco-control-map.test.mjs — real-behavior tests for the CIMCO control map.
// Run: node --test scripts/cimco-control-map.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  CHANNELS,
  COMMAND_CATALOG,
  resolveControlPath,
  uiaOnlyActions,
  readMachineDef,
  parseSimulationReport,
  flattenAxisChain,
  maxLinearAxisRange,
  inferUnitFromKinematics,
  MM_INFERENCE_FLOOR,
  MM_INFERENCE_HIGH_CONF,
} from "./cimco-control-map.mjs";

const CORPUS = "H:/prism/resources/cimco-2026/CIMCOEdit/MachineCfg";
const VALID_CHANNELS = new Set(Object.values(CHANNELS));
const VALID_CONF = new Set(["CONFIRMED", "LIKELY", "UNVERIFIED"]);

// ── COMMAND_CATALOG (the control surface map) ───────────────────────────────
test("catalog: every entry is fully specified with a valid channel + honest confidence", () => {
  assert.ok(COMMAND_CATALOG.length >= 8, "expected the full control surface");
  for (const e of COMMAND_CATALOG) {
    assert.ok(e.action && typeof e.action === "string", `action missing: ${JSON.stringify(e)}`);
    assert.ok(VALID_CHANNELS.has(e.channel), `bad channel '${e.channel}' for ${e.action}`);
    assert.ok(e.invocation && e.invocation.length > 10, `invocation too thin for ${e.action}`);
    assert.ok(VALID_CONF.has(e.confidence), `bad confidence '${e.confidence}' for ${e.action}`);
    assert.ok(e.evidence && e.evidence.length > 5, `evidence missing for ${e.action}`);
  }
});

test("catalog: sim verification is UIA-primary with a CLI fallback to probe (honest about the gap)", () => {
  const sim = resolveControlPath("machine_simulation");
  assert.equal(sim.channel, CHANNELS.UIA);
  assert.equal(sim.confidence, "UNVERIFIED"); // no public sim CLI confirmed yet
  assert.ok(sim.fallback && sim.fallback.channel === CHANNELS.CLI);
});

test("catalog: file-format reads are CONFIRMED (no CIMCO process needed)", () => {
  assert.equal(resolveControlPath("read_machine_def").channel, CHANNELS.FILE);
  assert.equal(resolveControlPath("read_machine_def").confidence, "CONFIRMED");
  assert.equal(resolveControlPath("read_post").confidence, "CONFIRMED");
});

test("resolveControlPath: unknown action returns null (no silent fabrication)", () => {
  assert.equal(resolveControlPath("teleport_spindle"), null);
  assert.equal(resolveControlPath(""), null);
  assert.equal(resolveControlPath(undefined), null);
});

test("uiaOnlyActions: the genuine GUI-only set includes sim + report read + backplot", () => {
  const u = uiaOnlyActions();
  assert.ok(u.includes("machine_simulation"));
  assert.ok(u.includes("read_simulation_report"));
  assert.ok(u.includes("backplot"));
  assert.ok(!u.includes("read_machine_def")); // file channel, not UIA
});

// ── readMachineDef (inline fixtures mirror the verified .mcfg schema) ────────
const latheFixture = {
  MachineDefinition: {
    Header: { DisplayName: "Test Lathe", Orientation: "Lathe", Unit: "Metric", MaxCuttingFeedrate: 10000, Acceleration: 2, Version: 2, GUID: "g-1" },
    MachinePartGroups: [
      { GUID: "a", Type: "Base" },
      { Axis: "Z", GUID: "b", Type: "Linear" },
      { Axis: "X", GUID: "c", Type: "Linear" },
    ],
    Collision: [
      { Name: "Tool | Workpiece", GroupOne: ["workpiece"], GroupTwo: ["tool"] },
      { Name: "C | Z", GroupOne: ["C"], GroupTwo: ["Z"] },
    ],
    Revolver: { Center: { X: 1, Y: 2, Z: 3 } },
    ToolchangePositions: [{}],
  },
};

test("readMachineDef: parses header, units (Metric→mm), axes, collisions, revolver", () => {
  const m = readMachineDef(latheFixture);
  assert.equal(m.displayName, "Test Lathe");
  assert.equal(m.orientation, "Lathe");
  assert.equal(m.unit, "mm");
  assert.equal(m.unitsResolved, true);
  assert.equal(m.maxCuttingFeedrate, 10000);
  assert.deepEqual(m.axes.sort(), ["X", "Z"]);
  assert.equal(m.collisionPairs.length, 2);
  assert.equal(m.collisionPairs[0].name, "Tool | Workpiece");
  assert.ok(m.revolver);
  assert.equal(m.toolchangePositions, 1);
  assert.equal(m.warnings.length, 0);
});

test("readMachineDef: Inch units resolve to inch (units-first safety)", () => {
  const f = JSON.parse(JSON.stringify(latheFixture));
  f.MachineDefinition.Header.Unit = "Inch";
  assert.equal(readMachineDef(f).unit, "inch");
});

test("readMachineDef: missing/blank units are flagged UNRESOLVED (25.4x scale guard), never assumed", () => {
  const f = JSON.parse(JSON.stringify(latheFixture));
  f.MachineDefinition.Header.Unit = "";
  const m = readMachineDef(f);
  assert.equal(m.unit, "unknown");
  assert.equal(m.unitsResolved, false);
  assert.ok(m.warnings.some((w) => /units UNRESOLVED/.test(w)));
});

test("readMachineDef: empty machine def warns on absent parts + collisions (fail loud)", () => {
  const m = readMachineDef({ MachineDefinition: { Header: { Unit: "Metric" } } });
  assert.ok(m.warnings.some((w) => /MachinePartGroups/.test(w)));
  assert.ok(m.warnings.some((w) => /Collision/.test(w)));
});

test("readMachineDef: bad inputs throw descriptively (no silent null)", () => {
  assert.throws(() => readMachineDef("Z:/does/not/exist.mcfg"), /not readable/);
  assert.throws(() => readMachineDef(null), /expected a .mcfg path or a parsed object/);
  assert.throws(() => readMachineDef(123), /expected a .mcfg path/);
});

// ── Units inference (U-CIMCO-MCFG-UNITS-INFER) ───────────────────────────────
// A real nested-axis mill with NO Header.Unit (mirrors the 44 vendor .mcfg). Travels in mm:
// X ±254 (508), Y ±203 (406), Z -508..0 (508); rotary B ±120 (degrees — must be excluded).
const vendorMillNoUnit = {
  MachineDefinition: {
    Header: { DisplayName: "Vendor Mill (no unit)", Orientation: "Vertical", Version: 2, GUID: "g-x" },
    MachinePartGroups: [
      { Type: "Base", GUID: "base" },
      {
        Type: "Head",
        GUID: "head",
        Axis: {
          Type: "Translation", Name: "X", Limits: { Min: -254, Max: 254 }, Vector: { X: 1, Y: 0, Z: 0 },
          Axis: {
            Type: "Translation", Name: "Y", Limits: { Min: -203, Max: 203 }, Vector: { X: 0, Y: 1, Z: 0 },
            Axis: { Type: "Translation", Name: "Z", Limits: { Min: -508, Max: 0 }, Vector: { X: 0, Y: 0, Z: 1 } },
          },
        },
      },
      { Type: "Table", GUID: "tbl", Axis: { Type: "Rotation", Name: "B", Limits: { Min: -120, Max: 120 } } },
    ],
    Collision: [{ Name: "Tool | Workpiece", GroupOne: ["workpiece"], GroupTwo: ["tool"] }],
  },
};

test("flattenAxisChain: walks the nested parent→child .Axis chain; tolerates string/null", () => {
  const chain = flattenAxisChain({ Name: "X", Axis: { Name: "Y", Axis: { Name: "Z" } } });
  assert.deepEqual(chain.map((a) => a.Name), ["X", "Y", "Z"]);
  assert.deepEqual(flattenAxisChain("Z"), []); // a bare string axis (old fixture style) → no objects
  assert.deepEqual(flattenAxisChain(null), []);
});

test("maxLinearAxisRange: max linear travel; EXCLUDES rotary (degrees); null when none", () => {
  // nested linear chain → max range is the Z 300
  assert.equal(
    maxLinearAxisRange([{ Type: "Translation", Limits: { Min: -100, Max: 100 }, Axis: { Type: "Translation", Limits: { Min: 0, Max: 300 } } }]),
    300,
  );
  // a rotary axis with a big degree span must be ignored (not a length scale)
  assert.equal(maxLinearAxisRange([{ Type: "Rotation", Name: "C", Limits: { Min: 0, Max: 360 } }]), null);
  // no Limits / non-finite → skipped
  assert.equal(maxLinearAxisRange([{ Type: "Translation", Name: "X" }]), null);
  assert.equal(maxLinearAxisRange([{ Type: "Translation", Limits: { Min: "a", Max: "b" } }]), null);
  assert.equal(maxLinearAxisRange([]), null);
  assert.equal(maxLinearAxisRange(null), null);
});

test("inferUnitFromKinematics: mm-or-null only (NEVER inch); confidence banding", () => {
  assert.deepEqual(inferUnitFromKinematics(508), { unit: "mm", confidence: "high" }); // > 150
  assert.deepEqual(inferUnitFromKinematics(MM_INFERENCE_HIGH_CONF + 1), { unit: "mm", confidence: "high" });
  assert.deepEqual(inferUnitFromKinematics(100), { unit: "mm", confidence: "medium" }); // (50, 150]
  assert.deepEqual(inferUnitFromKinematics(MM_INFERENCE_FLOOR + 1), { unit: "mm", confidence: "medium" });
  // at/below the floor: inconclusive (could be inch OR micro-metric) → never a false inch, never a guess
  assert.deepEqual(inferUnitFromKinematics(MM_INFERENCE_FLOOR), { unit: null, confidence: null });
  assert.deepEqual(inferUnitFromKinematics(20), { unit: null, confidence: null });
  assert.deepEqual(inferUnitFromKinematics(null), { unit: null, confidence: null });
  assert.deepEqual(inferUnitFromKinematics(NaN), { unit: null, confidence: null });
});

test("readMachineDef: NO Header.Unit + mm-scale geometry → INFERS mm (not a blind inch default)", () => {
  const m = readMachineDef(vendorMillNoUnit);
  assert.equal(m.unit, "mm");
  assert.equal(m.unitSource, "inferred-magnitude");
  assert.equal(m.unitsInferred, true);
  assert.equal(m.inferenceConfidence, "high");
  assert.equal(m.maxLinearRange, 508);
  // unitsResolved stays FALSE — inferred is a best-guess, NOT an authoritative declaration.
  assert.equal(m.unitsResolved, false);
  assert.ok(m.warnings.some((w) => /units INFERRED mm/.test(w)));
  assert.ok(m.warnings.some((w) => /verify vs the real machine/.test(w)));
});

test("readMachineDef: a DECLARED unit always wins over inference (no override)", () => {
  const f = JSON.parse(JSON.stringify(vendorMillNoUnit));
  f.MachineDefinition.Header.Unit = "Metric";
  const m = readMachineDef(f);
  assert.equal(m.unit, "mm");
  assert.equal(m.unitSource, "declared");
  assert.equal(m.unitsInferred, false);
  assert.equal(m.unitsResolved, true);
});

test("readMachineDef: DECLARED inch fighting mm-scale geometry warns (mislabel/25.4x catch)", () => {
  const f = JSON.parse(JSON.stringify(vendorMillNoUnit));
  f.MachineDefinition.Header.Unit = "Inch"; // 508-unit travel labeled inch = 12.9 m machine → implausible
  const m = readMachineDef(f);
  assert.equal(m.unit, "inch"); // declared still wins (we never silently override a declaration)
  assert.equal(m.unitsResolved, true);
  assert.ok(m.warnings.some((w) => /DECLARED inch but max linear travel .* implies mm/.test(w)));
});

test("readMachineDef: NO unit + inconclusive geometry stays UNRESOLVED (never a false guess)", () => {
  const tiny = {
    MachineDefinition: {
      Header: { DisplayName: "Tiny (ambiguous)", Orientation: "Vertical" },
      MachinePartGroups: [{ Type: "Head", Axis: { Type: "Translation", Name: "X", Limits: { Min: 0, Max: 20 } } }],
      Collision: [{ Name: "t|w", GroupOne: ["w"], GroupTwo: ["t"] }],
    },
  };
  const m = readMachineDef(tiny);
  assert.equal(m.unit, "unknown");
  assert.equal(m.unitSource, "unknown");
  assert.equal(m.unitsInferred, false);
  assert.equal(m.unitsResolved, false);
  assert.ok(m.warnings.some((w) => /units UNRESOLVED/.test(w) && /inconclusive/.test(w)));
});

test("integration: a real UNDECLARED vendor .mcfg infers mm (the 44-file fix)", (t) => {
  const p = `${CORPUS}/Doosan DNM200.mcfg`;
  if (!existsSync(p)) return t.skip("CIMCO corpus not present on this machine");
  const m = readMachineDef(p);
  assert.equal(m.unit, "mm");
  assert.equal(m.unitSource, "inferred-magnitude");
  assert.equal(m.unitsInferred, true);
  assert.equal(m.unitsResolved, false); // honest: not declared, only inferred
  assert.ok(m.maxLinearRange > MM_INFERENCE_FLOOR);
});

// ── parseSimulationReport (the pass/fail verification gate) ──────────────────
test("parseSimulationReport: empty report UNCONFIRMED = conformance-pass but NOT cleared for live run (fail-OPEN guard, U-CIMCO-SIM-VERDICT-HARDEN)", () => {
  // An empty report is AMBIGUOUS: clean sim OR the collision-check pass never ran. `pass` stays
  // structural (no findings), but `clearedForLiveRun` — the safety-load-bearing verdict — is FALSE.
  for (const empty of [null, [], {}]) {
    const r = parseSimulationReport(empty);
    assert.equal(r.pass, true); // structural: nothing parsed
    assert.equal(r.counts.collision, 0);
    assert.equal(r.collisionCheckConfirmed, false); // could not confirm the check executed
    assert.equal(r.clearedForLiveRun, false); // NOT a blind go — closes the fail-OPEN hole
    assert.match(r.summary, /UNCONFIRMED/);
    assert.match(r.summary, /NOT cleared for live run/);
  }
});

test("parseSimulationReport: empty report WITH collisionCheckRan:true = CLEAN + cleared for live run", () => {
  const r = parseSimulationReport({ collisionCheckRan: true });
  assert.equal(r.pass, true);
  assert.equal(r.collisionCheckConfirmed, true);
  assert.equal(r.clearedForLiveRun, true);
  assert.match(r.summary, /CLEAN/);
  assert.match(r.summary, /NOT controller-verified/); // honest labeling preserved
});

test("parseSimulationReport: gouge fails as a collision; a normal tool-change row is advisory (no false-fail)", () => {
  const gouge = parseSimulationReport([{ line: 12, type: "Gouge", description: "tool into floor" }]);
  assert.equal(gouge.counts.collision, 1);
  assert.equal(gouge.pass, false);

  const toolChange = parseSimulationReport([{ line: 5, type: "Tool Change", description: "T03" }]);
  assert.equal(toolChange.counts.warning, 1);
  assert.equal(toolChange.counts.error, 0, "a normal stop event must NOT classify as a failing error");
  assert.equal(toolChange.pass, true);
  assert.equal(toolChange.collisionCheckConfirmed, true); // a row present ⇒ the check ran
  assert.equal(toolChange.clearedForLiveRun, true);
});

test("parseSimulationReport: a collision report is confirmed-ran but NOT cleared (findings present, pass:false)", () => {
  const r = parseSimulationReport([{ line: 9, type: "Collision", description: "tool vs fixture" }]);
  assert.equal(r.collisionCheckConfirmed, true);
  assert.equal(r.clearedForLiveRun, false); // pass:false ⇒ never cleared
});

test("parseSimulationReport: a stop-event TYPE with a HAZARD in the DESCRIPTION is NOT downgraded (defense-in-depth, the one fail-removing branch)", () => {
  // {type:"Tool Change", description:"COLLISION with fixture"} must FAIL — never cleared as advisory.
  const masked = parseSimulationReport([{ line: 7, type: "Tool Change", description: "COLLISION with fixture" }]);
  assert.equal(masked.counts.collision, 1);
  assert.equal(masked.counts.warning, 0);
  assert.equal(masked.pass, false);
  assert.equal(masked.clearedForLiveRun, false);
  // an over-travel hidden under a program-stop type → limit (fails)
  const lim = parseSimulationReport([{ line: 9, type: "Program Stop", description: "Y over-travel beyond limit" }]);
  assert.equal(lim.counts.limit, 1);
  assert.equal(lim.pass, false);
  // a GENUINELY benign tool change (no hazard text) still downgrades to advisory (no false-fail)
  const benign = parseSimulationReport([{ line: 5, type: "Tool Change", description: "T03 indexed OK" }]);
  assert.equal(benign.counts.warning, 1);
  assert.equal(benign.pass, true);
});

test("parseSimulationReport: a collision fails the gate + reports the first offending line", () => {
  const rows = [
    { line: 42, type: "Collision", description: "Tool / Fixture", action: "Highlighted red" },
    { line: 10, type: "Warning", description: "rapid near stock", action: "none" },
  ];
  const r = parseSimulationReport(rows);
  assert.equal(r.pass, false);
  assert.equal(r.counts.collision, 1);
  assert.equal(r.counts.warning, 1);
  assert.equal(r.firstOffendingLine, 42);
  assert.match(r.summary, /FAIL/);
});

test("parseSimulationReport: warnings alone do NOT fail (advisory only)", () => {
  const r = parseSimulationReport([{ line: 5, type: "Warning", description: "near limit" }]);
  assert.equal(r.pass, true);
  assert.equal(r.counts.warning, 1);
});

test("parseSimulationReport: over-travel classified as a limit and fails", () => {
  const r = parseSimulationReport([{ line: 7, type: "Over-travel", description: "X axis beyond limit" }]);
  assert.equal(r.counts.limit, 1);
  assert.equal(r.pass, false);
});

test("parseSimulationReport: raw pipe-delimited UIA rows parse (LINE|TYPE|DESC|ACTION)", () => {
  const r = parseSimulationReport(["N123 | Collision | tool vs C-axis | stop", "10 | Error | unknown G-code | ignore"]);
  assert.equal(r.counts.collision, 1);
  assert.equal(r.counts.error, 1);
  assert.equal(r.pass, false);
  assert.equal(r.firstOffendingLine, 10);
});

test("parseSimulationReport: grouped-object input is honored", () => {
  const r = parseSimulationReport({ collisions: [{ line: 3, description: "x" }], limits: [], errors: [] });
  assert.equal(r.counts.collision, 1);
  assert.equal(r.pass, false);
});

test("parseSimulationReport: a typeless problem row fails safe to error (never silently passes)", () => {
  const r = parseSimulationReport([{ line: 9, description: "something wrong", action: "?" }]);
  assert.equal(r.counts.error, 1);
  assert.equal(r.pass, false);
});

// ── Integration: against the REAL local corpus (guarded — skips if not copied) ──
test("integration: real lathe .mcfg parses with resolved units + collision pairs", (t) => {
  const p = `${CORPUS}/Cimco Lathe 3 Axis C.mcfg`;
  if (!existsSync(p)) return t.skip("CIMCO corpus not present on this machine");
  const m = readMachineDef(p);
  assert.equal(m.displayName, "Cimco Lathe 3 Axis C");
  assert.equal(m.orientation, "Lathe");
  assert.equal(m.unit, "mm");
  assert.equal(m.unitsResolved, true);
  assert.equal(m.collisionPairs.length, 16);
  assert.ok(m.revolver, "lathe should have a revolver/turret");
});

test("integration: a real mill .mcfg parses with a different orientation (variability)", (t) => {
  const p = `${CORPUS}/Cimco Horizontal Mill 4 Axis Table B.mcfg`;
  if (!existsSync(p)) return t.skip("CIMCO corpus not present on this machine");
  const m = readMachineDef(p);
  assert.equal(m.unitsResolved, true);
  // CIMCO orientation enum: a horizontal mill reports "Horizontal" (not "Mill"). The intent here
  // is variability — a non-lathe config parses with a distinct orientation.
  assert.ok(m.orientation && m.orientation !== "Lathe", `expected a non-lathe orientation, got '${m.orientation}'`);
  assert.ok(m.collisionPairs.length >= 1);
});
