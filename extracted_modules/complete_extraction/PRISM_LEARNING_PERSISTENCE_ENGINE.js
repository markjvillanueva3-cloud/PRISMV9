const PRISM_LEARNING_PERSISTENCE_ENGINE = {
  version: '1.0.0',
  storageKey: 'PRISM_LEARNING_DATA',
  maxEntries: 10000,

  // Storage categories
  categories: {
    CAD_MODELS: 'cad_models',
    TOOLPATHS: 'toolpaths',
    CUTTING_PARAMS: 'cutting_params',
    MACHINES: 'machines',
    TOOLS: 'tools',
    HOLDERS: 'holders',
    FEEDBACK: 'feedback',
    PART_FEATURES: 'part_features',
    PROGRAMS: 'programs'
  },
  // Initialize storage
  init: function() {
    if (!localStorage.getItem(this.storageKey)) {
      const initial = {
        version: this.version,
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        statistics: {
          totalEntries: 0,
          entriesByCategory: {}
        },
        data: {}
      };
      for (const cat of Object.values(this.categories)) {
        initial.data[cat] = [];
        initial.statistics.entriesByCategory[cat] = 0;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(initial));
    }
    return this;
  },
  // Get all data
  getAll: function() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : this.init() && this.getAll();
  },
  // Get category data
  getCategory: function(category) {
    const all = this.getAll();
    return all.data[category] || [];
  },
  // Add learning entry
  add: function(category, entry) {
    if (!this.categories[category.toUpperCase()] && !Object.values(this.categories).includes(category)) {
      console.error('[PRISM Learning] Unknown category:', category);
      return false;
    }
    const cat = this.categories[category.toUpperCase()] || category;
    const all = this.getAll();

    const newEntry = {
      id: 'L' + Date.now() + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      ...entry
    };
    all.data[cat].push(newEntry);
    all.statistics.totalEntries++;
    all.statistics.entriesByCategory[cat]++;
    all.lastUpdated = new Date().toISOString();

    // Enforce max entries per category
    if (all.data[cat].length > this.maxEntries) {
      all.data[cat] = all.data[cat].slice(-this.maxEntries);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(all));

    // Emit event
    if (typeof UNIFIED_WORKFLOW_EVENT_BUS !== 'undefined') {
      UNIFIED_WORKFLOW_EVENT_BUS.emit('LEARNING_DATA_ADDED', { category: cat, entry: newEntry });
    }
    return newEntry.id;
  },
  // Search learning data
  search: function(category, query) {
    const data = this.getCategory(category);
    if (!query) return data;

    const queryLower = JSON.stringify(query).toLowerCase();
    return data.filter(entry => {
      const entryStr = JSON.stringify(entry).toLowerCase();
      return entryStr.includes(queryLower);
    });
  },
  // Get statistics
  getStats: function() {
    const all = this.getAll();
    return {
      ...all.statistics,
      storageUsed: new Blob([JSON.stringify(all)]).size,
      maxStorage: 5 * 1024 * 1024, // 5MB typical localStorage limit
      created: all.created,
      lastUpdated: all.lastUpdated
    };
  },
  // Export all learning data
  export: function() {
    return this.getAll();
  },
  // Import learning data
  import: function(data) {
    if (data && data.version && data.data) {
      localStorage.setItem(this.storageKey, JSON.stringify({
        ...data,
        lastUpdated: new Date().toISOString()
      }));
      return true;
    }
    return false;
  },
  // Clear category
  clearCategory: function(category) {
    const cat = this.categories[category.toUpperCase()] || category;
    const all = this.getAll();
    const count = all.data[cat]?.length || 0;
    all.data[cat] = [];
    all.statistics.totalEntries -= count;
    all.statistics.entriesByCategory[cat] = 0;
    all.lastUpdated = new Date().toISOString();
    localStorage.setItem(this.storageKey, JSON.stringify(all));
    return count;
  },
  // Clear all learning data
  clearAll: function() {
    localStorage.removeItem(this.storageKey);
    this.init();
    return true;
  }
}