/**
 * PRISM Manufacturing Intelligence - Coolant Validation MCP Tools
 * 5 tools for validating coolant flow, pressure, and chip evacuation
 * 
 * SAFETY CRITICAL: Inadequate coolant = tool burns, thermal damage, fires
 * 
 * @version 1.0.0
 * @module coolantValidationTools
 */

import {
  coolantValidationEngine,
  CoolantDelivery,
  CoolantType,
  CoolantOperation,
  CoolantSystem,
  ToolCoolantSpec,
  OperationParams,
  FlowValidationResult,
  PressureValidationResult,
  ChipEvacuationResult,
  MQLValidationResult,
  CoolantValidationResult
} from '../engines/CoolantValidationEngine.js';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Coolant validation tool definitions for MCP server
 */
export const coolantValidationTools = [
  // ==========================================================================
  // TOOL 1: validate_coolant_flow
  // ==========================================================================
  {
    name: 'validate_coolant_flow',
    description: `Comprehensive coolant flow validation for machining operation.

SAFETY CRITICAL: Inadequate coolant causes tool burns, thermal damage, fires.

Validates:
- Flow rate adequacy for operation
- Pressure for chip evacuation (TSC)
- Material-specific requirements
- MQL suitability (if applicable)

Returns overall adequacy with thermal status and recommendations.`,
    inputSchema: {
      type: 'object',
      properties: {
        delivery: {
          type: 'string',
          enum: ['FLOOD', 'THROUGH_SPINDLE', 'THROUGH_TOOL', 'MQL', 'AIR_BLAST', 'CRYOGENIC', 'DRY'],
          description: 'Coolant delivery method'
        },
        coolantType: {
          type: 'string',
          enum: ['WATER_SOLUBLE', 'SEMI_SYNTHETIC', 'FULL_SYNTHETIC', 'STRAIGHT_OIL', 'MQL_OIL', 'COMPRESSED_AIR'],
          description: 'Type of coolant'
        },
        flowRate: { type: 'number', description: 'Available flow rate [L/min]' },
        pressure: { type: 'number', description: 'Available pressure [bar]' },
        operation: {
          type: 'string',
          enum: ['MILLING_GENERAL', 'MILLING_HSM', 'DRILLING_SHALLOW', 'DRILLING_DEEP', 
                 'DRILLING_GUNDRILLING', 'TAPPING', 'REAMING', 'BORING', 'TURNING', 'GRINDING'],
          description: 'Type of machining operation'
        },
        toolDiameter: { type: 'number', description: 'Tool diameter [mm]' },
        cuttingSpeed: { type: 'number', description: 'Cutting speed [m/min]' },
        feedRate: { type: 'number', description: 'Feed rate [mm/min]' },
        holeDepth: { type: 'number', description: 'Hole depth for drilling [mm]' },
        materialType: {
          type: 'string',
          enum: ['STEEL', 'STAINLESS', 'ALUMINUM', 'TITANIUM', 'CAST_IRON', 'SUPERALLOY'],
          description: 'Workpiece material'
        },
        hasThroughCoolant: { type: 'boolean', description: 'Tool has through-coolant capability' }
      },
      required: ['delivery', 'flowRate', 'pressure', 'operation', 'toolDiameter', 'cuttingSpeed']
    }
  },

  // ==========================================================================
  // TOOL 2: check_through_spindle_coolant
  // ==========================================================================
  {
    name: 'check_through_spindle_coolant',
    description: `Validate through-spindle coolant (TSC) pressure for drilling.

Critical for:
- Deep hole drilling (L/D > 3)
- Chip evacuation
- Preventing chip packing

Returns pressure adequacy with chip evacuation risk assessment.`,
    inputSchema: {
      type: 'object',
      properties: {
        pressure: { type: 'number', description: 'Available TSC pressure [bar]' },
        flowRate: { type: 'number', description: 'Available flow rate [L/min]' },
        toolDiameter: { type: 'number', description: 'Drill diameter [mm]' },
        holeDepth: { type: 'number', description: 'Hole depth [mm]' },
        materialType: {
          type: 'string',
          enum: ['STEEL', 'STAINLESS', 'ALUMINUM', 'TITANIUM', 'CAST_IRON', 'SUPERALLOY']
        },
        hasThroughCoolant: { type: 'boolean', description: 'Tool has internal coolant holes' },
        coolantHoleDiameter: { type: 'number', description: 'Coolant hole diameter [mm]' }
      },
      required: ['pressure', 'toolDiameter', 'holeDepth']
    }
  },

  // ==========================================================================
  // TOOL 3: calculate_chip_evacuation
  // ==========================================================================
  {
    name: 'calculate_chip_evacuation',
    description: `Calculate chip evacuation requirements for drilling.

Based on L/D ratio determines:
- Required coolant pressure/flow
- Peck cycle parameters
- Evacuation strategy (standard, peck, high-pressure, gundrilling)

Essential for preventing chip packing and tool breakage in deep holes.`,
    inputSchema: {
      type: 'object',
      properties: {
        toolDiameter: { type: 'number', description: 'Drill diameter [mm]' },
        holeDepth: { type: 'number', description: 'Hole depth [mm]' },
        availablePressure: { type: 'number', description: 'Available coolant pressure [bar]' },
        availableFlow: { type: 'number', description: 'Available flow rate [L/min]' },
        materialType: {
          type: 'string',
          enum: ['STEEL', 'STAINLESS', 'ALUMINUM', 'TITANIUM', 'CAST_IRON', 'SUPERALLOY']
        },
        delivery: {
          type: 'string',
          enum: ['FLOOD', 'THROUGH_SPINDLE', 'THROUGH_TOOL']
        }
      },
      required: ['toolDiameter', 'holeDepth', 'availablePressure', 'availableFlow']
    }
  },

  // ==========================================================================
  // TOOL 4: validate_mql_parameters
  // ==========================================================================
  {
    name: 'validate_mql_parameters',
    description: `Validate Minimum Quantity Lubrication (MQL) parameters.

MQL uses tiny amounts of oil (10-150 mL/hr) with compressed air.

Validates:
- Oil flow rate adequacy
- Air pressure requirements
- Operation suitability (MQL not for all operations)
- Material compatibility

Returns suitability rating and recommendations.`,
    inputSchema: {
      type: 'object',
      properties: {
        oilFlowRate: { type: 'number', description: 'MQL oil flow rate [mL/hr]' },
        airPressure: { type: 'number', description: 'Air pressure [bar]' },
        operation: {
          type: 'string',
          enum: ['MILLING_GENERAL', 'MILLING_HSM', 'DRILLING_SHALLOW', 'DRILLING_DEEP', 
                 'TAPPING', 'REAMING', 'BORING', 'TURNING'],
          description: 'Machining operation'
        },
        toolDiameter: { type: 'number', description: 'Tool diameter [mm]' },
        cuttingSpeed: { type: 'number', description: 'Cutting speed [m/min]' },
        materialType: {
          type: 'string',
          enum: ['STEEL', 'STAINLESS', 'ALUMINUM', 'TITANIUM', 'CAST_IRON', 'SUPERALLOY']
        }
      },
      required: ['oilFlowRate', 'airPressure', 'operation', 'toolDiameter']
    }
  },

  // ==========================================================================
  // TOOL 5: get_coolant_recommendations
  // ==========================================================================
  {
    name: 'get_coolant_recommendations',
    description: `Get optimal coolant setup recommendations for operation.

Recommends:
- Best delivery method (flood, TSC, MQL, air)
- Optimal coolant type for material
- Flow and pressure targets
- Material-specific considerations

Based on material properties, operation type, and best practices.`,
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['MILLING_GENERAL', 'MILLING_HSM', 'DRILLING_SHALLOW', 'DRILLING_DEEP',
                 'DRILLING_GUNDRILLING', 'TAPPING', 'REAMING', 'BORING', 'TURNING', 'GRINDING'],
          description: 'Machining operation'
        },
        materialType: {
          type: 'string',
          enum: ['STEEL', 'STAINLESS', 'ALUMINUM', 'TITANIUM', 'CAST_IRON', 'SUPERALLOY'],
          description: 'Workpiece material'
        },
        toolDiameter: { type: 'number', description: 'Tool diameter [mm]' },
        holeDepth: { type: 'number', description: 'Hole depth for drilling [mm]' },
        cuttingSpeed: { type: 'number', description: 'Cutting speed [m/min]' }
      },
      required: ['operation', 'materialType', 'toolDiameter']
    }
  }
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

/**
 * Handle validate_coolant_flow tool calls
 */
export async function handleValidateCoolantFlow(params: any): Promise<CoolantValidationResult> {
  const system: CoolantSystem = {
    delivery: params.delivery as CoolantDelivery,
    coolantType: (params.coolantType as CoolantType) || 'WATER_SOLUBLE',
    flowRate: params.flowRate,
    pressure: params.pressure
  };

  const opParams: OperationParams = {
    operation: params.operation as CoolantOperation,
    toolDiameter: params.toolDiameter,
    cuttingSpeed: params.cuttingSpeed,
    feedRate: params.feedRate || 100,
    holeDepth: params.holeDepth,
    materialType: params.materialType
  };

  const toolSpec: ToolCoolantSpec | undefined = params.hasThroughCoolant !== undefined 
    ? { hasThroughCoolant: params.hasThroughCoolant }
    : undefined;

  return coolantValidationEngine.validateCoolant(system, opParams, toolSpec);
}

/**
 * Handle check_through_spindle_coolant tool calls
 */
export async function handleCheckTSC(params: any): Promise<PressureValidationResult> {
  const system: CoolantSystem = {
    delivery: 'THROUGH_SPINDLE',
    coolantType: 'WATER_SOLUBLE',
    flowRate: params.flowRate || 20,
    pressure: params.pressure
  };

  const opParams: OperationParams = {
    operation: 'DRILLING_DEEP',
    toolDiameter: params.toolDiameter,
    cuttingSpeed: 80,
    feedRate: 100,
    holeDepth: params.holeDepth,
    materialType: params.materialType
  };

  const toolSpec: ToolCoolantSpec = {
    hasThroughCoolant: params.hasThroughCoolant ?? true,
    coolantHoleDiameter: params.coolantHoleDiameter
  };

  return coolantValidationEngine.checkThroughSpindleCoolant(system, opParams, toolSpec);
}

/**
 * Handle calculate_chip_evacuation tool calls
 */
export async function handleChipEvacuation(params: any): Promise<ChipEvacuationResult> {
  const opParams: OperationParams = {
    operation: 'DRILLING_DEEP',
    toolDiameter: params.toolDiameter,
    cuttingSpeed: 80,
    feedRate: 100,
    holeDepth: params.holeDepth,
    materialType: params.materialType
  };

  const system: CoolantSystem = {
    delivery: (params.delivery as CoolantDelivery) || 'THROUGH_SPINDLE',
    coolantType: 'WATER_SOLUBLE',
    flowRate: params.availableFlow,
    pressure: params.availablePressure
  };

  return coolantValidationEngine.calculateChipEvacuation(opParams, system);
}

/**
 * Handle validate_mql_parameters tool calls
 */
export async function handleValidateMQL(params: any): Promise<MQLValidationResult> {
  const opParams: OperationParams = {
    operation: params.operation as CoolantOperation,
    toolDiameter: params.toolDiameter,
    cuttingSpeed: params.cuttingSpeed || 150,
    feedRate: 100,
    materialType: params.materialType
  };

  return coolantValidationEngine.validateMQLParameters(
    opParams,
    params.oilFlowRate,
    params.airPressure
  );
}

/**
 * Handle get_coolant_recommendations tool calls
 */
export async function handleGetRecommendations(params: any): Promise<{
  delivery: CoolantDelivery;
  type: CoolantType;
  minFlowRate: number;
  minPressure: number;
  notes: string[];
}> {
  const recs = coolantValidationEngine.getCoolantRecommendations(
    params.materialType,
    params.operation as CoolantOperation
  );

  // Calculate minimum requirements
  const baseFlow = params.toolDiameter * 0.8;
  let minPressure = 10;
  
  if (params.holeDepth && params.toolDiameter) {
    const ldRatio = params.holeDepth / params.toolDiameter;
    if (ldRatio > 5) minPressure = 40;
    if (ldRatio > 8) minPressure = 70;
    if (ldRatio > 12) minPressure = 100;
  }

  return {
    delivery: recs.delivery,
    type: recs.type,
    minFlowRate: parseFloat(baseFlow.toFixed(1)),
    minPressure,
    notes: recs.notes
  };
}

// ============================================================================
// TOOL ROUTER
// ============================================================================

/**
 * Route coolant validation tool calls to appropriate handlers
 */
export async function handleCoolantValidationTool(
  toolName: string,
  params: any
): Promise<any> {
  switch (toolName) {
    case 'validate_coolant_flow':
      return handleValidateCoolantFlow(params);
    
    case 'check_through_spindle_coolant':
      return handleCheckTSC(params);
    
    case 'calculate_chip_evacuation':
      return handleChipEvacuation(params);
    
    case 'validate_mql_parameters':
      return handleValidateMQL(params);
    
    case 'get_coolant_recommendations':
      return handleGetRecommendations(params);
    
    default:
      throw new Error(`Unknown coolant validation tool: ${toolName}`);
  }
}

// Export all
export default {
  coolantValidationTools,
  handleCoolantValidationTool,
  handleValidateCoolantFlow,
  handleCheckTSC,
  handleChipEvacuation,
  handleValidateMQL,
  handleGetRecommendations
};

/**
 * Register all coolant validation tools with the MCP server
 * SAFETY CRITICAL: Inadequate coolant = tool burns, thermal damage, fires
 */
export function registerCoolantValidationTools(server: any): void {
  for (const tool of coolantValidationTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (params: any) => {
        const result = await handleCoolantValidationTool(tool.name, params);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          metadata: { safety_critical: true, ...result }
        };
      }
    );
  }
  console.log("Registered: Coolant Validation tools (5 tools) - SAFETY CRITICAL");
}
