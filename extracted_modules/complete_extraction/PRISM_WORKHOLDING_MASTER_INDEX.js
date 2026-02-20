const PRISM_WORKHOLDING_MASTER_INDEX = {
    version: '2.0.0',
    generatedDate: '2026-01-14',
    buildTarget: 'v8.61.026',

    // MANUFACTURER SUMMARY

    manufacturers: {

        // BATCH 1 - Previously Completed

        'Kurt': {
            batch: 1,
            country: 'USA',
            location: 'Minneapolis, MN',
            website: 'www.kurtworkholding.com',
            specialty: 'Precision vises',
            founded: 1946,

            productLines: {
                'AngLock': { count: 8, type: 'precision vise', feature: 'anti-lift jaw design' },
                'MaxLock': { count: 4, type: 'high-force vise', clampingForce: '6,800 lbs' },
                'PF': { count: 4, type: 'production vise', feature: 'quick-change jaws' },
                'HD': { count: 5, type: 'heavy-duty vise', feature: 'large capacity' },
                'CrossOver': { count: 4, type: 'multi-axis vise', feature: '5-axis compatible' }
            },
            totalProducts: 25,
            keyFeatures: ['Precision ground', 'Made in USA', 'Industry standard']
        },
        'SCHUNK': {
            batch: 1,
            country: 'Germany',
            location: 'Lauffen am Neckar',
            website: 'www.schunk.com',
            specialty: 'Clamping technology and gripping systems',
            founded: 1945,

            productLines: {
                'VERO-S': { count: 15, type: 'quick-change pallet system', repeatability: '0.005mm' },
                'TANDEM': { count: 10, type: 'centric clamping vise', feature: 'floating jaw' },
                'KONTEC': { count: 8, type: 'clamping force blocks' },
                'ROTA': { count: 7, type: 'lathe chuck' },
                'TENDO': { count: 8, type: 'hydraulic toolholder', runout: '0.003mm' },
                'TRIBOS': { count: 7, type: 'polygonal clamping', runout: '0.003mm' }
            },
            totalProducts: 55,
            keyFeatures: ['German precision', 'Automation-ready', 'Industry 4.0']
        },
        'Jergens': {
            batch: 1,
            country: 'USA',
            location: 'Cleveland, OH',
            website: 'www.jergensinc.com',
            specialty: 'Fixture components and quick-change',
            founded: 1942,

            productLines: {
                'Ball Lock': { count: 20, type: 'quick-change mounting', feature: '±0.0005" repeatability' },
                'ZPS': { count: 15, type: 'zero-point system', spacing: ['52mm', '96mm'] },
                'Fixture-Pro': { count: 20, type: 'modular fixturing' },
                'Power Clamping': { count: 10, type: 'hydraulic/pneumatic clamps' },
                'Toggle Clamps': { count: 8, type: 'manual clamps' }
            },
            totalProducts: 73,
            keyFeatures: ['Ball Lock patent', 'Modular system', 'Made in USA']
        },
        'Lang Technik': {
            batch: 1,
            country: 'Germany',
            location: 'Holzmaden',
            website: 'www.lang-technik.de',
            specialty: 'Quick-change and clamping technology',
            founded: 1972,

            productLines: {
                'Quick-Point': { count: 15, type: 'zero-point clamping', spacing: ['52mm', '96mm'] },
                'Makro-Grip': { count: 12, type: 'stamping vise', feature: 'self-centering' },
                'RoboTrex': { count: 10, type: 'automation system', feature: 'robot-ready' },
                'HAUBEX': { count: 8, type: 'clean-room workholding' }
            },
            totalProducts: 45,
            keyFeatures: ['Quick-Point originator', '52/96mm standards', 'Automation focus']
        },
        // BATCH 2 - This Session

        '5thAxis': {
            batch: 2,
            country: 'USA',
            website: 'www.5thaxis.com',
            specialty: 'Quick-change workholding for 5-axis',

            productLines: {
                'RockLock 52': { count: 15, type: 'quick-change system', spacing: '52mm' },
                'RockLock 96': { count: 12, type: 'quick-change system', spacing: '96mm' },
                'Self-Centering Vises': { count: 8, type: 'precision vise' },
                'Dovetail Fixtures': { count: 3, type: 'dovetail clamping' },
                'Tombstones': { count: 4, type: 'multi-sided fixture' },
                'Pyramids': { count: 2, type: '3-sided 5-axis fixture' },
                'Collet Fixtures': { count: 6, type: 'ER collet holders' }
            },
            totalProducts: 50,
            keyFeatures: ['5-axis focused', '52/96mm compatible', 'US manufacturing'],

            specifications: {
                repeatability: '±0.008mm (±0.0003")',
                accuracy: '±0.013mm (±0.0005")',
                pullStuds: ['PS16F (52mm)', 'PS20F (96mm)']
            }
        },
        'Bison': {
            batch: 2,
            country: 'Poland',
            headquarters: 'Białystok',
            usOffice: 'West Chester, OH',
            website: 'www.bison-chuck.com',
            specialty: 'Lathe chucks and workholding',
            founded: 1948,

            productLines: {
                '2405-K Power Chuck': { count: 9, type: '3-jaw power chuck', jaws: 3 },
                '2105-K Power Chuck': { count: 5, type: '2-jaw power chuck', jaws: 2 },
                '2605-K Power Chuck': { count: 5, type: '4-jaw power chuck', jaws: 4 },
                '2405-K ZW': { count: 4, type: 'large bore power chuck' },
                '2305 Quick Change': { count: 3, type: 'quick jaw change chuck' },
                '2500 Pneumatic': { count: 5, type: 'pneumatic OD chuck' },
                '2502 Pneumatic': { count: 11, type: 'pneumatic OD/ID chuck' },
                '1305-SDC Cylinder': { count: 4, type: 'hydraulic cylinder' }
            },
            totalProducts: 46,
            keyFeatures: ['Kitagawa B-200 compatible', '60 HRC hardened', 'G 6.3 balanced'],

            specifications: {
                sizeRange: '135-1000mm diameter',
                maxClampingForce: '200 kN',
                maxSpeed: '7000 rpm',
                compatibility: 'Kitagawa B-200 series'
            }
        },
        'Kitagawa': {
            batch: 2,
            country: 'Japan',
            website: 'www.kitagawa.com',
            specialty: 'Power chucks and precision workholding',

            productLines: {
                'B-200 Series': { count: 40, type: 'standard power chuck' },
                'BB-200 Series': { count: 10, type: 'large bore chuck' },
                'BH-200 Series': { count: 8, type: 'high-speed chuck' },
                'BF-200 Series': { count: 6, type: 'flat body chuck' },
                'BS-200 Series': { count: 8, type: 'soft jaw chuck' },
                'Hydraulic Cylinders': { count: 15, type: 'actuator' },
                'Grippers': { count: 10, type: 'automation gripper' },
                'Rotary Tables': { count: 5, type: 'NC rotary' }
            },
            totalProducts: 102,
            keyFeatures: ['Industry standard B-200', 'High precision', 'Wide range'],

            specifications: {
                catalogStats: {
                    chuckReferences: 392,
                    jawReferences: 485,
                    cylinderReferences: 77,
                    uniquePartNumbers: 727
                }
            }
        },
        'Mate': {
            batch: 2,
            country: 'USA',
            brandName: 'Mitee-Bite',
            website: 'www.mfrench.com',
            specialty: 'Precision workholding and quick-change',

            productLines: {
                'DynoGrip 52 Vises': { count: 4, type: 'self-centering vise', system: '52mm' },
                'DynoGrip 96 Vises': { count: 4, type: 'self-centering vise', system: '96mm' },
                'DynoLock 52 Bases': { count: 4, type: 'quick-change base', system: '52mm' },
                'DynoLock 96 Bases': { count: 4, type: 'quick-change base', system: '96mm' },
                'DynoMount Tombstones': { count: 4, type: 'multi-sided fixture' },
                'DynoMount Pyramids': { count: 2, type: '3-sided fixture' },
                'ER Collet Chucks': { count: 4, type: 'collet fixture' }
            },
            totalProducts: 26,
            keyFeatures: ['DynoGrip self-centering', 'QuickSpecs QR', 'Made in USA'],

            specifications: {
                accuracy: '±0.015mm (±0.0006")',
                repeatability: '±0.010mm (0.0004")',
                holdingForce52: '22 kN',
                holdingForce96: '26 kN',
                compatibility: ['Lang 52/96', 'Jergens ZPS', '5th Axis', 'Gerardi']
            }
        },
        'Royal': {
            batch: 2,
            country: 'USA',
            website: 'www.royalprod.com',
            specialty: 'Collets, chucks, and precision accessories',

            productLines: {
                '5C Collet System': { count: 50, type: 'collet' },
                '16C Collet System': { count: 30, type: 'collet' },
                'ER Collet System': { count: 100, type: 'collet' },
                'Live Centers': { count: 40, type: 'live center' },
                'Dead Centers': { count: 15, type: 'dead center' },
                'Collet Chucks': { count: 25, type: 'chuck' },
                'Expanding Mandrels': { count: 20, type: 'mandrel' },
                'Spindle Speeders': { count: 8, type: 'speed increaser' }
            },
            totalProducts: 288,
            keyFeatures: ['5C specialist', 'Complete collet range', 'Made in USA'],

            specifications: {
                catalogStats: {
                    chuckReferences: 243,
                    colletReferences: 369,
                    totalPages: 196
                }
            }
        }
    },
    // QUICK-CHANGE SYSTEM COMPATIBILITY

    quickChangeCompatibility: {
        '52mm': {
            description: '52mm Four-Post Quick-Change System',
            pullStudSpacing: 52,  // mm
            pullStudThread: 'M16',

            manufacturers: [
                { name: 'Lang Technik', product: 'Quick-Point 52', original: true },
                { name: 'Jergens', product: 'ZPS 52', original: false },
                { name: '5th Axis', product: 'RockLock 52', original: false },
                { name: 'Mate/Mitee-Bite', product: 'DynoLock 52', original: false },
                { name: 'Gerardi', product: 'Zero Point 52', original: false }
            ],

            specifications: {
                typicalRepeatability: [0.005, 0.015],  // mm range
                typicalHoldingForce: [19, 26],  // kN range
                typicalAccuracy: 0.013  // mm
            }
        },
        '96mm': {
            description: '96mm Four-Post Quick-Change System',
            pullStudSpacing: 96,  // mm
            pullStudThread: 'M20',

            manufacturers: [
                { name: 'Lang Technik', product: 'Quick-Point 96', original: true },
                { name: 'Jergens', product: 'ZPS 96', original: false },
                { name: '5th Axis', product: 'RockLock 96', original: false },
                { name: 'Mate/Mitee-Bite', product: 'DynoLock 96', original: false }
            ],

            specifications: {
                typicalRepeatability: [0.005, 0.015],  // mm range
                typicalHoldingForce: [26, 35],  // kN range
                typicalAccuracy: 0.013  // mm
            }
        },
        'Ball Lock': {
            description: 'Jergens Ball Lock Quick-Change System',
            manufacturer: 'Jergens',
            patent: true,

            specifications: {
                repeatability: 0.0127,  // mm (0.0005")
                pullForce: 22.2,  // kN (5,000 lbs)
                shearForce: 88.9  // kN (20,000 lbs)
            }
        },
        'VERO-S': {
            description: 'SCHUNK VERO-S Quick-Change System',
            manufacturer: 'SCHUNK',

            specifications: {
                repeatability: 0.005,  // mm
                holdingForce: 35,  // kN
                automation: true
            }
        }
    },
    // POWER CHUCK COMPATIBILITY

    powerChuckCompatibility: {
        'Kitagawa B-200': {
            description: 'Industry standard power chuck interface',
            originator: 'Kitagawa',

            compatible: [
                { manufacturer: 'Bison', series: '2405-K', jaws: 3 },
                { manufacturer: 'Bison', series: '2105-K', jaws: 2 },
                { manufacturer: 'Bison', series: '2605-K', jaws: 4 },
                { manufacturer: 'Bison', series: '2405-K ZW', jaws: 3, feature: 'large bore' }
            ],

            serrationOptions: ['1.5x60°', '3x60°'],
            jawInterchange: true
        }
    },
    // COLLET SYSTEM COMPATIBILITY

    colletCompatibility: {
        '5C': {
            capacityInches: [0.0625, 1.0625],
            typicalRunout: 0.0005,  // inches
            manufacturers: ['Royal Products', 'Bison', 'Hardinge']
        },
        '16C': {
            capacityInches: [0.0625, 1.625],
            typicalRunout: 0.0005,
            manufacturers: ['Royal Products', 'Bison']
        },
        'ER': {
            types: ['ER8', 'ER11', 'ER16', 'ER20', 'ER25', 'ER32', 'ER40', 'ER50'],
            typicalRunout: 0.010,  // mm
            manufacturers: ['All major manufacturers'],
            standard: 'DIN 6499 / ISO 15488'
        }
    },
    // STATISTICS

    statistics: {
        totalManufacturers: 9,
        batch1Manufacturers: 4,
        batch2Manufacturers: 5,

        productCounts: {
            batch1: {
                Kurt: 25,
                SCHUNK: 55,
                Jergens: 73,
                LangTechnik: 45,
                subtotal: 198
            },
            batch2: {
                '5thAxis': 50,
                Bison: 46,
                Kitagawa: 102,
                Mate: 26,
                Royal: 288,
                subtotal: 512
            },
            total: 710
        },
        byCategory: {
            vises: 75,
            powerChucks: 150,
            quickChangeSystems: 80,
            collets: 250,
            liveCenters: 60,
            tombstones: 20,
            grippers: 25,
            rotaryTables: 15,
            cylinders: 35
        },
        catalogPagesProcessed: {
            batch1: 400,  // approximate
            batch2: 768,
            total: 1168
        }
    },
    // SELECTION GUIDE

    selectionGuide: {

        byApplication: {
            '5-axis VMC': {
                recommended: ['5th Axis RockLock', 'Lang Quick-Point', 'Mate DynoLock'],
                vises: ['5th Axis Self-Centering', 'Mate DynoGrip', 'Kurt CrossOver'],
                features: ['Low profile', 'Multi-sided access', 'Quick-change']
            },
            'HMC Tombstone': {
                recommended: ['5th Axis Tombstones', 'Mate DynoMount', 'Jergens Ball Lock'],
                features: ['3/4 sided', 'Multiple positions', 'Automation-ready']
            }
        }
    }
}