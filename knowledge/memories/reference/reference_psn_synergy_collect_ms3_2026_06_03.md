---
name: reference_psn_synergy_collect_ms3_2026_06_03
description: PSN-SYNERGY-COLLECT-MS3 + gap-audit — five-leg out-edge honesty, per-file-binary, footer/self-name exclusion, ownerSlot routing, memories-dedup + the 9-bridge fleet gap plan
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.136Z
aliases: reference_psn_synergy_collect_ms3_2026_06_03
---


PSN-SYNERGY-COLLECT-MS3 + gap-audit (slot:alpha, 2026-06-03, branch cad-fusion-live-ms0). Continuation of the PSN measurement-honesty thread ([[reference_psn_synergy_obsidian_tribal_blindspot_2026_06_02]]) — made the cross-leg synergy metric honest in BOTH directions, then ran a Workflow to enumerate the real gaps.

**MS3 — five single-peer legs fixed** (`scripts/psn-synergy-collect.mjs`). algorithms/formulas/nn_gnn/prism_os/prism_ai each hardcoded exactly ONE cross_ref (`engines`) — the same single-pattern blind spot MS2 fixed for obsidian/wiki. Added `PSN_OUT_PATTERNS` (canonical "reference TO leg X" detector set) + `scanLegOutEdges` (file-list legs) + `scanDispatcherOutEdges` (dispatcher-source legs, engines overridden by precise MS1 lazy-import count). Commits: `b1bf46b3b1` (p0_critical 19→10).

**3-of-3 gate caught real R12 vanity I rationalized past** (arm-A FAIL on b1bf46b3b1 — the gate working as designed). Fixed in `d71daf0ab8` (PASS) + `f3de817393`:
- **memories false-positive**: bare `\breference_…|\bfeedback_…` matched control-theory identifiers in algorithm code (`reference_signal`, `feedback_gain`) → fabricated algorithms→memories=33. Tightened to require path/.md/`[[wikilink]]` → 33→2.
- **per-file BINARY presence** (`countPatternsInFiles opts.perFile`): raw match totals double/triple-counted one logical reference when overlapping regex alternatives hit one token (`system-viz/system-graph` 2×, `engines/FooEngine` 3×) AND multiplied uniform auto-gen template lines by file count. Binary = "N of M files in leg A reference leg B" breadth, immune to both. Default raw → MS2 byte-unchanged.
- **dropGeneratorPointers**: `Live graph: …system-graph.json` footer is stamped into every auto-gen formula stub — an INBOUND membership marker (system-viz indexes the formula), NOT an outbound ref. Stripped → formulas→system_viz 5000→0 (honest: formula docs don't conceptually reference system-viz).
- **dropSelfName**: a leg whose files ARE engines (nn_gnn=*Engine.ts) must not count its own class name → nn_gnn→engines 82→67.

**Lesson (NEW):** binary-per-file-presence is the honest connectivity weight for a multi-file leg; raw mention totals are inflatable by regex-alternative overlap, generator templates, and verbose files. An absolute count is a latent lie when file content is templated. Mirror of the MS1 scale-broken-densityFloor lesson.

**Gap-audit Workflow** (`wf_16fdc278-f24`, 7 agents / 6 axes, user-authorized "utilize workflow and parallel agents"). Deduped the Obsidian↔PSN surface → **9 bridges + 4 conflicts + 4 inefficiencies + 6 honest non-gaps**. Spec: `state/shared/specs/PSN-SYNERGY-GAP-AUDIT-2026-06-03.md` (+ .html). Critical path = india (#1 octopus `consensus_recall`+read-before-ask, #2 algorithms→nn_gnn/prism_ai citation — the 2 keystones flip the brain write-only→compounding + collapse 3/4 real zero-ref pairs). golf=doc hygiene, sierra=viz roost/digest, quebec=frontend panel. Broadcast to chat bus (chat-1780492536225).

**Alpha shipped** (`8f99466e75` + `0a65003aec`): **Bridge#7** `PSN_LEG_OWNER` map + `ownerSlot` column (leg-health auto-routes to owner slot — nn_gnn→india, system_viz→sierra, etc.); **Ineff#3** memories leg was reusing obsidian_brain's full-file scan verbatim (double-count) → now scans the standing subset separately (wiki:2226/engines:721/system_viz:300 vs obsidian's full numbers). Tests 22/22. **Alpha backlog:** conflicts#1 (wiki↔tribal 31.5% cached vs 0.8% live) + #4 (master MEMORY.md Last-synced stale) + wiki↔tribal NN backfill (23.8k edges).

**6 honest non-gaps (R12 — do NOT build):** algorithms↔{tribal,prism_os}, formulas↔prism_os, tribal↔prism_os, nn_gnn↔prism_os, prism_os↔prism_ai — pure-math primitives carry no shop-floor lore; OS routes to AI via dispatchers, never direct refs. Building these = fabricated wiring.

**Process lesson:** caught + undid a lane violation — `git add <my-files>` on the shared tree absorbed 5 PRE-STAGED peer files into my commit (the index already had charlie's quoting work staged). Fix: `git reset -q` to clear the index BEFORE staging only my paths, every commit. [[feedback_commit_to_slot_worktree]]. Lineage: [[reference_psn_synergy_collect_ms0_2026_05_23]] · [[feedback_psn_definition]] · [[feedback_crossroad_brainstorm_workflow]].
