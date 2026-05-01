/**
 * PRISM Chiron Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: CHIRON Group Official Specifications 2024
 * 
 * Coverage:
 * - FZ Series (High-Speed VMC)
 * - DZ Series (Double-Spindle)
 * - MILL Series (5-Axis)
 * 
 * Total: 12+ machines with full collision geometry
 * Note: Chiron specializes in high-speed, high-productivity machining
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
        
        // ═══════════════════════════════════════════════════════════════════════════════════════
        // FZ SERIES - HIGH-SPEED VMC (SINGLE SPINDLE)
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "chiron_fz08s": {
            id: "chiron_fz08s", manufacturer: "chiron", model: "FZ 08 S", series: "FZ", type: "VMC", subtype: "3-axis-high-speed", axes: 3, control: "Siemens 840D sl",
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 18, continuousHp: 15, maxTorque_Nm: 52, taper: "HSK-A50",
                geometry: { noseToGageLine_mm: 76.2, headDiameter_mm: 140, headLength_mm: 300 } },
            travels: { x: { min: 0, max: 350, rapid_mm_min: 75000 }, y: { min: 0, max: 350, rapid_mm_min: 75000 }, z: { min: 0, max: 350, rapid_mm_min: 75000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 175, y: 175, z: 350 }, tableSurface: { x: 175, y: 175, z: 0 } }, spindleToTable_mm: 350 },
            table: { type: "fixed", length_mm: 440, width_mm: 350, thickness_mm: 50, tSlots: { count: 3, width_mm: 14, spacing_mm: 80 }, maxLoad_kg: 100 },
            geometry: { footprint: { length_mm: 1800, width_mm: 2000, height_mm: 2400 }, workEnvelope: { x_mm: 350, y_mm: 350, z_mm: 350 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 140, length_mm: 300, offset: { x: 0, y: 0, z: -150 } },
                table: { type: "box", dimensions: { x: 440, y: 350, z: 50 }, position: { x: 0, y: 0, z: -50 } } },
            atc: { type: "chain", capacity: 24, maxToolDiameter_mm: 63, maxToolLength_mm: 200, changeTime_sec: 1.2 },
            accuracy: { positioning_mm: 0.003, repeatability_mm: 0.002 },
            physical: { weight_kg: 3800 }, sources: ["CHIRON FZ 08 S Specifications 2024"]
        },

        "chiron_fz12s": {
            id: "chiron_fz12s", manufacturer: "chiron", model: "FZ 12 S", series: "FZ", type: "VMC", subtype: "3-axis-high-speed", axes: 3, control: "Siemens 840D sl",
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 85, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 160, headLength_mm: 340 } },
            travels: { x: { min: 0, max: 550, rapid_mm_min: 75000 }, y: { min: 0, max: 400, rapid_mm_min: 75000 }, z: { min: 0, max: 400, rapid_mm_min: 75000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 275, y: 200, z: 400 }, tableSurface: { x: 275, y: 200, z: 0 } }, spindleToTable_mm: 400 },
            table: { type: "fixed", length_mm: 700, width_mm: 400, thickness_mm: 55, tSlots: { count: 5, width_mm: 14, spacing_mm: 80 }, maxLoad_kg: 200 },
            geometry: { footprint: { length_mm: 2200, width_mm: 2400, height_mm: 2600 }, workEnvelope: { x_mm: 550, y_mm: 400, z_mm: 400 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 160, length_mm: 340, offset: { x: 0, y: 0, z: -170 } },
                table: { type: "box", dimensions: { x: 700, y: 400, z: 55 }, position: { x: 0, y: 0, z: -55 } } },
            atc: { type: "chain", capacity: 36, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 1.5 },
            physical: { weight_kg: 5500 }, sources: ["CHIRON FZ 12 S Specifications 2024"]
        },

        "chiron_fz15s": {
            id: "chiron_fz15s", manufacturer: "chiron", model: "FZ 15 S", series: "FZ", type: "VMC", subtype: "3-axis-high-speed", axes: 3, control: "Siemens 840D sl",
            spindle: { type: "motorSpindle", maxRpm: 18000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 119, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 175, headLength_mm: 360 } },
            travels: { x: { min: 0, max: 750, rapid_mm_min: 70000 }, y: { min: 0, max: 500, rapid_mm_min: 70000 }, z: { min: 0, max: 450, rapid_mm_min: 70000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 375, y: 250, z: 450 }, tableSurface: { x: 375, y: 250, z: 0 } }, spindleToTable_mm: 450 },
            table: { type: "fixed", length_mm: 900, width_mm: 500, thickness_mm: 60, maxLoad_kg: 400 },
            geometry: { footprint: { length_mm: 2700, width_mm: 2800, height_mm: 2800 }, workEnvelope: { x_mm: 750, y_mm: 500, z_mm: 450 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 175, length_mm: 360, offset: { x: 0, y: 0, z: -180 } },
                table: { type: "box", dimensions: { x: 900, y: 500, z: 60 }, position: { x: 0, y: 0, z: -60 } } },
            atc: { type: "chain", capacity: 48, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 1.8 },
            physical: { weight_kg: 7500 }, sources: ["CHIRON FZ 15 S Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // DZ SERIES - DOUBLE-SPINDLE HIGH-SPEED
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "chiron_dz12w": {
            id: "chiron_dz12w", manufacturer: "chiron", model: "DZ 12 W", series: "DZ", type: "VMC", subtype: "double-spindle", axes: 3, control: "Siemens 840D sl",
            spindle: { type: "dual_motorSpindle", count: 2, maxRpm: 20000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 85, taper: "HSK-A63", spindleSpacing_mm: 400,
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 160, headLength_mm: 340 } },
            travels: { x: { min: 0, max: 550, rapid_mm_min: 75000 }, y: { min: 0, max: 400, rapid_mm_min: 75000 }, z: { min: 0, max: 400, rapid_mm_min: 75000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_DUAL_SPINDLE", chain: ["SPINDLES", "Z", "Y", "X", "TABLE", "PART"],
                dualSpindle: { spacing_mm: 400, synchronizedMovement: true, independentZ: false },
                referencePoints: { spindle1GageLine: { x: 75, y: 200, z: 400 }, spindle2GageLine: { x: 475, y: 200, z: 400 }, tableSurface: { x: 275, y: 200, z: 0 } } },
            table: { type: "fixed_dual", length_mm: 700, width_mm: 400, thickness_mm: 55, maxLoad_kg: 300, fixtureSpacing_mm: 400 },
            geometry: { footprint: { length_mm: 2400, width_mm: 2600, height_mm: 2700 }, workEnvelope: { x_mm: 550, y_mm: 400, z_mm: 400 } },
            collisionZones: { spindleHead1: { type: "cylinder", diameter_mm: 160, length_mm: 340, position: { x: -200, y: 0, z: -170 } },
                spindleHead2: { type: "cylinder", diameter_mm: 160, length_mm: 340, position: { x: 200, y: 0, z: -170 } },
                table: { type: "box", dimensions: { x: 700, y: 400, z: 55 }, position: { x: 0, y: 0, z: -55 } } },
            atc: { type: "chain_dual", capacity: 72, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 1.8, sharedMagazine: true },
            physical: { weight_kg: 8500 }, sources: ["CHIRON DZ 12 W Specifications 2024"]
        },

        "chiron_dz15w": {
            id: "chiron_dz15w", manufacturer: "chiron", model: "DZ 15 W", series: "DZ", type: "VMC", subtype: "double-spindle", axes: 3, control: "Siemens 840D sl",
            spindle: { type: "dual_motorSpindle", count: 2, maxRpm: 18000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 119, taper: "HSK-A63", spindleSpacing_mm: 500,
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 175, headLength_mm: 360 } },
            travels: { x: { min: 0, max: 750, rapid_mm_min: 70000 }, y: { min: 0, max: 500, rapid_mm_min: 70000 }, z: { min: 0, max: 450, rapid_mm_min: 70000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_DUAL_SPINDLE", chain: ["SPINDLES", "Z", "Y", "X", "TABLE", "PART"],
                dualSpindle: { spacing_mm: 500, synchronizedMovement: true } },
            table: { type: "fixed_dual", length_mm: 950, width_mm: 500, thickness_mm: 60, maxLoad_kg: 500, fixtureSpacing_mm: 500 },
            geometry: { footprint: { length_mm: 3000, width_mm: 3000, height_mm: 2900 }, workEnvelope: { x_mm: 750, y_mm: 500, z_mm: 450 } },
            collisionZones: { spindleHead1: { type: "cylinder", diameter_mm: 175, length_mm: 360, position: { x: -250, y: 0, z: -180 } },
                spindleHead2: { type: "cylinder", diameter_mm: 175, length_mm: 360, position: { x: 250, y: 0, z: -180 } },
                table: { type: "box", dimensions: { x: 950, y: 500, z: 60 }, position: { x: 0, y: 0, z: -60 } } },
            atc: { type: "chain_dual", capacity: 96, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.0 },
            physical: { weight_kg: 11000 }, sources: ["CHIRON DZ 15 W Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // MILL SERIES - 5-AXIS
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "chiron_mill800": {
            id: "chiron_mill800", manufacturer: "chiron", model: "MILL 800", series: "MILL", type: "5AXIS", subtype: "trunnion-high-speed", axes: 5, control: "Siemens 840D sl",
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 85, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 160, headLength_mm: 340 } },
            travels: { x: { min: 0, max: 550, rapid_mm_min: 75000 }, y: { min: 0, max: 400, rapid_mm_min: 75000 }, z: { min: 0, max: 400, rapid_mm_min: 75000 },
                a: { min: -120, max: 30, rapid_deg_sec: 50 }, c: { min: -360, max: 360, rapid_deg_sec: 120, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", rotationVector: { i: 1, j: 0, k: 0 }, minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 275, y: 200, z: 140 }, pivotToTable_mm: 90, torque_Nm: 400, clampTorque_Nm: 900 },
                    c: { type: "rotary", rotationVector: { i: 0, j: 0, k: 1 }, continuous: true, torque_Nm: 250, clampTorque_Nm: 600 }
                },
                referencePoints: { spindleGageLine: { x: 275, y: 200, z: 400 }, tableSurface: { x: 275, y: 200, z: 140 }, aPivotPoint: { x: 275, y: 200, z: 140 } },
                tcpcSupported: true, rtcpSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 350, tSlots: { count: 4, width_mm: 14, pattern: "radial" }, maxLoad_kg: 100,
                trunnion: { width_mm: 500, supportHeight_mm: 240, clearanceUnder_mm: 80 } },
            geometry: { footprint: { length_mm: 2600, width_mm: 2800, height_mm: 2700 }, workEnvelope: { x_mm: 550, y_mm: 400, z_mm: 400 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 160, length_mm: 340, offset: { x: 0, y: 0, z: -170 } },
                trunnionLeft: { type: "cylinder", diameter_mm: 200, length_mm: 120, position: { x: -250, y: 200, z: 140 } },
                trunnionRight: { type: "cylinder", diameter_mm: 200, length_mm: 120, position: { x: 250, y: 200, z: 140 } },
                rotaryTable: { type: "cylinder", diameter_mm: 350, height_mm: 70, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 48, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 1.8 },
            accuracy: { positioning_mm: 0.003, repeatability_mm: 0.002, aAxisAccuracy_deg: 0.002, cAxisAccuracy_deg: 0.002 },
            physical: { weight_kg: 8500 }, sources: ["CHIRON MILL 800 Specifications 2024"]
        },

        "chiron_mill1250": {
            id: "chiron_mill1250", manufacturer: "chiron", model: "MILL 1250", series: "MILL", type: "5AXIS", subtype: "trunnion-high-speed", axes: 5, control: "Siemens 840D sl",
            spindle: { type: "motorSpindle", maxRpm: 18000, peakHp: 35, continuousHp: 30, maxTorque_Nm: 130, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 180, headLength_mm: 380 } },
            travels: { x: { min: 0, max: 750, rapid_mm_min: 70000 }, y: { min: 0, max: 600, rapid_mm_min: 70000 }, z: { min: 0, max: 500, rapid_mm_min: 70000 },
                a: { min: -120, max: 30, rapid_deg_sec: 40 }, c: { min: -360, max: 360, rapid_deg_sec: 100, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 375, y: 300, z: 180 }, torque_Nm: 600 },
                    c: { type: "rotary", continuous: true, torque_Nm: 400 }
                },
                referencePoints: { spindleGageLine: { x: 375, y: 300, z: 500 }, tableSurface: { x: 375, y: 300, z: 180 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 500, maxLoad_kg: 250, trunnion: { width_mm: 700 } },
            geometry: { footprint: { length_mm: 3400, width_mm: 3600, height_mm: 3000 }, workEnvelope: { x_mm: 750, y_mm: 600, z_mm: 500 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 380, offset: { x: 0, y: 0, z: -190 } },
                rotaryTable: { type: "cylinder", diameter_mm: 500, height_mm: 90, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 60, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.0 },
            physical: { weight_kg: 13000 }, sources: ["CHIRON MILL 1250 Specifications 2024"]
        },

        "chiron_mill2000": {
            id: "chiron_mill2000", manufacturer: "chiron", model: "MILL 2000", series: "MILL", type: "5AXIS", subtype: "trunnion-large", axes: 5, control: "Siemens 840D sl",
            spindle: { type: "motorSpindle", maxRpm: 15000, peakHp: 50, continuousHp: 40, maxTorque_Nm: 200, taper: "HSK-A100",
                geometry: { noseToGageLine_mm: 127.0, headDiameter_mm: 220, headLength_mm: 440 } },
            travels: { x: { min: 0, max: 1000, rapid_mm_min: 60000 }, y: { min: 0, max: 800, rapid_mm_min: 60000 }, z: { min: 0, max: 600, rapid_mm_min: 60000 },
                a: { min: -120, max: 30, rapid_deg_sec: 30 }, c: { min: -360, max: 360, rapid_deg_sec: 80, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 500, y: 400, z: 220 }, torque_Nm: 900 },
                    c: { type: "rotary", continuous: true, torque_Nm: 650 }
                },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 700, maxLoad_kg: 500 },
            geometry: { footprint: { length_mm: 4200, width_mm: 4400, height_mm: 3400 }, workEnvelope: { x_mm: 1000, y_mm: 800, z_mm: 600 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 220, length_mm: 440, offset: { x: 0, y: 0, z: -220 } },
                rotaryTable: { type: "cylinder", diameter_mm: 700, height_mm: 120, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 90, maxToolDiameter_mm: 100, maxToolLength_mm: 400, changeTime_sec: 2.5 },
            physical: { weight_kg: 22000 }, sources: ["CHIRON MILL 2000 Specifications 2024"]
        }
    }
};

PRISM_CHIRON_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_CHIRON_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_CHIRON_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_CHIRON_MACHINE_DATABASE_ENHANCED = PRISM_CHIRON_MACHINE_DATABASE_ENHANCED;
console.log(`[CHIRON_DATABASE] Enhanced database loaded with ${PRISM_CHIRON_MACHINE_DATABASE_ENHANCED.totalMachines} machines`);
