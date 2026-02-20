// PRISM_OKUMA_MACHINE_CAD_DATABASE v1.0
// 35 Okuma machine models from uploaded STEP files
const PRISM_OKUMA_MACHINE_CAD_DATABASE = {
  version: '1.0.0',
  manufacturer: 'OKUMA',
  modelCount: 35,
  source: 'Uploaded CAD Files',
  priority: 'uploaded_cad',

  machines: {
    'okuma_genos_m460_ve_e': {
      manufacturer: 'OKUMA', source: 'OKUMA GENOS M460-VE-e.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 3953600, facesEstimate: 8 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "z axis head:1", "y axis table:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_genos_m560_v_e': {
      manufacturer: 'OKUMA', source: 'OKUMA GENOS M560-V-e.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 3490664, facesEstimate: 4 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "z axis head (1):1", "y axis table:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_genos_m560_va_hc': {
      manufacturer: 'OKUMA', source: 'OKUMA GENOS M560-VA-HC.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 6736475, facesEstimate: 3 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["Base:1", "Enclosure:1", "X-Axis:1", "Y-Axis:1", "Z-Axis:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_genos_m660_va': {
      manufacturer: 'OKUMA', source: 'OKUMA GENOS M660-VA.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 4352805, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "y_axis_table:1", "x_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_genos_m660_vb': {
      manufacturer: 'OKUMA', source: 'OKUMA GENOS M660-VB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 4321652, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "y_axis_table:1", "x_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_ma_500hii': {
      manufacturer: 'OKUMA', source: 'OKUMA MA-500HII.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1202994, facesEstimate: 0 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "b axis table:1", "x axis head:1", "y axis head:1", "z axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_ma_550vb': {
      manufacturer: 'OKUMA', source: 'OKUMA MA-550VB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1474783, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "x axis table:1", "y axis head:1", "z axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_ma_600h': {
      manufacturer: 'OKUMA', source: 'OKUMA MA-600H.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1440815, facesEstimate: 0 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "z axis table:1", "b axis table:1", "x axis head:1", "y axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_ma_600hii': {
      manufacturer: 'OKUMA', source: 'OKUMA MA-600HII.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1991944, facesEstimate: 0 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "z axis table:1", "b axis table:1", "x axis head:1", "y axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_ma_650vb': {
      manufacturer: 'OKUMA', source: 'OKUMA MA-650VB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1544962, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "x axis table:1", "z axis head:1", "y axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_4000h': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-4000H.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1615051, facesEstimate: 14 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "x axis head:1", "y axis head:1", "z axis table:1", "b axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_46vae': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-46VAE.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 2421514, facesEstimate: 6 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "y axis table:1", "z axis head:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_5000h': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-5000H.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1645688, facesEstimate: 14 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "y axis head:1", "x axis head:1", "z axis table:1", "b axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_56va': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-56VA.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 865762, facesEstimate: 6 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["y axis table:1", "static:1", "z axis head:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_66va': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-66VA.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1311818, facesEstimate: 6 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "y axis table:1", "x axis table:1", "z axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_8000h': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-8000H.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 2222609, facesEstimate: 2 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "z axis table:1", "b axis table:1", "x axis head:1", "y axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mcr_a5cii_25x40': {
      manufacturer: 'OKUMA', source: 'OKUMA MCR-A5CII 25x40.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 709658, facesEstimate: 33 },
      specs: { type: 'DOUBLE_COLUMN' },
      assemblies: ["static:1", "x_axis_table:1", "y_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mcr_biii_25e_25x40': {
      manufacturer: 'OKUMA', source: 'OKUMA MCR-BIII 25E 25x40.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1278590, facesEstimate: 33 },
      specs: { type: 'DOUBLE_COLUMN' },
      assemblies: ["static:1", "x_axis_table:1", "y_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mcr_biii_25e_25x50': {
      manufacturer: 'OKUMA', source: 'OKUMA MCR-BIII 25E 25x50.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1353469, facesEstimate: 33 },
      specs: { type: 'DOUBLE_COLUMN' },
      assemblies: ["static:1", "x_axis_head:1", "y_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mcr_biii_35e_35x65': {
      manufacturer: 'OKUMA', source: 'OKUMA MCR-BIII 35E 35x65.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1495191, facesEstimate: 32 },
      specs: { type: 'DOUBLE_COLUMN' },
      assemblies: ["static:1", "x_axis_table:1", "y_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_millac_1052vii': {
      manufacturer: 'OKUMA', source: 'OKUMA MILLAC 1052VII.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1128685, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "z axis head:1", "x axis table:1", "y axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_millac_33t': {
      manufacturer: 'OKUMA', source: 'OKUMA MILLAC 33T.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 963103, facesEstimate: 0 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "y axis head:1", "x axis head:1", "z axis head:1", "c axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_millac_761vii': {
      manufacturer: 'OKUMA', source: 'OKUMA MILLAC 761VII.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1734668, facesEstimate: 8 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "z axis head:1", "x axis table:1", "y axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_millac_800vh': {
      manufacturer: 'OKUMA', source: 'OKUMA MILLAC 800VH.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1813208, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "c_axis_table:1", "y_axis_table:1", "x_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_millac_852vii': {
      manufacturer: 'OKUMA', source: 'OKUMA MILLAC 852VII.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1247917, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "y axis table:1", "x axis table:1", "z axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_4000v': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-4000V.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 4831784, facesEstimate: 12 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "b_axis_table:1", "c_axis_table:1", "x_axis_head:1", "y_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_400va': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-400VA.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 3472840, facesEstimate: 8 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "a axis table:1", "c axis table:1", "y axis table:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_5000v': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-5000V.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 8056755, facesEstimate: 5 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "x_axis_table:1", "a_axis_table:1", "c_axis_table:1", "y_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_500va': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-500VA.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 4547921, facesEstimate: 0 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "y axis table:1", "c axis table:1", "a axis table:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_500val': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-500VAL.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1926397, facesEstimate: 0 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "y axis table:1", "a axis table:1", "c axis table:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_6300v': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-6300V.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 7035407, facesEstimate: 8 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "x_axis_table:1", "a_axis_table:1", "c_axis_table:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_8000v': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-8000V.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 5904083, facesEstimate: 2 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "x axis table:1", "a axis table:1", "c axis table:1", "y axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_vtm_1200yb': {
      manufacturer: 'OKUMA', source: 'OKUMA VTM-1200YB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1778198, facesEstimate: 0 },
      specs: { type: 'VTL_MILL_TURN' },
      assemblies: ["table1250 v1:1", "static:1", "c axis table:1", "x axis head:1", "z axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_vtm_2000yb': {
      manufacturer: 'OKUMA', source: 'OKUMA VTM-2000YB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 8808466, facesEstimate: 0 },
      specs: { type: 'VTL_MILL_TURN' },
      assemblies: ["static:1", "c_axis_table:1", "x_axis_head:1", "z_axis_head:1", "y_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_vtm_80yb': {
      manufacturer: 'OKUMA', source: 'OKUMA VTM-80YB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1223120, facesEstimate: 0 },
      specs: { type: 'VTL_MILL_TURN' },
      assemblies: ["static:1", "x axis head:1", "z axis head:1", "y axis head:1", "b axis head:1"],
      collisionZones: 'auto_detected'
    }
  },
  getMachine(modelId) {
    const key = modelId.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
    return this.machines[key] || this.machines['okuma_' + key] || null;
  },
  listMachines() {
    return Object.keys(this.machines).map(k => ({ id: k, ...this.machines[k] }));
  },
  getByType(machineType) {
    return Object.entries(this.machines)
      .filter(([k, v]) => v.specs.type === machineType)
      .map(([k, v]) => ({ id: k, ...v }));
  }
};
// PRISM_STEP_ASSEMBLY_PARSER v1.0
// Parses STEP files to extract assembly structure for collision detection
const PRISM_STEP_ASSEMBLY_PARSER = {
  version: '1.0.0',

  // Component name patterns for collision zone identification
