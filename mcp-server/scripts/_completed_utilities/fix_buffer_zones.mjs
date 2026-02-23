import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const filePath = join(root, 'src', 'tools', 'autoHookWrapper.ts');
let code = readFileSync(filePath, 'utf-8');
const before = code.length;

// Replace the primary buffer zone block (callNum >= 19 with PROGRESSIVE_DEGRADATION caps)
const oldBlock = `    if (callNum >= 19) {
      cadence.actions.push("\\u26AB CRITICAL: 19+ calls \\u2014 SAVE STATE AND END SESSION");
      if (callNum >= 30) {
        currentTruncationCap = 500;
        cadence.actions.push("\\u{1F480} PROGRESSIVE_DEGRADATION: 30+ calls, 500B cap \\u2014 SESSION MUST END");
      } else if (callNum >= 25) {
        currentTruncationCap = 2e3;
        cadence.actions.push("\\u26AB PROGRESSIVE_DEGRADATION: 25+ calls, 2KB cap \\u2014 WRAP UP NOW");
      }
      cadence.truncation_cap = currentTruncationCap;`;

const newBlock = `    // BUFFER ZONES — PRESSURE-FIRST ARCHITECTURE (v2, 2026-02-10)
    // Truncation caps governed SOLELY by pressure-based system (every 8 calls).
    // Call-count zones: advisory warnings + auto-save ONLY. NO cap overrides.
    if (callNum >= 41) {
      cadence.actions.push("\u26ab ADVISORY: 41+ calls \u2014 consider checkpoint if pressure is rising");`;

if (code.includes('callNum >= 19')) {
  // Find and replace using line-by-line matching for exactness
  const lines = code.split('\n');
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('if (callNum >= 19)') && lines[i+1]?.includes('CRITICAL: 19+')) {
      startIdx = i;
      break;
    }
  }
  if (startIdx >= 0) {
    // Find the end of the cap block (line with cadence.truncation_cap)
    let endIdx = startIdx;
    for (let i = startIdx; i < Math.min(startIdx + 15, lines.length); i++) {
      if (lines[i].includes('cadence.truncation_cap = currentTruncationCap')) {
        endIdx = i;
        break;
      }
    }
    // Replace the block
    const newLines = [
      '    // BUFFER ZONES \u2014 PRESSURE-FIRST ARCHITECTURE (v2, 2026-02-10)',
      '    // Truncation caps governed SOLELY by pressure-based system (every 8 calls).',
      '    // Call-count zones: advisory warnings + auto-save ONLY. NO cap overrides.',
      '    if (callNum >= 41) {',
      '      cadence.actions.push("\u26ab ADVISORY: 41+ calls \u2014 consider checkpoint if pressure is rising");',
    ];
    lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
    
    // Also fix the auto_save_reason
    code = lines.join('\n');
    code = code.replace('BLACK_ZONE_19+_calls', 'HIGH_CALL_COUNT_41+');
    code = code.replace('STATE_AUTO_SAVED:BLACK_ZONE', 'STATE_AUTO_SAVED:HIGH_CALLS');
    code = code.replace('BLACK_ZONE_CONTEXT_DYING', 'HIGH_CALL_COUNT');
    
    writeFileSync(filePath, code);
    console.log('FIXED buffer zones at line', startIdx);
    console.log('Removed', endIdx - startIdx + 1, 'lines, replaced with', newLines.length);
  } else {
    console.log('ERROR: Could not find callNum >= 19 block');
  }
} else {
  console.log('Already fixed (no callNum >= 19 found)');
}

console.log('Lines:', code.split('\n').length);
console.log('Has PROGRESSIVE_DEGRADATION:', code.includes('PROGRESSIVE_DEGRADATION'));
console.log('Has callNum >= 41:', code.includes('callNum >= 41'));
console.log('Has callNum >= 19 (should be false):', code.includes('callNum >= 19'));

// Now real build
try {
  const out = execSync('npx esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js --format=cjs --external:@modelcontextprotocol/sdk', 
    { cwd: root, timeout: 30000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('BUILD SUCCESS');
} catch (e) {
  console.error('BUILD FAILED:', e.stderr?.toString().slice(0, 300) || e.message);
  process.exit(1);
}
