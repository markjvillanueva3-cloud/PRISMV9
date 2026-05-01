const PRISM_MANUFACTURER_CONNECTOR = {
  version: '1.0.0',

  /**
   * Search all manufacturer catalogs for matching tools
   */
  findTools(criteria) {
    const {
      type,           // 'endmill', 'drill', 'tap', 'insert', etc.
      diameter,       // Tool diameter
      material,       // Workpiece material
      operation,      // Operation type
      manufacturer,   // Preferred manufacturer (optional)
      maxPrice,       // Maximum price (optional)
      inStock         // Only in-stock items (optional)
    } = criteria;

    const results = [];

    // Search PRISM_MAJOR_MANUFACTURERS_CATALOG (Batch 1)
    if (typeof PRISM_MAJOR_MANUFACTURERS_CATALOG !== 'undefined') {
      const batch1Results = this._searchCatalog(PRISM_MAJOR_MANUFACTURERS_CATALOG, criteria);
      results.push(...batch1Results);
    }
    // Search PRISM_MANUFACTURERS_CATALOG_BATCH2
    if (typeof PRISM_MANUFACTURERS_CATALOG_BATCH2 !== 'undefined') {
      const batch2Results = this._searchCatalog(PRISM_MANUFACTURERS_CATALOG_BATCH2, criteria);
      results.push(...batch2Results);
    }
    // Search PRISM_ZENI_COMPLETE_CATALOG
    if (typeof PRISM_ZENI_COMPLETE_CATALOG !== 'undefined') {
      const zeniResults = this._searchZeniCatalog(criteria);
      results.push(...zeniResults);
    }
    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);

    return {
      count: results.length,
      tools: results.slice(0, 20), // Return top 20
      manufacturers: [...new Set(results.map(r => r.manufacturer))]
    };
  },
  _searchCatalog(catalog, criteria) {
    const results = [];

    for (const [mfrKey, mfr] of Object.entries(catalog)) {
      if (typeof mfr !== 'object' || !mfr.manufacturer) continue;

      // Check manufacturer filter
      if (criteria.manufacturer &&
          !mfr.manufacturer.name.toLowerCase().includes(criteria.manufacturer.toLowerCase())) {
        continue;
      }
      // Search milling
      if (mfr.milling && (criteria.type === 'endmill' || !criteria.type)) {
        this._searchMillingProducts(mfr, mfrKey, criteria, results);
      }
      // Search drilling
      if (mfr.drilling && (criteria.type === 'drill' || !criteria.type)) {
        this._searchDrillingProducts(mfr, mfrKey, criteria, results);
      }
      // Search turning
      if (mfr.turning && (criteria.type === 'insert' || criteria.type === 'turning' || !criteria.type)) {
        this._searchTurningProducts(mfr, mfrKey, criteria, results);
      }
      // Search tapping
      if (mfr.tapping && (criteria.type === 'tap' || !criteria.type)) {
        this._searchTappingProducts(mfr, mfrKey, criteria, results);
      }
    }
    return results;
  },
  _searchMillingProducts(mfr, mfrKey, criteria, results) {
    const millingCategories = ['solidCarbide', 'indexable', 'highFeed', 'ballNose'];

    for (const cat of millingCategories) {
      if (!mfr.milling[cat]) continue;

      for (const [productKey, product] of Object.entries(mfr.milling[cat])) {
        let score = 50; // Base score

        // Check diameter match
        if (criteria.diameter && product.diameterRange) {
          const range = product.diameterRange.metric || product.diameterRange.inch;
          if (range) {
            const diamMm = criteria.diameter * 25.4; // Convert to mm
            if (range.includes(Math.round(diamMm)) || range.includes(diamMm)) {
              score += 30;
            } else if (range.some(d => Math.abs(d - diamMm) < 1)) {
              score += 15;
            }
          }
        }
        // Check material compatibility
        if (criteria.material && product.applications) {
          const matLower = criteria.material.toLowerCase();
          if (product.applications.some(a => a.toLowerCase().includes(matLower))) {
            score += 25;
          }
        }
        results.push({
          manufacturer: mfr.manufacturer.name,
          manufacturerKey: mfrKey,
          category: 'milling',
          subCategory: cat,
          productKey,
          name: product.name,
          type: product.type,
          series: product.series,
          coatings: product.coatings,
          diameterRange: product.diameterRange,
          score,
          priceLevel: mfr.manufacturer.priceLevel
        });
      }
    }
  },
  _searchDrillingProducts(mfr, mfrKey, criteria, results) {
    const drillingCategories = ['solidCarbide', 'indexable', 'hss', 'micro'];

    for (const cat of drillingCategories) {
      if (!mfr.drilling[cat]) continue;

      for (const [productKey, product] of Object.entries(mfr.drilling[cat])) {
        let score = 50;

        if (criteria.diameter && product.diameterRange) {
          const range = product.diameterRange.metric || product.diameterRange.inch;
          if (range) {
            const diamMm = criteria.diameter * 25.4;
            if (range.includes(Math.round(diamMm)) || range.some(d => Math.abs(d - diamMm) < 0.5)) {
              score += 30;
            }
          }
        }
        results.push({
          manufacturer: mfr.manufacturer.name,
          manufacturerKey: mfrKey,
          category: 'drilling',
          subCategory: cat,
          productKey,
          name: product.name,
          type: product.type,
          diameterRange: product.diameterRange,
          depthCapability: product.depthCapability,
          score,
          priceLevel: mfr.manufacturer.priceLevel
        });
      }
    }
  },
  _searchTurningProducts(mfr, mfrKey, criteria, results) {
    if (!mfr.turning) return;

    for (const [catKey, category] of Object.entries(mfr.turning)) {
      if (typeof category !== 'object') continue;

      for (const [productKey, product] of Object.entries(category)) {
        if (typeof product !== 'object') continue;

        let score = 50;

        // Check material compatibility via grades
        if (criteria.material && product.grades) {
          const matLower = criteria.material.toLowerCase();
          if (matLower.includes('steel') && product.grades.steel) score += 30;
          if (matLower.includes('stainless') && product.grades.stainless) score += 30;
          if (matLower.includes('aluminum') && product.grades.aluminum) score += 30;
        }
        results.push({
          manufacturer: mfr.manufacturer.name,
          manufacturerKey: mfrKey,
          category: 'turning',
          subCategory: catKey,
          productKey,
          name: product.name || productKey,
          type: product.type,
          inserts: product.inserts,
          grades: product.grades,
          chipbreakers: product.chipbreakers,
          score,
          priceLevel: mfr.manufacturer.priceLevel
        });
      }
    }
  },
  _searchTappingProducts(mfr, mfrKey, criteria, results) {
    if (!mfr.tapping) return;

    for (const [catKey, category] of Object.entries(mfr.tapping)) {
      if (typeof category !== 'object') continue;

      for (const [productKey, product] of Object.entries(category)) {
        if (typeof product !== 'object') continue;

        let score = 50;

        results.push({
          manufacturer: mfr.manufacturer.name,
          manufacturerKey: mfrKey,
          category: 'tapping',
          subCategory: catKey,
          productKey,
          name: product.name || productKey,
          type: product.type,
          threadForms: product.threadForms,
          sizeRange: product.sizeRange,
          coatings: product.coatings,
          score,
          priceLevel: mfr.manufacturer.priceLevel
        });
      }
    }
  },
  _searchZeniCatalog(criteria) {
    const results = [];

    if (typeof PRISM_ZENI_COMPLETE_CATALOG === 'undefined') return results;

    const zeni = PRISM_ZENI_COMPLETE_CATALOG;

    // Search turning
    if (zeni.turning && (criteria.type === 'insert' || !criteria.type)) {
      if (zeni.turning.inserts) {
        for (const [style, inserts] of Object.entries(zeni.turning.inserts)) {
          results.push({
            manufacturer: 'Zeni Tools',
            manufacturerKey: 'zeni',
            category: 'turning',
            subCategory: 'inserts',
            productKey: style,
            name: `Zeni ${style} Insert`,
            type: 'turning_insert',
            sizes: inserts.sizes,
            grades: zeni.turning.grades,
            score: 60, // Good value
            priceLevel: 2
          });
        }
      }
    }
    // Search high feed
    if (zeni.highFeed && (criteria.type === 'endmill' || !criteria.type)) {
      for (const [seriesKey, series] of Object.entries(zeni.highFeed)) {
        if (typeof series !== 'object') continue;

        results.push({
          manufacturer: 'Zeni Tools',
          manufacturerKey: 'zeni',
          category: 'milling',
          subCategory: 'highFeed',
          productKey: seriesKey,
          name: series.name || `Zeni High Feed ${seriesKey}`,
          type: 'high_feed_endmill',
          diameterRange: series.diameterRange,
          score: 65,
          priceLevel: 2
        });
      }
    }
    return results;
  },
  /**
   * Get tool recommendation with pricing estimate
   */
  getRecommendation(criteria) {
    const searchResults = this.findTools(criteria);

    if (searchResults.count === 0) {
      return {
        found: false,
        message: 'No matching tools found in manufacturer catalogs',
        suggestion: 'Try broadening your search criteria'
      };
    }
    const top = searchResults.tools[0];
    const alternatives = searchResults.tools.slice(1, 4);

    // Estimate pricing based on price level
    const priceMultipliers = { 1: 0.7, 2: 1.0, 3: 1.3, 4: 1.5, 5: 2.0 };
    const basePrices = {
      endmill: { '0.25': 25, '0.5': 40, '0.75': 60, '1.0': 85 },
      drill: { '0.25': 20, '0.5': 35, '0.75': 50, '1.0': 70 },
      insert: { default: 12 },
      tap: { default: 45 }
    };
    const estimatePrice = (tool) => {
      const baseType = tool.category === 'milling' ? 'endmill' :
                       tool.category === 'drilling' ? 'drill' :
                       tool.category === 'turning' ? 'insert' : 'tap';
      const base = basePrices[baseType]?.default || basePrices[baseType]?.['0.5'] || 40;
      return Math.round(base * (priceMultipliers[tool.priceLevel] || 1));
    };
    return {
      found: true,
      recommendation: {
        ...top,
        estimatedPrice: estimatePrice(top)
      },
      alternatives: alternatives.map(a => ({
        ...a,
        estimatedPrice: estimatePrice(a)
      })),
      totalOptions: searchResults.count,
      manufacturers: searchResults.manufacturers
    };
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_MANUFACTURER_CONNECTOR] v1.0 initialized');

    let catalogs = 0;
    if (typeof PRISM_MAJOR_MANUFACTURERS_CATALOG !== 'undefined') catalogs++;
    if (typeof PRISM_MANUFACTURERS_CATALOG_BATCH2 !== 'undefined') catalogs++;
    if (typeof PRISM_ZENI_COMPLETE_CATALOG !== 'undefined') catalogs++;

    console.log('  Connected catalogs:', catalogs);
    return this;
  }
}