const PRISM_WORKHOLDING_GEOMETRY = {
    version: '1.0.0',
    generatedDate: '2026-01-14',

    // BISON POWER CHUCKS - FULL GEOMETRIC DATA

    bison: {

        // 2405-K: 3-JAW POWER CHUCK (Kitagawa B-200 Compatible)
        '2405-K': {
            description: '3-Jaw Power Chuck with Through-Hole',
            jaws: 3,
            compatibility: 'Kitagawa B-200',
            serration: '1.5x60°',  // 3x60° for sizes 400+

            // Dimensional key:
            // A = Outer diameter
            // B = Body height (front face to back)
            // C = Body height (to mounting face)
            // D = Mounting diameter (H6 fit to spindle)
            // E = Mounting step height
            // F = Bolt circle diameter
            // G = Mounting bolts (qty x thread)
            // H = Jaw slot depth
            // J = Master jaw height
            // K = Distance from face to jaw serration
            // L = Drawbar thread (max)
            // M = Max drawbar stroke
            // O = Pilot diameter
            // d = Through-hole diameter

            sizes: {
                '135': {
                    partNumber: '7-781-0500',
                    type: '2405-135-34K',

                    // OUTER ENVELOPE (for collision detection)
                    envelope: {
                        outerDiameter: 135,      // A - max OD
                        bodyHeight: 60,          // B - total height
                        maxJawExtension: 20,     // beyond OD when open
                        boundingCylinder: { d: 175, h: 75 }  // safe zone
                    },
                    // MOUNTING INTERFACE (for setup verification)
                    mounting: {
                        spindleDiameter: 110,    // D H6 - fits spindle
                        stepHeight: 4,           // E
                        boltCircle: 82.6,        // F
                        bolts: { qty: 3, thread: 'M10', depth: 14.5 },  // G, H
                        spindleNose: ['A2-4', 'A2-5'],  // compatible noses
                        adapterPlate: '8213-Type-I'
                    },
                    // THROUGH-HOLE (for bar stock clearance)
                    throughHole: {
                        diameter: 34,            // d
                        drawbarThread: 'M40x1.5', // L
                        maxDrawbarStroke: 10,    // M
                        pilotDiameter: 20        // O
                    },
                    // JAW KINEMATICS (for clamping simulation)
                    jawKinematics: {
                        jawStroke: 2.7,          // mm per jaw (total travel)
                        jawSlotDepth: 14.5,      // H
                        masterJawHeight: 12,     // J
                        serrationDistance: 45,   // K - from face

                        // Clamping ranges (OD and ID)
                        clampingRangeOD: { min: 10, max: 95 },   // with std jaws
                        clampingRangeID: { min: 45, max: 90 },   // with ID jaws

                        // Jaw positions for simulation
                        jawPositions: {
                            fullyOpen: { radius: 67.5, angle: [0, 120, 240] },
                            fullyClosed: { radius: 5, angle: [0, 120, 240] },
                            nominal: { radius: 30, angle: [0, 120, 240] }
                        }
                    },
                    // PERFORMANCE
                    performance: {
                        maxPullingForce: 17.5,   // kN
                        maxClampingForce: 36,    // kN
                        maxSpeed: 7000,          // rpm
                        weight: 6.0              // kg
                    },
                    // COLLISION ZONES (critical clearances)
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -12, rMax: 67.5 },  // when fully open
                        backFace: { z: 60 },
                        mountingFace: { z: 59.5 }
                    }
                },
                '160': {
                    partNumber: '7-781-0600',
                    type: '2405-160-45K',

                    envelope: {
                        outerDiameter: 169,
                        bodyHeight: 81,
                        maxJawExtension: 25,
                        boundingCylinder: { d: 220, h: 100 }
                    },
                    mounting: {
                        spindleDiameter: 140,
                        stepHeight: 6,
                        boltCircle: 104.8,
                        bolts: { qty: 6, thread: 'M10', depth: 13.5 },
                        spindleNose: ['A2-5', 'A2-6'],
                        adapterPlate: '8213-Type-I'
                    },
                    throughHole: {
                        diameter: 45,
                        drawbarThread: 'M55x2.0',
                        maxDrawbarStroke: 16,
                        pilotDiameter: 19
                    },
                    jawKinematics: {
                        jawStroke: 3.5,
                        jawSlotDepth: 13.5,
                        masterJawHeight: 20,
                        serrationDistance: 60,
                        clampingRangeOD: { min: 12, max: 130 },
                        clampingRangeID: { min: 60, max: 125 },
                        jawPositions: {
                            fullyOpen: { radius: 84.5, angle: [0, 120, 240] },
                            fullyClosed: { radius: 6, angle: [0, 120, 240] },
                            nominal: { radius: 40, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 22,
                        maxClampingForce: 57,
                        maxSpeed: 6000,
                        weight: 12.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -20, rMax: 84.5 },
                        backFace: { z: 81 },
                        mountingFace: { z: 79 }
                    }
                },
                '200': {
                    partNumber: '7-781-0800',
                    type: '2405-200-52K',

                    envelope: {
                        outerDiameter: 210,
                        bodyHeight: 95,
                        maxJawExtension: 30,
                        boundingCylinder: { d: 270, h: 115 }
                    },
                    mounting: {
                        spindleDiameter: 170,
                        stepHeight: 6,
                        boltCircle: 133.4,
                        bolts: { qty: 6, thread: 'M12', depth: 16.5 },
                        spindleNose: ['A2-6', 'A2-8'],
                        adapterPlate: '8213-Type-II'
                    },
                    throughHole: {
                        diameter: 52,
                        drawbarThread: 'M60x2.0',
                        maxDrawbarStroke: 22.5,
                        pilotDiameter: 20.5
                    },
                    jawKinematics: {
                        jawStroke: 5.0,
                        jawSlotDepth: 16.5,
                        masterJawHeight: 20,
                        serrationDistance: 66,
                        clampingRangeOD: { min: 15, max: 165 },
                        clampingRangeID: { min: 75, max: 160 },
                        jawPositions: {
                            fullyOpen: { radius: 105, angle: [0, 120, 240] },
                            fullyClosed: { radius: 7.5, angle: [0, 120, 240] },
                            nominal: { radius: 50, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 34,
                        maxClampingForce: 86,
                        maxSpeed: 5000,
                        weight: 23.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -20, rMax: 105 },
                        backFace: { z: 95 },
                        mountingFace: { z: 93 }
                    }
                },
                '250': {
                    partNumber: '7-781-1000',
                    type: '2405-250-75K',

                    envelope: {
                        outerDiameter: 254,
                        bodyHeight: 106,
                        maxJawExtension: 35,
                        boundingCylinder: { d: 325, h: 130 }
                    },
                    mounting: {
                        spindleDiameter: 220,
                        stepHeight: 6,
                        boltCircle: 171.4,
                        bolts: { qty: 6, thread: 'M16', depth: 18 },
                        spindleNose: ['A2-8', 'A2-11'],
                        adapterPlate: '8213-Type-II'
                    },
                    throughHole: {
                        diameter: 75,
                        drawbarThread: 'M85x2.0',
                        maxDrawbarStroke: 27,
                        pilotDiameter: 25
                    },
                    jawKinematics: {
                        jawStroke: 6.0,
                        jawSlotDepth: 18,
                        masterJawHeight: 25,
                        serrationDistance: 94,
                        clampingRangeOD: { min: 20, max: 200 },
                        clampingRangeID: { min: 100, max: 195 },
                        jawPositions: {
                            fullyOpen: { radius: 127, angle: [0, 120, 240] },
                            fullyClosed: { radius: 10, angle: [0, 120, 240] },
                            nominal: { radius: 60, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 43,
                        maxClampingForce: 111,
                        maxSpeed: 4200,
                        weight: 38.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -25, rMax: 127 },
                        backFace: { z: 106 },
                        mountingFace: { z: 104 }
                    }
                },
                '315': {
                    partNumber: '7-781-1200',
                    type: '2405-315-91K',

                    envelope: {
                        outerDiameter: 315,
                        bodyHeight: 108,
                        maxJawExtension: 40,
                        boundingCylinder: { d: 395, h: 135 }
                    },
                    mounting: {
                        spindleDiameter: 220,
                        stepHeight: 6,
                        boltCircle: 171.4,
                        bolts: { qty: 6, thread: 'M16', depth: 27 },
                        spindleNose: ['A2-8', 'A2-11'],
                        adapterPlate: '8213-Type-III'
                    },
                    throughHole: {
                        diameter: 91,
                        drawbarThread: 'M100x2.0',
                        maxDrawbarStroke: 27,
                        pilotDiameter: 28
                    },
                    jawKinematics: {
                        jawStroke: 6.0,
                        jawSlotDepth: 27,
                        masterJawHeight: 25,
                        serrationDistance: 108,
                        clampingRangeOD: { min: 25, max: 250 },
                        clampingRangeID: { min: 120, max: 245 },
                        jawPositions: {
                            fullyOpen: { radius: 157.5, angle: [0, 120, 240] },
                            fullyClosed: { radius: 12.5, angle: [0, 120, 240] },
                            nominal: { radius: 75, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 56,
                        maxClampingForce: 144,
                        maxSpeed: 3300,
                        weight: 60.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -25, rMax: 157.5 },
                        backFace: { z: 108 },
                        mountingFace: { z: 106.5 }
                    }
                },
                '400': {
                    partNumber: '7-781-1600',
                    type: '2405-400-120K',

                    envelope: {
                        outerDiameter: 400,
                        bodyHeight: 130,
                        maxJawExtension: 50,
                        boundingCylinder: { d: 500, h: 165 }
                    },
                    mounting: {
                        spindleDiameter: 300,
                        stepHeight: 6,
                        boltCircle: 235.0,
                        bolts: { qty: 6, thread: 'M20', depth: 28 },
                        spindleNose: ['A2-11', 'A2-15'],
                        adapterPlate: '8213-Type-III'
                    },
                    throughHole: {
                        diameter: 120,
                        drawbarThread: 'M130x2.5',
                        maxDrawbarStroke: 34,
                        pilotDiameter: 39
                    },
                    jawKinematics: {
                        jawStroke: 7.85,
                        jawSlotDepth: 28,
                        masterJawHeight: 60,
                        serrationDistance: 140,
                        serration: '3x60°',  // Larger sizes use 3x60°
                        clampingRangeOD: { min: 35, max: 320 },
                        clampingRangeID: { min: 160, max: 315 },
                        jawPositions: {
                            fullyOpen: { radius: 200, angle: [0, 120, 240] },
                            fullyClosed: { radius: 17.5, angle: [0, 120, 240] },
                            nominal: { radius: 100, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 71,
                        maxClampingForce: 180,
                        maxSpeed: 2500,
                        weight: 117.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -60, rMax: 200 },
                        backFace: { z: 130 },
                        mountingFace: { z: 126.5 }
                    }
                },
                '500': {
                    partNumber: '7-781-2000',
                    type: '2405-500-160K',

                    envelope: {
                        outerDiameter: 500,
                        bodyHeight: 127,
                        maxJawExtension: 60,
                        boundingCylinder: { d: 620, h: 165 }
                    },
                    mounting: {
                        spindleDiameter: 380,
                        stepHeight: 6,
                        boltCircle: 330.2,
                        bolts: { qty: 6, thread: 'M24', depth: 35 },
                        spindleNose: ['A2-11', 'A2-15'],
                        adapterPlate: '8213-Type-IV'
                    },
                    throughHole: {
                        diameter: 160,
                        drawbarThread: 'M170x3.0',
                        maxDrawbarStroke: 34.5,
                        pilotDiameter: 43
                    },
                    jawKinematics: {
                        jawStroke: 8.0,
                        jawSlotDepth: 35,
                        masterJawHeight: 60,
                        serrationDistance: 182,
                        serration: '3x60°',
                        clampingRangeOD: { min: 50, max: 400 },
                        clampingRangeID: { min: 200, max: 395 },
                        jawPositions: {
                            fullyOpen: { radius: 250, angle: [0, 120, 240] },
                            fullyClosed: { radius: 25, angle: [0, 120, 240] },
                            nominal: { radius: 125, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 90,
                        maxClampingForce: 200,
                        maxSpeed: 1600,
                        weight: 166.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -60, rMax: 250 },
                        backFace: { z: 127 },
                        mountingFace: { z: 127 }
                    }
                },
                '630': {
                    partNumber: '7-781-2500',
                    type: '2405-630-200K',

                    envelope: {
                        outerDiameter: 630,
                        bodyHeight: 160,
                        maxJawExtension: 70,
                        boundingCylinder: { d: 770, h: 200 }
                    },
                    mounting: {
                        spindleDiameter: 520,
                        stepHeight: 8,
                        boltCircle: 463.6,
                        bolts: { qty: 6, thread: 'M24', depth: 34 },
                        spindleNose: ['A2-15', 'A2-20'],
                        adapterPlate: '8213-Type-IV'
                    },
                    throughHole: {
                        diameter: 200,
                        drawbarThread: 'M200x3.0',
                        maxDrawbarStroke: 44,
                        pilotDiameter: 46
                    },
                    jawKinematics: {
                        jawStroke: 10.0,
                        jawSlotDepth: 34,
                        masterJawHeight: 60,
                        serrationDistance: 230,
                        serration: '3x60°',
                        clampingRangeOD: { min: 70, max: 500 },
                        clampingRangeID: { min: 250, max: 495 },
                        jawPositions: {
                            fullyOpen: { radius: 315, angle: [0, 120, 240] },
                            fullyClosed: { radius: 35, angle: [0, 120, 240] },
                            nominal: { radius: 160, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 100,
                        maxClampingForce: 200,
                        maxSpeed: 1200,
                        weight: 320.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -60, rMax: 315 },
                        backFace: { z: 160 },
                        mountingFace: { z: 158 }
                    }
                },
                '800': {
                    partNumber: '7-781-3200',
                    type: '2405-800-255K',

                    envelope: {
                        outerDiameter: 800,
                        bodyHeight: 160,
                        maxJawExtension: 80,
                        boundingCylinder: { d: 960, h: 210 }
                    },
                    mounting: {
                        spindleDiameter: 520,
                        stepHeight: 8,
                        boltCircle: 463.6,
                        bolts: { qty: 6, thread: 'M24', depth: 34 },
                        spindleNose: ['A2-15', 'A2-20'],
                        adapterPlate: '8213-Type-IV'
                    },
                    throughHole: {
                        diameter: 255,
                        drawbarThread: 'M250x3.0',
                        maxDrawbarStroke: 44,
                        pilotDiameter: 46
                    },
                    jawKinematics: {
                        jawStroke: 10.0,
                        jawSlotDepth: 34,
                        masterJawHeight: 60,
                        serrationDistance: 284,
                        serration: '3x60°',
                        clampingRangeOD: { min: 100, max: 640 },
                        clampingRangeID: { min: 320, max: 635 },
                        jawPositions: {
                            fullyOpen: { radius: 400, angle: [0, 120, 240] },
                            fullyClosed: { radius: 50, angle: [0, 120, 240] },
                            nominal: { radius: 200, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 100,
                        maxClampingForce: 200,
                        maxSpeed: 800,
                        weight: 535.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -60, rMax: 400 },
                        backFace: { z: 160 },
                        mountingFace: { z: 158 }
                    }
                }
            }
        },
        // 2500: PNEUMATIC POWER CHUCK (OD Clamping)
        '2500': {
            description: 'Pneumatic Chuck with Integrated Cylinder - OD Clamping',
            jaws: 3,
            actuation: 'pneumatic',

            sizes: {
                '400': {
                    partNumber: '7-785-1600',
                    type: '2500-400-140',

                    envelope: {
                        D1: 467,  // Overall diameter
                        D2: 400,  // Chuck body OD
                        D3: 374,  // Jaw slot OD
                        D4: 310,  // Inner body
                        D6: 450,  // Cylinder OD
                        bodyHeight: 246.2,  // L1
                        boundingCylinder: { d: 520, h: 280 }
                    },
                    throughHole: {
                        diameter: 140,  // D5
                        D8: 205  // Inner bore
                    },
                    jawKinematics: {
                        totalStroke: 19,
                        clampingStroke: 7,
                        rapidStroke: 12,
                        clampingRangeOD: { min: 50, max: 340 }
                    },
                    pneumatics: {
                        pressureRange: [0.2, 0.8],  // MPa
                        clampingForceAt06MPa: 130  // kN
                    },
                    performance: {
                        maxSpeed: 1300,
                        weight: 220.0
                    }
                },
                '500': {
                    partNumber: '7-785-2000',
                    type: '2500-500-230',

                    envelope: {
                        D1: 570,
                        D2: 500,
                        D3: 474,
                        D4: 415,
                        D6: 570,
                        bodyHeight: 282.2,
                        boundingCylinder: { d: 620, h: 320 }
                    },
                    throughHole: {
                        diameter: 230,
                        D8: 308
                    },
                    jawKinematics: {
                        totalStroke: 25.4,
                        clampingStroke: 8.6,
                        rapidStroke: 16.8,
                        clampingRangeOD: { min: 70, max: 430 }
                    },
                    pneumatics: {
                        pressureRange: [0.2, 0.8],
                        clampingForceAt06MPa: 180
                    },
                    performance: {
                        maxSpeed: 1000,
                        weight: 340.0
                    }
                },
                '630': {
                    partNumber: '7-785-2500',
                    type: '2500-630-325',

                    envelope: {
                        D1: 685,
                        D2: 630,
                        D3: 580,
                        D4: 510,
                        D6: 685,
                        bodyHeight: 307.5,
                        boundingCylinder: { d: 740, h: 350 }
                    },
                    throughHole: {
                        diameter: 325,
                        D8: 400
                    },
                    jawKinematics: {
                        totalStroke: 25.7,
                        clampingStroke: 8.6,
                        rapidStroke: 16.8,
                        clampingRangeOD: { min: 100, max: 540 }
                    },
                    pneumatics: {
                        pressureRange: [0.3, 1.0],
                        clampingForceAt06MPa: 200
                    },
                    performance: {
                        maxSpeed: 900,
                        weight: 630.0
                    }
                },
                '800': {
                    partNumber: '7-785-3200',
                    type: '2500-800-375',

                    envelope: {
                        D1: 850,
                        D2: 800,
                        D3: 745,
                        D4: 700,
                        D6: 850,
                        bodyHeight: 354,
                        boundingCylinder: { d: 920, h: 400 }
                    },
                    throughHole: {
                        diameter: 375,
                        D8: 450
                    },
                    jawKinematics: {
                        totalStroke: 25.7,
                        clampingStroke: 8.6,
                        rapidStroke: 16.8,
                        clampingRangeOD: { min: 140, max: 680 }
                    },
                    pneumatics: {
                        pressureRange: [0.3, 1.0],
                        clampingForceAt06MPa: 200
                    },
                    performance: {
                        maxSpeed: 750,
                        weight: 970.0
                    }
                },
                '1000': {
                    partNumber: '7-785-4000',
                    type: '2500-1000-560',

                    envelope: {
                        D1: 925,
                        D2: 1000,
                        D3: 815,
                        D4: 700,
                        D6: 1000,
                        bodyHeight: 332,
                        boundingCylinder: { d: 1100, h: 380 }
                    },
                    throughHole: {
                        diameter: 560,
                        D8: 635
                    },
                    jawKinematics: {
                        totalStroke: 25.7,
                        clampingStroke: 8.6,
                        rapidStroke: 16.8,
                        clampingRangeOD: { min: 200, max: 850 }
                    },
                    pneumatics: {
                        pressureRange: [0.3, 1.0],
                        clampingForceAt06MPa: 170
                    },
                    performance: {
                        maxSpeed: 450,
                        weight: 960.0
                    }
                }
            }
        },
        // 1305-SDC: HYDRAULIC CYLINDER
        '1305-SDC': {
            description: 'Hydraulic Cylinder with Stroke Control',
            type: 'actuator',

            sizes: {
                '102': {
                    partNumber: '1305-102-46-SDC',

                    envelope: {
                        outerDiameter: 130,
                        throughHole: 46,
                        bodyLength: 180,  // approximate
                        boundingCylinder: { d: 150, h: 200 }
                    },
                    hydraulics: {
                        pistonAreaPush: 110,   // cm²
                        pistonAreaPull: 103.5, // cm²
                        maxPressure: 4.5,      // MPa
                        maxPushForce: 49.5,    // kN
                        maxPullForce: 46,      // kN
                        stroke: 25             // mm
                    },
                    performance: {
                        maxSpeed: 7100,
                        weight: 15.0
                    }
                },
                '130': {
                    partNumber: '1305-130-52-SDC',

                    envelope: {
                        outerDiameter: 150,
                        throughHole: 52,
                        bodyLength: 190,
                        boundingCylinder: { d: 170, h: 210 }
                    },
                    hydraulics: {
                        pistonAreaPush: 145.5,
                        pistonAreaPull: 138.2,
                        maxPressure: 4.5,
                        maxPushForce: 64,
                        maxPullForce: 61,
                        stroke: 25
                    },
                    performance: {
                        maxSpeed: 6300,
                        weight: 17.0
                    }
                },
                '150': {
                    partNumber: '1305-150-67-SDC',

                    envelope: {
                        outerDiameter: 165,
                        throughHole: 67,
                        bodyLength: 210,
                        boundingCylinder: { d: 190, h: 240 }
                    },
                    hydraulics: {
                        pistonAreaPush: 169,
                        pistonAreaPull: 157,
                        maxPressure: 4.5,
                        maxPushForce: 75,
                        maxPullForce: 70,
                        stroke: 30
                    },
                    performance: {
                        maxSpeed: 6000,
                        weight: 23.0
                    }
                },
                '225': {
                    partNumber: '1305-225-95-SDC',

                    envelope: {
                        outerDiameter: 205,
                        throughHole: 95,
                        bodyLength: 250,
                        boundingCylinder: { d: 240, h: 280 }
                    },
                    hydraulics: {
                        pistonAreaPush: 243,
                        pistonAreaPull: 226,
                        maxPressure: 4.5,
                        maxPushForce: 108,
                        maxPullForce: 100,
                        stroke: 35
                    },
                    performance: {
                        maxSpeed: 4500,
                        weight: 35.0
                    }
                }
            }
        }
    },
    // 5TH AXIS - QUICK-CHANGE SYSTEM GEOMETRY

    fifthAxis: {

        // RockLock Receivers (Machine-mounted bases)
        rockLockReceivers: {
            'RL52-BASE': {
                description: 'RockLock 52mm Receiver Base',

                geometry: {
                    pullStudSpacing: 52,
                    pullStudPattern: 'square',
                    mountingHoles: { qty: 4, pattern: 'square', spacing: 52 },
                    height: 25,
                    topFaceFlat: true
                },
                kinematics: {
                    clampTravel: 6,  // mm
                    clampForce: 22,  // kN
                    repeatability: 0.008  // mm
                }
            },
            'RL96-BASE': {
                description: 'RockLock 96mm Receiver Base',

                geometry: {
                    pullStudSpacing: 96,
                    pullStudPattern: 'square',
                    mountingHoles: { qty: 4, pattern: 'square', spacing: 96 },
                    height: 35,
                    topFaceFlat: true
                },
                kinematics: {
                    clampTravel: 8,  // mm
                    clampForce: 35,  // kN
                    repeatability: 0.008  // mm
                }
            }
        },
        // Self-Centering Vises
        vises: {
            'V75100X': {
                description: 'Self-Centering Vise 60mm',
                system: 'RockLock 52',

                geometry: {
                    jawWidth: 60,
                    baseLength: 150,
                    baseWidth: 100,
                    height: 65,
                    boundingBox: { x: 150, y: 100, z: 65 }
                },
                kinematics: {
                    maxOpening: 100,
                    jawTravel: 50,  // per side (self-centering)
                    clampingForce: 15  // kN
                },
                collisionZones: {
                    jawsOpen: { x: 150, y: 160, z: 80 },
                    jawsClosed: { x: 150, y: 100, z: 65 }
                }
            },
            'V75150X': {
                description: 'Self-Centering Vise 80mm',
                system: 'RockLock 52',

                geometry: {
                    jawWidth: 80,
                    baseLength: 180,
                    baseWidth: 120,
                    height: 70,
                    boundingBox: { x: 180, y: 120, z: 70 }
                },
                kinematics: {
                    maxOpening: 150,
                    jawTravel: 75,
                    clampingForce: 19
                },
                collisionZones: {
                    jawsOpen: { x: 180, y: 200, z: 90 },
                    jawsClosed: { x: 180, y: 120, z: 70 }
                }
            },
            'V96200X': {
                description: 'Self-Centering Vise 125mm',
                system: 'RockLock 96',

                geometry: {
                    jawWidth: 125,
                    baseLength: 250,
                    baseWidth: 160,
                    height: 85,
                    boundingBox: { x: 250, y: 160, z: 85 }
                },
                kinematics: {
                    maxOpening: 200,
                    jawTravel: 100,
                    clampingForce: 31
                },
                collisionZones: {
                    jawsOpen: { x: 250, y: 280, z: 110 },
                    jawsClosed: { x: 250, y: 160, z: 85 }
                }
            }
        },
        // Tombstones
        tombstones: {
            'T4S-52': {
                description: '4-Sided Tombstone',
                system: 'RockLock 52',

                geometry: {
                    sides: 4,
                    width: 200,
                    depth: 200,
                    height: 300,
                    positionsPerSide: 4,
                    positionSpacing: { x: 100, z: 125 },
                    boundingBox: { x: 200, y: 200, z: 350 }
                },
                mounting: {
                    basePlateSize: { x: 250, y: 250 },
                    basePlateThickness: 25
                }
            },
            'T4S-96': {
                description: '4-Sided Tombstone Heavy',
                system: 'RockLock 96',

                geometry: {
                    sides: 4,
                    width: 300,
                    depth: 300,
                    height: 400,
                    positionsPerSide: 2,
                    positionSpacing: { x: 150, z: 175 },
                    boundingBox: { x: 300, y: 300, z: 450 }
                },
                mounting: {
                    basePlateSize: { x: 350, y: 350 },
                    basePlateThickness: 35
                }
            }
        },
        // Risers
        risers: {
            'R60-52': {
                description: 'Riser 60mm for 52mm System',
                system: 'RockLock 52',

                geometry: {
                    height: 60,
                    footprint: { x: 100, y: 100 },
                    topInterface: 'RockLock 52',
                    bottomInterface: 'RockLock 52'
                }
            },
            'R100-52': {
                description: 'Riser 100mm for 52mm System',
                system: 'RockLock 52',

                geometry: {
                    height: 100,
                    footprint: { x: 100, y: 100 },
                    topInterface: 'RockLock 52',
                    bottomInterface: 'RockLock 52'
                }
            }
        }
    },
    // MATE/MITEE-BITE - DYNOGRIP/DYNOLOCK GEOMETRY

    mate: {

        dynoGripVises: {
            'DG52-60': {
                description: 'DynoGrip 52 Series - 60mm Jaw',
                system: '52mm four-post',

                geometry: {
                    jawWidth: 60,
                    baseLength: 130,
                    baseWidth: 90,
                    height: 55,
                    boundingBox: { x: 130, y: 90, z: 55 }
                },
                kinematics: {
                    maxOpening: 95,
                    jawTravel: 47.5,  // per side
                    torque: 60,  // Nm
                    clampingForce: 19  // kN
                },
                mounting: {
                    pullStudSpacing: 52,
                    pullStudThread: 'M16'
                },
                performance: {
                    accuracy: 0.015,  // mm
                    repeatability: 0.010,  // mm
                    weight: 2.1  // kg
                }
            },
            'DG52-80': {
                description: 'DynoGrip 52 Series - 80mm Jaw',
                system: '52mm four-post',

                geometry: {
                    jawWidth: 80,
                    baseLength: 145,
                    baseWidth: 100,
                    height: 58,
                    boundingBox: { x: 145, y: 100, z: 58 }
                },
                kinematics: {
                    maxOpening: 95,
                    jawTravel: 47.5,
                    torque: 60,
                    clampingForce: 19
                },
                mounting: {
                    pullStudSpacing: 52,
                    pullStudThread: 'M16'
                },
                performance: {
                    accuracy: 0.015,
                    repeatability: 0.010,
                    weight: 2.4
                }
            },
            'DG96-125': {
                description: 'DynoGrip 96 Series - 125mm Jaw',
                system: '96mm four-post',

                geometry: {
                    jawWidth: 125,
                    baseLength: 200,
                    baseWidth: 140,
                    height: 75,
                    boundingBox: { x: 200, y: 140, z: 75 }
                },
                kinematics: {
                    maxOpening: 155,
                    jawTravel: 77.5,
                    torque: 130,
                    clampingForce: 31
                },
                mounting: {
                    pullStudSpacing: 96,
                    pullStudThread: 'M20'
                },
                performance: {
                    accuracy: 0.015,
                    repeatability: 0.010,
                    weight: 6.2
                }
            }
        },
        dynoLockBases: {
            'DL52-R100': {
                description: 'DynoLock 52 Round Base 100mm',
                system: '52mm four-post',

                geometry: {
                    shape: 'round',
                    diameter: 100,
                    height: 25,
                    boundingCylinder: { d: 100, h: 25 }
                },
                mounting: {
                    pullStudSpacing: 52,
                    pullStudThread: 'M16',
                    holdingForce: 22  // kN
                },
                performance: {
                    accuracy: 0.013,
                    repeatability: 0.005
                }
            },
            'DL96-R150': {
                description: 'DynoLock 96 Round Base 150mm',
                system: '96mm four-post',

                geometry: {
                    shape: 'round',
                    diameter: 150,
                    height: 35,
                    boundingCylinder: { d: 150, h: 35 }
                },
                mounting: {
                    pullStudSpacing: 96,
                    pullStudThread: 'M20',
                    holdingForce: 26  // kN
                },
                performance: {
                    accuracy: 0.013,
                    repeatability: 0.005
                }
            }
        }
    },
    // UTILITY FUNCTIONS FOR CAD GENERATION & COLLISION

    utilities: {

        /**
         * Get bounding cylinder for collision detection
         * @param {string} manufacturer - e.g., 'bison'
         * @param {string} productLine - e.g., '2405-K'
         * @param {string} size - e.g., '200'
         * @returns {Object} - { diameter, height } in mm
         */
        getBoundingCylinder: function(manufacturer, productLine, size) {
            const product = this.getProduct(manufacturer, productLine, size);
            if (product?.envelope?.boundingCylinder) {
                return product.envelope.boundingCylinder;
            }
            return null;
        },
        /**
         * Get jaw positions at a given opening
         * @param {string} manufacturer
         * @param {string} productLine
         * @param {string} size
         * @param {number} opening - workpiece diameter being clamped
         * @returns {Array} - Array of jaw positions [{radius, angle}, ...]
         */
        getJawPositions: function(manufacturer, productLine, size, opening) {
            const product = this.getProduct(manufacturer, productLine, size);
            if (product?.jawKinematics?.jawPositions) {
                const jk = product.jawKinematics;
                const clampRadius = opening / 2;
                const numJaws = product.jaws || 3;
                const angleStep = 360 / numJaws;

                return Array.from({ length: numJaws }, (_, i) => ({
                    radius: clampRadius,
                    angle: i * angleStep,
                    z: jk.jawPositions.nominal?.z || 0
                }));
            }
            return null;
        },
        /**
         * Check if workpiece fits in chuck
         * @param {string} manufacturer
         * @param {string} productLine
         * @param {string} size
         * @param {number} workpieceDiameter
         * @param {string} clampType - 'OD' or 'ID'
         * @returns {boolean}
         */
        checkClampingFit: function(manufacturer, productLine, size, workpieceDiameter, clampType = 'OD') {
            const product = this.getProduct(manufacturer, productLine, size);
            if (product?.jawKinematics) {
                const range = clampType === 'OD'
                    ? product.jawKinematics.clampingRangeOD
                    : product.jawKinematics.clampingRangeID;

                if (range) {
                    return workpieceDiameter >= range.min && workpieceDiameter <= range.max;
                }
            }
            return false;
        },
        /**
         * Get mounting interface for spindle compatibility check
         */
        getMountingInterface: function(manufacturer, productLine, size) {
            const product = this.getProduct(manufacturer, productLine, size);
            return product?.mounting || null;
        },
        /**
         * Helper to get product by path
         */
        getProduct: function(manufacturer, productLine, size) {
            try {
                return PRISM_WORKHOLDING_GEOMETRY[manufacturer][productLine].sizes[size];
            } catch (e) {
                return null;
            }
        },
        /**
         * Generate simplified CAD profile (2D outline)
         * Returns array of points for chuck body profile
         */
        generateChuckProfile: function(manufacturer, productLine, size) {
            const product = this.getProduct(manufacturer, productLine, size);
            if (!product) return null;

            const env = product.envelope;
            const mount = product.mounting;
            const th = product.throughHole;

            // Generate 2D profile points (R, Z coordinates)
            // This is a simplified profile - real CAD would need full detail
            const profile = [
                // Through-hole
                { r: th.diameter / 2, z: 0 },
                { r: th.diameter / 2, z: env.bodyHeight },

                // Back face step to mounting
                { r: mount.spindleDiameter / 2, z: env.bodyHeight },
                { r: mount.spindleDiameter / 2, z: env.bodyHeight - mount.stepHeight },

                // Outer body
                { r: env.outerDiameter / 2, z: env.bodyHeight - mount.stepHeight },
                { r: env.outerDiameter / 2, z: 0 },

                // Close profile
                { r: th.diameter / 2, z: 0 }
            ];

            return {
                profile,
                revolveAxis: 'Z',
                jawSlots: product.jaws || 3,
                jawSlotAngle: 360 / (product.jaws || 3)
            };
        }
    }
}