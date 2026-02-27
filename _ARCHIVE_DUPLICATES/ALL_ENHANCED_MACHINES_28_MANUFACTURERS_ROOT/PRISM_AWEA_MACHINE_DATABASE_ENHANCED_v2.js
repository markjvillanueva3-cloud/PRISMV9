/**
 * PRISM_AWEA_MACHINE_DATABASE_ENHANCED_v2.js
 * ENHANCED Machine Database - AWEA Mechantronic Co., Ltd.
 * 
 * AWEA is a leading Taiwanese manufacturer specializing in double-column
 * machining centers and 5-axis machines. Known for excellent rigidity,
 * precision, and value in large-format machining.
 * 
 * ENHANCED FORMAT: Full kinematic chains, work envelopes, collision geometry
 * 
 * @version 2.0.0
 * @created 2026-01-20
 * @session 0.EXT.2f.7
 */

const PRISM_AWEA_MACHINE_DATABASE_ENHANCED = {
    metadata: {
        manufacturer: "AWEA",
        full_name: "AWEA Mechantronic Co., Ltd.",
        country: "Taiwan",
        founded: 1986,
        headquarters: "Taichung, Taiwan",
        specialty: "Double-column machining centers, 5-axis machines, large-format VMCs",
        website: "https://www.awea.com",
        version: "2.0.0-ENHANCED",
        last_updated: "2026-01-20",
        machine_count: 10
    },

    machines: [
        // ============================================
        // DOUBLE COLUMN - LP SERIES
        // ============================================
        {
            id: "AWEA_LP_3021",
            manufacturer: "AWEA",
            model: "LP-3021",
            type: "double_column_machining_center",
            subtype: "bridge_type",
            description: "Large double-column machining center for mold/die work",
            
            work_envelope: {
                x: { min: 0, max: 3000, unit: "mm" },
                y: { min: 0, max: 2100, unit: "mm" },
                z: { min: 0, max: 1000, unit: "mm" },
                table_length: 3400,
                table_width: 2100,
                table_load_capacity: 15000,
                table_load_unit: "kg",
                spindle_nose_to_table: { min: 200, max: 1200 }
            },
            
            spindle: {
                type: "gear_driven",
                taper: "BT50",
                max_rpm: 6000,
                power_rating: 37,
                power_unit: "kW",
                torque_max: 850,
                torque_unit: "Nm",
                gear_ranges: 2,
                bearing_type: "angular_contact_precision"
            },
            
            axis_specs: {
                x: {
                    travel: 3000,
                    rapid_rate: 20000,
                    max_feed: 10000,
                    acceleration: 0.3,
                    guideway_type: "box_way",
                    guideway_width: 120,
                    ballscrew_diameter: 63,
                    positioning_accuracy: 0.015,
                    repeatability: 0.008
                },
                y: {
                    travel: 2100,
                    rapid_rate: 20000,
                    max_feed: 10000,
                    acceleration: 0.3,
                    guideway_type: "box_way",
                    guideway_width: 100,
                    ballscrew_diameter: 63,
                    positioning_accuracy: 0.015,
                    repeatability: 0.008
                },
                z: {
                    travel: 1000,
                    rapid_rate: 15000,
                    max_feed: 8000,
                    acceleration: 0.25,
                    guideway_type: "box_way",
                    guideway_width: 100,
                    ballscrew_diameter: 63,
                    positioning_accuracy: 0.015,
                    repeatability: 0.008
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 40,
                max_tool_diameter: 150,
                max_tool_diameter_adjacent_empty: 250,
                max_tool_length: 450,
                max_tool_weight: 30,
                tool_change_time: 8
            },
            
            controller: {
                brand: "FANUC",
                model: "31i-B5",
                axes_count: 3,
                look_ahead_blocks: 1000
            },
            
            coolant: {
                tank_capacity: 800,
                through_spindle: true,
                tsc_pressure: 20,
                flood_coolant: true
            },
            
            machine_dimensions: {
                length: 7500,
                width: 5200,
                height: 4500,
                weight: 45000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "bridge_type",
                structure: "fixed_table_moving_bridge",
                chain: ["base", "table_fixed", "column_left", "column_right", "crossrail_X", "saddle_Y", "ram_Z"],
                moving_mass_x: 3500,
                moving_mass_y: 2000,
                moving_mass_z: 1500
            }
        },
        
        {
            id: "AWEA_LP_4025",
            manufacturer: "AWEA",
            model: "LP-4025",
            type: "double_column_machining_center",
            subtype: "bridge_type",
            description: "Extra-large double-column for aerospace/die work",
            
            work_envelope: {
                x: { min: 0, max: 4000, unit: "mm" },
                y: { min: 0, max: 2500, unit: "mm" },
                z: { min: 0, max: 1200, unit: "mm" },
                table_length: 4500,
                table_width: 2500,
                table_load_capacity: 25000,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "gear_driven",
                taper: "BT50",
                max_rpm: 6000,
                power_rating: 45,
                power_unit: "kW",
                torque_max: 1100,
                torque_unit: "Nm",
                gear_ranges: 2
            },
            
            axis_specs: {
                x: {
                    travel: 4000,
                    rapid_rate: 18000,
                    max_feed: 8000,
                    guideway_type: "box_way",
                    positioning_accuracy: 0.020,
                    repeatability: 0.010
                },
                y: {
                    travel: 2500,
                    rapid_rate: 18000,
                    max_feed: 8000,
                    guideway_type: "box_way",
                    positioning_accuracy: 0.020,
                    repeatability: 0.010
                },
                z: {
                    travel: 1200,
                    rapid_rate: 12000,
                    max_feed: 6000,
                    guideway_type: "box_way",
                    positioning_accuracy: 0.020,
                    repeatability: 0.010
                }
            },
            
            atc: {
                type: "chain_type",
                capacity: 60,
                max_tool_weight: 35,
                tool_change_time: 12
            },
            
            controller: {
                brand: "HEIDENHAIN",
                model: "TNC 640",
                axes_count: 3
            },
            
            machine_dimensions: {
                length: 9200,
                width: 6000,
                height: 5200,
                weight: 72000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "bridge_type",
                structure: "fixed_table_moving_bridge",
                chain: ["base", "table_fixed", "bridge_X", "saddle_Y", "ram_Z"]
            }
        },

        // ============================================
        // 5-AXIS DOUBLE COLUMN - AF SERIES
        // ============================================
        {
            id: "AWEA_AF_1250",
            manufacturer: "AWEA",
            model: "AF-1250",
            type: "double_column_machining_center",
            subtype: "5_axis_bridge",
            description: "5-axis double-column with A/C head for aerospace",
            
            work_envelope: {
                x: { min: 0, max: 2000, unit: "mm" },
                y: { min: 0, max: 1250, unit: "mm" },
                z: { min: 0, max: 800, unit: "mm" },
                table_length: 2200,
                table_width: 1250,
                table_load_capacity: 4000,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A63",
                max_rpm: 18000,
                power_rating: 35,
                power_unit: "kW",
                torque_max: 120,
                torque_unit: "Nm",
                bearing_type: "ceramic_hybrid"
            },
            
            axis_specs: {
                x: {
                    travel: 2000,
                    rapid_rate: 30000,
                    max_feed: 15000,
                    acceleration: 0.5,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.008,
                    repeatability: 0.005
                },
                y: {
                    travel: 1250,
                    rapid_rate: 30000,
                    max_feed: 15000,
                    acceleration: 0.5,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.008,
                    repeatability: 0.005
                },
                z: {
                    travel: 800,
                    rapid_rate: 24000,
                    max_feed: 12000,
                    acceleration: 0.4,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.008,
                    repeatability: 0.005
                },
                a: {
                    type: "rotary_head_fork",
                    travel: { min: -110, max: 110 },
                    rapid_rate: 30,
                    rapid_rate_unit: "rpm",
                    max_torque: 400,
                    drive_type: "direct_drive",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                c: {
                    type: "rotary_head_spindle",
                    travel: { min: -360, max: 360 },
                    continuous: true,
                    rapid_rate: 50,
                    rapid_rate_unit: "rpm",
                    max_torque: 200,
                    drive_type: "direct_drive",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 40,
                max_tool_diameter: 100,
                max_tool_length: 350,
                max_tool_weight: 12,
                tool_change_time: 4
            },
            
            controller: {
                brand: "HEIDENHAIN",
                model: "TNC 640",
                axes_count: 5,
                simultaneous_axes: 5,
                tcpc: true,
                rtcp: true,
                dynamic_precision: true
            },
            
            machine_dimensions: {
                length: 5500,
                width: 4000,
                height: 4200,
                weight: 28000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "head_head",
                structure: "fork_type_AC_head_on_bridge",
                chain: ["base", "table_fixed", "bridge_X", "saddle_Y", "ram_Z", "fork_A", "spindle_C"],
                tcp_reference: "tool_tip",
                rtcp_capable: true
            }
        },

        // ============================================
        // VERTICAL MACHINING CENTER - BM SERIES
        // ============================================
        {
            id: "AWEA_BM_1200",
            manufacturer: "AWEA",
            model: "BM-1200",
            type: "vertical_machining_center",
            subtype: "box_way_vmc",
            description: "Heavy-duty box-way VMC for heavy cutting",
            
            work_envelope: {
                x: { min: 0, max: 1200, unit: "mm" },
                y: { min: 0, max: 610, unit: "mm" },
                z: { min: 0, max: 610, unit: "mm" },
                table_length: 1400,
                table_width: 600,
                table_load_capacity: 1200,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "belt_driven",
                taper: "BT50",
                max_rpm: 8000,
                power_rating: 22,
                power_unit: "kW",
                torque_max: 320,
                torque_unit: "Nm"
            },
            
            axis_specs: {
                x: {
                    travel: 1200,
                    rapid_rate: 24000,
                    max_feed: 10000,
                    guideway_type: "box_way",
                    guideway_width: 60,
                    positioning_accuracy: 0.010,
                    repeatability: 0.005
                },
                y: {
                    travel: 610,
                    rapid_rate: 24000,
                    max_feed: 10000,
                    guideway_type: "box_way",
                    guideway_width: 60,
                    positioning_accuracy: 0.010,
                    repeatability: 0.005
                },
                z: {
                    travel: 610,
                    rapid_rate: 20000,
                    max_feed: 8000,
                    guideway_type: "box_way",
                    guideway_width: 60,
                    positioning_accuracy: 0.010,
                    repeatability: 0.005
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 24,
                max_tool_diameter: 90,
                max_tool_length: 300,
                max_tool_weight: 15,
                tool_change_time: 3.5
            },
            
            controller: {
                brand: "FANUC",
                model: "0i-MF Plus",
                axes_count: 3
            },
            
            machine_dimensions: {
                length: 3200,
                width: 2600,
                height: 3000,
                weight: 9500,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "fixed_column",
                chain: ["base", "column", "table_X", "saddle_Y", "spindle_Z"]
            }
        },

        // ============================================
        // HIGH-SPEED VMC - SP SERIES
        // ============================================
        {
            id: "AWEA_SP_2016",
            manufacturer: "AWEA",
            model: "SP-2016",
            type: "vertical_machining_center",
            subtype: "high_speed_vmc",
            description: "High-speed linear motor VMC",
            
            work_envelope: {
                x: { min: 0, max: 2000, unit: "mm" },
                y: { min: 0, max: 1650, unit: "mm" },
                z: { min: 0, max: 700, unit: "mm" },
                table_length: 2200,
                table_width: 1650,
                table_load_capacity: 3000,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A63",
                max_rpm: 24000,
                power_rating: 35,
                power_unit: "kW",
                torque_max: 80,
                torque_unit: "Nm",
                bearing_type: "ceramic_hybrid",
                oil_air_lubrication: true
            },
            
            axis_specs: {
                x: {
                    travel: 2000,
                    rapid_rate: 60000,
                    max_feed: 30000,
                    acceleration: 1.0,
                    motor_type: "linear_motor",
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.004,
                    repeatability: 0.002
                },
                y: {
                    travel: 1650,
                    rapid_rate: 60000,
                    max_feed: 30000,
                    acceleration: 1.0,
                    motor_type: "linear_motor",
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.004,
                    repeatability: 0.002
                },
                z: {
                    travel: 700,
                    rapid_rate: 40000,
                    max_feed: 20000,
                    acceleration: 0.8,
                    motor_type: "linear_motor",
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.004,
                    repeatability: 0.002
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 40,
                max_tool_diameter: 90,
                max_tool_length: 300,
                max_tool_weight: 10,
                tool_change_time: 2.0
            },
            
            controller: {
                brand: "HEIDENHAIN",
                model: "TNC 640",
                axes_count: 3,
                hsm_mode: true,
                advanced_surface_control: true
            },
            
            thermal_compensation: {
                spindle_growth: true,
                linear_scale_compensation: true,
                environment_temperature: true
            },
            
            machine_dimensions: {
                length: 5000,
                width: 4200,
                height: 3500,
                weight: 22000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "gantry_fixed_table",
                structure: "fixed_table_gantry",
                chain: ["base", "table_fixed", "gantry_X", "saddle_Y", "spindle_Z"]
            }
        },

        // ============================================
        // 5-AXIS TRUNNION - VP SERIES
        // ============================================
        {
            id: "AWEA_VP_1000_5AX",
            manufacturer: "AWEA",
            model: "VP-1000-5AX",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            description: "5-axis VMC with trunnion table",
            
            work_envelope: {
                x: { min: 0, max: 1000, unit: "mm" },
                y: { min: 0, max: 610, unit: "mm" },
                z: { min: 0, max: 610, unit: "mm" },
                trunnion_diameter: 630,
                max_workpiece_diameter: 800,
                max_workpiece_height: 500,
                table_load_capacity: 400,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "BBT40",
                max_rpm: 15000,
                power_rating: 22,
                power_unit: "kW",
                torque_max: 140,
                torque_unit: "Nm"
            },
            
            axis_specs: {
                x: {
                    travel: 1000,
                    rapid_rate: 36000,
                    max_feed: 12000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.006,
                    repeatability: 0.003
                },
                y: {
                    travel: 610,
                    rapid_rate: 36000,
                    max_feed: 12000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.006,
                    repeatability: 0.003
                },
                z: {
                    travel: 610,
                    rapid_rate: 30000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.006,
                    repeatability: 0.003
                },
                a: {
                    type: "rotary_trunnion",
                    travel: { min: -120, max: 30 },
                    rapid_rate: 25,
                    rapid_rate_unit: "rpm",
                    max_torque: 800,
                    clamping_torque: 2000,
                    drive_type: "roller_gear_cam",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                c: {
                    type: "rotary_table",
                    travel: { min: -360, max: 360 },
                    continuous: true,
                    rapid_rate: 33,
                    rapid_rate_unit: "rpm",
                    max_torque: 600,
                    clamping_torque: 1500,
                    drive_type: "roller_gear_cam",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 32,
                tool_change_time: 2.5
            },
            
            controller: {
                brand: "FANUC",
                model: "31i-B5",
                axes_count: 5,
                simultaneous_axes: 5,
                tcpc: true,
                rtcp: true
            },
            
            machine_dimensions: {
                length: 3400,
                width: 2800,
                height: 3200,
                weight: 12500,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "table_table",
                structure: "trunnion_on_moving_table",
                chain: ["base", "column", "table_X", "saddle_Y", "spindle_Z", "trunnion_A", "rotary_C"],
                tcp_reference: "workpiece_center",
                rtcp_capable: true
            }
        },

        // ============================================
        // HORIZONTAL MACHINING CENTER - HMC SERIES
        // ============================================
        {
            id: "AWEA_HMC_500",
            manufacturer: "AWEA",
            model: "HMC-500",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc",
            description: "Production horizontal machining center",
            
            work_envelope: {
                x: { min: 0, max: 800, unit: "mm" },
                y: { min: 0, max: 700, unit: "mm" },
                z: { min: 0, max: 700, unit: "mm" },
                pallet_size: 500,
                pallet_size_unit: "mm",
                max_workpiece_diameter: 800,
                max_workpiece_height: 900,
                table_load_capacity: 500,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "BT50",
                max_rpm: 10000,
                power_rating: 30,
                power_unit: "kW",
                torque_max: 400,
                torque_unit: "Nm"
            },
            
            axis_specs: {
                x: {
                    travel: 800,
                    rapid_rate: 40000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.008,
                    repeatability: 0.004
                },
                y: {
                    travel: 700,
                    rapid_rate: 40000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.008,
                    repeatability: 0.004
                },
                z: {
                    travel: 700,
                    rapid_rate: 36000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.008,
                    repeatability: 0.004
                },
                b: {
                    type: "rotary_indexing",
                    indexing: 0.001,
                    full_contouring: true,
                    clamping_torque: 2000
                }
            },
            
            pallet_changer: {
                type: "dual_pallet",
                pallet_count: 2,
                pallet_change_time: 10,
                max_pallet_load: 500
            },
            
            atc: {
                type: "chain_type",
                capacity: 60,
                max_tool_weight: 25,
                tool_change_time: 4
            },
            
            controller: {
                brand: "FANUC",
                model: "31i-B5",
                axes_count: 4
            },
            
            machine_dimensions: {
                length: 4800,
                width: 3600,
                height: 3400,
                weight: 18000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "table_rotary",
                structure: "T_configuration",
                chain: ["base", "column_Z", "saddle_Y", "spindle_X", "pallet_B"]
            }
        },

        // ============================================
        // GANTRY TYPE - LG SERIES
        // ============================================
        {
            id: "AWEA_LG_5030",
            manufacturer: "AWEA",
            model: "LG-5030",
            type: "gantry_machining_center",
            subtype: "5_axis_gantry",
            description: "Large gantry 5-axis for aerospace structures",
            
            work_envelope: {
                x: { min: 0, max: 5000, unit: "mm" },
                y: { min: 0, max: 3000, unit: "mm" },
                z: { min: 0, max: 1200, unit: "mm" },
                table_length: 5500,
                table_width: 3000,
                table_load_capacity: 30000,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A100",
                max_rpm: 15000,
                power_rating: 60,
                power_unit: "kW",
                torque_max: 300,
                torque_unit: "Nm"
            },
            
            axis_specs: {
                x: {
                    travel: 5000,
                    rapid_rate: 30000,
                    max_feed: 12000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.015,
                    repeatability: 0.008
                },
                y: {
                    travel: 3000,
                    rapid_rate: 30000,
                    max_feed: 12000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.015,
                    repeatability: 0.008
                },
                z: {
                    travel: 1200,
                    rapid_rate: 24000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.015,
                    repeatability: 0.008
                },
                a: {
                    type: "rotary_fork_head",
                    travel: { min: -110, max: 110 },
                    drive_type: "direct_drive",
                    positioning_accuracy: 0.006
                },
                c: {
                    type: "rotary_spindle_head",
                    continuous: true,
                    drive_type: "direct_drive",
                    positioning_accuracy: 0.006
                }
            },
            
            atc: {
                type: "chain_type",
                capacity: 80,
                max_tool_weight: 30,
                tool_change_time: 10
            },
            
            controller: {
                brand: "SIEMENS",
                model: "840D sl",
                axes_count: 5,
                simultaneous_axes: 5,
                tcpc: true,
                traori: true
            },
            
            machine_dimensions: {
                length: 11000,
                width: 6500,
                height: 5500,
                weight: 85000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "head_head",
                structure: "gantry_AC_head",
                chain: ["base", "table_fixed", "gantry_X", "crossrail_Y", "ram_Z", "fork_A", "spindle_C"],
                tcp_reference: "tool_tip",
                rtcp_capable: true
            }
        },

        // ============================================
        // TURNING CENTER - TL SERIES
        // ============================================
        {
            id: "AWEA_TL_25",
            manufacturer: "AWEA",
            model: "TL-25",
            type: "turning_center",
            subtype: "slant_bed_lathe",
            description: "Precision slant bed turning center",
            
            work_envelope: {
                swing_over_bed: 620,
                swing_over_cross_slide: 380,
                max_turning_diameter: 350,
                max_turning_length: 600,
                bar_capacity: 65,
                unit: "mm"
            },
            
            spindle: {
                type: "built_in_motor",
                chuck_size: 10,
                chuck_size_unit: "inch",
                bore_diameter: 76,
                max_rpm: 4500,
                power_rating: 18.5,
                power_unit: "kW",
                torque_max: 390,
                torque_unit: "Nm",
                spindle_nose: "A2-8"
            },
            
            axis_specs: {
                x: {
                    travel: 250,
                    rapid_rate: 24000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                z: {
                    travel: 600,
                    rapid_rate: 24000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.008,
                    repeatability: 0.004
                }
            },
            
            turret: {
                type: "servo_driven",
                stations: 12,
                tool_size: "25mm_square",
                boring_bar_capacity: 50,
                indexing_time: 0.2,
                live_tooling_option: true
            },
            
            controller: {
                brand: "FANUC",
                model: "0i-TF Plus",
                axes_count: 2
            },
            
            machine_dimensions: {
                length: 2800,
                width: 1700,
                height: 1800,
                weight: 5200,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "lathe_standard",
                structure: "slant_bed_30_degree",
                chain: ["bed", "cross_slide_X", "turret_Z"]
            }
        },

        // ============================================
        // VTL - VL SERIES
        // ============================================
        {
            id: "AWEA_VL_1600",
            manufacturer: "AWEA",
            model: "VL-1600",
            type: "vertical_turning_lathe",
            subtype: "vtl_single_column",
            description: "Vertical turning lathe for large parts",
            
            work_envelope: {
                table_diameter: 1600,
                max_turning_diameter: 1800,
                max_turning_height: 1200,
                table_load_capacity: 5000,
                table_load_unit: "kg",
                unit: "mm"
            },
            
            spindle: {
                type: "table_drive",
                max_rpm: 150,
                power_rating: 45,
                power_unit: "kW",
                torque_max: 12000,
                torque_unit: "Nm"
            },
            
            axis_specs: {
                x: {
                    travel: 1000,
                    rapid_rate: 8000,
                    guideway_type: "box_way",
                    positioning_accuracy: 0.015
                },
                z: {
                    travel: 1200,
                    rapid_rate: 6000,
                    guideway_type: "box_way",
                    positioning_accuracy: 0.015
                }
            },
            
            ram: {
                cross_section: "250x250",
                cross_section_unit: "mm",
                travel: 1200
            },
            
            controller: {
                brand: "FANUC",
                model: "0i-TF Plus",
                axes_count: 2
            },
            
            machine_dimensions: {
                length: 4200,
                width: 3800,
                height: 4500,
                weight: 28000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "vtl_standard",
                structure: "single_column",
                chain: ["base", "rotary_table", "column", "crossrail", "ram_X_Z"]
            }
        }
    ],

    // Helper functions
    getMachineById: function(id) {
        return this.machines.find(m => m.id === id);
    },
    
    getMachinesByType: function(type) {
        return this.machines.filter(m => m.type === type);
    },
    
    getDoubleColumnMachines: function() {
        return this.machines.filter(m => m.type === "double_column_machining_center");
    },
    
    get5AxisMachines: function() {
        return this.machines.filter(m => 
            m.subtype && m.subtype.includes("5_axis")
        );
    },
    
    getLinearMotorMachines: function() {
        return this.machines.filter(m => 
            m.axis_specs && Object.values(m.axis_specs).some(a => a.motor_type === "linear_motor")
        );
    },
    
    getMachinesWithTCPC: function() {
        return this.machines.filter(m => 
            m.controller && m.controller.tcpc === true
        );
    },
    
    getMachinesByController: function(brand) {
        return this.machines.filter(m => 
            m.controller && m.controller.brand === brand
        );
    },
    
    exportForCollisionSystem: function(machineId) {
        const machine = this.getMachineById(machineId);
        if (!machine) return null;
        
        return {
            id: machine.id,
            type: machine.kinematic_chain?.type,
            work_envelope: machine.work_envelope,
            axis_limits: machine.axis_specs,
            kinematic_chain: machine.kinematic_chain
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRISM_AWEA_MACHINE_DATABASE_ENHANCED;
}
if (typeof window !== 'undefined') {
    window.PRISM_AWEA_MACHINE_DATABASE_ENHANCED = PRISM_AWEA_MACHINE_DATABASE_ENHANCED;
}
