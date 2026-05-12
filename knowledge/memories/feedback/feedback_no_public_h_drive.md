---
name: Never share H: drive content publicly
description: HARD RULE — nothing from the H: drive (H:/prism and everything under it) may be shared, published, or distributed publicly. No public GitHub repos, no agentskills.io submissions, no posting H: paths/code/data to external APIs or sites.
type: feedback
originSessionId: 2570c8f5-c265-4815-ad1d-a3c4e3a5863b
---
**HARD RULE (set 2026-05-11, "for now"):** Do not share anything from the H: drive publicly.

This covers: pushing H:/prism (or any subtree) to a public git remote; `gh repo create --public` for anything sourced from H:; submitting H:-derived skills/plugins/code to agentskills.io or any public marketplace; posting H: file contents, paths, or data to public sites/APIs; including H: material in anything externally visible.

**Why:** The user said so explicitly and called it a hard rule. PRISM is proprietary; JM Die customer data, custom posts, internal roadmaps, and the codebase itself stay private. "For now" — the rule may lift later, but until the user explicitly clears a specific artifact for public release, treat everything under H: as private.

**How to apply:**
- Any task that would publish, export-for-public-distribution, or post H: content externally → STOP and ask for explicit per-artifact clearance.
- "Internal" distribution is fine: bundling skills for the user's own multi-machine / multi-chat use, writing to local `dist/`, sharing within the org.
- Roadmap units about "publish publicly" / "share publicly" / "submit to marketplace" must be rescoped to internal-only with a deferred public-release checklist, not removed (per the never-delete rule).
- When in doubt: it's private.
