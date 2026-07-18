/**
 * Lathe Wizard — PROPERTY-BASED INVARIANT sweep (operator-named invariants).
 * ==========================================================================
 *
 * Operator goal: "fully test the lathe wizard with ALL combinations of inputs
 * (machines, tooling, inserts, materials) — check the accuracy and validity of
 * every logical combination."
 *
 * The categorical × continuous input space of
 * `LatheSpeedFeedCalculatorFacadeEngine.calculate` is ~1e7+ combinations, so no
 * single golden value exists. Instead this file asserts a set of PROPERTY-BASED
 * invariants that must hold for EVERY logical combination, exercised on a real
 * deterministic combinatorial sweep of 5,376 combos (>> the 500-combo floor) plus
 * focused metamorphic pairs. Every invariant is physics-grounded:
 *
 *   P1. Vc>0 ⇒ rpm>0            (spindle speed follows a positive surface speed)
 *   P2. tool-life finite & >0    (Taylor T=(C/Vc)^(1/n) is strictly positive)
 *   P3. NO NaN / Infinity in ANY numeric output field (deep structural walk)
 *   P4. MRR = Vc·ap·f finite & >0 + vf = f·rpm finite & >0  (turning MRR identity;
 *       ap·ae·vf is the generic MRR schema — for TURNING ae/vf collapse to the
 *       Vc·ap·f closed form, MRR[cm³/min] = Vc[m/min]·ap[mm]·f[mm/rev])
 *   P5. cutting force is non-decreasing in FEED  (Kienzle Fc=kc1.1·ap·f^(1-mc),
 *       exponent 1-mc≈0.75>0 → monotone-increasing in f; feed isolated via
 *       nose-radius with ap held constant)
 *   P6. MRR is non-decreasing from conservative → maximum_mrr strategy
 *   P7. hardness monotonicity (scoped): on a conventional-carbide-turned ladder
 *       spanning N→P→K→S, a HARDER material never gets a HIGHER recommended Vc.
 *
 * PHYSICS SCOPING NOTE (P7) — why the ladder excludes ISO group H:
 *   The engine's cutting speed is a function of ISO GROUP (CANONICAL_TURNING_SPEEDS,
 *   constants.ts), not of raw Brinell hardness. Group-roughing Vc is
 *   N=400 > P=220 > K=180 > M=150 > H=80 > S=35 m/min. A naive GLOBAL
 *   "harder ⇒ Vc not higher" is therefore PHYSICALLY FALSE: H-group hardened tool
 *   steel (e.g. AISI D2, HB≈688) is hard-turned with CBN at Vc≈80, FASTER than
 *   S-group titanium (Ti-6Al-4V, HB≈334, Vc≈35) whose low speed is driven by poor
 *   thermal conductivity + chemical reactivity, not hardness. That inversion is
 *   CORRECT physics, not a defect, and is asserted explicitly in P7b so it is
 *   documented rather than silently "violated". P7a scopes the monotonic claim to
 *   the carbide-turned N/P/K/S ladder where hardness and machinability co-vary.
 *
 * Test-only. NO engine-source edits. Any genuine invariant VIOLATION is pinned
 * with `// BUG:` + a fail-loud repro, never patched here.
 */

import { describe, it, expect } from "vitest";
import {
  LatheSpeedFeedCalculatorFacadeEngine,
  type LatheSpeedFeedInput,
  type LatheSpeedFeedResult,
} from "../engines/LatheSpeedFeedCalculatorFacadeEngine.js";

// ---------------------------------------------------------------------------
// Deterministic combinatorial grid (full product — provable combo count).
// Spans every ISO group (N,P,M,K,S,H), 4 tool types, 4 operations, all 4
// strategies, 2 coolants, 3 diameters, 2 machine envelopes = 5,376 combos.
// ---------------------------------------------------------------------------

const MATERIALS = [
  "6061",       // N — aluminum, HB 95, Vc 400
  "4140",       // P — alloy steel, HB 197, Vc 220
  "304",        // M — stainless, HB 170, Vc 150
  "gray_iron",  // K — cast iron, HB 200, Vc 180
  "Ti-6Al-4V",  // S — titanium, HB 334, Vc 35
  "D2",         // H — hardened tool steel, HB 688, Vc 80
  "1018",       // P — mild steel, HB 126, Vc 220
] as const;

const TOOL_TYPES: Array<LatheSpeedFeedInput["tool"]["type"]> = [
  "turning_insert",
  "boring_bar",
  "grooving",
  "parting",
];

const OPERATIONS: Array<LatheSpeedFeedInput["operation"]["type"]> = [
  "roughing",
  "finishing",
  "grooving",
  "boring",
];

const STRATEGIES: Array<NonNullable<LatheSpeedFeedInput["strategy"]>> = [
  "conservative",
  "balanced",
  "aggressive",
  "maximum_mrr",
];

const COOLANTS: Array<NonNullable<LatheSpeedFeedInput["operation"]["coolant"]>> = [
  "flood",
  "dry",
];

const DIAMETERS_MM = [12, 50, 120];

const MACHINES = [
  { max_rpm: 3800, max_power_kw: 11 }, // Okuma fleet floor (tight)
  { max_rpm: 6000, max_power_kw: 22 }, // looser envelope
];

const EXPECTED_COMBOS =
  MATERIALS.length *
  TOOL_TYPES.length *
  OPERATIONS.length *
  STRATEGIES.length *
  COOLANTS.length *
  DIAMETERS_MM.length *
  MACHINES.length; // 7*4*4*4*2*3*2 = 5376

/** Iterate the full grid, yielding one concrete input per combination. */
function* everyCombo(): Generator<LatheSpeedFeedInput> {
  for (const material of MATERIALS)
    for (const toolType of TOOL_TYPES)
      for (const opType of OPERATIONS)
        for (const strategy of STRATEGIES)
          for (const coolant of COOLANTS)
            for (const dia of DIAMETERS_MM)
              for (const machine of MACHINES)
                yield {
                  material,
                  tool: { type: toolType },
                  operation: { type: opType, coolant },
                  machine,
                  workpiece: { diameter_mm: dia },
                  strategy,
                } as LatheSpeedFeedInput;
}

// ---------------------------------------------------------------------------
// Deep NaN / Infinity walker (P3): every `number` reachable in the result must
// be finite. Records the dotted path of the first offender for a real repro.
// ---------------------------------------------------------------------------

interface NonFinite {
  path: string;
  value: unknown;
}

function findNonFiniteNumbers(root: unknown): NonFinite[] {
  const out: NonFinite[] = [];
  const walk = (node: unknown, path: string): void => {
    if (typeof node === "number") {
      if (!Number.isFinite(node)) out.push({ path, value: node });
      return;
    }
    if (node === null || node === undefined) return;
    if (typeof node === "string" || typeof node === "boolean") return;
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, path ? `${path}.${k}` : k);
      }
    }
  };
  walk(root, "");
  return out;
}

/** Compact repro string for a failing combo. */
function repro(input: LatheSpeedFeedInput): string {
  return (
    `material=${input.material} tool=${input.tool.type} op=${input.operation.type} ` +
    `strategy=${input.strategy} coolant=${input.operation.coolant} ` +
    `dia=${input.workpiece?.diameter_mm}mm max_rpm=${input.machine?.max_rpm}`
  );
}

// ===========================================================================
// (A) Per-cell property invariants over the full 5,376-combo sweep.
// ===========================================================================

describe("Lathe Wizard — per-cell property invariants (5,376-combo sweep)", () => {
  // Run the sweep ONCE, collect every violation, then assert per-invariant so a
  // single red run names exactly which property broke on which combo.
  interface Violation {
    invariant: string;
    input: LatheSpeedFeedInput;
    detail: string;
  }
  const violations: Violation[] = [];
  let processed = 0;
  let successCells = 0;

  for (const input of everyCombo()) {
    processed++;
    let result: LatheSpeedFeedResult;
    try {
      result = LatheSpeedFeedCalculatorFacadeEngine.calculate(input);
    } catch (err) {
      // calculate() must NEVER throw — it returns success:false on infeasible
      // input. A throw is itself a P0 defect for this combo.
      violations.push({
        invariant: "no-throw",
        input,
        detail: `calculate() threw: ${(err as Error).message}`,
      });
      continue;
    }

    // P3 — no NaN/Infinity in ANY numeric output field (applies to success AND
    // declared-failure results; a failure result still must be finite-shaped).
    const nonFinite = findNonFiniteNumbers(result);
    if (nonFinite.length > 0) {
      violations.push({
        invariant: "P3-no-nan-infinity",
        input,
        detail: `non-finite fields: ${nonFinite
          .map((n) => `${n.path}=${String(n.value)}`)
          .join(", ")}`,
      });
    }

    // Every material in the grid is a real canonical/alias key → every cell must
    // resolve to success. A false here is itself a defect worth surfacing.
    if (!result.success) {
      violations.push({
        invariant: "resolves-to-success",
        input,
        detail: `success=false for a known material; warnings=${JSON.stringify(
          result.warnings,
        )}`,
      });
      continue;
    }
    successCells++;

    const rec = result.recommendation;

    // P1 — Vc>0 ⇒ rpm>0.
    if (rec.cutting_speed_m_min > 0 && !(rec.rpm > 0)) {
      violations.push({
        invariant: "P1-vc-implies-rpm",
        input,
        detail: `Vc=${rec.cutting_speed_m_min} but rpm=${rec.rpm}`,
      });
    }

    // P2 — tool life finite & > 0 for valid inputs.
    const life = result.predicted_tool_life_min;
    if (life === undefined || !Number.isFinite(life) || life <= 0) {
      violations.push({
        invariant: "P2-tool-life-positive",
        input,
        detail: `predicted_tool_life_min=${String(life)}`,
      });
    }

    // P4 — turning MRR identity: MRR = Vc·ap·f (cm³/min), vf = f·rpm (mm/min).
    // "Consistency" = all factors simultaneously finite & positive ⇒ the product
    // is a valid positive removal rate (no silent zero / NaN MRR).
    const mrr = rec.cutting_speed_m_min * rec.depth_of_cut_mm * rec.feed_mm_rev;
    const vf = rec.feed_mm_rev * rec.rpm;
    if (!Number.isFinite(mrr) || mrr <= 0) {
      violations.push({
        invariant: "P4-mrr-positive",
        input,
        detail: `MRR=Vc·ap·f=${mrr} (Vc=${rec.cutting_speed_m_min}, ap=${rec.depth_of_cut_mm}, f=${rec.feed_mm_rev})`,
      });
    }
    if (!Number.isFinite(vf) || vf <= 0) {
      violations.push({
        invariant: "P4-vf-positive",
        input,
        detail: `vf=f·rpm=${vf} (f=${rec.feed_mm_rev}, rpm=${rec.rpm})`,
      });
    }
  }

  it("exercised the full deterministic combinatorial space (not a vacuous pass)", () => {
    expect(processed).toBe(EXPECTED_COMBOS);
    expect(processed).toBeGreaterThanOrEqual(500);
    // All 7 grid materials are real keys → every cell must have resolved.
    expect(successCells).toBe(EXPECTED_COMBOS);
  });

  it("P3: no NaN/Infinity in any numeric output field across every combo", () => {
    const hits = violations.filter((v) => v.invariant === "P3-no-nan-infinity");
    if (hits.length > 0) {
      throw new Error(
        `${hits.length}/${processed} combos emitted a non-finite number:\n` +
          hits
            .slice(0, 8)
            .map((h) => `  ${repro(h.input)} :: ${h.detail}`)
            .join("\n"),
      );
    }
    expect(hits).toEqual([]);
  });

  it("P1: Vc>0 ⇒ rpm>0 for every combo", () => {
    const hits = violations.filter((v) => v.invariant === "P1-vc-implies-rpm");
    if (hits.length > 0) {
      throw new Error(
        `${hits.length} combos with Vc>0 but rpm<=0:\n` +
          hits.slice(0, 8).map((h) => `  ${repro(h.input)} :: ${h.detail}`).join("\n"),
      );
    }
    expect(hits).toEqual([]);
  });

  it("P2: predicted tool life is finite & > 0 for every valid combo", () => {
    const hits = violations.filter((v) => v.invariant === "P2-tool-life-positive");
    if (hits.length > 0) {
      throw new Error(
        `${hits.length} combos with non-positive/undefined tool life:\n` +
          hits.slice(0, 8).map((h) => `  ${repro(h.input)} :: ${h.detail}`).join("\n"),
      );
    }
    expect(hits).toEqual([]);
  });

  it("P4: turning MRR (Vc·ap·f) and vf (f·rpm) are finite & > 0 for every combo", () => {
    const hits = violations.filter(
      (v) => v.invariant === "P4-mrr-positive" || v.invariant === "P4-vf-positive",
    );
    if (hits.length > 0) {
      throw new Error(
        `${hits.length} combos with invalid MRR/vf:\n` +
          hits.slice(0, 8).map((h) => `  ${repro(h.input)} :: ${h.detail}`).join("\n"),
      );
    }
    expect(hits).toEqual([]);
  });

  it("never throws and always resolves a known material to success", () => {
    const hits = violations.filter(
      (v) => v.invariant === "no-throw" || v.invariant === "resolves-to-success",
    );
    if (hits.length > 0) {
      throw new Error(
        `${hits.length} throw/unresolved combos:\n` +
          hits.slice(0, 8).map((h) => `  ${repro(h.input)} :: ${h.detail}`).join("\n"),
      );
    }
    expect(hits).toEqual([]);
  });
});

// ===========================================================================
// (B) Metamorphic invariants — controlled pairwise comparisons.
// ===========================================================================

describe("Lathe Wizard — metamorphic invariants (isolated single-variable pairs)", () => {
  // Generous, non-saturating machine so a spindle clamp never confounds the
  // Vc / force comparisons (large diameter keeps requestedRpm well under the cap).
  const OPEN_MACHINE = { max_rpm: 6000, max_power_kw: 30 };

  it("P5: cutting force is non-decreasing in feed (feed isolated via nose radius, ap fixed)", () => {
    // Larger nose radius raises the recommended feed (radiusFactor) while the
    // depth of cut (ap) is pinned by operation.depth_of_cut_mm — so Fc changes
    // ONLY through feed. Kienzle Fc=kc1.1·ap·f^(1-mc) ⇒ non-decreasing in f.
    const bugs: string[] = [];
    for (const material of ["4140", "304", "6061", "Ti-6Al-4V", "gray_iron"]) {
      const base: LatheSpeedFeedInput = {
        material,
        tool: { type: "turning_insert", nose_radius_mm: 0.4 },
        operation: { type: "roughing", depth_of_cut_mm: 2.0, coolant: "flood" },
        machine: OPEN_MACHINE,
        workpiece: { diameter_mm: 80 },
        strategy: "balanced",
      } as LatheSpeedFeedInput;
      const small = LatheSpeedFeedCalculatorFacadeEngine.calculate(base);
      const large = LatheSpeedFeedCalculatorFacadeEngine.calculate({
        ...base,
        tool: { type: "turning_insert", nose_radius_mm: 1.2 },
      } as LatheSpeedFeedInput);

      // Confirm the pair actually isolates feed: ap identical, feed strictly higher.
      expect(large.recommendation.depth_of_cut_mm).toBeCloseTo(
        small.recommendation.depth_of_cut_mm,
        6,
      );
      expect(large.recommendation.feed_mm_rev).toBeGreaterThan(
        small.recommendation.feed_mm_rev,
      );

      const fSmall = small.predicted_force_N!;
      const fLarge = large.predicted_force_N!;
      // BUG guard: a genuine decrease of force with more feed is a Kienzle sign error.
      if (!(fLarge >= fSmall * (1 - 1e-9))) {
        bugs.push(
          `${material}: force fell as feed rose — f ${small.recommendation.feed_mm_rev}->${large.recommendation.feed_mm_rev}, ` +
            `Fc ${fSmall}->${fLarge} N`,
        );
      }
    }
    if (bugs.length > 0) {
      // BUG: cutting force must never decrease when feed increases (Kienzle ap fixed).
      throw new Error("P5 force-vs-feed monotonicity violated:\n  " + bugs.join("\n  "));
    }
  });

  it("P6: MRR (Vc·ap·f) is non-decreasing conservative → maximum_mrr", () => {
    // Strategy raises feed (0.85→1.25) and depth (0.7→1.6) while leaving Vc
    // untouched ⇒ MRR must be non-decreasing across the aggressiveness ladder.
    const bugs: string[] = [];
    for (const material of ["4140", "6061", "304", "gray_iron", "Ti-6Al-4V", "D2"]) {
      const mk = (strategy: NonNullable<LatheSpeedFeedInput["strategy"]>) => {
        const r = LatheSpeedFeedCalculatorFacadeEngine.calculate({
          material,
          tool: { type: "turning_insert" },
          operation: { type: "roughing", coolant: "flood" },
          machine: OPEN_MACHINE,
          workpiece: { diameter_mm: 80 },
          strategy,
        } as LatheSpeedFeedInput).recommendation;
        return r.cutting_speed_m_min * r.depth_of_cut_mm * r.feed_mm_rev;
      };
      const ladder: Array<NonNullable<LatheSpeedFeedInput["strategy"]>> = [
        "conservative",
        "balanced",
        "aggressive",
        "maximum_mrr",
      ];
      for (let i = 1; i < ladder.length; i++) {
        const lo = mk(ladder[i - 1]);
        const hi = mk(ladder[i]);
        if (!(hi >= lo * (1 - 1e-9))) {
          bugs.push(
            `${material}: MRR fell ${ladder[i - 1]}->${ladder[i]} (${lo.toFixed(1)}->${hi.toFixed(1)} cm³/min)`,
          );
        }
      }
    }
    if (bugs.length > 0) {
      // BUG: MRR must not fall as the strategy grows more aggressive.
      throw new Error("P6 MRR-vs-strategy monotonicity violated:\n  " + bugs.join("\n  "));
    }
  });

  it("P7a: harder material ⇒ recommended Vc not higher (carbide-turned N→P→K→S ladder)", () => {
    // Hardness-monotone, machinability-co-varying ladder (excludes group H — see
    // header physics note). Large diameter + open spindle ⇒ no clamp confound, so
    // the recommendation Vc equals the group base Vc: 400 > 220 > 180 > 35.
    const ladder = [
      { material: "6061", hardness_HB: 95 },   // N
      { material: "4140", hardness_HB: 197 },  // P
      { material: "gray_iron", hardness_HB: 200 }, // K
      { material: "Ti-6Al-4V", hardness_HB: 334 }, // S
    ];
    const vc = (material: string): number =>
      LatheSpeedFeedCalculatorFacadeEngine.calculate({
        material,
        tool: { type: "turning_insert" },
        operation: { type: "roughing", coolant: "flood" },
        machine: OPEN_MACHINE,
        workpiece: { diameter_mm: 150 }, // large ⇒ no rpm saturation for any rung
        strategy: "balanced",
      } as LatheSpeedFeedInput).recommendation.cutting_speed_m_min;

    const speeds = ladder.map((l) => ({ ...l, vc: vc(l.material) }));
    for (let i = 1; i < speeds.length; i++) {
      // BUG: a harder material getting a HIGHER Vc on this carbide ladder is a defect.
      expect(speeds[i].hardness_HB).toBeGreaterThan(speeds[i - 1].hardness_HB);
      expect(speeds[i].vc).toBeLessThanOrEqual(speeds[i - 1].vc + 1e-9);
    }
    // Load-bearing: prove the ladder actually spans a real speed range (not all-equal
    // vacuous). Softest (Al) must be strictly faster than hardest (Ti).
    expect(speeds[0].vc).toBeGreaterThan(speeds[speeds.length - 1].vc);
  });

  it("P7b: documents the LEGITIMATE H-vs-S inversion (harder D2 is turned FASTER than Ti — expected physics, not a bug)", () => {
    // AISI D2 (ISO H, HB≈688) is CBN hard-turned at a HIGHER Vc than Ti-6Al-4V
    // (ISO S, HB≈334) whose low speed comes from poor thermal conductivity +
    // reactivity. This is why P7a is scoped to N/P/K/S: a global hardness→Vc
    // monotonicity does NOT hold and MUST NOT be flagged as a wizard defect.
    const vc = (material: string): number =>
      LatheSpeedFeedCalculatorFacadeEngine.calculate({
        material,
        tool: { type: "turning_insert" },
        operation: { type: "roughing", coolant: "flood" },
        machine: OPEN_MACHINE,
        workpiece: { diameter_mm: 150 },
        strategy: "balanced",
      } as LatheSpeedFeedInput).recommendation.cutting_speed_m_min;

    const d2 = vc("D2");           // ISO H, HB 688
    const ti = vc("Ti-6Al-4V");    // ISO S, HB 334
    // Harder material, yet higher Vc — the engine correctly encodes the
    // CBN-hardened-turning regime. Asserting it keeps the "non-monotonicity" as
    // an intentional, documented outcome rather than a silent surprise.
    expect(d2).toBeGreaterThan(ti);
  });
});
