const PRISM_SESSION4_TESTS = {
    runAll: function() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(' PRISM SESSION 4 PHYSICS & DYNAMICS TESTS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let passed = 0, failed = 0;
        
        // Test 1: Merchant Circle
        try {
            const result = PRISM_CUTTING_MECHANICS.merchantCircle({
                width: 2,
                depth: 0.2,
                rakeAngle: 10,
                frictionCoef: 0.5,
                shearStrength: 400
            });
            if (result.cuttingForce > 0 && result.shearAngle > 0 && result.shearAngle < 90) {
                console.log(`  ✓ Merchant Circle (Fc=${result.cuttingForce.toFixed(0)}N, φ=${result.shearAngle.toFixed(1)}°)`);
                passed++;
            } else {
                console.log('  ✗ Merchant Circle');
                failed++;
            }
        } catch (e) { console.log('  ✗ Merchant Circle:', e.message); failed++; }
        
        // Test 2: Loewen-Shaw Temperature
        try {
            const result = PRISM_THERMAL_MODELING.loewenShawTemperature({
                cuttingSpeed: 200,
                feed: 0.2,
                depthOfCut: 2,
                specificCuttingForce: 2500,
                materialDensity: 7850,
                specificHeat: 500,
                thermalConductivity: 50
            });
            if (result.interfaceTemp > 100 && result.interfaceTemp < 1500) {
                console.log(`  ✓ Loewen-Shaw Temperature (T=${result.interfaceTemp.toFixed(0)}°C)`);
                passed++;
            } else {
                console.log('  ✗ Loewen-Shaw Temperature');
                failed++;
            }
        } catch (e) { console.log('  ✗ Loewen-Shaw:', e.message); failed++; }
        
        // Test 3: Extended Taylor
        try {
            const result = PRISM_TOOL_WEAR_MODELS.extendedTaylor({
                cuttingSpeed: 200,
                feed: 0.2,
                depthOfCut: 2,
                C: 300,
                n: 0.25
            });
            if (result.toolLife > 0 && result.toolLife < 1000) {
                console.log(`  ✓ Extended Taylor (T=${result.toolLife.toFixed(1)} min)`);
                passed++;
            } else {
                console.log('  ✗ Extended Taylor');
                failed++;
            }
        } catch (e) { console.log('  ✗ Extended Taylor:', e.message); failed++; }
        
        // Test 4: Usui Wear
        try {
            const result = PRISM_TOOL_WEAR_MODELS.usuiWearModel({
                normalStress: 500,
                slidingVelocity: 200,
                temperature: 600
            });
            if (result.wearRateMicrons > 0 && result.wearRateMicrons < 100) {
                console.log(`  ✓ Usui Wear Model (rate=${result.wearRateMicrons.toFixed(3)} μm/min)`);
                passed++;
            } else {
                console.log('  ✗ Usui Wear Model');
                failed++;
            }
        } catch (e) { console.log('  ✗ Usui Wear:', e.message); failed++; }
        
        // Test 5: Single DOF Vibration
        try {
            const result = PRISM_VIBRATION_ANALYSIS.singleDOF({
                mass: 10,
                stiffness: 1e6,
                damping: 500
            });
            if (result.naturalFrequency > 0 && result.dampingRatio > 0 && result.dampingRatio < 1) {
                console.log(`  ✓ Single DOF (fn=${result.naturalFrequency.toFixed(1)} Hz, ζ=${result.dampingRatio.toFixed(3)})`);
                passed++;
            } else {
                console.log('  ✗ Single DOF Vibration');
                failed++;
            }
        } catch (e) { console.log('  ✗ Single DOF:', e.message); failed++; }
        
        // Test 6: Stability Lobe Diagram
        try {
            const result = PRISM_VIBRATION_ANALYSIS.stabilityLobeDiagram({
                naturalFrequency: 500,
                dampingRatio: 0.03,
                stiffness: 5e7,
                specificCuttingForce: 2500,
                numTeeth: 4,
                rpmRange: [3000, 15000]
            });
            if (result.lobes.length > 0 && result.sweetSpots.length > 0) {
                console.log(`  ✓ Stability Lobes (${result.lobes.length} lobes, sweet spot: ${result.sweetSpots[0]?.rpm.toFixed(0)} RPM)`);
                passed++;
            } else {
                console.log('  ✗ Stability Lobes');
                failed++;
            }
        } catch (e) { console.log('  ✗ Stability Lobes:', e.message); failed++; }
        
        // Test 7: Hertz Contact
        try {
            const result = PRISM_STRUCTURAL_MECHANICS.hertzContact({
                type: 'sphere_flat',
                load: 1000,
                radius1: 10,
                E1: 200000,
                E2: 200000
            });
            if (result.contactRadius > 0 && result.maxPressure > 0) {
                console.log(`  ✓ Hertz Contact (a=${result.contactRadius.toFixed(3)}mm, pmax=${result.maxPressure.toFixed(0)}MPa)`);
                passed++;
            } else {
                console.log('  ✗ Hertz Contact');
                failed++;
            }
        } catch (e) { console.log('  ✗ Hertz Contact:', e.message); failed++; }
        
        // Test 8: Goodman Fatigue
        try {
            const result = PRISM_STRUCTURAL_MECHANICS.goodmanFatigue({
                meanStress: 200,
                alternatingStress: 150,
                ultimateStrength: 800,
                yieldStrength: 600,
                enduranceLimit: 400
            });
            if (result.goodmanSafetyFactor > 0) {
                console.log(`  ✓ Goodman Fatigue (SF=${result.goodmanSafetyFactor.toFixed(2)}, mode=${result.failureMode})`);
                passed++;
            } else {
                console.log('  ✗ Goodman Fatigue');
                failed++;
            }
        } catch (e) { console.log('  ✗ Goodman Fatigue:', e.message); failed++; }
        
        // Test 9: Inertia Matrix
        try {
            const result = PRISM_DYNAMICS.computeInertiaMatrix({
                shape: 'cylinder',
                mass: 5,
                dimensions: { radius: 0.05, length: 0.2 }
            });
            if (result.inertiaMatrix && result.principalMoments.length === 3) {
                console.log(`  ✓ Inertia Matrix (Izz=${result.principalMoments[2].toFixed(6)} kg·m²)`);
                passed++;
            } else {
                console.log('  ✗ Inertia Matrix');
                failed++;
            }
        } catch (e) { console.log('  ✗ Inertia Matrix:', e.message); failed++; }
        
        // Test 10: Complete Cutting Analysis
        try {
            const result = PRISM_MFG_PHYSICS.completeCuttingAnalysis({
                material: { shearStrength: 400, density: 7850, specificHeat: 500, thermalConductivity: 50, hardness: 200 },
                tool: { rakeAngle: 6, diameter: 10, grade: 'carbide' },
                cutting: { speed: 200, feed: 0.2, depthOfCut: 2, width: 2 }
            });
            if (result.forces.cutting > 0 && result.thermal.interfaceTemp > 0 && result.toolLife.minutes > 0) {
                console.log(`  ✓ Complete Analysis (Fc=${result.forces.cutting.toFixed(0)}N, T=${result.thermal.interfaceTemp.toFixed(0)}°C)`);
                passed++;
            } else {
                console.log('  ✗ Complete Cutting Analysis');
                failed++;
            }
        } catch (e) { console.log('  ✗ Complete Analysis:', e.message); failed++; }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(` SESSION 4 TESTS: ${passed}/${passed + failed} passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return { passed, failed, total: passed + failed };
    }
}