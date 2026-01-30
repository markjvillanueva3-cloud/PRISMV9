/**
 * GERMANY Machine Manufacturers Index
 * 
 * German manufacturers in PRISM ENHANCED database:
 * - Chiron (Tuttlingen) - High-speed VMCs, double-spindle
 * - Hermle (Gosheim) - Precision 5-axis, modified gantry
 * 
 * Total: 2 manufacturers, ~16 machines
 */

const GERMANY_MACHINES_INDEX = {
    country: "Germany",
    manufacturers: [
        {
            name: "Chiron",
            full_name: "CHIRON Group SE",
            location: "Tuttlingen",
            file: "../PRISM_CHIRON_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 9,
            types: ["FZ high-speed VMC", "DZ double-spindle", "MILL 5-axis"]
        },
        {
            name: "Hermle",
            full_name: "Maschinenfabrik Berthold Hermle AG",
            location: "Gosheim",
            file: "../PRISM_HERMLE_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 7,
            types: ["C-series 5-axis", "Precision VMC", "Automation-ready"]
        }
    ],
    total_machines: 16
};

if (typeof module !== 'undefined') module.exports = GERMANY_MACHINES_INDEX;
