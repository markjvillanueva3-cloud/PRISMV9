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
};
// Initialize after everything else
// setTimeout(() => PRISM_WORKFLOW_BACKEND_BRIDGE.init(), 6500); // DISABLED

// Make available globally
window.PRISM_WORKFLOW_BACKEND_BRIDGE = PRISM_WORKFLOW_BACKEND_BRIDGE;

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Workflow Backend Bridge loaded');

// PRISM_WORKFLOW_ACCESS_HANDLER v1.0
// Ensures users can access the workflow from the main interface

const PRISM_WORKFLOW_ACCESS_HANDLER = {
  version: '1.0',

  init() {
    console.log('[PRISM_WORKFLOW_ACCESS_HANDLER] Initializing...');

    // Patch switchToMode to handle workflow
    const originalSwitchToMode = window.switchToMode;
    window.switchToMode = function(mode) {
      console.log('[switchToMode] Mode requested:', mode);

      if (mode === 'workflow') {
        // Show workflow UI
        if (typeof WorkflowUI !== 'undefined' && WorkflowUI.show) {
          WorkflowUI.show();
          console.log('[switchToMode] WorkflowUI.show() called');
        } else if (typeof WorkflowApp !== 'undefined' && WorkflowApp.show) {
          WorkflowApp.show();
          console.log('[switchToMode] WorkflowApp.show() called');
        } else if (typeof WorkflowIntegration !== 'undefined' && WorkflowIntegration.show) {
          WorkflowIntegration.show();
          console.log('[switchToMode] WorkflowIntegration.show() called');
        } else {
          console.warn('[switchToMode] No workflow UI available');
          if (typeof showToast === 'function') {
            showToast('Workflow loading...', 'info');
          }
        }
        // Update button states
        document.querySelectorAll('.machine-mode-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        const workflowBtn = document.getElementById('workflowModeBtn');
        if (workflowBtn) workflowBtn.classList.add('active');

        return;
      }
      // For other modes, call original and hide workflow
      if (typeof WorkflowUI !== 'undefined' && WorkflowUI.hide) {
        WorkflowUI.hide();
      }
      if (typeof WorkflowApp !== 'undefined' && WorkflowApp.hide) {
        WorkflowApp.hide();
      }
      if (originalSwitchToMode) {
        originalSwitchToMode(mode);
      }
    };
    // Also patch setMachineMode to hide workflow when switching to calculator modes
    const originalSetMachineMode = window.setMachineMode;
    window.setMachineMode = function(mode) {
      // Hide any open workflow
      if (typeof WorkflowUI !== 'undefined' && WorkflowUI.hide) {
        WorkflowUI.hide();
      }
      if (typeof WorkflowApp !== 'undefined' && WorkflowApp.hide) {
        WorkflowApp.hide();
      }
      // Call original
      if (originalSetMachineMode) {
        originalSetMachineMode(mode);
      }
    };
    console.log('[PRISM_WORKFLOW_ACCESS_HANDLER] Initialized');
  }
};
// AUTO-INIT DISABLED
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', () => PRISM_WORKFLOW_ACCESS_HANDLER.init());
// } else {
//   setTimeout(() => PRISM_WORKFLOW_ACCESS_HANDLER.init(), 100);
// }
console.log('[PRISM_WORKFLOW_ACCESS_HANDLER] Auto-init disabled');
window.PRISM_WORKFLOW_ACCESS_HANDLER = PRISM_WORKFLOW_ACCESS_HANDLER;

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Workflow Access Handler loaded');

// PRISM_TOAST_SYSTEM v1.0
// Global toast notification system

const PRISM_TOAST_SYSTEM = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 10px;';
      document.body.appendChild(this.container);
    }
    // Create global showToast function
    window.showToast = this.show.bind(this);
    console.log('[PRISM_TOAST_SYSTEM] Initialized');
  },
  show(message, type = 'info') {
    if (!this.container) this.init();

    const colors = {
      success: { bg: 'rgba(34, 197, 94, 0.95)', border: '#22c55e', icon: '✓' },
      error: { bg: 'rgba(239, 68, 68, 0.95)', border: '#ef4444', icon: '✗' },
      warning: { bg: 'rgba(245, 158, 11, 0.95)', border: '#f59e0b', icon: '⚠' },
      info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6', icon: 'ℹ' }
    };
    const color = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.className = 'prism-toast';
    toast.innerHTML = `<span style="margin-right: 8px;">${color.icon}</span>${message}`;
    toast.style.cssText = `
      padding: 12px 20px;
      background: ${color.bg};
      border: 1px solid ${color.border};
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
      display: flex;
      align-items: center;
    `;

    this.container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);

    return toast;
  }
};
// CSS animations for toast
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(toastStyles);

// Initialize
PRISM_TOAST_SYSTEM.init();

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Toast System loaded');

// PRISM_FILE_VALIDATION v1.0
// Validates uploaded files and provides user feedback

const PRISM_FILE_VALIDATION = {
  supportedTypes: {
    cad: ['.step', '.stp', '.iges', '.igs', '.stl', '.sldprt', '.x_t', '.sat', '.3dm'],
    drawing: ['.pdf', '.dxf', '.dwg'],
    image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'],
    gcode: ['.nc', '.ngc', '.gcode', '.tap', '.mpf']
  },
  getSupportedExtensions() {
    return Object.values(this.supportedTypes).flat();
  },
  isSupported(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return this.getSupportedExtensions().includes(ext);
  },
  getFileType(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    for (const [type, exts] of Object.entries(this.supportedTypes)) {
      if (exts.includes(ext)) return type;
    }
    return 'unknown';
  },
  validate(file) {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }
    if (!this.isSupported(file.name)) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      return {
        valid: false,
        error: `File type "${ext}" is not supported. Supported types: ${this.getSupportedExtensions().join(', ')}`
      };
    }
    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return { valid: false, error: 'File size exceeds 100MB limit' };
    }
    return { valid: true, type: this.getFileType(file.name) };
  },
  init() {
    // Wrap existing file handlers with validation
    const originalHandlers = ['handleFileUpload', 'handleFileSelect', 'handleFileLoad'];

    originalHandlers.forEach(handlerName => {
      if (typeof window[handlerName] === 'function') {
        const original = window[handlerName];
        window[handlerName] = (event) => {
          const file = event?.target?.files?.[0] || event;
          if (file && file.name) {
            const validation = this.validate(file);
            if (!validation.valid) {
              if (typeof showToast === 'function') {
                showToast(validation.error, 'error');
              }
              console.error('[PRISM_FILE_VALIDATION]', validation.error);
              return;
            }
          }
          original(event);
        };
      }
    });

    console.log('[PRISM_FILE_VALIDATION] Initialized');
  }
};
// Initialize after DOM ready
setTimeout(() => PRISM_FILE_VALIDATION.init(), 1000);

window.PRISM_FILE_VALIDATION = PRISM_FILE_VALIDATION;

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] File Validation loaded');

    return this;
  }
};
// Initialize
window.PRISM_TOOL_EXPANSION = PRISM_CUTTING_TOOL_EXPANSION_V3;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    /* DUP REMOVED: PRISM_CUTTING_TOOL_EXPANSION_V3 */
  });
} else {
  setTimeout(() => PRISM_CUTTING_TOOL_EXPANSION_V3.init(), 800);
}
// Early variable declarations to prevent reference errors
var machineMode = 'mill';
var LATHE_MACHINE_DATABASE = null;
var CHUCK_DATABASE = null;
var TIERS = null;
var currentTier = 'tier1';
// Tier dropdown is now controlled by checking currentTier directly
var EXP_LEVEL_TOOLTIPS = null;
var showLatheMillingOps = false;
var FEATURE_TIER_MAP = null;

var currentExperienceLevel = 'beginner';
var currentGuidanceStep = 1;
var totalGuidanceSteps = 6;
var guidanceSteps = null;
var EXPERIENCE_MODE_CONFIG = null;
var masterModeToggles = { tooltips: false, warnings: false, guided: false, tips: false };
var holderUnitSystem = 'inch';
var FeatureFlags = null;
var DevTools = null;
var HOLDER_DATABASE = window.HOLDER_DATABASE || null;
var MACHINE_DATABASE = window.MACHINE_DATABASE || null;
var EDM_MACHINE_DATABASE = window.EDM_MACHINE_DATABASE || null;
var POST_PROCESSOR_DATABASE = window.POST_PROCESSOR_DATABASE || null;
var DRILL_DATABASE = null;
var INDEXABLE_BODY_DATABASE = null;
var INSERT_DATABASE = null;
var selectedBody = null;
var selectedInsert = null;
var currentIndexableCategory = 'indexable_mill';
var CAM_SOFTWARE_DATABASE = null;
var MATERIAL_DATABASE = null;
var CAM_TOOLPATH_DATABASE = null;
var LATHE_TOOLPATH_DATABASE = null;
var GCODE_DATABASE = null;
var MCODE_DATABASE = null;
var COOLANT_DATABASE = null;

// PRISM STARTER TIER DATABASE v1.0
// Generic/Budget options for all modules - useful but entices upgrades
// PRISM SUBSCRIPTION TIER SYSTEM v2.0
// 4-Tier paid subscription model with module-based add-ons
// No free tier - all tiers are paid subscriptions
// Post processors sold separately per machine/controller

    // INDEXABLE TOOL BODY DATABASE
INDEXABLE_BODY_DATABASE = {
        // INDEXABLE MILLING - FACE MILLS
        indexable_mill: [
            // Sandvik Coromant Face Mills
            { id: 'sandvik_r245_2', name: '2" CoroMill 245 Face Mill', manufacturer: 'Sandvik Coromant', series: 'CoroMill 245', partNumber: 'R245-050Q22-12M', diameter: 2.0, pockets: 5, insertType: 'R245-12', maxDoc: 0.236, arbor: 'Weldon 0.75"', geometry: { volume: 45000, surfaceArea: 8500 } },
            { id: 'sandvik_r245_3', name: '3" CoroMill 245 Face Mill', manufacturer: 'Sandvik Coromant', series: 'CoroMill 245', partNumber: 'R245-076Q27-12M', diameter: 3.0, pockets: 7, insertType: 'R245-12', maxDoc: 0.236, arbor: 'Weldon 1.0"', geometry: { volume: 82000, surfaceArea: 14200 } },
            { id: 'sandvik_r245_4', name: '4" CoroMill 245 Face Mill', manufacturer: 'Sandvik Coromant', series: 'CoroMill 245', partNumber: 'R245-100Q32-12M', diameter: 4.0, pockets: 10, insertType: 'R245-12', maxDoc: 0.236, arbor: 'Weldon 1.25"', geometry: { volume: 125000, surfaceArea: 21500 } },
            { id: 'sandvik_r390_2', name: '2" CoroMill 390 Shoulder Mill', manufacturer: 'Sandvik Coromant', series: 'CoroMill 390', partNumber: 'R390-050Q22-11M', diameter: 2.0, pockets: 4, insertType: 'R390-11', maxDoc: 0.433, arbor: 'Weldon 0.75"', geometry: { volume: 38000, surfaceArea: 7200 } },
            { id: 'sandvik_r390_3', name: '3" CoroMill 390 Shoulder Mill', manufacturer: 'Sandvik Coromant', series: 'CoroMill 390', partNumber: 'R390-076Q27-17M', diameter: 3.0, pockets: 6, insertType: 'R390-17', maxDoc: 0.669, arbor: 'Weldon 1.0"', geometry: { volume: 72000, surfaceArea: 12800 } },

            // Kennametal Face Mills
            { id: 'kennametal_kssm_2', name: '2" KSSM45 Face Mill', manufacturer: 'Kennametal', series: 'KSSM45', partNumber: 'KSSM45R2050', diameter: 2.0, pockets: 5, insertType: 'SDMT1204', maxDoc: 0.157, arbor: 'Weldon 0.75"', geometry: { volume: 42000, surfaceArea: 8000 } },
            { id: 'kennametal_kssm_3', name: '3" KSSM45 Face Mill', manufacturer: 'Kennametal', series: 'KSSM45', partNumber: 'KSSM45R3075', diameter: 3.0, pockets: 7, insertType: 'SDMT1204', maxDoc: 0.157, arbor: 'Weldon 1.0"', geometry: { volume: 78000, surfaceArea: 13500 } },
            { id: 'kennametal_kssm_4', name: '4" KSSM45 Face Mill', manufacturer: 'Kennametal', series: 'KSSM45', partNumber: 'KSSM45R4100', diameter: 4.0, pockets: 10, insertType: 'SDMT1204', maxDoc: 0.157, arbor: 'Weldon 1.25"', geometry: { volume: 120000, surfaceArea: 20500 } },
            { id: 'kennametal_mill1_2', name: '2" Mill 1-14 Shoulder Mill', manufacturer: 'Kennametal', series: 'Mill 1-14', partNumber: 'M1R2050C', diameter: 2.0, pockets: 4, insertType: 'EDPT140408', maxDoc: 0.551, arbor: 'Weldon 0.75"', geometry: { volume: 40000, surfaceArea: 7500 } },

            // ISCAR Face Mills
            { id: 'iscar_heli_2', name: '2" HeliMill Face Mill', manufacturer: 'ISCAR', series: 'HeliMill', partNumber: 'HM90 FAP-D2.0-5-W.75', diameter: 2.0, pockets: 5, insertType: 'HM90 APKT 1003', maxDoc: 0.394, arbor: 'Weldon 0.75"', geometry: { volume: 44000, surfaceArea: 8300 } },
            { id: 'iscar_heli_3', name: '3" HeliMill Face Mill', manufacturer: 'ISCAR', series: 'HeliMill', partNumber: 'HM90 FAP-D3.0-7-W1.0', diameter: 3.0, pockets: 7, insertType: 'HM90 APKT 1003', maxDoc: 0.394, arbor: 'Weldon 1.0"', geometry: { volume: 80000, surfaceArea: 14000 } },
            { id: 'iscar_tang_2', name: '2" TangMill Face Mill', manufacturer: 'ISCAR', series: 'TangMill', partNumber: 'T490 FLN-D2.0-5-W.75', diameter: 2.0, pockets: 5, insertType: 'T490 LNMT 1306', maxDoc: 0.512, arbor: 'Weldon 0.75"', geometry: { volume: 46000, surfaceArea: 8600 } },

            // Seco Face Mills
            { id: 'seco_r220_2', name: '2" R220.69 Square Shoulder', manufacturer: 'Seco Tools', series: 'R220.69', partNumber: 'R220.69-0050-09-5A', diameter: 2.0, pockets: 5, insertType: 'XOMX 090308', maxDoc: 0.315, arbor: 'Weldon 0.75"', geometry: { volume: 41000, surfaceArea: 7800 } },
            { id: 'seco_r220_3', name: '3" R220.69 Square Shoulder', manufacturer: 'Seco Tools', series: 'R220.69', partNumber: 'R220.69-0076-12-7A', diameter: 3.0, pockets: 7, insertType: 'XOMX 120408', maxDoc: 0.472, arbor: 'Weldon 1.0"', geometry: { volume: 76000, surfaceArea: 13200 } },

            // Walter Face Mills
            { id: 'walter_f2010_2', name: '2" F2010 Face Mill', manufacturer: 'Walter', series: 'F2010', partNumber: 'F2010.B.050.Z05.10', diameter: 2.0, pockets: 5, insertType: 'ADMT 10T308R', maxDoc: 0.315, arbor: 'Weldon 0.75"', geometry: { volume: 43000, surfaceArea: 8100 } },
            { id: 'walter_f2010_3', name: '3" F2010 Face Mill', manufacturer: 'Walter', series: 'F2010', partNumber: 'F2010.B.076.Z07.12', diameter: 3.0, pockets: 7, insertType: 'ADMT 120408R', maxDoc: 0.472, arbor: 'Weldon 1.0"', geometry: { volume: 79000, surfaceArea: 13700 } },

            // High Feed Mills
            { id: 'iscar_ff_15', name: '1.5" FF High Feed Mill', manufacturer: 'ISCAR', series: 'FeedMill', partNumber: 'FF FWX D038-4-W.75', diameter: 1.5, pockets: 4, insertType: 'XNMU 0604', maxDoc: 0.039, arbor: 'Weldon 0.75"', geometry: { volume: 28000, surfaceArea: 5500 } },
            { id: 'iscar_ff_2', name: '2" FF High Feed Mill', manufacturer: 'ISCAR', series: 'FeedMill', partNumber: 'FF FWX D050-5-W.75', diameter: 2.0, pockets: 5, insertType: 'XNMU 0806', maxDoc: 0.047, arbor: 'Weldon 0.75"', geometry: { volume: 38000, surfaceArea: 7200 } },
            { id: 'kennametal_dodeka_2', name: '2" DODEKA High Feed', manufacturer: 'Kennametal', series: 'DODEKA', partNumber: 'DODEKA2050', diameter: 2.0, pockets: 5, insertType: 'LNGU 0634', maxDoc: 0.055, arbor: 'Weldon 0.75"', geometry: { volume: 39000, surfaceArea: 7400 } },
        ],

        // INDEXABLE DRILLS (U-DRILLS)
        indexable_drill: [
            // Sandvik CoroDrill
            { id: 'sandvik_880_075', name: '0.75" CoroDrill 880', manufacturer: 'Sandvik Coromant', series: 'CoroDrill 880', partNumber: '880-D0750L25-02', diameter: 0.75, flutes: 2, insertType: '880-0503', maxDepth: 2.5, shank: 'Weldon 0.75"', geometry: { volume: 18000, surfaceArea: 4200 } },
            { id: 'sandvik_880_1', name: '1.0" CoroDrill 880', manufacturer: 'Sandvik Coromant', series: 'CoroDrill 880', partNumber: '880-D1000L25-03', diameter: 1.0, flutes: 2, insertType: '880-0604', maxDepth: 3.0, shank: 'Weldon 1.0"', geometry: { volume: 28000, surfaceArea: 5800 } },
            { id: 'sandvik_880_125', name: '1.25" CoroDrill 880', manufacturer: 'Sandvik Coromant', series: 'CoroDrill 880', partNumber: '880-D1250L32-04', diameter: 1.25, flutes: 2, insertType: '880-0705', maxDepth: 3.5, shank: 'Weldon 1.25"', geometry: { volume: 38000, surfaceArea: 7400 } },
            { id: 'sandvik_880_15', name: '1.5" CoroDrill 880', manufacturer: 'Sandvik Coromant', series: 'CoroDrill 880', partNumber: '880-D1500L40-05', diameter: 1.5, flutes: 2, insertType: '880-0806', maxDepth: 4.0, shank: 'Weldon 1.25"', geometry: { volume: 52000, surfaceArea: 9200 } },

            // Kennametal KSEM Plus
            { id: 'kennametal_ksem_075', name: '0.75" KSEM Plus', manufacturer: 'Kennametal', series: 'KSEM Plus', partNumber: 'KSEM075R5WD20', diameter: 0.75, flutes: 2, insertType: 'KSEM 0750', maxDepth: 2.0, shank: 'Weldon 0.75"', geometry: { volume: 16000, surfaceArea: 3800 } },
            { id: 'kennametal_ksem_1', name: '1.0" KSEM Plus', manufacturer: 'Kennametal', series: 'KSEM Plus', partNumber: 'KSEM100R5WD25', diameter: 1.0, flutes: 2, insertType: 'KSEM 1000', maxDepth: 2.5, shank: 'Weldon 1.0"', geometry: { volume: 26000, surfaceArea: 5400 } },
            { id: 'kennametal_ksem_125', name: '1.25" KSEM Plus', manufacturer: 'Kennametal', series: 'KSEM Plus', partNumber: 'KSEM125R5WD32', diameter: 1.25, flutes: 2, insertType: 'KSEM 1250', maxDepth: 3.2, shank: 'Weldon 1.25"', geometry: { volume: 36000, surfaceArea: 7000 } },

            // ISCAR SUMOCHAM
            { id: 'iscar_sumo_075', name: '0.75" SUMOCHAM', manufacturer: 'ISCAR', series: 'SUMOCHAM', partNumber: 'DCN 075-023-12A-3D', diameter: 0.75, flutes: 2, insertType: 'ICP 075', maxDepth: 2.25, shank: 'Weldon 0.75"', geometry: { volume: 17000, surfaceArea: 4000 } },
            { id: 'iscar_sumo_1', name: '1.0" SUMOCHAM', manufacturer: 'ISCAR', series: 'SUMOCHAM', partNumber: 'DCN 100-030-16A-3D', diameter: 1.0, flutes: 2, insertType: 'ICP 100', maxDepth: 3.0, shank: 'Weldon 1.0"', geometry: { volume: 27000, surfaceArea: 5600 } },
            { id: 'iscar_sumo_125', name: '1.25" SUMOCHAM', manufacturer: 'ISCAR', series: 'SUMOCHAM', partNumber: 'DCN 125-038-16A-3D', diameter: 1.25, flutes: 2, insertType: 'ICP 125', maxDepth: 3.75, shank: 'Weldon 1.25"', geometry: { volume: 37000, surfaceArea: 7200 } },

            // Seco Perfomax
            { id: 'seco_perfo_075', name: '0.75" Perfomax', manufacturer: 'Seco Tools', series: 'Perfomax', partNumber: 'SD103-19.05-51-20R5', diameter: 0.75, flutes: 2, insertType: 'SPGX 0602', maxDepth: 2.0, shank: 'Weldon 0.75"', geometry: { volume: 15500, surfaceArea: 3700 } },
            { id: 'seco_perfo_1', name: '1.0" Perfomax', manufacturer: 'Seco Tools', series: 'Perfomax', partNumber: 'SD103-25.40-66-25R5', diameter: 1.0, flutes: 2, insertType: 'SPGX 0903', maxDepth: 2.6, shank: 'Weldon 1.0"', geometry: { volume: 25000, surfaceArea: 5200 } },

            // Walter B3214
            { id: 'walter_b3214_075', name: '0.75" B3214 U-Drill', manufacturer: 'Walter', series: 'B3214', partNumber: 'B3214.UF.019.Z02.051R', diameter: 0.75, flutes: 2, insertType: 'P28469-1', maxDepth: 2.0, shank: 'Weldon 0.75"', geometry: { volume: 16500, surfaceArea: 3900 } },
            { id: 'walter_b3214_1', name: '1.0" B3214 U-Drill', manufacturer: 'Walter', series: 'B3214', partNumber: 'B3214.UF.025.Z02.076R', diameter: 1.0, flutes: 2, insertType: 'P28469-2', maxDepth: 3.0, shank: 'Weldon 1.0"', geometry: { volume: 27500, surfaceArea: 5700 } },
        ],

        // TWIST DRILLS (SOLID)
        twist_drill: [
            // Carbide Jobber Drills - Sandvik
            { id: 'sandvik_460_25', name: '1/4" CoroDrill 460', manufacturer: 'Sandvik Coromant', series: 'CoroDrill 460', partNumber: '460.1-0635-019A1-XM', diameter: 0.25, flutes: 2, material: 'carbide', coating: 'TiAlN', maxDepth: 2.5, shank: 0.25, geometry: { volume: 1200, surfaceArea: 850 } },
            { id: 'sandvik_460_375', name: '3/8" CoroDrill 460', manufacturer: 'Sandvik Coromant', series: 'CoroDrill 460', partNumber: '460.1-0952-029A1-XM', diameter: 0.375, flutes: 2, material: 'carbide', coating: 'TiAlN', maxDepth: 3.75, shank: 0.375, geometry: { volume: 2800, surfaceArea: 1450 } },
            { id: 'sandvik_460_5', name: '1/2" CoroDrill 460', manufacturer: 'Sandvik Coromant', series: 'CoroDrill 460', partNumber: '460.1-1270-038A1-XM', diameter: 0.5, flutes: 2, material: 'carbide', coating: 'TiAlN', maxDepth: 5.0, shank: 0.5, geometry: { volume: 5200, surfaceArea: 2200 } },

            // Kennametal B205
            { id: 'kennametal_b205_25', name: '1/4" B205 Carbide Drill', manufacturer: 'Kennametal', series: 'B205', partNumber: 'B205A06350HP', diameter: 0.25, flutes: 2, material: 'carbide', coating: 'TiAlN', maxDepth: 2.5, shank: 0.25, geometry: { volume: 1150, surfaceArea: 820 } },
            { id: 'kennametal_b205_375', name: '3/8" B205 Carbide Drill', manufacturer: 'Kennametal', series: 'B205', partNumber: 'B205A09525HP', diameter: 0.375, flutes: 2, material: 'carbide', coating: 'TiAlN', maxDepth: 3.75, shank: 0.375, geometry: { volume: 2700, surfaceArea: 1400 } },
            { id: 'kennametal_b205_5', name: '1/2" B205 Carbide Drill', manufacturer: 'Kennametal', series: 'B205', partNumber: 'B205A12700HP', diameter: 0.5, flutes: 2, material: 'carbide', coating: 'TiAlN', maxDepth: 5.0, shank: 0.5, geometry: { volume: 5000, surfaceArea: 2100 } },

            // OSG ADO
            { id: 'osg_ado_25', name: '1/4" ADO Carbide Drill', manufacturer: 'OSG', series: 'ADO', partNumber: 'ADO-3D-6.35', diameter: 0.25, flutes: 2, material: 'carbide', coating: 'WXL', maxDepth: 1.9, shank: 0.25, geometry: { volume: 1100, surfaceArea: 800 } },
            { id: 'osg_ado_375', name: '3/8" ADO Carbide Drill', manufacturer: 'OSG', series: 'ADO', partNumber: 'ADO-3D-9.52', diameter: 0.375, flutes: 2, material: 'carbide', coating: 'WXL', maxDepth: 2.85, shank: 0.375, geometry: { volume: 2600, surfaceArea: 1350 } },
            { id: 'osg_ado_5', name: '1/2" ADO Carbide Drill', manufacturer: 'OSG', series: 'ADO', partNumber: 'ADO-3D-12.7', diameter: 0.5, flutes: 2, material: 'carbide', coating: 'WXL', maxDepth: 3.8, shank: 0.5, geometry: { volume: 4800, surfaceArea: 2000 } },

            // HSS-Co Drills
            { id: 'chicago_hssco_25', name: '1/4" HSS-Co Jobber', manufacturer: 'Chicago-Latrobe', series: '550 Series', partNumber: '55016', diameter: 0.25, flutes: 2, material: 'HSS-Co', coating: 'TiN', maxDepth: 2.25, shank: 0.25, geometry: { volume: 1050, surfaceArea: 780 } },
            { id: 'chicago_hssco_375', name: '3/8" HSS-Co Jobber', manufacturer: 'Chicago-Latrobe', series: '550 Series', partNumber: '55024', diameter: 0.375, flutes: 2, material: 'HSS-Co', coating: 'TiN', maxDepth: 3.375, shank: 0.375, geometry: { volume: 2500, surfaceArea: 1300 } },
            { id: 'chicago_hssco_5', name: '1/2" HSS-Co Jobber', manufacturer: 'Chicago-Latrobe', series: '550 Series', partNumber: '55032', diameter: 0.5, flutes: 2, material: 'HSS-Co', coating: 'TiN', maxDepth: 4.5, shank: 0.5, geometry: { volume: 4600, surfaceArea: 1950 } },
        ],

        // SPADE DRILLS (Allied Machine Style)
        spade_drill: [
            // Allied Machine GEN3SYS XT Pro
            { id: 'allied_xt_1', name: '1.0" GEN3SYS XT Pro', manufacturer: 'Allied Machine', series: 'GEN3SYS XT Pro', partNumber: '4A01P-10000', diameter: 1.0, flutes: 2, insertType: 'AM200-1000', maxDepth: 5.0, shank: 'Flanged', geometry: { volume: 32000, surfaceArea: 6500 } },
            { id: 'allied_xt_125', name: '1.25" GEN3SYS XT Pro', manufacturer: 'Allied Machine', series: 'GEN3SYS XT Pro', partNumber: '4A01P-12500', diameter: 1.25, flutes: 2, insertType: 'AM200-1250', maxDepth: 6.25, shank: 'Flanged', geometry: { volume: 48000, surfaceArea: 8800 } },
            { id: 'allied_xt_15', name: '1.5" GEN3SYS XT Pro', manufacturer: 'Allied Machine', series: 'GEN3SYS XT Pro', partNumber: '4A01P-15000', diameter: 1.5, flutes: 2, insertType: 'AM200-1500', maxDepth: 7.5, shank: 'Flanged', geometry: { volume: 68000, surfaceArea: 11200 } },
            { id: 'allied_xt_175', name: '1.75" GEN3SYS XT Pro', manufacturer: 'Allied Machine', series: 'GEN3SYS XT Pro', partNumber: '4A01P-17500', diameter: 1.75, flutes: 2, insertType: 'AM200-1750', maxDepth: 8.75, shank: 'Flanged', geometry: { volume: 92000, surfaceArea: 13800 } },
            { id: 'allied_xt_2', name: '2.0" GEN3SYS XT Pro', manufacturer: 'Allied Machine', series: 'GEN3SYS XT Pro', partNumber: '4A01P-20000', diameter: 2.0, flutes: 2, insertType: 'AM200-2000', maxDepth: 10.0, shank: 'Flanged', geometry: { volume: 118000, surfaceArea: 16500 } },

            // Allied T-A Pro
            { id: 'allied_ta_1', name: '1.0" T-A Pro Spade', manufacturer: 'Allied Machine', series: 'T-A Pro', partNumber: 'TA-PRO-100', diameter: 1.0, flutes: 1, insertType: 'TA-P-1000', maxDepth: 4.0, shank: '1.0" Straight', geometry: { volume: 28000, surfaceArea: 5800 } },
            { id: 'allied_ta_125', name: '1.25" T-A Pro Spade', manufacturer: 'Allied Machine', series: 'T-A Pro', partNumber: 'TA-PRO-125', diameter: 1.25, flutes: 1, insertType: 'TA-P-1250', maxDepth: 5.0, shank: '1.0" Straight', geometry: { volume: 42000, surfaceArea: 7800 } },
            { id: 'allied_ta_15', name: '1.5" T-A Pro Spade', manufacturer: 'Allied Machine', series: 'T-A Pro', partNumber: 'TA-PRO-150', diameter: 1.5, flutes: 1, insertType: 'TA-P-1500', maxDepth: 6.0, shank: '1.25" Straight', geometry: { volume: 58000, surfaceArea: 9800 } },
            { id: 'allied_ta_2', name: '2.0" T-A Pro Spade', manufacturer: 'Allied Machine', series: 'T-A Pro', partNumber: 'TA-PRO-200', diameter: 2.0, flutes: 1, insertType: 'TA-P-2000', maxDepth: 8.0, shank: '1.5" Straight', geometry: { volume: 98000, surfaceArea: 14200 } },

            // Komet UniDrill
            { id: 'komet_uni_1', name: '1.0" UniDrill Spade', manufacturer: 'Komet', series: 'UniDrill', partNumber: 'W27 00010.0100', diameter: 1.0, flutes: 2, insertType: 'W29 00100', maxDepth: 4.5, shank: 'Weldon 1.0"', geometry: { volume: 30000, surfaceArea: 6200 } },
            { id: 'komet_uni_125', name: '1.25" UniDrill Spade', manufacturer: 'Komet', series: 'UniDrill', partNumber: 'W27 00010.0125', diameter: 1.25, flutes: 2, insertType: 'W29 00125', maxDepth: 5.6, shank: 'Weldon 1.25"', geometry: { volume: 45000, surfaceArea: 8200 } },
        ],

        // MODULAR DRILLS (KSEM, KenTIP Style)
        modular_drill: [
            // Kennametal KSEM
            { id: 'kennametal_ksem_mod_0625', name: '0.625" KSEM Modular', manufacturer: 'Kennametal', series: 'KSEM', partNumber: 'KSEM062R5WD16', diameter: 0.625, flutes: 2, insertType: 'KSEM SE 062', maxDepth: 1.6, shank: 'Weldon 0.625"', style: 'twist-on', geometry: { volume: 12000, surfaceArea: 3200 } },
            { id: 'kennametal_ksem_mod_075', name: '0.75" KSEM Modular', manufacturer: 'Kennametal', series: 'KSEM', partNumber: 'KSEM075R5WD20', diameter: 0.75, flutes: 2, insertType: 'KSEM SE 075', maxDepth: 2.0, shank: 'Weldon 0.75"', style: 'twist-on', geometry: { volume: 16500, surfaceArea: 3900 } },
            { id: 'kennametal_ksem_mod_1', name: '1.0" KSEM Modular', manufacturer: 'Kennametal', series: 'KSEM', partNumber: 'KSEM100R5WD25', diameter: 1.0, flutes: 2, insertType: 'KSEM SE 100', maxDepth: 2.5, shank: 'Weldon 1.0"', style: 'twist-on', geometry: { volume: 27000, surfaceArea: 5600 } },

            // Kennametal KenTIP FS
            { id: 'kennametal_kentip_0625', name: '0.625" KenTIP FS', manufacturer: 'Kennametal', series: 'KenTIP FS', partNumber: 'DFC0625R5WC20', diameter: 0.625, flutes: 2, insertType: 'DFT 06T308', maxDepth: 2.0, shank: 'Weldon 0.625"', style: 'indexable-tip', geometry: { volume: 13000, surfaceArea: 3400 } },
            { id: 'kennametal_kentip_075', name: '0.75" KenTIP FS', manufacturer: 'Kennametal', series: 'KenTIP FS', partNumber: 'DFC0750R5WC25', diameter: 0.75, flutes: 2, insertType: 'DFT 07T408', maxDepth: 2.5, shank: 'Weldon 0.75"', style: 'indexable-tip', geometry: { volume: 17500, surfaceArea: 4100 } },
            { id: 'kennametal_kentip_1', name: '1.0" KenTIP FS', manufacturer: 'Kennametal', series: 'KenTIP FS', partNumber: 'DFC1000R5WC32', diameter: 1.0, flutes: 2, insertType: 'DFT 10T508', maxDepth: 3.2, shank: 'Weldon 1.0"', style: 'indexable-tip', geometry: { volume: 28500, surfaceArea: 5800 } },

            // Sandvik CoroDrill DS20
            { id: 'sandvik_ds20_0625', name: '0.625" CoroDrill DS20', manufacturer: 'Sandvik Coromant', series: 'CoroDrill DS20', partNumber: 'DS20-D1600L20-04', diameter: 0.625, flutes: 2, insertType: 'DS20-0603', maxDepth: 2.0, shank: 'Weldon 0.625"', style: 'modular-head', geometry: { volume: 13500, surfaceArea: 3500 } },
            { id: 'sandvik_ds20_075', name: '0.75" CoroDrill DS20', manufacturer: 'Sandvik Coromant', series: 'CoroDrill DS20', partNumber: 'DS20-D1900L25-05', diameter: 0.75, flutes: 2, insertType: 'DS20-0704', maxDepth: 2.5, shank: 'Weldon 0.75"', style: 'modular-head', geometry: { volume: 18000, surfaceArea: 4200 } },
            { id: 'sandvik_ds20_1', name: '1.0" CoroDrill DS20', manufacturer: 'Sandvik Coromant', series: 'CoroDrill DS20', partNumber: 'DS20-D2540L32-06', diameter: 1.0, flutes: 2, insertType: 'DS20-1005', maxDepth: 3.2, shank: 'Weldon 1.0"', style: 'modular-head', geometry: { volume: 29000, surfaceArea: 5900 } },

            // ISCAR CHAMDRILL
            { id: 'iscar_chamdrill_0625', name: '0.625" CHAMDRILL', manufacturer: 'ISCAR', series: 'CHAMDRILL', partNumber: 'DCN 062-019-12A-1.5D', diameter: 0.625, flutes: 2, insertType: 'ICP 062', maxDepth: 0.94, shank: 'Weldon 0.625"', style: 'modular-head', geometry: { volume: 11500, surfaceArea: 3100 } },
            { id: 'iscar_chamdrill_075', name: '0.75" CHAMDRILL', manufacturer: 'ISCAR', series: 'CHAMDRILL', partNumber: 'DCN 075-023-12A-1.5D', diameter: 0.75, flutes: 2, insertType: 'ICP 075', maxDepth: 1.13, shank: 'Weldon 0.75"', style: 'modular-head', geometry: { volume: 15500, surfaceArea: 3700 } },
            { id: 'iscar_chamdrill_1', name: '1.0" CHAMDRILL', manufacturer: 'ISCAR', series: 'CHAMDRILL', partNumber: 'DCN 100-030-16A-1.5D', diameter: 1.0, flutes: 2, insertType: 'ICP 100', maxDepth: 1.5, shank: 'Weldon 1.0"', style: 'modular-head', geometry: { volume: 26000, surfaceArea: 5400 } },
        ]
    };
    // INSERT DATABASE
INSERT_DATABASE = {
        // Milling Inserts
        'R245-12': [
            { id: 'r245_12_m10', name: 'R245-12 T3 M-M GC4240', manufacturer: 'Sandvik Coromant', grade: 'GC4240', coating: 'CVD', material: 'Steel (P)', chipbreaker: 'M-M', edges: 4 },
            { id: 'r245_12_k10', name: 'R245-12 T3 M-K GC3220', manufacturer: 'Sandvik Coromant', grade: 'GC3220', coating: 'PVD', material: 'Cast Iron (K)', chipbreaker: 'M-K', edges: 4 },
            { id: 'r245_12_pm', name: 'R245-12 T3 PM GC1130', manufacturer: 'Sandvik Coromant', grade: 'GC1130', coating: 'PVD', material: 'Stainless (M)', chipbreaker: 'PM', edges: 4 },
        ],
        'R390-11': [
            { id: 'r390_11_pm', name: 'R390-11 T3 08M-PM 1130', manufacturer: 'Sandvik Coromant', grade: '1130', coating: 'PVD', material: 'Stainless (M)', chipbreaker: 'PM', edges: 2 },
            { id: 'r390_11_mm', name: 'R390-11 T3 08M-MM 4240', manufacturer: 'Sandvik Coromant', grade: '4240', coating: 'CVD', material: 'Steel (P)', chipbreaker: 'MM', edges: 2 },
        ],
        'SDMT1204': [
            { id: 'sdmt1204_kc730', name: 'SDMT 1204AETN KC730', manufacturer: 'Kennametal', grade: 'KC730', coating: 'PVD', material: 'Steel (P)', chipbreaker: 'Standard', edges: 4 },
            { id: 'sdmt1204_kc935m', name: 'SDMT 1204AETN KC935M', manufacturer: 'Kennametal', grade: 'KC935M', coating: 'CVD', material: 'Cast Iron (K)', chipbreaker: 'Standard', edges: 4 },
        ],
        'HM90 APKT 1003': [
            { id: 'apkt1003_ic830', name: 'HM90 APKT 1003PDR IC830', manufacturer: 'ISCAR', grade: 'IC830', coating: 'PVD', material: 'Steel (P)', chipbreaker: 'PDR', edges: 2 },
            { id: 'apkt1003_ic28', name: 'HM90 APKT 1003PDR IC28', manufacturer: 'ISCAR', grade: 'IC28', coating: 'Uncoated', material: 'Aluminum (N)', chipbreaker: 'PDR', edges: 2 },
        ],

        // Drill Inserts
        '880-0503': [
            { id: '880_0503_4344', name: '880-0503W06H-P-GM 4344', manufacturer: 'Sandvik Coromant', grade: '4344', coating: 'CVD', material: 'Steel (P)', chipbreaker: 'GM', position: 'Peripheral' },
            { id: '880_0503_1044', name: '880-0503W06H-P-LM 1044', manufacturer: 'Sandvik Coromant', grade: '1044', coating: 'PVD', material: 'Stainless (M)', chipbreaker: 'LM', position: 'Peripheral' },
        ],
        '880-0604': [
            { id: '880_0604_4344', name: '880-0604W08H-P-GM 4344', manufacturer: 'Sandvik Coromant', grade: '4344', coating: 'CVD', material: 'Steel (P)', chipbreaker: 'GM', position: 'Peripheral' },
        ],
        'KSEM 0750': [
            { id: 'ksem0750_kc7315', name: 'KSEM SE 0750 KC7315', manufacturer: 'Kennametal', grade: 'KC7315', coating: 'PVD', material: 'Steel (P)', chipbreaker: 'Standard' },
            { id: 'ksem0750_kc7140', name: 'KSEM SE 0750 KC7140', manufacturer: 'Kennametal', grade: 'KC7140', coating: 'CVD', material: 'Cast Iron (K)', chipbreaker: 'Standard' },
        ],
        'KSEM 1000': [
            { id: 'ksem1000_kc7315', name: 'KSEM SE 1000 KC7315', manufacturer: 'Kennametal', grade: 'KC7315', coating: 'PVD', material: 'Steel (P)', chipbreaker: 'Standard' },
        ],
        'ICP 075': [
            { id: 'icp075_ic908', name: 'ICP 075 IC908', manufacturer: 'ISCAR', grade: 'IC908', coating: 'PVD', material: 'Steel (P)', chipbreaker: 'Standard' },
            { id: 'icp075_ic328', name: 'ICP 075 IC328', manufacturer: 'ISCAR', grade: 'IC328', coating: 'CVD', material: 'Cast Iron (K)', chipbreaker: 'Standard' },
        ],
        'ICP 100': [
            { id: 'icp100_ic908', name: 'ICP 100 IC908', manufacturer: 'ISCAR', grade: 'IC908', coating: 'PVD', material: 'Steel (P)', chipbreaker: 'Standard' },
        ],

        // Spade Drill Inserts
        'AM200-1000': [
            { id: 'am200_1000_std', name: 'AM200-1000 TIN', manufacturer: 'Allied Machine', grade: 'AM200', coating: 'TiN', material: 'Steel (P)', chipbreaker: 'Standard' },
            { id: 'am200_1000_tialn', name: 'AM200-1000 TiAlN', manufacturer: 'Allied Machine', grade: 'AM200', coating: 'TiAlN', material: 'Stainless (M)', chipbreaker: 'Standard' },
        ],
        'AM200-1250': [
            { id: 'am200_1250_std', name: 'AM200-1250 TIN', manufacturer: 'Allied Machine', grade: 'AM200', coating: 'TiN', material: 'Steel (P)', chipbreaker: 'Standard' },
        ],
        'AM200-1500': [
            { id: 'am200_1500_std', name: 'AM200-1500 TIN', manufacturer: 'Allied Machine', grade: 'AM200', coating: 'TiN', material: 'Steel (P)', chipbreaker: 'Standard' },
        ],
        'TA-P-1000': [
            { id: 'tap1000_gen', name: 'T-A Pro 1.0" Insert', manufacturer: 'Allied Machine', grade: 'Standard', coating: 'TiN', material: 'General Purpose', chipbreaker: 'Standard' },
        ],
        'TA-P-1250': [
            { id: 'tap1250_gen', name: 'T-A Pro 1.25" Insert', manufacturer: 'Allied Machine', grade: 'Standard', coating: 'TiN', material: 'General Purpose', chipbreaker: 'Standard' },
        ],

        // Modular Drill Heads
        'KSEM SE 062': [
            { id: 'ksem_se_062_7315', name: 'KSEM SE 062 KC7315', manufacturer: 'Kennametal', grade: 'KC7315', coating: 'PVD', material: 'Steel (P)' },
        ],
        'KSEM SE 075': [
            { id: 'ksem_se_075_7315', name: 'KSEM SE 075 KC7315', manufacturer: 'Kennametal', grade: 'KC7315', coating: 'PVD', material: 'Steel (P)' },
            { id: 'ksem_se_075_7140', name: 'KSEM SE 075 KC7140', manufacturer: 'Kennametal', grade: 'KC7140', coating: 'CVD', material: 'Cast Iron (K)' },
        ],
        'KSEM SE 100': [
            { id: 'ksem_se_100_7315', name: 'KSEM SE 100 KC7315', manufacturer: 'Kennametal', grade: 'KC7315', coating: 'PVD', material: 'Steel (P)' },
        ],
        'DFT 06T308': [
            { id: 'dft06_kc7315', name: 'DFT 06T308 KC7315', manufacturer: 'Kennametal', grade: 'KC7315', coating: 'PVD', material: 'Steel (P)' },
        ],
        'DFT 07T408': [
            { id: 'dft07_kc7315', name: 'DFT 07T408 KC7315', manufacturer: 'Kennametal', grade: 'KC7315', coating: 'PVD', material: 'Steel (P)' },
        ],
        'DS20-0603': [
            { id: 'ds20_0603_4344', name: 'DS20-0603 PM 4344', manufacturer: 'Sandvik Coromant', grade: '4344', coating: 'CVD', material: 'Steel (P)' },
        ],
        'DS20-0704': [
            { id: 'ds20_0704_4344', name: 'DS20-0704 PM 4344', manufacturer: 'Sandvik Coromant', grade: '4344', coating: 'CVD', material: 'Steel (P)' },
        ],
        'ICP 062': [
            { id: 'icp062_ic908', name: 'ICP 062 IC908', manufacturer: 'ISCAR', grade: 'IC908', coating: 'PVD', material: 'Steel (P)' },
        ],
    };
    const PRISM_SUBSCRIPTION_SYSTEM = {
    VERSION: "2.0.0",
    UPDATED: "2025-01-01",

    // TIER DEFINITIONS
    tiers: {
        // TIER 1: ESSENTIALS - Entry Level
        // $29/month or $290/year (17% savings)
        tier1: {
            id: "essentials",
            name: "Tier 1",
            tagline: "Entry Level Calculations",
            monthlyPrice: 29,
            yearlyPrice: 290,
            yearlySavings: "17%",
            color: "#6b7280", // Gray
            icon: "📐",

            // Module access
            modules: {
                included: 1, // Only 1 module included
                available: ['mill', 'lathe', 'sinker_edm', 'wire_edm', 'laser', 'waterjet'],
                addOnPrice: 19 // Per additional module/month
            },
            // Feature access
            features: {
                // Machine Selection
                machineSelection: "generic", // Generic only
                machineDatabase: false,
                customMachineSpecs: false,
                machineCribLimit: 3,

                // Tooling
                toolingSelection: "generic", // Generic only
                brandTooling: false,
                toolCribLimit: 15,

                // Tool Holders
                holderSelection: "generic",
                brandHolders: false,

                // Work Holding / Fixturing
                fixtureSelection: "generic",
                customFixtures: false,

                // Speeds & Feeds
                speedsFeedsMode: "balanced_only", // Only balanced, no aggressive/conservative
                sfmCustomization: false,
                chiploadAdjustment: false,

                // Surface Finish
                surfaceFinishSelection: false,
                roughnessCalculation: false,

                // Materials
                materialDatabase: "limited", // ~50 common materials
                customMaterials: false,

                // Calculations
                calculationsPerDay: 25,
                multiOperationSupport: false,

                // Output & Export
                exportFormats: ['txt'],
                setupSheetExport: false,

                // Advanced Features
                cadRecognition: false,
                printRecognition: false,
                aiEnhancedSettings: false,
                workflowSuggestions: false,
                quotingModule: false,
                costAnalysis: false,

                // Support
                supportLevel: "community",
                responseTime: "48-72 hours"
            },
            limitations: {
                noMachineDatabase: "Generic machine parameters only",
                noToolBrands: "Generic tooling specifications",
                balancedOnly: "Speeds & feeds locked to balanced mode",
                noSurfaceFinish: "Surface finish selection not available",
                limitedMaterials: "50 common materials included",
                limitedExport: "Basic text export only"
            },
            upgradePrompts: {
                machineSelect: "⬆️ Upgrade to Standard for access to 300+ specific machines with exact specifications",
                toolSelect: "⬆️ Upgrade to Standard for brand-specific tooling from Kennametal, Sandvik, Iscar & more",
                speedsFeed: "⬆️ Upgrade to Standard to unlock Aggressive and Conservative speed/feed modes",
                surfaceFinish: "⬆️ Upgrade to Standard to select target surface finish",
                export: "⬆️ Upgrade to Standard for PDF and Excel export capabilities"
            }
        },
        // TIER 2: STANDARD - Professional
        // $79/month or $790/year (17% savings)
        tier2: {
            id: "standard",
            name: "Standard",
            tagline: "Professional-Grade Calculations",
            monthlyPrice: 79,
            yearlyPrice: 790,
            yearlySavings: "17%",
            color: "#3b82f6", // Blue
            icon: "🔧",
            badge: "MOST POPULAR",

            // Module access
            modules: {
                included: 2, // 2 modules included
                available: ['mill', 'lathe', 'sinker_edm', 'wire_edm', 'laser', 'waterjet'],
                addOnPrice: 24 // Per additional module/month
            },
            // Feature access
            features: {
                // Machine Selection
                machineSelection: "database", // Full machine database
                machineDatabase: true,
                customMachineSpecs: true,
                machineCribLimit: 15,

                // Tooling
                toolingSelection: "database", // Brand-specific tooling
                brandTooling: true,
                toolCribLimit: 100,

                // Tool Holders - STILL GENERIC
                holderSelection: "generic",
                brandHolders: false,

                // Work Holding / Fixturing - STILL GENERIC
                fixtureSelection: "generic",
                customFixtures: false,

                // Speeds & Feeds - CAPPED AT BALANCED
                speedsFeedsMode: "balanced_only", // Still balanced only
                sfmCustomization: false,
                chiploadAdjustment: false,

                // Surface Finish - NOT AVAILABLE
                surfaceFinishSelection: false,
                roughnessCalculation: false,

                // Materials
                materialDatabase: "standard", // ~200 materials
                customMaterials: true,
                heatTreatStates: true,

                // Calculations
                calculationsPerDay: 100,
                multiOperationSupport: true,

                // Output & Export
                exportFormats: ['txt', 'pdf', 'xlsx'],
                setupSheetExport: true,

                // Advanced Features
                cadRecognition: false,
                printRecognition: false,
                aiEnhancedSettings: false,
                workflowSuggestions: false,
                quotingModule: false,
                costAnalysis: "basic", // View only, no customization

                // Support
                supportLevel: "email",
                responseTime: "24-48 hours"
            },
            limitations: {
                genericHolders: "Tool holders are generic specifications",
                genericFixturing: "Work holding uses generic parameters",
                balancedOnly: "Speeds & feeds locked to balanced mode",
                noSurfaceFinish: "Surface finish selection not available",
                noAiFeatures: "AI-enhanced features not included",
                noCadRecognition: "CAD/Print recognition not available"
            },
            upgradePrompts: {
                holderSelect: "⬆️ Upgrade to Professional for brand-specific holders (Rego-Fix, Haimer, Schunk)",
                fixtureSelect: "⬆️ Upgrade to Professional for advanced work holding options",
                speedsFeed: "⬆️ Upgrade to Professional for full speed/feed range (Conservative to Aggressive)",
                surfaceFinish: "⬆️ Upgrade to Professional for surface finish optimization",
                aiFeatures: "⬆️ Upgrade to Professional for AI-enhanced settings",
                quoting: "⬆️ Upgrade to Professional for full quoting module access"
            }
        },
        // TIER 3: PROFESSIONAL - Advanced
        // $149/month or $1,490/year (17% savings)
        tier3: {
            id: "professional",
            name: "Professional",
            tagline: "Complete Solution",
            monthlyPrice: 149,
            yearlyPrice: 1490,
            yearlySavings: "17%",
            color: "#a855f7", // Purple
            icon: "⚡",
            badge: "BEST VALUE",

            // Module access
            modules: {
                included: 4, // 4 modules included
                available: ['mill', 'lathe', 'sinker_edm', 'wire_edm', 'laser', 'waterjet'],
                addOnPrice: 29 // Per additional module/month
            },
            // Feature access
            features: {
                // Machine Selection - FULL ACCESS
                machineSelection: "full",
                machineDatabase: true,
                customMachineSpecs: true,
                machineCribLimit: 50,

                // Tooling - FULL ACCESS
                toolingSelection: "full",
                brandTooling: true,
                toolCribLimit: 500,

                // Tool Holders - FULL ACCESS
                holderSelection: "full",
                brandHolders: true,

                // Work Holding / Fixturing - FULL ACCESS
                fixtureSelection: "full",
                customFixtures: true,

                // Speeds & Feeds - FULL RANGE
                speedsFeedsMode: "full", // Conservative, Balanced, Aggressive, MRR Max
                sfmCustomization: true,
                chiploadAdjustment: true,

                // Surface Finish - FULL ACCESS
                surfaceFinishSelection: true,
                roughnessCalculation: true,

                // Materials
                materialDatabase: "full", // 500+ materials
                customMaterials: true,
                heatTreatStates: true,
                exoticMaterials: true,

                // Calculations
                calculationsPerDay: "unlimited",
                multiOperationSupport: true,

                // Output & Export
                exportFormats: ['txt', 'pdf', 'xlsx', 'csv', 'json'],
                setupSheetExport: true,

                // Advanced Features
                cadRecognition: false, // NOT INCLUDED
                printRecognition: false, // NOT INCLUDED
                aiEnhancedSettings: false, // NOT INCLUDED
                workflowSuggestions: true,
                quotingModule: true, // Full access
                costAnalysis: "full",

                // Support
                supportLevel: "priority_email",
                responseTime: "12-24 hours"
            },
            limitations: {
                noCadRecognition: "CAD file recognition requires Enterprise",
                noPrintRecognition: "Print/PDF recognition requires Enterprise",
                noAiEnhanced: "AI-enhanced optimization requires Enterprise"
            },
            upgradePrompts: {
                cadRecognition: "⬆️ Upgrade to Enterprise for automatic CAD file analysis",
                printRecognition: "⬆️ Upgrade to Enterprise for print/drawing recognition",
                aiEnhanced: "⬆️ Upgrade to Enterprise for AI-powered parameter optimization"
            }
        },
        // TIER 4: ENTERPRISE - Everything Unlocked
        // $299/month or $2,990/year (17% savings)
        tier4: {
            id: "enterprise",
            name: "Enterprise",
            tagline: "Ultimate Manufacturing Intelligence",
            monthlyPrice: 299,
            yearlyPrice: 2990,
            yearlySavings: "17%",
            color: "#f59e0b", // Gold
            icon: "👑",
            badge: "FULL ACCESS",

            // Module access
            modules: {
                included: "all", // All 6 modules included
                available: ['mill', 'lathe', 'sinker_edm', 'wire_edm', 'laser', 'waterjet'],
                addOnPrice: 0 // No add-ons needed
            },
            // Feature access - EVERYTHING UNLOCKED
            features: {
                // Machine Selection
                machineSelection: "full",
                machineDatabase: true,
                customMachineSpecs: true,
                machineCribLimit: "unlimited",

                // Tooling
                toolingSelection: "full",
                brandTooling: true,
                toolCribLimit: "unlimited",

                // Tool Holders
                holderSelection: "full",
                brandHolders: true,

                // Work Holding / Fixturing
                fixtureSelection: "full",
                customFixtures: true,

                // Speeds & Feeds
                speedsFeedsMode: "full",
                sfmCustomization: true,
                chiploadAdjustment: true,

                // Surface Finish
                surfaceFinishSelection: true,
                roughnessCalculation: true,

                // Materials
                materialDatabase: "full",
                customMaterials: true,
                heatTreatStates: true,
                exoticMaterials: true,

                // Calculations
                calculationsPerDay: "unlimited",
                multiOperationSupport: true,

                // Output & Export
                exportFormats: ['txt', 'pdf', 'xlsx', 'csv', 'json', 'xml'],
                setupSheetExport: true,

                // Advanced Features - ALL UNLOCKED
                cadRecognition: true,
                printRecognition: true,
                aiEnhancedSettings: true,
                workflowSuggestions: true,
                quotingModule: true,
                costAnalysis: "full",

                // Enterprise Exclusive
                apiAccess: true,
                multiUser: true,
                teamManagement: true,
                customBranding: true,
                ssoIntegration: true,
                auditLogging: true,

                // Support
                supportLevel: "dedicated",
                responseTime: "4-8 hours",
                phoneSupport: true,
                accountManager: true
            },
            limitations: {}, // No limitations
            upgradePrompts: {} // No upgrade prompts needed
        }
    },
    // MODULE DEFINITIONS
    modules: {
        mill: {
            id: "mill",
            name: "Milling",
            description: "VMC, HMC, 3-axis, 4-axis, 5-axis milling",
            icon: "🔧",
            includes: ["face_milling", "pocket_milling", "contouring", "drilling", "tapping", "boring", "slotting"]
        },
        lathe: {
            id: "lathe",
            name: "Turning",
            description: "CNC lathes, turning centers, Swiss-type",
            icon: "🔄",
            includes: ["od_turning", "id_turning", "facing", "grooving", "threading", "parting", "boring"]
        },
        sinker_edm: {
            id: "sinker_edm",
            name: "Sinker EDM",
            description: "Die sinker EDM, ram EDM",
            icon: "⚡",
            includes: ["cavity_sinking", "electrode_design", "orbiting", "flushing_calc"]
        },
        wire_edm: {
            id: "wire_edm",
            name: "Wire EDM",
            description: "Wire electrical discharge machining",
            icon: "〰️",
            includes: ["straight_cutting", "taper_cutting", "skim_cuts", "wire_selection"]
        },
        laser: {
            id: "laser",
            name: "Laser Cutting",
            description: "Fiber laser, CO2 laser cutting",
            icon: "🔦",
            includes: ["cutting_speed", "pierce_time", "gas_selection", "kerf_compensation"]
        },
        waterjet: {
            id: "waterjet",
            name: "Waterjet",
            description: "Abrasive and pure waterjet cutting",
            icon: "💧",
            includes: ["abrasive_calc", "cutting_speed", "taper_compensation", "pierce_time"]
        }
    },
    // ADD-ON FEATURES (Available to any tier)
    addOns: {
        // Individual Feature Add-Ons
        features: {
            cad_recognition: {
                name: "CAD Recognition",
                description: "Automatic feature detection from STEP, IGES, DXF files",
                monthlyPrice: 39,
                yearlyPrice: 390,
                minTier: "tier2" // Must be at least Standard tier
            },
            print_recognition: {
                name: "Print/Drawing Recognition",
                description: "AI-powered analysis of PDF drawings and prints",
                monthlyPrice: 39,
                yearlyPrice: 390,
                minTier: "tier2"
            },
            ai_optimization: {
                name: "AI-Enhanced Settings",
                description: "Machine learning optimized parameters",
                monthlyPrice: 49,
                yearlyPrice: 490,
                minTier: "tier2"
            },
            quoting_module: {
                name: "Quoting Module",
                description: "Full job costing and quote generation",
                monthlyPrice: 49,
                yearlyPrice: 490,
                minTier: "tier2"
            },
            surface_finish: {
                name: "Surface Finish Optimization",
                description: "Ra/Rz targeting and calculation",
                monthlyPrice: 19,
                yearlyPrice: 190,
                minTier: "tier1"
            },
            aggressive_speeds: {
                name: "Full Speed/Feed Range",
                description: "Unlock Conservative to Aggressive modes",
                monthlyPrice: 19,
                yearlyPrice: 190,
                minTier: "tier1"
            }
        },
        // Module Add-Ons (pricing varies by tier)
        additionalModules: {
            essentials: 19,
            standard: 24,
            professional: 29,
            enterprise: 0 // All included
        }
    },
    // POST PROCESSORS - SOLD SEPARATELY
    postProcessors: {
        description: "Post processors are purchased separately per machine/controller combination",
        note: "One-time purchase with lifetime updates for that controller",

        // Price tiers based on complexity
        pricing: {
            basic: {
                price: 49,
                description: "Standard 3-axis mill or 2-axis lathe",
                controllers: ["Fanuc_basic", "Haas_basic", "Mazak_basic", "Mach3", "Mach4", "LinuxCNC"]
            },
            tier2: {
                price: 99,
                description: "4-axis, live tooling, or advanced features",
                controllers: ["Fanuc_full", "Haas_NGC", "Mazak_Matrix", "Siemens_840D", "Heidenhain_TNC", "Okuma_OSP"]
            },
            advanced: {
                price: 149,
                description: "5-axis simultaneous, multi-turret, mill-turn",
                controllers: ["Fanuc_5axis", "Siemens_5axis", "Heidenhain_5axis", "DMG_CELOS", "Mazak_SmoothX"]
            },
            custom: {
                price: 299,
                description: "Custom post for unique machine configurations",
                controllers: ["Custom request"]
            }
        },
        // Available post processors
        catalog: {
            fanuc: {
                name: "Fanuc",
                posts: [
                    { id: "fanuc_0i", name: "Fanuc 0i-M/T", tier: "basic", price: 49 },
                    { id: "fanuc_16i", name: "Fanuc 16i/18i", tier: "tier2", price: 99 },
                    { id: "fanuc_30i", name: "Fanuc 30i/31i", tier: "tier2", price: 99 },
                    { id: "fanuc_5axis", name: "Fanuc 5-Axis", tier: "advanced", price: 149 }
                ]
            },
            haas: {
                name: "Haas",
                posts: [
                    { id: "haas_mill", name: "Haas Mill (Classic)", tier: "basic", price: 49 },
                    { id: "haas_ngc", name: "Haas NGC", tier: "tier2", price: 99 },
                    { id: "haas_lathe", name: "Haas Lathe", tier: "basic", price: 49 },
                    { id: "haas_umc", name: "Haas UMC 5-Axis", tier: "advanced", price: 149 }
                ]
            },
            mazak: {
                name: "Mazak",
                posts: [
                    { id: "mazak_640", name: "Mazak 640M/T", tier: "basic", price: 49 },
                    { id: "mazak_matrix", name: "Mazak Matrix", tier: "tier2", price: 99 },
                    { id: "mazak_smooth", name: "Mazak SmoothX", tier: "advanced", price: 149 },
                    { id: "mazak_integrex", name: "Mazak Integrex", tier: "advanced", price: 149 }
                ]
            },
            siemens: {
                name: "Siemens",
                posts: [
                    { id: "siemens_828", name: "Siemens 828D", tier: "tier2", price: 99 },
                    { id: "siemens_840d", name: "Siemens 840D", tier: "tier2", price: 99 },
                    { id: "siemens_5axis", name: "Siemens 5-Axis", tier: "advanced", price: 149 }
                ]
            },
            heidenhain: {
                name: "Heidenhain",
                posts: [
                    { id: "heidenhain_tnc", name: "Heidenhain TNC 640", tier: "tier2", price: 99 },
                    { id: "heidenhain_5axis", name: "Heidenhain 5-Axis", tier: "advanced", price: 149 }
                ]
            },
            okuma: {
                name: "Okuma",
                posts: [
                    { id: "okuma_osp", name: "Okuma OSP-P", tier: "tier2", price: 99 },
                    { id: "okuma_5axis", name: "Okuma 5-Axis", tier: "advanced", price: 149 }
                ]
            },
            dmg: {
                name: "DMG Mori",
                posts: [
                    { id: "dmg_mapps", name: "DMG MAPPS", tier: "tier2", price: 99 },
                    { id: "dmg_celos", name: "DMG CELOS", tier: "advanced", price: 149 }
                ]
            },
            hobby: {
                name: "Hobby/DIY",
                posts: [
                    { id: "mach3", name: "Mach3", tier: "basic", price: 49 },
                    { id: "mach4", name: "Mach4", tier: "basic", price: 49 },
                    { id: "linuxcnc", name: "LinuxCNC", tier: "basic", price: 49 },
                    { id: "grbl", name: "GRBL", tier: "basic", price: 49 }
                ]
            }
        }
    },
    // GENERIC MACHINE/TOOLING DATA FOR LOWER TIERS
    genericData: {
        // Generic Machines (Essentials & Standard tiers)
        machines: {
            mill: {
                small_vmc: {
                    name: "Small VMC (Generic)",
                    specs: { taper: "CAT40", rpm: 8000, hp: 15, travels: { x: 20, y: 16, z: 16 } }
                },
                standard_vmc: {
                    name: "Standard VMC (Generic)",
                    specs: { taper: "CAT40", rpm: 10000, hp: 25, travels: { x: 40, y: 20, z: 20 } }
                },
                large_vmc: {
                    name: "Large VMC (Generic)",
                    specs: { taper: "CAT50", rpm: 6000, hp: 40, travels: { x: 60, y: 30, z: 24 } }
                },
                hmc_tier2: {
                    name: "HMC (Generic)",
                    specs: { taper: "CAT40", rpm: 10000, hp: 25, palletSize: 400 }
                }
            },
            lathe: {
                small_lathe: {
                    name: "Small CNC Lathe (Generic)",
                    specs: { chuckSize: 6, rpm: 5000, hp: 15, barCapacity: 1.5 }
                },
                standard_lathe: {
                    name: "Standard CNC Lathe (Generic)",
                    specs: { chuckSize: 10, rpm: 4000, hp: 30, barCapacity: 2.5 }
                },
                large_lathe: {
                    name: "Large CNC Lathe (Generic)",
                    specs: { chuckSize: 15, rpm: 2500, hp: 50, barCapacity: 4 }
                }
            },
            edm: {
                sinker_tier2: {
                    name: "Sinker EDM (Generic)",
                    specs: { amperage: 50, orbitalCapable: true }
                },
                wire_tier2: {
                    name: "Wire EDM (Generic)",
                    specs: { maxTaper: 30, autoThread: true }
                }
            },
            laser: {
                fiber_tier2: {
                    name: "Fiber Laser (Generic)",
                    specs: { power: 4000, bedSize: { x: 60, y: 120 } }
                },
                co2_tier2: {
                    name: "CO2 Laser (Generic)",
                    specs: { power: 4000, bedSize: { x: 60, y: 120 } }
                }
            },
            waterjet: {
                tier2: {
                    name: "Waterjet (Generic)",
                    specs: { pressure: 60000, abrasive: true }
                }
            }
        },
        // Generic Tool Holders (Essentials, Standard, and as backup)
        holders: {
            cat40_er32: { name: "CAT40 ER32 Collet Chuck (Generic)", runout: "0.0005\"", price: "$50-80" },
            cat40_er40: { name: "CAT40 ER40 Collet Chuck (Generic)", runout: "0.0005\"", price: "$60-90" },
            cat40_em: { name: "CAT40 End Mill Holder (Generic)", runout: "0.0004\"", price: "$40-70" },
            cat40_shell: { name: "CAT40 Shell Mill Arbor (Generic)", price: "$45-75" },
            cat40_drill: { name: "CAT40 Drill Chuck (Generic)", capacity: "0-1/2\"", price: "$60-100" },
            bt40_er32: { name: "BT40 ER32 Collet Chuck (Generic)", runout: "0.0005\"", price: "$45-75" },
            cat50_er40: { name: "CAT50 ER40 Collet Chuck (Generic)", runout: "0.0004\"", price: "$80-120" }
        },
        // Generic Work Holding (Essentials & Standard tiers)
        workholding: {
            vise_4in: { name: "4\" Precision Vise (Generic)", jawWidth: 4, opening: 4, price: "$200-400" },
            vise_6in: { name: "6\" Precision Vise (Generic)", jawWidth: 6, opening: 6, price: "$350-600" },
            chuck_6in: { name: "6\" 3-Jaw Chuck (Generic)", gripping: "OD/ID", price: "$400-800" },
            chuck_8in: { name: "8\" 3-Jaw Chuck (Generic)", gripping: "OD/ID", price: "$600-1200" },
            collet_chuck: { name: "5C Collet Chuck (Generic)", range: "1/16-1-1/16", price: "$300-500" }
        },
        // Generic Tooling (Essentials tier)
        tooling: {
            endmill_2fl: { name: "2-Flute Carbide End Mill (Generic)", coating: "TiAlN", helix: 30 },
            endmill_3fl: { name: "3-Flute Carbide End Mill (Generic)", coating: "AlTiN", helix: 45 },
            endmill_4fl: { name: "4-Flute Carbide End Mill (Generic)", coating: "TiAlN", helix: 30 },
            drill_carbide: { name: "Carbide Drill (Generic)", coating: "TiAlN", point: 140 },
            drill_hss: { name: "HSS Drill (Generic)", coating: "None", point: 118 },
            facemill: { name: "Face Mill (Generic)", inserts: "APKT", teeth: 5 },
            turning_cnmg: { name: "CNMG Turning Insert (Generic)", grade: "General" },
            turning_wnmg: { name: "WNMG Turning Insert (Generic)", grade: "General" }
        }
    },
    // FEATURE FLAGS AND CHECKS
    featureChecks: {
        // Check if feature is available for given tier
        hasFeature: function(tierName, featurePath) {
            const tier = PRISM_SUBSCRIPTION_SYSTEM.tiers[tierName];
            if (!tier) return false;

            const parts = featurePath.split('.');
            let value = tier.features;
            for (const part of parts) {
                if (value && typeof value === 'object' && part in value) {
                    value = value[part];
                } else {
                    return false;
                }
            }
            return value === true || value === "full" || value === "unlimited";
        },
        // Get limit value for a tier
        getLimit: function(tierName, limitName) {
            const tier = PRISM_SUBSCRIPTION_SYSTEM.tiers[tierName];
            if (!tier) return 0;
            return tier.features[limitName] || 0;
        },
        // Check if tier can access module
        hasModule: function(tierName, moduleName, userModules) {
            const tier = PRISM_SUBSCRIPTION_SYSTEM.tiers[tierName];
            if (!tier) return false;

            if (tier.modules.included === "all") return true;

            // Check if module is in user's purchased/selected modules
            return userModules && userModules.includes(moduleName);
        },
        // Get upgrade message
        getUpgradeMessage: function(tierName, feature) {
            const tier = PRISM_SUBSCRIPTION_SYSTEM.tiers[tierName];
            if (!tier || !tier.upgradePrompts) return null;
            return tier.upgradePrompts[feature] || null;
        }
    },
    // SPEEDS & FEEDS MODE RESTRICTIONS
    speedsFeedsModes: {
        balanced_only: {
            available: ["balanced"],
            locked: ["conservative", "aggressive", "mrr_max"],
            message: "Speed/feed optimization locked to Balanced mode"
        },
        full: {
            available: ["conservative", "balanced", "aggressive", "mrr_max"],
            locked: [],
            message: null
        }
    },
    // MATERIAL DATABASE ACCESS LEVELS
    materialAccess: {
        limited: {
            count: 50,
            categories: ["aluminum", "mild_steel", "stainless_common", "plastics_common"],
            message: "50 common materials included"
        },
        tier2: {
            count: 200,
            categories: ["aluminum", "steel", "stainless", "copper", "plastics", "titanium_common"],
            message: "200 materials with heat-treat states"
        },
        full: {
            count: 500,
            categories: "all",
            message: "500+ materials including exotics"
        }
    }
};
// Make subscription system globally available
window.PRISM_SUBSCRIPTION_SYSTEM = PRISM_SUBSCRIPTION_SYSTEM;

// SUBSCRIPTION HELPER FUNCTIONS

/**
 * Get current user's subscription tier
 */
function getCurrentTier() {
    return localStorage.getItem('prism_subscription_tier') || 'tier1';
}
/**
 * Get current user's active modules
 */
function getUserModules() {
    const stored = localStorage.getItem('prism_user_modules');
    return stored ? JSON.parse(stored) : ['mill']; // Default to mill
}
/**
 * Get current user's purchased post processors
 */
function getUserPostProcessors() {
    const stored = localStorage.getItem('prism_user_posts');
    return stored ? JSON.parse(stored) : [];
}
/**
 * Check if feature is available
 */
function isFeatureAvailable(featurePath) {
    const tier = getCurrentTier();
    return PRISM_SUBSCRIPTION_SYSTEM.featureChecks.hasFeature(tier, featurePath);
}
/**
 * Check if module is available
 */
function isModuleAvailable(moduleName) {
    const tier = getCurrentTier();
    const userModules = getUserModules();
    return PRISM_SUBSCRIPTION_SYSTEM.featureChecks.hasModule(tier, moduleName, userModules);
}
/**
 * Get available speeds/feeds modes
 */
function getAvailableSpeedModes() {
    const tier = getCurrentTier();
    const tierData = PRISM_SUBSCRIPTION_SYSTEM.tiers[tier];
    if (!tierData) return ["balanced"];

    const modeConfig = tierData.features.speedsFeedsMode;
    return PRISM_SUBSCRIPTION_SYSTEM.speedsFeedsModes[modeConfig]?.available || ["balanced"];
}
/**
 * Show upgrade prompt
 */
function showUpgradePrompt(feature) {
    const tier = getCurrentTier();
    const message = PRISM_SUBSCRIPTION_SYSTEM.featureChecks.getUpgradeMessage(tier, feature);

    if (message) {
        // Show upgrade modal or notification
        showTierUpgradeModal(message, feature);
    }
}
/**
 * Calculate monthly price for configuration
 */
function calculateMonthlyPrice(tierName, additionalModules = 0, addOns = []) {
    const tier = PRISM_SUBSCRIPTION_SYSTEM.tiers[tierName];
    if (!tier) return 0;

    let total = tier.monthlyPrice;

    // Add module costs
    if (additionalModules > 0) {
        const modulePrice = PRISM_SUBSCRIPTION_SYSTEM.addOns.additionalModules[tierName] || 0;
        total += additionalModules * modulePrice;
    }
    // Add feature add-ons
    addOns.forEach(addOnId => {
        const addOn = PRISM_SUBSCRIPTION_SYSTEM.addOns.features[addOnId];
        if (addOn) {
            total += addOn.monthlyPrice;
        }
    });

    return total;
}
/**
 * Get generic machine for tier
 */
function getGenericMachine(moduleType, size = 'standard') {
    const machines = PRISM_SUBSCRIPTION_SYSTEM.genericData.machines[moduleType];
    if (!machines) return null;

    const key = `${size}_${moduleType}` in machines ? `${size}_${moduleType}` : Object.keys(machines)[0];
    return machines[key] || Object.values(machines)[0];
}
/**
 * Get generic holder for tier
 */
function getGenericHolder(type) {
    return PRISM_SUBSCRIPTION_SYSTEM.genericData.holders[type] || null;
}
/**
 * Get generic tooling for tier
 */
function getGenericTooling(type) {
    return PRISM_SUBSCRIPTION_SYSTEM.genericData.tooling[type] || null;
}
// Export subscription functions
window.getCurrentTier = getCurrentTier;
window.getUserModules = getUserModules;
window.getUserPostProcessors = getUserPostProcessors;
window.isFeatureAvailable = isFeatureAvailable;
window.isModuleAvailable = isModuleAvailable;
window.getAvailableSpeedModes = getAvailableSpeedModes;
window.showUpgradePrompt = showUpgradePrompt;
window.calculateMonthlyPrice = calculateMonthlyPrice;
window.getGenericMachine = getGenericMachine;
window.getGenericHolder = getGenericHolder;
window.getGenericTooling = getGenericTooling;

// Legacy compatibility - map old STARTER_TIER_DATABASE references
const STARTER_TIER_DATABASE = {
    VERSION: "2.0.0",
    TIER: "tier1",
    limits: PRISM_SUBSCRIPTION_SYSTEM.tiers.tier1.features,
    upgradeMessages: PRISM_SUBSCRIPTION_SYSTEM.tiers.tier1.upgradePrompts,
    mill: { machines: PRISM_SUBSCRIPTION_SYSTEM.genericData.machines.mill },
    lathe: { machines: PRISM_SUBSCRIPTION_SYSTEM.genericData.machines.lathe },
    sinkerEdm: { machines: PRISM_SUBSCRIPTION_SYSTEM.genericData.machines.edm },
    wireEdm: { machines: PRISM_SUBSCRIPTION_SYSTEM.genericData.machines.edm },
    laser: { machines: PRISM_SUBSCRIPTION_SYSTEM.genericData.machines.laser },
    waterjet: { machines: PRISM_SUBSCRIPTION_SYSTEM.genericData.machines.waterjet },
    materials: PRISM_SUBSCRIPTION_SYSTEM.materialAccess.limited
};
// Make starter database globally available
window.STARTER_TIER_DATABASE = STARTER_TIER_DATABASE;

// PRISM COST ANALYSIS & EFFICIENCY DATABASE
// Comprehensive cost modeling system integrating Activity-Based Costing (ABC),
// Total Cost of Ownership (TCO), and manufacturing economics principles.
// This serves as the backbone for the quoting system.

const PRISM_COST_DATABASE = {
    version: '1.0.0',
    lastUpdated: '2025-01-01',

    // SECTION 1: MACHINE COST FACTORS
    // Based on Total Cost of Ownership (TCO) principles
    machineCosts: {
        // Hourly machine rates by category (fully burdened)
        // Formula: (Depreciation + Interest + Maintenance + Utilities + Floor Space) / Annual Operating Hours
        hourlyRates: {
            // VMC - Vertical Machining Centers
            vmc: {
                entry: { // Entry-level (Haas Mini Mill, Tormach, etc.)
                    purchasePrice: { min: 35000, max: 75000, typical: 55000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.03, // 3% of purchase price
                    annualUtilities: 2400, // kWh cost
                    floorSpaceSqFt: 80,
                    floorSpaceCostPerSqFt: 15, // per month
                    annualOperatingHours: 2000,
                    hourlyRate: { min: 25, max: 45, typical: 35 },
                    setupMultiplier: 1.5 // Setup time costs 1.5x run time
                },
                tier2: { // Mid-range (Haas VF-2, DMG Mori M1, Mazak VCN)
                    purchasePrice: { min: 75000, max: 200000, typical: 125000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.025,
                    annualUtilities: 4800,
                    floorSpaceSqFt: 150,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 4000,
                    hourlyRate: { min: 45, max: 85, typical: 65 },
                    setupMultiplier: 1.5
                },
                production: { // Production-grade (Haas VF-4SS, Mazak Variaxis, DMG Mori NHX)
                    purchasePrice: { min: 200000, max: 500000, typical: 350000 },
                    depreciationYears: 12,
                    annualMaintenance: 0.02,
                    annualUtilities: 7200,
                    floorSpaceSqFt: 250,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 5000,
                    hourlyRate: { min: 75, max: 125, typical: 95 },
                    setupMultiplier: 1.25
                },
                highPerformance: { // High-speed/5-axis (Makino, Kern, GF Mikron)
                    purchasePrice: { min: 400000, max: 1500000, typical: 750000 },
                    depreciationYears: 15,
                    annualMaintenance: 0.02,
                    annualUtilities: 12000,
                    floorSpaceSqFt: 400,
                    floorSpaceCostPerSqFt: 18,
                    annualOperatingHours: 5500,
                    hourlyRate: { min: 125, max: 250, typical: 175 },
                    setupMultiplier: 1.25
                }
            },
            // HMC - Horizontal Machining Centers
            hmc: {
                tier2: {
                    purchasePrice: { min: 250000, max: 600000, typical: 400000 },
                    depreciationYears: 12,
                    annualMaintenance: 0.02,
                    annualUtilities: 9600,
                    floorSpaceSqFt: 350,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 5500,
                    hourlyRate: { min: 85, max: 150, typical: 115 },
                    setupMultiplier: 1.25
                },
                production: {
                    purchasePrice: { min: 500000, max: 1200000, typical: 800000 },
                    depreciationYears: 15,
                    annualMaintenance: 0.018,
                    annualUtilities: 14400,
                    floorSpaceSqFt: 500,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 6000,
                    hourlyRate: { min: 135, max: 225, typical: 175 },
                    setupMultiplier: 1.15
                }
            },
            // CNC Lathes
            lathe: {
                entry: { // 2-axis basic
                    purchasePrice: { min: 30000, max: 60000, typical: 45000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.025,
                    annualUtilities: 2000,
                    floorSpaceSqFt: 60,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 2000,
                    hourlyRate: { min: 25, max: 40, typical: 32 },
                    setupMultiplier: 1.5
                },
                tier2: { // Turning center with live tooling
                    purchasePrice: { min: 80000, max: 200000, typical: 140000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.025,
                    annualUtilities: 4200,
                    floorSpaceSqFt: 120,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 4000,
                    hourlyRate: { min: 45, max: 80, typical: 60 },
                    setupMultiplier: 1.35
                },
                multiAxis: { // Y-axis, sub-spindle, B-axis
                    purchasePrice: { min: 200000, max: 600000, typical: 380000 },
                    depreciationYears: 12,
                    annualMaintenance: 0.02,
                    annualUtilities: 7200,
                    floorSpaceSqFt: 180,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 5000,
                    hourlyRate: { min: 75, max: 135, typical: 100 },
                    setupMultiplier: 1.25
                },
                swiss: { // Swiss-type automatic
                    purchasePrice: { min: 150000, max: 450000, typical: 280000 },
                    depreciationYears: 12,
                    annualMaintenance: 0.025,
                    annualUtilities: 4800,
                    floorSpaceSqFt: 80,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 5500,
                    hourlyRate: { min: 65, max: 120, typical: 85 },
                    setupMultiplier: 1.75 // Higher setup complexity
                }
            },
            // EDM Machines
            edm: {
                sinker: {
                    entry: {
                        purchasePrice: { min: 50000, max: 120000, typical: 80000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.02,
                        annualUtilities: 3600,
                        floorSpaceSqFt: 80,
                        floorSpaceCostPerSqFt: 15,
                        annualOperatingHours: 3000,
                        hourlyRate: { min: 35, max: 60, typical: 45 },
                        setupMultiplier: 2.0 // Electrode setup intensive
                    },
                    tier2: {
                        purchasePrice: { min: 120000, max: 300000, typical: 200000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.02,
                        annualUtilities: 6000,
                        floorSpaceSqFt: 120,
                        floorSpaceCostPerSqFt: 15,
                        annualOperatingHours: 4500,
                        hourlyRate: { min: 55, max: 95, typical: 72 },
                        setupMultiplier: 1.75
                    }
                },
                wire: {
                    entry: {
                        purchasePrice: { min: 80000, max: 150000, typical: 110000 },
                        depreciationYears: 10,
                        annualMaintenance: 0.025,
                        annualUtilities: 3000,
                        floorSpaceSqFt: 80,
                        floorSpaceCostPerSqFt: 15,
                        annualOperatingHours: 4000,
                        hourlyRate: { min: 35, max: 55, typical: 45 },
                        setupMultiplier: 1.5
                    },
                    tier2: {
                        purchasePrice: { min: 150000, max: 350000, typical: 240000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.02,
                        annualUtilities: 4800,
                        floorSpaceSqFt: 100,
                        floorSpaceCostPerSqFt: 15,
                        annualOperatingHours: 5000,
                        hourlyRate: { min: 50, max: 85, typical: 65 },
                        setupMultiplier: 1.35
                    },
                    highPrecision: {
                        purchasePrice: { min: 300000, max: 700000, typical: 480000 },
                        depreciationYears: 15,
                        annualMaintenance: 0.018,
                        annualUtilities: 7200,
                        floorSpaceSqFt: 150,
                        floorSpaceCostPerSqFt: 18,
                        annualOperatingHours: 5500,
                        hourlyRate: { min: 85, max: 145, typical: 110 },
                        setupMultiplier: 1.25
                    }
                }
            },
            // Laser Cutting
            laser: {
                co2: {
                    entry: { // 2-4kW
                        purchasePrice: { min: 150000, max: 350000, typical: 250000 },
                        depreciationYears: 10,
                        annualMaintenance: 0.04, // Higher for CO2 (gas, mirrors, etc.)
                        annualUtilities: 18000,
                        floorSpaceSqFt: 400,
                        floorSpaceCostPerSqFt: 12,
                        annualOperatingHours: 4000,
                        hourlyRate: { min: 65, max: 110, typical: 85 },
                        setupMultiplier: 1.25
                    },
                    tier2: { // 4-6kW
                        purchasePrice: { min: 350000, max: 600000, typical: 450000 },
                        depreciationYears: 10,
                        annualMaintenance: 0.035,
                        annualUtilities: 24000,
                        floorSpaceSqFt: 600,
                        floorSpaceCostPerSqFt: 12,
                        annualOperatingHours: 5000,
                        hourlyRate: { min: 95, max: 150, typical: 120 },
                        setupMultiplier: 1.2
                    }
                },
                fiber: {
                    entry: { // 1-3kW
                        purchasePrice: { min: 100000, max: 250000, typical: 175000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.02, // Lower maintenance than CO2
                        annualUtilities: 8000,
                        floorSpaceSqFt: 350,
                        floorSpaceCostPerSqFt: 12,
                        annualOperatingHours: 4500,
                        hourlyRate: { min: 45, max: 80, typical: 60 },
                        setupMultiplier: 1.2
                    },
                    tier2: { // 4-8kW
                        purchasePrice: { min: 250000, max: 500000, typical: 375000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.02,
                        annualUtilities: 14000,
                        floorSpaceSqFt: 500,
                        floorSpaceCostPerSqFt: 12,
                        annualOperatingHours: 5500,
                        hourlyRate: { min: 70, max: 120, typical: 90 },
                        setupMultiplier: 1.15
                    },
                    highPower: { // 10-20kW+
                        purchasePrice: { min: 500000, max: 1200000, typical: 800000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.025,
                        annualUtilities: 28000,
                        floorSpaceSqFt: 800,
                        floorSpaceCostPerSqFt: 12,
                        annualOperatingHours: 6000,
                        hourlyRate: { min: 120, max: 200, typical: 155 },
                        setupMultiplier: 1.1
                    }
                }
            },
            // Waterjet
            waterjet: {
                entry: { // Small format, single head
                    purchasePrice: { min: 60000, max: 150000, typical: 100000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.05, // High maintenance (seals, nozzles)
                    annualUtilities: 6000,
                    floorSpaceSqFt: 200,
                    floorSpaceCostPerSqFt: 12,
                    annualOperatingHours: 3000,
                    hourlyRate: { min: 45, max: 75, typical: 58 },
                    setupMultiplier: 1.3
                },
                tier2: { // Mid-size, intensifier pump
                    purchasePrice: { min: 150000, max: 350000, typical: 240000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.04,
                    annualUtilities: 12000,
                    floorSpaceSqFt: 400,
                    floorSpaceCostPerSqFt: 12,
                    annualOperatingHours: 4500,
                    hourlyRate: { min: 65, max: 110, typical: 85 },
                    setupMultiplier: 1.2
                },
                production: { // Large format, multi-head
                    purchasePrice: { min: 350000, max: 800000, typical: 550000 },
                    depreciationYears: 12,
                    annualMaintenance: 0.035,
                    annualUtilities: 24000,
                    floorSpaceSqFt: 800,
                    floorSpaceCostPerSqFt: 12,
                    annualOperatingHours: 5500,
                    hourlyRate: { min: 95, max: 160, typical: 125 },
                    setupMultiplier: 1.15
                }
            }
        },
        // Overall Equipment Effectiveness (OEE) factors
        oeeFactors: {
            availability: { // % of scheduled time machine is available
                worldClass: 0.90,
                typical: 0.80,
                poor: 0.65,
                factors: ['breakdowns', 'setup', 'adjustments', 'toolChanges']
            },
            performance: { // % of theoretical max speed
                worldClass: 0.95,
                typical: 0.85,
                poor: 0.70,
                factors: ['reducedSpeed', 'minorStops', 'idling']
            },
            quality: { // % of good parts
                worldClass: 0.99,
                typical: 0.95,
                poor: 0.85,
                factors: ['defects', 'rework', 'scrap', 'startupRejects',
            { id: 'harvey_843_0015_0023_2fl', name: '0.015" 2FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-015', type: 'endmill_square', diameter: 0.015, flutes: 2, loc: 0.023, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 1666667, process: 'milling', geometry: { volume: 4, surfaceArea: 46, units: "mm3/mm2" } },
            { id: 'harvey_843_002_003_2fl', name: '0.020" 2FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-020', type: 'endmill_square', diameter: 0.02, flutes: 2, loc: 0.03, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 1250000, process: 'milling', geometry: { volume: 8, surfaceArea: 61, units: "mm3/mm2" } },
            { id: 'harvey_843_0031_0047_2fl', name: '1/32" 2FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-031', type: 'endmill_square', diameter: 0.031, flutes: 2, loc: 0.047, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 806452, process: 'milling', geometry: { volume: 18, surfaceArea: 95, units: "mm3/mm2" } },
            { id: 'harvey_843_0047_007_2fl', name: '3/64" 2FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-047', type: 'endmill_square', diameter: 0.047, flutes: 2, loc: 0.07, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 531915, process: 'milling', geometry: { volume: 42, surfaceArea: 145, units: "mm3/mm2" } },
            { id: 'harvey_843_0062_0093_4fl', name: '1/16" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-062', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.093, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 403226, process: 'milling', geometry: { volume: 73, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'harvey_843_0078_0117_4fl', name: '5/64" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-078', type: 'endmill_square', diameter: 0.078, flutes: 4, loc: 0.117, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 320513, process: 'milling', geometry: { volume: 115, surfaceArea: 243, units: "mm3/mm2" } },
            { id: 'harvey_843_0093_014_4fl', name: '3/32" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-093', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.14, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 268817, process: 'milling', geometry: { volume: 162, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'harvey_843_0109_0164_4fl', name: '7/64" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-109', type: 'endmill_square', diameter: 0.109, flutes: 4, loc: 0.164, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 229358, process: 'milling', geometry: { volume: 222, surfaceArea: 343, units: "mm3/mm2" } },
            { id: 'harvey_843_0125_025_4fl', name: '1/8" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.25, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'harvey_843_0125_05_4fl', name: '1/8" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'harvey_843_0125_075_4fl', name: '1/8" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 458, surfaceArea: 649, units: "mm3/mm2" } },
            { id: 'harvey_843_0156_0312_4fl', name: '5/32" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-156', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.312, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.156, maxRpm: 160256, process: 'milling', geometry: { volume: 597, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'harvey_843_0187_0375_4fl', name: '3/16" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.375, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'harvey_843_0187_0562_4fl', name: '3/16" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'harvey_843_0187_0937_4fl', name: '3/16" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.937, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 1224, surfaceArea: 1172, units: "mm3/mm2" } },
            { id: 'harvey_843_0218_0437_4fl', name: '7/32" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-218', type: 'endmill_square', diameter: 0.218, flutes: 4, loc: 0.437, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.218, maxRpm: 114679, process: 'milling', geometry: { volume: 1449, surfaceArea: 1153, units: "mm3/mm2" } },
            { id: 'harvey_843_025_0375_4fl', name: '1/4" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.375, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1518, surfaceArea: 1077, units: "mm3/mm2" } },
            { id: 'harvey_843_025_075_4fl', name: '1/4" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'harvey_843_025_125_4fl', name: '1/4" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 1.25, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 2112, surfaceArea: 1583, units: "mm3/mm2" } },
            { id: 'harvey_843_025_15_4fl', name: '1/4" XL 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 2856, surfaceArea: 2090, units: "mm3/mm2" } },
            { id: 'harvey_843_0312_05_4fl', name: '5/16" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.5, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 2944, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'harvey_843_0312_0937_4fl', name: '5/16" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'harvey_843_0312_15_4fl', name: '5/16" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 1.5, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 3821, surfaceArea: 2312, units: "mm3/mm2" } },
            { id: 'harvey_843_0375_05_4fl', name: '3/8" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.5, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4253, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_843_0375_1_4fl', name: '3/8" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 3982, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_843_0375_175_4fl', name: '3/8" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.75, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 6289, surfaceArea: 3183, units: "mm3/mm2" } },
            { id: 'harvey_843_0437_1125_4fl', name: '7/16" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-437', type: 'endmill_square', diameter: 0.437, flutes: 4, loc: 1.125, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.437, maxRpm: 57208, process: 'milling', geometry: { volume: 6544, surfaceArea: 2851, units: "mm3/mm2" } },
            { id: 'harvey_843_05_0625_4fl', name: '1/2" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 0.625, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 7441, surfaceArea: 2787, units: "mm3/mm2" } },
            { id: 'harvey_843_05_125_4fl', name: '1/2" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'harvey_843_05_2_4fl', name: '1/2" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 2, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 10940, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'harvey_843_05_3_4fl', name: '1/2" XL 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 3, oal: 5, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 13192, surfaceArea: 5320, units: "mm3/mm2" } },
            { id: 'harvey_843_0562_1375_4fl', name: '9/16" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-562', type: 'endmill_square', diameter: 0.562, flutes: 4, loc: 1.375, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.562, maxRpm: 44484, process: 'milling', geometry: { volume: 12551, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'harvey_843_0625_075_4fl', name: '5/8" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 0.75, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 40000, process: 'milling', geometry: { volume: 13951, surfaceArea: 4196, units: "mm3/mm2" } },
            { id: 'harvey_843_0625_15_4fl', name: '5/8" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.5, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 40000, process: 'milling', geometry: { volume: 15334, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'harvey_843_0625_25_4fl', name: '5/8" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 2.5, oal: 5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 40000, process: 'milling', geometry: { volume: 21367, surfaceArea: 6730, units: "mm3/mm2" } },
            { id: 'harvey_843_075_1_4fl', name: '3/4" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 33333, process: 'milling', geometry: { volume: 23167, surfaceArea: 5890, units: "mm3/mm2" } },
            { id: 'harvey_843_075_15_4fl', name: '3/4" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 33333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'harvey_843_075_3_4fl', name: '3/4" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 3, oal: 5.5, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 33333, process: 'milling', geometry: { volume: 33302, surfaceArea: 8931, units: "mm3/mm2" } },
            { id: 'harvey_843_0875_175_4fl', name: '7/8" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-875', type: 'endmill_square', diameter: 0.875, flutes: 4, loc: 1.75, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.875, maxRpm: 28571, process: 'milling', geometry: { volume: 34242, surfaceArea: 7870, units: "mm3/mm2" } },
            { id: 'harvey_843_1_125_4fl', name: '1" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 1.25, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 25000, process: 'milling', geometry: { volume: 46655, surfaceArea: 9121, units: "mm3/mm2" } },
            { id: 'harvey_843_1_2_4fl', name: '1" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 25000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'harvey_843_1_3_4fl', name: '1" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 3, oal: 6, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 25000, process: 'milling', geometry: { volume: 65639, surfaceArea: 13174, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0015_2fl', name: '0.015" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-015', type: 'endmill_ball', diameter: 0.015, flutes: 2, loc: 0.023, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 2000000, process: 'milling', geometry: { volume: 4, surfaceArea: 46, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0031_2fl', name: '1/32" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-031', type: 'endmill_ball', diameter: 0.031, flutes: 2, loc: 0.047, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 967742, process: 'milling', geometry: { volume: 18, surfaceArea: 95, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0047_2fl', name: '3/64" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-047', type: 'endmill_ball', diameter: 0.047, flutes: 2, loc: 0.07, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 638298, process: 'milling', geometry: { volume: 42, surfaceArea: 145, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0062_2fl', name: '1/16" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-062', type: 'endmill_ball', diameter: 0.062, flutes: 2, loc: 0.093, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 73, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0093_2fl', name: '3/32" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-093', type: 'endmill_ball', diameter: 0.093, flutes: 2, loc: 0.187, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 161, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0125_2fl', name: '1/8" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-125', type: 'endmill_ball', diameter: 0.125, flutes: 2, loc: 0.25, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0187_2fl', name: '3/16" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-187', type: 'endmill_ball', diameter: 0.187, flutes: 2, loc: 0.375, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_025_2fl', name: '1/4" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-250', type: 'endmill_ball', diameter: 0.25, flutes: 2, loc: 0.5, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0312_2fl', name: '5/16" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-312', type: 'endmill_ball', diameter: 0.312, flutes: 2, loc: 0.625, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2897, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0375_2fl', name: '3/8" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-375', type: 'endmill_ball', diameter: 0.375, flutes: 2, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_05_2fl', name: '1/2" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-500', type: 'endmill_ball', diameter: 0.5, flutes: 2, loc: 1, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0625_2fl', name: '5/8" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-625', type: 'endmill_ball', diameter: 0.625, flutes: 2, loc: 1.25, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_075_2fl', name: '3/4" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-750', type: 'endmill_ball', diameter: 0.75, flutes: 2, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_1_2fl', name: '1" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-1000', type: 'endmill_ball', diameter: 1, flutes: 2, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'harvey_cr_0125_0005_4fl', name: '1/8" × 0.005R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-125-CR5', type: 'endmill_corner_radius', diameter: 0.125, flutes: 4, loc: 0.25, oal: 1.5, cornerRadius: 0.005, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'harvey_cr_0125_001_4fl', name: '1/8" × 0.010R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-125-CR10', type: 'endmill_corner_radius', diameter: 0.125, flutes: 4, loc: 0.25, oal: 1.5, cornerRadius: 0.01, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'harvey_cr_0187_001_4fl', name: '3/16" × 0.010R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-187-CR10', type: 'endmill_corner_radius', diameter: 0.187, flutes: 4, loc: 0.375, oal: 2, cornerRadius: 0.01, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'harvey_cr_0187_0015_4fl', name: '3/16" × 0.015R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-187-CR15', type: 'endmill_corner_radius', diameter: 0.187, flutes: 4, loc: 0.375, oal: 2, cornerRadius: 0.015, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'harvey_cr_025_001_4fl', name: '1/4" × 0.010R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-250-CR10', type: 'endmill_corner_radius', diameter: 0.25, flutes: 4, loc: 0.5, oal: 2.5, cornerRadius: 0.01, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'harvey_cr_025_0015_4fl', name: '1/4" × 0.015R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-250-CR15', type: 'endmill_corner_radius', diameter: 0.25, flutes: 4, loc: 0.5, oal: 2.5, cornerRadius: 0.015, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'harvey_cr_025_0031_4fl', name: '1/4" × 0.031R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-250-CR31', type: 'endmill_corner_radius', diameter: 0.25, flutes: 4, loc: 0.5, oal: 2.5, cornerRadius: 0.031, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'harvey_cr_0312_0015_4fl', name: '5/16" × 0.015R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-312-CR15', type: 'endmill_corner_radius', diameter: 0.312, flutes: 4, loc: 0.625, oal: 2.5, cornerRadius: 0.015, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 2897, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'harvey_cr_0312_0031_4fl', name: '5/16" × 0.031R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-312-CR31', type: 'endmill_corner_radius', diameter: 0.312, flutes: 4, loc: 0.625, oal: 2.5, cornerRadius: 0.031, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 2897, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'harvey_cr_0375_0015_4fl', name: '3/8" × 0.015R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-375-CR15', type: 'endmill_corner_radius', diameter: 0.375, flutes: 4, loc: 0.75, oal: 2.5, cornerRadius: 0.015, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_cr_0375_0031_4fl', name: '3/8" × 0.031R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-375-CR31', type: 'endmill_corner_radius', diameter: 0.375, flutes: 4, loc: 0.75, oal: 2.5, cornerRadius: 0.031, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_cr_0375_0062_4fl', name: '3/8" × 0.062R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-375-CR62', type: 'endmill_corner_radius', diameter: 0.375, flutes: 4, loc: 0.75, oal: 2.5, cornerRadius: 0.062, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_cr_05_0015_4fl', name: '1/2" × 0.015R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-500-CR15', type: 'endmill_corner_radius', diameter: 0.5, flutes: 4, loc: 1, oal: 3, cornerRadius: 0.015, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'harvey_cr_05_0031_4fl', name: '1/2" × 0.031R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-500-CR31', type: 'endmill_corner_radius', diameter: 0.5, flutes: 4, loc: 1, oal: 3, cornerRadius: 0.031, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'harvey_cr_05_0062_4fl', name: '1/2" × 0.062R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-500-CR62', type: 'endmill_corner_radius', diameter: 0.5, flutes: 4, loc: 1, oal: 3, cornerRadius: 0.062, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'harvey_cr_05_0125_4fl', name: '1/2" × 0.125R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-500-CR125', type: 'endmill_corner_radius', diameter: 0.5, flutes: 4, loc: 1, oal: 3, cornerRadius: 0.125, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'helical_h35al_0125_3fl', name: '2/16" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30125', type: 'endmill_square', diameter: 0.125, flutes: 3, loc: 0.375, oal: 2, coating: 'ZrN', material: 'carbide', shank: 0.125, maxRpm: 320000, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'helical_h35al_0187_3fl', name: '3/16" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30187', type: 'endmill_square', diameter: 0.187, flutes: 3, loc: 0.562, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.187, maxRpm: 213904, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'helical_h35al_025_3fl', name: '1/4" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30250', type: 'endmill_square', diameter: 0.25, flutes: 3, loc: 0.75, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.25, maxRpm: 160000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_h35al_0312_3fl', name: '1/4" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30312', type: 'endmill_square', diameter: 0.312, flutes: 3, loc: 0.937, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.312, maxRpm: 128205, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'helical_h35al_0375_3fl', name: '2/4" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30375', type: 'endmill_square', diameter: 0.375, flutes: 3, loc: 1.125, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.375, maxRpm: 106667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'helical_h35al_05_3fl', name: '4/8" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30500', type: 'endmill_square', diameter: 0.5, flutes: 3, loc: 1.25, oal: 3, coating: 'ZrN', material: 'carbide', shank: 0.5, maxRpm: 80000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'helical_h35al_0625_3fl', name: '5/8" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30625', type: 'endmill_square', diameter: 0.625, flutes: 3, loc: 1.562, oal: 3.5, coating: 'ZrN', material: 'carbide', shank: 0.625, maxRpm: 64000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'helical_h35al_075_3fl', name: '6/8" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30750', type: 'endmill_square', diameter: 0.75, flutes: 3, loc: 1.5, oal: 4, coating: 'ZrN', material: 'carbide', shank: 0.75, maxRpm: 53333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'helical_h35al_1_3fl', name: '1" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-301000', type: 'endmill_square', diameter: 1, flutes: 3, loc: 2, oal: 4.5, coating: 'ZrN', material: 'carbide', shank: 1, maxRpm: 40000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'helical_h40s_0062_0187_4fl', name: '0.062" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40062-19', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 403226, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'helical_h40s_0093_0281_4fl', name: '0.093" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40093-28', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 268817, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'helical_h40s_0125_0375_4fl', name: '0.125" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40125-38', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'helical_h40s_0156_0468_4fl', name: '0.156" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40156-47', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.468, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.156, maxRpm: 160256, process: 'milling', geometry: { volume: 582, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'helical_h40s_0187_0562_4fl', name: '0.187" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40187-56', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'helical_h40s_025_0625_4fl', name: '0.25" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40250-63', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.625, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1860, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_h40s_025_075_4fl', name: '0.25" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40250-75', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_h40s_025_1_4fl', name: '0.25" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40250-100', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 1, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 2172, surfaceArea: 1583, units: "mm3/mm2" } },
            { id: 'helical_h40s_0312_0781_4fl', name: '0.312" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40312-78', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.781, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 2839, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'helical_h40s_0312_125_4fl', name: '0.312" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40312-125', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 1.25, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 3915, surfaceArea: 2312, units: "mm3/mm2" } },
            { id: 'helical_h40s_0375_0875_4fl', name: '0.375" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40375-88', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4050, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'helical_h40s_0375_15_4fl', name: '0.375" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40375-150', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 6425, surfaceArea: 3183, units: "mm3/mm2" } },
            { id: 'helical_h40s_05_1_4fl', name: '0.5" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40500-100', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'helical_h40s_05_15_4fl', name: '0.5" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40500-150', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.5, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 9814, surfaceArea: 3800, units: "mm3/mm2" } },
            { id: 'helical_h40s_05_2_4fl', name: '0.5" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40500-200', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 12549, surfaceArea: 4814, units: "mm3/mm2" } },
            { id: 'helical_h40s_0625_125_4fl', name: '0.625" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40625-125', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 40000, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'helical_h40s_0625_2_4fl', name: '0.625" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40625-200', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 40000, process: 'milling', geometry: { volume: 19607, surfaceArea: 6096, units: "mm3/mm2" } },
            { id: 'helical_h40s_075_15_4fl', name: '0.75" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40750-150', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 33333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'helical_h40s_075_225_4fl', name: '0.75" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40750-225', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 2.25, oal: 5, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 33333, process: 'milling', geometry: { volume: 31311, surfaceArea: 8171, units: "mm3/mm2" } },
            { id: 'helical_h40s_1_2_4fl', name: '1" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-401000-200', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 25000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'helical_h40s_1_3_4fl', name: '1" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-401000-300', type: 'endmill_square', diameter: 1, flutes: 4, loc: 3, oal: 6, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 25000, process: 'milling', geometry: { volume: 65639, surfaceArea: 13174, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0062_0187_4fl', name: '0.062" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-062', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'nACo', material: 'carbide', shank: 0.125, maxRpm: 322581, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0093_0281_4fl', name: '0.093" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-093', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'nACo', material: 'carbide', shank: 0.125, maxRpm: 215054, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0125_0375_4fl', name: '0.125" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2, coating: 'nACo', material: 'carbide', shank: 0.125, maxRpm: 160000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0156_0468_4fl', name: '0.156" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-156', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.468, oal: 2, coating: 'nACo', material: 'carbide', shank: 0.156, maxRpm: 128205, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 582, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0187_0562_4fl', name: '0.187" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.187, maxRpm: 106952, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'helical_h45hv_025_0625_4fl', name: '0.25" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.625, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.25, maxRpm: 80000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 1860, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_h45hv_025_075_4fl', name: '0.25" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.25, maxRpm: 80000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_h45hv_025_1_4fl', name: '0.25" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 1, oal: 3, coating: 'nACo', material: 'carbide', shank: 0.25, maxRpm: 80000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 2172, surfaceArea: 1583, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0312_0781_4fl', name: '0.312" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.781, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.312, maxRpm: 64103, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 2839, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0312_125_4fl', name: '0.312" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 1.25, oal: 3.5, coating: 'nACo', material: 'carbide', shank: 0.312, maxRpm: 64103, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 3915, surfaceArea: 2312, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0375_0875_4fl', name: '0.375" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.375, maxRpm: 53333, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 4050, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0375_15_4fl', name: '0.375" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.5, oal: 4, coating: 'nACo', material: 'carbide', shank: 0.375, maxRpm: 53333, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 6425, surfaceArea: 3183, units: "mm3/mm2" } },
            { id: 'helical_h45hv_05_1_4fl', name: '0.5" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1, oal: 3, coating: 'nACo', material: 'carbide', shank: 0.5, maxRpm: 40000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'helical_h45hv_05_15_4fl', name: '0.5" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.5, oal: 3.5, coating: 'nACo', material: 'carbide', shank: 0.5, maxRpm: 40000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 9814, surfaceArea: 3800, units: "mm3/mm2" } },
            { id: 'helical_h45hv_05_2_4fl', name: '0.5" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 2, oal: 4.5, coating: 'nACo', material: 'carbide', shank: 0.5, maxRpm: 40000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 12549, surfaceArea: 4814, units: "mm3/mm2" } },
            { id: 'ken_harvite_0125_4fl', name: '1/8" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E013A4W', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2, coating: 'KC633M', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'ken_harvite_0156_4fl', name: '5/32" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E016A4W', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.468, oal: 2, coating: 'KC633M', material: 'carbide', shank: 0.156, maxRpm: 179487, process: 'milling', geometry: { volume: 582, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'ken_harvite_0187_4fl', name: '3/16" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E019A4W', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'KC633M', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'ken_harvite_025_4fl', name: '1/4" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E025A4W', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'KC633M', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'ken_harvite_0312_4fl', name: '5/16" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E031A4W', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'KC633M', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'ken_harvite_0375_4fl', name: '3/8" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E038A4W', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'KC633M', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'ken_harvite_05_4fl', name: '1/2" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E050A4W', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'KC633M', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'ken_harvite_0625_4fl', name: '5/8" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E063A4W', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'KC633M', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'ken_harvite_075_4fl', name: '3/4" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E075A4W', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'KC633M', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'ken_harvite_1_4fl', name: '1" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E100A4W', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'KC633M', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'ken_harvii_0125_4fl', name: '1/8" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2013A4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2, coating: 'KC643M', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 240000, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'ken_harvii_0156_4fl', name: '5/32" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2016A4', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.468, oal: 2, coating: 'KC643M', material: 'carbide', shank: 0.156, variableHelix: true, maxRpm: 192308, process: 'milling', geometry: { volume: 582, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'ken_harvii_0187_4fl', name: '3/16" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2019A4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'KC643M', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'ken_harvii_025_4fl', name: '1/4" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2025A4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'KC643M', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'ken_harvii_0312_4fl', name: '5/16" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2031A4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'KC643M', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'ken_harvii_0375_4fl', name: '3/8" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2038A4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'KC643M', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'ken_harvii_05_4fl', name: '1/2" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2050A4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'KC643M', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'ken_harvii_0625_4fl', name: '5/8" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2063A4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'KC643M', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'ken_harvii_075_4fl', name: '3/4" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2075A4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'KC643M', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'ken_harvii_1_4fl', name: '1" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2100A4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'KC643M', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'ken_harviii_0125_5fl', name: '1/8" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3013A5', type: 'endmill_square', diameter: 0.125, flutes: 5, loc: 0.375, oal: 2, coating: 'KCPM40', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 176000, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'ken_harviii_0156_5fl', name: '5/32" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3016A5', type: 'endmill_square', diameter: 0.156, flutes: 5, loc: 0.468, oal: 2, coating: 'KCPM40', material: 'carbide', shank: 0.156, variableHelix: true, maxRpm: 141026, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 582, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'ken_harviii_0187_5fl', name: '3/16" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3019A5', type: 'endmill_square', diameter: 0.187, flutes: 5, loc: 0.562, oal: 2.5, coating: 'KCPM40', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 117647, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'ken_harviii_025_5fl', name: '1/4" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3025A5', type: 'endmill_square', diameter: 0.25, flutes: 5, loc: 0.75, oal: 2.5, coating: 'KCPM40', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 88000, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'ken_harviii_0312_5fl', name: '5/16" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3031A5', type: 'endmill_square', diameter: 0.312, flutes: 5, loc: 0.937, oal: 2.5, coating: 'KCPM40', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 70513, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'ken_harviii_0375_5fl', name: '3/8" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3038A5', type: 'endmill_square', diameter: 0.375, flutes: 5, loc: 1.125, oal: 2.5, coating: 'KCPM40', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 58667, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'ken_harviii_05_5fl', name: '1/2" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3050A5', type: 'endmill_square', diameter: 0.5, flutes: 5, loc: 1.25, oal: 3, coating: 'KCPM40', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 44000, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'ken_harviii_0625_5fl', name: '5/8" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3063A5', type: 'endmill_square', diameter: 0.625, flutes: 5, loc: 1.562, oal: 3.5, coating: 'KCPM40', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 35200, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'ken_harviii_075_5fl', name: '3/4" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3075A5', type: 'endmill_square', diameter: 0.75, flutes: 5, loc: 1.5, oal: 4, coating: 'KCPM40', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 29333, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'ken_harviii_1_5fl', name: '1" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3100A5', type: 'endmill_square', diameter: 1, flutes: 5, loc: 2, oal: 4.5, coating: 'KCPM40', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 22000, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'osg_asft_0062_4fl', name: '0.062" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'WXL', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'osg_asft_0093_4fl', name: '0.093" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'WXL', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'osg_asft_0125_4fl', name: '0.125" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'WXL', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'osg_asft_0187_4fl', name: '0.187" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'WXL', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'osg_asft_025_4fl', name: '0.25" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'WXL', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'osg_asft_0312_4fl', name: '0.312" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'WXL', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'osg_asft_0375_4fl', name: '0.375" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'WXL', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'osg_asft_05_4fl', name: '0.5" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'WXL', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'osg_asft_0625_4fl', name: '0.625" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'WXL', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'osg_asft_075_4fl', name: '0.75" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'WXL', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'osg_asft_1_4fl', name: '1" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'WXL', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'osg_aero_0062_3fl', name: '0.062" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-62', type: 'endmill_square', diameter: 0.062, flutes: 3, loc: 0.187, oal: 1.5, coating: 'DLC', material: 'carbide', shank: 0.125, polished: true, maxRpm: 725806, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'osg_aero_0093_3fl', name: '0.093" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-93', type: 'endmill_square', diameter: 0.093, flutes: 3, loc: 0.281, oal: 1.5, coating: 'DLC', material: 'carbide', shank: 0.125, polished: true, maxRpm: 483871, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'osg_aero_0125_3fl', name: '0.125" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-125', type: 'endmill_square', diameter: 0.125, flutes: 3, loc: 0.5, oal: 2, coating: 'DLC', material: 'carbide', shank: 0.125, polished: true, maxRpm: 360000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'osg_aero_0187_3fl', name: '0.187" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-187', type: 'endmill_square', diameter: 0.187, flutes: 3, loc: 0.562, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.187, polished: true, maxRpm: 240642, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'osg_aero_025_3fl', name: '0.25" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-250', type: 'endmill_square', diameter: 0.25, flutes: 3, loc: 0.75, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.25, polished: true, maxRpm: 180000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'osg_aero_0312_3fl', name: '0.312" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-312', type: 'endmill_square', diameter: 0.312, flutes: 3, loc: 0.937, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.312, polished: true, maxRpm: 144231, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'osg_aero_0375_3fl', name: '0.375" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-375', type: 'endmill_square', diameter: 0.375, flutes: 3, loc: 1.125, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.375, polished: true, maxRpm: 120000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'osg_aero_05_3fl', name: '0.5" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-500', type: 'endmill_square', diameter: 0.5, flutes: 3, loc: 1.25, oal: 3, coating: 'DLC', material: 'carbide', shank: 0.5, polished: true, maxRpm: 90000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'osg_aero_0625_3fl', name: '0.625" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-625', type: 'endmill_square', diameter: 0.625, flutes: 3, loc: 1.562, oal: 3.5, coating: 'DLC', material: 'carbide', shank: 0.625, polished: true, maxRpm: 72000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'osg_aero_075_3fl', name: '0.75" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-750', type: 'endmill_square', diameter: 0.75, flutes: 3, loc: 1.5, oal: 4, coating: 'DLC', material: 'carbide', shank: 0.75, polished: true, maxRpm: 60000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'osg_aero_1_3fl', name: '1" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-1000', type: 'endmill_square', diameter: 1, flutes: 3, loc: 2, oal: 4.5, coating: 'DLC', material: 'carbide', shank: 1, polished: true, maxRpm: 45000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0062_4fl', name: '0.062" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'WXS', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 516129, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0093_4fl', name: '0.093" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'WXS', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 344086, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0125_4fl', name: '0.125" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'WXS', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 256000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0187_4fl', name: '0.187" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'WXS', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 171123, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_025_4fl', name: '0.25" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'WXS', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 128000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0312_4fl', name: '0.312" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'WXS', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 102564, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0375_4fl', name: '0.375" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'WXS', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 85333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_05_4fl', name: '0.5" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'WXS', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 64000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0625_4fl', name: '0.625" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'WXS', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 51200, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_075_4fl', name: '0.75" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'WXS', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 42667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_1_4fl', name: '1" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'WXS', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 32000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0062_4fl', name: '0.062" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 419355, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0093_4fl', name: '0.093" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 279570, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0125_4fl', name: '0.125" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 208000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0187_4fl', name: '0.187" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'yg1_x5070_025_4fl', name: '0.25" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0312_4fl', name: '0.312" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0375_4fl', name: '0.375" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'yg1_x5070_05_4fl', name: '0.5" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0625_4fl', name: '0.625" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'yg1_x5070_075_4fl', name: '0.75" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'yg1_x5070_1_4fl', name: '1" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0062_4fl', name: '0.062" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0093_4fl', name: '0.093" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0125_4fl', name: '0.125" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'Ti-Namite X', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0187_4fl', name: '0.187" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_025_4fl', name: '0.25" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0312_4fl', name: '0.312" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0375_4fl', name: '0.375" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_05_4fl', name: '0.5" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'Ti-Namite X', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0625_4fl', name: '0.625" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_075_4fl', name: '0.75" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Ti-Namite X', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_1_4fl', name: '1" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Ti-Namite X', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0062_4fl', name: '0.062" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'M Plus', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0093_4fl', name: '0.093" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'M Plus', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0125_4fl', name: '0.125" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'M Plus', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0187_4fl', name: '0.187" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'M Plus', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'imco_prfplus_025_4fl', name: '0.25" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'M Plus', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0312_4fl', name: '0.312" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'M Plus', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0375_4fl', name: '0.375" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'M Plus', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'imco_prfplus_05_4fl', name: '0.5" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'M Plus', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0625_4fl', name: '0.625" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'M Plus', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'imco_prfplus_075_4fl', name: '0.75" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'M Plus', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'imco_prfplus_1_4fl', name: '1" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'M Plus', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0062_4fl', name: '0.062" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0093_4fl', name: '0.093" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0125_4fl', name: '0.125" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0187_4fl', name: '0.187" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_025_4fl', name: '0.25" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0312_4fl', name: '0.312" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0375_4fl', name: '0.375" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_05_4fl', name: '0.5" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0625_4fl', name: '0.625" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_075_4fl', name: '0.75" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_1_4fl', name: '1" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0062_4fl', name: '0.062" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.125, targetMaterial: 'Stainless Steel', maxRpm: 387097, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0093_4fl', name: '0.093" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.125, targetMaterial: 'Stainless Steel', maxRpm: 258065, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0125_4fl', name: '0.125" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.125, targetMaterial: 'Stainless Steel', maxRpm: 192000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0187_4fl', name: '0.187" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.187, targetMaterial: 'Stainless Steel', maxRpm: 128342, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'sgs_scarb_025_4fl', name: '0.25" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.25, targetMaterial: 'Stainless Steel', maxRpm: 96000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0312_4fl', name: '0.312" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.312, targetMaterial: 'Stainless Steel', maxRpm: 76923, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0375_4fl', name: '0.375" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.375, targetMaterial: 'Stainless Steel', maxRpm: 64000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'sgs_scarb_05_4fl', name: '0.5" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.5, targetMaterial: 'Stainless Steel', maxRpm: 48000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0625_4fl', name: '0.625" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.625, targetMaterial: 'Stainless Steel', maxRpm: 38400, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sgs_scarb_075_4fl', name: '0.75" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.75, targetMaterial: 'Stainless Steel', maxRpm: 32000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sgs_scarb_1_4fl', name: '1" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 1, targetMaterial: 'Stainless Steel', maxRpm: 24000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'widia_varimill_0062_4fl', name: '0.062" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'WS15PE', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'widia_varimill_0093_4fl', name: '0.093" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'WS15PE', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'widia_varimill_0125_4fl', name: '0.125" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'WS15PE', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'widia_varimill_0187_4fl', name: '0.187" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'WS15PE', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'widia_varimill_025_4fl', name: '0.25" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'WS15PE', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'widia_varimill_0312_4fl', name: '0.312" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'WS15PE', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'widia_varimill_0375_4fl', name: '0.375" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'WS15PE', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'widia_varimill_05_4fl', name: '0.5" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'WS15PE', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'widia_varimill_0625_4fl', name: '0.625" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'WS15PE', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'widia_varimill_075_4fl', name: '0.75" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'WS15PE', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'widia_varimill_1_4fl', name: '1" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'WS15PE', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0062_4fl', name: '0.062" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'WU25PR', material: 'carbide', shank: 0.125, variableHelix: true, eccentric: true, maxRpm: 516129, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0093_4fl', name: '0.093" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'WU25PR', material: 'carbide', shank: 0.125, variableHelix: true, eccentric: true, maxRpm: 344086, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0125_4fl', name: '0.125" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'WU25PR', material: 'carbide', shank: 0.125, variableHelix: true, eccentric: true, maxRpm: 256000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0187_4fl', name: '0.187" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'WU25PR', material: 'carbide', shank: 0.187, variableHelix: true, eccentric: true, maxRpm: 171123, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'widia_varimill2_025_4fl', name: '0.25" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'WU25PR', material: 'carbide', shank: 0.25, variableHelix: true, eccentric: true, maxRpm: 128000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0312_4fl', name: '0.312" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'WU25PR', material: 'carbide', shank: 0.312, variableHelix: true, eccentric: true, maxRpm: 102564, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0375_4fl', name: '0.375" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'WU25PR', material: 'carbide', shank: 0.375, variableHelix: true, eccentric: true, maxRpm: 85333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'widia_varimill2_05_4fl', name: '0.5" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'WU25PR', material: 'carbide', shank: 0.5, variableHelix: true, eccentric: true, maxRpm: 64000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0625_4fl', name: '0.625" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'WU25PR', material: 'carbide', shank: 0.625, variableHelix: true, eccentric: true, maxRpm: 51200, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'widia_varimill2_075_4fl', name: '0.75" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'WU25PR', material: 'carbide', shank: 0.75, variableHelix: true, eccentric: true, maxRpm: 42667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'widia_varimill2_1_4fl', name: '1" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'WU25PR', material: 'carbide', shank: 1, variableHelix: true, eccentric: true, maxRpm: 32000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0062_4fl', name: '0.062" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'Gold TiN', material: 'carbide', shank: 0.125, maxRpm: 419355, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0093_4fl', name: '0.093" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'Gold TiN', material: 'carbide', shank: 0.125, maxRpm: 279570, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0125_4fl', name: '0.125" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'Gold TiN', material: 'carbide', shank: 0.125, maxRpm: 208000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0187_4fl', name: '0.187" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'Gold TiN', material: 'carbide', shank: 0.187, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_025_4fl', name: '0.25" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Gold TiN', material: 'carbide', shank: 0.25, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0312_4fl', name: '0.312" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'Gold TiN', material: 'carbide', shank: 0.312, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0375_4fl', name: '0.375" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'Gold TiN', material: 'carbide', shank: 0.375, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_05_4fl', name: '0.5" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'Gold TiN', material: 'carbide', shank: 0.5, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0625_4fl', name: '0.625" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'Gold TiN', material: 'carbide', shank: 0.625, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_075_4fl', name: '0.75" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Gold TiN', material: 'carbide', shank: 0.75, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_1_4fl', name: '1" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Gold TiN', material: 'carbide', shank: 1, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0062_5fl', name: '0.062" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-62', type: 'endmill_square', diameter: 0.062, flutes: 5, loc: 0.187, oal: 1.5, coating: 'IN2005', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0093_5fl', name: '0.093" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-93', type: 'endmill_square', diameter: 0.093, flutes: 5, loc: 0.281, oal: 1.5, coating: 'IN2005', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0125_5fl', name: '0.125" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-125', type: 'endmill_square', diameter: 0.125, flutes: 5, loc: 0.5, oal: 2, coating: 'IN2005', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0187_5fl', name: '0.187" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-187', type: 'endmill_square', diameter: 0.187, flutes: 5, loc: 0.562, oal: 2.5, coating: 'IN2005', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_025_5fl', name: '0.25" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-250', type: 'endmill_square', diameter: 0.25, flutes: 5, loc: 0.75, oal: 2.5, coating: 'IN2005', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0312_5fl', name: '0.312" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-312', type: 'endmill_square', diameter: 0.312, flutes: 5, loc: 0.937, oal: 2.5, coating: 'IN2005', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0375_5fl', name: '0.375" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-375', type: 'endmill_square', diameter: 0.375, flutes: 5, loc: 1.125, oal: 2.5, coating: 'IN2005', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_05_5fl', name: '0.5" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-500', type: 'endmill_square', diameter: 0.5, flutes: 5, loc: 1.25, oal: 3, coating: 'IN2005', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0625_5fl', name: '0.625" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-625', type: 'endmill_square', diameter: 0.625, flutes: 5, loc: 1.562, oal: 3.5, coating: 'IN2005', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_075_5fl', name: '0.75" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-750', type: 'endmill_square', diameter: 0.75, flutes: 5, loc: 1.5, oal: 4, coating: 'IN2005', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_1_5fl', name: '1" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-1000', type: 'endmill_square', diameter: 1, flutes: 5, loc: 2, oal: 4.5, coating: 'IN2005', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0062_4fl', name: '0.062" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0062L-4L', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'IC900', material: 'carbide', shank: 0.125, maxRpm: 419355, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0093_4fl', name: '0.093" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0093L-4L', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'IC900', material: 'carbide', shank: 0.125, maxRpm: 279570, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0125_4fl', name: '0.125" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0125L-4L', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'IC900', material: 'carbide', shank: 0.125, maxRpm: 208000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0187_4fl', name: '0.187" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0187L-4L', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.187, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_025_4fl', name: '0.25" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0250L-4L', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.25, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0312_4fl', name: '0.312" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0312L-4L', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.312, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0375_4fl', name: '0.375" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0375L-4L', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.375, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_05_4fl', name: '0.5" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0500L-4L', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'IC900', material: 'carbide', shank: 0.5, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0625_4fl', name: '0.625" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0625L-4L', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'IC900', material: 'carbide', shank: 0.625, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_075_4fl', name: '0.75" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0750L-4L', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'IC900', material: 'carbide', shank: 0.75, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_1_4fl', name: '1" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC1000L-4L', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'IC900', material: 'carbide', shank: 1, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'iscar_finishred_0187_4fl', name: '0.187" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0187-4', type: 'endmill_roughing', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.187, chipbreaker: 'Fine', maxRpm: 117647, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'iscar_finishred_025_4fl', name: '0.25" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0250-4', type: 'endmill_roughing', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.25, chipbreaker: 'Fine', maxRpm: 88000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'iscar_finishred_0312_4fl', name: '0.312" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0312-4', type: 'endmill_roughing', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.312, chipbreaker: 'Fine', maxRpm: 70513, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'iscar_finishred_0375_4fl', name: '0.375" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0375-4', type: 'endmill_roughing', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.375, chipbreaker: 'Fine', maxRpm: 58667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'iscar_finishred_05_4fl', name: '0.5" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0500-4', type: 'endmill_roughing', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'IC900', material: 'carbide', shank: 0.5, chipbreaker: 'Fine', maxRpm: 44000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'iscar_finishred_0625_4fl', name: '0.625" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0625-4', type: 'endmill_roughing', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'IC900', material: 'carbide', shank: 0.625, chipbreaker: 'Fine', maxRpm: 35200, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'iscar_finishred_075_4fl', name: '0.75" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0750-4', type: 'endmill_roughing', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'IC900', material: 'carbide', shank: 0.75, chipbreaker: 'Fine', maxRpm: 29333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'iscar_finishred_1_4fl', name: '1" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR1000-4', type: 'endmill_roughing', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'IC900', material: 'carbide', shank: 1, chipbreaker: 'Fine', maxRpm: 22000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0062_4fl', name: '0.062" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'IC903', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0093_4fl', name: '0.093" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'IC903', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0125_4fl', name: '0.125" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'IC903', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0187_4fl', name: '0.187" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'IC903', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_025_4fl', name: '0.25" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'IC903', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0312_4fl', name: '0.312" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'IC903', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0375_4fl', name: '0.375" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'IC903', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_05_4fl', name: '0.5" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'IC903', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0625_4fl', name: '0.625" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'IC903', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_075_4fl', name: '0.75" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'IC903', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_1_4fl', name: '1" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'IC903', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0062_4fl', name: '0.062" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0006-NA', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'GC1630', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0093_4fl', name: '0.093" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0009-NA', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'GC1630', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0125_4fl', name: '0.125" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0013-NA', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'GC1630', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0187_4fl', name: '0.187" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0019-NA', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'GC1630', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'sandvik_plura_025_4fl', name: '0.25" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0025-NA', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'GC1630', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0312_4fl', name: '0.312" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0031-NA', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'GC1630', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0375_4fl', name: '0.375" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0038-NA', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'GC1630', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'sandvik_plura_05_4fl', name: '0.5" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0050-NA', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'GC1630', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0625_4fl', name: '0.625" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0063-NA', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'GC1630', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sandvik_plura_075_4fl', name: '0.75" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0075-NA', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'GC1630', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sandvik_plura_1_4fl', name: '1" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0100-NA', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'GC1630', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_0187_5fl', name: '0.187" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0019-NA', type: 'endmill_square', diameter: 0.187, flutes: 5, loc: 0.562, oal: 2.5, coating: 'GC1640', material: 'carbide', shank: 0.187, heavyDuty: true, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_025_5fl', name: '0.25" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0025-NA', type: 'endmill_square', diameter: 0.25, flutes: 5, loc: 0.75, oal: 2.5, coating: 'GC1640', material: 'carbide', shank: 0.25, heavyDuty: true, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_0312_5fl', name: '0.312" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0031-NA', type: 'endmill_square', diameter: 0.312, flutes: 5, loc: 0.937, oal: 2.5, coating: 'GC1640', material: 'carbide', shank: 0.312, heavyDuty: true, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_0375_5fl', name: '0.375" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0038-NA', type: 'endmill_square', diameter: 0.375, flutes: 5, loc: 1.125, oal: 2.5, coating: 'GC1640', material: 'carbide', shank: 0.375, heavyDuty: true, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_05_5fl', name: '0.5" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0050-NA', type: 'endmill_square', diameter: 0.5, flutes: 5, loc: 1.25, oal: 3, coating: 'GC1640', material: 'carbide', shank: 0.5, heavyDuty: true, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_0625_5fl', name: '0.625" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0063-NA', type: 'endmill_square', diameter: 0.625, flutes: 5, loc: 1.562, oal: 3.5, coating: 'GC1640', material: 'carbide', shank: 0.625, heavyDuty: true, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_075_5fl', name: '0.75" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0075-NA', type: 'endmill_square', diameter: 0.75, flutes: 5, loc: 1.5, oal: 4, coating: 'GC1640', material: 'carbide', shank: 0.75, heavyDuty: true, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_1_5fl', name: '1" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0100-NA', type: 'endmill_square', diameter: 1, flutes: 5, loc: 2, oal: 4.5, coating: 'GC1640', material: 'carbide', shank: 1, heavyDuty: true, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_0125_4fl', name: '0.125" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0013-NA', type: 'endmill_highfeed', diameter: 0.125, flutes: 4, loc: 0.300, oal: 2, coating: 'GC1620', material: 'carbide', shank: 0.125, highFeed: true, maxRpm: 280000, process: 'milling', geometry: { volume: 384, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_0187_4fl', name: '0.187" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0019-NA', type: 'endmill_highfeed', diameter: 0.187, flutes: 4, loc: 0.337, oal: 2.5, coating: 'GC1620', material: 'carbide', shank: 0.187, highFeed: true, maxRpm: 187166, process: 'milling', geometry: { volume: 1080, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_025_4fl', name: '0.25" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0025-NA', type: 'endmill_highfeed', diameter: 0.25, flutes: 4, loc: 0.450, oal: 2.5, coating: 'GC1620', material: 'carbide', shank: 0.25, highFeed: true, maxRpm: 140000, process: 'milling', geometry: { volume: 1902, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_0312_4fl', name: '0.312" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0031-NA', type: 'endmill_highfeed', diameter: 0.312, flutes: 4, loc: 0.562, oal: 2.5, coating: 'GC1620', material: 'carbide', shank: 0.312, highFeed: true, maxRpm: 112179, process: 'milling', geometry: { volume: 2921, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_0375_4fl', name: '0.375" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0038-NA', type: 'endmill_highfeed', diameter: 0.375, flutes: 4, loc: 0.675, oal: 2.5, coating: 'GC1620', material: 'carbide', shank: 0.375, highFeed: true, maxRpm: 93333, process: 'milling', geometry: { volume: 4158, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_05_4fl', name: '0.5" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0050-NA', type: 'endmill_highfeed', diameter: 0.5, flutes: 4, loc: 0.750, oal: 3, coating: 'GC1620', material: 'carbide', shank: 0.5, highFeed: true, maxRpm: 70000, process: 'milling', geometry: { volume: 8929, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_0625_4fl', name: '0.625" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0063-NA', type: 'endmill_highfeed', diameter: 0.625, flutes: 4, loc: 0.937, oal: 3.5, coating: 'GC1620', material: 'carbide', shank: 0.625, highFeed: true, maxRpm: 56000, process: 'milling', geometry: { volume: 16183, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_075_4fl', name: '0.75" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0075-NA', type: 'endmill_highfeed', diameter: 0.75, flutes: 4, loc: 0.900, oal: 4, coating: 'GC1620', material: 'carbide', shank: 0.75, highFeed: true, maxRpm: 46667, process: 'milling', geometry: { volume: 27004, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_1_4fl', name: '1" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0100-NA', type: 'endmill_highfeed', diameter: 1, flutes: 4, loc: 1.200, oal: 4.5, coating: 'GC1620', material: 'carbide', shank: 1, highFeed: true, maxRpm: 35000, process: 'milling', geometry: { volume: 53283, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0062_4fl', name: '0.062" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0062', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'Miracle', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0093_4fl', name: '0.093" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0093', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'Miracle', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0125_4fl', name: '0.125" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'Miracle', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0187_4fl', name: '0.187" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'Miracle', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'mitsu_vq_025_4fl', name: '0.25" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Miracle', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0312_4fl', name: '0.312" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'Miracle', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0375_4fl', name: '0.375" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'Miracle', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mitsu_vq_05_4fl', name: '0.5" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'Miracle', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0625_4fl', name: '0.625" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'Miracle', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mitsu_vq_075_4fl', name: '0.75" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Miracle', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mitsu_vq_1_4fl', name: '1" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Miracle', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'seco_js500_0062_4fl', name: '0.062" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000062Z4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'SIRA', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'seco_js500_0093_4fl', name: '0.093" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000093Z4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'SIRA', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'seco_js500_0125_4fl', name: '0.125" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000125Z4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'SIRA', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'seco_js500_0187_4fl', name: '0.187" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000187Z4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'SIRA', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'seco_js500_025_4fl', name: '0.25" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000250Z4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'SIRA', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'seco_js500_0312_4fl', name: '0.312" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000312Z4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'SIRA', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'seco_js500_0375_4fl', name: '0.375" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000375Z4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'SIRA', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'seco_js500_05_4fl', name: '0.5" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000500Z4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'SIRA', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'seco_js500_0625_4fl', name: '0.625" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000625Z4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'SIRA', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'seco_js500_075_4fl', name: '0.75" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000750Z4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'SIRA', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'seco_js500_1_4fl', name: '1" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5001000Z4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'SIRA', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'walter_proto_0062_4fl', name: '0.062" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007006', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiCN', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'walter_proto_0093_4fl', name: '0.093" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007009', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'TiCN', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'walter_proto_0125_4fl', name: '0.125" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007013', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiCN', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'walter_proto_0187_4fl', name: '0.187" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007019', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiCN', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'walter_proto_025_4fl', name: '0.25" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007025', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiCN', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'walter_proto_0312_4fl', name: '0.312" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007031', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'TiCN', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'walter_proto_0375_4fl', name: '0.375" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007038', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'TiCN', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'walter_proto_05_4fl', name: '0.5" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007050', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'TiCN', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'walter_proto_0625_4fl', name: '0.625" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007063', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'TiCN', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'walter_proto_075_4fl', name: '0.75" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007075', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiCN', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'walter_proto_1_4fl', name: '1" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007100', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiCN', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0062_4fl', name: '0.062" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 419355, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0093_4fl', name: '0.093" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 279570, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0125_4fl', name: '0.125" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 208000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0187_4fl', name: '0.187" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_025_4fl', name: '0.25" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0312_4fl', name: '0.312" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0375_4fl', name: '0.375" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_05_4fl', name: '0.5" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0625_4fl', name: '0.625" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_075_4fl', name: '0.75" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_1_4fl', name: '1" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0062_4fl', name: '0.062" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiN-X', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0093_4fl', name: '0.093" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'TiN-X', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0125_4fl', name: '0.125" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiN-X', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0187_4fl', name: '0.187" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiN-X', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'emuge_topcut_025_4fl', name: '0.25" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiN-X', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0312_4fl', name: '0.312" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'TiN-X', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0375_4fl', name: '0.375" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'TiN-X', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'emuge_topcut_05_4fl', name: '0.5" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'TiN-X', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0625_4fl', name: '0.625" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'TiN-X', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'emuge_topcut_075_4fl', name: '0.75" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiN-X', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'emuge_topcut_1_4fl', name: '1" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiN-X', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0062_4fl', name: '0.062" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0093_4fl', name: '0.093" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0125_4fl', name: '0.125" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0187_4fl', name: '0.187" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_025_4fl', name: '0.25" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0312_4fl', name: '0.312" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0375_4fl', name: '0.375" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_05_4fl', name: '0.5" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0625_4fl', name: '0.625" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_075_4fl', name: '0.75" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_1_4fl', name: '1" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0062_4fl', name: '0.062" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'FireX', material: 'carbide', shank: 0.125, maxRpm: 516129, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0093_4fl', name: '0.093" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'FireX', material: 'carbide', shank: 0.125, maxRpm: 344086, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0125_4fl', name: '0.125" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'FireX', material: 'carbide', shank: 0.125, maxRpm: 256000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0187_4fl', name: '0.187" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'FireX', material: 'carbide', shank: 0.187, maxRpm: 171123, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'guhring_rf100_025_4fl', name: '0.25" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'FireX', material: 'carbide', shank: 0.25, maxRpm: 128000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0312_4fl', name: '0.312" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'FireX', material: 'carbide', shank: 0.312, maxRpm: 102564, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0375_4fl', name: '0.375" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'FireX', material: 'carbide', shank: 0.375, maxRpm: 85333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'guhring_rf100_05_4fl', name: '0.5" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'FireX', material: 'carbide', shank: 0.5, maxRpm: 64000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0625_4fl', name: '0.625" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'FireX', material: 'carbide', shank: 0.625, maxRpm: 51200, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'guhring_rf100_075_4fl', name: '0.75" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'FireX', material: 'carbide', shank: 0.75, maxRpm: 42667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'guhring_rf100_1_4fl', name: '1" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'FireX', material: 'carbide', shank: 1, maxRpm: 32000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'nachi_sg_0062_4fl', name: '0.062" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'SG', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'nachi_sg_0093_4fl', name: '0.093" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'SG', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'nachi_sg_0125_4fl', name: '0.125" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'SG', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'nachi_sg_0187_4fl', name: '0.187" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'SG', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'nachi_sg_025_4fl', name: '0.25" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'SG', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'nachi_sg_0312_4fl', name: '0.312" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'SG', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'nachi_sg_0375_4fl', name: '0.375" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'SG', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'nachi_sg_05_4fl', name: '0.5" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'SG', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'nachi_sg_0625_4fl', name: '0.625" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'SG', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'nachi_sg_075_4fl', name: '0.75" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'SG', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'nachi_sg_1_4fl', name: '1" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'SG', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'maford_sc_0062_4fl', name: '0.062" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 419355, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'maford_sc_0093_4fl', name: '0.093" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 279570, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'maford_sc_0125_4fl', name: '0.125" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 208000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'maford_sc_0187_4fl', name: '0.187" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'maford_sc_025_4fl', name: '0.25" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'maford_sc_0312_4fl', name: '0.312" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'maford_sc_0375_4fl', name: '0.375" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'maford_sc_05_4fl', name: '0.5" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'maford_sc_0625_4fl', name: '0.625" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'maford_sc_075_4fl', name: '0.75" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'maford_sc_1_4fl', name: '1" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'gorilla_monster_0187_4fl', name: '0.187" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'gorilla_monster_025_4fl', name: '0.25" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'gorilla_monster_0312_4fl', name: '0.312" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'gorilla_monster_0375_4fl', name: '0.375" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'gorilla_monster_05_4fl', name: '0.5" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'nACo', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'gorilla_monster_0625_4fl', name: '0.625" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'nACo', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'gorilla_monster_075_4fl', name: '0.75" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'nACo', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'gorilla_monster_1_4fl', name: '1" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'nACo', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'destiny_v2_0062_2fl', name: '0.062" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-62', type: 'endmill_square', diameter: 0.062, flutes: 2, loc: 0.187, oal: 1.5, coating: 'Uncoated', material: 'carbide', shank: 0.125, polished: true, maxRpm: 806452, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'destiny_v2_0093_2fl', name: '0.093" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-93', type: 'endmill_square', diameter: 0.093, flutes: 2, loc: 0.281, oal: 1.5, coating: 'Uncoated', material: 'carbide', shank: 0.125, polished: true, maxRpm: 537634, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'destiny_v2_0125_2fl', name: '0.125" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-125', type: 'endmill_square', diameter: 0.125, flutes: 2, loc: 0.5, oal: 2, coating: 'Uncoated', material: 'carbide', shank: 0.125, polished: true, maxRpm: 400000, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'destiny_v2_0187_2fl', name: '0.187" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-187', type: 'endmill_square', diameter: 0.187, flutes: 2, loc: 0.562, oal: 2.5, coating: 'Uncoated', material: 'carbide', shank: 0.187, polished: true, maxRpm: 267380, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'destiny_v2_025_2fl', name: '0.25" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-250', type: 'endmill_square', diameter: 0.25, flutes: 2, loc: 0.75, oal: 2.5, coating: 'Uncoated', material: 'carbide', shank: 0.25, polished: true, maxRpm: 200000, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'destiny_v2_0312_2fl', name: '0.312" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-312', type: 'endmill_square', diameter: 0.312, flutes: 2, loc: 0.937, oal: 2.5, coating: 'Uncoated', material: 'carbide', shank: 0.312, polished: true, maxRpm: 160256, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'destiny_v2_0375_2fl', name: '0.375" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-375', type: 'endmill_square', diameter: 0.375, flutes: 2, loc: 1.125, oal: 2.5, coating: 'Uncoated', material: 'carbide', shank: 0.375, polished: true, maxRpm: 133333, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'destiny_v2_05_2fl', name: '0.5" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-500', type: 'endmill_square', diameter: 0.5, flutes: 2, loc: 1.25, oal: 3, coating: 'Uncoated', material: 'carbide', shank: 0.5, polished: true, maxRpm: 100000, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'destiny_v2_0625_2fl', name: '0.625" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-625', type: 'endmill_square', diameter: 0.625, flutes: 2, loc: 1.562, oal: 3.5, coating: 'Uncoated', material: 'carbide', shank: 0.625, polished: true, maxRpm: 80000, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'destiny_v2_075_2fl', name: '0.75" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-750', type: 'endmill_square', diameter: 0.75, flutes: 2, loc: 1.5, oal: 4, coating: 'Uncoated', material: 'carbide', shank: 0.75, polished: true, maxRpm: 66667, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'destiny_v2_1_2fl', name: '1" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-1000', type: 'endmill_square', diameter: 1, flutes: 2, loc: 2, oal: 4.5, coating: 'Uncoated', material: 'carbide', shank: 1, polished: true, maxRpm: 50000, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'datron_hs_0031_2fl', name: '31 thou 2FL High Speed', manufacturer: 'Datron', series: 'High Speed', partNumber: 'HS031', type: 'endmill_square', diameter: 0.031, flutes: 2, loc: 0.093, oal: 1.5, coating: 'DLC', material: 'carbide', shank: 0.125, maxRpm: 1935484, highSpeed: true, process: 'milling', geometry: { volume: 18, surfaceArea: 95, units: "mm3/mm2" } },
            { id: 'datron_hs_0062_2fl', name: '62 thou 2FL High Speed', manufacturer: 'Datron', series: 'High Speed', partNumber: 'HS062', type: 'endmill_square', diameter: 0.062, flutes: 2, loc: 0.187, oal: 1.5, coating: 'DLC', material: 'carbide', shank: 0.125, maxRpm: 967742, highSpeed: true, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'datron_hs_0125_2fl', name: '0.125" 2FL High Speed', manufacturer: 'Datron', series: 'High Speed', partNumber: 'HS125', type: 'endmill_square', diameter: 0.125, flutes: 2, loc: 0.375, oal: 2, coating: 'DLC', material: 'carbide', shank: 0.125, maxRpm: 480000, highSpeed: true, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'datron_hs_0187_2fl', name: '0.187" 2FL High Speed', manufacturer: 'Datron', series: 'High Speed', partNumber: 'HS187', type: 'endmill_square', diameter: 0.187, flutes: 2, loc: 0.562, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.187, maxRpm: 320856, highSpeed: true, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'datron_hs_025_2fl', name: '0.25" 2FL High Speed', manufacturer: 'Datron', series: 'High Speed', partNumber: 'HS250', type: 'endmill_square', diameter: 0.25, flutes: 2, loc: 0.75, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.25, maxRpm: 240000, highSpeed: true, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_001_2fl', name: '0.010" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A010', type: 'endmill_ball', diameter: 0.01, flutes: 2, loc: 0.015, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 3000000, quickShip: true, process: 'milling', geometry: { volume: 2, surfaceArea: 31, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0015_2fl', name: '0.015" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A015', type: 'endmill_ball', diameter: 0.015, flutes: 2, loc: 0.023, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 2000000, quickShip: true, process: 'milling', geometry: { volume: 4, surfaceArea: 46, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_002_2fl', name: '0.020" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A020', type: 'endmill_ball', diameter: 0.02, flutes: 2, loc: 0.03, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 1500000, quickShip: true, process: 'milling', geometry: { volume: 8, surfaceArea: 61, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0031_2fl', name: '1/32" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A031', type: 'endmill_ball', diameter: 0.031, flutes: 2, loc: 0.047, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 967742, quickShip: true, process: 'milling', geometry: { volume: 18, surfaceArea: 95, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0047_2fl', name: '3/64" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A047', type: 'endmill_ball', diameter: 0.047, flutes: 2, loc: 0.07, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 638298, quickShip: true, process: 'milling', geometry: { volume: 42, surfaceArea: 145, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0062_2fl', name: '1/16" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A062', type: 'endmill_ball', diameter: 0.062, flutes: 2, loc: 0.093, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 483871, quickShip: true, process: 'milling', geometry: { volume: 73, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0078_2fl', name: '5/64" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A078', type: 'endmill_ball', diameter: 0.078, flutes: 2, loc: 0.117, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 384615, quickShip: true, process: 'milling', geometry: { volume: 115, surfaceArea: 243, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0093_2fl', name: '3/32" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A093', type: 'endmill_ball', diameter: 0.093, flutes: 2, loc: 0.14, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 322581, quickShip: true, process: 'milling', geometry: { volume: 162, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0125_2fl', name: '1/8" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A125', type: 'endmill_ball', diameter: 0.125, flutes: 2, loc: 0.25, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 240000, quickShip: true, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0156_2fl', name: '5/32" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A156', type: 'endmill_ball', diameter: 0.156, flutes: 2, loc: 0.312, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.156, maxRpm: 192308, quickShip: true, process: 'milling', geometry: { volume: 597, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0187_2fl', name: '3/16" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A187', type: 'endmill_ball', diameter: 0.187, flutes: 2, loc: 0.375, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 160428, quickShip: true, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0218_2fl', name: '7/32" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A218', type: 'endmill_ball', diameter: 0.218, flutes: 2, loc: 0.437, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.218, maxRpm: 137615, quickShip: true, process: 'milling', geometry: { volume: 1143, surfaceArea: 932, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_025_2fl', name: '1/4" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A250', type: 'endmill_ball', diameter: 0.25, flutes: 2, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 120000, quickShip: true, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0312_2fl', name: '5/16" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A312', type: 'endmill_ball', diameter: 0.312, flutes: 2, loc: 0.625, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 96154, quickShip: true, process: 'milling', geometry: { volume: 2897, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0375_2fl', name: '3/8" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A375', type: 'endmill_ball', diameter: 0.375, flutes: 2, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 80000, quickShip: true, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0437_2fl', name: '7/16" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A437', type: 'endmill_ball', diameter: 0.437, flutes: 2, loc: 0.875, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.437, maxRpm: 68650, quickShip: true, process: 'milling', geometry: { volume: 6728, surfaceArea: 2851, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_05_2fl', name: '1/2" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A500', type: 'endmill_ball', diameter: 0.5, flutes: 2, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 60000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0562_2fl', name: '9/16" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A562', type: 'endmill_ball', diameter: 0.562, flutes: 2, loc: 1.125, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.562, maxRpm: 53381, quickShip: true, process: 'milling', geometry: { volume: 12856, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0625_2fl', name: '5/8" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A625', type: 'endmill_ball', diameter: 0.625, flutes: 2, loc: 1.25, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 48000, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_075_2fl', name: '3/4" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A750', type: 'endmill_ball', diameter: 0.75, flutes: 2, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0875_2fl', name: '7/8" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A875', type: 'endmill_ball', diameter: 0.875, flutes: 2, loc: 1.75, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.875, maxRpm: 34286, quickShip: true, process: 'milling', geometry: { volume: 34242, surfaceArea: 7870, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_1_2fl', name: '1" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A1000', type: 'endmill_ball', diameter: 1, flutes: 2, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 30000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_125_2fl', name: '1-1/4" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A1250', type: 'endmill_ball', diameter: 1.25, flutes: 2, loc: 2.5, oal: 5, coating: 'TiAlN', material: 'carbide', shank: 1.25, maxRpm: 24000, quickShip: true, process: 'milling', geometry: { volume: 85467, surfaceArea: 14251, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_0062_2fl', name: '1/16" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-062-LR', type: 'endmill_ball', diameter: 0.062, flutes: 2, loc: 0.187, oal: 2.5, reach: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, longReach: true, maxRpm: 403226, process: 'milling', geometry: { volume: 121, surfaceArea: 318, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_0093_2fl', name: '3/32" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-093-LR', type: 'endmill_ball', diameter: 0.093, flutes: 2, loc: 0.281, oal: 2.5, reach: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, longReach: true, maxRpm: 268817, process: 'milling', geometry: { volume: 269, surfaceArea: 480, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_0125_2fl', name: '1/8" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-125-LR', type: 'endmill_ball', diameter: 0.125, flutes: 2, loc: 0.375, oal: 3, reach: 2, coating: 'AlTiN', material: 'carbide', shank: 0.125, longReach: true, maxRpm: 200000, process: 'milling', geometry: { volume: 581, surfaceArea: 776, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_0187_2fl', name: '3/16" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-187-LR', type: 'endmill_ball', diameter: 0.187, flutes: 2, loc: 0.562, oal: 3.5, reach: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.187, longReach: true, maxRpm: 133690, process: 'milling', geometry: { volume: 1499, surfaceArea: 1362, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_025_2fl', name: '1/4" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-250-LR', type: 'endmill_ball', diameter: 0.25, flutes: 2, loc: 0.75, oal: 4, reach: 3, coating: 'AlTiN', material: 'carbide', shank: 0.25, longReach: true, maxRpm: 100000, process: 'milling', geometry: { volume: 3037, surfaceArea: 2090, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_0375_2fl', name: '3/8" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-375-LR', type: 'endmill_ball', diameter: 0.375, flutes: 2, loc: 1.125, oal: 5, reach: 4, coating: 'AlTiN', material: 'carbide', shank: 0.375, longReach: true, maxRpm: 66667, process: 'milling', geometry: { volume: 8439, surfaceArea: 3943, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_05_2fl', name: '1/2" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-500-LR', type: 'endmill_ball', diameter: 0.5, flutes: 2, loc: 1.5, oal: 6, reach: 5, coating: 'AlTiN', material: 'carbide', shank: 0.5, longReach: true, maxRpm: 50000, process: 'milling', geometry: { volume: 17858, surfaceArea: 6334, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_025_4fl', name: '1/4" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-250', type: 'endmill_ball', diameter: 0.25, flutes: 4, loc: 0.5, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_0375_4fl', name: '3/8" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-375', type: 'endmill_ball', diameter: 0.375, flutes: 4, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_05_4fl', name: '1/2" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-500', type: 'endmill_ball', diameter: 0.5, flutes: 4, loc: 1, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_0625_4fl', name: '5/8" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-625', type: 'endmill_ball', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_075_4fl', name: '3/4" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-750', type: 'endmill_ball', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_1_4fl', name: '1" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-1000', type: 'endmill_ball', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'harvey_taperball_0031_1.5deg', name: '1/32" × 1.5° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-031-T1.5', type: 'endmill_ball_tapered', diameter: 0.031, tipDiameter: 0.015, taperAngle: 1.5, flutes: 2, loc: 0.25, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.031, maxRpm: 806452, process: 'milling', geometry: { volume: 17, surfaceArea: 89, units: "mm3/mm2" } },
            { id: 'harvey_taperball_0062_1.5deg', name: '1/16" × 1.5° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-062-T1.5', type: 'endmill_ball_tapered', diameter: 0.062, tipDiameter: 0.031, taperAngle: 1.5, flutes: 2, loc: 0.375, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.062, maxRpm: 403226, process: 'milling', geometry: { volume: 61, surfaceArea: 172, units: "mm3/mm2" } },
            { id: 'harvey_taperball_0125_2deg', name: '1/8" × 2° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-125-T2', type: 'endmill_ball_tapered', diameter: 0.125, tipDiameter: 0.062, taperAngle: 2, flutes: 2, loc: 0.5, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 331, surfaceArea: 461, units: "mm3/mm2" } },
            { id: 'harvey_taperball_025_3deg', name: '1/4" × 3° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-250-T3', type: 'endmill_ball_tapered', diameter: 0.25, tipDiameter: 0.125, taperAngle: 3, flutes: 2, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1594, surfaceArea: 1137, units: "mm3/mm2" } },
            { id: 'harvey_taperball_0375_3deg', name: '3/8" × 3° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-375-T3', type: 'endmill_ball_tapered', diameter: 0.375, tipDiameter: 0.187, taperAngle: 3, flutes: 2, loc: 1, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4144, surfaceArea: 2006, units: "mm3/mm2" } },
            { id: 'harvey_taperball_05_5deg', name: '1/2" × 5° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-500-T5', type: 'endmill_ball_tapered', diameter: 0.5, tipDiameter: 0.25, taperAngle: 5, flutes: 2, loc: 1.25, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8739, surfaceArea: 3194, units: "mm3/mm2" } },
            { id: 'emuge_barrel_025_r2', name: '1/4" R2.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-250-R20', type: 'endmill_barrel', diameter: 0.25, ballRadius: 2, flutes: 4, loc: 0.375, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 88000, process: 'milling', geometry: { volume: 1921, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'emuge_barrel_0375_r3', name: '3/8" R3.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-375-R30', type: 'endmill_barrel', diameter: 0.375, ballRadius: 3, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 58667, process: 'milling', geometry: { volume: 4253, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'emuge_barrel_05_r4', name: '1/2" R4.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-500-R40', type: 'endmill_barrel', diameter: 0.5, ballRadius: 4, flutes: 4, loc: 0.625, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 44000, process: 'milling', geometry: { volume: 9049, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'emuge_barrel_05_r6', name: '1/2" R6.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-500-R60', type: 'endmill_barrel', diameter: 0.5, ballRadius: 6, flutes: 4, loc: 0.75, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 44000, process: 'milling', geometry: { volume: 8929, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'emuge_barrel_0625_r5', name: '5/8" R5.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-625-R50', type: 'endmill_barrel', diameter: 0.625, ballRadius: 5, flutes: 4, loc: 0.75, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 35200, process: 'milling', geometry: { volume: 16465, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'emuge_barrel_075_r6', name: '3/4" R6.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-750-R60', type: 'endmill_barrel', diameter: 0.75, ballRadius: 6, flutes: 4, loc: 0.875, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 29333, process: 'milling', geometry: { volume: 27058, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'emuge_barrel_075_r10', name: '3/4" R10.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-750-R100', type: 'endmill_barrel', diameter: 0.75, ballRadius: 10, flutes: 4, loc: 1, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 29333, process: 'milling', geometry: { volume: 26786, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'emuge_barrel_1_r8', name: '1" R8.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-1000-R80', type: 'endmill_barrel', diameter: 1, ballRadius: 8, flutes: 4, loc: 1, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 22000, process: 'milling', geometry: { volume: 54056, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'emuge_barrel_1_r15', name: '1" R15.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-1000-R150', type: 'endmill_barrel', diameter: 1, ballRadius: 15, flutes: 4, loc: 1.25, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 22000, process: 'milling', geometry: { volume: 53090, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_05_r4', name: '1/2" R4.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0050-R40', type: 'endmill_barrel', diameter: 0.5, ballRadius: 4, flutes: 4, loc: 0.625, oal: 3, coating: 'GC1640', material: 'carbide', shank: 0.5, maxRpm: 48000, process: 'milling', geometry: { volume: 9049, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_05_r6', name: '1/2" R6.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0050-R60', type: 'endmill_barrel', diameter: 0.5, ballRadius: 6, flutes: 4, loc: 0.75, oal: 3, coating: 'GC1640', material: 'carbide', shank: 0.5, maxRpm: 48000, process: 'milling', geometry: { volume: 8929, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_0625_r5', name: '5/8" R5.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0063-R50', type: 'endmill_barrel', diameter: 0.625, ballRadius: 5, flutes: 4, loc: 0.75, oal: 3.5, coating: 'GC1640', material: 'carbide', shank: 0.625, maxRpm: 38400, process: 'milling', geometry: { volume: 16465, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_075_r6', name: '3/4" R6.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0075-R60', type: 'endmill_barrel', diameter: 0.75, ballRadius: 6, flutes: 4, loc: 0.875, oal: 4, coating: 'GC1640', material: 'carbide', shank: 0.75, maxRpm: 32000, process: 'milling', geometry: { volume: 27058, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_075_r10', name: '3/4" R10.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0075-R100', type: 'endmill_barrel', diameter: 0.75, ballRadius: 10, flutes: 4, loc: 1, oal: 4, coating: 'GC1640', material: 'carbide', shank: 0.75, maxRpm: 32000, process: 'milling', geometry: { volume: 26786, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_1_r8', name: '1" R8.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0100-R80', type: 'endmill_barrel', diameter: 1, ballRadius: 8, flutes: 4, loc: 1, oal: 4.5, coating: 'GC1640', material: 'carbide', shank: 1, maxRpm: 24000, process: 'milling', geometry: { volume: 54056, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_1_r15', name: '1" R15.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0100-R150', type: 'endmill_barrel', diameter: 1, ballRadius: 15, flutes: 4, loc: 1.25, oal: 4.5, coating: 'GC1640', material: 'carbide', shank: 1, maxRpm: 24000, process: 'milling', geometry: { volume: 53090, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'iscar_lens_025_r0.5_1', name: '1/4" Lens Form Cutter', manufacturer: 'ISCAR', series: 'Multi-Master Lens', partNumber: 'MM-ELF-250-0.5R1R', type: 'endmill_lens', diameter: 0.25, radius1: 0.5, radius2: 1, flutes: 4, loc: 0.375, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.25, maxRpm: 80000, process: 'milling', geometry: { volume: 1921, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'iscar_lens_0375_r0.75_1.5', name: '3/8" Lens Form Cutter', manufacturer: 'ISCAR', series: 'Multi-Master Lens', partNumber: 'MM-ELF-375-0.75R1.5R', type: 'endmill_lens', diameter: 0.375, radius1: 0.75, radius2: 1.5, flutes: 4, loc: 0.5, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.375, maxRpm: 53333, process: 'milling', geometry: { volume: 4253, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'iscar_lens_05_r1_2', name: '1/2" Lens Form Cutter', manufacturer: 'ISCAR', series: 'Multi-Master Lens', partNumber: 'MM-ELF-500-1R2R', type: 'endmill_lens', diameter: 0.5, radius1: 1, radius2: 2, flutes: 4, loc: 0.625, oal: 3, coating: 'IC900', material: 'carbide', shank: 0.5, maxRpm: 40000, process: 'milling', geometry: { volume: 9049, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'iscar_lens_075_r1.5_3', name: '3/4" Lens Form Cutter', manufacturer: 'ISCAR', series: 'Multi-Master Lens', partNumber: 'MM-ELF-750-1.5R3R', type: 'endmill_lens', diameter: 0.75, radius1: 1.5, radius2: 3, flutes: 4, loc: 0.875, oal: 4, coating: 'IC900', material: 'carbide', shank: 0.75, maxRpm: 26667, process: 'milling', geometry: { volume: 27058, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'iscar_lens_1_r2_4', name: '1" Lens Form Cutter', manufacturer: 'ISCAR', series: 'Multi-Master Lens', partNumber: 'MM-ELF-1000-2R4R', type: 'endmill_lens', diameter: 1, radius1: 2, radius2: 4, flutes: 4, loc: 1, oal: 4.5, coating: 'IC900', material: 'carbide', shank: 1, maxRpm: 20000, process: 'milling', geometry: { volume: 54056, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_14', name: '1/4" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A038', type: 'endmill_tslot', cutterDiameter: 0.375, slotWidth: 0.156, boltSize: '1/4"', flutes: 4, shank: 0.25, oal: 2.25, coating: 'Uncoated', material: 'hss_m2', maxRpm: 8000, quickShip: true, process: 'milling', geometry: { volume: 1882, surfaceArea: 1322, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_516', name: '5/16" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A050', type: 'endmill_tslot', cutterDiameter: 0.5, slotWidth: 0.187, boltSize: '5/16"', flutes: 4, shank: 0.312, oal: 2.5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 6000, quickShip: true, process: 'milling', geometry: { volume: 3319, surfaceArea: 1906, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_38', name: '3/8" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A063', type: 'endmill_tslot', cutterDiameter: 0.625, slotWidth: 0.218, boltSize: '3/8"', flutes: 4, shank: 0.375, oal: 2.75, coating: 'Uncoated', material: 'hss_m2', maxRpm: 4800, quickShip: true, process: 'milling', geometry: { volume: 5350, surfaceArea: 2596, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_716', name: '7/16" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A075', type: 'endmill_tslot', cutterDiameter: 0.75, slotWidth: 0.281, boltSize: '7/16"', flutes: 4, shank: 0.437, oal: 3, coating: 'Uncoated', material: 'hss_m2', maxRpm: 4000, quickShip: true, process: 'milling', geometry: { volume: 8107, surfaceArea: 3405, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_12', name: '1/2" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A088', type: 'endmill_tslot', cutterDiameter: 0.875, slotWidth: 0.312, boltSize: '1/2"', flutes: 4, shank: 0.5, oal: 3.25, coating: 'Uncoated', material: 'hss_m2', maxRpm: 3429, quickShip: true, process: 'milling', geometry: { volume: 11605, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_916', name: '9/16" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A100', type: 'endmill_tslot', cutterDiameter: 1, slotWidth: 0.375, boltSize: '9/16"', flutes: 6, shank: 0.562, oal: 3.5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 3000, quickShip: true, process: 'milling', geometry: { volume: 16082, surfaceArea: 5333, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_58', name: '5/8" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A113', type: 'endmill_tslot', cutterDiameter: 1.125, slotWidth: 0.437, boltSize: '5/8"', flutes: 6, shank: 0.625, oal: 3.75, coating: 'Uncoated', material: 'hss_m2', maxRpm: 2667, quickShip: true, process: 'milling', geometry: { volume: 21639, surfaceArea: 6476, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_34', name: '3/4" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A138', type: 'endmill_tslot', cutterDiameter: 1.375, slotWidth: 0.531, boltSize: '3/4"', flutes: 6, shank: 0.75, oal: 4, coating: 'Uncoated', material: 'hss_m2', maxRpm: 2182, quickShip: true, process: 'milling', geometry: { volume: 34159, surfaceArea: 8669, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_78', name: '7/8" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A163', type: 'endmill_tslot', cutterDiameter: 1.625, slotWidth: 0.625, boltSize: '7/8"', flutes: 6, shank: 0.875, oal: 4.25, coating: 'Uncoated', material: 'hss_m2', maxRpm: 1846, quickShip: true, process: 'milling', geometry: { volume: 50589, surfaceArea: 11163, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_1', name: '1" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A188', type: 'endmill_tslot', cutterDiameter: 1.875, slotWidth: 0.75, boltSize: '1"', flutes: 8, shank: 1, oal: 4.5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 1600, quickShip: true, process: 'milling', geometry: { volume: 72019, surfaceArea: 14014, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_118', name: '1-1/8" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A213', type: 'endmill_tslot', cutterDiameter: 2.125, slotWidth: 0.875, boltSize: '1-1/8"', flutes: 8, shank: 1, oal: 4.75, coating: 'Uncoated', material: 'hss_m2', maxRpm: 1412, quickShip: true, process: 'milling', geometry: { volume: 85470, surfaceArea: 16199, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_114', name: '1-1/4" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A250', type: 'endmill_tslot', cutterDiameter: 2.5, slotWidth: 1, boltSize: '1-1/4"', flutes: 8, shank: 1, oal: 5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 1200, quickShip: true, process: 'milling', geometry: { volume: 107789, surfaceArea: 19508, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_14', name: '1/4" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A038', type: 'endmill_tslot', cutterDiameter: 0.375, slotWidth: 0.156, boltSize: '1/4"', flutes: 4, shank: 0.25, oal: 2.25, coating: 'TiN', material: 'carbide', maxRpm: 21333, quickShip: true, process: 'milling', geometry: { volume: 1882, surfaceArea: 1322, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_516', name: '5/16" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A050', type: 'endmill_tslot', cutterDiameter: 0.5, slotWidth: 0.187, boltSize: '5/16"', flutes: 4, shank: 0.312, oal: 2.5, coating: 'TiN', material: 'carbide', maxRpm: 16000, quickShip: true, process: 'milling', geometry: { volume: 3319, surfaceArea: 1906, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_38', name: '3/8" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A063', type: 'endmill_tslot', cutterDiameter: 0.625, slotWidth: 0.218, boltSize: '3/8"', flutes: 4, shank: 0.375, oal: 2.75, coating: 'TiN', material: 'carbide', maxRpm: 12800, quickShip: true, process: 'milling', geometry: { volume: 5350, surfaceArea: 2596, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_716', name: '7/16" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A075', type: 'endmill_tslot', cutterDiameter: 0.75, slotWidth: 0.281, boltSize: '7/16"', flutes: 4, shank: 0.437, oal: 3, coating: 'TiN', material: 'carbide', maxRpm: 10667, quickShip: true, process: 'milling', geometry: { volume: 8107, surfaceArea: 3405, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_12', name: '1/2" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A088', type: 'endmill_tslot', cutterDiameter: 0.875, slotWidth: 0.312, boltSize: '1/2"', flutes: 4, shank: 0.5, oal: 3.25, coating: 'TiN', material: 'carbide', maxRpm: 9143, quickShip: true, process: 'milling', geometry: { volume: 11605, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_916', name: '9/16" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A100', type: 'endmill_tslot', cutterDiameter: 1, slotWidth: 0.375, boltSize: '9/16"', flutes: 6, shank: 0.562, oal: 3.5, coating: 'TiN', material: 'carbide', maxRpm: 8000, quickShip: true, process: 'milling', geometry: { volume: 16082, surfaceArea: 5333, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_58', name: '5/8" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A113', type: 'endmill_tslot', cutterDiameter: 1.125, slotWidth: 0.437, boltSize: '5/8"', flutes: 6, shank: 0.625, oal: 3.75, coating: 'TiN', material: 'carbide', maxRpm: 7111, quickShip: true, process: 'milling', geometry: { volume: 21639, surfaceArea: 6476, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_34', name: '3/4" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A138', type: 'endmill_tslot', cutterDiameter: 1.375, slotWidth: 0.531, boltSize: '3/4"', flutes: 6, shank: 0.75, oal: 4, coating: 'TiN', material: 'carbide', maxRpm: 5818, quickShip: true, process: 'milling', geometry: { volume: 34159, surfaceArea: 8669, units: "mm3/mm2" } },
            { id: 'harvey_tslot_14', name: '1/4" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-375', type: 'endmill_tslot', cutterDiameter: 0.375, slotWidth: 0.156, boltSize: '1/4"', flutes: 4, shank: 0.25, oal: 2.25, coating: 'AlTiN', material: 'carbide', maxRpm: 26667, process: 'milling', geometry: { volume: 1882, surfaceArea: 1322, units: "mm3/mm2" } },
            { id: 'harvey_tslot_516', name: '5/16" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-500', type: 'endmill_tslot', cutterDiameter: 0.5, slotWidth: 0.187, boltSize: '5/16"', flutes: 4, shank: 0.312, oal: 2.5, coating: 'AlTiN', material: 'carbide', maxRpm: 20000, process: 'milling', geometry: { volume: 3319, surfaceArea: 1906, units: "mm3/mm2" } },
            { id: 'harvey_tslot_38', name: '3/8" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-625', type: 'endmill_tslot', cutterDiameter: 0.625, slotWidth: 0.218, boltSize: '3/8"', flutes: 4, shank: 0.375, oal: 2.75, coating: 'AlTiN', material: 'carbide', maxRpm: 16000, process: 'milling', geometry: { volume: 5350, surfaceArea: 2596, units: "mm3/mm2" } },
            { id: 'harvey_tslot_716', name: '7/16" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-750', type: 'endmill_tslot', cutterDiameter: 0.75, slotWidth: 0.281, boltSize: '7/16"', flutes: 4, shank: 0.437, oal: 3, coating: 'AlTiN', material: 'carbide', maxRpm: 13333, process: 'milling', geometry: { volume: 8107, surfaceArea: 3405, units: "mm3/mm2" } },
            { id: 'harvey_tslot_12', name: '1/2" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-875', type: 'endmill_tslot', cutterDiameter: 0.875, slotWidth: 0.312, boltSize: '1/2"', flutes: 4, shank: 0.5, oal: 3.25, coating: 'AlTiN', material: 'carbide', maxRpm: 11429, process: 'milling', geometry: { volume: 11605, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'harvey_tslot_916', name: '9/16" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-1000', type: 'endmill_tslot', cutterDiameter: 1, slotWidth: 0.375, boltSize: '9/16"', flutes: 6, shank: 0.562, oal: 3.5, coating: 'AlTiN', material: 'carbide', maxRpm: 10000, process: 'milling', geometry: { volume: 16082, surfaceArea: 5333, units: "mm3/mm2" } },
            { id: 'harvey_taper_0015_0.5deg', name: '0.015" × 1/2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-015-T5', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 0.5, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'AlTiN', material: 'carbide', maxRpm: 240000, process: 'milling', geometry: { volume: 303, surfaceArea: 400, units: "mm3/mm2" } },
            { id: 'harvey_taper_0031_0.5deg', name: '1/32" × 1/2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-031-T5', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 0.5, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'AlTiN', material: 'carbide', maxRpm: 160428, process: 'milling', geometry: { volume: 797, surfaceArea: 720, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_0.5deg', name: '1/16" × 1/2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T5', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 0.5, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1654, surfaceArea: 1157, units: "mm3/mm2" } },
            { id: 'harvey_taper_0015_1deg', name: '0.015" × 1° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-015-T10', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 1, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'AlTiN', material: 'carbide', maxRpm: 240000, process: 'milling', geometry: { volume: 304, surfaceArea: 404, units: "mm3/mm2" } },
            { id: 'harvey_taper_0031_1deg', name: '1/32" × 1° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-031-T10', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 1, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'AlTiN', material: 'carbide', maxRpm: 160428, process: 'milling', geometry: { volume: 801, surfaceArea: 730, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_1deg', name: '1/16" × 1° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T10', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 1, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1667, surfaceArea: 1174, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_1deg', name: '1/8" × 1° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T10', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 1, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 4317, surfaceArea: 2082, units: "mm3/mm2" } },
            { id: 'harvey_taper_0015_1.5deg', name: '0.015" × 1.5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-015-T15', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 1.5, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'AlTiN', material: 'carbide', maxRpm: 240000, process: 'milling', geometry: { volume: 305, surfaceArea: 409, units: "mm3/mm2" } },
            { id: 'harvey_taper_0031_1.5deg', name: '1/32" × 1.5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-031-T15', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 1.5, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'AlTiN', material: 'carbide', maxRpm: 160428, process: 'milling', geometry: { volume: 806, surfaceArea: 740, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_1.5deg', name: '1/16" × 1.5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T15', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 1.5, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1681, surfaceArea: 1192, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_1.5deg', name: '1/8" × 1.5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T15', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 1.5, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 4356, surfaceArea: 2110, units: "mm3/mm2" } },
            { id: 'harvey_taper_0015_2deg', name: '0.015" × 2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-015-T20', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 2, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'AlTiN', material: 'carbide', maxRpm: 240000, process: 'milling', geometry: { volume: 307, surfaceArea: 413, units: "mm3/mm2" } },
            { id: 'harvey_taper_0031_2deg', name: '1/32" × 2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-031-T20', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 2, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'AlTiN', material: 'carbide', maxRpm: 160428, process: 'milling', geometry: { volume: 811, surfaceArea: 750, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_2deg', name: '1/16" × 2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T20', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 2, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1697, surfaceArea: 1210, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_2deg', name: '1/8" × 2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T20', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 2, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 4400, surfaceArea: 2138, units: "mm3/mm2" } },
            { id: 'harvey_taper_0031_3deg', name: '1/32" × 3° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-031-T30', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 3, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'AlTiN', material: 'carbide', maxRpm: 160428, process: 'milling', geometry: { volume: 824, surfaceArea: 770, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_3deg', name: '1/16" × 3° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T30', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 3, flutes: 4, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1735, surfaceArea: 1246, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_3deg', name: '1/8" × 3° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T30', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 3, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 4497, surfaceArea: 2193, units: "mm3/mm2" } },
            { id: 'harvey_taper_0187_3deg', name: '3/16" × 3° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-187-T30', type: 'endmill_taper', tipDiameter: 0.187, taperAngle: 3, flutes: 4, loc: 1.5, oal: 4, shank: 0.5, coating: 'AlTiN', material: 'carbide', maxRpm: 60000, process: 'milling', geometry: { volume: 9025, surfaceArea: 3342, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_5deg', name: '1/16" × 5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T50', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 5, flutes: 4, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1833, surfaceArea: 1318, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_5deg', name: '1/8" × 5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T50', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 5, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 4736, surfaceArea: 2306, units: "mm3/mm2" } },
            { id: 'harvey_taper_0187_5deg', name: '3/16" × 5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-187-T50', type: 'endmill_taper', tipDiameter: 0.187, taperAngle: 5, flutes: 4, loc: 1.5, oal: 4, shank: 0.5, coating: 'AlTiN', material: 'carbide', maxRpm: 60000, process: 'milling', geometry: { volume: 9490, surfaceArea: 3505, units: "mm3/mm2" } },
            { id: 'harvey_taper_025_5deg', name: '1/4" × 5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-250-T50', type: 'endmill_taper', tipDiameter: 0.25, taperAngle: 5, flutes: 4, loc: 1.75, oal: 4.5, shank: 0.625, coating: 'AlTiN', material: 'carbide', maxRpm: 48000, process: 'milling', geometry: { volume: 16511, surfaceArea: 4919, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_7deg', name: '1/16" × 7° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T70', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 7, flutes: 4, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1962, surfaceArea: 1391, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_7deg', name: '1/8" × 7° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T70', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 7, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 5034, surfaceArea: 2421, units: "mm3/mm2" } },
            { id: 'harvey_taper_0187_7deg', name: '3/16" × 7° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-187-T70', type: 'endmill_taper', tipDiameter: 0.187, taperAngle: 7, flutes: 4, loc: 1.5, oal: 4, shank: 0.5, coating: 'AlTiN', material: 'carbide', maxRpm: 60000, process: 'milling', geometry: { volume: 10059, surfaceArea: 3670, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_10deg', name: '1/16" × 10° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T100', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 10, flutes: 4, loc: 0.75, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 2104, surfaceArea: 1440, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_10deg', name: '1/8" × 10° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T100', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 10, flutes: 4, loc: 1, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 5436, surfaceArea: 2520, units: "mm3/mm2" } },
            { id: 'harvey_taper_0187_10deg', name: '3/16" × 10° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-187-T100', type: 'endmill_taper', tipDiameter: 0.187, taperAngle: 10, flutes: 4, loc: 1.25, oal: 4, shank: 0.5, coating: 'AlTiN', material: 'carbide', maxRpm: 60000, process: 'milling', geometry: { volume: 10900, surfaceArea: 3835, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0015_0.5deg', name: '0.015" × 1/2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A0155', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 0.5, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'TiN', material: 'carbide', maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 303, surfaceArea: 400, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0031_0.5deg', name: '1/32" × 1/2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A0315', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 0.5, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'TiN', material: 'carbide', maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 797, surfaceArea: 720, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_0.5deg', name: '1/16" × 1/2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A0625', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 0.5, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1654, surfaceArea: 1157, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0015_1deg', name: '0.015" × 1° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A01510', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 1, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'TiN', material: 'carbide', maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 304, surfaceArea: 404, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0031_1deg', name: '1/32" × 1° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A03110', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 1, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'TiN', material: 'carbide', maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 801, surfaceArea: 730, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_1deg', name: '1/16" × 1° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A06210', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 1, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1667, surfaceArea: 1174, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0125_1deg', name: '1/8" × 1° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A12510', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 1, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4317, surfaceArea: 2082, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0015_1.5deg', name: '0.015" × 1.5° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A01515', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 1.5, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'TiN', material: 'carbide', maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 305, surfaceArea: 409, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0031_1.5deg', name: '1/32" × 1.5° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A03115', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 1.5, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'TiN', material: 'carbide', maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 806, surfaceArea: 740, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_1.5deg', name: '1/16" × 1.5° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A06215', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 1.5, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1681, surfaceArea: 1192, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0125_1.5deg', name: '1/8" × 1.5° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A12515', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 1.5, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4356, surfaceArea: 2110, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0015_2deg', name: '0.015" × 2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A01520', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 2, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'TiN', material: 'carbide', maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 307, surfaceArea: 413, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0031_2deg', name: '1/32" × 2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A03120', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 2, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'TiN', material: 'carbide', maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 811, surfaceArea: 750, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_2deg', name: '1/16" × 2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A06220', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 2, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1697, surfaceArea: 1210, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0125_2deg', name: '1/8" × 2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A12520', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 2, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4400, surfaceArea: 2138, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0031_3deg', name: '1/32" × 3° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A03130', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 3, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'TiN', material: 'carbide', maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 824, surfaceArea: 770, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_3deg', name: '1/16" × 3° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A06230', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 3, flutes: 4, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1735, surfaceArea: 1246, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0125_3deg', name: '1/8" × 3° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A12530', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 3, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4497, surfaceArea: 2193, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0187_3deg', name: '3/16" × 3° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A18730', type: 'endmill_taper', tipDiameter: 0.187, taperAngle: 3, flutes: 4, loc: 1.5, oal: 4, shank: 0.5, coating: 'TiN', material: 'carbide', maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 9025, surfaceArea: 3342, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_5deg', name: '1/16" × 5° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A06250', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 5, flutes: 4, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1833, surfaceArea: 1318, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0031_0062_2fl', name: '1/32" 2FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A031006', type: 'endmill_square', diameter: 0.031, flutes: 2, loc: 0.062, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 806452, quickShip: true, process: 'milling', geometry: { volume: 18, surfaceArea: 95, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0047_0093_2fl', name: '3/64" 2FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A047009', type: 'endmill_square', diameter: 0.047, flutes: 2, loc: 0.093, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 531915, quickShip: true, process: 'milling', geometry: { volume: 42, surfaceArea: 145, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0062_0125_4fl', name: '1/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A062013', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.125, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 403226, quickShip: true, process: 'milling', geometry: { volume: 72, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0078_0156_4fl', name: '5/64" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A078016', type: 'endmill_square', diameter: 0.078, flutes: 4, loc: 0.156, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 320513, quickShip: true, process: 'milling', geometry: { volume: 114, surfaceArea: 243, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0093_0187_4fl', name: '3/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A093019', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 268817, quickShip: true, process: 'milling', geometry: { volume: 161, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0109_0218_4fl', name: '7/64" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A109022', type: 'endmill_square', diameter: 0.109, flutes: 4, loc: 0.218, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 229358, quickShip: true, process: 'milling', geometry: { volume: 219, surfaceArea: 343, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0125_025_4fl', name: '1/8" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A125025', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.25, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0125_05_4fl', name: '1/8" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A125050', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0156_0312_4fl', name: '5/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A156031', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.312, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.156, maxRpm: 160256, quickShip: true, process: 'milling', geometry: { volume: 597, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0187_0375_4fl', name: '3/16" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A187038', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.375, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0187_0562_4fl', name: '3/16" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A187056', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0218_0437_4fl', name: '7/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A218044', type: 'endmill_square', diameter: 0.218, flutes: 4, loc: 0.437, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.218, maxRpm: 114679, quickShip: true, process: 'milling', geometry: { volume: 1449, surfaceArea: 1153, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_025_0375_4fl', name: '1/4" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A250038', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.375, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1518, surfaceArea: 1077, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_025_075_4fl', name: '1/4" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A250075', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_025_1_4fl', name: '1/4" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A250100', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 2172, surfaceArea: 1583, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0281_0562_4fl', name: '9/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A281056', type: 'endmill_square', diameter: 0.281, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.281, maxRpm: 88968, quickShip: true, process: 'milling', geometry: { volume: 2369, surfaceArea: 1504, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0312_05_4fl', name: '5/16" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A312050', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 80128, quickShip: true, process: 'milling', geometry: { volume: 2944, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0312_0812_4fl', name: '5/16" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A312081', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.812, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 80128, quickShip: true, process: 'milling', geometry: { volume: 2827, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0343_0687_4fl', name: '11/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A343069', type: 'endmill_square', diameter: 0.343, flutes: 4, loc: 0.687, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.343, maxRpm: 72886, quickShip: true, process: 'milling', geometry: { volume: 3473, surfaceArea: 1857, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0375_05_4fl', name: '3/8" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A375050', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4253, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0375_0875_4fl', name: '3/8" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A375088', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4050, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0375_15_4fl', name: '3/8" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A375150', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 6425, surfaceArea: 3183, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0406_0812_4fl', name: '13/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A406081', type: 'endmill_square', diameter: 0.406, flutes: 4, loc: 0.812, oal: 2.75, coating: 'TiAlN', material: 'carbide', shank: 0.406, maxRpm: 61576, quickShip: true, process: 'milling', geometry: { volume: 5317, surfaceArea: 2430, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0437_0875_4fl', name: '7/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A437088', type: 'endmill_square', diameter: 0.437, flutes: 4, loc: 0.875, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.437, maxRpm: 57208, quickShip: true, process: 'milling', geometry: { volume: 6728, surfaceArea: 2851, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0468_0937_4fl', name: '15/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A468094', type: 'endmill_square', diameter: 0.468, flutes: 4, loc: 0.937, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.468, maxRpm: 53419, quickShip: true, process: 'milling', geometry: { volume: 7664, surfaceArea: 3068, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_05_0625_4fl', name: '1/2" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A500063', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 0.625, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 7441, surfaceArea: 2787, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_05_1_4fl', name: '1/2" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A500100', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_05_1625_4fl', name: '1/2" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A500163', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.625, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 11302, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_05_2_4fl', name: '1/2" XL 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A500200', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 12549, surfaceArea: 4814, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0562_1125_4fl', name: '9/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A562113', type: 'endmill_square', diameter: 0.562, flutes: 4, loc: 1.125, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.562, maxRpm: 44484, quickShip: true, process: 'milling', geometry: { volume: 12856, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0625_075_4fl', name: '5/8" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A625075', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 0.75, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 13951, surfaceArea: 4196, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0625_125_4fl', name: '5/8" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A625125', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0625_2_4fl', name: '5/8" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A625200', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 19607, surfaceArea: 6096, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0687_1375_4fl', name: '11/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A687138', type: 'endmill_square', diameter: 0.687, flutes: 4, loc: 1.375, oal: 3.75, coating: 'TiAlN', material: 'carbide', shank: 0.687, maxRpm: 36390, quickShip: true, process: 'milling', geometry: { volume: 20273, surfaceArea: 5700, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_075_1_4fl', name: '3/4" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A750100', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 33333, quickShip: true, process: 'milling', geometry: { volume: 23167, surfaceArea: 5890, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_075_15_4fl', name: '3/4" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A750150', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 33333, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_075_225_4fl', name: '3/4" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A750225', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 2.25, oal: 5, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 33333, quickShip: true, process: 'milling', geometry: { volume: 31311, surfaceArea: 8171, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0812_1625_4fl', name: '13/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A812163', type: 'endmill_square', diameter: 0.812, flutes: 4, loc: 1.625, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.812, maxRpm: 30788, quickShip: true, process: 'milling', geometry: { volume: 29807, surfaceArea: 7251, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0875_175_4fl', name: '7/8" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A875175', type: 'endmill_square', diameter: 0.875, flutes: 4, loc: 1.75, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.875, maxRpm: 28571, quickShip: true, process: 'milling', geometry: { volume: 34242, surfaceArea: 7870, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0937_1875_4fl', name: '15/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A937188', type: 'endmill_square', diameter: 0.937, flutes: 4, loc: 1.875, oal: 4.25, coating: 'TiAlN', material: 'carbide', shank: 0.937, maxRpm: 26681, quickShip: true, process: 'milling', geometry: { volume: 41668, surfaceArea: 8961, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_1_125_4fl', name: '1" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A1000125', type: 'endmill_square', diameter: 1, flutes: 4, loc: 1.25, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 25000, quickShip: true, process: 'milling', geometry: { volume: 46655, surfaceArea: 9121, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_1_2_4fl', name: '1" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A1000200', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 25000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_1_3_4fl', name: '1" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A1000300', type: 'endmill_square', diameter: 1, flutes: 4, loc: 3, oal: 6, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 25000, quickShip: true, process: 'milling', geometry: { volume: 65639, surfaceArea: 13174, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0125_4fl', name: '1/8" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2.25, coating: 'Uncoated', material: 'hss_m2', shank: 0.125, maxRpm: 64000, quickShip: true, process: 'milling', geometry: { volume: 430, surfaceArea: 586, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0187_4fl', name: '3/16" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.5, oal: 2.5, coating: 'Uncoated', material: 'hss_m2', shank: 0.187, maxRpm: 42781, quickShip: true, process: 'milling', geometry: { volume: 1058, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_025_4fl', name: '1/4" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.625, oal: 2.5, coating: 'Uncoated', material: 'hss_m2', shank: 0.25, maxRpm: 32000, quickShip: true, process: 'milling', geometry: { volume: 1860, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0312_4fl', name: '5/16" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Uncoated', material: 'hss_m2', shank: 0.312, maxRpm: 25641, quickShip: true, process: 'milling', geometry: { volume: 2850, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0375_4fl', name: '3/8" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.75, coating: 'Uncoated', material: 'hss_m2', shank: 0.375, maxRpm: 21333, quickShip: true, process: 'milling', geometry: { volume: 4502, surfaceArea: 2233, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0437_4fl', name: '7/16" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A437', type: 'endmill_square', diameter: 0.437, flutes: 4, loc: 1, oal: 3, coating: 'Uncoated', material: 'hss_m2', shank: 0.437, maxRpm: 18307, quickShip: true, process: 'milling', geometry: { volume: 6636, surfaceArea: 2851, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_05_4fl', name: '1/2" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1, oal: 3.25, coating: 'Uncoated', material: 'hss_m2', shank: 0.5, maxRpm: 16000, quickShip: true, process: 'milling', geometry: { volume: 9492, surfaceArea: 3547, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0562_4fl', name: '9/16" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A562', type: 'endmill_square', diameter: 0.562, flutes: 4, loc: 1.125, oal: 3.5, coating: 'Uncoated', material: 'hss_m2', shank: 0.562, maxRpm: 14235, quickShip: true, process: 'milling', geometry: { volume: 12856, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0625_4fl', name: '5/8" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, coating: 'Uncoated', material: 'hss_m2', shank: 0.625, maxRpm: 12800, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_075_4fl', name: '3/4" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Uncoated', material: 'hss_m2', shank: 0.75, maxRpm: 10667, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0875_4fl', name: '7/8" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A875', type: 'endmill_square', diameter: 0.875, flutes: 4, loc: 1.625, oal: 4, coating: 'Uncoated', material: 'hss_m2', shank: 0.875, maxRpm: 9143, quickShip: true, process: 'milling', geometry: { volume: 34612, surfaceArea: 7870, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_1_4fl', name: '1" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Uncoated', material: 'hss_m2', shank: 1, maxRpm: 8000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0125_4fl', name: '1/8" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2.25, coating: 'TiN', material: 'cobalt_m42', shank: 0.125, maxRpm: 96000, quickShip: true, process: 'milling', geometry: { volume: 430, surfaceArea: 586, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0187_4fl', name: '3/16" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiN', material: 'cobalt_m42', shank: 0.187, maxRpm: 64171, quickShip: true, process: 'milling', geometry: { volume: 1058, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_025_4fl', name: '1/4" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.625, oal: 2.5, coating: 'TiN', material: 'cobalt_m42', shank: 0.25, maxRpm: 48000, quickShip: true, process: 'milling', geometry: { volume: 1860, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0312_4fl', name: '5/16" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiN', material: 'cobalt_m42', shank: 0.312, maxRpm: 38462, quickShip: true, process: 'milling', geometry: { volume: 2850, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0375_4fl', name: '3/8" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.75, coating: 'TiN', material: 'cobalt_m42', shank: 0.375, maxRpm: 32000, quickShip: true, process: 'milling', geometry: { volume: 4502, surfaceArea: 2233, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0437_4fl', name: '7/16" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A437', type: 'endmill_square', diameter: 0.437, flutes: 4, loc: 1, oal: 3, coating: 'TiN', material: 'cobalt_m42', shank: 0.437, maxRpm: 27460, quickShip: true, process: 'milling', geometry: { volume: 6636, surfaceArea: 2851, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_05_4fl', name: '1/2" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1, oal: 3.25, coating: 'TiN', material: 'cobalt_m42', shank: 0.5, maxRpm: 24000, quickShip: true, process: 'milling', geometry: { volume: 9492, surfaceArea: 3547, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0562_4fl', name: '9/16" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A562', type: 'endmill_square', diameter: 0.562, flutes: 4, loc: 1.125, oal: 3.5, coating: 'TiN', material: 'cobalt_m42', shank: 0.562, maxRpm: 21352, quickShip: true, process: 'milling', geometry: { volume: 12856, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0625_4fl', name: '5/8" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, coating: 'TiN', material: 'cobalt_m42', shank: 0.625, maxRpm: 19200, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_075_4fl', name: '3/4" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiN', material: 'cobalt_m42', shank: 0.75, maxRpm: 16000, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0875_4fl', name: '7/8" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A875', type: 'endmill_square', diameter: 0.875, flutes: 4, loc: 1.625, oal: 4, coating: 'TiN', material: 'cobalt_m42', shank: 0.875, maxRpm: 13714, quickShip: true, process: 'milling', geometry: { volume: 34612, surfaceArea: 7870, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_1_4fl', name: '1" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiN', material: 'cobalt_m42', shank: 1, maxRpm: 12000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_0125_2fl', name: '1/8" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T125', type: 'endmill_square', diameter: 0.125, flutes: 2, loc: 0.375, oal: 2, coating: 'ZrN', material: 'carbide', shank: 0.125, polished: true, maxRpm: 320000, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_0187_2fl', name: '3/16" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T187', type: 'endmill_square', diameter: 0.187, flutes: 2, loc: 0.562, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.187, polished: true, maxRpm: 213904, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_025_2fl', name: '1/4" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T250', type: 'endmill_square', diameter: 0.25, flutes: 2, loc: 0.75, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.25, polished: true, maxRpm: 160000, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_0312_2fl', name: '5/16" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T312', type: 'endmill_square', diameter: 0.312, flutes: 2, loc: 0.937, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.312, polished: true, maxRpm: 128205, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_0375_2fl', name: '3/8" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T375', type: 'endmill_square', diameter: 0.375, flutes: 2, loc: 1.125, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.375, polished: true, maxRpm: 106667, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_05_2fl', name: '1/2" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T500', type: 'endmill_square', diameter: 0.5, flutes: 2, loc: 1.25, oal: 3, coating: 'ZrN', material: 'carbide', shank: 0.5, polished: true, maxRpm: 80000, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_0625_2fl', name: '5/8" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T625', type: 'endmill_square', diameter: 0.625, flutes: 2, loc: 1.562, oal: 3.5, coating: 'ZrN', material: 'carbide', shank: 0.625, polished: true, maxRpm: 64000, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_075_2fl', name: '3/4" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T750', type: 'endmill_square', diameter: 0.75, flutes: 2, loc: 1.5, oal: 4, coating: 'ZrN', material: 'carbide', shank: 0.75, polished: true, maxRpm: 53333, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_1_2fl', name: '1" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T1000', type: 'endmill_square', diameter: 1, flutes: 2, loc: 2, oal: 4.5, coating: 'ZrN', material: 'carbide', shank: 1, polished: true, maxRpm: 40000, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_025_0015_4fl', name: '1/4" × 0.015R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A250-15', type: 'endmill_corner_radius', diameter: 0.25, cornerRadius: 0.015, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_025_0031_4fl', name: '1/4" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A250-31', type: 'endmill_corner_radius', diameter: 0.25, cornerRadius: 0.031, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_0375_0015_4fl', name: '3/8" × 0.015R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A375-15', type: 'endmill_corner_radius', diameter: 0.375, cornerRadius: 0.015, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_0375_0031_4fl', name: '3/8" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A375-31', type: 'endmill_corner_radius', diameter: 0.375, cornerRadius: 0.031, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_0375_0062_4fl', name: '3/8" × 0.062R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A375-62', type: 'endmill_corner_radius', diameter: 0.375, cornerRadius: 0.062, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_05_0015_4fl', name: '1/2" × 0.015R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A500-15', type: 'endmill_corner_radius', diameter: 0.5, cornerRadius: 0.015, flutes: 4, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_05_0031_4fl', name: '1/2" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A500-31', type: 'endmill_corner_radius', diameter: 0.5, cornerRadius: 0.031, flutes: 4, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_05_0062_4fl', name: '1/2" × 0.062R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A500-62', type: 'endmill_corner_radius', diameter: 0.5, cornerRadius: 0.062, flutes: 4, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_0625_0031_4fl', name: '5/8" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A625-31', type: 'endmill_corner_radius', diameter: 0.625, cornerRadius: 0.031, flutes: 4, loc: 1.25, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_0625_0062_4fl', name: '5/8" × 0.062R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A625-62', type: 'endmill_corner_radius', diameter: 0.625, cornerRadius: 0.062, flutes: 4, loc: 1.25, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_075_0031_4fl', name: '3/4" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A750-31', type: 'endmill_corner_radius', diameter: 0.75, cornerRadius: 0.031, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 33333, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_075_0062_4fl', name: '3/4" × 0.062R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A750-62', type: 'endmill_corner_radius', diameter: 0.75, cornerRadius: 0.062, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 33333, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_1_0031_4fl', name: '1" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A1000-31', type: 'endmill_corner_radius', diameter: 1, cornerRadius: 0.031, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 25000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_1_0062_4fl', name: '1" × 0.062R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A1000-62', type: 'endmill_corner_radius', diameter: 1, cornerRadius: 0.062, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 25000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_0375_4fl', name: '3/8" 4FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A375', type: 'endmill_roughing', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.5, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 48000, quickShip: true, process: 'milling', geometry: { volume: 4050, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_05_4fl', name: '1/2" 4FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A500', type: 'endmill_roughing', diameter: 0.5, flutes: 4, loc: 1, oal: 3, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 36000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_0625_4fl', name: '5/8" 4FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A625', type: 'endmill_roughing', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 28800, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_075_5fl', name: '3/4" 5FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A750', type: 'endmill_roughing', diameter: 0.75, flutes: 5, loc: 1.5, oal: 4, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 24000, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_1_5fl', name: '1" 5FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A1000', type: 'endmill_roughing', diameter: 1, flutes: 5, loc: 2, oal: 4.5, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 18000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_125_5fl', name: '1-1/4" 5FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A1250', type: 'endmill_roughing', diameter: 1.25, flutes: 5, loc: 2, oal: 4.75, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 1.25, maxRpm: 14400, quickShip: true, process: 'milling', geometry: { volume: 83456, surfaceArea: 13618, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_15_6fl', name: '1-1/2" 6FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A1500', type: 'endmill_roughing', diameter: 1.5, flutes: 6, loc: 2, oal: 5, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 1.5, maxRpm: 12000, quickShip: true, process: 'milling', geometry: { volume: 127417, surfaceArea: 17481, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_0375_45deg', name: '3/8" × 45° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A37545', type: 'endmill_dovetail', cutterDiameter: 0.375, dovetailAngle: 45, flutes: 4, loc: 0.187, oal: 2.25, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 26667, quickShip: true, process: 'milling', geometry: { volume: 1896, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_05_45deg', name: '1/2" × 45° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A50045', type: 'endmill_dovetail', cutterDiameter: 0.5, dovetailAngle: 45, flutes: 4, loc: 0.25, oal: 2.5, shank: 0.312, coating: 'TiN', material: 'carbide', maxRpm: 20000, quickShip: true, process: 'milling', geometry: { volume: 3382, surfaceArea: 1930, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_0625_45deg', name: '5/8" × 45° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A62545', type: 'endmill_dovetail', cutterDiameter: 0.625, dovetailAngle: 45, flutes: 4, loc: 0.312, oal: 2.75, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 16000, quickShip: true, process: 'milling', geometry: { volume: 5511, surfaceArea: 2644, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_075_45deg', name: '3/4" × 45° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A75045', type: 'endmill_dovetail', cutterDiameter: 0.75, dovetailAngle: 45, flutes: 4, loc: 0.375, oal: 3, shank: 0.437, coating: 'TiN', material: 'carbide', maxRpm: 13333, quickShip: true, process: 'milling', geometry: { volume: 8352, surfaceArea: 3465, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_1_45deg', name: '1" × 45° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A100045', type: 'endmill_dovetail', cutterDiameter: 1, dovetailAngle: 45, flutes: 6, loc: 0.5, oal: 3.5, shank: 0.5, coating: 'TiN', material: 'carbide', maxRpm: 10000, quickShip: true, process: 'milling', geometry: { volume: 14157, surfaceArea: 5067, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_0375_60deg', name: '3/8" × 60° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A37560', type: 'endmill_dovetail', cutterDiameter: 0.375, dovetailAngle: 60, flutes: 4, loc: 0.187, oal: 2.25, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 26667, quickShip: true, process: 'milling', geometry: { volume: 1896, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_05_60deg', name: '1/2" × 60° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A50060', type: 'endmill_dovetail', cutterDiameter: 0.5, dovetailAngle: 60, flutes: 4, loc: 0.25, oal: 2.5, shank: 0.312, coating: 'TiN', material: 'carbide', maxRpm: 20000, quickShip: true, process: 'milling', geometry: { volume: 3382, surfaceArea: 1930, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_0625_60deg', name: '5/8" × 60° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A62560', type: 'endmill_dovetail', cutterDiameter: 0.625, dovetailAngle: 60, flutes: 4, loc: 0.312, oal: 2.75, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 16000, quickShip: true, process: 'milling', geometry: { volume: 5511, surfaceArea: 2644, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_075_60deg', name: '3/4" × 60° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A75060', type: 'endmill_dovetail', cutterDiameter: 0.75, dovetailAngle: 60, flutes: 4, loc: 0.375, oal: 3, shank: 0.437, coating: 'TiN', material: 'carbide', maxRpm: 13333, quickShip: true, process: 'milling', geometry: { volume: 8352, surfaceArea: 3465, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_1_60deg', name: '1" × 60° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A100060', type: 'endmill_dovetail', cutterDiameter: 1, dovetailAngle: 60, flutes: 6, loc: 0.5, oal: 3.5, shank: 0.5, coating: 'TiN', material: 'carbide', maxRpm: 10000, quickShip: true, process: 'milling', geometry: { volume: 14157, surfaceArea: 5067, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_202', name: '#202 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A202', type: 'endmill_woodruff', cutterDiameter: 0.25, keyWidth: 0.062, keyNumber: '#202', flutes: 2, shank: 0.312, oal: 2, coating: 'Uncoated', material: 'hss_m2', maxRpm: 12000, quickShip: true, process: 'milling', geometry: { volume: 2463, surfaceArea: 1320, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_203', name: '#203 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A203', type: 'endmill_woodruff', cutterDiameter: 0.312, keyWidth: 0.078, keyNumber: '#203', flutes: 2, shank: 0.375, oal: 2.25, coating: 'Uncoated', material: 'hss_m2', maxRpm: 9615, quickShip: true, process: 'milling', geometry: { volume: 3999, surfaceArea: 1799, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_204', name: '#204 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A204', type: 'endmill_woodruff', cutterDiameter: 0.375, keyWidth: 0.093, keyNumber: '#204', flutes: 2, shank: 0.437, oal: 2.5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 8000, quickShip: true, process: 'milling', geometry: { volume: 6034, surfaceArea: 2345, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_405', name: '#405 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A405', type: 'endmill_woodruff', cutterDiameter: 0.5, keyWidth: 0.125, keyNumber: '#405', flutes: 2, shank: 0.5, oal: 2.75, coating: 'Uncoated', material: 'hss_m2', maxRpm: 6000, quickShip: true, process: 'milling', geometry: { volume: 8728, surfaceArea: 3040, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_406', name: '#406 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A406', type: 'endmill_woodruff', cutterDiameter: 0.625, keyWidth: 0.156, keyNumber: '#406', flutes: 2, shank: 0.5, oal: 3, coating: 'Uncoated', material: 'hss_m2', maxRpm: 4800, quickShip: true, process: 'milling', geometry: { volume: 9700, surfaceArea: 3476, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_607', name: '#607 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A607', type: 'endmill_woodruff', cutterDiameter: 0.75, keyWidth: 0.187, keyNumber: '#607', flutes: 2, shank: 0.562, oal: 3.25, coating: 'Uncoated', material: 'hss_m2', maxRpm: 4000, quickShip: true, process: 'milling', geometry: { volume: 13399, surfaceArea: 4343, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_808', name: '#808 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A808', type: 'endmill_woodruff', cutterDiameter: 0.875, keyWidth: 0.25, keyNumber: '#808', flutes: 2, shank: 0.562, oal: 3.5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 3429, quickShip: true, process: 'milling', geometry: { volume: 14936, surfaceArea: 4921, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_1009', name: '#1009 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A1009', type: 'endmill_woodruff', cutterDiameter: 1, keyWidth: 0.312, keyNumber: '#1009', flutes: 2, shank: 0.625, oal: 3.75, coating: 'Uncoated', material: 'hss_m2', maxRpm: 3000, quickShip: true, process: 'milling', geometry: { volume: 20095, surfaceArea: 6001, units: "mm3/mm2" } },
            { id: 'mcmaster_keyseat_025_0062}', name: '1/4" × 1/16" Keyseat Cutter', manufacturer: 'McMaster-Carr', series: '2782A', partNumber: '2782A250062', type: 'endmill_keyseat', cutterDiameter: 0.25, keyWidth: 0.062, flutes: 2, shank: 0.25, oal: 2, coating: 'TiN', material: 'hss_m2', maxRpm: 20000, quickShip: true, process: 'milling', geometry: { volume: 1594, surfaceArea: 1077, units: "mm3/mm2" } },
            { id: 'mcmaster_keyseat_0312_0093}