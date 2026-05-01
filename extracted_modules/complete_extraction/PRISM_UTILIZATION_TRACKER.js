const PRISM_UTILIZATION_TRACKER = {
    /**
     * Calculate overall utilization across all courses
     */
    calculateOverallUtilization: function() {
        const allCourses = this.getAllCourses();
        const total = allCourses.reduce((sum, c) => sum + c.util, 0);
        return (total / allCourses.length).toFixed(1);
    },

    /**
     * Get all courses from catalog
     */
    getAllCourses: function() {
        const catalog = PRISM_220_COURSE_CATALOG;
        let all = [];
        
        // Collect from all universities
        all = all.concat(catalog.MIT || []);
        all = all.concat(catalog.STANFORD || []);
        all = all.concat(catalog.CMU || []);
        all = all.concat(catalog.BERKELEY || []);
        all = all.concat(catalog.HARVARD || []);
        all = all.concat(catalog.GEORGIA_TECH || []);
        all = all.concat(catalog.CALTECH || []);
        all = all.concat(catalog.PRINCETON || []);
        all = all.concat(catalog.CORNELL || []);
        all = all.concat(catalog.DUKE || []);
        all = all.concat(catalog.OTHER || []);
        all = all.concat(catalog.ONLINE || []);
        
        return all;
    },

    /**
     * Get utilization by university
     */
    getUtilizationByUniversity: function() {
        const catalog = PRISM_220_COURSE_CATALOG;
        const result = {};
        
        const universities = ['MIT', 'STANFORD', 'CMU', 'BERKELEY', 'HARVARD', 
                            'GEORGIA_TECH', 'CALTECH', 'PRINCETON', 'CORNELL', 
                            'DUKE', 'OTHER', 'ONLINE'];
        
        for (const univ of universities) {
            const courses = catalog[univ] || [];
            if (courses.length > 0) {
                const total = courses.reduce((sum, c) => sum + c.util, 0);
                result[univ] = {
                    count: courses.length,
                    avgUtilization: (total / courses.length).toFixed(1),
                    courses: courses.map(c => ({ id: c.id, name: c.name, util: c.util }))
                };
            }
        }
        
        return result;
    },

    /**
     * Get courses below target utilization
     */
    getCoursesNeedingWork: function(threshold = 80) {
        return this.getAllCourses()
            .filter(c => c.util < threshold)
            .sort((a, b) => a.util - b.util)
            .map(c => ({
                id: c.id,
                name: c.name,
                currentUtil: c.util,
                gap: threshold - c.util,
                algorithms: c.algs
            }));
    },

    /**
     * Get all unique algorithms across all courses
     */
    getAllAlgorithms: function() {
        const allCourses = this.getAllCourses();
        const algSet = new Set();
        
        for (const course of allCourses) {
            for (const alg of (course.algs || [])) {
                algSet.add(alg);
            }
        }
        
        return Array.from(algSet).sort();
    },

    /**
     * Generate utilization report
     */
    generateReport: function() {
        const overall = this.calculateOverallUtilization();
        const byUniversity = this.getUtilizationByUniversity();
        const needsWork = this.getCoursesNeedingWork(80);
        const allAlgs = this.getAllAlgorithms();
        
        return {
            summary: {
                totalCourses: this.getAllCourses().length,
                overallUtilization: overall + '%',
                totalAlgorithms: allAlgs.length,
                coursesBelow80Percent: needsWork.length
            },
            byUniversity,
            needsWork: needsWork.slice(0, 20), // Top 20 needing work
            timestamp: new Date().toISOString()
        };
    }
}