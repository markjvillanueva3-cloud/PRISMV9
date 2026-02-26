/**
 * PRISM_COURSE_GATEWAY_GENERATOR
 * Extracted from PRISM v8.89.002 monolith
 * References: 6
 * Category: mit
 * Lines: 68
 * Session: R2.3.6 Catalog/MIT Extraction
 */

const PRISM_COURSE_GATEWAY_GENERATOR = {
    /**
     * Generate all gateway routes for course algorithms
     */
    generateAllRoutes: function() {
        const routes = {};
        const allCourses = PRISM_UTILIZATION_TRACKER.getAllCourses();
        
        for (const course of allCourses) {
            const coursePrefix = this.getCoursePrefix(course);
            
            for (const alg of (course.algs || [])) {
                const routeKey = `${coursePrefix}.${alg}`;
                routes[routeKey] = {
                    course: course.id,
                    courseName: course.name,
                    algorithm: alg,
                    target: `PRISM_${course.id.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}.${alg}`
                };
            }
        }
        
        return routes;
    },

    /**
     * Get prefix for course routes
     */
    getCoursePrefix: function(course) {
        // Categorize by domain
        const mlCourses = ['CS229', 'CS231N', '6.036', '6.867', '10-601', 'CS189', 'CS181'];
        const aiCourses = ['CS221', 'CS188', '6.034', 'CS50AI', 'CS6601', '16.410'];
        const optCourses = ['6.251J', '15.099', '18.433', 'ORF522', '10-725', 'EECS127'];
        const mfgCourses = ['2.008', '2.810', '2.854', '24-681', 'ME4210', 'CNC_Pathways'];
        const robotCourses = ['CS223A', 'ME115', 'CS327A', 'MAE345'];
        const graphicsCourses = ['6.837', '15-462', 'CS468', 'CS348A'];
        const controlCourses = ['2.14', '6.241J', '2.004', 'EE263', 'ME232'];
        const signalCourses = ['18.086', 'EE120', 'EE123'];
        
        if (mlCourses.includes(course.id)) return 'ml';
        if (aiCourses.includes(course.id)) return 'ai';
        if (optCourses.includes(course.id)) return 'opt';
        if (mfgCourses.includes(course.id)) return 'mfg';
        if (robotCourses.includes(course.id)) return 'robot';
        if (graphicsCourses.includes(course.id)) return 'graphics';
        if (controlCourses.includes(course.id)) return 'control';
        if (signalCourses.includes(course.id)) return 'signal';
        
        return 'course';
    },

    /**
     * Register all routes with PRISM_GATEWAY
     */
    registerAllRoutes: function() {
        const routes = this.generateAllRoutes();
        let registered = 0;
        
        if (typeof PRISM_GATEWAY !== 'undefined') {
            for (const [key, config] of Object.entries(routes)) {
                PRISM_GATEWAY.register(key, config.target);
                registered++;
            }
        }
        
        return { totalRoutes: Object.keys(routes).length, registered };
    }
}