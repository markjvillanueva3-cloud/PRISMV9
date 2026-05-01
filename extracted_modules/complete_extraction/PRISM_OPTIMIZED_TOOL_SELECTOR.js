const PRISM_OPTIMIZED_TOOL_SELECTOR = {
  version: '1.0.0',

  // CONFIGURATION

  config: {
    // Price level mapping (from manufacturer data)
    priceLevelMap: {
      1: { tier: 'economy', name: 'Economy', priceMultiplier: 0.6 },
      2: { tier: 'economy', name: 'Budget', priceMultiplier: 0.8 },
      3: { tier: 'balanced', name: 'Balanced', priceMultiplier: 1.0 },
      4: { tier: 'premium', name: 'Premium', priceMultiplier: 1.4 },
      5: { tier: 'premium', name: 'Ultra-Premium', priceMultiplier: 2.0 }
    },
    // Base prices by tool type (USD)
    basePrices: {
      endmill: { '0.125': 15, '0.25': 25, '0.375': 35, '0.5': 45, '0.75': 65, '1.0': 90, '1.5': 140, '2.0': 200 },
      drill: { '0.125': 12, '0.25': 20, '0.375': 30, '0.5': 40, '0.75': 55, '1.0': 75 },
      facemill: { '2.0': 150, '3.0': 250, '4.0': 400, '6.0': 600 },
      insert: { 'CNMG': 12, 'WNMG': 11, 'DNMG': 10, 'CCMT': 8, 'DCMT': 8, 'VNMG': 9 },
      tap: { 'M3': 25, 'M4': 28, 'M5': 32, 'M6': 35, 'M8': 40, 'M10': 50, '1/4-20': 35, '3/8-16': 45, '1/2-13': 55 },
      reamer: { '0.25': 45, '0.375': 55, '0.5': 70, '0.75': 95, '1.0': 130 },
      boring_bar: { '0.5': 85, '0.75': 120, '1.0': 160, '1.5': 220 }
    },
    // Tool life multipliers by quality level
    toolLifeMultipliers: {
      1: 0.6,   // Economy: 60% of baseline life
      2: 0.8,   // Budget: 80% of baseline life
      3: 1.0,   // Balanced: baseline life
      4: 1.4,   // Premium: 140% of baseline life
      5: 2.0    // Ultra-Premium: 200% of baseline life
    },
    // Coating performance factors
    coatingFactors: {
      'uncoated': { life: 1.0, speed: 1.0, cost: 1.0 },
      'TiN': { life: 1.5, speed: 1.2, cost: 1.15 },
      'TiCN': { life: 1.7, speed: 1.3, cost: 1.25 },
      'TiAlN': { life: 2.2, speed: 1.5, cost: 1.35 },
      'AlTiN': { life: 2.5, speed: 1.6, cost: 1.40 },
      'AlCrN': { life: 2.8, speed: 1.7, cost: 1.45 },
      'nACo': { life: 3.0, speed: 1.8, cost: 1.55 },
      'DLC': { life: 3.5, speed: 1.5, cost: 1.60 },
      'CVD': { life: 2.0, speed: 1.4, cost: 1.30 },
      'PVD': { life: 2.3, speed: 1.5, cost: 1.35 }
    },
    // Manufacturer quality ratings (derived from data)
    manufacturerQuality: {
      'sandvik': { quality: 95, reliability: 98, support: 95, innovation: 95 },
      'kennametal': { quality: 92, reliability: 95, support: 90, innovation: 88 },
      'iscar': { quality: 90, reliability: 92, support: 88, innovation: 92 },
      'seco': { quality: 90, reliability: 93, support: 87, innovation: 85 },
      'mitsubishi': { quality: 93, reliability: 95, support: 85, innovation: 90 },
      'walter': { quality: 91, reliability: 94, support: 88, innovation: 87 },
      'tungaloy': { quality: 88, reliability: 90, support: 82, innovation: 85 },
      'osg': { quality: 90, reliability: 92, support: 85, innovation: 88 },
      'guhring': { quality: 89, reliability: 91, support: 83, innovation: 84 },
      'emuge': { quality: 91, reliability: 93, support: 86, innovation: 86 },
      'harvey': { quality: 85, reliability: 88, support: 80, innovation: 80 },
      'helical': { quality: 86, reliability: 89, support: 82, innovation: 82 },
      'sgs': { quality: 84, reliability: 87, support: 78, innovation: 78 },
      'kyocera': { quality: 88, reliability: 90, support: 80, innovation: 83 },
      'sumitomo': { quality: 89, reliability: 91, support: 82, innovation: 85 },
      'moldino': { quality: 94, reliability: 96, support: 85, innovation: 92 },
      'yg-1': { quality: 80, reliability: 82, support: 75, innovation: 75 },
      'ma_ford': { quality: 78, reliability: 80, support: 72, innovation: 70 },
      'nachi': { quality: 82, reliability: 84, support: 76, innovation: 78 }
    }
  },
  // MAIN SELECTION FUNCTION

  /**
   * Get optimized tool recommendations by budget tier
   * @param {Object} criteria - Tool requirements
   * @param {string} criteria.type - Tool type (endmill, drill, tap, etc.)
   * @param {number} criteria.diameter - Tool diameter in inches
   * @param {string} criteria.material - Workpiece material
   * @param {string} criteria.operation - Operation type
   * @param {string} budgetTier - 'economy', 'balanced', 'premium', or 'ai-best'
   * @returns {Object} Complete recommendation with alternatives
   */
  selectOptimal(criteria, budgetTier = 'ai-best') {
    console.log('[OPTIMIZED_SELECTOR] Selecting for:', criteria, 'Budget:', budgetTier);

    const result = {
      success: false,
      budgetTier,
      recommendation: null,
      alternatives: {
        economy: null,
        balanced: null,
        premium: null
      },
      comparison: null,
      reasoning: [],
      confidence: 0
    };
    // Step 1: Get all matching tools from catalogs
    let allTools = this._getAllMatchingTools(criteria);

    if (allTools.length === 0) {
      result.reasoning.push({
        step: 'Search',
        result: 'No matching tools found',
        suggestion: 'Broadening search criteria'
      });

      // Try broader search
      allTools = this._getBroadMatchTools(criteria);
    }
    if (allTools.length === 0) {
      return result;
    }
    result.reasoning.push({
      step: 'Search',
      result: `Found ${allTools.length} matching tools`,
      data: { totalFound: allTools.length }
    });

    // Step 2: Score all tools
    const scoredTools = this._scoreAllTools(allTools, criteria);

    result.reasoning.push({
      step: 'Scoring',
      result: 'Applied multi-factor scoring',
      factors: ['fit', 'performance', 'value', 'reliability']
    });

    // Step 3: Separate by tier
    const byTier = this._separateByTier(scoredTools);

    // Step 4: Select best in each tier
    result.alternatives.economy = this._selectBestInTier(byTier.economy, 'economy', criteria);
    result.alternatives.balanced = this._selectBestInTier(byTier.balanced, 'balanced', criteria);
    result.alternatives.premium = this._selectBestInTier(byTier.premium, 'premium', criteria);

    // Step 5: Select based on requested tier
    if (budgetTier === 'ai-best') {
      result.recommendation = this._selectAIBest(result.alternatives, criteria);
      result.reasoning.push({
        step: 'AI Selection',
        result: `Selected ${result.recommendation?.tool?.name || 'N/A'}`,
        reason: result.recommendation?.aiReasoning || 'Best value considering all factors'
      });
    } else {
      result.recommendation = result.alternatives[budgetTier];
      result.reasoning.push({
        step: 'Tier Selection',
        result: `Selected ${budgetTier} option`,
        tool: result.recommendation?.tool?.name
      });
    }
    // Step 6: Generate comparison
    result.comparison = this._generateComparison(result.alternatives, criteria);

    // Step 7: Calculate confidence
    result.confidence = this._calculateConfidence(result, criteria);
    result.success = result.recommendation !== null;

    return result;
  },
  // TOOL RETRIEVAL

  _getAllMatchingTools(criteria) {
    const tools = [];

    // Search PRISM_MANUFACTURER_CONNECTOR if available
    if (typeof PRISM_MANUFACTURER_CONNECTOR !== 'undefined') {
      const search = PRISM_MANUFACTURER_CONNECTOR.findTools({
        type: criteria.type,
        diameter: criteria.diameter,
        material: criteria.material,
        operation: criteria.operation
      });

      if (search.tools) {
        tools.push(...search.tools.map(t => ({
          ...t,
          source: 'manufacturer_catalog'
        })));
      }
    }
    // Search PRISM_TOOL_DATABASE_V7 if available
    if (typeof window.PRISM_TOOL_DATABASE_V7 !== 'undefined') {
      const dbTools = this._searchToolDatabase(criteria);
      tools.push(...dbTools.map(t => ({
        ...t,
        source: 'tool_database'
      })));
    }
    // Search individual catalogs
    if (typeof PRISM_MAJOR_MANUFACTURERS_CATALOG !== 'undefined') {
      const catalogTools = this._searchCatalogs(criteria, PRISM_MAJOR_MANUFACTURERS_CATALOG);
      tools.push(...catalogTools);
    }
    if (typeof PRISM_MANUFACTURERS_CATALOG_BATCH2 !== 'undefined') {
      const batch2Tools = this._searchCatalogs(criteria, PRISM_MANUFACTURERS_CATALOG_BATCH2);
      tools.push(...batch2Tools);
    }
    // Remove duplicates
    return this._deduplicateTools(tools);
  },
  _getBroadMatchTools(criteria) {
    // Broaden search by relaxing constraints
    const broadCriteria = { ...criteria };

    // Allow ±20% diameter variation
    if (broadCriteria.diameter) {
      broadCriteria.diameterMin = broadCriteria.diameter * 0.8;
      broadCriteria.diameterMax = broadCriteria.diameter * 1.2;
    }
    // Remove material constraint
    delete broadCriteria.material;

    return this._getAllMatchingTools(broadCriteria);
  },
  _searchToolDatabase(criteria) {
    const results = [];
    const db = PRISM_TOOL_DATABASE_V7;

    if (!db) return results;

    // Map criteria type to database categories
    const categoryMap = {
      'endmill': ['endmills', 'solid_carbide', 'indexable_mills'],
      'drill': ['drills', 'solid_drills', 'indexable_drills'],
      'tap': ['taps', 'thread_mills'],
      'reamer': ['reamers'],
      'boring_bar': ['boring_bars'],
      'facemill': ['face_mills', 'indexable_mills']
    };
    const categories = categoryMap[criteria.type] || [criteria.type];

    for (const category of categories) {
      if (db[category]) {
        for (const tool of Object.values(db[category])) {
          if (this._toolMatchesCriteria(tool, criteria)) {
            results.push(tool);
          }
        }
      }
    }
    return results;
  },
  _searchCatalogs(criteria, catalog) {
    const results = [];

    for (const [mfrKey, mfr] of Object.entries(catalog)) {
      const priceLevel = mfr.manufacturer?.priceLevel || 3;
      const quality = mfr.manufacturer?.quality || 'Standard';

      // Search milling products
      if (criteria.type === 'endmill' && mfr.milling) {
        for (const [catKey, category] of Object.entries(mfr.milling)) {
          for (const [prodKey, product] of Object.entries(category)) {
            if (this._productMatchesCriteria(product, criteria)) {
              results.push({
                ...product,
                manufacturer: mfr.manufacturer?.name || mfrKey,
                manufacturerKey: mfrKey,
                priceLevel,
                quality,
                source: 'catalog'
              });
            }
          }
        }
      }
      // Search drilling products
      if (criteria.type === 'drill' && mfr.drilling) {
        for (const [catKey, category] of Object.entries(mfr.drilling)) {
          for (const [prodKey, product] of Object.entries(category)) {
            if (this._productMatchesCriteria(product, criteria)) {
              results.push({
                ...product,
                manufacturer: mfr.manufacturer?.name || mfrKey,
                manufacturerKey: mfrKey,
                priceLevel,
                quality,
                source: 'catalog'
              });
            }
          }
        }
      }
    }
    return results;
  },
  _toolMatchesCriteria(tool, criteria) {
    // Check diameter
    if (criteria.diameter) {
      const toolDia = tool.diameter || tool.dia || tool.size;
      if (toolDia) {
        const diff = Math.abs(toolDia - criteria.diameter);
        if (diff > criteria.diameter * 0.1) return false; // Within 10%
      }
    }
    return true;
  },
  _productMatchesCriteria(product, criteria) {
    // Check diameter range
    if (criteria.diameter && product.diameterRange) {
      const range = product.diameterRange.inch || product.diameterRange.metric?.map(d => d / 25.4);
      if (range) {
        const minDia = Math.min(...range);
        const maxDia = Math.max(...range);
        if (criteria.diameter < minDia * 0.9 || criteria.diameter > maxDia * 1.1) {
          return false;
        }
      }
    }
    return true;
  },
  _deduplicateTools(tools) {
    const seen = new Map();

    for (const tool of tools) {
      const key = `${tool.manufacturer}_${tool.name}_${tool.series || ''}`;
      if (!seen.has(key) || (tool.score || 0) > (seen.get(key).score || 0)) {
        seen.set(key, tool);
      }
    }
    return Array.from(seen.values());
  },
  // MULTI-FACTOR SCORING

  _scoreAllTools(tools, criteria) {
    return tools.map(tool => {
      const scores = {
        fit: this._calculateFitScore(tool, criteria),
        performance: this._calculatePerformanceScore(tool, criteria),
        value: this._calculateValueScore(tool, criteria),
        reliability: this._calculateReliabilityScore(tool),
        overall: 0
      };
      // Weighted overall score
      scores.overall =
        scores.fit * 0.30 +           // 30% - How well does it match requirements
        scores.performance * 0.25 +   // 25% - Expected performance
        scores.value * 0.25 +         // 25% - Value for money
        scores.reliability * 0.20;    // 20% - Brand reliability

      // Calculate price
      const price = this._calculatePrice(tool, criteria);

      // Calculate tool life estimate
      const toolLife = this._estimateToolLife(tool, criteria);

      // Calculate cost per part
      const costPerPart = price / toolLife.partsPerTool;

      return {
        ...tool,
        scores,
        price,
        toolLife,
        costPerPart
      };
    }).sort((a, b) => b.scores.overall - a.scores.overall);
  },
  _calculateFitScore(tool, criteria) {
    let score = 50; // Base

    // Diameter match (up to +30)
    if (criteria.diameter) {
      const toolDia = tool.diameter || this._extractDiameter(tool);
      if (toolDia) {
        const diff = Math.abs(toolDia - criteria.diameter) / criteria.diameter;
        if (diff < 0.05) score += 30;      // Within 5%
        else if (diff < 0.1) score += 20;  // Within 10%
        else if (diff < 0.2) score += 10;  // Within 20%
      }
    }
    // Material compatibility (up to +20)
    if (criteria.material && tool.applications) {
      const matLower = criteria.material.toLowerCase();
      if (tool.applications.some(a => a.toLowerCase().includes(matLower))) {
        score += 20;
      } else if (tool.applications.some(a =>
        (matLower.includes('aluminum') && a.toLowerCase().includes('non-ferrous')) ||
        (matLower.includes('steel') && a.toLowerCase().includes('ferrous'))
      )) {
        score += 10;
      }
    }
    return Math.min(score, 100);
  },
  _calculatePerformanceScore(tool, criteria) {
    let score = 50; // Base

    // Quality level bonus
    const priceLevel = tool.priceLevel || 3;
    score += (priceLevel - 3) * 8; // -16 to +16 based on quality

    // Coating bonus
    const coating = this._identifyCoating(tool);
    const coatingFactor = this.config.coatingFactors[coating] || this.config.coatingFactors.uncoated;
    score += (coatingFactor.life - 1) * 20; // Up to +40 for best coatings

    // Manufacturer quality
    const mfrKey = (tool.manufacturerKey || tool.manufacturer || '').toLowerCase();
    const mfrQuality = this.config.manufacturerQuality[mfrKey];
    if (mfrQuality) {
      score += (mfrQuality.quality - 80) / 2; // Scale 80-100 to 0-10
    }

    return Math.min(Math.max(score, 0), 100);
  }