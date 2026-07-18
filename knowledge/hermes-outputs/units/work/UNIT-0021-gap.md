# UNIT-0021 — Forward Compatibility and Version Control of Physics/Rules/Souls — GAP ANALYSIS
_Analyst: india (ai-training soul) · 2026-07-02 · every claim cited file:line, read-verified_

## Existing coverage

**Versioning schema + migration tools — EXIST:**
- `mcp-server/src/migrations/stateMigrations.ts:24-77` (read end-to-end) — centralized schemaVersion migration registry: `LATEST_VERSION` map (:32-38), `migrateToLatest()` reader-side chained-migration scaffold (:47-69), explicit FORWARD-COMPAT rule already implemented ("if schemaVersion above latest → log warn, return as-is (forward-compat)", :45), legacy-detector `wasMissingSchemaVersion()` (:75-77).
- `mcp-server/src/engines/MigrationEngine.ts:1-30` — schema versioning + data migration management: `migration_apply/rollback/status/list/validate`, tracks applied migrations, prevents duplicate application; WIRED at `devDispatcher.ts:496,3686-3700` (prism_dev — satisfies the "wired to prism_dev" criterion).
- Fleet doctrine already mandates the versioning schema: `mcp-server/CLAUDE.md` §Schema Versioning (every state JSON carries `schemaVersion`, migrations in `src/migrations/`, N-1 backward compatibility) + `scripts/backfill-schema-version.mjs` (exists, verified by ls) + `schema-version-bump` / `schema-version-read` hooks (graph nodes L10/built per pre-Bash inject; hook files PARTIAL-UNVERIFIED, not read).

**Domain-specific version control — EXISTS:**
- `mcp-server/src/engines/PostVersioningEngine.ts:1-30` — content-addressable (SHA-256) post-processor revision tracking with history, line-diff, and rollback-by-hash; cites Git object model + ISO 10303-242 revision management.
- `mcp-server/src/engines/DocumentControlEngine.ts:11,19,28` — ISO 9001 §7.5.3(e) control of changes; immutable revision rows; "Forward-only versioning — never overwrites a previously approved revision".
- `mcp-server/src/engines/CADBundleSigningVersioningEngine.ts` + `mcp-server/src/engines/NamespaceMigrationEngine.ts` — exist on disk (verified by ls; bodies PARTIAL-UNVERIFIED).

**Souls + physics under version control:**
- Souls: `state/shared/slot-souls/*.md` (alpha.md, bravo.draft.md, ... verified by ls) — git-tracked, with generated agents refreshed from souls (per soul-file doctrine).
- Physics: `mcp-server/src/physics/constants.ts` is the single canonical source (root CLAUDE.md §SAFETY) — git history IS its version record.

## Real gaps
1. **No ForwardCompatChecker as an active gate** — forward-compat today is warn-and-continue (`stateMigrations.ts:45,67-68`); nothing VALIDATES that a proposed physics/rule/schema change keeps N+1 readers working (e.g., a consumer-contract scan or round-trip check before a version bump lands).
2. **stateMigrations registry covers only 5 state files** (:24-29: COMPACTION_SURVIVAL, HANDOFF_PACKAGE, RECOVERY_MANIFEST, CURRENT_STATE, next_session_prep) while `data/state/` carries far more schemaVersioned files; MigrationEngine is generic/in-memory and not bound to those real files — the "migration harness" exists in two disconnected halves.
3. **No semantic versioning / change-impact surface for physics constants** — a kc1.1 or Taylor-C change is only visible via git archaeology; no engine reports "constants.ts vN→vN+1 affects these 17 force engines".
4. **Souls have no version metadata beyond git** — no schemaVersion/frontmatter version field verified in soul files (not exhaustively checked; absence claim limited to what was inspected).
5. **"Validation on rule changes" criterion** — no test harness found that replays a rule-version bump against live consumers (absence within searched scope: src/migrations, MigrationEngine wiring, scripts glob for schema/migrat/version).

## Verdict
**extend**

## Recommended next action
Unify the two existing halves instead of building a third: bind `MigrationEngine` (devDispatcher-wired, :3686-3700) to the real `stateMigrations.ts` registry and extend `LATEST_VERSION` coverage from 5 files toward the full `data/state/` schemaVersioned population (enumerate the actual count first — ALL means ALL). Then add the genuinely-missing piece: a `forward_compat_check` action on prism_dev that, given a target file + proposed version bump, (a) verifies a registered migration path exists, (b) round-trips a live sample through `migrateToLatest`, and (c) for physics/rules changes greps consumer imports of `physics/constants.ts` to emit a blast-radius report. Validate on one real rule change (e.g., replay the 2026-06-29 G170/G168 Okuma dialect regression as the reference case — a wrong safety code that propagated to six sites is exactly what this checker must catch).

## ROI
**4/10** — versioning + migration + forward-compat-read behavior already exist and are dispatcher-wired; the incremental gap (active checker + registry coverage expansion) is real but modest in value relative to git-native versioning already protecting physics/souls, and effort is nontrivial because honest coverage requires enumerating every schemaVersioned state file.
