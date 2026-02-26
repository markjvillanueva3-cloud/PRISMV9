const PRISM_PART3_SELF_TEST = {
    run: function() {
        console.log('=== PRISM Part 3 Self-Test ===');
        
        const tests = {
            fft: () => {
                const x = [1, 2, 3, 4];
                const result = PRISM_SIGNAL_ALGORITHMS.fft(x);
                console.log(`FFT of [1,2,3,4]: ${result.length} points`);
                return result.length === 4;
            },
            
            taylorToolLife: () => {
                const result = PRISM_MANUFACTURING_ALGORITHMS.taylorToolLife(100, 'steel');
                console.log(`Taylor tool life at 100 SFM: ${result.toolLife.toFixed(1)} min`);
                return result.toolLife > 0;
            },
            
            processCapability: () => {
                const data = Array.from({length: 100}, () => 50 + (Math.random() - 0.5) * 10);
                const result = PRISM_MANUFACTURING_ALGORITHMS.processCapability(data, 40, 60);
                console.log(`Process Cpk: ${result.cpk.toFixed(2)}`);
                return result.cpk > 0;
            },
            
            roadmapGenerated: () => {
                const report = PRISM_UTILIZATION_ROADMAP.generateUtilizationReport();
                console.log(`Roadmap: ${report.totalPhases} phases, ${report.totalDuration}`);
                return report.totalPhases === 4;
            }
        };
        
        let passed = 0;
        let failed = 0;
        
        for (const [name, test] of Object.entries(tests)) {
            try {
                if (test()) {
                    console.log(`✓ ${name}: PASSED`);
                    passed++;
                } else {
                    console.log(`✗ ${name}: FAILED`);
                    failed++;
                }
            } catch (e) {
                console.log(`✗ ${name}: ERROR - ${e.message}`);
                failed++;
            }
        }
        
        console.log(`\n=== Results: ${passed}/${passed + failed} tests passed ===`);
        return { passed, failed };
    }
}