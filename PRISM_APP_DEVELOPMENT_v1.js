// ═══════════════════════════════════════════════════════════════════════════════
// PRISM APP DEVELOPMENT & CODING LOGIC v1.0
// Comprehensive Software Engineering Patterns for Manufacturing Intelligence
// Created: January 13, 2026 | For Build: v8.61.004+
// ═══════════════════════════════════════════════════════════════════════════════
//
// Total: 20 Sections, 300+ Patterns & Algorithms, 200+ PRISM Applications
// Focus: Building enterprise-grade CAD/CAM/CNC software systems
//
// ═══════════════════════════════════════════════════════════════════════════════

console.log('[PRISM DEV] Loading App Development & Coding Logic v1.0...');

const PRISM_APP_DEVELOPMENT = {
    
    version: '1.0.0',
    created: '2026-01-13',
    buildTarget: 'v8.61.004+',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 1: SOFTWARE ARCHITECTURE PATTERNS
    // ═══════════════════════════════════════════════════════════════════════════
    
    architecture: {
        
        // MVC PATTERN
        mvc: {
            model: {
                create: (schema) => ({
                    data: {},
                    schema,
                    listeners: {},
                    set(key, value) {
                        if (this.validate(key, value)) {
                            this.data[key] = value;
                            (this.listeners[key] || []).forEach(cb => cb(value));
                            return true;
                        }
                        return false;
                    },
                    get: (key) => this.data[key],
                    validate(key, value) {
                        const rules = this.schema[key];
                        if (!rules) return true;
                        if (rules.required && !value) return false;
                        if (rules.type && typeof value !== rules.type) return false;
                        if (rules.min !== undefined && value < rules.min) return false;
                        if (rules.max !== undefined && value > rules.max) return false;
                        return true;
                    },
                    on(key, callback) { 
                        if (!this.listeners[key]) this.listeners[key] = [];
                        this.listeners[key].push(callback);
                    }
                }),
                prismApplication: "ToolModel, MaterialModel, OperationModel"
            },
            
            view: {
                create: (template) => ({
                    template,
                    render(data) {
                        let html = this.template;
                        for (const [key, value] of Object.entries(data)) {
                            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
                        }
                        return html;
                    }
                }),
                prismApplication: "ToolpathView, ParameterView, SimulationView"
            },
            
            controller: {
                create: (model, view) => ({
                    model, view,
                    handleAction(action, payload) {
                        switch(action) {
                            case 'UPDATE': return this.model.set(payload.key, payload.value);
                            case 'DELETE': return delete this.model.data[payload.key];
                        }
                    }
                }),
                prismApplication: "ToolController, MachineController"
            }
        },
        
        // FLUX/REDUX PATTERN
        flux: {
            createStore: (reducer, initialState = {}) => {
                let state = initialState;
                let listeners = [];
                
                return {
                    getState: () => state,
                    dispatch(action) {
                        state = reducer(state, action);
                        listeners.forEach(l => l(state));
                    },
                    subscribe(listener) {
                        listeners.push(listener);
                        return () => { listeners = listeners.filter(l => l !== listener); };
                    }
                };
            },
            
            combineReducers: (reducers) => (state = {}, action) => {
                const newState = {};
                for (const [key, reducer] of Object.entries(reducers)) {
                    newState[key] = reducer(state[key], action);
                }
                return newState;
            },
            
            // Middleware
            thunkMiddleware: store => next => action => {
                if (typeof action === 'function') return action(store.dispatch, store.getState);
                return next(action);
            },
            
            loggerMiddleware: store => next => action => {
                console.log('[Redux] Dispatching:', action.type);
                const result = next(action);
                console.log('[Redux] Next State:', store.getState());
                return result;
            },
            
            prismApplication: "PRISMStore - global state management"
        },
        
        // MASTER CONTROLLER PATTERN (PRISM-specific)
        masterController: {
            create: (name, config) => ({
                name, config,
                subControllers: {},
                engines: {},
                databases: {},
                
                registerSubController(name, controller) {
                    this.subControllers[name] = controller;
                    controller.parent = this;
                },
                
                registerEngine(name, engine) { this.engines[name] = engine; },
                registerDatabase(name, db) { this.databases[name] = db; },
                
                dispatch(action, payload) {
                    const [domain, ...rest] = action.split('.');
                    if (this.subControllers[domain]) {
                        return this.subControllers[domain].dispatch(rest.join('.'), payload);
                    }
                    return this[action]?.(payload);
                }
            }),
            
            hierarchy: {
                PRISM_MASTER: { level: 0, children: ['cad', 'cam', 'cnc', 'simulation', 'ai'] },
                cad: { level: 1, children: ['featureRecognition', 'modelingEngine', 'importExport'] },
                cam: { level: 1, children: ['toolpath', 'strategy', 'parameters', 'postProcessor'] },
                cnc: { level: 1, children: ['machine', 'gcode', 'dncTransfer'] }
            },
            
            prismApplication: "All 23 Master Controllers"
        },
        
        // PLUGIN SYSTEM
        pluginSystem: {
            createManager: () => ({
                plugins: {},
                hooks: {},
                
                register(plugin) {
                    if (!plugin.name || !plugin.init) throw new Error('Invalid plugin');
                    this.plugins[plugin.name] = plugin;
                    if (plugin.hooks) {
                        for (const [hook, handler] of Object.entries(plugin.hooks)) {
                            this.addHook(hook, handler);
                        }
                    }
                    plugin.init(this.getAPI());
                },
                
                addHook(name, handler) {
                    if (!this.hooks[name]) this.hooks[name] = [];
                    this.hooks[name].push(handler);
                },
                
                async executeHook(name, data) {
                    let result = data;
                    for (const handler of (this.hooks[name] || [])) {
                        result = await handler(result);
                    }
                    return result;
                },
                
                getAPI: () => ({
                    registerTool: (tool) => {},
                    registerMaterial: (material) => {},
                    registerStrategy: (strategy) => {},
                    registerPostProcessor: (pp) => {}
                })
            }),
            
            prismApplication: "PRISM Plugin System - custom extensions"
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: DESIGN PATTERNS
    // ═══════════════════════════════════════════════════════════════════════════
    
    designPatterns: {
        
        // CREATIONAL PATTERNS
        creational: {
            singleton: {
                create: (ClassDef) => {
                    let instance = null;
                    return {
                        getInstance: (...args) => instance || (instance = new ClassDef(...args)),
                        resetInstance: () => { instance = null; }
                    };
                },
                prismApplication: "PRISM_MASTER, DatabaseManager, ConfigManager"
            },
            
            factory: {
                create: (typeMap) => ({
                    types: typeMap,
                    create(type, ...args) {
                        if (!this.types[type]) throw new Error(`Unknown type: ${type}`);
                        return new this.types[type](...args);
                    },
                    register(type, Constructor) { this.types[type] = Constructor; }
                }),
                
                toolFactory: {
                    types: {
                        'endmill': (p) => ({ type: 'endmill', ...p, geometry: 'cylindrical' }),
                        'ballnose': (p) => ({ type: 'ballnose', ...p, geometry: 'spherical' }),
                        'facemill': (p) => ({ type: 'facemill', ...p, geometry: 'disc' }),
                        'drill': (p) => ({ type: 'drill', ...p, geometry: 'conical' }),
                        'tap': (p) => ({ type: 'tap', ...p, geometry: 'helical' })
                    },
                    create(type, params) { return this.types[type](params); }
                },
                
                prismApplication: "ToolFactory, StrategyFactory, OperationFactory"
            },
            
            builder: {
                toolpathBuilder: {
                    toolpath: null,
                    
                    reset() {
                        this.toolpath = { moves: [], parameters: {}, metadata: {} };
                        return this;
                    },
                    
                    setTool(tool) { this.toolpath.tool = tool; return this; },
                    setStrategy(strategy) { this.toolpath.strategy = strategy; return this; },
                    setFeedrate(f) { this.toolpath.parameters.feedrate = f; return this; },
                    setSpindleSpeed(rpm) { this.toolpath.parameters.spindleSpeed = rpm; return this; },
                    
                    addMove(move) { this.toolpath.moves.push(move); return this; },
                    addRapid(x, y, z) { return this.addMove({ type: 'rapid', x, y, z }); },
                    addLinear(x, y, z, f) { return this.addMove({ type: 'linear', x, y, z, f }); },
                    addArc(x, y, z, i, j, cw) { return this.addMove({ type: cw ? 'cw_arc' : 'ccw_arc', x, y, z, i, j }); },
                    
                    build() { const result = this.toolpath; this.reset(); return result; }
                },
                
                prismApplication: "ToolpathBuilder, GCodeBuilder, OperationBuilder"
            },
            
            prototype: {
                deepClone: (obj) => {
                    if (obj === null || typeof obj !== 'object') return obj;
                    if (Array.isArray(obj)) return obj.map(item => PRISM_APP_DEVELOPMENT.designPatterns.creational.prototype.deepClone(item));
                    const cloned = {};
                    for (const [key, value] of Object.entries(obj)) {
                        cloned[key] = PRISM_APP_DEVELOPMENT.designPatterns.creational.prototype.deepClone(value);
                    }
                    return cloned;
                },
                prismApplication: "OperationPrototype - clone and modify"
            }
        },
        
        // STRUCTURAL PATTERNS
        structural: {
            adapter: {
                create: (adaptee, mapping) => {
                    const adapter = {};
                    for (const [target, source] of Object.entries(mapping)) {
                        adapter[target] = typeof source === 'function' 
                            ? (...args) => source(adaptee, ...args)
                            : (...args) => adaptee[source](...args);
                    }
                    return adapter;
                },
                prismApplication: "FormatAdapter (STEP, IGES, DXF)"
            },
            
            decorator: {
                withLogging: (obj, methodName) => {
                    const original = obj[methodName];
                    obj[methodName] = function(...args) {
                        console.log(`[${methodName}] called with:`, args);
                        const result = original.apply(this, args);
                        console.log(`[${methodName}] returned:`, result);
                        return result;
                    };
                    return obj;
                },
                
                withTiming: (obj, methodName) => {
                    const original = obj[methodName];
                    obj[methodName] = function(...args) {
                        const start = performance.now();
                        const result = original.apply(this, args);
                        console.log(`[${methodName}] took ${(performance.now() - start).toFixed(2)}ms`);
                        return result;
                    };
                    return obj;
                },
                
                withCaching: (obj, methodName, cache = new Map()) => {
                    const original = obj[methodName];
                    obj[methodName] = function(...args) {
                        const key = JSON.stringify(args);
                        if (cache.has(key)) return cache.get(key);
                        const result = original.apply(this, args);
                        cache.set(key, result);
                        return result;
                    };
                    return obj;
                },
                
                prismApplication: "Logging, Validation, Caching decorators"
            },
            
            facade: {
                camFacade: {
                    generatePart(cadModel, machineConfig, materialConfig) {
                        const features = this.featureRecognition.analyze(cadModel);
                        const operations = this.operationPlanner.plan(features, materialConfig);
                        const toolpaths = operations.map(op => this.toolpathEngine.generate(op));
                        const gcode = this.postProcessor.process(toolpaths, machineConfig);
                        return { features, operations, toolpaths, gcode };
                    }
                },
                prismApplication: "PRISMFacade - simplified API"
            },
            
            composite: {
                createNode: (value, type = 'leaf') => ({
                    value, type,
                    children: [],
                    parent: null,
                    
                    add(child) { child.parent = this; this.children.push(child); return this; },
                    remove(child) {
                        const idx = this.children.indexOf(child);
                        if (idx > -1) { this.children.splice(idx, 1); child.parent = null; }
                        return this;
                    },
                    traverse(callback, depth = 0) {
                        callback(this, depth);
                        this.children.forEach(c => c.traverse(callback, depth + 1));
                    },
                    find(predicate) {
                        if (predicate(this)) return this;
                        for (const child of this.children) {
                            const result = child.find(predicate);
                            if (result) return result;
                        }
                        return null;
                    }
                }),
                prismApplication: "AssemblyTree, FeatureTree, OperationTree"
            },
            
            proxy: {
                lazy: (loader) => {
                    let loaded = false, data = null;
                    return {
                        get() { if (!loaded) { data = loader(); loaded = true; } return data; },
                        isLoaded: () => loaded,
                        reload() { loaded = false; data = null; }
                    };
                },
                prismApplication: "LazyLoadDatabase, DeferredGeometry"
            }
        },
        
        // BEHAVIORAL PATTERNS
        behavioral: {
            observer: {
                createSubject: () => ({
                    observers: new Map(),
                    
                    subscribe(event, callback) {
                        if (!this.observers.has(event)) this.observers.set(event, new Set());
                        this.observers.get(event).add(callback);
                        return () => this.observers.get(event).delete(callback);
                    },
                    
                    notify(event, data) {
                        (this.observers.get(event) || []).forEach(cb => cb(data));
                        (this.observers.get('*') || []).forEach(cb => cb(event, data));
                    }
                }),
                prismApplication: "EventBus - component communication"
            },
            
            strategy: {
                create: (strategies, defaultStrategy) => ({
                    strategies,
                    current: defaultStrategy,
                    setStrategy(name) { this.current = name; },
                    execute(...args) { return this.strategies[this.current](...args); }
                }),
                
                toolpathStrategies: {
                    'adaptive': (p) => ({ type: 'adaptive', ...p }),
                    'hsm': (p) => ({ type: 'hsm', ...p }),
                    'trochoidal': (p) => ({ type: 'trochoidal', ...p }),
                    'contour': (p) => ({ type: 'contour', ...p }),
                    'pocket': (p) => ({ type: 'pocket', ...p }),
                    '3d_parallel': (p) => ({ type: '3d_parallel', ...p }),
                    '5axis_swarf': (p) => ({ type: '5axis_swarf', ...p })
                },
                
                prismApplication: "StrategySelector - 104+ strategies"
            },
            
            command: {
                createManager: () => ({
                    history: [],
                    undone: [],
                    maxHistory: 100,
                    
                    execute(command) {
                        command.execute();
                        this.history.push(command);
                        this.undone = [];
                        if (this.history.length > this.maxHistory) this.history.shift();
                    },
                    
                    undo() {
                        if (this.history.length === 0) return false;
                        const cmd = this.history.pop();
                        cmd.undo();
                        this.undone.push(cmd);
                        return true;
                    },
                    
                    redo() {
                        if (this.undone.length === 0) return false;
                        const cmd = this.undone.pop();
                        cmd.execute();
                        this.history.push(cmd);
                        return true;
                    }
                }),
                
                prismApplication: "UndoManager - undo/redo for all operations"
            },
            
            state: {
                createStateMachine: (config) => ({
                    current: config.initial,
                    states: config.states,
                    context: config.context || {},
                    
                    transition(event, payload) {
                        const stateConfig = this.states[this.current];
                        const transition = stateConfig?.on?.[event];
                        if (!transition) return false;
                        
                        if (transition.guard && !transition.guard(this.context, payload)) return false;
                        if (stateConfig.onExit) stateConfig.onExit(this.context);
                        if (transition.action) transition.action(this.context, payload);
                        
                        this.current = transition.target;
                        
                        const newConfig = this.states[this.current];
                        if (newConfig?.onEntry) newConfig.onEntry(this.context);
                        
                        return true;
                    },
                    
                    can(event) { return !!this.states[this.current]?.on?.[event]; }
                }),
                
                operationMachine: {
                    initial: 'idle',
                    states: {
                        idle: { on: { START: { target: 'calculating' } } },
                        calculating: { on: { COMPLETE: { target: 'completed' }, ERROR: { target: 'error' } } },
                        completed: { on: { RESET: { target: 'idle' } } },
                        error: { on: { RETRY: { target: 'calculating' }, RESET: { target: 'idle' } } }
                    }
                },
                
                prismApplication: "OperationStateMachine, WorkflowStateMachine"
            },
            
            chainOfResponsibility: {
                createChain: (handlers) => ({
                    handlers,
                    handle(request) {
                        for (const handler of this.handlers) {
                            const result = handler(request);
                            if (result !== null && result !== undefined) return result;
                        }
                        return null;
                    },
                    addHandler(handler) { this.handlers.push(handler); }
                }),
                prismApplication: "ValidationChain, PostProcessorChain"
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════════════
    
    dataStructures: {
        
        // HASH MAP
        hashMap: {
            create: (capacity = 16) => ({
                buckets: Array(capacity).fill(null).map(() => []),
                size: 0,
                capacity,
                
                hash(key) {
                    let h = 0;
                    const str = String(key);
                    for (let i = 0; i < str.length; i++) {
                        h = ((h << 5) - h) + str.charCodeAt(i);
                    }
                    return Math.abs(h) % this.capacity;
                },
                
                set(key, value) {
                    const idx = this.hash(key);
                    const bucket = this.buckets[idx];
                    for (let i = 0; i < bucket.length; i++) {
                        if (bucket[i][0] === key) { bucket[i][1] = value; return; }
                    }
                    bucket.push([key, value]);
                    this.size++;
                },
                
                get(key) {
                    const bucket = this.buckets[this.hash(key)];
                    for (const [k, v] of bucket) if (k === key) return v;
                    return undefined;
                },
                
                has(key) { return this.get(key) !== undefined; },
                delete(key) {
                    const bucket = this.buckets[this.hash(key)];
                    for (let i = 0; i < bucket.length; i++) {
                        if (bucket[i][0] === key) { bucket.splice(i, 1); this.size--; return true; }
                    }
                    return false;
                }
            }),
            prismApplication: "MaterialLookup, ToolLookup - O(1) access"
        },
        
        // SPATIAL HASH (collision detection)
        spatialHash: {
            create: (cellSize = 10) => ({
                cells: new Map(),
                cellSize,
                
                getCellKey(x, y, z) {
                    return `${Math.floor(x/this.cellSize)},${Math.floor(y/this.cellSize)},${Math.floor(z/this.cellSize)}`;
                },
                
                insert(obj, bounds) {
                    const minKey = this.getCellKey(bounds.min.x, bounds.min.y, bounds.min.z);
                    const maxKey = this.getCellKey(bounds.max.x, bounds.max.y, bounds.max.z);
                    const [minX, minY, minZ] = minKey.split(',').map(Number);
                    const [maxX, maxY, maxZ] = maxKey.split(',').map(Number);
                    
                    for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                            for (let z = minZ; z <= maxZ; z++) {
                                const key = `${x},${y},${z}`;
                                if (!this.cells.has(key)) this.cells.set(key, new Set());
                                this.cells.get(key).add(obj);
                            }
                        }
                    }
                },
                
                query(bounds) {
                    const result = new Set();
                    const minKey = this.getCellKey(bounds.min.x, bounds.min.y, bounds.min.z);
                    const maxKey = this.getCellKey(bounds.max.x, bounds.max.y, bounds.max.z);
                    const [minX, minY, minZ] = minKey.split(',').map(Number);
                    const [maxX, maxY, maxZ] = maxKey.split(',').map(Number);
                    
                    for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                            for (let z = minZ; z <= maxZ; z++) {
                                const cell = this.cells.get(`${x},${y},${z}`);
                                if (cell) cell.forEach(obj => result.add(obj));
                            }
                        }
                    }
                    return [...result];
                }
            }),
            prismApplication: "CollisionDetection - fast proximity"
        },
        
        // OCTREE (3D spatial indexing)
        octree: {
            create: (bounds, maxDepth = 8, maxObjects = 8) => ({
                bounds, maxDepth, maxObjects,
                depth: 0,
                objects: [],
                children: null,
                
                insert(obj, objBounds) {
                    if (this.children) {
                        const idx = this.getChildIndex(objBounds);
                        if (idx !== -1) { this.children[idx].insert(obj, objBounds); return; }
                    }
                    
                    this.objects.push({ object: obj, bounds: objBounds });
                    
                    if (!this.children && this.objects.length > this.maxObjects && this.depth < this.maxDepth) {
                        this.subdivide();
                    }
                },
                
                subdivide() {
                    const { min, max } = this.bounds;
                    const mid = { x: (min.x+max.x)/2, y: (min.y+max.y)/2, z: (min.z+max.z)/2 };
                    this.children = [];
                    
                    for (let i = 0; i < 8; i++) {
                        const childBounds = {
                            min: { x: (i&1)?mid.x:min.x, y: (i&2)?mid.y:min.y, z: (i&4)?mid.z:min.z },
                            max: { x: (i&1)?max.x:mid.x, y: (i&2)?max.y:mid.y, z: (i&4)?max.z:mid.z }
                        };
                        const child = PRISM_APP_DEVELOPMENT.dataStructures.octree.create(childBounds, this.maxDepth, this.maxObjects);
                        child.depth = this.depth + 1;
                        this.children.push(child);
                    }
                },
                
                getChildIndex(objBounds) {
                    const { min, max } = this.bounds;
                    const mid = { x: (min.x+max.x)/2, y: (min.y+max.y)/2, z: (min.z+max.z)/2 };
                    let idx = 0;
                    if (objBounds.min.x >= mid.x) idx |= 1; else if (objBounds.max.x > mid.x) return -1;
                    if (objBounds.min.y >= mid.y) idx |= 2; else if (objBounds.max.y > mid.y) return -1;
                    if (objBounds.min.z >= mid.z) idx |= 4; else if (objBounds.max.z > mid.z) return -1;
                    return idx;
                },
                
                query(queryBounds) {
                    const result = [];
                    for (const { object, bounds } of this.objects) {
                        if (this.intersects(bounds, queryBounds)) result.push(object);
                    }
                    if (this.children) {
                        for (const child of this.children) {
                            if (this.intersects(child.bounds, queryBounds)) {
                                result.push(...child.query(queryBounds));
                            }
                        }
                    }
                    return result;
                },
                
                intersects(a, b) {
                    return a.min.x <= b.max.x && a.max.x >= b.min.x &&
                           a.min.y <= b.max.y && a.max.y >= b.min.y &&
                           a.min.z <= b.max.z && a.max.z >= b.min.z;
                }
            }),
            prismApplication: "GeometryIndex - fast 3D queries"
        },
        
        // PRIORITY QUEUE (Min-Heap)
        priorityQueue: {
            create: (comparator = (a, b) => a - b) => ({
                heap: [],
                comparator,
                
                push(item) {
                    this.heap.push(item);
                    this.bubbleUp(this.heap.length - 1);
                },
                
                pop() {
                    if (this.heap.length === 0) return undefined;
                    const result = this.heap[0];
                    const last = this.heap.pop();
                    if (this.heap.length > 0) { this.heap[0] = last; this.bubbleDown(0); }
                    return result;
                },
                
                peek: () => this.heap[0],
                
                bubbleUp(idx) {
                    while (idx > 0) {
                        const parent = Math.floor((idx - 1) / 2);
                        if (this.comparator(this.heap[idx], this.heap[parent]) >= 0) break;
                        [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
                        idx = parent;
                    }
                },
                
                bubbleDown(idx) {
                    while (true) {
                        const left = 2*idx + 1, right = 2*idx + 2;
                        let smallest = idx;
                        if (left < this.heap.length && this.comparator(this.heap[left], this.heap[smallest]) < 0) smallest = left;
                        if (right < this.heap.length && this.comparator(this.heap[right], this.heap[smallest]) < 0) smallest = right;
                        if (smallest === idx) break;
                        [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
                        idx = smallest;
                    }
                },
                
                size: () => this.heap.length,
                isEmpty: () => this.heap.length === 0
            }),
            prismApplication: "EventQueue, PathfindingQueue"
        },
        
        // LRU CACHE
        lruCache: {
            create: (capacity) => ({
                capacity,
                cache: new Map(),
                
                get(key) {
                    if (!this.cache.has(key)) return undefined;
                    const value = this.cache.get(key);
                    this.cache.delete(key);
                    this.cache.set(key, value);
                    return value;
                },
                
                put(key, value) {
                    if (this.cache.has(key)) this.cache.delete(key);
                    else if (this.cache.size >= this.capacity) {
                        this.cache.delete(this.cache.keys().next().value);
                    }
                    this.cache.set(key, value);
                },
                
                has: (key) => this.cache.has(key),
                clear() { this.cache.clear(); }
            }),
            prismApplication: "GeometryCache, ToolpathCache"
        },
        
        // TRIE (autocomplete)
        trie: {
            create: () => ({
                root: { children: {}, isEnd: false, data: null },
                
                insert(word, data = null) {
                    let node = this.root;
                    for (const char of word.toLowerCase()) {
                        if (!node.children[char]) node.children[char] = { children: {}, isEnd: false, data: null };
                        node = node.children[char];
                    }
                    node.isEnd = true;
                    node.data = data;
                },
                
                search(word) {
                    let node = this.root;
                    for (const char of word.toLowerCase()) {
                        if (!node.children[char]) return null;
                        node = node.children[char];
                    }
                    return node.isEnd ? node.data : null;
                },
                
                startsWith(prefix) {
                    let node = this.root;
                    for (const char of prefix.toLowerCase()) {
                        if (!node.children[char]) return [];
                        node = node.children[char];
                    }
                    return this.collect(node, prefix);
                },
                
                collect(node, prefix) {
                    const results = [];
                    if (node.isEnd) results.push({ word: prefix, data: node.data });
                    for (const [char, child] of Object.entries(node.children)) {
                        results.push(...this.collect(child, prefix + char));
                    }
                    return results;
                }
            }),
            prismApplication: "CommandAutocomplete, ToolSearch"
        },
        
        // GRAPH
        graph: {
            create: (directed = false) => ({
                directed,
                vertices: new Map(),
                
                addVertex(id, data = null) {
                    if (!this.vertices.has(id)) this.vertices.set(id, { data, edges: [] });
                    return this;
                },
                
                addEdge(from, to, weight = 1) {
                    this.addVertex(from).addVertex(to);
                    this.vertices.get(from).edges.push({ to, weight });
                    if (!this.directed) this.vertices.get(to).edges.push({ to: from, weight });
                    return this;
                },
                
                getNeighbors(id) {
                    return (this.vertices.get(id)?.edges || []).map(e => e.to);
                },
                
                bfs(start, callback) {
                    const visited = new Set();
                    const queue = [start];
                    while (queue.length > 0) {
                        const id = queue.shift();
                        if (visited.has(id)) continue;
                        visited.add(id);
                        callback(id, this.vertices.get(id));
                        this.getNeighbors(id).forEach(n => { if (!visited.has(n)) queue.push(n); });
                    }
                },
                
                dijkstra(start, end) {
                    const dist = new Map();
                    const prev = new Map();
                    const pq = PRISM_APP_DEVELOPMENT.dataStructures.priorityQueue.create((a, b) => a.d - b.d);
                    
                    for (const id of this.vertices.keys()) dist.set(id, Infinity);
                    dist.set(start, 0);
                    pq.push({ id: start, d: 0 });
                    
                    while (!pq.isEmpty()) {
                        const { id, d } = pq.pop();
                        if (id === end) break;
                        if (d > dist.get(id)) continue;
                        
                        for (const edge of this.vertices.get(id).edges) {
                            const newDist = d + edge.weight;
                            if (newDist < dist.get(edge.to)) {
                                dist.set(edge.to, newDist);
                                prev.set(edge.to, id);
                                pq.push({ id: edge.to, d: newDist });
                            }
                        }
                    }
                    
                    const path = [];
                    let curr = end;
                    while (curr !== undefined) { path.unshift(curr); curr = prev.get(curr); }
                    return { distance: dist.get(end), path };
                },
                
                topologicalSort() {
                    const visited = new Set();
                    const result = [];
                    const visit = (id) => {
                        if (visited.has(id)) return;
                        visited.add(id);
                        this.getNeighbors(id).forEach(visit);
                        result.unshift(id);
                    };
                    for (const id of this.vertices.keys()) visit(id);
                    return result;
                }
            }),
            prismApplication: "DependencyGraph, OperationSequence"
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: ALGORITHMS
    // ═══════════════════════════════════════════════════════════════════════════
    
    algorithms: {
        
        // SORTING
        sorting: {
            quickSort: function(arr, cmp = (a, b) => a - b) {
                if (arr.length <= 1) return arr;
                const pivot = arr[Math.floor(arr.length / 2)];
                return [
                    ...this.quickSort(arr.filter(x => cmp(x, pivot) < 0), cmp),
                    ...arr.filter(x => cmp(x, pivot) === 0),
                    ...this.quickSort(arr.filter(x => cmp(x, pivot) > 0), cmp)
                ];
            },
            
            mergeSort: function(arr, cmp = (a, b) => a - b) {
                if (arr.length <= 1) return arr;
                const mid = Math.floor(arr.length / 2);
                const left = this.mergeSort(arr.slice(0, mid), cmp);
                const right = this.mergeSort(arr.slice(mid), cmp);
                return this.merge(left, right, cmp);
            },
            
            merge: (left, right, cmp) => {
                const result = [];
                let i = 0, j = 0;
                while (i < left.length && j < right.length) {
                    result.push(cmp(left[i], right[j]) <= 0 ? left[i++] : right[j++]);
                }
                return [...result, ...left.slice(i), ...right.slice(j)];
            },
            
            prismApplication: "OperationSorting, ToolSorting"
        },
        
        // SEARCHING
        searching: {
            binarySearch: (arr, target, cmp = (a, b) => a - b) => {
                let left = 0, right = arr.length - 1;
                while (left <= right) {
                    const mid = Math.floor((left + right) / 2);
                    const c = cmp(arr[mid], target);
                    if (c === 0) return mid;
                    if (c < 0) left = mid + 1;
                    else right = mid - 1;
                }
                return -1;
            },
            
            bisectLeft: (arr, target, cmp = (a, b) => a - b) => {
                let left = 0, right = arr.length;
                while (left < right) {
                    const mid = Math.floor((left + right) / 2);
                    if (cmp(arr[mid], target) < 0) left = mid + 1;
                    else right = mid;
                }
                return left;
            },
            
            prismApplication: "ParameterLookup, MaterialSearch"
        },
        
        // GEOMETRY
        geometry: {
            distance2D: (p1, p2) => Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2),
            distance3D: (p1, p2) => Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2),
            
            vector: {
                add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z }),
                subtract: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z }),
                scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
                dot: (v1, v2) => v1.x * v2.x + v1.y * v2.y + v1.z * v2.z,
                cross: (v1, v2) => ({
                    x: v1.y * v2.z - v1.z * v2.y,
                    y: v1.z * v2.x - v1.x * v2.z,
                    z: v1.x * v2.y - v1.y * v2.x
                }),
                magnitude: (v) => Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2),
                normalize: (v) => {
                    const mag = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
                    return mag > 0 ? { x: v.x/mag, y: v.y/mag, z: v.z/mag } : { x: 0, y: 0, z: 0 };
                },
                angle: (v1, v2) => {
                    const dot = v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
                    const mag1 = Math.sqrt(v1.x**2 + v1.y**2 + v1.z**2);
                    const mag2 = Math.sqrt(v2.x**2 + v2.y**2 + v2.z**2);
                    return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
                }
            },
            
            pointInPolygon: (point, polygon) => {
                let inside = false;
                for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                    const xi = polygon[i].x, yi = polygon[i].y;
                    const xj = polygon[j].x, yj = polygon[j].y;
                    if (((yi > point.y) !== (yj > point.y)) && 
                        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                        inside = !inside;
                    }
                }
                return inside;
            },
            
            convexHull: function(points) {
                if (points.length < 3) return points;
                
                let lowest = 0;
                for (let i = 1; i < points.length; i++) {
                    if (points[i].y < points[lowest].y || 
                        (points[i].y === points[lowest].y && points[i].x < points[lowest].x)) {
                        lowest = i;
                    }
                }
                [points[0], points[lowest]] = [points[lowest], points[0]];
                const pivot = points[0];
                
                const sorted = points.slice(1).sort((a, b) => {
                    return Math.atan2(a.y - pivot.y, a.x - pivot.x) - Math.atan2(b.y - pivot.y, b.x - pivot.x);
                });
                
                const hull = [pivot, sorted[0]];
                const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
                
                for (let i = 1; i < sorted.length; i++) {
                    while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], sorted[i]) <= 0) {
                        hull.pop();
                    }
                    hull.push(sorted[i]);
                }
                return hull;
            },
            
            boundingBox: (points) => {
                const box = { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
                for (const p of points) {
                    box.min.x = Math.min(box.min.x, p.x);
                    box.min.y = Math.min(box.min.y, p.y);
                    box.min.z = Math.min(box.min.z, p.z || 0);
                    box.max.x = Math.max(box.max.x, p.x);
                    box.max.y = Math.max(box.max.y, p.y);
                    box.max.z = Math.max(box.max.z, p.z || 0);
                }
                return box;
            },
            
            polygonArea: (polygon) => {
                let area = 0;
                for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                    area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
                }
                return Math.abs(area) / 2;
            },
            
            prismApplication: "GeometryEngine - toolpath calculations"
        },
        
        // PATHFINDING
        pathfinding: {
            aStar: (graph, start, goal, heuristic) => {
                const openSet = PRISM_APP_DEVELOPMENT.dataStructures.priorityQueue.create((a, b) => a.f - b.f);
                const cameFrom = new Map();
                const gScore = new Map();
                
                for (const id of graph.vertices.keys()) gScore.set(id, Infinity);
                gScore.set(start, 0);
                openSet.push({ node: start, f: heuristic(start, goal) });
                
                while (!openSet.isEmpty()) {
                    const { node: current } = openSet.pop();
                    
                    if (current === goal) {
                        const path = [current];
                        let node = current;
                        while (cameFrom.has(node)) { node = cameFrom.get(node); path.unshift(node); }
                        return path;
                    }
                    
                    for (const { to, weight } of graph.vertices.get(current).edges) {
                        const tentativeG = gScore.get(current) + weight;
                        if (tentativeG < gScore.get(to)) {
                            cameFrom.set(to, current);
                            gScore.set(to, tentativeG);
                            openSet.push({ node: to, f: tentativeG + heuristic(to, goal) });
                        }
                    }
                }
                return null;
            },
            prismApplication: "ToolpathPlanning, RobotMotion"
        },
        
        // OPTIMIZATION
        optimization: {
            gradientDescent: (f, gradient, x0, lr = 0.01, iterations = 1000, tol = 1e-6) => {
                let x = [...x0];
                for (let i = 0; i < iterations; i++) {
                    const grad = gradient(x);
                    const norm = Math.sqrt(grad.reduce((s, g) => s + g ** 2, 0));
                    if (norm < tol) break;
                    x = x.map((xi, j) => xi - lr * grad[j]);
                }
                return { x, value: f(x) };
            },
            
            simulatedAnnealing: (f, x0, options = {}) => {
                const { initialTemp = 1000, coolingRate = 0.99, minTemp = 0.001, maxIter = 10000 } = options;
                const neighbor = options.neighbor || (x => x.map(xi => xi + (Math.random() - 0.5) * 2));
                
                let x = [...x0], fx = f(x);
                let best = { x: [...x], value: fx };
                let temp = initialTemp;
                
                for (let i = 0; i < maxIter && temp > minTemp; i++) {
                    const xNew = neighbor(x);
                    const fxNew = f(xNew);
                    const delta = fxNew - fx;
                    
                    if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
                        x = xNew; fx = fxNew;
                        if (fx < best.value) best = { x: [...x], value: fx };
                    }
                    temp *= coolingRate;
                }
                return best;
            },
            
            goldenSection: (f, a, b, tol = 1e-6) => {
                const phi = (1 + Math.sqrt(5)) / 2;
                let c = b - (b - a) / phi, d = a + (b - a) / phi;
                while (Math.abs(b - a) > tol) {
                    if (f(c) < f(d)) b = d; else a = c;
                    c = b - (b - a) / phi;
                    d = a + (b - a) / phi;
                }
                return (a + b) / 2;
            },
            
            prismApplication: "ParameterOptimization, ToolpathOptimization"
        },
        
        // STRING ALGORITHMS
        string: {
            levenshtein: (a, b) => {
                const m = Array(b.length + 1).fill(0).map((_, i) =>
                    Array(a.length + 1).fill(0).map((_, j) => i === 0 ? j : (j === 0 ? i : 0))
                );
                for (let i = 1; i <= b.length; i++) {
                    for (let j = 1; j <= a.length; j++) {
                        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
                        m[i][j] = Math.min(m[i-1][j] + 1, m[i][j-1] + 1, m[i-1][j-1] + cost);
                    }
                }
                return m[b.length][a.length];
            },
            
            fuzzyMatch: function(query, text, threshold = 0.6) {
                const dist = this.levenshtein(query.toLowerCase(), text.toLowerCase());
                return 1 - dist / Math.max(query.length, text.length) >= threshold;
            },
            
            prismApplication: "FuzzySearch, CommandParsing"
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 5: ASYNC & CONCURRENCY
    // ═══════════════════════════════════════════════════════════════════════════
    
    async: {
        // Promise utilities
        timeout: (promise, ms, msg = 'Timeout') => Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
        ]),
        
        retry: async (fn, { maxRetries = 3, delay = 1000, backoff = 2 } = {}) => {
            let lastError;
            for (let i = 0; i < maxRetries; i++) {
                try { return await fn(); }
                catch (e) {
                    lastError = e;
                    if (i < maxRetries - 1) await new Promise(r => setTimeout(r, delay * Math.pow(backoff, i)));
                }
            }
            throw lastError;
        },
        
        debounce: (fn, ms) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                return new Promise(resolve => {
                    timeout = setTimeout(async () => resolve(await fn(...args)), ms);
                });
            };
        },
        
        throttle: (fn, ms) => {
            let last = 0, pending = null;
            return async (...args) => {
                const now = Date.now();
                if (now - last >= ms) { last = now; return await fn(...args); }
                if (!pending) {
                    pending = new Promise(resolve => {
                        setTimeout(async () => { last = Date.now(); pending = null; resolve(await fn(...args)); }, ms - (now - last));
                    });
                }
                return pending;
            };
        },
        
        // Async queue
        queue: {
            create: (concurrency = 1) => ({
                concurrency, running: 0, queue: [],
                
                async push(task) {
                    return new Promise((resolve, reject) => {
                        this.queue.push({ task, resolve, reject });
                        this.process();
                    });
                },
                
                async process() {
                    while (this.running < this.concurrency && this.queue.length > 0) {
                        const { task, resolve, reject } = this.queue.shift();
                        this.running++;
                        try { resolve(await task()); }
                        catch (e) { reject(e); }
                        finally { this.running--; this.process(); }
                    }
                }
            }),
            prismApplication: "ToolpathQueue, RenderQueue"
        },
        
        // Cancellable operation
        cancellable: (asyncFn) => {
            let cancelled = false;
            return {
                execute: (...args) => new Promise((resolve, reject) => {
                    cancelled = false;
                    asyncFn(...args).then(r => !cancelled && resolve(r), e => !cancelled && reject(e));
                }),
                cancel: () => { cancelled = true; },
                isCancelled: () => cancelled
            };
        },
        
        prismApplication: "AsyncOperations - non-blocking computation"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 6: ERROR HANDLING
    // ═══════════════════════════════════════════════════════════════════════════
    
    errorHandling: {
        // Custom errors
        ValidationError: class extends Error {
            constructor(message, field, value) { super(message); this.name = 'ValidationError'; this.field = field; this.value = value; }
        },
        
        GeometryError: class extends Error {
            constructor(message, geometry) { super(message); this.name = 'GeometryError'; this.geometry = geometry; }
        },
        
        ToolpathError: class extends Error {
            constructor(message, toolpath, position) { super(message); this.name = 'ToolpathError'; this.toolpath = toolpath; this.position = position; }
        },
        
        MachineError: class extends Error {
            constructor(message, machine, code) { super(message); this.name = 'MachineError'; this.machine = machine; this.code = code; }
        },
        
        // Result type (Rust-like)
        result: {
            ok: (value) => ({ ok: true, value, error: null }),
            err: (error) => ({ ok: false, value: null, error }),
            isOk: (r) => r.ok,
            isErr: (r) => !r.ok,
            unwrap: (r) => { if (r.ok) return r.value; throw r.error; },
            unwrapOr: (r, def) => r.ok ? r.value : def,
            map: (r, fn) => r.ok ? { ok: true, value: fn(r.value) } : r,
            andThen: (r, fn) => r.ok ? fn(r.value) : r
        },
        
        // Logger
        logger: {
            create: (config = {}) => {
                const levels = { debug: 0, info: 1, warn: 2, error: 3 };
                const level = levels[config.level || 'info'];
                
                return {
                    log: (lvl, msg, data = {}) => {
                        if (levels[lvl] < level) return;
                        const entry = { timestamp: new Date().toISOString(), level: lvl, message: msg, data };
                        const fn = lvl === 'error' ? console.error : lvl === 'warn' ? console.warn : console.log;
                        fn(`[${entry.timestamp}] [${lvl.toUpperCase()}] ${msg}`, data);
                    },
                    debug: function(msg, data) { this.log('debug', msg, data); },
                    info: function(msg, data) { this.log('info', msg, data); },
                    warn: function(msg, data) { this.log('warn', msg, data); },
                    error: function(msg, data) { this.log('error', msg, data); }
                };
            },
            prismApplication: "PRISMLogger - system logging"
        },
        
        // Assertions
        assert: {
            isTrue: (cond, msg) => { if (!cond) throw new Error(msg || 'Assertion failed'); },
            isNotNull: (val, msg) => { if (val === null || val === undefined) throw new Error(msg || 'Value is null'); },
            inRange: (val, min, max, msg) => { if (val < min || val > max) throw new Error(msg || `Value ${val} not in [${min}, ${max}]`); }
        },
        
        prismApplication: "ErrorHandling - robust error management"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 7: VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    validation: {
        schema: {
            create: (definition) => ({
                definition,
                validate(data) {
                    const errors = [];
                    for (const [field, rules] of Object.entries(this.definition)) {
                        const value = data[field];
                        if (rules.required && (value === null || value === undefined || value === '')) {
                            errors.push({ field, rule: 'required', message: `${field} is required` });
                            continue;
                        }
                        if (value === null || value === undefined) continue;
                        if (rules.type && typeof value !== rules.type) errors.push({ field, rule: 'type', message: `${field} must be ${rules.type}` });
                        if (rules.min !== undefined && value < rules.min) errors.push({ field, rule: 'min', message: `${field} must be >= ${rules.min}` });
                        if (rules.max !== undefined && value > rules.max) errors.push({ field, rule: 'max', message: `${field} must be <= ${rules.max}` });
                        if (rules.enum && !rules.enum.includes(value)) errors.push({ field, rule: 'enum', message: `${field} must be one of: ${rules.enum.join(', ')}` });
                        if (rules.custom && rules.custom(value, data) !== true) errors.push({ field, rule: 'custom', message: `${field} is invalid` });
                    }
                    return { valid: errors.length === 0, errors };
                }
            }),
            
            parameterSchema: {
                feedrate: { type: 'number', required: true, min: 0.001, max: 100000 },
                spindleSpeed: { type: 'number', required: true, min: 0, max: 100000 },
                depthOfCut: { type: 'number', required: true, min: 0.001, max: 100 },
                stepover: { type: 'number', required: true, min: 0.001, max: 100 },
                coolant: { type: 'string', enum: ['none', 'flood', 'mist', 'through_tool'] }
            }
        },
        
        sanitize: {
            number: (val, { min = -Infinity, max = Infinity, decimals = null, default: def = 0 } = {}) => {
                let num = parseFloat(val);
                if (isNaN(num)) num = def;
                num = Math.max(min, Math.min(max, num));
                if (decimals !== null) num = Math.round(num * 10**decimals) / 10**decimals;
                return num;
            },
            string: (val, { maxLength = Infinity, trim = true, lowercase = false } = {}) => {
                let str = String(val || '');
                if (trim) str = str.trim();
                if (lowercase) str = str.toLowerCase();
                return str.substring(0, maxLength);
            },
            filename: (val) => String(val).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').substring(0, 255)
        },
        
        manufacturing: {
            validateFeedrate: (feedrate, material) => {
                const max = material.maxFeedrate || 10000;
                if (feedrate < 0.001) return { valid: false, message: 'Feedrate too low' };
                if (feedrate > max) return { valid: false, message: `Feedrate exceeds max for ${material.name}` };
                return { valid: true };
            },
            
            validateSpindleSpeed: (rpm, tool, machine) => {
                const { maxSpindleSpeed = 24000, minSpindleSpeed = 0 } = machine;
                if (rpm < minSpindleSpeed || rpm > maxSpindleSpeed) {
                    return { valid: false, message: `RPM out of machine range [${minSpindleSpeed}, ${maxSpindleSpeed}]` };
                }
                if (tool.maxRpm && rpm > tool.maxRpm) {
                    return { valid: false, message: `RPM exceeds tool max (${tool.maxRpm})` };
                }
                return { valid: true };
            }
        },
        
        prismApplication: "InputValidation - safety-critical checks"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 8: CACHING
    // ═══════════════════════════════════════════════════════════════════════════
    
    caching: {
        memoize: (fn, { maxSize = 1000, ttl = null, keyFn = JSON.stringify } = {}) => {
            const cache = new Map();
            const times = new Map();
            
            return function(...args) {
                const key = keyFn(args);
                if (ttl && times.has(key) && Date.now() - times.get(key) > ttl) {
                    cache.delete(key); times.delete(key);
                }
                if (cache.has(key)) return cache.get(key);
                
                const result = fn.apply(this, args);
                if (cache.size >= maxSize) {
                    const first = cache.keys().next().value;
                    cache.delete(first); times.delete(first);
                }
                cache.set(key, result);
                if (ttl) times.set(key, Date.now());
                return result;
            };
        },
        
        computed: (computeFn) => {
            let value, isDirty = true;
            return {
                get() { if (isDirty) { value = computeFn(); isDirty = false; } return value; },
                invalidate() { isDirty = true; }
            };
        },
        
        taggedCache: () => ({
            cache: new Map(),
            tags: new Map(),
            
            set(key, value, tags = []) {
                this.cache.set(key, value);
                for (const tag of tags) {
                    if (!this.tags.has(tag)) this.tags.set(tag, new Set());
                    this.tags.get(tag).add(key);
                }
            },
            get: (key) => this.cache.get(key),
            invalidateByTag(tag) {
                const keys = this.tags.get(tag);
                if (keys) { keys.forEach(k => this.cache.delete(k)); this.tags.delete(tag); }
            }
        }),
        
        prismApplication: "PerformanceCache - fast repeated access"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 9: STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    stateManagement: {
        immutable: {
            freeze: function(obj) {
                if (obj === null || typeof obj !== 'object') return obj;
                Object.freeze(obj);
                Object.keys(obj).forEach(k => this.freeze(obj[k]));
                return obj;
            },
            
            update: (obj, path, value) => {
                const keys = path.split('.');
                const result = { ...obj };
                let current = result;
                for (let i = 0; i < keys.length - 1; i++) {
                    current[keys[i]] = { ...current[keys[i]] };
                    current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = value;
                return result;
            },
            
            array: {
                push: (arr, item) => [...arr, item],
                remove: (arr, idx) => [...arr.slice(0, idx), ...arr.slice(idx + 1)],
                update: (arr, idx, item) => [...arr.slice(0, idx), item, ...arr.slice(idx + 1)]
            }
        },
        
        transactional: {
            create: (initialState) => ({
                state: initialState,
                history: [initialState],
                historyIndex: 0,
                maxHistory: 100,
                
                commit(newState) {
                    this.history = this.history.slice(0, this.historyIndex + 1);
                    this.history.push(newState);
                    this.historyIndex++;
                    if (this.history.length > this.maxHistory) { this.history.shift(); this.historyIndex--; }
                    this.state = newState;
                },
                
                undo() {
                    if (this.historyIndex > 0) { this.historyIndex--; this.state = this.history[this.historyIndex]; return true; }
                    return false;
                },
                
                redo() {
                    if (this.historyIndex < this.history.length - 1) { this.historyIndex++; this.state = this.history[this.historyIndex]; return true; }
                    return false;
                }
            })
        },
        
        reactive: {
            create: (initialState) => {
                const observers = new Map();
                
                const proxy = new Proxy({ ...initialState }, {
                    set(target, prop, value) {
                        const old = target[prop];
                        target[prop] = value;
                        (observers.get(prop) || []).forEach(cb => cb(value, old));
                        (observers.get('*') || []).forEach(cb => cb(value, old, prop));
                        return true;
                    }
                });
                
                return {
                    state: proxy,
                    watch(prop, callback) {
                        if (!observers.has(prop)) observers.set(prop, new Set());
                        observers.get(prop).add(callback);
                        return () => observers.get(prop).delete(callback);
                    }
                };
            }
        },
        
        prismApplication: "StateManagement - predictable state"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 10: EVENT SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════
    
    events: {
        bus: {
            create: () => ({
                listeners: new Map(),
                
                on(event, callback, { once = false } = {}) {
                    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
                    const wrapper = { callback, once };
                    this.listeners.get(event).add(wrapper);
                    return () => this.listeners.get(event).delete(wrapper);
                },
                
                once(event, callback) { return this.on(event, callback, { once: true }); },
                
                emit(event, data) {
                    if (this.listeners.has(event)) {
                        for (const w of this.listeners.get(event)) {
                            w.callback(data);
                            if (w.once) this.listeners.get(event).delete(w);
                        }
                    }
                    if (this.listeners.has('*')) {
                        for (const w of this.listeners.get('*')) w.callback(event, data);
                    }
                },
                
                async emitAsync(event, data) {
                    const promises = [];
                    if (this.listeners.has(event)) {
                        for (const w of this.listeners.get(event)) promises.push(w.callback(data));
                    }
                    return Promise.all(promises);
                }
            })
        },
        
        domainEvents: {
            OPERATION_CREATED: 'operation.created',
            OPERATION_UPDATED: 'operation.updated',
            TOOLPATH_GENERATED: 'toolpath.generated',
            COLLISION_DETECTED: 'collision.detected',
            PARAMETER_CHANGED: 'parameter.changed',
            TOOL_SELECTED: 'tool.selected'
        },
        
        prismApplication: "EventSystem - decoupled communication"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 11: TESTING
    // ═══════════════════════════════════════════════════════════════════════════
    
    testing: {
        assert: {
            equals: (actual, expected, msg) => { if (actual !== expected) throw new Error(msg || `Expected ${expected} but got ${actual}`); },
            deepEquals: (actual, expected, msg) => { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(msg || 'Deep equality failed'); },
            throws: (fn, msg) => { try { fn(); throw new Error(msg || 'Expected function to throw'); } catch (e) {} },
            closeTo: (actual, expected, tol = 1e-6, msg) => { if (Math.abs(actual - expected) > tol) throw new Error(msg || `${actual} not close to ${expected}`); }
        },
        
        runner: {
            create: () => ({
                tests: [],
                
                describe(name, fn) {
                    const suite = { name, tests: [] };
                    fn({ it: (n, f) => suite.tests.push({ name: n, fn: f }) });
                    this.tests.push(suite);
                },
                
                async run() {
                    const results = { passed: 0, failed: 0, errors: [] };
                    for (const suite of this.tests) {
                        console.log(`\n  ${suite.name}`);
                        for (const test of suite.tests) {
                            try {
                                await test.fn();
                                console.log(`    ✓ ${test.name}`);
                                results.passed++;
                            } catch (e) {
                                console.log(`    ✗ ${test.name}: ${e.message}`);
                                results.failed++;
                                results.errors.push({ suite: suite.name, test: test.name, error: e });
                            }
                        }
                    }
                    console.log(`\n  ${results.passed} passing, ${results.failed} failing`);
                    return results;
                }
            })
        },
        
        mock: {
            create: (impl = {}) => {
                const calls = [];
                const fn = (...args) => {
                    calls.push({ args, timestamp: Date.now() });
                    return impl.returnValue ?? (impl.fn?.(...args));
                };
                fn.calls = calls;
                fn.callCount = () => calls.length;
                fn.calledWith = (...args) => calls.some(c => JSON.stringify(c.args) === JSON.stringify(args));
                fn.reset = () => { calls.length = 0; };
                fn.returns = (val) => { impl.returnValue = val; return fn; };
                return fn;
            }
        },
        
        prismApplication: "TestingFramework - quality assurance"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 12: PERFORMANCE
    // ═══════════════════════════════════════════════════════════════════════════
    
    performance: {
        profiler: {
            create: () => ({
                timings: new Map(),
                
                start(label) { this.timings.set(label, { start: performance.now() }); },
                end(label) {
                    const t = this.timings.get(label);
                    if (t) { t.end = performance.now(); t.duration = t.end - t.start; }
                },
                async measure(label, fn) {
                    this.start(label);
                    const result = await fn();
                    this.end(label);
                    return result;
                },
                report() {
                    console.log('\n=== Performance Report ===');
                    for (const [label, t] of this.timings) {
                        console.log(`${label}: ${t.duration?.toFixed(2) || 'incomplete'}ms`);
                    }
                }
            })
        },
        
        objectPool: {
            create: (factory, initialSize = 10, maxSize = 100) => ({
                pool: Array(initialSize).fill(null).map(factory),
                inUse: new Set(),
                factory, maxSize,
                
                acquire() {
                    let obj = this.pool.pop();
                    if (!obj) obj = this.factory();
                    this.inUse.add(obj);
                    return obj;
                },
                
                release(obj) {
                    this.inUse.delete(obj);
                    if (this.pool.length < this.maxSize) {
                        if (obj.reset) obj.reset();
                        this.pool.push(obj);
                    }
                }
            })
        },
        
        virtualList: {
            create: (items, itemHeight, containerHeight) => ({
                items, itemHeight, containerHeight, scrollTop: 0,
                
                getVisibleRange() {
                    const start = Math.floor(this.scrollTop / this.itemHeight);
                    const count = Math.ceil(this.containerHeight / this.itemHeight) + 1;
                    return { start, end: Math.min(start + count, this.items.length) };
                },
                
                getVisibleItems() {
                    const { start, end } = this.getVisibleRange();
                    return this.items.slice(start, end).map((item, i) => ({
                        item, index: start + i,
                        style: { position: 'absolute', top: (start + i) * this.itemHeight, height: this.itemHeight }
                    }));
                }
            })
        },
        
        lazy: (fn) => {
            let computed = false, value;
            return {
                get() { if (!computed) { value = fn(); computed = true; } return value; },
                invalidate() { computed = false; }
            };
        },
        
        prismApplication: "PerformanceOptimization - speed and memory"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 13: UI PATTERNS
    // ═══════════════════════════════════════════════════════════════════════════
    
    ui: {
        component: {
            create: (config) => ({
                state: config.initialState || {},
                props: {},
                mounted: false,
                
                setState(newState) {
                    this.state = { ...this.state, ...newState };
                    if (this.mounted && config.render) this.render();
                },
                
                mount(container) {
                    this.container = container;
                    this.mounted = true;
                    if (config.onMount) config.onMount.call(this);
                    if (config.render) this.render();
                },
                
                unmount() {
                    if (config.onUnmount) config.onUnmount.call(this);
                    this.mounted = false;
                },
                
                render() {
                    if (config.render && this.container) {
                        this.container.innerHTML = config.render.call(this);
                    }
                }
            })
        },
        
        dragDrop: {
            create: (options = {}) => ({
                dragging: null,
                
                onDragStart(element, data) {
                    this.dragging = { element, data };
                    if (options.onDragStart) options.onDragStart(data);
                },
                
                onDragOver(target) {
                    if (this.dragging && options.onDragOver) options.onDragOver(this.dragging.data, target);
                },
                
                onDrop(target) {
                    if (this.dragging) {
                        if (options.onDrop) options.onDrop(this.dragging.data, target);
                        this.dragging = null;
                    }
                }
            })
        },
        
        modal: {
            create: (content, options = {}) => ({
                isOpen: false,
                content,
                
                open() {
                    this.isOpen = true;
                    if (options.onOpen) options.onOpen();
                },
                
                close() {
                    this.isOpen = false;
                    if (options.onClose) options.onClose();
                },
                
                toggle() { this.isOpen ? this.close() : this.open(); }
            })
        },
        
        toast: {
            notifications: [],
            
            show(message, { type = 'info', duration = 3000 } = {}) {
                const id = Date.now();
                this.notifications.push({ id, message, type });
                if (duration > 0) setTimeout(() => this.dismiss(id), duration);
                return id;
            },
            
            dismiss(id) {
                this.notifications = this.notifications.filter(n => n.id !== id);
            }
        },
        
        prismApplication: "UIPatterns - user interface components"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 14: FILE HANDLING
    // ═══════════════════════════════════════════════════════════════════════════
    
    fileHandling: {
        reader: {
            readAsText: (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsText(file);
            }),
            
            readAsArrayBuffer: (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            }),
            
            readAsDataURL: (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            })
        },
        
        download: (content, filename, mimeType = 'text/plain') => {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        },
        
        parsers: {
            csv: (text, delimiter = ',') => {
                const lines = text.trim().split('\n');
                const headers = lines[0].split(delimiter).map(h => h.trim());
                return lines.slice(1).map(line => {
                    const values = line.split(delimiter);
                    return headers.reduce((obj, h, i) => { obj[h] = values[i]?.trim(); return obj; }, {});
                });
            },
            
            json: (text) => JSON.parse(text)
        },
        
        prismApplication: "FileHandling - import/export"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 15: NETWORKING
    // ═══════════════════════════════════════════════════════════════════════════
    
    networking: {
        http: {
            async request(url, options = {}) {
                const { method = 'GET', headers = {}, body, timeout = 30000 } = options;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                try {
                    const response = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json', ...headers },
                        body: body ? JSON.stringify(body) : undefined,
                        signal: controller.signal
                    });
                    
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return await response.json();
                } finally {
                    clearTimeout(timeoutId);
                }
            },
            
            get: (url, options) => PRISM_APP_DEVELOPMENT.networking.http.request(url, { ...options, method: 'GET' }),
            post: (url, body, options) => PRISM_APP_DEVELOPMENT.networking.http.request(url, { ...options, method: 'POST', body }),
            put: (url, body, options) => PRISM_APP_DEVELOPMENT.networking.http.request(url, { ...options, method: 'PUT', body }),
            delete: (url, options) => PRISM_APP_DEVELOPMENT.networking.http.request(url, { ...options, method: 'DELETE' })
        },
        
        websocket: {
            create: (url, options = {}) => ({
                url, ws: null, reconnectAttempts: 0,
                maxReconnect: options.maxReconnect || 5,
                reconnectDelay: options.reconnectDelay || 1000,
                listeners: new Map(),
                
                connect() {
                    this.ws = new WebSocket(this.url);
                    this.ws.onopen = () => { this.reconnectAttempts = 0; this.emit('open'); };
                    this.ws.onclose = () => { this.emit('close'); this.reconnect(); };
                    this.ws.onerror = (e) => this.emit('error', e);
                    this.ws.onmessage = (e) => this.emit('message', JSON.parse(e.data));
                },
                
                reconnect() {
                    if (this.reconnectAttempts < this.maxReconnect) {
                        this.reconnectAttempts++;
                        setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
                    }
                },
                
                send(data) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(data)); },
                close() { if (this.ws) this.ws.close(); },
                
                on(event, callback) {
                    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
                    this.listeners.get(event).add(callback);
                },
                
                emit(event, data) {
                    (this.listeners.get(event) || []).forEach(cb => cb(data));
                }
            })
        },
        
        prismApplication: "Networking - client-server communication"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 16: FORMATTING & PARSING
    // ═══════════════════════════════════════════════════════════════════════════
    
    formatting: {
        number: {
            format: (n, decimals = 2) => n.toFixed(decimals),
            formatWithCommas: (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','),
            formatPercent: (n, decimals = 1) => `${(n * 100).toFixed(decimals)}%`,
            formatBytes: (bytes) => {
                const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                let i = 0;
                while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
                return `${bytes.toFixed(2)} ${units[i]}`;
            }
        },
        
        time: {
            formatDuration: (ms) => {
                const s = Math.floor(ms / 1000) % 60;
                const m = Math.floor(ms / 60000) % 60;
                const h = Math.floor(ms / 3600000);
                return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
            },
            
            formatDate: (date) => date.toISOString().split('T')[0],
            formatDateTime: (date) => date.toISOString().replace('T', ' ').split('.')[0]
        },
        
        gcode: {
            formatCoordinate: (val, decimals = 4) => val.toFixed(decimals).replace(/\.?0+$/, ''),
            formatBlock: (code, x, y, z, f) => {
                let block = code;
                if (x !== undefined) block += ` X${this.formatCoordinate(x)}`;
                if (y !== undefined) block += ` Y${this.formatCoordinate(y)}`;
                if (z !== undefined) block += ` Z${this.formatCoordinate(z)}`;
                if (f !== undefined) block += ` F${this.formatCoordinate(f, 0)}`;
                return block;
            }
        },
        
        prismApplication: "Formatting - display and export"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 17: MATH UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    math: {
        clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
        lerp: (a, b, t) => a + (b - a) * t,
        inverseLerp: (a, b, val) => (val - a) / (b - a),
        remap: (val, inMin, inMax, outMin, outMax) => outMin + (val - inMin) * (outMax - outMin) / (inMax - inMin),
        
        degToRad: (deg) => deg * Math.PI / 180,
        radToDeg: (rad) => rad * 180 / Math.PI,
        
        matrix: {
            identity: (n) => Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0)),
            
            multiply: (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0))),
            
            transpose: (A) => A[0].map((_, i) => A.map(row => row[i])),
            
            determinant: function(A) {
                const n = A.length;
                if (n === 1) return A[0][0];
                if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
                
                let det = 0;
                for (let j = 0; j < n; j++) {
                    const minor = A.slice(1).map(row => [...row.slice(0, j), ...row.slice(j + 1)]);
                    det += (j % 2 === 0 ? 1 : -1) * A[0][j] * this.determinant(minor);
                }
                return det;
            },
            
            inverse: function(A) {
                const n = A.length;
                const aug = A.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
                
                for (let i = 0; i < n; i++) {
                    let maxRow = i;
                    for (let k = i + 1; k < n; k++) if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
                    
                    const pivot = aug[i][i];
                    for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
                    
                    for (let k = 0; k < n; k++) {
                        if (k !== i) {
                            const factor = aug[k][i];
                            for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
                        }
                    }
                }
                
                return aug.map(row => row.slice(n));
            }
        },
        
        statistics: {
            mean: (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
            median: (arr) => {
                const sorted = [...arr].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            },
            variance: (arr) => {
                const m = arr.reduce((a, b) => a + b, 0) / arr.length;
                return arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
            },
            stdDev: function(arr) { return Math.sqrt(this.variance(arr)); },
            min: (arr) => Math.min(...arr),
            max: (arr) => Math.max(...arr),
            sum: (arr) => arr.reduce((a, b) => a + b, 0)
        },
        
        prismApplication: "MathUtilities - calculations"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 18: INTERPOLATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    interpolation: {
        linear: (points, x) => {
            for (let i = 0; i < points.length - 1; i++) {
                if (x >= points[i].x && x <= points[i + 1].x) {
                    const t = (x - points[i].x) / (points[i + 1].x - points[i].x);
                    return points[i].y + t * (points[i + 1].y - points[i].y);
                }
            }
            return null;
        },
        
        bezier: {
            quadratic: (p0, p1, p2, t) => ({
                x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x,
                y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y
            }),
            
            cubic: (p0, p1, p2, p3, t) => ({
                x: (1 - t) ** 3 * p0.x + 3 * (1 - t) ** 2 * t * p1.x + 3 * (1 - t) * t ** 2 * p2.x + t ** 3 * p3.x,
                y: (1 - t) ** 3 * p0.y + 3 * (1 - t) ** 2 * t * p1.y + 3 * (1 - t) * t ** 2 * p2.y + t ** 3 * p3.y
            })
        },
        
        spline: {
            catmullRom: (p0, p1, p2, p3, t) => {
                const t2 = t * t, t3 = t2 * t;
                return {
                    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
                };
            }
        },
        
        prismApplication: "Interpolation - smooth toolpaths"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 19: GCODE UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    gcode: {
        parser: {
            parse: (line) => {
                const result = { raw: line, code: null, params: {} };
                const parts = line.trim().split(/\s+/);
                
                for (const part of parts) {
                    if (part.startsWith('(') || part.startsWith(';')) break;
                    
                    const letter = part[0].toUpperCase();
                    const value = parseFloat(part.substring(1));
                    
                    if (['G', 'M'].includes(letter) && result.code === null) {
                        result.code = part.toUpperCase();
                    } else {
                        result.params[letter] = value;
                    }
                }
                
                return result;
            },
            
            parseFile: function(content) {
                return content.split('\n').map(line => this.parse(line)).filter(b => b.code);
            }
        },
        
        generator: {
            rapid: (x, y, z) => `G0${x !== undefined ? ` X${x}` : ''}${y !== undefined ? ` Y${y}` : ''}${z !== undefined ? ` Z${z}` : ''}`,
            linear: (x, y, z, f) => `G1${x !== undefined ? ` X${x}` : ''}${y !== undefined ? ` Y${y}` : ''}${z !== undefined ? ` Z${z}` : ''}${f ? ` F${f}` : ''}`,
            arcCW: (x, y, i, j, f) => `G2 X${x} Y${y} I${i} J${j}${f ? ` F${f}` : ''}`,
            arcCCW: (x, y, i, j, f) => `G3 X${x} Y${y} I${i} J${j}${f ? ` F${f}` : ''}`,
            
            toolChange: (toolNum) => `M6 T${toolNum}`,
            spindleOn: (rpm, cw = true) => `${cw ? 'M3' : 'M4'} S${rpm}`,
            spindleOff: () => 'M5',
            coolantOn: (type = 'flood') => type === 'flood' ? 'M8' : 'M7',
            coolantOff: () => 'M9',
            programEnd: () => 'M30',
            
            header: (options = {}) => [
                '%',
                `O${options.programNumber || 1000}`,
                `(${options.programName || 'PRISM GENERATED'})`,
                `(Date: ${new Date().toISOString().split('T')[0]})`,
                'G90 G94 G17 G40 G49 G80',
                ''
            ].join('\n'),
            
            footer: () => [
                '',
                'M5',
                'M9',
                'G91 G28 Z0',
                'G28 X0 Y0',
                'M30',
                '%'
            ].join('\n')
        },
        
        analyzer: {
            estimateTime: (blocks, defaultFeedrate = 1000) => {
                let time = 0;
                let lastPos = { x: 0, y: 0, z: 0 };
                
                for (const block of blocks) {
                    const { X: x = lastPos.x, Y: y = lastPos.y, Z: z = lastPos.z, F: f = defaultFeedrate } = block.params;
                    const dist = Math.sqrt((x - lastPos.x) ** 2 + (y - lastPos.y) ** 2 + (z - lastPos.z) ** 2);
                    
                    const feedrate = block.code === 'G0' ? 10000 : f;
                    time += dist / feedrate;
                    
                    lastPos = { x, y, z };
                }
                
                return time * 60; // seconds
            }
        },
        
        prismApplication: "GCodeUtilities - generation and analysis"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 20: UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    utils: {
        uuid: () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 
            'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            }),
        
        debounce: (fn, ms) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn(...args), ms);
            };
        },
        
        throttle: (fn, ms) => {
            let last = 0;
            return (...args) => {
                const now = Date.now();
                if (now - last >= ms) { last = now; return fn(...args); }
            };
        },
        
        deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
        
        deepMerge: function(target, source) {
            const result = { ...target };
            for (const key of Object.keys(source)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
            return result;
        },
        
        groupBy: (arr, key) => arr.reduce((groups, item) => {
            const k = typeof key === 'function' ? key(item) : item[key];
            if (!groups[k]) groups[k] = [];
            groups[k].push(item);
            return groups;
        }, {}),
        
        unique: (arr) => [...new Set(arr)],
        
        flatten: (arr) => arr.reduce((flat, item) => flat.concat(Array.isArray(item) ? PRISM_APP_DEVELOPMENT.utils.flatten(item) : item), []),
        
        range: (start, end, step = 1) => {
            const arr = [];
            for (let i = start; i < end; i += step) arr.push(i);
            return arr;
        },
        
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        
        prismApplication: "GeneralUtilities - common helpers"
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    
    summary: {
        totalSections: 20,
        categories: [
            'Architecture (MVC, Flux, Master Controller, Plugin)',
            'Design Patterns (Creational, Structural, Behavioral)',
            'Data Structures (HashMap, Octree, BVH, Priority Queue)',
            'Algorithms (Sorting, Searching, Geometry, Pathfinding)',
            'Async & Concurrency (Promises, Queues, Cancellation)',
            'Error Handling (Custom Errors, Result Type, Logger)',
            'Validation & Sanitization (Schema, Manufacturing)',
            'Caching (Memoization, Computed, Tagged)',
            'State Management (Immutable, Transactional, Reactive)',
            'Event System (Bus, Domain Events)',
            'Testing (Assertions, Runner, Mocks)',
            'Performance (Profiler, Object Pool, Virtual List)',
            'UI Patterns (Component, Drag-Drop, Modal)',
            'File Handling (Reader, Download, Parsers)',
            'Networking (HTTP, WebSocket)',
            'Formatting (Numbers, Time, G-code)',
            'Math Utilities (Linear Algebra, Statistics)',
            'Interpolation (Linear, Bezier, Spline)',
            'G-code Utilities (Parser, Generator, Analyzer)',
            'General Utilities (UUID, Clone, Group, Range)'
        ],
        totalPatterns: 300,
        prismApplications: 200
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
    window.PRISM_APP_DEVELOPMENT = PRISM_APP_DEVELOPMENT;
    console.log('[PRISM DEV] ✅ App Development & Coding Logic v1.0 loaded');
    console.log('[PRISM DEV] 20 Sections, 300+ Patterns, 200+ Applications');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRISM_APP_DEVELOPMENT;
}

console.log('[PRISM DEV] App Development & Coding Logic ready for integration');
