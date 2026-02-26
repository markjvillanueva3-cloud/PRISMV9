#!/usr/bin/env node
/**
 * PRISM Gap Closer — Surgical edits to autoHookWrapper.ts and cadenceExecutor.ts
 * Closes gaps: A1, A2, A3, A4, B2, B3, B5 from system audit
 * 
 * Run: node scripts/close_gaps.js
 */
const fs = require('fs');
const path = require('path');

const HOOK_FILE = path.join(__dirname, '..', 'src', 'tools', 'autoHookWrapper.ts');
const CADENCE_FILE = path.join(__dirname, '..', 'src', 'tools', 'cadenceExecutor.ts');

let hookContent = fs.readFileSync(HOOK_FILE, 'utf-8');
let cadenceContent = fs.readFileSync(CADENCE_FILE, 'utf-8');
let changes = 0;
let skipped = 0;

function track(label, applied) {
  if (applied) { changes++; console.log(`  \u2705 ${label}`); }
  else { skipped++; console.log(`  \u23ed\ufe0f  ${label} (already present or marker not found)`); }
}

console.log('\n=== PRISM Gap Closer ===\n');

// ============================================================================
// GAP-A1: Add prism_atcs to DISPATCHER_HOOK_MAP
// ============================================================================
const a1Marker = '  prism_guard:       { before: "before_read",        after: "after_read",        category: "FILE" },';
if (hookContent.includes(a1Marker) && !hookContent.includes('prism_atcs:')) {
  hookContent = hookContent.replace(a1Marker,
    a1Marker + '\n  prism_atcs:        { before: "before_spawn",       after: "on_complete",       category: "AGENT" },');
  track('GAP-A1: DISPATCHER_HOOK_MAP += prism_atcs', true);
} else { track('GAP-A1: DISPATCHER_HOOK_MAP prism_atcs', false); }

// ============================================================================
// GAP-B3a: Add prism_atcs to skill hints tool list
// ============================================================================
const b3aOld = '["prism_calc", "prism_safety", "prism_thread", "prism_toolpath"]';
const b3aNew = '["prism_calc", "prism_safety", "prism_thread", "prism_toolpath", "prism_atcs"]';
if (hookContent.includes(b3aOld) && !hookContent.includes(b3aNew)) {
  hookContent = hookContent.replace(b3aOld, b3aNew);
  track('GAP-B3a: Skill hints += prism_atcs', true);
} else { track('GAP-B3a: Skill hints prism_atcs', false); }

// ============================================================================
// GAP-B3b: Add prism_atcs to knowledge cross-query tool list
// ============================================================================
const b3bOld = '["prism_calc", "prism_safety", "prism_thread", "prism_data"]';
const b3bNew = '["prism_calc", "prism_safety", "prism_thread", "prism_data", "prism_atcs"]';
if (hookContent.includes(b3bOld) && !hookContent.includes(b3bNew)) {
  hookContent = hookContent.replace(b3bOld, b3bNew);
  track('GAP-B3b: Knowledge cross-query += prism_atcs', true);
} else { track('GAP-B3b: Knowledge cross-query prism_atcs', false); }

// ============================================================================
// GAP-A3: ATCS manifest emergency save on black zone
// ============================================================================
const a3Marker = 'cadence.actions.push("STATE_AUTO_SAVED:BLACK_ZONE");';
if (hookContent.includes(a3Marker) && !hookContent.includes('ATCS_EMERGENCY_SAVED')) {
  hookContent = hookContent.replace(a3Marker,
    a3Marker + `
        // === GAP-A3: ATCS manifest emergency save on black zone ===
        try {
          const atcsDir = "C:\\\\PRISM\\\\autonomous-tasks";
          if (fs.existsSync(atcsDir)) {
            const taskDirs = fs.readdirSync(atcsDir).filter((d: string) => {
              try { return fs.statSync(path.join(atcsDir, d)).isDirectory(); } catch { return false; }
            });
            for (const dir of taskDirs) {
              const mfPath = path.join(atcsDir, dir, "TASK_MANIFEST.json");
              if (fs.existsSync(mfPath)) {
                try {
                  const mf = JSON.parse(fs.readFileSync(mfPath, "utf-8"));
                  if (mf.status === "IN_PROGRESS") {
                    mf.last_emergency_save = new Date().toISOString();
                    mf.emergency_reason = "BLACK_ZONE_CONTEXT_DYING";
                    mf.emergency_call_number = callNum;
                    fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2));
                    cadence.actions.push("ATCS_EMERGENCY_SAVED:" + mf.task_id);
                  }
                } catch { /* manifest parse failed */ }
              }
            }
          }
        } catch { /* ATCS save failed \u2014 non-fatal */ }`);
  track('GAP-A3: ATCS manifest emergency save on black zone', true);
} else { track('GAP-A3: ATCS manifest emergency save', false); }

// ============================================================================
// GAP-A4: Progressive degradation at 25+ and 30+ calls
// ============================================================================
const a4Marker = 'cadence.actions.push("\u26ab CRITICAL: 19+ calls \u2014 SAVE STATE AND END SESSION");';
if (hookContent.includes(a4Marker) && !hookContent.includes('PROGRESSIVE_DEGRADATION')) {
  hookContent = hookContent.replace(a4Marker,
    a4Marker + `
      // === GAP-A4: Progressive degradation at extreme call counts ===
      if (callNum >= 30) {
        currentTruncationCap = 500;
        cadence.actions.push("\ud83d\udc80 PROGRESSIVE_DEGRADATION: 30+ calls, 500B cap \u2014 SESSION MUST END");
      } else if (callNum >= 25) {
        currentTruncationCap = 2000;
        cadence.actions.push("\u26ab PROGRESSIVE_DEGRADATION: 25+ calls, 2KB cap \u2014 WRAP UP NOW");
      }
      cadence.truncation_cap = currentTruncationCap;`);
  track('GAP-A4: Progressive degradation at 25+/30+ calls', true);
} else { track('GAP-A4: Progressive degradation', false); }

// ============================================================================
// GAP-B2: Post-build phase checklist enforcement
// ============================================================================
if (!hookContent.includes('BUILD_SUCCESS') && hookContent.includes('// === SAFETY CHECK:')) {
  const b2Marker = '    // === SAFETY CHECK:';
  hookContent = hookContent.replace(b2Marker,
    `    // === GAP-B2: Post-build phase checklist enforcement ===
    if (toolName === "prism_dev" && action === "build" && !error) {
      try {
        const resultText = result?.content?.[0]?.text;
        if (typeof resultText === "string" && resultText.includes("SUCCESS")) {
          cadence.actions.push("\u2705 BUILD_SUCCESS \u2014 Phase checklist REQUIRED: skills\u2192hooks\u2192GSD\u2192memories\u2192orchestrators\u2192state\u2192scripts");
          const checklistPath = path.join("C:\\\\PRISM\\\\state", "build_checklist.json");
          fs.writeFileSync(checklistPath, JSON.stringify({
            build_at: new Date().toISOString(), build_call: callNum,
            completed: { skills: false, hooks: false, gsd: false, memories: false, orchestrators: false, state: false, scripts: false },
          }, null, 2));
        }
      } catch { /* checklist tracking failed */ }
    }

    ` + b2Marker);
  track('GAP-B2: Post-build phase checklist enforcement', true);
} else { track('GAP-B2: Post-build phase checklist', false); }

// ============================================================================
// GAP-B5: Context pressure token estimation — add system prompt overhead
// ============================================================================
const b5Old = 'const estimatedTokens = Math.round(accumulatedBytes / BYTES_PER_TOKEN);';
const b5New = '// GAP-B5: Include system prompt overhead (~120KB \u2248 30K tokens) in pressure estimation\n    const SYSTEM_PROMPT_OVERHEAD_BYTES = 120000;\n    const estimatedTokens = Math.round((SYSTEM_PROMPT_OVERHEAD_BYTES + accumulatedBytes) / BYTES_PER_TOKEN);';
if (cadenceContent.includes(b5Old) && !cadenceContent.includes('SYSTEM_PROMPT_OVERHEAD_BYTES')) {
  cadenceContent = cadenceContent.replace(b5Old, b5New);
  track('GAP-B5: Context pressure += system prompt overhead (30K tokens)', true);
} else { track('GAP-B5: Context pressure system prompt overhead', false); }

// ============================================================================
// GAP-A2: ATCS auto-resume detection in autoPreTaskRecon
// ============================================================================
const a2Marker = 'if (warnings.length === 0) warnings.push("\u2705 No known pitfalls \u2014 clear to proceed");';
if (cadenceContent.includes(a2Marker) && !cadenceContent.includes('ACTIVE ATCS TASK')) {
  cadenceContent = cadenceContent.replace(a2Marker,
    `// GAP-A2: Check for active ATCS tasks that need resuming
    try {
      const atcsDir = "C:\\\\PRISM\\\\autonomous-tasks";
      if (fs.existsSync(atcsDir)) {
        const taskDirs = fs.readdirSync(atcsDir).filter((d: any) => {
          try { return fs.statSync(path.join(atcsDir, d)).isDirectory(); } catch { return false; }
        });
        for (const dir of taskDirs) {
          const mfPath = path.join(atcsDir, dir, "TASK_MANIFEST.json");
          if (fs.existsSync(mfPath)) {
            try {
              const mf = JSON.parse(fs.readFileSync(mfPath, "utf-8"));
              if (mf.status === "IN_PROGRESS") {
                const pct = mf.progress_pct || "?";
                warnings.push("\ud83d\udd04 ACTIVE ATCS TASK: " + mf.task_id + " \u2014 " + (mf.description || "unnamed") + " (" + pct + "% done). Call prism_atcs action=task_resume to continue.");
              }
            } catch { /* manifest parse failed */ }
          }
        }
      }
    } catch { /* ATCS check failed \u2014 non-fatal */ }

    ` + a2Marker);
  track('GAP-A2: ATCS auto-resume detection at session boot', true);
} else { track('GAP-A2: ATCS auto-resume detection', false); }

// ============================================================================
// WRITE FILES
// ============================================================================
fs.writeFileSync(HOOK_FILE, hookContent, 'utf-8');
fs.writeFileSync(CADENCE_FILE, cadenceContent, 'utf-8');

console.log(`\n=== RESULTS ===`);
console.log(`\u2705 Applied: ${changes}`);
console.log(`\u23ed\ufe0f  Skipped: ${skipped}`);
console.log(`autoHookWrapper.ts: ${hookContent.split('\n').length} lines (was 1151)`);
console.log(`cadenceExecutor.ts: ${cadenceContent.split('\n').length} lines (was 1517)`);
console.log(`\nNext: npm run build && restart Claude Desktop`);
