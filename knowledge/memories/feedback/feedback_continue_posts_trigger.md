---
name: "continue posts" trigger phrase
description: When user types "continue posts" (or "continue post"), route to PPG-WIRE-MS0 roadmap via the shared resume pointer file
type: feedback
originSessionId: b0b6f0bd-eab0-4bf3-b38f-1ce9d65168cf
---
When the user says **"continue posts"** (or "continue post") in any chat, this is the trigger phrase to resume the **PPG-WIRE-MS0** (Post Processor Generator — sidecar bridge + dialect branches) roadmap. Do not interpret "posts" literally as a substring search across all in-progress work.

**Why:** This phrase was registered 2026-04-30 by the user as a session-handoff shortcut. The full Sprint plan lives on the H: drive at `H:/prism/state/shared/RESUME_POSTS.md` — which any chat can read. The per-chat handoff at `H:/prism/state/shared/handoffs/HANDOFF-claude-<id>-ppg-wire-ms0.md` is the same content.

**How to apply:**
1. On hearing "continue posts" / "continue post", read `H:/prism/state/shared/RESUME_POSTS.md` BEFORE doing anything else.
2. Execute the Sprint 1 commit first (it's pre-staged but unshipped — see RESUME_POSTS.md §1).
3. Then proceed to MS5 dialect branches (U-PPGW11/12) and Sprint 2 block-by-block S/F.
4. Branch is `work/cam-exhaust-ms0`. Worktree is `H:/prism`.
5. Do NOT confuse with `intel-ollama-obsidian` roadmap (different milestone) — the user already saved a separate feedback memory about that misread.
