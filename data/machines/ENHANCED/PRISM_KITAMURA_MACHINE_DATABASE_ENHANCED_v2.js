/**
 * PRISM Kitamura Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: Kitamura Machinery Official Specifications 2024
 * 
 * Coverage:
 * - Mycenter Series (VMC)
 * - Mytrunnion Series (5-Axis)
 * - Supercell Series (HMC)
 * - Bridgecenter Series (Bridge-type)
 */

const PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED = {
    manufacturer: "kitamura",
    manufacturerFull: "Kitamura Machinery Co., Ltd.",
    country: "Japan",
    headquarters: "Nagano, Japan",
    website: "https://www.kitamura-machinery.com",
    controlSystem: "FANUC / Arumatik-Mi",
    version: "2.0.0",
    lastUpdated: "2026-01-20",
    totalMachines: 0,
    
    machines: {
        
        // ═══════════════════════════════════════════════════════════════════════════════════════
        // MYCENTER SERIES - VERTICAL MACHINING CENTERS
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "kitamura_mycenter_hx300ig": {
            id: "kitamura_mycenter_hx300ig", manufacturer: "kitamura", model: "Mycenter HX300iG", series: "Mycenter", type: "VMC", subtype: "3-axis-compact", axes: 3, control: "Arumatik-Mi",
            spindle: { type: "motorSpindle", maxRpm: 15000, peakHp: 15, continuousHp: 12, maxTorque_Nm: 55, taper: "BBT30",
                geometry: { noseToGageLine_mm: 70.0, headDiameter_mm: 130, headLength_mm: 280 } },
            travels: { x: { min: 0, max: 510, rapid_mm_min: 48000 }, y: { min: 0, max: 360, rapid_mm_min: 48000 }, z: { min: 0, max: 360, rapid_mm_min: 48000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 255, y: 180, z: 360 }, tableSurface: { x: 255, y: 180, z: 0 } }, spindleToTable_mm: 360 },
            table: { type: "fixed", length_mm: 700, width_mm: 360, thickness_mm: 55, tSlots: { count: 3, width_mm: 14, spacing_mm: 100 }, maxLoad_kg: 200 },
            geometry: { footprint: { length_mm: 1800, width_mm: 1900, height_mm: 2300 }, workEnvelope: { x_mm: 510, y_mm: 360, z_mm: 360 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 130, length_mm: 280, offset: { x: 0, y: 0, z: -140 } },
                table: { type: "box", dimensions: { x: 700, y: 360, z: 55 }, position: { x: 0, y: 0, z: -55 } } },
            atc: { type: "arm", capacity: 20, maxToolDiameter_mm: 63, maxToolLength_mm: 200, changeTime_sec: 1.5 },
            accuracy: { positioning_mm: 0.002, repeatability_mm: 0.001 },
            physical: { weight_kg: 2800 }, sources: ["Kitamura Mycenter HX300iG Specifications 2024"]
        },

        "kitamura_mycenter_hx400ig": {
            id: "kitamura_mycenter_hx400ig", manufacturer: "kitamura", model: "Mycenter HX400iG", series: "Mycenter", type: "VMC", subtype: "3-axis", axes: 3, control: "Arumatik-Mi",
            spindle: { type: "motorSpindle", maxRpm: 12000, peakHp: 22, continuousHp: 18, maxTorque_Nm: 100, taper: "BBT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 170, headLength_mm: 350 } },
            travels: { x: { min: 0, max: 760, rapid_mm_min: 42000 }, y: { min: 0, max: 410, rapid_mm_min: 42000 }, z: { min: 0, max: 460, rapid_mm_min: 42000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 380, y: 205, z: 460 }, tableSurface: { x: 380, y: 205, z: 0 } }, spindleToTable_mm: 460 },
            table: { type: "fixed", length_mm: 900, width_mm: 410, thickness_mm: 65, tSlots: { count: 5, width_mm: 16, spacing_mm: 80 }, maxLoad_kg: 500 },
            geometry: { footprint: { length_mm: 2400, width_mm: 2200, height_mm: 2700 }, workEnvelope: { x_mm: 760, y_mm: 410, z_mm: 460 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 170, length_mm: 350, offset: { x: 0, y: 0, z: -175 } },
                table: { type: "box", dimensions: { x: 900, y: 410, z: 65 }, position: { x: 0, y: 0, z: -65 } } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 1.8 },
            physical: { weight_kg: 5200 }, sources: ["Kitamura Mycenter HX400iG Specifications 2024"]
        },

        "kitamura_mycenter_hx500ig": {
            id: "kitamura_mycenter_hx500ig", manufacturer: "kitamura", model: "Mycenter HX500iG", series: "Mycenter", type: "VMC", subtype: "3-axis", axes: 3, control: "Arumatik-Mi",
            spindle: { type: "motorSpindle", maxRpm: 12000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 140, taper: "BBT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 180, headLength_mm: 380 } },
            travels: { x: { min: 0, max: 1020, rapid_mm_min: 40000 }, y: { min: 0, max: 510, rapid_mm_min: 40000 }, z: { min: 0, max: 510, rapid_mm_min: 40000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 510, y: 255, z: 510 }, tableSurface: { x: 510, y: 255, z: 0 } }, spindleToTable_mm: 510 },
            table: { type: "fixed", length_mm: 1200, width_mm: 510, thickness_mm: 70, tSlots: { count: 5, width_mm: 18, spacing_mm: 100 }, maxLoad_kg: 800 },
            geometry: { footprint: { length_mm: 2900, width_mm: 2500, height_mm: 2850 }, workEnvelope: { x_mm: 1020, y_mm: 510, z_mm: 510 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 380, offset: { x: 0, y: 0, z: -190 } },
                table: { type: "box", dimensions: { x: 1200, y: 510, z: 70 }, position: { x: 0, y: 0, z: -70 } } },
            atc: { type: "arm", capacity: 40, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.0 },
            physical: { weight_kg: 7500 }, sources: ["Kitamura Mycenter HX500iG Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // MYTRUNNION SERIES - 5-AXIS MACHINING CENTERS
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "kitamura_mytrunnion_4g": {
            id: "kitamura_mytrunnion_4g", manufacturer: "kitamura", model: "Mytrunnion-4G", series: "Mytrunnion", type: "5AXIS", subtype: "trunnion", axes: 5, control: "Arumatik-Mi 5X",
            spindle: { type: "motorSpindle", maxRpm: 15000, peakHp: 22, continuousHp: 18, maxTorque_Nm: 85, taper: "BBT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 170, headLength_mm: 360 } },
            travels: { x: { min: 0, max: 550, rapid_mm_min: 48000 }, y: { min: 0, max: 450, rapid_mm_min: 48000 }, z: { min: 0, max: 430, rapid_mm_min: 48000 },
                a: { min: -120, max: 30, rapid_deg_sec: 40 }, c: { min: -360, max: 360, rapid_deg_sec: 150, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", rotationVector: { i: 1, j: 0, k: 0 }, minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 275, y: 225, z: 150 }, pivotToTable_mm: 100, torque_Nm: 400, clampTorque_Nm: 950 },
                    c: { type: "rotary", rotationVector: { i: 0, j: 0, k: 1 }, continuous: true, directDrive: true, torque_Nm: 250, clampTorque_Nm: 600 }
                },
                referencePoints: { spindleGageLine: { x: 275, y: 225, z: 430 }, tableSurface: { x: 275, y: 225, z: 150 }, aPivotPoint: { x: 275, y: 225, z: 150 } },
                tcpcSupported: true, rtcpSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 400, tSlots: { count: 4, width_mm: 14, pattern: "radial" }, maxLoad_kg: 150,
                trunnion: { width_mm: 550, supportHeight_mm: 280, clearanceUnder_mm: 90 } },
            geometry: { footprint: { length_mm: 2700, width_mm: 2900, height_mm: 2800 }, workEnvelope: { x_mm: 550, y_mm: 450, z_mm: 430 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 170, length_mm: 360, offset: { x: 0, y: 0, z: -180 } },
                trunnionLeft: { type: "cylinder", diameter_mm: 220, length_mm: 120, position: { x: -275, y: 225, z: 150 } },
                trunnionRight: { type: "cylinder", diameter_mm: 220, length_mm: 120, position: { x: 275, y: 225, z: 150 } },
                rotaryTable: { type: "cylinder", diameter_mm: 400, height_mm: 75, rotatesWith: ["a", "c"] } },
            atc: { type: "arm", capacity: 40, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 2.0 },
            accuracy: { positioning_mm: 0.002, repeatability_mm: 0.001, aAxisAccuracy_deg: 0.001, cAxisAccuracy_deg: 0.001 },
            physical: { weight_kg: 9000 }, sources: ["Kitamura Mytrunnion-4G Specifications 2024"]
        },

        "kitamura_mytrunnion_5g": {
            id: "kitamura_mytrunnion_5g", manufacturer: "kitamura", model: "Mytrunnion-5G", series: "Mytrunnion", type: "5AXIS", subtype: "trunnion", axes: 5, control: "Arumatik-Mi 5X",
            spindle: { type: "motorSpindle", maxRpm: 12000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 140, taper: "BBT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 190, headLength_mm: 400 } },
            travels: { x: { min: 0, max: 700, rapid_mm_min: 42000 }, y: { min: 0, max: 600, rapid_mm_min: 42000 }, z: { min: 0, max: 510, rapid_mm_min: 42000 },
                a: { min: -120, max: 30, rapid_deg_sec: 35 }, c: { min: -360, max: 360, rapid_deg_sec: 120, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 350, y: 300, z: 180 }, torque_Nm: 650, clampTorque_Nm: 1500 },
                    c: { type: "rotary", continuous: true, directDrive: true, torque_Nm: 380, clampTorque_Nm: 900 }
                },
                referencePoints: { spindleGageLine: { x: 350, y: 300, z: 510 }, tableSurface: { x: 350, y: 300, z: 180 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 500, maxLoad_kg: 300, trunnion: { width_mm: 700, supportHeight_mm: 340 } },
            geometry: { footprint: { length_mm: 3300, width_mm: 3500, height_mm: 3000 }, workEnvelope: { x_mm: 700, y_mm: 600, z_mm: 510 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 190, length_mm: 400, offset: { x: 0, y: 0, z: -200 } },
                rotaryTable: { type: "cylinder", diameter_mm: 500, height_mm: 95, rotatesWith: ["a", "c"] } },
            atc: { type: "arm", capacity: 60, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.2 },
            physical: { weight_kg: 13500 }, sources: ["Kitamura Mytrunnion-5G Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // SUPERCELL SERIES - HORIZONTAL MACHINING CENTERS
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "kitamura_supercell_300g": {
            id: "kitamura_supercell_300g", manufacturer: "kitamura", model: "Supercell-300G", series: "Supercell", type: "HMC", subtype: "4-axis", axes: 4, control: "Arumatik-Mi",
            spindle: { type: "motorSpindle", maxRpm: 15000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 100, taper: "BBT40", orientation: "horizontal",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 180, headLength_mm: 380 } },
            travels: { x: { min: 0, max: 560, rapid_mm_min: 60000 }, y: { min: 0, max: 510, rapid_mm_min: 60000 }, z: { min: 0, max: 510, rapid_mm_min: 60000 },
                b: { min: 0, max: 360, rapid_deg_sec: 90, continuous: true } },
            kinematics: { type: "HMC_4AXIS", chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"], spindleOrientation: "horizontal",
                rotaryAxes: { b: { type: "indexing", continuous: true, directDrive: true, indexIncrement_deg: 0.0001, torque_Nm: 800, clampTorque_Nm: 2000 } } },
            table: { type: "rotary_pallet", size_mm: 300, maxLoad_kg: 150, palletCount: 2, palletChangeTime_sec: 6 },
            geometry: { footprint: { length_mm: 3000, width_mm: 3800, height_mm: 2800 }, workEnvelope: { x_mm: 560, y_mm: 510, z_mm: 510 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 380, orientation: "horizontal" },
                rotaryTable: { type: "box", dimensions: { x: 300, y: 200, z: 300 }, rotatesWith: ["b"] } },
            atc: { type: "chain", capacity: 40, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.0 },
            physical: { weight_kg: 9500 }, sources: ["Kitamura Supercell-300G Specifications 2024"]
        },

        "kitamura_supercell_400g": {
            id: "kitamura_supercell_400g", manufacturer: "kitamura", model: "Supercell-400G", series: "Supercell", type: "HMC", subtype: "4-axis", axes: 4, control: "Arumatik-Mi",
            spindle: { type: "motorSpindle", maxRpm: 14000, peakHp: 35, continuousHp: 30, maxTorque_Nm: 166, taper: "BBT40", orientation: "horizontal",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 200, headLength_mm: 420 } },
            travels: { x: { min: 0, max: 630, rapid_mm_min: 60000 }, y: { min: 0, max: 600, rapid_mm_min: 60000 }, z: { min: 0, max: 600, rapid_mm_min: 60000 },
                b: { min: 0, max: 360, rapid_deg_sec: 80, continuous: true } },
            kinematics: { type: "HMC_4AXIS", chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"], spindleOrientation: "horizontal",
                rotaryAxes: { b: { type: "indexing", continuous: true, directDrive: true, torque_Nm: 1200 } } },
            table: { type: "rotary_pallet", size_mm: 400, maxLoad_kg: 400, palletCount: 2, palletChangeTime_sec: 7 },
            geometry: { footprint: { length_mm: 3500, width_mm: 4200, height_mm: 3000 }, workEnvelope: { x_mm: 630, y_mm: 600, z_mm: 600 } },
            atc: { type: "chain", capacity: 60, maxToolDiameter_mm: 80, maxToolLength_mm: 350, changeTime_sec: 2.2 },
            physical: { weight_kg: 13000 }, sources: ["Kitamura Supercell-400G Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // BRIDGECENTER SERIES - BRIDGE-TYPE VMC
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "kitamura_bridgecenter_8xg": {
            id: "kitamura_bridgecenter_8xg", manufacturer: "kitamura", model: "Bridgecenter-8XG", series: "Bridgecenter", type: "VMC", subtype: "bridge-type", axes: 3, control: "Arumatik-Mi",
            spindle: { type: "motorSpindle", maxRpm: 10000, peakHp: 40, continuousHp: 35, maxTorque_Nm: 280, taper: "BBT50",
                geometry: { noseToGageLine_mm: 139.7, headDiameter_mm: 250, headLength_mm: 480 } },
            travels: { x: { min: 0, max: 1800, rapid_mm_min: 35000 }, y: { min: 0, max: 820, rapid_mm_min: 35000 }, z: { min: 0, max: 700, rapid_mm_min: 30000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_BRIDGE", chain: ["SPINDLE", "Y", "Z", "X", "TABLE", "PART"], configuration: "bridge",
                referencePoints: { spindleGageLine: { x: 900, y: 410, z: 700 }, tableSurface: { x: 900, y: 410, z: 0 } }, spindleToTable_mm: 700 },
            table: { type: "fixed", length_mm: 2000, width_mm: 820, thickness_mm: 100, tSlots: { count: 7, width_mm: 22, spacing_mm: 100 }, maxLoad_kg: 3000 },
            geometry: { footprint: { length_mm: 4500, width_mm: 3500, height_mm: 3500 }, workEnvelope: { x_mm: 1800, y_mm: 820, z_mm: 700 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 250, length_mm: 480, offset: { x: 0, y: 0, z: -240 } },
                table: { type: "box", dimensions: { x: 2000, y: 820, z: 100 }, position: { x: 0, y: 0, z: -100 } },
                bridgeColumn: { type: "box", dimensions: { x: 400, y: 3000, z: 2500 }, position: { x: 0, y: -1500, z: 0 } } },
            atc: { type: "arm", capacity: 60, maxToolDiameter_mm: 125, maxToolLength_mm: 450, changeTime_sec: 3.5 },
            physical: { weight_kg: 22000 }, sources: ["Kitamura Bridgecenter-8XG Specifications 2024"]
        }
    }
};

PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED = PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED;
console.log(`[KITAMURA_DATABASE] Enhanced database loaded with ${PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED.totalMachines} machines`);
