/**
 * CAMKienzleForceEngine — CAM-AI-TRAINING-MS0/U-CAMT-KIENZLE
 *
 * Kienzle cutting-force model:
 *   kc = kc1.1 × h^(-mc)            (specific cutting force, N/mm^2)
 *   Fc = kc × A                     (cutting force, N), A = h × b
 *   M  = Fc × r                     (torque, N·m), r = tool-radius m
 *   P  = (M × rpm × 2π / 60) / 1000 (spindle power, kW)
 *
 * where:
 *   h  = chip thickness per tooth (mm) — fz × sin(engagement)
 *   b  = active cutting width (mm) — depth of cut
 *   A  = chip cross-sectional area (mm^2)
 *
 * Material kc1.1 + mc are read from CAMMaterialDatabaseEngine — no
 * inlined constants here (CLAUDE.md SAFETY RAILS rule).
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import { camMaterialDatabaseEngine } from "./CAMMaterialDatabaseEngine.js";
import type { Material } from "./CAMToolLibrarySelectionEngine.js";

export interface KienzleInputs {
  material: Material;
  /** Chip thickness per tooth, mm. */
  hMm: number;
  /** Active cutting width, mm. */
  bMm: number;
  /** Tool diameter, mm. */
  toolDiameterMm: number;
  /** Spindle rpm. */
  spindleRpm: number;
  /** Number of teeth — used for total engagement count. */
  fluteCount?: number;
}

export interface KienzleResult {
  /** Specific cutting force, N/mm^2. */
  kcNMm2: number;
  /** Cutting force per tooth, N. */
  fcN: number;
  /** Total tangential force on the cutter (assumes 1 tooth in cut at a time, conservative). */
  fcTotalN: number;
  /** Torque, N·m. */
  torqueNm: number;
  /** Spindle power, kW. */
  spindlePowerKW: number;
  /** Diagnostic — kc1.1 used. */
  kc11NMm2: number;
  /** Diagnostic — Kienzle exponent mc used. */
  mc: number;
}

const H_MIN_MM = 0.001;        // physical floor — chips thinner than this don't form
const RPM_MIN = 1;             // avoid div-by-zero in power calc

export class CAMKienzleForceEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMKienzleForceEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Kienzle cutting-force model — Fc / torque / spindle power from chip geometry + material.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "compute",   description: "Compute Fc, torque, power",   actions: ["cam_kienzle_compute"] },
      { name: "kc_only",   description: "Just the kc (N/mm^2)",        actions: ["cam_kienzle_kc"] },
      { name: "power_only",description: "Just the spindle power kW",   actions: ["cam_kienzle_power"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMKienzleForceEngine", note: "use typed methods" };
  }

  /** Full Kienzle compute. */
  compute(inputs: KienzleInputs): KienzleResult | null {
    const mat = camMaterialDatabaseEngine.get(inputs.material);
    if (!mat) return null;
    const h = Math.max(H_MIN_MM, inputs.hMm);
    const b = Math.max(0, inputs.bMm);
    const dia = Math.max(0.01, inputs.toolDiameterMm);
    const rpm = Math.max(RPM_MIN, inputs.spindleRpm);

    // kc = kc1.1 × h^(-mc)
    const kc = mat.kc11NMm2 * Math.pow(h, -mat.kienzleMc);
    const A = h * b;
    const fcN = kc * A;
    // Conservative: assume 1 tooth engaged at any instant for thin chip cuts.
    const teethEngaged = Math.max(1, Math.floor((inputs.fluteCount ?? 1) / 2));
    const fcTotalN = fcN * teethEngaged;
    const rM = (dia / 2) / 1000; // mm → m
    const torqueNm = fcTotalN * rM;
    // P (W) = M × ω = M × rpm × 2π / 60. Convert to kW.
    const spindlePowerKW = (torqueNm * rpm * 2 * Math.PI / 60) / 1000;

    return {
      kcNMm2: kc,
      fcN,
      fcTotalN,
      torqueNm,
      spindlePowerKW,
      kc11NMm2: mat.kc11NMm2,
      mc: mat.kienzleMc,
    };
  }

  /** Specific cutting force only — cheap call. */
  kc_only(material: Material, hMm: number): number | null {
    const mat = camMaterialDatabaseEngine.get(material);
    if (!mat) return null;
    const h = Math.max(H_MIN_MM, hMm);
    return mat.kc11NMm2 * Math.pow(h, -mat.kienzleMc);
  }

  /** Spindle power only — cheap call. */
  power_only(inputs: KienzleInputs): number | null {
    const r = this.compute(inputs);
    return r?.spindlePowerKW ?? null;
  }
}

export const camKienzleForceEngine = new CAMKienzleForceEngine();
