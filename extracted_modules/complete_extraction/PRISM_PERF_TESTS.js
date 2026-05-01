const PRISM_PERF_TESTS = {
    baselines: {},
    tolerance: 0.2, // 20% tolerance
    results: [],
    
    async benchmark(name, fn, iterations = 100, warmup = 10) {
        // Warm up
        for (let i = 0; i < warmup; i++) {
            await fn();
        }
        
        // Measure
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await fn();
            times.push(performance.now() - start);
        }
        
        // Calculate statistics
        times.sort((a, b) => a - b);
        const avg = times.reduce((a, b) => a + b) / times.length;
        const min = times[0];
        const max = times[times.length - 1];
        const median = times[Math.floor(times.length / 2)];
        const p95 = times[Math.floor(times.length * 0.95)];
        const p99 = times[Math.floor(times.length * 0.99)];
        
        // Standard deviation
        const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        
        return { 
            name, 
            iterations,
            avg, 
            min, 
            max, 
            median,
            p95,
            p99,
            stdDev,
            samples: times 
        };
    },
    
    setBaseline(name, avgTime) {
        this.baselines[name] = avgTime;
    },
    
    loadBaselines(baselines) {
        this.baselines = { ...this.baselines, ...baselines };
    },
    
    async runBenchmark(name, fn, iterations = 100) {
        const result = await this.benchmark(name, fn, iterations);
        
        console.log(`\n⚡ ${name}:`);
        console.log(`  Avg: ${result.avg.toFixed(3)}ms`);
        console.log(`  Min: ${result.min.toFixed(3)}ms`);
        console.log(`  Max: ${result.max.toFixed(3)}ms`);
        console.log(`  P95: ${result.p95.toFixed(3)}ms`);
        console.log(`  StdDev: ${result.stdDev.toFixed(3)}ms`);
        
        // Check against baseline
        if (this.baselines[name]) {
            const baseline = this.baselines[name];
            const ratio = result.avg / baseline;
            result.baseline = baseline;
            result.regression = ratio > 1 + this.tolerance;
            
            if (result.regression) {
                console.warn(`  ⚠️ REGRESSION: ${((ratio - 1) * 100).toFixed(1)}% slower than baseline`);
            } else if (ratio < 1 - this.tolerance) {
                console.log(`  🚀 IMPROVEMENT: ${((1 - ratio) * 100).toFixed(1)}% faster than baseline`);
            } else {
                console.log(`  ✅ Within baseline (${((ratio - 1) * 100).toFixed(1)}%)`);
            }
        }
        
        this.results.push(result);
        return result;
    },
    
    async runSuite(tests) {
        console.log('\n⚡ PERFORMANCE TEST SUITE\n' + '='.repeat(60));
        this.results = [];
        
        for (const test of tests) {
            await this.runBenchmark(test.name, test.fn, test.iterations || 100);
        }
        
        console.log('\n' + '='.repeat(60));
        
        const regressions = this.results.filter(r => r.regression);
        if (regressions.length > 0) {
            console.warn(`\n⚠️ ${regressions.length} performance regressions detected!`);
        } else {
            console.log('\n✅ No performance regressions');
        }
        
        return this.results;
    },
    
    exportBaselines() {
        const baselines = {};
        this.results.forEach(r => {
            baselines[r.name] = r.avg;
        });
        return baselines;
    },
    
    getResults() {
        return this.results;
    },
    
    selfTest() {
        return [{
            test: 'Performance framework',
            passed: true,
            message: 'Framework initialized'
        }];
    }
}