#!/usr/bin/env node
// tier: T2
/**
 * skill-chain-suggest.mjs — Workflow Skill Chaining
 * ==================================================
 *
 * UserPromptSubmit hook that detects completed skill patterns and
 * suggests the next skill in the workflow chain.
 *
 * FIRES ON: UserPromptSubmit
 *
 * Chains:
 *   /dedup (clear)     → suggest /forge-triple
 *   /pdf-learn         → suggest /shop-knowledge
 *   /test (all pass)   → suggest /ship
 *   /forge-triple      → suggest /test
 *   /scrutinize        → suggest /ship or /fix
 *   /build (pass)      → suggest /test
 *   /wire-edm-studio   → suggest /wedm-validate
 *   /lathe-studio      → suggest /lathe-validate
 */

const SKILL_CHAINS = {
  "dedup": {
    successPattern: /clear|no duplicates|proceed/i,
    next: "/forge-triple",
    reason: "No duplicates found — ready to build"
  },
  "pdf-learn": {
    successPattern: /extracted|tips|knowledge/i,
    next: "/shop-knowledge",
    reason: "Extraction complete — integrate into tribal knowledge"
  },
  "test": {
    successPattern: /pass|success|✓|all.*passed/i,
    next: "/ship",
    reason: "Tests passing — ready to ship"
  },
  "forge-triple": {
    successPattern: /created|built|wired/i,
    next: "/test",
    reason: "Assets created — run tests to verify"
  },
  "scrutinize": {
    successPattern: /score.*0\.9|pass|clean/i,
    next: "/ship",
    reason: "Scrutiny passed — ready to ship"
  },
  "build": {
    successPattern: /success|complete|built/i,
    next: "/test",
    reason: "Build succeeded — run tests"
  },
  "wire-edm-studio": {
    successPattern: /program|generated|complete/i,
    next: "/wedm-validate",
    reason: "Program generated — validate before use"
  },
  "lathe-studio": {
    successPattern: /program|generated|complete/i,
    next: "/lathe-validate",
    reason: "Program generated — validate before use"
  },
  "video-learn": {
    successPattern: /extracted|procedures|tips/i,
    next: "/shop-knowledge",
    reason: "Video extracted — integrate knowledge"
  },
  "quote": {
    successPattern: /estimate|total|price/i,
    next: "/quote-review",
    reason: "Quote generated — review before sending"
  }
};

// Track last skill result in memory (resets each session)
let lastSkillResult = { skill: null, output: null };

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 200);
  });
}

function detectSkillInPrompt(prompt) {
  const match = prompt.match(/\/([a-z][-a-z0-9]*)/i);
  return match ? match[1].toLowerCase() : null;
}

function findChainSuggestion(skill, context) {
  const chain = SKILL_CHAINS[skill];
  if (!chain) return null;

  // Check if context suggests success
  if (chain.successPattern.test(context)) {
    return {
      next: chain.next,
      reason: chain.reason,
    };
  }
  return null;
}

async function main() {
  const input = await readStdin();
  const prompt = input.prompt || input.message || "";

  // Detect if a skill was just invoked
  const skill = detectSkillInPrompt(prompt);

  // If we have a previous skill result, check for chain suggestion
  if (lastSkillResult.skill && lastSkillResult.output) {
    const suggestion = findChainSuggestion(lastSkillResult.skill, lastSkillResult.output);
    if (suggestion) {
      const ctx = `💡 Workflow: ${suggestion.reason}\n   → Next: ${suggestion.next}`;
      lastSkillResult = { skill: null, output: null }; // Reset

      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: ctx,
        },
      }));
      return;
    }
  }

  // Track current skill for next iteration
  if (skill) {
    lastSkillResult = { skill, output: prompt };
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
