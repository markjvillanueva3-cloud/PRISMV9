# OLLAMA FLEET AUDIT -- 2026-06-11
# PRISM Manufacturing Intelligence Platform
# Synthesis of 5 parallel audit slices (inventory / architecture / optimization / failures / wiring)
# All file:line citations verified by direct Read/Grep against H:/prism-slot-india.

---

## Root Cause

Ollama is HEALTHY (200 OK, 1.7ms, 12 models installed, 96GB Blackwell VRAM available).
The problem is NOT a server failure. The problem is UNDER-UTILIZATION caused by a
single architectural gap that propagates through every layer:

  Every hook that classifies a task as "should go to Ollama" emits a TEXT ADVISORY
  into Claude's additionalContext. No hook auto-executes the ask-ollama CLI.
  PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1 is set in live env but is NOT READ by any wired hook.

This advisory-only design means:
  - 671 large-read-digest fires -> 0 auto-offloads (suggest=671, offload=0, keep=0)
  - Adjusted offload rate 23.4% vs >=30% target
  - All "80-95% token savings" figures in hook comments are POTENTIAL, not realized

The fix is narrow: wire ollama-task-offloader.mjs to call ask-ollama.mjs (or spawn it)
when PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1 and the task is in SAFE_AUTOEXEC. Everything else
in this report is secondary to that one missing execution path.

---

## Inventory

### Engines (mcp-server/src/engines/)
| Engine | Status | Evidence |
|--------|--------|----------|
| OllamaCapabilityProbeEngine.ts | WIRED (imported by MultiModelConsensusEngine) | OllamaCapabilityProbeEngine.ts:519 |
| OllamaHookBridgeEngine.ts | WIRED (imported by OllamaCAMIntegrationEngine) | OllamaHookBridgeEngine.ts:431 |
| OllamaTaskOffloaderEngine.ts | DORMANT -- singleton exported, no dispatcher import | OllamaTaskOffloaderEngine.ts:372 |
| OllamaIntegrationEngine.ts | WIRED via model-status skill | OllamaIntegrationEngine.ts |
| OllamaClientEngine.ts | WIRED as base client | dist chunk ref |
| OllamaEmbedderEngine.ts | DORMANT -- no hook or dispatcher wiring found | OllamaEmbedderEngine.ts |
| OllamaContextFloorEngine.ts | DORMANT -- explicitly NOT auto-wired per docstring | OllamaContextFloorEngine.ts:27-28 |
| OllamaCAMIntegrationEngine.ts | DORMANT -- depends on U-CAM117 not yet built | OllamaCAMIntegrationEngine.ts:1-30 |
| LatheLoRAOllamaDeployerEngine.ts | DORMANT -- no dispatcher action or hook wiring | LatheLoRAOllamaDeployerEngine.ts |
| MultiModelConsensusEngine.ts | WIRED -- imports ollamaCapabilityProbeEngine | MultiModelConsensusEngine.ts:38-39 |

Total: 10 engines. 4 wired, 6 dormant.

### Hooks (.claude/hooks/)
Total on disk: ~42 Ollama-touching hooks.
Wired in settings.json: 6.

WIRED:
  ollama-autostart.mjs         SessionStart    -- starts daemon if not running
  ollama-auto-router.mjs       UserPromptSubmit -- routes prompts; uses blocking execSync/curl
  prompt-rewriter-ollama.mjs   UserPromptSubmit -- rewrites prompts; silent no-op on all failures
  ollama-task-offloader.mjs    UserPromptSubmit -- classifies + SUGGESTS; NEVER executes
  claudemd-ollama-enforcer.mjs UserPromptSubmit -- enforces CLAUDE.md routing rules
  ollama-terminal-watcher.mjs  PostToolUse

NOT WIRED (exist on disk, zero settings.json refs, partial list):
  ollama-route-pretooluse.mjs       -- PRISM_OLLAMA_ROUTE_AUTO=1 set in live env, hook UNWIRED
  large-read-digest-advisory.mjs    -- P0 GAP (explains 671-suggest/0-offload telemetry)
  ollama-unified-semantic-router.mjs
  ollama-obsidian-rag.mjs
  ollama-prism-intelligence.mjs
  ollama-reviewer-second-opinion.mjs
  posttool-ollama-offload-nudge.mjs
  posttool-ollama-rewriter-corpus.mjs
  wiki-read-offload-advisory.mjs
  ollama-session-continuity.mjs
  ollama-skill-suggester.mjs
  (and ~24 others)

### Scripts (scripts/)
Key execution scripts:
  ask-ollama.mjs              -- primary CLI; DEFAULT_TIMEOUT_MS=180000; KEEP_ALIVE="10m" hardcoded
  ollama-prism-bridge.mjs     -- agentic harness; wired via /ollama-bridge skill
  ollama-offload-dashboard.mjs -- telemetry viewer; wired via /ollama-route-check
  scripts/lib/ollama-verified-offload.mjs  -- DORMANT keystone; designed for auto-execution but
                                              never called by any wired hook

Key library scripts (dormant as auto-executors):
  scripts/lib/cag-router.mjs         -- pure function, not called from any hook
  scripts/lib/ollama-search-rerank.mjs -- dormant
  scripts/lib/galaxy-reasoning-bridge.mjs -- wired in scripts, not in hooks

### Skills / Commands
  12 user-invocable commands in .claude/commands/
  9 skillOverrides in settings.json:39-48 (ollama-explain, ollama-summarize, etc.)
  CRITICAL: The 9 skillOverride targets have NO backing .md files under .claude/skills/
  (only calc/, de-sloppify/, scrutinize/ exist there -- confirmed by Glob).
  These 9 skills are REGISTERED but CANNOT be invoked.

### Stats / Telemetry
  mcp-server/data/state/ollama-offload-stats.json  -- main tree canonical path
  mcp-server/src/mcp-server/data/state/ollama-offload-stats.json -- slot-india copy
    (slot-india copy: schemaVersion 2.0.0, byHook has only grep-index-first, 0 ollama events,
     lastUpdated 2026-05-31)
  ~100 orphaned .tmp files in mcp-server/data/state/ from failed atomic renames
    (indicates concurrent write contention from 26 slots writing same H:/prism path on Windows)

---

## Architecture and the Sonnet-Fallback Gap

### Live Offload Flow (what actually executes today)

  UserPromptSubmit fires:
    ollama-auto-router.mjs -> execSync curl /api/tags, execSync curl /api/generate (BLOCKING, 8s max)
    prompt-rewriter-ollama.mjs -> fires Ollama rewrite; SILENT NO-OP on every failure path
    ollama-task-offloader.mjs -> classifies task; emits text advisory in additionalContext; STOPS
    claudemd-ollama-enforcer.mjs -> checks CLAUDE.md routing rules; advisory output

  Nothing auto-executes ask-ollama.mjs. Nothing calls executeOffloaded().
  Claude reads advisory text and may (or may not) act on it. Usually does not.

### resolveExecutor() Exists But Is Disconnected

  .claude/hooks/lib/ollama-cost-router.mjs:296 defines resolveExecutor().
  :317-330 returns lane:"claude" when !ollamaAvailable or model===null, with explicit reason string.
  This IS the correct Sonnet fallback path architecturally.

  It is NOT called by:
    - scripts/ask-ollama.mjs (callLocalModel at :578 -- no resolveExecutor call anywhere in file)
    - .claude/hooks/ollama-task-offloader.mjs (ollama-down branch at :491-500 -- silent continue)

  Two wiring points where it SHOULD be called:
    (1) ask-ollama.mjs: after Docker fallback fails (after callDockerModel returns null), call
        resolveExecutor() and if lane=="claude", re-invoke via Anthropic API or emit a
        machine-readable signal to the caller.
    (2) ollama-task-offloader.mjs lines 491-500: replace the silent {continue:true} with a
        resolveExecutor() call that injects "Ollama is down -- you are the fallback for this
        [category] task" into additionalContext.

### Current Fallback Chain (three local tiers, no cloud)

  ask-ollama.mjs callLocalModel():
    Tier 1: Ollama /api/generate
    Tier 2: Docker Models (callDockerModel) -- ONLY for models in DEFAULT_DOCKER_MODEL_MAP
             (qwen2.5-coder:32b -> gemma3, gpt-oss:120b -> gemma3, gpt-oss:20b -> gemma3)
             deepseek-r1:32b, qwen3-coder:30b, all VLMs have NO Docker map entry
    Tier 3: exit code 3 -- DEAD END. No Claude/Sonnet escalation.

  ollama-task-offloader.mjs Ollama-down path:
    Emits {continue:true} with no additionalContext. Claude gets zero signal.

  NIM_FALLBACK_TO_OLLAMA=1 (live env, settings.json:12):
    This is a NIM->vLLM->Ollama local-GPU chain, NOT a Sonnet fallback.
    All three backends are local inference. Confirmed in knowledge/wiki/reference/
    local-llm-routing---ollama-models-loaded-on-this-machine.md:31.

### isGistSafe() Permanently Excludes .md and .json from Auto-Routing

  ollama-route-pretooluse.mjs:71 defines REPORTISH_EXT = {".json",".md",".markdown",".xml",".yaml",".yml"}
  ollama-route-pretooluse.mjs:174 classifies REPORTISH_EXT files as suggest-only (action:"pass").
  All large-read targets (ENGINE_DIGEST.md, MEMORY.md, CLAUDE.md, wiki/index.md) are .md files.
  Result: every large-read of a .md file is PERMANENTLY excluded from auto-routing through
  the pretooluse hook, by design. The hook for these is advisory-only by architecture.

---

## Optimization (Host-Tuned Findings)

### 1. Flat 180s Timeout Does Not Scale With Input Size

  scripts/ask-ollama.mjs:83  DEFAULT_TIMEOUT_MS = 180000
  scripts/ask-ollama.mjs:448 keep_alive: KEEP_ALIVE (hardcoded "10m")

  A 57KB file at 4 chars/token = ~14,250 input tokens. On qwen2.5-coder:32b at ~50 tok/s,
  a cold summarize can take 280s+. The 180s cap fires before completion.
  No timeout scaling by input size, model size, or mode exists in the code.

  Fix direction: compute estimateTokens(content) before the call; scale timeout as
  BASE_MS + tokens * MS_PER_TOKEN. For large inputs, route to gpt-oss:20b (185 tok/s)
  which processes 57KB in <80s within the current cap.

### 2. KEEP_ALIVE Hardcoded to 10m -- Overrides Operator's 30m Env Setting

  scripts/ask-ollama.mjs:72  const KEEP_ALIVE = "10m"
  scripts/ask-ollama.mjs:448 keep_alive: KEEP_ALIVE (passed in every /api/generate body)
  Live env: OLLAMA_KEEP_ALIVE=30m

  Ollama per-request keep_alive overrides the server-side OLLAMA_KEEP_ALIVE env.
  Every ask-ollama call resets warm-hold to 10m regardless of operator intent.
  On this host where gpt-oss:120b cold-loads in ~2min, a 10min idle window causes
  unnecessary cold-loads on the next call.

  Fix: read process.env.OLLAMA_KEEP_ALIVE || "30m" instead of hardcoding "10m".

### 3. OllamaHookBridgeEngine Uses localhost -- IPv6 Resolution Risk on Windows

  OllamaHookBridgeEngine.ts:93  baseUrl: "http://localhost:11434"
  OllamaHookBridgeEngine.ts:108 timeoutMs: 500

  On Windows, localhost commonly resolves to ::1 (IPv6) first; Ollama binds 127.0.0.1.
  This causes ~2s DNS delay before TCP failure, eating the entire 500ms hook budget.
  The fix (hardcode 127.0.0.1) was applied to ollama-task-offloader.mjs:43 and
  confirmed there, but NOT applied to OllamaHookBridgeEngine.ts.
  Every OllamaHookBridgeEngine hook call on this Windows host will always time out.

  Fix: OllamaHookBridgeEngine.ts:93 change default to "http://127.0.0.1:11434".

### 4. gpt-oss:120b (65GB) Can Co-Reside With 32b+20b -- Exceeds 96GB Effective VRAM

  ollama-cost-router.mjs TIER_PREFERENCES: best=gpt-oss:120b (65GB), strong=gpt-oss:20b (14GB),
  default floor=qwen2.5-coder:32b (20GB).
  OLLAMA_MAX_LOADED_MODELS=4, OLLAMA_GPU_OVERHEAD=2GB -> effective VRAM = 94GB.
  Three concurrent tasks at three tiers: 65+14+20=99GB > 94GB effective ceiling.
  routeModelForTask() has no awareness of currently-loaded models or VRAM budget.
  It only checks whether a model name appears in the /api/tags list.

  Fix: call OllamaCapabilityProbeEngine.getBestLocalModel() (already VRAM-aware via nvidia-smi
  + /api/ps) instead of raw routeModelForTask() for tier selection.

### 5. num_predict=1024 Cap Can Truncate gpt-oss:120b Reasoning Chains

  scripts/ask-ollama.mjs:81 DEFAULT_NUM_PREDICT=1024
  gpt-oss:120b uses a harmony-format thinking channel that may consume 600-800 tokens
  before the response channel starts. For summarize mode requesting 8 dense sentences,
  1024 may not be sufficient. OllamaHookBridgeEngine.ts:109 maxTokens=100 (correct for
  suggest/classify, would silently truncate any synthesis task routed through it).

  Fix: mode-specific num_predict: summarize/explain -> 2048, classify/suggest -> 512.

### 6. Balanced Tier Is Intentionally Empty on This Host -- Silent Escalation

  ollama-cost-router.mjs:36-47 balanced tier = ['qwen2.5:7b','codellama:7b','deepseek-coder:6.7b']
  Comment at :37-43 explicitly states these are all retired/not installed on Blackwell host.
  Any balanced task (summary, documentation, git_summary, search_synthesis) silently
  escalates to strong (gpt-oss:20b) or best (gpt-oss:120b).
  If both are also unavailable, routeModelForTask:228-233 returns {model:av[0], tier:'fallback'}
  which could be nomic-embed-text (an embedding model, cannot generate text).
  The offloader does not check for tier='fallback' before building the directive.

### 7. host detection failure silently downgrades search_synthesis to gpt-oss:20b

  ollama-cost-router.mjs:110 maps search_synthesis to "balanced".
  Blackwell promotion fires ONLY when detectHostClass() returns "home_blackwell".
  detectHostClass() reads golf's fleet-reaper-host-presets.json; returns null on
  unknown host (host-class.mjs:70). When null, balanced->strong escalation happens
  without the Blackwell-specific promotion to best tier.
  No PRISM_HARDWARE_PROFILE env-override fallback exists in the default path.

---

## Failure Modes (Silent Ones)

### FM-1 (P0): Advisory-Only Pipeline -- 671 Large-Read Suggestions, 0 Auto-Offloads

  large-read-digest-advisory.mjs:11-13: "does NOT block the Read. It advises"
  ollama-task-offloader.mjs:376-426: SAFE_AUTOEXEC emits text string directive only
  PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1 in live env is NOT read by any wired hook.
  Result: every suggestion depends on Claude choosing to run the command next turn.
  Empirical result: it does not. 671 fires, 0 executions.

### FM-2 (P0): Ollama-Down Silent Skip in Offloader -- Zero Signal to Claude

  ollama-task-offloader.mjs:491-500: when isOllamaAvailable returns {available:false},
  records telemetry event mode:"ollama-down" then emits {continue:true} with NO
  additionalContext. Claude gets zero signal that Ollama was unreachable.
  Every offloadable task silently stays on Claude with no escalation signal.

### FM-3 (P1): prompt-rewriter Silent No-Op on All Failure Paths

  prompt-rewriter-ollama.mjs:17: "BLOCKING: never -- silent no-op on every failure path"
  :23-30: All failure conditions (unreachable, no model loaded, timeout, low confidence,
  prompt too short, invalid JSON) exit(0) with only a writeLog entry.
  Log path H:/prism/.claude/cache/prompt-rewrites.jsonl is not surfaced to dashboards.
  Root cause was IPv6/localhost bug (fixed 2026-06-09 per :56). LOADED_MODEL_ONLY=1
  default means any prompt arriving when no chat model is GPU-resident silently skips.

### FM-4 (P1): Timeout at 180s With No Scaling -- Large Inputs Always Fail

  Described in Optimization section. Docker fallback is gated on DEFAULT_DOCKER_MODEL_MAP;
  models not in the map (deepseek-r1:32b, qwen3-coder:30b, all VLMs) exit code 3 immediately.
  No Sonnet escalation on exit code 3.

### FM-5 (P2): Rate-Limit State Hardcoded to H:/prism -- Breaks in Worktrees

  ollama-task-offloader.mjs:44 STATS_PATH = "H:/prism/mcp-server/data/state/ollama-offload-stats.json"
  :46 RATE_LIMIT_PATH = "H:/prism/mcp-server/data/state/ollama-rate-limits.json"
  :54 HINT_PATH = "H:/prism/state/shared/.ollama-routing-hint.json"
  saveRateLimits() catch block at :185-189 is "/* ignore */" -- silent on write failure.
  Worktree slots (e.g. this slot: india, running from H:/prism-slot-india) cannot share
  rate-limit state with main tree and see absent rate limits.
  ~100 leaked .tmp files in mcp-server/data/state/ confirm repeated atomic rename failures
  from concurrent writes by multiple slots.

### FM-6 (P2): model=null From routeModelForTask Produces Malformed Directive

  When routeModelForTask returns {model:null, tier:'none'} (empty /api/tags roster),
  ollama-task-offloader.mjs:519 assigns null to model unconditionally.
  buildOffloadDirective is called with model=null, producing "node scripts/ask-ollama.mjs
  summarize --model null <file>" injected into Claude's context. No guard at :519.

### FM-7 (P2): Cost-Router Fallback Tier Can Select nomic-embed-text (Generation-Incapable)

  ollama-cost-router.mjs:228-233: if no model matches balanced/strong/best tiers,
  falls back to av[0] (first model in /api/tags list). nomic-embed-text is installed
  and could appear as av[0]. nomic-embed-text cannot generate text; it only produces
  embeddings. A generation call routed to it will produce empty or garbage output.

### FM-8 (P2): Concurrent Slot Writes to Shared Stats File -- NTFS Rename Contention

  26-slot fleet all write to the same H:/prism absolute stats path using writeFileSync
  + renameSync (wiki-read-offload-advisory.mjs:100-121). On Windows/NTFS, rename over
  an existing file held by another process fails. ~100 leaked .tmp files are the evidence.
  Stats are therefore inaccurate -- writes that fail silently are not counted.

---

## Fleet-Wide Wiring (WIRED / GAP Table)

| Surface | Status | Notes |
|---------|--------|-------|
| UserPromptSubmit auto-classification | WIRED (advisory only) | ollama-task-offloader.mjs fires but suggests, never executes |
| UserPromptSubmit auto-execution | GAP | PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1 has no code path reading it in wired hooks |
| Large-read auto-digest | GAP | large-read-digest-advisory.mjs NOT in settings.json; explains 671/0 anomaly |
| PreToolUse:Read file offload | WIRED (advisory only) | ollama-route-pretooluse.mjs wired but .md/.json permanently excluded by isGistSafe() |
| PRISM_OLLAMA_ROUTE_AUTO=1 hook | GAP | ollama-route-pretooluse.mjs reads this env var but is NOT in settings.json |
| Sonnet/Claude fallback on Ollama down | GAP | resolveExecutor() exists in ollama-cost-router.mjs:296 but is never called from any wired path |
| Docker Models fallback | PARTIAL | Only 3 models in DEFAULT_DOCKER_MODEL_MAP; all others skip to exit code 3 |
| OllamaCapabilityProbeEngine (VRAM-aware routing) | GAP | Exists and correct; ask-ollama and offloader use raw routeModelForTask() instead |
| Stop hook Obsidian memory extract | WIRED | stop-obsidian-memory-extract.mjs:24 imports callOllama; correctly wired |
| Stop hook vault embed (nomic) | GAP | Vault writes are not followed by nomic embedding; dense recall arm never sees new memories |
| nomic-embed-text keepalive | GAP | ollama-embed-keepalive.mjs depends on Windows Task Scheduler; NOT in settings.json hooks |
| Galaxy reasoning bridge | PARTIAL | galaxy-reasoning-bridge.mjs is wired in scripts, not in any hook; no per-prompt auto-fire |
| Hermes/Zulu orchestration engines | GAP | Zero Ollama calls in any Hermes/Zulu .ts engine; orchestration layer entirely unwired |
| 9 ollama-* skillOverrides | GAP | Registered in settings.json:39-48 but NO backing .md files under .claude/skills/ |
| /ollama-bridge skill default model | STALE | .claude/commands/ollama-bridge.md:47 defaults to retired qwen2.5-coder:3b tag |
| 26-slot per-slot routing differentiation | GAP | All 26 slots receive identical 4-hook Ollama chain; no slot-aware or galaxy-aware routing |
| PostToolUse Ollama coverage | MINIMAL | Only ollama-terminal-watcher.mjs wired at PostToolUse; posttool-ollama-offload-nudge.mjs unwired |
| ollama-auto-router blocking execSync | RISK | Fires blocking curl/generate on every UserPromptSubmit; up to 8s block per slot |

---

## Ranked Fix Plan

### P0-1: Wire PRISM_OLLAMA_OFFLOAD_AUTOEXEC into ollama-task-offloader.mjs (the core gap)
  File: .claude/hooks/ollama-task-offloader.mjs:376-426
  Change: When PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1 AND category is in SAFE_AUTOEXEC AND hasFileTarget,
  call scripts/lib/ollama-verified-offload.mjs verifiedOffload() (or spawn ask-ollama.mjs directly)
  instead of only emitting a text directive. The verified-offload keystone at
  scripts/lib/ollama-verified-offload.mjs:3-9 was built exactly for this -- "distinct from the ~20
  existing ollama hooks which SUGGEST/advise... this is verified auto-EXECUTION" -- but is never
  called by any wired hook. Wire it.
  Expected result: 671 large-read tasks per cycle become actual offloads, not suggestions.
  Effort: M. Fleet-wide: YES.

### P0-2: Wire ollama-route-pretooluse.mjs into settings.json (PRISM_OLLAMA_ROUTE_AUTO=1 is live)
  File: .claude/settings.json (add PreToolUse:Read entry)
  Change: Add ollama-route-pretooluse.mjs to the PreToolUse:Read hook group (alongside or inside
  read-bundle.mjs). The env var PRISM_OLLAMA_ROUTE_AUTO=1 is already live and the hook reads it,
  but the hook itself never fires because it is absent from settings.json. Also confirm
  read-bundle.mjs:11-26 READ_HOOKS array includes it.
  Effort: S. Fleet-wide: YES.

### P0-3: Wire Sonnet fallback via resolveExecutor() at two call sites
  Files:
    scripts/ask-ollama.mjs -- after callDockerModel returns null, before exit code 3:
      call resolveExecutor() from .claude/hooks/lib/ollama-cost-router.mjs; if lane=="claude",
      emit JSON hint {lane:"claude", reason:...} on stdout so the caller can escalate.
    .claude/hooks/ollama-task-offloader.mjs:491-500 -- replace {continue:true} with:
      resolveExecutor() call; inject additionalContext "Ollama is down -- you are the fallback
      for this [category] task -- treat with extra care".
  resolveExecutor() already has the correct logic at ollama-cost-router.mjs:317-330. No new
  routing code needed. Both call sites simply need to invoke it.
  Effort: M. Fleet-wide: YES.

### P1-4: Fix ask-ollama.mjs KEEP_ALIVE to honor OLLAMA_KEEP_ALIVE env
  File: scripts/ask-ollama.mjs:72
  Change: const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "30m"
  (remove hardcoded "10m" which overrides the operator's 30m server-side setting on every call)
  Effort: S. Fleet-wide: YES.

### P1-5: Scale ask-ollama.mjs timeout with estimated input size
  File: scripts/ask-ollama.mjs:83 and callOllama call site
  Change: compute estimatedTokens = Math.ceil(contentBytes / 3.5); scale timeoutMs as
  Math.max(DEFAULT_TIMEOUT_MS, estimatedTokens * 6 + 30000). For 57KB input this yields
  ~84s + 30s = 114s (within 180s). For 256KB (MAX_FILE_BYTES) this yields ~430s. Also
  route large-input tasks to gpt-oss:20b (185 tok/s) when size > 30KB.
  Effort: M. Fleet-wide: YES.

### P1-6: Fix OllamaHookBridgeEngine.ts localhost to 127.0.0.1
  File: mcp-server/src/engines/OllamaHookBridgeEngine.ts:93
  Change: baseUrl: "http://127.0.0.1:11434"
  The IPv6 resolution risk on Windows causes the 500ms hook budget to always be exceeded,
  making every OllamaHookBridgeEngine query silently fail via resolveInstalledModel fallback.
  The fix was already applied in ollama-task-offloader.mjs:43 -- apply the same pattern here.
  Effort: S. Fleet-wide: YES.

### P1-7: Wire VRAM-aware routing via OllamaCapabilityProbeEngine.getBestLocalModel()
  Files: scripts/ask-ollama.mjs callLocalModel, .claude/hooks/ollama-task-offloader.mjs:513-519
  Change: replace direct routeModelForTask() call with OllamaCapabilityProbeEngine.getBestLocalModel()
  (or at minimum, filter the result of routeModelForTask through the probe's current VRAM
  budget check). OllamaCapabilityProbeEngine:207-311 already queries nvidia-smi and /api/ps
  and computes free VRAM correctly. This prevents 120b+32b+20b co-selection (99GB > 94GB).
  Effort: M. Fleet-wide: YES.

### P1-8: Create the 9 missing ollama-* skill .md files under .claude/skills/
  Files: .claude/skills/ollama-{explain,summarize,docstring,classify,diff-summary,
         error-triage,extract,test-stub,boilerplate}/ (9 directories, each with a skill .md)
  Context: .claude/settings.json:39-48 registers 9 skillOverrides; .claude/skills/ has only
  calc/, de-sloppify/, scrutinize/ -- none of the 9 targets exist. The skills are unreachable.
  These are the primary user-facing entry points for Ollama offload.
  Effort: M. Fleet-wide: YES.

### P1-9: Fix stale model reference in /ollama-bridge skill
  File: .claude/commands/ollama-bridge.md:47
  Change: update default from retired "qwen2.5-coder:3b" to "qwen2.5-coder:32b".
  Also update mistral:7b reference (also retired). Align with installed model list from LIVE FACTS.
  Effort: S. Fleet-wide: NO (one skill file).

### P2-10: Add nomic-embed-text incremental embed on vault write (auto-wire Stop path)
  Files: .claude/hooks/stop-obsidian-memory-extract.mjs (after vault write), or a new
  PostToolUse hook on Write events to knowledge/wiki/ and knowledge/memories/
  Change: after writing a new vault file, call nomic-embed-text via ask-ollama.mjs
  embed mode or scripts/populate-qdrant-memories.mjs --incremental <path>. Without this,
  newly written vault memories are never indexed into Qdrant and the dense recall arm
  (ollama-obsidian-rag.mjs) never finds them.
  Effort: M. Fleet-wide: YES.

### P2-11: Guard against nomic-embed-text being selected as generation model
  File: .claude/hooks/lib/ollama-cost-router.mjs:228-233 (fallback to av[0])
  Change: filter av (available models list) to exclude embedding-only models before the
  fallback selection. Add a static EMBED_ONLY_MODELS = new Set(["nomic-embed-text"]) and
  apply it in the fallback tier: av.filter(m => !EMBED_ONLY_MODELS.has(m))[0] || null.
  If result is null, return lane:"claude" (no generation model available).
  Also add model=null guard at ollama-task-offloader.mjs:519 before buildOffloadDirective.
  Effort: S. Fleet-wide: YES.

### P2-12: Fix atomic rename contention for shared stats file (26-slot fleet)
  Files: .claude/hooks/ollama-task-offloader.mjs:157-162 (stats writer)
         wiki-read-offload-advisory.mjs:100-121 (stats writer)
  Change: use a per-slot stats shard file (e.g. ollama-offload-stats-<slot>.json) written
  by each slot independently, then merge on dashboard read via ollama-offload-dashboard.mjs.
  Alternatively, use a JSONL append (no rename needed; append is atomic on Windows at small
  writes) and aggregate on read. Either approach eliminates the NTFS rename contention that
  produced ~100 leaked .tmp files.
  Also clean up existing .tmp files: del H:/prism/mcp-server/data/state/ollama-offload-stats.json.*.tmp
  Effort: M. Fleet-wide: YES.

### P3-13: ollama-auto-router: replace blocking execSync curl with async fetch
  File: .claude/hooks/ollama-auto-router.mjs:96-99 and :136-145
  Change: replace both execSync('curl ...') calls with async fetch() using AbortController
  at OLLAMA_TIMEOUT (currently 8s). The synchronous block delays the entire
  UserPromptSubmit chain for up to 8s on every prompt for all 26 slots. A non-blocking
  async approach lets other hooks fire concurrently.
  Effort: M. Fleet-wide: YES.

### P3-14: Wire large-read-digest-advisory.mjs into read-bundle or settings.json
  File: .claude/hooks/bundles/read-bundle.mjs:11-26 (READ_HOOKS array)
  Change: add large-read-digest-advisory.mjs to the READ_HOOKS array so it fires on
  PreToolUse:Read events. This is separate from P0-1 (which fixes the execution gap);
  this fix ensures the hook fires at all. With P0-1 done first, wiring this hook
  means the auto-execution path will activate for all large-read events.
  Note: the telemetry counter of 671 fires exists because the hook was previously wired
  (or shares a stats key with another hook). Confirm whether the counter is genuine
  before treating this as a net-new wiring.
  Effort: S. Fleet-wide: YES.

---

## Summary Priority Stack

  P0 (do first -- unlocks the core utilization gap):
    P0-1: Wire PRISM_OLLAMA_OFFLOAD_AUTOEXEC execution path in offloader (the root gap)
    P0-2: Wire ollama-route-pretooluse.mjs into settings.json
    P0-3: Wire resolveExecutor() Sonnet fallback at 2 call sites

  P1 (high ROI, low risk, most are S-effort):
    P1-4: Fix KEEP_ALIVE to read env (1-line change)
    P1-5: Scale timeout with input size
    P1-6: Fix OllamaHookBridgeEngine localhost -> 127.0.0.1 (1-line change)
    P1-7: VRAM-aware routing via OllamaCapabilityProbeEngine
    P1-8: Create 9 missing skill .md files
    P1-9: Fix stale model ref in /ollama-bridge

  P2 (important but not blocking utilization improvement):
    P2-10: Auto-embed vault writes into Qdrant via nomic
    P2-11: Guard embed-model from generation selection
    P2-12: Fix stats file rename contention

  P3 (quality / hygiene):
    P3-13: Async-ify ollama-auto-router
    P3-14: Wire large-read-digest-advisory into read-bundle

---
Generated: 2026-06-11 by synthesis agent (slot:india)
Source slices: inventory / architecture / optimization / failures / wiring
Verified claims only -- all file:line citations confirmed by direct Read/Grep.

---

## SHIPPED 2026-06-11 (slot:india) -- execution log

SHIPPED (india-doable, all tested + committed to cad-fusion-live-ms0):
- P1-4 keep_alive: ask-ollama KEEP_ALIVE 10m -> OLLAMA_KEEP_ALIVE||30m. Commit e5f29a5df5.
  (Finding: interactive shells carry a STALE OLLAMA_KEEP_ALIVE=10m while the live
   server env is 30m -- env not uniformly propagated; infra-hygiene note for golf.)
- P0-3 Sonnet fallback: ask-ollama buildFallbackSignal() at both generation-failure
  sites (exit 3 preserved; human directive OR {lane:"claude"} JSON on --json, which
  previously emitted an UNPARSEABLE error string). trigger-command-pipeline runStep
  now CONSUMES it (clean reason + propagates fallback:"claude" through the pipeline).
  Commit 28ec933a0a. 2-reviewer (code-reviewer + silent-failure-hunter) PASS.
- P1-6 Windows IPv6: OllamaHookBridgeEngine baseUrl localhost -> OLLAMA_URL||127.0.0.1.
  Commit 28ec933a0a.
- BONUS (pre-existing drift caught by the 2-reviewer pass): command-ollama-routes
  OLLAMA_MODES was missing `rerank` -> drift test red on HEAD + the rerank offload
  route unrepresentable. Added. Commit 28ec933a0a.
- P1-5 input-size-scaled timeout (FM-4): scaleTimeoutForBytes() -- file modes scale
  to content size (57KB now gets 234s, was killed at 180s); explicit --timeout wins;
  600s ceiling. Commit 7521518fcf. Tests: ask-ollama 84/84.

MOOT (audit cited a stale snapshot, verified resolved 2026-06-11):
- P1-9 stale /ollama-bridge model: the skill no longer hardcodes any model tag
  (host-aware via ollama-prism-bridge.mjs). No fix needed.

BLOCKED from the india worktree (cross-worktree firewall hard-blocks .claude/hooks/*.mjs
+ settings.json -- needs a MAIN-TREE chat or a logged PRISM_CROSS_WORKTREE_BYPASS=1):
- P0-2 wire ollama-route-pretooluse.mjs into settings.json (PRISM_OLLAMA_ROUTE_AUTO=1
  is live but the hook is absent from settings.json -> never fires).
- P0-3 site 1: offloader ollama-down branch (491-502) silent {continue:true} ->
  inject a "you are the fallback" additionalContext via resolveExecutor() (FM-2).
- P3-13 async-ify ollama-auto-router blocking execSync.
- P2-10 nomic incremental vault-embed on Stop (Stop hook).

DELIBERATELY NOT DONE (R12 -- the audit's framing fights a sound design):
- P0-1 auto-exec in the UserPromptSubmit offloader. The offloader author's R12
  decision (ollama-task-offloader.mjs:370-375) is CORRECT: a UserPromptSubmit hook
  sees only the prompt text, never the file the task targets, and a synchronous
  Ollama call would add up to 180s latency to EVERY qualifying prompt fleet-wide.
  Forcing inline blocking auto-exec there is a fleet-wide latency regression, and
  the SAFE_AUTOEXEC categories (explain/summarize) are exactly the SLOW ones.
  CORRECT alternative (separate unit): wire verifiedOffload at PreToolUse:Read,
  gated to NON-edit reads only (summarizing a file Claude must edit/cite-exactly is
  wrong) -- that hook has the concrete file target AND is bounded to one tool call.

NEXT (operator decision): the remaining "full auto-utilization fleet-wide" work is
the harness wiring above. It requires a main-tree chat (or operator approval to use
the logged PRISM_CROSS_WORKTREE_BYPASS=1 from india). The Sonnet-fallback substrate
(verifiedOffload + resolveExecutor + ask-ollama {lane:"claude"} signal) is BUILT and
ready for those consumers to call.
