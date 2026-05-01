const PRISM_MIT_BATCH_19_TESTS = {
    runAll: function() {
        console.log('\n[PRISM MIT Batch 19] Running Self-Tests...\n');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Section properties
        try {
            const rect = PRISM_STRUCTURES.sectionProperties('rectangle', { b: 10, h: 20 });
            if (Math.abs(rect.momentOfInertia - 10 * 20 * 20 * 20 / 12) < 0.01) {
                console.log('✓ Section properties (rectangle)');
                passed++;
            } else {
                throw new Error(`Expected ${10*8000/12}, got ${rect.momentOfInertia}`);
            }
        } catch (e) {
            console.log('✗ Section properties:', e.message);
            failed++;
        }
        
        // Test 2: Beam deflection
        try {
            const defl = PRISM_STRUCTURES.beamDeflection({
                type: 'cantilever_point',
                L: 1000, E: 200000, I: 10000, P: 100
            });
            const expected = 100 * Math.pow(1000, 3) / (3 * 200000 * 10000);
            if (Math.abs(defl.maxDeflection - expected) < 0.01) {
                console.log('✓ Beam deflection (cantilever)');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${defl.maxDeflection}`);
            }
        } catch (e) {
            console.log('✗ Beam deflection:', e.message);
            failed++;
        }
        
        // Test 3: Euler buckling
        try {
            const buck = PRISM_STRUCTURES.eulerBuckling({
                E: 200000, I: 1000, L: 500, endCondition: 'pinned-pinned'
            });
            const expected = Math.PI * Math.PI * 200000 * 1000 / (500 * 500);
            if (Math.abs(buck.criticalLoad - expected) < 0.1) {
                console.log('✓ Euler buckling');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${buck.criticalLoad}`);
            }
        } catch (e) {
            console.log('✗ Euler buckling:', e.message);
            failed++;
        }
        
        // Test 4: Free vibration
        try {
            const vib = PRISM_DYNAMICS.freeVibration({ m: 1, k: 100 });
            if (Math.abs(vib.naturalFrequencyRad - 10) < 0.01) {
                console.log('✓ Free vibration');
                passed++;
            } else {
                throw new Error(`Expected ωn=10, got ${vib.naturalFrequencyRad}`);
            }
        } catch (e) {
            console.log('✗ Free vibration:', e.message);
            failed++;
        }
        
        // Test 5: Damped vibration
        try {
            const damped = PRISM_DYNAMICS.dampedVibration({ m: 1, c: 2, k: 100 });
            // c_cr = 2*sqrt(100) = 20, so zeta = 2/20 = 0.1
            if (Math.abs(damped.dampingRatio - 0.1) < 0.01 && damped.type === 'underdamped') {
                console.log('✓ Damped vibration');
                passed++;
            } else {
                throw new Error(`Expected ζ=0.1, got ${damped.dampingRatio}`);
            }
        } catch (e) {
            console.log('✗ Damped vibration:', e.message);
            failed++;
        }
        
        // Test 6: Routh-Hurwitz
        try {
            // s³ + 2s² + 3s + 4 (stable)
            const routh = PRISM_CONTROL.routhHurwitz([1, 2, 3, 4]);
            // First column: 1, 2, 1, 4 -> all positive, stable
            if (routh.signChanges === 0 && routh.stable) {
                console.log('✓ Routh-Hurwitz stability');
                passed++;
            } else {
                throw new Error(`Expected stable, got ${routh.signChanges} sign changes`);
            }
        } catch (e) {
            console.log('✗ Routh-Hurwitz:', e.message);
            failed++;
        }
        
        // Test 7: PID tuning
        try {
            const pid = PRISM_CONTROL.pidTuning({
                method: 'ziegler-nichols-step',
                K: 1, L: 1, T: 5
            });
            if (pid.PID.Kp > 0 && pid.PID.Ki > 0 && pid.PID.Kd > 0) {
                console.log('✓ PID tuning (Z-N)');
                passed++;
            } else {
                throw new Error('Invalid PID gains');
            }
        } catch (e) {
            console.log('✗ PID tuning:', e.message);
            failed++;
        }
        
        // Test 8: Pole placement
        try {
            const result = PRISM_CONTROL.polePlacement(
                { A: [[0, 1], [-2, -3]], B: [0, 1] },
                [-5, -5]
            );
            if (result.controllable && result.K.length === 2) {
                console.log('✓ Pole placement');
                passed++;
            } else {
                throw new Error('Pole placement failed');
            }
        } catch (e) {
            console.log('✗ Pole placement:', e.message);
            failed++;
        }
        
        // Test 9: FFT
        try {
            const signal = [1, 0, -1, 0, 1, 0, -1, 0];  // Simple oscillation
            const spec = PRISM_SIGNALS.fftSpectrum(signal);
            if (spec.magnitude && spec.magnitude.length > 0) {
                console.log('✓ FFT spectrum');
                passed++;
            } else {
                throw new Error('FFT failed');
            }
        } catch (e) {
            console.log('✗ FFT:', e.message);
            failed++;
        }
        
        // Test 10: Nyquist analysis
        try {
            const nyq = PRISM_SIGNALS.nyquistAnalysis({
                maxFrequency: 1000,
                actualSampleRate: 2500
            });
            if (nyq.meetsNyquist && nyq.nyquistRate === 2000) {
                console.log('✓ Nyquist analysis');
                passed++;
            } else {
                throw new Error(`Nyquist rate should be 2000, got ${nyq.nyquistRate}`);
            }
        } catch (e) {
            console.log('✗ Nyquist analysis:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
}