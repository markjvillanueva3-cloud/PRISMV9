/**
 * CAMCatalogPhysicsLinkerEngine — U-CAM-ENRICH-01
 * =================================================
 *
 * Pattern-matches parameter names in captured CAM catalogs to canonical
 * physics formulas (Kienzle, Taylor, deflection, thermal, etc.) and emits
 * a physics_links index per CAM. Produces PhysicsLink[] entries matching
 * the schema in camFunctionIndexSchema.ts.
 *
 * Why pattern-match first vs. LLM enrichment: pattern matching is
 * deterministic, testable, and cheap. It captures the 80% of parameters
 * with canonical names (spindle_speed, feed_rate, doc, woc, Ra, etc.).
 * LLM-assisted enrichment for the remaining long-tail can layer on top in
 * a follow-up without reshaping the output schema.
 *
 * Output lives at data/state/CAM_PHYSICS_LINKS_INDEX.json (not rewriting
 * the captured catalogs in place — preserves provenance; Phase-5 engines
 * read this separate index at runtime).
 *
 * Gates PHASE-0.6 enrichment (combined with U-CAM-ENRICH-02 tribal_tips +
 * U-CAM-ENRICH-03 ai_actions + U-CAM-ENRICH-04 validator). After this
 * ships plus the other three, Phase-5 real-impl can begin.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-0.6 U-CAM-ENRICH-01.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { CAM_SYSTEM_REGISTRY } from "../registries/CAMSystemRegistry.js";

// ─── Types ──────────────────────────────────────────────────────────

export type PhysicsRole = "input" | "output" | "coefficient" | "constraint";

export interface PhysicsLink {
  formula_id: string;
  role: PhysicsRole;
  affects?: string[];
}

export interface ParamMatch {
  cam_slug: string;
  source_file: string;
  param_path: string;
  param_name: string;
  physics_links: PhysicsLink[];
  matched_formulas: string[];
}

export interface CAMPhysicsLinksIndex {
  schemaVersion: 1;
  generated_at: string;
  cams: Record<string, {
    source_files: string[];
    total_params_scanned: number;
    matched_params: number;
    coverage_pct: number;
    matches: ParamMatch[];
  }>;
  global_summary: {
    total_cams: number;
    total_matches: number;
    formula_usage: Record<string, number>;
  };
}

interface FormulaPattern {
  formula_id: string;
  role: PhysicsRole;
  affects: string[];
  /** Regex matched against lower-cased parameter name */
  patterns: RegExp[];
}

// ─── Canonical formula-to-parameter patterns ────────────────────────

// Keep these conservative — require a whole-word match or explicit suffix
// to avoid false positives like matching "force" inside "enforcement".
const FORMULA_PATTERNS: FormulaPattern[] = [
  {
    formula_id: "kienzle_cutting_force",
    role: "output",
    affects: ["spindle_speed", "feed_rate", "doc", "woc"],
    patterns: [
      /\bcutting[_\s-]?force\b/,
      /\b(?:fc|f_c)\b/,
      /\bforce[_\s-]?n\b/,
      /\bnormal[_\s-]?force\b/,
      /\btangential[_\s-]?force\b/,
    ],
  },
  {
    formula_id: "taylor_tool_life",
    role: "output",
    affects: ["cutting_speed", "feed_rate"],
    patterns: [
      /\btool[_\s-]?life\b/,
      /\blife[_\s-]?min\b/,
      /\bwear[_\s-]?rate\b/,
      /\bflank[_\s-]?wear\b/,
      /\bvb\b/,
    ],
  },
  {
    formula_id: "tool_deflection",
    role: "output",
    affects: ["force", "stickout", "diameter"],
    patterns: [
      /\bdeflection\b/,
      /\bbend(?:ing)?\b/,
      /\btool[_\s-]?deflect/,
    ],
  },
  {
    formula_id: "jaeger_temperature",
    role: "output",
    affects: ["cutting_speed", "feed_rate"],
    patterns: [
      /\btemperature\b/,
      /\btemp[_\s-]?c\b/,
      /\bthermal\b/,
      /\bheat[_\s-]?flux\b/,
    ],
  },
  {
    formula_id: "material_removal_rate",
    role: "output",
    affects: ["spindle_speed", "feed_rate", "doc", "woc"],
    patterns: [
      /\bmrr\b/,
      /\bmaterial[_\s-]?removal/,
      /\b(?:mm3|cm3|in3)[_\s-]?(?:min|sec)?\b/,
    ],
  },
  {
    formula_id: "surface_finish_ra",
    role: "output",
    affects: ["feed_rate", "corner_radius", "cutting_speed"],
    patterns: [
      /\bra\b/,
      /\brz\b/,
      /\bsurface[_\s-]?finish\b/,
      /\broughness\b/,
      /\bscallop\b/,
    ],
  },
  {
    formula_id: "spindle_power",
    role: "output",
    affects: ["cutting_force", "spindle_speed"],
    patterns: [
      /\bpower\b/,
      /\bk[_\s-]?w\b/,
      /\b(?:kilo)?watts?\b/,
      /\bhorse[_\s-]?power\b/,
      /\bhp\b/,
      /\btorque\b/,
    ],
  },
  {
    formula_id: "chip_load_per_tooth",
    role: "input",
    affects: ["feed_rate", "spindle_speed", "flute_count"],
    patterns: [
      /\bchip[_\s-]?load\b/,
      /\b(?:fz|f_z)\b/,
      /\bfeed[_\s-]?per[_\s-]?tooth\b/,
      /\bmm[_\s-]?per[_\s-]?tooth\b/,
    ],
  },
  {
    formula_id: "cutting_speed_vc",
    role: "input",
    affects: ["spindle_speed", "tool_diameter"],
    patterns: [
      /\b(?:vc|v_c)\b/,
      /\bcutting[_\s-]?speed\b/,
      /\bsurface[_\s-]?speed\b/,
      /\b(?:sfm|smm|m[_\s-]?per[_\s-]?min)\b/,
    ],
  },
  {
    formula_id: "feed_rate",
    role: "input",
    affects: ["chip_load", "spindle_speed"],
    patterns: [
      /\bfeed[_\s-]?rate\b/,
      /\bf[_\s-]?code\b/,
      /\bmm[_\s-]?per[_\s-]?min\b/,
      /\b(?:ipm|ipr)\b/,
      /\bplunge[_\s-]?feed\b/,
      /\bramp[_\s-]?feed\b/,
    ],
  },
  {
    formula_id: "depth_of_cut_ap",
    role: "input",
    affects: ["cutting_force", "material_removal_rate"],
    patterns: [
      /\b(?:ap|a_p)\b/,
      /\b(?:doc|d_o_c)\b/,
      /\bdepth[_\s-]?of[_\s-]?cut\b/,
      /\bstep[_\s-]?down\b/,
      /\baxial[_\s-]?depth\b/,
    ],
  },
  {
    formula_id: "width_of_cut_ae",
    role: "input",
    affects: ["cutting_force", "material_removal_rate", "chip_thinning"],
    patterns: [
      /\b(?:ae|a_e)\b/,
      /\b(?:woc|w_o_c)\b/,
      /\bwidth[_\s-]?of[_\s-]?cut\b/,
      /\bstep[_\s-]?over\b/,
      /\bradial[_\s-]?engagement\b/,
    ],
  },
  {
    formula_id: "spindle_rpm",
    role: "input",
    affects: ["cutting_speed", "tool_diameter"],
    patterns: [
      /\bspindle[_\s-]?speed\b/,
      /\bspindle[_\s-]?rpm\b/,
      /\b(?:rpm|r_p_m)\b/,
      /\bs[_\s-]?code\b/,
    ],
  },
  {
    formula_id: "chatter_stability_lobe",
    role: "constraint",
    affects: ["spindle_speed", "doc"],
    patterns: [
      /\bchatter\b/,
      /\bstability[_\s-]?lobe\b/,
      /\bregenerative\b/,
    ],
  },
];

// ─── Engine ─────────────────────────────────────────────────────────

export class CAMCatalogPhysicsLinkerEngine {
  readonly name = "CAMCatalogPhysicsLinkerEngine";

  /** Walk all registered CAM catalogs + emit a physics-links index. */
  linkAll(
    dataRoot: string = path.resolve("data"),
    outPath: string = path.resolve("data/state/CAM_PHYSICS_LINKS_INDEX.json")
  ): CAMPhysicsLinksIndex {
    const cams: CAMPhysicsLinksIndex["cams"] = {};
    const formulaUsage: Record<string, number> = {};
    let totalMatches = 0;

    for (const slug of Object.keys(CAM_SYSTEM_REGISTRY)) {
      const meta = CAM_SYSTEM_REGISTRY[slug];
      const functionsDir = path.join(dataRoot, "cam-functions", meta.functions_dir);
      const uiDir = path.join(dataRoot, "cam-ui", meta.ui_dir);
      const files = [
        ...this.listJsonFiles(functionsDir),
        ...this.listJsonFiles(uiDir),
      ];

      const matches: ParamMatch[] = [];
      let paramsScanned = 0;
      for (const file of files) {
        try {
          const json = JSON.parse(fs.readFileSync(file, "utf-8"));
          const { scanned, found } = this.linkJson(slug, file, json);
          paramsScanned += scanned;
          matches.push(...found);
        } catch {
          // skip unreadable/malformed files
        }
      }

      for (const m of matches) {
        for (const fid of m.matched_formulas) {
          formulaUsage[fid] = (formulaUsage[fid] ?? 0) + 1;
        }
      }

      cams[slug] = {
        source_files: files.map((f) => path.relative(dataRoot, f).replace(/\\/g, "/")),
        total_params_scanned: paramsScanned,
        matched_params: matches.length,
        coverage_pct: paramsScanned > 0 ? Math.round((matches.length / paramsScanned) * 10000) / 100 : 0,
        matches,
      };
      totalMatches += matches.length;
    }

    const index: CAMPhysicsLinksIndex = {
      schemaVersion: 1,
      generated_at: new Date().toISOString(),
      cams,
      global_summary: {
        total_cams: Object.keys(cams).length,
        total_matches: totalMatches,
        formula_usage: formulaUsage,
      },
    };

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
    return index;
  }

  /** Match a single parameter name to physics links. Public for tests. */
  matchParameter(paramName: string): {
    links: PhysicsLink[];
    matched_formulas: string[];
  } {
    // Normalize for matching: lowercase + wrap with spaces so token-boundary
    // patterns like `\s+scallop\s+` work. Also replace [_-] with space so
    // `scallop_height` tokenizes cleanly (JavaScript \b treats _ as a word
    // char, which would defeat whole-word matching on snake_case).
    const normalized = " " + paramName.toLowerCase().replace(/[_\-]+/g, " ") + " ";
    const links: PhysicsLink[] = [];
    const seen = new Set<string>();
    for (const fp of FORMULA_PATTERNS) {
      for (const pat of fp.patterns) {
        if (pat.test(normalized)) {
          if (!seen.has(fp.formula_id)) {
            seen.add(fp.formula_id);
            links.push({
              formula_id: fp.formula_id,
              role: fp.role,
              affects: [...fp.affects],
            });
          }
          break;
        }
      }
    }
    return { links, matched_formulas: [...seen] };
  }

  // ─── Private ──────────────────────────────────────────────────────

  private listJsonFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(".json"))
      .map((f) => path.join(dir, f));
  }

  /** Recursively walk a JSON object looking for parameter-shaped entries. */
  private linkJson(
    slug: string,
    sourceFile: string,
    root: unknown
  ): { scanned: number; found: ParamMatch[] } {
    const found: ParamMatch[] = [];
    let scanned = 0;
    const walk = (node: unknown, pathTrace: string[]): void => {
      if (node == null || typeof node !== "object") return;
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) walk(node[i], [...pathTrace, `[${i}]`]);
        return;
      }
      const rec = node as Record<string, unknown>;
      const name = typeof rec.name === "string" ? rec.name : undefined;
      const id = typeof rec.id === "string" ? rec.id : undefined;
      const hasParamShape = !!(name || id) && this.looksLikeParam(rec);
      if (hasParamShape) {
        scanned += 1;
        const paramName = name ?? id ?? "";
        const { links, matched_formulas } = this.matchParameter(paramName);
        if (links.length > 0) {
          found.push({
            cam_slug: slug,
            source_file: path.basename(sourceFile),
            param_path: pathTrace.join("/"),
            param_name: paramName,
            physics_links: links,
            matched_formulas,
          });
        }
      }
      for (const [k, v] of Object.entries(rec)) {
        walk(v, [...pathTrace, k]);
      }
    };
    walk(root, []);
    return { scanned, found };
  }

  /** Heuristic: object looks like a parameter if it has value/type/unit/default. */
  private looksLikeParam(rec: Record<string, unknown>): boolean {
    return (
      "type" in rec ||
      "value" in rec ||
      "default" in rec ||
      "unit" in rec ||
      "units" in rec ||
      "default_value" in rec ||
      "min" in rec ||
      "max" in rec
    );
  }
}

export const camCatalogPhysicsLinkerEngine = new CAMCatalogPhysicsLinkerEngine();
