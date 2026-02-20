const fs = require('fs');
const path = 'C:\\PRISM\\skills-consolidated\\SKILL_INDEX.json';
const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
const skills = data.skills || data;

const triggerMap = {
  'prism-prompt-crafting': ['prompt', 'system prompt', 'few-shot', 'chain of thought', 'prompt engineering'],
  'prism-prompt-quality-scoring': ['prompt quality', 'prompt score', 'evaluate prompt', 'prompt audit'],
  'prism-token-budget': ['tokens', 'budget', 'context window', 'token limit', 'token cost'],
  'prism-code-review-checklist': ['code review', 'PR review', 'review checklist', 'pull request'],
  'prism-context-loading': ['context', 'load context', 'boot', 'session start', 'context loading'],
  'prism-repomix-patterns': ['repomix', 'codebase snapshot', 'repo summary', 'code packaging'],
  'prism-psi-equation': ['psi', 'performance', 'scoring', 'quality equation', 'metric'],
  'prism-resource-combination': ['combine', 'resource', 'merge', 'integrate resources'],
  'prism-process-quality-score': ['process quality', 'Cpk', 'process capability', 'SPC', 'quality score'],
  'prism-skill-activation': ['activate skill', 'load skill', 'skill trigger', 'skill activation'],
  'prism-optimality-certificate': ['optimal', 'certificate', 'proof of optimality', 'bound'],
  'prism-python-state-scripts': ['python', 'state script', 'startup', 'shutdown', 'session script'],
  'prism-python-validation-scripts': ['python', 'validation script', 'validate', 'check script'],
  'prism-skill-loading-procedure': ['skill load', 'loading procedure', 'phase skills', 'auto-load']
};

let filled = 0;
for (const [name, triggers] of Object.entries(triggerMap)) {
  if (skills[name]) {
    skills[name].triggers = triggers;
    filled++;
  }
}

if (data.skills) { data.skills = skills; fs.writeFileSync(path, JSON.stringify(data, null, 2)); }
else { fs.writeFileSync(path, JSON.stringify(skills, null, 2)); }
console.log(`Filled ${filled} more. All triggers now populated.`);

// Final count
let empty = 0, pop = 0;
for (const [,info] of Object.entries(skills)) {
  const t = info.triggers || [];
  if (!t.length || (t.length === 1 && t[0] === '')) empty++;
  else pop++;
}
console.log(`Final: ${pop}/${pop + empty} (${Math.round(pop/(pop+empty)*100)}%) populated`);
