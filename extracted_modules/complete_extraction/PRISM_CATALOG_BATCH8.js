const PRISM_CATALOG_BATCH8 = {
    version: '8.0.0',
    created: '2026-01-17',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ACCUPRO - THREADING TOOLS
    // ═══════════════════════════════════════════════════════════════════════════
    ACCUPRO: {
        threadFormingTaps: {
            description: 'PM HSS Surface Treated Thread Forming Taps',
            features: [
                'Forms threads by displacement (no chips)',
                'Superior strength and tighter tolerances',
                'Reduced neck for coolant flow',
                'Larger tap holes required'
            ],
            coatings: {
                TiN: {
                    description: 'Titanium Nitride',
                    benefits: ['Increased tool life', 'Improved lubricity', 'Higher tapping speeds'],
                    materials: ['Free machining steels', 'Irons', 'High tensile steels', 'Plastics']
                },
                TiCN: {
                    description: 'Titanium Carbonitride',
                    benefits: ['Increased tool life', 'Improved lubricity', 'Best at higher speeds'],
                    materials: ['Tough machining steels', 'Ductile cast iron', 'Cast aluminum', 
                               'Stainless steel', 'High-temp alloys', 'Copper alloys', 'Titanium']
                }
            },
            machineScrew: {
                TiN: {
                    plug: [
                        { size: '#6-32', limit: 'H5', oal: 2.0, partNo: 'AU62490081', price: 27.42 },
                        { size: '#8-32', limit: 'H5', oal: 2.125, partNo: 'AU62490099', price: 29.53 },
                        { size: '#10-24', limit: 'H5', oal: 2.375, partNo: 'AU62490107', price: 29.53 },
                        { size: '#10-32', limit: 'H5', oal: 2.375, partNo: 'AU62490115', price: 29.53 },
                        { size: '1/4-20', limit: 'H5', oal: 2.5, partNo: 'AU62490123', price: 29.53 },
                        { size: '1/4-28', limit: 'H5', oal: 2.5, partNo: 'AU62490131', price: 33.75 },
                        { size: '5/16-18', limit: 'H5', oal: 2.719, partNo: 'AU62490149', price: 39.56 },
                        { size: '3/8-16', limit: 'H5', oal: 2.938, partNo: 'AU62490156', price: 54.86 },
                        { size: '3/8-24', limit: 'H5', oal: 2.938, partNo: 'AU62490164', price: 54.86 }
                    ],
                    bottoming: [
                        { size: '#6-32', limit: 'H5', oal: 2.0, partNo: 'AU62489638', price: 27.42 },
                        { size: '#8-32', limit: 'H5', oal: 2.125, partNo: 'AU62489646', price: 29.53 },
                        { size: '#10-24', limit: 'H5', oal: 2.375, partNo: 'AU62489653', price: 29.53 },
                        { size: '#10-32', limit: 'H5', oal: 2.375, partNo: 'AU62489661', price: 29.53 },
                        { size: '1/4-20', limit: 'H5', oal: 2.5, partNo: 'AU62489679', price: 29.53 },
                        { size: '1/4-28', limit: 'H5', oal: 2.5, partNo: 'AU62489687', price: 29.53 },
                        { size: '5/16-18', limit: 'H5', oal: 2.719, partNo: 'AU62489695', price: 33.75 },
                        { size: '5/16-24', limit: 'H5', oal: 2.719, partNo: 'AU62489703', price: 33.75 },
                        { size: '3/8-16', limit: 'H5', oal: 2.938, partNo: 'AU62489711', price: 39.56 },
                        { size: '3/8-24', limit: 'H5', oal: 2.938, partNo: 'AU62489729', price: 39.56 },
                        { size: '1/2-13', limit: 'H5', oal: 3.375, partNo: 'AU62489588', price: 54.86 },
                        { size: '1/2-20', limit: 'H5', oal: 3.375, partNo: 'AU62489737', price: 54.86 },
                        { size: '5/8-18', limit: 'H7', oal: 3.594, partNo: 'AU62489745', price: 72.99 }
                    ]
                },
                TiCN: {
                    plug: [
                        { size: '#6-32', limit: 'H5', partNo: 'AU62490222', price: 31.64 },
                        { size: '#8-32', limit: 'H5', partNo: 'AU62490230', price: 33.75 },
                        { size: '#10-24', limit: 'H5', partNo: 'AU62490248', price: 33.75 },
                        { size: '#10-32', limit: 'H5', partNo: 'AU62490255', price: 34.28 },
                        { size: '1/4-20', limit: 'H5', partNo: 'AU62490263', price: 39.03 },
                        { size: '5/16-18', limit: 'H5', partNo: 'AU62490271', price: 45.36 },
                        { size: '3/8-16', limit: 'H5', partNo: 'AU62490289', price: 63.30 }
                    ],
                    bottoming: [
                        { size: '#6-32', limit: 'H5', partNo: 'AU62489810', price: 31.64 },
                        { size: '#8-32', limit: 'H5', partNo: 'AU62489828', price: 33.75 },
                        { size: '#10-24', limit: 'H5', partNo: 'AU62489836', price: 33.75 },
                        { size: '#10-32', limit: 'H5', partNo: 'AU62489844', price: 34.28 },
                        { size: '1/4-20', limit: 'H5', partNo: 'AU62489851', price: 39.03 },
                        { size: '5/16-18', limit: 'H5', partNo: 'AU62489869', price: 45.36 },
                        { size: '3/8-16', limit: 'H5', partNo: 'AU62489596', price: 63.30 }
                    ]
                }
            },
            metric: {
                TiN: {
                    plug: [
                        { size: 'M3x0.5', limit: 'D5', oal: 1.938, partNo: 'AU62490180', price: 29.53 },
                        { size: 'M4x0.7', limit: 'D6', oal: 2.125, partNo: 'AU62490198', price: 29.53 },
                        { size: 'M5x0.8', limit: 'D7', oal: 2.375, partNo: 'AU62490206', price: 30.59 },
                        { size: 'M6x1.0', limit: 'D8', oal: 2.5, partNo: 'AU62490214', price: 30.59 },
                        { size: 'M8x1.25', limit: 'D9', oal: 2.719, partNo: 'AU62490057', price: 36.92 },
                        { size: 'M10x1.5', limit: 'D10', oal: 2.938, partNo: 'AU62490065', price: 44.30 },
                        { size: 'M12x1.75', limit: 'D11', oal: 3.375, partNo: 'AU62490073', price: 54.86 }
                    ],
                    bottoming: [
                        { size: 'M3x0.5', limit: 'D5', oal: 1.938, partNo: 'AU62489778', price: 29.53 },
                        { size: 'M4x0.7', limit: 'D6', oal: 2.125, partNo: 'AU62489786', price: 29.53 },
                        { size: 'M5x0.8', limit: 'D7', oal: 2.375, partNo: 'AU62489794', price: 30.59 },
                        { size: 'M6x1.0', limit: 'D8', oal: 2.5, partNo: 'AU62489802', price: 30.59 },
                        { size: 'M8x1.25', limit: 'D9', oal: 2.719, partNo: 'AU62489604', price: 36.92 },
                        { size: 'M10x1.5', limit: 'D10', oal: 2.938, partNo: 'AU62489612', price: 44.30 },
                        { size: 'M12x1.75', limit: 'D11', oal: 3.375, partNo: 'AU62489620', price: 54.86 }
                    ]
                },
                TiCN: {
                    plug: [
                        { size: 'M3x0.5', limit: 'D5', partNo: 'AU62490297', price: 33.75 },
                        { size: 'M4x0.7', limit: 'D6', partNo: 'AU62490305', price: 33.75 },
                        { size: 'M5x0.8', limit: 'D7', partNo: 'AU62490313', price: 34.81 },
                        { size: 'M6x1.0', limit: 'D8', partNo: 'AU62490321', price: 34.81 },
                        { size: 'M8x1.25', limit: 'D9', partNo: 'AU62490339', price: 42.20 }
                    ],
                    bottoming: [
                        { size: 'M3x0.5', limit: 'D5', partNo: 'AU62489877', price: 33.75 },
                        { size: 'M4x0.7', limit: 'D6', partNo: 'AU62489885', price: 33.75 },
                        { size: 'M5x0.8', limit: 'D7', partNo: 'AU62489893', price: 34.81 },
                        { size: 'M6x1.0', limit: 'D8', partNo: 'AU62489901', price: 34.81 },
                        { size: 'M8x1.25', limit: 'D9', partNo: 'AU62489919', price: 42.20 }
                    ]
                }
            },
            chamferTypes: {
                plug: { threads: '3-5', description: 'Standard through hole' },
                bottoming: { threads: '2-3', description: 'Near-bottom blind hole' }
            }
        },
        threadMills: {
            description: 'Solid Carbide TiAlN Coated Thread Mills - Helical Flute',
            coating: 'TiAlN',
            coatingNotes: [
                'For high temperature and abrasive conditions',
                'Use in stainless steel, high alloy carbon steels, nickel-based alloys, titanium',
                'Not for aluminum',
                'Requires 75-100% increase in machine speeds'
            ],
            features: [
                'Eliminate secondary threading operations',
                'Reduced neck produces superior finishes and thread quality',
                'Full thread forms to within one pitch of shoulder',
                'Cuts right or left hand threads',
                'Cuts large diameter threads with low HP machines',
                'Solid micrograin carbide'
            ],
            shankTolerance: '+0.0000/-0.0005"',
            metricShankTolerance: '+0.000/-0.013mm',
            sizes: [
                { thread: '#4-40', shank: 0.125, partNo: 'TMxxxx' },
                { thread: '#4-40', shank: 0.250, partNo: 'TMxxxx' },
                { thread: '#6-32', shank: 0.125, partNo: 'TMxxxx' },
                { thread: '#6-32', shank: 0.250, partNo: 'TMxxxx' },
                { thread: '#8-32', shank: 0.125, partNo: 'TMxxxx' },
                { thread: '#8-32', shank: 0.250, partNo: 'TMxxxx' },
                { thread: '#10-24', shank: 0.1875, partNo: 'TMxxxx' },
                { thread: '#10-24', shank: 0.250, partNo: 'TMxxxx' },
                { thread: '1/4-20', shank: 0.1875, partNo: 'TMxxxx' },
                { thread: '1/4-20', shank: 0.250, partNo: 'TMxxxx' },
                { thread: '1/4-28', shank: 0.1875, partNo: 'TMxxxx' },
                { thread: '1/4-28', shank: 0.250, partNo: 'TMxxxx' },
                { thread: '5/16-18', shank: 0.250, partNo: 'TMxxxx' },
                { thread: '5/16-24', shank: 0.250, partNo: 'TMxxxx' },
                { thread: '3/8-16', shank: 0.3125, partNo: 'TMxxxx' },
                { thread: '3/8-24', shank: 0.3125, partNo: 'TMxxxx' },
                { thread: '7/16-14', shank: 0.3125, partNo: 'TMxxxx' },
                { thread: '7/16-20', shank: 0.3125, partNo: 'TMxxxx' },
                { thread: '1/2-13', shank: 0.3125, partNo: 'TMxxxx' },
                { thread: '9/16-12', shank: 0.3125, partNo: 'TMxxxx' },
                { thread: '9/16-18', shank: 0.3125, partNo: 'TMxxxx' }
            ]
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // TUNGALOY/SANDVIK - INDEXABLE DRILLS
    // ═══════════════════════════════════════════════════════════════════════════
    TUNGALOY: {
        tungDrill: {
            description: 'TungDrill Twisted and TungSix-Drill Indexable Drills',
            depthRatios: ['2xD', '3xD', '4xD', '5xD'],
            chamferingTools: {
                TDXCF: {
                    description: 'Chamfering Tool for TungDrill',
                    sizes: [
                        { partNo: 'TDXCF180L25', dc: 17.3, lf: 49, bd: 25 },
                        { partNo: 'TDXCF190L25', dc: 18.1, lf: 49, bd: 25 },
                        { partNo: 'TDXCF200L25', dc: 19.1, lf: 49, bd: 25 },
                        { partNo: 'TDXCF210L25', dc: 20.1, lf: 49, bd: 25 },
                        { partNo: 'TDXCF220L25', dc: 21.1, lf: 49, bd: 25 },
                        { partNo: 'TDXCF230L25', dc: 22.1, lf: 49, bd: 25 },
                        { partNo: 'TDXCF240L25', dc: 23.1, lf: 49, bd: 25 },
                        { partNo: 'TDXCF250L25', dc: 23.95, lf: 49, bd: 25 },
                        { partNo: 'TDXCF260L30', dc: 24.95, lf: 64, bd: 30 },
                        { partNo: 'TDXCF270L30', dc: 25.9, lf: 64, bd: 30 },
                        { partNo: 'TDXCF280L30', dc: 26.9, lf: 64, bd: 30 },
                        { partNo: 'TDXCF290L30', dc: 27.9, lf: 64, bd: 30 },
                        { partNo: 'TDXCF300L30', dc: 28.9, lf: 64, bd: 30 },
                        { partNo: 'TDXCF310L30', dc: 29.9, lf: 64, bd: 30 },
                        { partNo: 'TDXCF320L30', dc: 30.9, lf: 64, bd: 30 }
                    ]
                }
            },
            drillBodies: [
                { partNo: 'TDX175*25-*', dia: 17.5, depths: { '2xD': 13, '3xD': 30.5, '4xD': 48, '5xD': 65.5 } },
                { partNo: 'TDX180*25-*', dia: 18.0, depths: { '2xD': 14, '3xD': 32, '4xD': 50, '5xD': 68 } },
                { partNo: 'TDX185*25-*', dia: 18.5, depths: { '2xD': 15, '3xD': 33.5, '4xD': 52, '5xD': 70.5 } },
                { partNo: 'TDX190*25-*', dia: 19.0, depths: { '2xD': 16, '3xD': 35, '4xD': 54, '5xD': 73 } },
                { partNo: 'TDX195*25-*', dia: 19.5, depths: { '2xD': 17, '3xD': 36.5, '4xD': 56, '5xD': 75.5 } },
                { partNo: 'TDX200*25-*', dia: 20.0, depths: { '2xD': 20, '3xD': 40, '4xD': 59, '5xD': 79 } },
                { partNo: 'TDX205*25-*', dia: 20.5, depths: { '2xD': 21, '3xD': 41.5, '4xD': 61, '5xD': 81.5 } },
                { partNo: 'TDX210*25-*', dia: 21.0, depths: { '2xD': 22, '3xD': 43, '4xD': 63, '5xD': 84 } },
                { partNo: 'TDX215*25-*', dia: 21.5, depths: { '2xD': 23, '3xD': 44.5, '4xD': 65, '5xD': 86.5 } },
                { partNo: 'TDX220*25-*', dia: 22.0, depths: { '2xD': 24, '3xD': 46, '4xD': 67, '5xD': 89 } },
                { partNo: 'TDX225*25-*', dia: 22.5, depths: { '2xD': 25, '3xD': 47.5, '4xD': 69, '5xD': 91.5 } },
                { partNo: 'TDX230*25-*', dia: 23.0, depths: { '2xD': 26, '3xD': 49, '4xD': 71, '5xD': 94 } },
                { partNo: 'TDX235*25-*', dia: 23.5, depths: { '2xD': 27, '3xD': 50.5, '4xD': 73, '5xD': 96.5 } },
                { partNo: 'TDX240*25-*', dia: 24.0, depths: { '2xD': 28, '3xD': 52, '4xD': 75, '5xD': 99 } },
                { partNo: 'TDX245*25-*', dia: 24.5, depths: { '2xD': 29, '3xD': 53.5, '4xD': 77, '5xD': 101.5 } },
                { partNo: 'TDX250*25-*', dia: 25.0, depths: { '2xD': 30, '3xD': 55, '4xD': 79, '5xD': 104 } },
                { partNo: 'TDX255*25-*', dia: 25.5, depths: { '2xD': 26, '3xD': 51.5, '4xD': 76, '5xD': 101.5 } },
                { partNo: 'TDX260*25-*', dia: 26.0, depths: { '2xD': 27, '3xD': 53, '4xD': 78, '5xD': 104 } },
                { partNo: 'TDX270*32-*', dia: 27.0, depths: { '2xD': 29, '3xD': 56, '4xD': 82, '5xD': 109 } },
                { partNo: 'TDX280*32-*', dia: 28.0, depths: { '2xD': 30.3, '3xD': 58.3, '4xD': 86, '5xD': 114 } },
                { partNo: 'TDX290*32-*', dia: 29.0, depths: { '2xD': 32.3, '3xD': 61.3, '4xD': 90, '5xD': 119 } },
                { partNo: 'TDX300*32-*', dia: 30.0, depths: { '2xD': 34.3, '3xD': 64.3, '4xD': 94, '5xD': 124 } },
                { partNo: 'TDX310*32-*', dia: 31.0, depths: { '2xD': 36.3, '3xD': 67.3, '4xD': 98, '5xD': 129 } },
                { partNo: 'TDX320*32-*', dia: 32.0, depths: { '2xD': 38.3, '3xD': 70.3, '4xD': 102, '5xD': 134 } }
            ],
            spareParts: {
                screwInsert: 'CSPB-4S',
                screwRing_small: 'CM6X16',
                screwRing_large: 'CM8X1.25X20-A',
                wrenchInsert: 'IP-15D',
                wrenchRing_small: 'P-5',
                wrenchRing_large: 'P-6',
                torque: { 'CSPB-4S': 3.5 } // N·m
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CERATIZIT/METALMORPHOSIS - 7-FLUTE HEM CUTTING DATA
    // ═══════════════════════════════════════════════════════════════════════════
    CERATIZIT: {
        IPT7_IPC7: {
            description: '7-Flute High Efficiency Milling End Mills',
            flutes: 7,
            // Cutting data tables (inch)
            cuttingData: {
                lowCarbonSteels: {
                    material: 'Low Carbon Steels ≤35 HRC (1018, 1020, 12L14)',
                    iso: 'P',
                    operations: {
                        HEM_3xD: { axialDoc: '≤3xD', radialDoc: '0.1xD', speed: 400, feeds: { '3/16': 0.0027, '1/4': 0.0036, '3/8': 0.0053, '1/2': 0.0071, '5/8': 0.0089, '3/4': 0.0107, '1': 0.0142 } },
                        HEM_4xD: { axialDoc: '>3-4xD', radialDoc: '0.08xD', speed: 400, feeds: { '3/16': 0.0024, '1/4': 0.0032, '3/8': 0.0048, '1/2': 0.0064, '5/8': 0.0080, '3/4': 0.0096, '1': 0.0128 } },
                        HEM_5xD: { axialDoc: '>4-5xD', radialDoc: '0.08xD', speed: 390, feeds: { '3/16': 0.0022, '1/4': 0.0029, '3/8': 0.0043, '1/2': 0.0057, '5/8': 0.0071, '3/4': 0.0085, '1': 0.0114 } },
                        finish: { axialDoc: '3xD', radialDoc: '0.015xD', speed: 450, feeds: { '3/16': 0.0010, '1/4': 0.0013, '3/8': 0.0019, '1/2': 0.0025, '5/8': 0.0031, '3/4': 0.0038, '1': 0.0050 } }
                    }
                },
                stainlessSteel: {
                    material: 'Free Cutting Stainless Steels (303, 416)',
                    iso: 'M',
                    operations: {
                        HEM_3xD: { axialDoc: '≤3xD', radialDoc: '0.08xD', speed: 390, feeds: { '3/16': 0.0022, '1/4': 0.0029, '3/8': 0.0043, '1/2': 0.0058, '5/8': 0.0072, '3/4': 0.0086, '1': 0.0115 } },
                        HEM_4xD: { axialDoc: '>3-4xD', radialDoc: '0.08xD', speed: 390, feeds: { '3/16': 0.0020, '1/4': 0.0026, '3/8': 0.0039, '1/2': 0.0052, '5/8': 0.0065, '3/4': 0.0078, '1': 0.0104 } },
                        HEM_5xD: { axialDoc: '>4-5xD', radialDoc: '0.08xD', speed: 375, feeds: { '3/16': 0.0017, '1/4': 0.0023, '3/8': 0.0035, '1/2': 0.0046, '5/8': 0.0058, '3/4': 0.0069, '1': 0.0092 } },
                        finish: { axialDoc: '3xD', radialDoc: '0.015xD', speed: 350, feeds: { '3/16': 0.0008, '1/4': 0.0011, '3/8': 0.0016, '1/2': 0.0022, '5/8': 0.0027, '3/4': 0.0032, '1': 0.0043 } }
                    }
                },
                aluminum: {
                    material: 'Aluminum Alloys (2024, 6061, 7075)',
                    iso: 'N',
                    operations: {
                        HEM_3xD: { axialDoc: '≤3xD', radialDoc: '0.08xD', speed: 485, feeds: { '3/16': 0.0028, '1/4': 0.0038, '3/8': 0.0056, '1/2': 0.0075, '5/8': 0.0094, '3/4': 0.0113, '1': 0.0150 } },
                        HEM_4xD: { axialDoc: '>3-4xD', radialDoc: '0.08xD', speed: 485, feeds: { '3/16': 0.0025, '1/4': 0.0034, '3/8': 0.0051, '1/2': 0.0068, '5/8': 0.0084, '3/4': 0.0101, '1': 0.0135 } },
                        HEM_5xD: { axialDoc: '>4-5xD', radialDoc: '0.08xD', speed: 465, feeds: { '3/16': 0.0023, '1/4': 0.0030, '3/8': 0.0045, '1/2': 0.0060, '5/8': 0.0075, '3/4': 0.0090, '1': 0.0120 } },
                        finish: { axialDoc: '3xD', radialDoc: '0.015xD', speed: 420, feeds: { '3/16': 0.0011, '1/4': 0.0014, '3/8': 0.0021, '1/2': 0.0028, '5/8': 0.0035, '3/4': 0.0042, '1': 0.0056 } }
                    }
                },
                mediumCarbonSteels: {
                    material: 'Medium Carbon Steels ≤48 HRC (1045, 4140, 4340, 5140)',
                    iso: 'P',
                    operations: {
                        HEM_3xD: { axialDoc: '≤3xD', radialDoc: '0.08xD', speed: 450, feeds: { '3/16': 0.0027, '1/4': 0.0036, '3/8': 0.0053, '1/2': 0.0071, '5/8': 0.0089, '3/4': 0.0107, '1': 0.0142 } },
                        HEM_4xD: { axialDoc: '>3-4xD', radialDoc: '0.08xD', speed: 450, feeds: { '3/16': 0.0024, '1/4': 0.0032, '3/8': 0.0048, '1/2': 0.0064, '5/8': 0.0080, '3/4': 0.0096, '1': 0.0128 } },
                        HEM_5xD: { axialDoc: '>4-5xD', radialDoc: '0.08xD', speed: 425, feeds: { '3/16': 0.0021, '1/4': 0.0028, '3/8': 0.0043, '1/2': 0.0057, '5/8': 0.0071, '3/4': 0.0085, '1': 0.0114 } },
                        finish: { axialDoc: '3xD', radialDoc: '0.015xD', speed: 390, feeds: { '3/16': 0.0009, '1/4': 0.0013, '3/8': 0.0019, '1/2': 0.0025, '5/8': 0.0031, '3/4': 0.0038, '1': 0.0050 } }
                    }
                },
                toolDieSteels: {
                    material: 'Tool and Die Steels ≤48 HRC (A2, D2, O1, S7, P20, H13)',
                    iso: 'H',
                    operations: {
                        HEM_3xD: { axialDoc: '≤3xD', radialDoc: '0.08xD', speed: 420, feeds: { '3/16': 0.0024, '1/4': 0.0032, '3/8': 0.0048, '1/2': 0.0064, '5/8': 0.0080, '3/4': 0.0096, '1': 0.0128 } },
                        HEM_4xD: { axialDoc: '>3-4xD', radialDoc: '0.08xD', speed: 420, feeds: { '3/16': 0.0022, '1/4': 0.0029, '3/8': 0.0043, '1/2': 0.0058, '5/8': 0.0072, '3/4': 0.0086, '1': 0.0115 } },
                        HEM_5xD: { axialDoc: '>4-5xD', radialDoc: '0.08xD', speed: 395, feeds: { '3/16': 0.0019, '1/4': 0.0026, '3/8': 0.0038, '1/2': 0.0051, '5/8': 0.0064, '3/4': 0.0077, '1': 0.0102 } },
                        finish: { axialDoc: '3xD', radialDoc: '0.015xD', speed: 365, feeds: { '3/16': 0.0008, '1/4': 0.0011, '3/8': 0.0016, '1/2': 0.0021, '5/8': 0.0026, '3/4': 0.0032, '1': 0.0042 } }
                    }
                },
                martensiticFerritic: {
                    material: 'Martensitic & Ferritic Stainless Steels (410, 416, 440)',
                    iso: 'M',
                    operations: {
                        HEM_3xD: { axialDoc: '≤3xD', radialDoc: '0.08xD', speed: 450, feeds: { '3/16': 0.0028, '1/4': 0.0038, '3/8': 0.0056, '1/2': 0.0075, '5/8': 0.0094, '3/4': 0.0113, '1': 0.0150 } },
                        HEM_4xD: { axialDoc: '>3-4xD', radialDoc: '0.08xD', speed: 450, feeds: { '3/16': 0.0025, '1/4': 0.0034, '3/8': 0.0051, '1/2': 0.0068, '5/8': 0.0084, '3/4': 0.0101, '1': 0.0135 } },
                        HEM_5xD: { axialDoc: '>4-5xD', radialDoc: '0.08xD', speed: 425, feeds: { '3/16': 0.0023, '1/4': 0.0030, '3/8': 0.0045, '1/2': 0.0060, '5/8': 0.0075, '3/4': 0.0090, '1': 0.0120 } },
                        finish: { axialDoc: '3xD', radialDoc: '0.015xD', speed: 390, feeds: { '3/16': 0.0009, '1/4': 0.0013, '3/8': 0.0019, '1/2': 0.0025, '5/8': 0.0031, '3/4': 0.0038, '1': 0.0050 } }
                    }
                },
                austeniticStainless: {
                    material: 'Austenitic Stainless Steels, FeNi Alloys (303, 304, 316, Invar, Kovar)',
                    iso: 'M',
                    operations: {
                        HEM_3xD: { axialDoc: '≤3xD', radialDoc: '0.08xD', speed: 450, feeds: { '3/16': 0.0024, '1/4': 0.0032, '3/8': 0.0048, '1/2': 0.0064, '5/8': 0.0080, '3/4': 0.0096, '1': 0.0128 } },
                        HEM_4xD: { axialDoc: '>3-4xD', radialDoc: '0.08xD', speed: 440, feeds: { '3/16': 0.0022, '1/4': 0.0029, '3/8': 0.0043, '1/2': 0.0058, '5/8': 0.0072, '3/4': 0.0086, '1': 0.0115 } },
                        HEM_5xD: { axialDoc: '>4-5xD', radialDoc: '0.07xD', speed: 425, feeds: { '3/16': 0.0019, '1/4': 0.0026, '3/8': 0.0038, '1/2': 0.0051, '5/8': 0.0064, '3/4': 0.0077, '1': 0.0102 } },
                        finish: { axialDoc: '3xD', radialDoc: '0.015xD', speed: 390, feeds: { '3/16': 0.0009, '1/4': 0.0012, '3/8': 0.0018, '1/2': 0.0024, '5/8': 0.0030, '3/4': 0.0036, '1': 0.0048 } }
                    }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ISO MATERIAL CLASSIFICATION CROSS-REFERENCE
    // ═══════════════════════════════════════════════════════════════════════════
    ISO_MATERIALS: {
        P: {
            name: 'Steel',
            color: 'Blue',
            subgroups: {
                P01: { desc: 'Low carbon steel', examples: ['1018', '1020', '12L14'], hardness: '<200 HB' },
                P10: { desc: 'Carbon steel', examples: ['1045', '1050', '1055'], hardness: '180-220 HB' },
                P20: { desc: 'Alloy steel', examples: ['4140', '4340', '8620'], hardness: '200-280 HB' },
                P30: { desc: 'High strength steel', examples: ['4340HT', '300M'], hardness: '280-350 HB' },
                P40: { desc: 'Tool steel unhardened', examples: ['A2', 'D2', 'O1', 'S7', 'H13'], hardness: '200-280 HB' }
            }
        },
        M: {
            name: 'Stainless Steel',
            color: 'Yellow',
            subgroups: {
                M10: { desc: 'Austenitic', examples: ['304', '316', '321'], hardness: '150-200 HB' },
                M20: { desc: 'Ferritic/Martensitic', examples: ['410', '416', '440'], hardness: '150-280 HB' },
                M30: { desc: 'Duplex', examples: ['2205', '2507'], hardness: '260-320 HB' },
                M40: { desc: 'PH Stainless', examples: ['17-4PH', '15-5PH'], hardness: '300-380 HB' }
            }
        },
        K: {
            name: 'Cast Iron',
            color: 'Red',
            subgroups: {
                K10: { desc: 'Gray cast iron', examples: ['Class 30', 'Class 40'], hardness: '150-220 HB' },
                K20: { desc: 'Ductile/Nodular', examples: ['60-40-18', '80-55-06'], hardness: '170-280 HB' },
                K30: { desc: 'Malleable', examples: ['M3210', 'M5003'], hardness: '150-250 HB' },
                K40: { desc: 'Compacted graphite', examples: ['CGI 350', 'CGI 450'], hardness: '180-280 HB' }
            }
        },
        N: {
            name: 'Non-Ferrous',
            color: 'Green',
            subgroups: {
                N10: { desc: 'Aluminum wrought', examples: ['2024', '6061', '7075'], hardness: '50-150 HB' },
                N20: { desc: 'Aluminum cast', examples: ['A356', 'A380'], hardness: '60-120 HB' },
                N30: { desc: 'Copper alloys', examples: ['C360', 'C544'], hardness: '80-200 HB' },
                N40: { desc: 'Magnesium', examples: ['AZ31B', 'AZ91D'], hardness: '50-90 HB' }
            }
        },
        S: {
            name: 'Heat Resistant Alloys',
            color: 'Orange',
            subgroups: {
                S10: { desc: 'Nickel based', examples: ['Inconel 718', 'Waspaloy'], hardness: '280-400 HB' },
                S20: { desc: 'Cobalt based', examples: ['Stellite 6', 'L-605'], hardness: '300-400 HB' },
                S30: { desc: 'Titanium', examples: ['Ti-6Al-4V', 'Ti-5553'], hardness: '300-380 HB' },
                S40: { desc: 'Iron based superalloy', examples: ['A-286', 'Incoloy 901'], hardness: '280-350 HB' }
            }
        },
        H: {
            name: 'Hardened Steel',
            color: 'Gray',
            subgroups: {
                H10: { desc: 'Hardened steel 45-55 HRC', examples: ['4140HT', 'D2 HT'], hardness: '45-55 HRC' },
                H20: { desc: 'Hardened steel 55-62 HRC', examples: ['S7 HT', 'A2 HT'], hardness: '55-62 HRC' },
                H30: { desc: 'Hard chrome/chilled iron', examples: ['Chilled rolls'], hardness: '50-65 HRC' }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // INSERT GRADE CROSS-REFERENCE
    // ═══════════════════════════════════════════════════════════════════════════
    GRADE_CROSS_REFERENCE: {
        // Cross-reference between manufacturers
        P_steels: {
            Kennametal: ['KC5010', 'KC5025', 'KCPK20', 'KCPM15'],
            Sandvik: ['GC4225', 'GC4325', 'GC4315'],
            ISCAR: ['IC8150', 'IC8250', 'IC830'],
            Korloy: ['NC3120', 'NC3215', 'NC3225'],
            SECO: ['TP1500', 'TP2500', 'TP3500'],
            Ingersoll: ['IN2005', 'IN2015', 'IN2030']
        },
        M_stainless: {
            Kennametal: ['KC5010', 'KC725M', 'KCSM15'],
            Sandvik: ['GC2015', 'GC2025', 'GC2035'],
            ISCAR: ['IC807', 'IC808', 'IC810'],
            Korloy: ['PC5300', 'PC5400'],
            SECO: ['CP500', 'MF1000'],
            Ingersoll: ['IN1530', 'IN30M']
        },
        K_castIron: {
            Kennametal: ['KCK05', 'KCK10', 'KC7215'],
            Sandvik: ['GC3205', 'GC3210', 'GC3215'],
            ISCAR: ['IC4028', 'IC4050'],
            Korloy: ['NC3120', 'NC6010'],
            SECO: ['TK1000', 'TK2000'],
            Ingersoll: ['IN2005', 'IN2040']
        },
        N_aluminum: {
            Kennametal: ['KC610M', 'KCU10', 'KN25'],
            Sandvik: ['H10', 'H13A', 'GC1105'],
            ISCAR: ['IC20', 'IC28', 'IC520M'],
            Korloy: ['PD300', 'PD500'],
            SECO: ['HX', 'F10M'],
            Ingersoll: ['IN2030', 'IN2040']
        },
        S_superalloys: {
            Kennametal: ['KCSM15', 'KC5525', 'KCU25'],
            Sandvik: ['GC1105', 'S05F', 'GC1115'],
            ISCAR: ['IC806', 'IC910', 'IC928'],
            Korloy: ['PC9530', 'PC8110'],
            SECO: ['CP200', 'TS2000'],
            Ingersoll: ['IN1030', 'IN1530']
        },
        H_hardened: {
            Kennametal: ['KD1400', 'KD1415', 'KB5630'],
            Sandvik: ['CB7015', 'CB7025', 'GC4220'],
            ISCAR: ['IC907', 'IC9025', 'IB50'],
            Korloy: ['KBN10M', 'KB90C'],
            SECO: ['CBN050', 'CBN100'],
            Ingersoll: ['IN1030']
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    utilities: {
        /**
         * Get equivalent grade from different manufacturer
         */
        getEquivalentGrade: function(sourceManufacturer, sourceGrade, targetManufacturer, materialISO) {
            const crossRef = PRISM_CATALOG_BATCH8.GRADE_CROSS_REFERENCE[materialISO + '_' + this._getMaterialName(materialISO)];
            if (!crossRef) return null;
            
            const sourceGrades = crossRef[sourceManufacturer];
            const targetGrades = crossRef[targetManufacturer];
            
            if (!sourceGrades || !targetGrades) return null;
            
            const sourceIndex = sourceGrades.indexOf(sourceGrade);
            if (sourceIndex === -1) return null;
            
            // Return grade at same relative position (rough equivalent)
            const targetIndex = Math.min(sourceIndex, targetGrades.length - 1);
            return targetGrades[targetIndex];
        },

        _getMaterialName: function(iso) {
            const names = { P: 'steels', M: 'stainless', K: 'castIron', N: 'aluminum', S: 'superalloys', H: 'hardened' };
            return names[iso] || iso;
        },

        /**
         * Get cutting data for 7-flute HEM operation
         */
        get7FluteCuttingData: function(materialType, operation, toolDia) {
            const data = PRISM_CATALOG_BATCH8.CERATIZIT.IPT7_IPC7.cuttingData[materialType];
            if (!data || !data.operations[operation]) return null;
            
            const opData = data.operations[operation];
            const diaKey = this._findClosestDiameter(toolDia, Object.keys(opData.feeds));
            
            return {
                material: data.material,
                iso: data.iso,
                axialDoc: opData.axialDoc,
                radialDoc: opData.radialDoc,
                speed: opData.speed,
                feedPerTooth: opData.feeds[diaKey]
            };
        },

        _findClosestDiameter: function(dia, availableDias) {
            // Convert inch fractions to decimals for comparison
            const diaMap = { '3/16': 0.1875, '1/4': 0.25, '3/8': 0.375, '1/2': 0.5, '5/8': 0.625, '3/4': 0.75, '1': 1.0 };
            let closest = availableDias[0];
            let minDiff = Math.abs(diaMap[closest] - dia);
            
            for (const d of availableDias) {
                const diff = Math.abs(diaMap[d] - dia);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = d;
                }
            }
            return closest;
        },

        /**
         * Get ISO material classification
         */
        getISOClassification: function(materialName) {
            const materials = PRISM_CATALOG_BATCH8.ISO_MATERIALS;
            
            for (const [iso, data] of Object.entries(materials)) {
                for (const [subgroup, info] of Object.entries(data.subgroups)) {
                    if (info.examples.some(ex => materialName.toLowerCase().includes(ex.toLowerCase()))) {
                        return { iso, subgroup, ...info, color: data.color };
                    }
                }
            }
            return null;
        }
    }
}