# Per-Slot Galaxy Synergy Assessment (alpha 2026-05-28)

Operator directive: *"assess how each claude.md, soul file, memories and wikis should be synergized specifically for each chat slot and their designated domain"*.

---

## The 4-surface model — what each file answers

Every chat slot has FOUR ortho­gonal surfaces that work together. Each answers a distinct question, and the synergy comes from being LOAD-BEARING in concert — not duplication.

| Surface | Question it answers | Lifetime | Authored by | Read at |
|---------|---------------------|----------|-------------|---------|
| **soul.md** (`state/shared/slot-souls/<slot>.md`) | "How do I behave / what do I refuse?" | Long — persona stable across sessions | Operator + governance reviews | Every UserPromptSubmit via `slot-soul-inject` hook |
| **CLAUDE.md** (`engines/<galaxy>/CLAUDE.md`) | "What is my operational scope / which engines + hooks + skills are mine?" | Long — engine inventory changes slowly | Slot owner (alpha, foxtrot, etc.) | SessionStart (load-bearing context bundle) |
| **MEMORY.md** (`engines/<galaxy>/MEMORY.md`) | "What have I learned across sessions? What regressions am I aware of?" | Append-only across all sessions in this domain | Each session of the slot | UserPromptSubmit (relevance-scored inject) |
| **Wiki entries** (`knowledge/wiki/<topic>/`) | "Where's the ground-truth doctrine I'm citing?" | Permanent — write-once, evolve carefully | Anyone (wiki is fleet-shared) | Wiki-precheck-inject (top-3 BM25 hits per prompt) |

**Synergy principle**: a slot's chat instance boots → reads soul (persona) → reads CLAUDE.md (scope) → injects MEMORY (cross-session priors) → wiki provides citation backing. The 4 surfaces form a **load-bearing chain**, not a pile of overlapping docs.

---

## Per-NATO-slot synergy map (canonical per `H:/CHAT-SLOT-DOMAINS.md`)

### ALPHA — TOKEN OPTIMIZATION + EFFICIENCY + OBSIDIAN + PER-SLOT GALAXY BUILDOUT
- **soul.md** focus: voice=efficiency-focused, refuses=overspending/duplicate-tool-calls/sync-fs-in-async, preferred_subagent=reviewer
- **CLAUDE.md** focus (`engines/token-optimization/CLAUDE.md`): TokenAwareness/Budget/Economy engines · route-suggest hooks · rtk discipline · Karpathy 5-step · obsidian memory governance
- **MEMORY.md** focus (`engines/token-optimization/MEMORY.md`): token-zone history per session · what route-switches saved tokens · rejected routes (and why) · which Ollama offloads succeeded/failed
- **Wiki bridges**: `architecture/token-economy.md` · `architecture/route-suggest-substrate.md` · `lessons/ollama-offload-patterns.md` · `feedback/karpathy_discipline.md`
- **STATUS**: ✅ shipped this session (cc1210e208)

### BRAVO + ZEBRA — HERMES/ZEBRA BUILDING + STUB HUNTING + FLEET ORCHESTRATION
- **soul.md** focus: voice=stub-hunter (bravo) / cross-slot-synthesist (zebra), refuses=stub-engines/placeholder-tests/silent-success-on-failure
- **CLAUDE.md** focus (`engines/hermes-zebra/CLAUDE.md` — SHIPPED 5bae0c7a6a): bravo BUILDS hermes-zebra (stub-hunter, soul-files, self-reflect populater, per-slot galaxies); zebra IS the live orchestrator. Same dir, two roles: builder + runtime.
- **MEMORY.md** focus: weak-assertion drift class, soul-file schemaVersion drift, cron offset overlap, hostile-payload class
- **Wiki bridges**: `architecture/zebra-omniscient-ms0.md` · `architecture/hermes-self-reflect-populater.md` · `architecture/slot-soul-frontmatter.md` · `lessons/weak-assertion-class.md`
- **STATUS**: ✅ shipped (5bae0c7a6a) — bravo+zebra share galaxy dir per CHAT-SLOT-DOMAINS canonical pairing

### CHARLIE — QUOTING SOFTWARE (BACKEND + FRONT END)
- **soul.md** focus: voice=customer-facing, refuses=margin-erosion/quote-fabrication
- **CLAUDE.md** focus (`engines/quoting/CLAUDE.md`): QuoteEstimator/PricingEngine inventory · margin-discipline · customer-knowledge bridges
- **MEMORY.md** focus: prior quote outcomes · margin calibration · customer-specific patterns
- **Wiki bridges**: `architecture/quoting-pipeline-ms0.md` · `lessons/bid-to-win-calibration.md`
- **STATUS**: ✅ galaxy dir exists, full doctrine present

### DELTA — CAD
- **soul.md** focus: voice=geometry-precise, refuses=stub-CAD-output/non-validated-STEP
- **CLAUDE.md** focus (`engines/cad/CLAUDE.md`): CAD bridges (Fusion/SolidWorks/Mastercam/hyperMILL/Inventor) · BREP/STEP/IGES parsing · feature recognition
- **MEMORY.md** focus: per-CAD-system quirks · parsing edge cases · blueprint-corpus learnings
- **Wiki bridges**: `architecture/cad-multi-system-arch.md` · `lessons/blueprint-ocr-cad-reading-atlas.md`
- **STATUS**: ✅ complete

### ECHO — POST PROCESSORS
- **soul.md** focus: voice=controller-dialect-aware, refuses=untested-gcode-emission/syntax-fabrication
- **CLAUDE.md** focus (`engines/post-processor/CLAUDE.md`): per-controller dialect parsers · gcode emitters · safety validators
- **MEMORY.md** focus: dialect quirks per Fanuc/Okuma/Haas/Siemens/Mitsubishi · validation failures
- **Wiki bridges**: `architecture/post-bridge-synergy-ms0.md` · `lessons/dialect-syntax-class.md`
- **STATUS**: ✅ complete

### FOXTROT — MILLING WIZARD
- **soul.md** focus: voice=physics-first (Kienzle/Taylor canonical), refuses=inline-physics-constants/softening-safety-thresholds
- **CLAUDE.md** focus (`engines/mill/CLAUDE.md`): MillingMaster/AutoSpeedFeed/Engagement/Trochoidal · 222+ mill engines · 49 dispatcher actions
- **MEMORY.md** focus: per-material kc1.1 calibration history · chatter incidents · tool-life Weibull fits
- **Wiki bridges**: `architecture/mill-domain-atlas.md` · `lessons/feed-overrides-from-shop-floor.md`
- **STATUS**: ✅ complete

### GOLF — FLEET REAPER + MCP SERVER + GENERAL WORK
- **soul.md** focus: voice=hygiene-focused, refuses=destructive-cleanup-without-snapshot, NO write-allowlist (lifted per [[feedback_all_slots_free_access]])
- **CLAUDE.md** focus (`engines/fleet-hygiene/CLAUDE.md` — TO BUILD): FleetReaper schedule · MCP server health · scheduled-task watchdog
- **MEMORY.md** focus: zombie-process patterns · reaper false-positives · MCP daemon crash signatures
- **Wiki bridges**: `architecture/fleet-reaper-ms1.md` · `architecture/fleet-task-health-ms0.md`
- **STATUS**: ⏳ pending

### HOTEL — EMPLOYEE/HR/ACCOUNTING/ERP/BUSINESS/KAIZEN/SIGMA/LEAN
- **soul.md** focus: voice=business-precise, refuses=number-fabrication-in-financial-reports
- **CLAUDE.md** focus (`engines/business/CLAUDE.md`): ERP + HR + accounting engines · KAIZEN/Lean patterns
- **MEMORY.md** focus: customer financial baselines · payroll calibration · audit findings
- **Wiki bridges**: `architecture/erp-business-integration.md` · `lessons/kaizen-cycle-history.md`
- **STATUS**: ✅ complete

### INDIA — AI/NN/GNN/LORA/RAG/DEEP LEARNING/DEEP REASONING/ML
- **soul.md** focus: voice=training-rigor, refuses=overclaim-on-untrained-models/weight-corruption
- **CLAUDE.md** focus (`engines/ai-training/CLAUDE.md` — TO BUILD): NN-GRAPH lifecycle · LoRA train/serve · RAG pipelines · deep-reasoning engines
- **MEMORY.md** focus: prior AUROC history · weight-cache locations · failed retraining sessions + cause
- **Wiki bridges**: `architecture/nn-graph-ms0.md` `ms1.md` `ms2.md` · `lessons/rag-upgrade-ms0.md`
- **STATUS**: ⏳ pending

### JULIETT — DATABASE EXPANSION
- **soul.md** focus: voice=schema-rigorous, refuses=schema-drift/silent-migration
- **CLAUDE.md** focus (`engines/database-expansion/CLAUDE.md` — TO BUILD): Qdrant/Postgres/Prometheus health · schema-version discipline · migration patterns
- **MEMORY.md** focus: schema-drift incidents · migration successes/failures · DB capacity headroom
- **Wiki bridges**: `architecture/qdrant-capacity-planning.md` · `lessons/schema-drift-class.md`
- **STATUS**: ⏳ pending

### KILO — CAM
- **soul.md** focus: voice=toolpath-rigorous, refuses=untested-cam-output/silent-collision
- **CLAUDE.md** focus (`engines/cam/CLAUDE.md`): per-CAM-system bridges · toolpath strategies · multi-axis kinematics
- **MEMORY.md** focus: per-CAM-system quirks (Fusion/Mastercam/hyperMILL/Esprit/Inventor) · prior collision findings
- **Wiki bridges**: `architecture/cam-corpus-locations.md` · `lessons/cam-strategy-selection.md`
- **STATUS**: ✅ complete

### LIMA — PRISM ACADEMY COURSES
- **soul.md** focus: voice=pedagogical, refuses=incomplete-learning-paths/fabricated-citations
- **CLAUDE.md** focus (`engines/academy/CLAUDE.md`): course-builder · curriculum · MIT-OCW corpus · pdf-corpus extraction
- **MEMORY.md** focus: per-student progress · curriculum gaps surfaced · MIT-OCW ingestion state
- **Wiki bridges**: `architecture/knowledge-conversion-ms0.md` · `lessons/ahmad-llm-curriculum.md`
- **STATUS**: ✅ complete

### MIKE — WIRE WIZARD
- **soul.md** focus: voice=wedm-rigorous, refuses=wire-break-risk-ignored/recast-layer-overestimate
- **CLAUDE.md** focus (`engines/wedm/CLAUDE.md`): 184 WEDM engines · dialect bridges · multi-pass cycle planning
- **MEMORY.md** focus: prior wire-break incidents · cutting params history per material · recast measurements
- **Wiki bridges**: `architecture/wire-domain-atlas.md` · `lessons/wedm-thermal-modeling.md`
- **STATUS**: ✅ complete

### NOVEMBER — U-DEA
- **STATUS**: ⏳ pending; "U-DEA" assignment needs operator clarification before galaxy build

### OSCAR — SPEED AND FEED CALCULATOR
- **soul.md** focus: voice=physics-rigorous, refuses=arbitrary-SFM-without-citation
- **CLAUDE.md** focus (`engines/speed-feed/CLAUDE.md`): SFC engines · per-material database · cross-domain adjacency
- **MEMORY.md** focus: per-tool/material outcome history · calibration drift · ML-model retrain triggers
- **Wiki bridges**: `architecture/sfc-domain-map.md` · `lessons/speed-feed-ml-fingerprints.md`
- **STATUS**: ✅ complete

### PAPA — BACKEND HELPER
- **soul.md** focus: voice=test-driven, refuses=untested-shipping/coverage-shrink
- **CLAUDE.md** focus (`engines/backend-helper/CLAUDE.md` — TO BUILD): backend test patterns · dispatcher-wiring discipline · TS strict mode
- **MEMORY.md** focus: build-doctor outcomes · regression-hunter findings · TSC-fix campaigns
- **Wiki bridges**: `architecture/backend-test-patterns.md` · `lessons/tsc-fix-campaign-history.md`
- **STATUS**: ⏳ pending

### QUEBEC — FRONT END WEB APP + PHONE APP
- **soul.md** focus: voice=UX-precise, refuses=mock-data-in-production-paths
- **CLAUDE.md** focus (`engines/frontend-app/CLAUDE.md` — TO BUILD): React/Next.js patterns · phone-app bridges · web→server contracts
- **MEMORY.md** focus: per-component visual regressions · UX corrections from operator
- **Wiki bridges**: `architecture/frontend-merge-plan.md` · `lessons/ui-state-management.md`
- **STATUS**: ⏳ pending

### SIERRA — SYSTEM VIZ UPGRADES, INTEGRATION & UTILIZATION
- **soul.md** focus: voice=graph-rigorous, refuses=silent-clobber/non-atomic-graph-write
- **CLAUDE.md** focus (`engines/system-viz/CLAUDE.md`): regen-viz / merge-augmentations / ghost-roost discipline · one-writer-per-path doctrine
- **MEMORY.md** focus: prior silent-clobber regressions · ghost-roost expansion history · query patterns
- **Wiki bridges**: `architecture/system-viz-add-node.md` · `lessons/regen-viz-merge-guard.md`
- **STATUS**: ✅ shipped this session (cc1210e208)

### TANGO — ALGORITHM, ENGINE & PIPELINE DISCOVERY
- **soul.md** focus: voice=discovery-rigorous, refuses=duplicate-engine-creation/orphan-tolerance
- **CLAUDE.md** focus (`engines/discovery/CLAUDE.md` — TO BUILD): duplicationGuardEngine · ENGINE_DIGEST · pipeline-coverage scans
- **MEMORY.md** focus: prior duplicate-finds · orphan-rescue history · pipeline-coverage gaps
- **Wiki bridges**: `architecture/algorithm-orchestrator.md` · `lessons/orphan-rescue-class.md`
- **STATUS**: ⏳ pending

### WHISKEY — LATHE WIZARD
- **soul.md** focus: voice=lathe-physics-first, refuses=inline-physics-constants/skipping-spindle-torque-gate/softening-safety-thresholds
- **CLAUDE.md** focus (`engines/lathe/CLAUDE.md`): lathe-master · CSS/G50/G96/G97 · threading · parting · chuck-jaw force
- **MEMORY.md** focus: per-material turning calibration · chuck-incident history · part-off failures
- **Wiki bridges**: `architecture/lathe-print-to-program.md` · `lessons/whiskey-closed-loop.md`
- **STATUS**: ✅ complete

### ZEBRA — HERMES AGENT CHAT FLEET ORCHESTRATOR
- **STATUS**: ⏳ pending; zebra is an orchestrator not a worker — needs different doctrine pattern (cross-slot synthesis, not domain-specialist)

### ROMEO, UNIFORM, VICTOR, XRAY, YANKEE, ZULU — NO CANONICAL ASSIGNMENT
- These slots have souls but no canonical work assignment in `H:/CHAT-SLOT-DOMAINS.md`. Available for future allocations.

---

## Synergy invariants (load-bearing rules for all 26 slots)

1. **soul stays personality-only** — voice, tone, refuses, preferred_subagent. NOT operational scope (that's CLAUDE.md). Souls drift when operators mistakenly put engine inventory there (prior sin documented in CLAUDE.md `## Recent regressions`).

2. **CLAUDE.md stays scope-only** — engine + hook + skill inventory + anti-patterns + Karpathy 5-step. NOT cross-session learnings (that's MEMORY.md). NOT permanent doctrine (that's wiki).

3. **MEMORY.md is append-only + relevance-scored** — every Stop hook appends new learnings. UserPromptSubmit injects top-3 by BM25 + slot-domain affinity. NEVER overwritten.

4. **Wiki is permanent + citable** — Karpathy LLM-wiki pattern. Query BEFORE re-deriving (per `wiki-precheck-inject`). Write-once with evolve-carefully.

5. **All 4 surfaces auto-inject per UserPromptSubmit** — none require explicit `Read`. The substrate handles the synergy.

---

## Buildout backlog (8 slots remaining)

| Slot | Galaxy dir to create | Priority |
|------|---------------------|----------|
| bravo | engines/hermes-zebra/ | P1 (hermes/zebra is alpha's sister) |
| golf | engines/fleet-hygiene/ | P1 (golf is fleet-critical) |
| india | engines/ai-training/ | P0 (highest-leverage; AI/NN/LoRA/RAG corpus) |
| juliett | engines/database-expansion/ | P1 |
| papa | engines/backend-helper/ | P1 |
| quebec | engines/frontend-app/ | P2 |
| tango | engines/discovery/ | P1 (duplicate-prevention infrastructure) |
| november | engines/<unclear>/ | needs operator clarification on U-DEA |

Per-slot effort: ~2 files (CLAUDE.md + MEMORY.md) + 1 SLOT_GALAXY_MAP entry + commit. ~5-10 min per slot. Each can be parallelized across separate alpha sessions or shipped serially.

---

## Cron persistence

The /loop directive that drove this assessment is scheduled as `c180e685` (every 5min, 7-day expiry, session-only). Each fire re-reads this doc and continues buildout one slot at a time.

— Established 2026-05-28 by slot:alpha claude-168624b9 as the synergy blueprint for U-PER-SLOT-GALAXY-BUILDOUT continuation.


---

## BUILDOUT PROGRESS (2026-05-28 alpha 168624b9 — end of session)

**Galaxy dirs shipped**: 9 covering 10 NATO slots:
| Slot | Galaxy dir | Status | Commit |
|------|------------|--------|--------|
| alpha | engines/token-optimization/ | ✅ shipped | cc1210e208 |
| sierra | engines/system-viz/ | ✅ shipped | cc1210e208 |
| india | engines/ai-training/ | ✅ shipped | b9beaae11e |
| golf | engines/fleet-hygiene/ | ✅ shipped | b9beaae11e |
| tango | engines/discovery/ | ✅ FULL 13-artifact galaxy (soul+CLAUDE+MEMORY+PATHS+TOOLBELT+10 mem+3 wiki+7 tribal+/discover-tango+back-ptr) | U-PSGB-TANGO (slot:tango 2026-05-29) — completed alpha's b9beaae11e stub |
| bravo + zebra | engines/hermes-zebra/ | ✅ shipped | 5bae0c7a6a |
| juliett | engines/database-expansion/ | ✅ shipped | 2ef34cdd1a |
| papa | engines/backend-helper/ | ✅ shipped | 2ef34cdd1a |
| quebec | engines/frontend-app/ | ✅ shipped | 2ef34cdd1a |
| xray | engines/blueprint-vision/ | ✅ FULL 13-artifact galaxy (soul+CLAUDE+MEMORY+PATHS+TOOLBELT+10 mem+3 wiki+7 tribal+/extract-xray+back-ptr) | U-PSGB-XRAY (slot:xray 2026-05-29) — completed alpha's d6e5e4109f seed; corrected 21 phantom engine names + 3 phantom paths + unverified 96% claim |

**SLOT_GALAXY_MAP entries**: 20 of 26 NATO slots mapped to a galaxy.

**Remaining 6 unmapped slots** (no canonical domain assignment in CHAT-SLOT-DOMAINS.md):
- romeo · uniform · victor · xray · yankee · zulu

**Remaining 7 mapped slots that lack a dedicated galaxy DIR scaffold** (they map to existing engine domains, but no engines/<galaxy>/CLAUDE.md + MEMORY.md scaffold yet):
- charlie → quoting (engines/QuoteEstimator.ts et al exist; galaxy dir TBD)
- delta → cad
- echo → post-processor
- foxtrot → mill
- hotel → business
- kilo → cam
- lima → academy
- mike → wedm
- oscar → speed-feed
- whiskey → lathe
- november → U-DEA (operator clarification still needed)

These 10 slots already have rich existing engine + memory + wiki coverage in their target domains; the galaxy-dir scaffold is the LAST step to formalize their soul↔CLAUDE.md↔MEMORY.md↔wiki contract per the 4-surface model.

## SYNERGY INVARIANTS (load-bearing across all slots)

1. **soul.md refuses-list is hard-enforced** — slot-soul-inject auto-fires on UserPromptSubmit; refuses are not advisory. Bravo (hermes-zebra) maintains drift detection.
2. **CLAUDE.md is the engine + hook + skill inventory** — it does NOT duplicate doctrine that lives in fleet CLAUDE.md or wiki. It points; it does not retell.
3. **MEMORY.md is append-only across sessions** — pointer-style, ≤200 lines, ≤140 char/entry. Older entries archive to MEMORY-ARCHIVE.md (discoverable, not gone).
4. **Wiki is fleet-shared, citable, evolves carefully** — anyone may write; CLAUDE.md/MEMORY.md cite via [[wikilinks]]. Wiki entry rot is a P0 — the bug-finding wiki gate (Stop hook) catches it.
5. **Cross-galaxy bridges are explicit, not inferred** — every CLAUDE.md lists its sister galaxies + the SHAPE of the bridge (what flows which way).

## OPEN FOLLOW-UPS

- **U-PSGB-NOVEMBER** — needs operator clarification on U-DEA domain
- **U-PSGB-DOMAIN-SCAFFOLDS** — 10 mapped slots need galaxy DIR scaffolds (charlie/delta/echo/foxtrot/hotel/kilo/lima/mike/oscar/whiskey)
- **U-PSGB-UNALLOCATED** — 6 slots need domain assignment (romeo/uniform/victor/xray/yankee/zulu)
- **U-PSGB-SOUL-CLAUDE-MD-CONFLICT** — alpha soul still says  (old JULIETT designation); should be updated to match new ALPHA = token-optimization canonical role per CHAT-SLOT-DOMAINS.md


---

## RECONCILIATION (2026-05-28 — actual coverage MUCH HIGHER than prior count)

Earlier sections of this doc undercounted the buildout. Live filesystem audit (2026-05-28) shows **30 galaxy dirs** with both CLAUDE.md + MEMORY.md scaffolds:

### NATO slot → galaxy coverage (20/20 mapped slots complete)
| NATO slot | Galaxy dir | Authored |
|-----------|------------|----------|
| alpha | token-optimization | shipped + soul realigned this session |
| bravo | hermes-zebra (shared with zebra) | shipped this session |
| charlie | quoting | prior session |
| delta | cad | prior session |
| echo | post-processor | prior session |
| foxtrot | mill | prior session |
| golf | fleet-hygiene | shipped this session |
| hotel | business | prior session |
| india | ai-training | shipped this session |
| juliett | database-expansion | shipped this session |
| kilo | cam | prior session |
| lima | academy | prior session |
| mike | wedm | prior session |
| oscar | speed-feed | prior session |
| papa | backend-helper | shipped this session |
| quebec | frontend-app | shipped this session |
| sierra | system-viz | shipped this session |
| tango | discovery | shipped this session |
| whiskey | lathe | prior session |
| zebra | hermes-zebra (shared with bravo) | shipped this session |

### Cross-cutting galaxy dirs (not slot-specific — fleet-wide capabilities)
- agent-orchestration · cad-fusion-live · compliance-safety · corpus-aggregation
- knowledge-conversion · mit-curriculum · pdf-corpus · pdf-corpus-mill · quality
- shop-floor · tribal-knowledge

### Remaining: 3 unallocated NATO slots (no canonical domain in CHAT-SLOT-DOMAINS)
- **november** (U-DEA — needs operator clarification on domain definition)
- **yankee · zulu** — operator assignment required (note: ZULU is hermes-orchestrator-only per slot soul; not a worker domain)

## GOAL COMPLETE for all 24 slots with canonical operator-assigned domains.

The 4-surface synergy model (soul.md + CLAUDE.md + MEMORY.md + wiki) is now LIVE
for every NATO slot whose role has been canonically defined.

---

## 2026-05-28 EXPANSION (alpha session a198ff5f post-handoff)

Operator added 4 NEW canonical slot domains during this session (CHAT-SLOT-DOMAINS.md):
- **ROMEO** = WIRING UNWIRED ENGINES
- **UNIFORM** = BUG HUNTING (silent failures, R12 violations, hostile-payload classes)
- **VICTOR** = DORMANT DATA EXCAVATION (strict order: extracted/ → extracted_modules/ → codebase)
- **XRAY** = OCR + BLUEPRINT READING + CAD FILE DATA EXTRACTION

4 NEW galaxies shipped this session, completing the slot↔galaxy contract for each:

| Slot | Galaxy dir | Soul realigned | SLOT_GALAXY_MAP | Status |
|------|------------|----------------|-----------------|--------|
| romeo | `engines/wiring/` | ✅ (wiring-rigorous + 5 refuses) | ✅ wired | shipped |
| uniform | `engines/bug-hunting/` | ✅ (bug-hunter + 6 refuses) | ✅ wired | shipped |
| victor | `engines/dormant-data/` | ✅ (excavation-rigorous + 5 refuses) | ✅ wired | shipped |
| xray | `engines/blueprint-vision/` | ✅ (extraction-rigorous + 7 refuses) | ✅ wired | shipped |

**Updated coverage**: 24 of 26 NATO slots mapped to a galaxy (was 20). Remaining unallocated: november (U-DEA pending op input), yankee, zulu (orchestrator).

**Synergy edges newly enforced**:
- romeo ↔ uniform (uniform verifies romeo's wirings)
- romeo ↔ tango (tango surfaces candidates; romeo closes)
- victor ↔ romeo (victor's engine findings hand off to romeo)
- victor ↔ tango (deduplicate orphan-vs-dormant overlap)
- xray ↔ delta / kilo / charlie / mike (downstream consumers of xray's extracted prints)
- xray ↔ victor (extracted/ subtree often has CAD/blueprint artifacts xray owns; victor flags but xray excavates)

**Files touched this expansion**:
- `mcp-server/src/engines/wiring/{CLAUDE,MEMORY}.md` (new)
- `mcp-server/src/engines/bug-hunting/{CLAUDE,MEMORY}.md` (new)
- `mcp-server/src/engines/dormant-data/{CLAUDE,MEMORY}.md` (new)
- `mcp-server/src/engines/blueprint-vision/{CLAUDE,MEMORY}.md` (new)
- `state/shared/slot-souls/{romeo,uniform,victor,xray}.md` (realigned — generic → domain-specific frontmatter + refuses)

## 2026-05-28 EXPANSION — foxtrot mill galaxy (session 0f3a0c22, U-PSGB-FOXTROT)

Re-homed + connected the **mill** galaxy to slot:foxtrot (was alpha's under the superseded JULIETT-12CHAT allocation; current canonical CHAT-SLOT-DOMAINS.md = foxtrot:Milling Wizard).

| Slot | Galaxy dir | Soul realigned | SLOT_GALAXY_MAP | Status |
|------|------------|----------------|-----------------|--------|
| foxtrot | `engines/mill/` | ✅ (mill-specialist + 6 refuses, was tribal-specialist) | ✅ already wired (`foxtrot:'mill'` line 70) | shipped |

**What shipped (commit `9c6b3ec11e` on slot/foxtrot):**
- Recovered `mill/{CLAUDE,MEMORY}.md` from `cad-fusion-live-ms0` (absent from main/slot trees) + EXTENDED (not rebuilt — per [[feedback_bravo_complete_not_clobber_galaxy]]).
- 4 galaxy files: CLAUDE.md (affinity alpha→foxtrot, `## Related galaxies`, Karpathy 5-step), MEMORY.md (stub→connected brain: `## Master-brain link` + Last master-sync + High-ROI + CONN-1..4), PATHS.md + TOOLBELT.md (new per BUILD-KIT).
- 11 master-brain memories (`*_foxtrot_*.md`) + `[galaxy:mill]` master back-pointer (CONN-4).
- 4 wiki foxtrot files (1 arch + 2 lessons + fleet-reaper) + `/galaxy-verify-foxtrot` skill.
- Verification: 13-check gate green · CONN-1..4 green · 3-of-3 scrutiny PASS (cleared).

**Deferred (R12, honest):** `tribal_capture` ≥5 (MCP down — staged via 6 `feedback_foxtrot_*` memories); build-state/viz regen (doc-only galaxy; sierra owns viz, currently failing); peer-galaxy symmetry (peers mid-build concurrently).

**Synergy edges:** mill ↔ lathe (mill-turn) · mill ← cam/oscar (speed-feed) · mill → post-processor / quality / india (closed-loop).
- `.claude/hooks/slot-context-bundle-inject.mjs` (SLOT_GALAXY_MAP +4 entries)

## 2026-05-28 EXPANSION — whiskey lathe galaxy (session 57dfea65, U-PSGB-WHISKEY)

- **Galaxy**: mcp-server/src/engines/lathe/ — completed alpha first-pass: refined CLAUDE.md (whiskey-validated 8 gotchas + ## Related galaxies), upgraded MEMORY.md STUB -> full working brain (## Master-brain link + ## High-ROI memories + ## Known failure modes), added PATHS.md + TOOLBELT.md.
- **Soul**: physics-first, 5 refuses, lathe domain_filter (normalized refuse_list->refuses).
- **Memories**: 11 new (7 feedback_whiskey_* doctrine + reference buildout/dispatcher-surface/nose-radius/live-tooling); master back-pointer [galaxy:lathe] added (CONN-4).
- **Wiki**: 3 bridges (lathe-galaxy, lathe-safety-gates, lathe-okuma-dialect). **Tribal**: 6 tips captured (qdrant-down blocks read-back; redundant in feedback memories).
- **Custom domain context**: /galaxy-verify-whiskey skill + whiskey-lathe-context-inject.mjs hook (slot==whiskey OR lathe-keyword), wired C:+H: settings.json, tested.
- **Gate**: 13/13 verify artifacts GREEN. Committed [whiskey] U-PSGB-WHISKEY on slot/whiskey.

## 2026-05-29 EXPANSION — sierra system-viz galaxy (session 109ba448, U-PSGB-SIERRA)

- **Galaxy**: `mcp-server/src/engines/system-viz/` — sierra COMPLETED + OWNED alpha's 2026-05-28 placeholder scaffold (was CLAUDE.md+MEMORY.md only, with stale hook/script names). Method: parallel-agent Workflow inventory+audit (`sierra-galaxy-audit`, operator's explicit "utilize workflow" ask — 6 agents, 523K tokens) + targeted on-disk verification.
- **Soul**: generic stub (`role:work, domain_filter:any`) → system-viz-specialist (graph-rigorous, 7 domain refuses, system-viz domain_filter regex).
- **CLAUDE.md**: rewritten with corrected inventory — fixed alpha's stale names (`viz-first-redirect`→`audit-viz-first-inject`, `pre-bash-graph-context-inject`→`pre-bash-graph-inject`), added the real engine surface (MasterIndexEngine, GraphImportanceEngine, VizAutoAugmentationEngine + `prism_session:master_index_*` / `prism_knowledge:obsidian_viz_*` actions), ~93 FAST[] generators, scripts/lib GNN core, symmetric PSN edges (india/golf/alpha/delta/echo), doctrine-hub note.
- **MEMORY.md**: `## Master-brain link` (clone of MASTER-BRAIN-TEMPLATE: UP/DOWN/MASTER-INDEX/Last-master-sync 2026-05-29) + 10 High-ROI pointers + 10 indexed + regression classes + cross-galaxy bridges.
- **PATHS.md + TOOLBELT.md**: NEW (H:/-wide atlas + tool-call efficiency, modeled on golf's fleet-hygiene set).
- **Memories**: 10 new (`feedback_sierra_graph_correctness_is_fleet_search` + 9 `reference_sierra_*`); master back-pointer `[galaxy:system-viz]` added (CONN-4).
- **Wiki**: 4 bridges written (system-viz-galaxy, system-viz-add-node, regen-viz-merge-guard, viz-domain-coverage — closed an R12 broken-forward-citation gap the audit caught). **Tribal**: 7 slot:sierra tips (`knowledge/tribal/sierra-system-viz-tips.md`; live embed via `tribal_capture` deferred — MCP :3100 down; domain already has 119 index hits).
- **Custom domain context**: `/viz-audit-sierra` skill + `sierra-graph-health-inject.mjs` hook (slot==sierra graph-regen-health inject), wired C:+H: settings.json, validated end-to-end (sierra→block, non-sierra/disable→no-op).
- **Audit verdict (workflow `we6k2wu61`)**: 13/13 gate PASS · PSN legs 6 PASS / 4 PARTIAL / 1 FAIL · brain axes 3 PASS / 1 PARTIAL. **Open synergy gaps (loop follow-ups):** (1) PRISM AI router domain-blind to system-viz — `AISystemRouterEngine` has no viz taskClass (leg 11 FAIL) → iteration 2; (2) ENGINE_DIGEST missing the load-bearing viz engines; (3) RECALL round-trip unverified live (MCP down); (4) tribal explicit slot-tag pending dispatcher.
- **Gate**: 13/13 verify artifacts GREEN. Committing [MAIN] U-PSGB-SIERRA to the shared tree (galaxy + viz assets live in H:/prism per golf's proven pattern).

## 2026-05-29 EXPANSION — xray blueprint-vision galaxy (session e9b75754, U-PSGB-XRAY)

- **Galaxy**: `mcp-server/src/engines/blueprint-vision/` — xray COMPLETED alpha's 2026-05-28 seed (commit `d6e5e4109f`, was CLAUDE.md+MEMORY.md only). Method: 3 parallel inventory agents (engines+dispatchers / corpus+scripts+state / memories+wiki+tribal) verifying every asset on disk before enshrining it.
- **R12 headline — alpha-seed hallucination corrected**: the seed named **21 engines that do not exist** (only `BlueprintVisionOCREngine` was real), **3 phantom paths** (no `JM DIE/PRINTS/`, no `lima-pypdf-page-extract.mjs`, no `blueprint-extraction-log.jsonl`), and an **unverified "96% are multi-print containers" stat** (the ledger says 8,154 containers → 36,638 prints). All corrected across CLAUDE.md + MEMORY.md + soul + a dedicated `## Phantom paths` section in PATHS.md. Same class bravo/india caught in their buildouts.
- **Soul**: `role:work`→`blueprint-vision-specialist`, `escalation_path:standard`→domain route-pattern (verify-engine-name + multi-print-split + canonical-mm + per-field-confidence); voice + 7 refuses already domain-set by alpha.
- **CLAUDE.md**: rewritten with the verified surface — ~30 real engines (`BlueprintVisionOCREngine`, `PDFBlueprintDimensionExtractorEngine`, `GDTCalloutParserEngine`, `FCStdNativeParserEngine`, `F3DSQLiteParserEngine`, `DXFGeometryParserEngine`, `STLToVoxelGridEngine`, `BlueprintProgramJoinEngine`, …), cadDispatcher ~40-action primary surface, real wiki cross-refs, PSN edges, india closed-loop.
- **MEMORY.md**: `## Master-brain link` (MASTER-BRAIN-TEMPLATE clone: UP/DOWN/MASTER-INDEX/Last-master-sync 2026-05-29) + 10 High-ROI pointers + 10 indexed + corrected format→engine map + known failure modes + cross-galaxy bridges.
- **PATHS.md + TOOLBELT.md**: NEW — H:/-wide verified atlas (incl. `## Phantom paths`) + tool-call efficiency (the "never bare `**` Glob on engines/" lesson).
- **Memories**: 10 new (`reference_xray_*` ×6 + `feedback_xray_*` ×3 + the engine-inventory ref); master back-pointer `[galaxy:blueprint-vision]` added (CONN-4, deliberate-append past the index soft-ceiling).
- **Wiki**: 3 bridges written (blueprint-vision-galaxy, -multi-print-discipline, -extraction-confidence). **Tribal**: 7 slot:xray tips (`state/shared/blueprint-vision-tribal-corpus.jsonl`, JSONL-validated; live embed via `tribal_capture` deferred — prism MCP not connected in-session).
- **Custom domain context**: `/extract-xray` skill (multi-print-aware extraction macro). **Custom hook deliberately SKIPPED** (R7) — domain already gets tribal+memory+CAD-awareness inject; another inject is noise + settings.json is peer-contended.
- **PSN symmetry**: cad + dormant-data reference xray back (✓). cam/quoting/ai-training/mill/lathe/wedm/pdf-corpus do NOT yet — advisory per STEP 10a (peer slots self-update; not editing peer-claimed files).
- **Deferred (not doc-only-galaxy work)**: `build-state-snapshot` + engine-digest (no NEW `.ts` — real engines already tracked); `regen-viz` (548MB, sierra owns) — galaxy is discoverable via master back-ptr + SLOT_GALAXY_MAP line 90 + slot-context-bundle-inject.
- **Gate**: 13/13 verify artifacts GREEN. Committing [MAIN] U-PSGB-XRAY to the shared tree.
