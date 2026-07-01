// PRISM_POST_PROCESSOR_DATABASE_V2 - Lines 125991-128707 (2717 lines) - Post processor database\n\nconst PRISM_POST_PROCESSOR_DATABASE_V2 = {

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
