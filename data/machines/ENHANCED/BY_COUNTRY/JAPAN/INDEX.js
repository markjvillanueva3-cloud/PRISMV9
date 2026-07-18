/**
 * JAPAN Machine Manufacturers Index
 * 
 * Japanese manufacturers in PRISM ENHANCED database:
 * - Brother (Nagoya) - High-speed drill/tap, compact VMCs
 * - Mazak (Oguchi) - Full-line, multi-tasking, INTEGREX
 * - MHI (Tokyo) - Large horizontal boring, heavy-duty
 * - Okuma (Oguchi) - Full-line, OSP control, Thermo-Friendly
 * 
 * Total: 4 manufacturers, ~38 machines
 */

const JAPAN_MACHINES_INDEX = {
    country: "Japan",
    manufacturers: [
        {
            name: "Brother",
            full_name: "Brother Industries, Ltd.",
            location: "Nagoya",
            file: "../PRISM_BROTHER_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 11,
            types: ["SPEEDIO drill/tap", "M-series VMC", "R-series 5-axis"]
        },
        {
            name: "Mazak",
            full_name: "Yamazaki Mazak Corporation",
            location: "Oguchi, Aichi",
            file: "../PRISM_MAZAK_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 12,
            types: ["VARIAXIS 5-axis", "INTEGREX mill-turn", "VTC VMC", "HCN HMC"]
        },
        {
            name: "MHI",
            full_name: "Mitsubishi Heavy Industries Machine Tool",
            location: "Tokyo",
            file: "../PRISM_MHI_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 10,
            types: ["MAF horizontal boring", "MVR double-column", "Gantry 5-axis"]
        },
        {
            name: "Okuma",
            full_name: "Okuma Corporation",
            location: "Oguchi, Aichi",
            file: "../PRISM_OKUMA_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 8,
            types: ["GENOS VMC", "MB-V", "LB turning", "MULTUS mill-turn"]
        }
    ],
    total_machines: 41
};

if (typeof module !== 'undefined') module.exports = JAPAN_MACHINES_INDEX;
