const PRISM_MACHINE_3D_MODELS = {
  uploadedModels: {
    // Hurco Batch 3 (Uploaded CAD - January 2026)
    'hurco_vc600i': {
      source: 'Hurco VC600i.step', manufacturer: 'Hurco', model: 'VC600i', type: '3axis',
      geometry: { faces: 8067, points: 184564 }, priority: 'uploaded'
    },
    'hurco_vmx42i_uploaded': {
      source: 'Hurco VMX42i.step', manufacturer: 'Hurco', model: 'VMX42i', type: '3axis',
      geometry: { faces: 9005, points: 163119 }, priority: 'uploaded'
    },
    'hurco_vmx42swi': {
      source: 'Hurco VMX 42 SWi.step', manufacturer: 'Hurco', model: 'VMX42 SWi', type: '5axis',
      geometry: { faces: 9079, points: 166130 }, priority: 'uploaded'
    },
    'hurco_vmx42srti': {
      source: 'Hurco VMX42SRTi.step', manufacturer: 'Hurco', model: 'VMX42SRTi', type: '5axis',
      geometry: { faces: 9808, points: 171968 }, priority: 'uploaded'
    },
    'hurco_vmx64ti': {
      source: 'Hurco VMX64Ti.step', manufacturer: 'Hurco', model: 'VMX64Ti', type: '5axis',
      geometry: { faces: 8627, points: 183912 }, priority: 'uploaded'
    },
  },
  version: '1.0.0',

  // BUILT-IN MACHINE MODELS (metadata + simplified mesh data)
  builtInModels: {
    'okuma_genos_m460v-5ax': {
      id: 'okuma_genos_m460v-5ax',
      manufacturer: 'Okuma',
      model: 'GENOS M460V-5AX',
      type: '5-axis_vmc',
      source: 'user_upload',
      fileFormat: 'STEP',
      fileSize: 4237205,

      // Assembly structure (kinematic chain)
      components: [
        { id: 'static', name: 'Base/Frame', type: 'fixed', parent: null },
        { id: 'x_axis_head', name: 'X-Axis Head', type: 'linear', parent: 'static', axis: 'X', travel: [-230, 230] },
        { id: 'z_axis_head', name: 'Z-Axis/Spindle', type: 'linear', parent: 'x_axis_head', axis: 'Z', travel: [-200, 200] },
        { id: 'y_axis_table', name: 'Y-Axis Table', type: 'linear', parent: 'static', axis: 'Y', travel: [-200, 200] },
        { id: 'a_axis_table', name: 'A-Axis Trunnion', type: 'rotary', parent: 'y_axis_table', axis: 'A', range: [-30, 120] },
        { id: 'c_axis_table', name: 'C-Axis Rotary', type: 'rotary', parent: 'a_axis_table', axis: 'C', range: [-360, 360] }
      ],

      // Machine specs
      specs: {
        travelX: 460,
        travelY: 400,
        travelZ: 400,
        tableSize: 400,  // diameter
        maxRPM: 15000,
        spindleTaper: 'BBT40',
        controller: 'OSP-P300A',
        weight: 6500  // kg
      },
      // Bounding box (mm)
      boundingBox: {
        min: { x: -1200, y: -800, z: 0 },
        max: { x: 1200, y: 800, z: 2800 }
      },
      // Color scheme
      colors: {
        frame: 0x2a4d3a,      // Okuma green
        covers: 0x3d3d3d,     // Dark gray
        table: 0x4a4a4a,      // Medium gray
        spindle: 0x888888,    // Light gray
        accent: 0xff6600      // Orange accents
      },
      // Flag indicating full STEP file available
      hasFullModel: true,
      stepFileKey: 'okuma_genos_m460v-5ax_step'  // localStorage key if uploaded
    }
  },
  // USER-UPLOADED MODELS (stored in IndexedDB/localStorage)
  userModels: {},

  // DATABASE OPERATIONS

  /**
   * Initialize the 3D models database
   */
  init() {
    console.log('[PRISM_MACHINE_3D_MODELS] Initializing...');

    // Load user models from localStorage
    this.loadUserModels();

    // Register global functions
    window.uploadMachineModel = this.uploadMachineModel.bind(this);
    window.getMachineModel = this.getMachineModel.bind(this);
    window.listMachineModels = this.listMachineModels.bind(this);
    window.deleteMachineModel = this.deleteMachineModel.bind(this);

    console.log('[PRISM_MACHINE_3D_MODELS] Loaded ' + Object.keys(this.builtInModels).length + ' built-in models');
    console.log('[PRISM_MACHINE_3D_MODELS] Loaded ' + Object.keys(this.userModels).length + ' user models');

    return this;
  },
  /**
   * Load user models from localStorage/IndexedDB
   */
  loadUserModels() {
    try {
      const stored = localStorage.getItem('prism_user_machine_models');
      if (stored) {
        this.userModels = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[PRISM_MACHINE_3D_MODELS] Error loading user models:', e);
      this.userModels = {};
    }
  },
  /**
   * Save user models to localStorage
   */
  saveUserModels() {
    try {
      // Don't save the actual file data to localStorage (too large)
      // Just save metadata - actual files go to IndexedDB
      const metadata = {};
      for (const [key, model] of Object.entries(this.userModels)) {
        metadata[key] = {
          ...model,
          fileData: null,  // Don't store file data in localStorage
          hasFileData: !!model.fileData
        };
      }
      localStorage.setItem('prism_user_machine_models', JSON.stringify(metadata));
    }