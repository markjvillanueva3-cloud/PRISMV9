// scripts/lib/command-ollama-routes.mjs
//
// COMMAND → OLLAMA ROUTE REGISTRY (BLACKWELL-TOKEN-SYNERGY-MS0 / U-CMD-OLLAMA-ROUTE,
// slot:bravo, 2026-06-04).
//
// THE PROBLEM this closes: `ollama-pipeline-injector.mjs` (UserPromptSubmit hook)
// only *suggests* Ollama routes as advisory prose in the prompt context. The live
// telemetry says that approach does not work — take-rate 38/5945 fires = 0.6% (the
// chat reads "consider calling qwen2.5-coder" and ignores it). Meanwhile
// `ask-ollama.mjs` is a real, working local-LLM execution surface (modes
// viz/summarize/explain/triage/ask) that nothing routes high-ROI commands to.
//
// This registry is the EXECUTABLE bridge: for each high-ROI slash command it
// records (a) the backing script that triggers the command's pipeline directly
// (so a chat can run the *intention* of /close-out-audit without invoking the
// skill), and (b) the mechanical LLM step(s) that can be offloaded to a LOCAL
// model via ask-ollama — turning an ignored nudge into a single deterministic
// Bash call (`node scripts/trigger-command-pipeline.mjs <command> <arg>`).
//
// HONESTY (R12): each entry separates `ollamaSteps` (mechanical work a local
// model does well — summarize/explain/triage/keyword-search) from `claudeKeeps`
// (judgment/safety/synthesis that must stay on Claude). A route NEVER claims to
// fully execute a command — it offloads only the token-heavy mechanical step.
//
// Every `script` path in this file is verified to exist on disk at authoring
// time; a `null` script means the command is skill-orchestrated with no single
// backing script (the offload still applies to its mechanical step). Every
// `mode` is one of ask-ollama's real modes (asserted against OLLAMA_MODES by the
// test suite, which fails if ask-ollama's mode set ever drifts).
//
// Pure data + pure lookups only — no I/O. The runner
// (scripts/trigger-command-pipeline.mjs) consumes this and performs execution.
//
// @module command-ollama-routes

/**
 * The real mode set exposed by scripts/ask-ollama.mjs (FILE_MODES ∪ TEXT_MODES).
 * Kept here as the contract this registry is written against; the test suite
 * imports ask-ollama's ALL_MODES and asserts this equals it, so a future
 * ask-ollama mode rename can never silently leave a route pointing at a dead
 * mode. `viz`, `ask` and `rerank` take free text; `summarize`/`explain`/`triage`
 * take a file path.
 */
// `rerank` added 2026-06-11 (OLLAMA-FLEET-AUDIT): ask-ollama gained the verified
// search re-rank mode (TEXT_MODES) but this registry was never updated, leaving
// the drift test red and the rerank offload route unrepresentable. It is a
// free-text mode (a search query), peer to `viz`/`ask`.
export const OLLAMA_MODES = Object.freeze(["viz", "ask", "rerank", "summarize", "explain", "triage"]);

/** Modes whose `input` is a file path (vs. free-text query). Mirrors ask-ollama FILE_MODES. */
export const FILE_MODES = Object.freeze(["summarize", "explain", "triage"]);

/**
 * Where a step's input comes from:
 *   "cli-arg" — the argument the operator passes on the trigger CLI
 *               (`trigger-command-pipeline <command> <THIS>`).
 *   "path"    — a fixed repo-relative path the backing script produces/owns
 *               (e.g. the close-out report). `value` holds the path.
 * A step with input.kind "path" can run with no CLI arg; "cli-arg" requires one.
 */

/**
 * @typedef {Object} OllamaStep
 * @property {string} label        human label for the offloaded step
 * @property {string} mode         ask-ollama mode (one of OLLAMA_MODES)
 * @property {{kind:"cli-arg"|"path", value?:string}} input  where the step's input comes from
 * @property {string|null} model   explicit model override, or null for ask-ollama's host-aware default
 * @property {number} saves        est. Claude tokens saved per run (back-of-envelope)
 * @property {string} note         what this step does + why it is safe to offload
 */

/**
 * @typedef {Object} CommandRoute
 * @property {string} command      canonical command name (no leading slash)
 * @property {string[]} aliases    other command names that share this pipeline
 * @property {string|null} script  verified backing script (repo-relative) or null if skill-orchestrated
 * @property {string} intent       one-line description of what the command's pipeline does
 * @property {OllamaStep[]} ollamaSteps  mechanical steps offloadable to a local model
 * @property {string} claudeKeeps  what still requires Claude (judgment/safety/synthesis)
 */

/** @type {readonly CommandRoute[]} */
export const COMMAND_ROUTES = Object.freeze([
  // ── viz/keyword-search commands — the biggest FREE win (no model inference at
  //    all; ask-ollama `viz` is a pure local graph keyword search that returns
  //    compact hits, zero Claude tokens, zero GPU). High frequency × high bytes.
  {
    command: "find",
    aliases: ["deep-search", "master-index", "connection-finder", "nav"],
    script: null,
    intent: "locate engines/actions/nodes by keyword across the system-viz graph",
    ollamaSteps: [
      {
        label: "local graph keyword search",
        mode: "viz",
        input: { kind: "cli-arg" },
        model: null,
        saves: 4000,
        note: "ask-ollama viz scans the whole architecture graph locally and returns ≤12 compact hits — replaces pulling the multi-MB graph into Claude. No model call (free) unless --synth.",
      },
    ],
    claudeKeeps: "interpreting which hit is the right one + cross-node synthesis once the candidate set is small.",
  },

  // ── summarize-a-report commands — backing script produces a big artifact,
  //    Ollama compresses it, Claude only decides on the compressed digest.
  {
    command: "close-out-audit",
    aliases: ["close-out"],
    script: "scripts/audit-close-out-candidates.mjs",
    intent: "surface shipped-but-still-pending roadmap units (silent close-out debt)",
    ollamaSteps: [
      {
        label: "summarize the close-out candidate report",
        mode: "summarize",
        input: { kind: "path", value: "state/shared/CLOSE-OUT-CANDIDATES.md" },
        model: null,
        saves: 2500,
        note: "the audit script writes a long CANDIDATES.md; a local summarize turns it into a per-drift one-liner so Claude only adjudicates flip-or-skip, never re-reads the full report.",
      },
    ],
    claudeKeeps: "the flip-or-skip decision per candidate (advisory report is human/Claude-verified — never auto-flipped).",
  },
  {
    command: "distill-tribal",
    aliases: [],
    script: "scripts/distill-tribal.mjs",
    intent: "compress raw tribal-knowledge captures into dense, cited tips",
    ollamaSteps: [
      {
        label: "summarize the raw tribal source (pass a FILE PATH)",
        mode: "summarize",
        input: { kind: "cli-arg" },
        model: null,
        saves: 2000,
        note: "arg is a file path (summarize is a file-mode). Distillation is the local-LLM sweet spot (compress prose, no safety stakes); Claude only validates the cited claim survived.",
      },
    ],
    claudeKeeps: "verifying the distilled tip is faithful to the source + assigning the right domain tag.",
  },
  {
    command: "weekly-synthesis",
    aliases: [],
    script: null,
    intent: "roll up the week's memories/commits into a synthesis note",
    ollamaSteps: [
      {
        label: "summarize a memory/commit batch (pass a FILE PATH)",
        mode: "summarize",
        input: { kind: "cli-arg" },
        model: null,
        saves: 3000,
        note: "arg is a file path to one batch (summarize is a file-mode); run once per batch. The per-batch compression is mechanical; Claude only writes the cross-batch narrative from the compressed digests.",
      },
    ],
    claudeKeeps: "the cross-batch narrative + deciding what's promotion-worthy (memory→wiki→CLAUDE.md).",
  },

  // ── de-sloppify: compress verbose prose/code. Local model drafts the lean
  //    version; Claude applies the surgical edit (it must not change behavior).
  {
    command: "de-sloppify",
    aliases: [],
    script: null,
    intent: "tighten verbose code/comments/docs without changing behavior",
    ollamaSteps: [
      {
        label: "draft a concise version of a verbose file (pass a FILE PATH)",
        mode: "summarize",
        input: { kind: "cli-arg" },
        model: null,
        saves: 1500,
        note: "arg is a file path to the verbose file (summarize is a file-mode). The local model proposes the compressed wording; the actual edit stays on Claude so no behavior/semantics shift slips in.",
      },
    ],
    claudeKeeps: "applying the edit (preserving behavior, types, public API) — the local draft is advisory only.",
  },

  // ── lint-a-markdown commands — style commentary is local; the deterministic
  //    gate (if any) still runs as its own script.
  {
    command: "skill-lint",
    aliases: [],
    script: "scripts/skill-lint.mjs",
    intent: "check a skill .md for structure/clarity/drift",
    ollamaSteps: [
      {
        label: "style + clarity commentary on the skill body",
        mode: "explain",
        input: { kind: "cli-arg" },
        model: null,
        saves: 1500,
        note: "skill-lint.mjs runs the deterministic structural checks; ask-ollama supplements free-form clarity/style notes (advisory) without touching the hard gate.",
      },
    ],
    claudeKeeps: "acting on structural failures from skill-lint.mjs + deciding which style notes to apply.",
  },

  // ── triage commands — feed an error/build dump to a local model for root-cause.
  {
    command: "diagnose-fix",
    aliases: ["troubleshooting-guide"],
    script: null,
    intent: "diagnose a build/test/runtime failure and propose the fix",
    ollamaSteps: [
      {
        label: "root-cause an error/build dump",
        mode: "triage",
        input: { kind: "cli-arg" },
        model: null,
        saves: 2500,
        note: "ask-ollama triage reads the dump locally and names the root cause + likely file/line; Claude only takes over when the triage points at a safety-critical surface (physics/dispatcher contracts).",
      },
    ],
    claudeKeeps: "the actual fix + any safety-critical reasoning the triage flags (escalate then).",
  },

  // ── explain-a-file commands — plain-language walkthrough is local work.
  {
    command: "explain",
    aliases: ["cad-explain", "program-audit"],
    script: null,
    intent: "explain what a file/program does in plain language",
    ollamaSteps: [
      {
        label: "plain-language explanation of the file",
        mode: "explain",
        input: { kind: "cli-arg" },
        model: null,
        saves: 2000,
        note: "control-flow / what-it-does explanation is qwen2.5-coder territory per CLAUDE.md §AI SYSTEM ROUTING; Claude enters only for cross-domain or safety-relevant synthesis.",
      },
    ],
    claudeKeeps: "cross-domain synthesis + any safety-relevant interpretation of the explained code.",
  },
]);

/**
 * Resolve a command name (or alias) to its route. Case-insensitive; a leading
 * slash is tolerated so "/find" and "find" both resolve. Returns null when no
 * route exists (caller fails loud).
 *
 * @param {string} name
 * @returns {CommandRoute|null}
 */
export function getRoute(name) {
  if (typeof name !== "string" || !name.trim()) return null;
  const key = name.trim().replace(/^\//, "").toLowerCase();
  for (const r of COMMAND_ROUTES) {
    if (r.command.toLowerCase() === key) return r;
    if (r.aliases.some((a) => a.toLowerCase() === key)) return r;
  }
  return null;
}

/** Total est. tokens a route saves per run (sum across its ollama steps). */
export function routeSavings(route) {
  if (!route || !Array.isArray(route.ollamaSteps)) return 0;
  return route.ollamaSteps.reduce((sum, s) => sum + (Number(s.saves) || 0), 0);
}

/**
 * All routes ranked by est. savings/run, descending (ties broken by command
 * name for deterministic output). Returns a fresh array (does not mutate the
 * frozen registry).
 *
 * @returns {CommandRoute[]}
 */
export function listRoutes() {
  return [...COMMAND_ROUTES].sort(
    (a, b) => routeSavings(b) - routeSavings(a) || a.command.localeCompare(b.command),
  );
}

/** Every command name + alias currently routable (flat, deduped, sorted). */
export function routableCommands() {
  const names = new Set();
  for (const r of COMMAND_ROUTES) {
    names.add(r.command);
    for (const a of r.aliases) names.add(a);
  }
  return [...names].sort();
}
