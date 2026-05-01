const fs = require("fs");
const dist = fs.readFileSync("C:\\PRISM\\mcp-server\\dist\\index.js", "utf-8");
const checks = [
  ["autoNLHookEvaluator function", dist.includes("autoNLHookEvaluator")],
  ["NL_HOOK_REGISTRY path", dist.includes("nl_hooks")],
  ["getDeployedNLHooks", dist.includes("getDeployedNLHooks")],
  ["evaluateNLHookCondition", dist.includes("evaluateNLHookCondition")],
  ["executeNLHookAction", dist.includes("executeNLHookAction")],
  ["hooks_fired", dist.includes("hooks_fired")],
  ["NL_HOOKS emoji", dist.includes("NL_HOOKS")],
  ["callNum % 8", dist.includes("% 8")]
];
const out = checks.map(([name, found]) => `${found ? "YES" : "NO "} ${name}`).join("\n");
fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", out);