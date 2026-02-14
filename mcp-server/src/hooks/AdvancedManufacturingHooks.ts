/**
 * PRISM MCP Server - Advanced Manufacturing Physics Hooks
 * Session 6.2 Enhancement: Complete Physics Validation
 * 
 * Additional manufacturing physics hooks beyond force/thermal/deflection:
 * - Chip breaking validation
 * - Chatter/stability prediction
 * - Power consumption validation
 * - Coolant requirements
 * - Work coordinate validation
 * - Tool change safety
 * - Spindle orientation
 * - Rapid traverse safety
 * - Torque requirements
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
// PHYSICS CONSTANTS
// ============================================================================

/**
 * Chip thickness ratio limits by material ISO group
 * If chip thickness / feed per tooth is outside this range, chip breaking is problematic
 */
const CHIP_THICKNESS_RATIO: Record<string, { min: number; max: number; notes: string }> = {
  "P": { min: 0.3, max: 0.7, notes: "Steels - good chip control range" },
  "M": { min: 0.25, max: 0.6, notes: "Stainless - narrower window, stringy chips" },
  "K": { min: 0.4, max: 0.8, notes: "Cast iron - short chips, wider range" },
  "N": { min: 0.2, max: 0.5, notes: "Non-ferrous - tends to be stringy, use high speeds" },
  "S": { min: 0.35, max: 0.65, notes: "Superalloys - careful chip control needed" },
  "H": { min: 0.4, max: 0.75, notes: "Hardened - generally good chip breaking" }
};

/**
 * Minimum stable speed by operation to avoid chatter (m/min)
 */
const MIN_STABLE_SPEED: Record<string, number> = {
  "roughing": 50,
  "finishing": 100,
  "semi_finishing": 75,
  "threading": 30,
  "grooving": 40,
  "drilling": 20,
  "boring": 60
};

/**
 * Power factor by ISO group (ratio of cutting power to theoretical)
 */
const POWER_FACTOR: Record<string, number> = {
  "P": 1.0,
  "M": 1.3,   // Higher power needed for stainless
  "K": 0.85,  // Cast iron generally easier
  "N": 0.7,   // Aluminum very easy
  "S": 1.5,   // Superalloys require significant power
  "H": 1.4    // Hardened materials need more power
};

/**
 * Coolant requirements by operation and material
 */
const COOLANT_REQUIRED: Record<string, Record<string, boolean>> = {
  "P": { drilling: true, tapping: true, threading: true, milling: false, turning: false, reaming: true },
  "M": { drilling: true, tapping: true, threading: true, milling: true, turning: true, reaming: true },
  "K": { drilling: true, tapping: true, threading: true, milling: false, turning: false, reaming: true },
  "N": { drilling: true, tapping: true, threading: true, milling: true, turning: false, reaming: true },
  "S": { drilling: true, tapping: true, threading: true, milling: true, turning: true, reaming: true },
  "H": { drilling: true, tapping: true, threading: true, milling: true, turning: true, reaming: true }
};

/**
 * Safe Z heights by machine type (mm)
 */
const SAFE_Z_HEIGHT: Record<string, number> = {
  "vertical_mill": 50,
  "horizontal_mill": 50,
  "lathe": 30,
  "5axis": 75,
  "swiss": 20,
  "gantry": 100
};

/**
 * Maximum L/D ratio (length/diameter) for stability
 */
const MAX_LD_RATIO: Record<string, number> = {
  "roughing": 4,
  "finishing": 6,
  "drilling": 5,
  "boring": 3,
  "threading": 3
};

// ============================================================================
// CHIP BREAKING HOOKS
// ============================================================================

/**
 * Validate chip breaking conditions
 */
const onChipBreakingValidation: HookDefinition = {
  id: "on-chip-breaking-validation",
  name: "Chip Breaking Validation",
  description: "Validates that cutting parameters will produce manageable chips.",
  
  phase: "post-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["chip", "breaking", "physics", "process"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onChipBreakingValidation;
    
    const params = context.target?.data as {
      iso_group?: string;
      feed_per_tooth?: number;  // mm
      feed_rate?: number;       // mm/rev for turning
      depth_of_cut?: number;    // mm
      chip_thickness?: number;  // mm (calculated)
      cutting_speed?: number;   // m/min
    } | undefined;
    
    if (!params?.iso_group) {
      return hookSuccess(hook, "Insufficient data for chip breaking analysis");
    }
    
    const group = params.iso_group.toUpperCase();
    const limits = CHIP_THICKNESS_RATIO[group];
    
    if (!limits) {
      return hookSuccess(hook, `No chip breaking data for ISO group ${group}`);
    }
    
    const feedValue = params.feed_per_tooth || params.feed_rate || 0;
    if (feedValue === 0) {
      return hookSuccess(hook, "No feed data for chip analysis");
    }
    
    // Calculate chip thickness (simplified - actual depends on tool geometry)
    // h = fz * sin(κr) where κr is lead angle (assume 45° for end mills, 90° for turning)
    const chipThickness = params.chip_thickness || feedValue * 0.7;
    
    const warnings: string[] = [];
    
    // Check if chip is too thin (rubbing, work hardening)
    if (chipThickness < 0.02) {
      warnings.push("⚠️ Chip thickness < 0.02mm: Risk of rubbing and work hardening");
      warnings.push("SOLUTION: Increase feed rate to establish proper chip formation");
      
      if (group === "M") {
        warnings.push("CRITICAL for stainless: Thin chips cause severe work hardening");
      }
    }
    
    // Check if chip is too thick (breakage risk, force spikes)
    if (chipThickness > 0.5) {
      warnings.push("⚠️ Chip thickness > 0.5mm: Risk of chip jamming and tool breakage");
      warnings.push("SOLUTION: Reduce feed rate or use chip breaker geometry");
    }
    
    // Material-specific checks
    if (group === "M" && chipThickness > 0.15) {
      warnings.push("Stainless steel with thick chips: Risk of built-up edge (BUE)");
      warnings.push("RECOMMEND: High-pressure coolant or MQL, polished rake face");
    }
    
    if (group === "N") {
      warnings.push("Aluminum: Long stringy chips likely without chip breaker geometry");
      warnings.push("RECOMMEND: Polished rake face, high cutting speed (>300 m/min), chip breaker");
    }
    
    if (group === "S") {
      warnings.push("Superalloy: Monitor chip color - discoloration indicates excessive heat");
      warnings.push("RECOMMEND: Through-spindle coolant, reduced speeds, sharp tools only");
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook,
        `Chip control concerns for ISO group ${group}`,
        {
          warnings,
          score: 0.7,
          data: { chipThickness, isoGroup: group, limits }
        }
      );
    }
    
    return hookSuccess(hook, `Chip breaking OK for ISO group ${group}`, {
      data: { chipThickness, notes: limits.notes }
    });
  }
};

// ============================================================================
// CHATTER/STABILITY HOOKS
// ============================================================================

/**
 * Stability lobe check (simplified)
 */
const onStabilityCheck: HookDefinition = {
  id: "on-stability-check",
  name: "Chatter Stability Check",
  description: "Validates cutting parameters against stability limits to prevent chatter.",
  
  phase: "post-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["chatter", "stability", "vibration", "dynamics"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onStabilityCheck;
    
    const params = context.target?.data as {
      spindle_speed?: number;    // RPM
      depth_of_cut?: number;     // mm
      tool_overhang?: number;    // mm
      tool_diameter?: number;    // mm
      tool_length?: number;      // mm (alternative to overhang)
      operation_type?: string;
      natural_frequency?: number; // Hz (if known from tap test)
      flute_count?: number;
    } | undefined;
    
    if (!params?.spindle_speed || !params?.depth_of_cut) {
      return hookSuccess(hook, "Insufficient data for stability analysis");
    }
    
    const warnings: string[] = [];
    const issues: string[] = [];
    
    // Calculate L/D ratio
    const overhang = params.tool_overhang || params.tool_length || 0;
    const diameter = params.tool_diameter || 10; // Default 10mm
    
    if (overhang > 0 && diameter > 0) {
      const ldRatio = overhang / diameter;
      const opType = params.operation_type?.toLowerCase() || "roughing";
      const maxRatio = MAX_LD_RATIO[opType] || MAX_LD_RATIO["roughing"];
      
      if (ldRatio > 8) {
        return hookWarning(hook,
          `⚠️ EXTREME CHATTER RISK: L/D ratio = ${ldRatio.toFixed(1)}`,
          {
            warnings: [
              `Tool overhang ${overhang}mm / diameter ${diameter}mm = ${ldRatio.toFixed(1)}`,
              "L/D > 8 makes stable cutting nearly impossible",
              "SOLUTIONS:",
              "  1. Use largest diameter tool possible",
              "  2. Minimize overhang with shorter holder",
              "  3. Use vibration-damped boring bar",
              "  4. Reduce DOC to <0.5mm",
              "  5. Consider different approach angle"
            ],
            score: 0.3
          }
        );
      }
      
      if (ldRatio > 6) {
        warnings.push(`⚠️ HIGH CHATTER RISK: L/D ratio = ${ldRatio.toFixed(1)} (max recommended: ${maxRatio})`);
        warnings.push("Significant deflection and chatter likely");
        warnings.push("RECOMMEND: Reduce overhang, increase diameter, or reduce DOC by 50%");
      } else if (ldRatio > maxRatio) {
        warnings.push(`L/D ratio ${ldRatio.toFixed(1)} exceeds recommended ${maxRatio} for ${opType}`);
        warnings.push("Consider vibration damping holder or reduced DOC");
      }
    }
    
    // Check for stability lobe issues (simplified)
    if (params.natural_frequency && params.flute_count) {
      const toothPassingFreq = (params.spindle_speed / 60) * params.flute_count;
      const freqRatio = toothPassingFreq / params.natural_frequency;
      
      // Unstable zones are around integer ratios
      const nearInteger = Math.abs(freqRatio - Math.round(freqRatio)) < 0.1;
      
      if (nearInteger && freqRatio > 0.5) {
        const lowerSpeed = Math.round(params.spindle_speed * 0.85);
        const higherSpeed = Math.round(params.spindle_speed * 1.15);
        
        warnings.push(`⚠️ Spindle speed may be in unstable zone (freq ratio: ${freqRatio.toFixed(2)})`);
        warnings.push(`TRY: ${lowerSpeed} RPM or ${higherSpeed} RPM to move away from resonance`);
      }
    }
    
    // Depth vs speed relationship
    const opType = params.operation_type?.toLowerCase() || "roughing";
    const minSpeed = MIN_STABLE_SPEED[opType] || 50;
    
    // Convert RPM to m/min
    const cuttingSpeed = (Math.PI * diameter * params.spindle_speed) / 1000;
    
    if (cuttingSpeed < minSpeed && params.depth_of_cut > 2) {
      warnings.push(`Low cutting speed (${cuttingSpeed.toFixed(0)} m/min) with deep cut (${params.depth_of_cut}mm)`);
      warnings.push("This combination is prone to chatter");
      warnings.push(`RECOMMEND: Increase speed to >${minSpeed} m/min or reduce DOC`);
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook, `Stability concerns detected`, {
        warnings,
        data: {
          ldRatio: overhang / diameter,
          cuttingSpeed,
          depthOfCut: params.depth_of_cut
        }
      });
    }
    
    return hookSuccess(hook, "Parameters within stable zone");
  }
};

// ============================================================================
// POWER & TORQUE HOOKS
// ============================================================================

/**
 * Validate power consumption
 */
const onPowerConsumptionValidation: HookDefinition = {
  id: "on-power-consumption-validation",
  name: "Power Consumption Validation",
  description: "Validates that required cutting power is within machine limits.",
  
  phase: "post-calculation",
  category: "manufacturing",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["power", "spindle", "machine-limits", "physics"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onPowerConsumptionValidation;
    
    const params = context.target?.data as {
      cutting_power?: number;    // kW (calculated)
      machine_power?: number;    // kW (spindle motor rating)
      iso_group?: string;
      mrr?: number;              // cm³/min (material removal rate)
      specific_cutting_force?: number; // N/mm² (kc1.1)
      cutting_speed?: number;    // m/min
    } | undefined;
    
    if (!params?.machine_power) {
      return hookSuccess(hook, "No machine power limit specified");
    }
    
    let requiredPower = params.cutting_power;
    
    // Calculate power if not provided: P = (kc × MRR) / (60 × 10^6) in kW
    if (!requiredPower && params.mrr && params.specific_cutting_force) {
      requiredPower = (params.mrr * 1000 * params.specific_cutting_force) / (60 * 1000000);
    }
    
    if (!requiredPower) {
      return hookSuccess(hook, "Insufficient data to calculate power");
    }
    
    // Apply power factor for material
    const group = params.iso_group?.toUpperCase() || "P";
    const factor = POWER_FACTOR[group] || 1.0;
    const adjustedPower = requiredPower * factor;
    
    // Spindle efficiency typically 85-90%
    const SPINDLE_EFFICIENCY = 0.85;
    const availablePower = params.machine_power * SPINDLE_EFFICIENCY;
    
    const powerUtilization = adjustedPower / availablePower;
    
    if (powerUtilization > 1.0) {
      return hookBlock(hook,
        `⛔ POWER LIMIT EXCEEDED: ${adjustedPower.toFixed(1)}kW required, ${availablePower.toFixed(1)}kW available`,
        {
          issues: [
            `Required power (${adjustedPower.toFixed(1)}kW) exceeds spindle capacity`,
            `Power utilization: ${(powerUtilization * 100).toFixed(0)}%`,
            "SOLUTIONS:",
            "  1. Reduce depth of cut",
            "  2. Reduce feed rate",
            "  3. Reduce number of engaged flutes",
            "  4. Use smaller radial engagement",
            "  5. Split into multiple passes"
          ],
          data: { requiredPower: adjustedPower, availablePower, utilization: powerUtilization }
        }
      );
    }
    
    if (powerUtilization > 0.9) {
      return hookWarning(hook,
        `⚠️ High power utilization: ${(powerUtilization * 100).toFixed(0)}%`,
        {
          warnings: [
            "Operating near spindle power limit",
            "Monitor spindle load during cut",
            "Consider reducing parameters for sustained operation",
            "High power = high heat = reduced tool life"
          ],
          data: { requiredPower: adjustedPower, availablePower, utilization: powerUtilization }
        }
      );
    }
    
    return hookSuccess(hook, `Power OK: ${(powerUtilization * 100).toFixed(0)}% utilization`, {
      data: { requiredPower: adjustedPower, availablePower }
    });
  }
};

/**
 * Validate torque requirements
 */
const onTorqueValidation: HookDefinition = {
  id: "on-torque-validation",
  name: "Torque Requirement Validation",
  description: "Validates that required torque is within spindle capability at the operating speed.",
  
  phase: "post-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["torque", "spindle", "low-speed", "physics"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onTorqueValidation;
    
    const params = context.target?.data as {
      cutting_power?: number;      // kW
      spindle_speed?: number;      // RPM
      max_torque?: number;         // Nm
      base_speed?: number;         // RPM (constant power/torque transition)
    } | undefined;
    
    if (!params?.cutting_power || !params?.spindle_speed) {
      return hookSuccess(hook, "Insufficient data for torque calculation");
    }
    
    // Calculate required torque: T = (P × 9549) / n
    const requiredTorque = (params.cutting_power * 9549) / params.spindle_speed;
    
    if (!params.max_torque) {
      return hookSuccess(hook, `Calculated torque: ${requiredTorque.toFixed(1)} Nm`, {
        data: { requiredTorque }
      });
    }
    
    // Check if we're in constant torque region (below base speed)
    const inConstantTorqueRegion = params.base_speed ? 
      params.spindle_speed < params.base_speed : 
      params.spindle_speed < 1500; // Assume 1500 RPM if not specified
    
    const torqueUtilization = requiredTorque / params.max_torque;
    
    if (torqueUtilization > 1.0) {
      return hookBlock(hook,
        `⛔ TORQUE LIMIT EXCEEDED: ${requiredTorque.toFixed(1)} Nm required, ${params.max_torque} Nm available`,
        {
          issues: [
            `Torque utilization: ${(torqueUtilization * 100).toFixed(0)}%`,
            inConstantTorqueRegion ? 
              "Operating in constant torque region - this is the limit" :
              "Increase spindle speed to get more torque-limited power",
            "SOLUTIONS:",
            "  1. Increase spindle speed (if in constant power region)",
            "  2. Reduce cutting forces (lower feed, DOC)",
            "  3. Use smaller diameter tool"
          ]
        }
      );
    }
    
    if (torqueUtilization > 0.85 && inConstantTorqueRegion) {
      return hookWarning(hook,
        `⚠️ High torque utilization at low speed: ${(torqueUtilization * 100).toFixed(0)}%`,
        {
          warnings: [
            "Operating in constant torque region near limit",
            "Spindle may stall under load variations",
            "Consider higher speed if tool/material allows"
          ],
          data: { requiredTorque, maxTorque: params.max_torque, utilization: torqueUtilization }
        }
      );
    }
    
    return hookSuccess(hook, `Torque OK: ${(torqueUtilization * 100).toFixed(0)}% utilization`);
  }
};

// ============================================================================
// COOLANT HOOKS
// ============================================================================

/**
 * Validate coolant requirements
 */
const onCoolantRequirementValidation: HookDefinition = {
  id: "on-coolant-requirement-validation",
  name: "Coolant Requirement Validation",
  description: "Validates that coolant is used where required for safe machining.",
  
  phase: "pre-code-generate",
  category: "manufacturing",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["coolant", "thermal", "process", "safety"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onCoolantRequirementValidation;
    
    const params = context.target?.data as {
      iso_group?: string;
      operation_type?: string;
      coolant_enabled?: boolean;
      cutting_speed?: number;  // m/min
      material_name?: string;
    } | undefined;
    
    if (!params?.iso_group || !params?.operation_type) {
      return hookSuccess(hook, "Insufficient data for coolant analysis");
    }
    
    const group = params.iso_group.toUpperCase();
    const operation = params.operation_type.toLowerCase();
    const coolantOn = params.coolant_enabled ?? true;
    
    const requirements = COOLANT_REQUIRED[group];
    if (!requirements) {
      return hookSuccess(hook, `No coolant data for ISO group ${group}`);
    }
    
    const needsCoolant = requirements[operation] ?? false;
    const warnings: string[] = [];
    
    if (needsCoolant && !coolantOn) {
      warnings.push(`⚠️ ${operation} on ISO group ${group} typically requires coolant`);
      
      // Material-specific recommendations
      if (group === "M") {
        warnings.push("STAINLESS: Coolant prevents work hardening and built-up edge");
        warnings.push("Without coolant: Expect 50%+ reduction in tool life");
      } else if (group === "S") {
        warnings.push("SUPERALLOY: Coolant ESSENTIAL for tool life and surface integrity");
        warnings.push("High-pressure through-spindle coolant strongly recommended");
      } else if (operation === "drilling" || operation === "tapping" || operation === "reaming") {
        warnings.push(`${operation.toUpperCase()}: Coolant required for chip evacuation`);
        if (operation === "tapping") {
          warnings.push("Dry tapping risks tap breakage and thread quality issues");
        }
      }
    }
    
    // High speed warning
    if (params.cutting_speed && params.cutting_speed > 200 && group !== "N") {
      if (!coolantOn) {
        warnings.push(`High cutting speed (${params.cutting_speed} m/min) without coolant`);
        warnings.push("Excessive heat may cause rapid tool wear or thermal damage");
      }
    }
    
    // Titanium special case (CRITICAL SAFETY)
    if (params.material_name?.toLowerCase().includes("titanium") || 
        params.material_name?.toLowerCase().includes("ti-6al")) {
      if (!coolantOn) {
        return hookWarning(hook,
          "⚠️ TITANIUM: Coolant STRONGLY recommended",
          {
            warnings: [
              "SAFETY: Titanium chips can ignite when machining dry",
              "Fire suppression equipment should be available",
              "High-pressure coolant recommended for effective cooling",
              "If dry machining required, use very light cuts and monitor continuously"
            ],
            score: 0.5
          }
        );
      }
    }
    
    // Magnesium special case (CRITICAL SAFETY)
    if (params.material_name?.toLowerCase().includes("magnesium") ||
        params.material_name?.toLowerCase().includes("az91")) {
      return hookWarning(hook,
        "⚠️ MAGNESIUM: Special precautions required",
        {
          warnings: [
            "FIRE HAZARD: Magnesium chips are highly flammable",
            "DO NOT use water-based coolant - hydrogen explosion risk",
            "Use mineral oil or dry machining with proper extraction",
            "Fire suppression: Use Class D extinguisher (NOT water)",
            "Keep chips dry and dispose of properly"
          ],
          score: 0.6
        }
      );
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook,
        `Coolant concerns for ${operation} on ${group}`,
        { warnings }
      );
    }
    
    return hookSuccess(hook, `Coolant settings OK for ${operation}`);
  }
};

// ============================================================================
// G-CODE SAFETY HOOKS
// ============================================================================

/**
 * Validate work coordinate system
 */
const preWorkOffsetValidation: HookDefinition = {
  id: "pre-work-offset-validation",
  name: "Work Offset Validation",
  description: "Validates work coordinate system selection and consistency.",
  
  phase: "pre-code-generate",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["work-offset", "coordinates", "setup", "G54"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preWorkOffsetValidation;
    
    const gcode = context.content?.new as string | undefined;
    
    if (!gcode) {
      return hookSuccess(hook, "No G-code to validate");
    }
    
    const warnings: string[] = [];
    
    // Check for work offset in G-code
    const hasWorkOffset = /G5[4-9]|G54\.1\s*P\d+/i.test(gcode);
    if (!hasWorkOffset) {
      warnings.push("⚠️ No work offset (G54-G59) specified in program");
      warnings.push("Machine will use current/previous work coordinates");
      warnings.push("RECOMMEND: Explicitly set work offset at program start");
    }
    
    // Check for multiple work offsets (potential setup complexity)
    const offsets = gcode.match(/G5[4-9]|G54\.1\s*P\d+/gi) || [];
    const uniqueOffsets = new Set(offsets.map(o => o.toUpperCase().replace(/\s+/g, "")));
    
    if (uniqueOffsets.size > 1) {
      warnings.push(`Multiple work offsets used: ${Array.from(uniqueOffsets).join(", ")}`);
      warnings.push("Verify ALL offsets are set up correctly before running");
    }
    
    // Check for G53 (machine coordinates) - potentially dangerous
    if (/G53/i.test(gcode)) {
      const g53Lines = gcode.match(/.*G53.*/gi) || [];
      warnings.push(`G53 (machine coordinates) used ${g53Lines.length} times`);
      warnings.push("G53 bypasses work offsets - verify positions are correct");
    }
    
    // Check work offset at start vs later in program
    const lines = gcode.split("\n");
    let firstWorkOffsetLine = -1;
    let firstCuttingLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (firstWorkOffsetLine < 0 && /G5[4-9]/i.test(line)) {
        firstWorkOffsetLine = i;
      }
      if (firstCuttingLine < 0 && /G0?[123]\s+.*[XYZ]/i.test(line) && !/G28|G30/i.test(line)) {
        firstCuttingLine = i;
      }
    }
    
    if (firstCuttingLine >= 0 && firstCuttingLine < firstWorkOffsetLine) {
      warnings.push("⚠️ Cutting move found BEFORE work offset is set");
      warnings.push("Movement may be in wrong coordinate system");
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook, "Work offset concerns", { warnings });
    }
    
    return hookSuccess(hook, "Work offset validation passed");
  }
};

/**
 * Tool change safety validation
 */
const preToolChangeSafety: HookDefinition = {
  id: "pre-tool-change-safety",
  name: "Tool Change Safety",
  description: "Validates safe conditions for tool changes.",
  
  phase: "pre-code-generate",
  category: "manufacturing",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["tool-change", "safety", "collision", "M6"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preToolChangeSafety;
    
    const gcode = context.content?.new as string | undefined;
    
    if (!gcode) {
      return hookSuccess(hook, "No G-code to validate");
    }
    
    const issues: string[] = [];
    const warnings: string[] = [];
    const lines = gcode.split("\n");
    
    // Find all tool change commands
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Check for M6 (tool change)
      if (/M0?6/i.test(line)) {
        // Look backwards for safe positioning
        const prevLines = lines.slice(Math.max(0, i - 10), i);
        
        // Check for Z retract before tool change
        const hasZRetract = prevLines.some(l => 
          /G28.*Z|G30.*Z|G53.*Z|Z\s*(5[0-9]|[6-9]\d|\d{3,})/i.test(l)
        );
        
        if (!hasZRetract) {
          issues.push(`Line ${lineNum}: Tool change (M6) without Z retract to safe height`);
        }
        
        // Check spindle stopped
        const hasSpindleStop = prevLines.some(l => /M0?5/i.test(l));
        if (!hasSpindleStop) {
          warnings.push(`Line ${lineNum}: Verify spindle stopped before tool change`);
        }
        
        // Check for coolant off
        const hasCoolantOff = prevLines.some(l => /M0?9/i.test(l));
        if (!hasCoolantOff) {
          warnings.push(`Line ${lineNum}: Consider coolant off (M9) before tool change`);
        }
      }
    }
    
    // Check for T without M6
    const tCalls = gcode.match(/T\d+/gi) || [];
    const m6Calls = gcode.match(/M0?6/gi) || [];
    
    if (tCalls.length > m6Calls.length + 1) {
      warnings.push("More T-numbers than M6 commands - some tool calls may not execute change");
    }
    
    if (issues.length > 0) {
      return hookBlock(hook,
        `⛔ TOOL CHANGE SAFETY VIOLATION`,
        { issues, warnings }
      );
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook, "Tool change warnings", { warnings });
    }
    
    return hookSuccess(hook, "Tool change safety validated");
  }
};

/**
 * Rapid traverse safety
 */
const preRapidTraverseSafety: HookDefinition = {
  id: "pre-rapid-traverse-safety",
  name: "Rapid Traverse Safety",
  description: "Validates rapid traverse moves for collision risk.",
  
  phase: "pre-code-generate",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["rapid", "G00", "collision", "safety"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preRapidTraverseSafety;
    
    const gcode = context.content?.new as string | undefined;
    const machineType = context.metadata?.machine_type as string || "vertical_mill";
    
    if (!gcode) {
      return hookSuccess(hook, "No G-code to validate");
    }
    
    const warnings: string[] = [];
    const safeZ = SAFE_Z_HEIGHT[machineType] || 50;
    
    const lines = gcode.split("\n");
    let currentZ = safeZ; // Assume starting safe
    let inRapid = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Track G00/G01 mode
      if (/G0?0\b/i.test(line)) inRapid = true;
      if (/G0?1\b/i.test(line)) inRapid = false;
      
      // Track Z position
      const zMatch = line.match(/Z\s*(-?\d+\.?\d*)/i);
      if (zMatch) {
        currentZ = parseFloat(zMatch[1]);
      }
      
      // Check rapid moves
      if (inRapid || /G0?0\s+.*[XYZ]/i.test(line)) {
        // Rapid Z plunge (dangerous)
        if (zMatch) {
          const zValue = parseFloat(zMatch[1]);
          
          if (zValue < 0) {
            warnings.push(`Line ${lineNum}: Rapid Z plunge to ${zValue}mm - VERIFY CLEARANCE`);
          } else if (zValue < 5) {
            warnings.push(`Line ${lineNum}: Rapid to low Z (${zValue}mm) - collision risk`);
          }
        }
        
        // Rapid XY at low Z
        const hasXY = /[XY]\s*-?\d+\.?\d*/i.test(line);
        const hasZ = zMatch !== null;
        
        if (hasXY && !hasZ && currentZ < safeZ) {
          warnings.push(`Line ${lineNum}: Rapid XY at Z=${currentZ}mm (below safe height ${safeZ}mm)`);
        }
      }
    }
    
    // Limit warnings
    if (warnings.length > 10) {
      const total = warnings.length;
      warnings.length = 10;
      warnings.push(`... and ${total - 10} more rapid traverse warnings`);
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook,
        `Rapid traverse concerns (${warnings.length})`,
        { warnings, data: { safeZ } }
      );
    }
    
    return hookSuccess(hook, "Rapid traverse safety validated");
  }
};

// ============================================================================
// EXPORT ALL ADVANCED MANUFACTURING HOOKS
// ============================================================================

export const advancedManufacturingHooks: HookDefinition[] = [
  // Chip control
  onChipBreakingValidation,
  
  // Stability
  onStabilityCheck,
  
  // Power & Torque
  onPowerConsumptionValidation,
  onTorqueValidation,
  
  // Coolant
  onCoolantRequirementValidation,
  
  // G-Code Safety
  preWorkOffsetValidation,
  preToolChangeSafety,
  preRapidTraverseSafety
];

export {
  onChipBreakingValidation,
  onStabilityCheck,
  onPowerConsumptionValidation,
  onTorqueValidation,
  onCoolantRequirementValidation,
  preWorkOffsetValidation,
  preToolChangeSafety,
  preRapidTraverseSafety,
  CHIP_THICKNESS_RATIO,
  MIN_STABLE_SPEED,
  POWER_FACTOR,
  COOLANT_REQUIRED,
  SAFE_Z_HEIGHT,
  MAX_LD_RATIO
};
