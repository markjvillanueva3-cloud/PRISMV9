/**
 * ScalableCAMOrchestratorEngine — CK-MS1/U03
 * Full pipeline for complex parts with 200+ features.
 *
 * Pipeline:
 *   1. FeatureClustering → group into setup-oriented clusters
 *   2. Per-cluster: SmartToolSelection → tool from 46K catalog
 *   3. Per-cluster: AdaptiveToolpathRouting → best algorithm per feature
 *   4. CumulativeStockChain → IPW tracking between all operations
 *   5. IntegratedVerification → collision+physics+safety
 *   6. ProductionPackage → G-code + setup sheet + tools + physics + tips
 *
 * Wires 11 previously-unwired engines into the unified flow.
 */

import { FeatureClusteringEngine, ClusterableFeature } from "./FeatureClusteringEngine.js";
import { CumulativeStockChainEngine, StockOperation } from "./CumulativeStockChainEngine.js";
import { SmartToolSelectorEngine } from "./SmartToolSelectorEngine.js";
import { AdaptiveToolpathRouterEngine } from "./AdaptiveToolpathRouterEngine.js";
import { IntegratedVerificationEngine } from "./IntegratedVerificationEngine.js";
import { ProductionPackageEngine } from "./ProductionPackageEngine.js";
import { IntelligentSequencingEngine } from "./IntelligentSequencingEngine.js";

const _clustering = new FeatureClusteringEngine();
const _stockChain = new CumulativeStockChainEngine();
const _toolSelector = new SmartToolSelectorEngine();
const _router = new AdaptiveToolpathRouterEngine();
const _verifier = new IntegratedVerificationEngine();
const _packager = new ProductionPackageEngine();
const _sequencer = new IntelligentSequencingEngine();

// ── Interfaces ────────────────────────────────────────────────
export interface ComplexPartFeature {
  id: string;
  type: string;
  operation: "roughing" | "finishing" | "drilling" | "rest" | "facing";
  position: { x: number; y: number; z: number };
  access_direction?: { x: number; y: number; z: number };
  dimensions?: {
    length_mm?: number; width_mm?: number;
    depth_mm?: number; diameter_mm?: number;
  };
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  wall_thickness_mm?: number;
  corner_radius_mm?: number;
  priority?: number;
  requires_feature_ids?: string[];
}

export interface ComplexPartRequest {
  features: ComplexPartFeature[];
  material: string;
  material_iso_group?: string;
  material_hardness_hrc?: number;
  machine_name: string;
  controller?: string;
  stock_dims: { length_mm: number; width_mm: number; height_mm: number };
  options?: {
    optimize_for?: "tool_life" | "speed" | "cost" | "surface_finish" | "balanced";
    program_number?: number;
    programmer_name?: string;
    machine_rate_per_hour?: number;
    max_tools_per_setup?: number;
  };
}

export interface SetupProgram {
  setup_id: number;
  orientation: string;
  feature_count: number;
  gcode: string;
  gcode_lines: number;
  tools_used: Array<{
    tool_id: string;
    manufacturer: string;
    diameter_mm: number;
    type: string;
  }>;
  operations: Array<{
    sequence: number;
    feature_id: string;
    algorithm: string;
    segments: number;
  }>;
  cycle_time_min: number;
  verification_verdict: string;
}

export interface ComplexPartResult {
  success: boolean;
  setups: SetupProgram[];
  total_setups: number;
  combined_gcode: string;
  total_gcode_lines: number;
  tool_list: any[];
  physics_report: {
    per_setup: Array<{
      setup_id: number;
      max_force_N: number;
      max_power_kW: number;
      max_deflection_mm: number;
      cpk_estimate: number;
    }>;
  };
  stock_chain: {
    initial_volume_mm3: number;
    final_volume_mm3: number;
    removed_pct: number;
    air_cut_operations: string[];
  };
  cycle_time: {
    per_setup_min: number[];
    total_min: number;
    setup_change_min: number;
    grand_total_min: number;
  };
  tribal_tips: any[];
  warnings: string[];
  pipeline_summary: {
    total_features: number;
    total_setups: number;
    total_operations: number;
    total_segments: number;
    total_tools: number;
    algorithms_used: string[];
    pipeline_time_ms: number;
  };
}

// ── ISO detection ─────────────────────────────────────────────
function detectISO(mat: string): string {
  const m = mat.toLowerCase();
  if (/aluminum|al |6061|7075/i.test(m)) return "N";
  if (/inconel|titanium|ti-|waspaloy/i.test(m)) return "S";
  if (/stainless|304|316/i.test(m)) return "M";
  if (/cast.?iron|ductile|grey/i.test(m)) return "K";
  if (/hardened|hrc|d2|h13/i.test(m)) return "H";
  return "P";
}

// ── Engine ─────────────────────────────────────────────────────
export class ScalableCAMOrchestratorEngine {
  /**
   * Process a complex part with 200+ features through the full pipeline.
   */
  process(req: ComplexPartRequest): ComplexPartResult {
    const t0 = Date.now();
    const iso = req.material_iso_group || detectISO(req.material);
    const allWarnings: string[] = [];
    const allAlgorithms: string[] = [];
    const allTools: any[] = [];
    let totalSegments = 0;
    let totalOps = 0;

    // ── 1. Cluster features into setups ───────────────────────
    const clusterInput: ClusterableFeature[] = req.features.map((f) => ({
      ...f,
      access_direction: f.access_direction || { x: 0, y: 0, z: 1 },
    }));
    const clustering = _clustering.cluster(clusterInput);

    // ── 2. Process each setup/cluster ─────────────────────────
    const setups: SetupProgram[] = [];
    const stockOps: StockOperation[] = [];
    const perSetupPhysics: ComplexPartResult["physics_report"]["per_setup"] = [];

    for (const cluster of clustering.clusters) {
      // ── Intelligent sequencing within cluster ───────────────
      const seqResult = _sequencer.sequence(
        cluster.features.map((f: any) => ({
          id: f.id, type: f.type, operation: f.operation,
          tool_diameter_mm: f.dimensions?.diameter_mm,
          depth_mm: f.dimensions?.depth_mm,
          position: f.position,
          is_datum: f.operation === "facing",
          requires_ops: f.requires_feature_ids,
        }))
      );
      // Replace cluster features with sequenced order
      const sequencedIds = seqResult.operations.map((o: any) => o.id);
      const featureMap = new Map(cluster.features.map((f: any) => [f.id, f]));
      const sequencedFeatures = sequencedIds
        .map((id: string) => featureMap.get(id))
        .filter(Boolean);
      // Use sequenced features if available, otherwise original
      const orderedFeatures = sequencedFeatures.length > 0
        ? sequencedFeatures : cluster.features;

      const setupId = cluster.cluster_id;
      let setupGcode = "";
      const setupTools: SetupProgram["tools_used"] = [];
      const setupOperations: SetupProgram["operations"] = [];
      let setupMaxForce = 0, setupMaxPower = 0, setupMaxDefl = 0;
      let setupCpk = 2.0;
      let setupSegments: any[] = [];

      for (const feature of orderedFeatures) {
        totalOps++;

        // 2a. Smart tool selection
        const toolResult = _toolSelector.select({
          operation_type: feature.type,
          material_iso_group: iso,
          material_name: req.material,
          material_hardness_hrc: req.material_hardness_hrc,
          machine_name: req.machine_name,
          feature_diameter_mm: feature.dimensions?.diameter_mm,
          feature_depth_mm: feature.dimensions?.depth_mm,
          feature_width_mm: feature.dimensions?.width_mm,
          tolerance_mm: feature.tolerance_mm,
          surface_finish_Ra: feature.surface_finish_Ra,
          wall_thickness_mm: feature.wall_thickness_mm,
          corner_radius_mm: feature.corner_radius_mm,
          optimize_for: req.options?.optimize_for || "balanced",
        });

        const bt = toolResult.best_tool;
        if (!setupTools.some((t) => t.tool_id === bt.tool_id)) {
          setupTools.push({
            tool_id: bt.tool_id,
            manufacturer: bt.manufacturer,
            diameter_mm: bt.diameter_mm,
            type: bt.type,
          });
          allTools.push(bt);
        }
        if (bt.warnings?.length) allWarnings.push(...bt.warnings);

        // 2b. Adaptive toolpath routing
        const routeResult = _router.route({
          feature_type: feature.type,
          operation: feature.operation,
          material_iso_group: iso,
          material_hardness_hrc: req.material_hardness_hrc,
          feature_depth_mm: feature.dimensions?.depth_mm,
          feature_diameter_mm: feature.dimensions?.diameter_mm,
          feature_width_mm: feature.dimensions?.width_mm,
          wall_thickness_mm: feature.wall_thickness_mm,
          tolerance_mm: feature.tolerance_mm,
          tool_diameter_mm: bt.diameter_mm,
          tool_length_mm: bt.flute_length_mm * 2 || 60,
          tool_flute_count: bt.flute_count,
          pocket_dims: feature.dimensions?.length_mm ? {
            length_mm: feature.dimensions.length_mm,
            width_mm: feature.dimensions.width_mm || feature.dimensions.length_mm,
            depth_mm: feature.dimensions.depth_mm || 10,
          } : undefined,
          rpm: bt.recommended_params?.rpm,
          feed_mmpt: bt.recommended_params?.feed_mmpt,
        });

        allAlgorithms.push(routeResult.selected_algorithm);
        setupSegments.push(...routeResult.toolpath_segments);
        totalSegments += routeResult.toolpath_segments.length;
        if (routeResult.warnings?.length) allWarnings.push(...routeResult.warnings);

        setupOperations.push({
          sequence: setupOperations.length + 1,
          feature_id: feature.id,
          algorithm: routeResult.selected_algorithm,
          segments: routeResult.toolpath_segments.length,
        });

        // Track physics
        if (bt.physics) {
          setupMaxForce = Math.max(setupMaxForce, bt.physics.cutting_force_N || 0);
          setupMaxPower = Math.max(setupMaxPower, bt.physics.cutting_power_kW || 0);
          setupMaxDefl = Math.max(setupMaxDefl, bt.physics.deflection_mm || 0);
          setupCpk = Math.min(setupCpk, (bt.physics as any).cpk_estimate || 2.0);
        }

        // Build stock operation for chain
        const depth = feature.dimensions?.depth_mm || 10;
        const width = feature.dimensions?.width_mm || feature.dimensions?.diameter_mm || 20;
        const length = feature.dimensions?.length_mm || width;
        stockOps.push({
          operation_id: feature.id,
          type: feature.type,
          tool_diameter_mm: bt.diameter_mm,
          cutting_region: {
            min_x: feature.position.x,
            max_x: feature.position.x + length,
            min_y: feature.position.y,
            max_y: feature.position.y + width,
            min_z: -depth,
            max_z: 0,
          },
          depth_mm: depth,
          engagement_ae_mm: bt.recommended_params?.ae_mm || bt.diameter_mm * 0.3,
          engagement_ap_mm: bt.recommended_params?.ap_mm || depth,
        });
      }

      // 2c. Verify this setup
      const verification = setupSegments.length > 0 ? _verifier.verify({
        toolpath_segments: setupSegments,
        tool: {
          diameter_mm: setupTools[0]?.diameter_mm || 10,
          flute_length_mm: 30,
          overall_length_mm: 60,
          flute_count: 3,
        },
        material_iso_group: iso,
        stock_dims: req.stock_dims,
      }) : { verdict: "PASS" as const, issues: [] };

      // 2d. Generate G-code for this setup
      const gcodeLines = this._setupToGcode(
        setupId, setupSegments, setupTools,
        req.options?.program_number ? req.options.program_number + setupId : 1000 + setupId,
        req.controller || "FANUC",
      );
      setupGcode = gcodeLines;

      // Estimate cycle time
      let feedDist = 0;
      for (let i = 1; i < setupSegments.length; i++) {
        if (setupSegments[i].type === "feed" || setupSegments[i].type === "plunge") {
          const dx = setupSegments[i].x - setupSegments[i - 1].x;
          const dy = setupSegments[i].y - setupSegments[i - 1].y;
          const dz = setupSegments[i].z - setupSegments[i - 1].z;
          feedDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
      }
      const avgFeed = 2000;
      const cycleTime = (feedDist / avgFeed) + (setupTools.length * 0.15); // tool changes

      setups.push({
        setup_id: setupId,
        orientation: cluster.orientation_label,
        feature_count: cluster.feature_count,
        gcode: setupGcode,
        gcode_lines: setupGcode.split("\n").length,
        tools_used: setupTools,
        operations: setupOperations,
        cycle_time_min: Math.round(cycleTime * 100) / 100,
        verification_verdict: typeof verification.verdict === "string"
          ? verification.verdict : "PASS",
      });

      perSetupPhysics.push({
        setup_id: setupId,
        max_force_N: Math.round(setupMaxForce),
        max_power_kW: Math.round(setupMaxPower * 100) / 100,
        max_deflection_mm: Math.round(setupMaxDefl * 10000) / 10000,
        cpk_estimate: Math.round(setupCpk * 100) / 100,
      });
    }

    // ── 3. Cumulative stock chain ─────────────────────────────
    const stockResult = _stockChain.chain(req.stock_dims, stockOps);

    // ── 4. Combine G-code from all setups ─────────────────────
    const combinedGcode = setups.map((s) => s.gcode).join("\n\n");

    // ── 5. Get tribal tips ────────────────────────────────────
    let tips: any[] = [];
    try {
      const pkg = _packager.assemble({
        gcode: combinedGcode,
        toolpath_segments: [],
        tool: {
          diameter_mm: allTools[0]?.diameter_mm || 10,
          flute_length_mm: 30, overall_length_mm: 60, flute_count: 3,
        },
        physics: perSetupPhysics[0] ? {
          max_force_N: perSetupPhysics[0].max_force_N,
          max_power_kW: perSetupPhysics[0].max_power_kW,
          max_torque_Nm: 0, max_deflection_mm: perSetupPhysics[0].max_deflection_mm,
          predicted_Ra_um: 1.0, max_temperature_C: 300,
          estimated_tool_life_min: 60, cpk_estimate: perSetupPhysics[0].cpk_estimate,
        } : { max_force_N: 0, max_power_kW: 0, max_torque_Nm: 0, max_deflection_mm: 0,
          predicted_Ra_um: 0, max_temperature_C: 0, estimated_tool_life_min: 0, cpk_estimate: 0 },
        recommended_params: { speed_mpm: 150, rpm: 8000, feed_mmpt: 0.1, feed_mmmin: 2400, ap_mm: 5, ae_mm: 3 },
        verification: { verdict: "PASS", warnings: [], issues_count: 0 },
        material_name: req.material, material_iso_group: iso,
        machine_name: req.machine_name, controller: req.controller || "FANUC",
        operation_type: "complex_part",
      });
      tips = pkg.tribal_tips || [];
    } catch { /* tips optional */ }

    // ── 6. Cycle time summary ─────────────────────────────────
    const perSetupTimes = setups.map((s) => s.cycle_time_min);
    const setupChangeTime = 5; // minutes per setup change
    const totalCutting = perSetupTimes.reduce((s, t) => s + t, 0);
    const totalSetupChanges = Math.max(0, setups.length - 1) * setupChangeTime;

    // Deduplicate warnings
    const uniqueWarnings = [...new Set(allWarnings)].slice(0, 20);

    return {
      success: !setups.some((s) => s.verification_verdict === "FAIL_FATAL"),
      setups,
      total_setups: setups.length,
      combined_gcode: combinedGcode,
      total_gcode_lines: combinedGcode.split("\n").length,
      tool_list: allTools.map((t) => ({
        tool_id: t.tool_id, manufacturer: t.manufacturer,
        diameter_mm: t.diameter_mm, type: t.type,
        coating: t.coating, score: t.score,
      })),
      physics_report: { per_setup: perSetupPhysics },
      stock_chain: {
        initial_volume_mm3: req.stock_dims.length_mm * req.stock_dims.width_mm * req.stock_dims.height_mm,
        final_volume_mm3: stockResult.final_state.volume_mm3,
        removed_pct: stockResult.final_state.removed_pct,
        air_cut_operations: stockResult.air_cut_operations,
      },
      cycle_time: {
        per_setup_min: perSetupTimes,
        total_min: Math.round(totalCutting * 100) / 100,
        setup_change_min: totalSetupChanges,
        grand_total_min: Math.round((totalCutting + totalSetupChanges) * 100) / 100,
      },
      tribal_tips: tips,
      warnings: uniqueWarnings,
      pipeline_summary: {
        total_features: req.features.length,
        total_setups: setups.length,
        total_operations: totalOps,
        total_segments: totalSegments,
        total_tools: allTools.length,
        algorithms_used: [...new Set(allAlgorithms)],
        pipeline_time_ms: Date.now() - t0,
      },
    };
  }

  /**
   * Generate G-code for a single setup.
   */
  private _setupToGcode(
    setupId: number, segments: any[], tools: any[],
    progNum: number, controller: string,
  ): string {
    const lines: string[] = [];
    const fmt = (n: number) => n.toFixed(3);
    const rpm = segments[0]?.rpm || 8000;

    lines.push(`O${progNum}`);
    lines.push(`(SETUP ${setupId + 1} — PRISM CAM KERNEL)`);
    lines.push(`(${new Date().toISOString().split("T")[0]})`);
    lines.push("");
    lines.push("G90 G40 G80");
    lines.push("G17");
    lines.push("T01 M06");
    lines.push(`S${rpm} M03`);
    lines.push("M08");
    lines.push("G54");
    lines.push("");

    let lastType = "";
    for (const seg of segments) {
      if (seg.type === "rapid" || seg.type === "retract") {
        lines.push(`G00 X${fmt(seg.x)} Y${fmt(seg.y)} Z${fmt(seg.z)}`);
        lastType = "G00";
      } else if (seg.type === "plunge") {
        lines.push(`G01 Z${fmt(seg.z)} F${Math.round(seg.feed_mmmin)}`);
        lastType = "G01";
      } else if (seg.type === "feed") {
        const g = lastType === "G01" ? "" : "G01 ";
        lines.push(`${g}X${fmt(seg.x)} Y${fmt(seg.y)} Z${fmt(seg.z)} F${Math.round(seg.feed_mmmin)}`);
        lastType = "G01";
      }
    }

    lines.push("");
    lines.push("G00 Z50.000");
    lines.push("M09");
    lines.push("M05");
    lines.push("G28 G91 Z0");
    lines.push("M30");
    lines.push("");

    return lines.join("\n");
  }
}

export const scalableCAMOrchestratorEngine = new ScalableCAMOrchestratorEngine();
