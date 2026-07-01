---
slot: bravo
chat_id: claude-bf45be54
last_updated: 2026-05-19
status: pending-consolidation
schema_version: 0.1.0
---

# CLAUDE-bravo.md — bravo slot's proposed additions to canonical CLAUDE.md

This file is bravo slot's **inbox of proposed additions** to `H:/PRISM/CLAUDE.md`. Per the project doctrine (`OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF`), only the golf hygiene slot edits canonical CLAUDE.md directly. Other slots write their proposed additions here; golf consolidates twice daily (planned: 6am + 6pm via scheduled task).

This is the **seed file** for `CLAUDE-MD-PER-SLOT-MS0` (proposed milestone, 2026-05-19) — a generalization of the existing single-inbox-via-`## Recent regressions` model to per-slot inboxes with deterministic consolidation. Until that milestone ships, the file is read manually by golf (or by any chat acting in golf's role) and merged into canonical CLAUDE.md.

## Proposed section: §SPECIALIZED SLOT ROLES (zebra, sierra, unslotted-fallback)

**Proposed insertion location:** in `H:/PRISM/CLAUDE.md`, between the end of §GOLF SLOT (line ~151) and the start of §ENGINE WIRING (line ~153).

---

```markdown
## SPECIALIZED SLOT ROLES — zebra, sierra, unslotted-fallback (2026-05-19)

In addition to golf (hygiene) and the 25 work slots (`alpha..foxtrot, hotel..zulu` minus golf's position 7), three specialized roles were added 2026-05-19 to close concrete fleet-coordination gaps.

### `zebra` — strategic main-tree committer + git-tree organizer
Zebra is **NOT a NATO letter** and **does NOT get its own slot worktree**. Zebra works directly in the canonical `H:/PRISM` main tree on the active branch (currently `cad-fusion-live-ms0`) and commits with the `[MAIN]` prefix that satisfies `worktree-commit-route.mjs` for cross-scope work. Its job is the integrator role for commits that genuinely belong in the main tree (cross-cutting doctrine updates, multi-domain refactors, milestone close-out merges that touch all slot scopes).

Commit format: `[MAIN] [SCOPE]/U-ID: title` — the `[MAIN]` is the worktree-route override; the inner `[SCOPE]/U-ID` is the normal unit identifier.

Distinguishing zebra from a slot work-chat that override-commits to main: zebra is **explicitly bound to the main tree by role**; a slot work-chat that needs to commit cross-scope should **first ask zebra to do it** (via chat-bus) rather than override its own routing.

### `sierra` — system-viz node updater + expander
Sierra is **NATO-S**, position 19 of 26. It gets its own slot worktree at `H:/prism-slot-sierra` on branch `slot/sierra` like the other 25 NATO slots. Sierra's specialization: **system-viz hygiene** — running `scripts/regen-viz.mjs` on cadence, registering new nodes via `scripts/system-viz-add-node.mjs` as engines/skills/hooks ship, expanding the graph as new domain layers come online, surfacing fsCoverage gaps as PRISM grows.

Sierra is NOT exclusive — any chat can call `system-viz-add-node.mjs`. Sierra OWNS the cadence + drift reconciliation + visual canonicalization (the "did this regen actually reflect today's deltas?" check).

### Unslotted-chat fallback worktree
Chats that haven't run `/checkin-<nato>` and have no slot binding (`chat-slots.json[slot].branch === null`) get a designated fallback worktree: **`H:/prism-unslotted` on branch `work/unslotted`** (provisioned 2026-05-19 by `scripts/bootstrap-slot-worktrees.mjs`).

Operators should still prefer `/checkin-<nato>` to bind a real slot, but for transient / one-off chats the unslotted fallback gives `worktree-commit-route.mjs` a route that ISN'T the shared main tree. Prevents the recurring class where a no-slot chat commits cross-contaminating changes to `cad-fusion-live-ms0` without `[MAIN]` and gets blocked.

### Bootstrap + provisioning
All 26 NATO slot worktrees + the unslotted fallback are provisioned by `scripts/bootstrap-slot-worktrees.mjs` (idempotent — safe to re-run). The 2026-05-19 root cause of widespread slot-commit failures was: **doctrine said worktrees should exist but the actual `git worktree add` was never executed on this PC**. After the bootstrap runs once per PC, `/checkin-<nato>` Step 2c cutover has real worktrees to migrate INTO.

Command: `node H:/prism/scripts/bootstrap-slot-worktrees.mjs [--dry-run] [--json]`. Exit 0 = all slots present-or-created; 1 = at least one create failed; 2 = preflight error (not in PRISM repo).
```

## Proposed §SUBSTRATE-HEALTH INJECTOR section

**Proposed insertion location:** in `H:/PRISM/CLAUDE.md`, between §MANDATORY SELF-AWARENESS (currently ends ~line 199) and §Recent regressions (currently ~line 200).

---

```markdown
## SUBSTRATE-HEALTH INJECTOR (2026-05-19, bravo, commit `01ff65a734`)

`H:/PRISM/.claude/hooks/substrate-health-inject.mjs` (SessionStart, advisory). Surfaces `scripts/declared-vs-actual.mjs` drift in every chat's SessionStart context bundle. Compounds with today's earlier ship of `declared-vs-actual.mjs` (commit `aad2152f7f`): the `/forge7 §Phase 0.2` gate runs only on explicit invocation; this hook extends it to EVERY session so chats learn about MCP typos / dormant declarations / scaffolded-empty env vars / orphan hooks without explicit invocation.

3-line digest via `hookSpecificOutput.additionalContext`. Cached 2h at `state/shared/.cache/substrate-health-last.json`; cache-hit ~5-15ms, miss ~sub-second with 8s spawn timeout. Pure `formatDigest(report, ageMs)` export — 27 hermetic `node:test` cases. Adversarial-input guards: `Number.isFinite && >= 0` coerce on `drift_count`/`blocking_count` (NaN/Infinity/negative/undefined never leak as strings), strict `summary.ok === true` for clean branch (string `"true"` falls through to ⚠, fail-loud R12), 1MB `MAX_CACHE_BYTES` cap on cache reads (hostile-payload class, sister to ask-ollama 80MB graph cap).

Wired at user-global `C:/Users/wompu/.claude/settings.json` `SessionStart[0].hooks[23]` (after `awareness-snapshot-inject`). Auto-mirrored to `H:/.claude/settings.json` via `c-to-h-mirror`. Per-file scrutiny: 2 reviewers, 4 P1s fixed pre-commit (case-sensitive path compare on Windows, undefined-leak rendering, hardcoded PRISM_ROOT, unbounded JSON.parse).

Knobs: `PRISM_SUBSTRATE_HEALTH_INJECT=0` disables; `PRISM_SUBSTRATE_HEALTH_TTL_MS=N` overrides TTL; `PRISM_ROOT` overrides the H:/PRISM resolution.

Wiki: [`knowledge/wiki/architecture/substrate-health-inject.md`]. Memory: [[reference_substrate_health_inject_2026_05_19]].
```

## Proposed §Recent regressions entry (synergy ship)

```markdown
- 2026-05-19 | **Substrate-health drift was invisible to 25/26 chats** — `scripts/declared-vs-actual.mjs` (commit `aad2152f7f`) detected today's `prism-mcp-server` → should-be `prism` typo + `prism_safe` missing-from-enable-list + 3 scaffolded-empty env vars (`SUPABASE_PROJECT_URL`, `SUPABASE_ANON_KEY`, `FIGMA_FILE_KEY`) + 336 hook orphans on disk + 341 total drift items, but the gate runs ONLY inside `/forge7 §Phase 0.2` — every other chat (24 work + 1 golf) never saw the drift report unless the operator explicitly ran `node scripts/declared-vs-actual.mjs`. Net: 25/26 chats blind to substrate health by default. | fix: `SYNERGY-SUBSTRATE-MS0/U-SHI01` (slot bravo, commit `01ff65a734`) — new `H:/PRISM/.claude/hooks/substrate-health-inject.mjs` SessionStart hook surfaces the drift digest in every chat's `additionalContext` bundle. 2h-TTL cache at `state/shared/.cache/substrate-health-last.json`, advisory-only (exits 0 on every error path), 27 hermetic tests. Wired at user-global `SessionStart[0].hooks[23]` after `awareness-snapshot-inject`. Per-file scrutiny: 2 reviewers, 4 P1s fixed pre-commit (case-sensitive path compare on Windows, undefined-leak rendering for malformed reports, hardcoded PRISM_ROOT vs env-override, unbounded `JSON.parse` on cache → 1MB cap). Knob: `PRISM_SUBSTRATE_HEALTH_INJECT=0`. | observed-by: claude-bf45be54 slot bravo `/goal /loop`. | verify: `echo '{}' | node H:/PRISM/.claude/hooks/substrate-health-inject.mjs` returns a JSON envelope with `hookSpecificOutput.additionalContext` containing `Substrate health`; `node --test H:/PRISM/.claude/hooks/substrate-health-inject.test.mjs` → 27/27.
- 2026-05-19 | **Slot-worktree bootstrap was never run on this PC** — SLOT-WORKTREE-MS0 doctrine shipped 2026-05-16 (CLAUDE.md §SESSION CONTINUITY STACK references it) but actual `git worktree add` was never executed for the 26 NATO slot worktrees. Result: every chat's `/checkin-<nato>` Step 2c cutover failed silently → chats stayed in shared `H:/PRISM` main tree → `worktree-commit-route.mjs` blocked or required `[MAIN]` override on every commit. Fix: `node H:/prism/scripts/bootstrap-slot-worktrees.mjs` (idempotent). Verified 19/26 NATO worktrees were already partially present on this PC (alpha..mike + november..sierra); 7 remaining (tango, uniform, victor, whiskey, xray, yankee, zulu) provisioned in the same run. Unslotted-fallback at `H:/prism-unslotted` (`work/unslotted` branch) also provisioned for chats without slot binding. | fix: `bootstrap-slot-worktrees.mjs` shipped this session | observed-by: claude-bf45be54 slot bravo /goal session
```

## Notes for golf consolidator

- **Place §SPECIALIZED SLOT ROLES** between §GOLF SLOT (currently ends ~line 151) and §ENGINE WIRING (currently ~line 153).
- **Append §Recent regressions entry** to the existing block (currently at line ~349 in CLAUDE.md). Sort by date descending if §Recent regressions is sorted; otherwise append at the end of its block.
- **Schema:** this file's frontmatter (`slot`, `chat_id`, `last_updated`, `status`, `schema_version`) is the prototype for `CLAUDE-MD-PER-SLOT-MS0/U-CMD01`. When that milestone ships, the consolidator (`scripts/golf-consolidate-claude-md.mjs`) reads `state/shared/claude-md-slots/CLAUDE-*.md`, merges each `## Proposed section: …` block + `## Proposed §<section> entry` block into the canonical CLAUDE.md by section-key matching, dedupes by line-content hash, and marks `status: consumed-<iso-date>` here (or moves the file to `claude-md-slots/_consumed/<date>/`).

## Why this exists

The hook `worktree-commit-route.mjs` (and the per-file CLAUDE.md edit guard from `OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF`) correctly enforce that only golf edits canonical CLAUDE.md, but there's no clean per-slot inbox for other slots to propose changes beyond appending to `## Recent regressions`. This file is the prototype for that inbox. The user's 2026-05-19 directive ("can each chat slot use and modify their own and golf consolidates them twice a day") matches this exact architecture; this file is the seed.
