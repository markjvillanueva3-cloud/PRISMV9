---
name: reference_training_learning_ms0_u1_collision
description: "TRAINING-LEARNING-MS0/U1 wiring batch (4 dispatcher actions + 16 round-trip tests + .gitkeep) swept into peer's commit 5ae6f77c7 titled [ACP-MS0]/CLOSE-STATE-U01 — files correct + tracked, commit message understates scope"
aliases: reference_training_learning_ms0_u1_collision
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.975Z
---


2026-05-13 OBSIDIAN-PRISM-OS-MS0 slot CHARLIE (claude-06b8753f). After landing the engine + test (`82c608126` + `096271da8`) and the envelope + scanner (`cca61671f` + `543827b6c`), the final U1 wiring batch (turning dispatcher + cad dispatcher + schemas + 2 round-trip test files + .gitkeep) hit a stale `H:/prism/.git/index.lock` and "no changes added" cascade. Removing the lock revealed the 7 files were already in `5ae6f77c7` — peer commit titled `[MAIN] [ACP-MS0]/CLOSE-STATE-U01: flip P0-U01 envelope status + regen progress/state surfaces` — same shared-tree-commit-collision pattern as [[reference_blueprint_ocr_training_ms1_collision]].

**Files in `5ae6f77c7`** (verified via `git show --stat`):
- `mcp-server/src/tools/dispatchers/turningDispatcher.ts` (+50) — 3 actions wired + success-bridging P0 fix
- `mcp-server/src/schemas/turningActionSchemas.ts` (+48) — 3 dedicated Zod schemas
- `mcp-server/src/tools/dispatchers/cadDispatcher.ts` (+27) — `cad_lathe_template_place` case + enum entry
- `mcp-server/src/schemas/cadActionSchemas.ts` (+34) — dedicated `cadLatheTemplatePlaceSchema` (4 OSP-anchored families)
- `mcp-server/src/__tests__/turningDispatcher.training.test.ts` (+326) — 11 round-trip tests
- `mcp-server/src/__tests__/cadDispatcher.latheTemplatePlace.test.ts` (+180) — 5 round-trip tests
- `mcp-server/data/training/templates/lathe/.gitkeep` (+4)

**Source of truth** = the work itself + the milestone envelope at `mcp-server/data/milestones/TRAINING-LEARNING-MS0.json` (committed `cca61671f`). The peer's `[ACP-MS0]/CLOSE-STATE-U01` commit title is misleading — the per-file scrutiny gate fixes (turning success-bridging, cad schema narrowing, tightened test 4/5 assertions) all landed in the same commit but are NOT mentioned in the commit message.

**Do NOT re-create.** The files are tracked at the post-narrowing state (4-family OSP-anchored schema, success-bridging via `data.ok` discriminator, 16 round-trip tests passing). To inspect: `git show 5ae6f77c7 -- mcp-server/src/__tests__/turningDispatcher.training.test.ts`.

**Why it happened**: 6-chat shared `H:/prism` tree + git-anti-clobber + peer's commit landing while I was writing test files → peer's commit hook ran `git add -A`-equivalent and absorbed my staged + unstaged changes. The first `git commit -m` I issued returned "no changes added" because peer's commit had already moved them into HEAD.

**Companion to** [[reference_blueprint_ocr_training_ms1_collision]] [[feedback_conflict_fork_rule]] — same defect class; future U2+ for this milestone should fork to `H:/prism-training-learning` before writing files.

**Audit verification**: `git show 5ae6f77c7 --stat | grep -E "training|turning|cad"` returns all 7 files. Test pass-state: 16/16 in `npx vitest run src/__tests__/turningDispatcher.training.test.ts src/__tests__/cadDispatcher.latheTemplatePlace.test.ts`.
