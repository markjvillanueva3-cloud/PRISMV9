const fs = require('fs');
const code = fs.readFileSync('src/tools/dispatchers/spDispatcher.ts', 'utf8');

const checks = [
  // Brainstorm engine presence
  { name: 'runBrainstorm function', pattern: 'async function runBrainstorm' },
  { name: 'BrainstormConfig type', pattern: 'interface BrainstormConfig' },
  { name: 'BrainstormResult type', pattern: 'interface BrainstormResult' },
  
  // 3 depth modes
  { name: 'Quick mode', pattern: "depth === \"quick\"" },
  { name: 'Standard mode (API)', pattern: 'parallelAPICalls(lensPrompts)' },
  { name: 'Deep mode (Opus synthesis)', pattern: "depth === \"deep\"" },
  
  // PRISM grounding
  { name: 'Skill registry search', pattern: 'skillRegistry.search' },
  { name: 'Formula registry search', pattern: 'formulaRegistry.search' },
  { name: 'Knowledge cross-query', pattern: 'knowledgeEngine.crossQuery' },
  
  // 7 Superpowers Lenses
  { name: 'SEVEN_LENSES array', pattern: 'SEVEN_LENSES' },
  { name: 'CHALLENGE lens', pattern: 'CHALLENGE' },
  { name: 'MULTIPLY lens', pattern: 'MULTIPLY' },
  { name: 'INVERT lens', pattern: 'INVERT' },
  { name: 'FUSE lens', pattern: 'FUSE' },
  { name: 'TENX lens', pattern: 'TENX' },
  { name: 'SIMPLIFY lens', pattern: 'SIMPLIFY' },
  { name: 'FUTURE lens', pattern: 'FUTURE' },
  
  // Output structure
  { name: 'domain_context output', pattern: 'domain_context' },
  { name: 'synthesis output', pattern: 'recommended_approach' },
  { name: 'gap_inventory output', pattern: 'gap_inventory' },
  { name: 'risk_matrix output', pattern: 'risk_matrix' },
  { name: 'phased_plan output', pattern: 'phased_plan' },
  
  // Fallbacks
  { name: 'API key fallback', pattern: 'hasValidApiKey' },
  { name: 'Domain detection', pattern: 'detectDomain' },
  { name: 'Quick lens fallback', pattern: 'generateQuickLenses' },
  
  // Hook integration
  { name: 'Hook fires on brainstorm', pattern: 'CALC-BEFORE-EXEC-001' },
  
  // Case wiring
  { name: 'Case calls runBrainstorm', pattern: 'runBrainstorm({' },
];

let passed = 0;
console.log('\n=== BRAINSTORM ENHANCEMENT VALIDATION ===\n');
checks.forEach(c => {
  const found = code.includes(c.pattern);
  if (found) passed++;
  console.log(`${found ? '✅' : '❌'} ${c.name}`);
});
console.log(`\n=== RESULT: ${passed}/${checks.length} checks passed ===`);
