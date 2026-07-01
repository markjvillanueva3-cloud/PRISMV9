/**
 * PRISM Manufacturing Intelligence - Spindle Protection MCP Tools
 * 5 tools for protecting spindle from overload conditions
 * 
 * SAFETY CRITICAL: Spindle damage = $50K+ replacement, production downtime
 * 
 * @version 1.0.0
 * @module spindleProtectionTools
 */

import {
  spindleProtectionEngine,
  SpindleType,
  BearingType,
  CoolingType,
  SpindleSpec,
  SpindleState,
  CuttingRequirements,
  TorqueCheckResult,
  PowerCheckResult,
  SpeedCheckResult,
  ThermalCheckResult,
  SpindleEnvelopeResult
} from '../engines/SpindleProtectionEngine.js';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Spindle protection tool definitions for MCP server
 */
export const spindleProtectionTools = [
  // ==========================================================================
  // TOOL 1: check_spindle_torque
  // ==========================================================================
  {
    name: 'check_spindle_torque',
    description: `Validate spindle torque requirement against capacity.

SAFETY CRITICAL: Torque overload causes bearing damage, motor burnout.

Checks:
- Required torque vs available at current speed
- Continuous vs peak torque limits
- Safety margins by operation type
- Duration limits if in peak zone

Returns safe/unsafe with torque margin and recommendations.`,
    inputSchema: {
      type: 'object',
      properties: {
        spindleType: {
          type: 'string',
          enum: ['BELT_DRIVE', 'GEAR_DRIVE', 'DIRECT_DRIVE', 'INTEGRAL_MOTOR', 'HIGH_SPEED_ELECTRIC'],
          description: 'Type of spindle'
        },
        ratedTorque: {
          type: 'number',
          description: 'Spindle rated (continuous) torque [Nm]'
        },
        peakTorque: {
          type: 'number',
          description: 'Spindle peak torque [Nm] (default: 1.3× rated)'
        },
        cornerSpeed: {
          type: 'number',
          description: 'Speed where constant torque ends [rpm]'
        },
        requiredTorque: {
          type: 'number',
          description: 'Torque required for cutting [Nm]'
        },
        targetSpeed: {
          type: 'number',
          description: 'Target spindle speed [rpm]'
        },
        operationType: {
          type: 'string',
          enum: ['ROUGHING', 'FINISHING', 'DRILLING', 'TAPPING', 'HIGH_SPEED'],
          description: 'Type of operation (affects safety margin)'
        },
        isInterrupted: {
          type: 'boolean',
          description: 'Whether cutting is interrupted'
        }
      },
      required: ['requiredTorque', 'targetSpeed']
    }
  },

  // ==========================================================================
  // TOOL 2: check_spindle_power
  // ==========================================================================
  {
    name: 'check_spindle_power',
    description: `Validate spindle power draw against motor capacity.

SAFETY CRITICAL: Power overload trips drives, damages motor windings.

Checks:
- Required power vs available at current speed
- Continuous vs peak power ratings
- Efficiency estimation at operating point
- Thermal concerns for extended operation

Returns safe/unsafe with power margin and recommendations.`,
    inputSchema: {
      type: 'object',
      properties: {
        spindleType: {
          type: 'string',
          enum: ['BELT_DRIVE', 'GEAR_DRIVE', 'DIRECT_DRIVE', 'INTEGRAL_MOTOR', 'HIGH_SPEED_ELECTRIC']
        },
        ratedPower: {
          type: 'number',
          description: 'Spindle rated (continuous) power [kW]'
        },
        peakPower: {
          type: 'number',
          description: 'Spindle peak power [kW] (default: 1.25× rated)'
        },
        cornerSpeed: {
          type: 'number',
          description: 'Speed where full power available [rpm]'
        },
        requiredPower: {
          type: 'number',
          description: 'Power required for cutting [kW]'
        },
        targetSpeed: {
          type: 'number',
          description: 'Target spindle speed [rpm]'
        },
        operationType: {
          type: 'string',
          enum: ['ROUGHING', 'FINISHING', 'DRILLING', 'TAPPING', 'HIGH_SPEED']
        },
        duration: {
          type: 'number',
          description: 'Expected operation duration [minutes]'
        }
      },
      required: ['requiredPower', 'targetSpeed']
    }
  },

  // ==========================================================================
  // TOOL 3: validate_spindle_speed
  // ==========================================================================
  {
    name: 'validate_spindle_speed',
    description: `Validate spindle speed for given load conditions.

Checks:
- Speed within min/max range
- Available torque at requested speed
- Available power at requested speed
- Speed derating for high loads

Returns safe speed range and available torque/power at speed.`,
    inputSchema: {
      type: 'object',
      properties: {
        spindleType: {
          type: 'string',
          enum: ['BELT_DRIVE', 'GEAR_DRIVE', 'DIRECT_DRIVE', 'INTEGRAL_MOTOR', 'HIGH_SPEED_ELECTRIC']
        },
        minSpeed: {
          type: 'number',
          description: 'Spindle minimum speed [rpm]'
        },
        maxSpeed: {
          type: 'number',
          description: 'Spindle maximum speed [rpm]'
        },
        cornerSpeed: {
          type: 'number',
          description: 'Corner speed [rpm]'
        },
        ratedTorque: {
          type: 'number',
          description: 'Rated torque [Nm]'
        },
        ratedPower: {
          type: 'number',
          description: 'Rated power [kW]'
        },
        requestedSpeed: {
          type: 'number',
          description: 'Desired spindle speed [rpm]'
        },
        currentLoad: {
          type: 'number',
          description: 'Current load value (torque or power)'
        },
        loadType: {
          type: 'string',
          enum: ['TORQUE', 'POWER'],
          description: 'Whether currentLoad is torque [Nm] or power [kW]'
        }
      },
      required: ['requestedSpeed']
    }
  },

  // ==========================================================================
  // TOOL 4: monitor_spindle_thermal
  // ==========================================================================
  {
    name: 'monitor_spindle_thermal',
    description: `Monitor spindle thermal status and predict temperature rise.

SAFETY CRITICAL: Thermal runaway causes bearing seizure, spindle destruction.

Uses thermal model to:
- Track current temperature vs limits
- Project temperature after operation duration
- Calculate max safe operation time
- Assess cooling system adequacy

Returns thermal status (NORMAL/ELEVATED/WARNING/CRITICAL) with projections.`,
    inputSchema: {
      type: 'object',
      properties: {
        spindleType: {
          type: 'string',
          enum: ['BELT_DRIVE', 'GEAR_DRIVE', 'DIRECT_DRIVE', 'INTEGRAL_MOTOR', 'HIGH_SPEED_ELECTRIC']
        },
        coolingType: {
          type: 'string',
          enum: ['AIR_COOLED', 'OIL_MIST', 'OIL_JET', 'WATER_COOLED', 'CHILLER'],
          description: 'Type of spindle cooling'
        },
        maxTemperature: {
          type: 'number',
          description: 'Maximum allowed bearing temperature [°C]'
        },
        warningTemperature: {
          type: 'number',
          description: 'Warning threshold [°C]'
        },
        currentTemperature: {
          type: 'number',
          description: 'Current spindle temperature [°C]'
        },
        loadPercent: {
          type: 'number',
          description: 'Current load as % of rated capacity'
        },
        runTime: {
          type: 'number',
          description: 'Continuous run time so far [minutes]'
        },
        plannedDuration: {
          type: 'number',
          description: 'Planned additional operation time [minutes]'
        },
        ambientTemperature: {
          type: 'number',
          description: 'Ambient temperature [°C] (default: 25)'
        }
      },
      required: ['currentTemperature', 'loadPercent']
    }
  },

  // ==========================================================================
  // TOOL 5: get_spindle_safe_envelope
  // ==========================================================================
  {
    name: 'get_spindle_safe_envelope',
    description: `Get complete spindle safe operating envelope.

Comprehensive validation combining:
- Torque check with speed-dependent limits
- Power check with thermal considerations
- Speed validation with load derating
- Thermal protection with time projection

Returns overall safety status, critical limitation, and safe operating limits.`,
    inputSchema: {
      type: 'object',
      properties: {
        spindle: {
          type: 'object',
          description: 'Spindle specification',
          properties: {
            type: { 
              type: 'string',
              enum: ['BELT_DRIVE', 'GEAR_DRIVE', 'DIRECT_DRIVE', 'INTEGRAL_MOTOR', 'HIGH_SPEED_ELECTRIC']
            },
            ratedPower: { type: 'number', description: 'Rated power [kW]' },
            peakPower: { type: 'number', description: 'Peak power [kW]' },
            ratedTorque: { type: 'number', description: 'Rated torque [Nm]' },
            peakTorque: { type: 'number', description: 'Peak torque [Nm]' },
            minSpeed: { type: 'number', description: 'Min speed [rpm]' },
            maxSpeed: { type: 'number', description: 'Max speed [rpm]' },
            cornerSpeed: { type: 'number', description: 'Corner speed [rpm]' },
            maxTemperature: { type: 'number', description: 'Max temp [°C]' },
            coolingType: { 
              type: 'string',
              enum: ['AIR_COOLED', 'OIL_MIST', 'OIL_JET', 'WATER_COOLED', 'CHILLER']
            }
          },
          required: ['type', 'ratedPower', 'ratedTorque', 'maxSpeed']
        },
        requirements: {
          type: 'object',
          description: 'Cutting requirements',
          properties: {
            requiredTorque: { type: 'number', description: 'Required torque [Nm]' },
            requiredPower: { type: 'number', description: 'Required power [kW]' },
            targetSpeed: { type: 'number', description: 'Target speed [rpm]' },
            operationType: { 
              type: 'string',
              enum: ['ROUGHING', 'FINISHING', 'DRILLING', 'TAPPING', 'HIGH_SPEED']
            },
            duration: { type: 'number', description: 'Operation duration [min]' },
            isInterrupted: { type: 'boolean' }
          },
          required: ['requiredTorque', 'requiredPower', 'targetSpeed']
        },
        currentState: {
          type: 'object',
          description: 'Current spindle state (optional)',
          properties: {
            temperature: { type: 'number', description: 'Current temp [°C]' },
            runTime: { type: 'number', description: 'Run time [min]' }
          }
        }
      },
      required: ['spindle', 'requirements']
    }
  }
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

/**
 * Handle check_spindle_torque tool calls
 */
export async function handleCheckTorque(params: any): Promise<TorqueCheckResult> {
  // Build spindle spec
  const spindle: SpindleSpec = params.spindleType 
    ? spindleProtectionEngine.getDefaultSpindleSpec(params.spindleType as SpindleType)
    : spindleProtectionEngine.getDefaultSpindleSpec('DIRECT_DRIVE');

  // Override with provided values
  if (params.ratedTorque) spindle.ratedTorque = params.ratedTorque;
  if (params.peakTorque) spindle.peakTorque = params.peakTorque;
  if (params.cornerSpeed) spindle.cornerSpeed = params.cornerSpeed;

  // Derive torque from power/speed if not directly provided
  let torque = params.requiredTorque;
  let speed = params.targetSpeed || params.spindle_speed_rpm;
  if (!torque && params.power_kw && speed) {
    torque = (params.power_kw * 1000 * 60) / (2 * Math.PI * speed); // T = P*60/(2π*n)
  }
  if (!torque || !speed) {
    return { error: "Missing required params: provide requiredTorque+targetSpeed or power_kw+spindle_speed_rpm", safe: false } as any;
  }

  const requirements: CuttingRequirements = {
    requiredTorque: torque,
    requiredPower: spindleProtectionEngine.calculatePower(torque, speed),
    targetSpeed: speed,
    operationType: params.operationType || 'ROUGHING',
    isInterrupted: params.isInterrupted
  };

  return spindleProtectionEngine.checkSpindleTorque(spindle, requirements);
}

/**
 * Handle check_spindle_power tool calls
 */
export async function handleCheckPower(params: any): Promise<PowerCheckResult> {
  // Build spindle spec
  const spindle: SpindleSpec = params.spindleType 
    ? spindleProtectionEngine.getDefaultSpindleSpec(params.spindleType as SpindleType)
    : spindleProtectionEngine.getDefaultSpindleSpec('DIRECT_DRIVE');

  // Override with provided values
  if (params.ratedPower) spindle.ratedPower = params.ratedPower;
  if (params.peakPower) spindle.peakPower = params.peakPower;
  if (params.cornerSpeed) spindle.cornerSpeed = params.cornerSpeed;

  const requirements: CuttingRequirements = {
    requiredTorque: spindleProtectionEngine.calculateTorque(params.requiredPower, params.targetSpeed),
    requiredPower: params.requiredPower,
    targetSpeed: params.targetSpeed,
    operationType: params.operationType || 'ROUGHING',
    duration: params.duration
  };

  return spindleProtectionEngine.checkSpindlePower(spindle, requirements);
}

/**
 * Handle validate_spindle_speed tool calls
 */
export async function handleValidateSpeed(params: any): Promise<SpeedCheckResult> {
  // Build spindle spec
  const spindle: SpindleSpec = params.spindleType 
    ? spindleProtectionEngine.getDefaultSpindleSpec(params.spindleType as SpindleType)
    : spindleProtectionEngine.getDefaultSpindleSpec('DIRECT_DRIVE');

  // Override with provided values
  if (params.minSpeed) spindle.minSpeed = params.minSpeed;
  if (params.maxSpeed) spindle.maxSpeed = params.maxSpeed;
  if (params.cornerSpeed) spindle.cornerSpeed = params.cornerSpeed;
  if (params.ratedTorque) spindle.ratedTorque = params.ratedTorque;
  if (params.ratedPower) spindle.ratedPower = params.ratedPower;

  return spindleProtectionEngine.validateSpindleSpeed(
    spindle,
    params.requestedSpeed,
    params.currentLoad || 0,
    params.loadType || 'TORQUE'
  );
}

/**
 * Handle monitor_spindle_thermal tool calls
 */
export async function handleMonitorThermal(params: any): Promise<ThermalCheckResult> {
  // Build spindle spec
  const spindle: SpindleSpec = params.spindleType 
    ? spindleProtectionEngine.getDefaultSpindleSpec(params.spindleType as SpindleType)
    : spindleProtectionEngine.getDefaultSpindleSpec('DIRECT_DRIVE');

  // Override with provided values
  spindle.coolingType = (params.coolingType as CoolingType) || 'OIL_JET';
  if (params.maxTemperature) spindle.maxTemperature = params.maxTemperature;
  if (params.warningTemperature) spindle.warningTemperature = params.warningTemperature;
  if (params.ambientTemperature) spindle.ambientTemperature = params.ambientTemperature;

  const state: SpindleState = {
    currentSpeed: 5000,
    commandedSpeed: 5000,
    currentTorque: 0,
    currentPower: 0,
    loadPercent: params.loadPercent,
    temperature: params.currentTemperature,
    runTime: params.runTime || 0
  };

  const requirements: CuttingRequirements | undefined = params.plannedDuration ? {
    requiredTorque: 0,
    requiredPower: spindle.ratedPower * (params.loadPercent / 100),
    targetSpeed: 5000,
    operationType: 'ROUGHING',
    duration: params.plannedDuration
  } : undefined;

  return spindleProtectionEngine.monitorSpindleThermal(spindle, state, requirements);
}

/**
 * Handle get_spindle_safe_envelope tool calls
 */
export async function handleGetEnvelope(params: any): Promise<SpindleEnvelopeResult> {
  // Build full spindle spec
  const spindleParams = params.spindle;
  const baseSpindle = spindleProtectionEngine.getDefaultSpindleSpec(
    (spindleParams.type as SpindleType) || 'DIRECT_DRIVE'
  );

  const spindle: SpindleSpec = {
    ...baseSpindle,
    type: spindleParams.type || baseSpindle.type,
    ratedPower: spindleParams.ratedPower || baseSpindle.ratedPower,
    peakPower: spindleParams.peakPower || baseSpindle.peakPower,
    ratedTorque: spindleParams.ratedTorque || baseSpindle.ratedTorque,
    peakTorque: spindleParams.peakTorque || baseSpindle.peakTorque,
    minSpeed: spindleParams.minSpeed || baseSpindle.minSpeed,
    maxSpeed: spindleParams.maxSpeed || baseSpindle.maxSpeed,
    cornerSpeed: spindleParams.cornerSpeed || baseSpindle.cornerSpeed,
    maxTemperature: spindleParams.maxTemperature || baseSpindle.maxTemperature,
    coolingType: spindleParams.coolingType || baseSpindle.coolingType
  };

  const requirements: CuttingRequirements = {
    requiredTorque: params.requirements.requiredTorque,
    requiredPower: params.requirements.requiredPower,
    targetSpeed: params.requirements.targetSpeed,
    operationType: params.requirements.operationType || 'ROUGHING',
    duration: params.requirements.duration,
    isInterrupted: params.requirements.isInterrupted
  };

  const state: SpindleState | undefined = params.currentState ? {
    currentSpeed: params.requirements.targetSpeed,
    commandedSpeed: params.requirements.targetSpeed,
    currentTorque: params.requirements.requiredTorque,
    currentPower: params.requirements.requiredPower,
    loadPercent: 0,
    temperature: params.currentState.temperature || 30,
    runTime: params.currentState.runTime || 0
  } : undefined;

  return spindleProtectionEngine.getSpindleSafeEnvelope(spindle, requirements, state);
}

// ============================================================================
// TOOL ROUTER
// ============================================================================

/**
 * Route spindle protection tool calls to appropriate handlers
 */
export async function handleSpindleProtectionTool(
  toolName: string,
  params: any
): Promise<any> {
  switch (toolName) {
    case 'check_spindle_torque':
      return handleCheckTorque(params);
    
    case 'check_spindle_power':
      return handleCheckPower(params);
    
    case 'validate_spindle_speed':
      return handleValidateSpeed(params);
    
    case 'monitor_spindle_thermal':
      return handleMonitorThermal(params);
    
    case 'get_spindle_safe_envelope':
      return handleGetEnvelope(params);
    
    default:
      throw new Error(`Unknown spindle protection tool: ${toolName}`);
  }
}

// Export all
export default {
  spindleProtectionTools,
  handleSpindleProtectionTool,
  handleCheckTorque,
  handleCheckPower,
  handleValidateSpeed,
  handleMonitorThermal,
  handleGetEnvelope
};

/**
 * Register all spindle protection tools with the MCP server
 * SAFETY CRITICAL: Spindle damage = $50K+ replacement, production downtime
 */
export function registerSpindleProtectionTools(server: any): void {
  for (const tool of spindleProtectionTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (params: any) => {
        const result = await handleSpindleProtectionTool(tool.name, params);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          metadata: { safety_critical: true, ...result }
        };
      }
    );
  }
  console.log("Registered: Spindle Protection tools (5 tools) - SAFETY CRITICAL");
}
