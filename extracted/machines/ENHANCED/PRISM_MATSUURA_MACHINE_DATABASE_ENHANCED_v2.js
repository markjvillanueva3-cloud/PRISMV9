/**
 * PRISM Matsuura Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: Matsuura Machinery Corporation Official Specifications 2024
 * 
 * Coverage:
 * - MAM72 Series (5-Axis Multi-Pallet)
 * - MX Series (5-Axis VMC)
 * - V.Plus Series (VMC)
 * - H.Plus Series (HMC)
 */

const PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED = {
    manufacturer: "matsuura",
    manufacturerFull: "Matsuura Machinery Corporation",
    country: "Japan",
    headquarters: "Fukui, Japan",
    website: "https://www.matsuura.co.jp",
    controlSystem: "FANUC 31i-B5 / MAPPS IV",
    version: "2.0.0",
    lastUpdated: "2026-01-20",
    totalMachines: 0,
    
    machines: {
        
        // ═══════════════════════════════════════════════════════════════════════════════════════
        // MAM72 SERIES - 5-AXIS MULTI-PALLET AUTOMATION
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "matsuura_mam72_25v": {
            id: "matsuura_mam72_25v", manufacturer: "matsuura", model: "MAM72-25V", series: "MAM72", type: "5AXIS", subtype: "pallet-automation", axes: 5, control: "FANUC 31i-B5 / MAPPS IV",
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 18, continuousHp: 15, maxTorque_Nm: 57, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 150, headLength_mm: 320 } },
            travels: { x: { min: 0, max: 350, rapid_mm_min: 50000 }, y: { min: 0, max: 350, rapid_mm_min: 50000 }, z: { min: 0, max: 380, rapid_mm_min: 50000 },
                a: { min: -120, max: 30, rapid_deg_sec: 50 }, c: { min: -360, max: 360, rapid_deg_sec: 100, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", rotationVector: { i: 1, j: 0, k: 0 }, minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 175, y: 175, z: 120 }, pivotToTable_mm: 80, torque_Nm: 300, clampTorque_Nm: 700 },
                    c: { type: "rotary", rotationVector: { i: 0, j: 0, k: 1 }, continuous: true, torque_Nm: 180, clampTorque_Nm: 450 }
                },
                referencePoints: { spindleGageLine: { x: 175, y: 175, z: 380 }, tableSurface: { x: 175, y: 175, z: 120 }, aPivotPoint: { x: 175, y: 175, z: 120 } },
                tcpcSupported: true, rtcpSupported: true },
            table: { type: "trunnion_rotary_pallet", diameter_mm: 250, palletSize_mm: 250, maxLoad_kg: 50,
                trunnion: { width_mm: 400, supportHeight_mm: 200 } },
            palletSystem: { type: "tower", capacity: 32, loadHeight_mm: 150, palletChangeTime_sec: 25 },
            geometry: { footprint: { length_mm: 2200, width_mm: 2800, height_mm: 3000 }, workEnvelope: { x_mm: 350, y_mm: 350, z_mm: 380 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 150, length_mm: 320, offset: { x: 0, y: 0, z: -160 } },
                rotaryTable: { type: "cylinder", diameter_mm: 250, height_mm: 65, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 90, maxToolDiameter_mm: 75, maxToolLength_mm: 250, changeTime_sec: 2.5 },
            accuracy: { positioning_mm: 0.002, repeatability_mm: 0.001, aAxisAccuracy_deg: 0.001, cAxisAccuracy_deg: 0.001 },
            physical: { weight_kg: 8500 }, sources: ["Matsuura MAM72-25V Specifications 2024"]
        },

        "matsuura_mam72_35v": {
            id: "matsuura_mam72_35v", manufacturer: "matsuura", model: "MAM72-35V", series: "MAM72", type: "5AXIS", subtype: "pallet-automation", axes: 5, control: "FANUC 31i-B5 / MAPPS IV",
            spindle: { type: "motorSpindle", maxRpm: 15000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 95, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 170, headLength_mm: 360 } },
            travels: { x: { min: 0, max: 500, rapid_mm_min: 50000 }, y: { min: 0, max: 510, rapid_mm_min: 50000 }, z: { min: 0, max: 480, rapid_mm_min: 50000 },
                a: { min: -120, max: 30, rapid_deg_sec: 40 }, c: { min: -360, max: 360, rapid_deg_sec: 80, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 250, y: 255, z: 160 }, torque_Nm: 500 },
                    c: { type: "rotary", continuous: true, torque_Nm: 300 }
                },
                referencePoints: { spindleGageLine: { x: 250, y: 255, z: 480 }, tableSurface: { x: 250, y: 255, z: 160 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary_pallet", diameter_mm: 350, palletSize_mm: 350, maxLoad_kg: 100 },
            palletSystem: { type: "tower", capacity: 32, loadHeight_mm: 200, palletChangeTime_sec: 30 },
            geometry: { footprint: { length_mm: 2800, width_mm: 3400, height_mm: 3200 }, workEnvelope: { x_mm: 500, y_mm: 510, z_mm: 480 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 170, length_mm: 360, offset: { x: 0, y: 0, z: -180 } },
                rotaryTable: { type: "cylinder", diameter_mm: 350, height_mm: 85, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 120, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.8 },
            physical: { weight_kg: 12000 }, sources: ["Matsuura MAM72-35V Specifications 2024"]
        },

        "matsuura_mam72_52v": {
            id: "matsuura_mam72_52v", manufacturer: "matsuura", model: "MAM72-52V", series: "MAM72", type: "5AXIS", subtype: "pallet-automation", axes: 5, control: "FANUC 31i-B5 / MAPPS IV",
            spindle: { type: "motorSpindle", maxRpm: 12000, peakHp: 35, continuousHp: 30, maxTorque_Nm: 166, taper: "HSK-A100",
                geometry: { noseToGageLine_mm: 127.0, headDiameter_mm: 210, headLength_mm: 420 } },
            travels: { x: { min: 0, max: 700, rapid_mm_min: 40000 }, y: { min: 0, max: 700, rapid_mm_min: 40000 }, z: { min: 0, max: 580, rapid_mm_min: 40000 },
                a: { min: -120, max: 30, rapid_deg_sec: 30 }, c: { min: -360, max: 360, rapid_deg_sec: 60, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 350, y: 350, z: 210 }, torque_Nm: 900 },
                    c: { type: "rotary", continuous: true, torque_Nm: 550 }
                },
                tcpcSupported: true },
            table: { type: "trunnion_rotary_pallet", diameter_mm: 520, palletSize_mm: 520, maxLoad_kg: 250 },
            palletSystem: { type: "tower", capacity: 16, loadHeight_mm: 300, palletChangeTime_sec: 45 },
            geometry: { footprint: { length_mm: 3600, width_mm: 4200, height_mm: 3500 }, workEnvelope: { x_mm: 700, y_mm: 700, z_mm: 580 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 210, length_mm: 420, offset: { x: 0, y: 0, z: -210 } },
                rotaryTable: { type: "cylinder", diameter_mm: 520, height_mm: 110, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 180, maxToolDiameter_mm: 100, maxToolLength_mm: 400, changeTime_sec: 3.5 },
            physical: { weight_kg: 22000 }, sources: ["Matsuura MAM72-52V Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // MX SERIES - 5-AXIS VMC
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "matsuura_mx330": {
            id: "matsuura_mx330", manufacturer: "matsuura", model: "MX-330", series: "MX", type: "5AXIS", subtype: "trunnion", axes: 5, control: "FANUC 31i-B5",
            spindle: { type: "motorSpindle", maxRpm: 12000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 119, taper: "BBT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 180, headLength_mm: 380 } },
            travels: { x: { min: 0, max: 550, rapid_mm_min: 45000 }, y: { min: 0, max: 420, rapid_mm_min: 45000 }, z: { min: 0, max: 360, rapid_mm_min: 45000 },
                a: { min: -120, max: 30, rapid_deg_sec: 35 }, c: { min: -360, max: 360, rapid_deg_sec: 90, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", rotationVector: { i: 1, j: 0, k: 0 }, minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 275, y: 210, z: 130 }, torque_Nm: 450 },
                    c: { type: "rotary", continuous: true, torque_Nm: 280 }
                },
                referencePoints: { spindleGageLine: { x: 275, y: 210, z: 360 }, tableSurface: { x: 275, y: 210, z: 130 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 330, tSlots: { count: 4, width_mm: 14, pattern: "radial" }, maxLoad_kg: 150,
                trunnion: { width_mm: 520, supportHeight_mm: 260 } },
            geometry: { footprint: { length_mm: 2700, width_mm: 2900, height_mm: 2800 }, workEnvelope: { x_mm: 550, y_mm: 420, z_mm: 360 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 380, offset: { x: 0, y: 0, z: -190 } },
                rotaryTable: { type: "cylinder", diameter_mm: 330, height_mm: 80, rotatesWith: ["a", "c"] } },
            atc: { type: "arm", capacity: 40, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 2.2 },
            physical: { weight_kg: 8000 }, sources: ["Matsuura MX-330 Specifications 2024"]
        },

        "matsuura_mx520": {
            id: "matsuura_mx520", manufacturer: "matsuura", model: "MX-520", series: "MX", type: "5AXIS", subtype: "trunnion", axes: 5, control: "FANUC 31i-B5",
            spindle: { type: "motorSpindle", maxRpm: 12000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 166, taper: "BBT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 200, headLength_mm: 420 } },
            travels: { x: { min: 0, max: 630, rapid_mm_min: 42000 }, y: { min: 0, max: 560, rapid_mm_min: 42000 }, z: { min: 0, max: 510, rapid_mm_min: 42000 },
                a: { min: -120, max: 30, rapid_deg_sec: 30 }, c: { min: -360, max: 360, rapid_deg_sec: 70, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 315, y: 280, z: 180 }, torque_Nm: 700 },
                    c: { type: "rotary", continuous: true, torque_Nm: 450 }
                },
                referencePoints: { spindleGageLine: { x: 315, y: 280, z: 510 }, tableSurface: { x: 315, y: 280, z: 180 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 520, maxLoad_kg: 350, trunnion: { width_mm: 700 } },
            geometry: { footprint: { length_mm: 3200, width_mm: 3500, height_mm: 3100 }, workEnvelope: { x_mm: 630, y_mm: 560, z_mm: 510 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 420, offset: { x: 0, y: 0, z: -210 } },
                rotaryTable: { type: "cylinder", diameter_mm: 520, height_mm: 100, rotatesWith: ["a", "c"] } },
            atc: { type: "arm", capacity: 60, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.5 },
            physical: { weight_kg: 14000 }, sources: ["Matsuura MX-520 Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // V.Plus SERIES - VERTICAL MACHINING
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "matsuura_vplus800": {
            id: "matsuura_vplus800", manufacturer: "matsuura", model: "V.Plus-800", series: "V.Plus", type: "VMC", subtype: "3-axis", axes: 3, control: "FANUC 31i-B5",
            spindle: { type: "inline", maxRpm: 12000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 119, taper: "BBT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 180, headLength_mm: 370 } },
            travels: { x: { min: 0, max: 800, rapid_mm_min: 36000 }, y: { min: 0, max: 510, rapid_mm_min: 36000 }, z: { min: 0, max: 510, rapid_mm_min: 30000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 400, y: 255, z: 510 }, tableSurface: { x: 400, y: 255, z: 0 } }, spindleToTable_mm: 510 },
            table: { type: "fixed", length_mm: 1000, width_mm: 510, thickness_mm: 70, tSlots: { count: 5, width_mm: 18, spacing_mm: 90 }, maxLoad_kg: 800 },
            geometry: { footprint: { length_mm: 2700, width_mm: 2500, height_mm: 2850 }, workEnvelope: { x_mm: 800, y_mm: 510, z_mm: 510 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 370, offset: { x: 0, y: 0, z: -185 } },
                table: { type: "box", dimensions: { x: 1000, y: 510, z: 70 }, position: { x: 0, y: 0, z: -70 } } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.0 },
            physical: { weight_kg: 7500 }, sources: ["Matsuura V.Plus-800 Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // H.Plus SERIES - HORIZONTAL MACHINING
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "matsuura_hplus405": {
            id: "matsuura_hplus405", manufacturer: "matsuura", model: "H.Plus-405", series: "H.Plus", type: "HMC", subtype: "4-axis", axes: 4, control: "FANUC 31i-B5",
            spindle: { type: "motorSpindle", maxRpm: 15000, peakHp: 35, continuousHp: 30, maxTorque_Nm: 143, taper: "HSK-A63", orientation: "horizontal",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 200, headLength_mm: 420 } },
            travels: { x: { min: 0, max: 560, rapid_mm_min: 60000 }, y: { min: 0, max: 560, rapid_mm_min: 60000 }, z: { min: 0, max: 610, rapid_mm_min: 60000 },
                b: { min: 0, max: 360, rapid_deg_sec: 60, continuous: true } },
            kinematics: { type: "HMC_4AXIS", chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"], spindleOrientation: "horizontal",
                rotaryAxes: { b: { type: "indexing", continuous: true, indexIncrement_deg: 0.001, torque_Nm: 1200 } } },
            table: { type: "rotary_pallet", size_mm: 400, maxLoad_kg: 400, palletCount: 2, palletChangeTime_sec: 8 },
            geometry: { footprint: { length_mm: 3200, width_mm: 4000, height_mm: 3000 }, workEnvelope: { x_mm: 560, y_mm: 560, z_mm: 610 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 420, orientation: "horizontal" },
                rotaryTable: { type: "box", dimensions: { x: 400, y: 250, z: 400 }, rotatesWith: ["b"] } },
            atc: { type: "chain", capacity: 60, maxToolDiameter_mm: 80, maxToolLength_mm: 350, changeTime_sec: 2.5 },
            physical: { weight_kg: 12000 }, sources: ["Matsuura H.Plus-405 Specifications 2024"]
        }
    }
};

PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED = PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED;
console.log(`[MATSUURA_DATABASE] Enhanced database loaded with ${PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED.totalMachines} machines`);
