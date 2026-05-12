/**
 * WEDMTabStrategyEngine — WEDM AGI Phase 2 / U-P2-10
 *
 * Plans slug-retention tabs on every closed internal feature. Produces a
 * per-feature tab count + perimeter-fraction positions + tab width. The
 * downstream EDMWireSlugCornerTaperEngine consumes this plan to emit the
 * G-code sequence; this engine is pure planning.
 *
 * Tab sizing rules (JM Die standard, with literature-backed defaults):
 *   perimeter  < 20 mm  → 1 tab
 *   20–80 mm            → 2 tabs
 *   80–200 mm           → 3 tabs
 *   > 200 mm            → 4 tabs
 *
 * Position rule: tabs are equally spaced around the perimeter, with the
 * first tab offset from the entry point by 1/(2·n) of the perimeter so
 * no tab sits on the pierce location.
 *
 * Tab width: max(min_tab_width_mm, wire_diameter_mm × safety_margin).
 *
 * Exit gate (P2-MS3): Tab strategy retains slugs on 100 % of internal
 * features — every internal feature in every plan has ≥1 tab whose width
 * ≥ the configured minimum.
 */

import type { PartFeature } from "./WEDMHierarchicalPlannerEngine.js";

// ────────────────────────── Types ──────────────────────────

export interface WEDMTabStrategyInput {
  features: PartFeature[];
  wire_diameter_mm?: number;
  min_tab_width_mm?: number;
  safety_margin?: number;
}

export interface TabPlan {
  feature_id: string;
  is_internal: boolean;
  perimeter_mm: number;
  tab_count: number;
  tab_positions_frac: number[];
  tab_width_mm: number;
  rationale: string[];
}

export interface WEDMTabStrategyResult {
  plans: TabPlan[];
  total_tabs: number;
  stats: {
    internal_features: number;
    internal_features_with_tabs: number;
    external_features: number;
  };
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMTabStrategyEngine {
  planTabs(input: WEDMTabStrategyInput): WEDMTabStrategyResult {
    this.validate(input);

    const wireDia = input.wire_diameter_mm ?? 0.25;
    const minWidth = input.min_tab_width_mm ?? 1.0;
    const safety = input.safety_margin ?? 1.2;
    const tabWidth = Math.max(minWidth, wireDia * safety);

    const plans: TabPlan[] = input.features.map((f) =>
      this.planForFeature(f, tabWidth),
    );

    const internalFeatures = plans.filter((p) => p.is_internal);
    return {
      plans,
      total_tabs: plans.reduce((a, p) => a + p.tab_count, 0),
      stats: {
        internal_features: internalFeatures.length,
        internal_features_with_tabs: internalFeatures.filter(
          (p) => p.tab_count > 0,
        ).length,
        external_features: plans.length - internalFeatures.length,
      },
    };
  }

  /** Verify a previously-produced plan — convenience for callers/tests. */
  verify(result: WEDMTabStrategyResult): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    for (const p of result.plans) {
      if (p.is_internal && p.tab_count < 1) {
        violations.push(
          `feature ${p.feature_id} is internal but has no tabs`,
        );
      }
      if (!p.is_internal && p.tab_count > 0) {
        violations.push(
          `feature ${p.feature_id} is external — tabs not meaningful`,
        );
      }
      for (const pos of p.tab_positions_frac) {
        if (pos < 0 || pos >= 1) {
          violations.push(
            `feature ${p.feature_id} tab position ${pos} out of [0, 1)`,
          );
        }
      }
      if (p.tab_count > 0 && p.tab_width_mm <= 0) {
        violations.push(`feature ${p.feature_id} tab width must be > 0`);
      }
    }
    return { valid: violations.length === 0, violations };
  }

  // ─── internals ────────────────────────────────────────────

  private planForFeature(f: PartFeature, tabWidth: number): TabPlan {
    const isInternal =
      f.kind === "internal_profile" ||
      f.kind === "hole" ||
      f.kind === "slot";

    if (!isInternal) {
      return {
        feature_id: f.id,
        is_internal: false,
        perimeter_mm: f.perimeter_mm,
        tab_count: 0,
        tab_positions_frac: [],
        tab_width_mm: 0,
        rationale: ["external feature — no slug retention needed"],
      };
    }

    const count =
      f.tab_count !== undefined
        ? Math.max(1, Math.floor(f.tab_count))
        : this.autoCount(f.perimeter_mm);

    const positions: number[] = [];
    const offset = 1 / (2 * count);
    for (let i = 0; i < count; i++) {
      positions.push(round6(offset + i / count));
    }

    const rationale: string[] = [];
    rationale.push(
      f.tab_count !== undefined
        ? `user-specified tab_count=${f.tab_count}`
        : `perimeter ${f.perimeter_mm.toFixed(1)} mm → ${count} tabs (auto)`,
    );
    rationale.push(
      `tab width ${tabWidth.toFixed(3)} mm (max of min_width + wire×safety)`,
    );
    rationale.push(
      `positions equally spaced, first offset = ${offset.toFixed(3)} to avoid pierce`,
    );

    return {
      feature_id: f.id,
      is_internal: true,
      perimeter_mm: f.perimeter_mm,
      tab_count: count,
      tab_positions_frac: positions,
      tab_width_mm: tabWidth,
      rationale,
    };
  }

  private autoCount(perimeter_mm: number): number {
    if (perimeter_mm < 20) return 1;
    if (perimeter_mm < 80) return 2;
    if (perimeter_mm < 200) return 3;
    return 4;
  }

  private validate(input: WEDMTabStrategyInput): void {
    if (!Array.isArray(input.features)) {
      throw new Error("features required");
    }
    if (input.features.length === 0) {
      throw new Error("at least one feature required");
    }
    if (
      input.wire_diameter_mm !== undefined &&
      (!Number.isFinite(input.wire_diameter_mm) ||
        input.wire_diameter_mm <= 0)
    ) {
      throw new Error("wire_diameter_mm must be > 0");
    }
    if (
      input.min_tab_width_mm !== undefined &&
      (!Number.isFinite(input.min_tab_width_mm) ||
        input.min_tab_width_mm <= 0)
    ) {
      throw new Error("min_tab_width_mm must be > 0");
    }
    if (
      input.safety_margin !== undefined &&
      (!Number.isFinite(input.safety_margin) || input.safety_margin <= 0)
    ) {
      throw new Error("safety_margin must be > 0");
    }
    const ids = new Set<string>();
    for (const f of input.features) {
      if (!f.id) throw new Error("feature requires id");
      if (ids.has(f.id)) throw new Error(`duplicate feature id: ${f.id}`);
      ids.add(f.id);
      if (!Number.isFinite(f.perimeter_mm) || f.perimeter_mm <= 0) {
        throw new Error(
          `feature ${f.id} perimeter_mm must be > 0, got ${f.perimeter_mm}`,
        );
      }
    }
  }
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export const wedmTabStrategyEngine = new WEDMTabStrategyEngine();
