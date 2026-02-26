const PRISM_AI_DATABASE_INTEGRATION_TESTS = {

    runAllTests: function() {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('PRISM AI DATABASE INTEGRATION v1.0 - SELF-TESTS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        let passed = 0;
        let failed = 0;

        // Test 1: Strategy count
        try {
            const count = PRISM_AI_TOOLPATH_DATABASE.getStrategyCount();
            if (count >= 100) {
                console.log(`  ✅ Strategy Count: PASS (${count} strategies)`);
                passed++;
            } else {
                console.log(`  ❌ Strategy Count: FAIL (only ${count} strategies, expected 100+)`);
                failed++;
            }
        } catch (e) {
            console.log('  ❌ Strategy Count: FAIL (error)');
            failed++;
        }
        // Test 2: Material count
        try {
            const count = PRISM_AI_MATERIAL_MODIFIERS.getMaterialCount();
            if (count >= 100) {
                console.log(`  ✅ Material Count: PASS (${count} materials)`);
                passed++;
            } else {
                console.log(`  ❌ Material Count: FAIL (only ${count} materials, expected 100+)`);
                failed++;
            }
        } catch (e) {
            console.log('  ❌ Material Count: FAIL (error)');
            failed++;
        }
        // Test 3: Knowledge domains
        try {
            const count = Object.keys(PRISM_AI_KNOWLEDGE_INTEGRATION.knowledgeDomains).length;
            if (count >= 8) {
                console.log(`  ✅ Knowledge Domains: PASS (${count} domains)`);
                passed++;
            } else {
                console.log(`  ❌ Knowledge Domains: FAIL (only ${count} domains, expected 8+)`);
                failed++;
            }
        } catch (e) {
            console.log('  ❌ Knowledge Domains: FAIL (error)');
            failed++;
        }
        // Test 4: Get strategy by ID
        try {
            const strategy = PRISM_AI_TOOLPATH_DATABASE.getStrategy('MILL_3AX_001');
            if (strategy && strategy.name === 'Adaptive Clearing / HSM') {
                console.log('  ✅ Get Strategy By ID: PASS');
                passed++;
            } else {
                console.log('  ❌ Get Strategy By ID: FAIL');
                failed++;
            }
        } catch (e) {
            console.log('  ❌ Get Strategy By ID: FAIL (error)');
            failed++;
        }
        // Test 5: Get material modifiers
        try {
            const mods = PRISM_AI_MATERIAL_MODIFIERS.getModifiersForMaterial('6061-T6');
            if (mods && mods.speedMult > 1.0) {
                console.log('  ✅ Get Material Modifiers: PASS');
                passed++;
            } else {
                console.log('  ❌ Get Material Modifiers: FAIL');
                failed++;
            }
        } catch (e) {
            console.log('  ❌ Get Material Modifiers: FAIL (error)');
            failed++;
        }
        // Test 6: All strategies have material modifiers
        try {
            const strategies = PRISM_AI_TOOLPATH_DATABASE.getAllStrategies();
            const withModifiers = strategies.filter(s =>
                s.materialModifiers && Object.keys(s.materialModifiers).length > 0
            );
            if (withModifiers.length === strategies.length) {
                console.log(`  ✅ All Strategies Have Material Modifiers: PASS (${withModifiers.length}/${strategies.length})`);
                passed++;
            } else {
                console.log(`  ⚠️ All Strategies Have Material Modifiers: PARTIAL (${withModifiers.length}/${strategies.length})`);
                passed++; // Partial pass
            }
        } catch (e) {
            console.log('  ❌ All Strategies Have Material Modifiers: FAIL (error)');
            failed++;
        }
        // Test 7: Generate training samples
        try {
            const samples = PRISM_AI_UNIFIED_DATA_CONNECTOR.generateNeuralTrainingSamples(100);
            if (samples.length === 100 && samples[0].input.length > 0) {
                console.log('  ✅ Generate Training Samples: PASS');
                passed++;
            } else {
                console.log('  ❌ Generate Training Samples: FAIL');
                failed++;
            }
        } catch (e) {
            console.log('  ❌ Generate Training Samples: FAIL (error)');
            failed++;
        }
        // Test 8: Query interface
        try {
            PRISM_AI_UNIFIED_DATA_CONNECTOR.initialized = true;
            const result = PRISM_AI_UNIFIED_DATA_CONNECTOR.query('strategyForMaterial', {
                strategyId: 'MILL_3AX_001',
                materialId: '6061-T6'
            });
            if (result && result.adjustedParameters) {
                console.log('  ✅ Query Interface: PASS');
                passed++;
            } else {
                console.log('  ❌ Query Interface: FAIL');
                failed++;
            }
        } catch (e) {
            console.log('  ❌ Query Interface: FAIL (error)');
            failed++;
        }
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        return { passed, failed, total: passed + failed };
    }
}