# lathe — slot:whiskey

## Current state

**Size:** 15,869 bytes · 190 lines
**Quality grade:** GOOD

The file is a genuine first-pass galactic center (authored by alpha/mill specialist, not whiskey). It is structurally sound — scope definition, constants reference, engine pointers, test commands, gotchas, tribal pointers, cross-galaxy edges, closed-loop integration stanza, and cross-cutting methodology block are all present. No outright fabrications found in the safety-critical content. Key verified facts:
- `turningDispatcher.ts` EXISTS (373 actions, verified)
- `LatheAdvancedOperationsEngine.ts` EXISTS
- `HardTurningCapstoneEngine.ts` EXISTS
- `BoringBarDeflectionEngine.ts` EXISTS
- `CSSChipLoadInvariantCoordinatorEngine.ts` EXISTS
- `H:/.claude/hooks/whiskey-lathe-context-inject.mjs` EXISTS

**Stale / inaccurate content found:**
1. **§1 "Slot affinity: none canonical"** — STALE. whiskey IS the canonical lathe-specialist slot (operator-codified 2026-05-27, `reference_whiskey_lathe_soul_designation_2026_05_27.md`; SOUL.md confirms `slot: whiskey`). This line misleads and wastes tokens.
2. **§3 engine list is incomplete + does not cite the dispatcher** — lists ~12 individual engines but omits the primary daily-use surface: `turningDispatcher.ts` (373 actions) and its 3 sub-dispatchers (`turningProgramDispatcher` 14 actions, `threadDispatcher` 17, `threadingPipelineDispatcher` 3). The engines listed are the implementation layer; a lathe chat reaches them THROUGH the dispatcher.
3. **§3 `workholding.ts` registry ref is WRONG** — CLAUDE.md §3 table cites `mcp-server/src/registries/workholding.ts` but PATHS.md explicitly states "NO `workholding.ts` — workholding is engine-level" (e.g. `SoftJawProfileEngine`, `ChuckJawForceEngine`). Fabricated registry path.
4. **§5 gotcha #3 cites `LatheSurfaceFinishEngine`** — parenthetical "(if not yet existing — verify before creating)" written by alpha who was uncertain. PATHS.md does not list this engine. This is an unverified symbol embedded in a gotchas section. Must be resolved: either confirm the engine exists (Grep required) or reframe the gotcha around the formula without the engine cite.
5. **Cross-cutting methodology block (§ after §7)** is largely generic fleet doctrine (loop discipline, Obsidian vault, LoRA/CAG/RAG harness). This is NOT lathe-specific. It duplicates global CLAUDE.md content. At 40+ lines it costs tokens on every cascade load.
6. **`<!-- CRITIC-KEEPWORKING-STANZA -->`** block (9 lines) is pure universal doctrine pointer — already in the root CLAUDE.md. Duplicated here with no lathe-specific content.
7. **`<!-- AI-SYSTEMS-STATE:BEGIN -->`** block is a generic fleet AI-state pointer — identical across all galaxies. Not lathe-specific.
8. **Authoritative free-source corpus** was recently added to MEMORY.md (papa 2026-06-09) but is absent from CLAUDE.md. CLAUDE.md should carry a one-line pointer to those verified foundations.

---

## KEEP

All of these are accurate and load-bearing for lathe daily work:

- **§1 Domain scope** — the op taxonomy (OD/ID/facing/threading/parting/grooving/knurling/taper/contour/mill-turn) and galaxy boundary exclusions are correct and irreplaceable. Fix: remove "slot affinity: none canonical" line and replace with "slot: whiskey (whiskey IS the lathe-specialist)".
- **§2 Canonical constants table** — the five constant families (Kienzle kc1.1, Kienzle mc, Taylor C/n, material density, nose-radius) pointing at `mcp-server/src/physics/constants.ts` are accurate and safety-critical. NodeNext `.js` suffix import pattern is correct.
- **§3 engine list (partial)** — keep the seven named engines that were verified: `LatheAdvancedOperationsEngine`, `HardTurningCapstoneEngine`, `HardTurningDecisionEngine`, `LatheAIOrchestrationEngine`, `JMDieLatheProgramUpgraderEngine`, `LatheAutoQuoteFromPrintEngine`, `LatheActualCostReconciliationEngine`. Drop the unverified `LatheSurfaceFinishEngine` cite.
- **§4 Test commands** — `npx vitest run -t "Lathe"` and the HardTurning test pattern are correct per PATHS.md.
- **§5 Gotchas #1, #2, #4, #5, #6, #7** — verified against actual engine names (LatheAdvancedOperationsEngine validates CSS cap and thread entry; BoringBarDeflectionEngine enforces L/D; Fusion360MillTurnBridgeEngine handles sub-spindle phase). Keep all six. Remove or fix #3 (unverified engine cite).
- **§6 Tribal pointers** — `knowledge/wiki/code-tribal/lathe/`, `knowledge/memories/feedback/` search terms, tribal auto-inject on lathe-keyword prompts. All accurate.
- **§7 Cross-galaxy edges** — all 5 edges (mill, quoting, ERP/business, cad/cam, post-processor, quality/SPC) are accurate and verified by PATHS.md.
- **Related galaxies + PSN edges** (speed-feed, shop-floor, ai-training, compliance-safety) — correct.
- **Closed-loop integration with india** — dispatcher calls (`xproc_outcome_publish`, `xproc_kg_project_features`, `prism_knowledge:tribal_capture slot=whiskey`, `xproc_calibration_monitor_record`) — keep; critical for the learning loop and whiskey's soul discipline.

---

## DROP

Content that wastes tokens on every Bibryam cascade load and belongs only in global CLAUDE.md:

1. **Cross-cutting methodology block** (40+ lines after §7) — the PC-specs, loop bookend pattern, Obsidian vault recall path, LoRA/CAG/RAG harness description are fleet-wide doctrine from global CLAUDE.md. The lathe-specific EXCEPTION (CSS/chuck-jaw safety stays on Claude, not Ollama) should be kept as a single bullet; the rest dropped.
2. **`<!-- CRITIC-KEEPWORKING-STANZA -->`** block — 9 lines of pure global doctrine. Drop entirely; pointer to `## HONESTY RULES` in root CLAUDE.md suffices.
3. **`<!-- AI-SYSTEMS-STATE:BEGIN -->`** stanza — generic fleet pointer, identical across all 34 galaxies. Drop from CLAUDE.md; it belongs only in MEMORY.md (where it already lives).
4. **Author note in preamble** — "Author note (slot:alpha = mill specialist):" is historical scaffolding. Drop now that whiskey is canonical.
5. **"Slot affinity: none canonical"** sentence in §1 — stale, contradicted by SOUL.md. Drop.

---

## ADD (domain-specific — the heart of this assessment)

### 1. Primary dispatcher surface (VERIFIED — whiskey's daily work hits these first)
```
turningDispatcher.ts          — 373 actions (THE lathe dispatcher, 3,538 lines)
turningProgramDispatcher.ts   — 14 actions (print→program, feature taxonomy, ISO 286/2768)
threadDispatcher.ts           — 17 actions (threading cycle planning)
threadingPipelineDispatcher.ts — 3 actions (pipeline orchestration)
```
**Critical pre-emit safety gate sequence (run in this order, every program emit):**
1. `prism_turning:lathe_safety_predicate_evaluate` — master predicate gate
2. `prism_turning:lathe_partoff_safety_gate` — parting/cutoff check
3. `prism_turning:lathe_workholding_select_jaw` — chuck/jaw selection
4. `prism_safety:check_spindle_torque` / `prism_safety:check_spindle_power` — spindle envelope (via safetyDispatcher, NOT `lathe_spindle_*` — those actions do NOT exist; common mistake)
5. `prism_calc:turning_force` / `prism_calc:merchant_analysis` — physics validation

### 2. JM Die machine fleet (100% Okuma OSP — SAFETY-CRITICAL for post selection)
All 7 JM Die lathes are Okuma OSP. Wrong post = scrap or crash.
```
LTH-01  Okuma GENOS L300-M       (OSP-P300L, live tooling)
LTH-02  Okuma GENOS L200E-M      (OSP-P300L, live tooling)
LTH-03  Okuma GENOS L400II-E     (OSP-P300L)
LTH-04  Okuma LNC8               (OSP-P200L)
LTH-05  Okuma Crown L1060        (OSP-P100L, older dialect)
LTH-06  Okuma LB 3000EX          (OSP-P200L)
LTH-07  Okuma Multus B250II      (OSP-P300S, MILL-TURN — also foxtrot scope)
```
Access: `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER Glob the 24K-file tree.
Okuma knowledge: `data/okuma-dialect-knowledge.ts` (41K) · `okuma-osp-advanced-knowledge.ts` · `lathe-tribal-tips-okuma.ts`

### 3. Okuma OSP dialect specifics (not in current CLAUDE.md)
- OSP uses **`VCSS` macro variable**, not G96/G97 — Fanuc G96 programs WILL NOT RUN on OSP without dialect translation
- OSP canned cycles differ: `G74` (OSP peck-drill) ≠ Fanuc `G74` (face grooving) — collision risk
- OSP threading: `G78` (single-pass) + `G176` (multi-pass, OSP-specific) — do NOT use G76 for Okuma OSP
- OSP sub-spindle sync: `VWAIT` + `VSYNCH` macros, not M-code pairing — sub-spindle handoff requires OSP macro discipline
- OSP modal cancel: `G1100` clears CSS mode; missing it leaves the machine in speed-limited mode
- Dispatch through `OkumaDialectKnowledgeEngine` for all OSP-specific translation

### 4. Lathe-specific units discipline
- **Feed rate on lathe is ALWAYS IPR (inches per revolution) or mm/rev** — NOT IPM/mm/min (the mill convention). Confusing IPR ↔ IPM causes undercut (tool dragging) or rapid chip load surge.
- CSS (G96) setpoint is in SFM (US) or m/min (metric) — NOT RPM. The computed RPM is `RPM = (CSS_SFM × 3.82) / Diameter_inches`.
- JM Die convention is **INCH** (`G20`) for all lathe programs; still verify `G20`/`G21` per part before any geometry work. Okuma OSP: unit mode set in machine parameter, not G-code — check machine profile.

### 5. Workholding + deflection budget (missing from current §5 gotchas)
- **Chuck jaw force limit:** `ChuckJawForceEngine` enforces centrifugal reduction at speed — at 3000 RPM a standard 3-jaw loses ~30% grip on a 6" chuck. `lathe_workholding_select_jaw` dispatcher gate must be called BEFORE computing feed/DOC.
- **Steady rest requirement:** L/D > 7 workpiece (unspported) → mandatory steady rest. `SteadyRestPlacementEngine` enforces.
- **Soft jaw boring:** `SoftJawBoringGCodeEngine` + `SoftJawProfileEngine` — always bore soft jaws to match part OD within 0.001"; skipping this causes jaw-mark cosmetic defects on finish-turned parts.
- **Tailstock force:** `TailstockForceEngine` — tailstock quill force must not exceed workpiece yield in the axial direction (thin shafts). Gate exists.

### 6. Insert geometry + surface finish chain (missing depth)
- Insert nose radius Ra formula: `Ra_theoretical = f² / (8 × r_nose)` (in matching units). This is why nose-radius and feed are a COUPLED design variable — halving feed quarters Ra; doubling r_nose halves Ra.
- Approach angle (CNMG/DNMG/TNMG) determines radial vs axial force split — high approach angle (95°) pushes force radially into chuck, lower (75°) splits toward tailstock. Critical for thin-wall tubing.
- Insert grade selection for OSP: tribology-matched to Okuma's 18k-hour spindle warranty profile — Sandvik GC4325/GC4035 for steel, GC1115 for stainless per `sandvik-2022-tool-catalog.ts`.

### 7. Top tribal gotchas not in current file
- **G76 multi-pass threading: infeed angle MUST match insert** — 29° for Acme, 30° for metric, 60° for UN. Wrong angle = torn crests. `threadDispatcher:lathe_thread_schedule` enforces; `lathe-g76-thread-validator.mjs` (7/7 tests) is the lint check.
- **Parting-tool width to depth ratio:** peck grooving (G75 Q parameter) is mandatory at depth > 3× tool width; chip packing at depth > 5× breaks the tool. `LathePartingChipClearanceEngine` enforces.
- **CSS on small-diameter ID:** boring a 0.5" bore at G96 S400 = ~3056 RPM — many OSP spindles cap at 2500 RPM on the L300-M with heavy tooling. G50 RPM cap is non-negotiable.
- **Bar feeder remnant eject:** `BarFeedPitchOptimizerEngine` computes the minimum remnant length; if the program allows a part to be cut with insufficient bar remaining, the collet feeds air and crashes the turret.
- **Swiss guide-bushing clearance:** `SwissGuideBushingPhysicsEngine` — guide bushing bore must be within 0.0002" of bar OD; loose fit = chatter; tight fit = seize. Ream the bushing to bar, not nominal.

### 8. Canonical resources and corpora (one-line each — not currently in CLAUDE.md)
- **JM Die A/B corpus:** `JM DIE/CNC LATHE/` (118 customers, 14,475 A/B pairs) — ground-truth training set; scan via `scripts/scan-jm-die-ab-pairs.mjs`
- **Okuma OSP corpus:** `JM DIE/OKUMA/JM Die Company/` (31 customers) — OSP-native dialect programs
- **Vendor turning catalogs:** `data/turning-vendor-catalog-loader.ts` (unifies Sandvik ~5MB, Tungaloy ~3MB, Kennametal, ISCAR, Mitsubishi, Widia, Korloy)
- **Lathe wiki (224 files):** `knowledge/wiki/architecture/engines/lathe/` (122) + `turning/` (26) + `tests/lathe/` (38) + 8 top-level architecture entries
- **Lathe memory brain:** `H:/prism/knowledge/memories/galaxies/lathe/` (~65 files, canonical; has files NOT in C: auto-memory)
- **Tribal vector index:** query via `lathe-tribal-query-engine.mjs` or `prism_knowledge:tribal_search {slot:"whiskey"}` — do NOT load `tribal-embed-index.json` (382MB); also ~75 orphan `.tmp` files (~25GB) — flag for golf, do NOT use
- **Lathe lint brain (MCP-independent):** `scripts/lib/lathe-gcode-lint.mjs` (28 tests, 8 gotchas) — works when port 3100 is DOWN; `/lathe-lint` skill

### 9. What NOT to do in this domain (explicit "refuses" list — complement to SOUL.md)
- Do NOT use Fanuc G76/G78/G74 syntax for Okuma OSP programs — OSP threading and canned cycles differ
- Do NOT write feed rates in IPM for lathe turning operations — always IPR/mm/rev
- Do NOT inline Kienzle kc1.1, Taylor C/n, or SFM/IPR recommendations — import from `src/physics/constants.ts` (hook enforced)
- Do NOT call `lathe_spindle_*` dispatcher actions — they do not exist; use `prism_safety:check_spindle_torque`
- Do NOT write directly to `knowledge/tribal/lathe-*.md` — auto-overwritten on regen; use `prism_knowledge:tribal_capture`
- Do NOT Glob the JM Die tree (`JM DIE/CNC LATHE/`) — 24K files; use `getJMDieCustomerPath()` + `scan-jm-die-ab-pairs.mjs`
- Do NOT load `tribal-embed-index.json` directly — 382MB + ~25GB of leaked `.tmp` orphans alongside it
- Do NOT assume G96 (Fanuc CSS) runs on Okuma OSP — translate via `OkumaDialectKnowledgeEngine`
- Do NOT skip `lathe_safety_predicate_evaluate` before any program emit — it is the master gate for all lathe outputs
- Do NOT create a new lathe engine without `duplicationGuardEngine.checkBeforeCreating()` — 194 `Lathe*.ts` + 57 turning-family engines; almost certain to duplicate

### 10. Dispatcher actions quick-ref (most frequently called)
```
prism_turning:lathe_safety_predicate_evaluate   — ALWAYS first
prism_turning:lathe_partoff_safety_gate         — before any cutoff/parting op
prism_turning:lathe_workholding_select_jaw      — before DOC/feed planning
prism_turning:lathe_thread_schedule             — multi-pass G76 plan
prism_safety:check_spindle_torque               — spindle envelope check
prism_safety:check_spindle_power                — power envelope check
prism_calc:turning_force                        — Kienzle tangential force
prism_calc:merchant_analysis                    — shear-plane force decomp
prism_knowledge:tribal_search {slot:"whiskey"}  — lathe tribal recall
prism_knowledge:tribal_capture {slot:"whiskey"} — write tribal learning
```

---

## IDEAL SECTION OUTLINE

```
1. Domain scope + slot identity
   - op taxonomy (OD/ID/facing/threading/parting/grooving/taper/contour/mill-turn/swiss)
   - what is EXCLUDED (mill, wedm, sinker)
   - slot: whiskey (canonical lathe-specialist)

2. JM Die machine fleet (Okuma OSP 100%)
   - machine table (LTH-01..07 with OSP version)
   - access pattern (getJMDieCustomerPath, NOT Glob)
   - Okuma OSP dialect differences vs Fanuc (VCSS, G78/G176, VWAIT/VSYNCH, G74 ambiguity)

3. Units discipline (lathe-specific)
   - feed = IPR/mm·rev (NEVER IPM/mm·min)
   - CSS setpoint = SFM or m/min (not RPM)
   - JM Die convention = INCH (G20) — verify per part; OSP unit = machine param
   - 25.4× error risk if IPR ↔ IPM confused

4. Primary dispatcher surface
   - turningDispatcher (373 actions) + 3 sub-dispatchers
   - pre-emit safety gate sequence (5 steps in mandatory order)
   - common action quick-ref table

5. Physics constants (READ-ONLY pointer)
   - all from src/physics/constants.ts — never inline
   - Kienzle table (kc1.1 per ISO group), Taylor params, nose-radius Ra formula

6. Key engines by sub-domain (verified names only)
   - physics: LatheAdvancedOperationsEngine, BoringBarDeflectionEngine, CSSChipLoadInvariantCoordinatorEngine, TurningForceEngine, TurningInsertLifeEngine
   - workholding: ChuckJawForceEngine, SoftJawProfileEngine, SteadyRestPlacementEngine, TailstockForceEngine
   - hard-turn/specialty: HardTurningCapstoneEngine, HardTurningDecisionEngine, DiamondTurningEngine, EccentricTurningEngine
   - bar/sub-spindle/swiss: BarFeederEngine, BarFeedPitchOptimizerEngine, SubSpindleHandoffVerifierEngine, SwissGuideBushingPhysicsEngine
   - JM/cost: JMDieLatheProgramUpgraderEngine (v2), LatheAutoQuoteFromPrintEngine, LatheActualCostReconciliationEngine
   - AI stack (implementation, large): LatheAIOrchestrationEngine (77K), LatheActiveLearningEngine (76K), LatheAttentionMechanismEngine (88K), LatheBayesianOptimizationEngine (64K)
   - Okuma: OkumaDialectKnowledgeEngine (dialect translation — use for ALL OSP work)
   - post: FusionLathePostDeltaRegistryEngine, HyperMillTurningConfigIngesterEngine

7. Domain-specific gotchas (10 items — current 7 + 3 new)
   - G96+G50 CSS cap (current #1)
   - Boring-bar L/D deflection (current #2)
   - Nose-radius/feed coupled Ra formula (current #3 — reframe without unverified engine cite)
   - Threading entry-lock G92/G76 (current #4)
   - Parting peck-groove chip evac (current #5)
   - Sub-spindle phase 0.5° (current #6)
   - Live-tooling Y-axis vs C-axis polar (current #7)
   - G76 infeed angle must match insert (ADD — tribal)
   - Chuck jaw centrifugal grip loss at speed (ADD — workholding)
   - Bar remnant ejection sequence (ADD — BarFeedPitchOptimizerEngine)

8. What NOT to do in this domain
   - Okuma vs Fanuc dialect list
   - IPM/IPR confusion
   - inline constants
   - nonexistent dispatcher actions
   - direct tribal writes
   - unguarded JM Die Glob
   - skipping safety gate

9. Test commands
   - vitest -t "Lathe", -t "HardTurning", -t "Okuma", -t "Swiss"
   - lathe-gcode-lint.mjs (MCP-independent, works when port 3100 is down)
   - scrutiny 3-of-3 gate reminder (pointer only)

10. Canonical resources + corpora (1-line pointers)
    - JM Die A/B pairs, Okuma corpus, vendor catalogs, wiki, memory brain, tribal index
    - KNOWLEDGE.md compiled index (this dir)

11. Cross-galaxy edges (current §7 — keep as-is)

12. Closed-loop integration with india (current block — keep, is lathe-specific)

13. Universal-core pointer (1 line — see §UNIVERSAL-CORE POINTER below)
```

---

## UNIVERSAL-CORE POINTER

The following rules are FULLY covered by the root `H:/prism/CLAUDE.md` and `H:/.claude/CLAUDE.md`. They must NOT be duplicated in this galaxy file — a single pointer line suffices:

> **Universal doctrine:** `H:/prism/CLAUDE.md` — covers R1-R15, KARPATHY DISCIPLINE, SCRUTINY GATE (3-of-3), PER-CHAT HANDOFF, COMMIT FORMAT, SAFETY RAILS (no stubs, no inline constants), MULTI-AGENT PATTERNS, SESSION HYGIENE, TOKEN ECONOMY (RTK/Ollama), LOOP DISCIPLINE, AUTO-COMPACT, WIKI PROTOCOL, MASTER INDEX search-first, GOLF SLOT, FLEET-REAPER, and all hook enforcement gates.

**Items to drop from galaxy CLAUDE.md because they are in the universal core:**
- Loop bookend discipline (`loop-state tick`) — global
- Obsidian vault recall path generic description — global
- LoRA/CAG/RAG harness description (the generic split/deploy-gate table) — global
- Critic + keep-working stanza — global R12 + R6
- AI-systems fleet state pointer (identical across 34 galaxies) — belongs in MEMORY.md only
- PC hardware specs block (generic; pointer to `CANONICAL-HOST-FACTS-2026-06-09.md` suffices)
- Ollama model tier table (global; changes fleet-wide when models retire)

**Items that are lathe-specific EXCEPTIONS to universal rules (KEEP in galaxy file, 1 bullet each):**
- "CSS/chuck-jaw SAFETY stays on Claude — do NOT route to Ollama" (Ollama offload carve-out)
- "Feed rate safety (IPR vs IPM) is a lathe-specific units trap — verify before every op" (units-first addendum)
