---
name: feedback_commit_msg_backtick_substitution
description: git commit -m "...`backtick`..." in a DOUBLE-quoted bash string command-substitutes the backtick content (it runs as a shell command, output replaces it, errors to stderr) -- silently eating part of the commit message. Use single-quoted -m or `git commit -F -` heredoc for any message with backticks.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.420Z
aliases: feedback_commit_msg_backtick_substitution
---


**Gotcha (slot:bravo, 2026-06-14, hit live).** `git commit -m "...\`loop-state.mjs list\`..."` with DOUBLE quotes -> bash treats the backtick-wrapped text as command substitution: it tried to run `loop-state.mjs list` as a shell command ("command not found"), and the failed substitution replaced the phrase with EMPTY -> the commit body silently lost `live \`loop-state.mjs list\` reads` -> `live  reads`. The commit still succeeded; only the message was mangled.

**Why:** in bash, backticks inside `"double quotes"` are command substitution (same as `$(...)`). Markdown commit messages routinely use backticks for `code spans` -> they get eaten.

**How to apply (FLEET-WIDE, every chat writing commits via the Bash tool):**
- Prefer `git commit -F - <<'EOF' ... EOF` (single-quoted heredoc delimiter `'EOF'` = NO substitution of backticks/$/etc.) for any multi-line or backtick-containing message.
- OR use single-quoted `git commit -m '...'` (backticks literal inside single quotes).
- NEVER put backticks (or `$(`/`${`) in a double-quoted `-m "..."`.
- Sibling: the ascii-guard already blocks em-dashes in code; this is the bash-substitution analog for commit messages. Also note `git commit --amend -m 'rewrite'` is blocked by the worktree-route hook unless the subject matches a worktree or starts with [MAIN]/[MAIN-FORCE].
