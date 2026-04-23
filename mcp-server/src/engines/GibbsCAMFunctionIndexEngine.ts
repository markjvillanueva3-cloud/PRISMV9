/**
 * GibbsCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM54
 *
 * Catalog: 9 milling + turning + mill-turn operations / 86 parameters / 7 categories.
 *
 * Categories: mill_2_5d, mill_3d, mill_5axis, lathe_turn, lathe_mill_turn,
 *             drilling, wire_edm.
 *
 * Methods:
 *   getIndex(), getSummary(), listOperations(), getOperation(id),
 *   getOperationsByCategory(cat), findParameter(name, limit),
 *   recommendByFeature(intent),
 *   volumillEnvelope(): canonical adaptive bounds (matches ESPRIT ProfitMilling)
 *   mtmChannelSyncPolicy(channel_count, has_sub_spindle): wait_all / wait_any / phase_sync
 *   gibbsTermTranslate(gibbs_term): map GibbsCAM nomenclature to common CAM vocab
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _catalog: any | null = null;

function dataPath(): string {
  const candidates = [
    path.resolve(__dirname, "../../data/cam-functions/gibbscam/milling-turning.json"),
    path.resolve(__dirname, "../data/cam-functions/gibbscam/milling-turning.json"),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error("GibbsCAMFunctionIndexEngine: milling-turning.json not found");
}

function loadCatalog(): any {
  if (_catalog) return _catalog;
  _catalog = JSON.parse(fs.readFileSync(dataPath(), "utf8"));
  return _catalog;
}

export type GibbsCAMIntent =
  | "pocket_2_5d"
  | "profile_2_5d"
  | "volumill_adaptive_rough"
  | "finish_3d_surface"
  | "five_axis_swarf"
  | "lathe_rough"
  | "lathe_thread"
  | "mtm_sync"
  | "drill_canned";

export interface GibbsCAMRecommendation {
  primary: string;
  reason: string;
  alternatives: string[];
}

export class GibbsCAMFunctionIndexEngine {
  static getIndex(): any {
    return loadCatalog();
  }

  static getSummary(): any {
    const c = loadCatalog();
    let totalParams = 0;
    for (const op of Object.values(c.operations) as any) totalParams += op.parameter_count ?? 0;
    return {
      system_id: c.system_id,
      section_key: c.section_key,
      total_operations: Object.keys(c.operations).length,
      total_parameters: totalParams,
      categories: c.categories,
      training_topics_count: (c.training_topics ?? []).length,
    };
  }

  static listOperations(): Array<{ operation_id: string; category: string; parameter_count: number; display_name: string }> {
    const c = loadCatalog();
    return Object.entries(c.operations).map(([id, op]: [string, any]) => ({
      operation_id: id,
      category: op.category,
      parameter_count: op.parameter_count,
      display_name: op.display_name,
    }));
  }

  static getOperation(operation_id: string): any {
    const c = loadCatalog();
    const op = c.operations[operation_id];
    if (!op) return { error: `Unknown operation_id: ${operation_id}` };
    return { operation_id, ...op };
  }

  static getOperationsByCategory(category: string): Array<{ operation_id: string; parameter_count: number; display_name: string }> {
    const target = String(category).toLowerCase();
    const c = loadCatalog();
    const out: Array<{ operation_id: string; parameter_count: number; display_name: string }> = [];
    for (const [id, op] of Object.entries(c.operations) as any) {
      if ((op.category ?? "").toLowerCase() === target) {
        out.push({ operation_id: id, parameter_count: op.parameter_count, display_name: op.display_name });
      }
    }
    return out;
  }

  static findParameter(
    parameter_name: string,
    limit = 50,
  ): Array<{ operation_id: string; group: string; parameter: string }> {
    const needle = String(parameter_name).toLowerCase();
    const c = loadCatalog();
    const out: Array<{ operation_id: string; group: string; parameter: string }> = [];
    for (const [id, op] of Object.entries(c.operations) as any) {
      for (const [grp, params] of Object.entries(op.parameters || {}) as any) {
        for (const pName of Object.keys(params)) {
          if (pName.toLowerCase().includes(needle)) {
            out.push({ operation_id: id, group: grp, parameter: pName });
            if (out.length >= limit) return out;
          }
        }
      }
    }
    return out;
  }

  static recommendByFeature(intent: GibbsCAMIntent | string): GibbsCAMRecommendation {
    const map: Record<string, { primary: string; reason: string; alts: string[] }> = {
      pocket_2_5d: { primary: "mill_pocket", reason: "2.5D pocket (contour / spiral / VoluMill).", alts: ["mill_volumill_rough"] },
      profile_2_5d: { primary: "mill_profile", reason: "2.5D profile contour.", alts: [] },
      volumill_adaptive_rough: { primary: "mill_volumill_rough", reason: "VoluMill 3D adaptive roughing.", alts: [] },
      finish_3d_surface: { primary: "mill_3d_finish", reason: "3D surface finish (Z-level / scallop / pencil).", alts: [] },
      five_axis_swarf: { primary: "mill_5axis_simul", reason: "5-axis simultaneous swarf / contour.", alts: [] },
      lathe_rough: { primary: "lathe_rough", reason: "Lathe OD/ID/face roughing.", alts: [] },
      lathe_thread: { primary: "lathe_thread", reason: "Lathe single-point threading G76.", alts: [] },
      mtm_sync: { primary: "mtm_mill_turn_sync", reason: "Multi-channel mill-turn synchronization.", alts: [] },
      drill_canned: { primary: "drill_canned", reason: "Canned drilling cycle.", alts: [] },
    };
    const hit = map[intent];
    if (hit) return { primary: hit.primary, reason: hit.reason, alternatives: hit.alts };
    return { primary: "mill_pocket", reason: `Unknown intent='${intent}', defaulting to 2.5D pocket.`, alternatives: [] };
  }

  /**
   * volumillEnvelope — VoluMill canonical engagement bounds.
   * Matches ESPRIT ProfitMilling at 10% radial / 2×D axial (both licensed
   * variants of Celeritive's patented adaptive clearing).
   */
  static volumillEnvelope(): {
    max_radial_engagement_pct: number;
    max_axial_doc_to_dia: number;
    smooth_arcs_required: boolean;
    citation: string;
  } {
    return {
      max_radial_engagement_pct: 10,
      max_axial_doc_to_dia: 2,
      smooth_arcs_required: true,
      citation: "GibbsCAM VoluMill (licensed Celeritive) canonical envelope",
    };
  }

  /**
   * mtmChannelSyncPolicy — MTM multi-channel sync recommendation.
   *   channel_count=1              → wait_all (trivial)
   *   ≤2 with sub-spindle          → phase_sync (handoff needs phase match)
   *   2 without sub                → wait_all (barrier for turret coordination)
   *   3                            → wait_all (barrier)
   *   ≥4                           → wait_any (scale-out pattern)
   */
  static mtmChannelSyncPolicy(channel_count: number, has_sub_spindle: boolean): {
    sync_mode: "wait_all" | "wait_any" | "phase_sync";
    rationale: string;
    channel_count: number;
  } {
    if (typeof channel_count !== "number" || !Number.isInteger(channel_count) || channel_count < 1 || channel_count > 4) {
      return { sync_mode: "wait_all", rationale: "Invalid channel_count — defaulting to wait_all.", channel_count: 0 };
    }
    if (channel_count <= 2 && has_sub_spindle) {
      return { sync_mode: "phase_sync", rationale: `${channel_count} ch with sub-spindle → phase_sync for handoff.`, channel_count };
    }
    if (channel_count <= 3) {
      return { sync_mode: "wait_all", rationale: `${channel_count} ch → wait_all barrier.`, channel_count };
    }
    return { sync_mode: "wait_any", rationale: `${channel_count} ch ≥4 → wait_any scale-out.`, channel_count };
  }

  /**
   * gibbsTermTranslate — map GibbsCAM nomenclature to common CAM vocab.
   */
  static gibbsTermTranslate(gibbs_term: string): {
    gibbs_term: string;
    common_term: string;
    definition: string;
  } {
    const lookup: Record<string, { common: string; definition: string }> = {
      process: { common: "operation", definition: "A single machining step (e.g. rough pocket, finish profile)." },
      tile: { common: "workpiece_setup", definition: "GibbsCAM's term for a part setup with fixture + WCS." },
      tms: { common: "tool_management", definition: "Tool Management System — library + tool lifecycle." },
      mdd: { common: "machine_definition", definition: "Machine Definition Document — kinematics + post binding." },
      mtm: { common: "mill_turn_multi_channel", definition: "Mill-Turn Module — multi-turret mill-turn lathes." },
      volumill: { common: "adaptive_clearing", definition: "GibbsCAM's licensed adaptive high-performance clearing (Celeritive)." },
      "cut part rendering": { common: "toolpath_simulation", definition: "GibbsCAM's stock-aware simulation module." },
    };
    const key = String(gibbs_term).toLowerCase();
    const hit = lookup[key];
    if (!hit) {
      return { gibbs_term, common_term: gibbs_term, definition: `No GibbsCAM-specific translation known for '${gibbs_term}'.` };
    }
    return { gibbs_term, common_term: hit.common, definition: hit.definition };
  }
}

export const gibbsCAMFunctionIndexEngine = GibbsCAMFunctionIndexEngine;
