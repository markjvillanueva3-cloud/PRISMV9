# PRISM SVI Deep Recount & Recalibration Report

**Generated:** 2026-06-22T17:18:27Z
**Scope:** `H:/PRISM/.claude/helpers/svi-refresh.mjs` — WIRED_PCT recalibration + missing-subsystem audit
**Run mode:** autonomous scheduled task (no operator present; reasonable choices noted inline)
**Supersedes:** prior 2026-05-02 recount

---

## TL;DR

1. **Entity counts are NOT stale** — the `count*()` functions read live from disk (`Math.max(liveCount, baseline)`), so engines/dispatchers/actions/tests already reflect current reality. What IS stale is the **explanatory comments** (they cite 1,266 engines / 79 dispatchers / 4,206 actions / 886 tests vs. live **3,651 / 107 / 10,307 / 4,696**).
2. **Two WIRED_PCT values are measurably wrong**: `engines` (88 → actual **95.5%**) and `dispatchers` (98 → actual **95.3%**). Both verified by import-graph analysis.
3. **Psi is structurally insensitive** to almost every correction. The `tools` subsystem alone is **93.5%** of total variability (95,608 × 10 dims = 956K of 1.02M). Every other subsystem combined is <7%. So fixing engine/dispatcher wired% moves entity-weighted Psi by **<0.1 pp**.
4. **4 genuinely-missing subsystems** found: web pages (159), registries (26), CAD engine (185 Python files), skills (751). Quality/business/learning "engines" are **already inside** the 3,651 TS-engine count — adding them would double-count.
5. **Material count bug**: `countMaterials()` returns **9** entities (6 ISO-group JSON files), but the canonical figure is ~2,957. Even corrected, materials would be ~0.2% of variability — cosmetic to Psi, but the count is wrong and should be sourced from `MaterialRegistry`, not `data/materials/`.

---

## 1. Current formula (as implemented)

```
variability(s)  = entities(s) × dimensions(s)
reachable(s)    = variability(s) × wired_pct(s) / 100
Psi (Ψ)         = Σ reachable(s) / Σ variability(s)        ← entity-weighted
SVI (log10)     = Σ log10(variability(s))  for variability > 0
```

`Psi` is an **entity-weighted** reachability mean. Because it weights by `entities × dims`, the largest subsystem dominates.

---

## 2. Engines — actual wired % (computed)

| Metric | Value | Method |
|--------|-------|--------|
| Engine files (`*Engine.ts` / `*Calculations.ts`, excl. test) | **3,651** | `ls src/engines` |
| Unique engines imported by any dispatcher | **3,488** | `grep engines/…Engine` across `src/tools/dispatchers/` ∩ real files |
| Engines referenced anywhere in `src/` | **3,650** (99.97%) | full-tree grep |
| **Wired % (dispatcher-reachable)** | **95.5%** | 3,488 / 3,651 |

➡ Hardcoded `engines: 88` is **understated by ~7.5 pp**. Recommend **95**.
(The remaining ~4.5% are sub-engines invoked by other wired engines — reachable transitively, not orphaned. 99.97% have at least one import edge.)

## 3. Dispatchers — actual wired %

| Metric | Value | Method |
|--------|-------|--------|
| Dispatcher files (`*Dispatcher.ts`, excl. test) | **107** | `ls src/tools/dispatchers` |
| Dispatchers imported by `src/index.ts` (MCP registration hub) | **102** | grep on `index.ts` (102 import edges) |
| Dispatchers referenced anywhere in `src/` | **105** | full-tree grep |
| **Wired % (registered in MCP server)** | **95.3%** | 102 / 107 |

➡ Note: `src/routes/` does **NOT** import dispatchers (0 matches). Dispatchers are wired through **`src/index.ts`**, not the Express routes — the task's step-3 assumption is inverted. Registration hub is `index.ts` with 102 dispatcher import edges. Hardcoded `dispatchers: 98` is **~3 pp high**. Recommend **95**.

## 4. Actions — wired %

| Metric | Value | Source |
|--------|-------|--------|
| Total actions (z.enum across dispatchers) | **10,307** | PRISM-INVENTORY-LATEST.md (live, 2026-06-22) |
| Reachability | every action lives inside one of the 102 registered dispatchers | structural |

➡ No per-action handler gap detectable from the import graph; all actions are inside wired dispatchers. `actions: 96` is defensible — **keep 96**. (Comment cites 4,206; live is 10,307 — update the comment.)

---

## 5. Variability dominance — the structural finding

| Subsystem | Variability | Share of total |
|-----------|------------:|---------------:|
| **tools** | 956,080 | **93.5%** |
| tests | 14,088 | 1.4% |
| machines | 12,740 | 1.2% |
| engines | 10,953 | 1.1% |
| actions | 10,307 | 1.0% |
| tribal_tips | 7,574 | 0.7% |
| *(all others)* | ~10,700 | ~1.0% |
| **Total** | **1,022,554** | 100% |

**Consequence:** `Ψ ≈ tools.wired_pct` to within a percent. The index is, mathematically, "tools reachability with a small correction." Correcting engines/dispatchers/actions, or adding new subsystems, is **rounding noise** under the current entity-weighted scheme.

---

## 6. Missing subsystems

**Genuinely new (not already counted):**

| Subsystem | Entities | Suggested dims | Wired % | Method / basis | Category |
|-----------|---------:|---------------:|--------:|----------------|----------|
| `web_pages` | **159** | 2 | **76** | `web/src/pages` files; 121/159 call backend (`fetch`/`/api/`/`prism_`) | output |
| `registries` | **26** | 3 | **96** | `src/registries/*.ts` (excl. index/test); all imported | data |
| `cad_engine` | **185** | 3 | **70** | `cad-engine/**/*.py` excl. venv/site-packages (raw incl. venv = 8,293) | pipeline |
| `skills` | **751** | 2 | **88** | `.claude/commands/*.md`; functional automation surface | intelligence |

**NOT to be added (double-count risk — already inside `engines`=3,651):**

- Quality engines (SPC/FAI/Metrology/Cert): **48** `*Engine.ts` — subset of engines.
- Business engines wired to `businessDispatcher`: **211** unique `*Engine` refs — subset of engines.
- Learning engines (Onboarding/Apprentice/Playbook/Tribal): **126** `*Engine.ts` — subset of engines.

➡ If a "quality / business / learning" view is wanted, expose them as **engine sub-tags**, not as new SVI subsystems, or Psi will count the same files twice.

**Count bug found:** `countMaterials()` sums `data/materials/*.json` = **9** entities (6 ISO-group files). Canonical materials ≈ 2,957 (lives in `MaterialRegistry.ts`, not `data/materials/`). Recommend re-sourcing the count from the registry. Impact on Psi is <0.2 pp regardless (materials dims=8).

---

## 7. Projected Psi (entity-weighted, current scheme)

| Scenario | Ψ | Δ vs current |
|----------|----:|----:|
| **Current** (as shipped) | **97.66%** | — |
| (a) Corrected wired % (engines 88→95, dispatchers 98→95) | 97.74% | +0.08 pp |
| (b) Corrected + 4 new subsystems | 97.70% | +0.04 pp |

All deltas are within noise — confirming the dominance problem in §5.

## 8. Projected wired-% under an *un-weighted* scheme (recommended alt-metric)

If Psi were the **simple mean of per-subsystem wired%** (each subsystem equal weight), the corrections actually register:

| Scenario | Ψ_unweighted |
|----------|----:|
| Current (14 subsystems) | 92.36% |
| Corrected wired % | 92.64% |
| Corrected + 4 new subsystems | 90.39% |

➡ **Recommendation:** publish BOTH — `Ψ_weighted` (current, scale-aware) and `Ψ_subsystem` (un-weighted mean, surfaces weak subsystems like CAD 70% and web 76% that the weighted metric hides). The un-weighted view drops to 90.4% once CAD + web are added — the honest signal that those surfaces are under-wired.

---

## 9. Recommendations for `svi-refresh.mjs`

1. **Update `WIRED_PCT`**: `engines: 88 → 95`, `dispatchers: 98 → 95`. Keep `actions: 96`. (Patch in `svi-refresh-patch.md`.)
2. **Refresh the stale comments** (1,266/79/4,206/886 → 3,651/107/10,307/4,696) so future readers trust the file.
3. **Add 4 subsystems** to `DIMS`, `WIRED_PCT`, `CATEGORY`, `DISPLAY_NAMES`, `SUBSYSTEM_ORDER`, and `gatherCounts()` with live counters: `web_pages`, `registries`, `cad_engine`, `skills`.
4. **Fix `countMaterials()`** to read the registry (or at least flag that 9 ≠ canonical 2,957).
5. **Add an un-weighted `psi_subsystem`** field to the report so under-wired surfaces stop hiding behind `tools`.
6. **Do NOT** add quality/business/learning as subsystems (double-counts `engines`).

---

## 10. Verification notes

- Engine/dispatcher import counts via `comm -12` of grepped import paths ∩ real basenames (exact-match, no fuzzy).
- Live totals cross-checked against `PRISM-INVENTORY-LATEST.md` (live scan 2026-06-22T16:21Z): engines 3,827 (all `.ts`) / dispatchers 111 / actions 10,307 / registries 27 / tests 4,963. SVI's pattern-restricted counts (`*Engine.ts|*Calculations.ts` = 3,651; `*Dispatcher.ts` = 107) are a strict subset — both internally consistent.
- CAD raw find = 8,293 `.py` incl. virtualenv; real source = **185** after excluding `venv/site-packages/__pycache__/dist-info`.
- No source files were modified. This is an analysis-only run; the patch is a **proposal** in `svi-refresh-patch.md`.
