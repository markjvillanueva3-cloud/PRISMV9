---
name: reference_blueprint_ocr_training_ms1_collision
description: "BLUEPRINT-OCR-TRAINING-MS1 spec + envelope shipped under wrong scope label in commit 847b8ec8b (multi-chat collision absorbed my stages into peer ALPHA's commit). Future audits should treat 847b8ec8b as a dual-scope commit."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.217Z
aliases: reference_blueprint_ocr_training_ms1_collision
---


**Date:** 2026-05-12 (slot BRAVO, claude-a7ea87ab session, MACRO-DOMAIN/TRAINING workstream after picking up claude-8f2683e8's handoff)

**What happened:** I staged 3 files for a clean `[CAD-FUSION-LIVE-MS0]/U-BLUEPRINT-OCR-SCOPE-MS1` commit (the spec doc + envelope + cross_links edit to MACRO-PROGRAM-PIPELINE-MS0.json). Peer ALPHA (claude-dccbe876) ran their own `git add` + `git commit` for `[INFRA-CONSENSUS-WIRE-MS0]/P0-U01: add consensus_decide action to prism_ai dispatcher` in the same shared tree at the same instant. Their commit landed first (HEAD moved 1b48ebcdd → 847b8ec8b) and **absorbed my staged set** — the lint-staged "could not find any staged files matching configured tasks" warning was the symptom; the ref-lock error was the visible failure.

**Files affected (all correct + tracked, just under wrong scope label):**
- `state/shared/specs/BLUEPRINT-OCR-TRAINING-MS1-2026-05-12.md` (55,666 bytes, 8 units, forge4-compliant spec)
- `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS1.json` (schemaVersion 4 envelope)
- `mcp-server/data/milestones/MACRO-PROGRAM-PIPELINE-MS0.json` (cross_links section added)

**Commit:** `847b8ec8b` on `cad-fusion-live-ms0` — title says `[INFRA-CONSENSUS-WIRE-MS0]/P0-U01: add consensus_decide action to prism_ai dispatcher + Zod schema`, but the diff also contains my BLUEPRINT-OCR-TRAINING-MS1 scoping work. **Two unrelated scopes in one commit.** No way to fix without reverting (destroys peer's consensus_decide work). Chat-bus post on 2026-05-12T19:36:34.113Z documents the collision for live coordination.

**Why:** I was in the main tree `H:/prism` (slot BRAVO) and so was ALPHA. The classic [[feedback_conflict_fork_rule]] failure mode — shared tree, two concurrent stagings, peer's commit lands first and absorbs the absent peer's staged set into theirs. Earlier in the session I had successfully forked off when the staged set was small and ALPHA was idle; once ALPHA started shipping (HOOK-AUDIT H1 → HOOK-CREATION-GATE H5 → INFRA-CONSENSUS-WIRE P0-U01 in rapid succession) the window for safe shared-tree commits closed.

**How to apply (future sessions):**
1. If you're auditing commit 847b8ec8b on `cad-fusion-live-ms0`, expect TWO scopes — the `consensus_decide` action work (peer's intent) AND the BLUEPRINT-OCR-TRAINING-MS1 scoping deliverable (mine). The spec doc + envelope are correct + complete.
2. **Do NOT** re-create BLUEPRINT-OCR-TRAINING-MS1 spec/envelope thinking they're missing — `git log` for those paths shows 847b8ec8b as the introducing commit even though the title doesn't mention them.
3. When BLUEPRINT-OCR-TRAINING-MS1/U1-U8 executes in a future session, **fork to `H:/prism-blueprint-ocr-training` worktree** at the start. The shared-tree absorption pattern bites worst when multiple chats are actively shipping; a fork eliminates it.
4. The spec doc itself (`state/shared/specs/BLUEPRINT-OCR-TRAINING-MS1-2026-05-12.md`) is the source of truth — it correctly identifies all 8 units, dep-oracle inventory, forge4 atomic-first compliance, and the cross-links to MACRO-PROGRAM-PIPELINE-MS0 + TRAINING-LEARNING-MS0.
5. Generalizable pattern: any forge4 scoping commit on a shared tree during active concurrent shipping is at risk; treat `/forge4 scope` as fork-tree-eligible work even though it's "just docs".

Related: [[feedback_conflict_fork_rule]] (the doctrine), [[feedback_no_git_stash_shared_tree.md]] (sibling failure mode), [[reference_reverse_merge_then_ff_only]] (how to land work cleanly when peers are active).


## Related
[[dispatchers/prism_ai|prism_ai]] • [[skills/shared|/shared]] • [[skills/specs|/specs]] • [[skills/data|/data]] • [[skills/milestones|/milestones]] • [[skills/prism|/prism]] • [[skills/envelope|/envelope]] • [[skills/prism-blueprint-ocr-training|/prism-blueprint-ocr-training]] • [[skills/forge|/forge]]