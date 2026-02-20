const PRISM_COMPREHENSIVE_CAM_STRATEGIES = {
    version: "3.0",

    // 2D STRATEGIES
    strategies2D: {
        facing: {
            name: "Facing",
            description: "Remove material from top surface to establish datum",
            patterns: ["zigzag", "one_way", "spiral", "bidirectional"],
            parameters: {
                stepover: { min: 0.4, typical: 0.6, max: 0.8, unit: "xD" },
                direction: ["climb", "conventional"],
                stockToLeave: { min: 0, typical: 0, max: 0.5, unit: "mm" }
            }
        },
        pocketing2D: {
            name: "2D Pocketing",
            description: "Clear material from enclosed boundary",
            strategies: {
                zigzag: { efficiency: 0.85, surfaceQuality: 0.6 },
                spiral_in: { efficiency: 0.75, surfaceQuality: 0.8 },
                spiral_out: { efficiency: 0.78, surfaceQuality: 0.85 },
                trochoidal: { efficiency: 0.65, surfaceQuality: 0.9 },
                adaptiveClearing: { efficiency: 0.95, surfaceQuality: 0.85 }
            },
            parameters: {
                stepover: { min: 0.3, typical: 0.5, max: 0.7, unit: "xD" },
                stepdown: { min: 0.5, typical: 1.0, max: 2.0, unit: "xD" }
            }
        },
        contouring2D: {
            name: "2D Contouring",
            description: "Follow profile/contour path",
            parameters: {
                compensation: ["computer", "control", "off"],
                side: ["left", "right", "on"],
                direction: ["climb", "conventional"]
            },
            leadInOut: {
                arc: { radius: { min: 0.25, typical: 0.5, max: 1.0, unit: "xD" } },
                linear: { length: { min: 1, typical: 3, max: 10, unit: "mm" } },
                tangent: { angle: { typical: 45, unit: "degrees" } }
            }
        }
    },
    // 3D ROUGHING STRATEGIES
    strategies3DRoughing: {
        adaptiveClearing: {
            name: "Adaptive Clearing (HSM)",
            description: "Constant tool engagement high-speed machining",
            hyperMillEquivalent: "Optimized Roughing",
            fusionEquivalent: "Adaptive Clearing",
            mastercamEquivalent: "Dynamic Mill",
            solidcamEquivalent: "iMachining 3D",
            parameters: {
                optimalLoad: { min: 0.05, typical: 0.1, max: 0.25, unit: "xD" },
                maxStepdown: { min: 1.0, typical: 2.0, max: 4.0, unit: "xD" },
                flatAreaDetection: true,
                restMachining: true,
                chipThinningCompensation: true
            },
            advantages: [
                "Constant chip load maintains tool life",
                "Full depth of cut increases MRR",
                "Reduced vibration and chatter",
                "Lower heat generation"
            ]
        },
        zLevelRoughing: {
            name: "Z-Level Roughing",
            description: "Horizontal slicing with constant Z stepdowns",
            hyperMillEquivalent: "Z-Level Roughing",
            parameters: {
                stepdown: { min: 0.5, typical: 1.5, max: 3.0, unit: "mm" },
                stepover: { min: 0.4, typical: 0.6, max: 0.75, unit: "xD" },
                direction: ["climb", "conventional", "mixed"]
            }
        },
        parallelRoughing: {
            name: "Parallel/Raster Roughing",
            description: "Parallel passes at specified angle",
            parameters: {
                angle: { min: 0, typical: 45, max: 90, unit: "degrees" },
                stepover: { min: 0.5, typical: 0.65, max: 0.75, unit: "xD" }
            }
        },
        plungeRoughing: {
            name: "Plunge Roughing",
            description: "Vertical drilling motion for deep cavities",
            parameters: {
                stepover: { min: 0.5, typical: 0.7, max: 0.85, unit: "xD" },
                retractHeight: { typical: 2, unit: "mm" }
            },
            bestFor: ["Deep pockets", "Hard materials", "Long tool overhang"]
        }
    },
    // 3D FINISHING STRATEGIES
    strategies3DFinishing: {
        waterline: {
            name: "Waterline/Z-Level Finishing",
            description: "Constant Z contours for steep surfaces",
            hyperMillEquivalent: "Z-Level Finishing",
            parameters: {
                stepdown: { min: 0.1, typical: 0.3, max: 0.5, unit: "mm" },
                minSteepAngle: { min: 30, typical: 45, max: 60, unit: "degrees" }
            },
            bestFor: ["Steep walls", "Near-vertical surfaces"]
        },
        parallelFinishing: {
            name: "Parallel Finishing",
            description: "Parallel passes for shallow areas",
            parameters: {
                stepover: { scallop_based: true, typical: 0.15, unit: "xD" },
                angle: { min: 0, typical: 45, max: 90, unit: "degrees" }
            },
            bestFor: ["Floors", "Shallow surfaces"]
        },
        scallop3D: {
            name: "3D Scallop/Offset Finishing",
            description: "Constant scallop height on all surfaces",
            parameters: {
                scallop: { min: 0.002, typical: 0.005, max: 0.02, unit: "mm" },
                tolerance: { typical: 0.005, unit: "mm" }
            }
        },
        pencilMilling: {
            name: "Pencil Milling",
            description: "Clean internal corners and fillets",
            parameters: {
                minRadius: { typical: 0.1, unit: "mm" },
                passes: { min: 1, typical: 2, max: 3 },
                springPasses: { typical: 1 }
            }
        },
        flowLine: {
            name: "Flow Line Finishing",
            description: "Follow surface UV directions",
            hyperMillEquivalent: "3D Arbitrary",
            parameters: {
                direction: ["u", "v", "uv"],
                stepover: { typical: 0.3, unit: "mm" }
            },
            bestFor: ["Organic surfaces", "Molds"]
        },
        isoParametric: {
            name: "Iso-Parametric Finishing",
            description: "Follow surface parameter lines",
            parameters: {
                direction: ["u", "v"],
                density: { typical: 0.1, unit: "mm" }
            }
        },
        equidistant3D: {
            name: "3D Equidistant Finishing",
            description: "Constant distance from surface",
            hyperMillEquivalent: "3D Equidistant",
            parameters: {
                offset: { typical: 0.1, unit: "mm" }
            }
        }
    },
    // 5-AXIS STRATEGIES
    strategies5Axis: {
        swarfMilling: {
            name: "Swarf Milling",
            description: "Side cutting on ruled surfaces",
            hyperMillEquivalent: "5-axis Swarf Cutting",
            siemensEquivalent: "TRAORI with side cutting",
            parameters: {
                tiltAngle: { min: 0, typical: 0, max: 5, unit: "degrees" },
                leadAngle: { min: 0, typical: 5, max: 15, unit: "degrees" }
            },
            toolAxis: "follows ruled surface"
        },
        multiAxisContour: {
            name: "5-Axis Contouring",
            description: "Continuous 5-axis profile machining",
            hyperMillEquivalent: "5-axis Contour",
            parameters: {
                toolAxisControl: ["to_surface", "relative", "fixed", "interpolated"],
                leadAngle: { min: 0, typical: 5, max: 15, unit: "degrees" },
                tiltAngle: { min: -30, typical: 0, max: 30, unit: "degrees" }
            }
        },
        autoTilt: {
            name: "5-Axis Auto Tilt",
            description: "Automatic tool axis tilting for collision avoidance",
            hyperMillEquivalent: "5-axis Auto Indexing",
            parameters: {
                maxTilt: { typical: 30, unit: "degrees" },
                collisionCheck: true,
                gougeCheck: true
            }
        },
        impellerMachining: {
            name: "Impeller Machining",
            description: "Specialized strategy for impeller/blisk",
            hyperMillEquivalent: "Impeller Machining",
            strategies: {
                hubRoughing: "Plunge or adaptive roughing between blades",
                bladeRoughing: "Multi-pass 5-axis roughing",
                splitterRoughing: "Specialized for splitter blades",
                hubFinishing: "5-axis floor finishing",
                bladeFinishing: "Flank or point milling",
                blendFinishing: "Fillet blend finishing"
            }
        },
        bladeMachining: {
            name: "Blade/Airfoil Machining",
            description: "Turbine blade machining strategies",
            hyperMillEquivalent: "Blade Machining",
            methods: {
                flankmilling: "Single pass full depth",
                pointMilling: "Ball nose finishing passes",
                helicalFinishing: "Spiral path around blade"
            }
        },
        tubeMachining: {
            name: "Tube/Port Machining",
            description: "Internal tube and port machining",
            parameters: {
                toolAxisFollow: "tube centerline",
                collisionCheck: true
            }
        }
    },
    // REST MACHINING STRATEGIES
    restMachining: {
        automaticRest: {
            name: "Automatic Rest Machining",
            description: "Detect and machine remaining material",
            detectionMethods: ["stock_model", "previous_toolpath", "ipw"],
            parameters: {
                toolReduction: { min: 0.3, typical: 0.5, max: 0.7, unit: "previous tool %" },
                minRestThickness: { typical: 0.1, unit: "mm" }
            }
        },
        cornerCleanup: {
            name: "Corner Cleanup",
            description: "Clean material in corners smaller than previous tool",
            parameters: {
                toolDiameter: "smaller than corner radius",
                stepover: { typical: 0.25, unit: "xD" }
            }
        },
        pencilRest: {
            name: "Pencil Rest Machining",
            description: "Rest material detection + pencil strategy",
            parameters: {
                detectFrom: ["previous_tool", "stock_model"],
                passes: { typical: 2 }
            }
        }
    },
    // Strategy selector function
    selectStrategy: function(feature, material, tolerance, machine) {
        // Logic to select optimal strategy
        const recommendations = [];

        if (feature.type === 'pocket' && feature.depth > feature.width * 0.5) {
            recommendations.push({
                strategy: 'adaptiveClearing',
                confidence: 0.95,
                reason: 'Deep pocket benefits from constant engagement'
            });
        }
        if (feature.hasSteepWalls && feature.wallAngle > 45) {
            recommendations.push({
                strategy: 'waterline',
                confidence: 0.9,
                reason: 'Steep walls require Z-level approach'
            });
        }
        if (machine.axes >= 5 && feature.hasRuledSurfaces) {
            recommendations.push({
                strategy: 'swarfMilling',
                confidence: 0.85,
                reason: 'Ruled surface ideal for swarf cutting'
            });
        }
        return recommendations;
    }
}