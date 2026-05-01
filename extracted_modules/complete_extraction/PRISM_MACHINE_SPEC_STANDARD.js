const PRISM_MACHINE_SPEC_STANDARD = {
    version: "1.0",

    // Standard specification template
    specTemplate: {
        identification: {
            manufacturer: "",
            model: "",
            type: "",  // VMC, HMC, Lathe, Mill-Turn, etc.
            series: "",
            controller: ""
        },
        axes: {
            count: 0,
            configuration: "",  // 3-axis, 4-axis, 5-axis table-table, etc.
            travel: {
                x: { min: 0, max: 0, units: "mm" },
                y: { min: 0, max: 0, units: "mm" },
                z: { min: 0, max: 0, units: "mm" },
                a: { min: 0, max: 0, units: "deg" },
                b: { min: 0, max: 0, units: "deg" },
                c: { min: 0, max: 0, units: "deg" }
            }
        },
        spindle: {
            maxRPM: 0,
            spindleHP: 0,
            spindleKW: 0,
            taper: "",  // BT30, BT40, CAT40, HSK-A63, etc.
            bearingType: "",
            orientation: "vertical"  // vertical, horizontal
        },
        table: {
            width: 0,
            length: 0,
            diameter: 0,  // for rotary tables
            tSlots: 0,
            loadCapacity: 0,
            units: "mm/kg"
        },
        toolChanger: {
            type: "",  // Drum, Carousel, Chain, Matrix
            capacity: 0,
            maxToolDiameter: 0,
            maxToolLength: 0,
            maxToolWeight: 0,
            changeTime: 0,
            chipToChip: 0
        },
        performance: {
            rapidTraverse: { x: 0, y: 0, z: 0, units: "m/min" },
            feedRate: { max: 0, units: "mm/min" },
            accuracy: { positioning: 0, repeatability: 0, units: "mm" }
        },
        physical: {
            weight: 0,
            footprint: { width: 0, depth: 0, height: 0 },
            powerRequirement: 0,
            airRequirement: 0
        },
        kinematics: {
            type: "",  // For 5-axis: table-table, head-head, table-head
            pivotPoint: { x: 0, y: 0, z: 0 },
            rotarySpeed: { a: 0, b: 0, c: 0, units: "deg/sec" }
        }
    },
    // Convert legacy machine data to standard format
    standardize: function(machineData) {
        const standard = JSON.parse(JSON.stringify(this.specTemplate));

        // Map common fields
        if (machineData.model) standard.identification.model = machineData.model;
        if (machineData.manufacturer) standard.identification.manufacturer = machineData.manufacturer;
        if (machineData.type) standard.identification.type = machineData.type;
        if (machineData.controller) standard.identification.controller = machineData.controller;

        // Map travel
        if (machineData.travel) {
            if (machineData.travel.x) standard.axes.travel.x.max = machineData.travel.x;
            if (machineData.travel.y) standard.axes.travel.y.max = machineData.travel.y;
            if (machineData.travel.z) standard.axes.travel.z.max = machineData.travel.z;
        }
        // Map spindle
        if (machineData.spindle) {
            standard.spindle.maxRPM = machineData.spindle.maxRPM || machineData.maxRPM || 0;
            standard.spindle.spindleHP = machineData.spindle.spindleHP || machineData.spindleHP || 0;
            standard.spindle.spindleKW = machineData.spindle.spindleKW || machineData.spindleKW || 0;
            standard.spindle.taper = machineData.spindle.taper || machineData.taper || "";
        }
        // Map tool changer
        if (machineData.toolChanger) {
            standard.toolChanger.capacity = machineData.toolChanger.capacity || machineData.toolCapacity || 0;
            standard.toolChanger.changeTime = machineData.toolChanger.changeTime || 0;
            standard.toolChanger.chipToChip = machineData.toolChanger.chipToChip || 0;
        }
        // Map performance
        if (machineData.rapidTraverse) {
            standard.performance.rapidTraverse = machineData.rapidTraverse;
        }
        if (machineData.accuracy) {
            standard.performance.accuracy = machineData.accuracy;
        }
        return standard;
    },
    // Validate machine spec completeness
    validateSpec: function(spec) {
        const required = ['identification.model', 'axes.count', 'spindle.maxRPM'];
        const missing = [];

        for (const field of required) {
            const parts = field.split('.');
            let value = spec;
            for (const part of parts) {
                value = value?.[part];
            }
            if (!value) missing.push(field);
        }
        return {
            valid: missing.length === 0,
            missing: missing,
            completeness: (required.length - missing.length) / required.length * 100
        };
    }
}