# AI-SYNERGY-BRIDGE-WIKI/U-BRIDGE-WIKI-DENSE-FIX — [MAIN-FORCE] [AI-SYNERGY-BRIDGE-WIKI]/U-BRIDGE-WIKI-DENSE-FIX (slot:bravo): thread includeWiki through dense rerank + CAG fingerprint (3-of-3 scrutiny P1 fix)

**Commit:** `5ab3d82281ec` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T14:35:32-05:00
**Tags:** ai-synergy-bridge-wiki, u-bridge-wiki-dense-fix, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYNERGY-BRIDGE-WIKI]/U-BRIDGE-WIKI-DENSE-FIX (slot:bravo): thread includeWiki through dense rerank + CAG fingerprint (3-of-3 scrutiny P1 fix)

## Body
```
[MAIN-FORCE] [AI-SYNERGY-BRIDGE-WIKI]/U-BRIDGE-WIKI-DENSE-FIX (slot:bravo): thread includeWiki through dense rerank + CAG fingerprint (3-of-3 scrutiny P1 fix)

The 3-of-3 scrutiny on U-BRIDGE-WIKI (63bf1c9229) FAILED (arm C) on a real P1 my own
VALIDATE masked: assembleGalaxyContext added wiki to the corpus, but reasonForGalaxy's
DENSE rerank arm (default-ON for any query) re-gathered gatherGalaxyDocs WITHOUT
includeWiki and OVERWROTE context.retrieved -> wiki silently dropped on the live default
path (build-galaxy-ai-bridge-registry + every dense reasoning call). The CAG fingerprint
was likewise computed wiki-blind -> a wiki-body edit would not invalidate a cached answer.
My VALIDATE tested assembleGalaxyContext DIRECTLY (sparse-only), never the dense path --
exactly the R9 "tests the unit, not the integration" gap the gate exists to catch.

FIX (single root cause, R7 -- no two divergent copies of the gating decision):
  - New PURE export resolveWikiMode({optsIncludeWiki, env}) -- the SINGLE source of "does
    the reasoning path include wiki" (default ON, env opt-out PRISM_GALAXY_BRIDGE_WIKI=0,
    explicit opts wins).
  - assembleGalaxyContext, the dense rerank gather, AND the CAG fingerprint gather now ALL
    use it -> the prompt corpus == the dense corpus == the fingerprinted corpus.
  - cacheModel namespaced with +wiki so wiki-on/off answers never collide in the CAG store
    (same reason +dense is in the key); the fingerprint covers wiki BODY edits.
  - gatherGalaxyDocs's OWN default stays OFF (GNN node-feature consumer still unaffected).

TEST (R9): 39/39 (+2): resolveWikiMode default/opt-out/explicit-wins; and a corpus-parity
test pinning that the dense/fingerprint corpus (includeWiki=resolveWikiMode default) CONTAINS
wiki AND is wiki-body-edit-sensitive (so a stale cache invalidates).

VALIDATE (live, recovered Ollama): the dense/fingerprint corpus for hermes-zulu now carries
5 wiki entries (gnn-selective-deploy, psn-octopus-fleet-synergy-ms0, zulu-ledger-reconciler,
ai-synergy-audit-ms0, karpathy-agent-discipline); a live dense reasonForGalaxy run returns
ok=true degraded=false sources=[CLAUDE.md, retrieved-hybrid:5, ai-synergy-audit] -- dense
applied, wiki no longer dropped.
```

## Files touched (3)
- scripts/lib/galaxy-reasoning-bridge.mjs      | 26 ++++++++++++++++++++++----
- scripts/lib/galaxy-reasoning-bridge.test.mjs | 33 ++++++++++++++++++++++++++++++++-
- 2 files changed, 54 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- till unaffected).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5ab3d82281ec`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-BRIDGE-WIKI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._