---
milestone: AUTO-LEARNING-LOOP-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
research_source: state/shared/research/2026-05-10-pass2-* (synthesized) + user directive
total_units: 12
critical_path_role: continuous self-improvement loop — monitor reputable sources, detect novelty, auto-research, classify synergy, auto-augment viz + roadmap
loop_registrations: 8 (6 cron + 2 /loop)
date: 2026-05-10
---

# AUTO-LEARNING-LOOP-MS0 — atomized

> User directive (Phase-6): "we need an auto feature that monitors reputable sources multiple times a day so our system automatically does deep research and decides if and how we can utilize new features to our system and synergize it automatically and auto add it to the system-viz feature."

---

## U-ALL01 — Build `ReputableSourceMonitorEngine` (multi-source poller)

- pillar: auto-learn
- tier: T1
- ai_priority_score: 88
- leverage_score: 14
- why: foundation — without source ingest nothing flows
- depends_on: []
- blocks: [U-ALL02, U-ALL07]
- parallel_with: [U-ALL04 (classifier dev)]
- viz_node_id: `eng.knowledge.reputablesourcemonitorengine` (TBD-create)
- closes_synergy_edge: external × system (currently none)
- loop_schedule: 4h cron

verifies_via:
  channel: integration
  tool: `node scripts/source-monitor-sweep.mjs --once`
  expected_signal: ≥1 new item logged from each of 10 sources
  re_run_cost: 2min full sweep
  baseline: no external polling

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/ReputableSourceMonitorEngine.ts`
      action: 10-source list (arXiv RSS, Anthropic blog RSS, HF Papers, GitHub releases, HN, X via RSSHub, Cloudflare changelog, LangChain blog, Moonshot, arXiv cs.MA); per-source ETag/conditional GET; exponential backoff
      verify: file exists
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/ReputableSourceMonitorEngine.test.ts`
      action: 7 tests — happy (arXiv), 429 backoff, malformed RSS, redirect loop, 50MB payload guard, ETag-honored, source-list config
      verify: 7 passed
  - step-3:
      tool: Write
      path: `scripts/source-monitor-sweep.mjs`
      action: CLI — calls engine, writes `state/shared/source-monitor-log.jsonl`
      verify: script runs
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: register cron `7 */4 * * *` (4h, off-minute)
      verify: cron entry persists
  - step-5:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/devDispatcher.ts`
      action: wire `source_sweep` action
      verify: round-trip MCP

adversarial_cases:
  - source-poisoning: feed serves malicious content
  - MITM-replaced response (no TLS pin)
  - source returns infinite XML

variability_axis:
  - RSS / Atom / JSON API / scrape (4 ingest types)
  - 1 / 10 / 100 items per source

failure_modes:
  - source unreachable → log, retry on next cron, alarm if 3 consecutive fails
  - rate-limit → exponential backoff (1m/5m/30m/2h)
  - malformed feed → quarantine + log

---

## U-ALL02 — Build `NoveltyDetectionEngine` (diff vs catalog)

- pillar: auto-learn
- tier: T1
- ai_priority_score: 85
- leverage_score: 13
- why: filter known-from-novel so we only research what's actually new
- depends_on: [U-ALL01]
- blocks: [U-ALL03]
- parallel_with: [U-ALL04]
- viz_node_id: `eng.knowledge.noveltydetectionengine` (TBD-create)
- closes_synergy_edge: external × dedup
- loop_schedule: 30min cron

verifies_via:
  channel: test
  tool: inject 5 known + 5 new → assert 5 flagged novel
  expected_signal: precision=1, recall=1 on synthetic test
  re_run_cost: 2s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/NoveltyDetectionEngine.ts`
      action: load `state/shared/system-viz/novelty-catalog.json` (currently empty); cosine-embed new vs known; threshold = 0.92 → known
      verify: file exists
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/NoveltyDetectionEngine.test.ts`
      action: 5 tests — exact-dup detected, near-dup (1 word diff), truly-novel, empty input, catalog corrupt
      verify: 5 passed
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: register cron `*/30 * * * *`
      verify: cron entry

adversarial_cases:
  - paraphrased dup (semantic identical, lexical different)
  - identical content, different timestamp

variability_axis:
  - 0% / 50% / 100% novelty in batch
  - 1 / 100 / 10000 catalog entries

failure_modes:
  - embedding service down → fall back to Jaccard token overlap
  - catalog corrupt → load `.previous.json` backup
  - threshold drift → 7d adaptive retune

---

## U-ALL03 — Build `AutoResearchOrchestratorEngine` (rate-limited dispatch)

- pillar: auto-learn
- tier: T1
- ai_priority_score: 82
- leverage_score: 13
- why: dispatching unlimited researcher subagents → token explosion; cap at 3 concurrent / 12 per day
- depends_on: [U-ALL02]
- blocks: [U-ALL04]
- parallel_with: [U-ALL05]
- viz_node_id: `eng.ai.autoresearchorchestratorengine` (TBD-create)
- closes_synergy_edge: subagents × cron
- loop_schedule: 1h cron

verifies_via:
  channel: integration
  tool: queue 5 novel items → assert max 3 concurrent, rest queued
  expected_signal: dispatch log shows respected limit
  re_run_cost: 3min
  baseline: no orchestrator

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/AutoResearchOrchestratorEngine.ts`
      action: queue + semaphore (max 3 concurrent), day-budget counter (12), canned rubric for researcher subagent
      verify: file exists
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/AutoResearchOrchestratorEngine.test.ts`
      action: 6 tests — queue 1/3/10, day-budget exhausted, subagent timeout, subagent crash, queue persistence across restart
      verify: 6 passed
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: register cron `13 * * * *` (hourly, off-minute) for flush
      verify: cron entry

adversarial_cases:
  - subagent prompt-injected by source content
  - queue starvation (always full)

variability_axis:
  - 1 / 3 / 10 concurrent caps
  - 1 / 12 / 100 daily caps

failure_modes:
  - subagent timeout (>15min) → kill + log + retry next cycle
  - day-budget hit → defer to tomorrow's quota
  - prompt-injection → sanitize source content before dispatch

---

## U-ALL04 — Build `SynergyClassifierEngine` (high/med/low/none decision)

- pillar: auto-learn
- tier: T1
- ai_priority_score: 80
- leverage_score: 13
- why: the auto-decide brain — score research output for PRISM fit
- depends_on: [U-ALL03]
- blocks: [U-ALL05, U-ALL06]
- parallel_with: []
- viz_node_id: `eng.ai.synergyclassifierengine` (TBD-create)
- closes_synergy_edge: ai × dedup
- loop_schedule: 15min cron

verifies_via:
  channel: eval
  tool: 20 fixed research-output samples → classify → compare to ground truth
  expected_signal: accuracy ≥ 80%
  re_run_cost: 30s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/SynergyClassifierEngine.ts`
      action: compute features (semantic_match, novelty_strength, duplication_risk, ai_priority_score, effort_estimate, blast_radius); decision tree → high/med/low/none
      verify: file exists
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/SynergyClassifierEngine.test.ts`
      action: 7 tests — high fit, med fit, low fit, none, duplicate-risk veto, NaN feature, missing field
      verify: 7 passed
  - step-3:
      tool: Write
      path: `state/shared/auto-learning/synergy-classifier-rubric.json`
      action: thresholds (0.65 high, 0.45 med, 0.25 low); adaptive-tunable
      verify: file exists
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: register cron `*/15 * * * *`
      verify: cron entry

adversarial_cases:
  - feature NaN poisons score
  - contradictory features (high novelty + high duplication)

variability_axis:
  - manufacturing / AI / dev-tools / safety domains
  - high / med / low / none decision boundaries

failure_modes:
  - feature compute error → conservative: classify "none"
  - threshold mistuned → weekly retune
  - duplicate-check false-positive → maintainer override

---

## U-ALL05 — Build `VizAutoAugmentationEngine` (emit augmentation file)

- pillar: auto-learn
- tier: T1
- ai_priority_score: 75
- leverage_score: 12
- why: high/med synergy → add nodes to system-viz; main graph reads only confidence>0.8
- depends_on: [U-ALL04]
- blocks: [U-ALL07, U-ALL08]
- parallel_with: [U-ALL06]
- viz_node_id: `eng.system.vizautoaugmentationengine` (TBD-create)
- closes_synergy_edge: system-viz × auto-learn
- loop_schedule: 1h cron

verifies_via:
  channel: integration
  tool: trigger 1 high-synergy classification → assert new viz node appears
  expected_signal: `state/shared/system-viz/auto-research-augmentation.json` updated
  re_run_cost: 5s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/VizAutoAugmentationEngine.ts`
      action: for each high/med synergy: emit `{nodes:[{id,type,label,confidence}],edges:[{from,to,kind}]}` to augmentation file
      verify: file exists
  - step-2:
      tool: Edit
      path: `scripts/merge-augmentations.mjs`
      action: NOTE — peer-claimed by claude-0413eca6; coordinate before edit. Just register new augmentation input file in their merger
      verify: defer to chat-bus
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/VizAutoAugmentationEngine.test.ts`
      action: 5 tests — emit happy, schema-compat, node-id collision, edge to nonexistent, confidence filter
      verify: 5 passed
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: register cron `27 * * * *`
      verify: cron entry

adversarial_cases:
  - schema-incompatible augmentation
  - 10k new nodes (graph explosion)

variability_axis:
  - 1 / 10 / 100 new nodes per cycle
  - confidence 0.5 / 0.8 / 0.95 thresholds

failure_modes:
  - merger script edited by peer → coord via chat-bus
  - node-id collision → suffix with auto-research-prefix
  - graph oversize → main graph reads only confidence>0.8

---

## U-ALL06 — Build `RoadmapAutoAppendEngine` (high-synergy → U-AUTORES-XX)

- pillar: auto-learn
- tier: T1
- ai_priority_score: 72
- leverage_score: 12
- why: high-synergy items should become roadmap units automatically
- depends_on: [U-ALL04]
- blocks: []
- parallel_with: [U-ALL05]
- viz_node_id: `eng.knowledge.roadmapautoappendengine` (TBD-create)
- closes_synergy_edge: roadmap × auto-learn
- loop_schedule: none (triggered by classifier)

verifies_via:
  channel: integration
  tool: trigger 1 high-synergy → assert unit appended to active roadmap
  expected_signal: `BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-*.md` ends with new U-AUTORES-XX unit
  re_run_cost: 10s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/RoadmapAutoAppendEngine.ts`
      action: read high-synergy classification → generate atomization YAML (§9 template) → append to active roadmap
      verify: file exists
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/RoadmapAutoAppendEngine.test.ts`
      action: 5 tests — append happy, malformed roadmap, peer-claim (skip), unit-id collision, oversized roadmap
      verify: 5 passed
  - step-3:
      tool: Write
      path: `state/shared/auto-learning/append-rate-limit.json`
      action: 2/milestone unless ≥3 corroborating sources
      verify: file exists

adversarial_cases:
  - 100 high-synergy in 1h → spam
  - peer-claim race (lockfile pattern)

variability_axis:
  - 1 / 2 / 5 appends per milestone
  - single-source / multi-source corroboration

failure_modes:
  - file-claim conflict → use `prism_context:claim_file` before write
  - append rate-limited → queue for next milestone
  - malformed unit YAML → reject + log

---

## U-ALL07..U-ALL08 — Wire 6 auto-learning actions

- pillar: auto-learn
- tier: T1
- ai_priority_score: 63
- leverage_score: 10
- why: MCP exposure so chats can manually trigger any phase
- depends_on: [U-ALL01..U-ALL06]
- blocks: []
- parallel_with: []
- viz_node_id: `disp.devdispatcher` + `disp.aireasoningdispatcher`
- closes_synergy_edge: dispatchers × auto-learn
- loop_schedule: none

verifies_via:
  channel: integration
  tool: round-trip 6 MCP actions
  expected_signal: all 6 return 200
  re_run_cost: 30s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Edit
      path: `mcp-server/src/schemas/devActionSchemas.ts`
      action: add `source_sweep` schema
      verify: TS compiles
  - step-2:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/devDispatcher.ts`
      action: wire `source_sweep` with lazy ReputableSourceMonitorEngine import
      verify: round-trip
  - step-3:
      tool: Edit
      path: `mcp-server/src/schemas/aiReasoningActionSchemas.ts`
      action: add 5 schemas — `novelty_detect`, `auto_research_dispatch`, `synergy_classify`, `viz_augment`, `roadmap_append`
      verify: TS compiles
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`
      action: wire 5 actions
      verify: round-trip MCP each

adversarial_cases: see per-engine specs

variability_axis: see per-engine specs

failure_modes: per-engine + dispatcher-level: bad schema → 400; engine throw → 500 with structured error

---

## U-ALL09 — Cron registration: 6 entries

- pillar: auto-learn
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: makes the loop run unattended
- depends_on: [U-ALL07, U-ALL08]
- blocks: []
- parallel_with: [U-ALL10, U-ALL11, U-ALL12]
- viz_node_id: `core.cron.autolearningfleet` (TBD-add)
- closes_synergy_edge: cron × auto-learn
- loop_schedule: see entries

verifies_via:
  channel: test
  tool: `cat .claude/cron-registry.json`
  expected_signal: 6 entries with auto-learning prefix
  re_run_cost: 1s
  baseline: 0 entries

micro_steps:
  - step-1: register `7 */4 * * *` source sweep (already in U-ALL01)
  - step-2: register `*/30 * * * *` novelty scan (U-ALL02)
  - step-3: register `13 * * * *` research flush (U-ALL03)
  - step-4: register `*/15 * * * *` synergy classify (U-ALL04)
  - step-5: register `27 * * * *` viz augment (U-ALL05)
  - step-6: register `3 9 * * *` daily digest (push to user + chat-bus)
      verify: 6 entries with off-minute timings

adversarial_cases:
  - cron overlap (next fires before prev done)
  - daylight-savings drift

variability_axis: cadence × business-hours / always-on

failure_modes:
  - overlap → file-lock on shared state
  - DST drift → use UTC internally
  - cron service down → systemd watchdog

---

## U-ALL10 — Human-in-loop weekly review surface

- pillar: auto-learn
- tier: T1
- ai_priority_score: 58
- leverage_score: 9
- why: fully autonomous = drift risk; weekly review catches false positives
- depends_on: [U-ALL06]
- blocks: []
- parallel_with: [U-ALL09, U-ALL11, U-ALL12]
- viz_node_id: `fs.deep.state.shared.f.auto-research-pending-jsonl` (TBD)
- closes_synergy_edge: human × auto-learn
- loop_schedule: 7d /loop

verifies_via:
  channel: render
  tool: open `state/shared/auto-learning/AUTO-RESEARCH-WEEKLY-DIGEST.md`
  expected_signal: list of pending items with approve/reject UI
  re_run_cost: 1s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Write
      path: `scripts/auto-research-weekly-digest.mjs`
      action: read `state/shared/auto-learning/auto-research-pending.jsonl` → markdown digest
      verify: script runs
  - step-2:
      tool: Bash
      path: `H:/prism/`
      action: register `/loop --interval 7d --max 12`
      verify: loop entry

adversarial_cases:
  - digest > context limit
  - approve/reject UI ambiguous

variability_axis: 1 / 10 / 100 pending items

failure_modes:
  - digest huge → paginate
  - user-input lost → keep until explicit reject
  - week-old pending → escalate to alarm

---

## U-ALL11 — Token-budget guard (12/day, $20/day)

- pillar: auto-learn
- tier: T1
- ai_priority_score: 55
- leverage_score: 9
- why: research dispatches can blow budget; hard cap + defer
- depends_on: [U-ALL03]
- blocks: []
- parallel_with: [U-ALL09, U-ALL10, U-ALL12]
- viz_node_id: `core.hooks.autolearnbudgetguard` (TBD-create)
- closes_synergy_edge: cost × auto-learn
- loop_schedule: none

verifies_via:
  channel: integration
  tool: simulate 13 dispatches → assert 13th deferred
  expected_signal: 13th returns "budget exhausted, deferred to tomorrow"
  re_run_cost: 5s
  baseline: no cap

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/auto-learn-budget-guard.mjs`
      action: pre-dispatch hook — read daily counter, deny if ≥12 or cost ≥$20
      verify: hook runs
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register
      verify: parse clean
  - step-3:
      tool: Write
      path: `.claude/hooks/__tests__/auto-learn-budget-guard.test.mjs`
      action: 5 tests — under-cap, at-cap, over-cap, cost-cap, counter reset at UTC midnight
      verify: 5 passed

adversarial_cases:
  - counter reset bypass via clock manipulation
  - budget exhaustion mid-dispatch

variability_axis: 1 / 12 / 100 daily caps; $5 / $20 / $50 cost caps

failure_modes:
  - counter corrupt → reset to 0 + warn
  - mid-dispatch overflow → finish current, defer next
  - false-positive defer → maintainer override

---

## U-ALL12 — Source-poisoning sanitizer (allowlist + content-hash)

- pillar: auto-learn
- tier: T1
- ai_priority_score: 50
- leverage_score: 9
- why: malicious feed → poisoned research → corrupted roadmap; sanitize early
- depends_on: [U-ALL01]
- blocks: []
- parallel_with: [U-ALL09, U-ALL10, U-ALL11]
- viz_node_id: `eng.knowledge.sourcepoisoningsanitizerengine` (TBD-create)
- closes_synergy_edge: security × auto-learn
- loop_schedule: none

verifies_via:
  channel: test
  tool: feed malformed/malicious content → assert quarantined
  expected_signal: item in `state/shared/auto-learning/quarantine.jsonl`
  re_run_cost: 1s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/SourcePoisoningSanitizerEngine.ts`
      action: per-source allowlist; content-hash signing for trusted; reject malformed XML/HTML
      verify: file exists
  - step-2:
      tool: Write
      path: `state/shared/auto-learning/source-allowlist.json`
      action: 10 sources with public-key fingerprints
      verify: file exists
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/SourcePoisoningSanitizerEngine.test.ts`
      action: 6 tests — clean source, untrusted source, hash mismatch, malformed XML, prompt-injection in body, oversized
      verify: 6 passed

adversarial_cases:
  - prompt-injection in feed item body
  - bait-and-switch (trusted source serves untrusted content)
  - timing attack on cache

variability_axis: trusted / untrusted / mixed source mix

failure_modes:
  - allowlist stale → flag for review
  - hash service down → fall back to schema check
  - false positive on edge cases → maintainer escape hatch

---

## §X — Closing notes

**Critical-path:** U-ALL01 → U-ALL02 → U-ALL03 → U-ALL04 (sequential foundation). U-ALL05/U-ALL06 parallel after U-ALL04. U-ALL07-12 wiring + safety in parallel.

**Cron registrations (6):** all from U-ALL09.

**/loop registrations (2):** U-ALL10 weekly review, source-list audit monthly.

**Synergy edges closed:** 8 (external × system, external × dedup, subagents × cron, ai × dedup, system-viz × auto-learn, roadmap × auto-learn, dispatchers × auto-learn, cron × auto-learn, human × auto-learn, cost × auto-learn, security × auto-learn).

**This pillar IS the system's self-improvement engine.** Once it's running, the roadmap grows on its own.
