# post-processor — slot:echo

_Assessment date: 2026-06-13. Assessor: subagent (claude-sonnet-4-6). Sources read: CLAUDE.md, MEMORY.md, PATHS.md, TOOLBELT.md, SOUL.md, AWARENESS glob, main CLAUDE.md head (120 lines for universal/domain split)._

---

## Current state

**Size:** 16,266 bytes / 149 lines.

**Quality grade: GOOD**

The file was rebuilt from an "HONEST STUB" placeholder on 2026-05-28 by slot:echo (claude-223d9a61) and is substantively complete for the domain. It passes the MASTER-BRAIN-TEMPLATE intent. No fabricated engine names or file paths were found — every cited engine was verified on disk via Glob (PostProcessorPipelineEngine.ts, GCodeSafetyAnalyzerEngine.ts, MasterPostProcessorEngine.ts confirmed present).

**Issues found (not blocking, but worth trimming):**

1. **One stale path claim:** `## Canonical constants` table cites `mcp-server/src/data/controller-dialects/<vendor>.ts` as the canonical dialect location, then notes in PATHS.md (verified 2026-05-29 audit) that this directory does NOT exist — only `okuma-dialect-knowledge.ts` exists as a per-vendor file. The CLAUDE.md table still says "controller-dialects/<vendor>.ts" with "(verify)" hedge; should be corrected to the actual verified path.

2. **Cross-cutting methodology section (lines 124–149) is generic fleet doctrine** injected by the enrichment program, not echo-specific. It restates PC specs, Ollama model tiers, loop discipline, Obsidian vault routing, LoRA/CAG/RAG harness — all universal. Zero post-processor content. Pure token waste when loaded every turn.

3. **AI-SYSTEMS-STATE block (lines 136–143)** is a fleet-wide pointer injected identically into all 34 galaxies. It belongs in a pointer line only, not a full block.

4. **Critic + keep-working contract stanza (lines 145–150)** is global doctrine (R6 + R12) that applies to all 26 slots identically. Pointer only; no post-processor specificity.

5. **The `prism_pp` dispatcher** (654 actions, live as of commit ab0c5d5193) is mentioned only in MEMORY.md (not in CLAUDE.md at all). The primary daily dispatcher surface for echo is missing from the galaxy doctrine file.

6. **`post-nc-dialect-lint.mjs` and `post-gen-reward.mjs`** (echo's two unique quality-gate scripts, documented in PATHS.md) are absent from CLAUDE.md. These are the canonical test/reward loop for post work — every echo session should know them.

7. **Git lane reconciliation block** (lines 14–15) documents a 2026-06-10 worktree staleness state ("slot/echo is a stale fossil — 4119 commits behind"). This is a transient ops note that should live in a handoff, not the persistent doctrine file.

8. **`ppDispatcher` mention absent** — the file references `camDispatcher` (~155 post cases) and `productDispatcher` (24 ppg), but does not mention that `prism_pp` / `ppDispatcher` is now the PRIMARY post-processor MCP surface with 654 actions (the surface a naive cam-only grep misses per MEMORY.md 2026-06-11 audit).

---

## KEEP

These sections are accurate, load-bearing, and post-processor-specific — retain verbatim:

- **"What lives here" / Tier-1 product surface** (lines 19–43): MasterPostProcessorEngine fanout, UnifiedAGIEngine 14-controller surface, PostProcessorPipelineEngine 7-phase/38-stage, MasterPostFineTuningEngine, HurcoV11MillMasterPostEngine — verified on disk, accurate engine names.
- **G-code core (12 engines)** (lines 25–33): all engine names verified.
- **Controller-specialist stub-wired list** (lines 35–41): WEDMPost*, LathePostProcessorAI, LathePostGeneratorActiveLearning, JMDiePostProcessorLearning — accurate; includes the dark-in-practice qualification.
- **Dispatchers section** (lines 45–48): camDispatcher action groupings (lathe_postgen/master_post/pp_/ppg_/post_/wedm_dialect_ etc.) — verified structure.
- **Skills list** (line 49): /post-generate /post-validate /post-harden /post-register /post-diff /lathe-postgen /lathe-master-post /post-status-echo — all exist in .claude/commands/.
- **JM Die fleet** (line 51): 12 .cps, 4 controllers (Haas/Hurco/Okuma/Fanuc), wire-EDM post absent — verified via PATHS.md + MEMORY.md.
- **Canonical constants table** (lines 53–63): the HARD RULE against inlining is correct; fix path for controller-dialects (see DROP/fix below).
- **Anti-patterns / echo refuses** (lines 65–72): all 7 are accurate, domain-specific, and non-trivially load-bearing (byte-equivalence proof, legal gate U-LEGAL-13, stub-wired != wired). Keep verbatim.
- **Karpathy 5-step adapted for post-processor** (lines 74–80): the domain-specific CLASSIFY/TECHNIQUE/EDGE/FAILURE instantiation is excellent (dialect tokenizer FSM, canned-cycle table-lookup, modal-state leak). Keep.
- **Related galaxies PSN edges** (lines 82–94): accurate cross-slot edges with bridge descriptions.
- **Wiki cross-refs** (lines 96–100).
- **Test commands** (lines 102–106): accurate.
- **Closed-loop integration with india** (lines 108–115): accurate, post-processor-specific (xproc_outcome_publish, pp_outcome_emit).
- **Cross-refs / siblings** (lines 117–121): pointer to PATHS.md, TOOLBELT.md, galaxy siblings.

---

## DROP

Remove or reduce to a one-line pointer:

1. **"## GIT LANE DISCIPLINE" block (lines 12–15):** The rule itself (commit to slot/echo) should be a one-liner pointer to `feedback_commit_to_slot_worktree`. The reconciliation detail ("4119 commits behind, 12 ahead, SHAs") is a transient ops state — belongs in the HANDOFF, not the doctrine file. This detail rots immediately and adds ~6 lines of dead weight every session.

2. **"## Cross-cutting methodology" block (lines 124–149):** Entire section is generic fleet doctrine (PC specs, Ollama tiers, loop discipline, Obsidian vault, LoRA/CAG/RAG). Zero post-processor content. Injected identically by `wire-galaxies-to-operational-context.mjs` into all 34 galaxies. Drop the full block from CLAUDE.md; it is already in TOOLBELT.md §OPERATIONAL CONTEXT and is universal CLAUDE.md doctrine.

3. **AI-SYSTEMS-STATE HTML comment block (lines 136–143):** Fleet-wide auto-injected pointer with zero post-processor specificity. Compress to: `> AI-systems fleet state: \`knowledge/memories/patterns/ai-systems-fleet-state.md\` — [[reference_ai_systems_fleet_state_2026_06_11]]`.

4. **Critic + keep-working contract stanza (lines 145–150):** Global R6 + R12 doctrine. Every slot has this. Pointer only: `> Universal: R6 (context growth ≠ stop) + R12 (fail loud) — see main CLAUDE.md §CLAUDE.md RULES`.

5. **Stale controller-dialects path in canonical constants table:** `controller-dialects/<vendor>.ts` dir does NOT exist (PATHS.md 2026-05-29 audit). Fix to: `mcp-server/src/data/okuma-dialect-knowledge.ts` (only per-vendor dialect .ts; controller knowledge in controller-knowledge.json).

**Token savings estimate from drops: ~50 lines / ~3,000 tokens per session load.**

---

## ADD (domain-specific — the heart of this assessment)

### 1. `prism_pp` dispatcher — the primary post-processor MCP surface (CRITICAL MISSING)

This is the most important gap. `prism_pp` / `ppDispatcher` has 654 top-level actions across 14 categories and is now LIVE (commit ab0c5d5193, verified 2026-06-10). The current CLAUDE.md never mentions it. Every echo session probing "what actions exist for post-processor?" reads only the ~155 camDispatcher cases and misses ~500 additional actions. Add:

```
**`prism_pp` dispatcher** (ppDispatcher, 654 actions, LIVE as of ab0c5d5193) — the PRIMARY
post-processor MCP surface. 14 categories incl. pp_generate / pp_validate / pp_analyze /
pp_translate / pp_controller_translate / pp_outcome_emit / ppg_* etc. Use BEFORE camDispatcher
for any pp_ work. A naive camDispatcher-only grep misses ~80% of the post-processor action surface.
Verify live: grep `case "pp_` mcp-server/src/tools/dispatchers/ppDispatcher.ts
```

### 2. Quality-gate scripts (MISSING from CLAUDE.md — both verified in PATHS.md)

```
## Echo's canonical quality loop (pure-node, no build/MCP needed)
- `scripts/post-nc-dialect-lint.mjs` — 8-rule static NC dialect+safety linter (coolant-before-spindle,
  feed-mode G93/G94/G95, retract, comment-style okuma/fanuc, modal-tap, program-end); turning-aware;
  CLI: `node scripts/post-nc-dialect-lint.mjs <file.nc> --dialect hurco [--json] [--strict]`
  Wired as PostToolUse auto-guard: `.claude/hooks/post-nc-dialect-guard.mjs`
- `scripts/post-gen-reward.mjs` — non-circular scored reward for HurcoV11 fine-tuning:
  `scorePost(nc, {dialect, golden, filename})` → `{reward, components:{lint,structure,alarm,golden?}}`;
  alarm gate uses the 2,588-entry controller-alarm-database.json (alarm DB at `data/controllers/`);
  CLI: `node scripts/post-gen-reward.mjs <out.nc> --dialect hurco [--golden ref.nc]`
```

### 3. `pp_outcome_emit` close-the-loop action (MISSING from CLAUDE.md)

The post→india self-learning emit side was phantom until commit 0777fda9d2 (MEMORY.md 2026-06-11). Add:

```
**ACTION FOR EVERY POST-GEN:** call `prism_pp:pp_outcome_emit` (or `recordEmission`) from
PostProcessorPipelineEngine's P6 emit path so every real post auto-publishes to india's
OutcomeCaptureBus (domain:"post_processor"). The dispatcher action exists; the in-pipeline
auto-call is echo's remaining work.
```

### 4. Alarm-aware post validation gap (actionable underused synergy — in PATHS.md only)

```
**Underused synergy — alarm-aware post-gen:** controller-alarm-database.json holds 2,588 alarms
/ 13 controllers. NOT yet wired into PostProcessorPipelineEngine P5 safety phase. Wiring = cross-
check emitted G/M sequences against this DB to avoid known-alarm-triggering output. High-leverage
gap (data exists, wire absent).
```

### 5. Controller dialect quick-reference (tribal gotchas — in MEMORY.md only, not CLAUDE.md)

```
## Dialect gotcha cheatsheet (canonical traps — every controller emit)
- Feed-rate mode: G93 inverse-time vs G94 ipm vs G95 ipr — mismatch = wrong cycle time or crash
- Coolant order: M8 BEFORE M3-at-speed = wet floor; M3 then M8 = correct
- Okuma comment brackets: `[comment]` NOT `(comment)` — Fanuc uses `()`
- Siemens MCALL modal-tap vs Fanuc G84 — not interchangeable
- Decimal-point convention: some Fanuc variants reject `0.5`, require `.5` (or vice-versa)
- Modal state across M98/M99 subprogram calls: leaked modal = silent wrong-feed on re-entry
- Safe retract missing between ops: tool drags across the part at feedrate
- Mazatrol G-code vs Mazatrol Conversational: two separate emit paths, never mix
- Heidenhain: iTNC 530 vs TNC 7 are NOT code-compatible (G vs L format, cycle numbering)
- G68.2 (5-axis WCS tilt) vs G54.4 (workpiece error compensation): entirely different semantics
```

### 6. Domain-specific "what NOT to do" consolidation (currently split across anti-patterns + MEMORY.md)

Consolidate into one section in CLAUDE.md:

```
## What echo refuses (full list)
- Emit G-code by string concatenation — always route through PostProcessorPipelineEngine 7-phase
- Skip P1 physics (Kienzle/Taylor force/temp/wear) — stubs P5 safety with no physical basis
- Skip P5 safety+tribal — collision on rapid, coolant sequencing, known-alarm patterns
- Inline feed/speed values — always route through `cam_speedfeed_compute` (oscar SFC)
- Inline dialect G/M codes — read from controller-knowledge.json + okuma-dialect-knowledge.ts
- Inline physics constants — import from mcp-server/src/physics/constants.ts
- Treat `engine.method?.()` + "method not callable" fallback as "wired" — it's dark-in-practice
- Ship a post change without byte-equivalence vs golden NC archive (MasterPostByteEquivalenceCI)
- Re-derive dialect codes from copyrighted manuals — U-LEGAL-13 gate; public manuals only
- Edit HurcoV11*/WEDMPost* without chat-bus claim — 16 in-flight handoffs (collision risk)
- Use prism_cam alone for post queries — prism_pp (654 actions) is the PRIMARY surface
- Claim an action is wired before grep-verifying it routes to a real engine method (not a stub)
```

### 7. Key data stores echo consumes daily (sizes verified in PATHS.md — absent from CLAUDE.md)

```
## Key data stores (read via prism_data — never Glob/re-enumerate)
- AlarmDB: 2,588 alarms / 13 controllers — `data/controllers/`
- MachineDB: 1,015 machines (incl 21 JM fleet) — `data/machines/`
- PostProcessorDB: 34 registered posts — `mcp-server/src/registries/PostProcessorRegistry.ts`
- ToolDB: 13,967 tools — `data/tools/`
- CAMSystemDB: 61 CAM system integrations — `data/databases/CAMSystemDB.json`
- NC corpus: 160,582 programs (.nc/.min/.eia/.tap/.ngc/.pgm) — JM DIE + data/programs/
- Post definitions: 13,790 .cps (Fusion) + 52 Mastercam .pst/.spm
Query: `prism_data:database_search` / `database_list` / `node scripts/db-toolbelt.mjs --status`
```

### 8. Pending open-work state pointer (for fast session orientation)

```
## Open work (fast orientation — read before picking a unit)
- `state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md` — ROI-ordered open task list (canonical)
- `state/shared/specs/POST-GEN-COVERAGE-AUDIT-2026-05-29-echo.md` — coverage: PARTIAL ~40%;
  4 P0 machine gaps (Haas PRE-NGC, Roku-Roku, EA sinker, FA10S mis-route)
- DORMANT: slot/echo branch holds 12 unintegrated commits (PostEmitSafetyGate, PostFeatureAudit,
  PostLibrary, HURCO-POST-PIPELINE-BRIDGE iters 9-16) — operator go-ahead needed before merge
- Active milestones: MS-MASTERPOST 44/44 pending (gated U-LEGAL-13), WEDM-P2P-PRODUCTION-MS0 6/24
```

---

## IDEAL SECTION OUTLINE

```
# Post-Processor Galaxy (ECHO slot)
## Domain scope (3 lines)
## Git lane (1-line pointer to feedback_commit_to_slot_worktree)
## What lives here
  ### Tier-1 MasterPost engines (saleable product)
  ### G-code core engines
  ### Controller-specialist (stub-wired leverage class)
  ### CAM→post bridges
## Dispatchers (prism_pp PRIMARY + camDispatcher secondary + productDispatcher ppg)
## Skills
## JM Die fleet
## Canonical quality loop (post-nc-dialect-lint + post-gen-reward)
## Canonical data stores (echo consumes daily — sizes + query)
## Canonical constants (HARD RULE: never inline)
## Dialect gotcha cheatsheet (10 traps)
## What echo refuses (consolidated anti-pattern list)
## Karpathy 5-step for post-processor domain
## Open work (state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md pointer)
## Related galaxies PSN edges
## Closed-loop integration with india (xproc_outcome_publish + pp_outcome_emit gap)
## Underused synergy: alarm-aware post validation gap
## Wiki cross-refs
## Test commands
## Cross-refs / siblings
## AI-systems fleet state (1-line pointer)
```

---

## UNIVERSAL-CORE POINTER

The following universal rules must remain available to echo but should NOT be duplicated in the galaxy CLAUDE.md. Reference as a single pointer block:

```
> Universal doctrine: see H:/PRISM/CLAUDE.md for —
> - SCRUTINY GATE (3-of-3 per-file + stop gate)
> - PER-CHAT HANDOFF (per-agent-handoff.mjs read/write)
> - R1–R15 (Karpathy + agent-era rules)
> - UNITS-FIRST safety rail
> - No-stub engine enforcement
> - Commit format [SCOPE]/U-ID
> - AI system routing (Ollama fallback ladder)
> - Fleet-reaper / golf slot doctrine
> - GOLF SLOT / fleet hygiene
> - Slot-worktree lane discipline (full protocol)
```

These are injected by hooks (wiki-precheck-inject, inventory-check-guard, build-state-inject, master-index-precheck-inject) and should never be re-stated in the galaxy file.

Domain-specific to echo that must NOT be delegated to main:
- prism_pp dispatcher surface (654 actions)
- PostProcessorPipelineEngine 7-phase contract
- Dialect gotcha cheatsheet
- Byte-equivalence + U-LEGAL-13 gate
- Quality loop scripts (post-nc-dialect-lint + post-gen-reward)
- JM .cps fleet inventory
- Stub-wired dark engine list
- Galaxy PSN edges (kilo/oscar/whiskey/mike/india/foxtrot/alpha/lima)
