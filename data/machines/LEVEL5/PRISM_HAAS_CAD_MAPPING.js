/**
 * PRISM_HAAS_CAD_MAPPING.js
 * Maps CAD files to existing machine IDs + lists NEW machines to add
 * 
 * PURPOSE: Prevent duplication by clearly separating:
 * - Machines that already exist (just need CAD path added)
 * - Machines that are NEW (need full database entries)
 * 
 * @version 1.0.0
 * @created 2026-01-20
 */

const HAAS_CAD_MAPPING = {
    
    // ═══════════════════════════════════════════════════════════════════
    // EXISTING MACHINES - Just add cad_file path to their records
    // ═══════════════════════════════════════════════════════════════════
    
    existingMachines: {
        "HAAS_VF2": {
            cad_file: { step_file: "HAAS VF-2.step", file_size_mb: 1.22, relative_path: "HAAS/HAAS VF-2.step" }
        },
        "HAAS_VF4": {
            cad_file: { step_file: "HAAS VF-4.step", file_size_mb: 1.27, relative_path: "HAAS/HAAS VF-4.step" }
        },
        // VF-6/50 - no direct CAD match (VF-6-40 exists but different taper)
        "HAAS_UMC_750": {
            cad_file: { step_file: "HAAS UMC-750.step", file_size_mb: 2.62, relative_path: "HAAS/HAAS UMC-750.step" }
        },
        "HAAS_UMC_1000": {
            cad_file: { step_file: "HAAS UMC-1000.step", file_size_mb: 7.34, relative_path: "HAAS/HAAS UMC-1000.step" }
        },
        "HAAS_EC_400": {
            cad_file: { step_file: "HAAS EC-400.step", file_size_mb: 24.88, relative_path: "HAAS/HAAS EC-400.step" }
        },
        "HAAS_EC_500": {
            cad_file: { step_file: "HAAS EC-500.step", file_size_mb: 14.36, relative_path: "HAAS/HAAS EC-500.step" }
        },
        "HAAS_DT_1": {
            cad_file: { step_file: "HAAS DT-1.step", file_size_mb: 13.27, relative_path: "HAAS/HAAS DT-1.step" }
        }
        // ST-20, ST-20Y, ST-35, GR-510 have NO CAD files
    },

    // ═══════════════════════════════════════════════════════════════════
    // NEW MACHINES - Need full database entries (54 machines)
    // ═══════════════════════════════════════════════════════════════════
    
    newMachines: [
        // VF SERIES (18 new)
        { model: "VF-1", step_file: "HAAS VF-1.step", size_mb: 0.79, type: "vmc", series: "VF", x: 508, y: 406, z: 508, rpm: 8100, taper: "BT40", axes: 3 },
        { model: "VF-2 TR", step_file: "HAAS VF-2 TR.step", size_mb: 1.33, type: "5axis", series: "VF", x: 762, y: 406, z: 508, rpm: 8100, taper: "BT40", axes: 5 },
        { model: "VF-2 WITH TRT100", step_file: "HAAS VF-2 WITH TRT100 TILTING ROTARY RABLE.step", size_mb: 3.09, type: "5axis", series: "VF", x: 762, y: 406, z: 508, rpm: 8100, taper: "BT40", axes: 5 },
        { model: "VF-2SSYT", step_file: "HAAS VF-2SSYT.step", size_mb: 6.55, type: "vmc", series: "VF", x: 762, y: 406, z: 508, rpm: 12000, taper: "BT40", axes: 4 },
        { model: "VF-2YT", step_file: "HAAS VF-2YT.step", size_mb: 6.25, type: "vmc", series: "VF", x: 762, y: 508, z: 508, rpm: 8100, taper: "BT40", axes: 4 },
        { model: "VF-3", step_file: "HAAS VF-3.step", size_mb: 1.13, type: "vmc", series: "VF", x: 1016, y: 508, z: 635, rpm: 8100, taper: "BT40", axes: 3 },
        { model: "VF-3 WITH TR160", step_file: "HAAS VF-3 WITH TR160 TRUNNION ROTARY TABLE.step", size_mb: 2.76, type: "5axis", series: "VF", x: 1016, y: 508, z: 635, rpm: 8100, taper: "BT40", axes: 5 },
        { model: "VF-3YT", step_file: "HAAS VF-3YT.step", size_mb: 2.42, type: "vmc", series: "VF", x: 1016, y: 660, z: 635, rpm: 8100, taper: "BT40", axes: 4 },
        { model: "VF-3YT-50", step_file: "HAAS VF-3YT-50.step", size_mb: 8.70, type: "vmc", series: "VF", x: 1016, y: 660, z: 635, rpm: 7500, taper: "BT50", axes: 4 },
        { model: "VF-4SS WITH TRT210", step_file: "HAAS VF-4SS WITH TRT210 TRUNNION ROTARY TABLE.step", size_mb: 22.15, type: "5axis", series: "VF", x: 1270, y: 508, z: 635, rpm: 12000, taper: "BT40", axes: 5 },
        { model: "VF-5-40", step_file: "HAAS VF-5-40.step", size_mb: 4.53, type: "vmc", series: "VF", x: 1270, y: 660, z: 635, rpm: 8100, taper: "BT40", axes: 3 },
        { model: "VF-6-40", step_file: "HAAS VF-6-40.step", size_mb: 1.35, type: "vmc", series: "VF", x: 1626, y: 813, z: 762, rpm: 8100, taper: "BT40", axes: 3 },
        { model: "VF-7-40", step_file: "HAAS VF-7-40.step", size_mb: 4.16, type: "vmc", series: "VF", x: 2134, y: 813, z: 762, rpm: 8100, taper: "BT40", axes: 3 },
        { model: "VF-8-40", step_file: "HAAS VF-8-40.step", size_mb: 1.91, type: "vmc", series: "VF", x: 1626, y: 1016, z: 762, rpm: 8100, taper: "BT40", axes: 3 },
        { model: "VF-10", step_file: "HAAS VF-10.step", size_mb: 5.49, type: "vmc", series: "VF", x: 3048, y: 813, z: 762, rpm: 8100, taper: "BT40", axes: 3 },
        { model: "VF-10-50", step_file: "HAAS VF-10-50.step", size_mb: 2.66, type: "vmc", series: "VF", x: 3048, y: 813, z: 762, rpm: 6000, taper: "BT50", axes: 3 },
        { model: "VF-11-40", step_file: "HAAS VF-11-40.step", size_mb: 5.55, type: "vmc", series: "VF", x: 3048, y: 1016, z: 762, rpm: 8100, taper: "BT40", axes: 3 },
        { model: "VF-11-50", step_file: "HAAS VF-11-50.step", size_mb: 2.44, type: "vmc", series: "VF", x: 3048, y: 1016, z: 762, rpm: 6000, taper: "BT50", axes: 3 },
        { model: "VF-12-40", step_file: "HAAS VF-12-40.step", size_mb: 2.82, type: "vmc", series: "VF", x: 3810, y: 813, z: 762, rpm: 8100, taper: "BT40", axes: 3 },
        { model: "VF-12-50", step_file: "HAAS VF-12-50.step", size_mb: 7.67, type: "vmc", series: "VF", x: 3810, y: 813, z: 762, rpm: 6000, taper: "BT50", axes: 3 },
        { model: "VF-14-40", step_file: "HAAS VF-14-40.step", size_mb: 16.08, type: "vmc", series: "VF", x: 3810, y: 1016, z: 762, rpm: 8100, taper: "BT40", axes: 3 },
        { model: "VF-14-50", step_file: "HAAS VF-14-50.step", size_mb: 15.39, type: "vmc", series: "VF", x: 3810, y: 1016, z: 762, rpm: 6000, taper: "BT50", axes: 3 },
        
        // UMC SERIES (10 new)
        { model: "UMC-350HD-EDU", step_file: "HAAS UMC 350HD-EDU.step", size_mb: 10.05, type: "5axis", series: "UMC", x: 457, y: 356, z: 356, rpm: 15000, taper: "BT40", axes: 5, table_dia: 350 },
        { model: "UMC-400", step_file: "HAAS UMC-400.step", size_mb: 11.23, type: "5axis", series: "UMC", x: 508, y: 406, z: 394, rpm: 8100, taper: "BT40", axes: 5, table_dia: 400 },
        { model: "UMC-500SS", step_file: "HAAS UMC-500SS.step", size_mb: 23.58, type: "5axis", series: "UMC", x: 610, y: 457, z: 457, rpm: 12000, taper: "BT40", axes: 5, table_dia: 500 },
        { model: "UMC-750 NEW DESIGN", step_file: "HAAS UMC-750 NEW DESIGN.step", size_mb: 15.45, type: "5axis", series: "UMC", x: 762, y: 508, z: 508, rpm: 8100, taper: "BT40", axes: 5, table_dia: 630 },
        { model: "UMC-750SS", step_file: "HAAS UMC-750SS.step", size_mb: 16.16, type: "5axis", series: "UMC", x: 762, y: 508, z: 508, rpm: 12000, taper: "BT40", axes: 5, table_dia: 630 },
        { model: "UMC-1000-P", step_file: "HAAS UMC-1000-P.step", size_mb: 11.12, type: "5axis", series: "UMC", x: 1016, y: 635, z: 635, rpm: 8100, taper: "BT40", axes: 5, table_dia: 800, pallet: true },
        { model: "UMC-1000SS", step_file: "HAAS UMC-1000SS.step", size_mb: 7.31, type: "5axis", series: "UMC", x: 1016, y: 635, z: 635, rpm: 12000, taper: "BT40", axes: 5, table_dia: 800 },
        { model: "UMC-1250", step_file: "HAAS UMC-1250.step", size_mb: 18.61, type: "5axis", series: "UMC", x: 1270, y: 762, z: 762, rpm: 8100, taper: "BT40", axes: 5, table_dia: 1000 },
        { model: "UMC-1500-DUO", step_file: "HAAS UMC-1500-DUO.step", size_mb: 12.56, type: "5axis", series: "UMC", x: 1524, y: 635, z: 508, rpm: 8100, taper: "BT40", axes: 5, table_dia: 630, dual: true },
        { model: "UMC-1500SS-DUO", step_file: "HAAS UMC-1500SS-DUO.step", size_mb: 12.58, type: "5axis", series: "UMC", x: 1524, y: 635, z: 508, rpm: 12000, taper: "BT40", axes: 5, table_dia: 630, dual: true },
        { model: "UMC-1600-H", step_file: "HAAS UMC-1600-H.step", size_mb: 12.74, type: "5axis_hmc", series: "UMC", x: 1600, y: 1016, z: 914, rpm: 8100, taper: "BT40", axes: 5, table_dia: 1250 },
        
        // EC SERIES (4 new)
        { model: "EC-500-50", step_file: "HAAS EC-500-50.step", size_mb: 16.76, type: "hmc", series: "EC", x: 635, y: 635, z: 635, rpm: 6000, taper: "BT50", axes: 4, pallet: 500 },
        { model: "EC-630", step_file: "HAAS EC-630.step", size_mb: 13.68, type: "hmc", series: "EC", x: 762, y: 762, z: 762, rpm: 6000, taper: "BT50", axes: 4, pallet: 630 },
        { model: "EC-1600", step_file: "HAAS EC-1600.step", size_mb: 1.41, type: "hmc", series: "EC", x: 1626, y: 1270, z: 1270, rpm: 6000, taper: "BT50", axes: 4, pallet: 1600 },
        { model: "EC-1600ZT", step_file: "HAAS EC-1600ZT.step", size_mb: 5.44, type: "hmc", series: "EC", x: 1626, y: 1270, z: 1524, rpm: 6000, taper: "BT50", axes: 4, pallet: 1600 },
        
        // DT/DM SERIES (3 new)
        { model: "DT-2", step_file: "HAAS DT-2.step", size_mb: 12.88, type: "drill_tap", series: "DT", x: 660, y: 406, z: 394, rpm: 15000, taper: "BT30", axes: 3 },
        { model: "DM-1", step_file: "HAAS DM-1.step", size_mb: 8.65, type: "drill_mill", series: "DM", x: 508, y: 406, z: 394, rpm: 15000, taper: "BT30", axes: 3 },
        { model: "DM-2", step_file: "HAAS DM-2.step", size_mb: 11.72, type: "drill_mill", series: "DM", x: 711, y: 406, z: 394, rpm: 15000, taper: "BT30", axes: 3 },
        
        // TM SERIES (5 new)
        { model: "TM-1", step_file: "HAAS TM-1.step", size_mb: 0.49, type: "toolroom", series: "TM", x: 762, y: 305, z: 406, rpm: 4000, taper: "BT40", axes: 3 },
        { model: "TM-1P", step_file: "HAAS TM-1P.step", size_mb: 0.52, type: "toolroom", series: "TM", x: 762, y: 305, z: 406, rpm: 4000, taper: "BT40", axes: 3, probe: true },
        { model: "TM-2", step_file: "HAAS TM-2.step", size_mb: 2.36, type: "toolroom", series: "TM", x: 1016, y: 406, z: 406, rpm: 4000, taper: "BT40", axes: 3 },
        { model: "TM-2P", step_file: "HAAS TM-2P.step", size_mb: 2.36, type: "toolroom", series: "TM", x: 1016, y: 406, z: 406, rpm: 4000, taper: "BT40", axes: 3, probe: true },
        { model: "TM-3P", step_file: "HAAS TM-3P.step", size_mb: 2.08, type: "toolroom", series: "TM", x: 1016, y: 508, z: 508, rpm: 6000, taper: "BT40", axes: 3, probe: true },
        
        // MINI MILL SERIES (5 new)
        { model: "Mini Mill", step_file: "HAAS Mini Mill.step", size_mb: 1.02, type: "mini", series: "Mini", x: 406, y: 305, z: 254, rpm: 6000, taper: "BT40", axes: 3 },
        { model: "Mini Mill 2", step_file: "HAAS Mini Mill 2.step", size_mb: 4.07, type: "mini", series: "Mini", x: 406, y: 305, z: 318, rpm: 6000, taper: "BT40", axes: 3 },
        { model: "Mini Mill-EDU", step_file: "HAAS Mini Mill-EDU.step", size_mb: 4.74, type: "mini", series: "Mini", x: 406, y: 305, z: 254, rpm: 6000, taper: "BT40", axes: 3 },
        { model: "Mini Mill-EDU WITH HRT160", step_file: "HAAS Mini Mill-EDU WITH HRT160 TRUNNION TABLE.step", size_mb: 4.80, type: "5axis", series: "Mini", x: 406, y: 305, z: 254, rpm: 6000, taper: "BT40", axes: 5, table_dia: 160 },
        { model: "Super Mini Mill", step_file: "HAAS Super Mini Mill.step", size_mb: 8.97, type: "mini", series: "Mini", x: 406, y: 305, z: 254, rpm: 10000, taper: "BT40", axes: 3 },
        
        // VM SERIES (3 new)
        { model: "VM-2", step_file: "HAAS VM-2.step", size_mb: 13.28, type: "vmc_mold", series: "VM", x: 762, y: 508, z: 508, rpm: 12000, taper: "BT40", axes: 3 },
        { model: "VM-3", step_file: "HAAS VM-3.step", size_mb: 3.70, type: "vmc_mold", series: "VM", x: 1016, y: 660, z: 635, rpm: 12000, taper: "BT40", axes: 3 },
        { model: "VM-6", step_file: "HAAS VM-6.step", size_mb: 5.19, type: "vmc_mold", series: "VM", x: 1626, y: 813, z: 762, rpm: 12000, taper: "BT40", axes: 3 },
        
        // GM SERIES (2 new)
        { model: "GM-2", step_file: "HAAS GM-2.step", size_mb: 12.31, type: "gantry", series: "GM", x: 559, y: 406, z: 406, rpm: 12000, taper: "BT40", axes: 3 },
        { model: "GM-2-5AX", step_file: "HAAS GM-2-5AX.step", size_mb: 18.69, type: "5axis_gantry", series: "GM", x: 559, y: 406, z: 406, rpm: 12000, taper: "BT40", axes: 5 },
        
        // SPECIALTY (3 new)
        { model: "CM-1", step_file: "HAAS CM-1.step", size_mb: 0.99, type: "compact", series: "CM", x: 305, y: 254, z: 254, rpm: 30000, taper: "ER20", axes: 3 },
        { model: "Desktop Mill", step_file: "HAAS Desktop Mill.step", size_mb: 6.33, type: "desktop", series: "Desktop", x: 254, y: 152, z: 152, rpm: 30000, taper: "ER16", axes: 3 },
        { model: "VC-400", step_file: "HAAS VC-400.step", size_mb: 16.23, type: "vmc", series: "VC", x: 508, y: 406, z: 508, rpm: 12000, taper: "BT40", axes: 3 }
    ],

    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY STATISTICS
    // ═══════════════════════════════════════════════════════════════════
    
    summary: {
        existing_with_cad: 7,    // Already in database, just need CAD path
        existing_no_cad: 5,      // In database but no CAD file available (lathes, GR-510)
        new_machines: 54,        // NEW machines from CAD files
        total_cad_files: 61,     // Total STEP files available
        total_after_merge: 70    // 16 existing + 54 new
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HAAS_CAD_MAPPING;
}
if (typeof window !== 'undefined') {
    window.HAAS_CAD_MAPPING = HAAS_CAD_MAPPING;
}
