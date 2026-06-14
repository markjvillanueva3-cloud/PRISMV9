---
name: reference-precompact-bare-node-enoent-2026-05-16
description: "/compact silently no-op'd precompact handoff write on portable-node — bare spawnSync(\"node\") ENOENT swallowed into \"(no output)\". Fixed precompact-handoff.mjs:419."
aliases: reference_precompact_bare_node_enoent_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.882Z
---


# precompact-handoff.mjs bare-"node" ENOENT regression (2026-05-16, slot bravo claude-339c8ff7)

**User report:** "i noticed the compact slash command doesn't kick off precompact anymore" — surfaced during the autonomous-chain test (`/checkin-bravo /loop ... keep going until natural compaction`).

**Root cause:** `precompact-handoff.mjs:419` spawned the per-agent-handoff writer with bare `spawnSync("node", [...])`. On a portable-node box `process.execPath`=`H:\Tools\nodejs\node.exe` resolves but `node` is **not on the PreCompact-hook child's PATH** → `ENOENT`, `stdout=undefined`. Parser: `(writeResult.stdout||"").trim()` → `""` → `if(out)` skipped → `JSON.parse` never runs → `catch` never fires → `writeMsg` frozen at its init literal `"(no output)"`. Hook still returns `{continue:true}` so `/compact` proceeds and the swallow hides the ENOENT — **every `/compact` on this machine silently failed to refresh the handoff RESUME** (observed: RESUME stale 65 min, pre-U3-U8).

**Why it hid so long:** the silent swallow. Classic Karpathy R12 fail-loud violation. The sibling test `precompact-hook-source.test.mjs:28` *already* documented this exact footgun (`// bare "node" is ENOENT on Windows from spawn`) and used `process.execPath` in its own harness — production code never applied the lesson. Line 337 (terminal resolver, which worked) also already used `process.execPath`.

**Fix (commit pending, slot bravo):**
- `precompact-handoff.mjs:419` `"node"` → `process.execPath` (the root cause; one token).
- Fail-loud result parser: surfaces `writeResult.error.code` as `SPAWN FAILED:` and the empty-stdout-no-error case as `writer emitted no stdout (status=,stderr=)` — never the silent `(no output)` again.
- 3 regression guards in `precompact-pad.test.mjs`. KEY: the guard **strips comments before the bare-`node` source assertion** — the fix's own WHY-comment legitimately mentions `spawnSync("node",...)`, and a comment-blind regex guard would false-positive (this is the AAM04 over-greedy-regex class — see CLAUDE.md Recent regressions 2026-05-16). Code-pattern guards must inspect code, not prose.

**Verified:** `node --check` OK · `precompact-pad.test.mjs` 16/16 · `precompact-hook-source.test.mjs` 10/10 (no collateral) · live repro spawns writer via execPath → `{"ok":true,"file":"...HANDOFF-..."}`.

**NOT affected (verified):** `runGit()` bare `"git"` at line 85 — git IS on the portable-node spawn PATH (`spawnSync("git",["--version"])` → status=0).

**Same-class latent bug flagged, NOT fixed (scope discipline):** `.claude/helpers/portability-setup.mjs:83` bare `spawnSync("node", [...])`. Different env (setup-time), but same footgun — fix if it ever misbehaves.

**Doctrine takeaway:** any hook that spawns a node child MUST use `process.execPath`, never bare `"node"` — portable-node setups don't carry `node` on the spawned child's PATH. Sister: [[reference_precompact_hook_autowrite_2026_05_15]] (the autowrite this bug silently defeated), [[reference_session_continuity_stack_2026_05_15]] (the chain this is part of), [[feedback_handoff_writers]] (precompact-hook is the strict exception that this bug nullified).
