## shop-floor — fleet-managed

### Current state

**Size:** 9,511 bytes · 110 lines
**Quality grade:** PARTIAL

The file has a useful §1 domain scope and §Related galaxies list. The auto-populated GALAXY-CLAUDEMD-FILL block adds some load-bearing pointers (Ollama offload, loop discipline, vault recall, LoRA/CAG/RAG harness, algorithm primitives). The cross-cutting methodology, Critic contract, and keep-working stanza are generic clones present in every galaxy file.

**Stale / inaccurate / fabricated content found:**

1. **`mcp-server/src/data/alarm-registry.ts` — file does NOT exist on disk** (verified via Glob). The CLAUDE.md cites it with `(verify)` but never corrects it. The real alarm data lives at `mcp-server/src/data/alarm-categorization.ts` + `mcp-server/src/data/controller-alarm-database.json` (both verified on disk).
2. **`TravelerEngine` — engine does NOT exist.** The CLAUDE.md §1 names it; MEMORY.md §Key engines calls out the error and names the correct engine `JobTravelerEngine.ts` (verified on disk). The CLAUDE.md stub was never corrected.
3. **`MachineLive*` cluster cited but no `MachineLive*.ts` file exists** (Glob returned zero results). The live monitoring surface is owned by `machineLiveDispatcher.ts` (40 actions per file header, NOT 74 as stated in MEMORY.md DISPATCHER_DIGEST citation — discrepancy unresolved).
4. **§3 "Common shop-floor engines" lists only 3 engines**, all using placeholder/generic names (`MachineLive*`, `TravelerEngine`, `EmployeePerMachineSFAdaptiveEngine`). The real flat-engine list has 60+ named engines (PATHS.md) none of which are documented in CLAUDE.md.
5. **§5/6/7 marked "STUB"** explicitly — the three sections covering dispatcher wiring, operational patterns, and daily-use commands were never filled.
6. **DISPATCHER_DIGEST action count discrepancy:** MEMORY.md cites `prism_machine_live` as 74 actions; machineLiveDispatcher.ts header states 40 actions. One of these is stale — needs reconciliation.
7. **`"Domain dispatchers: none cited"` in PATHS.md** — the dispatchers section in TOOLBELT.md is `(owning slot lists... here)` placeholder, never populated despite being the primary daily-use surface.
8. **Ollama model tags `:3b/:7b/:14b` retired 2026-06-04** per global CLAUDE.md but the cross-cutting methodology block correctly uses `:32b`/`:120b` — this is fine.

---

### KEEP

- **§1 Domain scope** — accurate definition of what shop-floor owns (machine live status, spindle-load streaming, override-percent feedback, alarm intake, traveler tracking, job-cost vs actual rollups, operator-day digest, per-machine adaptive feedback) and explicit exclusions (prediction/pre-execution validation, G-code generation). Keep verbatim.
- **§Related galaxies (PSN edges)** — lathe/wedm/compliance-safety symmetric edges are accurate and load-bearing for routing decisions.
- **Cross-cutting methodology §PC-specs + Ollama** — hardware spec pointer + correct Ollama tier routing (`gpt-oss:20b` for alarm triage/MTConnect, Claude for S(x)/adaptive-control). Keep with alarm-triage example.
- **Cross-cutting methodology §Loops** — `loop-state tick` discipline, parallel reviewer agents in ONE message, self-contained subagent prompts. Generic but correct, keep as pointer.
- **Cross-cutting methodology §Obsidian vault** — recall routing `prism_memory:semantic_search query="shop-floor" topK=20`, vault paths `knowledge/{memories,wiki,tribal}/shop-floor/`. Accurate and saves tokens.
- **Cross-cutting methodology §Harness · LoRA · CAG · RAG** — correct doctrine for this domain's AI build.
- **§Critic + keep-working contract** — pointer form only, no duplication. Keep.
- **AI-SYSTEMS-STATE pointer block** — correct synergy pointer, keep.
- **AI-CAPABILITIES block** — accurate description of how this galaxy connects to GNN/LoRA/RAG/CAG/embeddings. Keep.

---

### DROP

- **§"Domain knowledge" Ollama-distilled prose paragraph** — 5 lines of vague generic text about PRISM OS and H: drive doctrine; zero shop-floor-specific content. Token waste with an `⚠ advisory; verify` warning that signals it should not be trusted. Drop entirely (the concrete content is in MEMORY.md and PATHS.md).
- **§"High-ROI domain memories" block inside CLAUDE.md** — 5 bullets that duplicate MEMORY.md verbatim (feedback_prism_os, feedback_h_drive_master_persistent, etc.). CLAUDE.md is doctrine, not a memory mirror. Drop; they belong in MEMORY.md only.
- **§"Tribal pointers" block inside CLAUDE.md** — 3 wiki paths listed (`jm-die-test-shop-pattern.md`, `math-shop-floor-management-throughput-oee.md`, `soft-relief-age-floor.md`). These are discoverable via standard vault recall; listing them in doctrine is stale-prone. Drop; replace with a single recall command.
- **§"Test commands" duplication** — appears TWICE (§4 and inside the GALAXY-CLAUDEMD-FILL block). Drop one instance.
- **§"Key engines (grounded in PATHS.md)"** — lists 12 `Adaptive*Engine` paths with NO description, all pointing to the flat engines dir (not a shop-floor-specific subdir). This is an unfiltered PATHS.md excerpt with no curation. Drop; replace with a curated, verified, described engine table (see ADD).
- **Cross-refs block at the bottom** — links to `../CLAUDE.md` and `../MEMORY.md` (parent dirs that don't exist as relative paths from this subdir); the DOMAIN-GALAXY-DOCTRINE spec link is useful but the sibling links are wrong relative paths. Drop the broken sibling links.
- **"Likely location" qualifier on `alarm-registry.ts`** — the whole row must be dropped and replaced with the verified real paths.
- **§5/6/7 STUB section** — the explicit STUB comment with no content is dead weight. Drop the heading; add real content (see ADD).

---

### ADD (domain-specific — the heart of this assessment)

#### 1. Verified engine registry (curated, 12 primary + 4 adaptive)

Engines verified on disk via PATHS.md + MEMORY.md cross-check:

| Engine | Role |
|---|---|
| `ShopStateEngine.ts` | Central state owner — ALL job lifecycle, traveler, labor, approval changes flow through here; emits `ShopEvent`s for WebSocket delivery |
| `ShopFloorDashboardEngine.ts` | Real-time shop floor status dashboard |
| `ShopFloorJobEngine.ts` | Job tracking + work order management |
| `ShopFloorReportEngine.ts` | Production reports + analytics |
| `ShopFloorScheduleEngine.ts` | Production scheduling + capacity |
| `ShopConfigurationEngine.ts` | Centralized shop rate + machine configuration (21 machines at JM Die) |
| `JobTravelerEngine.ts` | Job-traveler tracking (NOT `TravelerEngine` — that engine does not exist) |
| `ShopFloorCostEngine.ts` | Job cost vs actual rollups |
| `ShopFloorCheckInEngine.ts` | Operator check-in surface |
| `EmployeePerMachineSFAdaptiveEngine.ts` | Per-machine adaptive feedback — cross-galaxy with business/HR |
| `EmployeeShopFloorMobileEngine.ts` | Operator-facing mobile surface |
| `AdaptiveOverrideEngine.ts` | Override-percent feedback loop |
| `AdaptiveSpindleControlEngine.ts` | Live spindle adaptive control |
| `ShopOutcomeIngestProcessorEngine.ts` | Outcome ingest — feeds LoRA + GNN ref pool |
| `E2ShopConnectorEngine.ts` | E2 ERP shop connector |
| `ShopFloorNoteIngestionEngine.ts` | Operator note ingest → tribal knowledge |

#### 2. Dispatcher surface (daily-use — verified)

| Dispatcher | Server tool name | Actions | Primary use |
|---|---|---|---|
| `machineLiveDispatcher.ts` | `prism_machine_live` | 40 (per file header) | Real-time machine connectivity, adaptive control, predictive maintenance, Industry 4.0 |
| `automationDispatcher.ts` | `prism_automation` | 9 | OEE calculation, bottleneck analysis, shop floor automation |
| `shopDispatcher` | _(name in server.ts — verify)_ | 153 | Shop-domain surface: job/traveler/labor/cost |
| `shopPracticeDispatcher.ts` | `prism_shop_practice` | 53 | Shop practice knowledge base: ingest/search/audit machining practices |
| `dataDispatcher` | `prism_data` | — | AlarmDB (10,090 entries) + MachineDB (1,015 entries) + ReportTemplateDB (7) |

**Most-used action patterns:**
```
prism_machine_live: machine_connect, machine_status, adaptive_feed_control, predictive_maintenance_analysis
prism_automation: oee_calculate, bottleneck_identify
prism_data: database_search (AlarmDB, MachineDB), database_list
prism_shop_practice: practice_search, practice_ingest
```

#### 3. Alarm data — verified real paths (replace stale `alarm-registry.ts`)

```
mcp-server/src/data/alarm-categorization.ts      ← alarm category definitions (VERIFIED on disk)
mcp-server/src/data/controller-alarm-database.json ← per-controller alarm codes (VERIFIED on disk)
mcp-server/data/databases/AlarmDB/               ← 10,090 entries, query via prism_data:database_search
```

Do NOT reference `alarm-registry.ts` — it does not exist.

#### 4. DB intake (shop-floor daily)

Registered in `data/databases/DB_MANIFEST.json`, query via `prism_data:database_search`:
- **AlarmDB** — 10,090 alarm entries (controller × code × severity × fix)
- **MachineDB** — 1,015 machine entries (specs, limits, per-machine envelope)
- **ReportTemplateDB** — 7 report templates

Per-machine envelope / axis limits: `mcp-server/src/data/jm-die-profile.ts` (21 machines, VERIFIED on disk).

#### 5. JM Die shop-floor ground truth

```
H:/PRISM/JM DIE/SETUPS/        ← setup sheets per machine/job
H:/PRISM/JM DIE/QUEUE/         ← active job queue
H:/PRISM/JM DIE/CONTROLLERS/   ← controller configs (Haas, Okuma, Hurco, Fanuc, Roku-Roku)
mcp-server/data/jm-die-database/ ← 38,251 indexed files (manifest.json + .index/*.jsonl)
```

**JM Die machine fleet (21 machines from `ShopConfigurationEngine.ts`):** VMC-01..VMC-05 (Haas VF-series mill), lathe (Okuma MULTUS), WEDM (Roku-Roku), Hurco mill — all produce live status events this galaxy must handle.

#### 6. Schemas (verified in MEMORY.md)

```typescript
mcp-server/src/schemas/shop/shopDomain.ts      // Job / Traveler / Labor types
mcp-server/src/schemas/liveEventContracts.ts   // ShopEvent, WebSocket room helpers
```
Both imported by `ShopStateEngine.ts`. Every live event must conform to `ShopEvent` shape.

#### 7. Algorithm primitives (from MEMORY.md — verified wired)

Via `prism_algorithm` dispatcher:
- `signal_savgol` — peak-preserving smoothing of live spindle-load / override-% streams before threshold/alarm logic (moving average masks transient load spikes alarms must catch)
- `ml_dtw` — elastic alignment of live run's load signature vs golden cycle for drift + anomaly detection
- `ml_viterbi` / `ml_beam_search` — decode machine-state / alarm-precursor sequences from live event stream
- `ml_gmm` / `ml_knn` — cluster operating regimes for nearest-neighbour adaptive-feedback baselines

#### 8. Domain invariants (WHAT NOT TO DO)

- **NEVER route/page mutations directly** — ALL job lifecycle, traveler, labor, and approval changes MUST flow through `ShopStateEngine`. Direct state mutations bypass the WebSocket event bus and create silent staleness.
- **NEVER publish a cost rollup before job completion** — `ShopFloorCostEngine` has a guard; bypassing it produces misleading actuals vs. quoted.
- **NEVER stream alarm data without vendor severity mapping** — raw alarm codes without `alarm-categorization.ts` lookup are unactionable and may silently suppress P0 alarms.
- **NEVER override machine-live status from an untrusted source** — all status updates must pass through the `machineLiveDispatcher` validation layer.
- **NEVER bypass `JobTravelerEngine` validation** — direct traveler state writes skip quality-gate hooks (compliance-safety cross-galaxy edge).
- **NEVER inline per-machine axis limits** — pull from `jm-die-profile.ts` (21 machines × axis limits × rates); hardcoding causes silent 25.4× unit errors on metric/inch mismatch.
- **NEVER reference `TravelerEngine`** — that class does not exist; the real engine is `JobTravelerEngine`.
- **Do NOT build prediction / pre-execution logic here** — that is per-domain galaxy territory (mill/lathe/wedm). Shop-floor owns the LIVE telemetry surface only.

#### 9. Operator-facing surface specifics

- **Language:** JM Die shop-floor operators are Polish/Spanish-primary (memory: `project_jm_die_shop_floor_languages.md`). Any operator-facing output from `EmployeeShopFloorMobileEngine` or `ShopFloorCheckInEngine` must not assume English-only.
- **Skills:** `/shop-live-status`, `/shop-floor-query`, `/traveler` (all verified in wiki skills index).
- **Wiki:** `knowledge/wiki/shop-floor/` (6 entries), `knowledge/wiki/architecture/engines/shop/` (per-engine entries).

#### 10. Cross-galaxy integration contracts

| This galaxy produces | Consumer galaxy | Mechanism |
|---|---|---|
| Live spindle/override telemetry | mill, lathe, wedm | `machineLiveDispatcher` → per-domain adaptive engines |
| Alarm events (severity-mapped) | compliance-safety | live alarm propagation |
| Per-cut Cpk measurements | quality | `prism_data` + `ShopStateEngine` events |
| Job cost vs actual | business/ERP | `EmployeePerMachineSFAdaptiveEngine` rollup |
| Operator notes | tribal-knowledge | `ShopFloorNoteIngestionEngine` → knowledge/tribal/ |
| Outcome data | ai-training | `ShopOutcomeIngestProcessorEngine` → LoRA + GNN ref pool |

#### 11. Free-source corpus (verified pointer)

VERIFIED foundations (WebFetch-confirmed 2026-06-09): `knowledge/wiki/shop-floor/shop-floor-foundations.md`
- OEE = Availability × Performance × Quality (Six Big Losses framework)
- MTConnect — read-only telemetry protocol (vocabulary-standard, 2008); never mutate machine state via MTConnect
- Andon as Jidoka element; 5S/6S pillars
- ISO 22400-1/22400-2 KPI framework (pointers, numeric counts owner-verified only)

Staging (UNVERIFIED numeric/control specifics — owner-gate before engine use): `knowledge/wiki/shop-floor/_staging/deep-domain-research-2026-06-09.md`

---

### IDEAL SECTION OUTLINE

```
# shop-floor galaxy — CLAUDE.md

## 1. Domain scope + exclusions          ← keep §1 verbatim
## 2. The invariant rule                 ← ShopStateEngine is the ONLY state mutator
## 3. Alarm data — verified paths        ← alarm-categorization.ts + controller-alarm-database.json (NOT alarm-registry.ts)
## 4. Engine registry (16 primary)       ← curated table from ADD §1
## 5. Dispatcher surface (daily use)     ← table from ADD §2 + action examples
## 6. DB intake                         ← AlarmDB / MachineDB / ReportTemplateDB + query commands
## 7. Schemas                           ← shopDomain.ts + liveEventContracts.ts
## 8. JM Die ground truth              ← SETUPS / QUEUE / CONTROLLERS paths + 21-machine fleet note
## 9. Operator-facing rules             ← Polish/Spanish-primary, skills list
## 10. Algorithm primitives             ← signal_savgol / ml_dtw / ml_viterbi / ml_gmm (ADD §7)
## 11. Cross-galaxy integration         ← table from ADD §10
## 12. WHAT NOT TO DO                   ← ADD §8 verbatim (7 hard rules)
## 13. Free-source corpus               ← verified pointer only (ADD §11)
## 14. Ollama offload specifics         ← keep from cross-cutting: gpt-oss:20b for alarm triage/MTConnect
## 15. AI stack pointer                 ← galaxy-reasoning-bridge one-liner + LoRA/CAG/RAG pointer
## 16. Universal-core pointer           ← single sentence (see below)
```

---

### UNIVERSAL-CORE POINTER

The following rules are NOT duplicated here — they live in the universal core and are loaded via the Bibryam Context Cascade:

> **Universal core:** `H:/PRISM/CLAUDE.md` — R1–R15 Karpathy + agent-era rules, 3-of-3 SCRUTINY GATE, per-chat HANDOFF protocol (`per-agent-handoff.mjs`), commit format `[SCOPE]/U-ID: title`, UNITS-FIRST (inch vs mm), no-stub enforcement, `comprehensive-build-enforce` hook, `duplicationGuardEngine.mustCheckBeforeCreating()`, `ENGINE_DIGEST.md` pre-check, token economy (RTK prefix, Ollama fallback ladder), physics constants in `src/physics/constants.ts` only, fleet slot discipline.

The galaxy CLAUDE.md adds only: domain scope, engine registry, dispatcher surface, alarm data paths, JM Die ground truth, operator-facing rules, cross-galaxy contracts, and domain-specific WHAT NOT TO DO. It does NOT duplicate R1–R15, scrutiny gate, handoff format, or build discipline.
