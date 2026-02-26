/**
 * USA Machine Manufacturers Index
 * 
 * American manufacturers in PRISM ENHANCED database:
 * - Cincinnati (Ohio) - Large 5-axis profilers, aerospace
 * - Giddings & Lewis (Wisconsin) - Horizontal boring, floor-type
 * 
 * Total: 2 manufacturers, ~16 machines
 */

const USA_MACHINES_INDEX = {
    country: "USA",
    manufacturers: [
        {
            name: "Cincinnati",
            full_name: "Cincinnati Machine (Fives Group)",
            location: "Hebron, Kentucky",
            file: "../PRISM_CINCINNATI_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 8,
            types: ["Large 5-axis profilers", "Aerospace machines", "Gantry mills"]
        },
        {
            name: "Giddings & Lewis",
            full_name: "Giddings & Lewis (Fives Group)",
            location: "Fond du Lac, Wisconsin",
            file: "../PRISM_GIDDINGS_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 8,
            types: ["Horizontal boring mills", "Floor-type machines", "VTL"]
        }
    ],
    total_machines: 16
};

if (typeof module !== 'undefined') module.exports = USA_MACHINES_INDEX;
