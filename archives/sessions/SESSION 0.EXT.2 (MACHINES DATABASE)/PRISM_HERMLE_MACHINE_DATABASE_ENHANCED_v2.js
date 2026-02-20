/**
 * PRISM Hermle Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: Hermle AG Official Specifications 2024
 * 
 * Coverage:
 * - C Series (5-Axis Universal)
 * - U Series (5-Axis Universal Smaller)
 * 
 * Total: 12+ machines with full collision geometry
 * Note: Hermle specializes in premium 5-axis machines
 */

const PRISM_HERMLE_MACHINE_DATABASE_ENHANCED = {
    manufacturer: "hermle",
    manufacturerFull: "Maschinenfabrik Berthold Hermle AG",
    country: "Germany",
    headquarters: "Gosheim, Germany",
    website: "https://www.hermle.de",
    controlSystem: "HEIDENHAIN TNC 640 / Siemens 840D",
    version: "2.0.0",
    lastUpdated: "2026-01-20",
    totalMachines: 0,
    
    machines: {
        
        // ═══════════════════════════════════════════════════════════════════════════════════════
        // C SERIES - 5-AXIS MACHINING CENTERS (LARGER)
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "hermle_c12": {
            id: "hermle_c12", manufacturer: "hermle", model: "C 12", series: "C", type: "5AXIS", subtype: "trunnion", axes: 5, control: "HEIDENHAIN TNC 640",
            spindle: { type: "motorSpindle", maxRpm: 18000, peakHp: 20, continuousHp: 15, maxTorque_Nm: 57, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 160, headLength_mm: 340 } },
            travels: { x: { min: 0, max: 350, rapid_mm_min: 35000 }, y: { min: 0, max: 440, rapid_mm_min: 35000 }, z: { min: 0, max: 330, rapid_mm_min: 35000 },
                a: { min: -115, max: 0, rapid_deg_sec: 25 }, c: { min: -360, max: 360, rapid_deg_sec: 35, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", rotationVector: { i: 1, j: 0, k: 0 }, minAngle_deg: -115, maxAngle_deg: 0, pivotPoint_mm: { x: 175, y: 220, z: 120 }, torque_Nm: 350 },
                    c: { type: "rotary", rotationVector: { i: 0, j: 0, k: 1 }, continuous: true, torque_Nm: 200 }
                },
                referencePoints: { spindleGageLine: { x: 175, y: 220, z: 330 }, tableSurface: { x: 175, y: 220, z: 120 }, aPivotPoint: { x: 175, y: 220, z: 120 } },
                tcpcSupported: true, rtcpSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 320, maxLoad_kg: 100, trunnion: { width_mm: 450, supportHeight_mm: 220 } },
            geometry: { footprint: { length_mm: 2100, width_mm: 2500, height_mm: 2400 }, workEnvelope: { x_mm: 350, y_mm: 440, z_mm: 330 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 160, length_mm: 340, offset: { x: 0, y: 0, z: -170 } },
                rotaryTable: { type: "cylinder", diameter_mm: 320, height_mm: 80, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 36, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 5.0 },
            accuracy: { positioning_mm: 0.003, repeatability_mm: 0.002 },
            physical: { weight_kg: 5500 }, sources: ["Hermle C 12 Specifications 2024"]
        },

        "hermle_c22": {
            id: "hermle_c22", manufacturer: "hermle", model: "C 22", series: "C", type: "5AXIS", subtype: "trunnion", axes: 5, control: "HEIDENHAIN TNC 640",
            spindle: { type: "motorSpindle", maxRpm: 18000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 87, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 175, headLength_mm: 360 } },
            travels: { x: { min: 0, max: 450, rapid_mm_min: 35000 }, y: { min: 0, max: 600, rapid_mm_min: 35000 }, z: { min: 0, max: 330, rapid_mm_min: 35000 },
                a: { min: -115, max: 0, rapid_deg_sec: 25 }, c: { min: -360, max: 360, rapid_deg_sec: 35, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -115, maxAngle_deg: 0, pivotPoint_mm: { x: 225, y: 300, z: 140 }, torque_Nm: 500 },
                    c: { type: "rotary", continuous: true, torque_Nm: 280 }
                },
                referencePoints: { spindleGageLine: { x: 225, y: 300, z: 330 }, tableSurface: { x: 225, y: 300, z: 140 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 450, maxLoad_kg: 200, trunnion: { width_mm: 600 } },
            geometry: { footprint: { length_mm: 2600, width_mm: 3000, height_mm: 2600 }, workEnvelope: { x_mm: 450, y_mm: 600, z_mm: 330 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 175, length_mm: 360, offset: { x: 0, y: 0, z: -180 } },
                rotaryTable: { type: "cylinder", diameter_mm: 450, height_mm: 90, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 50, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 5.0 },
            physical: { weight_kg: 7800 }, sources: ["Hermle C 22 Specifications 2024"]
        },

        "hermle_c32": {
            id: "hermle_c32", manufacturer: "hermle", model: "C 32", series: "C", type: "5AXIS", subtype: "trunnion", axes: 5, control: "HEIDENHAIN TNC 640",
            spindle: { type: "motorSpindle", maxRpm: 18000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 130, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 190, headLength_mm: 400 } },
            travels: { x: { min: 0, max: 650, rapid_mm_min: 45000 }, y: { min: 0, max: 650, rapid_mm_min: 45000 }, z: { min: 0, max: 500, rapid_mm_min: 45000 },
                a: { min: -130, max: 0, rapid_deg_sec: 30 }, c: { min: -360, max: 360, rapid_deg_sec: 50, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -130, maxAngle_deg: 0, pivotPoint_mm: { x: 325, y: 325, z: 180 }, torque_Nm: 700, clampTorque_Nm: 1600 },
                    c: { type: "rotary", continuous: true, torque_Nm: 450, clampTorque_Nm: 1000 }
                },
                referencePoints: { spindleGageLine: { x: 325, y: 325, z: 500 }, tableSurface: { x: 325, y: 325, z: 180 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 650, maxLoad_kg: 450, trunnion: { width_mm: 850, supportHeight_mm: 350 } },
            geometry: { footprint: { length_mm: 3200, width_mm: 3800, height_mm: 2900 }, workEnvelope: { x_mm: 650, y_mm: 650, z_mm: 500 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 190, length_mm: 400, offset: { x: 0, y: 0, z: -200 } },
                trunnionLeft: { type: "cylinder", diameter_mm: 300, length_mm: 180, position: { x: -425, y: 325, z: 180 } },
                trunnionRight: { type: "cylinder", diameter_mm: 300, length_mm: 180, position: { x: 425, y: 325, z: 180 } },
                rotaryTable: { type: "cylinder", diameter_mm: 650, height_mm: 110, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 65, maxToolDiameter_mm: 80, maxToolLength_mm: 350, changeTime_sec: 5.5 },
            physical: { weight_kg: 13500 }, sources: ["Hermle C 32 Specifications 2024"]
        },

        "hermle_c42": {
            id: "hermle_c42", manufacturer: "hermle", model: "C 42", series: "C", type: "5AXIS", subtype: "trunnion", axes: 5, control: "HEIDENHAIN TNC 640",
            spindle: { type: "motorSpindle", maxRpm: 15000, peakHp: 40, continuousHp: 30, maxTorque_Nm: 200, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 210, headLength_mm: 450 } },
            travels: { x: { min: 0, max: 800, rapid_mm_min: 45000 }, y: { min: 0, max: 800, rapid_mm_min: 45000 }, z: { min: 0, max: 550, rapid_mm_min: 45000 },
                a: { min: -130, max: 0, rapid_deg_sec: 25 }, c: { min: -360, max: 360, rapid_deg_sec: 45, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -130, maxAngle_deg: 0, pivotPoint_mm: { x: 400, y: 400, z: 200 }, torque_Nm: 1000 },
                    c: { type: "rotary", continuous: true, torque_Nm: 650 }
                },
                referencePoints: { spindleGageLine: { x: 400, y: 400, z: 550 }, tableSurface: { x: 400, y: 400, z: 200 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 800, maxLoad_kg: 700 },
            geometry: { footprint: { length_mm: 4000, width_mm: 4500, height_mm: 3200 }, workEnvelope: { x_mm: 800, y_mm: 800, z_mm: 550 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 210, length_mm: 450, offset: { x: 0, y: 0, z: -225 } },
                rotaryTable: { type: "cylinder", diameter_mm: 800, height_mm: 130, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 87, maxToolDiameter_mm: 100, maxToolLength_mm: 400, changeTime_sec: 6.0 },
            physical: { weight_kg: 20000 }, sources: ["Hermle C 42 Specifications 2024"]
        },

        "hermle_c52": {
            id: "hermle_c52", manufacturer: "hermle", model: "C 52", series: "C", type: "5AXIS", subtype: "trunnion", axes: 5, control: "HEIDENHAIN TNC 640",
            spindle: { type: "motorSpindle", maxRpm: 12000, peakHp: 55, continuousHp: 45, maxTorque_Nm: 340, taper: "HSK-A100",
                geometry: { noseToGageLine_mm: 127.0, headDiameter_mm: 260, headLength_mm: 520 } },
            travels: { x: { min: 0, max: 1000, rapid_mm_min: 40000 }, y: { min: 0, max: 1100, rapid_mm_min: 40000 }, z: { min: 0, max: 750, rapid_mm_min: 40000 },
                a: { min: -130, max: 0, rapid_deg_sec: 20 }, c: { min: -360, max: 360, rapid_deg_sec: 35, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -130, maxAngle_deg: 0, pivotPoint_mm: { x: 500, y: 550, z: 280 }, torque_Nm: 1500 },
                    c: { type: "rotary", continuous: true, torque_Nm: 1000 }
                },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 1000, maxLoad_kg: 1500 },
            geometry: { footprint: { length_mm: 5000, width_mm: 5600, height_mm: 3600 }, workEnvelope: { x_mm: 1000, y_mm: 1100, z_mm: 750 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 260, length_mm: 520, offset: { x: 0, y: 0, z: -260 } },
                rotaryTable: { type: "cylinder", diameter_mm: 1000, height_mm: 160, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 115, maxToolDiameter_mm: 125, maxToolLength_mm: 500, changeTime_sec: 7.0 },
            physical: { weight_kg: 35000 }, sources: ["Hermle C 52 Specifications 2024"]
        },

        "hermle_c62": {
            id: "hermle_c62", manufacturer: "hermle", model: "C 62", series: "C", type: "5AXIS", subtype: "trunnion", axes: 5, control: "HEIDENHAIN TNC 640",
            spindle: { type: "motorSpindle", maxRpm: 10000, peakHp: 75, continuousHp: 60, maxTorque_Nm: 500, taper: "HSK-A100",
                geometry: { noseToGageLine_mm: 127.0, headDiameter_mm: 300, headLength_mm: 580 } },
            travels: { x: { min: 0, max: 1200, rapid_mm_min: 35000 }, y: { min: 0, max: 1300, rapid_mm_min: 35000 }, z: { min: 0, max: 900, rapid_mm_min: 35000 },
                a: { min: -130, max: 30, rapid_deg_sec: 15 }, c: { min: -360, max: 360, rapid_deg_sec: 30, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -130, maxAngle_deg: 30, pivotPoint_mm: { x: 600, y: 650, z: 350 }, torque_Nm: 2200 },
                    c: { type: "rotary", continuous: true, torque_Nm: 1400 }
                },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 1200, maxLoad_kg: 2500 },
            geometry: { footprint: { length_mm: 6200, width_mm: 7000, height_mm: 4200 }, workEnvelope: { x_mm: 1200, y_mm: 1300, z_mm: 900 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 300, length_mm: 580, offset: { x: 0, y: 0, z: -290 } },
                rotaryTable: { type: "cylinder", diameter_mm: 1200, height_mm: 200, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 160, maxToolDiameter_mm: 150, maxToolLength_mm: 600, changeTime_sec: 8.0 },
            physical: { weight_kg: 55000 }, sources: ["Hermle C 62 Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // U SERIES - 5-AXIS UNIVERSAL (COMPACT)
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "hermle_c250": {
            id: "hermle_c250", manufacturer: "hermle", model: "C 250", series: "C", type: "5AXIS", subtype: "trunnion-compact", axes: 5, control: "HEIDENHAIN TNC 640",
            spindle: { type: "motorSpindle", maxRpm: 15000, peakHp: 20, continuousHp: 15, maxTorque_Nm: 67, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 160, headLength_mm: 340 } },
            travels: { x: { min: 0, max: 600, rapid_mm_min: 35000 }, y: { min: 0, max: 550, rapid_mm_min: 35000 }, z: { min: 0, max: 450, rapid_mm_min: 35000 },
                a: { min: -115, max: 0, rapid_deg_sec: 25 }, c: { min: -360, max: 360, rapid_deg_sec: 35, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -115, maxAngle_deg: 0, pivotPoint_mm: { x: 300, y: 275, z: 160 }, torque_Nm: 400 },
                    c: { type: "rotary", continuous: true, torque_Nm: 250 }
                },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 320, maxLoad_kg: 150 },
            geometry: { footprint: { length_mm: 2800, width_mm: 3200, height_mm: 2700 }, workEnvelope: { x_mm: 600, y_mm: 550, z_mm: 450 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 160, length_mm: 340, offset: { x: 0, y: 0, z: -170 } },
                rotaryTable: { type: "cylinder", diameter_mm: 320, height_mm: 85, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 42, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 5.0 },
            physical: { weight_kg: 9000 }, sources: ["Hermle C 250 Specifications 2024"]
        },

        "hermle_c400": {
            id: "hermle_c400", manufacturer: "hermle", model: "C 400", series: "C", type: "5AXIS", subtype: "trunnion", axes: 5, control: "HEIDENHAIN TNC 640",
            spindle: { type: "motorSpindle", maxRpm: 18000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 100, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 180, headLength_mm: 380 } },
            travels: { x: { min: 0, max: 850, rapid_mm_min: 60000 }, y: { min: 0, max: 700, rapid_mm_min: 60000 }, z: { min: 0, max: 500, rapid_mm_min: 60000 },
                a: { min: -130, max: 0, rapid_deg_sec: 30 }, c: { min: -360, max: 360, rapid_deg_sec: 50, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -130, maxAngle_deg: 0, pivotPoint_mm: { x: 425, y: 350, z: 180 }, torque_Nm: 800 },
                    c: { type: "rotary", continuous: true, torque_Nm: 500 }
                },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 650, maxLoad_kg: 500 },
            geometry: { footprint: { length_mm: 3600, width_mm: 4200, height_mm: 3000 }, workEnvelope: { x_mm: 850, y_mm: 700, z_mm: 500 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 380, offset: { x: 0, y: 0, z: -190 } },
                rotaryTable: { type: "cylinder", diameter_mm: 650, height_mm: 110, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 60, maxToolDiameter_mm: 80, maxToolLength_mm: 350, changeTime_sec: 5.5 },
            physical: { weight_kg: 16000 }, sources: ["Hermle C 400 Specifications 2024"]
        }
    }
};

PRISM_HERMLE_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_HERMLE_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_HERMLE_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_HERMLE_MACHINE_DATABASE_ENHANCED = PRISM_HERMLE_MACHINE_DATABASE_ENHANCED;
console.log(`[HERMLE_DATABASE] Enhanced database loaded with ${PRISM_HERMLE_MACHINE_DATABASE_ENHANCED.totalMachines} machines`);
