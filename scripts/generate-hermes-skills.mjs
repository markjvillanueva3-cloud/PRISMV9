#!/usr/bin/env node
/**
 * generate-hermes-skills.mjs -- emit the /hermes-* task-skill family
 * (HERMES-PARITY/U-HERMES-OLLAMA-PARITY-L2).
 *
 * The /ollama-* family (12 skills) routes mechanical text/code work to the free
 * LOCAL Ollama. This generator emits the parallel /hermes-* family that routes the
 * SAME task classes to Hermes (the :8645 proxy -> xAI Grok, managed OAuth) via the
 * single canonical entry `scripts/ask-hermes.mjs`. Every emitted skill:
 *   - calls ask-hermes.mjs (NEVER raw curl / a retired model tag -- the legacy
 *     ollama-* skills used `qwen2.5-coder:7b` curl, retired 2026-06-04; we do not
 *     replicate that), so it inherits the L1a/L1b safety guard + file cap +
 *     size-scaled timeout + Ollama fallback for free.
 *   - is HONEST that Hermes is PAID (Grok tokens), NOT a $0 default -- it is the
 *     escalation tier above the free local /ollama-<task> (R12 + the cost-design
 *     rule: Hermes is a capable remote model, never a free rung).
 *
 * Mirrors the `generate-per-slot-wrappers.mjs` precedent: a single template + a spec
 * table, idempotent (re-runnable). Pure render fns are exported + unit-tested.
 *
 * Run:  node scripts/generate-hermes-skills.mjs          (write all to .claude/commands/)
 *       node scripts/generate-hermes-skills.mjs --check   (report drift, write nothing)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const COMMANDS_DIR = resolve(REPO_ROOT, ".claude", "commands");

/**
 * The 12 /hermes-* skills, paralleling the 12 /ollama-* skills. `mode` (when set)
 * is an ask-hermes.mjs mode; `wrap` (when set) wraps the literal $ARGUMENTS into an
 * `ask`-mode task prompt; `customBody` (when set) replaces the standard template for
 * the two non-text skills (route-check health probe, bridge pointer).
 */
export const SPEC = [
  {
    name: "explain", sibling: "explain", noun: "code/concept explanation",
    title: "Code / concept explanation",
    mode: "explain",
    example: `node scripts/ask-hermes.mjs explain scripts/regen-viz.mjs\n# a snippet or concept as literal text:\nnode scripts/ask-hermes.mjs ask "explain the Taylor tool-life equation"`,
    stronger: "a large/dense module where Grok's reasoning + 1M context beats local Ollama",
    keywords: ["hermes-explain", "hermes explain", "explain with hermes", "grok explain"],
  },
  {
    name: "summarize", sibling: "summarize", noun: "file/doc digest",
    title: "File / document digest",
    mode: "summarize",
    example: `node scripts/ask-hermes.mjs summarize mcp-server/src/engines/SomeEngine.ts\n# pipe command output via stdin:\nrtk git log -50 | node scripts/ask-hermes.mjs summarize -`,
    stronger: "a very large file/log where the 1M-ctx window holds what local Ollama cannot",
    keywords: ["hermes-summarize", "hermes summarize", "summarize with hermes", "grok summarize"],
  },
  {
    name: "classify", sibling: "classify", noun: "classification",
    title: "One-line classification",
    mode: "classify",
    example: `node scripts/ask-hermes.mjs classify "roughing or finishing: ap=0.2mm ae=0.1D"`,
    stronger: "a nuanced/ambiguous classification local Ollama gets wrong",
    keywords: ["hermes-classify", "hermes classify", "classify with hermes"],
  },
  {
    name: "error-triage", sibling: "error-triage", noun: "error/log triage",
    title: "Build/test/error triage",
    mode: "triage",
    example: `node scripts/ask-hermes.mjs triage /tmp/tsc-errors.log\nrtk vitest run 2>&1 | node scripts/ask-hermes.mjs triage -`,
    stronger: "a long, tangled error dump whose root cause needs deeper reasoning",
    keywords: ["hermes-error-triage", "hermes triage", "triage with hermes", "diagnose error hermes"],
  },
  {
    name: "diff-summary", sibling: "diff-summary", noun: "diff summary",
    title: "Diff summary",
    customBody: true, // git-diff pipe into summarize mode
    example: `rtk git diff | node scripts/ask-hermes.mjs summarize -\nrtk git show HEAD | node scripts/ask-hermes.mjs summarize -`,
    stronger: "a sprawling multi-file diff that exceeds local Ollama's useful window",
    keywords: ["hermes-diff-summary", "hermes diff", "summarize diff hermes"],
  },
  {
    name: "docstring", sibling: "docstring", noun: "docstring generation",
    title: "Docstring / JSDoc generation",
    wrap: "Write a concise JSDoc/docstring for the following code. Output ONLY the comment block, no prose:",
    stronger: "a complex signature/contract where the stronger model writes a more accurate doc",
    keywords: ["hermes-docstring", "hermes docstring", "jsdoc with hermes", "document this hermes"],
  },
  {
    name: "extract", sibling: "extract", noun: "field extraction",
    title: "Field / data extraction",
    wrap: "Extract the requested fields from the text below and return them as compact JSON only:",
    stronger: "messy unstructured text where the stronger model extracts more reliably",
    keywords: ["hermes-extract", "hermes extract", "extract fields hermes"],
  },
  {
    name: "boilerplate", sibling: "boilerplate", noun: "boilerplate scaffolding",
    title: "Boilerplate / scaffold generation",
    wrap: "Generate the requested boilerplate. Output ONLY code, follow the repo's conventions:",
    stronger: "a larger scaffold where Grok's breadth produces a more complete starting point",
    keywords: ["hermes-boilerplate", "hermes boilerplate", "scaffold with hermes"],
  },
  {
    name: "test-stub", sibling: "test-stub", noun: "test scaffolding",
    title: "Test scaffold generation",
    wrap: "Generate a vitest/node:test scaffold for the code below (real assertions, not toBeDefined stubs). Output ONLY the test code:",
    stronger: "a function with many branches whose edge cases the stronger model enumerates better",
    keywords: ["hermes-test-stub", "hermes test", "generate tests hermes"],
  },
  {
    name: "architecture-plan", sibling: "architecture-plan", noun: "architecture planning",
    title: "Multi-step architecture planning",
    wrap: "You are a senior architect. Produce a concise, dependency-ordered implementation plan for the following:",
    stronger: "a multi-step design where Grok's 1M context + reasoning genuinely outclasses local Ollama (this is the BEST fit for Hermes)",
    keywords: ["hermes-architecture-plan", "hermes plan", "architecture plan hermes", "design plan hermes"],
  },
  {
    name: "route-check", sibling: "route-check", noun: "offload health check",
    title: "Hermes offload health check",
    customBody: "route-check",
    keywords: ["hermes-route-check", "hermes health", "is hermes up", "hermes offload rate", "hermes utilization"],
  },
  {
    name: "bridge", sibling: "bridge", noun: "multi-step investigation",
    title: "Multi-step agentic investigation (pointer)",
    customBody: "bridge",
    keywords: ["hermes-bridge", "agentic hermes", "multi-step hermes", "hermes investigation"],
  },
];

/** Build the description line for a spec (used in frontmatter + autosuggest context). */
export function descriptionFor(s) {
  if (s.customBody === "route-check") {
    return "Health-check the Hermes offload lane: is the :8645 proxy up, and what is the ask-hermes utilization (byHook) in the offload ledger? Sibling of /ollama-route-check (the local-Ollama rate check).";
  }
  if (s.customBody === "bridge") {
    return "Discoverability pointer: a multi-step AGENTIC Hermes investigation is /hermes-workflow (Hermes' own agent loop); a single Grok-class answer is /ask-hermes. Parallels /ollama-bridge without duplicating its local agent harness.";
  }
  return `${s.title} via Hermes (Nous proxy -> xAI Grok, managed OAuth, off-Claude). PAID remote, stronger + larger-context than local Ollama; auto-falls-back to free Ollama if the proxy is down. Escalation tier above the free /ollama-${s.sibling}.`;
}

/** Frontmatter block (ASCII only). Pure. */
export function frontmatter(s) {
  const kw = s.keywords.map((k) => `      - ${k}`).join("\n");
  return [
    "---",
    `name: hermes-${s.name}`,
    `description: ${descriptionFor(s)}`,
    "version: 1.0.0",
    "tier: T4",
    "milestone: HERMES-PARITY",
    "unit: U-HERMES-OLLAMA-PARITY-L2",
    "trigger:",
    "  autoSuggest:",
    "    keywords:",
    kw,
    "---",
    "",
  ].join("\n");
}

/** Standard templated body for the text/ask skills (ASCII only). Pure. */
function templatedBody(s) {
  const callExample = s.wrap
    ? `node scripts/ask-hermes.mjs ask "${s.wrap} <your code/text>"`
    : s.example;
  return [
    `# /hermes-${s.name} -- ${s.title} via Hermes (Grok-class, off-Claude)`,
    "",
    `Routes ${s.noun} through \`scripts/ask-hermes.mjs\` to Hermes' local OpenAI-compatible`,
    "proxy (`:8645/v1`) -> xAI **Grok** (managed OAuth). Stronger and larger-context than",
    "local Ollama, processed OUTSIDE the Claude context window. It inherits ask-hermes's",
    "NC/G-code safety guard, file cap, size-scaled timeout, and Ollama fallback.",
    "",
    "**PAID** (Grok tokens): this is the escalation tier above the free local",
    `\`/ollama-${s.sibling}\`. If the proxy is down it degrades to free local Ollama (loud`,
    "about why), so it never hard-fails. It is NOT a $0 default.",
    "",
    "## Usage",
    "```bash",
    callExample,
    "```",
    "Flags: `--json` `--model <id>` `--timeout <ms>` `--max-tokens <n>` `--no-fallback`.",
    "",
    `## When to use this vs /ollama-${s.sibling}`,
    "",
    "| Want | Use |",
    "|---|---|",
    `| free, fast, mechanical ${s.noun} (the default) | \`/ollama-${s.sibling}\` (local Ollama, $0) |`,
    `| stronger Grok-class / 1M-ctx ${s.noun}, still off-Claude | \`/hermes-${s.name}\` (PAID) |`,
    "| Claude deep reasoning + safety | stay in Claude |",
    "",
    `Reach for \`/hermes-${s.name}\` only when local Ollama is not strong enough:`,
    `${s.stronger}.`,
    "",
    "## Related",
    "",
    `- \`/ollama-${s.sibling}\` -- the free local-Ollama sibling.`,
    "- `/ask-hermes` -- the general Hermes bridge (all modes).",
    "- `scripts/ask-hermes.mjs` -- the bridge (NC-guard + file cap + size-scaled timeout + Ollama fallback).",
    "",
  ].join("\n");
}

/** Custom body for /hermes-route-check (offload health probe). Pure. */
function routeCheckBody() {
  return [
    "# /hermes-route-check -- Hermes offload lane health",
    "",
    "Is the Hermes lane usable, and how much work is it actually handling? Sibling of",
    "`/ollama-route-check` (which reports the local-Ollama offload rate).",
    "",
    "## Probe the proxy (is Hermes reachable?)",
    "```bash",
    "node scripts/hermes-proxy-ensure.mjs --provider xai   # idempotent: starts it if down",
    "rtk curl http://127.0.0.1:8645/v1/models               # roster -> proxy is up",
    "```",
    "",
    "## Report ask-hermes utilization (byHook ledger)",
    "```bash",
    "node -e \"const s=require('./mcp-server/data/state/ollama-offload-stats.json').byHook['ask-hermes']||{};console.log('ask-hermes:',JSON.stringify({fired:s.fired||0,offloaded:s.offloaded||0,bySource:s.bySource||{},byMode:s.byMode||{},lastUsed:s.lastUsed||null},null,2))\"",
    "```",
    "",
    "`bySource.hermes` = real Hermes answers; `bySource.ollama-fallback` = the proxy was",
    "down and free local Ollama saved it; `bySource.fail` = neither answered (Claude had to).",
    "A healthy lane shows a non-zero `hermes` count and a recent `lastUsed`.",
    "",
    "## Related",
    "",
    "- `/ollama-route-check` -- the local-Ollama offload-rate sibling.",
    "- `scripts/ollama-offload-dashboard.mjs` -- the full offload dashboard (Hermes + Ollama).",
    "- `/ask-hermes` -- the bridge whose calls this ledger counts.",
    "",
  ].join("\n");
}

/** Custom body for /hermes-bridge (pointer, NOT a duplicate harness). Pure. */
function bridgeBody() {
  return [
    "# /hermes-bridge -- multi-step agentic Hermes (pointer)",
    "",
    "`/ollama-bridge` runs a multi-step codebase investigation on a LOCAL Ollama model",
    "(`scripts/ollama-prism-bridge.mjs`, a read-only tool-chaining agent loop). The Hermes",
    "lane does NOT re-implement that harness -- it already has two agentic surfaces:",
    "",
    "| Want | Use |",
    "|---|---|",
    "| a multi-step AGENTIC investigation on Hermes (tools + loop) | `/hermes-workflow` (Hermes' own agent) |",
    "| a single Grok-class answer to one question (off-Claude) | `/ask-hermes` |",
    "| the FREE local multi-step investigation | `/ollama-bridge` (local Ollama, $0) |",
    "",
    "This entry exists for discoverability so `/hermes-bridge` resolves to the right tool;",
    "it deliberately does not fork the local bridge harness (R8/R16 -- no duplicate).",
    "",
    "## Related",
    "",
    "- `/hermes-workflow` -- Hermes agentic orchestration (the real agentic path).",
    "- `/ask-hermes` -- single-shot Grok-class answer.",
    "- `/ollama-bridge` -- the free local-Ollama multi-step investigator.",
    "",
  ].join("\n");
}

/** Render the full skill markdown for a spec. Pure -- no I/O. */
export function renderSkill(s) {
  let body;
  if (s.customBody === "route-check") body = routeCheckBody();
  else if (s.customBody === "bridge") body = bridgeBody();
  else if (s.customBody === true) {
    // diff-summary: a thin pipe-into-summarize skill (no ask-hermes mode of its own).
    body = [
      `# /hermes-${s.name} -- ${s.title} via Hermes (Grok-class, off-Claude)`,
      "",
      "Pipe a diff into `ask-hermes.mjs summarize` so a Grok-class model digests the change",
      "OUTSIDE the Claude context window. Inherits the file cap + size-scaled timeout + Ollama",
      "fallback. **PAID** (Grok tokens): the escalation tier above the free `/ollama-diff-summary`.",
      "",
      "## Usage",
      "```bash",
      s.example,
      "```",
      "Flags (after `summarize -`): `--json` `--model <id>` `--timeout <ms>` `--no-fallback`.",
      "",
      "## When to use this vs /ollama-diff-summary",
      "",
      "| Want | Use |",
      "|---|---|",
      "| free, fast diff digest (the default) | `/ollama-diff-summary` (local Ollama, $0) |",
      `| stronger / 1M-ctx digest of a large diff, off-Claude | \`/hermes-${s.name}\` (PAID) |`,
      "",
      `Reach for \`/hermes-${s.name}\` only when local Ollama is not strong enough: ${s.stronger}.`,
      "",
      "## Related",
      "",
      "- `/ollama-diff-summary` -- the free local-Ollama sibling.",
      "- `/ask-hermes` -- the general Hermes bridge.",
      "- `scripts/ask-hermes.mjs` -- the bridge (file cap + timeout scaling + Ollama fallback).",
      "",
    ].join("\n");
  } else body = templatedBody(s);
  return frontmatter(s) + body;
}

/** Render every skill: returns [{ path, name, content }]. Pure (no writes). */
export function renderAll(dir = COMMANDS_DIR) {
  return SPEC.map((s) => ({
    name: `hermes-${s.name}`,
    path: join(dir, `hermes-${s.name}.md`),
    content: renderSkill(s),
  }));
}

function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(COMMANDS_DIR)) {
    if (check) { process.stderr.write(`[gen-hermes-skills] commands dir missing: ${COMMANDS_DIR}\n`); process.exit(3); }
    mkdirSync(COMMANDS_DIR, { recursive: true });
  }
  const rendered = renderAll();
  let written = 0, drift = 0;
  for (const r of rendered) {
    const exists = existsSync(r.path);
    const prior = exists ? readFileSync(r.path, "utf8") : null;
    if (prior === r.content) continue; // idempotent: byte-identical -> skip
    if (check) { drift += 1; process.stdout.write(`DRIFT: ${r.name}\n`); continue; }
    writeFileSync(r.path, r.content);
    written += 1;
  }
  if (check) {
    process.stdout.write(`[gen-hermes-skills] ${drift} of ${rendered.length} skill(s) drifted from canonical.\n`);
    process.exit(drift ? 1 : 0);
  }
  process.stdout.write(`[gen-hermes-skills] wrote ${written} / ${rendered.length} hermes-* skill(s) to ${COMMANDS_DIR}\n`);
}

const _invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/generate-hermes-skills.mjs");
if (_invokedDirectly) main();
