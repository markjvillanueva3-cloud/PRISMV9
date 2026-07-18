# OLLAMA-OFFLOAD/U-ZULU-ROUTE-MODEL-DOCDRIFT — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-DOCDRIFT (slot:zulu): fix JSDoc default-model drift (32b->1.5b) flagged by 2-of-2 scrutiny PASS

**Commit:** `e667e5d70215` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:02:09-05:00
**Tags:** ollama-offload, u-zulu-route-model-docdrift, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-DOCDRIFT (slot:zulu): fix JSDoc default-model drift (32b->1.5b) flagged by 2-of-2 scrutiny PASS

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-DOCDRIFT (slot:zulu): fix JSDoc default-model drift (32b->1.5b) flagged by 2-of-2 scrutiny PASS

Header JSDoc still named qwen2.5-coder:32b as the route default after U-ZULU-ROUTE-
MODEL-RESOLVE changed DEFAULT_ROUTE_MODEL to qwen2.5-coder:1.5b -- a P2 doc-drift
both reviewers flagged (runtime behavior was already correct + tested 42/42).
Updated the PRISM_OLLAMA_ROUTE_MODEL env note + the config-schema example, and
documented the resolveRouteModel retirement-fallback. Comment-only; node --check
clean. (Deferred P2: resolveHermesHome multi-profile pick is readdir-order-
dependent -- acceptable on the single-operator host; noted for any future multi-user box.)
```

## Files touched (2)
- .claude/hooks/ollama-route-pretooluse.mjs | 8 ++++++--
- 1 file changed, 6 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till named qwen2.5-coder:32b as the route default after U-ZULU-ROUTE-

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e667e5d70215`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._