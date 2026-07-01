---
artifact: fleet-rollup
campaign: FLEET-PHD-BUILDOUT + KIENZLE-FRONTEND-ROLLOUT
owner_slot: zulu (fleet orchestrator)
generated_at: 2026-06-26
status: active
scope_count: 16 domains
parent: state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md
---

# FLEET ROLLUP — PhD-Buildout + Kienzle Frontend Rollout (16 domains)

> Synthesis of the master orchestration plan (§1–§6, owner zulu) + the per-domain template (10 axes) +
> live fleet signals verified this session. Grounds the 16-slot deepen→test→simulate→validate→fine-tune→frontend campaign.

## 1 — Coverage

**CORRECTED 2026-06-27 (slot:zulu, R12):** A prior version of this rollup reported all 16 per-domain plans "NOT yet
written." That was **wrong** — the fan-out's *agent return-summaries* came back empty, and the synthesis step mistook
empty summaries for empty files. In reality the plan FILES were written to disk. A read-only 15-agent verification pass
(workflow `fpb-domain-plan-verify`, each reviewer grounding citations against the galaxy CLAUDE/MEMORY + Kienzle dir)
established the true state below. **All 16 DOMAIN-PLAN files now exist and are verified.**

| Slot | Galaxy | Plan file | Lines | Status |
|------|--------|-----------|-------|--------|
| oscar | speed-feed | DOMAIN-PLAN-oscar.md | 302 | ✅ COMMITTED (exemplar, `42cd2acd33`) |
| charlie | quoting | DOMAIN-PLAN-charlie.md | 186 | ✅ VERIFIED PASS (10/10, no fabrication) |
| delta | cad | DOMAIN-PLAN-delta.md | 461 | ✅ VERIFIED PASS |
| echo | post-processor | DOMAIN-PLAN-echo.md | 448 | ✅ VERIFIED PASS (655 pp_ actions confirmed) |
| foxtrot | mill | DOMAIN-PLAN-foxtrot.md | 401 | ✅ VERIFIED PASS |
| hotel | business | DOMAIN-PLAN-hotel.md | 371 | ✅ VERIFIED PASS |
| india | ai-training | DOMAIN-PLAN-india.md | 373 | ✅ VERIFIED PASS |
| kilo | cam | DOMAIN-PLAN-kilo.md | 430 | ✅ VERIFIED PASS |
| lima | academy | DOMAIN-PLAN-lima.md | 463 | ✅ VERIFIED PASS (18 engines confirmed) |
| mike | wedm | DOMAIN-PLAN-mike.md | 402 | ✅ VERIFIED PASS (164 engines / 280 actions confirmed) |
| quebec | frontend-app | DOMAIN-PLAN-quebec.md | 390 | ✅ VERIFIED PASS |
| romeo | wiring | DOMAIN-PLAN-romeo.md | 369 | ✅ VERIFIED PASS |
| sierra | system-viz | DOMAIN-PLAN-sierra.md | 392 | ✅ VERIFIED PASS |
| whiskey | lathe | DOMAIN-PLAN-whiskey.md | ~285 | ✅ FIXED from PARTIAL — Kienzle filename `Kienzle Wizards.dc.html`, CSS action `lathe_css_optimize` (verified), `g76_multipass_plan` marked UNVERIFIED |
| xray | blueprint-vision | DOMAIN-PLAN-xray.md | 670 | ✅ AUTHORED 2026-06-27 (was MISSING) — dispatcher actions grep-confirmed in `cadDispatcher.ts`; `xproc_outcome_publish` UNVERIFIED |
| zulu | hermes-zulu | DOMAIN-PLAN-zulu.md | 587 | ✅ AUTHORED 2026-06-27 (was MISSING) — orchestration-appropriate (not machining); xproc_*/Express routes marked UNVERIFIED |

**True gap caught by verification (R16 — loop until gaps closed):** xray + zulu plans were genuinely ABSENT (the fan-out
wrote 13, not 15); whiskey shipped with a non-existent Kienzle filename + 2 unverified action names. All three are now
resolved. Scaffolding itself is NOT a gap — `AI-SYNERGY-AUDIT.md` (2026-06-26) scores all 34 galaxies 1/strong across 5
dims; the 13-artifact per-slot buildout exists. Remaining open work is **depth + per-slot execution + frontend** (§2–§6).

## 2 — Cross-domain dependency order

Per master §5, justified by the actual surfaced dependencies:

1. **INFRA-FIRST — india · romeo · sierra · zulu.** These unblock every other domain's *fine-tune* + *discoverability* legs.
   - **india (ai-training)** owns LoRA/RAG/CAG/NN-GNN retrain — the §7 fine-tune loop of all 15 other plans terminates in india. Its
     substrate must be live before any domain's "results→retrain" closes. (Live blocker: full-coverage NN gate failing — §3.)
   - **romeo (wiring)** owns engine→dispatcher closure: every §8 frontend wire and §4 dispatcher-roundtrip test assumes no dead wires.
   - **sierra (system-viz/master-index)** owns the search substrate the deepening loops mine; cross-substrate edges + master-brain
     back-pointers (vault §5) are sierra's surface.
   - **zulu (hermes-zulu)** orchestrates the loops/crons + octopus consensus.
2. **PHYSICS/CORE — oscar → {foxtrot, whiskey, mike} → kilo → echo → {delta, xray}.**
   - **oscar (speed-feed)** is the physics root: its Kienzle Speed-Feed flagship (726 lines) and SFC core feed mill/lathe/wedm cutting
     params. The recent SFC regressions (deflection-Vc lever, over-power efficiency, Taylor-C divergence — `## Recent regressions`)
     confirm SFC must be validated FIRST or every downstream wizard inherits bad numbers.
   - **foxtrot/whiskey/mike** (mill/lathe/wedm wizards) consume oscar's validated SFC.
   - **kilo (cam)** consumes wizard strategy → toolpath; **echo (post)** consumes CAM output → controller G-code (post dispatcher · prism_cam).
   - **delta (cad)/xray (blueprint)** feed geometry/features upstream into the pipeline; grouped here as the geometry producers.
3. **BUSINESS/QUOTE — charlie → hotel.** charlie (quoting) consumes physics + cad outputs (cost = material + cycle-time from SFC);
   hotel (business/ERP) consumes quoting outcomes (quote→order→invoice).
4. **FRONTEND — quebec, continuously, LAST per domain.** One Kienzle page per *validated* backend; never a UI atop an unproven backend (§4 below).

## 3 — Shared infrastructure & risks (live signals, verified this session)

- **NN/GNN full-coverage gate FAILING (owner: india).** `state/shared/nn-graph/NN-EVAL.json`: **AUROC 0.7589 < 0.78,
  macro-F1 0.2057 < 0.55, Brier 0.2565 > 0.15** → verdict `shipped-research-only`. Tier-5 wiring-inference is deploy-ready ONLY in the
  selective/high-conf band (per [[gnn-selective-deploy]]); full-coverage lift = reference-pool growth + sharper features (H2GCN/GPU retrain),
  NOT calibration. **Every domain's §7 NN/GNN leg depends on india closing this.** Do not report full-coverage NN as production-ready (R12).
- **Vault pipeline health = WARN** (`vault-health.mjs --text`, VERIFIED LIVE 2026-06-27): overnight `brain-refresh` shows **wiki-tribal + vault-links
  FAILED (5/8 pipelines ok)** — galaxy-synth is OK (an earlier draft of this rollup overstated it as "galaxy-synth + vault-links, 4/8"; corrected per
  live probe, R12). Also **133 supersession (stale-as-current)** unmarked across 58 stems (149 already marked), **11 ambiguous broken links**, and
  doctrine-contradiction scan only **13.2% coverage** (149/1130 pairs) — a low-coverage scan, NOT a clean bill. Repairs (owner golf/sierra — heavy/gated,
  NOT auto-run from zulu): `node scripts/brain-refresh.mjs --force` re-embeds the ~537MB tribal index (clobber-guarded since the 2026-06-08/10
  regressions — run supervised); `vault-supersession-detector.mjs --write` persists the analysis (report done 2026-06-27), but the actual SUPERSEDED
  marking is an **operator-gated `--mark`** follow-up unit. This degrades the deepening + recall legs fleet-wide until repaired.
- **Hermes proxy is UP — octopus NOT degraded (R12 correction).** `hermes_status` = `{up:true, httpStatus:200, upstream:"xAI Grok OAuth", authenticated:true}`.
  The earlier framing of "Hermes down degrading octopus" does not hold this session; octopus multi-model consensus is available for crossroads.
- **Kienzle design source confirmed:** 26 `.dc.html` pages live under `mcp-server/web/design-imports/kienzle-app-build/`. The 16 domains map
  to a subset; Materials/Tool-Crib/Quality/Shop-Floor pages belong to galaxies outside the operator's 16 (master §1 footnote) — quebec still
  implements them but their backend owners (kilo/mill, golf-quality, shop-floor) sit outside this campaign.
- **SFC core fragility (cross-cutting).** Five SFC regressions in the last 3 days (`## Recent regressions`, slot:oscar) — the physics root is
  high-churn; validate oscar before mill/lathe/wedm/cam/quoting build on it.

## 4 — Kienzle frontend rollout sequence (quebec, grouped by validated backend)

Quebec implements one `.dc.html` → `src/pages/*.tsx` per unit (reuse-first; Codex Page Protection), each gated on its backend passing §6.
Order follows the dependency chain so no page renders atop an unproven backend:

**Wave A — infra/visibility (backends already live, low physics risk):**
1. Backend Wiring Map (romeo) → AuditManagerPage  
2. System Sync (sierra/india/zulu orchestrator surface)  
3. Audit & Rebrand (quebec self — global shell, App.tsx routing, iOS tokens)

**Wave B — physics core (gated on oscar SFC validation FIRST):**
4. Speed-Feed (oscar) → CalculatorPage / CycleTimePage — the flagship; backend already has parity probe + safety gate
5. Mill Wizards (foxtrot) → mill wizard page  
6. Lathe Wizards (whiskey) → LatheWizardPage  
7. Wire Wizards (mike) → EdmPage / WireEdmWizardPage

**Wave C — CAM/post/geometry (gated on Wave B):**
8. Collision Gap — CAM (kilo) → CamStrategyPage / CncOpsPage  
9. Tooling Shop (kilo/mill) → CncOpsPage  
10. Post + Alarm Decoder (echo) → PostPage / AlarmPage  
11. CAD Features + Collision Gap + Thermal Comp + Trilobe Creator + Warm-Up Generator (delta) → CADAIStatePage / CADRegenerationDashboardPage  
12. Blueprint Intake (xray) → BlueprintQuotePage / DocumentInboxPage

**Wave D — quote/business (gated on physics + cad):**
13. Quote + Job Cost (charlie) → CostEstimatorPage / BlueprintQuotePage / AdditiveQuotePage  
14. ERP + Employee Portal + Payroll Labor + Scheduling + Inventory (hotel) → BusinessSuitePage / EmployeePortalPage / CapacityPlanningPage

**Wave E — academy + adjacency:**
15. Academy (lima) → CourseViewerPage  
16. Materials / Tool Crib / Quality / Shop Floor (adjacent backends) — implement last; confirm route owners exist (no dead wires).

Each page: verify at desktop + iPhone 14 + Pixel 7, live data round-trips `:3100`, parity with backend core (§6).

## 5 — Obsidian vault maximization (system-wide deepening loop)

The continuous-deepening leg that makes "PhD master" an engineered loop, not a one-shot:

- **Wiki-tribal + vault-links refresh** — the 2 pipelines **FAILING in overnight brain-refresh** (VERIFIED 2026-06-27; galaxy-synth is OK, not failing).
  Re-run `brain-refresh.mjs --force` (supervised, clobber-guarded) to restore them. Galaxy-synthesis (`galaxy-synthesis-refresh.mjs` →
  `memory_patterns.<galaxy>_synthesis`, feeds the `documented-by` cross-substrate edges) is healthy.
- **Cross-substrate edges** — `generate-cross-substrate-edges.mjs` (typed ADD-only: `documented-by` / `owned-by-slot` / `embeds` /
  `consensus-of`) → `cross-substrate-edges-augmentation.json`, folded by `merge-augmentations.mjs` on `regen-viz`. Confirm endpoints against
  the node-card offset oracle (not a rotating augmentation — per the 2026-06-10 regression).
- **Master-brain back-pointers** — galaxy-buildout STEP 5d appends one row per galaxy to the master-index registry so master is never blind
  to a per-domain brain (`KNOWS-MAP.json` / `MASTER-DIGEST.md` federation feed-up).
- **CAG cold-anchor + RAG re-embed** — per domain, cache static doctrine (`cag-router.mjs`) + re-embed the document trove so recall hit-rate
  climbs from the current ~2–3%.
- **Supersession + contradiction hygiene** — clear the 127 stale-as-current entries (`vault-supersession-detector.mjs --write`) + raise
  contradiction-scan coverage above the current 13.2%.

**Cron cadence:** nightly `mine-galaxy-transcripts.mjs` (Ollama-on-Blackwell, free) → galaxy synthesis → tribal/wiki/memory writes →
`brain-refresh.mjs` (8-pipeline) → re-embed. Ollama owns ≥70% of the mechanical read/summarize/classify; Claude owns synthesis + safety.
Acceptance signal per domain: AI-synergy audit score + recall coverage %.

## 6 — Next concrete actions (highest-leverage, in order)

> **CAMPAIGN STATUS UPDATE 2026-06-28 (slot:zulu, R12-verified):** Infrastructure is fully
> stood-up + self-driving. **16 DOMAIN-PLAN files done; Kienzle build (26 `.dc.html`) located +
> mapped; continuity driver `scripts/fleet-phd-continuity.mjs` + durable cron `901612f6` live**,
> writing `state/shared/dashboards/FLEET-PHD-CONTINUITY.{json,md}` every 30 min. **Live campaign
> state: 15 advancing · 1 done (lima) · 0 stalled · 0 blocked** of 16. The two prior stalls
> resolved: **quebec** was a driver false-positive (frontend-app is loop-deepened — commits land
> in `mcp-server/web/`, no galaxy-mine task by design — fixed in `U-PHD-QUEBEC-LOOPDEEPENED`
> + `-P2`, 19/19 tests, 3-of-3 PASS; now advancing on 26 web/ commits); **xray** self-resolved
> (OCR Training Loop now healthy). **Remaining = per-slot EXECUTION (route to specialists, not
> orchestrator-build) + operator-only items below.** The dashboard `.md` is the live source of
> truth; this §6 list is the standing directive.

1. **✅ DONE (2026-06-27, slot:zulu) — all 16 DOMAIN-PLAN files authored + verified.** 13 verified PASS, whiskey corrected,
   xray+zulu freshly authored (were missing). The campaign is now UNBLOCKED for per-slot execution (item 7). Highest leverage shifts to #2–#6.
2. **Repair the vault pipeline** — `node scripts/brain-refresh.mjs --force` (fix galaxy-synth + vault-links, 4/8→8/8) then
   `node scripts/vault-supersession-detector.mjs --write` (clear 127 stale-as-current). Unblocks every domain's §3 deepening leg.
3. **Validate oscar SFC FIRST** (physics root) — re-run the parity probe + 401-assert gauntlet across all 6 ISO groups; oscar's 5 recent
   regressions mean mill/lathe/wedm/cam/quoting must NOT build on unvalidated SFC.
4. **india: grow the NN refpool** toward the full-coverage gate (AUROC 0.78 / macro-F1 0.55 / Brier 0.15) via reference-pool growth +
   sharper features (H2GCN/GPU retrain on Blackwell); ship tier-5 in the selective band now, defer full-coverage claims.
5. **romeo: close engine→dispatcher wiring** (`audit-unwired-engines.mjs`) so quebec's §8 frontend wires + §4 dispatcher round-trips hit no
   dead routes — gates Wave A frontend.
6. **quebec: start Kienzle Wave A** (Backend Wiring Map, System Sync, Audit & Rebrand global shell + App.tsx routing + iOS tokens) — the
   low-physics-risk pages whose backends are already live.
7. **Per-slot /checkin-<slot> + /loop** in dependency order (§2): infra → oscar → wizards → cam/post → cad/blueprint → charlie → hotel,
   each committing in its own slot worktree, frontend last per domain.
8. **Stand up the nightly deepening cron** (§5) so PhD-depth compounds continuously rather than per-session; report 7-day expiry to operator
   if scheduled via the session scheduler.
