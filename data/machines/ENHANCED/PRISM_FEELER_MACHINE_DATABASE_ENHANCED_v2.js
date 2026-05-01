/**
 * PRISM_FEELER_MACHINE_DATABASE_ENHANCED_v2.js
 * ENHANCED Machine Database - Feeler (FFG Group)
 * 
 * Feeler is a brand of Fair Friend Group (FFG), Taiwan's largest machine tool conglomerate.
 * Known for excellent value VMCs, HMCs, and lathes with Japanese-level quality at competitive prices.
 * FFG also owns MAG, Jobs, Sachman, Rambaudi, Sigma, SNK, and other premium brands.
 * 
 * ENHANCED FORMAT: Full kinematic chains, work envelopes, collision geometry
 * 
 * @version 2.0.0
 * @created 2026-01-20
 * @session 0.EXT.2f.7
 */

const PRISM_FEELER_MACHINE_DATABASE_ENHANCED = {
    metadata: {
        manufacturer: "Feeler",
        country: "Taiwan",
        parent_company: "Fair Friend Group (FFG)",
        founded: 1979,
        headquarters: "Taichung, Taiwan",
        specialty: "High-value VMCs, HMCs, and turning centers with Japanese-level quality",
        website: "https://www.feeler.com",
        version: "2.0.0-ENHANCED",
        last_updated: "2026-01-20",
        machine_count: 12
    },

    machines: [
        // ============================================
        // VERTICAL MACHINING CENTERS - VMP SERIES
        // ============================================
        {
            id: "FEELER_VMP_580",
            manufacturer: "Feeler",
            model: "VMP-580",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc",
            description: "Compact high-speed VMC for precision parts",
            
            work_envelope: {
                x: { min: 0, max: 580, unit: "mm" },
                y: { min: 0, max: 400, unit: "mm" },
                z: { min: 0, max: 400, unit: "mm" },
                table_length: 700,
                table_width: 400,
                table_load_capacity: 300,
                table_load_unit: "kg",
                spindle_nose_to_table: { min: 100, max: 500 }
            },
            
            spindle: {
                type: "direct_drive",
                taper: "BT40",
                max_rpm: 12000,
                power_rating: 11,
                power_unit: "kW",
                torque_max: 70,
                torque_unit: "Nm",
                bearing_type: "angular_contact",
                bearing_arrangement: "P4_precision",
                spindle_bore: 70,
                drawbar_force: 15,
                warmup_time: 15
            },
            
            axis_specs: {
                x: {
                    travel: 580,
                    rapid_rate: 36000,
                    max_feed: 10000,
                    acceleration: 0.8,
                    motor_power: 3.5,
                    guideway_type: "linear_roller",
                    guideway_size: 35,
                    ballscrew_diameter: 40,
                    ballscrew_pitch: 12,
                    encoder_resolution: 0.001,
                    positioning_accuracy: 0.008,
                    repeatability: 0.005
                },
                y: {
                    travel: 400,
                    rapid_rate: 36000,
                    max_feed: 10000,
                    acceleration: 0.8,
                    motor_power: 3.5,
                    guideway_type: "linear_roller",
                    guideway_size: 35,
                    ballscrew_diameter: 40,
                    ballscrew_pitch: 12,
                    encoder_resolution: 0.001,
                    positioning_accuracy: 0.008,
                    repeatability: 0.005
                },
                z: {
                    travel: 400,
                    rapid_rate: 30000,
                    max_feed: 10000,
                    acceleration: 0.7,
                    motor_power: 5.5,
                    guideway_type: "linear_roller",
                    guideway_size: 45,
                    ballscrew_diameter: 40,
                    ballscrew_pitch: 12,
                    encoder_resolution: 0.001,
                    positioning_accuracy: 0.008,
                    repeatability: 0.005
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 24,
                max_tool_diameter: 80,
                max_tool_diameter_adjacent_empty: 130,
                max_tool_length: 250,
                max_tool_weight: 7,
                tool_change_time: 2.5,
                chip_to_chip_time: 4.0
            },
            
            controller: {
                brand: "FANUC",
                model: "0i-MF Plus",
                axes_count: 3,
                simultaneous_axes: 3,
                block_processing_time: 1,
                look_ahead_blocks: 400,
                memory_capacity: "2GB",
                program_capacity: "1GB"
            },
            
            coolant: {
                tank_capacity: 250,
                pump_output: 30,
                through_spindle: true,
                tsc_pressure: 20,
                tsc_pressure_unit: "bar"
            },
            
            machine_dimensions: {
                length: 2100,
                width: 2200,
                height: 2700,
                weight: 5500,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "moving_column",
                chain: ["base", "column_X", "saddle_Y", "spindle_Z"],
                moving_mass_x: 800,
                moving_mass_y: 400,
                moving_mass_z: 350
            }
        },
        
        {
            id: "FEELER_VMP_1100",
            manufacturer: "Feeler",
            model: "VMP-1100",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc",
            description: "Large-capacity VMC for mold and die work",
            
            work_envelope: {
                x: { min: 0, max: 1100, unit: "mm" },
                y: { min: 0, max: 610, unit: "mm" },
                z: { min: 0, max: 610, unit: "mm" },
                table_length: 1300,
                table_width: 600,
                table_load_capacity: 1000,
                table_load_unit: "kg",
                spindle_nose_to_table: { min: 120, max: 730 }
            },
            
            spindle: {
                type: "direct_drive",
                taper: "BT40",
                max_rpm: 12000,
                power_rating: 15,
                power_unit: "kW",
                torque_max: 119,
                torque_unit: "Nm",
                bearing_type: "angular_contact",
                bearing_arrangement: "P4_precision"
            },
            
            axis_specs: {
                x: {
                    travel: 1100,
                    rapid_rate: 36000,
                    max_feed: 10000,
                    acceleration: 0.6,
                    guideway_type: "linear_roller",
                    guideway_size: 45,
                    ballscrew_diameter: 50,
                    ballscrew_pitch: 12,
                    positioning_accuracy: 0.010,
                    repeatability: 0.005
                },
                y: {
                    travel: 610,
                    rapid_rate: 36000,
                    max_feed: 10000,
                    acceleration: 0.6,
                    guideway_type: "linear_roller",
                    guideway_size: 45,
                    ballscrew_diameter: 50,
                    ballscrew_pitch: 12,
                    positioning_accuracy: 0.010,
                    repeatability: 0.005
                },
                z: {
                    travel: 610,
                    rapid_rate: 30000,
                    max_feed: 10000,
                    acceleration: 0.5,
                    guideway_type: "linear_roller",
                    guideway_size: 55,
                    ballscrew_diameter: 50,
                    ballscrew_pitch: 12,
                    positioning_accuracy: 0.010,
                    repeatability: 0.005
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 30,
                max_tool_diameter: 90,
                max_tool_length: 300,
                max_tool_weight: 8,
                tool_change_time: 2.8
            },
            
            controller: {
                brand: "FANUC",
                model: "0i-MF Plus",
                axes_count: 3,
                look_ahead_blocks: 400
            },
            
            machine_dimensions: {
                length: 3100,
                width: 2600,
                height: 3000,
                weight: 9500,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "moving_column",
                chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
            }
        },

        // ============================================
        // HIGH-SPEED VERTICAL - HV SERIES
        // ============================================
        {
            id: "FEELER_HV_800",
            manufacturer: "Feeler",
            model: "HV-800",
            type: "vertical_machining_center",
            subtype: "high_speed_vmc",
            description: "High-speed VMC for die/mold and precision parts",
            
            work_envelope: {
                x: { min: 0, max: 800, unit: "mm" },
                y: { min: 0, max: 500, unit: "mm" },
                z: { min: 0, max: 500, unit: "mm" },
                table_length: 900,
                table_width: 500,
                table_load_capacity: 600,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "BBT40",
                max_rpm: 20000,
                power_rating: 22,
                power_unit: "kW",
                torque_max: 100,
                torque_unit: "Nm",
                bearing_type: "ceramic_hybrid",
                oil_air_lubrication: true
            },
            
            axis_specs: {
                x: {
                    travel: 800,
                    rapid_rate: 48000,
                    max_feed: 15000,
                    acceleration: 1.0,
                    guideway_type: "linear_roller",
                    guideway_size: 45,
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                y: {
                    travel: 500,
                    rapid_rate: 48000,
                    max_feed: 15000,
                    acceleration: 1.0,
                    guideway_type: "linear_roller",
                    guideway_size: 45,
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                z: {
                    travel: 500,
                    rapid_rate: 40000,
                    max_feed: 15000,
                    acceleration: 0.9,
                    guideway_type: "linear_roller",
                    guideway_size: 55,
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 30,
                tool_change_time: 1.8,
                chip_to_chip_time: 3.2
            },
            
            controller: {
                brand: "FANUC",
                model: "31i-B5",
                axes_count: 3,
                high_speed_machining: true,
                ai_contour_control: true,
                nano_smoothing: true,
                look_ahead_blocks: 1000
            },
            
            thermal_compensation: {
                spindle_growth: true,
                ballscrew_compensation: true,
                machine_structure: true
            },
            
            machine_dimensions: {
                length: 2700,
                width: 2500,
                height: 3100,
                weight: 8500,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "moving_column",
                chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
            }
        },

        // ============================================
        // 5-AXIS VERTICAL - U SERIES
        // ============================================
        {
            id: "FEELER_U_600",
            manufacturer: "Feeler",
            model: "U-600",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            description: "5-axis VMC with trunnion table for complex parts",
            
            work_envelope: {
                x: { min: 0, max: 600, unit: "mm" },
                y: { min: 0, max: 500, unit: "mm" },
                z: { min: 0, max: 450, unit: "mm" },
                trunnion_diameter: 500,
                max_workpiece_diameter: 600,
                max_workpiece_height: 400,
                table_load_capacity: 200,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "HSK-A63",
                max_rpm: 15000,
                power_rating: 22,
                power_unit: "kW",
                torque_max: 140,
                torque_unit: "Nm",
                bearing_type: "ceramic_hybrid"
            },
            
            axis_specs: {
                x: {
                    travel: 600,
                    rapid_rate: 40000,
                    max_feed: 12000,
                    acceleration: 0.8,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.006,
                    repeatability: 0.003
                },
                y: {
                    travel: 500,
                    rapid_rate: 40000,
                    max_feed: 12000,
                    acceleration: 0.8,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.006,
                    repeatability: 0.003
                },
                z: {
                    travel: 450,
                    rapid_rate: 36000,
                    max_feed: 12000,
                    acceleration: 0.7,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.006,
                    repeatability: 0.003
                },
                a: {
                    type: "rotary_trunnion",
                    travel: { min: -120, max: 120 },
                    rapid_rate: 50,
                    rapid_rate_unit: "rpm",
                    max_torque: 700,
                    torque_unit: "Nm",
                    clamping_torque: 1400,
                    drive_type: "direct_drive",
                    positioning_accuracy: 0.004,
                    repeatability: 0.002,
                    indexing_accuracy: 10,
                    indexing_accuracy_unit: "arc_seconds"
                },
                c: {
                    type: "rotary_table",
                    travel: { min: -360, max: 360 },
                    continuous: true,
                    rapid_rate: 80,
                    rapid_rate_unit: "rpm",
                    max_torque: 500,
                    torque_unit: "Nm",
                    clamping_torque: 1000,
                    drive_type: "direct_drive",
                    positioning_accuracy: 0.004,
                    repeatability: 0.002
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 32,
                max_tool_diameter: 80,
                max_tool_length: 250,
                max_tool_weight: 7,
                tool_change_time: 2.2
            },
            
            controller: {
                brand: "FANUC",
                model: "31i-B5",
                axes_count: 5,
                simultaneous_axes: 5,
                tcpc: true,
                rtcp: true,
                high_speed_machining: true,
                look_ahead_blocks: 1000
            },
            
            machine_dimensions: {
                length: 2800,
                width: 2600,
                height: 3300,
                weight: 9000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "table_table",
                structure: "trunnion_rotary_on_fixed_column",
                chain: ["base", "column", "saddle_Y", "spindle_Z", "trunnion_A", "table_C"],
                tcp_reference: "workpiece_center",
                rtcp_capable: true
            }
        },

        // ============================================
        // HORIZONTAL MACHINING CENTERS - FMH SERIES
        // ============================================
        {
            id: "FEELER_FMH_500",
            manufacturer: "Feeler",
            model: "FMH-500",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc",
            description: "Horizontal machining center for production work",
            
            work_envelope: {
                x: { min: 0, max: 700, unit: "mm" },
                y: { min: 0, max: 650, unit: "mm" },
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
                torque_max: 380,
                torque_unit: "Nm",
                bearing_type: "angular_contact"
            },
            
            axis_specs: {
                x: {
                    travel: 700,
                    rapid_rate: 40000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.008,
                    repeatability: 0.004
                },
                y: {
                    travel: 650,
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
                    type: "rotary_indexing_table",
                    indexing: 0.001,
                    full_contouring: true,
                    clamping_torque: 1800,
                    positioning_accuracy: 0.003,
                    repeatability: 0.002
                }
            },
            
            pallet_changer: {
                type: "dual_pallet",
                pallet_count: 2,
                pallet_change_time: 8,
                pallet_size: 500,
                max_pallet_load: 500
            },
            
            atc: {
                type: "chain_type",
                capacity: 60,
                max_tool_diameter: 125,
                max_tool_length: 400,
                max_tool_weight: 25,
                tool_change_time: 3.5
            },
            
            controller: {
                brand: "FANUC",
                model: "31i-B5",
                axes_count: 4,
                look_ahead_blocks: 1000
            },
            
            coolant: {
                tank_capacity: 500,
                through_spindle: true,
                tsc_pressure: 70,
                tsc_pressure_unit: "bar"
            },
            
            machine_dimensions: {
                length: 4200,
                width: 3200,
                height: 3300,
                weight: 16000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "table_rotary",
                structure: "T_configuration",
                chain: ["base", "column_Z", "saddle_Y", "spindle_X", "pallet_B"]
            }
        },

        // ============================================
        // TURNING CENTERS - FTC SERIES
        // ============================================
        {
            id: "FEELER_FTC_20",
            manufacturer: "Feeler",
            model: "FTC-20",
            type: "turning_center",
            subtype: "2_axis_lathe",
            description: "High-precision turning center for production",
            
            work_envelope: {
                swing_over_bed: 520,
                swing_over_cross_slide: 300,
                max_turning_diameter: 300,
                max_turning_length: 530,
                bar_capacity: 52,
                unit: "mm"
            },
            
            spindle: {
                type: "built_in_motor",
                chuck_size: 8,
                chuck_size_unit: "inch",
                bore_diameter: 62,
                max_rpm: 5000,
                power_rating: 15,
                power_unit: "kW",
                torque_max: 287,
                torque_unit: "Nm",
                bearing_type: "angular_contact",
                spindle_nose: "A2-6"
            },
            
            axis_specs: {
                x: {
                    travel: 200,
                    rapid_rate: 30000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    guideway_size: 35,
                    ballscrew_diameter: 32,
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                z: {
                    travel: 530,
                    rapid_rate: 30000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    guideway_size: 35,
                    ballscrew_diameter: 32,
                    positioning_accuracy: 0.008,
                    repeatability: 0.004
                }
            },
            
            turret: {
                type: "servo_driven",
                stations: 12,
                tool_size: "25mm_square",
                boring_bar_capacity: 40,
                indexing_time: 0.15,
                live_tooling: false
            },
            
            tailstock: {
                quill_diameter: 75,
                quill_travel: 120,
                taper: "MT4",
                thrust_force: 5000,
                programmable: true
            },
            
            controller: {
                brand: "FANUC",
                model: "0i-TF Plus",
                axes_count: 2,
                c_axis: false
            },
            
            machine_dimensions: {
                length: 2600,
                width: 1600,
                height: 1750,
                weight: 4500,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "lathe_standard",
                structure: "slant_bed_45_degree",
                chain: ["bed", "cross_slide_X", "turret_Z"]
            }
        },
        
        {
            id: "FEELER_FTC_350MY",
            manufacturer: "Feeler",
            model: "FTC-350MY",
            type: "turning_center",
            subtype: "multitasking_lathe",
            description: "Multi-axis turning center with Y-axis and live tooling",
            
            work_envelope: {
                swing_over_bed: 680,
                swing_over_cross_slide: 450,
                max_turning_diameter: 350,
                max_turning_length: 850,
                bar_capacity: 77,
                unit: "mm"
            },
            
            spindle: {
                type: "built_in_motor",
                chuck_size: 10,
                chuck_size_unit: "inch",
                bore_diameter: 85,
                max_rpm: 4000,
                power_rating: 22,
                power_unit: "kW",
                torque_max: 520,
                torque_unit: "Nm",
                c_axis: true,
                c_axis_resolution: 0.001,
                c_axis_clamping_torque: 280
            },
            
            axis_specs: {
                x: {
                    travel: 225,
                    rapid_rate: 30000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                y: {
                    travel: { min: -50, max: 50 },
                    rapid_rate: 12000,
                    max_feed: 5000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                z: {
                    travel: 850,
                    rapid_rate: 30000,
                    max_feed: 10000,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.008,
                    repeatability: 0.004
                },
                c: {
                    type: "main_spindle_positioning",
                    resolution: 0.001,
                    clamping_torque: 280
                }
            },
            
            turret: {
                type: "BMT_live_tooling",
                stations: 12,
                live_stations: 12,
                live_tool_rpm: 6000,
                live_tool_power: 7.5,
                tool_size: "25mm_square",
                boring_bar_capacity: 50,
                indexing_time: 0.18
            },
            
            controller: {
                brand: "FANUC",
                model: "31i-B",
                axes_count: 4,
                c_axis: true,
                y_axis: true,
                rigid_tapping: true
            },
            
            machine_dimensions: {
                length: 3400,
                width: 1900,
                height: 1950,
                weight: 7200,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "lathe_multitasking",
                structure: "slant_bed_45_degree",
                chain: ["bed", "cross_slide_X", "y_slide_Y", "turret_Z", "spindle_C"]
            }
        },

        // ============================================
        // DOUBLE COLUMN - FDC SERIES
        // ============================================
        {
            id: "FEELER_FDC_2114",
            manufacturer: "Feeler",
            model: "FDC-2114",
            type: "double_column_machining_center",
            subtype: "bridge_type",
            description: "Double column machining center for large parts",
            
            work_envelope: {
                x: { min: 0, max: 2100, unit: "mm" },
                y: { min: 0, max: 1400, unit: "mm" },
                z: { min: 0, max: 800, unit: "mm" },
                table_length: 2400,
                table_width: 1400,
                table_load_capacity: 5000,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "gear_driven",
                taper: "BT50",
                max_rpm: 6000,
                power_rating: 30,
                power_unit: "kW",
                torque_max: 500,
                torque_unit: "Nm",
                gear_ranges: 2
            },
            
            axis_specs: {
                x: {
                    travel: 2100,
                    rapid_rate: 15000,
                    max_feed: 8000,
                    guideway_type: "box_way",
                    guideway_width: 100,
                    positioning_accuracy: 0.015,
                    repeatability: 0.008
                },
                y: {
                    travel: 1400,
                    rapid_rate: 15000,
                    max_feed: 8000,
                    guideway_type: "box_way",
                    guideway_width: 80,
                    positioning_accuracy: 0.015,
                    repeatability: 0.008
                },
                z: {
                    travel: 800,
                    rapid_rate: 10000,
                    max_feed: 6000,
                    guideway_type: "box_way",
                    guideway_width: 80,
                    positioning_accuracy: 0.015,
                    repeatability: 0.008
                }
            },
            
            atc: {
                type: "arm_type",
                capacity: 32,
                max_tool_diameter: 125,
                max_tool_length: 400,
                max_tool_weight: 25,
                tool_change_time: 8
            },
            
            controller: {
                brand: "FANUC",
                model: "0i-MF Plus",
                axes_count: 3
            },
            
            machine_dimensions: {
                length: 5500,
                width: 3800,
                height: 3800,
                weight: 25000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "bridge_type",
                structure: "fixed_table_moving_bridge",
                chain: ["base", "table_fixed", "column_X", "crossrail", "saddle_Y", "ram_Z"]
            }
        },

        // ============================================
        // DRILL/TAP CENTERS - FV SERIES
        // ============================================
        {
            id: "FEELER_FV_760",
            manufacturer: "Feeler",
            model: "FV-760",
            type: "vertical_machining_center",
            subtype: "drill_tap_center",
            description: "High-speed drill/tap center for production",
            
            work_envelope: {
                x: { min: 0, max: 760, unit: "mm" },
                y: { min: 0, max: 410, unit: "mm" },
                z: { min: 0, max: 350, unit: "mm" },
                table_length: 900,
                table_width: 420,
                table_load_capacity: 350,
                table_load_unit: "kg"
            },
            
            spindle: {
                type: "built_in_motor",
                taper: "BT30",
                max_rpm: 24000,
                power_rating: 7.5,
                power_unit: "kW",
                torque_max: 12,
                torque_unit: "Nm",
                bearing_type: "ceramic_hybrid"
            },
            
            axis_specs: {
                x: {
                    travel: 760,
                    rapid_rate: 60000,
                    max_feed: 30000,
                    acceleration: 1.5,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                y: {
                    travel: 410,
                    rapid_rate: 60000,
                    max_feed: 30000,
                    acceleration: 1.5,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                },
                z: {
                    travel: 350,
                    rapid_rate: 48000,
                    max_feed: 30000,
                    acceleration: 1.2,
                    guideway_type: "linear_roller",
                    positioning_accuracy: 0.005,
                    repeatability: 0.003
                }
            },
            
            atc: {
                type: "turret_type",
                capacity: 21,
                max_tool_diameter: 60,
                max_tool_length: 200,
                max_tool_weight: 3,
                tool_change_time: 0.9,
                chip_to_chip_time: 1.5
            },
            
            controller: {
                brand: "FANUC",
                model: "0i-MF Plus",
                axes_count: 3,
                rigid_tapping: true,
                high_speed_rigid_tap: true
            },
            
            machine_dimensions: {
                length: 2100,
                width: 1850,
                height: 2500,
                weight: 4200,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "serial_C_prime",
                structure: "moving_column",
                chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
            }
        },

        // ============================================
        // VTL SERIES - VERTICAL TURNING LATHE
        // ============================================
        {
            id: "FEELER_FVL_1250",
            manufacturer: "Feeler",
            model: "FVL-1250",
            type: "vertical_turning_lathe",
            subtype: "vtl_single_column",
            description: "Vertical turning lathe for large diameter parts",
            
            work_envelope: {
                table_diameter: 1250,
                max_turning_diameter: 1400,
                max_turning_height: 900,
                table_load_capacity: 3000,
                table_load_unit: "kg",
                unit: "mm"
            },
            
            spindle: {
                type: "table_drive",
                max_rpm: 200,
                power_rating: 37,
                power_unit: "kW",
                torque_max: 8500,
                torque_unit: "Nm",
                drive_type: "direct_drive"
            },
            
            axis_specs: {
                x: {
                    travel: 800,
                    rapid_rate: 10000,
                    max_feed: 3000,
                    guideway_type: "box_way",
                    positioning_accuracy: 0.015,
                    repeatability: 0.010
                },
                z: {
                    travel: 900,
                    rapid_rate: 8000,
                    max_feed: 3000,
                    guideway_type: "box_way",
                    positioning_accuracy: 0.015,
                    repeatability: 0.010
                }
            },
            
            ram: {
                cross_section: "200x200",
                cross_section_unit: "mm",
                travel: 900,
                live_tooling_option: true
            },
            
            controller: {
                brand: "FANUC",
                model: "0i-TF Plus",
                axes_count: 2,
                c_axis_option: true
            },
            
            machine_dimensions: {
                length: 3500,
                width: 3200,
                height: 4000,
                weight: 18000,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "vtl_standard",
                structure: "single_column",
                chain: ["base", "rotary_table", "column", "crossrail", "ram_X_Z"]
            }
        },

        // ============================================
        // SWISS-TYPE LATHE - FSL SERIES
        // ============================================
        {
            id: "FEELER_FSL_20",
            manufacturer: "Feeler",
            model: "FSL-20",
            type: "turning_center",
            subtype: "swiss_type_lathe",
            description: "Swiss-type sliding headstock lathe for precision small parts",
            
            work_envelope: {
                max_bar_diameter: 20,
                max_machining_length: 200,
                guide_bushing: true,
                unit: "mm"
            },
            
            main_spindle: {
                type: "built_in_motor",
                max_rpm: 10000,
                power_rating: 3.7,
                power_unit: "kW",
                c_axis: true,
                c_axis_resolution: 0.001
            },
            
            sub_spindle: {
                type: "built_in_motor",
                max_rpm: 8000,
                power_rating: 2.2,
                power_unit: "kW",
                c_axis: true,
                travel: 150
            },
            
            axis_specs: {
                z1: {
                    travel: 200,
                    rapid_rate: 32000,
                    positioning_accuracy: 0.003,
                    repeatability: 0.002
                },
                x1: {
                    travel: 30,
                    rapid_rate: 20000,
                    positioning_accuracy: 0.003,
                    repeatability: 0.002
                },
                y1: {
                    travel: 30,
                    rapid_rate: 20000,
                    positioning_accuracy: 0.003,
                    repeatability: 0.002
                }
            },
            
            tooling: {
                main_spindle_tools: 18,
                sub_spindle_tools: 9,
                live_tools: true,
                gang_slide: true
            },
            
            controller: {
                brand: "FANUC",
                model: "31i-B",
                axes_count: 7,
                simultaneous_axes: 5
            },
            
            machine_dimensions: {
                length: 2200,
                width: 1200,
                height: 1650,
                weight: 2800,
                weight_unit: "kg"
            },
            
            kinematic_chain: {
                type: "swiss_sliding_headstock",
                structure: "gang_slide_with_sub_spindle",
                chain: ["base", "sliding_headstock_Z1", "gang_slide_X1_Y1", "sub_spindle_Z2"]
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
    
    getMachinesBySubtype: function(subtype) {
        return this.machines.filter(m => m.subtype === subtype);
    },
    
    getVMCs: function() {
        return this.machines.filter(m => m.type === "vertical_machining_center");
    },
    
    getHMCs: function() {
        return this.machines.filter(m => m.type === "horizontal_machining_center");
    },
    
    getLathes: function() {
        return this.machines.filter(m => m.type === "turning_center");
    },
    
    get5AxisMachines: function() {
        return this.machines.filter(m => 
            m.subtype && m.subtype.includes("5_axis")
        );
    },
    
    getMachinesWithLiveTooling: function() {
        return this.machines.filter(m => 
            m.turret && m.turret.live_tooling !== false
        );
    },
    
    getMachinesByController: function(brand) {
        return this.machines.filter(m => 
            m.controller && m.controller.brand === brand
        );
    },
    
    getWorkEnvelopeVolume: function(machineId) {
        const machine = this.getMachineById(machineId);
        if (!machine || !machine.work_envelope) return null;
        
        const we = machine.work_envelope;
        if (we.x && we.y && we.z) {
            const xRange = we.x.max - we.x.min;
            const yRange = we.y.max - we.y.min;
            const zRange = we.z.max - we.z.min;
            return {
                volume_mm3: xRange * yRange * zRange,
                volume_liters: (xRange * yRange * zRange) / 1000000,
                dimensions: { x: xRange, y: yRange, z: zRange }
            };
        }
        return null;
    },

    getAllKinematicTypes: function() {
        const types = new Set();
        this.machines.forEach(m => {
            if (m.kinematic_chain && m.kinematic_chain.type) {
                types.add(m.kinematic_chain.type);
            }
        });
        return Array.from(types);
    },

    exportForCollisionSystem: function(machineId) {
        const machine = this.getMachineById(machineId);
        if (!machine) return null;
        
        return {
            id: machine.id,
            type: machine.kinematic_chain?.type,
            work_envelope: machine.work_envelope,
            axis_limits: machine.axis_specs,
            spindle_geometry: machine.spindle,
            collision_zones: this.generateCollisionZones(machine)
        };
    },
    
    generateCollisionZones: function(machine) {
        const zones = [];
        
        if (machine.work_envelope) {
            zones.push({
                name: "work_envelope",
                type: "box",
                bounds: machine.work_envelope
            });
        }
        
        if (machine.spindle) {
            zones.push({
                name: "spindle_zone",
                type: "cylinder",
                clearance_required: 50
            });
        }
        
        return zones;
    }
};

// Export for PRISM integration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRISM_FEELER_MACHINE_DATABASE_ENHANCED;
}

if (typeof window !== 'undefined') {
    window.PRISM_FEELER_MACHINE_DATABASE_ENHANCED = PRISM_FEELER_MACHINE_DATABASE_ENHANCED;
}
