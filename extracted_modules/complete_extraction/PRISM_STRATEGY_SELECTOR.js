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
}