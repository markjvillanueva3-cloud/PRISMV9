/**
 * PRISM Machine Databases - Index
 * Updated: 2026-01-20 | Session: 0.EXT.2f
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * DATABASE SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * ENHANCED TIER (Full Kinematics):
 *   - 21 manufacturer databases
 *   - 213+ machines with complete collision geometry
 *   - Full kinematic chains for TCPC/RTCP
 *   - Rotary axis specifications (pivot points, torque, limits)
 * 
 * BASIC TIER (Standard Specs):
 *   - 8 original databases
 *   - 813+ machines from 60+ manufacturers
 *   - Basic specifications for general use
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════════════
// ENHANCED DATABASE INDEX (21 Manufacturers, 213+ Machines)
// ═══════════════════════════════════════════════════════════════════════════════════════

export const ENHANCED_MACHINE_DATABASE_INDEX = {
    
    // AMERICAN MANUFACTURERS
    'PRISM_HAAS_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Haas Automation',
        country: 'USA',
        machines: 40,
        types: ['VMC', 'HMC', '5AXIS', 'LATHE', 'MILL_TURN'],
        minConsumers: 15
    },
    'PRISM_HURCO_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_HURCO_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Hurco',
        country: 'USA',
        machines: 11,
        types: ['VMC', '5AXIS', 'LATHE'],
        minConsumers: 10
    },
    'PRISM_HARDINGE_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_HARDINGE_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Hardinge',
        country: 'USA',
        machines: 8,
        types: ['LATHE', 'VMC', '5AXIS'],
        minConsumers: 10
    },
    
    // JAPANESE MANUFACTURERS
    'PRISM_MAZAK_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_MAZAK_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Yamazaki Mazak',
        country: 'Japan',
        machines: 15,
        types: ['VMC', 'HMC', '5AXIS', 'LATHE', 'MILL_TURN'],
        minConsumers: 12
    },
    'PRISM_OKUMA_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_OKUMA_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Okuma',
        country: 'Japan',
        machines: 9,
        types: ['VMC', 'HMC', '5AXIS', 'LATHE'],
        minConsumers: 12
    },
    'PRISM_MAKINO_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_MAKINO_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Makino',
        country: 'Japan',
        machines: 12,
        types: ['VMC', 'HMC', '5AXIS'],
        minConsumers: 12
    },
    'PRISM_FANUC_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_FANUC_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'FANUC',
        country: 'Japan',
        machines: 5,
        types: ['DRILL_TAP', '5AXIS'],
        minConsumers: 10
    },
    'PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Matsuura',
        country: 'Japan',
        machines: 4,
        types: ['5AXIS', 'VMC', 'HMC'],
        minConsumers: 10
    },
    'PRISM_BROTHER_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_BROTHER_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Brother',
        country: 'Japan',
        machines: 10,
        types: ['DRILL_TAP', 'VMC', '5AXIS'],
        minConsumers: 10
    },
    'PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Kitamura',
        country: 'Japan',
        machines: 8,
        types: ['VMC', 'HMC', '5AXIS'],
        minConsumers: 10
    },
    'PRISM_YASDA_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_YASDA_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Yasda',
        country: 'Japan',
        machines: 5,
        types: ['VMC', '5AXIS'],
        specialty: 'Ultra-precision',
        minConsumers: 8
    },
    'PRISM_TOYODA_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_TOYODA_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'JTEKT (Toyoda)',
        country: 'Japan',
        machines: 7,
        types: ['HMC', 'VMC', '5AXIS'],
        minConsumers: 10
    },
    
    // GERMAN MANUFACTURERS
    'PRISM_DMG_MORI_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_DMG_MORI_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'DMG MORI',
        country: 'Germany/Japan',
        machines: 15,
        types: ['VMC', 'HMC', '5AXIS', 'LATHE', 'MILL_TURN'],
        minConsumers: 12
    },
    'PRISM_HERMLE_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_HERMLE_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Hermle',
        country: 'Germany',
        machines: 8,
        types: ['5AXIS'],
        specialty: 'Premium 5-axis',
        minConsumers: 10
    },
    'PRISM_GROB_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_GROB_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'GROB',
        country: 'Germany',
        machines: 6,
        types: ['5AXIS'],
        specialty: 'Horizontal 5-axis',
        minConsumers: 10
    },
    'PRISM_CHIRON_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_CHIRON_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Chiron',
        country: 'Germany',
        machines: 8,
        types: ['VMC', '5AXIS'],
        specialty: 'High-speed',
        minConsumers: 10
    },
    'PRISM_SPINNER_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_SPINNER_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Spinner',
        country: 'Germany',
        machines: 6,
        types: ['VMC', '5AXIS', 'LATHE'],
        minConsumers: 8
    },
    'PRISM_KERN_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_KERN_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Kern',
        country: 'Germany',
        machines: 5,
        types: ['5AXIS'],
        specialty: 'Micro-precision',
        minConsumers: 8
    },
    
    // SWISS MANUFACTURERS
    'PRISM_MIKRON_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_MIKRON_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Mikron (GF Machining)',
        country: 'Switzerland',
        machines: 7,
        types: ['VMC', '5AXIS'],
        minConsumers: 10
    },
    
    // KOREAN MANUFACTURERS
    'PRISM_DOOSAN_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_DOOSAN_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Doosan (DN Solutions)',
        country: 'South Korea',
        machines: 14,
        types: ['VMC', '5AXIS', 'HMC', 'LATHE', 'MILL_TURN'],
        minConsumers: 10
    },
    'PRISM_HYUNDAI_WIA_MACHINE_DATABASE_ENHANCED': {
        file: 'PRISM_HYUNDAI_WIA_MACHINE_DATABASE_ENHANCED_v2.js',
        manufacturer: 'Hyundai-Wia',
        country: 'South Korea',
        machines: 10,
        types: ['VMC', '5AXIS', 'HMC', 'LATHE', 'MILL_TURN'],
        minConsumers: 10
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// BASIC DATABASE INDEX (Original Databases - 813+ Machines)
// ═══════════════════════════════════════════════════════════════════════════════════════

export const BASIC_MACHINE_DATABASE_INDEX = {
    'PRISM_POST_MACHINE_DATABASE': {
        file: 'PRISM_POST_MACHINE_DATABASE.js',
        lines: 8197,
        machines: 813,
        manufacturers: 61,
        description: 'Primary machine database with 813+ machines from 61 manufacturers',
        minConsumers: 12
    },
    'PRISM_LATHE_MACHINE_DB': {
        file: 'PRISM_LATHE_MACHINE_DB.js',
        lines: 1635,
        description: 'Lathe specifications',
        minConsumers: 8
    },
    'PRISM_LATHE_V2_MACHINE_DATABASE_V2': {
        file: 'PRISM_LATHE_V2_MACHINE_DATABASE_V2.js',
        lines: 1488,
        description: 'Lathe V2 specifications',
        minConsumers: 8
    },
    'PRISM_MACHINE_3D_DATABASE': {
        file: 'PRISM_MACHINE_3D_DATABASE.js',
        description: '3D machine models',
        minConsumers: 10
    },
    'PRISM_MACHINE_3D_MODEL_DATABASE_V2': {
        file: 'PRISM_MACHINE_3D_MODEL_DATABASE_V2.js',
        lines: 599,
        description: '3D models V2',
        minConsumers: 8
    },
    'PRISM_MACHINE_3D_MODEL_DATABASE_V3': {
        file: 'PRISM_MACHINE_3D_MODEL_DATABASE_V3.js',
        lines: 588,
        description: '3D models V3',
        minConsumers: 8
    },
    'PRISM_OKUMA_MACHINE_CAD_DATABASE': {
        file: 'PRISM_OKUMA_MACHINE_CAD_DATABASE.js',
        lines: 863,
        description: 'Okuma CAD models',
        minConsumers: 8
    },
    'PRISM_CONTROLLER_DATABASE': {
        file: 'PRISM_CONTROLLER_DATABASE.js',
        lines: 1493,
        description: 'CNC controller specifications',
        minConsumers: 10
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════════════

export const MACHINE_SCHEMA = {
    file: 'MACHINE_SCHEMA_ENHANCED_v2.js',
    version: '2.0.0',
    description: 'Complete schema for ENHANCED machine database structure'
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════════════

export const MACHINE_DATABASE_STATS = {
    enhanced: {
        totalManufacturers: 21,
        totalMachines: 213,
        countryCoverage: ['USA', 'Japan', 'Germany', 'Switzerland', 'South Korea'],
        machineTypes: ['VMC', 'HMC', '5AXIS', 'LATHE', 'MILL_TURN', 'DRILL_TAP']
    },
    basic: {
        totalManufacturers: 61,
        totalMachines: 813,
        databases: 8
    },
    combined: {
        totalMachines: 1026,
        totalFiles: 30
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// COMBINED INDEX (For backwards compatibility)
// ═══════════════════════════════════════════════════════════════════════════════════════

export const MACHINE_DATABASE_INDEX = {
    ...ENHANCED_MACHINE_DATABASE_INDEX,
    ...BASIC_MACHINE_DATABASE_INDEX
};
