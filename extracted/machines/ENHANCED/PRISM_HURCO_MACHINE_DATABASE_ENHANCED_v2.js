/**
 * PRISM Hurco Machine Database - ENHANCED v2.0
 * Complete Geometric Dimensions & Full Kinematics for Collision Avoidance
 * 
 * Generated: 2026-01-20
 * Source: Hurco Companies Official Specifications 2024
 * 
 * Coverage:
 * - VM Series (Vertical Machining)
 * - VMX Series (Performance VMC)
 * - VMXi Series (5-Axis)
 * - TM Series (CNC Lathes)
 */

const PRISM_HURCO_MACHINE_DATABASE_ENHANCED = {
    manufacturer: "hurco",
    manufacturerFull: "Hurco Companies, Inc.",
    country: "USA",
    headquarters: "Indianapolis, Indiana",
    website: "https://www.hurco.com",
    controlSystem: "Hurco WinMax",
    version: "2.0.0",
    lastUpdated: "2026-01-20",
    totalMachines: 0,
    
    machines: {
        
        // ═══════════════════════════════════════════════════════════════════════════════════════
        // VM SERIES - VALUE VERTICAL MACHINING
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "hurco_vm10i": {
            id: "hurco_vm10i", manufacturer: "hurco", model: "VM10i", series: "VM", type: "VMC", subtype: "3-axis-compact", axes: 3, control: "Hurco WinMax",
            spindle: { type: "inline", maxRpm: 12000, peakHp: 15, continuousHp: 12, maxTorque_Nm: 65, taper: "BT40",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 150, headLength_mm: 320 } },
            travels: { x: { min: 0, max: 660, rapid_mm_min: 24000 }, y: { min: 0, max: 356, rapid_mm_min: 24000 }, z: { min: 0, max: 356, rapid_mm_min: 24000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 330, y: 178, z: 356 }, tableSurface: { x: 330, y: 178, z: 0 } }, spindleToTable_mm: 356 },
            table: { type: "fixed", length_mm: 813, width_mm: 356, thickness_mm: 60, tSlots: { count: 3, width_mm: 16, spacing_mm: 100 }, maxLoad_kg: 340 },
            geometry: { footprint: { length_mm: 1980, width_mm: 1700, height_mm: 2440 }, workEnvelope: { x_mm: 660, y_mm: 356, z_mm: 356 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 150, length_mm: 320, offset: { x: 0, y: 0, z: -160 } },
                table: { type: "box", dimensions: { x: 813, y: 356, z: 60 }, position: { x: 0, y: 0, z: -60 } } },
            atc: { type: "carousel", capacity: 20, maxToolDiameter_mm: 76, maxToolLength_mm: 254, changeTime_sec: 2.5 },
            physical: { weight_kg: 3175 }, sources: ["Hurco VM10i Specifications 2024"]
        },

        "hurco_vm20i": {
            id: "hurco_vm20i", manufacturer: "hurco", model: "VM20i", series: "VM", type: "VMC", subtype: "3-axis", axes: 3, control: "Hurco WinMax",
            spindle: { type: "inline", maxRpm: 10000, peakHp: 20, continuousHp: 15, maxTorque_Nm: 119, taper: "BT40",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 170, headLength_mm: 350 } },
            travels: { x: { min: 0, max: 1016, rapid_mm_min: 25000 }, y: { min: 0, max: 508, rapid_mm_min: 25000 }, z: { min: 0, max: 508, rapid_mm_min: 25000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 508, y: 254, z: 508 }, tableSurface: { x: 508, y: 254, z: 0 } }, spindleToTable_mm: 508 },
            table: { type: "fixed", length_mm: 1219, width_mm: 508, thickness_mm: 70, tSlots: { count: 5, width_mm: 16, spacing_mm: 100 }, maxLoad_kg: 680 },
            geometry: { footprint: { length_mm: 2590, width_mm: 2130, height_mm: 2740 }, workEnvelope: { x_mm: 1016, y_mm: 508, z_mm: 508 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 170, length_mm: 350, offset: { x: 0, y: 0, z: -175 } },
                table: { type: "box", dimensions: { x: 1219, y: 508, z: 70 }, position: { x: 0, y: 0, z: -70 } } },
            atc: { type: "carousel", capacity: 24, maxToolDiameter_mm: 76, maxToolLength_mm: 305, changeTime_sec: 2.8 },
            physical: { weight_kg: 5443 }, sources: ["Hurco VM20i Specifications 2024"]
        },

        "hurco_vm30i": {
            id: "hurco_vm30i", manufacturer: "hurco", model: "VM30i", series: "VM", type: "VMC", subtype: "3-axis", axes: 3, control: "Hurco WinMax",
            spindle: { type: "inline", maxRpm: 10000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 143, taper: "BT40",
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 180, headLength_mm: 370 } },
            travels: { x: { min: 0, max: 1270, rapid_mm_min: 25000 }, y: { min: 0, max: 610, rapid_mm_min: 25000 }, z: { min: 0, max: 610, rapid_mm_min: 25000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 635, y: 305, z: 610 }, tableSurface: { x: 635, y: 305, z: 0 } }, spindleToTable_mm: 610 },
            table: { type: "fixed", length_mm: 1524, width_mm: 610, thickness_mm: 80, maxLoad_kg: 1135 },
            geometry: { footprint: { length_mm: 3200, width_mm: 2640, height_mm: 2900 }, workEnvelope: { x_mm: 1270, y_mm: 610, z_mm: 610 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 370, offset: { x: 0, y: 0, z: -185 } },
                table: { type: "box", dimensions: { x: 1524, y: 610, z: 80 }, position: { x: 0, y: 0, z: -80 } } },
            atc: { type: "arm", capacity: 30, maxToolDiameter_mm: 76, maxToolLength_mm: 356, changeTime_sec: 3.0 },
            physical: { weight_kg: 7940 }, sources: ["Hurco VM30i Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // VMX SERIES - PERFORMANCE VMC
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "hurco_vmx42i": {
            id: "hurco_vmx42i", manufacturer: "hurco", model: "VMX42i", series: "VMX", type: "VMC", subtype: "3-axis-performance", axes: 3, control: "Hurco WinMax",
            spindle: { type: "inline", maxRpm: 12000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 119, taper: "BT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 180, headLength_mm: 370 } },
            travels: { x: { min: 0, max: 1067, rapid_mm_min: 35000 }, y: { min: 0, max: 610, rapid_mm_min: 35000 }, z: { min: 0, max: 610, rapid_mm_min: 35000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 533, y: 305, z: 610 }, tableSurface: { x: 533, y: 305, z: 0 } }, spindleToTable_mm: 610 },
            table: { type: "fixed", length_mm: 1372, width_mm: 610, thickness_mm: 75, tSlots: { count: 5, width_mm: 18, spacing_mm: 115 }, maxLoad_kg: 1135 },
            geometry: { footprint: { length_mm: 3050, width_mm: 2640, height_mm: 2950 }, workEnvelope: { x_mm: 1067, y_mm: 610, z_mm: 610 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 370, offset: { x: 0, y: 0, z: -185 } },
                table: { type: "box", dimensions: { x: 1372, y: 610, z: 75 }, position: { x: 0, y: 0, z: -75 } } },
            atc: { type: "arm", capacity: 40, maxToolDiameter_mm: 89, maxToolLength_mm: 356, changeTime_sec: 2.5 },
            accuracy: { positioning_mm: 0.005, repeatability_mm: 0.003 },
            physical: { weight_kg: 7260 }, sources: ["Hurco VMX42i Specifications 2024"]
        },

        "hurco_vmx50i": {
            id: "hurco_vmx50i", manufacturer: "hurco", model: "VMX50i", series: "VMX", type: "VMC", subtype: "3-axis-performance", axes: 3, control: "Hurco WinMax",
            spindle: { type: "inline", maxRpm: 10000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 178, taper: "BT50",
                geometry: { noseToGageLine_mm: 139.7, headDiameter_mm: 220, headLength_mm: 440 } },
            travels: { x: { min: 0, max: 1270, rapid_mm_min: 30000 }, y: { min: 0, max: 660, rapid_mm_min: 30000 }, z: { min: 0, max: 660, rapid_mm_min: 30000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 635, y: 330, z: 660 }, tableSurface: { x: 635, y: 330, z: 0 } }, spindleToTable_mm: 660 },
            table: { type: "fixed", length_mm: 1524, width_mm: 660, thickness_mm: 85, maxLoad_kg: 1800 },
            geometry: { footprint: { length_mm: 3500, width_mm: 2900, height_mm: 3100 }, workEnvelope: { x_mm: 1270, y_mm: 660, z_mm: 660 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 220, length_mm: 440, offset: { x: 0, y: 0, z: -220 } },
                table: { type: "box", dimensions: { x: 1524, y: 660, z: 85 }, position: { x: 0, y: 0, z: -85 } } },
            atc: { type: "arm", capacity: 40, maxToolDiameter_mm: 102, maxToolLength_mm: 406, changeTime_sec: 3.0 },
            physical: { weight_kg: 11340 }, sources: ["Hurco VMX50i Specifications 2024"]
        },

        "hurco_vmx64i": {
            id: "hurco_vmx64i", manufacturer: "hurco", model: "VMX64i", series: "VMX", type: "VMC", subtype: "3-axis-large", axes: 3, control: "Hurco WinMax",
            spindle: { type: "inline", maxRpm: 8000, peakHp: 40, continuousHp: 30, maxTorque_Nm: 280, taper: "BT50",
                geometry: { noseToGageLine_mm: 139.7, headDiameter_mm: 250, headLength_mm: 480 } },
            travels: { x: { min: 0, max: 1626, rapid_mm_min: 25000 }, y: { min: 0, max: 813, rapid_mm_min: 25000 }, z: { min: 0, max: 762, rapid_mm_min: 25000 }, a: null, b: null, c: null },
            kinematics: { type: "VMC_3AXIS", chain: ["SPINDLE", "Z", "Y", "X", "TABLE", "PART"],
                referencePoints: { spindleGageLine: { x: 813, y: 406, z: 762 }, tableSurface: { x: 813, y: 406, z: 0 } }, spindleToTable_mm: 762 },
            table: { type: "fixed", length_mm: 1829, width_mm: 813, thickness_mm: 100, maxLoad_kg: 2722 },
            geometry: { footprint: { length_mm: 4200, width_mm: 3400, height_mm: 3400 }, workEnvelope: { x_mm: 1626, y_mm: 813, z_mm: 762 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 250, length_mm: 480, offset: { x: 0, y: 0, z: -240 } },
                table: { type: "box", dimensions: { x: 1829, y: 813, z: 100 }, position: { x: 0, y: 0, z: -100 } } },
            atc: { type: "arm", capacity: 48, maxToolDiameter_mm: 127, maxToolLength_mm: 457, changeTime_sec: 3.5 },
            physical: { weight_kg: 15422 }, sources: ["Hurco VMX64i Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // VMXi 5-AXIS SERIES
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "hurco_vmx30ui": {
            id: "hurco_vmx30ui", manufacturer: "hurco", model: "VMX30Ui", series: "VMXi", type: "5AXIS", subtype: "trunnion", axes: 5, control: "Hurco WinMax",
            spindle: { type: "inline", maxRpm: 12000, peakHp: 25, continuousHp: 20, maxTorque_Nm: 119, taper: "BT40", bigPlus: true,
                geometry: { noseToGageLine_mm: 100.0, headDiameter_mm: 180, headLength_mm: 380 } },
            travels: { x: { min: 0, max: 762, rapid_mm_min: 35000 }, y: { min: 0, max: 508, rapid_mm_min: 35000 }, z: { min: 0, max: 508, rapid_mm_min: 35000 },
                b: { min: -15, max: 110, rapid_deg_sec: 30 }, c: { min: -360, max: 360, rapid_deg_sec: 80, continuous: true } },
            kinematics: { type: "TRUNNION_TABLE_TABLE", chain: ["SPINDLE", "Z", "Y", "X", "B", "C", "TABLE", "PART"], fiveAxisType: "table-table",
                rotaryAxes: {
                    b: { type: "tilt", rotationVector: { i: 0, j: 1, k: 0 }, minAngle_deg: -15, maxAngle_deg: 110, pivotPoint_mm: { x: 381, y: 254, z: 180 }, pivotToTable_mm: 130, torque_Nm: 450, clampTorque_Nm: 1100 },
                    c: { type: "rotary", rotationVector: { i: 0, j: 0, k: 1 }, continuous: true, torque_Nm: 300, clampTorque_Nm: 700 }
                },
                referencePoints: { spindleGageLine: { x: 381, y: 254, z: 508 }, tableSurface: { x: 381, y: 254, z: 180 }, bPivotPoint: { x: 381, y: 254, z: 180 } },
                tcpcSupported: true, rtcpSupported: true },
            table: { type: "trunnion_rotary", diameter_mm: 381, tSlots: { count: 4, width_mm: 14, pattern: "radial" }, maxLoad_kg: 227,
                trunnion: { width_mm: 600, supportHeight_mm: 280, clearanceUnder_mm: 100 } },
            geometry: { footprint: { length_mm: 2900, width_mm: 2700, height_mm: 2900 }, workEnvelope: { x_mm: 762, y_mm: 508, z_mm: 508 } },
            collisionZones: { spindleHead: { type: "cylinder", diameter_mm: 180, length_mm: 380, offset: { x: 0, y: 0, z: -190 } },
                trunnionLeft: { type: "cylinder", diameter_mm: 240, length_mm: 150, position: { x: -300, y: 254, z: 180 } },
                trunnionRight: { type: "cylinder", diameter_mm: 240, length_mm: 150, position: { x: 300, y: 254, z: 180 } },
                rotaryTable: { type: "cylinder", diameter_mm: 381, height_mm: 85, rotatesWith: ["b", "c"] } },
            atc: { type: "arm", capacity: 40, maxToolDiameter_mm: 89, maxToolLength_mm: 356, changeTime_sec: 2.8 },
            accuracy: { positioning_mm: 0.005, repeatability_mm: 0.003, bAxisAccuracy_deg: 0.002, cAxisAccuracy_deg: 0.002 },
            physical: { weight_kg: 8165 }, sources: ["Hurco VMX30Ui Specifications 2024"]
        },

        "hurco_vmx42sri": {
            id: "hurco_vmx42sri", manufacturer: "hurco", model: "VMX42SRi", series: "VMXi", type: "5AXIS", subtype: "swivel-head", axes: 5, control: "Hurco WinMax",
            spindle: { type: "motorSpindle", maxRpm: 18000, peakHp: 30, continuousHp: 25, maxTorque_Nm: 100, taper: "HSK-A63",
                geometry: { noseToGageLine_mm: 88.9, headDiameter_mm: 200, headLength_mm: 450 } },
            travels: { x: { min: 0, max: 1067, rapid_mm_min: 35000 }, y: { min: 0, max: 610, rapid_mm_min: 35000 }, z: { min: 0, max: 508, rapid_mm_min: 35000 },
                a: { min: -110, max: 30, rapid_deg_sec: 25 }, c: { min: -360, max: 360, rapid_deg_sec: 100, continuous: true } },
            kinematics: { type: "SWIVEL_HEAD_ROTARY_TABLE", chain: ["SPINDLE", "A", "Z", "Y", "X", "C", "TABLE", "PART"], fiveAxisType: "head-table",
                rotaryAxes: {
                    a: { type: "tilt", rotationVector: { i: 1, j: 0, k: 0 }, minAngle_deg: -110, maxAngle_deg: 30, pivotPoint_mm: { x: 533, y: 305, z: 350 }, onSpindleHead: true, torque_Nm: 250 },
                    c: { type: "rotary", rotationVector: { i: 0, j: 0, k: 1 }, continuous: true, onTable: true, torque_Nm: 500 }
                },
                referencePoints: { spindleGageLine: { x: 533, y: 305, z: 508 }, tableSurface: { x: 533, y: 305, z: 0 }, aPivotPoint: { x: 533, y: 305, z: 350 } },
                tcpcSupported: true },
            table: { type: "rotary", diameter_mm: 610, maxLoad_kg: 680 },
            geometry: { footprint: { length_mm: 3200, width_mm: 2900, height_mm: 3100 }, workEnvelope: { x_mm: 1067, y_mm: 610, z_mm: 508 } },
            collisionZones: { spindleHead: { type: "box", dimensions: { x: 300, y: 280, z: 500 }, rotatesWith: ["a"] },
                rotaryTable: { type: "cylinder", diameter_mm: 610, height_mm: 100, rotatesWith: ["c"] } },
            atc: { type: "arm", capacity: 40, maxToolDiameter_mm: 89, maxToolLength_mm: 356, changeTime_sec: 3.0 },
            physical: { weight_kg: 10200 }, sources: ["Hurco VMX42SRi Specifications 2024"]
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // TM SERIES - CNC LATHES
        // ═══════════════════════════════════════════════════════════════════════════════════════

        "hurco_tm8i": {
            id: "hurco_tm8i", manufacturer: "hurco", model: "TM8i", series: "TM", type: "LATHE", subtype: "2-axis", axes: 2, control: "Hurco WinMax Lathe",
            spindle: { type: "belt_drive", maxRpm: 4500, peakHp: 15, continuousHp: 12, maxTorque_Nm: 200, spindleNose: "A2-5", chuckSize_mm: 165, barCapacity_mm: 51,
                geometry: { spindleBore_mm: 56 } },
            travels: { x: { min: 0, max: 190, rapid_mm_min: 20000 }, z: { min: 0, max: 380, rapid_mm_min: 24000 }, a: null, b: null, c: null, y: null },
            kinematics: { type: "LATHE_2AXIS", chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"],
                referencePoints: { spindleCenterline: { x: 0, z: 0 }, turretCenter: { x: 190, z: 190 } } },
            turret: { type: "disc", stations: 8, toolPattern: "VDI", vdiSize: 30, indexTime_sec: 0.3, liveTooling: false },
            tailstock: { included: true, travel_mm: 300, thrust_kN: 12 },
            geometry: { swingOverBed_mm: 381, maxTurningDiameter_mm: 229, maxTurningLength_mm: 356, footprint: { length_mm: 2100, width_mm: 1500, height_mm: 1800 } },
            collisionZones: { chuck: { type: "cylinder", diameter_mm: 165, length_mm: 85, position: { x: 0, z: 0 } },
                turret: { type: "cylinder", diameter_mm: 280, height_mm: 140, position: { x: 190, z: 190 } } },
            physical: { weight_kg: 2268 }, sources: ["Hurco TM8i Specifications 2024"]
        },

        "hurco_tm10i": {
            id: "hurco_tm10i", manufacturer: "hurco", model: "TM10i", series: "TM", type: "LATHE", subtype: "2-axis", axes: 2, control: "Hurco WinMax Lathe",
            spindle: { type: "belt_drive", maxRpm: 4000, peakHp: 20, continuousHp: 15, maxTorque_Nm: 300, spindleNose: "A2-6", chuckSize_mm: 210, barCapacity_mm: 65 },
            travels: { x: { min: 0, max: 220, rapid_mm_min: 20000 }, z: { min: 0, max: 533, rapid_mm_min: 24000 }, a: null, b: null, c: null, y: null },
            kinematics: { type: "LATHE_2AXIS", chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"] },
            turret: { type: "disc", stations: 12, toolPattern: "VDI", vdiSize: 40, liveTooling: true, liveToolRpm: 4000 },
            tailstock: { included: true, travel_mm: 450 },
            geometry: { swingOverBed_mm: 457, maxTurningDiameter_mm: 305, maxTurningLength_mm: 508, footprint: { length_mm: 2600, width_mm: 1700, height_mm: 1900 } },
            collisionZones: { chuck: { type: "cylinder", diameter_mm: 210, length_mm: 100, position: { x: 0, z: 0 } },
                turret: { type: "cylinder", diameter_mm: 350, height_mm: 160, position: { x: 220, z: 266 } } },
            physical: { weight_kg: 3400 }, sources: ["Hurco TM10i Specifications 2024"]
        },

        "hurco_tm12i": {
            id: "hurco_tm12i", manufacturer: "hurco", model: "TM12i", series: "TM", type: "LATHE", subtype: "2-axis", axes: 2, control: "Hurco WinMax Lathe",
            spindle: { type: "geared", maxRpm: 3500, peakHp: 30, continuousHp: 25, maxTorque_Nm: 500, spindleNose: "A2-8", chuckSize_mm: 254, barCapacity_mm: 80 },
            travels: { x: { min: 0, max: 280, rapid_mm_min: 18000 }, z: { min: 0, max: 762, rapid_mm_min: 20000 }, a: null, b: null, c: null, y: null },
            kinematics: { type: "LATHE_2AXIS", chain: ["SPINDLE", "CHUCK", "PART", "Z", "X", "TURRET", "TOOL"] },
            turret: { type: "disc", stations: 12, toolPattern: "VDI", vdiSize: 50, liveTooling: true, liveToolRpm: 3500, liveToolHp: 7.5 },
            tailstock: { included: true, travel_mm: 650 },
            geometry: { swingOverBed_mm: 610, maxTurningDiameter_mm: 381, maxTurningLength_mm: 737, footprint: { length_mm: 3200, width_mm: 1900, height_mm: 2000 } },
            collisionZones: { chuck: { type: "cylinder", diameter_mm: 254, length_mm: 110, position: { x: 0, z: 0 } },
                turret: { type: "cylinder", diameter_mm: 420, height_mm: 190, position: { x: 280, z: 381 } } },
            physical: { weight_kg: 5443 }, sources: ["Hurco TM12i Specifications 2024"]
        }
    }
};

PRISM_HURCO_MACHINE_DATABASE_ENHANCED.totalMachines = Object.keys(PRISM_HURCO_MACHINE_DATABASE_ENHANCED.machines).length;
if (typeof module !== "undefined") module.exports = PRISM_HURCO_MACHINE_DATABASE_ENHANCED;
if (typeof window !== "undefined") window.PRISM_HURCO_MACHINE_DATABASE_ENHANCED = PRISM_HURCO_MACHINE_DATABASE_ENHANCED;
console.log(`[HURCO_DATABASE] Enhanced database loaded with ${PRISM_HURCO_MACHINE_DATABASE_ENHANCED.totalMachines} machines`);
