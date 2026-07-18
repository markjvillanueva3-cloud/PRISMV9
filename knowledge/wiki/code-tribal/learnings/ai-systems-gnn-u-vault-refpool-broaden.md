# AI-SYSTEMS-GNN/U-VAULT-REFPOOL-BROADEN — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-VAULT-REFPOOL-BROADEN (slot:india): vault->GNN ref-pool extraction 10->16 confirmed wirings (+60%) + 2 false-label fixes

**Commit:** `07506609faae` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T22:30:34-05:00
**Tags:** ai-systems-gnn, u-vault-refpool-broaden, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-VAULT-REFPOOL-BROADEN (slot:india): vault->GNN ref-pool extraction 10->16 confirmed wirings (+60%) + 2 false-label fixes

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-VAULT-REFPOOL-BROADEN (slot:india): vault->GNN ref-pool extraction 10->16 confirmed wirings (+60%) + 2 false-label fixes

THE LEVER: vault-to-gnn-refpool mines CONFIRMED engine->dispatcher wirings from
the Obsidian vault into high-confidence (0.85) GNN reference-pool labels. Growing
this pool is the ONLY non-refuted lever for the india-owned PSN leg #10 (the
high-conf reference band collapsed 62->13). The extractor caught only 10 of 51
vault confirmed-wiring assertions -- a fixed `<Engine>{0,40}wired...prism_X`,
[A-Z]-anchored regex that missed (a) `<Engine> (long parenthetical) wired to
prism_X` and (b) camelCase-lowercase-first engine names.

CHANGE: rewrote extractConfirmedWirings to anchor on the wiring assertion
(wired/bound/registered + prism_X) and walk back to the nearest preceding
...Engine in the same sentence -- strictly safer than a blindly-wider gap: each
verb->dispatcher assertion is paired with ITS OWN nearest subject, never a
cross-pair.

VALIDATED on the live vault: 10 -> 16 confirmed wirings (+6, +60%), 0 conflicts,
all 16 manually validated correct (no false labels). The +6 are the
parenthetical/lowercase gains (QuoteCER/Tolerance/ABC/TargetCosting/QuoteToOrder/
WorkOrderSchedule etc.).

FALSE-LABEL GUARDS (R12 -- a wrong label poisons the GNN worse than no label;
caught by per-file 2-arm scrutiny, arm-A FAILed then both PASS):
  P1 clause cross-pair: bound the walk-back at ';' when the verb's clause has its
     own non-whitespace subject ("ZooEngine shipped; the actions wired in prism_X"
     no longer mis-labels ZooEngine); a whitespace-only "; wired" stays crossable.
  P1 parenthetical helper: mask (...) spans UNLESS the content is a bare-engine
     appositive ("(`PayrollLiabilityFilingEngine`)" kept; "(which calls
     HelperEngine)" masked). Recovered the real PayrollLiability label that an
     unconditional mask dropped.
  P2 nested-paren leak: a bare-engine span nested inside another paren is never
     the top-level subject -> masked.

20 tests (was 9), all R9-meaningful (each new test fails on revert to old code);
heap-reexec/CLI/exports untouched (zero blast-radius -- consumers import only the
pure heap helpers).

NEXT (durability follow-up): the --apply'd refs are wiped on regen-viz rebuild;
wiring vault-to-gnn-refpool into the regen augmentation pass (or a scheduled
re-apply) makes the grown pool durable.
```

## Files touched (3)
- scripts/vault-to-gnn-refpool.mjs      | 111 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--------------
- scripts/vault-to-gnn-refpool.test.mjs | 192 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 285 insertions(+), 18 deletions(-)

## Lessons surfaced in commit body
- wrong label poisons the GNN worse than no label;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 07506609faae`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._