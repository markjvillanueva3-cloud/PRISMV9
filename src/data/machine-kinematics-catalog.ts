/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Machine Kinematics & Collision Zone Catalog
 *
 * Extracted from PRISM Archive ENHANCED v2 machine databases.
 * Source: C:/PRISM_ARCHIVE_2026-02-01/EXTRACTED/machines/ENHANCED/
 *         33 manufacturer JS databases (PRISM_*_MACHINE_DATABASE_ENHANCED_v2.js)
 *
 * Contains kinematic chain definitions and collision zone geometry for
 * 250 machines across 33 manufacturers.
 * 132 machines include explicit collision zone primitives.
 *
 * Haas entries excluded (richer LEVEL5 data in machine-enrichment-catalog.ts).
 *
 * Extraction date: 2026-03-07
 *
 * @see MachineProfileEngine for the runtime engine
 * @see machine-enrichment-catalog.ts for Haas LEVEL5 kinematic data
 */

// ============================================================================
// Interfaces
// ============================================================================

/** A single collision zone geometric primitive */
export interface CollisionZone {
  type: string;
  [key: string]: any;
}

/** Kinematic chain definition -- structure varies by machine topology */
export interface KinematicChainDef {
  type: string;
  structure?: string;
  chain?: string[];
  [key: string]: any;
}

/** A machine entry with kinematic chain and optional collision zones */
export interface KinematicChainEntry {
  manufacturer: string;
  model: string;
  type: string;
  id: string;
  kinematic_chain: KinematicChainDef;
  collision_zones?: Record<string, CollisionZone>;
}

// ============================================================================
// Catalog Data -- 250 machines, 33 manufacturers
// ============================================================================

export const MACHINE_KINEMATICS_CATALOG: KinematicChainEntry[] = [

  // -- AWEA (1 machines) ────────────────────────────────────────────────────────
  {
    manufacturer: "AWEA",
    model: "LP-3021",
    type: "double_column_machining_center",
    id: "AWEA_LP_3021",
    kinematic_chain: {
      type: "bridge_type",
      structure: "fixed_table_moving_bridge",
      chain: ["base", "table_fixed", "column_left", "column_right", "crossrail_X", "saddle_Y", "ram_Z"],
      moving_mass_x: 3500,
      moving_mass_y: 2000,
      moving_mass_z: 1500
    },
  },

  // -- Cincinnati Machine (8 machines) ──────────────────────────────────────────
  {
    manufacturer: "Cincinnati Machine",
    model: "Lancer V5",
    type: "5AXIS_GANTRY",
    id: "cincinnati_lancer_v5",
    kinematic_chain: { type: "XYZAC_FORK", structure: "gantry_moving_bridge" },
  },
  {
    manufacturer: "Cincinnati Machine",
    model: "Lancer 1250 5X",
    type: "5AXIS_GANTRY",
    id: "cincinnati_lancer_1250_5x",
    kinematic_chain: {
      type: "5AXIS_GANTRY",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          range: { min: -120, max: 30 },
          maxSpeed: 40,
          pivotPoint: { z: -250 }
        },
        c: { continuous: true, maxSpeed: 60 }
      }
    },
  },
  {
    manufacturer: "Cincinnati Machine",
    model: "U5-400",
    type: "PROFILER",
    id: "cincinnati_u5_400",
    kinematic_chain: {
      type: "PROFILER",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          range: { min: -110, max: 110 },
          maxSpeed: 80,
          acceleration: 150
        },
        c: { continuous: true, maxSpeed: 120, acceleration: 200 }
      }
    },
  },
  {
    manufacturer: "Cincinnati Machine",
    model: "U5-600",
    type: "PROFILER",
    id: "cincinnati_u5_600",
    kinematic_chain: {
      type: "PROFILER",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "Cincinnati Machine",
    model: "Gammtech 5-Axis",
    type: "5AXIS_GANTRY",
    id: "cincinnati_gammtech",
    kinematic_chain: {
      type: "5AXIS_GANTRY",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "Cincinnati Machine",
    model: "MAG5X",
    type: "5AXIS_GANTRY",
    id: "cincinnati_mag5x",
    kinematic_chain: {
      type: "5AXIS_GANTRY",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "Cincinnati Machine",
    model: "V5-3000",
    type: "LARGE_5AXIS",
    id: "cincinnati_v5_3000",
    kinematic_chain: {
      type: "LARGE_5AXIS",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "Cincinnati Machine",
    model: "Maxim 500",
    type: "VMC",
    id: "cincinnati_maxim_500",
    kinematic_chain: {
      type: "VMC",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },

  // -- DMG MORI (7 machines) ────────────────────────────────────────────────────
  {
    manufacturer: "DMG MORI",
    model: "DMU 50 3rd Generation",
    type: "vertical_machining_center",
    id: "DMG_DMU_50_3RD_GEN",
    kinematic_chain: {
      type: "table_table",
      structure: "B_axis_trunnion_on_C_axis_rotary",
      topology: "serial",
      dof: 5,
      chain: ["base", "column", "y_saddle", "z_head", "spindle", "x_table_base", "b_trunnion", "c_table"],
      dh_parameters: {
        y: {
          a: 0,
          alpha: 0,
          d: "variable",
          theta: 0,
          type: "P",
          axis: [0, 1, 0]
        },
        z: {
          a: 0,
          alpha: 90,
          d: "variable",
          theta: 0,
          type: "P",
          axis: [0, 0, 1]
        },
        x: {
          a: 0,
          alpha: 0,
          d: "variable",
          theta: 0,
          type: "P",
          axis: [1, 0, 0]
        },
        b: {
          a: 0,
          alpha: 0,
          d: 150,
          theta: "variable",
          type: "R",
          axis: [0, 1, 0]
        },
        c: {
          a: 0,
          alpha: 0,
          d: 0,
          theta: "variable",
          type: "R",
          axis: [0, 0, 1]
        }
      },
      home_position: { x: 250, y: 225, z: 400, b: 0, c: 0 },
      machine_zero: [0, 0, 0],
      spindle_gauge_point: [0, 0, -200],
      table_center: [0, 0, 150],
      moving_masses: {
        y_assembly: {
          mass: 800,
          cog: [0, 100, 400]
        },
        z_assembly: {
          mass: 650,
          cog: [0, 0, 200]
        },
        x_assembly: {
          mass: 1200,
          cog: [0, 0, 100]
        },
        b_assembly: {
          mass: 450,
          cog: [0, 0, 75]
        },
        c_table: {
          mass: 180,
          cog: [0, 0, 25]
        }
      }
    },
    collision_zones: {
      spindle_danger_zone: {
        type: "cylinder",
        radius: 150,
        height: 400,
        origin: [0, 0, -400],
        reference: "spindle_face",
        alert_level: "critical"
      },
      tool_engagement_zone: {
        type: "cylinder",
        radius: 100,
        height: 300,
        origin: [0, 0, -300],
        reference: "tool_tip",
        alert_level: "warning"
      },
      rapid_exclusion_zone: {
        type: "box",
        dimensions: [700, 700, 600],
        origin: [0, 0, 0],
        reference: "table_center",
        alert_level: "rapid_limit"
      }
    },
  },
  {
    manufacturer: "DMG MORI",
    model: "DMU 65 monoBLOCK",
    type: "vertical_machining_center",
    id: "DMG_DMU_65_MONOBLOCK",
    kinematic_chain: {
      type: "table_table",
      structure: "monoBLOCK_AC_trunnion",
      chain: ["base", "column", "y_saddle", "z_head", "spindle", "x_table", "a_trunnion", "c_table"],
      moving_masses: {
        y_assembly: {
          mass: 1100,
          cog: [0, 150, 500]
        },
        z_assembly: {
          mass: 850,
          cog: [0, 0, 280]
        },
        x_assembly: {
          mass: 1600,
          cog: [0, 0, 120]
        },
        a_assembly: {
          mass: 650,
          cog: [0, 0, 100]
        },
        c_table: {
          mass: 280,
          cog: [0, 0, 30]
        }
      }
    },
  },
  {
    manufacturer: "DMG MORI",
    model: "DMC 80 H linear",
    type: "horizontal_machining_center",
    id: "DMG_DMC_80H",
    kinematic_chain: {
      type: "T_configuration",
      structure: "traveling_column_linear",
      chain: ["base", "column_Z", "saddle_Y", "spindle_X", "pallet_B"],
      moving_masses: {
        z_column: {
          mass: 3500,
          cog: [0, 400, 400]
        },
        y_saddle: {
          mass: 1200,
          cog: [0, 0, 400]
        },
        x_spindle: {
          mass: 800,
          cog: [200, 0, 400]
        }
      }
    },
  },
  {
    manufacturer: "DMG MORI",
    model: "NLX 2500/700",
    type: "turning_center",
    id: "DMG_NLX_2500",
    kinematic_chain: {
      type: "lathe_standard",
      structure: "integral_spindle_headstock",
      chain: ["bed", "headstock_spindle_C", "cross_slide_X", "turret_Z"],
      bed_angle: 60,
      bed_angle_unit: "deg"
    },
  },
  {
    manufacturer: "DMG MORI",
    model: "NTX 2000",
    type: "mill_turn_center",
    id: "DMG_NTX_2000",
    kinematic_chain: {
      type: "mill_turn_dual_spindle",
      structure: "B_axis_milling_head_with_lower_turret",
      chain: ["bed", "main_spindle_C1", "cross_slide_X", "y_slide_Y", "upper_slide_Z", "b_axis_milling_head_B", "milling_spindle", "lower_turret", "sub_spindle_C2"]
    },
  },
  {
    manufacturer: "DMG MORI",
    model: "CTV 250",
    type: "vertical_turning_lathe",
    id: "DMG_CTV_250",
    kinematic_chain: {
      type: "vtl_inverted",
      structure: "hanging_workpiece",
      chain: ["base", "column", "x_slide", "spindle_z_pickup", "turret_fixed"]
    },
  },
  {
    manufacturer: "DMG MORI",
    model: "DMC 850 V",
    type: "vertical_machining_center",
    id: "DMG_DMC_V_850",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "traveling_column",
      chain: ["base", "table_fixed", "column_X", "saddle_Y", "spindle_Z"]
    },
  },

  // -- Feeler (11 machines) ──────────────────────────────────────────────────────
  {
    manufacturer: "Feeler",
    model: "VMP-580",
    type: "vertical_machining_center",
    id: "FEELER_VMP_580",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"],
      moving_mass_x: 800,
      moving_mass_y: 400,
      moving_mass_z: 350
    },
  },
  {
    manufacturer: "Feeler",
    model: "VMP-1100",
    type: "vertical_machining_center",
    id: "FEELER_VMP_1100",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Feeler",
    model: "HV-800",
    type: "vertical_machining_center",
    id: "FEELER_HV_800",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Feeler",
    model: "U-600",
    type: "vertical_machining_center",
    id: "FEELER_U_600",
    kinematic_chain: {
      type: "table_table",
      structure: "trunnion_rotary_on_fixed_column",
      chain: ["base", "column", "saddle_Y", "spindle_Z", "trunnion_A", "table_C"],
      tcp_reference: "workpiece_center",
      rtcp_capable: true
    },
  },
  {
    manufacturer: "Feeler",
    model: "FMH-500",
    type: "horizontal_machining_center",
    id: "FEELER_FMH_500",
    kinematic_chain: {
      type: "table_rotary",
      structure: "T_configuration",
      chain: ["base", "column_Z", "saddle_Y", "spindle_X", "pallet_B"]
    },
  },
  {
    manufacturer: "Feeler",
    model: "FTC-20",
    type: "turning_center",
    id: "FEELER_FTC_20",
    kinematic_chain: {
      type: "lathe_standard",
      structure: "slant_bed_45_degree",
      chain: ["bed", "cross_slide_X", "turret_Z"]
    },
  },
  {
    manufacturer: "Feeler",
    model: "FTC-350MY",
    type: "turning_center",
    id: "FEELER_FTC_350MY",
    kinematic_chain: {
      type: "lathe_multitasking",
      structure: "slant_bed_45_degree",
      chain: ["bed", "cross_slide_X", "y_slide_Y", "turret_Z", "spindle_C"]
    },
  },
  {
    manufacturer: "Feeler",
    model: "FDC-2114",
    type: "double_column_machining_center",
    id: "FEELER_FDC_2114",
    kinematic_chain: {
      type: "bridge_type",
      structure: "fixed_table_moving_bridge",
      chain: ["base", "table_fixed", "column_X", "crossrail", "saddle_Y", "ram_Z"]
    },
  },
  {
    manufacturer: "Feeler",
    model: "FV-760",
    type: "vertical_machining_center",
    id: "FEELER_FV_760",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Feeler",
    model: "FVL-1250",
    type: "vertical_turning_lathe",
    id: "FEELER_FVL_1250",
    kinematic_chain: {
      type: "vtl_standard",
      structure: "single_column",
      chain: ["base", "rotary_table", "column", "crossrail", "ram_X_Z"]
    },
  },
  {
    manufacturer: "Feeler",
    model: "FSL-20",
    type: "turning_center",
    id: "FEELER_FSL_20",
    kinematic_chain: {
      type: "swiss_sliding_headstock",
      structure: "gang_slide_with_sub_spindle",
      chain: ["base", "sliding_headstock_Z1", "gang_slide_X1_Y1", "sub_spindle_Z2"]
    },
  },

  // -- Fidia (7 machines) ───────────────────────────────────────────────────────
  {
    manufacturer: "Fidia",
    model: "D321",
    type: "COMPACT_5AXIS",
    id: "fidia_d321",
    kinematic_chain: { type: "XYZ_AC_TABLE", structure: "c-frame-trunnion" },
  },
  {
    manufacturer: "Fidia",
    model: "D321 Linear",
    type: "COMPACT_5AXIS",
    id: "fidia_d321_linear",
    kinematic_chain: {
      type: "COMPACT_5AXIS",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          range: { min: -110, max: 30 },
          maxSpeed: 80,
          acceleration: 200
        },
        c: { continuous: true, maxSpeed: 150, acceleration: 300 }
      }
    },
  },
  {
    manufacturer: "Fidia",
    model: "GTR 2500",
    type: "GANTRY_5AXIS",
    id: "fidia_gtr_2500",
    kinematic_chain: { type: "XYZAC_FORK", structure: "gantry_fork_head" },
  },
  {
    manufacturer: "Fidia",
    model: "GTR 4500",
    type: "GANTRY_5AXIS",
    id: "fidia_gtr_4500",
    kinematic_chain: {
      type: "GANTRY_5AXIS",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          range: { min: -120, max: 120 },
          maxSpeed: 45,
          pivotPoint: { z: -180 }
        },
        c: { continuous: true, maxSpeed: 80 }
      }
    },
  },
  {
    manufacturer: "Fidia",
    model: "GTF 3014",
    type: "GANTRY_5AXIS",
    id: "fidia_gtf_3014",
    kinematic_chain: {
      type: "GANTRY_5AXIS",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          range: { min: -120, max: 120 },
          maxSpeed: 35
        },
        c: { continuous: true, maxSpeed: 60 }
      }
    },
  },
  {
    manufacturer: "Fidia",
    model: "K199",
    type: "PORTABLE",
    id: "fidia_k199",
    kinematic_chain: {
      type: "PORTABLE",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          type: "wrist",
          range: { min: -90, max: 90 },
          maxSpeed: 40
        },
        c: { type: "wrist", continuous: true, maxSpeed: 60 }
      }
    },
  },
  {
    manufacturer: "Fidia",
    model: "K211",
    type: "PORTABLE",
    id: "fidia_k211",
    kinematic_chain: {
      type: "PORTABLE",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          range: { min: -100, max: 100 },
          maxSpeed: 30
        },
        c: { continuous: true, maxSpeed: 50 }
      }
    },
  },

  // -- Giddings & Lewis (8 machines) ────────────────────────────────────────────
  {
    manufacturer: "Giddings & Lewis",
    model: "RT 1250",
    type: "TABLE_TYPE_HBM",
    id: "giddings_rt_1250",
    kinematic_chain: { type: "XYZWB_TABLE", structure: "table_type_hbm" },
    collision_zones: {
      spindleHead: {
        type: "box",
        dimensions: { x: 500, y: 600, z: 800 }
      },
      column: {
        type: "box",
        dimensions: { x: 800, y: 600, z: 3000 }
      },
      rotaryTable: { type: "cylinder", diameter: 1250, length: 700 }
    },
  },
  {
    manufacturer: "Giddings & Lewis",
    model: "RT 1600",
    type: "TABLE_TYPE_HBM",
    id: "giddings_rt_1600",
    kinematic_chain: {
      type: "TABLE_TYPE_HBM",
      structure: "inferred",
      linear_axes: ["x", "y", "z", "w"],
      rotary_axes: {
        b: { tableDiameter: 1600, maxTableLoad: 25000, clampTorque: 50000 }
      }
    },
  },
  {
    manufacturer: "Giddings & Lewis",
    model: "FT 2500",
    type: "FLOOR_TYPE_HBM",
    id: "giddings_ft_2500",
    kinematic_chain: { type: "XYZWB_FLOOR", structure: "floor_type_hbm" },
  },
  {
    manufacturer: "Giddings & Lewis",
    model: "FT 3500",
    type: "FLOOR_TYPE_HBM",
    id: "giddings_ft_3500",
    kinematic_chain: {
      type: "FLOOR_TYPE_HBM",
      structure: "inferred",
      linear_axes: ["x", "y", "z", "w"],
      rotary_axes: {
        b: { tableDiameter: 3500, maxTableLoad: 60000, clampTorque: 120000 }
      }
    },
  },
  {
    manufacturer: "Giddings & Lewis",
    model: "FT 5000",
    type: "FLOOR_TYPE_HBM",
    id: "giddings_ft_5000",
    kinematic_chain: {
      type: "FLOOR_TYPE_HBM",
      structure: "inferred",
      linear_axes: ["x", "y", "z", "w"],
      rotary_axes: {
        b: { tableDiameter: 5000, maxTableLoad: 100000, clampTorque: 200000 }
      }
    },
  },
  {
    manufacturer: "Giddings & Lewis",
    model: "PM 2500",
    type: "PLANER_MILL",
    id: "giddings_pm_2500",
    kinematic_chain: { type: "XYZW", structure: "planer_mill" },
  },
  {
    manufacturer: "Giddings & Lewis",
    model: "PM 4000",
    type: "PLANER_MILL",
    id: "giddings_pm_4000",
    kinematic_chain: {
      type: "PLANER_MILL",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "Giddings & Lewis",
    model: "RTC 4000",
    type: "ROTARY_TABLE",
    id: "giddings_rtc_4000",
    kinematic_chain: {
      type: "ROTARY_TABLE",
      structure: "inferred",
      rotary_axes: {
        b: {
          type: "floor_rotary_table",
          continuous: true,
          tableDiameter: 4000,
          maxSpeed: 2,
          clampTorque: 150000,
          driveTorque: 50000,
          maxTableLoad: 80000,
          rotaryAccuracy: 0.005,
          tSlots: { count: 12, radial: true },
          centerBore: 500
        }
      }
    },
    collision_zones: {
      table: { type: "cylinder", diameter: 4000, length: 800 },
      base: {
        type: "cylinder",
        diameter: 4500,
        length: 400,
        offset: { z: -800 }
      }
    },
  },

  // -- Hermle (9 machines) ──────────────────────────────────────────────────────
  {
    manufacturer: "Hermle",
    model: "C 32 U",
    type: "vertical_machining_center",
    id: "HERMLE_C_32_U",
    kinematic_chain: {
      type: "modified_gantry",
      structure: "three_point_support_gantry",
      topology: "parallel_serial_hybrid",
      dof: 5,
      chain: ["mineral_cast_base", "gantry_column_left", "gantry_column_right", "crossbeam_Y", "z_ram", "spindle", "table_base_X", "swivel_a_axis", "rotary_c_table"],
      dh_parameters: {
        y: {
          a: 0,
          alpha: 0,
          d: "variable",
          theta: 0,
          type: "P",
          axis: [0, 1, 0]
        },
        z: {
          a: 0,
          alpha: 90,
          d: "variable",
          theta: 0,
          type: "P",
          axis: [0, 0, 1]
        },
        x: {
          a: 0,
          alpha: 0,
          d: "variable",
          theta: 0,
          type: "P",
          axis: [1, 0, 0]
        },
        a: {
          a: 0,
          alpha: 0,
          d: 175,
          theta: "variable",
          type: "R",
          axis: [1, 0, 0]
        },
        c: {
          a: 0,
          alpha: 0,
          d: 0,
          theta: "variable",
          type: "R",
          axis: [0, 0, 1]
        }
      },
      home_position: { x: 325, y: 325, z: 500, a: 0, c: 0 },
      machine_zero: [0, 0, 0],
      spindle_gauge_point: [0, 0, -200],
      table_center: [0, 0, 175],
      moving_masses: {
        crossbeam_y: {
          mass: 1200,
          cog: [0, 325, 800]
        },
        z_ram: {
          mass: 600,
          cog: [0, 0, 250]
        },
        table_x: {
          mass: 800,
          cog: [0, 0, 100]
        },
        swivel_a: {
          mass: 400,
          cog: [0, 0, 88]
        },
        rotary_c: {
          mass: 150,
          cog: [0, 0, 30]
        }
      },
      hermle_design_features: {
        three_point_support: true,
        symmetrical_thermal_expansion: true,
        mineral_cast_damping: true,
        optimized_chip_fall: true
      }
    },
    collision_zones: {
      spindle_danger_zone: {
        type: "cylinder",
        radius: 120,
        height: 400,
        origin: [0, 0, -400],
        reference: "spindle_face"
      },
      swivel_clearance: {
        type: "sphere",
        radius: 350,
        origin: [0, 0, 175],
        reference: "swivel_center"
      },
      table_rotation_envelope: {
        type: "cylinder",
        radius: 300,
        height: 400,
        origin: [0, 0, 0],
        reference: "table_center"
      }
    },
  },
  {
    manufacturer: "Hermle",
    model: "C 42 U",
    type: "vertical_machining_center",
    id: "HERMLE_C_42_U",
    kinematic_chain: {
      type: "modified_gantry",
      structure: "three_point_support",
      chain: ["mineral_cast_base", "gantry", "crossbeam_Y", "z_ram", "spindle", "table_base_X", "swivel_a", "rotary_c"],
      moving_masses: {
        crossbeam_y: {
          mass: 1600,
          cog: [0, 400, 900]
        },
        z_ram: {
          mass: 750,
          cog: [0, 0, 275]
        },
        table_x: {
          mass: 1100,
          cog: [0, 0, 120]
        }
      }
    },
  },
  {
    manufacturer: "Hermle",
    model: "C 52 U",
    type: "vertical_machining_center",
    id: "HERMLE_C_52_U",
    kinematic_chain: {
      type: "modified_gantry",
      structure: "three_point_support_heavy",
      chain: ["mineral_cast_base", "gantry", "crossbeam_Y", "z_ram", "spindle", "table_base_X", "swivel_a", "rotary_c"]
    },
  },
  {
    manufacturer: "Hermle",
    model: "C 22 U",
    type: "vertical_machining_center",
    id: "HERMLE_C_22_U",
    kinematic_chain: {
      type: "modified_gantry",
      structure: "compact_three_point",
      chain: ["mineral_cast_base", "gantry", "crossbeam_Y", "z_ram", "spindle", "table_base_X", "swivel_a", "rotary_c"]
    },
  },
  {
    manufacturer: "Hermle",
    model: "C 12 U",
    type: "vertical_machining_center",
    id: "HERMLE_C_12_U",
    kinematic_chain: {
      type: "modified_gantry",
      structure: "micro_precision",
      chain: ["mineral_cast_base", "gantry", "crossbeam_Y", "z_ram", "spindle", "table_base_X", "swivel_a", "rotary_c"]
    },
  },
  {
    manufacturer: "Hermle",
    model: "C 32",
    type: "vertical_machining_center",
    id: "HERMLE_C_32",
    kinematic_chain: {
      type: "modified_gantry",
      structure: "three_point_3axis",
      chain: ["mineral_cast_base", "gantry", "crossbeam_Y", "z_ram", "spindle", "table_X"]
    },
  },
  {
    manufacturer: "Hermle",
    model: "C 42 U MT",
    type: "mill_turn_center",
    id: "HERMLE_C_42_U_MT",
    kinematic_chain: {
      type: "modified_gantry_mill_turn",
      structure: "mill_turn_with_turning_table",
      chain: ["mineral_cast_base", "gantry", "crossbeam_Y", "z_ram", "spindle", "table_base_X", "swivel_a", "turning_table_c"]
    },
  },
  {
    manufacturer: "Hermle",
    model: "C 32 U HS",
    type: "vertical_machining_center",
    id: "HERMLE_C_32_U_HS",
    kinematic_chain: {
      type: "modified_gantry",
      structure: "high_speed_variant",
      chain: ["mineral_cast_base", "gantry", "crossbeam_Y", "z_ram", "spindle", "table_base_X", "swivel_a", "rotary_c"]
    },
  },
  {
    manufacturer: "Hermle",
    model: "C 32 U with RS 05",
    type: "vertical_machining_center",
    id: "HERMLE_C_32_U_RS_05",
    kinematic_chain: {
      type: "modified_gantry",
      structure: "with_automation_cell",
      chain: ["mineral_cast_base", "gantry", "crossbeam_Y", "z_ram", "spindle", "table_base_X", "swivel_a", "rotary_c"]
    },
  },

  // -- MHI Machine Tool (9 machines) ────────────────────────────────────────────
  {
    manufacturer: "MHI Machine Tool",
    model: "MVR-Ex50",
    type: "DOUBLE_COLUMN",
    id: "mhi_mvr_ex50",
    kinematic_chain: {
      type: "DOUBLE_COLUMN",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "MHI Machine Tool",
    model: "MVR-Ex80",
    type: "DOUBLE_COLUMN",
    id: "mhi_mvr_ex80",
    kinematic_chain: {
      type: "DOUBLE_COLUMN",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "MHI Machine Tool",
    model: "MAF-E180",
    type: "5AXIS_GANTRY",
    id: "mhi_maf_e180",
    kinematic_chain: {
      type: "5AXIS_GANTRY",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          range: { min: -120, max: 120 },
          drive: "direct_drive",
          maxSpeed: 60
        },
        c: { continuous: true, drive: "direct_drive", maxSpeed: 100 }
      }
    },
  },
  {
    manufacturer: "MHI Machine Tool",
    model: "MAF-S150",
    type: "5AXIS_GANTRY",
    id: "mhi_maf_s150",
    kinematic_chain: {
      type: "5AXIS_GANTRY",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "MHI Machine Tool",
    model: "MAF-HB130",
    type: "HBM",
    id: "mhi_maf_hb130",
    kinematic_chain: {
      type: "HBM",
      structure: "inferred",
      linear_axes: ["x", "y", "z", "w"],
      rotary_axes: {
        b: { type: "rotary_table", tableDiameter: 2000, maxTableLoad: 20000 }
      }
    },
  },
  {
    manufacturer: "MHI Machine Tool",
    model: "MAF-HB180",
    type: "HBM",
    id: "mhi_maf_hb180",
    kinematic_chain: {
      type: "HBM",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        b: { tableDiameter: 3000, maxTableLoad: 40000 }
      }
    },
  },
  {
    manufacturer: "MHI Machine Tool",
    model: "MVR-Cx50",
    type: "LARGE_VMC",
    id: "mhi_mvr_cx50",
    kinematic_chain: {
      type: "LARGE_VMC",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "MHI Machine Tool",
    model: "MVR-40",
    type: "LARGE_VMC",
    id: "mhi_mvr_40",
    kinematic_chain: {
      type: "LARGE_VMC",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "MHI Machine Tool",
    model: "MAF-S500",
    type: "SPECIAL",
    id: "mhi_maf_s500",
    kinematic_chain: {
      type: "SPECIAL",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },

  // -- Makino (10 machines) ──────────────────────────────────────────────────────
  {
    manufacturer: "Makino",
    model: "D500",
    type: "vertical_machining_center",
    id: "MAKINO_D500",
    kinematic_chain: {
      type: "table_table",
      structure: "makino_D_AC_trunnion",
      chain: ["base", "column", "y_saddle", "z_ram", "spindle", "x_table", "a_trunnion", "c_table"],
      moving_masses: {
        y_saddle: {
          mass: 600,
          cog: [0, 150, 400]
        },
        z_ram: {
          mass: 500,
          cog: [0, 0, 200]
        },
        x_table: {
          mass: 800,
          cog: [0, 0, 100]
        },
        a_trunnion: {
          mass: 350,
          cog: [0, 0, 90]
        },
        c_table: {
          mass: 150,
          cog: [0, 0, 40]
        }
      }
    },
  },
  {
    manufacturer: "Makino",
    model: "D800Z",
    type: "vertical_machining_center",
    id: "MAKINO_D800Z",
    kinematic_chain: {
      type: "table_table",
      structure: "makino_D_large_AC",
      chain: ["base", "column", "y_saddle", "z_ram", "spindle", "x_table", "a_trunnion", "c_table"]
    },
  },
  {
    manufacturer: "Makino",
    model: "a61nx",
    type: "horizontal_machining_center",
    id: "MAKINO_A61NX",
    kinematic_chain: {
      type: "T_configuration",
      structure: "makino_a_series",
      chain: ["base", "pallet_B", "column_Z", "saddle_Y", "spindle_X"]
    },
  },
  {
    manufacturer: "Makino",
    model: "a81nx",
    type: "horizontal_machining_center",
    id: "MAKINO_A81NX",
    kinematic_chain: {
      type: "T_configuration",
      structure: "makino_a_series_large",
      chain: ["base", "pallet_B", "column_Z", "saddle_Y", "spindle_X"]
    },
  },
  {
    manufacturer: "Makino",
    model: "PS95",
    type: "vertical_machining_center",
    id: "MAKINO_PS95",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "fixed_column",
      chain: ["base", "column", "table_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Makino",
    model: "F5",
    type: "vertical_machining_center",
    id: "MAKINO_F5",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "fixed_column_precision",
      chain: ["base", "column", "table_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Makino",
    model: "iQ500",
    type: "vertical_machining_center",
    id: "MAKINO_IQ500",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column_graphite",
      chain: ["base", "table_fixed", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Makino",
    model: "U6",
    type: "wire_edm",
    id: "MAKINO_U6",
    kinematic_chain: {
      type: "wire_edm",
      structure: "XY_table_UV_head",
      chain: ["base", "table_XY", "upper_head_UV", "lower_guide"]
    },
  },
  {
    manufacturer: "Makino",
    model: "EDAF3",
    type: "sinker_edm",
    id: "MAKINO_EDAF3",
    kinematic_chain: {
      type: "sinker_edm",
      structure: "fixed_table_moving_head",
      chain: ["base", "table_fixed", "column_X", "saddle_Y", "head_Z", "optional_C"]
    },
  },
  {
    manufacturer: "Makino",
    model: "T1",
    type: "horizontal_machining_center",
    id: "MAKINO_T1",
    kinematic_chain: {
      type: "table_table",
      structure: "horizontal_AB_trunnion",
      chain: ["base", "column_Z", "saddle_Y", "spindle_X", "table_base", "a_trunnion", "b_table"]
    },
  },

  // -- Mazak (11 machines) ───────────────────────────────────────────────────────
  {
    manufacturer: "Mazak",
    model: "INTEGREX i-200S",
    type: "mill_turn_center",
    id: "MAZAK_INTEGREX_I_200S",
    kinematic_chain: {
      type: "mill_turn_dual_spindle",
      structure: "integrex_B_axis_milling",
      chain: ["bed", "main_headstock_C1", "cross_slide_X", "y_slide_Y", "milling_carriage_Z", "b_axis_head_B", "milling_spindle", "lower_turret", "sub_headstock_C2_W2"],
      moving_masses: {
        x_assembly: {
          mass: 1200,
          cog: [0, 0, 200]
        },
        y_assembly: {
          mass: 800,
          cog: [0, 0, 150]
        },
        z_assembly: {
          mass: 1500,
          cog: [0, 0, 300]
        },
        b_head: {
          mass: 350,
          cog: [0, 100, 0]
        },
        sub_spindle: {
          mass: 900,
          cog: [0, 0, 100]
        }
      }
    },
  },
  {
    manufacturer: "Mazak",
    model: "INTEGREX i-400S",
    type: "mill_turn_center",
    id: "MAZAK_INTEGREX_I_400S",
    kinematic_chain: {
      type: "mill_turn_dual_spindle",
      structure: "integrex_large_format",
      chain: ["bed", "main_headstock_C1", "cross_slide_X", "y_slide_Y", "milling_carriage_Z", "b_axis_head_B", "sub_headstock_C2_W2"]
    },
  },
  {
    manufacturer: "Mazak",
    model: "VARIAXIS i-700",
    type: "vertical_machining_center",
    id: "MAZAK_VARIAXIS_I_700",
    kinematic_chain: {
      type: "table_table",
      structure: "variaxis_AC_trunnion",
      chain: ["base", "column", "y_saddle", "z_ram", "spindle", "x_table_base", "a_trunnion", "c_table"],
      dh_parameters: {
        y: { a: 0, alpha: 0, d: "variable", theta: 0, type: "P" },
        z: { a: 0, alpha: 90, d: "variable", theta: 0, type: "P" },
        x: { a: 0, alpha: 0, d: "variable", theta: 0, type: "P" },
        a: { a: 0, alpha: 0, d: 250, theta: "variable", type: "R" },
        c: { a: 0, alpha: 0, d: 0, theta: "variable", type: "R" }
      },
      moving_masses: {
        y_saddle: {
          mass: 1800,
          cog: [0, 200, 500]
        },
        z_ram: {
          mass: 1200,
          cog: [0, 0, 330]
        },
        x_table: {
          mass: 2500,
          cog: [0, 0, 150]
        },
        a_trunnion: {
          mass: 800,
          cog: [0, 0, 125]
        },
        c_table: {
          mass: 400,
          cog: [0, 0, 50]
        }
      }
    },
  },
  {
    manufacturer: "Mazak",
    model: "VARIAXIS i-500",
    type: "vertical_machining_center",
    id: "MAZAK_VARIAXIS_I_500",
    kinematic_chain: {
      type: "table_table",
      structure: "variaxis_AC_trunnion",
      chain: ["base", "column", "y_saddle", "z_ram", "spindle", "x_table_base", "a_trunnion", "c_table"]
    },
  },
  {
    manufacturer: "Mazak",
    model: "VCN-530C",
    type: "vertical_machining_center",
    id: "MAZAK_VCN_530C",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column",
      chain: ["base", "table_fixed", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Mazak",
    model: "HCN-5000",
    type: "horizontal_machining_center",
    id: "MAZAK_HCN_5000",
    kinematic_chain: {
      type: "T_configuration",
      structure: "traveling_column_HMC",
      chain: ["base", "pallet_B", "column_Z", "saddle_Y", "spindle_X"]
    },
  },
  {
    manufacturer: "Mazak",
    model: "QT-NEXUS 250-II MY",
    type: "turning_center",
    id: "MAZAK_QTN_250MY",
    kinematic_chain: {
      type: "lathe_Y_axis",
      structure: "slant_bed_with_Y",
      chain: ["bed", "headstock_spindle_C", "cross_slide_X", "y_slide_Y", "turret_Z"]
    },
  },
  {
    manufacturer: "Mazak",
    model: "QUICK TURN NEXUS 350M",
    type: "turning_center",
    id: "MAZAK_QTN_350M",
    kinematic_chain: {
      type: "lathe_standard",
      structure: "slant_bed_mill_turn",
      chain: ["bed", "headstock_spindle_C", "cross_slide_X", "turret_Z"]
    },
  },
  {
    manufacturer: "Mazak",
    model: "VCE-500",
    type: "vertical_machining_center",
    id: "MAZAK_VCE_500",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "fixed_column",
      chain: ["base", "column", "table_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Mazak",
    model: "CV5-500",
    type: "vertical_machining_center",
    id: "MAZAK_CV5_500",
    kinematic_chain: {
      type: "table_table",
      structure: "compact_AC_trunnion",
      chain: ["base", "column", "y_saddle", "z_ram", "spindle", "table_X", "a_trunnion", "c_table"]
    },
  },
  {
    manufacturer: "Mazak",
    model: "FJV-250",
    type: "double_column_machining_center",
    id: "MAZAK_FJV_250",
    kinematic_chain: {
      type: "bridge_type",
      structure: "fixed_table_moving_bridge",
      chain: ["base", "table_fixed", "bridge_X", "crossrail", "saddle_Y", "ram_Z"]
    },
  },

  // -- Okuma (11 machines) ───────────────────────────────────────────────────────
  {
    manufacturer: "Okuma",
    model: "MU-5000V",
    type: "vertical_machining_center",
    id: "OKUMA_MU_5000V",
    kinematic_chain: {
      type: "table_table",
      structure: "okuma_MU_AC_trunnion",
      chain: ["base", "column", "saddle_Y", "spindle_head_Z", "spindle", "table_X", "trunnion_A", "rotary_C"],
      moving_masses: {
        saddle_y: {
          mass: 800,
          cog: [0, 100, 300]
        },
        spindle_head_z: {
          mass: 600,
          cog: [0, 0, 230]
        },
        table_x: {
          mass: 1500,
          cog: [0, 0, 100]
        },
        trunnion_a: {
          mass: 500,
          cog: [0, 0, 100]
        },
        rotary_c: {
          mass: 250,
          cog: [0, 0, 50]
        }
      }
    },
  },
  {
    manufacturer: "Okuma",
    model: "MU-6300V",
    type: "vertical_machining_center",
    id: "OKUMA_MU_6300V",
    kinematic_chain: {
      type: "table_table",
      structure: "okuma_MU_AC_trunnion_large",
      chain: ["base", "column", "saddle_Y", "spindle_head_Z", "spindle", "table_X", "trunnion_A", "rotary_C"]
    },
  },
  {
    manufacturer: "Okuma",
    model: "GENOS M560-V",
    type: "vertical_machining_center",
    id: "OKUMA_GENOS_M560V",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "traveling_column",
      chain: ["base", "table_fixed", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Okuma",
    model: "MB-5000H",
    type: "horizontal_machining_center",
    id: "OKUMA_MB_5000H",
    kinematic_chain: {
      type: "T_configuration",
      structure: "traveling_column_HMC",
      chain: ["base", "pallet_B", "column_Z", "saddle_Y", "spindle_X"]
    },
  },
  {
    manufacturer: "Okuma",
    model: "MULTUS B300II",
    type: "mill_turn_center",
    id: "OKUMA_MULTUS_B300II",
    kinematic_chain: {
      type: "mill_turn_dual_spindle",
      structure: "multus_B_axis",
      chain: ["bed", "main_spindle_C1", "cross_slide_X", "y_slide_Y", "upper_slide_Z", "b_head_B", "milling_spindle", "lower_turret", "sub_spindle_C2_W"]
    },
  },
  {
    manufacturer: "Okuma",
    model: "MULTUS U4000",
    type: "mill_turn_center",
    id: "OKUMA_MULTUS_U4000",
    kinematic_chain: {
      type: "mill_turn_single_spindle",
      structure: "multus_universal",
      chain: ["bed", "spindle_C", "cross_slide_X", "y_slide_Y", "z_slide_Z", "b_head_B", "milling_spindle"]
    },
  },
  {
    manufacturer: "Okuma",
    model: "LB3000 EX II MY",
    type: "turning_center",
    id: "OKUMA_LB3000_EXII_MY",
    kinematic_chain: {
      type: "lathe_Y_axis",
      structure: "slant_bed_with_Y",
      chain: ["bed", "headstock_spindle_C", "cross_slide_X", "y_slide_Y", "turret_Z"],
      bed_angle: 60
    },
  },
  {
    manufacturer: "Okuma",
    model: "LB4000 EX II",
    type: "turning_center",
    id: "OKUMA_LB4000_EXII",
    kinematic_chain: {
      type: "lathe_standard",
      structure: "slant_bed",
      chain: ["bed", "headstock_spindle_C", "cross_slide_X", "turret_Z"]
    },
  },
  {
    manufacturer: "Okuma",
    model: "GENOS L300-MY",
    type: "turning_center",
    id: "OKUMA_GENOS_L300MY",
    kinematic_chain: {
      type: "lathe_Y_axis",
      structure: "compact_slant_bed",
      chain: ["bed", "headstock_C", "cross_slide_X", "y_slide_Y", "turret_Z"]
    },
  },
  {
    manufacturer: "Okuma",
    model: "2SP-V760EX",
    type: "turning_center",
    id: "OKUMA_2SP_V760EX",
    kinematic_chain: {
      type: "twin_spindle_vtl",
      structure: "inverted_dual",
      chain: ["base", "left_spindle", "left_turret_X1_Z1", "right_spindle", "right_turret_X2_Z2"]
    },
  },
  {
    manufacturer: "Okuma",
    model: "MCR-A5CII",
    type: "double_column_machining_center",
    id: "OKUMA_MCR_A5CII",
    kinematic_chain: {
      type: "head_head",
      structure: "bridge_AC_head",
      chain: ["base", "table_fixed", "bridge_X", "crossrail_Y", "ram_Z", "fork_A", "spindle_C"]
    },
  },

  // -- Roku-Roku (8 machines) ───────────────────────────────────────────────────
  {
    manufacturer: "Roku-Roku",
    model: "GENOS M460-VE",
    type: "vertical_machining_center",
    id: "ROKU_GENOS_M460_VE",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column_linear_motor",
      chain: ["base_cast_iron", "column_X", "saddle_Y", "spindle_Z"],
      base_material: "Meehanite_cast_iron",
      stress_relief: "natural_aging",
      moving_mass_x: 280,
      moving_mass_y: 180,
      moving_mass_z: 120
    },
  },
  {
    manufacturer: "Roku-Roku",
    model: "GENOS M560-VE",
    type: "vertical_machining_center",
    id: "ROKU_GENOS_M560_VE",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column_linear_motor",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Roku-Roku",
    model: "MV-550",
    type: "vertical_machining_center",
    id: "ROKU_MV_550",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column_linear_motor",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Roku-Roku",
    model: "MV-850",
    type: "vertical_machining_center",
    id: "ROKU_MV_850",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Roku-Roku",
    model: "MU-500VA",
    type: "vertical_machining_center",
    id: "ROKU_MU_500VA",
    kinematic_chain: {
      type: "table_table",
      structure: "trunnion_on_fixed_column",
      chain: ["base", "column", "saddle_Y", "spindle_Z", "table_X", "trunnion_A", "rotary_C"],
      tcp_reference: "workpiece_center",
      rtcp_capable: true
    },
  },
  {
    manufacturer: "Roku-Roku",
    model: "DC-1612",
    type: "double_column_machining_center",
    id: "ROKU_DC_1612",
    kinematic_chain: {
      type: "bridge_type",
      structure: "fixed_table_moving_bridge",
      chain: ["base", "table_fixed", "column_left", "column_right", "crossrail_X", "saddle_Y", "ram_Z"]
    },
  },
  {
    manufacturer: "Roku-Roku",
    model: "G-300",
    type: "vertical_machining_center",
    id: "ROKU_G_300",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column_linear_motor",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Roku-Roku",
    model: "MA-500",
    type: "vertical_machining_center",
    id: "ROKU_MA_500",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column_with_pallet",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z", "pallet_changer"]
    },
  },

  // -- Soraluce (7 machines) ────────────────────────────────────────────────────
  {
    manufacturer: "Soraluce",
    model: "TA-35",
    type: "FLOOR_TYPE",
    id: "soraluce_ta_35",
    kinematic_chain: { type: "XYZWAC_HEAD", structure: "floor_type_moving_column" },
    collision_zones: {
      millingHead: {
        type: "composite",
        components: [
          { type: "cylinder", diameter: 320, length: 500 },
          {
            type: "box",
            dimensions: { x: 450, y: 550, z: 400 },
            offset: { z: 500 }
          }
        ]
      },
      column: {
        type: "box",
        dimensions: { x: 800, y: 1200, z: 3500 }
      }
    },
  },
  {
    manufacturer: "Soraluce",
    model: "TA-40",
    type: "FLOOR_TYPE",
    id: "soraluce_ta_40",
    kinematic_chain: {
      type: "FLOOR_TYPE",
      structure: "inferred",
      linear_axes: ["x", "y", "z", "w"],
      rotary_axes: {
        a: {
          range: { min: -120, max: 30 },
          maxSpeed: 6,
          clampTorque: 10000,
          pivotPoint: { z: -220 }
        },
        c: { continuous: true, maxSpeed: 10, clampTorque: 8000 }
      }
    },
  },
  {
    manufacturer: "Soraluce",
    model: "TA-A35",
    type: "FLOOR_TYPE",
    id: "soraluce_ta_a35",
    kinematic_chain: {
      type: "FLOOR_TYPE",
      structure: "inferred",
      linear_axes: ["x", "y", "z", "w"],
      rotary_axes: {
        a: {
          range: { min: -120, max: 30 },
          maxSpeed: 8,
          pivotPoint: { z: -200 }
        },
        c: { continuous: true, maxSpeed: 12 }
      }
    },
  },
  {
    manufacturer: "Soraluce",
    model: "FMW-14000",
    type: "BED_TYPE",
    id: "soraluce_fmw_14000",
    kinematic_chain: {
      type: "BED_TYPE",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          range: { min: -120, max: 30 },
          maxSpeed: 6,
          pivotPoint: { z: -200 }
        },
        c: { continuous: true, maxSpeed: 10 }
      }
    },
  },
  {
    manufacturer: "Soraluce",
    model: "FR-22000",
    type: "BED_TYPE",
    id: "soraluce_fr_22000",
    kinematic_chain: {
      type: "BED_TYPE",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          range: { min: -120, max: 30 },
          maxSpeed: 5
        },
        c: { continuous: true, maxSpeed: 8 },
        b: { type: "rotary_table", optional: true, tableDiameter: 3000, turningCapable: true }
      }
    },
  },
  {
    manufacturer: "Soraluce",
    model: "SP-18000",
    type: "GANTRY",
    id: "soraluce_sp_18000",
    kinematic_chain: { type: "XYZAC_FORK", structure: "gantry_moving_bridge" },
    collision_zones: {
      forkHead: {
        type: "composite",
        components: [
          { type: "cylinder", diameter: 450, length: 700 },
          {
            type: "box",
            dimensions: { x: 700, y: 300, z: 600 },
            offset: { z: 700 }
          }
        ]
      },
      bridge: {
        type: "box",
        dimensions: { x: 5500, y: 1200, z: 1500 }
      }
    },
  },
  {
    manufacturer: "Soraluce",
    model: "PMG-8000",
    type: "GANTRY",
    id: "soraluce_pmg_8000",
    kinematic_chain: {
      type: "GANTRY",
      structure: "inferred",
      linear_axes: ["x", "y", "z"],
      rotary_axes: {
        a: {
          range: { min: -110, max: 110 },
          maxSpeed: 12
        },
        c: { continuous: true, maxSpeed: 18 }
      }
    },
  },

  // -- Takumi (8 machines) ──────────────────────────────────────────────────────
  {
    manufacturer: "Takumi",
    model: "H10",
    type: "vertical_machining_center",
    id: "TAKUMI_H10",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column_linear",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"],
      moving_mass_x: 350,
      moving_mass_y: 200,
      moving_mass_z: 150
    },
  },
  {
    manufacturer: "Takumi",
    model: "H13",
    type: "vertical_machining_center",
    id: "TAKUMI_H13",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column_linear",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Takumi",
    model: "V11A",
    type: "vertical_machining_center",
    id: "TAKUMI_V11A",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Takumi",
    model: "V15",
    type: "vertical_machining_center",
    id: "TAKUMI_V15",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Takumi",
    model: "U600",
    type: "vertical_machining_center",
    id: "TAKUMI_U600",
    kinematic_chain: {
      type: "table_table",
      structure: "trunnion_on_fixed_column",
      chain: ["base", "column", "saddle_Y", "spindle_Z", "table_X", "trunnion_A", "rotary_C"],
      tcp_reference: "workpiece_center",
      rtcp_capable: true
    },
  },
  {
    manufacturer: "Takumi",
    model: "DP-1612",
    type: "double_column_machining_center",
    id: "TAKUMI_DP_1612",
    kinematic_chain: {
      type: "bridge_type",
      structure: "fixed_table_moving_bridge",
      chain: ["base", "table_fixed", "column_left", "column_right", "crossrail_X", "saddle_Y", "ram_Z"]
    },
  },
  {
    manufacturer: "Takumi",
    model: "S500",
    type: "vertical_machining_center",
    id: "TAKUMI_S500",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column",
      chain: ["base", "column_X", "saddle_Y", "spindle_Z"]
    },
  },
  {
    manufacturer: "Takumi",
    model: "UM-400",
    type: "vertical_machining_center",
    id: "TAKUMI_UM_400",
    kinematic_chain: {
      type: "serial_C_prime",
      structure: "moving_column_air_bearing",
      chain: ["base_granite", "column_X", "saddle_Y", "spindle_Z"],
      base_material: "granite",
      vibration_damping: "excellent"
    },
  },

  // -- brother (10 machines) ─────────────────────────────────────────────────────
  {
    manufacturer: "brother",
    model: "SPEEDIO S300X1",
    type: "DRILL_TAP",
    id: "brother_s300x1",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 150, y: 150, z: 300 },
        tableSurface: { x: 150, y: 150, z: 0 }
      },
      spindleToTable_mm: 300
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 120,
        length_mm: 260,
        offset: { x: 0, y: 0, z: -130 }
      },
      table: {
        type: "box",
        dimensions: { x: 450, y: 300, z: 50 },
        position: { x: 0, y: 0, z: -50 }
      }
    },
  },
  {
    manufacturer: "brother",
    model: "SPEEDIO S500X1",
    type: "DRILL_TAP",
    id: "brother_s500x1",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 250, y: 200, z: 305 },
        tableSurface: { x: 250, y: 200, z: 0 }
      },
      spindleToTable_mm: 305
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 120,
        length_mm: 260,
        offset: { x: 0, y: 0, z: -130 }
      },
      table: {
        type: "box",
        dimensions: { x: 650, y: 400, z: 55 },
        position: { x: 0, y: 0, z: -55 }
      }
    },
  },
  {
    manufacturer: "brother",
    model: "SPEEDIO S500Z1",
    type: "DRILL_TAP",
    id: "brother_s500z1",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 250, y: 200, z: 305 },
        tableSurface: { x: 250, y: 200, z: 0 }
      },
      spindleToTable_mm: 305
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 130,
        length_mm: 280,
        offset: { x: 0, y: 0, z: -140 }
      },
      table: {
        type: "box",
        dimensions: { x: 650, y: 400, z: 55 },
        position: { x: 0, y: 0, z: -55 }
      }
    },
  },
  {
    manufacturer: "brother",
    model: "SPEEDIO S700X1",
    type: "DRILL_TAP",
    id: "brother_s700x1",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 350, y: 200, z: 330 },
        tableSurface: { x: 350, y: 200, z: 0 }
      },
      spindleToTable_mm: 330
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 130,
        length_mm: 280,
        offset: { x: 0, y: 0, z: -140 }
      },
      table: {
        type: "box",
        dimensions: { x: 850, y: 400, z: 60 },
        position: { x: 0, y: 0, z: -60 }
      }
    },
  },
  {
    manufacturer: "brother",
    model: "SPEEDIO S1000X1",
    type: "DRILL_TAP",
    id: "brother_s1000x1",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 500, y: 250, z: 350 },
        tableSurface: { x: 500, y: 250, z: 0 }
      },
      spindleToTable_mm: 350
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 160,
        length_mm: 320,
        offset: { x: 0, y: 0, z: -160 }
      },
      table: {
        type: "box",
        dimensions: { x: 1200, y: 500, z: 65 },
        position: { x: 0, y: 0, z: -65 }
      }
    },
  },
  {
    manufacturer: "brother",
    model: "SPEEDIO M140X1",
    type: "VMC",
    id: "brother_m140x1",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 280, y: 200, z: 305 },
        tableSurface: { x: 280, y: 200, z: 0 }
      },
      spindleToTable_mm: 305
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 170,
        length_mm: 340,
        offset: { x: 0, y: 0, z: -170 }
      },
      table: {
        type: "box",
        dimensions: { x: 710, y: 400, z: 60 },
        position: { x: 0, y: 0, z: -60 }
      }
    },
  },
  {
    manufacturer: "brother",
    model: "SPEEDIO M200X3",
    type: "VMC",
    id: "brother_m200x3",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 350, y: 225, z: 350 },
        tableSurface: { x: 350, y: 225, z: 0 }
      },
      spindleToTable_mm: 350
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 360,
        offset: { x: 0, y: 0, z: -180 }
      },
      table: {
        type: "box",
        dimensions: { x: 850, y: 450, z: 65 },
        position: { x: 0, y: 0, z: -65 }
      }
    },
  },
  {
    manufacturer: "brother",
    model: "SPEEDIO R450X1",
    type: "5AXIS",
    id: "brother_r450x1",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -30,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 225, y: 200, z: 100 },
          pivotToTable_mm: 70,
          torque_Nm: 150
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 80
        }
      },
      referencePoints: {
        spindleGageLine: { x: 225, y: 200, z: 305 },
        tableSurface: { x: 225, y: 200, z: 100 },
        aPivotPoint: { x: 225, y: 200, z: 100 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 120,
        length_mm: 260,
        offset: { x: 0, y: 0, z: -130 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 140,
        length_mm: 80,
        position: { x: -175, y: 200, z: 100 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 140,
        length_mm: 80,
        position: { x: 175, y: 200, z: 100 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 200,
        height_mm: 50,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "brother",
    model: "SPEEDIO R650X1",
    type: "5AXIS",
    id: "brother_r650x1",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -30,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 325, y: 225, z: 120 },
          torque_Nm: 200
        },
        c: { type: "rotary", continuous: true, torque_Nm: 120 }
      },
      referencePoints: {
        spindleGageLine: { x: 325, y: 225, z: 330 },
        tableSurface: { x: 325, y: 225, z: 120 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 130,
        length_mm: 280,
        offset: { x: 0, y: 0, z: -140 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 300,
        height_mm: 60,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "brother",
    model: "SPEEDIO W1000Xd1",
    type: "VMC",
    id: "brother_w1000xd1",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 500, y: 255, z: 350 },
        tableSurface: { x: 500, y: 255, z: 0 }
      },
      spindleToTable_mm: 350
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 360,
        offset: { x: 0, y: 0, z: -180 }
      },
      table: {
        type: "box",
        dimensions: { x: 1200, y: 510, z: 70 },
        position: { x: 0, y: 0, z: -70 }
      }
    },
  },

  // -- chiron (3 machines) ──────────────────────────────────────────────────────
  {
    manufacturer: "chiron",
    model: "FZ 08 S",
    type: "VMC",
    id: "chiron_fz08s",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"]
    },
  },
  {
    manufacturer: "chiron",
    model: "FZ 12 S",
    type: "VMC",
    id: "chiron_fz12s",
    kinematic_chain: {
      type: "VMC",
      structure: "inferred",
      linear_axes: ["x", "y", "z"]
    },
  },
  {
    manufacturer: "chiron",
    model: "MILL 800",
    type: "5AXIS",
    id: "chiron_mill800",
    kinematic_chain: { type: "TRUNNION_TABLE_TABLE", fiveAxisType: "table-table", tcpcSupported: true },
  },

  // -- doosan (14 machines) ──────────────────────────────────────────────────────
  {
    manufacturer: "doosan",
    model: "DNM 4500",
    type: "VMC",
    id: "doosan_dnm4500",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 400, y: 225, z: 510 },
        tableSurface: { x: 400, y: 225, z: 0 }
      },
      spindleToTable_mm: 510
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 360,
        offset: { x: 0, y: 0, z: -180 }
      },
      table: {
        type: "box",
        dimensions: { x: 1000, y: 450, z: 70 },
        position: { x: 0, y: 0, z: -70 }
      },
      column: {
        type: "box",
        dimensions: { x: 500, y: 500, z: 2200 },
        position: { x: 400, y: 600, z: 0 }
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "DNM 5700",
    type: "VMC",
    id: "doosan_dnm5700",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 525, y: 285, z: 510 },
        tableSurface: { x: 525, y: 285, z: 0 }
      },
      spindleToTable_mm: 510
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 360,
        offset: { x: 0, y: 0, z: -180 }
      },
      table: {
        type: "box",
        dimensions: { x: 1300, y: 570, z: 75 },
        position: { x: 0, y: 0, z: -75 }
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "DNM 6700",
    type: "VMC",
    id: "doosan_dnm6700",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 650, y: 335, z: 625 },
        tableSurface: { x: 650, y: 335, z: 0 }
      },
      spindleToTable_mm: 625
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 420,
        offset: { x: 0, y: 0, z: -210 }
      },
      table: {
        type: "box",
        dimensions: { x: 1500, y: 670, z: 85 },
        position: { x: 0, y: 0, z: -85 }
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "DVF 5000",
    type: "5AXIS",
    id: "doosan_dvf5000",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 312, y: 275, z: 170 },
          pivotToTable_mm: 120,
          torque_Nm: 550,
          clampTorque_Nm: 1300
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 380,
          clampTorque_Nm: 850
        }
      },
      referencePoints: {
        spindleGageLine: { x: 312, y: 275, z: 480 },
        tableSurface: { x: 312, y: 275, z: 170 },
        aPivotPoint: { x: 312, y: 275, z: 170 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 190,
        length_mm: 400,
        offset: { x: 0, y: 0, z: -200 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 280,
        length_mm: 180,
        position: { x: -350, y: 275, z: 170 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 280,
        length_mm: 180,
        position: { x: 350, y: 275, z: 170 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 500,
        height_mm: 100,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "DVF 6500",
    type: "5AXIS",
    id: "doosan_dvf6500",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 425, y: 350, z: 200 },
          torque_Nm: 750
        },
        c: { type: "rotary", continuous: true, torque_Nm: 520 }
      },
      referencePoints: {
        spindleGageLine: { x: 425, y: 350, z: 550 },
        tableSurface: { x: 425, y: 350, z: 200 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 200,
        length_mm: 440,
        offset: { x: 0, y: 0, z: -220 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 650,
        height_mm: 120,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "NHP 5000",
    type: "HMC",
    id: "doosan_nhp5000",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: { type: "indexing", continuous: true, indexIncrement_deg: 0.001, torque_Nm: 1400 }
      }
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 250, length_mm: 480, orientation: "horizontal" },
      rotaryTable: {
        type: "box",
        dimensions: { x: 500, y: 280, z: 500 },
        rotatesWith: ["b"]
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "NHP 6300",
    type: "HMC",
    id: "doosan_nhp6300",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: { type: "indexing", continuous: true, torque_Nm: 2000 }
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "PUMA 2600",
    type: "LATHE",
    id: "doosan_puma2600",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"],
      referencePoints: {
        spindleCenterline: { x: 0, z: 0 },
        turretCenter: { x: 265, z: 325 }
      }
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 254,
        length_mm: 110,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 400,
        height_mm: 180,
        position: { x: 265, z: 325 }
      },
      tailstock: {
        type: "cylinder",
        diameter_mm: 100,
        length_mm: 350,
        position: { x: 0, z: 650 }
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "PUMA 3100",
    type: "LATHE",
    id: "doosan_puma3100",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"]
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 305,
        length_mm: 130,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 450,
        height_mm: 200,
        position: { x: 315, z: 425 }
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "PUMA 2600SY",
    type: "LATHE",
    id: "doosan_puma2600sy",
    kinematic_chain: {
      type: "LATHE_4AXIS_SY",
      chain: ["MAIN_SPINDLE", "C", "PART", "Z", "X", "Y", "TURRET", "TOOL"],
      hasSubSpindle: true,
      yAxisCapability: "milling",
      rotaryAxes: {
        c: { type: "rotary", isMainSpindle: true, contouringCapable: true }
      }
    },
    collision_zones: {
      mainChuck: {
        type: "cylinder",
        diameter_mm: 254,
        length_mm: 110,
        position: { x: 0, y: 0, z: 0 }
      },
      subChuck: {
        type: "cylinder",
        diameter_mm: 165,
        length_mm: 90,
        position: { x: 0, y: 0, z: 650 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 400,
        height_mm: 200,
        position: { x: 265, y: 0, z: 325 }
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "LYNX 2100",
    type: "LATHE",
    id: "doosan_lynx2100",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"]
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 165,
        length_mm: 85,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 320,
        height_mm: 140,
        position: { x: 200, z: 160 }
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "LYNX 2600",
    type: "LATHE",
    id: "doosan_lynx2600",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"]
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 210,
        length_mm: 100,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 360,
        height_mm: 160,
        position: { x: 260, z: 255 }
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "SMX 2600S",
    type: "MILL_TURN",
    id: "doosan_smx2600s",
    kinematic_chain: {
      type: "MILL_TURN_5AXIS",
      chain: ["MAIN_SPINDLE", "C", "PART", "Z", "X", "Y", "B", "MILLING_SPINDLE"],
      rotaryAxes: {
        b: {
          type: "tilt",
          rotationVector: { i: 0, j: 1, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 120,
          onMillingHead: true,
          pivotPoint_mm: { x: 340, y: 0, z: 550 },
          torque_Nm: 200
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          isMainSpindle: true,
          contouringCapable: true
        }
      },
      referencePoints: {
        mainSpindleCenterline: { x: 0, y: 0, z: 0 },
        millingSpindleCenter: { x: 340, y: 0, z: 550 }
      },
      tcpcSupported: true,
      simultaneousMilling: true
    },
    collision_zones: {
      mainChuck: {
        type: "cylinder",
        diameter_mm: 305,
        length_mm: 130,
        position: { x: 0, y: 0, z: 0 }
      },
      millingHead: {
        type: "box",
        dimensions: { x: 320, y: 280, z: 520 },
        rotatesWith: ["b"]
      },
      tailstock: {
        type: "cylinder",
        diameter_mm: 120,
        length_mm: 400,
        position: { x: 0, y: 0, z: 1100 }
      }
    },
  },
  {
    manufacturer: "doosan",
    model: "SMX 3100S",
    type: "MILL_TURN",
    id: "doosan_smx3100s",
    kinematic_chain: {
      type: "MILL_TURN_5AXIS",
      chain: ["MAIN_SPINDLE", "C", "PART", "Z", "X", "Y", "B", "MILLING_SPINDLE"],
      tcpcSupported: true
    },
  },

  // -- fanuc (7 machines) ───────────────────────────────────────────────────────
  {
    manufacturer: "fanuc",
    model: "α-D14MiA5",
    type: "DRILL_TAP",
    id: "fanuc_robodrill_d14mia5",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 150, y: 150, z: 330 },
        tableSurface: { x: 150, y: 150, z: 0 }
      },
      spindleToTable_mm: 330
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 115,
        length_mm: 250,
        offset: { x: 0, y: 0, z: -125 }
      },
      table: {
        type: "box",
        dimensions: { x: 420, y: 300, z: 45 },
        position: { x: 0, y: 0, z: -45 }
      }
    },
  },
  {
    manufacturer: "fanuc",
    model: "α-D21MiA5",
    type: "DRILL_TAP",
    id: "fanuc_robodrill_d21mia5",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 250, y: 200, z: 330 },
        tableSurface: { x: 250, y: 200, z: 0 }
      },
      spindleToTable_mm: 330
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 115,
        length_mm: 250,
        offset: { x: 0, y: 0, z: -125 }
      },
      table: {
        type: "box",
        dimensions: { x: 650, y: 400, z: 50 },
        position: { x: 0, y: 0, z: -50 }
      }
    },
  },
  {
    manufacturer: "fanuc",
    model: "α-D21LiA5",
    type: "DRILL_TAP",
    id: "fanuc_robodrill_d21lia5",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 350, y: 200, z: 330 },
        tableSurface: { x: 350, y: 200, z: 0 }
      },
      spindleToTable_mm: 330
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 115,
        length_mm: 250,
        offset: { x: 0, y: 0, z: -125 }
      },
      table: {
        type: "box",
        dimensions: { x: 850, y: 400, z: 55 },
        position: { x: 0, y: 0, z: -55 }
      }
    },
  },
  {
    manufacturer: "fanuc",
    model: "α-D14MiB5 ADV",
    type: "DRILL_TAP",
    id: "fanuc_robodrill_d14mib5adv",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 150, y: 150, z: 330 },
        tableSurface: { x: 150, y: 150, z: 0 }
      },
      spindleToTable_mm: 330
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 125,
        length_mm: 270,
        offset: { x: 0, y: 0, z: -135 }
      },
      table: {
        type: "box",
        dimensions: { x: 420, y: 300, z: 50 },
        position: { x: 0, y: 0, z: -50 }
      }
    },
  },
  {
    manufacturer: "fanuc",
    model: "α-D21MiB5 ADV",
    type: "DRILL_TAP",
    id: "fanuc_robodrill_d21mib5adv",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 250, y: 200, z: 330 },
        tableSurface: { x: 250, y: 200, z: 0 }
      },
      spindleToTable_mm: 330
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 125,
        length_mm: 270,
        offset: { x: 0, y: 0, z: -135 }
      },
      table: {
        type: "box",
        dimensions: { x: 650, y: 400, z: 55 },
        position: { x: 0, y: 0, z: -55 }
      }
    },
  },
  {
    manufacturer: "fanuc",
    model: "α-D21MiA5 with DDR",
    type: "5AXIS",
    id: "fanuc_robodrill_d21mia5_ddr",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -30,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 250, y: 200, z: 100 },
          pivotToTable_mm: 60,
          torque_Nm: 100,
          clampTorque_Nm: 250
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          directDrive: true,
          torque_Nm: 60,
          clampTorque_Nm: 150
        }
      },
      referencePoints: {
        spindleGageLine: { x: 250, y: 200, z: 330 },
        tableSurface: { x: 250, y: 200, z: 100 },
        aPivotPoint: { x: 250, y: 200, z: 100 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 115,
        length_mm: 250,
        offset: { x: 0, y: 0, z: -125 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 100,
        length_mm: 60,
        position: { x: -160, y: 200, z: 100 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 100,
        length_mm: 60,
        position: { x: 160, y: 200, z: 100 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 200,
        height_mm: 45,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "fanuc",
    model: "α-D21LiA5 with DDR",
    type: "5AXIS",
    id: "fanuc_robodrill_d21lia5_ddr",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -30,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 350, y: 200, z: 110 },
          torque_Nm: 130
        },
        c: { type: "rotary", continuous: true, directDrive: true, torque_Nm: 80 }
      },
      referencePoints: {
        spindleGageLine: { x: 350, y: 200, z: 330 },
        tableSurface: { x: 350, y: 200, z: 110 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 115,
        length_mm: 250,
        offset: { x: 0, y: 0, z: -125 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 260,
        height_mm: 55,
        rotatesWith: ["a", "c"]
      }
    },
  },

  // -- grob (6 machines) ────────────────────────────────────────────────────────
  {
    manufacturer: "grob",
    model: "G150",
    type: "5AXIS",
    id: "grob_g150",
    kinematic_chain: {
      type: "GROB_UNIVERSAL",
      chain: ["SPINDLE", "Z", "X", "A", "B", "TABLE", "PART"],
      fiveAxisType: "head-table",
      configuration: "horizontal_spindle_trunnion",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -45,
          maxAngle_deg: 195,
          pivotPoint_mm: { x: 275, y: 275, z: 165 },
          onTable: true,
          torque_Nm: 500,
          clampTorque_Nm: 1200
        },
        b: {
          type: "rotary",
          rotationVector: { i: 0, j: 1, k: 0 },
          continuous: true,
          onTable: true,
          directDrive: true,
          torque_Nm: 350,
          clampTorque_Nm: 800
        }
      },
      referencePoints: {
        spindleGageLine: { x: 275, y: 275, z: 450 },
        tableSurface: { x: 275, y: 275, z: 165 },
        aPivotPoint: { x: 275, y: 275, z: 165 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 380,
        orientation: "horizontal",
        offset: { x: 0, y: 0, z: -190 }
      },
      trunnionFrame: {
        type: "box",
        dimensions: { x: 700, y: 400, z: 500 },
        position: { x: 275, y: 275, z: 0 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 440,
        height_mm: 90,
        rotatesWith: ["a", "b"]
      }
    },
  },
  {
    manufacturer: "grob",
    model: "G350",
    type: "5AXIS",
    id: "grob_g350",
    kinematic_chain: {
      type: "GROB_UNIVERSAL",
      chain: ["SPINDLE", "Z", "X", "A", "B", "TABLE", "PART"],
      fiveAxisType: "head-table",
      configuration: "horizontal_spindle_trunnion",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -45,
          maxAngle_deg: 195,
          pivotPoint_mm: { x: 400, y: 350, z: 220 },
          torque_Nm: 800,
          clampTorque_Nm: 1800
        },
        b: { type: "rotary", continuous: true, directDrive: true, torque_Nm: 550, clampTorque_Nm: 1300 }
      },
      referencePoints: {
        spindleGageLine: { x: 400, y: 350, z: 590 },
        tableSurface: { x: 400, y: 350, z: 220 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 420, orientation: "horizontal" },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 630,
        height_mm: 110,
        rotatesWith: ["a", "b"]
      }
    },
  },
  {
    manufacturer: "grob",
    model: "G550",
    type: "5AXIS",
    id: "grob_g550",
    kinematic_chain: {
      type: "GROB_UNIVERSAL",
      chain: ["SPINDLE", "Z", "X", "A", "B", "TABLE", "PART"],
      fiveAxisType: "head-table",
      configuration: "horizontal_spindle_trunnion",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -45,
          maxAngle_deg: 195,
          pivotPoint_mm: { x: 525, y: 450, z: 280 },
          torque_Nm: 1400,
          clampTorque_Nm: 3200
        },
        b: { type: "rotary", continuous: true, directDrive: true, torque_Nm: 950, clampTorque_Nm: 2200 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 250, length_mm: 500, orientation: "horizontal" },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 800,
        height_mm: 140,
        rotatesWith: ["a", "b"]
      }
    },
  },
  {
    manufacturer: "grob",
    model: "G750",
    type: "5AXIS",
    id: "grob_g750",
    kinematic_chain: {
      type: "GROB_UNIVERSAL",
      chain: ["SPINDLE", "Z", "X", "A", "B", "TABLE", "PART"],
      fiveAxisType: "head-table",
      configuration: "horizontal_spindle_trunnion",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -45,
          maxAngle_deg: 195,
          pivotPoint_mm: { x: 700, y: 600, z: 380 },
          torque_Nm: 2200
        },
        b: { type: "rotary", continuous: true, directDrive: true, torque_Nm: 1500 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 300, length_mm: 580, orientation: "horizontal" },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 1000,
        height_mm: 180,
        rotatesWith: ["a", "b"]
      }
    },
  },
  {
    manufacturer: "grob",
    model: "G350a",
    type: "5AXIS",
    id: "grob_g350a",
    kinematic_chain: {
      type: "GROB_MODULE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "B", "TABLE", "PART"],
      fiveAxisType: "head-table",
      configuration: "horizontal_automation",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 400, y: 350, z: 220 },
          torque_Nm: 800
        },
        b: { type: "rotary", continuous: true, directDrive: true, torque_Nm: 550 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 420, orientation: "horizontal" },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 500,
        height_mm: 120,
        rotatesWith: ["a", "b"]
      }
    },
  },
  {
    manufacturer: "grob",
    model: "G520F",
    type: "5AXIS",
    id: "grob_g520f",
    kinematic_chain: {
      type: "GROB_MODULE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "B", "TABLE", "PART"],
      fiveAxisType: "head-table",
      configuration: "horizontal_flexible",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 500, y: 425, z: 260 },
          torque_Nm: 1200
        },
        b: { type: "rotary", continuous: true, directDrive: true, torque_Nm: 850 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 240, length_mm: 480, orientation: "horizontal" },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 630,
        height_mm: 140,
        rotatesWith: ["a", "b"]
      }
    },
  },

  // -- hardinge (8 machines) ────────────────────────────────────────────────────
  {
    manufacturer: "hardinge",
    model: "Conquest T42",
    type: "LATHE",
    id: "hardinge_conquestt42",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"],
      referencePoints: {
        spindleCenterline: { x: 0, z: 0 },
        turretCenter: { x: 152, z: 152 }
      }
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 127,
        length_mm: 65,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 260,
        height_mm: 120,
        position: { x: 152, z: 152 }
      }
    },
  },
  {
    manufacturer: "hardinge",
    model: "Conquest T51",
    type: "LATHE",
    id: "hardinge_conquestt51",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"],
      referencePoints: {
        spindleCenterline: { x: 0, z: 0 },
        turretCenter: { x: 178, z: 190 }
      }
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 165,
        length_mm: 80,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 320,
        height_mm: 140,
        position: { x: 178, z: 190 }
      },
      tailstock: {
        type: "cylinder",
        diameter_mm: 80,
        length_mm: 280,
        position: { x: 0, z: 381 }
      }
    },
  },
  {
    manufacturer: "hardinge",
    model: "Conquest T65",
    type: "LATHE",
    id: "hardinge_conquestt65",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"]
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 203,
        length_mm: 95,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 380,
        height_mm: 160,
        position: { x: 203, z: 254 }
      }
    },
  },
  {
    manufacturer: "hardinge",
    model: "Elite T42 SMY",
    type: "LATHE",
    id: "hardinge_elitet42smy",
    kinematic_chain: {
      type: "LATHE_4AXIS_SY",
      chain: ["MAIN_SPINDLE", "C", "PART", "Z", "X", "Y", "TURRET", "TOOL"],
      hasSubSpindle: true,
      yAxisCapability: "milling",
      rotaryAxes: {
        c: { type: "rotary", isMainSpindle: true, contouringCapable: true }
      }
    },
    collision_zones: {
      mainChuck: {
        type: "cylinder",
        diameter_mm: 127,
        length_mm: 65,
        position: { x: 0, y: 0, z: 0 }
      },
      subChuck: {
        type: "cylinder",
        diameter_mm: 100,
        length_mm: 55,
        position: { x: 0, y: 0, z: 381 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 280,
        height_mm: 140,
        position: { x: 152, y: 0, z: 190 }
      }
    },
  },
  {
    manufacturer: "hardinge",
    model: "Elite T65 SMY",
    type: "LATHE",
    id: "hardinge_elitet65smy",
    kinematic_chain: {
      type: "LATHE_4AXIS_SY",
      chain: ["MAIN_SPINDLE", "C", "PART", "Z", "X", "Y", "TURRET", "TOOL"],
      hasSubSpindle: true,
      yAxisCapability: "milling",
      rotaryAxes: {
        c: { type: "rotary", isMainSpindle: true, contouringCapable: true }
      }
    },
    collision_zones: {
      mainChuck: {
        type: "cylinder",
        diameter_mm: 203,
        length_mm: 95,
        position: { x: 0, y: 0, z: 0 }
      },
      subChuck: {
        type: "cylinder",
        diameter_mm: 152,
        length_mm: 75,
        position: { x: 0, y: 0, z: 508 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 380,
        height_mm: 170,
        position: { x: 203, y: 0, z: 254 }
      }
    },
  },
  {
    manufacturer: "hardinge",
    model: "Super-Precision SP",
    type: "LATHE",
    id: "hardinge_superprecision_sp",
    kinematic_chain: {
      type: "LATHE_2AXIS_PRECISION",
      chain: ["SPINDLE", "COLLET", "PART", "Z", "X", "TURRET", "TOOL"],
      referencePoints: {
        spindleCenterline: { x: 0, z: 0 },
        turretCenter: { x: 127, z: 127 }
      },
      precision: "ultra"
    },
    collision_zones: {
      collet: {
        type: "cylinder",
        diameter_mm: 50,
        length_mm: 40,
        position: { x: 0, z: 0 }
      },
      gangTooling: {
        type: "box",
        dimensions: { x: 200, y: 80, z: 200 },
        position: { x: 100, z: 127 }
      }
    },
  },
  {
    manufacturer: "hardinge",
    model: "GS 150",
    type: "LATHE",
    id: "hardinge_gs150",
    kinematic_chain: {
      type: "SWISS_7AXIS",
      chain: ["GUIDE_BUSH", "MAIN_SPINDLE", "C1", "PART", "Z1", "X1", "Y1", "TOOLING"],
      swissType: true,
      guideBush: true,
      hasSubSpindle: true,
      synchronousTransfer: true,
      rotaryAxes: {
        c1: { type: "rotary", isMainSpindle: true, contouringCapable: true },
        c2: { type: "rotary", isSubSpindle: true, contouringCapable: true }
      }
    },
    collision_zones: {
      guideBush: {
        type: "cylinder",
        diameter_mm: 30,
        length_mm: 25,
        position: { x: 0, z: 0 }
      },
      mainGang: {
        type: "box",
        dimensions: { x: 120, y: 60, z: 150 },
        position: { x: 50, z: 100 }
      },
      subSpindle: {
        type: "cylinder",
        diameter_mm: 40,
        length_mm: 50,
        position: { x: 0, z: 205 }
      }
    },
  },
  {
    manufacturer: "hardinge",
    model: "GS 200",
    type: "LATHE",
    id: "hardinge_gs200",
    kinematic_chain: {
      type: "SWISS_7AXIS",
      swissType: true,
      guideBush: true,
      hasSubSpindle: true,
      synchronousTransfer: true
    },
  },

  // -- hurco (11 machines) ───────────────────────────────────────────────────────
  {
    manufacturer: "hurco",
    model: "VM10i",
    type: "VMC",
    id: "hurco_vm10i",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 330, y: 178, z: 356 },
        tableSurface: { x: 330, y: 178, z: 0 }
      },
      spindleToTable_mm: 356
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 150,
        length_mm: 320,
        offset: { x: 0, y: 0, z: -160 }
      },
      table: {
        type: "box",
        dimensions: { x: 813, y: 356, z: 60 },
        position: { x: 0, y: 0, z: -60 }
      }
    },
  },
  {
    manufacturer: "hurco",
    model: "VM20i",
    type: "VMC",
    id: "hurco_vm20i",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 508, y: 254, z: 508 },
        tableSurface: { x: 508, y: 254, z: 0 }
      },
      spindleToTable_mm: 508
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 170,
        length_mm: 350,
        offset: { x: 0, y: 0, z: -175 }
      },
      table: {
        type: "box",
        dimensions: { x: 1219, y: 508, z: 70 },
        position: { x: 0, y: 0, z: -70 }
      }
    },
  },
  {
    manufacturer: "hurco",
    model: "VM30i",
    type: "VMC",
    id: "hurco_vm30i",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 635, y: 305, z: 610 },
        tableSurface: { x: 635, y: 305, z: 0 }
      },
      spindleToTable_mm: 610
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 370,
        offset: { x: 0, y: 0, z: -185 }
      },
      table: {
        type: "box",
        dimensions: { x: 1524, y: 610, z: 80 },
        position: { x: 0, y: 0, z: -80 }
      }
    },
  },
  {
    manufacturer: "hurco",
    model: "VMX42i",
    type: "VMC",
    id: "hurco_vmx42i",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 533, y: 305, z: 610 },
        tableSurface: { x: 533, y: 305, z: 0 }
      },
      spindleToTable_mm: 610
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 370,
        offset: { x: 0, y: 0, z: -185 }
      },
      table: {
        type: "box",
        dimensions: { x: 1372, y: 610, z: 75 },
        position: { x: 0, y: 0, z: -75 }
      }
    },
  },
  {
    manufacturer: "hurco",
    model: "VMX50i",
    type: "VMC",
    id: "hurco_vmx50i",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 635, y: 330, z: 660 },
        tableSurface: { x: 635, y: 330, z: 0 }
      },
      spindleToTable_mm: 660
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 440,
        offset: { x: 0, y: 0, z: -220 }
      },
      table: {
        type: "box",
        dimensions: { x: 1524, y: 660, z: 85 },
        position: { x: 0, y: 0, z: -85 }
      }
    },
  },
  {
    manufacturer: "hurco",
    model: "VMX64i",
    type: "VMC",
    id: "hurco_vmx64i",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 813, y: 406, z: 762 },
        tableSurface: { x: 813, y: 406, z: 0 }
      },
      spindleToTable_mm: 762
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 250,
        length_mm: 480,
        offset: { x: 0, y: 0, z: -240 }
      },
      table: {
        type: "box",
        dimensions: { x: 1829, y: 813, z: 100 },
        position: { x: 0, y: 0, z: -100 }
      }
    },
  },
  {
    manufacturer: "hurco",
    model: "VMX30Ui",
    type: "5AXIS",
    id: "hurco_vmx30ui",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        b: {
          type: "tilt",
          rotationVector: { i: 0, j: 1, k: 0 },
          minAngle_deg: -15,
          maxAngle_deg: 110,
          pivotPoint_mm: { x: 381, y: 254, z: 180 },
          pivotToTable_mm: 130,
          torque_Nm: 450,
          clampTorque_Nm: 1100
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 300,
          clampTorque_Nm: 700
        }
      },
      referencePoints: {
        spindleGageLine: { x: 381, y: 254, z: 508 },
        tableSurface: { x: 381, y: 254, z: 180 },
        bPivotPoint: { x: 381, y: 254, z: 180 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 380,
        offset: { x: 0, y: 0, z: -190 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 240,
        length_mm: 150,
        position: { x: -300, y: 254, z: 180 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 240,
        length_mm: 150,
        position: { x: 300, y: 254, z: 180 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 381,
        height_mm: 85,
        rotatesWith: ["b", "c"]
      }
    },
  },
  {
    manufacturer: "hurco",
    model: "VMX42SRi",
    type: "5AXIS",
    id: "hurco_vmx42sri",
    kinematic_chain: {
      type: "SWIVEL_HEAD_ROTARY_TABLE",
      chain: ["SPINDLE", "A", "Z", "Y", "X", "C", "TABLE", "PART"],
      fiveAxisType: "head-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -110,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 533, y: 305, z: 350 },
          onSpindleHead: true,
          torque_Nm: 250
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          onTable: true,
          torque_Nm: 500
        }
      },
      referencePoints: {
        spindleGageLine: { x: 533, y: 305, z: 508 },
        tableSurface: { x: 533, y: 305, z: 0 },
        aPivotPoint: { x: 533, y: 305, z: 350 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "box",
        dimensions: { x: 300, y: 280, z: 500 },
        rotatesWith: ["a"]
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 610,
        height_mm: 100,
        rotatesWith: ["c"]
      }
    },
  },
  {
    manufacturer: "hurco",
    model: "TM8i",
    type: "LATHE",
    id: "hurco_tm8i",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"],
      referencePoints: {
        spindleCenterline: { x: 0, z: 0 },
        turretCenter: { x: 190, z: 190 }
      }
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 165,
        length_mm: 85,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 280,
        height_mm: 140,
        position: { x: 190, z: 190 }
      }
    },
  },
  {
    manufacturer: "hurco",
    model: "TM10i",
    type: "LATHE",
    id: "hurco_tm10i",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"]
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 210,
        length_mm: 100,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 350,
        height_mm: 160,
        position: { x: 220, z: 266 }
      }
    },
  },
  {
    manufacturer: "hurco",
    model: "TM12i",
    type: "LATHE",
    id: "hurco_tm12i",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"]
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 254,
        length_mm: 110,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 420,
        height_mm: 190,
        position: { x: 280, z: 381 }
      }
    },
  },

  // -- hyundai_wia (10 machines) ─────────────────────────────────────────────────
  {
    manufacturer: "hyundai_wia",
    model: "KF 4600",
    type: "VMC",
    id: "hyundai_kf4600",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 381, y: 205, z: 460 },
        tableSurface: { x: 381, y: 205, z: 0 }
      },
      spindleToTable_mm: 460
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 170,
        length_mm: 350,
        offset: { x: 0, y: 0, z: -175 }
      },
      table: {
        type: "box",
        dimensions: { x: 914, y: 410, z: 65 },
        position: { x: 0, y: 0, z: -65 }
      }
    },
  },
  {
    manufacturer: "hyundai_wia",
    model: "KF 5600",
    type: "VMC",
    id: "hyundai_kf5600",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 508, y: 255, z: 510 },
        tableSurface: { x: 508, y: 255, z: 0 }
      },
      spindleToTable_mm: 510
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 370,
        offset: { x: 0, y: 0, z: -185 }
      },
      table: {
        type: "box",
        dimensions: { x: 1200, y: 510, z: 70 },
        position: { x: 0, y: 0, z: -70 }
      }
    },
  },
  {
    manufacturer: "hyundai_wia",
    model: "KF 6700",
    type: "VMC",
    id: "hyundai_kf6700",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 635, y: 335, z: 610 },
        tableSurface: { x: 635, y: 335, z: 0 }
      },
      spindleToTable_mm: 610
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 430,
        offset: { x: 0, y: 0, z: -215 }
      },
      table: {
        type: "box",
        dimensions: { x: 1500, y: 670, z: 85 },
        position: { x: 0, y: 0, z: -85 }
      }
    },
  },
  {
    manufacturer: "hyundai_wia",
    model: "XF 6300",
    type: "5AXIS",
    id: "hyundai_xf6300",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 400, y: 325, z: 200 },
          torque_Nm: 700,
          clampTorque_Nm: 1600
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 450,
          clampTorque_Nm: 1000
        }
      },
      referencePoints: {
        spindleGageLine: { x: 400, y: 325, z: 550 },
        tableSurface: { x: 400, y: 325, z: 200 },
        aPivotPoint: { x: 400, y: 325, z: 200 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 190,
        length_mm: 400,
        offset: { x: 0, y: 0, z: -200 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 300,
        length_mm: 180,
        position: { x: -425, y: 325, z: 200 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 300,
        length_mm: 180,
        position: { x: 425, y: 325, z: 200 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 630,
        height_mm: 110,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "hyundai_wia",
    model: "HS 5000",
    type: "HMC",
    id: "hyundai_hs5000",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: {
          type: "indexing",
          continuous: true,
          indexIncrement_deg: 0.001,
          torque_Nm: 1500,
          clampTorque_Nm: 3200
        }
      }
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 420, orientation: "horizontal" },
      rotaryTable: {
        type: "box",
        dimensions: { x: 500, y: 280, z: 500 },
        rotatesWith: ["b"]
      }
    },
  },
  {
    manufacturer: "hyundai_wia",
    model: "HS 6300",
    type: "HMC",
    id: "hyundai_hs6300",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: { type: "indexing", continuous: true, torque_Nm: 2200 }
      }
    },
  },
  {
    manufacturer: "hyundai_wia",
    model: "SKT 200",
    type: "LATHE",
    id: "hyundai_skt200",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"],
      referencePoints: {
        spindleCenterline: { x: 0, z: 0 },
        turretCenter: { x: 200, z: 220 }
      }
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 210,
        length_mm: 100,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 360,
        height_mm: 160,
        position: { x: 200, z: 220 }
      },
      tailstock: {
        type: "cylinder",
        diameter_mm: 90,
        length_mm: 300,
        position: { x: 0, z: 440 }
      }
    },
  },
  {
    manufacturer: "hyundai_wia",
    model: "SKT 250",
    type: "LATHE",
    id: "hyundai_skt250",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"]
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 254,
        length_mm: 110,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 400,
        height_mm: 170,
        position: { x: 260, z: 302 }
      }
    },
  },
  {
    manufacturer: "hyundai_wia",
    model: "SKT 300",
    type: "LATHE",
    id: "hyundai_skt300",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"]
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 305,
        length_mm: 130,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 450,
        height_mm: 200,
        position: { x: 310, z: 415 }
      }
    },
  },
  {
    manufacturer: "hyundai_wia",
    model: "LM1800TTSY",
    type: "MILL_TURN",
    id: "hyundai_lm1800ttsy",
    kinematic_chain: {
      type: "MILL_TURN_TWIN_TURRET",
      chain: ["MAIN_SPINDLE", "C", "PART", "Z1", "X1", "Y1", "TURRET1", "TOOL1"],
      hasSubSpindle: true,
      hasTwinTurret: true,
      yAxisCapability: "milling",
      rotaryAxes: {
        c: { type: "rotary", isMainSpindle: true, contouringCapable: true, continuous: true }
      },
      referencePoints: {
        mainSpindleCenterline: { x: 0, y: 0, z: 0 },
        subSpindleCenterline: { x: 0, y: 0, z: 530 }
      },
      simultaneousMachining: true
    },
    collision_zones: {
      mainChuck: {
        type: "cylinder",
        diameter_mm: 210,
        length_mm: 100,
        position: { x: 0, y: 0, z: 0 }
      },
      subChuck: {
        type: "cylinder",
        diameter_mm: 165,
        length_mm: 85,
        position: { x: 0, y: 0, z: 530 }
      },
      turret1: {
        type: "cylinder",
        diameter_mm: 380,
        height_mm: 180,
        position: { x: 215, y: 0, z: 265 }
      },
      turret2: {
        type: "cylinder",
        diameter_mm: 320,
        height_mm: 150,
        position: { x: -200, y: 0, z: 265 }
      }
    },
  },

  // -- kern (5 machines) ────────────────────────────────────────────────────────
  {
    manufacturer: "kern",
    model: "Micro Evo",
    type: "5AXIS",
    id: "kern_microevo",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE_MICRO",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -30,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 150, y: 140, z: 85 },
          pivotToTable_mm: 50,
          torque_Nm: 100,
          clampTorque_Nm: 250,
          directDrive: true
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 50,
          clampTorque_Nm: 120,
          directDrive: true
        }
      },
      referencePoints: {
        spindleGageLine: { x: 150, y: 140, z: 250 },
        tableSurface: { x: 150, y: 140, z: 85 },
        aPivotPoint: { x: 150, y: 140, z: 85 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 90,
        length_mm: 180,
        offset: { x: 0, y: 0, z: -90 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 100,
        length_mm: 60,
        position: { x: -140, y: 140, z: 85 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 100,
        length_mm: 60,
        position: { x: 140, y: 140, z: 85 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 170,
        height_mm: 40,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "kern",
    model: "Micro Vario",
    type: "5AXIS",
    id: "kern_microvario",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE_MICRO",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -30,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 175, y: 150, z: 95 },
          torque_Nm: 150,
          directDrive: true
        },
        c: { type: "rotary", continuous: true, torque_Nm: 70, directDrive: true }
      },
      referencePoints: {
        spindleGageLine: { x: 175, y: 150, z: 280 },
        tableSurface: { x: 175, y: 150, z: 95 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 100,
        length_mm: 200,
        offset: { x: 0, y: 0, z: -100 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 200,
        height_mm: 45,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "kern",
    model: "Micro HD",
    type: "5AXIS",
    id: "kern_microhd",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE_MICRO",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -30,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 250, y: 215, z: 120 },
          torque_Nm: 250,
          directDrive: true
        },
        c: { type: "rotary", continuous: true, torque_Nm: 120, directDrive: true }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 120,
        length_mm: 240,
        offset: { x: 0, y: 0, z: -120 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 300,
        height_mm: 55,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "kern",
    model: "Pyramid Nano",
    type: "5AXIS",
    id: "kern_pyramidnano",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE_NANO",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -30,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 125, y: 110, z: 65 },
          pivotToTable_mm: 35,
          torque_Nm: 60,
          directDrive: true,
          airBearing: true
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 30,
          directDrive: true,
          airBearing: true
        }
      },
      referencePoints: {
        spindleGageLine: { x: 125, y: 110, z: 200 },
        tableSurface: { x: 125, y: 110, z: 65 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 70,
        length_mm: 140,
        offset: { x: 0, y: 0, z: -70 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 120,
        height_mm: 30,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "kern",
    model: "Pyramid Nano Twin",
    type: "5AXIS",
    id: "kern_pyramidnanotwin",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE_NANO_DUAL",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      dualSpindleConfig: { automatic_switching: true, switching_time_sec: 15 },
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -30,
          maxAngle_deg: 120,
          pivotPoint_mm: { x: 140, y: 125, z: 75 },
          airBearing: true
        },
        c: { type: "rotary", continuous: true, airBearing: true }
      },
      tcpcSupported: true
    },
  },

  // -- kitamura (8 machines) ────────────────────────────────────────────────────
  {
    manufacturer: "kitamura",
    model: "Mycenter HX300iG",
    type: "VMC",
    id: "kitamura_mycenter_hx300ig",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 255, y: 180, z: 360 },
        tableSurface: { x: 255, y: 180, z: 0 }
      },
      spindleToTable_mm: 360
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 130,
        length_mm: 280,
        offset: { x: 0, y: 0, z: -140 }
      },
      table: {
        type: "box",
        dimensions: { x: 700, y: 360, z: 55 },
        position: { x: 0, y: 0, z: -55 }
      }
    },
  },
  {
    manufacturer: "kitamura",
    model: "Mycenter HX400iG",
    type: "VMC",
    id: "kitamura_mycenter_hx400ig",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 380, y: 205, z: 460 },
        tableSurface: { x: 380, y: 205, z: 0 }
      },
      spindleToTable_mm: 460
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 170,
        length_mm: 350,
        offset: { x: 0, y: 0, z: -175 }
      },
      table: {
        type: "box",
        dimensions: { x: 900, y: 410, z: 65 },
        position: { x: 0, y: 0, z: -65 }
      }
    },
  },
  {
    manufacturer: "kitamura",
    model: "Mycenter HX500iG",
    type: "VMC",
    id: "kitamura_mycenter_hx500ig",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 510, y: 255, z: 510 },
        tableSurface: { x: 510, y: 255, z: 0 }
      },
      spindleToTable_mm: 510
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 380,
        offset: { x: 0, y: 0, z: -190 }
      },
      table: {
        type: "box",
        dimensions: { x: 1200, y: 510, z: 70 },
        position: { x: 0, y: 0, z: -70 }
      }
    },
  },
  {
    manufacturer: "kitamura",
    model: "Mytrunnion-4G",
    type: "5AXIS",
    id: "kitamura_mytrunnion_4g",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 275, y: 225, z: 150 },
          pivotToTable_mm: 100,
          torque_Nm: 400,
          clampTorque_Nm: 950
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          directDrive: true,
          torque_Nm: 250,
          clampTorque_Nm: 600
        }
      },
      referencePoints: {
        spindleGageLine: { x: 275, y: 225, z: 430 },
        tableSurface: { x: 275, y: 225, z: 150 },
        aPivotPoint: { x: 275, y: 225, z: 150 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 170,
        length_mm: 360,
        offset: { x: 0, y: 0, z: -180 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 120,
        position: { x: -275, y: 225, z: 150 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 120,
        position: { x: 275, y: 225, z: 150 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 400,
        height_mm: 75,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "kitamura",
    model: "Mytrunnion-5G",
    type: "5AXIS",
    id: "kitamura_mytrunnion_5g",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 350, y: 300, z: 180 },
          torque_Nm: 650,
          clampTorque_Nm: 1500
        },
        c: { type: "rotary", continuous: true, directDrive: true, torque_Nm: 380, clampTorque_Nm: 900 }
      },
      referencePoints: {
        spindleGageLine: { x: 350, y: 300, z: 510 },
        tableSurface: { x: 350, y: 300, z: 180 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 190,
        length_mm: 400,
        offset: { x: 0, y: 0, z: -200 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 500,
        height_mm: 95,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "kitamura",
    model: "Supercell-300G",
    type: "HMC",
    id: "kitamura_supercell_300g",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: {
          type: "indexing",
          continuous: true,
          directDrive: true,
          indexIncrement_deg: 0.0001,
          torque_Nm: 800,
          clampTorque_Nm: 2000
        }
      }
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 380, orientation: "horizontal" },
      rotaryTable: {
        type: "box",
        dimensions: { x: 300, y: 200, z: 300 },
        rotatesWith: ["b"]
      }
    },
  },
  {
    manufacturer: "kitamura",
    model: "Supercell-400G",
    type: "HMC",
    id: "kitamura_supercell_400g",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: { type: "indexing", continuous: true, directDrive: true, torque_Nm: 1200 }
      }
    },
  },
  {
    manufacturer: "kitamura",
    model: "Bridgecenter-8XG",
    type: "VMC",
    id: "kitamura_bridgecenter_8xg",
    kinematic_chain: {
      type: "VMC_3AXIS_BRIDGE",
      chain: ["SPINDLE", "Y", "Z", "X", "TABLE", "PART"],
      configuration: "bridge",
      referencePoints: {
        spindleGageLine: { x: 900, y: 410, z: 700 },
        tableSurface: { x: 900, y: 410, z: 0 }
      },
      spindleToTable_mm: 700
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 250,
        length_mm: 480,
        offset: { x: 0, y: 0, z: -240 }
      },
      table: {
        type: "box",
        dimensions: { x: 2000, y: 820, z: 100 },
        position: { x: 0, y: 0, z: -100 }
      },
      bridgeColumn: {
        type: "box",
        dimensions: { x: 400, y: 3000, z: 2500 },
        position: { x: 0, y: -1500, z: 0 }
      }
    },
  },

  // -- leadwell (7 machines) ────────────────────────────────────────────────────
  {
    manufacturer: "leadwell",
    model: "MCV-610AP",
    type: "VMC",
    id: "leadwell_mcv610ap",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 305, y: 205, z: 460 },
        tableSurface: { x: 305, y: 205, z: 0 }
      },
      spindleToTable_mm: 460
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 150,
        length_mm: 320,
        offset: { x: 0, y: 0, z: -160 }
      },
      table: {
        type: "box",
        dimensions: { x: 760, y: 410, z: 55 },
        position: { x: 0, y: 0, z: -55 }
      }
    },
  },
  {
    manufacturer: "leadwell",
    model: "MCV-1000B",
    type: "VMC",
    id: "leadwell_mcv1000b",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 510, y: 255, z: 510 },
        tableSurface: { x: 510, y: 255, z: 0 }
      },
      spindleToTable_mm: 510
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 170,
        length_mm: 360,
        offset: { x: 0, y: 0, z: -180 }
      },
      table: {
        type: "box",
        dimensions: { x: 1150, y: 510, z: 65 },
        position: { x: 0, y: 0, z: -65 }
      }
    },
  },
  {
    manufacturer: "leadwell",
    model: "MCV-1300D",
    type: "VMC",
    id: "leadwell_mcv1300d",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 650, y: 300, z: 600 },
        tableSurface: { x: 650, y: 300, z: 0 }
      },
      spindleToTable_mm: 600
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 200,
        length_mm: 400,
        offset: { x: 0, y: 0, z: -200 }
      },
      table: {
        type: "box",
        dimensions: { x: 1500, y: 600, z: 80 },
        position: { x: 0, y: 0, z: -80 }
      }
    },
  },
  {
    manufacturer: "leadwell",
    model: "V-30iT",
    type: "5AXIS",
    id: "leadwell_v30it",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 350, y: 260, z: 160 },
          pivotToTable_mm: 120,
          torque_Nm: 500,
          clampTorque_Nm: 1200
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 350,
          clampTorque_Nm: 800
        }
      },
      referencePoints: {
        spindleGageLine: { x: 350, y: 260, z: 480 },
        tableSurface: { x: 350, y: 260, z: 160 },
        aPivotPoint: { x: 350, y: 260, z: 160 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 165,
        length_mm: 350,
        offset: { x: 0, y: 0, z: -175 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 240,
        length_mm: 150,
        position: { x: -300, y: 260, z: 160 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 240,
        length_mm: 150,
        position: { x: 300, y: 260, z: 160 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 450,
        height_mm: 85,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "leadwell",
    model: "LTC-20B",
    type: "LATHE",
    id: "leadwell_ltc20b",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"],
      referencePoints: {
        spindleCenterline: { x: 0, z: 0 },
        turretCenter: { x: 200, z: 225 }
      }
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 203,
        length_mm: 90,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 320,
        height_mm: 140,
        position: { x: 200, z: 225 }
      },
      tailstock: {
        type: "cylinder",
        diameter_mm: 80,
        length_mm: 150,
        position: { x: 0, z: 450 }
      }
    },
  },
  {
    manufacturer: "leadwell",
    model: "LTC-35BLY",
    type: "LATHE",
    id: "leadwell_ltc35bly",
    kinematic_chain: {
      type: "LATHE_4AXIS_Y",
      chain: ["SPINDLE", "C", "PART", "Z", "X", "Y", "TURRET", "TOOL"],
      yAxisCapability: "milling",
      rotaryAxes: {
        c: { type: "rotary", isMainSpindle: true, contouringCapable: true }
      }
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 305,
        length_mm: 120,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 400,
        height_mm: 180,
        position: { x: 280, y: 0, z: 300 }
      }
    },
  },
  {
    manufacturer: "leadwell",
    model: "T-7SMY",
    type: "LATHE",
    id: "leadwell_t7smy",
    kinematic_chain: {
      type: "LATHE_4AXIS_SY",
      chain: ["MAIN_SPINDLE", "C", "PART", "Z", "X", "Y", "TURRET", "TOOL"],
      hasSubSpindle: true,
      yAxisCapability: "milling",
      rotaryAxes: {
        c: { type: "rotary", isMainSpindle: true, contouringCapable: true }
      }
    },
    collision_zones: {
      mainChuck: {
        type: "cylinder",
        diameter_mm: 254,
        length_mm: 110,
        position: { x: 0, y: 0, z: 0 }
      },
      subChuck: {
        type: "cylinder",
        diameter_mm: 165,
        length_mm: 85,
        position: { x: 0, y: 0, z: 550 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 380,
        height_mm: 170,
        position: { x: 220, y: 0, z: 275 }
      }
    },
  },

  // -- matsuura (7 machines) ────────────────────────────────────────────────────
  {
    manufacturer: "matsuura",
    model: "MAM72-25V",
    type: "5AXIS",
    id: "matsuura_mam72_25v",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 175, y: 175, z: 120 },
          pivotToTable_mm: 80,
          torque_Nm: 300,
          clampTorque_Nm: 700
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 180,
          clampTorque_Nm: 450
        }
      },
      referencePoints: {
        spindleGageLine: { x: 175, y: 175, z: 380 },
        tableSurface: { x: 175, y: 175, z: 120 },
        aPivotPoint: { x: 175, y: 175, z: 120 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 150,
        length_mm: 320,
        offset: { x: 0, y: 0, z: -160 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 250,
        height_mm: 65,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "matsuura",
    model: "MAM72-35V",
    type: "5AXIS",
    id: "matsuura_mam72_35v",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 250, y: 255, z: 160 },
          torque_Nm: 500
        },
        c: { type: "rotary", continuous: true, torque_Nm: 300 }
      },
      referencePoints: {
        spindleGageLine: { x: 250, y: 255, z: 480 },
        tableSurface: { x: 250, y: 255, z: 160 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 170,
        length_mm: 360,
        offset: { x: 0, y: 0, z: -180 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 350,
        height_mm: 85,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "matsuura",
    model: "MAM72-52V",
    type: "5AXIS",
    id: "matsuura_mam72_52v",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 350, y: 350, z: 210 },
          torque_Nm: 900
        },
        c: { type: "rotary", continuous: true, torque_Nm: 550 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 210,
        length_mm: 420,
        offset: { x: 0, y: 0, z: -210 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 520,
        height_mm: 110,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "matsuura",
    model: "MX-330",
    type: "5AXIS",
    id: "matsuura_mx330",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 275, y: 210, z: 130 },
          torque_Nm: 450
        },
        c: { type: "rotary", continuous: true, torque_Nm: 280 }
      },
      referencePoints: {
        spindleGageLine: { x: 275, y: 210, z: 360 },
        tableSurface: { x: 275, y: 210, z: 130 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 380,
        offset: { x: 0, y: 0, z: -190 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 330,
        height_mm: 80,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "matsuura",
    model: "MX-520",
    type: "5AXIS",
    id: "matsuura_mx520",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 315, y: 280, z: 180 },
          torque_Nm: 700
        },
        c: { type: "rotary", continuous: true, torque_Nm: 450 }
      },
      referencePoints: {
        spindleGageLine: { x: 315, y: 280, z: 510 },
        tableSurface: { x: 315, y: 280, z: 180 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 200,
        length_mm: 420,
        offset: { x: 0, y: 0, z: -210 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 520,
        height_mm: 100,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "matsuura",
    model: "V.Plus-800",
    type: "VMC",
    id: "matsuura_vplus800",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 400, y: 255, z: 510 },
        tableSurface: { x: 400, y: 255, z: 0 }
      },
      spindleToTable_mm: 510
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 370,
        offset: { x: 0, y: 0, z: -185 }
      },
      table: {
        type: "box",
        dimensions: { x: 1000, y: 510, z: 70 },
        position: { x: 0, y: 0, z: -70 }
      }
    },
  },
  {
    manufacturer: "matsuura",
    model: "H.Plus-405",
    type: "HMC",
    id: "matsuura_hplus405",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: { type: "indexing", continuous: true, indexIncrement_deg: 0.001, torque_Nm: 1200 }
      }
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 420, orientation: "horizontal" },
      rotaryTable: {
        type: "box",
        dimensions: { x: 400, y: 250, z: 400 },
        rotatesWith: ["b"]
      }
    },
  },

  // -- mhi (1 machines) ─────────────────────────────────────────────────────────
  {
    manufacturer: "mhi",
    model: "MVR-Ex35",
    type: "DOUBLE_COLUMN",
    id: "mhi_mvr_ex35",
    kinematic_chain: {
      type: "XYZBAC_HEAD",
      structure: "double_column_moving_crossrail",
      sequence: ["X", "Y", "Z", "W", "A", "C", "SPINDLE"]
    },
    collision_zones: {
      spindleHead: {
        type: "composite",
        components: [
          {
            type: "cylinder",
            diameter: 280,
            length: 450,
            offset: { x: 0, y: 0, z: 0 }
          },
          {
            type: "cylinder",
            diameter: 320,
            length: 80,
            offset: { x: 0, y: 0, z: 450 }
          }
        ]
      },
      ram: {
        type: "box",
        dimensions: { x: 450, y: 500, z: 1200 }
      },
      crossrail: {
        type: "box",
        dimensions: { x: 4200, y: 600, z: 800 }
      }
    },
  },

  // -- mikron (7 machines) ──────────────────────────────────────────────────────
  {
    manufacturer: "mikron",
    model: "MILL S 400 U",
    type: "5AXIS",
    id: "mikron_mills400u",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 200, y: 200, z: 130 },
          pivotToTable_mm: 80,
          torque_Nm: 280,
          clampTorque_Nm: 650,
          directDrive: true
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 180,
          clampTorque_Nm: 420,
          directDrive: true
        }
      },
      referencePoints: {
        spindleGageLine: { x: 200, y: 200, z: 400 },
        tableSurface: { x: 200, y: 200, z: 130 },
        aPivotPoint: { x: 200, y: 200, z: 130 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 150,
        length_mm: 320,
        offset: { x: 0, y: 0, z: -160 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 100,
        position: { x: -240, y: 200, z: 130 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 100,
        position: { x: 240, y: 200, z: 130 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 320,
        height_mm: 65,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "mikron",
    model: "MILL S 500 U",
    type: "5AXIS",
    id: "mikron_mills500u",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 250, y: 225, z: 150 },
          torque_Nm: 400,
          directDrive: true
        },
        c: { type: "rotary", continuous: true, torque_Nm: 250, directDrive: true }
      },
      referencePoints: {
        spindleGageLine: { x: 250, y: 225, z: 450 },
        tableSurface: { x: 250, y: 225, z: 150 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 170,
        length_mm: 360,
        offset: { x: 0, y: 0, z: -180 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 420,
        height_mm: 80,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "mikron",
    model: "MILL P 500 U",
    type: "5AXIS",
    id: "mikron_millp500u",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 250, y: 300, z: 160 },
          torque_Nm: 550,
          directDrive: true
        },
        c: { type: "rotary", continuous: true, torque_Nm: 350, directDrive: true }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 185,
        length_mm: 400,
        offset: { x: 0, y: 0, z: -200 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 500,
        height_mm: 95,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "mikron",
    model: "MILL P 800 U",
    type: "5AXIS",
    id: "mikron_millp800u",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 400, y: 425, z: 220 },
          torque_Nm: 850
        },
        c: { type: "rotary", continuous: true, torque_Nm: 600 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 460,
        offset: { x: 0, y: 0, z: -230 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 700,
        height_mm: 130,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "mikron",
    model: "HEM 500U",
    type: "5AXIS",
    id: "mikron_hem500u",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 250, y: 275, z: 155 },
          torque_Nm: 500,
          directDrive: true
        },
        c: { type: "rotary", continuous: true, torque_Nm: 320, directDrive: true }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 380,
        offset: { x: 0, y: 0, z: -190 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 450,
        height_mm: 85,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "mikron",
    model: "HSM 500",
    type: "VMC",
    id: "mikron_hsm500",
    kinematic_chain: {
      type: "VMC_3AXIS_HIGH_SPEED",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 250, y: 200, z: 400 },
        tableSurface: { x: 250, y: 200, z: 0 }
      },
      spindleToTable_mm: 400
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 140,
        length_mm: 300,
        offset: { x: 0, y: 0, z: -150 }
      },
      table: {
        type: "box",
        dimensions: { x: 700, y: 420, z: 55 },
        position: { x: 0, y: 0, z: -55 }
      }
    },
  },
  {
    manufacturer: "mikron",
    model: "HSM 600U",
    type: "5AXIS",
    id: "mikron_hsm600u",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -110,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 300, y: 250, z: 160 },
          torque_Nm: 380,
          directDrive: true
        },
        c: { type: "rotary", continuous: true, torque_Nm: 220, directDrive: true }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 140,
        length_mm: 300,
        offset: { x: 0, y: 0, z: -150 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 450,
        height_mm: 80,
        rotatesWith: ["a", "c"]
      }
    },
  },

  // -- okk (7 machines) ─────────────────────────────────────────────────────────
  {
    manufacturer: "okk",
    model: "VM43R",
    type: "VMC",
    id: "okk_vm43r",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 280, y: 205, z: 410 },
        tableSurface: { x: 280, y: 205, z: 0 }
      },
      spindleToTable_mm: 410
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 165,
        length_mm: 350,
        offset: { x: 0, y: 0, z: -175 }
      },
      table: {
        type: "box",
        dimensions: { x: 700, y: 410, z: 60 },
        position: { x: 0, y: 0, z: -60 }
      }
    },
  },
  {
    manufacturer: "okk",
    model: "VM53R",
    type: "VMC",
    id: "okk_vm53r",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 400, y: 255, z: 510 },
        tableSurface: { x: 400, y: 255, z: 0 }
      },
      spindleToTable_mm: 510
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 175,
        length_mm: 370,
        offset: { x: 0, y: 0, z: -185 }
      },
      table: {
        type: "box",
        dimensions: { x: 1000, y: 510, z: 70 },
        position: { x: 0, y: 0, z: -70 }
      }
    },
  },
  {
    manufacturer: "okk",
    model: "VM76R",
    type: "VMC",
    id: "okk_vm76r",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 635, y: 330, z: 660 },
        tableSurface: { x: 635, y: 330, z: 0 }
      },
      spindleToTable_mm: 660
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 450,
        offset: { x: 0, y: 0, z: -225 }
      },
      table: {
        type: "box",
        dimensions: { x: 1500, y: 660, z: 85 },
        position: { x: 0, y: 0, z: -85 }
      }
    },
  },
  {
    manufacturer: "okk",
    model: "HM500S",
    type: "HMC",
    id: "okk_hm500s",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: { type: "indexing", continuous: true, indexIncrement_deg: 0.001, torque_Nm: 1500 }
      }
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 420, orientation: "horizontal" },
      rotaryTable: {
        type: "box",
        dimensions: { x: 500, y: 300, z: 500 },
        rotatesWith: ["b"]
      }
    },
  },
  {
    manufacturer: "okk",
    model: "HM800S",
    type: "HMC",
    id: "okk_hm800s",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: { type: "indexing", continuous: true, torque_Nm: 3000 }
      }
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 260, length_mm: 500, orientation: "horizontal" },
      rotaryTable: {
        type: "box",
        dimensions: { x: 800, y: 400, z: 800 },
        rotatesWith: ["b"]
      }
    },
  },
  {
    manufacturer: "okk",
    model: "VP400",
    type: "5AXIS",
    id: "okk_vp400",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 280, y: 230, z: 140 },
          pivotToTable_mm: 100,
          torque_Nm: 400,
          directDrive: true
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 300,
          directDrive: true
        }
      },
      referencePoints: {
        spindleGageLine: { x: 280, y: 230, z: 410 },
        tableSurface: { x: 280, y: 230, z: 140 },
        aPivotPoint: { x: 280, y: 230, z: 140 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 160,
        length_mm: 340,
        offset: { x: 0, y: 0, z: -170 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 200,
        length_mm: 130,
        position: { x: -275, y: 230, z: 140 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 200,
        length_mm: 130,
        position: { x: 275, y: 230, z: 140 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 400,
        height_mm: 70,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "okk",
    model: "VP600",
    type: "5AXIS",
    id: "okk_vp600",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 425, y: 300, z: 190 },
          torque_Nm: 800,
          directDrive: true
        },
        c: { type: "rotary", continuous: true, torque_Nm: 550, directDrive: true }
      },
      referencePoints: {
        spindleGageLine: { x: 425, y: 300, z: 550 },
        tableSurface: { x: 425, y: 300, z: 190 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 380,
        offset: { x: 0, y: 0, z: -190 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 600,
        height_mm: 100,
        rotatesWith: ["a", "c"]
      }
    },
  },

  // -- sodick (5 machines) ──────────────────────────────────────────────────────
  {
    manufacturer: "sodick",
    model: "OPM250L",
    type: "HYBRID",
    id: "sodick_opm250l",
    kinematic_chain: {
      type: "HYBRID_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 125, y: 125, z: 250 },
        tableSurface: { x: 125, y: 125, z: 0 }
      },
      spindleToTable_mm: 250,
      linearMotorAxes: ["x", "y", "z"]
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 80,
        length_mm: 180,
        offset: { x: 0, y: 0, z: -90 }
      },
      laserHead: {
        type: "cylinder",
        diameter_mm: 60,
        length_mm: 120,
        position: { x: 50, y: 0, z: -60 }
      },
      table: {
        type: "box",
        dimensions: { x: 250, y: 250, z: 40 },
        position: { x: 0, y: 0, z: -40 }
      }
    },
  },
  {
    manufacturer: "sodick",
    model: "OPM350L",
    type: "HYBRID",
    id: "sodick_opm350l",
    kinematic_chain: {
      type: "HYBRID_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 175, y: 175, z: 350 },
        tableSurface: { x: 175, y: 175, z: 0 }
      },
      spindleToTable_mm: 350,
      linearMotorAxes: ["x", "y", "z"]
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 90,
        length_mm: 200,
        offset: { x: 0, y: 0, z: -100 }
      },
      laserHead: {
        type: "cylinder",
        diameter_mm: 70,
        length_mm: 140,
        position: { x: 60, y: 0, z: -70 }
      },
      table: {
        type: "box",
        dimensions: { x: 350, y: 350, z: 50 },
        position: { x: 0, y: 0, z: -50 }
      }
    },
  },
  {
    manufacturer: "sodick",
    model: "HS430L",
    type: "VMC",
    id: "sodick_hs430l",
    kinematic_chain: {
      type: "VMC_3AXIS_LINEAR",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 215, y: 175, z: 200 },
        tableSurface: { x: 215, y: 175, z: 0 }
      },
      spindleToTable_mm: 200,
      linearMotorAxes: ["x", "y", "z"],
      highSpeedFeatures: { acceleration_G: 1.5, jerk_mm_s3: 50000 }
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 120,
        length_mm: 280,
        offset: { x: 0, y: 0, z: -140 }
      },
      table: {
        type: "box",
        dimensions: { x: 550, y: 350, z: 50 },
        position: { x: 0, y: 0, z: -50 }
      }
    },
  },
  {
    manufacturer: "sodick",
    model: "HS650L",
    type: "VMC",
    id: "sodick_hs650l",
    kinematic_chain: {
      type: "VMC_3AXIS_LINEAR",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 325, y: 225, z: 350 },
        tableSurface: { x: 325, y: 225, z: 0 }
      },
      spindleToTable_mm: 350,
      linearMotorAxes: ["x", "y", "z"]
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 150,
        length_mm: 320,
        offset: { x: 0, y: 0, z: -160 }
      },
      table: {
        type: "box",
        dimensions: { x: 800, y: 450, z: 60 },
        position: { x: 0, y: 0, z: -60 }
      }
    },
  },
  {
    manufacturer: "sodick",
    model: "UH450L",
    type: "VMC",
    id: "sodick_uh450l",
    kinematic_chain: {
      type: "VMC_3AXIS_LINEAR_ULTRAHIGH",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 225, y: 175, z: 200 },
        tableSurface: { x: 225, y: 175, z: 0 }
      },
      spindleToTable_mm: 200,
      linearMotorAxes: ["x", "y", "z"],
      highSpeedFeatures: { acceleration_G: 2, jerk_mm_s3: 80000 }
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 85,
        length_mm: 200,
        offset: { x: 0, y: 0, z: -100 }
      },
      table: {
        type: "box",
        dimensions: { x: 550, y: 350, z: 45 },
        position: { x: 0, y: 0, z: -45 }
      }
    },
  },

  // -- spinner (7 machines) ─────────────────────────────────────────────────────
  {
    manufacturer: "spinner",
    model: "VC 560",
    type: "VMC",
    id: "spinner_vc560",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 280, y: 225, z: 400 },
        tableSurface: { x: 280, y: 225, z: 0 }
      },
      spindleToTable_mm: 400
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 160,
        length_mm: 340,
        offset: { x: 0, y: 0, z: -170 }
      },
      table: {
        type: "box",
        dimensions: { x: 710, y: 450, z: 60 },
        position: { x: 0, y: 0, z: -60 }
      }
    },
  },
  {
    manufacturer: "spinner",
    model: "VC 850",
    type: "VMC",
    id: "spinner_vc850",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 425, y: 300, z: 500 },
        tableSurface: { x: 425, y: 300, z: 0 }
      },
      spindleToTable_mm: 500
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 380,
        offset: { x: 0, y: 0, z: -190 }
      },
      table: {
        type: "box",
        dimensions: { x: 1000, y: 600, z: 70 },
        position: { x: 0, y: 0, z: -70 }
      }
    },
  },
  {
    manufacturer: "spinner",
    model: "VC 1200",
    type: "VMC",
    id: "spinner_vc1200",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 600, y: 350, z: 600 },
        tableSurface: { x: 600, y: 350, z: 0 }
      },
      spindleToTable_mm: 600
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 210,
        length_mm: 420,
        offset: { x: 0, y: 0, z: -210 }
      },
      table: {
        type: "box",
        dimensions: { x: 1400, y: 700, z: 85 },
        position: { x: 0, y: 0, z: -85 }
      }
    },
  },
  {
    manufacturer: "spinner",
    model: "U 620",
    type: "5AXIS",
    id: "spinner_u620",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 310, y: 260, z: 150 },
          pivotToTable_mm: 110,
          torque_Nm: 500,
          directDrive: true
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 350,
          directDrive: true
        }
      },
      referencePoints: {
        spindleGageLine: { x: 310, y: 260, z: 460 },
        tableSurface: { x: 310, y: 260, z: 150 },
        aPivotPoint: { x: 310, y: 260, z: 150 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 160,
        length_mm: 350,
        offset: { x: 0, y: 0, z: -175 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 140,
        position: { x: -310, y: 260, z: 150 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 140,
        position: { x: 310, y: 260, z: 150 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 450,
        height_mm: 80,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "spinner",
    model: "U 1520",
    type: "5AXIS",
    id: "spinner_u1520",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 760, y: 350, z: 250 },
          torque_Nm: 1500,
          directDrive: true
        },
        c: { type: "rotary", continuous: true, torque_Nm: 900, directDrive: true }
      },
      referencePoints: {
        spindleGageLine: { x: 760, y: 350, z: 700 },
        tableSurface: { x: 760, y: 350, z: 250 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 200,
        length_mm: 420,
        offset: { x: 0, y: 0, z: -210 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 800,
        height_mm: 130,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "spinner",
    model: "TTS 300",
    type: "LATHE",
    id: "spinner_tts300",
    kinematic_chain: {
      type: "LATHE_2AXIS",
      chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"],
      referencePoints: {
        spindleCenterline: { x: 0, z: 0 },
        turretCenter: { x: 175, z: 175 }
      }
    },
    collision_zones: {
      chuck: {
        type: "cylinder",
        diameter_mm: 165,
        length_mm: 80,
        position: { x: 0, z: 0 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 310,
        height_mm: 140,
        position: { x: 175, z: 175 }
      }
    },
  },
  {
    manufacturer: "spinner",
    model: "TC 600-65 SMCY",
    type: "LATHE",
    id: "spinner_tc600_65smcy",
    kinematic_chain: {
      type: "LATHE_4AXIS_SY",
      chain: ["MAIN_SPINDLE", "C", "PART", "Z", "X", "Y", "TURRET", "TOOL"],
      hasSubSpindle: true,
      yAxisCapability: "milling",
      rotaryAxes: {
        c: { type: "rotary", isMainSpindle: true, contouringCapable: true }
      }
    },
    collision_zones: {
      mainChuck: {
        type: "cylinder",
        diameter_mm: 210,
        length_mm: 100,
        position: { x: 0, y: 0, z: 0 }
      },
      subChuck: {
        type: "cylinder",
        diameter_mm: 165,
        length_mm: 80,
        position: { x: 0, y: 0, z: 600 }
      },
      turret: {
        type: "cylinder",
        diameter_mm: 380,
        height_mm: 170,
        position: { x: 230, y: 0, z: 300 }
      }
    },
  },

  // -- toyoda (7 machines) ──────────────────────────────────────────────────────
  {
    manufacturer: "toyoda",
    model: "FH400J",
    type: "HMC",
    id: "toyoda_fh400j",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: {
          type: "indexing",
          continuous: true,
          indexIncrement_deg: 0.001,
          torque_Nm: 1000,
          clampTorque_Nm: 2500
        }
      }
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 380, orientation: "horizontal" },
      rotaryTable: {
        type: "box",
        dimensions: { x: 400, y: 250, z: 400 },
        rotatesWith: ["b"]
      }
    },
  },
  {
    manufacturer: "toyoda",
    model: "FH550J",
    type: "HMC",
    id: "toyoda_fh550j",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: { type: "indexing", continuous: true, torque_Nm: 1800 }
      }
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 220, length_mm: 450, orientation: "horizontal" },
      rotaryTable: {
        type: "box",
        dimensions: { x: 550, y: 300, z: 550 },
        rotatesWith: ["b"]
      }
    },
  },
  {
    manufacturer: "toyoda",
    model: "FH800SXJ",
    type: "HMC",
    id: "toyoda_fh800sxj",
    kinematic_chain: {
      type: "HMC_4AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"],
      spindleOrientation: "horizontal",
      rotaryAxes: {
        b: { type: "indexing", continuous: true, torque_Nm: 3500 }
      }
    },
    collision_zones: {
      spindleHead: { type: "cylinder", diameter_mm: 280, length_mm: 520, orientation: "horizontal" },
      rotaryTable: {
        type: "box",
        dimensions: { x: 800, y: 400, z: 800 },
        rotatesWith: ["b"]
      }
    },
  },
  {
    manufacturer: "toyoda",
    model: "FV1265",
    type: "VMC",
    id: "toyoda_fv1265",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 635, y: 317, z: 560 },
        tableSurface: { x: 635, y: 317, z: 0 }
      },
      spindleToTable_mm: 560
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 180,
        length_mm: 360,
        offset: { x: 0, y: 0, z: -180 }
      },
      table: {
        type: "box",
        dimensions: { x: 1400, y: 635, z: 75 },
        position: { x: 0, y: 0, z: -75 }
      }
    },
  },
  {
    manufacturer: "toyoda",
    model: "FV1680",
    type: "VMC",
    id: "toyoda_fv1680",
    kinematic_chain: {
      type: "VMC_3AXIS",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 825, y: 400, z: 700 },
        tableSurface: { x: 825, y: 400, z: 0 }
      },
      spindleToTable_mm: 700
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 420,
        offset: { x: 0, y: 0, z: -210 }
      },
      table: {
        type: "box",
        dimensions: { x: 1800, y: 800, z: 90 },
        position: { x: 0, y: 0, z: -90 }
      }
    },
  },
  {
    manufacturer: "toyoda",
    model: "FA450V",
    type: "5AXIS",
    id: "toyoda_fa450v",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 340, y: 280, z: 180 },
          pivotToTable_mm: 130,
          torque_Nm: 650,
          clampTorque_Nm: 1500
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 420,
          clampTorque_Nm: 950
        }
      },
      referencePoints: {
        spindleGageLine: { x: 340, y: 280, z: 510 },
        tableSurface: { x: 340, y: 280, z: 180 },
        aPivotPoint: { x: 340, y: 280, z: 180 }
      },
      tcpcSupported: true,
      rtcpSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 190,
        length_mm: 400,
        offset: { x: 0, y: 0, z: -200 }
      },
      trunnionLeft: {
        type: "cylinder",
        diameter_mm: 260,
        length_mm: 170,
        position: { x: -340, y: 280, z: 180 }
      },
      trunnionRight: {
        type: "cylinder",
        diameter_mm: 260,
        length_mm: 170,
        position: { x: 340, y: 280, z: 180 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 450,
        height_mm: 95,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "toyoda",
    model: "FA630V",
    type: "5AXIS",
    id: "toyoda_fa630v",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -120,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 450, y: 375, z: 230 },
          torque_Nm: 1200
        },
        c: { type: "rotary", continuous: true, torque_Nm: 750 }
      },
      tcpcSupported: true
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 220,
        length_mm: 450,
        offset: { x: 0, y: 0, z: -225 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 630,
        height_mm: 120,
        rotatesWith: ["a", "c"]
      }
    },
  },

  // -- yasda (5 machines) ───────────────────────────────────────────────────────
  {
    manufacturer: "yasda",
    model: "YBM 640V3",
    type: "VMC",
    id: "yasda_ybm640v3",
    kinematic_chain: {
      type: "VMC_3AXIS_PRECISION",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 320, y: 225, z: 350 },
        tableSurface: { x: 320, y: 225, z: 0 }
      },
      spindleToTable_mm: 350,
      precisionFeatures: { temperatureControl: true, vibrationIsolation: true, linearScales: "glass" }
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 150,
        length_mm: 320,
        offset: { x: 0, y: 0, z: -160 }
      },
      table: {
        type: "box",
        dimensions: { x: 750, y: 450, z: 60 },
        position: { x: 0, y: 0, z: -60 }
      }
    },
  },
  {
    manufacturer: "yasda",
    model: "YBM 950V3",
    type: "VMC",
    id: "yasda_ybm950v3",
    kinematic_chain: {
      type: "VMC_3AXIS_PRECISION",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 475, y: 300, z: 450 },
        tableSurface: { x: 475, y: 300, z: 0 }
      },
      spindleToTable_mm: 450,
      precisionFeatures: { temperatureControl: true, vibrationIsolation: true, linearScales: "glass" }
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 170,
        length_mm: 360,
        offset: { x: 0, y: 0, z: -180 }
      },
      table: {
        type: "box",
        dimensions: { x: 1100, y: 600, z: 70 },
        position: { x: 0, y: 0, z: -70 }
      }
    },
  },
  {
    manufacturer: "yasda",
    model: "YMC 430",
    type: "5AXIS",
    id: "yasda_ymc430",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE_PRECISION",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          rotationVector: { i: 1, j: 0, k: 0 },
          minAngle_deg: -110,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 215, y: 175, z: 80 },
          pivotToTable_mm: 60,
          torque_Nm: 200,
          directDrive: true,
          encoderResolution_arcsec: 0.01
        },
        c: {
          type: "rotary",
          rotationVector: { i: 0, j: 0, k: 1 },
          continuous: true,
          torque_Nm: 120,
          directDrive: true,
          encoderResolution_arcsec: 0.01
        }
      },
      referencePoints: {
        spindleGageLine: { x: 215, y: 175, z: 250 },
        tableSurface: { x: 215, y: 175, z: 80 },
        aPivotPoint: { x: 215, y: 175, z: 80 }
      },
      tcpcSupported: true,
      rtcpSupported: true,
      precisionFeatures: { temperatureControl: true, vibrationIsolation: true }
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 120,
        length_mm: 280,
        offset: { x: 0, y: 0, z: -140 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 300,
        height_mm: 50,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "yasda",
    model: "YMC 650",
    type: "5AXIS",
    id: "yasda_ymc650",
    kinematic_chain: {
      type: "TRUNNION_TABLE_TABLE_PRECISION",
      chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"],
      fiveAxisType: "table-table",
      rotaryAxes: {
        a: {
          type: "tilt",
          minAngle_deg: -110,
          maxAngle_deg: 30,
          pivotPoint_mm: { x: 325, y: 250, z: 130 },
          torque_Nm: 450,
          directDrive: true
        },
        c: { type: "rotary", continuous: true, torque_Nm: 280, directDrive: true }
      },
      referencePoints: {
        spindleGageLine: { x: 325, y: 250, z: 400 },
        tableSurface: { x: 325, y: 250, z: 130 }
      },
      tcpcSupported: true,
      precisionFeatures: { temperatureControl: true, vibrationIsolation: true }
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 150,
        length_mm: 320,
        offset: { x: 0, y: 0, z: -160 }
      },
      rotaryTable: {
        type: "cylinder",
        diameter_mm: 500,
        height_mm: 80,
        rotatesWith: ["a", "c"]
      }
    },
  },
  {
    manufacturer: "yasda",
    model: "H40i",
    type: "VMC",
    id: "yasda_h40i",
    kinematic_chain: {
      type: "VMC_3AXIS_MICRO_PRECISION",
      chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
      referencePoints: {
        spindleGageLine: { x: 200, y: 150, z: 200 },
        tableSurface: { x: 200, y: 150, z: 0 }
      },
      spindleToTable_mm: 200,
      precisionFeatures: { temperatureControl: true, vibrationIsolation: true, linearScales: "laser", cleanroomReady: true }
    },
    collision_zones: {
      spindleHead: {
        type: "cylinder",
        diameter_mm: 85,
        length_mm: 180,
        offset: { x: 0, y: 0, z: -90 }
      },
      table: {
        type: "box",
        dimensions: { x: 500, y: 300, z: 40 },
        position: { x: 0, y: 0, z: -40 }
      }
    },
  },
];

// ============================================================================
// Helpers
// ============================================================================

/** Find a machine by ID */
export function findKinematicEntry(id: string): KinematicChainEntry | undefined {
  return MACHINE_KINEMATICS_CATALOG.find((m) => m.id === id);
}

/** Get all machines for a manufacturer */
export function getKinematicsByManufacturer(
  manufacturer: string,
): KinematicChainEntry[] {
  const mfr = manufacturer.toLowerCase();
  return MACHINE_KINEMATICS_CATALOG.filter((m) =>
    m.manufacturer.toLowerCase().includes(mfr),
  );
}

/** Get all machines with collision zone data */
export function getMachinesWithCollisionZones(): KinematicChainEntry[] {
  return MACHINE_KINEMATICS_CATALOG.filter(
    (m) => m.collision_zones !== undefined,
  );
}

/** Get all machines by kinematic chain type */
export function getKinematicsByChainType(
  chainType: string,
): KinematicChainEntry[] {
  return MACHINE_KINEMATICS_CATALOG.filter(
    (m) => m.kinematic_chain.type === chainType,
  );
}
