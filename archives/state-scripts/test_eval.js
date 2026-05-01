const fs = require("fs");
const path = require("path");
const STATE_DIR = "C:\\PRISM\\state";
const NL_HOOK_REGISTRY = path.join(STATE_DIR, "nl_hooks", "registry.json");

// Simulate getDeployedNLHooks
let hooks = [];
try {
  const registry = JSON.parse(fs.readFileSync(NL_HOOK_REGISTRY, "utf-8"));
  hooks = Array.isArray(registry) ? registry : 
    Array.isArray(registry.hooks) ? registry.hooks :
    Object.values(registry).filter(v => v && typeof v === "object" && v.deploy_status);
  hooks = hooks.filter(h => h.deploy_status === "deployed" || h.deploy_status === "active" || h.status === "active");
} catch(e) { hooks = []; }

// Simulate evaluateNLHookCondition for each hook
const ctx = { call_number: 48, pressure_pct: 30, current_phase: "R1", recent_actions: ["prism_knowledge:search"], tool_name: "prism_knowledge", action: "search" };

const results = [];
for (const hook of hooks) {
  const condition = hook.condition || hook.condition_code || hook.trigger || "";
  let matched = false;
  let reason = "";
  
  if (condition && typeof condition === "string" && condition.includes(":")) {
    const parts = condition.split(":");
    const condType = parts[0].toLowerCase().trim();
    switch(condType) {
      case "pressure_above": matched = ctx.pressure_pct > parseFloat(parts[1]); reason = `pressure ${ctx.pressure_pct} > ${parts[1]}? ${matched}`; break;
      case "call_count_above": matched = ctx.call_number > parseInt(parts[1]); reason = `call ${ctx.call_number} > ${parts[1]}? ${matched}`; break;
      case "action_contains": matched = ctx.recent_actions.some(a => a.toLowerCase().includes(parts[1].toLowerCase())); reason = `actions contain ${parts[1]}? ${matched}`; break;
      case "always": matched = true; reason = "always"; break;
      default: reason = `unknown type: ${condType}`; break;
    }
  }
  results.push({ id: hook.id, condition, matched, reason });
}

fs.writeFileSync(path.join(STATE_DIR, "trigger_output.txt"), JSON.stringify(results, null, 2));