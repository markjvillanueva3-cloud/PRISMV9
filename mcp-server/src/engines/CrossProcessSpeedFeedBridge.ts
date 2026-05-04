/**
 * CrossProcessSpeedFeedBridge — unified speed/feed (and EDM parameter)
 * recommendation across mill, lathe, and wire-EDM processes.
 *
 * Each process has its own canonical recommendation engine with its own
 * input/output shape:
 *   - mill  → ManufacturingCalculations.calculateSpeedFeed
 *             (HSS|Carbide|Ceramic|CBN|Diamond × roughing|finishing|semi)
 *   - lathe → LatheSpeedFeedCalculatorFacadeEngine.calculate
 *             (turning_insert|boring_bar|grooving|threading|... × ISO group)
 *   - wedm  → industry-standard pulse/current default table per
 *             material × thickness, validated through the
 *             WEDMSparkErosionModelEngine physics model
 *
 * Caller hands a single normalized request — the bridge picks the right
 * underlying engine, hands it a process-shaped input, and returns a
 * unified result with a discriminated `process` tag the caller switches on.
 *
 * The bridge is a planner/normalizer — it never overrides the underlying
 * engine's physics. Callers that need full underlying detail get it back
 * via the `source_result` field.
 *
 * Two static entry points:
 *   1. recommend(req) — process-routed speed/feed (or pulse/current for wedm)
 *   2. listProcessSupport() — capability matrix per process
 *
 * Pure dry-run: no live machine calls. Conservative defaults always.
 *
 * @engine CrossProcessSpeedFeedBridge
 * @milestone XPROC-SFC-01
 * @see ManufacturingCalculations.calculateSpeedFeed (mill)
 * @see LatheSpeedFeedCalculatorFacadeEngine.calculate (lathe)
 * @see WEDMSparkErosionModelEngine (wedm physics validator)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const SUPPORTED_PROCESSES = ["mill", "lathe", "wedm"] as const;
export type ProcessId = (typeof SUPPORTED_PROCESSES)[number];

const MILL_TOOL_MATERIALS = ["HSS", "Carbide", "Ceramic", "CBN", "Diamond"] as const;
const MILL_OPERATIONS = ["roughing", "semi-finishing", "finishing"] as const;
const LATHE_TOOL_TYPES = [
  "turning_insert",
  "boring_bar",
  "grooving",
  "threading",
  "parting",
  "drilling",
  "facing",
] as const;
const LATHE_OPERATIONS = [
  "roughing",
  "semi_finishing",
  "finishing",
  "threading",
  "grooving",
  "parting",
  "drilling",
  "boring",
] as const;

// WEDM default parameter table — derived from Mitsubishi / Sodick / AgieCharmilles
// machine handbook recommendations, organized by material × thickness band.
// Each band contains the conservative midpoint of the published parameter
// window. Caller can scale by quality_intent (1.0 default; 0.7 for finishing
// passes that prioritize Ra over speed).
interface WEDMDefaultParams {
  pulse_on_us: number;
  pulse_off_us: number;
  current_A: number;
  voltage_V: number;
  wire_tension_N: number;
}

const WEDM_BASE_DEFAULTS: Record<string, Record<"thin" | "medium" | "thick", WEDMDefaultParams>> = {
  steel: {
    thin: { pulse_on_us: 2, pulse_off_us: 10, current_A: 8, voltage_V: 60, wire_tension_N: 12 },
    medium: { pulse_on_us: 4, pulse_off_us: 15, current_A: 12, voltage_V: 60, wire_tension_N: 15 },
    thick: { pulse_on_us: 8, pulse_off_us: 20, current_A: 18, voltage_V: 70, wire_tension_N: 18 },
  },
  aluminum: {
    thin: { pulse_on_us: 3, pulse_off_us: 8, current_A: 12, voltage_V: 50, wire_tension_N: 10 },
    medium: { pulse_on_us: 6, pulse_off_us: 12, current_A: 18, voltage_V: 55, wire_tension_N: 12 },
    thick: { pulse_on_us: 12, pulse_off_us: 18, current_A: 27, voltage_V: 60, wire_tension_N: 14 },
  },
  titanium: {
    thin: { pulse_on_us: 1.2, pulse_off_us: 12, current_A: 5.6, voltage_V: 65, wire_tension_N: 14 },
    medium: { pulse_on_us: 2.4, pulse_off_us: 18, current_A: 8.4, voltage_V: 65, wire_tension_N: 17 },
    thick: { pulse_on_us: 4.8, pulse_off_us: 24, current_A: 12.6, voltage_V: 75, wire_tension_N: 20 },
  },
  carbide: {
    thin: { pulse_on_us: 0.8, pulse_off_us: 14, current_A: 4, voltage_V: 80, wire_tension_N: 16 },
    medium: { pulse_on_us: 1.6, pulse_off_us: 22, current_A: 6, voltage_V: 80, wire_tension_N: 18 },
    thick: { pulse_on_us: 3.2, pulse_off_us: 30, current_A: 9, voltage_V: 90, wire_tension_N: 20 },
  },
};

const WEDM_THIN_LIMIT_MM = 5;
const WEDM_MEDIUM_LIMIT_MM = 25;

// Wire diameters supported by the mainstream WEDM machines we model
const SUPPORTED_WEDM_WIRE_DIAMETERS = [0.10, 0.15, 0.20, 0.25, 0.30] as const;
const DEFAULT_WEDM_WIRE_DIAMETER_MM = 0.25;

// ============================================================================
// TYPES
// ============================================================================

export interface CrossProcessSFRequest {
  process: ProcessId;
  material: string;
  // ── mill-specific ────────────────────────────────────────────────────────
  tool_material?: (typeof MILL_TOOL_MATERIALS)[number];
  mill_operation?: (typeof MILL_OPERATIONS)[number];
  tool_diameter_mm?: number;
  number_of_teeth?: number;
  material_hardness_hb?: number;
  // ── lathe-specific ───────────────────────────────────────────────────────
  lathe_tool_type?: (typeof LATHE_TOOL_TYPES)[number];
  lathe_operation?: (typeof LATHE_OPERATIONS)[number];
  depth_of_cut_mm?: number;
  /** ISO machinability group override (P/M/K/N/S/H) — required when the
   *  material is in CANONICAL_MATERIAL_DB but lacks vc_base_roughing /
   *  vc_base_finishing fields, which forces the engine to its synthetic
   *  iso-group fallback path. Always pass for AISI codes (4140, 6061, etc). */
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  // ── wedm-specific ────────────────────────────────────────────────────────
  workpiece_thickness_mm?: number;
  wire_diameter_mm?: number;
  /** scale factor on current/pulse_on (default 1.0; <1.0 prioritizes Ra over MRR) */
  wedm_quality_intent?: number;
}

export interface CrossProcessSFResult {
  process: ProcessId;
  source_engine: string;
  warnings: string[];
  notes: string[];
  // ── mill / lathe outputs (rotational cutting) ────────────────────────────
  cutting_speed_m_min?: number;
  spindle_rpm?: number;
  feed_per_tooth_mm?: number;
  feed_per_rev_mm?: number;
  feed_rate_mm_min?: number;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  // ── wedm outputs (spark erosion) ─────────────────────────────────────────
  pulse_on_us?: number;
  pulse_off_us?: number;
  current_A?: number;
  voltage_V?: number;
  wire_tension_N?: number;
  duty_cycle?: number;
  predicted_mrr_mm3_min?: number;
  predicted_ra_um?: number;
  /** Raw underlying-engine result for callers that need the full detail */
  source_result: Record<string, unknown>;
}

export interface CrossProcessSFCapability {
  process: ProcessId;
  supported: boolean;
  source_engine: string;
  primary_outputs: readonly string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class CrossProcessSpeedFeedBridge {
  /**
   * Recommend speed/feed (mill/lathe) or pulse/current (wedm) for the given
   * process + material + tool/wire + operation.
   *
   * Throws on:
   *   - unsupported `process` id
   *   - missing `material` (non-empty string required)
   *   - mill: missing `tool_material` or `tool_diameter_mm` or `number_of_teeth`
   *   - lathe: missing `lathe_tool_type` or `lathe_operation`
   *   - wedm: missing `workpiece_thickness_mm`, or material outside the
   *     known WEDM table (steel/aluminum/titanium/carbide), or unsupported
   *     wire diameter, or wedm_quality_intent outside (0, 2]
   *
   * @param req — normalized cross-process request
   * @returns CrossProcessSFResult tagged with `process` for downstream switch
   */
  static async recommend(req: CrossProcessSFRequest): Promise<CrossProcessSFResult> {
    if (!req.process || !(SUPPORTED_PROCESSES as readonly string[]).includes(req.process)) {
      throw new Error(
        `CrossProcessSpeedFeedBridge.recommend: unsupported process "${String(req.process)}" (supported: ${SUPPORTED_PROCESSES.join(", ")})`,
      );
    }
    if (!req.material || typeof req.material !== "string") {
      throw new Error("CrossProcessSpeedFeedBridge.recommend: material required (non-empty string)");
    }

    if (req.process === "mill") {
      return this.recommendMill(req);
    }
    if (req.process === "lathe") {
      return this.recommendLathe(req);
    }
    return this.recommendWEDM(req);
  }

  /**
   * Capability matrix snapshot — what each process supports + which engine
   * it routes to + what fields the caller will receive on the result.
   *
   * @returns capability snapshot per process, in SUPPORTED_PROCESSES order
   */
  static listProcessSupport(): CrossProcessSFCapability[] {
    return [
      {
        process: "mill",
        supported: true,
        source_engine: "ManufacturingCalculations.calculateSpeedFeed",
        primary_outputs: [
          "cutting_speed_m_min",
          "spindle_rpm",
          "feed_per_tooth_mm",
          "feed_rate_mm_min",
          "axial_depth_mm",
          "radial_depth_mm",
        ],
      },
      {
        process: "lathe",
        supported: true,
        source_engine: "LatheSpeedFeedCalculatorFacadeEngine.calculate",
        primary_outputs: [
          "cutting_speed_m_min",
          "spindle_rpm",
          "feed_per_rev_mm",
          "feed_rate_mm_min",
        ],
      },
      {
        process: "wedm",
        supported: true,
        source_engine:
          "CrossProcessSpeedFeedBridge.recommendWEDM (table) → WEDMSparkErosionModelEngine.calculate (physics)",
        primary_outputs: [
          "pulse_on_us",
          "pulse_off_us",
          "current_A",
          "voltage_V",
          "wire_tension_N",
          "duty_cycle",
          "predicted_mrr_mm3_min",
          "predicted_ra_um",
        ],
      },
    ];
  }

  // ── mill path ────────────────────────────────────────────────────────────

  private static async recommendMill(req: CrossProcessSFRequest): Promise<CrossProcessSFResult> {
    if (!req.tool_material || !(MILL_TOOL_MATERIALS as readonly string[]).includes(req.tool_material)) {
      throw new Error(
        `CrossProcessSpeedFeedBridge: mill recommendation requires tool_material in [${MILL_TOOL_MATERIALS.join(", ")}]`,
      );
    }
    const millOp = req.mill_operation ?? "semi-finishing";
    if (!(MILL_OPERATIONS as readonly string[]).includes(millOp)) {
      throw new Error(
        `CrossProcessSpeedFeedBridge: mill_operation must be one of [${MILL_OPERATIONS.join(", ")}]`,
      );
    }
    if (typeof req.tool_diameter_mm !== "number" || req.tool_diameter_mm <= 0) {
      throw new Error(
        "CrossProcessSpeedFeedBridge: mill recommendation requires positive tool_diameter_mm",
      );
    }
    if (
      typeof req.number_of_teeth !== "number" ||
      !Number.isFinite(req.number_of_teeth) ||
      req.number_of_teeth <= 0
    ) {
      throw new Error(
        "CrossProcessSpeedFeedBridge: mill recommendation requires positive number_of_teeth",
      );
    }

    const { calculateSpeedFeed } = await import("./ManufacturingCalculations.js");
    const out = calculateSpeedFeed({
      tool_material: req.tool_material,
      operation: millOp,
      tool_diameter: req.tool_diameter_mm,
      number_of_teeth: req.number_of_teeth,
      material_hardness: req.material_hardness_hb ?? 200,
    });

    return {
      process: "mill",
      source_engine: "ManufacturingCalculations.calculateSpeedFeed",
      cutting_speed_m_min: out.cutting_speed,
      spindle_rpm: out.spindle_speed,
      feed_per_tooth_mm: out.feed_per_tooth,
      feed_rate_mm_min: out.feed_rate,
      axial_depth_mm: out.axial_depth,
      radial_depth_mm: out.radial_depth,
      warnings: [...out.warnings],
      notes: [...out.recommendations, `material=${req.material} (hardness used=${req.material_hardness_hb ?? 200} HB)`],
      source_result: out as unknown as Record<string, unknown>,
    };
  }

  // ── lathe path ───────────────────────────────────────────────────────────

  private static async recommendLathe(req: CrossProcessSFRequest): Promise<CrossProcessSFResult> {
    if (
      !req.lathe_tool_type ||
      !(LATHE_TOOL_TYPES as readonly string[]).includes(req.lathe_tool_type)
    ) {
      throw new Error(
        `CrossProcessSpeedFeedBridge: lathe recommendation requires lathe_tool_type in [${LATHE_TOOL_TYPES.join(", ")}]`,
      );
    }
    const latheOp = req.lathe_operation ?? "semi_finishing";
    if (!(LATHE_OPERATIONS as readonly string[]).includes(latheOp)) {
      throw new Error(
        `CrossProcessSpeedFeedBridge: lathe_operation must be one of [${LATHE_OPERATIONS.join(", ")}]`,
      );
    }

    const { LatheSpeedFeedCalculatorFacadeEngine } = await import(
      "./LatheSpeedFeedCalculatorFacadeEngine.js"
    );
    // For turning, the surface-speed reference is the WORKPIECE diameter
    // (where the tool engages the part). Most callers pass `tool_diameter_mm`
    // intuitively meaning "what's the cutting diameter" — pipe it through as
    // workpiece.diameter_mm so the RPM computation has a finite radius.
    //
    // BRIDGE WORKAROUND: when iso_group is supplied, route the material
    // through an unknown-key sentinel so the lathe engine takes the synthetic
    // iso-group fallback path (which DOES populate vc_base_roughing /
    // vc_base_finishing). Otherwise, CANONICAL_MATERIAL_DB entries are
    // structurally MaterialEntry-shaped and missing the vc_base_* fields
    // the lathe vc calculation depends on — producing NaN. The original
    // material is preserved on `notes` for downstream auditing.
    const useIsoFallback = !!req.iso_group;
    const materialForEngine = useIsoFallback
      ? `__bridge_iso_${req.iso_group}__`
      : req.material;
    const out = LatheSpeedFeedCalculatorFacadeEngine.calculate({
      material: materialForEngine,
      iso_group: req.iso_group,
      tool: {
        type: req.lathe_tool_type,
        diameter_mm: req.tool_diameter_mm,
      },
      operation: {
        type: latheOp,
        depth_of_cut_mm: req.depth_of_cut_mm,
      },
      machine: {},
      workpiece: req.tool_diameter_mm
        ? { diameter_mm: req.tool_diameter_mm }
        : undefined,
    });

    const rec = out.recommendation;
    const feedRate =
      typeof rec?.feed_mm_rev === "number" && typeof rec?.rpm === "number"
        ? round2(rec.feed_mm_rev * rec.rpm)
        : undefined;
    return {
      process: "lathe",
      source_engine: "LatheSpeedFeedCalculatorFacadeEngine.calculate",
      cutting_speed_m_min: rec?.cutting_speed_m_min,
      spindle_rpm: rec?.rpm,
      feed_per_rev_mm: rec?.feed_mm_rev,
      feed_rate_mm_min: feedRate,
      axial_depth_mm: rec?.depth_of_cut_mm,
      warnings: [],
      notes: [
        `material=${req.material}${useIsoFallback ? ` (engine routed via iso_group=${req.iso_group} synthetic fallback for vc_base_*)` : ""}`,
        `confidence=${typeof out.confidence === "number" ? out.confidence.toFixed(2) : "n/a"}`,
        `sources=${(out.sources ?? []).map((s) => s.name).join(", ") || "n/a"}`,
      ],
      source_result: out as unknown as Record<string, unknown>,
    };
  }

  // ── wedm path ────────────────────────────────────────────────────────────

  private static async recommendWEDM(req: CrossProcessSFRequest): Promise<CrossProcessSFResult> {
    if (typeof req.workpiece_thickness_mm !== "number" || req.workpiece_thickness_mm <= 0) {
      throw new Error(
        "CrossProcessSpeedFeedBridge: wedm recommendation requires positive workpiece_thickness_mm",
      );
    }
    const matKey = req.material.toLowerCase().trim();
    const matBand = WEDM_BASE_DEFAULTS[matKey];
    if (!matBand) {
      throw new Error(
        `CrossProcessSpeedFeedBridge: wedm material "${req.material}" not in default table (supported: ${Object.keys(WEDM_BASE_DEFAULTS).join(", ")})`,
      );
    }
    const wireDia = req.wire_diameter_mm ?? DEFAULT_WEDM_WIRE_DIAMETER_MM;
    if (!(SUPPORTED_WEDM_WIRE_DIAMETERS as readonly number[]).includes(wireDia)) {
      throw new Error(
        `CrossProcessSpeedFeedBridge: wedm wire_diameter_mm=${wireDia} not supported (supported: ${SUPPORTED_WEDM_WIRE_DIAMETERS.join(", ")})`,
      );
    }
    const qIntent = req.wedm_quality_intent ?? 1.0;
    if (!Number.isFinite(qIntent) || qIntent <= 0 || qIntent > 2) {
      throw new Error(
        "CrossProcessSpeedFeedBridge: wedm_quality_intent must be a finite number in (0, 2]",
      );
    }

    const band: "thin" | "medium" | "thick" =
      req.workpiece_thickness_mm <= WEDM_THIN_LIMIT_MM
        ? "thin"
        : req.workpiece_thickness_mm <= WEDM_MEDIUM_LIMIT_MM
          ? "medium"
          : "thick";
    const base = matBand[band];

    // Apply quality intent: <1.0 => finer finish (less current, longer pulse_off)
    const current_A = round2(base.current_A * qIntent);
    const pulse_on_us = round2(base.pulse_on_us * qIntent);
    const pulse_off_us = round2(base.pulse_off_us / qIntent);
    const voltage_V = base.voltage_V;
    const wire_tension_N = base.wire_tension_N;
    const dutyCycle = pulse_on_us / (pulse_on_us + pulse_off_us);

    // Validate via spark erosion physics — if the predicted MRR is < 0.05 mm³/min
    // OR Ra > 6.3 µm, surface a warning so the operator knows the table default
    // landed outside a reasonable productivity window for this material.
    const { wedmSparkErosionModelEngine } = await import("./WEDMSparkErosionModelEngine.js");
    const phys = wedmSparkErosionModelEngine.calculate({
      material: matKey,
      thickness_mm: req.workpiece_thickness_mm,
      wire_diameter_mm: wireDia,
      pulse_on_us,
      pulse_off_us,
      current_A,
      voltage_V,
    });

    const warnings: string[] = [...(phys.warnings ?? [])];
    if (phys.mrr_mm3_min < 0.05) {
      warnings.push(
        `predicted MRR=${phys.mrr_mm3_min} mm³/min is unusually low — verify pulse/current selection`,
      );
    }
    if (phys.predicted_Ra_um > 6.3) {
      warnings.push(
        `predicted Ra=${phys.predicted_Ra_um} µm exceeds N9 surface grade — reduce current or pulse_on for finer finish`,
      );
    }

    return {
      process: "wedm",
      source_engine:
        "CrossProcessSpeedFeedBridge.recommendWEDM (table) → WEDMSparkErosionModelEngine.calculate (physics)",
      pulse_on_us,
      pulse_off_us,
      current_A,
      voltage_V,
      wire_tension_N,
      duty_cycle: round2(dutyCycle),
      predicted_mrr_mm3_min: phys.mrr_mm3_min,
      predicted_ra_um: phys.predicted_Ra_um,
      warnings,
      notes: [
        `material=${req.material}`,
        `thickness_band=${band} (${req.workpiece_thickness_mm} mm)`,
        `wire_dia=${wireDia} mm`,
        `quality_intent=${qIntent} (1.0=balanced, <1.0=finishing, >1.0=roughing)`,
      ],
      source_result: phys as unknown as Record<string, unknown>,
    };
  }
}

// ============================================================================
// HELPERS (module-private)
// ============================================================================

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
