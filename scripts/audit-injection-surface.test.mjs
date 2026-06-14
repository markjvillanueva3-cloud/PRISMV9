// Tests for audit-injection-surface.mjs -- TOKEN-EFFICIENCY-INJECT/U-INJECTION-SURFACE-CENSUS
// (2026-06-10, slot:bravo). Pure-function coverage + an end-to-end buildAudit
// over a fixture settings object with a fake readSource (no real FS).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractHookPath, hookKeyFromPath, detectKnobs, emitsContext, enumerateInjectors, buildAudit, computeWeight,
} from "./audit-injection-surface.mjs";

// --- extractHookPath ---

test("extractHookPath: pulls the .mjs path from a quoted $CLAUDE_PROJECT_DIR command", () => {
  assert.equal(extractHookPath('"$CLAUDE_PROJECT_DIR/.claude/hooks/foo.mjs"'),
    "$CLAUDE_PROJECT_DIR/.claude/hooks/foo.mjs");
});

test("extractHookPath: handles a node-prefixed python command", () => {
  assert.equal(extractHookPath('node "/abs/path/lib/bar.py" --flag'), "/abs/path/lib/bar.py");
});

test("extractHookPath: no script token -> null; non-string -> null", () => {
  assert.equal(extractHookPath("echo hello"), null);
  assert.equal(extractHookPath(null), null);
  assert.equal(extractHookPath(42), null);
});

// --- hookKeyFromPath ---

test("hookKeyFromPath: basename minus extension, both slash styles", () => {
  assert.equal(hookKeyFromPath("$CLAUDE_PROJECT_DIR/.claude/hooks/foo-bar.mjs"), "foo-bar");
  assert.equal(hookKeyFromPath("C:\\x\\y\\baz.py"), "baz");
  assert.equal(hookKeyFromPath(null), null);
  assert.equal(hookKeyFromPath(""), null);
});

// --- detectKnobs ---

test("detectKnobs: finds DISABLE/INJECT/SILENCE/OFF/SKIP knobs, sorted-unique", () => {
  const src = `
    if (process.env.PRISM_FOO_DISABLE === "1") return;
    if (process.env.PRISM_BAR_INJECT === "0") return;
    const x = process.env.PRISM_FOO_DISABLE; // dup
    process.env.PRISM_BAZ_SILENCE;
  `;
  const r = detectKnobs(src);
  assert.equal(r.hasKnob, true);
  assert.deepEqual(r.knobs, ["PRISM_BAR_INJECT", "PRISM_BAZ_SILENCE", "PRISM_FOO_DISABLE"]);
});

test("detectKnobs: a hook with NO gate knob -> hasKnob false (the actionable gap)", () => {
  const r = detectKnobs("export function emit(x){ process.stdout.write(x); }");
  assert.equal(r.hasKnob, false);
  assert.deepEqual(r.knobs, []);
});

test("detectKnobs: a plain PRISM_ var that is NOT a gate (e.g. PRISM_PROJECT_DIR) is not a knob", () => {
  const r = detectKnobs("const d = process.env.PRISM_PROJECT_DIR;");
  assert.equal(r.hasKnob, false);
});

test("detectKnobs: catches SILENT/WARN-suffix knobs (the false-negative class that mislabeled real knobs)", () => {
  // local-compute-intent.mjs style: PRISM_LOCAL_COMPUTE_SILENT
  assert.equal(detectKnobs('const s = process.env.PRISM_LOCAL_COMPUTE_SILENT !== "0";').hasKnob, true);
  // stale-state-warn.mjs style: PRISM_STALE_STATE_WARN === "0"
  assert.equal(detectKnobs('if (process.env.PRISM_STALE_STATE_WARN === "0") process.exit(0);').knobs.includes("PRISM_STALE_STATE_WARN"), true);
});

test("detectKnobs: catches the ===/!== \"0\"/\"1\" gating idiom even when the NAME lacks a verb", () => {
  // PRISM_LOCAL_COMPUTE_AUTOSTART has no gate-verb in its name, but `!== "0"` gates it
  const r = detectKnobs('const on = process.env.PRISM_LOCAL_COMPUTE_AUTOSTART !== "0";');
  assert.equal(r.hasKnob, true);
  assert.equal(r.knobs.includes("PRISM_LOCAL_COMPUTE_AUTOSTART"), true);
});

test("detectKnobs: a config var (compared to a non-0/1 value) is NOT a knob (no false positive)", () => {
  // R12: widening the detector must not start flagging plain config as a gate.
  assert.equal(detectKnobs('const n = Number(process.env.PRISM_FOO_TIMEOUT_MS || 5000);').hasKnob, false);
  assert.equal(detectKnobs('const root = process.env.PRISM_WIKI_ROOT ?? "/x";').hasKnob, false);
});

test("detectKnobs: null/empty source -> no knob (failure mode)", () => {
  assert.deepEqual(detectKnobs(null), { hasKnob: false, knobs: [] });
  assert.deepEqual(detectKnobs(""), { hasKnob: false, knobs: [] });
  assert.deepEqual(detectKnobs(42), { hasKnob: false, knobs: [] });
});

// --- emitsContext ---

test("emitsContext: true when the hook writes additionalContext / hookSpecificOutput", () => {
  assert.equal(emitsContext('process.stdout.write(JSON.stringify({hookSpecificOutput:{additionalContext:"x"}}))'), true);
  assert.equal(emitsContext('const o={additionalContext:"hi"};'), true);
});

test("emitsContext: false for a guard/setup hook that emits no context (NOT a token concern)", () => {
  assert.equal(emitsContext('if(!existsSync(p)) process.exit(1); // portable-node guard'), false);
  assert.equal(emitsContext(null), false);
  assert.equal(emitsContext(""), false);
});

// --- enumerateInjectors ---

const FIXTURE_SETTINGS = {
  hooks: {
    SessionStart: [
      { hooks: [
        { command: '"$CLAUDE_PROJECT_DIR/.claude/hooks/gated-ss.mjs"' },
        { command: '"$CLAUDE_PROJECT_DIR/.claude/hooks/knobless-ss.mjs"' },
        { command: '"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-ss.mjs"' },   // knobless GUARD (no context)
      ] },
    ],
    UserPromptSubmit: [
      { hooks: [
        { command: '"$CLAUDE_PROJECT_DIR/.claude/hooks/gated-ups.mjs"' },
        { command: "not-a-script echo hi" },     // path-less -> unresolved
        { command: 42 },                          // non-string -> skipped
      ] },
    ],
    Stop: [ { hooks: [ { command: '"$CLAUDE_PROJECT_DIR/.claude/hooks/stop-only.mjs"' } ] } ],
  },
};

test("enumerateInjectors: default events = SessionStart + UserPromptSubmit only", () => {
  const inj = enumerateInjectors(FIXTURE_SETTINGS);
  // 3 SS + 2 UPS (the non-string command is skipped) = 5
  assert.equal(inj.length, 5);
  assert.ok(inj.every((i) => i.event === "SessionStart" || i.event === "UserPromptSubmit"));
  assert.ok(!inj.some((i) => i.event === "Stop"), "Stop must NOT be enumerated by default");
});

test("enumerateInjectors: explicit event arg targets a different event", () => {
  const inj = enumerateInjectors(FIXTURE_SETTINGS, ["Stop"]);
  assert.equal(inj.length, 1);
  assert.equal(inj[0].key, "stop-only");
});

test("enumerateInjectors: empty / hookless settings -> [] (adversarial)", () => {
  assert.deepEqual(enumerateInjectors({}), []);
  assert.deepEqual(enumerateInjectors(null), []);
  assert.deepEqual(enumerateInjectors({ hooks: {} }), []);
});

// --- buildAudit (end-to-end over the fixture) ---

const FAKE_SOURCES = {
  // gated + emits context
  "$CLAUDE_PROJECT_DIR/.claude/hooks/gated-ss.mjs": 'if(process.env.PRISM_GATED_SS_DISABLE==="1")return; const o={hookSpecificOutput:{additionalContext:"x"}};',
  // KNOBLESS + emits context -> the real token gap
  "$CLAUDE_PROJECT_DIR/.claude/hooks/knobless-ss.mjs": 'process.stdout.write(JSON.stringify({hookSpecificOutput:{additionalContext:"always"}}));',
  // KNOBLESS GUARD: emits NO context -> not a token concern
  "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-ss.mjs": 'if(!existsSync(p)) process.exit(1); // setup guard',
  // gated + emits context
  "$CLAUDE_PROJECT_DIR/.claude/hooks/gated-ups.mjs": 'if(process.env.PRISM_GATED_UPS_INJECT==="0")return; o.additionalContext="hi";',
};
const fakeRead = (p) => (p in FAKE_SOURCES ? FAKE_SOURCES[p] : null);

test("buildAudit: separates the knobless CONTEXT gap from knobless guards", () => {
  const inj = enumerateInjectors(FIXTURE_SETTINGS);
  const audit = buildAudit(inj, fakeRead, { "knobless-ss": 12.5, "gated-ss": 3.0 });
  assert.equal(audit.recurringTotal, 5);
  assert.equal(audit.withKnob, 2, "gated-ss + gated-ups have knobs");
  assert.equal(audit.emittingTotal, 3, "gated-ss + knobless-ss + gated-ups emit context");
  assert.equal(audit.knoblessCount, 1, "only knobless-ss EMITS context AND lacks a knob (the gap)");
  assert.equal(audit.knobless[0].key, "knobless-ss");
  assert.equal(audit.knoblessGuardsCount, 1, "guard-ss is knobless but emits no context -> guard, not gap");
  assert.equal(audit.knoblessGuards[0].key, "guard-ss");
  assert.equal(audit.unresolved, 1, "the path-less 'not-a-script' command is unresolved");
  // coverage = withKnob / total = 2/5 = 40%
  assert.equal(audit.knobCoveragePct, 40);
});

test("buildAudit: a path that fails to read is 'unresolved', NOT falsely flagged knobless", () => {
  // R12: never accuse an injector of being knobless when we just could not read it.
  const inj = [{ event: "SessionStart", path: "$X/missing.mjs", key: "missing" }];
  const audit = buildAudit(inj, () => null, {});
  assert.equal(audit.knoblessCount, 0);
  assert.equal(audit.unresolved, 1);
  assert.equal(audit.rows[0].sourceMissing, true);
});

test("buildAudit: fire-rate enrichment + knobless-first/fire-desc sort", () => {
  const inj = enumerateInjectors(FIXTURE_SETTINGS);
  const audit = buildAudit(inj, fakeRead, { "knobless-ss": 99.0, "gated-ss": 1.0 });
  // highest fire-rate (knobless-ss @99) sorts first
  assert.equal(audit.rows[0].key, "knobless-ss");
  assert.equal(audit.rows[0].fireRatePerHour, 99.0);
  // an injector with no ledger entry -> null fire-rate (honest, not 0-faked)
  const gatedUps = audit.rows.find((r) => r.key === "gated-ups");
  assert.equal(gatedUps.fireRatePerHour, null);
});

test("buildAudit: empty injector list -> zero totals, 0% coverage (no divide-by-zero)", () => {
  const audit = buildAudit([], fakeRead, {});
  assert.equal(audit.recurringTotal, 0);
  assert.equal(audit.knobCoveragePct, 0);
  assert.deepEqual(audit.knobless, []);
});

// --- computeWeight (the bytes x fires/hr ranking signal) ---

test("computeWeight: bytes x fires/hr when both finite", () => {
  assert.equal(computeWeight(2000, 12.5), 25000);
  assert.equal(computeWeight(0, 99), 0, "a 0-byte emitter has 0 weight even if it fires often");
  assert.equal(computeWeight(500, 0), 0, "a hook that never fires has 0 weight even if big");
});

test("computeWeight: null when EITHER dimension is missing (cannot rank without both)", () => {
  assert.equal(computeWeight(null, 12.5), null, "no bytes -> not rankable");
  assert.equal(computeWeight(2000, null), null, "no fire-rate -> not rankable");
  assert.equal(computeWeight(null, null), null);
  assert.equal(computeWeight(undefined, 5), null);
  assert.equal(computeWeight(NaN, 5), null);
});

test("computeWeight: negative inputs rejected (adversarial -> null, never a phantom rank)", () => {
  assert.equal(computeWeight(-1, 5), null);
  assert.equal(computeWeight(100, -5), null);
});

// --- buildAudit bytes dimension (real per-injector bytes -> cut list) ---

test("buildAudit: with bytesByKey, rows get contextBytes + weightPerHour and topByWeight ranks heaviest first", () => {
  const inj = enumerateInjectors(FIXTURE_SETTINGS);
  // knobless-ss: small but fires constantly; gated-ss: big but rare -> weight decides
  const audit = buildAudit(inj, fakeRead,
    { "knobless-ss": 100, "gated-ss": 10 },        // fires/hr
    { "knobless-ss": 200, "gated-ss": 1500 });     // bytes
  assert.equal(audit.bytesProbed, true, "probing happened -> flag set");
  // weights: knobless-ss = 200*100 = 20000; gated-ss = 1500*10 = 15000
  assert.equal(audit.topByWeight[0].key, "knobless-ss", "heaviest by bytes x fires wins, not by raw bytes");
  assert.equal(audit.topByWeight[0].weightPerHour, 20000);
  assert.equal(audit.topByWeight[1].key, "gated-ss");
  assert.equal(audit.topByWeight[1].weightPerHour, 15000);
  // gated-ups has bytes-probe miss (not in map) -> no weight, excluded from cut list
  assert.ok(!audit.topByWeight.some((r) => r.key === "gated-ups"));
});

test("buildAudit: WITHOUT bytesByKey (default), bytesProbed=false + cut lists empty (back-compat)", () => {
  const inj = enumerateInjectors(FIXTURE_SETTINGS);
  const audit = buildAudit(inj, fakeRead, { "knobless-ss": 99 });  // no 4th arg
  assert.equal(audit.bytesProbed, false);
  assert.deepEqual(audit.topByWeight, []);
  assert.deepEqual(audit.topByBytes, []);
  // existing rows still carry the new fields as null (no crash, honest)
  assert.equal(audit.rows[0].contextBytes, null);
  assert.equal(audit.rows[0].weightPerHour, null);
});

test("buildAudit: topByBytes ranks by raw bytes even with NO fire data (the sparse-ledger reality)", () => {
  // The fire-counter only instruments a few hooks, so the cut list must still
  // rank by raw bytes when fireRate is absent -- else it is useless in practice.
  const inj = enumerateInjectors(FIXTURE_SETTINGS);
  const audit = buildAudit(inj, fakeRead, {},                       // NO fire-rate at all
    { "gated-ss": 1500, "knobless-ss": 200, "gated-ups": 50 });     // bytes only
  assert.equal(audit.bytesProbed, true);
  assert.equal(audit.topByBytes[0].key, "gated-ss", "biggest payload first");
  assert.equal(audit.topByBytes[0].contextBytes, 1500);
  assert.equal(audit.topByBytes[1].key, "knobless-ss");
  assert.equal(audit.topByBytes[2].key, "gated-ups");
  // weight list is empty (no fire data) -- but the bytes list still serves
  assert.deepEqual(audit.topByWeight, []);
});

test("buildAudit: a 0-byte probe row is excluded from topByBytes (no phantom entries)", () => {
  const inj = enumerateInjectors(FIXTURE_SETTINGS);
  const audit = buildAudit(inj, fakeRead, {}, { "gated-ss": 0, "knobless-ss": 300 });
  assert.equal(audit.topByBytes.length, 1, "the 0-byte emitter is not listed");
  assert.equal(audit.topByBytes[0].key, "knobless-ss");
});
