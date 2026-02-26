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
}