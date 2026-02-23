/**
 * PRISM MCP Server - Diagnostics Engine (split from IntelligenceEngine R3)
 *
 * Contains failure diagnosis with symptom matching, alarm code lookup,
 * and physics cross-checking. Includes the FAILURE_MODES knowledge base.
 *
 * Functions:
 *   failureDiagnose()  - Failure root cause analysis
 * Constants:
 *   FAILURE_MODES       - Knowledge base of 7 machining failure modes
 */

import {
  calculateTaylorToolLife,
  type TaylorCoefficients,
  getDefaultTaylor,
} from "./ManufacturingCalculations.js";

import { registryManager } from "../registries/manager.js";
import { log } from "../utils/Logger.js";

import {
  mapIsoToTaylorGroup,
} from "./IntelligenceShared.js";

// ============================================================================
// FAILURE KNOWLEDGE BASE
// ============================================================================

/** Knowledge base of common machining failure modes with symptoms, causes, and remedies. */
export const FAILURE_MODES: Array<{
  id: string;
  name: string;
  keywords: string[];
  root_causes: string[];
  remedies: string[];
  severity: "low" | "medium" | "high" | "critical";
}> = [
  {
    id: "chatter",
    name: "Regenerative Chatter",
    keywords: ["chatter", "vibration", "noise", "waviness", "marks", "surface marks", "harmonics"],
    root_causes: [
      "Spindle speed in unstable lobe region",
      "Excessive axial or radial depth of cut",
      "Low system rigidity (long overhang, weak workholding)",
      "Incorrect number of flutes for engagement",
    ],
    remedies: [
      "Adjust spindle speed to stable lobe (use stability lobe diagram)",
      "Reduce axial depth of cut by 30-50%",
      "Reduce tool overhang or use shrink-fit holder",
      "Switch to variable-pitch or variable-helix cutter",
      "Increase radial engagement to dampen (trochoidal not always better)",
    ],
    severity: "high",
  },
  {
    id: "premature_wear",
    name: "Premature Tool Wear",
    keywords: ["tool wear", "short life", "premature", "wear", "flank wear", "crater", "edge breakdown"],
    root_causes: [
      "Cutting speed too high (operating past Taylor knee)",
      "Insufficient coolant flow or wrong coolant type",
      "Wrong tool coating for material group",
      "Built-up edge due to low speed on sticky material",
    ],
    remedies: [
      "Reduce cutting speed by 15-25%",
      "Verify coolant concentration and flow rate",
      "Switch to AlTiN coating for high-temp alloys, TiAlN for steels",
      "For BUE: increase cutting speed or use positive rake geometry",
    ],
    severity: "high",
  },
  {
    id: "tool_breakage",
    name: "Tool Breakage",
    keywords: ["breakage", "broken", "snap", "catastrophic", "fracture", "shatter"],
    root_causes: [
      "Chip load too high for tool geometry",
      "Interrupted cut shock on brittle substrate",
      "Chip packing in deep slot or pocket",
      "Incorrect tool path — full-width slotting at excessive feed",
    ],
    remedies: [
      "Reduce feed per tooth to stay within chip load limits",
      "Use tougher substrate (micro-grain carbide) for interrupted cuts",
      "Ensure chip evacuation via air blast or through-spindle coolant",
      "Use trochoidal or peel milling instead of full-width slotting",
    ],
    severity: "critical",
  },
  {
    id: "poor_surface_finish",
    name: "Poor Surface Finish",
    keywords: ["surface", "rough", "finish", "Ra", "roughness", "scratches", "scallop"],
    root_causes: [
      "Feed per tooth too high for finishing pass",
      "Worn or chipped cutting edge",
      "Tool runout exceeding tolerance",
      "Nose radius too small for required Ra",
    ],
    remedies: [
      "Reduce feed per tooth for finishing (typically fz < 0.05 mm)",
      "Inspect and replace tool insert",
      "Measure runout with DTI — should be < 5 μm for finishing",
      "Use wiper insert or larger nose radius (Ra ∝ fz²/(32×r))",
    ],
    severity: "medium",
  },
  {
    id: "dimensional_error",
    name: "Dimensional Inaccuracy",
    keywords: ["dimension", "tolerance", "oversize", "undersize", "inaccurate", "drift", "deviation"],
    root_causes: [
      "Tool deflection under cutting force",
      "Thermal growth of spindle or workpiece",
      "Backlash in machine axes",
      "Incorrect tool offset or worn tool geometry",
    ],
    remedies: [
      "Reduce radial depth or use shorter tool assembly",
      "Allow machine warm-up cycle; use coolant to control temperature",
      "Calibrate axis backlash compensation",
      "Re-measure tool with presetter; update offset in controller",
    ],
    severity: "high",
  },
  {
    id: "chip_issues",
    name: "Poor Chip Control",
    keywords: ["chip", "birds nest", "stringy", "clogging", "packing", "evacuation", "long chips"],
    root_causes: [
      "Feed too low for material (thin chips curl poorly)",
      "Wrong chipbreaker geometry for material ductility",
      "Insufficient coolant pressure for chip evacuation",
      "Deep pocket with no chip exit path",
    ],
    remedies: [
      "Increase feed per tooth to produce thicker, breakable chips",
      "Use insert with aggressive chipbreaker for ductile materials",
      "Switch to through-spindle coolant (TSC) at ≥40 bar",
      "Program peck cycles or helical ramp entry for deep features",
    ],
    severity: "medium",
  },
  {
    id: "thermal_damage",
    name: "Thermal Damage / Burns",
    keywords: ["burn", "heat", "thermal", "discoloration", "white layer", "heat affected", "blue"],
    root_causes: [
      "Cutting speed too high for material thermal conductivity",
      "Dwell at bottom of hole or pocket corner",
      "Dry machining of heat-sensitive material",
      "Re-cutting chips that carry heat back into cut zone",
    ],
    remedies: [
      "Reduce cutting speed by 20-30%",
      "Eliminate dwell: use constant feed through corners",
      "Apply flood or MQL coolant — never dry-cut titanium/Inconel",
      "Improve chip evacuation to prevent re-cutting",
    ],
    severity: "high",
  },
];

// ============================================================================
// FAILURE DIAGNOSIS
// ============================================================================

/**
 * Diagnose root cause of a machining failure from symptoms and/or alarm codes.
 *
 * Two input modes:
 *   1. Symptom-based: pass `symptoms` array — matches against 7 failure mode KB
 *   2. Alarm-based: pass `alarm_code` + `controller` — decodes via AlarmRegistry (9,200+ codes)
 *   3. Combined: both inputs are merged into a unified diagnosis
 *
 * @param params.symptoms     - Array of symptom strings or comma-separated string
 * @param params.alarm_code   - Alarm code (e.g. "445", "SV0401", "2024")
 * @param params.controller   - Controller family (e.g. "FANUC", "SIEMENS", "HAAS")
 * @param params.material     - Optional material name for context
 * @param params.operation    - Optional operation type (roughing, finishing, etc.)
 * @param params.parameters   - Optional current cutting parameters for physics cross-check
 * IMPLEMENTED R3-MS0 (alarm integration added R3-MS0 hardening)
 */
export async function failureDiagnose(params: Record<string, any>): Promise<any> {
  // At least one of symptoms or alarm_code must be provided
  if (!params.symptoms && !params.alarm_code) {
    throw new Error(
      '[IntelligenceEngine] failure_diagnose: at least one of "symptoms" or "alarm_code" is required'
    );
  }

  // Normalize symptoms to string array
  let symptoms: string[] = [];
  if (params.symptoms) {
    symptoms = Array.isArray(params.symptoms)
      ? params.symptoms
      : String(params.symptoms).split(",").map((s: string) => s.trim());
  }
  symptoms = symptoms.map((s: string) => s.toLowerCase());

  // -- Alarm code lookup via AlarmRegistry --
  let alarmResult: any = undefined;
  if (params.alarm_code) {
    const controller = params.controller || "FANUC"; // default to most common
    try {
      const alarm = await registryManager.alarms.decode(controller, String(params.alarm_code));
      if (alarm) {
        alarmResult = {
          alarm_id: alarm.alarm_id,
          code: alarm.code,
          name: alarm.name,
          controller_family: alarm.controller_family,
          category: alarm.category,
          severity: alarm.severity,
          description: alarm.description,
          causes: alarm.causes,
          quick_fix: alarm.quick_fix,
          requires_power_cycle: alarm.requires_power_cycle,
          fix_procedures: alarm.fix_procedures?.map((fp: any) => ({
            step: fp.step,
            action: fp.action,
            details: fp.details,
            safety_warning: fp.safety_warning,
            skill_level: fp.skill_level,
          })),
          related_alarms: alarm.related_alarms,
        };

        // Inject alarm causes as additional symptoms for failure mode matching
        if (alarm.causes) {
          for (const cause of alarm.causes) {
            symptoms.push(cause.toLowerCase());
          }
        }
        // Inject alarm category as a symptom keyword
        if (alarm.category) {
          symptoms.push(alarm.category.toLowerCase());
        }
      } else {
        // Alarm not found — search by query as fallback
        const searchResult = await registryManager.alarms.search({
          query: String(params.alarm_code),
          controller,
          limit: 3,
        });
        if (searchResult.alarms.length > 0) {
          alarmResult = {
            note: "Exact code not found, showing closest matches",
            matches: searchResult.alarms.map((a: any) => ({
              code: a.code,
              name: a.name,
              category: a.category,
              description: a.description,
            })),
          };
        } else {
          alarmResult = {
            note: `Alarm code "${params.alarm_code}" not found for controller ${controller}`,
          };
        }
      }
    } catch (err: any) {
      log.warn(`[IntelligenceEngine] failure_diagnose: alarm lookup failed: ${err.message}`);
      alarmResult = { error: `Alarm lookup failed: ${err.message}` };
    }
  }

  // Score each failure mode against symptoms
  const scored = FAILURE_MODES.map((mode) => {
    let matchCount = 0;
    const matchedKeywords: string[] = [];
    for (const symptom of symptoms) {
      for (const kw of mode.keywords) {
        if (symptom.includes(kw) || kw.includes(symptom)) {
          matchCount++;
          matchedKeywords.push(kw);
          break; // one match per symptom
        }
      }
    }
    const relevance = symptoms.length > 0 ? matchCount / symptoms.length : 0;
    return { ...mode, matchCount, matchedKeywords, relevance };
  });

  // Filter and sort by relevance
  const matches = scored
    .filter((m) => m.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || (b.severity === "critical" ? 1 : 0) - (a.severity === "critical" ? 1 : 0));

  // Optional physics cross-check if parameters are provided
  let physicsCheck: any = undefined;
  if (params.parameters && params.material) {
    try {
      const p = params.parameters;
      let mat: any;
      try { mat = await registryManager.materials.getByIdOrName(params.material); } catch { /* skip */ }
      const isoGroup = mat?.iso_group || mat?.classification?.iso_group || "P";
      const taylorCoeffs = mat?.taylor?.C
        ? { C: mat.taylor.C, n: mat.taylor.n }
        : getDefaultTaylor(mapIsoToTaylorGroup(isoGroup));

      if (p.cutting_speed) {
        const tl = calculateTaylorToolLife(p.cutting_speed, taylorCoeffs, p.feed_per_tooth, p.axial_depth);
        physicsCheck = {
          estimated_tool_life_min: tl.tool_life_minutes,
          taylor_warnings: tl.warnings,
        };
        if (p.cutting_speed > taylorCoeffs.C * 0.85) {
          physicsCheck.speed_warning = `Cutting speed ${p.cutting_speed} is within 15% of Taylor C=${taylorCoeffs.C} — operating near cliff edge`;
        }
      }
    } catch (err: any) {
      log.warn(`[IntelligenceEngine] failure_diagnose: physics cross-check failed: ${err.message}`);
    }
  }

  log.info(`[IntelligenceEngine] failure_diagnose: ${symptoms.length} symptoms → ${matches.length} mode matches`);

  return {
    symptoms_analyzed: symptoms,
    diagnoses: matches.map((m) => ({
      id: m.id,
      name: m.name,
      relevance: Math.round(m.relevance * 100) / 100,
      severity: m.severity,
      matched_keywords: m.matchedKeywords,
      root_causes: m.root_causes,
      remedies: m.remedies,
    })),
    alarm: alarmResult,
    physics_cross_check: physicsCheck,
    total_modes_checked: FAILURE_MODES.length,
  };
}
