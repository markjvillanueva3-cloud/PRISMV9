/**
 * PRISM Leadwell Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: Leadwell CNC Machines MFG., Corp. Official Specifications 2024
 * 
 * Coverage:
 * - MCV Series (Vertical Machining)
 * - LTC Series (CNC Lathes)
 * - T Series (Turning Centers)
 * - V Series (5-Axis)
 * 
 * Note: Leadwell is one of Taiwan's largest CNC machine manufacturers
 */

const PRISM_LEADWELL_MACHINE_DATABASE_ENHANCED = {
    manufacturer: "leadwell",
    manufacturerFull: "Leadwell CNC Machines MFG., Corp.",
    country: "Taiwan",
    headquarters: "Taichung, Taiwan",
    website: "https://www.leadwell.com.tw",
    controlSystem: "FANUC 0i-MF / 31i-B",
    version: "2.0.0",
    lastUpdated: "2026-01-20",
    totalMachines: 0,
    
    machines: {
        
        // ═══════════════════════════════════════════════════════════════════════════════════════
        // MCV SERIES - VERTICAL MACHINING CENTERS
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "leadwell_mcv610ap": {
            id: "leadwell_mcv610ap", manufacturer: "leadwell", model: "MCV-610AP", series: "MCV", type: "VMC", subtype: "3-axis-compact", axes: 3, control: "FANUC 0i-MF Plus",
            spindle: { type: "inline", maxRpm: 12000, peakHp: 15, continuousHp: 11, maxTorque_Nm: 70, taper: "BT40",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 150, headLength_mm: 320 } },
            travels: { x: { min: 0, max: 610, rapid_mm_min: 36000 }, y: { min: 0, max: 410, rapid_mm_min: 36000 }, z: { min: 0, max: 460, rapid_mm_min: 30000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 305, y: 205, z: 460 }, tableSurface: { x: 305, y: 205, z: 0 } }, spindleToTable_mm: 460 },
            table: { type: "fixed", length_mm: 760, width_mm: 410, thickness_mm: 55, tSlots: { count: 4, width_mm: 18, spacing_mm: 100 }, maxLoad_kg: 400 },
            geometry: { footprint: { length_mm: 2200, width_mm: 2000, height_mm: 2500 }, workEnvelope: { x_mm: 610, y_mm: 410, z_mm: 460 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 150, length_mm: 320, offset: { x: 0, y: 0, z: -160 } },
                table: { type: "box", dimensions: { x: 760, y: 410, z: 55 }, position: { x: 0, y: 0, z: -55 } } },
            atc: { type: "arm", capacity: 24, maxToolDiameter_mm: 76, maxToolLength_mm: 250, changeTime_sec: 2.5 },
            accuracy: { positioning_mm: 0.008, repeatability_mm: 0.005 },
            physical: { weight_kg: 4200 }, sources: ["Leadwell MCV-610AP Specifications 2024"]
        },

        "leadwell_mcv1000b": {
            id: "leadwell_mcv1000b", manufacturer: "leadwell", model: "MCV-1000B", series: "MCV", type: "VMC", subtype: "3-axis", axes: 3, control: "FANUC 0i-MF Plus",
            spindle: { type: "inline", maxRpm: 10000, peakHp: 20, continuousHp: 15, maxTorque_Nm: 119, taper: "BT40",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 170, headLength_mm: 360 } },
            travels: { x: { min: 0, max: 1020, rapid_mm_min: 30000 }, y: { min: 0, max: 510, rapid_mm_min: 30000 }, z: { min: 0, max: 510, rapid_mm_min: 24000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 510, y: 255, z: 510 }, tableSurface: { x: 510, y: 255, z: 0 } }, spindleToTable_mm: 510 },
            table: { type: "fixed", length_mm: 1150, width_mm: 510, thickness_mm: 65, maxLoad_kg: 700 },
            geometry: { footprint: { length_mm: 2800, width_mm: 2500, height_mm: 2800 }, workEnvelope: { x_mm: 1020, y_mm: 510, z_mm: 510 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 170, length_mm: 360, offset: { x: 0, y: 0, z: -180 } },
                table: { type: "box", dimensions: { x: 1150, y: 510, z: 65 }, position: { x: 0, y: 0, z: -65 } } },
            atc: { type: "arm", capacity: 24, maxToolDiameter_mm: 80, maxToolLength_mm: 300, changeTime_sec: 2.8 },
            physical: { weight_kg: 6800 }, sources: ["Leadwell MCV-1000B Specifications 2024"]
        },

        "leadwell_mcv1300d": {
            id: "leadwell_mcv1300d", manufacturer: "leadwell", model: "MCV-1300D", series: "MCV", type: "VMC", subtype: "3-axis-large", axes: 3, control: "FANUC 0i-MF Plus",
            spindle: { type: "inline", maxRpm: 8000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 180, taper: "BT50",
                geometry: { noseToGageLine_mm: 139.7, headDiameter_mm: 200, headLength_mm: 400 } },
            travels: { x: { min: 0, max: 1300, rapid_mm_min: 24000 }, y: { min: 0, max: 600, rapid_mm_min: 24000 }, z: { min: 0, max: 600, rapid_mm_min: 20000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 650, y: 300, z: 600 }, tableSurface: { x: 650, y: 300, z: 0 } }, spindleToTable_mm: 600 },
            table: { type: "fixed", length_mm: 1500, width_mm: 600, thickness_mm: 80, maxLoad_kg: 1200 },
            geometry: { footprint: { length_mm: 3500, width_mm: 3100, height_mm: 3100 }, workEnvelope: { x_mm: 1300, y_mm: 600, z_mm: 600 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 200, length_mm: 400, offset: { x: 0, y: 0, z: -200 } },
                table: { type: "box", dimensions: { x: 1500, y: 600, z: 80 }, position: { x: 0, y: 0, z: -80 } } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 100, maxToolLength_mm: 350, changeTime_sec: 3.5 },
            physical: { weight_kg: 11000 }, sources: ["Leadwell MCV-1300D Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // V SERIES - 5-AXIS
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "leadwell_v30it": {
            id: "leadwell_v30it", manufacturer: "leadwell", model: "V-30iT", series: "V", type: "5AXIS", subtype: "trunnion-compact", axes: 5, control: "FANUC 31i-B5",
            spindle: { type: "motorSpindle", maxRpm: 12000, peakHp: 22, continuousHp: 18, maxTorque_Nm: 105, taper: "BBT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 165, headLength_mm: 350 } },
            travels: { x: { min: 0, max: 700, rapid_mm_min: 40000 }, y: { min: 0, max: 520, rapid_mm_min: 40000 }, z: { min: 0, max: 480, rapid_mm_min: 36000 },
                a: { min: -120, max: 30, rapid_deg_sec: 25 }, c: { min: -360, max: 360, rapid_deg_sec: 70, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "A", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    a: { type: "tilt", rotationVector: { i: 1, j: 0, k: 0 }, minAngle_deg: -120, maxAngle_deg: 30, pivotPoint_mm: { x: 350, y: 260, z: 160 }, pivotToTable_mm: 120, torque_Nm: 500, clampTorque_Nm: 1200 },
                    c: { type: "rotary", rotationVector: { i: 0, j: 0, k: 1 }, continuous: true, torque_Nm: 350, clampTorque_Nm: 800 }
                },
                referencePoints: { spindleGageLine: { x: 350, y: 260, z: 480 }, tableSurface: { x: 350, y: 260, z: 160 }, aPivotPoint: { x: 350, y: 260, z: 160 } },
                tcpcSupported: true, rtcpSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 450, tSlots: { count: 4, width_mm: 14, pattern: "radial" }, maxLoad_kg: 200,
                trunnion: { width_mm: 600, supportHeight_mm: 300, clearanceUnder_mm: 100 } },
            geometry: { footprint: { length_mm: 3200, width_mm: 3400, height_mm: 3000 }, workEnvelope: { x_mm: 700, y_mm: 520, z_mm: 480 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 165, length_mm: 350, offset: { x: 0, y: 0, z: -175 } },
                trunnionLeft: { type: "cylinder", diameter_mm: 240, length_mm: 150, position: { x: -300, y: 260, z: 160 } },
                trunnionRight: { type: "cylinder", diameter_mm: 240, length_mm: 150, position: { x: 300, y: 260, z: 160 } },
                rotaryTable: { type: "cylinder", diameter_mm: 450, height_mm: 85, rotatesWith: ["a", "c"] } },
            atc: { type: "arm", capacity: 40, maxToolDiameter_mm: 90, maxToolLength_mm: 300, changeTime_sec: 2.5 },
            accuracy: { positioning_mm: 0.006, repeatability_mm: 0.003, aAxisAccuracy_deg: 0.004, cAxisAccuracy_deg: 0.004 },
            physical: { weight_kg: 12000 }, sources: ["Leadwell V-30iT Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // LTC SERIES - CNC LATHES
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "leadwell_ltc20b": {
            id: "leadwell_ltc20b", manufacturer: "leadwell", model: "LTC-20B", series: "LTC", type: "LATHE", subtype: "2-axis", axes: 2, control: "FANUC 0i-TF Plus",
            spindle: { type: "belt_driven", maxRpm: 4000, peakHp: 15, continuousHp: 11, maxTorque_Nm: 200, spindleNose: "A2-5", chuckSize_mm: 203, barCapacity_mm: 51,
                geometry: { spindleBore_mm: 55 } },
            travels: { x: { min: 0, max: 200, rapid_mm_min: 30000 }, z: { min: 0, max: 450, rapid_mm_min: 36000 }, a: null, b: null, c: null, y: null },
            kinematics: { type: "LATHE_2AXIS", chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"],
                referencePoints: { spindleCenterline: { x: 0, z: 0 }, turretCenter: { x: 200, z: 225 } } },
            turret: { type: "disc", stations: 12, toolPattern: "VDI", vdiSize: 30, indexTime_sec: 0.2, liveTooling: false },
            tailstock: { included: true, travel_mm: 350, thrust_kN: 20 },
            geometry: { swingOverBed_mm: 400, maxTurningDiameter_mm: 260, maxTurningLength_mm: 400, footprint: { length_mm: 2500, width_mm: 1600, height_mm: 1900 } },
            collisionZones: { chuck: { type: "cylinder", diameter_mm: 203, length_mm: 90, position: { x: 0, z: 0 } },
                turret: { type: "cylinder", diameter_mm: 320, height_mm: 140, position: { x: 200, z: 225 } },
                tailstock: { type: "cylinder", diameter_mm: 80, length_mm: 150, position: { x: 0, z: 450 } } },
            physical: { weight_kg: 3200 }, sources: ["Leadwell LTC-20B Specifications 2024"]
        },

        "leadwell_ltc35bly": {
            id: "leadwell_ltc35bly", manufacturer: "leadwell", model: "LTC-35BLY", series: "LTC", type: "LATHE", subtype: "4-axis-y", axes: 4, control: "FANUC 0i-TF Plus",
            spindle: { type: "belt_driven", maxRpm: 3500, peakHp: 25, continuousHp: 20, maxTorque_Nm: 420, spindleNose: "A2-8", chuckSize_mm: 305, barCapacity_mm: 76,
                geometry: { spindleBore_mm: 82 } },
            travels: { x: { min: 0, max: 280, rapid_mm_min: 24000 }, y: { min: -50, max: 50, rapid_mm_min: 10000 }, z: { min: 0, max: 600, rapid_mm_min: 30000 },
                c: { min: -360, max: 360, rapid_deg_sec: 250, continuous: true } },
            kinematics: { type: "LATHE_4AXIS_Y", chain: ["SPINDLE", "C", "PART", "Z", "X", "Y", "TURRET", "TOOL"],
                yAxisCapability: "milling",
                rotaryAxes: { c: { type: "rotary", isMainSpindle: true, contouringCapable: true } } },
            turret: { type: "disc", stations: 12, toolPattern: "BMT", bmtSize: 45, liveTooling: true, liveToolRpm: 4000, liveToolHp: 5.5 },
            tailstock: { included: true, travel_mm: 500, thrust_kN: 25 },
            geometry: { swingOverBed_mm: 560, maxTurningDiameter_mm: 380, maxTurningLength_mm: 550, footprint: { length_mm: 3800, width_mm: 2000, height_mm: 2100 } },
            collisionZones: { chuck: { type: "cylinder", diameter_mm: 305, length_mm: 120, position: { x: 0, z: 0 } },
                turret: { type: "cylinder", diameter_mm: 400, height_mm: 180, position: { x: 280, y: 0, z: 300 } } },
            physical: { weight_kg: 7500 }, sources: ["Leadwell LTC-35BLY Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // T SERIES - TURNING CENTERS WITH SUB-SPINDLE
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "leadwell_t7smy": {
            id: "leadwell_t7smy", manufacturer: "leadwell", model: "T-7SMY", series: "T", type: "LATHE", subtype: "4-axis-sub-y", axes: 4, control: "FANUC 31i-B",
            mainSpindle: { type: "built_in", maxRpm: 5000, peakHp: 22, continuousHp: 18, maxTorque_Nm: 280, spindleNose: "A2-6", chuckSize_mm: 254, barCapacity_mm: 65 },
            subSpindle: { type: "built_in", maxRpm: 6000, peakHp: 15, continuousHp: 11, maxTorque_Nm: 140, spindleNose: "A2-5", chuckSize_mm: 165 },
            travels: { x: { min: 0, max: 220, rapid_mm_min: 30000 }, y: { min: -55, max: 55, rapid_mm_min: 12000 }, z: { min: 0, max: 550, rapid_mm_min: 36000 },
                c: { min: -360, max: 360, rapid_deg_sec: 300, continuous: true }, w: { min: 0, max: 480, rapid_mm_min: 30000 } },
            kinematics: { type: "LATHE_4AXIS_SY", chain: ["MAIN_SPINDLE", "C", "PART", "Z", "X", "Y", "TURRET", "TOOL"],
                hasSubSpindle: true, yAxisCapability: "milling",
                rotaryAxes: { c: { type: "rotary", isMainSpindle: true, contouringCapable: true } } },
            turret: { type: "disc", stations: 12, toolPattern: "BMT", bmtSize: 55, liveTooling: true, liveToolRpm: 6000, liveToolHp: 7.5 },
            geometry: { swingOverBed_mm: 440, maxTurningDiameter_mm: 280, maxTurningLength_mm: 500, footprint: { length_mm: 4200, width_mm: 2100, height_mm: 2100 } },
            collisionZones: { mainChuck: { type: "cylinder", diameter_mm: 254, length_mm: 110, position: { x: 0, y: 0, z: 0 } },
                subChuck: { type: "cylinder", diameter_mm: 165, length_mm: 85, position: { x: 0, y: 0, z: 550 } },
                turret: { type: "cylinder", diameter_mm: 380, height_mm: 170, position: { x: 220, y: 0, z: 275 } } },
            physical: { weight_kg: 8000 }, sources: ["Leadwell T-7SMY Specifications 2024"]
        }
    }
};

PRISM_LEADWELL_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_LEADWELL_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_LEADWELL_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_LEADWELL_MACHINE_DATABASE_ENHANCED = PRISM_LEADWELL_MACHINE_DATABASE_ENHANCED;
console.log(`[LEADWELL_DATABASE] Enhanced database loaded with ${PRISM_LEADWELL_MACHINE_DATABASE_ENHANCED.totalMachines} machines`);
