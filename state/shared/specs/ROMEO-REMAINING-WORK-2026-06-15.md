# ROMEO — Canonical Remaining-Work Punch List
**Generated for:** romeo (wiring galaxy slot) · **Date:** 2026-06-15
**advisoryOnly:** true · **mustHumanVerify:** true

> Synthesized from the slot/romeo git history (40 commits), the open task list (#22/#23/#27),
> the TOOL-DB-CONSOLIDATION inventory commits (`19fd0146f4`..`000afafd61`), the JM-DIE gaps
> spec (`JM-DIE-GAPS-UPDATE-2026-05-24.md`), and the PRISM-BRIDGE-MAP candidate set.
> The synthesis input set of "verified-open" items was empty, so every item below was
> rediscovered directly from repo evidence and is cited. **Verify each against current
> slot/romeo + MAIN state before executing — several DBCON items were already partially
> reframed-to-no-op by the inventory work (see THEME A notes).**

ROMEO's charter is the **wiring galaxy**: engine→dispatcher wiring closure. Its recent
campaigns extended into JM-Die tool-data consolidation and the JM-Die shop app, so the
remaining work clusters into five themes. Ranked theme-first by ROI (high-leverage
wiring/integration first; data-foundation and app-polish later).

---

## THEME A — TOOL-DB-CONSOLIDATION (highest ROI: corpus is read system-wide)

The richest seam of explicit remaining work. The inventory campaign (`U-DBCON-INVENTORY-1..4`)
**stopped at the plan** per the comprehensive-build check-in rule (system-wide loader change +
canonical-index edit, host memory-pressured, Ollama down → couldn't verify the full corpus-load
delta locally). The plan was then **reframed by the architecture finding** (`000afafd61`): the
unified corpus already loads ~70K `.ts` + 67K extracted via two paths in `ToolCatalogEngine`, so
the original "route .ts-only vendors" leg (U-DBCON-2) is **largely a no-op**. Real remaining gaps
are small + precise (G1–G4).

### ROMEO-REM-01 (was U-DBCON-1) — record-aware loader fix + branch decision
- **What's left:** Apply the RECORD-AWARE merge fix to `CatalogCorpusLoaderEngine.readVendorFile`
  (a naive `Object.values().filter(isArray).flat()` loads `widia-2022`'s `speed_feed_data` array
  as FAKE tools — pollutes the corpus). Exact correct form + back-compat fallback recorded in the
  inventory commit body. **Branch decision pending operator confirm:** the loader is fleet-wide
  infra and `CatalogCorpusLoaderEngine.ts` is ~3207 commits stale on slot/romeo — the fix belongs
  on **MAIN via [MAIN-FORCE]**, not the stale slot copy. JM tool DATA stays on slot/romeo.
- **Evidence:** `9930e7828e` (record-aware merge + branch decision), `a5a158130b` (root-cause:
  readVendorFile takes only FIRST nested array).
- **Effort:** M · **Executor:** manual (system-wide loader + canonical-index edit + branch routing
  needs operator go + a cleared host to verify the corpus-load delta) · **Deps:** operator branch confirm.

### ROMEO-REM-02 (G1) — dedup correctness / split-brain id audit
- **What's left:** Verify id compatibility between the `.ts` getter corpus and the extracted
  CATALOG_INDEX corpus before trusting the unified total. `toolCatalogEngine.addTools()` dedups
  by id; if the two sources mint ids differently the dedup silently under/over-merges. Measure the
  exact unified total via `toolCatalogEngine.stats()` (NOT measurable in the inventory session —
  corpus load timed out on the stressed host).
- **Evidence:** `000afafd61` ("G1 dedup correctness — split-brain id compatibility ... verify
  before trusting the total"; "Exact unified total = toolCatalogEngine.stats() — not measurable
  this session").
- **Effort:** M · **Executor:** harnessed-loop (a `--once` stats-measure harness on a cleared host) · **Deps:** ROMEO-REM-01.

### ROMEO-REM-03 (G2) — route the 8 enriched-monolith files (genuinely orphaned)
- **What's left:** The 8 `catalog-extractions-enriched` monolith files (~232 rich `raw_tools`) are
  loaded by **neither** path (not a `.ts` getter, not in CATALOG_INDEX). Route them into the
  unified corpus via `toolCatalogEngine.addTools()` with the dedup key
  `vendor|designation|diameter|type`.
- **Evidence:** `000afafd61` ("G2 the 8 enriched monolith (~232, loaded by neither path —
  genuinely orphaned)"); `19fd0146f4` ("8 catalog-extractions-enriched monolith files (~232 rich
  raw_tools) NOT routed").
- **Effort:** S · **Executor:** hermes-agent · **Deps:** ROMEO-REM-01 (loader fix lands first so the merge is record-aware).

### ROMEO-REM-04 (G3) — getter-coverage audit
- **What's left:** Audit which `*-tool-catalog.ts` getters are actually invoked by
  `ToolCatalogEngine._loadStandardTools()` vs. which exist on disk but are never called. The
  inventory flagged divergence (`emuge .ts=13717` vs `extracted=8`; `osg extracted=11550` vs
  `.ts=0`) — confirm no large vendor is silently dropped from the load path.
- **Evidence:** `000afafd61` ("G3 getter-coverage audit"); `19fd0146f4` (the per-vendor divergence table).
- **Effort:** S · **Executor:** hermes-agent · **Deps:** none (read-only audit; can run before the loader fix).

### ROMEO-REM-05 (G4) — 35.9K PDF/zip extraction gap (juliett domain)
- **What's left:** `vendor-catalog-manifest.json` declares the system's own gap:
  `currentTools=54080, targetTools=90000, gapToTarget=35920` (un-extracted PDF/zip shards).
  **Out of ROMEO's lane** — extraction is the juliett (database-expansion) domain. Track + hand off.
- **Evidence:** `19fd0146f4` ("vendor-catalog-manifest.json declares ... gapToTarget=35920");
  `000afafd61` ("G4 the 35.9K PDF extraction gap (juliett)").
- **Effort:** L · **Executor:** manual (cross-slot handoff to juliett) · **Deps:** none.

---

## THEME B — JM-FUSION-TOOLS CAM library finishing (operator-priority data delivery)

The Option A upgrade (`486954fe70`) **already shipped** per-(material grade × toolpath) atomicity
for hyperMILL (`.hmt.sql`) + Mastercam (`.mcam-tools`) at full Fusion parity (218 tools / 4706
presets each, single-source `jm-tool-condition-matrix.ts`). That **supersedes the cutting-data half
of pending tasks #22/#23.** What remains is the holder-3D piece and the X8-format exporter.

### ROMEO-REM-06 (task #27) — Mastercam X8 .tooldb exporter
- **What's left:** Mastercam X8 cannot natively import `.mcam-tools` (a 2017+ format). Build an X8
  `.tooldb` exporter so the JM crib loads on the shop's actual X8 seat. The `cam-libraries/` output
  dir currently holds only `.hmt.sql` + `.mcam-tools` — no `.tooldb`.
- **Evidence:** open task #27 ("Mastercam X8 .tooldb exporter — X8 can't natively import
  .mcam-tools (2017+ format)"); `ls cam-libraries/` → no `.tooldb` present.
- **Effort:** M · **Executor:** hermes-agent · **Deps:** none (Option A `.mcam-tools` is the source surface).

### ROMEO-REM-07 (tail of #22/#23) — populate holder 3D profile (TlAssembly / .hmt holder geometry)
- **What's left:** The Option A surface upgrade left holder/geometry logic unchanged from Option B.
  Populate the Mastercam `TlAssembly` holder-3D block and the hyperMILL `.hmt` holder 3D profile
  (if the `.hmt` schema supports it) so collision/clearance is real, not stubbed. Use the 1,164
  holders already accounted for (task #19 `getAllHolders` + HOLDERS.csv).
- **Evidence:** open tasks #22 ("+ holder 3D profile if .hmt supports") + #23 ("populate
  TlAssembly holder 3D"); `486954fe70` ("Geometry/holder/units-first logic unchanged from Option B").
- **Effort:** M · **Executor:** hermes-agent · **Deps:** ROMEO-REM-06 (share the exporter plumbing) — optional.

---

## THEME C — WIRING closure (ROMEO's core charter)

The wire-and-bridge campaign closed 8 named engines (ERPImport, Subprogram, MeasureSummary,
BarRemnant, Turret, 3× SwissType, CounterfactualMill) + HolderSelection + SpreadsheetIngestion +
ArchardAdhesiveWear + HyperCADSElectrode. Open task #2 ("triage remaining 62 dormant engines") is
marked completed, but the dormant population is a moving target regenerated by the
UNWIRED-ENGINE-AUDIT — so the standing closure loop remains.

### ROMEO-REM-08 — standing dormant-engine wiring loop (next batch from UNWIRED-ENGINE-AUDIT)
- **What's left:** Re-run the authoritative UNWIRED-ENGINE-AUDIT (regenerated 2026-06-11, cited in
  `89f7dcba3b`), take the next batch of MAIN-verified dormant engines, and wire each to its natural
  dispatcher with a round-trip test (the proven ROMEO pattern: cache var + lazy getEngine + N
  ACTIONS entries + switch guards + Zod schemas + N-case dispatcher round-trip with physics
  reference values). Verify HolderSelectionEngine wiring actually landed on a dispatcher (the
  slot/romeo grep returned no dispatcher ref this session — likely on MAIN, but confirm).
- **Evidence:** `89f7dcba3b` ("MAIN-verified dormant via the authoritative UNWIRED-ENGINE-AUDIT
  regenerated 2026-06-11"); the 8 `[WIRING]/U-WIRE-*` commits as the template; task #2 completed
  but audit is regenerated; HolderSelection dispatcher grep miss on slot/romeo.
- **Effort:** L (recurring) · **Executor:** harnessed-loop (`/loop` over audit batches) · **Deps:** none.

---

## THEME D — PRISM-BRIDGE-MAP cross-domain/cross-level bridge closure

The generic-bridge engine series (iter24→tribal, iter25→erp+ai, iter26→cad+cam+crossLevelStitch)
closed ~30 of the top PRISM-BRIDGE-GRAPH candidates and introduced the cross-LEVEL shape. The graph
holds more candidates than were closed, and `crossLevelStitch()` emits *suggestions* that a
downstream consumer must verify against the live `system-graph.json` before wiring.

### ROMEO-REM-09 — wire the verified cross-LEVEL bridge candidates
- **What's left:** `crossLevelStitch()` produces synthetic (fromLayer, toLayer) suggestions but does
  NOT wire them (no graph access from inside the engine). Run the downstream
  `bridge-graph-builder.mjs` consumer against the live 520MB `system-graph.json`, verify each
  suggested cross-level bridge exists, and wire the survivors (top: learning L6↔L8 leverage 2254).
- **Evidence:** `ad688933d4` ("crossLevelStitch() ... Downstream consumers verify against the live
  system-graph.json before wiring. Closes the API gap for cross-level bridge candidates").
- **Effort:** M · **Executor:** harnessed-loop (graph-verify then wire, batched) · **Deps:** none.

### ROMEO-REM-10 — close the remaining cross-DOMAIN bridge candidates
- **What's left:** iter24–26 closed ~30 candidates; the PRISM-BRIDGE-GRAPH ranked set is longer.
  Continue down the leverage-ranked list with the same generic-bridge-engine pattern (best-effort
  lazy-import composition, `note` field surfaces missing imports — never silently masks).
- **Evidence:** `ad688933d4` ("Closes 9 more cross-DOMAIN candidates"), `8fbf8306a2` ("closes 11
  more"), `682302ce06` ("closes 10 of top-30") — a draining-but-not-empty ranked queue.
- **Effort:** M (recurring) · **Executor:** hermes-agent (one bridge engine per candidate cluster) · **Deps:** none.

---

## THEME E — JM-DIE-SHOP-PAGE app gaps (operator-value, lower wiring-ROI)

The shop page shipped 15 tabs / 5 native dispatcher-backed panels through iter17. The
`JM-DIE-GAPS-UPDATE-2026-05-24.md` spec enumerates 22 gaps ranked P0→P3. The P0s (quote wiring,
customer-attribution depth, post fuzzy-match) were closed in iter18 (`7928e0305f`). The high-value
remainder is consolidated below — see the spec for the full P2/P3 long tail.

### ROMEO-REM-11 (gap #4) — VBA Excel reverse-ingestion of the operator's quoting system
- **What's left:** Parse `Automated Program_Corrected 5-25.xlsm` cells + `.cls` VBA module text →
  emit a YAML rule book + classified macros. This is the operator's *existing* quoting/program-gen
  system — PRISM should learn from it (ground-truth, compound dividend on every subsequent quote)
  before competing with it. Also fixes gap #16 (walker mis-files `.xlsm` as `tooling`; needs a
  `vba_automation` stratum + engine schema bump).
- **Evidence:** `JM-DIE-GAPS-UPDATE` P1 #4 + P3 #16; recommended-order iter19.
- **Effort:** L · **Executor:** hermes-agent · **Deps:** none.

### ROMEO-REM-12 (gaps #5/#7) — macro library tab + queue board tab
- **What's left:** Two small daily-use tabs. (#5) "Macros" tab browsing `MACRO PROGRAMS/` 4 `.min`
  files (BASE WAFER INSERT, CASING, COUNTERBORE, TOP HAT) with usage-count + feature tags. (#7)
  "Queue" board over the `QUEUE/` WIP folder with status/priority/owner.
- **Evidence:** `JM-DIE-GAPS-UPDATE` P1 #5 + #7; recommended-order iter20 ("two small tabs, low cost, daily-use surface").
- **Effort:** M · **Executor:** hermes-agent · **Deps:** none.

### ROMEO-REM-13 (gap #9) — federated-learning Phase 2 trainer
- **What's left:** iter17 shipped the hook surface (`onCustomerOnboarded`, `onJobOutcomeRecorded`)
  explicitly tagged not-implemented. Phase 2 = the trainer that aggregates
  `CustomerProfile.contributionSignals` across customers, anonymizes, and feeds the pattern store.
  Touches PSN leg #10 (NN/GNN).
- **Evidence:** `JM-DIE-GAPS-UPDATE` P2 #9; recommended-order iter21.
- **Effort:** L · **Executor:** harnessed-loop · **Deps:** ROMEO-REM-11 (VBA ground-truth strengthens the pattern store) — soft.

### ROMEO-REM-14 (gaps #17/#20/#21/#22) — write-side + freshness + ERP sync
- **What's left:** Every shipped action is read-only. Bundle the operator-authoring layer:
  (#20) write actions with an audit ledger (re-categorize file, override post-machine mapping,
  favorite a job, append customer note); (#21) quote-PDF export button (after the Quote panel wires);
  (#17) a Stop-hook / daily cron to re-walk the corpus + diff-report (manifest goes stale on new
  files today); (#22) wire `ERPCostFeedbackEngine` to pull JM-Die actuals so the iter16 price
  tracker auto-populates from ERP.
- **Evidence:** `JM-DIE-GAPS-UPDATE` P3 #17 + future-gaps #20/#21/#22; recommended-order iter22.
- **Effort:** L · **Executor:** hermes-agent (split: write-actions agent + cron + ERP-wire agent) · **Deps:** none.

---

## One-shot launch plan

Mapping every item to a concrete launch mechanism. **Run THEME A first** (corpus is read
system-wide → highest blast-radius ROI), but note ROMEO-REM-01 is operator-gated (branch + host).

### Wave 1 — read-only audits (no deps, parallel, safe to one-shot now)
| Item | Mechanism | Command sketch |
|------|-----------|----------------|
| ROMEO-REM-04 (G3 getter-coverage) | **hermes-agent** | agent: audit `ToolCatalogEngine._loadStandardTools()` invoked-getters vs on-disk `*-tool-catalog.ts` |
| ROMEO-REM-09 (cross-level verify+wire) | **harnessed-loop** | `/loop` → `bridge-graph-builder.mjs` verify against system-graph.json, wire survivors in batches |
| ROMEO-REM-10 (cross-domain bridges) | **hermes-agent** | one generic-bridge engine per leverage-ranked candidate cluster |

### Wave 2 — operator-gated loader + dependent corpus work (serialize after operator go)
| Item | Mechanism | Notes |
|------|-----------|-------|
| ROMEO-REM-01 (loader fix + branch) | **manual** | operator confirms MAIN-vs-slot branch; needs a cleared host |
| ROMEO-REM-02 (G1 dedup/stats) | **harnessed-loop** | `--once` `toolCatalogEngine.stats()` measure on cleared host; deps REM-01 |
| ROMEO-REM-03 (G2 enriched monolith) | **hermes-agent** | route 8 files via `addTools()` dedup; deps REM-01 |

### Wave 3 — data deliverables + standing loops (parallel)
| Item | Mechanism | Notes |
|------|-----------|-------|
| ROMEO-REM-06 (X8 .tooldb exporter) | **hermes-agent** | source = Option A `.mcam-tools` |
| ROMEO-REM-07 (holder 3D / TlAssembly) | **hermes-agent** | uses 1,164 accounted holders |
| ROMEO-REM-08 (dormant wiring loop) | **harnessed-loop** | `/loop` over UNWIRED-ENGINE-AUDIT batches; ROMEO's core charter |
| ROMEO-REM-05 (35.9K PDF gap) | **manual** | cross-slot handoff to juliett (out of ROMEO lane) |

### Wave 4 — JM-Die app value (lower wiring-ROI, sequence per spec iter19→22)
| Item | Mechanism | Notes |
|------|-----------|-------|
| ROMEO-REM-11 (VBA reverse-ingestion) | **hermes-agent** | iter19; ground-truth for quoting |
| ROMEO-REM-12 (macro + queue tabs) | **hermes-agent** | iter20; two small tabs |
| ROMEO-REM-13 (fed-learning Phase 2) | **harnessed-loop** | iter21; deps REM-11 (soft) |
| ROMEO-REM-14 (write-side + cron + ERP) | **hermes-agent** | iter22; split into 3 sub-agents |

### Cron candidates
- **ROMEO-REM-14 freshness sub-item** (corpus re-walk + diff) → daily cron on `jm-die-corpus-compile.mjs`.
- **ROMEO-REM-08** (dormant wiring) → could be a weekly cron that re-runs the UNWIRED-ENGINE-AUDIT and posts the next batch to the slot queue.

---

## Verification caveats (R12)
- The synthesis input ("0 verified-open items") was empty; **all 14 items were rediscovered from
  repo evidence**, not handed in. Each carries a cited commit/spec/task — verify against live state.
- THEME A items REM-02/03/04 hinge on the architecture finding (`000afafd61`) that the corpus is
  already unified; if a later commit changed `ToolCatalogEngine`'s load paths, re-derive G1–G4.
- THEME B REM-06/07 assume Option A (`486954fe70`) is the current CAM surface and supersedes the
  Option-B cutting-data half of tasks #22/#23 — confirm no regression reverted Option A.
- HolderSelectionEngine dispatcher wiring returned no slot/romeo grep hit this session (likely lives
  on MAIN) — confirm before re-doing it under REM-08.
