/**
 * PRISM MCP Server - Thread Calculation Tools
 * Session 7.1: 12 MCP Tools for Thread Calculations
 * 
 * SAFETY CRITICAL: Wrong threads = assembly failures
 */

import { threadEngine, ThreadSpec, TapDrillResult, ThreadMillResult, StrippingResult, GaugeResult } from '../engines/ThreadCalculationEngine.js';
import { log } from '../utils/Logger.js';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const threadTools = [
  {
    name: 'calculate_tap_drill',
    description: 'Calculate tap drill size for any thread with specified engagement percentage. Supports ISO metric (M10x1.5), Unified (1/4-20 UNC), pipe threads (1/2-14 NPT), ACME, and trapezoidal.',
    inputSchema: {
      type: 'object',
      required: ['thread_designation'],
      properties: {
        thread_designation: { 
          type: 'string', 
          description: 'Thread specification (e.g., M10x1.5, M10, 1/4-20 UNC, 1/2-14 NPT, 1-5 ACME, Tr20x4)' 
        },
        engagement_percent: { 
          type: 'number', 
          default: 75,
          minimum: 50,
          maximum: 100,
          description: 'Thread engagement percentage (50-100%, default 75%). Use 50-60% for hardened materials.' 
        },
        material: { 
          type: 'string',
          enum: ['aluminum', 'steel', 'stainless', 'cast_iron', 'titanium', 'brass', 'plastic'],
          description: 'Workpiece material for recommendations (optional)' 
        }
      }
    }
  },
  {
    name: 'calculate_thread_mill_params',
    description: 'Calculate thread milling parameters including RPM, feed rate, DOC, and cycle time.',
    inputSchema: {
      type: 'object',
      required: ['thread_designation', 'tool_diameter'],
      properties: {
        thread_designation: { type: 'string', description: 'Thread specification' },
        tool_diameter: { type: 'number', description: 'Thread mill diameter in mm' },
        material: { 
          type: 'string', 
          default: 'steel',
          description: 'Workpiece material' 
        },
        single_point: { 
          type: 'boolean', 
          default: true,
          description: 'Single point (true) or multi-form (false) thread mill' 
        }
      }
    }
  },
  {
    name: 'calculate_thread_depth',
    description: 'Calculate required thread depth based on engagement turns or length.',
    inputSchema: {
      type: 'object',
      required: ['thread_designation'],
      properties: {
        thread_designation: { type: 'string', description: 'Thread specification' },
        engagement_turns: { type: 'number', description: 'Number of full thread turns (e.g., 1.5D = 1.5 × diameter)' },
        engagement_length: { type: 'number', description: 'Engagement length in mm (alternative to turns)' }
      }
    }
  },
  {
    name: 'calculate_engagement_percent',
    description: 'Calculate actual thread engagement percentage from hole diameter.',
    inputSchema: {
      type: 'object',
      required: ['hole_diameter', 'thread_designation'],
      properties: {
        hole_diameter: { type: 'number', description: 'Actual drilled hole diameter in mm' },
        thread_designation: { type: 'string', description: 'Thread specification' }
      }
    }
  },
  {
    name: 'get_thread_specifications',
    description: 'Get complete thread specifications including all diameters, pitch, and tolerances.',
    inputSchema: {
      type: 'object',
      required: ['thread_designation'],
      properties: {
        thread_designation: { type: 'string', description: 'Thread specification (e.g., M10x1.5, 1/4-20 UNC)' }
      }
    }
  },
  {
    name: 'get_go_nogo_gauges',
    description: 'Calculate Go/No-Go gauge dimensions for thread inspection.',
    inputSchema: {
      type: 'object',
      required: ['thread_designation'],
      properties: {
        thread_designation: { type: 'string', description: 'Thread specification' },
        fit_class: { 
          type: 'string', 
          default: '6H',
          description: 'Fit class (6H, 6g for metric; 2B, 2A for unified)' 
        }
      }
    }
  },
  {
    name: 'calculate_pitch_diameter',
    description: 'Calculate thread pitch diameter with tolerances.',
    inputSchema: {
      type: 'object',
      required: ['thread_designation'],
      properties: {
        thread_designation: { type: 'string', description: 'Thread specification' },
        fit_class: { type: 'string', description: 'Fit class for tolerance calculation' }
      }
    }
  },
  {
    name: 'calculate_minor_major_diameter',
    description: 'Calculate thread minor and major diameters with tolerances.',
    inputSchema: {
      type: 'object',
      required: ['thread_designation'],
      properties: {
        thread_designation: { type: 'string', description: 'Thread specification' }
      }
    }
  },
  {
    name: 'select_thread_insert',
    description: 'Recommend threading insert based on thread type, material, and production volume.',
    inputSchema: {
      type: 'object',
      required: ['thread_type', 'material'],
      properties: {
        thread_type: { 
          type: 'string',
          enum: ['ISO', 'UN', 'NPT', 'BSP', 'ACME', 'TRAPEZOIDAL'],
          description: 'Thread type/standard' 
        },
        material: { type: 'string', description: 'Workpiece material' },
        production_volume: { 
          type: 'string',
          enum: ['prototype', 'low', 'medium', 'high'],
          default: 'medium',
          description: 'Production volume' 
        },
        internal_external: {
          type: 'string',
          enum: ['internal', 'external'],
          default: 'external',
          description: 'Internal or external thread'
        }
      }
    }
  },
  {
    name: 'calculate_thread_cutting_params',
    description: 'Calculate threading cutting parameters (speed, feed, passes) for lathe threading.',
    inputSchema: {
      type: 'object',
      required: ['thread_designation', 'material'],
      properties: {
        thread_designation: { type: 'string', description: 'Thread specification' },
        material: { type: 'string', description: 'Workpiece material' },
        hardness: { type: 'number', description: 'Material hardness (HRC or HB)' },
        tool_type: { 
          type: 'string',
          enum: ['HSS', 'carbide', 'ceramic', 'CBN'],
          default: 'carbide',
          description: 'Tool material' 
        }
      }
    }
  },
  {
    name: 'validate_thread_fit_class',
    description: 'Validate thread fit class and get tolerance zone information.',
    inputSchema: {
      type: 'object',
      required: ['thread_designation', 'fit_class'],
      properties: {
        thread_designation: { type: 'string', description: 'Thread specification' },
        fit_class: { type: 'string', description: 'Fit class (1A-3A, 1B-3B, 4g-8g, 4H-8H)' }
      }
    }
  },
  {
    name: 'generate_thread_gcode',
    description: 'Generate G-code for tapping or thread milling operations.',
    inputSchema: {
      type: 'object',
      required: ['thread_designation', 'operation', 'depth'],
      properties: {
        thread_designation: { type: 'string', description: 'Thread specification' },
        operation: { 
          type: 'string',
          enum: ['tap', 'thread_mill'],
          description: 'Threading operation type' 
        },
        depth: { type: 'number', description: 'Thread depth in mm' },
        tool_diameter: { type: 'number', description: 'Tool diameter for thread milling (mm)' },
        controller: { 
          type: 'string',
          enum: ['FANUC', 'HAAS', 'SIEMENS', 'MAZAK', 'OKUMA', 'HEIDENHAIN'],
          default: 'FANUC',
          description: 'CNC controller type' 
        },
        spindle_speed: { type: 'number', default: 500, description: 'Spindle speed (RPM)' }
      }
    }
  }
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

export async function handleThreadTool(name: string, args: Record<string, any>): Promise<any> {
  log.info(`[ThreadTools] Handling: ${name}`, args);
  
  try {
    switch (name) {
      case 'calculate_tap_drill': {
        const designation = args.thread_designation || args.thread_size || args.size;
        if (!designation) {
          return { error: "Missing required param: thread_designation (e.g. 'M10x1.5' or '1/4-20')" };
        }
        const result = threadEngine.calculateTapDrill(
          designation,
          args.engagement_percent || 75
        );
        if (!result) {
          return { error: `Could not find thread: ${designation}` };
        }
        // Add material-specific recommendations
        if (args.material) {
          if (['titanium', 'stainless'].includes(args.material) && args.engagement_percent > 65) {
            result.warnings.push(`For ${args.material}, recommend 50-65% engagement`);
          }
        }
        return result;
      }
      
      case 'calculate_thread_mill_params': {
        const result = threadEngine.calculateThreadMillParams(
          args.thread_designation,
          args.tool_diameter,
          args.material || 'steel',
          args.single_point !== false
        );
        if (!result) {
          return { error: `Could not find thread: ${args.thread_designation}` };
        }
        return result;
      }
      
      case 'calculate_thread_depth': {
        const thread = threadEngine.findThread(args.thread_designation);
        if (!thread) {
          return { error: `Could not find thread: ${args.thread_designation}` };
        }
        
        let engagementLength: number;
        if (args.engagement_length) {
          engagementLength = args.engagement_length;
        } else if (args.engagement_turns) {
          engagementLength = args.engagement_turns * thread.nominalDiameter;
        } else {
          engagementLength = 1.5 * thread.nominalDiameter; // Default 1.5D
        }
        
        const drillDepth = engagementLength + (2 * thread.pitch); // Extra for tap lead
        const chamferAllowance = 0.5 * thread.pitch;
        
        return {
          threadDesignation: thread.designation,
          engagementLength: Math.round(engagementLength * 100) / 100,
          threadDepth: Math.round(engagementLength * 100) / 100,
          drillDepth: Math.round(drillDepth * 100) / 100,
          chamferAllowance: Math.round(chamferAllowance * 100) / 100,
          fullThreadTurns: Math.round(engagementLength / thread.pitch * 10) / 10
        };
      }
      
      case 'calculate_engagement_percent': {
        const engagement = threadEngine.calculateEngagement(
          args.hole_diameter,
          args.thread_designation
        );
        if (engagement === null) {
          return { error: `Could not find thread: ${args.thread_designation}` };
        }
        
        const warnings: string[] = [];
        if (engagement < 60) warnings.push('Low engagement - thread may strip under load');
        if (engagement > 85) warnings.push('High engagement - may cause tap breakage');
        
        return {
          threadDesignation: args.thread_designation,
          holeDiameter: args.hole_diameter,
          engagementPercent: engagement,
          status: engagement >= 60 && engagement <= 80 ? 'GOOD' : 'WARNING',
          warnings
        };
      }
      
      case 'get_thread_specifications': {
        const thread = threadEngine.findThread(args.thread_designation);
        if (!thread) {
          return { error: `Could not find thread: ${args.thread_designation}` };
        }
        return {
          designation: thread.designation,
          type: thread.type,
          nominalDiameter_mm: thread.nominalDiameter,
          pitch_mm: thread.pitch,
          tpi: thread.tpi || Math.round(25.4 / thread.pitch * 10) / 10,
          majorDiameter_mm: thread.majorDiameter,
          pitchDiameter_mm: thread.pitchDiameter,
          minorDiameter_mm: thread.minorDiameter,
          threadAngle_deg: thread.threadAngle,
          isTapered: thread.isTapered,
          taperPerInch: thread.taperPerInch || 0
        };
      }
      
      case 'get_go_nogo_gauges': {
        const result = threadEngine.calculateGauges(
          args.thread_designation,
          args.fit_class || '6H'
        );
        if (!result) {
          return { error: `Could not find thread: ${args.thread_designation}` };
        }
        return result;
      }
      
      case 'calculate_pitch_diameter': {
        const thread = threadEngine.findThread(args.thread_designation);
        if (!thread) {
          return { error: `Could not find thread: ${args.thread_designation}` };
        }
        const tolerance = 0.02 * thread.pitch; // Simplified
        return {
          threadDesignation: thread.designation,
          pitchDiameter_mm: thread.pitchDiameter,
          tolerance_mm: Math.round(tolerance * 1000) / 1000,
          minPitchDiameter: Math.round((thread.pitchDiameter - tolerance) * 1000) / 1000,
          maxPitchDiameter: Math.round((thread.pitchDiameter + tolerance) * 1000) / 1000
        };
      }
      
      case 'calculate_minor_major_diameter': {
        const thread = threadEngine.findThread(args.thread_designation);
        if (!thread) {
          return { error: `Could not find thread: ${args.thread_designation}` };
        }
        return {
          threadDesignation: thread.designation,
          majorDiameter_mm: thread.majorDiameter,
          pitchDiameter_mm: thread.pitchDiameter,
          minorDiameter_mm: thread.minorDiameter,
          threadDepth_mm: Math.round((thread.majorDiameter - thread.minorDiameter) / 2 * 1000) / 1000
        };
      }
      
      case 'select_thread_insert': {
        const recommendations = selectThreadInsert(
          args.thread_type,
          args.material,
          args.production_volume || 'medium',
          args.internal_external || 'external'
        );
        return recommendations;
      }
      
      case 'calculate_thread_cutting_params': {
        const thread = threadEngine.findThread(args.thread_designation);
        if (!thread) {
          return { error: `Could not find thread: ${args.thread_designation}` };
        }
        
        const params = calculateThreadCuttingParams(
          thread,
          args.material,
          args.hardness,
          args.tool_type || 'carbide'
        );
        return params;
      }
      
      case 'validate_thread_fit_class': {
        const validation = validateFitClass(args.thread_designation, args.fit_class);
        return validation;
      }
      
      case 'generate_thread_gcode': {
        if (args.operation === 'tap') {
          return {
            gcode: threadEngine.generateTappingGcode(
              args.thread_designation,
              args.depth,
              args.controller || 'FANUC',
              args.spindle_speed || 500
            )
          };
        } else {
          if (!args.tool_diameter) {
            return { error: 'tool_diameter required for thread milling' };
          }
          return {
            gcode: threadEngine.generateThreadMillGcode(
              args.thread_designation,
              args.depth,
              args.tool_diameter,
              args.controller || 'FANUC'
            )
          };
        }
      }
      
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    log.error(`[ThreadTools] Error in ${name}:`, error);
    return { error: `Tool error: ${(error as Error).message}` };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function selectThreadInsert(
  threadType: string,
  material: string,
  volume: string,
  internalExternal: string
): any {
  const inserts: any[] = [];
  
  // Profile type based on thread
  const profile = threadType === 'ISO' || threadType === 'UN' ? 'ISO/UN 60°' :
                  threadType === 'NPT' ? 'NPT 60°' :
                  threadType === 'BSP' ? 'BSP 55°' :
                  threadType === 'ACME' ? 'ACME 29°' : 'Trapezoidal 30°';
  
  // Insert grade based on material
  const grades: Record<string, string[]> = {
    'aluminum': ['H10', 'K10', 'uncoated carbide'],
    'steel': ['P20', 'P30', 'TiAlN coated'],
    'stainless': ['M20', 'M30', 'TiCN coated'],
    'cast_iron': ['K20', 'K30', 'ceramic'],
    'titanium': ['S10', 'S20', 'uncoated carbide'],
    'brass': ['N10', 'K10', 'uncoated carbide']
  };
  
  const recommendedGrades = grades[material.toLowerCase()] || grades['steel'];
  
  // Insert style
  const style = internalExternal === 'internal' ? 
    (volume === 'high' ? 'Full profile internal' : 'Partial profile internal') :
    (volume === 'high' ? 'Full profile laydown' : 'V-profile');
  
  inserts.push({
    profile,
    style,
    recommendedGrades,
    chipBreaker: ['aluminum', 'brass'].includes(material.toLowerCase()) ? 'Sharp' : 'Standard',
    coolant: ['titanium', 'stainless'].includes(material.toLowerCase()) ? 'Required (high pressure)' : 'Recommended'
  });
  
  return {
    threadType,
    material,
    productionVolume: volume,
    recommendations: inserts
  };
}

function calculateThreadCuttingParams(
  thread: ThreadSpec,
  material: string,
  hardness: number | undefined,
  toolType: string
): any {
  // Base cutting speed by material and tool
  const baseSpeeds: Record<string, Record<string, number>> = {
    'HSS': { aluminum: 30, steel: 15, stainless: 10, titanium: 5, cast_iron: 20 },
    'carbide': { aluminum: 150, steel: 100, stainless: 60, titanium: 30, cast_iron: 100 },
    'ceramic': { aluminum: 200, steel: 150, stainless: 80, titanium: 40, cast_iron: 150 },
    'CBN': { aluminum: 100, steel: 200, stainless: 100, titanium: 50, cast_iron: 200 }
  };
  
  const speeds = baseSpeeds[toolType] || baseSpeeds['carbide'];
  let cuttingSpeed = speeds[material.toLowerCase()] || speeds['steel'];
  
  // Adjust for hardness
  if (hardness) {
    if (hardness > 45) cuttingSpeed *= 0.5;
    else if (hardness > 35) cuttingSpeed *= 0.7;
    else if (hardness > 25) cuttingSpeed *= 0.85;
  }
  
  // Calculate infeed based on thread pitch
  const pitch = thread.pitch;
  const threadDepth = 0.6134 * pitch;
  
  // Number of passes (radial infeed strategy)
  const passes = pitch > 2 ? 6 : pitch > 1 ? 4 : 3;
  
  // Infeed per pass (modified flank infeed)
  const totalInfeed = threadDepth;
  const infeedPerPass: number[] = [];
  let remaining = totalInfeed;
  for (let i = 0; i < passes; i++) {
    const infeed = i === 0 ? totalInfeed * 0.3 : 
                   i === passes - 1 ? remaining : 
                   remaining * 0.4;
    infeedPerPass.push(Math.round(infeed * 1000) / 1000);
    remaining -= infeed;
  }
  
  return {
    threadDesignation: thread.designation,
    material,
    toolType,
    cuttingSpeed_mpm: Math.round(cuttingSpeed),
    numberOfPasses: passes,
    infeedPerPass_mm: infeedPerPass,
    infeedMethod: 'Modified flank',
    springPasses: 1,
    warnings: hardness && hardness > 45 ? ['High hardness - use CBN or ceramic'] : []
  };
}

function validateFitClass(designation: string, fitClass: string): any {
  const thread = threadEngine.findThread(designation);
  if (!thread) {
    return { error: `Could not find thread: ${designation}` };
  }
  
  // Valid classes
  const metricExternal = ['4g', '6g', '8g', '4g6g', '6g6g'];
  const metricInternal = ['4H', '5H', '6H', '7H', '4H5H', '6H6H'];
  const unifiedExternal = ['1A', '2A', '3A'];
  const unifiedInternal = ['1B', '2B', '3B'];
  
  let valid = false;
  let toleranceInfo = '';
  
  if (thread.type === 'ISO') {
    if (metricExternal.includes(fitClass)) {
      valid = true;
      toleranceInfo = 'External metric thread tolerance';
    } else if (metricInternal.includes(fitClass)) {
      valid = true;
      toleranceInfo = 'Internal metric thread tolerance';
    }
  } else if (['UNC', 'UNF', 'UNEF'].includes(thread.type)) {
    if (unifiedExternal.includes(fitClass)) {
      valid = true;
      toleranceInfo = 'External unified thread tolerance';
    } else if (unifiedInternal.includes(fitClass)) {
      valid = true;
      toleranceInfo = 'Internal unified thread tolerance';
    }
  }
  
  return {
    threadDesignation: thread.designation,
    fitClass,
    valid,
    toleranceInfo,
    description: valid ? `${fitClass} is valid for ${thread.type} threads` : `${fitClass} not valid for ${thread.type}`,
    recommendedClass: thread.type === 'ISO' ? '6H/6g' : '2B/2A'
  };
}

console.log(`[ThreadTools] Loaded ${threadTools.length} thread calculation tools`);

/**
 * Register all thread calculation tools with the MCP server
 * SAFETY CRITICAL: Wrong threads = assembly failures
 */
export function registerThreadTools(server: any): void {
  for (const tool of threadTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (params: any) => {
        const result = await (tool as any).handler(params);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          metadata: { safety_critical: true, ...result }
        };
      }
    );
  }
  console.log("Registered: Thread Calculation tools (12 tools) - SAFETY CRITICAL");
}
