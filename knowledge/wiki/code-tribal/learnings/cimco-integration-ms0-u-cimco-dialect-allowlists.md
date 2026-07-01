# CIMCO-INTEGRATION-MS0/U-CIMCO-DIALECT-ALLOWLISTS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-DIALECT-ALLOWLISTS (slot:echo): static post-proving — lint a generated post's G/M vocabulary vs codes JM actually used in its goldens

**Commit:** `ccfddd6fd54d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T09:34:36-05:00
**Tags:** cimco-integration-ms0, u-cimco-dialect-allowlists, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-DIALECT-ALLOWLISTS (slot:echo): static post-proving — lint a generated post's G/M vocabulary vs codes JM actually used in its goldens

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-DIALECT-ALLOWLISTS (slot:echo): static post-proving — lint a generated post's G/M vocabulary vs codes JM actually used in its goldens

The STATIC arm of post-proving that works OFFLINE today (no live CIMCO app): flag any G/M code a PRISM post emits that was never observed in JM's proven goldens for that controller dialect — before it reaches a machine.

DATA: state/shared/cimco/dialect-allowlists.json. BUILDER/LINT: scripts/cimco-dialect-allowlist.mjs (CLI build|summary|families|lint, fail-loud loader, 10 tests). WIRED: CimcoVerificationBridgeEngine.dialectAllowlist()+dialectLint() -> prism_cimco cimco_dialect_allowlist + cimco_dialect_lint (dispatcher 9->11, schema + enum + 2 switch cases).

FIRST BUILD: 706 goldens scanned -> 5 families: okuma-osp 224f/33G/23M, prism 388f/33G/23M (PRISM's own emitted posts already in corpus), hurco 35f/28G/25M, mastercam 6f/24G/9M, mitsubishi-edm 2f/9G/14M. Files bucketed by the SAME content-based detectDialect() the lint uses (builder/lint consistency).

HONEST FRAMING (R12): a WHITELIST OF OBSERVED codes, NOT a controller spec. A code absent from goldens is unobserved-in-JM-goldens (review), NOT invalid — surfaced for human/live-sim confirm, NEVER fails a post on its own. Comment-stripped extraction (G99 in a paren comment not counted); leading-zero normalized (G01->G1). Mined ONLY from JM's own goldens, never a copyrighted manual (echo refuses manual derivation).

FAIL-LOUD: loader throws on missing/corrupt; dialectLint on an unknown family returns hasAllowlist:false + explicit NOT-a-pass note (never silent green). Engine TS methods are faithful ports of the .mjs (detectDialect + extractCodes), parity-asserted in the engine test.

Tests: cimco-dialect-allowlist.test.mjs 10/10 (comment-safe extract, fixture build, lint REVIEW/pass/fail-loud-unknown-family, real-corpus integration) + bridge engine 38/38. tsc-clean (workspace tsc errors all pre-existing peer-domain drift, none in echo files).

Static proving path now complete offline: byte-equivalence-vs-golden (now honest) + dialect-allowlist lint. Live collision verdict still needs U-CIMCO-UIA-REPORT-READER (operator-gated). Wiki [[cimco-verification-simulation-integration]] + memory [[reference_cimco_dialect_allowlists_2026_06_03]].
```

## Files touched (9)
- .../architecture/cimco-verification-simulation-integration.md    |   9 +
- mcp-server/src/__tests__/CimcoVerificationBridgeEngine.test.ts   |  64 ++++
- .../src/engines/post-processor/CimcoVerificationBridgeEngine.ts  |  94 ++++++
- mcp-server/src/schemas/cimcoActionSchemas.ts                     |  20 ++
- mcp-server/src/tools/dispatchers/cimcoDispatcher.ts              |  13 +-
- scripts/cimco-dialect-allowlist.mjs                              | 201 +++++++++++
- scripts/cimco-dialect-allowlist.test.mjs                         | 137 ++++++++
- state/shared/cimco/dialect-allowlists.json                       | 518 +++++++++++++++++++++++++++++
- 8 files changed, 1055 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till needs U-CIMCO-UIA-REPORT-READER (operator-gated). Wiki [[cimco-verification-simulation-integration]] + memory [[reference_cimco_dialect_allowlists_2026_06_03]].

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ccfddd6fd54d`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._