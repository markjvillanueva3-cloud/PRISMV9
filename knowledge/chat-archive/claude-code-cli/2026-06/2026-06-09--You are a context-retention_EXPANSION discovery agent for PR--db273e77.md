---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "You are a context-retention/EXPANSION discovery agent for PRISM, slot:alpha (Obs"
date: "2026-06-09"
first_ts: "2026-06-09T10:54:02.741Z"
last_ts: "2026-06-09T10:58:58.600Z"
cwd: "H:\\prism"
messages: 68
user_msgs: 26
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_bc876fed-edf/agent-ab513567399aff60f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# You are a context-retention/EXPANSION discovery agent for PRISM, slot:alpha (Obs

> **claude-code-cli** | 2026-06-09 | 68 msgs (26 user / 42 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_bc876fed-edf/agent-ab513567399aff60f.jsonl`

## Transcript

### User | 2026-06-09T10:54:02.741Z

You are a context-retention/EXPANSION discovery agent for PRISM, slot:alpha (Obsidian/memory-recall lane). Working dir H:/prism. Use Bash + Read + Grep.
RIGOR: verify every premise live (file:line + a probe). A prior discovery over-stated items — confirm the gap is real before proposing.
"Context retention/expansion" = making MORE useful context reliably available to future turns/sessions (better recall coverage, more of the vault reachable, less signal lost at compaction).
Probe (verify each):
  - the 1602 reference_post_ship_* memos recovered into canon this session (U-OBS-MEMDIR-HOMEDIR): are they EMBEDDED into the semantic recall cache yet (state/shared/memo-embedding-cache.jsonl via scripts/lib/memo-embed-lib.mjs)? If not embedded, they're invisible to semantic recall = a retention-expansion gap. (NOTE: the GPU re-embed BUILD is india/sierra lane — but TRIGGERING/scheduling it or a coverage-gap REPORT is alpha.)
  - recall coverage: does memory-relevance-inject / memory-index-search cover all namespaces + the newly-recovered memos? Any namespace walked-but-not-indexed?
  - compaction retention: precompact-memo-emit (just routed through resolveObsidianMemDir this session) — does it capture the full episodic trace, or drop signal?
  - any HIGH-value H: knowledge source NOT yet wired into the recall/vault graph (the "fully wired to ENTIRE H drive" frontier).
For EACH (aim 2-4): title, file:line/probe evidence (VERIFIED), the retention/expansion value, effort S/M/L, owning lane (route OUT india/sierra GPU-embed BUILDS; alpha owns triggers/reports/coverage/wiring).
PLAIN TEXT, numbered. Honest "no gap" is valid.

### Assistant | 2026-06-09T10:54:06.579Z

I'll work through each probe systematically, verifying every premise live before proposing.

### Assistant | 2026-06-09T10:54:08.198Z

[tool_use: Bash]

### Assistant | 2026-06-09T10:54:09.620Z

[tool_use: Bash]

### Assistant | 2026-06-09T10:54:11.085Z

[tool_use: Bash]

### User | 2026-06-09T10:54:13.036Z

[tool_result] -rw-r--r-- 1 wompu 197611 38416703 Jun  9 05:51 state/shared/memo-embedding-cache.jsonl
---LIB---
-rw-r--r-- 1 wompu 197611 7593 Jun  8 23:45 scripts/lib/memo-embed-lib.mjs

### User | 2026-06-09T10:54:15.426Z

[tool_result] c7e346da99 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMDIR-PORTABILITY (slot:alpha): route cag-router COLD_SOURCES memory-md through resolveObsidianMemDir()
e1b95b05a8 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMDIR-FEED-UNIFY (slot:alpha): route the C:->H: Obsidian feed through resolveObsidianMemDir() + capture pre-existing uncommitted resilience block

... [+706 chars truncated]

### User | 2026-06-09T10:54:17.033Z

[tool_result] 1703
---H mirror---
0

### Assistant | 2026-06-09T10:54:21.844Z

Cache exists (38MB, freshly written Jun 9 05:51), and 1703 post_ship memos exist in C: but the H: mirror glob returned 0 (likely glob expansion issue, not a real gap — let me verify). Let me probe whether the post_ship memos are actually IN the embedding cache.

### Assistant | 2026-06-09T10:54:24.662Z

[tool_use: Bash]

### Assistant | 2026-06-09T10:54:26.379Z

[tool_use: Bash]

### User | 2026-06-09T10:54:28.046Z

[tool_result] === post_ship in cache? ===
1702
=== total cache lines ===
3142
=== sample key shape (1st line keys) ===
[ 'name', 'vec', 'hash' ]
path/id sample: (none)
has embedding: undefined

### User | 2026-06-09T10:54:32.492Z

[tool_result] === H mirror count (find, not glob) ===
0
=== H mirror all reference_ ===
0

### Assistant | 2026-06-09T10:54:35.965Z

Interesting — `post_ship` appears 1702 times in the cache (matching ~1602/1703 recovered memos), so they ARE largely embedded. But the cache shape is `{name, vec, hash}` — let me verify the embeddings are real vectors and the names match the post_ship memos. Also the H: mirror has ZERO reference memos which is surprising. Let me dig deeper.

### Assistant | 2026-06-09T10:54:40.210Z

[tool_use: Bash]

### Assistant | 2026-06-09T10:54:42.643Z

[tool_use: Bash]

### User | 2026-06-09T10:54:46.680Z

[tool_result] === cache entry full sample (post_ship) ===
name: reference_post_ship_academy-corpus-ms0-u-a2-mit-ai-textbooks-metadata-contract.md
vec type: 768d real
vec[0..3]: [ -0.010900347, 0.028001461, -0.14981505 ]
hash: c631edb90e25b71a
=== distinct post_ship names in cache ===
distinct names: 1702
samples: [
  'reference_post_ship_academy-corpus-ms0-u-a2-mit-ai-textbooks-metadata-contract.md',
  'referen
... [+126 chars truncated]

### User | 2026-06-09T10:54:50.871Z

[tool_result] === count C post_ship memos ===
1703
=== H knowledge/memories structure ===
=== H any .md memory files at all ===
0

### Assistant | 2026-06-09T10:54:55.969Z

Key findings emerging:
1. **post_ship memos ARE embedded** — 1702 of 1703 in the cache as real 768d vectors. NOT a gap (probe overstated). 1 missing (1703 C: vs 1702 cache).
2. **H: knowledge/memories is EMPTY** — 0 .md files. The C:→H: Obsidian mirror appears broken/missing for memories. This could be a real retention gap.

Let me verify the H: knowledge structure properly and check the recall-coverage path (memory-relevance-inject).

### Assistant | 2026-06-09T10:54:57.860Z

[tool_use: Bash]

### Assistant | 2026-06-09T10:55:00.707Z

[tool_use: Bash]

### User | 2026-06-09T10:55:01.924Z

[tool_result] === H:/knowledge top dirs ===
H:/knowledge
=== does H:/knowledge/memories exist at all? ===
ls: cannot access 'H:/knowledge/memories': No such file or directory
=== H:/knowledge/memories contents (1 level) ===
ls: cannot access 'H:/knowledge/memories': No such file or directory

### Assistant | 2026-06-09T10:55:04.047Z

[tool_use: Bash]

### User | 2026-06-09T10:55:25.234Z

[tool_result] === which memo is NOT embedded (1703 C vs 1702 cache) ===
reference_post_ship_obsidian-vault-synergy-u-obs-recall-counter-serialize.md

### User | 2026-06-09T10:55:29.998Z

[tool_result] === memory-relevance-inject hook ===
.claude/hooks/memory-index-precheck-inject.mjs
.claude/hooks/memory-index-sidecar-regen.mjs
.claude/hooks/memory-relevance-inject.mjs
.claude/hooks/memory-relevance-inject.test.mjs
=== memo-embed-lib namespaces/dirs walked ===
5:// Shared, dependency-free helpers for semantic memory recall: the offline
7:// (memory-relevance-inject.mjs) BOTH import from here, s
... [+94 chars truncated]

### Assistant | 2026-06-09T10:55:34.995Z

Now I have strong signal. Key findings:
1. `H:/knowledge` exists but has NO `memories` subdir — wait, but MEMORY.md claims "mirror at H:/knowledge/memories". Let me verify the actual mirror location vs the doc claim, and check the memo-embed-lib walk logic + memory-relevance-inject coverage.

### Assistant | 2026-06-09T10:55:35.418Z

[tool_use: Read]

### User | 2026-06-09T10:55:36.612Z

[tool_result] 1	// scripts/lib/memo-embed-lib.mjs
2	// -------------------------------
3	// CONTEXT-RETENTION/U-MEMO-SEMANTIC-RECALL (F3, slot:alpha, 2026-06-08)
4	//
5	// Shared, dependency-free helpers for semantic memory recall: the offline
6	// cache builder (build-memo-embedding-cache.mjs) and the hot-path recall hook
7	// (memory-relevance-inject.mjs) BOTH import from here, so the salient-slice
8	// extra
... [+7844 chars truncated]

### Assistant | 2026-06-09T10:55:46.081Z

Now I understand the recall architecture. The cache is keyed by `name` (basename), single namespace `MEMORY_DIR` (the C: memory dir). Let me verify what `memory-relevance-inject` actually walks vs what `build-memo-embedding-cache` walks — and whether all namespaces (feedback_/project_/galaxy/etc.) are covered, not just the post_ship subset. Total cache is 3142 lines but C: has 641+ per-file memories per the MEMORY.md. Let me check coverage.

### Assistant | 2026-06-09T10:55:50.614Z

[tool_use: Bash]

### Assistant | 2026-06-09T10:55:52.025Z

[tool_use: Bash]

### User | 2026-06-09T10:55:54.875Z

[tool_result] === total .md in C memory dir ===
3147
=== by prefix ===
reference_ : 2956
feedback_ : 182
project_ : 7
memory_ : 0
MEMORY : 2
MEMORY-ARCHIVE : 1
=== cache distinct names total ===
distinct cached names: 3142

### User | 2026-06-09T10:55:59.169Z

[tool_result] === what build-memo-embedding-cache walks ===
scripts/build-memo-embedding-cache.mjs
---
24:// Knobs: PRISM_MEMORY_DIR, PRISM_MEMO_EMBED_CACHE, PRISM_EMBED_MODEL,
27:import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
31:  MEMORY_DIR,
50:  if (!existsSync(MEMORY_DIR)) return [];
52:  try { files = readdirSync(MEMORY_DIR); } catch { return []; }
54
... [+311 chars truncated]

### Assistant | 2026-06-09T10:56:06.209Z

Excellent — coverage is essentially complete: 3142 cached vs 3145 eligible (`feedback|reference|project|user` prefixed). Cache is fresh (today). So **probe 1 is NOT a gap** (overstated) — post_ship + all namespaces ARE embedded. But the builder filter `/^(feedback|reference|project|user)_/` reveals a small coverage gap: `MEMORY.md`, `MEMORY-ARCHIVE.md`, and any non-prefixed memo are NOT indexed. Let me verify the precise delta and check the memory-relevance-inject hot-path coverage (does it walk the same set + handle galaxy MEMORY.md files).

### Assistant | 2026-06-09T10:56:14.288Z

[tool_use: Bash]

### Assistant | 2026-06-09T10:56:14.511Z

[tool_use: Bash]

### User | 2026-06-09T10:56:18.960Z

[tool_result] === eligible (4-prefix) vs cached delta ===
eligible: 3145 cached: 3142 missing: 3
missing list: [
  'feedback_d2_bom_smoke.md',
  'feedback_d2_smoke.md',
  'reference_post_ship_obsidian-vault-synergy-u-obs-recall-counter-serialize.md'
]
non-prefixed .md (never eligible): 2 [ 'MEMORY-ARCHIVE.md', 'MEMORY.md' ]

### User | 2026-06-09T10:56:22.831Z

[tool_result] === memory-relevance-inject walk + namespace logic ===
19:import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
36:import { loadEmbedCache, embedText, semanticTopK } from "../../scripts/lib/memo-embed-lib.mjs";
58:    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
81:const MEMORY_DIR =
82:  process.env.PRISM_MEMORY_DIR ||
130:  if (!existsSync(MEMOR
... [+583 chars truncated]

### Assistant | 2026-06-09T10:56:27.745Z

Now I have a clear picture. The hot-path hook and the builder walk the **identical** set (same regex `/^(feedback|reference|project|user)_/`, same single `MEMORY_DIR`) — so they're consistent (no walked-but-not-indexed drift). Only 3 memos missing from cache (2 are throwaway `_smoke` test memos; 1 is the recall-counter memo). Coverage is effectively 100%.

Now let me verify the precompact retention probe and the "fully wired to ENTIRE H drive" frontier. Let me check precompact-memo-emit and the galaxy MEMORY.md frontier.

### Assistant | 2026-06-09T10:56:32.238Z

[tool_use: Bash]

### User | 2026-06-09T10:56:36.253Z

[tool_result] === precompact-memo-emit hook ===
.claude/hooks/precompact-memo-emit.mjs
.claude/hooks/precompact-memo-emit.test.mjs
---grep precompact memo emitters---
.claude/hooks/auto-precompact-watchdog.mjs
.claude/hooks/claim-registry-precompact.mjs
.claude/hooks/claude-brief-precompact.mjs
.claude/hooks/compression-precompact.mjs
.claude/hooks/lib/enforce-precompact-audit.py
.claude/hooks/precompact-auto-t
... [+335 chars truncated]

### Assistant | 2026-06-09T10:56:41.202Z

Two strong new signals:
1. **35 galaxy MEMORY.md per-domain brains exist** but the embed cache builder only walks the single C: `MEMORY_DIR` with the prefix regex — galaxy MEMORY.md files are NOT named `reference_/feedback_/project_/user_` and live in a different dir entirely. The "163 galaxy/MEMORY.md-named cache entries" are reference memos with "galaxy" in the filename, NOT the actual galaxy brains. Let me confirm.
2. Let me read precompact-memo-emit to assess episodic trace capture.

### Assistant | 2026-06-09T10:56:44.500Z

[tool_use: Bash]

### Assistant | 2026-06-09T10:56:44.841Z

[tool_use: Read]

### User | 2026-06-09T10:56:48.495Z

[tool_result] === confirm: is any actual galaxy brain path in cache? ===
exact MEMORY.md in cache: false
galaxy-named samples (these are reference_ memos, not brains): [
  'feedback_bravo_complete_not_clobber_galaxy.md',
  'feedback_each_slot_merges_own_galaxy.md',
  'feedback_foxtrot_galaxy_recover_not_rebuild.md',
  'feedback_galaxy_self_commit.md'
]
=== galaxy brains are basename MEMORY.md — cache is keyed b
... [+174 chars truncated]

### User | 2026-06-09T10:56:49.662Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * precompact-memo-emit.mjs — compaction→memo emitter (lever #3 of
5	 * OBSIDIAN-HERMES-CONTEXT-LEARNING-ACCEL-2026-06-06.md).
6	 *
7	 * THE GAP. A /compact is the one moment a session's episodic context is about
8	 * to be summarized-and-shed. `precompact-handoff.mjs` already captures a
9	 * RESUME directive (what to do NEXT) — operational, terminal-key
... [+14904 chars truncated]

### Assistant | 2026-06-09T10:56:55.763Z

Now I have a thorough understanding of precompact-memo-emit. It captures commit subjects + loop task + branch — a good episodic skeleton, but NOT the full conversational trace (no decisions/findings/files-touched beyond what's in commit subjects). That's a real-but-bounded signal-loss observation. Let me verify two final things: (1) does the Stop feed actually ingest into H:/knowledge/memories (which we found EMPTY) — confirming or refuting the H: mirror gap; and (2) the resolveObsidianMemDir target.

### Assistant | 2026-06-09T10:56:58.950Z

[tool_use: Bash]

### User | 2026-06-09T10:57:02.973Z

[tool_result] === resolveObsidianMemDir target (where Stop feed writes) ===
18:// semantic recall (memo-embed-lib.mjs, homedir-derived), and every other
20:// signal. Deriving from os.homedir() (mirroring memo-embed-lib.mjs:19-21)
27://   3. <homedir>/.claude/projects/H--prism/memory  — derived default
37: * @returns {string} absolute path to the memory dir
41:  if (explicit && String(explicit).trim()) return S
... [+409 chars truncated]

### Assistant | 2026-06-09T10:57:06.954Z

`resolveObsidianMemDir` only resolves the SOURCE (C: memory dir), not the H: destination. The Stop feed claims to write to `knowledge/memories/<type>/` but we found H:/knowledge/memories EMPTY. Let me pin the exact destination path the feed computes and verify whether it's actually writing somewhere else (or genuinely broken).

### Assistant | 2026-06-09T10:57:09.341Z

[tool_use: Bash]

### User | 2026-06-09T10:57:13.157Z

[tool_result] === feed dest computation (lines 80-130) ===
  if (systemMessage) out.systemMessage = systemMessage;
  console.log(JSON.stringify(out));
}

function main() {
  if (process.env.PRISM_OBSIDIAN_FEED_DISABLE === "1") return done();
  if (throttled()) return done();
  if (!existsSync(SYNC_SCRIPT)) return done();

  let pid = null;
  try {
    ensureDir(dirname(SYNC_LOG));
    const fd = openSync(SYNC_L
... [+1977 chars truncated]

### Assistant | 2026-06-09T10:57:16.855Z

The feed delegates to `H:/prism/scripts/obsidian-memory-sync.mjs`. Let me pin the actual destination it writes and check whether it ran (the log) — this determines if the empty H:/knowledge/memories is a real broken-mirror gap or whether the vault lives elsewhere.

### Assistant | 2026-06-09T10:57:20.108Z

[tool_use: Bash]

### User | 2026-06-09T10:57:24.205Z

[tool_result] === obsidian-memory-sync dest dir ===
3: * obsidian-memory-sync.mjs — Sync PRISM memories to Obsidian vault
8: * 3. Creates relationship links between related memories
9: * 4. Syncs tribal knowledge tips
24:// U-OBS-MEMDIR-HOMEDIR reviewer-C P1: this C:->H: feed previously ignored the env vars
27:const OBSIDIAN_VAULT = 'H:/prism/knowledge';
28:const TRIBAL_SOURCE = 'H:/prism/mcp-server/data/tribal
... [+1537 chars truncated]

### Assistant | 2026-06-09T10:57:28.352Z

Critical correction: the vault is at `H:/prism/knowledge` (NOT `H:/knowledge` — my earlier probe checked the wrong path). 3357 reference memos ARE mirrored there. BUT the feed log shows a **live ERROR** — the last sync attempt CRASHED (`Node.js v22.12.0` crash dump with an `open` syscall error on `feedback_alpha_owns_reaper.md`). Let me get the full error and the galaxies mirror status.

### Assistant | 2026-06-09T10:57:30.456Z

[tool_use: Bash]

### User | 2026-06-09T10:57:33.980Z

[tool_result] === full feed-error tail (the crash) ===
    at file:///H:/prism/scripts/obsidian-memory-sync.mjs:660:3
    at ModuleJob.run (node:internal/modules/esm/module_job:271:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:547:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:116:5) {
  errno: -4094,
  code: 'UNKNOWN',
  syscall: 'ope
... [+1128 chars truncated]

### Assistant | 2026-06-09T10:57:39.045Z

Important nuance: that crash is at `syncMemories():342` — a `writeFileSync` with `errno -4094 / UNKNOWN` on a SPECIFIC file. Note the per-file retry resilience fix (U-VAULT-SYNC-RESILIENT) was supposed to handle this. This is a transient Windows file-lock (UNKNOWN/-4094 is the classic Windows "file in use by another process" — the c-to-h-mirror or a peer). Let me verify: is this crash CURRENT (does it still reproduce) or a stale log entry, and does the retry actually wrap line 342?

### Assistant | 2026-06-09T10:57:41.023Z

[tool_use: Bash]

### User | 2026-06-09T10:57:45.801Z

[tool_result] === log mtime vs now ===
2026-06-06 02:09:08.654816200 -0500
Tue Jun  9 05:57:45 CDT 2026
=== is line 342 wrapped by the retry? ===
    ...metadata,
    source: 'prism-memory',
    synced: new Date().toISOString(),
    aliases: [fileName],
  };

  // Extract and add wikilinks
  const links = extractWikilinks(body);

  // Build content
  let content = '---\n';
  for (const [key, value] of Object.en
... [+433 chars truncated]

### Assistant | 2026-06-09T10:57:53.369Z

Resolved: the crash log is STALE (2026-06-06, 3 days old). The target file exists and was successfully written today (Jun 9 05:51), and there are 3357 reference + 34 galaxy MEMORY.md mirrored — so the C:→H: feed IS working now. The line-342 `writeFileSync` was the OLD non-retry path (line 342 is past my sed window which showed a helper; the actual writeFileSync at the crash site needs checking but the feed clearly succeeded since). This is NOT a current gap — it's a stale crash that self-recovered (the sync is idempotent/full-rewrite).

I have enough to verify all four probes rigorously. Let me do one final check: the precompact-memo-emit is NOT wired into the embed cache feedback loop (session memos written at /compact won't be embedded until the next build-memo-embedding-cache run, which is triggered by the Stop feed). Let me confirm the embed-refresh trigger exists.

### Assistant | 2026-06-09T10:57:58.281Z

[tool_use: Bash]

### User | 2026-06-09T10:58:02.386Z

[tool_result] === is build-memo-embedding-cache triggered on Stop? ===
49:// U-MEMO-SEMANTIC-RECALL (F3): keep the semantic-recall embedding cache fresh.
52:// Incremental (hash-reuse) → only NEW/changed memos embed; unchanged ones reuse
55:const MEMO_EMBED_SCRIPT = "H:/prism/scripts/build-memo-embedding-cache.mjs";
56:const MEMO_EMBED_LOG = "H:/prism/.claude/cache/memo-embed-refresh.log";
139:  // F3: refresh 
... [+803 chars truncated]

### Assistant | 2026-06-09T10:58:07.231Z

All four probes now fully verified. The embed loop closes correctly: Stop hook triggers incremental embed-refresh (ran today 05:51, 3142 vectors, embedded 1 / reused 3141 / **failed 2** — those 2 are the `_smoke` test memos that fail salience extraction). 16 `reference_session_*` episodic memos are already embedded, proving precompact-memo-emit → Stop feed → embed-cache loop works end to end.

The `failed 2` is the one tiny real signal. Let me confirm those are the throwaway smoke memos (not a systemic failure).

### Assistant | 2026-06-09T10:58:09.634Z

[tool_use: Bash]

### User | 2026-06-09T10:58:13.532Z

[tool_result] === the 2 'failed' — check the 3 not in cache (already found) ===
--- feedback_d2_bom_smoke ---
﻿# BOM smoke memo body
--- feedback_d2_smoke ---
﻿# D2 smoke memonbody content here.

--- reference_post_ship_obsidian-vault-synergy-u-obs-recall-counter-serialize ---
---
name: reference_post_ship_obsidian-vault-synergy-u-obs-recall-counter-serialize
description: Auto-distilled learnings from shipping
... [+165 chars truncated]

### Assistant | 2026-06-09T10:58:58.600Z

All verified. The 2 smoke memos have no salient slice (just a heading, no description/body para → `salientSlice` returns "" → can't embed → correctly counted as failed). The 3rd (recall-counter-serialize) is a real memo that exists but wasn't in the grep window — it has a valid description, so it should embed on next incremental run; its absence is likely a hash-skip timing artifact, not a systemic gap.

I now have complete, verified findings. Here is my report.

---

CONTEXT RETENTION/EXPANSION DISCOVERY — slot:alpha, Obsidian/memory-recall lane (all premises verified live, 2026-06-09)

PROBE VERDICTS FIRST (honest "no gap" where the prior discovery over-stated):

- Probe 1 (post_ship memos embedded?): **NOT A GAP — over-stated.** The 1602/1703 recovered `reference_post_ship_*` memos ARE embedded into `state/shared/memo-embedding-cache.jsonl` as real 768d `nomic-embed-text` vectors. VERIFIED: cache has 1702 distinct `post_ship` names (`grep -c post_ship` = 1702; sample `reference_post_ship_academy-corpus-ms0-...` carries `vec` = 768d real `[-0.0109, 0.028, -0.1498…]`). Cache is fresh (mtime 2026-06-09 05:51) and the Stop feed auto-triggers the incremental builder (`stop-obsidian-memory-feed.mjs:143-147` → `build-memo-embedding-cache.mjs`; refresh log 05:51 "3142 vectors, embedded 1, reused 3141"). No GPU re-embed needed — already done by the live nomic pipeline.
- Probe 2 (recall coverage / walked-but-not-indexed): **NOT A DRIFT GAP.** The hot-path hook (`memory-relevance-inject.mjs:134`) and the cache builder (`build-memo-embedding-cache.mjs:54`) walk the IDENTICAL set — same regex `/^(feedback|reference|project|user)_.+\.md$/`, same single `MEMORY_DIR` (`memo-embed-lib.mjs:19-21`). 3142 cached / 3145 eligible. No namespace walked-but-not-indexed. (Two sub-gaps below are real but small.)
- Probe 3 (precompact retention): precompact-memo-emit works and the loop closes (16 `reference_session_*` already in the embed cache), but it captures a bounded skeleton, not the
... [+5465 chars truncated]
