const PRISM_RESOURCE_MANAGER = {
    // Resources cache
    cache: new Map(),
    loadingPromises: new Map(),
    loaders: new Map(),
    references: new Map(),
    groups: new Map(),
    
    // Register a loader for a resource type
    registerLoader(type, loader) {
        this.loaders.set(type, loader);
    },
    
    // Load a resource
    async load(id, type, source, options = {}) {
        // Check cache first
        if (this.cache.has(id)) {
            this._incrementRef(id);
            return this.cache.get(id);
        }
        
        // Check if already loading
        if (this.loadingPromises.has(id)) {
            return this.loadingPromises.get(id);
        }
        
        // Get loader
        const loader = this.loaders.get(type);
        if (!loader) {
            throw new Error(`No loader registered for type: ${type}`);
        }
        
        // Start loading
        const loadPromise = (async () => {
            try {
                console.log(`[ResourceManager] Loading: ${id}`);
                
                const resource = await loader.load(source, options);
                
                this.cache.set(id, {
                    id,
                    type,
                    source,
                    data: resource,
                    loadTime: Date.now(),
                    size: this._estimateSize(resource)
                });
                
                this.references.set(id, 1);
                this.loadingPromises.delete(id);
                
                console.log(`[ResourceManager] Loaded: ${id}`);
                return this.cache.get(id);
                
            } catch (error) {
                this.loadingPromises.delete(id);
                throw error;
            }
        })();
        
        this.loadingPromises.set(id, loadPromise);
        return loadPromise;
    },
    
    // Get a resource (must be already loaded)
    get(id) {
        const resource = this.cache.get(id);
        if (!resource) {
            throw new Error(`Resource not loaded: ${id}`);
        }
        return resource.data;
    },
    
    // Check if resource is loaded
    has(id) {
        return this.cache.has(id);
    },
    
    // Check if resource is loading
    isLoading(id) {
        return this.loadingPromises.has(id);
    },
    
    // Unload a resource
    unload(id, force = false) {
        if (!this.cache.has(id)) return;
        
        const refCount = this.references.get(id) || 0;
        
        if (!force && refCount > 1) {
            this.references.set(id, refCount - 1);
            return;
        }
        
        const resource = this.cache.get(id);
        
        // Call loader's unload if available
        const loader = this.loaders.get(resource.type);
        if (loader && loader.unload) {
            loader.unload(resource.data);
        }
        
        this.cache.delete(id);
        this.references.delete(id);
        
        console.log(`[ResourceManager] Unloaded: ${id}`);
    },
    
    // Load a group of resources
    async loadGroup(groupId, resources) {
        const promises = resources.map(r => this.load(r.id, r.type, r.source, r.options));
        const loaded = await Promise.all(promises);
        
        this.groups.set(groupId, resources.map(r => r.id));
        
        return loaded;
    },
    
    // Unload a group
    unloadGroup(groupId) {
        const resourceIds = this.groups.get(groupId);
        if (!resourceIds) return;
        
        for (const id of resourceIds) {
            this.unload(id);
        }
        
        this.groups.delete(groupId);
    },
    
    // Preload resources in background
    async preload(resources, options = {}) {
        const { concurrency = 4, onProgress } = options;
        
        let loaded = 0;
        const total = resources.length;
        
        const loadResource = async (resource) => {
            await this.load(resource.id, resource.type, resource.source, resource.options);
            loaded++;
            if (onProgress) {
                onProgress(loaded, total);
            }
        };
        
        // Load with concurrency limit
        const chunks = [];
        for (let i = 0; i < resources.length; i += concurrency) {
            chunks.push(resources.slice(i, i + concurrency));
        }
        
        for (const chunk of chunks) {
            await Promise.all(chunk.map(loadResource));
        }
    },
    
    // Get cache stats
    getStats() {
        let totalSize = 0;
        for (const resource of this.cache.values()) {
            totalSize += resource.size || 0;
        }
        
        return {
            cachedCount: this.cache.size,
            loadingCount: this.loadingPromises.size,
            totalSize,
            groups: this.groups.size
        };
    },
    
    // Clear cache (with optional type filter)
    clear(type = null) {
        if (type) {
            for (const [id, resource] of this.cache) {
                if (resource.type === type) {
                    this.unload(id, true);
                }
            }
        } else {
            for (const id of this.cache.keys()) {
                this.unload(id, true);
            }
        }
    },
    
    // Reference counting
    _incrementRef(id) {
        const count = this.references.get(id) || 0;
        this.references.set(id, count + 1);
    },
    
    _estimateSize(data) {
        if (data instanceof ArrayBuffer) return data.byteLength;
        if (typeof data === 'string') return data.length * 2;
        if (Array.isArray(data)) return data.length * 8;
        return 0;
    }
};

// Common loaders
PRISM_RESOURCE_MANAGER.registerLoader('json', {
    async load(source) {
        const response = await fetch(source);
        return response.json();
    }
});

PRISM_RESOURCE_MANAGER.registerLoader('text', {
    async load(source) {
        const response = await fetch(source);
        return response.text();
    }
});

PRISM_RESOURCE_MANAGER.registerLoader('image', {
    async load(source) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = source;
        });
    },
    unload(image) {
        image.src = '';
    }
});

PRISM_RESOURCE_MANAGER.registerLoader('arraybuffer', {
    async load(source) {
        const response = await fetch(source);
        return response.arrayBuffer();
    }
});

// ======================================================================
// PRISM_SCHEDULER - Task scheduling with priorities, dependencies, and workers
// ======================================================================

const PRISM_SCHEDULER = {
    // Create a task scheduler
    create(options = {}) {
        return {
            tasks: new Map(),
            queue: [],
            running: new Set(),
            completed: new Set(),
            failed: new Map(),
            maxConcurrency: options.maxConcurrency || 4,
            paused: false,
            
            // Add a task
            add(id, task, options = {}) {
                if (this.tasks.has(id)) {
                    throw new Error(`Task already exists: ${id}`);
                }
                
                const taskEntry = {
                    id,
                    task,
                    priority: options.priority || 0,
                    dependencies: options.dependencies || [],
                    timeout: options.timeout || 0,
                    retries: options.retries || 0,
                    retryCount: 0,
                    status: 'pending', // pending, waiting, running, completed, failed
                    result: null,
                    error: null,
                    startTime: null,
                    endTime: null
                };
                
                this.tasks.set(id, taskEntry);
                this.queue.push(id);
                this._sortQueue();
                
                return this;
            },
            
            // Execute all tasks
            async run() {
                const promises = [];
                
                while (!this.paused) {
                    // Get next runnable task
                    const taskId = this._getNextRunnable();
                    
                    if (!taskId) {
                        // No runnable tasks - wait for running tasks or break
                        if (this.running.size === 0) {
                            break;
                        }
                        await Promise.race(promises);
                        continue;
                    }
                    
                    // Start task
                    const promise = this._runTask(taskId);
                    promises.push(promise);
                    
                    // Respect concurrency limit
                    if (this.running.size >= this.maxConcurrency) {
                        await Promise.race(promises);
                    }
                }
                
                // Wait for all running tasks
                await Promise.all(promises);
                
                return this._getResults();
            },
            
            // Run a single task
            async _runTask(taskId) {
                const taskEntry = this.tasks.get(taskId);
                taskEntry.status = 'running';
                taskEntry.startTime = Date.now();
                this.running.add(taskId);
                
                try {
                    // Set up timeout
                    let timeoutId = null;
                    const timeoutPromise = taskEntry.timeout > 0
                        ? new Promise((_, reject) => {
                            timeoutId = setTimeout(() => {
                                reject(new Error(`Task timeout: ${taskId}`));
                            }, taskEntry.timeout);
                        })
                        : null;
                    
                    // Execute task
                    const taskPromise = taskEntry.task();
                    
                    const result = timeoutPromise
                        ? await Promise.race([taskPromise, timeoutPromise])
                        : await taskPromise;
                    
                    if (timeoutId) clearTimeout(timeoutId);
                    
                    // Success
                    taskEntry.status = 'completed';
                    taskEntry.result = result;
                    taskEntry.endTime = Date.now();
                    this.completed.add(taskId);
                    
                } catch (error) {
                    // Handle failure
                    taskEntry.retryCount++;
                    
                    if (taskEntry.retryCount <= taskEntry.retries) {
                        // Retry
                        console.log(`[Scheduler] Retrying task ${taskId} (${taskEntry.retryCount}/${taskEntry.retries})`);
                        taskEntry.status = 'pending';
                        this.queue.push(taskId);
                        this._sortQueue();
                    } else {
                        // Failed
                        taskEntry.status = 'failed';
                        taskEntry.error = error;
                        taskEntry.endTime = Date.now();
                        this.failed.set(taskId, error);
                    }
                }
                
                this.running.delete(taskId);
            },
            
            // Get next runnable task
            _getNextRunnable() {
                for (let i = 0; i < this.queue.length; i++) {
                    const taskId = this.queue[i];
                    const taskEntry = this.tasks.get(taskId);
                    
                    // Check dependencies
                    const depsCompleted = taskEntry.dependencies.every(dep => 
                        this.completed.has(dep)
                    );
                    
                    const depsFailed = taskEntry.dependencies.some(dep =>
                        this.failed.has(dep)
                    );
                    
                    if (depsFailed) {
                        // Mark as failed due to dependency
                        taskEntry.status = 'failed';
                        taskEntry.error = new Error('Dependency failed');
                        this.failed.set(taskId, taskEntry.error);
                        this.queue.splice(i, 1);
                        i--;
                        continue;
                    }
                    
                    if (depsCompleted) {
                        this.queue.splice(i, 1);
                        return taskId;
                    }
                }
                
                return null;
            },
            
            _sortQueue() {
                this.queue.sort((a, b) => {
                    const taskA = this.tasks.get(a);
                    const taskB = this.tasks.get(b);
                    return taskB.priority - taskA.priority;
                });
            },
            
            _getResults() {
                const results = {};
                for (const [id, task] of this.tasks) {
                    results[id] = {
                        status: task.status,
                        result: task.result,
                        error: task.error?.message,
                        duration: task.endTime ? task.endTime - task.startTime : null
                    };
                }
                return results;
            },
            
            // Pause execution
            pause() {
                this.paused = true;
            },
            
            // Resume execution
            resume() {
                this.paused = false;
                return this.run();
            },
            
            // Cancel a task
            cancel(taskId) {
                const idx = this.queue.indexOf(taskId);
                if (idx >= 0) {
                    this.queue.splice(idx, 1);
                    const task = this.tasks.get(taskId);
                    task.status = 'cancelled';
                    return true;
                }
                return false;
            },
            
            // Get task status
            getStatus(taskId) {
                const task = this.tasks.get(taskId);
                return task ? task.status : null;
            },
            
            // Get all statuses
            getStats() {
                return {
                    total: this.tasks.size,
                    pending: this.queue.length,
                    running: this.running.size,
                    completed: this.completed.size,
                    failed: this.failed.size
                };
            },
            
            // Clear completed/failed tasks
            clear() {
                for (const id of this.completed) {
                    this.tasks.delete(id);
                }
                for (const id of this.failed.keys()) {
                    this.tasks.delete(id);
                }
                this.completed.clear();
                this.failed.clear();
            }
        };
    },
    
    // Create a worker pool
    createWorkerPool(workerScript, poolSize = 4) {
        return {
            workers: [],
            available: [],
            taskQueue: [],
            
            init() {
                for (let i = 0; i < poolSize; i++) {
                    const worker = new Worker(workerScript);
                    worker.id = i;
                    this.workers.push(worker);
                    this.available.push(worker);
                }
            },
            
            async execute(taskData) {
                return new Promise((resolve, reject) => {
                    const task = {
                        data: taskData,
                        resolve,
                        reject
                    };
                    
                    if (this.available.length > 0) {
                        this._runOnWorker(this.available.pop(), task);
                    } else {
                        this.taskQueue.push(task);
                    }
                });
            },
            
            _runOnWorker(worker, task) {
                const handler = (e) => {
                    worker.removeEventListener('message', handler);
                    worker.removeEventListener('error', errorHandler);
                    
                    this.available.push(worker);
                    this._processQueue();
                    
                    task.resolve(e.data);
                };
                
                const errorHandler = (e) => {
                    worker.removeEventListener('message', handler);
                    worker.removeEventListener('error', errorHandler);
                    
                    this.available.push(worker);
                    this._processQueue();
                    
                    task.reject(e.error);
                };
                
                worker.addEventListener('message', handler);
                worker.addEventListener('error', errorHandler);
                worker.postMessage(task.data);
            },
            
            _processQueue() {
                while (this.taskQueue.length > 0 && this.available.length > 0) {
                    const task = this.taskQueue.shift();
                    const worker = this.available.pop();
                    this._runOnWorker(worker, task);
                }
            },
            
            terminate() {
                for (const worker of this.workers) {
                    worker.terminate();
                }
                this.workers = [];
                this.available = [];
            },
            
            getStats() {
                return {
                    totalWorkers: this.workers.length,
                    available: this.available.length,
                    queuedTasks: this.taskQueue.length
                };
            }
        };
    }
};

// ======================================================================
// PRISM_PIPELINE - Data processing pipelines with stages, filters, and transformations
// ======================================================================

const PRISM_PIPELINE = {
    // Create a pipeline
    create(options = {}) {
        return {
            stages: [],
            errorHandler: options.errorHandler || console.error,
            
            // Add a stage
            pipe(stage) {
                this.stages.push(this._wrapStage(stage));
                return this;
            },
            
            // Add a filter stage
            filter(predicate) {
                return this.pipe({
                    name: 'filter',
                    process: async (items) => {
                        if (Array.isArray(items)) {
                            const results = [];
                            for (const item of items) {
                                if (await predicate(item)) {
                                    results.push(item);
                                }
                            }
                            return results;
                        }
                        return await predicate(items) ? items : null;
                    }
                });
            },
            
            // Add a map stage
            map(transform) {
                return this.pipe({
                    name: 'map',
                    process: async (items) => {
                        if (Array.isArray(items)) {
                            const results = [];
                            for (const item of items) {
                                results.push(await transform(item));
                            }
                            return results;
                        }
                        return await transform(items);
                    }
                });
            },
            
            // Add a reduce stage
            reduce(reducer, initial) {
                return this.pipe({
                    name: 'reduce',
                    process: async (items) => {
                        if (!Array.isArray(items)) {
                            items = [items];
                        }
                        let acc = initial;
                        for (const item of items) {
                            acc = await reducer(acc, item);
                        }
                        return acc;
                    }
                });
            },
            
            // Add a batch stage
            batch(size) {
                return this.pipe({
                    name: 'batch',
                    buffer: [],
                    process: async function(item) {
                        this.buffer.push(item);
                        if (this.buffer.length >= size) {
                            const batch = this.buffer.splice(0, size);
                            return batch;
                        }
                        return null;
                    },
                    flush: async function() {
                        const remaining = this.buffer.splice(0);
                        return remaining.length > 0 ? remaining : null;
                    }
                });
            },
            
            // Add a debounce stage
            debounce(delay) {
                let timeout = null;
                let lastItem = null;
                
                return this.pipe({
                    name: 'debounce',
                    process: async (item) => {
                        return new Promise(resolve => {
                            lastItem = item;
                            if (timeout) clearTimeout(timeout);
                            timeout = setTimeout(() => {
                                resolve(lastItem);
                                lastItem = null;
                            }, delay);
                        });
                    }
                });
            },
            
            // Add a throttle stage
            throttle(interval) {
                let lastTime = 0;
                
                return this.pipe({
                    name: 'throttle',
                    process: async (item) => {
                        const now = Date.now();
                        if (now - lastTime >= interval) {
                            lastTime = now;
                            return item;
                        }
                        return null;
                    }
                });
            },
            
            // Add a tap stage (for side effects)
            tap(fn) {
                return this.pipe({
                    name: 'tap',
                    process: async (item) => {
                        await fn(item);
                        return item;
                    }
                });
            },
            
            // Add error catching
            catch(handler) {
                this.errorHandler = handler;
                return this;
            },
            
            // Run pipeline on input
            async run(input) {
                let data = input;
                
                for (const stage of this.stages) {
                    if (data === null || data === undefined) {
                        break;
                    }
                    
                    try {
                        data = await stage.process(data);
                    } catch (error) {
                        if (this.errorHandler) {
                            this.errorHandler(error, stage.name);
                        }
                        throw error;
                    }
                }
                
                // Flush remaining data in batch stages
                for (const stage of this.stages) {
                    if (stage.flush) {
                        const flushed = await stage.flush();
                        if (flushed !== null) {
                            // Process flushed data through remaining stages
                        }
                    }
                }
                
                return data;
            },
            
            // Process a stream
            async *stream(inputStream) {
                for await (const input of inputStream) {
                    const result = await this.run(input);
                    if (result !== null && result !== undefined) {
                        yield result;
                    }
                }
            },
            
            // Clone the pipeline
            clone() {
                const cloned = PRISM_PIPELINE.create({ errorHandler: this.errorHandler });
                cloned.stages = [...this.stages];
                return cloned;
            },
            
            _wrapStage(stage) {
                if (typeof stage === 'function') {
                    return { name: 'anonymous', process: stage };
                }
                return stage;
            }
        };
    },
    
    // Create a parallel pipeline
    parallel(...pipelines) {
        return {
            name: 'parallel',
            pipelines,
            
            async run(input) {
                const results = await Promise.all(
                    this.pipelines.map(p => p.run(input))
                );
                return results;
            }
        };
    },
    
    // Create a conditional pipeline
    branch(condition, truePipeline, falsePipeline = null) {
        return {
            name: 'branch',
            
            async run(input) {
                if (await condition(input)) {
                    return truePipeline ? truePipeline.run(input) : input;
                }
                return falsePipeline ? falsePipeline.run(input) : input;
            }
        };
    },
    
    // Merge multiple streams
    merge(...pipelines) {
        return {
            name: 'merge',
            pipelines,
            
            async *stream(inputs) {
                // Interleave results from all pipelines
                const iterators = inputs.map((input, i) => 
                    this.pipelines[i].stream(input)
                );
                
                let active = iterators.length;
                
                while (active > 0) {
                    const promises = iterators.map((iter, i) => 
                        iter.next().then(result => ({ index: i, result }))
                    );
                    
                    const { index, result } = await Promise.race(promises);
                    
                    if (result.done) {
                        active--;
                        iterators[index] = { next: () => new Promise(() => {}) };
                    } else {
                        yield result.value;
                    }
                }
            }
        };
    }
};

// ======================================================================
// PRISM_RULE_ENGINE - Rule-based system with conditions, actions, and conflict resolution
// ======================================================================

const PRISM_RULE_ENGINE = {
    // Create a rule engine
    create(options = {}) {
        return {
            rules: [],
            facts: new Map(),
            conflictResolution: options.conflictResolution || 'priority', // priority, specificity, order
            maxIterations: options.maxIterations || 1000,
            
            // Define a rule
            addRule(rule) {
                const ruleEntry = {
                    id: rule.id || `rule_${this.rules.length}`,
                    name: rule.name || rule.id,
                    description: rule.description || '',
                    priority: rule.priority || 0,
                    conditions: Array.isArray(rule.when) ? rule.when : [rule.when],
                    actions: Array.isArray(rule.then) ? rule.then : [rule.then],
                    enabled: rule.enabled !== false,
                    fired: false,
                    fireCount: 0
                };
                
                this.rules.push(ruleEntry);
                this._sortRules();
                
                return this;
            },
            
            // Assert a fact
            assertFact(name, value) {
                this.facts.set(name, value);
                return this;
            },
            
            // Retract a fact
            retractFact(name) {
                this.facts.delete(name);
                return this;
            },
            
            // Modify a fact
            modifyFact(name, modifier) {
                if (this.facts.has(name)) {
                    const value = this.facts.get(name);
                    this.facts.set(name, modifier(value));
                }
                return this;
            },
            
            // Get a fact
            getFact(name) {
                return this.facts.get(name);
            },
            
            // Run the rule engine
            run() {
                let iterations = 0;
                let rulesFired = [];
                
                // Reset fired flags
                for (const rule of this.rules) {
                    rule.fired = false;
                }
                
                while (iterations < this.maxIterations) {
                    iterations++;
                    
                    // Find matching rules
                    const matchingRules = this._findMatchingRules();
                    
                    if (matchingRules.length === 0) {
                        break;
                    }
                    
                    // Resolve conflicts
                    const ruleToFire = this._resolveConflicts(matchingRules);
                    
                    if (!ruleToFire) {
                        break;
                    }
                    
                    // Fire the rule
                    this._fireRule(ruleToFire);
                    rulesFired.push(ruleToFire.id);
                }
                
                return {
                    iterations,
                    rulesFired,
                    facts: Object.fromEntries(this.facts)
                };
            },
            
            // Run once (no loop)
            runOnce() {
                const matchingRules = this._findMatchingRules();
                const results = [];
                
                for (const rule of matchingRules) {
                    this._fireRule(rule);
                    results.push(rule.id);
                }
                
                return results;
            },
            
            // Find rules whose conditions match
            _findMatchingRules() {
                const matching = [];
                
                for (const rule of this.rules) {
                    if (!rule.enabled || rule.fired) continue;
                    
                    const allConditionsMet = rule.conditions.every(condition => 
                        this._evaluateCondition(condition)
                    );
                    
                    if (allConditionsMet) {
                        matching.push(rule);
                    }
                }
                
                return matching;
            },
            
            // Evaluate a single condition
            _evaluateCondition(condition) {
                if (typeof condition === 'function') {
                    return condition(Object.fromEntries(this.facts));
                }
                
                if (typeof condition === 'object') {
                    const { fact, operator, value } = condition;
                    const factValue = this.facts.get(fact);
                    
                    switch (operator) {
                        case '==':
                        case 'eq':
                            return factValue == value;
                        case '===':
                        case 'strictEq':
                            return factValue === value;
                        case '!=':
                        case 'neq':
                            return factValue != value;
                        case '>':
                        case 'gt':
                            return factValue > value;
                        case '>=':
                        case 'gte':
                            return factValue >= value;
                        case '<':
                        case 'lt':
                            return factValue < value;
                        case '<=':
                        case 'lte':
                            return factValue <= value;
                        case 'in':
                            return value.includes(factValue);
                        case 'contains':
                            return factValue && factValue.includes(value);
                        case 'exists':
                            return this.facts.has(fact);
                        case 'matches':
                            return new RegExp(value).test(factValue);
                        default:
                            return false;
                    }
                }
                
                return Boolean(condition);
            },
            
            // Resolve conflicts between matching rules
            _resolveConflicts(rules) {
                if (rules.length === 0) return null;
                if (rules.length === 1) return rules[0];
                
                switch (this.conflictResolution) {
                    case 'priority':
                        return rules.reduce((highest, rule) => 
                            rule.priority > highest.priority ? rule : highest
                        );
                    
                    case 'specificity':
                        return rules.reduce((mostSpecific, rule) => 
                            rule.conditions.length > mostSpecific.conditions.length ? rule : mostSpecific
                        );
                    
                    case 'order':
                    default:
                        return rules[0];
                }
            },
            
            // Fire a rule (execute its actions)
            _fireRule(rule) {
                console.log(`[RuleEngine] Firing rule: ${rule.name}`);
                
                const context = {
                    facts: Object.fromEntries(this.facts),
                    assert: (name, value) => this.assertFact(name, value),
                    retract: (name) => this.retractFact(name),
                    modify: (name, modifier) => this.modifyFact(name, modifier)
                };
                
                for (const action of rule.actions) {
                    if (typeof action === 'function') {
                        action(context);
                    } else if (typeof action === 'object') {
                        this._executeAction(action);
                    }
                }
                
                rule.fired = true;
                rule.fireCount++;
            },
            
            // Execute an action object
            _executeAction(action) {
                switch (action.type) {
                    case 'assert':
                        this.assertFact(action.fact, action.value);
                        break;
                    case 'retract':
                        this.retractFact(action.fact);
                        break;
                    case 'modify':
                        if (action.set) {
                            this.facts.set(action.fact, action.set);
                        } else if (action.add) {
                            const current = this.facts.get(action.fact) || 0;
                            this.facts.set(action.fact, current + action.add);
                        }
                        break;
                }
            },
            
            // Sort rules by priority
            _sortRules() {
                this.rules.sort((a, b) => b.priority - a.priority);
            },
            
            // Enable/disable a rule
            enableRule(id) {
                const rule = this.rules.find(r => r.id === id);
                if (rule) rule.enabled = true;
                return this;
            },
            
            disableRule(id) {
                const rule = this.rules.find(r => r.id === id);
                if (rule) rule.enabled = false;
                return this;
            },
            
            // Get rule statistics
            getStats() {
                return {
                    totalRules: this.rules.length,
                    enabledRules: this.rules.filter(r => r.enabled).length,
                    totalFacts: this.facts.size,
                    rulesFireCount: Object.fromEntries(
                        this.rules.map(r => [r.id, r.fireCount])
                    )
                };
            },
            
            // Reset the engine
            reset() {
                this.facts.clear();
                for (const rule of this.rules) {
                    rule.fired = false;
                }
                return this;
            }
        };
    },
    
    // Decision table helper
    createDecisionTable(conditions, actions) {
        // conditions: [{name, values: []}]
        // actions: [[...conditions] => action]
        return {
            conditions,
            actions,
            
            evaluate(facts) {
                for (const [conditionValues, action] of this.actions) {
                    let matches = true;
                    
                    for (let i = 0; i < this.conditions.length; i++) {
                        const condition = this.conditions[i];
                        const expectedValue = conditionValues[i];
                        const actualValue = facts[condition.name];
                        
                        if (expectedValue !== '*' && actualValue !== expectedValue) {
                            matches = false;
                            break;
                        }
                    }
                    
                    if (matches) {
                        return action;
                    }
                }
                
                return null;
            }
        };
    }
};

// ======================================================================
// PRISM_COMPUTATION_ENGINE - Expression evaluation, formula engine, and symbolic computation
// ======================================================================

const PRISM_COMPUTATION_ENGINE = {
    // Constants
    constants: {
        PI: Math.PI,
        E: Math.E,
        TAU: 2 * Math.PI,
        PHI: (1 + Math.sqrt(5)) / 2,
        SQRT2: Math.SQRT2,
        LN2: Math.LN2,
        LN10: Math.LN10
    },
    
    // Built-in functions
    functions: {
        // Basic math
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        trunc: Math.trunc,
        sign: Math.sign,
        
        // Powers and roots
        sqrt: Math.sqrt,
        cbrt: Math.cbrt,
        pow: Math.pow,
        exp: Math.exp,
        log: Math.log,
        log10: Math.log10,
        log2: Math.log2,
        
        // Trigonometry
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
        atan2: Math.atan2,
        sinh: Math.sinh,
        cosh: Math.cosh,
        tanh: Math.tanh,
        
        // Conversion
        deg: (rad) => rad * 180 / Math.PI,
        rad: (deg) => deg * Math.PI / 180,
        
        // Aggregates
        min: Math.min,
        max: Math.max,
        sum: (...args) => args.reduce((a, b) => a + b, 0),
        avg: (...args) => args.reduce((a, b) => a + b, 0) / args.length,
        
        // Utilities
        clamp: (x, min, max) => Math.min(Math.max(x, min), max),
        lerp: (a, b, t) => a + (b - a) * t,
        map: (x, inMin, inMax, outMin, outMax) => 
            outMin + (x - inMin) * (outMax - outMin) / (inMax - inMin),
        
        // Conditionals
        if: (cond, thenVal, elseVal) => cond ? thenVal : elseVal
    },
    
    // Tokenize an expression
    tokenize(expression) {
        const tokens = [];
        let i = 0;
        
        while (i < expression.length) {
            const char = expression[i];
            
            // Skip whitespace
            if (/\s/.test(char)) {
                i++;
                continue;
            }
            
            // Number
            if (/[0-9.]/.test(char)) {
                let num = '';
                while (i < expression.length && /[0-9.eE+-]/.test(expression[i])) {
                    num += expression[i++];
                }
                tokens.push({ type: 'number', value: parseFloat(num) });
                continue;
            }
            
            // Identifier (variable or function)
            if (/[a-zA-Z_]/.test(char)) {
                let name = '';
                while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
                    name += expression[i++];
                }
                tokens.push({ type: 'identifier', value: name });
                continue;
            }
            
            // Operators
            if ('+-*/^%'.includes(char)) {
                tokens.push({ type: 'operator', value: char });
                i++;
                continue;
            }
            
            // Comparison operators
            if ('<>=!'.includes(char)) {
                let op = char;
                if (expression[i + 1] === '=') {
                    op += '=';
                    i++;
                }
                tokens.push({ type: 'comparison', value: op });
                i++;
                continue;
            }
            
            // Parentheses and comma
            if ('(),'.includes(char)) {
                tokens.push({ type: char === ',' ? 'comma' : 'paren', value: char });
                i++;
                continue;
            }
            
            throw new Error(`Unexpected character: ${char}`);
        }
        
        return tokens;
    },
    
    // Parse tokens to AST
    parse(tokens) {
        let pos = 0;
        
        const peek = () => tokens[pos];
        const consume = () => tokens[pos++];
        
        const parseExpression = () => parseComparison();
        
        const parseComparison = () => {
            let left = parseAdditive();
            
            while (peek() && peek().type === 'comparison') {
                const op = consume().value;
                const right = parseAdditive();
                left = { type: 'comparison', operator: op, left, right };
            }
            
            return left;
        };
        
        const parseAdditive = () => {
            let left = parseMultiplicative();
            
            while (peek() && peek().type === 'operator' && '+-'.includes(peek().value)) {
                const op = consume().value;
                const right = parseMultiplicative();
                left = { type: 'binary', operator: op, left, right };
            }
            
            return left;
        };
        
        const parseMultiplicative = () => {
            let left = parsePower();
            
            while (peek() && peek().type === 'operator' && '*/%'.includes(peek().value)) {
                const op = consume().value;
                const right = parsePower();
                left = { type: 'binary', operator: op, left, right };
            }
            
            return left;
        };
        
        const parsePower = () => {
            let left = parseUnary();
            
            while (peek() && peek().type === 'operator' && peek().value === '^') {
                consume();
                const right = parseUnary();
                left = { type: 'binary', operator: '^', left, right };
            }
            
            return left;
        };
        
        const parseUnary = () => {
            if (peek() && peek().type === 'operator' && '+-'.includes(peek().value)) {
                const op = consume().value;
                const operand = parseUnary();
                return { type: 'unary', operator: op, operand };
            }
            
            return parsePrimary();
        };
        
        const parsePrimary = () => {
            const token = peek();
            
            if (!token) {
                throw new Error('Unexpected end of expression');
            }
            
            // Number
            if (token.type === 'number') {
                consume();
                return { type: 'number', value: token.value };
            }
            
            // Identifier (variable or function)
            if (token.type === 'identifier') {
                consume();
                
                // Check for function call
                if (peek() && peek().value === '(') {
                    consume(); // (
                    const args = [];
                    
                    if (peek() && peek().value !== ')') {
                        args.push(parseExpression());
                        
                        while (peek() && peek().type === 'comma') {
                            consume(); // ,
                            args.push(parseExpression());
                        }
                    }
                    
                    if (!peek() || peek().value !== ')') {
                        throw new Error('Expected closing parenthesis');
                    }
                    consume(); // )
                    
                    return { type: 'function', name: token.value, args };
                }
                
                return { type: 'variable', name: token.value };
            }
            
            // Parenthesized expression
            if (token.value === '(') {
                consume(); // (
                const expr = parseExpression();
                
                if (!peek() || peek().value !== ')') {
                    throw new Error('Expected closing parenthesis');
                }
                consume(); // )
                
                return expr;
            }
            
            throw new Error(`Unexpected token: ${token.value}`);
        };
        
        return parseExpression();
    },
    
    // Evaluate an AST
    evaluate(ast, variables = {}) {
        const allVars = { ...this.constants, ...variables };
        
        const evalNode = (node) => {
            switch (node.type) {
                case 'number':
                    return node.value;
                
                case 'variable':
                    if (node.name in allVars) {
                        return allVars[node.name];
                    }
                    throw new Error(`Unknown variable: ${node.name}`);
                
                case 'function':
                    const fn = this.functions[node.name];
                    if (!fn) {
                        throw new Error(`Unknown function: ${node.name}`);
                    }
                    const args = node.args.map(evalNode);
                    return fn(...args);
                
                case 'unary':
                    const operand = evalNode(node.operand);
                    return node.operator === '-' ? -operand : operand;
                
                case 'binary':
                    const left = evalNode(node.left);
                    const right = evalNode(node.right);
                    
                    switch (node.operator) {
                        case '+': return left + right;
                        case '-': return left - right;
                        case '*': return left * right;
                        case '/': return left / right;
                        case '%': return left % right;
                        case '^': return Math.pow(left, right);
                    }
                    break;
                
                case 'comparison':
                    const l = evalNode(node.left);
                    const r = evalNode(node.right);
                    
                    switch (node.operator) {
                        case '<': return l < r ? 1 : 0;
                        case '<=': return l <= r ? 1 : 0;
                        case '>': return l > r ? 1 : 0;
                        case '>=': return l >= r ? 1 : 0;
                        case '==': return l === r ? 1 : 0;
                        case '!=': return l !== r ? 1 : 0;
                    }
                    break;
            }
            
            throw new Error(`Unknown node type: ${node.type}`);
        };
        
        return evalNode(ast);
    },
    
    // Compile expression to function
    compile(expression) {
        const tokens = this.tokenize(expression);
        const ast = this.parse(tokens);
        
        // Extract variable names
        const variables = new Set();
        const extractVars = (node) => {
            if (node.type === 'variable' && !(node.name in this.constants)) {
                variables.add(node.name);
            }
            if (node.left) extractVars(node.left);
            if (node.right) extractVars(node.right);
            if (node.operand) extractVars(node.operand);
            if (node.args) node.args.forEach(extractVars);
        };
        extractVars(ast);
        
        return {
            ast,
            variables: Array.from(variables),
            evaluate: (vars = {}) => this.evaluate(ast, vars)
        };
    },
    
    // Simple expression evaluation
    eval(expression, variables = {}) {
        const tokens = this.tokenize(expression);
        const ast = this.parse(tokens);
        return this.evaluate(ast, variables);
    },
    
    // Register a custom function
    registerFunction(name, fn) {
        this.functions[name] = fn;
    },
    
    // Register a custom constant
    registerConstant(name, value) {
        this.constants[name] = value;
    }
};

// ======================================================================
// PRISM_CACHE_SYSTEM - Multi-level caching with LRU, TTL, and invalidation
// ======================================================================

const PRISM_CACHE_SYSTEM = {
    // Create an LRU cache
    createLRU(capacity = 100) {
        return {
            capacity,
            cache: new Map(),
            
            get(key) {
                if (!this.cache.has(key)) {
                    return undefined;
                }
                
                // Move to end (most recently used)
                const value = this.cache.get(key);
                this.cache.delete(key);
                this.cache.set(key, value);
                
                return value;
            },
            
            set(key, value) {
                if (this.cache.has(key)) {
                    this.cache.delete(key);
                } else if (this.cache.size >= this.capacity) {
                    // Remove least recently used (first item)
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                
                this.cache.set(key, value);
            },
            
            has(key) {
                return this.cache.has(key);
            },
            
            delete(key) {
                return this.cache.delete(key);
            },
            
            clear() {
                this.cache.clear();
            },
            
            size() {
                return this.cache.size;
            }
        };
    },
    
    // Create a TTL cache
    createTTL(defaultTTL = 60000) {
        return {
            defaultTTL,
            cache: new Map(),
            timers: new Map(),
            
            get(key) {
                const entry = this.cache.get(key);
                if (!entry) return undefined;
                
                if (Date.now() > entry.expiry) {
                    this.delete(key);
                    return undefined;
                }
                
                return entry.value;
            },
            
            set(key, value, ttl = this.defaultTTL) {
                this.delete(key); // Clear existing timer
                
                const expiry = Date.now() + ttl;
                this.cache.set(key, { value, expiry });
                
                // Set expiry timer
                const timer = setTimeout(() => this.delete(key), ttl);
                this.timers.set(key, timer);
            },
            
            has(key) {
                const entry = this.cache.get(key);
                if (!entry) return false;
                
                if (Date.now() > entry.expiry) {
                    this.delete(key);
                    return false;
                }
                
                return true;
            },
            
            delete(key) {
                const timer = this.timers.get(key);
                if (timer) {
                    clearTimeout(timer);
                    this.timers.delete(key);
                }
                return this.cache.delete(key);
            },
            
            clear() {
                for (const timer of this.timers.values()) {
                    clearTimeout(timer);
                }
                this.timers.clear();
                this.cache.clear();
            },
            
            // Refresh TTL
            touch(key, ttl = this.defaultTTL) {
                const entry = this.cache.get(key);
                if (entry) {
                    this.set(key, entry.value, ttl);
                }
            },
            
            size() {
                return this.cache.size;
            }
        };
    },
    
    // Create a write-through cache
    createWriteThrough(cache, storage) {
        return {
            cache,
            storage,
            
            async get(key) {
                // Try cache first
                let value = this.cache.get(key);
                
                if (value === undefined) {
                    // Load from storage
                    value = await this.storage.get(key);
                    if (value !== undefined) {
                        this.cache.set(key, value);
                    }
                }
                
                return value;
            },
            
            async set(key, value) {
                // Write to both
                this.cache.set(key, value);
                await this.storage.set(key, value);
            },
            
            async delete(key) {
                this.cache.delete(key);
                await this.storage.delete(key);
            },
            
            async clear() {
                this.cache.clear();
                await this.storage.clear();
            }
        };
    },
    
    // Create a memoization helper
    memoize(fn, options = {}) {
        const { 
            maxSize = 100, 
            ttl = 0, 
            keyFn = (...args) => JSON.stringify(args) 
        } = options;
        
        const cache = ttl > 0 
            ? this.createTTL(ttl) 
            : this.createLRU(maxSize);
        
        const memoized = function(...args) {
            const key = keyFn(...args);
            
            if (cache.has(key)) {
                return cache.get(key);
            }
            
            const result = fn.apply(this, args);
            
            if (result instanceof Promise) {
                return result.then(value => {
                    cache.set(key, value);
                    return value;
                });
            }
            
            cache.set(key, result);
            return result;
        };
        
        memoized.cache = cache;
        memoized.clear = () => cache.clear();
        
        return memoized;
    },
    
    // Multi-level cache
    createMultiLevel(...caches) {
        return {
            caches,
            
            async get(key) {
                for (let i = 0; i < this.caches.length; i++) {
                    const value = await this.caches[i].get(key);
                    
                    if (value !== undefined) {
                        // Populate higher-level caches
                        for (let j = 0; j < i; j++) {
                            await this.caches[j].set(key, value);
                        }
                        return value;
                    }
                }
                
                return undefined;
            },
            
            async set(key, value) {
                for (const cache of this.caches) {
                    await cache.set(key, value);
                }
            },
            
            async delete(key) {
                for (const cache of this.caches) {
                    await cache.delete(key);
                }
            },
            
            async clear() {
                for (const cache of this.caches) {
                    await cache.clear();
                }
            }
        };
    },
    
    // Cache with invalidation tags
    createTaggedCache(baseCache) {
        return {
            cache: baseCache || this.createLRU(1000),
            tags: new Map(), // tag -> Set of keys
            keyTags: new Map(), // key -> Set of tags
            
            get(key) {
                return this.cache.get(key);
            },
            
            set(key, value, tags = []) {
                this.cache.set(key, value);
                
                // Store tag associations
                this.keyTags.set(key, new Set(tags));
                
                for (const tag of tags) {
                    if (!this.tags.has(tag)) {
                        this.tags.set(tag, new Set());
                    }
                    this.tags.get(tag).add(key);
                }
            },
            
            delete(key) {
                // Remove tag associations
                const tags = this.keyTags.get(key);
                if (tags) {
                    for (const tag of tags) {
                        const tagKeys = this.tags.get(tag);
                        if (tagKeys) {
                            tagKeys.delete(key);
                        }
                    }
                    this.keyTags.delete(key);
                }
                
                return this.cache.delete(key);
            },
            
            // Invalidate all entries with a tag
            invalidateTag(tag) {
                const keys = this.tags.get(tag);
                if (!keys) return 0;
                
                let count = 0;
                for (const key of keys) {
                    this.delete(key);
                    count++;
                }
                
                this.tags.delete(tag);
                return count;
            },
            
            // Invalidate multiple tags
            invalidateTags(tags) {
                let count = 0;
                for (const tag of tags) {
                    count += this.invalidateTag(tag);
                }
                return count;
            },
            
            clear() {
                this.cache.clear();
                this.tags.clear();
                this.keyTags.clear();
            },
            
            getStats() {
                return {
                    entries: this.cache.size(),
                    tags: this.tags.size,
                    tagCounts: Object.fromEntries(
                        Array.from(this.tags.entries()).map(([tag, keys]) => [tag, keys.size])
                    )
                };
            }
        };
    }
};
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║              PRISM DEVELOPMENT ENHANCEMENT MODULE v1.0                        ║
 * ║                   UI/UX • Architecture • Performance                          ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Extracted from 107 MIT courses + software engineering best practices         ║
 * ║  16 Major Enhancements • Production-Ready Implementation                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: UI/UX ENHANCEMENTS (5 Components)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 1.1 PRISM_THEME_MANAGER - Dark Mode & Theme Support
 * Rationale: Reduce eye strain for machinists working long shifts
 * MIT Course Reference: 6.831 (User Interface Design)
 */
const PRISM_THEME_MANAGER = {
    current: 'light',
    
    themes: {
        light: {
            '--bg-primary': '#ffffff',
            '--bg-secondary': '#f5f5f5',
            '--bg-tertiary': '#e8e8e8',
            '--text-primary': '#1a1a1a',
            '--text-secondary': '#4a4a4a',
            '--text-muted': '#888888',
            '--accent': '#2196F3',
            '--accent-hover': '#1976D2',
            '--success': '#4CAF50',
            '--warning': '#FF9800',
            '--error': '#f44336',
            '--border': '#ddd',
            '--shadow': 'rgba(0,0,0,0.1)',
            '--input-bg': '#fff',
            '--card-bg': '#fff',
            '--header-bg': '#1a1a1a',
            '--header-text': '#ffffff'
        },
        dark: {
            '--bg-primary': '#1a1a1a',
            '--bg-secondary': '#2d2d2d',
            '--bg-tertiary': '#3d3d3d',
            '--text-primary': '#ffffff',
            '--text-secondary': '#b0b0b0',
            '--text-muted': '#707070',
            '--accent': '#64B5F6',
            '--accent-hover': '#90CAF9',
            '--success': '#81C784',
            '--warning': '#FFB74D',
            '--error': '#E57373',
            '--border': '#444',
            '--shadow': 'rgba(0,0,0,0.3)',
            '--input-bg': '#2d2d2d',
            '--card-bg': '#2d2d2d',
            '--header-bg': '#0d0d0d',
            '--header-text': '#ffffff'
        },
        // High contrast for shop floor visibility
        shopFloor: {
            '--bg-primary': '#000000',
            '--bg-secondary': '#1a1a1a',
            '--bg-tertiary': '#2a2a2a',
            '--text-primary': '#00FF00',
            '--text-secondary': '#00CC00',
            '--text-muted': '#009900',
            '--accent': '#00FFFF',
            '--accent-hover': '#00CCCC',
            '--success': '#00FF00',
            '--warning': '#FFFF00',
            '--error': '#FF0000',
            '--border': '#00FF00',
            '--shadow': 'rgba(0,255,0,0.2)',
            '--input-bg': '#0a0a0a',
            '--card-bg': '#0a0a0a',
            '--header-bg': '#001100',
            '--header-text': '#00FF00'
        }
    },
    
    init() {
        // Load saved theme
        const saved = localStorage.getItem('prism-theme');
        if (saved && this.themes[saved]) {
            this.current = saved;
        }
        this.apply();
        
        // Inject CSS variables style block
        this._injectStyles();
        
        console.log(`[PRISM_THEME_MANAGER] Initialized with theme: ${this.current}`);
    },
    
    _injectStyles() {
        if (document.getElementById('prism-theme-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'prism-theme-styles';
        style.textContent = `
            body {
                background-color: var(--bg-primary);
                color: var(--text-primary);
                transition: background-color 0.3s, color 0.3s;
            }
            .prism-card { background: var(--card-bg); border: 1px solid var(--border); }
            .prism-input { background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--border); }
            .prism-btn { background: var(--accent); color: white; }
            .prism-btn:hover { background: var(--accent-hover); }
            .prism-header { background: var(--header-bg); color: var(--header-text); }
        `;
        document.head.appendChild(style);
    },
    
    toggle() {
        const themes = Object.keys(this.themes);
        const currentIndex = themes.indexOf(this.current);
        this.current = themes[(currentIndex + 1) % themes.length];
        this.apply();
        localStorage.setItem('prism-theme', this.current);
        
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('theme:changed', this.current);
        }
    },
    
    setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`[PRISM_THEME_MANAGER] Unknown theme: ${themeName}`);
            return false;
        }
        this.current = themeName;
        this.apply();
        localStorage.setItem('prism-theme', this.current);
        return true;
    },
    
    apply() {
        const theme = this.themes[this.current];
        Object.entries(theme).forEach(([prop, value]) => {
            document.documentElement.style.setProperty(prop, value);
        });
    },
    
    getAvailableThemes() {
        return Object.keys(this.themes);
    },
    
    getCurrentTheme() {
        return this.current;
    },
    
    // Self-test
    selfTest() {
        const results = [];
        
        // Test theme switching
        const originalTheme = this.current;
        this.setTheme('dark');
        results.push({
            test: 'Theme switching',
            passed: this.current === 'dark',
            message: this.current === 'dark' ? 'Dark theme set' : 'Failed to set dark theme'
        });
        
        // Test CSS variable application
        const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
        results.push({
            test: 'CSS variable application',
            passed: bgPrimary === '#1a1a1a',
            message: `--bg-primary = ${bgPrimary}`
        });
        
        // Restore original
        this.setTheme(originalTheme);
        
        return results;
    }
};


/**
 * 1.2 PRISM_SHORTCUTS - Keyboard Shortcut Manager
 * Rationale: Speed up workflow for power users
 * MIT Course Reference: 6.831 (User Interface Design)
 */
const PRISM_SHORTCUTS = {
    bindings: {
        'ctrl+s': { action: 'save', description: 'Save current work' },
        'ctrl+z': { action: 'undo', description: 'Undo last action' },
        'ctrl+y': { action: 'redo', description: 'Redo last undone action' },
        'ctrl+shift+z': { action: 'redo', description: 'Redo (alternative)' },
        'ctrl+n': { action: 'newJob', description: 'Create new job' },
        'ctrl+o': { action: 'openFile', description: 'Open file' },
        'ctrl+p': { action: 'print', description: 'Print/Export' },
        'ctrl+f': { action: 'search', description: 'Search' },
        'ctrl+shift+f': { action: 'advancedSearch', description: 'Advanced search' },
        'f1': { action: 'help', description: 'Show help' },
        'f2': { action: 'rename', description: 'Rename selected' },
        'f5': { action: 'calculate', description: 'Calculate parameters' },
        'f6': { action: 'simulate', description: 'Run simulation' },
        'f7': { action: 'verify', description: 'Verify toolpath' },
        'f8': { action: 'postProcess', description: 'Generate G-code' },
        'escape': { action: 'cancel', description: 'Cancel current operation' },
        'delete': { action: 'delete', description: 'Delete selected' },
        'ctrl+a': { action: 'selectAll', description: 'Select all' },
        'ctrl+d': { action: 'duplicate', description: 'Duplicate selected' },
        'ctrl+g': { action: 'group', description: 'Group selected' },
        'ctrl+shift+g': { action: 'ungroup', description: 'Ungroup selected' },
        'space': { action: 'togglePlay', description: 'Play/Pause simulation' },
        'ctrl+1': { action: 'viewFront', description: 'Front view' },
        'ctrl+2': { action: 'viewTop', description: 'Top view' },
        'ctrl+3': { action: 'viewRight', description: 'Right view' },
        'ctrl+4': { action: 'viewIso', description: 'Isometric view' },
        'ctrl+0': { action: 'fitAll', description: 'Fit all in view' }
    },
    
    customBindings: {},
    enabled: true,
    
    init() {
        document.addEventListener('keydown', (e) => this._handleKeyDown(e));
        console.log(`[PRISM_SHORTCUTS] Initialized with ${Object.keys(this.bindings).length} shortcuts`);
    },
    
    _handleKeyDown(e) {
        if (!this.enabled) return;
        
        // Don't trigger shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || 
            e.target.contentEditable === 'true') {
            // Allow Escape to blur
            if (e.key === 'Escape') {
                e.target.blur();
            }
            return;
        }
        
        const key = this._getKeyCombo(e);
        const binding = this.customBindings[key] || this.bindings[key];
        
        if (binding) {
            e.preventDefault();
            this._executeAction(binding.action, e);
        }
    },
    
    _getKeyCombo(e) {
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        
        let key = e.key.toLowerCase();
        if (key === ' ') key = 'space';
        if (key === 'delete' || key === 'backspace') key = 'delete';
        
        parts.push(key);
        return parts.join('+');
    },
    
    _executeAction(action, event) {
        console.log(`[PRISM_SHORTCUTS] Executing: ${action}`);
        
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('shortcut:' + action, { event });
        }
        
        // Also try to call handler directly if registered
        if (this.handlers && this.handlers[action]) {
            this.handlers[action](event);
        }
    },
    
    handlers: {},
    
    registerHandler(action, handler) {
        this.handlers[action] = handler;
    },
    
    addBinding(keyCombo, action, description) {
        this.customBindings[keyCombo.toLowerCase()] = { action, description };
    },
    
    removeBinding(keyCombo) {
        delete this.customBindings[keyCombo.toLowerCase()];
    },
    
    enable() { this.enabled = true; },
    disable() { this.enabled = false; },
    
    getHelp() {
        const help = [];
        const allBindings = { ...this.bindings, ...this.customBindings };
        
        for (const [key, binding] of Object.entries(allBindings)) {
            help.push({
                shortcut: key.replace('ctrl', 'Ctrl').replace('shift', 'Shift').replace('alt', 'Alt'),
                action: binding.action,
                description: binding.description
            });
        }
        
        return help.sort((a, b) => a.shortcut.localeCompare(b.shortcut));
    },
    
    selfTest() {
        const results = [];
        
        // Test key combo parsing
        const mockEvent = { ctrlKey: true, shiftKey: false, altKey: false, key: 's' };
        const combo = this._getKeyCombo(mockEvent);
        results.push({
            test: 'Key combo parsing',
            passed: combo === 'ctrl+s',
            message: `Parsed: ${combo}`
        });
        
        // Test binding lookup
        const binding = this.bindings['ctrl+s'];
        results.push({
            test: 'Binding lookup',
            passed: binding && binding.action === 'save',
            message: binding ? `Found: ${binding.action}` : 'Not found'
        });
        
        return results;
    }
}