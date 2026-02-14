/**
 * PRISM Manufacturing Intelligence - Workholding Validation MCP Tools
 * 6 tools for comprehensive workholding safety validation
 * 
 * SAFETY CRITICAL: Inadequate workholding = part ejection, injury, death
 * 
 * @version 1.0.0
 * @module workholdingTools
 */

import {
  workholdingEngine,
  CuttingForces,
  WorkholdingDevice,
  WorkholdingType,
  SurfaceCondition,
  MachiningOperation,
  ClampConfiguration,
  ClampLocation,
  SupportLocation,
  WorkpieceSpec,
  VacuumFixtureSpec,
  MagneticChuckSpec,
  ClampForceResult,
  PulloutResult,
  LiftoffResult,
  DeflectionResult,
  VacuumValidationResult,
  WorkholdingValidationResult
} from '../engines/WorkholdingEngine';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Workholding validation tool definitions for MCP server
 */
export const workholdingTools = [
  // ==========================================================================
  // TOOL 1: calculate_clamp_force_required
  // ==========================================================================
  {
    name: 'calculate_clamp_force_required',
    description: `Calculate minimum clamp force required to safely resist cutting forces.

SAFETY CRITICAL: Insufficient clamping = part ejection at high speed = injury/death

Uses friction-based model: F_clamp = (F_cutting × SafetyFactor × DynamicFactor) / μ

Accounts for:
- Workholding type (vice, chuck, clamp, etc.)
- Surface condition (dry, oily, coolant wet)
- Dynamic forces from interrupted cuts
- Operation type (milling, drilling, tapping)`,
    inputSchema: {
      type: 'object',
      properties: {
        cuttingForces: {
          type: 'object',
          description: 'Cutting force components from machining',
          properties: {
            Fc: { type: 'number', description: 'Tangential/main cutting force [N]' },
            Ff: { type: 'number', description: 'Feed force [N]' },
            Fp: { type: 'number', description: 'Passive/radial force [N]' }
          },
          required: ['Fc', 'Ff', 'Fp']
        },
        workholdingType: {
          type: 'string',
          enum: ['VICE_SMOOTH', 'VICE_SERRATED', 'VICE_SOFT_JAWS', 'HYDRAULIC_CLAMP', 
                 'TOGGLE_CLAMP', 'STRAP_CLAMP', 'COLLET', 'THREE_JAW_CHUCK', 
                 'FOUR_JAW_CHUCK', 'FIXTURE_PLATE', 'TOMBSTONE', 'CUSTOM'],
          description: 'Type of workholding device'
        },
        surfaceCondition: {
          type: 'string',
          enum: ['DRY', 'OILY', 'COOLANT_WET', 'RUSTY', 'GROUND', 'AS_CAST'],
          description: 'Surface condition affecting friction (default: DRY)'
        },
        appliedClampForce: {
          type: 'number',
          description: 'Currently applied clamping force [N]'
        },
        maxClampForce: {
          type: 'number',
          description: 'Maximum clamping force of device [N]'
        },
        operationType: {
          type: 'string',
          enum: ['MILLING', 'DRILLING', 'TAPPING', 'TURNING', 'BORING', 'REAMING'],
          description: 'Type of machining operation'
        },
        isInterrupted: {
          type: 'boolean',
          description: 'Whether cutting is interrupted (increases dynamic factor)'
        },
        frictionOverride: {
          type: 'number',
          description: 'Optional override for friction coefficient'
        },
        safetyFactorOverride: {
          type: 'number',
          description: 'Optional override for minimum safety factor'
        }
      },
      required: ['cuttingForces', 'workholdingType', 'appliedClampForce']
    }
  },

  // ==========================================================================
  // TOOL 2: validate_workholding_setup
  // ==========================================================================
  {
    name: 'validate_workholding_setup',
    description: `Comprehensive workholding validation checking ALL failure modes.

SAFETY CRITICAL: Validates complete workholding setup before machining.

Checks:
1. Clamp force adequacy
2. Pull-out resistance (drilling/tapping)
3. Lift-off moment (rotational stability)
4. Part deflection (thin walls/tight tolerance)
5. Vacuum/magnetic holding (if applicable)

Returns overall pass/fail with detailed breakdown of each check.`,
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'object',
          description: 'Machining operation details',
          properties: {
            operationType: {
              type: 'string',
              enum: ['MILLING', 'DRILLING', 'TAPPING', 'TURNING', 'BORING', 'REAMING']
            },
            cuttingForces: {
              type: 'object',
              properties: {
                Fc: { type: 'number' },
                Ff: { type: 'number' },
                Fp: { type: 'number' }
              },
              required: ['Fc', 'Ff', 'Fp']
            },
            forceApplicationPoint: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' }
              },
              required: ['x', 'y', 'z']
            },
            isInterrupted: { type: 'boolean' }
          },
          required: ['operationType', 'cuttingForces', 'forceApplicationPoint']
        },
        workpiece: {
          type: 'object',
          description: 'Workpiece specification',
          properties: {
            material: { type: 'string' },
            elasticModulus: { type: 'number', description: 'E [GPa]' },
            yieldStrength: { type: 'number', description: 'σy [MPa]' },
            length: { type: 'number', description: 'L [mm]' },
            width: { type: 'number', description: 'W [mm]' },
            height: { type: 'number', description: 'H [mm]' },
            wallThickness: { type: 'number', description: 'For thin-walled parts [mm]' },
            weight: { type: 'number', description: 'Part weight [kg]' }
          },
          required: ['material', 'elasticModulus', 'length', 'width', 'height']
        },
        clampConfiguration: {
          type: 'object',
          description: 'Clamping setup details',
          properties: {
            deviceType: {
              type: 'string',
              enum: ['VICE_SMOOTH', 'VICE_SERRATED', 'VICE_SOFT_JAWS', 'HYDRAULIC_CLAMP',
                     'TOGGLE_CLAMP', 'STRAP_CLAMP', 'VACUUM_FIXTURE', 'MAGNETIC_CHUCK',
                     'COLLET', 'THREE_JAW_CHUCK', 'FOUR_JAW_CHUCK', 'FIXTURE_PLATE']
            },
            surfaceCondition: {
              type: 'string',
              enum: ['DRY', 'OILY', 'COOLANT_WET', 'RUSTY', 'GROUND', 'AS_CAST']
            },
            clampLocations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  x: { type: 'number' },
                  y: { type: 'number' },
                  z: { type: 'number' },
                  forceDirection: {
                    type: 'string',
                    enum: ['DOWN', 'SIDE', 'UP', 'ANGLED']
                  },
                  clampForce: { type: 'number', description: 'Force at this clamp [N]' }
                },
                required: ['id', 'x', 'y', 'z', 'forceDirection', 'clampForce']
              }
            },
            supportLocations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  x: { type: 'number' },
                  y: { type: 'number' },
                  z: { type: 'number' },
                  type: { type: 'string', enum: ['FIXED', 'ADJUSTABLE', 'SPRING_LOADED'] }
                }
              }
            },
            partOrientation: {
              type: 'string',
              enum: ['HORIZONTAL', 'VERTICAL', 'ANGLED']
            }
          },
          required: ['deviceType', 'clampLocations', 'partOrientation']
        },
        tolerance: {
          type: 'number',
          description: 'Part tolerance for deflection check [mm]'
        },
        vacuumSpec: {
          type: 'object',
          description: 'Vacuum fixture specification (if using vacuum)',
          properties: {
            vacuumPressure: { type: 'number', description: 'Vacuum level [kPa]' },
            sealArea: { type: 'number', description: 'Sealed area [mm²]' },
            sealEfficiency: { type: 'number', description: 'η (0.0-1.0)' },
            sealType: { type: 'string', enum: ['O_RING', 'GASKET', 'FOAM', 'MACHINED_CHANNEL'] }
          }
        },
        magneticSpec: {
          type: 'object',
          description: 'Magnetic chuck specification (if using magnetic)',
          properties: {
            chuckType: { type: 'string', enum: ['PERMANENT', 'ELECTROMAGNETIC', 'ELECTROPERMANENT'] },
            poleSpacing: { type: 'number', description: 'Distance between poles [mm]' },
            holdingForce: { type: 'number', description: 'Rated holding force [N/cm²]' },
            contactArea: { type: 'number', description: 'Part contact area [mm²]' },
            partThickness: { type: 'number', description: 'Part thickness [mm]' },
            partPermeability: { type: 'number', description: 'Relative magnetic permeability' }
          }
        }
      },
      required: ['operation', 'workpiece', 'clampConfiguration']
    }
  },

  // ==========================================================================
  // TOOL 3: check_pullout_resistance
  // ==========================================================================
  {
    name: 'check_pullout_resistance',
    description: `Check resistance to axial pull-out during drilling/tapping operations.

SAFETY CRITICAL: Pull-out = part gets yanked from fixture = flying projectile

Calculates: F_resist = μ × F_clamp × N_surfaces
Must exceed drilling thrust force with safety factor.

Critical for:
- Deep hole drilling (high thrust)
- Tapping (high torque + axial)
- Boring operations`,
    inputSchema: {
      type: 'object',
      properties: {
        axialForce: {
          type: 'number',
          description: 'Axial force from drilling/tapping [N]'
        },
        totalClampForce: {
          type: 'number',
          description: 'Total normal clamping force [N]'
        },
        workholdingType: {
          type: 'string',
          enum: ['VICE_SMOOTH', 'VICE_SERRATED', 'VICE_SOFT_JAWS', 'HYDRAULIC_CLAMP',
                 'THREE_JAW_CHUCK', 'FOUR_JAW_CHUCK', 'COLLET'],
          description: 'Type of workholding device'
        },
        surfaceCondition: {
          type: 'string',
          enum: ['DRY', 'OILY', 'COOLANT_WET', 'RUSTY', 'GROUND', 'AS_CAST'],
          description: 'Surface condition'
        },
        numberOfJaws: {
          type: 'number',
          description: 'Number of clamping jaws/surfaces (default: 2)'
        },
        safetyFactor: {
          type: 'number',
          description: 'Minimum safety factor (default: 2.5)'
        }
      },
      required: ['axialForce', 'totalClampForce', 'workholdingType']
    }
  },

  // ==========================================================================
  // TOOL 4: analyze_liftoff_moment
  // ==========================================================================
  {
    name: 'analyze_liftoff_moment',
    description: `Analyze lift-off moment to ensure rotational stability.

SAFETY CRITICAL: Lift-off = part rotates/tips during cutting = catastrophic

Calculates moments about pivot point:
- M_cutting = F_cutting × moment_arm (tries to lift)
- M_resist = F_clamp × clamp_arm (holds down)

Must have M_resist > M_cutting × SafetyFactor`,
    inputSchema: {
      type: 'object',
      properties: {
        cuttingForces: {
          type: 'object',
          properties: {
            Fc: { type: 'number', description: 'Main cutting force [N]' },
            Ff: { type: 'number', description: 'Feed force [N]' },
            Fp: { type: 'number', description: 'Radial force [N]' }
          },
          required: ['Fc', 'Ff', 'Fp']
        },
        forceApplicationPoint: {
          type: 'object',
          description: 'Where cutting force is applied',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z']
        },
        clampLocations: {
          type: 'array',
          description: 'Array of clamp positions and forces',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' },
              clampForce: { type: 'number', description: 'Force at this clamp [N]' }
            },
            required: ['x', 'y', 'z', 'clampForce']
          }
        },
        supportLocations: {
          type: 'array',
          description: 'Array of support/rest positions (pivot points)',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' }
            }
          }
        },
        partWeight: {
          type: 'number',
          description: 'Part weight [kg] (contributes to resisting moment)'
        },
        partLength: {
          type: 'number',
          description: 'Part length for CoG calculation [mm]'
        },
        safetyFactor: {
          type: 'number',
          description: 'Minimum safety factor (default: 2.0)'
        }
      },
      required: ['cuttingForces', 'forceApplicationPoint', 'clampLocations']
    }
  },

  // ==========================================================================
  // TOOL 5: calculate_part_deflection
  // ==========================================================================
  {
    name: 'calculate_part_deflection',
    description: `Calculate part deflection under clamping and cutting forces.

SAFETY CRITICAL: Excessive deflection = part moves into cutter = crash

Uses beam theory models:
- Cantilever: δ = FL³/(3EI)
- Simply supported: δ = FL³/(48EI)
- Fixed-fixed: δ = FL³/(192EI)

Also checks stress at clamp point vs yield strength.`,
    inputSchema: {
      type: 'object',
      properties: {
        cuttingForces: {
          type: 'object',
          properties: {
            Fc: { type: 'number' },
            Ff: { type: 'number' },
            Fp: { type: 'number' }
          },
          required: ['Fc', 'Ff', 'Fp']
        },
        workpiece: {
          type: 'object',
          properties: {
            material: { type: 'string' },
            elasticModulus: { type: 'number', description: 'E [GPa]' },
            yieldStrength: { type: 'number', description: 'σy [MPa]' },
            length: { type: 'number', description: 'L [mm]' },
            width: { type: 'number', description: 'W [mm]' },
            height: { type: 'number', description: 'H [mm]' },
            wallThickness: { type: 'number', description: 'For thin-walled parts [mm]' }
          },
          required: ['elasticModulus', 'length', 'width', 'height']
        },
        supportType: {
          type: 'string',
          enum: ['CANTILEVER', 'SIMPLY_SUPPORTED', 'FIXED_FIXED'],
          description: 'Support configuration (auto-detected from clamps if not specified)'
        },
        numberOfSupports: {
          type: 'number',
          description: 'Number of support points'
        },
        numberOfClamps: {
          type: 'number',
          description: 'Number of clamp points'
        },
        tolerance: {
          type: 'number',
          description: 'Part tolerance [mm] - allowable deflection = 30% of tolerance'
        }
      },
      required: ['cuttingForces', 'workpiece', 'tolerance']
    }
  },

  // ==========================================================================
  // TOOL 6: validate_vacuum_fixture
  // ==========================================================================
  {
    name: 'validate_vacuum_fixture',
    description: `Validate vacuum fixture holding capability.

SAFETY CRITICAL: Vacuum loss = part drops/ejects = danger

Calculates: F_hold = P_vacuum × A_seal × η

Factors considered:
- Vacuum pressure (typically 85 kPa)
- Seal area and type
- Surface finish affecting seal
- Part surface condition

Also supports magnetic chuck validation with partPermeability parameter.`,
    inputSchema: {
      type: 'object',
      properties: {
        fixtureType: {
          type: 'string',
          enum: ['VACUUM', 'MAGNETIC'],
          description: 'Type of non-mechanical holding'
        },
        cuttingForces: {
          type: 'object',
          properties: {
            Fc: { type: 'number' },
            Ff: { type: 'number' },
            Fp: { type: 'number' }
          },
          required: ['Fc', 'Ff', 'Fp']
        },
        vacuumPressure: {
          type: 'number',
          description: 'Vacuum pressure [kPa] - typical 85 kPa'
        },
        sealArea: {
          type: 'number',
          description: 'Sealed/contact area [mm²]'
        },
        sealType: {
          type: 'string',
          enum: ['O_RING', 'GASKET', 'FOAM', 'MACHINED_CHANNEL'],
          description: 'Type of seal (for vacuum fixtures)'
        },
        surfaceFinishRa: {
          type: 'number',
          description: 'Part surface finish Ra [μm]'
        },
        sealEfficiency: {
          type: 'number',
          description: 'Override seal efficiency (0.0-1.0)'
        },
        magneticHoldingForce: {
          type: 'number',
          description: 'For magnetic: rated holding force [N/cm²]'
        },
        partThickness: {
          type: 'number',
          description: 'For magnetic: part thickness [mm]'
        },
        partPermeability: {
          type: 'number',
          description: 'For magnetic: relative magnetic permeability (carbon steel ≈ 100, stainless 300 ≈ 1)'
        },
        safetyFactor: {
          type: 'number',
          description: 'Minimum safety factor (default: 2.0 vacuum, 2.5 magnetic)'
        }
      },
      required: ['fixtureType', 'cuttingForces', 'sealArea']
    }
  }
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

/**
 * Handle calculate_clamp_force_required tool calls
 */
export async function handleCalculateClampForce(params: any): Promise<ClampForceResult> {
  const device: WorkholdingDevice = {
    type: params.workholdingType as WorkholdingType,
    surfaceCondition: (params.surfaceCondition || 'DRY') as SurfaceCondition,
    currentClampForce: params.appliedClampForce,
    maxClampForce: params.maxClampForce,
    frictionCoefficient: params.frictionOverride
  };

  const operation: MachiningOperation = {
    operationType: params.operationType || 'MILLING',
    cuttingForces: params.cuttingForces,
    forceApplicationPoint: { x: 0, y: 0, z: 0 },
    isInterrupted: params.isInterrupted || false
  };

  return workholdingEngine.calculateClampForceRequired(
    params.cuttingForces,
    device,
    operation,
    params.safetyFactorOverride
  );
}

/**
 * Handle validate_workholding_setup tool calls
 */
export async function handleValidateWorkholding(params: any): Promise<WorkholdingValidationResult> {
  const operation: MachiningOperation = {
    operationType: params.operation.operationType,
    cuttingForces: params.operation.cuttingForces,
    forceApplicationPoint: params.operation.forceApplicationPoint,
    isInterrupted: params.operation.isInterrupted || false
  };

  const workpiece: WorkpieceSpec = {
    material: params.workpiece.material,
    elasticModulus: params.workpiece.elasticModulus,
    yieldStrength: params.workpiece.yieldStrength,
    length: params.workpiece.length,
    width: params.workpiece.width,
    height: params.workpiece.height,
    wallThickness: params.workpiece.wallThickness,
    weight: params.workpiece.weight
  };

  const device: WorkholdingDevice = {
    type: params.clampConfiguration.deviceType as WorkholdingType,
    surfaceCondition: (params.clampConfiguration.surfaceCondition || 'DRY') as SurfaceCondition
  };

  const clampConfig: ClampConfiguration = {
    device,
    clampLocations: params.clampConfiguration.clampLocations.map((c: any) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      z: c.z,
      forceDirection: c.forceDirection,
      clampForce: c.clampForce
    })),
    supportLocations: params.clampConfiguration.supportLocations?.map((s: any) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      z: s.z,
      type: s.type || 'FIXED'
    })),
    partOrientation: params.clampConfiguration.partOrientation
  };

  const options: any = {
    tolerance: params.tolerance
  };

  if (params.vacuumSpec) {
    options.vacuumSpec = {
      vacuumPressure: params.vacuumSpec.vacuumPressure || 85,
      sealArea: params.vacuumSpec.sealArea,
      sealEfficiency: params.vacuumSpec.sealEfficiency || 0.85,
      sealType: params.vacuumSpec.sealType || 'O_RING'
    } as VacuumFixtureSpec;
  }

  if (params.magneticSpec) {
    options.magneticSpec = {
      chuckType: params.magneticSpec.chuckType || 'PERMANENT',
      poleSpacing: params.magneticSpec.poleSpacing || 10,
      holdingForce: params.magneticSpec.holdingForce,
      contactArea: params.magneticSpec.contactArea,
      partThickness: params.magneticSpec.partThickness,
      partPermeability: params.magneticSpec.partPermeability
    } as MagneticChuckSpec;
  }

  return workholdingEngine.validateWorkholding(operation, workpiece, clampConfig, options);
}

/**
 * Handle check_pullout_resistance tool calls
 */
export async function handleCheckPullout(params: any): Promise<PulloutResult> {
  const device: WorkholdingDevice = {
    type: params.workholdingType as WorkholdingType,
    surfaceCondition: (params.surfaceCondition || 'DRY') as SurfaceCondition,
    numberOfJaws: params.numberOfJaws || 2
  };

  const clampConfig: ClampConfiguration = {
    device,
    clampLocations: [{
      id: 'main',
      x: 0,
      y: 0,
      z: 0,
      forceDirection: 'SIDE',
      clampForce: params.totalClampForce
    }],
    partOrientation: 'HORIZONTAL'
  };

  return workholdingEngine.calculatePulloutResistance(
    params.axialForce,
    clampConfig,
    device,
    params.safetyFactor || 2.5
  );
}

/**
 * Handle analyze_liftoff_moment tool calls
 */
export async function handleAnalyzeLiftoff(params: any): Promise<LiftoffResult> {
  const cuttingForces: CuttingForces = params.cuttingForces;

  const operation: MachiningOperation = {
    operationType: 'MILLING',
    cuttingForces,
    forceApplicationPoint: params.forceApplicationPoint
  };

  const clampLocations: ClampLocation[] = params.clampLocations.map((c: any, i: number) => ({
    id: c.id || `clamp_${i}`,
    x: c.x,
    y: c.y,
    z: c.z,
    forceDirection: 'DOWN' as const,
    clampForce: c.clampForce
  }));

  const supportLocations: SupportLocation[] | undefined = params.supportLocations?.map((s: any, i: number) => ({
    id: s.id || `support_${i}`,
    x: s.x,
    y: s.y,
    z: s.z,
    type: 'FIXED' as const
  }));

  const clampConfig: ClampConfiguration = {
    device: { type: 'FIXTURE_PLATE' },
    clampLocations,
    supportLocations,
    partOrientation: 'HORIZONTAL'
  };

  const workpiece: WorkpieceSpec = {
    material: 'STEEL',
    elasticModulus: 210,
    length: params.partLength || 100,
    width: 50,
    height: 25,
    weight: params.partWeight
  };

  return workholdingEngine.analyzeLiftoffMoment(
    cuttingForces,
    operation,
    clampConfig,
    workpiece,
    params.safetyFactor || 2.0
  );
}

/**
 * Handle calculate_part_deflection tool calls
 */
export async function handleCalculateDeflection(params: any): Promise<DeflectionResult> {
  const cuttingForces: CuttingForces = params.cuttingForces;

  const operation: MachiningOperation = {
    operationType: 'MILLING',
    cuttingForces,
    forceApplicationPoint: { x: params.workpiece.length / 2, y: 0, z: 0 }
  };

  const workpiece: WorkpieceSpec = {
    material: params.workpiece.material || 'STEEL',
    elasticModulus: params.workpiece.elasticModulus,
    yieldStrength: params.workpiece.yieldStrength || 250,
    length: params.workpiece.length,
    width: params.workpiece.width,
    height: params.workpiece.height,
    wallThickness: params.workpiece.wallThickness
  };

  // Build clamp config based on support type
  const numClamps = params.numberOfClamps || 1;
  const numSupports = params.numberOfSupports || 0;
  
  const clampLocations: ClampLocation[] = [];
  const supportLocations: SupportLocation[] = [];

  // Add clamps
  for (let i = 0; i < numClamps; i++) {
    clampLocations.push({
      id: `clamp_${i}`,
      x: (params.workpiece.length / (numClamps + 1)) * (i + 1),
      y: params.workpiece.width / 2,
      z: params.workpiece.height,
      forceDirection: 'DOWN',
      clampForce: 5000 // Default
    });
  }

  // Add supports
  for (let i = 0; i < numSupports; i++) {
    supportLocations.push({
      id: `support_${i}`,
      x: (params.workpiece.length / (numSupports + 1)) * (i + 1),
      y: params.workpiece.width / 2,
      z: 0,
      type: 'FIXED'
    });
  }

  const clampConfig: ClampConfiguration = {
    device: { type: 'FIXTURE_PLATE' },
    clampLocations,
    supportLocations: supportLocations.length > 0 ? supportLocations : undefined,
    partOrientation: 'HORIZONTAL'
  };

  return workholdingEngine.calculatePartDeflection(
    cuttingForces,
    operation,
    workpiece,
    clampConfig,
    params.tolerance
  );
}

/**
 * Handle validate_vacuum_fixture tool calls
 */
export async function handleValidateVacuumFixture(params: any): Promise<VacuumValidationResult> {
  const cuttingForces: CuttingForces = params.cuttingForces;

  if (params.fixtureType === 'MAGNETIC') {
    // Magnetic chuck validation
    const magneticSpec: MagneticChuckSpec = {
      chuckType: 'PERMANENT',
      poleSpacing: 10,
      holdingForce: params.magneticHoldingForce || 120,
      contactArea: params.sealArea,
      partThickness: params.partThickness || 10,
      partPermeability: params.partPermeability || 100
    };

    return workholdingEngine.calculateMagneticHolding(
      magneticSpec,
      cuttingForces,
      params.safetyFactor || 2.5
    );
  } else {
    // Vacuum fixture validation
    const vacuumSpec: VacuumFixtureSpec = {
      vacuumPressure: params.vacuumPressure || 85,
      sealArea: params.sealArea,
      sealEfficiency: params.sealEfficiency || 0.85,
      sealType: params.sealType || 'O_RING',
      surfaceFinishRa: params.surfaceFinishRa
    };

    return workholdingEngine.validateVacuumFixture(
      vacuumSpec,
      cuttingForces,
      params.safetyFactor || 2.0
    );
  }
}

// ============================================================================
// TOOL ROUTER
// ============================================================================

/**
 * Route workholding tool calls to appropriate handlers
 */
export async function handleWorkholdingTool(
  toolName: string,
  params: any
): Promise<any> {
  switch (toolName) {
    case 'calculate_clamp_force_required':
      return handleCalculateClampForce(params);
    
    case 'validate_workholding_setup':
      return handleValidateWorkholding(params);
    
    case 'check_pullout_resistance':
      return handleCheckPullout(params);
    
    case 'analyze_liftoff_moment':
      return handleAnalyzeLiftoff(params);
    
    case 'calculate_part_deflection':
      return handleCalculateDeflection(params);
    
    case 'validate_vacuum_fixture':
      return handleValidateVacuumFixture(params);
    
    default:
      throw new Error(`Unknown workholding tool: ${toolName}`);
  }
}

// Export all
export default {
  workholdingTools,
  handleWorkholdingTool,
  handleCalculateClampForce,
  handleValidateWorkholding,
  handleCheckPullout,
  handleAnalyzeLiftoff,
  handleCalculateDeflection,
  handleValidateVacuumFixture
};

/**
 * Register all workholding validation tools with the MCP server
 * SAFETY CRITICAL: Inadequate workholding = part ejection, injury, death
 */
export function registerWorkholdingTools(server: any): void {
  for (const tool of workholdingTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (params: any) => {
        const result = await handleWorkholdingTool(tool.name, params);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          metadata: { safety_critical: true, ...result }
        };
      }
    );
  }
  console.log("Registered: Workholding Validation tools (6 tools) - SAFETY CRITICAL");
}
