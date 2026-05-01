/**
 * PRISM Sodick Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: Sodick Co., Ltd. Official Specifications 2024
 * 
 * Coverage:
 * - OPM Series (Additive + Subtractive)
 * - UH Series (High-Speed VMC)
 * - HS Series (Linear Motor Milling)
 * 
 * Note: Sodick specializes in linear motor technology
 * and hybrid additive manufacturing
 */

const PRISM_SODICK_MACHINE_DATABASE_ENHANCED = {
    manufacturer: "sodick",
    manufacturerFull: "Sodick Co., Ltd.",
    country: "Japan",
    headquarters: "Kanagawa, Japan",
    website: "https://www.sodick.co.jp",
    controlSystem: "Sodick LN Professional / FANUC",
    version: "2.0.0",
    lastUpdated: "2026-01-20",
    totalMachines: 0,
    
    machines: {
        
        // ═══════════════════════════════════════════════════════════════════════════════════════
        // OPM SERIES - ADDITIVE + SUBTRACTIVE (HYBRID)
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "sodick_opm250l": {
            id: "sodick_opm250l", manufacturer: "sodick", model: "OPM250L", series: "OPM", type: "HYBRID", subtype: "additive-subtractive", axes: 3, control: "Sodick LN Professional",
            spindle: { type: "motorSpindle", maxRpm: 45000, peakHp: 3.7, continuousHp: 2.5, maxTorque_Nm: 5.5, taper: "HSK-E25",
                geometry: { noseToGageLine_mm: 35.0, headDiameter_mm: 80, headLength_mm: 180 } },
            additiveLaser: { type: "Yb_fiber", power_W: 500, spotSize_um: 100, layerThickness_um: 50 },
            travels: { x: { min: 0, max: 250, rapid_mm_min: 60000, linearMotor: true }, y: { min: 0, max: 250, rapid_mm_min: 60000, linearMotor: true }, z: { min: 0, max: 250, rapid_mm_min: 50000, linearMotor: true }, a: null, b: null, c: null },
            kinematics: { type: "HYBRID_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 125, y: 125, z: 250 }, tableSurface: { x: 125, y: 125, z: 0 } }, spindleToTable_mm: 250,
                linearMotorAxes: ["x", "y", "z"] },
            table: { type: "fixed_precision", length_mm: 250, width_mm: 250, thickness_mm: 40, maxLoad_kg: 100 },
            geometry: { footprint: { length_mm: 2200, width_mm: 2100, height_mm: 2500 }, workEnvelope: { x_mm: 250, y_mm: 250, z_mm: 250 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 80, length_mm: 180, offset: { x: 0, y: 0, z: -90 } },
                laserHead: { type: "cylinder", diameter_mm: 60, length_mm: 120, position: { x: 50, y: 0, z: -60 } },
                table: { type: "box", dimensions: { x: 250, y: 250, z: 40 }, position: { x: 0, y: 0, z: -40 } } },
            atc: { type: "turret", capacity: 16, maxToolDiameter_mm: 20, maxToolLength_mm: 80, changeTime_sec: 1.5 },
            accuracy: { positioning_um: 2, repeatability_um: 1, additivePrecision_um: 50 },
            physical: { weight_kg: 4500 }, sources: ["Sodick OPM250L Specifications 2024"]
        },

        "sodick_opm350l": {
            id: "sodick_opm350l", manufacturer: "sodick", model: "OPM350L", series: "OPM", type: "HYBRID", subtype: "additive-subtractive", axes: 3, control: "Sodick LN Professional",
            spindle: { type: "motorSpindle", maxRpm: 45000, peakHp: 5, continuousHp: 3.7, maxTorque_Nm: 7, taper: "HSK-E32",
                geometry: { noseToGageLine_mm: 45.0, headDiameter_mm: 90, headLength_mm: 200 } },
            additiveLaser: { type: "Yb_fiber", power_W: 1000, spotSize_um: 100, layerThickness_um: 50 },
            travels: { x: { min: 0, max: 350, rapid_mm_min: 50000, linearMotor: true }, y: { min: 0, max: 350, rapid_mm_min: 50000, linearMotor: true }, z: { min: 0, max: 350, rapid_mm_min: 40000, linearMotor: true }, a: null, b: null, c: null },
            kinematics: { type: "HYBRID_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 175, y: 175, z: 350 }, tableSurface: { x: 175, y: 175, z: 0 } }, spindleToTable_mm: 350,
                linearMotorAxes: ["x", "y", "z"] },
            table: { type: "fixed_precision", length_mm: 350, width_mm: 350, thickness_mm: 50, maxLoad_kg: 200 },
            geometry: { footprint: { length_mm: 2800, width_mm: 2600, height_mm: 2800 }, workEnvelope: { x_mm: 350, y_mm: 350, z_mm: 350 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 90, length_mm: 200, offset: { x: 0, y: 0, z: -100 } },
                laserHead: { type: "cylinder", diameter_mm: 70, length_mm: 140, position: { x: 60, y: 0, z: -70 } },
                table: { type: "box", dimensions: { x: 350, y: 350, z: 50 }, position: { x: 0, y: 0, z: -50 } } },
            atc: { type: "turret", capacity: 20, maxToolDiameter_mm: 25, maxToolLength_mm: 100, changeTime_sec: 1.8 },
            accuracy: { positioning_um: 2.5, repeatability_um: 1.5 },
            physical: { weight_kg: 7500 }, sources: ["Sodick OPM350L Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // HS SERIES - LINEAR MOTOR HIGH-SPEED MILLING
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "sodick_hs430l": {
            id: "sodick_hs430l", manufacturer: "sodick", model: "HS430L", series: "HS", type: "VMC", subtype: "linear-motor-high-speed", axes: 3, control: "Sodick LN Professional",
            spindle: { type: "motorSpindle", maxRpm: 40000, peakHp: 15, continuousHp: 11, maxTorque_Nm: 15, taper: "HSK-E40",
                geometry: { noseToGageLine_mm: 55.0, headDiameter_mm: 120, headLength_mm: 280 } },
            travels: { x: { min: 0, max: 430, rapid_mm_min: 60000, linearMotor: true }, y: { min: 0, max: 350, rapid_mm_min: 60000, linearMotor: true }, z: { min: 0, max: 200, rapid_mm_min: 50000, linearMotor: true }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_LINEAR", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 215, y: 175, z: 200 }, tableSurface: { x: 215, y: 175, z: 0 } }, spindleToTable_mm: 200,
                linearMotorAxes: ["x", "y", "z"], highSpeedFeatures: { acceleration_G: 1.5, jerk_mm_s3: 50000 } },
            table: { type: "fixed_precision", length_mm: 550, width_mm: 350, thickness_mm: 50, tSlots: { count: 4, width_mm: 12, spacing_mm: 80 }, maxLoad_kg: 200 },
            geometry: { footprint: { length_mm: 2100, width_mm: 2000, height_mm: 2400 }, workEnvelope: { x_mm: 430, y_mm: 350, z_mm: 200 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 120, length_mm: 280, offset: { x: 0, y: 0, z: -140 } },
                table: { type: "box", dimensions: { x: 550, y: 350, z: 50 }, position: { x: 0, y: 0, z: -50 } } },
            atc: { type: "arm", capacity: 21, maxToolDiameter_mm: 50, maxToolLength_mm: 150, changeTime_sec: 1.2 },
            accuracy: { positioning_um: 1.5, repeatability_um: 0.5, surfaceFinish_Ra_um: 0.1 },
            physical: { weight_kg: 5000 }, sources: ["Sodick HS430L Specifications 2024"]
        },

        "sodick_hs650l": {
            id: "sodick_hs650l", manufacturer: "sodick", model: "HS650L", series: "HS", type: "VMC", subtype: "linear-motor-high-speed", axes: 3, control: "Sodick LN Professional",
            spindle: { type: "motorSpindle", maxRpm: 30000, peakHp: 22, continuousHp: 18, maxTorque_Nm: 30, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 150, headLength_mm: 320 } },
            travels: { x: { min: 0, max: 650, rapid_mm_min: 50000, linearMotor: true }, y: { min: 0, max: 450, rapid_mm_min: 50000, linearMotor: true }, z: { min: 0, max: 350, rapid_mm_min: 40000, linearMotor: true }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_LINEAR", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 325, y: 225, z: 350 }, tableSurface: { x: 325, y: 225, z: 0 } }, spindleToTable_mm: 350,
                linearMotorAxes: ["x", "y", "z"] },
            table: { type: "fixed_precision", length_mm: 800, width_mm: 450, thickness_mm: 60, maxLoad_kg: 400 },
            geometry: { footprint: { length_mm: 2700, width_mm: 2400, height_mm: 2700 }, workEnvelope: { x_mm: 650, y_mm: 450, z_mm: 350 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 150, length_mm: 320, offset: { x: 0, y: 0, z: -160 } },
                table: { type: "box", dimensions: { x: 800, y: 450, z: 60 }, position: { x: 0, y: 0, z: -60 } } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 80, maxToolLength_mm: 250, changeTime_sec: 1.8 },
            accuracy: { positioning_um: 2, repeatability_um: 1 },
            physical: { weight_kg: 8500 }, sources: ["Sodick HS650L Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // UH SERIES - ULTRA HIGH-SPEED
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "sodick_uh450l": {
            id: "sodick_uh450l", manufacturer: "sodick", model: "UH450L", series: "UH", type: "VMC", subtype: "ultra-high-speed", axes: 3, control: "Sodick LN Professional",
            spindle: { type: "motorSpindle", maxRpm: 60000, peakHp: 7.5, continuousHp: 5.5, maxTorque_Nm: 3.5, taper: "HSK-E25",
                geometry: { noseToGageLine_mm: 35.0, headDiameter_mm: 85, headLength_mm: 200 } },
            travels: { x: { min: 0, max: 450, rapid_mm_min: 80000, linearMotor: true }, y: { min: 0, max: 350, rapid_mm_min: 80000, linearMotor: true }, z: { min: 0, max: 200, rapid_mm_min: 70000, linearMotor: true }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS_LINEAR_ULTRAHIGH", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 225, y: 175, z: 200 }, tableSurface: { x: 225, y: 175, z: 0 } }, spindleToTable_mm: 200,
                linearMotorAxes: ["x", "y", "z"], highSpeedFeatures: { acceleration_G: 2.0, jerk_mm_s3: 80000 } },
            table: { type: "fixed_precision", length_mm: 550, width_mm: 350, thickness_mm: 45, maxLoad_kg: 150 },
            geometry: { footprint: { length_mm: 2200, width_mm: 2100, height_mm: 2500 }, workEnvelope: { x_mm: 450, y_mm: 350, z_mm: 200 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 85, length_mm: 200, offset: { x: 0, y: 0, z: -100 } },
                table: { type: "box", dimensions: { x: 550, y: 350, z: 45 }, position: { x: 0, y: 0, z: -45 } } },
            atc: { type: "turret", capacity: 16, maxToolDiameter_mm: 30, maxToolLength_mm: 100, changeTime_sec: 1.0 },
            accuracy: { positioning_um: 1, repeatability_um: 0.3, surfaceFinish_Ra_um: 0.05 },
            physical: { weight_kg: 4800 }, sources: ["Sodick UH450L Specifications 2024"]
        }
    }
};

PRISM_SODICK_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_SODICK_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_SODICK_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_SODICK_MACHINE_DATABASE_ENHANCED = PRISM_SODICK_MACHINE_DATABASE_ENHANCED;
console.log(`[SODICK_DATABASE] Enhanced database loaded with ${PRISM_SODICK_MACHINE_DATABASE_ENHANCED.totalMachines} machines`);
