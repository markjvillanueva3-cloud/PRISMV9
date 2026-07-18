# QUOTING-SYNERGY-MS0/U-QP-ADAPTIVE-PERSIST — [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-ADAPTIVE-PERSIST (slot:charlie): durable Bayesian shop-rate posteriors + quote-time read (G5)

**Commit:** `ba9631271f4d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T14:34:16-05:00
**Tags:** quoting-synergy-ms0, u-qp-adaptive-persist, auto-distilled

## Subject
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-ADAPTIVE-PERSIST (slot:charlie): durable Bayesian shop-rate posteriors + quote-time read (G5)

## Body
```
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-ADAPTIVE-PERSIST (slot:charlie): durable Bayesian shop-rate posteriors + quote-time read (G5)

AdaptiveShopRateEngine held its conjugate-Gaussian posteriors + outcome ledger
IN-MEMORY ONLY -> they vanished on restart (G5), and the quote path never read
them. The Bayesian self-calibration delivered ZERO production value. This closes
both halves.

PERSISTENCE (the core): schema-versioned JSON state (state/shared/quoting/
adaptive-shop-rate-state.json), lazy-load on first access + auto-persist on
recordOutcome/adaptShopRate. Atomic (tmp-<pid> + rename), fail-soft both ways
(corrupt/missing/schema-mismatch -> start fresh, never throws at read; write
failure -> console.error + tmp-orphan cleanup, never throws into a mutation).
reset()=clean slate (no reload); configureStatePath()=switch shop/test-isolate.

QUOTE-TIME READ: InstantQuoteEngine reads getPrior(machine.id); when a learned
posterior exists (n_observations>0), prior.mu (the self-tuned rate) beats the
static catalog rate; "AdaptiveShopRateEngine" recorded only when applied.

HONEST SCOPE (R12): the read keys on ShopConfig ids (VMC-01); adaptShopRate
bootstraps priors from MachineRateDatabase ids (vmc_tier2). So for a ShopConfig
machine the read is DORMANT (correctly falls back to catalog) until outcomes are
recorded against the ShopConfig id AND the engine can seed a prior for a non-DB
id -- a HOTEL-domain follow-up (id-namespace reconciliation). Documented in
comment + test name + test docstring; the consumer is correct IF a prior exists.

29 tests: persistence round-trip (outcomes + posterior survive restart), corrupt
+ schema-mismatch + write-failure fail-soft, dormant-consumer. The existing
hotel AdaptiveShopRateEngine.test.ts (23) was made HERMETIC (temp-path config)
since my auto-persist made recordOutcome write to disk -- no production-state
pollution. 2-reviewer per-file gate PASS x2 (persistence + integration/scope),
P1s FIXED (persist-failure test + tmp-orphan cleanup). tsc-clean.
```

## Files touched (5)
- mcp-server/src/__tests__/AdaptiveShopRateEngine.test.ts  |  14 ++++++++--
- mcp-server/src/__tests__/AdaptiveShopRatePersist.test.ts | 112 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/AdaptiveShopRateEngine.ts         |  76 +++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/InstantQuoteEngine.ts             |  16 ++++++++++-
- 4 files changed, 215 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- til outcomes are

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ba9631271f4d`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._