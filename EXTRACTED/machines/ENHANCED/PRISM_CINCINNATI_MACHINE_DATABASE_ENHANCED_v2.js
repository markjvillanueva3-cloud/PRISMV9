/**
 * PRISM Cincinnati Machine Tool Database - ENHANCED v2.0
 * Full kinematic specifications for collision avoidance simulation
 * 
 * Manufacturer: Cincinnati Incorporated (formerly Cincinnati Machine)
 * Headquarters: Harrison, Ohio, USA
 * Specialty: 5-axis profilers, aerospace gantry machines, large format machining
 * 
 * Generated: 2026-01-20
 * Version: 2.0.0 ENHANCED
 * Machines: 8
 */

const PRISM_CINCINNATI_MACHINE_DATABASE_ENHANCED_v2 = {
    manufacturer: {
        id: "cincinnati",
        name: "Cincinnati Machine",
        fullName: "Cincinnati Incorporated",
        country: "USA",
        city: "Harrison, Ohio",
        founded: 1884,
        specialty: ["5-Axis Profilers", "Aerospace Gantry", "Large Format Machining"],
        heritage: "First commercial NC milling machine manufacturer (1952)"
    },
    
    version: "2.0.0",
    schemaVersion: "ENHANCED_v2",
    lastUpdated: "2026-01-20",
    totalMachines: 8,
    
    categories: {
        "GANTRY_5AXIS": ["Lancer V5", "Lancer 1250 5X", "MAG5X"],
        "PROFILER": ["U5-400", "U5-600", "Gammtech 5-Axis"],
        "VMC": ["Maxim 500"],
        "LARGE_5AXIS": ["V5-3000"]
    },
    
    machines: {
        "cincinnati_lancer_v5": {
            id: "cincinnati_lancer_v5",
            model: "Lancer V5",
            type: "5AXIS_GANTRY",
            axes: 5,
            control: { manufacturer: "Siemens", model: "840D sl", features: ["TCPC", "RTCP"] },
            spindle: {
                maxRpm: 10000, peakPower: 60, continuousPower: 50,
                taper: "HSK-A100",
                geometry: { noseToGageLine: 120, housingDiameter: 300, housingLength: 500 }
            },
            travels: { x: { max: 5000 }, y: { max: 2000 }, z: { max: 1000 } },
            rotaryAxes: {
                a: { type: "fork_head", range: { min: -120, max: 30 }, drive: "direct_drive", maxSpeed: 50, pivotPoint: { z: -200 } },
                c: { continuous: true, drive: "direct_drive", maxSpeed: 80 }
            },
            rapids: { x: 30000, y: 30000, z: 20000 },
            acceleration: { x: 0.4, y: 0.4, z: 0.35 },
            table: { length: 6000, width: 2000, maxLoad: 24000 },
            atc: { capacity: 60, changeTime: 8 },
            kinematicChain: { type: "XYZAC_FORK", structure: "gantry_moving_bridge" },
            tcpcRtcp: { supported: true, modes: ["TCPC", "RTCP", "TRAORI"] }
        },
        
        "cincinnati_lancer_1250_5x": {
            id: "cincinnati_lancer_1250_5x",
            model: "Lancer 1250 5X",
            type: "5AXIS_GANTRY",
            axes: 5,
            spindle: { maxRpm: 8000, peakPower: 100, taper: "HSK-A100" },
            travels: { x: { max: 10000 }, y: { max: 4000 }, z: { max: 1400 } },
            rotaryAxes: {
                a: { range: { min: -120, max: 30 }, maxSpeed: 40, pivotPoint: { z: -250 } },
                c: { continuous: true, maxSpeed: 60 }
            },
            rapids: { x: 24000, y: 24000, z: 18000 },
            table: { length: 12000, width: 4000, maxLoad: 96000 },
            atc: { capacity: 80, changeTime: 10 }
        },
        
        "cincinnati_u5_400": {
            id: "cincinnati_u5_400",
            model: "U5-400",
            type: "PROFILER",
            description: "High-speed 5-axis profiler for aerospace aluminum skins",
            axes: 5,
            spindle: { maxRpm: 24000, peakPower: 40, taper: "HSK-A63" },
            travels: { x: { max: 4000 }, y: { max: 1400 }, z: { max: 600 } },
            rotaryAxes: {
                a: { range: { min: -110, max: 110 }, maxSpeed: 80, acceleration: 150 },
                c: { continuous: true, maxSpeed: 120, acceleration: 200 }
            },
            rapids: { x: 60000, y: 60000, z: 40000 },
            acceleration: { x: 0.8, y: 0.8, z: 0.6 },
            jerk: { x: 60, y: 60, z: 50 },
            table: { type: "vacuum_fixture", length: 5000, width: 1400 },
            atc: { capacity: 40, changeTime: 3.5 }
        },
        
        "cincinnati_u5_600": {
            id: "cincinnati_u5_600",
            model: "U5-600",
            type: "PROFILER",
            axes: 5,
            spindle: { maxRpm: 24000, peakPower: 50, taper: "HSK-A63" },
            travels: { x: { max: 6000 }, y: { max: 2000 }, z: { max: 800 } },
            rapids: { x: 50000, y: 50000, z: 35000 },
            acceleration: { x: 0.7, y: 0.7, z: 0.5 },
            table: { type: "vacuum_fixture", length: 7000, width: 2000 },
            atc: { capacity: 50 }
        },
        
        "cincinnati_gammtech": {
            id: "cincinnati_gammtech",
            model: "Gammtech 5-Axis",
            type: "5AXIS_GANTRY",
            axes: 5,
            spindle: { maxRpm: 20000, peakPower: 50, taper: "HSK-A63" },
            travels: { x: { max: 2000 }, y: { max: 1200 }, z: { max: 800 } },
            rapids: { x: 40000, y: 40000, z: 30000 },
            table: { length: 2200, width: 1400, maxLoad: 5000 },
            atc: { capacity: 40 }
        },
        
        "cincinnati_mag5x": {
            id: "cincinnati_mag5x",
            model: "MAG5X",
            type: "5AXIS_GANTRY",
            description: "Heavy-duty for titanium and steel aerospace",
            axes: 5,
            spindle: { maxRpm: 15000, peakPower: 80, taper: "HSK-A100" },
            travels: { x: { max: 5000 }, y: { max: 2000 }, z: { max: 1000 } },
            rapids: { x: 30000, y: 25000, z: 20000 },
            table: { length: 5500, width: 2300, maxLoad: 15000 },
            atc: { capacity: 60 }
        },
        
        "cincinnati_v5_3000": {
            id: "cincinnati_v5_3000",
            model: "V5-3000",
            type: "LARGE_5AXIS",
            axes: 5,
            spindle: { maxRpm: 12000, peakPower: 60, taper: "HSK-A100" },
            travels: { x: { max: 3000 }, y: { max: 2000 }, z: { max: 1000 } },
            rapids: { x: 25000, y: 20000, z: 15000 },
            table: { length: 3300, width: 2200, maxLoad: 10000 },
            atc: { capacity: 50 }
        },
        
        "cincinnati_maxim_500": {
            id: "cincinnati_maxim_500",
            model: "Maxim 500",
            type: "VMC",
            axes: 3,
            spindle: { maxRpm: 10000, peakPower: 30, taper: "CAT40" },
            travels: { x: { max: 762 }, y: { max: 508 }, z: { max: 508 } },
            rapids: { x: 36000, y: 36000, z: 24000 },
            table: { length: 1016, width: 508, maxLoad: 1032 },
            atc: { capacity: 24, changeTime: 4 }
        }
    },
    
    getMachineById: function(id) { return this.machines[id] || null; },
    getProfilers: function() { return Object.values(this.machines).filter(m => m.type === "PROFILER"); }
};

if (typeof module !== "undefined") module.exports = PRISM_CINCINNATI_MACHINE_DATABASE_ENHANCED_v2;
if (typeof window !== "undefined") window.PRISM_CINCINNATI_MACHINE_DATABASE_ENHANCED_v2 = PRISM_CINCINNATI_MACHINE_DATABASE_ENHANCED_v2;
