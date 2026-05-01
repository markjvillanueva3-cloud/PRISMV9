---
name: prism-performance-patterns
version: "1.0"
level: 3
category: domain
description: |
  Performance optimization patterns for PRISM Manufacturing Intelligence.
  Covers algorithm complexity, caching, lazy loading, memory management,
  async patterns, and manufacturing-specific optimizations.
  Use when optimizing calculations, database access, or UI responsiveness.
dependencies:
  - prism-code-master
  - prism-design-patterns
consumers:
  - ALL calculation engines
  - ALL database modules
  - UI components
safety_critical: true
---

# PRISM PERFORMANCE PATTERNS
## Optimization for Manufacturing Intelligence
### Version 1.0 | Level 3 Domain Skill

---

## QUICK REFERENCE

| Pattern | Use Case | Improvement |
|---------|----------|-------------|
| Memoization | Repeated calculations | O(1) lookup vs O(n) recalc |
| LRU Cache | Database lookups | 90%+ cache hit rate |
| Lazy Loading | Large datasets | Faster initial load |
| Object Pooling | Frequent allocations | Reduce GC pressure |
| Batch Processing | Multiple operations | Reduce overhead |
| Indexed Lookup | Material/machine search | O(1) vs O(n) |
| Worker Threads | Heavy calculations | Non-blocking UI |
| Streaming | Large files | Constant memory |

### Performance Targets
| Metric | Target | Critical |
|--------|--------|----------|
| Initial load | < 2s | < 5s |
| Calculation | < 500ms | < 2s |
| Database lookup | < 50ms | < 200ms |
| UI response | < 100ms | < 300ms |
| Memory (base) | < 200MB | < 500MB |

### Safety Principle
⚠️ **LIFE-SAFETY**: Performance optimizations must NEVER compromise calculation accuracy. A fast wrong answer in manufacturing can cause tool breakage, machine damage, or operator injury.

---

## SECTION 1: ALGORITHM COMPLEXITY

### Know Your Big-O
```typescript
// ❌ O(n²) - Quadratic, avoid for large datasets
function findDuplicateMaterials(materials: Material[]): Material[][] {
  const duplicates: Material[][] = [];
  
  for (let i = 0; i < materials.length; i++) {
    for (let j = i + 1; j < materials.length; j++) {
      if (materials[i].name === materials[j].name) {
        duplicates.push([materials[i], materials[j]]);
      }
    }
  }
  
  return duplicates;  // 1000 materials = 500,000 comparisons!
}

// ✅ O(n) - Linear using Map
function findDuplicateMaterialsFast(materials: Material[]): Material[][] {
  const byName = new Map<string, Material[]>();
  
  for (const material of materials) {
    const existing = byName.get(material.name) || [];
    existing.push(material);
    byName.set(material.name, existing);
  }
  
  return Array.from(byName.values())
    .filter(group => group.length > 1);  // 1000 materials = 1,000 operations
}
```

### Indexed Lookups
```typescript
// Build indexes for O(1) lookups
class MaterialIndex {
  private byId = new Map<string, Material>();
  private byName = new Map<string, Material[]>();
  private byCategory = new Map<string, Material[]>();
  private byHardnessRange = new Map<string, Material[]>();
  
  constructor(materials: Material[]) {
    for (const material of materials) {
      // Primary key index
      this.byId.set(material.id, material);
      
      // Secondary indexes
      this.addToIndex(this.byName, material.name, material);
      this.addToIndex(this.byCategory, material.category, material);
      this.addToIndex(this.byHardnessRange, this.hardnessKey(material), material);
    }
  }
  
  private addToIndex(index: Map<string, Material[]>, key: string, material: Material): void {
    const existing = index.get(key) || [];
    existing.push(material);
    index.set(key, existing);
  }
  
  private hardnessKey(material: Material): string {
    const hrc = material.hardness_hrc ?? 0;
    if (hrc < 20) return 'soft';
    if (hrc < 40) return 'medium';
    if (hrc < 55) return 'hard';
    return 'very-hard';
  }
  
  // O(1) lookups
  findById(id: string): Material | undefined {
    return this.byId.get(id);
  }
  
  findByCategory(category: string): Material[] {
    return this.byCategory.get(category) || [];
  }
  
  findByHardnessRange(range: 'soft' | 'medium' | 'hard' | 'very-hard'): Material[] {
    return this.byHardnessRange.get(range) || [];
  }
}
```

### Binary Search for Sorted Data
```typescript
// O(log n) search in sorted arrays
function binarySearch<T>(
  arr: T[],
  target: T,
  compare: (a: T, b: T) => number
): number {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const cmp = compare(arr[mid], target);
    
    if (cmp === 0) return mid;
    if (cmp < 0) left = mid + 1;
    else right = mid - 1;
  }
  
  return -1;
}

// Find optimal speed from sorted speed/feed table
function findOptimalSpeed(
  table: SpeedFeedEntry[],  // Sorted by hardness
  targetHardness: number
): SpeedFeedEntry | undefined {
  const index = binarySearch(
    table,
    { hardness: targetHardness } as SpeedFeedEntry,
    (a, b) => a.hardness - b.hardness
  );
  
  return index >= 0 ? table[index] : undefined;
}
```

---

## SECTION 2: CACHING STRATEGIES

### Memoization
```typescript
// Cache pure function results
function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator 
      ? keyGenerator(...args)
      : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Memoized cutting force calculation
const calculateCuttingForceMemo = memoize(
  (kc1_1: number, mc: number, chipThickness: number): number => {
    // Expensive calculation
    return kc1_1 * Math.pow(chipThickness, -mc);
  },
  (kc1_1, mc, chipThickness) => `${kc1_1}-${mc}-${chipThickness.toFixed(4)}`
);
```

### LRU Cache
```typescript
// Least Recently Used cache with size limit
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;
  
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }
  
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    
    return value;
  }
  
  set(key: K, value: V): void {
    // Delete if exists to update position
    this.cache.delete(key);
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, value);
  }
  
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

// Usage for material lookups
const materialCache = new LRUCache<string, Material>(500);

async function getMaterial(id: string): Promise<Material> {
  // Check cache first
  const cached = materialCache.get(id);
  if (cached) return cached;
  
  // Fetch from database
  const material = await materialRepository.findById(id);
  
  // Cache for future requests
  materialCache.set(id, material);
  
  return material;
}
```

### Time-Based Cache
```typescript
// Cache with expiration
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TTLCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private readonly ttlMs: number;
  
  constructor(ttlMs: number = 60000) {  // Default 1 minute
    this.ttlMs = ttlMs;
  }
  
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }
  
  set(key: K, value: V, customTtl?: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (customTtl ?? this.ttlMs)
    });
  }
  
  // Clean up expired entries periodically
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }
    
    return pruned;
  }
}

// Usage for external API responses
const toolDataCache = new TTLCache<string, ToolData>(300000);  // 5 minutes
```

### Cache Warming
```typescript
// Pre-load frequently accessed data
async function warmMaterialCache(): Promise<void> {
  console.log('Warming material cache...');
  
  // Load most common materials
  const commonMaterials = await materialRepository.findByIds([
    'ST-4140-ANN', 'ST-4140-QT', 'ST-1018-HR',
    'AL-6061-T6', 'AL-7075-T6',
    'SS-304-ANN', 'SS-316L-ANN',
    'TI-6AL4V-ANN'
  ]);
  
  for (const material of commonMaterials) {
    materialCache.set(material.id, material);
  }
  
  console.log(`Warmed cache with ${commonMaterials.length} materials`);
}

// Run at startup
await warmMaterialCache();
```

---

## SECTION 3: LAZY LOADING

### Lazy Initialization
```typescript
// Defer expensive initialization
class LazyValue<T> {
  private value?: T;
  private initialized = false;
  
  constructor(private readonly factory: () => T) {}
  
  get(): T {
    if (!this.initialized) {
      this.value = this.factory();
      this.initialized = true;
    }
    return this.value!;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  reset(): void {
    this.value = undefined;
    this.initialized = false;
  }
}

// Lazy load large lookup tables
class CuttingDataService {
  private speedFeedTables = new LazyValue(() => {
    console.log('Loading speed/feed tables...');
    return loadSpeedFeedTables();  // 50MB of data
  });
  
  getSpeedFeed(material: Material, tool: Tool): SpeedFeedData {
    return this.speedFeedTables.get().lookup(material, tool);
  }
}
```

### Pagination
```typescript
// Load data in chunks
interface Page<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

async function getMaterialsPage(
  pageNumber: number,
  pageSize: number = 50,
  filter?: MaterialFilter
): Promise<Page<Material>> {
  const offset = pageNumber * pageSize;
  
  const [items, totalCount] = await Promise.all([
    materialRepository.find({
      skip: offset,
      take: pageSize,
      where: filter
    }),
    materialRepository.count(filter)
  ]);
  
  return {
    items,
    totalCount,
    pageNumber,
    pageSize,
    hasNext: offset + items.length < totalCount,
    hasPrevious: pageNumber > 0
  };
}

// Virtual scrolling - only render visible items
function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
): { visibleItems: T[]; startIndex: number; endIndex: number } {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
  
  return {
    visibleItems: items.slice(startIndex, endIndex),
    startIndex,
    endIndex
  };
}
```

### Lazy Properties
```typescript
// Calculate properties only when accessed
class Material {
  readonly id: string;
  readonly name: string;
  readonly kc1_1: number;
  readonly mc: number;
  
  // Lazy calculated properties
  private _machinabilityRating?: number;
  private _recommendedSpeeds?: SpeedRange;
  
  get machinabilityRating(): number {
    if (this._machinabilityRating === undefined) {
      this._machinabilityRating = this.calculateMachinabilityRating();
    }
    return this._machinabilityRating;
  }
  
  get recommendedSpeeds(): SpeedRange {
    if (this._recommendedSpeeds === undefined) {
      this._recommendedSpeeds = this.calculateRecommendedSpeeds();
    }
    return this._recommendedSpeeds;
  }
  
  private calculateMachinabilityRating(): number {
    // Expensive calculation
    return 100 * (1000 / this.kc1_1) * (1 - this.mc);
  }
  
  private calculateRecommendedSpeeds(): SpeedRange {
    // Complex lookup and calculation
    return lookupSpeedRange(this);
  }
}
```

---

## SECTION 4: MEMORY MANAGEMENT

### Object Pooling
```typescript
// Reuse objects instead of creating new ones
class ObjectPool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  
  constructor(
    private readonly factory: () => T,
    private readonly reset: (obj: T) => void,
    private readonly initialSize: number = 10
  ) {
    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }
  
  acquire(): T {
    let obj = this.available.pop();
    
    if (!obj) {
      obj = this.factory();
    }
    
    this.inUse.add(obj);
    return obj;
  }
  
  release(obj: T): void {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.reset(obj);
      this.available.push(obj);
    }
  }
  
  get stats(): { available: number; inUse: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size
    };
  }
}

// Pool for calculation result objects
interface ForceResult {
  tangential: number;
  feed: number;
  radial: number;
  power: number;
}

const forceResultPool = new ObjectPool<ForceResult>(
  () => ({ tangential: 0, feed: 0, radial: 0, power: 0 }),
  (obj) => { obj.tangential = 0; obj.feed = 0; obj.radial = 0; obj.power = 0; }
);

// Usage
function calculateForces(material: Material, params: CutParams): ForceResult {
  const result = forceResultPool.acquire();
  
  try {
    result.tangential = calculateTangentialForce(material, params);
    result.feed = result.tangential * 0.4;
    result.radial = result.tangential * 0.25;
    result.power = calculatePower(result.tangential, params.speed);
    
    return result;
  } finally {
    // Caller must release when done
    // forceResultPool.release(result);
  }
}
```

### Avoiding Memory Leaks
```typescript
// ❌ LEAK: Event listeners not cleaned up
class CalculationService {
  constructor() {
    window.addEventListener('resize', this.onResize);  // Never removed!
  }
  
  onResize = () => { /* ... */ };
}

// ✅ SAFE: Proper cleanup
class CalculationService {
  private abortController = new AbortController();
  
  constructor() {
    window.addEventListener('resize', this.onResize, {
      signal: this.abortController.signal
    });
  }
  
  onResize = () => { /* ... */ };
  
  dispose(): void {
    this.abortController.abort();  // Removes all listeners
  }
}

// ❌ LEAK: Closure holds reference
function createCalculator(largeData: LargeDataset) {
  return () => {
    // largeData captured in closure, never released
    return largeData.values[0];
  };
}

// ✅ SAFE: Extract only needed data
function createCalculator(largeData: LargeDataset) {
  const firstValue = largeData.values[0];  // Copy needed value
  return () => firstValue;  // Only small value captured
}
```

### Streaming Large Data
```typescript
// Process large files without loading entirely into memory
async function* streamMaterials(
  filePath: string
): AsyncGenerator<Material, void, unknown> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream });
  
  let isFirst = true;
  
  for await (const line of rl) {
    if (isFirst) {
      isFirst = false;  // Skip header
      continue;
    }
    
    yield parseMaterialLine(line);
  }
}

// Usage - constant memory regardless of file size
async function processMaterialFile(filePath: string): Promise<void> {
  let count = 0;
  
  for await (const material of streamMaterials(filePath)) {
    await processMaterial(material);
    count++;
    
    if (count % 1000 === 0) {
      console.log(`Processed ${count} materials`);
    }
  }
}
```

---

## SECTION 5: ASYNC PATTERNS

### Parallel Execution
```typescript
// ❌ SLOW: Sequential execution
async function loadAllData(): Promise<AllData> {
  const materials = await loadMaterials();      // 100ms
  const machines = await loadMachines();        // 150ms
  const tools = await loadTools();              // 80ms
  // Total: 330ms
  
  return { materials, machines, tools };
}

// ✅ FAST: Parallel execution
async function loadAllDataFast(): Promise<AllData> {
  const [materials, machines, tools] = await Promise.all([
    loadMaterials(),   // 100ms
    loadMachines(),    // 150ms (parallel)
    loadTools()        // 80ms (parallel)
  ]);
  // Total: 150ms (slowest operation)
  
  return { materials, machines, tools };
}
```

### Controlled Concurrency
```typescript
// Limit concurrent operations
async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  
  for (const item of items) {
    const promise = fn(item).then(result => {
      results.push(result);
    });
    
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      const completed = executing.filter(p => 
        !isPromisePending(p)
      );
      executing.splice(0, completed.length);
    }
  }
  
  await Promise.all(executing);
  return results;
}

// Usage - calculate forces for many materials, 5 at a time
const results = await mapWithConcurrency(
  materials,
  async (m) => calculateCuttingForce(m, params),
  5
);
```

### Debouncing & Throttling
```typescript
// Debounce - execute after pause in calls
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

// Throttle - execute at most once per interval
function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
        timeoutId = null;
      }, intervalMs - timeSinceLastCall);
    }
  };
}

// Usage - search input
const debouncedSearch = debounce(searchMaterials, 300);
input.addEventListener('input', (e) => debouncedSearch(e.target.value));

// Usage - progress updates
const throttledProgress = throttle(updateProgressBar, 100);
for (const item of items) {
  await process(item);
  throttledProgress(progress++);
}
```

### Web Workers for Heavy Calculations
```typescript
// Main thread
class CalculationWorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Array<{ task: any; resolve: Function; reject: Function }> = [];
  private availableWorkers: Worker[] = [];
  
  constructor(workerCount: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker('calculation-worker.js');
      worker.onmessage = (e) => this.handleResult(worker, e.data);
      worker.onerror = (e) => this.handleError(worker, e);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }
  
  async calculate(task: CalculationTask): Promise<CalculationResult> {
    return new Promise((resolve, reject) => {
      const worker = this.availableWorkers.pop();
      
      if (worker) {
        worker.postMessage(task);
        // Store resolve/reject for this worker
      } else {
        this.taskQueue.push({ task, resolve, reject });
      }
    });
  }
  
  private handleResult(worker: Worker, result: CalculationResult): void {
    // Return worker to pool
    this.availableWorkers.push(worker);
    
    // Process next task in queue
    const next = this.taskQueue.shift();
    if (next) {
      worker.postMessage(next.task);
    }
  }
  
  terminate(): void {
    this.workers.forEach(w => w.terminate());
  }
}

// calculation-worker.js
self.onmessage = (e: MessageEvent<CalculationTask>) => {
  const result = performHeavyCalculation(e.data);
  self.postMessage(result);
};
```

---

## SECTION 6: DATABASE OPTIMIZATION

### Batch Operations
```typescript
// ❌ SLOW: Individual inserts
async function saveMaterials(materials: Material[]): Promise<void> {
  for (const material of materials) {
    await db.insert('materials', material);  // 1000 round trips!
  }
}

// ✅ FAST: Batch insert
async function saveMaterialsBatch(materials: Material[]): Promise<void> {
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < materials.length; i += BATCH_SIZE) {
    const batch = materials.slice(i, i + BATCH_SIZE);
    await db.insertMany('materials', batch);  // 10 round trips
  }
}
```

### Query Optimization
```typescript
// ❌ N+1 Query Problem
async function getMaterialsWithTools(): Promise<MaterialWithTools[]> {
  const materials = await db.query('SELECT * FROM materials');
  
  // N additional queries!
  for (const material of materials) {
    material.tools = await db.query(
      'SELECT * FROM tools WHERE material_id = ?',
      [material.id]
    );
  }
  
  return materials;
}

// ✅ Single JOIN query
async function getMaterialsWithToolsFast(): Promise<MaterialWithTools[]> {
  return db.query(`
    SELECT m.*, t.*
    FROM materials m
    LEFT JOIN tools t ON t.material_id = m.id
  `);
}

// Or use DataLoader for batching
const toolLoader = new DataLoader(async (materialIds: string[]) => {
  const tools = await db.query(
    'SELECT * FROM tools WHERE material_id IN (?)',
    [materialIds]
  );
  
  // Group by material_id
  const byMaterial = new Map<string, Tool[]>();
  for (const tool of tools) {
    const existing = byMaterial.get(tool.material_id) || [];
    existing.push(tool);
    byMaterial.set(tool.material_id, existing);
  }
  
  return materialIds.map(id => byMaterial.get(id) || []);
});
```

### Index Strategy
```typescript
// Document index requirements
interface MaterialIndexes {
  // Primary key
  id: 'unique';
  
  // Frequent lookups
  name: 'index';
  category: 'index';
  
  // Range queries
  hardness_hrc: 'index';
  tensile_strength: 'index';
  
  // Composite for common queries
  'category_hardness': ['category', 'hardness_hrc'];
}

// Query with index hints (PostgreSQL)
const query = `
  SELECT * FROM materials
  WHERE category = $1
    AND hardness_hrc BETWEEN $2 AND $3
  ORDER BY hardness_hrc
  /* IndexScan(materials idx_category_hardness) */
`;
```

---

## SECTION 7: MANUFACTURING-SPECIFIC OPTIMIZATIONS

### Precomputed Lookup Tables
```typescript
// Pre-calculate common values instead of computing on demand
interface SpeedFeedLookup {
  // Key: `${materialId}-${toolType}-${operation}`
  [key: string]: {
    speed: number;
    feed: number;
    doc: number;
    woc: number;
  };
}

class OptimizedSpeedFeedService {
  private lookup: SpeedFeedLookup;
  
  constructor() {
    this.lookup = this.buildLookupTable();
  }
  
  private buildLookupTable(): SpeedFeedLookup {
    const lookup: SpeedFeedLookup = {};
    
    for (const material of commonMaterials) {
      for (const toolType of toolTypes) {
        for (const operation of operations) {
          const key = `${material.id}-${toolType}-${operation}`;
          lookup[key] = this.calculateOptimal(material, toolType, operation);
        }
      }
    }
    
    return lookup;
  }
  
  getSpeedFeed(materialId: string, toolType: string, operation: string): SpeedFeedData {
    const key = `${materialId}-${toolType}-${operation}`;
    
    // O(1) lookup for common combinations
    if (this.lookup[key]) {
      return this.lookup[key];
    }
    
    // Fall back to calculation for uncommon combinations
    return this.calculateOnDemand(materialId, toolType, operation);
  }
}
```

### Incremental Calculations
```typescript
// Don't recalculate everything when one parameter changes
class IncrementalForceCalculator {
  private cache: Map<string, number> = new Map();
  private lastParams?: CutParams;
  private lastMaterial?: Material;
  
  calculate(material: Material, params: CutParams): ForceResult {
    // Check what changed
    const materialChanged = material.id !== this.lastMaterial?.id;
    const speedChanged = params.speed !== this.lastParams?.speed;
    const feedChanged = params.feed !== this.lastParams?.feed;
    const depthChanged = params.depth !== this.lastParams?.depth;
    
    // Reuse cached intermediate values
    let specificForce = this.cache.get('specificForce');
    
    if (materialChanged || feedChanged || !specificForce) {
      // Only recalculate if relevant params changed
      specificForce = material.kc1_1 * Math.pow(params.chipThickness, -material.mc);
      this.cache.set('specificForce', specificForce);
    }
    
    // Force depends on depth
    const tangentialForce = depthChanged || !this.cache.has('tangentialForce')
      ? specificForce * params.depth * params.width
      : this.cache.get('tangentialForce')!;
    
    this.cache.set('tangentialForce', tangentialForce);
    
    // Update last params
    this.lastParams = { ...params };
    this.lastMaterial = material;
    
    return {
      tangential: tangentialForce,
      feed: tangentialForce * 0.4,
      radial: tangentialForce * 0.25,
      power: tangentialForce * params.speed / 60000
    };
  }
}
```

---

## SECTION 8: PROFILING & MEASUREMENT

### Performance Timing
```typescript
// Measure execution time
function measureTime<T>(name: string, fn: () => T): T {
  const start = performance.now();
  
  try {
    const result = fn();
    const duration = performance.now() - start;
    console.log(`${name}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.log(`${name} (failed): ${duration.toFixed(2)}ms`);
    throw error;
  }
}

// Async version
async function measureTimeAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`${name}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.log(`${name} (failed): ${duration.toFixed(2)}ms`);
    throw error;
  }
}

// Usage
const material = measureTime('getMaterial', () => materialIndex.findById(id));
const forces = await measureTimeAsync('calculateForces', () => 
  forceCalculator.calculate(material, params)
);
```

### Performance Budget
```typescript
// Enforce performance requirements
class PerformanceBudget {
  private budgets: Map<string, number> = new Map([
    ['calculation', 500],
    ['databaseQuery', 50],
    ['uiRender', 100],
    ['initialLoad', 2000]
  ]);
  
  async track<T>(
    category: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number; withinBudget: boolean }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    const budget = this.budgets.get(category) ?? Infinity;
    const withinBudget = duration <= budget;
    
    if (!withinBudget) {
      console.warn(
        `Performance budget exceeded: ${category} took ${duration.toFixed(0)}ms ` +
        `(budget: ${budget}ms)`
      );
    }
    
    return { result, duration, withinBudget };
  }
}

const perfBudget = new PerformanceBudget();

const { result, withinBudget } = await perfBudget.track('calculation', () =>
  calculateOptimalParams(material, machine)
);
```

---

## SECTION 9: ANTI-PATTERNS

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Premature optimization | Wasted effort | Profile first |
| N+1 queries | Database overload | Batch/JOIN |
| Unbounded caches | Memory leak | LRU with limits |
| Blocking main thread | UI freeze | Web Workers |
| Loading everything | Slow startup | Lazy loading |
| Repeated calculations | CPU waste | Memoization |
| Memory churn | GC pressure | Object pooling |
| Sequential async | Slow total time | Promise.all |

---

## SECTION 10: CHECKLIST

```
□ Algorithm complexity is O(n log n) or better for large datasets
□ Frequent lookups use indexed data structures
□ Pure functions are memoized
□ Database queries are batched
□ N+1 query patterns eliminated
□ Large datasets are paginated or streamed
□ Caches have size limits (LRU)
□ Time-sensitive caches have TTL
□ Heavy calculations use Web Workers
□ Async operations run in parallel when independent
□ Event listeners are cleaned up
□ Performance budgets are defined and tracked
□ Critical paths are profiled
□ Optimizations don't sacrifice accuracy
```

---

**Performance enables productivity. But NEVER sacrifice accuracy for speed in manufacturing calculations.**

**Version:** 1.0 | **Date:** 2026-01-29 | **Level:** 3 (Domain)
