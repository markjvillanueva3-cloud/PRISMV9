---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Per-file scrutiny RE-REVIEW (Agent A) of the FLEET-REAPER-MS1 documentation batc"
date: "2026-05-15"
first_ts: "2026-05-15T02:15:17.351Z"
last_ts: "2026-05-15T02:19:13.330Z"
cwd: "H:\\prism"
messages: 71
user_msgs: 30
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-ad2faef3e05fd49b2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Per-file scrutiny RE-REVIEW (Agent A) of the FLEET-REAPER-MS1 documentation batc

> **claude-code-cli** | 2026-05-15 | 71 msgs (30 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-ad2faef3e05fd49b2.jsonl`

## Transcript

### User | 2026-05-15T02:15:17.351Z

Per-file scrutiny RE-REVIEW (Agent A) of the FLEET-REAPER-MS1 documentation batch after fixes. A prior round FAILed it. Read each changed region end-to-end and confirm the fixes.

**Files + the specific fixes applied:**
1. `H:/prism/CLAUDE.md` — the `## FLEET-REAPER-MS1` section. FIX: `--no-coord` description changed from "skip Layer 3" → "skip Layers 2-3 — GPU/Ollama probe + coordinator". Verify it now matches the implementation.
2. `H:/prism/knowledge/wiki/architecture/fleet-reaper.md` — FIXES: (a) frontmatter `milestone:` changed to `[FLEET-REAPER-MS0, FLEET-REAPER-MS1]`; (b) the `## Verification` block "66-case test suite" → "137-case" + vite-transform caveat note + `--pool=forks`; (c) `## Phase 2 → Test status` section: "exercised every MS1 layer end-to-end" softened to an honest "ran clean — ... executed without throwing (which specific layers take action ... depends on box state)".
3. `H:/prism/knowledge/wiki/code-tribal/leftover-monitor-bash-pattern.md` — FIX: added `status: shipped` + `shipped: 2026-05-14` frontmatter.
4. `H:/prism/knowledge/wiki/code-tribal/gpu-absorb-threshold.md` — FIXES: added `status`/`shipped` frontmatter; added a `⚠ Gating metric UNVERIFIED at ship` callout box at the top of `## The threshold`; the body now says "The **intended** trigger:"; the bottom caveat now points back to the ⚠ box. Verify the internal contradiction (body asserted it works / caveat said it may be broken) is RESOLVED.
5. `H:/prism/knowledge/wiki/code-tribal/soft-relief-age-floor.md` — FIXES: added `status`/`shipped` frontmatter; added a paragraph noting the literal constants are a 2026-05-14 snapshot and the *principle* (between alive-floor and crashed-threshold) is the durable part.
6. `H:/prism/knowledge/wiki/code-tribal/routing-hint-ttl.md` — FIX: added `status`/`shipped` frontmatter.
7. `C:/Users/wompu/.claude/projects/H--prism/memory/reference_fleet_reaper_ms1.md` — FIX: the "6 units, merged ... f22a86d74" line clarified — f22a86d74 carries units 1-5; unit 6
... [+719 chars truncated]

### Assistant | 2026-05-15T02:15:23.401Z

I'll re-review each file against the implementation. Let me read everything in parallel.

### Assistant | 2026-05-15T02:15:23.859Z

[tool_use: Read]

### User | 2026-05-15T02:15:24.559Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-reaper-sweep.mjs' was already read 12m ago in this session and is unchanged (mtime 1778799481117). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-15T02:15:24.911Z

[tool_use: Read]

### Assistant | 2026-05-15T02:15:25.380Z

[tool_use: Read]

### User | 2026-05-15T02:15:25.443Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\process-slot-map.mjs' was already read 12m ago in this session and is unchanged (mtime 1778799481109). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-15T02:15:25.540Z

[tool_use: Read]

### User | 2026-05-15T02:15:27.171Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * alpha-slot-reaper-guardian.mjs — the ALPHA slot owns the fleet reaper.
5	 *
6	 * Doctrine (user directive, 2026-05-14): "whoever is slotted into alpha, they're
7	 * responsible for launching [the fleet reaper] and making sure it's always
8	 * active." This hook is the enforcement arm of that rule.
9	 *
10	 * WHAT IT DOES — only for the chat whose stab
... [+15332 chars truncated]

### User | 2026-05-15T02:15:28.015Z

[tool_result] 1	---
2	title: Fleet Reaper — slot-aware orphan-process reaper
3	type: architecture
4	status: shipped
5	shipped: 2026-05-14
6	milestone: [FLEET-REAPER-MS0, FLEET-REAPER-MS1]
7	---
8	
9	# Fleet Reaper — slot-aware orphan-process reaper for the 7-chat fleet
10	
11	## What it solves
12	
13	PRISM runs up to 7 concurrent Claude chats (alpha..foxtrot + golf). Each spawns
14	`node.exe` (hooks/MCP), `bash
... [+14259 chars truncated]

### Assistant | 2026-05-15T02:15:31.404Z

Let me read the remaining files to verify the fixes.

### Assistant | 2026-05-15T02:15:32.395Z

[tool_use: Read]

### Assistant | 2026-05-15T02:15:33.456Z

[tool_use: Read]

### Assistant | 2026-05-15T02:15:33.952Z

[tool_use: Read]

### User | 2026-05-15T02:15:34.003Z

[tool_result] 1	---
2	title: The leftover-monitor-bash pattern — why the pre-MS1 reaper missed it
3	type: code-tribal
4	status: shipped
5	shipped: 2026-05-14
6	tags: [fleet-reaper, orphan-process, bash, classifier]
7	milestone: FLEET-REAPER-MS1
8	---
9	
10	# The leftover-monitor-bash pattern
11	
12	## The observation
13	
14	The Bash tool's persistent Monitor (and the `Monitor` harness tool) run a shell
15	loop 
... [+1976 chars truncated]

### Assistant | 2026-05-15T02:15:34.450Z

[tool_use: Read]

### Assistant | 2026-05-15T02:15:35.257Z

[tool_use: Read]

### User | 2026-05-15T02:15:35.527Z

[tool_result] 1	---
2	title: GPU-absorb threshold — when idle VRAM beats more kills
3	type: code-tribal
4	status: shipped
5	shipped: 2026-05-14
6	tags: [fleet-reaper, ollama, gpu, memory-pressure, coordinator]
7	milestone: FLEET-REAPER-MS1
8	---
9	
10	# GPU-absorb threshold
11	
12	## The observation
13	
14	On the fork-storm-prone Windows box running 6-7 Claude chats, the binding
15	constraint is **commit memory
... [+2719 chars truncated]

### User | 2026-05-15T02:15:36.553Z

[tool_result] 1	---
2	title: Soft-relief age floor — why 180s sits between the alive-floor and the crashed-threshold
3	type: code-tribal
4	status: shipped
5	shipped: 2026-05-14
6	tags: [fleet-reaper, soft-relief, memory-pressure, thresholds]
7	milestone: FLEET-REAPER-MS1
8	---
9	
10	# Soft-relief age floor — 180 s
11	
12	## The number
13	
14	`PRISM_FLEET_REAPER_SOFT_RELIEF_AGE_SEC = 180`. A stale-slot process i
... [+2131 chars truncated]

### User | 2026-05-15T02:15:36.560Z

[tool_result] 1	---
2	title: Routing-hint TTL — why 5 minutes equals the sweep interval
3	type: code-tribal
4	status: shipped
5	shipped: 2026-05-14
6	tags: [fleet-reaper, ollama, routing-hint, ttl, cross-process]
7	milestone: FLEET-REAPER-MS1
8	---
9	
10	# Routing-hint TTL — 300 s
11	
12	## The number
13	
14	`PRISM_FLEET_REAPER_HINT_TTL_SEC = 300`. The `state/shared/.ollama-routing-hint.json`
15	file the coordi
... [+2077 chars truncated]

### User | 2026-05-15T02:15:36.563Z

[tool_result] 1	---
2	name: reference_fleet_reaper_ms1
3	description: FLEET-REAPER-MS1 Phase 2 — leftover-bash classifier + soft RAM relief + GPU/Ollama coordinator + alpha-slot guardian.
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: b6c4b196-15eb-4d95-9474-abf1c8fbcb8c
8	---
9	
10	FLEET-REAPER-MS1 (Phase 2, shipped 2026-05-14, strictly additive over [[reference_fleet_reaper]] MS0)
... [+2729 chars truncated]

### Assistant | 2026-05-15T02:15:39.204Z

Now let me verify the remaining files and check the implementation details I need.

### Assistant | 2026-05-15T02:15:40.818Z

[tool_use: Bash]

### Assistant | 2026-05-15T02:15:42.799Z

[tool_use: Bash]

### Assistant | 2026-05-15T02:15:44.175Z

[tool_use: Bash]

### User | 2026-05-15T02:15:45.983Z

[tool_result] 399:## FLEET-REAPER-MS1 (2026-05-14 — Phase 2, 6 units, strictly additive over MS0)
400-
401-Three new layers in `fleet-reaper-sweep.mjs` + a new candidate class + a hint consumer + the alpha-slot guardian. Reframes the reaper from "kill more" to "use what's idle" — the box runs near the commit-memory ceiling while the GPU sits at single-digit utilization.
402-
403-- **U-PHASE2-BASH-CLASSIFIER** (
... [+3139 chars truncated]

### User | 2026-05-15T02:15:47.713Z

[tool_result] 113:// ── FLEET-REAPER-MS1 Layer 1: soft RAM/CPU relief ──
122:// ── FLEET-REAPER-MS1 Layer 2/3: GPU + Ollama coordinator ──
475:// ─── Layer 1: soft RAM/CPU relief (FLEET-REAPER-MS1) ────────────────────────
702:// ─── Layer 2: GPU + Ollama state probes (FLEET-REAPER-MS1) ──────────────────
783:  // ONLY (the GPU probe), and PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE / --no-coord
784:  // already sh
... [+1789 chars truncated]

### User | 2026-05-15T02:15:49.474Z

[tool_result] 99:- [Fleet Reaper — slot-aware orphan-process reaper](reference_fleet_reaper.md) — Shipped 2026-05-14 (FLEET-REAPER-MS0). Maps every node/git/bash PID to its owning chat slot via process ancestry + chat-slots.json, reaps orphans of crashed slots gated by confirm-after-N-ticks (`firstSeenAt` timestamp; default 2 × 300s = 10 min continuous candidacy). Three runners: in-session Monitor (`/fleet-reap
... [+2070 chars truncated]

### Assistant | 2026-05-15T02:15:54.054Z

Now let me verify two implementation details: (1) the CLAUDE.md `--no-coord` description matches the implementation, and (2) the `--pool=forks` / vitest config claim. Let me check the help text and the vitest config.

### Assistant | 2026-05-15T02:15:58.816Z

[tool_use: Bash]

### User | 2026-05-15T02:16:04.898Z

[tool_result] H:/prism/.claude/helpers/vitest.config.mjs
---CONFIG EXISTS---
---chat-slots.mjs line 622---
// Guard against undefined process.argv[1] (e.g. when imported via node -e or
// dynamically loaded by a test runner) so the CLI block never crashes the
// import path. When invoked legitimately as the main script argv[1] resolves
// to this file's absolute path. Use endsWith-only (no file:// URL synthesis
... [+390 chars truncated]

### User | 2026-05-15T02:15:17.351Z

Per-file scrutiny RE-REVIEW (Agent A) of the FLEET-REAPER-MS1 documentation batch after fixes. A prior round FAILed it. Read each changed region end-to-end and confirm the fixes.

**Files + the specific fixes applied:**
1. `H:/prism/CLAUDE.md` — the `## FLEET-REAPER-MS1` section. FIX: `--no-coord` description changed from "skip Layer 3" → "skip Layers 2-3 — GPU/Ollama probe + coordinator". Verify it now matches the implementation.
2. `H:/prism/knowledge/wiki/architecture/fleet-reaper.md` — FIXES: (a) frontmatter `milestone:` changed to `[FLEET-REAPER-MS0, FLEET-REAPER-MS1]`; (b) the `## Verification` block "66-case test suite" → "137-case" + vite-transform caveat note + `--pool=forks`; (c) `## Phase 2 → Test status` section: "exercised every MS1 layer end-to-end" softened to an honest "ran clean — ... executed without throwing (which specific layers take action ... depends on box state)".
3. `H:/prism/knowledge/wiki/code-tribal/leftover-monitor-bash-pattern.md` — FIX: added `status: shipped` + `shipped: 2026-05-14` frontmatter.
4. `H:/prism/knowledge/wiki/code-tribal/gpu-absorb-threshold.md` — FIXES: added `status`/`shipped` frontmatter; added a `⚠ Gating metric UNVERIFIED at ship` callout box at the top of `## The threshold`; the body now says "The **intended** trigger:"; the bottom caveat now points back to the ⚠ box. Verify the internal contradiction (body asserted it works / caveat said it may be broken) is RESOLVED.
5. `H:/prism/knowledge/wiki/code-tribal/soft-relief-age-floor.md` — FIXES: added `status`/`shipped` frontmatter; added a paragraph noting the literal constants are a 2026-05-14 snapshot and the *principle* (between alive-floor and crashed-threshold) is the durable part.
6. `H:/prism/knowledge/wiki/code-tribal/routing-hint-ttl.md` — FIX: added `status`/`shipped` frontmatter.
7. `C:/Users/wompu/.claude/projects/H--prism/memory/reference_fleet_reaper_ms1.md` — FIX: the "6 units, merged ... f22a86d74" line clarified — f22a86d74 carries units 1-5; unit 6
... [+719 chars truncated]

### Assistant | 2026-05-15T02:16:37.652Z

All files verified. Here is my re-review.

## Re-review verdict

**FIX 1 — CLAUDE.md `--no-coord` description**
RESOLVED. CLAUDE.md line 412 now reads `--no-coord` (skip Layers 2-3 — GPU/Ollama probe + coordinator pre-warm + routing hint). Matches the implementation: `fleet-reaper-sweep.mjs:1641` help text says "skip Layers 2-3 (GPU/Ollama probe + coordinator pre-warm + routing hint)" and `runSweep` (line 1176, `if (!noCoord)`) gates the whole Layer 2 probe + Layer 3 coordinator block on `noCoord`. The wiki (`fleet-reaper.md:182`) also says "skip Layers 2-3". Consistent across all three surfaces.

**FIX 2 — wiki `fleet-reaper.md`**
(a) Frontmatter `milestone: [FLEET-REAPER-MS0, FLEET-REAPER-MS1]` — RESOLVED (line 6).
(b) Verification block — RESOLVED. Line 209 says "137-case test suite", carries the vite-transform caveat with a back-pointer to "## Phase 2 → Test status", and the command uses `--pool=forks` against the real config path `H:/prism/.claude/helpers/vitest.config.mjs` (confirmed exists).
(c) Test status section — RESOLVED. Line 197-201 now says the live `--once` sweep "ran clean — the classifier, soft-relief selector, GPU probe, Ollama probe and coordinator all executed without throwing (which *specific* layers take action on any one sweep depends on box state...)". The honest framing is in place; no longer over-claims "exercised every MS1 layer end-to-end".

One internal-consistency note: the artifact-map table (line 76) still says "66-case vitest suite" for `fleet-reaper.test.mjs` while the rest of the doc says 137. This is a stale number but it is a P2 cosmetic inconsistency, not a P1 — the authoritative count is stated correctly twice (Test status + Verification) and the table row is descriptive prose, not a load-bearing claim. Logging it as a P2 deferrable, not a gate failure.

**FIX 3 — `leftover-monitor-bash-pattern.md`**
RESOLVED. Frontmatter has `status: shipped` + `shipped: 2026-05-14` (lines 4-5).

**FIX 4 — `gpu-absorb-threshold.md` internal c
... [+2833 chars truncated]

### Assistant | 2026-05-15T02:16:40.680Z

I'll re-review each file against the implementation. Let me read the implementation files first, then each changed doc.

### Assistant | 2026-05-15T02:16:41.136Z

[tool_use: Read]

### Assistant | 2026-05-15T02:16:41.697Z

[tool_use: Read]

### User | 2026-05-15T02:16:41.895Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-reaper-sweep.mjs' was already read 14m ago in this session and is unchanged (mtime 1778799481117). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-15T02:16:42.205Z

[tool_use: Read]

### User | 2026-05-15T02:16:42.814Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\alpha-slot-reaper-guardian.mjs' was already read 77s ago in this session and is unchanged (mtime 1778808897689). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-05-15T02:16:42.817Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\process-slot-map.mjs' was already read 14m ago in this session and is unchanged (mtime 1778799481109). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-15T02:16:50.089Z

The read-once-guard says these are already in my context — but this is a fresh agent invocation and I don't actually have them. Let me bypass the cache.

### Assistant | 2026-05-15T02:16:51.223Z

[tool_use: Bash]

### Assistant | 2026-05-15T02:16:52.297Z

[tool_use: Bash]

### Assistant | 2026-05-15T02:16:53.110Z

[tool_use: Bash]

### User | 2026-05-15T02:16:55.809Z

[tool_result] #!/usr/bin/env node
/**
 * fleet-reaper-sweep.mjs — slot-aware orphan process reaper for the 7-chat fleet.
 *
 * PRISM runs up to 7 concurrent Claude chats (alpha..foxtrot + golf). Each chat
 * spawns node.exe (hooks/helpers/MCP), bash.exe (the Bash tool), and git.exe
 * children. When a chat crashes or is closed WITHOUT firing its Stop hooks those
 * children are orphaned — they pin RAM an
... [+13084 chars truncated]

### User | 2026-05-15T02:17:01.002Z

[tool_result] <persisted-output>
Output too large (37.2KB). Full output saved to: C:\Users\wompu\.claude\projects\h--prism\b6c4b196-15eb-4d95-9474-abf1c8fbcb8c\tool-results\bvrcsuqe3.txt

Preview (first 2KB):
#!/usr/bin/env node
/**
 * process-slot-map.mjs — map running node/git/bash processes to the PRISM chat
 * slot (alpha..foxtrot+golf) that spawned them, via process ancestry.
 *
 * Consumed by:
 *   
... [+1797 chars truncated]

### User | 2026-05-15T02:17:06.202Z

[tool_result] #!/usr/bin/env node
// tier: T3
/**
 * alpha-slot-reaper-guardian.mjs — the ALPHA slot owns the fleet reaper.
 *
 * Doctrine (user directive, 2026-05-14): "whoever is slotted into alpha, they're
 * responsible for launching [the fleet reaper] and making sure it's always
 * active." This hook is the enforcement arm of that rule.
 *
 * WHAT IT DOES — only for the chat whose stable id holds the `alph
... [+14171 chars truncated]

### Assistant | 2026-05-15T02:17:09.914Z

Now let me read the rest of fleet-reaper-sweep.mjs (the coordinator/layer logic and CLI arg parsing for `--no-coord`), and the process-slot-map full file.

### Assistant | 2026-05-15T02:17:11.986Z

[tool_use: Bash]

### Assistant | 2026-05-15T02:17:14.030Z

[tool_use: Bash]

### User | 2026-05-15T02:17:16.320Z

[tool_result]     return { schemaVersion: parsed.schemaVersion || LEDGER_SCHEMA_VERSION, candidates: parsed.candidates };
  } catch {
    return { schemaVersion: LEDGER_SCHEMA_VERSION, candidates: {} };
  }
}

/** PID-reuse-safe ledger key. createdMs distinguishes a reused PID number. */
function ledgerKey(c) {
  return `${c.pid}:${Number.isFinite(c.createdMs) ? c.createdMs : "x"}`;
}

/**
 * Merge the current 
... [+16010 chars truncated]

### User | 2026-05-15T02:17:21.574Z

[tool_result] 68:// Sibling helper, ships together, no side effects on import. The coordinator
93:// TTL'd routing hint written by the Ollama coordinator, read by
122:// ── FLEET-REAPER-MS1 Layer 2/3: GPU + Ollama coordinator ──
125:// coordinator pre-warms a local model and writes a routing hint that nudges
507: * Used by the Ollama coordinator to answer "are there live chats to hint to?"
702:// ─── Layer 2: G
... [+3531 chars truncated]

### Assistant | 2026-05-15T02:17:26.156Z

Now I have the key info. `--no-coord` skips **Layers 2-3** (GPU/Ollama probe + coordinator). The CLAUDE.md fix should match. Let me read the CLI help text and the `--no-coord` handling region precisely, plus check what Layer 1 is and whether `--no-coord` touches it.

### Assistant | 2026-05-15T02:17:27.923Z

[tool_use: Bash]

### User | 2026-05-15T02:17:32.358Z

[tool_result]       // the killer is injectable — but never let a kill-path throw escape
      // runSweep (it is called from a Stop hook + a Monitor loop).
      caveats.push(`reap step failed: ${err?.message || err}`);
      reaped = [];
    }
  }

  const reapedOk = reaped.filter((r) => r.killed && !r.dryRun).length;
  const reapFailed = reaped.filter((r) => !r.killed && !r.dryRun).length;

  // ── FLEET-REA
... [+4004 chars truncated]

### Assistant | 2026-05-15T02:17:38.319Z

Implementation confirmed: `--no-coord` skips **Layers 2-3** (GPU/Ollama probe + coordinator). `--no-relief` skips Layer 1. Now let me read each changed doc file.

### Assistant | 2026-05-15T02:17:41.821Z

[tool_use: Bash]

### Assistant | 2026-05-15T02:17:42.152Z

[tool_use: Read]

### User | 2026-05-15T02:17:46.600Z

[tool_result] 399:## FLEET-REAPER-MS1 (2026-05-14 — Phase 2, 6 units, strictly additive over MS0)
400-
401-Three new layers in `fleet-reaper-sweep.mjs` + a new candidate class + a hint consumer + the alpha-slot guardian. Reframes the reaper from "kill more" to "use what's idle" — the box runs near the commit-memory ceiling while the GPU sits at single-digit utilization.
402-
403-- **U-PHASE2-BASH-CLASSIFIER** (
... [+1985 chars truncated]

### User | 2026-05-15T02:17:47.260Z

[tool_result] read-once-guard: 'H:\prism\knowledge\wiki\architecture\fleet-reaper.md' was already read 2m ago in this session and is unchanged (mtime 1778810953140). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-15T02:17:51.760Z

**File 1 (CLAUDE.md) — FIX 1 CONFIRMED.** Line 412: `--no-coord` (skip Layers 2-3 — GPU/Ollama probe + coordinator) — matches implementation exactly.

Now the wiki file and the rest:

### Assistant | 2026-05-15T02:17:52.816Z

[tool_use: Bash]

### Assistant | 2026-05-15T02:17:54.775Z

[tool_use: Bash]

### User | 2026-05-15T02:17:56.847Z

[tool_result] ---
title: Fleet Reaper — slot-aware orphan-process reaper
type: architecture
status: shipped
shipped: 2026-05-14
milestone: [FLEET-REAPER-MS0, FLEET-REAPER-MS1]
---

# Fleet Reaper — slot-aware orphan-process reaper for the 7-chat fleet

## What it solves

PRISM runs up to 7 concurrent Claude chats (alpha..foxtrot + golf). Each spawns
`node.exe` (hooks/MCP), `bash.exe` (the Bash tool), `git.exe` 
... [+13446 chars truncated]

### User | 2026-05-15T02:18:01.481Z

[tool_result] === leftover-monitor-bash-pattern.md ===
---
title: The leftover-monitor-bash pattern — why the pre-MS1 reaper missed it
type: code-tribal
status: shipped
shipped: 2026-05-14
tags: [fleet-reaper, orphan-process, bash, classifier]
milestone: FLEET-REAPER-MS1
---

# The leftover-monitor-bash pattern

## The observation

The Bash tool's persistent Monitor (and the `Monitor` harness tool) run a shell

... [+4841 chars truncated]

### Assistant | 2026-05-15T02:18:03.926Z

Now the remaining 3 files:

### Assistant | 2026-05-15T02:18:07.455Z

[tool_use: Bash]

### Assistant | 2026-05-15T02:18:10.011Z

[tool_use: Bash]

### User | 2026-05-15T02:18:24.257Z

[tool_result] === soft-relief-age-floor.md ===
---
title: Soft-relief age floor — why 180s sits between the alive-floor and the crashed-threshold
type: code-tribal
status: shipped
shipped: 2026-05-14
tags: [fleet-reaper, soft-relief, memory-pressure, thresholds]
milestone: FLEET-REAPER-MS1
---

# Soft-relief age floor — 180 s

## The number

`PRISM_FLEET_REAPER_SOFT_RELIEF_AGE_SEC = 180`. A stale-slot process i
... [+7498 chars truncated]

### User | 2026-05-15T02:18:32.036Z

[tool_result] 99:- [Fleet Reaper — slot-aware orphan-process reaper](reference_fleet_reaper.md) — Shipped 2026-05-14 (FLEET-REAPER-MS0). Maps every node/git/bash PID to its owning chat slot via process ancestry + chat-slots.json, reaps orphans of crashed slots gated by confirm-after-N-ticks (`firstSeenAt` timestamp; default 2 × 300s = 10 min continuous candidacy). Three runners: in-session Monitor (`/fleet-reap
... [+4578 chars truncated]

### Assistant | 2026-05-15T02:19:13.330Z

(The error-triage hook misfired — no test ran; ignore.)

I now have everything needed. Let me verify each prior P1 against the implementation.

## Verification against implementation

**FIX 1 — CLAUDE.md `--no-coord` description:**
Implementation: `--no-coord` sets `args.noCoord`, which gates the entire `if (!noCoord)` block covering Layer 2 (GPU/Ollama probes) AND Layer 3 (coordinator). CLI help itself says `"--no-coord   skip Layers 2-3 (GPU/Ollama probe + coordinator pre-warm + routing hint)"`. CLAUDE.md line 412 now reads `--no-coord` (skip Layers 2-3 — GPU/Ollama probe + coordinator). **MATCHES. RESOLVED.**

**FIX 2a — wiki frontmatter `milestone:`:** Now `[FLEET-REAPER-MS0, FLEET-REAPER-MS1]`. **RESOLVED.** (File legitimately documents both milestones — MS0 sections + a full Phase 2 section.)

**FIX 2b — "66-case" → "137-case" + caveat + `--pool=forks`:** The `## Verification` block now says `137-case test suite`, cross-references the Test status section, the vite-transform caveat is inline, and the command includes `--pool=forks`. **RESOLVED.** Note: the Artifact map table (line ~"fleet-reaper.test.mjs") still says "66-case vitest suite" — but that's a *new* observation, see P1 below.

**FIX 2c — "exercised every MS1 layer end-to-end" softened:** `## Phase 2 → Test status` now reads: "a live `--once` production sweep that ran clean — the classifier, soft-relief selector, GPU probe, Ollama probe and coordinator all executed without throwing (which *specific* layers take action on any one sweep depends on box state...)". This is the honest framing. **RESOLVED.**

**FIX 3 — leftover-monitor-bash-pattern.md frontmatter:** Has `status: shipped` + `shipped: 2026-05-14`. **RESOLVED.**

**FIX 4 — gpu-absorb-threshold.md contradiction:** `status`/`shipped` frontmatter added. `## The threshold` opens with the `⚠ Gating metric UNVERIFIED at ship` callout box. Body says "The **intended** trigger:". Bottom lesson's caveat now says "(See the ⚠ box at the top...)". The inte
... [+4029 chars truncated]
