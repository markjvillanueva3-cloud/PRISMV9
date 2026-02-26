/**
 * ITALY Machine Manufacturers Index
 * 
 * Italian manufacturers in PRISM ENHANCED database:
 * - Fidia (Turin) - High-speed milling, aerospace 5-axis
 * 
 * Total: 1 manufacturer, 7 machines
 */

const ITALY_MACHINES_INDEX = {
    country: "Italy",
    manufacturers: [
        {
            name: "Fidia",
            full_name: "Fidia S.p.A.",
            location: "San Mauro Torinese (Turin)",
            file: "../PRISM_FIDIA_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 7,
            types: ["K-series high-speed", "G-series gantry", "D-series die/mold", "Aerospace 5-axis"]
        }
    ],
    total_machines: 7
};

if (typeof module !== 'undefined') module.exports = ITALY_MACHINES_INDEX;
