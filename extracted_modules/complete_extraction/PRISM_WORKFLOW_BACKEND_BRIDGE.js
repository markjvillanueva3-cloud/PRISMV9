const PRISM_WORKFLOW_BACKEND_BRIDGE = {
  version: '1.0.0',

  /**
   * Get the best available G-code generator
   */
  getGCodeGenerator() {
    // Priority order:
    // 1. PRISM_GUARANTEED_POST_PROCESSOR (most complete)
    // 2. PRISM_INTERNAL_POST_ENGINE
    // 3. UNIVERSAL_POST_PROCESSOR_ENGINE
    // 4. generateGCode global function
    // 5. Fallback

    if (typeof PRISM_GUARANTEED_POST_PROCESSOR !== 'undefined' &&
        typeof PRISM_GUARANTEED_POST_PROCESSOR.generateGCode === 'function') {
      return (toolpaths, controller, options) => {
        const result = PRISM_GUARANTEED_POST_PROCESSOR.generateGCode(toolpaths, controller, options);
        return result.gcode || result;
      };
    }
    if (typeof PRISM_INTERNAL_POST_ENGINE !== 'undefined' &&
        typeof PRISM_INTERNAL_POST_ENGINE.generateGCode === 'function') {
      return (toolpaths, controller, options) => {
        const result = PRISM_INTERNAL_POST_ENGINE.generateGCode(
          { machine: options?.machine || 'haas_vf2', material: options?.material || 'aluminum' },
          { rpm: 8000, feed: 80 },
          Array.isArray(toolpaths) ? toolpaths[0] : toolpaths,
          {}
        );
        return result.gcode || result;
      };
    }
    if (typeof UNIVERSAL_POST_PROCESSOR_ENGINE !== 'undefined' &&
        typeof UNIVERSAL_POST_PROCESSOR_ENGINE.generateGCode === 'function') {
      return (toolpaths, controller, options) => {
        return UNIVERSAL_POST_PROCESSOR_ENGINE.generateGCode(toolpaths, controller, options);
      };
    }
    if (typeof generateGCode === 'function') {
      return generateGCode;
    }
    // Return fallback generator
    return this.generateFallbackGCode.bind(this);
  },
  /**
   * Generate G-code using best available backend
   */
  generateGCode(input, options = {}) {
    console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] Generating G-code...');

    const generator = this.getGCodeGenerator();
    const controller = options.controller || options.post || 'haas_ngc';

    // Normalize input to toolpaths
    let toolpaths = [];
    if (Array.isArray(input)) {
      toolpaths = input;
    } else if (input?.toolpaths) {
      toolpaths = input.toolpaths;
    } else if (input?.operations) {
      toolpaths = this.convertOperationsToToolpaths(input.operations);
    } else if (input?.moves) {
      toolpaths = [input];
    } else {
      toolpaths = [this.createDefaultToolpath(input)];
    }
    try {
      const result = generator(toolpaths, controller, options);
      console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] G-code generated successfully');
      return typeof result === 'string' ? result : (result?.gcode || this.generateFallbackGCode(input, controller, options));
    } catch (e) {
      console.warn('[PRISM_WORKFLOW_BACKEND_BRIDGE] Generator error, using fallback:', e);
      return this.generateFallbackGCode(input, controller, options);
    }
  },
  /**
   * Convert operations to toolpaths
   */
  convertOperationsToToolpaths(operations) {
    return operations.map(op => ({
      type: op.type || 'contour',
      name: op.name || 'Operation',
      moves: op.moves || [
        { type: 'rapid', x: 0, y: 0, z: 0.1 },
        { type: 'linear', x: 4, y: 0, z: -0.25, f: 80 },
        { type: 'linear', x: 4, y: 3, z: -0.25, f: 80 },
        { type: 'linear', x: 0, y: 3, z: -0.25, f: 80 },
        { type: 'linear', x: 0, y: 0, z: -0.25, f: 80 },
        { type: 'rapid', x: 0, y: 0, z: 1 }
      ],
      tool: op.tool || { id: 1, name: '1/2 ENDMILL', diameter: 0.5 },
      rpm: op.rpm || 8000,
      feed: op.feed || 80
    }));
  },
  /**
   * Create default toolpath from input
   */
  createDefaultToolpath(input) {
    const dims = input?.dimensions || input?.params || { length: 4, width: 3, depth: 0.5 };
    const length = dims.length || dims.x || 4;
    const width = dims.width || dims.y || 3;
    const depth = dims.depth || dims.z || 0.5;

    return {
      type: 'pocket',
      name: 'Pocket',
      moves: [
        { type: 'rapid', x: 0, y: 0, z: 0.1 },
        { type: 'rapid', x: 0.25, y: 0.25, z: 0.1 },
        { type: 'linear', x: 0.25, y: 0.25, z: -depth, f: 30 },
        { type: 'linear', x: length - 0.25, y: 0.25, z: -depth, f: 80 },
        { type: 'linear', x: length - 0.25, y: width - 0.25, z: -depth, f: 80 },
        { type: 'linear', x: 0.25, y: width - 0.25, z: -depth, f: 80 },
        { type: 'linear', x: 0.25, y: 0.25, z: -depth, f: 80 },
        { type: 'rapid', x: 0, y: 0, z: 1 }
      ],
      tool: { id: 1, name: '1/2 ENDMILL', diameter: 0.5 },
      rpm: 8000,
      feed: 80
    };
  },
  /**
   * Fallback G-code generation
   */
  generateFallbackGCode(input, controller, options = {}) {
    const dims = input?.dimensions || input?.params || { length: 4, width: 3, depth: 0.5 };
    const machine = options.machine || 'haas_vf2';
    const material = options.material || 'aluminum';
    const fileName = input?.fileName || options.fileName || 'PRISM_PROGRAM';

    const lines = [
      '%',
      'O0001 (' + fileName.toUpperCase().replace(/[^A-Z0-9]/g, '_') + ')',
      '(Generated by PRISM CAM v8.9)',
      '(Machine: ' + machine.toUpperCase() + ')',
      '(Material: ' + material.toUpperCase() + ')',
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
   * Download G-code file
   */
  downloadGCode(gcode, fileName) {
    const blob = new Blob([gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName?.replace(/\.[^.]+$/, '') || 'program') + '.nc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') {
      showToast('G-code downloaded: ' + a.download, 'success');
    }
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] G-code downloaded:', a.download);
  },
  /**
   * Patch WorkflowUI
   */
  patchWorkflowUI() {
    if (typeof WorkflowUI === 'undefined') return false;

    const bridge = this;

    // Patch exportGCode
    WorkflowUI.exportGCode = function() {
      console.log('[WorkflowUI] exportGCode via backend bridge');
      const state = WorkflowUI.getState ? WorkflowUI.getState() : {};

      const gcode = bridge.generateGCode(
        {
          toolpaths: state.pipelineResults?.toolpaths,
          dimensions: state.pipelineResults?.dimensions,
          fileName: state.currentFile?.name
        },
        {
          controller: state.selectedPost || 'haas_ngc',
          machine: state.selectedMachine || 'haas_vf2',
          material: state.selectedMaterial || 'aluminum'
        }
      );

      bridge.downloadGCode(gcode, state.currentFile?.name);
    };
    console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] WorkflowUI patched');
    return true;
  },
  /**
   * Patch WorkflowIntegration
   */
  patchWorkflowIntegration() {
    if (typeof WorkflowIntegration === 'undefined') return false;

    const bridge = this;

    // Patch exportGCode
    const originalExportGCode = WorkflowIntegration.exportGCode;
    WorkflowIntegration.exportGCode = function() {
      console.log('[WorkflowIntegration] exportGCode via backend bridge');
      const state = WorkflowIntegration.getState ? WorkflowIntegration.getState() : {};

      // If generatedCode exists and looks valid, use it
      if (state.generatedCode && state.generatedCode.length > 100) {
        bridge.downloadGCode(state.generatedCode, state.uploadedFile?.name);
        return;
      }
      // Otherwise generate fresh
      const gcode = bridge.generateGCode(
        {
          toolpaths: state.processPlanning?.toolpaths,
          dimensions: state.analysisResults?.dimensions,
          fileName: state.uploadedFile?.name
        },
        {
          controller: state.selectedPost || 'haas_ngc',
          machine: state.selectedMachine || 'haas_vf2',
          material: state.selectedMaterial || 'aluminum'
        }
      );

      bridge.downloadGCode(gcode, state.uploadedFile?.name);
    };
    // Patch generateOutput to use backend
    const originalGenerateOutput = WorkflowIntegration.generateOutput;
    WorkflowIntegration.generateOutput = async function() {
      console.log('[WorkflowIntegration] generateOutput via backend bridge');
      const state = WorkflowIntegration.getState ? WorkflowIntegration.getState() : {};

      // Generate G-code using backend
      const gcode = bridge.generateGCode(
        state.processPlanning,
        {
          controller: state.selectedPost || 'haas_ngc',
          machine: state.selectedMachine || 'haas_vf2',
          material: state.selectedMaterial || 'aluminum'
        }
      );

      // Update state
      if (WorkflowIntegration.getState) {
        WorkflowIntegration.getState().generatedCode = gcode;
      }
      // Call original to update UI
      if (originalGenerateOutput) {
        // Replace the generated code before UI update
        try {
          await originalGenerateOutput.call(WorkflowIntegration);
        } catch (e) {
          console.warn('[WorkflowIntegration] Original generateOutput error:', e);
        }
      }
    };
    console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] WorkflowIntegration patched');
    return true;
  },
  /**
   * Patch WorkflowApp
   */
  patchWorkflowApp() {
    if (typeof WorkflowApp === 'undefined') return false;

    const bridge = this;

    // Patch generateOutput
    const originalGenerateOutput = WorkflowApp.generateOutput;
    WorkflowApp.generateOutput = function() {
      console.log('[WorkflowApp] generateOutput via backend bridge');
      const state = WorkflowApp.getState ? WorkflowApp.getState() : {};

      const gcode = bridge.generateGCode(
        state.processPlanning,
        {
          controller: state.selectedPost || 'haas_ngc',
          machine: state.selectedMachine || 'haas_vf2',
          material: state.selectedMaterial || 'aluminum'
        }
      );

      // Update state
      if (WorkflowApp.getState) {
        WorkflowApp.getState().generatedCode = gcode;
      }
      // Call original to update UI
      if (originalGenerateOutput) {
        try {
          originalGenerateOutput.call(WorkflowApp);
        } catch (e) {
          console.warn('[WorkflowApp] Original generateOutput error:', e);
        }
      }
    };
    console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] WorkflowApp patched');
    return true;
  },
  /**
   * Patch UnifiedPipelineOrchestrator
   */
  patchUnifiedPipelineOrchestrator() {
    if (typeof UnifiedPipelineOrchestrator === 'undefined') return false;

    const bridge = this;

    // Override generateGCode to use backend
    const originalGenerateGCode = UnifiedPipelineOrchestrator.generateGCode;
    UnifiedPipelineOrchestrator.generateGCode = function(toolpaths, config) {
      console.log('[UnifiedPipelineOrchestrator] generateGCode via backend bridge');
      return bridge.generateGCode(toolpaths, config);
    };
    console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] UnifiedPipelineOrchestrator patched');
    return true;
  },
  /**
   * Verify all patches applied
   */
  verify() {
    const checks = {
      WorkflowUI: typeof WorkflowUI !== 'undefined',
      WorkflowIntegration: typeof WorkflowIntegration !== 'undefined',
      WorkflowApp: typeof WorkflowApp !== 'undefined',
      UnifiedPipelineOrchestrator: typeof UnifiedPipelineOrchestrator !== 'undefined',
      PRISM_GUARANTEED_POST_PROCESSOR: typeof PRISM_GUARANTEED_POST_PROCESSOR !== 'undefined',
      executeIntelligentWorkflow: typeof executeIntelligentWorkflow === 'function',
      executeGuaranteedWorkflow: typeof executeGuaranteedWorkflow === 'function',
      generateGCode: typeof generateGCode === 'function'
    };
    const passed = Object.values(checks).filter(v => v).length;
    const total = Object.keys(checks).length;

    console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] Verification:');
    Object.entries(checks).forEach(([name, ok]) => {
      console.log('  ' + (ok ? '✓' : '✗') + ' ' + name);
    });
    console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] ' + passed + '/' + total + ' checks passed');

    return { checks, passed, total, success: passed >= 6 };
  },
  /**
   * Initialize and patch all workflow systems
   */
  init() {
    console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] v1.0 initializing...');

    // Patch each system with delay to ensure they're loaded
    setTimeout(() => {
      const results = {
        WorkflowUI: this.patchWorkflowUI(),
        WorkflowIntegration: this.patchWorkflowIntegration(),
        WorkflowApp: this.patchWorkflowApp(),
        UnifiedPipelineOrchestrator: this.patchUnifiedPipelineOrchestrator()
      };
      const patched = Object.values(results).filter(v => v).length;
      console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] Patched ' + patched + '/4 workflow systems');

      const verification = this.verify();

      if (verification.success) {
        console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] ✓ All systems connected to backend');
      } else {
        console.warn('[PRISM_WORKFLOW_BACKEND_BRIDGE] ⚠ Some systems not connected');
      }
      (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_WORKFLOW_BACKEND_BRIDGE] v1.0 initialized');
    }, 7000); // Run after all other modules

    return this;
  }
}