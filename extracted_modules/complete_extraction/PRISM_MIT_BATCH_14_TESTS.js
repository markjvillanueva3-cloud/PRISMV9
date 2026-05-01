const PRISM_MIT_BATCH_14_TESTS = {
    runAll: function() {
        console.log('=== PRISM MIT Batch 14 Self-Tests ===');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Bézier evaluation
        try {
            const cp = [{x:0,y:0}, {x:1,y:2}, {x:3,y:2}, {x:4,y:0}];
            const pt = PRISM_BEZIER_MIT.evaluate(0.5, cp);
            if (Math.abs(pt.x - 2) < 0.01 && Math.abs(pt.y - 1.5) < 0.01) {
                console.log('✓ Bézier curve evaluation');
                passed++;
            } else {
                throw new Error(`Expected (2, 1.5), got (${pt.x}, ${pt.y})`);
            }
        } catch (e) {
            console.log('✗ Bézier evaluation:', e.message);
            failed++;
        }
        
        // Test 2: de Casteljau subdivision
        try {
            const cp = [{x:0,y:0,z:0}, {x:1,y:1,z:0}, {x:2,y:0,z:0}];
            const result = PRISM_BEZIER_MIT.deCasteljau(0.5, cp);
            if (result.left.length === 3 && result.right.length === 3) {
                console.log('✓ de Casteljau subdivision');
                passed++;
            } else {
                throw new Error('Subdivision failed');
            }
        } catch (e) {
            console.log('✗ de Casteljau:', e.message);
            failed++;
        }
        
        // Test 3: RK4 ODE solver
        try {
            const f = (t, y) => -y; // dy/dt = -y, solution: y = e^(-t)
            const result = PRISM_ODE_SOLVERS_MIT.rk4(f, 1, 0, 1, 100);
            const expected = Math.exp(-1);
            if (Math.abs(result.y[100] - expected) < 0.001) {
                console.log('✓ RK4 ODE solver');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${result.y[100]}`);
            }
        } catch (e) {
            console.log('✗ RK4:', e.message);
            failed++;
        }
        
        // Test 4: LU decomposition
        try {
            const A = [[2, 1], [1, 3]];
            const b = [3, 4];
            const x = PRISM_LINALG_MIT.solveLU(A, b);
            // Verify: Ax = b
            const check = A[0][0]*x[0] + A[0][1]*x[1];
            if (Math.abs(check - b[0]) < 0.001) {
                console.log('✓ LU decomposition solve');
                passed++;
            } else {
                throw new Error('LU solve failed');
            }
        } catch (e) {
            console.log('✗ LU solve:', e.message);
            failed++;
        }
        
        // Test 5: B-spline basis
        try {
            const knots = [0, 0, 0, 1, 1, 1]; // Cubic, clamped
            const N0 = PRISM_NURBS_MIT.basisFunction(0, 3, 0, knots);
            if (Math.abs(N0 - 1) < 0.001) {
                console.log('✓ B-spline basis function');
                passed++;
            } else {
                throw new Error(`Expected 1, got ${N0}`);
            }
        } catch (e) {
            console.log('✗ B-spline basis:', e.message);
            failed++;
        }
        
        // Test 6: Digital PID
        try {
            const pid = PRISM_DIGITAL_CONTROL_MIT.createDigitalPID(1, 0.1, 0.01, 0.01);
            const u = pid.compute(10, 0);
            if (u > 0) {
                console.log('✓ Digital PID controller');
                passed++;
            } else {
                throw new Error('PID output should be positive');
            }
        } catch (e) {
            console.log('✗ Digital PID:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
}