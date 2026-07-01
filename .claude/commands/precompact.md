---
policy:
  tier: 3
  triggers:
    - "precompact"
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "precompact|/precompact|before compact|prepare compact|write handoff"
    score: 0.8
    action: suggest
composes_with:
  - "/checkin"
  - "/handoff"
  - "/startup"
  - "/system-viz"
consumes:
  - "prism_context:claim_file"
  - "prism_dev:context_compact_plan"
---
# /precompact — write the session-continuation handoff via psk

Writes a structured handoff through psk's `handoff` syscall so the post-`/compact`
session can resume. The PreCompact hook chain (`precompact-handoff.mjs` plus
companions) auto-writes a handoff when you run `/compact` directly — invoke
`/precompact` manually only for an explicit mid-task snapshot, or to write a
sharper RESUME than the hook's auto-generated fallback.

## Write the handoff

```bash
node H:/prism/.claude/kernel/psk.mjs handoff --pretty --subcommand write --source live-chat \
  --resume '<specific next-action directive>' --state '<1-line summary>'
```

`--source live-chat` is mandatory — hooks/subagents are banned writers and the
helper returns `{ok:false, error:"writer_banned"}` without it. `terminal` and
`topic` are resolved by `per-agent-handoff.mjs` itself (stdin session-id →
legacy fallback) when psk passes neither — supply `--terminal`/`--topic`
explicitly only to override.

## RESUME directive rules

- DO: `"Continue COMMAND-KERNEL-MS0 U-CK11: per-category scrutiny pass"`
- DO: `"Fix 3 TS errors in dataDispatcher.ts:45,120,300"`
- DON'T: `"Continue working"` / `"Read git log"` / `"compacting"` (placeholders)

A weak RESUME degrades the post-compact continuation — be specific enough that
a fresh Claude executes it without asking questions.

## Manual fallback (if psk is unavailable)

```bash
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
node H:/prism/.claude/helpers/per-agent-handoff.mjs write \
  --source live-chat --terminal "$STABLE" --resume "<...>" --state "<...>"
```

## Tell the user

`"Handoff written for this chat. Run /compact when ready."`

Do NOT run `/compact` yourself — it is a built-in command, not a skill. The
PreCompact hook chain re-writes/refreshes the handoff at the moment `/compact`
fires, so a manual `/precompact` is belt-and-suspenders, not a hard prerequisite.

— Hand-tuned 2026-05-19, COMMAND-KERNEL-MS0/U-CK09 (thin psk client; was 293 lines).
