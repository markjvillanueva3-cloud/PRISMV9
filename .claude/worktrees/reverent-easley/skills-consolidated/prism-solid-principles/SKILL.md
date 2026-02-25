---
name: prism-solid-principles
version: "1.0"
level: 3
category: domain
description: |
  SOLID object-oriented design principles applied to PRISM Manufacturing Intelligence.
  5 principles: Single Responsibility, Open/Closed, Liskov Substitution, Interface
  Segregation, Dependency Inversion. All with manufacturing-specific examples.
  Use when designing modules, refactoring code, or reviewing architecture.
  Key principle: Good design prevents bugs that could affect machine operations.
dependencies:
  - prism-code-master
  - prism-life-safety-mindset
consumers:
  - prism-design-patterns
  - ALL code review tasks
safety_critical: true
---

# PRISM SOLID PRINCIPLES
## Object-Oriented Design for Manufacturing Intelligence
### Version 1.0 | Level 3 Domain Skill

---

## QUICK REFERENCE

| Principle | Mnemonic | Rule | PRISM Example |
|-----------|----------|------|---------------|
| **S**ingle Responsibility | One job | One class = one reason to change | MaterialValidator ≠ MaterialEnhancer |
| **O**pen/Closed | Extend, don't modify | Open for extension, closed for modification | Add force models via plugins |
| **L**iskov Substitution | Subtypes work | Derived classes substitutable | All IMaterial implementations consistent |
| **I**nterface Segregation | Small interfaces | Many specific > one general | IMillable, ITurnable, IDrillable |
| **D**ependency Inversion | Depend on abstractions | High-level shouldn't depend on low-level | PhysicsEngine → IMaterialDatabase |

### Safety Consideration
⚠️ **LIFE-SAFETY**: Poor design leads to bugs that affect manufacturing calculations.
- Tight coupling can cause cascading failures in physics engines
- God modules hide critical logic, making review difficult
- Missing abstractions prevent proper testing of safety-critical code

---

## SECTION 1: SINGLE RESPONSIBILITY PRINCIPLE (SRP)

### Definition
> **A class should have only one reason to change.**

Every module, class, or function should have responsibility over a single part of the functionality.

### Why It Matters in Manufacturing
- **Auditability**: Safety-critical code must be reviewable
- **Testing**: Single-purpose modules are testable in isolation
- **Maintenance**: Changes to validation shouldn't break enhancement
- **Reliability**: Focused modules have fewer failure modes

### PRISM Example: Material Processing

```typescript
// ❌ VIOLATION: God class with multiple responsibilities
class MaterialProcessor {
  // Responsibility 1: Validation
  validateMaterial(material: Material): ValidationResult { /* ... */ }
  
  // Responsibility 2: Enhancement
  enhanceMaterial(material: Material): Material { /* ... */ }
  
  // Responsibility 3: Persistence
  saveMaterial(material: Material): void { /* ... */ }
  
  // Responsibility 4: Calculation
  calculateCuttingForce(material: Material, params: CutParams): Force { /* ... */ }
  
  // Responsibility 5: Export
  exportToJSON(material: Material): string { /* ... */ }
}
// 5 different stakeholders can request changes!
```

```typescript
// ✅ CORRECT: Separated responsibilities
class MaterialValidator {
  validate(material: Material): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!material.kc1_1 || material.kc1_1 <= 0) {
      errors.push({ field: 'kc1_1', message: 'Kienzle coefficient required' });
    }
    
    if (!material.density || material.density <= 0) {
      errors.push({ field: 'density', message: 'Density required for force calculations' });
    }
    
    return { valid: errors.length === 0, errors };
  }
}

class MaterialEnhancer {
  constructor(
    private readonly estimator: PropertyEstimator,
    private readonly sources: DataSourceHierarchy
  ) {}
  
  enhance(material: Material): Material {
    const enhanced = { ...material };
    
    if (!enhanced.mc) {
      enhanced.mc = this.estimator.estimateMc(material);
    }
    
    return enhanced;
  }
}

class MaterialRepository {
  constructor(private readonly storage: IStorage) {}
  
  async save(material: Material): Promise<void> {
    await this.storage.write(`materials/${material.id}`, material);
  }
  
  async load(id: MaterialID): Promise<Material | null> {
    return this.storage.read(`materials/${id}`);
  }
}

class CuttingForceCalculator {
  calculate(material: Material, params: CutParams): Force {
    const { kc1_1, mc } = material;
    const { depth, chipThickness } = params;
    
    return kc1_1 * depth * Math.pow(chipThickness, 1 - mc);
  }
}
```

### Identifying SRP Violations

| Symptom | Indicates |
|---------|-----------|
| Class > 300 lines | Likely multiple responsibilities |
| > 5 public methods | Too many concerns |
| Method name has "And" | Two responsibilities |
| Constructor > 5 dependencies | Class does too much |
| Frequent changes from different reasons | Multiple stakeholders |

### SRP Checklist

```
□ Can you describe the class purpose in one sentence without "and"?
□ Does the class have only one reason to change?
□ Would different stakeholders request changes to different methods?
□ Can you test all functionality with a single test fixture?
□ Is the class < 300 lines?
```

---

## SECTION 2: OPEN/CLOSED PRINCIPLE (OCP)

### Definition
> **Software entities should be open for extension, but closed for modification.**

Add new functionality without changing existing code through abstraction, inheritance, and composition.

### Why It Matters in Manufacturing
- **Stability**: Proven physics models remain unchanged
- **Extensibility**: New materials/machines don't break existing code
- **Safety**: Validated code isn't modified for new features
- **Testing**: New features don't require re-testing existing code

### PRISM Example: Cutting Force Models

```typescript
// ❌ VIOLATION: Must modify class to add new model
class CuttingForceEngine {
  calculate(model: string, material: Material, params: CutParams): Force {
    switch (model) {
      case 'kienzle':
        return this.kienzle(material, params);
      case 'merchant':
        return this.merchant(material, params);
      case 'oxley':
        return this.oxley(material, params);
      // Adding new model requires modifying this class!
      default:
        throw new Error(`Unknown model: ${model}`);
    }
  }
}
```

```typescript
// ✅ CORRECT: Open for extension via interface
interface ICuttingForceModel {
  readonly name: string;
  readonly safetyFactor: number;
  
  calculate(material: Material, params: CutParams): ForceResult;
  validate(material: Material): ValidationResult;
}

class KienzleModel implements ICuttingForceModel {
  readonly name = 'kienzle';
  readonly safetyFactor = 1.0;
  
  calculate(material: Material, params: CutParams): ForceResult {
    const { kc1_1, mc } = material;
    const { depth, chipThickness, width } = params;
    
    const specificForce = kc1_1 * Math.pow(chipThickness, -mc);
    const force = specificForce * depth * width;
    
    return {
      tangential: force,
      feed: force * 0.4,
      radial: force * 0.25,
      uncertainty: 0.15
    };
  }
  
  validate(material: Material): ValidationResult {
    if (!material.kc1_1) return { valid: false, error: 'kc1.1 required' };
    if (!material.mc) return { valid: false, error: 'mc required' };
    return { valid: true };
  }
}

// Engine is CLOSED for modification
class CuttingForceEngine {
  private models: Map<string, ICuttingForceModel> = new Map();
  
  // OPEN for extension via registration
  registerModel(model: ICuttingForceModel): void {
    this.models.set(model.name, model);
  }
  
  calculate(modelName: string, material: Material, params: CutParams): ForceResult {
    const model = this.models.get(modelName);
    if (!model) throw new ModelNotFoundError(modelName);
    
    const validation = model.validate(material);
    if (!validation.valid) throw new ValidationError(validation.error);
    
    return model.calculate(material, params);
  }
}

// Adding new model - NO modification to engine!
class VoceModel implements ICuttingForceModel {
  readonly name = 'voce';
  readonly safetyFactor = 1.05;
  
  calculate(material: Material, params: CutParams): ForceResult {
    // New implementation
  }
}

// Usage
const engine = new CuttingForceEngine();
engine.registerModel(new KienzleModel());
engine.registerModel(new VoceModel());  // No engine changes!
```

### OCP Patterns

| Pattern | Use When |
|---------|----------|
| Strategy | Multiple algorithms for same task |
| Plugin Architecture | Features added at runtime |
| Decorator | Adding behavior without modification |
| Template Method | Varying steps in algorithm |

### OCP Checklist

```
□ Can new variants be added without modifying existing code?
□ Are extension points clearly defined (interfaces)?
□ Is the switch statement smell avoided?
□ Are new features implemented via composition/inheritance?
□ Has existing validated code remained unchanged?
```

---

## SECTION 3: LISKOV SUBSTITUTION PRINCIPLE (LSP)

### Definition
> **Subtypes must be substitutable for their base types.**

If S is a subtype of T, objects of type T can be replaced with objects of type S without altering program correctness.

### Why It Matters in Manufacturing
- **Reliability**: All materials behave consistently in calculations
- **Polymorphism**: Algorithms work with any valid subtype
- **Safety**: No surprising behavior from specific implementations
- **Testing**: Base type tests validate all subtypes

### PRISM Example: Material Hierarchy

```typescript
// ❌ VIOLATION: Titanium breaks expectations
class Material {
  calculateCuttingSpeed(hardness: number): number {
    return 1000 / Math.pow(hardness, 0.3);
  }
}

class Titanium extends Material {
  calculateCuttingSpeed(hardness: number): number {
    // VIOLATION: Returns completely different behavior!
    return 50;  // Fixed value regardless of hardness
  }
}

// This code breaks with Titanium
function processAllMaterials(materials: Material[]) {
  for (const mat of materials) {
    const speed = mat.calculateCuttingSpeed(mat.hardness);
    // Assumption: speed varies with hardness - BROKEN for Titanium!
    adjustMachineSpeed(speed);
  }
}
```

```typescript
// ✅ CORRECT: Consistent behavior via interface contract
interface IMaterial {
  readonly id: MaterialID;
  readonly category: ISO513Category;
  readonly hardness: HardnessValue;
  
  // Contract: Returns speed in SFM, varies with hardness
  // Must return value in range [10, 2000]
  calculateCuttingSpeed(hardness: number): number;
  
  // Contract: Returns true if compatible with given tool
  isCompatibleWith(tool: ToolMaterial): boolean;
}

abstract class BaseMaterial implements IMaterial {
  abstract readonly id: MaterialID;
  abstract readonly category: ISO513Category;
  abstract readonly hardness: HardnessValue;
  
  calculateCuttingSpeed(hardness: number): number {
    const baseSpeed = this.getBaseSpeed();
    const hardnessFactor = Math.pow(this.referenceHardness / hardness, this.hardnessExponent);
    return Math.max(10, Math.min(2000, baseSpeed * hardnessFactor));
  }
  
  protected abstract getBaseSpeed(): number;
  protected abstract get referenceHardness(): number;
  protected abstract get hardnessExponent(): number;
  
  isCompatibleWith(tool: ToolMaterial): boolean {
    return this.compatibleTools.includes(tool);
  }
  
  protected abstract get compatibleTools(): ToolMaterial[];
}

class Steel extends BaseMaterial {
  readonly category = ISO513Category.P;
  
  protected getBaseSpeed(): number { return 350; }
  protected get referenceHardness(): number { return 200; }
  protected get hardnessExponent(): number { return 0.3; }
  protected get compatibleTools(): ToolMaterial[] {
    return ['HSS', 'Carbide', 'Ceramic', 'CBN'];
  }
}

class Titanium extends BaseMaterial {
  readonly category = ISO513Category.S;
  
  // Still follows the contract, but with different parameters
  protected getBaseSpeed(): number { return 80; }
  protected get referenceHardness(): number { return 350; }
  protected get hardnessExponent(): number { return 0.4; }
  protected get compatibleTools(): ToolMaterial[] {
    return ['Carbide'];
  }
}

// Now works correctly with ALL materials
function processAllMaterials(materials: IMaterial[]) {
  for (const mat of materials) {
    const speed = mat.calculateCuttingSpeed(mat.hardness);
    // Contract guarantees: 10 <= speed <= 2000, varies with hardness
    adjustMachineSpeed(speed);
  }
}
```

### LSP Contract Rules

| Rule | Description |
|------|-------------|
| **Preconditions** | Subtype cannot strengthen preconditions |
| **Postconditions** | Subtype cannot weaken postconditions |
| **Invariants** | Subtype must preserve base type invariants |
| **History** | Subtype cannot modify base type state history |

### LSP Checklist

```
□ Does subtype accept all inputs the base type accepts?
□ Does subtype guarantee all outputs the base type guarantees?
□ Are all base type invariants preserved?
□ Can subtype replace base type in ALL contexts?
□ Are there no special cases that break substitutability?
```

---

## SECTION 4: INTERFACE SEGREGATION PRINCIPLE (ISP)

### Definition
> **Clients should not be forced to depend on interfaces they don't use.**

Many specific interfaces are better than one general-purpose interface.

### Why It Matters in Manufacturing
- **Decoupling**: Milling code doesn't need turning methods
- **Testing**: Smaller interfaces are easier to mock
- **Evolution**: Change one operation without affecting others
- **Clarity**: Clear contracts for each operation type

### PRISM Example: Material Operations

```typescript
// ❌ VIOLATION: Fat interface forces unused dependencies
interface IMaterial {
  id: MaterialID;
  name: string;
  tensileStrength: number;
  
  // Milling parameters
  getMillingSpeed(): number;
  getMillingFeed(): number;
  getMillingDepth(): number;
  
  // Turning parameters
  getTurningSpeed(): number;
  getTurningFeed(): number;
  getTurningDepth(): number;
  
  // Drilling parameters
  getDrillingSpeed(): number;
  getDrillingFeed(): number;
  getPeckDepth(): number;
  
  // Grinding parameters
  getGrindingWheelSpeed(): number;
  getGrindingWheelType(): string;
}

// Milling module forced to implement turning, drilling, grinding!
```

```typescript
// ✅ CORRECT: Segregated interfaces
interface IMaterialIdentity {
  readonly id: MaterialID;
  readonly name: string;
  readonly category: ISO513Category;
}

interface IMechanicalProperties {
  readonly tensileStrength: number;
  readonly yieldStrength: number;
  readonly hardness: HardnessValue;
  readonly elasticModulus: number;
}

interface IMillingMaterial {
  getMillingSpeed(toolDiameter: number): number;
  getMillingFeed(toolDiameter: number, teeth: number): number;
  getMillingDepthOfCut(toolDiameter: number): DepthOfCut;
}

interface ITurningMaterial {
  getTurningSpeed(insertType: InsertType): number;
  getTurningFeed(insertNoseRadius: number): number;
  getTurningDepthOfCut(insertSize: number): DepthOfCut;
}

interface IDrillingMaterial {
  getDrillingSpeed(drillDiameter: number, drillType: DrillType): number;
  getDrillingFeed(drillDiameter: number): number;
  getPeckDepth(drillDiameter: number, holeDepth: number): number;
}

// Full material implements all (or some) interfaces
class Material implements 
  IMaterialIdentity, 
  IMechanicalProperties, 
  IMillingMaterial, 
  ITurningMaterial,
  IDrillingMaterial {
  // ... implementations
}

// Milling module depends only on what it needs
class MillingOptimizer {
  constructor(
    private material: IMaterialIdentity & IMillingMaterial & IMechanicalProperties
  ) {}
  
  optimize(tool: MillingTool): MillingParams {
    return {
      speed: this.material.getMillingSpeed(tool.diameter),
      feed: this.material.getMillingFeed(tool.diameter, tool.teeth),
      depth: this.material.getMillingDepthOfCut(tool.diameter)
    };
  }
}

// Turning module has completely separate dependency
class TurningOptimizer {
  constructor(
    private material: IMaterialIdentity & ITurningMaterial & IMechanicalProperties
  ) {}
  
  optimize(insert: TurningInsert): TurningParams {
    return {
      speed: this.material.getTurningSpeed(insert.type),
      feed: this.material.getTurningFeed(insert.noseRadius),
      depth: this.material.getTurningDepthOfCut(insert.size)
    };
  }
}
```

### Interface Size Guidelines

| Size | Methods | Recommendation |
|------|---------|----------------|
| Minimal | 1-3 | Ideal for most cases |
| Small | 4-6 | Acceptable if cohesive |
| Medium | 7-10 | Consider splitting |
| Large | 11+ | Definitely split |

### ISP Checklist

```
□ Does every client use all methods of the interface?
□ Can the interface be split by client usage patterns?
□ Are there methods that are always empty/throw in some implementations?
□ Would changes to one method affect unrelated clients?
□ Is the interface named by role, not implementation?
```

---

## SECTION 5: DEPENDENCY INVERSION PRINCIPLE (DIP)

### Definition
> **High-level modules should not depend on low-level modules. Both should depend on abstractions.**

Abstractions should not depend on details. Details should depend on abstractions.

### Why It Matters in Manufacturing
- **Testing**: Physics engines testable without real databases
- **Flexibility**: Swap JSON storage for SQL without changing engines
- **Isolation**: High-level policy independent of mechanisms
- **Evolution**: Change implementations without affecting business logic

### PRISM Example: Physics Engine Dependencies

```typescript
// ❌ VIOLATION: High-level depends on low-level
class SpeedFeedEngine {
  // Direct dependency on concrete implementations
  private materialDb = new JSONMaterialDatabase('materials.json');
  private machineDb = new SQLMachineDatabase('postgres://...');
  private logger = new FileLogger('/var/log/prism.log');
  
  calculate(materialId: string, machineId: string): SpeedFeedResult {
    const material = this.materialDb.getMaterial(materialId);
    const machine = this.machineDb.getMachine(machineId);
    
    this.logger.log(`Calculating for ${materialId} on ${machineId}`);
    
    return this.computeOptimal(material, machine);
  }
}

// Problems:
// - Cannot test without real files/database
// - Cannot swap storage implementations
// - Logger hardcoded
```

```typescript
// ✅ CORRECT: Depend on abstractions
interface IMaterialRepository {
  getMaterial(id: MaterialID): Promise<Material | null>;
  findByCategory(category: ISO513Category): Promise<Material[]>;
}

interface IMachineRepository {
  getMachine(id: MachineID): Promise<Machine | null>;
  findByCapability(capability: MachiningCapability): Promise<Machine[]>;
}

interface ILogger {
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, error?: Error): void;
}

// High-level module depends on abstractions
class SpeedFeedEngine {
  constructor(
    private readonly materials: IMaterialRepository,
    private readonly machines: IMachineRepository,
    private readonly logger: ILogger
  ) {}
  
  async calculate(materialId: MaterialID, machineId: MachineID): Promise<SpeedFeedResult> {
    const material = await this.materials.getMaterial(materialId);
    if (!material) throw new MaterialNotFoundError(materialId);
    
    const machine = await this.machines.getMachine(machineId);
    if (!machine) throw new MachineNotFoundError(machineId);
    
    this.logger.info('Calculating speed/feed', { materialId, machineId });
    
    return this.computeOptimal(material, machine);
  }
  
  private computeOptimal(material: Material, machine: Machine): SpeedFeedResult {
    // Pure business logic - no infrastructure concerns
    const baseSpeed = material.kc1_1 > 2000 ? 150 : 300;
    const maxSpeed = machine.spindleMaxRPM * Math.PI * 0.025 / 12;
    
    return {
      speed: Math.min(baseSpeed, maxSpeed),
      feed: this.calculateOptimalFeed(material, machine),
      confidence: 0.85
    };
  }
}

// Low-level modules implement abstractions
class JSONMaterialRepository implements IMaterialRepository {
  constructor(private readonly filePath: string) {}
  
  async getMaterial(id: MaterialID): Promise<Material | null> {
    const data = await fs.readFile(this.filePath, 'utf-8');
    const materials = JSON.parse(data);
    return materials[id] ?? null;
  }
}

// Composition root - wire dependencies
function createSpeedFeedEngine(config: Config): SpeedFeedEngine {
  const materials = config.useJson 
    ? new JSONMaterialRepository(config.materialsPath)
    : new PostgresMaterialRepository(config.dbConnection);
    
  const machines = new PostgresMachineRepository(config.dbConnection);
  const logger = new ConsoleLogger();
  
  return new SpeedFeedEngine(materials, machines, logger);
}

// Testing - inject test doubles
describe('SpeedFeedEngine', () => {
  it('calculates optimal speed for soft steel', async () => {
    const mockMaterials: IMaterialRepository = {
      getMaterial: async () => ({ kc1_1: 1800, mc: 0.25 }),
      findByCategory: async () => []
    };
    
    const mockMachines: IMachineRepository = {
      getMachine: async () => ({ spindleMaxRPM: 12000 }),
      findByCapability: async () => []
    };
    
    const mockLogger: ILogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    const engine = new SpeedFeedEngine(mockMaterials, mockMachines, mockLogger);
    const result = await engine.calculate('steel-1018', 'haas-vf2');
    
    expect(result.speed).toBeGreaterThan(200);
  });
});
```

### Dependency Injection Patterns

| Pattern | Use When |
|---------|----------|
| Constructor Injection | Required dependencies |
| Method Injection | Per-call dependencies |
| Property Injection | Optional dependencies |
| Container | Complex object graphs |

### DIP Checklist

```
□ Do high-level modules depend only on interfaces?
□ Are interfaces defined at the high-level module layer?
□ Can implementations be swapped without changing business logic?
□ Is the composition root separate from business logic?
□ Are all dependencies explicit (no hidden new operators)?
```

---

## SECTION 6: MANUFACTURING APPLICATIONS

### Material System Architecture
```typescript
// Layer 1: Domain (no dependencies on infrastructure)
interface IMaterial { /* ... */ }
interface IPhysicsModel { /* ... */ }
class CuttingForceCalculator { /* pure logic */ }

// Layer 2: Application (orchestrates domain)
class MaterialService {
  constructor(
    private materials: IMaterialRepository,
    private validator: IMaterialValidator,
    private calculator: CuttingForceCalculator
  ) {}
}

// Layer 3: Infrastructure (implements interfaces)
class JSONMaterialRepository implements IMaterialRepository { /* ... */ }
class S3MaterialRepository implements IMaterialRepository { /* ... */ }
```

### Engine Isolation Pattern
```typescript
// Each engine is isolated with clear interfaces
interface IForceEngine {
  calculate(material: Material, params: CutParams): ForceResult;
}

interface IThermalEngine {
  calculate(material: Material, params: CutParams, force: Force): ThermalResult;
}

interface IToolLifeEngine {
  estimate(material: Material, speed: number, feed: number): ToolLifeResult;
}

// Engines compose without tight coupling
class MachiningAnalyzer {
  constructor(
    private force: IForceEngine,
    private thermal: IThermalEngine,
    private toolLife: IToolLifeEngine
  ) {}
  
  analyze(material: Material, params: CutParams): AnalysisResult {
    const forceResult = this.force.calculate(material, params);
    const thermalResult = this.thermal.calculate(material, params, forceResult.tangential);
    const toolLifeResult = this.toolLife.estimate(material, params.speed, params.feed);
    
    return this.synthesize(forceResult, thermalResult, toolLifeResult);
  }
}
```

### Database Abstraction Pattern
```typescript
// Repository pattern for all databases
interface IRepository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  delete(id: ID): Promise<void>;
}

interface IMaterialRepository extends IRepository<Material, MaterialID> {
  findByCategory(category: ISO513Category): Promise<Material[]>;
  findByHardnessRange(min: number, max: number): Promise<Material[]>;
}

interface IMachineRepository extends IRepository<Machine, MachineID> {
  findByManufacturer(manufacturer: string): Promise<Machine[]>;
  findByCapability(capability: MachiningCapability): Promise<Machine[]>;
}
```

---

## SECTION 7: ANTI-PATTERNS

### 1. God Class (SRP Violation)
```typescript
// ❌ Does everything
class PRISMEngine {
  validateMaterial() {}
  calculateForce() {}
  generateGCode() {}
  saveToDatabase() {}
  sendEmail() {}
  renderUI() {}
}
```

### 2. Rigid Hierarchy (OCP Violation)
```typescript
// ❌ Must modify base to add new behavior
class BaseCalculator {
  calculate(type: string) {
    if (type === 'a') return this.calcA();
    if (type === 'b') return this.calcB();
    // Must add new if for each type
  }
}
```

### 3. Broken Substitutability (LSP Violation)
```typescript
// ❌ Subtype throws where base doesn't
class Rectangle {
  setWidth(w: number) { this.width = w; }
  setHeight(h: number) { this.height = h; }
}

class Square extends Rectangle {
  setWidth(w: number) {
    this.width = w;
    this.height = w;  // Breaks expectations!
  }
}
```

### 4. Fat Interface (ISP Violation)
```typescript
// ❌ Forces implementation of unused methods
interface IEverything {
  mill(); turn(); drill(); grind(); edm(); 
  waterjet(); laser(); plasma(); // 20 more...
}
```

### 5. Concrete Dependency (DIP Violation)
```typescript
// ❌ High-level creates low-level
class PhysicsEngine {
  private db = new MySQLDatabase();  // Direct dependency
}
```

### 6. Leaky Abstraction
```typescript
// ❌ Implementation details leak through interface
interface IMaterialRepository {
  findBySQL(query: string): Material[];  // Leaks SQL!
}
```

### 7. Anemic Domain Model
```typescript
// ❌ Logic outside domain objects
class Material {
  kc1_1: number;
  mc: number;
  // No behavior!
}

class MaterialService {
  calculateForce(mat: Material) {}  // Should be on Material
}
```

### 8. Circular Dependencies
```typescript
// ❌ A depends on B depends on A
class MaterialValidator {
  constructor(private enhancer: MaterialEnhancer) {}
}
class MaterialEnhancer {
  constructor(private validator: MaterialValidator) {}
}
```

### 9. Service Locator Anti-Pattern
```typescript
// ❌ Hidden dependencies
class Engine {
  calculate() {
    const db = ServiceLocator.get('database');  // Hidden!
  }
}
```

### 10. New Is Glue
```typescript
// ❌ new creates tight coupling
class Service {
  doWork() {
    const helper = new ConcreteHelper();  // Can't substitute
  }
}
```

---

## SECTION 8: INTEGRATION WITH PRISM

### Links to Related Skills
- **prism-code-master**: General coding patterns
- **prism-design-patterns**: GoF pattern implementations
- **prism-life-safety-mindset**: Why design matters for safety
- **prism-api-contracts**: Interface definitions

### Using SOLID in PRISM Development

| Phase | SOLID Focus |
|-------|-------------|
| Design | Define interfaces first (ISP, DIP) |
| Implementation | Single responsibility modules (SRP) |
| Extension | Plugin architecture (OCP) |
| Testing | Substitutable mocks (LSP, DIP) |
| Review | Check all 5 principles |

---

## SECTION 9: MASTER CHECKLIST

### Single Responsibility (SRP)
```
□ Each class has one reason to change
□ Class can be described without "and"
□ Methods are cohesive
□ < 300 lines per class
□ < 5 dependencies per constructor
```

### Open/Closed (OCP)
```
□ New features via extension, not modification
□ Extension points defined (interfaces)
□ No switch statements on type
□ Strategy pattern for algorithms
□ Plugin architecture where appropriate
```

### Liskov Substitution (LSP)
```
□ Subtypes honor base contracts
□ No strengthened preconditions
□ No weakened postconditions
□ Invariants preserved
□ Tests pass with any subtype
```

### Interface Segregation (ISP)
```
□ Interfaces are client-specific
□ No unused method dependencies
□ Interfaces have 1-6 methods
□ Role-based naming
□ Composition of small interfaces
```

### Dependency Inversion (DIP)
```
□ High-level depends on abstractions
□ Interfaces at high level
□ Explicit constructor dependencies
□ Composition root separate
□ Testable with mocks
```

---

**Good design prevents bugs. In manufacturing software, bugs can injure or kill.**

**Version:** 1.0 | **Date:** 2026-01-29 | **Level:** 3 (Domain)
