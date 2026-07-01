# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE

> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
> Target per-galaxy size: **80–160 lines** (replaces the ~530-line monolith load per slot).

---

## 0. WHY THIS TEMPLATE (the cross-assessment verdict)

All 34 assessments converged on the same 5 findings — the template is built to fix all 5:

1. **Same boilerplate in all 34 files wastes tokens every cascade load.** Four blocks are byte-identical
   fleet-wide and were flagged DROP in 30+ assessments: `## Cross-cutting methodology` (PC specs / Ollama
   tier table / loop discipline / vault / LoRA-CAG-RAG, ~15–30 lines), `<!-- AI-SYSTEMS-STATE -->`,
   `<!-- CRITIC-KEEPWORKING-STANZA -->`, and the verbatim `## Closed-loop integration with india`
   xproc block. These collapse to a single **Universal-core pointer line** + a 2-line domain-specific
   closed-loop callout. (Est. savings ~30–50 lines/file.)
2. **Auto-filled `## Key engines` lists are keyword-match noise.** 12/34 files copied PATHS.md's
   name-heuristic engine dump verbatim — full of false positives (e.g. cad-fusion-live's 236-engine list,
   pdf-corpus-mill's mill engines, knowledge-conversion's CAD routers). Template mandates a **verified**
   engine table only (file existence confirmed by Glob/Read; cite or mark `// UNVERIFIED`).
3. **The single highest-value MISSING section across the fleet is the dispatcher action quick-ref.**
   ~28/34 assessments said "the daily-use dispatcher actions are absent from CLAUDE.md, buried in
   TOOLBELT.md/MEMORY.md." Template makes §4 Dispatcher quick-ref mandatory and verified.
4. **The second-most-missing section is "What NOT to do" (domain refuses).** ~30/34 added it. Template
   makes §6 mandatory.
5. **Fabricated paths / actions / engine names are the recurring R12 violation.** Every "PARTIAL"/"GOOD"
   grade flagged ≥1 (e.g. mill's `TrochoidalEntryAngleValidator`, cam's `cam-vendor-matrix.ts`,
   backend-helper's `outcome-bus-auto-tap.mjs`, wiring's `DispatcherRoutingEngine.ts`). Template's §1
   header rule and the `// UNVERIFIED` convention make this structurally hard to repeat.

---

## 1. THE CANONICAL SECTION SKELETON

Every galaxy CLAUDE.md uses these sections IN THIS ORDER. Sections marked **(M)** are mandatory for all 34;
**(C)** are conditional (include only if the galaxy has that surface). Omit a (C) section entirely rather
than leaving a stub — an empty/“STUB” heading is itself a DROP item (flagged in cam/cad-fusion-live/
shop-floor/pdf-corpus/mit-curriculum).

```
0.  Header + universal-core pointer            (M)  — 2 lines: identity + → root CLAUDE.md
1.  Domain scope + slot identity               (M)  — owns / EXCLUDES / slot + worktree branch
2.  Verified engines                           (M)  — table, file-existence-confirmed names only
3.  Dispatcher quick-ref                        (M)  — verified actions the slot uses daily (+ MCP-down fallback)
4.  Canonical constants + data paths            (M)  — NEVER-inline rule + verified store/registry paths
5.  Domain gotchas / safety rails               (M)  — the physics/units/state traps unique to this domain
6.  What NOT to do (domain refuses)             (M)  — hard "you will be blocked / this is a scrap part" list
7.  Domain workflow / pipeline contract         (C)  — the stage order or daily task cycle, if one exists
8.  Tribal + corpus pointers                    (M)  — wiki entries, JM Die corpus paths, tribal capture rule
9.  Cross-galaxy edges (PSN)                     (M)  — producer/consumer graph + bridge action names
10. Closed-loop integration (india)             (M)  — 2-line: xproc_outcome_publish {slot,domain} + capture rule
11. Test commands                               (M)  — domain-filtered vitest + any pure-node lint/health script
12. Known bugs / open threads                   (C)  — live R12-flagged issues + ledger/queue pointer
13. AI / reasoning surface                       (C)  — galaxy-reasoning-bridge + domain Ollama routing one-liner
```

Most galaxies land at ~12–14 sections / 110–150 lines. A pure infra/filter galaxy (pdf-corpus-mill,
mit-curriculum, agent-orchestration) lands at ~80–100 lines (fewer engines, no physics constants).

---

## 2. SECTION-BY-SECTION GUIDANCE (heading · 1-line purpose · what the galaxy fills)

### §0 — Header + universal-core pointer **(M)**
*Purpose:* establish identity and point to all shared doctrine in ONE line so it is never duplicated.
*Fill:* galaxy name + slot, then the single pointer line. **This replaces the 4 boilerplate blocks.**
```markdown
# <galaxy> Galaxy — slot:<nato> (or "fleet-managed — no dedicated slot")
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = <galaxy>-domain doctrine ONLY; never re-inline universal prose.
```

### §1 — Domain scope + slot identity **(M)**
*Purpose:* the boundary — the #1 drift preventer (every assessment ranked this top-tier KEEP).
*Fill:* one paragraph of what the galaxy OWNS, an explicit **EXCLUDES** list (what belongs to sibling
galaxies), the canonical slot, and the worktree/branch (`H:/prism-slot-<nato>`, `slot/<nato>`).
*Mill example:* "Owns: face/end mill, pocket, contour, helical, trochoidal, thread-mill, drill-via-mill.
EXCLUDES: turning→whiskey, EDM→mike, G-code emission→echo. Slot: foxtrot."
*Rule:* state the slot from SOUL.md frontmatter, not the stale alpha-seed author (mill/lathe/frontend
all had stale slot lines). Fleet-managed galaxies state "no dedicated slot — any slot may work here;
claim via /pick-unit + heartbeat."

### §2 — Verified engines **(M)**
*Purpose:* the by-name engine map so the slot never re-greps the engine tree or trusts the noise list.
*Fill:* a `| role | engine file |` table. **Every name must be file-existence-verified** (Glob/Read).
Unverifiable names get `// UNVERIFIED` or are dropped — never copy PATHS.md's keyword-match dump.
*cad example:* `| feature recog | CADFeatureRecognitionEngine.ts (⚠ ENGINE_DIGEST marks stub) |`.
*Rule:* if the galaxy has NO local `.ts` engines (pdf-corpus-mill, mit-curriculum, agent-orchestration,
hermes-zulu, system-viz), say so explicitly ("no local engines — code lives in <parent path>") and list
the cross-galaxy engines it USES instead. Cite `file:line` on first use of any symbol (HONESTY rule).

### §3 — Dispatcher quick-ref **(M — the #1 fleet gap)**
*Purpose:* the daily routing table so the slot never opens TOOLBELT.md or the 200K-line dispatcher source.
*Fill:* a verified `| action | use |` list of the 8–15 most-used dispatcher actions, plus an
**MCP-down fallback** line (the offline `node scripts/<x>.mjs` path). Verify every action against the
dispatcher source before listing.
*mill example:* `prism_mill: mill_print_to_program · mill_strategy · mill_physics · mill_collision …`.
*Rule:* if the galaxy has NO named dispatcher (hermes-zulu, agent-orchestration), say so loudly at the
top ("DISPATCHER: none named — all C2 routes via prism_session; do NOT grep DISPATCHER_DIGEST for it").

### §4 — Canonical constants + data paths **(M)**
*Purpose:* the NEVER-inline rule + verified store paths so the slot doesn't re-derive or full-read 1MB+ files.
*Fill:* the hard "import from `mcp-server/src/physics/constants.ts`, never inline kc1.1/Taylor/etc." rule,
plus a verified table of domain data stores with size guards ("NEVER full-read X.json — query via
`prism_data:database_search`"). For non-physics galaxies state the analog (business: payroll/PTO/Cpk
floors; compliance: `omega-thresholds.json`; token-opt: TokenAwarenessEngine).
*wedm example:* "Kienzle/Taylor DO NOT APPLY (EDM is thermal-electric); source E-codes from
`jm-die-wedm-tech-tables.ts`, never inline."

### §5 — Domain gotchas / safety rails **(M)**
*Purpose:* the physics/units/state traps that cause scrap parts or silent corruption — the crown-jewel
section in every "GOOD"-graded file (mill, lathe, quoting, business all rated this #1 KEEP).
*Fill:* the verified domain-specific gotchas (each grounded in a real engine, commit SHA, or incident).
*lathe example:* "Feed = IPR not IPM (mill convention) — confusing them = 25.4× error; CSS setpoint is
SFM not RPM; Okuma OSP uses VCSS/G176 not Fanuc G96/G76."
*Rule:* this is where domain-specific instances of universal rails live (a CAD 25.4× units echo, the
Fusion 2.54cm API trap) — that is NOT duplication, it is the local instantiation the universal pointer
cannot carry. Keep ≤8 verified gotchas; mark anything not empirically confirmed `// OWNER-GATE`.

### §6 — What NOT to do (domain refuses) **(M — the #2 fleet gap)**
*Purpose:* the hard prohibition list — folds in the SOUL.md `refuses` so the slot sees them without
loading SOUL.md (every assessment recommended promoting refuses here).
*Fill:* bulleted "NEVER …" rules covering: safety violations, fabrication traps, token-waste (no
full-reads of large files), direct-tribal-write ("use prism_knowledge:tribal_capture slot=<nato>, never
write knowledge/tribal/*.md — auto-overwritten"), and the galaxy's own known regression classes.
*mill example:* "DO NOT reference TrochoidalEntryAngleValidator (does not exist; use
TrochoidalMillingEngine.ts); DO NOT full-read millDispatcher.ts (217K) — grep the case."

### §7 — Domain workflow / pipeline contract **(C)**
*Purpose:* the stage order / daily cycle, only where one exists.
*Fill:* the ordered pipeline (corpus-aggregation: SCAN→CLASSIFY→INGEST→AGGREGATE→VALIDATE→SERVE;
speed-feed: nine_axis_run→tri_compare→rank→export→publish; lathe: the 5-step pre-emit safety gate
sequence). Omit for galaxies with no fixed pipeline (token-optimization, discovery).

### §8 — Tribal + corpus pointers **(M)**
*Purpose:* where domain knowledge lives so the slot queries before re-deriving.
*Fill:* the domain wiki entries (named), the JM Die corpus paths with the access rule
("getJMDieCustomerPath(), NEVER Glob the 24K-file tree"), the synthesis-brain path, and the
`prism_knowledge:tribal_capture slot=<nato>` write rule. Flag any polluted synthesis brain (xray's case).

### §9 — Cross-galaxy edges (PSN) **(M)**
*Purpose:* the producer/consumer graph so the slot never does wrong-galaxy work.
*Fill:* the typed edges with bridge action names (cad→cam, cad←xray, quoting↔hotel …). ONE copy only
(many files had it duplicated). Keep the directionality + the asymmetric-edge TODOs (xray↔juliett).

### §10 — Closed-loop integration (india) **(M, compressed)**
*Purpose:* the learning-loop wire-in — kept because it IS load-bearing, compressed because the prose was
identical fleet-wide.
*Fill:* exactly 2 lines: the `xproc_outcome_publish {slot:'<nato>', domain:'<galaxy>'}` call + the
tribal-capture rule + a pointer to `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.
*Rule:* mark the `xproc_*` action names `// UNVERIFIED` until grep-confirmed (5+ assessments could not
verify them — they may be aspirational). Do NOT cite `outcome-bus-auto-tap.mjs` (verified absent).

### §11 — Test commands **(M)**
*Purpose:* the domain-filtered test entry points.
*Fill:* `cd mcp-server && rtk npx vitest run -t "<domain regex>"` plus any pure-node lint/health script
that works when port 3100 is down (lathe-gcode-lint.mjs, post-nc-dialect-lint.mjs,
quoting-pipeline-verify.mjs, <galaxy>-galaxy-verify.mjs).

### §12 — Known bugs / open threads **(C)**
*Purpose:* live R12-flagged issues + the roadmap pointer so a fresh session picks up without re-discovering.
*Fill:* the open-thread ledger/queue path (DELTA-CONTEXT-LEDGER.md, INDIA-AI-ORPHAN-WIRE-QUEUE,
ECHO-OPEN-TASKS-LEDGER.md) + named live bugs (speed-feed's fake `tryBusCapture()` 100%, tribal-knowledge's
DOMAIN_MAP gap). Omit if the galaxy has no live debt. Keep snapshot ops-state (commit-counts-behind) OUT
— that belongs in the handoff, not doctrine (flagged stale in mill/india/echo/tango).

### §13 — AI / reasoning surface **(C)**
*Purpose:* the $0 local reasoning path + domain Ollama routing.
*Fill:* `node scripts/lib/galaxy-reasoning-bridge.mjs <galaxy> "<q>"` + the 2-line domain Ollama routing
("summarize STEP tree → gpt-oss:20b; lint engine code → qwen2.5-coder:32b; deep domain reasoning →
gpt-oss:120b"). This is the ONLY surviving fragment of the dropped cross-cutting methodology block.

---

## 3. SLOT→GALAXY MAP

Source: the `# <galaxy> — slot:<nato>` header line of each assessment, cross-checked against SOUL.md
notes inside the assessments. NATO sequence is `alpha..zulu` (26 slots) per `SLOT_NAMES` in
`.claude/helpers/chat-slots.mjs` — read the array length, never hard-code 26.

| Slot | Galaxy (engine dir under `mcp-server/src/engines/`) | Notes |
|------|------------------------------------------------------|-------|
| alpha | token-optimization | also galaxy-seed author for many files; Obsidian-brain owner |
| bravo | hermes-zulu | + zulu/zebra fleet orchestrator overlay |
| charlie | quoting | |
| delta | cad | + co-touches cad-fusion-live |
| echo | post-processor | + lathe-CAM path per order flow |
| foxtrot | mill | (stale files still say alpha; SOUL.md = foxtrot) |
| golf | fleet-hygiene | hygiene slot; owns fleet-reaper; commits `[MAIN]` to main tree |
| hotel | business | |
| india | ai-training | |
| juliett | database-expansion | |
| kilo | cam | + de-facto corpus-aggregation |
| lima | academy | |
| mike | wedm | |
| **november** | **— UNASSIGNED —** | no galaxy primary claimed in any assessment |
| oscar | speed-feed | |
| papa | backend-helper | full pathways unlocked, builds across all galaxies |
| quebec | frontend-app | (SOUL.md generator bug stamps `papa`; canonical = quebec) |
| romeo | wiring | |
| sierra | system-viz | full reign; commits `[MAIN]` to main tree |
| tango | discovery | |
| uniform | bug-hunting | |
| victor | dormant-data | |
| whiskey | lathe | operator-codified lathe specialist 2026-05-27 |
| xray | blueprint-vision | |
| **yankee** | **— UNASSIGNED —** | no galaxy primary claimed in any assessment |
| zulu | agent-orchestration (de-facto) | chat-fleet orchestrator; galaxy is formally fleet-managed |

**Fleet-managed galaxies (no dedicated work-slot — any slot works, golf does hygiene):**
agent-orchestration (zulu de-facto), quality, compliance-safety, shop-floor, knowledge-conversion,
corpus-aggregation (kilo de-facto), tribal-knowledge, mit-curriculum, pdf-corpus, pdf-corpus-mill,
cad-fusion-live (delta/kilo touch it).

That is **23 named work-slot owners + golf + zulu-overlay**; **november and yankee are the 2 unassigned
NATO slots** (available for future galaxy assignment); **11 galaxies are fleet-managed** (more galaxies
than dedicated slots, so the slot↔galaxy map is intentionally not 1:1).

---

## 4. UNIVERSAL CORE (stays in main `H:/prism/CLAUDE.md` — every slot needs it regardless of domain)

This is the MINIMAL set that must NOT be distributed to galaxy files (every assessment listed it as
"pointer only, do NOT duplicate"). It is what the §0 one-liner points to:

- **Safety rails:** UNITS-FIRST (inch vs mm from source before any geometry; 25.4× trap); NEVER inline
  physics/safety constants (`mcp-server/src/physics/constants.ts` + `omega-thresholds.json` only);
  no-stub engines; run affected tests; check `ENGINE_DIGEST.md` before creating.
- **R1–R15:** Karpathy 4 (think-before-code / simplicity / surgical / goal-driven) + agent-era R5–R15
  (model-for-judgment / context-not-a-stop / surface-conflicts / read-before-write / tests-verify-intent /
  checkpoint / match-conventions / fail-loud / comprehensive-route / close-bg-tasks / wire-test-validate-all).
- **HONESTY RULES:** verify a symbol before claiming it (cite file:line); "I don't know" beats a guess;
  existence ≠ correct; never claim absence without a deep search; enumerate before read; "all" means all.
- **Scrutiny:** 3-of-3 gate (`.claude/scripts/scrutiny-3way.mjs`) at Stop + per-file 2-arm gate on
  multi-file builds.
- **Session/lane discipline:** per-chat handoff (`per-agent-handoff.mjs` write/read, topic suffix);
  commit format `[SCOPE]/U-ID: title`; slot-worktree routing (`H:/prism-slot-<nato>` / `slot/<nato>`;
  golf+sierra commit `[MAIN]` to the shared tree); auto-compact is seamless (R6).
- **Self-awareness gates (hook-enforced):** duplicationGuardEngine.mustCheckBeforeCreating() THROWS;
  inventory-check / master-index-search / dedup-auto-invoke auto-fire; PRISM-INVENTORY-LATEST.md for counts.
- **Token economy:** RTK prefix on bash; Ollama fallback ladder (Ollama → Sonnet subagent → Opus);
  Glob/Grep over Bash; Read offset/limit; parallel independent tool calls.
- **Fleet infra:** 26-slot NATO fleet; golf owns fleet-reaper + hygiene; WIKI protocol (query
  `knowledge/wiki/index.md` first); MCP dispatcher map (`DISPATCHER_DIGEST.md`).

**Everything else currently in main CLAUDE.md is a candidate to DISTRIBUTE to galaxy files**, namely:
the per-domain milestone-prose sections (WEDM AGI status, NN-GRAPH MS0/1/2 detail, PSN-OCTOPUS,
CROSS-SUBSTRATE, CHEAP-NODE-ACCESS, JULIETT-12CHAT, DOMAIN-GALAXY-DOCTRINE, RGS-TOOL, KNOWLEDGE-CONVERSION,
the Ollama tier table, PC hardware specs) → these belong in the owning galaxy's CLAUDE.md or in
`CANONICAL-HOST-FACTS-2026-06-09.md` / the galaxy MEMORY.md, not the universal core.

---

## 5. CROSS-DOMAIN CONSISTENCY FINDINGS (sections some galaxies have that others lack → standardize)

| Finding | Have it well | Lack it (recommend ADD) | Standardization |
|---------|-------------|------------------------|-----------------|
| Verified dispatcher quick-ref | (almost none had it inline) | ~28/34 | **§3 mandatory** — verified actions + MCP-down fallback |
| "What NOT to do" / refuses | mill, cam, lathe, business | ~30/34 | **§6 mandatory** — fold in SOUL.md refuses |
| Verified-only engine table | cad, blueprint-vision (asset-verified) | the 12 keyword-noise files | **§2 mandatory** — Glob-confirm or `// UNVERIFIED` |
| Domain gotchas grounded in real incidents | mill, lathe, quoting, business, wedm | the auto-filled stubs | **§5 mandatory** — ≤8, each cited |
| Explicit EXCLUDES list in scope | cad (model), academy | many | **§1 mandatory** — name the sibling galaxy |
| JM Die corpus access rule (no-Glob) | lathe, wedm, blueprint-vision, business | several | **§8 standard line** — getJMDieCustomerPath() |
| Open-threads / context-ledger pointer | delta, india, echo | most | **§12 (C)** — point to the ledger, not inline snapshots |
| Large-file size guards | database-expansion, token-opt, sierra | many | fold into **§4/§6** — "NEVER full-read X (size); query Y" |
| Stale ops snapshots (commits-behind) | (flagged as bloat in mill/india/echo/tango/romeo) | — | **REMOVE** from doctrine → handoff only |
| `xproc_*` closed-loop names | all (verbatim) | — | **COMPRESS to §10** + mark `// UNVERIFIED` until grep'd |

Two consistency rules every file must obey going forward:
- **No section may be a "STUB" heading.** Either fill it (verified) or omit it. (cam/cad-fusion-live/
  shop-floor/pdf-corpus/mit-curriculum all shipped explicit STUB headings — pure dead weight.)
- **No auto-generated comment wrappers as doctrine.** `<!-- GALAXY-CLAUDEMD-FILL -->`,
  `<!-- AI-SYSTEMS-STATE -->`, `<!-- CRITIC-KEEPWORKING -->` either become a 1-line pointer or are removed;
  they are maintenance metadata, not content the model should read every turn.

---

## 6. PER-GALAXY BIGGEST-GAP TABLE (one row per galaxy: galaxy | slot | grade | single biggest gap)

| Galaxy | Slot | Grade | Single biggest gap to fix |
|--------|------|-------|---------------------------|
| mill | foxtrot | GOOD | Fabricated `TrochoidalEntryAngleValidator` in gotcha #5 → use `TrochoidalMillingEngine.ts`; add prism_mill action table |
| cad | delta | EXCELLENT | Missing §0 DELTA-CONTEXT-LEDGER pointer + Seat-UI nav (Fusion 2.54cm API trap) + SOUL refuses |
| cam | kilo | PARTIAL | `cam-vendor-matrix.ts` is fabricated (use `CAM_VENDOR_REGISTRY.json`); STUB §5/6/7; add verified engine+action tables |
| lathe | whiskey | GOOD | Stale "slot affinity: none" (whiskey IS canonical); missing turningDispatcher 373-action surface + Okuma-OSP dialect |
| wedm | mike | PARTIAL | §5 gotchas empty; unverified registry paths (use `edm-material-db.ts`/`wire-spec-sheets.ts`); add prism_edm action table |
| quoting | charlie | GOOD | Gotchas #9–#25 only in MEMORY.md; `prism_business` dispatcher UNVERIFIED — mark + add verified prism_quoting table |
| business | hotel | GOOD | Stale 320-byte stub warning; missing financial-invariant + PII rule blocks + verified prism_business action table |
| post-processor | echo | GOOD | `prism_pp` (654 actions) — the PRIMARY surface — entirely absent; add it + dialect gotcha cheatsheet |
| speed-feed | oscar | PARTIAL | Engine surface critically thin (3 listed); missing prism_calc SFC action surface + the live `tryBusCapture()` fake-100% bug |
| ai-training | india | GOOD | Stale AUROC 0.096 (live = 0.808 selective-deploy); missing live deploy-gate table + DO-NOT-BUILD dup map |
| blueprint-vision | xray | EXCELLENT | Missing OCR live-state + the `format:"json"` top-ROI fix; add ground-truth 4-tier + synthesis-pollution warning |
| cad-fusion-live | fleet (delta/kilo) | PARTIAL | 236-engine list is mostly false positives (5 real); dispatcher surface is a TOOLBELT stub — add f360_live_* table + port constants |
| academy | lima | GOOD | 3 cited scripts + ship-guard hook are slot-lima-only (absent in integration tree) — annotate; add 3-leg ship checklist |
| frontend-app | quebec | PARTIAL | Wrong tech stack (says Next.js; live is Vite+React SPA); fabricated portal_* action names — use verified businessDispatcher set |
| system-viz | sierra | GOOD | Missing node-card cheap-read path + system-viz-query subcommand table + 3-graph consumer map (548MB vs node-card) |
| database-expansion | juliett | GOOD | No dispatcher action table, no migration-discipline section, no store-health protocol; add large-file size guards |
| hermes-zulu | bravo | GOOD | No "DISPATCHER: none named — all C2 via prism_session" callout (the #1 surprising fact); add C2 surface table |
| token-optimization | alpha | PARTIAL | Stale hook names (`token-zone-state-inject`/`route-suggest-inject` don't exist); add verified action cheatsheet + compact-boundary lesson |
| fleet-hygiene | golf | GOOD | Contradictory PARKED vs RE-ENABLED reaper banner; add reaper decision flowchart + scheduled-task roster |
| discovery | tango | GOOD | No dispatcher action table; add orphan-triage protocol + master-index-cap silent-zero failure mode |
| backend-helper | papa | PARTIAL | Wrong primary dispatcher (PATHS says prism_knowledge; real = prism_dev ~260 actions); `outcome-bus-auto-tap.mjs` fabricated |
| bug-hunting | uniform | GOOD | Fabricated paths (`hook-fire-rate-audit.mjs`, wrong scrutiny-3way path, 3 phantom engines); add regression-test landing zone |
| wiring | romeo | GOOD | 3 fabricated engines (`AgentSDKVerifierEngine` etc.); stale "593 unwired" (real=60); add triage gate + dispatcher routing map |
| dormant-data | victor | GOOD | `scripts/audit-orphan-inventory.mjs` wrong name (`orphan-inventory.mjs`); ledger is create-on-first-use, not pre-existing |
| agent-orchestration | zulu (de-facto) | GOOD | Slot conflict (SOUL=slotless vs CLAUDE=zulu) unresolved; TOOLBELT lists 1 of 5 dispatchers; prune 143-engine name-match dump |
| quality | fleet | GOOD | `surface-finish.ts` fabricated; 4 unverified engine names; missing CMM→RANSAC workflow + verified prism_quality action table |
| compliance-safety | fleet | PARTIAL | sim `omega_min=0.50` conflated with `safety_min_global=0.70`; 4 mis-attributed engines; add verified dispatcher + regulatory map |
| shop-floor | fleet | PARTIAL | `alarm-registry.ts` + `TravelerEngine` fabricated (use `alarm-categorization.ts`/`JobTravelerEngine`); STUB §5/6/7 |
| knowledge-conversion | fleet | PARTIAL | Key-engines list is CAD-router false positives; missing the verified 7-algorithm + KIP engine list + dispatcher table |
| corpus-aggregation | fleet (kilo) | PARTIAL | Blank dispatcher section; missing SCAN→…→SERVE pipeline contract + cutting-data-validation refuse |
| tribal-knowledge | fleet | PARTIAL | `prism_knowledge` dispatcher entirely omitted; PATHS keyword engine list; add O_EXCL lock + 90% confidence-gate invariants |
| mit-curriculum | fleet | PARTIAL | `mit-courses-registry.ts` fabricated; 18 false-positive engines; missing producer/router/teacher boundary + verified 11-engine list |
| pdf-corpus | fleet | PARTIAL | STUB §5/6/7; 12 unverified engines (use 10 PDF-prefixed); `prism_resource_extraction` is 14 actions not 21 |
| pdf-corpus-mill | fleet | PARTIAL | Lists mill/CAD engines (galaxy has ZERO local .ts); add "no local engines" truth + inherited dispatcher + controller extraction rules |

Grade distribution: **2 EXCELLENT, 17 GOOD, 15 PARTIAL.** The PARTIAL cluster is dominated by the
auto-filled fleet-managed/infra galaxies (Ollama-distilled stubs) + the thin-engine-surface galaxies.

---

## 7. ENFORCEMENT + LOADER RECOMMENDATIONS

### 7a. How a slot LOADS its galaxy CLAUDE.md
- **Mechanism in place:** the **Bibryam Context Cascade** auto-loads `mcp-server/src/engines/<galaxy>/CLAUDE.md`
  when Claude edits within that subdir (DOMAIN-GALAXY-DOCTRINE-MS0, Phase A complete — 5 galactic-center
  sentinels shipped, all 34 now have a file). This is the primary loader: edit a mill engine → mill/CLAUDE.md
  cascades in.
- **Add a SessionStart slot→galaxy lookup.** A slot is bound to a galaxy via the SLOT→GALAXY MAP (§3).
  Recommend a small SessionStart hook (`galaxy-claudemd-inject.mjs`) that: reads the active slot from
  `chat-slots.json`, resolves galaxy via a checked-in `SLOT_GALAXY_MAP` (single source of truth — derive
  from §3, do NOT hard-code in the hook), and injects that galaxy's CLAUDE.md `additionalContext`. Wire it
  as an individual `settings.json` entry (NOT into `sessionstart-bundle.mjs` — the bundle is
  high-contention peer-claimed real-estate, per the master-index wiring lesson). Knob:
  `PRISM_GALAXY_CLAUDEMD_INJECT=0`. Fleet-managed galaxies (no 1:1 slot) fall back to keyword-gated
  cascade only — they inject when the prompt/edit path matches the galaxy dir.
- **The §0 pointer is the bridge to universal core** — the galaxy file is the domain supplement; the
  universal rails stay in main CLAUDE.md and are independently injected/hook-enforced. A slot therefore
  loads: main CLAUDE.md (universal, once) + its galaxy CLAUDE.md (domain, on cascade/SessionStart) — never
  the 34-file union.

### 7b. How to hard-enforce "edit your own galaxy file, not main"
- **Activate + extend the dormant `claude-md-golf-only-guard.mjs`.** It currently confines main-CLAUDE.md
  edits to golf. Repurpose/extend it into a **`claude-md-ownership-guard.mjs`** (PreToolUse:Edit/Write):
  - On an edit to `H:/prism/CLAUDE.md` (or `H:/.claude/CLAUDE.md`): allow ONLY golf/sierra (the main-tree
    committers) OR an explicit operator `[MAIN-CLAUDEMD]` scope token. Block everyone else with a message
    pointing them to their galaxy file via the SLOT_GALAXY_MAP.
  - On an edit to `mcp-server/src/engines/<galaxy>/CLAUDE.md`: allow ONLY the slot that owns that galaxy
    (per SLOT_GALAXY_MAP) OR a fleet-managed galaxy (any slot, since those have no owner) OR
    golf/sierra/papa (cross-cutting elevated slots per their memories). Block a mill chat editing
    lathe/CLAUDE.md.
  - Reuse the existing `file-claim-guard` claim mechanism for fleet-managed galaxy files (two slots
    racing on quality/CLAUDE.md must claim first).
  - Knobs (fail-open default during rollout): `PRISM_CLAUDEMD_OWNERSHIP_GUARD=1` to arm,
    `PRISM_CLAUDEMD_OWNERSHIP_BYPASS=1` (logged) for emergencies. Add a wiring test that proves it BLOCKS
    a real cross-galaxy edit when armed (per R15 — never assume a hook fires; the master-index + golf-allowlist
    history shows preserved-but-unwired hooks silently do nothing).
- **Make SLOT_GALAXY_MAP a single checked-in source of truth** (e.g. `state/shared/SLOT_GALAXY_MAP.json`,
  schemaVersioned) consumed by BOTH the loader hook and the ownership guard — never two copies that drift.

### 7c. Risks to flag
- **Dropping universal safety rails would be UNSAFE.** The template intentionally keeps §0 as a hard pointer
  to main CLAUDE.md and keeps domain SAFETY rails (§4/§5/§6) IN the galaxy file. If a future "slim" pass
  strips the §0 pointer or the §5/§6 domain rails to save tokens, a slot loses the S(x) gate / units-first /
  no-inline-constants enforcement — the exact 25.4× scale-error class the fleet already hit. **Never strip
  §0, §4, §5, §6.** The compliance-safety, quality, mill, lathe, wedm files carry safety-critical numerics
  that have no other home.
- **Loader must fail OPEN, guard must fail SAFE-but-non-blocking during rollout.** If the
  galaxy-claudemd-inject hook errors, the slot must still get main CLAUDE.md (degrade to universal-only, not
  to nothing). If the ownership guard mis-resolves a slot, it must WARN not hard-block until the
  SLOT_GALAXY_MAP is proven correct against `chat-slots.json` live (fleet-managed galaxies + elevated slots
  are the resolution edge cases most likely to false-positive).
- **Verified-only discipline is the load-bearing invariant.** The biggest single risk to this whole effort
  is re-introducing keyword-match engine dumps or fabricated paths during the §2/§3 rewrites. Every galaxy
  rewrite MUST Glob/grep-confirm engine names + dispatcher actions before writing them, and the per-file
  2-arm scrutiny gate (already mandated for multi-file builds) must run on each rewritten CLAUDE.md. The
  34 assessments found a fabrication in nearly every "PARTIAL" file — the rewrite is where they get fixed,
  not where new ones get added.
- **Fleet-managed galaxies have no owner to maintain their file** — they will rot fastest. Recommend golf
  (hygiene slot) owns a periodic `galaxy-claudemd-drift-audit` over the 11 fleet-managed files, and the
  bug-finding→wiki gate already in place catches fabrication regressions.

---

_End of synthesis. Template locked. Next: Task #4 — rewrite each of the 34 galaxy CLAUDE.md to this
skeleton, verified-only, per-file 2-arm scrutiny on each. Task #3 — arm the loader + ownership guard._
