const PRISM_MIT_BATCH_20_TESTS = {
    runAll: function() {
        console.log('\n[PRISM MIT Batch 20] Running Self-Tests...\n');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Bisection root finding
        try {
            const result = PRISM_NUMERICAL.bisection(x => x*x - 4, 0, 3);
            if (Math.abs(result.root - 2) < 0.0001) {
                console.log('✓ Bisection root finding');
                passed++;
            } else {
                throw new Error(`Expected 2, got ${result.root}`);
            }
        } catch (e) {
            console.log('✗ Bisection:', e.message);
            failed++;
        }
        
        // Test 2: Newton-Raphson
        try {
            const result = PRISM_NUMERICAL.newtonRaphson(
                x => x*x - 4,
                x => 2*x,
                3
            );
            if (Math.abs(result.root - 2) < 0.0001) {
                console.log('✓ Newton-Raphson');
                passed++;
            } else {
                throw new Error(`Expected 2, got ${result.root}`);
            }
        } catch (e) {
            console.log('✗ Newton-Raphson:', e.message);
            failed++;
        }
        
        // Test 3: Gear train
        try {
            const gears = PRISM_MECHANISMS.gearTrain([
                { teeth: 20 }, { teeth: 40 },
                { teeth: 15 }, { teeth: 45 }
            ]);
            if (Math.abs(gears.totalRatio - 6) < 0.01) {
                console.log('✓ Gear train analysis');
                passed++;
            } else {
                throw new Error(`Expected ratio 6, got ${gears.totalRatio}`);
            }
        } catch (e) {
            console.log('✗ Gear train:', e.message);
            failed++;
        }
        
        // Test 4: Principal stress
        try {
            const stress = PRISM_STRESS.principalStress({
                sigmaX: 100, sigmaY: 0, tauXY: 50
            });
            // σ1,2 = 50 ± √(2500 + 2500) = 50 ± 70.7
            if (Math.abs(stress.sigma1 - 120.71) < 1 && Math.abs(stress.sigma2 - (-20.71)) < 1) {
                console.log('✓ Principal stress');
                passed++;
            } else {
                throw new Error(`Got σ1=${stress.sigma1}, σ2=${stress.sigma2}`);
            }
        } catch (e) {
            console.log('✗ Principal stress:', e.message);
            failed++;
        }
        
        // Test 5: Von Mises (2D)
        try {
            const vm = PRISM_STRESS.vonMises({ sigmaX: 100, sigmaY: 50, tauXY: 25 });
            // σvm = √(100² - 100×50 + 50² + 3×25²) = √(10000 - 5000 + 2500 + 1875) = √9375
            const expected = Math.sqrt(9375);
            if (Math.abs(vm.vonMisesStress - expected) < 1) {
                console.log('✓ Von Mises stress');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${vm.vonMisesStress}`);
            }
        } catch (e) {
            console.log('✗ Von Mises:', e.message);
            failed++;
        }
        
        // Test 6: Goodman fatigue
        try {
            const fatigue = PRISM_FATIGUE.goodman({
                sigmaA: 100, sigmaM: 50, Se: 300, Sut: 600
            });
            // n = 1 / (100/300 + 50/600) = 1 / (0.333 + 0.083) = 2.4
            if (Math.abs(fatigue.safetyFactor - 2.4) < 0.1) {
                console.log('✓ Goodman fatigue');
                passed++;
            } else {
                throw new Error(`Expected ~2.4, got ${fatigue.safetyFactor}`);
            }
        } catch (e) {
            console.log('✗ Goodman:', e.message);
            failed++;
        }
        
        // Test 7: Bearing life
        try {
            const bearing = PRISM_DESIGN.bearingLife({
                C: 50000, P: 10000, n_rpm: 1000, type: 'ball'
            });
            // L10 = (50000/10000)³ × 10⁶ = 125 × 10⁶ rev
            if (Math.abs(bearing.L10_revolutions - 125e6) < 1e6) {
                console.log('✓ Bearing life');
                passed++;
            } else {
                throw new Error(`Expected 125M, got ${bearing.L10_revolutions}`);
            }
        } catch (e) {
            console.log('✗ Bearing life:', e.message);
            failed++;
        }
        
        // Test 8: Spring design
        try {
            const spring = PRISM_DESIGN.helicalSpring({
                d: 2, D: 16, Na: 10, G: 80000
            });
            // k = Gd⁴/(8D³Na) = 80000×16/(8×4096×10) = 3.9 N/mm
            if (Math.abs(spring.springRate - 3.9) < 0.5) {
                console.log('✓ Spring design');
                passed++;
            } else {
                throw new Error(`Expected ~3.9, got ${spring.springRate}`);
            }
        } catch (e) {
            console.log('✗ Spring design:', e.message);
            failed++;
        }
        
        // Test 9: Abbe error
        try {
            const abbe = PRISM_PRECISION.abbeError({
                offset: 100,
                angularError: 10,
                isDegrees: false  // 10 arcsec ≈ 0.000048 rad
            });
            // For 10 radians (large angle for testing)
            if (abbe.abbeError !== undefined) {
                console.log('✓ Abbe error');
                passed++;
            } else {
                throw new Error('Abbe error not calculated');
            }
        } catch (e) {
            console.log('✗ Abbe error:', e.message);
            failed++;
        }
        
        // Test 10: Thermal error
        try {
            const thermal = PRISM_PRECISION.thermalError({
                length: 1000,
                alpha: 11.7e-6,
                deltaT: 1
            });
            // ΔL = 11.7e-6 × 1000 × 1 = 0.0117 mm
            if (Math.abs(thermal.thermalExpansion - 0.0117) < 0.001) {
                console.log('✓ Thermal error');
                passed++;
            } else {
                throw new Error(`Expected 0.0117, got ${thermal.thermalExpansion}`);
            }
        } catch (e) {
            console.log('✗ Thermal error:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
}