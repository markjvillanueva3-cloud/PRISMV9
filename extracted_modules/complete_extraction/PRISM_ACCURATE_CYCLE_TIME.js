const PRISM_ACCURATE_CYCLE_TIME = {
    version: '1.0.0',

    /**
     * Calculate cycle time from toolpath moves
     */
    fromToolpath(toolpath, params = {}) {
        if (!toolpath || !toolpath.length) {
            return { total: 0, cutting: 0, rapid: 0, note: 'No toolpath data' };
        }
        const rapidRate = params.rapidRate || 400; // IPM
        const feedRate = params.feedRate || 30;     // IPM

        let cuttingTime = 0;  // minutes
        let rapidTime = 0;    // minutes
        let lastPos = { x: 0, y: 0, z: 0 };

        for (const move of toolpath) {
            const x = move.x !== undefined ? move.x : lastPos.x;
            const y = move.y !== undefined ? move.y : lastPos.y;
            const z = move.z !== undefined ? move.z : lastPos.z;

            // Calculate distance
            const dist = Math.sqrt(
                Math.pow(x - lastPos.x, 2) +
                Math.pow(y - lastPos.y, 2) +
                Math.pow(z - lastPos.z, 2)
            );

            if (move.type === 'rapid' || move.type === 'G0') {
                rapidTime += dist / rapidRate;
            } else {
                const f = move.f || feedRate;
                cuttingTime += dist / f;
            }
            lastPos = { x, y, z };
        }
        return {
            cutting: Math.round(cuttingTime * 100) / 100,
            rapid: Math.round(rapidTime * 100) / 100,
            total: Math.round((cuttingTime + rapidTime) * 100) / 100,
            moves: toolpath.length,
            unit: 'minutes'
        };
    },
    /**
     * Calculate cycle time for complete job
     */
    forJob(operations, machine = {}) {
        let totalCutting = 0;
        let totalRapid = 0;
        let toolChanges = 0;
        const toolChangeTime = machine.toolChangeTime || 0.1; // minutes

        for (const op of operations) {
            if (op.toolpath || op.moves) {
                const opTime = this.fromToolpath(op.toolpath || op.moves, {
                    rapidRate: machine.rapids?.xy || 400,
                    feedRate: op.params?.feedRate || op.feedRate || 30
                });
                totalCutting += opTime.cutting;
                totalRapid += opTime.rapid;
            }
            toolChanges++;
        }
        const toolChangeTotal = toolChanges * toolChangeTime;

        return {
            cutting: Math.round(totalCutting * 100) / 100,
            rapid: Math.round(totalRapid * 100) / 100,
            toolChanges: Math.round(toolChangeTotal * 100) / 100,
            total: Math.round((totalCutting + totalRapid + toolChangeTotal) * 100) / 100,
            operations: operations.length,
            unit: 'minutes'
        };
    },
    /**
     * Estimate from features when no toolpath exists
     */
    fromFeatures(features, material = 'steel', machine = {}) {
        let totalTime = 0;

        // Material MRR multipliers (relative to aluminum)
        const mrrMultipliers = {
            aluminum: 1.0,
            steel: 0.4,
            stainless: 0.25,
            titanium: 0.15,
            inconel: 0.1,
            cast_iron: 0.5
        };
        const baseMRR = 5; // cubic inches per minute for aluminum roughing
        const mrrMult = mrrMultipliers[material] || 0.4;
        const effectiveMRR = baseMRR * mrrMult;

        for (const feature of features) {
            let volume = 0;

            if (feature.type === 'pocket' || feature.type === 'rectangular_pocket') {
                volume = (feature.width || 1) * (feature.length || 1) * (feature.depth || 0.5);
            } else if (feature.type === 'circular_pocket') {
                const r = (feature.diameter || 1) / 2;
                volume = Math.PI * r * r * (feature.depth || 0.5);
            } else if (feature.type === 'hole') {
                const r = (feature.diameter || 0.5) / 2;
                volume = Math.PI * r * r * (feature.depth || 1);
            } else if (feature.type === 'face') {
                volume = (feature.width || 4) * (feature.length || 4) * 0.1;
            }
            // Roughing time
            const roughTime = volume / effectiveMRR;
            // Finishing adds ~30%
            const finishTime = roughTime * 0.3;

            totalTime += roughTime + finishTime;
        }
        return {
            estimated: Math.round(totalTime * 100) / 100,
            method: 'feature_based',
            material,
            unit: 'minutes'
        };
    }
}