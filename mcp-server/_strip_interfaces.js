const fs = require('fs');
const filePath = 'C:\\PRISM\\mcp-server\\src\\tools\\cadenceExecutor.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const names = [
  'TodoRefreshResult', 'CheckpointResult', 'ContextPressureResult',
  'CompactionDetectResult', 'ContextCompressResult', 'ErrorLearnResult',
  'ReconResult', 'QualityGateResult', 'AntiRegressionResult',
  'DecisionCaptureResult', 'WarmStartResult', 'VariationCheckResult',
  'SkillHintResult', 'KnowledgeCrossQueryResult', 'ContextPullBackResult',
  'ValidationWarning', 'InputValidationResult', 'ScriptRecommendResult',
  'CompactionSurvivalData'
];

let removed = 0;
for (const name of names) {
  // Match interface NAME { ... } including nested braces up to 2 levels
  const pattern = new RegExp(
    `interface ${name}\\s*\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}`,
    'g'
  );
  const matches = content.match(pattern);
  if (matches) {
    content = content.replace(pattern, `// ${name} — imported from prism-schema`);
    removed++;
    console.log(`  Removed: ${name} (${matches[0].split('\n').length} lines)`);
  } else {
    console.log(`  NOT FOUND: ${name}`);
  }
}

fs.writeFileSync(filePath, content);
console.log(`\nTotal removed: ${removed}/${names.length}`);
