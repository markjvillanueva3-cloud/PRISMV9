#!/usr/bin/env node
// tier: T0
/**
 * UserPromptSubmit hook — SPARC opt-in gate.
 *
 * Phase 0.17 U-PLG6 from MASTER-AI-SYSTEM-ROADMAP. If the user types
 * a prompt that starts with `/sparc` (the slash command), refuse
 * unless `state/shared/SPARC_OPT_IN.flag` is present AND enabled.
 *
 * Reason: SPARC is a 5-phase sequential workflow (spec → pseudo →
 * arch → refine → complete) that costs ~5 subagent invocations and
 * ~30 minutes. It should NOT fire on every "design a new engine"
 * prompt — only when the user has explicitly opted in for a genuinely
 * novel subsystem.
 *
 * When refusing, inject helpful context pointing at /forge-triple
 * (the default workflow) and the opt-in instructions.
 *
 * Exits 0 on non-match or flag-present; exits 2 with a block reason
 * on match-without-flag (UserPromptSubmit blocking contract).
 */
import fs from "node:fs";
import { resolve } from "node:path";



function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const FLAG = resolve("H:/prism/state/shared/SPARC_OPT_IN.flag");

function readStdin() {
  return readStdinSafe();
}

function isSparcPrompt(text) {
  if (typeof text !== "string") return false;
  const t = text.trim();
  return t === "/sparc" || t.startsWith("/sparc ") || t.startsWith("/sparc\n");
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw) { process.exit(0); return; }
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); return; }

    const prompt = data.prompt || data.user_prompt || data.input || "";
    if (!isSparcPrompt(prompt)) { process.exit(0); return; }

    // Prompt is /sparc — check opt-in flag.
    let optedIn = false;
    if (fs.existsSync(FLAG)) {
      try {
        const doc = JSON.parse(fs.readFileSync(FLAG, "utf8"));
        optedIn = !!doc.enabled;
      } catch { /* treat as not opted in */ }
    }

    if (optedIn) { process.exit(0); return; }

    // Refuse with a blocking message.
    const msg = [
      "SPARC is opt-in and currently disabled.",
      "",
      "SPARC runs a 5-phase sequential workflow (spec → pseudo → arch →",
      "refine → complete) across five subagents. It costs ~30 min and is",
      "only worthwhile for genuinely novel subsystems spanning multiple",
      "engines + dispatchers + state files.",
      "",
      "For a single engine + skill + hook, use /forge-triple instead — it",
      "is faster and matches PRISM's default pattern.",
      "",
      "To opt in for this session:",
      '  prism_ai { action: "ai_sparc_optin", enabled: true, reason: "<why>" }',
      "  OR write H:/prism/state/shared/SPARC_OPT_IN.flag with {enabled:true}",
      "",
      "To check status:",
      '  prism_ai { action: "ai_sparc_status" }',
    ].join("\n");
    process.stderr.write(msg + "\n");
    process.exit(2);
  } catch {
    process.exit(0);
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
