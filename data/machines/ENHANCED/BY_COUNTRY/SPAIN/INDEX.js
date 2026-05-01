/**
 * SPAIN Machine Manufacturers Index
 * 
 * Spanish manufacturers in PRISM ENHANCED database:
 * - Soraluce (Bergara) - Floor-type boring/milling, heavy machining
 * 
 * Total: 1 manufacturer, 7 machines
 */

const SPAIN_MACHINES_INDEX = {
    country: "Spain",
    manufacturers: [
        {
            name: "Soraluce",
            full_name: "Soraluce S.Coop. (Danobat Group)",
            location: "Bergara, Basque Country",
            file: "../PRISM_SORALUCE_MACHINE_DATABASE_ENHANCED_v2.js",
            machines: 7,
            types: ["FP floor-type", "TA bed-type", "FR gantry", "DAS damping system"]
        }
    ],
    total_machines: 7
};

if (typeof module !== 'undefined') module.exports = SPAIN_MACHINES_INDEX;
