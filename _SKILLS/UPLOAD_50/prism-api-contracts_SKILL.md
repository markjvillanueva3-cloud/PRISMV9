---
name: prism-api-contracts
description: |
  Complete API interface definitions. 500+ gateway routes.
---

```typescript
/**
 * All gateway calls follow this pattern:
 * const result = await PRISM_GATEWAY.request<InputType, OutputType>(route, input);
 */

interface GatewayRequest<T> {
    route: string;
    payload: T;
    options?: GatewayOptions;
}

interface GatewayOptions {
    timeout?: number;          // milliseconds
    priority?: 'low' | 'normal' | 'high' | 'critical';
    cache?: boolean | number;  // true, false, or TTL in seconds
    retries?: number;
    fallback?: 'physics' | 'default' | 'error';
}

interface GatewayRoute<TInput, TOutput> {
    route: string;
    version: string;
    description: string;
    input: TypeSchema<TInput>;
    output: TypeSchema<TOutput>;
    errors: number[];          // Possible error codes
    examples: RouteExample[];
}

interface RouteExample {
    name: string;
    description: string;
    input: any;
    output: any;
}

interface TypeSchema<T> {
    type: string;
    required: string[];
    properties: Record<string, PropertySchema>;
}

interface PropertySchema {
    type: string;
    description: string;
    required?: boolean;
    default?: any;
    enum?: any[];
    minimum?: number;
    maximum?: number;
    pattern?: string;
    items?: PropertySchema;    // For arrays
}
```

### 2.2 Gateway Route Registry

```javascript
/**
 * Central route registry with type definitions
 */
const PRISM_GATEWAY_CONTRACTS = {
    // Version for all contracts
    version: '1.0.0',
    
    // Route categories
    categories: {
        materials: 'materials.*',
        machines: 'machines.*',
        tools: 'tools.*',
        physics: 'physics.*',
        ml: 'ml.*',
        calculators: 'calc.*',
        cad: 'cad.*',
        cam: 'cam.*',
        post: 'post.*',
        learning: 'learning.*',
        system: 'system.*'
    },
    
    /**
     * Register a route with its contract
     */
    register(route, contract) {
        this.routes[route] = {
            ...contract,
            route,
            registeredAt: new Date().toISOString()
        };
    },
    
    /**
     * Validate input against contract
     */
    validateInput(route, input) {
        const contract = this.routes[route];
        if (!contract) {
            throw new PRISMError(1201, `Route not found: ${route}`);
        }
        return PRISM_VALIDATOR.validate(input, contract.input);
    },
    
    /**
     * Validate output against contract
     */
    validateOutput(route, output) {
        const contract = this.routes[route];
        if (!contract) return true; // No contract = no validation
        return PRISM_VALIDATOR.validate(output, contract.output);
    },
    
    routes: {}
};
```

## 4. ENGINE API CONTRACTS

### 4.1 Physics Engine Contracts

```typescript
// === CUTTING FORCE ENGINE ===

interface CuttingForceInput {
    material: {
        id: string;
        hardness?: number;
        condition?: string;
    };
    tool: {
        id: string;
        diameter: number;
        numberOfFlutes: number;
        rakeAngle?: number;
        helixAngle?: number;
        edgeRadius?: number;
    };
    parameters: {
        speed: number;              // m/min or SFM
        feedPerTooth: number;       // mm
        axialDOC: number;           // mm
        radialWOC: number;          // mm
        speedUnit?: SpeedUnit;
    };
    options?: {
        includeAllModels?: boolean;
        includeUncertainty?: boolean;
    };
}

interface CuttingForceOutput {
    forces: {
        Fc: Measurement;            // Main cutting force (N)
        Ft: Measurement;            // Feed force (N)
        Fr: Measurement;            // Radial force (N)
        Fa?: Measurement;           // Axial force (N)
        F_resultant: Measurement;   // Resultant force (N)
    };
    
    power: {
        cutting: Measurement;       // kW
        spindle: Measurement;       // kW (including efficiency)
        feed?: Measurement;         // kW
    };
    
    torque: Measurement;            // Nm
    
    specificCuttingForce: {
        kc: number;                 // N/mm²
        kc1_1: number;              // Reference value
        mc: number;                 // Exponent
    };
    
    models: {
        kienzle: ForceModelResult;
        merchant?: ForceModelResult;
        empirical?: ForceModelResult;
    };
    
    confidence: number;
    sources: DataSource[];
}

interface ForceModelResult {
    Fc: number;
    Ft: number;
    Fr: number;
    contribution_weight: number;
}
```

```javascript
// Route: physics.force.calculate
PRISM_GATEWAY_CONTRACTS.register('physics.force.calculate', {
    version: '1.0.0',
    description: 'Calculate cutting forces using multiple models',
    input: { type: 'CuttingForceInput' },
    output: { type: 'CuttingForceOutput' },
    errors: [3001, 3003, 3101, 3102, 5001]
});
```

```typescript
// === TOOL LIFE ENGINE ===

interface ToolLifeInput {
    material: {
        id: string;
        hardness?: number;
    };
    tool: {
        id: string;
        substrate: ToolMaterial;
        coating: ToolCoating;
        edgeCondition?: 'sharp' | 'honed' | 'chamfered';
    };
    parameters: {
        speed: number;              // m/min
        feedPerTooth: number;       // mm
        axialDOC: number;           // mm
        radialWOC: number;          // mm
    };
    conditions: {
        coolant: 'dry' | 'flood' | 'mist' | 'mql' | 'high_pressure';
        coolantPressure?: number;   // bar
        interrupted?: boolean;
        rigidity?: 'low' | 'medium' | 'high';
        surfaceCondition?: 'clean' | 'scale' | 'forging_skin' | 'cast_skin';
    };
    target?: {
        toolLifeMinutes?: number;
        partsPerTool?: number;
        costPerPart?: number;
    };
}

interface ToolLifeOutput {
    life: {
        minutes: Measurement;
        parts: number;
        meters_cut: number;
    };
    
    ranges: {
        conservative: number;       // minutes
        typical: number;            // minutes
        aggressive: number;         // minutes
    };
    
    taylor: {
        n: number;
        C: number;
        equation: string;
    };
    
    wearMode: {
        primary: string;            // flank, crater, notch, etc.
        secondary?: string;
        wearRatePrediction: number; // mm/min
    };
    
    adjustmentFactors: {
        coolant: number;
        interrupted: number;
        engagement: number;
        surface: number;
        rigidity: number;
        total: number;
    };
    
    economics: {
        toolCostPerPart: number;
        toolChangeTimePerPart: number;  // seconds
        optimalSpeedForCost?: number;   // m/min
    };
    
    confidence: number;
    sources: DataSource[];
}
```

```javascript
// Route: physics.toollife.calculate
PRISM_GATEWAY_CONTRACTS.register('physics.toollife.calculate', {
    version: '1.0.0',
    description: 'Calculate tool life using Taylor and wear models',
    input: { type: 'ToolLifeInput' },
    output: { type: 'ToolLifeOutput' },
    errors: [3001, 3105, 5001]
});

// Route: physics.toollife.optimize
PRISM_GATEWAY_CONTRACTS.register('physics.toollife.optimize', {
    version: '1.0.0',
    description: 'Find optimal speed for target tool life or cost',
    input: {
        type: 'object',
        required: ['material', 'tool', 'target'],
        properties: {
            material: { type: 'object' },
            tool: { type: 'object' },
            target: {
                type: 'object',
                properties: {
                    toolLifeMinutes: { type: 'number' },
                    minimizeCost: { type: 'boolean' }
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            optimalSpeed: { type: 'Measurement' },
            predictedLife: { type: 'number' },
            predictedCostPerPart: { type: 'number' }
        }
    },
    errors: [3001, 3004]
});
```

```typescript
// === CHATTER PREDICTION ENGINE ===

interface ChatterInput {
    machine: {
        id: string;
        spindleStiffness?: number;  // N/µm
        naturalFrequency?: number;  // Hz
        dampingRatio?: number;
    };
    tool: {
        id: string;
        stickout: number;           // mm
        holderType: string;
    };
    parameters: {
        speed: number;              // RPM
        axialDOC: number;           // mm
        radialWOC: number;          // mm
    };
    material: {
        id: string;
    };
}

interface ChatterOutput {
    stability: {
        isStable: boolean;
        margin: number;             // % margin to instability
        criticalDOC: number;        // mm
        criticalSpeed: number;      // RPM
    };
    
    stabilityLobes: {
        speeds: number[];           // RPM
        maxDOC: number[];           // mm
        stablePockets: Array<{
            speedMin: number;
            speedMax: number;
            maxDOC: number;
        }>;
    };
    
    recommendation: {
        suggestedSpeed: number;     // RPM
        suggestedDOC: number;       // mm
        reason: string;
    };
    
    frf?: {                         // Frequency Response Function
        frequencies: number[];
        magnitude: number[];
        phase: number[];
    };
    
    confidence: number;
    sources: DataSource[];
}
```

```javascript
// Route: physics.chatter.predict
PRISM_GATEWAY_CONTRACTS.register('physics.chatter.predict', {
    version: '1.0.0',
    description: 'Predict chatter stability and recommend parameters',
    input: { type: 'ChatterInput' },
    output: { type: 'ChatterOutput' },
    errors: [3001, 3106, 5001]
});

// Route: physics.chatter.findStable
PRISM_GATEWAY_CONTRACTS.register('physics.chatter.findStable', {
    version: '1.0.0',
    description: 'Find stable cutting parameters near requested values',
    input: {
        type: 'object',
        required: ['machine', 'tool', 'material', 'targetSpeed', 'targetDOC'],
        properties: {
            machine: { type: 'object' },
            tool: { type: 'object' },
            material: { type: 'object' },
            targetSpeed: { type: 'number', description: 'Target RPM' },
            targetDOC: { type: 'number', description: 'Target DOC in mm' },
            searchRange: { type: 'number', default: 20, description: '% to search around target' }
        }
    },
    output: {
        type: 'object',
        properties: {
            stableParameters: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        speed: { type: 'number' },
                        maxDOC: { type: 'number' },
                        mrr: { type: 'number' },
                        distanceFromTarget: { type: 'number' }
                    }
                }
            },
            bestOption: { type: 'object' }
        }
    },
    errors: [3106]
});
```

### 4.2 ML Engine Contracts

```typescript
// === ML PREDICTION ENGINE ===

interface MLPredictionInput {
    modelId: string;
    features: Record<string, number | string | boolean>;
    options?: {
        includeExplanation?: boolean;
        includeUncertainty?: boolean;
        fallbackToPhysics?: boolean;
    };
}

interface MLPredictionOutput {
    prediction: number | number[] | Record<string, number>;
    confidence: number;
    uncertainty?: {
        lower: number;
        upper: number;
        stdDev: number;
    };
    explanation?: {
        featureImportances: Record<string, number>;
        topFactors: Array<{
            feature: string;
            contribution: number;
            direction: 'positive' | 'negative';
        }>;
        narrative?: string;
    };
    modelInfo: {
        modelId: string;
        version: string;
        trainedOn: Timestamp;
        accuracy: number;
    };
}

interface MLEnsembleInput {
    models: string[];               // Model IDs
    features: Record<string, number | string | boolean>;
    aggregation?: 'mean' | 'median' | 'weighted' | 'voting';
    weights?: number[];
}

interface MLEnsembleOutput {
    prediction: number;
    confidence: number;
    agreement: number;              // How much models agree (0-1)
    modelPredictions: Array<{
        modelId: string;
        prediction: number;
        confidence: number;
        weight: number;
    }>;
    disagreementWarning?: string;
}
```

```javascript
// Route: ml.predict
PRISM_GATEWAY_CONTRACTS.register('ml.predict', {
    version: '1.0.0',
    description: 'Get ML model prediction with optional explanation',
    input: { type: 'MLPredictionInput' },
    output: { type: 'MLPredictionOutput' },
    errors: [9001, 9002, 9003, 9004]
});

// Route: ml.ensemble.predict
PRISM_GATEWAY_CONTRACTS.register('ml.ensemble.predict', {
    version: '1.0.0',
    description: 'Get ensemble prediction from multiple models',
    input: { type: 'MLEnsembleInput' },
    output: { type: 'MLEnsembleOutput' },
    errors: [9001, 9008]
});

// Route: ml.explain
PRISM_GATEWAY_CONTRACTS.register('ml.explain', {
    version: '1.0.0',
    description: 'Get detailed explanation for a prediction',
    input: {
        type: 'object',
        required: ['modelId', 'features', 'prediction'],
        properties: {
            modelId: { type: 'string' },
            features: { type: 'object' },
            prediction: { type: 'number' },
            explanationType: { type: 'string', enum: ['shap', 'lime', 'feature_importance'] }
        }
    },
    output: {
        type: 'object',
        properties: {
            explanation: {
                type: 'object',
                properties: {
                    method: { type: 'string' },
                    featureContributions: { type: 'object' },
                    baseValue: { type: 'number' },
                    narrative: { type: 'string' }
                }
            }
        }
    },
    errors: [9003]
});
```

### 4.3 Optimization Engine Contracts

```typescript
// === MULTI-OBJECTIVE OPTIMIZATION ===

interface OptimizationInput {
    objectives: Objective[];
    constraints: Constraint[];
    variables: Variable[];
    options?: {
        algorithm?: 'nsga2' | 'nsga3' | 'moead' | 'pso' | 'genetic';
        populationSize?: number;
        generations?: number;
        convergenceTolerance?: number;
        timeout?: number;           // seconds
    };
}

interface Objective {
    name: string;
    expression: string;             // e.g., "mrr" or "1/tool_life"
    direction: 'minimize' | 'maximize';
    weight?: number;
    target?: number;
}

interface Constraint {
    name: string;
    expression: string;             // e.g., "power <= machine_power"
    type: 'equality' | 'inequality';
    tolerance?: number;
}

interface Variable {
    name: string;
    type: 'continuous' | 'integer' | 'discrete';
    range: Range;
    discreteValues?: number[];
}

interface OptimizationOutput {
    paretoFront: ParetoSolution[];
    bestCompromise: ParetoSolution;
    convergence: {
        generations: number;
        converged: boolean;
        finalHypervolume: number;
    };
    timing: {
        totalTime: number;          // seconds
        evaluations: number;
    };
}

interface ParetoSolution {
    variables: Record<string, number>;
    objectives: Record<string, number>;
    constraintViolation: number;
    crowdingDistance: number;
    rank: number;
}
```

```javascript
// Route: optimization.multiObjective
PRISM_GATEWAY_CONTRACTS.register('optimization.multiObjective', {
    version: '1.0.0',
    description: 'Run multi-objective optimization',
    input: { type: 'OptimizationInput' },
    output: { type: 'OptimizationOutput' },
    errors: [3004, 3005]
});

// Route: optimization.singleObjective
PRISM_GATEWAY_CONTRACTS.register('optimization.singleObjective', {
    version: '1.0.0',
    description: 'Run single-objective optimization',
    input: {
        type: 'object',
        required: ['objective', 'variables'],
        properties: {
            objective: { type: 'Objective' },
            constraints: { type: 'array', items: { type: 'Constraint' } },
            variables: { type: 'array', items: { type: 'Variable' } },
            options: { type: 'object' }
        }
    },
    output: {
        type: 'object',
        properties: {
            optimum: { type: 'object' },
            objectiveValue: { type: 'number' },
            iterations: { type: 'number' },
            converged: { type: 'boolean' }
        }
    },
    errors: [3004, 3005]
});

// Route: optimization.machiningParameters
PRISM_GATEWAY_CONTRACTS.register('optimization.machiningParameters', {
    version: '1.0.0',
    description: 'Optimize machining parameters for given objectives',
    input: {
        type: 'object',
        required: ['material', 'tool', 'machine', 'operation'],
        properties: {
            material: { type: 'object' },
            tool: { type: 'object' },
            machine: { type: 'object' },
            operation: { type: 'object' },
            objectives: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['maximize_mrr', 'minimize_cost', 'maximize_tool_life', 'minimize_time', 'best_finish']
                }
            },
            weights: { type: 'array', items: { type: 'number' } }
        }
    },
    output: {
        type: 'object',
        properties: {
            optimalParameters: {
                type: 'object',
                properties: {
                    speed: { type: 'number' },
                    feed: { type: 'number' },
                    doc: { type: 'number' },
                    woc: { type: 'number' }
                }
            },
            predictions: {
                type: 'object',
                properties: {
                    mrr: { type: 'number' },
                    toolLife: { type: 'number' },
                    surfaceFinish: { type: 'number' },
                    cycleTime: { type: 'number' },
                    costPerPart: { type: 'number' }
                }
            },
            tradeoffs: { type: 'array' }
        }
    },
    errors: [3004, 5001]
});
```

## Section 6: CAD/CAM API Contracts

### 6.1 CAD Import/Export Contracts

```typescript
// CAD file import
interface CADImportInput {
    // File source
    source: {
        type: 'file' | 'url' | 'buffer';
        path?: string;                  // File path
        url?: string;                   // URL to fetch
        buffer?: ArrayBuffer;           // Raw data
        format?: CADFormat;             // Override auto-detection
    };
    
    // Import options
    options?: {
        units?: LengthUnit;             // Override file units
        tolerance?: number;             // Import tolerance
        healGeometry?: boolean;         // Auto-repair
        importColors?: boolean;
        importLayers?: boolean;
        importAssembly?: boolean;       // For STEP assemblies
        flattenAssembly?: boolean;
        coordinate?: 'original' | 'center' | 'corner';
    };
    
    // Validation
    validation?: {
        checkWatertight?: boolean;
        checkManifold?: boolean;
        checkMinimumSize?: Measurement;
        checkMaximumSize?: Measurement;
    };
}

type CADFormat = 
    | 'step' | 'stp' | 'iges' | 'igs'
    | 'stl' | 'obj' | 'ply'
    | 'dxf' | 'dwg'
    | 'x_t' | 'x_b'                     // Parasolid
    | 'sat' | 'sab'                     // ACIS
    | '3dm'                             // Rhino
    | 'brep'                            // Native BREP
    | 'json';                           // PRISM JSON format

interface CADImportOutput {
    // Import status
    status: 'success' | 'partial' | 'failed';
    
    // Imported model
    model?: {
        id: string;                     // Internal model ID
        name: string;
        format: CADFormat;
        units: LengthUnit;
    };
    
    // Geometry summary
    geometry: {
        bodies: number;
        faces: number;
        edges: number;
        vertices: number;
        boundingBox: BoundingBox;
        volume?: Measurement;
        surfaceArea?: Measurement;
        centerOfMass?: Point3D;
    };
    
    // Topology info
    topology: {
        isSolid: boolean;
        isWatertight: boolean;
        isManifold: boolean;
        shellCount: number;
        openEdges: number;
        duplicateFaces: number;
    };
    
    // Features detected
    features?: {
        holes: number;
        pockets: number;
        bosses: number;
        ribs: number;
        fillets: number;
        chamfers: number;
        threads: number;
    };
    
    // Issues found
    issues: Array<{
        type: 'error' | 'warning' | 'info';
        code: string;
        message: string;
        location?: Point3D;
        repaired?: boolean;
    }>;
    
    // Metadata from file
    metadata?: {
        author?: string;
        created?: Timestamp;
        modified?: Timestamp;
        description?: string;
        custom?: Record<string, string>;
    };
}
```

```javascript
// Route: cad.import
PRISM_GATEWAY_CONTRACTS.register('cad.import', {
    version: '1.0.0',
    description: 'Import CAD file',
    input: { type: 'CADImportInput' },
    output: { type: 'CADImportOutput' },
    errors: [4001, 4002, 4003, 4004]
});

// Route: cad.export
PRISM_GATEWAY_CONTRACTS.register('cad.export', {
    version: '1.0.0',
    description: 'Export CAD model to file',
    input: {
        type: 'object',
        required: ['modelId', 'format'],
        properties: {
            modelId: { type: 'string' },
            format: { type: 'CADFormat' },
            options: {
                type: 'object',
                properties: {
                    units: { type: 'LengthUnit' },
                    precision: { type: 'number' },
                    includeColors: { type: 'boolean' },
                    includeLayers: { type: 'boolean' },
                    stlFormat: { type: 'string', enum: ['ascii', 'binary'] },
                    stlTolerance: { type: 'number' }
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            buffer: { type: 'ArrayBuffer' },
            size: { type: 'number' },
            format: { type: 'string' },
            checksum: { type: 'string' }
        }
    },
    errors: [4001, 4005]
});

// Route: cad.validate
PRISM_GATEWAY_CONTRACTS.register('cad.validate', {
    version: '1.0.0',
    description: 'Validate CAD geometry',
    input: {
        type: 'object',
        required: ['modelId'],
        properties: {
            modelId: { type: 'string' },
            checks: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: [
                        'watertight', 'manifold', 'self_intersect',
                        'degenerate', 'small_faces', 'sliver_faces',
                        'open_edges', 'duplicate_vertices', 'invalid_normals'
                    ]
                }
            },
            tolerances: { type: 'object' }
        }
    },
    output: {
        type: 'object',
        properties: {
            valid: { type: 'boolean' },
            score: { type: 'number' },       // 0-100
            issues: { type: 'array' },
            recommendations: { type: 'array' }
        }
    },
    errors: [4001, 4006]
});
```

### 6.2 Feature Recognition Contracts

```typescript
interface FeatureRecognitionInput {
    // Model to analyze
    modelId: string;
    
    // Recognition options
    options?: {
        featureTypes?: FeatureType[];   // Filter feature types
        minimumSize?: Measurement;      // Ignore small features
        tolerance?: number;             // Recognition tolerance
        recognizeThreads?: boolean;
        recognizePatterns?: boolean;
        groupSimilar?: boolean;
    };
    
    // Manufacturing context
    context?: {
        machineType?: 'mill' | 'lathe' | 'mill_turn' | 'wire_edm';
        primaryAxis?: 'X' | 'Y' | 'Z' | '-X' | '-Y' | '-Z';
        partOrientation?: 'horizontal' | 'vertical';
    };
}

type FeatureType = 
    | 'hole' | 'blind_hole' | 'through_hole' | 'countersink' | 'counterbore' | 'spot_face'
    | 'pocket' | 'closed_pocket' | 'open_pocket' | 'slot' | 'keyway'
    | 'boss' | 'pad' | 'rib' | 'web'
    | 'fillet' | 'chamfer' | 'round' | 'edge_break'
    | 'thread' | 'internal_thread' | 'external_thread'
    | 'face' | 'planar_face' | 'cylindrical_face' | 'conical_face'
    | 'step' | 'notch' | 'groove' | 'undercut'
    | 'pattern' | 'linear_pattern' | 'circular_pattern';

interface FeatureRecognitionOutput {
    // Recognition status
    status: 'complete' | 'partial' | 'failed';
    coverage: number;                   // % of geometry recognized
    
    // Recognized features
    features: RecognizedFeature[];
    
    // Feature patterns
    patterns?: FeaturePattern[];
    
    // Unrecognized regions
    unrecognized?: Array<{
        faceIds: string[];
        volume?: Measurement;
        suggestion?: string;
    }>;
    
    // Summary
    summary: {
        totalFeatures: number;
        byType: Record<FeatureType, number>;
        estimatedOperations: number;
        complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
    };
}

interface RecognizedFeature {
    id: string;
    type: FeatureType;
    subtype?: string;
    
    // Geometry
    geometry: {
        location: Point3D;              // Feature center/start
        direction: Vector3D;            // Feature axis
        boundingBox: BoundingBox;
        volume?: Measurement;
        depth?: Measurement;
    };
    
    // Dimensions (type-specific)
    dimensions: Record<string, Measurement>;
    
    // For holes
    hole?: {
        diameter: Measurement;
        depth: Measurement;
        bottom: 'flat' | 'conical' | 'through';
        threadSpec?: string;            // e.g., "M8x1.25"
        countersink?: { diameter: Measurement; angle: number };
        counterbore?: { diameter: Measurement; depth: Measurement };
    };
    
    // For pockets
    pocket?: {
        length: Measurement;
        width: Measurement;
        depth: Measurement;
        cornerRadius: Measurement;
        floorRadius?: Measurement;
        walls: 'vertical' | 'draft';
        draftAngle?: number;
    };
    
    // Manufacturing info
    manufacturing: {
        accessibility: 'top' | 'bottom' | 'side' | 'multi';
        accessDirections: Vector3D[];
        minimumToolDiameter?: Measurement;
        suggestedOperations: string[];
        difficulty: 'easy' | 'moderate' | 'difficult';
    };
    
    // Relationships
    relationships?: {
        parent?: string;                // Feature ID
        children?: string[];
        pattern?: string;               // Pattern ID
        coaxialWith?: string[];
        concentricWith?: string[];
    };
    
    // Face references
    faces: string[];                    // CAD face IDs
    
    confidence: number;
}

interface FeaturePattern {
    id: string;
    type: 'linear' | 'circular' | 'rectangular' | 'irregular';
    features: string[];                 // Feature IDs in pattern
    
    // Pattern definition
    definition: {
        // For linear
        direction?: Vector3D;
        spacing?: Measurement;
        count?: number;
        
        // For circular
        axis?: Vector3D;
        center?: Point3D;
        angularSpacing?: number;        // degrees
        
        // For rectangular
        direction1?: Vector3D;
        direction2?: Vector3D;
        spacing1?: Measurement;
        spacing2?: Measurement;
        count1?: number;
        count2?: number;
    };
}
```

```javascript
// Route: cad.features.recognize
PRISM_GATEWAY_CONTRACTS.register('cad.features.recognize', {
    version: '1.0.0',
    description: 'Recognize manufacturing features in CAD model',
    input: { type: 'FeatureRecognitionInput' },
    output: { type: 'FeatureRecognitionOutput' },
    errors: [4001, 4007, 4008]
});

// Route: cad.features.get
PRISM_GATEWAY_CONTRACTS.register('cad.features.get', {
    version: '1.0.0',
    description: 'Get specific feature details',
    input: {
        type: 'object',
        required: ['modelId', 'featureId'],
        properties: {
            modelId: { type: 'string' },
            featureId: { type: 'string' }
        }
    },
    output: { type: 'RecognizedFeature' },
    errors: [4001, 4009]
});

// Route: cad.features.classify
PRISM_GATEWAY_CONTRACTS.register('cad.features.classify', {
    version: '1.0.0',
    description: 'Classify features by manufacturing operation',
    input: {
        type: 'object',
        required: ['modelId'],
        properties: {
            modelId: { type: 'string' },
            machineType: { type: 'string' },
            capabilities: { type: 'array' }
        }
    },
    output: {
        type: 'object',
        properties: {
            drilling: { type: 'array' },
            milling: { type: 'array' },
            turning: { type: 'array' },
            grinding: { type: 'array' },
            edm: { type: 'array' },
            manual: { type: 'array' },
            notManufacturable: { type: 'array' }
        }
    },
    errors: [4001, 4007]
});
```

### 6.3 CAM Operation Contracts

```typescript
interface CAMOperationInput {
    // Model and stock
    modelId: string;
    stock: {
        type: 'block' | 'cylinder' | 'custom';
        dimensions?: {
            x?: Measurement;
            y?: Measurement;
            z?: Measurement;
            diameter?: Measurement;
            length?: Measurement;
        };
        material: string;               // Material ID
        customModelId?: string;
    };
    
    // Operation definition
    operation: {
        type: CAMOperationType;
        features?: string[];            // Feature IDs to machine
        faces?: string[];               // Face IDs to machine
        region?: BoundingBox;           // Machining region
    };
    
    // Tool
    tool: {
        id?: string;                    // Tool from database
        type?: ToolType;
        diameter?: Measurement;
        cornerRadius?: Measurement;
        length?: Measurement;
        numberOfFlutes?: number;
    };
    
    // Cutting parameters
    parameters?: {
        speed?: Measurement;
        feedRate?: Measurement;
        feedPerTooth?: Measurement;
        axialDOC?: Measurement;
        radialWOC?: Measurement;
        plungeRate?: Measurement;
        stepover?: Measurement;         // % or absolute
        stepdown?: Measurement;
        tolerance?: Measurement;
        stockToLeave?: Measurement;
    };
    
    // Strategy options
    strategy?: {
        pattern: ToolpathPattern;
        direction: 'climb' | 'conventional' | 'mixed';
        startPoint?: 'inside' | 'outside' | 'optimize';
        entryMethod?: EntryMethod;
        exitMethod?: ExitMethod;
        cornerHandling?: 'sharp' | 'round' | 'loop';
        highSpeedMode?: boolean;
        smoothing?: 'none' | 'light' | 'medium' | 'aggressive';
    };
    
    // Containment and avoidance
    containment?: {
        boundary?: 'feature' | 'stock' | 'custom';
        offset?: Measurement;
        avoidFeatures?: string[];       // Feature IDs to avoid
        clampZones?: BoundingBox[];
    };
}

type CAMOperationType = 
    | 'face' | 'rough' | 'semifinish' | 'finish'
    | 'pocket_rough' | 'pocket_finish'
    | 'contour_rough' | 'contour_finish'
    | 'adaptive' | 'hsm' | 'trochoidal'
    | 'drill' | 'peck' | 'tap' | 'bore' | 'ream'
    | 'slot' | 'thread_mill'
    | '3d_rough' | '3d_semifinish' | '3d_finish'
    | 'parallel' | 'scallop' | 'pencil' | 'rest_mill'
    | '5axis_swarf' | '5axis_flow' | '5axis_multiaxis';

type ToolpathPattern = 
    | 'zigzag' | 'one_way' | 'spiral_in' | 'spiral_out'
    | 'offset' | 'contour_parallel' | 'morph'
    | 'adaptive' | 'trochoidal' | 'hsm'
    | 'radial' | 'circular';

type EntryMethod = 
    | 'plunge' | 'ramp' | 'helix' | 'arc' | 'profile';

type ExitMethod = 
    | 'plunge' | 'ramp' | 'arc' | 'tangent' | 'retract';

interface CAMOperationOutput {
    // Operation status
    status: 'success' | 'warning' | 'failed';
    operationId: string;
    
    // Generated toolpath
    toolpath: {
        id: string;
        moves: number;                  // Number of moves
        length: Measurement;            // Total path length
        cuttingLength: Measurement;     // Cutting path length
        rapidLength: Measurement;       // Rapid path length
        boundingBox: BoundingBox;
    };
    
    // Time estimates
    time: {
        cutting: Measurement;
        rapid: Measurement;
        total: Measurement;
    };
    
    // Material removal
    removal: {
        volume: Measurement;            // cm³
        mrr: Measurement;               // cm³/min average
        maxMRR: Measurement;            // cm³/min peak
        stockRemaining: Measurement;    // Volume remaining
    };
    
    // Parameters used (may differ from input)
    actualParameters: {
        speed: Measurement;
        feedRate: Measurement;
        axialDOC: Measurement;
        radialWOC: Measurement;
        stepover: Measurement;
        passes: number;
    };
    
    // Validation results
    validation: {
        collisionFree: boolean;
        withinMachineLimits: boolean;
        toolReach: boolean;
        issues: Array<{
            type: 'collision' | 'limit' | 'reach' | 'gouging' | 'air_cut';
            severity: 'error' | 'warning';
            location?: Point3D;
            message: string;
        }>;
    };
    
    // Recommendations
    recommendations?: string[];
}
```

```javascript
// Route: cam.operation.create
PRISM_GATEWAY_CONTRACTS.register('cam.operation.create', {
    version: '1.0.0',
    description: 'Create CAM operation and generate toolpath',
    input: { type: 'CAMOperationInput' },
    output: { type: 'CAMOperationOutput' },
    errors: [4001, 4010, 4011, 4012]
});

// Route: cam.operation.optimize
PRISM_GATEWAY_CONTRACTS.register('cam.operation.optimize', {
    version: '1.0.0',
    description: 'Optimize existing CAM operation',
    input: {
        type: 'object',
        required: ['operationId'],
        properties: {
            operationId: { type: 'string' },
            objectives: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['minimize_time', 'maximize_mrr', 'best_finish', 'minimize_tool_wear', 'minimize_force']
                }
            },
            constraints: { type: 'object' }
        }
    },
    output: {
        type: 'object',
        properties: {
            original: { type: 'CAMOperationOutput' },
            optimized: { type: 'CAMOperationOutput' },
            improvement: {
                type: 'object',
                properties: {
                    time: { type: 'number' },       // % change
                    mrr: { type: 'number' },
                    finish: { type: 'number' }
                }
            },
            changes: { type: 'array' }
        }
    },
    errors: [4010, 3004]
});

// Route: cam.operation.simulate
PRISM_GATEWAY_CONTRACTS.register('cam.operation.simulate', {
    version: '1.0.0',
    description: 'Simulate CAM operation with stock removal',
    input: {
        type: 'object',
        required: ['operationId'],
        properties: {
            operationId: { type: 'string' },
            options: {
                type: 'object',
                properties: {
                    resolution: { type: 'number' },
                    checkCollisions: { type: 'boolean' },
                    checkGouging: { type: 'boolean' },
                    generateAnimation: { type: 'boolean' },
                    frameRate: { type: 'number' }
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            status: { type: 'string' },
            stockModel: { type: 'string' },         // Resulting stock model ID
            collisions: { type: 'array' },
            gouges: { type: 'array' },
            animation: { type: 'object' }
        }
    },
    errors: [4010, 4013]
});
```

### 6.4 Toolpath Contracts

```typescript
interface ToolpathGetInput {
    toolpathId: string;
    format?: 'native' | 'points' | 'gcode';
    options?: {
        includeRapids?: boolean;
        includeRetracts?: boolean;
        simplify?: boolean;
        simplifyTolerance?: number;
    };
}

interface ToolpathData {
    id: string;
    operationId: string;
    
    // Toolpath metadata
    metadata: {
        type: CAMOperationType;
        tool: {
            id: string;
            diameter: Measurement;
            type: ToolType;
        };
        created: Timestamp;
        modified: Timestamp;
    };
    
    // Statistics
    statistics: {
        moves: number;
        points: number;
        totalLength: Measurement;
        cuttingLength: Measurement;
        rapidLength: Measurement;
        minZ: Measurement;
        maxZ: Measurement;
        estimatedTime: Measurement;
    };
    
    // Path data (format-dependent)
    path: ToolpathSegment[];
}

interface ToolpathSegment {
    type: 'rapid' | 'linear' | 'arc_cw' | 'arc_ccw' | 'helix';
    start: Point3D;
    end: Point3D;
    
    // For arcs/helix
    center?: Point3D;
    radius?: number;
    plane?: 'XY' | 'XZ' | 'YZ';
    turns?: number;                     // For helix
    
    // Feed information
    feed?: number;                      // mm/min or ipm
    speed?: number;                     // RPM
    
    // Additional info
    length?: number;
    time?: number;                      // seconds
    z?: number;                         // For constant Z moves
}
```

```javascript
// Route: cam.toolpath.get
PRISM_GATEWAY_CONTRACTS.register('cam.toolpath.get', {
    version: '1.0.0',
    description: 'Get toolpath data',
    input: { type: 'ToolpathGetInput' },
    output: { type: 'ToolpathData' },
    errors: [4010, 4014]
});

// Route: cam.toolpath.verify
PRISM_GATEWAY_CONTRACTS.register('cam.toolpath.verify', {
    version: '1.0.0',
    description: 'Verify toolpath against machine and stock',
    input: {
        type: 'object',
        required: ['toolpathId', 'machineId'],
        properties: {
            toolpathId: { type: 'string' },
            machineId: { type: 'string' },
            stockId: { type: 'string' },
            fixtureId: { type: 'string' },
            checks: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: [
                        'axis_limits', 'rapid_limits', 'feed_limits',
                        'spindle_limits', 'tool_collision', 'holder_collision',
                        'fixture_collision', 'stock_collision', 'gouging',
                        'air_cutting', 'entry_exit'
                    ]
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            valid: { type: 'boolean' },
            issues: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string' },
                        severity: { type: 'string' },
                        moveIndex: { type: 'number' },
                        location: { type: 'Point3D' },
                        message: { type: 'string' },
                        suggestion: { type: 'string' }
                    }
                }
            },
            statistics: {
                type: 'object',
                properties: {
                    axisUtilization: { type: 'object' },
                    feedRanges: { type: 'object' },
                    spindleRange: { type: 'object' },
                    collisionRisk: { type: 'number' }
                }
            }
        }
    },
    errors: [4010, 4013, 2003]
});

// Route: cam.toolpath.compare
PRISM_GATEWAY_CONTRACTS.register('cam.toolpath.compare', {
    version: '1.0.0',
    description: 'Compare two toolpaths',
    input: {
        type: 'object',
        required: ['toolpathId1', 'toolpathId2'],
        properties: {
            toolpathId1: { type: 'string' },
            toolpathId2: { type: 'string' },
            compareOn: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['time', 'length', 'mrr', 'forces', 'finish', 'tool_wear']
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            toolpath1: { type: 'object' },
            toolpath2: { type: 'object' },
            differences: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        metric: { type: 'string' },
                        value1: { type: 'number' },
                        value2: { type: 'number' },
                        percentDiff: { type: 'number' },
                        winner: { type: 'string' }
                    }
                }
            },
            recommendation: { type: 'string' }
        }
    },
    errors: [4010, 4014]
});
```

### 6.5 Post Processor Contracts

```typescript
interface PostProcessInput {
    // Source
    source: {
        toolpathIds?: string[];         // Toolpath IDs
        operationIds?: string[];        // Operation IDs (generates all toolpaths)
        programId?: string;             // Full program
    };
    
    // Target machine/controller
    target: {
        machineId?: string;             // Machine from database
        controllerId?: string;          // Controller from database
        postId?: string;                // Post processor ID
        customPost?: PostProcessorConfig;
    };
    
    // Program options
    program: {
        name: string;
        number?: number;                // O number
        units: 'inch' | 'mm';
        workOffset?: string;            // G54, G55, etc.
        comments?: boolean;
        lineNumbers?: boolean;
        lineNumberStart?: number;
        lineNumberIncrement?: number;
    };
    
    // Safety options
    safety?: {
        safeZ?: Measurement;
        homePosition?: Point3D;
        startupBlock?: string[];        // Custom startup G-codes
        endBlock?: string[];            // Custom end G-codes
        toolChangePosition?: Point3D;
    };
    
    // Format options
    format?: {
        precision?: {
            linear: number;             // Decimal places
            angular: number;
            feed: number;
        };
        modal?: boolean;                // Use modal G-codes
        blockFormat?: 'standard' | 'compressed' | 'expanded';
        maxLineLength?: number;
    };
}

interface PostProcessOutput {
    // Generated program
    program: {
        name: string;
        content: string;                // Full G-code content
        lines: number;
        size: number;                   // bytes
        checksum: string;
    };
    
    // Program summary
    summary: {
        operations: number;
        tools: Array<{
            number: number;
            description: string;
            diameter: Measurement;
        }>;
        workOffsets: string[];
        estimatedTime: Measurement;
        programRange: {
            x: Range;
            y: Range;
            z: Range;
        };
    };
    
    // Warnings and info
    warnings: Array<{
        line?: number;
        message: string;
        suggestion?: string;
    }>;
    
    // Code analysis
    analysis: {
        gcodes: Record<string, number>; // G-code frequency
        mcodes: Record<string, number>; // M-code frequency
        feedRange: Range;
        speedRange: Range;
        rapidPercent: number;
    };
}

interface PostProcessorConfig {
    // Controller dialect
    dialect: 'fanuc' | 'siemens' | 'heidenhain' | 'mazak' | 'haas' | 'okuma' | 'custom';
    
    // G-code mappings
    gcodes?: Record<string, string>;    // Override standard codes
    mcodes?: Record<string, string>;
    
    // Format rules
    format: {
        lineNumberFormat?: string;      // e.g., "N%05d"
        blockFormat?: string;
        coordinateFormat?: string;
        feedFormat?: string;
        speedFormat?: string;
    };
    
    // Machine-specific features
    features?: {
        hasPallet?: boolean;
        hasSubSpindle?: boolean;
        hasYAxis?: boolean;
        hasBAxis?: boolean;
        hasCAxis?: boolean;
        hasLiveTooling?: boolean;
        hasProbing?: boolean;
    };
    
    // Custom blocks
    customBlocks?: {
        programStart?: string[];
        programEnd?: string[];
        toolChange?: string[];
        operationStart?: string[];
        operationEnd?: string[];
    };
}
```

```javascript
// Route: cam.post.generate
PRISM_GATEWAY_CONTRACTS.register('cam.post.generate', {
    version: '1.0.0',
    description: 'Generate G-code from toolpaths',
    input: { type: 'PostProcessInput' },
    output: { type: 'PostProcessOutput' },
    errors: [4010, 4015, 4016, 2003]
});

// Route: cam.post.validate
PRISM_GATEWAY_CONTRACTS.register('cam.post.validate', {
    version: '1.0.0',
    description: 'Validate G-code program',
    input: {
        type: 'object',
        required: ['program'],
        properties: {
            program: { type: 'string' },        // G-code content
            controllerId: { type: 'string' },
            machineId: { type: 'string' },
            checks: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: [
                        'syntax', 'codes', 'limits', 'sequence',
                        'safety', 'tool_calls', 'coordinates'
                    ]
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            valid: { type: 'boolean' },
            errors: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        line: { type: 'number' },
                        column: { type: 'number' },
                        code: { type: 'string' },
                        message: { type: 'string' },
                        severity: { type: 'string' }
                    }
                }
            },
            warnings: { type: 'array' },
            statistics: { type: 'object' }
        }
    },
    errors: [4015, 4016]
});

// Route: cam.post.backplot
PRISM_GATEWAY_CONTRACTS.register('cam.post.backplot', {
    version: '1.0.0',
    description: 'Generate toolpath from G-code (reverse post)',
    input: {
        type: 'object',
        required: ['program'],
        properties: {
            program: { type: 'string' },
            machineId: { type: 'string' },
            options: {
                type: 'object',
                properties: {
                    resolution: { type: 'number' },
                    includeRapids: { type: 'boolean' },
                    colorByOperation: { type: 'boolean' },
                    generateMesh: { type: 'boolean' }
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            toolpath: { type: 'ToolpathData' },
            tools: { type: 'array' },
            boundingBox: { type: 'BoundingBox' },
            visualization: { type: 'object' }
        }
    },
    errors: [4015, 4016, 4017]
});
```

*End of Part 1 - Part 2 will cover: Learning API Contracts, System API Contracts, Event Contracts, WebSocket Contracts, Batch Processing Contracts, Error Response Standards*


## Section 9: System API Contracts

### 9.1 Health and Status

```typescript
interface HealthCheckOutput {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Timestamp;
    version: string;
    
    // Component health
    components: {
        database: ComponentHealth;
        cache: ComponentHealth;
        mlService: ComponentHealth;
        fileStorage: ComponentHealth;
        eventBus: ComponentHealth;
        gateway: ComponentHealth;
    };
    
    // Resource utilization
    resources: {
        cpu: { usage: number; limit: number };
        memory: { used: number; total: number; percent: number };
        disk: { used: number; total: number; percent: number };
        connections: { active: number; max: number };
    };
    
    // Performance metrics
    performance: {
        avgResponseTime: number;        // ms
        p95ResponseTime: number;
        p99ResponseTime: number;
        requestsPerSecond: number;
        errorRate: number;
    };
    
    // Issues
    issues?: Array<{
        component: string;
        severity: 'warning' | 'critical';
        message: string;
        since: Timestamp;
    }>;
}

interface ComponentHealth {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    responseTime?: number;              // ms
    lastCheck: Timestamp;
    details?: string;
}
```

```javascript
// Route: system.health
PRISM_GATEWAY_CONTRACTS.register('system.health', {
    version: '1.0.0',
    description: 'Get system health status',
    input: {
        type: 'object',
        properties: {
            detailed: { type: 'boolean', default: false },
            components: { type: 'array', items: { type: 'string' } }
        }
    },
    output: { type: 'HealthCheckOutput' },
    errors: [1000]
});

// Route: system.status
PRISM_GATEWAY_CONTRACTS.register('system.status', {
    version: '1.0.0',
    description: 'Get system status summary',
    input: { type: 'object', properties: {} },
    output: {
        type: 'object',
        properties: {
            status: { type: 'string' },
            version: { type: 'string' },
            uptime: { type: 'number' },
            activeUsers: { type: 'number' },
            pendingJobs: { type: 'number' },
            degradedFeatures: { type: 'array' }
        }
    },
    errors: []
});

// Route: system.metrics
PRISM_GATEWAY_CONTRACTS.register('system.metrics', {
    version: '1.0.0',
    description: 'Get detailed system metrics',
    input: {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                enum: ['performance', 'usage', 'errors', 'all']
            },
            timeRange: {
                type: 'object',
                properties: {
                    start: { type: 'Timestamp' },
                    end: { type: 'Timestamp' }
                }
            },
            granularity: { type: 'string', enum: ['minute', 'hour', 'day'] }
        }
    },
    output: {
        type: 'object',
        properties: {
            metrics: { type: 'array' },
            aggregations: { type: 'object' },
            trends: { type: 'object' }
        }
    },
    errors: [1000]
});
```

### 9.2 Configuration API

```typescript
interface ConfigurationInput {
    // Configuration path
    path: string;                       // e.g., "calculators.speedfeed.defaults"
    
    // Action
    action: 'get' | 'set' | 'reset';
    
    // For set action
    value?: any;
    
    // Validation
    validate?: boolean;
}

interface ConfigurationOutput {
    path: string;
    value: any;
    schema?: object;                    // JSON Schema for validation
    metadata: {
        type: string;
        default: any;
        mutable: boolean;
        requiresRestart: boolean;
        lastModified?: Timestamp;
        modifiedBy?: string;
    };
}
```

```javascript
// Route: system.config.get
PRISM_GATEWAY_CONTRACTS.register('system.config.get', {
    version: '1.0.0',
    description: 'Get configuration value',
    input: {
        type: 'object',
        required: ['path'],
        properties: {
            path: { type: 'string' },
            includeMetadata: { type: 'boolean', default: false }
        }
    },
    output: { type: 'ConfigurationOutput' },
    errors: [1002, 8101]
});

// Route: system.config.set
PRISM_GATEWAY_CONTRACTS.register('system.config.set', {
    version: '1.0.0',
    description: 'Set configuration value',
    input: {
        type: 'object',
        required: ['path', 'value'],
        properties: {
            path: { type: 'string' },
            value: { type: 'any' },
            validate: { type: 'boolean', default: true }
        }
    },
    output: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            previousValue: { type: 'any' },
            newValue: { type: 'any' },
            requiresRestart: { type: 'boolean' }
        }
    },
    errors: [1002, 8101, 5001]
});

// Route: system.config.list
PRISM_GATEWAY_CONTRACTS.register('system.config.list', {
    version: '1.0.0',
    description: 'List all configuration paths',
    input: {
        type: 'object',
        properties: {
            prefix: { type: 'string' },
            category: { type: 'string' }
        }
    },
    output: {
        type: 'object',
        properties: {
            paths: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        path: { type: 'string' },
                        type: { type: 'string' },
                        description: { type: 'string' }
                    }
                }
            }
        }
    },
    errors: [8101]
});
```

### 9.3 Cache Management

```javascript
// Route: system.cache.clear
PRISM_GATEWAY_CONTRACTS.register('system.cache.clear', {
    version: '1.0.0',
    description: 'Clear cache entries',
    input: {
        type: 'object',
        properties: {
            pattern: { type: 'string' },            // Glob pattern
            category: { type: 'string' },
            maxAge: { type: 'number' }              // Clear entries older than (seconds)
        }
    },
    output: {
        type: 'object',
        properties: {
            cleared: { type: 'number' },
            freedMemory: { type: 'number' }         // bytes
        }
    },
    errors: [1000]
});

// Route: system.cache.stats
PRISM_GATEWAY_CONTRACTS.register('system.cache.stats', {
    version: '1.0.0',
    description: 'Get cache statistics',
    input: { type: 'object', properties: {} },
    output: {
        type: 'object',
        properties: {
            entries: { type: 'number' },
            memoryUsed: { type: 'number' },
            hitRate: { type: 'number' },
            missRate: { type: 'number' },
            evictions: { type: 'number' },
            byCategory: { type: 'object' }
        }
    },
    errors: []
});

// Route: system.cache.warm
PRISM_GATEWAY_CONTRACTS.register('system.cache.warm', {
    version: '1.0.0',
    description: 'Warm cache with frequently accessed data',
    input: {
        type: 'object',
        properties: {
            categories: { type: 'array', items: { type: 'string' } },
            priority: { type: 'string', enum: ['low', 'normal', 'high'] }
        }
    },
    output: {
        type: 'object',
        properties: {
            jobId: { type: 'string' },
            estimatedTime: { type: 'number' },
            entriesToLoad: { type: 'number' }
        }
    },
    errors: [1000]
});
```

## Section 11: WebSocket Contracts

### 11.1 Connection Protocol

```typescript
// WebSocket message envelope
interface WSMessage {
    id: string;                         // Message ID for correlation
    type: WSMessageType;
    payload: any;
    timestamp: Timestamp;
}

type WSMessageType = 
    // Connection management
    | 'connect' | 'disconnect' | 'ping' | 'pong'
    | 'subscribe' | 'unsubscribe'
    
    // Data streaming
    | 'data' | 'batch'
    
    // Control
    | 'ack' | 'nack' | 'error'
    
    // Events
    | 'event';

// Connection request
interface WSConnectRequest {
    type: 'connect';
    payload: {
        token?: string;                 // Auth token
        subscriptions?: string[];       // Initial subscriptions
        options?: {
            heartbeatInterval?: number; // ms
            reconnectPolicy?: 'always' | 'once' | 'never';
            compression?: boolean;
        };
    };
}

// Connection response
interface WSConnectResponse {
    type: 'connect';
    payload: {
        connectionId: string;
        sessionId: string;
        heartbeatInterval: number;
        serverTime: Timestamp;
        capabilities: string[];
    };
}
```

### 11.2 Streaming Channels

```javascript
// Available WebSocket channels
const WS_CHANNELS = {
    // Calculation progress
    'calculation.progress': {
        description: 'Real-time calculation progress updates',
        payload: {
            calculationId: 'string',
            progress: 'number',         // 0-100
            stage: 'string',
            estimate: 'number'          // seconds remaining
        }
    },
    
    // Simulation updates
    'simulation.frame': {
        description: 'Simulation frame updates',
        payload: {
            simulationId: 'string',
            frame: 'number',
            stockModel: 'object',       // Current stock state
            toolPosition: 'Point3D',
            timestamp: 'number'
        }
    },
    
    // Toolpath streaming
    'toolpath.segment': {
        description: 'Stream toolpath segments as generated',
        payload: {
            operationId: 'string',
            segment: 'ToolpathSegment',
            index: 'number',
            complete: 'boolean'
        }
    },
    
    // System alerts
    'system.alert': {
        description: 'System alerts and warnings',
        payload: {
            level: 'string',
            component: 'string',
            message: 'string',
            timestamp: 'Timestamp'
        }
    },
    
    // Machine monitoring (future)
    'machine.status': {
        description: 'Real-time machine status',
        payload: {
            machineId: 'string',
            status: 'string',
            position: 'object',
            spindle: 'object',
            alarms: 'array'
        }
    }
};
```

## Section 13: Error Response Standards

### 13.1 Standard Error Response

```typescript
interface APIErrorResponse {
    // Always present
    success: false;
    error: {
        // Error identification
        code: number;                   // PRISM error code (1000-9999)
        name: string;                   // Error name
        message: string;                // Human-readable message
        
        // Details
        details?: {
            field?: string;             // For validation errors
            value?: any;                // Problematic value
            constraint?: string;        // Violated constraint
            expected?: any;             // Expected value/format
            actual?: any;               // Actual value
        };
        
        // Recovery guidance
        suggestions?: string[];         // How to fix
        documentation?: string;         // Link to docs
        
        // Classification
        category: ErrorCategory;
        severity: 'low' | 'medium' | 'high' | 'critical';
        recoverable: boolean;
        
        // Context
        timestamp: Timestamp;
        requestId: string;
        path?: string;                  // API route
    };
    
    // Request metadata
    metadata: ResponseMetadata;
}

type ErrorCategory = 
    | 'system' | 'database' | 'physics' | 'cad_cam'
    | 'validation' | 'ui' | 'network' | 'security' | 'learning';
```

### 13.2 Validation Error Format

```typescript
interface ValidationErrorResponse extends APIErrorResponse {
    error: {
        code: 5001;                     // VALIDATION_FAILED
        name: 'VALIDATION_FAILED';
        message: string;
        
        // Validation-specific details
        validationErrors: Array<{
            field: string;              // Field path (e.g., "material.hardness.value")
            code: string;               // Validation rule code
            message: string;            // Human-readable message
            value: any;                 // The invalid value
            constraints: {
                type?: string;          // Expected type
                min?: number;
                max?: number;
                pattern?: string;
                enum?: any[];
                required?: boolean;
            };
            suggestion?: string;        // How to fix
        }>;
        
        // Overall validation summary
        summary: {
            totalFields: number;
            validFields: number;
            invalidFields: number;
            warnings: number;
        };
    };
}
```

### 13.3 Error Code Registry

```javascript
// PRISM Error Code Registry
const PRISM_ERROR_CODES = {
    // System Errors (1000-1999)
    1000: { name: 'SYSTEM_ERROR', severity: 'high', recoverable: false },
    1001: { name: 'INITIALIZATION_FAILED', severity: 'critical', recoverable: false },
    1002: { name: 'CONFIG_ERROR', severity: 'high', recoverable: false },
    1003: { name: 'MEMORY_EXHAUSTED', severity: 'critical', recoverable: true },
    1004: { name: 'TIMEOUT', severity: 'medium', recoverable: true },
    1005: { name: 'SERVICE_UNAVAILABLE', severity: 'high', recoverable: true },
    
    // Database Errors (2000-2999)
    2001: { name: 'RECORD_NOT_FOUND', severity: 'medium', recoverable: false },
    2002: { name: 'DUPLICATE_RECORD', severity: 'medium', recoverable: false },
    2003: { name: 'DATABASE_CONNECTION_FAILED', severity: 'high', recoverable: true },
    2004: { name: 'QUERY_FAILED', severity: 'medium', recoverable: true },
    2005: { name: 'CONSTRAINT_VIOLATION', severity: 'medium', recoverable: false },
    
    // Physics Errors (3000-3999)
    3001: { name: 'PHYSICS_CALCULATION_ERROR', severity: 'medium', recoverable: true },
    3002: { name: 'CONVERGENCE_FAILED', severity: 'medium', recoverable: true },
    3003: { name: 'PHYSICS_CONSTRAINT_VIOLATED', severity: 'medium', recoverable: false },
    3004: { name: 'OPTIMIZATION_FAILED', severity: 'medium', recoverable: true },
    3005: { name: 'NUMERICAL_INSTABILITY', severity: 'medium', recoverable: true },
    
    // CAD/CAM Errors (4000-4999)
    4001: { name: 'MODEL_NOT_FOUND', severity: 'medium', recoverable: false },
    4002: { name: 'INVALID_GEOMETRY', severity: 'medium', recoverable: false },
    4003: { name: 'IMPORT_FAILED', severity: 'medium', recoverable: true },
    4004: { name: 'FORMAT_NOT_SUPPORTED', severity: 'low', recoverable: false },
    4010: { name: 'TOOLPATH_GENERATION_FAILED', severity: 'medium', recoverable: true },
    4015: { name: 'POST_PROCESSOR_ERROR', severity: 'medium', recoverable: true },
    
    // Validation Errors (5000-5999)
    5001: { name: 'VALIDATION_FAILED', severity: 'low', recoverable: false },
    5002: { name: 'TYPE_MISMATCH', severity: 'low', recoverable: false },
    5003: { name: 'RANGE_EXCEEDED', severity: 'low', recoverable: false },
    5004: { name: 'REQUIRED_FIELD_MISSING', severity: 'low', recoverable: false },
    5005: { name: 'INVALID_FORMAT', severity: 'low', recoverable: false },
    5006: { name: 'CONSTRAINT_UNSATISFIABLE', severity: 'medium', recoverable: false },
    
    // Network Errors (7000-7999)
    7000: { name: 'NETWORK_OFFLINE', severity: 'high', recoverable: true },
    7001: { name: 'CONNECTION_TIMEOUT', severity: 'medium', recoverable: true },
    7100: { name: 'API_ERROR', severity: 'medium', recoverable: true },
    7101: { name: 'UNAUTHORIZED', severity: 'medium', recoverable: false },
    7102: { name: 'FORBIDDEN', severity: 'medium', recoverable: false },
    7103: { name: 'RATE_LIMITED', severity: 'low', recoverable: true },
    
    // Security Errors (8000-8999)
    8001: { name: 'AUTHENTICATION_FAILED', severity: 'medium', recoverable: false },
    8002: { name: 'TOKEN_EXPIRED', severity: 'low', recoverable: true },
    8101: { name: 'PERMISSION_DENIED', severity: 'medium', recoverable: false },
    8201: { name: 'DATA_INTEGRITY_VIOLATION', severity: 'high', recoverable: false },
    
    // Learning/ML Errors (9000-9999)
    9000: { name: 'MODEL_LOAD_FAILED', severity: 'medium', recoverable: true },
    9001: { name: 'INFERENCE_FAILED', severity: 'medium', recoverable: true },
    9100: { name: 'TRAINING_FAILED', severity: 'medium', recoverable: true },
    9200: { name: 'FEEDBACK_REJECTED', severity: 'low', recoverable: false }
};

// Error response factory
const PRISM_ERROR_RESPONSE = {
    create(code, details = {}, requestId = null) {
        const errorDef = PRISM_ERROR_CODES[code];
        if (!errorDef) {
            throw new Error(`Unknown error code: ${code}`);
        }
        
        return {
            success: false,
            error: {
                code,
                name: errorDef.name,
                message: details.message || `Error: ${errorDef.name}`,
                details: details.details || null,
                suggestions: details.suggestions || [],
                category: this._categoryFromCode(code),
                severity: errorDef.severity,
                recoverable: errorDef.recoverable,
                timestamp: new Date().toISOString(),
                requestId: requestId || this._generateRequestId()
            },
            metadata: {
                requestId: requestId || this._generateRequestId(),
                timestamp: new Date().toISOString(),
                duration: details.duration || 0,
                version: '1.0.0'
            }
        };
    },
    
    _categoryFromCode(code) {
        if (code >= 1000 && code < 2000) return 'system';
        if (code >= 2000 && code < 3000) return 'database';
        if (code >= 3000 && code < 4000) return 'physics';
        if (code >= 4000 && code < 5000) return 'cad_cam';
        if (code >= 5000 && code < 6000) return 'validation';
        if (code >= 6000 && code < 7000) return 'ui';
        if (code >= 7000 && code < 8000) return 'network';
        if (code >= 8000 && code < 9000) return 'security';
        if (code >= 9000 && code < 10000) return 'learning';
        return 'unknown';
    },
    
    _generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
```

## Section 15: Rate Limiting and Quotas

### 15.1 Rate Limit Contract

```typescript
interface RateLimitInfo {
    // Limit details
    limit: number;                      // Requests allowed
    remaining: number;                  // Requests remaining
    reset: number;                      // Unix timestamp of reset
    resetIn: number;                    // Seconds until reset
    
    // Window info
    window: 'second' | 'minute' | 'hour' | 'day';
    windowSize: number;
    
    // Quota info
    quota?: {
        type: 'requests' | 'compute' | 'storage';
        used: number;
        limit: number;
        resetDate: string;
    };
}

interface RateLimitHeaders {
    'X-RateLimit-Limit': string;
    'X-RateLimit-Remaining': string;
    'X-RateLimit-Reset': string;
    'X-RateLimit-Reset-In': string;
}

// Rate limit exceeded response
interface RateLimitExceededResponse extends APIErrorResponse {
    error: {
        code: 7103;                     // RATE_LIMITED
        name: 'RATE_LIMITED';
        message: string;
        rateLimitInfo: RateLimitInfo;
        retryAfter: number;             // Seconds
    };
}
```

### 15.2 Rate Limit Tiers

```javascript
// Rate limits by route category
const RATE_LIMITS = {
    // High-frequency routes (calculations)
    calculations: {
        limit: 100,
        window: 'minute',
        routes: [
            'calculator.speedfeed.*',
            'calculator.power.*',
            'calculator.toollife.*',
            'calculator.finish.*'
        ]
    },
    
    // Database queries
    database: {
        limit: 300,
        window: 'minute',
        routes: [
            'materials.*',
            'machines.*',
            'tools.*'
        ]
    },
    
    // Heavy computation
    compute: {
        limit: 20,
        window: 'minute',
        routes: [
            'optimization.*',
            'cam.operation.*',
            'cam.toolpath.*',
            'physics.chatter.*'
        ]
    },
    
    // ML inference
    ml: {
        limit: 50,
        window: 'minute',
        routes: [
            'ml.predict',
            'ml.ensemble.*'
        ]
    },
    
    // Batch operations
    batch: {
        limit: 10,
        window: 'hour',
        routes: [
            'batch.*'
        ]
    },
    
    // System/admin
    system: {
        limit: 30,
        window: 'minute',
        routes: [
            'system.*',
            'learning.model.*'
        ]
    }
};

// Route: api.ratelimit
PRISM_GATEWAY_CONTRACTS.register('api.ratelimit', {
    version: '1.0.0',
    description: 'Get rate limit status',
    input: {
        type: 'object',
        properties: {
            route: { type: 'string' }
        }
    },
    output: {
        type: 'object',
        properties: {
            limits: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        category: { type: 'string' },
                        limit: { type: 'number' },
                        remaining: { type: 'number' },
                        reset: { type: 'number' },
                        window: { type: 'string' }
                    }
                }
            },
            quota: { type: 'object' }
        }
    },
    errors: []
});
```

## Section 17: Complete API Route Index

### 17.1 All Routes by Category

```javascript
// COMPLETE PRISM API ROUTE REGISTRY
const PRISM_API_ROUTES = {
    // ════════════════════════════════════════════════════════════════
    // DATABASE ROUTES
    // ════════════════════════════════════════════════════════════════
    
    // Materials (6 routes)
    'materials.get':            { method: 'GET',  auth: 'materials.read' },
    'materials.search':         { method: 'POST', auth: 'materials.read' },
    'materials.getCuttingData': { method: 'GET',  auth: 'materials.read' },
    'materials.compare':        { method: 'POST', auth: 'materials.read' },
    'materials.create':         { method: 'POST', auth: 'materials.write' },
    'materials.update':         { method: 'PUT',  auth: 'materials.write' },
    
    // Machines (6 routes)
    'machines.get':             { method: 'GET',  auth: 'machines.read' },
    'machines.search':          { method: 'POST', auth: 'machines.read' },
    'machines.getCapabilities': { method: 'GET',  auth: 'machines.read' },
    'machines.getPostRequirements': { method: 'GET', auth: 'machines.read' },
    'machines.create':          { method: 'POST', auth: 'machines.write' },
    'machines.update':          { method: 'PUT',  auth: 'machines.write' },
    
    // Tools (5 routes)
    'tools.get':                { method: 'GET',  auth: 'tools.read' },
    'tools.search':             { method: 'POST', auth: 'tools.read' },
    'tools.recommend':          { method: 'POST', auth: 'tools.read' },
    'tools.create':             { method: 'POST', auth: 'tools.write' },
    'tools.update':             { method: 'PUT',  auth: 'tools.write' },
    
    // ════════════════════════════════════════════════════════════════
    // PHYSICS ENGINE ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'physics.force.calculate':      { method: 'POST', auth: 'calculators.use' },
    'physics.toollife.calculate':   { method: 'POST', auth: 'calculators.use' },
    'physics.toollife.optimize':    { method: 'POST', auth: 'calculators.use' },
    'physics.chatter.predict':      { method: 'POST', auth: 'calculators.use' },
    'physics.chatter.findStable':   { method: 'POST', auth: 'calculators.use' },
    
    // ════════════════════════════════════════════════════════════════
    // ML ENGINE ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'ml.predict':               { method: 'POST', auth: 'ml.predict' },
    'ml.ensemble.predict':      { method: 'POST', auth: 'ml.predict' },
    'ml.explain':               { method: 'POST', auth: 'ml.predict' },
    
    // ════════════════════════════════════════════════════════════════
    // OPTIMIZATION ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'optimization.multiObjective':  { method: 'POST', auth: 'calculators.use' },
    'optimization.singleObjective': { method: 'POST', auth: 'calculators.use' },
    'optimization.machiningParameters': { method: 'POST', auth: 'calculators.use' },
    
    // ════════════════════════════════════════════════════════════════
    // CALCULATOR ROUTES
    // ════════════════════════════════════════════════════════════════
    
    // Speed & Feed (3 routes)
    'calculator.speedfeed.calculate': { method: 'POST', auth: 'calculators.use' },
    'calculator.speedfeed.compare':   { method: 'POST', auth: 'calculators.use' },
    'calculator.speedfeed.adjust':    { method: 'POST', auth: 'calculators.use' },
    
    // Power & Torque (2 routes)
    'calculator.power.calculate':     { method: 'POST', auth: 'calculators.use' },
    'calculator.power.curve':         { method: 'POST', auth: 'calculators.use' },
    
    // Tool Life (3 routes)
    'calculator.toollife.predict':    { method: 'POST', auth: 'calculators.use' },
    'calculator.toollife.findSpeed':  { method: 'POST', auth: 'calculators.use' },
    'calculator.toollife.optimizeCost': { method: 'POST', auth: 'calculators.use' },
    
    // Surface Finish (2 routes)
    'calculator.finish.predict':      { method: 'POST', auth: 'calculators.use' },
    'calculator.finish.achieve':      { method: 'POST', auth: 'calculators.use' },
    
    // Cycle Time (2 routes)
    'calculator.cycletime.calculate': { method: 'POST', auth: 'calculators.use' },
    'calculator.cycletime.optimize':  { method: 'POST', auth: 'calculators.use' },
    
    // Cost (3 routes)
    'calculator.cost.estimate':       { method: 'POST', auth: 'calculators.use' },
    'calculator.cost.compare':        { method: 'POST', auth: 'calculators.use' },
    'calculator.cost.quantityBreak':  { method: 'POST', auth: 'calculators.use' },
    
    // ════════════════════════════════════════════════════════════════
    // CAD ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'cad.import':               { method: 'POST', auth: 'cad.write' },
    'cad.export':               { method: 'POST', auth: 'cad.read' },
    'cad.validate':             { method: 'POST', auth: 'cad.read' },
    'cad.features.recognize':   { method: 'POST', auth: 'cad.read' },
    'cad.features.get':         { method: 'GET',  auth: 'cad.read' },
    'cad.features.classify':    { method: 'POST', auth: 'cad.read' },
    
    // ════════════════════════════════════════════════════════════════
    // CAM ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'cam.operation.create':     { method: 'POST', auth: 'cam.write' },
    'cam.operation.optimize':   { method: 'POST', auth: 'cam.write' },
    'cam.operation.simulate':   { method: 'POST', auth: 'cam.read' },
    'cam.toolpath.get':         { method: 'GET',  auth: 'cam.read' },
    'cam.toolpath.verify':      { method: 'POST', auth: 'cam.read' },
    'cam.toolpath.compare':     { method: 'POST', auth: 'cam.read' },
    'cam.post.generate':        { method: 'POST', auth: 'post.generate' },
    'cam.post.validate':        { method: 'POST', auth: 'cam.read' },
    'cam.post.backplot':        { method: 'POST', auth: 'cam.read' },
    
    // ════════════════════════════════════════════════════════════════
    // LEARNING ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'learning.feedback.submit': { method: 'POST', auth: 'learning.feedback' },
    'learning.feedback.bulk':   { method: 'POST', auth: 'learning.feedback' },
    'learning.feedback.query':  { method: 'POST', auth: 'learning.feedback' },
    'learning.model.train':     { method: 'POST', auth: 'ml.train' },
    'learning.model.status':    { method: 'GET',  auth: 'ml.train' },
    'learning.model.deploy':    { method: 'POST', auth: 'ml.deploy' },
    'learning.model.compare':   { method: 'POST', auth: 'ml.train' },
    'learning.knowledge.update':  { method: 'POST', auth: 'learning.knowledge' },
    'learning.knowledge.validate':{ method: 'POST', auth: 'learning.knowledge' },
    'learning.knowledge.history': { method: 'GET',  auth: 'learning.knowledge' },
    
    // ════════════════════════════════════════════════════════════════
    // SYSTEM ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'system.health':            { method: 'GET',  auth: null },
    'system.status':            { method: 'GET',  auth: null },
    'system.metrics':           { method: 'GET',  auth: 'system.admin' },
    'system.config.get':        { method: 'GET',  auth: 'system.config' },
    'system.config.set':        { method: 'POST', auth: 'system.config' },
    'system.config.list':       { method: 'GET',  auth: 'system.config' },
    'system.cache.clear':       { method: 'POST', auth: 'system.admin' },
    'system.cache.stats':       { method: 'GET',  auth: 'system.admin' },
    'system.cache.warm':        { method: 'POST', auth: 'system.admin' },
    
    // ════════════════════════════════════════════════════════════════
    // EVENT ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'events.subscribe':         { method: 'POST', auth: 'viewer' },
    'events.unsubscribe':       { method: 'POST', auth: 'viewer' },
    'events.publish':           { method: 'POST', auth: 'operator' },
    'events.history':           { method: 'GET',  auth: 'viewer' },
    
    // ════════════════════════════════════════════════════════════════
    // BATCH ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'batch.submit':             { method: 'POST', auth: 'batch.submit' },
    'batch.status':             { method: 'GET',  auth: 'batch.submit' },
    'batch.cancel':             { method: 'POST', auth: 'batch.submit' },
    'batch.list':               { method: 'GET',  auth: 'batch.submit' },
    
    // ════════════════════════════════════════════════════════════════
    // AUTH ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'auth.login':               { method: 'POST', auth: null },
    'auth.refresh':             { method: 'POST', auth: null },
    'auth.logout':              { method: 'POST', auth: 'viewer' },
    'auth.permissions':         { method: 'GET',  auth: 'viewer' },
    'auth.check':               { method: 'POST', auth: 'viewer' },
    
    // ════════════════════════════════════════════════════════════════
    // META ROUTES
    // ════════════════════════════════════════════════════════════════
    
    'api.versions':             { method: 'GET',  auth: null },
    'api.ratelimit':            { method: 'GET',  auth: null },
    'api.docs':                 { method: 'GET',  auth: null }
};

// Route count summary
const ROUTE_SUMMARY = {
    database: 17,
    physics: 5,
    ml: 3,
    optimization: 3,
    calculators: 15,
    cad: 6,
    cam: 9,
    learning: 10,
    system: 9,
    events: 4,
    batch: 4,
    auth: 5,
    meta: 3,
    TOTAL: 93
};
```

### 17.2 Route Statistics

| Category | Routes | Auth Required | Public |
|----------|--------|---------------|--------|
| Database | 17 | 17 | 0 |
| Physics | 5 | 5 | 0 |
| ML | 3 | 3 | 0 |
| Optimization | 3 | 3 | 0 |
| Calculators | 15 | 15 | 0 |
| CAD | 6 | 6 | 0 |
| CAM | 9 | 9 | 0 |
| Learning | 10 | 10 | 0 |
| System | 9 | 6 | 3 |
| Events | 4 | 4 | 0 |
| Batch | 4 | 4 | 0 |
| Auth | 5 | 3 | 2 |
| Meta | 3 | 0 | 3 |
| **TOTAL** | **93** | **85** | **8** |

*End of API Contracts Skill - 93 routes defined, full type definitions, error handling, rate limiting, authentication*
