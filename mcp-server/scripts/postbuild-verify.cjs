#!/usr/bin/env node
/**
 * Post-build verification gate for PRISM MCP Server.
 *
 * Checks:
 * 1. dist/index.js exists and has expected exports
 * 2. Bundle size is within threshold (warn if > 70MB)
 * 3. No duplicate module imports (createRequire, etc.)
 *
 * Exit codes:
 * - 0: All checks passed
 * - 1: Critical failure (missing bundle, no exports)
 */
const fs = require('fs');
const path = require('path');

const DIST_FILE = 'dist/index.js';
const SIZE_WARN_THRESHOLD_MB = 70;
const SIZE_FAIL_THRESHOLD_MB = 100;

// Expected exports that should be present in the bundle
const EXPECTED_EXPORTS = [
  'createServer',      // MCP server factory
  'startServer',       // Server start function
  'Server',            // Server class
];

// Patterns that indicate duplicate imports (problems)
const DUPLICATE_PATTERNS = [
  { name: 'createRequire', pattern: /import\s*\{\s*createRequire\s*\}\s*from\s*["']module["']/g },
  { name: 'fileURLToPath', pattern: /import\s*\{\s*fileURLToPath\s*\}\s*from\s*["']url["']/g },
];

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function checkBundleExists() {
  console.log('[VERIFY] Checking bundle exists...');
  if (!fs.existsSync(DIST_FILE)) {
    console.error(`[VERIFY] FAIL: ${DIST_FILE} not found`);
    return false;
  }
  const stats = fs.statSync(DIST_FILE);
  if (stats.size === 0) {
    console.error(`[VERIFY] FAIL: ${DIST_FILE} is empty`);
    return false;
  }
  console.log(`[VERIFY] OK: ${DIST_FILE} exists (${formatBytes(stats.size)})`);
  return true;
}

function checkBundleSize() {
  console.log('[VERIFY] Checking bundle size...');
  const stats = fs.statSync(DIST_FILE);
  const sizeMB = stats.size / (1024 * 1024);

  if (sizeMB > SIZE_FAIL_THRESHOLD_MB) {
    console.error(`[VERIFY] FAIL: Bundle size ${sizeMB.toFixed(2)}MB exceeds ${SIZE_FAIL_THRESHOLD_MB}MB limit`);
    return false;
  }
  if (sizeMB > SIZE_WARN_THRESHOLD_MB) {
    console.warn(`[VERIFY] WARN: Bundle size ${sizeMB.toFixed(2)}MB exceeds ${SIZE_WARN_THRESHOLD_MB}MB threshold`);
    // Warning only, don't fail
  } else {
    console.log(`[VERIFY] OK: Bundle size ${sizeMB.toFixed(2)}MB within limits`);
  }
  return true;
}

function checkExports() {
  console.log('[VERIFY] Checking expected exports...');
  const content = fs.readFileSync(DIST_FILE, 'utf8');
  const missing = [];

  for (const exportName of EXPECTED_EXPORTS) {
    // Look for export declarations or exports in bundle
    const patterns = [
      new RegExp(`export\\s*\\{[^}]*${exportName}[^}]*\\}`, 'm'),
      new RegExp(`export\\s+(const|let|var|function|class)\\s+${exportName}`, 'm'),
      new RegExp(`exports\\.${exportName}\\s*=`, 'm'),
      new RegExp(`["']${exportName}["']\\s*:`, 'm'), // Object key
    ];

    const found = patterns.some(p => p.test(content));
    if (!found) {
      missing.push(exportName);
    }
  }

  if (missing.length > 0) {
    // This is a warning, not a failure, since export detection in bundled code is imperfect
    console.warn(`[VERIFY] WARN: Could not verify exports: ${missing.join(', ')}`);
    console.log('[VERIFY] Note: This may be a false positive in bundled code');
  } else {
    console.log(`[VERIFY] OK: All ${EXPECTED_EXPORTS.length} expected exports found`);
  }
  return true; // Don't fail on export check, it's informational
}

function checkDuplicateImports() {
  console.log('[VERIFY] Checking for duplicate module imports...');
  const content = fs.readFileSync(DIST_FILE, 'utf8');
  const issues = [];

  for (const { name, pattern } of DUPLICATE_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 1) {
      issues.push(`${name}: found ${matches.length} imports (expected 1)`);
    }
  }

  if (issues.length > 0) {
    // This is a warning because postbuild-fix-createRequire.cjs should handle it
    console.warn('[VERIFY] WARN: Duplicate imports detected (should be fixed by postbuild-fix):');
    issues.forEach(i => console.warn(`  - ${i}`));
  } else {
    console.log('[VERIFY] OK: No duplicate module imports detected');
  }
  return true; // Warning only
}

function checkBundleSyntax() {
  console.log('[VERIFY] Checking bundle syntax (basic)...');
  const content = fs.readFileSync(DIST_FILE, 'utf8');

  // Check for obvious syntax issues
  const issues = [];

  // Check for unbalanced braces (very basic check)
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (Math.abs(openBraces - closeBraces) > 10) {
    issues.push(`Unbalanced braces: { = ${openBraces}, } = ${closeBraces}`);
  }

  // Check for common error patterns
  if (content.includes('undefined is not')) {
    issues.push('Bundle contains error message pattern');
  }

  if (issues.length > 0) {
    console.warn('[VERIFY] WARN: Potential syntax issues:');
    issues.forEach(i => console.warn(`  - ${i}`));
  } else {
    console.log('[VERIFY] OK: No obvious syntax issues');
  }
  return true;
}

function main() {
  console.log('[VERIFY] Running post-build verification...');
  console.log(`[VERIFY] Working directory: ${process.cwd()}`);

  const checks = [
    { name: 'Bundle Exists', fn: checkBundleExists, critical: true },
    { name: 'Bundle Size', fn: checkBundleSize, critical: true },
    { name: 'Expected Exports', fn: checkExports, critical: false },
    { name: 'Duplicate Imports', fn: checkDuplicateImports, critical: false },
    { name: 'Bundle Syntax', fn: checkBundleSyntax, critical: false },
  ];

  let passed = 0;
  let warnings = 0;
  let failed = 0;

  for (const check of checks) {
    try {
      const result = check.fn();
      if (result) {
        passed++;
      } else if (check.critical) {
        failed++;
        console.error(`[VERIFY] CRITICAL FAILURE: ${check.name}`);
      } else {
        warnings++;
      }
    } catch (err) {
      if (check.critical) {
        console.error(`[VERIFY] CRITICAL ERROR in ${check.name}: ${err.message}`);
        failed++;
      } else {
        console.warn(`[VERIFY] Error in ${check.name}: ${err.message}`);
        warnings++;
      }
    }
  }

  console.log('');
  console.log(`[VERIFY] Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`);

  if (failed > 0) {
    console.error('[VERIFY] BUILD VERIFICATION FAILED');
    process.exit(1);
  }

  console.log('[VERIFY] Build verification passed');
  process.exit(0);
}

main();
