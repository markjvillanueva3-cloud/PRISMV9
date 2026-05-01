const PRISM_CAM_LEARNING_ENGINE_ENHANCED = {
    version: "2.0",

    // Learn from job results
    learnFromJob: function(job) {
        const learning = {
            jobId: job.id,
            features: job.features,
            strategiesUsed: job.strategies,
            tools: job.tools,
            cycleTime: job.actualCycleTime,
            surfaceQuality: job.qualityMetrics,
            toolWear: job.toolWearData
        };
        this.experienceDB.add(learning);
        return learning;
    },
    // Recommend strategy based on experience
    recommendStrategy: function(feature, material, machine) {
        const similar = this.findSimilarJobs(feature, material);

        if (similar.length > 0) {
            const best = similar.sort((a, b) => b.score - a.score)[0];
            return {
                strategy: best.job.strategiesUsed[0],
                confidence: best.score,
                source: "experience_database",
                adaptiveClearing: best.job.strategiesUsed.includes('adaptiveClearing')
            };
        }
        return this.getDefaultStrategy(feature, material);
    },
    // Find similar jobs
    findSimilarJobs: function(feature, material) {
        const matches = [];
        for (const job of this.experienceDB.jobs) {
            let score = 0;
            if (job.material === material) score += 0.3;
            if (job.featureType === feature.type) score += 0.4;
            if (Math.abs(job.tolerance - feature.tolerance) < 0.01) score += 0.3;
            if (score > 0.6) matches.push({ job, score });
        }
        return matches;
    },
    experienceDB: {
        jobs: [],
        add: function(job) { this.jobs.push(job); }
    },
    getDefaultStrategy: function(feature, material) {
        if (feature.type === 'pocket' || feature.type === 'cavity') {
            return { strategy: 'adaptiveClearing', confidence: 0.8 };
        }
        return { strategy: 'zLevelRoughing', confidence: 0.7 };
    }
}