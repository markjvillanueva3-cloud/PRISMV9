const PRISM_DEV_ENHANCEMENT_TESTS = {
    modules: [
        { name: 'PRISM_THEME_MANAGER', module: PRISM_THEME_MANAGER },
        { name: 'PRISM_SHORTCUTS', module: PRISM_SHORTCUTS },
        { name: 'PRISM_HISTORY', module: PRISM_HISTORY },
        { name: 'PRISM_PROGRESS', module: PRISM_PROGRESS },
        { name: 'PRISM_TOAST', module: PRISM_TOAST },
        { name: 'PRISM_LAZY_LOADER', module: PRISM_LAZY_LOADER },
        { name: 'PRISM_PLUGIN_MANAGER', module: PRISM_PLUGIN_MANAGER },
        { name: 'PRISM_SERVICE_WORKER', module: PRISM_SERVICE_WORKER },
        { name: 'PRISM_LOGGER', module: PRISM_LOGGER },
        { name: 'PRISM_SANITIZER', module: PRISM_SANITIZER },
        { name: 'PRISM_DEBOUNCE', module: PRISM_DEBOUNCE },
        { name: 'PRISM_VIRTUAL_LIST', module: PRISM_VIRTUAL_LIST },
        { name: 'PRISM_WORKER_POOL', module: PRISM_WORKER_POOL },
        { name: 'PRISM_BATCH_LOADER', module: PRISM_BATCH_LOADER },
    ],
    
    runAll() {
        console.log('\n' + '═'.repeat(70));
        console.log('   PRISM DEVELOPMENT ENHANCEMENT MODULE - SELF-TESTS');
        console.log('═'.repeat(70));
        
        let totalPassed = 0;
        let totalFailed = 0;
        const results = [];
        
        for (const { name, module } of this.modules) {
            console.log(`\n📦 ${name}`);
            
            if (typeof module.selfTest === 'function') {
                try {
                    const moduleResults = module.selfTest();
                    
                    for (const result of moduleResults) {
                        if (result.passed) {
                            console.log(`  ✅ ${result.test}: ${result.message || 'Passed'}`);
                            totalPassed++;
                        } else {
                            console.log(`  ❌ ${result.test}: ${result.message || 'Failed'}`);
                            totalFailed++;
                        }
                        results.push({ module: name, ...result });
                    }
                } catch (error) {
                    console.log(`  ❌ Self-test error: ${error.message}`);
                    totalFailed++;
                    results.push({ module: name, test: 'selfTest', passed: false, message: error.message });
                }
            } else {
                console.log(`  ⚠️ No self-test defined`);
            }
        }
        
        console.log('\n' + '═'.repeat(70));
        console.log(`   RESULTS: ${totalPassed} passed, ${totalFailed} failed`);
        console.log('═'.repeat(70) + '\n');
        
        return { passed: totalPassed, failed: totalFailed, results };
    }
}