const PRISM_EMBEDDED_MACHINE_GEOMETRY = {
  version: '1.0.0',

  // Pre-computed machine geometries (from STEP imports)
  machines: {
    // This will be populated by STEP imports and can be serialized/loaded
  },
  // Standard component templates with actual mesh data
  standardComponents: {
    // Spindle assembly - detailed mesh
    spindle_hsk_a63: {
      type: 'spindle',
      interface: 'HSK-A63',
      vertices: null,  // Populated from STEP
      normals: null,
      indices: null,
      boundingBox: { min: { x: -100, y: -100, z: 0 }, max: { x: 100, y: 100, z: 350 } }
    },
    spindle_cat40: {
      type: 'spindle',
      interface: 'CAT40',
      vertices: null,
      normals: null,
      indices: null,
      boundingBox: { min: { x: -75, y: -75, z: 0 }, max: { x: 75, y: 75, z: 300 } }
    },
    // Trunnion table
    trunnion_400mm: {
      type: 'trunnion',
      tableDiameter: 400,
      vertices: null,
      normals: null,
      indices: null,
      boundingBox: { min: { x: -300, y: -200, z: -100 }, max: { x: 300, y: 200, z: 400 } }
    },
    // Rotary table
    rotary_c_axis: {
      type: 'rotary_table',
      vertices: null,
      normals: null,
      indices: null
    }
  },
  /**
   * Initialize embedded geometry system
   */
  init() {
    console.log('[EMBEDDED_GEOMETRY] Initializing Embedded Machine Geometry System...');

    // Load any saved geometries
    this.loadSavedGeometries();

    // Connect to storage system
    this.connectToStorage();

    return this;
  },
  /**
   * Connect to CAD file storage
   */
  async connectToStorage() {
    if (typeof PRISM_CAD_FILE_STORAGE !== 'undefined') {
      await PRISM_CAD_FILE_STORAGE.init();

      // Load stored machine geometries
      const storedMachines = await PRISM_CAD_FILE_STORAGE.listStoredMachines();

      for (const machine of storedMachines) {
        if (machine.hasGeometry) {
          const fullData = await PRISM_CAD_FILE_STORAGE.getMachineCAD(machine.id);
          if (fullData?.meshData) {
            this.machines[machine.id] = {
              id: machine.id,
              manufacturer: machine.manufacturer,
              model: machine.model,
              type: machine.type,
              meshData: fullData.meshData,
              components: fullData.parsedGeometry?.components || [],
              loadedFromStorage: true
            };
          }
        }
      }
      console.log(`[EMBEDDED_GEOMETRY] Loaded ${Object.keys(this.machines).length} machines from storage`);
    }
  },
  /**
   * Get machine geometry by ID
   */
  getMachine(machineId) {
    return this.machines[machineId] || null;
  },
  /**
   * Check if machine geometry exists
   */
  hasMachine(machineId) {
    return !!this.machines[machineId]?.meshData;
  },
  /**
   * Add machine geometry from STEP import
   */
  addMachineFromImport(machineId, importData) {
    this.machines[machineId] = {
      id: machineId,
      manufacturer: importData.manufacturer,
      model: importData.model,
      type: importData.type,
      meshData: importData.meshData,
      components: importData.components || [],
      importedAt: new Date().toISOString()
    };
    console.log(`[EMBEDDED_GEOMETRY] Added machine geometry: ${machineId}`);

    return this.machines[machineId];
  },
  /**
   * Get Three.js geometry for machine
   */
  getThreeGeometry(machineId) {
    const machine = this.machines[machineId];
    if (!machine?.meshData) return null;

    const geometry = new THREE.BufferGeometry();

    if (machine.meshData.vertices?.length > 0) {
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(machine.meshData.vertices, 3));
    }
    if (machine.meshData.normals?.length > 0) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(machine.meshData.normals, 3));
    }
    if (machine.meshData.indices?.length > 0) {
      geometry.setIndex(machine.meshData.indices);
    }
    geometry.computeBoundingBox();

    return geometry;
  },
  /**
   * Get mesh for visualization
   */
  getMesh(machineId, material) {
    const geometry = this.getThreeGeometry(machineId);
    if (!geometry) return null;

    const defaultMaterial = material || new THREE.MeshPhongMaterial({
      color: 0x555555,
      specular: 0x222222,
      shininess: 30,
      flatShading: false
    });

    return new THREE.Mesh(geometry, defaultMaterial);
  },
  /**
   * List all available machines
   */
  listMachines() {
    return Object.keys(this.machines).map(id => ({
      id: id,
      manufacturer: this.machines[id].manufacturer,
      model: this.machines[id].model,
      type: this.machines[id].type,
      hasGeometry: !!this.machines[id].meshData,
      vertexCount: this.machines[id].meshData?.vertexCount || 0
    }));
  },
  /**
   * Get statistics
   */
  getStats() {
    const machines = Object.values(this.machines);
    return {
      totalMachines: machines.length,
      withGeometry: machines.filter(m => m.meshData).length,
      totalVertices: machines.reduce((sum, m) => sum + (m.meshData?.vertexCount || 0), 0),
      byType: machines.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {}),
      byManufacturer: machines.reduce((acc, m) => {
        acc[m.manufacturer] = (acc[m.manufacturer] || 0) + 1;
        return acc;
      }, {})
    };
  },
  /**
   * Load saved geometries from localStorage
   */
  loadSavedGeometries() {
    try {
      const saved = localStorage.getItem('PRISM_EMBEDDED_GEOMETRY_INDEX');
      if (saved) {
        const index = JSON.parse(saved);
        console.log(`[EMBEDDED_GEOMETRY] Found ${index.length} saved geometry references`);
      }
    } catch (e) {
      console.warn('[EMBEDDED_GEOMETRY] Failed to load saved geometries');
    }
  },
  /**
   * Save geometry index to localStorage
   */
  saveIndex() {
    try {
      const index = Object.keys(this.machines).map(id => ({
        id: id,
        type: this.machines[id].type,
        manufacturer: this.machines[id].manufacturer
      }));
      localStorage.setItem('PRISM_EMBEDDED_GEOMETRY_INDEX', JSON.stringify(index));
    } catch (e) {
      console.warn('[EMBEDDED_GEOMETRY] Failed to save geometry index');
    }
  }
}