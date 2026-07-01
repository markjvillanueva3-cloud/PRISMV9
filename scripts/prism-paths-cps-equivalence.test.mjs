#!/usr/bin/env node
/**
 * prism-paths-cps-equivalence.test.mjs — NO-DRIFT guarantee for the two base posts.
 *
 * The shared feed core exists in two consumption forms:
 *   - scripts/prism-paths-feed.mjs           (tested reference, ESM — used by the Tier-2 add-in)
 *   - mcp-server/data/posts/prism-base/prism-paths-feed.cps  (ES5, include()d by both base .cps posts)
 * This test runs the SAME input battery through BOTH and asserts identical numeric output, so
 * the .cps inline can never silently drift from the reference. It also asserts the .cps's baked
 * CANONICAL_KIENZLE equals src/physics/constants.ts (the doctrine single-source).
 * Run: node --test scripts/prism-paths-cps-equivalence.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as mjs from "./prism-paths-feed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// the .cps is CommonJS-guarded → require() loads it directly as a module
const cps = require(path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base", "prism-paths-feed.cps"));

// representative battery spanning materials, op types, engagement, spindle envelopes, edge cases
const BATTERY = [
  { toolDia: 0.5, ae: 0.5, ap: 0.25, feed: 40, rpm: 2000, flutes: 4, isoGroup: "P", spindleHP: 10, spindleTorqueFtLb: 80, hrc: 0, aggressivenessLevel: 5, toolLength: 1.5, fluteLength: 1.0 },
  { toolDia: 0.25, ae: 0.02, ap: 0.05, feed: 60, rpm: 12000, flutes: 3, isoGroup: "N", spindleHP: 20, spindleTorqueFtLb: 100, hrc: 0, aggressivenessLevel: 8, toolLength: 0.75, fluteLength: 0.5 },
  { toolDia: 0.5, ae: 0.1, ap: 0.95, feed: 30, rpm: 6000, flutes: 4, isoGroup: "S", spindleHP: 50, spindleTorqueFtLb: 500, hrc: 42, aggressivenessLevel: 3, toolLength: 3.0, fluteLength: 1.0, isAdaptive: true },
  { toolDia: 1.0, ae: 0.45, ap: 1.0, feed: 25, rpm: 1500, flutes: 5, isoGroup: "M", spindleHP: 7.5, spindleTorqueFtLb: 60, hrc: 30, aggressivenessLevel: 6, toolLength: 4.0, fluteLength: 2.0 },
  { toolDia: 0.375, ae: 0.3, ap: 0.1, feed: 50, rpm: 8000, flutes: 2, isoGroup: "K", spindleHP: 15, spindleTorqueFtLb: 120, hrc: 55, aggressivenessLevel: 1, toolLength: 2.0, fluteLength: 1.5, isFinishing: true },
  { toolDia: 0.75, ae: 0.6, ap: 0.5, feed: 35, rpm: 3000, flutes: 4, isoGroup: "H", spindleHP: 25, spindleTorqueFtLb: 200, hrc: 60, aggressivenessLevel: 5, toolLength: 5.0, fluteLength: 1.0, is3D: true },
  {}, // empty
  { toolDia: 0, ae: 0, ap: 0, feed: 0, rpm: 0 }, // all-zero
];

test("kc1.1/mc baked in the .cps EXACTLY match src/physics/constants.ts (doctrine single-source)", () => {
  const canon = mjs.loadCanonicalKienzle(); // parses constants.ts
  assert.deepEqual(cps.CANONICAL_KIENZLE, canon, "baked .cps kc table must equal constants.ts CANONICAL_KIENZLE");
});

test("each op-level factor: .cps === .mjs across the battery (numeric)", () => {
  const fns = ["chipThinningFactor", "hardnessSpeedFactor", "aggressivenessFactor", "stickoutDeflectionFactor", "axialDepthFactor", "adaptive3DFactor", "aeMaxSafeFactor"];
  for (const ctx of BATTERY) {
    for (const fn of fns) {
      const a = mjs[fn](ctx).factor, b = cps[fn](ctx).factor;
      assert.ok(Math.abs(a - b) < 1e-12, `${fn} drift on ${JSON.stringify(ctx)}: mjs=${a} cps=${b}`);
    }
    const ga = mjs.kienzlePowerTorqueGuard(ctx), gb = cps.kienzlePowerTorqueGuard(ctx);
    assert.ok(Math.abs(ga.factor - gb.factor) < 1e-12, `guard factor drift: ${ga.factor} vs ${gb.factor}`);
    assert.ok(Math.abs((ga.powerHP || 0) - (gb.powerHP || 0)) < 1e-9, `guard power drift`);
  }
});

test("prismPaths pipeline: feed + combinedFactor + per-stage factors === across the battery", () => {
  for (const ctx of BATTERY) {
    const a = mjs.prismPaths(ctx.feed || 30, ctx, {});
    const b = cps.prismPaths(ctx.feed || 30, ctx, {});
    assert.ok(Math.abs(a.feed - b.feed) < 1e-9, `feed drift on ${JSON.stringify(ctx)}: ${a.feed} vs ${b.feed}`);
    assert.ok(Math.abs(a.combinedFactor - b.combinedFactor) < 1e-9, `combinedFactor drift: ${a.combinedFactor} vs ${b.combinedFactor}`);
    assert.equal(a.factors.length, b.factors.length, "same stage count");
    for (let i = 0; i < a.factors.length; i++) {
      assert.equal(a.factors[i].id, b.factors[i].id, "same stage order");
      assert.ok(Math.abs(a.factors[i].factor - b.factors[i].factor) < 1e-12, `stage ${a.factors[i].id} drift`);
    }
  }
});

test("prismPaths opts (disabled set, prove-out, min/max feed) behave identically", () => {
  const ctx = BATTERY[3];
  // disabled non-safety stage
  const a1 = mjs.prismPaths(30, ctx, { disabled: ["chipThinning"] });
  const b1 = cps.prismPaths(30, ctx, { disabled: ["chipThinning"] });
  assert.ok(Math.abs(a1.feed - b1.feed) < 1e-9, "disabled-stage feed parity");
  // safety stage non-skippable outside prove-out
  const a2 = mjs.prismPaths(30, ctx, { disabled: ["powerTorqueGuard"] });
  const b2 = cps.prismPaths(30, ctx, { disabled: ["powerTorqueGuard"] });
  assert.equal(a2.factors.find((f) => f.id === "powerTorqueGuard").skipped, undefined);
  assert.equal(b2.factors.find((f) => f.id === "powerTorqueGuard").skipped, undefined);
  // prove-out allows skip
  const a3 = mjs.prismPaths(30, { ...ctx, proveOut: true }, { disabled: ["powerTorqueGuard"] });
  const b3 = cps.prismPaths(30, { ...ctx, proveOut: true }, { disabled: ["powerTorqueGuard"] });
  assert.equal(!!a3.factors.find((f) => f.id === "powerTorqueGuard").skipped, true);
  assert.equal(!!b3.factors.find((f) => f.id === "powerTorqueGuard").skipped, true);
  // min/max clamp
  const a4 = mjs.prismPaths(100, BATTERY[1], { maxFeed: 50 });
  const b4 = cps.prismPaths(100, BATTERY[1], { maxFeed: 50 });
  assert.ok(Math.abs(a4.feed - b4.feed) < 1e-9 && b4.feed <= 50, "maxFeed parity");
});

test("motion factors excluded from op-level pipeline in BOTH (same per-move split)", () => {
  assert.deepEqual([...cps.PRISM_PATHS_MOTION_FACTORS].sort(), [...mjs.PRISM_PATHS_MOTION_FACTORS].sort());
  const cpsIds = cps.PRISM_PATHS_STAGES.map((s) => s.id);
  for (const m of cps.PRISM_PATHS_MOTION_FACTORS) assert.ok(!cpsIds.includes(m), `${m} must not be op-level in .cps`);
});

test("the .cps is structurally Fusion-includable (no ESM, CommonJS guard present)", () => {
  const src = readFileSync(path.join(__dirname, "..", "mcp-server", "data", "posts", "prism-base", "prism-paths-feed.cps"), "utf8");
  // match real ESM STATEMENTS (line-leading), not the word "export" inside a comment/`module.exports`
  assert.ok(!/^\s*import\s+[\w{*'"]/m.test(src), "no ESM import statement (Fusion uses an ES5-ish engine)");
  assert.ok(!/^\s*export\s+(default|const|function|class|let|var|\{)/m.test(src), "no ESM export statement");
  assert.ok(/typeof module !== "undefined"/.test(src), "CommonJS guard for node require()");
  assert.ok(!/=>/.test(src), "no arrow functions (ES5)");
  assert.ok(!/`/.test(src), "no template literals (ES5)");
});
