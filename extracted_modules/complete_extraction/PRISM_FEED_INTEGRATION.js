const PRISM_FEED_INTEGRATION = {

    name: "PRISM Feed Integration",
    version: "1.0.0",

    // INTEGRATION MODES
    // How the post processor should treat incoming feeds

    INTEGRATION_MODES: {

        /**
         * PRISM_OPTIMIZED Mode (Recommended)
         * ---------------------------------
         * Use when: User entered PRISM Calculator feeds into CAM
         *
         * Post behavior:
         * - Trust the base feed (no aggressiveness reduction)
         * - Apply chip thinning INCREASES only
         * - Apply safety REDUCTIONS (arcs, corners, stickout)
         * - Net effect: Feed can go UP for light engagement
         */
        PRISM_OPTIMIZED: {
            id: "prism_optimized",
            name: "PRISM Optimized Feeds",
            description: "Use with feeds from PRISM Calculator - applies dynamic increases only",

            applyAggressiveness: false,      // Base feed already optimized
            applyChipThinning: true,         // INCREASE for light engagement
            applyArcCorrection: true,        // REDUCE for tight arcs (safety)
            applyCornerReduction: true,      // REDUCE at corners (safety)
            applyStickoutReduction: true,    // REDUCE for long tools (safety)
            applyAdaptiveIncrease: true,     // INCREASE for shallow cuts

            // Multiplier limits
            maxIncrease: 2.5,    // Allow up to 2.5x feed increase
            maxDecrease: 0.50    // Never reduce below 50% of programmed
        },
        /**
         * CAM_DEFAULT Mode
         * ----------------
         * Use when: User entered generic/conservative CAM feeds
         *
         * Post behavior:
         * - Apply full PRISM Roughing Logic including aggressiveness
         * - Apply all dynamic adjustments
         * - Net effect: Completely re-optimizes the feed
         */
        CAM_DEFAULT: {
            id: "cam_default",
            name: "Generic CAM Feeds",
            description: "Use with standard CAM library feeds - applies full optimization",

            applyAggressiveness: true,       // Apply level factor (0.5-1.0)
            applyChipThinning: true,
            applyArcCorrection: true,
            applyCornerReduction: true,
            applyStickoutReduction: true,
            applyAdaptiveIncrease: true,

            maxIncrease: 2.0,    // More conservative increase
            maxDecrease: 0.35    // Can reduce more (35% minimum)
        },
        /**
         * PASSTHROUGH Mode
         * ----------------
         * Use when: User wants exact programmed feeds (no modification)
         *
         * Post behavior:
         * - Output feeds exactly as programmed
         * - No optimization applied
         */
        PASSTHROUGH: {
            id: "passthrough",
            name: "Passthrough (No Optimization)",
            description: "Output feeds exactly as programmed",

            applyAggressiveness: false,
            applyChipThinning: false,
            applyArcCorrection: false,
            applyCornerReduction: false,
            applyStickoutReduction: false,
            applyAdaptiveIncrease: false,

            maxIncrease: 1.0,
            maxDecrease: 1.0
        }
    },
    // DETECTION METHODS
    // How to detect if PRISM feeds are being used

    DETECTION: {

        /**
         * Check if toolpath was generated with PRISM feeds
         * Looks for markers in comments or operation names
         */
        markers: [
            "PRISM",
            "PRISM-AI",
            "PRISM CALCULATED",
            "PRISM OPTIMIZED",
            "PRISM FEED",
            "PRISM-OPTIMIZED"
        ],

        /**
         * Detect PRISM usage from CAM operation
         * @param {object} section - CAM section/operation
         * @returns {boolean} True if PRISM feeds detected
         */
        detectPrismFeeds: function(section) {
            // Check operation comment
            if (section && typeof section.getComment === 'function') {
                const comment = section.getComment().toUpperCase();
                for (const marker of this.markers) {
                    if (comment.includes(marker)) {
                        return true;
                    }
                }
            }
            // Check operation name
            if (section && typeof section.getParameter === 'function') {
                try {
                    const opName = section.getParameter("operation:name") || "";
                    for (const marker of this.markers) {
                        if (opName.toUpperCase().includes(marker)) {
                            return true;
                        }
                    }
                } catch (e) { }
            }
            return false;
        },
        /**
         * Get recommended integration mode
         * @param {object} section - CAM section/operation
         * @param {string} propertyValue - User property setting
         * @returns {object} Integration mode configuration
         */
        getIntegrationMode: function(section, propertyValue) {
            // If property explicitly set, use that
            if (propertyValue) {
                const modes = PRISM_FEED_INTEGRATION.INTEGRATION_MODES;
                if (modes[propertyValue.toUpperCase()]) {
                    return modes[propertyValue.toUpperCase()];
                }
            }
            // Auto-detect based on operation
            if (this.detectPrismFeeds(section)) {
                return PRISM_FEED_INTEGRATION.INTEGRATION_MODES.PRISM_OPTIMIZED;
            }
            // Default to CAM_DEFAULT
            return PRISM_FEED_INTEGRATION.INTEGRATION_MODES.CAM_DEFAULT;
        }
    },
    // FEED CALCULATION WITH INTEGRATION
    // Modified calculation that respects integration mode

    /**
     * Calculate optimized feed with proper integration
     * @param {object} params - Cutting parameters
     * @param {object} mode - Integration mode
     * @returns {object} Optimized feed result
     */
    calculateIntegratedFeed: function(params, mode) {
        const {
            programmedFeed,
            toolDiameter,
            radialEngagement,
            axialDepth,
            programmedDepth,
            stickout,
            arcRadius,
            isConvexArc,
            directionChangeAngle,
            operationType,
            aggressivenessLevel
        } = params;

        // Start with programmed feed
        let optimizedFeed = programmedFeed;
        const adjustments = [];
        let totalIncrease = 1.0;
        let totalDecrease = 1.0;

        // 1. Aggressiveness (only if mode allows)
        if (mode.applyAggressiveness && aggressivenessLevel) {
            const level = PRISM_ROUGHING_LOGIC.AGGRESSIVENESS_LEVELS[aggressivenessLevel];
            if (level && level.factor < 1.0) {
                totalDecrease *= level.factor;
                adjustments.push({
                    type: "aggressiveness",
                    name: "Aggressiveness Level",
                    factor: level.factor,
                    description: level.name
                });
            }
        }
        // 2. Chip Thinning (INCREASE)
        if (mode.applyChipThinning && toolDiameter && radialEngagement) {
            const ctf = PRISM_ROUGHING_LOGIC.CHIP_THINNING.calculate(toolDiameter, radialEngagement);
            if (ctf > 1.0) {
                totalIncrease *= ctf;
                adjustments.push({
                    type: "increase",
                    name: "Chip Thinning",
                    factor: ctf,
                    description: `+${((ctf - 1) * 100).toFixed(0)}% for ${((radialEngagement / toolDiameter) * 100).toFixed(0)}% WOC`
                });
            }
        }
        // 3. Adaptive Depth (INCREASE)
        if (mode.applyAdaptiveIncrease && programmedDepth && axialDepth && axialDepth < programmedDepth) {
            const depthFactor = PRISM_ROUGHING_LOGIC.ADAPTIVE_DEPTH.calculate(programmedDepth, axialDepth);
            if (depthFactor > 1.0) {
                totalIncrease *= depthFactor;
                adjustments.push({
                    type: "increase",
                    name: "Shallow DOC Increase",
                    factor: depthFactor,
                    description: `+${((depthFactor - 1) * 100).toFixed(0)}% for shallow cut`
                });
            }
        }
        // 4. Arc Correction (DECREASE)
        if (mode.applyArcCorrection && arcRadius && toolDiameter) {
            const arcFactor = PRISM_ROUGHING_LOGIC.ARC_FEED.calculate(arcRadius, toolDiameter / 2, isConvexArc);
            if (arcFactor < 1.0) {
                totalDecrease *= arcFactor;
                adjustments.push({
                    type: "decrease",
                    name: "Arc Correction",
                    factor: arcFactor,
                    description: `-${((1 - arcFactor) * 100).toFixed(0)}% for R${arcRadius.toFixed(3)} arc`
                });
            }
        }
        // 5. Corner Reduction (DECREASE)
        if (mode.applyCornerReduction && directionChangeAngle) {
            const cornerFactor = PRISM_ROUGHING_LOGIC.DIRECTION_CHANGE.calculate(directionChangeAngle);
            if (cornerFactor < 1.0) {
                totalDecrease *= cornerFactor;
                adjustments.push({
                    type: "decrease",
                    name: "Corner Reduction",
                    factor: cornerFactor,
                    description: `-${((1 - cornerFactor) * 100).toFixed(0)}% for ${directionChangeAngle}° corner`
                });
            }
        }
        // 6. Stickout Reduction (DECREASE)
        if (mode.applyStickoutReduction && stickout && toolDiameter) {
            const stickoutFactor = PRISM_ROUGHING_LOGIC.STICKOUT_COMPENSATION.calculate(
                stickout, toolDiameter, operationType || 'roughing'
            );
            if (stickoutFactor < 1.0) {
                totalDecrease *= stickoutFactor;
                adjustments.push({
                    type: "decrease",
                    name: "Stickout Reduction",
                    factor: stickoutFactor,
                    description: `-${((1 - stickoutFactor) * 100).toFixed(0)}% for L/D ${(stickout / toolDiameter).toFixed(1)}`
                });
            }
        }
        // Apply limits
        totalIncrease = Math.min(totalIncrease, mode.maxIncrease);
        totalDecrease = Math.max(totalDecrease, mode.maxDecrease);

        // Calculate final feed
        const totalFactor = totalIncrease * totalDecrease;
        optimizedFeed = programmedFeed * totalFactor;

        return {
            programmedFeed: programmedFeed,
            optimizedFeed: Math.round(optimizedFeed * 1000) / 1000,
            totalFactor: Math.round(totalFactor * 1000) / 1000,
            totalIncrease: Math.round(totalIncrease * 1000) / 1000,
            totalDecrease: Math.round(totalDecrease * 1000) / 1000,
            integrationMode: mode.id,
            adjustments: adjustments,

            // Summary
            netChange: totalFactor >= 1.0 ?
                `+${((totalFactor - 1) * 100).toFixed(0)}%` :
                `-${((1 - totalFactor) * 100).toFixed(0)}%`
        };
    },
    // POST PROCESSOR PROPERTY DEFINITIONS
    // Add these properties to the post processor

    POST_PROPERTIES: {
        prismFeedIntegration: {
            title: "PRISM Feed Integration Mode",
            description: "How to handle incoming feedrates. Default is PRISM_OPTIMIZED which trusts your calculated feeds and only adjusts for changing cutting conditions.",
            group: "feedOptimization",
            type: "enum",
            values: [
                { title: "PRISM Optimized (DEFAULT - trusts PRISM feeds)", id: "PRISM_OPTIMIZED" },
                { title: "Auto-Detect", id: "auto" },
                { title: "Generic CAM Feeds (Full optimization)", id: "CAM_DEFAULT" },
                { title: "Passthrough (No changes)", id: "PASSTHROUGH" }
            ],
            value: "PRISM_OPTIMIZED",
            scope: "post"
        },
        prismFeedMarker: {
            title: "Add PRISM feed markers to output",
            description: "Include comments showing PRISM feed adjustments in G-code output.",
            group: "feedOptimization",
            type: "boolean",
            value: true,
            scope: "post"
        }
    },
    // CODE GENERATION
    // Generate G-code comments for PRISM integration

    /**
     * Generate integration mode header comment
     */
    generateHeader: function(mode, operationName) {
        const lines = [];
        lines.push(`(PRISM FEED INTEGRATION: ${mode.name})`);

        if (mode.id === "PRISM_OPTIMIZED") {
            lines.push("(PRISM Calculator feeds detected - dynamic adjustments only)");
            lines.push("(Chip thinning increases: ACTIVE)");
            lines.push("(Safety reductions: ACTIVE)");
        } else if (mode.id === "CAM_DEFAULT") {
            lines.push("(Generic CAM feeds - full PRISM optimization applied)");
        } else if (mode.id === "PASSTHROUGH") {
            lines.push("(Passthrough mode - feeds output as programmed)");
        }
        return lines;
    },
    /**
     * Generate inline feed adjustment comment
     */
    generateFeedComment: function(result) {
        if (Math.abs(result.totalFactor - 1.0) < 0.01) {
            return null; // No significant change
        }
        const parts = [];
        parts.push(`F${result.optimizedFeed.toFixed(1)}`);
        parts.push(`(PRISM: ${result.netChange}`);

        // Add top adjustment reason
        if (result.adjustments.length > 0) {
            const topAdj = result.adjustments[0];
            parts.push(`- ${topAdj.name})`);
        } else {
            parts.push(")");
        }
        return parts.join(" ");
    }
}