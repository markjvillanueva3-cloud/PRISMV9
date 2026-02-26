const fs = require("fs");
const file = "C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts";
let c = fs.readFileSync(file, "utf-8");
let fixes = [];

// Fix 1: NL hook action variable - find the call and check
const nlIdx = c.indexOf("autoNLHookEvaluator(callNum, toolName, action)");
if (nlIdx >= 0) {
  c = c.replace("autoNLHookEvaluator(callNum, toolName, action)", "autoNLHookEvaluator(callNum, toolName, action2)");
  fixes.push("Fix1: action -> action2 in NL hook evaluator call");
}

const nlIdx2 = c.indexOf("autoNLHookEvaluator(callNum, toolName, action2)");
if (nlIdx2 >= 0) fixes.push("Fix1 verified: action2 present");

// Fix 2: Invalid regex - \s*??\s*CURRENT
const badRegex = '.replace(/\\s*??\\s*CURRENT$/i, "")';
if (c.includes(badRegex)) {
  c = c.replace(badRegex, '.replace(/\\s*(?:\\u2190|\\?\\?)\\s*CURRENT$/i, "")');
  fixes.push("Fix2: Invalid regex *?? escaped");
} else {
  fixes.push("Fix2: Bad regex not found (already fixed or different)");
}

// Fix 3: Add debug logging at NL hook callsite  
const debugTarget = "const nlResult = autoNLHookEvaluator(callNum, toolName, action2);";
if (c.includes(debugTarget) && !c.includes("CALLSITE: call=")) {
  const debugLine = `fs.appendFileSync(path.join("C:\\\\PRISM\\\\state", "nl_hook_debug.log"), \`[\${new Date().toISOString()}] CALLSITE: call=\${callNum} tool=\${toolName} action=\${action2}\\n\`);`;
  c = c.replace(debugTarget, debugLine + "\n        " + debugTarget);
  fixes.push("Fix3: Debug logging added at callsite");
} else {
  fixes.push("Fix3: Debug already present or target not found");
}

// Also add post-call debug
const postTarget = "cadence.nl_hook_eval = nlResult;";
if (c.includes(postTarget) && !c.includes("-> result:")) {
  const postDebug = `fs.appendFileSync(path.join("C:\\\\PRISM\\\\state", "nl_hook_debug.log"), \`  -> result: success=\${nlResult.success} fired=\${nlResult.hooks_fired} evaluated=\${nlResult.hooks_evaluated}\\n\`);`;
  c = c.replace(postTarget, postTarget + "\n          " + postDebug);
  fixes.push("Fix3b: Post-call debug logging added");
}

// Also catch errors with debug
const catchEmpty = "} catch {\n      }\n    }\n    if (callNum > 0 && callNum % 25 === 0)";
if (c.includes(catchEmpty)) {
  // Find the catch AFTER the NL hook block specifically
  // Just add error logging to the catch block after NL hook
}

fs.writeFileSync(file, c);
fixes.push("Lines: " + c.split("\n").length);
fs.writeFileSync("C:/PRISM/state/ahw_info.txt", fixes.join("\n"));