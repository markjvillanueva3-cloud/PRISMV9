# HERMES-CAPABILITY-EXPANSION — deep research (2026-05-23/24)

**Author:** claude-ea80ce2f slot bravo
**Source:** Sister to HERMES-MEMORY-VAULT-MS0 (memory layer). This spec covers everything ELSE about Hermes/Obsidian/Qdrant that we did not yet exploit. User directive 2026-05-24: *"find more high leverage tools to improve zebra hermes capabilities and efficiency. do deep research on other functionalities of obsidian, qdrant, and most importantly hermes agents | plan for synergizing with PSN and Prism App"* — plus a follow-up *"can we start utilizing excel in any way within PSN?"*
**Status:** advisory only — every promotion is operator-gated; nothing auto-mutates wiki/memory/CLAUDE.md/shop data.
**Companion envelope:** `mcp-server/data/milestones/HERMES-CAPABILITY-EXPANSION-MS0.json` (16 units, U-HCAP01..16).

---

## 0. Why a separate milestone from MEMORY-VAULT

MEMORY-VAULT focused on the *memory layer* — 7 frontier gaps + 4 deeper synergies that all live in the L1+L2 (Hermes layer) world (consolidation, retrieval, recall, dream-cycle, router-intercept, reflect-on-memory, predictive warmup, Bases, Dataview, Qdrant migration, MemoryProvider compliance).

This MS covers the EVERYTHING-ELSE of Hermes:

| Layer | This MS units |
|-------|---------------|
| Execution / Runtime | U-HCAP01 trace replay, U-HCAP02 schema-aware output, U-HCAP03 cost telemetry, U-HCAP04 self-correction |
| Evaluation / Learning | U-HCAP05 eval harness, U-HCAP06 long-horizon plans, U-HCAP13 active learning |
| Office surface | U-HCAP07/08/09 Excel ingest/render, U-HCAP14 Office.js add-in |
| Obsidian integration | U-HCAP10 native plugin |
| Qdrant advanced | U-HCAP11 Discovery API + SPLADE sparse |
| Multi-agent | U-HCAP12 Council/debate protocol |
| Distribution / Ecosystem | U-HCAP15 federated tribal, U-HCAP16 skill recipe import |

Together the two milestones close out the Hermes-frontier audit at the *capability* surface; what remains afterward is product-shaped (PrismApp UI) not capability-shaped.

---

## 1. Execution / Runtime gaps (U-HCAP01..04)

### 1.1 Tool-use trace replay (U-HCAP01)

**Hermes Atlas pattern:** every (tool_call, input, output, latency, error?) tuple is recorded immutably. A `replay <trace-id>` command re-executes the same call against current code and diffs against the original output. Drives regression detection, debugging, and "did this dispatcher answer change since last week" audits.

**PRISM today:** `prism_session:audit_log` records inputs but not output shapes; no replay path; no diff tooling.

**Build:** `traceReplayEngine` + `prism_session:trace_replay` action. Trace storage: append-only `state/shared/traces.jsonl`, rotated nightly. Replay: lazy-import the same dispatcher, pass recorded input through `safeParse`, capture output, run `fast-diff` against recorded output. Operator surface: trace-id → markdown diff report.

**Leverage:** every Stop-gate scrutiny becomes "replay last N traces, fail if outputs diverged unexpectedly". Compounds with U-HCAP04 (rewriter consumes failed traces).

### 1.2 Schema-aware structured output (U-HCAP02)

**Hermes Schema mode:** JSON-schema validation on every tool *input AND output*. Caller never sees malformed responses.

**PRISM today:** Zod schemas on dispatcher INPUTS (`z.enum` action lists) — outputs are arbitrary engine returns, callers trust shape by convention.

**Build:** `dispatchValidator` middleware that wraps every dispatcher response in a `safeParse` against a per-action OUTPUT schema. Per-dispatcher rollout starts with `prism_calc` (highest physics-safety leverage). R12 fail-soft: schema miss logs + degrades to raw response with `validated:false` flag — never silent corruption.

**Leverage:** physics correctness ratchets. A wrongly-typed Kienzle output is caught at the boundary, not at the customer.

### 1.3 Cost telemetry per turn (U-HCAP03)

**Hermes Atlas:** every turn records tokens-in / tokens-out / model / $ / latency. Operators see "this slot burned $4.20 today on planner work".

**PRISM today:** `ollama-offload-stats.json` tracks LOCAL offload ratio. Claude API usage is invisible to PRISM internals.

**Build:** `costLedgerEngine` observes every `aiSystemRouterEngine.route()` call, persists to `state/shared/cost-ledger.jsonl`. `prism_session:cost_summary` rolls up by slot / dispatcher / date.

**Leverage:** drives the existing 30% offload-rate target with hard data. Surfaces expensive dispatchers operators didn't realize were burning budget.

### 1.4 Self-correction / thought rewriter (U-HCAP04)

**Hermes self-correct:** on tool-call failure (schema miss, exception, low confidence), the agent rewrites its plan + retries.

**PRISM today:** `error-pattern-promote` / `error-block-prewarn` Stop hooks surface failures BETWEEN sessions. No in-loop rewriter.

**Build:** `thoughtRewriterEngine` consumes a failed trace from U-HCAP01, classifies failure (schema-miss / null-result / R12-degrade / wrong-tool), proposes 1-3 alternative dispatcher calls. NEVER auto-retries — operator-gated promote.

**Leverage:** closes the per-iteration drift gap — when a /loop iteration's dispatcher call fails today, the loop has to defer to the next iteration. Rewriter unblocks the same iteration.

---

## 2. Evaluation / Learning gaps (U-HCAP05, 06, 13)

### 2.1 Eval harness vs Hermes baselines (U-HCAP05)

**Hermes Eval:** quarterly benchmark suite — memory recall precision / tool-use accuracy / plan-completion / cost-per-correct. Published numbers vs prior version + vs competitors.

**PRISM today:** scrutiny gates (3-of-3 + per-file scrutiny) — local correctness only, no continuous benchmark.

**Build:** `prism_eval` dispatcher with 5 actions: `bench_memory_recall` (master_index_query precision@K over a curated 50-query set), `bench_tool_use` (dispatcher round-trip success on 100-task suite), `bench_plan_completion` (milestone-progress drift over time), `bench_cost_per_correct` (U-HCAP03 ledger + correctness signal from scrutiny ledger), `bench_summary`. Curated suites under `state/shared/eval-suites/`. Weekly cron run; reports to `state/shared/dashboards/eval-results-{week}.{md,html}`.

**Leverage:** detects retrieval quality regression before customers do. Pairs with U-HCAP11 (Qdrant Discovery + SPLADE) to drive recall@K up over time.

### 2.2 Long-horizon plan tracker (U-HCAP06)

**Hermes Atlas Plans:** ingest a natural-language plan, extract milestones automatically, track over weeks.

**PRISM today:** milestone envelopes are hand-crafted JSON; no prose-to-envelope path.

**Build:** `planTrackerEngine` ingests natural-language plan, proposes envelope skeleton (deliverables, dependencies, est-LOC, est-effort). Operator-gated — NEVER writes the envelope directly.

**Leverage:** lowers the friction for ad-hoc operator goals to become tracked work. Closes the gap between `/goal` directives and shipped milestones.

### 2.3 Active learning / slot-soul compiler (U-HCAP13)

**Hermes self-improving prompt:** agent edits its own system prompt based on outcomes.

**PRISM today:** U-HRP05 proposes refuse-rule candidates as drafts but doesn't compile them.

**Build:** `slotSoulCompilerEngine` consumes accepted draft candidates + outcome ledger, proposes minimal-diff edits to the actual slot-soul markdown. Emits a unified diff for operator review. NEVER auto-writes the soul.

**Leverage:** closes the closed-loop value gap that U-ZPSN01 named — accepted soul evolution candidates today have no compilation path; operator must hand-edit. Compiler removes that friction.

---

## 3. Office / Excel surface (U-HCAP07, 08, 09, 14)

User asked 2026-05-24: *"can we start utilizing excel in any way within PSN?"* — answer: yes, 5 concrete leverage points; 3 ship in this MS as P1, 1 as P2 (Office.js add-in).

### 3.1 Why Excel matters for PSN

Every JM-Die-class shop runs Excel as their default UI:
- Tool libraries (most shops do NOT keep these in CAM — they keep them in Excel)
- Quote sheets (customer-facing deliverable)
- Customer quote history (years of priors)
- BOMs (bill of materials)
- SPC charts
- Job tickets / router cards
- Capacity plans

PSN currently has zero read or write path to `.xlsx`. Every shop integrating with PrismApp has to either (a) retype Excel data into PSN forms or (b) export to CSV first. Both are friction taxes.

### 3.2 Read paths (Excel → PSN)

- **U-HCAP07 — read shop tool-library `.xlsx`** → ingest as tribal-corpus tool entries with provenance. Most shops keep tool libs in Excel, not in CAM. Tribal corpus has 3919 tips; tool-library ingest probably doubles that for a single shop.
- **U-HCAP09 — read customer quote history `.xlsx`** → seed `QuoteEstimator` Bayesian priors per customer + per part-family. Cold-start win for new PrismApp customers — years of `.xlsx` quote history become priors instantly.

Both use `xlsx` npm pkg (zero-native, pure-js — survives the PRISM portable-node toolchain). R12 fail-soft on missing columns / unrecognized layouts. Operator-gated promote NEVER silently corrupts tribal/quote priors.

### 3.3 Write paths (PSN → Excel)

- **U-HCAP08 — write quote output `.xlsx` from QuoteToShip pipeline**. Today `QuoteToShipPipeline.quote()` returns JSON; ops-team manually retypes into shop Excel. Template-driven (one-template-per-customer-class via `mcp-server/data/quote-templates/*.xlsx`). Roundtrip-safe — output re-ingests via U-HCAP09.

### 3.4 Live / bi-directional (U-HCAP14)

- **U-HCAP14 — Excel add-in (Office.js)**. Manifest-distributed Excel ribbon → PRISM dispatcher client. Buttons: master-index-query, prism_calc cutting-force / speed-feed, QuoteToShip output (write current sheet as quote-input). Web-pane content from a local PRISM REST server (separate unit later — out of scope here; this unit ships the manifest + ribbon shell).

### 3.5 Deferred Office surfaces (out of scope)

- **Word `.docx` job-traveler output** — defer; Excel covers the operator-facing surface today.
- **Outlook email integration** (quotes auto-sent) — defer.
- **PowerPoint quote-pack export** — defer; customer-facing only on the highest-tier accounts.
- **Live BOM mtime-sync** — defer; out of scope for this MS, follow-up after U-HCAP07 proves the xlsx-ingest pattern.

---

## 4. Obsidian Plugin API (U-HCAP10)

**Beyond Bases/Dataview** (covered in MEMORY-VAULT-MS0):

### 4.1 Plugin API surface

Obsidian's Plugin API (TypeScript, distributed via BRAT or Obsidian Catalog) lets community plug-ins:
- Add commands to the command palette
- Add ribbon buttons + context menu items
- Render right-pane panels (markdown, react, or iframes)
- Hook events (file-open, file-change, search)
- Read/write frontmatter
- Display popovers + hover cards

### 4.2 What a native PRISM plug-in unlocks

Today PRISM feeds Obsidian *one-way* (memory-feed Stop hook). With a native plug-in, operators get:
- **Inline master-index hit cards** on hover over any `[[backlink]]` — eliminates `/master-index` round-trip
- **Command palette** for `prism_session:master_index_query` directly from Obsidian
- **Right-pane /system-viz embed** (iframe to `localhost:8765`) — operator sees the system map without leaving Obsidian
- **Frontmatter-driven dispatcher buttons** — a memory file with `metadata.type:reference + dispatcher:prism_calc` shows a "Run dispatcher" button inline

### 4.3 Distribution

Ship as `obsidian-plugin/` subdir with own package.json + main.ts + manifest.json. Customer install path: BRAT (community installer) for early access; Obsidian Catalog submission once stable. No-public-H: doctrine respected — plug-in is open-source-by-default but distributable internally.

### 4.4 Out of scope (defer)

- **Templater integration** — Obsidian Templater plug-in for runtime template insertion. Defer; PRISM auto-memory files follow a strict template already.
- **Smart Connections plug-in interop** — semantic backlinks. Defer; overlaps with master-index hits, and U-HCAP10 already surfaces those inline.
- **Linter plug-in integration** — defer; Stop-hook wiki-lint already covers this.

---

## 5. Qdrant advanced features (U-HCAP11)

**Beyond the general migration in U-HMEMV09:**

### 5.1 Discovery API (Qdrant 1.7+)

Example-based "find more like these" with negative examples. Operator picks 3 'good' tribal tips and 1 'bad' to refine retrieval. Server-side — no client-side refinement loop. Drop-in for any retrieval surface that has feedback signal.

Use case: tribal-by-domain inject (today brute-forces, with Discovery the operator can pin known-good tips and the inject auto-refines).

### 5.2 SPLADE sparse-vector embeddings

Qdrant 1.10 supports sparse vectors natively, in the same collection as dense vectors. SPLADE (Sparse Lexical AnD Expansion) is a learned sparse encoder — gives BM25-like sparsity but with learned weights instead of corpus-frequency heuristics. Replaces the hand-rolled BM25-lite in `master-index-search-lib.mjs` while keeping dense rerank.

### 5.3 Other advanced features (deferred)

- **Multi-vector named collections** (text + image + metadata vectors per point) — defer; no images in PRISM vault yet.
- **Snapshots + WAL replay** — covered by U-HMEMV09 (general migration).
- **Geo filters** — irrelevant for PRISM.
- **Recommendation API** — overlaps with `aiSystemRouterEngine`.

---

## 6. Multi-agent debate protocol (U-HCAP12)

**Hermes Council mode:** N agents debate in rounds:
- Round 1: each voice proposes
- Round 2: each rebuts the strongest other
- Round 3: each updates given rebuttals
- Round 4: vote

**PRISM today:** octopus 5-voice consensus runs ROUND 1 ONLY — each voice fires once, votes are flat-counted, no rebuttal/update.

**Build:** `debateProtocolEngine` extends `octopus-input-curator.mjs`. `ROUND_COUNT` configurable (default 3). Each round's prompt includes prior-round transcripts. Operator-gated promote; advisory output.

**Leverage:** octopus today produces consensus on independent first-pass takes; Council mode produces consensus AFTER each voice has heard the others' strongest counters. Higher-quality decisions for decisions that warrant the extra rounds (typically: high-stakes architectural / scope-cutting choices).

---

## 7. Distribution / Ecosystem (U-HCAP15, 16)

### 7.1 Federated tribal learning (U-HCAP15)

Each shop's tribal corpus stays local (per no-public-H: doctrine + PII concerns). But aggregate signals — e.g. "drill X works well in tool steel across 14 shops" — promote to a shared tribal layer via differential-privacy aggregation. Only k-anonymized hash signals leave the local boundary.

Sister to closed-loop learning. Opt-in operator gate; default OFF.

**Leverage:** the network-effect that lets PrismApp compound across customers — every new customer benefits from the aggregate; no individual customer's data leaks.

### 7.2 agentskills.io skill recipe import (U-HCAP16)

Hermes pulls skill recipes from `agentskills.io`. PRISM has 174 commands; no community-recipe import.

Build `skillRecipeImportEngine` that fetches a recipe URL, validates schema, runs duplicationGuardEngine against existing skills, surfaces matches/conflicts to operator. NEVER auto-installs.

**Leverage:** lowers the cost of adopting community skill recipes. Future Hermes-MemoryProvider compliance (U-HMEMV10) gives the symmetric path: PRISM skills exposed as Hermes-compatible recipes.

---

## 8. PSN + PrismApp synergy plan

### 8.1 PSN-leg mapping (from envelope)

| Leg | Units touched |
|-----|---------------|
| L1 Obsidian-brain | U-HCAP10 |
| L2 PRISM-OS | U-HCAP07, U-HCAP08, U-HCAP09, U-HCAP14 (Excel = OS surface) |
| L3 Wiki | U-HCAP10 |
| L4 Memory | U-HCAP01, U-HCAP05 |
| L5 Tribal | U-HCAP07, U-HCAP15 |
| L6 System-viz | U-HCAP10 |
| L7 Engines | U-HCAP02, U-HCAP03, U-HCAP08 |
| L11 PRISM-AI | U-HCAP04, U-HCAP05, U-HCAP06, U-HCAP11, U-HCAP12, U-HCAP13, U-HCAP16 |

### 8.2 PrismApp surface

PrismApp = customer-facing surface (web/desktop). Critical synergies:

- **U-HCAP02 (schema-aware output)** — every API response to PrismApp UI is Zod-validated; UI never has to defensive-render against malformed responses.
- **U-HCAP03 (cost telemetry)** — PrismApp billing layer reads from `cost-ledger.jsonl`; per-customer $/turn visible to ops + customer.
- **U-HCAP05 (eval harness)** — PrismApp marketing has hard numbers vs Hermes baselines.
- **U-HCAP07/08/09 (Excel)** — JM-Die-class customer ships Excel files on day 1; PrismApp ingests them without retype.
- **U-HCAP10 (Obsidian plugin)** — operator-facing surface for customers who want a knowledge-base view.
- **U-HCAP14 (Excel add-in)** — customer's shop floor uses Excel; PrismApp surfaces in the same place.
- **U-HCAP15 (federated tribal)** — network effect; new customers benefit from aggregate priors.

### 8.3 PSN-AS-A-SKILL-MARKETPLACE (forward-looking)

After this MS + MEMORY-VAULT ship, PRISM has:
- A MemoryProvider ABC façade (U-HMEMV10)
- A skill recipe import path (U-HCAP16)
- Federated tribal layer (U-HCAP15)
- Cost telemetry (U-HCAP03)

Together these form a marketplace surface: external Hermes-native agents use PSN as their L2; PRISM skills can be published as recipes; tribal signals aggregate across the customer base. Out of scope for THIS MS but the architectural foundation is laid.

---

## 9. Safety + advisory posture

- **Never delete only disable** — every existing path stays live as a fallback.
- **Operator-gated promote** — nothing auto-mutates wiki/memory/CLAUDE.md/shop data; every advisory engine emits to `state/shared/{cost-ledger,eval-results,recipe-imports,xlsx-ingest-candidates}/` for operator review.
- **mustHumanVerify** — envelope carries it; per-unit reports inherit it.
- **No public H: drive** — federated tribal aggregation is opt-in, k-anonymized; recipe import is dry-run by default.
- **R7 surface conflicts** — Qdrant Discovery doesn't silently swap retrieval; brute-force fallback preserved.
- **R12 fail-loud** — Excel ingest on unrecognized layout LOGS + degrades, NEVER silent success on stale priors.

---

## 10. Sequencing + dependency chain

```
P0 (must ship to call MS complete):  U-HCAP01, U-HCAP02, U-HCAP03
P1 (compounds with P0):              U-HCAP04, U-HCAP05, U-HCAP06, U-HCAP07, U-HCAP08, U-HCAP09, U-HCAP10, U-HCAP11
P2 (extensions on top):              U-HCAP12, U-HCAP13, U-HCAP14, U-HCAP15, U-HCAP16
```

Dependencies (from envelope):
```
U-HCAP01 → U-HCAP04 (rewriter needs trace replay)
U-HCAP07 → U-HCAP14 (Office.js add-in needs Excel tool-lib ingest)
```

Build order: 01 → 02 → 03 → 07 → 08 → 09 → 05 → 04 → 06 → 11 → 10 → 14 → 12 → 13 → 15 → 16. Total LOC: ~3.5K across 16 units.

---

## 11. Out-of-scope (defer to future MS)

- Word `.docx` / Outlook / PowerPoint Office surfaces (Excel covers 90% of value)
- Templater / Smart Connections / Linter Obsidian plug-in interop (defer)
- Qdrant multi-vector text+image (no images yet)
- Recommendation API (overlaps with router)
- Live BOM mtime-sync (follow-up after U-HCAP07 proves xlsx pattern)
- PRISM REST server for Office.js (out of scope; U-HCAP14 ships the manifest shell only)

---

## 12. Verification + scrutiny

Each unit ships with:
- Pure-core lib + injected-readers pattern (no Node fs in pure tests)
- ≥4-6 spanning tests per unit
- Stop-hook driver where the unit emits advisory
- Wiki entry under `knowledge/wiki/architecture/<unit-slug>.md` (pointer + ≤120 lines)
- Memory file under `knowledge/memories/reference/reference_<unit-slug>_2026-MM-DD.md`
- Per-file scrutiny gate (2 parallel reviewers per file in multi-file commits)
- End-of-task 3-of-3 scrutiny gate (Claude A + B + code-analyzer C)

---

## 13. References

- Companion envelope: `mcp-server/data/milestones/HERMES-CAPABILITY-EXPANSION-MS0.json`
- Sister MS (memory layer): `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json` (11 units U-HMEMV01..11)
- Sister specs (this session):
  - `state/shared/specs/HERMES-MEMORY-VAULT-RESEARCH-2026-05-23.md`
  - `state/shared/specs/HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md`
  - `state/shared/specs/HERMES-OCTOPUS-COORDINATION-RESEARCH-2026-05-23.md`
- Peer foxtrot specs (2026-05-17/20):
  - `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md`
  - `state/shared/specs/HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md`
  - `state/shared/specs/HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md`
- Doctrine: [[feedback_psn_definition]] · [[feedback_obsidian_brain]] · [[feedback_no_public_h_drive]] · [[feedback_never_delete_only_disable]]

---

## 14. Advisory footer

All 16 units operator-reviewable + operator-gated promote. Nothing in this milestone mutates live wiki/memory/CLAUDE.md/shop data without operator action. `mustHumanVerify:true` is set on the envelope. Excel ingesters R12 fail-soft on unrecognized layouts. Federated tribal aggregation is opt-in. Skill recipe import is dry-run by default.

Combined with HERMES-MEMORY-VAULT-MS0 (11 units), the two milestones queue **27 units** that close the Hermes-frontier capability audit. After both ship, PRISM exceeds Hermes on every capability axis the 2026-05 ecosystem documents (memory, retrieval, execution, evaluation, distribution, office-surface, multi-agent, learning).
