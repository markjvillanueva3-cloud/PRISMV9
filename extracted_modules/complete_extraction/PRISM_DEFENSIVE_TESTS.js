const PRISM_DEFENSIVE_TESTS = {
    runAll: function() {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║           PRISM DEFENSIVE ARCHITECTURE - SELF TESTS                       ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');

        let passed = 0, failed = 0;

        // Test 1: Unit conversion inch → mm → inch
        try {
            const mmValue = PRISM_UNITS.toInternal(1, 'in');
            const backToInch = PRISM_UNITS.fromInternal(mmValue, 'in');
            const pass = Math.abs(backToInch - 1) < 1e-10;
            console.log(`${pass ? '✅' : '❌'} Unit conversion: 1 in → ${mmValue} mm → ${backToInch.toFixed(6)} in`);
            pass ? passed++ : failed++;
        } catch (e) { console.log(`❌ Unit conversion: ${e.message}`); failed++; }

        // Test 2: Feedrate IPM → mm/s → IPM
        try {
            const mms = PRISM_UNITS.toInternal(100, 'ipm');
            const backToIpm = PRISM_UNITS.fromInternal(mms, 'ipm');
            const pass = Math.abs(backToIpm - 100) < 1e-6;
            console.log(`${pass ? '✅' : '❌'} Feedrate: 100 IPM → ${mms.toFixed(4)} mm/s → ${backToIpm.toFixed(4)} IPM`);
            pass ? passed++ : failed++;
        } catch (e) { console.log(`❌ Feedrate: ${e.message}`); failed++; }

        // Test 3: Constants immutability
        try {
            const originalVersion = PRISM_CONSTANTS.VERSION;
            try { PRISM_CONSTANTS.VERSION = 'hacked'; } catch(e) {}
            const pass = PRISM_CONSTANTS.VERSION === originalVersion;
            console.log(`${pass ? '✅' : '❌'} Constants immutability: ${pass ? 'Protected' : 'VULNERABLE!'}`);
            pass ? passed++ : failed++;
        } catch (e) { console.log(`✅ Constants immutability: Protected (threw error)`); passed++; }

        // Test 4: Gateway capability check
        try {
            const has = PRISM_GATEWAY.hasCapability('material.get');
            const missing = !PRISM_GATEWAY.hasCapability('nonexistent.capability');
            const pass = has && missing;
            console.log(`${pass ? '✅' : '❌'} Gateway: has material.get=${has}, missing nonexistent=${missing}`);
            pass ? passed++ : failed++;
        } catch (e) { console.log(`❌ Gateway: ${e.message}`); failed++; }

        // Test 5: Tolerance comparison
        try {
            const eq = PRISM_COMPARE.equal(1.0000001, 1.0000002);
            const notEq = !PRISM_COMPARE.equal(1.0, 2.0);
            const pass = eq && notEq;
            console.log(`${pass ? '✅' : '❌'} Tolerance compare: nearlyEqual=${eq}, different=${notEq}`);
            pass ? passed++ : failed++;
        } catch (e) { console.log(`❌ Tolerance compare: ${e.message}`); failed++; }

        // Test 6: Position validation
        try {
            const valid = PRISM_VALIDATOR.position({ x: 1, y: 2, z: 3 }, 'test');
            PRISM_CONSTANTS.VALIDATE_ALL_INPUTS && console.log(''); // Suppress NaN warning output
            const invalid = !PRISM_VALIDATOR.position({ x: 1, y: NaN, z: 3 }, 'test');
            const pass = valid && invalid;
            console.log(`${pass ? '✅' : '❌'} Position validation: valid=${valid}, rejectsNaN=${invalid}`);
            pass ? passed++ : failed++;
        } catch (e) { console.log(`❌ Position validation: ${e.message}`); failed++; }

        // Test 7: G-code formatting (inch mode)
        try {
            PRISM_UNITS.currentSystem = 'inch';
            const formatted = PRISM_UNITS.formatGCode(25.4, 'length');
            const pass = Math.abs(parseFloat(formatted) - 1.0) < 0.0001;
            console.log(`${pass ? '✅' : '❌'} G-code format (inch): 25.4mm → ${formatted} in`);
            pass ? passed++ : failed++;
        } catch (e) { console.log(`❌ G-code format: ${e.message}`); failed++; }

        // Test 8: Deprecated module check
        try {
            const dep = PRISM_DEPRECATED.check('PRISM_MATERIALS_COMPLETE');
            const pass = dep && dep.newAuthority === 'PRISM_MATERIALS_MASTER';
            console.log(`${pass ? '✅' : '❌'} Deprecated check: PRISM_MATERIALS_COMPLETE → ${dep ? dep.newAuthority : 'not found'}`);
            pass ? passed++ : failed++;
        } catch (e) { console.log(`❌ Deprecated check: ${e.message}`); failed++; }

        console.log('');
        console.log(`═══════════════════════════════════════════════════════════════════════════`);
        console.log(`DEFENSIVE ARCHITECTURE TESTS: ${passed}/${passed + failed} passed`);
        console.log(`═══════════════════════════════════════════════════════════════════════════`);

        return { passed, failed, total: passed + failed };
    }
}