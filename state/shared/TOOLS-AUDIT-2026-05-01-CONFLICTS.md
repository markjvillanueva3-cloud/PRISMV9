---
title: Tools Audit — Conflict & Bug Analysis (companion to TOOLS-AUDIT-2026-05-01.md)
date: 2026-05-01
author: claude-8f04ae6a
scope: cross-recommendation conflict surface, ordering dependencies, adversarial cases, revised plan
status: analysis-only — supersedes the unordered Phase plan in the parent audit
---

# Tools Audit — Conflict & Bug Analysis

This document is the **adversarial review** of the 20 recommendations in `TOOLS-AUDIT-2026-05-01.md`. The parent audit answered *what to change*; this document answers *what breaks if you change them in the wrong order, in parallel, or without coordination*.

## 0. Methodology

- Took 20 recommendations from parent audit § 6
- Generated dependency edges (prerequisite, downstream blocker, file-shared, tool-shared)
- Cross-referenced live grep evidence for hidden references the audit assumed away
- Surfaced every failure mode where two recs touch the same surface
- Surfaced adversarial cases per CLAUDE.md Karpathy discipline: empty / null / overflow / concurrent / NaN / network / timeout / partial-write / stale-cache / permission

## 1. Verified-vs-claimed risk reassessment

The parent audit assigned risks; live grep evidence updates several:

| Rec | Audit said | Evidence found | Revised risk |
|---|---|---|---|
| #2 archive `_completed_utilities/` | None | Only referenced in `.sessions/` transcripts (read-only audit logs) and one stale plan in `.sessions/global/plans/`. **No live `package.json`, hook, or import refs.** | **None — confirmed safe** |
| #3 remove 11 disabled hooks | None | `magic-number-detector` and `discipline-expert-inject` are **cited by name** in `CLAUDE.md § HOOK INJECTION RESPONSES` and `knowledge/claude-md/project-hook-injection-responses-*.md` | **Low — but doc-update required in same commit** |
| #11 promote `PRISM-COMMANDS-MANIFEST.md` → MCP | Low | **Referenced by 24 files** including `CLAUDE.md`, `prompt-rules-inject.mjs`, `doc-cascade.mjs`, `doc-freshness-check.mjs`, `gsd_micro-6-laws-*.md` | **Medium — atomic multi-file update** |
| #6 chat-bus → MCP | Med (concurrency) | **5 hooks read/write the bus** — `chat-bus-inject`, `file-claim-guard`, `file-claim-commit-guard`, `pre-edit-lane-guard`, `cross-chat-directive-detector`. Plus Codex (separate harness). | **High — atomic multi-hook + Codex coupling** |
| #7 omega activation | Med | `omega-thresholds.json` cited in `CLAUDE.md`, `prompt-rules-inject.mjs`, `gsd_micro-6-laws-*.md`. Promotion changes thresholds from flat 0.70 → tiered (shop_floor 0.95). | **High — safety-relevant cascade** |

**Net**: 5 of 20 recommendations were under-risked in the parent audit.

---

## 2. Conflict Matrix — pairwise interactions

Conflicts are classified by failure type:
- **ORDER** = must do A before B (or vice versa) or downstream breaks
- **DUP** = A and B target same surface; doing both is wasted or contradictory
- **BREAK** = A's success creates a regression in B if not coordinated
- **HIDDEN-DEP** = A relies on something not listed in the audit
- **CONCURRENCY** = multi-chat / multi-process race
- **ROLLBACK** = A is hard to undo without rebuilding state
- **SCALE** = works at current N, breaks at 10N

### 2.1 Conflict catalog (24 surfaced)

| # | Recs involved | Type | Description | Severity |
|---|---|---|---|---|
| C1 | #3 (remove disabled hooks) × CLAUDE.md docs | BREAK | `magic-number-detector` and `discipline-expert-inject` are cited by name in `CLAUDE.md § HOOK INJECTION RESPONSES`. Removing files without updating docs leaves dangling references. | Medium |
| C2 | #3 (remove) × #4 (advisory→MCP) | ORDER | `discipline-expert-inject.mjs` is in DISABLED_TOKEN_REDUX **AND** is the explicit migration target for `prism_ai:discipline_check`. Remove the .mjs only AFTER MCP action ships. | High |
| C3 | #4 (advisory→MCP) × #9 (soften via keyword-gate) | DUP | Both target the same 18 advisory hooks. Doing both is contradictory: an MCP-converted hook no longer auto-fires, so softening is moot. **Pick one path per hook.** | Medium |
| C4 | #5 (`prism_ollama` dispatcher) × existing 5 Ollama engines | HIDDEN-DEP | `OllamaTaskOffloaderEngine` and `OllamaIntegrationEngine` overlap. Wiring `prism_ollama:offload` to the wrong one causes telemetry split (events recorded in two stat files). Run `duplicationGuardEngine.mustCheckBeforeCreating()` against existing engines first. | Medium |
| C5 | #6 (chat-bus → MCP) × 5 hooks reading bus directory | ORDER | `chat-bus-inject`, `file-claim-guard`, `file-claim-commit-guard`, `pre-edit-lane-guard`, `cross-chat-directive-detector` all `fs.readdir` the chat-bus tree. Migrating storage to MCP without updating hooks = silent capability loss (claims appear empty, peer detection fails). | **Critical** |
| C6 | #6 (chat-bus MCP) × Codex (separate harness) | HIDDEN-DEP | Chat-bus is shared with Codex; Codex doesn't have access to PRISM's MCP server. Pure-MCP migration breaks Codex's read/write to bus until Codex side ships an MCP client OR a file-fallback adapter is kept. | **Critical** |
| C7 | #6 (chat-bus MCP) × MCP server singleton model | CONCURRENCY | File-based bus is multi-process safe (with append atomicity caveats). MCP server is single-process: 6 chats × N writes/min serialize through one event loop. If `bus_post` does any sync work >50ms, the MCP server stalls all dispatchers. | High |
| C8 | #7 (omega activation) × shop-floor producers | BREAK | Current dispatcher: flat thresholds (release=0.70). Audit's tier model: shop_floor 0.95. Engines/tests producing S(x) ∈ [0.70, 0.94] currently PASS but will FAIL after activation — including some live engines per pre-existing diff in this branch. | **Critical** |
| C9 | #7 (omega) × `prompt-rules-inject.mjs` | BREAK | The hook embeds a copy of the threshold values (`Ω≥0.95, S(x)≥0.98`) inline in injected context. Migrating to JSON-source-of-truth requires the hook to read JSON or via MCP, not hard-code. | Low |
| C10 | #8 (consolidate 60 fragments → 5 bundles) × Qdrant embedding cache | BREAK | Fragments are individually chunked + embedded for hook-time semantic injection. Replacing 60 files with 5 bundles changes chunk boundaries — old embeddings index dangling files. Must run `chunk-claudemd-vault.mjs` AND clear Qdrant collection in same atomic operation. | Medium |
| C11 | #10 (HNSW wiki index) × Ollama-hard dependency | HIDDEN-DEP | HNSW build needs `prism_ollama:embed`. If Ollama is unreachable (4s timeout), index build fails AND query falls off a cliff (no grep fallback documented). Need explicit fallback path. | High |
| C12 | #11 (manifest → MCP) × 24 referencing files | ORDER | 24 files (CLAUDE.md, hooks, GSD docs) reference `PRISM-COMMANDS-MANIFEST.md` directly. Promotion must (a) ship MCP action, (b) update all 24 references, (c) keep the .md as a generated mirror until next sweep, OR (d) replace references with MCP-action calls. **Half-done state breaks doc-cascade hook.** | Medium |
| C13 | #11 (manifest → MCP) × #20 (`SCRIPTS_MANIFEST.json`) | DUP | Both create live manifest infrastructure for discoverability. Different scopes (commands vs scripts) but same pattern. Build a single `prism_session:manifest_get(kind)` action that handles both — avoids two parallel implementations. | Low |
| C14 | #14 (WikiLint PostToolUse) × existing 53 PostToolUse hooks | SCALE | Current PostToolUse hook latency is N×O(ms). Adding lint (frontmatter parse + HNSW conflict check + Ollama NLI) adds ~500ms. With 53 active hooks, total Edit/Write latency could exceed 5s — agents will start hitting hook-timeout limits. | High |
| C15 | #14 (WikiLint hook) × #10 (HNSW index) | ORDER | WikiLint conflict checks need HNSW index to find semantically-similar pages. Wiring lint as PostToolUse before HNSW exists → lint passes everything (no comparison set) → false PASS until HNSW lands. | Medium |
| C16 | #15 (inventory scripts → MCP) × hook callers | ORDER | `update-prism-inventory.mjs` is called from `inventory-refresh.mjs` SessionStart hook. Migrating to `prism_dev:inventory_refresh` requires updating the hook to call MCP — but if hook updated before MCP action ships, **first session of every chat reports empty inventory**. | Medium |
| C17 | #19 (consolidate dup hook registrations) × idempotence | HIDDEN-DEP | `error-pattern-memory.mjs` is registered 2x intentionally? Or accidentally? Audit didn't verify. If the second registration is for a different matcher (e.g. Edit on first, Bash on second), consolidating to one matcher loses the second event class. **Need to read settings.json wiring before flattening.** | Medium |
| C18 | #1 (delete 84 duplicate skills) × project-specific overrides | HIDDEN-DEP | Audit assumed "user dir is canonical". But: project-dir copies may have JM Die–specific overrides (milestone-aware, shop-tier-aware) that don't exist in user dir. Need diff-per-pair before bulk delete, not assumption. | Medium |
| C19 | #5 (`prism_ollama`) + #15 (`prism_dev`) + #6 (`prism_orchestrate` bus) | DUP | All three target prism_session naming-space-adjacent territory. Action enum collisions possible — `inventory_refresh`, `health_check`, `stats_get` are generic names that two different dispatchers might want. Reserve names in a manifest before parallel implementation. | Low |
| C20 | #6 + #18 (`codex_delegate`) | DUP | `bus_post` and `codex_delegate` may overlap: a Claude→Codex delegation is just a `bus_post(recipient='codex')`. Don't build both — `codex_delegate` is a thin wrapper / convention over `bus_post`, not a separate primitive. | Low |
| C21 | Phase-2 parallel execution × MCP server hot-reload | CONCURRENCY | If Phase-2 ships in 4 commits across 4 chats simultaneously (Ollama, chat-bus, omega, advisory), each ADDs ~5–10 actions. The MCP server may need cold restart between each commit; without coordination, action enum drift means a request hitting an in-flight reload returns "unknown action". | Medium |
| C22 | #4 (advisory→MCP) × `wiki-precheck-inject` (auto-fires UserPromptSubmit) | DUP | `wiki-precheck-inject` is itself an "advisory injector" but explicitly KEPT in audit because it's load-bearing. The boundary between "convert to on-demand MCP" and "keep auto-inject" is fuzzy — risk of converting one too many. **Define explicit criterion**: if a hook materially changed agent behavior in last 30 days of telemetry → KEEP; else → MCP. | Low |
| C23 | #1 + #2 + #3 cleanup commits × Stop hook (`stop-on-uncommitted-critical`) | BREAK | Three small cleanup commits (delete skills, archive scripts, remove hooks) on the SAME branch could trip `commit-ownership-guard` mid-sequence if another chat is editing adjacent files. Lane discipline: run cleanup in a fork worktree. | Low |
| C24 | #6 (bus MCP) rollback | ROLLBACK | Once bus state moves into MCP-managed storage and `.md`/`.json` files are deleted, **rollback requires rebuilding bus state from session transcripts** — not trivial. Need a forward-compatible adapter: MCP writes to BOTH file-store and in-memory; can flip back by deleting MCP store. | High |

### 2.2 Conflict density per recommendation

Recommendations with 3+ conflicts are highest-risk:

| Rec | Conflict count | Rec name |
|---:|---:|---|
| #6 | 5 (C5, C6, C7, C20, C24) | Migrate chat-bus → `prism_orchestrate:bus_*` |
| #7 | 2 (C8, C9) | Wire omega-thresholds.json → MCP |
| #11 | 2 (C12, C13) | Promote `PRISM-COMMANDS-MANIFEST.md` → MCP |
| #4 | 3 (C2, C3, C22) | Convert 18 advisory hooks → MCP |
| #14 | 2 (C14, C15) | Wire `WikiLintEngine` to PostToolUse |
| #3 | 2 (C1, C2) | Formally remove 11 disabled hooks |

**Pattern**: highest-conflict recs are the highest-leverage ones (#6, #7, #4). This is consistent with "the closer to the safety/coordination plane, the more interactions." Plan must put these in their own phase with deliberate coordination.

---

## 3. Bug surface — adversarial cases

For each high-risk recommendation, the variability axis: inputs × states × failure modes × adversarial.

### 3.1 `prism_ollama:offload(task, kind)` (rec #5)

| Axis | Cases | Bug if not handled |
|---|---|---|
| Inputs | empty `task`, oversize `task` (>32KB), `kind` not in enum, malformed UTF-8, RTL/control chars | Schema rejection → unhandled error in caller |
| States | Ollama unreachable, Ollama responding slow (>4s), Ollama returning malformed JSON, model not loaded | Hang, timeout cascade, garbage output silently passed through |
| Failure modes | Network partition mid-stream, Ollama OOM, partial response | Caller treats partial as success |
| Adversarial | NaN-ish output, infinite-recursion prompts, prompt-injection seeking to reach back into PRISM context | Code-inject through Ollama response |

**Required**: bounded timeout, schema-validated response, sanitized output, fallback signal `{success: false, reason: 'ollama_unreachable'}` instead of throw.

### 3.2 Chat-bus migration (rec #6)

| Axis | Cases | Bug if not handled |
|---|---|---|
| Inputs | duplicate post (same content, same ts), oversized message, non-existent recipient | Bus pollution; orphan messages |
| States | MCP server restart mid-post, file-fallback writing during MCP-write, two chats post within 1ms | Lost message; "split-brain" between MCP store + file fallback |
| Concurrency | 6 chats × 1 post/sec = 6 RPS; 24-chat scenario = 24 RPS — MCP must serialize | Tail latency spike → bus slow → all dispatcher calls back up |
| Codex coupling | Codex writes file-fallback while Claude writes MCP-only | Claude sees no Codex messages |
| Rollback | Delete MCP store; reconstruct bus state | Cannot reconstruct (no transcripts of MCP-only writes) |

**Required**: dual-write phase (MCP + file) until Codex side migrates · in-memory ring buffer + journal · `presence_reap` reaper as cron · explicit `bus_post(idempotency_key)` to suppress dupes · graceful degrade: if MCP unhealthy, agents see file-fallback.

### 3.3 Omega tier activation (rec #7)

| Axis | Cases | Bug if not handled |
|---|---|---|
| Inputs | tier=`shop_floor` but engine returns S(x)=0.85 (was passing) | Massive cascade of failures across pre-existing engines |
| States | Threshold JSON updated, dispatcher loaded old version (cached) | Inconsistent gate behavior across same session |
| Failure modes | JSON malformed → dispatcher uses fallback (?) → which one? | Silent fallback to permissive thresholds = safety regression |
| Adversarial | Test fixture with S(x)=0.999999 (near-max float), zero, negative | Boundary tests that don't currently exist |

**Required**: ship in **shadow mode** first (compute against new thresholds, log gap, do not block); only flip to enforce after 1 week of clean shadow telemetry · re-run full test suite under each tier before activation · pin canonical default to `proven_out` (0.85), not `shop_floor`, until evidence supports.

### 3.4 Advisory hooks → MCP (rec #4)

| Axis | Cases | Bug if not handled |
|---|---|---|
| Inputs | Agent forgets to call `prism_ai:discipline_check` (was always auto-fired) | Capability silently lost |
| States | MCP action exists but no agent calls it for 30 days | Capability is functionally dead |
| Failure modes | MCP action throws → caller doesn't handle → tool chain stops | Worse than the silent old advisory |
| Adversarial | Hook removal commit lands; MCP action commit doesn't | Capability gap window |

**Required**: each conversion ships in 2 phases: (a) MCP action + softened hook firing 1 in 10 events with deprecation note in injected context, (b) after 7 days telemetry shows MCP usage > 0, drop hook to 0%. **Never one-shot remove the hook.**

### 3.5 Wiki HNSW indexing (rec #10)

| Axis | Cases | Bug if not handled |
|---|---|---|
| Inputs | wiki entry with no body, non-ascii, mixed-language, code blocks dominating semantic vector | Embedding quality degrades silently |
| States | Index file corrupted, partial rebuild interrupted | Search returns garbage |
| Failure modes | Ollama embed model changed → all old vectors are now in different space | Search recall collapses |
| Adversarial | wiki-poisoning content injected via PR | Search amplifies adversarial pages |

**Required**: index version field tied to model name; on model change, full rebuild; rebuild is idempotent and resumable; query falls back to grep with explicit `degraded_mode: true` flag in response when index missing or stale.

---

## 4. Hidden coupling discoveries

Items the audit did not surface but matter for any execution plan:

1. **`magic-number-detector` and `discipline-expert-inject` are documented as KEEP-or-MCP in CLAUDE.md**, but disabled on disk. The doc-vs-disk mismatch is itself a signal that a previous "remove" pass left orphan documentation. **Pattern**: every removal commit must `grep -r '<hook-name>'` against `knowledge/` and `CLAUDE.md`.

2. **`omega-thresholds.json` content is duplicated inline** in `prompt-rules-inject.mjs` (string literal `Ω≥0.95, S(x)≥0.98`). Activation requires the hook to either (a) call MCP at injection time, or (b) read JSON, or (c) be regenerated from JSON via build step. Audit assumed (a) implicitly.

3. **`PRISM-COMMANDS-MANIFEST.md` is consumed by `doc-cascade.mjs` and `doc-freshness-check.mjs`** — both are PostToolUse hooks watching for stale docs. Promoting to MCP without updating these hooks means they flag the now-empty file as stale → noise.

4. **Bus storage path is hardcoded in 5 hooks**: each hook does `fs.readdir('state/shared/chat-bus/...')`. Replacing storage = atomic rewrite of 5 hook files in same commit.

5. **Skills duplication isn't necessarily redundant**: at least one project-dir skill (`/quality-check-lathe`) is documented as "user version is comprehensive (MS8 milestone)" — implying the project copy may be a snapshot frozen at an earlier milestone for reproducibility. Bulk delete loses milestone provenance.

---

## 5. Revised execution plan (ordered by dependency)

The parent audit's Phase 1–5 was leverage-ordered (do high-ROI first). The conflict matrix says you can't do that — some recs prerequisite others. Here is the **dependency-ordered** plan.

### Phase A — Pure cleanup (zero-conflict, trivial)
*Can run in parallel from a single fork worktree; no other recs depend on these.*

- A1: Archive 74 `_completed_utilities/` scripts to `H:/prism/.archive/scripts/` (audit rec #2; conflicts: none confirmed)
- A2: Audit 84 duplicate skills with `diff` per-pair — delete only those byte-identical to user copy; flag the rest for manual review (audit rec #1; revises C18 hidden-dep)
- A3: Move 2 archived `CLAUDE-CODEX-*-DIRECTIVE.md` to `state/shared/archive/` (audit rec #4 in §7-table; trivial)

**Acceptance**: `git status` shows ~150 deletions/moves, build passes, no test regressions.
**Effort**: 2 hours. **Risk**: None after A2 verification.

### Phase B — Foundation primitives (must precede MCP migrations)
*All Phase-C work depends on at least one of these. Ship as one atomic milestone.*

- B1: Create `prism_session:manifest_get(kind: 'commands' | 'scripts')` MCP action (replaces audit recs #11 + #20 — single primitive resolves C13)
- B2: Create `prism_session:routing_reserve(name)` action — reserves dispatcher action names to prevent C19 enum collisions during parallel work
- B3: Document the **2-phase conversion protocol** for advisory→MCP migrations (resolves C2, C22): (a) ship MCP action + softened hook firing 1 in 10, (b) after 7-day telemetry, drop hook to 0%
- B4: Decide policy on each of 18 advisory hooks: convert (#4) OR soften (#9), not both (resolves C3). Output: a per-hook decision in `state/shared/HOOK-MIGRATION-DECISIONS.md`

**Acceptance**: 2 new actions live, decision doc committed, no advisory hook touched yet.
**Effort**: 1 day. **Risk**: Low.

### Phase C — Highest-leverage MCP migrations (do in fork worktrees, NOT in parallel chats)
*Each item has multi-file coordination cost; do one at a time and run full test+build between.*

- C1: **`prism_ollama` dispatcher** (audit rec #5)
  - Run `duplicationGuardEngine.mustCheckBeforeCreating()` against `OllamaTaskOffloaderEngine`, `OllamaIntegrationEngine`, `OllamaClientEngine` (resolves C4)
  - Wire to single canonical engine; document deprecation of overlapping engines
  - 6 actions: `offload`, `stats_get`, `health_check`, `model_load`, `lora_deploy`, `embed`
  - Adversarial cases per §3.1
  - **Acceptance**: 9 `/ollama-*` skills become thin CLI wrappers calling MCP; telemetry queryable.

- C2: **Chat-bus dual-write** (audit rec #6, partial — phase 1 of 2)
  - 8 actions: `bus_post`, `bus_read`, `claims_register`, `claims_release`, `claims_read`, `presence_heartbeat`, `presence_list`, `presence_reap`
  - Implementation: MCP **writes both** to in-memory store AND existing chat-bus files (resolves C5, C6, C7, C24)
  - Update 5 reading hooks to prefer MCP, fall back to file (resolves C5)
  - Codex-side: continue writing files; Claude reads both (resolves C6)
  - **Acceptance**: 6 chats run for 24h with no message loss vs file-only baseline; `presence_reap` cron live.

- C3: **Omega shadow-mode** (audit rec #7, phase 1 of 2)
  - Wire `omega-thresholds.json` → `prism_omega:thresholds_get`
  - Refactor `omegaDispatcher.ts` to read JSON; **shadow mode**: compute against new tiered thresholds, log gap to telemetry, do NOT block (resolves C8)
  - Update `prompt-rules-inject.mjs` to read from MCP not inline (resolves C9)
  - **Acceptance**: 7 days of shadow telemetry with no shop-floor regression before flipping enforce mode.

- C4: **Convert 10 highest-fire advisory hooks** to MCP per Phase-B B3 protocol (audit rec #4)
  - Per-hook 2-phase migration; ship MCP action first, softened hook 1-in-10, then drop to 0%
  - Specifically converts `discipline-expert-inject` so rec #3 can later remove it (resolves C2)

### Phase D — Coordinated removals (only after Phase C settles)
*Removals that depend on Phase-C MCP equivalents being live + telemetry-validated.*

- D1: Formally remove 11 DISABLED_TOKEN_REDUX hooks AFTER:
  - their MCP equivalents (Phase C4) report >0 invocations in 30-day telemetry
  - same commit updates `CLAUDE.md` and `knowledge/claude-md/project-hook-injection-responses-*.md` to remove citations (resolves C1)
- D2: Remove 4 chat-bus reading hook fallback paths AFTER:
  - Codex side ships MCP client OR formally adopts file-only mode
  - Bus-MCP shadow has 30 days of zero-loss telemetry (resolves C6)
- D3: Flip omega tiers from shadow to enforce mode AFTER:
  - 7 days of shadow telemetry with 0 unexplained shop-floor block events (resolves C8)
  - Test suite passes under each tier explicitly

### Phase E — Documentation consolidation (parallelizable; low conflict)
*All five sub-tasks can ship from a single fork worktree.*

- E1: Consolidate 60 `knowledge/claude-md/*.md` → 5 thematic bundles (audit rec #8)
  - Atomic operation: rewrite 5 bundles + run `chunk-claudemd-vault.mjs` + clear+rebuild Qdrant collection (resolves C10)
  - Keep symlinks for 30 days for backward-compat
- E2: Unify 3 `CLAUDE-CODEX-*-DIRECTIVE.md` → 1 (audit rec #12)
- E3: Add `ENFORCEMENT_GATES.md` single source of truth (audit rec #17)
- E4: Cross-reference cleanup pass: every `CLAUDE.md` § referencing dropped hooks, files, or dirs gets updated
- E5: Activate `WikiLintEngine` PostToolUse only AFTER HNSW index ships (Phase F1) — resolves C15

### Phase F — Domain promotions (parallelizable; lowest leverage of MCP work)
*Independent domain dispatchers; each can be claimed by a different chat.*

- F1: Build HNSW wiki semantic index (audit rec #10)
  - Embed via `prism_ollama:embed` (Phase-C1 prerequisite)
  - Index version field; resumable build (resolves §3.5 cases)
  - Grep fallback when index missing/stale
- F2: `prism_quality` dispatcher (audit rec #13)
- F3: `prism_cad` generation actions (audit rec #16)
- F4: Wiki MCP actions (`prism_knowledge:wiki_*` × 6) — **depends on F1** for query semantics
- F5: SPARC family promotion (35 actions) — **only if §9 question 4 confirms active use**

### Phase G — Bus rollover & cleanup (final)
*Removes Phase-C dual-write fallbacks once stability proven.*

- G1: Remove file-fallback writes from chat-bus MCP (Phase C2 collapses to MCP-only)
- G2: Remove omega shadow-mode logging (Phase C3 collapses to enforce-only)
- G3: Drop the 5 chat-bus-reading hooks' file-readers (rely on MCP only)
- G4: Final audit pass: any orphan references to legacy files updated

---

## 6. Phase dependency graph

```
A (cleanup)  ─────────┐
                       ▼
B (foundations) ──┬─► C1 (ollama) ────────┐
                  ├─► C2 (bus dual-write) ┤
                  ├─► C3 (omega shadow)   ├─► D (coordinated removals) ─► G (rollover)
                  └─► C4 (advisory→MCP) ──┘
                       │
                       ▼
                       E (docs) [parallelizable, depends on A only]
                       │
                       ▼
                       F1 (HNSW) ─► F4 (wiki MCP) ─► E5 (lint hook)
                       F2, F3, F5 [parallelizable, depends on B only]
```

Critical path: **A → B → C2 (dual-write) → 24h soak → D2 (bus rollover) → G1**.
Earliest possible bus-only date: A (2h) + B (1d) + C2 build (6h) + 24h soak + D2 (2h) = **~2.5 days minimum** for the highest-leverage migration.

---

## 7. What NOT to plan (regressions surfaced by conflict analysis)

1. **Do NOT remove 11 disabled hooks in Phase 1** even though the parent audit lists this as a quick win. C1 + C2 say it must follow the MCP migration of `discipline-expert-inject` and the documentation cross-reference cleanup.
2. **Do NOT migrate chat-bus to MCP-only** in one shot — the dual-write phase is mandatory until Codex side migrates (C6) AND 30-day soak (C24).
3. **Do NOT activate omega tiers in enforce mode** without 7-day shadow soak (C8).
4. **Do NOT bulk-delete 84 duplicate skills** without per-pair `diff` (C18).
5. **Do NOT do both #4 (advisory→MCP) AND #9 (soften)** for the same hook — pick one (C3).
6. **Do NOT promote `PRISM-COMMANDS-MANIFEST.md` to MCP** without updating all 24 referencing files in same commit (C12).
7. **Do NOT wire `WikiLintEngine` to PostToolUse** before HNSW index lands (C15) — the conflict checks are no-ops without semantic neighbors.
8. **Do NOT run Phase-C migrations in 4 parallel chats** — MCP server hot-reloads will collide (C21). One worktree at a time.
9. **Do NOT collapse `bus_post` and `codex_delegate`** as separate primitives — `codex_delegate` is a wrapper convention over `bus_post(recipient='codex')` (C20).
10. **Do NOT trust the audit's "Risk: Low" stamps without grep verification** — 5 of 20 were under-risked (§1 table).

---

## 8. Decision points for user (before any execution)

These need answers before Phase B can start:

| # | Decision | Recommended | Why |
|---|---|---|---|
| 1 | `prism_ollama` as new dispatcher or actions under `prism_ai`? | **New dispatcher** | Clean ownership, telemetry isolation, easier deprecation if Ollama replaced |
| 2 | Per-hook decision protocol (Phase B B3): convert vs soften? | **Convert if hook fires every prompt; soften if hook fires only on Edit/Write** | Auto-fire frequency is the discriminator |
| 3 | Codex-side migration timing for chat-bus | **Codex must commit to file-fallback for ≥90 days, OR ship MCP client in same window** | Otherwise dual-write phase becomes permanent |
| 4 | Default omega tier after activation | **`proven_out` (0.85), not `shop_floor` (0.95)** | Existing engines/tests fall in 0.70–0.94 band; `shop_floor` will cascade-fail; promote to `shop_floor` per-engine after explicit calibration |
| 5 | SPARC family (35 skills) — actively used? | **Need 30-day telemetry from MCP action invocations after Phase C2 ships** | Don't promote dead surface |
| 6 | Wiki HNSW dependency on Ollama | **Acceptable** — Ollama is already a hard dependency for the offload pipeline | Single point of failure already exists |
| 7 | Quarterly archive cadence for `_completed_utilities/` and similar bootstrap debt? | **Yes — first archive in Phase A; re-run quarterly** | Prevents future audits from re-discovering the same 74 files |

---

## 9. Summary

**Conflict analysis surfaced 24 cross-recommendation interactions**, of which:
- 2 are **Critical** (C5 chat-bus reading hooks, C6 Codex coupling, C8 omega cascade)
- 6 are **High** (C2, C7, C11, C14, C24, C18 reassessed)
- 11 are **Medium**
- 5 are **Low**

**Primary corrections to parent audit**:
- Phase ordering must be dependency-driven, not leverage-driven
- 5 of 20 recs were under-risked; live grep evidence required
- Chat-bus migration needs dual-write phase + Codex coordination, not one-shot
- Omega activation needs shadow mode, not enforce mode, on day 1
- Advisory→MCP needs 2-phase conversion (MCP+softened, then drop), not one-shot
- 7 decision points unresolved; Phase B blocked until they are

**Earliest viable execution start**: after user answers the 7 decision points in §8.

**End of conflict analysis.**
