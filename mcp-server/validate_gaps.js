const fs = require('fs');
const code = fs.readFileSync('src/tools/dispatchers/autonomousDispatcher.ts', 'utf8');

const gaps = [
  { id: 'G1', name: 'Auto-Dispatch', pattern: 'executeUnit' },
  { id: 'G2', name: 'Agent-to-Unit Mapping', pattern: 'TIER_MAP' },
  { id: 'G3', name: 'Result Collection', pattern: 'writeATCSUnitOutput' },
  { id: 'G4', name: 'Prompt Engineering', pattern: 'buildUnitPrompt' },
  { id: 'G5', name: 'Execution Mode', pattern: 'execution_strategy' },
  { id: 'G6', name: 'Tool Access Hybrid', pattern: 'tool_budget' },
  { id: 'G7', name: 'Context Window', pattern: 'buildContextPackage' },
  { id: 'G8', name: 'Knowledge Injection', pattern: 'MATERIAL_SCHEMA' },
  { id: 'G9', name: 'Mfg Prompts', pattern: 'CNC manufacturing' },
  { id: 'G10', name: 'Quality Pipeline', pattern: 'auto_validate' },
  { id: 'G11', name: 'Safety Escalation', pattern: 'checkSafetyCritical' },
  { id: 'G12', name: 'Circuit Breaker', pattern: 'circuit_breaker' },
  { id: 'G13', name: 'Audit Trail', pattern: 'writeAuditEntry' },
  { id: 'G14', name: 'Anti-Regression', pattern: 'anti_regression' },
  { id: 'G15', name: 'Concurrency', pattern: 'sequential' },
  { id: 'G16', name: 'Rate Limiting', pattern: 'rate_limit_ms' },
  { id: 'G17', name: 'Background Model', pattern: 'chunk_size' },
  { id: 'G18', name: 'Session Recovery', pattern: 'auto_pause' },
  { id: 'G19', name: 'Context Pressure', pattern: 'written to disk' },
  { id: 'G20', name: 'Architecture', pattern: 'registerAutonomousDispatcher' },
  { id: 'G21', name: 'Swarm Patterns', pattern: 'SWARM_PATTERN_MAP' },
  { id: 'G22', name: 'Manus Retention', pattern: 'backend' },
  { id: 'G23', name: 'Testing Framework', pattern: 'dry_run' },
];

const results = gaps.map(g => ({
  gap: g.id,
  name: g.name,
  found: code.includes(g.pattern),
  pattern: g.pattern
}));

const covered = results.filter(r => r.found).length;
const missing = results.filter(r => !r.found);

console.log(`\n=== GAP COVERAGE: ${covered}/${gaps.length} ===\n`);
if (missing.length > 0) {
  console.log('MISSING:');
  missing.forEach(m => console.log(`  ❌ ${m.gap}: ${m.name} (pattern: ${m.pattern})`));
} else {
  console.log('✅ ALL 23 GAPS COVERED');
}
console.log('');
results.forEach(r => console.log(`${r.found ? '✅' : '❌'} ${r.gap}: ${r.name}`));
