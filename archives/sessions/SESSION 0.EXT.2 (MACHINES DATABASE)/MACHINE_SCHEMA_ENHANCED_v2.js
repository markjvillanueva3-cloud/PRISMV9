/**
 * PRISM Enhanced Machine Schema v2.0
 * Full Geometric Dimensions & Kinematics for Collision Avoidance
 * 
 * This schema supports:
 * - Vericut-style material removal simulation
 * - Full machine collision detection
 * - 5-axis kinematic chains
 * - Rotary axis pivot point calculations
 * - Tool reach analysis
 * - Work envelope validation
 */

const PRISM_MACHINE_SCHEMA_V2 = {

    // ═══════════════════════════════════════════════════════════════════════
    // EXAMPLE: Complete Haas VF-2 Definition with Full Kinematics
    // ═══════════════════════════════════════════════════════════════════════
    
    example_haas_vf2: {
        // ─────────────────────────────────────────────────────────────────────
        // IDENTIFICATION
        // ─────────────────────────────────────────────────────────────────────
        id: "haas_vf2",
        manufacturer: "haas",
        model: "VF-2",
        series: "VF",
        type: "VMC",                    // VMC, HMC, LATHE, 5AXIS, MILL_TURN
        subtype: "3-axis",
        axes: 3,
        control: "Haas NGC",
        controlVersion: "100.20.000",
        yearIntroduced: 1988,
        currentProduction: true,
        
        // ─────────────────────────────────────────────────────────────────────
        // SPINDLE SPECIFICATIONS
        // ─────────────────────────────────────────────────────────────────────
        spindle: {
            type: "inline",             // inline, geared, motorSpindle
            maxRpm: 8100,
            minRpm: 1,
            peakHp: 30,
            continuousHp: 20,
            peakKw: 22.4,
            continuousKw: 14.9,
            maxTorque_Nm: 122,          // @ 2000 RPM
            continuousTorque_Nm: 87,
            taper: "CT40",              // CT40, BT40, HSK-A63, CAT50, etc.
            bigPlus: false,
            spindleNose: "A2-6",        // For lathes
            bearingType: "angular_contact",
            coolingType: "oil_jacket",
            orientationCapable: true,   // M19 capable
            
            // Spindle geometry for collision
            geometry: {
                noseToGageLine_mm: 101.6,    // Spindle nose to gage line
                headDiameter_mm: 200,
                headLength_mm: 350,
                housingWidth_mm: 400,
                housingDepth_mm: 500
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // AXIS TRAVELS (Machine Coordinate System)
        // ─────────────────────────────────────────────────────────────────────
        travels: {
            // LINEAR AXES (all in mm)
            x: { min: 0, max: 762, rapid_mm_min: 25400 },
            y: { min: 0, max: 406, rapid_mm_min: 25400 },
            z: { min: 0, max: 508, rapid_mm_min: 25400 },
            
            // Optional 4th/5th axes (null if not equipped)
            a: null,
            b: null,
            c: null,
            
            // Secondary linear axes (for gantry/special machines)
            u: null,
            v: null,
            w: null
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // KINEMATICS (Critical for Collision Avoidance)
        // ─────────────────────────────────────────────────────────────────────
        kinematics: {
            type: "VMC_3AXIS",
            // Kinematic chain: SPINDLE -> Z -> Y -> X -> TABLE -> PART
            chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
            
            // Machine reference points (all in mm from machine zero)
            referencePoints: {
                machineZero: { x: 0, y: 0, z: 0 },
                homePosition: { x: 0, y: 0, z: 0 },
                
                // Spindle gage line position at Z=0
                spindleGageLine: { x: 381, y: 203, z: 508 },
                
                // Table surface position at machine zero
                tableSurface: { x: 381, y: 203, z: 0 },
                
                // Tool change position
                toolChangePos: { x: 0, y: 0, z: 0 },
                
                // Pallet change position (if applicable)
                palletChangePos: null
            },
            
            // Axis direction vectors (positive direction)
            axisVectors: {
                x: { i: 1, j: 0, k: 0 },   // +X is right
                y: { i: 0, j: 1, k: 0 },   // +Y is back
                z: { i: 0, j: 0, k: 1 }    // +Z is up
            },
            
            // Spindle nose to table surface at Z home
            spindleToTable_mm: 508,
            
            // Min clearance Z (spindle fully retracted)
            maxZClearance_mm: 508
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // TABLE SPECIFICATIONS
        // ─────────────────────────────────────────────────────────────────────
        table: {
            type: "fixed",              // fixed, rotary, trunnion, pallet
            length_mm: 914,
            width_mm: 356,
            thickness_mm: 75,           // Important for collision!
            
            // T-slot pattern
            tSlots: {
                count: 3,
                width_mm: 15.9,         // 5/8" T-slots
                spacing_mm: 125,
                orientation: "X"        // Slots run parallel to X
            },
            
            // Load capacity
            maxLoad_kg: 1361,
            distributedLoad_kg_m2: 4882,
            
            // Table surface position relative to floor
            heightFromFloor_mm: 780
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // MACHINE GEOMETRY (For Collision Model)
        // ─────────────────────────────────────────────────────────────────────
        geometry: {
            // Overall machine footprint
            footprint: {
                length_mm: 2692,        // Front to back
                width_mm: 1981,         // Left to right
                height_mm: 2692         // Floor to top
            },
            
            // Work envelope (actual cutting area)
            workEnvelope: {
                x_mm: 762,
                y_mm: 406,
                z_mm: 508,
                volume_mm3: 157315814
            },
            
            // Column geometry
            column: {
                type: "C-frame",
                width_mm: 600,
                depth_mm: 500,
                position: "rear"        // rear, side, gantry
            },
            
            // Enclosure/guards
            enclosure: {
                type: "full",
                doorOpening_mm: { width: 1016, height: 1270 },
                interiorHeight_mm: 1524,
                windowPositions: ["front", "left"]
            },
            
            // Chip conveyor
            chipConveyor: {
                type: "auger",
                position: "rear",
                clearance_mm: 150
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // COLLISION ZONES (Pre-defined collision check volumes)
        // ─────────────────────────────────────────────────────────────────────
        collisionZones: {
            // Spindle head (moves with Z)
            spindleHead: {
                type: "cylinder",
                diameter_mm: 200,
                length_mm: 350,
                offset: { x: 0, y: 0, z: -175 }  // From spindle nose
            },
            
            // Spindle housing (moves with Z)
            spindleHousing: {
                type: "box",
                dimensions: { x: 400, y: 500, z: 400 },
                offset: { x: 0, y: 0, z: -500 }
            },
            
            // Column (fixed)
            column: {
                type: "box",
                dimensions: { x: 600, y: 500, z: 2000 },
                position: { x: 381, y: 600, z: 0 }
            },
            
            // Table (fixed in 3-axis, moves with X in some designs)
            table: {
                type: "box",
                dimensions: { x: 914, y: 356, z: 75 },
                position: { x: 0, y: 0, z: -75 }  // Top surface at Z=0
            },
            
            // Side guards
            leftGuard: {
                type: "plane",
                normal: { x: 1, y: 0, z: 0 },
                offset: -100
            },
            rightGuard: {
                type: "plane",
                normal: { x: -1, y: 0, z: 0 },
                offset: 862
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // AUTOMATIC TOOL CHANGER
        // ─────────────────────────────────────────────────────────────────────
        atc: {
            type: "umbrella",           // umbrella, drum, chain, rack
            capacity: 20,
            maxToolDiameter_mm: 89,     // Adjacent pockets empty
            maxToolDiameter_full_mm: 76, // All pockets full
            maxToolLength_mm: 356,
            maxToolWeight_kg: 5.4,
            changeTime_sec: 4.2,        // Chip-to-chip
            
            // ATC position for collision
            position: {
                type: "side",           // side, rear, top
                x_mm: -200,
                y_mm: 0,
                z_mm: 300
            },
            
            // Swing radius during tool change
            swingRadius_mm: 400,
            swingClearance_mm: 450      // Keep parts below this
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // COOLANT SYSTEM
        // ─────────────────────────────────────────────────────────────────────
        coolant: {
            floodPressure_psi: 50,
            floodFlow_gpm: 8,
            tsc: false,                 // Through-spindle coolant
            tscPressure_psi: null,
            tscFlow_gpm: null,
            chipWash: true,
            programmableNozzles: false,
            tankCapacity_gal: 55
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // ACCURACY & REPEATABILITY
        // ─────────────────────────────────────────────────────────────────────
        accuracy: {
            positioning_mm: 0.0050,
            repeatability_mm: 0.0025,
            ballbar_circularity_mm: 0.010,
            linearAccuracy_mm_m: 0.005,  // Per meter of travel
            thermalStability: "standard" // standard, enhanced, ultra
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // ELECTRICAL & UTILITIES
        // ─────────────────────────────────────────────────────────────────────
        utilities: {
            voltage: "208/240V",
            phase: 3,
            fullLoadAmps: 40,
            compressedAir_psi: 100,
            compressedAir_cfm: 4
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // PHYSICAL
        // ─────────────────────────────────────────────────────────────────────
        physical: {
            weight_kg: 3765,
            floorSpace_mm: { length: 2692, width: 1981 },
            heightClearance_mm: 2692,
            foundation: "none_required", // none_required, pads, pit
            levelingPoints: 6
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // OPTIONS & VARIANTS
        // ─────────────────────────────────────────────────────────────────────
        options: {
            available: [
                "TSC_1000psi",
                "TSC_300psi", 
                "4th_axis_rotary",
                "5th_axis_trunnion",
                "probing_renishaw",
                "probing_haas",
                "chip_conveyor",
                "high_speed_machining",
                "rigid_tapping",
                "expanded_memory"
            ],
            installed: []
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // SOURCES & VERIFICATION
        // ─────────────────────────────────────────────────────────────────────
        sources: [
            "Haas Automation Official Specifications 2024",
            "Haas VF-2 Operator Manual",
            "Haas CNC Programming Manual"
        ],
        lastVerified: "2024-01-15",
        verifiedBy: "PRISM_DATA_TEAM"
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 5-AXIS EXAMPLE: Haas UMC-750 with Full Trunnion Kinematics
    // ═══════════════════════════════════════════════════════════════════════
    
    example_haas_umc750: {
        id: "haas_umc750",
        manufacturer: "haas",
        model: "UMC-750",
        series: "UMC",
        type: "5AXIS",
        subtype: "trunnion",
        axes: 5,
        control: "Haas NGC",
        
        spindle: {
            type: "inline",
            maxRpm: 8100,
            peakHp: 30,
            continuousHp: 20,
            maxTorque_Nm: 122,
            taper: "CT40",
            bigPlus: true,
            geometry: {
                noseToGageLine_mm: 101.6,
                headDiameter_mm: 200,
                headLength_mm: 400
            }
        },
        
        travels: {
            x: { min: 0, max: 762, rapid_mm_min: 30480 },
            y: { min: 0, max: 508, rapid_mm_min: 30480 },
            z: { min: 0, max: 508, rapid_mm_min: 30480 },
            a: { min: -35, max: 120, rapid_deg_sec: 120 },  // Tilt axis
            c: { min: -360, max: 360, rapid_deg_sec: 200 }, // Rotary (continuous)
            b: null
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // 5-AXIS KINEMATICS (Critical for RTCP/TCPC)
        // ─────────────────────────────────────────────────────────────────────
        kinematics: {
            type: "TRUNNION_TABLE_TABLE",
            
            // Kinematic chain for 5-axis
            // SPINDLE -> Z -> Y -> X -> [A_ROTARY] -> [C_ROTARY] -> TABLE -> PART
            chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
            
            // 5-axis configuration
            fiveAxisType: "table-table",    // table-table, head-head, table-head, head-table
            
            // Rotary axis definitions
            rotaryAxes: {
                a: {
                    type: "tilt",           // tilt, rotary
                    rotationVector: { i: 1, j: 0, k: 0 },  // Rotates around X
                    minAngle_deg: -35,
                    maxAngle_deg: 120,
                    homeAngle_deg: 0,
                    
                    // CRITICAL: Pivot point location
                    // This is where the A-axis rotation center is
                    pivotPoint_mm: { x: 381, y: 254, z: 200 },
                    
                    // Distance from pivot to table surface at A=0
                    pivotToTable_mm: 150,
                    
                    // Motor specs
                    torque_Nm: 460,
                    clampTorque_Nm: 1085
                },
                
                c: {
                    type: "rotary",
                    rotationVector: { i: 0, j: 0, k: 1 },  // Rotates around Z
                    minAngle_deg: -360,
                    maxAngle_deg: 360,
                    continuous: true,       // Can rotate continuously
                    homeAngle_deg: 0,
                    
                    // C-axis is mounted on the A-axis trunnion
                    // Pivot point moves with A rotation
                    pivotPoint_mm: { x: 0, y: 0, z: 0 },  // Relative to A pivot
                    
                    torque_Nm: 280,
                    clampTorque_Nm: 620
                }
            },
            
            // Reference points
            referencePoints: {
                machineZero: { x: 0, y: 0, z: 0 },
                homePosition: { x: 0, y: 0, z: 0, a: 0, c: 0 },
                spindleGageLine: { x: 381, y: 254, z: 508 },
                tableSurface: { x: 381, y: 254, z: 200 },  // At A=0, C=0
                aPivotPoint: { x: 381, y: 254, z: 200 },
                cPivotPoint: { x: 381, y: 254, z: 200 }    // Coincident with A for this machine
            },
            
            // RTCP/TCPC support
            tcpcSupported: true,
            rtcpSupported: true,
            dwoPivotLength: true,   // Dynamic Work Offset with pivot length
            
            // Gimbal lock warning zones
            singularities: {
                // A-axis limits where C becomes undefined
                aAxisSingularity: null,  // No singularity for trunnion
                warningZone_deg: 5       // Warn when within 5° of limits
            }
        },
        
        table: {
            type: "trunnion_rotary",
            diameter_mm: 630,           // Circular table on trunnion
            tSlots: {
                count: 6,
                width_mm: 12,
                pattern: "radial"       // radial, parallel
            },
            maxLoad_kg: 300,
            
            // Trunnion geometry
            trunnion: {
                width_mm: 800,
                supportHeight_mm: 350,
                clearanceUnder_mm: 150
            }
        },
        
        collisionZones: {
            spindleHead: {
                type: "cylinder",
                diameter_mm: 200,
                length_mm: 400,
                offset: { x: 0, y: 0, z: -200 }
            },
            trunnionLeft: {
                type: "cylinder",
                diameter_mm: 250,
                length_mm: 200,
                position: { x: -400, y: 254, z: 200 }
            },
            trunnionRight: {
                type: "cylinder", 
                diameter_mm: 250,
                length_mm: 200,
                position: { x: 400, y: 254, z: 200 }
            },
            rotaryTable: {
                type: "cylinder",
                diameter_mm: 630,
                height_mm: 100,
                rotatesWith: ["a", "c"]  // Rotates with these axes
            }
        },
        
        atc: {
            type: "side_mount",
            capacity: 40,
            maxToolDiameter_mm: 89,
            maxToolLength_mm: 356,
            maxToolWeight_kg: 5.4,
            changeTime_sec: 4.5,
            position: { x: -300, y: 0, z: 400 }
        },
        
        accuracy: {
            positioning_mm: 0.0076,
            repeatability_mm: 0.0038,
            aAxisAccuracy_deg: 0.0033,
            cAxisAccuracy_deg: 0.0028
        },
        
        sources: [
            "Haas UMC-750 Specifications 2024",
            "Haas 5-Axis Programming Manual"
        ]
    }
};

// Export schema for validation
if (typeof module !== "undefined") module.exports = PRISM_MACHINE_SCHEMA_V2;
if (typeof window !== "undefined") window.PRISM_MACHINE_SCHEMA_V2 = PRISM_MACHINE_SCHEMA_V2;

/**
 * SCHEMA FIELD REQUIREMENTS BY MACHINE TYPE:
 * 
 * 3-AXIS VMC:
 *   Required: id, manufacturer, model, type, axes, spindle, travels (x,y,z),
 *             table, atc, kinematics.referencePoints, collisionZones
 *   
 * 4-AXIS VMC:
 *   Additional: travels.a OR travels.b, kinematics.rotaryAxes.a
 *   
 * 5-AXIS (Trunnion):
 *   Additional: travels.a, travels.c, kinematics.rotaryAxes (a & c),
 *               kinematics.fiveAxisType, tcpcSupported, rtcpSupported
 *               
 * 5-AXIS (Head-Head):
 *   Additional: travels.a, travels.c on spindle head,
 *               kinematics.fiveAxisType = "head-head"
 *               
 * HMC:
 *   Additional: kinematics.type = "HMC_*", pallet system, B-axis typically
 *   
 * LATHE:
 *   Different: spindle.spindleNose, turret config, tailstock,
 *              travels in different orientation (Z along spindle)
 *              
 * MILL-TURN:
 *   Combination: Lathe spindle + milling spindle, B-axis, Y-axis
 */
