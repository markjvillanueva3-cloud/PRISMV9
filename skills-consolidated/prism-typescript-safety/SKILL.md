---
name: prism-typescript-safety
version: "1.0"
level: 3
category: domain
description: |
  TypeScript type safety patterns for PRISM Manufacturing Intelligence.
  Covers strict typing, branded types, type guards, generics, discriminated unions,
  and runtime validation. All patterns prevent bugs in safety-critical calculations.
  Use when writing new code, reviewing types, or hardening existing modules.
dependencies:
  - prism-code-master
  - prism-error-handling-patterns
consumers:
  - ALL TypeScript code in PRISM
safety_critical: true
---

# PRISM TYPESCRIPT SAFETY
## Type Safety for Manufacturing Intelligence
### Version 1.0 | Level 3 Domain Skill

---

## QUICK REFERENCE

| Pattern | Purpose | PRISM Use Case |
|---------|---------|----------------|
| Branded Types | Prevent unit confusion | `Millimeters` vs `Inches` |
| Discriminated Unions | Safe state handling | Machine states, result types |
| Type Guards | Runtime type narrowing | API response validation |
| Strict Null Checks | Eliminate null errors | Material lookups |
| Readonly | Prevent mutations | Immutable material data |
| Generics | Type-safe abstractions | Repository<Material> |
| Template Literals | String type safety | MaterialID format |
| Const Assertions | Literal types | Configuration enums |

### Safety Principle
⚠️ **LIFE-SAFETY**: Type errors can cause incorrect calculations that lead to machine crashes, tool breakage, or operator injury. Strong typing catches errors at compile time.

---

## SECTION 1: BRANDED TYPES (Phantom Types)

### The Problem: Unit Confusion
```typescript
// ❌ DANGEROUS: Can mix up units
function calculateSpeed(diameter: number, rpm: number): number {
  return Math.PI * diameter * rpm;  // Is diameter in mm or inches?!
}

const speed1 = calculateSpeed(25, 1000);      // 25mm? 25 inches?
const speed2 = calculateSpeed(0.984, 1000);   // Same tool, different units!
```

### The Solution: Branded Types
```typescript
// ✅ SAFE: Units are encoded in the type system
// Brand symbol - unique per type
declare const __brand: unique symbol;

// Branded type factory
type Brand<T, B> = T & { [__brand]: B };

// Unit-specific types
type Millimeters = Brand<number, 'mm'>;
type Inches = Brand<number, 'in'>;
type MetersPerMinute = Brand<number, 'm/min'>;
type SurfaceFeetPerMinute = Brand<number, 'sfm'>;
type RPM = Brand<number, 'rpm'>;
type Newtons = Brand<number, 'N'>;
type Pounds = Brand<number, 'lb'>;

// Constructor functions with validation
function mm(value: number): Millimeters {
  if (value < 0) throw new Error('Length cannot be negative');
  return value as Millimeters;
}

function inches(value: number): Inches {
  if (value < 0) throw new Error('Length cannot be negative');
  return value as Inches;
}

function rpm(value: number): RPM {
  if (value < 0) throw new Error('RPM cannot be negative');
  if (value > 100000) throw new Error('RPM exceeds safe maximum');
  return value as RPM;
}

// Type-safe functions
function calculateCuttingSpeed(diameter: Millimeters, spindleRpm: RPM): MetersPerMinute {
  const speed = (Math.PI * diameter * spindleRpm) / 1000;
  return speed as MetersPerMinute;
}

// Usage - compiler catches unit errors!
const toolDiameter = mm(25);
const spindleSpeed = rpm(3000);

const cuttingSpeed = calculateCuttingSpeed(toolDiameter, spindleSpeed);  // ✅ OK

// const wrong = calculateCuttingSpeed(inches(1), spindleSpeed);  // ❌ Compile error!
```

### Material ID Branding
```typescript
// Branded IDs prevent mixing different entity types
type MaterialID = Brand<string, 'MaterialID'>;
type MachineID = Brand<string, 'MachineID'>;
type ToolID = Brand<string, 'ToolID'>;

function materialId(id: string): MaterialID {
  if (!/^[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+$/.test(id)) {
    throw new Error(`Invalid material ID format: ${id}`);
  }
  return id as MaterialID;
}

interface IMaterialRepository {
  getMaterial(id: MaterialID): Promise<Material | null>;
}

// Cannot accidentally pass wrong ID type
const repo: IMaterialRepository = /* ... */;
const matId = materialId('CS-1018-ANN');
const machId = 'HAAS-VF2' as MachineID;

await repo.getMaterial(matId);    // ✅ OK
// await repo.getMaterial(machId); // ❌ Compile error!
```

### Conversion Functions
```typescript
// Safe unit conversions
function mmToInches(value: Millimeters): Inches {
  return (value / 25.4) as Inches;
}

function inchesToMm(value: Inches): Millimeters {
  return (value * 25.4) as Millimeters;
}

function sfmToMpm(value: SurfaceFeetPerMinute): MetersPerMinute {
  return (value * 0.3048) as MetersPerMinute;
}

function mpmToSfm(value: MetersPerMinute): SurfaceFeetPerMinute {
  return (value / 0.3048) as SurfaceFeetPerMinute;
}

// Conversion preserves type safety
const diameterMm = mm(25.4);
const diameterIn = mmToInches(diameterMm);  // Type: Inches
```

---

## SECTION 2: DISCRIMINATED UNIONS

### Safe State Handling
```typescript
// Machine operation states with type-safe handling
type MachineState = 
  | { status: 'idle' }
  | { status: 'running'; program: string; line: number }
  | { status: 'paused'; program: string; line: number; reason: string }
  | { status: 'error'; code: number; message: string }
  | { status: 'emergency_stop'; timestamp: Date };

function handleMachineState(state: MachineState): string {
  switch (state.status) {
    case 'idle':
      return 'Machine ready';
    
    case 'running':
      // TypeScript knows: state.program and state.line exist
      return `Running ${state.program} at line ${state.line}`;
    
    case 'paused':
      // TypeScript knows: state.reason exists
      return `Paused: ${state.reason}`;
    
    case 'error':
      // TypeScript knows: state.code and state.message exist
      return `Error ${state.code}: ${state.message}`;
    
    case 'emergency_stop':
      return `EMERGENCY STOP at ${state.timestamp.toISOString()}`;
    
    default:
      // Exhaustiveness check - compiler error if case missing
      const _exhaustive: never = state;
      throw new Error(`Unhandled state: ${_exhaustive}`);
  }
}
```

### Result Types (Success/Failure)
```typescript
// Type-safe result handling - no exceptions needed
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

// Helper constructors
function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// Domain-specific error types
type MaterialError = 
  | { code: 'NOT_FOUND'; id: MaterialID }
  | { code: 'INVALID_PARAMETER'; field: string; reason: string }
  | { code: 'INCOMPLETE_DATA'; missing: string[] };

type ForceCalculationResult = Result<ForceResult, MaterialError>;

// Usage
function calculateForce(materialId: MaterialID): ForceCalculationResult {
  const material = getMaterial(materialId);
  
  if (!material) {
    return err({ code: 'NOT_FOUND', id: materialId });
  }
  
  if (!material.kc1_1) {
    return err({ 
      code: 'INCOMPLETE_DATA', 
      missing: ['kc1_1'] 
    });
  }
  
  const force = material.kc1_1 * 0.5;  // Simplified
  return ok({ tangential: force, uncertainty: 0.15 });
}

// Caller must handle both cases
const result = calculateForce(materialId('CS-4140-ANN'));

if (result.success) {
  console.log(`Force: ${result.value.tangential}N`);
} else {
  switch (result.error.code) {
    case 'NOT_FOUND':
      console.error(`Material not found: ${result.error.id}`);
      break;
    case 'INCOMPLETE_DATA':
      console.error(`Missing: ${result.error.missing.join(', ')}`);
      break;
  }
}
```

### Calculation States
```typescript
// Physics calculation pipeline states
type CalculationState<T> =
  | { phase: 'pending' }
  | { phase: 'validating'; input: T }
  | { phase: 'calculating'; input: T; progress: number }
  | { phase: 'complete'; input: T; result: CalculationResult }
  | { phase: 'failed'; input: T; error: CalculationError };

function renderCalculationStatus<T>(state: CalculationState<T>): string {
  switch (state.phase) {
    case 'pending':
      return 'Ready to calculate';
    case 'validating':
      return 'Validating input parameters...';
    case 'calculating':
      return `Calculating... ${state.progress}%`;
    case 'complete':
      return `Complete: ${state.result.summary}`;
    case 'failed':
      return `Failed: ${state.error.message}`;
  }
}
```

---

## SECTION 3: TYPE GUARDS

### Runtime Type Narrowing
```typescript
// Type guard function signature
function isMaterial(obj: unknown): obj is Material {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const candidate = obj as Record<string, unknown>;
  
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.category === 'string' &&
    (candidate.kc1_1 === undefined || typeof candidate.kc1_1 === 'number') &&
    (candidate.mc === undefined || typeof candidate.mc === 'number')
  );
}

// Usage with unknown data
function processMaterialData(data: unknown): Material {
  if (!isMaterial(data)) {
    throw new ValidationError('Invalid material data structure');
  }
  
  // TypeScript now knows data is Material
  return data;
}
```

### Discriminated Union Guards
```typescript
// Guard for specific union members
function isRunningState(state: MachineState): state is Extract<MachineState, { status: 'running' }> {
  return state.status === 'running';
}

function isErrorState(state: MachineState): state is Extract<MachineState, { status: 'error' }> {
  return state.status === 'error';
}

// Usage
function logMachineState(state: MachineState): void {
  if (isRunningState(state)) {
    console.log(`Running program: ${state.program}`);  // TypeScript knows program exists
  }
  
  if (isErrorState(state)) {
    console.error(`Error ${state.code}: ${state.message}`);  // TypeScript knows code/message exist
  }
}
```

### Assertion Functions
```typescript
// Assert function - throws if condition false, narrows type if true
function assertIsMaterial(obj: unknown): asserts obj is Material {
  if (!isMaterial(obj)) {
    throw new TypeError('Expected Material object');
  }
}

function assertNotNull<T>(value: T | null | undefined, name: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`${name} is required but was ${value}`);
  }
}

// Usage
function processData(data: unknown): void {
  assertIsMaterial(data);
  // data is now Material type
  console.log(data.name);
}

function calculate(material: Material | null): number {
  assertNotNull(material, 'material');
  // material is now Material (not null)
  return material.kc1_1 * 0.5;
}
```

### Array Type Guards
```typescript
// Guard for arrays of specific types
function isMaterialArray(arr: unknown): arr is Material[] {
  return Array.isArray(arr) && arr.every(isMaterial);
}

function isNonEmptyArray<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0;
}

// Usage
function processFirstMaterial(materials: Material[]): Material {
  if (!isNonEmptyArray(materials)) {
    throw new Error('At least one material required');
  }
  
  // TypeScript knows materials[0] exists
  return materials[0];
}
```

---

## SECTION 4: STRICT NULL HANDLING

### Configuration
```json
// tsconfig.json - REQUIRED settings
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Optional Chaining & Nullish Coalescing
```typescript
// Safe property access
interface Machine {
  id: MachineID;
  spindle?: {
    maxRpm: number;
    minRpm?: number;
  };
  coolant?: {
    types: string[];
    pressure?: number;
  };
}

function getSpindleRange(machine: Machine): string {
  // Optional chaining
  const max = machine.spindle?.maxRpm ?? 0;
  const min = machine.spindle?.minRpm ?? 0;
  
  return `${min}-${max} RPM`;
}

// Nullish coalescing vs OR
const defaultPressure = 0;  // Falsy but valid value!

// ❌ Wrong: || treats 0 as falsy
const pressure1 = machine.coolant?.pressure || 100;  // Returns 100 even if pressure is 0

// ✅ Correct: ?? only replaces null/undefined
const pressure2 = machine.coolant?.pressure ?? 100;  // Returns 0 if pressure is 0
```

### Non-Null Assertion (Use Sparingly!)
```typescript
// Non-null assertion operator: !
// Use ONLY when you've validated elsewhere

class MaterialCache {
  private materials: Map<MaterialID, Material> = new Map();
  
  has(id: MaterialID): boolean {
    return this.materials.has(id);
  }
  
  get(id: MaterialID): Material {
    if (!this.has(id)) {
      throw new Error(`Material ${id} not in cache`);
    }
    
    // Safe to use ! here because we just checked
    return this.materials.get(id)!;
  }
  
  // Better: return type reflects possible absence
  getOrNull(id: MaterialID): Material | null {
    return this.materials.get(id) ?? null;
  }
}
```

### Required vs Optional Properties
```typescript
// Make intent clear with types
interface MaterialInput {
  // Required - no ? modifier
  id: string;
  name: string;
  category: ISO513Category;
  
  // Optional - has ? modifier
  kc1_1?: number;
  mc?: number;
  density?: number;
}

interface MaterialValidated {
  // All required after validation
  id: MaterialID;
  name: string;
  category: ISO513Category;
  kc1_1: number;  // Required for calculations
  mc: number;     // Required for calculations
  density: number;
}

// Utility type: make specific fields required
type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

type MaterialWithKienzle = WithRequired<MaterialInput, 'kc1_1' | 'mc'>;
```

---

## SECTION 5: READONLY & IMMUTABILITY

### Immutable Data Structures
```typescript
// Readonly modifier prevents mutations
interface ImmutableMaterial {
  readonly id: MaterialID;
  readonly name: string;
  readonly kc1_1: number;
  readonly mc: number;
  readonly properties: Readonly<MaterialProperties>;
}

const steel: ImmutableMaterial = {
  id: materialId('CS-4140-ANN'),
  name: '4140 Annealed',
  kc1_1: 1800,
  mc: 0.25,
  properties: { density: 7850, hardness: 200 }
};

// steel.kc1_1 = 2000;  // ❌ Compile error!
// steel.properties.density = 8000;  // ❌ Compile error!
```

### Deep Readonly
```typescript
// Recursive readonly for nested objects
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

interface NestedConfig {
  physics: {
    models: {
      kienzle: { enabled: boolean; version: number };
      merchant: { enabled: boolean };
    };
  };
}

const config: DeepReadonly<NestedConfig> = {
  physics: {
    models: {
      kienzle: { enabled: true, version: 2 },
      merchant: { enabled: false }
    }
  }
};

// config.physics.models.kienzle.version = 3;  // ❌ Compile error!
```

### Readonly Arrays
```typescript
// Readonly array types
function processToolpath(moves: readonly ToolpathMove[]): void {
  // moves.push(newMove);  // ❌ Compile error!
  // moves[0] = newMove;   // ❌ Compile error!
  
  // Reading is fine
  for (const move of moves) {
    console.log(move.x, move.y, move.z);
  }
}

// ReadonlyArray utility type
type ImmutableToolpath = ReadonlyArray<ToolpathMove>;

// Tuple with readonly
type Coordinate = readonly [number, number, number];
const point: Coordinate = [10, 20, 30];
// point[0] = 15;  // ❌ Compile error!
```

---

## SECTION 6: GENERICS

### Type-Safe Repositories
```typescript
// Generic repository interface
interface IRepository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  delete(id: ID): Promise<void>;
}

// Concrete implementations maintain type safety
class MaterialRepository implements IRepository<Material, MaterialID> {
  async findById(id: MaterialID): Promise<Material | null> {
    // Implementation
  }
  
  async findAll(): Promise<Material[]> {
    // Implementation
  }
  
  async save(entity: Material): Promise<void> {
    // Implementation
  }
  
  async delete(id: MaterialID): Promise<void> {
    // Implementation
  }
}

class MachineRepository implements IRepository<Machine, MachineID> {
  // Type-safe for Machine/MachineID
}
```

### Generic Constraints
```typescript
// Constrain generic to specific shape
interface HasId {
  id: string;
}

function findInArray<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// Works with any type that has id property
const material = findInArray(materials, '4140');  // Type: Material | undefined
const machine = findInArray(machines, 'haas');    // Type: Machine | undefined
```

### Generic Factories
```typescript
// Factory that produces typed instances
interface IFactory<T> {
  create(config: Partial<T>): T;
}

class MaterialFactory implements IFactory<Material> {
  private defaults: Material;
  
  constructor(defaults: Material) {
    this.defaults = defaults;
  }
  
  create(config: Partial<Material>): Material {
    return { ...this.defaults, ...config };
  }
}

// Usage
const steelFactory = new MaterialFactory(steelDefaults);
const custom = steelFactory.create({ kc1_1: 2000 });  // Type: Material
```

### Mapped Types
```typescript
// Create new types from existing ones
type Optional<T> = {
  [P in keyof T]?: T[P];
};

type Required<T> = {
  [P in keyof T]-?: T[P];  // -? removes optional
};

type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

// Make specific properties optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Material with optional Kienzle params
type MaterialDraft = PartialBy<Material, 'kc1_1' | 'mc'>;
```

---

## SECTION 7: TEMPLATE LITERAL TYPES

### String Format Validation
```typescript
// Material ID format: XX-XXXX-XXX
type MaterialIDPattern = `${Uppercase<string>}-${string}-${string}`;

// ISO category codes
type ISO513Code = 'P' | 'M' | 'K' | 'N' | 'S' | 'H';
type MaterialCategory = `ISO-${ISO513Code}`;

// G-code commands
type GCodeLetter = 'G' | 'M' | 'S' | 'F' | 'T';
type GCodeNumber = `${number}`;
type GCodeCommand = `${GCodeLetter}${GCodeNumber}`;

// Machine axis
type Axis = 'X' | 'Y' | 'Z' | 'A' | 'B' | 'C';
type AxisPosition = `${Axis}${number}`;

// Validate at compile time
const cmd1: GCodeCommand = 'G01';  // ✅ OK
const cmd2: GCodeCommand = 'M03';  // ✅ OK
// const cmd3: GCodeCommand = 'Q01';  // ❌ Compile error!
```

### Event Names
```typescript
// Type-safe event names
type EntityType = 'material' | 'machine' | 'tool';
type EventAction = 'created' | 'updated' | 'deleted' | 'validated';
type EventName = `${EntityType}:${EventAction}`;

interface EventMap {
  'material:created': { material: Material };
  'material:updated': { material: Material; changes: string[] };
  'material:deleted': { id: MaterialID };
  'material:validated': { material: Material; result: ValidationResult };
  'machine:created': { machine: Machine };
  // ...
}

class TypedEventEmitter {
  on<E extends EventName>(event: E, handler: (data: EventMap[E]) => void): void {
    // Implementation
  }
  
  emit<E extends EventName>(event: E, data: EventMap[E]): void {
    // Implementation
  }
}

// Usage - fully typed
const emitter = new TypedEventEmitter();

emitter.on('material:created', (data) => {
  // data is typed as { material: Material }
  console.log(data.material.name);
});

emitter.emit('material:created', { material: steel });  // ✅ OK
// emitter.emit('material:created', { machine: haas });  // ❌ Compile error!
```

---

## SECTION 8: CONFIGURATION & CONST ASSERTIONS

### Const Assertions
```typescript
// Without const assertion - type is widened
const speeds1 = [100, 200, 300];  // Type: number[]

// With const assertion - type is literal
const speeds2 = [100, 200, 300] as const;  // Type: readonly [100, 200, 300]

// Object const assertion
const config = {
  version: '1.0',
  features: {
    physics: true,
    ai: false
  }
} as const;
// Type: { readonly version: "1.0"; readonly features: { readonly physics: true; ... } }
```

### Enum Alternatives
```typescript
// Prefer const objects over enums for better tree-shaking
const MachineType = {
  MILL_3AXIS: 'MILL_3AXIS',
  MILL_4AXIS: 'MILL_4AXIS',
  MILL_5AXIS: 'MILL_5AXIS',
  LATHE: 'LATHE',
  TURN_MILL: 'TURN_MILL'
} as const;

type MachineType = typeof MachineType[keyof typeof MachineType];

// Usage
function getMachineCapabilities(type: MachineType): string[] {
  switch (type) {
    case MachineType.MILL_3AXIS:
      return ['milling', 'drilling', 'tapping'];
    case MachineType.MILL_5AXIS:
      return ['milling', 'drilling', 'tapping', 'contouring', 'undercuts'];
    // ...
  }
}
```

### Configuration Types
```typescript
// Type-safe configuration
const PRISMConfig = {
  physics: {
    defaultModel: 'kienzle',
    safetyFactor: 1.2,
    maxIterations: 100
  },
  database: {
    materialsPath: './data/materials.json',
    cacheEnabled: true,
    cacheTTL: 3600
  },
  ui: {
    theme: 'dark',
    language: 'en'
  }
} as const;

type Config = typeof PRISMConfig;
type PhysicsConfig = Config['physics'];

// Access with full type safety
function getDefaultModel(): typeof PRISMConfig.physics.defaultModel {
  return PRISMConfig.physics.defaultModel;  // Type: "kienzle"
}
```

---

## SECTION 9: RUNTIME VALIDATION

### Zod Integration
```typescript
import { z } from 'zod';

// Schema definition
const MaterialSchema = z.object({
  id: z.string().regex(/^[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+$/),
  name: z.string().min(1).max(100),
  category: z.enum(['P', 'M', 'K', 'N', 'S', 'H']),
  kc1_1: z.number().positive().optional(),
  mc: z.number().min(0).max(1).optional(),
  density: z.number().positive().optional(),
  hardness: z.number().min(0).max(70).optional()  // HRC scale
});

// Infer TypeScript type from schema
type Material = z.infer<typeof MaterialSchema>;

// Validation function
function validateMaterial(data: unknown): Material {
  return MaterialSchema.parse(data);  // Throws on invalid
}

function safeParseMaterial(data: unknown): Result<Material> {
  const result = MaterialSchema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(new ValidationError(result.error.message));
}
```

### Custom Validators
```typescript
// Combine Zod with business rules
const MaterialWithPhysicsSchema = MaterialSchema.extend({
  kc1_1: z.number().positive(),
  mc: z.number().min(0).max(1)
}).refine(
  (mat) => mat.kc1_1 > 500 && mat.kc1_1 < 5000,
  { message: 'kc1.1 must be between 500 and 5000 N/mm²' }
).refine(
  (mat) => mat.mc > 0.1 && mat.mc < 0.5,
  { message: 'mc typically ranges from 0.1 to 0.5' }
);
```

---

## SECTION 10: ANTI-PATTERNS

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `any` everywhere | Defeats type safety | Use `unknown` + type guards |
| Type assertions abuse | Bypasses checking | Validate at runtime |
| Missing null checks | Runtime crashes | Enable `strictNullChecks` |
| Implicit any | Hidden type holes | Enable `noImplicitAny` |
| Ignoring errors | `// @ts-ignore` | Fix the actual issue |
| Widening types | Loses specificity | Use `as const` |
| Mutable shared state | Race conditions | Use `Readonly` |

---

## SECTION 11: CHECKLIST

```
□ strictNullChecks enabled
□ noImplicitAny enabled
□ noUncheckedIndexedAccess enabled
□ Branded types for units (mm, inches, rpm, etc.)
□ Discriminated unions for states
□ Type guards for runtime checks
□ Result types instead of exceptions
□ Readonly for immutable data
□ Generics for reusable abstractions
□ Runtime validation at boundaries
□ No @ts-ignore without justification
□ No any without explicit reason
□ Template literals for string formats
□ Const assertions for literal types
□ Zod schemas for API boundaries
```

---

**Type safety catches bugs at compile time. In manufacturing, runtime bugs can cause injury.**

**Version:** 1.0 | **Date:** 2026-01-29 | **Level:** 3 (Domain)
