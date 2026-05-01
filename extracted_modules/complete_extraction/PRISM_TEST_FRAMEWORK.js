const PRISM_TEST_FRAMEWORK = {
    suites: new Map(),
    results: [],
    currentSuite: null,
    beforeEachFn: null,
    afterEachFn: null,
    
    describe(name, fn) {
        const previousSuite = this.currentSuite;
        this.currentSuite = name;
        
        if (!this.suites.has(name)) {
            this.suites.set(name, { tests: [], beforeEach: null, afterEach: null });
        }
        
        fn();
        
        this.currentSuite = previousSuite;
    },
    
    it(description, testFn) {
        if (!this.currentSuite) {
            throw new Error('Tests must be inside describe()');
        }
        
        this.suites.get(this.currentSuite).tests.push({
            description,
            testFn,
            skip: false
        });
    },
    
    skip(description, testFn) {
        if (!this.currentSuite) {
            throw new Error('Tests must be inside describe()');
        }
        
        this.suites.get(this.currentSuite).tests.push({
            description,
            testFn,
            skip: true
        });
    },
    
    beforeEach(fn) {
        if (this.currentSuite) {
            this.suites.get(this.currentSuite).beforeEach = fn;
        }
    },
    
    afterEach(fn) {
        if (this.currentSuite) {
            this.suites.get(this.currentSuite).afterEach = fn;
        }
    },
    
    async runAll() {
        console.log('\n🧪 PRISM TEST SUITE\n' + '='.repeat(60));
        this.results = [];
        let passed = 0, failed = 0, skipped = 0;
        const startTime = performance.now();
        
        for (const [suiteName, suite] of this.suites) {
            console.log(`\n📦 ${suiteName}`);
            
            for (const test of suite.tests) {
                if (test.skip) {
                    console.log(`  ⏭️ ${test.description} (skipped)`);
                    skipped++;
                    this.results.push({ 
                        suite: suiteName, 
                        test: test.description, 
                        status: 'skipped' 
                    });
                    continue;
                }
                
                try {
                    // Run beforeEach
                    if (suite.beforeEach) await suite.beforeEach();
                    
                    // Run test
                    await test.testFn();
                    
                    // Run afterEach
                    if (suite.afterEach) await suite.afterEach();
                    
                    console.log(`  ✅ ${test.description}`);
                    passed++;
                    this.results.push({ 
                        suite: suiteName, 
                        test: test.description, 
                        status: 'passed' 
                    });
                } catch (error) {
                    console.error(`  ❌ ${test.description}`);
                    console.error(`     ${error.message}`);
                    failed++;
                    this.results.push({ 
                        suite: suiteName, 
                        test: test.description, 
                        status: 'failed',
                        error: error.message 
                    });
                }
            }
        }
        
        const duration = performance.now() - startTime;
        
        console.log('\n' + '='.repeat(60));
        console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
        console.log(`Duration: ${duration.toFixed(2)}ms`);
        
        return { passed, failed, skipped, total: passed + failed + skipped, duration };
    },
    
    runSuite(suiteName) {
        const suite = this.suites.get(suiteName);
        if (!suite) {
            console.error(`Suite not found: ${suiteName}`);
            return null;
        }
        
        // Temporarily store only this suite and run
        const allSuites = this.suites;
        this.suites = new Map([[suiteName, suite]]);
        const results = this.runAll();
        this.suites = allSuites;
        
        return results;
    },
    
    // Assertion helpers
    assert: {
        equal(actual, expected, msg = '') {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${msg}`);
            }
        },
        
        notEqual(actual, expected, msg = '') {
            if (actual === expected) {
                throw new Error(`Expected values to be different. ${msg}`);
            }
        },
        
        deepEqual(actual, expected, msg = '') {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Deep equality failed. ${msg}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
            }
        },
        
        throws(fn, msg = '') {
            let threw = false;
            try { fn(); } catch { threw = true; }
            if (!threw) throw new Error(`Expected function to throw. ${msg}`);
        },
        
        doesNotThrow(fn, msg = '') {
            try { fn(); } catch (e) { 
                throw new Error(`Expected function not to throw, but threw: ${e.message}. ${msg}`);
            }
        },
        
        closeTo(actual, expected, delta = 1e-6, msg = '') {
            if (Math.abs(actual - expected) > delta) {
                throw new Error(`Expected ${actual} to be close to ${expected} (delta: ${delta}). ${msg}`);
            }
        },
        
        truthy(value, msg = '') {
            if (!value) throw new Error(`Expected truthy value, got ${value}. ${msg}`);
        },
        
        falsy(value, msg = '') {
            if (value) throw new Error(`Expected falsy value, got ${value}. ${msg}`);
        },
        
        isNull(value, msg = '') {
            if (value !== null) throw new Error(`Expected null, got ${value}. ${msg}`);
        },
        
        isNotNull(value, msg = '') {
            if (value === null) throw new Error(`Expected non-null value. ${msg}`);
        },
        
        isArray(value, msg = '') {
            if (!Array.isArray(value)) throw new Error(`Expected array. ${msg}`);
        },
        
        contains(array, item, msg = '') {
            if (!array.includes(item)) throw new Error(`Expected array to contain ${item}. ${msg}`);
        },
        
        hasProperty(obj, prop, msg = '') {
            if (!(prop in obj)) throw new Error(`Expected object to have property ${prop}. ${msg}`);
        },
        
        instanceOf(value, constructor, msg = '') {
            if (!(value instanceof constructor)) {
                throw new Error(`Expected instance of ${constructor.name}. ${msg}`);
            }
        }
    },
    
    getResults() {
        return this.results;
    },
    
    clear() {
        this.suites.clear();
        this.results = [];
    }
}