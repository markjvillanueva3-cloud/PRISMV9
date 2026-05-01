import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '..', 'src', 'tools', 'autoHookWrapper.ts');
let code = readFileSync(filePath, 'utf-8');

// Fix 1: Remove getCurrentPressurePct from cadenceExecutor import
code = code.replace(
  `  autoContextCompress, autoCompactionDetect, autoCompactionSurvival,
  rehydrateFromSurvival, autoAttentionScore, autoContextPullBack,
  getCurrentPressurePct
} from "./cadenceExecutor.js";`,
  `  autoContextCompress, autoCompactionDetect, autoCompactionSurvival,
  rehydrateFromSurvival, autoAttentionScore, autoContextPullBack
} from "./cadenceExecutor.js";`
);

// Fix 2: Add getCurrentPressurePct to responseSlimmer import
code = code.replace(
  `import { slimJsonResponse, slimCadence, getSlimLevel } from "../utils/responseSlimmer.js";`,
  `import { slimJsonResponse, slimCadence, getSlimLevel, getCurrentPressurePct } from "../utils/responseSlimmer.js";`
);

writeFileSync(filePath, code);
console.log('Fixed imports in autoHookWrapper.ts');
console.log('Lines:', code.split('\n').length);

// Verify
if (code.includes('getCurrentPressurePct') && !code.includes('getCurrentPressurePct\n} from "./cadenceExecutor')) {
  console.log('OK: getCurrentPressurePct moved to responseSlimmer import');
} else {
  console.log('FAIL: import fix may not have applied correctly');
}
