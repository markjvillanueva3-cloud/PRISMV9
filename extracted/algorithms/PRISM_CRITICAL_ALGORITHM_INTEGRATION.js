/**
 * PRISM_CRITICAL_ALGORITHM_INTEGRATION
 * Extracted from PRISM v8.89.002 monolith
 * References: 16
 * Category: integration
 * Lines: 180
 * Session: R2.3.2 Algorithm Extraction
 */

const PRISM_CRITICAL_ALGORITHM_INTEGRATION = {
    name: 'Critical Algorithm Integration Module',
    version: '8.61.000',

    integrate() {
        console.log('[INTEGRATION] Integrating critical algorithms with PRISM architecture...');

        // 1. Register with window global
        if (typeof window !== 'undefined') {
            window.PRISM_VORONOI_ENGINE = PRISM_VORONOI_ENGINE;
            window.PRISM_INTERIOR_POINT_ENGINE = PRISM_INTERIOR_POINT_ENGINE;
            window.PRISM_EKF_ENGINE = PRISM_EKF_ENGINE;
            window.PRISM_ADVANCED_REST_MACHINING = PRISM_ADVANCED_REST_MACHINING;
            console.log('  ✓ Registered global algorithm engines');
        }
        // 2. Integrate with PRISM_MASTER if available
        if (typeof window !== 'undefined' && window.PRISM_MASTER) {
            const master = window.PRISM_MASTER;

            // Add to camToolpath controller
            if (master.masterControllers?.camToolpath) {
                master.masterControllers.camToolpath.voronoi = PRISM_VORONOI_ENGINE;
                master.masterControllers.camToolpath.advancedREST = PRISM_ADVANCED_REST_MACHINING;
                master.masterControllers.camToolpath.generateAdvancedREST = function(geometry, prevOps, tool, opts) {
                    return PRISM_ADVANCED_REST_MACHINING.generateAdvancedREST(geometry, prevOps, tool, opts);
                };
                console.log('  ✓ Integrated with camToolpath controller');
            }
            // Add to optimization controller
            if (master.masterControllers?.optimization) {
                master.masterControllers.optimization.interiorPoint = PRISM_INTERIOR_POINT_ENGINE;
                master.masterControllers.optimization.optimizeFeedRates = function(toolpath, constraints) {
                    return PRISM_INTERIOR_POINT_ENGINE.optimizeFeedRates(toolpath, constraints);
                };
                console.log('  ✓ Integrated with optimization controller');
            }
            // Add to precision controller
            if (master.masterControllers?.precisionController) {
                master.masterControllers.precisionController.ekf = PRISM_EKF_ENGINE;
                master.masterControllers.precisionController.createPositionEKF = function(pos, opts) {
                    return PRISM_EKF_ENGINE.createMachinePositionEKF(pos, opts);
                };
                master.masterControllers.precisionController.createThermalEKF = function(opts) {
                    return PRISM_EKF_ENGINE.createThermalCompensationEKF(opts);
                };
                console.log('  ✓ Integrated with precision controller');
            }
        }
        // 3. Integrate with COMPLETE_TOOLPATH_ALGORITHM_LIBRARY
        if (typeof window !== 'undefined' && window.COMPLETE_TOOLPATH_ALGORITHM_LIBRARY) {
            window.COMPLETE_TOOLPATH_ALGORITHM_LIBRARY.voronoiDiagram = PRISM_VORONOI_ENGINE;
            window.COMPLETE_TOOLPATH_ALGORITHM_LIBRARY.advancedRestMachining = PRISM_ADVANCED_REST_MACHINING;
            console.log('  ✓ Integrated with COMPLETE_TOOLPATH_ALGORITHM_LIBRARY');
        }
        // 4. Integrate with MIT_ALGORITHM_LIBRARY if it exists
        if (typeof window !== 'undefined' && window.MIT_ALGORITHM_LIBRARY) {
            window.MIT_ALGORITHM_LIBRARY.voronoi = PRISM_VORONOI_ENGINE;
            window.MIT_ALGORITHM_LIBRARY.interiorPoint = PRISM_INTERIOR_POINT_ENGINE;
            window.MIT_ALGORITHM_LIBRARY.extendedKalman = PRISM_EKF_ENGINE;
            console.log('  ✓ Integrated with MIT_ALGORITHM_LIBRARY');
        }
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[INTEGRATION] Critical algorithm integration complete!');

        return {
            voronoi: PRISM_VORONOI_ENGINE,
            interiorPoint: PRISM_INTERIOR_POINT_ENGINE,
            ekf: PRISM_EKF_ENGINE,
            advancedREST: PRISM_ADVANCED_REST_MACHINING
        };
    },
    // Run tests to verify integration
    runTests() {
        console.log('\n[TESTING] Running critical algorithm tests...\n');
        const results = { passed: 0, failed: 0, tests: [] };

        // Test 1: Voronoi diagram
        try {
            const points = [
                { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 },
                { x: 3, y: 5 }, { x: 7, y: 5 }, { x: 5, y: 3 }
            ];
            const voronoi = PRISM_VORONOI_ENGINE.compute(points);

            if (voronoi.cells.length === 6 && voronoi.sites.length === 6) {
                results.passed++;
                results.tests.push({ name: 'Voronoi Diagram', status: 'PASS' });
                console.log('  ✓ Voronoi Diagram: PASS');
            } else {
                throw new Error('Invalid cell/site count');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Voronoi Diagram', status: 'FAIL', error: e.message });
            console.log('  ✗ Voronoi Diagram: FAIL -', e.message);
        }
        // Test 2: Interior Point LP
        try {
            // Simple LP: max x + y s.t. x + y <= 10, x <= 6, y <= 8, x,y >= 0
            const c = [-1, -1];  // Minimize negative = maximize
            const A = [[1, 1], [1, 0], [0, 1]];
            const b = [10, 6, 8];

            const result = PRISM_INTERIOR_POINT_ENGINE.solveLP(c, A, b);

            if (result.converged && Math.abs(result.x[0] - 6) < 0.5 && Math.abs(result.x[1] - 4) < 0.5) {
                results.passed++;
                results.tests.push({ name: 'Interior Point LP', status: 'PASS' });
                console.log('  ✓ Interior Point LP: PASS (x=' + result.x[0].toFixed(2) + ', y=' + result.x[1].toFixed(2) + ')');
            } else {
                throw new Error('Solution not optimal: x=' + result.x[0].toFixed(2) + ', y=' + result.x[1].toFixed(2));
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Interior Point LP', status: 'FAIL', error: e.message });
            console.log('  ✗ Interior Point LP: FAIL -', e.message);
        }
        // Test 3: Extended Kalman Filter
        try {
            const ekf = PRISM_EKF_ENGINE.createMachinePositionEKF([0, 0, 0]);

            // Simulate some measurements
            ekf.predict();
            ekf.update([0.1, 0.05, 0]);
            ekf.predict();
            ekf.update([0.2, 0.1, 0]);

            const state = ekf.getState();

            if (state.x[0] > 0 && state.x[1] > 0 && state.uncertainty[0] < 1) {
                results.passed++;
                results.tests.push({ name: 'Extended Kalman Filter', status: 'PASS' });
                console.log('  ✓ Extended Kalman Filter: PASS (pos=[' +
                    state.x[0].toFixed(3) + ',' + state.x[1].toFixed(3) + ',' + state.x[2].toFixed(3) + '])');
            } else {
                throw new Error('Invalid state estimation');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Extended Kalman Filter', status: 'FAIL', error: e.message });
            console.log('  ✗ Extended Kalman Filter: FAIL -', e.message);
        }
        // Test 4: Advanced REST Machining
        try {
            const geometry = {
                bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100, minZ: 0, maxZ: 20 },
                corners: [
                    { center: { x: 10, y: 10 }, radius: 3, depth: 15 },
                    { center: { x: 90, y: 10 }, radius: 3, depth: 15 }
                ]
            };
            const prevOps = [{
                tool: { diameter: 20 },
                points: [{ x: 50, y: 50, z: -10 }]
            }];
            const currentTool = { diameter: 6 };

            const rest = PRISM_ADVANCED_REST_MACHINING.generateAdvancedREST(
                geometry, prevOps, currentTool, { stepover: 0.5 }
            );

            if (rest.regions.length >= 2 && rest.toolpaths.length > 0) {
                results.passed++;
                results.tests.push({ name: 'Advanced REST Machining', status: 'PASS' });
                console.log('  ✓ Advanced REST Machining: PASS (' + rest.regions.length + ' regions, ' +
                    rest.statistics.totalPoints + ' points)');
            } else {
                throw new Error('Insufficient regions/toolpaths');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Advanced REST Machining', status: 'FAIL', error: e.message });
            console.log('  ✗ Advanced REST Machining: FAIL -', e.message);
        }
        // Summary
        console.log('\n[TESTING] Results: ' + results.passed + '/' + (results.passed + results.failed) + ' tests passed');
        console.log('  Success Rate: ' + (results.passed / (results.passed + results.failed) * 100).toFixed(1) + '%\n');

        return results;
    }
}