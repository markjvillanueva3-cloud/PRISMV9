const PRISM_CATALOG_BATCH7 = {
    version: '7.0.0',
    created: '2026-01-17',
    manufacturers: [
        'Kennametal', 'EMUGE', 'SGS', 'MA Ford', 'Guhring',
        'Haimer', 'Korloy', 'Ingersoll', 'Accupro', 'Rapidkut'
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // KENNAMETAL VOLUME 2 - ROTATING TOOLS
    // ═══════════════════════════════════════════════════════════════════════════
    KENNAMETAL_ROTATING: {
        // Beyond HP Deep Hole Drills
        deepHoleDrills: {
            B27_HPG: {
                description: 'Beyond HP Solid Carbide Deep-Hole Drills - Steel/Cast Iron',
                grade: 'KCPK20',
                coating: 'AlCrN-TiAlN',
                pointAngle: 140,
                helixAngle: 30,
                features: ['four-margin lands', 'through coolant', 'polished flutes'],
                maxDepth: '40xD',
                materials: ['P', 'K'],
                speeds: { steel: { min: 80, max: 150 }, castIron: { min: 100, max: 180 } },
                sizes: [
                    { dia: 2.383, shank: 3, oal: 86, flute: 35.7, partNo: 'B271Z02383KMG' },
                    { dia: 2.5, shank: 3, oal: 86, flute: 37.5, partNo: 'B271Z02500KMG' },
                    { dia: 3.0, shank: 3, oal: 86, flute: 45, partNo: 'B271Z03000HPG' },
                    { dia: 3.175, shank: 4, oal: 105, flute: 47.6, partNo: 'B271Z03175HPG' },
                    { dia: 4.0, shank: 4, oal: 105, flute: 60, partNo: 'B271Z04000HPG' },
                    { dia: 5.0, shank: 6, oal: 124, flute: 75, partNo: 'B271Z05000HPG' },
                    { dia: 6.0, shank: 6, oal: 124, flute: 90, partNo: 'B271Z06000HPG' },
                    { dia: 6.35, shank: 6, oal: 124, flute: 95.3, partNo: 'B271Z06350HPG' },
                    { dia: 8.0, shank: 8, oal: 143, flute: 120, partNo: 'B271Z08000HPG' },
                    { dia: 10.0, shank: 10, oal: 162, flute: 150, partNo: 'B271Z10000HPG' },
                    { dia: 12.0, shank: 12, oal: 181, flute: 180, partNo: 'B271Z12000HPG' },
                    { dia: 16.0, shank: 16, oal: 219, flute: 240, partNo: 'B271Z16000HPG' }
                ],
                generateEnvelope: function(dia, length) {
                    return [
                        { z: 0, r: dia / 2 },
                        { z: length * 0.1, r: dia / 2 },
                        { z: length * 0.9, r: dia / 2 * 0.95 },
                        { z: length, r: 0 }
                    ];
                }
            },
            B27_HPS: {
                description: 'Beyond HP Deep-Hole Drills - Aluminum/Non-Ferrous',
                grade: 'KN25',
                coating: 'Uncoated',
                pointAngle: 140,
                features: ['sharp cutting edge', 'prevents BUE'],
                maxDepth: '40xD',
                materials: ['N'],
                speeds: { aluminum: { min: 200, max: 400 }, copper: { min: 150, max: 300 } }
            },
            B27_SGL: {
                description: 'Beyond HP Deep-Hole Drills - Stainless/High-Temp Alloys',
                grade: 'KCMS20',
                coating: 'AlTiN PVD',
                pointAngle: 140,
                features: ['superior surface finish', 'MQL capable'],
                maxDepth: '40xD',
                materials: ['M', 'S'],
                speeds: { stainless: { min: 60, max: 100 }, highTemp: { min: 30, max: 60 } }
            }
        },

        // KenTIP FS Modular Drills
        kenTipFS: {
            description: 'Modular Drill System - Fusion of Solid Carbide and Indexable',
            features: ['multi-coolant (4 exits)', 'wrench included', '3-point geometry'],
            depthRatios: ['1.5xD', '3xD', '5xD', '8xD', '12xD'],
            grades: ['KCPK15', 'KCPM15', 'KCU25'],
            seatSizes: {
                A: { diaRange: [6.0, 6.299], shank: 8, ls: 37 },
                B: { diaRange: [6.3, 6.599], shank: 8, ls: 37 },
                C: { diaRange: [6.6, 6.999], shank: 8, ls: 37 },
                D: { diaRange: [7.0, 7.499], shank: 8, ls: 37 },
                E: { diaRange: [7.5, 7.999], shank: 8, ls: 37 },
                F: { diaRange: [8.0, 8.499], shank: 10, ls: 41 },
                G: { diaRange: [8.5, 8.999], shank: 10, ls: 41 },
                H: { diaRange: [9.0, 9.499], shank: 10, ls: 41 },
                I: { diaRange: [9.5, 9.999], shank: 10, ls: 41 },
                J: { diaRange: [10.0, 10.499], shank: 12, ls: 46 },
                K: { diaRange: [10.5, 10.999], shank: 12, ls: 46 },
                L: { diaRange: [11.0, 11.499], shank: 12, ls: 46 },
                M: { diaRange: [11.5, 11.999], shank: 12, ls: 46 },
                N: { diaRange: [12.0, 12.499], shank: 14, ls: 46 },
                O: { diaRange: [12.5, 12.999], shank: 14, ls: 46 },
                P: { diaRange: [13.0, 13.499], shank: 14, ls: 46 },
                Q: { diaRange: [13.5, 13.999], shank: 14, ls: 46 },
                R: { diaRange: [14.0, 14.499], shank: 16, ls: 49 },
                S: { diaRange: [14.5, 14.999], shank: 16, ls: 49 },
                T: { diaRange: [15.0, 15.999], shank: 16, ls: 49 },
                U: { diaRange: [16.0, 16.999], shank: 16, ls: 49 },
                V: { diaRange: [17.0, 17.999], shank: 20, ls: 51 },
                W: { diaRange: [18.0, 18.999], shank: 20, ls: 51 },
                X: { diaRange: [19.0, 19.999], shank: 20, ls: 51 },
                Y: { diaRange: [20.0, 20.999], shank: 25, ls: 54 },
                Z: { diaRange: [21.0, 21.999], shank: 25, ls: 54 },
                ZA: { diaRange: [22.0, 22.999], shank: 25, ls: 54 },
                ZB: { diaRange: [23.0, 23.999], shank: 25, ls: 54 },
                ZC: { diaRange: [24.0, 24.999], shank: 25, ls: 54 },
                ZD: { diaRange: [25.0, 25.999], shank: 25, ls: 54 }
            },
            bodies: [
                { partNo: 'KTFS0237R03SS031', dia: 6.0, depth: '3xD', shank: 'SS', shankDia: 8 },
                { partNo: 'KTFS0315R03SS038', dia: 8.0, depth: '3xD', shank: 'SS', shankDia: 10 },
                { partNo: 'KTFS0394R03SS044', dia: 10.0, depth: '3xD', shank: 'SS', shankDia: 12 },
                { partNo: 'KTFS0473R03SS050', dia: 12.0, depth: '3xD', shank: 'SS', shankDia: 14 },
                { partNo: 'KTFS0591R03SS063', dia: 15.0, depth: '3xD', shank: 'SS', shankDia: 16 },
                { partNo: 'KTFS0788R03SCF100', dia: 20.0, depth: '3xD', shank: 'SCF', shankDia: 25 },
                { partNo: 'KTFS0985R03SCF100', dia: 25.0, depth: '3xD', shank: 'SCF', shankDia: 25 }
            ]
        },

        // HARVI End Mills
        harviEndMills: {
            HARVI_I: {
                description: 'High-Performance Solid Carbide End Mills',
                features: [
                    'four unequal flute spacing',
                    'center cutting',
                    '38° helix angle',
                    'Safe-Lock shank option'
                ],
                grades: {
                    KCPM15: { material: 'Steel/Stainless', maxHRC: 52, coating: 'Beyond' },
                    KCSM15: { material: 'Titanium', coating: 'Beyond' },
                    KC643M: { material: 'Universal', coating: 'AlTiN' }
                },
                capability: {
                    slotting: '1xD',
                    ramping: true,
                    plunging: true,
                    helicalInterpolation: true
                },
                sizes: [
                    { dia: 3.175, shank: 6, loc: 6.35, oal: 38.1, flutes: 4, partNo: 'HPHV125S4025' },
                    { dia: 4.763, shank: 6, loc: 7.94, oal: 38.1, flutes: 4, partNo: 'HPHV188S4031' },
                    { dia: 6.35, shank: 6, loc: 9.53, oal: 50.8, flutes: 4, partNo: 'HPHV250S4038' },
                    { dia: 7.938, shank: 8, loc: 12.7, oal: 57.15, flutes: 4, partNo: 'HPHV312S4050' },
                    { dia: 9.525, shank: 10, loc: 15.88, oal: 63.5, flutes: 4, partNo: 'HPHV375S4063' },
                    { dia: 12.7, shank: 12, loc: 19.05, oal: 76.2, flutes: 4, partNo: 'HPHV500S4075' },
                    { dia: 15.875, shank: 16, loc: 25.4, oal: 88.9, flutes: 4, partNo: 'HPHV625S4100' },
                    { dia: 19.05, shank: 20, loc: 31.75, oal: 101.6, flutes: 4, partNo: 'HPHV750S4125' },
                    { dia: 25.4, shank: 25, loc: 38.1, oal: 114.3, flutes: 4, partNo: 'HPHV100S4150' }
                ],
                cornerRadii: [0, 0.015, 0.030, 0.060, 0.090],
                tolerances: {
                    'dia<=3.175': { D: '+0/-.002', shank: '+0/-.00024' },
                    'dia<=6.35': { D: '+0/-.002', shank: '+0/-.00031' },
                    'dia<=9.525': { D: '+0/-.002', shank: '+0/-.00035' },
                    'dia<=18.654': { D: '+0/-.002', shank: '+0/-.00043' },
                    'dia<=30.163': { D: '+0/-.002', shank: '+0/-.00051' }
                }
            }
        },

        // Tapping
        taps: {
            solidCarbide: {
                series: {
                    T320: { desc: 'Steel through holes, LH spiral flute', material: 'Steel' },
                    T321: { desc: 'Steel through holes, LH spiral flute, coolant-through', material: 'Steel' },
                    T331: { desc: 'Steel blind holes, RH spiral flute, coolant-through', material: 'Steel' },
                    T340: { desc: 'Cast iron/Al through holes, straight flute', material: 'Cast Iron' },
                    T351: { desc: 'Cast iron/Al blind holes, straight flute, coolant-through', material: 'Cast Iron' },
                    T410: { desc: 'Hard steel 55-63 HRC, straight flute', material: 'Hardened Steel' },
                    T471: { desc: 'Aluminum blind holes, straight flute, coolant-through', material: 'Aluminum' },
                    T491: { desc: 'Aluminum blind holes, forming tap, coolant-through', material: 'Aluminum' }
                }
            },
            hssePM: {
                series: {
                    T620: { desc: 'Steel/SS through holes, LH spiral flute', coolant: false },
                    T621: { desc: 'Steel/SS through holes, LH spiral flute', coolant: true },
                    T624: { desc: 'Steel/SS blind/through, forming tap', coolant: false },
                    T625: { desc: 'Steel/SS blind holes, forming tap', coolant: true },
                    T630: { desc: 'Steel/SS blind holes, RH spiral flute', coolant: false },
                    T631: { desc: 'Steel/SS blind holes, RH spiral flute', coolant: true },
                    T660: { desc: 'Titanium through holes, LH spiral flute', coolant: false },
                    T662: { desc: 'Titanium blind holes, RH spiral flute', coolant: false },
                    T690: { desc: 'Nickel/Cobalt alloys through holes', coolant: false },
                    T692: { desc: 'Nickel/Cobalt alloys blind holes, 3-4 pitch chamfer', coolant: false }
                }
            },
            gotap: {
                description: 'Multipurpose HSS-E Taps',
                coating: 'PVD',
                materials: ['Steel', 'Stainless', 'Cast Aluminum', 'Ductile Iron'],
                features: ['tension/compression compatible', 'TC variant for blind holes']
            }
        },

        // Speed/Feed Recommendations
        cuttingData: {
            rodeka12X: {
                lightMachining: {
                    ap: 0.030, // inches
                    feeds: {
                        'ELDJX': { ae5: 0.040, ae10: 0.050, ae20: 0.037, ae30: 0.029, ae40_100: 0.030 },
                        'SGDJX': { ae5: 0.048, ae10: 0.052, ae20: 0.039, ae30: 0.034, ae40_100: 0.031 }
                    }
                },
                generalPurpose: {
                    ap: 0.050,
                    feeds: {
                        'ELDJX': { ae5: 0.032, ae10: 0.039, ae20: 0.029, ae30: 0.023, ae40_100: 0.026 },
                        'SGDJX': { ae5: 0.038, ae10: 0.041, ae20: 0.031, ae30: 0.027, ae40_100: 0.027 }
                    }
                },
                heavyMachining: {
                    ap: 0.080,
                    feeds: {
                        'ELDJX': { ae5: 0.026, ae10: 0.032, ae20: 0.024, ae30: 0.019, ae40_100: 0.021 },
                        'SGDJX': { ae5: 0.031, ae10: 0.034, ae20: 0.025, ae30: 0.022, ae40_100: 0.022 }
                    }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // EMUGE - THREADING TOOLS
    // ═══════════════════════════════════════════════════════════════════════════
    EMUGE: {
        machineTaps: {
            rekord1B_AL: {
                description: 'Machine Taps for Aluminum Wrought Alloys',
                standard: 'DIN 371/376',
                tolerance: 'ISO 2/6H',
                material: 'HSSE',
                coating: null,
                chamfer: 'B (2-3 pitch)',
                coolant: 'E/O',
                applications: ['N 1.4', 'Aluminum wrought'],
                sizes: [
                    { thread: 'M1', pitch: 0.25, l1: 40, l2: 5, l3: null, d2: 2.5, partNo: 'B0204500.0010' },
                    { thread: 'M1.4', pitch: 0.3, l1: 40, l2: 6, l3: null, d2: 2.5, partNo: 'B0204500.0014' },
                    { thread: 'M1.6', pitch: 0.35, l1: 40, l2: 6, l3: 11, d2: 2.5, partNo: 'B0204500.0016' },
                    { thread: 'M2', pitch: 0.4, l1: 45, l2: 7, l3: 12, d2: 2.8, partNo: 'B0204500.0020' },
                    { thread: 'M2.5', pitch: 0.45, l1: 50, l2: 9, l3: 14, d2: 2.8, partNo: 'B0204500.0025' },
                    { thread: 'M3', pitch: 0.5, l1: 56, l2: 11, l3: 18, d2: 3.5, partNo: 'B0204500.0030' },
                    { thread: 'M4', pitch: 0.7, l1: 63, l2: 13, l3: 21, d2: 4.5, partNo: 'B0204500.0040' },
                    { thread: 'M5', pitch: 0.8, l1: 70, l2: 15, l3: 25, d2: 6, partNo: 'B0204500.0050' },
                    { thread: 'M6', pitch: 1.0, l1: 80, l2: 17, l3: 30, d2: 6, partNo: 'B0204500.0060' },
                    { thread: 'M8', pitch: 1.25, l1: 90, l2: 20, l3: 35, d2: 8, partNo: 'B0204500.0080' },
                    { thread: 'M10', pitch: 1.5, l1: 100, l2: 22, l3: 39, d2: 10, partNo: 'B0204500.0100' },
                    { thread: 'M12', pitch: 1.75, l1: 110, l2: 24, l3: 44, d2: 12, partNo: 'B0204500.0120' }
                ]
            },
            enorm1_AL: {
                description: 'Enorm Series for Aluminum',
                standard: 'DIN 371/376',
                tolerance: 'ISO 2/6H',
                material: 'HSSE',
                coating: 'R45',
                chamfer: 'C (2-3 pitch)',
                coolant: 'E/O',
                partNoPrefix: 'B0504500'
            }
        },
        technologies: {
            taptor: {
                description: 'Simultaneous drilling and threading in one step',
                benefits: ['eliminates pre-drilling', 'no tool change', 'higher cutting speeds'],
                holder: 'Speedsynchro Taptor'
            },
            punchDrill: {
                description: 'Double feed rate drilling with same axial force',
                timeSavings: '50%+',
                materials: ['Aluminum cast alloys', 'Magnesium cast alloys']
            },
            punchTap: {
                description: 'Helical thread forming - revolutionary short cycle',
                steps: ['Plunge', 'Thread form', 'Pull-out'],
                timeSavings: '75%',
                pathReduction: '15x shorter than conventional'
            }
        },
        drillSizes: {
            // Core hole diameters for metric threads (mm)
            M1: { coarse: 0.75, fine: null },
            M1_4: { coarse: 1.1, fine: null },
            M1_6: { coarse: 1.25, fine: null },
            M2: { coarse: 1.6, fine: null },
            M2_5: { coarse: 2.05, fine: null },
            M3: { coarse: 2.5, fine: null },
            M4: { coarse: 3.3, fine: null },
            M5: { coarse: 4.2, fine: null },
            M6: { coarse: 5.0, fine: null },
            M8: { coarse: 6.8, fine: 7.0 },
            M10: { coarse: 8.5, fine: 8.8 },
            M12: { coarse: 10.2, fine: 10.5 }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SGS / KYOCERA - SOLID CARBIDE END MILLS
    // ═══════════════════════════════════════════════════════════════════════════
    SGS: {
        zCarb: {
            XPR: {
                description: 'Plunge/Ramp/Rough End Mills',
                flutes: 4,
                features: ['variable geometry', 'corner radius options'],
                series: {
                    ZR: { cornerRadius: false, unit: 'inch' },
                    ZRCR: { cornerRadius: true, unit: 'inch' },
                    ZRM: { cornerRadius: false, unit: 'metric' },
                    ZRMCR: { cornerRadius: true, unit: 'metric' }
                }
            },
            AP: {
                description: 'Variable Pitch/Helix End Mills',
                flutes: 4,
                features: ['unequal spacing', 'variable helix', 'reduced vibration'],
                series: {
                    Z1P: { cornerRadius: false, ballNose: false },
                    Z1PCR: { cornerRadius: true, ballNose: false },
                    Z1PB: { cornerRadius: false, ballNose: true },
                    Z1PLC: { cornerRadius: true, longReach: true },
                    Z1PLB: { ballNose: true, longReach: true }
                }
            },
            HTA: {
                description: 'High-Temp Alloy End Mills',
                flutes: 4,
                materials: ['Inconel', 'Waspaloy', 'Titanium'],
                series: {
                    ZH1CR: { unit: 'inch' },
                    ZH1MCR: { unit: 'metric' },
                    ZH1MCRS: { unit: 'metric', stubLength: true }
                }
            },
            MD: {
                description: 'Hard Material Long Reach End Mills',
                flutes: 4,
                materials: ['Hardened Steel', 'Die Steel'],
                series: {
                    ZD1CR: { unit: 'inch' },
                    ZD1MCR: { unit: 'metric' }
                }
            },
            HPR: {
                description: '5-Flute High Performance Roughing',
                flutes: 5,
                series: {
                    Z5: { cornerRadius: false, longReach: false },
                    Z5CR: { cornerRadius: true, longReach: false },
                    Z5L: { cornerRadius: false, longReach: true },
                    Z5LCR: { cornerRadius: true, longReach: true },
                    Z5MCR: { unit: 'metric', cornerRadius: true },
                    Z5MLCR: { unit: 'metric', cornerRadius: true, longReach: true }
                }
            }
        },
        vCarb: {
            description: '5-Flute Finishing/Semi-Finishing',
            flutes: 5,
            series: {
                55: { type: 'square', unit: 'inch' },
                '55CR': { type: 'corner radius', unit: 'inch' },
                '55B': { type: 'ball nose', unit: 'inch' },
                '55M': { type: 'square', unit: 'metric' },
                '55MCR': { type: 'corner radius', unit: 'metric' },
                '55MB': { type: 'ball nose', unit: 'metric' }
            }
        },
        tCarb: {
            description: '6-Flute High Speed Machining',
            flutes: 6,
            series: {
                51: { type: 'square', unit: 'inch' },
                '51CR': { type: 'corner radius', unit: 'inch' },
                '51L': { type: 'square', longReach: true, unit: 'inch' },
                '51LC': { type: 'corner radius', longReach: true, unit: 'inch' },
                '51B': { type: 'ball nose', unit: 'inch' },
                '51LB': { type: 'ball nose', longReach: true, unit: 'inch' }
            }
        },
        hCarb: {
            description: '7-Flute High Performance',
            flutes: 7,
            series: {
                77: { type: 'square', unit: 'inch' },
                '77CR': { type: 'corner radius', unit: 'inch' },
                '77M': { type: 'square', unit: 'metric' },
                '77MCR': { type: 'corner radius', unit: 'metric' }
            }
        },
        multiCarb: {
            description: 'Multi-Flute Finishing',
            fluteOptions: [8, 10, 12],
            series: {
                66: { type: 'square', unit: 'inch' },
                '66CR': { type: 'corner radius', unit: 'inch' },
                '66M': { type: 'square', unit: 'metric' },
                '66MCR': { type: 'corner radius', unit: 'metric' },
                '67B': { type: 'segment circle', unit: 'metric' }
            }
        },
        coatings: {
            Ti25M: { type: 'TiAlN', color: 'Purple', materials: ['P', 'M', 'K', 'H'] },
            X36: { type: 'AlTiN', color: 'Black', materials: ['P', 'M', 'K', 'S', 'H'] },
            Z25M: { type: 'ZrN', color: 'Gold', materials: ['N'] },
            X77: { type: 'nACo', color: 'Blue-Gray', materials: ['S', 'H'] }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // MA FORD - TUFFCUT END MILLS
    // ═══════════════════════════════════════════════════════════════════════════
    MA_FORD: {
        tuffCut: {
            series135: {
                description: 'TuffCut AL - 2 Flute Aluminum End Mills',
                flutes: 2,
                helixAngle: 30,
                coatings: ['Uncoated', 'Zirconium'],
                chipLoads: '0.040"/tooth and above',
                sizes: [
                    { dia: 3.0, shank: 3.0, loc: 3.5, oal: 38, cornerR: 0.20, partNo: '13511810' },
                    { dia: 4.0, shank: 4.0, loc: 4.8, oal: 51, cornerR: 0.20, partNo: '13515750' },
                    { dia: 4.763, shank: 4.763, loc: 4.8, oal: 51, cornerR: 0.008, partNo: '13518750' },
                    { dia: 5.0, shank: 5.0, loc: 6.0, oal: 51, cornerR: 0.25, partNo: '13519680' },
                    { dia: 6.0, shank: 6.0, loc: 7.0, oal: 64, cornerR: 0.30, partNo: '13523620' },
                    { dia: 6.35, shank: 6.35, loc: 7.94, oal: 63.5, cornerR: 0.011, partNo: '13525000' },
                    { dia: 8.0, shank: 8.0, loc: 9.5, oal: 64, cornerR: 0.35, partNo: '13531500' },
                    { dia: 9.525, shank: 9.525, loc: 12.7, oal: 63.5, cornerR: 0.015, partNo: '13537500' },
                    { dia: 10.0, shank: 10.0, loc: 12.0, oal: 70, cornerR: 0.50, partNo: '13539370' },
                    { dia: 12.0, shank: 12.0, loc: 14.0, oal: 76, cornerR: 0.50, partNo: '13547240' },
                    { dia: 12.7, shank: 12.7, loc: 15.88, oal: 76.2, cornerR: 0.020, partNo: '13550000' },
                    { dia: 14.0, shank: 14.0, loc: 16.0, oal: 89, cornerR: 0.50, partNo: '13555120' },
                    { dia: 15.875, shank: 15.875, loc: 19.05, oal: 88.9, cornerR: 0.025, partNo: '13562500' },
                    { dia: 16.0, shank: 16.0, loc: 18.0, oal: 89, cornerR: 0.50, partNo: '13562990' }
                ]
            },
            xfoSeries: {
                description: 'XFO High Performance End Mills',
                cuttingData: {
                    speeds: {
                        P: {
                            lowCarbon: { semifinish: 1150, finish: 1480 },
                            mediumCarbon: { semifinish: 900, finish: 1130 },
                            alloySteel: { semifinish: 840, finish: 1030 },
                            dieToolSteel: { semifinish: 720, finish: 900 }
                        },
                        M: {
                            freeMachining: { semifinish: 540, finish: 670 },
                            austenitic: { semifinish: 430, finish: 520 },
                            difficultSS: { semifinish: 330, finish: 410 },
                            phSS: { semifinish: 430, finish: 520 }
                        },
                        S: {
                            cobaltChrome: { semifinish: 330, finish: 410 },
                            duplex22: { semifinish: 200, finish: 250 },
                            superDuplex25: { semifinish: 160, finish: 200 },
                            highTempAlloys: { semifinish: 100, finish: 150 },
                            titanium: { semifinish: 300, finish: 360 }
                        }
                    },
                    feeds: {
                        // Feed per tooth by diameter and material
                        '6mm': {
                            P: { semifinish: 0.0019, finish: 0.0012 },
                            M: { semifinish: 0.0019, finish: 0.0012 },
                            S: { semifinish: 0.0014, finish: 0.0009 }
                        },
                        '8mm': {
                            P: { semifinish: 0.0025, finish: 0.0016 },
                            M: { semifinish: 0.0025, finish: 0.0016 },
                            S: { semifinish: 0.0019, finish: 0.0013 }
                        },
                        '10mm': {
                            P: { semifinish: 0.0031, finish: 0.0020 },
                            M: { semifinish: 0.0031, finish: 0.0020 },
                            S: { semifinish: 0.0024, finish: 0.0016 }
                        },
                        '12mm': {
                            P: { semifinish: 0.0038, finish: 0.0024 },
                            M: { semifinish: 0.0038, finish: 0.0024 },
                            S: { semifinish: 0.0028, finish: 0.0019 }
                        }
                    }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // GUHRING - PRECISION DRILLS
    // ═══════════════════════════════════════════════════════════════════════════
    GUHRING: {
        microDrills: {
            series6488: {
                description: 'ExclusiveLine Micro-Precision Drills with Coolant Ducts',
                depthRatio: '3xD',
                pointAngle: 140,
                shankTolerance: 'm7',
                features: ['web thinning ≥1mm', 'facet point grind', 'concave main cutting edge'],
                materials: ['P', 'M', 'K', 'N'],
                coolant: true,
                sizes: [
                    { dia: 1.0, shank: 3.0, oal: 38, flute: 5.5, partNo: '6488 1.000' },
                    { dia: 1.05, shank: 3.0, oal: 38, flute: 5.8, partNo: '6488 1.050' },
                    { dia: 1.1, shank: 3.0, oal: 38, flute: 6.1, partNo: '6488 1.100' },
                    { dia: 1.2, shank: 3.0, oal: 38, flute: 6.6, partNo: '6488 1.200' },
                    { dia: 1.5, shank: 3.0, oal: 38, flute: 8.3, partNo: '6488 1.500' },
                    { dia: 1.6, shank: 3.0, oal: 38, flute: 8.8, partNo: '6488 1.600' },
                    { dia: 2.0, shank: 4.0, oal: 46, flute: 11.0, partNo: '6488 2.000' },
                    { dia: 2.5, shank: 4.0, oal: 50, flute: 13.8, partNo: '6488 2.500' },
                    { dia: 3.0, shank: 4.0, oal: 50, flute: 16.5, partNo: '6488 3.000' }
                ]
            },
            series6489: {
                description: 'ExclusiveLine Micro-Precision Drills 6xD with Coolant',
                depthRatio: '6xD',
                pointAngle: 140,
                shankTolerance: 'm7',
                features: ['web thinning ≥1mm', 'facet point grind', 'concave main cutting edge'],
                sizes: [
                    { dia: 1.0, shank: 3.0, oal: 48, flute: 9.0, partNo: '6489 1.000' },
                    { dia: 1.2, shank: 3.0, oal: 51, flute: 10.8, partNo: '6489 1.200' },
                    { dia: 1.5, shank: 4.0, oal: 56, flute: 13.5, partNo: '6489 1.500' },
                    { dia: 2.0, shank: 4.0, oal: 61, flute: 17.0, partNo: '6489 2.000' }
                ]
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // HAIMER - TOOL HOLDERS & END MILLS
    // ═══════════════════════════════════════════════════════════════════════════
    HAIMER: {
        millAluSeries: {
            F4003NN: {
                description: 'HAIMER MILL Alu Series - Chamfer End Mills',
                flutes: 3,
                helixAngle: [41.5, 42.5, 43.5],
                features: ['polished flute', 'center cutting', 'fine balanced'],
                coating: 'AC (for abrasive materials)',
                shankOptions: ['HA (straight DIN 6535-HA)', 'S- (Safe-Lock)', 'HB (Weldon DIN 6535-HB)'],
                sizes: [
                    { dia: 2.0, shank: 6, loc: 7, oal: 58, neck: 1.9, chamfer: 0.02, partNo: 'F4003NN*0200C' },
                    { dia: 3.0, shank: 6, loc: 8, oal: 58, neck: 2.9, chamfer: 0.03, partNo: 'F4003NN*0300C' },
                    { dia: 4.0, shank: 6, loc: 11, oal: 58, neck: 3.8, chamfer: 0.04, partNo: 'F4003NN*0400C' },
                    { dia: 5.0, shank: 6, loc: 13, oal: 58, neck: 4.8, chamfer: 0.05, partNo: 'F4003NN*0500C' },
                    { dia: 6.0, shank: 6, loc: 13, oal: 58, neck: 5.7, chamfer: 0.06, partNo: 'F4003NN*0600C' },
                    { dia: 8.0, shank: 8, loc: 19, oal: 64, neck: 7.6, chamfer: 0.08, partNo: 'F4003NN*0800C' },
                    { dia: 10.0, shank: 10, loc: 22, oal: 73, neck: 9.5, chamfer: 0.10, partNo: 'F4003NN*1000C' },
                    { dia: 12.0, shank: 12, loc: 26, oal: 84, neck: 11.4, chamfer: 0.12, partNo: 'F4003NN*1200C' },
                    { dia: 16.0, shank: 16, loc: 32, oal: 93, neck: 15.2, chamfer: 0.16, partNo: 'F4003NN*1600C' },
                    { dia: 20.0, shank: 20, loc: 41, oal: 105, neck: 19.0, chamfer: 0.20, partNo: 'F4003NN*2000C' }
                ],
                runout: '≤0.005mm'
            },
            powerSeries: {
                description: 'HAIMER MILL Power Series - Ball Nose',
                cuttingData: {
                    P1: { material: 'General construction steels', tensile: '800 N/mm²', hrc: '≤25', vcRough: [180, 220], vcFinish: [280, 320] },
                    P2: { material: 'Heat treated steels', tensile: '>800 N/mm²', hrc: '≤45', vcRough: [170, 190], vcFinish: [270, 290] },
                    M1: { material: 'Stainless steels', tensile: '650 N/mm²', vcRough: [110, 130], vcFinish: [170, 190] },
                    M2: { material: 'Difficult stainless', tensile: '>650 N/mm²', vcRough: [70, 90], vcFinish: [120, 140] },
                    K1: { material: 'Cast iron', vcRough: [150, 180], vcFinish: [220, 260] }
                }
            }
        },
        safeLock: {
            description: 'Safe-Lock Pull-Out Prevention System',
            features: ['prevents pullout during heavy cuts', 'enables higher feed rates'],
            driveGrooves: { pattern: 'helical', count: 4 },
            torqueIncrease: '300%',
            compatibleSeries: ['HAIMER MILL', 'HARVI', 'Partner tools']
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // KORLOY - TURNING INSERTS
    // ═══════════════════════════════════════════════════════════════════════════
    KORLOY: {
        chipBreakers: {
            VC: {
                description: 'Medium to Finishing Chip Breaker',
                application: 'High speed continuous machining',
                materials: ['Carbon steel', 'Alloy steel'],
                features: ['4 bumps on corner', 'excellent chip control', '3D chip breaker'],
                operations: ['external', 'internal', 'copy', 'facing'],
                apRange: [0.5, 3.0],
                fnRange: [0.1, 0.4]
            },
            VQ: {
                description: 'Sharp Cutting Performance',
                features: ['3D rake angle', 'improved surface finish', 'low cutting heat'],
                surfaceImprovement: '1.4x smoother',
                operations: ['finishing', 'copy machining']
            },
            LP: {
                description: 'Forged Steel / Auto Parts',
                features: ['quad dots', 'angle land', 'efficient chip control'],
                application: 'High feed machining',
                fnRange: [0.25, 0.40]
            },
            CP: {
                description: 'Heavy Interruption - Medium to Finishing',
                features: ['flat land', '2-stepped back angle', 'side rake angle', 'continuous bumps'],
                applications: ['interrupted roughing', 'deep cutting'],
                toolLifeIncrease: '25-57%',
                apRange: [0.5, 5.0],
                fnRange: [0.2, 0.5]
            },
            MP: {
                description: 'Medium Cutting - Forged Steel',
                features: ['front two-step dot', 'variable land', 'flat zone'],
                application: 'High feed at high depth of cut',
                apRange: [1.0, 5.0],
                fnRange: [0.2, 0.5]
            },
            HM: {
                description: 'Heavy Roughing',
                apRange: [2.0, 6.0],
                fnRange: [0.3, 0.6]
            }
        },
        grades: {
            NC3120: { type: 'CVD', materials: ['P', 'K'], application: 'General steel/cast iron' },
            NC3215: { type: 'CVD', materials: ['P'], application: 'Steel finishing' },
            NC3225: { type: 'CVD', materials: ['P', 'K'], application: 'Steel/cast iron medium' },
            PC5300: { type: 'PVD', materials: ['M'], application: 'Stainless steel' },
            PC9530: { type: 'PVD', materials: ['S'], application: 'Heat resistant alloys' },
            H01: { type: 'Cermet', materials: ['P'], application: 'Steel finishing' },
            KBN10M: { type: 'CBN', materials: ['H'], application: 'Hardened steel' }
        },
        insertGeometry: {
            CNMG: { shape: 'Rhombic 80°', ic: [9.525, 12.7, 15.875, 19.05] },
            DNMG: { shape: 'Rhombic 55°', ic: [9.525, 12.7, 15.875] },
            TNMG: { shape: 'Triangle 60°', ic: [11.0, 16.5, 22.0] },
            WNMG: { shape: 'Trigon 80°', ic: [6.35, 8.0, 9.525, 12.7] },
            SNMG: { shape: 'Square 90°', ic: [9.525, 12.7, 15.875, 19.05] },
            VNMG: { shape: 'Rhombic 35°', ic: [9.525, 12.7, 16.5] }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // INGERSOLL - INDEXABLE MILLING
    // ═══════════════════════════════════════════════════════════════════════════
    INGERSOLL: {
        series15J1E: {
            description: '0 Degree Lead End Mill',
            operations: ['shoulder', 'channel', 'ramping', 'corkscrew', 'facing'],
            coolant: true,
            cutters: [
                { partNo: '15J1E-0601584R01', dia: 0.625, ext: 1.50, oal: 3.50, shank: '0.750 Weldon', inserts: 1, ramp: 2.5 },
                { partNo: '15J1E-0701784R01', dia: 0.750, ext: 1.75, oal: 3.75, shank: '0.750 Weldon', inserts: 2, ramp: 2.5 },
                { partNo: '15J1E-0703084R01', dia: 0.750, ext: 3.00, oal: 5.00, shank: '0.750 Weldon', inserts: 2, ramp: 2.5 },
                { partNo: '15J1E-1001780R01', dia: 1.000, ext: 1.75, oal: 4.00, shank: '1.000 Weldon', inserts: 3, ramp: 1.5 },
                { partNo: '15J1E-1003580R01', dia: 1.000, ext: 3.50, oal: 5.75, shank: '1.000 Weldon', inserts: 2, ramp: 1.5 },
                { partNo: '15J1E-1201780R01', dia: 1.250, ext: 1.75, oal: 4.00, shank: '1.000 Weldon', inserts: 4, ramp: 1.0 }
            ]
        },
        series15X1W: {
            description: '0 Degree Lead High-Speed Router End Mill (Aluminum)',
            balance: 'G6.3 @ 20,000 RPM',
            operations: ['shoulder', 'channel', 'ramping', 'corkscrew', 'pocket'],
            coolant: true,
            cutters: [
                { partNo: '15X1W-07020S1R01', dia: 0.750, ext: 2.20, oal: 5.00, shank: '0.750 Cyl', inserts: 1, ramp: 4.6 },
                { partNo: '15X1W-10020S1R01', dia: 1.000, ext: 2.20, oal: 4.50, shank: '1.000 Cyl', inserts: 2, ramp: 9.6 },
                { partNo: '15X1W-12020S9R01', dia: 1.250, ext: 2.20, oal: 4.50, shank: '1.250 Cyl', inserts: 3, ramp: 12.0 },
                { partNo: '15X1W-15040S5R01', dia: 1.500, ext: 4.06, oal: 6.75, shank: '1.500 Cyl', inserts: 3, ramp: 8.5 }
            ]
        },
        inserts: {
            SDMT: {
                sizes: [
                    { partNo: 'SDMT080305N', width: 0.314, thickness: 0.137, cornerR: 0.020 },
                    { partNo: 'SDMT080308N', width: 0.314, thickness: 0.138, cornerR: 0.031 },
                    { partNo: 'SDMT080316N', width: 0.315, thickness: 0.138, cornerR: 0.062 }
                ],
                grades: {
                    IN1030: { materials: ['P'] },
                    IN1530: { materials: ['P', 'M'] },
                    IN2005: { materials: ['P', 'M', 'K'] },
                    IN2015: { materials: ['P', 'M', 'K'] },
                    IN2030: { materials: ['P', 'M', 'K', 'N'] },
                    IN2040: { materials: ['P', 'K'] },
                    IN30M: { materials: ['M'] }
                }
            },
            SDMW: {
                description: 'Heavy-Duty Inserts',
                sizes: [
                    { partNo: 'SDMW080305TN', width: 0.311, thickness: 0.133, cornerR: 0.020 },
                    { partNo: 'SDMW080305TN-W', width: 0.314, thickness: 0.137, cornerR: 0.020, type: 'Crowned wiper' },
                    { partNo: 'SDMW080308TN', width: 0.314, thickness: 0.138, cornerR: 0.031 }
                ]
            },
            XPET: {
                description: 'High-Speed Aluminum Inserts',
                sizes: [
                    { partNo: 'XPET140408FR-P', width: 0.751, thickness: 0.362, cornerR: 0.031 },
                    { partNo: 'XPET140408FR-PW', width: 0.751, thickness: 0.362, cornerR: 0.031, type: 'Wiper' },
                    { partNo: 'XPET140405FR-P', width: 0.751, thickness: 0.362, cornerR: 0.020 }
                ]
            }
        },
        hardware: {
            screws: { standard: 'SM30-065-00' },
            drivers: { torx: 'DS-T09W' }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    utilities: {
        /**
         * Get cutting parameters for material/tool combination
         */
        getCuttingParams: function(manufacturer, toolType, material, operation) {
            const data = this.parent[manufacturer];
            if (!data) return null;
            
            // Implementation varies by manufacturer
            return {
                manufacturer,
                toolType,
                material,
                operation,
                // Return appropriate cutting data
            };
        },

        /**
         * Find tools by diameter range
         */
        findToolsByDiameter: function(manufacturer, minDia, maxDia) {
            const results = [];
            const data = PRISM_CATALOG_BATCH7[manufacturer];
            
            if (!data) return results;
            
            // Search through all tool categories
            for (const category of Object.values(data)) {
                if (category.sizes && Array.isArray(category.sizes)) {
                    for (const tool of category.sizes) {
                        if (tool.dia >= minDia && tool.dia <= maxDia) {
                            results.push({ ...tool, manufacturer });
                        }
                    }
                }
            }
            
            return results;
        },

        /**
         * Get recommended insert grade for material
         */
        getInsertGrade: function(manufacturer, materialISO) {
            const data = PRISM_CATALOG_BATCH7[manufacturer];
            if (!data || !data.grades) return null;
            
            const compatible = [];
            for (const [grade, info] of Object.entries(data.grades)) {
                if (info.materials && info.materials.includes(materialISO)) {
                    compatible.push({ grade, ...info });
                }
            }
            
            return compatible;
        }
    }
}