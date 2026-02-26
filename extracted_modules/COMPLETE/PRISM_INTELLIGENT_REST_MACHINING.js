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
};
// 6.2 ENHANCED ADAPTIVE/HSM CHIP THINNING ENGINE
// Advanced chip thinning and engagement angle calculations

const PRISM_ADAPTIVE_HSM_ENGINE = {
    version: "2.0",

    // Chip thinning fundamentals
    chipThinning: {
        description: "When radial engagement < 50%, actual chip is thinner than programmed",

        // Calculate actual chip thickness
        calculateActualChip: function(programmedChipload, radialEngagement, toolDiameter) {
            const ae = radialEngagement; // Radial depth of cut
            const d = toolDiameter;

            // Engagement angle in radians
            const engagementAngle = Math.acos(1 - (2 * ae / d));

            // Chip thinning factor
            const chipThinningFactor = Math.sin(engagementAngle);

            // Actual chip thickness
            const actualChip = programmedChipload * chipThinningFactor;

            return {
                engagementAngle: engagementAngle * 180 / Math.PI,
                chipThinningFactor,
                actualChip,
                compensatedFeed: programmedChipload / chipThinningFactor
            };
        },
        // Compensation lookup table
        compensationTable: {
            // Radial engagement as % of diameter : chip thinning factor
            5:  0.309,
            10: 0.436,
            15: 0.527,
            20: 0.600,
            25: 0.661,
            30: 0.714,
            35: 0.760,
            40: 0.800,
            45: 0.836,
            50: 0.866,
            60: 0.917,
            70: 0.954,
            80: 0.980,
            90: 0.995,
            100: 1.000
        },
        // Get compensation factor from table
        getCompensationFactor: function(radialEngagementPercent) {
            const keys = Object.keys(this.compensationTable).map(Number).sort((a,b) => a-b);

            // Find closest match
            for (let i = 0; i < keys.length - 1; i++) {
                if (radialEngagementPercent <= keys[i]) {
                    return this.compensationTable[keys[i]];
                }
                if (radialEngagementPercent < keys[i+1]) {
                    // Linear interpolation
                    const ratio = (radialEngagementPercent - keys[i]) / (keys[i+1] - keys[i]);
                    return this.compensationTable[keys[i]] +
                           ratio * (this.compensationTable[keys[i+1]] - this.compensationTable[keys[i]]);
                }
            }
            return 1.0;
        }
    },
    // Engagement angle control
    engagementControl: {
        // Target engagement angle for different materials
        targetAngles: {
            aluminum: { min: 40, optimal: 60, max: 90 },
            steel: { min: 30, optimal: 45, max: 70 },
            stainless: { min: 25, optimal: 40, max: 60 },
            titanium: { min: 20, optimal: 35, max: 50 },
            inconel: { min: 15, optimal: 30, max: 45 }
        },
        // Calculate radial engagement for target angle
        calculateRadialEngagement: function(targetAngle, toolDiameter) {
            const angleRad = targetAngle * Math.PI / 180;
            const ae = (toolDiameter / 2) * (1 - Math.cos(angleRad));
            return {
                radialEngagement: ae,
                asPercentOfDiameter: (ae / toolDiameter) * 100
            };
        },
        // Get optimal stepover
        getOptimalStepover: function(material, toolDiameter) {
            const target = this.targetAngles[material] || this.targetAngles.steel;
            return this.calculateRadialEngagement(target.optimal, toolDiameter);
        }
    },
    // Adaptive clearing parameters
    adaptiveParameters: {
        // Load control settings
        loadControl: {
            targetLoad: 0.7, // 70% of max load
            minLoad: 0.3,
            maxLoad: 0.9,
            smoothing: 0.8 // How aggressively to smooth load changes
        },
        // Entry methods for adaptive
        entryMethods: {
            helix: {
                name: "Helical Entry",
                maxHelixAngle: 3, // degrees
                minHelixDiameter: 0.5, // times tool diameter
                preferredFor: ["pockets", "closed contours"]
            },
            ramp: {
                name: "Ramp Entry",
                maxRampAngle: 5, // degrees
                preferredFor: ["open slots", "facing"]
            },
            plunge: {
                name: "Plunge Entry",
                requiresCenterCuttingTool: true,
                preferredFor: ["small features", "material entry"]
            },
            predrilled: {
                name: "Pre-drilled Entry",
                requiresPilotHole: true,
                preferredFor: ["deep pockets", "hard materials"]
            }
        },
        // Calculate helix parameters
        calculateHelixEntry: function(toolDiameter, pocketWidth, material) {
            const minHelixDia = toolDiameter * 0.5;
            const maxHelixDia = Math.min(toolDiameter * 2, pocketWidth * 0.8);

            // Material-specific helix angle
            const helixAngles = {
                aluminum: 3.0,
                steel: 2.5,
                stainless: 2.0,
                titanium: 1.5,
                inconel: 1.0
            };
            return {
                helixDiameter: (minHelixDia + maxHelixDia) / 2,
                helixAngle: helixAngles[material] || 2.0,
                helixDirection: "CW", // Climb milling
                rampFeedReduction: 0.5 // 50% of cutting feed
            };
        }
    },
    // Generate optimized adaptive parameters
    generateAdaptiveParams: function(tool, material, feature) {
        const engagement = this.engagementControl.getOptimalStepover(material, tool.diameter);
        const chipThinning = this.chipThinning.getCompensationFactor(engagement.asPercentOfDiameter);

        return {
            radialDepth: engagement.radialEngagement,
            radialDepthPercent: engagement.asPercentOfDiameter,
            chipThinningFactor: chipThinning,
            feedCompensation: 1 / chipThinning,
            entry: this.adaptiveParameters.calculateHelixEntry(tool.diameter, feature.width, material),
            loadControl: this.adaptiveParameters.loadControl,
            optimalStepdown: this.calculateOptimalStepdown(tool, material)
        };
    },
    calculateOptimalStepdown: function(tool, material) {
        // Axial depth recommendations
        const aeLimits = {
            aluminum: { roughing: 1.0, finishing: 0.5 }, // times diameter
            steel: { roughing: 0.5, finishing: 0.25 },
            stainless: { roughing: 0.4, finishing: 0.2 },
            titanium: { roughing: 0.25, finishing: 0.1 },
            inconel: { roughing: 0.2, finishing: 0.08 }
        };
        const limits = aeLimits[material] || aeLimits.steel;
        return {
            roughingMax: tool.diameter * limits.roughing,
            finishingMax: tool.diameter * limits.finishing
        };
    }
};
// 6.3 5-AXIS LINKING & ORIENTATION ENGINE
// Smooth linking moves, lead/lag angles, collision-free retracts

const PRISM_5AXIS_LINKING_ENGINE = {
    version: "1.0",

    // Tool axis control methods
    toolAxisControl: {
        fixed: {
            name: "Fixed Tool Axis",
            description: "Tool axis remains constant",
            applications: ["3+2 machining", "indexing"]
        },
        towardPoint: {
            name: "Toward Point",
            description: "Tool axis points toward a defined point",
            applications: ["hemispherical surfaces", "domes"]
        },
        towardLine: {
            name: "Toward Line",
            description: "Tool axis points toward a defined line",
            applications: ["cylindrical surfaces", "ruled surfaces"]
        },
        normalToSurface: {
            name: "Normal to Surface",
            description: "Tool axis perpendicular to surface",
            applications: ["general 5-axis surfacing"]
        },
        leadLag: {
            name: "Lead/Lag Angle",
            description: "Tool tilted in feed direction",
            applications: ["surface finishing", "swarf cutting"]
        },
        interpolated: {
            name: "Interpolated",
            description: "Smooth transition between defined orientations",
            applications: ["complex multi-surface"]
        }
    },
    // Lead and Lag angle control
    leadLagControl: {
        // Lead angle - tilt forward in feed direction
        lead: {
            description: "Tool tilted forward (toward feed direction)",
            benefits: ["Better chip evacuation", "Reduced rubbing at tool tip"],
            typical: { min: 0, max: 15, optimal: 5 },
            byMaterial: {
                aluminum: { optimal: 3, max: 10 },
                steel: { optimal: 5, max: 15 },
                titanium: { optimal: 7, max: 12 },
                composites: { optimal: 2, max: 8 }
            }
        },
        // Lag angle - tilt backward
        lag: {
            description: "Tool tilted backward (away from feed direction)",
            benefits: ["Cutting with ball center avoided", "Better finish"],
            typical: { min: 0, max: 10, optimal: 3 }
        },
        // Tilt angle - perpendicular to feed
        tilt: {
            description: "Tool tilted sideways relative to feed",
            benefits: ["Collision avoidance", "Access to undercuts"],
            typical: { min: 0, max: 30, optimal: 0 }
        },
        // Calculate optimal lead/lag
        calculateOptimal: function(toolType, material, surfaceAngle) {
            let lead = this.lead.byMaterial[material]?.optimal || 5;
            let lag = 0;

            // Adjust for ball endmill
            if (toolType === 'ball') {
                lead = Math.max(lead, 3); // Minimum 3° to avoid cutting at tip
            }
            // Adjust for surface angle
            if (surfaceAngle > 60) {
                lead = Math.min(lead, 8); // Reduce lead on steep surfaces
            }
            return { lead, lag, tilt: 0 };
        }
    },
    // Linking moves between cuts
    linkingMoves: {
        types: {
            direct: {
                name: "Direct",
                description: "Straight line move to next position",
                safetyRequirement: "Clear path required"
            },
            skim: {
                name: "Skim",
                description: "Maintain safe distance above surface",
                clearanceHeight: 2, // mm above surface
                useFor: ["close passes", "efficient linking"]
            },
            retract: {
                name: "Retract",
                description: "Full retract to safe height",
                safetyMargin: 25, // mm
                useFor: ["long moves", "unknown obstacles"]
            },
            smooth: {
                name: "Smooth",
                description: "Curved path maintaining orientation smoothness",
                curvature: "G-2 continuous",
                useFor: ["visible surfaces", "quality finish"]
            },
            arcFit: {
                name: "Arc Fit",
                description: "Replace linear moves with arcs where possible",
                tolerance: 0.01, // mm
                benefits: ["Smoother motion", "Reduced code size"]
            }
        },
        // Calculate optimal linking strategy
        selectLinking: function(fromPos, toPos, obstacles, surfaceQuality) {
            const distance = Math.sqrt(
                Math.pow(toPos.x - fromPos.x, 2) +
                Math.pow(toPos.y - fromPos.y, 2) +
                Math.pow(toPos.z - fromPos.z, 2)
            );

            if (distance < 5 && !obstacles) {
                return surfaceQuality === 'finish' ? 'smooth' : 'skim';
            }
            if (distance < 50 && !obstacles) {
                return 'skim';
            }
            return 'retract';
        }
    },
    // Smooth orientation interpolation
    orientationInterpolation: {
        methods: {
            linear: {
                name: "Linear SLERP",
                description: "Spherical linear interpolation",
                smoothness: "G-1 continuous"
            },
            spline: {
                name: "Quaternion Spline",
                description: "Smooth spline through orientations",
                smoothness: "G-2 continuous"
            }
        },
        // Interpolate between two orientations
        slerp: function(q1, q2, t) {
            // Spherical linear interpolation
            let dot = q1.w*q2.w + q1.x*q2.x + q1.y*q2.y + q1.z*q2.z;

            if (dot < 0) {
                q2 = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
                dot = -dot;
            }
            if (dot > 0.9995) {
                // Linear interpolation for very close orientations
                return {
                    w: q1.w + t * (q2.w - q1.w),
                    x: q1.x + t * (q2.x - q1.x),
                    y: q1.y + t * (q2.y - q1.y),
                    z: q1.z + t * (q2.z - q1.z)
                };
            }
            const theta = Math.acos(dot);
            const sinTheta = Math.sin(theta);
            const w1 = Math.sin((1-t) * theta) / sinTheta;
            const w2 = Math.sin(t * theta) / sinTheta;

            return {
                w: w1 * q1.w + w2 * q2.w,
                x: w1 * q1.x + w2 * q2.x,
                y: w1 * q1.y + w2 * q2.y,
                z: w1 * q1.z + w2 * q2.z
            };
        }
    },
    // Collision-free retract planning
    retractPlanning: {
        methods: {
            vertical: { description: "Retract along Z axis", safe: true },
            toolAxis: { description: "Retract along tool axis", efficient: true },
            normal: { description: "Retract normal to surface", contextual: true },
            vectored: { description: "Retract along custom vector", flexible: true }
        },
        planRetract: function(currentPos, currentOrientation, obstacles, safeHeight) {
            // Try tool axis retract first (most efficient)
            const toolAxisRetract = this.calculateToolAxisRetract(currentPos, currentOrientation, safeHeight);

            if (!this.checkCollision(toolAxisRetract.path, obstacles)) {
                return { method: 'toolAxis', path: toolAxisRetract.path };
            }
            // Fall back to vertical retract
            const verticalRetract = {
                path: [
                    currentPos,
                    { ...currentPos, z: safeHeight }
                ]
            };
            return { method: 'vertical', path: verticalRetract.path };
        },
        calculateToolAxisRetract: function(pos, orientation, height) {
            // Calculate retract point along tool axis
            const retractDist = height - pos.z;
            return {
                path: [
                    pos,
                    {
                        x: pos.x + orientation.i * retractDist,
                        y: pos.y + orientation.j * retractDist,
                        z: pos.z + orientation.k * retractDist
                    }
                ]
            };
        },
        checkCollision: function(path, obstacles) {
            // Simplified collision check
            return false; // Placeholder
        }
    }
};
// 6.4 MATERIAL-BASED STRATEGY SELECTOR
// Automatic strategy recommendation based on material and feature

const PRISM_STRATEGY_SELECTOR = {
    version: "1.0",

    // Strategy recommendations by material class
    materialStrategies: {
        aluminum: {
            class: "Non-ferrous",
            characteristics: ["High thermal conductivity", "Soft", "Gummy when wrong speed"],
            roughing: {
                primary: "Adaptive Clearing",
                alternate: "High-speed Pocketing",
                preferences: {
                    highSpeedSpindle: true,
                    climbMilling: true,
                    coolant: "Mist or flood",
                    chipLoad: "aggressive"
                }
            },
            finishing: {
                primary: "High-speed finishing",
                alternate: "Parallel finishing",
                preferences: {
                    highRPM: true,
                    lightPasses: true,
                    stepover: "15-25% tool diameter"
                }
            },
            avoid: ["Slow speeds", "Heavy radial engagement without HSM"]
        },
        steel: {
            class: "Ferrous",
            characteristics: ["Work hardens at surface", "Moderate thermal conductivity"],
            roughing: {
                primary: "Adaptive Clearing",
                alternate: "Volumetric roughing",
                preferences: {
                    constantEngagement: true,
                    climbMilling: true,
                    coolant: "Flood",
                    chipLoad: "moderate"
                }
            },
            finishing: {
                primary: "Z-level finishing",
                alternate: "Contour finishing",
                preferences: {
                    consistentLoad: true,
                    stepover: "20-35% tool diameter"
                }
            },
            avoid: ["Interrupted cuts without chip thinning compensation"]
        },
        stainless: {
            class: "Ferrous - work hardening",
            characteristics: ["Severe work hardening", "Poor thermal conductivity", "Galling tendency"],
            roughing: {
                primary: "Adaptive with constant engagement",
                alternate: "Trochoidal milling",
                preferences: {
                    neverDwell: true,
                    constantChipLoad: true,
                    coolant: "High-pressure flood",
                    chipLoad: "maintain minimum"
                }
            },
            finishing: {
                primary: "Single-pass finishing",
                alternate: "Spiral finishing",
                preferences: {
                    avoidRecuts: true,
                    freshMaterial: true,
                    stepover: "15-25% tool diameter"
                }
            },
            avoid: ["Light passes", "Dwelling", "Rubbing", "Re-cutting chips"]
        },
        titanium: {
            class: "Reactive metal",
            characteristics: ["Low thermal conductivity", "Springback", "Tool wear"],
            roughing: {
                primary: "Adaptive with controlled engagement",
                alternate: "Trochoidal slots",
                preferences: {
                    lowEngagement: true,
                    moderateSpeed: true,
                    coolant: "High-pressure flood",
                    chipLoad: "high feed per tooth"
                }
            },
            finishing: {
                primary: "Climb milling finish",
                alternate: "Ball mill scallop",
                preferences: {
                    sharpTools: true,
                    avoidRubbing: true,
                    stepover: "10-20% tool diameter"
                }
            },
            avoid: ["High speeds", "Tool rubbing", "Built-up edge"]
        },
        inconel: {
            class: "Superalloy",
            characteristics: ["Extreme work hardening", "Very poor machinability", "High tool wear"],
            roughing: {
                primary: "Ceramic or CBN roughing",
                alternate: "Adaptive with carbide",
                preferences: {
                    veryLowEngagement: true,
                    highPressureCoolant: true,
                    ceramicTooling: "preferred",
                    chipLoad: "minimum viable"
                }
            },
            finishing: {
                primary: "Light finishing passes",
                alternate: "Single pass to size",
                preferences: {
                    minimumPasses: true,
                    freshCuttingEdge: true,
                    stepover: "5-15% tool diameter"
                }
            },
            avoid: ["Multiple finish passes", "Dull tools", "Inadequate coolant"]
        },
        composites: {
            class: "Fiber-reinforced",
            characteristics: ["Abrasive fibers", "Delamination risk", "Dust hazard"],
            roughing: {
                primary: "Compression routing",
                alternate: "Diamond-coated conventional",
                preferences: {
                    compressionCutter: true,
                    dustExtraction: true,
                    noFloodCoolant: true,
                    chipLoad: "moderate"
                }
            },
            finishing: {
                primary: "Diamond finish milling",
                alternate: "Compression finishing",
                preferences: {
                    sharpDiamondCoated: true,
                    supportFibers: true,
                    stepover: "30-50% tool diameter"
                }
            },
            avoid: ["Flood coolant", "Dull tools", "Unsupported edges"]
        }
    },
    // Feature-based strategy selection
    featureStrategies: {
        pocket: {
            openPocket: {
                roughing: ["Adaptive Clearing", "High-speed Pocketing"],
                finishing: ["Parallel Finishing", "Contour Finishing"]
            },
            closedPocket: {
                roughing: ["Adaptive with Helix Entry", "Plunge Roughing"],
                finishing: ["Spiral Finishing", "Parallel Finishing"]
            },
            deepPocket: {
                roughing: ["Z-level Adaptive", "Rest Machining"],
                finishing: ["Z-level Finishing", "Pencil Cleanup"]
            }
        },
        wall: {
            vertical: {
                roughing: ["Z-level Roughing", "Contour Roughing"],
                finishing: ["Z-level Finishing", "Constant-Z Finishing"]
            },
            drafted: {
                roughing: ["Morphed Roughing", "3D Adaptive"],
                finishing: ["Morphed Finishing", "Scallop Finishing"]
            }
        },
        floor: {
            flat: {
                roughing: ["Face Milling", "Adaptive Facing"],
                finishing: ["Parallel Finishing", "Facing"]
            },
            sculptured: {
                roughing: ["3D Adaptive", "Waterline Roughing"],
                finishing: ["Parallel", "Scallop", "Pencil"]
            }
        },
        hole: {
            throughHole: ["Drilling", "Helical Boring", "Thread Milling"],
            blindHole: ["Peck Drilling", "Boring", "Helical Interpolation"],
            threadedHole: ["Tapping", "Thread Milling", "Form Tapping"]
        }
    },
    // Get recommendation
    recommend: function(material, feature, constraints) {
        const matStrategy = this.materialStrategies[material];
        const featStrategy = this.featureStrategies[feature.type];

        if (!matStrategy || !featStrategy) {
            return { error: "Unknown material or feature type" };
        }
        return {
            material: material,
            feature: feature,
            roughingStrategy: matStrategy.roughing.primary,
            finishingStrategy: matStrategy.finishing.primary,
            materialPreferences: matStrategy.roughing.preferences,
            featureOptions: featStrategy[feature.subType] || featStrategy,
            warnings: matStrategy.avoid
        };
    }
};
// 6.5 TOOLPATH OPTIMIZATION ENGINE
// Arc fitting, point reduction, smoothing

const PRISM_TOOLPATH_OPTIMIZATION = {
    version: "1.0",

    // Arc fitting - replace linear segments with arcs
    arcFitting: {
        tolerances: {
            tight: 0.005,    // 5 microns - high precision
            standard: 0.01,  // 10 microns - general machining
            rough: 0.05      // 50 microns - roughing operations
        },
        // Fit arc to points
        fitArc: function(points, tolerance) {
            if (points.length < 3) return null;

            // Find circle through 3 points
            const p1 = points[0];
            const p2 = points[Math.floor(points.length / 2)];
            const p3 = points[points.length - 1];

            const center = this.findCircleCenter(p1, p2, p3);
            if (!center) return null;

            const radius = Math.sqrt(Math.pow(p1.x - center.x, 2) + Math.pow(p1.y - center.y, 2));

            // Check all points are within tolerance
            let maxDeviation = 0;
            for (const p of points) {
                const dist = Math.sqrt(Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2));
                maxDeviation = Math.max(maxDeviation, Math.abs(dist - radius));
            }
            if (maxDeviation <= tolerance) {
                return {
                    type: 'arc',
                    center,
                    radius,
                    startPoint: p1,
                    endPoint: p3,
                    deviation: maxDeviation,
                    pointsReplaced: points.length
                };
            }
            return null;
        },
        // Find center of circle through 3 points
        findCircleCenter: function(p1, p2, p3) {
            const ax = p1.x, ay = p1.y;
            const bx = p2.x, by = p2.y;
            const cx = p3.x, cy = p3.y;

            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
            if (Math.abs(d) < 1e-10) return null; // Collinear points

            const ux = ((ax*ax + ay*ay) * (by - cy) + (bx*bx + by*by) * (cy - ay) + (cx*cx + cy*cy) * (ay - by)) / d;
            const uy = ((ax*ax + ay*ay) * (cx - bx) + (bx*bx + by*by) * (ax - cx) + (cx*cx + cy*cy) * (bx - ax)) / d;

            return { x: ux, y: uy };
        },
        // Process toolpath and fit arcs
        processToolpath: function(toolpath, tolerance) {
            const optimized = [];
            let i = 0;

            while (i < toolpath.length) {
                // Try to fit arc starting at current point
                let bestArc = null;
                let bestLength = 3;

                for (let len = 3; len <= Math.min(50, toolpath.length - i); len++) {
                    const segment = toolpath.slice(i, i + len);
                    const arc = this.fitArc(segment, tolerance);

                    if (arc) {
                        bestArc = arc;
                        bestLength = len;
                    } else if (bestArc) {
                        break; // Can't extend further
                    }
                }
                if (bestArc) {
                    optimized.push(bestArc);
                    i += bestLength - 1;
                } else {
                    optimized.push({ type: 'linear', point: toolpath[i] });
                    i++;
                }
            }
            return {
                original: toolpath.length,
                optimized: optimized.length,
                reduction: ((toolpath.length - optimized.length) / toolpath.length * 100).toFixed(1) + '%',
                segments: optimized
            };
        }