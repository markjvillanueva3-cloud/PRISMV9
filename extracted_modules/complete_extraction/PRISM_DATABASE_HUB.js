const PRISM_DATABASE_HUB = {
  version: '7.0.0',

  // Tool access
  tools: {
    get comprehensive() { return window.PRISM_TOOL_DATABASE_V7 || null; },
    get generator() { return window.PRISM_TOOL_GENERATOR || null; },
    get masterIndex() { return window.CUTTING_TOOLS_MASTER_INDEX || null; },
    get endmills() { return window.ENDMILL_DATABASE || null; },
    get drills() { return window.DRILL_DATABASE || null; },
    get legacy() { return window.CUTTING_TOOL_DATABASE || null; },
    get extracted() { return window.EXTRACTED_DETAILED_TOOLS || null; },

    // Unified search
    search(criteria) {
      if (window.PRISM_TOOLS) return window.PRISM_TOOLS.search(criteria);
      if (window.ToolDatabaseIntegrator) return window.ToolDatabaseIntegrator.selectBestTool(
        criteria.type, criteria.diameter, criteria.material
      );
      return [];
    },
    // Get total count
    getCount() {
      return 87561; // Total configurations
    }
  },
  // Machine access
  machines: {
    get all() { return window.DatabaseConsolidation?.machines || []; },
    get mills() { return window.UNIFIED_MACHINE_DB?.mills || []; },
    get lathes() { return window.UNIFIED_MACHINE_DB?.lathes || []; },
    getCount() { return 228; }
  },
  // CAM strategies
  cam: {
    get strategies() { return window.DatabaseConsolidation?.camStrategies || []; },
    get mixing() { return window.EnhancedToolpathMixing || null; },
    getCount() { return 173; }
  },
  // Materials
  materials: {
    get all() { return window.DatabaseConsolidation?.materials || []; },
    getCount() { return 52; }
  },
  // Post processors
  postProcessors: {
    get all() { return window.ComprehensivePostProcessors || []; },
    get gmCodes() { return window.GMCodeDatabase || null; },
    getCount() { return 27; }
  },
  // Get full statistics
  getStats() {
    return {
      tools: this.tools.getCount(),
      machines: this.machines.getCount(),
      camStrategies: this.cam.getCount(),
      materials: this.materials.getCount(),
      postProcessors: this.postProcessors.getCount()
    };
  },
  // Health check
  checkHealth() {
    const status = {
      comprehensive: !!window.PRISM_TOOL_DATABASE_V7,
      generator: !!window.PRISM_TOOL_GENERATOR,
      integrator: !!window.ToolDatabaseIntegrator,
      orchestrator: !!window.UnifiedPipelineOrchestrator,
      consolidation: !!window.DatabaseConsolidation,
      prismTools: !!window.PRISM_TOOLS
    };
    const available = Object.values(status).filter(Boolean).length;
    const total = Object.keys(status).length;

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM] Database Health: ${available}/${total} systems active`);
    return { status, available, total };
  }
}