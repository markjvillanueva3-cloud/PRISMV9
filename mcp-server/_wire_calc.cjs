const fs = require('fs');
const path = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\calcDispatcher.ts';
let content = fs.readFileSync(path, 'utf-8');

const oldImports = `import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { registryManager } from "../../registries/manager.js";`;

const newImports = `import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { registryManager } from "../../registries/manager.js";
import { SafetyBlockError } from "../../errors/PrismError.js";
import { validateCrossFieldPhysics } from "../../validation/crossFieldPhysics.js";
import type { SafetyCalcResult } from "../../schemas/safetyCalcSchema.js";`;

if (content.includes(oldImports)) {
  content = content.replace(oldImports, newImports);
  fs.writeFileSync(path, content, 'utf-8');
  console.log('SUCCESS: calcDispatcher imports updated');
} else {
  console.log('SKIP: imports not found as expected (may already be modified)');
  // Show first 10 lines for debugging
  console.log('First 10 lines:', content.split('\n').slice(0, 10).join('\n'));
}
