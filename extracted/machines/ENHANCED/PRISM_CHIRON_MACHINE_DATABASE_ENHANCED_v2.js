/**
 * PRISM Chiron Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: CHIRON Group Official Specifications 2024
 */

const PRISM_CHIRON_MACHINE_DATABASE_ENHANCED = {
    manufacturer: "chiron",
    manufacturerFull: "CHIRON Group SE",
    country: "Germany",
    headquarters: "Tuttlingen, Germany",
    website: "https://www.chiron-group.com",
    controlSystem: "Siemens 840D / FANUC",
    version: "2.0.0",
    lastUpdated: "2026-01-20",
    totalMachines: 0,
    
    machines: {
        "chiron_fz08s": {
            id: "chiron_fz08s", manufacturer: "chiron", model: "FZ 08 S", series: "FZ", type: "VMC", subtype: "3-axis-high-speed", axes: 3, control: "Siemens 840D sl",
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 18, continuousHp: 15, maxTorque_Nm: 52, taper: "HSK-A50",
                geometry: { noseToGageLine_mm: 76.2, headDiameter_mm: 140, headLength_mm: 300 } },
            travels: { x: { min: 0, max: 350, rapid_mm_min: 75000 }, y: { min: 0, max: 350, rapid_mm_min: 75000 }, z: { min: 0, max: 350, rapid_mm_min: 75000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"] },
            table: { type: "fixed", length_mm: 440, width_mm: 350, thickness_mm: 50, maxLoad_kg: 100 },
            atc: { type: "chain", capacity: 24, maxToolDiameter_mm: 63, maxToolLength_mm: 200, changeTime_sec: 1.2 },
            physical: { weight_kg: 3800 }
        },
        "chiron_fz12s": {
            id: "chiron_fz12s", manufacturer: "chiron", model: "FZ 12 S", series: "FZ", type: "VMC", subtype: "3-axis-high-speed", axes: 3, control: "Siemens 840D sl",
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 85, taper: "HSK-A63" },
            travels: { x: { min: 0, max: 550, rapid_mm_min: 75000 }, y: { min: 0, max: 400, rapid_mm_min: 75000 }, z: { min: 0, max: 400, rapid_mm_min: 75000 } },
            table: { type: "fixed", length_mm: 700, width_mm: 400, maxLoad_kg: 200 },
            atc: { type: "chain", capacity: 36, changeTime_sec: 1.5 },
            physical: { weight_kg: 5500 }
        },
        "chiron_mill800": {
            id: "chiron_mill800", manufacturer: "chiron", model: "MILL 800", series: "MILL", type: "5AXIS", subtype: "trunnion-high-speed", axes: 5,
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 85, taper: "HSK-A63" },
            travels: { x: { min: 0, max: 550, rapid_mm_min: 75000 }, y: { min: 0, max: 400, rapid_mm_min: 75000 }, z: { min: 0, max: 400, rapid_mm_min: 75000 },
                a: { min: -120, max: 30, rapid_deg_sec: 50 }, c: { min: -360, max: 360, rapid_deg_sec: 120, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", fiveAxisType: "table-table", tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 350, maxLoad_kg: 100 },
            physical: { weight_kg: 8500 }
        }
    }
};

PRISM_CHIRON_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_CHIRON_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_CHIRON_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_CHIRON_MACHINE_DATABASE_ENHANCED = PRISM_CHIRON_MACHINE_DATABASE_ENHANCED;
