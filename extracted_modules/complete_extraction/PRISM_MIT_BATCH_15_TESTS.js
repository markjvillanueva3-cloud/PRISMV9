const PRISM_MIT_BATCH_15_TESTS = {
    runAll: function() {
        console.log('\n[PRISM MIT Batch 15] Running Self-Tests...\n');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Abbe Error
        try {
            const abbe = PRISM_PRECISION_DESIGN.abbeError(100, 1);
            if (Math.abs(abbe.positionError_um - 0.485) < 0.01) {
                console.log('✓ Abbe error calculation');
                passed++;
            } else {
                throw new Error(`Expected ~0.485 μm, got ${abbe.positionError_um}`);
            }
        } catch (e) {
            console.log('✗ Abbe error:', e.message);
            failed++;
        }
        
        // Test 2: Thermal Expansion
        try {
            const thermal = PRISM_PRECISION_DESIGN.thermalExpansion(1000, 10, 'aluminum');
            if (Math.abs(thermal.expansion_um - 230) < 5) {
                console.log('✓ Thermal expansion calculation');
                passed++;
            } else {
                throw new Error(`Expected ~230 μm, got ${thermal.expansion_um}`);
            }
        } catch (e) {
            console.log('✗ Thermal expansion:', e.message);
            failed++;
        }
        
        // Test 3: Process Capability
        try {
            const cap = PRISM_SPC.processCapability(10.5, 9.5, 10.0, 0.1);
            if (Math.abs(cap.Cpk - 1.667) < 0.01) {
                console.log('✓ Process capability Cpk');
                passed++;
            } else {
                throw new Error(`Expected ~1.667, got ${cap.Cpk}`);
            }
        } catch (e) {
            console.log('✗ Process capability:', e.message);
            failed++;
        }
        
        // Test 4: Merchant Forces
        try {
            const forces = PRISM_CUTTING_PHYSICS.merchantForces({
                chipThickness_mm: 0.1,
                chipWidth_mm: 2,
                rakeAngle_deg: 10,
                frictionAngle_deg: 35,
                shearStrength_MPa: 400
            });
            if (forces.cuttingForce_N > 100 && forces.thrustForce_N > 0) {
                console.log('✓ Merchant force calculation');
                passed++;
            } else {
                throw new Error('Invalid force values');
            }
        } catch (e) {
            console.log('✗ Merchant forces:', e.message);
            failed++;
        }
        
        // Test 5: Taylor Tool Life
        try {
            const taylor = PRISM_CUTTING_PHYSICS.taylorToolLife(100, { n: 0.25, C: 300 });
            if (taylor.toolLife_min > 0 && taylor.toolLife_min < 1000) {
                console.log('✓ Taylor tool life calculation');
                passed++;
            } else {
                throw new Error(`Unexpected tool life: ${taylor.toolLife_min}`);
            }
        } catch (e) {
            console.log('✗ Taylor tool life:', e.message);
            failed++;
        }
        
        // Test 6: Tolerance Stackup
        try {
            const stackup = PRISM_DFM.toleranceStackup([
                { name: 'A', nominal: 10, tolerance: 0.1 },
                { name: 'B', nominal: 20, tolerance: 0.2 },
                { name: 'C', nominal: 15, tolerance: 0.15 }
            ], 'rss');
            const expectedRSS = Math.sqrt(0.1*0.1 + 0.2*0.2 + 0.15*0.15);
            if (Math.abs(stackup.totalTolerance - expectedRSS) < 0.001) {
                console.log('✓ Tolerance stackup RSS');
                passed++;
            } else {
                throw new Error(`Expected ${expectedRSS}, got ${stackup.totalTolerance}`);
            }
        } catch (e) {
            console.log('✗ Tolerance stackup:', e.message);
            failed++;
        }
        
        // Test 7: Blade Flexure
        try {
            const flexure = PRISM_MICRO_DESIGN.bladeFlexure({
                length_mm: 10,
                width_mm: 5,
                thickness_mm: 0.5
            });
            if (parseFloat(flexure.stiffnessRatio) > 100) {
                console.log('✓ Blade flexure stiffness');
                passed++;
            } else {
                throw new Error(`Low stiffness ratio: ${flexure.stiffnessRatio}`);
            }
        } catch (e) {
            console.log('✗ Blade flexure:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
}