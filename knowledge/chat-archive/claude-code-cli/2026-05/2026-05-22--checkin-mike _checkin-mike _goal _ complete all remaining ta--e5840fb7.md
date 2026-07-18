---
type: "chat-session"
source: "claude-code-cli"
session_id: "e5840fb7-ef73-4b34-a9f0-20822aa90cab"
title: "checkin-mike /checkin-mike /goal [ complete all remaining task for mike in logic"
date: "2026-05-22"
first_ts: "2026-05-22T16:29:12.852Z"
last_ts: "2026-05-23T16:40:03.575Z"
cwd: "H:\\prism"
messages: 883
user_msgs: 397
assistant_msgs: 486
raw_file: "H:/.claude/projects/H--prism/e5840fb7-ef73-4b34-a9f0-20822aa90cab.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:53"
---

# checkin-mike /checkin-mike /goal [ complete all remaining task for mike in logic

> **claude-code-cli** | 2026-05-22 | 883 msgs (397 user / 486 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e5840fb7-ef73-4b34-a9f0-20822aa90cab.jsonl`

## Transcript

### User | 2026-05-22T16:31:13.271Z

<command-message>checkin-mike</command-message>
<command-name>/checkin-mike</command-name>
<command-args>/goal [ complete all remaining task for mike in logical high roi order | complete and wired ] /loop [5m] /goal</command-args>

### User | 2026-05-22T16:31:13.272Z

# /checkin-mike — slot-locked /checkin

Force-takes the **mike** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the handoff to `mike-work`, then runs the standard `/checkin` pipeline. Slot added 2026-05-16 as the 13th fleet slot per the operator directive "add a 13th chat slot, update everything that needs to update to intake a 13th chat".

## Slot binding (replaces /checkin Step 2)

```bash
STABLE="claude-<8hex-from-Chat-Isolation-line>"
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)
SLOT="mike"
TOPIC="mike-work"

# Reap stale slots first, then force-take mike from whoever holds it.
node H:/prism/.claude/helpers/chat-slots.mjs reclaim
node H:/prism/.claude/helpers/chat-slots.mjs claim \
  --chatId "$STABLE" --branch "$BRANCH" --topic "$TOPIC" --activity "checkin" \
  --preferSlot $SLOT --force true --confirmRecent true
```

If the claim result carries `previousOwner`, surface it in the §Report — the evicted chat's id, topic, and last-heartbeat age are all useful context.

## Pipeline delegation

After the slot-claim above, execute the FULL `/checkin` pipeline from `H:/prism/.claude/commands/checkin.md`:

- **Slot-claim phase (steps 3-7)** — handoff bind under `mike-work` topic · chat-bus read · drift check (`audit-roadmap-drift.mjs`) · commit hygiene (dirty/staged/ahead-behind/worktree) · 6b roadmap slice · 6c BUILD_STATE · 6d Obsidian recent · 6e system-viz ping · 6f CLAUDE.md staleness · 6g local-compute health · 6h fleet activity + pickup candidates · §Report.
- **Dev pipeline phase (steps 8-14)** — fires only when args contain a task directive (`/loop`, `/goal`, `/pick-unit`, `unit`, `task`, `build`, or a verbatim filepath). Covers awareness inject verification, /system-viz-first audit doctrine, Obsidian-PRISM-OS routing, CLAUDE.md+GSD+skills+hooks+RTK token savings, /loop iter ticks, files-to-galaxy refresh, end-of-session pipeline (per-file scrutiny, 3-of-3 gate, close-out, doc reflection, commit, precompact
... [+1207 chars truncated]

### Assistant | 2026-05-22T16:31:32.574Z

I'll bind the mike slot, then enter the autonomous /loop on the work order: complete all remaining mike-domain (misc) tasks in high-ROI order, wired.

### Assistant | 2026-05-22T16:31:32.580Z

[tool_use: Bash]

### Assistant | 2026-05-22T16:31:32.641Z

[tool_use: Bash]

### Assistant | 2026-05-22T16:31:33.187Z

[tool_use: Bash]

### User | 2026-05-22T16:32:01.307Z

[tool_result]     }
  ]
}
    "activity": "checkin",
    "terminalWindowId": "tw-wt-3dace229-2282-4dd0-a012-bce912e1d57c",
    "pipelineStep": null,
    "pipelineIter": null,
    "pipelineTarget": null
  },
  "alreadyOwned": true
}

### User | 2026-05-22T16:32:11.426Z

[tool_result] {"ok":true,"content":"---\nsession: claude-e5840fb7\ntopic: mike-cad-fusion-live-ms0\nslot: mike\nwritten_at: 2026-05-22T16:31:18.042Z\nmachine: DESKTOP-N7MI1VB\nfamily: Claude\nsession_key: claude-e5840fb7\nstatus: active\n---\n\n# HANDOFF: claude-e5840fb7\nUpdated: 2026-05-22T16:31:18.043Z\nFamily: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-e5840fb7\n\n## STATE\n(precompact auto-write —
... [+3853 chars truncated]

### User | 2026-05-22T16:32:30.940Z

[tool_result] U-CK11 [backend-dev p0] COMMAND-KERNEL-MS0 — Per-category scrutiny pass over the migrated corpus  [misc]
U-FR-MS3-A [backend-dev p0] FLEET-REAPER-MS3 — Live-chat priority boost on prompt  [misc]
P0-U01 [backend-dev p0] INFRA-AGI-ROUTER-MS2 — Define DomainAGIIntent + DomainAGIResult Zod schemas  [misc]
P0-U04 [backend-dev p0] INFRA-AGI-ROUTER-MS2 — Adapt WEDMAGI to DomainAGIIntent contract  [misc]

... [+905 chars truncated]

### Assistant | 2026-05-22T16:32:43.572Z

Slot mike claimed (already owned). Got 12 candidate units. Several have memory hits suggesting prior completion — I'll verify against git before building. Starting the loop.

### Assistant | 2026-05-22T16:32:44.564Z

[tool_use: Bash]

### Assistant | 2026-05-22T16:32:45.591Z

[tool_use: Bash]

### User | 2026-05-22T16:33:01.117Z

[tool_result] {"ok":true,"started":true,"target":20}

### User | 2026-05-22T16:33:13.526Z

[tool_result] ee2ce44dd1 [MAIN] [INFRA-AGI-ROUTER-MS2]/P1-U05 (slot:charlie): wire ProcessIntelligenceRouterEngine.orchestrate into...
b896074b43 [MAIN] [INFRA-AGI-ROUTER-MS2]/P1-U03 (slot:charlie): retrofit LatheAGIKnowledgeUnificationEngine onto doma...
3c48c070b2 [MAIN] [INFRA-AGI-ROUTER-MS2]/P1-U02 (slot:charlie): retrofit MillingAGIMasterEngine onto domainAGIAdapter...
382fd49aa3 [MAIN] [INFRA-AGI-ROUTER-M
... [+679 chars truncated]

### Assistant | 2026-05-22T16:34:00.664Z

INFRA-AGI-ROUTER-MS2 P0-U01/U04/U05 all shipped — priority queue surfaced them as close-out-drift false positives. Verifying the rest.

### Assistant | 2026-05-22T16:34:02.257Z

[tool_use: Bash]

### Assistant | 2026-05-22T16:34:08.265Z

[tool_use: Bash]

### User | 2026-05-22T16:34:50.885Z

[tool_result] f7d5ebca3e [MAIN] [FLEET-REAPER]/U-FR-STUCK-HUNT-SELFGUARD (slot:golf): scrutiny BLOCKER fix — self-kill + fsmonitor-...
75f36181c9 [MAIN] [FLEET-REAPER]/U-FR-STUCK-HUNT-DOCS (slot:golf): memory + wiki for stuck-hunters
f2e9735470 [MAIN] [FLEET-REAPER]/U-FR-RESTORE-SWEEP (slot:hotel): restore scripts/fleet-reaper-sweep.mjs — unintentio...
6738f66dcb [MAIN] [FLEET-REAPER]/U-FR-STUCK-HUNT (slot:golf
... [+3804 chars truncated]

### User | 2026-05-22T16:35:20.114Z

[tool_result] COMMAND-KERNEL-MS0 shipped=0 pending=29 total=29 status=?
INFRA-AGI-ROUTER-MS2 shipped=0 pending=5 total=5 status=?
FLEET-REAPER-MS3 shipped=3 pending=1 total=4 status=?
OBSIDIAN-INTELLIGENCE-MS3 shipped=0 pending=25 total=25 status=?
OLLAMA-EXPAND-MS0 shipped=0 pending=1 total=1 status=?
RGS-TOOL-AUTOINVOKE-MS1 shipped=0 pending=8 total=8 status=?

### Assistant | 2026-05-22T16:35:52.039Z

MILESTONE_PROGRESS shows pure close-out drift — git log proves units shipped but `shipped=0`. INFRA-AGI-ROUTER-MS2 looks fully shipped (10 commits). Verifying and checking the close-out tool.

### Assistant | 2026-05-22T16:35:52.041Z

[tool_use: Bash]

### Assistant | 2026-05-22T16:35:53.609Z

[tool_use: Bash]

### User | 2026-05-22T16:36:43.366Z

[tool_result] e7883b0360 [MAIN] [INFRA-AGI-ROUTER-MS2]/P0-U03 (slot:charlie): adapt LatheAGI cluster to DomainAGIIntent contract
87e9cf3eb3 [MAIN] [LIMA-ROSTER]/U-LIMA-A6 (slot:lima): RoadmapIntelligenceEngine-backed complexity adapter
58345a0a74 [MAIN] [INFRA-AGI-ROUTER-MS2]/P0-U02 (slot:charlie): adapt MillingAGIMasterEngine to DomainAGIIntent contract
76073333d3 [MAIN] [INFRA-AGI-ROUTER-MS2]/P0-U01 (slot:cha
... [+63 chars truncated]

### User | 2026-05-22T16:36:50.845Z

[tool_result]  *   --milestone <ID>       Close out a specific milestone (most common).
 *   --auto                 Detect milestone from most recent [<SCOPE>]/U-*: commit.
 *   --no-write             Preview only; don't mutate any file.
 *   --json                 Machine-readable output (single JSON object on stdout).
 *   --skip-chat-bus        Don't broadcast (useful for CI / batch runs).
 *   --skip-regen 
... [+591 chars truncated]

### Assistant | 2026-05-22T16:37:14.395Z

Classification done. INFRA-AGI-ROUTER-MS2 fully shipped (P0-U01..U05), U-RIE-ADAPTER shipped as U-LIMA-A6. The 12-unit queue is mostly close-out drift. Iter 1: close out INFRA-AGI-ROUTER-MS2.

### Assistant | 2026-05-22T16:37:14.890Z

[tool_use: Bash]

### User | 2026-05-22T16:37:24.851Z

[tool_result] status: in_progress
units: 
---PREVIEW---
ok: false wouldClose: ?
{"ok":false,"error":"envelope.status=\"in_progress\" (expected \"completed\" or \"complete\"); use --force to override. Did you forget to flip status + bump completed_units in the envelope JSON?"}

### Assistant | 2026-05-22T16:37:31.584Z

[tool_use: Bash]

### User | 2026-05-22T16:37:37.554Z

[tool_result] KEYS: id,version,title,brief,created_at,created_by,track,track_name,status,linked_roadmap,phases,acceptance,risks,blocks,blocked_by
status: in_progress | completed_units: undefined | total_units: undefined
unit-container type: object len: 0
[]

### Assistant | 2026-05-22T16:37:46.609Z

[tool_use: Bash]

### User | 2026-05-22T16:37:52.123Z

[tool_result] phases: 1
PHASE P0 status=? units=5
   P0-U01 :: ? :: Define DomainAGIIntent + DomainAGIResult Zod schemas
   P0-U02 :: ? :: Adapt MillingAGIMasterEngine to DomainAGIIntent contrac
   P0-U03 :: ? :: Adapt LatheAGI engine cluster to DomainAGIIntent contra
   P0-U04 :: ? :: Adapt WEDMAGI to DomainAGIIntent contract
   P0-U05 :: ? :: Wire ProcessIntelligenceRouterEngine.orchestrate(intent

### Assistant | 2026-05-22T16:38:03.705Z

All 5 P0 units shipped per git log. Reading envelope to flip status precisely.

### Assistant | 2026-05-22T16:38:03.715Z

[tool_use: Read]

### User | 2026-05-22T16:38:13.052Z

[tool_result] 1	{
2	  "id": "INFRA-AGI-ROUTER-MS2",
3	  "version": "1.0.0",
4	  "title": "Unify Domain AGIs Behind ProcessIntelligenceRouter",
5	  "brief": "Today MillingAGIMaster, LatheAGI, WEDMAGI all expose ad-hoc APIs. Standardize them behind a single orchestrate(intent) contract dispatched by ProcessIntelligenceRouterEngine. Wire consensus gating from MS0 + outcome emission from MS1 at the router level so 
... [+6117 chars truncated]

### Assistant | 2026-05-22T16:38:28.701Z

All 5 P0 units shipped (commits confirmed). Flipping the envelope to complete, then running close-out.

### Assistant | 2026-05-22T16:38:30.462Z

[tool_use: Bash]

### User | 2026-05-22T16:38:39.053Z

[tool_result] envelope flipped: status=complete units=P0-U01=complete,P0-U02=complete,P0-U03=complete,P0-U04=complete,P0-U05=complete

### Assistant | 2026-05-22T16:38:42.980Z

[tool_use: Bash]

### User | 2026-05-22T16:39:00.483Z

[tool_result] ok: false
{
 "ok": false,
 "milestone": "INFRA-AGI-ROUTER-MS2",
 "envelope": {
  "path": "H:\\prism\\mcp-server\\data\\milestones\\INFRA-AGI-ROUTER-MS2.json",
  "before": {
   "id": "INFRA-AGI-ROUTER-MS2",
   "status": "complete"
  },
  "after": {
   "id": "INFRA-AGI-ROUTER-MS2",
   "status": "complete",
   "updated_at": "2026-05-22T16:38:52.338Z"
  }
 },
 "roadmapIndex": {
  "path": "H:\\prism\\m
... [+510 chars truncated]

### Assistant | 2026-05-22T16:39:10.581Z

[tool_use: Bash]

### system

... [803 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-23T15:49:24.340Z

[tool_use: Bash]

### User | 2026-05-23T15:50:18.184Z

[tool_result] #!/usr/bin/env node
/**
 * octopus-setup.mjs — operator credential checklist for the octopus (5-LLM
 * consensus) subsystem.
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-C5.
 *
 * Probes the 5 octopus voices and prints a per-voice status checklist with
 * the EXACT next-step command for any voice that is missing or
 * unauthenticated. The companion SessionStart hook
 * `.claude/hooks/octopus-provider-p
... [+1067 chars truncated]

### Assistant | 2026-05-23T15:50:24.305Z

[tool_use: Bash]

### User | 2026-05-23T15:51:13.108Z

[tool_result] {
  "readyCount": 3,
  "totalCount": 5,
  "verdict": "ready",
  "voices": [
    {
      "voice": "anthropic",
      "status": "ready",
      "reason": "this Claude Code session",
      "remediation": ""
    },
    {
      "voice": "codex",
      "status": "missing",
      "reason": "codex CLI present but not authenticated",
      "remediation": "Run `codex login` (interactive OAuth) — re-run this 
... [+530 chars truncated]

### Assistant | 2026-05-23T15:51:28.649Z

**Big finding:** the SessionStart probe banner only reports Codex+Ollama, but the operator CLI (`octopus-setup.mjs`) probes all 5 — and **Gemini is actually ready** (3 voices live, not 2 as the banner claims). The probe hook is undercounting. That's the primary operational gap. Fixing.

### Assistant | 2026-05-23T15:51:30.000Z

[tool_use: Read]

### User | 2026-05-23T15:52:13.050Z

[tool_result] 40	    return null;
41	  }
42	}
43	
44	async function saveCache(payload) {
45	  try {
46	    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
47	    await fs.writeFile(CACHE_FILE, JSON.stringify({ ts: Date.now(), ...payload }, null, 2));
48	  } catch {
49	    // best-effort
50	  }
51	}
52	
53	function runDoctor() {
54	  return new Promise((resolve) => {
55	    let stdout = "";
56	   
... [+4781 chars truncated]

### Assistant | 2026-05-23T15:52:23.287Z

[tool_use: Read]

### User | 2026-05-23T15:52:52.221Z

[tool_result] 180	async function main() {
181	  const cached = await loadCache();
182	  if (cached) {
183	    process.stdout.write(JSON.stringify({ continue: true, additionalContext: cached.banner }));
184	    return;
185	  }
186	
187	  // Fresh probe — run in parallel
188	  const [doctor, ollama, codexAuth] = await Promise.all([
189	    runDoctor(),
190	    checkOllama(),
191	    checkCodexAuth(),
192	  ]);
19
... [+557 chars truncated]

### Assistant | 2026-05-23T15:53:22.036Z

[tool_use: Edit]

### User | 2026-05-23T15:53:59.869Z

[tool_result] The file H:\prism\.claude\hooks\octopus-provider-probe.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-23T15:54:07.867Z

Now wiring the new probe fields into main().

### Assistant | 2026-05-23T15:54:11.639Z

[tool_use: Edit]

### User | 2026-05-23T15:54:40.079Z

[tool_result] The file H:\prism\.claude\hooks\octopus-provider-probe.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-23T15:54:51.077Z

[tool_use: TaskCreate]

### User | 2026-05-23T15:55:15.977Z

[tool_result] Task #7 created successfully: Octopus consolidation — full-fleet operational

### Assistant | 2026-05-23T15:55:21.774Z

[tool_use: Bash]

### User | 2026-05-23T15:55:52.495Z

[tool_result] {"continue":true,"additionalContext":"🐙 Multi-model consensus READY (3/5 voices): Claude(this session) + Ollama(8 models) + Gemini(API key). Missing: Codex, Grok(XAI_API_KEY). Use prism_ai:consensus or set TaskInput.consensus=true."}---cache after---
{
  "ts": 1779551736945,
  "probe": {
    "codex": "missing",
    "ollamaUp": true,
    "ollamaModelCount": 8,
    "xaiKeyPresent": false,
    "gemin
... [+233 chars truncated]

### Assistant | 2026-05-23T15:56:00.116Z

Probe now correctly surfaces 3/5 voices (Claude + Ollama + Gemini ready; Codex + Grok missing). Adding test + committing.

### Assistant | 2026-05-23T15:56:01.590Z

[tool_use: Bash]

### User | 2026-05-23T15:56:39.852Z

[tool_result] /usr/bin/ls: cannot access '.claude/hooks/octopus-provider-probe.test.mjs': No such file or directory
---
no test dir

### Assistant | 2026-05-23T15:57:08.780Z

[tool_use: Write]

### User | 2026-05-23T15:57:52.760Z

[tool_result] File created successfully at: H:\prism\.claude\hooks\octopus-provider-probe.test.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-23T15:58:05.497Z

[tool_use: Bash]

### User | 2026-05-23T15:58:33.414Z

[tool_result] # Subtest: buildBanner: codex 'ok' status counts as ready (back-compat)
ok 9 - buildBanner: codex 'ok' status counts as ready (back-compat)
  ---
  duration_ms: 0.3194
  ...
# Subtest: buildBanner: ollama model count surfaces verbatim
ok 10 - buildBanner: ollama model count surfaces verbatim
  ---
  duration_ms: 0.3711
  ...
# {"continue":true,"additionalContext":"🐙 Multi-model consensus READY (3/
... [+267 chars truncated]

### Assistant | 2026-05-23T15:58:35.708Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

### User | 2026-05-23T16:22:53.105Z

continue

### Assistant | 2026-05-23T16:23:56.655Z

10/10 tests pass. Committing probe fix.

### Assistant | 2026-05-23T16:23:57.883Z

[tool_use: Bash]

### User | 2026-05-23T16:25:16.303Z

[tool_result] /usr/bin/ls: cannot access '.git/index.lock': No such file or directory
---
 M .claude/hooks/octopus-provider-probe.mjs
?? .claude/hooks/octopus-provider-probe.test.mjs
?? mcp-server/data/state/octopus-probe-cache.json

### Assistant | 2026-05-23T16:25:41.459Z

[tool_use: Bash]

### User | 2026-05-23T16:29:51.804Z

[tool_result] Exit code 255
ok 2 files changed, 179 insertions(+), 5 deletions(-)

### Assistant | 2026-05-23T16:29:57.834Z

[tool_use: Bash]

### User | 2026-05-23T16:30:32.121Z

[tool_result] d52611a2f1 [MAIN] [OCTOPUS-CONSOLIDATE]/U-OCT-PROBE-FULL-FLEET (slot:mike): SessionStart banner now mirrors octopus-s...
---staged?---
.../reference_lathe_100pct_wired_2026_05_23.md     | 72 ++++++++++++++++++++++
 1 file changed, 72 insertions(+)

### Assistant | 2026-05-23T16:30:38.960Z

Commit `d52611a2f1` landed. Peer file slipped into stage — unstaging then doing the mike check-in.

### Assistant | 2026-05-23T16:30:41.334Z

[tool_use: Bash]

### User | 2026-05-23T16:31:31.484Z

[tool_result] Exit code 1
---chat-slots mike state---
Traceback (most recent call last):
  File "<string>", line 6, in <module>
    print('  chatId:',m.get('chatId'))
                      ^^^^^
AttributeError: 'NoneType' object has no attribute 'get'
mike slot:

### Assistant | 2026-05-23T16:31:37.873Z

[tool_use: Bash]

### User | 2026-05-23T16:34:57.527Z

[tool_result] {
  "ok": true,
  "slot": "mike",
  "state": {
    "chatId": "claude-e5840fb7",
    "host": "DESKTOP-N7MI1VB",
    "pid": 70936,
    "claimedAt": "2026-05-23T16:34:33.732Z",
    "lastHeartbeat": "2026-05-23T16:34:33.732Z",
    "branch": "cad-fusion-live-ms0",

### Assistant | 2026-05-23T16:35:22.448Z

Mike checked in: slot `mike` · chatId `claude-e5840fb7` · topic `octopus-consolidate` · branch `cad-fusion-live-ms0` · activity `checkin`. (Was momentarily unbound — terminal-pin lapsed during earlier lock churn; now firmly bound.)

§Report — iter-5 close:

| iter | work | commit |
|---|---|---|
| 1-4 | Phase 2BC v2-2/2-3/2-5 + close-out audit atomic-write + TK-MS3 stray hygiene | `5b566b9f89` + Phase 2D doc absorbed into HEAD |
| **5** | **Octopus consolidation start — SessionStart banner now mirrors 5-voice fleet view** | **`d52611a2f1`** |

**Iter-5 finding (R12):** the SessionStart `octopus-provider-probe.mjs` banner was systematically undercounting consensus capacity across the 26-slot fleet. It only ever reported Codex+Ollama+Claude as candidates, even though `scripts/octopus-setup.mjs` (the operator CLI) probes all 5 voices. Today on this machine: CLI says `verdict: ready` with Claude+Ollama+Gemini live; banner said "Consensus partial: Ollama + Claude. Missing: Codex." — hiding the Gemini voice that's been live the whole time.

**Fix shipped:** `buildBanner()` extended to 5 voices (Claude/Codex/Ollama/Grok/Gemini); new `probeEnvKey()` helper checks XAI_API_KEY / GEMINI_API_KEY env. Cache schema forward-compat. 10-case node:test (all pass). Live verification: rm cache + re-probe → emits `🐙 Multi-model consensus READY (3/5 voices): Claude(this session) + Ollama(8 models) + Gemini(API key). Missing: Codex, Grok(XAI_API_KEY).` — matches the CLI verdict.

**Remaining octopus-consolidate work** (iter-6+ queue):
1. **Reap stale `claude-c888968f` octopus loop** (5.03d stale, iter 3/20 frozen 2026-05-18) — original juliett work, peer rolled off.
2. **Wire `prism_ai:consensus` action sanity-check** — verify the runtime engine actually fans to 3 voices when banner says 3/5.
3. **Add `/octopus` skill to user-global at `H:/.claude/commands/`** — currently project-local only; per Phase 2D Decision A, fleet skills should be user-global-canonical (mirrors via c-to-h-mirror).
... [+353 chars truncated]
