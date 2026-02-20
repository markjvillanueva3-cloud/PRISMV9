const PRISM_CONSTANTS_TEST = {
    run: function() {
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Test 1: Version defined
        try {
            const pass = typeof PRISM_CONSTANTS.VERSION === 'string' && PRISM_CONSTANTS.VERSION.length > 0;
            results.tests.push({ name: 'VERSION defined', pass, value: PRISM_CONSTANTS.VERSION });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'VERSION defined', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 2: TOLERANCE section complete
        try {
            const required = ['POSITION', 'ANGLE', 'PARAMETER', 'CONVERGENCE', 'ZERO', 'SURFACE_FINISH', 'TOOL_WEAR'];
            const missing = required.filter(k => PRISM_CONSTANTS.TOLERANCE[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'TOLERANCE complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'TOLERANCE complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 3: LIMITS section complete
        try {
            const required = ['MAX_ITERATIONS', 'MAX_RPM', 'MAX_FEED', 'MAX_DOC', 'MAX_POWER'];
            const missing = required.filter(k => PRISM_CONSTANTS.LIMITS[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'LIMITS complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'LIMITS complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 4: AI section exists and complete
        try {
            const required = ['PSO_MAX_PARTICLES', 'PSO_MAX_ITERATIONS', 'BAYESIAN_CONFIDENCE_THRESHOLD', 
                            'NEURAL_MAX_LAYERS', 'MONTE_CARLO_SAMPLES', 'GA_MAX_POPULATION'];
            const missing = required.filter(k => PRISM_CONSTANTS.AI[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'AI section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'AI section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 5: MATERIALS section exists and complete
        try {
            const required = ['STEEL_DENSITY', 'CARBIDE_YOUNGS_MODULUS', 'HSS_YOUNGS_MODULUS', 'ALUMINUM_DENSITY'];
            const missing = required.filter(k => PRISM_CONSTANTS.MATERIALS[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'MATERIALS section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'MATERIALS section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 6: UTILIZATION section exists and complete
        try {
            const required = ['MIN_DATABASE_CONSUMERS', 'MIN_AI_ENGINE_USES', 'MIN_PHYSICS_CONTEXTS', 'MIN_CALCULATION_SOURCES'];
            const missing = required.filter(k => PRISM_CONSTANTS.UTILIZATION[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'UTILIZATION section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'UTILIZATION section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 7: TAYLOR section exists and complete
        try {
            const required = ['DEFAULT_N_STEEL', 'VB_MAX_ROUGHING', 'FEED_EXPONENT'];
            const missing = required.filter(k => PRISM_CONSTANTS.TAYLOR[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'TAYLOR section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'TAYLOR section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 8: FORCE section exists and complete
        try {
            const required = ['DEFAULT_KC_STEEL', 'DEFAULT_MC_STEEL', 'FORCE_SAFETY_FACTOR'];
            const missing = required.filter(k => PRISM_CONSTANTS.FORCE[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'FORCE section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'FORCE section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 9: STABILITY section exists
        try {
            const required = ['DEFAULT_DAMPING_RATIO', 'FFT_WINDOW_SIZE', 'STABILITY_MARGIN'];
            const missing = required.filter(k => PRISM_CONSTANTS.STABILITY[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'STABILITY section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'STABILITY section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 10: THERMAL section exists
        try {
            const required = ['COOLANT_SPECIFIC_HEAT', 'MAX_TOOL_TEMP_CARBIDE', 'CHIP_HEAT_FRACTION'];
            const missing = required.filter(k => PRISM_CONSTANTS.THERMAL[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'THERMAL section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'THERMAL section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 11: QUALITY section exists
        try {
            const required = ['RA_ROUGH', 'RA_FINISH', 'CPK_MINIMUM'];
            const missing = required.filter(k => PRISM_CONSTANTS.QUALITY[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'QUALITY section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'QUALITY section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 12: COATINGS section exists
        try {
            const required = ['LIFE_TIALN', 'SPEED_TIALN', 'COST_TIALN', 'MAX_TEMP_TIALN', 'LIFE_CBN', 'LIFE_DIAMOND'];
            const missing = required.filter(k => PRISM_CONSTANTS.COATINGS[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'COATINGS section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'COATINGS section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 13: COOLANT section exists
        try {
            const required = ['LIFE_FLOOD', 'SPEED_FLOOD', 'LIFE_THROUGH_SPINDLE', 'LIFE_CRYOGENIC', 'PRESSURE_HIGH'];
            const missing = required.filter(k => PRISM_CONSTANTS.COOLANT[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'COOLANT section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'COOLANT section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 14: OPERATIONS section exists
        try {
            const required = ['ROUGHING_DOC_PERCENT', 'FINISHING_SPEED_FACTOR', 'HSM_RADIAL_ENGAGEMENT_MAX', 'TROCHOIDAL_STEPOVER_PERCENT'];
            const missing = required.filter(k => PRISM_CONSTANTS.OPERATIONS[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'OPERATIONS section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'OPERATIONS section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 15: INTERPOLATION section exists
        try {
            const required = ['PARAMETER_SAFETY_FACTOR', 'UNTESTED_SAFETY_FACTOR', 'DIFFICULT_MATERIAL_SAFETY'];
            const missing = required.filter(k => PRISM_CONSTANTS.INTERPOLATION[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'INTERPOLATION section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'INTERPOLATION section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 16: CONFIDENCE section exists
        try {
            const required = ['HIGH', 'MEDIUM', 'LOW', 'AUTO_PROCEED_THRESHOLD', 'RECOMMEND_THRESHOLD'];
            const missing = required.filter(k => PRISM_CONSTANTS.CONFIDENCE[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'CONFIDENCE section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'CONFIDENCE section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 17: MANUFACTURERS section exists
        try {
            const required = ['QUALITY_SANDVIK', 'QUALITY_KENNAMETAL', 'PREMIUM_THRESHOLD', 'QUALITY_DEFAULT'];
            const missing = required.filter(k => PRISM_CONSTANTS.MANUFACTURERS[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'MANUFACTURERS section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'MANUFACTURERS section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 18: GCODE section exists
        try {
            const required = ['G_RAPID', 'G_LINEAR', 'M_SPINDLE_CW', 'M_TOOL_CHANGE', 'G_CUTTER_COMP_LEFT'];
            const missing = required.filter(k => PRISM_CONSTANTS.GCODE[k] === undefined);
            const pass = missing.length === 0;
            results.tests.push({ name: 'GCODE section complete', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'GCODE section complete', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 19: All 19 sections are frozen (immutable)
        try {
            const sections = ['TOLERANCE', 'LIMITS', 'PHYSICS', 'MATERIALS', 'AI', 'UTILIZATION', 'TAYLOR', 'FORCE',
                            'QUALITY', 'STABILITY', 'THERMAL', 'MACHINING', 'COATINGS', 'COOLANT', 'OPERATIONS',
                            'INTERPOLATION', 'CONFIDENCE', 'MANUFACTURERS', 'GCODE'];
            const unfrozen = sections.filter(s => !Object.isFrozen(PRISM_CONSTANTS[s]));
            const pass = unfrozen.length === 0;
            results.tests.push({ name: 'All 19 sections frozen', pass, unfrozen });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'All 19 sections frozen', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 20: Helper functions exist
        try {
            const helpers = ['PRISM_COATING_LOOKUP', 'PRISM_COOLANT_LOOKUP', 'PRISM_MANUFACTURER_LOOKUP', 
                           'PRISM_CONFIDENCE_CHECK', 'PRISM_OPERATION_PARAMS', 'PRISM_MATERIAL_PHYSICS',
                           'PRISM_TAYLOR_LOOKUP', 'PRISM_FORCE_LOOKUP', 'PRISM_AI_PARAMS'];
            const missing = helpers.filter(h => typeof window[h] !== 'object');
            const pass = missing.length === 0;
            results.tests.push({ name: '9 Helper functions exist', pass, missing });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: '9 Helper functions exist', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 21: Coating lookup works correctly
        try {
            const tialn = window.PRISM_COATING_LOOKUP.getLifeFactor('TiAlN');
            const pass = tialn === 2.2;
            results.tests.push({ name: 'PRISM_COATING_LOOKUP works', pass, expected: 2.2, got: tialn });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'PRISM_COATING_LOOKUP works', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 22: Material physics lookup works
        try {
            const steelDensity = window.PRISM_MATERIAL_PHYSICS.getDensity('steel');
            const pass = steelDensity === 7850;
            results.tests.push({ name: 'PRISM_MATERIAL_PHYSICS works', pass, expected: 7850, got: steelDensity });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'PRISM_MATERIAL_PHYSICS works', pass: false, error: e.message });
            results.failed++;
        }
        
        // Test 23: AI params lookup works
        try {
            const pso = window.PRISM_AI_PARAMS.getPSO();
            const pass = pso.particles === 100 && pso.iterations === 200;
            results.tests.push({ name: 'PRISM_AI_PARAMS works', pass, got: pso });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'PRISM_AI_PARAMS works', pass: false, error: e.message });
            results.failed++;
        }
        
        // Summary
        results.summary = {
            total: results.passed + results.failed,
            passed: results.passed,
            failed: results.failed,
            score: (results.passed / (results.passed + results.failed) * 100).toFixed(1) + '%'
        };
        
        return results;
    },
    
    printResults: function() {
        const results = this.run();
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('           PRISM_CONSTANTS SELF-TEST RESULTS');
        console.log('           Session 1.1 Enhanced - 23 Tests');
        console.log('═══════════════════════════════════════════════════════════════');
        
        for (const test of results.tests) {
            const icon = test.pass ? '✓' : '✗';
            const status = test.pass ? 'PASS' : 'FAIL';
            console.log(`${icon} ${test.name}: ${status}`);
            if (!test.pass && test.missing) {
                console.log(`  Missing: ${test.missing.join(', ')}`);
            }
            if (!test.pass && test.error) {
                console.log(`  Error: ${test.error}`);
            }
        }
        
        console.log('───────────────────────────────────────────────────────────────');
        console.log(`TOTAL: ${results.summary.passed}/${results.summary.total} passed (${results.summary.score})`);
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        return results;
    }
}