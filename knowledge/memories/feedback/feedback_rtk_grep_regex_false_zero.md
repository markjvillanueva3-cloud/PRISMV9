---
name: feedback_rtk_grep_regex_false_zero
description: "rtk-bash `grep` with regex metachars (alternation a\\|b, brackets) silently returns \"0 matches\" — a false-zero. Use the Grep TOOL for any non-literal pattern."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.442Z
aliases: feedback_rtk_grep_regex_false_zero
---


`rtk grep` invoked through the Bash tool (which falls back to a direct `rg` exec because `rg` is not on PATH) **silently returns "0 matches" for patterns containing regex metacharacters** — alternation (`a\|b`), escaped brackets (`\[0.14\]`), escaped slashes — when the shell/rtk over- or under-escapes them. The command exits 0 and prints "0 matches", so it reads as a confident absence, not an error. This is a false-zero, not a real negative.

Hit **3 times in one session (2026-06-10, slot:hotel)**:
1. `rtk grep "SettingsPage\|path=\"settings\""` returned "0 matches" -> I wrongly concluded the Codex SettingsPage was an unrouted orphan and added a duplicate `const SettingsPage`/route to App.tsx. **tsc fail-loud caught it** (`Cannot redeclare block-scoped variable`) before commit (R12 worked); App.tsx reverted to baseline. The page was already imported (line 186) + routed at `/settings` (line 365).
2-3. Two Tailwind build-verify greps for `\.bg-accent\\/\\[0.14\\]` returned 0 — the classes WERE emitted; the escaped-brace/slash pattern just didn't match through rtk.

**Why:** rtk's `rg` fallback receives the pattern after bash has already processed (or failed to process) the backslash escapes, so the regex the engine sees is not the one intended. Literal-only patterns (`bg-accent`, `0.14`) work fine; metachar patterns silently mis-compile to no-match.

**How to apply:**
- For any search whose pattern contains `\|`, `[`, `(`, `{`, `\/`, alternation, or escapes -> **use the Grep TOOL** (ripgrep, reliable escaping) on the file/path, NOT `rtk grep` via Bash.
- Keep `rtk grep` via Bash for **literal substrings only**.
- **Never assert ABSENCE from a single `rtk grep` "0 matches"** — it is exactly the shallow-search false-negative §HONESTY-RULES warns against. Re-verify with the Grep tool (or `git grep` / a count) before concluding "X does not exist". See [[feedback_never_claim_absence_without_deep_search]] and [[feedback_verify_actual_contract_not_proxy]].
- The fail-safe that saved this one was **tsc** — when a false-zero leads to a duplicate symbol/import, the build catches it. Run `tsc --noEmit` before committing route/import edits.
