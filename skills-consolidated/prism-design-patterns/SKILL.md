---
name: prism-design-patterns
version: "1.0"
level: 3
category: domain
description: |
  Gang of Four design patterns applied to PRISM Manufacturing Intelligence.
  Creational: Factory, Abstract Factory, Builder, Singleton, Prototype.
  Structural: Adapter, Decorator, Facade, Composite, Proxy.
  Behavioral: Strategy, Observer, Command, State, Chain of Responsibility.
  All with manufacturing-specific implementations and code examples.
  Use when architecting modules, implementing features, or refactoring.
dependencies:
  - prism-solid-principles
  - prism-code-master
consumers:
  - prism-api-contracts
  - ALL architecture tasks
safety_critical: true
---

# PRISM DESIGN PATTERNS
## GoF Patterns for Manufacturing Intelligence
### Version 1.0 | Level 3 Domain Skill

---

## QUICK REFERENCE - Pattern Selection

```
What problem are you solving?
│
├─► Creating objects?
│   ├─► Single type with variants? → Factory Method
│   ├─► Families of related objects? → Abstract Factory
│   ├─► Complex object step by step? → Builder
│   ├─► Single instance needed? → Singleton (use sparingly!)
│   └─► Clone existing object? → Prototype
│
├─► Adapting structures?
│   ├─► Incompatible interface? → Adapter
│   ├─► Add behavior dynamically? → Decorator
│   ├─► Simplify complex subsystem? → Facade
│   ├─► Tree structures? → Composite
│   └─► Control access? → Proxy
│
└─► Managing behavior?
    ├─► Multiple algorithms? → Strategy
    ├─► Notify on changes? → Observer
    ├─► Encapsulate requests? → Command
    ├─► State-dependent behavior? → State
    └─► Chain of handlers? → Chain of Responsibility
```

---

## SECTION 1: CREATIONAL PATTERNS

### 1.1 Factory Method

**Purpose**: Create objects without specifying exact class.

**PRISM Use Case**: Creating materials, machines, tools based on ID/type.

```typescript
// Factory Method for Materials
interface IMaterial {
  readonly id: MaterialID;
  readonly category: ISO513Category;
  calculateCuttingSpeed(toolDiameter: number): number;
}

abstract class MaterialFactory {
  // Factory method - subclasses decide which class to instantiate
  abstract createMaterial(id: MaterialID): IMaterial;
  
  // Common logic using factory method
  async loadAndValidate(id: MaterialID): Promise<IMaterial> {
    const material = this.createMaterial(id);
    await this.validate(material);
    return material;
  }
  
  protected async validate(material: IMaterial): Promise<void> {
    if (!material.id) throw new ValidationError('Material ID required');
  }
}

class SteelFactory extends MaterialFactory {
  createMaterial(id: MaterialID): IMaterial {
    // Create specific steel implementation
    return new CarbonSteel(id);
  }
}

class AluminumFactory extends MaterialFactory {
  createMaterial(id: MaterialID): IMaterial {
    return new AluminumAlloy(id);
  }
}

class TitaniumFactory extends MaterialFactory {
  createMaterial(id: MaterialID): IMaterial {
    return new TitaniumAlloy(id);
  }
}

// Usage
function getMaterialFactory(category: ISO513Category): MaterialFactory {
  switch (category) {
    case ISO513Category.P: return new SteelFactory();
    case ISO513Category.N: return new AluminumFactory();
    case ISO513Category.S: return new TitaniumFactory();
    default: throw new Error(`Unknown category: ${category}`);
  }
}

const factory = getMaterialFactory(ISO513Category.P);
const steel = await factory.loadAndValidate('4140-annealed');
```

### 1.2 Abstract Factory

**Purpose**: Create families of related objects without specifying concrete classes.

**PRISM Use Case**: Creating controller-specific code generation families.

```typescript
// Abstract Factory for CNC Controllers
interface IGCodeGenerator {
  generateRapid(x: number, y: number, z: number): string;
  generateLinear(x: number, y: number, z: number, feed: number): string;
  generateArc(params: ArcParams): string;
}

interface IMCodeGenerator {
  spindleOn(rpm: number, direction: 'CW' | 'CCW'): string;
  spindleOff(): string;
  coolantOn(type: CoolantType): string;
  coolantOff(): string;
}

interface IToolChangeGenerator {
  toolChange(toolNumber: number): string;
  toolLengthComp(offset: number): string;
}

// Abstract Factory
interface IControllerFactory {
  createGCodeGenerator(): IGCodeGenerator;
  createMCodeGenerator(): IMCodeGenerator;
  createToolChangeGenerator(): IToolChangeGenerator;
}

// Fanuc Family
class FanucGCodeGenerator implements IGCodeGenerator {
  generateRapid(x: number, y: number, z: number): string {
    return `G00 X${x.toFixed(4)} Y${y.toFixed(4)} Z${z.toFixed(4)}`;
  }
  
  generateLinear(x: number, y: number, z: number, feed: number): string {
    return `G01 X${x.toFixed(4)} Y${y.toFixed(4)} Z${z.toFixed(4)} F${feed}`;
  }
  
  generateArc(params: ArcParams): string {
    const g = params.direction === 'CW' ? 'G02' : 'G03';
    return `${g} X${params.x} Y${params.y} R${params.radius} F${params.feed}`;
  }
}

class FanucMCodeGenerator implements IMCodeGenerator {
  spindleOn(rpm: number, direction: 'CW' | 'CCW'): string {
    const m = direction === 'CW' ? 'M03' : 'M04';
    return `${m} S${rpm}`;
  }
  
  spindleOff(): string { return 'M05'; }
  coolantOn(type: CoolantType): string { return type === 'flood' ? 'M08' : 'M07'; }
  coolantOff(): string { return 'M09'; }
}

class FanucToolChangeGenerator implements IToolChangeGenerator {
  toolChange(toolNumber: number): string {
    return `T${toolNumber} M06`;
  }
  
  toolLengthComp(offset: number): string {
    return `G43 H${offset}`;
  }
}

class FanucControllerFactory implements IControllerFactory {
  createGCodeGenerator(): IGCodeGenerator { return new FanucGCodeGenerator(); }
  createMCodeGenerator(): IMCodeGenerator { return new FanucMCodeGenerator(); }
  createToolChangeGenerator(): IToolChangeGenerator { return new FanucToolChangeGenerator(); }
}

// Siemens Family
class SiemensGCodeGenerator implements IGCodeGenerator {
  generateRapid(x: number, y: number, z: number): string {
    return `G0 X${x} Y${y} Z${z}`;  // Different format
  }
  
  generateLinear(x: number, y: number, z: number, feed: number): string {
    return `G1 X${x} Y${y} Z${z} F${feed}`;
  }
  
  generateArc(params: ArcParams): string {
    const g = params.direction === 'CW' ? 'G2' : 'G3';
    return `${g} X${params.x} Y${params.y} CR=${params.radius} F${params.feed}`;
  }
}

class SiemensControllerFactory implements IControllerFactory {
  createGCodeGenerator(): IGCodeGenerator { return new SiemensGCodeGenerator(); }
  createMCodeGenerator(): IMCodeGenerator { return new SiemensMCodeGenerator(); }
  createToolChangeGenerator(): IToolChangeGenerator { return new SiemensToolChangeGenerator(); }
}

// Usage - Client code works with any controller family
class PostProcessor {
  constructor(private factory: IControllerFactory) {}
  
  generate(toolpath: Toolpath): string {
    const gcode = this.factory.createGCodeGenerator();
    const mcode = this.factory.createMCodeGenerator();
    const toolChange = this.factory.createToolChangeGenerator();
    
    const lines: string[] = [];
    
    for (const move of toolpath.moves) {
      if (move.type === 'rapid') {
        lines.push(gcode.generateRapid(move.x, move.y, move.z));
      } else if (move.type === 'linear') {
        lines.push(gcode.generateLinear(move.x, move.y, move.z, move.feed));
      }
    }
    
    return lines.join('\n');
  }
}

// Switch families without changing PostProcessor
const fanucPost = new PostProcessor(new FanucControllerFactory());
const siemensPost = new PostProcessor(new SiemensControllerFactory());
```

### 1.3 Builder

**Purpose**: Construct complex objects step by step.

**PRISM Use Case**: Building toolpaths, G-code programs, complex configurations.

```typescript
// Builder for Toolpath Construction
interface IToolpathBuilder {
  setTool(tool: Tool): IToolpathBuilder;
  setMaterial(material: Material): IToolpathBuilder;
  addApproach(position: Position, clearance: number): IToolpathBuilder;
  addCut(from: Position, to: Position, params: CutParams): IToolpathBuilder;
  addRetract(clearance: number): IToolpathBuilder;
  addCoolant(type: CoolantType): IToolpathBuilder;
  build(): Toolpath;
}

class ToolpathBuilder implements IToolpathBuilder {
  private tool?: Tool;
  private material?: Material;
  private moves: ToolpathMove[] = [];
  private coolant: CoolantType = 'none';
  
  setTool(tool: Tool): IToolpathBuilder {
    this.tool = tool;
    return this;
  }
  
  setMaterial(material: Material): IToolpathBuilder {
    this.material = material;
    return this;
  }
  
  addApproach(position: Position, clearance: number): IToolpathBuilder {
    // Rapid to clearance height
    this.moves.push({
      type: 'rapid',
      x: position.x,
      y: position.y,
      z: position.z + clearance
    });
    
    // Feed down to position
    this.moves.push({
      type: 'linear',
      x: position.x,
      y: position.y,
      z: position.z,
      feed: this.calculatePlungeFeed()
    });
    
    return this;
  }
  
  addCut(from: Position, to: Position, params: CutParams): IToolpathBuilder {
    this.moves.push({
      type: 'linear',
      x: to.x,
      y: to.y,
      z: to.z,
      feed: params.feed
    });
    return this;
  }
  
  addRetract(clearance: number): IToolpathBuilder {
    const lastMove = this.moves[this.moves.length - 1];
    this.moves.push({
      type: 'rapid',
      x: lastMove.x,
      y: lastMove.y,
      z: clearance
    });
    return this;
  }
  
  addCoolant(type: CoolantType): IToolpathBuilder {
    this.coolant = type;
    return this;
  }
  
  build(): Toolpath {
    if (!this.tool) throw new Error('Tool required');
    if (!this.material) throw new Error('Material required');
    if (this.moves.length === 0) throw new Error('No moves defined');
    
    return new Toolpath({
      tool: this.tool,
      material: this.material,
      moves: [...this.moves],
      coolant: this.coolant
    });
  }
  
  private calculatePlungeFeed(): number {
    if (!this.tool || !this.material) return 100;
    return this.tool.plungeRate * this.material.feedMultiplier;
  }
}

// Director - knows how to build specific toolpath types
class ToolpathDirector {
  constructor(private builder: IToolpathBuilder) {}
  
  buildDrillingCycle(hole: Hole, tool: DrillTool, material: Material): Toolpath {
    return this.builder
      .setTool(tool)
      .setMaterial(material)
      .addCoolant('flood')
      .addApproach({ x: hole.x, y: hole.y, z: 0 }, 5)
      .addCut(
        { x: hole.x, y: hole.y, z: 0 },
        { x: hole.x, y: hole.y, z: -hole.depth },
        { feed: tool.feedRate }
      )
      .addRetract(5)
      .build();
  }
  
  buildPocketCycle(pocket: Pocket, tool: EndMill, material: Material): Toolpath {
    const builder = this.builder
      .setTool(tool)
      .setMaterial(material)
      .addCoolant('mist');
    
    // Generate pocket spiral pattern
    for (const pass of this.generateSpiral(pocket, tool.stepover)) {
      builder.addApproach(pass.start, 2);
      for (const point of pass.points) {
        builder.addCut(pass.start, point, { feed: tool.feedRate });
      }
      builder.addRetract(2);
    }
    
    return builder.build();
  }
}

// Usage
const builder = new ToolpathBuilder();
const director = new ToolpathDirector(builder);

const drillingToolpath = director.buildDrillingCycle(
  { x: 10, y: 20, depth: 15 },
  new DrillTool({ diameter: 8 }),
  steelMaterial
);
```

### 1.4 Singleton

**Purpose**: Ensure single instance with global access.

**PRISM Use Case**: Configuration manager, database connection pool.

⚠️ **Warning**: Use sparingly. Prefer dependency injection.

```typescript
// Singleton - Configuration Manager
class ConfigurationManager {
  private static instance: ConfigurationManager | null = null;
  private config: PRISMConfig;
  
  private constructor() {
    // Private constructor prevents direct instantiation
    this.config = this.loadConfig();
  }
  
  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }
  
  // For testing - allow resetting
  static resetForTesting(): void {
    ConfigurationManager.instance = null;
  }
  
  get<K extends keyof PRISMConfig>(key: K): PRISMConfig[K] {
    return this.config[key];
  }
  
  private loadConfig(): PRISMConfig {
    // Load from file, environment, etc.
    return {
      safetyMode: 'strict',
      defaultController: 'fanuc',
      logLevel: 'info'
    };
  }
}

// Better Alternative: Dependency Injection
interface IConfiguration {
  get<K extends keyof PRISMConfig>(key: K): PRISMConfig[K];
}

class ConfigurationService implements IConfiguration {
  constructor(private config: PRISMConfig) {}
  
  get<K extends keyof PRISMConfig>(key: K): PRISMConfig[K] {
    return this.config[key];
  }
}

// Inject where needed
class SpeedFeedEngine {
  constructor(private config: IConfiguration) {}
  
  calculate(): SpeedFeedResult {
    const safetyMode = this.config.get('safetyMode');
    // ...
  }
}
```

### 1.5 Prototype

**Purpose**: Clone existing objects instead of creating new ones.

**PRISM Use Case**: Cloning material configurations, tool setups.

```typescript
// Prototype - Cloneable Materials
interface ICloneable<T> {
  clone(): T;
  deepClone(): T;
}

class Material implements ICloneable<Material> {
  constructor(
    public id: MaterialID,
    public name: string,
    public kc1_1: number,
    public mc: number,
    public properties: MaterialProperties
  ) {}
  
  // Shallow clone
  clone(): Material {
    return new Material(
      this.id,
      this.name,
      this.kc1_1,
      this.mc,
      this.properties  // Same reference!
    );
  }
  
  // Deep clone
  deepClone(): Material {
    return new Material(
      this.id,
      this.name,
      this.kc1_1,
      this.mc,
      { ...this.properties }  // New object
    );
  }
}

// Prototype Registry
class MaterialPrototypeRegistry {
  private prototypes: Map<string, Material> = new Map();
  
  register(key: string, material: Material): void {
    this.prototypes.set(key, material);
  }
  
  create(key: string): Material {
    const prototype = this.prototypes.get(key);
    if (!prototype) throw new Error(`Prototype ${key} not found`);
    return prototype.deepClone();
  }
}

// Usage
const registry = new MaterialPrototypeRegistry();
registry.register('4140-template', new Material('4140', '4140 Steel', 1800, 0.25, {}));

const material1 = registry.create('4140-template');
material1.id = '4140-annealed';

const material2 = registry.create('4140-template');
material2.id = '4140-hardened';
material2.kc1_1 = 2400;  // Higher for hardened
```

---

## SECTION 2: STRUCTURAL PATTERNS

### 2.1 Adapter

**Purpose**: Convert interface of a class to one clients expect.

**PRISM Use Case**: Adapting external libraries, legacy code integration.

```typescript
// Adapter - Legacy Material Database
// Old system interface (can't change)
interface LegacyMaterialDB {
  fetchMat(code: string): LegacyMaterialRecord | null;
  listMats(): LegacyMaterialRecord[];
}

interface LegacyMaterialRecord {
  MAT_CODE: string;
  MAT_NAME: string;
  SPEC_CUT_FORCE: number;  // Different name!
  FORCE_EXP: number;        // Different name!
}

// New interface we want
interface IMaterialRepository {
  getMaterial(id: MaterialID): Promise<Material | null>;
  findAll(): Promise<Material[]>;
}

// Adapter
class LegacyMaterialAdapter implements IMaterialRepository {
  constructor(private legacyDb: LegacyMaterialDB) {}
  
  async getMaterial(id: MaterialID): Promise<Material | null> {
    const legacy = this.legacyDb.fetchMat(id);
    if (!legacy) return null;
    return this.convert(legacy);
  }
  
  async findAll(): Promise<Material[]> {
    const legacyRecords = this.legacyDb.listMats();
    return legacyRecords.map(r => this.convert(r));
  }
  
  private convert(legacy: LegacyMaterialRecord): Material {
    return new Material({
      id: legacy.MAT_CODE,
      name: legacy.MAT_NAME,
      kc1_1: legacy.SPEC_CUT_FORCE,  // Map to new name
      mc: legacy.FORCE_EXP           // Map to new name
    });
  }
}

// Usage - client uses modern interface
const adapter = new LegacyMaterialAdapter(oldDatabase);
const material = await adapter.getMaterial('4140');
```

### 2.2 Decorator

**Purpose**: Attach additional responsibilities dynamically.

**PRISM Use Case**: Adding logging, caching, validation to services.

```typescript
// Decorator - Adding capabilities to calculator
interface IForceCalculator {
  calculate(material: Material, params: CutParams): ForceResult;
}

class BasicForceCalculator implements IForceCalculator {
  calculate(material: Material, params: CutParams): ForceResult {
    const force = material.kc1_1 * params.depth * Math.pow(params.chipThickness, 1 - material.mc);
    return { tangential: force, uncertainty: 0.15 };
  }
}

// Decorator base
abstract class ForceCalculatorDecorator implements IForceCalculator {
  constructor(protected wrapped: IForceCalculator) {}
  
  calculate(material: Material, params: CutParams): ForceResult {
    return this.wrapped.calculate(material, params);
  }
}

// Logging decorator
class LoggingForceCalculator extends ForceCalculatorDecorator {
  constructor(wrapped: IForceCalculator, private logger: ILogger) {
    super(wrapped);
  }
  
  calculate(material: Material, params: CutParams): ForceResult {
    this.logger.info('Calculating force', { materialId: material.id, params });
    const start = performance.now();
    
    const result = super.calculate(material, params);
    
    const duration = performance.now() - start;
    this.logger.info('Force calculated', { result, durationMs: duration });
    
    return result;
  }
}

// Caching decorator
class CachingForceCalculator extends ForceCalculatorDecorator {
  private cache: Map<string, { result: ForceResult; timestamp: number }> = new Map();
  private ttlMs: number = 60000;  // 1 minute cache
  
  calculate(material: Material, params: CutParams): ForceResult {
    const key = this.getCacheKey(material, params);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      return cached.result;
    }
    
    const result = super.calculate(material, params);
    this.cache.set(key, { result, timestamp: Date.now() });
    
    return result;
  }
  
  private getCacheKey(material: Material, params: CutParams): string {
    return `${material.id}-${params.depth}-${params.chipThickness}`;
  }
}

// Validation decorator
class ValidatingForceCalculator extends ForceCalculatorDecorator {
  calculate(material: Material, params: CutParams): ForceResult {
    // Pre-validation
    if (!material.kc1_1 || material.kc1_1 <= 0) {
      throw new ValidationError('Invalid Kienzle coefficient');
    }
    if (params.depth <= 0) {
      throw new ValidationError('Depth must be positive');
    }
    
    const result = super.calculate(material, params);
    
    // Post-validation
    if (result.tangential < 0) {
      throw new CalculationError('Force cannot be negative');
    }
    
    return result;
  }
}

// Usage - stack decorators
let calculator: IForceCalculator = new BasicForceCalculator();
calculator = new ValidatingForceCalculator(calculator);
calculator = new CachingForceCalculator(calculator);
calculator = new LoggingForceCalculator(calculator, logger);

// Now calculator has validation + caching + logging
const result = calculator.calculate(steel, cutParams);
```

### 2.3 Facade

**Purpose**: Provide simplified interface to complex subsystem.

**PRISM Use Case**: Unified API for machining analysis.

```typescript
// Facade - Machining Analysis Subsystem
// Complex subsystems
class ForceAnalyzer {
  analyze(material: Material, params: CutParams): ForceAnalysis { /* ... */ }
}

class ThermalAnalyzer {
  analyze(material: Material, params: CutParams, force: Force): ThermalAnalysis { /* ... */ }
}

class VibrationAnalyzer {
  analyze(machine: Machine, params: CutParams, force: Force): VibrationAnalysis { /* ... */ }
}

class ToolLifePredictor {
  predict(material: Material, params: CutParams, thermal: ThermalAnalysis): ToolLifePrediction { /* ... */ }
}

class SurfaceFinishPredictor {
  predict(params: CutParams, vibration: VibrationAnalysis): SurfaceFinishPrediction { /* ... */ }
}

// Facade - simple interface for clients
class MachiningAnalysisFacade {
  private forceAnalyzer = new ForceAnalyzer();
  private thermalAnalyzer = new ThermalAnalyzer();
  private vibrationAnalyzer = new VibrationAnalyzer();
  private toolLifePredictor = new ToolLifePredictor();
  private surfacePredictor = new SurfaceFinishPredictor();
  
  // Single method exposes complex analysis
  analyze(request: MachiningRequest): MachiningAnalysisResult {
    const { material, machine, tool, params } = request;
    
    // Orchestrate complex subsystem interactions
    const force = this.forceAnalyzer.analyze(material, params);
    const thermal = this.thermalAnalyzer.analyze(material, params, force.tangential);
    const vibration = this.vibrationAnalyzer.analyze(machine, params, force.tangential);
    const toolLife = this.toolLifePredictor.predict(material, params, thermal);
    const surface = this.surfacePredictor.predict(params, vibration);
    
    return {
      force,
      thermal,
      vibration,
      toolLife,
      surface,
      recommendation: this.synthesize(force, thermal, vibration, toolLife, surface)
    };
  }
  
  // Simpler convenience methods
  quickForceCheck(material: Material, params: CutParams): number {
    return this.forceAnalyzer.analyze(material, params).tangential;
  }
  
  getToolLifeEstimate(material: Material, params: CutParams): number {
    const force = this.forceAnalyzer.analyze(material, params);
    const thermal = this.thermalAnalyzer.analyze(material, params, force.tangential);
    return this.toolLifePredictor.predict(material, params, thermal).minutes;
  }
}

// Client uses simple facade
const facade = new MachiningAnalysisFacade();
const result = facade.analyze({ material: steel, machine: haasVF2, tool: endmill, params });
console.log(`Predicted tool life: ${result.toolLife.minutes} min`);
```

### 2.4 Composite

**Purpose**: Compose objects into tree structures.

**PRISM Use Case**: Feature trees, operation hierarchies.

```typescript
// Composite - CAM Operation Tree
interface IOperation {
  readonly name: string;
  readonly estimatedTime: number;
  
  accept(visitor: IOperationVisitor): void;
  generateGCode(): string[];
}

// Leaf - individual operation
class MillingOperation implements IOperation {
  constructor(
    public readonly name: string,
    private params: MillingParams
  ) {}
  
  get estimatedTime(): number {
    return this.params.pathLength / this.params.feedRate;
  }
  
  accept(visitor: IOperationVisitor): void {
    visitor.visitMilling(this);
  }
  
  generateGCode(): string[] {
    return [
      `(${this.name})`,
      `S${this.params.spindleSpeed} M3`,
      ...this.params.moves.map(m => `G1 X${m.x} Y${m.y} Z${m.z} F${m.feed}`)
    ];
  }
}

class DrillingOperation implements IOperation {
  constructor(
    public readonly name: string,
    private params: DrillingParams
  ) {}
  
  get estimatedTime(): number {
    return this.params.holes.length * (this.params.depth / this.params.feedRate);
  }
  
  accept(visitor: IOperationVisitor): void {
    visitor.visitDrilling(this);
  }
  
  generateGCode(): string[] {
    return [
      `(${this.name})`,
      `G81 Z${-this.params.depth} R${this.params.retract} F${this.params.feedRate}`,
      ...this.params.holes.map(h => `X${h.x} Y${h.y}`)
    ];
  }
}

// Composite - group of operations
class OperationGroup implements IOperation {
  private operations: IOperation[] = [];
  
  constructor(public readonly name: string) {}
  
  get estimatedTime(): number {
    return this.operations.reduce((sum, op) => sum + op.estimatedTime, 0);
  }
  
  add(operation: IOperation): void {
    this.operations.push(operation);
  }
  
  remove(operation: IOperation): void {
    const index = this.operations.indexOf(operation);
    if (index >= 0) this.operations.splice(index, 1);
  }
  
  accept(visitor: IOperationVisitor): void {
    visitor.visitGroup(this);
    for (const op of this.operations) {
      op.accept(visitor);
    }
  }
  
  generateGCode(): string[] {
    const lines: string[] = [`(GROUP: ${this.name})`];
    for (const op of this.operations) {
      lines.push(...op.generateGCode());
    }
    return lines;
  }
}

// Usage - build tree
const program = new OperationGroup('Main Program');

const roughing = new OperationGroup('Roughing');
roughing.add(new MillingOperation('Face Mill', facingParams));
roughing.add(new MillingOperation('Pocket Rough', pocketParams));
program.add(roughing);

const drilling = new OperationGroup('Drilling');
drilling.add(new DrillingOperation('Center Drill', centerParams));
drilling.add(new DrillingOperation('Drill Holes', drillParams));
program.add(drilling);

const finishing = new OperationGroup('Finishing');
finishing.add(new MillingOperation('Pocket Finish', finishParams));
program.add(finishing);

// Treat tree uniformly
console.log(`Total time: ${program.estimatedTime} min`);
const gcode = program.generateGCode();
```

### 2.5 Proxy

**Purpose**: Provide surrogate or placeholder for another object.

**PRISM Use Case**: Lazy loading, access control, remote services.

```typescript
// Proxy - Lazy Loading Material Database
interface IMaterialDatabase {
  getMaterial(id: MaterialID): Material | null;
  getAllMaterials(): Material[];
}

// Real implementation - expensive to create
class MaterialDatabase implements IMaterialDatabase {
  private materials: Map<MaterialID, Material> = new Map();
  
  constructor() {
    // Expensive initialization - loads all materials
    console.log('Loading material database...');
    this.loadAllMaterials();
  }
  
  getMaterial(id: MaterialID): Material | null {
    return this.materials.get(id) ?? null;
  }
  
  getAllMaterials(): Material[] {
    return Array.from(this.materials.values());
  }
  
  private loadAllMaterials(): void {
    // Simulates expensive loading
    // ... load 1000+ materials
  }
}

// Proxy - delays initialization until needed
class LazyMaterialDatabaseProxy implements IMaterialDatabase {
  private realDatabase: MaterialDatabase | null = null;
  
  private getRealDatabase(): MaterialDatabase {
    if (!this.realDatabase) {
      this.realDatabase = new MaterialDatabase();
    }
    return this.realDatabase;
  }
  
  getMaterial(id: MaterialID): Material | null {
    return this.getRealDatabase().getMaterial(id);
  }
  
  getAllMaterials(): Material[] {
    return this.getRealDatabase().getAllMaterials();
  }
}

// Protection Proxy - access control
class ProtectedMaterialDatabase implements IMaterialDatabase {
  constructor(
    private realDatabase: IMaterialDatabase,
    private userRole: UserRole
  ) {}
  
  getMaterial(id: MaterialID): Material | null {
    // Anyone can read
    return this.realDatabase.getMaterial(id);
  }
  
  getAllMaterials(): Material[] {
    // Only admins can list all
    if (this.userRole !== 'admin') {
      throw new AccessDeniedError('Admin role required');
    }
    return this.realDatabase.getAllMaterials();
  }
}
```

---

## SECTION 3: BEHAVIORAL PATTERNS

### 3.1 Strategy

**Purpose**: Define family of algorithms, make them interchangeable.

**PRISM Use Case**: Different cutting force models, optimization algorithms.

```typescript
// Strategy - Cutting Force Models
interface ICuttingForceStrategy {
  readonly name: string;
  calculate(material: Material, params: CutParams): ForceResult;
  getRequiredParameters(): string[];
}

class KienzleStrategy implements ICuttingForceStrategy {
  readonly name = 'Kienzle';
  
  calculate(material: Material, params: CutParams): ForceResult {
    const Fc = material.kc1_1 * params.width * params.depth * 
               Math.pow(params.chipThickness, -material.mc);
    return { tangential: Fc, feed: Fc * 0.4, radial: Fc * 0.25 };
  }
  
  getRequiredParameters(): string[] {
    return ['kc1_1', 'mc'];
  }
}

class MerchantStrategy implements ICuttingForceStrategy {
  readonly name = 'Merchant';
  
  calculate(material: Material, params: CutParams): ForceResult {
    const shearAngle = Math.atan(
      Math.cos(params.rakeAngle) / 
      (material.frictionCoeff - Math.sin(params.rakeAngle))
    );
    const Fc = (material.shearStrength * params.width * params.depth) /
               (Math.sin(shearAngle) * Math.cos(shearAngle + params.rakeAngle - params.rakeAngle));
    return { tangential: Fc, feed: Fc * 0.5, radial: Fc * 0.3 };
  }
  
  getRequiredParameters(): string[] {
    return ['shearStrength', 'frictionCoeff'];
  }
}

// Context uses strategy
class ForceCalculator {
  constructor(private strategy: ICuttingForceStrategy) {}
  
  setStrategy(strategy: ICuttingForceStrategy): void {
    this.strategy = strategy;
  }
  
  calculate(material: Material, params: CutParams): ForceResult {
    // Validate required parameters
    const required = this.strategy.getRequiredParameters();
    for (const param of required) {
      if (!material[param]) {
        throw new Error(`${this.strategy.name} requires ${param}`);
      }
    }
    
    return this.strategy.calculate(material, params);
  }
}

// Usage
const calculator = new ForceCalculator(new KienzleStrategy());
let result = calculator.calculate(steel, params);

// Switch strategy at runtime
calculator.setStrategy(new MerchantStrategy());
result = calculator.calculate(steel, params);
```

### 3.2 Observer

**Purpose**: Define one-to-many dependency for state changes.

**PRISM Use Case**: UI updates, event systems, state synchronization.

```typescript
// Observer - Calculation State Changes
interface IObserver<T> {
  update(event: T): void;
}

interface ISubject<T> {
  subscribe(observer: IObserver<T>): void;
  unsubscribe(observer: IObserver<T>): void;
  notify(event: T): void;
}

// Event types
interface CalculationEvent {
  type: 'started' | 'progress' | 'completed' | 'error';
  materialId?: MaterialID;
  progress?: number;
  result?: CalculationResult;
  error?: Error;
}

// Subject
class CalculationEngine implements ISubject<CalculationEvent> {
  private observers: Set<IObserver<CalculationEvent>> = new Set();
  
  subscribe(observer: IObserver<CalculationEvent>): void {
    this.observers.add(observer);
  }
  
  unsubscribe(observer: IObserver<CalculationEvent>): void {
    this.observers.delete(observer);
  }
  
  notify(event: CalculationEvent): void {
    for (const observer of this.observers) {
      observer.update(event);
    }
  }
  
  async calculate(materialId: MaterialID, params: CutParams): Promise<CalculationResult> {
    this.notify({ type: 'started', materialId });
    
    try {
      // Simulate progress
      for (let i = 0; i <= 100; i += 20) {
        this.notify({ type: 'progress', progress: i });
        await this.delay(100);
      }
      
      const result = this.doCalculation(materialId, params);
      this.notify({ type: 'completed', result });
      
      return result;
    } catch (error) {
      this.notify({ type: 'error', error: error as Error });
      throw error;
    }
  }
}

// Observers
class ProgressBarObserver implements IObserver<CalculationEvent> {
  update(event: CalculationEvent): void {
    if (event.type === 'progress') {
      this.updateProgressBar(event.progress!);
    }
  }
  
  private updateProgressBar(progress: number): void {
    console.log(`Progress: ${progress}%`);
  }
}

class LoggingObserver implements IObserver<CalculationEvent> {
  update(event: CalculationEvent): void {
    console.log(`[${new Date().toISOString()}] ${event.type}`, event);
  }
}

class AlertObserver implements IObserver<CalculationEvent> {
  update(event: CalculationEvent): void {
    if (event.type === 'error') {
      this.showAlert(`Calculation failed: ${event.error?.message}`);
    }
  }
  
  private showAlert(message: string): void {
    // Show UI alert
  }
}

// Usage
const engine = new CalculationEngine();
engine.subscribe(new ProgressBarObserver());
engine.subscribe(new LoggingObserver());
engine.subscribe(new AlertObserver());

await engine.calculate('4140', cutParams);
```

### 3.3 Command

**Purpose**: Encapsulate request as object for parameterization, queuing, undo.

**PRISM Use Case**: Undo/redo, macro recording, batch operations.

```typescript
// Command - Parameter Editing with Undo
interface ICommand {
  execute(): void;
  undo(): void;
  describe(): string;
}

class SetParameterCommand implements ICommand {
  private previousValue: number;
  
  constructor(
    private material: Material,
    private paramName: keyof Material,
    private newValue: number
  ) {
    this.previousValue = material[paramName] as number;
  }
  
  execute(): void {
    (this.material as any)[this.paramName] = this.newValue;
  }
  
  undo(): void {
    (this.material as any)[this.paramName] = this.previousValue;
  }
  
  describe(): string {
    return `Set ${this.paramName} from ${this.previousValue} to ${this.newValue}`;
  }
}

class CompositeCommand implements ICommand {
  private commands: ICommand[] = [];
  
  add(command: ICommand): void {
    this.commands.push(command);
  }
  
  execute(): void {
    for (const command of this.commands) {
      command.execute();
    }
  }
  
  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
  
  describe(): string {
    return `Composite: [${this.commands.map(c => c.describe()).join(', ')}]`;
  }
}

// Command History for Undo/Redo
class CommandHistory {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  
  execute(command: ICommand): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];  // Clear redo stack
  }
  
  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }
  
  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
    }
  }
  
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

// Usage
const history = new CommandHistory();
const material = new Material({ kc1_1: 1800, mc: 0.25 });

// Execute commands
history.execute(new SetParameterCommand(material, 'kc1_1', 2000));
history.execute(new SetParameterCommand(material, 'mc', 0.30));

console.log(material.kc1_1);  // 2000
console.log(material.mc);     // 0.30

// Undo
history.undo();
console.log(material.mc);     // 0.25

// Redo
history.redo();
console.log(material.mc);     // 0.30
```

### 3.4 State

**Purpose**: Alter behavior when internal state changes.

**PRISM Use Case**: Machine states, process phases.

```typescript
// State - CNC Machine State
interface IMachineState {
  start(machine: CNCMachine): void;
  stop(machine: CNCMachine): void;
  pause(machine: CNCMachine): void;
  reset(machine: CNCMachine): void;
}

class IdleState implements IMachineState {
  start(machine: CNCMachine): void {
    console.log('Starting machine...');
    machine.setState(new RunningState());
  }
  
  stop(machine: CNCMachine): void {
    console.log('Already stopped');
  }
  
  pause(machine: CNCMachine): void {
    console.log('Cannot pause - not running');
  }
  
  reset(machine: CNCMachine): void {
    console.log('Resetting machine...');
    machine.clearAlarms();
  }
}

class RunningState implements IMachineState {
  start(machine: CNCMachine): void {
    console.log('Already running');
  }
  
  stop(machine: CNCMachine): void {
    console.log('Stopping machine...');
    machine.setState(new IdleState());
  }
  
  pause(machine: CNCMachine): void {
    console.log('Pausing machine...');
    machine.setState(new PausedState());
  }
  
  reset(machine: CNCMachine): void {
    console.log('Cannot reset while running');
  }
}

class PausedState implements IMachineState {
  start(machine: CNCMachine): void {
    console.log('Resuming machine...');
    machine.setState(new RunningState());
  }
  
  stop(machine: CNCMachine): void {
    console.log('Stopping machine...');
    machine.setState(new IdleState());
  }
  
  pause(machine: CNCMachine): void {
    console.log('Already paused');
  }
  
  reset(machine: CNCMachine): void {
    console.log('Resetting from pause...');
    machine.clearAlarms();
    machine.setState(new IdleState());
  }
}

class ErrorState implements IMachineState {
  start(machine: CNCMachine): void {
    console.log('Cannot start - resolve error first');
  }
  
  stop(machine: CNCMachine): void {
    console.log('Emergency stop activated');
    machine.emergencyStop();
  }
  
  pause(machine: CNCMachine): void {
    console.log('Cannot pause - in error state');
  }
  
  reset(machine: CNCMachine): void {
    console.log('Resetting error state...');
    machine.clearAlarms();
    machine.setState(new IdleState());
  }
}

class CNCMachine {
  private state: IMachineState = new IdleState();
  
  setState(state: IMachineState): void {
    this.state = state;
  }
  
  start(): void { this.state.start(this); }
  stop(): void { this.state.stop(this); }
  pause(): void { this.state.pause(this); }
  reset(): void { this.state.reset(this); }
  
  clearAlarms(): void { /* ... */ }
  emergencyStop(): void { /* ... */ }
}

// Usage
const machine = new CNCMachine();
machine.start();   // Starting machine... (now Running)
machine.pause();   // Pausing machine... (now Paused)
machine.start();   // Resuming machine... (now Running)
machine.stop();    // Stopping machine... (now Idle)
```

### 3.5 Chain of Responsibility

**Purpose**: Pass request along chain of handlers.

**PRISM Use Case**: Validation chains, error handling, request processing.

```typescript
// Chain of Responsibility - Material Validation
interface IValidationHandler {
  setNext(handler: IValidationHandler): IValidationHandler;
  validate(material: Material): ValidationResult;
}

abstract class BaseValidationHandler implements IValidationHandler {
  private nextHandler: IValidationHandler | null = null;
  
  setNext(handler: IValidationHandler): IValidationHandler {
    this.nextHandler = handler;
    return handler;  // Enable chaining
  }
  
  validate(material: Material): ValidationResult {
    const result = this.doValidate(material);
    
    if (!result.valid) {
      return result;  // Stop chain on failure
    }
    
    if (this.nextHandler) {
      return this.nextHandler.validate(material);
    }
    
    return { valid: true };
  }
  
  protected abstract doValidate(material: Material): ValidationResult;
}

class RequiredFieldsHandler extends BaseValidationHandler {
  protected doValidate(material: Material): ValidationResult {
    if (!material.id) return { valid: false, error: 'ID required' };
    if (!material.name) return { valid: false, error: 'Name required' };
    return { valid: true };
  }
}

class KienzleParametersHandler extends BaseValidationHandler {
  protected doValidate(material: Material): ValidationResult {
    if (!material.kc1_1 || material.kc1_1 <= 0) {
      return { valid: false, error: 'Valid kc1.1 required (positive number)' };
    }
    if (!material.mc || material.mc < 0 || material.mc > 1) {
      return { valid: false, error: 'Valid mc required (0 to 1)' };
    }
    return { valid: true };
  }
}

class PhysicalPropertiesHandler extends BaseValidationHandler {
  protected doValidate(material: Material): ValidationResult {
    if (!material.density || material.density <= 0) {
      return { valid: false, error: 'Valid density required' };
    }
    if (!material.hardness || material.hardness < 0) {
      return { valid: false, error: 'Valid hardness required' };
    }
    return { valid: true };
  }
}

class CrossReferenceHandler extends BaseValidationHandler {
  protected doValidate(material: Material): ValidationResult {
    // Check consistency between properties
    if (material.tensileStrength && material.yieldStrength) {
      if (material.yieldStrength > material.tensileStrength) {
        return { 
          valid: false, 
          error: 'Yield strength cannot exceed tensile strength' 
        };
      }
    }
    return { valid: true };
  }
}

// Build chain
const validator = new RequiredFieldsHandler();
validator
  .setNext(new KienzleParametersHandler())
  .setNext(new PhysicalPropertiesHandler())
  .setNext(new CrossReferenceHandler());

// Usage
const result = validator.validate(material);
if (!result.valid) {
  console.error(`Validation failed: ${result.error}`);
}
```

---

## SECTION 4: ANTI-PATTERNS

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| **God Object** | One object does everything | Split into focused classes |
| **Spaghetti Code** | No clear structure | Apply appropriate patterns |
| **Golden Hammer** | Using one pattern everywhere | Choose pattern for problem |
| **Copy-Paste Programming** | Code duplication | Extract to reusable patterns |
| **Premature Optimization** | Over-engineering | Start simple, refactor later |
| **Pattern Obsession** | Patterns for patterns' sake | Only when they add value |

---

## SECTION 5: PATTERN CHECKLIST

```
□ Have I identified the core problem?
□ Does a pattern naturally fit?
□ Am I over-engineering with patterns?
□ Will other developers understand this?
□ Does it follow SOLID principles?
□ Is it testable?
□ Is it documented?
□ Have I considered simpler alternatives?
```

---

**Patterns are tools, not goals. Use them when they solve real problems.**

**Version:** 1.0 | **Date:** 2026-01-29 | **Level:** 3 (Domain)
