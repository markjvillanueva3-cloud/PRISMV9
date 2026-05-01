const PRISM_CAD_FILE_STORAGE = {
  version: '1.0.0',
  storageKey: 'PRISM_CAD_STORAGE',
  maxStorageSize: 50 * 1024 * 1024, // 50MB IndexedDB limit

  // Database configuration
  dbName: 'PRISM_CAD_DATABASE',
  dbVersion: 1,
  stores: {
    machineModels: 'machine_models',
    partModels: 'part_models',
    toolModels: 'tool_models',
    meshCache: 'mesh_cache'
  },
  db: null,

  /**
   * Initialize IndexedDB storage
   */
  async init() {
    console.log('[CAD_STORAGE] Initializing CAD file storage system...');

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[CAD_STORAGE] IndexedDB error:', request.error);
        // Fallback to localStorage
        this.useFallback = true;
        resolve(this);
      };
      request.onsuccess = () => {
        this.db = request.result;
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[CAD_STORAGE] IndexedDB initialized successfully');
        resolve(this);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Machine models store
        if (!db.objectStoreNames.contains(this.stores.machineModels)) {
          const machineStore = db.createObjectStore(this.stores.machineModels, { keyPath: 'id' });
          machineStore.createIndex('manufacturer', 'manufacturer', { unique: false });
          machineStore.createIndex('type', 'type', { unique: false });
          machineStore.createIndex('importDate', 'importDate', { unique: false });
        }
        // Part models store
        if (!db.objectStoreNames.contains(this.stores.partModels)) {
          const partStore = db.createObjectStore(this.stores.partModels, { keyPath: 'id' });
          partStore.createIndex('category', 'category', { unique: false });
          partStore.createIndex('complexity', 'complexity', { unique: false });
        }
        // Tool models store
        if (!db.objectStoreNames.contains(this.stores.toolModels)) {
          db.createObjectStore(this.stores.toolModels, { keyPath: 'id' });
        }
        // Mesh cache store
        if (!db.objectStoreNames.contains(this.stores.meshCache)) {
          const cacheStore = db.createObjectStore(this.stores.meshCache, { keyPath: 'hash' });
          cacheStore.createIndex('sourceId', 'sourceId', { unique: false });
        }
        console.log('[CAD_STORAGE] Database schema created');
      };
    });
  },
  /**
   * Store machine CAD data
   */
  async storeMachineCAD(machineId, data) {
    const record = {
      id: machineId,
      manufacturer: data.manufacturer || 'Unknown',
      model: data.model || 'Unknown',
      type: data.type || 'vmc',
      stepFileData: data.stepFileData || null,
      parsedGeometry: data.parsedGeometry || null,
      meshData: data.meshData || null,
      kinematics: data.kinematics || null,
      componentTree: data.componentTree || null,
      importDate: new Date().toISOString(),
      fileSize: data.fileSize || 0,
      entityCounts: data.entityCounts || {},
      quality: data.quality || 'standard'
    };
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.stores.machineModels, 'readwrite');
        const store = tx.objectStore(this.stores.machineModels);
        const request = store.put(record);

        request.onsuccess = () => {
          console.log(`[CAD_STORAGE] Stored machine CAD: ${machineId}`);
          resolve(record);
        };
        request.onerror = () => reject(request.error);
      });
    } else {
      // Fallback to localStorage (limited)
      const key = `${this.storageKey}_machine_${machineId}`;
      try {
        // Store only essential data in localStorage
        const compactRecord = {
          id: record.id,
          manufacturer: record.manufacturer,
          model: record.model,
          type: record.type,
          importDate: record.importDate,
          entityCounts: record.entityCounts
        };
        localStorage.setItem(key, JSON.stringify(compactRecord));
        return record;
      } catch (e) {
        console.warn('[CAD_STORAGE] localStorage full, data not persisted');
        return record;
      }
    }
  },
  /**
   * Retrieve machine CAD data
   */
  async getMachineCAD(machineId) {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.stores.machineModels, 'readonly');
        const store = tx.objectStore(this.stores.machineModels);
        const request = store.get(machineId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return null;
  },
  /**
   * List all stored machines
   */
  async listStoredMachines() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.stores.machineModels, 'readonly');
        const store = tx.objectStore(this.stores.machineModels);
        const request = store.getAll();

        request.onsuccess = () => {
          const machines = request.result.map(m => ({
            id: m.id,
            manufacturer: m.manufacturer,
            model: m.model,
            type: m.type,
            importDate: m.importDate,
            hasGeometry: !!m.meshData || !!m.parsedGeometry
          }));
          resolve(machines);
        };
        request.onerror = () => reject(request.error);
      });
    }
    return [];
  },
  /**
   * Store mesh cache for quick loading
   */
  async cacheMesh(sourceId, meshData) {
    const hash = this._generateHash(sourceId + JSON.stringify(meshData.statistics || {}));

    const record = {
      hash: hash,
      sourceId: sourceId,
      vertices: meshData.vertices,
      normals: meshData.normals,
      indices: meshData.indices,
      groups: meshData.groups || [],
      boundingBox: meshData.boundingBox,
      createdAt: new Date().toISOString()
    };
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.stores.meshCache, 'readwrite');
        const store = tx.objectStore(this.stores.meshCache);
        const request = store.put(record);

        request.onsuccess = () => resolve(hash);
        request.onerror = () => reject(request.error);
      });
    }
    return hash;
  },
  /**
   * Get cached mesh
   */
  async getCachedMesh(sourceId) {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.stores.meshCache, 'readonly');
        const store = tx.objectStore(this.stores.meshCache);
        const index = store.index('sourceId');
        const request = index.get(sourceId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return null;
  },
  /**
   * Get storage statistics
   */
  async getStorageStats() {
    const stats = {
      machineCount: 0,
      partCount: 0,
      toolCount: 0,
      cacheSize: 0,
      totalSize: 0
    };
    if (this.db) {
      const stores = [
        { name: this.stores.machineModels, key: 'machineCount' },
        { name: this.stores.partModels, key: 'partCount' },
        { name: this.stores.toolModels, key: 'toolCount' }
      ];

      for (const s of stores) {
        const count = await new Promise((resolve) => {
          const tx = this.db.transaction(s.name, 'readonly');
          const store = tx.objectStore(s.name);
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(0);
        });
        stats[s.key] = count;
      }
    }
    return stats;
  },
  /**
   * Simple hash function
   */
  _generateHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'mesh_' + Math.abs(hash).toString(36);
  }
}