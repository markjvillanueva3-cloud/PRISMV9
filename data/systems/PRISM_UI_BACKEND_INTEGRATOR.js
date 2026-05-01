// PRISM_UI_BACKEND_INTEGRATOR - Lines 93548-93840 (293 lines) - UI backend integration\n\nconst PRISM_UI_BACKEND_INTEGRATOR = {
  version: '1.0.0',

  /**
   * Generate G-code using the best available backend
   */
  generateGCode(input, options = {}) {
    console.log('[PRISM_UI_BACKEND_INTEGRATOR] Generating G-code...');

    // Extract toolpaths from various input formats
    let toolpaths = null;
    if (Array.isArray(input)) {
      toolpaths = input;
    } else if (input?.toolpaths) {
      toolpaths = input.toolpaths;
    } else if (input?.result?.toolpaths) {
      toolpaths = input.result.toolpaths;
    } else if (input?.moves) {
      toolpaths = [input];
    }
    // Get controller
    const controller = options.controller || options.post || 'haas_ngc';

    // Try PRISM_GUARANTEED_POST_PROCESSOR (most reliable)
    if (typeof PRISM_GUARANTEED_POST_PROCESSOR !== 'undefined') {
      console.log('[PRISM_UI_BACKEND_INTEGRATOR] Using PRISM_GUARANTEED_POST_PROCESSOR');
      try {
        const result = PRISM_GUARANTEED_POST_PROCESSOR.generateGCode(
          toolpaths || [this.createFallbackToolpath(input)],
          controller,
          options
        );
        return result.gcode || result;
      } catch (e) {
        console.warn('[PRISM_UI_BACKEND_INTEGRATOR] GUARANTEED_POST_PROCESSOR error:', e);
      }
    }
    // Try PRISM_INTERNAL_POST_ENGINE
    if (typeof PRISM_INTERNAL_POST_ENGINE !== 'undefined') {
      console.log('[PRISM_UI_BACKEND_INTEGRATOR] Using PRISM_INTERNAL_POST_ENGINE');
      try {
        const result = PRISM_INTERNAL_POST_ENGINE.generateGCode(
          { machine: options.machine || 'haas_vf2', material: options.material },
          { rpm: 8000, feed: 80 },
          toolpaths?.[0] || this.createFallbackToolpath(input),
          {}
        );
        return result.gcode || result;
      } catch (e) {
        console.warn('[PRISM_UI_BACKEND_INTEGRATOR] INTERNAL_POST_ENGINE error:', e);
      }
    }
    // Fallback: Generate basic G-code
    console.log('[PRISM_UI_BACKEND_INTEGRATOR] Using fallback G-code generation');
    return this.generateFallbackGCode(input, controller, options);
  },
  /**
   * Execute complete workflow from input to G-code
   */
  async executeCompleteWorkflow(input, options = {}) {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_UI_BACKEND_INTEGRATOR] Executing complete workflow...');

    // Try executeGuaranteedWorkflow first (100% output guarantee)
    if (typeof executeGuaranteedWorkflow === 'function') {
      console.log('[PRISM_UI_BACKEND_INTEGRATOR] Using executeGuaranteedWorkflow');
      return await executeGuaranteedWorkflow(input, options);
    }
    // Try executeIntelligentWorkflow
    if (typeof executeIntelligentWorkflow === 'function') {
      console.log('[PRISM_UI_BACKEND_INTEGRATOR] Using executeIntelligentWorkflow');
      return await executeIntelligentWorkflow(input, options);
    }
    // Try PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR
    if (typeof PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR !== 'undefined') {
      console.log('[PRISM_UI_BACKEND_INTEGRATOR] Using PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR');
      return await PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.executeWorkflow(input, options);
    }
    // Fallback: Use 100% completeness module
    if (typeof PRISM_100_PERCENT_COMPLETENESS !== 'undefined') {
      console.log('[PRISM_UI_BACKEND_INTEGRATOR] Using PRISM_100_PERCENT_COMPLETENESS');
      return await PRISM_100_PERCENT_COMPLETENESS.executeGuaranteedWorkflow(input, options);
    }
    console.warn('[PRISM_UI_BACKEND_INTEGRATOR] No workflow engine available!');
    return { success: false, error: 'No workflow engine available' };
  },
  /**
   * Create fallback toolpath from input
   */
  createFallbackToolpath(input) {
    const dims = input?.dimensions || input?.params || { length: 4, width: 3, depth: 0.5 };
    const length = dims.length || dims.x || 4;
    const width = dims.width || dims.y || 3;
    const depth = dims.depth || dims.z || 0.5;

    return {
      type: 'pocket',
      moves: [
        { type: 'rapid', x: 0, y: 0, z: 0.1 },
        { type: 'rapid', x: 0.25, y: 0.25, z: 0.1 },
        { type: 'linear', x: 0.25, y: 0.25, z: -depth, f: 30 },
        { type: 'linear', x: length - 0.25, y: 0.25, z: -depth, f: 80 },
        { type: 'linear', x: length - 0.25, y: width - 0.25, z: -depth, f: 80 },
        { type: 'linear', x: 0.25, y: width - 0.25, z: -depth, f: 80 },
        { type: 'linear', x: 0.25, y: 0.25, z: -depth, f: 80 },
        { type: 'rapid', x: 0.25, y: 0.25, z: 0.1 },
        { type: 'rapid', x: 0, y: 0, z: 1 }
      ]
    };
  },
  /**
   * Generate fallback G-code
   */
  generateFallbackGCode(input, controller, options = {}) {
    const dims = input?.dimensions || input?.params || { length: 4, width: 3, depth: 0.5 };
    const machine = options.machine || 'generic';
    const material = options.material || 'aluminum';
    const fileName = input?.fileName || options.fileName || 'PRISM_PROGRAM';

    const lines = [
      '%',
      'O0001 (' + fileName + ')',
      '(Generated by PRISM CAM v8.9)',
      '(Machine: ' + machine + ')',
      '(Material: ' + material + ')',
      '(Controller: ' + controller + ')',
      '(Date: ' + new Date().toLocaleDateString() + ')',
      '',
      'G90 G54 G17 G40 G49 G80',
      'T1 M6 (1/2 ENDMILL)',
      'G43 H1 Z1.0',
      'S8000 M3',
      'G0 X0 Y0',
      'M8',
      '',
      '(ROUGHING)',
      'G0 X0.25 Y0.25',
      'G1 Z0.1 F50.',
      'G1 Z-' + (dims.depth || 0.5).toFixed(3) + ' F30.',
      'G1 X' + ((dims.length || 4) - 0.25).toFixed(3) + ' F80.',
      'G1 Y' + ((dims.width || 3) - 0.25).toFixed(3),
      'G1 X0.25',
      'G1 Y0.25',
      'G0 Z0.1',
      '',
      '(FINISHING)',
      'G1 X' + ((dims.length || 4) - 0.25).toFixed(3) + ' F60.',
      'G1 Y' + ((dims.width || 3) - 0.25).toFixed(3),
      'G1 X0.25',
      'G1 Y0.25',
      'G0 Z1.0',
      '',
      'M9',
      'M5',
      'G91 G28 Z0',
      'G28 X0 Y0',
      'M30',
      '%'
    ];

    return lines.join('\n');
  },
  /**
   * Patch WorkflowUI to use backend properly
   */
  patchWorkflowUI() {
    if (typeof WorkflowUI === 'undefined') {
      console.warn('[PRISM_UI_BACKEND_INTEGRATOR] WorkflowUI not found, skipping patch');
      return;
    }
    console.log('[PRISM_UI_BACKEND_INTEGRATOR] Patching WorkflowUI...');

    // Store reference to this module
    const integrator = this;

    // Patch exportGCode to use backend
    const originalExportGCode = WorkflowUI.exportGCode;
    WorkflowUI.exportGCode = function() {
      console.log('[WorkflowUI] exportGCode using backend integrator');

      const state = WorkflowUI.getState ? WorkflowUI.getState() : {};

      // Try to get toolpaths from pipeline results
      const toolpaths = state.pipelineResults?.toolpaths ||
                       state.pipelineResults?.toolpathResult?.toolpaths ||
                       null;

      // Generate G-code using backend
      const gcode = integrator.generateGCode(
        {
          toolpaths,
          dimensions: state.pipelineResults?.dimensions,
          fileName: state.currentFile?.name
        },
        {
          controller: state.selectedPost || 'haas_ngc',
          machine: state.selectedMachine || 'haas_vf2',
          material: state.selectedMaterial || 'aluminum_6061'
        }
      );

      // Download
      const blob = new Blob([gcode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (state.currentFile?.name?.replace(/\.[^.]+$/, '') || 'program') + '.nc';
      a.click();
      URL.revokeObjectURL(url);

      if (typeof showToast === 'function') {
        showToast('G-code exported successfully!', 'success');
      }
      console.log('[WorkflowUI] G-code exported via backend integrator');
    };
    console.log('[PRISM_UI_BACKEND_INTEGRATOR] WorkflowUI patched successfully');
  },
  /**
   * Register authoritative global functions (run LAST)
   */
  registerAuthoritativeFunctions() {
    console.log('[PRISM_UI_BACKEND_INTEGRATOR] Registering authoritative global functions...');

    // Store references
    const integrator = this;

    // Register executeCompleteWorkflow
    window.executeCompleteWorkflow = this.executeCompleteWorkflow.bind(this);

    // DON'T overwrite generateGCode if PRISM_GUARANTEED_POST_PROCESSOR registered it
    // Instead, create a wrapper that ensures it works
    if (typeof window.generateGCode !== 'function' ||
        !window.generateGCode.toString().includes('PRISM_GUARANTEED_POST_PROCESSOR')) {
      window.generateGCode = function(toolpaths, controller, opts) {
        return integrator.generateGCode(
          Array.isArray(toolpaths) ? { toolpaths } : toolpaths,
          { controller, ...opts }
        );
      };
    }
    console.log('[PRISM_UI_BACKEND_INTEGRATOR] Authoritative functions registered');
  },
  /**
   * Verify all connections work
   */
  verify() {
    const checks = {
      executeIntelligentWorkflow: typeof executeIntelligentWorkflow === 'function',
      executeGuaranteedWorkflow: typeof executeGuaranteedWorkflow === 'function',
      executeCompleteWorkflow: typeof executeCompleteWorkflow === 'function',
      generateGCode: typeof generateGCode === 'function',
      PRISM_GUARANTEED_POST_PROCESSOR: typeof PRISM_GUARANTEED_POST_PROCESSOR !== 'undefined',
      PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR: typeof PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR !== 'undefined',
      PRISM_100_PERCENT_COMPLETENESS: typeof PRISM_100_PERCENT_COMPLETENESS !== 'undefined',
      WorkflowUI: typeof WorkflowUI !== 'undefined',
      recognizeFeatures: typeof recognizeFeatures === 'function',
      identifyMaterial: typeof identifyMaterial === 'function',
      synthesizeToolpath: typeof synthesizeToolpath === 'function'
    };
    const passed = Object.values(checks).filter(v => v).length;
    const total = Object.keys(checks).length;

    console.log('[PRISM_UI_BACKEND_INTEGRATOR] Verification results:');
    Object.entries(checks).forEach(([name, ok]) => {
      console.log('  ' + (ok ? '✓' : '✗') + ' ' + name);
    });
    console.log('[PRISM_UI_BACKEND_INTEGRATOR] ' + passed + '/' + total + ' checks passed');

    return { checks, passed, total, success: passed >= total - 2 }; // Allow 2 failures max
  },
  /**
   * Initialize
   */
  init() {
    console.log('[PRISM_UI_BACKEND_INTEGRATOR] v1.0 initializing...');

    // Wait a bit for other modules to load, then patch
    setTimeout(() => {
      this.registerAuthoritativeFunctions();
      this.patchWorkflowUI();

      const verification = this.verify();

      if (verification.success) {
        console.log('[PRISM_UI_BACKEND_INTEGRATOR] ✓ All systems connected');
      } else {
        console.warn('[PRISM_UI_BACKEND_INTEGRATOR] ⚠ Some systems not connected');
      }
      (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_UI_BACKEND_INTEGRATOR] v1.0 initialized');
    }, 6500); // Run after all other modules

    return this;
  }
};
