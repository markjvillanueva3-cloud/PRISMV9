---
name: feedback-all-slots-free-access
description: Any chat slot has free access to settings.json edits + slot-worktree merges to main — do not defer to golf as a gate.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.397Z
aliases: feedback_all_slots_free_access
---


All chat slots have free access to do the things I previously gated behind golf:

- **Edit `H:/.claude/settings.json` + `C:/Users/wompu/.claude/settings.json`** (hook wiring, env vars, permission lists)
- **Merge slot worktrees into `cad-fusion-live-ms0`** (the shared main branch — integrator privilege is not golf-only)
- **Run install scripts that register Windows scheduled tasks** (no golf gate)
- **Wire new hooks into the SessionStart / UserPromptSubmit / Stop chains**

**Why:** 2026-05-27 operator directive: *"take out golf can only do those things, all chat slots have free access now."* Said in response to my deferring three concrete next-steps to "golf territory / golf integrator." That gating was incorrect — golf's special role is the [[reference_fleet_reaper|fleet-reaper]] + hygiene cadence (CLAUDE.md §GOLF SLOT) and the write-allowlist that *restricts golf itself* (`golf-slot-write-allowlist.mjs` HARD BLOCKS golf writes outside its allowlist). Golf is the *constrained* slot, not the *privileged* one. Other slots have full write access subject only to their own slot-worktree commit lane.

**How to apply:**
1. Don't defer settings.json wiring to "golf territory" — wire it directly, mirror runs C:→H: automatically.
2. Don't defer slot/victor (or any slot/<nato>) merges to "golf integrator" — any slot can merge once its work passes scrutiny.
3. If a hook genuinely needs to fire under specific conditions only (e.g. cron-task installs require an elevated PowerShell prompt), that's a *privilege* gate not a *slot* gate — operator handles that, not "golf."
4. Golf is still authoritative for [[reference_fleet_reaper|fleet-reaper]], hygiene cadence, and the integrator workflow that batch-merges multiple slots — but other slots opening their own merge windows is allowed.
5. **Shared-state files in the main tree ARE included** (operator directive 2026-05-30 reaffirm: *"each chat galaxy has permission to add to the main tree"*): a galaxy/slot chat may write top-level `CLAUDE.md`, `state/shared/*.{json,md}`, milestone envelopes, `.mcp.json`, and `.claude/{settings.json,hooks/*.mjs}` directly to the main tree `H:/prism`. **Firewall now TWO-TIER (relaxed 2026-05-31, commit U-CROSS-WORKTREE-TIER):** `.claude/hooks/hook-cross-worktree-block.mjs` ADVISES (warn+allow, `decision:"advise"`) for DOC/coordination shared-state — `CLAUDE.md`/AGENTS/CODEX/GEMINI.md, `state/shared/*.{json,md}`, milestone envelopes, `mcp-server/data/state/[A-Z_]+.json`, roadmap — so a worktree chat may Edit-tool-write these to the main tree directly (it just emits a drift advisory). It STILL HARD-BLOCKS harness-exec files (`.claude/settings.json`, `.claude/hooks/*.mjs`, `.mcp.json`) where silent drift changes which hooks fire fleet-wide — for those, write from the main tree or use `PRISM_CROSS_WORKTREE_BYPASS=1` (logged). Re-arm the old blanket block fleet-wide with `PRISM_CROSS_WORKTREE_HARD=1`. **Residual (accepted):** advisory-tier writes from a worktree can last-writer-win a doc file at merge — `commit-ownership-guard` + the 3-of-3 scrutiny gate are the backstops, not a hard guarantee; read fresh + re-stage if a peer just committed. Never silently skip a doc-reflection surface. `main-tree-write-block.mjs` (the sibling) already fails-open for chats on the shared `cad-fusion-live-ms0` branch (only `slot/*`-branch chats hit it).

Related: [[feedback_golf_owns_reaper]] (golf's specific role is the reaper, not all gating), [[feedback_commit_to_slot_worktree]] (still applies — every slot commits in its own worktree).
