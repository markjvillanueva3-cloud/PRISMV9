# SETTINGS-PATCH — U-PSGB-CHARLIE-AWARENESS (charlie quoting-galaxy)

**Surface:** `C:/Users/wompu/.claude/settings.json` (auto-mirrors to `H:/.claude/settings.json`)
**Status:** PENDING — peer chat `claude-3d26f925` held the file-claim during slot:charlie's 2026-05-28 galaxy-synergy session. Applied inline if the lock released before session end; this sibling is the fallback.
**Slot:** charlie · **Created:** 2026-05-28

## What to insert

In the **UserPromptSubmit** hooks chain, immediately AFTER the `slot-context-bundle-inject.mjs` entry and BEFORE the `psn-tag-parser-inject.mjs` entry, insert this object:

```json
          {
            "_comment": "PER-SLOT-GALAXY-BUILDOUT/U-PSGB-CHARLIE (2026-05-28 slot:charlie): custom quoting domain-awareness headline (engine/hook/algorithm/frontend counts + NN-bridge status + drift state + next unit) on EVERY charlie prompt. charlie-gated (resolves chat-slots.json — silent no-op for non-charlie), reads canonical H:/prism/state/shared/quoting/QUOTING-AWARENESS.md, fail-soft (NEVER blocks, always exit 0). Charlie's analogue to echo-post-domain-inject. Regen snapshot: node scripts/generate-quoting-awareness.mjs. Disable: PRISM_QUOTING_AWARENESS_INJECT_DISABLE=1.",
            "type": "command",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/charlie-quoting-awareness-inject.mjs",
            "timeout": 3000
          },
```

## Why this is safe to apply
- The hook file `H:/prism/.claude/hooks/charlie-quoting-awareness-inject.mjs` is already on the main tree (verified firing from that path, 5/5 tests pass).
- It is **charlie-gated**: resolves `state/shared/chat-slots.json`, injects ONLY when `slots.charlie.chatId === claude-<sid8>`. Every other chat is a silent exit-0 no-op — wiring it fleet-wide is safe.
- Fail-soft: any read/parse error → exit 0, no injection. Cannot block or corrupt a prompt.
- Pattern precedent: identical to `echo-post-domain-inject.mjs` (settings.json line ~1228, U-PSGB-ECHO, same day).

## Verify after applying
```bash
echo '{"session_id":"e75608b8-bc3f-46c7-914d-bf132701e6f7"}' | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/charlie-quoting-awareness-inject.mjs
# expect: JSON hookSpecificOutput.additionalContext starting "## 🧮 Quoting-domain awareness"
node -e "JSON.parse(require('fs').readFileSync('C:/Users/wompu/.claude/settings.json','utf8'));console.log('settings.json parses OK')"
```

_Per [[feedback_settings_wiring_drift_2026_05_16]]: re-verify the entry survived after any peer settings edit — multi-chat settings wiring silently reverts._
