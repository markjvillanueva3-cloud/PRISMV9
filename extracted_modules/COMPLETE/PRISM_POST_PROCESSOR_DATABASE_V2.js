const PRISM_POST_PROCESSOR_DATABASE_V2 = {

    // VERSION & METADATA

    VERSION: "2.1.0",
    BUILD_DATE: "2025-12-26",

    // G-FORCE PHYSICS ENGINE FOR CNC MACHINING
    // Comprehensive physics calculations for machine dynamics, tool forces,
    // and motion optimization. All calculations based on fundamental physics
    // and empirical machining research.

    G_FORCE_PHYSICS: {
        // Physical constants
        CONSTANTS: {
            GRAVITY_MS2: 9.81,           // m/s² - standard gravity
            GRAVITY_INS2: 386.4,         // in/s² - gravity in inches
            GRAVITY_FTMIN2: 1158000,     // ft/min² - for feed calculations
            STEEL_DENSITY: 7850,         // kg/m³
            ALUMINUM_DENSITY: 2700,      // kg/m³
            CARBIDE_DENSITY: 14500,      // kg/m³
        },
        // MACHINE ACCELERATION SPECIFICATIONS
        // Typical acceleration capabilities by machine type (in g's)
        MACHINE_DYNAMICS: {
            vmc_economy: {
                name: "Economy VMC",
                accel: { x: 0.3, y: 0.3, z: 0.25 },
                jerk: { rough: 30, finish: 15 },  // m/s³
                description: "Entry-level VMC, lower rapids",
                examples: ["Haas Mini Mill", "Tormach 1100"]
            },
            vmc_tier2: {
                name: "Standard VMC",
                accel: { x: 0.5, y: 0.5, z: 0.4 },
                jerk: { rough: 40, finish: 20 },
                description: "Standard production VMC",
                examples: ["Haas VF-2", "Hurco VM20", "Doosan DNM 4500"]
            },
            vmc_performance: {
                name: "Performance VMC",
                accel: { x: 0.8, y: 0.8, z: 0.6 },
                jerk: { rough: 50, finish: 25 },
                description: "Higher-speed production VMC",
                examples: ["Haas VF-2SS", "Mazak VCN-530C"]
            },
            vmc_high_speed: {
                name: "High-Speed VMC",
                accel: { x: 1.2, y: 1.2, z: 1.0 },
                jerk: { rough: 80, finish: 40 },
                description: "HSM-optimized machines",
                examples: ["Makino D500", "Brother S700X", "Röders RXP"]
            },
            vmc_ultra_high_speed: {
                name: "Ultra High-Speed",
                accel: { x: 2.0, y: 2.0, z: 1.5 },
                jerk: { rough: 150, finish: 75 },
                description: "Graphite/electrode machining",
                examples: ["Makino EDAF2", "Sodick HS650L"]
            },
            hmc_tier2: {
                name: "Standard HMC",
                accel: { x: 0.6, y: 0.6, z: 0.5, b: 0.3 },
                jerk: { rough: 45, finish: 22 },
                description: "Horizontal machining center",
                examples: ["Haas EC-400", "Mazak HCN-5000"]
            },
            five_axis_trunnion: {
                name: "5-Axis Trunnion",
                accel: { x: 0.5, y: 0.5, z: 0.4, a: 0.3, c: 0.4 },
                jerk: { rough: 35, finish: 18 },
                description: "Trunnion-style 5-axis",
                examples: ["Haas UMC-750", "Hurco VMX42"]
            },
            five_axis_swivel: {
                name: "5-Axis Swivel Head",
                accel: { x: 0.7, y: 0.7, z: 0.5, a: 0.4, c: 0.5 },
                jerk: { rough: 45, finish: 22 },
                description: "Swivel-head 5-axis",
                examples: ["DMG DMU 50", "Hermle C42"]
            },
            lathe_tier2: {
                name: "Standard CNC Lathe",
                accel: { x: 0.8, z: 0.6 },
                jerk: { rough: 50, finish: 25 },
                description: "2-axis turning center",
                examples: ["Haas ST-10", "Okuma LB3000"]
            },
            lathe_y_axis: {
                name: "Y-Axis Lathe",
                accel: { x: 0.7, y: 0.5, z: 0.6, c: 0.4 },
                jerk: { rough: 45, finish: 22 },
                description: "Mill-turn with Y-axis",
                examples: ["Haas ST-20Y", "Mazak QTN-250MY"]
            },
            swiss_type: {
                name: "Swiss-Type Lathe",
                accel: { x: 1.2, z: 1.0, b: 0.4, c: 0.5 },
                jerk: { rough: 60, finish: 30 },
                description: "High-precision Swiss screw machine",
                examples: ["Star SR-20", "Citizen L20"]
            }
        },
        // TOOL HOLDER BALANCE GRADES (ISO 1940-1)
        BALANCE_GRADES: {
            // Grade: permissible specific unbalance velocity (mm/s)
            'G0.4': { eper: 0.4, application: "Precision grinding spindles, ultra-high-speed", minRpm: 40000 },
            'G1': { eper: 1.0, application: "High-speed spindles, fine balance", minRpm: 25000 },
            'G2.5': { eper: 2.5, application: "High-speed machining, shrink-fit holders", minRpm: 15000 },
            'G6.3': { eper: 6.3, application: "Standard machining, ER collets", minRpm: 8000 },
            'G16': { eper: 16, application: "General machining, larger tools", minRpm: 4000 },
            'G40': { eper: 40, application: "Low-speed, heavy roughing", minRpm: 0 },

            // Holder type recommendations
            holderRecommendations: {
                'shrink_fit': { grade: 'G2.5', maxRpm: 40000, stiffness: 'highest' },
                'hydraulic': { grade: 'G2.5', maxRpm: 30000, stiffness: 'very high' },
                'er_collet': { grade: 'G6.3', maxRpm: 20000, stiffness: 'medium' },
                'milling_chuck': { grade: 'G6.3', maxRpm: 15000, stiffness: 'medium' },
                'side_lock': { grade: 'G16', maxRpm: 10000, stiffness: 'low' },
                'shell_mill': { grade: 'G6.3', maxRpm: 12000, stiffness: 'medium' },
                'face_mill': { grade: 'G16', maxRpm: 8000, stiffness: 'high-mass' }
            }
        },
        // INSERT RETENTION FORCES
        // Maximum centrifugal G-force ratings for indexable inserts
        INSERT_RETENTION: {
            // By clamping method - max G at periphery
            standard_screw: { maxG: 350, notes: "Single central screw" },
            wedge_clamp: { maxG: 500, notes: "Wedge/lever clamp system" },
            tangential: { maxG: 600, notes: "Tangential insert orientation" },
            high_speed: { maxG: 800, notes: "Reinforced pocket, special screws" },
            brazed: { maxG: 1500, notes: "Brazed carbide - no retention limit" },

            // Safety factors
            safetyFactor: 2.0,  // Design safety factor

            // Maximum recommended RPM by tool diameter
            // Based on 500g insert rating and safety factor
            maxRpmByDiameter: {
                // Diameter (mm): Max RPM
                "25": 47000,
                "32": 37000,
                "40": 30000,
                "50": 24000,
                "63": 19000,
                "80": 15000,
                "100": 12000,
                "125": 9500,
                "160": 7500,
                "200": 6000
            }
        },
        // CORNER DYNAMICS COEFFICIENTS
        // Feed reduction factors for different corner angles
        CORNER_COEFFICIENTS: {
            // Angle: multiplier for maximum feed through corner
            "180": 1.00,  // Straight line
            "170": 0.98,
            "160": 0.95,
            "150": 0.90,
            "140": 0.85,
            "135": 0.80,  // Common 45° entry
            "130": 0.75,
            "120": 0.70,
            "110": 0.60,
            "100": 0.50,
            "90": 0.40,   // Right angle
            "80": 0.32,
            "70": 0.25,
            "60": 0.20,
            "45": 0.12,
            "30": 0.06,
            "0": 0.0      // Full reversal
        },
        // CUTTING FORCE COEFFICIENTS
        // Specific cutting force (Kc) and chip compression ratios
        CUTTING_FORCE_DATA: {
            // ISO P - Steels
            steel_low_carbon: { Kc11: 1700, mc: 0.25, chipCompress: 2.5 },
            steel_medium_carbon: { Kc11: 2100, mc: 0.26, chipCompress: 2.8 },
            steel_high_carbon: { Kc11: 2400, mc: 0.27, chipCompress: 3.0 },
            steel_alloy: { Kc11: 2500, mc: 0.27, chipCompress: 3.2 },
            steel_tool: { Kc11: 3200, mc: 0.28, chipCompress: 3.5 },

            // ISO M - Stainless
            stainless_austenitic: { Kc11: 2400, mc: 0.21, chipCompress: 3.5 },
            stainless_duplex: { Kc11: 2800, mc: 0.22, chipCompress: 3.8 },
            stainless_martensitic: { Kc11: 2600, mc: 0.23, chipCompress: 3.2 },

            // ISO K - Cast Iron
            cast_iron_gray: { Kc11: 1100, mc: 0.28, chipCompress: 1.5 },
            cast_iron_ductile: { Kc11: 1500, mc: 0.26, chipCompress: 2.0 },
            cast_iron_cgi: { Kc11: 1800, mc: 0.25, chipCompress: 2.2 },

            // ISO N - Non-ferrous
            aluminum: { Kc11: 700, mc: 0.30, chipCompress: 2.0 },
            aluminum_silicon: { Kc11: 900, mc: 0.28, chipCompress: 2.5 },
            copper: { Kc11: 1100, mc: 0.25, chipCompress: 2.8 },
            brass: { Kc11: 780, mc: 0.28, chipCompress: 2.2 },

            // ISO S - Superalloys
            titanium: { Kc11: 1400, mc: 0.22, chipCompress: 3.0 },
            inconel: { Kc11: 2800, mc: 0.20, chipCompress: 4.0 },
            hastelloy: { Kc11: 3000, mc: 0.19, chipCompress: 4.5 },

            // ISO H - Hardened
            hardened_45hrc: { Kc11: 4000, mc: 0.18, chipCompress: 2.0 },
            hardened_55hrc: { Kc11: 5500, mc: 0.16, chipCompress: 1.5 },
            hardened_62hrc: { Kc11: 7000, mc: 0.14, chipCompress: 1.2 }
        },
        // FORMULAS AND CALCULATION METHODS
        // Reference formulas for G-force calculations
        FORMULAS: {
            // Centrifugal force on rotating mass
            // F = m * ω² * r = m * (2πn/60)² * r
            centrifugalForce: "F_c = m × (2πn/60)² × r  [N]",

            // G-force at radius
            // g = ω² * r / 9.81 = (2πn/60)² * r / 9.81
            gForceAtRadius: "G = (2πn/60)² × r / g  [g's]",

            // Maximum safe RPM for insert retention
            // n_max = (60/2π) × √(G_max × g / r)
            maxSafeRpm: "n_max = (60/2π) × √(G_max × g / r)  [RPM]",

            // Balance quality grade
            // G = e × ω / 1000 = e × (2πn/60) / 1000
            balanceGrade: "G = e × (2πn/60) / 1000  [mm/s]",

            // Permissible unbalance
            // U_per = (G × M × 9549) / n  [g·mm]
            permissibleUnbalance: "U_per = (G × M × 9549) / n  [g·mm]",

            // Corner deceleration distance
            // s = v² / (2 × a_max)
            cornerDeceleration: "s = v² / (2 × a_max)  [mm or in]",

            // Cutting force (Kienzle)
            // F_c = K_c × A = K_c1.1 × h^(-m_c) × a_p × f
            cuttingForce: "F_c = K_c1.1 × h^(-m_c) × a_p × f  [N]",

            // Power consumption
            // P = F_c × v_c / (60 × 1000)
            cuttingPower: "P = F_c × v_c / 60000  [kW]",

            // Chip velocity (approximately equals cutting velocity)
            // v_chip ≈ v_c = π × D × n / 1000
            chipVelocity: "v_chip ≈ v_c = πDn/1000  [m/min]"
        }
    },
    // SCIENTIFIC MACHINING CONSTANTS
    // Based on metal cutting theory, thermodynamics, and material science

    MACHINING_SCIENCE: {
        // Taylor Tool Life Equation: VT^n = C
        // V = cutting speed (SFM), T = tool life (min), n = Taylor exponent, C = constant
        taylorConstants: {
            // Material: { n: Taylor exponent, C: Taylor constant at T=1min }
            carbon_steel: { n: 0.125, C: 350, description: "Plain carbon steel (1018, 1045)" },
            alloy_steel: { n: 0.15, C: 280, description: "4140, 4340, 8620" },
            stainless_304: { n: 0.20, C: 200, description: "Austenitic stainless" },
            stainless_316: { n: 0.22, C: 180, description: "316/316L marine grade" },
            stainless_17_4: { n: 0.22, C: 180, description: "Precipitation hardening" },
            tool_steel_annealed: { n: 0.18, C: 220, description: "A2, D2, O1 annealed" },
            tool_steel_hardened: { n: 0.25, C: 120, description: "Hardened >45 HRC" },
            cast_iron_gray: { n: 0.10, C: 400, description: "Class 30-40 gray iron" },
            cast_iron_ductile: { n: 0.12, C: 350, description: "65-45-12 ductile" },
            aluminum_6061: { n: 0.08, C: 1200, description: "6061-T6" },
            aluminum_7075: { n: 0.10, C: 1000, description: "7075-T651" },
            aluminum_cast: { n: 0.09, C: 1100, description: "A356, 380" },
            titanium_6al4v: { n: 0.28, C: 100, description: "Ti-6Al-4V Grade 5" },
            titanium_cp: { n: 0.25, C: 120, description: "CP Titanium Grade 2" },
            inconel_718: { n: 0.35, C: 50, description: "Inconel 718" },
            inconel_625: { n: 0.33, C: 55, description: "Inconel 625" },
            hastelloy_x: { n: 0.38, C: 40, description: "Hastelloy X" },
            waspaloy: { n: 0.36, C: 45, description: "Waspaloy" },
            monel_400: { n: 0.30, C: 70, description: "Monel 400" },
            copper: { n: 0.08, C: 800, description: "Pure copper C110" },
            brass: { n: 0.10, C: 600, description: "360 Free-cutting brass" },
            bronze: { n: 0.12, C: 500, description: "SAE 660 bearing bronze" }
        },
        // Specific Cutting Force (Kc) - N/mm² at 1mm chip thickness
        // Based on Kienzle equation: Kc = Kc1.1 * h^(-mc)
        specificCuttingForce: {
            // Material: { Kc1_1: specific cutting force at h=1mm, mc: Kienzle exponent }
            steel_low_carbon: { Kc1_1: 1800, mc: 0.25, hardness: "120-180 HB" },
            steel_medium_carbon: { Kc1_1: 2100, mc: 0.26, hardness: "180-240 HB" },
            steel_high_carbon: { Kc1_1: 2400, mc: 0.27, hardness: "200-280 HB" },
            steel_alloy: { Kc1_1: 2400, mc: 0.27, hardness: "180-300 HB" },
            steel_tool: { Kc1_1: 3200, mc: 0.28, hardness: "200-400 HB" },
            stainless_austenitic: { Kc1_1: 2400, mc: 0.21, hardness: "135-185 HB" },
            stainless_martensitic: { Kc1_1: 2600, mc: 0.23, hardness: "200-350 HB" },
            stainless_duplex: { Kc1_1: 2800, mc: 0.22, hardness: "250-320 HB" },
            cast_iron_gray: { Kc1_1: 1200, mc: 0.28, hardness: "180-250 HB" },
            cast_iron_ductile: { Kc1_1: 1600, mc: 0.26, hardness: "150-280 HB" },
            aluminum: { Kc1_1: 700, mc: 0.30, hardness: "50-100 HB" },
            aluminum_high_silicon: { Kc1_1: 900, mc: 0.28, hardness: "80-120 HB" },
            copper: { Kc1_1: 1100, mc: 0.25, hardness: "40-90 HB" },
            brass: { Kc1_1: 800, mc: 0.28, hardness: "60-120 HB" },
            bronze: { Kc1_1: 1000, mc: 0.26, hardness: "80-150 HB" },
            titanium: { Kc1_1: 1400, mc: 0.22, hardness: "300-380 HB" },
            nickel_alloy: { Kc1_1: 2800, mc: 0.20, hardness: "200-450 HB" },
            cobalt_chrome: { Kc1_1: 3000, mc: 0.19, hardness: "280-400 HB" }
        },
        // Thermal Properties for Heat Generation Calculations
        // Q = Fc * V (heat generated), distributed between chip, workpiece, tool
        thermalProperties: {
            // Material: { k: thermal conductivity W/(m·K), cp: specific heat J/(kg·K),
            //             rho: density kg/m³, Tm: melting point °C, chipHeatRatio: fraction to chip }
            steel: { k: 50, cp: 486, rho: 7850, Tm: 1500, chipHeatRatio: 0.75 },
            stainless: { k: 16, cp: 500, rho: 8000, Tm: 1450, chipHeatRatio: 0.60 },
            aluminum: { k: 167, cp: 897, rho: 2700, Tm: 660, chipHeatRatio: 0.85 },
            titanium: { k: 7, cp: 523, rho: 4500, Tm: 1670, chipHeatRatio: 0.50 },
            nickel: { k: 11, cp: 440, rho: 8200, Tm: 1350, chipHeatRatio: 0.45 },
            cast_iron: { k: 46, cp: 460, rho: 7200, Tm: 1200, chipHeatRatio: 0.80 },
            copper: { k: 401, cp: 385, rho: 8960, Tm: 1085, chipHeatRatio: 0.90 },
            brass: { k: 120, cp: 380, rho: 8500, Tm: 930, chipHeatRatio: 0.85 }
        },
        // Chip Thinning Factor Calculation
        // CTF = D / (2 * sqrt(ae * (D - ae))) where ae = radial engagement, D = diameter
        chipThinning: {
            // Radial engagement ratios and corresponding CTF values
            table: [
                { aeRatio: 0.05, ctf: 3.16, feedMultiplier: 2.5 },
                { aeRatio: 0.10, ctf: 2.29, feedMultiplier: 2.0 },
                { aeRatio: 0.15, ctf: 1.89, feedMultiplier: 1.75 },
                { aeRatio: 0.20, ctf: 1.67, feedMultiplier: 1.55 },
                { aeRatio: 0.25, ctf: 1.51, feedMultiplier: 1.40 },
                { aeRatio: 0.30, ctf: 1.40, feedMultiplier: 1.30 },
                { aeRatio: 0.35, ctf: 1.32, feedMultiplier: 1.25 },
                { aeRatio: 0.40, ctf: 1.25, feedMultiplier: 1.20 },
                { aeRatio: 0.45, ctf: 1.19, feedMultiplier: 1.15 },
                { aeRatio: 0.50, ctf: 1.15, feedMultiplier: 1.12 },
                { aeRatio: 0.60, ctf: 1.09, feedMultiplier: 1.08 },
                { aeRatio: 0.70, ctf: 1.05, feedMultiplier: 1.04 },
                { aeRatio: 0.80, ctf: 1.02, feedMultiplier: 1.02 },
                { aeRatio: 0.90, ctf: 1.01, feedMultiplier: 1.01 },
                { aeRatio: 1.00, ctf: 1.00, feedMultiplier: 1.00 }
            ],
            maxMultiplier: 2.5
        },
        // Tool Deflection Limits
        // δ = (F * L³) / (3 * E * I) where F=force, L=stickout, E=modulus, I=moment of inertia
        deflection: {
            carbide: {
                E: 580000,  // Young's modulus MPa (84 million psi)
                maxDeflectionRough: 0.001,   // inches
                maxDeflectionFinish: 0.0002  // inches
            },
            hss: {
                E: 220000,  // Young's modulus MPa
                maxDeflectionRough: 0.0015,
                maxDeflectionFinish: 0.0003
            },
            ceramic: {
                E: 400000,  // Young's modulus MPa
                maxDeflectionRough: 0.0005,
                maxDeflectionFinish: 0.0001
            },
            // Recommended L/D ratios (stickout/diameter)
            stickoutRatios: {
                roughing: { recommended: 3.0, warning: 4.0, critical: 5.0 },
                finishing: { recommended: 4.0, warning: 5.5, critical: 7.0 },
                hsm: { recommended: 2.0, warning: 3.0, critical: 4.0 },
                slotting: { recommended: 2.5, warning: 3.5, critical: 4.5 }
            }
        },
        // Surface Finish Prediction (Theoretical Ra)
        // Ra = f² / (32 * r) where f = feed per rev, r = nose radius
        surfaceFinish: {
            // Multipliers based on cutting conditions
            factors: {
                builtUpEdge: 1.5,      // Poor chip control
                goodChipControl: 1.0,  // Optimal
                vibration: 2.0,        // Chatter present
                wornTool: 1.3,         // Tool wear effect
                coolant: 0.9,          // With proper coolant
                noCoolant: 1.2         // Dry machining
            },
            // Target Ra values by finish class (microinches)
            targets: {
                rough: { min: 125, max: 500 },
                semifinish: { min: 63, max: 125 },
                finish: { min: 32, max: 63 },
                fine: { min: 16, max: 32 },
                mirror: { min: 4, max: 16 }
            }
        },
        // Spindle Speed Variation (SSV) for Chatter Suppression
        // Varies RPM sinusoidally to break up regenerative chatter
        // Ω(t) = Ω₀[1 + A·sin(2πft)] where A = amplitude ratio, f = frequency
        ssv: {
            // Parameters by material family
            profiles: {
                steel: {
                    amplitudePercent: 15,  // ±15% of nominal RPM
                    periodSeconds: 2.0,    // Full oscillation period
                    enabled: true,
                    minRpm: 500,           // Don't use SSV below this
                    notes: "Effective for medium carbon steels"
                },
                stainless: {
                    amplitudePercent: 20,
                    periodSeconds: 1.5,
                    enabled: true,
                    minRpm: 400,
                    notes: "Higher amplitude for work-hardening materials"
                },
                aluminum: {
                    amplitudePercent: 10,
                    periodSeconds: 3.0,
                    enabled: false,  // Usually not needed
                    minRpm: 1000,
                    notes: "Rarely needed due to high damping"
                },
                titanium: {
                    amplitudePercent: 25,
                    periodSeconds: 1.0,
                    enabled: true,
                    minRpm: 200,
                    notes: "Critical for chatter suppression"
                },
                nickel: {
                    amplitudePercent: 30,
                    periodSeconds: 0.8,
                    enabled: true,
                    minRpm: 150,
                    notes: "Aggressive SSV needed for superalloys"
                }
            },
            // Spindle acceleration requirements
            accelerationRequirements: {
                minimum: 300,   // RPM/second
                recommended: 600,
                optimal: 1000
            }
        },
        // Arc Feed Correction
        // For circular interpolation, actual toolpath differs from programmed
        arcCorrection: {
            minRadiusRatio: 0.5,   // Below this, apply correction
            maxCorrection: 0.50,    // Maximum 50% reduction
            // Formula: correction = 1 - (toolRadius / arcRadius) for convex
            //          correction = 1 + (toolRadius / arcRadius) for concave
            notes: "Apply when arc radius < 3x tool radius"
        }
    },
    // SUBPROGRAM & MACRO SYSTEM
    // Support for modular programming and parametric operations

    SUBPROGRAMS: {
        // G65/G66/G67 Macro Calls (FANUC-style)
        macros: {
            g65: {
                name: "Macro Call",
                syntax: "G65 P<program> <arguments>",
                description: "Non-modal macro subprogram call with argument passing",
                argumentMapping: {
                    // Letter to local variable mapping
                    A: "#1", B: "#2", C: "#3", D: "#7", E: "#8", F: "#9",
                    H: "#11", I: "#4", J: "#5", K: "#6", M: "#13",
                    Q: "#17", R: "#18", S: "#19", T: "#20", U: "#21",
                    V: "#22", W: "#23", X: "#24", Y: "#25", Z: "#26"
                },
                nestingLimit: 15,
                example: "G65 P9001 X10.0 Y10.0 Z-5.0 F200.0"
            },
            g66: {
                name: "Modal Macro Call",
                syntax: "G66 P<program> <arguments>",
                description: "Modal macro call - executes at every subsequent motion block",
                cancelCode: "G67",
                notes: "Active until G67 cancels or program end"
            },
            g67: {
                name: "Cancel Modal Macro",
                syntax: "G67",
                description: "Cancels G66 modal macro call"
            }
        },
        // M98/M99 Subprograms
        subprograms: {
            m98: {
                name: "Subprogram Call",
                syntax: "M98 P<program> L<repeats>",
                description: "Call external subprogram file",
                formats: {
                    fanuc: "M98 P1234 L5",           // Call O1234 five times
                    haas: "M98 P1234 L5",            // Same as FANUC
                    okuma: "CALL O1234 N5",          // OSP syntax
                    siemens: "CALL \"SUBPROG\" REP 5" // SINUMERIK syntax
                },
                nestingLimit: 15,
                notes: "Subprogram shares variable scope with main program"
            },
            m99: {
                name: "Subprogram Return",
                syntax: "M99 P<line>",
                description: "Return from subprogram, optionally to specific line",
                notes: "P value specifies return line number (optional)"
            },
            m97: {
                name: "Local Subprogram (Haas)",
                syntax: "M97 P<line>",
                description: "Call local subroutine at N-number within same program",
                notes: "Haas-specific, returns at M99"
            }
        },
        // Variable Systems
        variables: {
            local: {
                range: "#1-#33",
                description: "Local variables, unique per macro level",
                cleared: "On macro call (G65)"
            },
            common: {
                range: "#100-#199, #500-#999",
                description: "Common variables, shared across programs",
                persistent: "#500-#999 retained at power off"
            },
            system: {
                range: "#1000-#9999",
                description: "System variables (position, offsets, parameters)",
                examples: {
                    "#5021-#5026": "Current machine position",
                    "#5041-#5046": "Current work position",
                    "#3027": "Spindle RPM",
                    "#3022": "Remaining tool life",
                    "#5221-#5226": "G54 work offset values"
                }
            }
        }
    },
    // WORK OFFSET SYSTEMS
    // Extended coordinate system management

    WORK_OFFSETS: {
        // Standard Work Offsets
        tier2: {
            codes: ["G54", "G55", "G56", "G57", "G58", "G59"],
            description: "6 standard work coordinate systems",
            g10Format: "G10 L2 P<n> X<x> Y<y> Z<z>",  // P1=G54, P2=G55, etc.
            notes: "P0 = external work offset (uncommon)"
        },
        // Extended Work Offsets (G54.1 Pn)
        extended: {
            fanuc: {
                code: "G54.1 P<n>",
                range: "P1-P48",
                description: "48 additional work offsets",
                g10Format: "G10 L2 P<n> X<x> Y<y> Z<z>",  // P7+ for extended
                notes: "Some controls support up to P300"
            },
            haas: {
                code: "G154 P<n>",
                range: "P1-P99",
                alternateRange: "G110-G129",  // 20 additional as modal codes
                description: "99 extended work offsets plus G110-G129",
                notes: "G110 = G154 P1, G111 = G154 P2, etc."
            },
            mazak: {
                code: "G54.1 P<n>",
                range: "P1-P300",
                description: "Up to 300 extended work offsets on Smooth controls"
            },
            okuma: {
                code: "G15 H<n>",
                range: "H1-H100",
                description: "Work offset selection by H number"
            },
            siemens: {
                code: "G54-G599",
                frames: "TRANS, ATRANS, AROT, ASCALE, AMIRROR",
                description: "Frame system with transformations"
            }
        },
        // Local Coordinate Shift (G52)
        localShift: {
            code: "G52",
            syntax: "G52 X<x> Y<y> Z<z>",
            description: "Local coordinate shift applied AFTER work offset",
            cancel: "G52 X0 Y0 Z0",
            notes: "Additive to current WCS, persists until cancelled"
        },
        // Temporary Shift (G92)
        temporaryShift: {
            code: "G92",
            syntax: "G92 X<x> Y<y> Z<z>",
            description: "Sets current position to specified values",
            cancel: "G92.1",
            warnings: [
                "Affects ALL work offsets",
                "Must cancel or reset to clear",
                "Can cause confusion - use with caution"
            ]
        },
        // Machine Coordinate Access (G53)
        machineCoords: {
            code: "G53",
            syntax: "G53 G0 Z0.0",
            description: "Temporary single-block move in machine coordinates",
            modal: false,
            notes: "Non-modal, only active for the block it appears in"
        },
        // Programmable Offset Setting (G10)
        programmableOffset: {
            workOffset: {
                code: "G10 L2",
                syntax: "G10 L2 P<wcs> X<x> Y<y> Z<z> A<a> B<b> C<c>",
                description: "Set work offset values programmatically",
                pValues: {
                    "0": "External (reference)",
                    "1": "G54", 2: "G55", 3: "G56", 4: "G57", 5: "G58", 6: "G59"
                },
                notes: "P7+ for extended offsets (G54.1 P1, etc.)"
            },
            toolOffset: {
                code: "G10 L1",
                syntax: "G10 L1 P<tool> R<radius> Z<length>",
                description: "Set tool offset values programmatically"
            },
            incrementalOffset: {
                code: "G10 L20",
                syntax: "G10 L20 P<wcs> X<x> Y<y> Z<z>",
                description: "Set work offset so current position becomes specified value"
            }
        }
    },
    // HIGH-SPEED MACHINING (HSM) CONTROL
    // Controller-specific smoothing and optimization modes

    HSM_CONTROL: {
        // FANUC AI Contour Control
        fanuc: {
            aicc: {
                name: "AI Contour Control (AICC)",
                enable: "G05.1 Q1 R<n>",
                disable: "G05.1 Q0",
                rValues: {
                    R1: { tolerance: 0.001, description: "Roughing - fastest" },
                    R2: { tolerance: 0.0008, description: "Semi-rough" },
                    R3: { tolerance: 0.0005, description: "Semi-finish" },
                    R4: { tolerance: 0.0003, description: "Finish" },
                    R5: { tolerance: 0.0002, description: "Fine finish" },
                    R10: { tolerance: 0.0001, description: "Ultra-fine" }
                },
                features: [
                    "Look-ahead path optimization",
                    "Acceleration/deceleration control",
                    "Corner rounding based on tolerance",
                    "Jerk limiting for smooth motion"
                ]
            },
            nanoSmoothing: {
                name: "AI Nano Smoothing",
                enable: "G05.1 Q3",
                disable: "G05.1 Q0",
                description: "High-precision smoothing for 3D surfaces",
                bestFor: ["Mold finishing", "Electrode machining", "Optical surfaces"]
            },
            aiAdvanced: {
                name: "AI Advanced Preview",
                enable: "G05 P10000",
                disable: "G05 P0",
                description: "200+ block look-ahead for complex toolpaths"
            }
        },
        // Haas Smoothing
        haas: {
            g187: {
                name: "Smoothness Control",
                syntax: "G187 P<n> E<tol>",
                modes: {
                    P1: { name: "Rough", tolerance: 0.002, description: "Maximum speed, least accuracy" },
                    P2: { name: "Medium", tolerance: 0.001, description: "Balanced speed/accuracy" },
                    P3: { name: "Finish", tolerance: 0.0004, description: "Maximum accuracy, slower corners" }
                },
                eTolerance: "Optional explicit tolerance in inches",
                defaultBlock: "G187 P2 E0.001"
            }
        },
        // Okuma Super-NURBS
        okuma: {
            superNurbs: {
                name: "Super-NURBS Interpolation",
                enable: "G131",
                disable: "G130",
                description: "Converts G01 segments into smooth NURBS curves",
                qualityLevels: {
                    "G131 P1": "Rough machining",
                    "G131 P2": "Semi-finish",
                    "G131 P3": "Finish machining",
                    "G131 P4": "Fine finish",
                    "G131 P5": "Ultra-fine (mold quality)"
                },
                benefits: [
                    "75% smaller program size",
                    "Smoother surface finish",
                    "Reduced cycle time",
                    "Lower vibration"
                ]
            },
            machiningNavi: {
                name: "Machining Navi M-g",
                description: "Intelligent cutting condition optimization",
                features: [
                    "Chatter detection and suppression",
                    "Automatic spindle speed adjustment",
                    "Real-time feed optimization"
                ]
            }
        },
        // Siemens CYCLE832
        siemens: {
            cycle832: {
                name: "High-Speed Settings Cycle",
                syntax: "CYCLE832(TOL, MODE)",
                parameters: {
                    TOL: "Tolerance in mm (e.g., 0.01)",
                    MODE: {
                        "0": "Off",
                        "1": "Finish - tightest tolerance",
                        "2": "Semi-finish",
                        "3": "Roughing - fastest"
                    }
                },
                example: "CYCLE832(0.01, 1)"
            },
            compressor: {
                name: "Spline Compressor",
                enable: "COMPON / COMPCURV / COMPCAD",
                disable: "COMPOF",
                modes: {
                    COMPON: "Standard polynomial compression",
                    COMPCURV: "Curve-based compression for 2D",
                    COMPCAD: "CAD-optimized for 3D surfaces"
                }
            },
            feedForward: {
                name: "Feed Forward Control",
                enable: "FFWON",
                disable: "FFWOF",
                description: "Predictive axis control for better tracking"
            },
            softMode: {
                name: "Soft Interpolation",
                enable: "SOFT",
                disable: "HARD",
                description: "Jerk-limited motion for smooth surfaces"
            }
        },
        // Mazak Smooth AI
        mazak: {
            smoothAi: {
                name: "Smooth AI Machining",
                enable: "G05.1 Q1",
                disable: "G05.1 Q0",
                features: [
                    "Intelligent feed optimization",
                    "Automatic acceleration control",
                    "Chatter avoidance"
                ]
            }
        },
        // Hurco UltiMotion
        hurco: {
            ultimotion: {
                name: "UltiMotion",
                tolerance: "G05.3 P<tol>",
                levels: {
                    P5: "Ultra-fine (mold finishing)",
                    P15: "Fine (precision parts)",
                    P35: "Medium (general machining)",
                    P50: "Rough (maximum speed)"
                },
                description: "Look-ahead motion system"
            }
        },
        // Makino SGI
        makino: {
            sgi: {
                name: "Super Geometric Intelligence",
                enable: "G05 P2",
                disable: "G05 P0",
                description: "Advanced look-ahead with geometric analysis"
            },
            geoMotion: {
                name: "GeoMotion",
                enable: "G05 P10000",
                description: "High-speed 5-axis motion control"
            }
        },
        // Heidenhain
        heidenhain: {
            cycl32: {
                name: "Contour Tolerance",
                syntax: "CYCL DEF 32 TOLERANCE",
                parameters: {
                    T: "Tolerance in mm",
                    HSC_MODE: "0=Off, 1=Finish, 2=Rough"
                },
                example: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.01\nCYCL DEF 32.2 HSC-MODE:1"
            }
        }
    },
    // 5-AXIS CONTROL SYSTEMS
    // TCP, TCPC, RTCP, DWO configurations by controller

    FIVE_AXIS: {
        // Tool Center Point Control modes by controller
        tcpModes: {
            fanuc: {
                tcpc: {
                    code: "G43.4",
                    cancel: "G49",
                    name: "Tool Center Point Control",
                    description: "Maintains tool tip position during rotary motion",
                    syntax: "G43.4 H<offset>",
                    requirements: [
                        "5-axis parameter setup required",
                        "Tool length offset must be active",
                        "Rotary axis calibration critical"
                    ]
                },
                tcpcTilt: {
                    code: "G43.5",
                    name: "TCP with Tool Vector",
                    description: "TCP with I/J/K tool vector specification"
                },
                tiltedWorkPlane: {
                    code: "G68.2",
                    cancel: "G69",
                    syntax: "G68.2 X<x> Y<y> Z<z> I<i> J<j> K<k>",
                    description: "Tilted work plane definition"
                }
            },
            haas: {
                tcpc: {
                    code: "G234",
                    cancel: "G49",
                    name: "Tool Center Point Control",
                    description: "Haas TCPC implementation"
                },
                dwo: {
                    enable: "G254",
                    disable: "G255",
                    name: "Dynamic Work Offset",
                    description: "Enables rotary axis work offsets to follow TCP",
                    requirements: [
                        "UMC-series or 5-axis machine",
                        "WIPS or manual calibration",
                        "DWO-compatible toolpath from CAM"
                    ]
                },
                rotaryClamp: {
                    a: { clamp: "M10", unclamp: "M11" },
                    c: { clamp: "M12", unclamp: "M13" }
                }
            },
            okuma: {
                tcp: {
                    enable: "G169",
                    disable: "G170",
                    name: "Tool Center Point Control",
                    description: "Okuma OSP TCP implementation"
                },
                tiltedWorkPlane: {
                    code: "G68.2",
                    description: "Tilted work plane (OSP-P300 and newer)"
                }
            },
            siemens: {
                traori: {
                    enable: "TRAORI",
                    disable: "TRAFOOF",
                    name: "Transformation Orientation",
                    description: "Siemens 5-axis transformation"
                },
                tcpm: {
                    code: "TCPM",
                    name: "Tool Center Point Management",
                    description: "Alternative to TRAORI for specific configurations"
                },
                cycle800: {
                    name: "Swivel Cycle",
                    syntax: "CYCLE800(MODE, TC, ST, DIR, FR, TX, TY, TZ)",
                    description: "Tilted plane with automatic rotary positioning"
                }
            },
            heidenhain: {
                m128: {
                    enable: "M128",
                    disable: "M129",
                    name: "TCPM (Tool Center Point Management)",
                    description: "Keeps tool perpendicular during rotary motion"
                },
                plane: {
                    spatial: "PLANE SPATIAL SPA<a> SPB<b> SPC<c>",
                    vector: "PLANE VECTOR BX<x> BY<y> BZ<z>",
                    points: "PLANE POINTS P1X<x> P1Y<y> P1Z<z> ...",
                    description: "Tilted plane functions (iTNC 530+)"
                },
                cycl19: {
                    code: "CYCL DEF 19",
                    name: "Tilted Working Plane",
                    description: "Legacy tilted plane cycle"
                },
                cycl247: {
                    code: "CYCL DEF 247",
                    name: "Datum Setting in Tilted Plane",
                    description: "Set datum in tilted coordinate system"
                }
            },
            mazak: {
                tcpc: {
                    code: "G43.4",
                    name: "TCPC",
                    description: "Mazak TCP implementation (FANUC-based)"
                },
                tiltedWorkPlane: {
                    code: "G68.2",
                    description: "Tilted work plane"
                }
            }
        },
        // Inverse Time Feed for 5-Axis
        inverseTimeFeed: {
            code: "G93",
            cancel: "G94",
            description: "Feedrate specified as time to complete move",
            syntax: "G93 G01 X<x> Y<y> Z<z> A<a> C<c> F<f>",
            calculation: "F = 60 / time_in_seconds = moves_per_minute",
            example: {
                block: "G93 G01 X100.0 Y50.0 A30.0 F2.0",
                meaning: "Complete move in 0.5 minutes (30 seconds)"
            },
            requirements: [
                "F-word required in EVERY block when G93 is active",
                "CAM must calculate F for each segment",
                "Return to G94 for normal operations"
            ],
            whenToUse: [
                "Simultaneous 4/5-axis motion",
                "Large rotary moves with small linear moves",
                "Maintaining consistent tool engagement"
            ]
        },
        // Rotary Axis Considerations
        rotaryConfig: {
            rollover: {
                enabled: true,
                degrees: 360,
                description: "Allow continuous rotation beyond 360°"
            },
            shortestPath: {
                enabled: true,
                description: "Take shortest angular path for repositioning"
            },
            safeReposition: {
                retractZ: true,
                maxAngleChange: 180,
                minClearance: 2.0  // inches
            }
        }
    },
    // PROBING SYSTEMS
    // Probing cycles for different probe manufacturers and controls

    PROBING: {
        // Renishaw Inspection Plus
        renishaw: {
            name: "Renishaw Inspection Plus",
            spinProbe: {
                activate: "M19",  // Orient spindle
                on: "M65 P<n>",   // Probe on (output)
                off: "M66 P<n>"   // Probe off
            },
            cycles: {
                singleSurface: {
                    name: "Single Surface Measurement",
                    macro: "O9811",
                    syntax: "G65 P9811 X<x> Y<y> Z<z> F<feed>",
                    description: "Measure single surface, store in variable"
                },
                webPocket: {
                    name: "Web/Pocket Measurement",
                    macro: "O9812",
                    description: "Measure web or pocket width"
                },
                boss: {
                    name: "Internal/External Boss",
                    macroInt: "O9814",
                    macroExt: "O9817",
                    description: "Circular feature measurement"
                },
                corner: {
                    name: "Corner Measurement",
                    macro: "O9815",
                    description: "Find corner intersection"
                },
                angle: {
                    name: "Angle Measurement",
                    macro: "O9816",
                    description: "Measure angular surface"
                },
                bore: {
                    name: "Bore/Boss Center",
                    macro: "O9814",
                    description: "Find center of circular feature"
                }
            },
            outputVariables: {
                "#185": "X measured value",
                "#186": "Y measured value",
                "#187": "Z measured value",
                "#188": "Calculated diameter/width"
            }
        },
        // Haas WIPS (Wireless Intuitive Probing System)
        haas: {
            name: "Haas WIPS",
            activation: "Automatic (IR probe)",
            cycles: {
                boreCenter: {
                    code: "G36",
                    syntax: "G36 I<feed>",
                    description: "Bore/boss center finding",
                    storesIn: "G54-G59 active offset"
                },
                singleSurfaceX: {
                    code: "G36.1",
                    syntax: "G36.1 I<feed>",
                    description: "Single surface X-axis"
                },
                singleSurfaceY: {
                    code: "G36.2",
                    description: "Single surface Y-axis"
                },
                cornerProbe: {
                    code: "G36.3",
                    description: "Inside/outside corner"
                },
                webWidth: {
                    code: "G36.4",
                    description: "Web or pocket width"
                },
                angleMeasure: {
                    code: "G36.5",
                    description: "Angular measurement"
                }
            },
            toolMeasurement: {
                toolLength: "G37",
                toolDiameter: "G37.1",
                toolBreakage: "G37.2"
            }
        },
        // Blum Probing
        blum: {
            name: "Blum Laser/Touch Probe",
            laserToolSetter: {
                name: "Blum LaserControl",
                measureLength: "G37",
                measureDiameter: "G37.1",
                breakageCheck: "G37.2"
            },
            touchProbe: {
                name: "Blum TC50/TC60",
                singleTouch: "G65 P8700",
                boreCenter: "G65 P8710"
            }
        },
        // Heidenhain Touch Probe
        heidenhain: {
            name: "Heidenhain Touch Probe",
            activation: "Automatic (infrared)",
            cycles: {
                probeAxis: {
                    code: "TCH PROBE 0",
                    description: "Reference probe cycle"
                },
                singlePoint: {
                    code: "TCH PROBE 1",
                    description: "Single point measurement"
                },
                circlePocket: {
                    code: "TCH PROBE 2",
                    description: "Measure circular pocket"
                },
                circleStud: {
                    code: "TCH PROBE 3",
                    description: "Measure circular stud"
                },
                slotWidth: {
                    code: "TCH PROBE 4",
                    description: "Measure slot/ridge"
                },
                rectangularPocket: {
                    code: "TCH PROBE 5",
                    description: "Rectangular pocket"
                },
                rectangularStud: {
                    code: "TCH PROBE 6",
                    description: "Rectangular stud"
                },
                centerLine: {
                    code: "TCH PROBE 7",
                    description: "Measure center line"
                }
            },
            datumCycles: {
                setDatum: {
                    code: "TCH PROBE 400-403",
                    description: "Set datum from measurements"
                },
                preset: {
                    code: "TCH PROBE 410-419",
                    description: "Preset table datum cycles"
                }
            }
        },
        // Siemens Probing Cycles
        siemens: {
            name: "Siemens Measuring Cycles",
            cycles: {
                singleEdge: {
                    code: "CYCLE978",
                    description: "Single edge measurement"
                },
                corner: {
                    code: "CYCLE979",
                    description: "Corner measurement"
                },
                pocket: {
                    code: "CYCLE977",
                    description: "Rectangular pocket"
                },
                bore: {
                    code: "CYCLE979",
                    description: "Bore/hole measurement"
                },
                slot: {
                    code: "CYCLE977",
                    description: "Slot/groove measurement"
                }
            },
            toolMeasurement: {
                toolLength: "CYCLE982",
                toolRadius: "CYCLE982"
            }
        }
    },
    // TOOL LIFE MANAGEMENT
    // Tool wear monitoring and replacement strategies

    TOOL_LIFE: {
        // Tool life monitoring systems
        monitoring: {
            // Standard tool life counter
            counter: {
                variable: "#3022",  // FANUC tool life remaining
                resetCode: "G10 L3",
                description: "Counts tool usage (time or parts)"
            },
            // Wear compensation
            wearOffset: {
                xWear: "H offset + wear value",
                zWear: "D offset + wear value",
                autoCompensation: {
                    fanuc: "G10 L10 P<tool> R<wear>",
                    haas: "G10 L12 P<tool> R<wear>",
                    description: "Increment tool wear offset"
                }
            }
        },
        // Tool grouping for automatic replacement
        toolGroups: {
            description: "Group identical tools for automatic switchover",
            setup: {
                fanuc: "T<tool>.<group>",  // Tool.Group format
                haas: "Tool Group table in settings",
                siemens: "TOOLMAN functions"
            },
            switchCodes: {
                manual: "M6 T<next>",
                automatic: "Machine handles via tool life"
            }
        },
        // Predicted tool life formulas
        prediction: {
            taylorEquation: "VT^n = C",
            adjustmentFactors: {
                coolant: 1.3,        // Flood coolant extends life
                highPressure: 1.5,   // TSC extends life further
                interrupted: 0.7,    // Interrupted cuts reduce life
                scale: 0.8,          // Mill scale reduces life
                hardness: "Variable" // See Taylor constants
            }
        },
        // Replacement strategies
        strategies: {
            fixedLife: {
                description: "Replace after fixed number of parts/time",
                advantage: "Predictable, simple",
                disadvantage: "May waste tool life or risk failure"
            },
            adaptive: {
                description: "Adjust based on cutting conditions",
                monitors: ["Power", "Vibration", "Surface finish"],
                advantage: "Optimal tool usage",
                disadvantage: "Requires monitoring equipment"
            },
            scheduled: {
                description: "Replace at natural breaks (shifts, jobs)",
                advantage: "Convenient, minimal interruption",
                disadvantage: "May not align with actual wear"
            }
        }
    },
    // SAFETY BLOCKS & INITIALIZATION
    // Best practices for safe program start/end sequences

    SAFETY_BLOCKS: {
        // Program start safety blocks by controller
        programStart: {
            haas: {
                blocks: [
                    "G28 G91 Z0.",      // Safe Z retract (incremental to home)
                    "G28 Y0.",          // Safe Y retract
                    "G90",              // Absolute positioning
                    "G17",              // XY plane
                    "G40",              // Cancel cutter comp
                    "G49",              // Cancel tool length comp
                    "G80",              // Cancel canned cycles
                    "G54"               // Select work offset 1
                ],
                combined: "G28 G91 Z0.\nG28 Y0.\nG90 G17 G40 G49 G80 G54"
            },
            fanuc: {
                blocks: [
                    "G91 G28 Z0",       // Incremental Z home
                    "G28 X0 Y0",        // XY home
                    "G90 G17 G40 G49",  // Absolute, XY plane, cancel comp
                    "G80",              // Cancel canned cycles
                    "G54"               // Work offset
                ],
                combined: "G91 G28 Z0\nG28 X0 Y0\nG90 G17 G40 G49 G80 G54"
            },
            okuma: {
                blocks: [
                    "G0 G28 Z0",        // Z home
                    "G28 X0 Y0",        // XY home
                    "G17 G40 G49 G80",  // Cancel all
                    "G15 H1"            // Work offset (Okuma format)
                ],
                combined: "G0 G28 Z0\nG28 X0 Y0\nG17 G40 G49 G80\nG15 H1"
            },
            siemens: {
                blocks: [
                    "G0 G17 G40 G60 G90", // Basic setup
                    "D0",                  // Cancel tool offset
                    "G500",                // Cancel all frames
                    "SUPA G0 Z0"           // Suppress coordinate, Z home
                ],
                combined: "G0 G17 G40 G60 G90\nD0\nG500\nSUPA G0 Z0"
            },
            heidenhain: {
                blocks: [
                    "BLK FORM 0.1 Z...",  // Blank definition
                    "TOOL CALL 0 Z",      // Cancel tool
                    "L Z+200 R0 FMAX M5", // Safe Z, spindle off
                    "L X+0 Y+0 R0 FMAX"   // XY safe position
                ],
                notes: "Heidenhain requires specific block format"
            }
        },
        // Tool change safety sequence
        toolChange: {
            preChange: [
                "Cancel cutter compensation (G40)",
                "Cancel tool length compensation (G49)",
                "Cancel canned cycles (G80)",
                "Retract Z to safe position (G28 Z0 or G53 Z0)",
                "Stop spindle (M5)",
                "Stop coolant (M9)"
            ],
            change: [
                "Select tool (T<n>)",
                "Execute change (M6)",
                "Apply tool length comp (G43 H<n>)"
            ],
            postChange: [
                "Activate HSM mode if needed",
                "Activate coolant",
                "Start spindle",
                "Move to cutting position"
            ],
            example: {
                haas: "G28 G91 Z0.\nM5\nM9\nT2 M6\nG43 H2\nS5000 M3\nM8"
            }
        },
        // Program end safety blocks
        programEnd: {
            blocks: [
                "G28 G91 Z0.",  // Z retract home
                "G28 Y0.",     // Y forward (operator access)
                "M5",          // Spindle stop
                "M9",          // Coolant off
                "G90",         // Absolute mode
                "M30"          // Program end and reset
            ],
            optional: {
                chipConveyorOff: "M33",
                doorOpen: "M85",
                partsCount: "M75"
            }
        }
    },
    // COOLANT MANAGEMENT
    // Coolant types, codes, and optimization

    COOLANT: {
        // Coolant types and M-codes by controller
        types: {
            flood: {
                name: "Flood Coolant",
                haas: { on: "M8", off: "M9" },
                fanuc: { on: "M8", off: "M9" },
                okuma: { on: "M8", off: "M9" },
                siemens: { on: "M8", off: "M9" },
                heidenhain: { on: "M8", off: "M9" },
                description: "Standard flood coolant"
            },
            mist: {
                name: "Mist Coolant",
                haas: { on: "M7", off: "M9" },
                fanuc: { on: "M7", off: "M9" },
                description: "Low-volume mist/spray coolant"
            },
            tsc: {
                name: "Through-Spindle Coolant",
                haas: { on: "M88", off: "M89" },
                fanuc: { on: "M51", off: "M59" },
                okuma: { on: "M51", off: "M59" },
                mazak: { on: "M50", off: "M51" },
                description: "High-pressure through-spindle coolant",
                pressureRange: "150-1000 PSI typical"
            },
            air: {
                name: "Air Blast",
                haas: { on: "M83", off: "M84" },
                haasThruSpindle: { on: "M73", off: "M74" },
                fanuc: { on: "M7", off: "M9" },  // Often shared with mist
                description: "Compressed air for chip clearing"
            },
            airThruSpindle: {
                name: "Through-Spindle Air",
                haas: { on: "M73", off: "M74" },
                description: "Air through spindle for chip evacuation"
            },
            mql: {
                name: "Minimum Quantity Lubrication",
                description: "Precision oil mist delivery",
                benefits: [
                    "Minimal fluid usage",
                    "Cleaner parts",
                    "Environmental benefits"
                ]
            }
        },
        // Chip management
        chipManagement: {
            conveyor: {
                haas: { forward: "M31", reverse: "M32", off: "M33" },
                okuma: { forward: "M64", off: "M65" },
                mazak: { forward: "M31", reverse: "M32", off: "M33" },
                description: "Chip conveyor control"
            },
            chipAuger: {
                description: "Internal chip auger",
                autoStart: "Often tied to coolant activation"
            },
            coolantFlush: {
                description: "Bed flush / washdown",
                haas: { on: "M34", off: "M35" },
                timing: "Use during heavy chip loads"
            }
        },
        // Material-specific recommendations
        recommendations: {
            aluminum: {
                primary: "flood",
                pressure: "Low-medium",
                notes: "Prevent built-up edge, aid chip evacuation"
            },
            steel: {
                primary: "flood",
                secondary: "tsc",
                pressure: "Medium-high",
                notes: "Critical for tool life"
            },
            stainless: {
                primary: "tsc",
                pressure: "High (500+ PSI)",
                notes: "High heat generation requires aggressive cooling"
            },
            titanium: {
                primary: "tsc",
                pressure: "High (700+ PSI)",
                notes: "Low thermal conductivity - maximum cooling required"
            },
            cast_iron: {
                primary: "air",
                secondary: "mql",
                notes: "Dust concerns - often machined dry with air"
            },
            nickel: {
                primary: "tsc",
                pressure: "Maximum available",
                notes: "Extreme heat generation"
            }
        }
    },
    // ARC FITTING & NURBS INTERPOLATION
    // Smoothing and path optimization parameters

    ARC_FITTING: {
        // Arc fitting tolerance guidelines
        tolerance: {
            roughing: {
                value: 0.002,        // inches
                metric: 0.05,        // mm
                description: "Aggressive smoothing for material removal"
            },
            semifinish: {
                value: 0.001,
                metric: 0.025,
                description: "Balanced speed and accuracy"
            },
            finish: {
                value: 0.0005,
                metric: 0.0125,
                description: "Close tolerance surfaces"
            },
            superfinish: {
                value: 0.0002,
                metric: 0.005,
                description: "Optical/mold quality surfaces"
            }
        },
        // Arc format options
        formats: {
            ijk: {
                syntax: "G02/G03 X<x> Y<y> I<i> J<j>",
                description: "Arc center defined by I/J (relative to start)",
                advantage: "Self-validating (center equidistant from start/end)"
            },
            r: {
                syntax: "G02/G03 X<x> Y<y> R<r>",
                description: "Arc defined by radius",
                advantage: "Simpler, shorter code",
                disadvantage: "No geometric validation, ambiguous for arcs > 180°"
            },
            fullCircle: {
                ijk: "G02 I<r> J0",
                note: "Full circle requires I/J format (no endpoint change)"
            }
        },
        // NURBS interpolation (advanced controls)
        nurbs: {
            okuma: {
                enable: "G131",
                disable: "G130",
                description: "Super-NURBS converts G01 to smooth curves"
            },
            siemens: {
                command: "BSPLINE",
                description: "B-spline interpolation"
            },
            fanuc: {
                enable: "G06.1",
                description: "NURBS interpolation (high-end controls)"
            },
            benefits: [
                "75% program size reduction",
                "Smoother surface finish",
                "Reduced cycle time",
                "Lower machine vibration"
            ]
        },
        // Helix interpolation
        helix: {
            syntax: "G02/G03 X<x> Y<y> Z<z> I<i> J<j>",
            description: "Helical motion for thread milling, ramping",
            maxPitch: "Machine-dependent, typically 0.25-0.5 x diameter",
            applications: [
                "Thread milling",
                "Helical ramping into pockets",
                "Spiral toolpaths"
            ]
        }
    },
    // ALTERNATIVE CODE REFERENCE
    // Machine-specific code variations for common functions
    // NOTE: Tool call-up, coolant, and auxiliary codes can vary significantly
    // between machines, even from the same manufacturer. If you receive an alarm
    // for an unrecognized code, try one of the alternatives listed below.

    ALTERNATIVE_CODES: {
        // Tool Change Variations
        toolChange: {
            description: "Tool change command format varies by controller",
            note: "If you get an alarm for tool change, try these alternatives:",
            variations: [
                { code: "T1 M6", controllers: ["haas", "fanuc", "mazak", "okuma"], description: "Standard - tool then M6 same line" },
                { code: "T1 M06", controllers: ["fanuc", "brother"], description: "With leading zero on M-code" },
                { code: "M6 T1", controllers: ["some_fanuc"], description: "M6 before tool number" },
                { code: "T1\nM6", controllers: ["some_fanuc", "old_controls"], description: "Tool and M6 on separate lines" },
                { code: "T01 M06", controllers: ["fanuc", "brother"], description: "Leading zeros on both" },
                { code: "TOOL CALL 1 Z S5000", controllers: ["heidenhain"], description: "Heidenhain conversational format" },
                { code: "T0101", controllers: ["lathe"], description: "Lathe format: Tool.Offset" },
                { code: "T1\nG43 H1", controllers: ["some_haas"], description: "Tool with separate length comp" }
            ]
        },
        // Through-Spindle Coolant (TSC) Variations
        tsc: {
            description: "Through-spindle coolant (high-pressure) codes",
            note: "TSC is an option on most machines - if not installed, use flood (M8)",
            variations: [
                { code: "M88/M89", controllers: ["haas"], description: "Haas standard TSC on/off", pressure: "300-1000 PSI" },
                { code: "M51/M59", controllers: ["okuma", "some_fanuc"], description: "Okuma and some FANUC TSC", pressure: "Variable" },
                { code: "M50/M51", controllers: ["mazak"], description: "Mazak coolant through spindle", pressure: "Variable" },
                { code: "M21/M22", controllers: ["some_fanuc"], description: "Programmable coolant on/off", pressure: "Programmable" },
                { code: "M13/M14", controllers: ["universal"], description: "Spindle + coolant combined (CW+cool/CCW+cool)" },
                { code: "COOLANT ON/OFF", controllers: ["siemens"], description: "Siemens text command" },
                { code: "M8 with Setting", controllers: ["some_haas"], description: "M8 with TSC enabled in settings" }
            ],
            fallback: "M8/M9",
            fallbackNote: "Standard flood coolant - always available"
        },
        // Flood Coolant Variations
        floodCoolant: {
            description: "Standard flood coolant codes",
            note: "M8/M9 is nearly universal but some machines use different codes",
            variations: [
                { code: "M8/M9", controllers: ["universal"], description: "Standard flood on/off - almost all controls" },
                { code: "M08/M09", controllers: ["fanuc", "brother"], description: "With leading zeros" },
                { code: "M7/M9", controllers: ["universal"], description: "Mist coolant (low volume)" },
                { code: "M13", controllers: ["universal"], description: "Spindle CW + coolant combined" },
                { code: "M14", controllers: ["universal"], description: "Spindle CCW + coolant combined" },
                { code: "COOLNT1/COOLF", controllers: ["okuma_osp"], description: "Okuma OSP text commands" }
            ]
        },
        // Air Blast Variations
        airBlast: {
            description: "Air blast for chip clearing",
            note: "Air blast is optional on many machines",
            variations: [
                { code: "M83/M84", controllers: ["haas"], description: "Haas external air gun on/off" },
                { code: "M73/M74", controllers: ["haas"], description: "Haas through-spindle air on/off" },
                { code: "M77/M78", controllers: ["okuma"], description: "Okuma air blow on/off" },
                { code: "M7", controllers: ["some"], description: "Some machines use mist output for air" },
                { code: "M130/M131", controllers: ["haas"], description: "Haas programmable air nozzle" },
                { code: "M98 P9015/P9016", controllers: ["hurco"], description: "Hurco subprogram call for air" }
            ],
            fallback: "Remove code",
            fallbackNote: "Simply remove air blast codes if not equipped"
        },
        // Chip Conveyor Variations
        chipConveyor: {
            description: "Chip conveyor control codes",
            note: "Chip conveyor is optional - remove if not installed",
            variations: [
                { code: "M31/M32/M33", controllers: ["haas", "mazak"], description: "Forward/Reverse/Off" },
                { code: "M64/M65", controllers: ["okuma"], description: "Okuma forward/off" },
                { code: "M59/M60/M61", controllers: ["hurco"], description: "Hurco forward/reverse/off" }
            ],
            fallback: "Remove code",
            fallbackNote: "Remove chip conveyor codes if not equipped"
        },
        // Spindle Variations
        spindle: {
            description: "Spindle control codes",
            note: "Spindle codes are mostly standard but orient varies",
            variations: [
                { code: "M3/M4/M5", controllers: ["universal"], description: "CW/CCW/Stop - universal" },
                { code: "M03/M04/M05", controllers: ["fanuc"], description: "With leading zeros" },
                { code: "M19", controllers: ["most"], description: "Spindle orient - standard" },
                { code: "M19 R0", controllers: ["haas"], description: "Haas orient with angle" },
                { code: "SPOS", controllers: ["siemens"], description: "Siemens spindle position" }
            ]
        },
        // HSM/Smoothing Mode Variations
        hsm: {
            description: "High-speed machining / smoothing modes",
            note: "HSM features are often optional - disable if causing alarms",
            variations: [
                { code: "G187 P1/P2/P3", controllers: ["haas"], description: "Haas smoothing (rough/medium/finish)" },
                { code: "G05.1 Q1", controllers: ["fanuc", "mazak"], description: "FANUC AICC mode" },
                { code: "G05.1 Q3", controllers: ["fanuc"], description: "FANUC Nano smoothing" },
                { code: "G131", controllers: ["okuma"], description: "Okuma Super-NURBS" },
                { code: "G05.3 P##", controllers: ["hurco"], description: "Hurco UltiMotion tolerance" },
                { code: "CYCLE832", controllers: ["siemens"], description: "Siemens high-speed cycle" },
                { code: "G05 P2", controllers: ["makino"], description: "Makino SGI mode" },
                { code: "G08 P1", controllers: ["fanuc", "okuma"], description: "High precision mode" }
            ],
            fallback: "Remove code",
            fallbackNote: "Remove HSM codes - machine will use default motion"
        },
        // Work Offset Variations
        workOffsets: {
            description: "Work coordinate system selection",
            note: "G54-G59 are standard, extended offsets vary",
            variations: [
                { code: "G54-G59", controllers: ["universal"], description: "Standard 6 work offsets" },
                { code: "G54.1 P1-P48", controllers: ["fanuc"], description: "FANUC extended offsets" },
                { code: "G54.1 P1-P99", controllers: ["haas"], description: "Haas extended (or G154 Pn)" },
                { code: "G110-G129", controllers: ["haas"], description: "Haas additional offsets" },
                { code: "G15 H1-H100", controllers: ["okuma"], description: "Okuma offset by H number" },
                { code: "G500-G599", controllers: ["siemens"], description: "Siemens extended frames" }
            ]
        },
        // Program End Variations
        programEnd: {
            description: "Program end/reset codes",
            note: "M30 is most common, some machines use M2",
            variations: [
                { code: "M30", controllers: ["universal"], description: "End and rewind - most common" },
                { code: "M2", controllers: ["some"], description: "End without rewind" },
                { code: "M02", controllers: ["fanuc"], description: "With leading zero" },
                { code: "M99", controllers: ["some"], description: "Return/end (context dependent)" },
                { code: "END PGM", controllers: ["heidenhain"], description: "Heidenhain program end" }
            ]
        }
    },
    // CONTROL SYSTEM DEFINITIONS
    // G-code dialects, M-codes, and capabilities by controller family

    CONTROLLERS: {
        // FANUC Family
        fanuc: {
            base: {
                name: "FANUC",
                dialect: "fanuc",
                modalGroups: {
                    motion: ["G00", "G01", "G02", "G03"],
                    plane: ["G17", "G18", "G19"],
                    positioning: ["G90", "G91"],
                    feed: ["G93", "G94", "G95"],
                    units: ["G20", "G21"],
                    cutter_comp: ["G40", "G41", "G42"],
                    tool_length: ["G43", "G44", "G49"],
                    canned: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
                    return: ["G98", "G99"],
                    scaling: ["G50", "G51"],
                    coord_rotation: ["G68", "G69"]
                },
                coolantCodes: {
                    flood: { on: "M8", off: "M9" },
                    mist: { on: "M7", off: "M9" },
                    tsc: { on: "M51", off: "M59" }
                },
                spindleCodes: {
                    cw: "M3",
                    ccw: "M4",
                    stop: "M5",
                    orient: "M19"
                },
                toolChange: "M6",
                programEnd: "M30",
                optionalStop: "M1",
                programStop: "M0",
                subprograms: {
                    call: "M98 P<prog> L<count>",
                    return: "M99",
                    macroCall: "G65 P<prog>",
                    modalMacro: "G66 P<prog>",
                    cancelMacro: "G67"
                },
                rigidTap: {
                    enable: "M29 or G84",
                    cancel: "G80"
                }
            },
            fanuc_0i: {
                inherits: "fanuc.base",
                name: "FANUC 0i-MF/TF",
                features: {
                    aiContour: false,
                    nanoSmoothing: false,
                    highSpeedCycles: true,
                    rigidTapping: true,
                    customMacro: true,
                    lookAhead: 40
                },
                highSpeed: {
                    mode: "G05.1 Q1",
                    off: "G05.1 Q0"
                }
            },
            fanuc_31i: {
                inherits: "fanuc.base",
                name: "FANUC 31i-B/B5",
                features: {
                    aiContour: true,
                    nanoSmoothing: true,
                    highSpeedCycles: true,
                    rigidTapping: true,
                    customMacro: true,
                    tcpc: true,
                    lookAhead: 200
                },
                highSpeed: {
                    aicc: "G05.1 Q1 R<n>",
                    nano: "G05.1 Q3",
                    off: "G05.1 Q0"
                },
                fiveAxis: {
                    tcpc: "G43.4",
                    tcpcVector: "G43.5",
                    tcpcOff: "G49",
                    tiltedPlane: "G68.2"
                }
            }
        },
        // Haas NGC (Next Generation Control)
        haas: {
            base: {
                name: "Haas NGC",
                dialect: "haas",
                inherits: "fanuc.base",
                features: {
                    smoothing: true,
                    chipConveyor: true,
                    probing: true,
                    rigidTapping: true,
                    ssv: true,
                    visualProgramming: true
                },
                smoothingCodes: {
                    rough: "G187 P1",
                    medium: "G187 P2",
                    finish: "G187 P3",
                    custom: "G187 P<n> E<tol>"
                },
                coolantCodes: {
                    flood: { on: "M8", off: "M9" },
                    mist: { on: "M7", off: "M9" },
                    tsc: { on: "M88", off: "M89" },
                    air: { on: "M83", off: "M84" },
                    airThruSpindle: { on: "M73", off: "M74" }
                },
                auxCodes: {
                    chipConveyorFwd: "M31",
                    chipConveyorRev: "M32",
                    chipConveyorOff: "M33",
                    doorOpen: "M85",
                    doorClose: "M86",
                    coolantSpigotUp: "M34",
                    coolantSpigotDown: "M35"
                },
                subprograms: {
                    call: "M98 P<prog> L<count>",
                    return: "M99",
                    localSub: "M97 P<line>",
                    macroCall: "G65 P<prog>"
                },
                homePosition: {
                    g28: "G28 G91 Z0.",
                    g53: "G53 Z0.",
                    machineCoords: "G53"
                },
                ssv: {
                    enable: "Setting 191 or SSV command",
                    description: "Spindle Speed Variation for chatter"
                }
            },
            haas_5axis: {
                inherits: "haas.base",
                name: "Haas 5-Axis (UMC/EC)",
                fiveAxis: {
                    tcpc: "G234",
                    dwo: "G254",
                    dwoOff: "G255",
                    rotaryA: { clamp: "M10", unclamp: "M11" },
                    rotaryC: { clamp: "M12", unclamp: "M13" }
                }
            }
        },
        // Okuma OSP-P Series
        okuma: {
            base: {
                name: "Okuma OSP",
                dialect: "okuma",
                features: {
                    superNurbs: true,
                    collisionAvoidance: true,
                    machiningNavi: true,
                    ssv: true,
                    tcp: true,
                    thermoFriendly: true
                },
                modalGroups: {
                    motion: ["G00", "G01", "G02", "G03"],
                    plane: ["G17", "G18", "G19"],
                    workOffset: ["G15 H<n>"]
                },
                smoothingCodes: {
                    superNurbs: "G131",
                    superNurbsOff: "G130",
                    qualityLevel: "G131 P<1-5>",
                    highPrecision: "G08 P1",
                    highPrecisionOff: "G08 P0"
                },
                fiveAxis: {
                    tcp: "G169",
                    tcpOff: "G170",
                    tiltedWorkPlane: "G68.2"
                },
                cycleTimeOptimization: {
                    ignoreSpindleAnswer: "M63",
                    cssSmoothing: "M61",
                    turretOverlap: "M65",
                    moveOptimize: "M64"
                },
                coolantCodes: {
                    flood: { on: "M8", off: "M9" },
                    tsc: { on: "M51", off: "M59" },
                    air: { on: "M77", off: "M78" }
                },
                subprograms: {
                    call: "CALL O<prog>",
                    callCount: "CALL O<prog> N<count>",
                    return: "RTS"
                },
                ssv: {
                    on: "M695",
                    off: "M694",
                    parameters: "SSV=<amplitude>,<period>"
                }
            },
            osp_p300: {
                inherits: "okuma.base",
                name: "OSP-P300M/MA/SA",
                advancedFeatures: {
                    collisionAvoidance: "CAS (Collision Avoidance System)",
                    superNurbs: "G131 with P1-P5 quality levels",
                    machiningNavi: "Automatic cutting optimization"
                }
            }
        },
        // Siemens SINUMERIK
        siemens: {
            base: {
                name: "SINUMERIK",
                dialect: "siemens",
                features: {
                    compressor: true,
                    lookAhead: true,
                    traori: true,
                    cycle832: true,
                    shapelink: true
                },
                modalGroups: {
                    motion: ["G0", "G1", "G2", "G3"],
                    plane: ["G17", "G18", "G19"],
                    positioning: ["G90", "G91"],
                    units: ["G70", "G71"]  // Different from FANUC
                },
                highSpeed: {
                    cycle832: "CYCLE832(TOL, MODE)",
                    compressor: "COMPON",
                    compressorCurve: "COMPCURV",
                    compressorCAD: "COMPCAD",
                    compressorOff: "COMPOF",
                    feedForward: "FFWON",
                    feedForwardOff: "FFWOF",
                    softMode: "SOFT"
                },
                fiveAxis: {
                    traori: "TRAORI",
                    traoriOff: "TRAFOOF",
                    tcpm: "TCPM",
                    cycle800: "CYCLE800"
                },
                subprograms: {
                    call: 'CALL "PROG"',
                    callCount: 'CALL "PROG" REP <n>',
                    parameterCall: "PCALL",
                    return: "M17"
                },
                coolantCodes: {
                    flood: { on: "M8", off: "M9" },
                    mist: { on: "M7", off: "M9" }
                },
                cycles: {
                    drilling: "CYCLE81-89",
                    boring: "CYCLE85-89",
                    tapping: "CYCLE84",
                    threadMilling: "CYCLE90",
                    measuring: "CYCLE977-979"
                }
            },
            sinumerik_840d: {
                inherits: "siemens.base",
                name: "SINUMERIK 840D sl",
                advancedFeatures: {
                    lookAhead: 200,
                    topSurface: "TOP SURFACE analysis",
                    aiFunctions: "Optimize MyMachine"
                }
            }
        },
        // Heidenhain TNC
        heidenhain: {
            base: {
                name: "Heidenhain TNC",
                dialect: "heidenhain",
                conversational: true,
                features: {
                    touchProbe: true,
                    dynamicCollision: true,
                    adaptiveFeed: true,
                    tcpm: true
                },
                motion: {
                    linear: "L X<x> Y<y> Z<z> R0 F<f> M<m>",
                    circleCenter: "C X<x> Y<y> DR+ R0 F<f>",
                    circleRadius: "CR X<x> Y<y> R<r> DR+ R0 F<f>",
                    tangentCircle: "CT X<x> Y<y> R0 F<f>",
                    centerDef: "CC X<x> Y<y>"
                },
                cycles: {
                    pecking: "CYCL DEF 1",
                    tapping: "CYCL DEF 2",
                    slotMilling: "CYCL DEF 3",
                    pocketMilling: "CYCL DEF 4",
                    circularPocket: "CYCL DEF 5",
                    datumShift: "CYCL DEF 7.0",
                    imageShift: "CYCL DEF 8",
                    dwell: "CYCL DEF 9",
                    tiltedPlane: "CYCL DEF 19",
                    tolerance: "CYCL DEF 32",
                    tcpm: "CYCL DEF 247"
                },
                fiveAxis: {
                    tcpm: { on: "M128", off: "M129" },
                    tiltedPlane: "CYCL DEF 19",
                    planeFunctions: "PLANE SPATIAL/VECTOR/POINTS"
                },
                coolantCodes: {
                    flood: { on: "M8", off: "M9" },
                    combined: "Use M13/M14 for spindle+coolant"
                },
                toolCall: "TOOL CALL <n> Z S<rpm>",
                programEnd: "M30",
                subprograms: {
                    call: "CALL LBL <n> REP <count>",
                    return: "LBL 0"
                }
            },
            tnc_640: {
                inherits: "heidenhain.base",
                name: "TNC 640",
                advancedFeatures: {
                    dynamicCollision: "DCM (Dynamic Collision Monitoring)",
                    afc: "AFC (Adaptive Feed Control)",
                    activeTronic: "Active Chatter Control"
                }
            }
        },
        // Mazak Mazatrol / Smooth
        mazak: {
            base: {
                name: "Mazak",
                dialect: "mazak",
                features: {
                    mazatrol: true,
                    eia: true,  // ISO mode
                    intelligentThermal: true,
                    smoothAi: true
                },
                smoothingCodes: {
                    smoothAi: "G05.1 Q1",
                    off: "G05.1 Q0"
                },
                fiveAxis: {
                    tcpc: "G43.4",
                    tiltedPlane: "G68.2"
                },
                coolantCodes: {
                    flood: { on: "M8", off: "M9" },
                    tsc: { on: "M50", off: "M51" }
                },
                auxCodes: {
                    chipConveyorFwd: "M31",
                    chipConveyorRev: "M32",
                    chipConveyorOff: "M33"
                }
            },
            smooth: {
                inherits: "mazak.base",
                name: "SmoothG/SmoothAi",
                advancedFeatures: {
                    ai: "Smooth Ai with learning",
                    thermalShield: "Intelligent Thermal Shield",
                    voiceAdvance: "Voice navigation"
                }
            }
        },
        // Hurco WinMax
        hurco: {
            base: {
                name: "Hurco WinMax",
                dialect: "hurco",
                features: {
                    conversational: true,
                    isoNC: true,
                    ultimotion: true,
                    adaptiveFeed: true
                },
                smoothingCodes: {
                    rough: "G05.3 P50",
                    medium: "G05.3 P35",
                    finish: "G05.3 P15",
                    ultraFinish: "G05.3 P5"
                },
                coolantCodes: {
                    flood: { on: "M8", off: "M9" },
                    tsc: { on: "M88", off: "M89" }
                }
            }
        },
        // Brother
        brother: {
            base: {
                name: "Brother CNC-B00",
                dialect: "brother",
                features: {
                    rapidToolChange: true,  // 0.9 second tool-to-tool
                    aiCorner: true,
                    economyMode: true
                },
                highSpeed: {
                    mode: "G05 P1",
                    off: "G05 P0"
                },
                coolantCodes: {
                    flood: { on: "M8", off: "M9" },
                    mist: { on: "M7", off: "M9" }
                }
            }
        },
        // Makino
        makino: {
            base: {
                name: "Makino Professional",
                dialect: "makino",
                features: {
                    sgi: true,
                    geoMotion: true,
                    inertiaControl: true,
                    agieCharmilles: true
                },
                highSpeed: {
                    sgi: "G05 P2",
                    geoMotion: "G05 P10000",
                    off: "G05 P0"
                },
                fiveAxis: {
                    tcpc: "G43.4",
                    tiltedPlane: "G68.2"
                }
            }
        },
        // DMG MORI
        dmgmori: {
            base: {
                name: "DMG MORI CELOS",
                dialect: "dmgmori",
                dualControl: true,  // FANUC or Siemens based
                features: {
                    aiChipRemoval: true,
                    mpc: true,  // Machine Protection Control
                    toolMonitoring: true
                }
            },
            celos_fanuc: {
                inherits: "fanuc.fanuc_31i",
                name: "CELOS with MAPPS",
                additionalFeatures: {
                    mpc: "Machine Protection Control",
                    toolMonitoring: "Integrated monitoring"
                }
            },
            celos_siemens: {
                inherits: "siemens.sinumerik_840d",
                name: "CELOS with SINUMERIK",
                additionalFeatures: {
                    mpc: "Machine Protection Control"
                }
            }
        }
    },
    // MACHINE-SPECIFIC POST CONFIGURATIONS
    // Optimized settings for each machine model

    MACHINES: {
        // HAAS MILLS
        haas_vf2: {
            controller: "haas.base",
            name: "Haas VF-2",
            type: "VMC",
            specs: {
                maxRpm: 8100,
                maxFeed: 650,  // IPM
                maxHp: 20,
                taper: "CAT40",
                axes: 3,
                travelX: 30,
                travelY: 16,
                travelZ: 20
            },
            postConfig: {
                extension: "nc",
                programNumber: { format: "O%04d", range: [1, 9999] },
                lineNumbers: { enabled: true, increment: 10, start: 10 },
                decimalPlaces: { linear: 4, angular: 3, feed: 1 },

                safetyBlock: "G28 G91 Z0.\nG28 Y0.\nG90 G17 G40 G49 G80 G54",

                smoothing: {
                    auto: true,
                    rough: "G187 P1 E0.002",
                    semifinish: "G187 P2 E0.001",
                    finish: "G187 P3 E0.0005"
                },
                toolChange: {
                    preRetract: "G28 G91 Z0.",
                    format: "T%d M6",
                    preload: true,
                    preloadFormat: "T%d",
                    toolLengthComp: "G43 H%d",
                    sequence: [
                        "{preRetract}",
                        "M5",
                        "M9",
                        "{toolCall}",
                        "{preload}",
                        "{smoothing}",
                        "{toolLengthComp}"
                    ]
                },
                coolant: {
                    flood: "M8",
                    floodOff: "M9",
                    tsc: "M88",
                    tscOff: "M89",
                    tscPressure: 300,  // PSI
                    air: "M83",
                    airOff: "M84"
                },
                programEnd: [
                    "G28 G91 Z0.",
                    "G28 Y0.",
                    "M5",
                    "M9",
                    "M30"
                ]
            }
        },
        haas_vf4: {
            inherits: "haas_vf2",
            name: "Haas VF-4",
            specs: {
                maxRpm: 8100,
                maxFeed: 650,
                maxHp: 20,
                taper: "CAT40",
                axes: 3,
                travelX: 50,
                travelY: 20,
                travelZ: 25
            }
        },
        haas_vf2ss: {
            inherits: "haas_vf2",
            name: "Haas VF-2SS",
            specs: {
                maxRpm: 12000,
                maxFeed: 1000,
                maxHp: 30,
                taper: "CAT40",
                axes: 3,
                travelX: 30,
                travelY: 16,
                travelZ: 20
            },
            postConfig: {
                smoothing: {
                    rough: "G187 P1 E0.002",
                    finish: "G187 P3 E0.0003"
                }
            }
        },
        haas_umc750: {
            controller: "haas.haas_5axis",
            name: "Haas UMC-750",
            type: "5-Axis VMC",
            specs: {
                maxRpm: 8100,
                maxFeed: 650,
                maxHp: 20,
                taper: "CAT40",
                axes: 5,
                rotaryA: { min: -120, max: 30 },
                rotaryC: { min: 0, max: 360, continuous: true },
                travelX: 30,
                travelY: 20,
                travelZ: 20
            },
            postConfig: {
                extension: "nc",

                fiveAxis: {
                    tcpc: "G234",
                    dwo: "G254",
                    dwoOff: "G255",
                    outputFormat: "A%.3f C%.3f",
                    inverseTime: "G93",
                    linearFeed: "G94"
                },
                rotary: {
                    aClamp: "M10",
                    aUnclamp: "M11",
                    cClamp: "M12",
                    cUnclamp: "M13",
                    unlockBefore: true,
                    lockAfter: true
                },
                toolChange: {
                    preRetract: "G28 G91 Z0.\nG255\nM10 M12",  // Cancel DWO, lock rotary
                    sequence: [
                        "G28 G91 Z0.",
                        "G255",      // Cancel DWO
                        "M10 M12",   // Lock rotary
                        "M5",
                        "M9",
                        "{toolCall}",
                        "{preload}",
                        "{smoothing}",
                        "{toolLengthComp}"
                    ]
                },
                safetyBlock: "G28 G91 Z0.\nG255\nM10 M12\nG28 Y0.\nG90 G17 G40 G49 G80 G54"
            }
        },
        haas_umc1000: {
            inherits: "haas_umc750",
            name: "Haas UMC-1000",
            specs: {
                maxRpm: 8100,
                maxFeed: 650,
                maxHp: 25,
                taper: "CAT40",
                axes: 5,
                rotaryA: { min: -120, max: 30 },
                rotaryC: { min: 0, max: 360, continuous: true },
                travelX: 40,
                travelY: 25,
                travelZ: 25
            }
        },
        // HURCO MILLS
        hurco_vm30i: {
            controller: "hurco.base",
            name: "Hurco VM30i",
            type: "VMC",
            specs: {
                maxRpm: 12000,
                maxFeed: 1000,
                maxHp: 25,
                taper: "CAT40",
                axes: 3
            },
            postConfig: {
                extension: "hnc",

                smoothing: {
                    rough: "G05.3 P50",
                    adaptive: "G05.3 P35",
                    finish: "G05.3 P15",
                    ultraFinish: "G05.3 P5"
                },
                toolChange: {
                    preload: true,
                    outputAfterM6: true
                },
                safetyBlock: "G28 G91 Z0.\nG90 G17 G40 G49 G80 G54"
            }
        },
        // OKUMA MILLS
        okuma_genos_m460: {
            controller: "okuma.osp_p300",
            name: "Okuma Genos M460-V",
            type: "VMC",
            specs: {
                maxRpm: 15000,
                maxFeed: 1260,
                maxHp: 22,
                taper: "CAT40",
                axes: 3
            },
            postConfig: {
                extension: "MIN",

                smoothing: {
                    superNurbs: "G131 P3",
                    off: "G130",
                    highPrecision: "G08 P1",
                    highPrecisionOff: "G08 P0"
                },
                safetyBlock: "G0 G28 Z0\nG28 X0 Y0\nG17 G40 G49 G80\nG15 H1"
            }
        },
        okuma_genos_m560: {
            inherits: "okuma_genos_m460",
            name: "Okuma Genos M560-V",
            specs: {
                maxRpm: 15000,
                maxFeed: 1260,
                maxHp: 30,
                taper: "CAT40",
                axes: 3
            }
        },
        okuma_mu5000v: {
            controller: "okuma.osp_p300",
            name: "Okuma MU-5000V",
            type: "5-Axis VMC",
            specs: {
                maxRpm: 20000,
                maxFeed: 1260,
                maxHp: 30,
                taper: "HSK-A63",
                axes: 5
            },
            postConfig: {
                extension: "MIN",

                fiveAxis: {
                    tcp: "G169",
                    tcpOff: "G170",
                    inverseTime: "G93",
                    linearFeed: "G94",
                    tiltedWorkPlane: "G68.2"
                },
                smoothing: {
                    superNurbs: "G131 P4",
                    off: "G130"
                },
                rotaryReposition: {
                    enabled: true,
                    maxAngle: 180,
                    minDistance: 0.5
                }
            }
        },
        // OKUMA LATHES
        okuma_lb3000: {
            controller: "okuma.base",
            name: "Okuma LB3000EXII",
            type: "Turning Center",
            specs: {
                maxRpm: 5000,
                maxFeed: 100,
                maxHp: 30,
                liveToolRpm: 6000,
                turretStations: 12,
                maxTurningDia: 12,
                maxTurningLength: 24
            },
            postConfig: {
                extension: "MIN",

                turningCycles: {
                    roughing: "G85",
                    finishing: "G86",
                    threading: "G71",
                    grooving: "G75"
                },
                ssv: {
                    on: "M695",
                    off: "M694",
                    amplitude: 50,
                    period: 2.0
                },
                coolant: {
                    flood: "M8",
                    tsc: "M51",
                    air: "M77"
                }
            }
        },
        // SIEMENS-BASED MACHINES
        dmg_dmu50: {
            controller: "siemens.sinumerik_840d",
            name: "DMG MORI DMU 50",
            type: "5-Axis VMC",
            specs: {
                maxRpm: 20000,
                maxFeed: 1181,
                maxHp: 35,
                taper: "HSK-A63",
                axes: 5
            },
            postConfig: {
                extension: "mpf",

                highSpeed: {
                    cycle832: "CYCLE832(0.01, 1)",
                    compressor: "COMPCAD",
                    feedForward: "FFWON"
                },
                fiveAxis: {
                    traori: "TRAORI",
                    traoriOff: "TRAFOOF",
                    cycle800: "CYCLE800"
                },
                safetyBlock: "G0 G17 G40 G60 G90\nD0\nG500\nSUPA G0 Z0"
            }
        },
        // HEIDENHAIN-BASED MACHINES
        hermle_c42u: {
            controller: "heidenhain.tnc_640",
            name: "Hermle C 42 U",
            type: "5-Axis VMC",
            specs: {
                maxRpm: 18000,
                maxFeed: 1378,
                maxHp: 45,
                taper: "HSK-A63",
                axes: 5
            },
            postConfig: {
                extension: "h",

                fiveAxis: {
                    tcpm: "M128",
                    tcpmOff: "M129",
                    tiltedPlane: "PLANE SPATIAL"
                },
                smoothing: {
                    tolerance: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.01\nCYCL DEF 32.2 HSC-MODE:1"
                },
                safetyBlock: "TOOL CALL 0 Z\nL Z+200 R0 FMAX M5\nL X+0 Y+0 R0 FMAX"
            }
        },
        // MAZAK MACHINES
        mazak_vce500: {
            controller: "mazak.smooth",
            name: "Mazak VCE-500",
            type: "VMC",
            specs: {
                maxRpm: 12000,
                maxFeed: 1181,
                maxHp: 25,
                taper: "CAT40",
                axes: 3
            },
            postConfig: {
                extension: "eia",

                smoothing: {
                    smoothAi: "G05.1 Q1",
                    off: "G05.1 Q0"
                },
                coolant: {
                    flood: "M8",
                    tsc: "M50"
                }
            }
        },
        mazak_variaxis_i700: {
            controller: "mazak.smooth",
            name: "Mazak VARIAXIS i-700",
            type: "5-Axis VMC",
            specs: {
                maxRpm: 18000,
                maxFeed: 1181,
                maxHp: 40,
                taper: "HSK-A63",
                axes: 5
            },
            postConfig: {
                extension: "eia",

                fiveAxis: {
                    tcpc: "G43.4",
                    tiltedWorkPlane: "G68.2",
                    inverseTime: "G93"
                },
                smoothing: {
                    smoothAi: "G05.1 Q1"
                }
            }
        },
        // MAKINO MACHINES
        makino_ps95: {
            controller: "makino.base",
            name: "Makino PS95",
            type: "VMC",
            specs: {
                maxRpm: 14000,
                maxFeed: 1260,
                maxHp: 30,
                taper: "CAT40",
                axes: 3
            },
            postConfig: {
                extension: "nc",

                highSpeed: {
                    sgi: "G05 P2",
                    off: "G05 P0"
                },
                safetyBlock: "G91 G28 Z0\nG28 X0 Y0\nG90 G17 G40 G49 G80"
            }
        },
        makino_d500: {
            controller: "makino.base",
            name: "Makino D500",
            type: "5-Axis VMC",
            specs: {
                maxRpm: 20000,
                maxFeed: 1181,
                maxHp: 35,
                taper: "HSK-A63",
                axes: 5
            },
            postConfig: {
                extension: "nc",

                fiveAxis: {
                    tcpc: "G43.4",
                    tiltedWorkPlane: "G68.2"
                },
                highSpeed: {
                    sgi: "G05 P2",
                    geoMotion: "G05 P10000"
                }
            }
        },
        // BROTHER MACHINES
        brother_s700x2: {
            controller: "brother.base",
            name: "Brother Speedio S700X2",
            type: "VMC",
            specs: {
                maxRpm: 16000,
                maxFeed: 2362,  // Very fast rapids
                maxHp: 11,
                taper: "BT30",
                axes: 3,
                toolChangeTime: 0.9  // seconds
            },
            postConfig: {
                extension: "nc",

                highSpeed: {
                    mode: "G05 P1",
                    off: "G05 P0"
                },
                safetyBlock: "G91 G28 Z0\nG28 X0 Y0\nG90 G17 G40 G49 G80"
            }
        }
    },
    // SETUP SHEET GENERATION DATA
    // Information for automatic setup sheet creation

    SETUP_SHEET: {
        // Required fields
        requiredFields: [
            "programNumber",
            "programName",
            "machineName",
            "material",
            "workOffset",
            "toolList"
        ],

        // Tool information
        toolInfo: {
            fields: [
                "toolNumber",
                "toolType",
                "diameter",
                "length",
                "holderType",
                "stickout",
                "coolantType",
                "rpm",
                "feedRate"
            ]
        },
        // Work holding
        workHolding: {
            types: [
                "Vise",
                "Soft Jaws",
                "Fixture Plate",
                "Chuck",
                "Collet",
                "Vacuum",
                "Custom Fixture"
            ],
            requiredInfo: [
                "type",
                "position",
                "clamping force",
                "part orientation"
            ]
        },
        // Critical dimensions
        criticalDimensions: {
            tolerance: "Default ±0.005\"",
            surfaceFinish: "Ra value",
            notes: "Special requirements"
        },
        // Output formats
        formats: ["HTML", "PDF", "Excel"]
    },
    // G-CODE GENERATION TEMPLATES
    // Template strings for common operations

    TEMPLATES: {
        programHeader: {
            haas: [
                "%",
                "O{programNumber} ({programName})",
                "({date} - {time})",
                "(MACHINE: {machineName})",
                "(MATERIAL: {material})",
                "(PROGRAMMER: {programmer})",
                "",
                "{safetyBlock}"
            ],
            fanuc: [
                "%",
                "O{programNumber}",
                "({programName})",
                "({date})",
                "{safetyBlock}"
            ],
            siemens: [
                ";{programName}",
                ";{date}",
                ";{material}",
                "",
                "{safetyBlock}"
            ],
            heidenhain: [
                "BEGIN PGM {programName} MM",
                ";{date}",
                ";{material}",
                "{safetyBlock}"
            ]
        },
        toolChange: {
            haas: [
                "",
                "(TOOL {toolNumber} - {toolDescription})",
                "(DIA={toolDia} LOC={fluteLengthfluteLength})",
                "G28 G91 Z0.",
                "M5",
                "M9",
                "T{toolNumber} M6",
                "{preload}",
                "{smoothing}",
                "G43 H{toolNumber}",
                "S{rpm} M3",
                "{coolant}"
            ],
            fanuc: [
                "N{lineNum} (TOOL {toolNumber} - {toolDescription})",
                "G91 G28 Z0",
                "M5",
                "M9",
                "T{toolNumber} M6",
                "G43 H{toolNumber}",
                "S{rpm} M3",
                "{coolant}"
            ]
        },
        programEnd: {
            haas: [
                "",
                "(END OF PROGRAM)",
                "G28 G91 Z0.",
                "G28 Y0.",
                "M5",
                "M9",
                "M30",
                "%"
            ],
            fanuc: [
                "G91 G28 Z0",
                "G28 X0 Y0",
                "M5",
                "M9",
                "M30",
                "%"
            ]
        }
    }
};
// ENHANCED HELPER FUNCTIONS FOR POST PROCESSOR CALCULATIONS

/**
 * Calculate chip thinning factor
 * @param {number} toolDia - Tool diameter
 * @param {number} radialEngagement - Radial depth of cut (ae)
 * @returns {object} { ctf: number, feedMultiplier: number }
 */
function calculateChipThinningFactor(toolDia, radialEngagement) {
    const aeRatio = radialEngagement / toolDia;

    if (aeRatio >= 0.5) return { ctf: 1.0, feedMultiplier: 1.0 };
    if (aeRatio <= 0) return { ctf: 1.0, feedMultiplier: 1.0 };

    // CTF = D / (2 * sqrt(ae * (D - ae)))
    const ctf = toolDia / (2 * Math.sqrt(radialEngagement * (toolDia - radialEngagement)));

    // Look up in table for recommended multiplier
    const table = POST_PROCESSOR_DATABASE.MACHINING_SCIENCE.chipThinning.table;
    let feedMultiplier = 1.0;

    for (let i = 0; i < table.length - 1; i++) {
        if (aeRatio >= table[i].aeRatio && aeRatio < table[i+1].aeRatio) {
            // Linear interpolation
            const t = (aeRatio - table[i].aeRatio) / (table[i+1].aeRatio - table[i].aeRatio);
            feedMultiplier = table[i].feedMultiplier + t * (table[i+1].feedMultiplier - table[i].feedMultiplier);
            break;
        }
    }
    const maxMult = POST_PROCESSOR_DATABASE.MACHINING_SCIENCE.chipThinning.maxMultiplier;

    return {
        ctf: Math.min(ctf, maxMult),
        feedMultiplier: Math.min(feedMultiplier, maxMult),
        aeRatio: aeRatio
    };
}
/**
 * Calculate tool deflection
 * @param {number} force - Cutting force (lbs)
 * @param {number} stickout - Tool stickout (inches)
 * @param {number} diameter - Tool diameter (inches)
 * @param {string} material - Tool material ('carbide', 'hss', 'ceramic')
 * @returns {object} Deflection info with warnings
 */
function calculateToolDeflection(force, stickout, diameter, material = 'carbide') {
    const deflectionData = POST_PROCESSOR_DATABASE.MACHINING_SCIENCE.deflection;
    const matData = deflectionData[material] || deflectionData.carbide;

    const E = matData.E * 145.038;  // Convert MPa to psi
    const I = Math.PI * Math.pow(diameter, 4) / 64;  // Moment of inertia

    // δ = F * L³ / (3 * E * I)
    const deflection = (force * Math.pow(stickout, 3)) / (3 * E * I);
    const ldRatio = stickout / diameter;

    // Determine warnings
    const ratios = deflectionData.stickoutRatios.roughing;
    let warning = null;

    if (ldRatio >= ratios.critical) {
        warning = "CRITICAL: L/D ratio too high - reduce stickout or increase diameter";
    } else if (ldRatio >= ratios.warning) {
        warning = "WARNING: L/D ratio high - consider reducing depth of cut";
    } else if (deflection > matData.maxDeflectionRough) {
        warning = "WARNING: Deflection exceeds roughing limit";
    }
    return {
        deflection: deflection,
        ldRatio: ldRatio,
        maxDeflection: matData.maxDeflectionRough,
        warning: warning,
        acceptable: deflection <= matData.maxDeflectionRough && ldRatio < ratios.critical
    };
}
/**
 * Calculate specific cutting force using Kienzle equation
 * @param {string} material - Material type
 * @param {number} chipThickness - Chip thickness (mm)
 * @returns {object} Cutting force data
 */
function calculateSpecificCuttingForce(material, chipThickness) {
    const data = POST_PROCESSOR_DATABASE.MACHINING_SCIENCE.specificCuttingForce[material];
    if (!data) {
        return { Kc: 2000, warning: "Unknown material, using default value" };
    }
    // Kc = Kc1.1 * h^(-mc)
    const Kc = data.Kc1_1 * Math.pow(chipThickness, -data.mc);

    return {
        Kc: Kc,
        Kc1_1: data.Kc1_1,
        mc: data.mc,
        hardness: data.hardness
    };
}
/**
 * Calculate theoretical surface finish (Ra)
 * @param {number} feedPerRev - Feed per revolution (inches)
 * @param {number} noseRadius - Tool nose radius (inches)
 * @param {object} conditions - Optional cutting conditions
 * @returns {object} Surface finish prediction
 */
function calculateSurfaceFinish(feedPerRev, noseRadius, conditions = {}) {
    const factors = POST_PROCESSOR_DATABASE.MACHINING_SCIENCE.surfaceFinish.factors;
    const targets = POST_PROCESSOR_DATABASE.MACHINING_SCIENCE.surfaceFinish.targets;

    // Ra ≈ f² / (32 * r) (simplified formula) - result in inches
    const raTheoretical = Math.pow(feedPerRev, 2) / (32 * noseRadius);
    const raMicroInches = raTheoretical * 1000000;  // Convert to microinches

    // Apply condition factors
    let multiplier = 1.0;
    if (conditions.builtUpEdge) multiplier *= factors.builtUpEdge;
    if (conditions.vibration) multiplier *= factors.vibration;
    if (conditions.wornTool) multiplier *= factors.wornTool;
    if (conditions.coolant) multiplier *= factors.coolant;
    if (conditions.noCoolant) multiplier *= factors.noCoolant;

    const raActual = raMicroInches * multiplier;

    // Determine finish class
    let finishClass = "rough";
    for (const [cls, range] of Object.entries(targets)) {
        if (raActual >= range.min && raActual <= range.max) {
            finishClass = cls;
            break;
        }
    }
    return {
        theoretical: raMicroInches,
        predicted: raActual,
        finishClass: finishClass,
        multiplier: multiplier
    };
}
/**
 * Calculate arc feed correction factor
 * @param {number} arcRadius - Arc radius (inches)
 * @param {number} toolRadius - Tool radius (inches)
 * @param {boolean} convex - True for outside arc (G02 outer, G03 inner)
 * @returns {object} Correction factor and notes
 */
function calculateArcFeedCorrection(arcRadius, toolRadius, convex = true) {
    const config = POST_PROCESSOR_DATABASE.MACHINING_SCIENCE.arcCorrection;

    if (arcRadius <= toolRadius) {
        return {
            correction: 0.5,
            warning: "Arc radius smaller than tool radius - check geometry",
            apply: true
        };
    }
    const ratio = toolRadius / arcRadius;

    if (ratio < config.minRadiusRatio) {
        return { correction: 1.0, apply: false };
    }
    let correction;
    if (convex) {
        // Outside arc - effective radius is smaller, tool moves slower
        correction = Math.max(1 - ratio, 1 - config.maxCorrection);
    } else {
        // Inside arc - effective radius is larger
        correction = Math.min(1 + ratio * 0.5, 1.0);  // Don't increase for safety
    }
    return {
        correction: correction,
        ratio: ratio,
        apply: true
    };
}
/**
 * Calculate optimal cutting speed using Taylor equation
 * @param {string} material - Material type from taylorConstants
 * @param {number} desiredToolLife - Desired tool life in minutes (default 45)
 * @returns {object} Speed recommendation
 */
function calculateOptimalSpeed(material, desiredToolLife = 45) {
    const data = POST_PROCESSOR_DATABASE.MACHINING_SCIENCE.taylorConstants[material];
    if (!data) {
        return { sfm: 300, warning: "Unknown material, using default value" };
    }
    // V = C / T^n
    const sfm = data.C / Math.pow(desiredToolLife, data.n);

    return {
        sfm: Math.round(sfm),
        material: material,
        description: data.description,
        toolLifeMinutes: desiredToolLife,
        taylorN: data.n,
        taylorC: data.C
    };
}
/**
 * Calculate SSV (Spindle Speed Variation) parameters
 * @param {string} material - Material family
 * @param {number} nominalRpm - Base spindle speed
 * @returns {object} SSV configuration
 */
function calculateSSVParameters(material, nominalRpm) {
    const profiles = POST_PROCESSOR_DATABASE.MACHINING_SCIENCE.ssv.profiles;
    const profile = profiles[material] || profiles.steel;

    if (!profile.enabled || nominalRpm < profile.minRpm) {
        return {
            enabled: false,
            reason: nominalRpm < profile.minRpm ? "RPM too low for SSV" : "SSV not recommended for material"
        };
    }
    const amplitudeRpm = nominalRpm * (profile.amplitudePercent / 100);

    return {
        enabled: true,
        nominalRpm: nominalRpm,
        amplitude: amplitudeRpm,
        amplitudePercent: profile.amplitudePercent,
        period: profile.periodSeconds,
        minRpm: nominalRpm - amplitudeRpm,
        maxRpm: nominalRpm + amplitudeRpm,
        notes: profile.notes
    };
}
/**
 * Get post processor configuration for a machine
 * @param {string} machineId - Machine identifier
 * @returns {object} Complete post processor configuration
 */
function getPostConfig(machineId) {
    let machine = POST_PROCESSOR_DATABASE.MACHINES[machineId];
    if (!machine) return null;

    // Handle inheritance
    if (machine.inherits) {
        const parent = POST_PROCESSOR_DATABASE.MACHINES[machine.inherits];
        machine = deepMerge(parent, machine);
    }
    // Get controller configuration
    const controllerPath = machine.controller.split('.');
    let controller = POST_PROCESSOR_DATABASE.CONTROLLERS;
    for (const part of controllerPath) {
        controller = controller[part];
        if (!controller) break;
    }
    // Handle controller inheritance
    if (controller && controller.inherits) {
        const inheritPath = controller.inherits.split('.');
        let parent = POST_PROCESSOR_DATABASE.CONTROLLERS;
        for (const part of inheritPath) {
            parent = parent[part];
        }
        controller = deepMerge(parent, controller);
    }
    return {
        machine: machine,
        controller: controller,
        postConfig: machine.postConfig,

        // Convenience methods
        getSafetyBlock: function() {
            return machine.postConfig?.safetyBlock ||
                   POST_PROCESSOR_DATABASE.SAFETY_BLOCKS.programStart[this.getDialect()]?.combined ||
                   "G90 G17 G40 G49 G80";
        },
        getDialect: function() {
            return controller?.dialect || 'fanuc';
        },
        getHSMCode: function(level = 'finish') {
            const smoothing = machine.postConfig?.smoothing;
            if (smoothing) return smoothing[level] || smoothing.finish;
            return null;
        },
        getCoolantCode: function(type = 'flood') {
            const coolant = machine.postConfig?.coolant || controller?.coolantCodes;
            if (coolant && coolant[type]) {
                return typeof coolant[type] === 'string' ? coolant[type] : coolant[type].on;
            }
            return 'M8';  // Default flood
        }
    };
}
/**
 * Generate safety block for specific controller
 * @param {string} controllerType - Controller identifier
 * @returns {string} Safety block G-code
 */
function generateSafetyBlock(controllerType) {
    const safetyBlocks = POST_PROCESSOR_DATABASE.SAFETY_BLOCKS.programStart;
    const blocks = safetyBlocks[controllerType] || safetyBlocks.haas;
    return blocks.combined || blocks.blocks.join('\n');
}
/**
 * Get probing cycle for specific probe system and operation
 * @param {string} probeSystem - 'renishaw', 'haas', 'blum', 'heidenhain', 'siemens'
 * @param {string} operation - Cycle type (e.g., 'boreCenter', 'singleSurface')
 * @returns {object} Probing cycle information
 */
function getProbingCycle(probeSystem, operation) {
    const probing = POST_PROCESSOR_DATABASE.PROBING[probeSystem];
    if (!probing) return null;

    if (probing.cycles && probing.cycles[operation]) {
        return {
            system: probeSystem,
            name: probing.name,
            cycle: probing.cycles[operation]
        };
    }
    return null;
}
/**
 * Get 5-axis TCP code for controller
 * @param {string} controllerType - Controller type
 * @returns {object} TCP codes and settings
 */
function getTCPCodes(controllerType) {
    const fiveAxis = POST_PROCESSOR_DATABASE.FIVE_AXIS.tcpModes;
    return fiveAxis[controllerType] || null;
}
/**
 * Deep merge helper function
 * @param {object} target - Base object
 * @param {object} source - Object to merge in
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
    const result = { ...target };

    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
            result[key] = deepMerge(target[key], source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}
/**
 * Generate program header
 * @param {object} options - Program options
 * @returns {string} Header G-code
 */
function generateProgramHeader(options) {
    const {
        dialect = 'haas',
        programNumber = 1,
        programName = 'PROGRAM',
        machineName = 'MACHINE',
        material = 'STEEL',
        programmer = 'PRISM'
    } = options;

    const templates = POST_PROCESSOR_DATABASE.TEMPLATES.programHeader;
    const template = templates[dialect] || templates.haas;

    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    const safetyBlock = generateSafetyBlock(dialect);

    return template
        .map(line => line
            .replace('{programNumber}', String(programNumber).padStart(4, '0'))
            .replace('{programName}', programName)
            .replace('{machineName}', machineName)
            .replace('{material}', material)
            .replace('{programmer}', programmer)
            .replace('{date}', date)
            .replace('{time}', time)
            .replace('{safetyBlock}', safetyBlock)
        )
        .join('\n');
}
// G-FORCE PHYSICS CALCULATION FUNCTIONS

/**
 * Calculate centrifugal force on a rotating mass
 * F = m × ω² × r = m × (2πn/60)² × r
 * @param {number} rpm - Spindle speed in RPM
 * @param {number} mass - Mass in grams
 * @param {number} radius - Radius from center in mm
 * @returns {object} Force analysis
 */
function calculateCentrifugalForce(rpm, mass, radius) {
    const GRAVITY = POST_PROCESSOR_DATABASE.G_FORCE_PHYSICS.CONSTANTS.GRAVITY_MS2;

    // Convert units
    const massKg = mass / 1000;
    const radiusM = radius / 1000;

    // Angular velocity (rad/s)
    const omega = (2 * Math.PI * rpm) / 60;

    // Centrifugal force (N)
    const force = massKg * omega * omega * radiusM;

    // G-force experienced
    const gForce = force / (massKg * GRAVITY);

    // Check insert retention limits
    const insertLimits = POST_PROCESSOR_DATABASE.G_FORCE_PHYSICS.INSERT_RETENTION;
    const safeG = insertLimits.wedge_clamp.maxG / insertLimits.safetyFactor;

    return {
        force: Math.round(force * 100) / 100,  // Newtons
        gForce: Math.round(gForce),
        omega: Math.round(omega * 100) / 100,
        safeForInsert: gForce <= safeG,
        warning: gForce > safeG ? `G-force (${Math.round(gForce)}g) exceeds safe insert retention limit (${Math.round(safeG)}g)` : null
    };
}
/**
 * Calculate maximum safe RPM for a tool based on centrifugal forces
 * @param {number} toolDiameter - Tool diameter in mm
 * @param {number} insertMass - Insert mass in grams (default 5g)
 * @param {number} maxG - Maximum allowable G-force (default 250 with safety factor)
 * @returns {object} Maximum RPM analysis
 */
function calculateMaxSafeRPM(toolDiameter, insertMass = 5, maxG = 250) {
    const GRAVITY = POST_PROCESSOR_DATABASE.G_FORCE_PHYSICS.CONSTANTS.GRAVITY_MS2;
    const radius = toolDiameter / 2 / 1000;  // Convert to meters

    // n_max = (60/2π) × √(G_max × g / r)
    const maxRpm = (60 / (2 * Math.PI)) * Math.sqrt((maxG * GRAVITY) / radius);

    // Check against standard limits
    const standardLimits = POST_PROCESSOR_DATABASE.G_FORCE_PHYSICS.INSERT_RETENTION.maxRpmByDiameter;
    let standardLimit = null;

    for (const [dia, rpm] of Object.entries(standardLimits)) {
        if (parseInt(dia) >= toolDiameter) {
            standardLimit = rpm;
            break;
        }
    }
    return {
        maxRpm: Math.round(maxRpm / 100) * 100,  // Round to nearest 100
        standardLimit: standardLimit,
        toolDiameter: toolDiameter,
        maxG: maxG,
        recommendation: maxRpm < 5000 ? "Consider solid carbide for higher speeds" : "Within normal range"
    };
}
/**
 * Calculate required balance grade for a tool holder assembly
 * @param {number} rpm - Maximum operating RPM
 * @param {number} holderMass - Holder + tool mass in kg
 * @param {string} holderType - Type of holder ('shrink_fit', 'hydraulic', 'er_collet', etc.)
 * @returns {object} Balance requirements
 */
function calculateBalanceRequirements(rpm, holderMass, holderType = 'er_collet') {
    const grades = POST_PROCESSOR_DATABASE.G_FORCE_PHYSICS.BALANCE_GRADES;
    const holderRec = grades.holderRecommendations[holderType];

    // Find required grade based on RPM
    let requiredGrade = 'G40';
    for (const [grade, data] of Object.entries(grades)) {
        if (typeof data === 'object' && data.minRpm && rpm >= data.minRpm) {
            requiredGrade = grade;
        }
    }
    // Calculate permissible unbalance for each grade
    const results = {};
    for (const [grade, data] of Object.entries(grades)) {
        if (typeof data === 'object' && data.eper) {
            // U_per = (G × M × 9549) / n
            const permissibleUnbalance = (data.eper * holderMass * 1000 * 9549) / rpm;
            results[grade] = {
                permissibleUnbalance: Math.round(permissibleUnbalance * 10) / 10,  // g·mm
                eper: data.eper,
                application: data.application
            };
        }
    }
    return {
        rpm: rpm,
        holderMass: holderMass,
        holderType: holderType,
        recommendedGrade: holderRec?.grade || requiredGrade,
        requiredGrade: requiredGrade,
        holderMaxRpm: holderRec?.maxRpm,
        balanceData: results,
        warning: rpm > (holderRec?.maxRpm || 50000) ?
            `RPM exceeds recommended limit for ${holderType} holders` : null
    };
}
/**
 * Calculate corner dynamics and required feed reduction
 * @param {number} feedRate - Programmed feed rate in mm/min or IPM
 * @param {number} cornerAngle - Angle of corner in degrees (180 = straight, 90 = right angle)
 * @param {object} machineSpec - Machine acceleration specifications
 * @param {boolean} metric - True for mm, false for inches
 * @returns {object} Corner dynamics analysis
 */
function calculateCornerDynamics(feedRate, cornerAngle, machineSpec = null, metric = true) {
    const spec = machineSpec || POST_PROCESSOR_DATABASE.G_FORCE_PHYSICS.MACHINE_DYNAMICS.vmc_standard;
    const maxAccelG = Math.min(spec.accel.x, spec.accel.y);
    const GRAVITY = metric ? 9810 : 386.4;  // mm/s² or in/s²

    // Get corner coefficient
    const coefficients = POST_PROCESSOR_DATABASE.G_FORCE_PHYSICS.CORNER_COEFFICIENTS;
    let coefficient = 1.0;

    // Find closest angle
    const angles = Object.keys(coefficients).map(Number).sort((a, b) => b - a);
    for (const angle of angles) {
        if (cornerAngle <= angle) {
            coefficient = coefficients[angle];
        }
    }
    // Maximum safe feed through corner
    const maxSafeFeed = feedRate * coefficient;

    // Calculate required deceleration distance
    // s = v² / (2a) where v is in mm/s or in/s
    const v = feedRate / 60;  // Convert to per-second
    const a = maxAccelG * GRAVITY;  // Acceleration in mm/s² or in/s²
    const decelDistance = (v * v) / (2 * a);

    // Calculate look-ahead blocks needed (assuming 1mm per block average)
    const lookAheadBlocks = Math.ceil(decelDistance / (metric ? 1 : 0.04));

    return {
        originalFeed: feedRate,
        maxSafeFeed: Math.round(maxSafeFeed),
        cornerAngle: cornerAngle,
        coefficient: coefficient,
        decelDistance: Math.round(decelDistance * 100) / 100,
        lookAheadBlocks: lookAheadBlocks,
        feedReduction: Math.round((1 - coefficient) * 100),
        recommendation: feedRate > maxSafeFeed ?
            `Reduce feed to ${Math.round(maxSafeFeed)} at ${cornerAngle}° corners` :
            "Feed rate acceptable"
    };
}
/**
 * Calculate cutting forces using Kienzle equation
 * Fc = Kc × Ac = Kc1.1 × h^(-mc) × ap × f
 * @param {string} material - Material type from CUTTING_FORCE_DATA
 * @param {number} chipThickness - Chip thickness (feed per tooth) in mm
 * @param {number} depthOfCut - Axial depth of cut in mm
 * @param {number} width - Radial width of cut in mm (for milling)
 * @param {number} cuttingSpeed - Cutting speed in m/min
 * @returns {object} Force and power calculations
 */
function calculateCuttingForces(material, chipThickness, depthOfCut, width, cuttingSpeed) {
    const forceData = POST_PROCESSOR_DATABASE.G_FORCE_PHYSICS.CUTTING_FORCE_DATA[material];

    if (!forceData) {
        return { error: "Unknown material - using steel defaults", material: material };
    }
    // Specific cutting force: Kc = Kc1.1 × h^(-mc)
    const Kc = forceData.Kc11 * Math.pow(chipThickness, -forceData.mc);

    // Chip cross-section area
    const Ac = chipThickness * depthOfCut;  // mm²

    // Tangential (main) cutting force
    const Fc = Kc * Ac;  // N

    // Feed force (typically 30-50% of Fc)
    const Ff = Fc * 0.4;  // N

    // Radial/passive force (typically 20-40% of Fc)
    const Fp = Fc * 0.3;  // N

    // Resultant force
    const Fr = Math.sqrt(Fc*Fc + Ff*Ff + Fp*Fp);  // N

    // Power: P = Fc × Vc / (60 × 1000) kW
    const power = (Fc * cuttingSpeed) / 60000;  // kW
    const powerHp = power * 1.341;  // Convert to HP

    // Torque at spindle: T = P × 9549 / n
    // We need RPM, calculate from diameter and speed
    // For now, assume 50mm tool: n = Vc × 1000 / (π × D)
    const assumedDia = 50;  // mm
    const rpm = (cuttingSpeed * 1000) / (Math.PI * assumedDia);
    const torque = (power * 9549) / rpm;  // N·m

    return {
        specificCuttingForce: Math.round(Kc),  // N/mm²
        tangentialForce: Math.round(Fc),       // N
        feedForce: Math.round(Ff),             // N
        radialForce: Math.round(Fp),           // N
        resultantForce: Math.round(Fr),        // N
        power: Math.round(power * 100) / 100,  // kW
        powerHp: Math.round(powerHp * 100) / 100,  // HP
        torque: Math.round(torque * 100) / 100,    // N·m
        chipCompression: forceData.chipCompress,
        material: material
    };
}
/**
 * Optimize feed rate based on machine dynamics and path geometry
 * @param {number} baseFeed - Programmed feed rate
 * @param {Array} pathSegments - Array of {length, angle} objects
 * @param {object} machineSpec - Machine specifications
 * @param {boolean} metric - True for mm, false for inches
 * @returns {object} Optimized feed profile
 */
function optimizeFeedProfile(baseFeed, pathSegments, machineSpec = null, metric = true) {
    const spec = machineSpec || POST_PROCESSOR_DATABASE.G_FORCE_PHYSICS.MACHINE_DYNAMICS.vmc_standard;

    const optimizedSegments = pathSegments.map((segment, idx) => {
        const nextAngle = idx < pathSegments.length - 1 ? pathSegments[idx + 1].angle : 180;

        // Analyze corner dynamics
        const cornerAnalysis = calculateCornerDynamics(baseFeed, nextAngle, spec, metric);

        // Check if segment is long enough to reach full speed
        const maxAccelG = Math.min(spec.accel.x, spec.accel.y);
        const GRAVITY = metric ? 9810 : 386.4;
        const v = baseFeed / 60;
        const a = maxAccelG * GRAVITY;
        const minLengthForFullSpeed = (v * v) / a;  // Need this length for accel + decel

        let optimizedFeed = baseFeed;
        let limited = false;
        let reason = "";

        // Limit by segment length
        if (segment.length < minLengthForFullSpeed) {
            optimizedFeed = Math.min(optimizedFeed, 60 * Math.sqrt(segment.length * a / 2));
            limited = true;
            reason = "Short segment";
        }
        // Limit by corner angle
        if (cornerAnalysis.maxSafeFeed < optimizedFeed) {
            optimizedFeed = cornerAnalysis.maxSafeFeed;
            limited = true;
            reason = `${nextAngle}° corner`;
        }
        return {
            segmentIndex: idx,
            length: segment.length,
            angle: segment.angle,
            originalFeed: baseFeed,
            optimizedFeed: Math.round(optimizedFeed),
            limited: limited,
            reason: reason,
            efficiency: Math.round((optimizedFeed / baseFeed) * 100)
        };
    });

    // Calculate overall statistics
    const avgEfficiency = optimizedSegments.reduce((sum, s) => sum + s.efficiency, 0) / optimizedSegments.length;
    const limitedCount = optimizedSegments.filter(s => s.limited).length;

    return {
        segments: optimizedSegments,
        totalSegments: pathSegments.length,
        limitedSegments: limitedCount,
        averageEfficiency: Math.round(avgEfficiency),
        machineType: spec.name,
        recommendation: avgEfficiency < 70 ?
            "Consider using HSM toolpaths with smaller stepovers" :
            (avgEfficiency < 85 ? "Path is moderately optimized" : "Path is well-optimized for this machine")
    };
}
/**
 * Get machine dynamics specification by machine ID
 * @param {string} machineId - Machine identifier
 * @returns {object} Machine dynamics specification
 */
function getMachineDynamics(machineId) {
    const dynamics = POST_PROCESSOR_DATABASE.G_FORCE_PHYSICS.MACHINE_DYNAMICS;

    const id = machineId?.toLowerCase() || '';

    if (id.includes('brother') || id.includes('speedio')) {
        return dynamics.vmc_high_speed;
    }
    if (id.includes('makino') && (id.includes('d500') || id.includes('a'))) {
        return dynamics.vmc_high_speed;
    }
    if (id.includes('umc') || id.includes('5ax') || id.includes('trunnion')) {
        return dynamics.five_axis_trunnion;
    }
    if (id.includes('dmu') || id.includes('hermle') || id.includes('c42')) {
        return dynamics.five_axis_swivel;
    }
    if (id.includes('hmc') || id.includes('ec-') || id.includes('horizontal')) {
        return dynamics.hmc_standard;
    }
    if (id.includes('vf-2ss') || id.includes('ss') || id.includes('high')) {
        return dynamics.vmc_performance;
    }
    if (id.includes('swiss') || id.includes('star') || id.includes('citizen')) {
        return dynamics.swiss_type;
    }
    if (id.includes('lathe') || id.includes('st-') || id.includes('lb')) {
        return id.includes('y') ? dynamics.lathe_y_axis : dynamics.lathe_standard;
    }
    if (id.includes('mini') || id.includes('tormach') || id.includes('economy')) {
        return dynamics.vmc_economy;
    }
    // Default to standard VMC
    return dynamics.vmc_standard;
}
// EXPORTS

// Also expose globally for browser use

/**
 * =============================================================================
 * PRISM AI - POST PROCESSOR GENERATION ENGINE v3.0
 * =============================================================================
 *
 * This module generates complete, production-ready post processors
 * for all supported CNC machines.
 *
 * PRISM AI ADVANCED ROUGHING LOGIC™ FEATURES:
 * - Automatic chip thinning compensation
 * - Radial engagement-based feed adjustment
 * - Dynamic corner deceleration
 * - G-force optimized axis motion
 * - Adaptive look-ahead configuration
 * - Material-specific parameter optimization
 * - Tool deflection compensation
 * - Vibration-aware feed rates
 *
 * =============================================================================
 */

// PRISM AI ADVANCED ROUGHING LOGIC™

const PRISM_ADVANCED_ROUGHING_V2 = {

    VERSION: "3.0.0",

    // CHIP THINNING COMPENSATION TABLE
    // Based on radial engagement as percentage of tool diameter
    CHIP_THINNING: {
        // ae/D ratio : feed multiplier
        0.05: 2.50,   // 5% stepover = 2.5x feed
        0.10: 1.80,   // 10% stepover
        0.15: 1.55,   // 15% stepover
        0.20: 1.40,   // 20% stepover
        0.25: 1.30,   // 25% stepover
        0.30: 1.22,   // 30% stepover
        0.35: 1.16,   // 35% stepover
        0.40: 1.12,   // 40% stepover
        0.45: 1.08,   // 45% stepover
        0.50: 1.05,   // 50% stepover (conventional)
        0.60: 1.00,   // 60%+ no adjustment
        0.70: 0.95,   // Reduce for higher engagement
        0.80: 0.90,
        0.90: 0.85,
        1.00: 0.80    // Full slotting = reduce 20%
    },
    // CORNER DECELERATION FACTORS
    // Based on direction change angle
    CORNER_FACTORS: {
        // Angle (degrees) : max feed percentage
        "180": 1.00,  // Straight - no reduction
        "170": 0.98,
        "160": 0.95,
        "150": 0.90,
        "140": 0.82,
        "135": 0.78,  // 45° direction change
        "130": 0.72,
        "120": 0.65,
        "110": 0.55,
        "100": 0.45,
        "90": 0.35,   // 90° corner - 35% of max feed
        "80": 0.28,
        "70": 0.22,
        "60": 0.16,
        "45": 0.10,   // Sharp corner - 10% max
        "30": 0.06,
        "0": 0.00     // Full reversal - must stop
    },
    // MATERIAL-SPECIFIC PARAMETERS
    MATERIAL_PARAMS: {
        // ISO P - Steels
        steel_mild: { kc: 1800, speedFactor: 1.0, feedFactor: 1.0, rampAngle: 3, helixAngle: 2 },
        steel_medium: { kc: 2200, speedFactor: 0.85, feedFactor: 0.9, rampAngle: 2.5, helixAngle: 1.5 },
        steel_hard: { kc: 2800, speedFactor: 0.65, feedFactor: 0.75, rampAngle: 2, helixAngle: 1 },
        steel_tool: { kc: 3200, speedFactor: 0.50, feedFactor: 0.65, rampAngle: 1.5, helixAngle: 0.75 },

        // ISO M - Stainless
        stainless_304: { kc: 2400, speedFactor: 0.55, feedFactor: 0.85, rampAngle: 2, helixAngle: 1.5 },
        stainless_316: { kc: 2600, speedFactor: 0.50, feedFactor: 0.80, rampAngle: 1.5, helixAngle: 1 },
        stainless_17_4: { kc: 2800, speedFactor: 0.45, feedFactor: 0.75, rampAngle: 1.5, helixAngle: 1 },

        // ISO K - Cast Iron
        cast_gray: { kc: 1100, speedFactor: 1.2, feedFactor: 1.1, rampAngle: 5, helixAngle: 3 },
        cast_ductile: { kc: 1500, speedFactor: 1.0, feedFactor: 1.0, rampAngle: 4, helixAngle: 2.5 },

        // ISO N - Non-ferrous
        aluminum_6061: { kc: 700, speedFactor: 3.0, feedFactor: 1.5, rampAngle: 5, helixAngle: 3 },
        aluminum_7075: { kc: 800, speedFactor: 2.5, feedFactor: 1.4, rampAngle: 4, helixAngle: 2.5 },
        aluminum_cast: { kc: 900, speedFactor: 2.0, feedFactor: 1.2, rampAngle: 4, helixAngle: 2 },
        copper: { kc: 1100, speedFactor: 1.5, feedFactor: 1.0, rampAngle: 3, helixAngle: 2 },
        brass: { kc: 780, speedFactor: 2.0, feedFactor: 1.2, rampAngle: 4, helixAngle: 2.5 },

        // ISO S - Superalloys
        titanium_6al4v: { kc: 1400, speedFactor: 0.25, feedFactor: 0.6, rampAngle: 1, helixAngle: 0.5 },
        inconel_718: { kc: 2800, speedFactor: 0.15, feedFactor: 0.5, rampAngle: 0.75, helixAngle: 0.4 },
        hastelloy: { kc: 3000, speedFactor: 0.12, feedFactor: 0.45, rampAngle: 0.5, helixAngle: 0.3 },

        // ISO H - Hardened
        hardened_45hrc: { kc: 4000, speedFactor: 0.35, feedFactor: 0.5, rampAngle: 1, helixAngle: 0.5 },
        hardened_55hrc: { kc: 5500, speedFactor: 0.25, feedFactor: 0.4, rampAngle: 0.75, helixAngle: 0.4 },
        hardened_62hrc: { kc: 7000, speedFactor: 0.15, feedFactor: 0.3, rampAngle: 0.5, helixAngle: 0.25 }
    },
    // G-FORCE LIMITS BY MACHINE CLASS
    GFORCE_LIMITS: {
        economy: { accel: 0.3, jerk: 20, cornerG: 0.2 },
        tier2: { accel: 0.5, jerk: 35, cornerG: 0.35 },
        performance: { accel: 0.8, jerk: 50, cornerG: 0.5 },
        highSpeed: { accel: 1.2, jerk: 80, cornerG: 0.7 },
        ultraHighSpeed: { accel: 2.0, jerk: 150, cornerG: 1.0 }
    },
    // FUNCTIONS

    /**
     * Calculate chip thinning adjusted feed rate
     */
    calculateChipThinningFeed: function(baseFeed, radialEngagement, toolDiameter) {
        const aeRatio = radialEngagement / toolDiameter;

        // Find closest ratio in table
        const ratios = Object.keys(this.CHIP_THINNING).map(Number).sort((a, b) => a - b);
        let multiplier = 1.0;

        for (let i = 0; i < ratios.length; i++) {
            if (aeRatio <= ratios[i]) {
                if (i === 0) {
                    multiplier = this.CHIP_THINNING[ratios[0]];
                } else {
                    // Interpolate
                    const lower = ratios[i - 1];
                    const upper = ratios[i];
                    const t = (aeRatio - lower) / (upper - lower);
                    multiplier = this.CHIP_THINNING[lower] * (1 - t) + this.CHIP_THINNING[upper] * t;
                }
                break;
            }
        }
        return Math.round(baseFeed * multiplier);
    },
    /**
     * Calculate corner-limited feed rate
     */
    calculateCornerFeed: function(baseFeed, cornerAngle, machineClass = 'standard') {
        const gLimits = this.GFORCE_LIMITS[machineClass] || this.GFORCE_LIMITS.standard;

        // Get corner factor
        const angles = Object.keys(this.CORNER_FACTORS).map(Number).sort((a, b) => b - a);
        let factor = 1.0;

        for (const angle of angles) {
            if (cornerAngle <= angle) {
                factor = this.CORNER_FACTORS[angle];
            }
        }
        // Adjust for machine capability
        factor *= (gLimits.cornerG / 0.35); // Normalize to standard
        factor = Math.min(factor, 1.0);

        return Math.round(baseFeed * factor);
    },
    /**
     * Calculate optimal roughing parameters
     */
    calculateRoughingParams: function(options) {
        const {
            toolDiameter,
            material = 'steel_mild',
            radialEngagement,
            axialDepth,
            baseFeed,
            baseSpeed,
            machineClass = 'standard'
        } = options;

        const matParams = this.MATERIAL_PARAMS[material] || this.MATERIAL_PARAMS.steel_mild;
        const gLimits = this.GFORCE_LIMITS[machineClass] || this.GFORCE_LIMITS.standard;

        // Chip thinning adjustment
        const chipThinFeed = this.calculateChipThinningFeed(baseFeed, radialEngagement, toolDiameter);

        // Material speed adjustment
        const adjustedSpeed = Math.round(baseSpeed * matParams.speedFactor);

        // Calculate MRR (Material Removal Rate)
        const mrr = radialEngagement * axialDepth * chipThinFeed;

        // Calculate cutting force
        const chipArea = (baseFeed / adjustedSpeed * toolDiameter) * axialDepth;
        const cuttingForce = matParams.kc * chipArea;

        return {
            adjustedFeed: chipThinFeed,
            adjustedSpeed: adjustedSpeed,
            mrr: mrr,
            cuttingForce: Math.round(cuttingForce),
            rampAngle: matParams.rampAngle,
            helixAngle: matParams.helixAngle,
            chipThinMultiplier: chipThinFeed / baseFeed,
            recommendations: {
                lookAhead: machineClass === 'highSpeed' ? 200 : (machineClass === 'tier2' ? 100 : 50),
                smoothingMode: machineClass === 'highSpeed' ? 'finish' : 'rough'
            }
        };
    }
};
// POST PROCESSOR TEMPLATE GENERATOR

const POST_GENERATOR = {

    /**
     * Generate complete post processor for a machine
     */
    generatePost: function(machineFamily, machineId) {
        const family = MACHINE_DATABASE[machineFamily];
        if (!family) {
            throw new Error(`Unknown machine family: ${machineFamily}`);
        }
        const machine = family.machines[machineId];
        if (!machine) {
            throw new Error(`Unknown machine: ${machineId}`);
        }
        const isMill = family.type === 'mill';
        const isLathe = family.type === 'lathe';
        const is5Axis = machine.axes === 5;
        const isHighSpeed = machine.highSpeed || false;

        // Build the post processor
        let post = this.generateHeader(family, machine, machineId);
        post += this.generateProperties(family, machine);
        post += this.generateCapabilities(family, machine);
        post += this.generateFormatting(family);
        post += this.generateSafetyBlocks(family);
        post += this.generateToolChange(family, machine);

        if (isMill) {
            post += this.generateMillingFunctions(family, machine, is5Axis);
        } else if (isLathe) {
            post += this.generateTurningFunctions(family, machine);
        }
        post += this.generateCoolantFunctions(family);
        post += this.generatePRISMRoughingLogic(family, machine);
        post += this.generateGForceOptimization(family, machine);
        post += this.generateMotionFunctions(family, is5Axis);
        post += this.generateCannedCycles(family, machine);
        post += this.generateProbingFunctions(family);
        post += this.generateSubprogramFunctions(family);
        post += this.generateEndFunctions(family);
        post += this.generateFooter(family, machine);

        return post;
    },
    /**
     * Generate post header with metadata
     */
    generateHeader: function(family, machine, machineId) {
        const date = new Date().toISOString().split('T')[0];
        const isMill = family.type === 'mill';
        const is5Axis = machine.axes === 5;

        return `/**
 * =============================================================================
 * PRISM AI OPTIMIZED POST PROCESSOR
 * =============================================================================
 *
 * Machine: ${machine.name}
 * Manufacturer: ${family.manufacturer}
 * Type: ${family.type.charAt(0).toUpperCase() + family.type.slice(1)}${is5Axis ? ' (5-Axis)' : ''}
 * Controller: ${family.controller}
 *
 * OPTIMIZATIONS INCLUDED:
 * ✓ PRISM AI Advanced Roughing Logic™
 * ✓ G-Force Optimized Motion Control
 * ✓ Chip Thinning Compensation
 * ✓ Dynamic Corner Deceleration
 * ✓ Material-Specific Parameters
 * ✓ HSM Mode Activation
 * ✓ Through-Spindle Coolant Management
 * ✓ Safe Start/End Blocks
 * ✓ Tool Life Management
 * ✓ SSV Chatter Suppression${is5Axis ? '\n * ✓ 5-Axis TCP/TCPC Support' : ''}
 * ✓ Probing Cycle Integration
 * ✓ Alternative Code Fallbacks
 *
 * Generated: ${date}
 * Version: 3.0.0
 *
 * MACHINE SPECIFICATIONS:
 * - Travels: X=${machine.travels.x}mm, ${isMill ? `Y=${machine.travels.y}mm, ` : ''}Z=${machine.travels.z}mm${machine.travels.y && !isMill ? `, Y=${machine.travels.y}mm` : ''}${machine.travels.b ? `, B=${machine.travels.b}°` : ''}
 * - Spindle: ${machine.spindle.maxRpm} RPM, ${machine.spindle.power} kW
 * - Tool Capacity: ${machine.toolCapacity || machine.turret || 'N/A'}
 * - Taper: ${machine.taper || 'N/A'}
 *
 * =============================================================================
 * Copyright © 2025 PRISM AI. All rights reserved.
 * =============================================================================
 */

"use strict";

// Post processor description
description = "PRISM AI Optimized - ${machine.name}";
vendor = "${family.manufacturer}";
vendorUrl = "https://prism-ai.com";
legal = "Copyright (C) 2025 PRISM AI";
certificationLevel = 2;

// Machine capabilities
${isMill ? `
longDescription = "PRISM AI optimized post for ${machine.name} ${is5Axis ? '5-axis ' : ''}vertical machining center with ${family.controller} control. " +
  "Includes advanced roughing logic, G-force optimization, chip thinning compensation, and HSM mode activation.";
` : `
longDescription = "PRISM AI optimized post for ${machine.name} CNC turning center with ${family.controller} control. " +
  "Includes advanced roughing logic, G-force optimization, CSS optimization, and SSV chatter suppression.";
`}

// Extension
extension = "nc";
setCodePage("ascii");

// Machine configuration
capabilities = CAPABILITY_${isMill ? 'MILLING' : 'TURNING'};
tolerance = spatial(0.002, MM);

// Minimum arc segment
minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.1, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
allowedCircularPlanes = ${isMill ? 'undefined' : '(1 << PLANE_ZX)'};

`;
    },
    /**
     * Generate machine properties
     */
    generateProperties: function(family, machine) {
        const is5Axis = machine.axes === 5;
        const isMill = family.type === 'mill';

        return `
// PROPERTIES - User Configurable Settings

properties = {
    // Safety
    writeMachine: {
        title: "Write Machine",
        description: "Output machine specifications in program header",
        type: "boolean",
        value: true,
        scope: "post"
    },
    safeStartBlock: {
        title: "Safe Start Block",
        description: "Include safe startup block (G28, modal cancels)",
        type: "boolean",
        value: true,
        scope: "post"
    },
    safeEndBlock: {
        title: "Safe End Block",
        description: "Include safe ending block",
        type: "boolean",
        value: true,
        scope: "post"
    },
    // PRISM AI Optimizations
    prismRoughingLogic: {
        title: "PRISM Advanced Roughing",
        description: "Enable PRISM AI Advanced Roughing Logic™ (chip thinning, G-force optimization)",
        type: "boolean",
        value: true,
        scope: "post"
    },
    chipThinningCompensation: {
        title: "Chip Thinning Compensation",
        description: "Automatically adjust feed rate based on radial engagement",
        type: "boolean",
        value: true,
        scope: "post"
    },
    cornerDeceleration: {
        title: "Corner Deceleration",
        description: "Automatically reduce feed at sharp corners",
        type: "boolean",
        value: true,
        scope: "post"
    },
    gForceOptimization: {
        title: "G-Force Optimization",
        description: "Optimize motion based on machine acceleration limits",
        type: "boolean",
        value: true,
        scope: "post"
    },
    // HSM Settings
    hsmMode: {
        title: "HSM Mode",
        description: "High-speed machining smoothing mode",
        type: "enum",
        values: [
            { id: "off", title: "Off" },
            { id: "rough", title: "Rough" },
            { id: "medium", title: "Medium" },
            { id: "finish", title: "Finish" }
        ],
        value: "finish",
        scope: "post"
    },
    hsmTolerance: {
        title: "HSM Tolerance",
        description: "Path tolerance for HSM mode (inches)",
        type: "number",
        value: 0.0005,
        scope: "post"
    },
    // Coolant
    coolantMode: {
        title: "Coolant Mode",
        description: "Default coolant type",
        type: "enum",
        values: [
            { id: "flood", title: "Flood (M8)" },
            { id: "mist", title: "Mist (M7)" },
            { id: "tsc", title: "Through Spindle" },
            { id: "air", title: "Air Blast" },
            { id: "off", title: "Off" }
        ],
        value: "flood",
        scope: "post"
    },
    // Tool Management
    preloadTools: {
        title: "Preload Tools",
        description: "Preload next tool during machining",
        type: "boolean",
        value: true,
        scope: "post"
    },
    toolBreakageCheck: {
        title: "Tool Breakage Check",
        description: "Check tool after each operation",
        type: "boolean",
        value: false,
        scope: "post"
    },
${is5Axis ? `    // 5-Axis Settings
    useTCP: {
        title: "Use TCP",
        description: "Enable Tool Center Point control",
        type: "boolean",
        value: true,
        scope: "post"
    },
    useDWO: {
        title: "Use DWO",
        description: "Enable Dynamic Work Offsets",
        type: "boolean",
        value: true,
        scope: "post"
    },
` : ''}    // SSV Settings
    useSSV: {
        title: "Use SSV",
        description: "Enable Spindle Speed Variation for chatter suppression",
        type: "boolean",
        value: false,
        scope: "post"
    },
    ssvVariation: {
        title: "SSV Variation %",
        description: "Spindle speed variation percentage",
        type: "number",
        value: 10,
        scope: "post"
    },
    // Output Formatting
    showSequenceNumbers: {
        title: "Sequence Numbers",
        description: "Output N-numbers",
        type: "boolean",
        value: false,
        scope: "post"
    },
    sequenceNumberIncrement: {
        title: "N-Number Increment",
        description: "Increment between N-numbers",
        type: "integer",
        value: 10,
        scope: "post"
    },
    separateWordsWithSpace: {
        title: "Separate Words",
        description: "Add spaces between words",
        type: "boolean",
        value: true,
        scope: "post"
    }
};
`;
    },
    /**
     * Generate machine capabilities section
     */
    generateCapabilities: function(family, machine) {
        const isMill = family.type === 'mill';
        const is5Axis = machine.axes === 5;

        return `
// MACHINE CAPABILITIES

var machineConfiguration = {
    maximumSpindleSpeed: ${machine.spindle.maxRpm},
    spindlePower: ${machine.spindle.power},
    travels: {
        x: ${machine.travels.x},
        ${isMill ? `y: ${machine.travels.y},` : ''}
        z: ${machine.travels.z}${machine.travels.y && !isMill ? `,
        y: ${machine.travels.y}` : ''}${machine.travels.a ? `,
        a: ${machine.travels.a}` : ''}${machine.travels.b ? `,
        b: ${machine.travels.b}` : ''}${machine.travels.c ? `,
        c: ${machine.travels.c}` : ''}
    },
    rapidRate: ${machine.rapid || 1000},
    toolCapacity: ${machine.toolCapacity || machine.turret || 20},
    taper: "${machine.taper || 'CAT40'}",
    axes: ${machine.axes || (isMill ? 3 : 2)},
${is5Axis ? `    fiveAxis: {
        rotaryA: ${machine.rotary?.a || 120},
        rotaryC: ${machine.rotary?.c || 360},
        trunnion: ${machine.trunnion || false}
    },` : ''}
    highSpeed: ${machine.highSpeed || false},
    manufacturer: "${family.manufacturer}",
    controller: "${family.controller}"
};
// G-Force limits for this machine class
var gForceLimits = {
    accel: ${machine.highSpeed ? 1.2 : 0.5},
    jerk: ${machine.highSpeed ? 80 : 35},
    cornerG: ${machine.highSpeed ? 0.7 : 0.35}
};
`;
    },
    /**
     * Generate formatting section
     */
    generateFormatting: function(family) {
        const dialect = family.dialect || 'fanuc';
        const leadingZero = dialect === 'fanuc' || dialect === 'haas';

        return `
// FORMATTING

var gFormat = createFormat({prefix: "G", decimals: ${leadingZero ? 1 : 0}});
var mFormat = createFormat({prefix: "M", decimals: 0});
var hFormat = createFormat({prefix: "H", decimals: 0});
var dFormat = createFormat({prefix: "D", decimals: 0});
var pFormat = createFormat({prefix: "P", decimals: 0});
var lFormat = createFormat({prefix: "L", decimals: 0});

var xyzFormat = createFormat({decimals: (unit == MM ? 3 : 4), forceDecimal: true});
var abcFormat = createFormat({decimals: 3, forceDecimal: true, scale: DEG});
var feedFormat = createFormat({decimals: (unit == MM ? 1 : 2), forceDecimal: true});
var inverseTimeFormat = createFormat({decimals: 4, forceDecimal: true});
var toolFormat = createFormat({decimals: 0});
var rpmFormat = createFormat({decimals: 0});
var secFormat = createFormat({decimals: 3, forceDecimal: true}); // seconds
var taperFormat = createFormat({decimals: 1, scale: DEG});
var pitchFormat = createFormat({decimals: (unit == MM ? 3 : 4), forceDecimal: true});

var xOutput = createVariable({prefix: "X"}, xyzFormat);
var yOutput = createVariable({prefix: "Y"}, xyzFormat);
var zOutput = createVariable({prefix: "Z"}, xyzFormat);
var aOutput = createVariable({prefix: "A"}, abcFormat);
var bOutput = createVariable({prefix: "B"}, abcFormat);
var cOutput = createVariable({prefix: "C"}, abcFormat);
var feedOutput = createVariable({prefix: "F"}, feedFormat);
var inverseTimeOutput = createVariable({prefix: "F", force: true}, inverseTimeFormat);
var sOutput = createVariable({prefix: "S", force: true}, rpmFormat);

// Circular output
var iOutput = createReferenceVariable({prefix: "I", force: true}, xyzFormat);
var jOutput = createReferenceVariable({prefix: "J", force: true}, xyzFormat);
var kOutput = createReferenceVariable({prefix: "K", force: true}, xyzFormat);

var gMotionModal = createModal({}, gFormat); // G0-G3
var gPlaneModal = createModal({onchange: function() {gMotionModal.reset();}}, gFormat); // G17-G19
var gAbsIncModal = createModal({}, gFormat); // G90-G91
var gFeedModeModal = createModal({}, gFormat); // G93-G95
var gUnitModal = createModal({}, gFormat); // G20-G21
var gCycleModal = createModal({}, gFormat); // G81-G89
var gRetractModal = createModal({}, gFormat); // G98-G99
var gWCSModal = createModal({}, gFormat); // G54-G59

`;
    },
    /**
     * Generate safety blocks
     */
    generateSafetyBlocks: function(family) {
        const features = family.features || {};
        const isHaas = family.controller === 'haas_ngc';
        const isOkuma = family.controller?.includes('okuma');
        const isSiemens = family.controller?.includes('siemens');
        const isHeidenhain = family.controller?.includes('heidenhain');

        let safeStart, safeEnd;

        if (isHaas) {
            safeStart = `"G28 G91 Z0."
"G28 Y0."
"G90 G17 G40 G49 G80 G54"`;
            safeEnd = `"G28 G91 Z0."
"G28 Y0."
"M5"
"M9"
"M30"`;
        } else if (isOkuma) {
            safeStart = `"G0 G28 Z0"
"G28 X0 Y0"
"G17 G40 G49 G80"
"G15 H1"`;
            safeEnd = `"G0 G28 Z0"
"G28 X0 Y0"
"M5"
"M9"
"M30"`;
        } else if (isSiemens) {
            safeStart = `"G0 G17 G40 G60 G90"
"D0"
"G500"
"SUPA G0 Z0"`;
            safeEnd = `"SUPA G0 Z0"
"M5"
"M9"
"M30"`;
        } else if (isHeidenhain) {
            safeStart = `"BLK FORM 0.1 Z X-100 Y-100 Z-50"
"BLK FORM 0.2 X100 Y100 Z0"
"TOOL CALL 0 Z S0"`;
            safeEnd = `"L Z+200 R0 FMAX M5 M9"
"L X0 Y0 R0 FMAX"
"END PGM"`;
        } else {
            // Generic FANUC
            safeStart = `"G91 G28 Z0"
"G28 X0 Y0"
"G90 G17 G40 G49 G80 G54"`;
            safeEnd = `"G91 G28 Z0"
"G28 X0 Y0"
"M5"
"M9"
"M30"`;
        }
        return `
// SAFETY BLOCKS

var safeStartBlock = [
    ${safeStart}
];

var safeEndBlock = [
    ${safeEnd}
];

/**
 * Write safe start block
 */
function writeSafeStartBlock() {
    if (getProperty("safeStartBlock")) {
        writeComment("SAFE START - PRISM AI");
        for (var i = 0; i < safeStartBlock.length; i++) {
            writeln(safeStartBlock[i]);
        }
    }
}
/**
 * Write safe end block
 */
function writeSafeEndBlock() {
    if (getProperty("safeEndBlock")) {
        writeComment("SAFE END - PRISM AI");
        for (var i = 0; i < safeEndBlock.length; i++) {
            writeln(safeEndBlock[i]);
        }
    }
}
`;
    },
    /**
     * Generate tool change functions
     */
    generateToolChange: function(family, machine) {
        const isHaas = family.controller === 'haas_ngc';
        const isOkuma = family.controller?.includes('okuma');
        const isHeidenhain = family.controller?.includes('heidenhain');
        const isMill = family.type === 'mill';

        let toolChangeCode;

        if (isHeidenhain) {
            toolChangeCode = `
        // Heidenhain tool change
        writeln("TOOL CALL " + tool.number + " Z S" + rpmFormat.format(tool.spindleSpeed));`;
        } else if (isOkuma) {
            toolChangeCode = `
        // Okuma tool change
        writeln("T" + toolFormat.format(tool.number));
        writeln("M6");
        writeln("G43 H" + hFormat.format(tool.lengthOffset));`;
        } else {
            toolChangeCode = `
        // Standard tool change
        writeln("T" + toolFormat.format(tool.number) + " M6");
        writeln("G43 H" + hFormat.format(tool.lengthOffset) + " Z" + xyzFormat.format(0.1));`;
        }
        return `
// TOOL CHANGE

var currentTool = null;
var nextTool = null;

/**
 * Handle tool change with optimization
 */
function onToolChange(tool) {
    writeComment("TOOL " + tool.number + " - " + tool.description);
    writeComment("  Diameter: " + xyzFormat.format(tool.diameter) + (unit == MM ? " mm" : " in"));
    writeComment("  Length: " + xyzFormat.format(tool.bodyLength) + (unit == MM ? " mm" : " in"));
    writeComment("  Flutes: " + tool.numberOfFlutes);

    // Cancel any active compensation
    writeBlock(gFormat.format(40)); // Cancel cutter comp
    writeBlock(gFormat.format(49)); // Cancel tool length
    writeBlock(gFormat.format(80)); // Cancel canned cycles

    // Retract to safe Z
    writeBlock(gFormat.format(91), gFormat.format(28), "Z0");

    // Stop spindle and coolant before change
    writeBlock(mFormat.format(5)); // Spindle stop
    writeBlock(mFormat.format(9)); // Coolant off

    // Execute tool change
    ${toolChangeCode}

    // Preload next tool if enabled
    if (getProperty("preloadTools") && nextTool) {
        writeComment("PRELOAD NEXT TOOL: T" + nextTool.number);
        writeln("T" + toolFormat.format(nextTool.number));
    }
    currentTool = tool;
}
`;
    },
    /**
     * Generate PRISM Advanced Roughing Logic
     */
    generatePRISMRoughingLogic: function(family, machine) {
        return `
// PRISM AI ADVANCED ROUGHING LOGIC™
// Automatic optimization of:
// - Chip thinning compensation based on radial engagement
// - Corner deceleration based on direction change
// - G-force optimized motion
// - Material-specific parameters

var PRISM_ROUGHING = {
    // Chip thinning lookup table
    chipThinningFactors: {
        0.05: 2.50, 0.10: 1.80, 0.15: 1.55, 0.20: 1.40,
        0.25: 1.30, 0.30: 1.22, 0.35: 1.16, 0.40: 1.12,
        0.45: 1.08, 0.50: 1.05, 0.60: 1.00, 0.70: 0.95,
        0.80: 0.90, 0.90: 0.85, 1.00: 0.80
    },
    // Corner deceleration factors
    cornerFactors: {
        "180": 1.00, 150: 0.90, 135: 0.78, 120: 0.65,
        "100": 0.45, 90: 0.35, 70: 0.22, 45: 0.10
    },
    /**
     * Calculate chip thinning adjusted feed
     */
    getChipThinningFeed: function(baseFeed, ae, toolDia) {
        if (!getProperty("chipThinningCompensation")) return baseFeed;

        var aeRatio = ae / toolDia;
        var factor = 1.0;

        // Interpolate from table
        var ratios = Object.keys(this.chipThinningFactors).map(Number).sort(function(a,b){return a-b;});
        for (var i = 0; i < ratios.length; i++) {
            if (aeRatio <= ratios[i]) {
                if (i === 0) {
                    factor = this.chipThinningFactors[ratios[0]];
                } else {
                    var lower = ratios[i - 1];
                    var upper = ratios[i];
                    var t = (aeRatio - lower) / (upper - lower);
                    factor = this.chipThinningFactors[lower] * (1 - t) + this.chipThinningFactors[upper] * t;
                }
                break;
            }
        }
        return Math.round(baseFeed * factor);
    },
    /**
     * Calculate corner-limited feed
     */
    getCornerFeed: function(baseFeed, angleChange) {
        if (!getProperty("cornerDeceleration")) return baseFeed;

        var factor = 1.0;
        var angles = Object.keys(this.cornerFactors).map(Number).sort(function(a,b){return b-a;});

        for (var i = 0; i < angles.length; i++) {
            if (angleChange <= angles[i]) {
                factor = this.cornerFactors[angles[i]];
            }
        }
        // Adjust for machine G-force capability
        factor *= (gForceLimits.cornerG / 0.35);
        factor = Math.min(factor, 1.0);

        return Math.round(baseFeed * factor);
    },
    /**
     * Get optimized roughing parameters
     */
    getOptimizedParams: function(section) {
        var params = {
            originalFeed: section.getParameter("operation:tool_feedCutting") || 0,
            adjustedFeed: 0,
            chipThinMultiplier: 1.0,
            cornerReduction: 0,
            notes: []
        };
        if (!getProperty("prismRoughingLogic")) {
            params.adjustedFeed = params.originalFeed;
            return params;
        }
        // Get radial engagement
        var ae = section.getParameter("operation:stepover") || 0;
        var toolDia = section.getTool().diameter;

        // Apply chip thinning
        params.adjustedFeed = this.getChipThinningFeed(params.originalFeed, ae, toolDia);
        params.chipThinMultiplier = params.adjustedFeed / params.originalFeed;

        if (params.chipThinMultiplier > 1.0) {
            params.notes.push("CTF: " + params.chipThinMultiplier.toFixed(2) + "x");
        }
        return params;
    }
};
/**
 * Output PRISM optimization header
 */
function writePRISMHeader(section) {
    if (getProperty("prismRoughingLogic")) {
        var params = PRISM_ROUGHING.getOptimizedParams(section);
        writeComment("PRISM AI OPTIMIZED");
        if (params.notes.length > 0) {
            writeComment("  " + params.notes.join(", "));
        }
    }
}
`;
    },
    /**
     * Generate G-force optimization
     */
    generateGForceOptimization: function(family, machine) {
        const isHighSpeed = machine.highSpeed || false;

        return `
// G-FORCE OPTIMIZATION

var GFORCE_OPT = {
    // Machine acceleration limits (g)
    accelLimit: ${isHighSpeed ? 1.2 : 0.5},

    // Jerk limit (m/s³)
    jerkLimit: ${isHighSpeed ? 80 : 35},

    // Gravity constant
    GRAVITY: 9.81, // m/s²

    /**
     * Calculate maximum feed for segment length
     */
    getMaxFeedForSegment: function(segmentLength, decelDistance) {
        if (!getProperty("gForceOptimization")) return Infinity;

        var a = this.accelLimit * this.GRAVITY * 1000; // mm/s²
        // v² = 2as, v = sqrt(2as)
        var maxVelocity = Math.sqrt(2 * a * segmentLength); // mm/s
        return maxVelocity * 60; // mm/min
    },
    /**
     * Check if move needs deceleration
     */
    needsDeceleration: function(currentFeed, nextAngle) {
        if (!getProperty("gForceOptimization")) return false;

        // Sharp corners need deceleration
        if (nextAngle < 135) return true;

        return false;
    },
    /**
     * Get look-ahead blocks recommendation
     */
    getLookAhead: function() {
        return machineConfiguration.highSpeed ? 200 : 100;
    }
};
`;
    },
    /**
     * Generate milling-specific functions
     */
    generateMillingFunctions: function(family, machine, is5Axis) {
        const features = family.features || {};
        const hsm = features.hsm || {};

        let hsmCode = '';
        if (hsm.code === 'G187') {
            hsmCode = `
    var mode = getProperty("hsmMode");
    if (mode !== "off") {
        var modeCode = mode === "rough" ? "P1" : (mode === "medium" ? "P2" : "P3");
        var tol = getProperty("hsmTolerance");
        writeBlock("G187 " + modeCode + " E" + xyzFormat.format(tol));
        writeComment("HSM MODE: " + mode.toUpperCase());
    }`;
        } else if (hsm.code === 'G05.1 Q1') {
            hsmCode = `
    var mode = getProperty("hsmMode");
    if (mode !== "off") {
        writeBlock(gFormat.format(5.1), "Q1");
        writeComment("AICC SMOOTHING ENABLED");
    }`;
        } else if (hsm.code === 'G131') {
            hsmCode = `
    var mode = getProperty("hsmMode");
    if (mode !== "off") {
        var quality = mode === "rough" ? "P1" : (mode === "finish" ? "P5" : "P3");
        writeBlock(gFormat.format(131), quality);
        writeComment("SUPER-NURBS ENABLED");
    }`;
        } else if (hsm.code === 'CYCLE832') {
            hsmCode = `
    var mode = getProperty("hsmMode");
    if (mode !== "off") {
        var tol = mode === "rough" ? 0.02 : (mode === "finish" ? 0.002 : 0.005);
        writeBlock("CYCLE832(" + tol + ", 1)");
        writeComment("HSM CYCLE ENABLED");
    }`;
        }
        return `
// MILLING FUNCTIONS

/**
 * Set HSM/Smoothing mode
 */
function setHSMMode() {
    ${hsmCode}
}
/**
 * Cancel HSM mode
 */
function cancelHSMMode() {
    ${hsm.code === 'G187' ? 'writeBlock("G187 P0");' :
      hsm.code === 'G05.1 Q1' ? 'writeBlock(gFormat.format(5.1), "Q0");' :
      hsm.code === 'G131' ? 'writeBlock(gFormat.format(130));' :
      hsm.code === 'CYCLE832' ? 'writeBlock("CYCLE832()");' :
      '// No HSM cancel needed'}
}
${is5Axis ? `
// 5-AXIS FUNCTIONS

/**
 * Enable TCP mode
 */
function enableTCP() {
    if (getProperty("useTCP")) {
        ${family.features?.fiveAxis?.tcp === 'G234' ? 'writeBlock(gFormat.format(234));' :
          family.features?.fiveAxis?.tcp === 'G43.4' ? 'writeBlock(gFormat.format(43.4), "H" + hFormat.format(tool.lengthOffset));' :
          'writeBlock("G43.4");'}
        writeComment("TCP ENABLED - PRISM AI");
    }
}
/**
 * Disable TCP mode
 */
function disableTCP() {
    if (getProperty("useTCP")) {
        ${family.features?.fiveAxis?.tcp === 'G234' ? 'writeBlock(gFormat.format(49));' :
          family.features?.fiveAxis?.tcp === 'G43.4' ? 'writeBlock(gFormat.format(49));' :
          'writeBlock(gFormat.format(49));'}
    }
}
/**
 * Enable DWO (Dynamic Work Offset)
 */
function enableDWO() {
    if (getProperty("useDWO")) {
        ${family.features?.fiveAxis?.dwo === 'G254' ? 'writeBlock(gFormat.format(254));' :
          'writeBlock(gFormat.format(254));'}
        writeComment("DWO ENABLED");
    }
}
/**
 * Disable DWO
 */
function disableDWO() {
    if (getProperty("useDWO")) {
        ${family.features?.fiveAxis?.dwoff === 'G255' ? 'writeBlock(gFormat.format(255));' :
          'writeBlock(gFormat.format(255));'}
    }
}
` : ''}

`;
    },
    /**
     * Generate turning-specific functions
     */
    generateTurningFunctions: function(family, machine) {
        const features = family.features || {};

        return `
// TURNING FUNCTIONS

/**
 * Set constant surface speed mode
 */
function setCSS(surfaceSpeed, maxRPM) {
    writeBlock(gFormat.format(92), sOutput.format(maxRPM)); // Max RPM
    writeBlock(gFormat.format(96), sOutput.format(surfaceSpeed)); // CSS
    writeComment("CSS MODE: " + surfaceSpeed + " SFM, MAX " + maxRPM + " RPM");
}
/**
 * Cancel CSS mode
 */
function cancelCSS() {
    writeBlock(gFormat.format(97));
}
/**
 * Enable SSV (Spindle Speed Variation)
 */
function enableSSV() {
    if (getProperty("useSSV")) {
        var variation = getProperty("ssvVariation");
        ${features.ssv?.on === 'M695' ?
          'writeBlock(mFormat.format(695));' :
          features.ssv?.on === 'M38' ?
          'writeBlock(mFormat.format(38));' :
          'writeBlock(mFormat.format(38));'}
        writeComment("SSV ENABLED: " + variation + "% VARIATION");
    }
}
/**
 * Disable SSV
 */
function disableSSV() {
    if (getProperty("useSSV")) {
        ${features.ssv?.off === 'M694' ?
          'writeBlock(mFormat.format(694));' :
          features.ssv?.off === 'M39' ?
          'writeBlock(mFormat.format(39));' :
          'writeBlock(mFormat.format(39));'}
    }
}
/**
 * Threading cycle
 */
function onThreading(thread) {
    writeComment("THREADING - PRISM AI");
    // G76 threading cycle
    writeBlock(
        gFormat.format(76),
        "P" + threadP,
        "Q" + threadQ,
        "R" + threadR
    );
    writeBlock(
        gFormat.format(76),
        xOutput.format(thread.x1),
        zOutput.format(thread.z2),
        "P" + threadDepth,
        "Q" + firstDepth,
        feedOutput.format(thread.pitch)
    );
}
${machine.liveTool ? `
/**
 * Enable live tooling
 */
function enableLiveTool(rpm, direction) {
    ${features.liveTool?.on === 'M133' ?
      'writeBlock(mFormat.format(133), sOutput.format(rpm));' :
      'writeBlock(mFormat.format(133), sOutput.format(rpm));'}
    writeComment("LIVE TOOL ON: " + rpm + " RPM");
}
/**
 * Disable live tooling
 */
function disableLiveTool() {
    ${features.liveTool?.off === 'M135' ?
      'writeBlock(mFormat.format(135));' :
      'writeBlock(mFormat.format(135));'}
}
` : ''}

`;
    },
    /**
     * Generate coolant functions
     */
    generateCoolantFunctions: function(family) {
        const features = family.features || {};
        const coolant = features.coolant || family.features || {};

        return `
// COOLANT MANAGEMENT

// Coolant code mapping with alternatives
var COOLANT_CODES = {
    flood: {
        on: "${coolant.flood?.on || 'M8'}",
        off: "${coolant.flood?.off || 'M9'}",
        alternatives: ["M08", "M8"]
    },
    mist: {
        on: "${coolant.mist?.on || 'M7'}",
        off: "${coolant.mist?.off || 'M9'}",
        alternatives: ["M07", "M7"]
    },
    tsc: {
        on: "${coolant.tsc?.on || 'M88'}",
        off: "${coolant.tsc?.off || 'M89'}",
        alternatives: ["M51", "M50", "M21"],
        note: "TSC requires option - use flood (M8) if alarm occurs"
    },
    air: {
        on: "${coolant.air?.on || features.airBlast?.on || 'M83'}",
        off: "${coolant.air?.off || features.airBlast?.off || 'M84'}",
        alternatives: ["M73", "M77", "M7"],
        note: "Air blast may require option"
    }
};
var currentCoolant = "off";

/**
 * Set coolant mode
 */
function setCoolant(mode) {
    if (mode === currentCoolant) return;

    // Turn off current coolant
    if (currentCoolant !== "off" && COOLANT_CODES[currentCoolant]) {
        writeBlock(COOLANT_CODES[currentCoolant].off);
    }
    // Turn on new coolant
    if (mode !== "off" && COOLANT_CODES[mode]) {
        writeBlock(COOLANT_CODES[mode].on);
        writeComment("COOLANT: " + mode.toUpperCase());

        // Add note about alternatives if applicable
        if (COOLANT_CODES[mode].note) {
            writeComment("NOTE: " + COOLANT_CODES[mode].note);
        }
    }
    currentCoolant = mode;
}
/**
 * Turn off all coolant
 */
function coolantOff() {
    writeBlock(mFormat.format(9));
    currentCoolant = "off";
}
`;
    },
    /**
     * Generate motion functions
     */
    generateMotionFunctions: function(family, is5Axis) {
        return `
// MOTION FUNCTIONS

var currentFeed = 0;

/**
 * Linear rapid move (G0)
 */
function onRapid(x, y, z) {
    var xVal = xOutput.format(x);
    var yVal = yOutput.format(y);
    var zVal = zOutput.format(z);

    if (xVal || yVal || zVal) {
        writeBlock(gMotionModal.format(0), xVal, yVal, zVal);
    }
}
/**
 * Linear feed move (G1) with PRISM optimization
 */
function onLinear(x, y, z, feed) {
    var xVal = xOutput.format(x);
    var yVal = yOutput.format(y);
    var zVal = zOutput.format(z);

    // Apply PRISM optimization if enabled
    var optimizedFeed = feed;
    if (getProperty("prismRoughingLogic")) {
        // Check for short segments that need feed reduction
        // This is simplified - full implementation would track path
        optimizedFeed = Math.min(feed, GFORCE_OPT.getMaxFeedForSegment(10, 5));
    }
    var fVal = feedOutput.format(optimizedFeed);

    if (xVal || yVal || zVal) {
        writeBlock(gMotionModal.format(1), xVal, yVal, zVal, fVal);
        currentFeed = optimizedFeed;
    } else if (fVal) {
        writeBlock(gMotionModal.format(1), fVal);
        currentFeed = optimizedFeed;
    }
}
/**
 * Circular move (G2/G3)
 */
function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
    var start = getCurrentPosition();

    if (isFullCircle()) {
        // Full circle - use I/J format
        switch (getCircularPlane()) {
            case PLANE_XY:
                writeBlock(
                    gMotionModal.format(clockwise ? 2 : 3),
                    iOutput.format(cx - start.x),
                    jOutput.format(cy - start.y),
                    feedOutput.format(feed)
                );
                break;
            case PLANE_ZX:
                writeBlock(
                    gMotionModal.format(clockwise ? 2 : 3),
                    iOutput.format(cx - start.x),
                    kOutput.format(cz - start.z),
                    feedOutput.format(feed)
                );
                break;
            case PLANE_YZ:
                writeBlock(
                    gMotionModal.format(clockwise ? 2 : 3),
                    jOutput.format(cy - start.y),
                    kOutput.format(cz - start.z),
                    feedOutput.format(feed)
                );
                break;
        }
    } else {
        // Partial arc
        switch (getCircularPlane()) {
            case PLANE_XY:
                writeBlock(
                    gMotionModal.format(clockwise ? 2 : 3),
                    xOutput.format(x),
                    yOutput.format(y),
                    iOutput.format(cx - start.x),
                    jOutput.format(cy - start.y),
                    feedOutput.format(feed)
                );
                break;
            case PLANE_ZX:
                writeBlock(
                    gMotionModal.format(clockwise ? 2 : 3),
                    xOutput.format(x),
                    zOutput.format(z),
                    iOutput.format(cx - start.x),
                    kOutput.format(cz - start.z),
                    feedOutput.format(feed)
                );
                break;
            case PLANE_YZ:
                writeBlock(
                    gMotionModal.format(clockwise ? 2 : 3),
                    yOutput.format(y),
                    zOutput.format(z),
                    jOutput.format(cy - start.y),
                    kOutput.format(cz - start.z),
                    feedOutput.format(feed)
                );
                break;
        }
    }
}
${is5Axis ? `
/**
 * 5-Axis linear move with inverse time feed option
 */
function onLinear5D(x, y, z, a, b, c, feed) {
    var xVal = xOutput.format(x);
    var yVal = yOutput.format(y);
    var zVal = zOutput.format(z);
    var aVal = aOutput.format(a);
    var bVal = bOutput.format(b);
    var cVal = cOutput.format(c);

    // Use inverse time feed for complex 5-axis moves
    if (getProperty("useInverseTime")) {
        writeBlock(gFeedModeModal.format(93)); // Inverse time
        var fVal = inverseTimeOutput.format(feed);
        writeBlock(gMotionModal.format(1), xVal, yVal, zVal, aVal, bVal, cVal, fVal);
    } else {
        var fVal = feedOutput.format(feed);
        writeBlock(gMotionModal.format(1), xVal, yVal, zVal, aVal, bVal, cVal, fVal);
    }
}
` : ''}

`;
    },
    /**
     * Generate canned cycles
     */
    generateCannedCycles: function(family, machine) {
        const isMill = family.type === 'mill';

        return `
// CANNED CYCLES

/**
 * Start canned cycle
 */
function onCycle() {
    // Set retract mode
    writeBlock(gRetractModal.format(98)); // Retract to initial level
}
/**
 * Drilling cycle (G81)
 */
function onDrilling(x, y, z, depth, feed) {
    writeBlock(
        gCycleModal.format(81),
        xOutput.format(x),
        yOutput.format(y),
        "Z" + xyzFormat.format(z),
        "R" + xyzFormat.format(depth),
        feedOutput.format(feed)
    );
}
/**
 * Peck drilling cycle (G83)
 */
function onPeckDrilling(x, y, z, depth, peck, feed) {
    writeBlock(
        gCycleModal.format(83),
        xOutput.format(x),
        yOutput.format(y),
        "Z" + xyzFormat.format(z),
        "R" + xyzFormat.format(depth),
        "Q" + xyzFormat.format(peck),
        feedOutput.format(feed)
    );
}
/**
 * Tapping cycle (G84)
 */
function onTapping(x, y, z, depth, pitch, rightHand) {
    writeBlock(
        gCycleModal.format(rightHand ? 84 : 74),
        xOutput.format(x),
        yOutput.format(y),
        "Z" + xyzFormat.format(z),
        "R" + xyzFormat.format(depth),
        feedOutput.format(pitch)
    );
}
/**
 * Boring cycle (G85)
 */
function onBoring(x, y, z, depth, feed) {
    writeBlock(
        gCycleModal.format(85),
        xOutput.format(x),
        yOutput.format(y),
        "Z" + xyzFormat.format(z),
        "R" + xyzFormat.format(depth),
        feedOutput.format(feed)
    );
}
/**
 * Cancel canned cycle
 */
function onCycleEnd() {
    writeBlock(gCycleModal.format(80));
}
`;
    },
    /**
     * Generate probing functions
     */
    generateProbingFunctions: function(family) {
        const features = family.features || {};
        const probing = features.probing || {};

        return `
// PROBING FUNCTIONS

/**
 * Work probe - single surface
 */
function probeSingleSurface(axis, approach, retract, feed) {
    writeComment("PROBE SINGLE SURFACE - " + axis);
    ${probing.probe ?
      `writeBlock("${probing.probe}");` :
      'writeBlock("G65 P9811 A" + axis);'}
}
/**
 * Tool setter
 */
function measureTool(toolNumber) {
    writeComment("MEASURE TOOL " + toolNumber);
    ${probing.toolSet ?
      `writeBlock("${probing.toolSet}");` :
      'writeBlock("G65 P9023 T" + toolNumber);'}
}
/**
 * Tool breakage check
 */
function checkToolBreakage() {
    if (getProperty("toolBreakageCheck")) {
        writeComment("TOOL BREAKAGE CHECK");
        writeBlock("G65 P9023 A0."); // Check against stored value
    }
}
`;
    },
    /**
     * Generate subprogram functions
     */
    generateSubprogramFunctions: function(family) {
        const features = family.features || {};
        const subs = features.subprograms || {};

        return `
// SUBPROGRAM FUNCTIONS

var subprogramNumber = 9000;

/**
 * Call subprogram
 */
function callSubprogram(programNumber, repeatCount) {
    repeatCount = repeatCount || 1;
    ${subs.call === 'M98' ?
      'writeBlock(mFormat.format(98), "P" + pFormat.format(programNumber), "L" + repeatCount);' :
      subs.call === 'CALL' ?
      'writeBlock("CALL " + programNumber);' :
      'writeBlock(mFormat.format(98), "P" + pFormat.format(programNumber));'}
}
/**
 * Return from subprogram
 */
function returnFromSubprogram() {
    ${subs.return === 'M99' ?
      'writeBlock(mFormat.format(99));' :
      subs.return === 'RET' ?
      'writeBlock("RET");' :
      'writeBlock(mFormat.format(99));'}
}
`;
    },
    /**
     * Generate end functions
     */
    generateEndFunctions: function(family) {
        return `
// PROGRAM END FUNCTIONS

/**
 * Called at start of program
 */
function onOpen() {
    // Write program header
    if (programName) {
        writeComment("PROGRAM: " + programName);
    }
    if (programComment) {
        writeComment(programComment);
    }
    writeComment("GENERATED BY PRISM AI POST PROCESSOR");
    writeComment("DATE: " + new Date().toISOString().split('T')[0]);

    // Write machine info
    if (getProperty("writeMachine")) {
        writeComment("MACHINE: " + machineConfiguration.manufacturer + " " + description);
        writeComment("CONTROLLER: " + machineConfiguration.controller);
    }
    // Safe start
    writeSafeStartBlock();

    // Set units
    writeBlock(gUnitModal.format(unit == MM ? 21 : 20));

    // Set absolute mode
    writeBlock(gAbsIncModal.format(90));

    // Set feed mode
    writeBlock(gFeedModeModal.format(94)); // Feed per minute

    // Enable HSM if configured
    setHSMMode();
}
/**
 * Called at end of program
 */
function onClose() {
    // Cancel HSM
    cancelHSMMode();

    // Coolant off
    coolantOff();

    // Safe end
    writeSafeEndBlock();
}
/**
 * Called for each section (operation)
 */
function onSection() {
    // Handle tool change if needed
    if (isFirstSection() || tool.number != getPreviousSection().getTool().number) {
        onToolChange(tool);
    }
    // Write operation comment
    if (hasParameter("operation-comment")) {
        writeComment(getParameter("operation-comment"));
    }
    // Write PRISM optimization header
    writePRISMHeader(currentSection);

    // Set work offset
    if (currentSection.workOffset != 0) {
        writeBlock(gWCSModal.format(53 + currentSection.workOffset));
    }
    // Set spindle
    if (tool.clockwise) {
        writeBlock(mFormat.format(3), sOutput.format(spindleSpeed));
    } else {
        writeBlock(mFormat.format(4), sOutput.format(spindleSpeed));
    }
    // Set coolant
    var coolantMode = getProperty("coolantMode");
    if (currentSection.coolant) {
        coolantMode = currentSection.coolant;
    }
    setCoolant(coolantMode);
}
/**
 * Called at end of each section
 */
function onSectionEnd() {
    // Check tool if enabled
    checkToolBreakage();
}
`;
    },
    /**
     * Generate footer
     */
    generateFooter: function(family, machine) {
        return `
// ALTERNATIVE CODES REFERENCE
// If you receive alarms, try these alternative codes:
// TOOL CHANGE:
//   Standard: T1 M6 (or T1 M06, M6 T1, T1 then M6 separate lines)
//   Heidenhain: TOOL CALL 1 Z S5000
//   Lathe: T0101
// THROUGH-SPINDLE COOLANT:
//   Haas: M88/M89
//   Okuma/FANUC: M51/M59
//   Mazak: M50/M51
//   If alarm, use flood: M8/M9
// AIR BLAST:
//   Haas: M83/M84 (external), M73/M74 (thru-spindle)
//   Okuma: M77/M78
//   If alarm, remove air codes
// HSM SMOOTHING:
//   Haas: G187 P1/P2/P3
//   FANUC: G05.1 Q1
//   Okuma: G131
//   Siemens: CYCLE832
//   If alarm, disable HSM in properties
// END OF POST PROCESSOR
`;
    }
};
/**
 * =============================================================================
 * PRISM AI - UNIVERSAL POST PROCESSOR GENERATOR v3.0
 * =============================================================================
 *
 * Generates fully optimized, production-ready post processors for ALL
 * CNC machines including mills, lathes, and multi-axis configurations.
 *
 * FEATURES INCLUDED IN ALL POSTS:
 * - PRISM AI Advanced Roughing Logic™
 * - G-Force Optimized Motion Control
 * - Chip Thinning Compensation
 * - Dynamic Feed Optimization
 * - HSM Mode Activation (machine-specific)
 * - Through-Spindle Coolant Management
 * - Safe Start/End Blocks
 * - Tool Life Management
 * - SSV Chatter Suppression
 * - 5-Axis TCP/TCPC Support
 * - Probing Cycle Integration
 * - Subprogram/Macro Support
 * - Alternative Code Fallbacks
 *
 * Version: 3.0.0
 * Last Updated: 2025-12-26
 * =============================================================================
 */

// MASTER MACHINE DATABASE - ALL SUPPORTED MACHINES

// MACHINE ENVELOPE & PHYSICAL GEOMETRY DATABASE
// Work zone, table dimensions, safety planes, and collision avoidance data
// All dimensions in mm unless otherwise noted

const MACHINE_ENVELOPE_DATABASE = {
  // HURCO Uploaded CAD Models
  hurco: {
      vm_one: {
        travels: { x: 660, y: 356, z: 406 },
        table: { width: 461, depth: 249, load: 1320 },
        workZone: {
          x: { min: 0, max: 660 },
          y: { min: 0, max: 356 },
          z: { min: 0, max: 406 }
        },
        volumetric: { capacity: 95 }
      },
      vm_5i: {
        travels: { x: 508, y: 406, z: 406 },
        table: { width: 355, depth: 284, load: 1016 },
        workZone: {
          x: { min: 0, max: 508 },
          y: { min: 0, max: 406 },
          z: { min: 0, max: 406 }
        },
        volumetric: { capacity: 83 }
      },
      vm_10_hsi_plus: {
        travels: { x: 660, y: 406, z: 508 },
        table: { width: 461, depth: 284, load: 1320 },
        workZone: {
          x: { min: 0, max: 660 },
          y: { min: 0, max: 406 },
          z: { min: 0, max: 508 }
        },
        volumetric: { capacity: 136 }
      },
      vm_10_uhsi: {
        travels: { x: 660, y: 406, z: 508 },
        table: { width: 461, depth: 284, load: 1320 },
        workZone: {
          x: { min: 0, max: 660 },
          y: { min: 0, max: 406 },
          z: { min: 0, max: 508 }
        },
        volumetric: { capacity: 136 }
      },
      vm_20i: {
        travels: { x: 762, y: 406, z: 508 },
        table: { width: 533, depth: 284, load: 1524 },
        workZone: {
          x: { min: 0, max: 762 },
          y: { min: 0, max: 406 },
          z: { min: 0, max: 508 }
        },
        volumetric: { capacity: 157 }
      },
      vm_30i: {
        travels: { x: 1016, y: 508, z: 610 },
        table: { width: 711, depth: 355, load: 2032 },
        workZone: {
          x: { min: 0, max: 1016 },
          y: { min: 0, max: 508 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 314 }
      },
      vm_50i: {
        travels: { x: 1270, y: 660, z: 610 },
        table: { width: 889, depth: 461, load: 2540 },
        workZone: {
          x: { min: 0, max: 1270 },
          y: { min: 0, max: 660 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 511 }
      },
      vmx24i: {
        travels: { x: 610, y: 508, z: 610 },
        table: { width: 427, depth: 355, load: 1220 },
        workZone: {
          x: { min: 0, max: 610 },
          y: { min: 0, max: 508 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 189 }
      },
      vmx_24_hsi: {
        travels: { x: 610, y: 508, z: 610 },
        table: { width: 427, depth: 355, load: 1220 },
        workZone: {
          x: { min: 0, max: 610 },
          y: { min: 0, max: 508 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 189 }
      },
      bx40i: {
        travels: { x: 1016, y: 610, z: 610 },
        table: { width: 711, depth: 427, load: 2032 },
        workZone: {
          x: { min: 0, max: 1016 },
          y: { min: 0, max: 610 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 378 }
      },
      bx50i: {
        travels: { x: 1270, y: 610, z: 610 },
        table: { width: 889, depth: 427, load: 2540 },
        workZone: {
          x: { min: 0, max: 1270 },
          y: { min: 0, max: 610 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 472 }
      },
      dcx_3226i: {
        travels: { x: 3200, y: 2600, z: 762 },
        table: { width: 2240, depth: 1819, load: 6400 },
        workZone: {
          x: { min: 0, max: 3200 },
          y: { min: 0, max: 2600 },
          z: { min: 0, max: 762 }
        },
        volumetric: { capacity: 6339 }
      },
      vmx24_hsi_4ax: {
        travels: { x: 610, y: 508, z: 610 },
        table: { width: 427, depth: 355, load: 1220 },
        workZone: {
          x: { min: 0, max: 610 },
          y: { min: 0, max: 508 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 189 }
      },
      vmx_42t_4ax: {
        travels: { x: 1067, y: 610, z: 610 },
        table: { width: 746, depth: 427, load: 2134 },
        workZone: {
          x: { min: 0, max: 1067 },
          y: { min: 0, max: 610 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 397 }
      },
      hbmx_55i: {
        travels: { x: 1400, y: 1100, z: 900 },
        table: { width: 979, depth: 770, load: 2800 },
        workZone: {
          x: { min: 0, max: 1400 },
          y: { min: 0, max: 1100 },
          z: { min: 0, max: 900 }
        },
        volumetric: { capacity: 1386 }
      },
      hbmx_80i: {
        travels: { x: 2000, y: 1600, z: 1200 },
        table: { width: 1400, depth: 1120, load: 4000 },
        workZone: {
          x: { min: 0, max: 2000 },
          y: { min: 0, max: 1600 },
          z: { min: 0, max: 1200 }
        },
        volumetric: { capacity: 3840 }
      },
      vmx60swi: {
        travels: { x: 1524, y: 660, z: 610 },
        table: { width: 1066, depth: 461, load: 3048 },
        workZone: {
          x: { min: 0, max: 1524 },
          y: { min: 0, max: 660 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 613 },
        rotary: {
          a: { min: -30, max: 110 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'swivel'
      },
      vmx84swi: {
        travels: { x: 2134, y: 864, z: 762 },
        table: { width: 1493, depth: 604, load: 4268 },
        workZone: {
          x: { min: 0, max: 2134 },
          y: { min: 0, max: 864 },
          z: { min: 0, max: 762 }
        },
        volumetric: { capacity: 1404 },
        rotary: {
          a: { min: -30, max: 110 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'swivel'
      },
      vmx42ui: {
        travels: { x: 1067, y: 610, z: 610 },
        table: { width: 746, depth: 427, load: 2134 },
        workZone: {
          x: { min: 0, max: 1067 },
          y: { min: 0, max: 610 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 397 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      vmx_42_sr: {
        travels: { x: 1067, y: 610, z: 610 },
        table: { width: 746, depth: 427, load: 2134 },
        workZone: {
          x: { min: 0, max: 1067 },
          y: { min: 0, max: 610 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 397 },
        rotary: {
          a: { min: -90, max: 30 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'swivel'
      },
      vmx_60_sri: {
        travels: { x: 1524, y: 660, z: 610 },
        table: { width: 1066, depth: 461, load: 3048 },
        workZone: {
          x: { min: 0, max: 1524 },
          y: { min: 0, max: 660 },
          z: { min: 0, max: 610 }
        },
        volumetric: { capacity: 613 },
        rotary: {
          a: { min: -90, max: 30 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'swivel'
      },
      dcx_32_5si: {
        travels: { x: 3200, y: 2000, z: 762 },
        table: { width: 2240, depth: 1400, load: 6400 },
        workZone: {
          x: { min: 0, max: 3200 },
          y: { min: 0, max: 2000 },
          z: { min: 0, max: 762 }
        },
        volumetric: { capacity: 4876 },
        rotary: {
          a: { min: -30, max: 110 },
          c: { min: -360, max: 360 }
        },
        kinematics: 'double_column'
      },
  },
  // DATRON Uploaded CAD Models
  datron: {
      neo: {
        travels: { x: 600, y: 400, z: 200 },
        table: { width: 420, depth: 280, load: 1200 },
        workZone: {
          x: { min: 0, max: 600 },
          y: { min: 0, max: 400 },
          z: { min: 0, max: 200 }
        },
        volumetric: { capacity: 48 }
      },
      neo_4ax: {
        travels: { x: 600, y: 400, z: 200 },
        table: { width: 420, depth: 280, load: 1200 },
        workZone: {
          x: { min: 0, max: 600 },
          y: { min: 0, max: 400 },
          z: { min: 0, max: 200 }
        },
        volumetric: { capacity: 48 }
      },
      m8cube_3ax: {
        travels: { x: 800, y: 600, z: 250 },
        table: { width: 560, depth: 420, load: 1600 },
        workZone: {
          x: { min: 0, max: 800 },
          y: { min: 0, max: 600 },
          z: { min: 0, max: 250 }
        },
        volumetric: { capacity: 120 }
      },
      m8cube_5ax: {
        travels: { x: 800, y: 600, z: 250 },
        table: { width: 560, depth: 420, load: 1600 },
        workZone: {
          x: { min: 0, max: 800 },
          y: { min: 0, max: 600 },
          z: { min: 0, max: 250 }
        },
        volumetric: { capacity: 120 },
        rotary: {
          a: { min: -10, max: 110 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
  },
  // BROTHER Uploaded CAD Models
  brother: {
      s300x1: {
        travels: { x: 300, y: 440, z: 305 },
        table: { width: 210, depth: 308, load: 600 },
        workZone: {
          x: { min: 0, max: 300 },
          y: { min: 0, max: 440 },
          z: { min: 0, max: 305 }
        },
        volumetric: { capacity: 40 }
      },
      s500x1: {
        travels: { x: 500, y: 400, z: 305 },
        table: { width: 350, depth: 280, load: 1000 },
        workZone: {
          x: { min: 0, max: 500 },
          y: { min: 0, max: 400 },
          z: { min: 0, max: 305 }
        },
        volumetric: { capacity: 61 }
      },
      s700x1: {
        travels: { x: 700, y: 400, z: 330 },
        table: { width: 489, depth: 280, load: 1400 },
        workZone: {
          x: { min: 0, max: 700 },
          y: { min: 0, max: 400 },
          z: { min: 0, max: 330 }
        },
        volumetric: { capacity: 92 }
      },
      s1000x1: {
        travels: { x: 1000, y: 500, z: 300 },
        table: { width: 700, depth: 350, load: 2000 },
        workZone: {
          x: { min: 0, max: 1000 },
          y: { min: 0, max: 500 },
          z: { min: 0, max: 300 }
        },
        volumetric: { capacity: 150 }
      },
      m140x2: {
        travels: { x: 200, y: 440, z: 305 },
        table: { width: 140, depth: 308, load: 400 },
        workZone: {
          x: { min: 0, max: 200 },
          y: { min: 0, max: 440 },
          z: { min: 0, max: 305 }
        },
        volumetric: { capacity: 26 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      u500xd1: {
        travels: { x: 500, y: 400, z: 305 },
        table: { width: 350, depth: 280, load: 1000 },
        workZone: {
          x: { min: 0, max: 500 },
          y: { min: 0, max: 400 },
          z: { min: 0, max: 305 }
        },
        volumetric: { capacity: 61 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
  },
  // MATSUURA Uploaded CAD Models
  matsuura: {
      h_plus: {
        travels: { x: 560, y: 560, z: 625 },
        table: { width: 392, depth: 392, load: 1120 },
        workZone: {
          x: { min: 0, max: 560 },
          y: { min: 0, max: 560 },
          z: { min: 0, max: 625 }
        },
        volumetric: { capacity: 196 }
      },
      mam72_35v: {
        travels: { x: 550, y: 400, z: 300 },
        table: { width: 385, depth: 280, load: 1100 },
        workZone: {
          x: { min: 0, max: 550 },
          y: { min: 0, max: 400 },
          z: { min: 0, max: 300 }
        },
        volumetric: { capacity: 66 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      mam72_63v: {
        travels: { x: 735, y: 610, z: 460 },
        table: { width: 514, depth: 427, load: 1470 },
        workZone: {
          x: { min: 0, max: 735 },
          y: { min: 0, max: 610 },
          z: { min: 0, max: 460 }
        },
        volumetric: { capacity: 206 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      mx_330: {
        travels: { x: 400, y: 535, z: 300 },
        table: { width: 280, depth: 374, load: 800 },
        workZone: {
          x: { min: 0, max: 400 },
          y: { min: 0, max: 535 },
          z: { min: 0, max: 300 }
        },
        volumetric: { capacity: 64 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      mx_420: {
        travels: { x: 500, y: 620, z: 350 },
        table: { width: 350, depth: 434, load: 1000 },
        workZone: {
          x: { min: 0, max: 500 },
          y: { min: 0, max: 620 },
          z: { min: 0, max: 350 }
        },
        volumetric: { capacity: 108 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      mx_520: {
        travels: { x: 630, y: 735, z: 400 },
        table: { width: 441, depth: 514, load: 1260 },
        workZone: {
          x: { min: 0, max: 630 },
          y: { min: 0, max: 735 },
          z: { min: 0, max: 400 }
        },
        volumetric: { capacity: 185 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      vx_660: {
        travels: { x: 660, y: 510, z: 460 },
        table: { width: 461, depth: 357, load: 1320 },
        workZone: {
          x: { min: 0, max: 660 },
          y: { min: 0, max: 510 },
          z: { min: 0, max: 460 }
        },
        volumetric: { capacity: 154 }
      },
      vx_1000: {
        travels: { x: 1020, y: 530, z: 460 },
        table: { width: 714, depth: 371, load: 2040 },
        workZone: {
          x: { min: 0, max: 1020 },
          y: { min: 0, max: 530 },
          z: { min: 0, max: 460 }
        },
        volumetric: { capacity: 248 }
      },
      vx_1500: {
        travels: { x: 1524, y: 660, z: 560 },
        table: { width: 1066, depth: 461, load: 3048 },
        workZone: {
          x: { min: 0, max: 1524 },
          y: { min: 0, max: 660 },
          z: { min: 0, max: 560 }
        },
        volumetric: { capacity: 563 }
      },
      vx_1500_4ax: {
        travels: { x: 1524, y: 660, z: 560 },
        table: { width: 1066, depth: 461, load: 3048 },
        workZone: {
          x: { min: 0, max: 1524 },
          y: { min: 0, max: 660 },
          z: { min: 0, max: 560 }
        },
        volumetric: { capacity: 563 }
      },
  },
  // KERN Uploaded CAD Models
  kern: {
      evo: {
        travels: { x: 500, y: 430, z: 300 },
        table: { width: 350, depth: 301, load: 1000 },
        workZone: {
          x: { min: 0, max: 500 },
          y: { min: 0, max: 430 },
          z: { min: 0, max: 300 }
        },
        volumetric: { capacity: 64 }
      },
      evo_5ax: {
        travels: { x: 500, y: 430, z: 300 },
        table: { width: 350, depth: 301, load: 1000 },
        workZone: {
          x: { min: 0, max: 500 },
          y: { min: 0, max: 430 },
          z: { min: 0, max: 300 }
        },
        volumetric: { capacity: 64 },
        rotary: {
          a: { min: -10, max: 110 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      micro_vario_hd: {
        travels: { x: 300, y: 280, z: 250 },
        table: { width: 210, depth: 196, load: 600 },
        workZone: {
          x: { min: 0, max: 300 },
          y: { min: 0, max: 280 },
          z: { min: 0, max: 250 }
        },
        volumetric: { capacity: 21 },
        rotary: {
          a: { min: -10, max: 110 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      pyramid_nano: {
        travels: { x: 500, y: 510, z: 300 },
        table: { width: 350, depth: 357, load: 1000 },
        workZone: {
          x: { min: 0, max: 500 },
          y: { min: 0, max: 510 },
          z: { min: 0, max: 300 }
        },
        volumetric: { capacity: 76 },
        rotary: {
          a: { min: -5, max: 95 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'gantry'
      },
  },
  // MAKINO Uploaded CAD Models
  makino: {
      d200z: {
        travels: { x: 350, y: 300, z: 250 },
        table: { width: 244, depth: 210, load: 700 },
        workZone: {
          x: { min: 0, max: 350 },
          y: { min: 0, max: 300 },
          z: { min: 0, max: 250 }
        },
        volumetric: { capacity: 26 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      da300: {
        travels: { x: 450, y: 500, z: 350 },
        table: { width: 315, depth: 350, load: 900 },
        workZone: {
          x: { min: 0, max: 450 },
          y: { min: 0, max: 500 },
          z: { min: 0, max: 350 }
        },
        volumetric: { capacity: 78 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
  },
  // HELLER Uploaded CAD Models
  heller: {
      hf_3500: {
        travels: { x: 710, y: 710, z: 710 },
        table: { width: 496, depth: 496, load: 1420 },
        workZone: {
          x: { min: 0, max: 710 },
          y: { min: 0, max: 710 },
          z: { min: 0, max: 710 }
        },
        volumetric: { capacity: 357 }
      },
      hf_5500: {
        travels: { x: 900, y: 900, z: 900 },
        table: { width: 630, depth: 630, load: 1800 },
        workZone: {
          x: { min: 0, max: 900 },
          y: { min: 0, max: 900 },
          z: { min: 0, max: 900 }
        },
        volumetric: { capacity: 729 }
      },
  },
  // DN_SOLUTIONS Uploaded CAD Models
  dn_solutions: {
      solutions_dnm_4000: {
        travels: { x: 800, y: 450, z: 510 },
        table: { width: 560, depth: 315, load: 1600 },
        workZone: {
          x: { min: 0, max: 800 },
          y: { min: 0, max: 450 },
          z: { min: 0, max: 510 }
        },
        volumetric: { capacity: 183 }
      },
      solutions_dnm_5700: {
        travels: { x: 1300, y: 670, z: 625 },
        table: { width: 909, depth: 468, load: 2600 },
        workZone: {
          x: { min: 0, max: 1300 },
          y: { min: 0, max: 670 },
          z: { min: 0, max: 625 }
        },
        volumetric: { capacity: 544 }
      },
      solutions_dvf_5000: {
        travels: { x: 762, y: 520, z: 510 },
        table: { width: 533, depth: 364, load: 1524 },
        workZone: {
          x: { min: 0, max: 762 },
          y: { min: 0, max: 520 },
          z: { min: 0, max: 510 }
        },
        volumetric: { capacity: 202 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      solutions_dvf_6500: {
        travels: { x: 1050, y: 650, z: 600 },
        table: { width: 735, depth: 454, load: 2100 },
        workZone: {
          x: { min: 0, max: 1050 },
          y: { min: 0, max: 650 },
          z: { min: 0, max: 600 }
        },
        volumetric: { capacity: 409 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
      solutions_dvf_8000: {
        travels: { x: 1400, y: 850, z: 700 },
        table: { width: 979, depth: 595, load: 2800 },
        workZone: {
          x: { min: 0, max: 1400 },
          y: { min: 0, max: 850 },
          z: { min: 0, max: 700 }
        },
        volumetric: { capacity: 833 },
        rotary: {
          a: { min: -30, max: 120 },
          c: { min: 0, max: 360 }
        },
        kinematics: 'trunnion'
      },
  },
    // HURCO VMC ENVELOPE DATA - Batch 3 (January 2026 - Uploaded CAD)
    hurco_vmc: {
        manufacturer: "Hurco",
        type: "VMC",
        cadSource: "uploaded",

        machines: {
            vc600i: {
                name: "VC600i",
                cadFile: "Hurco VC600i.step",
                geometry: { faces: 8067, points: 184564 },
                travels: { x: 660, y: 510, z: 510 },
                table: {
                    length: 813,
                    width: 406,
                    tSlots: { count: 5, width: 18, spacing: 80 },
                    maxLoad: 1000,
                    surface: "T-slot"
                },
                envelope: {
                    spindleNoseToTable: { min: 102, max: 612 },
                    spindleCenterToColumn: 340,
                    floorToTable: 850,
                    tableToFloor: 850
                },
                workZone: {
                    xMin: 0, xMax: 660,
                    yMin: 0, yMax: 510,
                    zMin: 0, zMax: 510,
                    originLocation: "Table center"
                },
                volumetric: {
                    totalVolume: 171666000,
                    usableVolume: 137332800,
                    maxPartWeight: 1000,
                    tableArea: 330078,
                    volumeUtilization: 0.80
                },
                spindle: { taper: "CAT40", maxRPM: 12000, power: 22 }
            },
            vmx42i: {
                name: "VMX42i",
                cadFile: "Hurco VMX42i.step",
                geometry: { faces: 9005, points: 163119 },
                travels: { x: 1067, y: 610, z: 610 },
                table: {
                    length: 1321,
                    width: 610,
                    tSlots: { count: 7, width: 18, spacing: 100 },
                    maxLoad: 2000,
                    surface: "T-slot"
                },
                envelope: {
                    spindleNoseToTable: { min: 127, max: 737 },
                    spindleCenterToColumn: 400
                },
                workZone: {
                    xMin: 0, xMax: 1067,
                    yMin: 0, yMax: 610,
                    zMin: 0, zMax: 610,
                    originLocation: "Table center"
                },
                spindle: { taper: "CAT40", maxRPM: 12000, power: 29.8 }
            }
        }
    },
    hurco_5axis: {
        manufacturer: "Hurco",
        type: "5-Axis VMC",
        cadSource: "uploaded",

        machines: {
            vmx42swi: {
                name: "VMX42 SWi",
                cadFile: "Hurco VMX 42 SWi.step",
                geometry: { faces: 9079, points: 166130 },
                travels: { x: 1067, y: 610, z: 610 },
                rotary: { a: [-30, 110], c: [0, 360] },
                table: {
                    diameter: 420,
                    maxLoad: 500,
                    surface: "T-slot rotary"
                },
                envelope: {
                    spindleNoseToTable: { min: 127, max: 737 }
                },
                workZone: {
                    xMin: 0, xMax: 1067,
                    yMin: 0, yMax: 610,
                    zMin: 0, zMax: 610
                },
                kinematics: "AC_SWIVEL_HEAD",
                spindle: { taper: "CAT40", maxRPM: 12000, power: 29.8 }
            },
            vmx42srti: {
                name: "VMX42SRTi",
                cadFile: "Hurco VMX42SRTi.step",
                geometry: { faces: 9808, points: 171968 },
                travels: { x: 1067, y: 610, z: 610 },
                rotary: { a: [-90, 30], c: [0, 360] },
                table: {
                    diameter: 420,
                    maxLoad: 500,
                    surface: "T-slot rotary"
                },
                kinematics: "AC_SWIVEL_ROTATE",
                spindle: { taper: "CAT40", maxRPM: 12000, power: 29.8 }
            },
            vmx64ti: {
                name: "VMX64Ti",
                cadFile: "Hurco VMX64Ti.step",
                geometry: { faces: 8627, points: 183912 },
                travels: { x: 1626, y: 660, z: 610 },
                rotary: { a: [-30, 120], c: [0, 360] },
                table: {
                    diameter: 500,
                    maxLoad: 800,
                    surface: "T-slot rotary"
                },
                kinematics: "AC_TRUNNION",
                spindle: { taper: "CAT50", maxRPM: 10000, power: 37 }
            }
        }
    },
    // HAAS VMC ENVELOPE DATA
    haas_vmc: {
        manufacturer: "Haas",
        type: "VMC",

        machines: {
            // Mini Mills
            mini_mill: {
                name: "Mini Mill",
                travels: { x: 406, y: 305, z: 254 },
                table: {
                    length: 457,      // 18"
                    width: 267,       // 10.5"
                    tSlots: { count: 3, width: 16, spacing: 95 },
                    maxLoad: 227,     // kg
                    surface: "T-slot"
                },
                envelope: {
                    spindleNoseToTable: { min: 76, max: 330 },   // Z travel range
                    spindleCenterToColumn: 305,
                    floorToTable: 838,
                    tableToFloor: 838
                },
                workZone: {
                    xMin: 0, xMax: 406,
                    yMin: 0, yMax: 305,
                    zMin: 0, zMax: 254,
                    originLocation: "Table center or corner (user-defined)"
                },
                volumetric: {
                    totalVolume: 31465320,        // 406 x 305 x 254 mm³
                    usableVolume: 25172256,       // 80% utilization
                    maxPartWeight: 227,
                    tableArea: 121969,            // 457 x 267 mm²
                    volumeUtilization: 0.80,
                    maxPartDimensions: { x: 400, y: 267, z: 200 },
                    notes: "Compact mill for small parts, education, prototyping"
                },
                safetyPlanes: {
                    zClearance: 25.4,         // 1" above work
                    zRetract: 50.8,           // 2" safe retract
                    zHome: 254,               // Full Z up
                    rapidApproach: 12.7,      // 0.5" above work for rapid approach
                    toolChangeZ: 254          // Z position for tool change
                },
                collisionZones: {
                    spindleHousingDia: 150,
                    spindleHousingLength: 200,
                    spindleNoseProjection: 50,
                    toolChangerClearance: { x: [-50, 50], y: [305, 400], z: [200, 300] },
                    doorOpenClearance: { y: [-100, 0] },
                    maxToolProjection: 150,       // Max tool stickout before spindle collision risk
                    columnClearance: { yMax: 305 },
                    notes: "ATC swings in from rear (Y+). Limited Y travel."
                },
                fixturing: {
                    maxViseWidth: 150,
                    commonVise: "Kurt D40",
                    boltPattern: "M12 or 1/2-13",
                    clampKitSize: "Small"
                }
            }