---
name: feedback_slots_never_idle_always_hunt
description: "FLEET RULE (operator 2026-06-18) -- a chat slot NEVER idles. When its current work is done it HUNTS down the ladder: leftover/queue/roadmap -> fixes -> wirings -> ghost builds -> ghost wirings -> backlog -> (any-domain for the 9) -> ULTIMATE: read ALL transcripts+chats and reconcile vs the current build. Idle is valid ONLY when every rung is dry AND budget is RED."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.445Z
aliases: feedback_slots_never_idle_always_hunt
---


# FLEET RULE: slots NEVER idle -- ALWAYS hunt for work (operator 2026-06-18)

**Verbatim operator directive:** *"make it a rule that all chat slots never idle, they must always hunt for work, fixes, wirings, ghost builds, ghost wirings, or backlog work. ultimate fall back is each chat slot reads ALL transcripts and chats to ensure we built everything we needed to but need to compare and assess to current build to ensure it syncs well with current build."*

**Why:** the operator's standing value is anti-idle -- a chat with budget must keep delivering. This STRENGTHENS [[feedback_loop_exhaustion_domain_fallback]] (never idle-stop) and [[feedback_any_domain_fallback_slots]] (the 9 any-domain slots) by (a) adding an explicit HUNT TAXONOMY beyond "next roadmap unit", and (b) adding the ULTIMATE transcript+chat reconciliation fallback. Sibling of [[feedback_do_optional_high_roi_work]] (do the high-ROI work you can see). "Idle" is NOT an acceptable end-state.

## The HUNT LADDER (descend only when the rung above is dry; PREFER own domain first)
0. **Finish in-flight work first** (anti-drift) -- never abandon a unit mid-build to start hunting.
1. **Own-domain leftover/deferred** -- this + prior sessions' deferred P2s, the slot's HANDOFF / DELTA / MASTER-CONTEXT open-threads, `state/shared/handoffs/consolidated/<slot>.md`.
2. **Slot-task / priority queue + backlogged roadmaps** -- `node .claude/helpers/loop-state.mjs next --session <sid>` (resolves resume -> own-handoff RESUME -> own-lane -> fleet-fallback), `pick-unit --slot <slot>`, `PRISM-UNIFIED-ROADMAP-v2.md`, `state/shared/specs/ROADMAP-CONSOLIDATED.{json,md}` (the master remaining-work set), `mcp-server/data/roadmap-index.json`.
3. **FIXES** -- failing tests (`npx vitest run`; `stop_on_failing_tests` debt), tsc errors (build-quality campaign, `rtk tsc`), the CLAUDE.md `## Recent regressions` debt, bug-hunting (`regression-hunter` / `bug-hunting` galaxy silent-no-op + route-verify).
4. **WIRINGS** -- unwired engine -> dispatcher: `node scripts/audit-unwired-engines.mjs`, `state/shared/BUILD_STATE.md` NEEDS_WIRING set, `stop_on_unwired_assets` (the no-orphans gate), the `wiring` galaxy closure work.
5. **GHOST BUILDS / GHOST WIRINGS** -- /system-viz ghost roosts (`ghost.unwired-engine`, `ghost.misc_tasks`, `ghost.bridge_synergy`) render every remaining unit; `prism_session:master_index_query` + `/system-viz find`. Build the unbuilt, wire the unwired.
6. **BACKLOG / any-domain (the 9 slots only)** -- MISC-TASKS-INVENTORY (`state/shared/specs/MISC-TASKS-INVENTORY.{json,md}`, 318 orphaned tasks across 912 transcripts + 504 handoffs). The 9 any-domain slots (alpha, bravo, golf, sierra, zulu, india, papa, romeo, xray) EXPAND to ANY domain's units here; the other 17 stay in-specialty ([[feedback_any_domain_fallback_slots]]).
7. **ULTIMATE FALLBACK -- transcript + chat reconciliation vs current build.** When every rung above is dry: read ALL transcripts + chats to confirm everything promised/needed was actually built, then COMPARE + ASSESS against the CURRENT build so it syncs. **Use the EXISTING miners -- do NOT read raw transcripts into Claude context (token discipline, R5/Ollama-first):**
   - Run `node scripts/mine-galaxy-transcripts.mjs <galaxy>` (registry-driven Ollama miner, all 34 galaxies) / `mine-india-transcripts.mjs` -> Obsidian vault synthesis of promised-vs-shipped.
   - Read the already-mined `MISC-TASKS-INVENTORY` (912 transcripts + 504 handoffs) + `ROADMAP-CONSOLIDATED` -- the orphaned/promised set is ALREADY extracted; reconcile it, do not re-extract.
   - Reconcile that promised set against the CURRENT build: `BUILD_STATE.md` (built/needs-wiring/pending/frontend), `ENGINE_DIGEST.md`, `DISPATCHER_DIGEST.md`, /system-viz. Surface gaps (built-but-unwired, promised-but-unbuilt, drifted-from-current) -> then BUILD/WIRE them (back to rung 3-5 with the new gap list).

## When is idle valid?
ONLY when rungs 1-7 are ALL genuinely dry (own queue + fixes + wirings + ghosts + backlog + reconciliation surface nothing actionable) AND budget is RED. Otherwise: PICK THE NEXT ITEM AND BUILD. A spiral (R6 -- quality degrading / same failure looping) is the only other stop signal; context growth is NOT.

## How it is enforced / surfaced (already wired -- this rule canonizes + extends)
- Auto-advance: `stop-goal-clear-advance.mjs` (Stop) + `loop-state.mjs next` already advance on loop/goal completion ([[feedback_loop_exhaustion_domain_fallback]]).
- Any-domain notice: `slot-domain-awareness-inject.mjs` (UserPromptSubmit) surfaces the `ANY_DOMAIN_SLOTS:` marker fleet-wide.
- This rule's source of truth: this memory (auto-fed to Obsidian, surfaced in the per-prompt memory pre-search) + the root `H:/prism/CLAUDE.md` universal-rails pointer + the `## NEVER-IDLE HUNT LADDER` section in `state/shared/CHAT-SLOT-DOMAINS.md`.

Siblings: [[feedback_loop_exhaustion_domain_fallback]] · [[feedback_any_domain_fallback_slots]] · [[feedback_do_optional_high_roi_work]] · [[feedback_always_build]] · [[feedback_context_growth_not_a_stop_signal]].
