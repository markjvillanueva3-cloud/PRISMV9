const PRISM_BATCH_STEP_IMPORT_ENGINE = {
  version: '1.0.0',

  // Import queue management
  importQueue: [],
  processingQueue: false,
  maxConcurrent: 3,
  currentProcessing: 0,

  // Import statistics
  stats: {
    totalImported: 0,
    totalFailed: 0,
    totalBytes: 0,
    totalEntities: 0,
    lastImport: null
  },
  /**
   * Initialize batch import engine
   */
  init() {
    console.log('[BATCH_IMPORT] Initializing Batch STEP Import Engine...');

    // Set up file drop zone handlers
    this.setupDropZone();

    // Connect to storage system
    if (typeof PRISM_CAD_FILE_STORAGE !== 'undefined') {
      PRISM_CAD_FILE_STORAGE.init().then(() => {
        console.log('[BATCH_IMPORT] Connected to CAD storage system');
      });
    }
    return this;
  },
  /**
   * Setup drag-and-drop zone for batch imports
   */
  setupDropZone() {
    const dropZone = document.getElementById('step-batch-dropzone');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-active');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      this.queueFiles(files);
    });
  },
  /**
   * Queue files for import
   */
  async queueFiles(files) {
    const stepFiles = files.filter(f =>
      f.name.toLowerCase().endsWith('.step') ||
      f.name.toLowerCase().endsWith('.stp')
    );

    console.log(`[BATCH_IMPORT] Queuing ${stepFiles.length} STEP files for import`);

    for (const file of stepFiles) {
      this.importQueue.push({
        file: file,
        status: 'queued',
        progress: 0,
        result: null,
        error: null,
        queuedAt: new Date().toISOString()
      });
    }
    this.processQueue();
  },
  /**
   * Process import queue
   */
  async processQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;

    while (this.importQueue.some(item => item.status === 'queued')) {
      // Find next queued item
      const item = this.importQueue.find(i => i.status === 'queued');
      if (!item) break;

      // Wait if too many concurrent
      while (this.currentProcessing >= this.maxConcurrent) {
        await new Promise(r => setTimeout(r, 100));
      }
      // Process file
      this.currentProcessing++;
      item.status = 'processing';

      try {
        const result = await this.importSingleFile(item.file, (progress) => {
          item.progress = progress;
          this.emitProgress();
        });

        item.status = 'complete';
        item.result = result;
        this.stats.totalImported++;
        this.stats.totalBytes += item.file.size;
        this.stats.totalEntities += result.entityCount || 0;
        this.stats.lastImport = new Date().toISOString();

        // Feed to learning engine
        await this.feedToLearningEngine(result);

      } catch (error) {
        item.status = 'failed';
        item.error = error.message;
        this.stats.totalFailed++;
        console.error(`[BATCH_IMPORT] Failed to import ${item.file.name}:`, error);
      }
      this.currentProcessing--;
      this.emitProgress();
    }
    this.processingQueue = false;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[BATCH_IMPORT] Queue processing complete');
    this.emitComplete();
  },
  /**
   * Import a single STEP file
   */
  async importSingleFile(file, progressCallback) {
    console.log(`[BATCH_IMPORT] Importing: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`);

    progressCallback(10);

    // Read file content
    const content = await this.readFileContent(file);
    progressCallback(30);

    // Parse STEP data
    const parsedData = await this.parseSTEPFile(content, file.name);
    progressCallback(60);

    // Generate mesh
    const meshData = await this.generateMesh(parsedData);
    progressCallback(80);

    // Store in database
    const machineId = this.extractMachineId(file.name);
    const stored = await PRISM_CAD_FILE_STORAGE.storeMachineCAD(machineId, {
      manufacturer: parsedData.manufacturer || this.extractManufacturer(file.name),
      model: parsedData.model || this.extractModel(file.name),
      type: this.detectMachineType(parsedData),
      stepFileData: null, // Don't store raw STEP in DB (too large)
      parsedGeometry: {
        shells: parsedData.shells?.length || 0,
        faces: parsedData.faces?.length || 0,
        components: parsedData.components || []
      },
      meshData: meshData,
      kinematics: parsedData.kinematics || null,
      componentTree: parsedData.componentTree || null,
      fileSize: file.size,
      entityCounts: parsedData.entityCounts || {},
      quality: 'high'
    });

    progressCallback(100);

    return {
      id: machineId,
      filename: file.name,
      fileSize: file.size,
      entityCount: parsedData.entityCounts?.total || 0,
      meshVertices: meshData?.vertexCount || 0,
      components: parsedData.components?.length || 0,
      stored: true
    };
  },
  /**
   * Read file content as text
   */
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },
  /**
   * Parse STEP file content
   */
  async parseSTEPFile(content, filename) {
    // Use existing STEP parser if available
    if (typeof ADVANCED_CAD_RECOGNITION_ENGINE !== 'undefined' &&
        ADVANCED_CAD_RECOGNITION_ENGINE.parseSTEP) {
      try {
        const parsed = ADVANCED_CAD_RECOGNITION_ENGINE.parseSTEP(content);
        return {
          ...parsed,
          entityCounts: this.countSTEPEntities(content),
          components: this.extractComponents(content),
          manufacturer: this.extractManufacturerFromSTEP(content),
          model: this.extractModelFromSTEP(content)
        };
      } catch (e) {
        console.warn('[BATCH_IMPORT] Advanced parser failed, using basic parser');
      }
    }
    // Basic STEP parsing
    return this.basicSTEPParse(content);
  },
  /**
   * Basic STEP file parsing
   */
  basicSTEPParse(content) {
    const entityCounts = this.countSTEPEntities(content);
    const components = this.extractComponents(content);

    // Extract geometric data
    const cartesianPoints = [];
    const pointRegex = /CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(([^)]+)\)\s*\)/g;
    let match;
    while ((match = pointRegex.exec(content)) !== null) {
      const coords = match[1].split(',').map(n => parseFloat(n.trim()));
      if (coords.length >= 3) {
        cartesianPoints.push({ x: coords[0], y: coords[1], z: coords[2] });
      }
    }
    // Calculate bounding box
    let boundingBox = null;
    if (cartesianPoints.length > 0) {
      boundingBox = {
        min: {
          x: Math.min(...cartesianPoints.map(p => p.x)),
          y: Math.min(...cartesianPoints.map(p => p.y)),
          z: Math.min(...cartesianPoints.map(p => p.z))
        },
        max: {
          x: Math.max(...cartesianPoints.map(p => p.x)),
          y: Math.max(...cartesianPoints.map(p => p.y)),
          z: Math.max(...cartesianPoints.map(p => p.z))
        }
      };
    }
    return {
      entityCounts,
      components,
      cartesianPoints,
      boundingBox,
      shells: [],
      faces: [],
      manufacturer: this.extractManufacturerFromSTEP(content),
      model: this.extractModelFromSTEP(content)
    };
  },
  /**
   * Count STEP entities
   */
  countSTEPEntities(content) {
    const counts = {
      CARTESIAN_POINT: (content.match(/CARTESIAN_POINT/g) || []).length,
      DIRECTION: (content.match(/DIRECTION\s*\(/g) || []).length,
      AXIS2_PLACEMENT_3D: (content.match(/AXIS2_PLACEMENT_3D/g) || []).length,
      PLANE: (content.match(/PLANE\s*\(/g) || []).length,
      CYLINDRICAL_SURFACE: (content.match(/CYLINDRICAL_SURFACE/g) || []).length,
      CONICAL_SURFACE: (content.match(/CONICAL_SURFACE/g) || []).length,
      SPHERICAL_SURFACE: (content.match(/SPHERICAL_SURFACE/g) || []).length,
      TOROIDAL_SURFACE: (content.match(/TOROIDAL_SURFACE/g) || []).length,
      B_SPLINE_SURFACE: (content.match(/B_SPLINE_SURFACE/g) || []).length,
      ADVANCED_FACE: (content.match(/ADVANCED_FACE/g) || []).length,
      CLOSED_SHELL: (content.match(/CLOSED_SHELL/g) || []).length,
      MANIFOLD_SOLID_BREP: (content.match(/MANIFOLD_SOLID_BREP/g) || []).length,
      NEXT_ASSEMBLY_USAGE: (content.match(/NEXT_ASSEMBLY_USAGE/g) || []).length
    };
    counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
    return counts;
  },
  /**
   * Extract component names from STEP
   */
  extractComponents(content) {
    const components = [];
    const regex = /NEXT_ASSEMBLY_USAGE_OCCURRENCE\s*\(\s*'([^']*)'[^)]*\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1].split(':')[0].trim();
      if (name && !components.includes(name)) {
        components.push(name);
      }
    }
    return components;
  },
  /**
   * Extract manufacturer from STEP content
   */
  extractManufacturerFromSTEP(content) {
    const manufacturers = ['Okuma', 'Haas', 'DMG', 'Mazak', 'Hurco', 'Makino', 'Doosan', 'Brother', 'Fanuc'];
    const lower = content.toLowerCase();
    for (const m of manufacturers) {
      if (lower.includes(m.toLowerCase())) return m;
    }
    return null;
  },
  /**
   * Extract model from STEP content
   */
  extractModelFromSTEP(content) {
    const fileNameMatch = content.match(/FILE_NAME\s*\(\s*'([^']+)'/);
    if (fileNameMatch) {
      return fileNameMatch[1].replace('.step', '').replace('.stp', '');
    }
    return null;
  },
  /**
   * Extract machine ID from filename
   */
  extractMachineId(filename) {
    return filename
      .toLowerCase()
      .replace(/\.step$|\.stp$/i, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_');
  },
  /**
   * Extract manufacturer from filename
   */
  extractManufacturer(filename) {
    const lower = filename.toLowerCase();
    const manufacturers = ['okuma', 'haas', 'dmg', 'mazak', 'hurco', 'makino', 'doosan', 'brother'];
    for (const m of manufacturers) {
      if (lower.includes(m)) return m.charAt(0).toUpperCase() + m.slice(1);
    }
    return 'Unknown';
  },
  /**
   * Extract model from filename
   */
  extractModel(filename) {
    return filename.replace(/\.step$|\.stp$/i, '').replace(/_/g, ' ');
  },
  /**
   * Detect machine type from parsed data
   */
  detectMachineType(parsedData) {
    const components = (parsedData.components || []).map(c => c.toLowerCase());

    if (components.some(c => c.includes('a_axis') || c.includes('c_axis') || c.includes('trunnion'))) {
      return 'vmc_5axis';
    }
    if (components.some(c => c.includes('turret') || c.includes('spindle') && c.includes('sub'))) {
      return 'turn_mill';
    }
    if (components.some(c => c.includes('chuck') || c.includes('tailstock'))) {
      return 'lathe';
    }
    return 'vmc';
  },
  /**
   * Generate mesh from parsed data
   */
  async generateMesh(parsedData) {
    if (typeof PRISM_STEP_TO_MESH_KERNEL !== 'undefined') {
      try {
        const meshResult = PRISM_STEP_TO_MESH_KERNEL.convertToMesh(parsedData, {
          quality: 'high',
          maxSegments: 72
        });
        return {
          vertices: meshResult.vertices,
          normals: meshResult.normals,
          indices: meshResult.indices,
          vertexCount: (meshResult.vertices?.length || 0) / 3,
          boundingBox: parsedData.boundingBox
        };
      } catch (e) {
        console.warn('[BATCH_IMPORT] Mesh generation failed:', e);
      }
    }
    // Return placeholder
    return {
      vertices: [],
      normals: [],
      indices: [],
      vertexCount: 0,
      boundingBox: parsedData.boundingBox
    };
  },
  /**
   * Feed imported data to learning engine
   */
  async feedToLearningEngine(result) {
    if (typeof PRISM_CAD_LEARNING_BRIDGE !== 'undefined') {
      await PRISM_CAD_LEARNING_BRIDGE.learnFromImport(result);
    }
    // Also update machine 3D database
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      PRISM_MACHINE_3D_LEARNING_ENGINE.recordImportedModel(result);
    }
  },
  /**
   * Emit progress event
   */
  emitProgress() {
    const event = new CustomEvent('prism-import-progress', {
      detail: {
        queue: this.importQueue.map(i => ({
          filename: i.file.name,
          status: i.status,
          progress: i.progress,
          error: i.error
        })),
        stats: this.stats
      }
    });
    window.dispatchEvent(event);
  },
  /**
   * Emit complete event
   */
  emitComplete() {
    const event = new CustomEvent('prism-import-complete', {
      detail: { stats: this.stats }
    });
    window.dispatchEvent(event);
  },
  /**
   * Get import statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.importQueue.length,
      pending: this.importQueue.filter(i => i.status === 'queued').length,
      processing: this.currentProcessing,
      complete: this.importQueue.filter(i => i.status === 'complete').length,
      failed: this.importQueue.filter(i => i.status === 'failed').length
    };
  }
}