---
name: feedback_always_close_out
description: "Standing rule (2026-05-12) — never defer to follow-up; close out EVERY task of a unit before stopping, including doc-sync, memory/tribal-index sync, and pre-existing follow-ups surfaced during the work."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:07.904Z
aliases: feedback_always_close_out
---


When the user asks for a unit / task, finish ALL of it before reporting done — not just the core code. That includes: the doc-sync long tail (CLAUDE.md, hook block messages, script docblocks, PRISM-side `memory.db` entries, tribal-embed-index, wiki pages), the test/wiring/coverage floor, AND any pre-existing follow-up items that surfaced while doing the work (e.g. reviewer-flagged "not a blocker, pre-existing" notes) — close those too, in the same pass.

**Why:** the user said verbatim "always close out from now on" after I'd left 3 items deferred at the end of the INFRA-SCRUTINY-FIX unit (PRISM memory.db entries still saying the old "Codex + Gemini + Opus", a test not in the vitest CI glob, an inert hook fallback, a cosmetic error message). "Mostly done + here's what I deferred + want me to do it?" is not acceptable as a stopping point.

**How to apply:** treat "deferred to follow-up" as banned unless the user explicitly writes `[SCOPED]` or otherwise scopes the work down. Before saying "done", run a closeout sweep: (1) every file the change *implies* a doc update to — is it updated? (2) every test/wire/schema the new asset needs — present? (3) every "pre-existing" thing a reviewer or I noticed in passing — closed or explicitly out-of-scope-with-reason? Only then report. If a closeout item is genuinely blocked (e.g. infra unavailable, critical memory pressure makes a heavy step unsafe), say so explicitly and name the blocker — don't silently drop it. Extends [[feedback_always_build]] (which is about building every identified *engine*) to the whole long tail. Related: the comprehensive-build UserPromptSubmit injection.


## Related
[[skills/wiring|/wiring]] • [[skills/coverage|/coverage]] • [[skills/wire|/wire]] • [[skills/schema|/schema]]