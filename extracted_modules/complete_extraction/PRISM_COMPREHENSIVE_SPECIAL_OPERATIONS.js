const PRISM_COMPREHENSIVE_SPECIAL_OPERATIONS = {
    version: "2.0",

    // HELICAL INTERPOLATION OPERATIONS
    helicalInterpolation: {
        threadMilling: {
            name: "Thread Milling",
            description: "Create threads using helical interpolation",
            gCode: "G2/G3 with Z movement",
            types: ["single_point", "multi_form", "solid_carbide"],

            calculate: function(params) {
                const { majorDia, pitch, depth, toolDia, internal } = params;
                const helixDia = internal ? majorDia - toolDia : majorDia + toolDia;
                const circumference = Math.PI * helixDia;
                const revolutions = depth / pitch;

                return {
                    helixDiameter: helixDia,
                    helicalInterpolationDia: helixDia,
                    circumference: circumference,
                    revolutions: revolutions,
                    leadPerRev: pitch,
                    direction: internal ? 'G3' : 'G2'
                };
            },
            generateGCode: function(thread, tool, rpm, feed) {
                const calc = this.calculate(thread);
                const r = calc.helixDiameter / 2;

                return [
                    `(THREAD MILL - ${thread.size})`,
                    `(HELICAL INTERPOLATION)`,
                    `G90 G54`,
                    `M3 S${rpm}`,
                    `G0 X0 Y0`,
                    `G0 Z5.0`,
                    `G0 Z${-thread.depth + thread.pitch}`,
                    `G1 X${r.toFixed(3)} F${feed * 0.5}`,
                    `${calc.direction} X${r.toFixed(3)} Y0 Z${(-thread.depth).toFixed(3)} I${(-r).toFixed(3)} J0 F${feed}`,
                    `G1 X0 Y0`,
                    `G0 Z5.0`,
                    `M5`
                ].join('\n');
            }
        },
        helicalBoring: {
            name: "Helical Boring/Interpolation",
            description: "Create holes larger than tool using helical motion",

            calculate: function(params) {
                const { holeDia, toolDia, depth, stepdown } = params;
                const helixDia = holeDia - toolDia;
                const passes = Math.ceil(depth / stepdown);

                return {
                    helixDiameter: helixDia,
                    helicalInterpolationRequired: true,
                    passes: passes,
                    depthPerPass: depth / passes,
                    arcRadius: helixDia / 2
                };
            }
        },
        helicalEntry: {
            name: "Helical Entry/Ramping",
            description: "Enter pockets using helical ramp",

            calculate: function(params) {
                const { pocketWidth, toolDia, depth, maxAngle } = params;
                const maxHelixDia = Math.min(pocketWidth * 0.8, toolDia * 2);
                const circumference = Math.PI * maxHelixDia;
                const angleRad = maxAngle * Math.PI / 180;
                const leadPerRev = circumference * Math.tan(angleRad);

                return {
                    helixDiameter: maxHelixDia,
                    helixAngle: maxAngle,
                    leadPerRevolution: leadPerRev,
                    helicalInterpolation: true,
                    revolutions: depth / leadPerRev
                };
            }
        },
        circularPocketMilling: {
            name: "Circular Pocket Milling",
            description: "Mill circular pockets using helical interpolation",

            calculate: function(params) {
                const { pocketDia, toolDia, depth, stepdown, stepover } = params;
                const numRings = Math.ceil((pocketDia/2 - toolDia/2) / (toolDia * stepover));
                const zPasses = Math.ceil(depth / stepdown);

                return {
                    helicalInterpolation: true,
                    numberOfRings: numRings,
                    zPasses: zPasses,
                    totalPasses: numRings * zPasses
                };
            }
        }
    },
    // DEEP HOLE DRILLING
    deepHoleDrilling: {
        peckDrilling: {
            name: "Peck Drilling (G83)",
            description: "Standard peck with full retract",
            gCode: "G83",
            maxDepthRatio: 8,

            calculatePecks: function(diameter, depth, material) {
                const ratios = {
                    aluminum: { first: 3.0, subsequent: 2.5 },
                    steel: { first: 2.0, subsequent: 1.5 },
                    stainless: { first: 1.5, subsequent: 1.0 },
                    titanium: { first: 1.0, subsequent: 0.75 },
                    inconel: { first: 0.75, subsequent: 0.5 }
                };
                const ratio = ratios[material] || ratios.steel;
                const pecks = [];
                let currentDepth = 0;
                let peckNum = 1;

                while (currentDepth < depth) {
                    let peckDepth = diameter * (peckNum === 1 ? ratio.first : ratio.subsequent);
                    if (currentDepth > diameter * 5) peckDepth *= 0.75;
                    peckDepth = Math.min(peckDepth, depth - currentDepth);
                    currentDepth += peckDepth;
                    pecks.push({ peck: peckNum++, depth: currentDepth, increment: peckDepth });
                }
                return pecks;
            }
        },
        chipBreakDrilling: {
            name: "Chip Break Drilling (G73)",
            description: "High-speed peck with minimal retract",
            gCode: "G73",
            maxDepthRatio: 5,
            retractAmount: 0.1
        },
        gunDrilling: {
            name: "Gun Drilling",
            description: "Single-flute self-guiding deep hole drill",
            maxDepthRatio: 100,
            coolantRequired: "high_pressure_through_tool",

            parameters: {
                aluminum: { speed: 200, feed: 0.04, pressure: 1000 },
                steel: { speed: 80, feed: 0.02, pressure: 1000 },
                stainless: { speed: 50, feed: 0.015, pressure: 1000 },
                titanium: { speed: 40, feed: 0.01, pressure: 1000 }
            }
        },
        btaDrilling: {
            name: "BTA Drilling",
            description: "Boring and Trepanning Association deep hole drilling",
            maxDepthRatio: 200,
            chipRemoval: "internal",
            coolantFlow: "external_supply_internal_evacuation",

            headTypes: ["solid", "brazed_insert", "indexable"],

            calculate: function(diameter, depth, material) {
                const data = {
                    steel: { speed: 80, feed: 0.02 },
                    aluminum: { speed: 200, feed: 0.04 }
                };
                const matData = data[material] || data.steel;
                const rpm = (matData.speed * 1000) / (Math.PI * diameter);

                return {
                    rpm: Math.round(rpm),
                    feedRate: Math.round(rpm * matData.feed),
                    coolantFlow: Math.round(diameter * 5),
                    estimatedTime: depth / (rpm * matData.feed)
                };
            }
        },
        ejectorDrilling: {
            name: "Ejector Drilling",
            description: "Double tube system for chip removal",
            maxDepthRatio: 150,
            tubeSystem: "double_tube"
        }
    },
    // TAPPING OPERATIONS
    tapping: {
        rigidTapping: {
            name: "Rigid Tapping (G84)",
            description: "Synchronized spindle/feed tapping",
            gCode: "G84",
            requirements: ["rigid_tap_capable_spindle", "encoder_feedback"],

            calculate: function(pitch, rpm) {
                return {
                    feedRate: pitch * rpm,
                    synchronization: "spindle_synchronized"
                };
            }
        },
        floatingTapping: {
            name: "Floating Tap Holder",
            description: "Tapping with floating holder for compensation",
            compensation: "axial_float"
        },
        threadMilling: {
            name: "Thread Milling",
            description: "Single-point or multi-form thread creation",
            helicalInterpolation: true,
            advantages: ["adjustable_size", "multiple_pitches", "blind_holes"]
        }
    },
    // BORING OPERATIONS
    boring: {
        lineBoring: {
            name: "Line Boring (G85)",
            description: "Precision boring with feed retract",
            gCode: "G85",
            tolerance: "H7_or_better"
        },
        backBoring: {
            name: "Back Boring (G87)",
            description: "Boring from reverse side",
            gCode: "G87",
            orientedStop: true
        },
        fineBoring: {
            name: "Fine Boring (G76)",
            description: "Precision boring with oriented retract",
            gCode: "G76",
            orientedRetract: true,
            tolerance: "H6_or_better"
        },
        helicalBoring: {
            name: "Helical Boring",
            description: "Create holes using helical interpolation",
            helicalInterpolation: true,
            oversized: true
        }
    },
    // SPECIALTY OPERATIONS
    specialty: {
        jigGrinding: {
            name: "Jig Grinding",
            description: "High-precision grinding operations",
            hyperMillModule: "hyperMILL Jig Grinding",
            tolerance: "0.001mm",
            surfaceFinish: "Ra 0.1"
        },
        engravingMilling: {
            name: "Engraving/Lettering",
            description: "Text and logo engraving",
            toolTypes: ["V-cutter", "ball_endmill"],
            parameters: {
                depth: { typical: 0.2, unit: "mm" },
                stepover: { typical: 0.1, unit: "mm" }
            }
        },
        chamferMilling: {
            name: "Chamfer Milling",
            description: "Edge breaking and chamfering",
            toolTypes: ["chamfer_mill", "spot_drill"],
            methods: ["2D_contour", "3D_edge_break"]
        },
        slotMilling: {
            name: "Slot Milling",
            description: "Full-width slot creation",
            methods: ["plunge", "ramp", "helix"],
            chipEvacuation: "critical"
        },
        trochoidal: {
            name: "Trochoidal Milling",
            description: "Circular arc cutting motion",
            advantages: ["constant_engagement", "chip_thinning", "reduced_heat"],
            parameters: {
                arcRadius: { typical: 0.3, unit: "xD" },
                stepover: { typical: 0.1, unit: "xD" }
            }
        }
    }
}