// blueprint-coverage-floor-guard.test.mjs
// tier: T1
//
// node:test suite for BOTH U-MS1-U5 hooks:
//   - blueprint-accuracy-guard.mjs   (PostToolUse — accuracy + learning events)
//   - blueprint-coverage-floor-guard.mjs (Stop — extraction-path/audit gate)
//
// Vitest harness in `.claude/helpers/*.test.mjs` is currently blocked (see
// [[reference_fleet_reaper_ms1]]). node:test is stdlib-only — no transform,
// no config, runs everywhere portable-node is available.
//
// Every assertion is a concrete-value pin (real numbers, real strings).
// Every IO is mocked via injected opts so tests are hermetic.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import * as accGuard from "./blueprint-accuracy-guard.mjs";
import * as cfGuard from "./blueprint-coverage-floor-guard.mjs";

// ---------- blueprint-accuracy-guard.mjs ----------------------------------

describe("accuracy-guard / isBlueprintExtractionContent", () => {
  test("flags blueprint keyword", () => {
    assert.equal(accGuard.isBlueprintExtractionContent("hello blueprint world"), true);
  });
  test("flags rescue_counts fingerprint (U-MS1-U2)", () => {
    assert.equal(accGuard.isBlueprintExtractionContent('{"rescue_counts":{"fractional":2}}'), true);
  });
  test("flags PDFBlueprint engine name", () => {
    assert.equal(accGuard.isBlueprintExtractionContent("PDFBlueprintDimensionExtractor"), true);
  });
  test("flags operator_correction", () => {
    assert.equal(accGuard.isBlueprintExtractionContent('"operator_correction":{}'), true);
  });
  test("rejects unrelated text", () => {
    assert.equal(accGuard.isBlueprintExtractionContent("just a gcode comment"), false);
  });
  test("rejects empty / null", () => {
    assert.equal(accGuard.isBlueprintExtractionContent(""), false);
    assert.equal(accGuard.isBlueprintExtractionContent(null), false);
    assert.equal(accGuard.isBlueprintExtractionContent(undefined), false);
    assert.equal(accGuard.isBlueprintExtractionContent(42), false);
  });
});

describe("accuracy-guard / computeThresholdWarnings", () => {
  test("flags low dim accuracy as error <90", () => {
    const w = accGuard.computeThresholdWarnings('blueprint accuracyPercent: 88.5');
    assert.equal(w.length, 1);
    assert.equal(w[0].severity, "error");
    assert.match(w[0].msg, /88\.5%/);
  });
  test("flags borderline dim accuracy as warning", () => {
    const w = accGuard.computeThresholdWarnings('blueprint accuracyPercent: 95.0');
    assert.equal(w.length, 1);
    assert.equal(w[0].severity, "warning");
  });
  test("clears dim accuracy at threshold 99", () => {
    const w = accGuard.computeThresholdWarnings('blueprint accuracyPercent: 99.0');
    assert.deepEqual(w, []);
  });
  test("flags GDT preservation <95", () => {
    const w = accGuard.computeThresholdWarnings('blueprint preservationPercent: 92.0');
    assert.equal(w.length, 1);
    assert.equal(w[0].severity, "warning");
    assert.match(w[0].msg, /GD&T preservation 92\.0%/);
  });
  test("flags OCR confidence <0.8 (info)", () => {
    const w = accGuard.computeThresholdWarnings('blueprint "confidence": 0.6');
    assert.equal(w.length, 1);
    assert.equal(w[0].severity, "info");
    assert.match(w[0].msg, /60%/);
  });
  test("flags missing standard views", () => {
    const w = accGuard.computeThresholdWarnings('blueprint viewsProcessed: ["isometric","detail"]');
    assert.equal(w.some((x) => /orthographic/.test(x.msg)), true);
  });
  test("flags withinTolerance:false count", () => {
    const w = accGuard.computeThresholdWarnings('blueprint "withinTolerance": false "withinTolerance": false');
    const dim = w.find((x) => /dimension\(s\) outside tolerance/.test(x.msg));
    assert.equal(dim?.severity, "info");
    assert.match(dim?.msg ?? "", /2 dimension\(s\)/);
  });
  test("returns empty on missing patterns", () => {
    const w = accGuard.computeThresholdWarnings("blueprint nothing to flag here");
    assert.deepEqual(w, []);
  });
  test("returns empty on null input", () => {
    assert.deepEqual(accGuard.computeThresholdWarnings(null), []);
    assert.deepEqual(accGuard.computeThresholdWarnings(""), []);
  });
});

describe("accuracy-guard / formatWarnings", () => {
  test("empty list → empty string", () => {
    assert.equal(accGuard.formatWarnings([]), "");
    assert.equal(accGuard.formatWarnings(null), "");
  });
  test("single error", () => {
    const out = accGuard.formatWarnings([{ severity: "error", msg: "low" }]);
    assert.match(out, /ERRORS/);
    assert.match(out, /low/);
  });
  test("mixed severities all rendered", () => {
    const out = accGuard.formatWarnings([
      { severity: "error", msg: "E1" },
      { severity: "warning", msg: "W1" },
      { severity: "info", msg: "I1" },
    ]);
    assert.match(out, /ERRORS/);
    assert.match(out, /WARNINGS/);
    assert.match(out, /INFO/);
  });
});

describe("accuracy-guard / extractConfidences + confidenceBoundWidth", () => {
  test("extracts multiple confidence samples", () => {
    const c = accGuard.extractConfidences('"confidence": 0.5, "confidence": 0.9, "confidence": 0.75');
    assert.deepEqual(c, [0.5, 0.9, 0.75]);
  });
  test("handles 1.0", () => {
    const c = accGuard.extractConfidences('"confidence": 1.0');
    assert.deepEqual(c, [1.0]);
  });
  test("rejects out-of-range values silently", () => {
    const c = accGuard.extractConfidences('"confidence": 2.5');
    assert.deepEqual(c, []);
  });
  test("empty/non-string returns []", () => {
    assert.deepEqual(accGuard.extractConfidences(""), []);
    assert.deepEqual(accGuard.extractConfidences(null), []);
  });
  test("REGRESSION P1: rejects incomplete decimal `0.` (parseFloat ghost match)", () => {
    // Same defect class as U-MS1-U2 P0-2 — `\d+\.?\d*` regex allowed `0.`
    // to ghost-match. The strict pattern requires either bare integer OR
    // fully-formed decimal.
    const c = accGuard.extractConfidences('"confidence": 0. "confidence": 0.5');
    assert.deepEqual(c, [0.5]);
  });
  test("accepts bare 0 and bare 1 as integers", () => {
    const c = accGuard.extractConfidences('"confidence": 0, "confidence": 1');
    assert.deepEqual(c, [0, 1]);
  });
  test("width zero on ≤1 sample", () => {
    assert.equal(accGuard.confidenceBoundWidth([]), 0);
    assert.equal(accGuard.confidenceBoundWidth([0.5]), 0);
  });
  test("width = max - min", () => {
    assert.equal(accGuard.confidenceBoundWidth([0.2, 0.8, 0.5]).toFixed(4), "0.6000");
  });
});

describe("accuracy-guard / detectOperatorCorrection", () => {
  test("parses canonical shape", () => {
    const c = accGuard.detectOperatorCorrection(
      '{"operator_correction":{"feature_id":"abc","before":1.5,"after":1.6}}'
    );
    assert.equal(c?.feature_id, "abc");
    assert.equal(c?.before, 1.5);
    assert.equal(c?.after, 1.6);
  });
  test("returns null on missing feature_id", () => {
    const c = accGuard.detectOperatorCorrection('{"operator_correction":{"before":1}}');
    assert.equal(c, null);
  });
  test("returns null on malformed JSON inside", () => {
    const c = accGuard.detectOperatorCorrection('{"operator_correction":{not json}}');
    assert.equal(c, null);
  });
  test("returns null on no marker", () => {
    assert.equal(accGuard.detectOperatorCorrection("nothing here"), null);
    assert.equal(accGuard.detectOperatorCorrection(null), null);
  });
  test("REGRESSION P1: depth-aware brace handles nested objects (greedy-slice attack)", () => {
    // Hostile-payload class identical to U-MS1-U2 P0-2. The legacy lazy regex
    // `\{[\s\S]{0,N}?\}` matched the FIRST `}`, silently dropping legitimate
    // corrections with nested objects. The depth-aware walker MUST parse this.
    const c = accGuard.detectOperatorCorrection(
      '{"operator_correction":{"feature_id":"f1","before":{"x":1,"y":2},"after":{"x":3}}}'
    );
    assert.equal(c?.feature_id, "f1");
    assert.deepEqual(c?.before, { x: 1, y: 2 });
    assert.deepEqual(c?.after, { x: 3 });
  });
  test("REGRESSION P1: ignores `}` inside string literals", () => {
    // Without string-literal awareness, the legacy regex would stop at the
    // first `}` even inside `"x}"` quotes.
    const c = accGuard.detectOperatorCorrection(
      '{"operator_correction":{"feature_id":"a}b","before":"c}d"}}'
    );
    assert.equal(c?.feature_id, "a}b");
    assert.equal(c?.before, "c}d");
  });
  test("REGRESSION P1: ignores escaped quotes inside strings", () => {
    const c = accGuard.detectOperatorCorrection(
      '{"operator_correction":{"feature_id":"with \\"escape\\"","before":1}}'
    );
    assert.equal(c?.feature_id, 'with "escape"');
  });
  test("rejects array-shaped payload", () => {
    // `[...]` is not the canonical object shape — reject defensively.
    const c = accGuard.detectOperatorCorrection('{"operator_correction":["not","an","object"]}');
    assert.equal(c, null);
  });
});

describe("accuracy-guard / extractBalancedBrace", () => {
  test("finds simple balanced block", () => {
    assert.equal(accGuard.extractBalancedBrace("xyz{a:1}", 3), "{a:1}");
  });
  test("respects nested braces", () => {
    assert.equal(accGuard.extractBalancedBrace("{{}{}{}}", 0), "{{}{}{}}");
  });
  test("respects string-literal `}`", () => {
    assert.equal(accGuard.extractBalancedBrace('{"x":"}"}', 0), '{"x":"}"}');
  });
  test("respects escaped quote in string", () => {
    assert.equal(accGuard.extractBalancedBrace('{"x":"a\\"b"}', 0), '{"x":"a\\"b"}');
  });
  test("returns null when unbalanced", () => {
    assert.equal(accGuard.extractBalancedBrace("{a:1", 0), null);
  });
  test("returns null when start not a brace", () => {
    assert.equal(accGuard.extractBalancedBrace("not-here", 0), null);
  });
  test("respects maxLen", () => {
    assert.equal(accGuard.extractBalancedBrace("{aaaaaaaaaa}", 0, 5), null);
  });
});

describe("accuracy-guard / detectGroundTruthMatch", () => {
  test("boolean true match", () => {
    const m = accGuard.detectGroundTruthMatch('"ground_truth_match": true');
    assert.equal(m?.kind, "boolean");
  });
  test("object match", () => {
    const m = accGuard.detectGroundTruthMatch('"ground_truth_match": {"feature_id":"x"}');
    assert.equal(m?.kind, "object");
    assert.equal(m?.payload?.feature_id, "x");
  });
  test("no match → null", () => {
    assert.equal(accGuard.detectGroundTruthMatch("no match here"), null);
  });
});

describe("accuracy-guard / detectDrift", () => {
  test("warm-up below MIN_ROLLING_WINDOW returns triggered:false", () => {
    const d = accGuard.detectDrift([{ width: 0.1 }, { width: 0.1 }], 0.5, 20);
    assert.equal(d.triggered, false);
    assert.equal(d.reason, "warm_up");
  });
  test("stable widths do not trigger", () => {
    const window = Array.from({ length: 10 }, () => ({ width: 0.4 }));
    const d = accGuard.detectDrift(window, 0.4, 20);
    assert.equal(d.triggered, false);
    assert.equal(d.reason, "stable");
  });
  test("widening >20% triggers", () => {
    const window = Array.from({ length: 10 }, () => ({ width: 0.4 }));
    const d = accGuard.detectDrift(window, 0.6, 20); // 50% widen
    assert.equal(d.triggered, true);
    assert.equal(d.reason, "widened");
    assert.equal(Math.round(d.widenPct), 50);
  });
  test("trivial median (all zeros) triggers only on newWidth >0.01", () => {
    const window = Array.from({ length: 10 }, () => ({ width: 0 }));
    const t = accGuard.detectDrift(window, 0.05, 20);
    assert.equal(t.triggered, true);
    assert.equal(t.reason, "trivial_median");
    const f = accGuard.detectDrift(window, 0.001, 20);
    assert.equal(f.triggered, false);
  });
});

describe("accuracy-guard / processPayload (injectable IO)", () => {
  function makeOpts(env = {}) {
    const writtenEvents = [];
    const savedStates = [];
    return {
      writtenEvents,
      savedStates,
      opts: {
        config: accGuard.getConfig({ ...env }),
        loadState: () => ({ schemaVersion: 1, window: [], outcomesSinceConsolidate: 0, lastConsolidatedAt: null }),
        appendEvent: (file, ev) => { writtenEvents.push({ file, ev }); return true; },
        saveState: (file, st) => { savedStates.push({ file, st }); return true; },
        now: () => "2026-05-16T01:00:00.000Z",
      },
    };
  }
  test("non-matching tool name is skipped", () => {
    const { opts } = makeOpts();
    const r = accGuard.processPayload({ tool: "Read", tool_response: "blueprint dim" }, opts);
    assert.equal(r.skipped, "non_matching_tool");
    assert.equal(r.advisory, "");
  });
  test("non-blueprint content is skipped", () => {
    const { opts } = makeOpts();
    const r = accGuard.processPayload({ tool: "Write", tool_response: "regular code" }, opts);
    assert.equal(r.skipped, "non_blueprint_content");
  });
  test("low-confidence triggers replay_add event with inverse-confidence priority", () => {
    const { opts, writtenEvents } = makeOpts();
    const r = accGuard.processPayload(
      {
        tool: "Write",
        tool_response: 'blueprint extractor "confidence": 0.4 "confidence": 0.6',
        session_id: "s1",
      },
      opts
    );
    const replay = writtenEvents.find((e) => e.ev.kind === "replay_add");
    assert.ok(replay, "expected replay_add event");
    assert.equal(replay.ev.reason, "low_confidence");
    // lowest = 0.4 → priority = 0.6
    assert.equal(replay.ev.priority, 0.6);
    assert.match(r.advisory, /replay_add/);
  });
  test("ground_truth match triggers replay_add (with priority defaults when confidence>=floor)", () => {
    const { opts, writtenEvents } = makeOpts();
    accGuard.processPayload(
      {
        tool: "Write",
        tool_response: 'blueprint "confidence": 0.95 "ground_truth_match": true',
        session_id: "s2",
      },
      opts
    );
    const replay = writtenEvents.find((e) => e.ev.kind === "replay_add");
    assert.ok(replay);
    assert.equal(replay.ev.reason, "ground_truth_match");
    // lowest = 0.95 → priority = 0.05
    assert.equal(replay.ev.priority, 0.05);
  });
  test("operator correction → outcome_record + predlog_pair events", () => {
    const { opts, writtenEvents } = makeOpts();
    accGuard.processPayload(
      {
        tool: "Edit",
        tool_response: 'blueprint {"operator_correction":{"feature_id":"f1","before":1,"after":2}}',
        session_id: "s3",
      },
      opts
    );
    const outcome = writtenEvents.find((e) => e.ev.kind === "outcome_record");
    const pair = writtenEvents.find((e) => e.ev.kind === "predlog_pair");
    assert.ok(outcome, "expected outcome_record");
    assert.ok(pair, "expected predlog_pair");
    assert.equal(outcome.ev.feature_id, "f1");
  });
  test("consolidate threshold triggers ewc_consolidate", () => {
    const writtenEvents = [];
    let state = { schemaVersion: 1, window: [], outcomesSinceConsolidate: 24, lastConsolidatedAt: null };
    const opts = {
      config: accGuard.getConfig({ PRISM_BLUEPRINT_CONSOLIDATE_THRESHOLD: "25" }),
      loadState: () => state,
      appendEvent: (f, ev) => { writtenEvents.push(ev); return true; },
      saveState: (f, st) => { state = st; return true; },
      now: () => "2026-05-16T02:00:00.000Z",
    };
    accGuard.processPayload(
      {
        tool: "Edit",
        tool_response: 'blueprint {"operator_correction":{"feature_id":"f9","before":0,"after":1}}',
        session_id: "s4",
      },
      opts
    );
    const consolidate = writtenEvents.find((e) => e.kind === "ewc_consolidate");
    assert.ok(consolidate, "expected ewc_consolidate at threshold");
    assert.equal(consolidate.accumulated, 25);
    // After consolidation, counter resets to 0
    assert.equal(state.outcomesSinceConsolidate, 0);
  });
  test("drift triggers drift_observation when window pre-seeded", () => {
    const writtenEvents = [];
    const seed = { schemaVersion: 1, window: Array.from({ length: 10 }, () => ({ width: 0.1 })), outcomesSinceConsolidate: 0, lastConsolidatedAt: null };
    const opts = {
      config: accGuard.getConfig({}),
      loadState: () => seed,
      appendEvent: (f, ev) => { writtenEvents.push(ev); return true; },
      saveState: () => true,
      now: () => "2026-05-16T02:00:00.000Z",
    };
    // Confidence samples spanning 0.0..0.9 → width 0.9 (vs median 0.1, +800%)
    accGuard.processPayload(
      {
        tool: "Write",
        tool_response: 'blueprint "confidence": 0.0 "confidence": 0.9',
        session_id: "s5",
      },
      opts
    );
    const drift = writtenEvents.find((e) => e.kind === "drift_observation");
    assert.ok(drift, "expected drift_observation");
    assert.equal(drift.reason, "widened");
  });
  test("rolling window respects size cap", () => {
    let state = { schemaVersion: 1, window: Array.from({ length: 7 }, () => ({ width: 0.1 })), outcomesSinceConsolidate: 0, lastConsolidatedAt: null };
    const opts = {
      config: accGuard.getConfig({ PRISM_BLUEPRINT_ROLLING_WINDOW: "5" }), // clamped below cap
      loadState: () => state,
      appendEvent: () => true,
      saveState: (f, st) => { state = st; return true; },
      now: () => "2026-05-16T02:00:00.000Z",
    };
    accGuard.processPayload(
      { tool: "Write", tool_response: 'blueprint "confidence": 0.3 "confidence": 0.4', session_id: "s6" },
      opts
    );
    // Old 7 + new 1, capped to 5
    assert.equal(state.window.length, 5);
  });
});

describe("accuracy-guard / getConfig clamps", () => {
  test("clamps replayFloor to [0,1]", () => {
    assert.equal(accGuard.getConfig({ PRISM_BLUEPRINT_REPLAY_FLOOR: "2" }).replayFloor, 1);
    assert.equal(accGuard.getConfig({ PRISM_BLUEPRINT_REPLAY_FLOOR: "-1" }).replayFloor, 0);
    assert.equal(accGuard.getConfig({ PRISM_BLUEPRINT_REPLAY_FLOOR: "0.5" }).replayFloor, 0.5);
  });
  test("clamps rolling window to [5,500]", () => {
    assert.equal(accGuard.getConfig({ PRISM_BLUEPRINT_ROLLING_WINDOW: "1" }).rollingWindow, 5);
    assert.equal(accGuard.getConfig({ PRISM_BLUEPRINT_ROLLING_WINDOW: "999" }).rollingWindow, 500);
    assert.equal(accGuard.getConfig({ PRISM_BLUEPRINT_ROLLING_WINDOW: "100" }).rollingWindow, 100);
  });
  test("clamps drift widen pct to [1, 500]", () => {
    assert.equal(accGuard.getConfig({ PRISM_BLUEPRINT_DRIFT_WIDEN_PCT: "0" }).driftWidenPct, 1);
    assert.equal(accGuard.getConfig({ PRISM_BLUEPRINT_DRIFT_WIDEN_PCT: "750" }).driftWidenPct, 500);
  });
  test("non-numeric falls back to default", () => {
    assert.equal(accGuard.getConfig({ PRISM_BLUEPRINT_REPLAY_FLOOR: "x" }).replayFloor, 0.8);
  });
});

// ---------- blueprint-coverage-floor-guard.mjs ----------------------------

describe("coverage-floor-guard / findExtractionPathTouches", () => {
  test("matches PDFBlueprint engine", () => {
    const t = cfGuard.findExtractionPathTouches([
      "mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts",
      "scripts/unrelated.mjs",
    ]);
    assert.deepEqual(t, ["mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts"]);
  });
  test("matches GroundTruthRegistry", () => {
    const t = cfGuard.findExtractionPathTouches([
      "mcp-server/src/engines/GroundTruthRegistryEngine.ts",
    ]);
    assert.equal(t.length, 1);
  });
  test("matches GroundTruthValidation", () => {
    const t = cfGuard.findExtractionPathTouches([
      "mcp-server/src/engines/GroundTruthValidationEngine.ts",
    ]);
    assert.equal(t.length, 1);
  });
  test("matches BlueprintExtractionRAG (U7 not yet shipped — pattern forward-compatible)", () => {
    const t = cfGuard.findExtractionPathTouches([
      "mcp-server/src/engines/BlueprintExtractionRAGEngine.ts",
    ]);
    assert.equal(t.length, 1);
  });
  test("normalizes Windows paths", () => {
    const t = cfGuard.findExtractionPathTouches([
      "mcp-server\\src\\engines\\PDFBlueprintPatternRescueEngine.ts",
    ]);
    assert.equal(t.length, 1);
  });
  test("non-extraction paths unmatched", () => {
    const t = cfGuard.findExtractionPathTouches([
      "mcp-server/src/engines/KienzleForceModel.ts",
      "scripts/build-state-snapshot.mjs",
      "README.md",
    ]);
    assert.deepEqual(t, []);
  });
  test("empty / non-array → []", () => {
    assert.deepEqual(cfGuard.findExtractionPathTouches([]), []);
    assert.deepEqual(cfGuard.findExtractionPathTouches(null), []);
  });
});

describe("coverage-floor-guard / inspectAuditMarker (injectable fs)", () => {
  test("missing marker", () => {
    const fs = { existsSync: () => false, statSync: () => { throw new Error("nope"); } };
    const r = cfGuard.inspectAuditMarker("H:/prism", 24, fs);
    assert.equal(r.state, "missing");
  });
  test("fresh marker (age < threshold)", () => {
    const now = Date.now();
    const fs = { existsSync: () => true, statSync: () => ({ mtimeMs: now - 60_000 }) };
    const r = cfGuard.inspectAuditMarker("H:/prism", 24, fs);
    assert.equal(r.state, "fresh");
  });
  test("stale marker (age > threshold)", () => {
    const now = Date.now();
    const fs = { existsSync: () => true, statSync: () => ({ mtimeMs: now - 48 * 3_600_000 }) };
    const r = cfGuard.inspectAuditMarker("H:/prism", 24, fs);
    assert.equal(r.state, "stale");
    assert.ok(r.ageHr > 24);
  });
  test("statSync throws → missing", () => {
    const fs = { existsSync: () => true, statSync: () => { throw new Error("perm"); } };
    const r = cfGuard.inspectAuditMarker("H:/prism", 24, fs);
    assert.equal(r.state, "missing");
  });
});

describe("coverage-floor-guard / isU8EngineShipped", () => {
  test("returns true when engine present", () => {
    const r = cfGuard.isU8EngineShipped("H:/prism", { existsSync: () => true });
    assert.equal(r, true);
  });
  test("returns false when engine missing", () => {
    const r = cfGuard.isU8EngineShipped("H:/prism", { existsSync: () => false });
    assert.equal(r, false);
  });
});

describe("coverage-floor-guard / gitChangedFiles (mocked runner)", () => {
  test("parses standard porcelain output", () => {
    const fakeRunner = () => " M file1.ts\n?? new-file.mjs\nA  added.json\n";
    const r = cfGuard.gitChangedFiles("H:/prism", fakeRunner);
    assert.deepEqual(r.sort(), ["added.json", "file1.ts", "new-file.mjs"]);
  });
  test("filters pure deletions", () => {
    const fakeRunner = () => " D goneFile.ts\n M kept.ts\n";
    const r = cfGuard.gitChangedFiles("H:/prism", fakeRunner);
    assert.deepEqual(r, ["kept.ts"]);
  });
  test("rename uses new path", () => {
    const fakeRunner = () => "R  old.ts -> new.ts\n";
    const r = cfGuard.gitChangedFiles("H:/prism", fakeRunner);
    assert.deepEqual(r, ["new.ts"]);
  });
  test("git failure → null", () => {
    const fakeRunner = () => { throw new Error("not a git repo"); };
    const r = cfGuard.gitChangedFiles("H:/prism", fakeRunner);
    assert.equal(r, null);
  });
});

describe("coverage-floor-guard / decideStop", () => {
  function baseOpts(overrides = {}) {
    return {
      config: cfGuard.getConfig({}),
      gitChangedFiles: () => [],
      inspectAuditMarker: () => ({ state: "missing" }),
      isU8EngineShipped: () => false,
      bumpBlockCount: () => 1,
      appendJsonl: () => true,
      ...overrides,
    };
  }
  test("allow when no extraction path touched", () => {
    const d = cfGuard.decideStop({}, baseOpts({ gitChangedFiles: () => ["README.md"] }));
    assert.equal(d.decision, "allow");
    assert.equal(d.reason, "no_extraction_path_touch");
  });
  test("allow when audit fresh", () => {
    const d = cfGuard.decideStop(
      {},
      baseOpts({
        gitChangedFiles: () => ["mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts"],
        inspectAuditMarker: () => ({ state: "fresh", ageHr: 1 }),
      })
    );
    assert.equal(d.decision, "allow");
    assert.equal(d.reason, "audit_fresh");
  });
  test("defer when extraction touched + audit missing + U8 not shipped", () => {
    const d = cfGuard.decideStop(
      {},
      baseOpts({
        gitChangedFiles: () => ["mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts"],
        inspectAuditMarker: () => ({ state: "missing" }),
        isU8EngineShipped: () => false,
      })
    );
    assert.equal(d.decision, "defer");
    assert.equal(d.reason, "u8_not_shipped");
    assert.equal(d.touched.length, 1);
  });
  test("block when audit stale", () => {
    const d = cfGuard.decideStop(
      {},
      baseOpts({
        gitChangedFiles: () => ["mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts"],
        inspectAuditMarker: () => ({ state: "stale", ageHr: 48, mtimeMs: Date.now() - 48 * 3_600_000 }),
      })
    );
    assert.equal(d.decision, "block");
    assert.equal(d.reason, "audit_stale");
    assert.equal(d.blockCount, 1);
  });
  test("block when audit missing + U8 IS shipped", () => {
    const d = cfGuard.decideStop(
      {},
      baseOpts({
        gitChangedFiles: () => ["mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts"],
        inspectAuditMarker: () => ({ state: "missing" }),
        isU8EngineShipped: () => true,
      })
    );
    assert.equal(d.decision, "block");
    assert.equal(d.reason, "audit_missing_u8_shipped");
  });
  test("allow at block-limit reached (escape hatch)", () => {
    const d = cfGuard.decideStop(
      {},
      baseOpts({
        config: cfGuard.getConfig({ PRISM_BLUEPRINT_COVERAGE_FLOOR_BLOCK_LIMIT: "3" }),
        gitChangedFiles: () => ["mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts"],
        inspectAuditMarker: () => ({ state: "stale", ageHr: 48 }),
        isU8EngineShipped: () => true,
        bumpBlockCount: () => 4, // exceeds limit
      })
    );
    assert.equal(d.decision, "allow");
    assert.equal(d.reason, "block_limit_reached");
  });
  test("allow when disabled via env knob (logged)", () => {
    let logged = false;
    const d = cfGuard.decideStop(
      {},
      baseOpts({
        config: { ...cfGuard.getConfig({}), disabled: true },
        appendJsonl: () => { logged = true; return true; },
      })
    );
    assert.equal(d.decision, "allow");
    assert.equal(d.reason, "disabled_env_knob");
    assert.equal(logged, true);
  });
  test("allow when bypassOnce set (logged)", () => {
    let bypassPayload = null;
    const d = cfGuard.decideStop(
      { session_id: "s1" },
      baseOpts({
        config: { ...cfGuard.getConfig({}), bypassOnce: true },
        appendJsonl: (root, rel, payload) => { bypassPayload = payload; return true; },
      })
    );
    assert.equal(d.decision, "allow");
    assert.equal(d.reason, "bypass_once");
    assert.equal(bypassPayload?.kind, "bypass_once");
    assert.equal(bypassPayload?.sessionId, "s1");
  });
  test("allow when git unavailable (defensive)", () => {
    const d = cfGuard.decideStop(
      {},
      baseOpts({ gitChangedFiles: () => null })
    );
    assert.equal(d.decision, "allow");
    assert.equal(d.reason, "git_unavailable");
  });
});

describe("coverage-floor-guard / message formatting", () => {
  test("block message lists touched files", () => {
    const msg = cfGuard.formatBlockMessage({
      reason: "audit_stale",
      marker: { ageHr: 48, mtimeMs: Date.UTC(2026, 4, 14) },
      touched: ["a.ts", "b.ts"],
      blockCount: 1,
      blockLimit: 3,
    });
    assert.match(msg, /STALE/);
    assert.match(msg, /a\.ts/);
    assert.match(msg, /b\.ts/);
    assert.match(msg, /Block 1\/3/);
    assert.match(msg, /BYPASS/);
  });
  test("block message truncates >8 files", () => {
    const many = Array.from({ length: 12 }, (_, i) => `file${i}.ts`);
    const msg = cfGuard.formatBlockMessage({
      reason: "audit_stale",
      marker: { ageHr: 48 },
      touched: many,
      blockCount: 1,
      blockLimit: 3,
    });
    assert.match(msg, /and 4 more/);
  });
  test("defer message names U8 producer", () => {
    const msg = cfGuard.formatDeferMessage({
      touched: ["mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts"],
    });
    assert.match(msg, /DEFERRED/);
    assert.match(msg, /BlueprintCoverageAuditEngine/);
  });
});

describe("coverage-floor-guard / resolveRepoRoot", () => {
  test("explicit env override wins", () => {
    const r = cfGuard.resolveRepoRoot({ PRISM_BLUEPRINT_COVERAGE_FLOOR_REPO: "/explicit/path" });
    assert.equal(r, "/explicit/path");
  });
  test("git rev-parse derivation succeeds", () => {
    const runner = () => "H:/prism-slot-bravo\n";
    const r = cfGuard.resolveRepoRoot({}, runner);
    assert.equal(r, "H:/prism-slot-bravo");
  });
  test("falls back to CLAUDE_PROJECT_DIR when git fails", () => {
    const runner = () => { throw new Error("not a git repo"); };
    const r = cfGuard.resolveRepoRoot({ CLAUDE_PROJECT_DIR: "C:/proj" }, runner);
    assert.equal(r, "C:/proj");
  });
  test("falls back to H:/prism default when all else fails", () => {
    const runner = () => { throw new Error("not a git repo"); };
    const r = cfGuard.resolveRepoRoot({}, runner);
    assert.equal(r, "H:/prism");
  });
});

describe("coverage-floor-guard / resetBlockCount", () => {
  test("no-op when sessionId empty", () => {
    let calls = 0;
    const fs = { existsSync: () => { calls++; return false; }, readFileSync: () => "", writeFileSync: () => {}, mkdirSync: () => {} };
    const r = cfGuard.resetBlockCount("/repo", "", fs);
    assert.equal(r, false);
    assert.equal(calls, 0);
  });
  test("no-op when ledger file missing", () => {
    const fs = { existsSync: () => false, readFileSync: () => "", writeFileSync: () => {}, mkdirSync: () => {} };
    const r = cfGuard.resetBlockCount("/repo", "s1", fs);
    assert.equal(r, false);
  });
  test("deletes the session entry and rewrites ledger", () => {
    let written = null;
    const fs = {
      existsSync: () => true,
      readFileSync: () => JSON.stringify({ schemaVersion: 1, sessions: { s1: { count: 2 }, s2: { count: 1 } } }),
      writeFileSync: (p, body) => { written = JSON.parse(body); },
      mkdirSync: () => {},
    };
    const r = cfGuard.resetBlockCount("/repo", "s1", fs);
    assert.equal(r, true);
    assert.equal(written?.sessions?.s1, undefined);
    assert.equal(written?.sessions?.s2?.count, 1);
  });
  test("survives corrupted ledger silently", () => {
    const fs = {
      existsSync: () => true,
      readFileSync: () => "{not json",
      writeFileSync: () => { throw new Error("should not be called"); },
      mkdirSync: () => {},
    };
    const r = cfGuard.resetBlockCount("/repo", "s1", fs);
    assert.equal(r, false);
  });
});

describe("coverage-floor-guard / decideStop calls resetBlockCount on fresh", () => {
  test("fresh marker triggers resetBlockCount", () => {
    let resetCalled = false;
    const d = cfGuard.decideStop(
      { session_id: "freshie" },
      {
        config: cfGuard.getConfig({ PRISM_BLUEPRINT_COVERAGE_FLOOR_REPO: "/r" }),
        gitChangedFiles: () => ["mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts"],
        inspectAuditMarker: () => ({ state: "fresh", ageHr: 1 }),
        isU8EngineShipped: () => false,
        bumpBlockCount: () => 1,
        resetBlockCount: () => { resetCalled = true; return true; },
        appendJsonl: () => true,
      }
    );
    assert.equal(d.decision, "allow");
    assert.equal(resetCalled, true);
  });
});

describe("coverage-floor-guard / getConfig clamps", () => {
  test("clamps maxAgeHr to min 1", () => {
    assert.equal(cfGuard.getConfig({ PRISM_BLUEPRINT_COVERAGE_FLOOR_MAX_AGE_HR: "0" }).maxAgeHr, 1);
    assert.equal(cfGuard.getConfig({ PRISM_BLUEPRINT_COVERAGE_FLOOR_MAX_AGE_HR: "48" }).maxAgeHr, 48);
  });
  test("clamps blockLimit to min 1", () => {
    assert.equal(cfGuard.getConfig({ PRISM_BLUEPRINT_COVERAGE_FLOOR_BLOCK_LIMIT: "0" }).blockLimit, 1);
    assert.equal(cfGuard.getConfig({ PRISM_BLUEPRINT_COVERAGE_FLOOR_BLOCK_LIMIT: "5" }).blockLimit, 5);
  });
  test("disabled + bypassOnce flags reflect env", () => {
    const cfg = cfGuard.getConfig({
      PRISM_BLUEPRINT_COVERAGE_FLOOR_DISABLE: "1",
      PRISM_BLUEPRINT_COVERAGE_FLOOR_BYPASS: "1",
    });
    assert.equal(cfg.disabled, true);
    assert.equal(cfg.bypassOnce, true);
  });
  test("default repo root resolves via git rev-parse (or H:/prism fallback)", () => {
    // After U-MS1-U5 scrutiny fix, getConfig delegates to resolveRepoRoot
    // which derives from `git rev-parse --show-toplevel` first. On Windows
    // the drive-letter case follows the on-disk truth (`H:/PRISM` vs
    // `H:/prism`). The test just confirms a non-empty path-shaped string.
    const r = cfGuard.getConfig({}).repoRoot;
    assert.equal(typeof r, "string");
    assert.ok(r.length > 0);
    assert.match(r, /[A-Za-z]:\/.+|^\/.+/);
  });
  test("repo root overridable via env", () => {
    assert.equal(cfGuard.getConfig({ PRISM_BLUEPRINT_COVERAGE_FLOOR_REPO: "/other" }).repoRoot, "/other");
  });
});
