const PRISM_220_COURSES_SELF_TEST = {
    run: function() {
        console.log('=== PRISM 220+ Courses Integration Self-Test ===');
        
        const tests = {
            courseCount: () => {
                const count = PRISM_UTILIZATION_TRACKER.getAllCourses().length;
                console.log(`Total courses: ${count}`);
                return count >= 200;
            },
            
            utilizationCalculation: () => {
                const util = PRISM_UTILIZATION_TRACKER.calculateOverallUtilization();
                console.log(`Overall utilization: ${util}%`);
                return parseFloat(util) > 0;
            },
            
            algorithmCount: () => {
                const algs = PRISM_UTILIZATION_TRACKER.getAllAlgorithms();
                console.log(`Total unique algorithms: ${algs.length}`);
                return algs.length >= 300;
            },
            
            routeGeneration: () => {
                const routes = PRISM_COURSE_GATEWAY_GENERATOR.generateAllRoutes();
                const count = Object.keys(routes).length;
                console.log(`Gateway routes generated: ${count}`);
                return count >= 500;
            },
            
            reportGeneration: () => {
                const report = PRISM_UTILIZATION_TRACKER.generateReport();
                console.log(`Report generated with ${Object.keys(report.byUniversity).length} universities`);
                return report.summary && report.byUniversity;
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
        return { passed, failed, total: passed + failed };
    }
}