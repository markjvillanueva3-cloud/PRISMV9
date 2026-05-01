const PRISM_TOOLS = {
  version: PRISM_TOOL_DATABASE_V7.version,
  totalCount: PRISM_TOOL_DATABASE_V7.stats.totalConfigurations,

  // Core database access
  db: PRISM_TOOL_DATABASE_V7,
  generator: PRISM_TOOL_GENERATOR,

  // Get sizes
  getSizes: (unit = 'inch', category = 'fractional') =>
    PRISM_TOOL_DATABASE_V7.sizes[unit][category],

  // Get coatings
  getCoatings: () => PRISM_TOOL_DATABASE_V7.coatings,
  getCoatingForMaterial: (material) => {
    return Object.entries(PRISM_TOOL_DATABASE_V7.coatings)
      .filter(([_, info]) => info.materials.includes(material))
      .map(([id, info]) => ({ id, ...info }));
  },
  // Get brands
  getBrands: (tier = 'all') => {
    if (tier === 'all') {
      return Object.values(PRISM_TOOL_DATABASE_V7.brands).flat();
    }
    return PRISM_TOOL_DATABASE_V7.brands[tier] || [];
  },
  // Generate tool
  generate: (templateId, size, options) =>
    PRISM_TOOL_GENERATOR.generateTool(templateId, size, options),

  // Search
  search: (criteria) => PRISM_TOOL_GENERATOR.search(criteria),

  // Recommend for feature
  recommendForFeature: (feature, material, dia) =>
    PRISM_TOOL_GENERATOR.recommendForFeature(feature, material, dia),

  // Get tap drill
  getTapDrill: (size, type) => PRISM_TOOL_GENERATOR.getTapDrill(size, type),

  // Templates
  getTemplates: () => PRISM_TOOL_GENERATOR.getAllTemplates(),
  getTemplate: (id) => PRISM_TOOL_GENERATOR.findTemplate(id),

  // Threads
  getThreads: (type = 'UNC') => PRISM_TOOL_DATABASE_V7.threads[type],

  // Stats
  getStats: () => PRISM_TOOL_GENERATOR.getStats()
}