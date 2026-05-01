const PRISM_WORKHOLDING_GEOMETRY_EXTENDED = {
    version: '1.0.0',
    generatedDate: '2026-01-14',

    // KITAGAWA POWER CHUCKS - FULL GEOMETRIC DATA
    // Extracted from 140-page catalog

    kitagawa: {

        // B-Series Power Chucks (Large/Heavy Duty)
        'B-Series': {
            description: 'Heavy Duty Power Chucks',
            jaws: 3,
            serration: { small: '1.5x60°', large: '3x60°' },

            sizes: {
                'B-15': {
                    // Extracted from catalog page 15
                    envelope: {
                        outerDiameter: 381,      // A - 15" chuck
                        bodyHeight: 133,         // B
                        jawOD: 300,              // C
                        boundingCylinder: { d: 420, h: 165 }
                    },
                    mounting: {
                        boltCircle: 235,         // F
                        pilotDiameter: 117.5,    // E
                        bolts: { qty: 6, thread: 'M20', depth: 30 },
                        spindleNose: ['A2-8', 'A2-11']
                    },
                    throughHole: {
                        diameter: 76.7,
                        drawbarThread: 'M130x2'
                    },
                    jawKinematics: {
                        jawSlotDepth: 43,        // G
                        masterJawHeight: 82,     // H
                        jawStroke: 11,           // stroke
                        grippingDiameter: { min: 62, max: 260 },
                        jawPositions: {
                            fullyOpen: { radius: 190, angle: [0, 120, 240] },
                            fullyClosed: { radius: 31, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxSpeed: 2500,          // rpm
                        maxClampingForce: 120,   // kN
                        weight: 71,              // kg (from 2.273 * 31.2)
                        pullForce: 180           // kN
                    },
                    accessories: {
                        hydraulicCylinder: 'F2511H',
                        softJaw: 'SJ15C1',
                        hardJaw: 'HB15A1'
                    }
                },
                'B-18': {
                    envelope: {
                        outerDiameter: 450,      // 18" chuck
                        bodyHeight: 133,
                        jawOD: 380,
                        boundingCylinder: { d: 500, h: 170 }
                    },
                    mounting: {
                        boltCircle: 235,
                        pilotDiameter: 117.5,
                        bolts: { qty: 6, thread: 'M20', depth: 30 },
                        spindleNose: ['A2-11']
                    },
                    throughHole: {
                        diameter: 78.25,
                        drawbarThread: 'M130x2'
                    },
                    jawKinematics: {
                        jawSlotDepth: 43,
                        masterJawHeight: 82,
                        jawStroke: 11,
                        grippingDiameter: { min: 62, max: 320 }
                    },
                    performance: {
                        maxSpeed: 2000,
                        maxClampingForce: 164,
                        weight: 139,
                        pullForce: 180
                    }
                },
                'B-21': {
                    envelope: {
                        outerDiameter: 530,      // 21" chuck
                        bodyHeight: 140,
                        jawOD: 380,
                        boundingCylinder: { d: 580, h: 180 }
                    },
                    mounting: {
                        boltCircle: 330.2,
                        pilotDiameter: 140,
                        bolts: { qty: 6, thread: 'M22', depth: 31 },
                        spindleNose: ['A2-15']
                    },
                    throughHole: {
                        diameter: 87.5,
                        drawbarThread: 'M155x3'
                    },
                    jawKinematics: {
                        jawSlotDepth: 60,
                        masterJawHeight: 98.5,
                        jawStroke: 11,
                        grippingDiameter: { min: 65, max: 380 }
                    },
                    performance: {
                        maxSpeed: 1700,
                        maxClampingForce: 235,
                        weight: 280,
                        pullForce: 234
                    }
                },
                'B-24': {
                    envelope: {
                        outerDiameter: 610,      // 24" chuck
                        bodyHeight: 149,
                        jawOD: 380,
                        boundingCylinder: { d: 670, h: 190 }
                    },
                    mounting: {
                        boltCircle: 330.2,
                        pilotDiameter: 165,
                        bolts: { qty: 6, thread: 'M22', depth: 32 },
                        spindleNose: ['A2-15']
                    },
                    throughHole: {
                        diameter: 117.5,
                        drawbarThread: 'M175x3'
                    },
                    jawKinematics: {
                        jawSlotDepth: 60,
                        masterJawHeight: 108,
                        jawStroke: 20,
                        grippingDiameter: { min: 65, max: 450 }
                    },
                    performance: {
                        maxSpeed: 1400,
                        maxClampingForce: 293,
                        weight: 518,
                        pullForce: 234
                    }
                }
            }
        },
        // B-Series with A-Mount (Direct Spindle Mount)
        'B-A-Series': {
            description: 'Power Chucks with A-Mount',

            sizes: {
                'B-15A08': {
                    basedOn: 'B-15',
                    mountType: 'A2-8',

                    envelope: {
                        outerDiameter: 381,
                        bodyHeight: 160,
                        boundingCylinder: { d: 420, h: 190 }
                    },
                    mounting: {
                        spindleNose: 'A2-8',
                        spindleDiameter: 139.719,
                        flangeHeight: 33,
                        boltCircle: 235,
                        pilotDiameter: 117.5
                    },
                    performance: {
                        maxSpeed: 2500,
                        maxClampingForce: 134,
                        weight: 77
                    }
                },
                'B-15A11': {
                    basedOn: 'B-15',
                    mountType: 'A2-11',

                    envelope: {
                        outerDiameter: 381,
                        bodyHeight: 149,
                        boundingCylinder: { d: 420, h: 180 }
                    },
                    mounting: {
                        spindleNose: 'A2-11',
                        spindleDiameter: 196.869,
                        flangeHeight: 22,
                        boltCircle: 260
                    },
                    performance: {
                        maxSpeed: 2500,
                        maxClampingForce: 127,
                        weight: 74
                    }
                },
                'B-18A11': {
                    basedOn: 'B-18',
                    mountType: 'A2-11',

                    envelope: {
                        outerDiameter: 450,
                        bodyHeight: 149,
                        boundingCylinder: { d: 500, h: 180 }
                    },
                    mounting: {
                        spindleNose: 'A2-11',
                        spindleDiameter: 196.869,
                        flangeHeight: 22,
                        boltCircle: 320
                    },
                    performance: {
                        maxSpeed: 2000,
                        maxClampingForce: 178,
                        weight: 149
                    }
                },
                'B-21A15': {
                    basedOn: 'B-21',
                    mountType: 'A2-15',

                    envelope: {
                        outerDiameter: 530,
                        bodyHeight: 161,
                        boundingCylinder: { d: 580, h: 195 }
                    },
                    mounting: {
                        spindleNose: 'A2-15',
                        spindleDiameter: 285.775,
                        flangeHeight: 27,
                        boltCircle: 330.2
                    },
                    performance: {
                        maxSpeed: 1700,
                        maxClampingForce: 246,
                        weight: 289
                    }
                },
                'B-24A15': {
                    basedOn: 'B-24',
                    mountType: 'A2-15',

                    envelope: {
                        outerDiameter: 610,
                        bodyHeight: 170,
                        boundingCylinder: { d: 670, h: 205 }
                    },
                    mounting: {
                        spindleNose: 'A2-15',
                        spindleDiameter: 285.775,
                        flangeHeight: 27,
                        boltCircle: 330.2
                    },
                    performance: {
                        maxSpeed: 1400,
                        maxClampingForce: 304,
                        weight: 526
                    }
                }
            }
        },
        // Standard B-200 Series (Compact)
        'B-200': {
            description: 'Standard Power Chuck Series',
            jaws: 3,

            sizes: {
                'B206': {
                    envelope: {
                        outerDiameter: 169,
                        bodyHeight: 85,
                        boundingCylinder: { d: 200, h: 105 }
                    },
                    mounting: {
                        spindleDiameter: 140,
                        boltCircle: 104.8,
                        bolts: { qty: 3, thread: 'M10' }
                    },
                    throughHole: { diameter: 34 },
                    jawKinematics: {
                        jawStroke: 3.5,
                        grippingDiameter: { min: 10, max: 130 }
                    },
                    performance: {
                        maxSpeed: 6000,
                        maxClampingForce: 57
                    }
                },
                'B208': {
                    envelope: {
                        outerDiameter: 210,
                        bodyHeight: 95,
                        boundingCylinder: { d: 250, h: 115 }
                    },
                    mounting: {
                        spindleDiameter: 170,
                        boltCircle: 133.4,
                        bolts: { qty: 3, thread: 'M12' }
                    },
                    throughHole: { diameter: 52 },
                    jawKinematics: {
                        jawStroke: 5.0,
                        grippingDiameter: { min: 15, max: 165 }
                    },
                    performance: {
                        maxSpeed: 5000,
                        maxClampingForce: 86
                    }
                },
                'B210': {
                    envelope: {
                        outerDiameter: 254,
                        bodyHeight: 106,
                        boundingCylinder: { d: 300, h: 130 }
                    },
                    mounting: {
                        spindleDiameter: 220,
                        boltCircle: 171.4,
                        bolts: { qty: 3, thread: 'M16' }
                    },
                    throughHole: { diameter: 75 },
                    jawKinematics: {
                        jawStroke: 6.0,
                        grippingDiameter: { min: 20, max: 200 }
                    },
                    performance: {
                        maxSpeed: 4200,
                        maxClampingForce: 111
                    }
                },
                'B212': {
                    envelope: {
                        outerDiameter: 315,
                        bodyHeight: 110,
                        boundingCylinder: { d: 365, h: 140 }
                    },
                    mounting: {
                        spindleDiameter: 220,
                        boltCircle: 171.4,
                        bolts: { qty: 6, thread: 'M16' }
                    },
                    throughHole: { diameter: 91 },
                    jawKinematics: {
                        jawStroke: 6.0,
                        grippingDiameter: { min: 25, max: 250 }
                    },
                    performance: {
                        maxSpeed: 3300,
                        maxClampingForce: 144
                    }
                }
            }
        }
    },
    // ROYAL PRODUCTS - LIVE CENTERS, COLLETS, CHUCKS
    // Extracted from 196-page catalog

    royal: {

        // Live Centers
        liveCenters: {

            // Standard Precision Live Centers
            'Standard': {
                description: 'Standard Precision Live Centers',

                sizes: {
                    'MT2-STD': {
                        partNumber: '10102',
                        taper: 'MT2',

                        geometry: {
                            bodyDiameter: 1.75,    // inches (B)
                            bodyLength: 1.47,      // inches (E)
                            pointLength: 1.01,     // inches (F)
                            pointDiameter: 0.88,   // inches (G)
                            overallLength: 4.23,
                            boundingCylinder: { d: 50, h: 120 }  // mm
                        },
                        performance: {
                            maxSpeed: 6000,        // rpm
                            thrustLoad: 725,       // lbs
                            radialLoad: 2360,      // lbs
                            runout: 0.0002         // inches TIR
                        }
                    },
                    'MT3-STD': {
                        partNumber: '10103',
                        taper: 'MT3',

                        geometry: {
                            bodyDiameter: 2.33,
                            bodyLength: 1.75,
                            pointLength: 1.22,
                            pointDiameter: 1.00,
                            overallLength: 5.30,
                            boundingCylinder: { d: 65, h: 150 }
                        },
                        performance: {
                            maxSpeed: 5000,
                            thrustLoad: 970,
                            radialLoad: 3900,
                            runout: 0.0002
                        }
                    },
                    'MT4-STD': {
                        partNumber: '10104',
                        taper: 'MT4',

                        geometry: {
                            bodyDiameter: 2.68,
                            bodyLength: 1.98,
                            pointLength: 1.48,
                            pointDiameter: 1.25,
                            overallLength: 6.14,
                            boundingCylinder: { d: 75, h: 175 }
                        },
                        performance: {
                            maxSpeed: 4500,
                            thrustLoad: 1720,
                            radialLoad: 4050,
                            runout: 0.0002
                        }
                    },
                    'MT5-STD': {
                        partNumber: '10105',
                        taper: 'MT5',

                        geometry: {
                            bodyDiameter: 3.45,
                            bodyLength: 2.81,
                            pointLength: 1.84,
                            pointDiameter: 1.50,
                            overallLength: 8.10,
                            boundingCylinder: { d: 95, h: 230 }
                        },
                        performance: {
                            maxSpeed: 3500,
                            thrustLoad: 3260,
                            radialLoad: 5700,
                            runout: 0.0002
                        }
                    },
                    'MT6-STD': {
                        partNumber: '10106',
                        taper: 'MT6',

                        geometry: {
                            bodyDiameter: 4.00,
                            bodyLength: 3.15,
                            pointLength: 2.31,
                            pointDiameter: 2.00,
                            overallLength: 9.46,
                            boundingCylinder: { d: 110, h: 270 }
                        },
                        performance: {
                            maxSpeed: 3500,
                            thrustLoad: 4080,
                            radialLoad: 6000,
                            runout: 0.0002
                        }
                    }
                }
            },
            // Heavy Duty Live Centers
            'HeavyDuty': {
                description: 'Heavy Duty Live Centers for Large Work',

                sizes: {
                    'MT2-HD': {
                        partNumber: '10478',
                        taper: 'MT2',

                        geometry: {
                            bodyDiameter: 1.70,
                            bodyLength: 2.12,
                            pointLength: 1.75,
                            pointDiameter: 0.88,
                            boundingCylinder: { d: 55, h: 130 }
                        },
                        performance: {
                            maxSpeed: 6000,
                            thrustLoad: 465,
                            radialLoad: 1270
                        }
                    },
                    'MT5-HD': {
                        partNumber: '10445',
                        taper: 'MT5',
                        type: 'Heavy Duty',

                        geometry: {
                            bodyDiameter: 3.82,
                            bodyLength: 3.89,
                            pointLength: 2.31,
                            pointDiameter: 2.00,
                            boundingCylinder: { d: 105, h: 240 }
                        },
                        performance: {
                            maxSpeed: 3000,
                            thrustLoad: 5240,
                            radialLoad: 5300
                        }
                    },
                    'MT6-HD': {
                        partNumber: '10446',
                        taper: 'MT6',
                        type: 'Heavy Duty',

                        geometry: {
                            bodyDiameter: 3.82,
                            bodyLength: 3.89,
                            pointLength: 2.31,
                            pointDiameter: 2.00,
                            boundingCylinder: { d: 105, h: 240 }
                        },
                        performance: {
                            maxSpeed: 3000,
                            thrustLoad: 5240,
                            radialLoad: 5300
                        }
                    }
                }
            },
            // High Speed Live Centers
            'HighSpeed': {
                description: 'High Speed Live Centers up to 12,000 RPM',

                sizes: {
                    'MT3-HS': {
                        partNumber: '10683',
                        taper: 'MT3',

                        geometry: {
                            bodyDiameter: 1.70,
                            bodyLength: 2.12,
                            pointLength: 1.75,
                            pointDiameter: 0.88,
                            pipeDiameter: { min: 0.38, max: 0.63 },
                            boundingCylinder: { d: 55, h: 130 }
                        },
                        performance: {
                            maxSpeed: 12000,
                            thrustLoad: 180,
                            radialLoad: 650
                        }
                    },
                    'MT4-HS': {
                        partNumber: '10684',
                        taper: 'MT4',

                        geometry: {
                            bodyDiameter: 2.45,
                            bodyLength: 2.78,
                            pointLength: 2.35,
                            pointDiameter: 1.25,
                            pipeDiameter: { min: 0.50, max: 0.81 },
                            boundingCylinder: { d: 75, h: 175 }
                        },
                        performance: {
                            maxSpeed: 12000,
                            thrustLoad: 525,
                            radialLoad: 1380
                        }
                    },
                    'MT5-HS': {
                        partNumber: '10685',
                        taper: 'MT5',

                        geometry: {
                            bodyDiameter: 2.45,
                            bodyLength: 2.78,
                            pointLength: 2.35,
                            pointDiameter: 1.25,
                            pipeDiameter: { min: 0.50, max: 0.81 },
                            boundingCylinder: { d: 75, h: 175 }
                        },
                        performance: {
                            maxSpeed: 12000,
                            thrustLoad: 525,
                            radialLoad: 1380
                        }
                    }
                }
            },
            // Interchangeable Point Live Centers
            'InterchangeablePoint': {
                description: 'Live Centers with Quick-Change Points',

                sizes: {
                    'MT2-IP': {
                        partNumber: '10212',
                        taper: 'MT2',

                        geometry: {
                            bodyDiameter: 1.75,
                            bodyLength: 1.47,
                            pointLength: 1.35,
                            pointDiameter: 0.88,
                            pipeDiameter: { min: 0.38, max: 0.63 },
                            boundingCylinder: { d: 50, h: 120 }
                        },
                        performance: {
                            maxSpeed: 6000,
                            thrustLoad: 375,
                            radialLoad: 2360
                        },
                        interchangeablePoints: ['Standard', 'Extended', 'Bull Nose', 'Carbide']
                    },
                    'MT3-IP': {
                        partNumber: '10213',
                        taper: 'MT3',

                        geometry: {
                            bodyDiameter: 2.33,
                            bodyLength: 1.75,
                            pointLength: 1.86,
                            pointDiameter: 1.00,
                            pipeDiameter: { min: 0.38, max: 0.63 },
                            boundingCylinder: { d: 65, h: 150 }
                        },
                        performance: {
                            maxSpeed: 5000,
                            thrustLoad: 740,
                            radialLoad: 3900
                        }
                    },
                    'MT4-IP': {
                        partNumber: '10214',
                        taper: 'MT4',

                        geometry: {
                            bodyDiameter: 2.68,
                            bodyLength: 1.98,
                            pointLength: 2.18,
                            pointDiameter: 1.25,
                            pipeDiameter: { min: 0.50, max: 0.81 },
                            boundingCylinder: { d: 75, h: 175 }
                        },
                        performance: {
                            maxSpeed: 4500,
                            thrustLoad: 1120,
                            radialLoad: 4050
                        }
                    },
                    'MT5-IP': {
                        partNumber: '10215',
                        taper: 'MT5',

                        geometry: {
                            bodyDiameter: 3.45,
                            bodyLength: 2.81,
                            pointLength: 2.58,
                            pointDiameter: 1.50,
                            pipeDiameter: { min: 0.50, max: 0.81 },
                            boundingCylinder: { d: 95, h: 230 }
                        },
                        performance: {
                            maxSpeed: 3500,
                            thrustLoad: 1930,
                            radialLoad: 5700
                        }
                    }
                }
            }
        },
        // CNC Collet Chucks
        colletChucks: {

            'MTC-Series': {
                description: 'Master Tool CNC Collet Chucks',

                sizes: {
                    'MTC-200': {
                        // From page 11
                        envelope: {
                            outerDiameter: 200,    // A
                            bodyHeight: 110,       // B
                            jawOD: 170,            // C
                            boltCircle: 133.4,     // D
                            boundingCylinder: { d: 220, h: 130 }
                        },
                        mounting: {
                            boltThread: 'M12',     // E
                            pilotDiameter: 53      // F
                        },
                        collet: {
                            optimalGrip: 20,       // G optimal
                            minGrip: 15            // G minimum
                        }
                    },
                    'MTC-250': {
                        envelope: {
                            outerDiameter: 250,
                            bodyHeight: 125,
                            jawOD: 220,
                            boltCircle: 171.4,
                            boundingCylinder: { d: 275, h: 150 }
                        },
                        mounting: {
                            boltThread: 'M16',
                            pilotDiameter: 66
                        },
                        collet: {
                            optimalGrip: 24,
                            minGrip: 18
                        }
                    },
                    'MTC-320': {
                        envelope: {
                            outerDiameter: 320,
                            bodyHeight: 150,
                            jawOD: 280,
                            boltCircle: 235,
                            boundingCylinder: { d: 350, h: 175 }
                        },
                        mounting: {
                            boltThread: 'M20',
                            pilotDiameter: 81
                        },
                        collet: {
                            optimalGrip: 28,
                            minGrip: 21
                        }
                    }
                }
            }
        },
        // ER Collet Dimensions (for CAD generation)
        erCollets: {
            'ER8': {
                outerDiameter: 8,
                length: 11,
                capacityRange: [0.5, 5],
                taperAngle: 8
            },
            'ER11': {
                outerDiameter: 11,
                length: 14,
                capacityRange: [0.5, 7],
                taperAngle: 8
            },
            'ER16': {
                outerDiameter: 17,
                length: 20,
                capacityRange: [1, 10],
                taperAngle: 8
            },
            'ER20': {
                outerDiameter: 21,
                length: 24,
                capacityRange: [1, 13],
                taperAngle: 8
            },
            'ER25': {
                outerDiameter: 26,
                length: 29,
                capacityRange: [1, 16],
                taperAngle: 8
            },
            'ER32': {
                outerDiameter: 33,
                length: 35,
                capacityRange: [2, 20],
                taperAngle: 8
            },
            'ER40': {
                outerDiameter: 41,
                length: 41,
                capacityRange: [3, 26],
                taperAngle: 8
            },
            'ER50': {
                outerDiameter: 52,
                length: 50,
                capacityRange: [6, 34],
                taperAngle: 8
            }
        },
        // 5C Collet Dimensions
        '5CCollets': {
            geometry: {
                outerDiameter: 1.0625,    // inches (27mm)
                length: 3.0,              // inches
                taperAngle: 10,           // degrees (half angle)
                noseThread: 'Internal'
            },
            capacityRange: [0.0625, 1.0625],  // inches
            runout: 0.0005  // inches TIR
        }
    },
    // BISON MANUAL CHUCKS - GEOMETRY

    bisonManual: {

        // Type 9167: Adjustable Adapter Back Plates
        '9167': {
            description: '3-Jaw Scroll Chuck with Morse Taper Mount',

            sizes: {
                '4-MT3': {
                    partNumber: '7-861-9400',
                    type: '9167-4"-3',

                    geometry: {
                        chuckDiameter: 100,        // 3.94" = 100mm
                        taper: 'MT3',
                        D1: 45,                    // 1.77" = 45mm
                        D2: 83,                    // 3.27" = 83mm
                        D3: 96.5,                  // 3.8" = 96.5mm
                        L1: 165,                   // 6.50" = 165mm
                        L2: 84,                    // 3.31" = 84mm
                        L3: 79,                    // 3.11" = 79mm
                        L4: 12,                    // 0.47" = 12mm
                        boundingCylinder: { d: 120, h: 180 }
                    },
                    mounting: {
                        bolts: { qty: 3, thread: 'M8' }
                    },
                    performance: {
                        weight: 3.4  // kg (7.50 lbs)
                    }
                },
                '4-MT4': {
                    partNumber: '7-861-9404',
                    type: '9167-4"-4',

                    geometry: {
                        chuckDiameter: 100,
                        taper: 'MT4',
                        D1: 45,
                        D2: 83,
                        D3: 96.5,
                        L1: 188,                   // 7.40"
                        L2: 86,
                        L3: 79,
                        L4: 12,
                        boundingCylinder: { d: 120, h: 205 }
                    },
                    mounting: {
                        bolts: { qty: 3, thread: 'M8' }
                    },
                    performance: {
                        weight: 3.7
                    }
                },
                '5-MT4': {
                    partNumber: '7-861-9500',
                    type: '9167-5"-4',

                    geometry: {
                        chuckDiameter: 125,        // 4.92"
                        taper: 'MT4',
                        D1: 55,                    // 2.17"
                        D2: 108,                   // 4.25"
                        D3: 122,                   // 4.8"
                        L1: 199,                   // 7.85"
                        L2: 97,                    // 3.82"
                        L3: 90,                    // 3.56"
                        L4: 14,                    // 0.55"
                        boundingCylinder: { d: 145, h: 220 }
                    },
                    mounting: {
                        bolts: { qty: 3, thread: 'M8' }
                    },
                    performance: {
                        weight: 6.3  // 13.89 lbs
                    }
                },
                '5-MT5': {
                    partNumber: '7-861-9505',
                    type: '9167-5"-5',

                    geometry: {
                        chuckDiameter: 125,
                        taper: 'MT5',
                        D1: 55,
                        D2: 108,
                        D3: 122,
                        L1: 227,                   // 8.92"
                        L2: 97,
                        L3: 90,
                        L4: 14,
                        boundingCylinder: { d: 145, h: 250 }
                    },
                    mounting: {
                        bolts: { qty: 3, thread: 'M8' }
                    },
                    performance: {
                        weight: 7.0  // 15.43 lbs
                    }
                },
                '6-MT5': {
                    partNumber: '7-861-9600',
                    type: '9167-6"-5',

                    geometry: {
                        chuckDiameter: 160,        // 6.30"
                        taper: 'MT5',
                        D1: 86,                    // 3.39"
                        D2: 140,                   // 5.51"
                        D3: 160,                   // 6.3"
                        L1: 230,                   // 9.06"
                        L2: 101,                   // 3.96"
                        L3: 94,                    // 3.70"
                        L4: 16,                    // 0.63"
                        boundingCylinder: { d: 180, h: 255 }
                    },
                    mounting: {
                        bolts: { qty: 3, thread: 'M10' }
                    },
                    performance: {
                        weight: 11.2  // 24.69 lbs
                    }
                }
            }
        }
    },
    // KURT VISES - STANDARD GEOMETRY

    kurt: {

        // AngLock Series
        'AngLock': {
            description: 'Precision AngLock Vises with Anti-Lift Design',

            sizes: {
                'D40': {
                    model: 'D40',

                    geometry: {
                        jawWidth: 102,             // 4"
                        maxOpening: 102,           // 4"
                        baseLength: 267,           // 10.5"
                        baseWidth: 127,            // 5"
                        height: 76,                // 3"
                        boundingBox: { x: 267, y: 127, z: 102 }
                    },
                    jawKinematics: {
                        clampingForce: 22,         // kN (5,000 lbs)
                        jawTravel: 102
                    },
                    mounting: {
                        slots: 2,
                        slotWidth: 16,             // mm
                        slotSpacing: 76            // mm
                    },
                    performance: {
                        accuracy: 0.025,           // mm (0.001")
                        repeatability: 0.013,      // mm (0.0005")
                        weight: 13.6               // kg (30 lbs)
                    }
                },
                'D675': {
                    model: 'D675',

                    geometry: {
                        jawWidth: 152,             // 6"
                        maxOpening: 191,           // 7.5"
                        baseLength: 400,           // 15.75"
                        baseWidth: 178,            // 7"
                        height: 89,                // 3.5"
                        boundingBox: { x: 400, y: 178, z: 140 }
                    },
                    jawKinematics: {
                        clampingForce: 27,         // kN (6,000 lbs)
                        jawTravel: 191
                    },
                    mounting: {
                        slots: 2,
                        slotWidth: 18,
                        slotSpacing: 102
                    },
                    performance: {
                        accuracy: 0.025,
                        repeatability: 0.013,
                        weight: 36.3               // kg (80 lbs)
                    }
                },
                'D688': {
                    model: 'D688',

                    geometry: {
                        jawWidth: 203,             // 8"
                        maxOpening: 203,           // 8"
                        baseLength: 483,           // 19"
                        baseWidth: 203,            // 8"
                        height: 102,               // 4"
                        boundingBox: { x: 483, y: 203, z: 165 }
                    },
                    jawKinematics: {
                        clampingForce: 31,         // kN (7,000 lbs)
                        jawTravel: 203
                    },
                    mounting: {
                        slots: 2,
                        slotWidth: 22,
                        slotSpacing: 127
                    },
                    performance: {
                        accuracy: 0.025,
                        repeatability: 0.013,
                        weight: 63.5               // kg (140 lbs)
                    }
                }
            }
        },
        // MaxLock Series
        'MaxLock': {
            description: 'High-Force MaxLock Vises',

            sizes: {
                'ML690': {
                    model: 'ML690',

                    geometry: {
                        jawWidth: 152,             // 6"
                        maxOpening: 229,           // 9"
                        baseLength: 457,
                        baseWidth: 203,
                        height: 102,
                        boundingBox: { x: 457, y: 203, z: 165 }
                    },
                    jawKinematics: {
                        clampingForce: 30,         // kN (6,800 lbs)
                        jawTravel: 229
                    },
                    performance: {
                        weight: 59
                    }
                }
            }
        },
        // CrossOver Series (5-Axis)
        'CrossOver': {
            description: '5-Axis CrossOver Vises',

            sizes: {
                'CXV50': {
                    model: 'CXV50',

                    geometry: {
                        jawWidth: 127,             // 5"
                        maxOpening: 127,           // 5"
                        baseLength: 305,
                        baseWidth: 152,
                        height: 76,
                        boundingBox: { x: 305, y: 152, z: 115 }
                    },
                    jawKinematics: {
                        clampingForce: 22,
                        jawTravel: 127
                    },
                    features: {
                        lowProfile: true,
                        fiveAxisCompatible: true,
                        selfCentering: true
                    },
                    performance: {
                        accuracy: 0.025,
                        weight: 18
                    }
                }
            }
        }
    },
    // SCHUNK - VERO-S & TANDEM GEOMETRY

    schunk: {

        // VERO-S Quick-Change Modules
        'VERO-S': {
            description: 'VERO-S Zero-Point Clamping Modules',

            sizes: {
                'NSE-A3-138': {
                    description: 'VERO-S NSE-A3 138',

                    geometry: {
                        moduleDiameter: 138,
                        moduleHeight: 30,
                        pinDiameter: 20,
                        pinSpacing: 0,             // single pin
                        boundingCylinder: { d: 150, h: 45 }
                    },
                    kinematics: {
                        clampTravel: 8,
                        holdingForce: 25,          // kN
                        pullDownForce: 8           // kN
                    },
                    performance: {
                        repeatability: 0.005,      // mm
                        accuracy: 0.01
                    }
                },
                'NSE-plus-138': {
                    description: 'VERO-S NSE plus 138',

                    geometry: {
                        moduleDiameter: 138,
                        moduleHeight: 40,
                        pinDiameter: 30,
                        boundingCylinder: { d: 155, h: 55 }
                    },
                    kinematics: {
                        clampTravel: 10,
                        holdingForce: 40,
                        pullDownForce: 15
                    },
                    performance: {
                        repeatability: 0.005,
                        accuracy: 0.008
                    }
                }
            }
        },
        // TANDEM Centric Vises
        'TANDEM': {
            description: 'TANDEM Plus Centric Vises',

            sizes: {
                'KSP-100': {
                    description: 'TANDEM Plus KSP 100',

                    geometry: {
                        jawWidth: 100,
                        maxOpening: 122,
                        baseLength: 250,
                        baseWidth: 136,
                        height: 71,
                        boundingBox: { x: 250, y: 136, z: 100 }
                    },
                    jawKinematics: {
                        clampingForce: 35,         // kN
                        jawTravel: 61,             // per side (self-centering)
                        strokePerRevolution: 4     // mm
                    },
                    features: {
                        selfCentering: true,
                        reversibleJaws: true
                    },
                    performance: {
                        repeatability: 0.01,
                        weight: 12
                    }
                },
                'KSP-160': {
                    description: 'TANDEM Plus KSP 160',

                    geometry: {
                        jawWidth: 160,
                        maxOpening: 182,
                        baseLength: 350,
                        baseWidth: 195,
                        height: 88,
                        boundingBox: { x: 350, y: 195, z: 130 }
                    },
                    jawKinematics: {
                        clampingForce: 55,
                        jawTravel: 91,
                        strokePerRevolution: 4
                    },
                    performance: {
                        repeatability: 0.01,
                        weight: 26
                    }
                }
            }
        },
        // ROTA Power Chucks
        'ROTA': {
            description: 'ROTA THW Plus Power Chucks',

            sizes: {
                'ROTA-THW-200': {
                    description: 'ROTA THW plus 200',

                    geometry: {
                        outerDiameter: 200,
                        bodyHeight: 85,
                        throughHole: 52,
                        boundingCylinder: { d: 220, h: 100 }
                    },
                    jawKinematics: {
                        jawStroke: 5,
                        grippingDiameter: { min: 15, max: 160 }
                    },
                    performance: {
                        maxSpeed: 5000,
                        maxClampingForce: 90,
                        runout: 0.010
                    }
                },
                'ROTA-THW-250': {
                    description: 'ROTA THW plus 250',

                    geometry: {
                        outerDiameter: 250,
                        bodyHeight: 100,
                        throughHole: 75,
                        boundingCylinder: { d: 275, h: 120 }
                    },
                    jawKinematics: {
                        jawStroke: 6,
                        grippingDiameter: { min: 20, max: 200 }
                    },
                    performance: {
                        maxSpeed: 4200,
                        maxClampingForce: 120,
                        runout: 0.010
                    }
                }
            }
        }
    },
    // JERGENS - BALL LOCK & ZPS GEOMETRY

    jergens: {

        // Ball Lock Quick-Change System
        'BallLock': {
            description: 'Ball Lock Quick-Change Mounting System',

            bushings: {
                'BL-1': {
                    partNumber: '49001',

                    geometry: {
                        outerDiameter: 38.1,       // 1.5"
                        height: 19.05,             // 0.75"
                        boreDiameter: 22.23,       // 0.875"
                        flangeDiameter: 50.8,      // 2.0"
                        flangeHeight: 6.35,        // 0.25"
                        boundingCylinder: { d: 55, h: 25 }
                    },
                    kinematics: {
                        pullForce: 22.2,           // kN (5,000 lbs)
                        shearForce: 88.9,          // kN (20,000 lbs)
                        ballTravel: 3.2            // mm
                    },
                    performance: {
                        repeatability: 0.0127      // mm (0.0005")
                    }
                },
                'BL-2': {
                    partNumber: '49002',

                    geometry: {
                        outerDiameter: 50.8,       // 2.0"
                        height: 25.4,              // 1.0"
                        boreDiameter: 28.58,       // 1.125"
                        flangeDiameter: 63.5,      // 2.5"
                        flangeHeight: 7.94,        // 0.3125"
                        boundingCylinder: { d: 70, h: 35 }
                    },
                    kinematics: {
                        pullForce: 35.6,           // kN (8,000 lbs)
                        shearForce: 133.4,         // kN (30,000 lbs)
                        ballTravel: 4.0
                    },
                    performance: {
                        repeatability: 0.0127
                    }
                }
            },
            shanks: {
                'BL-1-Shank': {
                    geometry: {
                        shankDiameter: 22.23,      // 0.875"
                        shankLength: 31.75,        // 1.25"
                        headDiameter: 31.75,       // 1.25"
                        headHeight: 9.53           // 0.375"
                    }
                },
                'BL-2-Shank': {
                    geometry: {
                        shankDiameter: 28.58,      // 1.125"
                        shankLength: 38.1,         // 1.5"
                        headDiameter: 38.1,        // 1.5"
                        headHeight: 11.11          // 0.4375"
                    }
                }
            }
        },
        // ZPS Zero-Point System
        'ZPS': {
            description: 'Zero-Point Clamping System',

            '52mm': {
                description: 'ZPS 52mm System',

                geometry: {
                    pullStudSpacing: 52,
                    moduleSize: { x: 100, y: 100 },
                    moduleHeight: 30,
                    boundingBox: { x: 115, y: 115, z: 45 }
                },
                kinematics: {
                    holdingForce: 20,              // kN
                    clampTravel: 6
                },
                performance: {
                    repeatability: 0.005
                }
            },
            '96mm': {
                description: 'ZPS 96mm System',

                geometry: {
                    pullStudSpacing: 96,
                    moduleSize: { x: 150, y: 150 },
                    moduleHeight: 40,
                    boundingBox: { x: 165, y: 165, z: 55 }
                },
                kinematics: {
                    holdingForce: 35,
                    clampTravel: 8
                },
                performance: {
                    repeatability: 0.005
                }
            }
        }
    },
    // LANG TECHNIK - QUICK-POINT & MAKRO-GRIP GEOMETRY

    lang: {

        // Quick-Point Zero-Point System
        'QuickPoint': {
            description: 'Quick-Point Zero-Point Clamping',

            '52': {
                description: 'Quick-Point 52 System',

                geometry: {
                    pullStudSpacing: 52,
                    moduleBaseDiameter: 100,
                    moduleHeight: 25,
                    pinDiameter: 12,              // F5 tolerance
                    boundingCylinder: { d: 115, h: 40 }
                },
                kinematics: {
                    holdingForce: 20,             // kN
                    clampTravel: 5,
                    pullDownForce: 8
                },
                performance: {
                    repeatability: 0.005,
                    accuracy: 0.01
                }
            },
            '96': {
                description: 'Quick-Point 96 System',

                geometry: {
                    pullStudSpacing: 96,
                    moduleBaseDiameter: 150,
                    moduleHeight: 35,
                    pinDiameter: 20,
                    boundingCylinder: { d: 165, h: 50 }
                },
                kinematics: {
                    holdingForce: 35,
                    clampTravel: 8,
                    pullDownForce: 15
                },
                performance: {
                    repeatability: 0.005,
                    accuracy: 0.008
                }
            }
        },
        // Makro-Grip Stamping Vises
        'MakroGrip': {
            description: 'Makro-Grip 5-Axis Stamping Vises',

            sizes: {
                'MG-77': {
                    description: 'Makro-Grip 77mm',

                    geometry: {
                        jawWidth: 77,
                        maxOpening: 125,
                        baseLength: 180,
                        baseWidth: 90,
                        height: 55,
                        boundingBox: { x: 180, y: 110, z: 75 }
                    },
                    jawKinematics: {
                        clampingForce: 20,
                        jawTravel: 62.5,           // per side
                        grippingDepth: 3           // stamping depth
                    },
                    features: {
                        selfCentering: true,
                        stampingJaws: true,
                        fiveAxisCompatible: true
                    }
                },
                'MG-125': {
                    description: 'Makro-Grip 125mm',

                    geometry: {
                        jawWidth: 125,
                        maxOpening: 165,
                        baseLength: 260,
                        baseWidth: 130,
                        height: 70,
                        boundingBox: { x: 260, y: 150, z: 95 }
                    },
                    jawKinematics: {
                        clampingForce: 35,
                        jawTravel: 82.5,
                        grippingDepth: 3
                    }
                },
                'MG-160': {
                    description: 'Makro-Grip 160mm',

                    geometry: {
                        jawWidth: 160,
                        maxOpening: 210,
                        baseLength: 330,
                        baseWidth: 165,
                        height: 85,
                        boundingBox: { x: 330, y: 190, z: 115 }
                    },
                    jawKinematics: {
                        clampingForce: 50,
                        jawTravel: 105,
                        grippingDepth: 3
                    }
                }
            }
        }
    },
    // MORSE TAPER GEOMETRY (Standard Reference)
    // For CAD generation of tapered components

    morseTapers: {
        'MT0': {
            largeDiameter: 9.045,
            smallDiameter: 6.401,
            length: 49.2,
            taperPerFoot: 0.6246,
            angle: 1.4908  // degrees (half angle)
        },
        'MT1': {
            largeDiameter: 12.065,
            smallDiameter: 9.371,
            length: 53.9,
            taperPerFoot: 0.5986,
            angle: 1.4287
        },
        'MT2': {
            largeDiameter: 17.780,
            smallDiameter: 14.519,
            length: 64.0,
            taperPerFoot: 0.5994,
            angle: 1.4307
        },
        'MT3': {
            largeDiameter: 23.825,
            smallDiameter: 19.761,
            length: 80.9,
            taperPerFoot: 0.6024,
            angle: 1.4377
        },
        'MT4': {
            largeDiameter: 31.267,
            smallDiameter: 25.908,
            length: 102.4,
            taperPerFoot: 0.6233,
            angle: 1.4876
        },
        'MT5': {
            largeDiameter: 44.399,
            smallDiameter: 37.465,
            length: 129.5,
            taperPerFoot: 0.6315,
            angle: 1.5073
        },
        'MT6': {
            largeDiameter: 63.348,
            smallDiameter: 53.746,
            length: 182.0,
            taperPerFoot: 0.6257,
            angle: 1.4933
        }
    },
    // SPINDLE NOSE GEOMETRY (DIN 55026 / ISO 702-1)
    // For mounting interface verification

    spindleNoses: {
        'A2-4': {
            diameter: 101.594,        // mm
            pilotDiameter: 85.725,
            boltCircle: 82.55,
            bolts: { qty: 3, thread: 'M10' },
            shortTaperAngle: 7.125    // degrees
        },
        'A2-5': {
            diameter: 133.375,
            pilotDiameter: 106.362,
            boltCircle: 104.775,
            bolts: { qty: 3, thread: 'M12' },
            shortTaperAngle: 7.125
        },
        'A2-6': {
            diameter: 165.100,
            pilotDiameter: 139.700,
            boltCircle: 133.35,
            bolts: { qty: 6, thread: 'M12' },
            shortTaperAngle: 7.125
        },
        'A2-8': {
            diameter: 196.850,
            pilotDiameter: 171.450,
            boltCircle: 171.45,
            bolts: { qty: 6, thread: 'M16' },
            shortTaperAngle: 7.125
        },
        'A2-11': {
            diameter: 266.700,
            pilotDiameter: 234.950,
            boltCircle: 235.0,
            bolts: { qty: 6, thread: 'M20' },
            shortTaperAngle: 7.125
        },
        'A2-15': {
            diameter: 355.600,
            pilotDiameter: 285.750,
            boltCircle: 330.2,
            bolts: { qty: 6, thread: 'M22' },
            shortTaperAngle: 7.125
        },
        'A2-20': {
            diameter: 508.000,
            pilotDiameter: 406.400,
            boltCircle: 463.55,
            bolts: { qty: 6, thread: 'M24' },
            shortTaperAngle: 7.125
        }
    }
}