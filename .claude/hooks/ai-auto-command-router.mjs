#!/usr/bin/env node
// tier: T4
/**
 * AI Auto-Command Router — UserPromptSubmit Hook
 *
 * Detects when user input should trigger a slash command suggestion.
 * Uses pattern matching to recommend the most relevant command.
 */

// Command trigger patterns with priorities
const COMMAND_TRIGGERS = [
  // CRITICAL PRIORITY — Knowledge extraction (USE THESE!)
  { patterns: [/pdf|document|manual|catalog|paper|extract.*pdf|learn.*from.*pdf|pdf.*learn/i], cmd: "/pdf-learn", priority: 0 },
  { patterns: [/video|youtube|tutorial|training.*video|watch.*learn|video.*learn/i], cmd: "/video-learn", priority: 0 },
  { patterns: [/tribal|shop.*knowledge|operator.*experience|floor.*wisdom/i], cmd: "/shop-knowledge", priority: 0 },
  { patterns: [/ingest|import.*data|load.*knowledge/i], cmd: "/ingest", priority: 1 },

  // CRITICAL PRIORITY — Forge pipelines (ALWAYS USE)
  { patterns: [/forge|create.*engine|build.*engine|new.*engine|create.*new/i], cmd: "/forge-triple", priority: 0 },
  { patterns: [/dedup|duplicate|before.*creat|check.*exist/i], cmd: "/dedup", priority: 0 },
  { patterns: [/create.*skill|build.*skill|new.*skill/i], cmd: "/forge-triple skills-only", priority: 1 },
  { patterns: [/create.*hook|build.*hook|new.*hook/i], cmd: "/forge-triple hooks-only", priority: 1 },

  // HIGH PRIORITY — Machine-specific
  { patterns: [/wire.*edm|wedm|wire.*cut|edm.*program|mitsubishi.*edm/i], cmd: "/wire-edm-studio", priority: 1 },
  { patterns: [/lathe|turning|okuma|turning.*center/i], cmd: "/lathe-studio", priority: 1 },
  { patterns: [/analyze.*edm|edm.*analysis/i], cmd: "/wire-edm-analyze", priority: 1 },

  // MEDIUM PRIORITY — Hardening
  { patterns: [/harden|hardening|strengthen|improve.*machine/i], cmd: "/machine-harden", priority: 2 },
  { patterns: [/optimize.*program|improve.*program|faster/i], cmd: "/program-optimize", priority: 2 },
  { patterns: [/clean.*up|refactor|de.*slop/i], cmd: "/de-sloppify", priority: 2 },
  { patterns: [/scrutin|deep.*review|audit.*code/i], cmd: "/scrutinize", priority: 2 },

  // MEDIUM PRIORITY — Verification
  { patterns: [/formula.*check|validate.*formula|physics.*valid/i], cmd: "/formula-check", priority: 2 },
  { patterns: [/duplicate|dedup|redundant|similar.*engine/i], cmd: "/dedup", priority: 2 },
  { patterns: [/verify|continuous.*check/i], cmd: "/verify-loop", priority: 2 },

  // MEDIUM PRIORITY — Shop floor
  { patterns: [/quote|estimate|pricing|job.*cost/i], cmd: "/quote-to-ship", priority: 2 },
  { patterns: [/schedule|capacity|workload/i], cmd: "/shop-schedule", priority: 2 },
  { patterns: [/traveler|job.*sheet|work.*order/i], cmd: "/traveler", priority: 2 },
  { patterns: [/status|live|current.*shop/i], cmd: "/shop-live-status", priority: 2 },

  // MEDIUM PRIORITY — Post processing
  { patterns: [/macro.*convert|convert.*macro|fanuc.*to|to.*okuma/i], cmd: "/macro-convert", priority: 2 },
  { patterns: [/post.*processor|pp.*issue|g-?code/i], cmd: "/pp-resolve", priority: 2 },

  // LOW PRIORITY — Roadmap
  { patterns: [/roadmap|milestone|next.*task|continue.*work/i], cmd: "/continue-roadmap", priority: 3 },
  { patterns: [/rgs|protocol|systematic/i], cmd: "/rgs", priority: 3 },

  // LOW PRIORITY — Data
  { patterns: [/material.*stock|inventory.*material/i], cmd: "/material-stock", priority: 3 },
  { patterns: [/tooling|tool.*inventory|insert/i], cmd: "/tooling", priority: 3 },
  { patterns: [/vendor|supplier/i], cmd: "/vendor", priority: 3 },
  { patterns: [/print|drawing|blueprint/i], cmd: "/prints", priority: 3 },

  // LOW PRIORITY — Search
  { patterns: [/search|find|lookup|where.*is/i], cmd: "/desk-search", priority: 3 },
  { patterns: [/order.*status|tracking/i], cmd: "/order-status", priority: 3 },

  // LOW PRIORITY — Analysis
  { patterns: [/census|resource.*count|inventory.*all/i], cmd: "/resource-census", priority: 3 },
  { patterns: [/business.*health|kpi|metrics/i], cmd: "/biz-health", priority: 3 },
];

function findMatchingCommands(input) {
  const matches = [];
  const inputLower = input.toLowerCase();

  for (const trigger of COMMAND_TRIGGERS) {
    for (const pattern of trigger.patterns) {
      if (pattern.test(inputLower)) {
        matches.push({ cmd: trigger.cmd, priority: trigger.priority });
        break; // Only match once per command
      }
    }
  }

  // Sort by priority (lower = higher priority)
  return matches.sort((a, b) => a.priority - b.priority);
}

async function main() {
  const userPrompt = process.env.USER_PROMPT || '';

  if (!userPrompt || userPrompt.startsWith('/')) {
    // Don't suggest if empty or already a slash command
    process.exit(0);
  }

  const matches = findMatchingCommands(userPrompt);

  if (matches.length > 0) {
    const topMatch = matches[0];
    const others = matches.slice(1, 3).map(m => m.cmd).join(", ");

    const suggestion = `
SLASH COMMAND DETECTED: Based on your request, consider using:
  PRIMARY: ${topMatch.cmd}
${others ? `  ALSO RELEVANT: ${others}` : ""}

To use, type the command or ask me to run it. The AI system can auto-invoke these when appropriate.
`.trim();

    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: suggestion } }));
  }

  process.exit(0);
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
