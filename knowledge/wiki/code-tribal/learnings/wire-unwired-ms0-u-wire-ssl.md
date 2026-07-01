# WIRE-UNWIRED-MS0/U-WIRE-SSL — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-SSL: wire SetupSheetLibraryEngine into prism_dev (3 read actions, engine-pair test already exists)

**Commit:** `4f7ed19feca8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T08:57:49-05:00
**Tags:** wire-unwired-ms0, u-wire-ssl, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-SSL: wire SetupSheetLibraryEngine into prism_dev (3 read actions, engine-pair test already exists)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-SSL: wire SetupSheetLibraryEngine into prism_dev (3 read actions, engine-pair test already exists)

Wires 3 pure-read setup-library accessors through prism_dev:
- ssl_find_setup     -> findSetup({part_number?, material?, workholding_type?, keyword?})
- ssl_get_setup      -> getSetup({setup_id})
- ssl_suggest_reuse  -> suggestReuse({material, approximate_size, features[]})

findSetup is a relevance-scored search (engine line 162-233) across
the singleton store with 4 optional filters; results sorted DESC by
score. suggestReuse is a heuristic match using feature tokens +
workholding-type rules + tool-count similarity (engine line 253-339);
results sorted DESC and capped at 10.

DEFERRED:
- saveSetup(input): mutates the singleton store. LLM-callable would
  let any chat overwrite existing setups (lookup by part_number+
  operation, engine line 126-131 updates in place) — peer chat data
  loss class.
- clear(): wipes the entire store. Peer data destruction.

DoS guards:
- part_number/material: 1-128 chars (optional)
- workholding_type: 1-64 chars (optional)
- keyword: 1-512 chars (optional)
- setup_id: 1-128 chars
- approximate_size.{x,y,z}: 0-10_000 each
- features: 0-64 items, each 1-128 chars

Note: engine-direct test (SetupSheetLibraryEngine.test.ts) already
exists under __tests__/shop-floor-intelligence.test.ts. This commit
adds ONLY the dispatcher round-trip layer.

Test seeding strategy: beforeAll uses engine-direct saveSetup() to
seed ONE well-known record (part_number='TEST-PROBE-ABC', captures
the returned setup_id). All subsequent dispatcher tests read against
this seeded record by id. No dispatcher write paths are exercised.

Test coverage: 17/17 vitest PASS (dispatcher only — engine pair exists):
- Zod schema validation (5 — find empty-ok + size+keyword caps /
  get_setup required + non-empty / suggest required-3-fields /
  approximate_size axis caps / features 64-cap)
- ssl_find_setup (3 — part_number echo+identity / keyword positive
  relevance / desc-sorted invariant)
- ssl_get_setup (3 — seeded id round-trip / unknown id with
  echo error string / routing proof)
- ssl_suggest_reuse (3 — prismatic+vise+'prismatic' reason fires /
  3-combo variability + 10-cap / desc-sorted invariant)
- error envelope (3 — missing setup_id / missing approximate_size /
  oversize keyword)

Engine line 244 echo-id-in-error pattern verified explicitly:
unknown id 'no-such-id-…' produces error 'Setup not found: <that id>'
(strict equality, not contains).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/dispatcher.setupSheetLibrary.test.ts | 255 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  26 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  36 ++-
- 3 files changed, 316 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- Note: engine-direct test (SetupSheetLibraryEngine.test.ts) already

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4f7ed19feca8`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._