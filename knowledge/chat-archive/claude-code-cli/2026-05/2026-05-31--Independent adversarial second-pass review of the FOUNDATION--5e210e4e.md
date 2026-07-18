---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Independent adversarial second-pass review of the FOUNDATION changeset of PSN-OC"
date: "2026-05-31"
first_ts: "2026-05-31T19:28:56.491Z"
last_ts: "2026-05-31T19:33:39.676Z"
cwd: "H:\\prism-slot-bravo"
messages: 61
user_msgs: 24
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a39fc12e639a6fc6b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:37"
---

# Independent adversarial second-pass review of the FOUNDATION changeset of PSN-OC

> **claude-code-cli** | 2026-05-31 | 61 msgs (24 user / 37 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a39fc12e639a6fc6b.jsonl`

## Transcript

### User | 2026-05-31T19:28:56.491Z

Independent adversarial second-pass review of the FOUNDATION changeset of PSN-OCTOPUS-FLEET-SYNERGY-MS0 (PRISM, main tree H:/prism). Do NOT assume the other reviewer caught everything. Read END TO END:
- H:/prism/scripts/lib/octopus-corpus-loader.mjs
- H:/prism/scripts/lib/octopus-corpus-loader.test.mjs
- H:/prism/scripts/lib/octopus-dispatch.mjs
- H:/prism/scripts/lib/octopus-dispatch.test.mjs
- H:/prism/scripts/octopus-with-hermes-rag.mjs  (diff: `git -C H:/prism diff -- scripts/octopus-with-hermes-rag.mjs`)

This code reads PRISM's knowledge corpora (wiki/memories/skills/tribal) and feeds them into a multi-model consensus fan-out, then writes results to state/shared/octopus-runs.jsonl. It will land on the shared branch cad-fusion-live-ms0 that 20+ chats pull from. Be adversarial. Weight your review toward what a wiring reviewer is unlikely to catch:

1. SECURITY / DATA-LEAK — the loader reads memories/skills which may contain secrets (API keys, tokens, the Obsidian key, .brain-web-token). Does any retrieved snippet or the ledger record risk leaking secrets into a corpus that gets sent to EXTERNAL model voices (gemini)? Is there path-traversal risk in the fs scan (a crafted query or leg path escaping the intended dir)? Should there be a sanitize/redact pass before snippets go to an external LLM?
2. SHARED-BRANCH SAFETY — could anything here break the 20+ chats on commit? Does the modified octopus-with-hermes-rag.mjs change DEFAULT behavior for any existing caller (the bare command must stay zero-spend)? Any import that requires a fresh `npm run build` of mcp-server/dist to not crash at import time?
3. LEDGER INTEGRITY — the report says octopus-runs.jsonl now has 2 "staging-run" rows + 1 real row. Is the ledger schema consistent? Could a malformed/partial write corrupt it? Is append atomic?
4. ERROR BUDGET / RESOURCE — deadline + bounds: can a pathological corpus (huge file, deep tree, binary file mis-read as text) still hang or OOM? Is there a cap on total snippet
... [+450 chars truncated]

### Assistant | 2026-05-31T19:29:07.797Z

I'll perform an adversarial second-pass review. Let me read all the files end-to-end first.

### Assistant | 2026-05-31T19:29:08.234Z

[tool_use: Read]

### Assistant | 2026-05-31T19:29:08.717Z

[tool_use: Read]

### Assistant | 2026-05-31T19:29:09.206Z

[tool_use: Read]

### Assistant | 2026-05-31T19:29:09.488Z

[tool_use: Read]

### User | 2026-05-31T19:29:10.615Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\octopus-corpus-loader.mjs' was already read 17s ago in this session and is unchanged (mtime 1780255399202). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-31T19:29:11.102Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\octopus-corpus-loader.test.mjs' was already read 16s ago in this session and is unchanged (mtime 1780255240829). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-31T19:29:11.856Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\octopus-dispatch.mjs' was already read 16s ago in this session and is unchanged (mtime 1780255099159). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-31T19:29:12.191Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\octopus-dispatch.test.mjs' was already read 16s ago in this session and is unchanged (mtime 1780255281619). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-31T19:29:16.280Z

The read-once guard claims these files are already in my context, but this is a fresh session and they are not. I need to actually read them. Let me disable the cache guard and read with the environment variable set, and also get the diff.

### Assistant | 2026-05-31T19:29:17.234Z

[tool_use: Bash]

### User | 2026-05-31T19:29:28.387Z

[tool_result] // scripts/lib/octopus-corpus-loader.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P1 — the real corpus loader (substrate).
//
// The HERMES×OCTOPUS coordinator (scripts/octopus-with-hermes-rag.mjs) shipped
// with `psnCorpora: {}` — an EMPTY map — so the input curator
// (octopus-input-curator.mjs) had nothing to rerank and every voice saw the
// bare prompt. This lib fills that gap: for a given oper
... [+17678 chars truncated]

### Assistant | 2026-05-31T19:29:31.892Z

I have the loader. The cache guard had the content but I needed the line numbers — let me read it via the Read tool now that the cache is bypassed, plus the remaining files. Let me get all the rest in parallel.

### Assistant | 2026-05-31T19:29:32.847Z

[tool_use: Bash]

### Assistant | 2026-05-31T19:29:33.792Z

[tool_use: Bash]

### Assistant | 2026-05-31T19:29:34.732Z

[tool_use: Bash]

### Assistant | 2026-05-31T19:29:35.559Z

[tool_use: Bash]

### User | 2026-05-31T19:29:43.396Z

[tool_result]   1 │ // scripts/lib/octopus-dispatch.mjs
  2 │ //
  3 │ // PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P0 — the real 5-voice dispatch bridge.
  4 │ //
  5 │ // octopus-with-hermes-rag.mjs §3 was a STUB: it recorded five
  6 │ // "pending-real-dispatch" voices and a `consensus:'stub-not-yet-merged'`
  7 │ // verdict, so the ledger never reflected a real fan-out. This bridge invokes
  8 │ // PRISM's real conse
... [+8728 chars truncated]

### User | 2026-05-31T19:29:50.097Z

[tool_result]   1 │ // scripts/lib/octopus-corpus-loader.test.mjs
  2 │ //
  3 │ // PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P1 — corpus loader tests (hermetic).
  4 │ //
  5 │ // Tests use a tmp fixture tree for the filesystem legs (wiki/memories/skills)
  6 │ // so they never touch the live 13K-file knowledge dirs and never hit the
  7 │ // network. The index legs (tribal + master_index) are exercised via
  8 │ // loa
... [+12348 chars truncated]

### User | 2026-05-31T19:29:57.392Z

[tool_result]   1 │ // scripts/lib/octopus-dispatch.test.mjs
  2 │ //
  3 │ // PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P0 — dispatch bridge tests (hermetic).
  4 │ //
  5 │ // mapConsensusToLedger is pure → tested directly. dispatchOctopus's I/O is
  6 │ // tested with an injected engineFactory (no dist import, no network). The
  7 │ // critical R12 property under test: when no voice succeeds, the verdict names
  8 │ /
... [+8222 chars truncated]

### User | 2026-05-31T19:30:03.208Z

[tool_result] scripts/octopus-with-hermes-rag.mjs | 143 ++++++++++++++++++++++++++++--------
 1 file changed, 113 insertions(+), 30 deletions(-)

--- Changes ---

scripts/octopus-with-hermes-rag.mjs
  @@ -18,22 +18,45 @@
  +import { loadPsnCorpora } from "./lib/octopus-corpus-loader.mjs";
  +import { dispatchOctopus } from "./lib/octopus-dispatch.mjs";
   
   function parseArgs(argv) {
  -  const out = { prompt
... [+8213 chars truncated]

### Assistant | 2026-05-31T19:30:06.632Z

I have the full diff but it's truncated. Let me get the untruncated diff of the truncated hunk and look at the dependencies (lexical-rerank, the curator, octopus-record-lib, and the MultiModelConsensusEngine for the security concern about external voices).

### Assistant | 2026-05-31T19:30:07.696Z

[tool_use: Bash]

### User | 2026-05-31T19:30:14.050Z

[tool_result]   +    // tuned for a different scorer and rejects every lexical-rerank hit over
  +    // short fs snippets (measured 2026-05-31). When the loader is disabled,
  +    // minScore is undefined and the curator keeps its own default.
  +    const minScore = corporaMeta?.rerankFloor;
  +    sharedContext = buildSharedContext(opts.prompt, { rerank, psnCorpora, minScore });
       exemplars = collectEx
... [+3946 chars truncated]

### Assistant | 2026-05-31T19:30:17.549Z

Let me read the full current octopus-with-hermes-rag.mjs to see the ledger write path and how voices/consensus are recorded, plus the dependencies.

### Assistant | 2026-05-31T19:30:18.322Z

[tool_use: Bash]

### User | 2026-05-31T19:30:25.316Z

[tool_result]   1 │ #!/usr/bin/env node
  2 │ // scripts/octopus-with-hermes-rag.mjs
  3 │ //
  4 │ // HERMES×OCTOPUS coordinator — wires U-HOC01 (input curator) + U-HOC02
  5 │ // (output ledger) + U-HOC03 (route policy) into one operator-callable
  6 │ // surface. Takes a prompt, decides via route policy whether to invoke
  7 │ // octopus, enriches the voice context via the curator, records the
  8 │ // outco
... [+9436 chars truncated]

### Assistant | 2026-05-31T19:30:30.165Z

Now the critical security dependencies. The key concern: corpora (which may include memory files with secrets) get assembled into `sharedContext` and passed as `context` to `dispatchOctopus`, which forwards it to `MultiModelConsensusEngine.ask` — which fans out to EXTERNAL voices (gemini, xai/grok, codex). Let me verify the curator embeds corpora into the context string, and check the record-lib for ledger atomicity, plus what the consensus engine sends to external providers.

### Assistant | 2026-05-31T19:30:31.538Z

[tool_use: Bash]

### Assistant | 2026-05-31T19:30:32.039Z

[tool_use: Bash]

### User | 2026-05-31T19:30:38.817Z

[tool_result]   1 │ // scripts/lib/octopus-input-curator.mjs
  2 │ //
  3 │ // U-HOC01 — octopus-input curator (pure-core).
  4 │ //
  5 │ // Before the octopus 5-voice fan-out fires, RAG-rerank the operator prompt
  6 │ // against PSN substrate corpora (wiki + memories + tribal + skills) and
  7 │ // return a shared-context markdown block to inject into EVERY voice's prompt.
  8 │ // The 5 voices then disagree
... [+5331 chars truncated]

### User | 2026-05-31T19:30:44.881Z

[tool_result]   1 │ // scripts/lib/octopus-record-lib.mjs
  2 │ //
  3 │ // U-HOC02 — pure-core lib for octopus-output → Hermes ledger.
  4 │ //
  5 │ // Records each octopus 5-voice consensus run as a structured JSONL entry the
  6 │ // Hermes skill-loop pipeline can cluster on. The entry shape mirrors the
  7 │ // existing skill-candidates.jsonl entries so clusterCandidates +
  8 │ // gateCandidate can promot
... [+7254 chars truncated]

### Assistant | 2026-05-31T19:30:49.981Z

This confirms the full data-flow path. The corpora snippets (which include the `memories` leg, reading both `H:/prism/knowledge/memories` AND `C:/Users/wompu/.claude/projects/H--prism/memory`) flow into `sharedContext` via `formatContextBlock`, which is then passed as `context` to `dispatchOctopus` → `engine.ask({ context })` → external voices (gemini/google, xai/grok, codex/openai).

Now I need to verify two things: (1) does the consensus engine actually send `context` to external providers, and (2) what's in the memory dir that could leak. Let me check the consensus engine's source and scan the memory dirs for secrets.

### Assistant | 2026-05-31T19:30:51.393Z

[tool_use: Grep]

### Assistant | 2026-05-31T19:30:53.213Z

[tool_use: Grep]

### User | 2026-05-31T19:30:53.571Z

[tool_result] 65:  context?: string;
95:   * Auto-inject PRISM context (CLAUDE.md, GSD, master index, top-relevant
101:  /** Per-model context budget cap. Default {claude:100k, codex:100k, grok:50k, ollama:24k}. */
102:  contextBudgets?: { claude?: number; codex?: number; grok?: number; ollama?: number };
180:    const userPrompt = input.context
181:      ? `${input.prompt}\n\n=== CALLER CONTEXT ===\n${input.co
... [+521 chars truncated]

### User | 2026-05-31T19:30:56.168Z

[tool_result] Found 30 files limit: 30
C:\Users\wompu\.claude\projects\H--prism\memory\reference_galaxy_context_federation_card_2026_05_31.md
C:\Users\wompu\.claude\projects\H--prism\memory\feedback_stale_slot_build_break_escalate_resync.md
C:\Users\wompu\.claude\projects\H--prism\memory\reference_mcp_sdk_single_transport_invariant_2026_05_25.md
C:\Users\wompu\.claude\projects\H--prism\memory\feedback_each_slot
... [+2489 chars truncated]

### Assistant | 2026-05-31T19:31:00.850Z

Confirmed: line 180-181 of MultiModelConsensusEngine.ts shows `input.context` is concatenated as `=== CALLER CONTEXT ===` and sent to external models (codex, grok, gemini). The 30 memory-file matches are mostly the words "token" (token-optimization, refresh-token discussions) — those are keyword matches, not literal secrets. But the real question is whether any actual secret VALUES live in the memory/wiki corpus that the loader scans. Let me check for actual high-entropy secret patterns and the specific files the task flagged (.brain-web-token, Obsidian key).

### Assistant | 2026-05-31T19:31:02.325Z

[tool_use: Bash]

### Assistant | 2026-05-31T19:31:04.463Z

[tool_use: Grep]

### User | 2026-05-31T19:31:08.355Z

[tool_result] const DEFAULT_CODEX_EFFORT = "xhigh" as const;
const DEFAULT_CLAUDE_BIN = process.env.PRISM_CLAUDE_BIN ?? "claude";

const ACCEPT_THRESHOLD = 0.70;     // ≥ → accept
const REVIEW_THRESHOLD = 0.40;     // ≥ → review (caller picks); < → escalate

export class MultiModelConsensusEngine {
  async ask(input: ConsensusInput): Promise<ConsensusResult> {
    this.validate(input);
    const start = Date.no
... [+5214 chars truncated]

### User | 2026-05-31T19:31:11.711Z

[tool_result] No matches found

### Assistant | 2026-05-31T19:31:18.643Z

No literal API-key-shaped secrets in the memory dir today. But the engine **already** auto-injects PRISM context (CLAUDE.md, GSD, master index, engines) into external models via `prismContextInjectorEngine.buildContext` regardless of this changeset — and `=== CALLER CONTEXT ===` is appended on top. So the leak surface area is pre-existing AND this changeset widens it (now memory snippets + C: auto-memory flow in too). The critical point: the loader reads `C:/Users/wompu/.claude/projects/H--prism/memory` which is the user's private auto-memory — broader than the project knowledge vault.

Let me verify the two remaining concerns: (1) does importing octopus-dispatch.mjs crash at import-time if dist is missing (it shouldn't — the import is lazy inside the function), and (2) is the ledger append actually safe under concurrent writers, and check lexical-rerank exports exist.

### Assistant | 2026-05-31T19:31:21.007Z

[tool_use: Bash]

### Assistant | 2026-05-31T19:31:21.937Z

[tool_use: Bash]

### User | 2026-05-31T19:31:29.221Z

[tool_result] 30:export function tokenize(s) {
59:export function scoreCandidate(queryTokens, queryLower, cand, weights = DEFAULT_WEIGHTS) {
---master-index-search-lib exports---
427:export function runMasterIndexSearch(query, opts = {}) {
578:export function runTribalSearch(query, opts = {}) {

### User | 2026-05-31T19:31:40.704Z

[tool_result]   ...
# Subtest: dispatch: ask() throws → dispatched:false with reason (no throw)
ok 21 - dispatch: ask() throws → dispatched:false with reason (no throw)
  ---
  duration_ms: 0.3346
  ...
# Subtest: dispatch: empty / non-string prompt → dispatched:false (no engine call)
ok 22 - dispatch: empty / non-string prompt → dispatched:false (no engine call)
  ---
  duration_ms: 0.3917
  ...
# Subtest: dis
... [+331 chars truncated]

### Assistant | 2026-05-31T19:31:44.985Z

All 23 tests pass, all imports resolve. Now let me verify the ledger-atomicity concern and the "binary file mis-read as text" + path-traversal concerns. The `appendOctopusEntry` uses read-then-rename (read entire file, append line, write tmp, rename). This is NOT concurrency-safe across 20+ chats — concurrent writers can lose entries (last-rename-wins). Let me confirm whether there's any lock, and check the "staging-run rows" claim by reading the actual ledger.

### Assistant | 2026-05-31T19:31:47.944Z

[tool_use: Bash]

### User | 2026-05-31T19:31:52.343Z

[tool_result] 4
--- entries (verdict/dispatched) ---
2026-05-23T21:22:58.359Z | octopus:single-claude-path=1 | stub-not-yet-merged
2026-05-31T19:22:14.146Z | octopus:pending-real-dispatch=5 | stub-not-yet-merged
2026-05-31T19:23:48.432Z | octopus:pending-real-dispatch=5 | stub-not-yet-merged
2026-05-31T19:24:15.439Z | octopus:failed:spawn-enoent=1|answered=1|failed:unreachable=1 | The Kienzle specific cutting f
... [+20 chars truncated]

### Assistant | 2026-05-31T19:31:58.846Z

The ledger is intact: 4 valid lines, no malformed. The 4th entry is the real live-dispatch run — and critically, its `consensus.verdict` is **"The Kienzle specific cutting force model is used i..."** — that is a merged answer that came back from a live external voice (gemini). Note the signature `failed:spawn-enoent=1|answered=1|failed:unreachable=1` = codex ENOENT, 1 voice answered, ollama unreachable. So exactly **1 live voice** answered, confirming the "1 live voice reality" — and the answer text was written to the shared ledger.

This is the smoking gun for the data-leak finding: the live run sent the assembled `sharedContext` (containing PSN corpus snippets, potentially including C: auto-memory) to gemini, AND the returned answer (truncated to 240 chars) is now persisted in the shared-branch ledger that 20+ chats pull. Let me confirm the full merged-answer entry and check whether the prompt/exemplars stored in the ledger could carry sensitive corpus text.

### Assistant | 2026-05-31T19:32:01.340Z

[tool_use: Bash]

### User | 2026-05-31T19:32:06.257Z

[tool_result] {
  "at": "2026-05-31T19:24:15.439Z",
  "prompt": "octopus consensus: what is the Kienzle specific cutting force model used for in milling, in one sentence?",
  "consensusVerdict": "The Kienzle specific cutting force model is used in milling to predict the cutting forces by empirically relating specific cutting energy to chip thickness, which is essential for optimizing machining processes and sel
... [+3687 chars truncated]

### Assistant | 2026-05-31T19:32:13.233Z

This is highly informative. The `psnExemplars` stored in the shared ledger contain **raw frontmatter from memory files**, including `source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/...` and `content_hash` values. These exemplars were ALSO assembled into `sharedContext` and sent to gemini. This confirms:

1. The corpus snippets are verbatim file content (including frontmatter, paths, hashes) — no redaction pass.
2. They flow to external voices (gemini answered).
3. They are persisted to the shared-branch ledger.

In this benign test the leaked content is harmless (path strings), but the architecture would equally forward a memory file containing a real secret. Now let me confirm two final things: the path-traversal vector (can `legRoots` or query escape the intended dir — the roots are hardcoded constants, query only matches filenames, so traversal risk is low), and whether the bare default command stays zero-spend (LIVE_DISPATCH defaults OFF). Let me verify the bare command behavior and binary-file handling.

### Assistant | 2026-05-31T19:32:14.627Z

[tool_use: Bash]

### User | 2026-05-31T19:32:20.021Z

[tool_result]     } else {
      calls.push(buildPrompt("ollama").then((p) => this.callOllama(p, primaryOllama, timeoutMs)).then((r) => [r]));
    }

    const responses = (await Promise.all(calls)).flat();

    // Fact-check each successful answer against PRISM truth — flags
    // hallucinated engines / dispatcher actions before they propagate into
    // a roadmap or refactor. Only runs if a knowledge base h
... [+2441 chars truncated]

### Assistant | 2026-05-31T19:32:25.299Z

Important secondary leak vector confirmed: the consensus engine ALSO persists successful results to the Obsidian/wiki second-brain (`consensusObsidianPersistenceEngine.persist`) by default — but the dispatch bridge sets `persist: false` (line 171 of octopus-dispatch.mjs), so that secondary persistence path is correctly disabled. Good — the bridge author handled that.

I have everything I need. Let me do a final confirmation of the route-policy default (does a bare run route to octopus, or is octopus opt-in) to assess whether the loader even runs by default and whether default behavior changed for existing callers.

### Assistant | 2026-05-31T19:32:26.253Z

[tool_use: Bash]

### User | 2026-05-31T19:32:33.015Z

[tool_result] 11:export const ROUTES = Object.freeze(["route:octopus", "route:single-claude", "route:ollama-only", "route:skip-ai"]);
25:export function octopusRouteDecision({ prompt, historicalRuns, rerank, minInvokeRate = DEFAULT_MIN_INVOKE_RATE, coinFlip = Math.random }) {
27:    return { route: "route:skip-ai", reason: "empty-prompt" };
33:      return { route: "route:octopus", reason: `keyword-trigger:${kw
... [+612 chars truncated]

### Assistant | 2026-05-31T19:33:39.676Z

This is the final piece. The route policy has a `min-invoke-rate-boost` path (line 77) that can route to octopus even WITHOUT a keyword trigger, AND a `coinFlip = Math.random` default. So a bare prompt can probabilistically route to octopus → trigger the corpus loader (which reads C: auto-memory by default, since `CORPORA_DISABLED` is off). The loader runs by default on any octopus-routed prompt. The external dispatch is still gated behind `LIVE_DISPATCH` (off by default), so zero-spend is preserved for the bare command — but the corpus assembly (the leak-staging) runs by default.

I have a complete picture. Let me write the review.

---

## Adversarial Second-Pass Review — PSN-OCTOPUS-FLEET-SYNERGY-MS0 FOUNDATION

**Verdict: FAIL** (one P0 data-leak finding + one P1 ledger-concurrency finding must be addressed before this lands on `cad-fusion-live-ms0`)

I read all five files end-to-end, traced the full data-flow into `MultiModelConsensusEngine.ask`, ran both test files (23/23 pass), and inspected the live `octopus-runs.jsonl` ledger. The build quality is genuinely high — fail-soft discipline, bounded reads, honest R12 failure reporting, and the tests are not faked (verified below). The findings below are the ones a wiring reviewer would miss.

---

### P0 — DATA-LEAK: no redaction pass before private corpus snippets reach EXTERNAL voices, and verbatim snippets are persisted to the shared-branch ledger

**Files:** `scripts/lib/octopus-corpus-loader.mjs:52-58` (leg roots) → `scripts/lib/octopus-input-curator.mjs:79-92` (assembles into context) → `scripts/octopus-with-hermes-rag.mjs:106,124-128` (passes as `context`) → `MultiModelConsensusEngine.ts:180-181` (concatenates as `=== CALLER CONTEXT ===` and fans out to gemini/grok/codex).

**The vector, proven from the live ledger.** The 4th (live) entry I dumped contains `psnExemplars` with raw memory-file frontmatter:
```
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_shop_bimaterial_cutt
... [+8556 chars truncated]
