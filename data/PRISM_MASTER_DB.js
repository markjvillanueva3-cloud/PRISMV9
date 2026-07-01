/**
 * PRISM_MASTER_DB
 * Extracted from PRISM v8.89.002 monolith
 * References in monolith: 258
 * Lines extracted: 123
 * Prototype methods: 0
 * Session: R2.0.2
 */

const PRISM_MASTER_DB = {
  version: '8.0.0',
  buildDate: new Date().toISOString(),

  // Accurate counts after full consolidation
  stats: {
    machines: 279,
    materials: 355,
    tools: 87561,
    camStrategies: 517,
    postProcessors: 247,
    totalDatabases: 230
  },
  // Unified access methods
  machines: {
    getAll: () => UNIFIED_MACHINES?.getAll() || [],
    search: (q) => UNIFIED_MACHINES?.search(q) || [],
    getByCategory: (c) => UNIFIED_MACHINES?.getByCategory(c) || [],
    getByBrand: (b) => UNIFIED_MACHINES?.getByBrand(b) || [],
    getCount: () => UNIFIED_MACHINES?.getCount() || 279
  },
  materials: {
    getAll: () => UNIFIED_MATERIALS?.getAll() || [],
    search: (q) => UNIFIED_MATERIALS?.search(q) || [],
    getByCategory: (c) => UNIFIED_MATERIALS?.getByCategory(c) || [],
    getSpeedsFeedsFor: (m) => UNIFIED_MATERIALS?.getSpeedsFeedsFor(m) || null,
    getCount: () => UNIFIED_MATERIALS?.getCount() || 355
  },
  tools: {
    search: (c) => PRISM_TOOLS?.search(c) || [],
    generate: (t, s, o) => PRISM_TOOLS?.generate(t, s, o) || null,
    getTemplates: () => PRISM_TOOLS?.getTemplates() || [],
    recommendForFeature: (f, m, d) => PRISM_TOOLS?.recommendForFeature(f, m, d) || [],
    getTapDrill: (t, ty) => PRISM_TOOLS?.getTapDrill(t, ty) || null,
    getCount: () => 87561
  },
  cam: {
    getBestStrategy: (f, m, c) => UNIFIED_CAM?.getBestStrategy(f, m, c) || 'adaptive',
    getStrategyDetails: (s) => UNIFIED_CAM?.getStrategyDetails(s) || null,
    getSoftwareStrengths: (s) => UNIFIED_CAM?.getSoftwareStrengths(s) || null,
    getStrategiesForFeature: (f) => UNIFIED_CAM?.getStrategiesForFeature(f) || [],
    getCount: () => UNIFIED_CAM?.getStrategyCount() || 517
  },
  posts: {
    getController: (n) => UNIFIED_POSTS?.getController(n) || null,
    getGCodeHelp: (c) => UNIFIED_POSTS?.getGCodeHelp(c) || null,
    getMCodeHelp: (c) => UNIFIED_POSTS?.getMCodeHelp(c) || null,
    getPostForMachine: (m) => UNIFIED_POSTS?.getPostForMachine(m) || null,
    getAllControllers: () => UNIFIED_POSTS?.getAllControllers() || []
  },
  // Complete workflow helper
  getCompleteSetup(partFeatures, material, machine) {
    const result = {
      machine: null,
      material: null,
      tools: [],
      strategies: [],
      post: null
    };
    // Get machine
    if (machine) {
      const machines = this.machines.search(machine);
      result.machine = machines[0] || null;
    }
    // Get material
    if (material) {
      const materials = this.materials.search(material);
      result.material = materials[0] || null;
      result.speedsFeedsData = this.materials.getSpeedsFeedsFor(material);
    }
    // Get tools and strategies for each feature
    if (Array.isArray(partFeatures)) {
      partFeatures.forEach(feature => {
        const tools = this.tools.recommendForFeature(feature.type, material, feature.diameter);
        const strategy = this.cam.getBestStrategy(feature.type, material);

        result.tools.push(...tools.slice(0, 2));
        result.strategies.push({ feature: feature.type, strategy });
      });
    }
    // Get post processor
    if (result.machine) {
      result.post = this.posts.getPostForMachine(result.machine.model || result.machine.name);
    }
    return result;
  },
  // Health check
  checkHealth() {
    const systems = {
      machines: typeof window.UNIFIED_MACHINES !== 'undefined',
      materials: typeof window.UNIFIED_MATERIALS !== 'undefined',
      tools: typeof window.PRISM_TOOLS !== 'undefined',
      cam: typeof window.UNIFIED_CAM !== 'undefined',
      posts: typeof window.UNIFIED_POSTS !== 'undefined'
    };
    const active = Object.values(systems).filter(Boolean).length;
    console.log(`[PRISM_MASTER_DB] Health: ${active}/5 systems active`);

    return { systems, active, total: 5 };
  },
  // Initialize all systems
  init() {
    console.log('[PRISM_MASTER_DB] Initializing unified database systems...');

    // Initialize each system
    if (typeof window.UNIFIED_MACHINES !== 'undefined') UNIFIED_MACHINES.init();
    if (typeof window.UNIFIED_MATERIALS !== 'undefined') UNIFIED_MATERIALS.init();
    if (typeof window.UNIFIED_CAM !== 'undefined') UNIFIED_CAM.init();
    if (typeof window.UNIFIED_POSTS !== 'undefined') UNIFIED_POSTS.init();

    // Health check
    const health = this.checkHealth();

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_MASTER_DB] Initialization complete');
    console.log(`  Machines: ${this.stats.machines}+`);
    console.log(`  Materials: ${this.stats.materials}+`);
    console.log(`  Tools: ${this.stats.tools.toLocaleString()}`);
    console.log(`  CAM Strategies: ${this.stats.camStrategies}+`);
    console.log(`  Post Processors: ${this.stats.postProcessors}+`);

    return this;
  }
}