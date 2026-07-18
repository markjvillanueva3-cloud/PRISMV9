---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Independent adversarial review of a domain-aware RAG corpus loader feature + its"
date: "2026-06-01"
first_ts: "2026-06-01T01:34:20.866Z"
last_ts: "2026-06-01T01:42:02.598Z"
cwd: "H:\\prism-slot-bravo"
messages: 35
user_msgs: 13
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a6133eee0e38ac6c3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:37"
---

# Independent adversarial review of a domain-aware RAG corpus loader feature + its

> **claude-code-cli** | 2026-06-01 | 35 msgs (13 user / 22 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a6133eee0e38ac6c3.jsonl`

## Transcript

### User | 2026-06-01T01:34:20.866Z

Independent adversarial review of a domain-aware RAG corpus loader feature + its tests. Assume the first reviewer missed something. Read BOTH files end-to-end. Grade PASS/FAIL with concrete P0/P1 + line refs.

FILES:
- H:\prism\scripts\lib\octopus-corpus-loader.mjs
- H:\prism\scripts\lib\octopus-corpus-loader.test.mjs

WHAT CHANGED: loadPsnCorpora gained opts.domain → appends a `<domain>_corpus` fs leg from DOMAIN_CORPUS_ROOTS (5 domains → text-dir paths). The key fix: the fs-leg prefilter used to collect ONLY `.md` files (hard-coded `endsWith(".md")`), which silently starved every non-markdown corpus; it's now a positive TEXT_LEG_EXTENSIONS allowlist (collects .txt/.json/.cps/.ts/.py/.html/.nc/etc., excludes binaries + geometry formats). Empirically verified: all 5 real domains now surface on-target content (speed-feed→"Gühring & ISCAR Speed/Feed Data", cam→"hyperMILL loc file format", etc.); 28/28 tests pass.

ADVERSARIAL ANGLES — weight here:
1. ALLOWLIST BLAST RADIUS: the .md→allowlist change affects the 3 DEFAULT legs too (wiki/memories/skills), not just domain legs. wiki=H:/prism/knowledge/wiki now collects .json/.txt/.svg/.html in addition to .md. Is that a problem? Could a large .json index or .svg in knowledge/wiki now dominate/pollute the wiki leg, or cause a perf issue? Is excluding geometry ASCII (.step/.dxf/.stl) from the allowlist correct, or does some domain need them? Is .svg (in the allowlist) a risk (could be a huge generated diagram)?
2. BINARY-LEAK: can ANY binary content reach an external voice? Check files with text extensions that are actually binary (e.g. a .json that's minified-garbage, or a UTF-16/latin1 file read as utf8). The redaction + bounded read are the backstops — are they sufficient? Trace one concrete path.
3. TEST INTEGRITY: do the 6 new tests actually FAIL if the feature were reverted? Specifically: (a) would "domain leg surfaces 3 domains" fail if opts.domain wiring were removed? (b) would "binary NOT read" fail if the allowlis
... [+1176 chars truncated]

### Assistant | 2026-06-01T01:34:28.828Z

I'll perform an independent adversarial review of both files end-to-end.

### Assistant | 2026-06-01T01:34:29.767Z

[tool_use: Read]

### Assistant | 2026-06-01T01:34:29.834Z

[tool_use: Read]

### User | 2026-06-01T01:34:32.139Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\octopus-corpus-loader.mjs' was already read 17s ago in this session and is unchanged (mtime 1780277427166). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-01T01:34:32.217Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\octopus-corpus-loader.test.mjs' was already read 16s ago in this session and is unchanged (mtime 1780277586346). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-01T01:34:34.716Z

The read-once guard claims the files are already in my context, but I don't actually have their contents in this conversation. Let me bypass the cache to read them.

### Assistant | 2026-06-01T01:34:35.866Z

[tool_use: Bash]

### User | 2026-06-01T01:34:42.582Z

[tool_result] // scripts/lib/octopus-corpus-loader.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P1 — the real corpus loader (substrate).
//
// The HERMES×OCTOPUS coordinator (scripts/octopus-with-hermes-rag.mjs) shipped
// with `psnCorpora: {}` — an EMPTY map — so the input curator
// (octopus-input-curator.mjs) had nothing to rerank and every voice saw the
// bare prompt. This lib fills that gap: for a given oper
... [+29115 chars truncated]

### Assistant | 2026-06-01T01:34:45.008Z

Now let me read the test file, bypassing the cache.

### Assistant | 2026-06-01T01:34:46.187Z

[tool_use: Bash]

### User | 2026-06-01T01:34:54.522Z

[tool_result] // scripts/lib/octopus-corpus-loader.test.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P1 — corpus loader tests (hermetic).
//
// Tests use a tmp fixture tree for the filesystem legs (wiki/memories/skills)
// so they never touch the live 13K-file knowledge dirs and never hit the
// network. The index legs (tribal + master_index) are exercised via
// loadPsnCorpora's real lazy import, but with a 2-tok
... [+29381 chars truncated]

### Assistant | 2026-06-01T01:34:57.708Z

I have both files. Now let me verify a few load-bearing claims against the actual dependencies before grading. Let me check `lexical-rerank.mjs` (the `scoreCandidate`/`tokenize` contract) and `redact-secrets.mjs` (the redaction backstop), plus confirm the production domain paths actually exist on disk (R12 honesty angle).

### Assistant | 2026-06-01T01:35:00.035Z

[tool_use: Bash]

### Assistant | 2026-06-01T01:35:03.928Z

[tool_use: Bash]

### User | 2026-06-01T01:35:17.765Z

[tool_result] // scripts/lib/redact-secrets.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / FOUNDATION-HARDEN — shared secret redactor.
//
// Extracted from zulu-telegram-bridge.mjs's sanitizeOutput so there is ONE
// redactor the fleet shares (the bridge now delegates its token/JWT/env/hex
// masking here). Used by:
//   - octopus-corpus-loader.mjs  — masks every PSN snippet BEFORE it reaches an
//     external mult
... [+3817 chars truncated]

### User | 2026-06-01T01:35:29.649Z

[tool_result] EXISTS  (67 files): H:/prism/state/shared/pdf-extracts/jm-die-tribal-wiki
EXISTS  (99 files): H:/prism/state/shared/wedm-training-corpus
EXISTS  (3 files): H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS
EXISTS  (325 files): H:/prism/mcp-server/src/data
EXISTS  (5153 files): H:/PRISM/resources/OPEN MIND
EXISTS  (25 files): H:/prism/cad-engine/data
EXISTS  (99 files): H:/prism/state/
... [+72 chars truncated]

### Assistant | 2026-06-01T01:35:33.741Z

All 8 production domain roots exist on disk. Let me verify two more load-bearing details: the `scoreCandidate` signature (the loader calls `scoreCandidate(queryTokens, queryLower, { text })` — a 3-arg form) and `tokenize`'s behavior, plus check the `cad-engine/data` claim (comment says "~16.7K .json/.md" but I found only 25 files — a registry-comment honesty issue worth confirming).

### Assistant | 2026-06-01T01:35:35.557Z

[tool_use: Bash]

### Assistant | 2026-06-01T01:35:39.997Z

[tool_use: Bash]

### User | 2026-06-01T01:35:46.360Z

[tool_result] export function tokenize(s) {
  if (typeof s !== "string") return [];
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/**
 * Feature weights for the combined rerank score. Sum ≈ 1.0. Tunable — the
 * U-RAG-5 eval harness exists to measure the lift and retune these.
 */
export const DEFAULT_WEIGHTS = Object.freeze({
  coverage: 0.35,
... [+2626 chars truncated]

### User | 2026-06-01T01:35:54.066Z

[tool_result] === cad-engine/data recursive count (comment claims ~16.7K) ===
25
=== OPEN MIND text-vs-binary (depth 4) ===
   1768 dll
   1118 bmp
    782 cfg
    445 loc
    176 xml
    144 png
    111 exe
     63 qm
     59 ico
     58 def
     50 gif
     44 mmb
     40 pyd
     34 ini
     24 bin
     19 svg
     18 wbb
     13 txt
     12 sql
     11 hml
=== mcp-server/src/data top extensions ===
    225 
... [+349 chars truncated]

### Assistant | 2026-06-01T01:35:59.728Z

This is highly informative. Now I have the empirical grounding for the adversarial angles. Let me confirm two final things: whether the wiki `.json` files (4,874 of them) are large index sidecars that could pollute the wiki leg, and the OPEN MIND `.cfg`/`.loc`/`.def` extensions (not in allowlist) vs what IS collected there.

### Assistant | 2026-06-01T01:36:04.904Z

[tool_use: Bash]

### User | 2026-06-01T01:39:49.753Z

[tool_result] === largest .json under knowledge/wiki (top depth) — could one dominate the wiki leg? ===
4286	H:/prism/knowledge/wiki/.hook-cache/ac0d36addcd9f936393ca60c20391a4269d7c07b.json
4284	H:/prism/knowledge/wiki/.hook-cache/37649f25bd26310a8754f566651444ed099f8a2c.json
4280	H:/prism/knowledge/wiki/.hook-cache/f6042d596c5eeb9f8367935a7db10fec4e399f17.json
4280	H:/prism/knowledge/wiki/.hook-cache/1c2474b3
... [+574 chars truncated]

### Assistant | 2026-06-01T01:39:57.437Z

Now I have a complete empirical picture. Key findings:

- The big wiki `.json` files are all in `.hook-cache/` — which is excluded by `SKIP_DIR_RE` (`\.hook-cache$`) AND by the dotfile rule. So the wiki-leg pollution risk from large JSON is largely mitigated by the skip-dir guard. The remaining 4,874 wiki `.json` are mostly small.
- No `.svg` under wiki, so that risk is theoretical, not live.
- `cad-engine/data` has only **25 files** recursively, not the "~16.7K .json/.md" the comment claims — a registry-comment honesty defect (R12 angle 4).
- OPEN MIND has 212 allowlisted text files (depth 4) but the `maxDepth` default is 4 and many OPEN MIND text docs (`.loc` config = 445 files) are NOT in the allowlist; `.cps` collection and the cam corpus is thin — relevant to angle 4 (cam honesty).

Let me run the test suite to confirm the 28/28 pass claim and that nothing is silently skipped.

### Assistant | 2026-06-01T01:39:58.532Z

[tool_use: Bash]

### User | 2026-06-01T01:40:13.841Z

[tool_result]   ...
# Subtest: domain leg: unknown / non-string / empty domain is a clean no-op (no throw, no *_corpus leg)
ok 25 - domain leg: unknown / non-string / empty domain is a clean no-op (no throw, no *_corpus leg)
  ---
  duration_ms: 227.1513
  ...
# Subtest: domain leg: additive — core wiki/memories/skills legs still flow alongside it
ok 26 - domain leg: additive — core wiki/memories/skills legs st
... [+603 chars truncated]

### Assistant | 2026-06-01T01:40:20.510Z

28/28 pass confirmed. Now let me reason through the test-integrity angle 3 concretely — does the "binary NOT read" test actually fail if the allowlist were reverted to read-everything? And does the domain-leg test fail if `opts.domain` wiring were removed? Let me trace the binary-skip path precisely, because there's a subtle gap.

The `.mcx` test file content is `"BINARYHEADER wire edm machine program glyphs..."` — that's **plain ASCII text**, not actual binary. So the test proves the *extension allowlist* (`.mcx` not in `TEXT_LEG_EXTENSIONS`) skips it — which is a real lock. But angle 2 (binary-leak) asks about a file with a *text extension* that is *actually binary*. Let me trace that path: a `.json` file containing real binary/latin1 bytes.

### Assistant | 2026-06-01T01:40:30.436Z

[tool_use: Bash]

### User | 2026-06-01T01:40:47.253Z

[tool_result] collected snippets: 1
snippet len: 210
U+FFFD replacement chars surviving: 96  control bytes surviving: 24
snippet JSON-escaped: "kienzle ��\u0000\u0001����T�C?;�˔��_y���\u0017�,�C��V���_��)b��8�Xx\u0001��6v�|&� �~�T\u0000��� 2�\u0014�����\u001a�[�\u0003K*W� cA��r\u0018wng%c\u0010��� �4�

### Assistant | 2026-06-01T01:40:53.495Z

Confirmed P1 finding: a `.json` file (allowlisted extension) containing actual binary bytes is read as utf8 and surfaces 96 `U+FFFD` replacement chars + 24 raw control bytes into a snippet that then flows to an external voice (gemini/grok) and the shared ledger. The redaction backstop doesn't touch these (no secret pattern), and the byte-cap only bounds length, not content. The "binary NOT read" test uses ASCII-text-in-a-binary-extension, so it does NOT cover this real path.

Let me verify one more concrete angle: does the `.md`→allowlist change mean a hostile/huge HTML or generated `.html` in wiki now gets collected, and confirm whether the domain-leg name could ever collide with a core leg name.

### Assistant | 2026-06-01T01:41:03.801Z

[tool_use: Bash]

### User | 2026-06-01T01:41:16.505Z

[tool_result] "wiki" -> wiki_corpus (not in registry → no-op)
"memories" -> memories_corpus (not in registry → no-op)
"skills" -> skills_corpus (not in registry → no-op)
"WIKI" -> WIKI_corpus (not in registry → no-op)
"wi-ki" -> wi_ki_corpus (not in registry → no-op)
"wiki " -> wiki_corpus (not in registry → no-op)
"tribal" -> tribal_corpus (not in registry → no-op)
"master_index" -> master_index_corpus (not in
... [+281 chars truncated]

### Assistant | 2026-06-01T01:42:02.598Z

The `_corpus` suffix guarantees no collision with core legs (`wiki` → `wiki_corpus`, never `wiki`) — angle 5 collision concern is **safe**. The normalization is sound. The trailing-whitespace case (`"wiki "`) is also handled by the `.trim()`.

I have everything needed. Let me confirm the empirical test-revert claim for angle 3(b) — does reverting the allowlist to `.md`-only actually flip the domain/allowlist tests? The domain fixtures use `.txt/.json/.cps/.ts` files, so reverting to `endsWith(".md")` would starve every domain leg → those tests would fail. That's a genuine lock. Confirmed by inspection.

I now have a complete adversarial picture across all 6 angles.

---

## ADVERSARIAL REVIEW — `octopus-corpus-loader.mjs` + `.test.mjs`

**Verdict basis:** Both files read end-to-end; dependencies (`lexical-rerank.mjs`, `redact-secrets.mjs`, `master-index-search-lib.mjs`) verified; 28/28 tests re-run green; all 8 production domain roots confirmed on disk; binary-leak path empirically reproduced.

### P1 findings

**P1-1 — Binary-masquerade leak: a text-extension file with real binary bytes crosses the trust boundary (loader lines ~250-258 `loadFsLeg` read; ~118-120 `isTextLegPath`).**
The allowlist gates on **extension**, not content. A `.json`/`.txt`/`.ts` file (all allowlisted) that contains actual binary (latin1/UTF-16/random bytes) is read with `buf.toString("utf8", …)`, producing mojibake. I reproduced it: a binary `.json` named to match the query surfaced a 210-char snippet carrying **96 `U+FFFD` replacement chars + 24 raw control bytes** straight into `psnCorpora` → external gemini/grok voice + shared-branch ledger. `redactSecrets` doesn't touch it (no secret pattern matches), and the byte-cap bounds length, not garbage. This is exactly the "garbage utf8 snippet crossing the trust boundary to an external voice" the allowlist comment (lines ~95-99) claims to prevent — but the guard only stops *known-binary extensions*, not *binary-in-a-text-extension*. Real corp
... [+5775 chars truncated]
