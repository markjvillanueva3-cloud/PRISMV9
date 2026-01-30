/**
 * PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v2.js
 * LEVEL 4 ENHANCED - Full Kinematics + Collision Ready
 * 
 * Haas Automation is the largest machine tool builder in the United States,
 * known for affordable, reliable CNC machines. Famous for the VF series VMCs,
 * UMC 5-axis machines, ST turning centers, and EC horizontal machines.
 * 
 * @version 2.0.0
 * @created 2026-01-20
 * @session 0.EXT.2f.9
 */

const PRISM_HAAS_MACHINE_DATABASE_ENHANCED = {
    metadata: {
        manufacturer: "Haas",
        full_name: "Haas Automation, Inc.",
        country: "USA",
        founded: 1983,
        headquarters: "Oxnard, California, USA",
        specialty: "Affordable, reliable VMCs, HMCs, lathes, and rotary products",
        controller: "Haas NGC (Next Generation Control)",
        unique: "Largest US machine tool builder, vertically integrated manufacturing",
        website: "https://www.haascnc.com",
        version: "2.0.0-LEVEL4-ENHANCED",
        last_updated: "2026-01-20",
        machine_count: 16,
        enhancement_level: 4
    },

    machines: [
        // ============================================
        // VF SERIES VERTICAL MACHINING CENTERS
        // ============================================
        {
            id: "HAAS_VF2",
            manufacturer: "Haas",
            model: "VF-2",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc",
            description: "Popular mid-size vertical machining center",
            series: "VF",
            
            work_envelope: {
                x: { min: 0, max: 762, unit: "mm" },
                y: { min: 0, max: 406, unit: "mm" },
                z: { min: 0, max: 508, unit: "mm" },
                table_length: 914,
                table_width: 356,
                table_load_capacity: 1361,
                table_load_unit: "kg",
                spindle_nose_to_table_min: 102,
                spindle_nose_to_table_max: 610
            },
            
            spindle: {
                type: "inline_direct_drive",
                taper: "BT40",
                max_rpm: 8100,
                power_rating: 22.4,
                power_unit: "kW",
                torque_max: 122,
                torque_unit: "Nm",
                torque_at_rpm: 2000,
                bearing_type: "angular_contact",
                cooling: "oil_cooling",
                thrust_bearing_capacity: 15569
            },
            
            spindle_options: [
                { name: "Standard", rpm: 8100, power: 22.4, torque: 122 },
                { name: "High-speed", rpm: 12000, power: 22.4, torque: 76 }
            ],
            
            axis_specs: {
                x: {
                    travel: 762,
                    rapid_rate: 25400,
                    max_feed: 16510,
                    max_feed_unit: "mm/min",
                    motor_type: "brushless_servo",
                    motor_power: 5.6,
                    guideway_type: "hardened_box_way",
                    guideway_width: 55,
                    ballscrew_diameter: 40,
                    ballscrew_pitch: 10,
                    ballscrew_support: "fixed_fixed",
                    encoder_type: "high_resolution",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                y: {
                    travel: 406,
                    rapid_rate: 25400,
                    max_feed: 16510,
                    motor_type: "brushless_servo",
                    motor_power: 5.6,
                    guideway_type: "hardened_box_way",
                    guideway_width: 55,
                    ballscrew_diameter: 40,
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                z: {
                    travel: 508,
                    rapid_rate: 25400,
                    max_feed: 16510,
                    motor_type: "brushless_servo",
                    motor_power: 5.6,
                    guideway_type: "hardened_box_way",
                    guideway_width: 55,
                    ballscrew_diameter: 40,
                    counterbalance: "pneumatic",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                }
            },
            
            atc: {
                type: "side_mount_carousel",
                capacity: 20,
                capacity_options: [20, 24, 30, 40],
                max_tool_diameter: 89,
                max_tool_diameter_adjacent_empty: 127,
                max_tool_length: 254,
                max_tool_weight: 5.4,
                tool_change_time: 4.2,
                chip_to_chip_time: 6.0
            },
            
            controller: {
                brand: "Haas",
                model: "NGC",
                type: "Haas_proprietary",
                axes_count: 3,
                
                haas_features: {
                    visual_programming_system: true,
                    wifi: true,
                    usb: true,
                    ethernet: true,
                    remote_monitoring: true,
                    haas_connect: true
                },
                
                memory_capacity: "1GB",
                look_ahead_blocks: 80,
                high_speed_machining: true,
                rigid_tapping: true
            },
            
            coolant: {
                tank_capacity: 208,
                tank_unit: "liters",
                pump_output: 49,
                pump_output_unit: "l/min",
                pump_pressure: 1.7,
                pump_pressure_unit: "bar",
                through_spindle: false,
                tsc_option: true,
                tsc_pressure_options: [7, 14, 21],
                flood_nozzles: true,
                programmable_coolant: true,
                chip_auger: true
            },
            
            machine_dimensions: {
                length: 3327,
                width: 2134,
                height: 2743,
                weight: 4082,
                weight_unit: "kg",
                floor_space: 7.1,
                floor_space_unit: "m²"
            },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "haas_fixed_column",
                chain: [
                    "base",
                    "column_fixed",
                    "table_X",
                    "saddle_Y",
                    "spindle_head_Z"
                ],
                
                moving_masses: {
                    table_x: { mass: 318, cog: [0, 0, 50] },
                    saddle_y: { mass: 227, cog: [0, 100, 200] },
                    spindle_head_z: { mass: 363, cog: [0, 0, 254] }
                }
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "table" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" }
            },
            
            geometry_reference: {
                base_path: "HAAS/VF2",
                assembly: { file: "ASSEMBLY/VF2_COMPLETE.step" },
                components: {
                    base: { step_file: "COMPONENTS/BASE.step", is_fixed: true },
                    column: { step_file: "COMPONENTS/COLUMN.step", parent: "base", joint_type: "fixed" },
                    table: { step_file: "COMPONENTS/TABLE.step", parent: "base", joint_axis: "X" },
                    saddle: { step_file: "COMPONENTS/SADDLE.step", parent: "column", joint_axis: "Y" },
                    spindle_head: { step_file: "COMPONENTS/SPINDLE_HEAD.step", parent: "saddle", joint_axis: "Z" }
                },
                collision_config: {
                    check_pairs: [
                        ["spindle_head", "table"], ["tool", "workpiece"], ["tool", "fixture"]
                    ],
                    safety_margin: 5.0
                }
            }
        },
        
        {
            id: "HAAS_VF4",
            manufacturer: "Haas",
            model: "VF-4",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_large",
            description: "Large-format vertical machining center",
            series: "VF",
            
            work_envelope: {
                x: { min: 0, max: 1270, unit: "mm" },
                y: { min: 0, max: 508, unit: "mm" },
                z: { min: 0, max: 635, unit: "mm" },
                table_length: 1321,
                table_width: 457,
                table_load_capacity: 1814
            },
            
            spindle: {
                type: "inline_direct_drive",
                taper: "BT40",
                max_rpm: 8100,
                power_rating: 22.4,
                torque_max: 122
            },
            
            axis_specs: {
                x: { travel: 1270, rapid_rate: 25400, guideway_type: "hardened_box_way", positioning_accuracy: 0.005 },
                y: { travel: 508, rapid_rate: 25400, guideway_type: "hardened_box_way", positioning_accuracy: 0.005 },
                z: { travel: 635, rapid_rate: 25400, guideway_type: "hardened_box_way", positioning_accuracy: 0.005 }
            },
            
            atc: { type: "side_mount_carousel", capacity: 20, tool_change_time: 4.5 },
            
            controller: { brand: "Haas", model: "NGC", axes_count: 3 },
            
            machine_dimensions: { length: 3556, width: 2464, height: 2921, weight: 5443, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "haas_fixed_column",
                chain: ["base", "column_fixed", "table_X", "saddle_Y", "spindle_head_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "table" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" }
            }
        },
        
        {
            id: "HAAS_VF6",
            manufacturer: "Haas",
            model: "VF-6/50",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_50_taper",
            description: "Large 50-taper VMC for heavy cutting",
            series: "VF",
            
            work_envelope: {
                x: { min: 0, max: 1626, unit: "mm" },
                y: { min: 0, max: 813, unit: "mm" },
                z: { min: 0, max: 762, unit: "mm" },
                table_length: 1829,
                table_width: 711,
                table_load_capacity: 2268
            },
            
            spindle: {
                type: "gear_driven",
                taper: "BT50",
                max_rpm: 6000,
                power_rating: 22.4,
                torque_max: 500,
                gear_ranges: 2
            },
            
            axis_specs: {
                x: { travel: 1626, rapid_rate: 15240, guideway_type: "hardened_box_way", positioning_accuracy: 0.006 },
                y: { travel: 813, rapid_rate: 15240, guideway_type: "hardened_box_way", positioning_accuracy: 0.006 },
                z: { travel: 762, rapid_rate: 15240, guideway_type: "hardened_box_way", positioning_accuracy: 0.006 }
            },
            
            atc: { type: "side_mount_carousel", capacity: 30, max_tool_weight: 11.3 },
            
            controller: { brand: "Haas", model: "NGC", axes_count: 3 },
            
            machine_dimensions: { length: 4420, width: 3073, height: 3175, weight: 10433, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "haas_fixed_column_50_taper",
                chain: ["base", "column_fixed", "table_X", "saddle_Y", "spindle_head_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "table" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" }
            }
        },

        // ============================================
        // UMC 5-AXIS SERIES
        // ============================================
        {
            id: "HAAS_UMC_750",
            manufacturer: "Haas",
            model: "UMC-750",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            description: "Universal 5-axis machining center with integrated trunnion",
            series: "UMC",
            
            work_envelope: {
                x: { min: 0, max: 762, unit: "mm" },
                y: { min: 0, max: 508, unit: "mm" },
                z: { min: 0, max: 508, unit: "mm" },
                a_axis: { min: -35, max: 120, unit: "deg" },
                c_axis: { min: -360, max: 360, continuous: true, unit: "deg" },
                table_diameter: 630,
                max_workpiece_diameter: 500,
                max_workpiece_height: 400,
                table_load_capacity: 300,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "inline_direct_drive",
                taper: "BT40",
                max_rpm: 8100,
                power_rating: 22.4,
                power_unit: "kW",
                torque_max: 122,
                torque_unit: "Nm"
            },
            
            axis_specs: {
                x: {
                    travel: 762,
                    rapid_rate: 25400,
                    max_feed: 16510,
                    guideway_type: "hardened_box_way",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                y: {
                    travel: 508,
                    rapid_rate: 25400,
                    max_feed: 16510,
                    guideway_type: "hardened_box_way",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                z: {
                    travel: 508,
                    rapid_rate: 25400,
                    max_feed: 16510,
                    guideway_type: "hardened_box_way",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                a: {
                    type: "tilting_trunnion",
                    travel: { min: -35, max: 120 },
                    rapid_rate: 65,
                    rapid_rate_unit: "deg/sec",
                    max_torque: 678,
                    clamping_torque: 2712,
                    drive_type: "servo_worm_gear",
                    positioning_accuracy: 0.0033,
                    repeatability: 0.0017,
                    rotation_center_height: 254
                },
                c: {
                    type: "rotary_table",
                    continuous: true,
                    rapid_rate: 90,
                    rapid_rate_unit: "deg/sec",
                    max_torque: 610,
                    clamping_torque: 2440,
                    drive_type: "servo_direct",
                    positioning_accuracy: 0.0028,
                    repeatability: 0.0014
                }
            },
            
            atc: {
                type: "side_mount_carousel",
                capacity: 40,
                max_tool_diameter: 89,
                max_tool_length: 254,
                max_tool_weight: 5.4,
                tool_change_time: 4.5
            },
            
            controller: {
                brand: "Haas",
                model: "NGC",
                axes_count: 5,
                simultaneous_axes: 5,
                
                tcpc: true,
                tcpc_name: "TCPC",
                rtcp: true,
                rtcp_name: "DWO",
                
                haas_5_axis_features: {
                    dynamic_work_offsets: true,
                    tool_center_point_control: true,
                    tilted_work_planes: true
                }
            },
            
            machine_dimensions: {
                length: 3454,
                width: 2464,
                height: 3175,
                weight: 7711,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "table_table",
                structure: "haas_UMC_AC_trunnion",
                chain: [
                    "base",
                    "column_fixed",
                    "saddle_Y",
                    "spindle_head_Z",
                    "spindle",
                    "trunnion_base_X",
                    "a_tilt",
                    "c_rotary"
                ],
                
                moving_masses: {
                    saddle_y: { mass: 400, cog: [0, 150, 300] },
                    spindle_head_z: { mass: 450, cog: [0, 0, 254] },
                    trunnion_x: { mass: 600, cog: [0, 0, 130] },
                    a_tilt: { mass: 350, cog: [0, 0, 127] },
                    c_rotary: { mass: 200, cog: [0, 0, 50] }
                }
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "trunnion_base" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" },
                a: { type: "rotation", axis: [1, 0, 0], center: [0, 0, 254], component: "a_tilt" },
                c: { type: "rotation", axis: [0, 0, 1], center: [0, 0, 0], component: "c_rotary" }
            },
            
            geometry_reference: {
                base_path: "HAAS/UMC_750",
                assembly: { file: "ASSEMBLY/UMC_750_COMPLETE.step" },
                components: {
                    base: { step_file: "COMPONENTS/BASE.step", is_fixed: true },
                    column: { step_file: "COMPONENTS/COLUMN.step", parent: "base" },
                    saddle: { step_file: "COMPONENTS/SADDLE.step", parent: "column", joint_axis: "Y" },
                    spindle_head: { step_file: "COMPONENTS/SPINDLE_HEAD.step", parent: "saddle", joint_axis: "Z" },
                    trunnion_base: { step_file: "COMPONENTS/TRUNNION_BASE.step", parent: "base", joint_axis: "X" },
                    a_tilt: { step_file: "COMPONENTS/A_TILT.step", parent: "trunnion_base", joint_axis: "A" },
                    c_rotary: { step_file: "COMPONENTS/C_ROTARY.step", parent: "a_tilt", joint_axis: "C" }
                },
                collision_config: {
                    check_pairs: [
                        ["spindle", "c_rotary"], ["spindle", "a_tilt"],
                        ["spindle_head", "c_rotary"], ["tool", "workpiece"]
                    ],
                    safety_margin: 5.0
                }
            }
        },
        
        {
            id: "HAAS_UMC_1000",
            manufacturer: "Haas",
            model: "UMC-1000",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion_large",
            description: "Large 5-axis universal machining center",
            series: "UMC",
            
            work_envelope: {
                x: { min: 0, max: 1016, unit: "mm" },
                y: { min: 0, max: 635, unit: "mm" },
                z: { min: 0, max: 635, unit: "mm" },
                a_axis: { min: -35, max: 120, unit: "deg" },
                c_axis: { min: -360, max: 360, continuous: true },
                table_diameter: 800,
                table_load_capacity: 450
            },
            
            spindle: {
                type: "inline_direct_drive",
                taper: "BT40",
                max_rpm: 8100,
                power_rating: 22.4,
                torque_max: 122
            },
            
            axis_specs: {
                x: { travel: 1016, rapid_rate: 25400, guideway_type: "hardened_box_way", positioning_accuracy: 0.005 },
                y: { travel: 635, rapid_rate: 25400, guideway_type: "hardened_box_way", positioning_accuracy: 0.005 },
                z: { travel: 635, rapid_rate: 25400, guideway_type: "hardened_box_way", positioning_accuracy: 0.005 },
                a: { travel: { min: -35, max: 120 }, positioning_accuracy: 0.0033 },
                c: { continuous: true, positioning_accuracy: 0.0028 }
            },
            
            atc: { type: "side_mount_carousel", capacity: 40, tool_change_time: 4.5 },
            
            controller: { brand: "Haas", model: "NGC", axes_count: 5, tcpc: true },
            
            machine_dimensions: { length: 4064, width: 3175, height: 3175, weight: 11340, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "table_table",
                structure: "haas_UMC_AC_trunnion_large",
                chain: ["base", "column_fixed", "saddle_Y", "spindle_head_Z", "spindle", "trunnion_base_X", "a_tilt", "c_rotary"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "trunnion_base" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" },
                a: { type: "rotation", axis: [1, 0, 0], center: [0, 0, 300], component: "a_tilt" },
                c: { type: "rotation", axis: [0, 0, 1], component: "c_rotary" }
            }
        },

        // ============================================
        // EC HORIZONTAL MACHINING CENTERS
        // ============================================
        {
            id: "HAAS_EC_400",
            manufacturer: "Haas",
            model: "EC-400",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc",
            description: "Compact horizontal machining center with pallet changer",
            series: "EC",
            
            work_envelope: {
                x: { min: 0, max: 508, unit: "mm" },
                y: { min: 0, max: 508, unit: "mm" },
                z: { min: 0, max: 508, unit: "mm" },
                b_axis: { min: 0, max: 360, indexing: 0.001 },
                pallet_size: 400,
                max_workpiece_diameter: 508,
                max_workpiece_height: 635,
                table_load_capacity: 454
            },
            
            spindle: {
                type: "inline_direct_drive",
                taper: "BT40",
                max_rpm: 8100,
                power_rating: 22.4,
                torque_max: 122,
                orientation: "horizontal"
            },
            
            axis_specs: {
                x: { travel: 508, rapid_rate: 25400, guideway_type: "hardened_box_way", positioning_accuracy: 0.005 },
                y: { travel: 508, rapid_rate: 25400, guideway_type: "hardened_box_way", positioning_accuracy: 0.005 },
                z: { travel: 508, rapid_rate: 25400, guideway_type: "hardened_box_way", positioning_accuracy: 0.005 },
                b: { indexing: 0.001, full_contouring: true, clamping_torque: 1356, drive_type: "servo" }
            },
            
            pallet_changer: {
                type: "dual_pallet",
                pallet_count: 2,
                pallet_size: 400,
                pallet_change_time: 8,
                max_pallet_load: 454
            },
            
            atc: {
                type: "side_mount",
                capacity: 24,
                capacity_options: [24, 40],
                tool_change_time: 4.2
            },
            
            controller: { brand: "Haas", model: "NGC", axes_count: 4 },
            
            coolant: {
                tank_capacity: 208,
                through_spindle: false,
                tsc_option: true
            },
            
            machine_dimensions: { length: 2743, width: 2413, height: 2743, weight: 5443, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "T_configuration",
                structure: "haas_EC_horizontal",
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
            id: "HAAS_EC_500",
            manufacturer: "Haas",
            model: "EC-500",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc_production",
            description: "Production horizontal with larger work envelope",
            series: "EC",
            
            work_envelope: {
                x: { min: 0, max: 635, unit: "mm" },
                y: { min: 0, max: 635, unit: "mm" },
                z: { min: 0, max: 635, unit: "mm" },
                b_axis: { min: 0, max: 360, indexing: 0.001 },
                pallet_size: 500,
                table_load_capacity: 680
            },
            
            spindle: {
                type: "inline_direct_drive",
                taper: "BT40",
                max_rpm: 8100,
                power_rating: 22.4,
                torque_max: 122
            },
            
            axis_specs: {
                x: { travel: 635, rapid_rate: 25400, positioning_accuracy: 0.005 },
                y: { travel: 635, rapid_rate: 25400, positioning_accuracy: 0.005 },
                z: { travel: 635, rapid_rate: 25400, positioning_accuracy: 0.005 },
                b: { indexing: 0.001, full_contouring: true }
            },
            
            pallet_changer: { type: "dual_pallet", pallet_count: 2, pallet_change_time: 8 },
            
            controller: { brand: "Haas", model: "NGC", axes_count: 4 },
            
            machine_dimensions: { length: 3658, width: 2921, height: 2921, weight: 8618, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "T_configuration",
                structure: "haas_EC_horizontal",
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
        // ST TURNING CENTERS
        // ============================================
        {
            id: "HAAS_ST_20",
            manufacturer: "Haas",
            model: "ST-20",
            type: "turning_center",
            subtype: "2_axis_lathe",
            description: "Popular mid-size turning center",
            series: "ST",
            
            work_envelope: {
                swing_over_bed: 533,
                swing_over_cross_slide: 286,
                max_turning_diameter: 254,
                max_turning_length: 533,
                bar_capacity: 51,
                unit: "mm"
            },
            
            spindle: {
                type: "belt_driven",
                chuck_size: 8,
                chuck_size_unit: "inch",
                bore_diameter: 76,
                max_rpm: 4000,
                power_rating: 22.4,
                power_unit: "kW",
                torque_max: 339,
                torque_unit: "Nm",
                spindle_nose: "A2-6"
            },
            
            axis_specs: {
                x: {
                    travel: 203,
                    rapid_rate: 30480,
                    max_feed: 30480,
                    guideway_type: "hardened_box_way",
                    ballscrew_diameter: 40,
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                z: {
                    travel: 533,
                    rapid_rate: 30480,
                    max_feed: 30480,
                    guideway_type: "hardened_box_way",
                    ballscrew_diameter: 40,
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                }
            },
            
            turret: {
                type: "BOT",
                stations: 12,
                tool_size: "25mm_square",
                boring_bar_capacity: 32,
                live_tooling: false,
                live_tooling_option: true,
                indexing_time: 0.5
            },
            
            tailstock: {
                quill_diameter: 64,
                quill_travel: 152,
                taper: "MT4",
                thrust_force: 11121,
                thrust_unit: "N",
                programmable: true
            },
            
            controller: {
                brand: "Haas",
                model: "NGC",
                axes_count: 2,
                rigid_tapping: true
            },
            
            machine_dimensions: { length: 2591, width: 1702, height: 1956, weight: 2948, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "lathe_standard",
                structure: "haas_ST_slant_bed",
                chain: ["bed", "headstock_spindle", "cross_slide_X", "turret_Z"],
                bed_angle: 45,
                bed_angle_unit: "deg"
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "cross_slide" },
                z: { type: "translation", vector: [0, 0, 1], component: "turret" }
            }
        },
        
        {
            id: "HAAS_ST_20Y",
            manufacturer: "Haas",
            model: "ST-20Y",
            type: "turning_center",
            subtype: "y_axis_lathe",
            description: "Turning center with Y-axis and live tooling",
            series: "ST",
            
            work_envelope: {
                swing_over_bed: 533,
                max_turning_diameter: 254,
                max_turning_length: 533,
                bar_capacity: 51,
                unit: "mm"
            },
            
            spindle: {
                type: "belt_driven",
                chuck_size: 8,
                bore_diameter: 76,
                max_rpm: 4000,
                power_rating: 22.4,
                torque_max: 339,
                c_axis: true,
                c_axis_indexing: 0.01
            },
            
            axis_specs: {
                x: { travel: 203, rapid_rate: 30480, positioning_accuracy: 0.005 },
                y: { travel: { min: -51, max: 51 }, total_travel: 102, rapid_rate: 15240, positioning_accuracy: 0.005 },
                z: { travel: 533, rapid_rate: 30480, positioning_accuracy: 0.005 },
                c: { indexing: 0.01, clamping_torque: 678 }
            },
            
            turret: {
                type: "hybrid",
                stations: 12,
                live_tooling: true,
                live_stations: 12,
                live_tool_rpm: 4000,
                live_tool_power: 5.6,
                y_axis_milling: true,
                indexing_time: 0.5
            },
            
            controller: { brand: "Haas", model: "NGC", axes_count: 4, c_axis: true, y_axis: true },
            
            machine_dimensions: { length: 2870, width: 1702, height: 2070, weight: 3629, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "lathe_Y_axis",
                structure: "haas_ST_with_Y",
                chain: ["bed", "headstock_spindle_C", "cross_slide_X", "y_slide_Y", "turret_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "cross_slide" },
                y: { type: "translation", vector: [0, 1, 0], component: "y_slide" },
                z: { type: "translation", vector: [0, 0, 1], component: "turret" },
                c: { type: "rotation", axis: [0, 0, 1], component: "spindle" }
            }
        },
        
        {
            id: "HAAS_ST_35",
            manufacturer: "Haas",
            model: "ST-35",
            type: "turning_center",
            subtype: "large_lathe",
            description: "Large-bore turning center",
            series: "ST",
            
            work_envelope: {
                swing_over_bed: 806,
                max_turning_diameter: 457,
                max_turning_length: 660,
                bar_capacity: 102,
                unit: "mm"
            },
            
            spindle: {
                type: "belt_driven",
                chuck_size: 12,
                bore_diameter: 102,
                max_rpm: 2400,
                power_rating: 22.4,
                torque_max: 678
            },
            
            axis_specs: {
                x: { travel: 356, rapid_rate: 30480, positioning_accuracy: 0.006 },
                z: { travel: 660, rapid_rate: 30480, positioning_accuracy: 0.006 }
            },
            
            turret: { type: "BOT", stations: 12, live_tooling_option: true },
            
            controller: { brand: "Haas", model: "NGC", axes_count: 2 },
            
            machine_dimensions: { length: 3048, width: 2007, height: 2108, weight: 4990, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "lathe_standard",
                structure: "haas_ST_large_bore",
                chain: ["bed", "headstock_spindle", "cross_slide_X", "turret_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "cross_slide" },
                z: { type: "translation", vector: [0, 0, 1], component: "turret" }
            }
        },

        // ============================================
        // DT/DS DRILL TAP CENTERS
        // ============================================
        {
            id: "HAAS_DT_1",
            manufacturer: "Haas",
            model: "DT-1",
            type: "vertical_machining_center",
            subtype: "drill_tap_center",
            description: "High-speed drill/tap machine",
            series: "DT",
            
            work_envelope: {
                x: { min: 0, max: 508, unit: "mm" },
                y: { min: 0, max: 406, unit: "mm" },
                z: { min: 0, max: 394, unit: "mm" },
                table_length: 660,
                table_width: 381,
                table_load_capacity: 227
            },
            
            spindle: {
                type: "inline_direct_drive",
                taper: "BT30",
                max_rpm: 15000,
                power_rating: 11.2,
                torque_max: 30,
                high_speed_tapping: true
            },
            
            axis_specs: {
                x: { travel: 508, rapid_rate: 61000, guideway_type: "linear_guides", positioning_accuracy: 0.005 },
                y: { travel: 406, rapid_rate: 61000, guideway_type: "linear_guides", positioning_accuracy: 0.005 },
                z: { travel: 394, rapid_rate: 61000, guideway_type: "linear_guides", positioning_accuracy: 0.005 }
            },
            
            atc: { type: "carousel", capacity: 20, tool_change_time: 1.6, chip_to_chip: 2.2 },
            
            controller: { brand: "Haas", model: "NGC", axes_count: 3, high_speed_rigid_tap: true },
            
            machine_dimensions: { length: 2159, width: 1651, height: 2464, weight: 2268, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "haas_DT_high_speed",
                chain: ["base", "column", "table_X", "saddle_Y", "spindle_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "table" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" }
            }
        },

        // ============================================
        // GANTRY ROUTER - GR SERIES
        // ============================================
        {
            id: "HAAS_GR_510",
            manufacturer: "Haas",
            model: "GR-510",
            type: "gantry_router",
            subtype: "3_axis_router",
            description: "Large gantry router for composites and aluminum",
            series: "GR",
            
            work_envelope: {
                x: { min: 0, max: 3073, unit: "mm" },
                y: { min: 0, max: 1524, unit: "mm" },
                z: { min: 0, max: 279, unit: "mm" },
                table_length: 3073,
                table_width: 1524,
                vacuum_table: true
            },
            
            spindle: {
                type: "cartridge",
                taper: "ISO30",
                max_rpm: 30000,
                power_rating: 22.4,
                torque_max: 17.6
            },
            
            axis_specs: {
                x: { travel: 3073, rapid_rate: 45720, guideway_type: "linear_guides", positioning_accuracy: 0.008 },
                y: { travel: 1524, rapid_rate: 45720, guideway_type: "linear_guides", positioning_accuracy: 0.008 },
                z: { travel: 279, rapid_rate: 30480, guideway_type: "linear_guides", positioning_accuracy: 0.008 }
            },
            
            atc: { type: "disc", capacity: 10, tool_change_time: 5 },
            
            controller: { brand: "Haas", model: "NGC", axes_count: 3 },
            
            machine_dimensions: { length: 4572, width: 2743, height: 2438, weight: 3629, weight_unit: "kg" },
            
            kinematic_chain: {
                type: "gantry",
                structure: "haas_GR_gantry",
                chain: ["base", "table_fixed", "gantry_X", "saddle_Y", "spindle_Z"]
            },
            
            transformations: {
                x: { type: "translation", vector: [1, 0, 0], component: "gantry" },
                y: { type: "translation", vector: [0, 1, 0], component: "saddle" },
                z: { type: "translation", vector: [0, 0, 1], component: "spindle_head" }
            }
        }
    ],

    // Helper functions
    getMachineById: function(id) { return this.machines.find(m => m.id === id); },
    getMachinesByType: function(type) { return this.machines.filter(m => m.type === type); },
    getMachinesBySeries: function(series) { return this.machines.filter(m => m.series === series); },
    get5AxisMachines: function() { return this.machines.filter(m => m.subtype && m.subtype.includes("5_axis")); },
    getVFSeries: function() { return this.machines.filter(m => m.series === "VF"); },
    getUMCSeries: function() { return this.machines.filter(m => m.series === "UMC"); },
    getSTSeries: function() { return this.machines.filter(m => m.series === "ST"); },
    getLathes: function() { return this.machines.filter(m => m.type === "turning_center"); },
    getHMCs: function() { return this.machines.filter(m => m.type === "horizontal_machining_center"); },
    
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
    module.exports = PRISM_HAAS_MACHINE_DATABASE_ENHANCED;
}
if (typeof window !== 'undefined') {
    window.PRISM_HAAS_MACHINE_DATABASE_ENHANCED = PRISM_HAAS_MACHINE_DATABASE_ENHANCED;
}
