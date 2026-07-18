# TOKEN-SAVINGS-PIVOT/U-PSN-NUDGE-R12-AUDIT — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-NUDGE-R12-AUDIT (slot:alpha iter7): fleet-wide R12 audit script — generalize iter5 fake-action check across all nudge-emitting hooks

**Commit:** `16ad46867dcb` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T13:59:27-05:00
**Tags:** token-savings-pivot, u-psn-nudge-r12-audit, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-NUDGE-R12-AUDIT (slot:alpha iter7): fleet-wide R12 audit script — generalize iter5 fake-action check across all nudge-emitting hooks

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-NUDGE-R12-AUDIT (slot:alpha iter7): fleet-wide R12 audit script — generalize iter5 fake-action check across all nudge-emitting hooks

iter5 caught ONE hook (ollama-pipeline-injector) shipping fake
`prism_intelligence:ollama_*` action references. ~30 other hooks in
.claude/hooks/ reference `prism_*:*` tokens. Without a fleet audit,
identical R12 bugs ship undetected.

scripts/audit-nudge-mcp-actions.mjs:
  • Pure exports: extractMcpActionRefs(content), findUnknownActions(
    refs, knownSet), auditHookDir(dir, knownSet)
  • Seeded KNOWN_REAL_MCP_ACTIONS (26 actions) curated from
    grep-verification of dispatcher source — NOT trust-from-memory.
  • CLI mode emits punch list (hook → unknown actions) for triage.
  • --json mode emits structured findings.
  • Exit 1 when any hook references an unknown action — CI-gateable.

First-run finding: 33 hooks reference 50+ distinct unknown actions.
Many are likely real (prism_memory:remember, prism_calc:thermal/
deflection/tool_life, prism_ai:deep_reason, etc.) — the seed set is
deliberately conservative; expansion happens action-by-action with
grep-verification. Some may be genuinely fake (e.g. mcp-route-suggest
referencing `prism_intelligence:ollama_` as a truncated namespace).

Punch list drives subsequent iters:
  • iter8 — expand KNOWN_REAL_MCP_ACTIONS via dispatcher source-grep
  • iter9 — re-audit; whatever remains is genuinely suspect
  • iter10+ — fix the genuinely-fake ones

Tests (14/14 pass, `node --test scripts/__tests__/audit-nudge-mcp-
actions.test.mjs`):
  • happy: single match, dedup, no-match → []
  • failure modes: null/undefined/non-string/empty input
  • adversarial: custom knownSet override, regex word-boundary
  • shape: KNOWN_REAL_MCP_ACTIONS non-empty + every entry well-shaped
  • regression: KNOWN_REAL deliberately omits the 7 iter5 fakes

Doctrine: the seed set is the canonical source for action existence.
Adding an entry requires grep-verification against mcp-server/src/
tools/dispatchers/. Trust the seed, not LLM memory.
```

## Files touched (3)
- scripts/__tests__/audit-nudge-mcp-actions.test.mjs | 120 +++++++++++++++
- scripts/audit-nudge-mcp-actions.mjs                | 166 +++++++++++++++++++++
- 2 files changed, 286 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 16ad46867dcb`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._