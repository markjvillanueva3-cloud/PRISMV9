# Coding Patterns Quick Reference

## Design Patterns for PRISM

### Factory Pattern
**Use for:** Creating objects without specifying exact class
```javascript
// Tool Factory - create different tool types
const ToolFactory = {
    create(type, params) {
        switch (type) {
            case 'endmill': return new EndMill(params);
            case 'drill': return new Drill(params);
            case 'tap': return new Tap(params);
            case 'insert': return new InsertTool(params);
            default: throw new Error(`Unknown tool type: ${type}`);
        }
    },
    
    // From database record
    fromRecord(record) {
        return this.create(record.type, {
            diameter: record.diameter,
            flutes: record.flutes,
            coating: record.coating,
            // ...
        });
    }
};
```

### Strategy Pattern
**Use for:** Interchangeable algorithms
```javascript
// Optimization strategies
const OptimizationStrategies = {
    conservative: {
        name: 'Conservative',
        apply(params) {
            return { ...params, speedFactor: 0.7, feedFactor: 0.8 };
        }
    },
    aggressive: {
        name: 'Aggressive',
        apply(params) {
            return { ...params, speedFactor: 1.2, feedFactor: 1.1 };
        }
    },
    balanced: {
        name: 'Balanced',
        apply(params) {
            return params;  // No modification
        }
    }
};

// Usage
function calculateWithStrategy(params, strategyName = 'balanced') {
    const strategy = OptimizationStrategies[strategyName];
    const adjustedParams = strategy.apply(params);
    return coreCalculation(adjustedParams);
}
```

### Observer Pattern
**Use for:** Event-driven updates (UI reactivity)
```javascript
// Event emitter for PRISM
class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        };
    }
    
    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }
}

// Usage
const events = new EventBus();
events.on('calculation:complete', result => updateUI(result));
events.on('error', err => showError(err));

// In calculator
events.emit('calculation:complete', { speed: 5000, feed: 0.005 });
```

### Command Pattern
**Use for:** Undo/redo, operation history
```javascript
class CommandHistory {
    constructor() {
        this.history = [];
        this.position = -1;
    }
    
    execute(command) {
        // Remove any redo history
        this.history = this.history.slice(0, this.position + 1);
        
        // Execute and store
        command.execute();
        this.history.push(command);
        this.position++;
    }
    
    undo() {
        if (this.position < 0) return false;
        this.history[this.position].undo();
        this.position--;
        return true;
    }
    
    redo() {
        if (this.position >= this.history.length - 1) return false;
        this.position++;
        this.history[this.position].execute();
        return true;
    }
}

// Command example
class ChangeParameterCommand {
    constructor(target, property, newValue) {
        this.target = target;
        this.property = property;
        this.newValue = newValue;
        this.oldValue = target[property];
    }
    
    execute() { this.target[this.property] = this.newValue; }
    undo() { this.target[this.property] = this.oldValue; }
}
```

### Builder Pattern
**Use for:** Complex object construction
```javascript
class ToolpathBuilder {
    constructor() {
        this.segments = [];
        this.currentPosition = { x: 0, y: 0, z: 0 };
    }
    
    rapid(x, y, z) {
        this.segments.push({
            type: 'rapid',
            from: { ...this.currentPosition },
            to: { x, y, z }
        });
        this.currentPosition = { x, y, z };
        return this;
    }
    
    linear(x, y, z, feed) {
        this.segments.push({
            type: 'linear',
            from: { ...this.currentPosition },
            to: { x, y, z },
            feed
        });
        this.currentPosition = { x, y, z };
        return this;
    }
    
    arc(x, y, z, i, j, k, clockwise, feed) {
        this.segments.push({
            type: clockwise ? 'cw_arc' : 'ccw_arc',
            from: { ...this.currentPosition },
            to: { x, y, z },
            center: { i, j, k },
            feed
        });
        this.currentPosition = { x, y, z };
        return this;
    }
    
    build() {
        return {
            segments: this.segments,
            bounds: this._calculateBounds(),
            totalLength: this._calculateLength()
        };
    }
}

// Usage - fluent API
const toolpath = new ToolpathBuilder()
    .rapid(0, 0, 10)
    .rapid(10, 10, 10)
    .linear(10, 10, -5, 100)
    .linear(50, 10, -5, 200)
    .arc(60, 20, -5, 10, 0, 0, true, 150)
    .rapid(0, 0, 50)
    .build();
```

### Decorator Pattern
**Use for:** Adding behavior (logging, caching, validation)
```javascript
// Add logging to any function
function withLogging(fn, name) {
    return function(...args) {
        console.log(`[${name}] Called with:`, args);
        const start = performance.now();
        try {
            const result = fn.apply(this, args);
            console.log(`[${name}] Returned:`, result, `(${(performance.now() - start).toFixed(2)}ms)`);
            return result;
        } catch (e) {
            console.error(`[${name}] Error:`, e);
            throw e;
        }
    };
}

// Add caching to any function
function withCache(fn, keyFn = JSON.stringify) {
    const cache = new Map();
    return function(...args) {
        const key = keyFn(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

// Add validation to any function
function withValidation(fn, validators) {
    return function(...args) {
        for (let i = 0; i < validators.length; i++) {
            const error = validators[i](args[i], i);
            if (error) throw new Error(`Argument ${i}: ${error}`);
        }
        return fn.apply(this, args);
    };
}

// Usage
const calculateSpeed = withLogging(
    withCache(
        withValidation(rawCalculateSpeed, [
            (m) => !m ? 'material required' : null,
            (t) => !t ? 'tool required' : null
        ])
    ),
    'calculateSpeed'
);
```

---

## Functional Patterns

### Pipe/Compose
**Use for:** Data transformation pipelines
```javascript
// Left-to-right pipe
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

// Right-to-left compose
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

// Usage - calculation pipeline
const calculateCuttingParams = pipe(
    getMaterialProperties,
    applyToolFactors,
    applyMachineConstraints,
    optimizeForToolLife,
    addSafetyMargins,
    roundToMachinePrecision
);

const result = calculateCuttingParams(initialParams);
```

### Map/Filter/Reduce
**Use for:** Data transformation
```javascript
// Find best tools for operation
const bestTools = tools
    .filter(t => t.type === operation.toolType)
    .filter(t => t.diameter >= operation.minDiam)
    .filter(t => t.diameter <= operation.maxDiam)
    .map(t => ({
        tool: t,
        score: scoreToolForOperation(t, operation)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(t => t.tool);

// Aggregate statistics
const stats = operations.reduce((acc, op) => ({
    totalTime: acc.totalTime + op.cycleTime,
    totalCost: acc.totalCost + op.cost,
    maxForce: Math.max(acc.maxForce, op.force),
    toolChanges: acc.toolChanges + (op.requiresToolChange ? 1 : 0)
}), { totalTime: 0, totalCost: 0, maxForce: 0, toolChanges: 0 });
```

### Currying/Partial Application
**Use for:** Reusable specialized functions
```javascript
// Curried calculation
const calculateForce = (material) => (tool) => (params) => {
    const kc = material.kc1_1 * Math.pow(params.chipThickness, -material.mc);
    return kc * params.chipThickness * params.doc * tool.flutes;
};

// Create specialized calculators
const steelForceCalc = calculateForce(materials.steel);
const aluminumForceCalc = calculateForce(materials.aluminum);

// Further specialize
const steelEndmillForce = steelForceCalc(tools.endmill);

// Use
const force = steelEndmillForce({ chipThickness: 0.1, doc: 5 });
```

---

## Error Handling Patterns

### Result Type
**Use for:** Explicit success/failure without exceptions
```javascript
class Result {
    constructor(success, value, error) {
        this.success = success;
        this.value = value;
        this.error = error;
    }
    
    static ok(value) { return new Result(true, value, null); }
    static err(error) { return new Result(false, null, error); }
    
    map(fn) {
        return this.success ? Result.ok(fn(this.value)) : this;
    }
    
    flatMap(fn) {
        return this.success ? fn(this.value) : this;
    }
    
    unwrap() {
        if (!this.success) throw new Error(this.error);
        return this.value;
    }
    
    unwrapOr(defaultValue) {
        return this.success ? this.value : defaultValue;
    }
}

// Usage
function parseToolData(raw) {
    if (!raw.diameter) return Result.err('Missing diameter');
    if (raw.diameter <= 0) return Result.err('Invalid diameter');
    return Result.ok({
        diameter: raw.diameter,
        flutes: raw.flutes || 4,
        // ...
    });
}

const result = parseToolData(rawData)
    .map(tool => calculateSpeed(tool))
    .map(speed => roundToNearest(speed, 100));

if (result.success) {
    console.log('Speed:', result.value);
} else {
    console.error('Error:', result.error);
}
```

### Retry with Backoff
**Use for:** Unreliable operations (API calls, file access)
```javascript
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (e) {
            lastError = e;
            const delay = baseDelay * Math.pow(2, attempt);
            console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    
    throw lastError;
}

// Usage
const data = await withRetry(() => fetchMachineData(machineId));
```

### Circuit Breaker
**Use for:** Prevent cascade failures
```javascript
class CircuitBreaker {
    constructor(fn, options = {}) {
        this.fn = fn;
        this.failures = 0;
        this.threshold = options.threshold || 5;
        this.resetTimeout = options.resetTimeout || 30000;
        this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
        this.lastFailure = null;
    }
    
    async call(...args) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailure > this.resetTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }
        
        try {
            const result = await this.fn(...args);
            this.onSuccess();
            return result;
        } catch (e) {
            this.onFailure();
            throw e;
        }
    }
    
    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }
    
    onFailure() {
        this.failures++;
        this.lastFailure = Date.now();
        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
        }
    }
}
```

---

## Async Patterns

### Promise.all with Error Handling
```javascript
// Process multiple items, collect all results and errors
async function processAll(items, processor) {
    const results = await Promise.allSettled(
        items.map(item => processor(item))
    );
    
    return {
        successful: results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value),
        failed: results
            .filter(r => r.status === 'rejected')
            .map((r, i) => ({ item: items[i], error: r.reason }))
    };
}
```

### Concurrent with Limit
```javascript
async function mapWithConcurrency(items, fn, concurrency = 5) {
    const results = [];
    const executing = [];
    
    for (const [i, item] of items.entries()) {
        const promise = fn(item, i).then(result => {
            results[i] = result;
        });
        executing.push(promise);
        
        if (executing.length >= concurrency) {
            await Promise.race(executing);
            executing.splice(executing.findIndex(p => p === promise), 1);
        }
    }
    
    await Promise.all(executing);
    return results;
}

// Usage - process tools 5 at a time
const processedTools = await mapWithConcurrency(
    tools,
    async tool => await calculateToolParams(tool),
    5
);
```

### Debounce/Throttle
```javascript
// Debounce - wait until activity stops
function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Throttle - limit call frequency
function throttle(fn, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Usage
const debouncedSearch = debounce(searchMaterials, 300);
const throttledUpdate = throttle(updateVisualization, 16);  // ~60fps
```
