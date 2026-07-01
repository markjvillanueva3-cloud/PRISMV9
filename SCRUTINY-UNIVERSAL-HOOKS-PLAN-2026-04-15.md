# Scrutiny Report — Universal Skills/Hooks Plan
**Date:** 2026-04-15
**Subject:** `H:\prism\UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md`
**Method:** 2 parallel independent agents (self-awareness lens + duplication-mitigation lens)
**Overall verdict:** Plan is 60% complete. 6 CRITICAL gaps, 10 MAJOR gaps. Requires Phase 0 insertion.

---

## Executive Summary

The plan treats awareness as a *consequence* of disciplined creation, not a *first-class transactional invariant*. Every CRITICAL gap shares one root cause: **no single transaction binds "file created" → "awareness updated."**

The most damning finding: `DuplicationGuardEngine.mustCheckBeforeCreating` and `.mustNotReExtract` have **zero call sites** outside the engine file itself. The entire existing dedup system is honor-based. CLAUDE.md mandates the call; nothing enforces it. Any plan that layers more hooks on top of this broken foundation inherits the honor-system problem.

Fix: promote dedup enforcement from advisory (PostTool, detects after write) to **PreTool mandatory (blocks before write)**, and expand coverage from 3 asset types to **13 asset types**.

---

## CRITICAL Gaps (awareness WILL fail without fix)

### C1. No PostWrite → Awareness-Sync transaction
Plan's `PostTool` is advisory. A crash between file-write and registry-update leaves awareness permanently wrong. Terminal A writes FooEngine.ts at t=10s, registry updates at t=30s; Terminal B queries at t=15s, gets "no match", creates FooEngine2.ts. **This is the exact duplication the user wants eliminated.**

**Fix:** Add `hook_post_write_sync_awareness` (Tier 0, PostTool Write|Edit) that:
- Classifies asset type from path glob
- Appends to registry with atomic `proper-lockfile` CAS
- Updates `MASTER_INDEX_COMPACT.md` delta
- Broadcasts via `AGENT_CHAT.md`
- HARD-BLOCK: if sync fails → roll back the file write via `git checkout --`

### C2. Forge-Triple is not atomic — must become Forge-Quint
Plan says "engine ships with hook + action + skill" (3 steps). Missing: registry update as mandatory 4th step. And dedup checks fire independently per asset type — engine can clear while skill duplicate exists.

**Fix:** Rename `forge-triple` → `forge-quint`:
1. Pre-check dedup for all 5 assets atomically (single try-block)
2. Engine + Hook + Action + Skill + **RegistryDelta**
3. Wrap all 5 in `lockfile.lock()` transaction
4. On any failure: `git checkout -- <all-files>` full rollback

### C3. Dedup covers 3 of 13+ asset types — FATAL COVERAGE HOLE
Plan has dedup for engine/hook/skill. **MISSING dedup for:**

| Asset | Count | Risk | New Hook |
|-------|-------|------|----------|
| Actions | 4,296 | SEVERE | `hook_no_duplicate_action` |
| Scripts | 48→100 | HIGH | `hook_no_duplicate_script` |
| Formulas | 39→400 | SEVERE | `hook_no_duplicate_formula` |
| Algorithms | 17 | MEDIUM | `hook_no_duplicate_algorithm` |
| Tribal tips | 3,700+ | **SEVERE** | `hook_no_duplicate_tribal_tip` |
| Playbook rules | 296 | HIGH | `hook_no_duplicate_playbook_rule` |
| Dispatchers | 84 | LOW | `hook_no_duplicate_dispatcher` |
| Schemas | ~500 | MEDIUM | `hook_no_duplicate_schema` |
| Test files | ~600 | MEDIUM | `hook_no_duplicate_test_describe` |
| Root MD docs | 100+ | HIGH | `hook_no_root_md_without_registry` |
| Roadmap milestones | 525 | HIGH | `hook_no_duplicate_milestone_scope` |
| Data state JSON | ~50 | MEDIUM | `hook_state_json_registration` |
| Plans | 101 | MEDIUM | `hook_plan_registration` |

**+ 13 new hooks.** Each wired to `DuplicationGuardEngine.mustCheckBeforeCreating(type, ...)`.

### C4. Name-only dedup misses semantic duplicates
`DuplicationGuardEngine.calculateSimilarity` is Jaccard-on-words. `MillOptimizer` vs `MillProgramOptimizerEngine` vs `MillingOptimizationEngine` → Jaccard ~0.3 → passes. But all three do the same thing.

**Fix:**
- Add `SemanticSimilarityGuardEngine.ts` — sentence-transformers on JSDoc + method signatures; cosine > 0.85 = duplicate
- Add `signatureHash(inputZod, outputType)` as secondary key
- Add `src/data/canonical-aliases.json` for known alias groups
- Wire into every dedup hook as second check stage

### C5. No cross-terminal broadcast — pull-only awareness
Plan line 237 says "announce in AGENT_CHAT.md" — manual and pull-based. Terminal B can go 5-10 minutes between prompts and build a duplicate in parallel.

**Fix:** Add `CrossTerminalBroadcastEngine.ts`:
- FS-watcher on `cross-session-asset-registry.json`
- Named-pipe/socket notification to subscribed sessions
- Every session subscribes on SessionStart
- On change: invalidate local awareness cache → force re-inject on next `PreTool`
- Add `hook_pre_tool_awareness_refresh`

### C6. No mid-session staleness detection
Plan injects awareness at `UserPromptSubmit` and `SessionStart` only. A 2-hour coding session can drift badly.

**Fix:** Add `hook_awareness_staleness_check` every N=20 PostTool events. Compares local cache hash vs registry hash. On drift: force re-read + re-inject. Emit `AwarenessScoreEngine.score()` to telemetry.

### C7. **Enforcement is honor-system** — ZERO call sites for `mustCheckBeforeCreating`
Grep confirms the mandated dedup check has zero callers outside the engine itself. CLAUDE.md says call it; nothing enforces. Plan's dedup hooks fire PostTool (after write).

**Fix:** Every dedup hook must be `PreTool` (Write tool), proposed-path-aware, and `block` on throw. Enforce at the harness layer before the write lands on disk.

### C8. Race conditions on registry writes
`DuplicationGuardEngine.saveToCrossSessionRegistry` (L369-425) uses plain `fs.writeFileSync`. Same at `appendToExtractionLog` (L671). Two terminals writing concurrently clobber entries.

**Fix:** Wire `proper-lockfile.lock(registryPath)` into both. Already a U-AWR25 primitive — just apply it here.

---

## MAJOR Gaps (awareness WILL drift)

### M1. No orphan/dangling-asset detector
No hook detects engines that exist on disk but are imported nowhere, or registry entries pointing to deleted files.
**Fix:** `scripts/detect-orphans.ts` + `stop_on_orphans_detected` (Tier 6).

### M2. No dependency-graph awareness
"What breaks if I change X?" is unanswerable.
**Fix:** `DependencyGraphEngine.ts` builds `DEP_GRAPH.json`, exposes `dependentsOf(file)` + `impactedBy(file)`. Refreshed by post-write hook. Wired into `hook_pre_tool` for CRITICAL file edits.

### M3. No temporal / hot-cold tracking
Registry stores existence but not usage frequency.
**Fix:** Extend registry schema with `createdAt`, `lastModified`, `lastInvokedAt`, `invocationCount`. Update on PostTool when MCP dispatcher fires.

### M4. Multi-modal coverage gaps — data/docs/configs/tests
Plan registers engines/hooks/skills but not: state JSON, configs (tsconfig/.env), root MDs (100+), test files, migrations.
**Fix:** Extend `ResourceIndexEngine` + add `TestCoverageIndexEngine.ts` (maps engine.ts → engine.test.ts presence).

### M5. No external H: drive change detection
20,000 new JM DIE files added externally → awareness blind.
**Fix:** `scripts/h-drive-delta-scan.ts` (nightly cron + SessionStart quick-scan). Hash manifest of `H:/PRISM/JM DIE/**` vs last scan. Changed → queue for `/extract-dark-content`.

### M6. No "build-nothing-if-awareness-stale" safety gate
Plan's `hook_sx_gate` blocks on safety score but nothing blocks on awareness-score floor.
**Fix:** `hook_awareness_floor` — HARD-BLOCK PreTool Write|Edit when `awarenessScoreEngine.current() < 0.80`.

### M7. Codex-family sessions not explicitly handled
Plan references `UserPromptSubmit`/`PostTool` which are Claude-harness primitives. Codex has different lifecycle events.
**Fix:** `hooks/family-adapters/codex-adapter.ts` translating Claude hook names → Codex equivalents. Document dual-implementation requirement.

### M8. No awareness self-test
`/awareness-check` runs on demand but no periodic assertion that awareness infrastructure itself works.
**Fix:** `scripts/awareness-self-test.ts` — creates canary engine, asserts dedup catches it, rolls back. SessionStart + nightly.

### M9. No compaction integrity check for awareness index
`PreCompact`/`SessionStart:compact` save MEMORY but not explicit awareness-cache checksum.
**Fix:** Extend `pre_compact.ts` to hash registry + MASTER_INDEX_COMPACT into SESSION_ARTIFACTS. `session_start_compact.ts` verifies hash; mismatch → full rebuild before user prompt.

### M10. No universal sub-100ms awareness query API
Each consumer reads JSON files separately.
**Fix:** `AwarenessQueryEngine.ts` singleton, loads registry on SessionStart, exposes `exists(type, name)`, `findSimilar(keywords)`, `dependents(path)`, `lastInvoked(name)`. <100ms via indexed Map. All skills/scripts consume via this API, not raw JSON.

### M11. `loadFormulas` / `loadAlgorithms` hardcoded
`DuplicationGuardEngine.loadFormulas` (L507) has a hardcoded 21-entry list, not reading `FormulaRegistry`. Same for algorithms (L551).
**Fix:** Wire both to actual registry sources; auto-refresh on PostWrite.

### M12. Forced re-extraction path has no superseding
`mustNotReExtract` has no override. Source doc updated? No safe path forward.
**Fix:** `allowReExtractWithSuperseding(sourceId, reasonCode, newSha256)` archives old entry rather than deleting. `extraction-log.json` gains SHA256 content-hash column.

### M13. ForgeIntentClaim missing
Two terminals start `/forge-triple` with different names but same semantics → both pass name-dedup, both create.
**Fix:** `ACTIVE_WORK_REGISTRY.json` entries gain `forgeIntent: { keywords, description }`. Claim grant checks semantic similarity against existing active claims.

---

## MINOR Gaps (polish)

- Awareness telemetry cadence: emit `awarenessScore` every 20 PostTool → `AWARENESS_TELEMETRY.jsonl`
- Hook registration atomicity: use `proper-lockfile` on the new STOP_HOOK_REGISTRY.json
- Dispatcher-health drift: feed Tier 4 JSON reports into awareness score
- Schema-version awareness: add `hook_schema_version_read` warning on N-2 versions
- Skill auto-discovery: nightly `skill-manifest-verify.ts` catches skills without frontmatter
- `/audit-duplicates` skill: retroactively surfaces existing duplicates (plan only prevents new)
- Velocity-vs-safety: add `checkMode: "strict"|"advisory"|"extend-ok"` param; CRITICAL files strict, new scripts advisory

---

## Verdict

Insert **Phase 0 — Awareness Transactional Layer** before Phase 1:

1. Fix `DuplicationGuardEngine` call-site enforcement (PreTool, not PostTool)
2. Ship `AwarenessQueryEngine` + `CrossTerminalBroadcastEngine` + `SemanticSimilarityGuardEngine`
3. Expand dedup hooks from 3 → 13 asset types
4. Make forge-triple → forge-quint with transactional atomicity
5. Wire `proper-lockfile` into all registry writes

Without Phase 0, Phases 1-4 build on a broken foundation and all 245 artifacts inherit the honor-system problem.

With Phase 0, PRISM moves from ~60% awareness coverage to ~95%, and "build once, never duplicate" becomes a machine-enforced invariant rather than a discipline hope.
