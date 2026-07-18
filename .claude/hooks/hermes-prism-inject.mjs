#!/usr/bin/env node
// tier: T2
/**
 * hermes-prism-inject.mjs -- PreToolUse hook that injects PRISM routing context into Hermes agents
 * Wired to: Agent tool (Hermes agent spawns) + Task tool (subagents)
 * 
 * Reads H:/prism/.hermes/profiles/zulu/config.yaml + H:/prism/config/model-routing-policy.json
 * Injects routing verdict + available model catalog into the agent's context
 */

import fs from "node:fs";
import path from "node:path";

const HERMES_CONFIG = "H:/prism/.hermes/profiles/zulu/config.yaml";
const PRISM_POLICY = "H:/prism/config/model-routing-policy.json";

// Simple YAML parser for our config
function parseConfig(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const result = { models: { local: {}, cloud: {} }, deterministic_router: { rules: [], default_tier: "reason" }, cloud_escalation: { ladder: [] } };
    
    let inLocal = false, inCloud = false, inRules = false, inLadder = false;
    let currentModel = null, currentRule = null, currentRung = null;
    
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      
      const indent = line.search(/\S/);
      
      if (trimmed === "local:") { inLocal = true; inCloud = false; inRules = false; inLadder = false; continue; }
      if (trimmed === "cloud:") { inLocal = false; inCloud = true; inRules = false; inLadder = false; continue; }
      if (trimmed === "rules:") { inLocal = false; inCloud = false; inRules = true; inLadder = false; continue; }
      if (trimmed === "ladder:") { inLocal = false; inCloud = false; inRules = false; inLadder = true; continue; }
      if (trimmed === "deterministic_router:") { inLocal = false; inCloud = false; inRules = false; inLadder = false; continue; }
      if (trimmed === "cloud_escalation:") { inLocal = false; inCloud = false; inRules = false; inLadder = false; continue; }
      
      if (inLocal || inCloud) {
        const modelMatch = trimmed.match(/^([a-z0-9-]+):$/i);
        if (modelMatch) { currentModel = modelMatch[1]; continue; }
        const propMatch = trimmed.match(/^(\w+):\s*(.*)$/);
        if (propMatch && currentModel) {
          const key = propMatch[1];
          let value = propMatch[2].trim().replace(/^["']|["']$/g, "");
          if (value === "true") value = true;
          else if (value === "false") value = false;
          else if (/^\d+$/.test(value)) value = parseInt(value, 10);
          else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
          
          const target = inLocal ? result.models.local : result.models.cloud;
          if (!target[currentModel]) target[currentModel] = {};
          target[currentModel][key] = value;
        }
      }
      
      if (inRules) {
        if (trimmed.startsWith("- tier:")) {
          const tier = trimmed.split(":")[1].trim();
          currentRule = { tier, patterns: [], model: "" };
          result.deterministic_router.rules.push(currentRule);
        } else if (currentRule && trimmed.startsWith("- ")) {
          currentRule.patterns.push(trimmed.slice(2).trim());
        } else if (currentRule && trimmed.startsWith("model:")) {
          currentRule.model = trimmed.split(":")[1].trim();
        } else if (trimmed.startsWith("default_tier:")) {
          result.deterministic_router.default_tier = trimmed.split(":")[1].trim();
        }
      }
      
      if (inLadder) {
        if (trimmed.startsWith("- provider:")) {
          currentRung = { provider: trimmed.split(":")[1].trim() };
          result.cloud_escalation.ladder.push(currentRung);
        } else if (currentRung && trimmed.startsWith("model:")) {
          currentRung.model = trimmed.split(":")[1].trim();
        } else if (currentRung && trimmed.startsWith("tier:")) {
          currentRung.tier = trimmed.split(":")[1].trim();
        } else if (currentRung && trimmed.startsWith("free_tier:")) {
          currentRung.free_tier = trimmed.split(":")[1].trim() === "true";
        }
      }
    }
    
    return result;
  } catch {
    return null;
  }
}

function parsePrismPolicy(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

const HERMES = parseConfig(HERMES_CONFIG);
const PRISM = parsePrismPolicy(PRISM_POLICY);

// Build unified catalog
function buildCatalog() {
  const catalog = { local: {}, cloud: {}, subscription: {} };
  
  if (HERMES?.models?.local) {
    for (const [key, model] of Object.entries(HERMES.models.local)) {
      catalog.local[key] = { ...model, source: "hermes-config" };
    }
  }
  if (HERMES?.models?.cloud) {
    for (const [key, model] of Object.entries(HERMES.models.cloud)) {
      catalog.cloud[key] = { ...model, source: "hermes-config" };
    }
  }
  
  if (PRISM?.inventory?.local_ollama) {
    for (const [key, model] of Object.entries(PRISM.inventory.local_ollama)) {
      catalog.local[key] = { ...model, source: "prism-policy", tier: model.tier };
    }
  }
  if (PRISM?.inventory?.subscription_claude_max) {
    for (const [key, model] of Object.entries(PRISM.inventory.subscription_claude_max)) {
      catalog.subscription[key] = { ...model, source: "prism-policy", tier: model.tier };
    }
  }
  if (PRISM?.inventory?.subscription_chatgpt) {
    for (const [key, model] of Object.entries(PRISM.inventory.subscription_chatgpt)) {
      catalog.subscription[key] = { ...model, source: "prism-policy", tier: model.tier };
    }
  }
  if (PRISM?.inventory?.nvidia_api) {
    for (const [key, model] of Object.entries(PRISM.inventory.nvidia_api)) {
      catalog.cloud[key] = { ...model, source: "prism-policy", tier: model.tier };
    }
  }
  if (PRISM?.inventory?.google_ai_studio) {
    for (const [key, model] of Object.entries(PRISM.inventory.google_ai_studio)) {
      catalog.cloud[key] = { ...model, source: "prism-policy", tier: model.tier };
    }
  }
  if (PRISM?.inventory?.openrouter) {
    for (const [key, model] of Object.entries(PRISM.inventory.openrouter)) {
      catalog.cloud[key] = { ...model, source: "prism-policy", tier: model.tier };
    }
  }
  
  return catalog;
}

const CATALOG = buildCatalog();
const RULES = HERMES?.deterministic_router?.rules || [];
const DEFAULT_TIER = HERMES?.deterministic_router?.default_tier || "reason";
const LADDER = HERMES?.cloud_escalation?.ladder || [];

function getBaseUrl(provider) {
  switch (provider) {
    case "ollama": return "http://127.0.0.1:11434/v1";
    case "nvidia": return "https://integrate.api.nvidia.com/v1";
    case "groq": return "https://api.groq.com/openai/v1";
    case "google-ai-studio": return "https://generativelanguage.googleapis.com/v1beta";
    case "openrouter": return "https://openrouter.ai/api/v1";
    case "anthropic": return "https://api.anthropic.com";
    case "openai": return "https://api.openai.com/v1";
    default: return "http://127.0.0.1:11434/v1";
  }
}

function findModel(modelName) {
  for (const [key, model] of Object.entries(CATALOG.local)) {
    if (model.model === modelName || key === modelName) return { ...model, catalogKey: key, catalog: "local" };
  }
  for (const [key, model] of Object.entries(CATALOG.cloud)) {
    if (model.model === modelName || key === modelName) return { ...model, catalogKey: key, catalog: "cloud" };
  }
  for (const [key, model] of Object.entries(CATALOG.subscription)) {
    if (model.model === modelName || key === modelName) return { ...model, catalogKey: key, catalog: "subscription" };
  }
  return null;
}

const CLOUD_EXPLICIT_RE = /\b(use|via|route\s+to|run\s+(on|via)|switch\s+to|ask)\s+(the\s+)?(cloud|nvidia|nim|groq|gemini|openrouter)\b/i;
const CLOUD_VETO_RE = [
  /\b(build|implement|create|rewrite|wire|scaffold|refactor|generate|write\s+the\s+(code|engine|test|hook|dispatcher)|add\s+(the|a)\s+(engine|test|hook|dispatcher|action))\b/i,
  /\b(design|architect|brainstorm|plan\s+(the|a|out)|strateg(y|ize))\b/i
];

function classifyTask(task) {
  const s = typeof task === "string" ? task : "";
  if (!s.trim()) return DEFAULT_TIER;
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (new RegExp(pattern, "i").test(s)) return rule.tier;
    }
  }
  return DEFAULT_TIER;
}

function routeTask(task, allowCloud = false) {
  const s = typeof task === "string" ? task : "";
  
  if (allowCloud && CLOUD_EXPLICIT_RE.test(s)) {
    for (const rung of LADDER) {
      const model = findModel(rung.model);
      if (model) {
        return { tier: rung.tier, model: model.model, provider: model.provider, base_url: getBaseUrl(model.provider), ctx: model.context_length || 131072, reason: `explicit cloud -> ${model.provider}/${model.model}`, local: false, cost: model.cost_per_token || 0 };
      }
    }
  }
  
  if (allowCloud && CLOUD_VETO_RE.some(re => re.test(s))) {
    // Force local for build/deep-think
  }
  
  const tier = classifyTask(s);
  const rule = RULES.find(r => r.tier === tier);
  const modelName = rule?.model || "gpt-oss:120b";
  const model = findModel(modelName);
  
  if (model) {
    return { tier: model.tier || tier, model: model.model, provider: model.provider, base_url: getBaseUrl(model.provider), ctx: model.context_length || 131072, reason: `local ${tier} -> ${model.model}`, local: true, cost: 0 };
  }
  
  return { tier: DEFAULT_TIER, model: "gpt-oss:120b", provider: "ollama", base_url: "http://127.0.0.1:11434/v1", ctx: 131072, reason: "fallback", local: true, cost: 0 };
}

function main() {
  let input = "";
  process.stdin.on("data", chunk => { input += chunk; });
  process.stdin.on("end", () => {
    try {
      const hookInput = JSON.parse(input || "{}");
      const toolName = hookInput.tool_name || "";
      const toolInput = hookInput.tool_input || {};
      
      if (toolName === "Agent" || toolName === "Task") {
        const task = toolInput.description || toolInput.prompt || toolInput.goal || "";
        const routing = routeTask(task, true);
        
        const localModels = Object.entries(CATALOG.local).map(([k,v]) => `${v.model} [${v.tier || k}]`).join(", ");
        const cloudModels = Object.entries(CATALOG.cloud).map(([k,v]) => `${v.model} [${v.tier || k}]`).join(", ");
        const subModels = Object.entries(CATALOG.subscription).map(([k,v]) => `${v.model} [${v.tier || k}]`).join(", ");
        
        const injection = {
          hookSpecificOutput: {
            additionalContext: `\n[PRISM-HERMES ROUTING INJECTION]\nTask: ${task.slice(0, 200)}\nRouted to: ${routing.tier} -> ${routing.model} (${routing.provider})\nContext: ${routing.ctx} tokens\nReason: ${routing.reason}\nLocal: ${routing.local}\nCost: $${routing.cost}/1M tokens\n\nAvailable models:\n- Local (Ollama): ${localModels}\n- Cloud (NVIDIA/Groq/Gemini): ${cloudModels}\n- Subscriptions (Claude Max/ChatGPT): ${subModels}\n[END PRISM-HERMES ROUTING]\n`
          }
        };
        process.stdout.write(JSON.stringify(injection));
      } else {
        process.stdout.write(JSON.stringify({}));
      }
    } catch (e) {
      process.stdout.write(JSON.stringify({}));
    }
  });
}

main();