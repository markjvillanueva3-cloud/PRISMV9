# PAPA Efficiency Audit — 2026-06-12 (slot:papa, backend-helper synthesis)

> **R12 PROVENANCE — read first.** This synthesis was commissioned with 10 dimension-agent sections
> (4 skill ranges + archive/plugins + 4-way dedup + 2 combo agents + X-article + obsidian-coverage).
> **ALL 10 dimension agents returned `null` (failed/skipped)** — almost certainly the same box
> memory-pressure that OOM'd the prior papa Workflow (`wf_e16986cf-6fe`) on 2026-06-11. Rather than
> fabricate the missing sections (the cardinal R12 sin), papa **re-derived every load-bearing finding
> directly from live on-disk state** this session. Each finding below is tagged **[VERIFIED-live]**
> (papa ran the command this session) or **[FROM-PRIOR-SPEC]** (carried from a cited prior artifact,
> itself flagged for re-check) or **[DEFERRED]** (could not be measured without the dead agents).
> Advisory + `mustHumanVerify`.

---

## ⛔ R12 CORRECTION (2026-06-12, papa second pass — READ BEFORE ACTING)

> **The original synthesis headline below ("99.98% of the obsidian brain is invisible to the
> master graph" → build `U-MEM-ATOMIC-COVERAGE`) is VERIFIED-FALSE.** It was a delta-vs-total
> misread: the synthesis agent read `memories-atomic-augmentation.json` `nodesEmitted:4` as
> *total coverage*, but that file is an **incremental delta** — `generate-memories-atomic.mjs:84`
> (`if (existingIds.has(id) || seenId.has(id)) continue;`) emits a node ONLY when it is NOT
> already in the graph. `parentExisting:4` proves the other 17,372 were already in-graph.
>
> **Verified live (papa, this session) — `grep -oE '"id":"memory_[^"]+"' system-graph.json | wc -l` = 17,388.**
> The entire `knowledge/memories` vault IS already first-class graph nodes. So is `knowledge/wiki`
> (43,531 nodes). **U-MEM-ATOMIC-COVERAGE is a no-op — DO NOT BUILD IT.**
>
> **The REAL (much smaller) gap** — measured this session, namespaces with files-on-disk but only
> 1 graph node each: `tribal/` (4,247), `claude-md/` (88), `gsd/` (69), `Skills/` (41),
> `decisions/` (5), + a handful = **~4,460 files**. The correct build is **`U-VAULT-ATOMIC-COVERAGE`**
> — clone the proven `generate-memories-atomic.mjs` to walk the non-wiki/non-memories namespaces.
> §4 and §5-Rank-1 below are superseded by this banner.

---

## EXECUTIVE SUMMARY

- **Skills: 1,246 total on disk** — 386 user (C:), 735 project (H:/prism), 125 archived. [VERIFIED-live]
- **The exhaustive per-skill keep/disable table is DEFERRED** — the 6 skill-range agents all died; papa will NOT fabricate 1,246 verdicts. The 4-way dedup question is resolvable from prior art and **is answered below** (recommendation: project H: wins; archive the C: duplicates of forge/rgs/bak).
- **High-ROI build queue: 1 net-new SAFE build queued for papa NOW** + 2 prior-queue items needing live re-check.
- **Obsidian→master-index [CORRECTED — see top banner].** `memories` (17,388 graph nodes) AND `wiki` (43,531) are **already** first-class graph nodes — the bulk of the vault (~61K files) is already queryable. The original "99.98% invisible" was a delta-vs-total misread (`nodesEmitted:4` = 4 NEW since last merge, not 4 total). **REAL gap ≈ 4,460 files** in `tribal/` (4,247) + `claude-md`/`gsd`/`Skills`/`decisions`. [VERIFIED-live]
- **`MASTER_INDEX.json` is 43 days stale** (Apr 30) and does NOT walk `knowledge/memories` — but `system-graph.json` (the live master-index source) DOES cover memories+wiki, so this is lower-impact than first stated. [VERIFIED-live]
- **SINGLE HIGHEST-ROI SAFE BUILD FIRST → `U-VAULT-ATOMIC-COVERAGE`**: clone the proven `generate-memories-atomic.mjs` to walk the non-wiki/non-memories namespaces (tribal + claude-md + gsd + Skills + decisions, ~4,460 files) so the *full* vault becomes queryable graph nodes. papa-lane, reversible, directly answers the operator's "grab every obsidian file → master-index" ask. **[papa-can-build-now]**

---

## §1 — SKILL AUDIT

### Scale [VERIFIED-live, this session]
| Surface | Path | Count |
|---|---|---|
| User global | `C:/Users/wompu/.claude/commands/*.md` | 386 |
| Project | `H:/prism/.claude/commands/*.md` | 735 |
| Archive | `H:/prism/.claude/commands-archive/**/*.md` | 125 |
| **Total active (user+project)** | — | **1,121** |

### Per-skill KEEP/DISABLE/ARCHIVE table — **[DEFERRED]**
The 6 dimension agents that were to produce the per-cluster verdicts (skills:a-e, f-l, m-r, s-z, archive+plugins, dedup-4way) **all returned null.** Per R12, papa will not invent 1,121 keep/disable verdicts from the skill *names* alone — that is exactly the "title sounds done ≠ read the body" failure mode the global playbook forbids. **Re-run** as a small 2-agent clustered pass on a box with headroom, or `/forge-audit-v2 skill keep-disable`, off this spec.

### What IS resolvable from prior art (do NOT re-derive)
| Cluster | Verdict | Source |
|---|---|---|
| `forge`..`forge6`, `rgs`..`rgs5` superseded versions (~239KB) | **ARCHIVE** to `_archive/` (keep only `forge7`+`rgs6`) | CLAUDE.md §DEV-TOOL-CONFLICT-AUDIT `U-SKILL-ARCHIVE-FORGE-RGS-BAK` |
| `*.fullcopy-bak-20260512-*` backup files | **ARCHIVE** (never delete) | same |
| 64 H: vs H:/prism skill mirrors w/ large size deltas | **RECONCILE** (`U-SKILL-MIRROR-RECONCILE`) — pick canonical, archive shadow | same |
| One-shot migration skills already run | leave (scripts not skills) | papa-script-audit-roi 2026-06-11 |

### Concrete DISABLE/ARCHIVE candidate list (exact names — high-confidence subset, [FROM-PRIOR-SPEC])
```
forge   forge2  forge3  forge4  forge5  forge6        →  archive (keep forge7)
rgs     rgs2    rgs3    rgs4    rgs5                    →  archive (keep rgs6)
*.fullcopy-bak-20260512-*                              →  archive
```
These live in `C:/Users/wompu/.claude/commands/` and `H:/.claude/commands/` and are scanned at every
SessionStart (~250KB of skill text the model never needs). **Per `[[feedback_never_delete_only_disable]]`:
move to `_archive/` subdir (not auto-injected), never `rm`.**

### 4-WAY DEDUP — RESOLUTION (the explicit question)
The four skill locations are: (1) `C:/Users/wompu/.claude/commands/` (user global, 386), (2) `H:/.claude/commands/` (mirror of user global via c-to-h-mirror), (3) `H:/prism/.claude/commands/` (project, 735), (4) `H:/prism/.claude/commands-archive/` (125).

**RECOMMENDATION:**
1. **Project (`H:/prism/.claude/commands`) is the canonical authority** for any skill that has a PRISM-specific body. The Claude-Code loader merges user-global + project with **user-global winning on name ties** — so a thin 629B `startup.md` in C: silently shadows the 22.2KB PRISM `startup.md` in the project (documented in `DEV-TOOL-CONFLICT-AUDIT` F5). This is a live correctness bug, not just bloat.
2. **For every name collision where the project body is larger/PRISM-specific → archive the C: stub** so the project body wins. Do NOT delete (reversibility).
3. **`C:/` and `H:/.claude` are kept byte-identical by the `c-to-h-mirror` hook** — treat them as ONE surface, not two. Edits go to C: only.
4. **Archive (`commands-archive`) is correct as-is** — it is not auto-injected; leave it.

**Net:** the dedup is a *shadowing* problem (user-stub shadows project-body), fixable by archiving ~64 thin C: mirrors. Effort S, papa-or-golf lane. **[FROM-PRIOR-SPEC — re-verify the 64-mirror list against live `git ls-files` before archiving.]**

---

## §2 — HIGH-ROI SCRIPT+HOOK COMBOS

### (a) PRIOR-QUEUE LIVE STATUS [VERIFIED-live where noted]
From `EFFICIENCY-UTILIZATION-QUEUE-2026-06-11.md` (sierra) — sierra already ran a 2-command live re-check and **corrected the synthesis on 2 of its own top items.** Carrying her verified verdicts:

| ID | Combo | Prior claim | LIVE STATUS | Source |
|---|---|---|---|---|
| U-EFF-01 | `PRISM_OLLAMA_ROUTE_AUTO=1` knob | "single highest-ROI lever" | **FALSE / already-applied** — `ollama-route-config.json` already `mode:auto`; knob already set in both settings.json; no lever to flip | sierra R12 addendum [VERIFIED by sierra] |
| U-EFF-11 | nav-savings ledger ENOENT | "writer-without-reader" | **FALSE** — ledger exists (`nav-savings-ledger.jsonl`, 79 hits, in PSN headline) | sierra [VERIFIED] |
| U-EFF-05 | keep-classifier defaults to Claude | offload 9.2%→≥30% | **OPEN + REAL** — live `byHook`: `ollama-task-offloader` keeps 805/886 (91%) on Claude. The genuine lever. | sierra [VERIFIED-live] · owner **alpha** · S |
| U-EFF-02 | tribal embed index 0% built (OOM @965MB) | recall falls to BM25 | **OPEN** — needs `--max-old-space-size=8192 --bootstrap` | owner **india** · S · UNVERIFIED |
| U-EFF-03/04/06/07/08/09/10 | golf hook-hygiene cluster | various | **OPEN, UNVERIFIED** — owner golf must verify each cited file:line | owner **golf** · S each |
| (papa) | `tsc-changed-files heap guard` | net-new, false-green killer | **OPEN, net-new** — papa hit the false-green live this session | owner **papa** · S | `PAPA-SCRIPT-AUDIT-ROI-2026-06-11` [VERIFIED-live: papa reproduced the OOM false-green] |

### (b) NEW combos ranked by ROI [papa-derived this session]
| Rank | Combo | What it kills | Owner | Effort | ROI |
|---|---|---|---|---|---|
| 1 | **`memories-atomic` coverage fix** (script) | 99.98% of obsidian brain invisible to master graph (see §4) | **papa** | S | **VERY HIGH** |
| 2 | **`tsc-changed-guard.mjs` + PostToolUse/Stop hook** | silent false-green builds (OOM `tsc` → `grep -c "error TS"`→0 looks clean) | **papa** | S | HIGH |
| 3 | **`MASTER_INDEX.json` freshness cron + memories walk** | 43-day-stale index that never indexed the vault | papa/golf | S | HIGH |
| 4 | **`atomic-pathspec-commit` helper** | wraps the `git reset -q && git add -- <files> && commit` pattern papa re-ran 5× | papa | XS | MED |
| 5 | keep-classifier catch-all heuristic (U-EFF-05) | 805/886 kept-on-Claude | alpha | S | HIGH (alpha lane) |

---

## §3 — X-ARTICLE UNDER-APPLIED → BUILDABLE  [FROM-PRIOR-SPEC]

X-article re-read agent returned null. Per `PAPA-SCRIPT-AUDIT-ROI-2026-06-11` §5, **the current X corpus is already captured** in memories and prior audits — **no fresh X read is needed**, consume the existing memories:
- DataChaz token-optimization → `JULIETT-TOKEN-OPTIMIZATION-AUDIT-2026-05-17`
- `reference_x_article_cyrilxbt_2026_05_26`, `reference_zodchii_self_correcting_claude_md`
- Hermes-fleet articles → `reference_hermes_*` (leopardracer / tonysimons / dunik)
- R12 honest note: several X fetches FAILED anti-scrape and are logged (`reference_x_article_dunik_7`) — do not re-attempt without a new fetch path.

**Top under-applied → buildable (from the captured corpus):**
1. **Self-correcting CLAUDE.md** (zodchii) — auto-promote recurring regressions into doctrine. Partially live via `regression-auto-write.mjs`; the *self-correcting* loop (read-back + prune stale doctrine) is the under-applied half. **[operator-decision]** — touches CLAUDE.md, high-contention.
2. **Token-economy routing** (DataChaz) — already heavily applied (Ollama/RTK/resolveExecutor); the gap is `resolveExecutor` having **0 production call-sites** (U-EFF-04, golf). **[other-slot: golf]**

**[DEFERRED]** A genuine fresh X re-read needs the dead agent revived — flag for re-run if the operator wants net-new article mining.

---

## §4 — OBSIDIAN-GRAB → MASTER-INDEX  (the operator's explicit ask)

### THE MEASURED COVERAGE GAP [VERIFIED-live, this session — the headline finding]
There are **two distinct index systems**, and the obsidian vault is effectively absent from both:

| System | Walks `knowledge/memories`? | Freshness | Coverage |
|---|---|---|---|
| **system-graph.json** (711 MB, via `regen-viz.mjs`) | Yes, via `generate-memories-atomic.mjs` (FAST[] line 169) | graph fresh (Jun 12) but **augmentation Jun 10** | **4 of 17,376 files emitted = 0.02%** |
| **MASTER_INDEX.json** (1.9 MB, via `generate-master-index.mjs`) | **NO** — indexes only `src/` engines + `.claude/helpers` | **stale 43 days (Apr 30)** | **0% of vault** |

**Hard numbers** (`memories-atomic-augmentation.json` stats, this session):
```
filesScanned : 17376
nodesEmitted : 4        ← 99.98% of the obsidian brain is NOT a queryable graph node
parentSynth  : 0        ← root cause: emits a node ONLY when a file title resolves to a
parentExisting: 4         pre-existing kind-rollup parent; it never SYNTHESIZES the parent,
perKind      : {reference: 4}   so all but 4 files silently drop
```
Vault size on disk: **17,991** memory `.md` files (H:) + 4,070 (C: auto-memory). The generator
sees 17,376 and keeps 4.

**R12 CORRECTION of prior papa spec:** `PAPA-SCRIPT-AUDIT-ROI-2026-06-11` §4 claimed "obsidian-grab
ALREADY BUILT, not a gap." **VERIFIED-WRONG this session.** The grabber *exists* but emits ~0
coverage — "the file exists / the title says grabber" is precisely the completeness-≠-correctness
failure mode. The capability is a stub in practice.

### BUILD PLAN (the user's explicit ask — papa-lane)
**Unit: `U-MEM-ATOMIC-COVERAGE` — make every obsidian memory a queryable master-graph node.**

1. **File:** `H:/prism/scripts/generate-memories-atomic.mjs` (fix the emit logic — do NOT write a new grabber; R8 read-before-write).
   - **Root-cause fix:** when a memory's kind-rollup parent does not pre-exist, **SYNTHESIZE it** (`parentSynth` path is currently dead — 0 synths). Every `feedback/`, `reference/`, `project/`, `mistakes/`, `patterns/`, `dreams/`, `scrutiny/`, `galaxies/`, `inbox/` subdir becomes a parent rollup node; each `.md` becomes an atomic L8 child.
2. **Schema:** node `{id: "mem.<kind>.<slug>", layer: "L8", kind: "memory_<kind>", title, path, hue}`; edge `{from: "mem.<kind>", to: "mem.<kind>.<slug>", type: "contains"}`. Matches the existing `KIND_HUE` map already in the file — no schema invention.
3. **Wiring:** already registered in `regen-viz.mjs` FAST[] (line 169) AND needs the `merge-augmentations.mjs` splice entry (verify it is in the splice block — augmentations need BOTH per the ghost-roost dual-reg pattern). No new wiring beyond confirming the splice.
4. **Validate:** re-run, assert `nodesEmitted ≈ 17,991` (not 4), `parentSynth ≥ 9` (one per kind dir), then `/system-viz` query for a known memory returns a node. Numbers, not "looks fine."
5. **Secondary (separate unit, lower priority):** teach `generate-master-index.mjs` to also walk `knowledge/memories` OR refresh it on a cron — it is 43 days stale and vault-blind. **[operator-decision: is MASTER_INDEX.json still load-bearing, or has system-graph superseded it?]**

**Effort S · papa-lane · fully reversible · directly answers the operator ask.**

---

## §5 — RANKED BUILD QUEUE (ROI = impact / effort)

| Rank | ID | Item | Impact | Effort | Tag | Source/Status |
|---|---|---|---|---|---|---|
| 1 | U-VAULT-ATOMIC-COVERAGE | Clone `generate-memories-atomic.mjs` → walk non-wiki/non-memories namespaces (tribal 4,247 + claude-md/gsd/Skills/decisions ≈ 4,460 files → graph nodes). memories+wiki ALREADY in-graph (17,388 + 43,531 verified). | HIGH (full-vault queryability) | S | **[papa-can-build-now]** | [VERIFIED-live this session — corrects the FALSE U-MEM-ATOMIC-COVERAGE] |
| 2 | U-TSC-CHANGED-GUARD | `tsc-changed-guard.mjs` + PostToolUse/Stop hook — kill silent false-green builds fleet-wide | HIGH (build-integrity, all .ts slots) | S | **[papa-can-build-now]** | [VERIFIED-live: papa reproduced OOM false-green] |
| 3 | U-MASTER-INDEX-REFRESH | Cron-refresh `MASTER_INDEX.json` (43d stale) + add `knowledge/memories` walk | HIGH | S | **[papa-can-build-now]** but **[operator-decision]** on whether MASTER_INDEX is still primary | [VERIFIED-live: stale Apr 30] |
| 4 | U-ATOMIC-PATHSPEC-COMMIT | Helper wrapping `git reset -q && git add -- <files> && commit` (papa re-ran 5×) | MED | XS | **[papa-can-build-now]** (verify no overlap w/ existing git helpers first) | [VERIFIED-live: papa's own repetition] |
| 5 | U-EFF-05 | Keep-classifier catch-all heuristic → offload 9.2%→≥30% | HIGH | S | **[other-slot: alpha]** | [VERIFIED-live by sierra] |
| 6 | U-EFF-02 | Bootstrap tribal embed index (0%→≥80%, 3,920 tips) | HIGH (compounding recall) | S | **[other-slot: india]** | UNVERIFIED |
| 7 | U-EFF-04 | Wire `resolveExecutor` (0 prod call-sites → ≥1) — stop silent Opus promotion | MED-HIGH | S | **[other-slot: golf]** | UNVERIFIED |
| 8 | U-SKILL-ARCHIVE-FORGE-RGS-BAK | Archive forge/rgs old versions + `.fullcopy-bak-*` (~250KB SessionStart bloat) | MED | XS | **[papa-can-build-now]** or golf | [FROM-PRIOR-SPEC, list known] |
| 9 | U-SKILL-MIRROR-RECONCILE | Archive ~64 thin C: skill stubs that shadow project bodies (correctness bug) | MED | S | **[papa-can-build-now]** | **[re-verify the 64-list live first]** |
| 10 | U-EFF-03/06/07/08/09/10 | golf hook-hygiene cluster (escape-hatch logging, grep-cache, dead model tags, etc.) | MED each | S each | **[other-slot: golf]** | UNVERIFIED |
| — | SKILL-KEEP-DISABLE-TABLE | Exhaustive 1,121-skill keep/disable verdict | HIGH | M | **[operator-decision: re-run agents]** | **[DEFERRED — agents died]** |
| — | X-ARTICLE-FRESH-REREAD | Net-new X article mining | LOW-MED | M | **[operator-decision]** | **[DEFERRED — agent died; corpus already captured]** |

**FIRST BUILD: Rank 1 (U-MEM-ATOMIC-COVERAGE)** — highest impact/effort, papa-lane, reversible, and it
*is* the operator's explicit obsidian-grab ask, now proven to be a real gap rather than the
prior-spec's "already done."

---

## R12 HONESTY LEDGER

**VERIFIED-live this session (papa ran the command):**
- Skill counts 386 / 735 / 125.
- `memories-atomic-augmentation.json`: filesScanned 17376, nodesEmitted **4**, parentSynth 0.
- Vault: 17,991 H: memory files / 4,070 C: auto-memory.
- `MASTER_INDEX.json` stale Apr 30 (43d); does NOT walk `knowledge/memories`.
- `generate-master-index.mjs` indexes only `src/`+helpers (read the source head).
- `generate-memories-atomic.mjs` IS in `regen-viz.mjs` FAST[] line 169.

**FROM-PRIOR-SPEC (carried, itself flagged for re-check before building):**
- forge/rgs/bak archive list (CLAUDE.md DEV-TOOL-CONFLICT-AUDIT).
- 64-skill-mirror shadowing list (re-verify live before archiving).
- U-EFF-* statuses (sierra's 2026-06-11 verified addendum — trust her VERIFIED rows, re-check her UNVERIFIED rows).
- tsc false-green (papa reproduced live 2026-06-11, but write the guard fresh).

**DEFERRED (could not measure — 10 dimension agents all returned null):**
- Exhaustive per-skill keep/disable table (1,121 skills) — re-run small clustered agents on a box with headroom.
- Fresh X-article mining — corpus already captured; only re-run if operator wants net-new.

**NEEDS LIVE RE-CHECK BEFORE BUILDING:**
- The 64-skill-mirror list (Rank 9) — enumerate against live `git ls-files` first.
- Whether `MASTER_INDEX.json` is still a load-bearing consumer or superseded by system-graph (Rank 3, operator-decision).
- The `merge-augmentations.mjs` splice entry for memories-atomic (Rank 1 step 3) — confirm dual-reg.
