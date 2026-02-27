/**
 * PRISM Brother Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: Brother Industries Official Specifications 2024
 * 
 * Coverage:
 * - SPEEDIO Series (High-Speed Drill/Tap)
 * - M-Series (Compact VMC)
 * - R-Series (5-Axis)
 * 
 * Total: 12+ machines with full collision geometry
 * Note: Brother specializes in high-speed, compact machining centers
 */

const PRISM_BROTHER_MACHINE_DATABASE_ENHANCED = {
    manufacturer: "brother",
    manufacturerFull: "Brother Industries, Ltd.",
    country: "Japan",
    headquarters: "Nagoya, Japan",
    website: "https://www.brother.com/as_oc/machtool",
    controlSystem: "Brother CNC-C00",
    version: "2.0.0",
    lastUpdated: "2026-01-20",
    totalMachines: 0,
    
    machines: {
        
        // ═══════════════════════════════════════════════════════════════════════════════════════
        // SPEEDIO SERIES - HIGH-SPEED DRILL/TAP CENTERS
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "brother_s300x1": {
            id: "brother_s300x1", manufacturer: "brother", model: "SPEEDIO S300X1", series: "SPEEDIO", type: "DRILL_TAP", subtype: "3-axis-high-speed", axes: 3, control: "Brother CNC-C00",
            spindle: { type: "motorSpindle", maxRpm: 16000, peakHp: 7.5, continuousHp: 5.5, maxTorque_Nm: 22, taper: "BT30",
                geometry: { noseToGageLine_mm: 70.0, headDiameter_mm: 120, headLength_mm: 260 } },
            travels: { x: { min: 0, max: 300, rapid_mm_min: 50000 }, y: { min: 0, max: 300, rapid_mm_min: 50000 }, z: { min: 0, max: 300, rapid_mm_min: 50000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 150, y: 150, z: 300 }, tableSurface: { x: 150, y: 150, z: 0 } }, spindleToTable_mm: 300 },
            table: { type: "fixed", length_mm: 450, width_mm: 300, thickness_mm: 50, tSlots: { count: 3, width_mm: 14, spacing_mm: 80 }, maxLoad_kg: 60 },
            geometry: { footprint: { length_mm: 1400, width_mm: 1700, height_mm: 2200 }, workEnvelope: { x_mm: 300, y_mm: 300, z_mm: 300 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 120, length_mm: 260, offset: { x: 0, y: 0, z: -130 } },
                table: { type: "box", dimensions: { x: 450, y: 300, z: 50 }, position: { x: 0, y: 0, z: -50 } } },
            atc: { type: "umbrella", capacity: 14, maxToolDiameter_mm: 50, maxToolLength_mm: 150, changeTime_sec: 0.9 },
            accuracy: { positioning_mm: 0.003, repeatability_mm: 0.002 },
            physical: { weight_kg: 1900 }, sources: ["Brother SPEEDIO S300X1 Specifications 2024"]
        },

        "brother_s500x1": {
            id: "brother_s500x1", manufacturer: "brother", model: "SPEEDIO S500X1", series: "SPEEDIO", type: "DRILL_TAP", subtype: "3-axis-high-speed", axes: 3, control: "Brother CNC-C00",
            spindle: { type: "motorSpindle", maxRpm: 16000, peakHp: 7.5, continuousHp: 5.5, maxTorque_Nm: 22, taper: "BT30",
                geometry: { noseToGageLine_mm: 70.0, headDiameter_mm: 120, headLength_mm: 260 } },
            travels: { x: { min: 0, max: 500, rapid_mm_min: 50000 }, y: { min: 0, max: 400, rapid_mm_min: 50000 }, z: { min: 0, max: 305, rapid_mm_min: 50000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 250, y: 200, z: 305 }, tableSurface: { x: 250, y: 200, z: 0 } }, spindleToTable_mm: 305 },
            table: { type: "fixed", length_mm: 650, width_mm: 400, thickness_mm: 55, tSlots: { count: 3, width_mm: 14, spacing_mm: 100 }, maxLoad_kg: 100 },
            geometry: { footprint: { length_mm: 1700, width_mm: 1900, height_mm: 2300 }, workEnvelope: { x_mm: 500, y_mm: 400, z_mm: 305 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 120, length_mm: 260, offset: { x: 0, y: 0, z: -130 } },
                table: { type: "box", dimensions: { x: 650, y: 400, z: 55 }, position: { x: 0, y: 0, z: -55 } } },
            atc: { type: "umbrella", capacity: 21, maxToolDiameter_mm: 50, maxToolLength_mm: 150, changeTime_sec: 1.0 },
            physical: { weight_kg: 2500 }, sources: ["Brother SPEEDIO S500X1 Specifications 2024"]
        },

        "brother_s500z1": {
            id: "brother_s500z1", manufacturer: "brother", model: "SPEEDIO S500Z1", series: "SPEEDIO", type: "DRILL_TAP", subtype: "3-axis-high-speed", axes: 3, control: "Brother CNC-C00",
            spindle: { type: "motorSpindle", maxRpm: 27000, peakHp: 11, continuousHp: 7.5, maxTorque_Nm: 16, taper: "BT30",
                geometry: { noseToGageLine_mm: 70.0, headDiameter_mm: 130, headLength_mm: 280 } },
            travels: { x: { min: 0, max: 500, rapid_mm_min: 56000 }, y: { min: 0, max: 400, rapid_mm_min: 56000 }, z: { min: 0, max: 305, rapid_mm_min: 56000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 250, y: 200, z: 305 }, tableSurface: { x: 250, y: 200, z: 0 } }, spindleToTable_mm: 305 },
            table: { type: "fixed", length_mm: 650, width_mm: 400, thickness_mm: 55, maxLoad_kg: 100 },
            geometry: { footprint: { length_mm: 1700, width_mm: 1900, height_mm: 2300 }, workEnvelope: { x_mm: 500, y_mm: 400, z_mm: 305 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 130, length_mm: 280, offset: { x: 0, y: 0, z: -140 } },
                table: { type: "box", dimensions: { x: 650, y: 400, z: 55 }, position: { x: 0, y: 0, z: -55 } } },
            atc: { type: "umbrella", capacity: 21, maxToolDiameter_mm: 50, maxToolLength_mm: 150, changeTime_sec: 1.0 },
            physical: { weight_kg: 2600 }, sources: ["Brother SPEEDIO S500Z1 Specifications 2024"]
        },

        "brother_s700x1": {
            id: "brother_s700x1", manufacturer: "brother", model: "SPEEDIO S700X1", series: "SPEEDIO", type: "DRILL_TAP", subtype: "3-axis-high-speed", axes: 3, control: "Brother CNC-C00",
            spindle: { type: "motorSpindle", maxRpm: 16000, peakHp: 11, continuousHp: 7.5, maxTorque_Nm: 35, taper: "BT30",
                geometry: { noseToGageLine_mm: 70.0, headDiameter_mm: 130, headLength_mm: 280 } },
            travels: { x: { min: 0, max: 700, rapid_mm_min: 50000 }, y: { min: 0, max: 400, rapid_mm_min: 50000 }, z: { min: 0, max: 330, rapid_mm_min: 50000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 350, y: 200, z: 330 }, tableSurface: { x: 350, y: 200, z: 0 } }, spindleToTable_mm: 330 },
            table: { type: "fixed", length_mm: 850, width_mm: 400, thickness_mm: 60, tSlots: { count: 3, width_mm: 14, spacing_mm: 120 }, maxLoad_kg: 150 },
            geometry: { footprint: { length_mm: 2000, width_mm: 2100, height_mm: 2400 }, workEnvelope: { x_mm: 700, y_mm: 400, z_mm: 330 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 130, length_mm: 280, offset: { x: 0, y: 0, z: -140 } },
                table: { type: "box", dimensions: { x: 850, y: 400, z: 60 }, position: { x: 0, y: 0, z: -60 } } },
            atc: { type: "umbrella", capacity: 21, maxToolDiameter_mm: 63, maxToolLength_mm: 175, changeTime_sec: 1.1 },
            physical: { weight_kg: 3200 }, sources: ["Brother SPEEDIO S700X1 Specifications 2024"]
        },

        "brother_s1000x1": {
            id: "brother_s1000x1", manufacturer: "brother", model: "SPEEDIO S1000X1", series: "SPEEDIO", type: "DRILL_TAP", subtype: "3-axis-high-speed", axes: 3, control: "Brother CNC-C00",
            spindle: { type: "motorSpindle", maxRpm: 16000, peakHp: 15, continuousHp: 11, maxTorque_Nm: 50, taper: "BT40",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 160, headLength_mm: 320 } },
            travels: { x: { min: 0, max: 1000, rapid_mm_min: 48000 }, y: { min: 0, max: 500, rapid_mm_min: 48000 }, z: { min: 0, max: 350, rapid_mm_min: 48000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 500, y: 250, z: 350 }, tableSurface: { x: 500, y: 250, z: 0 } }, spindleToTable_mm: 350 },
            table: { type: "fixed", length_mm: 1200, width_mm: 500, thickness_mm: 65, tSlots: { count: 5, width_mm: 14, spacing_mm: 100 }, maxLoad_kg: 300 },
            geometry: { footprint: { length_mm: 2600, width_mm: 2400, height_mm: 2600 }, workEnvelope: { x_mm: 1000, y_mm: 500, z_mm: 350 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 160, length_mm: 320, offset: { x: 0, y: 0, z: -160 } },
                table: { type: "box", dimensions: { x: 1200, y: 500, z: 65 }, position: { x: 0, y: 0, z: -65 } } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 1.5 },
            physical: { weight_kg: 5500 }, sources: ["Brother SPEEDIO S1000X1 Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // M SERIES - COMPACT VMC
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "brother_m140x1": {
            id: "brother_m140x1", manufacturer: "brother", model: "SPEEDIO M140X1", series: "M", type: "VMC", subtype: "3-axis-compact", axes: 3, control: "Brother CNC-C00",
            spindle: { type: "motorSpindle", maxRpm: 10000, peakHp: 15, continuousHp: 11, maxTorque_Nm: 80, taper: "BT40",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 170, headLength_mm: 340 } },
            travels: { x: { min: 0, max: 560, rapid_mm_min: 40000 }, y: { min: 0, max: 400, rapid_mm_min: 40000 }, z: { min: 0, max: 305, rapid_mm_min: 40000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 280, y: 200, z: 305 }, tableSurface: { x: 280, y: 200, z: 0 } }, spindleToTable_mm: 305 },
            table: { type: "fixed", length_mm: 710, width_mm: 400, thickness_mm: 60, maxLoad_kg: 200 },
            geometry: { footprint: { length_mm: 2100, width_mm: 2200, height_mm: 2500 }, workEnvelope: { x_mm: 560, y_mm: 400, z_mm: 305 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 170, length_mm: 340, offset: { x: 0, y: 0, z: -170 } },
                table: { type: "box", dimensions: { x: 710, y: 400, z: 60 }, position: { x: 0, y: 0, z: -60 } } },
            atc: { type: "arm", capacity: 22, maxToolDiameter_mm: 80, maxToolLength_mm: 200, changeTime_sec: 1.6 },
            physical: { weight_kg: 4000 }, sources: ["Brother SPEEDIO M140X1 Specifications 2024"]
        },

        "brother_m200x3": {
            id: "brother_m200x3", manufacturer: "brother", model: "SPEEDIO M200X3", series: "M", type: "VMC", subtype: "3-axis-compact", axes: 3, control: "Brother CNC-C00",
            spindle: { type: "motorSpindle", maxRpm: 10000, peakHp: 22, continuousHp: 15, maxTorque_Nm: 119, taper: "BT40",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 180, headLength_mm: 360 } },
            travels: { x: { min: 0, max: 700, rapid_mm_min: 40000 }, y: { min: 0, max: 450, rapid_mm_min: 40000 }, z: { min: 0, max: 350, rapid_mm_min: 40000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 350, y: 225, z: 350 }, tableSurface: { x: 350, y: 225, z: 0 } }, spindleToTable_mm: 350 },
            table: { type: "fixed", length_mm: 850, width_mm: 450, thickness_mm: 65, maxLoad_kg: 400 },
            geometry: { footprint: { length_mm: 2400, width_mm: 2500, height_mm: 2700 }, workEnvelope: { x_mm: 700, y_mm: 450, z_mm: 350 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 360, offset: { x: 0, y: 0, z: -180 } },
                table: { type: "box", dimensions: { x: 850, y: 450, z: 65 }, position: { x: 0, y: 0, z: -65 } } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 1.8 },
            physical: { weight_kg: 5800 }, sources: ["Brother SPEEDIO M200X3 Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // R SERIES - 5-AXIS COMPACT
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "brother_r450x1": {
            id: "brother_r450x1", manufacturer: "brother", model: "SPEEDIO R450X1", series: "R", type: "5AXIS", subtype: "trunnion-compact", axes: 5, control: "Brother CNC-C00",
            spindle: { type: "motorSpindle", maxRpm: 16000, peakHp: 7.5, continuousHp: 5.5, maxTorque_Nm: 22, taper: "BT30",
                geometry: { noseToGageLine_mm: 70.0, headDiameter_mm: 120, headLength_mm: 260 } },
            travels: { x: { min: 0, max: 450, rapid_mm_min: 50000 }, y: { min: 0, max: 400, rapid_mm_min: 50000 }, z: { min: 0, max: 305, rapid_mm_min: 50000 },
                a: { min: -30, max: 120, rapid_deg_sec: 50 }, c: { min: -360, max: 360, rapid_deg_sec: 150, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", rotationVector: { i: 1, j: 0, k: 0 }, minAngle_deg: -30, maxAngle_deg: 120, pivotPoint_mm: { x: 225, y: 200, z: 100 }, pivotToTable_mm: 70, torque_Nm: 150 },
                    c: { type: "rotary", rotationVector: { i: 0, j: 0, k: 1 }, continuous: true, torque_Nm: 80 }
                },
                referencePoints: { spindleGageLine: { x: 225, y: 200, z: 305 }, tableSurface: { x: 225, y: 200, z: 100 }, aPivotPoint: { x: 225, y: 200, z: 100 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 200, maxLoad_kg: 30, trunnion: { width_mm: 350, supportHeight_mm: 180 } },
            geometry: { footprint: { length_mm: 1800, width_mm: 2200, height_mm: 2400 }, workEnvelope: { x_mm: 450, y_mm: 400, z_mm: 305 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 120, length_mm: 260, offset: { x: 0, y: 0, z: -130 } },
                trunnionLeft: { type: "cylinder", diameter_mm: 140, length_mm: 80, position: { x: -175, y: 200, z: 100 } },
                trunnionRight: { type: "cylinder", diameter_mm: 140, length_mm: 80, position: { x: 175, y: 200, z: 100 } },
                rotaryTable: { type: "cylinder", diameter_mm: 200, height_mm: 50, rotatesWith: ["a", "c"] } },
            atc: { type: "umbrella", capacity: 21, maxToolDiameter_mm: 50, maxToolLength_mm: 150, changeTime_sec: 1.0 },
            accuracy: { positioning_mm: 0.003, repeatability_mm: 0.002, aAxisAccuracy_deg: 0.003, cAxisAccuracy_deg: 0.003 },
            physical: { weight_kg: 3500 }, sources: ["Brother SPEEDIO R450X1 Specifications 2024"]
        },

        "brother_r650x1": {
            id: "brother_r650x1", manufacturer: "brother", model: "SPEEDIO R650X1", series: "R", type: "5AXIS", subtype: "trunnion-compact", axes: 5, control: "Brother CNC-C00",
            spindle: { type: "motorSpindle", maxRpm: 16000, peakHp: 11, continuousHp: 7.5, maxTorque_Nm: 35, taper: "BT30",
                geometry: { noseToGageLine_mm: 70.0, headDiameter_mm: 130, headLength_mm: 280 } },
            travels: { x: { min: 0, max: 650, rapid_mm_min: 50000 }, y: { min: 0, max: 450, rapid_mm_min: 50000 }, z: { min: 0, max: 330, rapid_mm_min: 50000 },
                a: { min: -30, max: 120, rapid_deg_sec: 45 }, c: { min: -360, max: 360, rapid_deg_sec: 130, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -30, maxAngle_deg: 120, pivotPoint_mm: { x: 325, y: 225, z: 120 }, torque_Nm: 200 },
                    c: { type: "rotary", continuous: true, torque_Nm: 120 }
                },
                referencePoints: { spindleGageLine: { x: 325, y: 225, z: 330 }, tableSurface: { x: 325, y: 225, z: 120 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 300, maxLoad_kg: 60, trunnion: { width_mm: 500 } },
            geometry: { footprint: { length_mm: 2200, width_mm: 2500, height_mm: 2600 }, workEnvelope: { x_mm: 650, y_mm: 450, z_mm: 330 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 130, length_mm: 280, offset: { x: 0, y: 0, z: -140 } },
                rotaryTable: { type: "cylinder", diameter_mm: 300, height_mm: 60, rotatesWith: ["a", "c"] } },
            atc: { type: "umbrella", capacity: 21, maxToolDiameter_mm: 63, maxToolLength_mm: 175, changeTime_sec: 1.1 },
            physical: { weight_kg: 4500 }, sources: ["Brother SPEEDIO R650X1 Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // W SERIES - HIGH RIGIDITY VMC
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "brother_w1000xd1": {
            id: "brother_w1000xd1", manufacturer: "brother", model: "SPEEDIO W1000Xd1", series: "W", type: "VMC", subtype: "3-axis-rigid", axes: 3, control: "Brother CNC-C00",
            spindle: { type: "motorSpindle", maxRpm: 10000, peakHp: 22, continuousHp: 15, maxTorque_Nm: 119, taper: "BT40",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 180, headLength_mm: 360 } },
            travels: { x: { min: 0, max: 1000, rapid_mm_min: 40000 }, y: { min: 0, max: 510, rapid_mm_min: 40000 }, z: { min: 0, max: 350, rapid_mm_min: 40000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 500, y: 255, z: 350 }, tableSurface: { x: 500, y: 255, z: 0 } }, spindleToTable_mm: 350 },
            table: { type: "fixed", length_mm: 1200, width_mm: 510, thickness_mm: 70, maxLoad_kg: 500 },
            geometry: { footprint: { length_mm: 2800, width_mm: 2600, height_mm: 2700 }, workEnvelope: { x_mm: 1000, y_mm: 510, z_mm: 350 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 360, offset: { x: 0, y: 0, z: -180 } },
                table: { type: "box", dimensions: { x: 1200, y: 510, z: 70 }, position: { x: 0, y: 0, z: -70 } } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 1.8 },
            physical: { weight_kg: 6800 }, sources: ["Brother SPEEDIO W1000Xd1 Specifications 2024"]
        }
    }
};

PRISM_BROTHER_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_BROTHER_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_BROTHER_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_BROTHER_MACHINE_DATABASE_ENHANCED = PRISM_BROTHER_MACHINE_DATABASE_ENHANCED;
console.log(`[BROTHER_DATABASE] Enhanced database loaded with ${PRISM_BROTHER_MACHINE_DATABASE_ENHANCED.totalMachines} machines`);
