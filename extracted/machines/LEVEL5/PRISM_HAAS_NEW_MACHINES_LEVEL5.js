/**
 * PRISM_HAAS_NEW_MACHINES_LEVEL5.js
 * 54 NEW machines from CAD files NOT in existing database
 * 
 * These are ADDITIONS to PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v2.js
 * DO NOT duplicate - merge with existing database
 * 
 * @version 5.0.0
 * @created 2026-01-20
 * @new_machines 54
 * @enhancement_level 5
 */

const PRISM_HAAS_NEW_MACHINES = {
    metadata: {
        manufacturer: "Haas",
        description: "NEW machines to ADD to existing database",
        version: "5.0.0-NEW-ADDITIONS",
        last_updated: "2026-01-20",
        machine_count: 54,
        enhancement_level: 5,
        merge_target: "PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v2.js",
        cad_base_path: "RESOURCES/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION/HAAS/"
    },

    machines: [
        // ═══════════════════════════════════════════════════════════════════
        // VF SERIES - NEW ADDITIONS (22 machines)
        // ═══════════════════════════════════════════════════════════════════
        
        {
            id: "HAAS_VF1",
            manufacturer: "Haas",
            model: "VF-1",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc",
            series: "VF",
            description: "Entry-level production VMC",
            cad_file: { step_file: "HAAS VF-1.step", file_size_mb: 0.79, relative_path: "HAAS/HAAS VF-1.step" },
            work_envelope: { x: {min:0, max:508}, y: {min:0, max:406}, z: {min:0, max:508}, unit: "mm", table_length: 660, table_width: 356, table_load_kg: 1361 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4, torque_nm: 122 },
            axis_specs: { x: {travel:508, rapid:25400, accuracy:0.005}, y: {travel:406, rapid:25400, accuracy:0.005}, z: {travel:508, rapid:25400, accuracy:0.005} },
            atc: { type: "umbrella", capacity: 20, change_time: 4.2 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 3629 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame", chain: ["base","column","table_X","saddle_Y","head_Z","spindle"] },
            transformations: { x: {type:"translation", vector:[1,0,0]}, y: {type:"translation", vector:[0,1,0]}, z: {type:"translation", vector:[0,0,-1]} }
        },

        {
            id: "HAAS_VF2_TR",
            manufacturer: "Haas",
            model: "VF-2TR",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            series: "VF",
            description: "VF-2 with integrated trunnion table",
            cad_file: { step_file: "HAAS VF-2 TR.step", file_size_mb: 1.33, relative_path: "HAAS/HAAS VF-2 TR.step" },
            work_envelope: { x: {min:0, max:762}, y: {min:0, max:406}, z: {min:0, max:508}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 310 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            axis_specs: { x: {travel:762}, y: {travel:406}, z: {travel:508}, a: {range:[-35,120], type:"tilt"}, c: {continuous:true, type:"rotary"} },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true, dwo: true },
            dimensions: { weight_kg: 5443 },
            kinematic_chain: { type: "table_table", structure: "AC_trunnion", chain: ["base","column","saddle_Y","head_Z","spindle","table_X","a_tilt","c_rotary"], tcpcSupported: true }
        },

        {
            id: "HAAS_VF2_TRT100",
            manufacturer: "Haas",
            model: "VF-2 WITH TRT100",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            series: "VF",
            description: "VF-2 with TRT100 tilting rotary table",
            cad_file: { step_file: "HAAS VF-2 WITH TRT100 TILTING ROTARY RABLE.step", file_size_mb: 3.09, relative_path: "HAAS/HAAS VF-2 WITH TRT100 TILTING ROTARY RABLE.step" },
            work_envelope: { x: {min:0, max:762}, y: {min:0, max:406}, z: {min:0, max:508}, a_axis: {min:-120, max:30}, c_axis: {continuous:true}, unit: "mm", table_dia: 100 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            kinematic_chain: { type: "table_table", structure: "TRT_trunnion", chain: ["base","column","saddle_Y","head_Z","spindle","table_X","trt_base","a_tilt","c_rotary"] }
        },

        {
            id: "HAAS_VF2SSYT",
            manufacturer: "Haas",
            model: "VF-2SSYT",
            type: "vertical_machining_center",
            subtype: "4_axis_vmc_ss",
            series: "VF",
            description: "VF-2 Super Speed with Y-axis table",
            cad_file: { step_file: "HAAS VF-2SSYT.step", file_size_mb: 6.55, relative_path: "HAAS/HAAS VF-2SSYT.step" },
            work_envelope: { x: {min:0, max:762}, y: {min:0, max:406}, z: {min:0, max:508}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            axis_specs: { x: {travel:762, rapid:35560}, y: {travel:406, rapid:35560}, z: {travel:508, rapid:35560} },
            atc: { capacity: 24, change_time: 1.6 },
            controller: { brand: "Haas", model: "NGC", axes: 4 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_SS" }
        },

        {
            id: "HAAS_VF2YT",
            manufacturer: "Haas",
            model: "VF-2YT",
            type: "vertical_machining_center",
            subtype: "4_axis_vmc",
            series: "VF",
            description: "VF-2 with extended Y travel",
            cad_file: { step_file: "HAAS VF-2YT.step", file_size_mb: 6.25, relative_path: "HAAS/HAAS VF-2YT.step" },
            work_envelope: { x: {min:0, max:762}, y: {min:0, max:508}, z: {min:0, max:508}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 4 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_YT" }
        },

        {
            id: "HAAS_VF3",
            manufacturer: "Haas",
            model: "VF-3",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc",
            series: "VF",
            description: "Mid-large VMC with extended travels",
            cad_file: { step_file: "HAAS VF-3.step", file_size_mb: 1.13, relative_path: "HAAS/HAAS VF-3.step" },
            work_envelope: { x: {min:0, max:1016}, y: {min:0, max:508}, z: {min:0, max:635}, unit: "mm", table_length: 1168, table_width: 457, table_load_kg: 1588 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4, torque_nm: 122 },
            axis_specs: { x: {travel:1016, rapid:25400, accuracy:0.005}, y: {travel:508, rapid:25400, accuracy:0.005}, z: {travel:635, rapid:25400, accuracy:0.005} },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { length: 3327, width: 2438, height: 2921, weight_kg: 4536 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame" }
        },

        {
            id: "HAAS_VF3_TR160",
            manufacturer: "Haas",
            model: "VF-3 WITH TR160",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            series: "VF",
            description: "VF-3 with TR160 trunnion rotary table",
            cad_file: { step_file: "HAAS VF-3 WITH TR160 TRUNNION ROTARY TABLE.step", file_size_mb: 2.76, relative_path: "HAAS/HAAS VF-3 WITH TR160 TRUNNION ROTARY TABLE.step" },
            work_envelope: { x: {min:0, max:1016}, y: {min:0, max:508}, z: {min:0, max:635}, a_axis: {min:-120, max:30}, c_axis: {continuous:true}, unit: "mm", table_dia: 160 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            kinematic_chain: { type: "table_table", structure: "TR160_trunnion", tcpcSupported: true }
        },

        {
            id: "HAAS_VF3YT",
            manufacturer: "Haas",
            model: "VF-3YT",
            type: "vertical_machining_center",
            subtype: "4_axis_vmc",
            series: "VF",
            description: "VF-3 with extended Y travel",
            cad_file: { step_file: "HAAS VF-3YT.step", file_size_mb: 2.42, relative_path: "HAAS/HAAS VF-3YT.step" },
            work_envelope: { x: {min:0, max:1016}, y: {min:0, max:660}, z: {min:0, max:635}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 4 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_YT" }
        },

        {
            id: "HAAS_VF3YT_50",
            manufacturer: "Haas",
            model: "VF-3YT-50",
            type: "vertical_machining_center",
            subtype: "4_axis_vmc_50",
            series: "VF",
            description: "VF-3YT with 50-taper spindle",
            cad_file: { step_file: "HAAS VF-3YT-50.step", file_size_mb: 8.70, relative_path: "HAAS/HAAS VF-3YT-50.step" },
            work_envelope: { x: {min:0, max:1016}, y: {min:0, max:660}, z: {min:0, max:635}, unit: "mm" },
            spindle: { taper: "BT50", max_rpm: 7500, power_kw: 22.4, torque_nm: 460 },
            controller: { brand: "Haas", model: "NGC", axes: 4 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_50_YT" }
        },

        {
            id: "HAAS_VF4SS_TRT210",
            manufacturer: "Haas",
            model: "VF-4SS WITH TRT210",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            series: "VF",
            description: "VF-4 Super Speed with TRT210 trunnion",
            cad_file: { step_file: "HAAS VF-4SS WITH TRT210 TRUNNION ROTARY TABLE.step", file_size_mb: 22.15, relative_path: "HAAS/HAAS VF-4SS WITH TRT210 TRUNNION ROTARY TABLE.step" },
            work_envelope: { x: {min:0, max:1270}, y: {min:0, max:508}, z: {min:0, max:635}, a_axis: {min:-120, max:30}, c_axis: {continuous:true}, unit: "mm", table_dia: 210 },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            kinematic_chain: { type: "table_table", structure: "TRT210_trunnion_SS", tcpcSupported: true }
        },

        {
            id: "HAAS_VF5_40",
            manufacturer: "Haas",
            model: "VF-5-40",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc",
            series: "VF",
            description: "Large VMC with 40-taper",
            cad_file: { step_file: "HAAS VF-5-40.step", file_size_mb: 4.53, relative_path: "HAAS/HAAS VF-5-40.step" },
            work_envelope: { x: {min:0, max:1270}, y: {min:0, max:660}, z: {min:0, max:635}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 6350 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame" }
        },

        {
            id: "HAAS_VF6_40",
            manufacturer: "Haas",
            model: "VF-6-40",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_large",
            series: "VF",
            description: "Large format VMC with 40-taper",
            cad_file: { step_file: "HAAS VF-6-40.step", file_size_mb: 1.35, relative_path: "HAAS/HAAS VF-6-40.step" },
            work_envelope: { x: {min:0, max:1626}, y: {min:0, max:813}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 8165 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_large" }
        },

        {
            id: "HAAS_VF7_40",
            manufacturer: "Haas",
            model: "VF-7-40",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_xl",
            series: "VF",
            description: "Extra-long VMC",
            cad_file: { step_file: "HAAS VF-7-40.step", file_size_mb: 4.16, relative_path: "HAAS/HAAS VF-7-40.step" },
            work_envelope: { x: {min:0, max:2134}, y: {min:0, max:813}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 9525 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_XL" }
        },

        {
            id: "HAAS_VF8_40",
            manufacturer: "Haas",
            model: "VF-8-40",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_wide",
            series: "VF",
            description: "Wide-bed VMC",
            cad_file: { step_file: "HAAS VF-8-40.step", file_size_mb: 1.91, relative_path: "HAAS/HAAS VF-8-40.step" },
            work_envelope: { x: {min:0, max:1626}, y: {min:0, max:1016}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 10433 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_wide" }
        },

        {
            id: "HAAS_VF10",
            manufacturer: "Haas",
            model: "VF-10",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_xl",
            series: "VF",
            description: "Extra-large VMC with 40-taper",
            cad_file: { step_file: "HAAS VF-10.step", file_size_mb: 5.49, relative_path: "HAAS/HAAS VF-10.step" },
            work_envelope: { x: {min:0, max:3048}, y: {min:0, max:813}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 12247 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_XL" }
        },

        {
            id: "HAAS_VF10_50",
            manufacturer: "Haas",
            model: "VF-10-50",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_50_xl",
            series: "VF",
            description: "Extra-large VMC with 50-taper",
            cad_file: { step_file: "HAAS VF-10-50.step", file_size_mb: 2.66, relative_path: "HAAS/HAAS VF-10-50.step" },
            work_envelope: { x: {min:0, max:3048}, y: {min:0, max:813}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT50", max_rpm: 6000, power_kw: 22.4, torque_nm: 460 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 13608 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_50_XL" }
        },

        {
            id: "HAAS_VF11_40",
            manufacturer: "Haas",
            model: "VF-11-40",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_xl",
            series: "VF",
            description: "Wide extra-large VMC",
            cad_file: { step_file: "HAAS VF-11-40.step", file_size_mb: 5.55, relative_path: "HAAS/HAAS VF-11-40.step" },
            work_envelope: { x: {min:0, max:3048}, y: {min:0, max:1016}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 14515 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_XL_wide" }
        },

        {
            id: "HAAS_VF11_50",
            manufacturer: "Haas",
            model: "VF-11-50",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_50_xl",
            series: "VF",
            description: "Wide extra-large VMC with 50-taper",
            cad_file: { step_file: "HAAS VF-11-50.step", file_size_mb: 2.44, relative_path: "HAAS/HAAS VF-11-50.step" },
            work_envelope: { x: {min:0, max:3048}, y: {min:0, max:1016}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT50", max_rpm: 6000, power_kw: 22.4, torque_nm: 460 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 15876 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_50_XL_wide" }
        },

        {
            id: "HAAS_VF12_40",
            manufacturer: "Haas",
            model: "VF-12-40",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_xxl",
            series: "VF",
            description: "Extra-extra-long VMC",
            cad_file: { step_file: "HAAS VF-12-40.step", file_size_mb: 2.82, relative_path: "HAAS/HAAS VF-12-40.step" },
            work_envelope: { x: {min:0, max:3810}, y: {min:0, max:813}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 14061 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_XXL" }
        },

        {
            id: "HAAS_VF12_50",
            manufacturer: "Haas",
            model: "VF-12-50",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_50_xxl",
            series: "VF",
            description: "Extra-extra-long VMC with 50-taper",
            cad_file: { step_file: "HAAS VF-12-50.step", file_size_mb: 7.67, relative_path: "HAAS/HAAS VF-12-50.step" },
            work_envelope: { x: {min:0, max:3810}, y: {min:0, max:813}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT50", max_rpm: 6000, power_kw: 22.4, torque_nm: 460 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 15422 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_50_XXL" }
        },

        {
            id: "HAAS_VF14_40",
            manufacturer: "Haas",
            model: "VF-14-40",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_xxl",
            series: "VF",
            description: "Largest wide-bed VMC",
            cad_file: { step_file: "HAAS VF-14-40.step", file_size_mb: 16.08, relative_path: "HAAS/HAAS VF-14-40.step" },
            work_envelope: { x: {min:0, max:3810}, y: {min:0, max:1016}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 15876 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_XXL_wide" }
        },

        {
            id: "HAAS_VF14_50",
            manufacturer: "Haas",
            model: "VF-14-50",
            type: "vertical_machining_center",
            subtype: "3_axis_vmc_50_xxl",
            series: "VF",
            description: "Largest wide-bed VMC with 50-taper",
            cad_file: { step_file: "HAAS VF-14-50.step", file_size_mb: 15.39, relative_path: "HAAS/HAAS VF-14-50.step" },
            work_envelope: { x: {min:0, max:3810}, y: {min:0, max:1016}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT50", max_rpm: 6000, power_kw: 22.4, torque_nm: 460 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 17237 },
            kinematic_chain: { type: "serial_XYZ", structure: "C_frame_50_XXL_wide" }
        },

        // ═══════════════════════════════════════════════════════════════════
        // UMC SERIES - NEW ADDITIONS (10 machines)
        // ═══════════════════════════════════════════════════════════════════

        {
            id: "HAAS_UMC350HD_EDU",
            manufacturer: "Haas",
            model: "UMC-350HD-EDU",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            series: "UMC",
            description: "Educational 5-axis universal machining center",
            cad_file: { step_file: "HAAS UMC 350HD-EDU.step", file_size_mb: 10.05, relative_path: "HAAS/HAAS UMC 350HD-EDU.step" },
            work_envelope: { x: {min:0, max:457}, y: {min:0, max:356}, z: {min:0, max:356}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 350 },
            spindle: { taper: "BT40", max_rpm: 15000, power_kw: 11.2 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            kinematic_chain: { type: "table_table", structure: "AC_trunnion", tcpcSupported: true }
        },

        {
            id: "HAAS_UMC400",
            manufacturer: "Haas",
            model: "UMC-400",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            series: "UMC",
            description: "Compact 5-axis universal machining center",
            cad_file: { step_file: "HAAS UMC-400.step", file_size_mb: 11.23, relative_path: "HAAS/HAAS UMC-400.step" },
            work_envelope: { x: {min:0, max:508}, y: {min:0, max:406}, z: {min:0, max:394}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 400 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 11.2 },
            atc: { capacity: 40 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true, dwo: true },
            dimensions: { weight_kg: 3629 },
            kinematic_chain: { type: "table_table", structure: "AC_trunnion", tcpcSupported: true }
        },

        {
            id: "HAAS_UMC500SS",
            manufacturer: "Haas",
            model: "UMC-500SS",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion_ss",
            series: "UMC",
            description: "Super-speed 5-axis universal machining center",
            cad_file: { step_file: "HAAS UMC-500SS.step", file_size_mb: 23.58, relative_path: "HAAS/HAAS UMC-500SS.step" },
            work_envelope: { x: {min:0, max:610}, y: {min:0, max:457}, z: {min:0, max:457}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 500 },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            dimensions: { weight_kg: 5443 },
            kinematic_chain: { type: "table_table", structure: "AC_trunnion_SS", tcpcSupported: true }
        },

        {
            id: "HAAS_UMC750_NEW",
            manufacturer: "Haas",
            model: "UMC-750 NEW DESIGN",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion",
            series: "UMC",
            description: "Redesigned UMC-750 with improved rigidity",
            cad_file: { step_file: "HAAS UMC-750 NEW DESIGN.step", file_size_mb: 15.45, relative_path: "HAAS/HAAS UMC-750 NEW DESIGN.step" },
            work_envelope: { x: {min:0, max:762}, y: {min:0, max:508}, z: {min:0, max:508}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 630 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            kinematic_chain: { type: "table_table", structure: "AC_trunnion_new", tcpcSupported: true }
        },

        {
            id: "HAAS_UMC750SS",
            manufacturer: "Haas",
            model: "UMC-750SS",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion_ss",
            series: "UMC",
            description: "Super-speed UMC-750",
            cad_file: { step_file: "HAAS UMC-750SS.step", file_size_mb: 16.16, relative_path: "HAAS/HAAS UMC-750SS.step" },
            work_envelope: { x: {min:0, max:762}, y: {min:0, max:508}, z: {min:0, max:508}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 630 },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            axis_specs: { x: {travel:762, rapid:35560}, y: {travel:508, rapid:35560}, z: {travel:508, rapid:35560} },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            kinematic_chain: { type: "table_table", structure: "AC_trunnion_SS", tcpcSupported: true }
        },

        {
            id: "HAAS_UMC1000_P",
            manufacturer: "Haas",
            model: "UMC-1000-P",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion_pallet",
            series: "UMC",
            description: "UMC-1000 with pallet changer",
            cad_file: { step_file: "HAAS UMC-1000-P.step", file_size_mb: 11.12, relative_path: "HAAS/HAAS UMC-1000-P.step" },
            work_envelope: { x: {min:0, max:1016}, y: {min:0, max:635}, z: {min:0, max:635}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 800 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            pallet_changer: { type: "dual_pallet", pallet_count: 2, pallet_dia: 800 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            dimensions: { weight_kg: 13608 },
            kinematic_chain: { type: "table_table", structure: "AC_trunnion_pallet", tcpcSupported: true }
        },

        {
            id: "HAAS_UMC1000SS",
            manufacturer: "Haas",
            model: "UMC-1000SS",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion_ss_large",
            series: "UMC",
            description: "Super-speed large UMC",
            cad_file: { step_file: "HAAS UMC-1000SS.step", file_size_mb: 7.31, relative_path: "HAAS/HAAS UMC-1000SS.step" },
            work_envelope: { x: {min:0, max:1016}, y: {min:0, max:635}, z: {min:0, max:635}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 800 },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            axis_specs: { x: {travel:1016, rapid:35560}, y: {travel:635, rapid:35560}, z: {travel:635, rapid:35560} },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            kinematic_chain: { type: "table_table", structure: "AC_trunnion_SS_large", tcpcSupported: true }
        },

        {
            id: "HAAS_UMC1250",
            manufacturer: "Haas",
            model: "UMC-1250",
            type: "vertical_machining_center",
            subtype: "5_axis_trunnion_xl",
            series: "UMC",
            description: "Extra-large 5-axis UMC",
            cad_file: { step_file: "HAAS UMC-1250.step", file_size_mb: 18.61, relative_path: "HAAS/HAAS UMC-1250.step" },
            work_envelope: { x: {min:0, max:1270}, y: {min:0, max:762}, z: {min:0, max:762}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 1000 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            dimensions: { weight_kg: 16783 },
            kinematic_chain: { type: "table_table", structure: "AC_trunnion_XL", tcpcSupported: true }
        },

        {
            id: "HAAS_UMC1500_DUO",
            manufacturer: "Haas",
            model: "UMC-1500-DUO",
            type: "vertical_machining_center",
            subtype: "5_axis_dual_trunnion",
            series: "UMC",
            description: "Dual-table 5-axis UMC",
            cad_file: { step_file: "HAAS UMC-1500-DUO.step", file_size_mb: 12.56, relative_path: "HAAS/HAAS UMC-1500-DUO.step" },
            work_envelope: { x: {min:0, max:1524}, y: {min:0, max:635}, z: {min:0, max:508}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 630 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4 },
            dual_table: true,
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            dimensions: { weight_kg: 18144 },
            kinematic_chain: { type: "table_table_dual", structure: "AC_trunnion_duo", tcpcSupported: true }
        },

        {
            id: "HAAS_UMC1500SS_DUO",
            manufacturer: "Haas",
            model: "UMC-1500SS-DUO",
            type: "vertical_machining_center",
            subtype: "5_axis_dual_trunnion_ss",
            series: "UMC",
            description: "Super-speed dual-table 5-axis UMC",
            cad_file: { step_file: "HAAS UMC-1500SS-DUO.step", file_size_mb: 12.58, relative_path: "HAAS/HAAS UMC-1500SS-DUO.step" },
            work_envelope: { x: {min:0, max:1524}, y: {min:0, max:635}, z: {min:0, max:508}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 630 },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            dual_table: true,
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            dimensions: { weight_kg: 18371 },
            kinematic_chain: { type: "table_table_dual", structure: "AC_trunnion_duo_SS", tcpcSupported: true }
        },

        {
            id: "HAAS_UMC1600_H",
            manufacturer: "Haas",
            model: "UMC-1600-H",
            type: "horizontal_machining_center",
            subtype: "5_axis_horizontal",
            series: "UMC",
            description: "Horizontal 5-axis universal machining center",
            cad_file: { step_file: "HAAS UMC-1600-H.step", file_size_mb: 12.74, relative_path: "HAAS/HAAS UMC-1600-H.step" },
            work_envelope: { x: {min:0, max:1600}, y: {min:0, max:1016}, z: {min:0, max:914}, a_axis: {min:-35, max:120}, c_axis: {continuous:true}, unit: "mm", table_dia: 1250 },
            spindle: { taper: "BT40", max_rpm: 8100, power_kw: 22.4, orientation: "horizontal" },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            dimensions: { weight_kg: 24040 },
            kinematic_chain: { type: "table_table", structure: "AC_trunnion_horizontal", spindleOrientation: "horizontal", tcpcSupported: true }
        },

        // ═══════════════════════════════════════════════════════════════════
        // EC SERIES - NEW ADDITIONS (4 machines)
        // ═══════════════════════════════════════════════════════════════════

        {
            id: "HAAS_EC500_50",
            manufacturer: "Haas",
            model: "EC-500-50",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc_50",
            series: "EC",
            description: "Heavy-duty HMC with 50-taper",
            cad_file: { step_file: "HAAS EC-500-50.step", file_size_mb: 16.76, relative_path: "HAAS/HAAS EC-500-50.step" },
            work_envelope: { x: {min:0, max:635}, y: {min:0, max:635}, z: {min:0, max:635}, b_axis: {indexing:0.001, continuous:true}, unit: "mm", pallet_size: 500 },
            spindle: { taper: "BT50", max_rpm: 6000, power_kw: 22.4, torque_nm: 460, orientation: "horizontal" },
            pallet_changer: { type: "dual_pallet", pallet_count: 2, pallet_size: 500 },
            controller: { brand: "Haas", model: "NGC", axes: 4 },
            dimensions: { weight_kg: 9525 },
            kinematic_chain: { type: "T_configuration", structure: "HMC_pallet_50", spindleOrientation: "horizontal" }
        },

        {
            id: "HAAS_EC630",
            manufacturer: "Haas",
            model: "EC-630",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc_large",
            series: "EC",
            description: "Large horizontal machining center",
            cad_file: { step_file: "HAAS EC-630.step", file_size_mb: 13.68, relative_path: "HAAS/HAAS EC-630.step" },
            work_envelope: { x: {min:0, max:762}, y: {min:0, max:762}, z: {min:0, max:762}, b_axis: {indexing:0.001, continuous:true}, unit: "mm", pallet_size: 630 },
            spindle: { taper: "BT50", max_rpm: 6000, power_kw: 22.4, torque_nm: 460, orientation: "horizontal" },
            pallet_changer: { type: "dual_pallet", pallet_count: 2, pallet_size: 630 },
            controller: { brand: "Haas", model: "NGC", axes: 4 },
            dimensions: { weight_kg: 12247 },
            kinematic_chain: { type: "T_configuration", structure: "HMC_pallet_large", spindleOrientation: "horizontal" }
        },

        {
            id: "HAAS_EC1600",
            manufacturer: "Haas",
            model: "EC-1600",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc_xl",
            series: "EC",
            description: "Extra-large horizontal machining center",
            cad_file: { step_file: "HAAS EC-1600.step", file_size_mb: 1.41, relative_path: "HAAS/HAAS EC-1600.step" },
            work_envelope: { x: {min:0, max:1626}, y: {min:0, max:1270}, z: {min:0, max:1270}, b_axis: {indexing:0.001, continuous:true}, unit: "mm", pallet_size: 1600 },
            spindle: { taper: "BT50", max_rpm: 6000, power_kw: 22.4, torque_nm: 460, orientation: "horizontal" },
            pallet_changer: { type: "dual_pallet", pallet_count: 2, pallet_size: 1600 },
            controller: { brand: "Haas", model: "NGC", axes: 4 },
            dimensions: { weight_kg: 27216 },
            kinematic_chain: { type: "T_configuration", structure: "HMC_pallet_XL", spindleOrientation: "horizontal" }
        },

        {
            id: "HAAS_EC1600ZT",
            manufacturer: "Haas",
            model: "EC-1600ZT",
            type: "horizontal_machining_center",
            subtype: "4_axis_hmc_xl_zt",
            series: "EC",
            description: "Extra-large HMC with extended Z travel",
            cad_file: { step_file: "HAAS EC-1600ZT.step", file_size_mb: 5.44, relative_path: "HAAS/HAAS EC-1600ZT.step" },
            work_envelope: { x: {min:0, max:1626}, y: {min:0, max:1270}, z: {min:0, max:1524}, b_axis: {indexing:0.001, continuous:true}, unit: "mm", pallet_size: 1600 },
            spindle: { taper: "BT50", max_rpm: 6000, power_kw: 22.4, torque_nm: 460, orientation: "horizontal" },
            pallet_changer: { type: "dual_pallet", pallet_count: 2, pallet_size: 1600 },
            controller: { brand: "Haas", model: "NGC", axes: 4 },
            dimensions: { weight_kg: 29484 },
            kinematic_chain: { type: "T_configuration", structure: "HMC_pallet_XL_ZT", spindleOrientation: "horizontal" }
        },

        // ═══════════════════════════════════════════════════════════════════
        // DT/DM SERIES - NEW ADDITIONS (3 machines)
        // ═══════════════════════════════════════════════════════════════════

        {
            id: "HAAS_DT2",
            manufacturer: "Haas",
            model: "DT-2",
            type: "drill_tap_center",
            subtype: "3_axis_high_speed",
            series: "DT",
            description: "Extended X-travel drill/tap center",
            cad_file: { step_file: "HAAS DT-2.step", file_size_mb: 12.88, relative_path: "HAAS/HAAS DT-2.step" },
            work_envelope: { x: {min:0, max:660}, y: {min:0, max:406}, z: {min:0, max:394}, unit: "mm" },
            spindle: { taper: "BT30", max_rpm: 15000, power_kw: 11.2 },
            axis_specs: { x: {travel:660, rapid:61000}, y: {travel:406, rapid:61000}, z: {travel:394, rapid:61000} },
            atc: { capacity: 20, change_time: 1.6 },
            controller: { brand: "Haas", model: "NGC", axes: 3, high_speed_tap: true },
            kinematic_chain: { type: "serial_XYZ", structure: "DT_high_speed" }
        },

        {
            id: "HAAS_DM1",
            manufacturer: "Haas",
            model: "DM-1",
            type: "drill_mill_center",
            subtype: "3_axis_high_speed",
            series: "DM",
            description: "High-speed drill/mill center",
            cad_file: { step_file: "HAAS DM-1.step", file_size_mb: 8.65, relative_path: "HAAS/HAAS DM-1.step" },
            work_envelope: { x: {min:0, max:508}, y: {min:0, max:406}, z: {min:0, max:394}, unit: "mm" },
            spindle: { taper: "BT30", max_rpm: 15000, power_kw: 11.2 },
            axis_specs: { x: {travel:508, rapid:61000}, y: {travel:406, rapid:61000}, z: {travel:394, rapid:61000} },
            atc: { capacity: 20, change_time: 1.6 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            kinematic_chain: { type: "serial_XYZ", structure: "DM_high_speed" }
        },

        {
            id: "HAAS_DM2",
            manufacturer: "Haas",
            model: "DM-2",
            type: "drill_mill_center",
            subtype: "3_axis_high_speed",
            series: "DM",
            description: "Extended X-travel drill/mill center",
            cad_file: { step_file: "HAAS DM-2.step", file_size_mb: 11.72, relative_path: "HAAS/HAAS DM-2.step" },
            work_envelope: { x: {min:0, max:711}, y: {min:0, max:406}, z: {min:0, max:394}, unit: "mm" },
            spindle: { taper: "BT30", max_rpm: 15000, power_kw: 11.2 },
            axis_specs: { x: {travel:711, rapid:61000}, y: {travel:406, rapid:61000}, z: {travel:394, rapid:61000} },
            atc: { capacity: 20, change_time: 1.6 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            kinematic_chain: { type: "serial_XYZ", structure: "DM_high_speed" }
        },

        // ═══════════════════════════════════════════════════════════════════
        // TM SERIES - NEW ADDITIONS (5 machines)
        // ═══════════════════════════════════════════════════════════════════

        {
            id: "HAAS_TM1",
            manufacturer: "Haas",
            model: "TM-1",
            type: "toolroom_mill",
            subtype: "3_axis_manual",
            series: "TM",
            description: "Entry-level toolroom mill",
            cad_file: { step_file: "HAAS TM-1.step", file_size_mb: 0.49, relative_path: "HAAS/HAAS TM-1.step" },
            work_envelope: { x: {min:0, max:762}, y: {min:0, max:305}, z: {min:0, max:406}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 4000, power_kw: 5.6 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 1588 },
            kinematic_chain: { type: "serial_XYZ", structure: "TM_toolroom" }
        },

        {
            id: "HAAS_TM1P",
            manufacturer: "Haas",
            model: "TM-1P",
            type: "toolroom_mill",
            subtype: "3_axis_probe",
            series: "TM",
            description: "TM-1 with probing capability",
            cad_file: { step_file: "HAAS TM-1P.step", file_size_mb: 0.52, relative_path: "HAAS/HAAS TM-1P.step" },
            work_envelope: { x: {min:0, max:762}, y: {min:0, max:305}, z: {min:0, max:406}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 4000, power_kw: 5.6 },
            probing: { type: "wireless", tool_setter: true, part_probe: true },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            kinematic_chain: { type: "serial_XYZ", structure: "TM_toolroom" }
        },

        {
            id: "HAAS_TM2",
            manufacturer: "Haas",
            model: "TM-2",
            type: "toolroom_mill",
            subtype: "3_axis_manual",
            series: "TM",
            description: "Mid-size toolroom mill",
            cad_file: { step_file: "HAAS TM-2.step", file_size_mb: 2.36, relative_path: "HAAS/HAAS TM-2.step" },
            work_envelope: { x: {min:0, max:1016}, y: {min:0, max:406}, z: {min:0, max:406}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 4000, power_kw: 5.6 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 1814 },
            kinematic_chain: { type: "serial_XYZ", structure: "TM_toolroom" }
        },

        {
            id: "HAAS_TM2P",
            manufacturer: "Haas",
            model: "TM-2P",
            type: "toolroom_mill",
            subtype: "3_axis_probe",
            series: "TM",
            description: "TM-2 with probing capability",
            cad_file: { step_file: "HAAS TM-2P.step", file_size_mb: 2.36, relative_path: "HAAS/HAAS TM-2P.step" },
            work_envelope: { x: {min:0, max:1016}, y: {min:0, max:406}, z: {min:0, max:406}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 4000, power_kw: 5.6 },
            probing: { type: "wireless", tool_setter: true, part_probe: true },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            kinematic_chain: { type: "serial_XYZ", structure: "TM_toolroom" }
        },

        {
            id: "HAAS_TM3P",
            manufacturer: "Haas",
            model: "TM-3P",
            type: "toolroom_mill",
            subtype: "3_axis_probe_large",
            series: "TM",
            description: "Large toolroom mill with probing",
            cad_file: { step_file: "HAAS TM-3P.step", file_size_mb: 2.08, relative_path: "HAAS/HAAS TM-3P.step" },
            work_envelope: { x: {min:0, max:1016}, y: {min:0, max:508}, z: {min:0, max:508}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 6000, power_kw: 11.2 },
            probing: { type: "wireless", tool_setter: true, part_probe: true },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 2495 },
            kinematic_chain: { type: "serial_XYZ", structure: "TM_toolroom_large" }
        },

        // ═══════════════════════════════════════════════════════════════════
        // MINI MILL SERIES - NEW ADDITIONS (5 machines)
        // ═══════════════════════════════════════════════════════════════════

        {
            id: "HAAS_MINI_MILL",
            manufacturer: "Haas",
            model: "Mini Mill",
            type: "mini_mill",
            subtype: "3_axis_compact",
            series: "Mini",
            description: "Compact machining center",
            cad_file: { step_file: "HAAS Mini Mill.step", file_size_mb: 1.02, relative_path: "HAAS/HAAS Mini Mill.step" },
            work_envelope: { x: {min:0, max:406}, y: {min:0, max:305}, z: {min:0, max:254}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 6000, power_kw: 5.6 },
            atc: { capacity: 10 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 1270 },
            kinematic_chain: { type: "serial_XYZ", structure: "mini_mill" }
        },

        {
            id: "HAAS_MINI_MILL_2",
            manufacturer: "Haas",
            model: "Mini Mill 2",
            type: "mini_mill",
            subtype: "3_axis_compact",
            series: "Mini",
            description: "Upgraded compact machining center",
            cad_file: { step_file: "HAAS Mini Mill 2.step", file_size_mb: 4.07, relative_path: "HAAS/HAAS Mini Mill 2.step" },
            work_envelope: { x: {min:0, max:406}, y: {min:0, max:305}, z: {min:0, max:318}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 6000, power_kw: 5.6 },
            atc: { capacity: 10 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 1406 },
            kinematic_chain: { type: "serial_XYZ", structure: "mini_mill" }
        },

        {
            id: "HAAS_MINI_MILL_EDU",
            manufacturer: "Haas",
            model: "Mini Mill-EDU",
            type: "mini_mill",
            subtype: "3_axis_education",
            series: "Mini",
            description: "Educational compact machining center",
            cad_file: { step_file: "HAAS Mini Mill-EDU.step", file_size_mb: 4.74, relative_path: "HAAS/HAAS Mini Mill-EDU.step" },
            work_envelope: { x: {min:0, max:406}, y: {min:0, max:305}, z: {min:0, max:254}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 6000, power_kw: 5.6 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            kinematic_chain: { type: "serial_XYZ", structure: "mini_mill_edu" }
        },

        {
            id: "HAAS_MINI_MILL_EDU_HRT160",
            manufacturer: "Haas",
            model: "Mini Mill-EDU WITH HRT160",
            type: "mini_mill",
            subtype: "5_axis_education",
            series: "Mini",
            description: "Educational 5-axis mini mill with trunnion",
            cad_file: { step_file: "HAAS Mini Mill-EDU WITH HRT160 TRUNNION TABLE.step", file_size_mb: 4.80, relative_path: "HAAS/HAAS Mini Mill-EDU WITH HRT160 TRUNNION TABLE.step" },
            work_envelope: { x: {min:0, max:406}, y: {min:0, max:305}, z: {min:0, max:254}, a_axis: {min:-120, max:30}, c_axis: {continuous:true}, unit: "mm", table_dia: 160 },
            spindle: { taper: "BT40", max_rpm: 6000, power_kw: 5.6 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            kinematic_chain: { type: "table_table", structure: "mini_mill_5axis", tcpcSupported: true }
        },

        {
            id: "HAAS_SUPER_MINI_MILL",
            manufacturer: "Haas",
            model: "Super Mini Mill",
            type: "mini_mill",
            subtype: "3_axis_high_speed",
            series: "Mini",
            description: "High-speed compact machining center",
            cad_file: { step_file: "HAAS Super Mini Mill.step", file_size_mb: 8.97, relative_path: "HAAS/HAAS Super Mini Mill.step" },
            work_envelope: { x: {min:0, max:406}, y: {min:0, max:305}, z: {min:0, max:254}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 10000, power_kw: 11.2 },
            atc: { capacity: 10 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 1542 },
            kinematic_chain: { type: "serial_XYZ", structure: "super_mini_mill" }
        },

        // ═══════════════════════════════════════════════════════════════════
        // VM SERIES - NEW ADDITIONS (3 machines)
        // ═══════════════════════════════════════════════════════════════════

        {
            id: "HAAS_VM2",
            manufacturer: "Haas",
            model: "VM-2",
            type: "vertical_machining_center",
            subtype: "3_axis_mold",
            series: "VM",
            description: "High-speed mold making VMC",
            cad_file: { step_file: "HAAS VM-2.step", file_size_mb: 13.28, relative_path: "HAAS/HAAS VM-2.step" },
            work_envelope: { x: {min:0, max:762}, y: {min:0, max:508}, z: {min:0, max:508}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 4536 },
            kinematic_chain: { type: "serial_XYZ", structure: "VM_mold" }
        },

        {
            id: "HAAS_VM3",
            manufacturer: "Haas",
            model: "VM-3",
            type: "vertical_machining_center",
            subtype: "3_axis_mold",
            series: "VM",
            description: "Mid-large mold making VMC",
            cad_file: { step_file: "HAAS VM-3.step", file_size_mb: 3.70, relative_path: "HAAS/HAAS VM-3.step" },
            work_envelope: { x: {min:0, max:1016}, y: {min:0, max:660}, z: {min:0, max:635}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 6350 },
            kinematic_chain: { type: "serial_XYZ", structure: "VM_mold" }
        },

        {
            id: "HAAS_VM6",
            manufacturer: "Haas",
            model: "VM-6",
            type: "vertical_machining_center",
            subtype: "3_axis_mold_large",
            series: "VM",
            description: "Large mold making VMC",
            cad_file: { step_file: "HAAS VM-6.step", file_size_mb: 5.19, relative_path: "HAAS/HAAS VM-6.step" },
            work_envelope: { x: {min:0, max:1626}, y: {min:0, max:813}, z: {min:0, max:762}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 9979 },
            kinematic_chain: { type: "serial_XYZ", structure: "VM_mold_large" }
        },

        // ═══════════════════════════════════════════════════════════════════
        // GM SERIES - NEW ADDITIONS (2 machines)
        // ═══════════════════════════════════════════════════════════════════

        {
            id: "HAAS_GM2",
            manufacturer: "Haas",
            model: "GM-2",
            type: "gantry_mill",
            subtype: "3_axis_gantry",
            series: "GM",
            description: "Gantry-style machining center",
            cad_file: { step_file: "HAAS GM-2.step", file_size_mb: 12.31, relative_path: "HAAS/HAAS GM-2.step" },
            work_envelope: { x: {min:0, max:559}, y: {min:0, max:406}, z: {min:0, max:406}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 3629 },
            kinematic_chain: { type: "gantry", structure: "GM_gantry" }
        },

        {
            id: "HAAS_GM2_5AX",
            manufacturer: "Haas",
            model: "GM-2-5AX",
            type: "gantry_mill",
            subtype: "5_axis_gantry",
            series: "GM",
            description: "5-axis gantry-style machining center",
            cad_file: { step_file: "HAAS GM-2-5AX.step", file_size_mb: 18.69, relative_path: "HAAS/HAAS GM-2-5AX.step" },
            work_envelope: { x: {min:0, max:559}, y: {min:0, max:406}, z: {min:0, max:406}, a_axis: {min:-120, max:30}, c_axis: {continuous:true}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            controller: { brand: "Haas", model: "NGC", axes: 5, tcpc: true },
            dimensions: { weight_kg: 4082 },
            kinematic_chain: { type: "gantry_5axis", structure: "GM_gantry_5ax", tcpcSupported: true }
        },

        // ═══════════════════════════════════════════════════════════════════
        // SPECIALTY MACHINES - NEW ADDITIONS (3 machines)
        // ═══════════════════════════════════════════════════════════════════

        {
            id: "HAAS_CM1",
            manufacturer: "Haas",
            model: "CM-1",
            type: "compact_mill",
            subtype: "3_axis_micro",
            series: "CM",
            description: "Ultra-compact high-speed machining center",
            cad_file: { step_file: "HAAS CM-1.step", file_size_mb: 0.99, relative_path: "HAAS/HAAS CM-1.step" },
            work_envelope: { x: {min:0, max:305}, y: {min:0, max:254}, z: {min:0, max:254}, unit: "mm" },
            spindle: { taper: "ER20", max_rpm: 30000, power_kw: 2.2 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 454 },
            kinematic_chain: { type: "serial_XYZ", structure: "CM_micro" }
        },

        {
            id: "HAAS_DESKTOP_MILL",
            manufacturer: "Haas",
            model: "Desktop Mill",
            type: "desktop_mill",
            subtype: "3_axis_benchtop",
            series: "Desktop",
            description: "Benchtop CNC mill for prototyping",
            cad_file: { step_file: "HAAS Desktop Mill.step", file_size_mb: 6.33, relative_path: "HAAS/HAAS Desktop Mill.step" },
            work_envelope: { x: {min:0, max:254}, y: {min:0, max:152}, z: {min:0, max:152}, unit: "mm" },
            spindle: { taper: "ER16", max_rpm: 30000, power_kw: 0.75 },
            controller: { brand: "Haas", model: "Desktop_Control", axes: 3 },
            dimensions: { weight_kg: 150 },
            kinematic_chain: { type: "serial_XYZ", structure: "desktop" }
        },

        {
            id: "HAAS_VC400",
            manufacturer: "Haas",
            model: "VC-400",
            type: "vertical_machining_center",
            subtype: "3_axis_compact_vmc",
            series: "VC",
            description: "Compact high-speed VMC",
            cad_file: { step_file: "HAAS VC-400.step", file_size_mb: 16.23, relative_path: "HAAS/HAAS VC-400.step" },
            work_envelope: { x: {min:0, max:508}, y: {min:0, max:406}, z: {min:0, max:508}, unit: "mm" },
            spindle: { taper: "BT40", max_rpm: 12000, power_kw: 22.4 },
            atc: { capacity: 24 },
            controller: { brand: "Haas", model: "NGC", axes: 3 },
            dimensions: { weight_kg: 4309 },
            kinematic_chain: { type: "serial_XYZ", structure: "VC_compact" }
        }
    ],

    // Helper functions
    getMachineById: function(id) { return this.machines.find(m => m.id === id); },
    getMachinesByType: function(type) { return this.machines.filter(m => m.type === type); },
    getMachinesBySeries: function(series) { return this.machines.filter(m => m.series === series); },
    get5AxisMachines: function() { return this.machines.filter(m => m.subtype && m.subtype.includes("5_axis")); },
    getAllIds: function() { return this.machines.map(m => m.id); }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRISM_HAAS_NEW_MACHINES;
}
if (typeof window !== 'undefined') {
    window.PRISM_HAAS_NEW_MACHINES = PRISM_HAAS_NEW_MACHINES;
}

console.log(`[HAAS NEW] Loaded ${PRISM_HAAS_NEW_MACHINES.machines.length} NEW machines to add to database`);
