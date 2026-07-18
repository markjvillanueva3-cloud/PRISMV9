# ZULU-BUILDLOOP/U-ZBL-C8-SOUL-EVOLUTION-ADVISOR — [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C8-SOUL-EVOLUTION-ADVISOR (slot:zulu, operator 'build for bravo'): ZuluSoulEvolutionAdvisorEngine -- outcome-based soul evolution (ADVISORY ONLY)

**Commit:** `1602f254ba7d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T20:04:13-05:00
**Tags:** zulu-buildloop, u-zbl-c8-soul-evolution-advisor, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C8-SOUL-EVOLUTION-ADVISOR (slot:zulu, operator 'build for bravo'): ZuluSoulEvolutionAdvisorEngine -- outcome-based soul evolution (ADVISORY ONLY)

## Body
```
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C8-SOUL-EVOLUTION-ADVISOR (slot:zulu, operator 'build for bravo'): ZuluSoulEvolutionAdvisorEngine -- outcome-based soul evolution (ADVISORY ONLY)

C8 -- the final unit of the hermes-zulu capability queue. PRISM slot souls are
static YAML amended only by manual operator edits, so the fleet routing table
drifts from reality as slots accumulate expertise. This engine reads C7
AttestationScores + the current soul and PROPOSES domain_filter amendments
(over-claimed -> remove_domain; proven-undeclared -> add_domain).

CRITICAL SAFETY -- the load-bearing property of this unit:
- ADVISORY ONLY. There is NO apply path in the engine. Every proposal carries
  operator_approval_required=true + auto_apply=false and is emitted to a durable
  append-only ledger (state/shared/soul-amendment-proposals.jsonl) for operator
  review; renderForChat() yields the human-readable AGENT_CHAT advisory the
  CALLER posts (the engine never auto-writes the shared bus).
- change_type enum is strictly {add_domain|remove_domain|flag_for_review} and
  target_field is ONLY domain_filter -- it CANNOT express a refuse_list / safety
  mutation. A soul amendment that removed a refuse_list entry would be a safety
  violation, so the type system forbids one.
- Defense-in-depth isSafeAmendment() DROPS (records as `refused`) any proposal
  whose domain matches a SAFETY_SENSITIVE pattern (safety/scrutiny/refuse/
  compliance/gate/physics/security/veto/authority) or collides with the soul's
  refuse_list -- a domain-affinity proposal can never nudge a slot off safety.
- Gated on C7 confidence in {moderate,high} AND sample_n >= minProposalN (20):
  thin evidence never churns a soul.

- ESM-pure: never imports C7 at runtime. The C7->C8 composition lives at the
  dispatcher (soul_evolution_propose awaits C7 attestAll, hands scores to C8).
- Append-only JSONL ledger (O_APPEND line append; fail-soft read skips malformed
  lines, never clobbers).
- Wired prism_session: soul_evolution_propose / soul_evolution_emit /
  soul_evolution_proposals_list. Actions 391->394.
- 22 tests (19 engine + 3 dispatcher round-trip incl full C7->C8 E2E + safety-
  refusal + no-apply-path assertion). esbuild-clean, 0 tsc errors in C8 files.
  Full Zulu suite 243/243.

DEDUP-verified NEW (Soul*/Advisor*/Evolution* engines exist but none proposes
soul amendments; no SoulAmendmentProposal/soul_evolution anywhere). R9 caught a
require()-in-ESM hazard pre-ship (proposeForSlot was calling C7 via require) ->
moved the composition to the dispatcher; and an instance-vs-static test call.

3-of-3 scrutiny PENDING (reviewer agents rate-limited, reset 8pm CT 2026-06-15);
C5+C6+C7+C8 batched for the next agent-available window before clearance.
```

## Files touched (5)
- mcp-server/src/__tests__/ZuluSoulEvolutionAdvisorEngine.dispatch.test.ts |  81 ++++++++++++++++++++++++++++
- mcp-server/src/__tests__/ZuluSoulEvolutionAdvisorEngine.test.ts          | 216 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ZuluSoulEvolutionAdvisorEngine.ts                 | 302 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts                    |  38 ++++++++++++++
- 4 files changed, 637 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1602f254ba7d`
- Milestone envelope: `mcp-server/data/milestones/ZULU-BUILDLOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._