# Fleet Expansion Plan — 2026-05-28

**Origin**: operator directive (slot:alpha session a198ff5f, 2026-05-28 20:00Z)
*"10 parallel agents to scope everything we built and the plan for galaxy expansion for each chat is sound and bullet proof and accounts for all features we have in the entire codebase and system and we design to synergize everything within their domains"*

**Append-only directive** (2026-05-28 follow-up): *"make sure the updated tasks and units being added to each chat slot doesn't supersede their current task queue"*

**Method**: `/forge-audit-v3` (just-shipped) 10-agent dynamic-workflows fanout. Each agent owned a slot-cluster, ran PRISM-context preamble + bounded reads + post-v2 substrate integration check. 6 distinct verdicts cover 24 NATO slots + 2 U-DEA placeholders.

**Append-only contract** (operator-canonical 2026-05-28):
- Every unit here is a CANDIDATE for the named slot's pickup queue
- NO unit auto-preempts a slot's existing work
- Slot chats add these to their atomic-roadmap.json at their own pace via standard `/pick-unit` flow
- Each unit carries `source: "fleet-audit-2026-05-28"` for provenance
- Existing HANDOFF-*.md, active slot-task-claims, in-flight commits — all UNDISTURBED

---

## Cluster verdicts at a glance

| Cluster | Slots | Verdict | Headline finding |
|---|---|---|---|
| Machining Wizards | foxtrot, whiskey, mike, oscar | **GREEN/AMBER** | Most launch-ready cluster. 4/4 training-ready on whiskey+mike; 3.5/4 on foxtrot+oscar |
| Knowledge (xray) | xray | **GREEN** | Well-wired, canonical 2026-05-28 |
| Knowledge (lima) | lima | **YELLOW** | No canonical slot per JULIETT-12CHAT-ALLOCATION; lesson-delivery e2e missing |
| Devtools/Infra | alpha, bravo, papa, romeo | **YELLOW** | Papa galaxy entirely missing. Bravo soul mis-tagged. BUILD-KIT files at 2-of-4 fleet-wide |
| Commerce | charlie, hotel | **YELLOW** | 5 P0 cost-bearing engines unwired. $120/hr plug not dynamic. No outbound-billing connector |
| Design | delta, kilo | **YELLOW** | CAM dispatcher 1.1MB single-file. 21 of 34 vendor DBs unwired. CAD galaxy sentinel honest-stub |
| Post-processor | echo | **YELLOW** | 99% of 580 posts have no engine wire. Soul mis-roled "cam-specialist". 5 P0/P1 gaps |
| AI-Training | india | **AMBER** | India is consumer not provider. graphsage trainer-export regression P0 blocks AUROC convergence |
| Meta-infra | juliett, sierra, tango, uniform, victor | **YELLOW** | Recommend RETIRE tango+uniform; KEEP juliett+sierra+victor with `galaxy_kind:operational` re-frame |
| Frontend | quebec | **NEEDS-SCAFFOLD-THEN-WIRE** | Galaxy not scaffolded; no fleet status board; no backend→frontend event bridge |
| Orchestration | golf, november, zebra, zulu | **YELLOW** | Reassign november→cam-soul, zulu→wedm-soul. Golf kill-switch + zebra dispatch-ack ledger missing |

---

## Cross-cutting fleet-wide patterns (P0 priority, unblock-multiple)

These are NOT slot-specific — they're systemic gaps that fixing once unblocks 5+ slots. **High-leverage. Assign to most-appropriate single slot; let blast radius do the work.**

| # | Pattern | Affected slots | Owner-slot suggestion | Effort |
|---|---|---|---|---|
| FW-1 | **graphsage-train-pipeline.mjs** imports missing `positiveTypeMarginal` + `sampleStratifiedNegativeEdges` from trainer (MS1 regression). Blocks AUROC convergence → blocks every LoRA promote → blocks 6 wizard slots' closed-loop maturation | foxtrot, whiskey, mike, oscar, india | **india** (owns NN-GRAPH retrain lifecycle) | 1-4h |
| FW-2 | **PATHS.md + TOOLBELT.md (BUILD-KIT 4-file standard)** at 2-of-4 fleet-wide. Brief expects 4; observed 2 each. Token-economy regression: future sessions re-derive paths instead of zero-IO lookup | all 24 with briefs | **alpha** (token-economy authority) | 2-3 days (1 per slot × 24) |
| FW-3 | **Soul-realign drift**: bravo says `mill-specialist` (should be hermes-zebra); echo says `cam-specialist` (should be post-processor-specialist) | bravo, echo (audited); others likely | **alpha** (cross-cutting soul governance) | half-day |
| FW-4 | **Brief template misframe** — operational galaxies (golf, juliett, sierra, victor, tango, uniform) audited against engineered-galaxy criteria (corpus/LoRA/calibration/feedback). Add `galaxy_kind: engineered\|operational\|hybrid` to brief frontmatter | 6 slots | **alpha** (brief template authority) | 1h template + per-slot triage |
| FW-5 | **Outcome-bus end-to-end smoke test**: c9fe03cf00 shipped today, claim is 5000 outcomes/day but no live count check. India needs a consumer-side smoke | india + every slot | **india** | 1h |
| FW-6 | **Operator-facing L10n (Polish/Spanish)** missing on safety-critical alarms. JM Die shop floor speaks pl+es per `project_jm_die_shop_floor_languages` | foxtrot, whiskey, mike, oscar, echo (machining-shop-floor) | **lima** (academy/multilingual corpus) + per-domain slots | multi-day |
| FW-7 | **CAM dispatcher 1.1MB single-file** = R7 multi-chat conflict risk; split into core + per-vendor sub-dispatchers | kilo | **kilo** | 1-day |
| FW-8 | **Click-to-action wedge** — sierra renders system-viz but 0.4% take-rate (11/2776 nudges actioned). Needs viz node → `prism_session:tool_route_best` → dispatcher call | sierra (build) + every slot (consumer) | **sierra** | 1-2 days |
| FW-9 | **U-DEA slot reassignment**: november → cam-soul, zulu → wedm-soul (from CLAUDE.md JULIETT D3 pending list). Frees 8% fleet capacity | november, zulu, kilo, mike | **alpha** (slot-domain governance) | 1h doctrine + brief copy |

---

## Per-slot expansion catalog (APPEND-only)

**Reading protocol for slot chats**: when your chat enters galaxy-buildout or `/pick-unit` mode, this catalog is one source. **Your existing roadmap-index.json + atomic-roadmap.json + HANDOFF-*.md remain authoritative.** Pick from this list when your queue is empty or when a unit here outranks your existing pending work on Ψ/SVI.

### alpha (token-optimization-and-efficiency)
- `U-ALPHA-GAL-PATHS-TOOLBELT` — populate the 2 missing BUILD-KIT files (P0)
- `U-ALPHA-TRIBAL-SEED` — ≥5 tribal tips via `prism_knowledge:tribal_capture` (P1)
- `U-ZPSN02` — close dual mill/efficiency role ambiguity (P1, already tracked)
- `U-ALPHA-FW2-BUILD-KIT-DRIVE` — own the fleet-wide BUILD-KIT 4-file rollout per FW-2 (P0 cross-cutting)
- `U-ALPHA-FW3-SOUL-REALIGN-DRIVE` — own the fleet-wide soul-drift audit per FW-3 (P0 cross-cutting)
- `U-ALPHA-FW4-BRIEF-TEMPLATE-KIND` — add `galaxy_kind` to brief template (FW-4)

### bravo (hermes-zebra building + stub hunting)
- `U-BRAVO-SOUL-REALIGN` — rewrite soul: `role: hermes-zebra-orchestrator`, refuses tuned to stub-regression / orphan-engine reintroduction / self-reflect skip (P0)
- `U-BRAVO-STUBHUNT-WIKI-BRIDGE` — codify U-STUB-HUNT-04..11 lessons into wiki entries (P1)
- `U-BRAVO-ZEBRA-ORCHESTRATOR-SPEC` — formalize zebra account-cycling contract (P1)

### charlie (quoting backend+frontend)
- `U-QP-COST-ENGINE-WIRE-5` — wire 5 P0 cost-bearing engines into InstantQuotePipeline (P0)
- `U-QP-DYNAMIC-SHOP-RATE` — replace $120/hr plug with `adaptive_shop_rate_adapt` per-machine rates (P0)
- `U-QP-OUTBOUND-ERP-CONNECTOR` — quote→order→ERPWorkOrder handoff envelope (P0)
- `U-QP-PER-DOMAIN-COST-DATA-INGEST` — pull cost feeds from kilo/foxtrot/whiskey/mike (P1, FW synergy)

### delta (CAD)
- `U-CAD-G1` — populate `engines/cad/CLAUDE.md` to mill-galaxy depth (physics-first refuses, blueprint→feature → tolerance contract) (P0)
- `U-CAD-G2` — scaffold `engines/cad/resources/{fusion,inventor,solidworks,mastercam}/` (P0, current `cad-fusion-live-ms0` branch context)
- `U-CAD-G3` — ship `PrintToProgramOrchestratorEngine` + Pillar 5 atlas entry (P0)

### echo (post-processor)
- `U-PSGB-ECHO-SOUL-REALIGN` — soul: `role: post-processor-specialist`; voice `dialect-rigorous`; refuses tuned to inlined dialect tables, missing coolant ordering, decimal drift, dropped modal, untranspiled RTCP (P0)
- `U-PSGB-ECHO-DIALECT-INDEX` — emit `controller-dialects/INDEX.md` + audit script per-vendor (P0)
- `U-PSGB-ECHO-HOOK-STATIC-CHECK` — `.claude/hooks/post-static-check-on-edit.mjs` (PostToolUse on `*.nc|*.eia|*.mpf|*.min` → GCodeSafetyAnalyzer sync) (P0 — closes operator's VS Code question)
- `U-PSGB-ECHO-HOOK-RUNTIME-VERIFY` — `.claude/hooks/post-runtime-verify-on-edit.mjs` (PostToolUse on `MasterPost*Engine.ts`/`GCode*Engine.ts` → vitest filter) (P0)
- `U-PSGB-ECHO-PROVE-OUT-MATRIX` — extend V11 prove-out pattern to Mastercam/Esprit/NX/PowerMill master-post engines (P1)

### foxtrot (mill wizard)
- `U-FOXTROT-PATHS-POPULATE` — populate template-only PATHS/TOOLBELT (P0)
- `U-FOXTROT-LORA-PROMOTE` — gated on FW-1 (graphsage fix); promote mill LoRA out of research-only (P0 after FW-1)
- `U-FOXTROT-HYPERMILL-POST-BUS-WIRE` — wire 17 hyperMILL engines + 318 posts to closed-loop (P1)

### golf (fleet hygiene — KEEP)
- `U-GOLF-KILL-SWITCH-PRISM-GOLF-DISABLE` — ship the planned env-knob kill-switch (CLAUDE.md §5) (P0)
- `U-GOLF-PEER-AUDIT-SURFACE` — ship `/peer-audit` (CLAUDE.md §4 planned U-CLEANUP-B4) (P0)

### hotel (business/ERP)
- `U-HOTEL-ENGINE-CORPUS-MAP` — 600-engine→training-readiness matrix (P0 — required for AI-training-first doctrine)
- `U-HOTEL-COST-FEEDBACK-LOOP` — bidirectional ERPCostFeedback↔QuoteCalibration wire (P0)
- `U-HOTEL-PORTAL-COMPLAINT-INTAKE-QUOTE-LOOP` — customer complaint → quote-revision trigger (P1)

### india (AI-training)
- `U-IND-NN-TRAINER-EXPORT-RESTORE` — **P0 fleet blocker** (FW-1). Restore `positiveTypeMarginal` + `sampleStratifiedNegativeEdges` exports
- `U-IND-META-BUS-SMOKE` — validate c9fe03cf00 end-to-end (FW-5)
- `U-IND-RELOCATE-LORA-ENGINES` — 4 root-level LoRA engines → `ai-training/lora/` (P0)
- `U-IND-CORPUS-PIPELINE-MILL` — foxtrot enabler (P0)
- `U-IND-CALIBRATION-STORE-SCHEMA` — fleetwide store + Platt/conformal access (P0)
- 15 more units in AI-STACK-PER-DOMAIN-MS0 backlog per agent6 report

### juliett (database expansion — KEEP, re-frame operational)
- `U-DB-MONOLITH-UNIFIED-QUERY-SCHEMA-FINISH` — finish mid-restore (P0)
- `U-DB-GALAXY-CLAUDE-MD` — write galaxy CLAUDE.md mapping 22 DB engines + consumer-wire contract (P0)
- `U-DB-CONSUMER-WIRE-HEALTH-DASHBOARD` — track which consumers actually read which DB (P1, FW synergy)

### kilo (CAM)
- `U-CAM-G1` — wire 21 unwired vendor DBs (alphacam, bobcad, camworks, catia, cimatron, edgecam, esprit, gibbscam, sprutcam, surfcam, tebis, topsolid, visi, worknc, partmaker, featurecam, creo, vericut, hypermill, powermill, fusion360) into `cam_post_select` + `cam_strategy_recommend` (P0)
- `U-CAM-G2` — populate `engines/cam/CLAUDE.md` with vendor capability matrix + per-vendor refuses (P0)
- `U-CAM-G3` — split `camDispatcher.ts` 1.1MB → `camCoreDispatcher` + per-vendor sub-dispatchers (FW-7, P0 R7 risk)

### lima (academy + corpus)
- `U-ACADEMY-LESSON-DELIVERY-E2E` — end-to-end test asserting `academy_start_course → quiz_start → certification_check` (P0 — closes Pipeline-D YELLOW)
- `U-ACADEMY-GALAXY-MS1-C2` — populate CLAUDE.md §5+§6 from pypdf+MIT-OCW+lima tribal (P0)
- `U-ACADEMY-CALIBRATION-WIRE` — assert every `academy_recommend_*` records actuals via `xproc_calibration_monitor_record` (P1)

### mike (wire-EDM)
- `U-MIKE-TRAINER-EXPORT-RESTORE` — FW-1 cure (alias of U-IND-NN-TRAINER-EXPORT-RESTORE; whichever slot ships first wins) (P0)
- `U-MIKE-LIMA-PYPDF-BACKFILL-INGEST` — 8752 pages → tribal+wiki (P0)
- `U-MIKE-OPERATOR-ALARM-L10N` — pl+es localization on safety-critical alarms (P0, FW-6)

### november (REASSIGN: → cam-soul candidate)
- `U-NOV-REASSIGN-CAM-SOUL` — claim cam-soul role from CLAUDE.md D3 pending list (P0, FW-9)
- `U-NOV-GALAXY-BOOTSTRAP` — galaxy buildout following kilo template (P0 after reassignment)

### oscar (speed-feed)
- `U-OSCAR-DEDICATED-LORA-ENDPOINT` — break shared dependency on mill/lathe/wedm cadence (P0)
- `U-OSCAR-9AXIS-ANTI-REGRESSION-SUITE` — close OSC9-WIRE-FIX silent-wire regression risk (P0)
- `U-OSCAR-GWIZARD-OUTCOME-LOOP` — wire HSMAdvisor/GWizard adapters to outcome feedback (P1)

### papa (backend-helper)
- `U-PAPA-GAL-BOOTSTRAP` — full 11-artifact brief execution; create entire galaxy from scratch (P0 — entire galaxy missing)
- `U-PAPA-TSC-CASCADE-OWNERSHIP` — inherit GOAL-TSC-FIX queue from golf (P0)
- `U-PAPA-BUILD-REGRESSION-OUTCOME-TAP` — backend feedback consumer (P0)

### quebec (frontend web + phone)
- `U-Q-GALAXY-SCAFFOLD` — 4 mandatory artifacts (CLAUDE.md/MEMORY.md/PATHS.md/TOOLBELT.md) + SLOT_GALAXY_MAP entry (P0 — entire galaxy missing)
- `U-Q-FLEET-STATUS-BOARD` — live 26-slot React component fed by `chat-slots.json` + `AGENT_CHAT.jsonl` SSE (P0)
- `U-Q-BACKEND-EVENT-BRIDGE` — WebSocket/SSE adapter (mcp-server → React); unblocks every live UI (P0)
- `U-Q-CADQUERY-IFRAME-MERGE` — sandbox-embed mcp-cadquery/frontend (P1)
- `U-Q-WIRE-TOP-10-PAGES` — execute fleet-launch-day operator surfaces (P0)

### romeo (wiring)
- `U-ROMEO-WIRING-BATCH-1` — next 20 unwired engines from AWARENESS-SNAPSHOT punchlist (P1)
- `U-ROMEO-GHOST-ACTION-AUDIT` — Zod enum vs switch-case drift (P1)
- `U-ROMEO-WIRE-EXEMPT-AUDIT` — validate `// WIRE-EXEMPT:` tag accuracy (P2)

### sierra (system-viz)
- `U-SIERRA-VIZ-BRAIN-MS0-FINISH` — ship remaining 4 of 26 SYSTEM-VIZ-BRAIN units (P0)
- `U-SIERRA-CLICK-TO-ACTION-WEDGE` — viz node → `prism_session:tool_route_best` → dispatcher call (P0, FW-8 — lifts 0.4% take-rate)

### tango (RETIRE or re-scope)
- `U-TAN-RETIRE-OR-RESCOPE` — discovery duplicates /forge-audit-v3 + scrutiny + regression-hunter + sierra system-viz. Operator decision: retire slot OR re-scope to "roadmap pruning" (drain ROADMAP-CONSOLIDATED.md) (P0 governance)

### uniform (RETIRE)
- `U-UNI-RETIRE` — bug-hunting fully duplicated by /forge-audit-v3 + 3-of-3 scrutiny + regression-hunter agent. Operator decision: retire slot OR claim an unassigned domain (P0 governance)

### victor (dormant-data — KEEP, re-scope)
- `U-VIC-PHASE5-TELEMETRY-WIRE` — ship the gap-spec from 2026-05-26 (P0)
- `U-VIC-DORMANT-DATA-GALAXY-CLAUDE-MD` — write galaxy CLAUDE.md (P0)
- `U-VIC-ACTIVATION-FEED-TO-OWNERS` — route dormant-feature candidates to owning domain galaxies (FW synergy)

### whiskey (lathe wizard)
- `U-WHISKEY-GALAXY-R7-REFINE` — close the operator-flagged R7 lathe-soul refine (P0)
- `U-WHISKEY-P2P-MASTERCAM-FUSION-PARITY` — close print-to-program cross-system gaps per operator order-flow lock (P0)
- `U-WHISKEY-OPERATOR-L10N-PL-ES` — Polish/Spanish operator strings (P0, FW-6)

### xray (blueprint-vision)
- `U-XRAY-SAT-PARQT-READERS` — native parsers for SAT/Parasolid X_T (P0)
- `U-XRAY-CONFIDENCE-EMIT-GATE` — per-field `confidence: 0..1` emission gate (P0)
- `U-XRAY-MULTIPRINT-SPLITTER-EXTRACT` — factor multi-print splitter out of `CADPDFBlueprintExtractEngine` (P1)

### zebra (Hermes orchestrator — KEEP)
- `U-ZEBRA-DISPATCH-ACK-LEDGER` — per-slot ack ledger; surfaces dispatch take-rate (P0)
- `U-ZEBRA-HERMES-ZEBRA-OWNERSHIP-BOUNDARY` — CODEOWNERS-style boundary file for shared `engines/hermes-zebra/` with bravo (P1)

### zulu (REASSIGN: → wedm-soul candidate)
- `U-ZUL-REASSIGN-WEDM-SOUL` — claim wedm-soul role from CLAUDE.md D3 pending list (P0, FW-9)
- `U-ZUL-GALAXY-BOOTSTRAP` — galaxy buildout following mike template (P0 after reassignment)

---

## Operator decision points (gating items)

These need explicit operator call before slots can act:

1. **FW-9 reassignments**: confirm november → cam-soul + zulu → wedm-soul from CLAUDE.md D3 pending list. Alternative: hold both as `U-DEA` placeholders longer.
2. **Tango retirement** (`U-TAN-RETIRE-OR-RESCOPE`): retire entirely OR re-scope to roadmap-pruning owner?
3. **Uniform retirement** (`U-UNI-RETIRE`): retire entirely OR claim an unassigned domain?
4. **FW-1 owner**: india runs the trainer-export restore solo, OR fan out via dynamic-workflows fanout to mike+india paired?
5. **FW-2 budget**: 24 slots × half-hour BUILD-KIT populate = ~12h work. Single-slot drive (alpha) OR distribute (each slot owns their 4-file)?

---

## META artifact (compounding-gains tax)

Per `/forge-audit-v3` 6G doctrine: this audit emits 1 re-runnable measurement tool. Owner: **papa or golf** (post-launch).

**Proposed: `scripts/fleet-audit-rescan.mjs`** — re-runs the 10-cluster signal-capture against a fresh BUILD_STATE + slot-souls + buildout briefs + slot-task-claim state. Emits drift vs this baseline JSON. Without it, this audit goes stale in 30 days.

## CLAUDE.md back-flow (per /forge-audit-v3 doctrine)

This audit ships with one `## Recent regressions` line in CLAUDE.md:

`2026-05-28 | fleet-expansion-plan audit shipped (10-agent forge-audit-v3 fanout, 24-slot+2-DEA scope, 9 FW cross-cutting patterns + per-slot expansion catalog) — see state/shared/specs/FLEET-EXPANSION-PLAN-2026-05-28.md | observed-by: slot:alpha a198ff5f`

## Synergy hooks — cross-cluster map (where domains feed each other)

| From | To | Surface | Status |
|---|---|---|---|
| delta (CAD) | kilo (CAM) | feature taxonomy → strategy recommend | wired, needs galaxy-level contract test |
| delta (CAD) | echo (post) | GD&T callout → post macro | partially wired |
| delta (CAD) | charlie (quote) | DfM cost driver | wired via BlueprintToQuote |
| kilo (CAM) | echo (post) | toolpath → post template | wired via cam_post_invoke_orchestrate |
| kilo (CAM) | foxtrot/whiskey/mike | per-domain CAM strategy data | YELLOW — needs domain split |
| echo (post) | india (training) | post training feedback → calibration | doctrine, unverified in code |
| charlie (quote) | hotel (ERP) | quote→order envelope | **DEAD-LINK** (FW gap) |
| hotel (ERP) | india (training) | 7-vendor adapter pairs as supervised data | unwired |
| hotel (ERP) | charlie (quote) | actuals→calibration | **ONE-WAY DEAD-END** |
| foxtrot/whiskey/mike | india | corpus harvest, LoRA, calibration, feedback | mike full; others partial |
| india | EVERY wizard slot | 4 canonical surfaces | mike full (4/4); others 1-3/4 |
| lima (academy) | india (training) | pypdf 8752-page corpus | wired |
| xray (blueprint) | delta (CAD) | OCR → CAD generation | wired |
| sierra (viz) | every slot | system-viz render | wired but 0.4% take-rate — FW-8 |
| golf (hygiene) | every slot | orphan reap + CLAUDE.md gate | wired |
| zebra (orchestrator) | every slot | SendKeys dispatch | wired, no ack ledger — U-ZEBRA-DISPATCH-ACK-LEDGER |
| quebec (frontend) | every slot | UI surface for each domain | NEEDS-SCAFFOLD-THEN-WIRE; quebec gates merge on UI contract per slot |

---

## How slot chats consume this catalog

1. Run `/checkin-<slot>` to bind your slot.
2. Run `/pick-unit` per your existing queue — your in-flight HANDOFF/atomic-roadmap takes priority.
3. When your existing queue empties OR when an item in this catalog outranks your queue's top item on Ψ/SVI, copy the unit ID + spec line into your slot's atomic-roadmap.json with `source: "fleet-audit-2026-05-28"`.
4. Carry doctrine forward: each unit must respect the per-file scrutiny gate, 3-of-3 scrutiny, slot-worktree commit discipline.
5. **No slot is required to take any of these.** This is a catalog, not a queue assignment.

Built by slot:alpha 2026-05-28 via `/forge-audit-v3` 10-agent dynamic-workflows fanout. Reviewer arms (cross-vendor octopus consensus) deferred to follow-up — slots can run `prism_ai:consensus_decide` against this spec for second opinion if disagreement surfaces.
