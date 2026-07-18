---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Adversarially review this memory-system improvement roadmap. Be skeptical — last"
date: "2026-06-01"
first_ts: "2026-06-01T02:42:51.743Z"
last_ts: "2026-06-01T03:21:05.579Z"
cwd: "H:\\prism-slot-golf"
messages: 139
user_msgs: 52
assistant_msgs: 87
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_80ffee6b-140/agent-a9a8e61ec39d07b52.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Adversarially review this memory-system improvement roadmap. Be skeptical — last

> **claude-code-cli** | 2026-06-01 | 139 msgs (52 user / 87 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_80ffee6b-140/agent-a9a8e61ec39d07b52.jsonl`

## Transcript

### User | 2026-06-01T02:42:51.743Z

Adversarially review this memory-system improvement roadmap. Be skeptical — last round, BOTH the analyst and the operator's prior finding had confident FALSE GAPS (proposed building things that already existed: a "missing" index that was present, a "wire dense" that was already wired).

VERIFIED CURRENT STATE (golf audited this TODAY — treat as ground truth, do NOT re-derive; your job is to DESIGN IMPROVEMENTS on top, and to VERIFY each proposed improvement does NOT already exist by reading the live code). REPO: H:/prism (absolute paths). READ-ONLY.

MEMORY SYSTEM AS-BUILT (mature — most "obvious gaps" are already solved; check before proposing):
- Store: C:/Users/wompu/.claude/projects/H--prism/memory = 1188 .md (lean working/index store, ≤24KB MEMORY.md cap via memory-size-watch.mjs) ; H:/prism/knowledge/memories = 11478 .md (fanned per-file archive, 10690 in reference/). Namespaces: feedback,reference,project,user,patterns,mistakes,inbox,scrutiny,uncategorized,weekly-synthesis,galaxies. C:->H: fed every Stop by .claude/hooks/stop-obsidian-memory-feed.mjs. Per-slot auto-capture: stop-auto-capture-per-slot.mjs. Manual: /remember.
- GENERATION already has: Stop auto-feed, per-slot auto-capture, size watchdog (stop-memory-size-watchdog.mjs), autocompact (memory-autocompact-stop.mjs), pretool-memory-size-gate.mjs, bug-finding-wiki-gate.mjs. The memory-writing CONVENTION says "check for existing file that covers it — update rather than duplicate" (is this ENFORCED at write time, or just convention?).
- ALLOCATION already has: namespaces, 24KB MEMORY.md cap + MEMORY-RECENT.md overflow, autocompact, the galaxies/ namespace (34 galaxy brains).
- INVOCATION already has: HYBRID BM25 + dense(nomic-embed-text 768d) + Reciprocal-Rank-Fusion recall (scripts/lib/memory-index-search-lib.mjs#runMemoryIndexSearch), wired into the UserPromptSubmit hook memory-index-precheck-inject.mjs (line 77) AND the prism_memory:brain_recall MCP action (memoryDispatcher.ts:1323). Per-edit recall:
... [+11776 chars truncated]

### Assistant | 2026-06-01T02:43:07.546Z

I'll adversarially review this roadmap. My job is to verify each proposed improvement against the live code to catch false gaps — things proposed for building that already exist. Let me start by reading the cited files.

### Assistant | 2026-06-01T02:43:08.457Z

[tool_use: Bash]

### User | 2026-06-01T02:44:45.401Z

[tool_result] %SystemDrive%/
.cache/
.claude/
.claude-flow/
.claude-octopus/
---PWD---
/h/prism

### Assistant | 2026-06-01T02:44:47.654Z

Let me start verifying the key claims. First, the four "load-bearing gaps" — these are the foundation of the whole roadmap.

### Assistant | 2026-06-01T02:44:49.077Z

[tool_use: Grep]

### Assistant | 2026-06-01T02:44:50.199Z

[tool_use: Grep]

### User | 2026-06-01T02:44:54.053Z

[tool_result] Found 1 file
H:\prism\.claude\hooks\session-end-peer-share.mjs

### User | 2026-06-01T02:45:17.064Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-01T02:45:18.978Z

Let me search more narrowly to avoid timeouts.

### Assistant | 2026-06-01T02:45:20.399Z

[tool_use: Bash]

### Assistant | 2026-06-01T02:45:21.388Z

[tool_use: Bash]

### User | 2026-06-01T02:46:50.662Z

[tool_result] Exit code 255

### User | 2026-06-01T02:50:37.243Z

[tool_result] Command running in background with ID: bgopb1hes. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\3c562f89-f9f0-4ae9-b128-ed3ffaf0c990\tasks\bgopb1hes.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-01T02:50:40.167Z

Let me use the Grep tool with tighter scoping instead.

### Assistant | 2026-06-01T02:50:41.395Z

[tool_use: Grep]

### Assistant | 2026-06-01T02:50:41.854Z

[tool_use: Grep]

### User | 2026-06-01T02:50:56.637Z

[tool_result] Found 2 files
H:\prism\.claude\hooks\session-learning-feedback.mjs
H:\prism\.claude\hooks\session-end-peer-share.mjs

### User | 2026-06-01T02:51:14.570Z

[tool_result] Found 3 files
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
H:\prism\mcp-server\src\schemas\aiReasoningActionSchemas.ts
H:\prism\mcp-server\src\engines\PeerLearningCoordinatorEngine.ts

### Assistant | 2026-06-01T02:51:17.246Z

Interesting — there's a `session-learning-feedback.mjs` hook that references the ledger. This is a critical finding. The roadmap claims "zero SessionStart consumers" for `PEER_SHARE_LEDGER`. Let me read this hook to see if it's a consumer.

### Assistant | 2026-06-01T02:51:17.350Z

[tool_use: Read]

### User | 2026-06-01T02:51:42.004Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * session-learning-feedback.mjs — Stop Hook
5	 * ==========================================
6	 *
7	 * Captures session outcomes for the AI augmentation learning loop.
8	 * Feeds successful patterns and failed approaches to the learning engines.
9	 *
10	 * What it captures:
11	 * - Task success/failure signals from transcript
12	 * - Approaches used (MCP
... [+7608 chars truncated]

### Assistant | 2026-06-01T02:51:45.572Z

This is a **Stop hook (writer)**, not a SessionStart consumer. It confirms the roadmap's claim — `session-learning-log.jsonl` is written, not read at boot. Now let me verify the critical claim about `session-end-peer-share.mjs` — that it's write-only and drops the learnings.

### Assistant | 2026-06-01T02:51:45.857Z

[tool_use: Read]

### User | 2026-06-01T02:51:53.481Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * session-end-peer-share.mjs — hook_post_session_peer_share (PP-0.18 U-AGI14)
5	 *
6	 * Fires SessionEnd (Stop). Broadcasts non-sensitive session insights to
7	 * PEER_SHARE_LEDGER.jsonl so sibling Claude/Codex sessions can pick them up
8	 * at boot. Dedups by a content fingerprint over 24h.
9	 *
10	 * Anti-pattern guard (plan line 760): "Do NOT broadca
... [+3741 chars truncated]

### Assistant | 2026-06-01T02:51:59.572Z

Confirmed. `session-end-peer-share.mjs` writes `topGoal` + ops-counts only — it drops error→fix learnings. The header comment even says "so sibling Claude/Codex sessions can pick them up at boot" — but the consumer was never built. The roadmap's claim #1 is **accurate**.

Now let me verify there's truly no SessionStart consumer of `PEER_SHARE_LEDGER`. Let me check the settings.json SessionStart chain and search more broadly.

### Assistant | 2026-06-01T02:52:01.522Z

[tool_use: Bash]

### Assistant | 2026-06-01T02:52:03.748Z

[tool_use: Bash]

### User | 2026-06-01T02:53:18.673Z

[tool_result] Exit code 255

### User | 2026-06-01T02:53:52.890Z

[tool_result] SESSIONSTART HOOKS:
  "$CLAUDE_PROJECT_DIR/.claude/hooks/stress-harness-emit.mjs"
  "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/session-id-pin.mjs
  "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/session-start-terminal-pin.mjs
  "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/slot-session-sidecar-sessionstart.mjs
  "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/s
... [+4428 chars truncated]

### Assistant | 2026-06-01T02:54:01.475Z

That's a long SessionStart chain but the first grep errored. Let me re-run it cleanly and also check the full SessionStart list for anything peer-related.

### Assistant | 2026-06-01T02:54:03.358Z

[tool_use: Bash]

### Assistant | 2026-06-01T02:54:06.133Z

[tool_use: Bash]

### User | 2026-06-01T02:54:59.793Z

[tool_result] Exit code 255
.claude/hooks/session-end-peer-share.mjs
=== engines ===

### User | 2026-06-01T02:54:59.794Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(cd /h/prism && for f in $(grep -rl "PEER…) errored</tool_use_error>

### Assistant | 2026-06-01T02:55:03.943Z

The grep found only `session-end-peer-share.mjs` references `PEER_SHARE_LEDGER` (exit 255 is the grep "matched in some, errored on a non-readable dir" — the output line is valid). So `PEER_SHARE_LEDGER` is referenced only by its own writer hook. **Roadmap claim #1 confirmed: write-only, zero consumers.** Let me set up tracking and continue verification of the remaining claims efficiently.

### Assistant | 2026-06-01T02:55:06.379Z

[tool_use: Bash]

### User | 2026-06-01T02:55:35.018Z

[tool_result] 2005:      // ENGINE-WIRE-MS0/U-WIRE26: PeerLearningCoordinatorEngine — broker for
2009:        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
2017:        const { peerLearningCoordinatorEngine } = await import("../../engines/PeerLearningCoordinatorEngine.js");
2025:        const { peerLearningCoordinatorEngine } = await import("../../engi
... [+325 chars truncated]

### Assistant | 2026-06-01T02:55:39.362Z

Confirmed — `PeerLearningCoordinatorEngine` has an in-memory `Map` with no disk-load/hydrate logic, so it's wiped every process exit. This validates the roadmap's claim that the engine "is an in-memory `Map` wiped every process exit, never repopulated." The single highest-leverage build (#1) is grounded in real code.

Now let me verify the other three load-bearing gaps in parallel: `brain_recall` dormancy, `pretool-memory-size-gate` no-semantic, and `superseded` not in sidecar build.

### Assistant | 2026-06-01T02:55:40.962Z

[tool_use: Bash]

### system

... [59 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-01T03:10:07.491Z

[tool_use: Glob]

### User | 2026-06-01T03:10:32.148Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-01T03:10:32.261Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-01T03:10:34.701Z

The repo root is huge. Let me kill the background task and scope to `.claude`.

### Assistant | 2026-06-01T03:10:35.168Z

[tool_use: TaskStop]

### Assistant | 2026-06-01T03:10:35.172Z

[tool_use: Glob]

### User | 2026-06-01T03:11:04.516Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-01T03:11:12.239Z

[tool_result] {"message":"Successfully stopped task: bgrbi6xi3 (cd /h/prism && find . -name \"cag-router*.mjs\" -not -path \"*/node_modules/*\" 2>/dev/null | head)","task_id":"bgrbi6xi3","task_type":"local_bash","command":"cd /h/prism && find . -name \"cag-router*.mjs\" -not -path \"*/node_modules/*\" 2>/dev/null | head"}

### Assistant | 2026-06-01T03:11:15.804Z

Glob is timing out on this repo. Let me use direct ls on the likely locations.

### Assistant | 2026-06-01T03:11:16.670Z

[tool_use: Bash]

### User | 2026-06-01T03:12:10.090Z

[tool_result] .claude/helpers/cag-consume.mjs  6.2K
.claude/helpers/cag-consume.test.mjs  10.2K
.claude/hooks/cag-cold-cache-anchor.mjs  6.5K
.claude/hooks/cag-cold-cache-anchor.test.mjs  7.5K
.claude/hooks/cag-injectors-consume.test.mjs  12.3K
.claude/hooks/cag-router-inject.mjs  6.0K
.claude/hooks/cag-router-inject.test.mjs  10.1K
.claude/hooks/cag-soul-cache-block.mjs  5.4K
---
cag-cold-cache-anchor.mjs  6.5
... [+169 chars truncated]

### Assistant | 2026-06-01T03:12:13.883Z

The file is `cag-router-inject.mjs` (the roadmap mis-cited it as `cag-router.mjs` — minor). Let me check both `cag-cold-cache-anchor.mjs` and `cag-router-inject.mjs` for any precompact-persistence, and verify the recall-counter doesn't feed ranking.

### Assistant | 2026-06-01T03:12:16.259Z

[tool_use: Bash]

### Assistant | 2026-06-01T03:12:16.856Z

[tool_use: Read]

### User | 2026-06-01T03:12:29.658Z

[tool_result] 100	  if (tool !== "Read") return emitContinue(null);
101	  const filePath = String(input.tool_input?.file_path ?? input.tool_input?.filePath ?? "");
102	  if (!filePath || !filePath.endsWith(".md")) return emitContinue(null);
103	  const norm = filePath.replace(/\\/g, "/");
104	  if (!MEMORY_VAULT_PATTERN.test(norm) && !WIKI_VAULT_PATTERN.test(norm) && !SOURCE_MEMORY_PATTERN.test(norm.replace(/\/
... [+1141 chars truncated]

### User | 2026-06-01T03:13:18.291Z

[tool_result] === cag-cold-cache-anchor.mjs: COLD sources + any persist ===
14 matches in 4 files:

.claude/hooks/cag-cold-cache-anchor.mjs:12:// `scripts/lib/cag-router.mjs#COLD_SOURCES` (claude-md, memory-md, engine-di...
.claude/hooks/cag-cold-cache-anchor.mjs:20:// (≤ 1 mod/month + each must be referenced by ≥3 surfaces per the COLD_SOURC...
.claude/hooks/cag-cold-cache-anchor.mjs:34://   PRISM_CAG_COLD_ANC
... [+1256 chars truncated]

### Assistant | 2026-06-01T03:13:25.973Z

Two clean confirmations:

1. **`recall-counter-track.mjs`** — counts Reads of vault files into a state file (`count`, `lastSeenIso`). It only **counts**; it does NOT join surfaced-vs-acted, NOR feed any ranking. This confirms roadmap #5's gap (usefulness counted on Read but never fed into ranking). BUT note: it tracks **Read events on the vault file** — that's "did the human/agent open the memory," not "did a hook surface it." #5's "injection→acted-on" loop (what hooks *surface* joined against Reads) is genuinely additive — the surfaced-side log doesn't exist. Real gap.

2. **CAG anchor** — `cag-cold-cache-anchor.mjs` DOES `writeFileSync` (line 109) a snapshot of cold sources, and `cag-router-inject.mjs` writes a route sidecar (lines 134/138). So there IS persistence to disk. The question for #11 is whether it persists across **/compact** specifically and gets re-read by auto-resume. Let me read the cold-cache-anchor write target and check if it's keyed/consumed at resume.

### Assistant | 2026-06-01T03:13:26.805Z

[tool_use: Read]

### User | 2026-06-01T03:13:40.193Z

[tool_result] 90	    const why = verbose ? ` — ${s.coldRationale}` : "";
91	    return `- [${status}] **${s.id}** (${kb}) \`${s.path}\`${why}`;
92	  });
93	  const footer = `\n\n_Sidecar: state/shared/cag-route/cold-cache-anchor-<sid>.json. Disable: PRISM_CAG_COLD_ANCHOR_DISABLE=1._`;
94	  let body = header + intro + lines.join("\n") + footer;
95	  if (body.length > maxBytes) {
96	    body = body.slice(0, maxBy
... [+1196 chars truncated]

### Assistant | 2026-06-01T03:13:50.865Z

Now I understand the CAG anchor. It's a **SessionStart** hook that writes a per-session sidecar `cold-cache-anchor-<sid>.json` and emits the cold-source block as `additionalContext`. It already fires on SessionStart (including post-compact `compact` event). So the cold anchor IS re-emitted every session start, including after compact.

This is a **partial false gap on #11**. The roadmap claims a "12k-token prompt-cache win lost each compact" that needs precompact persistence. But the cold-cache-anchor already re-emits the cold-source block on every SessionStart (the `compact` matcher event fires it). The genuine nuance: it re-emits the *current* cold sources fresh, not a precompact-captured slot-keyed set. Whether there's an actual loss depends on whether the block re-injection is sufficient to re-warm the prompt cache — and re-injecting identical cold content on the next turn IS what warms the cache. So #11's framing ("reclaim the win lost each compact") is **questionable** — the mechanism to re-anchor cold content on resume already exists and runs on the `compact` SessionStart event. Let me confirm cag-cold-cache-anchor is wired to the compact SessionStart event (it appeared in the SessionStart list earlier — yes, line `cag-cold-cache-anchor.mjs` was in the chain). #11 is at best a marginal extension, possibly already covered. I'll flag it.

Now let me verify the "already-solved/dropped" list isn't hiding a still-broken item, and check #2's premise that there's a sidecar to cosine against (the embeddings sidecar exists — confirmed). Let me also verify #9's claim that `stop-auto-capture-per-slot.mjs` "promises 3 classes, ships 2."

### Assistant | 2026-06-01T03:13:53.073Z

[tool_use: Bash]

### User | 2026-06-01T03:14:26.212Z

[tool_result] === stop-auto-capture-per-slot.mjs: signal classes ===
23 matches in 11 files:

.claude/hooks/stop-auto-capture-per-slot.mjs:3:// PER-SLOT-AUTO-CAPTURE/U-AC01 — auto-capture important session signals into
.claude/hooks/stop-auto-capture-per-slot.mjs:7:// outcome bus for high-signal events from THIS slot's session, then writes
.claude/hooks/stop-auto-capture-per-slot.mjs:17://   - Bug-find wiki gat
... [+2841 chars truncated]

### Assistant | 2026-06-01T03:14:32.216Z

This **corrects roadmap #9**. The header (lines 16-18) documents **3** signal classes:
1. Scrutiny PASS verdicts → reference memory
2. **Bug-find wiki gate fires → feedback memory (regression class)** ← the "regression class" #9 proposes to add
3. Outcome bus failure→success pairs → feedback memory (fix pattern)

But the code (lines 90-118) only implements signal pushes for: scrutiny-pass (line 100-101) and fix-pattern (line 109-115). The **regression/bug-find class (#2 in the header) is documented but NOT implemented in the code shown**. So #9's claim that the header "promises 3 classes, ships 2" is **accurate** — but the missing class is the **bug-find/regression** class (header line 17), and the roadmap correctly names it "bug-fix signal class." Let me confirm there's no bug-find signal push elsewhere in the file to be certain it's truly absent.

### Assistant | 2026-06-01T03:14:33.261Z

[tool_use: Read]

### User | 2026-06-01T03:14:54.402Z

[tool_result] 85	      try { return JSON.parse(l); } catch { return null; }
86	    }).filter(Boolean);
87	  } catch { return []; }
88	}
89	
90	const signals = [];
91	
92	// 1. Scrutiny PASS verdicts — slot shipped clean
93	try {
94	  const ledger3way = JSON.parse(fs.readFileSync(`${PRISM_ROOT}/mcp-server/data/state/SCRUTINY_LEDGER.json`, "utf8"));
95	  const myEntry = ledger3way[env.session_id || ""];
96	  if (
... [+1409 chars truncated]

### Assistant | 2026-06-01T03:15:01.896Z

Confirmed. The code implements **only 2** of the 3 documented classes:
1. Scrutiny PASS (line 92-104) ✓
2. Outcome-bus fix-pattern (line 106-117) ✓
3. **Bug-find/regression class (header line 17) — MISSING from code.** ✗

So #9 is a valid, accurate gap. The roadmap's framing ("header promises 3, ships 2; add regression class") is precisely correct. Good.

Now let me verify the memory-write CONVENTION enforcement question and #2's feasibility — does anything already do write-time semantic dedup? And let me confirm the recall-eval harness exists (so #4 isn't proposing to build it from scratch). Let me check the alpha recall-eval memory and verify `pretool-memory-size-gate` is the only PreToolUse:Write guard on the memory dir.

### Assistant | 2026-06-01T03:15:04.545Z

[tool_use: Bash]

### User | 2026-06-01T03:15:46.502Z

[tool_result] === recall-eval harness exists? ===
-rwxr-xr-x 1 wompu 197611 11778 May 30 11:07 scripts/memory-recall-eval.mjs
-rw-r--r-- 1 wompu 197611  7774 May 30 11:07 scripts/memory-recall-eval.test.mjs
scripts/memory-recall-eval.mjs
scripts/memory-recall-eval.test.mjs
=== alpha recall-eval memory ===
knowledge/memories/reference/reference_alpha_recall_eval_harness_2026_05_30.md  2.7K
C:/Users/wompu/.claude
... [+81 chars truncated]

### Assistant | 2026-06-01T03:15:51.815Z

The recall-eval harness (`scripts/memory-recall-eval.mjs`) exists and is built (alpha's rank-3). So roadmap #4 correctly proposes to **schedule it + wire param-writeback** (not build it). It's an EXTENSION, accurately marked. Let me confirm whether the harness already has a `--sweep` mode and whether it writes tuned params (to know if #4's writeback half is partially done).

### Assistant | 2026-06-01T03:15:53.683Z

[tool_use: Bash]

### Assistant | 2026-06-01T03:15:55.516Z

[tool_use: Bash]

### User | 2026-06-01T03:18:04.467Z

[tool_result] === does memory-index-search-lib load tuned params from a file? ===
0 matches for 'tuned\|loadParams\|readFileSync.*param\|memory-recall-tuned\|JSON.parse.*param\|W_USEFUL\|recencyFactor\|AUTH\['

### User | 2026-06-01T03:18:06.803Z

[tool_result] === memory-recall-eval.mjs: sweep + param writeback? ===
0 matches for 'sweep\|--sweep\|tuned\|tuned-params\|writeback\|write.*param\|memory-recall-tuned\|W_\|weight\|param'

### Assistant | 2026-06-01T03:18:13.313Z

Both confirmed:
- `memory-recall-eval.mjs` has **no** `--sweep` mode and **no** param writeback — so #4's sweep+writeback half is genuinely net-new (the harness only *measures*, as alpha's spec said "the measurement substrate"). ✓
- `memory-index-search-lib.mjs` does **not** load tuned params, and has **no** `recencyFactor` / `AUTH[]` / `W_USEFUL` — confirming #4, #5, #10 are all net-new. The search lib uses hardcoded constants. ✓

Now the critical priority-sanity check: is #1 (peer-insight) actually the highest-leverage AND not already done? I've confirmed it's not done (write-only ledger, no consumer, Map never hydrated). Let me verify the slot→domain map #1 wants to reuse actually exists in the subagent context lib, and do a final scan for any existing SessionStart peer consumer I might have missed (checking the H: settings too, and any "peer-insight" / "peer-learning" named hook).

### Assistant | 2026-06-01T03:18:16.511Z

[tool_use: Bash]

### User | 2026-06-01T03:19:02.506Z

[tool_result] === any existing peer-insight / peer-learning SessionStart hook on disk? ===
session-end-peer-share.mjs  3.8K
(none above = none exist)
=== slot->domain map in subagent lib? ===
293:0:{tokens, hits}, tribal: {tokens, hits, prefDomain} }}
305:0:{ tokens: [], hits: [] }, tribal: { tokens: [], hits: [], prefDomain: null } };
308:0:{ tokens: [], hits: [] }, tribal: { tokens: [], hits: [], prefDomain: 
... [+415 chars truncated]

### Assistant | 2026-06-01T03:19:08.735Z

Confirmed:
- **No** existing peer-insight/peer-learning SessionStart consumer hook exists (only the writer `session-end-peer-share.mjs`). #1 is genuinely net-new.
- The subagent context lib (lines 36-42) **has** a subagentType→domain map (mill/lathe/wedm at lines 40-42) that #1 proposes to reuse. The map exists, so #1's reuse claim is valid. (Minor: it's a subagent-type→domain map, not strictly a slot→domain map, but it's the right primitive.)

I have enough to render a confident verdict. Let me do one final cross-check on the roadmap's "Dropped as already-solved" list — specifically verify the one most likely to be a false drop: that `stop-memory-to-wiki-suggest` (memory→wiki promotion) actually exists, so the roadmap correctly dropped it.

### Assistant | 2026-06-01T03:19:10.819Z

[tool_use: Bash]

### User | 2026-06-01T03:20:18.882Z

[tool_result] Exit code 255
=== dropped-item existence checks ===
stop-memory-to-wiki-suggest.mjs  7.4K
wiki-link-suggest.mjs  11.0K
--- memory autocompact ---
.claude/hooks/memory-autocompact-stop.mjs  9.1K
.claude/hooks/pretool-memory-size-gate.mjs  8.4K
.claude/hooks/stop-memory-size-watchdog.mjs  8.2K
--- formatLoopResumeLine ---

### Assistant | 2026-06-01T03:21:05.579Z

All "dropped as already-solved" items verified to exist on disk:
- `stop-memory-to-wiki-suggest.mjs` ✓ (memory→wiki promotion — correctly dropped)
- `memory-autocompact-stop.mjs` ✓
- `stop-memory-size-watchdog.mjs` ✓
- `pretool-memory-size-gate.mjs` ✓

The roadmap's "dropped" list is honest — it correctly excluded already-built mechanisms. (`formatLoopResumeLine` grep returned nothing in `.claude/` — it likely lives in `.claude/helpers/loop-state.mjs` per CLAUDE.md, but it's not load-bearing to the verdict.)

I have comprehensively verified the roadmap against live code. Here is my adversarial review.

---

# ADVERSARIAL REVIEW — Memory-System Improvement Roadmap

## VERDICT: **SOUND** (with 4 design corrections — zero false gaps found)

This roadmap survived adversarial verification far better than the prior round. **I found no false gaps** — every proposed improvement targets a genuinely-absent mechanism, confirmed by reading the live code. The four "load-bearing gaps" all hold. The corrections below are *design accuracy* fixes (one mis-stated implementation, two over-scoped efforts, one questionable-leverage item), not "this already exists" reversals.

## 1. FALSE GAPS — none. Per-improvement verification (all cited):

| # | Claim | Verdict | Proof |
|---|-------|---------|-------|
| 1 | PEER_SHARE_LEDGER write-only, no boot consumer; Map never hydrated | **REAL GAP** | `session-end-peer-share.mjs` is the *only* file referencing `PEER_SHARE_LEDGER` (grep, hooks+scripts+engines). `PeerLearningCoordinatorEngine.ts:52` `insights = new Map()` — no disk load/hydrate. Header line 8 literally says peers "can pick them up at boot" — consumer never built. |
| 2 | `pretool-memory-size-gate.mjs` has no semantic dedup | **REAL GAP** | 213 lines, **0** matches for `cosine\|embed\|similarity\|nomic\|vector`. |
| 3 | `superseded` not in sidecar build | **REAL GAP** | `build-memory-index-sidecar.mjs` per-file loop (L194-218) has no `status`/`superseded` skip; `build-memory-embed
... [+6069 chars truncated]
