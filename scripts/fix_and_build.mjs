import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const filePath = join(root, 'src', 'tools', 'autoHookWrapper.ts');
let code = readFileSync(filePath, 'utf-8');

// Fix 1: Remove getCurrentPressurePct from cadenceExecutor import
code = code.replace(
  /getCurrentPressurePct\n\} from "\.\.\/cadenceExecutor\.js"/,
  '\n} from "./cadenceExecutor.js"'
);
code = code.replace(
  /autoContextPullBack,\s*getCurrentPressurePct/,
  'autoContextPullBack'
);

// Fix 2: Add getCurrentPressurePct to responseSlimmer import  
code = code.replace(
  'import { slimJsonResponse, slimCadence, getSlimLevel } from "../utils/responseSlimmer.js";',
  'import { slimJsonResponse, slimCadence, getSlimLevel, getCurrentPressurePct } from "../utils/responseSlimmer.js";'
);

writeFileSync(filePath, code);
console.log('Fixed imports. Lines:', code.split('\n').length);

// Now run real build
try {
  const out = execSync('npx esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js --format=cjs --external:@modelcontextprotocol/sdk', 
    { cwd: root, timeout: 30000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('BUILD SUCCESS');
  console.log(out.trim().split('\n').slice(-3).join('\n'));
} catch (e) {
  console.error('BUILD FAILED');
  console.error(e.stderr?.toString().slice(0, 500) || e.message);
  process.exit(1);
}
