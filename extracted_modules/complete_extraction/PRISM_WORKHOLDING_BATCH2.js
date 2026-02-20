const PRISM_WORKHOLDING_BATCH2 = {
    version: '1.0.0',
    generatedDate: '2026-01-14',

    manufacturers: {
        '5thAxis': FIFTH_AXIS_DATABASE,
        'Bison': BISON_DATABASE,
        'Kitagawa': KITAGAWA_DATABASE,
        'Mate': MATE_MITEEBITE_DATABASE,
        'Royal': ROYAL_PRODUCTS_DATABASE
    },
    statistics: {
        totalManufacturers: 5,
        totalProducts: {
            '5thAxis': {
                vises: 4,
                rockLockSystems: 2,
                colletFixtures: 3,
                dovetails: 3,
                tombstones: 4,
                pyramids: 2,
                risers: 4,
                adapters: 3,
                pullStuds: 2,
                automationBases: 2
            },
            'Bison': {
                powerChucks: 45,  // across all types
                pneumaticChucks: 16,
                colletPowerChucks: 3,
                hydraulicCylinders: 4,
                adapterPlates: 2  // types
            },
            'Kitagawa': {
                powerChuckSeries: 5,
                jawTypes: 3,  // categories
                actuatorSeries: 2,
                gripperTypes: 2,
                rotaryTableTypes: 2
            },
            'Mate': {
                dynoGripVises: 8,
                dynoLockBases: 8,
                tombstones: 2,  // types
                dualRightAngles: 1,
                pyramids: 1,
                risers: 4,
                erColletChucks: 2
            },
            'Royal': {
                colletSystems: 7,
                colletChucks: 3,  // categories
                liveCenters: 5,  // types
                deadCenters: 1,
                expandingMandrels: 1,
                rotaryProducts: 2,
                accessories: 4  // categories
            }
        }
    },
    // Quick-Change System Compatibility Matrix
    quickChangeCompatibility: {
        '52mm': {
            manufacturers: ['Lang Technik', 'Jergens', '5th Axis', 'Mate/Mitee-Bite', 'Gerardi'],
            pullStudSpacing: 52,
            pullStudThread: 'M16',
            typicalHoldingForce: [19, 26],  // kN range
            repeatability: [0.005, 0.015]  // mm range
        },
        '96mm': {
            manufacturers: ['Lang Technik', 'Jergens', '5th Axis', 'Mate/Mitee-Bite'],
            pullStudSpacing: 96,
            pullStudThread: 'M20',
            typicalHoldingForce: [26, 35],  // kN range
            repeatability: [0.005, 0.015]  // mm range
        }
    },
    // Power Chuck Compatibility Matrix
    powerChuckCompatibility: {
        'Kitagawa B-200': {
            compatible: ['Bison 2405-K', 'Bison 2105-K', 'Bison 2605-K'],
            serration: ['1.5x60°', '3x60°'],
            jawInterchange: true
        }
    }
}