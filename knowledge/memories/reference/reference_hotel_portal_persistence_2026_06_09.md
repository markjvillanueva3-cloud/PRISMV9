---
name: reference_hotel_portal_persistence_2026_06_09
description: "CustomerPortalEngine migrated from 4 in-memory Maps to a SQLite WAL store (durable across MCP restart) + two reusable migration lessons - (1) tests that mutate a returned object to reach into engine state break on a DB migration and must re-assert persisted state, (2) a new SQLite store needs its .db/-wal/-shm gitignored in the SAME commit or PII/tokens leak into VCS."
type: reference
slot: hotel
galaxy: business
source: prism-memory
synced: 2026-06-27T20:30:46.612Z
aliases: reference_hotel_portal_persistence_2026_06_09
---


# Hotel portal persistence + two migration lessons (2026-06-09, slot:hotel)

**Commits:** `dd57b82b52` (engine + tests) + `17f3e0ffec` (gitignore scrutiny-fix). 3-of-3 PASS.
**Files:** `mcp-server/src/engines/CustomerPortalEngine.ts` (rewrite), `mcp-server/src/__tests__/CustomerPortalEngine.persistence.test.ts` (new, 20), `portal-milestone-engines.test.ts` (2 fixed). 92/92 green.

## What shipped
`CustomerPortalEngine`'s 4 durable record types (tokens, messages, quality docs, service cases)
lived ONLY in process-memory `Map`s and evaporated on every MCP-server restart -- a customer's
access token / message thread / FAI+CoC docs / open service cases all gone on each redeploy.
Folded a SQLite WAL backing store directly INTO the engine (no separate `*StoreEngine` file --
that name would trip `duplication-hard-block` at 85% similarity to `CustomerPortalEngine`), modeled
on juliett's `CoordinationStoreEngine` (lazy `ensureOpen`, prepared statements, `synchronous=NORMAL`,
`busy_timeout=5s`, `schema_version` in `meta`). `rateBuckets` stays a transient `Map` ON PURPOSE --
a per-minute rate window MUST reset on restart; persisting it would be the bug. All public method
signatures byte-identical -> `routes/portal.ts` + `businessDispatcher` consume the singleton
unchanged (transparent, no new dispatcher action). Singleton path = `:memory:` under vitest else
`state/shared/customer-portal.db` (`PRISM_PORTAL_DB_PATH` override). No migration -- data was
Map-only, nothing on disk to carry.

## LESSON 1 (reusable) -- in-memory->DB migration breaks reference-aliasing tests
Two sibling tests asserted on the OBJECT returned by `createToken`/`validateToken` as if it were a
live handle into engine state (the old Map stored+returned the SAME object, so `(token).expires_at =
past` reached into the store, and `validateToken` mutating `pt.access_count` mutated the caller's
copy). With a DB the returned object is a SNAPSHOT -- those tests fail. The fix is NOT to weaken them:
re-express the SAME intent against the persisted contract -- expiry via `vi.useFakeTimers()` (genuinely
age the clock past the stored `expires_at`), access-stats via a store RE-READ (`listTokens()[0]`). The
rewrite is STRONGER (proves persistence, not local mutation). Any Map->DB migration should expect this
class of breakage. Pairs with [[feedback_verify_actual_contract_not_proxy]] + R8 (don't reach into
internal state).

## LESSON 2 (reusable, scrutiny arm-C P1) -- gitignore a new SQLite store in the SAME commit
A new `state/shared/<name>.db` store is NOT covered by any generic `*.db` rule (the repo gitignores
each db EXPLICITLY -- `.gitignore` had per-line entries for `coordination.db`/`-wal`/`-shm` only). The
first time the engine runs outside vitest, three untracked files appear and any slot's `git add -A`
tracks a BINARY db holding customer PII + access tokens -- a VCS leak of exactly the hotel-soul-forbidden
data. ALWAYS add the 3-line ignore block (`.db`, `.db-wal`, `.db-shm`) for a new store in the build's
own commit; verify with `git check-ignore -v <db>`. (Latent: coordination.db's sidecars WERE ignored;
only the new store's were missing.)

Related: [[reference_hotel_false_wire_guard_2026_06_09]] - [[feedback_verify_actual_contract_not_proxy]] - [[feedback_wire_test_validate_all_galaxies]].
