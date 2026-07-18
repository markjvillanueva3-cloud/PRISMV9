/**
 * LatheToolpathTemplateEngine — CLOSED-LOOP-MS0/U-CL2
 *
 * Generates a parameterized TOOLPATH TEMPLATE for every lathe toolpath type:
 * the Okuma-OSP G-code canned cycle + a VARIABLE PARAMETER schema (vc / fn / ap with
 * min·default·max bands) + per-(ISO, material) CUTTING CONDITIONS + the physics/safety
 * gates that apply. Primary focus: JM fleet (100% Okuma OSP, LTH-01..07).
 *
 * EXTENDS (R8 — do not duplicate): `TurningStrategyCatalog` (the 40+ categorized strategies)
 * supplies the strategy taxonomy; this engine adds the cycle + parameter + cutting-condition
 * layer the catalog lacks. Cutting-condition CENTERS are imported from physics/constants.ts
 * (CANONICAL_TURNING_SPEEDS / _FEEDS / CANONICAL_KIENZLE) — NEVER inlined (whiskey soul). The
 * ±band multipliers are documented PROCESS heuristics (practical speed/feed windows), not
 * physics constants, so they live here (mirrors the L/D heuristics in lathe-gcode-lint).
 *
 * Refs: Okuma OSP canned cycles (G71 long-rough, G72 face-rough, G73 pattern, G70 finish,
 * G74 peck-drill/groove, G75 groove/part-off peck, G76 multi-pass thread). Sandvik/Kennametal
 * turning data underlies CANONICAL_TURNING_SPEEDS/_FEEDS. Safety gates mirror the 8 validated
 * lathe gotchas (engines/lathe/CLAUDE.md §5).
 */
import { z } from "zod";
import {
  CANONICAL_TURNING_SPEEDS,
  CANONICAL_TURNING_FEEDS,
  CANONICAL_KIENZLE,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
} from "../physics/constants.js";
import { TURNING_STRATEGY_CATALOG, type TurningStrategyEntry } from "./TurningStrategyCatalog.js";

export type TurningCategory = TurningStrategyEntry["category"];

/** A variable parameter with a practical min·default·max band + unit. */
export interface ParamBand {
  param: string;
  unit: string;
  min: number;
  default: number;
  max: number;
  source: string; // where `default` came from (canonical constant) — provenance, never inlined
}

export interface ToolpathTemplate {
  strategyId: string;
  name: string;
  category: TurningCategory;
  operationTags: string[];
  isoGroup: ISOGroup;
  material?: string;
  machine: string;          // JM fleet default: Okuma OSP
  cannedCycle: string;      // primary Okuma-OSP cycle (e.g. "G71")
  cssMode: "G96" | "G97";   // constant surface speed vs constant RPM (threading)
  params: ParamBand[];      // variable parameters with cutting-condition bands
  safetyGates: string[];    // applicable lathe-gcode-lint gotcha rule ids
  notes: string;
}

// Documented PROCESS bands (fraction of the canonical center) — practical windows, NOT physics.
const VC_BAND = 0.25;   // ±25% cutting-speed window
const FN_BAND = 0.20;   // ±20% feed window
// Depth-of-cut windows [mm] by intent (rough/finish) — geometry/process heuristics.
const AP_ROUGH = { min: 1.0, default: 2.5, max: 4.0 };
const AP_FINISH = { min: 0.15, default: 0.3, max: 0.6 };

/** Per-category recipe: cycle, CSS mode, depth intent, and the gotcha gates that apply. */
const CATEGORY_RECIPE: Record<TurningCategory, {
  cycle: string; css: "G96" | "G97"; depth: "rough" | "finish" | "tool_width"; gates: string[]; note: string;
}> = {
  rough:     { cycle: "G71", css: "G96", depth: "rough",  gates: ["css-no-rpm-cap", "feed-mode-undeclared"], note: "Longitudinal stock removal; pair G96 with a G50 S<max> cap." },
  finish:    { cycle: "G70", css: "G96", depth: "finish", gates: ["css-no-rpm-cap", "nose-radius-ra", "feed-mode-undeclared"], note: "Final profile; finish feed set by nose-radius Ra target." },
  groove:    { cycle: "G75", css: "G96", depth: "tool_width", gates: ["css-no-rpm-cap", "partoff-no-peck", "feed-mode-undeclared"], note: "Radial/part-off; peck (G75 Q) when depth > 3x tool width." },
  thread:    { cycle: "G76", css: "G97", depth: "finish", gates: ["thread-g76", "feed-mode-undeclared"], note: "Multi-pass single-point; G97 constant RPM, position-locked entry." },
  bore:      { cycle: "G71", css: "G96", depth: "rough",  gates: ["css-no-rpm-cap", "boring-bar-ld", "feed-mode-undeclared"], note: "Internal turning; enforce boring-bar L/D <= 4 steel / 6 carbide." },
  drill:     { cycle: "G74", css: "G97", depth: "finish", gates: ["feed-mode-undeclared"], note: "Axial drilling on center; G97 constant RPM, peck (G74) for deep holes." },
  contour:   { cycle: "G73", css: "G96", depth: "rough",  gates: ["css-no-rpm-cap", "feed-mode-undeclared"], note: "Pattern/profile repeat for near-net or cast contours." },
  specialty: { cycle: "G71", css: "G96", depth: "rough",  gates: ["css-no-rpm-cap", "feed-mode-undeclared"], note: "Hard-turn / interrupted / polygon — verify machine capability." },
};

const BuildInput = z.object({
  strategyId: z.string().optional(),
  category: z.enum(["rough", "finish", "groove", "thread", "bore", "drill", "contour", "specialty"]).optional(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).default("P"),
  material: z.string().optional(),     // CANONICAL_MATERIAL_DB key, e.g. "4140"
  machine: z.string().default("okuma-osp"),
}).refine((v) => v.strategyId || v.category, { message: "strategyId or category required" });

export type BuildInputType = z.infer<typeof BuildInput>;

export class LatheToolpathTemplateEngine {
  /** Build the variable cutting-condition parameter bands for an op intent + ISO group. */
  static buildParams(iso: ISOGroup, depth: "rough" | "finish" | "tool_width"): ParamBand[] {
    const speeds = CANONICAL_TURNING_SPEEDS[iso];
    const feeds = CANONICAL_TURNING_FEEDS[iso];
    const isFinish = depth === "finish";
    const vcCenter = isFinish ? speeds.finish : speeds.rough;
    const fnCenter = isFinish ? feeds.finish : feeds.rough;
    const params: ParamBand[] = [
      { param: "vc", unit: "m/min", min: round2(vcCenter * (1 - VC_BAND)), default: vcCenter, max: round2(vcCenter * (1 + VC_BAND)),
        source: `CANONICAL_TURNING_SPEEDS.${iso}.${isFinish ? "finish" : "rough"}` },
      { param: "fn", unit: "mm/rev", min: round2(fnCenter * (1 - FN_BAND)), default: fnCenter, max: round2(fnCenter * (1 + FN_BAND)),
        source: `CANONICAL_TURNING_FEEDS.${iso}.${isFinish ? "finish" : "rough"}` },
    ];
    if (depth === "rough" || depth === "finish") {
      const ap = isFinish ? AP_FINISH : AP_ROUGH;
      params.push({ param: "ap", unit: "mm", min: ap.min, default: ap.default, max: ap.max, source: `AP_${isFinish ? "FINISH" : "ROUGH"} process band` });
    }
    return params;
  }

  /** Build a single toolpath template (strategy + recipe + cutting conditions + gates). */
  static buildTemplate(input: BuildInputType): ToolpathTemplate {
    const v = BuildInput.parse(input);
    const iso = v.iso_group as ISOGroup;
    if (v.material && !CANONICAL_MATERIAL_DB[v.material]) {
      throw new Error(`Unknown material "${v.material}" — not a CANONICAL_MATERIAL_DB key`);
    }
    let strat: TurningStrategyEntry | undefined;
    if (v.strategyId) {
      strat = TURNING_STRATEGY_CATALOG.find((s) => s.id === v.strategyId);
      if (!strat) throw new Error(`Unknown strategyId "${v.strategyId}"`);
    } else {
      strat = TURNING_STRATEGY_CATALOG.find((s) => s.category === v.category);
      if (!strat) throw new Error(`No strategy for category "${v.category}"`);
    }
    const recipe = CATEGORY_RECIPE[strat.category];
    const kc = CANONICAL_KIENZLE[iso];
    return {
      strategyId: strat.id,
      name: strat.name,
      category: strat.category,
      operationTags: [...strat.operation_tags],
      isoGroup: iso,
      material: v.material,
      machine: v.machine,
      cannedCycle: recipe.cycle,
      cssMode: recipe.css,
      params: LatheToolpathTemplateEngine.buildParams(iso, recipe.depth),
      safetyGates: [...recipe.gates],
      notes: `${recipe.note} kc1.1=${kc.kc1_1} MPa, mc=${kc.mc} (ISO-${iso}, force est via Kienzle).`,
    };
  }

  /** Build a template for EVERY catalog strategy at a given ISO/material — the full template library. */
  static buildAllTemplates(opts: { iso_group?: ISOGroup; material?: string; machine?: string } = {}): ToolpathTemplate[] {
    return TURNING_STRATEGY_CATALOG.map((s) =>
      LatheToolpathTemplateEngine.buildTemplate({
        strategyId: s.id,
        iso_group: opts.iso_group ?? "P",
        material: opts.material,
        machine: opts.machine ?? "okuma-osp",
      }),
    );
  }

  /** All distinct toolpath categories covered. */
  static listCategories(): TurningCategory[] {
    return [...new Set(TURNING_STRATEGY_CATALOG.map((s) => s.category))];
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const latheToolpathTemplateEngine = LatheToolpathTemplateEngine;
