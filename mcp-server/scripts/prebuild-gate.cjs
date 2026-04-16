#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = process.cwd();
const STATE_DIR = path.resolve(BASE, '..', 'state');
const SNAPSHOT_FILE = path.join(STATE_DIR, 'pre_build_snapshot.json');

// ── Extraction Pipeline Enforcement ──────────────────────────────────
function checkExtractionPipeline() {
  const errors = [];
  const warnings = [];

  // Skip if explicitly disabled
  if (process.env.SKIP_EXTRACTION_ENFORCE === '1') {
    console.log('[PREBUILD] Extraction enforcement skipped (SKIP_EXTRACTION_ENFORCE=1)');
    return { errors: [], warnings: ['Extraction enforcement bypassed'] };
  }

  // Check for pending extraction files
  const extractionDirs = [
    'data/extracted-knowledge/hypermill',
    'data/extracted-knowledge/hypermill-api',
    'data/extracted-knowledge/hypermill-workflows',
    'data/extracted-knowledge/hypercad',
  ];

  const stateFile = path.join(BASE, 'data/state/extraction-ingestion-state.json');
  let processedFiles = [];
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      processedFiles = state.files_processed || [];
    } catch { /* corrupted */ }
  }

  // Normalize paths for comparison (case-insensitive on Windows)
  const normalizedProcessed = new Set(processedFiles.map(p => path.normalize(p).toLowerCase()));

  let pendingCount = 0;
  for (const dir of extractionDirs) {
    const fullDir = path.join(BASE, dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const fullPath = path.normalize(path.join(fullDir, file));
      if (!normalizedProcessed.has(fullPath.toLowerCase())) pendingCount++;
    }
  }

  if (pendingCount > 0) {
    errors.push(`EXTRACTION: ${pendingCount} files pending ingestion. Run: prism_hook:run_ingestion`);
  }

  // Check workflow templates exist
  const workflowDir = path.join(BASE, 'data/extracted-knowledge/hypermill-workflows');
  if (fs.existsSync(workflowDir)) {
    const files = fs.readdirSync(workflowDir).filter(f => f.startsWith('hypermill-workflows-'));
    if (files.length === 0) {
      warnings.push('EXTRACTION: No workflow templates found. Run extraction scripts.');
    }
  }

  // Check engine wiring files exist
  const requiredFiles = [
    'src/engines/WorkflowTemplateEngine.ts',
    'src/engines/WorkflowIntegrationHelper.ts',
    'src/data/extractedKnowledgeBridge.ts',
  ];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(BASE, file))) {
      errors.push(`EXTRACTION: Missing engine file: ${file}`);
    }
  }

  return { errors, warnings };
}

const CRITICAL_FILES = [
  'src/types/pfp-types.ts',
  'src/engines/PFPEngine.ts',
  'src/engines/PredictiveFailureEngine.ts',
  'src/engines/CollisionEngine.ts',
  'src/engines/SpindleProtectionEngine.ts',
  'src/engines/CoolantValidationEngine.ts',
  'src/engines/ToolBreakageEngine.ts',
  'src/engines/WorkholdingEngine.ts',
  'src/engines/ManufacturingCalculations.ts',
  'src/engines/AdvancedCalculations.ts',
  'src/engines/ThreadCalculationEngine.ts',
  'src/engines/ToolpathCalculations.ts',
  'src/tools/dispatchers/safetyDispatcher.ts',
  'src/tools/dispatchers/calcDispatcher.ts',
  'src/tools/dispatchers/threadDispatcher.ts',
  'src/tools/dispatchers/toolpathDispatcher.ts',
  'src/tools/dispatchers/pfpDispatcher.ts',
];

function hashFile(fp) {
  try { return crypto.createHash('md5').update(fs.readFileSync(fp)).digest('hex'); }
  catch { return null; }
}

function main() {
  console.log('[PREBUILD] Running pre-build gate...');
  const errors = [];
  const warnings = [];

  // ── Critical File Check ──
  for (const f of CRITICAL_FILES) {
    const fp = path.join(BASE, f);
    if (!fs.existsSync(fp)) errors.push(`CRITICAL: Missing safety file: ${f}`);
    else if (fs.statSync(fp).size === 0) errors.push(`CRITICAL: Empty safety file: ${f}`);
  }

  // ── Extraction Pipeline Enforcement ──
  const extractionResult = checkExtractionPipeline();
  errors.push(...extractionResult.errors);
  warnings.push(...extractionResult.warnings);
  if (fs.existsSync(SNAPSHOT_FILE)) {
    const prev = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
    for (const [file, prevHash] of Object.entries(prev.hashes || {})) {
      if (hashFile(path.join(BASE, file)) === null && prevHash !== null)
        errors.push(`REGRESSION: File disappeared: ${file}`);
    }
  }
  const hashes = {};
  for (const f of CRITICAL_FILES) hashes[f] = hashFile(path.join(BASE, f));
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify({ timestamp: new Date().toISOString(), hashes, count: CRITICAL_FILES.length }, null, 2));
  // Log warnings (non-blocking)
  if (warnings.length > 0) {
    console.warn('[PREBUILD] Warnings:');
    warnings.forEach(w => console.warn(`  ⚠ ${w}`));
  }

  // Block on errors
  if (errors.length > 0) {
    console.error('[PREBUILD] GATE FAILED:');
    errors.forEach(e => console.error(`  ✗ ${e}`));
    process.exit(1);
  }

  console.log(`[PREBUILD] Gate passed. ${CRITICAL_FILES.length} critical files verified, extraction pipeline OK.`);
}
main();
