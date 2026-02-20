const fs = require('fs');
const path = 'C:\\PRISM\\skills-consolidated\\SKILL_INDEX.json';
const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
const skills = data.skills || data;

// Trigger mappings for empty skills based on their names and purposes
const triggerMap = {
  'prism-async-patterns': ['async', 'parallel', 'concurrent', 'promise', 'agent_parallel', 'swarm'],
  'prism-combination-engine': ['combination', 'ILP', 'optimize', 'combination_ilp', 'constraint'],
  'prism-edm-operations': ['EDM', 'electrical discharge', 'wire EDM', 'sinker EDM', 'spark erosion'],
  'prism-efficiency-controller': ['efficiency', 'throughput', 'bottleneck', 'cycle time', 'utilization'],
  'prism-fanuc-programming': ['FANUC', 'fanuc', 'G-code', 'M-code', 'CNC program', 'macro B'],
  'prism-hook-system': ['hook', 'hooks', 'hook_system', 'event', 'middleware', 'pre-output'],
  'prism-resource-optimizer': ['resource', 'optimize', 'allocation', 'scheduling', 'capacity'],
  'prism-sp-brainstorm': ['brainstorm', 'ideate', 'explore', 'alternatives', 'creative'],
  'prism-sp-debugging': ['debug', 'error', 'trace', 'diagnose', 'bug', 'stack trace'],
  'prism-sp-execution': ['execute', 'implement', 'build', 'code', 'develop'],
  'prism-sp-handoff': ['handoff', 'transition', 'delegate', 'transfer', 'hand off'],
  'prism-sp-planning': ['plan', 'roadmap', 'strategy', 'milestone', 'decompose'],
  'prism-sp-review-quality': ['quality', 'review', 'audit', 'inspect', 'QA'],
  'prism-sp-review-spec': ['spec', 'specification', 'requirements', 'criteria', 'acceptance'],
  'prism-sp-verification': ['verify', 'validate', 'check', 'confirm', 'test'],
  'prism-speed-feed-engine': ['speed', 'feed', 'SFM', 'IPR', 'cutting speed', 'feed rate', 'speed_feed'],
  'prism-synergy-calculator': ['synergy', 'score', 'integration', 'compatibility'],
  'prism-tool-holder-schema': ['tool holder', 'toolholder', 'BT40', 'CAT40', 'HSK', 'collet', 'chuck'],
  'prism-validation-unified': ['validate', 'validation', 'safety', 'check', 'gate', 'threshold'],
  'skill-authoring-checklist': ['skill', 'author', 'create skill', 'write skill', 'skill template'],
  'prism-algorithm-decision-tree': ['algorithm', 'decision tree', 'select algorithm', 'which algorithm'],
  'prism-algorithm-selector': ['algorithm', 'selector', 'choose', 'optimize method'],
  'prism-api-lifecycle': ['API', 'endpoint', 'REST', 'lifecycle', 'deprecate'],
  'prism-batch-efficiency': ['batch', 'bulk', 'parallel', 'throughput', 'mass operation'],
  'prism-batch-execution': ['batch', 'execute batch', 'queue', 'bulk process'],
  'prism-cache-selection': ['cache', 'caching', 'memoize', 'TTL', 'invalidate'],
  'prism-caching-patterns': ['cache', 'LRU', 'TTL', 'warm cache', 'cache miss'],
  'prism-capability-scoring': ['capability', 'score', 'rank', 'evaluate', 'benchmark'],
  'prism-claude-code-bridge': ['Claude Code', 'CC', 'bridge', 'worktree', 'subagent'],
  'prism-code-safety': ['code safety', 'injection', 'sanitize', 'secure code'],
  'prism-codebase-health': ['health', 'codebase', 'tech debt', 'lint', 'complexity'],
  'prism-codebase-packaging': ['package', 'bundle', 'distribute', 'npm pack', 'archive'],
  'prism-compliance-guide': ['compliance', 'ISO', 'AS9100', 'ITAR', 'FDA', 'regulatory'],
  'prism-cross-domain-synthesizer': ['cross-domain', 'synthesize', 'multi-domain', 'integrate'],
  'prism-knowledge-base': ['knowledge', 'lookup', 'reference', 'encyclopedia', 'database'],
  'prism-knowledge-graph': ['knowledge graph', 'graph', 'relationship', 'node', 'edge'],
  'prism-large-file-writer': ['large file', 'big file', 'chunk write', 'stream write'],
  'prism-output-standards': ['output', 'format', 'standard', 'template', 'style guide']
};

let filled = 0;
for (const [name, triggers] of Object.entries(triggerMap)) {
  if (skills[name]) {
    const existing = skills[name].triggers || [];
    if (!existing.length || (existing.length === 1 && existing[0] === '')) {
      skills[name].triggers = triggers;
      filled++;
    }
  }
}

// Write back
if (data.skills) {
  data.skills = skills;
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
} else {
  fs.writeFileSync(path, JSON.stringify(skills, null, 2));
}
console.log(`Filled triggers for ${filled} skills`);

// Verify
let empty = 0, pop = 0;
for (const [name, info] of Object.entries(skills)) {
  const t = info.triggers || [];
  if (!t.length || (t.length === 1 && t[0] === '')) empty++;
  else pop++;
}
console.log(`Final: ${pop} populated, ${empty} empty out of ${pop + empty} total`);
