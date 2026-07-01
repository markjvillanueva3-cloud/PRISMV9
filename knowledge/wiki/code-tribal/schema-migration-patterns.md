---
name: schema-migration-patterns
category: code-tribal
domain: backend-dev
tags: [schema-version, migration, back-compat, deprecation, json-schema, schemaVersion, additive-evolution, breaking-change]
last_updated: 2026-05-18
---

# Schema Migration Patterns in PRISM

Every state-bearing JSON in PRISM has a `schemaVersion`. This is not aesthetic — it's load-bearing for the multi-chat / multi-machine / multi-tool ecosystem. Three separate post-ship audits caught silent regressions caused by a reader assuming the wrong schema shape. This wiki captures the patterns that prevent that.

## The two evolution regimes

**Additive evolution** — adding a new field, adding a new enum value, adding a new entry kind. Compatible with all existing readers. Bump the *minor* of `schemaVersion`. Readers built before the addition simply don't see the new field; this is fine.

**Breaking evolution** — renaming a field, removing a field, changing a value type, splitting one field into two. Requires a migration path + N-1 reader compat. Bump the *major* of `schemaVersion`. This is the rare case; treat it expensively.

The single most important discipline: **default to additive**. Three-fourths of "breaking" changes can be redesigned as additive (`new_field` next to deprecated `old_field`; readers prefer the new, fall back to the old; the old field gets removed in a future major after telemetry shows no consumers).

## Pattern 1 — `schemaVersion` is the first key, always

```js
const slotState = {
  schemaVersion: '2.0.0',  // FIRST
  slots: { alpha: { ... }, bravo: { ... } },
  updatedAt: '2026-05-18T18:00:00Z',
};
```

Readers read `schemaVersion` first, classify, then read the rest. Writers write `schemaVersion` first because it's what corrupted-file recovery scans for. The 2026-05-15 `chat-slots.json` schema v2 bump cleanly slotted `terminalWindowId` into existing entries because v1-format readers ignored unknown fields — that worked BECAUSE the schemaVersion field was already in place to distinguish.

## Pattern 2 — N-1 reader compat (minimum)

A reader written for v2 should still read v1. Two implementation styles:

**Style A — Branch-by-schemaVersion:**
```js
function readStats(j) {
  const schemaV = j.schemaVersion ?? '1.0.0';
  if (semverLt(schemaV, '2.0.0')) {
    return { offloaded: j.totals?.offloaded ?? 0, ratio: j.totals?.ratio ?? 0 };
  }
  return { offloaded: j.offloaded ?? 0, ratio: j.ratio ?? 0 };
}
```

**Style B — Probe-by-shape:**
```js
function readStats(j) {
  if ('totals' in j) {  // v1 shape
    return { offloaded: j.totals.offloaded ?? 0, ratio: j.totals.ratio ?? 0 };
  }
  return { offloaded: j.offloaded ?? 0, ratio: j.ratio ?? 0 };
}
```

**Style B is preferred** because it survives unannounced schema bumps — a producer that ships v3 next quarter without bumping the version field (a common bug) still works. Style A breaks silently on that case.

The 2026-05-17 `U-HRSR-SCHEMA-V2` regression was caused by a Style-A reader assuming v1 totals shape when the producer had already shipped v2 (without bumping schemaVersion). Style B detection + a fallback chain through both shapes was the fix.

## Pattern 3 — The fallback chain reports what it found

```js
function readStats(j) {
  const detected = 'totals' in j ? 'v1' : 'v2';
  const offloaded = detected === 'v1' ? j.totals.offloaded : j.offloaded;
  return { offloaded, schemaV: detected };
}
```

Downstream callers can:
- Log a warning if they got v1 from a producer that should be on v2 (drift detector).
- Take a different action based on the detected version.
- Fail loud if they got an unsupported version.

**The schema version is part of the output contract**, not a debug-only field. See [[hermetic-test-patterns]] Pattern 2.

## Pattern 4 — Migration helpers, NOT auto-migration on read

**Anti-pattern**: read the file, detect old schema, silently rewrite it to new schema, return new shape. This corrupts the file under a reader that didn't expect a write side-effect, and it does so SILENTLY.

**Pattern**: ship an explicit `migrate-v1-to-v2.mjs` script. The reader detects v1, returns the v1 shape (or adapted), and emits a `systemMessage` advising the operator to run the migration script.

```js
function readSlotState() {
  const j = JSON.parse(fs.readFileSync('chat-slots.json'));
  if (j.schemaVersion === '1.0.0') {
    console.warn('chat-slots.json is v1 — run scripts/migrate-chat-slots-v1-to-v2.mjs');
    return adaptV1ToV2InMemory(j); // never writes
  }
  return j;
}
```

The migration script:
1. Reads the v1 file
2. Constructs v2 in memory
3. Writes v2 atomically (see [[concurrency-and-locking-patterns]] Pattern 1)
4. Writes a `.v1.bak` next to the original (the 2026-05-15 `per-agent-handoff.mjs` rebuild pattern)

Migration scripts are explicit, audited, reversible. Auto-migration on read is the opposite of all three.

## Pattern 5 — Additive over breaking, almost always

When you think you need to rename `pid` → `processId`, ask: do you actually need to RENAME, or can you ADD `processId` next to existing `pid` and have new readers prefer the new field?

```js
// Producer (additive bump, schemaVersion 2.1):
const entry = {
  schemaVersion: '2.1.0',
  pid: process.pid,         // legacy
  processId: process.pid,   // new canonical name (same value)
};

// New reader:
const pid = entry.processId ?? entry.pid;

// Old reader (unchanged):
const pid = entry.pid; // still works
```

Three releases later, when telemetry shows no consumer still reads `entry.pid`, drop the legacy field and bump major.

This is the bulk of PRISM's "schema migration" — almost everything is additive. The 2026-05-16 chat-slots v2 add of `terminalWindowId` was additive; the 2026-05-17 `scrutiny-ledger.json` add of `claudeReviewed` was additive (with `geminiReviewed`/`opusBReviewed` accepted as aliases via [[fail-loud-r12-patterns]]).

## Pattern 6 — Schema validation at the reader boundary

For state files coming from N writers, validate at the reader. PRISM uses Zod schemas in TypeScript and `node:test` shape-asserts in pure JS:

```ts
import { z } from 'zod';

const SlotStateSchema = z.object({
  schemaVersion: z.string(),
  slots: z.record(z.object({
    chatId: z.string(),
    pid: z.number().int().positive(),
    terminalWindowId: z.string().optional(),  // additive in v2
  })),
});

function readSlots() {
  const raw = JSON.parse(fs.readFileSync('chat-slots.json'));
  const parsed = SlotStateSchema.safeParse(raw);
  if (!parsed.success) {
    // R12: fail loud, refuse-write, never silently degrade
    throw new Error(`chat-slots.json failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
```

**Reader-side validation** > writer-side validation, because:
- Writers can be downgraded / patched / corrupted / replaced; readers are the load-bearing surface.
- Multiple writers means writer-side validation has to be replicated N times.
- A schema-violating file is the operator's problem to triage; surfacing it from the reader is louder than silently dropping bad rows.

## Pattern 7 — Deprecation horizon, not deletion

When a field is to be removed:

1. **N**: mark deprecated in code (`/** @deprecated remove after v3 */`), in schema doc, in `## Recent regressions`.
2. **N+1 release**: emit warning when reader sees the deprecated field, recommend migration.
3. **N+2 release**: only AFTER telemetry shows no consumer reads it, remove the field. Bump major.

The 2026-05-17 `scrutiny-ledger.mjs` keeps `opusBReviewed` and `geminiReviewed` as legacy aliases for `claudeReviewed` — a pure-additive deprecation. The aliases will be removed in the next ledger major after no more legacy entries exist in the archive.

## Pattern 8 — Schema files separate from data files

Storing schema definitions in the same JSON file as the data is a footgun (the schema can be mutated). Canonical PRISM pattern:

- **Schema**: `.claude/schemas/<entity>.schema.json` (JSON Schema), or a `*.ts` Zod export.
- **Data**: `state/shared/<entity>.json`, validated against the schema at read time.

The schema file is checked in, versioned with git, and is the single source of truth for what shape `<entity>` takes. Multiple readers + writers consume the same schema definition.

## Pattern 9 — Migrating cross-file references

When entity A references entity B by id (`A.parentId = B.id`), a B-schema rename affects A's storage:

```js
// v1: A.parentSlot = "alpha"
// v2: A.parentSlot is still "alpha" (slot rename was additive)
// v2.1: B added kilo/lima/mike slots (slot enum extension)
//       A.parentSlot might now be "kilo" — A reader MUST accept new values
```

The 2026-05-16 13-slot expansion (added kilo, lima, mike to the NATO chat slot enum) was additive — A readers (handoff topic resolvers, fleet-status renderers) just gained new valid values; no entity-A migration needed.

**When a cross-reference rename IS unavoidable**: do A migration AFTER B migration is complete + telemetry-verified. Order matters — migrating A first orphans B-references; migrating B first leaves stale references in A.

## Pattern 10 — Pre-merge `git diff` schema check

PRISM doesn't ship this yet but should: a CI hook that diffs the JSON schema files between the merge base and HEAD, fails the PR if any field is REMOVED without a `@deprecated` comment AND a major version bump.

The cheap-shot version: a 10-line script in `.claude/hooks/pre-commit-schema-check.mjs` that reads `*.schema.json` files, asserts `additionalProperties: false` is unchanged, asserts no fields disappeared.

## Anti-patterns observed in PRISM

- **Silent schema upgrade on read** (Pattern 4 anti) — corrupted N entries before discovery.
- **No `schemaVersion` field at all** — every reader has to probe shape, every writer has to assume; debugging schema drift is impossible.
- **Writer bumps schemaVersion without producer-side validation** — readers reject the file because the writer made a typo in a field rename.
- **Reader assumes a schema it didn't validate** (Pattern 6 anti) — the 2026-05-17 `U-HRSR` regression, identically.
- **Migration scripts that write without atomic-rename** — half-migrated state if killed mid-write.
- **Migration scripts without a `.bak`** — no rollback if the migration is wrong.

## Bug-class taxonomy

| Bug class | Pattern that prevents it | Example |
|-----------|--------------------------|---------|
| Silent v1→v2 reader rot | Pattern 2 (Style B probe) | U-HRSR-SCHEMA-V2 |
| Auto-migrate corruption | Pattern 4 (no write-on-read) | hypothetical (this rule prevented several) |
| Schema-version-not-checked | Pattern 1 (schemaVersion FIRST) | U-VIZ-SPLIT-OUT-FILE (header bytes scanned) |
| Reader assumes wrong shape | Pattern 6 (Zod validate) | fleet-reaper Tier-2 `services.docker` |
| Field removed too early | Pattern 7 (deprecation horizon) | (averted multiple times) |

## When to break the rules

For internal-only state (a single script's cache that no other consumer reads), schema-version discipline is over-engineering. The 80 MB cap on `master-index-search-lib`'s graph cache doesn't need a `schemaVersion` — it's regenerated on every run.

The rule of thumb: if `git log -- <path>` shows ≥2 distinct authors or ≥3 distinct write-sites, the file needs schema discipline. Otherwise it's a single-author internal cache and YAGNI applies.

## See also

- [[hermetic-test-patterns]] — schema-probe at the reader boundary (Pattern 2 there)
- [[concurrency-and-locking-patterns]] — atomic-rename for schema migration scripts
- [[fail-loud-r12-patterns]] — failing loud on schema-version mismatch
- [[atomic-write-idempotency-patterns]] — atomic-rename, structurally
- [[regression-prevention-doctrine]] — schema bumps land in `## Recent regressions`
