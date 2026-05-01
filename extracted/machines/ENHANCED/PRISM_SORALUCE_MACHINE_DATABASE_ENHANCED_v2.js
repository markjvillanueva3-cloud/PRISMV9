/**
 * PRISM Soraluce Machine Database - ENHANCED v2.0
 * Full kinematic specifications for collision avoidance simulation
 * 
 * Manufacturer: Soraluce S. Coop. (Danobat Group)
 * Headquarters: Bergara, Gipuzkoa, Basque Country, Spain
 * Specialty: Floor-type milling, large gantry, multitasking bed-type
 * Technology: DAS (Dynamics Active Stabilizer) - patented anti-vibration
 * 
 * Generated: 2026-01-20
 * Version: 2.0.0 ENHANCED
 * Machines: 7
 */

const PRISM_SORALUCE_MACHINE_DATABASE_ENHANCED_v2 = {
    manufacturer: {
        id: "soraluce",
        name: "Soraluce",
        fullName: "Soraluce S. Coop. (Danobat Group)",
        country: "Spain",
        city: "Bergara, Gipuzkoa, Basque Country",
        founded: 1962,
        specialty: ["Floor-Type Milling", "Large Gantry", "Multitasking", "Bed-Type"],
        technology: "DAS (Dynamics Active Stabilizer) - patented anti-vibration"
    },
    
    version: "2.0.0",
    schemaVersion: "ENHANCED_v2",
    lastUpdated: "2026-01-20",
    totalMachines: 7,
    
    categories: {
        "FLOOR_TYPE": ["TA-35", "TA-40", "TA-A35"],
        "BED_TYPE": ["FMW-14000", "FR-22000"],
        "GANTRY": ["SP-18000", "PMG-8000"]
    },
    
    machines: {
        "soraluce_ta_35": {
            id: "soraluce_ta_35",
            model: "TA-35",
            type: "FLOOR_TYPE",
            description: "Floor-type milling-boring with DAS anti-vibration technology",
            axes: 5,
            control: { manufacturer: "Heidenhain", model: "TNC 640", features: ["TCPM", "Dynamic Collision", "DAS Integration"] },
            spindle: {
                type: "gear-driven",
                maxRpm: 6000,
                peakPower: 55,
                continuousPower: 39,
                peakTorque: 550,
                taper: "HSK-A100",
                geometry: { noseToGageLine: 130, housingDiameter: 320, housingLength: 500 }
            },
            travels: { x: { max: 3500 }, y: { max: 1400 }, z: { max: 1000 }, w: { max: 600 } },
            rotaryAxes: {
                a: { type: "tilting_head", range: { min: -120, max: 30 }, drive: "worm_gear", maxSpeed: 8, clampTorque: 6000, pivotPoint: { z: -200 } },
                c: { continuous: true, maxSpeed: 12, clampTorque: 5000 }
            },
            das: {
                enabled: true,
                type: "DAS (Dynamics Active Stabilizer)",
                description: "Patented active damping system for chatter elimination",
                frequencyRange: { min: 10, max: 300 },
                productivityIncrease: "up to 300%"
            },
            rapids: { x: 20000, y: 18000, z: 15000, w: 10000 },
            table: { type: "floor_plates", length: 4500, width: 1800, maxLoad: 15000 },
            atc: { capacity: 60, maxToolWeight: 40, changeTime: 12 },
            kinematicChain: { type: "XYZWAC_HEAD", structure: "floor_type_moving_column" },
            collisionZones: {
                millingHead: { type: "composite", components: [
                    { type: "cylinder", diameter: 320, length: 500 },
                    { type: "box", dimensions: { x: 450, y: 550, z: 400 }, offset: { z: 500 } }
                ]},
                column: { type: "box", dimensions: { x: 800, y: 1200, z: 3500 } }
            },
            tcpcRtcp: { supported: true, modes: ["TCPM", "M128"] }
        },
        
        "soraluce_ta_40": {
            id: "soraluce_ta_40",
            model: "TA-40",
            type: "FLOOR_TYPE",
            description: "Large floor-type milling for heavy-duty machining",
            axes: 5,
            spindle: { maxRpm: 5000, peakPower: 75, peakTorque: 850, taper: "HSK-A100" },
            travels: { x: { max: 5000 }, y: { max: 2000 }, z: { max: 1400 }, w: { max: 800 } },
            rotaryAxes: {
                a: { range: { min: -120, max: 30 }, maxSpeed: 6, clampTorque: 10000, pivotPoint: { z: -220 } },
                c: { continuous: true, maxSpeed: 10, clampTorque: 8000 }
            },
            das: { enabled: true, type: "DAS+", productivityIncrease: "up to 300%" },
            rapids: { x: 15000, y: 12000, z: 10000, w: 8000 },
            table: { length: 6000, width: 2500, maxLoad: 25000 },
            atc: { capacity: 60, maxToolWeight: 50, changeTime: 15 }
        },
        
        "soraluce_ta_a35": {
            id: "soraluce_ta_a35",
            model: "TA-A35",
            type: "FLOOR_TYPE",
            description: "Floor-type with automatic head change capability",
            axes: 5,
            spindle: { maxRpm: 6000, peakPower: 55, taper: "HSK-A100" },
            travels: { x: { max: 3500 }, y: { max: 1400 }, z: { max: 1000 }, w: { max: 600 } },
            rotaryAxes: {
                a: { range: { min: -120, max: 30 }, maxSpeed: 8, pivotPoint: { z: -200 } },
                c: { continuous: true, maxSpeed: 12 }
            },
            automaticHeadChange: { enabled: true, headTypes: ["Universal", "Orthogonal", "Angular"], changeTime: 60, headStorage: 3 },
            das: { enabled: true },
            rapids: { x: 20000, y: 18000, z: 15000 },
            table: { length: 4500, width: 1800, maxLoad: 15000 },
            atc: { capacity: 60 }
        },
        
        "soraluce_fmw_14000": {
            id: "soraluce_fmw_14000",
            model: "FMW-14000",
            type: "BED_TYPE",
            description: "Long-travel bed-type floor mill for very large parts",
            axes: 5,
            spindle: { maxRpm: 6000, peakPower: 65, peakTorque: 680, taper: "HSK-A100" },
            travels: { x: { max: 14000 }, y: { max: 3000 }, z: { max: 1500 } },
            rotaryAxes: {
                a: { range: { min: -120, max: 30 }, maxSpeed: 6, pivotPoint: { z: -200 } },
                c: { continuous: true, maxSpeed: 10 }
            },
            das: { enabled: true },
            rapids: { x: 15000, y: 12000, z: 10000 },
            workEnvelope: { maxX: 14000, maxY: 3000, maxZ: 1500, usableVolume: 63000000000 },
            table: { type: "floor_plates", length: 16000, width: 3500, maxLoad: 50000 },
            atc: { capacity: 80, changeTime: 15 },
            coolant: { throughSpindle: true, tscPressure: 1000 }
        },
        
        "soraluce_fr_22000": {
            id: "soraluce_fr_22000",
            model: "FR-22000",
            type: "BED_TYPE",
            description: "Multitasking bed-type for milling, turning, grinding",
            axes: 6,
            spindle: { maxRpm: 5000, peakPower: 80, taper: "HSK-A100" },
            travels: { x: { max: 22000 }, y: { max: 4000 }, z: { max: 2000 } },
            rotaryAxes: {
                a: { range: { min: -120, max: 30 }, maxSpeed: 5 },
                c: { continuous: true, maxSpeed: 8 },
                b: { type: "rotary_table", optional: true, tableDiameter: 3000, turningCapable: true }
            },
            das: { enabled: true },
            multitasking: { milling: true, turning: true, grinding: true, headTypes: ["Milling", "Turning", "Grinding"] },
            rapids: { x: 12000, y: 10000, z: 8000 },
            table: { length: 24000, width: 5000, maxLoad: 100000 },
            atc: { capacity: 100 }
        },
        
        "soraluce_sp_18000": {
            id: "soraluce_sp_18000",
            model: "SP-18000",
            type: "GANTRY",
            description: "Large gantry milling machine for aerospace and energy",
            axes: 5,
            control: { manufacturer: "Heidenhain", model: "TNC 640", features: ["TCPM", "KinematicsOpt", "DAS"] },
            spindle: {
                maxRpm: 5000,
                peakPower: 100,
                peakTorque: 1200,
                taper: "HSK-A125",
                geometry: { noseToGageLine: 180, housingDiameter: 450, housingLength: 700 }
            },
            travels: { x: { max: 18000 }, y: { max: 4000 }, z: { max: 2000 } },
            rotaryAxes: {
                a: { type: "fork_head", range: { min: -110, max: 110 }, drive: "direct_drive", maxSpeed: 10, clampTorque: 15000, pivotPoint: { z: -280 } },
                c: { continuous: true, maxSpeed: 15, clampTorque: 12000 }
            },
            das: { enabled: true, type: "DAS+" },
            rapids: { x: 10000, y: 10000, z: 8000 },
            workEnvelope: { maxX: 18000, maxY: 4000, maxZ: 2000, usableVolume: 144000000000 },
            table: { type: "floor_plates", length: 20000, width: 5000, maxLoad: 100000 },
            atc: { capacity: 100, maxToolWeight: 80, changeTime: 20 },
            coolant: { throughSpindle: true, tscPressure: 1000 },
            kinematicChain: { type: "XYZAC_FORK", structure: "gantry_moving_bridge" },
            collisionZones: {
                forkHead: { type: "composite", components: [
                    { type: "cylinder", diameter: 450, length: 700 },
                    { type: "box", dimensions: { x: 700, y: 300, z: 600 }, offset: { z: 700 } }
                ]},
                bridge: { type: "box", dimensions: { x: 5500, y: 1200, z: 1500 } }
            },
            tcpcRtcp: { supported: true, modes: ["TCPM"] }
        },
        
        "soraluce_pmg_8000": {
            id: "soraluce_pmg_8000",
            model: "PMG-8000",
            type: "GANTRY",
            description: "Portal milling gantry for medium-large parts",
            axes: 5,
            spindle: { maxRpm: 6000, peakPower: 65, taper: "HSK-A100" },
            travels: { x: { max: 8000 }, y: { max: 3000 }, z: { max: 1500 } },
            rotaryAxes: {
                a: { range: { min: -110, max: 110 }, maxSpeed: 12 },
                c: { continuous: true, maxSpeed: 18 }
            },
            das: { enabled: true },
            rapids: { x: 15000, y: 15000, z: 12000 },
            table: { length: 10000, width: 3500, maxLoad: 40000 },
            atc: { capacity: 80 }
        }
    },
    
    getMachineById: function(id) { return this.machines[id] || null; },
    getDASMachines: function() { return Object.values(this.machines).filter(m => m.das && m.das.enabled); },
    getMultitaskingMachines: function() { return Object.values(this.machines).filter(m => m.multitasking); }
};

if (typeof module !== "undefined") module.exports = PRISM_SORALUCE_MACHINE_DATABASE_ENHANCED_v2;
if (typeof window !== "undefined") window.PRISM_SORALUCE_MACHINE_DATABASE_ENHANCED_v2 = PRISM_SORALUCE_MACHINE_DATABASE_ENHANCED_v2;
