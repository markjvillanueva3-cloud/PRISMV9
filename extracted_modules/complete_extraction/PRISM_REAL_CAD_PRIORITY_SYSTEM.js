const PRISM_REAL_CAD_PRIORITY_SYSTEM = {
  version: '1.0.0',

  priorities: {
    'uploaded_cad': 100,      // Highest - real manufacturer CAD
    'scanned_model': 90,      // 3D scanned models
    'verified_model': 80,     // User verified models
    'learned_model': 70,      // Machine learning derived
    'generated_model': 50,    // PRISM generated
    'placeholder': 10         // Basic placeholder
  },
  /**
   * Get best available model for a machine
   */
  getBestModel(machineId) {
    const candidates = [];

    // Check Okuma database
    if (typeof PRISM_OKUMA_MACHINE_CAD_DATABASE !== 'undefined') {
      const okuma = PRISM_OKUMA_MACHINE_CAD_DATABASE.getMachine(machineId);
      if (okuma) candidates.push({ source: 'OKUMA_CAD', data: okuma, priority: this.priorities.uploaded_cad });
    }
    // Check learning engine
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      const learned = PRISM_MACHINE_3D_LEARNING_ENGINE.learnedDimensions[machineId];
      if (learned) {
        const prio = learned.priority === 'uploaded_cad' ? this.priorities.uploaded_cad : this.priorities.learned_model;
        candidates.push({ source: 'LEARNING_ENGINE', data: learned, priority: prio });
      }
    }
    // Check model database
    if (typeof PRISM_MACHINE_3D_MODEL_DATABASE_V2 !== 'undefined') {
      const model = PRISM_MACHINE_3D_MODEL_DATABASE_V2.machines?.[machineId];
      if (model) candidates.push({ source: 'MODEL_DB', data: model, priority: this.priorities.generated_model });
    }
    // Sort by priority (highest first)
    candidates.sort((a, b) => b.priority - a.priority);

    if (candidates.length > 0) {
      console.log('[CAD_PRIORITY] Best model for', machineId, ':', candidates[0].source, 'Priority:', candidates[0].priority);
      return candidates[0];
    }
    return null;
  },
  /**
   * Check if real CAD is available for a machine
   */
  hasRealCAD(machineId) {
    const best = this.getBestModel(machineId);
    return best && best.priority >= this.priorities.uploaded_cad;
  },
  /**
   * Get all machines with real CAD available
   */
  getMachinesWithRealCAD() {
    const machines = [];

    // Okuma machines
    if (typeof PRISM_OKUMA_MACHINE_CAD_DATABASE !== 'undefined') {
      const okumaMachines = PRISM_OKUMA_MACHINE_CAD_DATABASE.listMachines();
      machines.push(...okumaMachines.map(m => ({ ...m, cadSource: 'OKUMA' })));
    }
    // Other uploaded machines from learning engine
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      for (const [id, data] of Object.entries(PRISM_MACHINE_3D_LEARNING_ENGINE.learnedDimensions || {})) {
        if (data.priority === 'uploaded_cad' && !machines.find(m => m.id === id)) {
          machines.push({ id, ...data, cadSource: data.manufacturer || 'UPLOADED' });
        }
      }
    }
    return machines;
  }
}