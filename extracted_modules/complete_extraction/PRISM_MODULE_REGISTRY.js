const PRISM_MODULE_REGISTRY = {
  version: '1.0.0',
  lastUpdated: '2026-01-06',

  // TOOL DATABASES
  tools: {
    // Core Tool Databases
    'PRISM_TOOL_DATABASE_V7': { type: 'database', category: 'tools', toolCount: 87561, description: 'Master tool database with generators' },
    'PRISM_CUTTING_TOOL_EXPANSION_V3': { type: 'database', category: 'tools', description: 'Ball mills, barrel cutters, high feed, Zeni' },
    'PRISM_ZENI_COMPLETE_CATALOG': { type: 'database', category: 'tools', description: 'Complete Zeni Tools product line' },
    'CUTTING_TOOL_DATABASE': { type: 'database', category: 'tools', description: 'Legacy cutting tool database' },
    'PRISM_STEEL_ENDMILL_DB_V2': { type: 'database', category: 'tools', description: 'Steel end mill specialized database' },
    'SPECIALTY_TOOLS_DATABASE': { type: 'database', category: 'tools', description: 'Specialty and custom tools' },
    'SOLID_CARBIDE_SPECIALISTS_DATABASE': { type: 'database', category: 'tools', description: 'Solid carbide tool specialists' },

    // Turning Tool Databases
    'LATHE_TOOLING_DATABASE': { type: 'database', category: 'turning', description: 'Lathe tooling systems' },
    'TURNING_INSERT_GRADES': { type: 'database', category: 'turning', description: 'Insert grades by manufacturer' },

    // Drilling Databases
    'TWIST_DRILLS_DATABASE': { type: 'database', category: 'drilling', description: 'Twist drill specifications' },
    'INDEXABLE_DRILL_DATABASE': { type: 'database', category: 'drilling', description: 'Indexable drilling systems' },

    // Toolholding
    'TOOLHOLDING_DATABASE': { type: 'database', category: 'toolholding', description: 'Tool holders and adapters' },
    'TOOL_HOLDER_DATABASE': { type: 'database', category: 'toolholding', description: 'Holder specifications' }
  },
  // MACHINE DATABASES
  machines: {
    'MACHINE_DATABASE': { type: 'database', category: 'machines', count: 228, description: 'Master machine database' },
    'MACHINE_CAD_DATABASE': { type: 'database', category: 'machines', description: 'Machine CAD/kinematics data' },
    'LATHE_MACHINE_DATABASE': { type: 'database', category: 'machines', description: 'Lathe specifications' },
    'EDM_MACHINE_DATABASE': { type: 'database', category: 'machines', description: 'EDM machines' },
    'LASER_MACHINE_DATABASE': { type: 'database', category: 'machines', description: 'Laser cutting machines' },
    'WATERJET_MACHINE_DATABASE': { type: 'database', category: 'machines', description: 'Waterjet machines' },
    'TRUNNION_DATABASE': { type: 'database', category: 'machines', description: 'Trunnion/rotary tables' },
    'ROTARY_TABLE_DATABASE': { type: 'database', category: 'machines', description: 'Rotary table specifications' }
  },
  // CAM & TOOLPATH DATABASES
  cam: {
    'CAM_TOOLPATH_DATABASE': { type: 'database', category: 'cam', count: 86, description: 'Toolpath strategies' },
    'LATHE_TOOLPATH_DATABASE': { type: 'database', category: 'cam', count: 46, description: 'Lathe toolpath strategies' },
    'COMPLETE_TOOLPATH_ALGORITHM_LIBRARY': { type: 'algorithm', category: 'cam', description: 'Advanced toolpath algorithms' },
    'COMPREHENSIVE_STRATEGY_DATABASE': { type: 'database', category: 'cam', description: 'Machining strategies' },
    'STRATEGY_DATABASE': { type: 'database', category: 'cam', description: 'Operation strategies' }
  },
  // MATERIAL DATABASES
  materials: {
    'MATERIAL_DATABASE': { type: 'database', category: 'materials', count: 52, description: 'Workpiece materials' },
    'MATERIAL_DATABASE_SYNC': { type: 'database', category: 'materials', description: 'Synchronized material data' },
    'MATERIAL_STOCK_DATABASE': { type: 'database', category: 'materials', description: 'Stock forms and sizes' }
  },
  // POST PROCESSOR DATABASES
  posts: {
    'VERIFIED_POST_DATABASE': { type: 'database', category: 'posts', count: 27, description: 'Verified post processors' },
    'UNIVERSAL_POST_PROCESSOR_ENGINE': { type: 'engine', category: 'posts', description: 'Post processor engine' },
    'UNIFIED_POSTS': { type: 'database', category: 'posts', description: 'Post processor definitions' }
  },
  // SIMULATION & VISUALIZATION
  simulation: {
    'MATERIAL_REMOVAL_SIMULATION': { type: 'engine', category: 'simulation', description: 'Material removal visualization' },
    'FULL_MACHINE_SIMULATION': { type: 'engine', category: 'simulation', description: 'Full machine simulation' },
    'PRISM_TOOL_3D_GENERATOR': { type: 'engine', category: 'simulation', description: '3D tool model generation' },
    'ADVANCED_VERIFICATION_ENGINE': { type: 'engine', category: 'simulation', description: 'Toolpath verification' }
  },
  // CORE SYSTEMS
  core: {
    'PRISM_INIT_ORCHESTRATOR': { type: 'system', category: 'core', description: 'Module initialization' },
    'PRISM_ERROR_HANDLER': { type: 'system', category: 'core', description: 'Error handling' },
    'PRISM_EVENT_MANAGER': { type: 'system', category: 'core', description: 'Event management' },
    'PRISM_STATE': { type: 'system', category: 'core', description: 'State management' },
    'PRISM_UNIFIED_DATA': { type: 'system', category: 'core', description: 'Unified data access' },
    'PRISM_VALIDATOR': { type: 'system', category: 'core', description: 'Runtime validation' },
    'PRISM_DATABASE_HUB': { type: 'system', category: 'core', description: 'Database hub' }
  },
  // UTILITY METHODS

  // Find module by name
  find(moduleName) {
    for (const category of Object.values(this)) {
      if (typeof category === 'object' && category[moduleName]) {
        return { name: moduleName, ...category[moduleName] };
      }
    }
    return null;
  },
  // Search modules
  search(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [catName, category] of Object.entries(this)) {
      if (typeof category !== 'object' || typeof category === 'function') continue;

      for (const [modName, modInfo] of Object.entries(category)) {
        if (modName.toLowerCase().includes(lowerQuery) ||
            (modInfo.description && modInfo.description.toLowerCase().includes(lowerQuery))) {
          results.push({ name: modName, category: catName, ...modInfo });
        }
      }
    }
    return results;
  },
  // Get all modules in a category
  getCategory(categoryName) {
    return this[categoryName] || null;
  },
  // Get module reference
  getModule(moduleName) {
    return window[moduleName] || null;
  },
  // Check if module exists
  exists(moduleName) {
    return typeof window[moduleName] !== 'undefined';
  },
  // Get statistics
  getStats() {
    const stats = { total: 0, categories: {} };

    for (const [catName, category] of Object.entries(this)) {
      if (typeof category !== 'object' || typeof category === 'function') continue;

      const count = Object.keys(category).length;
      stats.categories[catName] = count;
      stats.total += count;
    }
    return stats;
  },
  // List all modules
  listAll() {
    const list = [];

    for (const [catName, category] of Object.entries(this)) {
      if (typeof category !== 'object' || typeof category === 'function') continue;

      for (const [modName, modInfo] of Object.entries(category)) {
        list.push({
          name: modName,
          category: catName,
          exists: this.exists(modName),
          ...modInfo
        });
      }
    }
    return list;
  }
}