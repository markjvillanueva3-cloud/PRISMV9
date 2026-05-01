---
name: prism-api-contracts
description: |
  Complete API interface definitions for PRISM Manufacturing Intelligence.
  Defines all gateway routes, type contracts, request/response formats,
  and inter-module communication standards. Contract-first design ensures
  strict type enforcement and predictable behavior across all modules.
  Part of SP.6 Reference Skills.
---
# PRISM API CONTRACTS SKILL
## Complete API Interface Definitions for PRISM Manufacturing Intelligence
### Version 1.0

---

## 1. API DESIGN PRINCIPLES

### 1.1 Contract-First Design

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PRISM API CONTRACT PHILOSOPHY                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  1. ALL interfaces defined before implementation                                        │
│  2. Strict type enforcement - no loose types                                           │
│  3. Versioned APIs - never break existing contracts                                    │
│  4. Comprehensive validation - input and output                                        │
│  5. Predictable error responses - consistent format                                    │
│  6. Self-documenting - contracts include examples                                      │
│                                                                                         │
│  GATEWAY ROUTES: All inter-module communication through PRISM_GATEWAY                  │
│  FORMAT: 'module.action' with typed input/output contracts                              │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Standard Type Definitions

```typescript
// === BASE TYPES ===

/** Unique identifier */
type UUID = string; // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

/** ISO 8601 timestamp */
type Timestamp = string; // Format: 2026-01-24T03:18:23.541Z

/** Measurement with unit */
interface Measurement {
    value: number;
    unit: string;
    uncertainty?: number;      // ± uncertainty
    confidence?: number;       // 0-1 confidence level
}

/** Value range */
interface Range<T = number> {
    min: T;
    max: T;
    typical?: T;
    optimal?: T;
}

/** Source tracking for data fusion */
interface DataSource {
    name: string;              // Source identifier
    type: 'database' | 'physics' | 'ml' | 'historical' | 'user';
    weight: number;            // 0-1 contribution weight
    confidence: number;        // 0-1 confidence in this source
    timestamp?: Timestamp;
}

/** Standard API response wrapper */
interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: APIError;
    metadata: ResponseMetadata;
}

interface ResponseMetadata {
    requestId: UUID;
    timestamp: Timestamp;
    duration: number;          // milliseconds
    version: string;           // API version
    cached?: boolean;
    sources?: DataSource[];
}

interface APIError {
    code: number;              // PRISM error code (1000-9999)
    name: string;
    message: string;
    details?: Record<string, any>;
    suggestions?: string[];
    recoverable: boolean;
}

// === UNITS SYSTEM ===

type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft';
type SpeedUnit = 'm/min' | 'ft/min' | 'mm/min' | 'in/min' | 'm/s' | 'ft/s';
type RotationUnit = 'rpm' | 'rad/s' | 'deg/s';
type ForceUnit = 'N' | 'kN' | 'lbf' | 'kgf';
type PowerUnit = 'W' | 'kW' | 'hp';
type TorqueUnit = 'Nm' | 'ft-lb' | 'in-lb';
type PressureUnit = 'MPa' | 'GPa' | 'psi' | 'ksi' | 'bar';
type TemperatureUnit = 'C' | 'F' | 'K';
type TimeUnit = 's' | 'min' | 'hr';
type MassUnit = 'kg' | 'g' | 'lb' | 'oz';
type DensityUnit = 'kg/m3' | 'g/cm3' | 'lb/in3';
type SurfaceFinishUnit = 'um' | 'uin' | 'Ra' | 'Rz';
type AngleUnit = 'deg' | 'rad';

// === COMMON STRUCTURES ===

interface Point3D {
    x: number;
    y: number;
    z: number;
}

interface Vector3D extends Point3D {}

interface BoundingBox {
    min: Point3D;
    max: Point3D;
}

interface Tolerance {
    nominal: number;
    upper: number;
    lower: number;
    unit: LengthUnit;
}
```

---

## 2. GATEWAY ROUTE CONTRACTS

### 2.1 Gateway Request/Response Structure

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

---

## 3. DATABASE API CONTRACTS

### 3.1 Materials Database Contracts

```typescript
// === MATERIAL INPUT CONTRACTS ===

interface MaterialQueryInput {
    materialId?: string;           // Exact ID match
    name?: string;                 // Partial name match
    category?: MaterialCategory;   // Category filter
    standard?: string;             // Standard (AISI, DIN, JIS, etc.)
    properties?: PropertyFilter[];  // Property-based filter
    limit?: number;                // Max results (default: 50)
    offset?: number;               // Pagination offset
}

type MaterialCategory = 
    | 'carbon_steel' | 'alloy_steel' | 'stainless_steel' | 'tool_steel'
    | 'aluminum' | 'copper' | 'titanium' | 'nickel_alloy'
    | 'cast_iron' | 'plastic' | 'composite' | 'superalloy';

interface PropertyFilter {
    property: string;              // Property name
    operator: '=' | '>' | '<' | '>=' | '<=' | 'between' | 'in';
    value: number | number[] | Range;
}

// === MATERIAL OUTPUT CONTRACTS ===

interface Material {
    // Identity (5 params)
    id: string;
    name: string;
    category: MaterialCategory;
    standard: string;
    aliases: string[];
    
    // Composition (15 params)
    composition: MaterialComposition;
    
    // Physical properties (12 params)
    physical: PhysicalProperties;
    
    // Mechanical properties (15 params)
    mechanical: MechanicalProperties;
    
    // Cutting force model (8 params)
    cuttingForce: CuttingForceModel;
    
    // Constitutive model (12 params)
    constitutive: ConstitutiveModel;
    
    // Tool life model (10 params)
    toolLife: ToolLifeModel;
    
    // Chip formation (8 params)
    chipFormation: ChipFormationData;
    
    // Tribology (8 params)
    tribology: TribologyData;
    
    // Thermal properties (10 params)
    thermal: ThermalProperties;
    
    // Surface integrity (8 params)
    surfaceIntegrity: SurfaceIntegrityData;
    
    // Machinability (6 params)
    machinability: MachinabilityData;
    
    // Recommended parameters (8 params)
    recommended: RecommendedParameters;
    
    // Metadata (2 params)
    metadata: MaterialMetadata;
}

interface MaterialComposition {
    C?: Range;                     // Carbon %
    Mn?: Range;                    // Manganese %
    Si?: Range;                    // Silicon %
    P?: Range;                     // Phosphorus %
    S?: Range;                     // Sulfur %
    Cr?: Range;                    // Chromium %
    Ni?: Range;                    // Nickel %
    Mo?: Range;                    // Molybdenum %
    V?: Range;                     // Vanadium %
    W?: Range;                     // Tungsten %
    Co?: Range;                    // Cobalt %
    Cu?: Range;                    // Copper %
    Ti?: Range;                    // Titanium %
    Al?: Range;                    // Aluminum %
    other?: Record<string, Range>; // Other elements
}

interface PhysicalProperties {
    density: Measurement;          // kg/m³
    meltingPoint: Range;           // °C
    boilingPoint?: number;         // °C
    specificHeat: Measurement;     // J/(kg·K)
    thermalConductivity: Measurement; // W/(m·K)
    thermalExpansion: Measurement; // µm/(m·K)
    electricalResistivity?: Measurement; // µΩ·cm
    magneticPermeability?: number;
    poissonRatio: number;
    crystalStructure?: string;
    atomicWeight?: number;
    atomicNumber?: number;
}

interface MechanicalProperties {
    tensileStrength: Range;        // MPa
    yieldStrength: Range;          // MPa
    elongation: Range;             // %
    reductionOfArea?: Range;       // %
    elasticModulus: Measurement;   // GPa
    shearModulus?: Measurement;    // GPa
    hardnessBrinell: Range;        // HB
    hardnessRockwellC?: Range;     // HRC
    hardnessVickers?: Range;       // HV
    impactStrength?: Range;        // J (Charpy)
    fatigueStrength?: Measurement; // MPa
    creepStrength?: Measurement;   // MPa at temp
    fractureToughness?: Measurement; // MPa√m
    compressiveStrength?: Measurement; // MPa
    shearStrength?: Measurement;   // MPa
}

interface CuttingForceModel {
    kc1_1: number;                 // Specific cutting force at h=1mm, b=1mm (N/mm²)
    mc: number;                    // Kienzle exponent
    gamma_correction: number;      // Rake angle correction factor
    speed_correction: number;      // Speed correction factor
    wear_correction: number;       // Tool wear correction factor
    coolant_correction: number;    // Coolant correction factor
    source: string;                // Data source
    confidence: number;            // 0-1 confidence level
}

interface ConstitutiveModel {
    // Johnson-Cook parameters
    A: number;                     // Yield stress (MPa)
    B: number;                     // Hardening modulus (MPa)
    n: number;                     // Hardening exponent
    C: number;                     // Strain rate coefficient
    m: number;                     // Thermal softening exponent
    epsilon_dot_0: number;         // Reference strain rate (1/s)
    T_melt: number;                // Melting temperature (°C)
    T_room: number;                // Reference temperature (°C)
    
    // Fracture parameters
    D1: number;                    // JC fracture constant
    D2: number;                    // JC fracture constant
    D3: number;                    // JC fracture constant
    D4: number;                    // JC fracture constant
}

interface ToolLifeModel {
    taylor_n: Record<string, number>;  // Taylor exponent by tool type
    taylor_C: Record<string, number>;  // Taylor constant by tool type
    wear_rate_model: WearRateModel;
    crater_wear_factor: number;
    notch_wear_factor: number;
    bue_temperature_threshold: number; // °C
    adhesion_tendency: number;     // 0-1
    abrasiveness: number;          // 0-1
    chemical_reactivity: number;   // 0-1
    diffusion_coefficient: number;
}

interface WearRateModel {
    type: 'taylor' | 'empirical' | 'physics_based';
    parameters: Record<string, number>;
}

interface ChipFormationData {
    chip_type: 'continuous' | 'segmented' | 'discontinuous' | 'built_up_edge';
    segmentation_frequency?: Range; // Hz at reference speed
    shear_band_spacing?: Range;     // µm
    chip_curl_radius: Range;        // mm
    chip_compression_ratio: Range;
    shear_angle: Range;             // degrees
    chip_serration_tendency: number; // 0-1
    chip_breaking_tendency: number;  // 0-1
}

interface TribologyData {
    friction_coefficient_dry: Range;
    friction_coefficient_flooded: Range;
    friction_coefficient_mql: Range;
    galling_tendency: number;        // 0-1
    seizure_tendency: number;        // 0-1
    adhesion_temperature: number;    // °C
    oxidation_tendency: number;      // 0-1
    surface_reactivity: number;      // 0-1
}

interface ThermalProperties {
    cutting_temperature_rise: Range;  // °C at reference conditions
    thermal_diffusivity: Measurement; // mm²/s
    interface_heat_partition: number; // Fraction to workpiece
    thermal_softening_onset: number;  // °C
    recrystallization_temp: number;   // °C
    phase_transformation_temps?: Record<string, number>;
    specific_cutting_energy: Measurement; // J/mm³
    heat_generation_coefficient: number;
    coolant_effectiveness: Record<string, number>; // By coolant type
    thermal_damage_threshold: number; // °C
}

interface SurfaceIntegrityData {
    residual_stress_tendency: 'compressive' | 'tensile' | 'neutral';
    white_layer_susceptibility: number; // 0-1
    work_hardening_depth: Range;        // µm
    surface_roughness_tendency: number; // 0-1 (higher = rougher)
    microstructure_sensitivity: number; // 0-1
    subsurface_damage_tendency: number; // 0-1
    burnishing_response: number;        // 0-1
    machining_induced_hardness_change: Range; // % change
}

interface MachinabilityData {
    machinability_rating: number;       // % relative to B1112
    chip_control_rating: number;        // 0-1
    surface_finish_rating: number;      // 0-1
    tool_life_rating: number;           // 0-1
    power_requirement_rating: number;   // 0-1
    heat_generation_rating: number;     // 0-1
}

interface RecommendedParameters {
    speed_range: Record<string, Range>;     // By tool type, m/min
    feed_range: Record<string, Range>;      // By operation, mm/rev
    doc_range: Record<string, Range>;       // By operation, mm
    coolant_type: string[];                 // Recommended coolant types
    tool_grades: string[];                  // Recommended carbide grades
    coating_preference: string[];           // Recommended coatings
    minimum_rigidity: number;               // 0-1 scale
    cutting_fluid_pressure?: Range;         // bar
}

interface MaterialMetadata {
    source: string[];                       // Data sources
    last_updated: Timestamp;
    validation_status: 'validated' | 'provisional' | 'estimated';
    confidence_level: number;               // 0-1
}
```

#### Materials API Routes

```javascript
// Route: materials.get
PRISM_GATEWAY_CONTRACTS.register('materials.get', {
    version: '1.0.0',
    description: 'Get material by ID with full 127 parameters',
    input: {
        type: 'object',
        required: ['materialId'],
        properties: {
            materialId: { type: 'string', description: 'Material identifier' },
            includeFields: { type: 'array', items: { type: 'string' }, description: 'Specific fields to include' }
        }
    },
    output: {
        type: 'object',
        properties: {
            material: { type: 'Material', description: 'Full material data' }
        }
    },
    errors: [2101, 2102, 5001],
    examples: [{
        name: 'Get AISI 4140',
        description: 'Retrieve 4140 alloy steel with all parameters',
        input: { materialId: 'AISI-4140' },
        output: { material: { id: 'AISI-4140', name: '4140 Alloy Steel', /* ... */ } }
    }]
});

// Route: materials.search
PRISM_GATEWAY_CONTRACTS.register('materials.search', {
    version: '1.0.0',
    description: 'Search materials with filters',
    input: {
        type: 'object',
        required: [],
        properties: {
            name: { type: 'string', description: 'Partial name match' },
            category: { type: 'MaterialCategory', description: 'Material category' },
            standard: { type: 'string', description: 'Material standard' },
            properties: { type: 'array', items: { type: 'PropertyFilter' }, description: 'Property filters' },
            limit: { type: 'number', default: 50, minimum: 1, maximum: 200 },
            offset: { type: 'number', default: 0, minimum: 0 }
        }
    },
    output: {
        type: 'object',
        properties: {
            materials: { type: 'array', items: { type: 'Material' } },
            total: { type: 'number' },
            hasMore: { type: 'boolean' }
        }
    },
    errors: [2100, 5003],
    examples: [{
        name: 'Search stainless steels',
        input: { category: 'stainless_steel', limit: 10 },
        output: { materials: [/* ... */], total: 45, hasMore: true }
    }]
});

// Route: materials.getCuttingData
PRISM_GATEWAY_CONTRACTS.register('materials.getCuttingData', {
    version: '1.0.0',
    description: 'Get cutting-specific data for a material',
    input: {
        type: 'object',
        required: ['materialId'],
        properties: {
            materialId: { type: 'string' },
            hardness: { type: 'number', description: 'Override hardness (HB)' },
            condition: { type: 'string', enum: ['annealed', 'normalized', 'hardened', 'cold_worked'] }
        }
    },
    output: {
        type: 'object',
        properties: {
            kc1_1: { type: 'number', description: 'Specific cutting force' },
            mc: { type: 'number', description: 'Kienzle exponent' },
            taylor_n: { type: 'object', description: 'Taylor exponents by tool' },
            taylor_C: { type: 'object', description: 'Taylor constants by tool' },
            speed_range: { type: 'object', description: 'Speed ranges by tool type' },
            feed_range: { type: 'object', description: 'Feed ranges by operation' },
            machinability_rating: { type: 'number' }
        }
    },
    errors: [2101, 5001]
});

// Route: materials.compare
PRISM_GATEWAY_CONTRACTS.register('materials.compare', {
    version: '1.0.0',
    description: 'Compare multiple materials side by side',
    input: {
        type: 'object',
        required: ['materialIds'],
        properties: {
            materialIds: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 10 },
            compareFields: { type: 'array', items: { type: 'string' }, description: 'Fields to compare' }
        }
    },
    output: {
        type: 'object',
        properties: {
            materials: { type: 'array', items: { type: 'Material' } },
            comparison: { type: 'object', description: 'Field-by-field comparison matrix' },
            bestFor: { type: 'object', description: 'Which material is best for each criterion' }
        }
    },
    errors: [2101, 5001]
});
```

### 3.2 Machines Database Contracts

```typescript
// === MACHINE INPUT CONTRACTS ===

interface MachineQueryInput {
    machineId?: string;
    manufacturer?: string;
    model?: string;
    type?: MachineType;
    capabilities?: CapabilityFilter[];
    workEnvelope?: EnvelopeFilter;
    limit?: number;
    offset?: number;
}

type MachineType = 
    | 'vertical_mill' | 'horizontal_mill' | 'gantry_mill'
    | 'cnc_lathe' | 'turning_center' | 'swiss_lathe'
    | 'turn_mill' | '5_axis_mill' | '5_axis_turn_mill'
    | 'wire_edm' | 'sinker_edm' | 'grinder'
    | 'drill_tap' | 'boring_mill';

interface CapabilityFilter {
    capability: string;
    required: boolean;
    minValue?: number;
}

interface EnvelopeFilter {
    minX?: number;
    minY?: number;
    minZ?: number;
    unit?: LengthUnit;
}

// === MACHINE OUTPUT CONTRACTS ===

interface Machine {
    // Identity
    id: string;
    manufacturer: string;
    model: string;
    type: MachineType;
    controller: ControllerSpec;
    
    // Work envelope
    workEnvelope: WorkEnvelope;
    
    // Spindle specifications
    spindle: SpindleSpec;
    
    // Axes specifications
    axes: AxisSpec[];
    
    // Tool system
    toolSystem: ToolSystemSpec;
    
    // Capabilities
    capabilities: MachineCapabilities;
    
    // Performance characteristics
    performance: MachinePerformance;
    
    // For physics calculations
    dynamics: MachineDynamics;
    
    // Metadata
    metadata: MachineMetadata;
}

interface ControllerSpec {
    brand: string;                      // FANUC, Siemens, Heidenhain, etc.
    model: string;                      // 0i-TF, 840D sl, TNC 640, etc.
    version?: string;
    capabilities: string[];             // Supported features
    gcodeDialect: string;               // Reference to G-code spec
    macroSupport: boolean;
    conversationalSupport: boolean;
}

interface WorkEnvelope {
    x: Range;                           // mm
    y: Range;                           // mm
    z: Range;                           // mm
    a?: Range;                          // degrees (rotary)
    b?: Range;                          // degrees (rotary)
    c?: Range;                          // degrees (rotary)
    maxWorkpieceWeight: number;         // kg
    maxWorkpieceDiameter?: number;      // mm (lathes)
    maxWorkpieceLength?: number;        // mm (lathes)
    tableSize?: { length: number; width: number }; // mm (mills)
    tableTSlots?: { count: number; spacing: number; width: number };
}

interface SpindleSpec {
    type: 'belt_drive' | 'gear_drive' | 'direct_drive' | 'built_in_motor';
    maxRPM: number;
    minRPM: number;
    ratedPower: number;                 // kW
    peakPower?: number;                 // kW
    ratedTorque: number;                // Nm
    peakTorque?: number;                // Nm
    taper: string;                      // BT40, HSK-A63, CAT40, etc.
    bearingType: string;
    runoutTIR: number;                  // mm
    orientation: 'horizontal' | 'vertical';
    speedRanges?: Range[];              // For gear-driven spindles
    powerCurve?: { rpm: number; power: number; torque: number }[];
}

interface AxisSpec {
    name: string;                       // X, Y, Z, A, B, C
    type: 'linear' | 'rotary';
    travel: Range;                      // mm or degrees
    rapidRate: number;                  // mm/min or deg/min
    maxFeedRate: number;                // mm/min or deg/min
    acceleration: number;               // m/s² or deg/s²
    deceleration?: number;              // m/s² or deg/s²
    jerk?: number;                      // m/s³ or deg/s³
    resolution: number;                 // mm or degrees
    repeatability: number;              // mm or degrees
    accuracy: number;                   // mm or degrees
    ballscrewPitch?: number;            // mm (linear axes)
    backlash?: number;                  // mm or degrees
    encoderType: 'incremental' | 'absolute';
    encoderResolution: number;
}

interface ToolSystemSpec {
    magazineType: 'drum' | 'chain' | 'matrix' | 'rack' | 'turret' | 'arm';
    capacity: number;
    maxToolDiameter: number;            // mm
    maxToolLength: number;              // mm
    maxToolWeight: number;              // kg
    toolChangeTime: number;             // seconds
    toolChangeType: 'random' | 'sequential' | 'bidirectional';
    coolantThruTool: boolean;
    coolantPressure?: number;           // bar
    turretStations?: number;            // For lathes
    liveTooling?: boolean;
    liveToolRPM?: number;
}

interface MachineCapabilities {
    axes: number;
    simultaneous_axes: number;
    turning: boolean;
    milling: boolean;
    drilling: boolean;
    tapping: boolean;
    boring: boolean;
    grinding: boolean;
    probing: boolean;
    toolBreakDetection: boolean;
    automaticToolMeasurement: boolean;
    chipConveyor: boolean;
    coolantTypes: string[];
    palletChanger?: { count: number; size: string };
    barFeeder?: { maxDiameter: number; maxLength: number };
    subSpindle?: SpindleSpec;
    liveTooling?: boolean;
    yAxis?: boolean;
    bAxis?: boolean;
}

interface MachinePerformance {
    positioningAccuracy: number;        // mm
    repeatability: number;              // mm
    circularInterpolationAccuracy: number; // mm
    surfaceFinishCapability: number;    // Ra µm
    typicalToleranceCapability: number; // mm
    machiningRating: number;            // 0-100 overall rating
}

interface MachineDynamics {
    naturalFrequencies: { axis: string; frequency: number }[];  // Hz
    dampingRatios: { axis: string; ratio: number }[];
    stiffness: { axis: string; value: number }[];               // N/µm
    stabilityLobeData?: StabilityLobeData;
    vibrationCharacteristics?: VibrationData;
}

interface StabilityLobeData {
    spindleSpeed: number[];             // RPM values
    axialDepthLimit: number[];          // mm values
    radialDepthLimit?: number[];        // mm values
    toolDependency: string;             // Tool ID this data is for
}

interface VibrationData {
    baselineVibration: number;          // mm/s
    resonanceFrequencies: number[];     // Hz
    criticalSpeeds: number[];           // RPM to avoid
}

interface MachineMetadata {
    hierarchyLevel: 'CORE' | 'ENHANCED' | 'USER' | 'LEARNED';
    dataSource: string[];
    lastUpdated: Timestamp;
    validationStatus: 'validated' | 'provisional' | 'estimated';
    cadModelAvailable: boolean;
    cadModelPath?: string;
    documentationUrl?: string;
}
```

#### Machine API Routes

```javascript
// Route: machines.get
PRISM_GATEWAY_CONTRACTS.register('machines.get', {
    version: '1.0.0',
    description: 'Get machine by ID with full specifications',
    input: {
        type: 'object',
        required: ['machineId'],
        properties: {
            machineId: { type: 'string' },
            includeFields: { type: 'array', items: { type: 'string' } }
        }
    },
    output: {
        type: 'object',
        properties: {
            machine: { type: 'Machine' }
        }
    },
    errors: [2101, 2102]
});

// Route: machines.search
PRISM_GATEWAY_CONTRACTS.register('machines.search', {
    version: '1.0.0',
    description: 'Search machines with filters',
    input: {
        type: 'object',
        properties: {
            manufacturer: { type: 'string' },
            model: { type: 'string' },
            type: { type: 'MachineType' },
            capabilities: { type: 'array', items: { type: 'CapabilityFilter' } },
            workEnvelope: { type: 'EnvelopeFilter' },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 }
        }
    },
    output: {
        type: 'object',
        properties: {
            machines: { type: 'array', items: { type: 'Machine' } },
            total: { type: 'number' },
            hasMore: { type: 'boolean' }
        }
    },
    errors: [2100]
});

// Route: machines.getCapabilities
PRISM_GATEWAY_CONTRACTS.register('machines.getCapabilities', {
    version: '1.0.0',
    description: 'Get detailed capabilities for a machine',
    input: {
        type: 'object',
        required: ['machineId'],
        properties: {
            machineId: { type: 'string' }
        }
    },
    output: {
        type: 'object',
        properties: {
            capabilities: { type: 'MachineCapabilities' },
            performance: { type: 'MachinePerformance' },
            limits: { type: 'object', description: 'Operational limits' }
        }
    },
    errors: [2101]
});

// Route: machines.getPostRequirements
PRISM_GATEWAY_CONTRACTS.register('machines.getPostRequirements', {
    version: '1.0.0',
    description: 'Get post processor requirements for a machine',
    input: {
        type: 'object',
        required: ['machineId'],
        properties: {
            machineId: { type: 'string' }
        }
    },
    output: {
        type: 'object',
        properties: {
            controller: { type: 'ControllerSpec' },
            gcodeDialect: { type: 'string' },
            requiredBlocks: { type: 'array', items: { type: 'string' } },
            optionalBlocks: { type: 'array', items: { type: 'string' } },
            customMCodes: { type: 'array', items: { type: 'object' } },
            formatRules: { type: 'object' }
        }
    },
    errors: [2101]
});
```

### 3.3 Tools Database Contracts

```typescript
// === TOOL INPUT CONTRACTS ===

interface ToolQueryInput {
    toolId?: string;
    type?: ToolType;
    manufacturer?: string;
    material?: ToolMaterial;
    coating?: ToolCoating;
    diameter?: Range;
    lengthRange?: Range;
    application?: string[];
    limit?: number;
    offset?: number;
}

type ToolType = 
    | 'endmill' | 'face_mill' | 'ball_endmill' | 'bull_nose'
    | 'drill' | 'tap' | 'reamer' | 'boring_bar'
    | 'turning_insert' | 'milling_insert' | 'threading_insert'
    | 'slot_drill' | 'chamfer_mill' | 'thread_mill';

type ToolMaterial = 'hss' | 'cobalt_hss' | 'carbide' | 'ceramic' | 'cermet' | 'cbn' | 'pcd';

type ToolCoating = 
    | 'uncoated' | 'TiN' | 'TiCN' | 'TiAlN' | 'AlTiN' | 'AlCrN'
    | 'DLC' | 'diamond' | 'nACo' | 'nACRo' | 'TiB2';

// === TOOL OUTPUT CONTRACTS ===

interface Tool {
    // Identity
    id: string;
    catalogNumber: string;
    manufacturer: string;
    type: ToolType;
    description: string;
    
    // Geometry
    geometry: ToolGeometry;
    
    // Material and coating
    substrate: ToolMaterial;
    grade?: string;
    coating: ToolCoating;
    coatingThickness?: number;          // µm
    
    // Cutting data
    cuttingData: ToolCuttingData;
    
    // Application recommendations
    applications: ToolApplications;
    
    // Physical properties
    physical: ToolPhysicalProperties;
    
    // Holder compatibility
    holderCompatibility: HolderCompatibility;
    
    // Cost and inventory
    commercial: ToolCommercialData;
    
    // Metadata
    metadata: ToolMetadata;
}

interface ToolGeometry {
    // Common
    diameter: number;                   // mm (cutting diameter)
    shankDiameter: number;              // mm
    overallLength: number;              // mm
    fluteLength?: number;               // mm
    
    // Endmills
    numberOfFlutes?: number;
    helixAngle?: number;                // degrees
    rakeAngle?: number;                 // degrees
    reliefAngle?: number;               // degrees
    cornerRadius?: number;              // mm
    
    // Drills
    pointAngle?: number;                // degrees
    webThickness?: number;              // mm
    marginWidth?: number;               // mm
    
    // Inserts
    insertShape?: string;               // CNMG, WNMG, etc.
    insertSize?: number;                // IC
    insertThickness?: number;           // mm
    noseRadius?: number;                // mm
    chipbreakerType?: string;
    
    // Turning tools
    leadAngle?: number;                 // degrees
    backRake?: number;                  // degrees
    sideRake?: number;                  // degrees
}

interface ToolCuttingData {
    speedRange: Record<string, Range>;  // By material category, m/min
    feedRange: Record<string, Range>;   // By material category, mm/tooth or mm/rev
    maxDOC: number;                     // mm
    maxWOC?: number;                    // mm (% of diameter for endmills)
    maxChipLoad: number;                // mm
    recommendedChipLoad: number;        // mm
    sfmRating: number;                  // Surface feet per minute at ideal
    mrr_rating: number;                 // Material removal rate capability
}

interface ToolApplications {
    primaryOperations: string[];        // Best suited operations
    secondaryOperations: string[];      // Can be used for
    materialCompatibility: {
        excellent: string[];            // Best performance
        good: string[];                 // Good performance
        limited: string[];              // Usable with care
        avoid: string[];                // Do not use
    };
    coolantRequirement: 'required' | 'recommended' | 'optional' | 'avoid';
    minimumRigidity: number;            // 0-1 scale
}

interface ToolPhysicalProperties {
    weight: number;                     // grams
    momentOfInertia?: number;           // kg·mm²
    centerOfGravity?: Point3D;          // mm from gauge point
    staticStiffness?: number;           // N/µm
    dynamicStiffness?: number;          // N/µm
    naturalFrequency?: number;          // Hz
}

interface HolderCompatibility {
    primaryHolder: string[];            // Recommended holder types
    alternateHolders: string[];         // Can use
    gaugeLength: number;                // mm
    minimumStickout: number;            // mm
    maximumStickout: number;            // mm
    balanceGrade?: string;              // G2.5, G6.3, etc.
}

interface ToolCommercialData {
    listPrice?: number;
    currency?: string;
    edgesPerInsert?: number;
    expectedToolLife?: Range;           // minutes
    costPerEdge?: number;
    leadTime?: string;
    minimumOrderQuantity?: number;
}

interface ToolMetadata {
    dataSource: string[];
    lastUpdated: Timestamp;
    validationStatus: 'validated' | 'provisional' | 'estimated';
    cadModelAvailable: boolean;
    cadModelPath?: string;
}
```

#### Tool API Routes

```javascript
// Route: tools.get
PRISM_GATEWAY_CONTRACTS.register('tools.get', {
    version: '1.0.0',
    description: 'Get tool by ID with full specifications',
    input: {
        type: 'object',
        required: ['toolId'],
        properties: {
            toolId: { type: 'string' }
        }
    },
    output: {
        type: 'object',
        properties: {
            tool: { type: 'Tool' }
        }
    },
    errors: [2101]
});

// Route: tools.search
PRISM_GATEWAY_CONTRACTS.register('tools.search', {
    version: '1.0.0',
    description: 'Search tools with filters',
    input: {
        type: 'object',
        properties: {
            type: { type: 'ToolType' },
            manufacturer: { type: 'string' },
            material: { type: 'ToolMaterial' },
            coating: { type: 'ToolCoating' },
            diameter: { type: 'Range' },
            application: { type: 'array', items: { type: 'string' } },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 }
        }
    },
    output: {
        type: 'object',
        properties: {
            tools: { type: 'array', items: { type: 'Tool' } },
            total: { type: 'number' },
            hasMore: { type: 'boolean' }
        }
    },
    errors: [2100]
});

// Route: tools.recommend
PRISM_GATEWAY_CONTRACTS.register('tools.recommend', {
    version: '1.0.0',
    description: 'Get tool recommendations for a specific application',
    input: {
        type: 'object',
        required: ['operation', 'material'],
        properties: {
            operation: { type: 'string', description: 'Operation type' },
            material: { type: 'string', description: 'Workpiece material ID' },
            featureSize: { type: 'number', description: 'Feature dimension in mm' },
            surfaceFinish: { type: 'number', description: 'Target Ra in µm' },
            tolerance: { type: 'number', description: 'Tolerance in mm' },
            machineId: { type: 'string', description: 'Target machine ID' },
            quantity: { type: 'number', description: 'Parts to produce' }
        }
    },
    output: {
        type: 'object',
        properties: {
            recommendations: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        tool: { type: 'Tool' },
                        score: { type: 'number', description: 'Recommendation score 0-100' },
                        reasons: { type: 'array', items: { type: 'string' } },
                        estimatedLife: { type: 'number', description: 'Estimated tool life in parts' },
                        estimatedCostPerPart: { type: 'number' }
                    }
                }
            }
        }
    },
    errors: [2101, 5001]
});
```

---

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

---



## Section 5: Calculator API Contracts

### 5.1 Speed & Feed Calculator

```typescript
// Input for speed/feed calculation
interface SpeedFeedInput {
    // Material specification (required)
    material: {
        id?: string;                    // Material ID from database
        name?: string;                  // Material name for lookup
        category?: MaterialCategory;
        hardness?: Measurement;         // Override hardness
        condition?: 'annealed' | 'normalized' | 'hardened' | 'cold_worked';
    };
    
    // Tool specification (required)
    tool: {
        id?: string;                    // Tool ID from database
        type: ToolType;
        diameter: Measurement;
        numberOfFlutes?: number;
        material?: ToolMaterial;
        coating?: ToolCoating;
        cornerRadius?: Measurement;     // For bull nose/inserts
        helixAngle?: number;            // degrees
        rakeAngle?: number;             // degrees
    };
    
    // Machine specification (optional but recommended)
    machine?: {
        id?: string;                    // Machine ID from database
        maxRPM: number;
        maxFeedRate: number;            // mm/min or ipm
        minRPM?: number;
        spindlePower?: number;          // kW
        rigidity?: 'low' | 'medium' | 'high' | 'very_high';
    };
    
    // Operation specification (required)
    operation: {
        type: OperationType;
        radialEngagement?: number;      // % of diameter (0-100)
        axialDepth?: Measurement;       // DOC
        radialDepth?: Measurement;      // WOC/stepover
        finishing?: boolean;
        slotting?: boolean;
    };
    
    // Optimization preferences
    preferences?: {
        priority: 'productivity' | 'tool_life' | 'surface_finish' | 'balanced';
        aggression: number;             // 0.0 (conservative) to 1.0 (aggressive)
        coolant: 'flood' | 'mist' | 'mql' | 'air' | 'none';
    };
    
    // Output unit preferences
    units?: {
        speed: SpeedUnit;               // 'sfm' | 'm_min'
        feed: 'ipm' | 'mm_min' | 'ipr' | 'mm_rev';
        depth: LengthUnit;
    };
}

type OperationType = 
    | 'face_milling' | 'peripheral_milling' | 'slot_milling' | 'plunge_milling'
    | 'adaptive_milling' | 'high_speed_milling' | 'trochoidal_milling'
    | 'drilling' | 'peck_drilling' | 'deep_hole_drilling'
    | 'reaming' | 'boring' | 'tapping' | 'thread_milling'
    | 'turning_roughing' | 'turning_finishing' | 'turning_grooving'
    | 'turning_threading' | 'turning_parting';

// Output from speed/feed calculation
interface SpeedFeedOutput {
    // Primary recommendations
    recommended: {
        surfaceSpeed: Measurement;      // SFM or m/min
        spindleRPM: number;
        feedPerTooth: Measurement;      // IPT or mm/tooth
        feedPerRev: Measurement;        // IPR or mm/rev
        feedRate: Measurement;          // IPM or mm/min
        axialDOC: Measurement;
        radialWOC: Measurement;
        chipLoad: Measurement;
    };
    
    // Parameter ranges
    ranges: {
        speed: Range;
        rpm: Range;
        feedPerTooth: Range;
        feedRate: Range;
        axialDOC: Range;
        radialWOC: Range;
    };
    
    // Performance predictions
    predictions: {
        mrr: Measurement;               // Material removal rate
        power: Measurement;             // Required spindle power
        torque: Measurement;            // Required spindle torque
        cuttingForce: Measurement;      // Resultant cutting force
        toolLife: Measurement;          // Expected tool life in minutes
        surfaceFinish: Measurement;     // Predicted Ra
        cycleTime?: Measurement;        // If feature dimensions provided
    };
    
    // Warnings and adjustments
    warnings: SpeedFeedWarning[];
    adjustments: ParameterAdjustment[];
    
    // Calculation details
    calculation: {
        method: string;                 // Algorithm used
        sources: DataSource[];
        confidence: number;
        timestamp: Timestamp;
    };
    
    // Alternative recommendations
    alternatives?: {
        conservative: SpeedFeedRecommendation;
        aggressive: SpeedFeedRecommendation;
        bestFinish: SpeedFeedRecommendation;
        bestLife: SpeedFeedRecommendation;
    };
}

interface SpeedFeedWarning {
    code: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    parameter: string;
    suggestion?: string;
}

interface ParameterAdjustment {
    parameter: string;
    original: number;
    adjusted: number;
    reason: string;
    factor: number;
}

interface SpeedFeedRecommendation {
    surfaceSpeed: Measurement;
    spindleRPM: number;
    feedPerTooth: Measurement;
    feedRate: Measurement;
    axialDOC: Measurement;
    radialWOC: Measurement;
    tradeoff: string;
}
```

```javascript
// Route: calculator.speedfeed.calculate
PRISM_GATEWAY_CONTRACTS.register('calculator.speedfeed.calculate', {
    version: '1.0.0',
    description: 'Calculate optimal speed and feed parameters',
    input: { type: 'SpeedFeedInput' },
    output: { type: 'SpeedFeedOutput' },
    errors: [2001, 2002, 5001, 5002, 5003],
    examples: [
        {
            name: 'Aluminum roughing with carbide endmill',
            input: {
                material: { id: 'AL-6061-T6' },
                tool: { type: 'endmill', diameter: { value: 12, unit: 'mm' }, numberOfFlutes: 3 },
                operation: { type: 'peripheral_milling', radialEngagement: 50, axialDepth: { value: 12, unit: 'mm' } },
                preferences: { priority: 'productivity', coolant: 'flood' }
            },
            output: {
                recommended: {
                    surfaceSpeed: { value: 300, unit: 'm_min' },
                    spindleRPM: 7958,
                    feedPerTooth: { value: 0.08, unit: 'mm' },
                    feedRate: { value: 1910, unit: 'mm_min' }
                }
            }
        }
    ]
});

// Route: calculator.speedfeed.compare
PRISM_GATEWAY_CONTRACTS.register('calculator.speedfeed.compare', {
    version: '1.0.0',
    description: 'Compare speed/feed for different scenarios',
    input: {
        type: 'object',
        required: ['scenarios'],
        properties: {
            scenarios: {
                type: 'array',
                items: { type: 'SpeedFeedInput' },
                minItems: 2,
                maxItems: 10
            },
            compareOn: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['mrr', 'tool_life', 'surface_finish', 'power', 'cost']
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            results: { type: 'array', items: { type: 'SpeedFeedOutput' } },
            comparison: {
                type: 'object',
                properties: {
                    winner: { type: 'object' },
                    rankings: { type: 'array' },
                    tradeoffMatrix: { type: 'array' }
                }
            }
        }
    },
    errors: [5001, 5002]
});

// Route: calculator.speedfeed.adjust
PRISM_GATEWAY_CONTRACTS.register('calculator.speedfeed.adjust', {
    version: '1.0.0',
    description: 'Adjust parameters based on real-world feedback',
    input: {
        type: 'object',
        required: ['original', 'feedback'],
        properties: {
            original: { type: 'SpeedFeedOutput' },
            feedback: {
                type: 'object',
                properties: {
                    issue: {
                        type: 'string',
                        enum: [
                            'chatter', 'poor_finish', 'excessive_wear', 'tool_breakage',
                            'chips_too_long', 'chips_too_short', 'built_up_edge',
                            'burning', 'deflection', 'overload', 'underperforming'
                        ]
                    },
                    severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
                    observedValues: { type: 'object' }
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            adjusted: { type: 'SpeedFeedOutput' },
            changes: { type: 'array', items: { type: 'ParameterAdjustment' } },
            explanation: { type: 'string' },
            shouldRecordFeedback: { type: 'boolean' }
        }
    },
    errors: [5001]
});
```

### 5.2 Power & Torque Calculator

```typescript
interface PowerTorqueInput {
    // Cutting conditions
    cutting: {
        speed: Measurement;             // Surface speed
        feedRate: Measurement;          // Linear feed rate
        axialDOC: Measurement;
        radialWOC: Measurement;
        materialRemovalRate?: Measurement;
    };
    
    // Material
    material: {
        id?: string;
        specificCuttingForce?: number;  // kc1.1 in N/mm²
        mcExponent?: number;            // Kienzle exponent
    };
    
    // Tool
    tool: {
        diameter: Measurement;
        numberOfFlutes?: number;
        rakeAngle?: number;
        helixAngle?: number;
    };
    
    // Machine (for validation)
    machine?: {
        ratedPower: number;             // kW
        peakPower?: number;
        ratedTorque: number;            // Nm
        peakTorque?: number;
        currentRPM?: number;
    };
    
    // Efficiency factors
    efficiency?: {
        mechanical: number;             // 0.8-0.95 typical
        spindle: number;                // 0.85-0.95 typical
    };
}

interface PowerTorqueOutput {
    // Calculated values
    power: {
        cutting: Measurement;           // Power at tool
        spindle: Measurement;           // Required spindle power
        feed: Measurement;              // Feed drive power
        total: Measurement;             // Total power requirement
    };
    
    torque: {
        cutting: Measurement;           // Torque at tool
        spindle: Measurement;           // Required spindle torque
    };
    
    // Machine utilization
    utilization?: {
        powerPercent: number;
        torquePercent: number;
        withinCapability: boolean;
        headroom: number;               // % remaining capacity
    };
    
    // Warnings
    warnings: Array<{
        type: 'power_exceeded' | 'torque_exceeded' | 'low_rpm_torque' | 'high_rpm_power';
        message: string;
        recommendation: string;
    }>;
    
    // Calculation details
    calculation: {
        method: 'kienzle' | 'unit_power' | 'empirical';
        specificCuttingForce: number;
        chipThickness: number;
        sources: DataSource[];
    };
}
```

```javascript
// Route: calculator.power.calculate
PRISM_GATEWAY_CONTRACTS.register('calculator.power.calculate', {
    version: '1.0.0',
    description: 'Calculate power and torque requirements',
    input: { type: 'PowerTorqueInput' },
    output: { type: 'PowerTorqueOutput' },
    errors: [2001, 5001, 5002]
});

// Route: calculator.power.curve
PRISM_GATEWAY_CONTRACTS.register('calculator.power.curve', {
    version: '1.0.0',
    description: 'Generate power/torque vs RPM curve',
    input: {
        type: 'object',
        required: ['machine', 'cutting'],
        properties: {
            machine: { type: 'object' },
            cutting: { type: 'object' },
            rpmRange: {
                type: 'object',
                properties: {
                    min: { type: 'number' },
                    max: { type: 'number' },
                    steps: { type: 'number', default: 50 }
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            curve: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        rpm: { type: 'number' },
                        power: { type: 'number' },
                        torque: { type: 'number' },
                        available: { type: 'boolean' }
                    }
                }
            },
            optimalRPM: { type: 'number' },
            limitingFactor: { type: 'string' }
        }
    },
    errors: [2003, 5001]
});
```

### 5.3 Tool Life Calculator

```typescript
interface ToolLifeCalculatorInput {
    // Material and tool (required)
    material: {
        id?: string;
        name?: string;
        hardness?: Measurement;
        taylorN?: number;               // Taylor exponent
        taylorC?: number;               // Taylor constant
    };
    
    tool: {
        id?: string;
        type: ToolType;
        substrate: ToolMaterial;
        coating?: ToolCoating;
        edgeCondition?: 'sharp' | 'honed' | 'chamfered' | 'worn';
        wearLandLimit?: Measurement;    // VB max
    };
    
    // Cutting conditions (required)
    cutting: {
        speed: Measurement;
        feed: Measurement;
        doc: Measurement;
        woc?: Measurement;
    };
    
    // Operating conditions
    conditions: {
        coolant: 'flood' | 'mist' | 'mql' | 'air' | 'none';
        coolantPressure?: Measurement;
        interrupted?: boolean;
        interruptionFrequency?: number; // entries per minute
        rigidity: 'low' | 'medium' | 'high' | 'very_high';
        surfaceCondition?: 'clean' | 'scale' | 'forged' | 'cast' | 'hardened_skin';
    };
    
    // Calculation mode
    mode: 'predict_life' | 'find_speed_for_life' | 'optimize_cost';
    
    // For find_speed_for_life mode
    targetLife?: Measurement;           // Target tool life in minutes
    
    // For optimize_cost mode
    costFactors?: {
        toolCost: number;               // $ per insert/edge
        machineRate: number;            // $/hour
        toolChangeTime: number;         // minutes
        setupTime?: number;             // minutes
    };
}

interface ToolLifeCalculatorOutput {
    // Tool life prediction
    life: {
        minutes: Measurement;
        parts?: number;                 // If cycle time known
        meterscut: Measurement;
        volumeRemoved: Measurement;     // cm³
    };
    
    // Life ranges
    ranges: {
        conservative: Measurement;      // 90% confidence lower
        typical: Measurement;           // Expected value
        optimistic: Measurement;        // 90% confidence upper
    };
    
    // Taylor equation
    taylor: {
        equation: string;               // e.g., "VT^0.25 = 350"
        n: number;
        C: number;
        applicableRange: Range;         // Valid speed range
    };
    
    // Wear prediction
    wear: {
        primaryMode: 'flank' | 'crater' | 'notch' | 'nose' | 'chipping' | 'fracture';
        secondaryMode?: string;
        wearRate: number;               // mm/min
        wearCurve: Array<{ time: number; vb: number }>;
    };
    
    // Adjustment factors applied
    factors: {
        coolant: number;
        interrupted: number;
        rigidity: number;
        surface: number;
        engagement: number;
        combined: number;
    };
    
    // For optimize_cost mode
    economics?: {
        optimalSpeed: Measurement;
        optimalLife: Measurement;
        costPerPart: number;
        productivityVsCost: Array<{ speed: number; life: number; cost: number }>;
    };
    
    // Confidence and sources
    confidence: number;
    sources: DataSource[];
    warnings: string[];
}
```

```javascript
// Route: calculator.toollife.predict
PRISM_GATEWAY_CONTRACTS.register('calculator.toollife.predict', {
    version: '1.0.0',
    description: 'Predict tool life for given conditions',
    input: { type: 'ToolLifeCalculatorInput' },
    output: { type: 'ToolLifeCalculatorOutput' },
    errors: [2001, 2002, 5001]
});

// Route: calculator.toollife.findSpeed
PRISM_GATEWAY_CONTRACTS.register('calculator.toollife.findSpeed', {
    version: '1.0.0',
    description: 'Find cutting speed for target tool life',
    input: {
        type: 'ToolLifeCalculatorInput',
        properties: {
            mode: { const: 'find_speed_for_life' },
            targetLife: { type: 'Measurement', required: true }
        }
    },
    output: {
        type: 'object',
        properties: {
            recommendedSpeed: { type: 'Measurement' },
            expectedLife: { type: 'Measurement' },
            speedRange: { type: 'Range' },
            sensitivity: { type: 'object' }  // How life changes with speed
        }
    },
    errors: [2001, 5001, 5006]
});

// Route: calculator.toollife.optimizeCost
PRISM_GATEWAY_CONTRACTS.register('calculator.toollife.optimizeCost', {
    version: '1.0.0',
    description: 'Find optimal speed for minimum cost per part',
    input: {
        type: 'ToolLifeCalculatorInput',
        properties: {
            mode: { const: 'optimize_cost' },
            costFactors: { type: 'object', required: true }
        }
    },
    output: {
        type: 'object',
        properties: {
            optimalSpeed: { type: 'Measurement' },
            optimalLife: { type: 'Measurement' },
            minCostPerPart: { type: 'number' },
            breakdownCost: {
                type: 'object',
                properties: {
                    machiningCost: { type: 'number' },
                    toolCost: { type: 'number' },
                    changeoverCost: { type: 'number' }
                }
            },
            sensitivityAnalysis: { type: 'array' }
        }
    },
    errors: [2001, 5001]
});
```

### 5.4 Surface Finish Calculator

```typescript
interface SurfaceFinishInput {
    // Operation type
    operation: {
        type: 'milling' | 'turning' | 'grinding' | 'boring' | 'reaming';
        subtype?: string;               // e.g., 'face', 'peripheral', 'ball_nose'
        finishing: boolean;
    };
    
    // Tool geometry
    tool: {
        type: ToolType;
        noseRadius?: Measurement;       // For turning, boring
        cornerRadius?: Measurement;     // For milling
        ballDiameter?: Measurement;     // For ball nose
        edgeSharpness?: 'sharp' | 'honed' | 'worn';
        grainSize?: number;             // For grinding wheels
    };
    
    // Cutting parameters
    parameters: {
        feedPerRev?: Measurement;       // For turning
        feedPerTooth?: Measurement;     // For milling
        stepover?: Measurement;         // For 3D milling
        speed: Measurement;
        doc: Measurement;
    };
    
    // Material
    material?: {
        id?: string;
        machinability?: number;
        bueeTendency?: number;          // Built-up edge tendency
    };
    
    // Target specification
    target?: {
        ra?: Measurement;               // Target Ra
        rz?: Measurement;               // Target Rz
        tolerance?: 'tight' | 'standard' | 'loose';
    };
}

interface SurfaceFinishOutput {
    // Predicted finish
    predicted: {
        ra: Measurement;                // Arithmetic average
        rz: Measurement;                // Ten-point height
        rmax: Measurement;              // Maximum height
        rt: Measurement;                // Total height
        rq: Measurement;                // RMS roughness
    };
    
    // Theoretical (geometric) finish
    theoretical: {
        ra: Measurement;
        formula: string;                // e.g., "Ra = f²/(32×r)"
        assumptions: string[];
    };
    
    // Factors affecting actual finish
    factors: {
        geometric: number;              // Base from geometry
        material: number;               // Material factor
        bue: number;                    // Built-up edge
        vibration: number;              // Chatter/vibration
        tool_wear: number;              // Wear effect
        combined: number;               // Total multiplier
    };
    
    // Comparison to target
    comparison?: {
        meetsTarget: boolean;
        margin: number;                 // % better/worse than target
        suggestions: string[];
    };
    
    // Improvement recommendations
    recommendations?: Array<{
        action: string;
        expectedImprovement: number;    // % improvement
        tradeoff: string;
    }>;
    
    confidence: number;
    sources: DataSource[];
}
```

```javascript
// Route: calculator.finish.predict
PRISM_GATEWAY_CONTRACTS.register('calculator.finish.predict', {
    version: '1.0.0',
    description: 'Predict surface finish from cutting parameters',
    input: { type: 'SurfaceFinishInput' },
    output: { type: 'SurfaceFinishOutput' },
    errors: [5001, 5002]
});

// Route: calculator.finish.achieve
PRISM_GATEWAY_CONTRACTS.register('calculator.finish.achieve', {
    version: '1.0.0',
    description: 'Find parameters to achieve target surface finish',
    input: {
        type: 'object',
        required: ['operation', 'tool', 'target'],
        properties: {
            operation: { type: 'object' },
            tool: { type: 'object' },
            target: {
                type: 'object',
                required: ['ra'],
                properties: {
                    ra: { type: 'Measurement' },
                    rz: { type: 'Measurement' }
                }
            },
            constraints: {
                type: 'object',
                properties: {
                    maxFeed: { type: 'Measurement' },
                    minSpeed: { type: 'Measurement' },
                    maxPasses: { type: 'number' }
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            parameters: {
                type: 'object',
                properties: {
                    feed: { type: 'Measurement' },
                    speed: { type: 'Measurement' },
                    doc: { type: 'Measurement' },
                    stepover: { type: 'Measurement' },
                    passes: { type: 'number' }
                }
            },
            achievableFinish: { type: 'SurfaceFinishOutput' },
            alternatives: { type: 'array' }
        }
    },
    errors: [5001, 5006]
});
```

### 5.5 Cycle Time Calculator

```typescript
interface CycleTimeInput {
    // Operations to calculate
    operations: Array<{
        id: string;
        type: OperationType;
        feature?: {
            type: string;               // pocket, hole, contour, etc.
            dimensions: Record<string, Measurement>;
            volume?: Measurement;       // cm³ to remove
        };
        parameters: {
            speed: Measurement;
            feedRate: Measurement;
            doc: Measurement;
            woc?: Measurement;
            passes?: number;
        };
        approach?: Measurement;         // Approach distance
        retract?: Measurement;          // Retract distance
    }>;
    
    // Machine characteristics
    machine: {
        id?: string;
        rapidRate: {
            xy: Measurement;
            z: Measurement;
        };
        acceleration?: Measurement;     // mm/s²
        toolChangeTime?: Measurement;   // seconds
        spindleSpeedupTime?: number;    // seconds to reach RPM
    };
    
    // Setup information
    setup?: {
        loadUnloadTime: Measurement;
        probeTime?: Measurement;
        offsetTime?: Measurement;
    };
    
    // Options
    options?: {
        includeRapids: boolean;
        includeToolChanges: boolean;
        includeSetup: boolean;
        optimizeSequence: boolean;
    };
}

interface CycleTimeOutput {
    // Time breakdown
    times: {
        cutting: Measurement;           // Actual cutting time
        rapid: Measurement;             // Rapid traverse time
        toolChange: Measurement;        // Tool change time
        dwell: Measurement;             // Programmed dwells
        setup: Measurement;             // Load/unload
        total: Measurement;             // Grand total
    };
    
    // Per-operation breakdown
    operationTimes: Array<{
        id: string;
        cutting: Measurement;
        rapid: Measurement;
        percent: number;                // % of total
    }>;
    
    // Efficiency metrics
    efficiency: {
        cuttingPercent: number;         // Cutting time / total
        rapidPercent: number;
        nonCuttingPercent: number;
        chipToChipTime: Measurement;
    };
    
    // Optimization suggestions
    suggestions?: Array<{
        type: 'reduce_rapid' | 'combine_ops' | 'resequence' | 'increase_feed';
        description: string;
        potentialSavings: Measurement;
    }>;
    
    // For batch production
    batch?: {
        partsPerHour: number;
        partsPerShift: number;          // 8-hour shift
        setupAmortized: Measurement;    // Per part
    };
}
```

```javascript
// Route: calculator.cycletime.calculate
PRISM_GATEWAY_CONTRACTS.register('calculator.cycletime.calculate', {
    version: '1.0.0',
    description: 'Calculate cycle time for operations',
    input: { type: 'CycleTimeInput' },
    output: { type: 'CycleTimeOutput' },
    errors: [2003, 5001]
});

// Route: calculator.cycletime.optimize
PRISM_GATEWAY_CONTRACTS.register('calculator.cycletime.optimize', {
    version: '1.0.0',
    description: 'Optimize operation sequence for minimum cycle time',
    input: {
        type: 'object',
        required: ['operations', 'machine'],
        properties: {
            operations: { type: 'array' },
            machine: { type: 'object' },
            constraints: {
                type: 'object',
                properties: {
                    toolChangeLimit: { type: 'number' },
                    mustSequence: { type: 'array' },    // [['op1', 'op2']] = op1 before op2
                    cannotCombine: { type: 'array' }
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            optimizedSequence: { type: 'array' },
            originalTime: { type: 'Measurement' },
            optimizedTime: { type: 'Measurement' },
            savings: { type: 'Measurement' },
            savingsPercent: { type: 'number' },
            changes: { type: 'array' }
        }
    },
    errors: [5001, 3004]
});
```

### 5.6 Cost Calculator

```typescript
interface CostCalculatorInput {
    // Part information
    part: {
        name?: string;
        quantity: number;
        stockCost?: number;             // $ per blank
        stockWeight?: Measurement;
    };
    
    // Operations
    operations: Array<{
        type: OperationType;
        cycleTime: Measurement;
        toolId?: string;
        toolCost?: number;
        toolLife?: Measurement;
        toolsRequired?: number;
    }>;
    
    // Machine
    machine: {
        id?: string;
        hourlyRate: number;             // $/hour (includes overhead)
        efficiency?: number;            // 0.75-0.95 typical
    };
    
    // Setup
    setup: {
        time: Measurement;
        cost?: number;                  // Fixed setup cost
        fixturesCost?: number;
    };
    
    // Additional costs
    additionalCosts?: {
        inspection?: number;            // Per part
        finishing?: number;             // Per part
        packaging?: number;             // Per part
        shipping?: number;              // Per part
        overhead?: number;              // % markup
    };
    
    // Options
    options?: {
        includeSetupAmortization: boolean;
        includeTeardown: boolean;
        profitMargin?: number;          // % markup for quoting
    };
}

interface CostCalculatorOutput {
    // Per-part costs
    perPart: {
        material: number;
        machining: number;
        tooling: number;
        setup: number;                  // Amortized
        inspection: number;
        finishing: number;
        overhead: number;
        total: number;
    };
    
    // Total job costs
    total: {
        material: number;
        machining: number;
        tooling: number;
        setup: number;
        inspection: number;
        finishing: number;
        subtotal: number;
        overhead: number;
        grandTotal: number;
    };
    
    // Quote price (if profit margin specified)
    quote?: {
        perPart: number;
        total: number;
        margin: number;
    };
    
    // Breakdown details
    breakdown: {
        operations: Array<{
            type: string;
            time: Measurement;
            machineCost: number;
            toolCost: number;
            total: number;
        }>;
        tooling: Array<{
            toolId: string;
            quantity: number;
            cost: number;
        }>;
    };
    
    // Sensitivity analysis
    sensitivity?: {
        quantityBreaks: Array<{
            quantity: number;
            perPartCost: number;
            setupPercent: number;
        }>;
        speedImpact: Array<{
            speedChange: number;        // % change
            costChange: number;
            timeChange: number;
        }>;
    };
}
```

```javascript
// Route: calculator.cost.estimate
PRISM_GATEWAY_CONTRACTS.register('calculator.cost.estimate', {
    version: '1.0.0',
    description: 'Estimate manufacturing cost',
    input: { type: 'CostCalculatorInput' },
    output: { type: 'CostCalculatorOutput' },
    errors: [5001, 5002]
});

// Route: calculator.cost.compare
PRISM_GATEWAY_CONTRACTS.register('calculator.cost.compare', {
    version: '1.0.0',
    description: 'Compare costs for different approaches',
    input: {
        type: 'object',
        required: ['scenarios'],
        properties: {
            scenarios: {
                type: 'array',
                items: { type: 'CostCalculatorInput' },
                minItems: 2,
                maxItems: 10
            },
            compareOn: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['total_cost', 'per_part', 'cycle_time', 'tooling', 'setup']
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            results: { type: 'array' },
            winner: { type: 'object' },
            savings: { type: 'number' },
            recommendation: { type: 'string' }
        }
    },
    errors: [5001]
});

// Route: calculator.cost.quantityBreak
PRISM_GATEWAY_CONTRACTS.register('calculator.cost.quantityBreak', {
    version: '1.0.0',
    description: 'Calculate cost at different quantities',
    input: {
        type: 'object',
        required: ['base', 'quantities'],
        properties: {
            base: { type: 'CostCalculatorInput' },
            quantities: {
                type: 'array',
                items: { type: 'number' }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            breaks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        quantity: { type: 'number' },
                        perPartCost: { type: 'number' },
                        totalCost: { type: 'number' },
                        setupPercent: { type: 'number' }
                    }
                }
            },
            economicOrderQuantity: { type: 'number' },
            chart: { type: 'array' }
        }
    },
    errors: [5001]
});
```

---


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

---

## Section 7: Quick Reference - API Route Index

### Database Routes
| Route | Description | Input | Output |
|-------|-------------|-------|--------|
| `materials.get` | Get material by ID | materialId | Material (127 params) |
| `materials.search` | Search materials | query, filters | Material[] |
| `materials.getCuttingData` | Get cutting parameters | materialId, operation | CuttingData |
| `materials.compare` | Compare materials | materialIds[] | Comparison |
| `machines.get` | Get machine by ID | machineId | Machine |
| `machines.search` | Search machines | query, filters | Machine[] |
| `machines.getCapabilities` | Get machine capabilities | machineId | Capabilities |
| `machines.getPostRequirements` | Get post processor info | machineId | PostRequirements |
| `tools.get` | Get tool by ID | toolId | Tool |
| `tools.search` | Search tools | query, filters | Tool[] |
| `tools.recommend` | Recommend tools | operation, material | Recommendations |

### Physics Engine Routes
| Route | Description | Input | Output |
|-------|-------------|-------|--------|
| `physics.force.calculate` | Calculate cutting forces | material, tool, params | Forces, Power, Torque |
| `physics.toollife.calculate` | Predict tool life | material, tool, params | Life, Wear, Taylor |
| `physics.toollife.optimize` | Find optimal speed | material, tool, target | Speed, Life, Cost |
| `physics.chatter.predict` | Predict chatter stability | machine, tool, params | Stability, Lobes |
| `physics.chatter.findStable` | Find stable parameters | machine, tool, target | Parameters |

### ML Engine Routes
| Route | Description | Input | Output |
|-------|-------------|-------|--------|
| `ml.predict` | Make ML prediction | modelId, features | Prediction, Confidence |
| `ml.ensemble.predict` | Ensemble prediction | models[], features | Prediction, Agreement |
| `ml.explain` | Explain prediction | modelId, features | Explanation, SHAP |

### Optimization Routes
| Route | Description | Input | Output |
|-------|-------------|-------|--------|
| `optimization.multiObjective` | Multi-objective optimization | objectives, variables | Pareto Front |
| `optimization.singleObjective` | Single objective optimization | objective, variables | Optimum |
| `optimization.machiningParameters` | Optimize machining params | material, tool, objectives | Parameters |

### Calculator Routes
| Route | Description | Input | Output |
|-------|-------------|-------|--------|
| `calculator.speedfeed.calculate` | Calculate speeds/feeds | material, tool, operation | Parameters, Predictions |
| `calculator.speedfeed.compare` | Compare scenarios | scenarios[] | Results, Winner |
| `calculator.speedfeed.adjust` | Adjust for feedback | original, feedback | Adjusted Parameters |
| `calculator.power.calculate` | Calculate power/torque | cutting, material, tool | Power, Torque |
| `calculator.power.curve` | Generate power curve | machine, cutting | Curve, Optimal RPM |
| `calculator.toollife.predict` | Predict tool life | material, tool, conditions | Life, Wear, Taylor |
| `calculator.toollife.findSpeed` | Find speed for life | material, tool, target | Speed |
| `calculator.toollife.optimizeCost` | Optimize for cost | material, tool, costs | Optimal Speed, Cost |
| `calculator.finish.predict` | Predict surface finish | operation, tool, params | Ra, Rz, Rmax |
| `calculator.finish.achieve` | Find params for finish | operation, tool, target | Parameters |
| `calculator.cycletime.calculate` | Calculate cycle time | operations, machine | Times, Breakdown |
| `calculator.cycletime.optimize` | Optimize sequence | operations, machine | Optimized Sequence |
| `calculator.cost.estimate` | Estimate cost | part, operations, machine | Costs, Breakdown |
| `calculator.cost.compare` | Compare approaches | scenarios[] | Results, Savings |
| `calculator.cost.quantityBreak` | Calculate quantity breaks | base, quantities[] | Breaks, EOQ |

### CAD Routes
| Route | Description | Input | Output |
|-------|-------------|-------|--------|
| `cad.import` | Import CAD file | file, options | Model, Geometry |
| `cad.export` | Export CAD model | modelId, format | File Buffer |
| `cad.validate` | Validate geometry | modelId, checks | Valid, Issues |
| `cad.features.recognize` | Recognize features | modelId, options | Features[] |
| `cad.features.get` | Get feature details | modelId, featureId | Feature |
| `cad.features.classify` | Classify by operation | modelId, machineType | Classification |

### CAM Routes
| Route | Description | Input | Output |
|-------|-------------|-------|--------|
| `cam.operation.create` | Create operation | model, stock, tool, params | Operation, Toolpath |
| `cam.operation.optimize` | Optimize operation | operationId, objectives | Optimized |
| `cam.operation.simulate` | Simulate operation | operationId, options | Stock Model, Collisions |
| `cam.toolpath.get` | Get toolpath data | toolpathId, format | Toolpath Data |
| `cam.toolpath.verify` | Verify toolpath | toolpathId, machineId | Valid, Issues |
| `cam.toolpath.compare` | Compare toolpaths | toolpathId1, toolpathId2 | Comparison |
| `cam.post.generate` | Generate G-code | source, target, options | Program |
| `cam.post.validate` | Validate G-code | program, controllerId | Valid, Errors |
| `cam.post.backplot` | Backplot G-code | program, machineId | Toolpath |

---

*End of Part 1 - Part 2 will cover: Learning API Contracts, System API Contracts, Event Contracts, WebSocket Contracts, Batch Processing Contracts, Error Response Standards*


---

# PART 2: Advanced API Contracts

## Section 8: Learning API Contracts

### 8.1 Feedback Collection

```typescript
interface FeedbackInput {
    // What the feedback is about
    subject: {
        type: 'calculation' | 'recommendation' | 'prediction' | 'toolpath' | 'operation';
        id: string;                     // Reference ID
        timestamp?: Timestamp;
    };
    
    // Original values
    original: {
        parameters?: Record<string, any>;
        prediction?: any;
        confidence?: number;
    };
    
    // Actual observed results
    actual: {
        outcome: 'success' | 'partial' | 'failure';
        values?: Record<string, any>;
        measurements?: Record<string, Measurement>;
    };
    
    // Feedback details
    feedback: {
        type: 'correction' | 'confirmation' | 'issue' | 'improvement';
        category?: string;
        description?: string;
        severity?: 'minor' | 'moderate' | 'major';
    };
    
    // Context
    context?: {
        machineId?: string;
        operatorId?: string;
        jobId?: string;
        environmentConditions?: Record<string, any>;
    };
}

interface FeedbackOutput {
    feedbackId: string;
    status: 'accepted' | 'rejected' | 'pending_review';
    
    // Validation
    validation: {
        physicsConsistent: boolean;
        withinExpectedRange: boolean;
        anomalyDetected: boolean;
        anomalyScore?: number;
    };
    
    // Impact assessment
    impact?: {
        affectedModels: string[];
        retrainingTriggered: boolean;
        confidenceAdjustment: number;
    };
    
    // Actions taken
    actions: Array<{
        type: string;
        description: string;
        status: string;
    }>;
}
```

```javascript
// Route: learning.feedback.submit
PRISM_GATEWAY_CONTRACTS.register('learning.feedback.submit', {
    version: '1.0.0',
    description: 'Submit feedback on calculation or prediction',
    input: { type: 'FeedbackInput' },
    output: { type: 'FeedbackOutput' },
    errors: [9200, 9201, 9202]
});

// Route: learning.feedback.bulk
PRISM_GATEWAY_CONTRACTS.register('learning.feedback.bulk', {
    version: '1.0.0',
    description: 'Submit multiple feedback entries',
    input: {
        type: 'object',
        required: ['feedbackList'],
        properties: {
            feedbackList: {
                type: 'array',
                items: { type: 'FeedbackInput' },
                maxItems: 100
            },
            batchId: { type: 'string' }
        }
    },
    output: {
        type: 'object',
        properties: {
            batchId: { type: 'string' },
            total: { type: 'number' },
            accepted: { type: 'number' },
            rejected: { type: 'number' },
            results: { type: 'array' }
        }
    },
    errors: [9200, 9201]
});

// Route: learning.feedback.query
PRISM_GATEWAY_CONTRACTS.register('learning.feedback.query', {
    version: '1.0.0',
    description: 'Query historical feedback',
    input: {
        type: 'object',
        properties: {
            subjectType: { type: 'string' },
            dateRange: {
                type: 'object',
                properties: {
                    start: { type: 'Timestamp' },
                    end: { type: 'Timestamp' }
                }
            },
            outcome: { type: 'string' },
            limit: { type: 'number', default: 100 },
            offset: { type: 'number', default: 0 }
        }
    },
    output: {
        type: 'object',
        properties: {
            feedback: { type: 'array' },
            total: { type: 'number' },
            statistics: {
                type: 'object',
                properties: {
                    byOutcome: { type: 'object' },
                    byType: { type: 'object' },
                    avgConfidence: { type: 'number' }
                }
            }
        }
    },
    errors: [9200]
});
```

### 8.2 Model Training API

```typescript
interface TrainingInput {
    // Model specification
    model: {
        id: string;                     // Model to train/retrain
        type?: 'speed_feed' | 'tool_life' | 'surface_finish' | 'chatter' | 'custom';
        architecture?: string;
    };
    
    // Training data
    data: {
        source: 'database' | 'file' | 'inline';
        query?: string;                 // For database source
        filePath?: string;              // For file source
        records?: any[];                // For inline source
        validationSplit?: number;       // 0.0-0.5
    };
    
    // Training configuration
    config: {
        epochs?: number;
        batchSize?: number;
        learningRate?: number;
        optimizer?: 'adam' | 'sgd' | 'rmsprop';
        lossFunction?: string;
        earlyStoppingPatience?: number;
        regularization?: {
            l1?: number;
            l2?: number;
            dropout?: number;
        };
    };
    
    // Validation requirements
    validation: {
        minimumAccuracy?: number;
        maximumError?: number;
        crossValidationFolds?: number;
        physicsConsistencyCheck?: boolean;
    };
}

interface TrainingOutput {
    jobId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    
    // Training progress
    progress?: {
        epoch: number;
        totalEpochs: number;
        loss: number;
        valLoss: number;
        metrics: Record<string, number>;
    };
    
    // Final results (when completed)
    results?: {
        trainLoss: number;
        valLoss: number;
        testMetrics: {
            accuracy: number;
            mae: number;
            rmse: number;
            r2: number;
        };
        crossValidation?: {
            folds: number;
            scores: number[];
            mean: number;
            std: number;
        };
        physicsConsistency?: {
            passed: boolean;
            violations: number;
            details: string[];
        };
    };
    
    // Model artifact
    model?: {
        version: string;
        path: string;
        size: number;
        deploymentReady: boolean;
    };
}
```

```javascript
// Route: learning.model.train
PRISM_GATEWAY_CONTRACTS.register('learning.model.train', {
    version: '1.0.0',
    description: 'Train or retrain ML model',
    input: { type: 'TrainingInput' },
    output: { type: 'TrainingOutput' },
    errors: [9100, 9101, 9102, 9103, 9104]
});

// Route: learning.model.status
PRISM_GATEWAY_CONTRACTS.register('learning.model.status', {
    version: '1.0.0',
    description: 'Get training job status',
    input: {
        type: 'object',
        required: ['jobId'],
        properties: {
            jobId: { type: 'string' }
        }
    },
    output: { type: 'TrainingOutput' },
    errors: [9100]
});

// Route: learning.model.deploy
PRISM_GATEWAY_CONTRACTS.register('learning.model.deploy', {
    version: '1.0.0',
    description: 'Deploy trained model to production',
    input: {
        type: 'object',
        required: ['modelId', 'version'],
        properties: {
            modelId: { type: 'string' },
            version: { type: 'string' },
            deployment: {
                type: 'object',
                properties: {
                    target: { type: 'string', enum: ['production', 'staging', 'canary'] },
                    percentage: { type: 'number' },      // For canary
                    rollbackOnError: { type: 'boolean' }
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            deploymentId: { type: 'string' },
            status: { type: 'string' },
            activeVersion: { type: 'string' },
            previousVersion: { type: 'string' }
        }
    },
    errors: [9000, 9001]
});

// Route: learning.model.compare
PRISM_GATEWAY_CONTRACTS.register('learning.model.compare', {
    version: '1.0.0',
    description: 'Compare model versions',
    input: {
        type: 'object',
        required: ['modelId', 'versions'],
        properties: {
            modelId: { type: 'string' },
            versions: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 5
            },
            testData: { type: 'object' }
        }
    },
    output: {
        type: 'object',
        properties: {
            comparison: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        version: { type: 'string' },
                        metrics: { type: 'object' },
                        physicsConsistency: { type: 'number' }
                    }
                }
            },
            recommendation: { type: 'string' }
        }
    },
    errors: [9000]
});
```

### 8.3 Knowledge Update API

```typescript
interface KnowledgeUpdateInput {
    // Update type
    type: 'material' | 'machine' | 'tool' | 'process' | 'algorithm';
    
    // What to update
    target: {
        id?: string;                    // Existing entry
        category?: string;              // For new entries
    };
    
    // Update data
    data: {
        fields: Record<string, any>;
        source: DataSource;
        confidence: number;
    };
    
    // Update mode
    mode: 'merge' | 'replace' | 'append';
    
    // Validation
    validation?: {
        requireReview: boolean;
        physicsCheck: boolean;
        crossReference: boolean;
    };
}

interface KnowledgeUpdateOutput {
    updateId: string;
    status: 'applied' | 'pending_review' | 'rejected';
    
    // Changes made
    changes: {
        fieldsUpdated: string[];
        previousValues: Record<string, any>;
        newValues: Record<string, any>;
    };
    
    // Validation results
    validation: {
        physicsCheck: { passed: boolean; details?: string[] };
        crossReference: { passed: boolean; conflicts?: string[] };
        review: { required: boolean; reviewerId?: string };
    };
    
    // Propagation
    propagation?: {
        affectedModels: string[];
        affectedCalculations: string[];
        reindexRequired: boolean;
    };
}
```

```javascript
// Route: learning.knowledge.update
PRISM_GATEWAY_CONTRACTS.register('learning.knowledge.update', {
    version: '1.0.0',
    description: 'Update knowledge base entry',
    input: { type: 'KnowledgeUpdateInput' },
    output: { type: 'KnowledgeUpdateOutput' },
    errors: [2001, 9200, 9201]
});

// Route: learning.knowledge.validate
PRISM_GATEWAY_CONTRACTS.register('learning.knowledge.validate', {
    version: '1.0.0',
    description: 'Validate knowledge update before applying',
    input: { type: 'KnowledgeUpdateInput' },
    output: {
        type: 'object',
        properties: {
            valid: { type: 'boolean' },
            issues: { type: 'array' },
            suggestions: { type: 'array' },
            impactAnalysis: { type: 'object' }
        }
    },
    errors: [2001]
});

// Route: learning.knowledge.history
PRISM_GATEWAY_CONTRACTS.register('learning.knowledge.history', {
    version: '1.0.0',
    description: 'Get change history for knowledge entry',
    input: {
        type: 'object',
        required: ['type', 'id'],
        properties: {
            type: { type: 'string' },
            id: { type: 'string' },
            limit: { type: 'number', default: 50 }
        }
    },
    output: {
        type: 'object',
        properties: {
            history: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        timestamp: { type: 'Timestamp' },
                        updateId: { type: 'string' },
                        changes: { type: 'object' },
                        source: { type: 'DataSource' },
                        userId: { type: 'string' }
                    }
                }
            },
            totalChanges: { type: 'number' }
        }
    },
    errors: [2001]
});
```

---

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

---

## Section 10: Event Contracts

### 10.1 Event Schema

```typescript
interface PRISMEvent {
    // Event identification
    id: UUID;
    type: EventType;
    version: string;                    // Schema version
    
    // Timing
    timestamp: Timestamp;
    sequence?: number;                  // For ordering
    
    // Source
    source: {
        module: string;
        action: string;
        userId?: string;
        sessionId?: string;
        requestId?: string;
    };
    
    // Payload (type-specific)
    payload: any;
    
    // Metadata
    metadata?: {
        correlationId?: string;
        causationId?: string;
        tags?: string[];
        priority?: 'low' | 'normal' | 'high';
    };
}

type EventType = 
    // Calculation events
    | 'calculation.started' | 'calculation.completed' | 'calculation.failed'
    
    // Data events
    | 'data.created' | 'data.updated' | 'data.deleted'
    | 'material.created' | 'material.updated'
    | 'machine.created' | 'machine.updated'
    | 'tool.created' | 'tool.updated'
    
    // CAD/CAM events
    | 'cad.imported' | 'cad.exported' | 'cad.validated'
    | 'cam.operation.created' | 'cam.operation.completed'
    | 'cam.toolpath.generated' | 'cam.post.completed'
    
    // Learning events
    | 'learning.feedback.received' | 'learning.model.trained'
    | 'learning.model.deployed' | 'learning.knowledge.updated'
    
    // System events
    | 'system.startup' | 'system.shutdown'
    | 'system.error' | 'system.warning'
    | 'system.degraded' | 'system.recovered'
    
    // User events
    | 'user.login' | 'user.logout' | 'user.action';
```

### 10.2 Event Subscription

```javascript
// Route: events.subscribe
PRISM_GATEWAY_CONTRACTS.register('events.subscribe', {
    version: '1.0.0',
    description: 'Subscribe to event types',
    input: {
        type: 'object',
        required: ['eventTypes'],
        properties: {
            eventTypes: {
                type: 'array',
                items: { type: 'EventType' }
            },
            filter: {
                type: 'object',
                properties: {
                    source: { type: 'string' },
                    tags: { type: 'array' },
                    priority: { type: 'string' }
                }
            },
            delivery: {
                type: 'object',
                properties: {
                    method: { type: 'string', enum: ['websocket', 'webhook', 'queue'] },
                    endpoint: { type: 'string' },
                    batchSize: { type: 'number' },
                    batchInterval: { type: 'number' }
                }
            }
        }
    },
    output: {
        type: 'object',
        properties: {
            subscriptionId: { type: 'string' },
            status: { type: 'string' },
            eventTypes: { type: 'array' },
            delivery: { type: 'object' }
        }
    },
    errors: [7103]
});

// Route: events.unsubscribe
PRISM_GATEWAY_CONTRACTS.register('events.unsubscribe', {
    version: '1.0.0',
    description: 'Unsubscribe from events',
    input: {
        type: 'object',
        required: ['subscriptionId'],
        properties: {
            subscriptionId: { type: 'string' }
        }
    },
    output: {
        type: 'object',
        properties: {
            success: { type: 'boolean' }
        }
    },
    errors: []
});

// Route: events.publish
PRISM_GATEWAY_CONTRACTS.register('events.publish', {
    version: '1.0.0',
    description: 'Publish custom event',
    input: {
        type: 'object',
        required: ['type', 'payload'],
        properties: {
            type: { type: 'string' },
            payload: { type: 'object' },
            metadata: { type: 'object' }
        }
    },
    output: {
        type: 'object',
        properties: {
            eventId: { type: 'string' },
            timestamp: { type: 'Timestamp' },
            delivered: { type: 'number' }
        }
    },
    errors: [7100]
});

// Route: events.history
PRISM_GATEWAY_CONTRACTS.register('events.history', {
    version: '1.0.0',
    description: 'Query event history',
    input: {
        type: 'object',
        properties: {
            eventTypes: { type: 'array' },
            timeRange: { type: 'object' },
            correlationId: { type: 'string' },
            limit: { type: 'number', default: 100 },
            offset: { type: 'number', default: 0 }
        }
    },
    output: {
        type: 'object',
        properties: {
            events: { type: 'array', items: { type: 'PRISMEvent' } },
            total: { type: 'number' },
            hasMore: { type: 'boolean' }
        }
    },
    errors: []
});
```

---

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

---

## Section 12: Batch Processing Contracts

### 12.1 Batch Job API

```typescript
interface BatchJobInput {
    // Job type
    type: BatchJobType;
    
    // Items to process
    items: any[];
    
    // Processing options
    options?: {
        parallelism?: number;           // Max concurrent
        timeout?: number;               // Per-item timeout (ms)
        retries?: number;               // Retry count
        continueOnError?: boolean;      // Process remaining on failure
        priority?: 'low' | 'normal' | 'high';
    };
    
    // Notification preferences
    notification?: {
        onComplete?: boolean;
        onError?: boolean;
        onProgress?: number;            // Notify every N% progress
        webhook?: string;
        email?: string;
    };
}

type BatchJobType = 
    | 'calculate.speedfeed'
    | 'calculate.toollife'
    | 'calculate.cost'
    | 'import.materials'
    | 'import.machines'
    | 'import.tools'
    | 'export.data'
    | 'validate.models'
    | 'retrain.models'
    | 'generate.reports';

interface BatchJobOutput {
    jobId: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    
    // Progress
    progress: {
        total: number;
        processed: number;
        succeeded: number;
        failed: number;
        percent: number;
    };
    
    // Timing
    timing: {
        queued: Timestamp;
        started?: Timestamp;
        completed?: Timestamp;
        estimatedCompletion?: Timestamp;
    };
    
    // Results (when completed)
    results?: {
        successful: any[];
        failed: Array<{
            item: any;
            error: string;
            retries: number;
        }>;
        summary: Record<string, any>;
    };
}
```

```javascript
// Route: batch.submit
PRISM_GATEWAY_CONTRACTS.register('batch.submit', {
    version: '1.0.0',
    description: 'Submit batch processing job',
    input: { type: 'BatchJobInput' },
    output: { type: 'BatchJobOutput' },
    errors: [1000, 7103]
});

// Route: batch.status
PRISM_GATEWAY_CONTRACTS.register('batch.status', {
    version: '1.0.0',
    description: 'Get batch job status',
    input: {
        type: 'object',
        required: ['jobId'],
        properties: {
            jobId: { type: 'string' },
            includeResults: { type: 'boolean', default: false }
        }
    },
    output: { type: 'BatchJobOutput' },
    errors: []
});

// Route: batch.cancel
PRISM_GATEWAY_CONTRACTS.register('batch.cancel', {
    version: '1.0.0',
    description: 'Cancel batch job',
    input: {
        type: 'object',
        required: ['jobId'],
        properties: {
            jobId: { type: 'string' }
        }
    },
    output: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            processedBeforeCancel: { type: 'number' }
        }
    },
    errors: []
});

// Route: batch.list
PRISM_GATEWAY_CONTRACTS.register('batch.list', {
    version: '1.0.0',
    description: 'List batch jobs',
    input: {
        type: 'object',
        properties: {
            status: { type: 'string' },
            type: { type: 'string' },
            limit: { type: 'number', default: 50 }
        }
    },
    output: {
        type: 'object',
        properties: {
            jobs: { type: 'array', items: { type: 'BatchJobOutput' } },
            total: { type: 'number' }
        }
    },
    errors: []
});
```

---


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

---

## Section 14: API Versioning and Deprecation

### 14.1 Version Strategy

```typescript
// API versioning follows semantic versioning for contracts
interface APIVersion {
    major: number;                      // Breaking changes
    minor: number;                      // New features (backward compatible)
    patch: number;                      // Bug fixes
}

// Version in route registration
interface VersionedRoute {
    route: string;
    versions: {
        [version: string]: {
            input: TypeSchema;
            output: TypeSchema;
            deprecated?: boolean;
            deprecationDate?: string;
            sunsetDate?: string;
            migrationGuide?: string;
        };
    };
}

// Example versioned route
const VERSIONED_ROUTE_EXAMPLE = {
    route: 'materials.get',
    versions: {
        '1.0.0': {
            input: { /* original schema */ },
            output: { /* original schema with 50 fields */ }
        },
        '2.0.0': {
            input: { /* updated schema */ },
            output: { /* 127-field material output */ }
        },
        '1.0.0_deprecated': {
            deprecated: true,
            deprecationDate: '2025-01-01',
            sunsetDate: '2025-07-01',
            migrationGuide: 'https://docs.prism.io/api/migration/materials-v2'
        }
    }
};
```

### 14.2 Deprecation Handling

```javascript
// Route: api.versions
PRISM_GATEWAY_CONTRACTS.register('api.versions', {
    version: '1.0.0',
    description: 'Get API version information',
    input: {
        type: 'object',
        properties: {
            route: { type: 'string' }
        }
    },
    output: {
        type: 'object',
        properties: {
            currentVersion: { type: 'string' },
            supportedVersions: { type: 'array' },
            deprecatedVersions: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        version: { type: 'string' },
                        deprecationDate: { type: 'string' },
                        sunsetDate: { type: 'string' },
                        migrationGuide: { type: 'string' }
                    }
                }
            }
        }
    },
    errors: []
});

// Deprecation warning header
interface DeprecationHeaders {
    'X-API-Deprecation-Warning': string;    // Human-readable warning
    'X-API-Sunset-Date': string;            // ISO date
    'X-API-Migration-Guide': string;        // URL to migration docs
}

// Deprecation response wrapper
function wrapDeprecatedResponse(response, deprecationInfo) {
    return {
        ...response,
        _deprecation: {
            warning: `This API version is deprecated and will be removed on ${deprecationInfo.sunsetDate}`,
            currentVersion: deprecationInfo.currentVersion,
            sunsetDate: deprecationInfo.sunsetDate,
            migrationGuide: deprecationInfo.migrationGuide
        }
    };
}
```

---

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

---

## Section 16: Authentication and Authorization

### 16.1 Authentication Contract

```typescript
interface AuthTokenPayload {
    // Standard claims
    sub: string;                        // User ID
    iss: string;                        // Issuer (PRISM)
    aud: string;                        // Audience
    exp: number;                        // Expiration timestamp
    iat: number;                        // Issued at timestamp
    jti: string;                        // Token ID
    
    // PRISM-specific claims
    prism: {
        userId: string;
        organizationId?: string;
        roles: string[];
        permissions: string[];
        tier: 'free' | 'pro' | 'enterprise';
        features: string[];
    };
}

interface AuthRequest {
    type: 'password' | 'token' | 'api_key' | 'oauth';
    credentials: {
        username?: string;
        password?: string;
        token?: string;
        apiKey?: string;
        oauthCode?: string;
        oauthProvider?: string;
    };
    options?: {
        rememberMe?: boolean;
        mfaCode?: string;
    };
}

interface AuthResponse {
    success: boolean;
    tokens?: {
        accessToken: string;
        refreshToken: string;
        tokenType: 'Bearer';
        expiresIn: number;              // seconds
    };
    user?: {
        id: string;
        email: string;
        name: string;
        roles: string[];
        permissions: string[];
    };
    mfaRequired?: boolean;
    mfaMethods?: string[];
}
```

### 16.2 Permission System

```typescript
// Permission format: resource.action
type Permission = 
    // Material permissions
    | 'materials.read' | 'materials.write' | 'materials.delete' | 'materials.admin'
    
    // Machine permissions
    | 'machines.read' | 'machines.write' | 'machines.delete' | 'machines.admin'
    
    // Tool permissions
    | 'tools.read' | 'tools.write' | 'tools.delete' | 'tools.admin'
    
    // Calculator permissions
    | 'calculators.use' | 'calculators.configure'
    
    // CAD/CAM permissions
    | 'cad.read' | 'cad.write' | 'cam.read' | 'cam.write' | 'post.generate'
    
    // ML/Learning permissions
    | 'ml.predict' | 'ml.train' | 'ml.deploy'
    | 'learning.feedback' | 'learning.knowledge'
    
    // System permissions
    | 'system.config' | 'system.admin' | 'batch.submit'
    
    // Wildcard
    | '*';

// Role definitions
interface Role {
    name: string;
    description: string;
    permissions: Permission[];
    inherits?: string[];                // Inherit from other roles
}

const ROLES = {
    viewer: {
        name: 'Viewer',
        description: 'Read-only access',
        permissions: [
            'materials.read', 'machines.read', 'tools.read',
            'cad.read', 'cam.read', 'calculators.use'
        ]
    },
    operator: {
        name: 'Operator',
        description: 'Standard user access',
        permissions: ['ml.predict', 'learning.feedback', 'post.generate'],
        inherits: ['viewer']
    },
    programmer: {
        name: 'Programmer',
        description: 'CAD/CAM programmer access',
        permissions: ['cad.write', 'cam.write', 'calculators.configure'],
        inherits: ['operator']
    },
    engineer: {
        name: 'Engineer',
        description: 'Full engineering access',
        permissions: [
            'materials.write', 'machines.write', 'tools.write',
            'learning.knowledge', 'batch.submit'
        ],
        inherits: ['programmer']
    },
    admin: {
        name: 'Administrator',
        description: 'Full system access',
        permissions: ['*']
    }
};
```

```javascript
// Route: auth.login
PRISM_GATEWAY_CONTRACTS.register('auth.login', {
    version: '1.0.0',
    description: 'Authenticate user',
    input: { type: 'AuthRequest' },
    output: { type: 'AuthResponse' },
    errors: [8001, 8002, 8003]
});

// Route: auth.refresh
PRISM_GATEWAY_CONTRACTS.register('auth.refresh', {
    version: '1.0.0',
    description: 'Refresh access token',
    input: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
            refreshToken: { type: 'string' }
        }
    },
    output: { type: 'AuthResponse' },
    errors: [8002, 8003]
});

// Route: auth.permissions
PRISM_GATEWAY_CONTRACTS.register('auth.permissions', {
    version: '1.0.0',
    description: 'Get user permissions',
    input: { type: 'object', properties: {} },
    output: {
        type: 'object',
        properties: {
            roles: { type: 'array' },
            permissions: { type: 'array' },
            effectivePermissions: { type: 'array' }
        }
    },
    errors: [8001]
});

// Route: auth.check
PRISM_GATEWAY_CONTRACTS.register('auth.check', {
    version: '1.0.0',
    description: 'Check if action is permitted',
    input: {
        type: 'object',
        required: ['permission'],
        properties: {
            permission: { type: 'string' },
            resource: { type: 'string' }
        }
    },
    output: {
        type: 'object',
        properties: {
            permitted: { type: 'boolean' },
            reason: { type: 'string' }
        }
    },
    errors: []
});
```

---

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
    // SIGNAL PROCESSING ROUTES (NEW - 2026-01-30)
    // ════════════════════════════════════════════════════════════════
    
    'signal.fft':                { method: 'POST', auth: 'signal.analyze' },
    'signal.ifft':               { method: 'POST', auth: 'signal.analyze' },
    'signal.psd':                { method: 'POST', auth: 'signal.analyze' },
    'signal.window.apply':       { method: 'POST', auth: 'signal.analyze' },
    'signal.filter.butterworth': { method: 'POST', auth: 'signal.analyze' },
    'signal.filter.highpass':    { method: 'POST', auth: 'signal.analyze' },
    'signal.filter.bandpass':    { method: 'POST', auth: 'signal.analyze' },
    'signal.filter.ma':          { method: 'POST', auth: 'signal.analyze' },
    'signal.wavelet.dwt':        { method: 'POST', auth: 'signal.analyze' },
    'signal.wavelet.idwt':       { method: 'POST', auth: 'signal.analyze' },
    'physics.chatter.detect':    { method: 'POST', auth: 'physics.analyze' },
    'physics.chatter.wavelet':   { method: 'POST', auth: 'physics.analyze' },
    'physics.chatter.realtime':  { method: 'POST', auth: 'physics.analyze' },
    
    // ════════════════════════════════════════════════════════════════
    // ACTIVE LEARNING ROUTES (NEW - 2026-01-30)
    // ════════════════════════════════════════════════════════════════
    
    'ai.active.uncertainty':     { method: 'POST', auth: 'ai.learn' },
    'ai.active.qbc':             { method: 'POST', auth: 'ai.learn' },
    'ai.active.emc':             { method: 'POST', auth: 'ai.learn' },
    'ai.learn.persist.save':     { method: 'POST', auth: 'ai.learn' },
    'ai.learn.persist.load':     { method: 'GET',  auth: 'ai.learn' },
    'ai.learn.persist.list':     { method: 'GET',  auth: 'ai.learn' },
    'ai.learn.cam.learn':        { method: 'POST', auth: 'ai.learn' },
    'ai.learn.cam.recommend':    { method: 'POST', auth: 'ai.learn' },
    'ai.learn.machine.axis':     { method: 'POST', auth: 'ai.learn' },
    'ai.learn.machine.collision':{ method: 'POST', auth: 'ai.learn' },
    
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
    signal: 13,
    active_learning: 10,
    system: 9,
    events: 4,
    batch: 4,
    auth: 5,
    meta: 3,
    TOTAL: 116
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

---

## Section 18: Gateway Route Registration

```javascript
// Registering routes in PRISM_GATEWAY
Object.entries(PRISM_API_ROUTES).forEach(([route, config]) => {
    PRISM_GATEWAY.registerRoute({
        route,
        method: config.method,
        auth: config.auth,
        rateLimit: RATE_LIMITS[getCategoryForRoute(route)],
        contract: PRISM_GATEWAY_CONTRACTS.get(route),
        middleware: [
            'requestId',
            'logging',
            config.auth ? 'authentication' : null,
            config.auth ? 'authorization' : null,
            'rateLimit',
            'validation',
            'metrics'
        ].filter(Boolean)
    });
});

// Gateway execution
async function executeRoute(route, payload, context) {
    const contract = PRISM_GATEWAY_CONTRACTS.get(route);
    
    // Validate input
    const inputValidation = contract.validateInput(payload);
    if (!inputValidation.valid) {
        return PRISM_ERROR_RESPONSE.create(5001, {
            message: 'Validation failed',
            details: { validationErrors: inputValidation.errors }
        });
    }
    
    // Execute
    const result = await PRISM_GATEWAY.execute(route, payload, context);
    
    // Validate output
    const outputValidation = contract.validateOutput(result);
    if (!outputValidation.valid) {
        console.error('Output validation failed:', outputValidation.errors);
        // Log but don't fail - this is a programming error
    }
    
    return {
        success: true,
        data: result,
        metadata: {
            requestId: context.requestId,
            timestamp: new Date().toISOString(),
            duration: context.duration,
            version: contract.version,
            cached: context.cached || false
        }
    };
}
```

---

*End of API Contracts Skill - 116 routes defined, full type definitions, error handling, rate limiting, authentication*
