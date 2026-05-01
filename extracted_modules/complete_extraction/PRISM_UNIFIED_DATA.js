const PRISM_UNIFIED_DATA = {
  version: '1.0.0',

  // MACHINE DATA ACCESS

  machines: {
    _cache: null,

    // Get all machines through unified accessor
    getAll() {
      // Try unified accessor first
      if (typeof UNIFIED_MACHINES_ACCESS !== 'undefined') {
        return UNIFIED_MACHINES_ACCESS.getAll?.() ||
               UNIFIED_MACHINES_ACCESS.machines ||
               {};
      }
      // Fallback to individual databases
      const allMachines = {};

      if (typeof MACHINE_DATABASE !== 'undefined') {
        Object.assign(allMachines, MACHINE_DATABASE);
      }
      if (typeof LATHE_MACHINE_DATABASE !== 'undefined') {
        Object.assign(allMachines, LATHE_MACHINE_DATABASE);
      }
      if (typeof EDM_MACHINE_DATABASE !== 'undefined') {
        Object.assign(allMachines, EDM_MACHINE_DATABASE);
      }
      if (typeof LASER_MACHINE_DATABASE !== 'undefined') {
        Object.assign(allMachines, LASER_MACHINE_DATABASE);
      }
      if (typeof WATERJET_MACHINE_DATABASE !== 'undefined') {
        Object.assign(allMachines, WATERJET_MACHINE_DATABASE);
      }
      return allMachines;
    },
    // Get single machine by ID
    get(machineId) {
      if (!machineId) return null;

      // Try unified accessor
      if (typeof UNIFIED_MACHINES_ACCESS !== 'undefined' && UNIFIED_MACHINES_ACCESS.getMachine) {
        return UNIFIED_MACHINES_ACCESS.getMachine(machineId);
      }
      // Search all databases
      const all = this.getAll();

      // Direct lookup
      if (all[machineId]) return all[machineId];

      // Case-insensitive search
      const lowerKey = machineId.toLowerCase();
      for (const [key, value] of Object.entries(all)) {
        if (key.toLowerCase() === lowerKey) return value;
      }
      return null;
    },
    // Search machines
    search(query, options = {}) {
      const all = this.getAll();
      const results = [];
      const lowerQuery = (query || '').toLowerCase();

      for (const [key, machine] of Object.entries(all)) {
        const name = (machine.name || machine.model || key).toLowerCase();
        const brand = (machine.brand || machine.manufacturer || '').toLowerCase();

        if (name.includes(lowerQuery) || brand.includes(lowerQuery) || key.toLowerCase().includes(lowerQuery)) {
          results.push({ id: key, ...machine });
        }
      }
      // Apply filters
      if (options.type) {
        return results.filter(m => m.type === options.type);
      }
      if (options.brand) {
        return results.filter(m => (m.brand || m.manufacturer || '').toLowerCase() === options.brand.toLowerCase());
      }
      return results;
    },
    // Get machine types
    getTypes() {
      const types = new Set();
      const all = this.getAll();

      for (const machine of Object.values(all)) {
        if (machine.type) types.add(machine.type);
      }
      return Array.from(types);
    },
    // Get brands
    getBrands() {
      const brands = new Set();
      const all = this.getAll();

      for (const machine of Object.values(all)) {
        const brand = machine.brand || machine.manufacturer;
        if (brand) brands.add(brand);
      }
      return Array.from(brands).sort();
    }
  },
  // MATERIAL DATA ACCESS

  materials: {
    getAll() {
      if (typeof UNIFIED_MATERIALS_ACCESS !== 'undefined') {
        return UNIFIED_MATERIALS_ACCESS.getAll?.() ||
               UNIFIED_MATERIALS_ACCESS.materials ||
               {};
      }
      if (typeof MATERIAL_DATABASE !== 'undefined') {
        return MATERIAL_DATABASE;
      }
      return {};
    },
    get(materialId) {
      if (!materialId) return null;

      if (typeof UNIFIED_MATERIALS_ACCESS !== 'undefined' && UNIFIED_MATERIALS_ACCESS.getMaterial) {
        return UNIFIED_MATERIALS_ACCESS.getMaterial(materialId);
      }
      const all = this.getAll();
      return all[materialId] || null;
    },
    search(query) {
      const all = this.getAll();
      const results = [];
      const lowerQuery = (query || '').toLowerCase();

      for (const [key, material] of Object.entries(all)) {
        const name = (material.name || key).toLowerCase();
        if (name.includes(lowerQuery) || key.toLowerCase().includes(lowerQuery)) {
          results.push({ id: key, ...material });
        }
      }
      return results;
    },
    getCategories() {
      const categories = new Set();
      const all = this.getAll();

      for (const material of Object.values(all)) {
        if (material.category) categories.add(material.category);
        if (material.type) categories.add(material.type);
      }
      return Array.from(categories);
    }
  },
  // TOOL DATA ACCESS

  tools: {
    getAll() {
      if (typeof UNIFIED_TOOLS_ACCESS !== 'undefined') {
        return UNIFIED_TOOLS_ACCESS.getAll?.() ||
               UNIFIED_TOOLS_ACCESS.tools ||
               {};
      }
      const allTools = {};

      if (typeof CUTTING_TOOL_DATABASE !== 'undefined') {
        Object.assign(allTools, CUTTING_TOOL_DATABASE);
      }
      if (typeof PRISM_TOOL_DATABASE !== 'undefined') {
        Object.assign(allTools, PRISM_TOOL_DATABASE);
      }
      return allTools;
    },
    get(toolId) {
      if (!toolId) return null;

      if (typeof UNIFIED_TOOLS_ACCESS !== 'undefined' && UNIFIED_TOOLS_ACCESS.getTool) {
        return UNIFIED_TOOLS_ACCESS.getTool(toolId);
      }
      const all = this.getAll();
      return all[toolId] || null;
    },
    search(query, options = {}) {
      const all = this.getAll();
      const results = [];
      const lowerQuery = (query || '').toLowerCase();

      for (const [key, tool] of Object.entries(all)) {
        const name = (tool.name || tool.description || key).toLowerCase();
        if (name.includes(lowerQuery) || key.toLowerCase().includes(lowerQuery)) {
          results.push({ id: key, ...tool });
        }
      }
      if (options.type) {
        return results.filter(t => t.type === options.type);
      }
      return results;
    }
  },
  // ALARM DATA ACCESS

  alarms: {
    get(code, controller) {
      if (typeof UNIFIED_ALARMS_ACCESS !== 'undefined' && UNIFIED_ALARMS_ACCESS.lookupAlarm) {
        return UNIFIED_ALARMS_ACCESS.lookupAlarm(code, controller);
      }
      if (typeof lookupAlarm === 'function') {
        return lookupAlarm(code, controller);
      }
      return null;
    },
    search(query, controller) {
      if (typeof UNIFIED_ALARMS_ACCESS !== 'undefined' && UNIFIED_ALARMS_ACCESS.searchAlarms) {
        return UNIFIED_ALARMS_ACCESS.searchAlarms(query, controller);
      }
      return [];
    }
  },
  // UTILITY METHODS

  // Get data health report
  getHealthReport() {
    return {
      machines: {
        count: Object.keys(this.machines.getAll()).length,
        types: this.machines.getTypes().length,
        brands: this.machines.getBrands().length
      },
      materials: {
        count: Object.keys(this.materials.getAll()).length,
        categories: this.materials.getCategories().length
      },
      tools: {
        count: Object.keys(this.tools.getAll()).length
      }
    };
  }
}