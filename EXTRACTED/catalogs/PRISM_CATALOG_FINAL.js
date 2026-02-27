/**
 * PRISM_CATALOG_FINAL
 * Extracted from PRISM v8.89.002 monolith
 * References: 43
 * Category: catalogs
 * Lines: 903
 * Session: R2.3.6 Catalog/MIT Extraction
 */

const PRISM_CATALOG_FINAL = {
    version: '1.0.0',
    generated: '2026-01-17',
    description: 'Complete manufacturer catalog integration from 44 PDFs',
    totalManufacturers: 25,
    totalLines: 9500,
    
    // ═══════════════════════════════════════════════════════════════
    // BATCH 1: TOOL HOLDERS (v1)
    // ═══════════════════════════════════════════════════════════════
    toolHolders: {
        
        // ─────────────────────────────────────────────────────────────────────
        // GUHRING HYDRAULIC CHUCKS
        // Source: guhring tool holders.pdf (6 pages)
        // ─────────────────────────────────────────────────────────────────────
        guhring: {
            brand: 'Guhring',
            country: 'Germany',
            website: 'www.guhring.com',
            
            hydraulicChucks: {
                description: 'High-precision hydraulic chucks with increased clamping force',
                features: [
                    'Max 3μm concentricity deviation',
                    'Fast and simple tool change',
                    'Vibration cushioning effect',
                    'Optimal tool life and surface quality'
                ],
                specifications: [
                    { clampingDia: 6, maxRpm: 50000, maxTorque: 16, minInsertionDepth: 27, maxAdjustment: 10, maxRadialForce: 225, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 8, maxRpm: 50000, maxTorque: 26, minInsertionDepth: 27, maxAdjustment: 10, maxRadialForce: 370, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 10, maxRpm: 50000, maxTorque: 50, minInsertionDepth: 31, maxAdjustment: 10, maxRadialForce: 540, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 12, maxRpm: 50000, maxTorque: 82, minInsertionDepth: 36, maxAdjustment: 10, maxRadialForce: 650, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 14, maxRpm: 50000, maxTorque: 125, minInsertionDepth: 36, maxAdjustment: 10, maxRadialForce: 900, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 16, maxRpm: 50000, maxTorque: 190, minInsertionDepth: 39, maxAdjustment: 10, maxRadialForce: 1410, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 18, maxRpm: 50000, maxTorque: 275, minInsertionDepth: 39, maxAdjustment: 10, maxRadialForce: 1580, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 20, maxRpm: 50000, maxTorque: 310, minInsertionDepth: 41, maxAdjustment: 10, maxRadialForce: 1860, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 25, maxRpm: 25000, maxTorque: 520, minInsertionDepth: 47, maxAdjustment: 10, maxRadialForce: 4400, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 32, maxRpm: 25000, maxTorque: 770, minInsertionDepth: 51, maxAdjustment: 10, maxRadialForce: 6500, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' }
                ]
            },
            
            catHydraulicHolders: {
                seriesNumber: '4216',
                balanceQuality: 'G6.3 at 15,000 RPM',
                taperStandard: 'ANSI/ASME B 5.50',
                coolant: 'Through center and flange',
                retentionKnob: { CAT40: '5/8-11', CAT50: '1-8' },
                models: [
                    // CAT40 Inch
                    { taper: 'CAT40', clampingDia: '1/4"', clampingDiaMm: 6.35, d2: 26.0, d4: 44.5, l1: 64.0, l2: 37.0, l5: 29.5, edp: '9042161060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', clampingDiaMm: 9.525, d2: 30.0, d4: 44.5, l1: 64.0, l2: 41.0, l5: 31.0, edp: '9042161090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', clampingDiaMm: 12.7, d2: 32.0, d4: 44.5, l1: 64.0, l2: 46.0, l5: 31.5, edp: '9042161120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', clampingDiaMm: 15.875, d2: 38.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042161150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', clampingDiaMm: 19.05, d2: 40.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042161190400' },
                    { taper: 'CAT40', clampingDia: '1"', clampingDiaMm: 25.4, d2: 49.5, d4: 44.5, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042161250400' },
                    { taper: 'CAT40', clampingDia: '1-1/4"', clampingDiaMm: 31.75, d2: 63.0, d4: 80.0, l1: 81.0, l2: 61.0, l5: 25.5, edp: '9042161310400' },
                    // CAT50 Inch
                    { taper: 'CAT50', clampingDia: '1/4"', clampingDiaMm: 6.35, d2: 26.0, d4: 69.9, l1: 81.0, l2: 37.0, l5: 29.5, edp: '9042161060500' },
                    { taper: 'CAT50', clampingDia: '3/8"', clampingDiaMm: 9.525, d2: 30.0, d4: 69.9, l1: 81.0, l2: 41.0, l5: 31.0, edp: '9042161090500' },
                    { taper: 'CAT50', clampingDia: '1/2"', clampingDiaMm: 12.7, d2: 32.0, d4: 69.9, l1: 81.0, l2: 46.0, l5: 31.5, edp: '9042161120500' },
                    { taper: 'CAT50', clampingDia: '5/8"', clampingDiaMm: 15.875, d2: 38.0, d4: 69.9, l1: 81.0, l2: 49.0, l5: 33.0, edp: '9042161150500' },
                    { taper: 'CAT50', clampingDia: '3/4"', clampingDiaMm: 19.05, d2: 40.0, d4: 69.9, l1: 81.0, l2: 49.0, l5: 33.0, edp: '9042161190500' },
                    { taper: 'CAT50', clampingDia: '1"', clampingDiaMm: 25.4, d2: 57.0, d4: 69.9, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042161250500' },
                    { taper: 'CAT50', clampingDia: '1-1/4"', clampingDiaMm: 31.75, d2: 63.0, d4: 69.9, l1: 81.0, l2: 61.0, l5: 45.0, edp: '9042161310500' },
                    // CAT40 Metric
                    { taper: 'CAT40', clampingDia: '6mm', clampingDiaMm: 6, d2: 26.0, d4: 44.5, l1: 64.0, l2: 37.0, l5: 29.5, edp: '9042160060400' },
                    { taper: 'CAT40', clampingDia: '8mm', clampingDiaMm: 8, d2: 28.0, d4: 44.5, l1: 64.0, l2: 37.0, l5: 30.0, edp: '9042160080400' },
                    { taper: 'CAT40', clampingDia: '10mm', clampingDiaMm: 10, d2: 30.0, d4: 44.5, l1: 64.0, l2: 41.0, l5: 31.0, edp: '9042160100400' },
                    { taper: 'CAT40', clampingDia: '12mm', clampingDiaMm: 12, d2: 32.0, d4: 44.5, l1: 64.0, l2: 46.0, l5: 31.5, edp: '9042160120400' },
                    { taper: 'CAT40', clampingDia: '14mm', clampingDiaMm: 14, d2: 34.0, d4: 44.5, l1: 64.0, l2: 46.0, l5: 31.5, edp: '9042160140400' },
                    { taper: 'CAT40', clampingDia: '16mm', clampingDiaMm: 16, d2: 38.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042160160400' },
                    { taper: 'CAT40', clampingDia: '18mm', clampingDiaMm: 18, d2: 40.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042160180400' },
                    { taper: 'CAT40', clampingDia: '20mm', clampingDiaMm: 20, d2: 42.0, d4: 44.5, l1: 64.0, l2: 51.0, l5: 34.0, edp: '9042160200400' },
                    { taper: 'CAT40', clampingDia: '25mm', clampingDiaMm: 25, d2: 49.5, d4: 44.5, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042160250400' },
                    { taper: 'CAT40', clampingDia: '32mm', clampingDiaMm: 32, d2: 63.0, d4: 80.0, l1: 81.0, l2: 61.0, l5: 25.5, edp: '9042160320400' }
                ]
            },
            
            catShrinkFitHolders: {
                seriesNumber: '4764',
                balanceQuality: 'G6.3 at 15,000 RPM',
                balancingThreads: '4x M6 / 6x M6',
                features: ['Axial force dampening set screw', 'Perfect runout accuracy'],
                models: [
                    { taper: 'CAT40', clampingDia: '1/4"', d2: 21.0, d4: 27.0, l1: 80.0, l2: 36.0, edp: '9047641060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 41.0, edp: '9047641090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 46.0, edp: '9047641120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', d2: 27.0, d4: 34.0, l1: 80.0, l2: 49.0, edp: '9047641150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', d2: 33.0, d4: 42.0, l1: 80.0, l2: 49.0, edp: '9047641190400' },
                    { taper: 'CAT40', clampingDia: '1"', d2: 44.0, d4: 53.0, l1: 100.0, l2: 57.0, edp: '9047641250400' },
                    { taper: 'CAT40', clampingDia: '1-1/4"', d2: 44.0, d4: 53.0, l1: 100.0, l2: 61.0, edp: '9047641310400' }
                ]
            },
            
            guhrojetShrinkFit: {
                seriesNumber: '4765',
                description: 'Optimized cooling for tools without internal coolant ducts',
                features: ['Good chip evacuation', 'Increased process reliability'],
                models: [
                    { taper: 'CAT40', clampingDia: '1/4"', d2: 21.0, d4: 27.0, l1: 80.0, l2: 36.0, edp: '9047651060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 41.0, edp: '9047651090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 46.0, edp: '9047651120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', d2: 27.0, d4: 34.0, l1: 80.0, l2: 49.0, edp: '9047651150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', d2: 33.0, d4: 42.0, l1: 80.0, l2: 49.0, edp: '9047651190400' },
                    { taper: 'CAT50', clampingDia: '3/8"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 41.0, edp: '9047651090500' },
                    { taper: 'CAT50', clampingDia: '1/2"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 46.0, edp: '9047651120500' },
                    { taper: 'CAT50', clampingDia: '3/4"', d2: 33.0, d4: 42.0, l1: 80.0, l2: 49.0, edp: '9047651190500' },
                    { taper: 'CAT50', clampingDia: '1"', d2: 44.0, d4: 53.0, l1: 100.0, l2: 57.0, edp: '9047651250500' }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // BIG DAISHOWA TOOL HOLDERS
        // Source: BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf (628 pages)
        // ─────────────────────────────────────────────────────────────────────
        bigDaishowa: {
            brand: 'BIG DAISHOWA',
            country: 'Japan',
            website: 'www.bigdaishowa.com',
            
            bigPlusSystem: {
                description: 'Dual contact spindle system for highest precision',
                benefits: [
                    'ATC repeatability within 1μm',
                    'Minimized deflection',
                    'Maximum machining accuracy',
                    'Superior surface finish'
                ],
                pullingForce: '800kg',
                deflectionReduction: 'Significantly reduced vs conventional'
            },
            
            megaChucks: {
                megaMicroChuck: {
                    description: 'For micro drill & end mill applications',
                    maxRpm: 38000,
                    clampingRange: { min: 0.018, max: 0.317, minMm: 0.45, maxMm: 8.05, unit: 'inch' },
                    models: [
                        { taper: 'HSK-A40', clampingRange: '0.018-0.128"', bodyDia: 0.394, length: 2.36, maxRpm: 30000, collet: 'NBC3S', weight: 0.6 },
                        { taper: 'HSK-A40', clampingRange: '0.018-0.159"', bodyDia: 0.472, length: 2.36, maxRpm: 30000, collet: 'NBC4S', weight: 0.6 },
                        { taper: 'HSK-A40', clampingRange: '0.018-0.238"', bodyDia: 0.551, length: 2.36, maxRpm: 30000, collet: 'NBC6S', weight: 0.6 },
                        { taper: 'HSK-A50', clampingRange: '0.018-0.159"', bodyDia: 0.472, length: 2.95, maxRpm: 30000, collet: 'NBC4S', weight: 1.1 },
                        { taper: 'HSK-A63', clampingRange: '0.018-0.159"', bodyDia: 0.472, length: 2.95, maxRpm: 30000, collet: 'NBC4S', weight: 1.8 },
                        { taper: 'HSK-A63', clampingRange: '0.116-0.317"', bodyDia: 0.709, length: 3.54, maxRpm: 30000, collet: 'NBC8S', weight: 2.0 }
                    ]
                },
                
                megaEChuck: {
                    description: 'Collet chuck for end milling up to ø0.500" with high concentricity & rigidity',
                    maxRpm: 40000,
                    clampingRange: { min: 0.125, max: 0.500, minMm: 3, maxMm: 12, unit: 'inch' },
                    runout: { guaranteed: 0.00004, atNose: 0.00004, atTestBar: 0.00012, unit: 'inch' },
                    maxCoolantPressure: 1000, // PSI
                    features: [
                        '100% concentricity inspection',
                        'Runout within 1μm at nose guaranteed',
                        'Sealed collet nut for reliable coolant',
                        'Extended gripping length',
                        'Thick body eliminates chatter and deflection'
                    ]
                },
                
                megaSynchro: {
                    description: 'Tapping holder that compensates for synchronization errors',
                    thrustLoadReduction: { withColletChuck: 165, withMegaSynchro: 13.2, unit: 'lbs', reduction: '90%' },
                    tappingRanges: {
                        MGT3: { ansi: 'No.0-No.6', metric: 'M1-M3' },
                        MGT36: { ansi: 'AU13/16-AU1-1/2', metric: 'M20-M36' }
                    },
                    benefits: [
                        'Minimized thrust load',
                        'Improved thread quality',
                        'Extended tap life',
                        'Fine surface finish'
                    ]
                }
            },
            
            shrinkFitHolders: {
                slimJetThrough: {
                    description: 'Coolant securely supplied to cutting edge periphery from chuck nose',
                    clampingRange: { min: 0.236, max: 0.472, unit: 'inch' },
                    models: [
                        { taper: 'BBT40', clampingDia: 0.236, bodyDia: 0.630, bodDia1: 1.26, length: 4.13, minClampLength: 2.17, weight: 2.9 },
                        { taper: 'BBT40', clampingDia: 0.315, bodyDia: 0.748, bodDia1: 1.38, length: 4.13, minClampLength: 2.17, weight: 2.9 },
                        { taper: 'BBT40', clampingDia: 0.394, bodyDia: 0.866, bodDia1: 1.50, length: 4.13, minClampLength: 2.28, weight: 3.1 },
                        { taper: 'BBT40', clampingDia: 0.472, bodyDia: 0.945, bodDia1: 1.57, length: 4.13, minClampLength: 2.48, weight: 3.1 },
                        { taper: 'BBT50', clampingDia: 0.236, bodyDia: 0.630, bodDia1: 1.65, length: 6.50, minClampLength: 3.66, weight: 9.0 },
                        { taper: 'BBT50', clampingDia: 0.315, bodyDia: 0.748, bodDia1: 1.77, length: 6.50, minClampLength: 3.90, weight: 9.3 },
                        { taper: 'BBT50', clampingDia: 0.394, bodyDia: 0.866, bodDia1: 1.89, length: 6.50, minClampLength: 4.06, weight: 9.5 },
                        { taper: 'BBT50', clampingDia: 0.472, bodyDia: 0.945, bodDia1: 1.97, length: 6.50, minClampLength: 4.25, weight: 9.5 }
                    ]
                }
            },
            
            angleHeads: {
                ag90TwinHead: {
                    description: 'Compact design for symmetrical machining',
                    maxRpm: 6000,
                    clampingRange: { min: 0.059, max: 0.394, unit: 'inch' },
                    speedRatio: '1:1',
                    rotationDirection: 'Reverse of spindle',
                    models: [
                        { taper: 'BCV40', collet: 'NBC10', weight: 13.9 },
                        { taper: 'BCV50', collet: 'NBC10', weight: 30.4 }
                    ]
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // HAIMER TOOL HOLDERS
        // Source: Haimer USA Master Catalog.pdf (862 pages)
        // ─────────────────────────────────────────────────────────────────────
        haimer: {
            brand: 'HAIMER',
            country: 'Germany',
            website: 'www.haimer.com',
            production: {
                facility: 'Motzenhofen, Germany',
                space: '47,000 ft²',
                capacity: '4,000 tool holders per day',
                claim: 'Largest production facility for rotating tool holders worldwide'
            },
            
            safeLockSystem: {
                description: 'Pull out protection for high performance cutting',
                features: [
                    'Prevents micro-creeping in HPC',
                    'Form fit connection via grooves',
                    'High torque transmission',
                    'No tool pull out',
                    'No twisting'
                ],
                patented: true
            },
            
            holderTypes: {
                shrinkFit: {
                    runout: 0.00012, // inch at 3xD
                    balanceQuality: 'G2.5 at 25,000 RPM',
                    features: ['Symmetric clamping', 'High rigidity', 'Excellent damping']
                },
                colletChuck: {
                    runout: 0.0002, // inch
                    clampingRange: 'ER8 to ER50'
                },
                hydraulic: {
                    runout: 0.0001, // inch
                    coolantPressure: 'Up to 1500 PSI',
                    features: ['Oil-activated clamping', 'Excellent damping']
                }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: WORKHOLDING
    // ═══════════════════════════════════════════════════════════════════════════
    
    workholding: {
        
        // ─────────────────────────────────────────────────────────────────────
        // ORANGE VISE
        // Source: 543f80b8_2016_orange_vise_catalog.pdf (10 pages)
        // ─────────────────────────────────────────────────────────────────────
        orangeVise: {
            brand: 'Orange Vise',
            country: 'USA',
            website: 'www.orangevise.com',
            madeIn: '100% Made in USA',
            warranty: 'Lifetime warranty against defects',
            
            features: [
                'Ball Coupler ready zero-point system',
                'CarveSmart IJS dovetailed jaw interface',
                'Quick-change jaw plates',
                'Dual station convertible to single',
                'No thrust bearings (reliability)',
                'Sealed main screw threads'
            ],
            
            ballCouplers: {
                holdingForce: 10000, // lbs per coupler
                locatingRepeatability: 0.0005, // inch or better
                actuation: ['Manual', 'Pneumatic from above', 'Pneumatic from below']
            },
            
            vises: {
                sixInchDualStation: [
                    {
                        model: 'OV6-200DS3',
                        sku: '100-101',
                        description: '6" x 20.0" Dual Station Vise',
                        jawWidth: 6.0,
                        overallLength: 20.0,
                        maxOpeningWithPlates: { dualLaydown: 4.25, dualWide: 3.0, singleStation: 10.5 },
                        maxOpeningWithoutPlates: { dualLaydown: 5.0, dualWide: 4.5, singleStation: 12.0 },
                        maxClampingForce: 10000,
                        clampingRatio: '825 lbs per 10 lbs-ft torque',
                        shippingWeight: 112,
                        bodyMaterial: 'Cast Iron',
                        price: 1999
                    },
                    {
                        model: 'OV6-175DS3',
                        sku: '100-102',
                        description: '6" x 17.5" Dual Station Vise',
                        jawWidth: 6.0,
                        overallLength: 17.5,
                        maxOpeningWithPlates: { dualLaydown: 3.0, dualWide: 1.75, singleStation: 8.0 },
                        maxOpeningWithoutPlates: { dualLaydown: 3.75, dualWide: 3.25, singleStation: 9.5 },
                        maxClampingForce: 10000,
                        shippingWeight: 106,
                        bodyMaterial: 'Cast Iron',
                        price: 1999
                    },
                    {
                        model: 'OV6-160DS3',
                        sku: '100-103',
                        description: '6" x 16.0" Dual Station Vise',
                        jawWidth: 6.0,
                        overallLength: 16.0,
                        maxOpeningWithPlates: { dualLaydown: 1.5, singleStation: 6.5 },
                        maxOpeningWithoutPlates: { dualLaydown: 2.25, singleStation: 8.0 },
                        maxClampingForce: 10000,
                        shippingWeight: 88,
                        bodyMaterial: 'Cast Iron',
                        price: 1999
                    }
                ],
                
                fourFiveInchDualStation: [
                    {
                        model: 'OV45-200DS3',
                        sku: '100-201',
                        description: '4.5" x 20.0" Dual Station Vise',
                        jawWidth: 4.5,
                        overallLength: 20.0,
                        maxClampingForce: 10000,
                        shippingWeight: 84,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 1799
                    },
                    {
                        model: 'OV45-175DS3',
                        sku: '100-202',
                        description: '4.5" x 17.5" Dual Station Vise',
                        jawWidth: 4.5,
                        overallLength: 17.5,
                        maxClampingForce: 10000,
                        shippingWeight: 80,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 1799
                    },
                    {
                        model: 'OV45-160DS3',
                        sku: '100-203',
                        description: '4.5" x 16.0" Dual Station Vise',
                        jawWidth: 4.5,
                        overallLength: 16.0,
                        maxClampingForce: 10000,
                        shippingWeight: 66,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 1799
                    },
                    {
                        model: 'OV45-160SS3',
                        sku: '100-204',
                        description: '4.5" x 16.0" Single Station Vise',
                        jawWidth: 4.5,
                        overallLength: 16.0,
                        maxOpeningWithPlates: 8.0,
                        maxOpeningWithoutPlates: 9.5,
                        maxClampingForce: 10000,
                        shippingWeight: 66,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 999
                    }
                ],
                
                specifications: {
                    fixedJawMountingScrew: '1/2"-13 x 2.25" BHCS',
                    fixedJawTorque: 30, // lbs-ft
                    slidingJawSetScrew: '1/2"-13 x 1.25"',
                    slidingJawTorque: 10, // lbs-ft
                    jawPlateScrew: '1/2"-13 LHCS',
                    jawPlateTorque: 20, // lbs-ft
                    jawPlateBoltPattern: '0.938" from base, 3.875" center to center',
                    brakeSetScrew: '1/2"-13 x 1.25" Brass Tipped',
                    brakeTorque: 10, // lbs-ft
                    brakeTravel: '0.00" - 0.25"'
                }
            },
            
            accessories: {
                subplatesSteel: [
                    { sku: '100-401', description: 'Compact Subplate for 6" Vises', size: '6 x 20.0 x 1.38', price: 399 },
                    { sku: '100-402', description: 'Compact Subplate for 6" Vises', size: '6 x 17.5 x 1.38', price: 379 },
                    { sku: '100-403', description: 'Compact Subplate for 6" Vises', size: '6 x 16.0 x 1.38', price: 359 },
                    { sku: '100-411', description: 'Compact Subplate for 4.5" Vises', size: '4.5 x 20.0 x 1.38', price: 379 },
                    { sku: '100-412', description: 'Compact Subplate for 4.5" Vises', size: '4.5 x 17.5 x 1.38', price: 359 },
                    { sku: '100-413', description: 'Compact Subplate for 4.5" Vises', size: '4.5 x 16.0 x 1.38', price: 339 }
                ],
                masterJaws6Inch: [
                    { sku: '700-101', description: '6" IJS Master Sliding Jaw', size: '6 x 4.00 x 1.69', price: 199 },
                    { sku: '700-102', description: '6" IJS Master Center Jaw', size: '6 x 3.12 x 1.69', price: 199 },
                    { sku: '700-103', description: '6" IJS Laydown Center Jaw', size: '6 x 2.00 x 1.69', price: 149 },
                    { sku: '700-104', description: '6" Hardened Jawplates (2)', size: '6 x 1.71 x 0.75', price: 99 }
                ],
                machinableSoftJaws6Inch: [
                    { sku: '701-001', description: 'Machinable Sliding Jaw - Steel', size: '6 x 4.63 x 2.0', price: 129 },
                    { sku: '701-002', description: 'Machinable Sliding Jaw - 6061 Alum', size: '6 x 4.63 x 2.0', price: 79 },
                    { sku: '701-003', description: 'Machinable Sliding Jaw - 7075 Alum', size: '6 x 4.63 x 2.0', price: 109 },
                    { sku: '701-011', description: 'Machinable Center Jaw - Steel', size: '6 x 4.00 x 2.0', price: 109 },
                    { sku: '701-012', description: 'Machinable Center Jaw - 6061 Alum', size: '6 x 4.00 x 2.0', price: 69 },
                    { sku: '701-013', description: 'Machinable Center Jaw - 7075 Alum', size: '6 x 4.00 x 2.0', price: 99 }
                ],
                ballCouplers: [
                    { sku: '100-901', description: 'Ball Coupler', size: '1.5" OD', price: 99 },
                    { sku: '100-911', description: 'Ball Receiver A (Round)', size: '1.5" ID x 3.0" OD', price: 99 },
                    { sku: '100-912', description: 'Ball Receiver B (Oblong)', size: '1.5" ID x 3.0" OD', price: 99 }
                ],
                tombstones: [
                    { sku: '100-301', model: 'OV45-200-8SSQ', description: '4.5" 8-Station Square Column', size: '6" x 6" cross section', price: 9999 },
                    { sku: '100-311', model: 'OV6-200-8SSQ', description: '6" 8-Station Square Column', size: '9" x 9" cross section', price: 9999 },
                    { sku: '100-302', description: '6.0" Square Column with Ball Receivers', size: 'Column: 6 x 6 x 22', price: 1999 },
                    { sku: '100-312', description: '8.0" Square Column with Ball Receivers', size: 'Column: 8 x 8 x 22', price: 2499 }
                ]
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: CUTTING TOOLS & PARAMETERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    cuttingTools: {
        
        // ─────────────────────────────────────────────────────────────────────
        // SGS/KYOCERA CUTTING TOOLS
        // Source: SGS_Global_Catalog_v26.1.pdf (436 pages)
        // ─────────────────────────────────────────────────────────────────────
        sgs: {
            brand: 'SGS / KYOCERA SGS Precision Tools',
            country: 'USA',
            website: 'www.kyocera-sgstool.com',
            
            coatings: {
                'Ti-NAMITE': {
                    description: 'Titanium Nitride (TiN)',
                    color: 'Gold',
                    layerStructure: 'Multilayer',
                    thickness: '1-5 microns',
                    hardness: 2200, // HV
                    thermalStability: 600, // °C
                    frictionCoef: '0.40-0.65',
                    applications: 'General purpose, wide variety of materials'
                },
                'Ti-NAMITE-A': {
                    description: 'Aluminum Titanium Nitride (AlTiN)',
                    color: 'Dark grey',
                    layerStructure: 'Nano structure',
                    thickness: '1-5 microns',
                    hardness: 3700,
                    thermalStability: 1100,
                    frictionCoef: '0.30',
                    applications: 'Dry cutting, high thermal/chemical resistance, carbide protection'
                },
                'Ti-NAMITE-B': {
                    description: 'Titanium DiBoride (TiB2)',
                    color: 'Light grey-silver',
                    layerStructure: 'Monolayer',
                    thickness: '1-2 microns',
                    hardness: 4000,
                    thermalStability: 850,
                    frictionCoef: '0.10-0.20',
                    applications: 'Aluminum, copper, non-ferrous, prevents cold welding'
                },
                'Ti-NAMITE-C': {
                    description: 'Titanium Carbonitride (TiCN)',
                    color: 'Pink-red',
                    layerStructure: 'Multilayer',
                    thickness: '1-5 microns',
                    hardness: 3000,
                    thermalStability: 400,
                    frictionCoef: '0.30-0.45',
                    applications: 'Interrupted cuts, milling, good toughness'
                }
            },
            
            endMillSeries: {
                'Z-Carb-XPR': {
                    series: ['ZR', 'ZRCR'],
                    fluteCount: 4,
                    cutDiaRange: { inch: '0.250-0.750', metric: '6-20mm' },
                    cutLengthMultiplier: '2-3x DC',
                    helix: 'Variable',
                    coating: ['Ti-NAMITE-X', 'MEGACOAT NANO'],
                    centerCutting: true,
                    fluteIndex: 'Unequal',
                    maxRampAngle: 90,
                    chipbreaker: 'By request',
                    shankOptions: ['Solid Round', 'Weldon Flat']
                },
                'Z-Carb-AP': {
                    series: ['Z1P', 'Z1PCR', 'Z1PLC', 'Z1PB', 'Z1PLB'],
                    fluteCount: 4,
                    cutDiaRange: { inch: '0.0156-1.0', metric: '1-25mm' },
                    cutLengthMultiplier: '1-3.25x DC',
                    reachMultiplier: '2.5-8.5x DC',
                    helix: '35/38° variable',
                    coating: 'Ti-NAMITE-X',
                    centerCutting: true,
                    fluteIndex: 'Unequal',
                    maxRampAngle: 90,
                    endStyles: ['Square', 'Corner Radius', 'Ball']
                }
            },
            
            cuttingParameters: {
                zCarbXPR: {
                    // Fractional inch data
                    fractional: {
                        carbonSteels: {
                            hardnessMax: '28 HRc',
                            bhnMax: 275,
                            materials: ['1018', '1040', '1080', '1090', '10L50', '1140', '1212', '12L15', '1525', '1536'],
                            profile: { sfm: 675, sfmRange: '540-810' },
                            slot: { sfm: 450, sfmRange: '360-540' },
                            plunge: { sfm: 640, sfmRange: '512-768' },
                            feedPerTooth: {
                                '0.250': { profile: 0.0017, slot: 0.0014, plunge: 0.0013 },
                                '0.375': { profile: 0.0029, slot: 0.0025, plunge: 0.0022 },
                                '0.500': { profile: 0.0041, slot: 0.0035, plunge: 0.0032 },
                                '0.625': { profile: 0.0045, slot: 0.0039, plunge: 0.0035 },
                                '0.750': { profile: 0.0048, slot: 0.0042, plunge: 0.0038 }
                            }
                        },
                        alloySteels: {
                            hardnessMax: '40 HRc',
                            bhnMax: 375,
                            materials: ['4140', '4150', '4320', '5120', '5150', '8630', '86L20', '50100'],
                            profile: { sfm: 525, sfmRange: '420-630' },
                            slot: { sfm: 350, sfmRange: '280-420' },
                            plunge: { sfm: 500, sfmRange: '400-600' },
                            feedPerTooth: {
                                '0.250': { profile: 0.0011, slot: 0.0010, plunge: 0.0009 },
                                '0.375': { profile: 0.0024, slot: 0.0021, plunge: 0.0019 },
                                '0.500': { profile: 0.0036, slot: 0.0031, plunge: 0.0028 },
                                '0.625': { profile: 0.0039, slot: 0.0034, plunge: 0.0031 },
                                '0.750': { profile: 0.0042, slot: 0.0037, plunge: 0.0033 }
                            }
                        },
                        toolSteels: {
                            hardnessMax: '40 HRc',
                            bhnMax: 375,
                            materials: ['A2', 'D2', 'H13', 'L2', 'M2', 'P20', 'S7', 'T15', 'W2'],
                            profile: { sfm: 240, sfmRange: '192-288' },
                            slot: { sfm: 160, sfmRange: '128-192' },
                            plunge: { sfm: 220, sfmRange: '176-264' },
                            feedPerTooth: {
                                '0.250': { profile: 0.0009, slot: 0.0008, plunge: 0.0007 },
                                '0.375': { profile: 0.0018, slot: 0.0016, plunge: 0.0014 },
                                '0.500': { profile: 0.0026, slot: 0.0023, plunge: 0.0021 },
                                '0.625': { profile: 0.0030, slot: 0.0026, plunge: 0.0023 },
                                '0.750': { profile: 0.0033, slot: 0.0028, plunge: 0.0025 }
                            }
                        },
                        castIronLowMed: {
                            hardnessMax: '19 HRc',
                            bhnMax: 220,
                            materials: ['Gray', 'Malleable', 'Ductile'],
                            profile: { sfm: 630, sfmRange: '504-756' },
                            slot: { sfm: 420, sfmRange: '336-504' },
                            plunge: { sfm: 600, sfmRange: '480-720' }
                        },
                        castIronHigh: {
                            hardnessMax: '26 HRc',
                            bhnMax: 260,
                            materials: ['Gray', 'Malleable', 'Ductile'],
                            profile: { sfm: 375, sfmRange: '300-450' },
                            slot: { sfm: 250, sfmRange: '200-300' },
                            plunge: { sfm: 350, sfmRange: '280-420' }
                        },
                        superAlloys: {
                            hardnessMax: '32 HRc',
                            bhnMax: 300,
                            materials: ['Inconel 601', 'Inconel 617', 'Inconel 625', 'Incoloy', 'Monel 400'],
                            profile: { sfm: 105, sfmRange: '84-126' },
                            slot: { sfm: 70, sfmRange: '56-84' },
                            ramp3deg: { sfm: 100, sfmRange: '80-120' }
                        }
                    }
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // HAIMER CUTTING TOOLS
        // Source: Haimer USA Master Catalog.pdf
        // ─────────────────────────────────────────────────────────────────────
        haimer: {
            brand: 'HAIMER',
            country: 'Germany',
            
            materialGroups: {
                P1: { 
                    name: 'General construction steels', 
                    ansi: ['A252', 'A50-2', '1045'],
                    din: ['1.0038', '1.0050', '1.0503'],
                    tensileMax: '800 N/mm² (116,000 PSI)',
                    hardnessMax: '25 HRc'
                },
                P2: { 
                    name: 'Heat treated steels', 
                    ansi: ['D2', '4140'],
                    din: ['1.2367', '1.2379', '1.2363', '1.7225'],
                    tensileMin: '800 N/mm² (116,000 PSI)',
                    hardnessMax: '45 HRc'
                },
                M1: { 
                    name: 'Stainless steels (soft)', 
                    ansi: ['303', '304'],
                    din: ['1.4305', '1.4301', '1.4034'],
                    tensileMax: '650 N/mm² (94,275 PSI)'
                },
                M2: { 
                    name: 'Stainless steels (hard)', 
                    ansi: ['316Ti', '316L'],
                    din: ['1.4571', '1.4404', '1.4418'],
                    tensileMin: '650 N/mm² (94,275 PSI)'
                },
                K1: { 
                    name: 'Cast iron (soft)', 
                    ansi: ['ASTM A48 NO. 30', 'ASTM A48 NO. 55/60', 'G1800'],
                    din: ['0.6020', '0.6040', '0.7040'],
                    tensileMax: '450 N/mm² (65,265 PSI)'
                },
                K2: { 
                    name: 'Cast iron (hard)', 
                    ansi: ['ASTM A536 80-55-06', 'ASTM A536 100-70-06'],
                    din: ['0.7060', '0.7070'],
                    tensileMin: '450 N/mm² (65,265 PSI)'
                },
                S1: { 
                    name: 'Titanium alloys', 
                    ansi: ['Ti6Al4V'],
                    din: ['3.7165']
                },
                S2: { 
                    name: 'High temp alloys', 
                    materials: ['Inconel', 'Nimonic'],
                    tensile: '800-1700 N/mm²'
                },
                N1: { 
                    name: 'Wrought aluminum', 
                    ansi: ['A5005', 'A6061', 'A7075'],
                    din: ['3.3315'],
                    silicon: '<9%'
                },
                N2: { 
                    name: 'Cast aluminum', 
                    ansi: ['A310', 'A400'],
                    din: ['3.2581'],
                    silicon: '>9%'
                },
                H1: { 
                    name: 'Hardened steels', 
                    hardness: '45-55 HRc'
                }
            },
            
            cuttingData: {
                haimerMillPower: {
                    // F1003NN series - Sharp cutting edge
                    description: 'Power Series End Mills',
                    cutWidths: {
                        ae100_ap1xD: 'Full slot',
                        ae50_ap15xD: 'Medium engagement',
                        ae25_apMax: 'Light engagement'
                    },
                    speedsSFM: {
                        P1: { ae100: '557-656', ae50: '689-787', ae25: '820-885' },
                        P2: { ae100: '295-361', ae50: '361-426', ae25: '426-492' },
                        M1: { ae100: '-', ae50: '-', ae25: '180-213' },
                        M2: { ae100: '-', ae50: '-', ae25: '131-164' },
                        K1: { ae100: '361-426', ae50: '426-492', ae25: '656-721' },
                        K2: { ae100: '295-361', ae50: '361-426', ae25: '525-590' },
                        S1: { ae100: '197-262', ae50: '197-262', ae25: '197-262' },
                        S2: { ae100: '98-131', ae50: '98-131', ae25: '98-131' },
                        N1: { ae100: '393-787', ae50: '393-787', ae25: '393-787' },
                        N2: { ae100: '393-787', ae50: '393-787', ae25: '393-787' },
                        H1: { ae100: '131-197', ae50: '197-262', ae25: '197-262' }
                    },
                    feedPerToothInch: {
                        // Dia: fz at ae<50%, fz at ae=100%
                        '3/32': { ae50: 0.0006, ae100: 0.0005, finishStep: 0.0001 },
                        '1/8': { ae50: 0.0008, ae100: 0.0006, finishStep: 0.0001 },
                        '3/16': { ae50: 0.0011, ae100: 0.0009, finishStep: 0.0002 },
                        '1/4': { ae50: 0.0015, ae100: 0.0013, finishStep: 0.0003 },
                        '5/16': { ae50: 0.0019, ae100: 0.0016, finishStep: 0.0003 },
                        '3/8': { ae50: 0.0023, ae100: 0.0019, finishStep: 0.0004 },
                        '1/2': { ae50: 0.0030, ae100: 0.0025, finishStep: 0.0005 },
                        '5/8': { ae50: 0.0038, ae100: 0.0031, finishStep: 0.0006 },
                        '3/4': { ae50: 0.0045, ae100: 0.0038, finishStep: 0.0008 },
                        '1': { ae50: 0.0060, ae100: 0.0050, finishStep: 0.0010 }
                    }
                },
                haimerMillBallNose: {
                    // V1002NN series
                    description: 'Ball Nose End Mills',
                    speedsMetric: {
                        P1: { roughing: '180-220', finishing: '280-320' },
                        P2: { roughing: '170-190', finishing: '270-290' },
                        M1: { roughing: '110-130', finishing: '170-190' },
                        M2: { roughing: '70-90', finishing: '120-140' },
                        K1: { roughing: '190-210', finishing: '290-310' },
                        K2: { roughing: '140-160', finishing: '220-240' },
                        S1: { roughing: '60-80', finishing: '60-80' },
                        S2: { roughing: '30-40', finishing: '30-40' },
                        N1: { roughing: '120-240', finishing: '120-240' },
                        N2: { roughing: '120-240', finishing: '120-240' },
                        H1: { roughing: '40-60', finishing: '60-80' }
                    },
                    feedPerToothMm: {
                        '2': { ae50: 0.02, ae100: 0.01, finishStep: 0.002 },
                        '3': { ae50: 0.03, ae100: 0.015, finishStep: 0.003 },
                        '4': { ae50: 0.04, ae100: 0.02, finishStep: 0.004 },
                        '5': { ae50: 0.05, ae100: 0.025, finishStep: 0.005 },
                        '6': { ae50: 0.06, ae100: 0.03, finishStep: 0.006 },
                        '8': { ae50: 0.08, ae100: 0.04, finishStep: 0.008 },
                        '10': { ae50: 0.10, ae100: 0.05, finishStep: 0.010 },
                        '12': { ae50: 0.12, ae100: 0.06, finishStep: 0.012 },
                        '16': { ae50: 0.16, ae100: 0.08, finishStep: 0.016 },
                        '20': { ae50: 0.20, ae100: 0.10, finishStep: 0.020 }
                    }
                },
                haimerMillHF: {
                    // H2006UK series - High Feed
                    description: 'High Feed Milling',
                    speedsMetric: {
                        P1: { roughing: '250-320', finishing: '340-420' },
                        P2: { roughing: '190-220', finishing: '240-310' },
                        M1: { roughing: '95-115', finishing: '135-170' },
                        M2: { roughing: '75-95', finishing: '105-130' },
                        K1: { roughing: '160-180', finishing: '200-230' },
                        K2: { roughing: '130-150', finishing: '170-200' },
                        S1: { roughing: '50-60', finishing: '80-90' },
                        S2: { roughing: '30-40', finishing: '30-40' },
                        N1: { roughing: '500-900', finishing: '500-900' },
                        N2: { roughing: '120-350', finishing: '120-350' },
                        H1: { roughing: '40-60', finishing: '60-80' }
                    },
                    feedPerToothMm: {
                        '10': { fzRange: '0.1-0.3', apHFC: 0.75 },
                        '12': { fzRange: '0.12-0.36', apHFC: 0.9 },
                        '16': { fzRange: '0.16-0.48', apHFC: 1.2 },
                        '20': { fzRange: '0.2-0.6', apHFC: 1.5 }
                    }
                },
                duoLockMill: {
                    // F2003MN series - DUO-LOCK
                    description: 'DUO-LOCK Sharp Cutting Edge',
                    speedsSFM: {
                        P1: { roughing: '525-725', finishing: '725-920' },
                        P2: { roughing: '395-525', finishing: '525-655' },
                        M1: { roughing: '260-395', finishing: '395-525' },
                        M2: { roughing: '195-295', finishing: '295-395' },
                        K1: { roughing: '395-590', finishing: '590-785' },
                        K2: { roughing: '260-525', finishing: '525-720' },
                        S1: { roughing: '130-260', finishing: '130-260' },
                        S2: { roughing: '100-130', finishing: '100-130' },
                        N1: { roughing: '1640-2950', finishing: '1640-2950' },
                        N2: { roughing: '395-1150', finishing: '395-1150' },
                        H1: { roughing: '130-195', finishing: '195-260' }
                    },
                    feedPerToothInch: {
                        '3/8': '0.0011-0.0035',
                        '1/2': '0.0011-0.0039',
                        '5/8': '0.0016-0.0047',
                        '3/4': '0.002-0.005'
                    }
                }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: CATALOG MANIFEST
    // ═══════════════════════════════════════════════════════════════════════════
    
    catalogManifest: [
        // Tool Holders
        { filename: 'guhring tool holders.pdf', pages: 6, size: '664K', category: 'tool_holders', brand: 'Guhring', extracted: true },
        { filename: 'BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf', pages: 628, size: '25M', category: 'tool_holders', brand: 'BIG DAISHOWA', extracted: true },
        { filename: 'Haimer USA Master Catalog.pdf', pages: 862, size: '353M', category: 'tool_holders_cutting', brand: 'Haimer', extracted: true },
        { filename: 'REGO-FIX Catalogue 2026 ENGLISH.pdf', pages: 448, size: '208M', category: 'tool_holders', brand: 'REGO-FIX', extracted: false },
        { filename: 'CAMFIX_Catalog.pdf', pages: null, size: '53M', category: 'tool_holders', brand: 'CAMFIX', extracted: false },
        
        // Workholding
        { filename: '543f80b8_2016_orange_vise_catalog.pdf', pages: 10, size: '3M', category: 'workholding', brand: 'Orange Vise', extracted: true },
        
        // Cutting Tools
        { filename: 'SGS_Global_Catalog_v26.1.pdf', pages: 436, size: '16M', category: 'cutting_tools', brand: 'SGS/Kyocera', extracted: true },
        { filename: 'OSG.pdf', pages: null, size: '110M', category: 'cutting_tools', brand: 'OSG', extracted: false },
        { filename: 'ISCAR PART 1.pdf', pages: null, size: '354M', category: 'cutting_tools', brand: 'ISCAR', extracted: false },
        { filename: 'INGERSOLL CUTTING TOOLS.pdf', pages: null, size: '104M', category: 'cutting_tools', brand: 'Ingersoll', extracted: false },
        { filename: 'guhring full catalog.pdf', pages: null, size: '49M', category: 'cutting_tools', brand: 'Guhring', extracted: false },
        { filename: 'korloy rotating.pdf', pages: null, size: '56M', category: 'cutting_tools', brand: 'Korloy', extracted: false },
        { filename: 'korloy solid.pdf', pages: null, size: '94M', category: 'cutting_tools', brand: 'Korloy', extracted: false },
        { filename: 'korloy turning.pdf', pages: null, size: '43M', category: 'cutting_tools', brand: 'Korloy', extracted: false },
        { filename: 'MA_Ford_US_Product_Catalog_vol105interactiveweb.pdf', pages: null, size: '162M', category: 'cutting_tools', brand: 'MA Ford', extracted: false },
        { filename: 'Accupro 2013.pdf', pages: null, size: '42M', category: 'cutting_tools', brand: 'Accupro', extracted: false },
        { filename: 'ZK12023_DEGB RevA EMUGE Katalog 160.pdf', pages: null, size: '233M', category: 'cutting_tools', brand: 'EMUGE', extracted: false },
        { filename: 'Flash_Solid_catalog_INCH.pdf', pages: null, size: '86M', category: 'cutting_tools', brand: 'Flash', extracted: false },
        
        // General Catalogs
        { filename: 'Cutting Tools Master 2022 English Inch.pdf', pages: null, size: '149M', category: 'cutting_tools', brand: 'Mitsubishi', extracted: false },
        { filename: 'Cutting Tools Master 2022 English Metric.pdf', pages: null, size: '265M', category: 'cutting_tools', brand: 'Mitsubishi', extracted: false },
        { filename: 'Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf', pages: null, size: '118M', category: 'turning', brand: 'Sandvik', extracted: false },
        { filename: 'Master Catalog 2018 Vol. 2 Rotating Tools English Inch.pdf', pages: null, size: '259M', category: 'rotating', brand: 'Sandvik', extracted: false },
        { filename: 'GC_2023-2024_US_Milling.pdf', pages: null, size: '48M', category: 'milling', brand: 'GC', extracted: false },
        { filename: 'GC_2023-2024_US_Drilling.pdf', pages: null, size: '16M', category: 'drilling', brand: 'GC', extracted: false },
        { filename: 'GC_2023-2024_US_Turning-Grooving.pdf', pages: null, size: '48M', category: 'turning', brand: 'GC', extracted: false },
        { filename: 'GC_2023-2024_US_Tooling.pdf', pages: null, size: '9.7M', category: 'tooling', brand: 'GC', extracted: false },
        { filename: 'Milling 2018.1.pdf', pages: null, size: '39M', category: 'milling', brand: 'Sandvik', extracted: false },
        { filename: 'Turning 2018.1.pdf', pages: null, size: '53M', category: 'turning', brand: 'Sandvik', extracted: false },
        { filename: 'Threading 2018.1.pdf', pages: null, size: '20M', category: 'threading', brand: 'Sandvik', extracted: false },
        { filename: 'Holemaking.pdf', pages: null, size: '56M', category: 'drilling', brand: 'Sandvik', extracted: false },
        { filename: 'Solid End Mills.pdf', pages: null, size: '40M', category: 'cutting_tools', brand: 'Sandvik', extracted: false },
        { filename: 'Tooling Systems.pdf', pages: null, size: '29M', category: 'tooling', brand: 'Sandvik', extracted: false },
        { filename: 'TURNING_CATALOG_PART 1.pdf', pages: null, size: '204M', category: 'turning', brand: 'Unknown', extracted: false },
        { filename: 'zeni catalog.pdf', pages: null, size: '183M', category: 'cutting_tools', brand: 'Zeni', extracted: false },
        { filename: 'AMPC_US-EN.pdf', pages: null, size: '167M', category: 'cutting_tools', brand: 'AMPC', extracted: false },
        { filename: 'catalog_c010b_full.pdf', pages: null, size: '99M', category: 'cutting_tools', brand: 'Unknown', extracted: false },
        { filename: '01-Global-CNC-Full-Catalog-2023.pdf', pages: null, size: '54M', category: 'cnc_accessories', brand: 'Global CNC', extracted: false },
        { filename: '2018 Rapidkut Catalog.pdf', pages: null, size: '4M', category: 'cutting_tools', brand: 'Rapidkut', extracted: false },
        { filename: 'Metalmorphosis-2021-FINAL-reduced-for-Web.pdf', pages: null, size: '24M', category: 'cutting_tools', brand: 'Metalmorphosis', extracted: false },
        { filename: 'Tooling Systems News 2018 English MetricInch.pdf', pages: null, size: '12M', category: 'tooling', brand: 'Sandvik', extracted: false }
    ],
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    
    getToolHolderByTaper: function(taper) {
        const results = [];
        // Search Guhring
        if (this.toolHolders.guhring?.catHydraulicHolders?.models) {
            results.push(...this.toolHolders.guhring.catHydraulicHolders.models.filter(m => m.taper === taper));
        }
        if (this.toolHolders.guhring?.catShrinkFitHolders?.models) {
            results.push(...this.toolHolders.guhring.catShrinkFitHolders.models.filter(m => m.taper === taper));
        }
        return results;
    },
    
    getCuttingParamsForMaterial: function(materialType, toolSeries = 'zCarbXPR') {
        const params = this.cuttingTools.sgs?.cuttingParameters?.[toolSeries]?.fractional;
        if (!params) return null;
        
        const materialMap = {
            'carbon_steel': 'carbonSteels',
            'alloy_steel': 'alloySteels',
            'tool_steel': 'toolSteels',
            'cast_iron_soft': 'castIronLowMed',
            'cast_iron_hard': 'castIronHigh',
            'superalloy': 'superAlloys'
        };
        
        return params[materialMap[materialType] || materialType];
    },
    
    getViseByWidth: function(width) {
        const vises = [];
        if (width === 6) {
            vises.push(...(this.workholding.orangeVise?.vises?.sixInchDualStation || []));
        } else if (width === 4.5) {
            vises.push(...(this.workholding.orangeVise?.vises?.fourFiveInchDualStation || []));
        }
        return vises;
    },
    
    getStats: function() {
        return {
            totalCatalogs: this.catalogManifest.length,
            extractedCatalogs: this.catalogManifest.filter(c => c.extracted).length,
            toolHolderBrands: Object.keys(this.toolHolders).length,
            workholdingBrands: Object.keys(this.workholding).length,
            cuttingToolBrands: Object.keys(this.cuttingTools).length,
            guhringHydraulicSpecs: this.toolHolders.guhring?.hydraulicChucks?.specifications?.length || 0,
            guhringCatHolders: this.toolHolders.guhring?.catHydraulicHolders?.models?.length || 0,
            orangeViseModels: (this.workholding.orangeVise?.vises?.sixInchDualStation?.length || 0) + 
                             (this.workholding.orangeVise?.vises?.fourFiveInchDualStation?.length || 0),
            sgsCoatings: Object.keys(this.cuttingTools.sgs?.coatings || {}).length,
            haimerMaterialGroups: Object.keys(this.cuttingTools.haimer?.materialGroups || {}).length
        };
    }
}