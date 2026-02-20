const PRISM_BIG_DAISHOWA_HOLDER_DATABASE = {
    version: "1.0.0",
    manufacturer: "BIG DAISHOWA",
    holderCount: 110,
    tapers: {
        BCV40: {
            name: "BIG-PLUS BT40",
            interface: "BT40",
            maxRPM: 30000,
            balanceGrade: "G2.5 @ 25,000 RPM",
            runout: 0.003,
            pullStudOptions: ["MAS403", "JIS B6339"],
            description: "Dual-contact BT40 with simultaneous taper and face contact"
        },
        BCV50: {
            name: "BIG-PLUS BT50",
            interface: "BT50",
            maxRPM: 20000,
            balanceGrade: "G2.5 @ 15,000 RPM",
            runout: 0.003,
            pullStudOptions: ["MAS403", "JIS B6339"],
            description: "Dual-contact BT50 with simultaneous taper and face contact"
        },
        HSK63A: {
            name: "HSK-A63",
            interface: "HSK-A63",
            maxRPM: 40000,
            balanceGrade: "G2.5 @ 30,000 RPM",
            runout: 0.002,
            description: "Hollow taper shank for high-speed applications"
        },
        HSK100A: {
            name: "HSK-A100",
            interface: "HSK-A100",
            maxRPM: 25000,
            balanceGrade: "G2.5 @ 20,000 RPM",
            runout: 0.002,
            description: "Hollow taper shank for heavy-duty applications"
        },
        CAT40: {
            name: "CAT40 (V-Flange)",
            interface: "CAT40",
            maxRPM: 12000,
            balanceGrade: "G6.3",
            runout: 0.005,
            description: "Standard CAT40 V-flange taper"
        },
        CAT50: {
            name: "CAT50 (V-Flange)",
            interface: "CAT50",
            maxRPM: 8000,
            balanceGrade: "G6.3",
            runout: 0.005,
            description: "Standard CAT50 V-flange taper"
        }
    },
    series: {
        megaNewBaby: {
            name: "MEGA New Baby Chuck",
            type: "Collet Chuck",
            capacityRange: { min: 6, max: 25, unit: "mm" },
            application: "High-precision drilling, reaming, tapping",
            runout: 0.003,
            grippingForce: "High",
            coolantThrough: true,
            features: ["Slim design", "Anti-pullout mechanism", "Vibration dampening"]
        },
        megaMicro: {
            name: "MEGA Micro Chuck",
            type: "Collet Chuck",
            capacityRange: { min: 0.5, max: 8, unit: "mm" },
            application: "Micro machining, precision drilling",
            runout: 0.002,
            grippingForce: "Medium",
            coolantThrough: true,
            features: ["Ultra-slim design", "High concentricity", "Micro tool clamping"]
        },
        megaEChuck: {
            name: "MEGA E Chuck",
            type: "Milling Chuck",
            capacityRange: { min: 3, max: 25, unit: "mm" },
            application: "End milling, drilling, boring",
            runout: 0.003,
            grippingForce: "Very High",
            coolantThrough: true,
            features: ["High gripping torque", "Anti-slip design", "Balanced for HSM"]
        },
        megaDoublePower: {
            name: "MEGA Double Power Chuck",
            type: "High-torque Milling Chuck",
            capacityRange: { min: 16, max: 32, unit: "mm" },
            application: "Heavy roughing, high-torque milling",
            runout: 0.005,
            grippingForce: "Maximum",
            coolantThrough: true,
            features: ["Dual-contact gripping", "Extreme torque capacity", "Vibration resistant"]
        },
        megaERGrip: {
            name: "MEGA ER Grip",
            type: "ER Collet Chuck",
            colletSizes: ["ER11", "ER16", "ER20", "ER25", "ER32", "ER40"],
            application: "Universal clamping, quick changeover",
            runout: 0.005,
            grippingForce: "High",
            coolantThrough: true,
            features: ["Quick collet change", "Wide size range", "Cost-effective"]
        },
        megaSynchro: {
            name: "MEGA Synchro Tapping Chuck",
            type: "Tapping Chuck",
            capacityRange: { min: "M2", max: "M20" },
            application: "Rigid and floating tapping",
            compensation: { axial: 0.5, radial: 0.3, unit: "mm" },
            features: ["Length compensation", "Torque limiting", "High-speed tapping"]
        },
        shrinkFit: {
            name: "Shrink Fit Holder",
            type: "Thermal Shrink",
            capacityRange: { min: 3, max: 32, unit: "mm" },
            application: "High-speed finishing, precision work",
            runout: 0.001,
            grippingForce: "Extreme",
            coolantThrough: true,
            features: ["Best runout", "Highest rigidity", "Requires heating unit"]
        },
        hydraulic: {
            name: "Hydraulic Chuck",
            type: "Hydraulic Expansion",
            capacityRange: { min: 6, max: 32, unit: "mm" },
            application: "Finishing, medium-duty milling",
            runout: 0.002,
            grippingForce: "High",
            coolantThrough: true,
            features: ["Vibration dampening", "Quick clamping", "No special equipment"]
        }
    },
    gaugeProjections: {
        short: { range: "2.5-4", desc: "Short projection for maximum rigidity" },
        medium: { range: "5-6", desc: "Standard projection for general use" },
        long: { range: "8-10", desc: "Extended projection for deep pockets" },
        extraLong: { range: "12+", desc: "Extra-long for deep cavity access" }
    }
}