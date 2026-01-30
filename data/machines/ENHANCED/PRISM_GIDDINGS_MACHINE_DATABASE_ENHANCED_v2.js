/**
 * PRISM Giddings & Lewis Machine Database - ENHANCED v2.0
 * Full kinematic specifications for collision avoidance simulation
 * 
 * Manufacturer: Giddings & Lewis LLC (Fives Group)
 * Headquarters: Fond du Lac, Wisconsin, USA
 * Specialty: Horizontal Boring Mills, Floor-Type Machines, Large Rotary Tables
 * 
 * Generated: 2026-01-20
 * Version: 2.0.0 ENHANCED
 * Machines: 8
 */

const PRISM_GIDDINGS_MACHINE_DATABASE_ENHANCED_v2 = {
    manufacturer: {
        id: "giddings",
        name: "Giddings & Lewis",
        fullName: "Giddings & Lewis LLC (Fives Group)",
        country: "USA",
        city: "Fond du Lac, Wisconsin",
        founded: 1859,
        specialty: ["Horizontal Boring Mills", "Floor-Type Machines", "Large Rotary Tables"],
        heritage: "Pioneer in horizontal boring technology since 1859"
    },
    
    version: "2.0.0",
    schemaVersion: "ENHANCED_v2",
    lastUpdated: "2026-01-20",
    totalMachines: 8,
    
    categories: {
        "TABLE_TYPE_HBM": ["RT 1250", "RT 1600"],
        "FLOOR_TYPE_HBM": ["FT 2500", "FT 3500", "FT 5000"],
        "PLANER_MILL": ["PM 2500", "PM 4000"],
        "ROTARY_TABLE": ["RTC 4000"]
    },
    
    machines: {
        "giddings_rt_1250": {
            id: "giddings_rt_1250",
            model: "RT 1250",
            type: "TABLE_TYPE_HBM",
            description: "Table-type horizontal boring mill for medium-size workpieces",
            axes: 5,
            control: { manufacturer: "Siemens", model: "840D sl", features: ["RTCP", "Boring Cycles"] },
            spindle: {
                type: "gear-driven",
                maxRpm: 3000,
                peakPower: 45,
                continuousPower: 37,
                peakTorque: 1500,
                taper: "ISO50",
                boringBarDiameter: 125,
                boringBarExtension: 600,
                geometry: { noseToGageLine: 180, housingDiameter: 380, housingLength: 550 }
            },
            travels: {
                x: { max: 2500 }, y: { max: 2000 }, z: { max: 1500 }, w: { max: 600 }
            },
            rotaryAxes: {
                b: {
                    type: "rotary_table",
                    continuous: true,
                    tableDiameter: 1250,
                    maxSpeed: 5,
                    clampTorque: 30000,
                    maxTableLoad: 15000,
                    rotaryAccuracy: 0.004
                }
            },
            rapids: { x: 10000, y: 8000, z: 8000, w: 3000 },
            table: { diameter: 1250, maxLoad: 15000, tSlots: { count: 6, radial: true } },
            atc: { capacity: 40, maxToolWeight: 40, changeTime: 15 },
            kinematicChain: { type: "XYZWB_TABLE", structure: "table_type_hbm" },
            collisionZones: {
                spindleHead: { type: "box", dimensions: { x: 500, y: 600, z: 800 } },
                column: { type: "box", dimensions: { x: 800, y: 600, z: 3000 } },
                rotaryTable: { type: "cylinder", diameter: 1250, length: 700 }
            },
            tcpcRtcp: { supported: true, modes: ["RTCP"] }
        },
        
        "giddings_rt_1600": {
            id: "giddings_rt_1600",
            model: "RT 1600",
            type: "TABLE_TYPE_HBM",
            axes: 5,
            spindle: { maxRpm: 2500, peakPower: 60, boringBarDiameter: 160 },
            travels: { x: { max: 3500 }, y: { max: 2500 }, z: { max: 2000 }, w: { max: 800 } },
            rotaryAxes: { b: { tableDiameter: 1600, maxTableLoad: 25000, clampTorque: 50000 } },
            table: { diameter: 1600, maxLoad: 25000 },
            atc: { capacity: 60 }
        },
        
        "giddings_ft_2500": {
            id: "giddings_ft_2500",
            model: "FT 2500",
            type: "FLOOR_TYPE_HBM",
            description: "Floor-type HBM for large energy and mining components",
            axes: 5,
            spindle: { maxRpm: 2000, peakPower: 75, boringBarDiameter: 180 },
            travels: { x: { max: 6000 }, y: { max: 3000 }, z: { max: 2500 }, w: { max: 1000 } },
            rotaryAxes: { b: { tableDiameter: 2500, maxTableLoad: 40000, clampTorque: 80000 } },
            table: { type: "floor_plates", length: 8000, width: 3500, maxLoad: 80000 },
            atc: { capacity: 60, maxToolWeight: 60, changeTime: 20 },
            kinematicChain: { type: "XYZWB_FLOOR", structure: "floor_type_hbm" }
        },
        
        "giddings_ft_3500": {
            id: "giddings_ft_3500",
            model: "FT 3500",
            type: "FLOOR_TYPE_HBM",
            axes: 5,
            spindle: { maxRpm: 1500, peakPower: 100, boringBarDiameter: 220 },
            travels: { x: { max: 10000 }, y: { max: 4000 }, z: { max: 3000 }, w: { max: 1200 } },
            rotaryAxes: { b: { tableDiameter: 3500, maxTableLoad: 60000, clampTorque: 120000 } },
            table: { length: 12000, width: 5000, maxLoad: 120000 },
            atc: { capacity: 80 }
        },
        
        "giddings_ft_5000": {
            id: "giddings_ft_5000",
            model: "FT 5000",
            type: "FLOOR_TYPE_HBM",
            description: "Extra-large floor-type HBM for power generation and mining",
            axes: 5,
            spindle: { maxRpm: 1200, peakPower: 150, boringBarDiameter: 280 },
            travels: { x: { max: 15000 }, y: { max: 5000 }, z: { max: 4000 }, w: { max: 1500 } },
            rotaryAxes: { b: { tableDiameter: 5000, maxTableLoad: 100000, clampTorque: 200000 } },
            table: { length: 18000, width: 6000, maxLoad: 200000 },
            atc: { capacity: 100, maxToolWeight: 100 }
        },
        
        "giddings_pm_2500": {
            id: "giddings_pm_2500",
            model: "PM 2500",
            type: "PLANER_MILL",
            description: "Double-column planer mill for large flat surfaces",
            axes: 4,
            spindle: { maxRpm: 2500, peakPower: 55, taper: "ISO50" },
            travels: { x: { max: 8000 }, y: { max: 2500 }, z: { max: 1500 } },
            table: { length: 10000, width: 2800, maxLoad: 50000 },
            atc: { capacity: 40 },
            kinematicChain: { type: "XYZW", structure: "planer_mill" }
        },
        
        "giddings_pm_4000": {
            id: "giddings_pm_4000",
            model: "PM 4000",
            type: "PLANER_MILL",
            axes: 4,
            spindle: { maxRpm: 2000, peakPower: 75, taper: "ISO50" },
            travels: { x: { max: 12000 }, y: { max: 4000 }, z: { max: 2000 } },
            table: { length: 14000, width: 4500, maxLoad: 100000 },
            atc: { capacity: 60 }
        },
        
        "giddings_rtc_4000": {
            id: "giddings_rtc_4000",
            model: "RTC 4000",
            type: "ROTARY_TABLE",
            description: "Heavy-duty floor-mounted rotary table for boring mills",
            axes: 1,
            rotaryAxes: {
                b: {
                    type: "floor_rotary_table",
                    continuous: true,
                    tableDiameter: 4000,
                    maxSpeed: 2,
                    clampTorque: 150000,
                    driveTorque: 50000,
                    maxTableLoad: 80000,
                    rotaryAccuracy: 0.005,
                    tSlots: { count: 12, radial: true },
                    centerBore: 500
                }
            },
            table: { diameter: 4000, maxLoad: 80000 },
            collisionZones: {
                table: { type: "cylinder", diameter: 4000, length: 800 },
                base: { type: "cylinder", diameter: 4500, length: 400, offset: { z: -800 } }
            }
        }
    },
    
    getMachineById: function(id) { return this.machines[id] || null; },
    getHorizontalBoringMills: function() {
        return Object.values(this.machines).filter(m => 
            m.type === "TABLE_TYPE_HBM" || m.type === "FLOOR_TYPE_HBM"
        );
    }
};

if (typeof module !== "undefined") module.exports = PRISM_GIDDINGS_MACHINE_DATABASE_ENHANCED_v2;
if (typeof window !== "undefined") window.PRISM_GIDDINGS_MACHINE_DATABASE_ENHANCED_v2 = PRISM_GIDDINGS_MACHINE_DATABASE_ENHANCED_v2;
