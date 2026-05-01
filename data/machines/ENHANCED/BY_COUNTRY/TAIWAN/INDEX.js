/**
 * TAIWAN Machine Manufacturers Index
 * 
 * Taiwanese manufacturers in PRISM ENHANCED database:
 * - AWEA (Taichung) - Double-column, bridge-type, value leader
 * 
 * Total: 1 manufacturer, 10 machines
 */

const TAIWAN_MACHINES_INDEX = {
    country: "Taiwan",
    manufacturers: [
        {
            name: "AWEA",
            full_name: "AWEA Mechantronic Co., Ltd.",
            location: "Taichung",
            file: "../PRISM_AWEA_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 10,
            types: ["LP double-column", "AF 5-axis bridge", "BM box-way VMC", "SP high-speed", "VP 5-axis trunnion", "HMC", "TL turning", "VL VTL"]
        }
    ],
    total_machines: 10
};

if (typeof module !== 'undefined') module.exports = TAIWAN_MACHINES_INDEX;
