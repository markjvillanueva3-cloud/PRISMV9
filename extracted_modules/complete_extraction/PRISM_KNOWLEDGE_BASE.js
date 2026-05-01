const PRISM_KNOWLEDGE_BASE = {
    version: '3.0',
    lastUpdated: '2025-12-26',

    // SECTION 1: PHYSICS OF METAL CUTTING
    physics: {
        // Chip formation models
        chipFormation: {
            merchantModel: {
                // Shear angle calculation: φ = 45° - β/2 + α/2
                // where β = friction angle, α = rake angle
                shearAngleFormula: (rakeAngle, frictionAngle) => {
                    return 45 - frictionAngle/2 + rakeAngle/2;
                },
                description: 'Classic model for orthogonal cutting'
            },
            leeShafferModel: {
                // φ = 45° - β + α
                shearAngleFormula: (rakeAngle, frictionAngle) => {
                    return 45 - frictionAngle + rakeAngle;
                },
                description: 'Slip-line field theory approach'
            }
        },
        // Specific cutting force (Kienzle model)
        specificCuttingForce: {
            // Kc = Kc1.1 × h^(-mc)
            // where h = chip thickness (mm), Kc1.1 = specific cutting force at h=1mm
            calculate: (Kc11, chipThickness, mc) => {
                return Kc11 * Math.pow(chipThickness, -mc);
            },
            // Force calculation: F = Kc × A (chip cross-section area)
            forceCalculation: (Kc, ap, ae) => {
                return Kc * ap * ae;
            }
        },
        // Power calculations
        power: {
            // P = Fc × Vc / 60000 (kW)
            cuttingPower: (Fc, Vc) => (Fc * Vc) / 60000,
            // P = MRR × Kc / 60000000 (kW) where MRR in mm³/min
            fromMRR: (mrr, Kc) => (mrr * Kc) / 60000000,
            // Spindle power required with efficiency
            spindlePower: (cuttingPower, efficiency = 0.85) => cuttingPower / efficiency
        }
    },
    // SECTION 2: THERMODYNAMICS
    thermodynamics: {
        // Heat generation zones
        heatZones: {
            primary: { location: 'Shear zone', heatPartition: 0.75 },
            secondary: { location: 'Tool-chip interface', heatPartition: 0.20 },
            tertiary: { location: 'Tool-workpiece interface', heatPartition: 0.05 }
        },
        // Temperature limits by tool material (°C)
        toolTemperatureLimits: {
            HSS: 600,
            cobaltHSS: 650,
            carbide_uncoated: 800,
            carbide_TiN: 600,
            carbide_TiCN: 450,
            carbide_TiAlN: 800,
            carbide_AlTiN: 900,
            carbide_AlCrN: 1100,
            ceramic_alumina: 1200,
            ceramic_silicon_nitride: 1000,
            CBN: 1400,
            PCD: 700
        },
        // Cutting temperature estimation (simplified model)
        estimateTemperature: (Vc, feed, material) => {
            // T ≈ C × Vc^0.4 × f^0.2 × material_factor
            const materialFactors = {
                aluminum: 0.5, steel: 1.0, stainless: 1.3,
                titanium: 1.5, inconel: 1.8, cast_iron: 0.7
            };
            const C = 400; // Empirical constant
            const factor = materialFactors[material] || 1.0;
            return C * Math.pow(Vc, 0.4) * Math.pow(feed, 0.2) * factor;
        }
    },
    // SECTION 3: MATERIAL DATABASE
    materials: {
        // Ferrous metals
        ferrous: {
            'mild_steel_1018': {
                names: ['1018', 'AISI 1018', 'SAE 1018', 'C1018'],
                category: 'low_carbon_steel',
                physical: { density: 7870, elasticModulus: 205, thermalConductivity: 51.9 },
                mechanical: {
                    yieldStrength: 370, tensileStrength: 440,
                    hardness: { value: 126, scale: 'HB' }
                },
                machining: {
                    machinabilityRating: 78, Kc11: 1700, mc: 0.25,
                    recommendedSpeed: { HSS: 80, carbide: 300, ceramic: null }
                },
                johnsonCook: { A: 350, B: 275, n: 0.36, C: 0.022, m: 1.0 }
            },
            'alloy_steel_4140': {
                names: ['4140', 'AISI 4140', 'SAE 4140', '41Cr4'],
                category: 'alloy_steel',
                physical: { density: 7850, elasticModulus: 205, thermalConductivity: 42.6 },
                mechanical: {
                    annealed: { yieldStrength: 415, tensileStrength: 655, hardness: { value: 197, scale: 'HB' } },
                    hardened: { yieldStrength: 1175, tensileStrength: 1310, hardness: { value: 42, scale: 'HRC' } }
                },
                machining: {
                    machinabilityRating: 65,
                    Kc11: { annealed: 1800, hardened: 2800 },
                    mc: 0.25,
                    recommendedSpeed: { HSS: 60, carbide: 200, ceramic: 400 }
                },
                johnsonCook: { A: 792, B: 510, n: 0.26, C: 0.014, m: 1.03 }
            },
            'stainless_304': {
                names: ['304', 'AISI 304', '18-8', 'A2'],
                category: 'austenitic_stainless',
                physical: { density: 8000, elasticModulus: 193, thermalConductivity: 16.2 },
                mechanical: {
                    yieldStrength: 215, tensileStrength: 505,
                    hardness: { value: 201, scale: 'HB' }
                },
                machining: {
                    machinabilityRating: 45, Kc11: 2200, mc: 0.21,
                    recommendedSpeed: { HSS: 40, carbide: 150, ceramic: 300 },
                    notes: ['Work hardens rapidly', 'Use sharp tools', 'Positive rake angles']
                },
                johnsonCook: { A: 310, B: 1000, n: 0.65, C: 0.07, m: 1.0 }
            },
            'stainless_316': {
                names: ['316', 'AISI 316', '18-10-2', 'A4'],
                category: 'austenitic_stainless',
                physical: { density: 8000, elasticModulus: 193, thermalConductivity: 16.3 },
                mechanical: {
                    yieldStrength: 205, tensileStrength: 515,
                    hardness: { value: 217, scale: 'HB' }
                },
                machining: {
                    machinabilityRating: 36, Kc11: 2500, mc: 0.21,
                    recommendedSpeed: { HSS: 30, carbide: 120, ceramic: 250 },
                    notes: ['More difficult than 304', 'Requires rigid setup']
                },
                johnsonCook: { A: 305, B: 1161, n: 0.61, C: 0.01, m: 1.0 }
            },
            'tool_steel_D2': {
                names: ['D2', 'AISI D2', 'SKD11', '1.2379'],
                category: 'tool_steel',
                physical: { density: 7700, elasticModulus: 210, thermalConductivity: 20.0 },
                mechanical: {
                    annealed: { yieldStrength: 360, tensileStrength: 585, hardness: { value: 225, scale: 'HB' } },
                    hardened: { yieldStrength: 1650, tensileStrength: 1850, hardness: { value: 62, scale: 'HRC' } }
                },
                machining: {
                    machinabilityRating: 27,
                    Kc11: { annealed: 2200, hardened: 4500 },
                    mc: 0.25,
                    recommendedSpeed: { HSS: 25, carbide: 100, ceramic: 250, CBN: 150 }
                }
            },
            'cast_iron_gray': {
                names: ['Gray Cast Iron', 'Class 30', 'FC200', 'GG25'],
                category: 'cast_iron',
                physical: { density: 7200, elasticModulus: 110, thermalConductivity: 46 },
                mechanical: {
                    tensileStrength: 210,
                    hardness: { value: 200, scale: 'HB' }
                },
                machining: {
                    machinabilityRating: 80, Kc11: 1100, mc: 0.28,
                    recommendedSpeed: { HSS: 60, carbide: 250, ceramic: 600 },
                    notes: ['Produces short chips', 'Abrasive', 'No coolant often preferred']
                }
            }
        },
        // Non-ferrous metals
        nonFerrous: {
            'aluminum_6061_T6': {
                names: ['6061-T6', 'AA6061', 'AlMg1SiCu'],
                category: 'wrought_aluminum',
                physical: { density: 2700, elasticModulus: 68.9, thermalConductivity: 167 },
                mechanical: {
                    yieldStrength: 276, tensileStrength: 310,
                    hardness: { value: 95, scale: 'HB' }
                },
                machining: {
                    machinabilityRating: 90, Kc11: 700, mc: 0.25,
                    recommendedSpeed: { HSS: 300, carbide: 1000, PCD: 2000 },
                    notes: ['Excellent machinability', 'High speeds recommended', 'Sharp tools essential']
                },
                johnsonCook: { A: 324, B: 114, n: 0.42, C: 0.002, m: 1.34 }
            },
            'aluminum_7075_T6': {
                names: ['7075-T6', 'AA7075', 'AlZn5.5MgCu'],
                category: 'wrought_aluminum',
                physical: { density: 2810, elasticModulus: 71.7, thermalConductivity: 130 },
                mechanical: {
                    yieldStrength: 503, tensileStrength: 572,
                    hardness: { value: 150, scale: 'HB' }
                },
                machining: {
                    machinabilityRating: 70, Kc11: 900, mc: 0.25,
                    recommendedSpeed: { HSS: 250, carbide: 800, PCD: 1500 }
                },
                johnsonCook: { A: 520, B: 477, n: 0.52, C: 0.001, m: 1.61 }
            },
            'titanium_Ti6Al4V': {
                names: ['Ti-6Al-4V', 'Grade 5', 'TC4'],
                category: 'titanium_alloy',
                physical: { density: 4430, elasticModulus: 113.8, thermalConductivity: 6.7 },
                mechanical: {
                    yieldStrength: 880, tensileStrength: 950,
                    hardness: { value: 36, scale: 'HRC' }
                },
                machining: {
                    machinabilityRating: 22, Kc11: 1400, mc: 0.23,
                    recommendedSpeed: { HSS: 20, carbide: 60, ceramic: 150 },
                    notes: ['Low thermal conductivity', 'High tool wear', 'Coolant critical', 'Low speeds, high feeds']
                },
                johnsonCook: { A: 1098, B: 1092, n: 0.93, C: 0.014, m: 1.1 }
            },
            'inconel_718': {
                names: ['Inconel 718', 'IN718', 'Alloy 718', 'UNS N07718'],
                category: 'nickel_superalloy',
                physical: { density: 8190, elasticModulus: 211, thermalConductivity: 11.4 },
                mechanical: {
                    yieldStrength: 1100, tensileStrength: 1375,
                    hardness: { value: 40, scale: 'HRC' }
                },
                machining: {
                    machinabilityRating: 12, Kc11: 2800, mc: 0.25,
                    recommendedSpeed: { HSS: 10, carbide: 35, ceramic: 200 },
                    notes: ['Extremely difficult', 'Work hardens severely', 'High heat generation', 'Ceramic at high speed only']
                },
                johnsonCook: { A: 1200, B: 1400, n: 0.65, C: 0.017, m: 1.3 }
            },
            'brass_C360': {
                names: ['C360', 'Free Cutting Brass', 'CuZn36Pb3'],
                category: 'copper_alloy',
                physical: { density: 8500, elasticModulus: 97, thermalConductivity: 115 },
                mechanical: {
                    yieldStrength: 124, tensileStrength: 338,
                    hardness: { value: 78, scale: 'HB' }
                },
                machining: {
                    machinabilityRating: 100, Kc11: 780, mc: 0.25,
                    recommendedSpeed: { HSS: 150, carbide: 400 },
                    notes: ['Benchmark material (100%)', 'Excellent chip control']
                }
            }
        }
    },
    // SECTION 4: TOOL WEAR & COATINGS
    toolScience: {
        // Wear mechanisms
        wearMechanisms: {
            abrasive: {
                description: 'Hard particles scratching tool surface',
                dominantAt: 'Low to moderate speeds',
                materials: ['Cast iron', 'Hardened steel', 'Composites']
            },
            adhesive: {
                description: 'Material transfer and BUE formation',
                dominantAt: 'Low speeds with ductile materials',
                materials: ['Aluminum', 'Stainless steel', 'Titanium']
            },
            diffusion: {
                description: 'Atomic migration at high temperatures',
                dominantAt: 'High speeds (>500°C)',
                materials: ['Titanium', 'Nickel alloys']
            },
            chemical: {
                description: 'Oxidation and chemical reaction',
                dominantAt: 'High temperature with reactive materials',
                materials: ['Titanium (with carbide)']
            },
            fatigue: {
                description: 'Cyclic loading causing cracks',
                dominantAt: 'Interrupted cutting',
                operations: ['Milling', 'Interrupted turning']
            }
        },
        // Coating properties
        coatings: {
            TiN: {
                color: 'Gold',
                hardness: 2300, // HV
                maxTemp: 600,
                frictionCoeff: 0.4,
                applications: ['General purpose', 'Steel', 'Cast iron'],
                thickness: '2-4 μm'
            },
            TiCN: {
                color: 'Gray-violet',
                hardness: 3000,
                maxTemp: 450,
                frictionCoeff: 0.3,
                applications: ['Higher hardness materials', 'Stainless'],
                thickness: '3-5 μm'
            },
            TiAlN: {
                color: 'Dark violet',
                hardness: 3500,
                maxTemp: 800,
                frictionCoeff: 0.35,
                applications: ['High speed machining', 'Dry cutting', 'Steel'],
                thickness: '2-5 μm'
            },
            AlTiN: {
                color: 'Black',
                hardness: 3600,
                maxTemp: 900,
                frictionCoeff: 0.3,
                applications: ['Hardened steel', 'High temp alloys', 'Dry/MQL'],
                thickness: '2-5 μm'
            },
            AlCrN: {
                color: 'Gray',
                hardness: 3200,
                maxTemp: 1100,
                frictionCoeff: 0.35,
                applications: ['Stainless steel', 'Titanium', 'Very high temp'],
                thickness: '2-4 μm'
            },
            DLC: {
                color: 'Black (shiny)',
                hardness: 5000,
                maxTemp: 400,
                frictionCoeff: 0.1,
                applications: ['Aluminum', 'Non-ferrous', 'Plastics'],
                thickness: '1-3 μm'
            },
            diamond: {
                color: 'Gray',
                hardness: 10000,
                maxTemp: 700,
                frictionCoeff: 0.05,
                applications: ['Aluminum', 'Graphite', 'Composites', 'Not for steel'],
                thickness: '10-30 μm'
            }
        },
        // Taylor tool life model
        taylorToolLife: {
            // V × T^n = C (basic form)
            // Extended: V × T^n × f^a × ap^b = C
            constants: {
                // n values (higher = less sensitive to speed)
                HSS: { n: 0.125, typical_C: 100 },
                carbide_uncoated: { n: 0.25, typical_C: 300 },
                carbide_coated: { n: 0.3, typical_C: 400 },
                ceramic: { n: 0.5, typical_C: 800 },
                CBN: { n: 0.5, typical_C: 500 }
            },
            calculate: (V, n, C) => Math.pow(C / V, 1 / n)
        }
    },
    // SECTION 5: CUTTING PARAMETERS
    parameters: {
        // Milling recommendations
        milling: {
            // Feed per tooth by material and operation (mm)
            feedPerTooth: {
                aluminum: { roughing: 0.15, finishing: 0.08, slotting: 0.10 },
                mild_steel: { roughing: 0.10, finishing: 0.05, slotting: 0.08 },
                alloy_steel: { roughing: 0.08, finishing: 0.04, slotting: 0.06 },
                stainless: { roughing: 0.06, finishing: 0.03, slotting: 0.05 },
                titanium: { roughing: 0.08, finishing: 0.04, slotting: 0.06 },
                inconel: { roughing: 0.04, finishing: 0.02, slotting: 0.03 },
                cast_iron: { roughing: 0.12, finishing: 0.06, slotting: 0.10 }
            },
            // Radial engagement factors
            radialEngagement: {
                slotting: 1.0,
                conventionalRoughing: { min: 0.40, typical: 0.65, max: 0.80 },
                hemRoughing: { min: 0.08, typical: 0.10, max: 0.15 },
                finishing: { min: 0.05, typical: 0.15, max: 0.25 }
            },
            // Axial depth factors (× tool diameter)
            axialDepth: {
                roughing: { min: 0.5, typical: 1.0, max: 2.0 },
                hemRoughing: { min: 1.5, typical: 2.0, max: 3.0 },
                finishing: { min: 0.05, typical: 0.15, max: 0.30 }
            },
            // Chip thinning compensation
            chipThinning: {
                // When ae < d/2, increase feed: fz_adjusted = fz × √(d/(2×ae))
                calculate: (baseFeed, toolDia, radialDoc) => {
                    if (radialDoc >= toolDia / 2) return baseFeed;
                    return baseFeed * Math.sqrt(toolDia / (2 * radialDoc));
                }
            }
        },
        // Turning recommendations
        turning: {
            // Feed per revolution by material and operation (mm/rev)
            feedPerRev: {
                aluminum: { roughing: 0.35, finishing: 0.10, threading: 'pitch' },
                mild_steel: { roughing: 0.30, finishing: 0.08, threading: 'pitch' },
                alloy_steel: { roughing: 0.25, finishing: 0.06, threading: 'pitch' },
                stainless: { roughing: 0.20, finishing: 0.05, threading: 'pitch' },
                titanium: { roughing: 0.15, finishing: 0.04, threading: 'pitch' },
                cast_iron: { roughing: 0.35, finishing: 0.10, threading: 'pitch' }
            },
            // Depth of cut recommendations (mm)
            depthOfCut: {
                roughing: { min: 2.0, typical: 4.0, max: 8.0 },
                semifinishing: { min: 0.5, typical: 1.0, max: 2.0 },
                finishing: { min: 0.1, typical: 0.3, max: 0.5 }
            },
            // Surface finish prediction
            surfaceFinish: {
                // Ra = f² / (8 × rε) × 1000 (theoretical, in μm)
                theoretical: (feed, noseRadius) => (feed * feed * 1000) / (8 * noseRadius),
                // Correction factors
                factors: {
                    materialFactor: { aluminum: 0.7, steel: 1.0, stainless: 1.3, cast_iron: 0.9 },
                    toolCondition: { sharp: 1.0, worn: 1.5, damaged: 2.5 }
                }
            }
        }
    },
    // SECTION 6: GEOMETRY STRATEGIES
    geometryStrategies: {
        // Milling geometry types
        millingGeometry: {
            POCKET: {
                rectangular: {
                    roughingStrategy: 'contour_parallel',
                    toolSelection: 'largest_fitting_corner',
                    stockToLeave: { roughing: 0.5, semifinish: 0.1 },
                    notes: ['Mill corners with smaller tool', 'Leave stock for finish pass']
                },
                circular: {
                    roughingStrategy: 'spiral_out',
                    toolSelection: 'less_than_radius',
                    notes: ['Helical entry recommended', 'Constant engagement preferred']
                },
                deep: { // depth > 3× tool diameter
                    roughingStrategy: 'HEM_trochoidal',
                    axialStepdown: 'up_to_2x_diameter',
                    notes: ['Use HEM/HSM strategy', 'Light radial, full axial', 'Consider chip evacuation']
                }
            },
            HOLE: {
                decisionMatrix: {
                    // Diameter ranges and recommended processes
                    rules: [
                        { maxDia: 2, tolerance: '>H9', process: 'drill_only' },
                        { maxDia: 25, tolerance: 'H7-H8', process: 'drill_ream' },
                        { maxDia: 50, tolerance: 'H7', process: 'drill_bore' },
                        { maxDia: null, tolerance: '<H7', process: 'drill_semifinish_bore' }
                    ]
                },
                drilling: {
                    peckCycle: 'required_for_depth_3x_dia',
                    pilotHole: 'recommended_for_dia_over_12mm',
                    spotDrill: 'always_for_position_accuracy'
                }
            },
            SLOT: {
                fullWidth: {
                    strategy: 'plunge_then_feed',
                    speedReduction: 0.7,
                    feedReduction: 0.5,
                    notes: ['Worst case for cutter', 'Consider ramping entry']
                },
                tSlot: {
                    sequence: ['through_slot_first', 't_slot_cutter_second'],
                    notes: ['Multiple passes for T-slot', 'Leave material for clean up']
                }
            },
            THIN_WALL: {
                definition: 'height_to_thickness_ratio_over_10',
                strategy: {
                    approach: 'alternating_sides',
                    axialSteps: 'small_increments',
                    feedReduction: 0.5,
                    speedIncrease: 1.2,
                    notes: ['Machine both sides alternately', 'Use support if possible', 'Climb milling preferred']
                }
            }
        },
        // Operation sequencing
        orderOfOperations: {
            milling: [
                { phase: 1, operation: 'SETUP', description: 'Workholding and datum establishment' },
                { phase: 2, operation: 'FACING', description: 'Reference surfaces first' },
                { phase: 3, operation: 'ROUGHING', description: 'Bulk material removal, largest features first' },
                { phase: 4, operation: 'HOLE_DRILLING', description: 'All holes before profiling' },
                { phase: 5, operation: 'SEMI_FINISHING', description: 'Prepare for finish passes' },
                { phase: 6, operation: 'FINISHING', description: 'Final surfaces, tightest tolerances' },
                { phase: 7, operation: 'CHAMFERS_DEBURR', description: 'Edge treatments last' }
            ],
            turning: [
                { phase: 1, operation: 'FACE', description: 'Establish Z datum' },
                { phase: 2, operation: 'ROUGH_OD', description: 'External roughing' },
                { phase: 3, operation: 'ROUGH_ID', description: 'Internal roughing if applicable' },
                { phase: 4, operation: 'SEMI_FINISH', description: 'Leave stock for finish' },
                { phase: 5, operation: 'GROOVE', description: 'Grooves and undercuts' },
                { phase: 6, operation: 'THREAD', description: 'Threading operations' },
                { phase: 7, operation: 'FINISH', description: 'Final dimensions' },
                { phase: 8, operation: 'PART_OFF', description: 'Separation from bar' }
            ]
        }
    },
    // SECTION 7: DYNAMICS & STABILITY
    dynamics: {
        // Regenerative chatter theory
        chatterTheory: {
            // Critical depth of cut calculation (simplified)
            criticalDepth: (Kc, ks, overlap) => {
                // ap_crit = ks / (2 × Kc × μ)
                // where ks = system stiffness, μ = overlap factor
                return ks / (2 * Kc * overlap);
            },
            // Stability factors
            stabilityFactors: {
                toolOverhang: 'shorter_is_stiffer',
                spindleSpeed: 'sweet_spots_exist',
                helixAngle: 'variable_helix_helps',
                dampingRatio: 'higher_is_better'
            }
        },
        // Tool deflection
        deflection: {
            // δ = (F × L³) / (3 × E × I) for cantilever
            cantilever: (force, length, E, I) => (force * Math.pow(length, 3)) / (3 * E * I),

            // Moment of inertia for solid cylinder: I = π × d⁴ / 64
            momentOfInertia: (diameter) => Math.PI * Math.pow(diameter, 4) / 64,

            // L/D ratio guidance
            ldRatioGuidance: {
                '< 3': { status: 'optimal', feedFactor: 1.0 },
                '3-5': { status: 'acceptable', feedFactor: 0.9 },
                '5-7': { status: 'caution', feedFactor: 0.7 },
                '> 7': { status: 'problematic', feedFactor: 0.5 }
            }
        }
    },
    // SECTION 8: SURFACE INTEGRITY
    surfaceIntegrity: {
        // Ra values by process
        achievableRa: {
            roughMachining: 12.5,
            standardMachining: 6.3,
            fineMachining: 3.2,
            finishMachining: 1.6,
            fineFinishing: 0.8,
            grinding: 0.4,
            polishing: 0.2
        },
        // Process capabilities (mm)
        toleranceCapability: {
            roughing: 0.25,
            standardMilling: 0.05,
            precisionMilling: 0.025,
            drilling: 0.10,
            reaming: 0.025,
            boring: 0.01,
            grinding: 0.005,
            honing: 0.002
        },
        // Subsurface effects
        subsurfaceEffects: {
            whiteLayers: {
                cause: 'Excessive heat (phase transformation)',
                prevention: ['Proper speeds', 'Sharp tools', 'Adequate coolant'],
                criticalMaterials: ['Hardened steel', 'Cast iron']
            },
            residualStress: {
                tensile: { cause: 'High temperatures', effect: 'Reduces fatigue life' },
                compressive: { cause: 'Mechanical deformation', effect: 'Improves fatigue life' }
            },
            workHardening: {
                susceptibleMaterials: ['Austenitic stainless', 'Inconel', 'Titanium'],
                prevention: ['Sharp tools', 'Avoid rubbing', 'Adequate feed']
            }
        }
    },
    // SECTION 9: COOLANT STRATEGIES
    coolant: {
        types: {
            flood: {
                applications: ['General machining', 'Steel', 'Cast iron'],
                advantages: ['Good cooling', 'Chip flushing', 'Low cost'],
                disadvantages: ['Messy', 'Environmental concerns']
            },
            mist: {
                applications: ['Light machining', 'Aluminum'],
                advantages: ['Less mess', 'Better visibility'],
                disadvantages: ['Limited cooling', 'Inhalation risk']
            },
            throughSpindle: {
                applications: ['Deep holes', 'High-speed machining', 'Difficult materials'],
                advantages: ['Direct cooling', 'Excellent chip evacuation'],
                pressureRanges: { standard: '20-40 bar', highPressure: '70-100 bar', ultraHigh: '150+ bar' }
            },
            mql: {
                applications: ['Aluminum', 'Near-dry machining', 'Environmental concerns'],
                advantages: ['Minimal fluid', 'Clean parts', 'Environmental'],
                disadvantages: ['Limited cooling', 'Not for all materials']
            },
            cryogenic: {
                applications: ['Titanium', 'Inconel', 'Difficult materials'],
                types: ['CO2', 'LN2'],
                advantages: ['Excellent cooling', 'Extended tool life'],
                disadvantages: ['Expensive', 'Special equipment']
            }
        },
        materialRecommendations: {
            aluminum: ['Flood', 'MQL', 'Mist'],
            steel: ['Flood', 'TSC for deep holes'],
            stainless: ['Flood with EP additives', 'High-pressure TSC'],
            titanium: ['High-pressure flood', 'Cryogenic'],
            inconel: ['High-pressure flood', 'Cryogenic'],
            cast_iron: ['Dry preferred', 'Mist if needed']
        }
    }
}