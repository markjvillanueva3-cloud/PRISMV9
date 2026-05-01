// PRISM Machines CORE Index
// Extracted from monolith v8.89.002
// Date: 2026-01-20
// Session: 1.A.2 - CORE Machine Database Extraction

const MACHINES_CORE_INDEX = {
  version: '1.0.0',
  extractionDate: '2026-01-20',
  sourceMonolith: 'PRISM_v8_89_002_TRUE_100_PERCENT.html',
  totalDatabases: 7,
  totalLines: 4489,
  
  databases: {
    'PRISM_MACHINE_3D_MODEL_DATABASE_V2': {
      file: 'PRISM_MACHINE_3D_MODEL_DATABASE_V2.js',
      lineStart: 54009,
      lineEnd: 54610,
      lines: 602,
      description: '68 Integrated Machine Models with 3D CAD references',
      manufacturers: ['Brother', 'DATRON', 'DN Solutions', 'Heller', 'Hurco', 'Kern', 'Makino', 'Matsuura']
    },
    'PRISM_MACHINE_3D_MODEL_DATABASE_V3': {
      file: 'PRISM_MACHINE_3D_MODEL_DATABASE_V3.js',
      lineStart: 54607,
      lineEnd: 56915,
      lines: 2309,
      description: '108 Integrated Machine Models - expanded version',
      manufacturers: ['Brother', 'DATRON', 'DN Solutions', 'Heller', 'Hurco', 'Kern', 'Makino', 'Matsuura', 'Mazak', 'Mitsubishi', 'Okuma']
    },
    'PRISM_LATHE_V2_MACHINE_DATABASE_V2': {
      file: 'PRISM_LATHE_V2_MACHINE_DATABASE_V2.js',
      lineStart: 120970,
      lineEnd: 121270,
      lines: 301,
      description: 'Lathe machine specifications with spindle motor torque curves',
      manufacturers: ['Haas', 'Okuma', 'Mazak', 'DMG Mori']
    },
    'PRISM_POST_MACHINE_DATABASE': {
      file: 'PRISM_POST_MACHINE_DATABASE.js',
      lineStart: 136160,
      lineEnd: 136795,
      lines: 636,
      description: 'Machine configurations for post processor generation',
      manufacturers: ['Universal']
    },
    'PRISM_LATHE_MACHINE_DB': {
      file: 'PRISM_LATHE_MACHINE_DB.js',
      lineStart: 278622,
      lineEnd: 278925,
      lines: 304,
      description: 'Comprehensive lathe machine database with cutting parameters',
      manufacturers: ['Haas', 'Okuma', 'Mazak']
    },
    'PRISM_MACHINE_3D_DATABASE': {
      file: 'PRISM_MACHINE_3D_DATABASE.js',
      lineStart: 319279,
      lineEnd: 319340,
      lines: 62,
      description: '68+ machines with full kinematic specs, work envelopes, and STEP file refs',
      machines: ['Okuma MULTUS B250II', 'Haas VF-2', 'Hurco VM30i', 'Hurco VMX42i', 'DN Solutions DVF series', 'Kern Evo/Pyramid', 'Makino D200Z/DA300', 'Matsuura MX series', 'Datron NEO/M8Cube', 'Brother SPEEDIO series']
    },
    'PRISM_OKUMA_MACHINE_CAD_DATABASE': {
      file: 'PRISM_OKUMA_MACHINE_CAD_DATABASE.js',
      lineStart: 529636,
      lineEnd: 529910,
      lines: 275,
      description: 'Okuma-specific CAD data with component breakdowns',
      manufacturers: ['Okuma']
    }
  },
  
  // Consumer requirements per architecture spec
  consumers: {
    required: 12,
    defined: [
      'PRISM_SPEED_FEED_CALCULATOR',
      'PRISM_COLLISION_ENGINE',
      'PRISM_POST_PROCESSOR_GENERATOR',
      'PRISM_CHATTER_PREDICTION',
      'PRISM_CYCLE_TIME_PREDICTOR',
      'PRISM_COST_ESTIMATOR',
      'PRISM_SCHEDULING_ENGINE',
      'PRISM_QUOTING_ENGINE',
      'PRISM_CAPABILITY_MATCHER',
      'PRISM_3D_VISUALIZATION',
      'PRISM_AI_LEARNING_PIPELINE',
      'PRISM_EXPLAINABLE_AI'
    ]
  }
};

// Export
if (typeof module !== 'undefined') module.exports = MACHINES_CORE_INDEX;
if (typeof window !== 'undefined') window.MACHINES_CORE_INDEX = MACHINES_CORE_INDEX;
