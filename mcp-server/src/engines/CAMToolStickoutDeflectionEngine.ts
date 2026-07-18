/**
 * CAMToolStickoutDeflectionEngine — CAM-AI-TRAINING-MS0/U-CAMT-DEFLECTION
 *
 * Computes cantilever-beam deflection at the tool tip given stickout
 * length, tool diameter, applied force, and tool material modulus E.
 *
 * Formula: δ = F·L³ / (3·E·I), where I = π·d⁴/64
 *
 * Pure physics. No fabricated constants. E is caller-supplied (or
 * inferred from common tool materials: carbide 580 GPa, HSS 210 GPa,
 * tool steel 200 GPa).
 *
 * Returns deflection in mm + a stiffness ratio (deflection / hMm chip
 * thickness) for the kilo safety validator to gate.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

export type ToolMaterial = "carbide" | "hss" | "tool_steel" | "cobalt_hss" | "diamond_pcd";

export interface DeflectionInputs {
  stickoutMm: number;
  toolDiameterMm: number;
  /** Force at tip, N. */
  forceN: number;
  /** Optional explicit modulus E in GPa; if omitted, looked up from toolMaterial. */
  modulusGPa?: number;
  toolMaterial?: ToolMaterial;
  /** Chip thickness for ratio check (mm). */
  chipThicknessMm?: number;
}

export interface DeflectionResult {
  deflectionMm: number;
  /** Tool tip stiffness, N/mm. */
  stiffnessNmm: number;
  /** Deflection ÷ chip-thickness ratio — when chipThickness supplied. */
  deflectionToChipRatio?: number;
  /** True when deflection > 10% of chip thickness (rule of thumb). */
  unstable?: boolean;
  modulusGPa: number;
  iMm4: number;
}

const MODULUS_TABLE: Record<ToolMaterial, number> = {
  carbide:      580,
  hss:          210,
  tool_steel:   200,
  cobalt_hss:   220,
  diamond_pcd:  1050,
};

const E_MIN_GPA = 1;
const D_MIN_MM = 0.05;
const L_MIN_MM = 0.1;

export class CAMToolStickoutDeflectionEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMToolStickoutDeflectionEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Cantilever beam deflection at tool tip: δ = F·L³ / (3·E·I).",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "compute",    description: "Deflection + stiffness",       actions: ["cam_deflection_compute"] },
      { name: "max_force",  description: "Solve max F for δ ≤ limit",    actions: ["cam_deflection_max_force"] },
      { name: "moduli",     description: "Modulus E (GPa) per material", actions: ["cam_deflection_moduli"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMToolStickoutDeflectionEngine", note: "use typed methods" };
  }

  compute(inputs: DeflectionInputs): DeflectionResult {
    const E = Math.max(E_MIN_GPA, inputs.modulusGPa ?? (inputs.toolMaterial ? MODULUS_TABLE[inputs.toolMaterial] : MODULUS_TABLE.carbide));
    const d = Math.max(D_MIN_MM, inputs.toolDiameterMm);
    const L = Math.max(L_MIN_MM, inputs.stickoutMm);
    const F = Math.max(0, inputs.forceN);
    // I = π × d⁴ / 64, mm^4
    const I = Math.PI * Math.pow(d, 4) / 64;
    // δ (mm) = F (N) × L³ (mm³) / (3 × E (N/mm²) × I (mm⁴))
    // E in GPa = 1000 N/mm² → multiply by 1000
    const E_Nmm2 = E * 1000;
    const deflectionMm = (F * Math.pow(L, 3)) / (3 * E_Nmm2 * I);
    const stiffnessNmm = F > 0 ? F / deflectionMm : (3 * E_Nmm2 * I) / Math.pow(L, 3);
    const r: DeflectionResult = {
      deflectionMm,
      stiffnessNmm,
      modulusGPa: E,
      iMm4: I,
    };
    if (inputs.chipThicknessMm != null && inputs.chipThicknessMm > 0) {
      const ratio = deflectionMm / inputs.chipThicknessMm;
      r.deflectionToChipRatio = ratio;
      r.unstable = ratio > 0.10;
    }
    return r;
  }

  /** Solve F for δ ≤ allowedDeflectionMm. F_max = 3·E·I·δ / L³. */
  max_force(stickoutMm: number, toolDiameterMm: number, allowedDeflectionMm: number, modulusGPa?: number, toolMaterial?: ToolMaterial): number {
    const E = Math.max(E_MIN_GPA, modulusGPa ?? (toolMaterial ? MODULUS_TABLE[toolMaterial] : MODULUS_TABLE.carbide));
    const d = Math.max(D_MIN_MM, toolDiameterMm);
    const L = Math.max(L_MIN_MM, stickoutMm);
    const I = Math.PI * Math.pow(d, 4) / 64;
    return (3 * E * 1000 * I * Math.max(0, allowedDeflectionMm)) / Math.pow(L, 3);
  }

  moduli(): Readonly<Record<ToolMaterial, number>> {
    return MODULUS_TABLE;
  }
}

export const camToolStickoutDeflectionEngine = new CAMToolStickoutDeflectionEngine();
