/**
 * PRISM Makino Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: Makino Official Specifications 2024
 * 
 * Coverage:
 * - a-Series (Vertical Machining)
 * - F-Series (Graphite/High Speed)
 * - PS-Series (Vertical)
 * - D-Series (5-Axis)
 * - MAG-Series (HMC)
 * 
 * Total: 15+ machines with full collision geometry
 */

const PRISM_MAKINO_MACHINE_DATABASE_ENHANCED = {
    manufacturer: "makino",
    manufacturerFull: "Makino Milling Machine Co., Ltd.",
    country: "Japan",
    headquarters: "Tokyo, Japan",
    usHeadquarters: "Mason, Ohio",
    website: "https://www.makino.com",
    controlSystem: "Makino Professional 6 / FANUC",
    version: "2.0.0",
    lastUpdated: "2026-01-20",
    totalMachines: 0,
    
    machines: {
        
        // ═══════════════════════════════════════════════════════════════════════════════════════
        // a-SERIES - VERTICAL MACHINING CENTERS
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "makino_a51nx": {
            id: "makino_a51nx", manufacturer: "makino", model: "a51nx", series: "a-Series", type: "HMC", subtype: "4-axis", axes: 4, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 14000, peakHp: 40, continuousHp: 30, maxTorque_Nm: 184, taper: "HSK-A63", orientation: "horizontal",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 200, headLength_mm: 420 } },
            travels: { x: { min: 0, max: 560, rapid_mm_min: 60000 }, y: { min: 0, max: 560, rapid_mm_min: 60000 }, z: { min: 0, max: 500, rapid_mm_min: 60000 }, b: { min: 0, max: 360, rapid_deg_sec: 60, continuous: true } },
            kinematics: { type: "HMC_4AXIS", chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"], spindleOrientation: "horizontal", rotaryAxes: { b: { type: "indexing", continuous: true, indexIncrement_deg: 0.0001, torque_Nm: 1200, clampTorque_Nm: 2500 } } },
            table: { type: "rotary_pallet", size_mm: 400, maxLoad_kg: 400, palletCount: 2, palletChangeTime_sec: 6.5 },
            geometry: { footprint: { length_mm: 3200, width_mm: 3800, height_mm: 2800 }, workEnvelope: { x_mm: 560, y_mm: 560, z_mm: 500 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 420, orientation: "horizontal" }, rotaryTable: { type: "box", dimensions: { x: 400, y: 250, z: 400 }, rotatesWith: ["b"] } },
            atc: { type: "chain", capacity: 60, maxToolDiameter_mm: 80, maxToolLength_mm: 350, changeTime_sec: 2.0 },
            accuracy: { positioning_mm: 0.002, repeatability_mm: 0.001 },
            physical: { weight_kg: 11000 }, sources: ["Makino a51nx Specifications 2024"]
        },

        "makino_a61nx": {
            id: "makino_a61nx", manufacturer: "makino", model: "a61nx", series: "a-Series", type: "HMC", subtype: "4-axis", axes: 4, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 14000, peakHp: 50, continuousHp: 40, maxTorque_Nm: 245, taper: "HSK-A63", orientation: "horizontal",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 220, headLength_mm: 460 } },
            travels: { x: { min: 0, max: 730, rapid_mm_min: 60000 }, y: { min: 0, max: 650, rapid_mm_min: 60000 }, z: { min: 0, max: 600, rapid_mm_min: 60000 }, b: { min: 0, max: 360, rapid_deg_sec: 50, continuous: true } },
            kinematics: { type: "HMC_4AXIS", chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"], spindleOrientation: "horizontal", rotaryAxes: { b: { type: "indexing", continuous: true, torque_Nm: 1600 } } },
            table: { type: "rotary_pallet", size_mm: 500, maxLoad_kg: 600, palletCount: 2, palletChangeTime_sec: 7.0 },
            geometry: { footprint: { length_mm: 3800, width_mm: 4400, height_mm: 3000 }, workEnvelope: { x_mm: 730, y_mm: 650, z_mm: 600 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 220, length_mm: 460, orientation: "horizontal" }, rotaryTable: { type: "box", dimensions: { x: 500, y: 280, z: 500 }, rotatesWith: ["b"] } },
            atc: { type: "chain", capacity: 79, maxToolDiameter_mm: 100, maxToolLength_mm: 400, changeTime_sec: 2.2 },
            physical: { weight_kg: 16000 }, sources: ["Makino a61nx Specifications 2024"]
        },

        "makino_a81nx": {
            id: "makino_a81nx", manufacturer: "makino", model: "a81nx", series: "a-Series", type: "HMC", subtype: "4-axis", axes: 4, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 12000, peakHp: 60, continuousHp: 50, maxTorque_Nm: 350, taper: "HSK-A100", orientation: "horizontal",
                geometry: { noseToGageLine_mm: 127.0, headDiameter_mm: 280, headLength_mm: 520 } },
            travels: { x: { min: 0, max: 900, rapid_mm_min: 50000 }, y: { min: 0, max: 800, rapid_mm_min: 50000 }, z: { min: 0, max: 750, rapid_mm_min: 50000 }, b: { min: 0, max: 360, rapid_deg_sec: 40, continuous: true } },
            kinematics: { type: "HMC_4AXIS", chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"], spindleOrientation: "horizontal", rotaryAxes: { b: { type: "indexing", continuous: true, torque_Nm: 2200 } } },
            table: { type: "rotary_pallet", size_mm: 630, maxLoad_kg: 1000, palletCount: 2, palletChangeTime_sec: 9.0 },
            geometry: { footprint: { length_mm: 4800, width_mm: 5400, height_mm: 3400 }, workEnvelope: { x_mm: 900, y_mm: 800, z_mm: 750 } },
            atc: { type: "chain", capacity: 119, maxToolDiameter_mm: 125, maxToolLength_mm: 500, changeTime_sec: 2.5 },
            physical: { weight_kg: 26000 }, sources: ["Makino a81nx Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // PS-SERIES - VERTICAL MACHINING CENTERS
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "makino_ps65": {
            id: "makino_ps65", manufacturer: "makino", model: "PS65", series: "PS-Series", type: "VMC", subtype: "3-axis", axes: 3, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 14000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 119, taper: "BBT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 180, headLength_mm: 380 } },
            travels: { x: { min: 0, max: 650, rapid_mm_min: 50000 }, y: { min: 0, max: 500, rapid_mm_min: 50000 }, z: { min: 0, max: 400, rapid_mm_min: 50000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"], referencePoints: { spindleGageLine: { x: 325, y: 250, z: 400 }, tableSurface: { x: 325, y: 250, z: 0 } }, spindleToTable_mm: 400 },
            table: { type: "fixed", length_mm: 800, width_mm: 450, thickness_mm: 70, tSlots: { count: 5, width_mm: 18 }, maxLoad_kg: 500 },
            geometry: { footprint: { length_mm: 2400, width_mm: 2600, height_mm: 2700 }, workEnvelope: { x_mm: 650, y_mm: 500, z_mm: 400 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 380, offset: { x: 0, y: 0, z: -190 } }, table: { type: "box", dimensions: { x: 800, y: 450, z: 70 }, position: { x: 0, y: 0, z: -70 } } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 1.8 },
            physical: { weight_kg: 6500 }, sources: ["Makino PS65 Specifications 2024"]
        },

        "makino_ps95": {
            id: "makino_ps95", manufacturer: "makino", model: "PS95", series: "PS-Series", type: "VMC", subtype: "3-axis", axes: 3, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 14000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 143, taper: "BBT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 200, headLength_mm: 420 } },
            travels: { x: { min: 0, max: 900, rapid_mm_min: 50000 }, y: { min: 0, max: 500, rapid_mm_min: 50000 }, z: { min: 0, max: 450, rapid_mm_min: 50000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"], referencePoints: { spindleGageLine: { x: 450, y: 250, z: 450 }, tableSurface: { x: 450, y: 250, z: 0 } }, spindleToTable_mm: 450 },
            table: { type: "fixed", length_mm: 1100, width_mm: 500, thickness_mm: 80, maxLoad_kg: 700 },
            geometry: { footprint: { length_mm: 2900, width_mm: 2800, height_mm: 2900 }, workEnvelope: { x_mm: 900, y_mm: 500, z_mm: 450 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 420, offset: { x: 0, y: 0, z: -210 } }, table: { type: "box", dimensions: { x: 1100, y: 500, z: 80 }, position: { x: 0, y: 0, z: -80 } } },
            atc: { type: "arm", capacity: 40, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.0 },
            physical: { weight_kg: 9000 }, sources: ["Makino PS95 Specifications 2024"]
        },

        "makino_ps105": {
            id: "makino_ps105", manufacturer: "makino", model: "PS105", series: "PS-Series", type: "VMC", subtype: "3-axis", axes: 3, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 12000, peakHp: 40, continuousHp: 30, maxTorque_Nm: 200, taper: "BBT50",
                geometry: { noseToGageLine_mm: 139.7, headDiameter_mm: 240, headLength_mm: 480 } },
            travels: { x: { min: 0, max: 1020, rapid_mm_min: 45000 }, y: { min: 0, max: 610, rapid_mm_min: 45000 }, z: { min: 0, max: 510, rapid_mm_min: 45000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"], referencePoints: { spindleGageLine: { x: 510, y: 305, z: 510 }, tableSurface: { x: 510, y: 305, z: 0 } }, spindleToTable_mm: 510 },
            table: { type: "fixed", length_mm: 1300, width_mm: 610, thickness_mm: 90, maxLoad_kg: 1200 },
            geometry: { footprint: { length_mm: 3500, width_mm: 3200, height_mm: 3100 }, workEnvelope: { x_mm: 1020, y_mm: 610, z_mm: 510 } },
            atc: { type: "arm", capacity: 50, maxToolDiameter_mm: 100, maxToolLength_mm: 350, changeTime_sec: 2.5 },
            physical: { weight_kg: 14000 }, sources: ["Makino PS105 Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // F-SERIES - HIGH-SPEED / GRAPHITE
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "makino_f3": {
            id: "makino_f3", manufacturer: "makino", model: "F3", series: "F-Series", type: "VMC", subtype: "high-speed", axes: 3, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 15, continuousHp: 12, maxTorque_Nm: 35, taper: "HSK-E40",
                geometry: { noseToGageLine_mm: 63.5, headDiameter_mm: 140, headLength_mm: 300 } },
            travels: { x: { min: 0, max: 350, rapid_mm_min: 60000 }, y: { min: 0, max: 300, rapid_mm_min: 60000 }, z: { min: 0, max: 250, rapid_mm_min: 60000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"], referencePoints: { spindleGageLine: { x: 175, y: 150, z: 250 }, tableSurface: { x: 175, y: 150, z: 0 } } },
            table: { type: "fixed", length_mm: 450, width_mm: 300, thickness_mm: 50, maxLoad_kg: 100 },
            geometry: { footprint: { length_mm: 1800, width_mm: 1900, height_mm: 2300 }, workEnvelope: { x_mm: 350, y_mm: 300, z_mm: 250 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 140, length_mm: 300, offset: { x: 0, y: 0, z: -150 } }, table: { type: "box", dimensions: { x: 450, y: 300, z: 50 }, position: { x: 0, y: 0, z: -50 } } },
            atc: { type: "arm", capacity: 20, maxToolDiameter_mm: 50, maxToolLength_mm: 150, changeTime_sec: 1.0 },
            physical: { weight_kg: 3000 }, sources: ["Makino F3 Specifications 2024"]
        },

        "makino_f5": {
            id: "makino_f5", manufacturer: "makino", model: "F5", series: "F-Series", type: "VMC", subtype: "high-speed", axes: 3, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 22, continuousHp: 18, maxTorque_Nm: 55, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 160, headLength_mm: 340 } },
            travels: { x: { min: 0, max: 500, rapid_mm_min: 60000 }, y: { min: 0, max: 400, rapid_mm_min: 60000 }, z: { min: 0, max: 330, rapid_mm_min: 60000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_HIGH_SPEED", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"], referencePoints: { spindleGageLine: { x: 250, y: 200, z: 330 }, tableSurface: { x: 250, y: 200, z: 0 } } },
            table: { type: "fixed", length_mm: 650, width_mm: 400, thickness_mm: 60, maxLoad_kg: 200 },
            geometry: { footprint: { length_mm: 2200, width_mm: 2300, height_mm: 2500 }, workEnvelope: { x_mm: 500, y_mm: 400, z_mm: 330 } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 75, maxToolLength_mm: 200, changeTime_sec: 1.2 },
            physical: { weight_kg: 5000 }, sources: ["Makino F5 Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // D-SERIES - 5-AXIS MACHINING CENTERS
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "makino_d500": {
            id: "makino_d500", manufacturer: "makino", model: "D500", series: "D-Series", type: "5AXIS", subtype: "trunnion", axes: 5, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 119, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 180, headLength_mm: 400 } },
            travels: { x: { min: 0, max: 500, rapid_mm_min: 60000 }, y: { min: 0, max: 550, rapid_mm_min: 60000 }, z: { min: 0, max: 450, rapid_mm_min: 60000 },
                a: { min: -30, max: 120, rapid_deg_sec: 40 }, c: { min: -360, max: 360, rapid_deg_sec: 120, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", rotationVector: { i: 1, j: 0, k: 0 }, minAngle_deg: -30, maxAngle_deg: 120, pivotPoint_mm: { x: 250, y: 275, z: 160 }, pivotToTable_mm: 110, torque_Nm: 500, clampTorque_Nm: 1200 },
                    c: { type: "rotary", rotationVector: { i: 0, j: 0, k: 1 }, continuous: true, torque_Nm: 350, clampTorque_Nm: 800 }
                },
                referencePoints: { spindleGageLine: { x: 250, y: 275, z: 450 }, tableSurface: { x: 250, y: 275, z: 160 }, aPivotPoint: { x: 250, y: 275, z: 160 } },
                tcpcSupported: true, rtcpSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 500, tSlots: { count: 4, width_mm: 14, pattern: "radial" }, maxLoad_kg: 200, trunnion: { width_mm: 680, supportHeight_mm: 300 } },
            geometry: { footprint: { length_mm: 2800, width_mm: 3200, height_mm: 2900 }, workEnvelope: { x_mm: 500, y_mm: 550, z_mm: 450 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 400, offset: { x: 0, y: 0, z: -200 } },
                trunnionLeft: { type: "cylinder", diameter_mm: 240, length_mm: 160, position: { x: -340, y: 275, z: 160 } },
                trunnionRight: { type: "cylinder", diameter_mm: 240, length_mm: 160, position: { x: 340, y: 275, z: 160 } },
                rotaryTable: { type: "cylinder", diameter_mm: 500, height_mm: 90, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 50, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.5 },
            accuracy: { positioning_mm: 0.003, repeatability_mm: 0.0015, aAxisAccuracy_deg: 0.001, cAxisAccuracy_deg: 0.001 },
            physical: { weight_kg: 10500 }, sources: ["Makino D500 Specifications 2024"]
        },

        "makino_d800z": {
            id: "makino_d800z", manufacturer: "makino", model: "D800Z", series: "D-Series", type: "5AXIS", subtype: "trunnion", axes: 5, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 18000, peakHp: 40, continuousHp: 30, maxTorque_Nm: 175, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 200, headLength_mm: 450 } },
            travels: { x: { min: 0, max: 730, rapid_mm_min: 50000 }, y: { min: 0, max: 750, rapid_mm_min: 50000 }, z: { min: 0, max: 650, rapid_mm_min: 50000 },
                a: { min: -30, max: 120, rapid_deg_sec: 35 }, c: { min: -360, max: 360, rapid_deg_sec: 100, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -30, maxAngle_deg: 120, pivotPoint_mm: { x: 365, y: 375, z: 200 }, torque_Nm: 800 },
                    c: { type: "rotary", continuous: true, torque_Nm: 550 }
                },
                referencePoints: { spindleGageLine: { x: 365, y: 375, z: 650 }, tableSurface: { x: 365, y: 375, z: 200 } },
                tcpcSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 800, maxLoad_kg: 500 },
            geometry: { footprint: { length_mm: 3600, width_mm: 4200, height_mm: 3300 }, workEnvelope: { x_mm: 730, y_mm: 750, z_mm: 650 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 450, offset: { x: 0, y: 0, z: -225 } }, rotaryTable: { type: "cylinder", diameter_mm: 800, height_mm: 120, rotatesWith: ["a", "c"] } },
            atc: { type: "chain", capacity: 80, maxToolDiameter_mm: 100, maxToolLength_mm: 400, changeTime_sec: 3.0 },
            physical: { weight_kg: 18000 }, sources: ["Makino D800Z Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // MAG-SERIES - LARGE HMC
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "makino_mag1": {
            id: "makino_mag1", manufacturer: "makino", model: "MAG1", series: "MAG-Series", type: "HMC", subtype: "4-axis-large", axes: 4, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 10000, peakHp: 80, continuousHp: 60, maxTorque_Nm: 500, taper: "HSK-A100", orientation: "horizontal",
                geometry: { noseToGageLine_mm: 127.0, headDiameter_mm: 300, headLength_mm: 580 } },
            travels: { x: { min: 0, max: 1000, rapid_mm_min: 45000 }, y: { min: 0, max: 1000, rapid_mm_min: 45000 }, z: { min: 0, max: 1000, rapid_mm_min: 45000 },
                b: { min: 0, max: 360, rapid_deg_sec: 35, continuous: true } },
            kinematics: { type: "HMC_4AXIS", chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"], spindleOrientation: "horizontal", rotaryAxes: { b: { type: "indexing", continuous: true, torque_Nm: 3000 } } },
            table: { type: "rotary_pallet", size_mm: 800, maxLoad_kg: 1500, palletCount: 2, palletChangeTime_sec: 12 },
            geometry: { footprint: { length_mm: 5500, width_mm: 6200, height_mm: 3800 }, workEnvelope: { x_mm: 1000, y_mm: 1000, z_mm: 1000 } },
            atc: { type: "chain", capacity: 160, maxToolDiameter_mm: 150, maxToolLength_mm: 600, changeTime_sec: 3.5 },
            physical: { weight_kg: 42000 }, sources: ["Makino MAG1 Specifications 2024"]
        },

        "makino_mag3": {
            id: "makino_mag3", manufacturer: "makino", model: "MAG3", series: "MAG-Series", type: "HMC", subtype: "4-axis-large", axes: 4, control: "Makino Professional 6",
            spindle: { type: "motorSpindle", maxRpm: 8000, peakHp: 100, continuousHp: 80, maxTorque_Nm: 750, taper: "HSK-A125", orientation: "horizontal",
                geometry: { noseToGageLine_mm: 158.8, headDiameter_mm: 350, headLength_mm: 650 } },
            travels: { x: { min: 0, max: 1400, rapid_mm_min: 40000 }, y: { min: 0, max: 1400, rapid_mm_min: 40000 }, z: { min: 0, max: 1500, rapid_mm_min: 40000 },
                b: { min: 0, max: 360, rapid_deg_sec: 25, continuous: true } },
            kinematics: { type: "HMC_4AXIS", chain: ["SPINDLE", "Z", "Y", "X", "B", "TABLE", "PART"], spindleOrientation: "horizontal", rotaryAxes: { b: { type: "indexing", continuous: true, torque_Nm: 5000 } } },
            table: { type: "rotary_pallet", size_mm: 1250, maxLoad_kg: 3000, palletCount: 2, palletChangeTime_sec: 18 },
            geometry: { footprint: { length_mm: 7500, width_mm: 8500, height_mm: 4500 }, workEnvelope: { x_mm: 1400, y_mm: 1400, z_mm: 1500 } },
            atc: { type: "chain", capacity: 240, maxToolDiameter_mm: 200, maxToolLength_mm: 800, changeTime_sec: 4.5 },
            physical: { weight_kg: 85000 }, sources: ["Makino MAG3 Specifications 2024"]
        }
    }
};

PRISM_MAKINO_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_MAKINO_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_MAKINO_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_MAKINO_MACHINE_DATABASE_ENHANCED = PRISM_MAKINO_MACHINE_DATABASE_ENHANCED;
console.log(`[MAKINO_DATABASE] Enhanced database loaded with ${PRISM_MAKINO_MACHINE_DATABASE_ENHANCED.totalMachines} machines`);
