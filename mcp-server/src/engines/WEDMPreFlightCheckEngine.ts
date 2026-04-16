/**
 * PRISM Manufacturing Intelligence — WEDM Pre-Flight Safety Checklist Engine
 *
 * Generates a dynamic pre-flight checklist that operators must acknowledge
 * before running a PRISM-generated wire EDM program. Checklist items are
 * context-sensitive based on material, thickness, taper, wire type, and
 * submerged/flush mode.
 *
 * This is a HUMAN verification gate — not machine I/O.
 * Active interlocks require machine integration (INFRA scope).
 *
 * @version 1.0.0
 * @module WEDMPreFlightCheckEngine
 */

import { log } from "../utils/Logger.js";
import { prismIntelligence, type AIReasoningResult, type AIReasoningDomain } from "./PRISMIntelligenceLayer.js";

// ============================================================================
// TYPES
// ============================================================================

export type CheckSeverity = "critical" | "warning" | "info";
export type CheckCategory =
  | "machine_ready"
  | "workpiece"
  | "wire_path"
  | "dielectric"
  | "safety_equipment"
  | "program_verify"
  | "environment";

export interface PreFlightCheckItem {
  id: string;
  category: CheckCategory;
  severity: CheckSeverity;
  description: string;
  reason: string;
  /** Operator must check this off before proceeding */
  requires_acknowledgement: boolean;
}

export interface PreFlightInput {
  material: string;
  thickness_mm: number;
  wire_type?: string;
  wire_diameter_mm?: number;
  taper_angle_deg?: number;
  submerged?: boolean;
  flush_pressure_bar?: number;
  hardness_hrc?: number;
  controller?: string;
  num_profiles?: number;
  estimated_time_min?: number;
  /** If true, include long-run checks for jobs > 2 hours */
  is_unattended?: boolean;
}

export interface PreFlightResult {
  checklist: PreFlightCheckItem[];
  total_items: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  categories: CheckCategory[];
  /** HTML-formatted checklist for printing */
  html: string;
  /** One-line summary */
  summary: string;
}

// ============================================================================
// CHECKLIST BUILDERS
// ============================================================================

function machineReadyChecks(input: PreFlightInput): PreFlightCheckItem[] {
  const items: PreFlightCheckItem[] = [
    {
      id: "MR-01",
      category: "machine_ready",
      severity: "critical",
      description: "Verify machine power is ON and controller is in READY state",
      reason: "Machine must be fully initialized before loading program",
      requires_acknowledgement: true,
    },
    {
      id: "MR-02",
      category: "machine_ready",
      severity: "critical",
      description: "Confirm emergency stop buttons are functional (press and release test)",
      reason: "E-stop is the primary safety device — must be verified every shift",
      requires_acknowledgement: true,
    },
    {
      id: "MR-03",
      category: "machine_ready",
      severity: "critical",
      description: "Verify tank interlock switches are engaged and functional",
      reason: "Tank interlocks prevent operation with open doors — fire/splash risk",
      requires_acknowledgement: true,
    },
    {
      id: "MR-04",
      category: "machine_ready",
      severity: "warning",
      description: "Check axis home positions — run reference cycle if machine was powered off",
      reason: "Incorrect home position causes crash or off-position cuts",
      requires_acknowledgement: true,
    },
  ];

  if (input.taper_angle_deg && input.taper_angle_deg > 0) {
    items.push({
      id: "MR-05",
      category: "machine_ready",
      severity: "critical",
      description: `Verify U/V axis travel is sufficient for ${input.taper_angle_deg.toFixed(1)}° taper at ${input.thickness_mm}mm thickness`,
      reason: "Insufficient U/V travel will cause taper cut to stall or produce incorrect angle",
      requires_acknowledgement: true,
    });
  }

  return items;
}

function workpieceChecks(input: PreFlightInput): PreFlightCheckItem[] {
  const items: PreFlightCheckItem[] = [
    {
      id: "WP-01",
      category: "workpiece",
      severity: "critical",
      description: "Confirm workpiece is securely clamped and cannot shift during cutting",
      reason: "Workpiece movement causes wire break and dimensional errors",
      requires_acknowledgement: true,
    },
    {
      id: "WP-02",
      category: "workpiece",
      severity: "critical",
      description: `Verify workpiece material is ${input.material} and thickness is ${input.thickness_mm.toFixed(1)}mm (±0.5mm)`,
      reason: "Wrong material or thickness causes incorrect cutting parameters and possible wire break",
      requires_acknowledgement: true,
    },
    {
      id: "WP-03",
      category: "workpiece",
      severity: "warning",
      description: "Check workpiece surface for burrs, scale, or contaminants — clean if necessary",
      reason: "Surface contamination affects wire threading and initial cut quality",
      requires_acknowledgement: true,
    },
  ];

  if (input.thickness_mm > 100) {
    items.push({
      id: "WP-04",
      category: "workpiece",
      severity: "warning",
      description: `Thick workpiece (${input.thickness_mm}mm): verify flush nozzle alignment on both sides`,
      reason: "Thick sections need precise flush alignment to prevent wire deflection and breakage",
      requires_acknowledgement: true,
    });
  }

  if (input.hardness_hrc && input.hardness_hrc > 55) {
    items.push({
      id: "WP-05",
      category: "workpiece",
      severity: "info",
      description: `High hardness (${input.hardness_hrc} HRC): expect slower cutting and increased wire consumption`,
      reason: "Hard materials reduce cutting speed; plan for extended run time",
      requires_acknowledgement: false,
    });
  }

  return items;
}

function wirePathChecks(input: PreFlightInput): PreFlightCheckItem[] {
  const wireDia = input.wire_diameter_mm ?? 0.25;
  const wireType = input.wire_type ?? "brass_0.25";

  const items: PreFlightCheckItem[] = [
    {
      id: "WR-01",
      category: "wire_path",
      severity: "critical",
      description: `Verify wire spool is loaded: ${wireType} (Ø${wireDia}mm)`,
      reason: "Wrong wire type or diameter causes incorrect offsets and potential breakage",
      requires_acknowledgement: true,
    },
    {
      id: "WR-02",
      category: "wire_path",
      severity: "critical",
      description: "Check wire tension setting matches program requirements",
      reason: "Incorrect tension causes wire wander (too loose) or breakage (too tight)",
      requires_acknowledgement: true,
    },
    {
      id: "WR-03",
      category: "wire_path",
      severity: "warning",
      description: "Verify wire spool has sufficient wire for estimated job duration",
      reason: "Mid-job wire spool change may affect cut quality at splice point",
      requires_acknowledgement: true,
    },
    {
      id: "WR-04",
      category: "wire_path",
      severity: "warning",
      description: "Inspect wire guides and contacts for wear — replace if grooved or contaminated",
      reason: "Worn guides cause wire positioning errors and increased breakage",
      requires_acknowledgement: true,
    },
  ];

  const isCarbideMaterial = /carbide|wc/i.test(input.material);
  if (isCarbideMaterial && !/coated|zinc|moly/i.test(wireType)) {
    items.push({
      id: "WR-05",
      category: "wire_path",
      severity: "critical",
      description: "CARBIDE workpiece detected — coated wire (zinc or moly) is strongly recommended",
      reason: "Brass wire breaks frequently on carbide; coated wire reduces break rate by 60-80%",
      requires_acknowledgement: true,
    });
  }

  return items;
}

function dielectricChecks(input: PreFlightInput): PreFlightCheckItem[] {
  const items: PreFlightCheckItem[] = [
    {
      id: "DI-01",
      category: "dielectric",
      severity: "critical",
      description: "Verify dielectric fluid level is above minimum mark",
      reason: "Low dielectric level exposes workpiece — fire risk and poor flushing",
      requires_acknowledgement: true,
    },
    {
      id: "DI-02",
      category: "dielectric",
      severity: "warning",
      description: "Check dielectric water resistivity (target: 5–15 MΩ·cm for finish cuts)",
      reason: "Low resistivity causes unstable spark gap; high resistivity reduces cutting speed",
      requires_acknowledgement: true,
    },
    {
      id: "DI-03",
      category: "dielectric",
      severity: "warning",
      description: "Verify dielectric filter condition — replace if pressure drop exceeds 50%",
      reason: "Clogged filter reduces flushing effectiveness and causes wire breaks",
      requires_acknowledgement: true,
    },
  ];

  if (input.submerged !== false) {
    items.push({
      id: "DI-04",
      category: "dielectric",
      severity: "critical",
      description: "Submerged cutting: verify tank can fill to required level above workpiece top",
      reason: "Insufficient submersion causes uneven cooling and surface finish variation",
      requires_acknowledgement: true,
    });
  }

  if (input.flush_pressure_bar && input.flush_pressure_bar > 10) {
    items.push({
      id: "DI-05",
      category: "dielectric",
      severity: "warning",
      description: `High flush pressure (${input.flush_pressure_bar} bar): ensure workpiece clamping can resist flushing force`,
      reason: "High pressure flush can shift light or thin workpieces",
      requires_acknowledgement: true,
    });
  }

  return items;
}

function safetyEquipmentChecks(_input: PreFlightInput): PreFlightCheckItem[] {
  return [
    {
      id: "SE-01",
      category: "safety_equipment",
      severity: "critical",
      description: "Fire suppression system is armed and indicator shows GREEN",
      reason: "Wire EDM uses flammable dielectric — fire suppression is mandatory",
      requires_acknowledgement: true,
    },
    {
      id: "SE-02",
      category: "safety_equipment",
      severity: "warning",
      description: "Safety glasses available at machine for wire handling and tank opening",
      reason: "Wire ends are sharp; dielectric splash during tank operations",
      requires_acknowledgement: false,
    },
    {
      id: "SE-03",
      category: "safety_equipment",
      severity: "warning",
      description: "Cut-resistant gloves available for wire threading and slug removal",
      reason: "Wire and cut slugs have sharp edges",
      requires_acknowledgement: false,
    },
  ];
}

function programVerifyChecks(input: PreFlightInput): PreFlightCheckItem[] {
  const items: PreFlightCheckItem[] = [
    {
      id: "PV-01",
      category: "program_verify",
      severity: "critical",
      description: "Dry-run the program with power OFF to verify wire path clears workpiece and clamps",
      reason: "Collision with clamps or fixtures causes machine damage and wire break",
      requires_acknowledgement: true,
    },
    {
      id: "PV-02",
      category: "program_verify",
      severity: "warning",
      description: "Verify work coordinate offset (G54/G92) matches actual workpiece position",
      reason: "Wrong offset causes cut in wrong location — potential scrap",
      requires_acknowledgement: true,
    },
    {
      id: "PV-03",
      category: "program_verify",
      severity: "warning",
      description: "Confirm start hole position is accessible and wire can thread through",
      reason: "Blocked or misaligned start hole prevents wire threading",
      requires_acknowledgement: true,
    },
  ];

  if (input.num_profiles && input.num_profiles > 1) {
    items.push({
      id: "PV-04",
      category: "program_verify",
      severity: "info",
      description: `Multi-profile job (${input.num_profiles} profiles): verify all start holes are drilled and accessible`,
      reason: "Missing start holes will cause wire threading failure between profiles",
      requires_acknowledgement: true,
    });
  }

  return items;
}

function environmentChecks(input: PreFlightInput): PreFlightCheckItem[] {
  const items: PreFlightCheckItem[] = [];

  if (input.is_unattended) {
    items.push(
      {
        id: "ENV-01",
        category: "environment",
        severity: "critical",
        description: "Unattended operation: verify automatic wire threading (AWT) is enabled and tested",
        reason: "Without AWT, wire break during unattended operation halts job with no recovery",
        requires_acknowledgement: true,
      },
      {
        id: "ENV-02",
        category: "environment",
        severity: "critical",
        description: "Unattended operation: verify fire suppression auto-trigger is armed",
        reason: "No operator present to respond to fire — auto-suppression is mandatory",
        requires_acknowledgement: true,
      },
      {
        id: "ENV-03",
        category: "environment",
        severity: "warning",
        description: "Unattended operation: ensure shop lighting remains on for security cameras",
        reason: "Video monitoring of unattended operations is best practice",
        requires_acknowledgement: false,
      },
    );
  }

  if (input.estimated_time_min && input.estimated_time_min > 120) {
    items.push({
      id: "ENV-04",
      category: "environment",
      severity: "info",
      description: `Long run (${(input.estimated_time_min / 60).toFixed(1)} hours): plan for wire spool check and dielectric level monitoring`,
      reason: "Extended runs consume wire and reduce dielectric level — periodic checks prevent mid-job failures",
      requires_acknowledgement: false,
    });
  }

  const isTitanium = /titanium|ti-6al/i.test(input.material);
  if (isTitanium) {
    items.push({
      id: "ENV-05",
      category: "environment",
      severity: "critical",
      description: "TITANIUM: increased fire risk — verify fire suppression is armed, keep shop ventilated",
      reason: "Titanium swarf and fine particles are flammable; alpha-case forms on cut surfaces",
      requires_acknowledgement: true,
    });
  }

  return items;
}

// ============================================================================
// HTML GENERATOR
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateHtml(checklist: PreFlightCheckItem[], input: PreFlightInput): string {
  const severityColor: Record<CheckSeverity, string> = {
    critical: "#dc2626",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  const categoryLabel: Record<CheckCategory, string> = {
    machine_ready: "Machine Readiness",
    workpiece: "Workpiece Verification",
    wire_path: "Wire Path & Spool",
    dielectric: "Dielectric System",
    safety_equipment: "Safety Equipment",
    program_verify: "Program Verification",
    environment: "Environment & Monitoring",
  };

  const categories = [...new Set(checklist.map(c => c.category))] as CheckCategory[];

  const sections = categories.map(cat => {
    const items = checklist.filter(c => c.category === cat);
    const rows = items.map(item => {
      const color = severityColor[item.severity];
      const check = item.requires_acknowledgement ? "☐" : "✓";
      return `<tr>
        <td style="font-size:18px;text-align:center;width:30px">${check}</td>
        <td style="color:${color};font-weight:bold;width:60px">${item.severity.toUpperCase()}</td>
        <td>${escapeHtml(item.description)}</td>
      </tr>`;
    }).join("\n");

    return `<h3 style="margin-top:16px;border-bottom:1px solid #ccc;padding-bottom:4px">${categoryLabel[cat]}</h3>
<table style="width:100%;border-collapse:collapse;font-size:12px">
${rows}
</table>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>WEDM Pre-Flight Checklist — ${escapeHtml(input.material)} ${input.thickness_mm}mm</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; }
  h1 { font-size: 18px; }
  h3 { font-size: 14px; color: #1e3a5f; }
  table { margin-bottom: 12px; }
  td { padding: 4px 8px; vertical-align: top; border-bottom: 1px solid #eee; }
  .sig { margin-top: 24px; border-top: 2px solid #000; padding-top: 12px; }
</style>
</head><body>
<h1>WEDM Pre-Flight Safety Checklist</h1>
<p><strong>Material:</strong> ${escapeHtml(input.material)} | <strong>Thickness:</strong> ${input.thickness_mm}mm | <strong>Wire:</strong> ${escapeHtml(input.wire_type ?? "brass_0.25")}</p>
${sections}
<div class="sig">
  <p><strong>Operator Signature:</strong> _________________________ <strong>Date:</strong> ____________</p>
  <p><strong>Supervisor (if unattended):</strong> _________________________ <strong>Date:</strong> ____________</p>
</div>
</body></html>`;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class WEDMPreFlightCheckEngine {
  /**
   * Generate a dynamic pre-flight safety checklist for a WEDM job.
   *
   * @param input - Job parameters that determine which checklist items apply
   * @returns PreFlightResult with checklist items, counts, and printable HTML
   */
  generateChecklist(input: PreFlightInput): PreFlightResult {
    log.info(`[WEDMPreFlight] Generating checklist for ${input.material}, ${input.thickness_mm}mm`);

    const checklist: PreFlightCheckItem[] = [
      ...machineReadyChecks(input),
      ...workpieceChecks(input),
      ...wirePathChecks(input),
      ...dielectricChecks(input),
      ...safetyEquipmentChecks(input),
      ...programVerifyChecks(input),
      ...environmentChecks(input),
    ];

    const critical_count = checklist.filter(c => c.severity === "critical").length;
    const warning_count = checklist.filter(c => c.severity === "warning").length;
    const info_count = checklist.filter(c => c.severity === "info").length;
    const categories = [...new Set(checklist.map(c => c.category))] as CheckCategory[];

    const html = generateHtml(checklist, input);

    const summary = `Pre-flight checklist: ${checklist.length} items (${critical_count} critical, ${warning_count} warning, ${info_count} info) across ${categories.length} categories`;

    log.info(`[WEDMPreFlight] ${summary}`);

    return {
      checklist,
      total_items: checklist.length,
      critical_count,
      warning_count,
      info_count,
      categories,
      html,
      summary,
    };
  }

  /**
   * AI-enhanced pre-flight checklist with intelligent risk assessment.
   * Uses PRISMIntelligenceLayer for Claude Opus-level reasoning about
   * safety considerations specific to the job.
   *
   * @param input - Job parameters
   * @returns Enhanced result with AI insights and risk assessment
   */
  async generateChecklistWithAI(input: PreFlightInput): Promise<PreFlightResult & {
    ai_risk_assessment: {
      overall_risk: "low" | "medium" | "high" | "critical";
      risk_factors: string[];
      ai_recommendations: string[];
      confidence: number;
    };
  }> {
    // Generate base checklist
    const baseResult = this.generateChecklist(input);

    // Get AI reasoning for risk assessment
    const aiResult = await this.getWEDMRiskReasoning(input);

    // Determine overall risk level based on material, thickness, and conditions
    let overall_risk: "low" | "medium" | "high" | "critical" = "low";
    const risk_factors: string[] = [];
    const ai_recommendations: string[] = [];

    // Material-based risk
    if (input.material?.toLowerCase().includes("carbide") || input.material?.toLowerCase().includes("wc")) {
      risk_factors.push("Carbide material: increased wire break risk, requires coated wire");
      overall_risk = "medium";
    }
    if (input.material?.toLowerCase().includes("titanium") || input.material?.toLowerCase().includes("ti")) {
      risk_factors.push("Titanium: fire risk above 400°C, requires submerged cutting");
      overall_risk = "high";
    }
    if (input.material?.toLowerCase().includes("magnesium") || input.material?.toLowerCase().includes("mg")) {
      risk_factors.push("Magnesium: EXTREME fire/explosion risk — requires special procedures");
      overall_risk = "critical";
    }

    // Thickness-based risk
    if (input.thickness_mm > 100) {
      risk_factors.push(`Thick section (${input.thickness_mm}mm): flushing degradation, wire break risk`);
      ai_recommendations.push("Increase flush pressure to 8-10 bar for thick section");
      if (overall_risk === "low") overall_risk = "medium";
    }
    if (input.thickness_mm > 200) {
      risk_factors.push(`Very thick (${input.thickness_mm}mm): may exceed practical wire EDM limits`);
      overall_risk = "high";
    }

    // Taper risk
    if (input.taper_angle_deg && input.taper_angle_deg > 10) {
      risk_factors.push(`High taper (${input.taper_angle_deg}°): accuracy degrades, verify UV travel`);
      if (overall_risk === "low") overall_risk = "medium";
    }

    // Unattended operation risk
    if (input.is_unattended && input.estimated_time_min && input.estimated_time_min > 120) {
      risk_factors.push("Unattended operation >2 hours: verify wire spool capacity and AWT function");
      ai_recommendations.push("Check wire remaining on spool — minimum 150m for overnight runs");
      ai_recommendations.push("Verify AWT retry limit is set to 3 with 2mm backup");
    }

    // Add AI-generated recommendations if available
    if (aiResult) {
      if (aiResult.insights) {
        ai_recommendations.push(...aiResult.insights.slice(0, 3));
      }
    }

    // Elevate risk if many critical checklist items
    if (baseResult.critical_count > 10 && overall_risk === "low") {
      overall_risk = "medium";
    }

    log.info(`[WEDMPreFlight] AI risk assessment: ${overall_risk} (${risk_factors.length} factors)`);

    return {
      ...baseResult,
      ai_risk_assessment: {
        overall_risk,
        risk_factors,
        ai_recommendations,
        confidence: aiResult?.confidence ?? 0.85,
      },
    };
  }

  /**
   * Get AI reasoning for WEDM risk assessment.
   */
  private async getWEDMRiskReasoning(input: PreFlightInput): Promise<AIReasoningResult | undefined> {
    try {
      const result = await prismIntelligence.reason({
        domain: "wedm_safety_analysis" as AIReasoningDomain,
        intent: "Assess safety risks for this Wire EDM job and recommend mitigations",
        context: {
          material: input.material,
          thickness_mm: input.thickness_mm,
          taper_angle_deg: input.taper_angle_deg,
          wire_type: input.wire_type,
          is_unattended: input.is_unattended,
          estimated_time_min: input.estimated_time_min,
        },
        options: {
          temperature: 0.2,
          maxTokens: 500,
        },
      });
      return result;
    } catch (error) {
      log.warn(`[WEDMPreFlight] AI reasoning failed: ${error}`);
      return undefined;
    }
  }

  /**
   * Query tribal knowledge for WEDM safety tips relevant to this job.
   */
  async queryTribalKnowledgeForSafety(input: PreFlightInput): Promise<string[]> {
    try {
      const result = await prismIntelligence.reason({
        domain: "wedm_hazard_prevention" as AIReasoningDomain,
        intent: "Find relevant safety tips from tribal knowledge for this WEDM job",
        context: {
          material: input.material,
          thickness_mm: input.thickness_mm,
          taper_angle_deg: input.taper_angle_deg,
        },
        options: { temperature: 0.1 },
      });
      return result?.insights ?? [];
    } catch {
      return [];
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmPreFlightCheckEngine = new WEDMPreFlightCheckEngine();
