const PRISM_HEALTH_VALIDATOR = {
  version: '1.0.0',

  // Run all validation checks
  runAllChecks() {
    const results = {
      timestamp: Date.now(),
      passed: 0,
      failed: 0,
      warnings: 0,
      checks: []
    };
    // Check core modules
    results.checks.push(this.checkCoreModules());

    // Check data access
    results.checks.push(this.checkDataAccess());

    // Check UI elements
    results.checks.push(this.checkUIElements());

    // Check state management
    results.checks.push(this.checkStateManagement());

    // Summarize
    for (const check of results.checks) {
      if (check.status === 'pass') results.passed++;
      else if (check.status === 'fail') results.failed++;
      else results.warnings++;
    }
    console.log('[Validator] Results:', results.passed, 'passed,', results.failed, 'failed,', results.warnings, 'warnings');

    return results;
  },
  checkCoreModules() {
    const check = {
      name: 'Core Modules',
      status: 'pass',
      details: []
    };
    const requiredModules = [
      'PRISM_INIT_ORCHESTRATOR',
      'PRISM_ERROR_HANDLER',
      'PRISM_EVENT_MANAGER',
      'PRISM_STATE',
      'PRISM_UNIFIED_DATA'
    ];

    for (const mod of requiredModules) {
      if (typeof window[mod] !== 'undefined') {
        check.details.push({ module: mod, status: 'ok' });
      } else {
        check.details.push({ module: mod, status: 'missing' });
        check.status = 'fail';
      }
    }
    return check;
  },
  checkDataAccess() {
    const check = {
      name: 'Data Access',
      status: 'pass',
      details: []
    };
    try {
      const machineCount = Object.keys(PRISM_UNIFIED_DATA.machines.getAll()).length;
      check.details.push({ data: 'machines', count: machineCount });
      if (machineCount === 0) {
        check.status = 'warning';
        check.details.push({ warning: 'No machine data loaded' });
      }
      const materialCount = Object.keys(PRISM_UNIFIED_DATA.materials.getAll()).length;
      check.details.push({ data: 'materials', count: materialCount });

      const toolCount = Object.keys(PRISM_UNIFIED_DATA.tools.getAll()).length;
      check.details.push({ data: 'tools', count: toolCount });

    } catch (e) {
      check.status = 'fail';
      check.details.push({ error: e.message });
    }
    return check;
  },
  checkUIElements() {
    const check = {
      name: 'UI Elements',
      status: 'pass',
      details: []
    };
    // Check for critical elements
    const criticalElements = [
      'machineSelect',
      'materialSelect',
      'main-content'
    ];

    for (const id of criticalElements) {
      const el = document.getElementById(id);
      check.details.push({
        element: id,
        exists: !!el
      });
    }
    // Check for duplicate IDs
    const allIds = document.querySelectorAll('[id]');
    const idCounts = {};
    allIds.forEach(el => {
      idCounts[el.id] = (idCounts[el.id] || 0) + 1;
    });

    const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);
    if (duplicates.length > 0) {
      check.status = 'warning';
      check.details.push({
        warning: 'Duplicate IDs found',
        count: duplicates.length
      });
    }
    return check;
  },
  checkStateManagement() {
    const check = {
      name: 'State Management',
      status: 'pass',
      details: []
    };
    try {
      const snapshot = PRISM_STATE.getSnapshot();
      check.details.push({
        stateKeys: Object.keys(snapshot.state).length,
        subscribers: snapshot.subscriberCount
      });
    } catch (e) {
      check.status = 'fail';
      check.details.push({ error: e.message });
    }
    return check;
  },
  // Quick health check
  isHealthy() {
    const results = this.runAllChecks();
    return results.failed === 0;
  }
}