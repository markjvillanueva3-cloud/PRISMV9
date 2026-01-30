/**
 * PRISM Fidia Machine Database - ENHANCED v2.0
 * Full kinematic specifications for collision avoidance simulation
 * 
 * Manufacturer: Fidia S.p.A.
 * Headquarters: San Mauro Torinese, Turin, Italy
 * Specialty: High-speed 5-axis for die/mold, aerospace composites, portable milling
 * Controls: Fidia C40 Vision (proprietary high-speed CNC)
 * 
 * Generated: 2026-01-20
 * Version: 2.0.0 ENHANCED
 * Machines: 7
 */

const PRISM_FIDIA_MACHINE_DATABASE_ENHANCED_v2 = {
    manufacturer: {
        id: "fidia",
        name: "Fidia",
        fullName: "Fidia S.p.A.",
        country: "Italy",
        city: "San Mauro Torinese, Turin",
        founded: 1974,
        specialty: ["High-Speed 5-Axis", "Die/Mold", "Aerospace Composites", "Portable Milling"],
        controlSystem: "Fidia C40 Vision - proprietary high-dynamics CNC"
    },
    
    version: "2.0.0",
    schemaVersion: "ENHANCED_v2",
    lastUpdated: "2026-01-20",
    totalMachines: 7,
    
    categories: {
        "COMPACT_5AXIS": ["D321", "D321 Linear"],
        "GANTRY_5AXIS": ["GTR 2500", "GTR 4500", "GTF 3014"],
        "PORTABLE": ["K199", "K211"]
    },
    
    machines: {
        "fidia_d321": {
            id: "fidia_d321",
            model: "D321",
            type: "COMPACT_5AXIS",
            description: "Compact high-speed 5-axis for precision die/mold machining",
            axes: 5,
            control: {
                manufacturer: "Fidia",
                model: "C40 Vision",
                features: ["Look Ahead 5000", "RTCP", "Jerk Control", "Surface Quality Optimization"],
                maxBlockProcessing: 5000,
                lookAhead: 5000
            },
            spindle: {
                maxRpm: 24000,
                peakPower: 40,
                continuousPower: 30,
                taper: "HSK-A63",
                bearingType: "Ceramic Hybrid",
                geometry: { noseToGageLine: 90, housingDiameter: 160, housingLength: 280 }
            },
            travels: { x: { max: 800 }, y: { max: 700 }, z: { max: 600 } },
            rotaryAxes: {
                a: { type: "trunnion_cradle", range: { min: -110, max: 30 }, drive: "direct_drive", maxSpeed: 50, pivotPoint: { z: 150 } },
                c: { type: "rotary_table", continuous: true, tableDiameter: 320, maxSpeed: 100, maxTableLoad: 300 }
            },
            rapids: { x: 40000, y: 40000, z: 30000 },
            acceleration: { x: 0.7, y: 0.7, z: 0.6 },
            jerk: { x: 50, y: 50, z: 40 },
            table: { diameter: 320, maxLoad: 300 },
            atc: { capacity: 36, changeTime: 4 },
            coolant: { throughSpindle: true, tscPressure: 580, mist: true },
            kinematicChain: { type: "XYZ_AC_TABLE", structure: "c-frame-trunnion" },
            tcpcRtcp: { supported: true, modes: ["RTCP", "TCPM"], highSpeedRTCP: true },
            accuracy: { positioning: { x: 0.005, y: 0.005, z: 0.004 } }
        },
        
        "fidia_d321_linear": {
            id: "fidia_d321_linear",
            model: "D321 Linear",
            type: "COMPACT_5AXIS",
            description: "Linear motor version with ultra-high dynamics",
            axes: 5,
            spindle: { maxRpm: 30000, peakPower: 35, taper: "HSK-E50" },
            travels: { x: { max: 800 }, y: { max: 700 }, z: { max: 600 } },
            rotaryAxes: {
                a: { range: { min: -110, max: 30 }, maxSpeed: 80, acceleration: 200 },
                c: { continuous: true, maxSpeed: 150, acceleration: 300 }
            },
            rapids: { x: 60000, y: 60000, z: 50000 },
            acceleration: { x: 1.5, y: 1.5, z: 1.2 },
            jerk: { x: 100, y: 100, z: 80 },
            linearMotors: { x: true, y: true, z: true, type: "ironless", thrust: { x: 8000, y: 8000, z: 6000 } },
            atc: { capacity: 36, changeTime: 3 }
        },
        
        "fidia_gtr_2500": {
            id: "fidia_gtr_2500",
            model: "GTR 2500",
            type: "GANTRY_5AXIS",
            description: "Medium gantry 5-axis for automotive dies and aerospace composites",
            axes: 5,
            spindle: { maxRpm: 24000, peakPower: 50, taper: "HSK-A63" },
            travels: { x: { max: 2500 }, y: { max: 2000 }, z: { max: 1000 } },
            rotaryAxes: {
                a: { type: "fork_head", range: { min: -120, max: 120 }, maxSpeed: 60, pivotPoint: { z: -150 } },
                c: { continuous: true, maxSpeed: 100 }
            },
            rapids: { x: 50000, y: 50000, z: 40000 },
            acceleration: { x: 0.6, y: 0.6, z: 0.5 },
            table: { length: 2700, width: 2200, maxLoad: 8000 },
            atc: { capacity: 40, changeTime: 5 },
            kinematicChain: { type: "XYZAC_FORK", structure: "gantry_fork_head" }
        },
        
        "fidia_gtr_4500": {
            id: "fidia_gtr_4500",
            model: "GTR 4500",
            type: "GANTRY_5AXIS",
            description: "Large gantry 5-axis for automotive class-A dies",
            axes: 5,
            spindle: { maxRpm: 20000, peakPower: 70, taper: "HSK-A100" },
            travels: { x: { max: 4500 }, y: { max: 2500 }, z: { max: 1200 } },
            rotaryAxes: {
                a: { range: { min: -120, max: 120 }, maxSpeed: 45, pivotPoint: { z: -180 } },
                c: { continuous: true, maxSpeed: 80 }
            },
            rapids: { x: 40000, y: 40000, z: 30000 },
            table: { length: 5000, width: 2700, maxLoad: 18000 },
            atc: { capacity: 60, changeTime: 7 }
        },
        
        "fidia_gtf_3014": {
            id: "fidia_gtf_3014",
            model: "GTF 3014",
            type: "GANTRY_5AXIS",
            description: "Floor-type gantry for very large dies and molds",
            axes: 5,
            spindle: { maxRpm: 18000, peakPower: 80, taper: "HSK-A100" },
            travels: { x: { max: 14000 }, y: { max: 3000 }, z: { max: 1500 } },
            rotaryAxes: {
                a: { range: { min: -120, max: 120 }, maxSpeed: 35 },
                c: { continuous: true, maxSpeed: 60 }
            },
            rapids: { x: 30000, y: 30000, z: 25000 },
            table: { type: "floor_plates", length: 15000, width: 3500, maxLoad: 50000 },
            atc: { capacity: 80 }
        },
        
        "fidia_k199": {
            id: "fidia_k199",
            model: "K199",
            type: "PORTABLE",
            description: "Portable 5-axis milling head for in-situ machining",
            axes: 5,
            control: { model: "C40 Compact", features: ["Portable Mode", "RTCP", "Manual Teaching"] },
            spindle: { maxRpm: 24000, peakPower: 20, taper: "HSK-E40" },
            travels: { x: { max: 1000 }, y: { max: 1000 }, z: { max: 600 } },
            rotaryAxes: {
                a: { type: "wrist", range: { min: -90, max: 90 }, maxSpeed: 40 },
                c: { type: "wrist", continuous: true, maxSpeed: 60 }
            },
            rapids: { x: 40000, y: 40000, z: 30000 },
            atc: { type: "manual", capacity: 20 },
            portability: { totalWeight: 800, setupTime: 30, mountingMethod: "vacuum_or_mechanical" }
        },
        
        "fidia_k211": {
            id: "fidia_k211",
            model: "K211",
            type: "PORTABLE",
            description: "Large portable 5-axis for aerospace in-situ repairs",
            axes: 5,
            spindle: { maxRpm: 20000, peakPower: 30, taper: "HSK-A63" },
            travels: { x: { max: 2000 }, y: { max: 1500 }, z: { max: 800 } },
            rotaryAxes: {
                a: { range: { min: -100, max: 100 }, maxSpeed: 30 },
                c: { continuous: true, maxSpeed: 50 }
            },
            rapids: { x: 30000, y: 30000, z: 25000 },
            portability: { totalWeight: 1500, setupTime: 60, mountingMethod: "rail_system" }
        }
    },
    
    getMachineById: function(id) { return this.machines[id] || null; },
    getPortableMachines: function() { return Object.values(this.machines).filter(m => m.type === "PORTABLE"); },
    getLinearMotorMachines: function() { return Object.values(this.machines).filter(m => m.linearMotors); }
};

if (typeof module !== "undefined") module.exports = PRISM_FIDIA_MACHINE_DATABASE_ENHANCED_v2;
if (typeof window !== "undefined") window.PRISM_FIDIA_MACHINE_DATABASE_ENHANCED_v2 = PRISM_FIDIA_MACHINE_DATABASE_ENHANCED_v2;
