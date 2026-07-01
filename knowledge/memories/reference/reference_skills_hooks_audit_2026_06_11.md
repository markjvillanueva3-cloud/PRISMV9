---
name: reference_skills_hooks_audit_2026_06_11
description: 2026-06-11 golf /goal — full skills+hooks audit (ultracode wf_cba6f0c3-d11, 18 agents, 532 skills/12 buckets). ~446 keep / ~12 functional disable-candidates + 92 generic-scaffold boilerplate. The synthesis FALSELY proposed an already-built hook as novel (HRH-NEW-1 CAG-inject) because its R8-verify agent was rate-limited -- recurrence of the 2026-06-09 lesson. 1 novel item built: advisory-decay keystone. Spec: state/shared/specs/SKILLS-HOOKS-AUDIT-2026-06-11.md.
type: reference
galaxy: fleet-hygiene
source: prism-memory
synced: 2026-06-27T20:30:47.204Z
aliases: reference_skills_hooks_audit_2026_06_11
---


# Skills + hooks audit (2026-06-11, slot:golf, /goal)

Operator /goal: inventory all C:/H: skills + container skills, keep/disable verdict each; determine high-ROI hooks + stop-combos to build/wire; read prior X articles. Executed via ultracode Workflow `wf_cba6f0c3-d11` (18 agents, 1.34M subagent tokens, 12 buckets) + golf independent R8. Deliverable: `state/shared/specs/SKILLS-HOOKS-AUDIT-2026-06-11.md`.

## Skills (532 evaluated)
- Trees: C: user ~402, H: project 742, archived 125, container/plugin SKILL.md ~326 (octo 53, python-dev 16, superpowers 14, figma 9...). `H:/prism/skills/` = empty stub.
- ~446 KEEP / ~12 high-confidence functional disable-candidates (stub desc + no `name:` + no triggers + zero usage + superseded) + generic-scaffold bucket (92 claude-flow/sparc/swarm/github boilerplate, keep:0, most already archived). 104 NATO wrappers + 130 per-slot pipeline variants = KEEP-exempt (auto-generated).
- Disable list is ADVISORY (`mustHumanVerify`) -- per-skill disk verification required before archiving (the synthesis got a hook claim wrong, so trust nothing un-verified). Soft-disable only (archive, never delete).
- **VERIFIED COUPLING (2026-06-11, why NOT to bulk-archive):** disk-verified the "clearest" candidate `lathe-masterpost` -- it IS a stub (`description: /lathe-masterpost`, 0 triggers) and `lathe-master-post` IS the live superseder (v1.0.0, full frontmatter). BUT `lathe-masterpost` is referenced by `.claude/commands/lathe.md` (a live sibling). Archiving it would leave a dangling ref -> a clean disable needs a COMPANION edit to lathe.md, and that is the lathe domain (whiskey/india lane), not golf's to unilaterally rewrite. Conclusion: the disable list needs per-skill companion-edit handling + domain-owner coordination, NOT bulk golf archiving. The advisory framing is correct.

## Hooks -- the recurring R8 lesson (R12)
The workflow's dedicated `hook:propose`+`hook:r8-verify` agents FAILED (rate-limited). The synthesis agent reconstructed 3 proposals WITHOUT the adversarial R8 pass and **falsely proposed HRH-NEW-1 (CAG cold/hot inject hook) as novel ("Glob -> No files found")** -- but `.claude/hooks/cag-router-inject.mjs` is built+wired+FIRING in-session. Golf disk-verified each:
- **HRH-NEW-1 CAG-inject: REJECTED** (already built+wired+firing).
- **HRH-NEW-2 regression-lock enforcement: novel** but `.claude/hooks/*.mjs` firewall-gated for golf.
- **HRH-NEW-3 write-time per-file tsc: REJECTED with measurement evidence (2026-06-11).** Measured: warm incremental `tsc --noEmit` on mcp-server = **12s** (async-only, can't block a write) AND **648 pre-existing baseline TS errors** -> a raw per-write tsc surfaces all 648 every run, drowning the new error. To be useful it must baseline-DIFF, which is exactly what the existing `.claude/hooks/tsc-baseline-regression-gate.mjs` already does -> HRH-NEW-3 would largely DUPLICATE it (only delta = PostToolUse:Write timing). Clean improvement = optionally extend that existing hook's trigger (owner-side), NOT a new golf keystone. (Same R8 don't-build-a-duplicate catch as HRH-NEW-1, here caught by measurement.)
**LESSON (recurrence of [[reference_goal_crosssurface_queue_2026_06_09]]):** an agent/synthesis-built hook queue does NOT reliably R8-check existing assets -- ALWAYS disk-verify each "novel" claim before building. A rate-limited verify-agent silently degrades the queue to unverified.

## Shipped this /goal
**Advisory-decay keystone** (the one golf personally R8-verified): `scripts/lib/route-suggest-decay.mjs` consumes `audit-mcp-route-takerate.mjs`'s `suppress` verdict to mute proven-noise classifiers. 16/16 tests; live suppress-set = `doctrineSurface`+`backendAuditChain` = ~81% of 10473 route-suggest fires. Commit `e7fb25bb8a`. The 2-line hook splice is firewall-gated -> patch `state/shared/specs/route-suggest-decay-splice-patch.md` routed to bravo. See [[reference_route_suggest_decay_gap_confirmed_2026_06_11]].

**Why:** records the audit result + the high-confidence disable list + the standing R8-on-agent-queues lesson (now hit twice). **How to apply:** before building any item from an agent-produced hook/skill queue, disk-verify it isn't already built; treat the disable list as advisory. Next golf-buildable items: HRH-NEW-2/HRH-NEW-3 keystones (scripts/lib/ logic + firewall-gated splice patches). Related: [[reference_route_suggest_decay_gap_confirmed_2026_06_11]], [[reference_goal_crosssurface_queue_2026_06_09]], [[feedback_primary_backend_builders_no_galaxy_gate_block]].
