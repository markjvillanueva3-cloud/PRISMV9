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
    } catch (e) {
      console.warn('[PRISM_MACHINE_3D_MODELS] Error saving user models:', e);
    }
  },
  /**
   * Upload a machine CAD model
   * @param {File} file - The CAD file (STEP, STL, OBJ, etc.)
   * @param {Object} metadata - Machine metadata
   * @returns {Promise<Object>} - The stored model entry
   */
  async uploadMachineModel(file, metadata = {}) {
    console.log('[PRISM_MACHINE_3D_MODELS] Uploading:', file.name);

    const fileExt = file.name.split('.').pop().toLowerCase();
    const supportedFormats = ['step', 'stp', 'stl', 'obj', 'gltf', 'glb', 'iges', 'igs'];

    if (!supportedFormats.includes(fileExt)) {
      throw new Error('Unsupported file format: ' + fileExt);
    }
    // Generate model ID
    const modelId = metadata.id || file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Read file as base64 for storage
    const fileData = await this.readFileAsBase64(file);

    // Create model entry
    const model = {
      id: modelId,
      manufacturer: metadata.manufacturer || 'Unknown',
      model: metadata.model || file.name.replace(/\.[^.]+$/, ''),
      type: metadata.type || 'unknown',
      source: 'user_upload',
      fileFormat: fileExt.toUpperCase(),
      fileName: file.name,
      fileSize: file.size,
      fileData: fileData,
      uploadDate: new Date().toISOString(),

      // Optional metadata
      specs: metadata.specs || {},
      components: metadata.components || [],
      boundingBox: metadata.boundingBox || null,
      colors: metadata.colors || {}
    };
    // Store in user models
    this.userModels[modelId] = model;

    // Save metadata to localStorage
    this.saveUserModels();

    // Store file data in IndexedDB for larger files
    await this.storeFileInIndexedDB(modelId, fileData);

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_MACHINE_3D_MODELS] Uploaded model:', modelId);

    // Dispatch event
    window.dispatchEvent(new CustomEvent('machineModelUploaded', {
      detail: { modelId, model }
    }));

    return model;
  },
  /**
   * Read file as base64
   */
  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
  /**
   * Store file data in IndexedDB
   */
  async storeFileInIndexedDB(modelId, fileData) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PRISM_MachineModels', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('models', 'readwrite');
        const store = tx.objectStore('models');
        store.put({ id: modelId, fileData: fileData });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  },
  /**
   * Get file data from IndexedDB
   */
  async getFileFromIndexedDB(modelId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PRISM_MachineModels', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('models', 'readonly');
        const store = tx.objectStore('models');
        const getRequest = store.get(modelId);
        getRequest.onsuccess = () => resolve(getRequest.result?.fileData || null);
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  },
  /**
   * Get a machine model by ID (checks user models first, then built-in)
   * @param {string} modelId - Model ID or machine identifier
   * @returns {Object|null} - Model data or null
   */
  getMachineModel(modelId) {
    // Normalize ID
    const normalizedId = modelId.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Priority 1: User-uploaded models
    if (this.userModels[normalizedId]) {
      console.log('[PRISM_MACHINE_3D_MODELS] Found user model:', normalizedId);
      return { ...this.userModels[normalizedId], priority: 'user' };
    }
    // Priority 2: Built-in models
    if (this.builtInModels[normalizedId]) {
      console.log('[PRISM_MACHINE_3D_MODELS] Found built-in model:', normalizedId);
      return { ...this.builtInModels[normalizedId], priority: 'builtin' };
    }
    // Try fuzzy matching
    const fuzzyMatch = this.findFuzzyMatch(modelId);
    if (fuzzyMatch) {
      console.log('[PRISM_MACHINE_3D_MODELS] Found fuzzy match:', fuzzyMatch.id);
      return fuzzyMatch;
    }
    console.log('[PRISM_MACHINE_3D_MODELS] No model found for:', modelId);
    return null;
  },
  /**
   * Find a model using fuzzy matching
   */
  findFuzzyMatch(query) {
    const normalizedQuery = query.toLowerCase();

    // Check all models
    const allModels = { ...this.builtInModels, ...this.userModels };

    for (const [id, model] of Object.entries(allModels)) {
      // Match by manufacturer + model
      const fullName = (model.manufacturer + ' ' + model.model).toLowerCase();
      if (fullName.includes(normalizedQuery) || normalizedQuery.includes(fullName.replace(/[^a-z0-9]/g, ''))) {
        return { ...model, priority: this.userModels[id] ? 'user' : 'builtin' };
      }
      // Match by model name only
      if (model.model.toLowerCase().includes(normalizedQuery)) {
        return { ...model, priority: this.userModels[id] ? 'user' : 'builtin' };
      }
    }
    return null;
  },
  /**
   * List all available machine models
   */
  listMachineModels() {
    const models = [];

    // Add built-in models
    for (const [id, model] of Object.entries(this.builtInModels)) {
      models.push({
        id,
        manufacturer: model.manufacturer,
        model: model.model,
        type: model.type,
        source: 'builtin',
        hasFullModel: model.hasFullModel
      });
    }
    // Add user models (with priority indicator)
    for (const [id, model] of Object.entries(this.userModels)) {
      models.push({
        id,
        manufacturer: model.manufacturer,
        model: model.model,
        type: model.type,
        source: 'user',
        fileFormat: model.fileFormat,
        uploadDate: model.uploadDate
      });
    }
    return models;
  },
  /**
   * Delete a user-uploaded model
   */
  async deleteMachineModel(modelId) {
    if (this.userModels[modelId]) {
      delete this.userModels[modelId];
      this.saveUserModels();

      // Remove from IndexedDB
      try {
        const request = indexedDB.open('PRISM_MachineModels', 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('models', 'readwrite');
          tx.objectStore('models').delete(modelId);
        };
      } catch (e) {
        console.warn('Error deleting from IndexedDB:', e);
      }
      console.log('[PRISM_MACHINE_3D_MODELS] Deleted model:', modelId);
      return true;
    }
    return false;
  },
  /**
   * Check if a specific machine has an uploaded model
   */
  hasUploadedModel(manufacturer, model) {
    const searchId = (manufacturer + '_' + model).toLowerCase().replace(/[^a-z0-9]/g, '_');
    return !!this.userModels[searchId] || !!this.builtInModels[searchId];
  }
}