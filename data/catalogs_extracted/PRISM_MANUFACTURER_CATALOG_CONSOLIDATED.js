/**
 * PRISM_MANUFACTURER_CATALOG_CONSOLIDATED
 * Extracted from PRISM v8.89.002 monolith
 * References: 42
 * Category: catalogs
 * Lines: 1001
 * Session: R2.3.6 Catalog/MIT Extraction
 */

const PRISM_MANUFACTURER_CATALOG_CONSOLIDATED = {
    version: '1.0.0',
    generated: '2026-01-17',
    build: 'v8.65.032',
    sourceFiles: 8,
    totalSourceLines: 8823,
    totalPdfCatalogs: 44,
    totalPdfSize: '3.1 GB',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MANUFACTURER INDEX
    // ═══════════════════════════════════════════════════════════════════════════
    manufacturers: {
        toolHolders: ['Guhring', 'BIG DAISHOWA', 'REGO-FIX', 'Haimer'],
        workholding: ['Orange Vise'],
        cuttingTools: ['OSG', 'Kennametal', 'Sandvik', 'ISCAR', 'SECO', 'SGS', 'MA Ford', 'EMUGE', 'Korloy', 'Ingersoll', 'Accupro', 'Tungaloy', 'Ceratizit', 'Zeni'],
        latheTooling: ['Global CNC', 'ISCAR CAMFIX'],
        drilling: ['Allied Machine', 'OSG', 'Kennametal']
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 1: TOOL HOLDERS (from v1, v6)
    // ═══════════════════════════════════════════════════════════════════════════
    
    toolHolders: {
        // ─────────────────────────────────────────────────────────────────────
        // GUHRING HYDRAULIC CHUCKS
        // ─────────────────────────────────────────────────────────────────────
        guhring: {
            brand: 'Guhring',
            country: 'Germany',
            website: 'www.guhring.com',
            
            hydraulicChucks: {
                description: 'High-precision hydraulic chucks with increased clamping force',
                features: ['Max 3μm concentricity', 'Fast tool change', 'Vibration cushioning', 'Optimal tool life'],
                specifications: [
                    { clampingDia: 6, maxRpm: 50000, maxTorque: 16, minInsertionDepth: 27, maxRadialForce: 225, shankTolerance: 'h6' },
                    { clampingDia: 8, maxRpm: 50000, maxTorque: 26, minInsertionDepth: 27, maxRadialForce: 370, shankTolerance: 'h6' },
                    { clampingDia: 10, maxRpm: 50000, maxTorque: 50, minInsertionDepth: 31, maxRadialForce: 540, shankTolerance: 'h6' },
                    { clampingDia: 12, maxRpm: 50000, maxTorque: 82, minInsertionDepth: 36, maxRadialForce: 650, shankTolerance: 'h6' },
                    { clampingDia: 14, maxRpm: 50000, maxTorque: 125, minInsertionDepth: 36, maxRadialForce: 900, shankTolerance: 'h6' },
                    { clampingDia: 16, maxRpm: 50000, maxTorque: 190, minInsertionDepth: 39, maxRadialForce: 1410, shankTolerance: 'h6' },
                    { clampingDia: 18, maxRpm: 50000, maxTorque: 275, minInsertionDepth: 39, maxRadialForce: 1580, shankTolerance: 'h6' },
                    { clampingDia: 20, maxRpm: 50000, maxTorque: 310, minInsertionDepth: 41, maxRadialForce: 1860, shankTolerance: 'h6' },
                    { clampingDia: 25, maxRpm: 25000, maxTorque: 520, minInsertionDepth: 47, maxRadialForce: 4400, shankTolerance: 'h6' },
                    { clampingDia: 32, maxRpm: 25000, maxTorque: 770, minInsertionDepth: 51, maxRadialForce: 6500, shankTolerance: 'h6' }
                ]
            },
            
            catHydraulicHolders: {
                seriesNumber: '4216',
                balanceQuality: 'G6.3 at 15,000 RPM',
                taperStandard: 'ANSI/ASME B 5.50',
                coolant: 'Through center and flange',
                retentionKnob: { CAT40: '5/8-11', CAT50: '1-8' },
                models: [
                    { taper: 'CAT40', clampingDia: '1/4"', clampingDiaMm: 6.35, d2: 26.0, d4: 44.5, l1: 64.0, l2: 37.0, l5: 29.5, edp: '9042161060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', clampingDiaMm: 9.525, d2: 30.0, d4: 44.5, l1: 64.0, l2: 41.0, l5: 31.0, edp: '9042161090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', clampingDiaMm: 12.7, d2: 32.0, d4: 44.5, l1: 64.0, l2: 46.0, l5: 31.5, edp: '9042161120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', clampingDiaMm: 15.875, d2: 38.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042161150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', clampingDiaMm: 19.05, d2: 40.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042161190400' },
                    { taper: 'CAT40', clampingDia: '1"', clampingDiaMm: 25.4, d2: 49.5, d4: 44.5, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042161250400' },
                    { taper: 'CAT40', clampingDia: '1-1/4"', clampingDiaMm: 31.75, d2: 63.0, d4: 80.0, l1: 81.0, l2: 61.0, l5: 25.5, edp: '9042161310400' },
                    { taper: 'CAT50', clampingDia: '1/4"', clampingDiaMm: 6.35, d2: 26.0, d4: 69.9, l1: 81.0, l2: 37.0, l5: 29.5, edp: '9042161060500' },
                    { taper: 'CAT50', clampingDia: '3/8"', clampingDiaMm: 9.525, d2: 30.0, d4: 69.9, l1: 81.0, l2: 41.0, l5: 31.0, edp: '9042161090500' },
                    { taper: 'CAT50', clampingDia: '1/2"', clampingDiaMm: 12.7, d2: 32.0, d4: 69.9, l1: 81.0, l2: 46.0, l5: 31.5, edp: '9042161120500' },
                    { taper: 'CAT50', clampingDia: '5/8"', clampingDiaMm: 15.875, d2: 38.0, d4: 69.9, l1: 81.0, l2: 49.0, l5: 33.0, edp: '9042161150500' },
                    { taper: 'CAT50', clampingDia: '3/4"', clampingDiaMm: 19.05, d2: 40.0, d4: 69.9, l1: 81.0, l2: 49.0, l5: 33.0, edp: '9042161190500' },
                    { taper: 'CAT50', clampingDia: '1"', clampingDiaMm: 25.4, d2: 57.0, d4: 69.9, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042161250500' },
                    { taper: 'CAT50', clampingDia: '1-1/4"', clampingDiaMm: 31.75, d2: 63.0, d4: 69.9, l1: 81.0, l2: 61.0, l5: 45.0, edp: '9042161310500' },
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
            
            shrinkFitHolders: {
                seriesNumber: '4764',
                balanceQuality: 'G6.3 at 15,000 RPM',
                features: ['Axial force dampening set screw', 'Perfect runout accuracy'],
                models: [
                    { taper: 'CAT40', clampingDia: '1/4"', d2: 21.0, d4: 27.0, l1: 80.0, l2: 36.0, edp: '9047641060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 41.0, edp: '9047641090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 46.0, edp: '9047641120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', d2: 27.0, d4: 34.0, l1: 80.0, l2: 49.0, edp: '9047641150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', d2: 33.0, d4: 42.0, l1: 80.0, l2: 49.0, edp: '9047641190400' },
                    { taper: 'CAT40', clampingDia: '1"', d2: 44.0, d4: 53.0, l1: 100.0, l2: 57.0, edp: '9047641250400' }
                ]
            },
            
            microDrills: {
                series6488: {
                    description: 'Micro precision drills for small hole applications',
                    coating: 'TiAlN',
                    pointAngle: 140,
                    sizes: [
                        { dia: 0.1, shank: 3, flute: 2, oal: 38 },
                        { dia: 0.2, shank: 3, flute: 3, oal: 38 },
                        { dia: 0.3, shank: 3, flute: 4, oal: 38 },
                        { dia: 0.5, shank: 3, flute: 6, oal: 38 },
                        { dia: 0.8, shank: 3, flute: 10, oal: 38 },
                        { dia: 1.0, shank: 3, flute: 12, oal: 38 }
                    ]
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // BIG DAISHOWA HIGH PRECISION TOOL HOLDERS
        // ─────────────────────────────────────────────────────────────────────
        bigDaishowa: {
            brand: 'BIG DAISHOWA',
            country: 'Japan',
            website: 'www.bigdaishowa.com',
            
            bigPlusSystem: {
                description: 'Dual contact spindle system for highest precision',
                benefits: ['ATC repeatability within 1μm', 'Minimized deflection', 'Maximum accuracy', 'Superior surface finish'],
                pullingForce: '800kg',
                deflectionReduction: 'Significantly reduced vs conventional'
            },
            
            megaMicroChuck: {
                description: 'For micro drill & end mill applications',
                maxRpm: 38000,
                clampingRange: { min: 0.45, max: 8.05, unit: 'mm' },
                runout: '< 3μm',
                balanceGrade: 'G2.5 at 25,000 RPM',
                models: [
                    { taper: 'BT30', bore: 3, bodyDia: 25, oal: 50, runout: 3, partNo: 'BBT30-MEGA3S-50' },
                    { taper: 'BT30', bore: 6, bodyDia: 32, oal: 60, runout: 3, partNo: 'BBT30-MEGA6S-60' },
                    { taper: 'BT40', bore: 3, bodyDia: 25, oal: 65, runout: 3, partNo: 'BBT40-MEGA3S-65' },
                    { taper: 'BT40', bore: 6, bodyDia: 32, oal: 75, runout: 3, partNo: 'BBT40-MEGA6S-75' },
                    { taper: 'BT40', bore: 10, bodyDia: 40, oal: 90, runout: 3, partNo: 'BBT40-MEGA10S-90' },
                    { taper: 'CAT40', bore: 3, bodyDia: 25, oal: 65, runout: 3, partNo: 'CAT40-MEGA3S-65' },
                    { taper: 'CAT40', bore: 6, bodyDia: 32, oal: 75, runout: 3, partNo: 'CAT40-MEGA6S-75' },
                    { taper: 'CAT40', bore: 10, bodyDia: 40, oal: 90, runout: 3, partNo: 'CAT40-MEGA10S-90' },
                    { taper: 'HSK-A63', bore: 6, bodyDia: 32, oal: 80, runout: 3, partNo: 'HSK-A63-MEGA6S-80' },
                    { taper: 'HSK-A63', bore: 10, bodyDia: 40, oal: 100, runout: 3, partNo: 'HSK-A63-MEGA10S-100' }
                ]
            },
            
            megaEChuck: {
                description: 'Enhanced hydraulic chuck with increased clamping force',
                maxRpm: 30000,
                clampingRange: { min: 2, max: 32, unit: 'mm' },
                runout: '< 3μm',
                models: [
                    { taper: 'BT40', bore: 6, bodyDia: 32, oal: 80, partNo: 'BBT40-MEGA-E6C-80' },
                    { taper: 'BT40', bore: 12, bodyDia: 40, oal: 90, partNo: 'BBT40-MEGA-E12C-90' },
                    { taper: 'BT40', bore: 20, bodyDia: 50, oal: 100, partNo: 'BBT40-MEGA-E20C-100' },
                    { taper: 'CAT40', bore: 6, bodyDia: 32, oal: 80, partNo: 'CAT40-MEGA-E6C-80' },
                    { taper: 'CAT40', bore: 12, bodyDia: 40, oal: 90, partNo: 'CAT40-MEGA-E12C-90' },
                    { taper: 'CAT40', bore: 20, bodyDia: 50, oal: 100, partNo: 'CAT40-MEGA-E20C-100' },
                    { taper: 'HSK-A63', bore: 12, bodyDia: 40, oal: 90, partNo: 'HSK-A63-MEGA-E12C-90' },
                    { taper: 'HSK-A63', bore: 20, bodyDia: 50, oal: 110, partNo: 'HSK-A63-MEGA-E20C-110' }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // REGO-FIX COLLET SYSTEMS
        // ─────────────────────────────────────────────────────────────────────
        regofix: {
            brand: 'REGO-FIX',
            country: 'Switzerland',
            website: 'www.rego-fix.com',
            
            erColletSystem: {
                description: 'Industry standard ER collet system',
                standard: 'DIN 6499 / ISO 15488',
                
                colletSizes: {
                    ER8: { minBore: 0.5, maxBore: 5, bodyDia: 9.5, length: 14, closingNutThread: 'M10x0.75' },
                    ER11: { minBore: 0.5, maxBore: 7, bodyDia: 13.5, length: 18, closingNutThread: 'M14x0.75' },
                    ER16: { minBore: 1, maxBore: 10, bodyDia: 17.5, length: 27, closingNutThread: 'M22x1.5' },
                    ER20: { minBore: 1, maxBore: 13, bodyDia: 21, length: 31, closingNutThread: 'M25x1.5' },
                    ER25: { minBore: 2, maxBore: 16, bodyDia: 26, length: 34, closingNutThread: 'M32x1.5' },
                    ER32: { minBore: 2, maxBore: 20, bodyDia: 33, length: 40, closingNutThread: 'M40x1.5' },
                    ER40: { minBore: 3, maxBore: 26, bodyDia: 41, length: 46, closingNutThread: 'M50x1.5' },
                    ER50: { minBore: 6, maxBore: 34, bodyDia: 52, length: 60, closingNutThread: 'M63x2' }
                },
                
                colletChuckHolders: [
                    { taper: 'CAT40', erSize: 'ER16', bodyDia: 40, oal: 60, partNo: 'CAT40-ER16-60' },
                    { taper: 'CAT40', erSize: 'ER20', bodyDia: 40, oal: 70, partNo: 'CAT40-ER20-70' },
                    { taper: 'CAT40', erSize: 'ER25', bodyDia: 42, oal: 80, partNo: 'CAT40-ER25-80' },
                    { taper: 'CAT40', erSize: 'ER32', bodyDia: 50, oal: 90, partNo: 'CAT40-ER32-90' },
                    { taper: 'CAT40', erSize: 'ER40', bodyDia: 60, oal: 100, partNo: 'CAT40-ER40-100' },
                    { taper: 'CAT50', erSize: 'ER25', bodyDia: 50, oal: 100, partNo: 'CAT50-ER25-100' },
                    { taper: 'CAT50', erSize: 'ER32', bodyDia: 60, oal: 110, partNo: 'CAT50-ER32-110' },
                    { taper: 'CAT50', erSize: 'ER40', bodyDia: 70, oal: 120, partNo: 'CAT50-ER40-120' },
                    { taper: 'BT40', erSize: 'ER16', bodyDia: 40, oal: 60, partNo: 'BT40-ER16-60' },
                    { taper: 'BT40', erSize: 'ER20', bodyDia: 40, oal: 70, partNo: 'BT40-ER20-70' },
                    { taper: 'BT40', erSize: 'ER25', bodyDia: 42, oal: 80, partNo: 'BT40-ER25-80' },
                    { taper: 'BT40', erSize: 'ER32', bodyDia: 50, oal: 90, partNo: 'BT40-ER32-90' },
                    { taper: 'HSK-A63', erSize: 'ER25', bodyDia: 42, oal: 90, partNo: 'HSK-A63-ER25-90' },
                    { taper: 'HSK-A63', erSize: 'ER32', bodyDia: 50, oal: 100, partNo: 'HSK-A63-ER32-100' },
                    { taper: 'HSK-A63', erSize: 'ER40', bodyDia: 60, oal: 110, partNo: 'HSK-A63-ER40-110' }
                ]
            },
            
            powRgrip: {
                description: 'Mechanical precision clamping system',
                features: ['No heat required', '3μm runout', '10-second tool change', '100,000+ cycles'],
                maxRpm: 42000,
                balanceGrade: 'G2.5',
                clampingRanges: [
                    { size: 'PG6', range: '0.5-6', grippingLength: 9 },
                    { size: 'PG10', range: '0.5-10', grippingLength: 14 },
                    { size: 'PG15', range: '1-15', grippingLength: 20 },
                    { size: 'PG25', range: '3-25', grippingLength: 25 },
                    { size: 'PG32', range: '3-32', grippingLength: 30 }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // HAIMER TOOL HOLDERS
        // ─────────────────────────────────────────────────────────────────────
        haimer: {
            brand: 'Haimer',
            country: 'Germany',
            website: 'www.haimer.com',
            
            safeLock: {
                description: 'Pull-out prevention system for heavy machining',
                features: ['Prevents tool pull-out', 'Helical grooves on shank', 'Up to 3x holding force'],
                applications: ['High-speed milling', 'Titanium machining', 'Aerospace']
            },
            
            millAluSeries: {
                description: 'High-performance aluminum machining end mills',
                coating: 'DLC (Diamond-Like Carbon)',
                features: ['3 flutes', '45° helix', 'Polished flutes'],
                materials: ['Aluminum', 'Non-ferrous'],
                speeds: { aluminum: { min: 800, max: 2000 } },
                sizes: [
                    { dia: 4, flutes: 3, loc: 12, oal: 50, partNo: 'MILL-ALU-4-12-50' },
                    { dia: 6, flutes: 3, loc: 18, oal: 57, partNo: 'MILL-ALU-6-18-57' },
                    { dia: 8, flutes: 3, loc: 24, oal: 63, partNo: 'MILL-ALU-8-24-63' },
                    { dia: 10, flutes: 3, loc: 30, oal: 72, partNo: 'MILL-ALU-10-30-72' },
                    { dia: 12, flutes: 3, loc: 36, oal: 83, partNo: 'MILL-ALU-12-36-83' },
                    { dia: 16, flutes: 3, loc: 48, oal: 92, partNo: 'MILL-ALU-16-48-92' },
                    { dia: 20, flutes: 3, loc: 60, oal: 104, partNo: 'MILL-ALU-20-60-104' }
                ]
            },
            
            powerSeries: {
                description: 'Heavy-duty roughing and finishing end mills',
                coating: 'AlTiN',
                features: ['4-6 flutes', 'Variable helix', 'Corner radius options'],
                materials: ['Steel', 'Stainless', 'Cast iron'],
                sizes: [
                    { dia: 6, flutes: 4, loc: 16, oal: 57, partNo: 'POWER-4F-6-16-57' },
                    { dia: 8, flutes: 4, loc: 20, oal: 63, partNo: 'POWER-4F-8-20-63' },
                    { dia: 10, flutes: 4, loc: 25, oal: 72, partNo: 'POWER-4F-10-25-72' },
                    { dia: 12, flutes: 4, loc: 30, oal: 83, partNo: 'POWER-4F-12-30-83' },
                    { dia: 16, flutes: 6, loc: 40, oal: 92, partNo: 'POWER-6F-16-40-92' },
                    { dia: 20, flutes: 6, loc: 50, oal: 104, partNo: 'POWER-6F-20-50-104' }
                ]
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: WORKHOLDING (from v1)
    // ═══════════════════════════════════════════════════════════════════════════
    
    workholding: {
        orangeVise: {
            brand: 'Orange Vise',
            country: 'USA',
            website: 'www.orangevise.com',
            description: 'Precision modular vise system',
            
            products: {
                OV4: {
                    model: 'OV-4',
                    jawWidth: 4, // inches
                    jawWidthMm: 101.6,
                    maxOpening: 8, // inches
                    maxOpeningMm: 203.2,
                    clampingForce: 8000, // lbs
                    repeatability: 0.0002, // inches
                    weight: 28, // lbs
                    workEnvelope: { x: 203.2, y: 101.6, z: 76.2 } // mm
                },
                OV6: {
                    model: 'OV-6',
                    jawWidth: 6, // inches
                    jawWidthMm: 152.4,
                    maxOpening: 10, // inches
                    maxOpeningMm: 254,
                    clampingForce: 10000, // lbs
                    repeatability: 0.0002, // inches
                    weight: 42, // lbs
                    workEnvelope: { x: 254, y: 152.4, z: 101.6 } // mm
                }
            },
            
            accessories: [
                { name: 'Machinable Soft Jaws', fits: ['OV-4', 'OV-6'], material: '6061-T6' },
                { name: 'Step Jaws', fits: ['OV-4', 'OV-6'], stepHeights: [6.35, 12.7, 19.05] },
                { name: 'Parallels Set', fits: ['OV-4', 'OV-6'], heights: [3.175, 6.35, 9.525, 12.7, 15.875, 19.05, 25.4] }
            ]
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: LATHE TOOLING (from v3)
    // ═══════════════════════════════════════════════════════════════════════════
    
    latheTooling: {
        // ─────────────────────────────────────────────────────────────────────
        // GLOBAL CNC - BMT TOOLING
        // ─────────────────────────────────────────────────────────────────────
        globalCnc: {
            brand: 'Global CNC',
            country: 'USA',
            website: 'www.globalcnc.com',
            location: 'Plymouth, MI',
            stockItems: 90000,
            
            bmtToolholders: {
                bmt45: {
                    turretSize: 45,
                    compatibleMachines: ['DMG Mori NLX', 'Okuma', 'Mazak QT'],
                    
                    boringBarHolders: [
                        { partNo: 'BMT45-8420', boreDia: 0.750, boreDiaMm: 19.05, height: 65, width: 90, length: 75 },
                        { partNo: 'BMT45-8425', boreDia: 1.000, boreDiaMm: 25.4, height: 65, width: 90, length: 75 },
                        { partNo: 'BMT45-8432', boreDia: 1.250, boreDiaMm: 31.75, height: 65, width: 90, length: 75 },
                        { partNo: 'BMT45-8435', boreDia: 1.500, boreDiaMm: 38.1, height: 65, width: 90, length: 75 },
                        { partNo: 'BMT45-8420M', boreDia: 20, boreDiaInch: 0.787, height: 65, width: 90, length: 75 },
                        { partNo: 'BMT45-8425M', boreDia: 25, boreDiaInch: 0.984, height: 65, width: 90, length: 75 },
                        { partNo: 'BMT45-8432M', boreDia: 32, boreDiaInch: 1.260, height: 65, width: 90, length: 75 }
                    ],
                    
                    liveTooling: {
                        straightDrillMill: {
                            partNo: 'BMT45-ER25-SLT',
                            colletType: 'ER25',
                            clampingRange: '2-16mm',
                            maxRpm: 6000,
                            gearRatio: '1:1',
                            torque: 50,
                            coolant: 'External',
                            dimensions: { d1: 45, d2: 58, h1: 58, h2: 78.5, l1: 84, l2: 67.6 }
                        },
                        angledDrillMill: {
                            partNo: 'BMT45-ER25-90A',
                            colletType: 'ER25',
                            angle: 90,
                            maxRpm: 5000,
                            gearRatio: '1:1',
                            torque: 40,
                            coolant: 'Internal'
                        }
                    }
                },
                
                bmt55: {
                    turretSize: 55,
                    compatibleMachines: ['Mazak QTN', 'DMG Mori NLX 2500'],
                    
                    boringBarHolders: [
                        { partNo: 'BMT55-8425', boreDia: 1.000, boreDiaMm: 25.4, height: 75, width: 100, length: 90 },
                        { partNo: 'BMT55-8432', boreDia: 1.250, boreDiaMm: 31.75, height: 75, width: 100, length: 90 },
                        { partNo: 'BMT55-8440', boreDia: 1.500, boreDiaMm: 38.1, height: 75, width: 100, length: 90 },
                        { partNo: 'BMT55-8450', boreDia: 2.000, boreDiaMm: 50.8, height: 75, width: 100, length: 90 }
                    ]
                },
                
                bmt65: {
                    turretSize: 65,
                    compatibleMachines: ['Mazak Integrex', 'DMG Mori NTX'],
                    
                    boringBarHolders: [
                        { partNo: 'BMT65-8432', boreDia: 1.250, boreDiaMm: 31.75, height: 85, width: 120, length: 100 },
                        { partNo: 'BMT65-8440', boreDia: 1.500, boreDiaMm: 38.1, height: 85, width: 120, length: 100 },
                        { partNo: 'BMT65-8450', boreDia: 2.000, boreDiaMm: 50.8, height: 85, width: 120, length: 100 },
                        { partNo: 'BMT65-8460', boreDia: 2.500, boreDiaMm: 63.5, height: 85, width: 120, length: 100 }
                    ]
                }
            },
            
            vdiToolholders: {
                vdi20: {
                    shankDia: 20,
                    compatibleMachines: ['Small lathes'],
                    boringBarHolders: [
                        { partNo: 'VDI20-8410', boreDia: 10, length: 40 },
                        { partNo: 'VDI20-8412', boreDia: 12, length: 40 },
                        { partNo: 'VDI20-8416', boreDia: 16, length: 40 }
                    ]
                },
                vdi30: {
                    shankDia: 30,
                    boringBarHolders: [
                        { partNo: 'VDI30-8416', boreDia: 16, length: 50 },
                        { partNo: 'VDI30-8420', boreDia: 20, length: 50 },
                        { partNo: 'VDI30-8425', boreDia: 25, length: 50 }
                    ]
                },
                vdi40: {
                    shankDia: 40,
                    boringBarHolders: [
                        { partNo: 'VDI40-8420', boreDia: 20, length: 60 },
                        { partNo: 'VDI40-8425', boreDia: 25, length: 60 },
                        { partNo: 'VDI40-8432', boreDia: 32, length: 60 },
                        { partNo: 'VDI40-8440', boreDia: 40, length: 60 }
                    ]
                },
                vdi50: {
                    shankDia: 50,
                    boringBarHolders: [
                        { partNo: 'VDI50-8425', boreDia: 25, length: 70 },
                        { partNo: 'VDI50-8432', boreDia: 32, length: 70 },
                        { partNo: 'VDI50-8440', boreDia: 40, length: 70 },
                        { partNo: 'VDI50-8450', boreDia: 50, length: 70 }
                    ]
                }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: CUTTING PARAMETERS (from v2, v7, v8)
    // ═══════════════════════════════════════════════════════════════════════════
    
    cuttingParameters: {
        // ─────────────────────────────────────────────────────────────────────
        // OSG ADO DRILLS
        // ─────────────────────────────────────────────────────────────────────
        osg: {
            brand: 'OSG',
            country: 'Japan',
            
            adoDrills: {
                series: ['ADO-3D', 'ADO-5D', 'ADO-8D', 'ADO-10D', 'ADO-15D', 'ADO-20D', 'ADO-30D'],
                coating: 'EgiAs',
                features: ['Coolant-through', '2 flute', '30° helix', 'h6 shank'],
                pointAngle: 140,
                
                materials: {
                    carbonSteel: {
                        name: 'Carbon/Mild Steel (1010, 1050, 12L14)',
                        sfmRange: [260, 395],
                        data: [
                            { dia: 2, rpm: 15870, iprMin: 0.002, iprMax: 0.004 },
                            { dia: 3, rpm: 10580, iprMin: 0.002, iprMax: 0.005 },
                            { dia: 4, rpm: 7940, iprMin: 0.003, iprMax: 0.006 },
                            { dia: 6, rpm: 5290, iprMin: 0.005, iprMax: 0.009 },
                            { dia: 8, rpm: 3970, iprMin: 0.006, iprMax: 0.011 },
                            { dia: 10, rpm: 3170, iprMin: 0.008, iprMax: 0.012 },
                            { dia: 12, rpm: 2650, iprMin: 0.008, iprMax: 0.012 },
                            { dia: 16, rpm: 2000, iprMin: 0.010, iprMax: 0.014 },
                            { dia: 20, rpm: 1590, iprMin: 0.012, iprMax: 0.016 }
                        ]
                    },
                    alloySteel: {
                        name: 'Alloy Steel (4140, 4130)',
                        sfmRange: [260, 395],
                        data: [
                            { dia: 2, rpm: 15870, iprMin: 0.002, iprMax: 0.004 },
                            { dia: 3, rpm: 10580, iprMin: 0.002, iprMax: 0.005 },
                            { dia: 4, rpm: 7940, iprMin: 0.003, iprMax: 0.006 },
                            { dia: 6, rpm: 5290, iprMin: 0.005, iprMax: 0.009 },
                            { dia: 8, rpm: 3970, iprMin: 0.006, iprMax: 0.011 },
                            { dia: 10, rpm: 3170, iprMin: 0.008, iprMax: 0.012 },
                            { dia: 12, rpm: 2650, iprMin: 0.008, iprMax: 0.012 }
                        ]
                    },
                    stainlessSteel: {
                        name: 'Stainless Steel (300SS, 400SS, 17-4PH)',
                        sfmRange: [130, 230],
                        data: [
                            { dia: 2, rpm: 8740, iprMin: 0.002, iprMax: 0.004 },
                            { dia: 3, rpm: 5820, iprMin: 0.002, iprMax: 0.005 },
                            { dia: 4, rpm: 4370, iprMin: 0.003, iprMax: 0.006 },
                            { dia: 6, rpm: 2910, iprMin: 0.005, iprMax: 0.009 },
                            { dia: 8, rpm: 2180, iprMin: 0.006, iprMax: 0.011 },
                            { dia: 10, rpm: 1750, iprMin: 0.008, iprMax: 0.012 },
                            { dia: 12, rpm: 1460, iprMin: 0.008, iprMax: 0.012 }
                        ]
                    },
                    titanium: {
                        name: 'Titanium (Ti-6Al-4V)',
                        sfmRange: [100, 180],
                        data: [
                            { dia: 3, rpm: 3820, iprMin: 0.002, iprMax: 0.004 },
                            { dia: 4, rpm: 2860, iprMin: 0.003, iprMax: 0.005 },
                            { dia: 6, rpm: 1910, iprMin: 0.004, iprMax: 0.007 },
                            { dia: 8, rpm: 1430, iprMin: 0.005, iprMax: 0.008 },
                            { dia: 10, rpm: 1150, iprMin: 0.006, iprMax: 0.009 },
                            { dia: 12, rpm: 955, iprMin: 0.006, iprMax: 0.010 }
                        ]
                    },
                    aluminum: {
                        name: 'Aluminum (6061, 7075)',
                        sfmRange: [500, 800],
                        data: [
                            { dia: 2, rpm: 38200, iprMin: 0.003, iprMax: 0.006 },
                            { dia: 3, rpm: 25470, iprMin: 0.004, iprMax: 0.008 },
                            { dia: 4, rpm: 19100, iprMin: 0.005, iprMax: 0.010 },
                            { dia: 6, rpm: 12730, iprMin: 0.007, iprMax: 0.014 },
                            { dia: 8, rpm: 9550, iprMin: 0.009, iprMax: 0.016 },
                            { dia: 10, rpm: 7640, iprMin: 0.010, iprMax: 0.018 },
                            { dia: 12, rpm: 6370, iprMin: 0.012, iprMax: 0.020 }
                        ]
                    }
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // SGS/KYOCERA END MILLS
        // ─────────────────────────────────────────────────────────────────────
        sgs: {
            brand: 'SGS/Kyocera',
            
            zCarb: {
                XPR: {
                    description: 'eXtreme Performance Roughing',
                    flutes: [4, 5, 6, 7],
                    coating: 'Z-Coat',
                    helixAngle: 'Variable 35-40°',
                    cuttingData: {
                        steel: { sfm: [350, 500], ipt: [0.003, 0.006] },
                        stainless: { sfm: [200, 350], ipt: [0.002, 0.005] },
                        titanium: { sfm: [100, 180], ipt: [0.002, 0.004] }
                    }
                },
                AP: {
                    description: 'All Purpose',
                    flutes: [4],
                    coating: 'Z-Coat',
                    cuttingData: {
                        steel: { sfm: [300, 450], ipt: [0.002, 0.005] },
                        aluminum: { sfm: [800, 1500], ipt: [0.004, 0.010] }
                    }
                },
                HPR: {
                    description: 'High Performance Roughing',
                    flutes: [5, 6, 7],
                    coating: 'Z-Coat',
                    chipBreakers: true,
                    cuttingData: {
                        steel: { sfm: [300, 500], ipt: [0.004, 0.008] },
                        stainless: { sfm: [175, 300], ipt: [0.003, 0.006] }
                    }
                }
            },
            
            vCarb: {
                description: 'Variable helix for vibration control',
                flutes: [4, 5],
                helixAngle: 'Variable 35-38°',
                applications: ['Stainless', 'Titanium', 'HRSA']
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // CERATIZIT 7-FLUTE HEM DATA
        // ─────────────────────────────────────────────────────────────────────
        ceratizit: {
            brand: 'Ceratizit',
            
            sevenFluteHEM: {
                description: 'High Efficiency Machining with 7-flute end mills',
                
                // Material-specific cutting data
                cuttingData: {
                    lowCarbonSteels: {
                        HEM_2xD: { sfm: [600, 750], fpt: [0.0031, 0.0063], radial: '2xD' },
                        HEM_3xD: { sfm: [550, 700], fpt: [0.0027, 0.0055], radial: '3xD' }
                    },
                    mediumCarbonSteels: {
                        HEM_2xD: { sfm: [500, 650], fpt: [0.0028, 0.0055], radial: '2xD' },
                        HEM_3xD: { sfm: [450, 600], fpt: [0.0024, 0.0047], radial: '3xD' }
                    },
                    alloyAndToolSteels: {
                        HEM_2xD: { sfm: [400, 550], fpt: [0.0024, 0.0047], radial: '2xD' },
                        HEM_3xD: { sfm: [350, 500], fpt: [0.0020, 0.0039], radial: '3xD' }
                    },
                    stainlessSteel: {
                        HEM_2xD: { sfm: [300, 450], fpt: [0.0020, 0.0039], radial: '2xD' },
                        HEM_3xD: { sfm: [250, 400], fpt: [0.0016, 0.0031], radial: '3xD' }
                    },
                    titanium: {
                        HEM_2xD: { sfm: [150, 250], fpt: [0.0016, 0.0031], radial: '2xD' },
                        HEM_3xD: { sfm: [125, 200], fpt: [0.0012, 0.0024], radial: '3xD' }
                    }
                }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 5: INSERT GRADES (from v4)
    // ═══════════════════════════════════════════════════════════════════════════
    
    insertGrades: {
        kennametal: {
            brand: 'Kennametal',
            
            steelGrades: {
                isoClass: 'P',
                grades: [
                    { grade: 'KCP05', iso: 'P05', coating: 'MTCVD TiCN-Al2O3', application: 'Finishing at high speeds', sfmRange: [800, 1400] },
                    { grade: 'KCP10', iso: 'P10', coating: 'MTCVD TiCN-Al2O3', application: 'Finishing to light roughing', sfmRange: [700, 1200] },
                    { grade: 'KCP25', iso: 'P25', coating: 'MTCVD TiCN-Al2O3', application: 'General purpose steel', sfmRange: [500, 1000] },
                    { grade: 'KCP40', iso: 'P40', coating: 'MTCVD TiCN-Al2O3', application: 'Heavy interrupted cuts', sfmRange: [350, 700] },
                    { grade: 'KC5010', iso: 'P10-P25', coating: 'CVD MT-TiCN + Al2O3', application: 'General steel finishing', sfmRange: [500, 1000] },
                    { grade: 'KC5025', iso: 'P25-P35', coating: 'CVD MT-TiCN + Al2O3', application: 'Steel general purpose', sfmRange: [400, 850] }
                ]
            },
            
            stainlessGrades: {
                isoClass: 'M',
                grades: [
                    { grade: 'KC9110', iso: 'M10', coating: 'PVD TiAlN', application: 'Stainless steel finishing', sfmRange: [400, 700] },
                    { grade: 'KC9125', iso: 'M25', coating: 'PVD TiAlN', application: 'Stainless general purpose', sfmRange: [300, 550] },
                    { grade: 'KC9240', iso: 'M40', coating: 'PVD TiAlN', application: 'Interrupted stainless', sfmRange: [200, 400] }
                ]
            },
            
            castIronGrades: {
                isoClass: 'K',
                grades: [
                    { grade: 'KCK15', iso: 'K15', coating: 'CVD Al2O3', application: 'Cast iron finishing', sfmRange: [700, 1200] },
                    { grade: 'KCK20', iso: 'K20', coating: 'CVD Al2O3', application: 'Cast iron general', sfmRange: [500, 900] }
                ]
            },
            
            hrsaGrades: {
                isoClass: 'S',
                grades: [
                    { grade: 'KCS10', iso: 'S10', coating: 'PVD TiAlN', application: 'HRSA finishing', sfmRange: [80, 150] },
                    { grade: 'KCS30', iso: 'S30', coating: 'PVD TiAlN', application: 'HRSA general', sfmRange: [60, 120] }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // GRADE CROSS-REFERENCE TABLE
        // ─────────────────────────────────────────────────────────────────────
        crossReference: {
            description: 'Equivalent grades across major manufacturers',
            
            steelP25: {
                kennametal: 'KCP25',
                sandvik: 'GC4325',
                iscar: 'IC8250',
                seco: 'TP2500',
                korloy: 'PC8110'
            },
            
            stainlessM25: {
                kennametal: 'KC9125',
                sandvik: 'GC2025',
                iscar: 'IC328',
                seco: 'TM2000',
                korloy: 'PC5300'
            },
            
            castIronK20: {
                kennametal: 'KCK20',
                sandvik: 'GC3220',
                iscar: 'IC428',
                seco: 'TK2000',
                korloy: 'PC9530'
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 6: SPINDLE INTERFACES & COLLISION DATA (from v5, v6)
    // ═══════════════════════════════════════════════════════════════════════════
    
    spindleInterfaces: {
        cat: {
            standard: 'ANSI/ASME B5.50',
            taperAngle: 16.26, // degrees (7/24 taper)
            
            cat40: {
                size: 40,
                taperDiameterLarge: 44.45,
                taperDiameterSmall: 17.78,
                taperLength: 69.85,
                flangeOD: 63.5,
                flangeWidth: 15.88,
                pullStudThread: '5/8-11 UNC',
                drawbarForce: 8900, // N
                maxRPM: 12000,
                gageLineOffset: 101.6,
                
                collisionEnvelope: [
                    { z: 0, r: 31.75 },
                    { z: -15.88, r: 31.75 },
                    { z: -15.88, r: 22.225 },
                    { z: -85.73, r: 8.89 }
                ]
            },
            
            cat50: {
                size: 50,
                taperDiameterLarge: 69.85,
                taperDiameterSmall: 25.4,
                taperLength: 101.6,
                flangeOD: 101.6,
                flangeWidth: 25.4,
                pullStudThread: '1-8 UNC',
                drawbarForce: 26700, // N
                maxRPM: 8000,
                gageLineOffset: 127.0,
                
                collisionEnvelope: [
                    { z: 0, r: 50.8 },
                    { z: -25.4, r: 50.8 },
                    { z: -25.4, r: 34.925 },
                    { z: -127.0, r: 12.7 }
                ]
            }
        },
        
        bt: {
            standard: 'JIS B6339',
            taperAngle: 16.26,
            
            bt40: {
                size: 40,
                taperDiameterLarge: 44.45,
                flangeOD: 63.0,
                pullStudThread: 'MAS403 P40T',
                maxRPM: 15000,
                gageLineOffset: 101.6,
                
                collisionEnvelope: [
                    { z: 0, r: 31.5 },
                    { z: -16, r: 31.5 },
                    { z: -16, r: 22.225 },
                    { z: -85, r: 8.89 }
                ]
            }
        },
        
        hsk: {
            standard: 'DIN 69893',
            taperRatio: '1:10',
            
            hskA63: {
                form: 'A',
                size: 63,
                flangeDia: 65.0,
                maxRPM: 24000,
                drawbarForce: 40000, // N
                
                collisionEnvelope: [
                    { z: 0, r: 32.5 },
                    { z: -40, r: 32.5 },
                    { z: -40, r: 25 },
                    { z: -80, r: 12.5 }
                ]
            },
            
            hskA100: {
                form: 'A',
                size: 100,
                flangeDia: 102.0,
                maxRPM: 14000,
                drawbarForce: 80000, // N
                
                collisionEnvelope: [
                    { z: 0, r: 51 },
                    { z: -55, r: 51 },
                    { z: -55, r: 40 },
                    { z: -120, r: 20 }
                ]
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 7: ISO MATERIAL CLASSIFICATION (from v8)
    // ═══════════════════════════════════════════════════════════════════════════
    
    isoMaterials: {
        P: {
            name: 'Steel',
            color: 'Blue',
            subgroups: {
                P01: { desc: 'Non-hardened steel <45 HRC', examples: ['1018', '1020', '1045'] },
                P05: { desc: 'Easily machinable', examples: ['12L14', '11L17'] },
                P10: { desc: 'Low carbon steel', examples: ['1008', '1010', '1015'] },
                P15: { desc: 'Medium carbon steel', examples: ['1040', '1045', '1050'] },
                P20: { desc: 'Alloy steel', examples: ['4140', '4340', '8620'] },
                P25: { desc: 'General purpose', examples: ['4130', '4142'] },
                P30: { desc: 'Low alloy steel', examples: ['4135', '4137'] },
                P35: { desc: 'Tool steel', examples: ['A2', 'D2', 'O1'] }
            }
        },
        M: {
            name: 'Stainless Steel',
            color: 'Yellow',
            subgroups: {
                M05: { desc: 'Austenitic stainless', examples: ['304', '316', '321'] },
                M10: { desc: 'Super austenitic', examples: ['254 SMO', '904L'] },
                M15: { desc: 'Martensitic stainless', examples: ['410', '420', '440C'] },
                M20: { desc: 'Precipitation hardening', examples: ['17-4PH', '15-5PH'] },
                M25: { desc: 'Duplex stainless', examples: ['2205', '2507'] }
            }
        },
        K: {
            name: 'Cast Iron',
            color: 'Red',
            subgroups: {
                K01: { desc: 'Gray cast iron', examples: ['Class 20', 'Class 30'] },
                K05: { desc: 'Malleable iron', examples: ['32510', '35018'] },
                K10: { desc: 'Nodular/ductile', examples: ['65-45-12', '80-55-06'] },
                K15: { desc: 'Compacted graphite', examples: ['CGI 350', 'CGI 400'] }
            }
        },
        N: {
            name: 'Non-ferrous',
            color: 'Green',
            subgroups: {
                N01: { desc: 'Wrought aluminum', examples: ['6061', '7075', '2024'] },
                N05: { desc: 'Cast aluminum', examples: ['A356', 'A380', '319'] },
                N10: { desc: 'Copper alloys', examples: ['C360', 'C110', 'C544'] },
                N15: { desc: 'Magnesium', examples: ['AZ31', 'AZ91'] }
            }
        },
        S: {
            name: 'Heat Resistant Superalloys',
            color: 'Orange',
            subgroups: {
                S01: { desc: 'Iron-based superalloys', examples: ['A-286', 'Incoloy 901'] },
                S05: { desc: 'Nickel-based', examples: ['Inconel 718', 'Inconel 625', 'Waspaloy'] },
                S10: { desc: 'Cobalt-based', examples: ['Stellite 6', 'Haynes 25'] },
                S15: { desc: 'Titanium alloys', examples: ['Ti-6Al-4V', 'Ti-6Al-2Sn-4Zr-2Mo'] }
            }
        },
        H: {
            name: 'Hardened Steel',
            color: 'Gray',
            subgroups: {
                H01: { desc: 'Hardened steel 45-55 HRC', examples: ['Hardened 4140', 'Hardened D2'] },
                H05: { desc: 'Hardened steel 55-60 HRC', examples: ['Hardened A2', 'Hardened S7'] },
                H10: { desc: 'Hardened steel 60-65 HRC', examples: ['CPM M4', 'Vanadis 4E'] },
                H15: { desc: 'Chilled cast iron', examples: ['Ni-Hard'] }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    utils: {
        /**
         * Get tool holder by manufacturer and part number
         */
        getToolHolder: function(manufacturer, partNo) {
            const mfr = manufacturer.toLowerCase();
            const holders = PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.toolHolders[mfr];
            if (!holders) return null;
            
            // Search through all holder types
            for (const [type, data] of Object.entries(holders)) {
                if (data.models) {
                    const found = data.models.find(m => m.partNo === partNo || m.edp === partNo);
                    if (found) return { ...found, manufacturer, type };
                }
            }
            return null;
        },
        
        /**
         * Get cutting parameters by manufacturer, tool type, and material
         */
        getCuttingParams: function(manufacturer, toolType, material) {
            const mfr = manufacturer.toLowerCase();
            const params = PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.cuttingParameters[mfr];
            if (!params) return null;
            
            const tool = params[toolType];
            if (!tool || !tool.materials) return null;
            
            return tool.materials[material] || null;
        },
        
        /**
         * Get equivalent grade across manufacturers
         */
        getEquivalentGrade: function(fromMfr, fromGrade, toMfr) {
            const xref = PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.insertGrades.crossReference;
            
            for (const [category, grades] of Object.entries(xref)) {
                if (grades[fromMfr.toLowerCase()] === fromGrade) {
                    return grades[toMfr.toLowerCase()] || null;
                }
            }
            return null;
        },
        
        /**
         * Get ISO material classification
         */
        getISOClass: function(materialName) {
            const materials = PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.isoMaterials;
            
            for (const [isoClass, data] of Object.entries(materials)) {
                for (const [subgroup, info] of Object.entries(data.subgroups)) {
                    if (info.examples.some(ex => materialName.toLowerCase().includes(ex.toLowerCase()))) {
                        return { iso: isoClass, subgroup, ...info };
                    }
                }
            }
            return null;
        },
        
        /**
         * Generate collision envelope for tool assembly
         */
        generateAssemblyEnvelope: function(holderEnvelope, toolDia, toolLength, stickout) {
            const envelope = [...holderEnvelope];
            
            // Add tool body to envelope
            envelope.push(
                { z: stickout, r: toolDia / 2 },
                { z: stickout + toolLength, r: toolDia / 2 }
            );
            
            return envelope;
        },
        
        /**
         * Check if point is inside collision envelope
         */
        pointInEnvelope: function(envelope, z, r) {
            for (let i = 0; i < envelope.length - 1; i++) {
                const p1 = envelope[i];
                const p2 = envelope[i + 1];
                
                if (z >= p1.z && z <= p2.z) {
                    const t = (z - p1.z) / (p2.z - p1.z);
                    const rAtZ = p1.r + t * (p2.r - p1.r);
                    return r <= rAtZ;
                }
            }
            return false;
        },
        
        /**
         * Get statistics about catalog data
         */
        getStats: function() {
            const holders = PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.toolHolders;
            const params = PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.cuttingParameters;
            const grades = PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.insertGrades;
            
            let holderCount = 0;
            let gradeCount = 0;
            
            // Count holders
            for (const mfr of Object.values(holders)) {
                for (const type of Object.values(mfr)) {
                    if (type.models) holderCount += type.models.length;
                    if (type.specifications) holderCount += type.specifications.length;
                }
            }
            
            // Count grades
            for (const [mfr, data] of Object.entries(grades)) {
                if (mfr === 'crossReference') continue;
                for (const category of Object.values(data)) {
                    if (category.grades) gradeCount += category.grades.length;
                }
            }
            
            return {
                version: PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.version,
                toolHolderManufacturers: Object.keys(holders).length,
                totalToolHolders: holderCount,
                cuttingParamManufacturers: Object.keys(params).length,
                insertGrades: gradeCount,
                isoMaterialClasses: Object.keys(PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.isoMaterials).length
            };
        }
    }
}