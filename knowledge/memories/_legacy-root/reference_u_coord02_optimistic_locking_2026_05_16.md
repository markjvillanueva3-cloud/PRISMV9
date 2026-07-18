---
name: reference-u-coord02-optimistic-locking-2026-05-16
description: "COORD-MS0/U-COORD02 — optimistic locking with version field on AtomicClaimBrokerEngine. Shipped 2026-05-16 slot echo, commits 80cf19d2b + 362bc300b + 4c1cb1775. 33-case vitest companion; per-file 2-arm PASS; 3-of-3 PASS after a real boundary-check find. Key durable lesson: `startsWith(tmpRoot)` is a string-prefix test, NOT a directory-containment test — `/tmp-evil/foo` slips through `/tmp`. Use `=== root || startsWith(root + path.sep)` instead. Caught by scrutiny arm C (code-analyzer) on the env-seam I'd just added."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:10.048Z
aliases: reference_u_coord02_optimistic_locking_2026_05_16
---


# U-COORD02 — Optimistic Locking with Version Field

## What shipped

`mcp-server/src/engines/AtomicClaimBrokerEngine.ts` + new
`mcp-server/src/__tests__/AtomicClaimBrokerEngine-U-COORD02.test.ts` (33 vitest
cases) + envelope flip `mcp-server/data/milestones/COORD-MS0.json` (9/12 -> 10/12
complete). Three commits — the substance, the analyst-driven hardening, and the
analyst-driven boundary-fix.

The pre-U-COORD02 engine had file-level atomicity (temp + rename) but a
last-writer-wins read -> modify -> write race: two writers both read version N,
both compute updates, both rename — the second silently clobbers the first.
U-COORD02 closes the common case:

- `ClaimRegistry` schema + interface gained an optional `version` field
  (so pre-U-COORD02 files still parse; `readRegistry` normalizes
  missing/corrupt via the new `normalizeVersion()`).
- `atomicWrite()` does a compare-and-swap: re-reads the on-disk version
  immediately before the rename and throws the new `StaleRegistryError` if it
  != the version the caller read, else writes `version + 1`. The pure decision
  is the exported `casVersionCheck()`.
- A new private `commitWithRetry()` helper does read -> compute -> CAS-write
  with bounded retry (3 attempts); `releaseClaim` / `updateClaimState` /
  `reapZombies` all route through it, so a stale-version rejection retries
  instead of spuriously returning false.
- `acquireClaim` already had its own retry loop with a bare `catch { continue }`
  and absorbs the new error type without code change.
- `getStats()` now surfaces `version`.

## Key durable lesson — `startsWith` is NOT directory-containment

Scrutiny arm C (`code-analyzer`) was reviewing the production safety guard I
added to the test-injection seam `PRISM_ATOMIC_CLAIMS_FILE`:

```ts
// VULNERABLE — string-prefix test, not directory-containment
if (!resolvedOverride.startsWith(tmpRoot)) return DEFAULT_CLAIMS_FILE;
```

C nailed it: `path.resolve("/tmp-evil/foo.json").startsWith(path.resolve("/tmp"))`
is **true**. A sibling directory whose name shares the tmp prefix slips
through. The fix is the canonical idiom:

```ts
// CORRECT — directory-containment
const insideTmp =
  resolvedOverride === tmpRoot ||
  resolvedOverride.startsWith(tmpRoot + path.sep);
```

The next character after the prefix must be a path separator (or the path
must equal the root exactly). `path.resolve` already collapses `..` segments,
so `/tmp/../etc/passwd` resolves to `/etc/passwd` and fails both branches.
`path.sep` is cross-platform-safe — on Win32 `path.resolve` normalizes to `\`
and `path.sep === "\\"`.

**Standing rule for any path-containment check**: do NOT use bare
`startsWith(root)`. Always use the boundary-aware idiom above, or
`!path.relative(root, candidate).startsWith("..")` (POSIX-safer variant).
Bare prefix tests are correct for *exact-string* prefixes (`"http://"`,
`"VITEST"`), not for *directory* prefixes.

## Test-injection seam doctrine

A test that needs to write the file the engine writes should NOT clobber the
live fleet artifact (the existing `-U-AWR25.test.ts` unlinks
`H:/prism/state/shared/ATOMIC_CLAIMS.json` mid-run — a latent bug, pre-existing,
not mine to fix in this unit).

The seam pattern I shipped:

1. Engine reads `process.env.PRISM_ATOMIC_CLAIMS_FILE` per-call via a
   `resolveClaimsFile()` helper (NOT a module-level `const` — that would
   require setting the env before import).
2. Override honored only when **(`NODE_ENV === "test" || VITEST` set)** AND
   the path is under `os.tmpdir()` (boundary-aware check, see above). A leaked
   env var from a shell export cannot redirect the live registry.
3. Test sets the env in `beforeEach` (NOT `beforeAll` — prevents leaking to
   sibling test files), clears in `afterEach`.

## Honest residuals (not closed by U-COORD02)

- **Sub-ms re-read -> rename race**: not a kernel mutex — two writers that
  both pass CAS in the same sub-millisecond window still last-writer-wins
  (neither errors, so nothing retries). Documented in the engine. For a
  registry mutated O(10x/min) by the chat fleet, acceptable; flock or
  fs.openSync exclusive-write would close it.
- **External direct writers bypass the CAS**: `.claude/helpers/zombie-reaper-
  daemon.mjs` does a bare `readFileSync`/`writeFileSync` round-trip on
  `ATOMIC_CLAIMS.json`. It preserves the `version` field via property-spread
  but doesn't bump it. Pre-existing seam — only engine-routed writers
  participate in the CAS.
- **`releaseClaim`/`updateClaimState` boolean return is ambiguous** across
  "not held" / "I/O error" / "CAS exhausted". Pre-existing (the old
  `try { atomicWrite } catch { return false }` was already lossy); making it
  a discriminated return is a public-API change and out of unit scope.
- **3 bare-swallow `atomicWrite` sites in `acquireClaim`** retain the
  pre-existing pattern. The new forensic `console.error` was added to
  `commitWithRetry` only — follow-up sweep would extend it.

## Scrutiny journey

Per-file 2-arm gate on the engine: PASS/PASS round 1 (3 P2 comment-honesty
refinements applied before the test was written). Per-file 2-arm gate on the
test: round 1 Arm A FAIL on a real coverage gap (`commitWithRetry` retry path
not exercised); fixed with 2 stubbed-`atomicWrite` retry tests + 1
non-stale-error test (kills the "drop the `instanceof` discrimination" mutant
Arm B identified). Round 2: PASS/PASS.

Universal 3-of-3 Stop gate: A PASS, B PASS, **C FAIL** with 3 blockers — two
overgraded (pre-existing weaknesses, A+B both cleared them) and one
**legitimate**: env-seam needed production gating. Addressed with the
NODE_ENV+VITEST+tmpdir guard. C re-review found the `startsWith` boundary
bug above. Fixed. C re-re-review: PASS.

R7 (surface conflicts, don't average) was load-bearing: A+B both passed
substance that C flagged as out-of-scope; mechanically deferring to C's FAIL
would have meant chasing a pre-existing weakness the unit didn't introduce.
Mechanically dismissing C would have left a real boundary bug shipped.

## Verify

```bash
cd H:/prism/mcp-server && node node_modules/vitest/vitest.mjs run \
  src/__tests__/AtomicClaimBrokerEngine-U-COORD02.test.ts   # 33/33
git -C H:/prism log --oneline -3 | grep U-COORD02            # 3 commits
git -C H:/prism show 4c1cb1775 --stat                        # boundary fix
```


## Related
[[engines/AtomicClaimBrokerEngine|AtomicClaimBrokerEngine]] • [[skills/src|/src]] • [[skills/engines|/engines]] • [[skills/data|/data]] • [[skills/milestones|/milestones]] • [[skills/corrupt|/corrupt]] • [[skills/tmp-evil|/tmp-evil]] • [[skills/foo|/foo]] • [[skills/tmp|/tmp]] • [[skills/etc|/etc]]