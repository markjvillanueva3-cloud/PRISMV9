---
milestone: HOOKS-AUTOMATION-V2-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
research_source: state/shared/research/2026-05-10-pass2-hooks-automation.md
total_units: 10
critical_path_role: cross-cut into HOOK-SYNERGY-MS0; Claude Code 2.1.89 ships 31 hook events + `defer` + `if` + agent-scoped
loop_registrations: 1 (PostToolBatch budget weekly)
date: 2026-05-10
---

# HOOKS-AUTOMATION-V2-MS0 — atomized

> Claude Code 2.1.89 expanded the hook API from 12 events → 31. PRISM has 480+ hooks but mostly on the old surface. Folding new patterns: `defer` decision, `PermissionDenied{retry:true}`, conditional `if` field, agent-scoped hooks, official hookify plugin loader.

---

## U-HKA01 — Read-once PreToolUse dedup hook

- pillar: hooks-v2
- tier: T0
- ai_priority_score: 85
- leverage_score: 14
- why: ~40% of agent file reads are re-reads of files already in context this session
- depends_on: []
- blocks: []
- parallel_with: [U-HKA02, U-HKA03, U-HKA04]
- viz_node_id: `core.hooks.readonceguard` (TBD-create)
- closes_synergy_edge: hooks × token-economy
- loop_schedule: none

verifies_via:
  channel: metric
  tool: sample 1h session — count Read tool calls before/after
  expected_signal: ≥30% reduction in Read calls
  re_run_cost: 60min observation
  baseline: file-read count from current telemetry

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/read-once-guard.mjs`
      action: PreToolUse on Read — maintain in-process Set of (file, mtime); if exists, return `{decision:"deny",message:"Already read 5min ago"}`
      verify: hook runs
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook on PreToolUse with `matcher:"Read"`
      verify: parse clean
  - step-3:
      tool: Write
      path: `.claude/hooks/__tests__/read-once-guard.test.mjs`
      action: 5 tests — first read passes, second denied, mtime changed allows, oversized cache eviction, edge: directory read
      verify: 5 passed

adversarial_cases:
  - file mtime in future (clock skew)
  - rapid edit-read cycle (must allow if mtime changed)

variability_axis:
  - same-file / same-content-different-path / same-path-different-mtime
  - 1 / 100 / 10000 reads/hour

failure_modes:
  - false positive → escape hatch via `Read {force:true}` parameter
  - cache memory bloat → LRU eviction at 1000 entries
  - mtime corrupted → recompute hash secondary

---

## U-HKA02 — `defer` PreToolUse decision for autonomous loops

- pillar: hooks-v2
- tier: T0
- ai_priority_score: 80
- leverage_score: 13
- why: Boris doctrine — autonomous loops without defer become $6k-incidents; defer makes Claude wait for human
- depends_on: []
- blocks: []
- parallel_with: [U-HKA01, U-HKA03]
- viz_node_id: `core.hooks.autonomousloopdefer` (TBD-create)
- closes_synergy_edge: hooks × safety
- loop_schedule: none

verifies_via:
  channel: integration
  tool: mock 1000-iteration loop → assert defer fires at iter 50
  expected_signal: tool blocked with `decision:"defer"` + cooldown
  re_run_cost: 2min
  baseline: no defer support

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/autonomous-loop-defer.mjs`
      action: PreToolUse — track tool-fire-rate per session; if > 50 in 5min, return `{decision:"defer",retry_after:300}`
      verify: hook runs
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register on PreToolUse, all matchers
      verify: parse clean
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: smoke test — burst 60 reads → 51st should defer
      verify: deferral observed in telemetry

adversarial_cases:
  - benign high-volume work (CI sweep)
  - adversarial: agent learns to space out calls to evade

variability_axis:
  - 10 / 50 / 200 calls/min thresholds
  - per-tool / per-agent / global scope

failure_modes:
  - false-defer on legitimate batch → maintainer escape hatch
  - rate-window overflow → reset on session boundary
  - defer ignored by client → escalate to Stop

---

## U-HKA03 — `PermissionDenied{retry:true}` classifier

- pillar: hooks-v2
- tier: T1
- ai_priority_score: 75
- leverage_score: 12
- why: Claude Code 2.1.89 returns structured PermissionDenied; classifier auto-adjusts args and retries cheaply
- depends_on: []
- blocks: []
- parallel_with: [U-HKA01, U-HKA02, U-HKA04]
- viz_node_id: `core.hooks.permissiondeniedretry` (TBD-create)
- closes_synergy_edge: hooks × dispatchers
- loop_schedule: none

verifies_via:
  channel: integration
  tool: deny tool call → assert retry with adjusted args succeeds
  expected_signal: 2nd-attempt success rate ≥ 60%
  re_run_cost: 5min
  baseline: 0% (no retry)

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/permission-denied-retry.mjs`
      action: PostToolUse on denied → classify reason → adjust args → emit retry hint
      verify: hook runs
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register on PermissionDenied event
      verify: parse clean
  - step-3:
      tool: Write
      path: `.claude/hooks/__tests__/permission-denied-retry.test.mjs`
      action: 5 tests — path-escape denied (adjust path), shell-special-char (escape), oversized (split), unknown (no retry), already-retried (no double)
      verify: 5 passed

adversarial_cases:
  - infinite retry loop (must cap)
  - retry succeeds with unintended escalation

variability_axis:
  - Bash / Edit / Write / Read denials
  - first / second / third retry

failure_modes:
  - retry cap at 2 → escalate to user
  - classify-fail → don't retry (safe default)
  - retry-storm → defer

---

## U-HKA04 — Ollama-route PreToolUse (route trivial reads to qwen)

- pillar: hooks-v2
- tier: T1
- ai_priority_score: 72
- leverage_score: 12
- why: 100 trivial Read calls don't need Claude; route to local qwen2.5-coder for token savings
- depends_on: []
- blocks: []
- parallel_with: [U-HKA01, U-HKA02, U-HKA03]
- viz_node_id: `core.hooks.ollamaroute` (already exists per memory, harden)
- closes_synergy_edge: hooks × ollama
- loop_schedule: none

verifies_via:
  channel: metric
  tool: 100-read sample → count Ollama vs Claude routing
  expected_signal: ≥80% routed to Ollama for "summarize" / "classify" tasks
  re_run_cost: 5min
  baseline: per existing offload-stats.json

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/engines/OllamaHookBridgeEngine.ts`
      action: pattern reference (already exists)
      verify: file readable
  - step-2:
      tool: Edit
      path: `.claude/hooks/ollama-route-pretooluse.mjs`
      action: classify tool intent (read+summarize / read+classify → Ollama); fall back to Claude on Ollama fail
      verify: hook runs
  - step-3:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook
      verify: parse clean
  - step-4:
      tool: Write
      path: `.claude/hooks/__tests__/ollama-route-pretooluse.test.mjs`
      action: 5 tests — summarize routed, classify routed, complex-reasoning kept, ollama-down fallback, timeout fallback
      verify: 5 passed

adversarial_cases:
  - prompt-injection causes Ollama to escalate to Claude
  - Ollama OOM mid-stream

variability_axis:
  - qwen2.5-coder / llama3.2 / embeddings models
  - 1 / 100 / 10000 calls/hour

failure_modes:
  - Ollama unreachable → log + fallback to Claude
  - response quality degrades → opt-out per task
  - rate-limit → cascade to next-cheapest

---

## U-HKA05 — Agent-scoped Stop verifier hook

- pillar: hooks-v2
- tier: T1
- ai_priority_score: 68
- leverage_score: 11
- why: 2.1.89 supports per-agent hooks; subagent stop should verify its claimed deliverables
- depends_on: []
- blocks: []
- parallel_with: [U-HKA06, U-HKA07]
- viz_node_id: `core.hooks.subagentstopverifier` (TBD-create)
- closes_synergy_edge: hooks × subagents
- loop_schedule: none

verifies_via:
  channel: integration
  tool: subagent claims "wrote X" → verifier hook checks file exists
  expected_signal: false-claim flagged + parent chat alerted
  re_run_cost: 5s per subagent stop
  baseline: no verification

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/subagent-stop-verifier.mjs`
      action: parse subagent summary, extract file claims, ls each, alarm on missing
      verify: hook runs
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register on SubagentStop (2.1.89 event)
      verify: parse clean

adversarial_cases:
  - subagent claim in non-standard format
  - file written then immediately deleted

variability_axis:
  - 1 / 5 / 20 claimed files per subagent

failure_modes:
  - claim-parse fail → pass-through (don't false-flag)
  - subagent stops mid-write → grace period 30s
  - parent chat unavailable → log to telemetry

---

## U-HKA06 — Install official `hookify` plugin alongside local hooks

- pillar: hooks-v2
- tier: T1
- ai_priority_score: 65
- leverage_score: 11
- why: 25 local `.claude/hookify.*.local.md` exist but no official loader; hookify standardizes the markdown-rule pattern
- depends_on: []
- blocks: []
- parallel_with: [U-HKA05, U-HKA07]
- viz_node_id: `core.plugin.hookify` (TBD-add to viz)
- closes_synergy_edge: hooks × external-tooling
- loop_schedule: none

verifies_via:
  channel: integration
  tool: invoke a hookify rule → assert loader picks it up
  expected_signal: rule fires
  re_run_cost: 30s
  baseline: rules exist but unloaded

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/.claude/plugins/`
      action: confirm not installed
      verify: `ls H:/.claude/plugins/hookify 2>&1` → "No such file"
  - step-2:
      tool: Bash
      path: `H:/.claude/plugins/`
      action: install hookify per anthropic docs (clone or marketplace install)
      verify: `ls H:/.claude/plugins/hookify` exists
  - step-3:
      tool: Edit
      path: `.claude/settings.json`
      action: register hookify in `plugins` block
      verify: parse clean
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: smoke test — modify one `.claude/hookify.block-*.local.md` → verify enforcement
      verify: rule fires on matching action

adversarial_cases:
  - hookify version conflict with existing hooks
  - hookify download interrupted

variability_axis:
  - block / warn / suggest hookify rule types

failure_modes:
  - install fail → manual local fallback
  - rule-conflict → priority order documented
  - hookify update breaks → pin version

---

## U-HKA07 — HTTP-type hook to system-viz live update

- pillar: hooks-v2
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: 2.1.89 supports `type:"http"` hooks; tool fire → system-viz reloads in <1s
- depends_on: [U-GAC01 from GRAPH-AS-LLM-CONTEXT-MS0]
- blocks: []
- parallel_with: [U-HKA05, U-HKA06, U-HKA08]
- viz_node_id: `core.hooks.systemvizlivebridge` (TBD-create)
- closes_synergy_edge: hooks × system-viz
- loop_schedule: none

verifies_via:
  channel: integration
  tool: trigger Edit → measure system-viz refresh time
  expected_signal: viz updates within 1s
  re_run_cost: 5s
  baseline: viz refresh requires manual regen

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/system-viz-live-bridge.json`
      action: HTTP hook config — POST to `http://localhost:8765/api/refresh` on Edit/Write
      verify: file exists, valid JSON
  - step-2:
      tool: Edit
      path: `state/shared/system-viz/_server.cjs`
      action: add `/api/refresh` endpoint (peer-claimed; coordinate first)
      verify: NOTE — peer chat owns this file; defer to chat-bus coordination
  - step-3:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook
      verify: parse clean

adversarial_cases:
  - viz server down → 200ms timeout
  - 1000 edits/sec → debounce

variability_axis:
  - Edit / Write / MultiEdit triggers

failure_modes:
  - viz server unreachable → log + continue (don't block)
  - refresh-storm → debounce 500ms
  - port conflict → fallback port

---

## U-HKA08 — MCP-tool-type safety bridge

- pillar: hooks-v2
- tier: T1
- ai_priority_score: 55
- leverage_score: 10
- why: 2.1.89 `type:"mcp_tool"` hooks let safety validators run as MCP actions
- depends_on: []
- blocks: []
- parallel_with: [U-HKA07, U-HKA09]
- viz_node_id: `core.hooks.mcpsafetybridge` (TBD-create)
- closes_synergy_edge: hooks × safety
- loop_schedule: none

verifies_via:
  channel: integration
  tool: physics-constants edit → MCP safety action runs
  expected_signal: `prism_safety:validate_physics` invoked, result respected
  re_run_cost: 5s
  baseline: safety checked separately

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/mcp-safety-bridge.json`
      action: MCP hook config — on Edit of `physics/constants.ts`, call `prism_safety:validate_physics`
      verify: file exists
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook
      verify: parse clean

adversarial_cases:
  - safety endpoint slow → 5s timeout
  - bypass via Write (non-Edit) → catch with Write matcher too

variability_axis:
  - physics / Kienzle / Taylor / canonical-constants targets

failure_modes:
  - safety endpoint down → soft-warn (don't hard-block; user choice)
  - mcp tool error → log + fallthrough
  - false-positive on test files → maintainer override

---

## U-HKA09 — TaskCreated claim guard (deny duplicate creation)

- pillar: hooks-v2
- tier: T1
- ai_priority_score: 50
- leverage_score: 9
- why: 2.1.89 `TaskCreated` hook can prevent duplicate work across chats
- depends_on: []
- blocks: []
- parallel_with: [U-HKA08, U-HKA10]
- viz_node_id: `core.hooks.taskcreatedclaim` (TBD-create)
- closes_synergy_edge: hooks × multi-chat
- loop_schedule: none

verifies_via:
  channel: test
  tool: 2 chats both TaskCreate same subject → second blocked
  expected_signal: 2nd attempt returns "duplicate"
  re_run_cost: 30s
  baseline: no claim guard

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/task-created-claim-guard.mjs`
      action: TaskCreated hook — fuzzy-match subject against shared task-claims.jsonl; deny if match
      verify: hook runs
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook
      verify: parse clean

adversarial_cases:
  - subject paraphrase evades fuzzy match
  - claim file stale (chat died without releasing)

variability_axis:
  - exact / fuzzy / semantic match

failure_modes:
  - false positive → maintainer escape hatch with `--force`
  - claim stale → expire after 30min
  - claim file write-conflict → retry with backoff

---

## U-HKA10 — PostToolBatch budget ceiling

- pillar: hooks-v2
- tier: T1
- ai_priority_score: 48
- leverage_score: 9
- why: 1000-tool batches can blow token budget; ceiling + alarm
- depends_on: []
- blocks: []
- parallel_with: [U-HKA09]
- viz_node_id: `core.hooks.posttoolbatchbudget` (TBD-create)
- closes_synergy_edge: hooks × cost
- loop_schedule: 7d (recompute ceiling)

verifies_via:
  channel: metric
  tool: simulate 1000 tools/hour → assert alarm fires
  expected_signal: alarm emitted at threshold
  re_run_cost: 60min
  baseline: no ceiling

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/post-tool-batch-budget.mjs`
      action: PostToolUse — running counter; at threshold emit alarm + slow-mode
      verify: hook runs
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook
      verify: parse clean
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: `/loop --interval 7d` to retune ceiling
      verify: cron registration confirmed

adversarial_cases:
  - legitimate big sweep (e.g. doc regen) trips ceiling
  - counter overflow / reset race

variability_axis:
  - 100 / 1000 / 10000 tools/hour thresholds

failure_modes:
  - counter inaccurate → fall back to time-window count
  - alarm not delivered → log + escalate
  - sleep-mode evaded by client → harden via Stop hook

---

## §X — Closing notes

**Critical-path:** U-HKA01 (read-once) ships fastest, biggest single token win. Build first.

**Cross-cuts HOOK-SYNERGY-MS0:** these are hook-V2 patterns on top of the V1 fleet; coordinate sequencing.

**Cron:** `/loop --interval 7d` for U-HKA10 budget retune.

**Synergy edges closed:** 8 (hooks × token-economy, hooks × safety [twice], hooks × dispatchers, hooks × ollama, hooks × subagents, hooks × external-tooling, hooks × system-viz, hooks × multi-chat, hooks × cost).
