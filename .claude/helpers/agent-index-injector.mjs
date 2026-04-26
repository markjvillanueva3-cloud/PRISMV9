#!/usr/bin/env node
/**
 * agent-index-injector.mjs — SubagentStart hook
 *
 * When a subagent is spawned, analyzes the task prompt and injects
 * a relevant slice of MASTER_INDEX + digest data so the agent doesn't
 * waste 3-10 tool calls rediscovering the codebase.
 *
 * Examples:
 * - Agent exploring "physics engines" → gets physics engine list + dispatcher
 * - Agent searching for "billing" → gets business dispatcher actions
 * - Agent reviewing "PostProcessor" → gets pipeline stage list
 *
 * Token savings: 2K-8K tokens per agent spawn (prevents redundant
 * Glob/Grep/Read cycles that the parent already knows the answer to).
 */
import { readFileSync, existsSync } from "node:fs";
import process from "node:process";

const MASTER_INDEX = "H:/prism/mcp-server/data/MASTER_INDEX.json";
const ENGINE_DIGEST = "H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md";

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(""); return; }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { data += c; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(data), 200);
  });
}

// Domain keyword → dispatcher names + engine prefixes
const DOMAIN_MAP = {
  physics: {
    dispatchers: ["prism_calc", "prism_physics"],
    keywords: ["physics", "kienzle", "taylor", "force", "torque", "thermal", "chatter", "stability", "deflection", "wear"],
  },
  business: {
    dispatchers: ["prism_business"],
    keywords: ["business", "quote", "cost", "invoice", "billing", "stripe", "financial", "accounting", "gl", "ledger", "roi", "erp"],
  },
  cam: {
    dispatchers: ["prism_cam", "prism_toolpath"],
    keywords: ["cam", "toolpath", "gcode", "g-code", "program", "milling", "turning", "lathe", "5-axis", "multi-axis"],
  },
  quality: {
    dispatchers: ["prism_quality", "prism_compliance"],
    keywords: ["quality", "spc", "inspection", "fai", "tolerance", "capability", "compliance", "legal"],
  },
  materials: {
    dispatchers: ["prism_data"],
    keywords: ["material", "alloy", "steel", "aluminum", "titanium", "hardness", "tensile", "machinability"],
  },
  tools: {
    dispatchers: ["prism_data"],
    keywords: ["tool", "cutter", "insert", "endmill", "drill", "tap", "holder", "collet"],
  },
  postprocessor: {
    dispatchers: ["prism_postprocessor"],
    keywords: ["post", "postprocessor", "controller", "dialect", "fanuc", "siemens", "haas", "mazak", "okuma"],
  },
  pipeline: {
    dispatchers: [],
    keywords: ["pipeline", "print-to-program", "quote-to-ship", "orchestrator", "stage"],
  },
  safety: {
    dispatchers: ["prism_safety"],
    keywords: ["safety", "collision", "limit", "envelope", "spindle", "clamp", "rapid"],
  },
};

function detectDomains(prompt) {
  const lower = prompt.toLowerCase();
  const matched = [];
  for (const [domain, config] of Object.entries(DOMAIN_MAP)) {
    if (config.keywords.some(kw => lower.includes(kw))) {
      matched.push(domain);
    }
  }
  return matched;
}

function getDispatcherInfo(dispatchers, mi) {
  const results = [];
  for (const d of mi.dispatchers || []) {
    if (dispatchers.includes(d.name)) {
      const actions = d.actions?.length <= 20
        ? d.actions.join(", ")
        : d.actions?.slice(0, 15).join(", ") + `... (${d.action_count} total)`;
      results.push(`${d.name} (${d.action_count} actions): ${actions}`);
    }
  }
  return results;
}

function getRelevantEngines(domains, mi) {
  const engines = mi.engines || [];
  const keywords = domains.flatMap(d => DOMAIN_MAP[d]?.keywords || []);
  const relevant = engines.filter(e => {
    const nameLower = e.name.toLowerCase();
    return keywords.some(kw => nameLower.includes(kw));
  });
  return relevant.slice(0, 15).map(e => e.name);
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const raw = await readStdin();
  let prompt = "";
  try {
    const parsed = JSON.parse(raw);
    prompt = parsed.tool_input?.prompt || parsed.prompt || "";
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  if (!prompt || prompt.length < 10) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  const domains = detectDomains(prompt);
  if (domains.length === 0) {
    // Generic agent — inject system overview only
    process.stdout.write(JSON.stringify({
      additionalContext: "PRISM: 1291 engines, 79 dispatchers, 3959 actions. Use ENGINE_DIGEST.md + DISPATCHER_DIGEST.md before searching.",
    }));
    process.exit(0);
    return;
  }

  // Load MASTER_INDEX for targeted context
  let mi;
  try {
    mi = JSON.parse(readFileSync(MASTER_INDEX, "utf8"));
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  const parts = [`PRISM AGENT CONTEXT (${domains.join(", ")}):`];

  // Relevant dispatchers
  const dispNames = domains.flatMap(d => DOMAIN_MAP[d]?.dispatchers || []);
  const uniqueDisps = [...new Set(dispNames)];
  const dispInfo = getDispatcherInfo(uniqueDisps, mi);
  if (dispInfo.length > 0) {
    parts.push("Dispatchers: " + dispInfo.join(" | "));
  }

  // Relevant engines
  const engines = getRelevantEngines(domains, mi);
  if (engines.length > 0) {
    parts.push("Key engines: " + engines.join(", "));
  }

  // Key file paths
  parts.push("Digests: ENGINE_DIGEST.md, DISPATCHER_DIGEST.md in mcp-server/data/docs/");
  parts.push("Physics constants: src/physics/constants.ts");

  const context = parts.join(" | ");
  // Cap at 500 chars to avoid bloating agent context
  const trimmed = context.length > 500 ? context.slice(0, 497) + "..." : context;

  process.stdout.write(JSON.stringify({ additionalContext: trimmed }));
  process.exit(0);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
