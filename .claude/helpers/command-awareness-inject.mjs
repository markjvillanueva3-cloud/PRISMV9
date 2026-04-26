#!/usr/bin/env node
/**
 * Command Awareness Inject — Universal Command Knowledge Injection
 *
 * Injects critical command knowledge into ALL contexts:
 * - SessionStart
 * - SubagentStart
 * - PreToolUse (Agent)
 *
 * This ensures NO session or subagent is ever unaware of critical commands.
 */

const CRITICAL_COMMANDS = `
PRISM CRITICAL COMMANDS (AUTO-SUGGEST WHEN TRIGGERED):

LEARNING (suggest immediately when triggered):
  /pdf-learn      — PDF/document/manual/catalog → Extract to tribal knowledge
  /video-learn    — Video/youtube/tutorial → Extract to procedures
  /shop-knowledge — Tribal/shop floor wisdom → Extract to tips

FORGE (ALWAYS run /dedup first):
  /dedup          — MANDATORY before creating ANY new asset
  /forge-triple   — Create engines + skills + hooks together

MACHINE-SPECIFIC:
  /wire-edm-studio — Wire EDM programming (Mitsubishi FA-S)
  /lathe-studio   — Lathe/turning (Okuma OSP)
  /machine-harden — Harden AI for specific machines

OPTIMIZATION:
  /auto-speed-feed — Speed/feed calculations
  /program-optimize — CNC program optimization
  /scrutinize     — Deep code review

BUSINESS:
  /quote-to-ship  — Quotes, estimates, job costing
  /smart          — AI-powered task routing

AUTO-INVOKE RULES:
- "pdf" mentioned → SUGGEST /pdf-learn
- "video" mentioned → SUGGEST /video-learn
- "create engine" → /dedup THEN /forge-triple
- "wire edm" → SUGGEST /wire-edm-studio
- "lathe/turning" → SUGGEST /lathe-studio
`.trim();

async function main() {
  // Always inject command awareness
  console.log(JSON.stringify({
    additionalContext: CRITICAL_COMMANDS
  }));
}

main().catch(() => process.exit(0));
