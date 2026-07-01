---
source: project
section: BUILD DOCTRINE — read before any new engine / script / hook / registry / dispatcher action
slug: build-doctrine-read-before-any-new-engine-script-hook-regist
indexed_at: 2026-05-02T21:28:19.889Z
---

## BUILD DOCTRINE — read before any new engine / script / hook / registry / dispatcher action

PRISM has 3,046+ engines, 6,800+ actions, 414 hooks. Every "new" thing risks duplicating something that already exists. Future-Claude discipline:

1. **Check what we HAVE.** `state/shared/CLAUDE-BRIEF.md` (auto-injected above) lists: process priority, CAM status, JM fleet, AI hierarchy, knowledge bridges, gaps, hidden capabilities. **If it's already there, extend — don't duplicate.**
2. **Check what's BEING built.** `state/shared/PRISM-BUILD-CONTEXT.md` (auto-injected, regenerated hourly) lists: recent commits, active claims from peer chats, per-chat handoffs, roadmap top-5. **Respect peer claims — fork to your own worktree on conflict.**
3. **Check what we're TRYING to build.** `state/shared/PRISM-BUILD-VISION.md` lists per-component vision, gaps to maximum value, build doctrine. **If your proposal isn't in the vision section for that component, ASK whether it should be added to `mcp-server/scripts/build-vision-spec.json` first.** Don't ship features that aren't tracked as vision.
4. **Run duplication guard.** `duplicationGuardEngine.mustCheckBeforeCreating({assetType, proposedName, keywords, description})` — THROWS on duplicate. Use it.
5. **Check the dispatcher.** `mcp-server/data/docs/DISPATCHER_DIGEST.md` lists every action. If an existing dispatcher action solves your problem, use it — don't reinvent.
6. **Comprehensive build only.** Every new engine ships with: real tests (3+ failure modes, 2+ adversarial), dispatcher wiring (import + call + action enum + schema), round-trip E2E assertion. No stubs. No `toBeDefined()`. No deferrals unless the user explicitly scopes the work down.

If you can't trace your proposed work to (a) Mark's explicit ask, (b) a gap in CLAUDE-BRIEF.md, or (c) a vision feature in PRISM-BUILD-VISION.md not yet built — **stop and ask** before writing code.

To refresh all three auto-injected files: `/refresh-awareness` (slash command).
