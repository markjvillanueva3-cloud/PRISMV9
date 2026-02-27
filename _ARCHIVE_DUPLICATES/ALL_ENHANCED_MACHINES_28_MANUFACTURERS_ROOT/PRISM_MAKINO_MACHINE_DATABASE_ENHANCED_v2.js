/**
 * PRISM_MAKINO_MACHINE_DATABASE_ENHANCED_v2.js
 * LEVEL 4 ENHANCED - Full Kinematics + Collision Ready
 * 
 * Makino is a Japanese machine tool manufacturer renowned for die/mold machining,
 * aerospace, and high-precision parts. Famous for exceptional surface finish,
 * accuracy, and the Professional series controls.
 * 
 * @version 2.0.0
 * @created 2026-01-20
 * @session 0.EXT.2f.9
 */

const PRISM_MAKINO_MACHINE_DATABASE_ENHANCED = {
    metadata: {
        manufacturer: "Makino",
        full_name: "Makino Milling Machine Co., Ltd.",
        country: "Japan",
        founded: 1937,
        headquarters: "Tokyo, Japan",
        specialty: "Die/mold, aerospace, high-precision vertical/horizontal machining",
        controller: "Professional 6 (Pro6)",
        unique: "Industry-leading surface finish, thermal stability, HSK spindles",
        website: "https://www.makino.com",
        version: "2.0.0-LEVEL4-ENHANCED",
        last_updated: "2026-01-20",
        machine_count: 12,
        enhancement_level: 4
    },

    machines: [
        // ============================================
        // 5-AXIS VMC - D SERIES
        // ============================================
        {
            id: "MAKINO_D500",
            manufacturer: "Makino",
            model: "D500",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            description: "5-axis vertical machining center for aerospace and medical",
            series: "D",
            
            work_envelope: {
                x: { min: 0, max: 500, unit: "mm" },
                y: { min: 0, max: 500, unit: "mm" },
                z: { min: 0, max: 400, unit: "mm" },
                a_axis: { min: -125, max: 10, unit: "deg" },
                c_axis: { min: -360, max: 360, continuous: true, unit: "deg" },
                table_diameter: 400,
                max_workpiece_diameter: 500,
                max_workpiece_height: 350,
                table_load_capacity: 200,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                model: "Makino_HSK",
                taper: "HSK-A63",
                max_rpm: 20000,
                power_rating: 22,
                power_unit: "kW",
                torque_max: 120,
                torque_unit: "Nm",
                bearing_type: "ceramic_hybrid_angular_contact",
                bearing_lubrication: "oil_air",
                cooling: "core_cooling",
                runout_TIR: 0.001,
                thermal_stability: "excellent"
            },
            
            axis_specs: {
                x: {
                    travel: 500,
                    rapid_rate: 60000,
                    max_feed: 60000,
                    acceleration: 1.0,
                    acceleration_unit: "g",
                    motor_type: "linear_motor",
                    guideway_type: "linear_roller",
                    encoder_type: "linear_scale",
                    encoder_resolution: 0.0001,
                    positioning_accuracy: 0.002,
                    repeatability: 0.001
                },
                y: {
                    travel: 500,
                    rapid_rate: 60000,
                    max_feed: 60000,
                    acceleration: 1.0,
                    motor_type: "linear_motor",
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.002,
                    repeatability: 0.001
                },
                z: {
                    travel: 400,
                    rapid_rate: 50000,
                    max_feed: 50000,
                    acceleration: 0.8,
                    motor_type: "linear_motor",
                    guideway_type: "linear_roller",
                    counterbalance: "pneumatic",
                    positioning_accuracy: 0.002,
                    repeatability: 0.001
                },
                a: {
                    type: "tilting_trunnion",
                    travel: { min: -125, max: 10 },
                    rapid_rate: 100,
                    rapid_rate_unit: "rpm",
                    max_torque: 800,
                    clamping_torque: 1600,
                    drive_type: "direct_drive_torque_motor",
                    positioning_accuracy: 0.001,
                    repeatability: 0.0005,
                    rotation_center_height: 180
                },
                c: {
                    type: "rotary_table",
                    continuous: true,
                    rapid_rate: 150,
                    rapid_rate_unit: "rpm",
                    max_torque: 500,
                    clamping_torque: 1000,
                    drive_type: "direct_drive_torque_motor",
                    positioning_accuracy: 0.001,
                    repeatability: 0.0005
                }
            },
            
            atc: {
                type: "matrix_magazine",
                capacity: 50,
                capacity_options: [50, 100, 150, 200, 300],
                max_tool_diameter: 80,
                max_tool_length: 300,
                max_tool_weight: 8,
                tool_change_time: 2.5,
                chip_to_chip_time: 5.5,
                random_access: true
            },
            
            controller: {
                brand: "Makino",
                model: "Professional 6",
                type: "proprietary",
                axes_count: 5,
                simultaneous_axes: 5,
                
                pro6_features: {
                    super_geometric_intelligence: true,
                    sgi_plus: true,
                    inertia_active_control: true,
                    motion_control_optimization: true,
                    geometric_intelligence: true
                },
                
                tcpc: true,
                rtcp: true,
                look_ahead_blocks: 1000,
                block_processing_time: 0.5
            },
            
            thermal_management: {
                core_cooling: true,
                spindle_cooling: true,
                ballscrew_cooling: false,
                linear_motor_cooling: true,
                thermal_displacement_compensation: true
            },
            
            machine_dimensions: {
                length: 2900,
                width: 2600,
                height: 3300,
                weight: 10000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "table_table",
                structure: "makino_D_AC_trunnion",
                chain: [
                    "base",
                    "column",
                    "y_saddle",
                    "z_ram",
                    "spindle",
                    "x_table",
                    "a_trunnion",
                    "c_table"
                ],
                
                moving_masses: {
                    y_saddle: { mass: 600, cog: [0, 150, 400] },
                    z_ram: { mass: 500, cog: [0, 0, 200] },
                    x_table: { mass: 800, cog: [0, 0, 100] },
                    a_trunnion: { mass: 350, cog: [0, 0, 90] },
                    c_table: { mass: 150, cog: [0, 0, 40] }
                }
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "x_table" },
                y: { type: "translation", vector: [0, 1, 0], component: "y_saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "z_ram" },
                a: { type: "rotation", axis: [1, 0, 0], center: [0, 0, 180], component: "a_trunnion" },
                c: { type: "rotation", axis: [0, 0, 1], center: [0, 0, 0], component: "c_table" }
            },
            
            geometry_reference: {
                base_path: "MAKINO/D500",
                assembly: { file: "ASSEMBLY/D500_COMPLETE.step" },
                components: {
                    base: { step_file: "COMPONENTS/BASE.step", is_fixed: true },
                    column: { step_file: "COMPONENTS/COLUMN.step", parent: "base" },
                    y_saddle: { step_file: "COMPONENTS/Y_SADDLE.step", parent: "column", joint_axis: "Y" },
                    z_ram: { step_file: "COMPONENTS/Z_RAM.step", parent: "y_saddle", joint_axis: "Z" },
                    x_table: { step_file: "COMPONENTS/X_TABLE.step", parent: "base", joint_axis: "X" },
                    a_trunnion: { step_file: "COMPONENTS/A_TRUNNION.step", parent: "x_table", joint_axis: "A" },
                    c_table: { step_file: "COMPONENTS/C_TABLE.step", parent: "a_trunnion", joint_axis: "C" }
                },
                collision_config: {
                    check_pairs: [
                        ["spindle", "c_table"], ["spindle", "a_trunnion"],
                        ["z_ram", "c_table"], ["tool", "workpiece"]
                    ],
                    safety_margin: 2.0
                }
            }
        },
        
        {
            id: "MAKINO_D800Z",
            manufacturer: "Makino",
            model: "D800Z",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion_large",
            description: "Large 5-axis for aerospace structural components",
            series: "D",
            
            work_envelope: {
                x: { min: 0, max: 1300, unit: "mm" },
                y: { min: 0, max: 1000, unit: "mm" },
                z: { min: 0, max: 650, unit: "mm" },
                a_axis: { min: -30, max: 120, unit: "deg" },
                c_axis: { min: -360, max: 360, continuous: true },
                table_diameter: 800,
                table_load_capacity: 1200
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A100",
                max_rpm: 12000,
                power_rating: 45,
                torque_max: 350
            },
            
            axis_specs: {
                x: { travel: 1300, rapid_rate: 36000, motor_type: "servo", positioning_accuracy: 0.003 },
                y: { travel: 1000, rapid_rate: 36000, motor_type: "servo", positioning_accuracy: 0.003 },
                z: { travel: 650, rapid_rate: 30000, motor_type: "servo", positioning_accuracy: 0.003 },
                a: { travel: { min: -30, max: 120 }, drive_type: "direct_drive", positioning_accuracy: 0.001 },
                c: { continuous: true, drive_type: "direct_drive", positioning_accuracy: 0.001 }
            },
            
            controller: { brand: "Makino", model: "Professional 6", axes_count: 5, tcpc: true },
            
            machine_dimensions: { length: 5500, width: 4000, height: 4200, weight: 28000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "table_table",
                structure: "makino_D_large_AC",
                chain: ["base", "column", "y_saddle", "z_ram", "spindle", "x_table", "a_trunnion", "c_table"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "x_table" },
                y: { type: "translation", vector: [0, 1, 0], component: "y_saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "z_ram" },
                a: { type: "rotation", axis: [1, 0, 0], center: [0, 0, 300], component: "a_trunnion" },
                c: { type: "rotation", axis: [0, 0, 1], component: "c_table" }
            }
        },

        // ============================================
        // HORIZONTAL - a SERIES
        // ============================================
        {
            id: "MAKINO_A61NX",
            manufacturer: "Makino",
            model: "a61nx",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc",
            description: "High-performance horizontal machining center",
            series: "a",
            
            work_envelope: {
                x: { min: 0, max: 730, unit: "mm" },
                y: { min: 0, max: 650, unit: "mm" },
                z: { min: 0, max: 800, unit: "mm" },
                b_axis: { min: 0, max: 360, indexing: 0.0001 },
                pallet_size: 400,
                max_workpiece_diameter: 630,
                max_workpiece_height: 900,
                table_load_capacity: 400
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A63",
                max_rpm: 14000,
                power_rating: 26,
                power_unit: "kW",
                torque_max: 303,
                orientation: "horizontal"
            },
            
            axis_specs: {
                x: { travel: 730, rapid_rate: 60000, acceleration: 1.0, motor_type: "linear_motor", positioning_accuracy: 0.002 },
                y: { travel: 650, rapid_rate: 60000, acceleration: 1.0, motor_type: "linear_motor", positioning_accuracy: 0.002 },
                z: { travel: 800, rapid_rate: 60000, acceleration: 1.0, motor_type: "linear_motor", positioning_accuracy: 0.002 },
                b: { indexing: 0.0001, full_contouring: true, max_torque: 1600, drive_type: "direct_drive" }
            },
            
            pallet_changer: {
                type: "dual_pallet",
                pallet_count: 2,
                pallet_size: 400,
                pallet_change_time: 5.9,
                automation_ready: true
            },
            
            atc: {
                type: "matrix_magazine",
                capacity: 60,
                capacity_options: [60, 100, 166, 219, 313],
                tool_change_time: 0.9,
                chip_to_chip_time: 2.4
            },
            
            controller: {
                brand: "Makino",
                model: "Professional 6",
                axes_count: 4,
                tcpc: true,
                sgi_plus: true
            },
            
            machine_dimensions: { length: 4200, width: 3200, height: 3100, weight: 14000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "T_configuration",
                structure: "makino_a_series",
                chain: ["base", "pallet_B", "column_Z", "saddle_Y", "spindle_X"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "spindle_head" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "column" },
                b: { type: "rotation", axis: [0, 1, 0], component: "pallet" }
            }
        },
        
        {
            id: "MAKINO_A81NX",
            manufacturer: "Makino",
            model: "a81nx",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc_large",
            description: "Large horizontal machining center for heavy cutting",
            series: "a",
            
            work_envelope: {
                x: { min: 0, max: 900, unit: "mm" },
                y: { min: 0, max: 800, unit: "mm" },
                z: { min: 0, max: 1000, unit: "mm" },
                b_axis: { min: 0, max: 360, indexing: 0.0001 },
                pallet_size: 500,
                table_load_capacity: 700
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A100",
                max_rpm: 10000,
                power_rating: 45,
                torque_max: 573
            },
            
            axis_specs: {
                x: { travel: 900, rapid_rate: 50000, motor_type: "servo", positioning_accuracy: 0.003 },
                y: { travel: 800, rapid_rate: 50000, motor_type: "servo", positioning_accuracy: 0.003 },
                z: { travel: 1000, rapid_rate: 50000, motor_type: "servo", positioning_accuracy: 0.003 },
                b: { indexing: 0.0001, drive_type: "direct_drive" }
            },
            
            controller: { brand: "Makino", model: "Professional 6", axes_count: 4 },
            
            machine_dimensions: { length: 5200, width: 4000, height: 3500, weight: 22000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "T_configuration",
                structure: "makino_a_series_large",
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
        // HIGH-SPEED - PS/F SERIES
        // ============================================
        {
            id: "MAKINO_PS95",
            manufacturer: "Makino",
            model: "PS95",
            type: "vertical_machining_center",
            subtype: "high_speed_vmc",
            description: "High-speed production VMC",
            series: "PS",
            
            work_envelope: {
                x: { min: 0, max: 900, unit: "mm" },
                y: { min: 0, max: 500, unit: "mm" },
                z: { min: 0, max: 450, unit: "mm" },
                table_length: 1000,
                table_width: 500,
                table_load_capacity: 500
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A63",
                max_rpm: 14000,
                power_rating: 22,
                torque_max: 151
            },
            
            axis_specs: {
                x: { travel: 900, rapid_rate: 50000, acceleration: 0.7, positioning_accuracy: 0.003 },
                y: { travel: 500, rapid_rate: 50000, acceleration: 0.7, positioning_accuracy: 0.003 },
                z: { travel: 450, rapid_rate: 45000, acceleration: 0.6, positioning_accuracy: 0.003 }
            },
            
            atc: { type: "arm_type", capacity: 30, tool_change_time: 1.3 },
            
            controller: { brand: "Makino", model: "Professional 6", axes_count: 3 },
            
            machine_dimensions: { length: 3200, width: 2700, height: 3100, weight: 9000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "fixed_column",
                chain: ["base", "column", "table_X", "saddle_Y", "spindle_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "table" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" }
            }
        },
        
        {
            id: "MAKINO_F5",
            manufacturer: "Makino",
            model: "F5",
            type: "vertical_machining_center",
            subtype: "high_precision_vmc",
            description: "High-precision die/mold VMC",
            series: "F",
            
            work_envelope: {
                x: { min: 0, max: 900, unit: "mm" },
                y: { min: 0, max: 500, unit: "mm" },
                z: { min: 0, max: 450, unit: "mm" },
                table_length: 1100,
                table_width: 500,
                table_load_capacity: 500
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A63",
                max_rpm: 20000,
                power_rating: 25,
                torque_max: 96,
                bearing_type: "ceramic_hybrid"
            },
            
            axis_specs: {
                x: { travel: 900, rapid_rate: 36000, positioning_accuracy: 0.002, repeatability: 0.001 },
                y: { travel: 500, rapid_rate: 36000, positioning_accuracy: 0.002, repeatability: 0.001 },
                z: { travel: 450, rapid_rate: 30000, positioning_accuracy: 0.002, repeatability: 0.001 }
            },
            
            controller: {
                brand: "Makino",
                model: "Professional 6",
                axes_count: 3,
                sgi_plus: true,
                super_geometric_intelligence: true
            },
            
            machine_dimensions: { length: 3100, width: 2800, height: 3200, weight: 10500, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "fixed_column_precision",
                chain: ["base", "column", "table_X", "saddle_Y", "spindle_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "table" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" }
            }
        },

        // ============================================
        // GRAPHITE - iQ SERIES
        // ============================================
        {
            id: "MAKINO_IQ500",
            manufacturer: "Makino",
            model: "iQ500",
            type: "vertical_machining_center",
            subtype: "graphite_high_speed",
            description: "High-speed graphite machining center",
            series: "iQ",
            
            work_envelope: {
                x: { min: 0, max: 500, unit: "mm" },
                y: { min: 0, max: 400, unit: "mm" },
                z: { min: 0, max: 300, unit: "mm" },
                table_length: 600,
                table_width: 400,
                table_load_capacity: 200
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-E40",
                max_rpm: 40000,
                power_rating: 12,
                power_unit: "kW",
                torque_max: 9,
                bearing_type: "ceramic_hybrid",
                air_purge: true
            },
            
            axis_specs: {
                x: { travel: 500, rapid_rate: 50000, acceleration: 1.2, motor_type: "linear_motor", positioning_accuracy: 0.002 },
                y: { travel: 400, rapid_rate: 50000, acceleration: 1.2, motor_type: "linear_motor", positioning_accuracy: 0.002 },
                z: { travel: 300, rapid_rate: 40000, acceleration: 1.0, motor_type: "linear_motor", positioning_accuracy: 0.002 }
            },
            
            graphite_features: {
                graphite_optimized: true,
                dust_collection: true,
                fully_enclosed: true,
                spindle_air_purge: true,
                sealed_guideways: true
            },
            
            atc: { type: "turret_disc", capacity: 20, tool_change_time: 1.5 },
            
            controller: { brand: "Makino", model: "Professional 6", axes_count: 3 },
            
            machine_dimensions: { length: 2200, width: 2000, height: 2700, weight: 5500, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "moving_column_graphite",
                chain: ["base", "table_fixed", "column_X", "saddle_Y", "spindle_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "column" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" }
            }
        },

        // ============================================
        // WIRE EDM - U SERIES
        // ============================================
        {
            id: "MAKINO_U6",
            manufacturer: "Makino",
            model: "U6",
            type: "wire_edm",
            subtype: "wire_edm_precision",
            description: "High-precision wire EDM",
            series: "U",
            
            work_envelope: {
                x: { min: 0, max: 650, unit: "mm" },
                y: { min: 0, max: 450, unit: "mm" },
                z: { min: 0, max: 420, unit: "mm" },
                u_axis: { min: -50, max: 50 },
                v_axis: { min: -50, max: 50 },
                max_workpiece_weight: 1000
            },
            
            wire_system: {
                wire_diameters: [0.1, 0.15, 0.2, 0.25, 0.3],
                wire_unit: "mm",
                auto_wire_threading: true,
                wire_tension_control: true,
                submerged_cutting: true
            },
            
            axis_specs: {
                x: { travel: 650, rapid_rate: 3000, positioning_accuracy: 0.001 },
                y: { travel: 450, rapid_rate: 3000, positioning_accuracy: 0.001 },
                z: { travel: 420, rapid_rate: 1800, positioning_accuracy: 0.002 },
                u: { travel: 100, positioning_accuracy: 0.001 },
                v: { travel: 100, positioning_accuracy: 0.001 }
            },
            
            controller: {
                brand: "Makino",
                model: "Hyper i",
                axes_count: 5,
                taper_cutting: true,
                auto_threading: true
            },
            
            machine_dimensions: { length: 2800, width: 2200, height: 2700, weight: 6000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "wire_edm",
                structure: "XY_table_UV_head",
                chain: ["base", "table_XY", "upper_head_UV", "lower_guide"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "table" },
                y: { type: "translation", vector: [0, 1, 0], component: "table" },
                z: { type: "translation", vector: [0, 0, 1], component: "upper_head" },
                u: { type: "translation", vector: [1, 0, 0], component: "upper_guide" },
                v: { type: "translation", vector: [0, 1, 0], component: "upper_guide" }
            }
        },

        // ============================================
        // SINKER EDM - EDAF SERIES
        // ============================================
        {
            id: "MAKINO_EDAF3",
            manufacturer: "Makino",
            model: "EDAF3",
            type: "sinker_edm",
            subtype: "sinker_edm_precision",
            description: "High-precision sinker EDM",
            series: "EDAF",
            
            work_envelope: {
                x: { min: 0, max: 600, unit: "mm" },
                y: { min: 0, max: 400, unit: "mm" },
                z: { min: 0, max: 370, unit: "mm" },
                c_axis: { min: -360, max: 360, continuous: true, optional: true },
                max_workpiece_weight: 2000
            },
            
            axis_specs: {
                x: { travel: 600, rapid_rate: 8000, positioning_accuracy: 0.001 },
                y: { travel: 400, rapid_rate: 8000, positioning_accuracy: 0.001 },
                z: { travel: 370, rapid_rate: 8000, positioning_accuracy: 0.001 },
                c: { optional: true, continuous: true, positioning_accuracy: 0.001 }
            },
            
            generator: {
                type: "HS-RISE",
                max_current: 80,
                current_unit: "A",
                high_speed_mode: true,
                mirror_finish_mode: true
            },
            
            controller: { brand: "Makino", model: "Hyper i", axes_count: 4 },
            
            machine_dimensions: { length: 2600, width: 2100, height: 2800, weight: 6500, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "sinker_edm",
                structure: "fixed_table_moving_head",
                chain: ["base", "table_fixed", "column_X", "saddle_Y", "head_Z", "optional_C"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "column" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "head" },
                c: { type: "rotation", axis: [0, 0, 1], component: "c_axis_table" }
            }
        },

        // ============================================
        // HORIZONTAL 5-AXIS - T SERIES
        // ============================================
        {
            id: "MAKINO_T1",
            manufacturer: "Makino",
            model: "T1",
            type: "horizontal_machining_center",
            subtype: "5_axis_hmc_aerospace",
            description: "5-axis horizontal for titanium aerospace parts",
            series: "T",
            
            work_envelope: {
                x: { min: 0, max: 1300, unit: "mm" },
                y: { min: 0, max: 1100, unit: "mm" },
                z: { min: 0, max: 1050, unit: "mm" },
                a_axis: { min: -130, max: 130, unit: "deg" },
                b_axis: { min: 0, max: 360, continuous: true },
                pallet_size: 630,
                table_load_capacity: 1000
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A100",
                max_rpm: 10000,
                power_rating: 80,
                power_unit: "kW",
                torque_max: 764,
                torque_unit: "Nm",
                orientation: "horizontal",
                high_torque_titanium: true
            },
            
            axis_specs: {
                x: { travel: 1300, rapid_rate: 50000, positioning_accuracy: 0.003 },
                y: { travel: 1100, rapid_rate: 50000, positioning_accuracy: 0.003 },
                z: { travel: 1050, rapid_rate: 50000, positioning_accuracy: 0.003 },
                a: { travel: { min: -130, max: 130 }, drive_type: "direct_drive", positioning_accuracy: 0.001 },
                b: { continuous: true, drive_type: "direct_drive", positioning_accuracy: 0.001 }
            },
            
            controller: { brand: "Makino", model: "Professional 6", axes_count: 5, tcpc: true },
            
            coolant: {
                through_spindle: true,
                tsc_pressure: 70,
                high_pressure_option: 150
            },
            
            machine_dimensions: { length: 6500, width: 4500, height: 4000, weight: 38000, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "table_table",
                structure: "horizontal_AB_trunnion",
                chain: ["base", "column_Z", "saddle_Y", "spindle_X", "table_base", "a_trunnion", "b_table"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "spindle_head" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "column" },
                a: { type: "rotation", axis: [1, 0, 0], component: "a_trunnion" },
                b: { type: "rotation", axis: [0, 1, 0], component: "b_table" }
            }
        }
    ],

    // Helper functions
    getMachineById: function(id) { return this.machines.find(m => m.id === id); },
    getMachinesByType: function(type) { return this.machines.filter(m => m.type === type); },
    getMachinesBySeries: function(series) { return this.machines.filter(m => m.series === series); },
    get5AxisMachines: function() { return this.machines.filter(m => m.subtype && m.subtype.includes("5_axis")); },
    getEDMMachines: function() { return this.machines.filter(m => m.type.includes("edm")); },
    getLinearMotorMachines: function() {
        return this.machines.filter(m => 
            m.axis_specs && Object.values(m.axis_specs).some(a => a.motor_type === "linear_motor")
        );
    },
    
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
            geometry_reference: machine.geometry_reference
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRISM_MAKINO_MACHINE_DATABASE_ENHANCED;
}
if (typeof window !== 'undefined') {
    window.PRISM_MAKINO_MACHINE_DATABASE_ENHANCED = PRISM_MAKINO_MACHINE_DATABASE_ENHANCED;
}
