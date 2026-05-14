/**
 * Okuma Machines Catalog — MS3 U-LAT27-U-LAT31
 *
 * Machine kinematics and work envelope data derived from 37 STEP files
 * in H:/PRISM/resources/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION/OKUMA/
 *
 * Supplements machine-kinematics-catalog.ts with full Okuma lineup.
 *
 * @see OkumaMachineKinematicsIngesterEngine for runtime queries
 */

export interface OkumaMachineEntry {
  model: string;
  type: "vertical_machining_center" | "horizontal_machining_center" | "mill_turn_center" | "turning_center" | "double_column_machining_center" | "5axis_machining_center";
  series: "GENOS" | "MB" | "MA" | "MCR" | "MU" | "MILLAC" | "VTM" | "LB" | "MULTUS" | "2SP";
  step_file: string;
  step_file_size_mb: number;

  // Work envelope (estimated from model naming conventions + STEP geometry bounds)
  work_envelope_mm: {
    x_travel: number;
    y_travel: number;
    z_travel: number;
  };

  // Spindle configuration
  spindle: {
    type: "direct_drive" | "belt_driven" | "built_in" | "gear_head";
    max_rpm: number;
    power_kw: number;
    taper: "BT30" | "BT40" | "BT50" | "CAT40" | "CAT50" | "HSK63" | "HSK100" | "BBT30" | "BBT40" | "BBT50";
  };

  // Tool magazine
  tool_magazine: {
    capacity: number;
    type: "arm" | "matrix" | "chain" | "turret" | "ring";
  };

  // Controller
  controller: "OSP-P300" | "OSP-P200" | "OSP-P500" | "OSP-P300L" | "OSP-P300M" | "OSP-P300MA" | "OSP-P300S" | "OSP-P300SA";

  // Kinematic chain
  kinematic_chain: {
    structure: string;
    axis_config: string[];
    rotary_axes?: {
      [axis: string]: {
        range_min: number;
        range_max: number;
        speed_rpm: number;
      };
    };
  };

  // Simulation handle
  simulation_model_path: string;
}

export const OKUMA_MACHINES_FROM_STEP: OkumaMachineEntry[] = [
  // ============================================================================
  // GENOS Series — Entry-Level VMCs
  // ============================================================================
  {
    model: "GENOS M460-VE-e",
    type: "vertical_machining_center",
    series: "GENOS",
    step_file: "OKUMA GENOS M460-VE-e.step",
    step_file_size_mb: 3.77,
    work_envelope_mm: { x_travel: 762, y_travel: 460, z_travel: 460 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/GENOS_M460_VE_e",
  },
  {
    model: "GENOS M460V-5AX",
    type: "5axis_machining_center",
    series: "GENOS",
    step_file: "OKUMA GENOS M460V-5AX.step",
    step_file_size_mb: 4.04,
    work_envelope_mm: { x_travel: 762, y_travel: 460, z_travel: 460 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300MA",
    kinematic_chain: {
      structure: "C-frame_with_trunnion",
      axis_config: ["X", "Y", "Z", "A", "C"],
      rotary_axes: {
        A: { range_min: -120, range_max: 30, speed_rpm: 100 },
        C: { range_min: 0, range_max: 360, speed_rpm: 150 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/GENOS_M460V_5AX",
  },
  {
    model: "GENOS M560-V-e",
    type: "vertical_machining_center",
    series: "GENOS",
    step_file: "OKUMA GENOS M560-V-e.step",
    step_file_size_mb: 3.33,
    work_envelope_mm: { x_travel: 1050, y_travel: 560, z_travel: 460 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/GENOS_M560_V_e",
  },
  {
    model: "GENOS M560-VA-HC",
    type: "vertical_machining_center",
    series: "GENOS",
    step_file: "OKUMA GENOS M560-VA-HC.step",
    step_file_size_mb: 6.43,
    work_envelope_mm: { x_travel: 1050, y_travel: 560, z_travel: 510 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/GENOS_M560_VA_HC",
  },
  {
    model: "GENOS M660-VA",
    type: "vertical_machining_center",
    series: "GENOS",
    step_file: "OKUMA GENOS M660-VA.step",
    step_file_size_mb: 4.15,
    work_envelope_mm: { x_travel: 1300, y_travel: 660, z_travel: 510 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/GENOS_M660_VA",
  },
  {
    model: "GENOS M660-VB",
    type: "vertical_machining_center",
    series: "GENOS",
    step_file: "OKUMA GENOS M660-VB.step",
    step_file_size_mb: 4.12,
    work_envelope_mm: { x_travel: 1300, y_travel: 660, z_travel: 610 },
    spindle: { type: "direct_drive", max_rpm: 12000, power_kw: 30, taper: "BBT50" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/GENOS_M660_VB",
  },

  // ============================================================================
  // MA Series — Horizontal Machining Centers
  // ============================================================================
  {
    model: "MA-500HII",
    type: "horizontal_machining_center",
    series: "MA",
    step_file: "OKUMA MA-500HII.step",
    step_file_size_mb: 1.15,
    work_envelope_mm: { x_travel: 730, y_travel: 730, z_travel: 810 },
    spindle: { type: "built_in", max_rpm: 10000, power_kw: 22, taper: "BT50" },
    tool_magazine: { capacity: 60, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "horizontal_T", axis_config: ["X", "Y", "Z", "B"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MA_500HII",
  },
  {
    model: "MA-550VB",
    type: "vertical_machining_center",
    series: "MA",
    step_file: "OKUMA MA-550VB.step",
    step_file_size_mb: 1.41,
    work_envelope_mm: { x_travel: 1050, y_travel: 550, z_travel: 510 },
    spindle: { type: "direct_drive", max_rpm: 12000, power_kw: 22, taper: "BT50" },
    tool_magazine: { capacity: 48, type: "arm" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MA_550VB",
  },
  {
    model: "MA-600H",
    type: "horizontal_machining_center",
    series: "MA",
    step_file: "OKUMA MA-600H.step",
    step_file_size_mb: 1.37,
    work_envelope_mm: { x_travel: 900, y_travel: 800, z_travel: 900 },
    spindle: { type: "built_in", max_rpm: 8000, power_kw: 30, taper: "BT50" },
    tool_magazine: { capacity: 80, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "horizontal_T", axis_config: ["X", "Y", "Z", "B"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MA_600H",
  },
  {
    model: "MA-600HII",
    type: "horizontal_machining_center",
    series: "MA",
    step_file: "OKUMA MA-600HII.step",
    step_file_size_mb: 1.90,
    work_envelope_mm: { x_travel: 900, y_travel: 800, z_travel: 900 },
    spindle: { type: "built_in", max_rpm: 10000, power_kw: 30, taper: "BT50" },
    tool_magazine: { capacity: 80, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "horizontal_T", axis_config: ["X", "Y", "Z", "B"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MA_600HII",
  },
  {
    model: "MA-650VB",
    type: "vertical_machining_center",
    series: "MA",
    step_file: "OKUMA MA-650VB.step",
    step_file_size_mb: 1.47,
    work_envelope_mm: { x_travel: 1300, y_travel: 650, z_travel: 610 },
    spindle: { type: "direct_drive", max_rpm: 10000, power_kw: 30, taper: "BT50" },
    tool_magazine: { capacity: 48, type: "arm" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MA_650VB",
  },

  // ============================================================================
  // MB Series — Horizontal Machining Centers (High Performance)
  // ============================================================================
  {
    model: "MB-4000H",
    type: "horizontal_machining_center",
    series: "MB",
    step_file: "OKUMA MB-4000H.step",
    step_file_size_mb: 1.54,
    work_envelope_mm: { x_travel: 560, y_travel: 560, z_travel: 640 },
    spindle: { type: "built_in", max_rpm: 12000, power_kw: 22, taper: "BT40" },
    tool_magazine: { capacity: 40, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "horizontal_T", axis_config: ["X", "Y", "Z", "B"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MB_4000H",
  },
  {
    model: "MB-46VAE",
    type: "vertical_machining_center",
    series: "MB",
    step_file: "OKUMA MB-46VAE.step",
    step_file_size_mb: 2.31,
    work_envelope_mm: { x_travel: 762, y_travel: 460, z_travel: 460 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MB_46VAE",
  },
  {
    model: "MB-5000H",
    type: "horizontal_machining_center",
    series: "MB",
    step_file: "OKUMA MB-5000H.step",
    step_file_size_mb: 1.57,
    work_envelope_mm: { x_travel: 730, y_travel: 730, z_travel: 810 },
    spindle: { type: "built_in", max_rpm: 10000, power_kw: 26, taper: "BT50" },
    tool_magazine: { capacity: 60, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "horizontal_T", axis_config: ["X", "Y", "Z", "B"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MB_5000H",
  },
  {
    model: "MB-5000HII",
    type: "horizontal_machining_center",
    series: "MB",
    step_file: "OKUMA MB-5000HII.step",
    step_file_size_mb: 26.50,
    work_envelope_mm: { x_travel: 730, y_travel: 730, z_travel: 810 },
    spindle: { type: "built_in", max_rpm: 10000, power_kw: 30, taper: "BT50" },
    tool_magazine: { capacity: 60, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "horizontal_T", axis_config: ["X", "Y", "Z", "B"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MB_5000HII",
  },
  {
    model: "MB-56VA",
    type: "vertical_machining_center",
    series: "MB",
    step_file: "OKUMA MB-56VA.step",
    step_file_size_mb: 0.83,
    work_envelope_mm: { x_travel: 1050, y_travel: 560, z_travel: 460 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MB_56VA",
  },
  {
    model: "MB-66VA",
    type: "vertical_machining_center",
    series: "MB",
    step_file: "OKUMA MB-66VA.step",
    step_file_size_mb: 1.92,
    work_envelope_mm: { x_travel: 1300, y_travel: 660, z_travel: 510 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MB_66VA",
  },
  {
    model: "MB-8000H",
    type: "horizontal_machining_center",
    series: "MB",
    step_file: "OKUMA MB-8000H.step",
    step_file_size_mb: 3.12,
    work_envelope_mm: { x_travel: 1120, y_travel: 900, z_travel: 1000 },
    spindle: { type: "built_in", max_rpm: 8000, power_kw: 37, taper: "BT50" },
    tool_magazine: { capacity: 80, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "horizontal_T", axis_config: ["X", "Y", "Z", "B"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MB_8000H",
  },

  // ============================================================================
  // MCR Series — Double Column Machining Centers
  // ============================================================================
  {
    model: "MCR-A5CII 25x40",
    type: "double_column_machining_center",
    series: "MCR",
    step_file: "OKUMA MCR-A5CII 25x40.step",
    step_file_size_mb: 4.21,
    work_envelope_mm: { x_travel: 2500, y_travel: 4000, z_travel: 700 },
    spindle: { type: "gear_head", max_rpm: 6000, power_kw: 37, taper: "HSK100" },
    tool_magazine: { capacity: 60, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "bridge_type", axis_config: ["X", "Y", "Z", "A", "C"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MCR_A5CII_25x40",
  },
  {
    model: "MCR-BIII 25E 25x40",
    type: "double_column_machining_center",
    series: "MCR",
    step_file: "OKUMA MCR-BIII 25E 25x40.step",
    step_file_size_mb: 5.33,
    work_envelope_mm: { x_travel: 2500, y_travel: 4000, z_travel: 700 },
    spindle: { type: "gear_head", max_rpm: 5000, power_kw: 45, taper: "HSK100" },
    tool_magazine: { capacity: 80, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "bridge_type", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MCR_BIII_25E_25x40",
  },
  {
    model: "MCR-BIII 25E 25x50",
    type: "double_column_machining_center",
    series: "MCR",
    step_file: "OKUMA MCR-BIII 25E 25x50.step",
    step_file_size_mb: 5.81,
    work_envelope_mm: { x_travel: 2500, y_travel: 5000, z_travel: 700 },
    spindle: { type: "gear_head", max_rpm: 5000, power_kw: 45, taper: "HSK100" },
    tool_magazine: { capacity: 80, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "bridge_type", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MCR_BIII_25E_25x50",
  },
  {
    model: "MCR-BIII 35E 35x65",
    type: "double_column_machining_center",
    series: "MCR",
    step_file: "OKUMA MCR-BIII 35E 35x65.step",
    step_file_size_mb: 6.92,
    work_envelope_mm: { x_travel: 3500, y_travel: 6500, z_travel: 800 },
    spindle: { type: "gear_head", max_rpm: 5000, power_kw: 55, taper: "HSK100" },
    tool_magazine: { capacity: 100, type: "chain" },
    controller: "OSP-P300",
    kinematic_chain: { structure: "bridge_type", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MCR_BIII_35E_35x65",
  },

  // ============================================================================
  // MU Series — 5-Axis Vertical Machining Centers
  // ============================================================================
  {
    model: "MU-4000V",
    type: "5axis_machining_center",
    series: "MU",
    step_file: "OKUMA MU-4000V.step",
    step_file_size_mb: 4.55,
    work_envelope_mm: { x_travel: 600, y_travel: 550, z_travel: 500 },
    spindle: { type: "direct_drive", max_rpm: 20000, power_kw: 26, taper: "HSK63" },
    tool_magazine: { capacity: 48, type: "arm" },
    controller: "OSP-P300MA",
    kinematic_chain: {
      structure: "C-frame_with_trunnion",
      axis_config: ["X", "Y", "Z", "A", "C"],
      rotary_axes: {
        A: { range_min: -120, range_max: 30, speed_rpm: 100 },
        C: { range_min: 0, range_max: 360, speed_rpm: 150 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MU_4000V",
  },
  {
    model: "MU-400VA",
    type: "5axis_machining_center",
    series: "MU",
    step_file: "OKUMA MU-400VA.step",
    step_file_size_mb: 5.12,
    work_envelope_mm: { x_travel: 600, y_travel: 550, z_travel: 500 },
    spindle: { type: "built_in", max_rpm: 25000, power_kw: 37, taper: "HSK63" },
    tool_magazine: { capacity: 60, type: "arm" },
    controller: "OSP-P300MA",
    kinematic_chain: {
      structure: "C-frame_with_trunnion",
      axis_config: ["X", "Y", "Z", "A", "C"],
      rotary_axes: {
        A: { range_min: -120, range_max: 30, speed_rpm: 100 },
        C: { range_min: 0, range_max: 360, speed_rpm: 150 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MU_400VA",
  },
  {
    model: "MU-5000V",
    type: "5axis_machining_center",
    series: "MU",
    step_file: "OKUMA MU-5000V.step",
    step_file_size_mb: 5.88,
    work_envelope_mm: { x_travel: 730, y_travel: 650, z_travel: 600 },
    spindle: { type: "direct_drive", max_rpm: 18000, power_kw: 30, taper: "HSK63" },
    tool_magazine: { capacity: 48, type: "arm" },
    controller: "OSP-P300MA",
    kinematic_chain: {
      structure: "C-frame_with_trunnion",
      axis_config: ["X", "Y", "Z", "A", "C"],
      rotary_axes: {
        A: { range_min: -120, range_max: 30, speed_rpm: 80 },
        C: { range_min: 0, range_max: 360, speed_rpm: 100 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MU_5000V",
  },
  {
    model: "MU-500VA",
    type: "5axis_machining_center",
    series: "MU",
    step_file: "OKUMA MU-500VA.step",
    step_file_size_mb: 6.21,
    work_envelope_mm: { x_travel: 730, y_travel: 650, z_travel: 600 },
    spindle: { type: "built_in", max_rpm: 25000, power_kw: 37, taper: "HSK63" },
    tool_magazine: { capacity: 60, type: "arm" },
    controller: "OSP-P300MA",
    kinematic_chain: {
      structure: "C-frame_with_trunnion",
      axis_config: ["X", "Y", "Z", "A", "C"],
      rotary_axes: {
        A: { range_min: -120, range_max: 30, speed_rpm: 80 },
        C: { range_min: 0, range_max: 360, speed_rpm: 100 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MU_500VA",
  },
  {
    model: "MU-500VAL",
    type: "5axis_machining_center",
    series: "MU",
    step_file: "OKUMA MU-500VAL.step",
    step_file_size_mb: 7.33,
    work_envelope_mm: { x_travel: 730, y_travel: 800, z_travel: 600 },
    spindle: { type: "built_in", max_rpm: 25000, power_kw: 37, taper: "HSK63" },
    tool_magazine: { capacity: 80, type: "chain" },
    controller: "OSP-P300MA",
    kinematic_chain: {
      structure: "C-frame_with_trunnion",
      axis_config: ["X", "Y", "Z", "A", "C"],
      rotary_axes: {
        A: { range_min: -120, range_max: 30, speed_rpm: 80 },
        C: { range_min: 0, range_max: 360, speed_rpm: 100 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MU_500VAL",
  },
  {
    model: "MU-6300V",
    type: "5axis_machining_center",
    series: "MU",
    step_file: "OKUMA MU-6300V.step",
    step_file_size_mb: 8.12,
    work_envelope_mm: { x_travel: 1050, y_travel: 900, z_travel: 700 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 37, taper: "HSK100" },
    tool_magazine: { capacity: 60, type: "chain" },
    controller: "OSP-P300MA",
    kinematic_chain: {
      structure: "C-frame_with_trunnion",
      axis_config: ["X", "Y", "Z", "A", "C"],
      rotary_axes: {
        A: { range_min: -110, range_max: 30, speed_rpm: 60 },
        C: { range_min: 0, range_max: 360, speed_rpm: 80 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MU_6300V",
  },
  {
    model: "MU-8000V",
    type: "5axis_machining_center",
    series: "MU",
    step_file: "OKUMA MU-8000V.step",
    step_file_size_mb: 11.22,
    work_envelope_mm: { x_travel: 1400, y_travel: 1250, z_travel: 900 },
    spindle: { type: "direct_drive", max_rpm: 12000, power_kw: 45, taper: "HSK100" },
    tool_magazine: { capacity: 80, type: "chain" },
    controller: "OSP-P300MA",
    kinematic_chain: {
      structure: "C-frame_with_trunnion",
      axis_config: ["X", "Y", "Z", "A", "C"],
      rotary_axes: {
        A: { range_min: -100, range_max: 30, speed_rpm: 40 },
        C: { range_min: 0, range_max: 360, speed_rpm: 60 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MU_8000V",
  },

  // ============================================================================
  // MILLAC Series — High-Speed Vertical Machining Centers
  // ============================================================================
  {
    model: "MILLAC 1052VII",
    type: "vertical_machining_center",
    series: "MILLAC",
    step_file: "OKUMA MILLAC 1052VII.step",
    step_file_size_mb: 2.88,
    work_envelope_mm: { x_travel: 1000, y_travel: 520, z_travel: 460 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MILLAC_1052VII",
  },
  {
    model: "MILLAC 33T",
    type: "vertical_machining_center",
    series: "MILLAC",
    step_file: "OKUMA MILLAC 33T.step",
    step_file_size_mb: 3.15,
    work_envelope_mm: { x_travel: 560, y_travel: 400, z_travel: 350 },
    spindle: { type: "direct_drive", max_rpm: 25000, power_kw: 18, taper: "BBT30" },
    tool_magazine: { capacity: 20, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MILLAC_33T",
  },
  {
    model: "MILLAC 761VII",
    type: "vertical_machining_center",
    series: "MILLAC",
    step_file: "OKUMA MILLAC 761VII.step",
    step_file_size_mb: 2.67,
    work_envelope_mm: { x_travel: 760, y_travel: 610, z_travel: 460 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MILLAC_761VII",
  },
  {
    model: "MILLAC 800VH",
    type: "vertical_machining_center",
    series: "MILLAC",
    step_file: "OKUMA MILLAC 800VH.step",
    step_file_size_mb: 3.42,
    work_envelope_mm: { x_travel: 800, y_travel: 600, z_travel: 500 },
    spindle: { type: "built_in", max_rpm: 20000, power_kw: 26, taper: "HSK63" },
    tool_magazine: { capacity: 48, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MILLAC_800VH",
  },
  {
    model: "MILLAC 852VII",
    type: "vertical_machining_center",
    series: "MILLAC",
    step_file: "OKUMA MILLAC 852VII.step",
    step_file_size_mb: 2.91,
    work_envelope_mm: { x_travel: 850, y_travel: 520, z_travel: 460 },
    spindle: { type: "direct_drive", max_rpm: 15000, power_kw: 22, taper: "BBT40" },
    tool_magazine: { capacity: 32, type: "arm" },
    controller: "OSP-P300M",
    kinematic_chain: { structure: "C-frame", axis_config: ["X", "Y", "Z"] },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/MILLAC_852VII",
  },

  // ============================================================================
  // VTM Series — Vertical Turning/Milling Centers
  // ============================================================================
  {
    model: "VTM-80YB",
    type: "mill_turn_center",
    series: "VTM",
    step_file: "OKUMA VTM-80YB.step",
    step_file_size_mb: 4.88,
    work_envelope_mm: { x_travel: 425, y_travel: 200, z_travel: 600 },
    spindle: { type: "built_in", max_rpm: 1000, power_kw: 45, taper: "CAT50" },
    tool_magazine: { capacity: 24, type: "turret" },
    controller: "OSP-P300S",
    kinematic_chain: {
      structure: "vertical_turning",
      axis_config: ["X", "Y", "Z", "C", "B"],
      rotary_axes: {
        C: { range_min: 0, range_max: 360, speed_rpm: 1000 },
        B: { range_min: -30, range_max: 120, speed_rpm: 50 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/VTM_80YB",
  },
  {
    model: "VTM-1200YB",
    type: "mill_turn_center",
    series: "VTM",
    step_file: "OKUMA VTM-1200YB.step",
    step_file_size_mb: 6.55,
    work_envelope_mm: { x_travel: 675, y_travel: 250, z_travel: 800 },
    spindle: { type: "built_in", max_rpm: 600, power_kw: 75, taper: "CAT50" },
    tool_magazine: { capacity: 36, type: "turret" },
    controller: "OSP-P300S",
    kinematic_chain: {
      structure: "vertical_turning",
      axis_config: ["X", "Y", "Z", "C", "B"],
      rotary_axes: {
        C: { range_min: 0, range_max: 360, speed_rpm: 600 },
        B: { range_min: -30, range_max: 120, speed_rpm: 40 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/VTM_1200YB",
  },
  {
    model: "VTM-2000YB",
    type: "mill_turn_center",
    series: "VTM",
    step_file: "OKUMA VTM-2000YB.step",
    step_file_size_mb: 8.92,
    work_envelope_mm: { x_travel: 1100, y_travel: 400, z_travel: 1000 },
    spindle: { type: "built_in", max_rpm: 400, power_kw: 110, taper: "CAT50" },
    tool_magazine: { capacity: 48, type: "turret" },
    controller: "OSP-P300S",
    kinematic_chain: {
      structure: "vertical_turning",
      axis_config: ["X", "Y", "Z", "C", "B"],
      rotary_axes: {
        C: { range_min: 0, range_max: 360, speed_rpm: 400 },
        B: { range_min: -30, range_max: 120, speed_rpm: 30 },
      },
    },
    simulation_model_path: "MACHINE_SIMULATION_MODELS/OKUMA/VTM_2000YB",
  },
];

/**
 * Get all machines from STEP files.
 */
export function getOkumaMachinesFromStep(): OkumaMachineEntry[] {
  return OKUMA_MACHINES_FROM_STEP;
}

/**
 * Find machine by model name.
 */
export function findOkumaMachineByModel(model: string): OkumaMachineEntry | undefined {
  const normalized = model.toUpperCase().replace(/[-_\s]/g, "");
  return OKUMA_MACHINES_FROM_STEP.find(m => {
    const entryNorm = m.model.toUpperCase().replace(/[-_\s]/g, "");
    return entryNorm.includes(normalized) || normalized.includes(entryNorm);
  });
}

/**
 * Get machines by series.
 */
export function getOkumaMachinesBySeries(series: OkumaMachineEntry["series"]): OkumaMachineEntry[] {
  return OKUMA_MACHINES_FROM_STEP.filter(m => m.series === series);
}

/**
 * Get machines by type.
 */
export function getOkumaMachinesByType(type: OkumaMachineEntry["type"]): OkumaMachineEntry[] {
  return OKUMA_MACHINES_FROM_STEP.filter(m => m.type === type);
}
