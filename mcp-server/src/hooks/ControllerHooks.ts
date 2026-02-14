/**
 * PRISM MCP Server - Controller-Specific Hooks
 * Session 6.2 Enhancement: Controller Family Validation
 * 
 * Hooks for controller-specific validation:
 * - FANUC alarm/G-code validation
 * - SIEMENS alarm/G-code validation  
 * - HAAS alarm/G-code validation
 * - MAZAK alarm/G-code validation
 * - Controller capability validation
 * - G-code dialect differences
 * - Parameter range validation
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
  hookWarning
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// CONTROLLER DEFINITIONS
// ============================================================================

// Alarm code ranges by controller family
const ALARM_CODE_RANGES: Record<string, Array<{
  category: string;
  prefix?: string;
  rangeStart: number;
  rangeEnd: number;
  description: string;
}>> = {
  FANUC: [
    { category: "PS", prefix: "PS", rangeStart: 0, rangeEnd: 999, description: "Program/sequence errors" },
    { category: "SV", prefix: "SV", rangeStart: 0, rangeEnd: 999, description: "Servo alarms" },
    { category: "OT", prefix: "OT", rangeStart: 0, rangeEnd: 999, description: "Overtravel/stroke limits" },
    { category: "IO", prefix: "IO", rangeStart: 0, rangeEnd: 999, description: "I/O errors" },
    { category: "SR", prefix: "SR", rangeStart: 0, rangeEnd: 999, description: "Serial spindle alarms" },
    { category: "SP", prefix: "SP", rangeStart: 0, rangeEnd: 999, description: "Spindle alarms" },
    { category: "MC", prefix: "MC", rangeStart: 0, rangeEnd: 999, description: "PMC system alarms" },
    { category: "BG", prefix: "BG", rangeStart: 0, rangeEnd: 999, description: "Background edit errors" },
    { category: "SW", prefix: "SW", rangeStart: 0, rangeEnd: 999, description: "System/software alarms" },
    { category: "DS", prefix: "DS", rangeStart: 0, rangeEnd: 999, description: "Data server alarms" },
    { category: "PC", prefix: "PC", rangeStart: 0, rangeEnd: 999, description: "PMC ladder alarms" },
    { category: "EX", rangeStart: 1000, rangeEnd: 9999, description: "External/OEM alarms" }
  ],
  HAAS: [
    { category: "SYSTEM", rangeStart: 100, rangeEnd: 199, description: "System alarms" },
    { category: "AXIS", rangeStart: 200, rangeEnd: 299, description: "Axis/servo alarms" },
    { category: "SPINDLE", rangeStart: 300, rangeEnd: 399, description: "Spindle alarms" },
    { category: "ATC", rangeStart: 400, rangeEnd: 499, description: "Tool changer alarms" },
    { category: "PROGRAM", rangeStart: 500, rangeEnd: 599, description: "Program errors" },
    { category: "OVERTRAVEL", rangeStart: 600, rangeEnd: 699, description: "Travel limits" },
    { category: "MACRO", rangeStart: 700, rangeEnd: 799, description: "Macro/custom alarms" },
    { category: "COOLANT", rangeStart: 800, rangeEnd: 899, description: "Coolant system alarms" },
    { category: "SAFETY", rangeStart: 900, rangeEnd: 999, description: "Safety system alarms" },
    { category: "MESSAGES", rangeStart: 1000, rangeEnd: 9999, description: "Operator messages" }
  ],
  SIEMENS: [
    { category: "NCK", rangeStart: 10000, rangeEnd: 19999, description: "NCK kernel alarms" },
    { category: "CHANNEL", rangeStart: 20000, rangeEnd: 29999, description: "Channel-specific alarms" },
    { category: "AXIS", rangeStart: 30000, rangeEnd: 39999, description: "Axis alarms" },
    { category: "PLC", rangeStart: 60000, rangeEnd: 69999, description: "PLC alarms" },
    { category: "DRIVE", rangeStart: 70000, rangeEnd: 79999, description: "Drive alarms" },
    { category: "HMI", rangeStart: 100000, rangeEnd: 199999, description: "HMI alarms" },
    { category: "USER", rangeStart: 500000, rangeEnd: 599999, description: "User-defined alarms" }
  ],
  MAZAK: [
    { category: "NC", prefix: "NC", rangeStart: 1, rangeEnd: 999, description: "NC alarms" },
    { category: "MC", prefix: "MC", rangeStart: 1, rangeEnd: 999, description: "MC (Machine) alarms" },
    { category: "ATC", prefix: "ATC", rangeStart: 1, rangeEnd: 999, description: "ATC alarms" },
    { category: "MAZATROL", rangeStart: 1000, rangeEnd: 9999, description: "Mazatrol-specific alarms" }
  ],
  OKUMA: [
    { category: "PS", rangeStart: 1, rangeEnd: 999, description: "Program/sequence alarms" },
    { category: "SV", rangeStart: 1000, rangeEnd: 1999, description: "Servo alarms" },
    { category: "SP", rangeStart: 2000, rangeEnd: 2999, description: "Spindle alarms" },
    { category: "MC", rangeStart: 3000, rangeEnd: 3999, description: "Machine alarms" },
    { category: "ATC", rangeStart: 4000, rangeEnd: 4999, description: "Tool changer alarms" }
  ],
  HEIDENHAIN: [
    { category: "FE", prefix: "FE", rangeStart: 1, rangeEnd: 9999, description: "Error messages" },
    { category: "PE", prefix: "PE", rangeStart: 1, rangeEnd: 9999, description: "PLC errors" },
    { category: "SE", prefix: "SE", rangeStart: 1, rangeEnd: 9999, description: "Servo errors" }
  ]
};

// G-code differences by controller
const GCODE_DIALECT: Record<string, Record<string, { 
  supported: boolean; 
  equivalent?: string; 
  notes?: string 
}>> = {
  FANUC: {
    "G10": { supported: true, notes: "Data setting" },
    "G28": { supported: true, notes: "Return to reference position" },
    "G30": { supported: true, notes: "2nd/3rd/4th reference return" },
    "G43": { supported: true, notes: "Tool length compensation +" },
    "G49": { supported: true, notes: "Tool length compensation cancel" },
    "G54": { supported: true, notes: "Work coordinate 1" },
    "G65": { supported: true, notes: "Macro call" },
    "G68": { supported: true, notes: "Coordinate rotation" },
    "G73": { supported: true, notes: "Peck drilling (high-speed)" },
    "G83": { supported: true, notes: "Deep hole drilling" },
    "G84": { supported: true, notes: "Tapping cycle" },
    "G98": { supported: true, notes: "Return to initial level" },
    "G99": { supported: true, notes: "Return to R level" }
  },
  HAAS: {
    "G10": { supported: true, notes: "Data setting" },
    "G28": { supported: true, notes: "Return to machine zero" },
    "G30": { supported: true, notes: "Secondary reference return" },
    "G43": { supported: true, notes: "Tool length compensation +" },
    "G54": { supported: true, notes: "Work coordinate 1" },
    "G65": { supported: true, notes: "Macro call" },
    "G68": { supported: true, notes: "Rotation (requires option)" },
    "G73": { supported: true, notes: "High-speed peck drilling" },
    "G83": { supported: true, notes: "Peck drilling" },
    "G84": { supported: true, notes: "Tapping" },
    "G154": { supported: true, notes: "Extended work offsets P1-P99" },
    "G187": { supported: true, notes: "Smoothness setting (Haas specific)" }
  },
  SIEMENS: {
    "G10": { supported: false, equivalent: "WRITE_DB", notes: "Use data blocks instead" },
    "G28": { supported: false, equivalent: "G75", notes: "Use G75 for reference return" },
    "G30": { supported: false, equivalent: "G75", notes: "G75 with second reference" },
    "G43": { supported: true, notes: "Tool length compensation" },
    "G54": { supported: true, notes: "Work offset (TRANS also available)" },
    "G65": { supported: false, equivalent: "CALL", notes: "Use CALL for subprograms" },
    "G68": { supported: true, equivalent: "ROT", notes: "CYCLE800 for 5-axis" },
    "G73": { supported: false, equivalent: "CYCLE83", notes: "Use CYCLE83 for drilling" },
    "G83": { supported: false, equivalent: "CYCLE83", notes: "Use CYCLE83 for drilling" },
    "G84": { supported: false, equivalent: "CYCLE84", notes: "Use CYCLE84 for tapping" },
    "CYCLE800": { supported: true, notes: "5-axis swivel (Siemens specific)" },
    "TRAORI": { supported: true, notes: "5-axis transformation (Siemens specific)" }
  },
  MAZAK: {
    "G10": { supported: true, notes: "Data setting" },
    "G28": { supported: true, notes: "Reference return" },
    "G43": { supported: true, notes: "Tool length compensation" },
    "G54": { supported: true, notes: "Work coordinate system" },
    "G68": { supported: true, notes: "Rotation" },
    "G73": { supported: true, notes: "Peck drilling" },
    "G83": { supported: true, notes: "Deep hole drilling" },
    "G84": { supported: true, notes: "Tapping" },
    "G125": { supported: true, notes: "Mazak smooth corner (Mazak specific)" },
    "G43.4": { supported: true, notes: "Tool center point control (Mazak specific)" }
  },
  HEIDENHAIN: {
    "G10": { supported: false, notes: "Not supported - use TOOL CALL parameters" },
    "G28": { supported: false, equivalent: "FN0", notes: "Use FN0 for reference" },
    "G43": { supported: false, notes: "Automatic with TOOL CALL" },
    "G54": { supported: false, equivalent: "DATUM", notes: "Use DATUM for work offsets" },
    "G68": { supported: false, equivalent: "PLANE", notes: "Use PLANE function" },
    "CYCL DEF": { supported: true, notes: "Cycle definition (Heidenhain specific)" },
    "TOOL CALL": { supported: true, notes: "Tool selection (Heidenhain specific)" },
    "PLANE SPATIAL": { supported: true, notes: "5-axis tilting (Heidenhain specific)" },
    "M91": { supported: true, notes: "Machine coordinates (Heidenhain specific)" }
  }
};

// Controller parameter limits
const CONTROLLER_LIMITS: Record<string, {
  maxProgramNumber: number;
  maxToolNumber: number;
  maxWorkOffset: number;
  maxFeedRate: number;
  maxSpindleSpeed: number;
  maxMacroVariables: number;
}> = {
  FANUC: {
    maxProgramNumber: 9999,
    maxToolNumber: 999,
    maxWorkOffset: 306,  // G54.1 P1-P48 + G54-G59
    maxFeedRate: 240000,
    maxSpindleSpeed: 99999,
    maxMacroVariables: 999
  },
  HAAS: {
    maxProgramNumber: 99999,
    maxToolNumber: 200,
    maxWorkOffset: 154,  // G154 P1-P99 + G54-G59
    maxFeedRate: 50000,
    maxSpindleSpeed: 15000,
    maxMacroVariables: 200
  },
  SIEMENS: {
    maxProgramNumber: 99999999,
    maxToolNumber: 32000,
    maxWorkOffset: 99,
    maxFeedRate: 999999,
    maxSpindleSpeed: 99999,
    maxMacroVariables: 99999
  },
  MAZAK: {
    maxProgramNumber: 99999999,
    maxToolNumber: 999,
    maxWorkOffset: 99,
    maxFeedRate: 100000,
    maxSpindleSpeed: 50000,
    maxMacroVariables: 999
  }
};

// ============================================================================
// ALARM VALIDATION HOOKS
// ============================================================================

/**
 * Validate FANUC alarm format
 */
const preFanucAlarmValidation: HookDefinition = {
  id: "pre-fanuc-alarm-validation",
  name: "FANUC Alarm Validation",
  description: "Validates FANUC-specific alarm codes and formats.",
  
  phase: "pre-alarm-add",
  category: "controller",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["fanuc", "alarm", "validation"],
  
  condition: (context: HookContext): boolean => {
    const family = (context.target?.data as any)?.controller_family?.toUpperCase();
    return family === "FANUC";
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = preFanucAlarmValidation;
    
    const alarm = context.target?.data as {
      code?: string;
      alarm_id?: string;
      category?: string;
    } | undefined;
    
    if (!alarm?.code && !alarm?.alarm_id) {
      return hookBlock(hook, "Missing alarm code", { issues: ["FANUC alarms require a code"] });
    }
    
    const code = alarm.code || alarm.alarm_id || "";
    const ranges = ALARM_CODE_RANGES["FANUC"];
    
    // Parse code - could be "PS0100" or "SV0401" or just "100"
    const match = code.match(/^([A-Z]{2})?(\d+)$/i);
    if (!match) {
      return hookWarning(hook,
        `Unusual FANUC alarm code format: ${code}`,
        { warnings: ["Expected format: PS0100, SV0401, or numeric (e.g., 100)"] }
      );
    }
    
    const prefix = match[1]?.toUpperCase();
    const number = parseInt(match[2], 10);
    
    // Find matching range
    let validRange = false;
    let rangeDescription = "";
    
    for (const range of ranges) {
      if (prefix && range.prefix) {
        if (prefix === range.prefix && number >= range.rangeStart && number <= range.rangeEnd) {
          validRange = true;
          rangeDescription = range.description;
          break;
        }
      } else if (!prefix && !range.prefix) {
        if (number >= range.rangeStart && number <= range.rangeEnd) {
          validRange = true;
          rangeDescription = range.description;
          break;
        }
      }
    }
    
    if (!validRange && prefix) {
      const validPrefixes = ranges.filter(r => r.prefix).map(r => r.prefix);
      return hookWarning(hook,
        `Unknown FANUC alarm prefix: ${prefix}`,
        {
          warnings: [
            `Valid FANUC prefixes: ${validPrefixes.join(", ")}`,
            "This may be an OEM-specific alarm"
          ]
        }
      );
    }
    
    return hookSuccess(hook, `Valid FANUC alarm: ${code} (${rangeDescription})`);
  }
};

/**
 * Validate SIEMENS alarm format
 */
const preSiemensAlarmValidation: HookDefinition = {
  id: "pre-siemens-alarm-validation",
  name: "SIEMENS Alarm Validation",
  description: "Validates SIEMENS-specific alarm codes and formats.",
  
  phase: "pre-alarm-add",
  category: "controller",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["siemens", "alarm", "validation"],
  
  condition: (context: HookContext): boolean => {
    const family = (context.target?.data as any)?.controller_family?.toUpperCase();
    return family === "SIEMENS";
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = preSiemensAlarmValidation;
    
    const alarm = context.target?.data as {
      code?: string;
      alarm_id?: string;
    } | undefined;
    
    const code = alarm?.code || alarm?.alarm_id || "";
    
    // SIEMENS alarms are typically 5-6 digit numbers
    const number = parseInt(code.replace(/\D/g, ""), 10);
    
    if (isNaN(number)) {
      return hookBlock(hook,
        "Invalid SIEMENS alarm code",
        { issues: ["SIEMENS alarms must be numeric (e.g., 10000, 60000)"] }
      );
    }
    
    const ranges = ALARM_CODE_RANGES["SIEMENS"];
    let category = "UNKNOWN";
    
    for (const range of ranges) {
      if (number >= range.rangeStart && number <= range.rangeEnd) {
        category = range.category;
        break;
      }
    }
    
    if (category === "UNKNOWN") {
      return hookWarning(hook,
        `SIEMENS alarm ${number} not in standard ranges`,
        {
          warnings: [
            "Standard ranges: 10000-19999 (NCK), 20000-29999 (Channel), 60000-69999 (PLC), 70000-79999 (Drive)",
            "This may be a custom or OEM alarm"
          ]
        }
      );
    }
    
    return hookSuccess(hook, `Valid SIEMENS alarm: ${number} (${category})`);
  }
};

/**
 * Validate HAAS alarm format
 */
const preHaasAlarmValidation: HookDefinition = {
  id: "pre-haas-alarm-validation",
  name: "HAAS Alarm Validation",
  description: "Validates HAAS-specific alarm codes and formats.",
  
  phase: "pre-alarm-add",
  category: "controller",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["haas", "alarm", "validation"],
  
  condition: (context: HookContext): boolean => {
    const family = (context.target?.data as any)?.controller_family?.toUpperCase();
    return family === "HAAS";
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = preHaasAlarmValidation;
    
    const alarm = context.target?.data as {
      code?: string;
      alarm_id?: string;
    } | undefined;
    
    const code = alarm?.code || alarm?.alarm_id || "";
    const number = parseInt(code.replace(/\D/g, ""), 10);
    
    if (isNaN(number)) {
      return hookBlock(hook,
        "Invalid HAAS alarm code",
        { issues: ["HAAS alarms must be numeric (e.g., 101, 501)"] }
      );
    }
    
    const ranges = ALARM_CODE_RANGES["HAAS"];
    let category = "UNKNOWN";
    
    for (const range of ranges) {
      if (number >= range.rangeStart && number <= range.rangeEnd) {
        category = range.category;
        break;
      }
    }
    
    if (number < 100) {
      return hookWarning(hook,
        `HAAS alarm ${number} below standard range`,
        { warnings: ["HAAS alarms typically start at 100"] }
      );
    }
    
    return hookSuccess(hook, `Valid HAAS alarm: ${number} (${category})`);
  }
};

// ============================================================================
// G-CODE VALIDATION HOOKS
// ============================================================================

/**
 * Validate G-code for controller compatibility
 */
const preGcodeControllerCompatibility: HookDefinition = {
  id: "pre-gcode-controller-compatibility",
  name: "G-Code Controller Compatibility",
  description: "Validates G-code commands are supported by target controller.",
  
  phase: "pre-code-generate",
  category: "controller",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["gcode", "compatibility", "controller"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preGcodeControllerCompatibility;
    
    const gcode = context.content?.new as string | undefined;
    const controller = context.metadata?.controller_type as string || "FANUC";
    
    if (!gcode) {
      return hookSuccess(hook, "No G-code to validate");
    }
    
    const dialect = GCODE_DIALECT[controller.toUpperCase()];
    if (!dialect) {
      return hookSuccess(hook, `No dialect rules for ${controller}`);
    }
    
    const warnings: string[] = [];
    const lines = gcode.split("\n");
    
    // Find all G-codes in the program
    const gCodes = new Set<string>();
    for (const line of lines) {
      const matches = line.match(/G\d+\.?\d*/gi);
      if (matches) {
        matches.forEach(g => gCodes.add(g.toUpperCase()));
      }
      
      // Controller-specific keywords
      if (controller === "SIEMENS") {
        const siemensKeywords = line.match(/(CYCLE\d+|TRAORI|TRAFOOF)/gi);
        if (siemensKeywords) {
          siemensKeywords.forEach(k => gCodes.add(k.toUpperCase()));
        }
      }
      
      if (controller === "HEIDENHAIN") {
        const heidKeywords = line.match(/(CYCL DEF|TOOL CALL|PLANE SPATIAL|M91)/gi);
        if (heidKeywords) {
          heidKeywords.forEach(k => gCodes.add(k.toUpperCase()));
        }
      }
    }
    
    // Check each G-code against dialect
    for (const gCode of gCodes) {
      const rule = dialect[gCode];
      
      if (rule) {
        if (!rule.supported) {
          if (rule.equivalent) {
            warnings.push(`${gCode} not supported on ${controller} - use ${rule.equivalent} instead`);
          } else {
            warnings.push(`${gCode} not supported on ${controller}${rule.notes ? ` (${rule.notes})` : ""}`);
          }
        }
      }
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook,
        `${warnings.length} G-code compatibility issues for ${controller}`,
        { warnings: warnings.slice(0, 10) }
      );
    }
    
    return hookSuccess(hook, `G-code compatible with ${controller}`);
  }
};

// ============================================================================
// PARAMETER LIMIT HOOKS
// ============================================================================

/**
 * Validate controller parameter limits
 */
const preControllerLimitValidation: HookDefinition = {
  id: "pre-controller-limit-validation",
  name: "Controller Limit Validation",
  description: "Validates parameters against controller-specific limits.",
  
  phase: "pre-code-generate",
  category: "controller",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["limits", "controller", "parameters"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preControllerLimitValidation;
    
    const gcode = context.content?.new as string | undefined;
    const controller = context.metadata?.controller_type as string || "FANUC";
    
    if (!gcode) {
      return hookSuccess(hook, "No G-code to validate");
    }
    
    const limits = CONTROLLER_LIMITS[controller.toUpperCase()];
    if (!limits) {
      return hookSuccess(hook, `No limits defined for ${controller}`);
    }
    
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check program numbers
    const programMatches = gcode.match(/O(\d+)|^%\s*(\d+)/gmi);
    if (programMatches) {
      for (const match of programMatches) {
        const num = parseInt(match.replace(/[^\d]/g, ""), 10);
        if (num > limits.maxProgramNumber) {
          issues.push(`Program number ${num} exceeds ${controller} limit (${limits.maxProgramNumber})`);
        }
      }
    }
    
    // Check tool numbers
    const toolMatches = gcode.match(/T(\d+)/gi);
    if (toolMatches) {
      for (const match of toolMatches) {
        const num = parseInt(match.replace(/T/i, ""), 10);
        if (num > limits.maxToolNumber) {
          issues.push(`Tool number T${num} exceeds ${controller} limit (${limits.maxToolNumber})`);
        }
      }
    }
    
    // Check feed rates
    const feedMatches = gcode.match(/F(\d+\.?\d*)/gi);
    if (feedMatches) {
      for (const match of feedMatches) {
        const num = parseFloat(match.replace(/F/i, ""));
        if (num > limits.maxFeedRate) {
          warnings.push(`Feed rate F${num} may exceed ${controller} limit (${limits.maxFeedRate})`);
        }
      }
    }
    
    // Check spindle speeds
    const spindleMatches = gcode.match(/S(\d+)/gi);
    if (spindleMatches) {
      for (const match of spindleMatches) {
        const num = parseInt(match.replace(/S/i, ""), 10);
        if (num > limits.maxSpindleSpeed) {
          warnings.push(`Spindle speed S${num} may exceed ${controller} limit (${limits.maxSpindleSpeed})`);
        }
      }
    }
    
    if (issues.length > 0) {
      return hookBlock(hook,
        `⛔ ${controller} parameter limits exceeded`,
        { issues }
      );
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook,
        `${controller} parameter warnings`,
        { warnings }
      );
    }
    
    return hookSuccess(hook, `Parameters within ${controller} limits`);
  }
};

// ============================================================================
// EXPORT ALL CONTROLLER HOOKS
// ============================================================================

export const controllerHooks: HookDefinition[] = [
  // Alarm validation
  preFanucAlarmValidation,
  preSiemensAlarmValidation,
  preHaasAlarmValidation,
  
  // G-code compatibility
  preGcodeControllerCompatibility,
  
  // Parameter limits
  preControllerLimitValidation
];

export {
  preFanucAlarmValidation,
  preSiemensAlarmValidation,
  preHaasAlarmValidation,
  preGcodeControllerCompatibility,
  preControllerLimitValidation,
  ALARM_CODE_RANGES,
  GCODE_DIALECT,
  CONTROLLER_LIMITS
};
