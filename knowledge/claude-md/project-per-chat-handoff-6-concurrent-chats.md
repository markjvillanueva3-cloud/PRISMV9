---
schema_version: 1.0.0
source: project
section: PER-CHAT HANDOFF (6 CONCURRENT CHATS)
slug: per-chat-handoff-6-concurrent-chats
start_line: 31
end_line: 60
indexed_at: 2026-05-05T13:49:55.466Z
content_hash: 28f4af00ea31ae5da25154723644127a7b0250df0598722e5171f1186df2557a
mirror_engine: ClaudeMdChunkerEngine
---
## PER-CHAT HANDOFF (6 CONCURRENT CHATS)
We run ~6 concurrent Claude sessions. Each has its OWN handoff — **never write to `state/HANDOFF.md` (legacy singular)**.

```bash
# WRITE (e.g. at /handoff or /compact):
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
node H:/prism/.claude/helpers/per-agent-handoff.mjs write --terminal "$STABLE" \
  --resume "<next-action directive>" --state "<markdown body>"

# READ (e.g. at /startup Step 1B):
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
node H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal "$STABLE"
```

Canonical storage: `state/shared/handoffs/HANDOFF-<instance>-<topic>.md` — one per chat, **topic suffix mandatory**. Precompact hook (`helpers/precompact-handoff.mjs`) writes automatically on `/compact`. `/startup` reads this chat's handoff via the helper.

### Topic naming (enforced by `enforce-handoff-topic.mjs` Stop hook)
The topic is derived in this order: most-recent commit's `[SCOPE-MS#]` → `CURRENT_POSITION.md` milestone → last segment of git branch (`work/cam-exhaust-ms0` → `cam-exhaust-ms0`). The Stop hook renames any topicless `HANDOFF-<id>.md` → `HANDOFF-<id>-<topic>.md` so chats can never end a session with an ambiguous unsuffixed file. **Never bypass this hook**: a topicless handoff in a multi-chat run is the precursor to the silent-overwrite class of bug we already hit (see `RESUME_AT_WORK.md` §8). When writing handoffs by hand, always pass `--topic <slug>` to `per-agent-handoff.mjs write`.

### Lane discipline + conflict-fork rule (2026-04-28)
Each chat **stays in its own lane** — claims a milestone scope, commits to the matching `work/<scope>` worktree. `worktree-commit-route.mjs` enforces routing when wired (currently dormant; deeper rules in `data/docs/gsd/GSD_MICRO.md` Multi-Chat section).

**Conflict-fork rule:** if `commit-ownership-guard` or `git-anti-clobber` blocks your commit because another chat owns the files in the shared tree, do NOT fight for the same tree. **Fork to your own tree:**
```bash
git worktree add ../prism-<milestone> -b work/<milestone>
# move work via git stash → pop in new tree, OR cherry-pick
# update HANDOFF-<id>-<topic>.md to point at new worktree
```
This avoids multi-chat thrash on shared HEAD and keeps milestones independently mergeable.
