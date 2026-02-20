const PRISM_PARTS_LOADER = {
  initialized: false,

  init: function() {
    if (this.initialized) return;

    console.log('[PRISM_PARTS_LOADER] Initializing with ' +
                PRISM_EMBEDDED_PARTS_DATABASE.totalParts + ' embedded parts');

    // Connect to EXAMPLE_PARTS_DATABASE if it exists
    if (typeof EXAMPLE_PARTS_DATABASE !== 'undefined') {
      this.populateExampleParts();
    }
    // Connect to PRISM_CAD_FILE_STORAGE if it exists
    if (typeof PRISM_CAD_FILE_STORAGE !== 'undefined') {
      this.populateCadStorage();
    }
    // Connect to learning engine
    if (typeof PRISM_CAD_LEARNING_BRIDGE !== 'undefined') {
      this.feedLearningEngine();
    }
    this.initialized = true;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_PARTS_LOADER] Initialization complete');
  },
  populateExampleParts: function() {
    const categories = PRISM_EMBEDDED_PARTS_DATABASE.getCategories();

    Object.entries(categories).forEach(([cat, count]) => {
      if (!EXAMPLE_PARTS_DATABASE[cat]) {
        EXAMPLE_PARTS_DATABASE[cat] = [];
      }
      PRISM_EMBEDDED_PARTS_DATABASE.getPartsByCategory(cat).forEach(part => {
        if (!EXAMPLE_PARTS_DATABASE[cat].includes(part.id)) {
          EXAMPLE_PARTS_DATABASE[cat].push(part.id);
        }
      });
    });

    console.log('[PRISM_PARTS_LOADER] Populated EXAMPLE_PARTS_DATABASE');
  },
  populateCadStorage: async function() {
    // Store parts in IndexedDB via PRISM_CAD_FILE_STORAGE
    for (const part of Object.values(PRISM_EMBEDDED_PARTS_DATABASE.parts)) {
      try {
        const stepContent = await PRISM_EMBEDDED_PARTS_DATABASE.getSTEPContent(part.id);
        if (stepContent) {
          await PRISM_CAD_FILE_STORAGE.storePartCAD(part.id, {
            partId: part.id,
            name: part.name,
            category: part.category,
            stepFileData: stepContent,
            geometry: part.geometry,
            boundingBox: part.boundingBox,
            importDate: part.importDate
          });
        }
      } catch (e) {
        console.warn('[PRISM_PARTS_LOADER] Failed to store part:', part.id, e);
      }
    }
  },
  feedLearningEngine: function() {
    // Extract features from embedded parts for learning
    Object.values(PRISM_EMBEDDED_PARTS_DATABASE.parts).forEach(part => {
      try {
        PRISM_CAD_LEARNING_BRIDGE.learnFromPart({
          partId: part.id,
          category: part.category,
          type: part.type,
          geometry: part.geometry,
          boundingBox: part.boundingBox
        });
      } catch (e) {
        // Learning engine may not be fully initialized
      }
    });
  },
  // Load a specific part for visualization
  loadPartForViewer: async function(partId) {
    const part = PRISM_EMBEDDED_PARTS_DATABASE.getPart(partId);
    if (!part) return null;

    const stepContent = await PRISM_EMBEDDED_PARTS_DATABASE.getSTEPContent(partId);
    if (!stepContent) return null;

    // Parse STEP and create mesh
    if (typeof PRISM_STEP_TO_MESH_KERNEL !== 'undefined') {
      try {
        const parsed = PRISM_STEP_TO_MESH_KERNEL.parseSTEP(stepContent);
        const mesh = PRISM_STEP_TO_MESH_KERNEL.convertToMesh(parsed);
        return {
          part: part,
          mesh: mesh,
          stepContent: stepContent
        };
      } catch (e) {
        console.error('[PRISM_PARTS_LOADER] Failed to parse STEP:', e);
      }
    }
    return { part: part, stepContent: stepContent };
  }
}