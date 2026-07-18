// Tests for five-hour-switch-gate.mjs (keystone #3 -- denominator-free gate).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldSwitchAbsolute,
  absThresholdFromEnv,
  decideSwitch,
  DEFAULT_PCT_THRESHOLD,
} from "./five-hour-switch-gate.mjs";

// ---------------- shouldSwitchAbsolute ----------------
test("shouldSwitchAbsolute: finite >= trigger true, below false", () => {
  assert.equal(shouldSwitchAbsolute(100, 80), true);
  assert.equal(shouldSwitchAbsolute(80, 80), true);   // boundary inclusive
  assert.equal(shouldSwitchAbsolute(79, 80), false);
});
test("shouldSwitchAbsolute: non-finite/absent/zero/negative trigger disables (false)", () => {
  assert.equal(shouldSwitchAbsolute(NaN, 80), false);
  assert.equal(shouldSwitchAbsolute(100, null), false);
  assert.equal(shouldSwitchAbsolute(100, 0), false);
  assert.equal(shouldSwitchAbsolute(100, -5), false);
  assert.equal(shouldSwitchAbsolute(Infinity, 80), false); // non-finite weightedTokens rejected (not a real count)
});

// ---------------- absThresholdFromEnv ----------------
test("absThresholdFromEnv: parses positive; rejects junk/0/negative; no default", () => {
  assert.equal(absThresholdFromEnv({ PRISM_5H_WEIGHTED_TOKEN_TRIGGER: "75000000" }), 75000000);
  assert.equal(absThresholdFromEnv({}), null);
  assert.equal(absThresholdFromEnv({ PRISM_5H_WEIGHTED_TOKEN_TRIGGER: "nope" }), null);
  assert.equal(absThresholdFromEnv({ PRISM_5H_WEIGHTED_TOKEN_TRIGGER: "0" }), null);
  assert.equal(absThresholdFromEnv({ PRISM_5H_WEIGHTED_TOKEN_TRIGGER: "-1" }), null);
});

// ---------------- decideSwitch: pct path ----------------
test("decideSwitch: pct path -- at/above threshold switches, below does not", () => {
  assert.deepEqual(
    { ...decideSwitch({ pct: 0.95, weightedTokens: null }, {}) },
    { switch: true, gate: "pct", value: 0.95, threshold: DEFAULT_PCT_THRESHOLD, reason: "pct-at-or-above-threshold" },
  );
  assert.equal(decideSwitch({ pct: 0.5 }, {}).switch, false);
  assert.equal(decideSwitch({ pct: 0.5 }, {}).gate, "pct");
});
test("decideSwitch: pct boundary == threshold switches (>=)", () => {
  assert.equal(decideSwitch({ pct: 0.90 }, { threshold: 0.90 }).switch, true);
});
test("decideSwitch: custom threshold honored", () => {
  assert.equal(decideSwitch({ pct: 0.8 }, { threshold: 0.75 }).switch, true);
  assert.equal(decideSwitch({ pct: 0.7 }, { threshold: 0.75 }).switch, false);
});

// ---------------- decideSwitch: pct PRECEDENCE over absolute ----------------
test("decideSwitch: pct takes precedence even when an absolute trigger is also set", () => {
  const d = decideSwitch({ pct: 0.5, weightedTokens: 999_999_999 }, { absThreshold: 1 });
  assert.equal(d.gate, "pct"); // NOT absolute -- pct wins when available
  assert.equal(d.switch, false); // pct 0.5 < 0.90
});

// ---------------- decideSwitch: absolute fallback (pct null) ----------------
test("decideSwitch: absolute path used when pct null + trigger set", () => {
  const hi = decideSwitch({ pct: null, weightedTokens: 90_000_000 }, { absThreshold: 80_000_000 });
  assert.deepEqual({ switch: hi.switch, gate: hi.gate, value: hi.value, threshold: hi.threshold }, { switch: true, gate: "absolute", value: 90_000_000, threshold: 80_000_000 });
  const lo = decideSwitch({ pct: null, weightedTokens: 70_000_000 }, { absThreshold: 80_000_000 });
  assert.equal(lo.switch, false);
  assert.equal(lo.gate, "absolute");
});
test("decideSwitch: absolute boundary == trigger switches", () => {
  assert.equal(decideSwitch({ pct: null, weightedTokens: 80 }, { absThreshold: 80 }).switch, true);
});

// ---------------- decideSwitch: undecidable (caller fails loud) ----------------
test("decideSwitch: undecidable when pct null AND no absolute trigger", () => {
  const d = decideSwitch({ pct: null, weightedTokens: 90_000_000 }, {});
  assert.equal(d.gate, "undecidable");
  assert.equal(d.switch, false);
  assert.match(d.reason, /PRISM_5H_WEIGHTED_BUDGET.*PRISM_5H_WEIGHTED_TOKEN_TRIGGER/);
});
test("decideSwitch: undecidable when pct null + trigger set BUT weightedTokens missing", () => {
  const d = decideSwitch({ pct: null, weightedTokens: null }, { absThreshold: 80_000_000 });
  assert.equal(d.gate, "undecidable");
  assert.equal(d.switch, false);
});
