const PRISM_TOOL_GENERATOR = {
  cache: new Map(),

  /**
   * Generate a tool from template and size
   */
  generateTool(templateId, size, options = {}) {
    const template = this.findTemplate(templateId);
    if (!template) return null;

    const unit = options.unit || (size > 5 ? 'metric' : 'inch');
    const coating = options.coating || template.coatings[0];
    const substrate = options.substrate || template.substrates[0];
    const brand = options.brand || 'generic';

    const toolId = `${templateId}-${size}-${coating}-${brand}`;

    // Check cache
    if (this.cache.has(toolId)) {
      return this.cache.get(toolId);
    }
    const tool = {
      id: toolId,
      templateId: templateId,
      ...template,
      diameter: size,
      unit: unit,
      coating: coating,
      coatingInfo: PRISM_TOOL_DATABASE_V7.coatings[coating],
      substrate: substrate,
      substrateInfo: PRISM_TOOL_DATABASE_V7.substrates[substrate],
      brand: brand,
      loc: template.locMultiplier ? size * template.locMultiplier : size * 2.5,
      oal: template.oalMultiplier ? size * template.oalMultiplier : size * 5
    };
    // Add corner radius for CR end mills
    if (template.cornerRadii && options.cornerRadius) {
      tool.cornerRadius = options.cornerRadius;
    }
    // Add angle for chamfer tools
    if (template.angles && options.angle) {
      tool.angle = options.angle;
    }
    // Cache and return
    this.cache.set(toolId, tool);
    return tool;
  },
  /**
   * Find template by ID
   */
  findTemplate(templateId) {
    for (const category of Object.values(PRISM_TOOL_DATABASE_V7.templates)) {
      if (category[templateId]) {
        return { id: templateId, ...category[templateId] };
      }
    }
    return null;
  },
  /**
   * Get all templates
   */
  getAllTemplates() {
    const templates = [];
    for (const [category, items] of Object.entries(PRISM_TOOL_DATABASE_V7.templates)) {
      for (const [id, template] of Object.entries(items)) {
        templates.push({ id, category, ...template });
      }
    }
    return templates;
  },
  /**
   * Generate all tools for a template
   */
  generateAllForTemplate(templateId) {
    const template = this.findTemplate(templateId);
    if (!template) return [];

    const tools = [];
    const sizeRange = template.sizeRange || { inch: [0.125, 1.0], metric: [3, 25] };

    // Get appropriate sizes
    const inchSizes = PRISM_TOOL_DATABASE_V7.sizes.inch.fractional
      .filter(s => s >= sizeRange.inch[0] && s <= sizeRange.inch[1]);

    for (const size of inchSizes) {
      for (const coating of template.coatings) {
        tools.push(this.generateTool(templateId, size, {
          unit: 'inch',
          coating
        }));
      }
    }
    return tools;
  },
  /**
   * Search tools by criteria
   */
  search(criteria) {
    const { type, diameter, material, brand, minDia, maxDia } = criteria;
    const templates = this.getAllTemplates();
    const results = [];

    for (const template of templates) {
      // Filter by type
      if (type && template.type !== type && template.subtype !== type) continue;

      // Filter by material application
      if (material && template.materials && !template.materials.includes(material)) continue;

      // Get sizes in range
      const sizeRange = template.sizeRange || { inch: [0.125, 1.0] };
      let sizes = PRISM_TOOL_DATABASE_V7.sizes.inch.fractional
        .filter(s => s >= sizeRange.inch[0] && s <= sizeRange.inch[1]);

      if (diameter) {
        sizes = sizes.filter(s => Math.abs(s - diameter) < 0.01);
      }
      if (minDia !== undefined) {
        sizes = sizes.filter(s => s >= minDia);
      }
      if (maxDia !== undefined) {
        sizes = sizes.filter(s => s <= maxDia);
      }
      // Generate tools for matching sizes
      for (const size of sizes.slice(0, 10)) { // Limit results
        results.push(this.generateTool(template.id, size));
      }
    }
    return results;
  },
  /**
   * Get recommended tool for a feature
   */
  recommendForFeature(featureType, material, targetDiameter) {
    const typeMap = {
      pocket: 'endmill',
      slot: 'endmill',
      hole: 'drill',
      tap: 'tap',
      thread: 'tap',
      bore: 'boring',
      face: 'indexable_mill',
      chamfer: 'chamfer',
      countersink: 'countersink',
      spotface: 'spot_drill'
    };
    const toolType = typeMap[featureType] || 'endmill';

    return this.search({
      type: toolType,
      material: material,
      diameter: targetDiameter
    }).slice(0, 5);
  },
  /**
   * Get tap drill for thread
   */
  getTapDrill(threadSize, threadType = 'UNC') {
    const threads = PRISM_TOOL_DATABASE_V7.threads[threadType] ||
                    PRISM_TOOL_DATABASE_V7.threads.UNC;
    const thread = threads.find(t => t.size === threadSize);
    if (!thread) return null;

    return {
      thread: thread,
      tapDrill: thread.tapDrill,
      tapDrillName: thread.tapDrillNum || `${thread.tapDrill}mm`,
      drillRecommendation: this.search({
        type: 'drill',
        diameter: thread.tapDrill
      })[0]
    };
  },
  /**
   * Get statistics
   */
  getStats() {
    return {
      ...PRISM_TOOL_DATABASE_V7.stats,
      templatesLoaded: this.getAllTemplates().length,
      cached: this.cache.size
    };
  },
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}