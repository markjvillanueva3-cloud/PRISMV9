const PRISM_ADVANCED_FEED_OPTIMIZER = {
    version: '1.0.0',

    /**
     * Calculate chip thinning factor
     * When radial engagement < 50%, effective chip thickness decreases
     */
    calculateChipThinning(woc, toolDiameter) {
        const radialEngagement = woc / toolDiameter;

        if (radialEngagement >= 0.5) {
            return 1.0; // No compensation needed
        }
        // CTF = 1 / sqrt(1 - (1 - 2*ae/D)^2)
        const factor = 1 - 2 * radialEngagement;
        const ctf = 1 / Math.sqrt(1 - factor * factor);

        // Cap at 3x to prevent extreme values
        return Math.min(ctf, 3.0);
    },
    /**
     * Apply chip thinning to programmed feed
     */
    compensateFeed(baseFeed, woc, toolDiameter) {
        const ctf = this.calculateChipThinning(woc, toolDiameter);
        const compensatedFeed = Math.round(baseFeed * ctf);

        return {
            original: baseFeed,
            compensated: compensatedFeed,
            factor: Math.round(ctf * 100) / 100
        };
    },
    /**
     * Optimize feed profile for toolpath
     */
    optimizeFeedProfile(toolpath, tool, params = {}) {
        const toolDia = tool.diameter || 0.5;
        const woc = params.woc || toolDia * 0.4;
        const baseFeed = params.feedRate || 30;

        const optimized = [];

        for (const move of toolpath) {
            const newMove = { ...move };

            if (move.type === 'feed' || move.type === 'G1') {
                // Check if this is a radial cut (X/Y movement)
                if (move.x !== undefined || move.y !== undefined) {
                    const comp = this.compensateFeed(baseFeed, woc, toolDia);
                    newMove.f = comp.compensated;
                    newMove.chipThinningApplied = true;
                }
            }
            optimized.push(newMove);
        }
        return optimized;
    }
}