---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Review a substantial feature add to a security-sensitive RAG corpus loader. Read"
date: "2026-06-01"
first_ts: "2026-06-01T01:34:02.732Z"
last_ts: "2026-06-01T01:36:11.131Z"
cwd: "H:\\prism-slot-bravo"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-ae60cf4c5049631b8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Review a substantial feature add to a security-sensitive RAG corpus loader. Read

> **claude-code-cli** | 2026-06-01 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-ae60cf4c5049631b8.jsonl`

## Transcript

### User | 2026-06-01T01:34:02.732Z

Review a substantial feature add to a security-sensitive RAG corpus loader. Read the WHOLE file end-to-end, grade PASS/FAIL with concrete P0/P1 + line refs.

FILE: H:\prism\scripts\lib\octopus-corpus-loader.mjs (+ tests H:\prism\scripts\lib\octopus-corpus-loader.test.mjs)

FEATURE: domain-aware corpus loading (P1 of PSN-OCTOPUS-FLEET-SYNERGY-MS0). When loadPsnCorpora is called with opts.domain (e.g. "wedm", "post-processor"), it appends a `<domain>_corpus` fs leg drawn from DOMAIN_CORPUS_ROOTS — that domain's verified text-searchable deep-corpus directories.

THE 6 CHANGES (all in loadPsnCorpora's region + module consts):
1. NEW `export const DOMAIN_CORPUS_ROOTS` — frozen map of 5 domains (wedm/speed-feed/cam/cad/post-processor) → arrays of absolute text-dir paths.
2. ROOT-CAUSE FIX: the fs-leg filename prefilter (`prefilterFiles`) previously hard-coded `if (!name.toLowerCase().endsWith(".md")) continue;` — it ONLY collected .md. That silently capped EVERY fs leg to markdown; domain corpora (.txt/.json/.cps/.ts) returned nothing. Replaced with a positive `TEXT_LEG_EXTENSIONS` allowlist via `isTextLegPath(name)` — collects prose/code/CNC-post extensions, EXCLUDES binaries (.mcx/.step/.pdf/.dll) and geometry-exchange ASCII (.step/.dxf/.stl, which are text but carry no prose).
3. Domain-leg wiring: builds `fsLegNames` + `effectiveLegRoots`, appends the `<domain>_corpus` leg AFTER the 3 core legs (supplementary, can't starve them).
4. `opts.domainRoots` test seam (production uses the frozen DOMAIN_CORPUS_ROOTS).
5. Removed a now-redundant read-loop binary blocklist (the positive allowlist in the prefilter supersedes it).
6. JSDoc for opts.domain + opts.domainRoots.

VERIFY SPECIFICALLY:
- The allowlist broadening (.md → many text exts) does NOT regress the 3 default legs (wiki/memories/skills): .md is still in TEXT_LEG_EXTENSIONS, so they still collect their .md. Confirm.
- Redaction is still applied to EVERY domain-corpus snippet — trace that the domain leg flows throu
... [+1120 chars truncated]

### Assistant | 2026-06-01T01:34:12.750Z

I'll review this security-sensitive RAG corpus loader feature. Let me read both files end-to-end.

### Assistant | 2026-06-01T01:34:13.271Z

[tool_use: Read]

### Assistant | 2026-06-01T01:34:13.444Z

[tool_use: Read]

### User | 2026-06-01T01:34:16.387Z

[tool_result] 1	// scripts/lib/octopus-corpus-loader.mjs
2	//
3	// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P1 — the real corpus loader (substrate).
4	//
5	// The HERMES×OCTOPUS coordinator (scripts/octopus-with-hermes-rag.mjs) shipped
6	// with `psnCorpora: {}` — an EMPTY map — so the input curator
7	// (octopus-input-curator.mjs) had nothing to rerank and every voice saw the
8	// bare prompt. This lib fills that gap: 
... [+31364 chars truncated]

### User | 2026-06-01T01:34:17.148Z

[tool_result] 1	// scripts/lib/octopus-corpus-loader.test.mjs
2	//
3	// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P1 — corpus loader tests (hermetic).
4	//
5	// Tests use a tmp fixture tree for the filesystem legs (wiki/memories/skills)
6	// so they never touch the live 13K-file knowledge dirs and never hit the
7	// network. The index legs (tribal + master_index) are exercised via
8	// loadPsnCorpora's real lazy import, 
... [+31674 chars truncated]

### Assistant | 2026-06-01T01:34:21.541Z

Both files read end-to-end. Let me verify the load-bearing claims: the redaction module behavior, that no production caller passes `domainRoots`, and confirm the binary-blocklist removal claim.

### Assistant | 2026-06-01T01:34:22.017Z

[tool_use: Read]

### Assistant | 2026-06-01T01:34:23.524Z

[tool_use: Grep]

### User | 2026-06-01T01:34:24.897Z

[tool_result] 1	// scripts/lib/redact-secrets.mjs
2	//
3	// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / FOUNDATION-HARDEN — shared secret redactor.
4	//
5	// Extracted from zulu-telegram-bridge.mjs's sanitizeOutput so there is ONE
6	// redactor the fleet shares (the bridge now delegates its token/JWT/env/hex
7	// masking here). Used by:
8	//   - octopus-corpus-loader.mjs  — masks every PSN snippet BEFORE it reaches an
9	//
... [+3703 chars truncated]

### User | 2026-06-01T01:34:46.831Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-01T01:34:50.400Z

The repo-wide grep timed out (548MB graph + 13K-file tree). Let me scope the search to the production caller surface — the octopus runner scripts — to confirm no production caller passes `domainRoots`.

### Assistant | 2026-06-01T01:34:51.785Z

[tool_use: Grep]

### Assistant | 2026-06-01T01:34:53.130Z

[tool_use: Grep]

### User | 2026-06-01T01:34:55.468Z

[tool_result] H:\prism\scripts\octopus-with-hermes-rag.mjs:21:import { loadPsnCorpora } from "./lib/octopus-corpus-loader.mjs";
H:\prism\scripts\octopus-with-hermes-rag.mjs:90:        const loaded = await loadPsnCorpora(opts.prompt, { modelBudget: opts.modelBudget });

### User | 2026-06-01T01:35:02.308Z

[tool_result] 21:import { loadPsnCorpora } from "./lib/octopus-corpus-loader.mjs";
86:    let psnCorpora = {};
90:        const loaded = await loadPsnCorpora(opts.prompt, { modelBudget: opts.modelBudget });
91:        psnCorpora = loaded.psnCorpora;
97:        psnCorpora = {};
106:    sharedContext = buildSharedContext(opts.prompt, { rerank, psnCorpora, minScore });
110:      corpora: psnCorpora,

### Assistant | 2026-06-01T01:35:07.975Z

The single production caller passes only `{ modelBudget }` — no `domainRoots`, and notably no `domain` either. Let me confirm whether `domain` is wired anywhere in production (the feature is reachable only if some caller passes it), and check the `lexical-rerank` `scoreCandidate` signature since `loadFsLeg` and the rerank adapter depend on it.

### Assistant | 2026-06-01T01:35:09.388Z

[tool_use: Grep]

### Assistant | 2026-06-01T01:35:10.641Z

[tool_use: Grep]

### User | 2026-06-01T01:35:19.076Z

[tool_result] 21:import { loadPsnCorpora } from "./lib/octopus-corpus-loader.mjs";
90:        const loaded = await loadPsnCorpora(opts.prompt, { modelBudget: opts.modelBudget });

### User | 2026-06-01T01:35:20.466Z

[tool_result] 30:export function tokenize(s) {
31-  if (typeof s !== "string") return [];
32-  return s
33-    .toLowerCase()
34-    .split(/[^a-z0-9]+/)
35-    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
36-}
37-
38-/**
39- * Feature weights for the combined rerank score. Sum ≈ 1.0. Tunable — the
40- * U-RAG-5 eval harness exists to measure the lift and retune these.
41- */
42-export const DEFAULT_WEIG
... [+668 chars truncated]

### Assistant | 2026-06-01T01:36:11.131Z

I have everything I need. Let me verify the one remaining load-bearing detail — the `scoreCandidate` third parameter shape, since the rerank adapter passes `{ text }` and `loadFsLeg` does not call `scoreCandidate` directly. Confirmed above: `scoreCandidate(queryTokens, queryLower, cand)` reads `cand.text` — and the adapter at line 432 passes `{ text }`. Correct.

I now have a complete picture. Here is my review.

---

## Code Quality Analysis Report — octopus-corpus-loader.mjs (domain-aware corpus loading, P1)

### Summary
- Files analyzed: 2 (`octopus-corpus-loader.mjs` +602 region, `octopus-corpus-loader.test.mjs`); cross-checked `redact-secrets.mjs`, `lexical-rerank.mjs`, `octopus-with-hermes-rag.mjs`.
- Verdict: the 6 changes are correct, security-preserving, and well-tested. No P0. Two P1s and several P2/P3 notes below.

### Point-by-point verification (all PASS)

**1. Allowlist broadening does NOT regress the 3 default legs.** Confirmed. `.md` is the first entry in `TEXT_LEG_EXTENSIONS` (line 128). `isTextLegPath` (142-147) lowercases, finds the last dot, and does a `Set.has` on the slice. The wiki/memories/skills fixtures are `.md` and still collect — locked by the happy-path test (lines 80-104) and the allowlist test (578-599). No regression.

**2. Redaction applied to EVERY domain-corpus snippet.** Confirmed by tracing. The domain leg is wired into the *same* `fsLegNames` loop (516-542) that drives wiki/memories/skills. Every fs leg — including `<domain>_corpus` — flows through `loadFsLeg` → line 306 `redactSecrets(extractSnippet(...))`. There is no alternate code path for the domain leg; it is pure data-driven leg-name reuse. Test 516-531 proves a `Bearer abc.def.ghi` in a collected `.txt` is masked. PASS.

**3. DATA-LEAK GUARD (private C: memory) intact and scoped to "memories" only.** Confirmed. Line 533: `if (legName === "memories") roots = resolveMemoryRoots(roots, env);` — the private-root append is gated on the exact string `"memories"`, so a `<domai
... [+6757 chars truncated]
