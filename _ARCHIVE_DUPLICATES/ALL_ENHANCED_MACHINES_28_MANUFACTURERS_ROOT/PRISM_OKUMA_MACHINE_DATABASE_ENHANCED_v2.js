/**
 * PRISM_OKUMA_MACHINE_DATABASE_ENHANCED_v2.js
 * LEVEL 4 ENHANCED - Full Kinematics + Collision Ready
 * 
 * Okuma Corporation is a leading Japanese machine tool manufacturer known for
 * building their own CNC controls (OSP), spindles, motors, encoders, and drives.
 * Famous for the GENOS, MULTUS, MU-V, and LB series.
 * 
 * @version 2.0.0
 * @created 2026-01-20
 * @session 0.EXT.2f.9
 */

const PRISM_OKUMA_MACHINE_DATABASE_ENHANCED = {
    metadata: {
        manufacturer: "Okuma",
        full_name: "Okuma Corporation",
        country: "Japan",
        founded: 1898,
        headquarters: "Oguchi, Aichi, Japan",
        specialty: "Integrated machine tools with proprietary CNC, drives, and spindles",
        controller: "OSP-P300A / OSP-P500",
        unique: "Builds own CNC, spindles, motors, encoders - full vertical integration",
        website: "https://www.okuma.com",
        version: "2.0.0-LEVEL4-ENHANCED",
        last_updated: "2026-01-20",
        machine_count: 14,
        enhancement_level: 4
    },

    machines: [
        // ============================================
        // 5-AXIS VMC - MU-V SERIES
        // ============================================
        {
            id: "OKUMA_MU_5000V",
            manufacturer: "Okuma",
            model: "MU-5000V",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            description: "5-axis vertical machining center with tilting rotary table",
            series: "MU-V",
            
            work_envelope: {
                x: { min: 0, max: 762, unit: "mm" },
                y: { min: 0, max: 460, unit: "mm" },
                z: { min: 0, max: 460, unit: "mm" },
                a_axis: { min: -120, max: 30, unit: "deg" },
                c_axis: { min: -360, max: 360, continuous: true, unit: "deg" },
                table_diameter: 500,
                max_workpiece_diameter: 600,
                max_workpiece_height: 400,
                table_load_capacity: 400,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                brand: "Okuma_PREX",
                model: "PREX_Motor",
                taper: "HSK-A63",
                max_rpm: 15000,
                power_rating: 22,
                power_unit: "kW",
                torque_max: 151,
                torque_unit: "Nm",
                bearing_type: "ceramic_hybrid",
                bearing_lubrication: "oil_air",
                cooling: "jacket_cooling",
                thermal_growth_compensation: true
            },
            
            axis_specs: {
                x: {
                    travel: 762,
                    rapid_rate: 40000,
                    max_feed: 40000,
                    acceleration: 0.5,
                    acceleration_unit: "g",
                    motor_type: "Okuma_VAC_servo",
                    guideway_type: "linear_roller",
                    guideway_brand: "Okuma",
                    encoder_type: "Okuma_absolute",
                    positioning_accuracy: 0.004,
                    repeatability: 0.002
                },
                y: {
                    travel: 460,
                    rapid_rate: 40000,
                    max_feed: 40000,
                    acceleration: 0.5,
                    motor_type: "Okuma_VAC_servo",
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.004,
                    repeatability: 0.002
                },
                z: {
                    travel: 460,
                    rapid_rate: 32000,
                    max_feed: 32000,
                    acceleration: 0.4,
                    motor_type: "Okuma_VAC_servo",
                    guideway_type: "linear_roller",
                    counterbalance: "pneumatic",
                    positioning_accuracy: 0.004,
                    repeatability: 0.002
                },
                a: {
                    type: "tilting_trunnion",
                    travel: { min: -120, max: 30 },
                    rapid_rate: 20,
                    rapid_rate_unit: "rpm",
                    max_torque: 2000,
                    clamping_torque: 4000,
                    drive_type: "worm_gear",
                    drive_ratio: "1:90",
                    positioning_accuracy: 0.001,
                    rotation_center_height: 200
                },
                c: {
                    type: "rotary_table",
                    continuous: true,
                    rapid_rate: 33,
                    rapid_rate_unit: "rpm",
                    max_torque: 1000,
                    clamping_torque: 2000,
                    drive_type: "direct_drive",
                    positioning_accuracy: 0.001
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 32,
                max_tool_diameter: 80,
                max_tool_diameter_adjacent_empty: 125,
                max_tool_length: 300,
                max_tool_weight: 8,
                tool_change_time: 2.0,
                chip_to_chip_time: 4.5
            },
            
            controller: {
                brand: "Okuma",
                model: "OSP-P300A",
                type: "proprietary",
                axes_count: 5,
                simultaneous_axes: 5,
                
                okuma_features: {
                    thermo_friendly_concept: true,
                    collision_avoidance_system: true,
                    machining_navi: true,
                    servo_navi: true,
                    5_axis_auto_tuning: true
                },
                
                tcpc: true,
                tcpc_name: "5-Axis_Auto_Tuning",
                rtcp: true,
                
                memory_capacity: "256GB SSD"
            },
            
            okuma_technologies: {
                thermo_friendly_concept: {
                    enabled: true,
                    description: "Structural design that minimizes thermal deformation",
                    thermal_stability: "excellent"
                },
                collision_avoidance: {
                    enabled: true,
                    name: "CAS",
                    real_time: true,
                    3d_model_based: true
                },
                machining_navi: {
                    enabled: true,
                    description: "Automatic cutting condition optimization"
                }
            },
            
            machine_dimensions: {
                length: 3200,
                width: 3000,
                height: 3400,
                weight: 12000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "table_table",
                structure: "okuma_MU_AC_trunnion",
                chain: [
                    "base",
                    "column",
                    "saddle_Y",
                    "spindle_head_Z",
                    "spindle",
                    "table_X",
                    "trunnion_A",
                    "rotary_C"
                ],
                
                moving_masses: {
                    saddle_y: { mass: 800, cog: [0, 100, 300] },
                    spindle_head_z: { mass: 600, cog: [0, 0, 230] },
                    table_x: { mass: 1500, cog: [0, 0, 100] },
                    trunnion_a: { mass: 500, cog: [0, 0, 100] },
                    rotary_c: { mass: 250, cog: [0, 0, 50] }
                }
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "table_X" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle_Y" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head_Z" },
                a: { type: "rotation", axis: [1, 0, 0], center: [0, 0, 200], component: "trunnion_A" },
                c: { type: "rotation", axis: [0, 0, 1], center: [0, 0, 0], component: "rotary_C" }
            },
            
            geometry_reference: {
                base_path: "OKUMA/MU_5000V",
                assembly: { file: "ASSEMBLY/MU_5000V_COMPLETE.step" },
                components: {
                    base: { step_file: "COMPONENTS/BASE.step", is_fixed: true },
                    column: { step_file: "COMPONENTS/COLUMN.step", parent: "base" },
                    saddle_y: { step_file: "COMPONENTS/SADDLE_Y.step", parent: "column", joint_axis: "Y" },
                    spindle_head_z: { step_file: "COMPONENTS/SPINDLE_HEAD_Z.step", parent: "saddle_y", joint_axis: "Z" },
                    table_x: { step_file: "COMPONENTS/TABLE_X.step", parent: "base", joint_axis: "X" },
                    trunnion_a: { step_file: "COMPONENTS/TRUNNION_A.step", parent: "table_x", joint_axis: "A" },
                    rotary_c: { step_file: "COMPONENTS/ROTARY_C.step", parent: "trunnion_a", joint_axis: "C" }
                },
                collision_config: {
                    check_pairs: [
                        ["spindle", "rotary_c"], ["spindle", "trunnion_a"],
                        ["spindle_head_z", "rotary_c"], ["tool", "workpiece"]
                    ],
                    safety_margin: 2.0,
                    okuma_cas_compatible: true
                }
            }
        },
        
        {
            id: "OKUMA_MU_6300V",
            manufacturer: "Okuma",
            model: "MU-6300V",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion_large",
            description: "Large 5-axis VMC for aerospace and mold work",
            series: "MU-V",
            
            work_envelope: {
                x: { min: 0, max: 1050, unit: "mm" },
                y: { min: 0, max: 610, unit: "mm" },
                z: { min: 0, max: 600, unit: "mm" },
                a_axis: { min: -120, max: 30, unit: "deg" },
                c_axis: { min: -360, max: 360, continuous: true },
                table_diameter: 630,
                table_load_capacity: 600
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A63",
                max_rpm: 15000,
                power_rating: 30,
                power_unit: "kW",
                torque_max: 200
            },
            
            axis_specs: {
                x: { travel: 1050, rapid_rate: 40000, positioning_accuracy: 0.005 },
                y: { travel: 610, rapid_rate: 40000, positioning_accuracy: 0.005 },
                z: { travel: 600, rapid_rate: 32000, positioning_accuracy: 0.005 },
                a: { travel: { min: -120, max: 30 }, rapid_rate: 20, positioning_accuracy: 0.001 },
                c: { continuous: true, rapid_rate: 33, positioning_accuracy: 0.001 }
            },
            
            controller: { brand: "Okuma", model: "OSP-P300A", axes_count: 5, tcpc: true },
            
            machine_dimensions: { length: 4100, width: 3600, height: 3700, weight: 18000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "table_table",
                structure: "okuma_MU_AC_trunnion_large",
                chain: ["base", "column", "saddle_Y", "spindle_head_Z", "spindle", "table_X", "trunnion_A", "rotary_C"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "table_X" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle_Y" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head_Z" },
                a: { type: "rotation", axis: [1, 0, 0], center: [0, 0, 250], component: "trunnion_A" },
                c: { type: "rotation", axis: [0, 0, 1], component: "rotary_C" }
            }
        },

        // ============================================
        // GENOS VMC SERIES
        // ============================================
        {
            id: "OKUMA_GENOS_M560V",
            manufacturer: "Okuma",
            model: "GENOS M560-V",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc",
            description: "High-value vertical machining center",
            series: "GENOS M",
            
            work_envelope: {
                x: { min: 0, max: 1050, unit: "mm" },
                y: { min: 0, max: 560, unit: "mm" },
                z: { min: 0, max: 460, unit: "mm" },
                table_length: 1300,
                table_width: 560,
                table_load_capacity: 900,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "BT40",
                max_rpm: 15000,
                power_rating: 22,
                power_unit: "kW",
                torque_max: 151,
                torque_unit: "Nm"
            },
            
            axis_specs: {
                x: { travel: 1050, rapid_rate: 40000, guideway_type: "linear_roller", positioning_accuracy: 0.005 },
                y: { travel: 560, rapid_rate: 40000, guideway_type: "linear_roller", positioning_accuracy: 0.005 },
                z: { travel: 460, rapid_rate: 32000, guideway_type: "linear_roller", positioning_accuracy: 0.005 }
            },
            
            atc: { type: "arm_type", capacity: 32, max_tool_diameter: 80, tool_change_time: 1.3 },
            
            controller: { brand: "Okuma", model: "OSP-P300A", axes_count: 3 },
            
            machine_dimensions: { length: 3000, width: 2500, height: 3000, weight: 8500, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "traveling_column",
                chain: ["base", "table_fixed", "column_X", "saddle_Y", "spindle_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "column" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" }
            }
        },

        // ============================================
        // MB-V VMC SERIES
        // ============================================
        {
            id: "OKUMA_MB_5000H",
            manufacturer: "Okuma",
            model: "MB-5000H",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc",
            description: "High-performance horizontal machining center",
            series: "MB-H",
            
            work_envelope: {
                x: { min: 0, max: 730, unit: "mm" },
                y: { min: 0, max: 730, unit: "mm" },
                z: { min: 0, max: 680, unit: "mm" },
                b_axis: { min: 0, max: 360, indexing: 0.001 },
                pallet_size: 500,
                table_load_capacity: 500
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A63",
                max_rpm: 15000,
                power_rating: 30,
                power_unit: "kW",
                torque_max: 200,
                orientation: "horizontal"
            },
            
            axis_specs: {
                x: { travel: 730, rapid_rate: 50000, guideway_type: "linear_roller", positioning_accuracy: 0.004 },
                y: { travel: 730, rapid_rate: 50000, guideway_type: "linear_roller", positioning_accuracy: 0.004 },
                z: { travel: 680, rapid_rate: 50000, guideway_type: "linear_roller", positioning_accuracy: 0.004 },
                b: { indexing: 0.001, full_contouring: true, max_torque: 1500, drive_type: "direct_drive" }
            },
            
            pallet_changer: { type: "dual_pallet", pallet_count: 2, pallet_change_time: 8 },
            
            atc: { type: "chain_magazine", capacity: 48, tool_change_time: 1.5 },
            
            controller: { brand: "Okuma", model: "OSP-P300A", axes_count: 4 },
            
            machine_dimensions: { length: 4200, width: 3400, height: 3200, weight: 16000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "T_configuration",
                structure: "traveling_column_HMC",
                chain: ["base", "pallet_B", "column_Z", "saddle_Y", "spindle_X"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "spindle_head" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "column" },
                b: { type: "rotation", axis: [0, 1, 0], component: "pallet" }
            }
        },

        // ============================================
        // MULTUS MILL-TURN SERIES
        // ============================================
        {
            id: "OKUMA_MULTUS_B300II",
            manufacturer: "Okuma",
            model: "MULTUS B300II",
            type: "mill_turn_center",
            subtype: "5_axis_mill_turn",
            description: "Intelligent multitasking machine with B-axis",
            series: "MULTUS B",
            
            work_envelope: {
                max_turning_diameter: 680,
                max_turning_length: 1500,
                max_bar_capacity: 80,
                milling_travel_x: 690,
                milling_travel_y: { min: -160, max: 160 },
                milling_travel_z: 1545,
                unit: "mm"
            },
            
            main_spindle: {
                type: "built_in_motor",
                chuck_size: 10,
                chuck_size_unit: "inch",
                bore_diameter: 91,
                max_rpm: 5000,
                power_rating: 30,
                power_unit: "kW",
                torque_max: 668,
                c_axis: true,
                c_axis_indexing: 0.0001
            },
            
            sub_spindle: {
                type: "built_in_motor",
                chuck_size: 8,
                chuck_size_unit: "inch",
                max_rpm: 6000,
                power_rating: 22,
                c_axis: true,
                travel_w: 1545
            },
            
            milling_spindle: {
                type: "built_in_motor",
                taper: "Capto_C6",
                max_rpm: 12000,
                power_rating: 22,
                power_unit: "kW",
                torque_max: 120,
                b_axis: true,
                b_axis_travel: { min: -30, max: 210 }
            },
            
            axis_specs: {
                x: { travel: 690, rapid_rate: 40000, positioning_accuracy: 0.004 },
                y: { travel: { min: -160, max: 160 }, rapid_rate: 40000, positioning_accuracy: 0.004 },
                z: { travel: 1545, rapid_rate: 40000, positioning_accuracy: 0.005 },
                b: { travel: { min: -30, max: 210 }, drive_type: "direct_drive", positioning_accuracy: 0.001 },
                c1: { continuous: true, indexing: 0.0001 },
                c2: { continuous: true, indexing: 0.0001 },
                w: { travel: 1545, rapid_rate: 40000 }
            },
            
            turret: {
                lower_turret: {
                    type: "VDI_50",
                    stations: 12,
                    live_tooling: true,
                    live_tool_rpm: 5000
                }
            },
            
            atc: { type: "chain_magazine", capacity: 40, tool_change_time: 2.0 },
            
            controller: {
                brand: "Okuma",
                model: "OSP-P300A",
                axes_count: 9,
                tcpc: true,
                multitasking_features: {
                    superimposition: true,
                    balance_cut: true,
                    turn_cut: true
                }
            },
            
            machine_dimensions: { length: 6500, width: 2700, height: 2900, weight: 20000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "mill_turn_dual_spindle",
                structure: "multus_B_axis",
                chain: ["bed", "main_spindle_C1", "cross_slide_X", "y_slide_Y", "upper_slide_Z", "b_head_B", "milling_spindle", "lower_turret", "sub_spindle_C2_W"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "cross_slide" },
                y: { type: "translation", vector: [0, 1, 0], component: "y_slide" },
                z: { type: "translation", vector: [0, 0, 1], component: "upper_slide" },
                b: { type: "rotation", axis: [0, 1, 0], component: "b_head" },
                c1: { type: "rotation", axis: [0, 0, 1], component: "main_spindle" },
                c2: { type: "rotation", axis: [0, 0, 1], component: "sub_spindle" },
                w: { type: "translation", vector: [0, 0, 1], component: "sub_headstock" }
            }
        },
        
        {
            id: "OKUMA_MULTUS_U4000",
            manufacturer: "Okuma",
            model: "MULTUS U4000",
            type: "mill_turn_center",
            subtype: "5_axis_mill_turn_universal",
            description: "Universal multitasking machine",
            series: "MULTUS U",
            
            work_envelope: {
                max_turning_diameter: 600,
                max_turning_length: 1500,
                max_bar_capacity: 77,
                unit: "mm"
            },
            
            main_spindle: {
                type: "built_in_motor",
                max_rpm: 4000,
                power_rating: 30,
                torque_max: 795,
                c_axis: true
            },
            
            milling_spindle: {
                type: "built_in_motor",
                taper: "Capto_C6",
                max_rpm: 10000,
                power_rating: 22,
                b_axis: true,
                b_axis_travel: { min: -30, max: 195 }
            },
            
            axis_specs: {
                x: { travel: 600, rapid_rate: 32000, positioning_accuracy: 0.004 },
                y: { travel: { min: -110, max: 110 }, rapid_rate: 32000, positioning_accuracy: 0.004 },
                z: { travel: 1550, rapid_rate: 32000, positioning_accuracy: 0.005 },
                b: { travel: { min: -30, max: 195 }, positioning_accuracy: 0.001 },
                c: { continuous: true, indexing: 0.0001 }
            },
            
            controller: { brand: "Okuma", model: "OSP-P300A", axes_count: 5, tcpc: true },
            
            machine_dimensions: { length: 5800, width: 2500, height: 2600, weight: 16000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "mill_turn_single_spindle",
                structure: "multus_universal",
                chain: ["bed", "spindle_C", "cross_slide_X", "y_slide_Y", "z_slide_Z", "b_head_B", "milling_spindle"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "cross_slide" },
                y: { type: "translation", vector: [0, 1, 0], component: "y_slide" },
                z: { type: "translation", vector: [0, 0, 1], component: "z_slide" },
                b: { type: "rotation", axis: [0, 1, 0], component: "b_head" },
                c: { type: "rotation", axis: [0, 0, 1], component: "spindle" }
            }
        },

        // ============================================
        // LB TURNING SERIES
        // ============================================
        {
            id: "OKUMA_LB3000_EXII_MY",
            manufacturer: "Okuma",
            model: "LB3000 EX II MY",
            type: "turning_center",
            subtype: "y_axis_lathe",
            description: "High-performance turning center with Y-axis and milling",
            series: "LB EX II",
            
            work_envelope: {
                swing_over_bed: 700,
                swing_over_cross_slide: 480,
                max_turning_diameter: 400,
                max_turning_length: 500,
                bar_capacity: 80,
                unit: "mm"
            },
            
            spindle: {
                type: "built_in_motor",
                brand: "Okuma_PREX",
                chuck_size: 10,
                chuck_size_unit: "inch",
                bore_diameter: 91,
                max_rpm: 5000,
                power_rating: 22,
                power_unit: "kW",
                torque_max: 447,
                torque_unit: "Nm",
                c_axis: true,
                c_axis_indexing: 0.0001
            },
            
            axis_specs: {
                x: {
                    travel: 260,
                    rapid_rate: 30000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.004,
                    repeatability: 0.002
                },
                y: {
                    travel: { min: -60, max: 60 },
                    total_travel: 120,
                    rapid_rate: 18000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.004
                },
                z: {
                    travel: 570,
                    rapid_rate: 30000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.005
                },
                c: {
                    type: "main_spindle_positioning",
                    indexing: 0.0001,
                    clamping_torque: 250
                }
            },
            
            turret: {
                type: "BMT_55",
                stations: 12,
                live_tooling: true,
                live_stations: 12,
                live_tool_rpm: 6000,
                live_tool_power: 5.5,
                y_axis_milling: true,
                indexing_time: 0.15
            },
            
            tailstock: {
                quill_travel: 100,
                taper: "MT4",
                programmable: true
            },
            
            controller: {
                brand: "Okuma",
                model: "OSP-P300A",
                axes_count: 4,
                c_axis: true,
                y_axis: true,
                thermo_friendly: true
            },
            
            machine_dimensions: { length: 3600, width: 1900, height: 1900, weight: 7000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "lathe_Y_axis",
                structure: "slant_bed_with_Y",
                chain: ["bed", "headstock_spindle_C", "cross_slide_X", "y_slide_Y", "turret_Z"],
                bed_angle: 60
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "cross_slide" },
                y: { type: "translation", vector: [0, 1, 0], component: "y_slide" },
                z: { type: "translation", vector: [0, 0, 1], component: "turret" },
                c: { type: "rotation", axis: [0, 0, 1], component: "spindle" }
            }
        },
        
        {
            id: "OKUMA_LB4000_EXII",
            manufacturer: "Okuma",
            model: "LB4000 EX II",
            type: "turning_center",
            subtype: "large_lathe",
            description: "Large heavy-duty turning center",
            series: "LB EX II",
            
            work_envelope: {
                swing_over_bed: 860,
                max_turning_diameter: 560,
                max_turning_length: 1000,
                bar_capacity: 102,
                unit: "mm"
            },
            
            spindle: {
                type: "built_in_motor",
                chuck_size: 15,
                bore_diameter: 112,
                max_rpm: 3500,
                power_rating: 37,
                torque_max: 1068,
                c_axis: true
            },
            
            axis_specs: {
                x: { travel: 310, rapid_rate: 20000, positioning_accuracy: 0.005 },
                z: { travel: 1100, rapid_rate: 20000, positioning_accuracy: 0.006 },
                c: { indexing: 0.0001 }
            },
            
            turret: { type: "VDI_50", stations: 12, live_tooling: true },
            
            controller: { brand: "Okuma", model: "OSP-P300A", axes_count: 3 },
            
            machine_dimensions: { length: 4500, width: 2100, height: 2000, weight: 11000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "lathe_standard",
                structure: "slant_bed",
                chain: ["bed", "headstock_spindle_C", "cross_slide_X", "turret_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "cross_slide" },
                z: { type: "translation", vector: [0, 0, 1], component: "turret" },
                c: { type: "rotation", axis: [0, 0, 1], component: "spindle" }
            }
        },

        // ============================================
        // GENOS TURNING SERIES
        // ============================================
        {
            id: "OKUMA_GENOS_L300MY",
            manufacturer: "Okuma",
            model: "GENOS L300-MY",
            type: "turning_center",
            subtype: "compact_y_axis_lathe",
            description: "High-value turning center with Y-axis",
            series: "GENOS L",
            
            work_envelope: {
                swing_over_bed: 580,
                max_turning_diameter: 300,
                max_turning_length: 400,
                bar_capacity: 52,
                unit: "mm"
            },
            
            spindle: {
                type: "built_in_motor",
                chuck_size: 8,
                max_rpm: 5000,
                power_rating: 15,
                torque_max: 286,
                c_axis: true
            },
            
            axis_specs: {
                x: { travel: 180, rapid_rate: 30000, positioning_accuracy: 0.005 },
                y: { travel: { min: -40, max: 40 }, rapid_rate: 15000, positioning_accuracy: 0.005 },
                z: { travel: 450, rapid_rate: 30000, positioning_accuracy: 0.006 },
                c: { indexing: 0.001 }
            },
            
            turret: { type: "BMT_45", stations: 12, live_tooling: true, live_tool_rpm: 6000 },
            
            controller: { brand: "Okuma", model: "OSP-P300A", axes_count: 4 },
            
            machine_dimensions: { length: 2800, width: 1650, height: 1750, weight: 4500, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "lathe_Y_axis",
                structure: "compact_slant_bed",
                chain: ["bed", "headstock_C", "cross_slide_X", "y_slide_Y", "turret_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "cross_slide" },
                y: { type: "translation", vector: [0, 1, 0], component: "y_slide" },
                z: { type: "translation", vector: [0, 0, 1], component: "turret" },
                c: { type: "rotation", axis: [0, 0, 1], component: "spindle" }
            }
        },

        // ============================================
        // 2SP TWIN SPINDLE
        // ============================================
        {
            id: "OKUMA_2SP_V760EX",
            manufacturer: "Okuma",
            model: "2SP-V760EX",
            type: "turning_center",
            subtype: "twin_spindle_vtl",
            description: "Twin-spindle vertical turning lathe for high production",
            series: "2SP",
            
            work_envelope: {
                max_turning_diameter: 760,
                max_turning_height: 343,
                chuck_size: 610,
                unit: "mm"
            },
            
            spindle: {
                type: "integral_table",
                spindles: 2,
                max_rpm: 1000,
                power_rating: 30,
                power_unit: "kW",
                torque_max: 955
            },
            
            axis_specs: {
                x1: { travel: 400, rapid_rate: 40000, positioning_accuracy: 0.004 },
                z1: { travel: 350, rapid_rate: 40000, positioning_accuracy: 0.004 },
                x2: { travel: 400, rapid_rate: 40000, positioning_accuracy: 0.004 },
                z2: { travel: 350, rapid_rate: 40000, positioning_accuracy: 0.004 }
            },
            
            turrets: {
                left_turret: { stations: 8, type: "VDI_40" },
                right_turret: { stations: 8, type: "VDI_40" }
            },
            
            controller: { brand: "Okuma", model: "OSP-P300A", axes_count: 4 },
            
            machine_dimensions: { length: 4500, width: 2800, height: 3200, weight: 18000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "twin_spindle_vtl",
                structure: "inverted_dual",
                chain: ["base", "left_spindle", "left_turret_X1_Z1", "right_spindle", "right_turret_X2_Z2"]
            },
            
            transformations: {
                x1: { type: "translation", vector: [1, 0, 0], component: "left_turret" },
                z1: { type: "translation", vector: [0, 0, 1], component: "left_turret" },
                x2: { type: "translation", vector: [1, 0, 0], component: "right_turret" },
                z2: { type: "translation", vector: [0, 0, 1], component: "right_turret" }
            }
        },

        // ============================================
        // MCR DOUBLE COLUMN
        // ============================================
        {
            id: "OKUMA_MCR_A5CII",
            manufacturer: "Okuma",
            model: "MCR-A5CII",
            type: "double_column_machining_center",
            subtype: "5_axis_bridge",
            description: "Large 5-axis double-column for aerospace",
            series: "MCR",
            
            work_envelope: {
                x: { min: 0, max: 4000, unit: "mm" },
                y: { min: 0, max: 2000, unit: "mm" },
                z: { min: 0, max: 800, unit: "mm" },
                a_axis: { min: -110, max: 110, unit: "deg" },
                c_axis: { min: -360, max: 360, continuous: true },
                table_length: 4500,
                table_width: 2000,
                table_load_capacity: 10000
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A100",
                max_rpm: 10000,
                power_rating: 45,
                torque_max: 400,
                b_axis_head: true
            },
            
            axis_specs: {
                x: { travel: 4000, rapid_rate: 30000, positioning_accuracy: 0.010 },
                y: { travel: 2000, rapid_rate: 30000, positioning_accuracy: 0.010 },
                z: { travel: 800, rapid_rate: 24000, positioning_accuracy: 0.010 },
                a: { travel: { min: -110, max: 110 }, drive_type: "direct_drive", positioning_accuracy: 0.001 },
                c: { continuous: true, drive_type: "direct_drive", positioning_accuracy: 0.001 }
            },
            
            controller: { brand: "Okuma", model: "OSP-P500", axes_count: 5, tcpc: true },
            
            machine_dimensions: { length: 10000, width: 5500, height: 5000, weight: 75000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "head_head",
                structure: "bridge_AC_head",
                chain: ["base", "table_fixed", "bridge_X", "crossrail_Y", "ram_Z", "fork_A", "spindle_C"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "bridge" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "ram" },
                a: { type: "rotation", axis: [1, 0, 0], component: "fork_head" },
                c: { type: "rotation", axis: [0, 0, 1], component: "spindle" }
            }
        }
    ],

    // Helper functions
    getMachineById: function(id) { return this.machines.find(m => m.id === id); },
    getMachinesByType: function(type) { return this.machines.filter(m => m.type === type); },
    getMachinesBySeries: function(series) { return this.machines.filter(m => m.series === series); },
    get5AxisMachines: function() { return this.machines.filter(m => m.subtype && m.subtype.includes("5_axis")); },
    getMultusMachines: function() { return this.machines.filter(m => m.series && m.series.includes("MULTUS")); },
    getLathes: function() { return this.machines.filter(m => m.type === "turning_center"); },
    
    exportForSimulation: function(machineId) {
        const machine = this.getMachineById(machineId);
        if (!machine) return null;
        return {
            id: machine.id,
            name: `${machine.manufacturer} ${machine.model}`,
            kinematic_chain: machine.kinematic_chain,
            transformations: machine.transformations,
            axis_specs: machine.axis_specs,
            work_envelope: machine.work_envelope,
            geometry_reference: machine.geometry_reference,
            okuma_technologies: machine.okuma_technologies
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRISM_OKUMA_MACHINE_DATABASE_ENHANCED;
}
if (typeof window !== 'undefined') {
    window.PRISM_OKUMA_MACHINE_DATABASE_ENHANCED = PRISM_OKUMA_MACHINE_DATABASE_ENHANCED;
}
