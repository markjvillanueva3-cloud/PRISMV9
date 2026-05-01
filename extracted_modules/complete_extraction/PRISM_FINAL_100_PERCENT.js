const PRISM_FINAL_100_PERCENT = {
  version: '1.0.0',

  // 1. ENHANCED OUTPUT/EXPORT SYSTEM

  outputExport: {
    /**
     * NC File format variations
     */
    ncFormats: {
      tier2: { extension: '.nc', description: 'Standard NC file' },
      tap: { extension: '.tap', description: 'TAP format (common)' },
      txt: { extension: '.txt', description: 'Text format' },
      prg: { extension: '.prg', description: 'Program format' },
      mpf: { extension: '.mpf', description: 'Siemens MPF format' },
      spf: { extension: '.spf', description: 'Siemens subprogram' },
      h: { extension: '.h', description: 'Heidenhain format' },
      eia: { extension: '.eia', description: 'EIA standard' },
      iso: { extension: '.iso', description: 'ISO standard' },
      din: { extension: '.din', description: 'DIN standard' },
      fanuc: { extension: '.fnc', description: 'FANUC format' },
      mazak: { extension: '.mzk', description: 'Mazak format' },
      haas: { extension: '.ngc', description: 'HAAS format' },
      okuma: { extension: '.min', description: 'Okuma format' }
    },
    /**
     * Export G-code to specified format
     */
    exportToFormat(gcode, format, options = {}) {
      const fmt = this.ncFormats[format] || this.ncFormats.standard;

      let output = gcode;

      // Apply format-specific transformations
      if (format === 'mpf' || format === 'spf') {
        // Siemens format
        output = this._convertToSiemens(gcode, options);
      } else if (format === 'h') {
        // Heidenhain conversational
        output = this._convertToHeidenhain(gcode, options);
      }
      return {
        content: output,
        filename: (options.programName || 'program') + fmt.extension,
        format: fmt.description,
        bytes: output.length
      };
    },
    /**
     * Convert to Siemens format
     */
    _convertToSiemens(gcode, options) {
      let output = gcode;

      // Siemens uses different syntax
      output = output.replace(/O(\d+)/g, ';$NC_PROGRAM $1');
      output = output.replace(/G43 H(\d+)/g, 'D$1');
      output = output.replace(/M06/g, 'T=');

      return output;
    },
    /**
     * Convert to Heidenhain format
     */
    _convertToHeidenhain(gcode, options) {
      let output = '; Heidenhain TNC Format\n';
      output += 'BEGIN PGM ' + (options.programName || 'PROGRAM') + ' MM\n';

      // Basic conversion (simplified)
      const lines = gcode.split('\n');
      let blockNum = 0;

      for (const line of lines) {
        if (line.trim().startsWith('(') || line.trim().startsWith(';')) continue;
        if (!line.trim()) continue;

        blockNum++;
        output += blockNum + ' ' + line + '\n';
      }
      output += 'END PGM ' + (options.programName || 'PROGRAM') + ' MM\n';
      return output;
    },
    /**
     * Generate setup sheet as HTML (for PDF export)
     */
    generateSetupSheetHTML(programInfo) {
      return \`
<!DOCTYPE html>
<html>
<head>
  <title>Setup Sheet - \${programInfo.programNumber || 'O0001'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px; }
    .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
    .section-title { font-weight: bold; color: #1a1a2e; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .tool-row:nth-child(even) { background: #f9f9f9; }
    .warning { background: #fff3cd; padding: 10px; border-radius: 4px; }
    .critical { background: #f8d7da; padding: 10px; border-radius: 4px; }
  </style>
</head>
<body>
    <!-- Toast Notification Container -->
    <div id="toast-container" style="position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 10px;"></div>

  <div class="header">
    <h1>🔧 CNC Setup Sheet</h1>
    <p>Program: \${programInfo.programNumber || 'O0001'} | Part: \${programInfo.partNumber || 'N/A'}</p>
    <p>Generated: \${new Date().toLocaleString()}</p>
  </div>

  <div class="section">
    <div class="section-title">📋 Program Information</div>
    <table>
      <tr><td><strong>Program Number</strong></td><td>\${programInfo.programNumber || 'O0001'}</td></tr>
      <tr><td><strong>Part Number</strong></td><td>\${programInfo.partNumber || 'N/A'}</td></tr>
      <tr><td><strong>Material</strong></td><td>\${programInfo.material || 'N/A'}</td></tr>
      <tr><td><strong>Machine</strong></td><td>\${programInfo.machine || 'N/A'}</td></tr>
      <tr><td><strong>Estimated Cycle Time</strong></td><td>\${programInfo.cycleTime || 'N/A'}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">🔨 Tool List</div>
    <table>
      <tr>
        <th>Tool #</th>
        <th>Description</th>
        <th>Diameter</th>
        <th>Length Offset</th>
        <th>Notes</th>
      </tr>
      \${(programInfo.tools || []).map(t => \`
        <tr class="tool-row">
          <td>T\${t.number}</td>
          <td>\${t.description}</td>
          <td>\${t.diameter}</td>
          <td>H\${t.lengthOffset}</td>
          <td>\${t.notes || ''}</td>
        </tr>
      \`).join('')}
    </table>
  </div>

  <div class="section">
    <div class="section-title">📐 Work Offsets</div>
    <table>
      <tr><th>Offset</th><th>X</th><th>Y</th><th>Z</th><th>Location</th></tr>
      \${(programInfo.workOffsets || [{offset: 'G54', x: 0, y: 0, z: 0, location: 'Part top center'}]).map(w => \`
        <tr>
          <td>\${w.offset}</td>
          <td>\${w.x}</td>
          <td>\${w.y}</td>
          <td>\${w.z}</td>
          <td>\${w.location}</td>
        </tr>
      \`).join('')}
    </table>
  </div>

  <div class="section">
    <div class="section-title">⚠️ Special Instructions</div>
    <ul>
      \${(programInfo.instructions || ['Verify tool lengths before running', 'Check coolant level']).map(i => \`<li>\${i}</li>\`).join('')}
    </ul>
  </div>

  <div class="section">
    <div class="section-title">✅ Pre-Run Checklist</div>
    <ul>
      <li>☐ All tools loaded and measured</li>
      <li>☐ Work offset verified</li>
      <li>☐ Stock secured in fixture</li>
      <li>☐ Coolant level checked</li>
      <li>☐ Program verified in single block</li>
      <li>☐ First article inspection ready</li>
    </ul>
  </div>
<script src="PRISM_PHASE1_ALGORITHM_LIBRARY.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE1_INTEGRATION.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE2_DATABASE_LIBRARY.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE2_INTEGRATION.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE3_OPTIMIZATION_LIBRARY.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE3_INTEGRATION.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE4_PHYSICS_LIBRARY.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE4_INTEGRATION.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE5_CONTROL_LIBRARY.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE5_INTEGRATION.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE6_ML_LIBRARY.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
<script src="PRISM_PHASE6_INTEGRATION.js">
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

</script>
</body>
</html>
      \`;
    },
    /**
     * Export to various formats
     */
    exportFormats: {
      nc: (gcode, name) => ({ content: gcode, filename: name + '.nc' }),
      tap: (gcode, name) => ({ content: gcode, filename: name + '.tap' }),
      txt: (gcode, name) => ({ content: gcode, filename: name + '.txt' }),
      json: (data, name) => ({ content: JSON.stringify(data, null, 2), filename: name + '.json' }),
      csv: (data, name) => ({ content: PRISM_FINAL_100_PERCENT.outputExport._toCSV(data), filename: name + '.csv' })
    },
    _toCSV(data) {
      if (!Array.isArray(data) || data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const rows = data.map(row => headers.map(h => row[h]).join(','));
      return [headers.join(','), ...rows].join('\n');
    }
  },
  // 2. COMPREHENSIVE PROBING/INSPECTION SYSTEM

  probing: {
    /**
     * Probing cycle database by controller
     */
    cycles: {
      FANUC: {
        singleSurface: { code: 'G65 P9811', desc: 'Single surface probe', params: ['X', 'Y', 'Z', 'F'] },
        webX: { code: 'G65 P9812', desc: 'X web/boss measurement', params: ['X1', 'X2', 'Z', 'F'] },
        webY: { code: 'G65 P9813', desc: 'Y web/boss measurement', params: ['Y1', 'Y2', 'Z', 'F'] },
        pocketX: { code: 'G65 P9814', desc: 'X pocket measurement', params: ['X1', 'X2', 'Z', 'F'] },
        pocketY: { code: 'G65 P9815', desc: 'Y pocket measurement', params: ['Y1', 'Y2', 'Z', 'F'] },
        bore: { code: 'G65 P9816', desc: 'Bore/hole measurement', params: ['D', 'Z', 'F'] },
        boss: { code: 'G65 P9817', desc: 'Boss measurement', params: ['D', 'Z', 'F'] },
        corner: { code: 'G65 P9818', desc: 'Corner probe', params: ['X', 'Y', 'Z', 'F'] },
        angle: { code: 'G65 P9819', desc: 'Angle measurement', params: ['X1', 'Y1', 'X2', 'Y2', 'Z'] },
        toolSetter: { code: 'G65 P9820', desc: 'Tool length measurement', params: ['T', 'H'] },
        workOffset: { code: 'G65 P9821', desc: 'Work offset update', params: ['W', 'X', 'Y', 'Z'] }
      },
      HAAS: {
        singleSurface: { code: 'G65 P9811', desc: 'Protected positioning', params: ['X', 'Y', 'Z'] },
        webX: { code: 'G65 P9812', desc: 'X boss measurement', params: ['T', 'S'] },
        pocketX: { code: 'G65 P9814', desc: 'X pocket center', params: ['T', 'Q', 'R'] },
        bore: { code: 'G65 P9816', desc: 'Bore measurement', params: ['T', 'Q', 'R'] },
        corner: { code: 'G65 P9818', desc: 'Web corner', params: ['T', 'S', 'U', 'V'] },
        toolSetter: { code: 'G65 P9023', desc: 'Tool offset measure', params: ['T', 'H', 'D'] },
        vectorProbe: { code: 'G65 P9822', desc: 'Vector probing', params: ['I', 'J', 'K'] },
        probeCalibrate: { code: 'G65 P9851', desc: 'Probe calibration', params: ['S', 'B'] }
      },
      MAZAK: {
        singleSurface: { code: 'G65 P8000', desc: 'Surface measure', params: ['A', 'X', 'Y', 'Z'] },
        bore: { code: 'G65 P8001', desc: 'Bore center/diameter', params: ['A', 'D', 'Z'] },
        boss: { code: 'G65 P8002', desc: 'Boss center/diameter', params: ['A', 'D', 'Z'] },
        corner: { code: 'G65 P8003', desc: '4-point corner', params: ['A', 'X', 'Y'] },
        toolSetter: { code: 'G65 P8010', desc: 'Tool length set', params: ['T', 'H'] }
      },
      SIEMENS: {
        singleSurface: { code: 'CYCLE977', desc: 'Measure surface', params: ['_MA', '_PROTYPE'] },
        bore: { code: 'CYCLE977', desc: 'Measure hole', params: ['_MA', '_PROTYPE=3'] },
        boss: { code: 'CYCLE977', desc: 'Measure shaft', params: ['_MA', '_PROTYPE=4'] },
        corner: { code: 'CYCLE977', desc: 'Measure corner', params: ['_MA', '_PROTYPE=8'] },
        plane: { code: 'CYCLE977', desc: 'Measure plane', params: ['_MA', '_PROTYPE=14'] },
        toolMeasure: { code: 'CYCLE982', desc: 'Measure tool', params: ['_MESSION'] }
      },
      HEIDENHAIN: {
        singleSurface: { code: 'TCH PROBE 1.0', desc: 'Basic probing', params: ['AXIS', 'DIST', 'FEED'] },
        bore: { code: 'TCH PROBE 5.0', desc: 'Circular groove inside', params: ['SET-UP', 'DIAM', 'DEPTH'] },
        boss: { code: 'TCH PROBE 6.0', desc: 'Circular stud outside', params: ['SET-UP', 'DIAM'] },
        corner: { code: 'TCH PROBE 4.0', desc: 'Set datum in corner', params: ['CORNER', 'DIST1', 'DIST2'] },
        plane: { code: 'TCH PROBE 19.0', desc: 'Measure inclined plane', params: ['NR DATUM', 'ANGLE'] }
      }
    },
    /**
     * Generate probing operation
     */
    generateProbingOp(controller, cycleType, params) {
      const controllerCycles = this.cycles[controller] || this.cycles.FANUC;
      const cycle = controllerCycles[cycleType];

      if (!cycle) {
        return { error: 'Cycle type not found for controller' };
      }
      const gcode = [];
      gcode.push('(PROBING OPERATION: ' + cycle.desc + ')');
      gcode.push('(Controller: ' + controller + ')');
      gcode.push('');
      gcode.push('G65 P9832 (PROBE ON)');
      gcode.push('G00 X' + (params.approachX || 0) + ' Y' + (params.approachY || 0));
      gcode.push('G00 Z' + (params.clearanceZ || 5));
      gcode.push('');

      // Generate cycle call with params
      let cycleCall = cycle.code;
      for (const [key, value] of Object.entries(params)) {
        if (cycle.params.includes(key)) {
          cycleCall += ' ' + key + value;
        }
      }
      gcode.push(cycleCall);
      gcode.push('');
      gcode.push('G65 P9833 (PROBE OFF)');
      gcode.push('G00 Z' + (params.safeZ || 50));

      return {
        gcode: gcode.join('\n'),
        cycle: cycle,
        params: params
      };
    },
    /**
     * Generate inspection report template
     */
    generateInspectionReport(measurements) {
      const report = {
        header: {
          title: 'In-Process Inspection Report',
          date: new Date().toISOString(),
          partNumber: measurements.partNumber || 'N/A',
          operation: measurements.operation || 'N/A',
          inspector: measurements.inspector || 'PRISM System'
        },
        features: [],
        summary: {
          totalFeatures: 0,
          inTolerance: 0,
          outOfTolerance: 0,
          warnings: 0
        }
      };
      for (const m of (measurements.features || [])) {
        const deviation = Math.abs(m.actual - m.nominal);
        const tolerance = m.tolerance || 0.001;
        const status = deviation <= tolerance ? 'PASS' : deviation <= tolerance * 1.5 ? 'WARNING' : 'FAIL';

        report.features.push({
          name: m.name,
          nominal: m.nominal,
          actual: m.actual,
          tolerance: '+/-' + tolerance,
          deviation: deviation.toFixed(4),
          status: status
        });

        report.summary.totalFeatures++;
        if (status === 'PASS') report.summary.inTolerance++;
        else if (status === 'FAIL') report.summary.outOfTolerance++;
        else report.summary.warnings++;
      }
      return report;
    }
  },
  // 3. ENHANCED 5-AXIS RTCP/TCPM AND SINGULARITY AVOIDANCE

  fiveAxis: {
    /**
     * RTCP/TCPM codes by controller
     */
    rtcpCodes: {
      FANUC: {
        enable: 'G43.4',
        enableWithVector: 'G43.5',
        disable: 'G49',
        description: 'Tool Center Point Control',
        params: ['H (length)', 'I J K (vector)']
      },
      HAAS: {
        enable: 'G234',
        disable: 'G49',
        description: 'Dynamic Work Offset',
        params: ['H (length)', 'I J K (vector)']
      },
      MAZAK: {
        enable: 'G43.4',
        disable: 'G49',
        description: 'Tool Center Point Management',
        params: ['H', 'E (smoothing)']
      },
      DMG: {
        enable: 'TRAORI',
        disable: 'TRAFOOF',
        description: 'Transformation Orientation',
        params: []
      },
      SIEMENS: {
        enable: 'TRAORI',
        disable: 'TRAFOOF',
        oriwks: 'ORIWKS',
        orimks: 'ORIMKS',
        description: 'Transformation Orientation',
        params: ['TCARR', 'PATEFX']
      },
      HEIDENHAIN: {
        enable: 'FUNCTION TCPM',
        enableWithFeed: 'FUNCTION TCPM F TCP',
        disable: 'FUNCTION TCPM OFF',
        description: 'Tool Center Point Management',
        params: ['AXIS POS', 'PATHCTRL AXIS']
      },
      OKUMA: {
        enable: 'G169',
        disable: 'G169 D0',
        description: '5-Axis Control Command',
        params: ['D (mode)']
      }
    },
    /**
     * Generate RTCP enable/disable block
     */
    generateRTCP(controller, enable = true, options = {}) {
      const codes = this.rtcpCodes[controller] || this.rtcpCodes.FANUC;
      const gcode = [];

      gcode.push('(' + (enable ? 'ENABLE' : 'DISABLE') + ' RTCP/TCPM)');
      gcode.push('(Controller: ' + controller + ' - ' + codes.description + ')');

      if (enable) {
        if (controller === 'HEIDENHAIN') {
          gcode.push(codes.enable + ' F TCP AXIS POS PATHCTRL AXIS');
        } else if (controller === 'SIEMENS') {
          gcode.push(codes.enable);
          if (options.workpiece) gcode.push(codes.oriwks);
        } else if (controller === 'DMG') {
          gcode.push(codes.enable);
        } else {
          let cmd = codes.enable;
          if (options.lengthOffset) cmd += ' H' + options.lengthOffset;
          if (options.vector) cmd += ' I' + options.vector.i + ' J' + options.vector.j + ' K' + options.vector.k;
          gcode.push(cmd);
        }
      } else {
        gcode.push(codes.disable);
      }
      return gcode.join('\n');
    },
    /**
     * Singularity detection and avoidance
     */
    singularity: {
      /**
       * Detect if a position is near a singularity
       */
      detectSingularity(a, b, c, machineKinematics = 'AC') {
        const warnings = [];

        // Gimbal lock detection (when rotary axes align)
        if (machineKinematics === 'AC' || machineKinematics === 'BC') {
          // A or B axis near 0 or 180 degrees
          const primaryAngle = machineKinematics === 'AC' ? a : b;

          if (Math.abs(primaryAngle) < 2 || Math.abs(primaryAngle - 180) < 2) {
            warnings.push({
              type: 'GIMBAL_LOCK',
              axis: machineKinematics[0],
              angle: primaryAngle,
              message: 'Near gimbal lock position - tool axis parallel to rotary axis',
              severity: 'HIGH'
            });
          }
          // Check for pole crossing (C axis undefined when A/B = 0)
          if (Math.abs(primaryAngle) < 0.5) {
            warnings.push({
              type: 'POLE_SINGULARITY',
              message: 'At pole position - C axis has infinite solutions',
              severity: 'CRITICAL'
            });
          }
        }
        // Check for rapid C axis rotation (often indicates singularity approach)
        if (Math.abs(c) > 170) {
          warnings.push({
            type: 'C_AXIS_LIMIT',
            angle: c,
            message: 'C axis approaching limit - may need rewind',
            severity: 'MEDIUM'
          });
        }
        return {
          nearSingularity: warnings.some(w => w.severity === 'HIGH' || w.severity === 'CRITICAL'),
          warnings: warnings
        };
      },
      /**
       * Calculate alternative tool orientation to avoid singularity
       */
      calculateAlternative(toolVector, machineKinematics = 'AC') {
        const { i, j, k } = toolVector;

        // Primary and secondary solutions
        const solutions = [];

        // Solution 1: Standard
        const a1 = Math.acos(k) * 180 / Math.PI;
        const c1 = Math.atan2(i, j) * 180 / Math.PI;
        solutions.push({ a: a1, c: c1, type: 'primary' });

        // Solution 2: Flip (add 180 to both)
        const a2 = -a1;
        const c2 = c1 + 180;
        solutions.push({ a: a2, c: c2, type: 'flipped' });

        // Solution 3: Alternative rotation direction
        if (a1 < 90) {
          solutions.push({ a: 180 - a1, c: c1 + 180, type: 'alternative' });
        }
        // Filter out solutions near singularities
        const validSolutions = solutions.filter(s => {
          const check = this.detectSingularity(s.a, 0, s.c, machineKinematics);
          return !check.nearSingularity;
        });

        return validSolutions.length > 0 ? validSolutions : solutions;
      },
      /**
       * Generate singularity avoidance toolpath modification
       */
      generateAvoidanceMove(currentPos, targetPos, machineKinematics = 'AC') {
        const gcode = [];

        // Check if target is near singularity
        const targetCheck = this.detectSingularity(targetPos.a, targetPos.b || 0, targetPos.c, machineKinematics);

        if (targetCheck.nearSingularity) {
          gcode.push('(WARNING: Target position near singularity)');
          gcode.push('(Inserting avoidance move)');

          // Calculate intermediate position
          const midA = (currentPos.a + targetPos.a) / 2;
          const safeA = midA < 5 ? 10 : midA; // Stay away from 0 degrees

          gcode.push('(Safe intermediate position)');
          gcode.push('G00 A' + safeA.toFixed(3));
          gcode.push('');
        }
        return gcode.join('\n');
      }
    },
    /**
     * Tilted Work Plane (TWP) / G68.2 support
     */
    tiltedWorkPlane: {
      /**
       * Generate tilted work plane command
       */
      generate(controller, angles, options = {}) {
        const gcode = [];

        gcode.push('(TILTED WORK PLANE)');

        switch (controller) {
          case 'FANUC':
          case 'HAAS':
            gcode.push('G68.2 X0 Y0 Z0 I' + angles.i + ' J' + angles.j + ' K' + angles.k);
            break;
          case 'SIEMENS':
            gcode.push('CYCLE800(1,"",0,57,0,0,0,' + angles.a + ',' + angles.b + ',' + angles.c + ',0,0,0,1)');
            break;
          case 'HEIDENHAIN':
            gcode.push('PLANE SPATIAL SPA' + angles.a + ' SPB' + angles.b + ' SPC' + angles.c + ' STAY');
            break;
          case 'MAZAK':
            gcode.push('G68.2 X0 Y0 Z0 I' + angles.i + ' J' + angles.j + ' K' + angles.k);
            break;
          case 'OKUMA':
            gcode.push('G68 X0 Y0 Z0 I' + angles.i + ' J' + angles.j + ' K' + angles.k);
            break;
          default:
            gcode.push('G68.2 X0 Y0 Z0 I' + angles.i + ' J' + angles.j + ' K' + angles.k);
        }
        return gcode.join('\n');
      },
      /**
       * Cancel tilted work plane
       */
      cancel(controller) {
        switch (controller) {
          case 'FANUC':
          case 'HAAS':
          case 'MAZAK':
          case 'OKUMA':
            return 'G69 (CANCEL TILTED WORK PLANE)';
          case 'SIEMENS':
            return 'CYCLE800() (CANCEL TWP)';
          case 'HEIDENHAIN':
            return 'PLANE RESET (CANCEL TWP)';
          default:
            return 'G69';
        }
      }
    }
  },
  // 4. ADDITIONAL ENHANCEMENTS

  enhancements: {
    /**
     * Carbide grade recommendation
     */
    recommendCarbideGrade(material, operation, conditions) {
      const grades = {
        steel: {
          finishing: 'P10',
          general: 'P20',
          roughing: 'P30',
          interrupted: 'P40'
        },
        stainless: {
          finishing: 'M10',
          general: 'M20',
          roughing: 'M30'
        },
        cast_iron: {
          finishing: 'K10',
          general: 'K20'
        },
        aluminum: {
          all: 'N10'
        },
        superalloy: {
          all: 'S10'
        },
        hardened: {
          all: 'H10'
        }
      };
      const materialGrades = grades[material] || grades.steel;
      return materialGrades[operation] || materialGrades.general || 'P20';
    },
    /**
     * Tool coating recommendation
     */
    recommendCoating(material, speed, application) {
      const coatings = {
        highSpeed: {
          steel: 'AlTiN',
          stainless: 'TiAlN',
          aluminum: 'DLC',
          titanium: 'TiB2',
          cast_iron: 'Al2O3'
        },
        general: {
          steel: 'TiCN',
          stainless: 'TiAlN',
          aluminum: 'TiN',
          titanium: 'TiAlN',
          cast_iron: 'TiN'
        },
        interrupted: {
          steel: 'TiN',
          stainless: 'TiCN',
          all: 'TiN'
        }
      };
      const speedCategory = speed > 500 ? 'highSpeed' : 'general';
      const category = coatings[speedCategory];

      return category[material] || category.all || 'TiN';
    }
  }
}