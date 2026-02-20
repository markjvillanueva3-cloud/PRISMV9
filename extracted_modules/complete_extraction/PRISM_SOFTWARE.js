const PRISM_SOFTWARE = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY PATTERN
  // ═══════════════════════════════════════════════════════════════════════════
  
  factory: {
    creators: {},
    
    register: function(type, creator) {
      this.creators[type] = creator;
    },
    
    create: function(type, params) {
      const creator = this.creators[type];
      if (!creator) {
        throw new Error(`Unknown type: ${type}. Registered: ${Object.keys(this.creators).join(', ')}`);
      }
      return creator(params);
    },
    
    getTypes: function() {
      return Object.keys(this.creators);
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMAND PATTERN (Undo/Redo)
  // ═══════════════════════════════════════════════════════════════════════════
  
  commandManager: {
    history: [],
    redoStack: [],
    maxHistory: 100,
    
    execute: function(command) {
      if (typeof command.execute !== 'function' || typeof command.undo !== 'function') {
        throw new Error('Command must have execute() and undo() methods');
      }
      
      const result = command.execute();
      this.history.push(command);
      this.redoStack = [];  // Clear redo on new command
      
      // Limit history size
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
      
      return result;
    },
    
    undo: function() {
      const command = this.history.pop();
      if (!command) return { success: false, message: 'Nothing to undo' };
      
      command.undo();
      this.redoStack.push(command);
      return { success: true, command: command.name || 'Command' };
    },
    
    redo: function() {
      const command = this.redoStack.pop();
      if (!command) return { success: false, message: 'Nothing to redo' };
      
      command.execute();
      this.history.push(command);
      return { success: true, command: command.name || 'Command' };
    },
    
    canUndo: function() {
      return this.history.length > 0;
    },
    
    canRedo: function() {
      return this.redoStack.length > 0;
    },
    
    clear: function() {
      this.history = [];
      this.redoStack = [];
    },
    
    getHistory: function() {
      return this.history.map((cmd, i) => ({
        index: i,
        name: cmd.name || `Command ${i}`,
        timestamp: cmd.timestamp
      }));
    }
  },
  
  // Helper to create commands
  createCommand: function(name, executeFn, undoFn) {
    return {
      name,
      timestamp: Date.now(),
      execute: executeFn,
      undo: undoFn
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MACHINE
  // ═══════════════════════════════════════════════════════════════════════════
  
  stateManager: {
    states: {},
    current: null,
    history: [],
    
    define: function(config) {
      this.states = config.states;
      this.current = config.initial;
      this.onTransition = config.onTransition || (() => {});
      this.history = [{ state: this.current, timestamp: Date.now() }];
    },
    
    transition: function(to, payload = {}) {
      const currentConfig = this.states[this.current];
      if (!currentConfig) {
        throw new Error(`Invalid current state: ${this.current}`);
      }
      
      const allowedTransitions = currentConfig.transitions || [];
      if (!allowedTransitions.includes(to)) {
        return {
          success: false,
          error: `Cannot transition from ${this.current} to ${to}. Allowed: ${allowedTransitions.join(', ')}`
        };
      }
      
      const from = this.current;
      this.current = to;
      this.history.push({ state: to, timestamp: Date.now(), from, payload });
      
      // Call exit action
      if (currentConfig.onExit) currentConfig.onExit(payload);
      
      // Call enter action
      const newConfig = this.states[to];
      if (newConfig?.onEnter) newConfig.onEnter(payload);
      
      // Call global transition handler
      this.onTransition({ from, to, payload });
      
      return { success: true, from, to };
    },
    
    canTransition: function(to) {
      const currentConfig = this.states[this.current];
      return currentConfig?.transitions?.includes(to) || false;
    },
    
    getState: function() {
      return this.current;
    },
    
    getAvailableTransitions: function() {
      return this.states[this.current]?.transitions || [];
    },
    
    getHistory: function() {
      return [...this.history];
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SIMPLE IN-MEMORY DATABASE
  // ═══════════════════════════════════════════════════════════════════════════
  
  database: {
    tables: {},
    indexes: {},
    
    createTable: function(name, schema) {
      this.tables[name] = {
        schema,
        rows: [],
        autoIncrement: 1
      };
      this.indexes[name] = {};
      return { success: true, table: name };
    },
    
    insert: function(table, data) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      const t = this.tables[table];
      const row = {
        _id: t.autoIncrement++,
        ...data,
        _created: Date.now(),
        _modified: Date.now()
      };
      
      // Validate against schema if exists
      if (t.schema) {
        for (const [field, config] of Object.entries(t.schema)) {
          if (config.required && row[field] === undefined) {
            throw new Error(`Required field missing: ${field}`);
          }
        }
      }
      
      t.rows.push(row);
      this._updateIndexes(table, row);
      
      return { success: true, id: row._id, row };
    },
    
    query: function(table, conditions = {}, options = {}) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      let results = [...this.tables[table].rows];
      
      // Filter by conditions
      for (const [field, value] of Object.entries(conditions)) {
        if (typeof value === 'object') {
          // Advanced operators
          if (value.$gt !== undefined) results = results.filter(r => r[field] > value.$gt);
          if (value.$gte !== undefined) results = results.filter(r => r[field] >= value.$gte);
          if (value.$lt !== undefined) results = results.filter(r => r[field] < value.$lt);
          if (value.$lte !== undefined) results = results.filter(r => r[field] <= value.$lte);
          if (value.$in !== undefined) results = results.filter(r => value.$in.includes(r[field]));
          if (value.$contains !== undefined) results = results.filter(r => 
            String(r[field]).toLowerCase().includes(String(value.$contains).toLowerCase())
          );
        } else {
          results = results.filter(r => r[field] === value);
        }
      }
      
      // Sort
      if (options.orderBy) {
        const [field, dir] = options.orderBy.split(' ');
        const mult = dir?.toLowerCase() === 'desc' ? -1 : 1;
        results.sort((a, b) => (a[field] > b[field] ? 1 : -1) * mult);
      }
      
      // Pagination
      if (options.limit) {
        const offset = options.offset || 0;
        results = results.slice(offset, offset + options.limit);
      }
      
      // Select specific fields
      if (options.select) {
        const fields = options.select.split(',').map(f => f.trim());
        results = results.map(r => {
          const selected = {};
          for (const f of fields) selected[f] = r[f];
          return selected;
        });
      }
      
      return results;
    },
    
    update: function(table, conditions, updates) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      let count = 0;
      for (const row of this.tables[table].rows) {
        let match = true;
        for (const [field, value] of Object.entries(conditions)) {
          if (row[field] !== value) { match = false; break; }
        }
        
        if (match) {
          Object.assign(row, updates, { _modified: Date.now() });
          count++;
        }
      }
      
      return { success: true, modified: count };
    },
    
    delete: function(table, conditions) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      const before = this.tables[table].rows.length;
      this.tables[table].rows = this.tables[table].rows.filter(row => {
        for (const [field, value] of Object.entries(conditions)) {
          if (row[field] === value) return false;
        }
        return true;
      });
      
      return { success: true, deleted: before - this.tables[table].rows.length };
    },
    
    createIndex: function(table, field) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      this.indexes[table][field] = {};
      for (const row of this.tables[table].rows) {
        this._addToIndex(table, field, row);
      }
      
      return { success: true, indexed: field };
    },
    
    _addToIndex: function(table, field, row) {
      const value = row[field];
      if (!this.indexes[table][field][value]) {
        this.indexes[table][field][value] = [];
      }
      this.indexes[table][field][value].push(row._id);
    },
    
    _updateIndexes: function(table, row) {
      for (const field of Object.keys(this.indexes[table] || {})) {
        this._addToIndex(table, field, row);
      }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE
  // ═══════════════════════════════════════════════════════════════════════════
  
  cache: {
    store: new Map(),
    maxSize: 1000,
    ttl: 300000, // 5 minutes default
    
    set: function(key, value, ttl = this.ttl) {
      if (this.store.size >= this.maxSize) {
        // Remove oldest entry (LRU approximation)
        const firstKey = this.store.keys().next().value;
        this.store.delete(firstKey);
      }
      
      this.store.set(key, {
        value,
        expires: Date.now() + ttl,
        hits: 0
      });
      
      return { success: true, key };
    },
    
    get: function(key) {
      const entry = this.store.get(key);
      if (!entry) return { found: false };
      
      if (Date.now() > entry.expires) {
        this.store.delete(key);
        return { found: false, expired: true };
      }
      
      entry.hits++;
      return { found: true, value: entry.value, hits: entry.hits };
    },
    
    invalidate: function(key) {
      return { deleted: this.store.delete(key) };
    },
    
    clear: function() {
      const size = this.store.size;
      this.store.clear();
      return { cleared: size };
    },
    
    getStats: function() {
      let totalHits = 0, expired = 0;
      const now = Date.now();
      
      for (const [key, entry] of this.store) {
        totalHits += entry.hits;
        if (now > entry.expires) expired++;
      }
      
      return {
        size: this.store.size,
        maxSize: this.maxSize,
        totalHits,
        expiredEntries: expired
      };
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TESTING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  testing: {
    tests: [],
    results: [],
    
    describe: function(name, fn) {
      this.currentSuite = name;
      fn();
      this.currentSuite = null;
    },
    
    it: function(name, fn) {
      this.tests.push({
        suite: this.currentSuite,
        name,
        fn
      });
    },
    
    runTests: function(filter = null) {
      this.results = [];
      const testsToRun = filter 
        ? this.tests.filter(t => t.name.includes(filter) || t.suite?.includes(filter))
        : this.tests;
      
      for (const test of testsToRun) {
        const result = {
          suite: test.suite,
          name: test.name,
          passed: false,
          error: null,
          duration: 0
        };
        
        const start = performance.now();
        try {
          test.fn();
          result.passed = true;
        } catch (e) {
          result.error = e.message;
        }
        result.duration = performance.now() - start;
        
        this.results.push(result);
      }
      
      const passed = this.results.filter(r => r.passed).length;
      const failed = this.results.filter(r => !r.passed).length;
      
      return {
        total: this.results.length,
        passed,
        failed,
        passRate: (passed / this.results.length * 100).toFixed(1) + '%',
        results: this.results,
        failures: this.results.filter(r => !r.passed)
      };
    },
    
    getCoverage: function(module) {
      // Simplified coverage estimation
      const functions = Object.keys(module).filter(k => typeof module[k] === 'function');
      const testedFunctions = new Set();
      
      for (const test of this.tests) {
        const src = test.fn.toString();
        for (const fn of functions) {
          if (src.includes(fn)) testedFunctions.add(fn);
        }
      }
      
      return {
        totalFunctions: functions.length,
        testedFunctions: testedFunctions.size,
        coverage: (testedFunctions.size / functions.length * 100).toFixed(1) + '%',
        untested: functions.filter(f => !testedFunctions.has(f))
      };
    },
    
    // Assertion helpers
    assert: {
      equal: (a, b, msg) => {
        if (a !== b) throw new Error(msg || `Expected ${a} to equal ${b}`);
      },
      deepEqual: (a, b, msg) => {
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          throw new Error(msg || `Deep equality failed`);
        }
      },
      throws: (fn, msg) => {
        try {
          fn();
          throw new Error(msg || 'Expected function to throw');
        } catch (e) {
          if (e.message === msg) throw e;
        }
      },
      truthy: (val, msg) => {
        if (!val) throw new Error(msg || `Expected truthy value, got ${val}`);
      }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  validation: {
    rules: {
      number: (v, opts = {}) => {
        if (typeof v !== 'number' || !isFinite(v)) return 'Must be a valid number';
        if (opts.min !== undefined && v < opts.min) return `Must be at least ${opts.min}`;
        if (opts.max !== undefined && v > opts.max) return `Must be at most ${opts.max}`;
        return null;
      },
      string: (v, opts = {}) => {
        if (typeof v !== 'string') return 'Must be a string';
        if (opts.minLength && v.length < opts.minLength) return `Must be at least ${opts.minLength} characters`;
        if (opts.maxLength && v.length > opts.maxLength) return `Must be at most ${opts.maxLength} characters`;
        if (opts.pattern && !opts.pattern.test(v)) return `Must match pattern ${opts.pattern}`;
        return null;
      },
      array: (v, opts = {}) => {
        if (!Array.isArray(v)) return 'Must be an array';
        if (opts.minLength && v.length < opts.minLength) return `Must have at least ${opts.minLength} items`;
        return null;
      },
      enum: (v, opts) => {
        if (!opts.values?.includes(v)) return `Must be one of: ${opts.values.join(', ')}`;
        return null;
      }
    },
    
    validateInput: function(input, schema) {
      const errors = {};
      let valid = true;
      
      for (const [field, config] of Object.entries(schema)) {
        const value = input[field];
        
        // Required check
        if (config.required && (value === undefined || value === null)) {
          errors[field] = 'Required field';
          valid = false;
          continue;
        }
        
        if (value === undefined) continue;
        
        // Type check
        const rule = this.rules[config.type];
        if (rule) {
          const error = rule(value, config);
          if (error) {
            errors[field] = error;
            valid = false;
          }
        }
        
        // Custom validator
        if (config.validate) {
          const error = config.validate(value, input);
          if (error) {
            errors[field] = error;
            valid = false;
          }
        }
      }
      
      return { valid, errors };
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY
  // ═══════════════════════════════════════════════════════════════════════════
  
  safety: {
    hazards: [],
    watchdogs: new Map(),
    
    analyzeHazard: function(hazard) {
      const { component, failureMode, effect, severity, probability, detection } = hazard;
      
      const rpn = severity * probability * detection;
      
      const priority = rpn > 100 ? 'CRITICAL' : rpn > 50 ? 'HIGH' : rpn > 20 ? 'MEDIUM' : 'LOW';
      
      const mitigations = [];
      if (severity >= 8) mitigations.push('Add redundant system or backup');
      if (probability >= 5) mitigations.push('Improve component reliability or add monitoring');
      if (detection >= 5) mitigations.push('Add sensors or automated detection');
      
      this.hazards.push({
        ...hazard,
        rpn,
        priority,
        mitigations,
        analyzed: Date.now()
      });
      
      return { rpn, priority, mitigations };
    },
    
    watchdog: function(id, timeout, onTimeout) {
      // Clear existing watchdog if any
      if (this.watchdogs.has(id)) {
        clearTimeout(this.watchdogs.get(id).timer);
      }
      
      const timer = setTimeout(() => {
        console.error(`[WATCHDOG] ${id} timeout after ${timeout}ms`);
        onTimeout();
      }, timeout);
      
      this.watchdogs.set(id, {
        timer,
        timeout,
        onTimeout,
        lastKick: Date.now()
      });
      
      return {
        kick: () => {
          const wd = this.watchdogs.get(id);
          if (wd) {
            clearTimeout(wd.timer);
            wd.timer = setTimeout(wd.onTimeout, wd.timeout);
            wd.lastKick = Date.now();
          }
        },
        stop: () => {
          const wd = this.watchdogs.get(id);
          if (wd) {
            clearTimeout(wd.timer);
            this.watchdogs.delete(id);
          }
        }
      };
    },
    
    engageFailsafe: function(reason, actions) {
      console.error(`[FAILSAFE] Engaging due to: ${reason}`);
      
      const results = [];
      for (const action of actions) {
        try {
          action();
          results.push({ action: action.name || 'anonymous', success: true });
        } catch (e) {
          results.push({ action: action.name || 'anonymous', success: false, error: e.message });
        }
      }
      
      return {
        reason,
        timestamp: Date.now(),
        results,
        allSucceeded: results.every(r => r.success)
      };
    },
    
    getHazardReport: function() {
      return {
        total: this.hazards.length,
        bySeverity: {
          critical: this.hazards.filter(h => h.priority === 'CRITICAL').length,
          high: this.hazards.filter(h => h.priority === 'HIGH').length,
          medium: this.hazards.filter(h => h.priority === 'MEDIUM').length,
          low: this.hazards.filter(h => h.priority === 'LOW').length
        },
        hazards: this.hazards.sort((a, b) => b.rpn - a.rpn)
      };
    }
  }
}