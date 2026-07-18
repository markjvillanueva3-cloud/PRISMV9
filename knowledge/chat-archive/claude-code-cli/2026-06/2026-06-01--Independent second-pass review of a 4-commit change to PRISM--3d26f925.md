---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Independent second-pass review of a 4-commit change to PRISM's memory-recall pip"
date: "2026-06-01"
first_ts: "2026-06-01T14:22:50.963Z"
last_ts: "2026-06-01T14:28:05.074Z"
cwd: "H:\\prism-slot-golf"
messages: 53
user_msgs: 20
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-afc96dedecfadcc4e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Independent second-pass review of a 4-commit change to PRISM's memory-recall pip

> **claude-code-cli** | 2026-06-01 | 53 msgs (20 user / 33 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-afc96dedecfadcc4e.jsonl`

## Transcript

### User | 2026-06-01T14:22:50.963Z

Independent second-pass review of a 4-commit change to PRISM's memory-recall pipeline (slot:golf, 2026-06-01). Read each file END-TO-END. Weight your review toward what a correctness-focused reviewer is LIKELY TO MISS: integration with existing consumers, hidden coupling, multi-chat concurrency, security, error-budget completeness, and convention conformance. Report ONLY P0/P1 findings, then grade PASS or FAIL.

FILES (absolute paths, read fully):
1. H:/prism/scripts/lib/memory-index-search-lib.mjs (added supersession exclusion + per-galaxy domain boost into runMemoryIndexSearch)
2. H:/prism/scripts/build-memory-index-sidecar.mjs (supersession filter at sidecar BUILD)
3. H:/prism/.claude/hooks/memory-index-precheck-inject.mjs (UserPromptSubmit hook: resolves slot→galaxy, throttle gate, passes boostDomain)
4. H:/prism/scripts/lib/inject-throttle.mjs (per-session same-prompt throttle, per-session state files)
5. H:/prism/scripts/memory-recall-lint.mjs (per-galaxy recall-readiness scorecard + dashboard writer)

SPECIFIC INTEGRATION/SAFETY CONCERNS TO CHECK:
- The embeddings sidecar derives its records FROM the BM25 sidecar. Confirm the supersession exclusion at BM25-build correctly propagates (the embeddings sidecar can't include what the BM25 sidecar omits) AND that an OLD embeddings sidecar (still containing a now-excluded record) cannot resurface it — i.e., the hybrid fuse hydrates only from byKey built off the (filtered) BM25 records. Is that actually true in runMemoryIndexSearch?
- inject-throttle writes per-session files to mcp-server/data/state/inject-throttle/<sid>.json with NO pruning — is this an unbounded file leak across thousands of sessions? Is that acceptable / is there a janitor? Flag if it's a real disk leak.
- The hook reads PRISM_BOOT_SLOT from env. If a chat is NOT launched via slot-tab-boot (no PRISM_BOOT_SLOT), does it degrade gracefully (no boost) without error?
- slot-galaxy-map: papa/quebec both map to frontend-app; november/yankee unmapped (ga
... [+567 chars truncated]

### Assistant | 2026-06-01T14:23:03.400Z

I'll review the four-commit change to PRISM's memory-recall pipeline. Let me read all five files end-to-end.

### Assistant | 2026-06-01T14:23:03.846Z

[tool_use: Read]

### Assistant | 2026-06-01T14:23:04.295Z

[tool_use: Read]

### Assistant | 2026-06-01T14:23:05.972Z

[tool_use: Read]

### Assistant | 2026-06-01T14:23:05.980Z

[tool_use: Read]

### Assistant | 2026-06-01T14:23:05.985Z

[tool_use: Read]

### User | 2026-06-01T14:23:29.551Z

[tool_result] 1	#!/usr/bin/env node
2	// Pure-core search over the Obsidian memory vault for free-floating memories
3	// not pre-joined to system-graph.json nodes.
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
6	// memories that some system-graph node has linked via knowledge.memoryEntries[].
7	// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,refere
... [+36978 chars truncated]

### User | 2026-06-01T14:23:29.666Z

[tool_result] 1	#!/usr/bin/env node
2	// U-MEMORY-INDEX-SIDECAR — pre-build the memory-vault sidecar so the H7
3	// UserPromptSubmit hook (memory-index-precheck-inject.mjs) can hit a
4	// pre-parsed JSON instead of cold-scanning the ~492-file vault every prompt
5	// (measured at ~8.7 s — exceeded the 5 s UPS timeout, so H7 shipped UNWIRED).
6	//
7	// Reads:  H:/prism/knowledge/memories/{feedback,reference,proje
... [+15789 chars truncated]

### User | 2026-06-01T14:23:31.297Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// memory-index-precheck-inject.mjs — UserPromptSubmit injector (T2, advisory).
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: surfaces top-K direct hits over
6	// the Obsidian memory vault (~492 files at audit time) when a user prompt
7	// has 2+ content tokens. Closes the gap left by master-index-precheck-inject
8	// (system-graph node search; only fin
... [+4954 chars truncated]

### User | 2026-06-01T14:23:31.889Z

[tool_result] 1	// scripts/lib/inject-throttle.mjs
2	// MEMORY-RECALL-THROTTLE (2026-06-01 slot:golf): per-session same-prompt throttle
3	// for UserPromptSubmit injectors. memory-index-precheck-inject's doc comment
4	// promised a "per-session prompt-hash throttle (60s) to avoid context-burn on
5	// /loop ticks" but main() never implemented it (a doc-vs-code lie, R12). /loop
6	// re-submits the SAME prompt eac
... [+3819 chars truncated]

### User | 2026-06-01T14:23:31.936Z

[tool_result] 1	#!/usr/bin/env node
2	// memory-recall-lint.mjs — MEMORY-GEN-COVERAGE (2026-06-01 slot:golf)
3	//
4	// The GENERATION-side companion to the invocation units U-MRS-EXCLUDE (supersession
5	// exclusion) + U-MRDB-WIRE (per-galaxy domain boost): a per-galaxy recall-READINESS
6	// scorecard. It answers "does each galaxy keep its primary domain context?" by
7	// scoring every galaxy's brain record (th
... [+8539 chars truncated]

### Assistant | 2026-06-01T14:23:38.317Z

Now let me read the dependency that's referenced across multiple files but not in my list: `slot-galaxy-map.mjs`. This is critical for verifying the integration concerns about null boostDomain and the papa/quebec/november/yankee mapping.

### Assistant | 2026-06-01T14:23:39.386Z

[tool_use: Read]

### User | 2026-06-01T14:23:45.407Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\slot-galaxy-map.mjs' was already read 7s ago in this session and is unchanged (mtime 1780114614869). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-01T14:23:50.345Z

The guard says it's already in context, but I don't actually have it. Let me grep for the key function and map content.

### Assistant | 2026-06-01T14:23:50.682Z

[tool_use: Grep]

### User | 2026-06-01T14:24:04.834Z

[tool_result] 9://   (1) papa = frontend-app (live hook) vs backend-helper (both generators)
17:// ⚠ papa OPEN CONFLICT (operator to reconcile): this map (and the live hook) route
18://   papa -> frontend-app (shared with quebec; "operator re-designation 2026-05-28"),
24:// november + yankee are DELIBERATELY unmapped (no galaxy domain assigned yet):
28:export const SLOT_GALAXY_MAP = {
43:  papa:    "frontend-ap
... [+279 chars truncated]

### Assistant | 2026-06-01T14:24:09.760Z

Let me read the full slot-galaxy-map to confirm the `galaxyForSlot` contract and verify the map shape.

### Assistant | 2026-06-01T14:24:09.761Z

[tool_use: Read]

### User | 2026-06-01T14:24:22.320Z

[tool_result] 28	export const SLOT_GALAXY_MAP = {
29	  alpha:   "token-optimization",
30	  bravo:   "hermes-zulu",
31	  charlie: "quoting",
32	  delta:   "cad",
33	  echo:    "post-processor",
34	  foxtrot: "mill",
35	  golf:    "fleet-hygiene",
36	  hotel:   "business",
37	  india:   "ai-training",
38	  juliett: "database-expansion",
39	  kilo:    "cam",
40	  lima:    "academy",
41	  mike:    "wedm",
42	  osca
... [+811 chars truncated]

### Assistant | 2026-06-01T14:24:27.885Z

Now I have the full picture. Let me verify a few specific integration concerns before finalizing.

First, let me check whether the embeddings sidecar builder applies the same supersession filter, and whether there's a janitor for the inject-throttle state files. Let me check the throttle directory usage and the build-memory-embeddings-sidecar.

### Assistant | 2026-06-01T14:24:30.125Z

[tool_use: Grep]

### Assistant | 2026-06-01T14:24:31.252Z

[tool_use: Grep]

### User | 2026-06-01T14:24:37.909Z

[tool_result] 164:      sourceMtimeMs: Number(inSc.sourceMtimeMs) || statSync(args.inPath).mtimeMs,
200:    sourceMtimeMs: Number(inSc.sourceMtimeMs) || statSync(args.inPath).mtimeMs,

### User | 2026-06-01T14:24:46.328Z

[tool_result] Found 4 files
H:\prism\.claude\hooks\memory-index-precheck-inject.mjs
H:\prism\scripts\lib\inject-throttle.test.mjs
H:\prism\scripts\lib\inject-throttle.mjs
H:\prism\.claude\hooks\cad-pipeline-knowledge-inject.mjs

### Assistant | 2026-06-01T14:24:53.004Z

Confirmed: the embeddings sidecar (`build-memory-embeddings-sidecar.mjs`) derives FROM the BM25 sidecar (`inSc.records`), and does NOT re-run a supersession filter. This is correct by design — it inherits whatever records the BM25 sidecar contains. Let me verify the embeddings sidecar reads its input records directly from the BM25 sidecar (confirming the propagation chain).

### Assistant | 2026-06-01T14:24:53.726Z

[tool_use: Read]

### User | 2026-06-01T14:24:57.868Z

[tool_result] 140	    process.stderr.write(`[build-memory-embeddings] ollama preflight FAILED at ${args.url} (model ${args.model}).\n`
141	      + "  Check: curl -s " + args.url + "/api/tags  and that nomic-embed-text is pulled.\n");
142	    process.exit(1);
143	  }
144	  const dim = probe.length;
145	
146	  const source = inSc.records.slice(0, args.limit).map((r) => ({
147	    key: recordKey(r), name: r.name, 
... [+2847 chars truncated]

### Assistant | 2026-06-01T14:25:04.374Z

This confirms the propagation chain. Now I have a critical finding to examine. The `--resume` mode in the embeddings builder loads `existing` keys and only embeds `todo` (keys not already present). Let me trace the resurrection concern carefully:

When the BM25 sidecar is rebuilt and now EXCLUDES a newly-superseded memory, `source` (derived from `inSc.records`) won't contain that key. But in `--resume` mode, `results = new Map(existing)` starts with ALL previously-embedded records — including the now-excluded one — and only filters `todo` to new keys. The excluded record is never removed from `results`, so it ships in the new embeddings sidecar.

Let me verify this is the actual behavior and whether the hybrid fuse can resurface it.

### Assistant | 2026-06-01T14:25:04.672Z

[tool_use: Read]

### User | 2026-06-01T14:25:08.892Z

[tool_result] 100	}
101	
102	function loadExistingByKey(outPath) {
103	  const byKey = new Map();
104	  for (const p of [outPath, `${outPath}.partial`]) {
105	    if (!existsSync(p)) continue;
106	    try {
107	      const sc = JSON.parse(readFileSync(p, "utf8"));
108	      if (sc && Array.isArray(sc.records)) {
109	        for (const r of sc.records) if (r && r.key && r.vec) byKey.set(r.key, r);
110	      }
11
... [+1191 chars truncated]

### Assistant | 2026-06-01T14:25:19.297Z

Now I've confirmed the resurrection-via-resume issue. But let me carefully re-examine the SPECIFIC concern the task asked about: whether the hybrid FUSE in `runMemoryIndexSearch` can resurface an excluded record. This is the critical correctness question.

Looking at `tryHybridFuse` (lines 627-633):
```js
const out = [];
for (const { key, rrf } of fusedRanked) {
  const rec = byKey.get(key);   // byKey is built from the FILTERED BM25 sidecar records
  if (!rec) continue;           // dense-only key not in byKey → SKIPPED
  out.push({ ...rec, score: rrf });
}
```

And `byKey` is built in `runMemoryIndexSearch` (line 676) from `sidecarRecords` (the BM25 sidecar, which IS filtered). So even if the dense/embeddings sidecar still contains a superseded record (via `--resume` staleness), its key won't be in `byKey`, and `if (!rec) continue` drops it from the hydrated output. **The task's stated invariant holds: the hybrid fuse hydrates only from `byKey` built off the filtered BM25 records.** A stale embeddings record cannot resurface at query time.

This is a genuinely well-designed guard. The only residual concern is that the stale dense key occupies an RRF rank slot, contributing its `1/(k+rank+1)` to its own key's score — but since that key isn't hydrated, that's a harmless no-op (a wasted RRF entry, not a leak). Let me confirm the embeddings builder has a non-resume full-rebuild path and how it's scheduled, to gauge whether the resume-staleness is operationally reachable.

### Assistant | 2026-06-01T14:25:20.759Z

[tool_use: Grep]

### User | 2026-06-01T14:25:52.663Z

[tool_result] H:\prism\.claude\hooks\memory-index-sidecar-regen.mjs:29:const BUILDER_SCRIPT = "H:/prism/scripts/build-memory-index-sidecar.mjs";
H:\prism\knowledge\wiki\.hook-cache\07a9061015e99a6340e4f5daae973db0b07c1764.json:2:  "key": "dedup-auto-invoke:H:\\prism\\scripts\\build-memory-index-sidecar.mjs:81561b32356da2d1",
H:\prism\knowledge\wiki\.hook-cache\097ab6277eeaf4aacba59e9104310b2fef045a51.json:2:  "
... [+2382 chars truncated]

### Assistant | 2026-06-01T14:25:57.356Z

Let me check the regen hook to understand the BM25 sidecar rebuild trigger, and confirm whether there's any janitor for the inject-throttle state directory.

### Assistant | 2026-06-01T14:25:57.675Z

[tool_use: Read]

### User | 2026-06-01T14:26:03.577Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// memory-index-sidecar-regen.mjs — Stop hook (T3, advisory).
4	//
5	// Keeps the U-MEMORY-INDEX-SIDECAR sidecar fresh so the H7 UserPromptSubmit
6	// hook (memory-index-precheck-inject.mjs) always hits the ~11ms fast-path
7	// instead of the ~8.7s live-scan fallback.
8	//
9	// Logic on Stop:
10	//  1. If sidecar absent → regen (detached spawn).
11	//  2. If m
... [+3605 chars truncated]

### Assistant | 2026-06-01T14:26:12.370Z

This regen hook confirms two important things relevant to my findings:

1. The BM25 regen hook (Stop) regenerates the BM25 sidecar on staleness — so a newly-superseded memory WILL drop from the BM25 sidecar within an hour of a Stop. Good.

2. **The regen hook does NOT trigger the embeddings rebuild.** There is no auto-regen wired for `build-memory-embeddings-sidecar.mjs`. So the embeddings sidecar drifts independently and may contain superseded records indefinitely — but as established, those can never resurface because the hybrid fuse hydrates only from the filtered BM25 `byKey`. This is a defense-in-depth win, not a leak. (The `NAMESPACES` here is the legacy 7-namespace list missing the 4 new ones — but that's a pre-existing staleness-detection gap in a 7s-old regen hook, not part of this change-set.)

Now let me verify the inject-throttle directory has no janitor and assess the unbounded-file concern. I searched already — only the hook, the lib, and the test reference it. No janitor exists. Let me confirm the state directory isn't swept by an existing fleet janitor.

### Assistant | 2026-06-01T14:26:13.911Z

[tool_use: Grep]

### User | 2026-06-01T14:26:24.627Z

[tool_result] Found 10 files
H:\prism\scripts\lib\inject-throttle.test.mjs
H:\prism\scripts\lib\inject-throttle.mjs
H:\prism\scripts\tmp-orphan-janitor.test.mjs
H:\prism\scripts\tmp-orphan-janitor.mjs
H:\prism\scripts\fleet-reaper-sweep.mjs
H:\prism\scripts\fleet-memory-monitor.mjs
H:\prism\scripts\fleet-task-health-watch.mjs
H:\prism\scripts\generate-slot-queues.mjs
H:\prism\scripts\_hook-audit-report.mjs
H:\p
... [+39 chars truncated]

### Assistant | 2026-06-01T14:26:27.665Z

Let me check the tmp-orphan-janitor to see if it sweeps the inject-throttle directory or `.tmp.` files there (relevant both to the leak finding and to the atomic-write tmp-file cleanup concern).

### Assistant | 2026-06-01T14:26:29.201Z

[tool_use: Grep]

### User | 2026-06-01T14:26:36.347Z

[tool_result] 3: * tmp-orphan-janitor.mjs — safe sweep of orphaned atomic-write `*.tmp` siblings (slot:juliett).
5: * WHY: PRISM atomic writers use a tmp+rename pattern. Most writers self-clean (scripts/lib/atomic-json.mjs
6: * uses `.tmp-<pid>` + finally-unlink), but some leave their tmp behind on crash/overlap — notably the
7: * tribal-embed-index regen (`tribal-embed-index.json.<pid>.tmp`, ~382MB each) and t
... [+2550 chars truncated]

### Assistant | 2026-06-01T14:26:43.013Z

This is highly relevant. The `tmp-orphan-janitor.mjs` sweeps `H:/prism/mcp-server/data/state` (DEFAULT_DIRS line 29) recursively, and it matches the `.tmp.<pid>` pattern. So:

1. **The inject-throttle atomic-write tmp files** (`<sid>.json.tmp.<pid>`, from `savePrev` line 65) WILL be swept if orphaned by a crash — good, no orphaned-tmp leak. The pattern `\.tmp\.\d+` matches `<sid>.json.tmp.12345`.

2. **BUT the committed `<sid>.json` files themselves are NOT `.tmp` files** — they're permanent state files. The janitor only sweeps `.tmp` orphans, not the published `<sid>.json` records. So the unbounded-file concern stands: every distinct session id creates a permanent `mcp-server/data/state/inject-throttle/<sid>.json` (~50 bytes) that nothing ever prunes.

Let me quantify the leak rate realistically and check the test file to see if the leak was considered. Let me also verify whether `mcp-server/data/state` is gitignored (so these don't pollute commits).

### Assistant | 2026-06-01T14:26:44.438Z

[tool_use: Grep]

### Assistant | 2026-06-01T14:26:45.491Z

[tool_use: Grep]

### User | 2026-06-01T14:27:01.599Z

[tool_result] No matches found

### User | 2026-06-01T14:27:03.384Z

[tool_result] 58:mcp-server/data/state/git-health-state.json
59:mcp-server/data/state/portable-*-drift.jsonl
192:# Ephemeral pillar-diff patches written by mcp-server/data/state/.dd-pillar*
195:mcp-server/data/state/.dd-pillar*.patch
200:mcp-server/data/state/*-last.iso

### Assistant | 2026-06-01T14:27:08.002Z

Let me check whether `mcp-server/data/state/` is broadly gitignored (a wildcard entry would prevent the throttle files from polluting git), and check the broader gitignore for a directory-level rule.

### Assistant | 2026-06-01T14:27:09.258Z

[tool_use: Grep]

### User | 2026-06-01T14:27:19.461Z

[tool_result] 58:mcp-server/data/state/git-health-state.json
59:mcp-server/data/state/portable-*-drift.jsonl
195:mcp-server/data/state/.dd-pillar*.patch
200:mcp-server/data/state/*-last.iso

### Assistant | 2026-06-01T14:28:05.074Z

`mcp-server/data/state/` is NOT broadly gitignored — only specific files are. So the `inject-throttle/<sid>.json` files are technically git-trackable unless caught by another rule. But more importantly, they accumulate on disk unbounded. Let me confirm the realistic leak magnitude: how does a session id change? The throttle keys on `payload.session_id`. With terminal-pin + auto-resume, a session id is stable across a single chat but a NEW one is generated per `/compact` and per fresh chat. Across the 26-slot fleet running continuously, that's potentially thousands of ~50-byte files over months.

I have enough to assess this precisely. Let me do one final check — verify the `savePrev` cross-device rename risk by confirming `tmp` and `path` are in the same directory (they are: `tmp = \`${path}.tmp.${process.pid}\``, same dir), and confirm the dashboards output path is golf-allowlisted as the comment claims. Let me verify the golf write-allowlist status since memory-recall-lint writes to `state/shared/dashboards/`.

The CLAUDE.md context already states the golf write-allowlist hook is UNWIRED as of 2026-05-20, and `state/shared/dashboards/**` was in the allowlist anyway. So no permission issue. The atomic writes (`tmp` + `rename` in same dir) carry no cross-device risk since both paths are siblings.

I now have everything needed. Let me compile the review.

## Independent Second-Pass Review — Memory-Recall Pipeline (4 commits, slot:golf)

I read all five files end-to-end plus the load-bearing dependencies (`slot-galaxy-map.mjs`, `build-memory-embeddings-sidecar.mjs`, `memory-index-sidecar-regen.mjs`, `tmp-orphan-janitor.mjs`, `.gitignore`).

### Verification of the stated integration invariants (all HOLD)

- **Supersession propagation BM25 → embeddings, and no resurrection at query time: CONFIRMED SAFE.** The embeddings builder derives `source` from `inSc.records` (the BM25 sidecar, line 146), so a full rebuild inherits the filter. Critically, even if an OLD embeddings
... [+5390 chars truncated]
