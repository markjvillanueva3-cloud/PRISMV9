/**
 * PRISM Yasda Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: Yasda Precision Tools K.K. Official Specifications 2024
 * 
 * Coverage:
 * - YBM Series (Ultra-Precision VMC)
 * - YMC Series (5-Axis Precision)
 * - H Series (Micro Precision)
 * 
 * Note: Yasda specializes in ultra-precision machining centers
 * with sub-micron accuracy
 */

const PRISM_YASDA_MACHINE_DATABASE_ENHANCED = {
    manufacturer: "yasda",
    manufacturerFull: "Yasda Precision Tools K.K.",
    country: "Japan",
    headquarters: "Okayama, Japan",
    website: "https://www.yasda.co.jp",
    controlSystem: "FANUC 31i-B5 / YASDA NC",
    version: "2.0.0",
    lastUpdated: "2026-01-20",
    totalMachines: 0,
    
    machines: {
        
        // ═══════════════════════════════════════════════════════════════════════════════════════
        // YBM SERIES - ULTRA-PRECISION VMC
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "yasda_ybm640v3": {
            id: "yasda_ybm640v3", manufacturer: "yasda", model: "YBM 640V3", series: "YBM", type: "VMC", subtype: "ultra-precision", axes: 3, control: "FANUC 31i-B5",
            spindle: { type: "motorSpindle", maxRpm: 20000, peakHp: 15, continuousHp: 12, maxTorque_Nm: 40, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 150, headLength_mm: 320, thermallyCompensated: true } },
            travels: { x: { min: 0, max: 640, rapid_mm_min: 30000 }, y: { min: 0, max: 450, rapid_mm_min: 30000 }, z: { min: 0, max: 350, rapid_mm_min: 30000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_PRECISION", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 320, y: 225, z: 350 }, tableSurface: { x: 320, y: 225, z: 0 } }, spindleToTable_mm: 350,
                precisionFeatures: { temperatureControl: true, vibrationIsolation: true, linearScales: "glass" } },
            table: { type: "fixed_precision", length_mm: 750, width_mm: 450, thickness_mm: 60, tSlots: { count: 5, width_mm: 14, spacing_mm: 80 }, maxLoad_kg: 300,
                surfaceFlatness_um: 2, parallelism_um: 3 },
            geometry: { footprint: { length_mm: 2200, width_mm: 2000, height_mm: 2600 }, workEnvelope: { x_mm: 640, y_mm: 450, z_mm: 350 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 150, length_mm: 320, offset: { x: 0, y: 0, z: -160 } },
                table: { type: "box", dimensions: { x: 750, y: 450, z: 60 }, position: { x: 0, y: 0, z: -60 } } },
            atc: { type: "arm", capacity: 24, maxToolDiameter_mm: 63, maxToolLength_mm: 200, changeTime_sec: 2.5 },
            accuracy: { positioning_um: 0.5, repeatability_um: 0.2, circularAccuracy_um: 1.0, straightness_um: 1.0 },
            physical: { weight_kg: 5500 }, sources: ["Yasda YBM 640V3 Specifications 2024"]
        },

        "yasda_ybm950v3": {
            id: "yasda_ybm950v3", manufacturer: "yasda", model: "YBM 950V3", series: "YBM", type: "VMC", subtype: "ultra-precision", axes: 3, control: "FANUC 31i-B5",
            spindle: { type: "motorSpindle", maxRpm: 15000, peakHp: 22, continuousHp: 18, maxTorque_Nm: 80, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 170, headLength_mm: 360, thermallyCompensated: true } },
            travels: { x: { min: 0, max: 950, rapid_mm_min: 24000 }, y: { min: 0, max: 600, rapid_mm_min: 24000 }, z: { min: 0, max: 450, rapid_mm_min: 24000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_PRECISION", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 475, y: 300, z: 450 }, tableSurface: { x: 475, y: 300, z: 0 } }, spindleToTable_mm: 450,
                precisionFeatures: { temperatureControl: true, vibrationIsolation: true, linearScales: "glass" } },
            table: { type: "fixed_precision", length_mm: 1100, width_mm: 600, thickness_mm: 70, maxLoad_kg: 600,
                surfaceFlatness_um: 3, parallelism_um: 4 },
            geometry: { footprint: { length_mm: 2800, width_mm: 2400, height_mm: 2800 }, workEnvelope: { x_mm: 950, y_mm: 600, z_mm: 450 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 170, length_mm: 360, offset: { x: 0, y: 0, z: -180 } },
                table: { type: "box", dimensions: { x: 1100, y: 600, z: 70 }, position: { x: 0, y: 0, z: -70 } } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 3.0 },
            accuracy: { positioning_um: 0.8, repeatability_um: 0.3, circularAccuracy_um: 1.5 },
            physical: { weight_kg: 9000 }, sources: ["Yasda YBM 950V3 Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // YMC SERIES - 5-AXIS ULTRA-PRECISION
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "yasda_ymc430": {
            id: "yasda_ymc430", manufacturer: "yasda", model: "YMC 430", series: "YMC", type: "5AXIS", subtype: "trunnion-precision", axes: 5, control: "FANUC 31i-B5",
            spindle: { type: "motorSpindle", maxRpm: 30000, peakHp: 18, continuousHp: 15, maxTorque_Nm: 28, taper: "HSK-E40",
                geometry: { noseToGageLine_mm: 60.0, headDiameter_mm: 120, headLength_mm: 280, thermallyCompensated: true } },
            travels: { x: { min: 0, max: 430, rapid_mm_min: 30000 }, y: { min: 0, max: 350, rapid_mm_min: 30000 }, z: { min: 0, max: 250, rapid_mm_min: 30000 },
                a: { min: -110, max: 30, rapid_deg_sec: 40 }, c: { min: -360, max: 360, rapid_deg_sec: 120, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE_PRECISION", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", rotationVector: { i: 1, j: 0, k: 0 }, minAngle_deg: -110, maxAngle_deg: 30, pivotPoint_mm: { x: 215, y: 175, z: 80 }, pivotToTable_mm: 60, torque_Nm: 200, directDrive: true, encoderResolution_arcsec: 0.01 },
                    c: { type: "rotary", rotationVector: { i: 0, j: 0, k: 1 }, continuous: true, torque_Nm: 120, directDrive: true, encoderResolution_arcsec: 0.01 }
                },
                referencePoints: { spindleGageLine: { x: 215, y: 175, z: 250 }, tableSurface: { x: 215, y: 175, z: 80 }, aPivotPoint: { x: 215, y: 175, z: 80 } },
                tcpcSupported: true, rtcpSupported: true,
                precisionFeatures: { temperatureControl: true, vibrationIsolation: true } },
            table: { type: "trunnion_rotary_precision", diameter_mm: 300, maxLoad_kg: 50,
                trunnion: { width_mm: 420, supportHeight_mm: 200 },
                surfaceFlatness_um: 1, runout_um: 0.5 },
            geometry: { footprint: { length_mm: 2000, width_mm: 2200, height_mm: 2400 }, workEnvelope: { x_mm: 430, y_mm: 350, z_mm: 250 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 120, length_mm: 280, offset: { x: 0, y: 0, z: -140 } },
                rotaryTable: { type: "cylinder", diameter_mm: 300, height_mm: 50, rotatesWith: ["a", "c"] } },
            atc: { type: "umbrella", capacity: 20, maxToolDiameter_mm: 50, maxToolLength_mm: 150, changeTime_sec: 2.0 },
            accuracy: { positioning_um: 0.3, repeatability_um: 0.1, aAxisAccuracy_arcsec: 2.0, cAxisAccuracy_arcsec: 1.5, volumetricAccuracy_um: 2.0 },
            physical: { weight_kg: 6000 }, sources: ["Yasda YMC 430 Specifications 2024"]
        },

        "yasda_ymc650": {
            id: "yasda_ymc650", manufacturer: "yasda", model: "YMC 650", series: "YMC", type: "5AXIS", subtype: "trunnion-precision", axes: 5, control: "FANUC 31i-B5",
            spindle: { type: "motorSpindle", maxRpm: 24000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 55, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 150, headLength_mm: 320, thermallyCompensated: true } },
            travels: { x: { min: 0, max: 650, rapid_mm_min: 24000 }, y: { min: 0, max: 500, rapid_mm_min: 24000 }, z: { min: 0, max: 400, rapid_mm_min: 24000 },
                a: { min: -110, max: 30, rapid_deg_sec: 30 }, c: { min: -360, max: 360, rapid_deg_sec: 90, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE_PRECISION", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", minAngle_deg: -110, maxAngle_deg: 30, pivotPoint_mm: { x: 325, y: 250, z: 130 }, torque_Nm: 450, directDrive: true },
                    c: { type: "rotary", continuous: true, torque_Nm: 280, directDrive: true }
                },
                referencePoints: { spindleGageLine: { x: 325, y: 250, z: 400 }, tableSurface: { x: 325, y: 250, z: 130 } },
                tcpcSupported: true,
                precisionFeatures: { temperatureControl: true, vibrationIsolation: true } },
            table: { type: "trunnion_rotary_precision", diameter_mm: 500, maxLoad_kg: 200,
                trunnion: { width_mm: 680 } },
            geometry: { footprint: { length_mm: 2800, width_mm: 3000, height_mm: 2800 }, workEnvelope: { x_mm: 650, y_mm: 500, z_mm: 400 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 150, length_mm: 320, offset: { x: 0, y: 0, z: -160 } },
                rotaryTable: { type: "cylinder", diameter_mm: 500, height_mm: 80, rotatesWith: ["a", "c"] } },
            atc: { type: "arm", capacity: 40, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 2.5 },
            accuracy: { positioning_um: 0.5, repeatability_um: 0.2, aAxisAccuracy_arcsec: 3.0, cAxisAccuracy_arcsec: 2.0 },
            physical: { weight_kg: 12000 }, sources: ["Yasda YMC 650 Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // H SERIES - MICRO-PRECISION (Die & Mold)
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "yasda_h40i": {
            id: "yasda_h40i", manufacturer: "yasda", model: "H40i", series: "H", type: "VMC", subtype: "micro-precision", axes: 3, control: "FANUC 31i-B5",
            spindle: { type: "motorSpindle", maxRpm: 40000, peakHp: 8, continuousHp: 5.5, maxTorque_Nm: 8, taper: "HSK-E25",
                geometry: { noseToGageLine_mm: 35.0, headDiameter_mm: 85, headLength_mm: 180, thermallyCompensated: true, airBearing: true } },
            travels: { x: { min: 0, max: 400, rapid_mm_min: 20000 }, y: { min: 0, max: 300, rapid_mm_min: 20000 }, z: { min: 0, max: 200, rapid_mm_min: 20000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_MICRO_PRECISION", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 200, y: 150, z: 200 }, tableSurface: { x: 200, y: 150, z: 0 } }, spindleToTable_mm: 200,
                precisionFeatures: { temperatureControl: true, vibrationIsolation: true, linearScales: "laser", cleanroomReady: true } },
            table: { type: "fixed_micro_precision", length_mm: 500, width_mm: 300, thickness_mm: 40, maxLoad_kg: 80,
                surfaceFlatness_um: 0.5, parallelism_um: 1 },
            geometry: { footprint: { length_mm: 1500, width_mm: 1400, height_mm: 2200 }, workEnvelope: { x_mm: 400, y_mm: 300, z_mm: 200 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 85, length_mm: 180, offset: { x: 0, y: 0, z: -90 } },
                table: { type: "box", dimensions: { x: 500, y: 300, z: 40 }, position: { x: 0, y: 0, z: -40 } } },
            atc: { type: "turret", capacity: 16, maxToolDiameter_mm: 30, maxToolLength_mm: 100, changeTime_sec: 1.5 },
            accuracy: { positioning_um: 0.2, repeatability_um: 0.05, surfaceFinish_Ra_nm: 10, straightness_um: 0.3 },
            physical: { weight_kg: 3500 }, sources: ["Yasda H40i Specifications 2024"]
        }
    }
};

PRISM_YASDA_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_YASDA_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_YASDA_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_YASDA_MACHINE_DATABASE_ENHANCED = PRISM_YASDA_MACHINE_DATABASE_ENHANCED;
console.log(`[YASDA_DATABASE] Enhanced database loaded with ${PRISM_YASDA_MACHINE_DATABASE_ENHANCED.totalMachines} machines`);
