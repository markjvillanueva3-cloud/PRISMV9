/**
 * MCP Completions for PRISM
 *
 * Provides autocomplete suggestions for resource URI templates
 * and prompt arguments. Essential UX for 910 machines, 94K tools,
 * and 2957 materials.
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/completion
 */

import { toolRegistry } from "../registries/ToolRegistry.js";
import { alarmRegistry } from "../registries/AlarmRegistry.js";

/** Maximum suggestions returned per completion request */
const MAX_SUGGESTIONS = 25;

/**
 * Common material names for fast autocomplete without registry lookup.
 * Covers the most frequently queried materials.
 */
const COMMON_MATERIALS = [
  "6061-T6", "7075-T6", "2024-T3", "6082-T6",
  "4140", "4340", "1045", "1018", "8620",
  "304 Stainless", "316 Stainless", "17-4 PH",
  "Ti-6Al-4V", "Inconel 718", "Inconel 625",
  "C360 Brass", "C110 Copper",
  "Acetal (Delrin)", "PEEK", "Nylon 6/6",
  "A356 Cast Aluminum", "Ductile Iron",
  "D2 Tool Steel", "H13 Tool Steel", "M2 HSS",
  "Hastelloy X", "Waspaloy", "Monel 400",
];

/**
 * Common machine names for fast autocomplete.
 */
const COMMON_MACHINES = [
  "Haas VF-2", "Haas VF-4", "Haas UMC-750",
  "Haas ST-10", "Haas ST-20",
  "DMG MORI DMU 50", "DMG MORI DMU 80",
  "DMG MORI NLX 2500", "DMG MORI CTX beta",
  "Mazak VCN-530C", "Mazak Integrex i-200",
  "Mazak QTN-200", "Mazak Variaxis i-700",
  "Okuma MB-5000H", "Okuma MU-5000V",
  "Okuma LB3000 EXII", "Okuma Multus B300",
  "Makino a51nx", "Makino D500",
  "Doosan DNM 5700", "Doosan Puma 2600",
  "Hurco VMX42i", "Brother Speedio S700X2",
  "Hermle C 42 U", "GF Mikron MILL P 500",
];

/**
 * CAM system names for tribal knowledge completions.
 */
const CAM_SYSTEMS = [
  "mastercam", "edgecam", "hypermill", "fusion360",
  "solidcam", "nx", "powermill", "esprit",
  "camworks", "topsolid", "worknc", "gibbscam",
  "bobcad", "catia", "cimatron", "tebis",
  "sprutcam", "surfcam",
];

/**
 * Operation types for prompt argument completion.
 */
const OPERATIONS = [
  "face_milling", "pocket_milling", "slotting",
  "contour_milling", "plunge_milling", "ramp_milling",
  "hsm_adaptive", "rest_machining", "finishing",
  "turning_od", "turning_id", "turning_facing",
  "turning_grooving", "turning_threading",
  "drilling", "reaming", "tapping", "boring",
  "grinding_od", "grinding_id", "grinding_surface",
  "edm_sinker", "edm_wire",
  "threading_single_point", "threading_tap",
  "deep_hole_drilling", "gun_drilling",
];

/**
 * Playbook categories for prompt completion.
 */
const PLAYBOOK_CATEGORIES = [
  "milling", "turning", "drilling", "grinding",
  "threading", "edm", "quality_inspection",
  "coolant_strategy", "adaptive", "deep_hole",
  "surface_treatment", "post_processing",
  "hard_turning", "hsm", "micro_machining",
  "hybrid_additive", "cutting_force",
  "surface_integrity", "vibration_dynamics",
  "dimensional_accuracy", "economics", "spc",
  "cross_domain", "gdt", "machine_capability",
  "failure_analysis", "thermal", "material_tip",
  "tool_life",
];

/**
 * Complete tool IDs by searching the 94K+ tool registry.
 * Uses the public search() API. Requires >= 2 chars to avoid huge scans.
 */
function completeTool(
  prefix: string
): { values: string[]; total?: number; hasMore?: boolean } {
  if (prefix.length < 2) {
    return { values: [], total: toolRegistry.size, hasMore: true };
  }
  try {
    const result = toolRegistry.search({
      query: prefix,
      limit: MAX_SUGGESTIONS,
    });
    const values = result.tools.map(t =>
      t.name ? `${t.name} (${t.id ?? ""})` : String(t.id ?? "")
    );
    return {
      values,
      total: result.total,
      hasMore: result.total > MAX_SUGGESTIONS,
    };
  } catch {
    return { values: [], total: 0 };
  }
}

/**
 * Common alarm code prefixes for fast sync autocomplete.
 * Full alarm search is async — for MCP completions (sync),
 * we provide common prefixes that cover the most-queried alarms.
 */
const COMMON_ALARM_PREFIXES = [
  "EX1004", "EX1005", "EX1010", "EX1020", "EX1050",
  "AL 100", "AL 101", "AL 102", "AL 103", "AL 109",
  "SV0401", "SV0404", "SV0410", "SV0418",
  "PS0003", "PS0091", "PS0300",
  "OT0001", "OT0500",
  "2000", "2004", "2006", "2010", "2024",
  "300", "301", "302", "303", "304",
  "1001", "1004", "1005", "1010", "1020",
  "4000", "4001", "4004", "4010",
  "6011", "6012", "6020",
  "SERVO ALARM", "OVERTRAVEL", "OVERHEAT",
  "SPINDLE ALARM", "APC ALARM", "TURRET ALARM",
];

/**
 * Complete alarm codes using static common-alarm list.
 * Sync-safe for MCP completion/complete handler.
 */
function completeAlarm(
  prefix: string
): { values: string[]; total?: number; hasMore?: boolean } {
  if (prefix.length < 1) {
    return { values: [], total: alarmRegistry.size, hasMore: true };
  }
  const values = filterSuggestions(COMMON_ALARM_PREFIXES, prefix);
  return {
    values,
    total: alarmRegistry.size,
    hasMore: true,
  };
}

/**
 * Filter and rank suggestions by prefix match.
 * Case-insensitive, returns up to MAX_SUGGESTIONS.
 */
function filterSuggestions(
  candidates: string[],
  prefix: string
): string[] {
  const lower = prefix.toLowerCase();
  const matches = candidates.filter(
    c => c.toLowerCase().includes(lower)
  );
  // Prioritize starts-with over contains
  matches.sort((a, b) => {
    const aStarts = a.toLowerCase().startsWith(lower) ? 0 : 1;
    const bStarts = b.toLowerCase().startsWith(lower) ? 0 : 1;
    return aStarts - bStarts || a.localeCompare(b);
  });
  return matches.slice(0, MAX_SUGGESTIONS);
}

/**
 * Complete a resource URI template argument.
 * Called by the MCP completion/complete handler.
 */
export function completeResourceArg(
  templateName: string,
  argName: string,
  prefix: string
): { values: string[]; total?: number; hasMore?: boolean } {
  let candidates: string[] = [];

  switch (templateName) {
    case "machine-profile":
      candidates = COMMON_MACHINES;
      break;
    case "material-properties":
      candidates = COMMON_MATERIALS;
      break;
    case "cutting-tool":
      return completeTool(prefix);
    case "alarm-decode":
      return completeAlarm(prefix);
    case "playbook-rules":
      candidates = PLAYBOOK_CATEGORIES;
      break;
    case "tribal-knowledge":
      candidates = CAM_SYSTEMS;
      break;
    default:
      return { values: [] };
  }

  const values = filterSuggestions(candidates, prefix);
  return {
    values,
    total: candidates.length,
    hasMore: values.length < candidates.length,
  };
}

/**
 * Complete a prompt argument.
 * Called by the MCP completion/complete handler.
 */
export function completePromptArg(
  promptName: string,
  argName: string,
  prefix: string
): { values: string[]; total?: number; hasMore?: boolean } {
  let candidates: string[] = [];

  switch (argName) {
    case "material":
      candidates = COMMON_MATERIALS;
      break;
    case "machine":
      candidates = COMMON_MACHINES;
      break;
    case "operation":
      candidates = OPERATIONS;
      break;
    case "controller":
      candidates = [
        "fanuc", "siemens", "haas", "mazak",
        "okuma", "heidenhain", "mitsubishi",
        "brother", "fagor",
      ];
      break;
    case "category":
      candidates = PLAYBOOK_CATEGORIES;
      break;
    default:
      return { values: [] };
  }

  const values = filterSuggestions(candidates, prefix);
  return {
    values,
    total: candidates.length,
    hasMore: values.length < candidates.length,
  };
}
