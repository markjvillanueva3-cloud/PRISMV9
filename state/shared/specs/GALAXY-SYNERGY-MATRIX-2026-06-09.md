# Galaxy Synergy Matrix — per-domain leverage of X-article patterns + built capabilities (2026-06-09, slot:papa)

> **Purpose (operator directive 2026-06-09):** "ensure each galaxy takes full advantage of everything we built, tailored to their domain — pull up all X articles fed over the past months." The prior pass (`U-PAPA-GAP-FILL`, commit `8a52eeb0f5`) got all 19 named-slot galaxies to 11/11 **structurally** (the 11-artifact rubric). THIS spec is the **quality/synergy** layer: for each galaxy, what it should *leverage* that it currently isn't, domain-tailored.
>
> Produced inline (slot:papa) after the `wmgqg45qv` ultracode Workflow wedged on Anthropic server-side rate-limiting (persistent this session — also killed the prior `wf_917b16d7` fan-out). The catalog below is grounded in the live CLAUDE.md doctrine + memory corpus; rows marked `(verify)` need a galaxy-owner confirm before applying.

---

## A. X-article corpus (patterns the operator fed — distilled from CLAUDE.md doctrine + `reference_x_article_*` memories)

| # | Author/handle | Core pattern | Encoded at | Fleet status |
|---|---|---|---|---|
| 1 | **Mnilax** | Agent-era CLAUDE.md RULES 5-13 (model-for-judgment, token-budgets-not-advisory, surface-conflicts-don't-average, read-before-write, test-intent-not-behavior, checkpoint-every-step, match-conventions, fail-loud, comprehensive-route) | root CLAUDE.md §RULES 5-13 | ✅ universal |
| 2 | **zodchii** | Self-correcting CLAUDE.md — learned-from-mistakes loop feeds `## Recent regressions` | root CLAUDE.md §Recent regressions; `reference_zodchii_self_correcting_claude_md` | ✅ universal (root) · ⚠ **per-galaxy: most galaxy CLAUDE.md lack a domain regression loop** |
| 3 | **Bibryam** | Context Cascade (per-galaxy CLAUDE.md auto-load) + large-codebase patterns (noise-paths, scoped skills, LSP) | DOMAIN-GALAXY-DOCTRINE; PRISM-NOISE-PATHS | ✅ cascade universal · ⚠ **per-galaxy: noise-path deny-rules only authored for a few big-corpus galaxies** |
| 4 | **Karpathy** | CLAUDE.md-as-agent-OS (6 workflow principles) + LLM-Wiki ("RAG is broken — build a knowledge system") + 5-step pre-coding | every galaxy MEMORY.md §Karpathy; §PRISM WIKI | ✅ universal |
| 5 | **akshay_pachaar** | CAG cold-cache anchoring (cache static doctrine once/session) | `cag-cold-cache-anchor.mjs` SessionStart | ✅ universal · ⚠ **per-galaxy cold-anchor candidates not registered** |
| 6 | **rody @0x_rody** | Honesty / anti-fabrication (verify symbol before claiming, "I don't know" is valid, cite file:line) | root CLAUDE.md §HONESTY RULES; `fact-checker` agent | ✅ universal |
| 7 | **dunik** | 4-Layer memory / **keep-the-file-lean** (MEMORY.md ≤200 lines pointer-only, archive overflow) | MEMORY.md §size discipline; `memory-size-watch.mjs` | ✅ root & galaxies **LEAN** (VERIFIED `wc -l`: 63-118 lines each; only **quoting=225** marginally over 200). ⚠ NOTE: audit `m1779` = keyword `memHits` (files matching "post"), **NOT** file size — no bloat. |
| 8 | **cyrilXBT** | Obsidian vault as second-brain — low-token operating protocol, write-to-vault | `reference_x_article_cyrilxbt_2026_05_26`; obsidian-as-second-brain wiki | ✅ universal (auto-feed) |

> `reference_x_article_dunik_7` = R12 fail-loud (could not fetch — X anti-scrape); pattern captured via the dunik 4-layer memory above.

## B. Built cross-cutting capabilities (what a galaxy CAN leverage)

| Capability | Leverage action | Already universal? |
|---|---|---|
| **PSN 11 legs** (Obsidian/OS/Wiki/Memories/Tribal/System-Viz/Engines/Algorithms/Formulas/NN-GNN/PRISM-AI) | each galaxy = the per-domain interface to all 11 | ✅ awareness universal |
| **octopus multi-model consensus** (`MultiModelConsensusEngine`) | route genuine domain disputes (multi-vendor strategy, conflicting tolerances) through consensus → `octopus-outcomes/<domain>.jsonl` | ❌ **only AI-galaxy wired (P1); Wave-3 corpus-tuning pending: wedm/speed-feed/cam/cad/post-proc** |
| **GNN tier-5 selective-deploy** (`xproc_kg_project_features`) | emit classifiable features so the wiring-inference GNN covers the galaxy's ghosts | ⚠ sentinel section present; **feature-emission coverage varies** |
| **RGS tool-planner** (`rgs-pipeline-rules.mjs`) | per-roadmap-unit toolchain; domain rules route units → right skill+reviewer | ⚠ all named galaxies HAVE rules (VERIFIED grep: 3-17 each); **THIN (3-7) for business/quoting/academy/system-viz** vs deep (12-17) mill/cad/lathe — gap is DEPTH not absence |
| **Ollama offload** (`/ollama-*`, `ask-ollama.mjs`) | route summarize/explain/lint/synthesis grunt-work off Claude | ⚠ available; **per-galaxy offload-rate low (4-11%)** |
| **cross-substrate edges** (`cross-substrate-edge-schema.mjs`) | typed owned-by-slot / documented-by edges → master brain | ⚠ owned-by-slot+documented-by materialized; **embeds/consensus-of pending** |
| **TOOLBELT.md** | surface the galaxy's highest-leverage skills/hooks/tool-patterns | ⚠ present but **uneven depth** |
| **galaxy synthesis** (`<galaxy>_synthesis.md`) | compounding distilled patterns | ✅ universal (all 34) |
| **node-card cheap read** (`system-viz-query node-card`) | ~200-tok node read vs 186K graph slurp | ⚠ available, **under-used in galaxy workflows** |

---

## C. Strategic framing (the brainstorm — 5 lenses)

1. **Already-universal vs genuine gap.** Patterns 1/4/6 + cascade + CAG + closed-loop-india + master-index + tribal-inject + auto-feed + synthesis are **fleet-wide already** — re-adding them per galaxy is bloat (violates dunik keep-lean). The real per-galaxy gaps are: **octopus corpus-tuning, RGS domain-rules, TOOLBELT depth, noise-paths (big-corpus only), zodchii domain-regression loop, post-processor MEMORY bloat.**
2. **Domain-fit, not blanket.** octopus → galaxies with multi-vendor/ambiguous disputes (cam/cad/post-proc/wedm/quoting). noise-paths → big-corpus galaxies only (cad 129K, mill, wedm, post-proc). GNN feature-emission → galaxies producing classifiable artifacts. A pattern useful to cad is noise for fleet-hygiene.
3. **Highest-ROI-first.** Top levers (VERIFIED): (a) **octopus Wave-3** (5 cutting/CAM galaxies, already-specced in PSN-octopus-fleet-synergy-ms0); (b) **surface already-existing couplings** (romeo↔GNN tier-5, xray↔VLM-ensemble) as additive `## Synergy` docs — zero new wiring; (c) **deepen thin RGS coverage** for business/quoting/academy/system-viz (rules exist but shallow). ⚠ RETRACTED: an earlier "post-processor MEMORY de-bloat" lever — verification showed it 118 lines (lean); the audit `m1779` was keyword-match count, not file size.
4. **Reversibility/safety.** Every synergy add is **additive** (a TOOLBELT line, a `## Synergy` section, a noise-path deny rule). **Never** weaken a scrutiny gate, financial invariant, or physics constant to "synergize."
5. **Sequencing under rate-limits.** Author this spec inline (reliable). Apply per-galaxy in **small batches (≤3 galaxies/pass) or hand to owning slots** — avoid 19-agent fan-outs (they throttle, as proven twice this session).

---

## D. Per-galaxy synergy matrix (top gaps, domain-tailored, concrete artifact change)

| Slot → galaxy | Top leverage gaps (NOT already universal) | Concrete artifact change |
|---|---|---|
| **alpha → token-optimization** | owns the patterns; gap = measure offload-rate per detector | TOOLBELT += `offload-stats.mjs` cadence; `## Synergy`: node-card cheap-read as default galaxy read |
| **bravo → hermes-zulu** | octopus consensus is bravo's to operate fleet-wide | `## Synergy`: octopus ledger → WeeklySynthesis rollup wiring status per galaxy |
| **charlie → quoting** | octopus for multi-vendor price disputes; RGS quoting domain-rule | TOOLBELT += octopus consensus for quote-vs-actual variance; RGS rule `quoting → /quote-to-ship + reviewer` |
| **delta → cad** | noise-paths (129K-file corpus); octopus for ambiguous feature-recognition | `## Synergy`: Bibryam noise-path deny-rules for JM-Die corpus; octopus on low-confidence feature ID (verify) |
| **echo → post-processor** | octopus for controller-dialect disputes (MEMORY.md VERIFIED lean at 118 lines — no de-bloat) | TOOLBELT += octopus on conflicting controller dialects (Wave-3) |
| **foxtrot → mill** | noise-paths (large corpus); already RGS-ruled | `## Synergy`: noise-path deny for mill corpus; confirm octopus on speed-feed disputes |
| **golf → fleet-hygiene** | minimal — patterns are noise here; keep lean | none (domain-fit: skip) |
| **hotel → business** | RGS business domain-rule; PII-safe octopus on financial reconciliation disputes | RGS rule `business → reviewer (financial-invariant)`; `## Synergy`: defer GL disputes to octopus w/ PII redaction |
| **india → ai-training** | owns GNN/octopus; gap = drive Wave-3 feature-emission across galaxies | `## Synergy`: track xproc_kg_project_features coverage per galaxy (selective-deploy τ=0.7) |
| **juliett → database-expansion** | cross-substrate `embeds`/`consensus-of` edge materialization | `## Synergy`: own the pending cross-substrate edge types → master brain |
| **kilo → cam** | octopus for cross-vendor strategy mapping; node-card reads | TOOLBELT += octopus on transfer-domain strategy disputes; `## Synergy`: node-card over graph-slurp |
| **lima → academy** | RGS academy domain-rule; Ollama offload for course distillation | RGS rule `academy → /pdf-learn + reviewer`; TOOLBELT += Ollama for lesson summarization |
| **mike → wedm** | octopus Wave-3 (discharge-param disputes); noise-paths | TOOLBELT += octopus on conflicting E-code/ACU families; noise-path deny for EDM corpus |
| **oscar → speed-feed** | octopus Wave-3 (vendor-parity disputes HSMAdvisor vs G-Wizard) | `## Synergy`: octopus consensus when HSMAdvisor/G-Wizard disagree >tol |
| **romeo → wiring** | GNN tier-5 IS the wiring-inference consumer — tightest coupling | `## Synergy`: route UNKNOWN ghosts through GNN selective-deploy (τ=0.7) before manual wiring |
| **sierra → system-viz** | RGS system-viz rule; owns the ghost-roost surface octopus/GNN feed | `## Synergy`: octopus-consensus + GNN ghost roosts already wired — document the consumer contract |
| **whiskey → lathe** | octopus on multi-controller dialect (Fanuc/Okuma/Mazak/Haas); noise-paths | TOOLBELT += octopus on dialect disputes; noise-path deny for lathe corpus |
| **xray → blueprint-vision** | octopus = the VLM-ENSEMBLE (already shipped!); RGS rule | `## Synergy`: document VLM-ensemble AS the octopus instance; RGS rule `blueprint → /blueprint-read` |
| **zulu → hermes-zulu** | (= bravo's galaxy) fleet octopus orchestration | see bravo |

---

## E. Bounded execution plan (rate-limit-aware)

**Batch 1 (highest-ROI, concrete, low-risk):**
1. romeo/wiring + xray/blueprint-vision: add `## Synergy` documenting the GNN-selective-deploy and VLM-ensemble couplings that *already exist* (zero new wiring, just surfacing). **← safest, do first.**
2. india: `## Synergy` tracking xproc feature-emission coverage across galaxies.
3. quoting: OPTIONAL — trim MEMORY.md 225→≤200 (only galaxy over the dunik target; marginal). [post-processor de-bloat RETRACTED — verified lean at 118 lines.]

**Batch 2 (octopus Wave-3 — already specced in PSN-octopus-fleet-synergy-ms0):** wedm/speed-feed/cam/cad/post-proc TOOLBELT octopus-consensus lines. Hand to owning slots (mike/oscar/kilo/delta/echo) — they know the dispute shapes.

**Batch 3 (RGS depth) — ⚠ RETRACTED (verified non-gap, papa 2026-06-09):** the 4 galaxies already have ADEQUATE, well-crafted RGS rules — business=`#21 /biz-health` (erp/quote-to-ship/invoice/payroll/gl/oee/spc/job-cost), quoting=`#17 /quote-to-ship`, academy=`#30 /learn-corpus`, system-viz=`#1 /audit-viz-first`. The earlier "3-7 rules" was a grep of the WORD in rich regex alternations + comments, NOT a rule count. Adding rules would be redundant + risk ordering-shadows / false-fires. **No-op.**

**Batch 4 (noise-paths) — ⚠ RETRACTED (verified low-value, papa 2026-06-09):** `PRISM-NOISE-PATHS-2026-05-26.md` ALREADY covers the big shared corpora fleet-wide (JM DIE 24,545 files, `extracted_modules/**`, `data/extracted_*/**`, `node_modules`, `dist`, `.git`) — exactly what the big-corpus galaxies hit. Per-galaxy additions are marginal, AND the whole catalog is explicitly advisory / operator-touch-pending (untested `permissions.deny` syntax). **Defer to the operator-touch shipment, not a per-galaxy edit.**

**DEFER:** per-galaxy CAG cold-anchor registration (low ROI); cross-substrate embeds/consensus-of edges (juliett-owned, separate milestone); any pattern marked `(verify)` until the galaxy owner confirms the dispute/coupling is real.

**Doctrine:** every change is ADDITIVE (R15 wire-don't-rebuild); apply in ≤3-galaxy batches (NOT 19-agent fan-outs — they throttle); coordinate with each owning slot; commit `[MAIN] [GALAXY-CONTEXT-FILL]/U-SYNERGY-<batch>`.

---
_slot:papa 2026-06-09 · supersedes nothing · companion to GALAXY-COMPLETENESS-AUDIT-2026-06-09 (structural) — this is the synergy/quality layer._
