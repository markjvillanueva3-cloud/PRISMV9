# AGENTIC-SUBSTRATE-BRIDGE/U-MEM-PROVIDER-REGISTRY-WIRE — [MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-MEM-PROVIDER-REGISTRY-WIRE (slot:bravo): take the orphan MemoryProvider framework live (registry + CLI, R15)

**Commit:** `51b0330b35b5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T11:25:43-05:00
**Tags:** agentic-substrate-bridge, u-mem-provider-registry-wire, auto-distilled

## Subject
[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-MEM-PROVIDER-REGISTRY-WIRE (slot:bravo): take the orphan MemoryProvider framework live (registry + CLI, R15)

## Body
```
[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-MEM-PROVIDER-REGISTRY-WIRE (slot:bravo): take the orphan MemoryProvider framework live (registry + CLI, R15)

Task #4 (orphan decision) -> KEEP + WIRE (not delete). The MemoryProvider ABC + 3
providers (U-MWO05, 2026-05-26, the Hermes-Memory-Guidebook plug-in surface) were a
VERIFIED orphan: real + 22/22 tests but ZERO live consumers (grep importers = only
transcripts). Deleting would lose the intended Hermes-memory seam; the honest move is
to give it the missing entry point + a live consumer.

Ships (git-tracked):
- memory-provider-registry.mjs -- discovery (buildRegistry/listProviders/getProvider) +
  aggregateStats. Conformance-gated (only full-ABC providers register; non-conformant
  RECORDED in skipped, R12). Fail-soft per provider (throwing stats -> error row, no NaN).
  The single seam future Hermes plug-ins (Reflexion/MemGPT/MemoryBank/...) drop into.
- memory-provider-status.mjs -- CLI consumer (pure formatStatusReport + IO half).
- combinedNote in the aggregate payload so JSON consumers see the naive-sum/double-count
  caveat without the text report (reviewer-B P2, R12).
Also on disk (gitignored, like settings.json): /memory-providers skill = operator surface
(addresses reviewer-B P1; a TS dispatcher can't import the .mjs registry per the harness
wall, so a skill is the correct surface).

13 R9 tests + 22/22 existing still green. LIVE: obsidian-feed 4325 / obsidian-receipt 4325
(shared source double-count the caveat flags) / prism-kg 0. 2/2 per-file scrutiny PASS
(both empirically reverted guards -> tests failed; R9 genuine). Framework no longer orphan.
```

## Files touched (5)
- scripts/memory-provider-status.mjs                         | 56 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/memory-provider-status.test.mjs                    | 43 +++++++++++++++++++++++++++++++++++++++++++
- scripts/memory-providers/memory-provider-registry.mjs      | 96 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/memory-providers/memory-provider-registry.test.mjs | 91 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 286 insertions(+)

## Lessons surfaced in commit body
- till green. LIVE: obsidian-feed 4325 / obsidian-receipt 4325

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 51b0330b35b5`
- Milestone envelope: `mcp-server/data/milestones/AGENTIC-SUBSTRATE-BRIDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._