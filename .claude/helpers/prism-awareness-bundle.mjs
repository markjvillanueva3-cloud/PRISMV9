#!/usr/bin/env node
/**
 * prism-awareness-bundle.mjs — CLI-agnostic PRISM awareness aggregator.
 *
 * Produces an injectable text bundle that any LLM CLI (Claude/Gemini/Codex)
 * or stateless API caller (Ollama deepseek/qwen) can prepend to its first
 * prompt to gain the same baseline awareness Claude Code receives via hooks.
 *
 * Modes (cumulative):
 *   --brief    CLAUDE-BRIEF only (≈13KB) — process priorities, paths, scale
 *   --standard +memory index, +active file claims, +current position (≈18KB)
 *   --full     +master-index excerpt, +GSD-quick header, +recent decisions (≈30KB)
 *
 * Always-included access references (≈2KB each, ≈4KB total):
 *   - PRISM AI access patterns (prism_ai / prism_intelligence dispatcher actions)
 *   - Neural-network / XPROC access patterns
 *   - Obsidian 2nd-brain access patterns
 *
 * Output goes to stdout — pipe into the consuming CLI:
 *
 *   gemini -p "$(node H:/PRISM/.claude/helpers/prism-awareness-bundle.mjs --standard) Now: <real prompt>"
 *
 *   codex exec --append-system-prompt \
 *     "$(node H:/PRISM/.claude/helpers/prism-awareness-bundle.mjs --full)" \
 *     "<real prompt>"
 *
 *   curl -X POST http://127.0.0.1:11434/api/generate -d "$(jq -n \
 *     --arg sys "$(node H:/PRISM/.claude/helpers/prism-awareness-bundle.mjs --brief)" \
 *     --arg p   "explain Kienzle for 4140" \
 *     '{model:"gpt-oss:120b", system:$sys, prompt:$p, stream:false}')"
 *
 * Or call via MCP from any of the three CLIs:
 *   prism_context:ollama_context_wrap { prompt, mode: "standard" }
 *   (returns { system, prompt } — wrapped with the bundle).
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir().replace(/\\/g, "/");

const SOURCES = {
  brief:           "H:/prism/state/shared/CLAUDE-BRIEF.md",
  inventory:       "H:/PRISM/PRISM-INVENTORY-LATEST.md",
  memory:          `${HOME}/.claude/projects/H--PRISM/memory/MEMORY.md`,
  gsdQuick:        "H:/prism/mcp-server/data/docs/gsd/GSD_QUICK.md",
  position:        "H:/PRISM/state/CURRENT_POSITION.md",
  assetRegistry:   "H:/prism/mcp-server/data/state/cross-session-asset-registry.json",
  agentChatJsonl:  "H:/prism/state/shared/AGENT_CHAT.jsonl",
};

// ---- mode parsing ----
const args = process.argv.slice(2);
const modeFlag =
  args.includes("--full") ? "full" :
  args.includes("--standard") ? "standard" :
  args.includes("--brief") ? "brief" : "standard";

// ---- helpers ----
function readSafe(path, opts = {}) {
  try {
    if (!existsSync(path)) return "";
    const stat = statSync(path);
    if (stat.size === 0) return "";
    let content = readFileSync(path, "utf-8");
    if (opts.maxBytes && Buffer.byteLength(content, "utf-8") > opts.maxBytes) {
      content = content.slice(0, opts.maxBytes) + `\n[TRUNCATED at ${opts.maxBytes} bytes]`;
    }
    return content;
  } catch {
    return "";
  }
}

function readJsonExcerpt(path, opts = {}) {
  try {
    if (!existsSync(path)) return null;
    const obj = JSON.parse(readFileSync(path, "utf-8"));
    if (opts.summarizer) return opts.summarizer(obj);
    return JSON.stringify(obj, null, 2).slice(0, opts.maxBytes ?? 4000);
  } catch {
    return null;
  }
}

// ---- always-included access references ----
const AI_ACCESS = `## PRISM AI ACCESS (callable via MCP from any CLI)

| Capability | Dispatcher action | When to use |
|---|---|---|
| Chain-of-thought reasoning | \`prism_ai:cot_reason\` | step-by-step deliberate reasoning |
| Tree-of-thought reasoning | \`prism_ai:cot_reason_tree\` | branching alternatives, pick best |
| Cross-domain creative | \`prism_ai:creative_solve\` | novel synthesis across 15 domains |
| Causal analysis | \`prism_ai:causal_analyze\` | "what caused X?" — deterministic graph |
| Counterfactual prediction | \`prism_ai:counterfactual_predict\` | "what if Y happened instead?" |
| AI feature recommend | \`prism_intelligence:ai_feature_route\` | "which engine should I use for X?" |
| Autonomous orchestration | \`prism_intelligence:ai_orchestrate_autonomous\` | multi-step plan + execute |
| Belief tracking | \`prism_ai:belief_set\` / \`belief_query\` | persistent assumption store |
| Scientific reasoning | \`prism_ai:scientific_reason\` | physics-first hypothesis testing |
| Lathe AGI | \`prism_business:lathe_agi_reason\` | turning-specific deep reasoning |
| Mill AGI | \`prism_mill:mill_agi_orchestrate\` | milling-specific deep reasoning |
| Self-awareness query | \`prism_intelligence:ai_feature_discover\` | "what can PRISM do for X?" |
`;

const NEURAL_ACCESS = `## NEURAL / XPROC ACCESS (cross-process learning, added 2026-05)

| Capability | Dispatcher action | Notes |
|---|---|---|
| AGI orchestration | \`prism_intelligence:xproc_agi_orchestrate\` | classify→route→blend across mill/lathe/wedm |
| Episodic recall | \`prism_intelligence:xproc_agi_episodic\` | k-NN over past outcomes |
| Pattern aggregation | \`prism_intelligence:xproc_agi_aggregate_patterns\` | local 1.0× / shared 0.5× weighting |
| Neural routing | \`prism_ai:neural_route\` | route-by-neural-classifier |
| Neural recommend | \`prism_ai:neural_recommend\` | embedding-based recommendation |
| Neural synthesize | \`prism_ai:neural_synthesize\` | generative composition |
| Tool wear NN | \`prism_calc:wear_prediction\` | physics + neural ensemble |
| Surface integrity NN | \`prism_calc:surface_integrity_predict\` | residual stress + recast layer |
| Chatter classifier | \`prism_calc:chatter_neural_classify\` | spindle-vibration → stable/unstable |
| Tribal pattern mine | \`prism_business:lathe_agi_kg_query\` | knowledge-graph traversal |
`;

const OBSIDIAN_ACCESS = `## OBSIDIAN 2ND-BRAIN ACCESS (vault sync via MCP)

| Capability | Dispatcher action |
|---|---|
| Pull vault → PRISM | \`prism_knowledge:obsidian_sync_pull\` |
| Push PRISM → vault | \`prism_knowledge:obsidian_sync_push\` |
| Vault sync status | \`prism_knowledge:obsidian_sync_status\` |
| Configure vault path | \`prism_knowledge:obsidian_sync_config\` |
| Wiki ingest (Karpathy LLM-wiki) | \`prism_knowledge:wiki_ingest\` |
| Wiki query | \`prism_knowledge:wiki_query\` |
| Wiki lint | \`prism_knowledge:wiki_lint\` |
| Wiki morning sweep | \`prism_knowledge:wiki_morning\` |
`;

const HANDOFF_ACCESS = `## CROSS-SESSION HANDOFF (per-CLI per-chat)

\`\`\`bash
# WRITE on session-end:
node H:/prism/.claude/helpers/per-agent-handoff.mjs write \\
  --terminal "$(node H:/prism/.claude/helpers/stable-session-id.mjs)" \\
  --topic "<scope-slug>" \\
  --resume "<next-action directive>" \\
  --state  "<markdown body>"

# READ on session-start:
node H:/prism/.claude/helpers/per-agent-handoff.mjs read \\
  --terminal "$(node H:/prism/.claude/helpers/stable-session-id.mjs)"
\`\`\`

Storage: \`state/shared/handoffs/HANDOFF-<id>-<topic>.md\` — one per chat, topic suffix mandatory.
`;

// ---- assemblers ----
function header() {
  return `# PRISM AWARENESS BUNDLE
**Mode:** ${modeFlag} · **Generated:** ${new Date().toISOString()} · **Source:** prism-awareness-bundle.mjs

> Treat this bundle as authoritative context. Do NOT re-derive what's stated below — call MCP actions
> shown in the access tables to fetch live data. Edit \`H:/PRISM/CLAUDE.md\` to update the source brief.

`;
}

function inventoryHeadline() {
  const inv = readSafe(SOURCES.inventory, { maxBytes: 1500 });
  if (!inv) return "";
  return `\n---\n## CURRENT INVENTORY (head)\n\n${inv}\n`;
}

function memorySection() {
  const mem = readSafe(SOURCES.memory, { maxBytes: 4000 });
  if (!mem) return "";
  return `\n---\n## MEMORY INDEX (~/.claude/projects/H--PRISM/memory/MEMORY.md)\n\n${mem}\n`;
}

function positionSection() {
  const pos = readSafe(SOURCES.position, { maxBytes: 1500 });
  if (!pos) return "";
  return `\n---\n## CURRENT POSITION (state/CURRENT_POSITION.md)\n\n${pos}\n`;
}

function activeClaimsSection() {
  const jsonl = readSafe(SOURCES.agentChatJsonl);
  if (!jsonl) return "";
  // last 30 lines, filter to CLAIMED messages from last hour
  const cutoff = Date.now() - 60 * 60 * 1000;
  const recent = jsonl
    .trim()
    .split("\n")
    .slice(-200)
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter((m) => m && m.ts && Date.parse(m.ts) > cutoff && /CLAIMED/i.test(m.text ?? ""))
    .slice(-15);
  if (recent.length === 0) return "";
  const rendered = recent
    .map((m) => `- [${m.ts}] ${m.from ?? "?"}: ${m.text?.slice(0, 200) ?? ""}`)
    .join("\n");
  return `\n---\n## ACTIVE FILE CLAIMS (last hour)\n\n${rendered}\n`;
}

function masterIndexExcerpt() {
  const summary = readJsonExcerpt(SOURCES.assetRegistry, {
    summarizer: (obj) => {
      const engineCount = Object.keys(obj.engines ?? {}).length;
      const dispatcherCount = Object.keys(obj.dispatchers ?? {}).length;
      const recentEngines = Object.entries(obj.engines ?? {})
        .sort((a, b) => Date.parse(b[1]?.lastModified ?? 0) - Date.parse(a[1]?.lastModified ?? 0))
        .slice(0, 20)
        .map(([name, meta]) => `- ${name} (${meta?.lastModified ?? "?"})`)
        .join("\n");
      return `Asset registry: ${engineCount} engines · ${dispatcherCount} dispatchers tracked\n\n### 20 most-recently-touched engines\n${recentEngines}\n\n### How to query the live registry\n- \`prism_dev:capability_census\` — full census\n- \`prism_session:dispatcher_map_compact\` — dispatcher → action map\n- \`prism_session:action_search\` — fuzzy action lookup`;
    },
  });
  if (!summary) return "";
  return `\n---\n## MASTER INDEX EXCERPT (cross-session-asset-registry.json)\n\n${summary}\n`;
}

function gsdQuickSection() {
  const gsd = readSafe(SOURCES.gsdQuick, { maxBytes: 4000 });
  if (!gsd) return "";
  return `\n---\n## GSD QUICK (mcp-server/data/docs/gsd/GSD_QUICK.md)\n\n${gsd}\n`;
}

function briefSection() {
  const brief = readSafe(SOURCES.brief);
  if (!brief) return "";
  return `\n---\n## CLAUDE-BRIEF (state/shared/CLAUDE-BRIEF.md)\n\n${brief}\n`;
}

/**
 * buildBundle({ mode }) — programmatic entry. Returns the assembled bundle string.
 * Callers in TypeScript engines (e.g. OllamaContextFloorEngine) import this directly
 * instead of spawning a Node subprocess.
 */
export function buildBundle({ mode = "standard" } = {}) {
  const m = mode === "brief" || mode === "standard" || mode === "full" ? mode : "standard";
  let out = header().replace("**Mode:** " + modeFlag, "**Mode:** " + m);
  out += briefSection();
  out += inventoryHeadline();
  if (m === "standard" || m === "full") {
    out += memorySection();
    out += positionSection();
    out += activeClaimsSection();
  }
  if (m === "full") {
    out += masterIndexExcerpt();
    out += gsdQuickSection();
  }
  out += "\n---\n" + AI_ACCESS + "\n" + NEURAL_ACCESS + "\n" + OBSIDIAN_ACCESS + "\n" + HANDOFF_ACCESS;
  out += "\n---\n_End of PRISM awareness bundle. Mode: " + m + ". Now proceed with the user's request._\n";
  return out;
}

/**
 * PRISM-STAB-MS0/U-A2-extended (2026-05-09): daemon mode.
 *
 * Run with --daemon to enter a long-running aggregator that re-builds the
 * bundle every --tick=<seconds> (default 30) and writes both:
 *   state/shared/context-bundle.json   (machine-readable, used by hooks)
 *   state/shared/context-bundle.html   (browser-readable, future Quartz cross-link)
 *   state/shared/context-bundle.md     (markdown bundle text — same as stdout mode)
 *
 * Per-prompt hooks should READ context-bundle.json instead of forking 24 separate
 * injectors that each compute the same data. This is Phase C1 from the spec.
 *
 * Spawn (one-shot, foreground): node prism-awareness-bundle.mjs --daemon
 * Spawn (supervised):           via daemon-supervisor.mjs (when shipped)
 */
async function runDaemon({ mode, tickSeconds }) {
  const { mkdirSync } = await import("node:fs");
  const path = (await import("node:path")).default;
  const OUT_DIR = "H:/prism/state/shared";
  const JSON_OUT = path.join(OUT_DIR, "context-bundle.json");
  const HTML_OUT = path.join(OUT_DIR, "context-bundle.html");
  const MD_OUT = path.join(OUT_DIR, "context-bundle.md");
  mkdirSync(OUT_DIR, { recursive: true });

  const tick = async () => {
    const tStart = Date.now();
    const md = buildBundle({ mode });
    const meta = {
      generatedAt: new Date().toISOString(),
      mode,
      durationMs: 0, // filled below
      sources: SOURCES,
      bytes: Buffer.byteLength(md, "utf-8"),
      schemaVersion: "1.0.0",
    };
    meta.durationMs = Date.now() - tStart;

    // Markdown (raw bundle text)
    try {
      const fs = await import("node:fs/promises");
      await fs.writeFile(`${MD_OUT}.tmp-${process.pid}`, md);
      await fs.rename(`${MD_OUT}.tmp-${process.pid}`, MD_OUT);
    } catch (e) { process.stderr.write(`md write fail: ${e.message}\n`); }

    // JSON (meta + body for programmatic consumers)
    try {
      const fs = await import("node:fs/promises");
      const obj = { ...meta, body: md };
      await fs.writeFile(`${JSON_OUT}.tmp-${process.pid}`, JSON.stringify(obj, null, 2));
      await fs.rename(`${JSON_OUT}.tmp-${process.pid}`, JSON_OUT);
    } catch (e) { process.stderr.write(`json write fail: ${e.message}\n`); }

    // Minimal HTML (raw <pre> wrapped — Quartz can swap in later)
    try {
      const fs = await import("node:fs/promises");
      const escaped = md
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const html = `<!doctype html><html><head><meta charset="utf-8">
<title>PRISM Context Bundle</title>
<style>body{font:14px/1.45 ui-monospace,monospace;background:#0e1117;color:#c9d1d9;margin:0;padding:24px;max-width:1100px}h1,h2,h3{color:#58a6ff}pre{white-space:pre-wrap;word-break:break-word}</style>
</head><body>
<h1>PRISM Context Bundle <small>(${meta.mode}, ${meta.bytes} bytes, ${meta.durationMs} ms)</small></h1>
<p>Generated: ${meta.generatedAt} · Refresh interval: ${tickSeconds}s · Source: <code>prism-awareness-bundle.mjs --daemon</code></p>
<pre>${escaped}</pre>
</body></html>`;
      await fs.writeFile(`${HTML_OUT}.tmp-${process.pid}`, html);
      await fs.rename(`${HTML_OUT}.tmp-${process.pid}`, HTML_OUT);
    } catch (e) { process.stderr.write(`html write fail: ${e.message}\n`); }

    process.stderr.write(`[bundle-daemon] tick ok mode=${meta.mode} bytes=${meta.bytes} ms=${meta.durationMs}\n`);
  };

  // Initial tick + interval
  await tick();
  const interval = setInterval(() => { tick().catch((e) => process.stderr.write(`tick err: ${e.message}\n`)); }, tickSeconds * 1000);
  // Graceful shutdown
  const stop = () => { clearInterval(interval); process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // Keep alive
  await new Promise(() => {}); // never resolves; daemon-supervisor controls lifecycle
}

// CLI entrypoint — only runs when invoked directly (`node prism-awareness-bundle.mjs`),
// not when imported as a module by the engine.
const isMainModule =
  import.meta.url.startsWith("file:") &&
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isMainModule) {
  if (args.includes("--daemon")) {
    const tickArg = args.find((a) => a.startsWith("--tick="));
    const tickSeconds = tickArg ? Number(tickArg.split("=")[1]) || 30 : 30;
    runDaemon({ mode: modeFlag, tickSeconds }).catch((e) => {
      process.stderr.write(`prism-awareness-bundle daemon: fatal ${e.message}\n`);
      process.exit(1);
    });
  } else {
    process.stdout.write(buildBundle({ mode: modeFlag }));
  }
}
