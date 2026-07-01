---
artifact: master-orchestration-plan
campaign: FLEET-PHD-BUILDOUT + KIENZLE-FRONTEND-ROLLOUT
owner_slot: zulu (fleet orchestrator)
generated_at: 2026-06-26
status: active
scope_count: 16 domains
---

# MASTER ORCHESTRATION PLAN — Fleet PhD-Buildout + Kienzle Frontend Rollout

> **Work order (operator, via /checkin-zulu 2026-06-26):** continue zulu's hermes-session campaign —
> bring **16 domain galaxies** to **PhD-master depth** (context · tribal · wiki · memories), using the full
> PSN toolset (/learn · Ollama-on-Blackwell · Obsidian vault · system-viz · NN/GNN/LoRA/RAG/CAG · harnesses ·
> engineered loops · crons), then produce **finalized per-domain plans** to fully **test → simulate → validate
> → fine-tune**, and **instructions to build each domain's frontend** from the new **Kienzle Claude-Design build**.

## 0 — Honest state (R12, verified this session)
- **Scaffolding is DONE for all 34 galaxies** — `state/shared/specs/AI-SYNERGY-AUDIT.md` (2026-06-26) scores every
  galaxy **1/strong** across all 5 dims (discoverability · ownsOrWiresAi · vaultSynergy · crossSubstrate · awarenessSurface).
  The 13-artifact per-slot buildout (CLAUDE/MEMORY/PATHS/TOOLBELT/AWARENESS + souls + synthesis + master-brain edges) exists per slot.
- **Therefore the OPEN work is depth + plans + frontend, not re-scaffolding.** "PhD-master" is an *engineered loop*
  (continuous deepening), not a one-turn completion — this plan SCHEDULES it; it does not pretend to finish it in one session.
- **Kienzle build located + verified:** `H:\KIENZLE APP BUILD.zip` → `mcp-server/web/design-imports/kienzle-app-build/`
  (26 `.dc.html` design pages, Claude-Design project `9e002608`). The canonical NEW UI for the whole app; all builds change to match.
  Rollout doctrine: **quebec implements each page → `src/pages/` consuming dispatchers; the domain slot owns the backend the page consumes.**

## 1 — The 16 domains × Kienzle-page × backend mapping (deterministic — orchestrator-owned)

| Slot | Galaxy | Galaxy dir | Kienzle design page(s) | Primary dispatcher(s) | Frontend target (reuse-first) |
|------|--------|-----------|------------------------|-----------------------|-------------------------------|
| **charlie** | quoting | engines/quoting | Quote · Job Cost | prism_quoting · prism_business | CostEstimatorPage / BlueprintQuotePage / AdditiveQuotePage |
| **delta** | cad | engines/cad | CAD Features · Collision Gap · Thermal Comp · Trilobe Creator · Warm-Up Generator | prism_cad | CADAIStatePage / CADRegenerationDashboardPage |
| **echo** | post-processor | engines/post-processor | Post · Alarm Decoder | post dispatcher · prism_cam | (new) PostPage / AlarmPage |
| **foxtrot** | mill | engines/mill | Wizards (mill) | prism_mill | (mill wizard page) |
| **hotel** | business | engines/business | ERP · Employee Portal · Payroll Labor · Scheduling · Inventory | prism_business | BusinessSuitePage / EmployeePortalPage / CapacityPlanningPage |
| **india** | ai-training | engines/ai-training | System Sync (AI/training surface) | prism_ai · prism_intelligence | AILearningDashboardPage |
| **kilo** | cam | engines/cam | Collision Gap (CAM) · Tooling Shop | prism_cam | CamStrategyPage / CncOpsPage |
| **lima** | academy | engines/academy | Academy | academy dispatcher | CourseViewerPage |
| **mike** | wedm | engines/wedm | Wizards (wire) | wedm dispatcher | EdmPage / WireEdmWizardPage |
| **oscar** | speed-feed | engines/speed-feed | **Speed-Feed** (726-line flagship) | prism_calc · prism_product (sfc) | CalculatorPage / CycleTimePage |
| **quebec** | frontend-app | engines/frontend-app | **ALL pages** + Audit & Rebrand (implementer) | (consumes all) | the whole `src/pages/` shell + App.tsx routing |
| **romeo** | wiring | engines/wiring | Backend Wiring Map | (wiring closure) | AuditManagerPage / wiring-map view |
| **sierra** | system-viz | engines/system-viz | System Sync · Backend Wiring Map | prism_session (master_index) | system-viz surface |
| **whiskey** | lathe | engines/lathe | Wizards (lathe) | prism_turning | LatheWizardPage |
| **xray** | blueprint-vision | engines/blueprint-vision | Blueprint Intake | prism_cad (blueprint) | BlueprintQuotePage / DocumentInboxPage |
| **zulu** | hermes-zulu | engines/hermes-zulu | System Sync (orchestrator surface) | prism_orchestrate | (orchestrator/fleet dashboard) |

> Kienzle pages NOT in the 16 (covered by adjacent slots, tracked here so none orphan): **Materials**/**Tool Crib**/**Tooling Shop** → kilo/mill (Tool Crib already bridged `/api/v1/tool-crib`); **Quality** → quality galaxy (golf); **Shop Floor** → shop-floor galaxy. Quebec implements these too, but their backend owners sit outside the operator's 16.

## 2 — The five plan axes (every DOMAIN-PLAN-<slot>.md fills these)
Per-domain template: `state/shared/domain-plans/_TEMPLATE.md`. The five axes the operator named:
1. **Deepen → PhD master** — bounded fill-work (tribal/wiki/memory/RAG/CAG/LoRA/NN-GNN) + the engineered loop + cron that runs it continuously (Ollama-on-Blackwell does the mechanical reading; Claude does synthesis/safety).
2. **Test** — real reference/invariant tests through the dispatcher; happy + ≥3 failure + ≥2 adversarial + ≥3 spanning configs.
3. **Simulate** — physics sim / dry-run / live JM-Die replay / Monte-Carlo; numeric pass criteria.
4. **Validate** — live data + numbers + acceptance gates (parity probe, S(x) safety, MAPE/in-band).
5. **Fine-tune** — results → LoRA/RAG/CAG/NN-GNN/closed-loop retrain, gated promotion.
6. **Frontend (Kienzle)** — implement the assigned `.dc.html` 1:1 → `src/pages/` (reuse-first), wire to the dispatcher/API on `:3100`, iOS tokens + mobile-first, verify with 3-viewport screenshots.

## 3 — Vault maximization (system-wide leg of the work order)
- **Obsidian = the persistent brain.** Every domain plan's deepening writes feed `knowledge/memories/<type>/` via `stop-obsidian-memory-feed.mjs` and surface fleet-wide via the master index.
- Maximize: galaxy synthesis refresh (`galaxy-synthesis-refresh.mjs`) · cross-substrate edges (documented-by/owned-by-slot/embeds) · master-brain back-pointers (STEP 5d) · vault-health pipelines (the SessionStart alert flagged `vault-links 5/8` — fix via `node scripts/brain-refresh.mjs --force` + `node scripts/vault-health.mjs --text`).
- CAG cold-anchor + RAG re-embed per domain so recall hit-rate climbs from the current ~2–3%.

## 4 — Execution mechanism (how the fleet runs this)
- **This session (zulu):** author this plan + template, fan out 16 plan-generation agents (one per domain) → `DOMAIN-PLAN-<slot>.md`, synthesize the fleet rollup.
- **Then per-slot:** each slot runs its DOMAIN-PLAN via `/checkin-<slot>` + `/loop` — deepen → test → simulate → validate → fine-tune, in logical order, committing in its slot worktree.
- **Frontend rollout:** quebec drives the Kienzle `.dc.html` → `src/pages/` implementation one page per unit (per-file scrutiny), consuming each domain's now-validated backend. Frontend is LAST per domain (never UI atop an unproven backend).
- **Orchestration substrate:** Hermes fleet orchestrator (zulu) + `brainstorm-path-forward` at crossroads + `mine-galaxy-transcripts.mjs` for the deepening corpus + scheduled crons for the continuous loops.

## 5 — Sequencing across domains (dependency order — R13)
1. **Infra-first:** india (AI/NN/GNN/LoRA/RAG substrate) + romeo (wiring closure) + sierra (system-viz/index) + zulu (orchestration) — these unblock every other domain's fine-tune + discoverability legs.
2. **Physics/core domains:** oscar (SFC — feeds mill/lathe/wedm) → foxtrot/whiskey/mike (wizards) → kilo (cam) → echo (post) → delta/xray (cad/blueprint).
3. **Business/quote:** charlie (quoting, consumes physics+cad) → hotel (ERP/business, consumes quoting outcomes).
4. **Frontend:** quebec, continuously, one Kienzle page per validated backend.

## 6 — Per-domain plans (filled by fan-out)
- `state/shared/domain-plans/DOMAIN-PLAN-<slot>.md` for each of the 16 (see §1).
- Fleet rollup: `state/shared/domain-plans/01-FLEET-ROLLUP.md`.
