/**
 * PRISM MCP Server - Manufacturing Hooks
 * Session 6.2D: Physics Enforcement, Limits, Safety Interlocks
 * 
 * Domain-specific hooks for CNC manufacturing:
 * - Cutting force limits
 * - Thermal envelope protection
 * - Tool life monitoring
 * - Machine capability checks
 * - G-code safety validation
 * - Deflection limits
 * - Surface finish validation
 * 
 * Memory application: #1 Safety (lives at stake), #15 Formula-Driven
 * 
 * THESE HOOKS PROTECT LIVES. Manufacturing calculations with wrong
 * values can cause:
 * - Tool explosion (exceeding force limits)
 * - Spindle damage (thermal runaway)
 * - Operator injury (flying debris)
 * - Machine destruction (crash)
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
// CONSTANTS - MANUFACTURING SAFETY LIMITS
// ============================================================================

// Maximum cutting force limits by machine type (Newtons)
const MAX_CUTTING_FORCE: Record<string, number> = {
  light_duty: 5000,      // Small VMCs, desktop CNC
  medium_duty: 15000,    // Standard VMCs
  heavy_duty: 50000,     // Large machines, HMCs
  ultra_heavy: 100000    // Large boring mills
};

// Maximum spindle temperature rise (°C above ambient)
const MAX_SPINDLE_TEMP_RISE = 50;

// Maximum tool deflection (mm) - varies by operation
const MAX_DEFLECTION: Record<string, number> = {
  roughing: 0.1,
  semi_finishing: 0.05,
  finishing: 0.02,
  precision: 0.005
};

// Minimum tool life thresholds (minutes)
const MIN_TOOL_LIFE: Record<string, number> = {
  roughing: 15,
  finishing: 30,
  precision: 45
};

// Surface finish limits (Ra in μm)
const SURFACE_FINISH_LIMITS: Record<string, { min: number; max: number }> = {
  rough: { min: 6.3, max: 25 },
  semi_finish: { min: 1.6, max: 6.3 },
  finish: { min: 0.4, max: 1.6 },
  precision: { min: 0.1, max: 0.4 }
};

// Chip thickness limits (mm)
const CHIP_THICKNESS_LIMITS = {
  min: 0.01,   // Below this: rubbing, poor chip formation
  max: 0.5    // Above this: excessive force, tool breakage risk
};

// MRR limits by material group (cm³/min)
const MAX_MRR: Record<string, number> = {
  P: 500,    // Steel
  M: 200,    // Stainless
  K: 800,    // Cast iron
  N: 2000,   // Aluminum
  S: 50,     // Superalloys
  H: 100     // Hardened
};

// ============================================================================
// FORCE LIMIT HOOKS
// ============================================================================

/**
 * Cutting force limit check
 */
const onForceLimit: HookDefinition = {
  id: "on-force-limit",
  name: "Cutting Force Limit Check",
  description: "Validates calculated cutting forces are within machine/tool limits. BLOCKS if exceeded.",
  
  phase: "on-force-limit",
  category: "manufacturing",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["force", "kienzle", "safety", "critical"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onForceLimit;
    
    const data = context.target?.data as {
      Fc?: number;           // Main cutting force
      Ff?: number;           // Feed force
      Fp?: number;           // Passive/thrust force
      machineClass?: string; // Machine duty class
      toolDiameter?: number; // mm
    };
    
    if (!data?.Fc) {
      return hookWarning(hook, "No cutting force data to validate");
    }
    
    const machineClass = data.machineClass || "medium_duty";
    const maxForce = MAX_CUTTING_FORCE[machineClass] || MAX_CUTTING_FORCE.medium_duty;
    
    // Calculate total force magnitude
    const Fc = data.Fc;
    const Ff = data.Ff || 0;
    const Fp = data.Fp || 0;
    const totalForce = Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp);
    
    // Safety factor of 1.5 for dynamic effects
    const effectiveLimit = maxForce / 1.5;
    
    if (totalForce > maxForce) {
      return hookBlock(hook,
        `🛑 FORCE LIMIT EXCEEDED: ${totalForce.toFixed(0)}N > ${maxForce}N (${machineClass})`,
        {
          score: effectiveLimit / totalForce,
          threshold: 1.0,
          issues: [
            `Total force: ${totalForce.toFixed(0)}N`,
            `Limit: ${maxForce}N for ${machineClass}`,
            "DANGER: Risk of tool breakage, spindle damage, or operator injury",
            "REDUCE: depth of cut, feed rate, or cutting speed"
          ]
        }
      );
    }
    
    if (totalForce > effectiveLimit) {
      return hookWarning(hook,
        `⚠️ Force approaching limit: ${totalForce.toFixed(0)}N / ${maxForce}N (${((totalForce/maxForce)*100).toFixed(0)}%)`,
        {
          score: effectiveLimit / totalForce,
          warnings: ["Consider reducing parameters for safety margin"]
        }
      );
    }
    
    return hookSuccess(hook,
      `Force within limits: ${totalForce.toFixed(0)}N / ${maxForce}N (${((totalForce/maxForce)*100).toFixed(0)}%)`,
      {
        score: 1 - (totalForce / maxForce),
        data: { Fc, Ff, Fp, totalForce, maxForce, machineClass }
      }
    );
  }
};

/**
 * Specific cutting force validation
 */
const preCalculationForceBounds: HookDefinition = {
  id: "pre-calculation-force-bounds",
  name: "Force Calculation Input Bounds",
  description: "Validates inputs to force calculations are within physical bounds.",
  
  phase: "pre-calculation",
  category: "manufacturing",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["force", "input", "validation"],
  
  condition: (context: HookContext): boolean => {
    return context.operation?.includes("force") || context.operation?.includes("kienzle");
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = preCalculationForceBounds;
    
    const data = context.target?.data as {
      depth_of_cut?: number;  // ap in mm
      feed_per_tooth?: number; // fz in mm
      cutting_speed?: number;  // Vc in m/min
      width_of_cut?: number;   // ae in mm
    };
    
    const issues: string[] = [];
    
    // Depth of cut bounds
    if (data?.depth_of_cut !== undefined) {
      if (data.depth_of_cut <= 0) issues.push(`Invalid depth of cut: ${data.depth_of_cut}mm (must be > 0)`);
      if (data.depth_of_cut > 25) issues.push(`Depth of cut ${data.depth_of_cut}mm exceeds typical max (25mm)`);
    }
    
    // Feed per tooth bounds
    if (data?.feed_per_tooth !== undefined) {
      if (data.feed_per_tooth <= 0) issues.push(`Invalid feed per tooth: ${data.feed_per_tooth}mm`);
      if (data.feed_per_tooth > 1.0) issues.push(`Feed per tooth ${data.feed_per_tooth}mm exceeds typical max (1.0mm)`);
      if (data.feed_per_tooth < CHIP_THICKNESS_LIMITS.min) {
        issues.push(`Feed ${data.feed_per_tooth}mm below min chip thickness - rubbing will occur`);
      }
    }
    
    // Cutting speed bounds
    if (data?.cutting_speed !== undefined) {
      if (data.cutting_speed <= 0) issues.push(`Invalid cutting speed: ${data.cutting_speed}m/min`);
      if (data.cutting_speed > 2000) issues.push(`Cutting speed ${data.cutting_speed}m/min unusually high`);
    }
    
    if (issues.length > 0) {
      return hookBlock(hook, `Input parameters out of bounds`, {
        issues
      });
    }
    
    return hookSuccess(hook, "Force calculation inputs valid");
  }
};

// ============================================================================
// THERMAL LIMIT HOOKS
// ============================================================================

/**
 * Thermal envelope protection
 */
const onThermalLimit: HookDefinition = {
  id: "on-thermal-limit",
  name: "Thermal Envelope Check",
  description: "Validates cutting temperatures don't exceed tool/material limits.",
  
  phase: "on-thermal-limit",
  category: "manufacturing",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["thermal", "temperature", "safety"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onThermalLimit;
    
    const data = context.target?.data as {
      cuttingTemp?: number;      // °C at tool-chip interface
      toolMaxTemp?: number;      // Tool material max temp
      materialMeltingPoint?: number;
      spindleTempRise?: number;  // °C above ambient
    };
    
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Tool temperature check
    if (data?.cuttingTemp && data?.toolMaxTemp) {
      if (data.cuttingTemp > data.toolMaxTemp) {
        issues.push(`Cutting temp ${data.cuttingTemp}°C exceeds tool max ${data.toolMaxTemp}°C - rapid tool wear/failure`);
      } else if (data.cuttingTemp > data.toolMaxTemp * 0.85) {
        warnings.push(`Cutting temp ${data.cuttingTemp}°C approaching tool limit ${data.toolMaxTemp}°C`);
      }
    }
    
    // Material melting check (for aluminum, plastics)
    if (data?.cuttingTemp && data?.materialMeltingPoint) {
      if (data.cuttingTemp > data.materialMeltingPoint * 0.5) {
        warnings.push(`Cutting temp may cause material softening/smearing`);
      }
    }
    
    // Spindle temperature
    if (data?.spindleTempRise && data.spindleTempRise > MAX_SPINDLE_TEMP_RISE) {
      issues.push(`Spindle temperature rise ${data.spindleTempRise}°C exceeds limit ${MAX_SPINDLE_TEMP_RISE}°C`);
    }
    
    if (issues.length > 0) {
      return hookBlock(hook, `🛑 THERMAL LIMITS EXCEEDED`, {
        issues
      });
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook, `⚠️ Thermal warnings`, {
        warnings
      });
    }
    
    return hookSuccess(hook, "Thermal envelope OK", {
      data: { cuttingTemp: data?.cuttingTemp }
    });
  }
};

// ============================================================================
// TOOL LIFE HOOKS
// ============================================================================

/**
 * Tool life warning
 */
const onToolLifeWarning: HookDefinition = {
  id: "on-tool-life-warning",
  name: "Tool Life Check",
  description: "Validates predicted tool life meets minimum requirements.",
  
  phase: "on-tool-life-warning",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["tool-life", "taylor", "wear"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onToolLifeWarning;
    
    const data = context.target?.data as {
      predictedToolLife?: number;  // minutes
      operationType?: string;
      toolCost?: number;
    };
    
    if (!data?.predictedToolLife) {
      return hookWarning(hook, "No tool life prediction available");
    }
    
    const opType = data.operationType || "roughing";
    const minLife = MIN_TOOL_LIFE[opType] || MIN_TOOL_LIFE.roughing;
    
    if (data.predictedToolLife < minLife) {
      return hookWarning(hook,
        `⚠️ Short tool life: ${data.predictedToolLife.toFixed(1)} min < ${minLife} min (${opType})`,
        {
          score: data.predictedToolLife / minLife,
          warnings: [
            `Predicted: ${data.predictedToolLife.toFixed(1)} minutes`,
            `Minimum for ${opType}: ${minLife} minutes`,
            "Consider: reducing cutting speed, using better tool grade"
          ]
        }
      );
    }
    
    if (data.predictedToolLife < minLife * 1.5) {
      return hookWarning(hook,
        `Tool life acceptable but short: ${data.predictedToolLife.toFixed(1)} min`,
        {
          score: data.predictedToolLife / (minLife * 2),
          warnings: ["Consider parameters optimization for longer tool life"]
        }
      );
    }
    
    return hookSuccess(hook,
      `Tool life OK: ${data.predictedToolLife.toFixed(1)} min (min: ${minLife} for ${opType})`,
      {
        score: Math.min(data.predictedToolLife / (minLife * 2), 1),
        data: { predictedToolLife: data.predictedToolLife, minLife, opType }
      }
    );
  }
};

// ============================================================================
// MACHINE CAPABILITY HOOKS
// ============================================================================

/**
 * Machine capability envelope check
 */
const onMachineLimit: HookDefinition = {
  id: "on-machine-limit",
  name: "Machine Capability Check",
  description: "Validates operation parameters within machine capability envelope.",
  
  phase: "on-machine-limit",
  category: "manufacturing",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["machine", "capability", "envelope"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onMachineLimit;
    
    const data = context.target?.data as {
      requiredRPM?: number;
      requiredPower?: number;     // kW
      requiredTorque?: number;    // Nm
      machineMaxRPM?: number;
      machineMaxPower?: number;
      machineMaxTorque?: number;
      feedRate?: number;          // mm/min
      maxFeedRate?: number;
    };
    
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Spindle speed check
    if (data?.requiredRPM && data?.machineMaxRPM) {
      if (data.requiredRPM > data.machineMaxRPM) {
        issues.push(`Required RPM ${data.requiredRPM} exceeds machine max ${data.machineMaxRPM}`);
      } else if (data.requiredRPM > data.machineMaxRPM * 0.95) {
        warnings.push(`RPM ${data.requiredRPM} near machine limit`);
      }
    }
    
    // Power check
    if (data?.requiredPower && data?.machineMaxPower) {
      if (data.requiredPower > data.machineMaxPower) {
        issues.push(`Required power ${data.requiredPower}kW exceeds machine max ${data.machineMaxPower}kW`);
      } else if (data.requiredPower > data.machineMaxPower * 0.90) {
        warnings.push(`Power ${data.requiredPower}kW at ${((data.requiredPower/data.machineMaxPower)*100).toFixed(0)}% of max`);
      }
    }
    
    // Torque check
    if (data?.requiredTorque && data?.machineMaxTorque) {
      if (data.requiredTorque > data.machineMaxTorque) {
        issues.push(`Required torque ${data.requiredTorque}Nm exceeds machine max ${data.machineMaxTorque}Nm`);
      }
    }
    
    // Feed rate check
    if (data?.feedRate && data?.maxFeedRate) {
      if (data.feedRate > data.maxFeedRate) {
        issues.push(`Feed rate ${data.feedRate}mm/min exceeds machine max ${data.maxFeedRate}mm/min`);
      }
    }
    
    if (issues.length > 0) {
      return hookBlock(hook, `🛑 MACHINE CAPABILITY EXCEEDED`, {
        issues
      });
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook, `⚠️ Machine capability warnings`, {
        warnings
      });
    }
    
    return hookSuccess(hook, "Within machine capability envelope");
  }
};

// ============================================================================
// DEFLECTION HOOKS
// ============================================================================

/**
 * Tool deflection check
 */
const onDeflectionLimit: HookDefinition = {
  id: "on-deflection-limit",
  name: "Tool Deflection Check",
  description: "Validates tool deflection within tolerance for operation type.",
  
  phase: "post-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["deflection", "tolerance", "quality"],
  
  condition: (context: HookContext): boolean => {
    return context.operation?.includes("deflection") || 
           context.metadata?.includeDeflection === true;
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = onDeflectionLimit;
    
    const data = context.target?.data as {
      deflection?: number;       // mm
      operationType?: string;
      tolerance?: number;        // mm
    };
    
    if (!data?.deflection) {
      return hookSuccess(hook, "No deflection data");
    }
    
    const opType = data.operationType || "roughing";
    const maxDeflection = data.tolerance || MAX_DEFLECTION[opType] || MAX_DEFLECTION.roughing;
    
    if (data.deflection > maxDeflection) {
      return hookWarning(hook,
        `⚠️ Deflection ${data.deflection.toFixed(4)}mm exceeds limit ${maxDeflection}mm for ${opType}`,
        {
          score: maxDeflection / data.deflection,
          warnings: [
            "May cause: dimensional errors, poor surface finish, chatter",
            "Consider: shorter tool, larger diameter, reduced depth"
          ]
        }
      );
    }
    
    return hookSuccess(hook,
      `Deflection OK: ${data.deflection.toFixed(4)}mm / ${maxDeflection}mm`,
      { score: 1 - (data.deflection / maxDeflection) }
    );
  }
};

// ============================================================================
// SURFACE FINISH HOOKS
// ============================================================================

/**
 * Surface finish validation
 */
const onSurfaceFinishValidation: HookDefinition = {
  id: "on-surface-finish-validation",
  name: "Surface Finish Validation",
  description: "Validates predicted surface finish meets requirements.",
  
  phase: "post-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["surface-finish", "Ra", "quality"],
  
  condition: (context: HookContext): boolean => {
    return context.operation?.includes("surface") || 
           context.metadata?.includeSurfaceFinish === true;
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = onSurfaceFinishValidation;
    
    const data = context.target?.data as {
      predictedRa?: number;      // μm
      requiredRa?: number;       // μm
      operationType?: string;
    };
    
    if (!data?.predictedRa) {
      return hookSuccess(hook, "No surface finish data");
    }
    
    // Check against required Ra if specified
    if (data.requiredRa && data.predictedRa > data.requiredRa) {
      return hookWarning(hook,
        `⚠️ Predicted Ra ${data.predictedRa}μm exceeds required ${data.requiredRa}μm`,
        {
          score: data.requiredRa / data.predictedRa,
          warnings: [
            "Surface finish will not meet specification",
            "Consider: finer feed, sharper tool, finishing pass"
          ]
        }
      );
    }
    
    // Check against operation type limits
    const opType = data.operationType || "semi_finish";
    const limits = SURFACE_FINISH_LIMITS[opType];
    
    if (limits && data.predictedRa > limits.max) {
      return hookWarning(hook,
        `Predicted Ra ${data.predictedRa}μm coarser than typical for ${opType}`,
        { warnings: [`Typical range: ${limits.min}-${limits.max}μm`] }
      );
    }
    
    return hookSuccess(hook,
      `Surface finish OK: Ra ${data.predictedRa}μm`,
      { data: { predictedRa: data.predictedRa, opType } }
    );
  }
};

// ============================================================================
// MATERIAL REMOVAL RATE HOOKS
// ============================================================================

/**
 * MRR limit check
 */
const onMRRLimit: HookDefinition = {
  id: "on-mrr-limit",
  name: "Material Removal Rate Check",
  description: "Validates MRR is within reasonable limits for material.",
  
  phase: "post-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["mrr", "productivity", "limits"],
  
  condition: (context: HookContext): boolean => {
    return context.metadata?.calculationType === "mrr" ||
           (context.target?.data as any)?.mrr !== undefined;
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = onMRRLimit;
    
    const data = context.target?.data as {
      mrr?: number;            // cm³/min
      isoGroup?: string;
    };
    
    if (!data?.mrr) {
      return hookSuccess(hook, "No MRR data");
    }
    
    const isoGroup = data.isoGroup || "P";
    const maxMRR = MAX_MRR[isoGroup] || MAX_MRR.P;
    
    if (data.mrr > maxMRR) {
      return hookWarning(hook,
        `⚠️ MRR ${data.mrr.toFixed(1)} cm³/min exceeds typical max ${maxMRR} for ISO ${isoGroup}`,
        {
          score: maxMRR / data.mrr,
          warnings: [
            "Very aggressive parameters",
            "Verify machine capability and tool selection"
          ]
        }
      );
    }
    
    return hookSuccess(hook,
      `MRR within limits: ${data.mrr.toFixed(1)} / ${maxMRR} cm³/min`,
      { score: 1 - (data.mrr / (maxMRR * 1.5)) }
    );
  }
};

// ============================================================================
// G-CODE SAFETY HOOKS
// ============================================================================

/**
 * G-code safety validation
 */
const preGcodeOutput: HookDefinition = {
  id: "pre-gcode-output",
  name: "G-code Safety Check",
  description: "Validates G-code for safety before output.",
  
  phase: "pre-code-generate",
  category: "manufacturing",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["gcode", "safety", "output"],
  
  condition: (context: HookContext): boolean => {
    return (context.target?.type as string) === "gcode" ||
           context.metadata?.outputType === "gcode";
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = preGcodeOutput;
    
    const gcode = context.content?.new as string;
    if (!gcode) {
      return hookWarning(hook, "No G-code content to validate");
    }
    
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check for dangerous commands without safety measures
    const dangerousPatterns = [
      { pattern: /G0[01]\s*Z-[5-9]\d/i, msg: "Deep Z plunge without ramp" },
      { pattern: /G0\s.*[XY].*(?!F)/i, msg: "Rapid move without feed rate context" },
      { pattern: /S[5-9]\d{4}/i, msg: "Very high spindle speed (>50000)" },
      { pattern: /F[5-9]\d{4}/i, msg: "Very high feed rate (>50000)" }
    ];
    
    for (const { pattern, msg } of dangerousPatterns) {
      if (pattern.test(gcode)) {
        warnings.push(msg);
      }
    }
    
    // Check for missing safety blocks
    if (!gcode.includes("G28") && !gcode.includes("G53")) {
      warnings.push("No home/safe position command found");
    }
    
    if (!gcode.includes("M05") && !gcode.includes("M30")) {
      warnings.push("No spindle stop command found");
    }
    
    // Check for tool changes without safety retract
    if (/M0?6/i.test(gcode) && !/G28|G53.*Z/i.test(gcode)) {
      issues.push("Tool change without Z safe position");
    }
    
    if (issues.length > 0) {
      return hookBlock(hook, `🛑 G-code safety issues`, { issues });
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook, `⚠️ G-code warnings`, { warnings });
    }
    
    return hookSuccess(hook, "G-code safety check passed");
  }
};

// ============================================================================
// EXPORT ALL MANUFACTURING HOOKS
// ============================================================================

export const manufacturingHooks: HookDefinition[] = [
  onForceLimit,
  preCalculationForceBounds,
  onThermalLimit,
  onToolLifeWarning,
  onMachineLimit,
  onDeflectionLimit,
  onSurfaceFinishValidation,
  onMRRLimit,
  preGcodeOutput
];

export {
  onForceLimit,
  preCalculationForceBounds,
  onThermalLimit,
  onToolLifeWarning,
  onMachineLimit,
  onDeflectionLimit,
  onSurfaceFinishValidation,
  onMRRLimit,
  preGcodeOutput,
  MAX_CUTTING_FORCE,
  MAX_SPINDLE_TEMP_RISE,
  MAX_DEFLECTION,
  MIN_TOOL_LIFE,
  SURFACE_FINISH_LIMITS,
  MAX_MRR
};
