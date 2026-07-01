#!/usr/bin/env node
/**
 * PRISM System Audit Gap Closer
 * Applies surgical edits to autoHookWrapper.ts and cadenceExecutor.ts
 * to close all Critical and High gaps from the Session 48 audit.
 *
 * Gaps closed:
 *   A1: DISPATCHER_HOOK_MAP missing prism_atcs
 *   A2: ATCS auto-resume at session boot
 *   A3: ATCS manifest checkpoint on black zone
 *   A4: Progressive degradation at 25+ calls
 *   B2: Post-build phase checklist enforcement
 *   B3: Skill hints + knowledge cross-query for ATCS
 *   B5: Context pressure token estimation fix
 *
 * Usage: node scripts/close_audit_gaps.js
 */
const fs = require('fs');
const path = require('path');

let editsApplied = 0;
let editsSkipped = 0;

function applyEdit(filePath, marker, insertion, position = 'after', label = '') {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes(insertion.trim().split('\n')[0])) {
    console.log(`  SKIP: ${label} (already present)`);
    editsSkipped++;
    return content;
  }
  const idx = content.indexOf(marker);
  if (idx === -1) {
    console.error(`  ERROR: Marker not found for ${label}: "${marker.slice(0, 60)}..."`);
    return content;
  }
  if (position === 'after') {
    const endOfLine = content.indexOf('\n', idx + marker.length);
    content = content.slice(0, endOfLine + 1) + insertion + content.slice(endOfLine + 1);
  } else if (position === 'before') {
    const lineStart = content.lastIndexOf('\n', idx);
    content = content.slice(0, lineStart + 1) + insertion + content.slice(lineStart + 1);
  } else if (position === 'replace') {
    content = content.replace(marker, insertion);
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  APPLIED: ${label}`);
  editsApplied++;
  return content;
}

// ============================================================================
// FILE 1: autoHookWrapper.ts
// ============================================================================
const hookFile = path.join(__dirname, '..', 'src', 'tools', 'autoHookWrapper.ts');
console.log('\n=== autoHookWrapper.ts ===' );

// GAP-A1: Add prism_atcs to DISPATCHER_HOOK_MAP
applyEdit(hookFile,
  'prism_guard:       { before: "before_read",        after: "after_read",        category: "FILE" },',
  '  prism_atcs:        { before: "before_spawn",       after: "on_complete",       category: "AGENT" },\n',
  'after', 'GAP-A1: DISPATCHER_HOOK_MAP += prism_atcs');

// GAP-B3a: Add prism_atcs to skill hints tool list
applyEdit(hookFile,
  '["prism_calc", "prism_safety", "prism_thread", "prism_toolpath"].includes(toolName)',
  '["prism_calc", "prism_safety", "prism_thread", "prism_toolpath", "prism_atcs"].includes(toolName)',
  'replace', 'GAP-B3a: Skill hints += prism_atcs');

// GAP-B3b: Add prism_atcs to knowledge cross-query tool list
applyEdit(hookFile,
  '["prism_calc", "prism_safety", "prism_thread", "prism_data"].includes(toolName)',
  '["prism_calc", "prism_safety", "prism_thread", "prism_data", "prism_atcs"].includes(toolName)',
  'replace', 'GAP-B3b: Knowledge cross-query += prism_atcs');

// GAP-A3: Add ATCS manifest save to black zone handler
applyEdit(hookFile,
  'cadence.actions.push("STATE_AUTO_SAVED:BLACK_ZONE");',
  `        // GAP-A3: Also checkpoint any active ATCS task on black zone
        try {
          const atcsDir = "C:\\\\PRISM\\\\autonomous-tasks";
          if (fs.existsSync(atcsDir)) {
            const taskDirs = fs.readdirSync(atcsDir).filter((d: string) => {
              try { return fs.statSync(path.join(atcsDir, d)).isDirectory(); } catch { return false; }
            });
            for (const dir of taskDirs) {
              const manifestPath = path.join(atcsDir, dir, "TASK_MANIFEST.json");
              if (fs.existsSync(manifestPath)) {
                try {
                  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
                  if (manifest.status === "IN_PROGRESS") {
                    manifest.last_emergency_save = new Date().toISOString();
                    manifest.emergency_reason = "BLACK_ZONE_CONTEXT_DYING";
                    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
                    cadence.actions.push("ATCS_EMERGENCY_SAVED:" + manifest.task_id);
                  }
                } catch { /* manifest parse failed */ }
              }
            }
          }
        } catch { /* ATCS save failed — non-fatal */ }\n`,
  'after', 'GAP-A3: ATCS manifest save on black zone');

// GAP-A4: Progressive degradation at 25+ and 30+ calls
applyEdit(hookFile,
  'cadence.actions.push("\u26ab CRITICAL: 19+ calls \u2014 SAVE STATE AND END SESSION");',
  `      // GAP-A4: Progressive degradation
      if (callNum >= 30) {
        currentTruncationCap = 500; // 500B — minimal summaries only
        cadence.actions.push("\u26ab\u26ab SESSION_DEGRADED: 30+ calls \u2014 results truncated to 500B. END NOW.");
      } else if (callNum >= 25) {
        currentTruncationCap = 2000; // 2KB — heavily truncated
        cadence.actions.push("\u26ab SESSION_DEGRADING: 25+ calls \u2014 results truncated to 2KB. Save and end.");
      }\n`,
  'after', 'GAP-A4: Progressive degradation at 25+/30+ calls');

// GAP-B2: Post-build phase checklist enforcement
applyEdit(hookFile,
  'if (mapping) {\n      await fireHook(`${mapping.category}-AFTER-EXEC-001`,',
  `    // GAP-B2: Post-build phase checklist enforcement
    if (toolName === "prism_dev" && action === "build" && !error) {
      try {
        const resultText = result?.content?.[0]?.text;
        if (typeof resultText === "string" && resultText.includes("SUCCESS")) {
          cadence.actions.push("\u2705 BUILD_SUCCESS \u2014 Phase checklist REQUIRED: skills\u2192hooks\u2192GSD\u2192memories\u2192orchestrators\u2192state\u2192scripts");
          // Write checklist state so subsequent calls can track
          const checklistPath = path.join("C:\\\\PRISM\\\\state", "build_checklist.json");
          const checklist = {
            build_at: new Date().toISOString(),
            build_call: callNum,
            completed: { skills: false, hooks: false, gsd: false, memories: false, orchestrators: false, state: false, scripts: false },
          };
          fs.writeFileSync(checklistPath, JSON.stringify(checklist, null, 2));
        }
      } catch { /* checklist tracking failed */ }
    }\n\n`,
  'before', 'GAP-B2: Post-build phase checklist');


// ============================================================================
// FILE 2: cadenceExecutor.ts
// ============================================================================
const cadenceFile = path.join(__dirname, '..', 'src', 'tools', 'cadenceExecutor.ts');
console.log('\n=== cadenceExecutor.ts ===');

// GAP-B5: Fix context pressure token estimation — add system prompt overhead
applyEdit(cadenceFile,
  'const estimatedTokens = Math.round(accumulatedBytes / BYTES_PER_TOKEN);',
  '    // GAP-B5: Include system prompt overhead (~30K tokens) in estimation\n    const SYSTEM_PROMPT_TOKENS = 30000;\n    const estimatedTokens = Math.round(accumulatedBytes / BYTES_PER_TOKEN) + SYSTEM_PROMPT_TOKENS;',
  'replace', 'GAP-B5: Context pressure += system prompt overhead');

// GAP-A2: Add ATCS auto-resume check to autoPreTaskRecon
applyEdit(cadenceFile,
  'if (warnings.length === 0) warnings.push("\u2705 No known pitfalls \u2014 clear to proceed");',
  `    // GAP-A2: Check for active ATCS tasks that need resuming
    try {
      const atcsDir = "C:\\\\PRISM\\\\autonomous-tasks";
      if (fs.existsSync(atcsDir)) {
        const taskDirs = fs.readdirSync(atcsDir).filter((d) => {
          try { return fs.statSync(path.join(atcsDir, d)).isDirectory(); } catch { return false; }
        });
        for (const dir of taskDirs) {
          const manifestPath = path.join(atcsDir, dir, "TASK_MANIFEST.json");
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
              if (manifest.status === "IN_PROGRESS") {
                const pct = manifest.progress_pct || "?";
                warnings.push("\ud83d\udd04 ACTIVE ATCS TASK: " + manifest.task_id + " \u2014 " + (manifest.description || "unnamed") + " (" + pct + "% done). Call prism_atcs task_resume to continue.");
              }
            } catch { /* manifest parse failed */ }
          }
        }
      }
    } catch { /* ATCS check failed \u2014 non-fatal */ }\n\n`,
  'before', 'GAP-A2: ATCS auto-resume detection at boot');


// ============================================================================
// SUMMARY
// ============================================================================
console.log(`\n=== SUMMARY ===`);
console.log(`Applied: ${editsApplied}`);
console.log(`Skipped: ${editsSkipped} (already present)`);
console.log(`\nNext: npm run build && restart Claude Desktop`);
