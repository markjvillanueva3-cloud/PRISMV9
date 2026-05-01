/**
 * PRISM Manufacturing Intelligence - Tool Breakage Prediction MCP Tools
 * 5 tools for predicting and preventing tool failure
 * 
 * SAFETY CRITICAL: Broken tools = flying debris = injury/death
 * 
 * @version 1.0.0
 * @module toolBreakageTools
 */

import {
  toolBreakageEngine,
  ToolMaterial,
  ToolGeometry,
  CuttingForces,
  CuttingConditions,
  StressResult,
  DeflectionResult,
  ChipLoadResult,
  FatigueResult,
  BreakagePrediction,
  SafeCuttingLimits
} from '../engines/ToolBreakageEngine.js';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Tool breakage prediction tool definitions for MCP server
 */
export const toolBreakageTools = [
  // ==========================================================================
  // TOOL 1: predict_tool_breakage
  // ==========================================================================
  {
    name: 'predict_tool_breakage',
    description: `Comprehensive tool breakage risk assessment combining stress, deflection, chip load, and fatigue analysis.

SAFETY CRITICAL: Predicts probability of tool failure before it happens.
Broken tools create flying debris that can cause serious injury or death.

Analyzes:
- Stress levels vs material strength
- Tool deflection vs allowable limits  
- Chip load vs manufacturer recommendations
- Cumulative fatigue damage
- Overall breakage probability (0-100%)

Returns risk level (LOW/MEDIUM/HIGH/CRITICAL) with immediate action recommendations.`,
    inputSchema: {
      type: 'object',
      properties: {
        tool: {
          type: 'object',
          description: 'Tool geometry specification',
          properties: {
            diameter: { type: 'number', description: 'Tool diameter [mm]' },
            shankDiameter: { type: 'number', description: 'Shank diameter [mm]' },
            fluteLength: { type: 'number', description: 'Cutting/flute length [mm]' },
            overallLength: { type: 'number', description: 'Total tool length [mm]' },
            stickout: { type: 'number', description: 'Stickout from holder [mm]' },
            numberOfFlutes: { type: 'number', description: 'Number of cutting edges' },
            coreRatio: { type: 'number', description: 'Core diameter / tool diameter (0.5-0.7)' },
            neckDiameter: { type: 'number', description: 'Neck diameter if necked [mm]' }
          },
          required: ['diameter', 'shankDiameter', 'fluteLength', 'overallLength', 'stickout', 'numberOfFlutes']
        },
        forces: {
          type: 'object',
          description: 'Cutting forces',
          properties: {
            Fc: { type: 'number', description: 'Tangential/main cutting force [N]' },
            Ff: { type: 'number', description: 'Feed force [N]' },
            Fp: { type: 'number', description: 'Radial/passive force [N]' },
            torque: { type: 'number', description: 'Spindle torque [Nm]' }
          },
          required: ['Fc', 'Ff', 'Fp']
        },
        conditions: {
          type: 'object',
          description: 'Cutting conditions',
          properties: {
            cuttingSpeed: { type: 'number', description: 'Vc [m/min]' },
            feedPerTooth: { type: 'number', description: 'fz [mm/tooth]' },
            axialDepth: { type: 'number', description: 'ap [mm]' },
            radialDepth: { type: 'number', description: 'ae [mm]' },
            spindleSpeed: { type: 'number', description: 'n [rpm]' }
          },
          required: ['feedPerTooth', 'axialDepth', 'radialDepth']
        },
        toolMaterial: {
          type: 'string',
          enum: ['HSS', 'COBALT_HSS', 'CARBIDE', 'CARBIDE_COATED', 'CERMET', 'CERAMIC', 'CBN', 'PCD'],
          description: 'Tool material type (default: CARBIDE)'
        },
        workpieceMaterial: {
          type: 'string',
          enum: ['STEEL', 'STAINLESS', 'ALUMINUM', 'CAST_IRON', 'SUPERALLOY'],
          description: 'Workpiece material category'
        },
        operationType: {
          type: 'string',
          enum: ['ROUGHING', 'SEMI_FINISH', 'FINISHING', 'PRECISION'],
          description: 'Operation type'
        },
        isInterrupted: {
          type: 'boolean',
          description: 'Whether cutting is interrupted (slots, pockets, etc.)'
        },
        cyclesAccumulated: {
          type: 'number',
          description: 'Number of cutting cycles already performed (for fatigue)'
        },
        tolerance: {
          type: 'number',
          description: 'Part tolerance [mm] for deflection assessment'
        }
      },
      required: ['tool', 'forces', 'conditions']
    }
  },

  // ==========================================================================
  // TOOL 2: calculate_tool_stress
  // ==========================================================================
  {
    name: 'calculate_tool_stress',
    description: `Calculate bending and torsional stress in tool shank.

SAFETY CRITICAL: Stress exceeding material strength = catastrophic tool snap.

Models tool as cantilever beam under combined loading:
- Bending stress: σ = 32FL / (πd³)
- Torsional stress: τ = 16T / (πd³)  
- Combined (von Mises): σ_vm = √(σ² + 3τ²)

Returns stress values, safety factor, and critical location.`,
    inputSchema: {
      type: 'object',
      properties: {
        tool: {
          type: 'object',
          properties: {
            diameter: { type: 'number', description: 'Tool diameter [mm]' },
            shankDiameter: { type: 'number', description: 'Shank diameter [mm]' },
            stickout: { type: 'number', description: 'Stickout from holder [mm]' },
            numberOfFlutes: { type: 'number' },
            coreRatio: { type: 'number', description: 'Core/diameter ratio' },
            neckDiameter: { type: 'number', description: 'Neck diameter if present [mm]' }
          },
          required: ['diameter', 'shankDiameter', 'stickout']
        },
        forces: {
          type: 'object',
          properties: {
            Fc: { type: 'number', description: 'Tangential force [N]' },
            Ff: { type: 'number', description: 'Feed force [N]' },
            Fp: { type: 'number', description: 'Radial force [N]' },
            torque: { type: 'number', description: 'Torque [Nm]' }
          },
          required: ['Fc', 'Ff', 'Fp']
        },
        toolMaterial: {
          type: 'string',
          enum: ['HSS', 'COBALT_HSS', 'CARBIDE', 'CARBIDE_COATED', 'CERMET', 'CERAMIC', 'CBN', 'PCD']
        },
        isInterrupted: {
          type: 'boolean',
          description: 'Interrupted cutting increases required safety factor'
        }
      },
      required: ['tool', 'forces']
    }
  },

  // ==========================================================================
  // TOOL 3: check_chip_load_limits
  // ==========================================================================
  {
    name: 'check_chip_load_limits',
    description: `Validate chip load (feed per tooth) against tool and material recommendations.

SAFETY CRITICAL: Excessive chip load causes cutting edge failure and tool breakage.

Checks actual chip load against:
- Tool diameter-based recommendations
- Tool material capability
- Workpiece material adjustments
- L/D ratio derating

Returns pass/fail with specific recommendations.`,
    inputSchema: {
      type: 'object',
      properties: {
        toolDiameter: {
          type: 'number',
          description: 'Tool diameter [mm]'
        },
        stickout: {
          type: 'number',
          description: 'Tool stickout [mm]'
        },
        feedPerTooth: {
          type: 'number',
          description: 'Actual feed per tooth [mm/tooth]'
        },
        radialDepth: {
          type: 'number',
          description: 'Radial depth of cut [mm]'
        },
        toolMaterial: {
          type: 'string',
          enum: ['HSS', 'COBALT_HSS', 'CARBIDE', 'CARBIDE_COATED', 'CERMET', 'CERAMIC', 'CBN', 'PCD']
        },
        workpieceMaterial: {
          type: 'string',
          enum: ['STEEL', 'STAINLESS', 'ALUMINUM', 'CAST_IRON', 'SUPERALLOY']
        }
      },
      required: ['toolDiameter', 'feedPerTooth', 'radialDepth']
    }
  },

  // ==========================================================================
  // TOOL 4: estimate_tool_fatigue
  // ==========================================================================
  {
    name: 'estimate_tool_fatigue',
    description: `Estimate tool fatigue life and remaining safe cycles.

SAFETY CRITICAL: Fatigue failure is sudden and catastrophic - no warning.

Uses S-N curve approach:
- N = (σ_endurance / σ_applied)^m
- Miner's rule for damage accumulation

Returns cycles remaining, damage accumulated, and risk level.`,
    inputSchema: {
      type: 'object',
      properties: {
        tool: {
          type: 'object',
          properties: {
            diameter: { type: 'number' },
            shankDiameter: { type: 'number' },
            stickout: { type: 'number' },
            numberOfFlutes: { type: 'number' },
            coreRatio: { type: 'number' }
          },
          required: ['diameter', 'shankDiameter', 'stickout']
        },
        forces: {
          type: 'object',
          properties: {
            Fc: { type: 'number' },
            Ff: { type: 'number' },
            Fp: { type: 'number' }
          },
          required: ['Fc', 'Ff', 'Fp']
        },
        toolMaterial: {
          type: 'string',
          enum: ['HSS', 'COBALT_HSS', 'CARBIDE', 'CARBIDE_COATED', 'CERMET', 'CERAMIC', 'CBN', 'PCD']
        },
        cyclesAccumulated: {
          type: 'number',
          description: 'Number of cutting cycles already performed'
        },
        isInterrupted: {
          type: 'boolean',
          description: 'Interrupted cutting reduces fatigue life by ~70%'
        }
      },
      required: ['tool', 'forces', 'cyclesAccumulated']
    }
  },

  // ==========================================================================
  // TOOL 5: get_safe_cutting_limits
  // ==========================================================================
  {
    name: 'get_safe_cutting_limits',
    description: `Calculate maximum safe cutting parameters for a tool configuration.

Returns safe limits for:
- Axial depth (ap_max)
- Radial depth (ae_max)
- Feed per tooth (fz_max)
- Cutting speed (Vc_max)
- Spindle speed (n_max)
- Torque and force limits

Automatically derates for:
- High L/D ratios
- Operation type (roughing vs precision)
- Tool and workpiece materials`,
    inputSchema: {
      type: 'object',
      properties: {
        tool: {
          type: 'object',
          properties: {
            diameter: { type: 'number', description: 'Tool diameter [mm]' },
            shankDiameter: { type: 'number', description: 'Shank diameter [mm]' },
            fluteLength: { type: 'number', description: 'Flute length [mm]' },
            stickout: { type: 'number', description: 'Stickout from holder [mm]' }
          },
          required: ['diameter', 'shankDiameter', 'fluteLength', 'stickout']
        },
        toolMaterial: {
          type: 'string',
          enum: ['HSS', 'COBALT_HSS', 'CARBIDE', 'CARBIDE_COATED', 'CERMET', 'CERAMIC', 'CBN', 'PCD']
        },
        workpieceMaterial: {
          type: 'string',
          enum: ['STEEL', 'STAINLESS', 'ALUMINUM', 'CAST_IRON', 'SUPERALLOY']
        },
        operationType: {
          type: 'string',
          enum: ['ROUGHING', 'SEMI_FINISH', 'FINISHING', 'PRECISION']
        }
      },
      required: ['tool']
    }
  }
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

/**
 * Handle predict_tool_breakage tool calls
 */
export async function handlePredictBreakage(params: any): Promise<BreakagePrediction> {
  const tool: ToolGeometry = {
    diameter: params.tool.diameter,
    shankDiameter: params.tool.shankDiameter,
    fluteLength: params.tool.fluteLength,
    overallLength: params.tool.overallLength,
    stickout: params.tool.stickout,
    numberOfFlutes: params.tool.numberOfFlutes,
    coreRatio: params.tool.coreRatio,
    neckDiameter: params.tool.neckDiameter
  };

  const forces: CuttingForces = {
    Fc: params.forces.Fc,
    Ff: params.forces.Ff,
    Fp: params.forces.Fp,
    torque: params.forces.torque
  };

  const conditions: CuttingConditions = {
    cuttingSpeed: params.conditions.cuttingSpeed || 100,
    feedPerTooth: params.conditions.feedPerTooth,
    axialDepth: params.conditions.axialDepth,
    radialDepth: params.conditions.radialDepth,
    spindleSpeed: params.conditions.spindleSpeed || 5000
  };

  return toolBreakageEngine.predictBreakage(
    tool,
    forces,
    conditions,
    (params.toolMaterial || 'CARBIDE') as ToolMaterial,
    {
      workpieceMaterial: params.workpieceMaterial,
      operationType: params.operationType,
      isInterrupted: params.isInterrupted,
      cyclesAccumulated: params.cyclesAccumulated,
      tolerance: params.tolerance
    }
  );
}

/**
 * Handle calculate_tool_stress tool calls
 */
export async function handleCalculateStress(params: any): Promise<StressResult> {
  const tool: ToolGeometry = {
    diameter: params.tool.diameter,
    shankDiameter: params.tool.shankDiameter,
    fluteLength: params.tool.fluteLength || params.tool.diameter * 2,
    overallLength: params.tool.overallLength || params.tool.stickout * 1.5,
    stickout: params.tool.stickout,
    numberOfFlutes: params.tool.numberOfFlutes || 4,
    coreRatio: params.tool.coreRatio,
    neckDiameter: params.tool.neckDiameter
  };

  const forces: CuttingForces = {
    Fc: params.forces.Fc,
    Ff: params.forces.Ff,
    Fp: params.forces.Fp,
    torque: params.forces.torque
  };

  return toolBreakageEngine.calculateToolStress(
    tool,
    forces,
    (params.toolMaterial || 'CARBIDE') as ToolMaterial,
    params.isInterrupted || false
  );
}

/**
 * Handle check_chip_load_limits tool calls
 */
export async function handleCheckChipLoad(params: any): Promise<ChipLoadResult> {
  const diam = params.toolDiameter || params.tool_diameter || params.diameter || 12;
  const fpt = params.feedPerTooth || params.feed_per_tooth || 0.1;
  const nFlutes = params.numberOfFlutes || params.num_flutes || params.flutes || 4;
  const rd = params.radialDepth || params.radial_depth || diam * 0.5;
  const so = params.stickout || params.stick_out || diam * 3;

  const tool: ToolGeometry = {
    diameter: diam,
    shankDiameter: diam,
    fluteLength: diam * 2,
    overallLength: so * 1.5,
    stickout: so,
    numberOfFlutes: nFlutes
  };

  const conditions: CuttingConditions = {
    cuttingSpeed: params.cutting_speed || params.cuttingSpeed || 100,
    feedPerTooth: fpt,
    axialDepth: params.axial_depth || params.axialDepth || diam,
    radialDepth: rd,
    spindleSpeed: params.spindle_speed || params.spindleSpeed || 5000
  };

  return toolBreakageEngine.checkChipLoadLimits(
    tool,
    conditions,
    (params.toolMaterial || params.tool_material || 'CARBIDE') as ToolMaterial,
    params.workpieceMaterial || params.material || 'STEEL'
  );
}

/**
 * Handle estimate_tool_fatigue tool calls
 */
export async function handleEstimateFatigue(params: any): Promise<FatigueResult> {
  const tool: ToolGeometry = {
    diameter: params.tool.diameter,
    shankDiameter: params.tool.shankDiameter,
    fluteLength: params.tool.fluteLength || params.tool.diameter * 2,
    overallLength: params.tool.overallLength || params.tool.stickout * 1.5,
    stickout: params.tool.stickout,
    numberOfFlutes: params.tool.numberOfFlutes || 4,
    coreRatio: params.tool.coreRatio
  };

  const forces: CuttingForces = {
    Fc: params.forces.Fc,
    Ff: params.forces.Ff,
    Fp: params.forces.Fp
  };

  return toolBreakageEngine.estimateToolFatigue(
    tool,
    forces,
    (params.toolMaterial || 'CARBIDE') as ToolMaterial,
    params.cyclesAccumulated,
    params.isInterrupted || false
  );
}

/**
 * Handle get_safe_cutting_limits tool calls
 */
export async function handleGetSafeLimits(params: any): Promise<SafeCuttingLimits> {
  const tool: ToolGeometry = {
    diameter: params.tool.diameter,
    shankDiameter: params.tool.shankDiameter,
    fluteLength: params.tool.fluteLength,
    overallLength: params.tool.overallLength || params.tool.stickout * 1.5,
    stickout: params.tool.stickout,
    numberOfFlutes: params.tool.numberOfFlutes || 4
  };

  return toolBreakageEngine.getSafeCuttingLimits(
    tool,
    (params.toolMaterial || 'CARBIDE') as ToolMaterial,
    params.operationType || 'FINISHING',
    params.workpieceMaterial || 'STEEL'
  );
}

// ============================================================================
// TOOL ROUTER
// ============================================================================

/**
 * Route tool breakage tool calls to appropriate handlers
 */
export async function handleToolBreakageTool(
  toolName: string,
  params: any
): Promise<any> {
  switch (toolName) {
    case 'predict_tool_breakage':
      return handlePredictBreakage(params);
    
    case 'calculate_tool_stress':
      return handleCalculateStress(params);
    
    case 'check_chip_load_limits':
      return handleCheckChipLoad(params);
    
    case 'estimate_tool_fatigue':
      return handleEstimateFatigue(params);
    
    case 'get_safe_cutting_limits':
      return handleGetSafeLimits(params);
    
    default:
      throw new Error(`Unknown tool breakage tool: ${toolName}`);
  }
}

// Export all
export default {
  toolBreakageTools,
  handleToolBreakageTool,
  handlePredictBreakage,
  handleCalculateStress,
  handleCheckChipLoad,
  handleEstimateFatigue,
  handleGetSafeLimits
};

/**
 * Register all tool breakage prediction tools with the MCP server
 * SAFETY CRITICAL: Broken tools = flying debris = injury/death
 */
export function registerToolBreakageTools(server: any): void {
  for (const tool of toolBreakageTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (params: any) => {
        const result = await handleToolBreakageTool(tool.name, params);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          metadata: { safety_critical: true, ...result }
        };
      }
    );
  }
  console.log("Registered: Tool Breakage Prediction tools (5 tools) - SAFETY CRITICAL");
}
