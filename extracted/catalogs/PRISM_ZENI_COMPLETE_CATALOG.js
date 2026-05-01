/**
 * PRISM_ZENI_COMPLETE_CATALOG
 * Extracted from PRISM v8.89.002 monolith
 * References: 16
 * Category: catalogs
 * Lines: 993
 * Session: R2.3.6 Catalog/MIT Extraction
 */

const PRISM_ZENI_COMPLETE_CATALOG = {
  version: '3.0.0',
  lastUpdated: '2026-01-06',
  manufacturer: {
    name: 'Zeni Tools',
    country: 'USA',
    quality: 'Professional',
    specialty: 'Value High-Performance',
    priceLevel: 2,
    website: 'zenitools.com',
    description: 'American-designed, high-quality cutting tools at competitive prices'
  },
  // 1. TURNING TOOLS - Complete Line

  turning: {

    // TURNING INSERTS
    inserts: {

      // CNMG - 80° Diamond Negative
      'ZENI-CNMG': {
        name: 'CNMG Turning Insert',
        isoCode: 'CNMG',
        shape: 'diamond_80',
        type: 'negative',
        inscribedCircle: { metric: [9.525, 12.7, 15.875, 19.05], inch: [0.375, 0.5, 0.625, 0.75] },
        thickness: { metric: [3.18, 4.76, 6.35], inch: [0.125, 0.1875, 0.25] },
        cornerRadius: { metric: [0.4, 0.8, 1.2, 1.6], inch: [0.016, 0.031, 0.047, 0.063] },
        chipbreakers: ['MF', 'MM', 'MR', 'PM', 'PR'],  // Finishing, Medium, Roughing
        grades: [
          { name: 'ZC25', iso: 'P25', coating: 'CVD', application: 'steel_general', color: 'gold' },
          { name: 'ZC15', iso: 'P15', coating: 'CVD', application: 'steel_finishing', color: 'gold' },
          { name: 'ZC35', iso: 'P35', coating: 'CVD', application: 'steel_roughing', color: 'gold' },
          { name: 'ZM20', iso: 'M20', coating: 'PVD', application: 'stainless', color: 'purple' },
          { name: 'ZK20', iso: 'K20', coating: 'CVD', application: 'cast_iron', color: 'black' }
        ],
        cuttingData: {
          steel_p: { vc: { min: 150, max: 350 }, fn: { min: 0.15, max: 0.5 }, ap: { min: 0.5, max: 5.0 } },
          stainless_m: { vc: { min: 100, max: 250 }, fn: { min: 0.1, max: 0.4 }, ap: { min: 0.5, max: 4.0 } },
          cast_iron_k: { vc: { min: 150, max: 400 }, fn: { min: 0.15, max: 0.6 }, ap: { min: 0.5, max: 6.0 } }
        },
        sizes: [
          'CNMG090304', 'CNMG090308', 'CNMG090312',
          'CNMG120404', 'CNMG120408', 'CNMG120412', 'CNMG120416',
          'CNMG160608', 'CNMG160612', 'CNMG160616',
          'CNMG190612', 'CNMG190616', 'CNMG190624'
        ],
        priceRange: { min: 4.50, max: 12.00 },
        geometry3D: {
          type: 'turning_insert',
          shape: 'CNMG',
          parameters: ['ic', 'thickness', 'corner_radius', 'relief_angle'],
          meshResolution: { radial: 24, vertical: 8 }
        }
      },
      // WNMG - 80° Trigon Negative
      'ZENI-WNMG': {
        name: 'WNMG Turning Insert',
        isoCode: 'WNMG',
        shape: 'trigon_80',
        type: 'negative',
        inscribedCircle: { metric: [6.35, 9.525], inch: [0.25, 0.375] },
        thickness: { metric: [4.76, 6.35], inch: [0.1875, 0.25] },
        cornerRadius: { metric: [0.4, 0.8, 1.2], inch: [0.016, 0.031, 0.047] },
        chipbreakers: ['MF', 'MM', 'MR'],
        grades: [
          { name: 'ZC25', iso: 'P25', coating: 'CVD', application: 'steel_general' },
          { name: 'ZM20', iso: 'M20', coating: 'PVD', application: 'stainless' }
        ],
        sizes: [
          'WNMG060404', 'WNMG060408',
          'WNMG080404', 'WNMG080408', 'WNMG080412'
        ],
        priceRange: { min: 4.00, max: 10.00 },
        geometry3D: { type: 'turning_insert', shape: 'WNMG' }
      },
      // DNMG - 55° Diamond Negative
      'ZENI-DNMG': {
        name: 'DNMG Turning Insert',
        isoCode: 'DNMG',
        shape: 'diamond_55',
        type: 'negative',
        inscribedCircle: { metric: [9.525, 12.7, 15.875], inch: [0.375, 0.5, 0.625] },
        chipbreakers: ['MF', 'MM', 'MR'],
        grades: [
          { name: 'ZC25', iso: 'P25' },
          { name: 'ZM20', iso: 'M20' }
        ],
        sizes: [
          'DNMG110404', 'DNMG110408',
          'DNMG150404', 'DNMG150408', 'DNMG150412', 'DNMG150416',
          'DNMG150604', 'DNMG150608', 'DNMG150612'
        ],
        priceRange: { min: 4.50, max: 11.00 },
        geometry3D: { type: 'turning_insert', shape: 'DNMG' }
      },
      // VNMG - 35° Diamond Negative
      'ZENI-VNMG': {
        name: 'VNMG Turning Insert',
        isoCode: 'VNMG',
        shape: 'diamond_35',
        type: 'negative',
        inscribedCircle: { metric: [9.525, 12.7], inch: [0.375, 0.5] },
        chipbreakers: ['MF', 'MM'],
        grades: [
          { name: 'ZC25', iso: 'P25' },
          { name: 'ZC15', iso: 'P15' }
        ],
        sizes: [
          'VNMG160404', 'VNMG160408',
          'VNMG160408', 'VNMG160412'
        ],
        priceRange: { min: 5.00, max: 12.00 },
        geometry3D: { type: 'turning_insert', shape: 'VNMG' }
      },
      // CCMT - 80° Diamond Positive
      'ZENI-CCMT': {
        name: 'CCMT Turning Insert',
        isoCode: 'CCMT',
        shape: 'diamond_80',
        type: 'positive',
        inscribedCircle: { metric: [6.35, 9.525, 12.7], inch: [0.25, 0.375, 0.5] },
        chipbreakers: ['F', 'M', 'P'],
        grades: [
          { name: 'ZC25', iso: 'P25' },
          { name: 'ZC15', iso: 'P15' },
          { name: 'ZM20', iso: 'M20' }
        ],
        sizes: [
          'CCMT060204', 'CCMT060208',
          'CCMT09T304', 'CCMT09T308',
          'CCMT120404', 'CCMT120408'
        ],
        priceRange: { min: 3.50, max: 9.00 },
        geometry3D: { type: 'turning_insert', shape: 'CCMT' }
      },
      // DCMT - 55° Diamond Positive
      'ZENI-DCMT': {
        name: 'DCMT Turning Insert',
        isoCode: 'DCMT',
        shape: 'diamond_55',
        type: 'positive',
        inscribedCircle: { metric: [6.35, 9.525, 12.7], inch: [0.25, 0.375, 0.5] },
        chipbreakers: ['F', 'M'],
        grades: [
          { name: 'ZC25', iso: 'P25' },
          { name: 'ZC15', iso: 'P15' }
        ],
        sizes: [
          'DCMT070204', 'DCMT070208',
          'DCMT11T304', 'DCMT11T308',
          'DCMT11T308', 'DCMT11T312'
        ],
        priceRange: { min: 3.50, max: 9.00 },
        geometry3D: { type: 'turning_insert', shape: 'DCMT' }
      },
      // TCMT - Triangle Positive
      'ZENI-TCMT': {
        name: 'TCMT Turning Insert',
        isoCode: 'TCMT',
        shape: 'triangle',
        type: 'positive',
        inscribedCircle: { metric: [9.525, 12.7, 16.5], inch: [0.375, 0.5, 0.65] },
        chipbreakers: ['F', 'M'],
        grades: [
          { name: 'ZC25', iso: 'P25' },
          { name: 'ZM20', iso: 'M20' }
        ],
        sizes: [
          'TCMT110204', 'TCMT110208',
          'TCMT16T304', 'TCMT16T308'
        ],
        priceRange: { min: 4.00, max: 10.00 },
        geometry3D: { type: 'turning_insert', shape: 'TCMT' }
      },
      // TNMG - Triangle Negative
      'ZENI-TNMG': {
        name: 'TNMG Turning Insert',
        isoCode: 'TNMG',
        shape: 'triangle',
        type: 'negative',
        inscribedCircle: { metric: [9.525, 12.7, 16.5, 22], inch: [0.375, 0.5, 0.65, 0.866] },
        chipbreakers: ['MF', 'MM', 'MR'],
        grades: [
          { name: 'ZC25', iso: 'P25' },
          { name: 'ZC35', iso: 'P35' },
          { name: 'ZK20', iso: 'K20' }
        ],
        sizes: [
          'TNMG160404', 'TNMG160408', 'TNMG160412',
          'TNMG220404', 'TNMG220408', 'TNMG220412', 'TNMG220416'
        ],
        priceRange: { min: 4.50, max: 11.00 },
        geometry3D: { type: 'turning_insert', shape: 'TNMG' }
      },
      // SNMG - Square Negative
      'ZENI-SNMG': {
        name: 'SNMG Turning Insert',
        isoCode: 'SNMG',
        shape: 'square',
        type: 'negative',
        inscribedCircle: { metric: [9.525, 12.7, 15.875, 19.05], inch: [0.375, 0.5, 0.625, 0.75] },
        chipbreakers: ['MR', 'MH'],  // Roughing, Heavy
        grades: [
          { name: 'ZC35', iso: 'P35' },
          { name: 'ZK20', iso: 'K20' }
        ],
        sizes: [
          'SNMG120408', 'SNMG120412', 'SNMG120416',
          'SNMG150612', 'SNMG150616', 'SNMG150624',
          'SNMG190612', 'SNMG190616', 'SNMG190624'
        ],
        priceRange: { min: 5.00, max: 14.00 },
        geometry3D: { type: 'turning_insert', shape: 'SNMG' }
      }
    },
    // EXTERNAL TURNING HOLDERS
    externalHolders: {

      // MCLNR/L - 95° for CNMG
      'ZENI-MCLNR': {
        name: 'MCLNR External Holder',
        style: 'MCLNR',
        insertCompatibility: ['CNMG'],
        leadAngle: 95,
        handedness: ['R', 'L'],
        shankSizes: {
          inch: ['5/8', '3/4', '1', '1-1/4', '1-1/2'],
          metric: [16, 20, 25, 32, 40]
        },
        insertSizes: ['12', '16', '19'],
        clamping: 'lever_lock',
        coolantThru: true,
        models: [
          'MCLNR-123B', 'MCLNR-124B', 'MCLNR-164C', 'MCLNR-164D',
          'MCLNR-204C', 'MCLNR-204D', 'MCLNR-254D', 'MCLNR-254E'
        ],
        priceRange: { min: 45, max: 120 },
        geometry3D: {
          type: 'turning_holder',
          style: 'external',
          parameters: ['shank_width', 'shank_height', 'length', 'insert_pocket']
        }
      },
      // DWLNR/L - 95° for WNMG
      'ZENI-DWLNR': {
        name: 'DWLNR External Holder',
        style: 'DWLNR',
        insertCompatibility: ['WNMG'],
        leadAngle: 95,
        handedness: ['R', 'L'],
        shankSizes: { inch: ['5/8', '3/4', '1', '1-1/4'] },
        insertSizes: ['06', '08'],
        clamping: 'double_clamp',
        coolantThru: true,
        models: [
          'DWLNR-123B', 'DWLNR-124B', 'DWLNR-164C', 'DWLNR-164D'
        ],
        priceRange: { min: 40, max: 100 },
        geometry3D: { type: 'turning_holder', style: 'external' }
      },
      // MTJNR/L - 93° for TNMG
      'ZENI-MTJNR': {
        name: 'MTJNR External Holder',
        style: 'MTJNR',
        insertCompatibility: ['TNMG'],
        leadAngle: 93,
        handedness: ['R', 'L'],
        shankSizes: { inch: ['5/8', '3/4', '1', '1-1/4', '1-1/2'] },
        insertSizes: ['16', '22'],
        clamping: 'lever_lock',
        coolantThru: true,
        models: [
          'MTJNR-123B', 'MTJNR-164C', 'MTJNR-164D', 'MTJNR-205D', 'MTJNR-256E'
        ],
        priceRange: { min: 45, max: 130 },
        geometry3D: { type: 'turning_holder', style: 'external' }
      },
      // PDJNR/L - 93° for DNMG
      'ZENI-PDJNR': {
        name: 'PDJNR External Holder',
        style: 'PDJNR',
        insertCompatibility: ['DNMG'],
        leadAngle: 93,
        handedness: ['R', 'L'],
        shankSizes: { inch: ['5/8', '3/4', '1', '1-1/4'] },
        insertSizes: ['11', '15'],
        clamping: 'pin_lock',
        coolantThru: true,
        models: [
          'PDJNR-123B', 'PDJNR-164C', 'PDJNR-164D', 'PDJNR-205D'
        ],
        priceRange: { min: 42, max: 110 },
        geometry3D: { type: 'turning_holder', style: 'external' }
      },
      // SVJBR/L - 93° for VNMG
      'ZENI-SVJBR': {
        name: 'SVJBR External Holder',
        style: 'SVJBR',
        insertCompatibility: ['VNMG', 'VBMT'],
        leadAngle: 93,
        handedness: ['R', 'L'],
        shankSizes: { inch: ['5/8', '3/4', '1'] },
        insertSizes: ['16'],
        clamping: 'screw_on',
        coolantThru: false,
        models: [
          'SVJBR-123B', 'SVJBR-164C', 'SVJBR-164D'
        ],
        priceRange: { min: 38, max: 95 },
        geometry3D: { type: 'turning_holder', style: 'external' }
      },
      // SCLCR/L - 95° for CCMT
      'ZENI-SCLCR': {
        name: 'SCLCR External Holder',
        style: 'SCLCR',
        insertCompatibility: ['CCMT', 'CCGT'],
        leadAngle: 95,
        handedness: ['R', 'L'],
        shankSizes: { inch: ['3/8', '1/2', '5/8', '3/4', '1'] },
        insertSizes: ['06', '09', '12'],
        clamping: 'screw_on',
        coolantThru: true,
        models: [
          'SCLCR-062', 'SCLCR-082', 'SCLCR-103B', 'SCLCR-123B', 'SCLCR-164C'
        ],
        priceRange: { min: 32, max: 85 },
        geometry3D: { type: 'turning_holder', style: 'external' }
      },
      // SDNCN - 45° for CNMG/SNMG Facing
      'ZENI-SDNCN': {
        name: 'SDNCN Facing Holder',
        style: 'SDNCN',
        insertCompatibility: ['SNMG', 'CNMG'],
        leadAngle: 45,
        handedness: ['N'],  // Neutral
        shankSizes: { inch: ['3/4', '1', '1-1/4', '1-1/2'] },
        insertSizes: ['12', '15', '19'],
        clamping: 'lever_lock',
        coolantThru: true,
        application: 'facing',
        models: [
          'SDNCN-124B', 'SDNCN-165D', 'SDNCN-206D', 'SDNCN-256E'
        ],
        priceRange: { min: 48, max: 135 },
        geometry3D: { type: 'turning_holder', style: 'facing' }
      }
    },
    // BORING BARS
    boringBars: {

      // Steel Shank Boring Bars
      'ZENI-BORING-STEEL': {
        name: 'Steel Shank Boring Bar',
        material: 'steel',
        shankDiameters: {
          inch: [0.375, 0.500, 0.625, 0.750, 1.000, 1.250, 1.500, 2.000],
          metric: [10, 12, 16, 20, 25, 32, 40, 50]
        },
        minBore: { multiplier: 1.3 },  // Min bore = 1.3 x shank diameter
        overhangs: ['3xD', '4xD', '5xD'],
        insertStyles: ['CCMT', 'DCMT', 'TCMT', 'VCMT'],
        coolantThru: true,
        series: [
          { style: 'S-SCLCR', insert: 'CCMT', angle: 95 },
          { style: 'S-SDUCR', insert: 'DCMT', angle: 93 },
          { style: 'S-STUPR', insert: 'TCMT', angle: 91 },
          { style: 'A-SVUCR', insert: 'VCMT', angle: 93 }
        ],
        models: [
          'S06K-SCLCR06', 'S08M-SCLCR06', 'S10M-SCLCR09', 'S12M-SCLCR09',
          'S16Q-SCLCR09', 'S20R-SCLCR12', 'S25S-SCLCR12', 'S32T-SCLCR12',
          'S06K-SDUCR07', 'S08M-SDUCR11', 'S10M-SDUCR11', 'S12M-SDUCR11',
          'S16Q-SDUCR11', 'S20R-SDUCR11'
        ],
        priceRange: { min: 28, max: 95 },
        geometry3D: {
          type: 'boring_bar',
          material: 'steel',
          parameters: ['shank_diameter', 'length', 'insert_pocket', 'coolant_holes']
        }
      },
      // Carbide Shank Boring Bars (for extended reach)
      'ZENI-BORING-CARBIDE': {
        name: 'Carbide Shank Boring Bar',
        material: 'solid_carbide',
        shankDiameters: {
          inch: [0.250, 0.312, 0.375, 0.500, 0.625, 0.750],
          metric: [6, 8, 10, 12, 16, 20]
        },
        minBore: { multiplier: 1.2 },
        overhangs: ['5xD', '6xD', '7xD', '8xD'],
        insertStyles: ['CCMT', 'DCMT'],
        coolantThru: true,
        vibrationDamping: false,
        models: [
          'C04H-SCLCR03', 'C05J-SCLCR06', 'C06K-SCLCR06', 'C08M-SCLCR06',
          'C10M-SCLCR09', 'C12M-SCLCR09', 'C16Q-SCLCR09'
        ],
        priceRange: { min: 85, max: 280 },
        geometry3D: { type: 'boring_bar', material: 'carbide' }
      },
      // Heavy Metal (Tungsten) Boring Bars
      'ZENI-BORING-TUNGSTEN': {
        name: 'Heavy Metal Boring Bar',
        material: 'tungsten_alloy',
        shankDiameters: {
          inch: [0.500, 0.625, 0.750, 1.000, 1.250],
          metric: [12, 16, 20, 25, 32]
        },
        overhangs: ['6xD', '8xD', '10xD'],
        insertStyles: ['CCMT', 'DCMT', 'TCMT'],
        coolantThru: true,
        vibrationDamping: true,
        models: [
          'W12M-SCLCR09', 'W16Q-SCLCR09', 'W20R-SCLCR12', 'W25S-SCLCR12', 'W32T-SCLCR12'
        ],
        priceRange: { min: 180, max: 550 },
        geometry3D: { type: 'boring_bar', material: 'tungsten' }
      }
    },
    // GROOVING & PARTING
    grooving: {

      'ZENI-GROOVING': {
        name: 'Grooving/Parting System',
        types: ['face_grooving', 'od_grooving', 'id_grooving', 'parting'],
        insertWidths: { metric: [2, 2.5, 3, 4, 5, 6], inch: [0.078, 0.094, 0.118, 0.157, 0.197, 0.236] },
        maxDepth: { metric: [15, 20, 25, 30], inch: [0.59, 0.79, 0.98, 1.18] },
        holders: [
          'ZGFHR-1616-3', 'ZGFHR-2020-3', 'ZGFHR-2020-4', 'ZGFHR-2525-4', 'ZGFHR-2525-5',
          'ZGFHL-1616-3', 'ZGFHL-2020-3', 'ZGFHL-2020-4'
        ],
        blades: [
          'ZGTB26-2', 'ZGTB26-3', 'ZGTB26-4', 'ZGTB32-3', 'ZGTB32-4', 'ZGTB32-5'
        ],
        inserts: [
          'ZGTN-2-P', 'ZGTN-3-P', 'ZGTN-4-P', 'ZGTN-5-P', 'ZGTN-6-P'
        ],
        priceRange: { inserts: { min: 6, max: 18 }, holders: { min: 55, max: 150 } },
        geometry3D: { type: 'grooving_system' }
      }
    },
    // THREADING
    threading: {

      'ZENI-THREADING-EXT': {
        name: 'External Threading System',
        insertTypes: ['16ER', '16IR', '22ER', '22IR', '27ER', '27IR'],
        threadForms: ['UN', 'ISO', 'BSPT', 'NPT', 'ACME', 'Trapezoidal'],
        pitchRanges: {
          UN: [4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 18, 20, 24, 27, 28, 32, 36, 40, 48, 56, 64],
          ISO: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]
        },
        holders: [
          'SER-1212-16', 'SER-1616-16', 'SER-2020-16', 'SER-2020-22', 'SER-2525-22', 'SER-2525-27'
        ],
        grades: ['ZC25', 'ZC15', 'ZM20'],
        priceRange: { inserts: { min: 8, max: 22 }, holders: { min: 48, max: 125 } },
        geometry3D: { type: 'threading_system' }
      },
      'ZENI-THREADING-INT': {
        name: 'Internal Threading System',
        insertTypes: ['11IR', '16IR', '22IR'],
        minBore: { metric: [10, 16, 22], inch: [0.4, 0.63, 0.87] },
        threadForms: ['UN', 'ISO', 'BSPT', 'NPT'],
        holders: [
          'SNR0010K11', 'SNR0012M11', 'SNR0016Q16', 'SNR0020R16', 'SNR0025S16'
        ],
        priceRange: { inserts: { min: 9, max: 24 }, holders: { min: 52, max: 140 } },
        geometry3D: { type: 'threading_system' }
      }
    }
  },
  // 2. HIGH FEED MILLING

  highFeed: {

    // SOLID CARBIDE HIGH FEED
    solidCarbide: {

      'ZENI-HIGHFEED-4FL': {
        name: 'High Feed End Mill 4 Flute',
        type: 'high_feed',
        geometry: 'high_feed',
        flutes: [4],
        substrate: 'submicron_carbide',
        coatings: ['AlTiN', 'nACo'],
        helixAngle: [42],
        maxDoc: 0.020,  // Shallow DOC
        maxFpt: 0.025,  // High feed per tooth
        cornerRadius: 'built_in',
        sizes: {
          inch: [0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.000],
          metric: [6, 8, 10, 12, 16, 20, 25]
        },
        cuttingData: {
          steel_p: { sfm: 550, fpt: 0.012, doc: 0.015, woc: 0.6 },
          stainless_m: { sfm: 380, fpt: 0.010, doc: 0.012, woc: 0.5 },
          cast_iron_k: { sfm: 600, fpt: 0.015, doc: 0.018, woc: 0.65 },
          titanium: { sfm: 180, fpt: 0.006, doc: 0.008, woc: 0.4 }
        },
        priceRange: { min: 35, max: 145 },
        geometry3D: {
          type: 'endmill',
          profile: 'high_feed',
          parameters: ['diameter', 'flute_count', 'helix', 'corner_radius', 'loc', 'oal']
        }
      },
      'ZENI-HIGHFEED-5FL': {
        name: 'High Feed End Mill 5 Flute',
        type: 'high_feed',
        geometry: 'high_feed',
        flutes: [5],
        substrate: 'submicron_carbide',
        coatings: ['AlTiN', 'nACo'],
        helixAngle: [42],
        variableHelix: true,
        maxDoc: 0.020,
        maxFpt: 0.028,
        sizes: {
          inch: [0.375, 0.500, 0.625, 0.750, 1.000, 1.250],
          metric: [10, 12, 16, 20, 25, 32]
        },
        cuttingData: {
          steel_p: { sfm: 580, fpt: 0.014, doc: 0.015, woc: 0.65 },
          stainless_m: { sfm: 400, fpt: 0.011, doc: 0.012, woc: 0.55 },
          cast_iron_k: { sfm: 630, fpt: 0.016, doc: 0.018, woc: 0.7 }
        },
        priceRange: { min: 45, max: 180 },
        geometry3D: { type: 'endmill', profile: 'high_feed' }
      },
      'ZENI-HIGHFEED-6FL': {
        name: 'High Feed End Mill 6 Flute',
        type: 'high_feed',
        geometry: 'high_feed',
        flutes: [6],
        substrate: 'submicron_carbide',
        coatings: ['AlTiN', 'nACo'],
        helixAngle: [42],
        variableHelix: true,
        variablePitch: true,
        maxDoc: 0.020,
        maxFpt: 0.030,
        sizes: {
          inch: [0.500, 0.625, 0.750, 1.000, 1.250],
          metric: [12, 16, 20, 25, 32]
        },
        cuttingData: {
          steel_p: { sfm: 600, fpt: 0.015, doc: 0.015, woc: 0.7 },
          stainless_m: { sfm: 420, fpt: 0.012, doc: 0.012, woc: 0.6 }
        },
        priceRange: { min: 55, max: 210 },
        geometry3D: { type: 'endmill', profile: 'high_feed' }
      }
    }
  },
  // 3. INDEXABLE MILLING

  indexableMilling: {

    // FACE MILLS
    faceMills: {

      'ZENI-FACEMILL-45': {
        name: '45° Face Mill',
        type: 'face_mill',
        leadAngle: 45,
        insertCompatibility: ['SEKN', 'SEKT', 'SEHT'],
        insertPockets: [4, 5, 6, 7, 8, 10, 12],
        bodyDiameters: {
          inch: [2.0, 2.5, 3.0, 4.0, 5.0, 6.0],
          metric: [50, 63, 80, 100, 125, 160]
        },
        arborTypes: ['arbor', 'shell_mill'],
        coolantThru: true,
        maxDoc: 0.200,
        maxRpm: 8000,
        bodies: [
          'ZFM45-200-R4', 'ZFM45-250-R5', 'ZFM45-300-R6', 'ZFM45-400-R8', 'ZFM45-500-R10', 'ZFM45-600-R12'
        ],
        inserts: {
          'SEKN-1203': { edges: 4, ic: 12.7, thickness: 3.18 },
          'SEKT-1203': { edges: 4, ic: 12.7, thickness: 3.18 },
          'SEHT-1204': { edges: 4, ic: 12.7, thickness: 4.76 }
        },
        grades: ['ZC25', 'ZC35', 'ZM20', 'ZK20'],
        priceRange: { bodies: { min: 120, max: 450 }, inserts: { min: 6, max: 14 } },
        geometry3D: {
          type: 'face_mill',
          parameters: ['body_diameter', 'pocket_count', 'lead_angle', 'arbor_size']
        }
      },
      'ZENI-FACEMILL-90': {
        name: '90° Square Shoulder Face Mill',
        type: 'face_mill',
        leadAngle: 90,
        insertCompatibility: ['APKT', 'APMT', 'AOMT'],
        insertPockets: [3, 4, 5, 6, 7, 8],
        bodyDiameters: {
          inch: [1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0],
          metric: [25, 32, 40, 50, 63, 80, 100]
        },
        arborTypes: ['weldon', 'arbor', 'shell_mill'],
        coolantThru: true,
        maxDoc: 0.400,
        bodies: [
          'ZFM90-100-W3', 'ZFM90-125-W4', 'ZFM90-150-W4', 'ZFM90-200-A5', 'ZFM90-250-A6', 'ZFM90-300-A7', 'ZFM90-400-A8'
        ],
        inserts: {
          'APKT-1003': { edges: 2, ic: 6.35, thickness: 3.5 },
          'APKT-1604': { edges: 2, ic: 9.525, thickness: 4.76 },
          'APMT-1135': { edges: 2, ic: 6.35, thickness: 3.5 },
          'AOMT-1236': { edges: 2, ic: 6.35, thickness: 3.5 }
        },
        grades: ['ZC25', 'ZC15', 'ZM20'],
        priceRange: { bodies: { min: 85, max: 380 }, inserts: { min: 5, max: 12 } },
        geometry3D: { type: 'face_mill', parameters: ['body_diameter', 'pocket_count', 'lead_angle'] }
      },
      'ZENI-HIGHFEED-MILL': {
        name: 'High Feed Face Mill',
        type: 'high_feed_mill',
        leadAngle: 17,  // Very shallow for high feed
        insertCompatibility: ['LNMU', 'LOMU'],
        insertPockets: [3, 4, 5, 6, 7, 8],
        bodyDiameters: {
          inch: [1.0, 1.25, 1.5, 2.0, 2.5, 3.0],
          metric: [25, 32, 40, 50, 63, 80]
        },
        maxDoc: 0.050,  // Shallow DOC
        maxFpt: 0.080,  // Very high feed
        coolantThru: true,
        bodies: [
          'ZHFM-100-W3', 'ZHFM-125-W4', 'ZHFM-150-W4', 'ZHFM-200-A5', 'ZHFM-250-A6', 'ZHFM-300-A7'
        ],
        inserts: {
          'LNMU-0303': { edges: 4, ic: 3.97, thickness: 3.5, maxDoc: 1.0 },
          'LOMU-0605': { edges: 4, ic: 6.35, thickness: 5.0, maxDoc: 1.2 }
        },
        grades: ['ZC25', 'ZC35'],
        priceRange: { bodies: { min: 110, max: 420 }, inserts: { min: 7, max: 16 } },
        geometry3D: { type: 'high_feed_mill' }
      }
    },
    // SHOULDER MILLS
    shoulderMills: {

      'ZENI-SHOULDER-90': {
        name: '90° Shoulder Mill',
        type: 'shoulder_mill',
        leadAngle: 90,
        insertCompatibility: ['APKT', 'APMT', 'ADKT'],
        insertPockets: [2, 3, 4, 5, 6],
        bodyDiameters: {
          inch: [0.500, 0.625, 0.750, 1.000, 1.250, 1.500, 2.000],
          metric: [12, 16, 20, 25, 32, 40, 50]
        },
        shankTypes: ['weldon', 'straight'],
        maxDoc: 0.500,
        coolantThru: true,
        bodies: [
          'ZSM90-050-W2', 'ZSM90-062-W2', 'ZSM90-075-W3', 'ZSM90-100-W3',
          'ZSM90-125-W4', 'ZSM90-150-W5', 'ZSM90-200-W6'
        ],
        inserts: {
          'APKT-1003': { edges: 2, maxDoc: 10 },
          'APKT-1604': { edges: 2, maxDoc: 15 },
          'ADKT-1505': { edges: 2, maxDoc: 12 }
        },
        priceRange: { bodies: { min: 65, max: 280 }, inserts: { min: 5, max: 12 } },
        geometry3D: { type: 'shoulder_mill' }
      }
    },
    // SLOT MILLS
    slotMills: {

      'ZENI-SLOTMILL': {
        name: 'Slot Mill / Side Mill',
        type: 'slot_mill',
        insertCompatibility: ['SPMT', 'SOMT'],
        insertPockets: [2, 3, 4],
        bodyDiameters: {
          inch: [0.500, 0.625, 0.750, 1.000, 1.250, 1.500],
          metric: [12, 16, 20, 25, 32, 40]
        },
        widths: {
          inch: [0.125, 0.156, 0.187, 0.250, 0.312, 0.375],
          metric: [3, 4, 5, 6, 8, 10]
        },
        bodies: [
          'ZSLT-050-125-W2', 'ZSLT-062-156-W2', 'ZSLT-075-187-W3', 'ZSLT-100-250-W3'
        ],
        inserts: {
          'SPMT-060304': { edges: 4, width: 3 },
          'SOMT-090308': { edges: 4, width: 3 }
        },
        priceRange: { bodies: { min: 55, max: 220 }, inserts: { min: 5, max: 11 } },
        geometry3D: { type: 'slot_mill' }
      }
    },
    // INDEXABLE DRILLS
    indexableDrills: {

      'ZENI-INDEXABLE-DRILL': {
        name: 'Indexable Insert Drill',
        type: 'indexable_drill',
        insertCompatibility: ['SPMT', 'WCMX', 'SOMT'],
        diameterRange: {
          inch: { min: 0.531, max: 2.000 },
          metric: { min: 14, max: 50 }
        },
        depthCapability: ['2xD', '3xD', '4xD', '5xD'],
        coolantThru: true,
        pilotConfiguration: ['peripheral', 'central'],
        bodies: [
          'ZID-0531-2D', 'ZID-0625-2D', 'ZID-0750-3D', 'ZID-0875-3D', 'ZID-1000-3D',
          'ZID-1000-4D', 'ZID-1250-4D', 'ZID-1500-5D', 'ZID-2000-5D'
        ],
        inserts: {
          'SPMT-060304-P': { position: 'peripheral', edges: 4 },
          'SPMT-060304-C': { position: 'central', edges: 4 },
          'WCMX-050308-P': { position: 'peripheral', edges: 2 },
          'WCMX-050308-C': { position: 'central', edges: 2 }
        },
        priceRange: { bodies: { min: 95, max: 320 }, inserts: { min: 8, max: 18 } },
        geometry3D: { type: 'indexable_drill', parameters: ['body_diameter', 'flute_length', 'depth_ratio'] }
      }
    }
  },
  // 4. 3D MODEL GENERATOR

  geometry3DGenerator: {

    // Generate turning insert 3D mesh
    generateTurningInsert(insertCode, params = {}) {
      const shapes = {
        'C': { type: 'diamond', angle: 80, vertices: this._diamondVertices(80) },
        'D': { type: 'diamond', angle: 55, vertices: this._diamondVertices(55) },
        'V': { type: 'diamond', angle: 35, vertices: this._diamondVertices(35) },
        'T': { type: 'triangle', angle: 60, vertices: this._triangleVertices() },
        'S': { type: 'square', angle: 90, vertices: this._squareVertices() },
        'W': { type: 'trigon', angle: 80, vertices: this._trigonVertices(80) },
        'R': { type: 'round', vertices: this._roundVertices() }
      };
      const shapeCode = insertCode.charAt(0);
      const shape = shapes[shapeCode];

      if (!shape) return null;

      // Parse insert code for dimensions
      const ic = params.ic || this._parseIC(insertCode);
      const thickness = params.thickness || this._parseThickness(insertCode);
      const cornerRadius = params.cornerRadius || this._parseCornerRadius(insertCode);

      // Generate 3D mesh
      const vertices = [];
      const normals = [];
      const faces = [];

      // Top face
      const topZ = thickness / 2;
      const bottomZ = -thickness / 2;

      // Scale vertices by IC
      const scaledTop = shape.vertices.map(v => [v[0] * ic / 2, v[1] * ic / 2, topZ]);
      const scaledBottom = shape.vertices.map(v => [v[0] * ic / 2, v[1] * ic / 2, bottomZ]);

      // Add relief angle (typically 0° for negative, 7° for positive)
      const reliefAngle = insertCode.includes('N') ? 0 : 7;

      return {
        shape: shape.type,
        ic: ic,
        thickness: thickness,
        cornerRadius: cornerRadius,
        vertices: [...scaledTop, ...scaledBottom],
        boundingBox: {
          min: [-ic/2, -ic/2, bottomZ],
          max: [ic/2, ic/2, topZ]
        },
        reliefAngle: reliefAngle
      };
    },
    // Generate holder 3D mesh
    generateHolder(holderType, params) {
      const { shankWidth, shankHeight, length } = params;

      // Simple rectangular shank
      const vertices = [
        // Front face
        [-shankWidth/2, -shankHeight/2, 0],
        [shankWidth/2, -shankHeight/2, 0],
        [shankWidth/2, shankHeight/2, 0],
        [-shankWidth/2, shankHeight/2, 0],
        // Back face
        [-shankWidth/2, -shankHeight/2, -length],
        [shankWidth/2, -shankHeight/2, -length],
        [shankWidth/2, shankHeight/2, -length],
        [-shankWidth/2, shankHeight/2, -length]
      ];

      return {
        type: holderType,
        vertices: vertices,
        boundingBox: {
          min: [-shankWidth/2, -shankHeight/2, -length],
          max: [shankWidth/2, shankHeight/2, 0]
        }
      };
    },
    // Generate boring bar 3D mesh
    generateBoringBar(params) {
      const { diameter, length, material } = params;
      const r = diameter / 2;
      const resolution = 24;

      const vertices = [];

      // Generate cylindrical body
      for (let i = 0; i <= resolution; i++) {
        const theta = (i / resolution) * Math.PI * 2;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);

        // Front
        vertices.push([x, y, 0]);
        // Back
        vertices.push([x, y, -length]);
      }
      return {
        type: 'boring_bar',
        material: material,
        diameter: diameter,
        length: length,
        vertices: vertices,
        boundingBox: {
          min: [-r, -r, -length],
          max: [r, r, 0]
        }
      };
    },
    // Generate face mill body 3D mesh
    generateFaceMill(params) {
      const { diameter, pockets, height } = params;
      const r = diameter / 2;
      const resolution = 36;

      const vertices = [];

      // Main body (cylinder)
      for (let i = 0; i <= resolution; i++) {
        const theta = (i / resolution) * Math.PI * 2;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        vertices.push([x, y, 0]);
        vertices.push([x, y, -height]);
      }
      // Insert pocket locations
      const pocketPositions = [];
      for (let i = 0; i < pockets; i++) {
        const angle = (i / pockets) * Math.PI * 2;
        pocketPositions.push({
          x: (r - 5) * Math.cos(angle),
          y: (r - 5) * Math.sin(angle),
          angle: angle
        });
      }
      return {
        type: 'face_mill',
        diameter: diameter,
        pocketCount: pockets,
        height: height,
        vertices: vertices,
        pocketPositions: pocketPositions,
        boundingBox: {
          min: [-r, -r, -height],
          max: [r, r, 0]
        }
      };
    },
    // Helper functions for shape vertices
    _diamondVertices(angle) {
      const rad = (angle / 2) * Math.PI / 180;
      const rad2 = (180 - angle) / 2 * Math.PI / 180;
      return [
        [0, 1],
        [Math.sin(rad), Math.cos(rad)],
        [0, -1],
        [-Math.sin(rad), Math.cos(rad)]
      ];
    },
    _triangleVertices() {
      return [
        [0, 1],
        [0.866, -0.5],
        [-0.866, -0.5]
      ];
    },
    _squareVertices() {
      return [
        [-0.707, 0.707],
        [0.707, 0.707],
        [0.707, -0.707],
        [-0.707, -0.707]
      ];
    },
    _trigonVertices(angle) {
      return this._diamondVertices(angle);  // Similar to diamond
    },
    _roundVertices(resolution = 24) {
      const verts = [];
      for (let i = 0; i < resolution; i++) {
        const theta = (i / resolution) * Math.PI * 2;
        verts.push([Math.cos(theta), Math.sin(theta)]);
      }
      return verts;
    },
    _parseIC(code) {
      // Parse inscribed circle from ISO code
      const match = code.match(/\d{2}/);
      if (match) {
        const num = parseInt(match[0]);
        if (num <= 16) return num;  // Metric IC
        return num / 10;  // May need conversion
      }
      return 12.7;  // Default 1/2"
    },
    _parseThickness(code) {
      // Default thickness based on IC
      return 4.76;  // 3/16" typical
    },
    _parseCornerRadius(code) {
      // Last two digits often indicate corner radius
      const match = code.match(/\d{2}$/);
      if (match) {
        const num = parseInt(match[0]);
        return num / 10;  // mm
      }
      return 0.8;  // Default
    }
  },
  // STATISTICS & UTILITIES

  getStats() {
    const stats = {
      turning: {
        insertStyles: Object.keys(this.turning.inserts).length,
        totalInsertSizes: 0,
        holderStyles: Object.keys(this.turning.externalHolders).length,
        boringBarTypes: Object.keys(this.turning.boringBars).length
      },
      highFeed: {
        solidCarbideSeries: Object.keys(this.highFeed.solidCarbide).length
      },
      indexable: {
        faceMillSeries: Object.keys(this.indexableMilling.faceMills).length,
        shoulderMillSeries: Object.keys(this.indexableMilling.shoulderMills).length,
        slotMillSeries: Object.keys(this.indexableMilling.slotMills).length,
        drillSeries: Object.keys(this.indexableMilling.indexableDrills).length
      }
    };
    // Count total insert sizes
    for (const insert of Object.values(this.turning.inserts)) {
      stats.turning.totalInsertSizes += insert.sizes?.length || 0;
    }
    return stats;
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_ZENI_COMPLETE_CATALOG] Initializing complete Zeni Tools catalog...');

    const stats = this.getStats();
    console.log('[ZENI] ✓ Turning Inserts: ' + stats.turning.insertStyles + ' styles, ' +
                stats.turning.totalInsertSizes + ' sizes');
    console.log('[ZENI] ✓ Turning Holders: ' + stats.turning.holderStyles + ' styles');
    console.log('[ZENI] ✓ Boring Bars: ' + stats.turning.boringBarTypes + ' types');
    console.log('[ZENI] ✓ High Feed Mills: ' + stats.highFeed.solidCarbideSeries + ' series');
    console.log('[ZENI] ✓ Indexable Mills: ' +
                (stats.indexable.faceMillSeries + stats.indexable.shoulderMillSeries +
                 stats.indexable.slotMillSeries) + ' series');
    console.log('[ZENI] ✓ Indexable Drills: ' + stats.indexable.drillSeries + ' series');

    // Register global functions
    window.getZeniTurningInsert = (code) => this.turning.inserts['ZENI-' + code.substring(0, 4)];
    window.getZeniHolder = (style) => this.turning.externalHolders['ZENI-' + style] ||
                                      this.turning.boringBars['ZENI-' + style];
    window.generateZeniInsert3D = (code, params) => this.geometry3DGenerator.generateTurningInsert(code, params);
    window.generateZeniHolder3D = (type, params) => this.geometry3DGenerator.generateHolder(type, params);

    console.log('[PRISM_ZENI_COMPLETE_CATALOG] v2.0 - Complete Zeni Tools catalog ready');

    return this;
  }
}