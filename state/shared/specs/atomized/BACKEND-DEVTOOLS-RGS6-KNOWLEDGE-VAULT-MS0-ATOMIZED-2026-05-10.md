---
milestone: KNOWLEDGE-VAULT-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
research_source: state/shared/research/2026-05-10-pass2-knowledge-vault.md
total_units: 6
critical_path_role: unifies 722-wiki + 188-memory + 440-skill + CLAUDE.md into one feedback loop
loop_registrations: 2 (memory→wiki promotion 7d, vault-rot 30d)
date: 2026-05-10
---

# KNOWLEDGE-VAULT-MS0 — atomized

> Karpathy 3-layer pattern + Boris back-flow + Matuschak evergreen + Nick Milo MOCs applied to PRISM's existing substrate. The 30% missing piece is **automated coupling** between wiki / memory / skills / CLAUDE.md.

---

## U-VAULT01 — Vault-schema doc (CLAUDE.md role definition)

- pillar: vault
- tier: T1
- ai_priority_score: 85
- leverage_score: 13
- why: without a schema doc, the four surfaces drift apart; this is the gravity center
- depends_on: []
- blocks: [U-VAULT02, U-VAULT03, U-VAULT04, U-VAULT06]
- parallel_with: [U-GAC01, U-HKA01]
- viz_node_id: `fs.deep.prism.state.shared.specs.f.vault-schema-doc.md`
- closes_synergy_edge: claude.md × wiki (currently manual)
- loop_schedule: none

verifies_via:
  channel: render
  tool: `node scripts/wiki-lint.mjs state/shared/specs/VAULT-SCHEMA.md`
  expected_signal: `lint passed`
  re_run_cost: 2s
  baseline: doc does not exist

micro_steps:
  - step-1:
      tool: Read
      path: `WIKI_SCHEMA.md`
      action: read existing wiki schema for pattern
      verify: file readable
  - step-2:
      tool: Write
      path: `state/shared/specs/VAULT-SCHEMA.md`
      action: define routing — CLAUDE.md=schema/rules; wiki=evergreen knowledge; memory=ephemeral session; skills=keyword-triggered prompts; with cross-trigger contract
      verify: file exists, contains §Routing
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: lint the new doc
      verify: `node scripts/wiki-lint.mjs state/shared/specs/VAULT-SCHEMA.md` → "lint passed"
  - step-4:
      tool: Edit
      path: `H:/prism/CLAUDE.md`
      action: append §VAULT-SCHEMA pointer (1 line)
      verify: `grep VAULT-SCHEMA H:/prism/CLAUDE.md` → match

adversarial_cases:
  - cross-trigger circular (skill A → wiki B → skill A)
  - schema doc renamed while CLAUDE.md still points at old path

variability_axis:
  - manufacturing / dev-tools / AI-systems domain examples
  - happy / corner / pathological routing case per domain

failure_modes:
  - wiki-lint script absent → fall back to manual review checklist
  - CLAUDE.md token bloat → enforce section-budget at lint time
  - drift between schema and actual usage → quarterly audit unit

---

## U-VAULT02 — Memory→wiki promotion engine

- pillar: vault
- tier: T1
- ai_priority_score: 75
- leverage_score: 12
- why: fleeting observations rot without promotion ritual; Matuschak's evergreen-notes pattern
- depends_on: [U-VAULT01]
- blocks: [U-VAULT05]
- parallel_with: [U-VAULT03, U-VAULT04]
- viz_node_id: `eng.knowledge.memorywikipromotionengine` (TBD-create)
- closes_synergy_edge: memory × wiki (currently manual)
- loop_schedule: 7d (weekly promotion sweep)

verifies_via:
  channel: integration
  tool: tag memory entry `permanent:true` → wait 7d cron or trigger manually → assert wiki entry exists
  expected_signal: wiki entry created within 5min of manual trigger
  re_run_cost: 5min
  baseline: no automatic path

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/MemoryWikiPromotionEngine.ts`
      action: scan `C:/Users/wompu/.claude/projects/H--prism/memory/` for entries with `permanent:true` or 3+ session-reuse signals
      verify: file exists
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/MemoryWikiPromotionEngine.test.ts`
      action: 5 tests — explicit permanent flag, reuse-count threshold, missing frontmatter, oversized body, duplicate wiki entry
      verify: 5 passed
  - step-3:
      tool: Write
      path: `scripts/memory-wiki-promote.mjs`
      action: CLI — calls engine + writes promoted entry to `knowledge/wiki/<category>/`
      verify: script runs, wiki entry materializes
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/memoryDispatcher.ts`
      action: wire `memory_promote` action
      verify: round-trip MCP
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: register `/loop --interval 7d --max 12 "memory-wiki-promote"` (or document for user-side)
      verify: entry visible in `.claude/cron-registry.json` or docs

adversarial_cases:
  - memory entry references file that no longer exists
  - 100 entries all flagged permanent same day

variability_axis:
  - feedback / reference / project memory types (3 spanning)
  - 1 / 10 / 100 entries per sweep

failure_modes:
  - wiki entry name collision → suffix with date
  - frontmatter missing → infer from content, log warning
  - duplicate detection → use content hash before write

---

## U-VAULT03 — CLAUDE.md back-flow hook (Boris pattern)

- pillar: vault
- tier: T1
- ai_priority_score: 70
- leverage_score: 11
- why: Boris #1 doctrine — "After ANY correction from the user: update CLAUDE.md so you don't make that mistake again"
- depends_on: [U-VAULT01]
- blocks: []
- parallel_with: [U-VAULT02, U-VAULT04]
- viz_node_id: `core.hooks.claudemdbackflow` (TBD-create)
- closes_synergy_edge: feedback × claude.md (currently none)
- loop_schedule: none

verifies_via:
  channel: metric
  tool: inject regression → wait → grep CLAUDE.md
  expected_signal: `grep -c "$(date +%Y-%m-%d)" H:/prism/CLAUDE.md` increments
  re_run_cost: 1s
  baseline: 0 entries today

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/claudemd-backflow.mjs`
      action: PostToolUse hook — when user-message includes correction phrases ("no", "don't", "wrong"), append `H:/prism/CLAUDE.md` §Recent regressions
      verify: hook runs on stdin → JSON
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register on PostToolUse + UserPromptSubmit
      verify: parse clean
  - step-3:
      tool: Write
      path: `.claude/hooks/__tests__/claudemd-backflow.test.mjs`
      action: 5 tests — correction detected, false positive (positive feedback), oversized message, no CLAUDE.md found, append idempotent
      verify: 5 passed

adversarial_cases:
  - user types "don't worry" (false positive)
  - 100 corrections in same session (CLAUDE.md bloat)

variability_axis:
  - direct correction / Socratic correction / silent-rollback
  - global CLAUDE.md / project CLAUDE.md / both

failure_modes:
  - CLAUDE.md write conflict (peer chat) → use file-claim lock
  - regression count > 50 per month → flag for distillation
  - false positive escalation → escape hatch via `[NOT-REGRESSION]` user phrase

---

## U-VAULT04 — Skill ↔ wiki cross-trigger registry

- pillar: vault
- tier: T1
- ai_priority_score: 65
- leverage_score: 11
- why: skills currently keyword-trigger; wiki entries should also be able to suggest skills
- depends_on: [U-VAULT01]
- blocks: []
- parallel_with: [U-VAULT02, U-VAULT03]
- viz_node_id: `eng.knowledge.skillwikicrosstriggerengine` (TBD-create)
- closes_synergy_edge: skills × wiki (currently manual)
- loop_schedule: none

verifies_via:
  channel: integration
  tool: wiki entry tagged `skill:hypermill-rough` → trigger keyword in prompt → assert skill invoked
  expected_signal: skill telemetry shows invocation
  re_run_cost: 30s
  baseline: skills only keyword-triggered

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/SkillWikiCrossTriggerEngine.ts`
      action: scan wiki frontmatter for `skill:<name>` tags, build trigger registry
      verify: file exists, registry serializable
  - step-2:
      tool: Write
      path: `scripts/skill-wiki-index.mjs`
      action: emit `state/shared/skill-wiki-cross-trigger.json`
      verify: script runs, JSON valid
  - step-3:
      tool: Edit
      path: `.claude/hooks/skill-trigger-augment.mjs`
      action: add cross-trigger lookup to existing skill-triggering logic
      verify: prompt → both keyword and wiki-tag triggers fire
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/SkillWikiCrossTriggerEngine.test.ts`
      action: 5 tests — tag→skill, multi-tag, missing skill, tag collision, empty wiki
      verify: 5 passed

adversarial_cases:
  - wiki tag references nonexistent skill
  - tag injection in user content

variability_axis:
  - 1 / 10 / 50 cross-triggers
  - exact-match / fuzzy-match / regex

failure_modes:
  - skill name collision → take first registered, log
  - registry stale → rebuild on wiki change
  - trigger storm → cooldown 60s per skill

---

## U-VAULT05 — Domain MOC generator (Nick Milo pattern)

- pillar: vault
- tier: T1
- ai_priority_score: 55
- leverage_score: 10
- why: 722 wiki entries are unnavigable without per-domain maps of content
- depends_on: [U-VAULT02]
- blocks: []
- parallel_with: [U-VAULT06]
- viz_node_id: `eng.knowledge.mocgeneratorengine` (TBD-create)
- closes_synergy_edge: wiki × wiki (currently auto, this hardens)
- loop_schedule: 30d (monthly regen)

verifies_via:
  channel: render
  tool: `node scripts/moc-generate.mjs --domain=WEDM`
  expected_signal: `knowledge/wiki/_MOCs/WEDM-MOC.md` exists, ≥10 entries listed
  re_run_cost: 5s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/MOCGeneratorEngine.ts`
      action: cluster wiki entries by domain tag → emit MOC.md
      verify: file exists
  - step-2:
      tool: Write
      path: `scripts/moc-generate.mjs`
      action: CLI — `--domain <name>` writes to `knowledge/wiki/_MOCs/`
      verify: script runs
  - step-3:
      tool: Bash
      path: `H:/prism/knowledge/wiki/`
      action: create `_MOCs/` dir
      verify: `ls knowledge/wiki/_MOCs/` exists

adversarial_cases:
  - 1000 entries single domain (oversized MOC)
  - circular cross-reference

variability_axis:
  - Manufacturing / AI / dev-tools / safety / WEDM (5 spanning)

failure_modes:
  - dir creation race → idempotent mkdir
  - entry without domain tag → bucket as "uncategorized"
  - MOC content too long → split into MOC + sub-MOCs

---

## U-VAULT06 — Vault-rot sentinel

- pillar: vault
- tier: T1
- ai_priority_score: 50
- leverage_score: 9
- why: stale wiki entries mislead more than help; quarterly audit catches rot
- depends_on: [U-VAULT01]
- blocks: []
- parallel_with: [U-VAULT05]
- viz_node_id: `eng.knowledge.vaultrotsentinelengine` (TBD-create)
- closes_synergy_edge: wiki × tribal (currently auto, harden)
- loop_schedule: 30d

verifies_via:
  channel: metric
  tool: `node scripts/vault-rot-audit.mjs`
  expected_signal: stale_count, fresh_count, total — reasonable ratio
  re_run_cost: 10s
  baseline: 0% audited

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/VaultRotSentinelEngine.ts`
      action: scan wiki + memory entries → flag mtime > 90d AND access-count < 2
      verify: file exists
  - step-2:
      tool: Write
      path: `scripts/vault-rot-audit.mjs`
      action: CLI — emits `state/shared/VAULT-ROT-REPORT.md`
      verify: script runs
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/VaultRotSentinelEngine.test.ts`
      action: 5 tests — happy, all fresh, all stale, missing mtime, access-count log corrupt
      verify: 5 passed

adversarial_cases:
  - access log corrupt
  - mtime in future

variability_axis:
  - 30d / 60d / 90d threshold
  - hard-flag / soft-warn

failure_modes:
  - false-stale (rarely-used but critical) → maintainer override list
  - access log gap → conservative: assume fresh
  - audit run too aggressive → throttle deletion to manual review

---

## §X — Closing notes

**Critical-path:** U-VAULT01 unblocks 4 downstream. Build first.

**Cron registrations:** `/loop --interval 7d` for U-VAULT02 promotion; `/loop --interval 30d` for U-VAULT05 MOC regen + U-VAULT06 rot audit.

**Synergy closed:** 4 of 56 "none" edges (memory × wiki, feedback × claude.md, skills × wiki, claude.md × wiki).
