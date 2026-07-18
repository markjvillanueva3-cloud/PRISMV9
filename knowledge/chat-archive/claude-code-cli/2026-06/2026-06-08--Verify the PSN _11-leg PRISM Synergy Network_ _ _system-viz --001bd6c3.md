---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Verify the PSN (11-leg PRISM Synergy Network) + /system-viz health as it relates"
date: "2026-06-08"
first_ts: "2026-06-08T15:15:13.997Z"
last_ts: "2026-06-08T15:31:18.874Z"
cwd: "H:\\prism"
messages: 127
user_msgs: 50
assistant_msgs: 77
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_3c7ad9ae-849/agent-a2724eb7903c4652f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Verify the PSN (11-leg PRISM Synergy Network) + /system-viz health as it relates

> **claude-code-cli** | 2026-06-08 | 127 msgs (50 user / 77 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_3c7ad9ae-849/agent-a2724eb7903c4652f.jsonl`

## Transcript

### User | 2026-06-08T15:15:13.997Z

Verify the PSN (11-leg PRISM Synergy Network) + /system-viz health as it relates to Hermes/Obsidian. Checks: (1) Is the hermes_app roost actually IN the live system-graph? Check state/shared/system-viz/hermes-augmentation.json content (node count) AND whether it's merged into the live graph (or only staged). (2) The system-viz regen FAILED per SessionStart banner (exit 3221225786, base graph gen) — verify current graph staleness + whether the hermes roost made it in. (3) PSN leg health: which of the 11 legs touching Hermes/Obsidian (leg1 obsidian_brain, leg3 wiki, leg4 memories) are GREEN vs degraded? Use the manifest psn_leg_mapping + probe the mapped dispatchers live via :3100. (4) Is the obsidian-memory-sync 3-min feed actually running (check for recent writes to knowledge/memories/, the .obsidian-memory-sync.lock state)? Report PSN+viz health with evidence. 
LIVE GROUND TRUTH (verified this session via Get-NetTCPConnection + curl + file reads — do NOT re-assume, but DO independently re-verify with your own commands; never trust a claim you didn't run):
- Hermes desktop app: NOT running. :9120 (Web UI) NOT listening. No hermes/electron process found.
- Obsidian app: NOT running. :27123 (Local REST API plugin) NOT listening.
- Qdrant vector store: DOWN. :6333 NOT listening. (prism_memory:semantic_search returns "qdrant not connected".)
- PRISM MCP server: UP. :3100 listening (PID 27836, node.exe from H:/Tools/nodejs, started 2026-06-08 08:18). HTTP 405 to GET (correct for MCP-over-HTTP). 91 tools. BUT prism_session:self_awareness_search returns ENOENT 'N:\PRISM\src\tools\dispatchers' — a STALE N: drive path. Operator confirmed "n is now h" (drive remap: old N: -> now H:). Source PRISMSelfAwarenessEngine.ts:162 hardcodes PRISM_ROOT="H:/prism" (correct). So either the dist/ bundle was built when on N:, or a runtime path resolves from cwd/env captured at launch.
- Ollama: UP. :11434 listening (PID 34692).
- Hermes config.yaml: model.default=qwen2.5-coder:32b, provide
... [+2282 chars truncated]

### Assistant | 2026-06-08T15:15:41.031Z

I'll empirically verify the PSN + /system-viz health for Hermes/Obsidian. Let me start by reading the key manifest and checking the live system-graph state, running independent checks rather than trusting prior claims.

### Assistant | 2026-06-08T15:15:43.714Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:15:46.697Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:15:46.708Z

[tool_use: Bash]

### User | 2026-06-08T15:16:02.294Z

[tool_result] {
  "schemaVersion": "1.0.0",
  "generated_at": "2026-06-06T03:43:27.165Z",
  "newNodes": [
    {
      "id": "ghost.hermes_app",
      "kind": "ghost-roost",
      "layer": "L8",
      "label": "Hermes App",
      "info": "Nous Research Hermes desktop app — external autonomous runtime (external agent #8, never a NATO slot). Installed. 24 skills · 0 crons · 5 vault output lanes. Connects to PRISM 
... [+1657 chars truncated]

### User | 2026-06-08T15:16:06.390Z

[tool_result] total 5129300
drwxr-xr-x 1 wompu 197611         0 Jun  8 10:09 ./
drwxr-xr-x 1 wompu 197611         0 Jun  8 10:16 ../
-rw-r--r-- 1 wompu 197611       112 Jun  8 09:32 .graph-backstop-spawn.json
-rw-r--r-- 1 wompu 197611       138 Jun  8 09:36 .last-index-build.json
-rw-r--r-- 1 wompu 197611       220 Jun  6 23:25 .last-regen-failure.json
-rw-r--r-- 1 wompu 197611       234 Jun  8 09:36 .last-succ
... [+3187 chars truncated]

### User | 2026-06-08T15:16:07.602Z

[tool_result]   "psn_leg_mapping": {
    "leg1_obsidian_brain": [
      "contextDispatcher",
      "memoryDispatcher",
      "sessionDispatcher"
    ],
    "leg2_prism_os": [
      "agentDispatcher",
      "atcsDispatcher",
      "autoPilotDispatcher",
      "autonomousDispatcher",
      "operatingSystemDispatcher",
      "orchestrationDispatcher"
    ],
    "leg3_wiki": [
      "cadDrawingKnowledgeDispatcher",
... [+680 chars truncated]

### Assistant | 2026-06-08T15:16:13.336Z

Good progress. Let me get the full hermes-augmentation node count, the regen failure details, and check whether the hermes roost is actually merged into the live graph.

### Assistant | 2026-06-08T15:16:16.029Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:16:16.830Z

[tool_use: Read]

### Assistant | 2026-06-08T15:16:17.645Z

[tool_use: Read]

### Assistant | 2026-06-08T15:16:18.005Z

[tool_use: Read]

### User | 2026-06-08T15:16:28.392Z

[tool_result] newNodes: 31
newEdges: 32
kinds: {"ghost-roost":1,"hermes-capability":1,"hermes-skill":24,"hermes-output":5}
keys: [ 'schemaVersion', 'generated_at', 'newNodes', 'newEdges', 'stats' ]

### User | 2026-06-08T15:16:29.938Z

[tool_result] 1	{
2	  "ts": "2026-06-07T04:25:23.131Z",
3	  "ok": false,
4	  "host": "DESKTOP-N7MI1VB",
5	  "pid": 38672,
6	  "durationMs": 138980,
7	  "stage": "generate base graph",
8	  "exitCode": 3221225786,
9	  "signal": null,
10	  "stderrTail": ""
11	}

### User | 2026-06-08T15:16:29.997Z

[tool_result] 1	{
2	  "ts": "2026-06-08T14:36:54.724Z",
3	  "ok": true,
4	  "host": "DESKTOP-N7MI1VB",
5	  "pid": 34660,
6	  "graphMtime": "2026-06-08T14:36:45.069Z",
7	  "graphBytes": 675838938,
8	  "durationMs": 252850,
9	  "pendingCount": 0,
10	  "sidecarOk": true
11	}

### User | 2026-06-08T15:16:30.000Z

[tool_result] 1	{"ts":"2026-06-08T14:36:54.567Z","ok":true,"nodeCount":302512,"rawNodeCount":302512,"skipped":0,"sidecarBytes":202353792,"elapsedMs":8477}

### Assistant | 2026-06-08T15:16:35.923Z

Key finding emerging: the `.last-successful-regen.json` shows a SUCCESSFUL regen TODAY at 2026-06-08T14:36:54Z (graph 675MB, 302512 nodes) — but wait, that's a future-looking timestamp relative to the failure. Let me verify the actual live graph file mtime and whether the hermes roost is IN it. The failure was 2026-06-07; the success appears 2026-06-08. Let me check the actual graph file and search it for the hermes node.

### Assistant | 2026-06-08T15:16:39.376Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:16:40.126Z

[tool_use: Bash]

### User | 2026-06-08T15:16:48.525Z

[tool_result] not at web/
H:/prism/state/shared/system-viz/system-graph.json: 675838938 bytes, mtime 2026-06-08 09:36:45.068817600 -0500
H:/prism/mcp-server/data/system-viz/system-graph.json: MISSING
H:/prism/state/shared/system-viz/system-graph-index.json: 202353792 bytes, mtime 2026-06-08 09:36:53.237966300 -0500
H:/prism/state/shared/system-viz/find-cache.json: 57551172 bytes, mtime 2026-06-08 10:09:32.90159
... [+10 chars truncated]

### User | 2026-06-08T15:16:57.128Z

[tool_result] Mon Jun  8 10:16:56 CDT 2026
---current system time above (compare to regen timestamps)---

### Assistant | 2026-06-08T15:17:02.120Z

The live graph IS fresh — regenerated TODAY 2026-06-08 09:36:45 CDT (the timestamps in the JSON are UTC, so 14:36 UTC = 09:36 CDT, ~40 min ago). The failure was 2026-06-07 04:25 (yesterday). So a SUCCESSFUL regen has since superseded the failure. Now the critical question: is the hermes roost actually merged INTO this 675MB live graph? Let me check via the offset-index sidecar (cheap) and confirm the merge.

### Assistant | 2026-06-08T15:17:03.439Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:17:03.982Z

[tool_use: Bash]

### User | 2026-06-08T15:17:15.122Z

[tool_result] source: node-card-offsets

ghost.hermes_app  [L8 · ghost]  docs:16
  Hermes App
  info: Nous Research Hermes desktop app — external autonomous runtime (external agent #8, never a NATO slot). Installed. 24 skills · 0 crons · 5 vault output lanes. Connects to PRISM via MCP-over-HTTP :3100.
  wiki: knowledge/wiki/architecture/cross-substrate-synergy-ms0.md
        knowledge/wiki/architecture/hermes-a
... [+835 chars truncated]

### User | 2026-06-08T15:17:20.569Z

[tool_result] Found 30 node(s) matching "hermes":
  L8/_  ghost.spec.hermes-evolving-skills-research-2026-05-17 📐 Hermes Agent + Evolving Skills — gap research + adoption brief [docs:16]
  L9/_  ghost.gap.u-gap-skill-auto-gen-ms0 U-GAP-SKILL-AUTO-GEN-MS0 · Build evolving-skills closed loop — harness observes 
  L9/_  ghost.gap.u-gap-hermes-eval  U-GAP-HERMES-EVAL · Evaluate NousResearch Hermes Agent adoption st
... [+4150 chars truncated]

### Assistant | 2026-06-08T15:17:40.899Z

PROVEN: `ghost.hermes_app` and `hermes-capability.native-mcp` are IN the live graph (the offset-index sidecar was built from the 675MB graph at 09:36 today, and node-card resolves them). The hermes roost merged successfully. Now let me verify the PSN leg dispatchers live via :3100 and check the obsidian-memory-sync feed. Let me probe the MCP server and check the memory-sync lock + recent writes.

### Assistant | 2026-06-08T15:17:43.283Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:17:46.511Z

[tool_use: Bash]

### User | 2026-06-08T15:17:50.963Z

[tool_result] total 5164
drwxr-xr-x 1 wompu 197611     0 Jun  8 09:42 ./
drwxr-xr-x 1 wompu 197611     0 Jun  8 09:42 ../
-rw-r--r-- 1 wompu 197611 36785 Jun  8 09:42 MEMORY-ARCHIVE.md
-rw-r--r-- 1 wompu 197611  3084 May  5 17:24 MEMORY.md
drwxr-xr-x 1 wompu 197611     0 Jun  8 01:18 _index/
drwxr-xr-x 1 wompu 197611     0 Jun  8 09:42 _legacy-root/
drwxr-xr-x 1 wompu 197611     0 Jun  8 01:18 dreams/
drwxr-xr-
... [+1238 chars truncated]

### User | 2026-06-08T15:18:01.023Z

[tool_result] === .obsidian-memory-sync.lock ===
MISSING
=== state/shared/.obsidian-memory-sync.lock ===
MISSING
=== knowledge/.obsidian-memory-sync.lock ===
MISSING
=== search for any obsidian-memory-sync lock/state ===
./scripts/obsidian-memory-sync.galaxy-mirror.test.mjs
./scripts/obsidian-memory-sync.mjs
./state/shared/obsidian-memory-sync-hook.log
./state/shared/obsidian-memory-sync.log

### Assistant | 2026-06-08T15:18:10.395Z

All 600+ memory files share mtime 2026-06-08 09:42 — that's a bulk copy (the Stop-hook obsidian-memory-feed mirrors C: → H: on Stop, touching all files). Let me check the actual sync log to see if the 3-min feed is genuinely cycling, and probe the live :3100 dispatchers for the PSN legs. Let me also check the obsidian-memory-sync.mjs to understand its cadence/lock mechanism.

### Assistant | 2026-06-08T15:18:11.500Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:18:12.823Z

[tool_use: Bash]

### User | 2026-06-08T15:18:31.356Z

[tool_result] === obsidian-memory-sync.log (tail) ===

=== obsidian-memory-sync-hook.log (tail) ===
[2026-05-06T01:54:55.792Z] spawned pid=25012 node=H:\Tools\nodejs\node.exe script=H:/prism-iooms0/mcp-server/scripts/obsidian-memory-sync.mjs
[2026-05-06T01:54:56.308Z] spawned pid=24656 node=H:\Tools\nodejs\node.exe script=H:/prism-iooms0/mcp-server/scripts/obsidian-memory-sync.mjs
[2026-05-06T01:55:42.503Z] spa
... [+1006 chars truncated]

### User | 2026-06-08T15:18:31.613Z

[tool_result] 11: * Usage: node scripts/obsidian-memory-sync.mjs [--watch] [--dry-run]
23:const quiet = process.argv.includes('--quiet');
24:const dryRun = process.argv.includes('--dry-run');
54:const LOCK_FILE = path.join(OBSIDIAN_VAULT, '.obsidian-memory-sync.lock');
60:      const fd = fs.openSync(LOCK_FILE, 'wx'); // O_EXCL — fails if exists
68:        const held = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf
... [+416 chars truncated]

### Assistant | 2026-06-08T15:18:47.501Z

Important finding: the `obsidian-memory-sync.log` last wrote 2026-05-05 — over a MONTH ago — and the spawn log references a STALE worktree path `H:/prism-iooms0/mcp-server/scripts/...` which no longer exists. The standalone 3-min sync feed appears DORMANT. The OBSIDIAN_VAULT lock path needs verification. Let me determine the actual vault path the script uses and check what's actually feeding the memories (the Stop-hook is a separate mechanism). Let me also probe :3100 for the PSN leg dispatchers now.

### Assistant | 2026-06-08T15:18:49.462Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:18:52.625Z

[tool_use: Bash]

### system

... [47 middle messages omitted -- see raw_file] ...

### User | 2026-06-08T15:22:59.270Z

[tool_result] === index source file the engine reads ===
9: *   1. system-graph.json (110K nodes / 114K edges, 11 layers).
14: *   3. BUILD_STATE.json — built / unwired / pending / frontend classification
37:const GRAPH_PATH = path.join(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
38:const BUILD_STATE_PATH = path.join(PRISM_ROOT, "state/shared/BUILD_STATE.json");
136:/** Raw graph node — narrow pro
... [+482 chars truncated]

### Assistant | 2026-06-08T15:23:07.876Z

Decisive finding: MasterIndexEngine reads the 675MB `system-graph.json` directly via `fs.readFileSync`. The `query:""` echo from :3100 is the engine's `query` field reflecting the joined tokens after the index-loading path failed. The grep on tsx output returned nothing — the engine call is likely hanging/OOM-ing on the 675MB synchronous read, or `PRISM_ROOT` resolves wrong in the running server.

This ties directly to the operator's flagged bug: the running :3100 server returns `ENOENT 'N:\PRISM\src\tools\dispatchers'` (stale N: path). Let me confirm PRISM_ROOT resolution in the engine and test master_index with explicit longer timeout to see if it's an OOM/hang vs empty result. Let me also verify the operator's claim that it returned 20 hits — that may have been a DIFFERENT surface (master_index_precheck inject hook reads find-cache, not the live engine).

### Assistant | 2026-06-08T15:23:09.942Z

[tool_use: Bash]

### User | 2026-06-08T15:24:25.209Z

[tool_result] 36:const PRISM_ROOT = "H:/prism";
=== :3100 master_index with 60s timeout, watch for hang vs empty ===

real	0m2.264s
user	0m0.047s
sys	0m0.030s

### Assistant | 2026-06-08T15:24:35.379Z

The query returned in 2.26s (NOT a hang/OOM) but produced EMPTY output now (no JSON at all this time — possibly a transient). PRISM_ROOT is hardcoded `H:/prism` (correct). The fast 2.26s return means the engine isn't reading the 675MB graph on every call — it likely caches or the graph load already failed silently and it falls back to capability-index-only. 

Let me settle this definitively: re-run the live query capturing the FULL response, and separately confirm whether the operator's "20 hits" came from the precheck-inject hook (find-cache based) vs the live engine. This is the crux of whether leg1's vault-read path actually works.

### Assistant | 2026-06-08T15:24:46.872Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:24:50.196Z

[tool_use: Bash]

### User | 2026-06-08T15:24:59.853Z

[tool_result] BYTES: 0

### User | 2026-06-08T15:25:21.199Z

[tool_result] === precheck-inject hook reads which file? ===
7: * BEFORE the model decides which search tool to fire. Reads system-graph.json
12: * Disable with: PRISM_MASTER_INDEX_INJECT=0
13: * Tune K with:  PRISM_MASTER_INDEX_K=<n>  (default 5)
26: * Sync-to-system-viz: the lib reads `state/shared/system-viz/system-graph.json`
32:import { readFileSync, statSync } from "node:fs";
35:import { runMasterIndexSea
... [+196 chars truncated]

### Assistant | 2026-06-08T15:25:31.390Z

Now I have a clear divergence: the live :3100 `master_index_query` returned **0 BYTES** (empty response — intermittent failure, possibly the fresh-McpServer-per-request pattern dropping under load). The precheck-inject hook uses a SEPARATE lib `master-index-search-lib.mjs` reading the graph directly — that's likely the path that gave the operator 20 hits, NOT the live dispatcher. Let me verify the standalone lib works (the actually-reliable vault-read path) and run one final clean :3100 retry to characterize the dispatcher's reliability.

### Assistant | 2026-06-08T15:25:31.393Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:25:33.792Z

[tool_use: Bash]

### User | 2026-06-08T15:25:45.897Z

[tool_result] === standalone lib (precheck path) — does it return hermes hits? ===
LIB hits: 5
  - ghost.spec.hermes-obsidian-os-research-2026-05-20
  - wiki.code-tribal.learnings_zebra-hermes-gaps-u-deep-research
  - ghost.spec.hermes-psn-rag-synergy-research-2026-05-23
  - ghost.spec.hermes-memory-vault-research-2026-05-23
  - ms-envelope.hermes-memory-vault-ms0

### User | 2026-06-08T15:26:00.481Z

[tool_result] === :3100 retry x3 to characterize reliability ===
try1: bytes=0 | 
try2: bytes=0 | 
try3: bytes=0 |

### Assistant | 2026-06-08T15:26:11.309Z

Now I have the decisive divergence proven empirically:

- **Standalone lib** (the precheck-inject path) → 5 real hermes hits. WORKS.
- **Live :3100 `master_index_query`** → 0 bytes, 3/3 retries. The dispatcher path is BROKEN/intermittent — the operator's "20 hits" came from the precheck-inject hook (a UserPromptSubmit hook that runs in-Claude via the lib), NOT the live MCP dispatcher.

Let me do a final confirmation: test whether the :3100 server responds AT ALL right now (a different cheap action) to determine if the empty response is action-specific (master_index_query crashes) or the whole server degraded. This distinguishes "server down" from "this action broken."

### Assistant | 2026-06-08T15:26:14.102Z

[tool_use: Bash]

### User | 2026-06-08T15:26:26.403Z

[tool_result] === cheap action: prism_memory get_health (worked earlier) ===

=== tools/list (is server alive?) ===

=== port still listening? ===
0

### Assistant | 2026-06-08T15:26:37.182Z

Critical state change discovered: **the :3100 server is now DOWN**. Port 3100 listener count = 0 (was PID 27836 at session start). `get_health` (which worked at the start of my probes) now returns empty, `tools/list` empty. The server died DURING my verification — likely the watchdog restart-loop or it crashed on the `master_index_query` (which reads the 675MB graph synchronously → OOM). Let me confirm the process state and check for the watchdog/crash evidence.

### Assistant | 2026-06-08T15:26:40.778Z

[tool_use: Bash]

### User | 2026-06-08T15:26:55.072Z

[tool_result] === any node.exe on :3100 / PID 27836 alive? ===

=== all listening ports near 3100 ===
=== retry get_health once more (transient?) ===
 <END>

### Assistant | 2026-06-08T15:27:01.489Z

Both PowerShell queries returned EMPTY — meaning even Ollama (:11434) and the other ports show nothing now. That's suspicious — Ollama was confirmed UP at session start. The empty PowerShell output suggests the query itself may be failing (output framing), not that everything is down. Let me run a cleaner, simpler port check to get reliable ground truth on what's actually listening right now.

### Assistant | 2026-06-08T15:27:02.880Z

[tool_use: Bash]

### User | 2026-06-08T15:27:31.698Z

[tool_result] 3100 down
11434 LISTEN pid=34692
6333 down
9120 LISTEN pid=59404
27123 LISTEN pid=29148

### Assistant | 2026-06-08T15:27:41.968Z

Major state change confirmed with clean evidence:
- **:3100 PRISM MCP — DOWN** (was UP pid 27836 at session start; died during verification)
- **:11434 Ollama — UP** pid 34692 (unchanged)
- **:6333 Qdrant — DOWN** (unchanged from session start)
- **:9120 Hermes Web UI — NOW LISTENING** pid 59404 (operator said NOT running at session start — Hermes app has since LAUNCHED!)
- **:27123 Obsidian REST API — NOW LISTENING** pid 29148 (operator said NOT running at session start — Obsidian has since LAUNCHED!)

So during this session: Hermes + Obsidian apps came UP, but PRISM :3100 went DOWN. This is the critical finding — Hermes is now running but its sole PRISM connection (:3100/mcp) is dead. Let me confirm the process identities and check the PRISM watchdog state to see if a restart is pending.

### Assistant | 2026-06-08T15:27:42.410Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:27:44.571Z

[tool_use: Bash]

### User | 2026-06-08T15:28:44.426Z

[tool_result] Exit code 52

   Id ProcessName RSS_MB
   -- ----------- ------
29148 Obsidian      3473
34692 ollama          88
59404 python         138



=== Hermes :9120 actually serving? ===
HTTP 404 in 0.008895s
=== Obsidian :27123 REST responding? ===
HTTP 000 in 1.578238s

### User | 2026-06-08T15:29:11.850Z

[tool_result] === PRISM MCP watchdog / supervisor state ===
./.claude/cache/mcp-backend-audit.log
./.claude/cache/mcp-bridge.log
./.claude/cache/mcp-daemon.log
./.claude/cache/mcp-server-3100.log
./mcp-server/data/state/watchdog-state.json
./output/mcp-server-3000.err.log
=== most recent MCP server log lines ===
state/shared/mcp-route-suggest-stats.json
mcp-server/logs/supervisor.log
mcp-server/logs/watchdog.lo
... [+1 chars truncated]

### Assistant | 2026-06-08T15:29:21.484Z

Refined findings:
- **:9120 is pid 59404 = python** (HTTP 404 — serving but not the Hermes Web UI; likely a different python service that grabbed that port, NOT the Hermes electron app). So Hermes desktop app is still NOT confirmed running — the operator's "NOT running" holds; :9120 is a python process.
- **:27123 = Obsidian** (pid 29148, 3.4GB RSS — Obsidian IS running now!) but the REST API returned HTTP 000 (connection accepted, no valid HTTP response on `/` — the Local REST API plugin needs auth/HTTPS, HTTP 000 on `/` is normal for it; the port listening + Obsidian process confirms the app is up).

Let me verify the MCP watchdog state and check the supervisor log tail to confirm whether :3100 is in a restart loop (which would explain the mid-session death).

### Assistant | 2026-06-08T15:29:21.484Z

[tool_use: Read]

### Assistant | 2026-06-08T15:29:23.257Z

[tool_use: Bash]

### User | 2026-06-08T15:29:24.269Z

[tool_result] 1	{
2	  "consecutiveFails": 0,
3	  "lastProbeAt": 1780804107056,
4	  "lastEscalationAt": 1780702407280,
5	  "lastFailReason": null
6	}

### User | 2026-06-08T15:29:27.816Z

[tool_result] === watchdog.log tail ===
{"ts":"2026-06-07T03:03:31.068Z","pid":44152,"level":"debug","msg":"Healthy","statusCode":200,"rssMB":796,"uptimeSec":2670}
{"ts":"2026-06-07T03:08:40.776Z","pid":46384,"level":"warn","msg":"Health probe failed","consecutiveFails":1,"threshold":2,"reason":"ETIMEDOUT"}
{"ts":"2026-06-07T03:13:37.092Z","pid":41588,"level":"warn","msg":"Health probe failed","consecutiveFails
... [+1294 chars truncated]

### Assistant | 2026-06-08T15:29:36.763Z

The watchdog state is STALE — `lastProbeAt` 1780804107056 = 2026-06-07 (yesterday), and watchdog.log last wrote 2026-06-06 22:48. So the watchdog is NOT actively monitoring :3100 right now. The watchdog showed historical ETIMEDOUT/ECONNREFUSED flapping on 2026-06-07, then a "Recovery detected". The server that was running at session start (pid 27836, started 08:18 today) had NO watchdog supervising it — it was likely launched manually/by another mechanism, and when it died during my master_index_query probes (the 675MB synchronous graph read = OOM/crash), nothing restarted it.

Let me confirm whether the server is truly gone or restarting, and do a final liveness sweep so my report reflects the current ground truth.

### Assistant | 2026-06-08T15:29:38.656Z

[tool_use: Bash]

### User | 2026-06-08T15:29:54.983Z

[tool_result] === final :3100 sweep (3 attempts over ~10s) ===
attempt1: 3100 listeners=0
attempt2: 3100 listeners=0
attempt3: 3100 listeners=0
=== any node.exe processes running PRISM index? ===

ProcessId
---------
    51096
    48380
    37560
    57500
     8540
    47016
    56512

### Assistant | 2026-06-08T15:30:01.381Z

:3100 is definitively DOWN (0 listeners across 3 attempts over 10s, no auto-restart). There ARE node.exe processes with mcp-server in their command line (7 of them), but none are listening on 3100 — these are likely other slot processes/helpers, not the MCP HTTP server. The server is dead and not coming back on its own.

I have enough empirical evidence to write the complete report. Let me update the task and compile findings.

### Assistant | 2026-06-08T15:30:01.838Z

[tool_use: TaskUpdate]

### User | 2026-06-08T15:30:03.342Z

[tool_result] Updated task #2 status

### Assistant | 2026-06-08T15:31:18.874Z

PSN + /system-viz HEALTH VERIFICATION — Hermes/Obsidian layer. All findings are empirically verified with the exact command + observed output. Verification window: 2026-06-08 ~10:09–10:30 CDT on DESKTOP-N7MI1VB.

═══════════════════════════════════════════
CRITICAL STATE CHANGE DURING VERIFICATION (re-verify before acting — this supersedes the session-start ground truth you handed me)
═══════════════════════════════════════════
Two services FLIPPED state between your session-start snapshot and my probes. Clean per-port evidence (PowerShell Get-NetTCPConnection, run twice ~10 min apart):

  3100 down            <- WAS UP (pid 27836) at session start; DIED mid-verification
  11434 LISTEN pid=34692   (Ollama — unchanged, UP)
  6333 down            (Qdrant — unchanged, DOWN)
  9120 LISTEN pid=59404    <- now listening, but process is python.exe (RSS 138MB), HTTP 404 on / — NOT the Hermes electron Web UI. Some python service holds :9120.
  27123 LISTEN pid=29148   <- now listening; process IS Obsidian.exe (RSS 3,473MB). Obsidian app LAUNCHED since your snapshot.

So: Obsidian is now genuinely running. Hermes desktop app is still NOT confirmed up (:9120 is python, not electron — recommend re-checking for a hermes/electron PID directly). And PRISM :3100 — Hermes's ONLY wired PRISM connection — went DOWN during my run and did NOT auto-restart.

═══════════════════════════════════════════
CHECK 1 — hermes_app roost in live graph: PASS
═══════════════════════════════════════════
- hermes-augmentation.json content: 31 newNodes / 32 newEdges. Kinds: {ghost-roost:1, hermes-capability:1, hermes-skill:24, hermes-output:5}. (cmd: node -e count over the file. Size 12,652 bytes, mtime 2026-06-05 22:43.)
- MERGED INTO LIVE GRAPH — PASS. cmd: `node scripts/system-viz-query.mjs node-card ghost.hermes_app hermes-capability.native-mcp` → both nodes resolve from the offset-index sidecar (source: node-card-offsets), which is regenerated FROM the 675MB live graph. ghost.hermes_app [L8·ghost]
... [+10557 chars truncated]
