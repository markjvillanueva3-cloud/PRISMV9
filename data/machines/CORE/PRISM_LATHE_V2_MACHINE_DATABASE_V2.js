
// SECTION 1: LATHE MACHINE DATABASE

const PRISM_LATHE_V2_MACHINE_DATABASE_V2 = {

    // HAAS LATHES
    haas: {
        "ST-10": {
            manufacturer: "Haas", model: "ST-10", type: "2-axis_slant_bed",
            maxSwing: 419, maxTurningDiameter: 254, maxTurningLength: 356,
            barCapacity: 44, spindleNose: "A2-5", spindleBore: 52,
            spindleMotor: {
                power: 11.2, maxRPM: 6000, maxTorque: 102,
                torqueCurve: [
                    { rpm: 0, torque: 102 }, { rpm: 1000, torque: 102 },
                    { rpm: 2000, torque: 85 }, { rpm: 4000, torque: 45 },
                    { rpm: 6000, torque: 30 }
                ]
            },
            turret: { stations: 12, type: "BOT", indexTime: 0.5, maxToolSize: 25, rigidityFactor: 0.85 },
            tailstock: { available: true, quillDiameter: 60, thrustForce: 4448 },
            chuckOptions: ["6-inch_3-jaw", "8-inch_3-jaw", "collet"],
            coolant: { pressure: 6.9, flow: 45, tscAvailable: true, tscPressure: 69 },
            rigidityClass: "light", stabilityFactor: 0.80
        },
        "ST-20": {
            manufacturer: "Haas", model: "ST-20", type: "2-axis_slant_bed",
            maxSwing: 527, maxTurningDiameter: 330, maxTurningLength: 533,
            barCapacity: 57, spindleNose: "A2-6", spindleBore: 66,
            spindleMotor: {
                power: 22.4, maxRPM: 4000, maxTorque: 339,
                torqueCurve: [
                    { rpm: 0, torque: 339 }, { rpm: 500, torque: 339 },
                    { rpm: 1500, torque: 339 }, { rpm: 2500, torque: 200 },
                    { rpm: 4000, torque: 125 }
                ]
            },
            turret: { stations: 12, type: "BOT", indexTime: 0.5, maxToolSize: 25, rigidityFactor: 0.90 },
            tailstock: { available: true, quillDiameter: 70, thrustForce: 8896 },
            chuckOptions: ["8-inch_3-jaw", "10-inch_3-jaw", "collet"],
            coolant: { pressure: 6.9, flow: 75, tscAvailable: true, tscPressure: 69 },
            rigidityClass: "medium", stabilityFactor: 0.88
        },
        "ST-30": {
            manufacturer: "Haas", model: "ST-30", type: "2-axis_slant_bed",
            maxSwing: 806, maxTurningDiameter: 533, maxTurningLength: 660,
            barCapacity: 76, spindleNose: "A2-8", spindleBore: 102,
            spindleMotor: {
                power: 22.4, maxRPM: 3400, maxTorque: 610,
                torqueCurve: [
                    { rpm: 0, torque: 610 }, { rpm: 350, torque: 610 },
                    { rpm: 1000, torque: 610 }, { rpm: 2000, torque: 350 },
                    { rpm: 3400, torque: 200 }
                ]
            },
            turret: { stations: 12, type: "BOT", indexTime: 0.7, maxToolSize: 32, rigidityFactor: 0.92 },
            tailstock: { available: true, quillDiameter: 80, thrustForce: 17793 },
            chuckOptions: ["10-inch_3-jaw", "12-inch_3-jaw", "15-inch_3-jaw"],
            coolant: { pressure: 6.9, flow: 95, tscAvailable: true, tscPressure: 69 },
            rigidityClass: "heavy", stabilityFactor: 0.92
        },
        "ST-20Y": {
            manufacturer: "Haas", model: "ST-20Y", type: "3-axis_y-axis",
            maxSwing: 527, maxTurningDiameter: 330, maxTurningLength: 533,
            barCapacity: 51, spindleNose: "A2-6", spindleBore: 60,
            spindleMotor: {
                power: 22.4, maxRPM: 4000, maxTorque: 339,
                torqueCurve: [
                    { rpm: 0, torque: 339 }, { rpm: 500, torque: 339 },
                    { rpm: 1500, torque: 339 }, { rpm: 2500, torque: 200 },
                    { rpm: 4000, torque: 125 }
                ]
            },
            liveTooling: { power: 5.6, maxRPM: 6000, torque: 25 },
            yAxis: { travel: 102, rapid: 15.2 },
            turret: { stations: 12, type: "VDI40", indexTime: 0.5, maxToolSize: 40, rigidityFactor: 0.88 },
            tailstock: { available: true, quillDiameter: 70, thrustForce: 8896 },
            chuckOptions: ["8-inch_3-jaw", "collet"],
            coolant: { pressure: 6.9, flow: 75, tscAvailable: true, tscPressure: 69 },
            rigidityClass: "medium", stabilityFactor: 0.85
        },
        "ST-35": {
            manufacturer: "Haas", model: "ST-35", type: "2-axis_slant_bed",
            maxSwing: 917, maxTurningDiameter: 584, maxTurningLength: 1016,
            barCapacity: 102, spindleNose: "A2-11", spindleBore: 155,
            spindleMotor: {
                power: 29.8, maxRPM: 2400, maxTorque: 1356,
                torqueCurve: [
                    { rpm: 0, torque: 1356 }, { rpm: 200, torque: 1356 },
                    { rpm: 600, torque: 1356 }, { rpm: 1500, torque: 600 },
                    { rpm: 2400, torque: 350 }
                ]
            },
            turret: { stations: 12, type: "BOT", indexTime: 0.8, maxToolSize: 40, rigidityFactor: 0.94 },
            tailstock: { available: true, quillDiameter: 100, thrustForce: 26689 },
            chuckOptions: ["15-inch_3-jaw", "18-inch_3-jaw"],
            coolant: { pressure: 6.9, flow: 150, tscAvailable: true, tscPressure: 69 },
            rigidityClass: "heavy", stabilityFactor: 0.94
        }
    },
    // MAZAK LATHES
    mazak: {
        "QT-250": {
            manufacturer: "Mazak", model: "QT-250", type: "2-axis_slant_bed",
            maxSwing: 580, maxTurningDiameter: 350, maxTurningLength: 500,
            barCapacity: 65, spindleNose: "A2-6", spindleBore: 71,
            spindleMotor: {
                power: 18.5, maxRPM: 4000, maxTorque: 480,
                torqueCurve: [
                    { rpm: 0, torque: 480 }, { rpm: 500, torque: 480 },
                    { rpm: 1500, torque: 350 }, { rpm: 3000, torque: 180 },
                    { rpm: 4000, torque: 130 }
                ]
            },
            turret: { stations: 12, type: "wedge", indexTime: 0.2, maxToolSize: 25, rigidityFactor: 0.94 },
            tailstock: { available: true, quillDiameter: 75, thrustForce: 15000 },
            chuckOptions: ["8-inch_3-jaw", "10-inch_3-jaw"],
            coolant: { pressure: 7, flow: 80, tscAvailable: true, tscPressure: 70 },
            rigidityClass: "heavy", stabilityFactor: 0.94
        },
        "QT-300": {
            manufacturer: "Mazak", model: "QT-300", type: "2-axis_slant_bed",
            maxSwing: 700, maxTurningDiameter: 420, maxTurningLength: 750,
            barCapacity: 80, spindleNose: "A2-8", spindleBore: 91,
            spindleMotor: {
                power: 22, maxRPM: 3500, maxTorque: 700,
                torqueCurve: [
                    { rpm: 0, torque: 700 }, { rpm: 400, torque: 700 },
                    { rpm: 1200, torque: 520 }, { rpm: 2500, torque: 280 },
                    { rpm: 3500, torque: 190 }
                ]
            },
            turret: { stations: 12, type: "wedge", indexTime: 0.2, maxToolSize: 32, rigidityFactor: 0.95 },
            tailstock: { available: true, quillDiameter: 85, thrustForce: 20000 },
            chuckOptions: ["10-inch_3-jaw", "12-inch_3-jaw"],
            coolant: { pressure: 7, flow: 100, tscAvailable: true, tscPressure: 70 },
            rigidityClass: "heavy", stabilityFactor: 0.95
        },
        "INTEGREX_i-200": {
            manufacturer: "Mazak", model: "INTEGREX i-200", type: "5-axis_mill_turn",
            maxSwing: 658, maxTurningDiameter: 500, maxTurningLength: 1016,
            barCapacity: 65, spindleNose: "A2-6", spindleBore: 71,
            spindleMotor: {
                power: 22, maxRPM: 5000, maxTorque: 550,
                torqueCurve: [
                    { rpm: 0, torque: 550 }, { rpm: 400, torque: 550 },
                    { rpm: 1500, torque: 400 }, { rpm: 3000, torque: 220 },
                    { rpm: 5000, torque: 130 }
                ]
            },
            millingSpindle: { power: 22, maxRPM: 12000, torque: 119 },
            bAxis: { travel: 225, clampTorque: 637 },
            atc: { capacity: 36, type: "Capto_C6", indexTime: 1.5 },
            tailstock: { available: true, quillDiameter: 80, thrustForce: 20000 },
            chuckOptions: ["8-inch_3-jaw", "10-inch_3-jaw"],
            coolant: { pressure: 15, flow: 100, tscAvailable: true, tscPressure: 70 },
            rigidityClass: "heavy", stabilityFactor: 0.92
        }
    },
    // OKUMA LATHES
    okuma: {
        "LB3000_EX_II": {
            manufacturer: "Okuma", model: "LB3000 EX II", type: "2-axis_slant_bed",
            maxSwing: 600, maxTurningDiameter: 430, maxTurningLength: 1000,
            barCapacity: 80, spindleNose: "A2-8", spindleBore: 91,
            spindleMotor: {
                power: 22, maxRPM: 4200, maxTorque: 820,
                torqueCurve: [
                    { rpm: 0, torque: 820 }, { rpm: 400, torque: 820 },
                    { rpm: 1200, torque: 600 }, { rpm: 2500, torque: 350 },
                    { rpm: 4200, torque: 200 }
                ]
            },
            turret: { stations: 12, type: "BMT65", indexTime: 0.15, maxToolSize: 32, rigidityFactor: 0.96 },
            tailstock: { available: true, quillDiameter: 85, thrustForce: 25000 },
            chuckOptions: ["10-inch_3-jaw", "12-inch_3-jaw", "15-inch_3-jaw"],
            coolant: { pressure: 7, flow: 120, tscAvailable: true, tscPressure: 70 },
            rigidityClass: "heavy", stabilityFactor: 0.96
        },
        "GENOS_L250": {
            manufacturer: "Okuma", model: "GENOS L250", type: "2-axis_slant_bed",
            maxSwing: 430, maxTurningDiameter: 300, maxTurningLength: 550,
            barCapacity: 51, spindleNose: "A2-5", spindleBore: 58,
            spindleMotor: {
                power: 15, maxRPM: 5000, maxTorque: 300,
                torqueCurve: [
                    { rpm: 0, torque: 300 }, { rpm: 500, torque: 300 },
                    { rpm: 1800, torque: 220 }, { rpm: 3500, torque: 120 },
                    { rpm: 5000, torque: 80 }
                ]
            },
            turret: { stations: 12, type: "BMT55", indexTime: 0.15, maxToolSize: 25, rigidityFactor: 0.92 },
            tailstock: { available: true, quillDiameter: 60, thrustForce: 12000 },
            chuckOptions: ["6-inch_3-jaw", "8-inch_3-jaw"],
            coolant: { pressure: 7, flow: 60, tscAvailable: true, tscPressure: 70 },
            rigidityClass: "medium", stabilityFactor: 0.90
        }
    },
    // DMG MORI LATHES
    dmgmori: {
        "CLX_450": {
            manufacturer: "DMG MORI", model: "CLX 450", type: "2-axis_slant_bed",
            maxSwing: 400, maxTurningDiameter: 320, maxTurningLength: 450,
            barCapacity: 65, spindleNose: "A2-6", spindleBore: 68,
            spindleMotor: {
                power: 15, maxRPM: 5000, maxTorque: 319,
                torqueCurve: [
                    { rpm: 0, torque: 319 }, { rpm: 500, torque: 319 },
                    { rpm: 2000, torque: 200 }, { rpm: 4000, torque: 100 },
                    { rpm: 5000, torque: 80 }
                ]
            },
            turret: { stations: 12, type: "VDI40", indexTime: 0.15, maxToolSize: 40, rigidityFactor: 0.93 },
            tailstock: { available: true, quillDiameter: 70, thrustForce: 12000 },
            chuckOptions: ["8-inch_3-jaw", "10-inch_3-jaw"],
            coolant: { pressure: 10, flow: 80, tscAvailable: true, tscPressure: 80 },
            rigidityClass: "medium", stabilityFactor: 0.92
        },
        "NLX_2500": {
            manufacturer: "DMG MORI", model: "NLX 2500", type: "2-axis_slant_bed",
            maxSwing: 700, maxTurningDiameter: 460, maxTurningLength: 705,
            barCapacity: 80, spindleNose: "A2-8", spindleBore: 92,
            spindleMotor: {
                power: 22, maxRPM: 4000, maxTorque: 750,
                torqueCurve: [
                    { rpm: 0, torque: 750 }, { rpm: 350, torque: 750 },
                    { rpm: 1200, torque: 550 }, { rpm: 2500, torque: 300 },
                    { rpm: 4000, torque: 180 }
                ]
            },
            turret: { stations: 12, type: "BMT65", indexTime: 0.13, maxToolSize: 45, rigidityFactor: 0.95 },
            tailstock: { available: true, quillDiameter: 90, thrustForce: 22000 },
            chuckOptions: ["10-inch_3-jaw", "12-inch_3-jaw", "15-inch_3-jaw"],
            coolant: { pressure: 10, flow: 120, tscAvailable: true, tscPressure: 100 },
            rigidityClass: "heavy", stabilityFactor: 0.95
        }
    },
    // DOOSAN LATHES
    doosan: {
        "LYNX_2100": {
            manufacturer: "Doosan", model: "LYNX 2100", type: "2-axis_slant_bed",
            maxSwing: 530, maxTurningDiameter: 300, maxTurningLength: 510,
            barCapacity: 51, spindleNose: "A2-5", spindleBore: 58,
            spindleMotor: {
                power: 15, maxRPM: 4500, maxTorque: 280,
                torqueCurve: [
                    { rpm: 0, torque: 280 }, { rpm: 500, torque: 280 },
                    { rpm: 2000, torque: 180 }, { rpm: 3500, torque: 100 },
                    { rpm: 4500, torque: 75 }
                ]
            },
            turret: { stations: 12, type: "BMT55", indexTime: 0.15, maxToolSize: 25, rigidityFactor: 0.90 },
            tailstock: { available: true, quillDiameter: 60, thrustForce: 8000 },
            chuckOptions: ["6-inch_3-jaw", "8-inch_3-jaw"],
            coolant: { pressure: 6, flow: 50, tscAvailable: true, tscPressure: 50 },
            rigidityClass: "light", stabilityFactor: 0.88
        },
        "PUMA_2600": {
            manufacturer: "Doosan", model: "PUMA 2600", type: "2-axis_slant_bed",
            maxSwing: 710, maxTurningDiameter: 406, maxTurningLength: 1050,
            barCapacity: 76, spindleNose: "A2-8", spindleBore: 91,
            spindleMotor: {
                power: 22, maxRPM: 3500, maxTorque: 650,
                torqueCurve: [
                    { rpm: 0, torque: 650 }, { rpm: 350, torque: 650 },
                    { rpm: 1200, torque: 480 }, { rpm: 2500, torque: 280 },
                    { rpm: 3500, torque: 200 }
                ]
            },
            turret: { stations: 12, type: "BMT65", indexTime: 0.2, maxToolSize: 32, rigidityFactor: 0.93 },
            tailstock: { available: true, quillDiameter: 85, thrustForce: 18000 },
            chuckOptions: ["10-inch_3-jaw", "12-inch_3-jaw"],
            coolant: { pressure: 7, flow: 100, tscAvailable: true, tscPressure: 70 },
            rigidityClass: "heavy", stabilityFactor: 0.93
        }
    },
    // NAKAMURA-TOME LATHES
    nakamura: {
        "SC-300": {
            manufacturer: "Nakamura-Tome", model: "SC-300", type: "2-axis_slant_bed",
            maxSwing: 520, maxTurningDiameter: 330, maxTurningLength: 520,
            barCapacity: 65, spindleNose: "A2-6", spindleBore: 68,
            spindleMotor: {
                power: 18.5, maxRPM: 4000, maxTorque: 450,
                torqueCurve: [
                    { rpm: 0, torque: 450 }, { rpm: 500, torque: 450 },
                    { rpm: 1500, torque: 330 }, { rpm: 3000, torque: 170 },
                    { rpm: 4000, torque: 125 }
                ]
            },
            turret: { stations: 12, type: "BMT55", indexTime: 0.18, maxToolSize: 25, rigidityFactor: 0.94 },
            tailstock: { available: true, quillDiameter: 70, thrustForce: 15000 },
            chuckOptions: ["8-inch_3-jaw", "10-inch_3-jaw"],
            coolant: { pressure: 7, flow: 70, tscAvailable: true, tscPressure: 70 },
            rigidityClass: "medium", stabilityFactor: 0.94
        }
    }
};
// SECTION 2: CHUCK DATABASE

const PRISM_CHUCK_DATABASE_V2 = {
