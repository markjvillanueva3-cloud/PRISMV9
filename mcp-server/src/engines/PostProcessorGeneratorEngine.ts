/**
 * PostProcessorGeneratorEngine — Ultimate Post Processor Configuration Generator
 *
 * Generates complete, production-ready post processor configurations by combining
 * the best features from all supported CAM systems. Takes a machine profile and
 * desired feature set, outputs a full post configuration with controller-specific
 * G-code templates, safety blocks, and optimized defaults.
 *
 * This is the "post processor factory" — it creates the posts themselves, not G-code.
 * The generated posts can then be used by MasterPostProcessorEngine to produce G-code.
 *
 * Key capabilities:
 *   1. Generate complete post configs from machine specs
 *   2. Merge best features from multiple CAM systems into one post
 *   3. Output controller-specific safe start/end blocks
 *   4. Generate machine-specific canned cycle definitions
 *   5. Validate post configs against machine capabilities
 *   6. Export posts in multiple formats (PRISM JSON, text template)
 */

import type { TargetController } from "./CamKnowledgePortabilityEngine.js";
import type { MachineFeatures, MasterPostConfig, PostTemplate } from "./MasterPostProcessorEngine.js";
import { masterPostProcessorEngine } from "./MasterPostProcessorEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

/** Input specification for generating a post processor */
export interface PostGeneratorInput {
  /** Target controller type */
  controller: TargetController;
  /** Machine manufacturer */
  manufacturer: string;
  /** Machine model */
  model: string;
  /** Number of axes */
  axis_count: 3 | 4 | 5;
  /** Spindle taper */
  taper: string;
  /** Maximum spindle RPM */
  max_rpm: number;
  /** Maximum feed rate mm/min */
  max_feed: number;
  /** Maximum tool capacity */
  tool_capacity: number;
  /** Has through-spindle coolant */
  has_tsc: boolean;
  /** Has probing capability */
  has_probing: boolean;
  /** Has SSV (spindle speed variation) */
  has_ssv?: boolean;
  /** Rotary axis configuration for 4/5-axis */
  rotary?: { primary: "A" | "B" | "C"; secondary?: "A" | "B" | "C"; range?: number };
  /** Is a lathe or mill-turn */
  is_lathe?: boolean;
  /** Has sub-spindle */
  has_sub_spindle?: boolean;
  /** Has Y-axis (lathe) */
  has_y_axis?: boolean;
  /** Has live tooling (lathe) */
  has_live_tooling?: boolean;
  /** CAM systems to pull best features from */
  feature_sources?: Array<{
    cam: string;
    features: string[];
  }>;
  /** Custom M-codes to include */
  custom_mcodes?: Record<string, string>;
}

/** A complete generated post processor definition */
export interface GeneratedPost {
  /** Unique post ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Target controller */
  controller: TargetController;
  /** Machine info */
  machine: {
    manufacturer: string;
    model: string;
    axis_count: number;
    taper: string;
  };
  /** Safe start block */
  safe_start: string;
  /** Program end block */
  program_end: string;
  /** Tool change sequence */
  tool_change_template: string;
  /** Work offset setup */
  work_offset_template: string;
  /** Coolant control codes */
  coolant_codes: Record<string, { on: string; off: string }>;
  /** HSM/smoothing control */
  hsm_control?: {
    activate: string;
    deactivate: string;
    modes: Record<string, string>;
  };
  /** 5-axis RTCP/TCP control */
  five_axis_control?: {
    tcp_on: string;
    tcp_off: string;
    mode: string;
    inverse_time: string;
  };
  /** Canned cycle definitions */
  canned_cycles: Record<string, string>;
  /** Probing cycles */
  probing_cycles?: Record<string, string>;
  /** Safety features */
  safety: {
    retract: string;
    emergency_stop: string;
    door_interlock?: string;
  };
  /** SSV control */
  ssv_control?: { on: string; off: string; range: string };
  /** Custom M-codes */
  custom_codes: Record<string, string>;
  /** Cross-CAM features enabled */
  cross_cam_features: string[];
  /** Master post config for use with MasterPostProcessorEngine */
  master_config: MasterPostConfig;
  /** Validation warnings */
  warnings: string[];
  /** Feature count summary */
  feature_count: number;
}

/** Post comparison result */
export interface PostComparison {
  controllers: TargetController[];
  features: Array<{
    feature: string;
    support: Record<TargetController, string | boolean>;
  }>;
  recommendations: string[];
}

// ── Controller Templates ────────────────────────────────────────────────────

interface ControllerTemplate {
  safe_start: string;
  program_end: string;
  tool_change: (t: number, rpm: number) => string;
  work_offset: (offset: string) => string;
  retract: string;
  emergency: string;
  canned_cycles: Record<string, string>;
  probing?: Record<string, string>;
}

const CONTROLLER_TEMPLATES: Record<TargetController, ControllerTemplate> = {
  fanuc: {
    safe_start: "G90 G94 G17 G40 G49 G80",
    program_end: "M30\n%",
    tool_change: (t, rpm) => `T${t} M6\nS${rpm} M3`,
    work_offset: (o) => o,
    retract: "G28 G91 Z0\nG90",
    emergency: "M0 (EMERGENCY STOP)",
    canned_cycles: {
      drill: "G81 Z#depth R#retract F#feed",
      peck_drill: "G83 Z#depth R#retract Q#peck F#feed",
      tap: "G84 Z#depth R#retract F#pitch_feed",
      bore: "G76 Z#depth R#retract F#feed",
      ream: "G85 Z#depth R#retract F#feed",
      back_bore: "G87 Z#depth R#retract F#feed",
      cancel: "G80",
    },
    probing: {
      single_surface: "G65 P9811",
      bore: "G65 P9812",
      boss: "G65 P9814",
      pocket: "G65 P9843",
      tool_length: "G65 P9023",
    },
  },
  haas: {
    safe_start: "G90 G94 G17 G40 G49 G80",
    program_end: "M30\n%",
    tool_change: (t, rpm) => `T${t} M6\nS${rpm} M3`,
    work_offset: (o) => o,
    retract: "G28 G91 Z0\nG90",
    emergency: "M0 (EMERGENCY STOP)",
    canned_cycles: {
      drill: "G81 Z#depth R#retract F#feed",
      peck_drill: "G83 Z#depth R#retract Q#peck F#feed",
      tap: "M29 S#rpm\nG84 Z#depth R#retract F#pitch_feed",
      bore: "G76 Z#depth R#retract F#feed",
      ream: "G85 Z#depth R#retract F#feed",
      cancel: "G80",
    },
    probing: {
      single_surface: "G65 P9832",
      bore: "G65 P9812",
      boss: "G65 P9814",
      tool_length: "G65 P9023",
      tool_diameter: "G65 P9033",
    },
  },
  siemens: {
    safe_start: "G90 G94 G17 G40 G49 G80\nCYCLE800()",
    program_end: "M30",
    tool_change: (t, rpm) => `T${t} D1\nM6\nS${rpm} M3`,
    work_offset: (o) => o.replace("G54", "G500"),
    retract: "SUPA G0 Z=R2\nG90",
    emergency: "M0 ; EMERGENCY STOP",
    canned_cycles: {
      drill: "CYCLE81(#retract,0,#safety,#depth)",
      peck_drill: "CYCLE83(#retract,0,#safety,#depth,#peck,,)",
      tap: "CYCLE84(#retract,0,#depth,#safety,,3,#pitch)",
      bore: "CYCLE86(#retract,0,#safety,#depth,,,)",
      ream: "CYCLE85(#retract,0,#safety,#depth,,)",
      cancel: "MCALL",
    },
    probing: {
      single_surface: "CYCLE978",
      bore: "CYCLE977",
      tool_length: "CYCLE982",
    },
  },
  heidenhain: {
    safe_start: "BEGIN PGM #name MM\nTOOL CALL 0 Z S0",
    program_end: "END PGM #name MM",
    tool_change: (t, rpm) => `TOOL CALL ${t} Z S${rpm}`,
    work_offset: () => "CYCL DEF 247 DATUM SETTING ~\n  Q339=+0",
    retract: "L Z+0 R0 FMAX M91",
    emergency: "STOP M0 ; EMERGENCY",
    canned_cycles: {
      drill: "CYCL DEF 200 DRILLING ~\n  Q200=#safety ~\n  Q201=-#depth ~\n  Q206=#feed",
      peck_drill: "CYCL DEF 203 UNIVERSAL DRILLING ~\n  Q200=#safety ~\n  Q201=-#depth ~\n  Q202=#peck ~\n  Q206=#feed",
      tap: "CYCL DEF 207 RIGID TAPPING ~\n  Q201=-#depth ~\n  Q239=#pitch",
      bore: "CYCL DEF 202 BORING ~\n  Q200=#safety ~\n  Q201=-#depth ~\n  Q206=#feed",
      cancel: "CYCL DEF END",
    },
    probing: {
      single_surface: "TCH PROBE 427",
      bore: "TCH PROBE 421",
      boss: "TCH PROBE 422",
      tool_length: "TCH PROBE 481",
    },
  },
  mazak: {
    safe_start: "G40 G80 G90 G94 G69",
    program_end: "M30\n%",
    tool_change: (t, rpm) =>
      `T${t.toString().padStart(4, "0")}\nM6\nS${rpm} M3`,
    work_offset: (o) => o,
    retract: "G28 G91 Z0\nG90",
    emergency: "M0 (EMERGENCY STOP)",
    canned_cycles: {
      drill: "G81 Z#depth R#retract F#feed",
      peck_drill: "G83 Z#depth R#retract Q#peck F#feed",
      tap: "G84 Z#depth R#retract F#pitch_feed",
      tornado_tap: "G130 Z#depth R#retract F#pitch_feed",
      bore: "G76 Z#depth R#retract F#feed",
      cancel: "G80",
    },
  },
  okuma: {
    safe_start: "G40 G180 G90 G94",
    program_end: "M30\n%",
    tool_change: (t, rpm) =>
      `T${t.toString().padStart(4, "0")}\nM6\nS${rpm} M3`,
    work_offset: (o) => o.replace("G54", "G15 H1"),
    retract: "G20 Z0\nG90",
    emergency: "M0 (EMERGENCY STOP)",
    canned_cycles: {
      drill: "G181 Z#depth R#retract F#feed",
      peck_drill: "G183 Z#depth R#retract Q#peck F#feed",
      tap: "G184 Z#depth R#retract F#pitch_feed",
      bore: "G189 Z#depth R#retract F#feed",
      cancel: "G180",
    },
    probing: {
      single_surface: "G65 P9810",
      tool_length: "G65 P9820",
    },
  },
};

// ── Engine ───────────────────────────────────────────────────────────────────

export class PostProcessorGeneratorEngine {
  /**
   * Generate a complete post processor from machine specifications.
   * This is the primary entry point.
   */
  generate(input: PostGeneratorInput): GeneratedPost {
    const warnings: string[] = [];
    const template = CONTROLLER_TEMPLATES[input.controller];
    const machineFeatures = masterPostProcessorEngine
      .getMachineFeatures(input.controller);

    // Build post ID
    const id = `${input.manufacturer.toLowerCase().replace(/\s+/g, "-")}-${
      input.model.toLowerCase().replace(/\s+/g, "-")
    }-${input.controller}`;

    // Coolant codes
    const coolantCodes: Record<string, { on: string; off: string }> = {
      flood: machineFeatures.coolant?.flood ?? { on: "M8", off: "M9" },
      mist: machineFeatures.coolant?.mist ?? { on: "M7", off: "M9" },
    };
    if (input.has_tsc && machineFeatures.tsc) {
      coolantCodes.tsc = machineFeatures.tsc;
    }
    if (machineFeatures.coolant?.air) {
      coolantCodes.air = machineFeatures.coolant.air;
    }

    // HSM control
    let hsmControl: GeneratedPost["hsm_control"];
    if (machineFeatures.hsm) {
      const modes: Record<string, string> = {};
      for (const [mode, code] of Object.entries(machineFeatures.hsm.modes)) {
        modes[mode] = `${machineFeatures.hsm.code} ${code}`;
      }
      hsmControl = {
        activate: `${machineFeatures.hsm.code} ${
          machineFeatures.hsm.modes.finish ?? machineFeatures.hsm.modes.quality ?? ""
        }`.trim(),
        deactivate: this.getHSMDeactivate(input.controller),
        modes,
      };
    }

    // 5-axis control
    let fiveAxisControl: GeneratedPost["five_axis_control"];
    if (input.axis_count >= 5 && machineFeatures.fiveAxis) {
      fiveAxisControl = {
        tcp_on: machineFeatures.fiveAxis.tcp,
        tcp_off: this.getTCPOff(input.controller),
        mode: this.getTCPModeName(input.controller),
        inverse_time: "G93",
      };

      // Validate rotary config
      if (!input.rotary) {
        warnings.push("5-axis machine without rotary config — defaulting to A/C");
      }
    } else if (input.axis_count >= 5 && !machineFeatures.fiveAxis) {
      warnings.push(
        `5-axis requested but no TCP codes for ${input.controller}`,
      );
    }

    // SSV control
    let ssvControl: GeneratedPost["ssv_control"];
    if (input.has_ssv && machineFeatures.ssv) {
      ssvControl = {
        on: machineFeatures.ssv.on,
        off: machineFeatures.ssv.off,
        range: machineFeatures.ssv.range ?? "5-15%",
      };
    }

    // Probing cycles
    let probingCycles: Record<string, string> | undefined;
    if (input.has_probing && template.probing) {
      probingCycles = { ...template.probing };
    } else if (input.has_probing && machineFeatures.probing) {
      probingCycles = {};
      if (machineFeatures.probing.probe) {
        probingCycles.single_surface = machineFeatures.probing.probe;
      }
      if (machineFeatures.probing.toolSetter) {
        probingCycles.tool_length = machineFeatures.probing.toolSetter;
      }
    }

    // Cross-CAM features
    const crossCamFeatures: string[] = [];
    if (input.feature_sources) {
      for (const source of input.feature_sources) {
        for (const feat of source.features) {
          crossCamFeatures.push(`${source.cam}:${feat}`);
        }
      }
    }

    // Build MasterPostConfig
    const masterConfig: MasterPostConfig = {
      controller: input.controller,
      machine: {
        manufacturer: input.manufacturer,
        model: input.model,
        controller: input.controller,
        max_rpm: input.max_rpm,
        max_feed: input.max_feed,
        axis_count: input.axis_count,
        has_probing: input.has_probing,
        has_tsc: input.has_tsc,
        has_ssv: input.has_ssv,
        taper: input.taper,
        tool_capacity: input.tool_capacity,
        features: machineFeatures,
      },
      enable_hsm: !!hsmControl,
      enable_feed_optimization: true,
      enable_cross_cam_features: crossCamFeatures.length > 0,
      smoothing_mode: hsmControl ? "finish" : "off",
      five_axis_mode: input.axis_count >= 5 ? "tcpm" : "none",
      safe_start_block: true,
      use_canned_cycles: true,
      line_numbers: false,
      cross_cam_features: {
        solidcam_chip_thinning: crossCamFeatures.some(f =>
          f.includes("chip_thinning") || f.includes("iMachining")),
        hypermill_collision_check: crossCamFeatures.some(f =>
          f.includes("collision")),
        fusion360_adaptive: crossCamFeatures.some(f =>
          f.includes("adaptive")),
        mastercam_dynamic_chip_load: crossCamFeatures.some(f =>
          f.includes("dynamic")),
        nx_advanced_rtcp: crossCamFeatures.some(f =>
          f.includes("rtcp")),
      },
    };

    // Count features
    let featureCount = Object.keys(coolantCodes).length
      + Object.keys(template.canned_cycles).length;
    if (hsmControl) featureCount += Object.keys(hsmControl.modes).length;
    if (fiveAxisControl) featureCount += 3;
    if (probingCycles) featureCount += Object.keys(probingCycles).length;
    if (ssvControl) featureCount += 1;
    featureCount += crossCamFeatures.length;
    featureCount += Object.keys(input.custom_mcodes ?? {}).length;

    // Validation
    if (input.max_rpm > 40000) {
      warnings.push("RPM > 40000 — verify spindle bearing rating");
    }
    if (input.tool_capacity > 200) {
      warnings.push("Tool capacity > 200 — verify ATC magazine type");
    }

    return {
      id,
      name: `${input.manufacturer} ${input.model} — ${input.controller.toUpperCase()}`,
      controller: input.controller,
      machine: {
        manufacturer: input.manufacturer,
        model: input.model,
        axis_count: input.axis_count,
        taper: input.taper,
      },
      safe_start: template.safe_start,
      program_end: template.program_end,
      tool_change_template: template.tool_change(1, 10000),
      work_offset_template: template.work_offset("G54"),
      coolant_codes: coolantCodes,
      hsm_control: hsmControl,
      five_axis_control: fiveAxisControl,
      canned_cycles: template.canned_cycles,
      probing_cycles: probingCycles,
      safety: {
        retract: template.retract,
        emergency_stop: template.emergency,
      },
      ssv_control: ssvControl,
      custom_codes: input.custom_mcodes ?? {},
      cross_cam_features: crossCamFeatures,
      master_config: masterConfig,
      warnings,
      feature_count: featureCount,
    };
  }

  /**
   * Compare feature support across all controllers.
   */
  compareControllers(): PostComparison {
    const controllers: TargetController[] = [
      "fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma",
    ];

    const featureList = [
      "HSM Smoothing",
      "NURBS Interpolation",
      "5-Axis TCP/RTCP",
      "Through-Spindle Coolant",
      "Probing Cycles",
      "SSV (Spindle Speed Variation)",
      "Rigid Tapping",
      "Collision Avoidance",
      "Canned Drill Cycles",
      "Arc Fitting",
      "Spline Compression",
    ];

    const featureMatrix: PostComparison["features"] = featureList.map(feat => {
      const support: Record<TargetController, string | boolean> =
        {} as Record<TargetController, string | boolean>;

      for (const ctrl of controllers) {
        const mf = masterPostProcessorEngine.getMachineFeatures(ctrl);
        switch (feat) {
          case "HSM Smoothing":
            support[ctrl] = mf.hsm?.code ?? false;
            break;
          case "NURBS Interpolation":
            support[ctrl] = ctrl === "fanuc" || ctrl === "siemens"
              || ctrl === "mazak" || ctrl === "okuma";
            break;
          case "5-Axis TCP/RTCP":
            support[ctrl] = mf.fiveAxis?.tcp ?? false;
            break;
          case "Through-Spindle Coolant":
            support[ctrl] = mf.tsc?.on ?? false;
            break;
          case "Probing Cycles":
            support[ctrl] = mf.probing?.probe ?? false;
            break;
          case "SSV (Spindle Speed Variation)":
            support[ctrl] = mf.ssv?.on ?? false;
            break;
          case "Rigid Tapping":
            support[ctrl] = true; // All controllers support it
            break;
          case "Collision Avoidance":
            support[ctrl] = mf.cas?.code ?? false;
            break;
          case "Canned Drill Cycles":
            support[ctrl] = true;
            break;
          case "Arc Fitting":
            support[ctrl] = true;
            break;
          case "Spline Compression":
            support[ctrl] = ctrl === "siemens" || ctrl === "heidenhain";
            break;
          default:
            support[ctrl] = false;
        }
      }

      return { feature: feat, support };
    });

    return {
      controllers,
      features: featureMatrix,
      recommendations: [
        "Haas: Best value for 3-5 axis milling, strong probing, G187 HSM",
        "Siemens 840D: Best for complex 5-axis with CYCLE832 + TRAORI",
        "Heidenhain TNC: Best conversational UI, FUNCTION TCPM, DCM collision",
        "Okuma OSP: Super NURBS + CAS collision, strong for multi-tasking",
        "Mazak Smooth: Best for mill-turn INTEGREX, dual dialect T/M",
        "Fanuc: Widest compatibility, industry standard reference dialect",
      ],
    };
  }

  /**
   * Generate a post from an existing template.
   */
  generateFromTemplate(templateId: string): GeneratedPost | null {
    const templates = masterPostProcessorEngine.getPostTemplates();
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return null;

    return this.generate({
      controller: tmpl.controller,
      manufacturer: tmpl.manufacturer,
      model: tmpl.machine_family,
      axis_count: tmpl.config.five_axis_mode === "tcpm" ? 5 : 3,
      taper: "CAT40",
      max_rpm: 15000,
      max_feed: 15000,
      tool_capacity: 40,
      has_tsc: true,
      has_probing: true,
      has_ssv: true,
    });
  }

  /** Stats */
  stats(): {
    controllers: number;
    canned_cycle_types: number;
    feature_categories: number;
    templates_available: number;
  } {
    return {
      controllers: 6,
      canned_cycle_types: 7,
      feature_categories: 11,
      templates_available: masterPostProcessorEngine
        .getPostTemplates().length,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private getHSMDeactivate(controller: TargetController): string {
    const map: Record<TargetController, string> = {
      fanuc: "G5.1 Q0",
      haas: "G187 P2",
      siemens: "CYCLE832()",
      heidenhain: "M120 L0",
      mazak: "G5.1 Q0",
      okuma: "G08 P0",
    };
    return map[controller];
  }

  private getTCPOff(controller: TargetController): string {
    const map: Record<TargetController, string> = {
      fanuc: "G49",
      haas: "G49",
      siemens: "TRAFOOF",
      heidenhain: "M129",
      mazak: "G49",
      okuma: "G49",
    };
    return map[controller];
  }

  private getTCPModeName(controller: TargetController): string {
    const map: Record<TargetController, string> = {
      fanuc: "G43.4 RTCP",
      haas: "G234 DWO",
      siemens: "TRAORI RTCP",
      heidenhain: "FUNCTION TCPM",
      mazak: "G43.4 RTCP",
      okuma: "G169 TCP",
    };
    return map[controller];
  }

  /**
   * JULIETT-DB-BRIDGE-MS0/U-DB-MACHINE-QUALITY-CONSUMERS — Phase 5 wire (post consumer).
   *
   * Wrapper over generate() that consumes machineQualityForConsumer('post')
   * and emits a quality_optimization overlay carrying:
   *   - controller_family (premium / production / basic) — tier-derived class
   *   - accuracy_class (ultra_precision / precision / standard)
   *   - recommend_look_ahead_blocks_min — minimum look-ahead the post should set
   *
   * Additive — when machine_id/machine not provided, behavior identical to generate().
   *
   * @param input Standard PostGeneratorInput. Manufacturer + model fields are
   *              re-used to resolve machine-quality (no extra lookup args needed).
   */
  async generateWithMachineQuality(
    input: PostGeneratorInput & {
      machine_id?: string;
      machine?: Record<string, unknown>;
    },
  ): Promise<GeneratedPost & {
    quality_optimization?: {
      controller_family: string;
      accuracy_class: string;
      recommend_look_ahead_blocks_min: number;
      tier: string;
      score: number;
      source: string;
    };
  }> {
    const base = this.generate(input);

    // Resolve machine reference: explicit machine > machine_id > manufacturer+model
    const machineRef = input.machine ?? {
      id: input.machine_id ?? `${input.manufacturer}-${input.model}`,
      manufacturer: input.manufacturer,
      model: input.model,
      controller: { family: input.controller },
      max_rapid_mm_min: input.max_feed,
      // machine fields not in PostGeneratorInput: way_type, positioning_accuracy_um,
      // mass_kg, accel_g — these stay undefined → contribute to missing_fields list
    };

    const { machineQualityForConsumer } = await import("./MachineQualityScoreEngine.js");
    const q = await machineQualityForConsumer({
      consumer: "post",
      machine_id: input.machine_id,
      machine: machineRef,
    });
    if (!q.ok) return base;

    const p = q.payload as {
      controller_family: string;
      accuracy_class: string;
      recommend_look_ahead_blocks_min: number;
    };

    return {
      ...base,
      quality_optimization: {
        controller_family: p.controller_family,
        accuracy_class: p.accuracy_class,
        recommend_look_ahead_blocks_min: p.recommend_look_ahead_blocks_min,
        tier: q.tier,
        score: q.score,
        source: `machine_quality_score[${q.tier}]`,
      },
    };
  }
}

export const postProcessorGeneratorEngine =
  new PostProcessorGeneratorEngine();
