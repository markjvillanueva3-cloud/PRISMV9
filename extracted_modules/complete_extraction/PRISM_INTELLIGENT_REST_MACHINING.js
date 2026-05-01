const PRISM_INTELLIGENT_REST_MACHINING = {
    version: "1.0",

    // Rest material detection methods
    detectionMethods: {
        stockModel: {
            name: "Stock Model Comparison",
            description: "Compare current stock to target geometry",
            accuracy: "high",
            computeTime: "medium",
            method: function(stockGeometry, targetGeometry, tolerance) {
                return {
                    restVolume: this.calculateRestVolume(stockGeometry, targetGeometry),
                    restRegions: this.identifyRestRegions(stockGeometry, targetGeometry, tolerance),
                    corners: this.findInternalCorners(targetGeometry),
                    fillets: this.findFilletAreas(targetGeometry)
                };
            }
        },
        previousToolpath: {
            name: "Previous Toolpath Analysis",
            description: "Analyze unmachined areas from previous operations",
            accuracy: "medium",
            computeTime: "fast",
            method: function(previousToolpaths, toolDiameter) {
                const unmachinedAreas = [];
                // Find areas where tool couldn't reach
                for (const tp of previousToolpaths) {
                    const reachLimit = tp.toolDiameter / 2;
                    unmachinedAreas.push({
                        cornerRadius: reachLimit,
                        depth: tp.depth,
                        location: tp.unreachableAreas
                    });
                }
                return unmachinedAreas;
            }
        },
        ipw: {
            name: "In-Process Workpiece",
            description: "Track actual material removal through operations",
            accuracy: "highest",
            computeTime: "slow",
            requiresSimulation: true
        }
    },
    // Rest machining strategies
    strategies: {
        cornerCleanup: {
            name: "Corner Cleanup",
            toolSelection: "Smaller than previous tool",
            approach: "Approach from open side",
            stepover: "25-40% of tool diameter",
            recommendations: {
                internalCorner: { angleThreshold: 90, toolReduction: 0.5 },
                tightCorner: { angleThreshold: 60, toolReduction: 0.4 },
                veryTightCorner: { angleThreshold: 45, toolReduction: 0.3 }
            }
        },
        filletCleanup: {
            name: "Fillet Cleanup",
            toolSelection: "Ball endmill ≤ fillet radius",
            approach: "Tangent entry along fillet",
            stepover: "10-20% of tool diameter for finish",
            stepdown: "Match fillet curvature"
        },
        pocketFloorCleanup: {
            name: "Pocket Floor Rest",
            toolSelection: "Flat or bull nose endmill",
            approach: "Spiral or parallel pattern",
            stepover: "60-70% for roughing rest, 25-40% for finishing"
        },
        wallCleanup: {
            name: "Wall Rest Machining",
            toolSelection: "Match or smaller than pocket tool",
            approach: "Climb milling preferred",
            stepdown: "Same as original operation"
        }
    },
    // Calculate optimal tool for rest machining
    selectRestTool: function(previousToolDia, restFeature) {
        const recommendations = [];

        // For corners
        if (restFeature.type === 'corner') {
            const cornerRadius = restFeature.radius || previousToolDia / 2;
            recommendations.push({
                type: 'Flat Endmill',
                diameter: cornerRadius * 1.8, // Leave slight material for finish
                reason: 'Corner cleanup'
            });
            recommendations.push({
                type: 'Ball Endmill',
                diameter: cornerRadius * 2,
                reason: 'Blended corner finish'
            });
        }
        // For fillets
        if (restFeature.type === 'fillet') {
            recommendations.push({
                type: 'Ball Endmill',
                diameter: restFeature.radius * 2,
                reason: 'Match fillet radius'
            });
        }
        return recommendations;
    },
    // Generate rest machining toolpath parameters
    generateRestParams: function(restRegion, material, previousOp) {
        return {
            strategy: this.selectStrategy(restRegion),
            tool: this.selectRestTool(previousOp.toolDiameter, restRegion),
            stepover: this.calculateStepover(restRegion, previousOp),
            stepdown: this.calculateStepdown(restRegion, material),
            feedRate: previousOp.feedRate * 0.8, // Slightly conservative
            spindleSpeed: previousOp.spindleSpeed,
            entryMethod: restRegion.openSide ? 'direct' : 'helix',
            leaveStock: 0 // Final cleanup
        };
    },
    // Select best strategy for rest region
    selectStrategy: function(restRegion) {
        if (restRegion.type === 'corner') {
            return restRegion.angle < 60 ? 'cornerCleanup' : 'pocketFloorCleanup';
        }
        if (restRegion.type === 'fillet') {
            return 'filletCleanup';
        }
        if (restRegion.type === 'wall') {
            return 'wallCleanup';
        }
        return 'pocketFloorCleanup';
    },
    calculateStepover: function(region, previousOp) {
        const baseTool = previousOp.toolDiameter;
        if (region.type === 'corner') return baseTool * 0.3;
        if (region.type === 'fillet') return baseTool * 0.15;
        return baseTool * 0.5;
    },
    calculateStepdown: function(region, material) {
        // Conservative stepdown for rest machining
        const materialFactors = {
            aluminum: 1.0,
            steel: 0.5,
            stainless: 0.4,
            titanium: 0.3,
            inconel: 0.25
        };
        const factor = materialFactors[material] || 0.5;
        return region.depth * factor;
    }
}