# Codex Plugin (openai/codex-plugin-cc) — Install + Verification

**Milestone:** INTEL-OLLAMA-OBSIDIAN-MS1 / P1-U01
**Status:** Awaiting interactive plugin install (commands listed below — user must run in Claude Code)
**Drive home:** H: (this doc, the install transcript, and any auth artefacts must live under H: per P0 enforcement)

---

## Why this plugin

`openai/codex-plugin-cc` (Apache-2.0, https://github.com/openai/codex-plugin-cc) installs a set of Claude Code slash-commands that delegate work to the user's local Codex CLI:

| Command | Purpose |
|---------|---------|
| `/codex:setup` | One-shot auth + dependency check |
| `/codex:status` | List in-flight Codex jobs |
| `/codex:rescue` | Hand a stuck task to Codex (gpt-5 / gpt-5-mini) for a fresh attempt |
| `/codex:review` | Pass current changeset through Codex review |
| `/codex:adversarial-review` | Stricter review — Codex actively tries to break the code |

The plugin shares auth with the existing `H:/.codex/` install (no separate API key), so a logged-in Codex CLI is the only prerequisite.

PRISM consumes this plugin as the **second model family** in the consensus chain. Independent error sampling between Claude (Anthropic) and Codex (OpenAI) is what makes the shop_floor tier (Ω≥0.95) achievable — single-family review can't hit five-sigma alone.

---

## Pre-flight (do this first)

```bash
# 1. Codex CLI is logged in
codex --version
codex auth status   # should print "Logged in as <your account>"

# 2. PRISM MCP is wired into Codex (already done — verify config exists)
test -f H:/.codex/config.toml && echo "ok"
grep -A3 'mcp_servers.prism' H:/.codex/config.toml | head -8

# 3. Claude Code plugin marketplace is reachable
claude --version
```

If any of those fail, fix them before installing the plugin (see Recovery section below).

---

## Install (run in Claude Code, NOT in shell)

These two commands MUST be typed into a Claude Code session — they are slash-commands the harness owns; they cannot be fired by an agent or by `/exec`.

```text
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
```

Claude Code will:
1. Fetch the marketplace manifest from GitHub (`openai/codex-plugin-cc`)
2. Add it to the local plugin cache at `C:/Users/<you>/.claude/plugins/cache/codex@openai-codex/`
3. Activate the plugin in this session (others may need restart)

**Mirror the install to H:** the plugin cache lives on C: by harness design, but the install record + any per-project plugin config we add MUST live on H:. This file (and `state/shared/CODEX-PLUGIN-CC-INSTALL-LOG.md` if generated) covers that.

---

## Verification (after install)

In the same Claude Code session, run:

```text
/codex:setup
```

Expected output (success):
- `auth: OK (using <account>)`
- `codex CLI: <version>`
- `mcp servers detected: prism, prism_safe` (these come from `H:/.codex/config.toml`)
- `ready: true`

Then:

```text
/codex:status
```

Expected on a fresh install: `no active jobs` (or an empty JSON list — both are valid empty signals).

If `/codex:setup` reports anything other than `ready: true`, capture the full output below in the Install Transcript section before continuing — P1-U02 (the bridge engine) depends on the plugin being live.

---

## Install Transcript (fill in after running)

Paste the full output of the two install commands AND `/codex:setup` here:

```text
[paste output]
```

Once filled, commit this file as `[INTEL-OLLAMA-OBSIDIAN-MS1]/P1-U01: codex-plugin-cc install verified` from the iooms1 worktree.

---

## Cross-machine note (the H-drive home reason)

This shop runs PRISM across multiple PCs sharing the same H: drive. The Codex plugin caches on C: per machine — that's fine, but each PC needs the plugin installed independently the first time. Re-run the two `/plugin` commands on each new machine. The auth state IS shared (`H:/.codex/auth.json`), so you only log into Codex once.

When you bring the H: drive to the second PC:
1. Run `1 - Arrive (Restore Sessions).bat` (already exists in H:/LAUNCH/)
2. Open Claude Code
3. If the plugin's slash-commands are not listed, repeat the two `/plugin` commands above on this PC

---

## Posting to the chat bus

After install verifies, post to the shared agent chat so any concurrent Claude or Codex session sees the plugin is live:

```bash
node H:/prism-iooms1/.claude/helpers/agent-coordination.mjs post \
  --agent Claude \
  --status ready \
  --current "Codex plugin installed and verified" \
  --message "openai/codex-plugin-cc live on $(hostname). /codex:rescue, /codex:review, /codex:adversarial-review available."
```

---

## Recovery commands

| Symptom | Command |
|---------|---------|
| Plugin install hung | Cancel; run `/plugin uninstall codex@openai-codex`; retry |
| Auth says expired | `codex auth login` (browser flow); re-run `/codex:setup` |
| `/codex:setup` reports `mcp: not found` | PRISM MCP server isn't running — `cd H:/prism/mcp-server && npm run build:fast && node dist/index.js` (or use `Repair PRISM Backend 3000.bat`) |
| Plugin command surface wrong (no `/codex:rescue`) | `/plugin uninstall codex@openai-codex`, restart Claude Code, `/plugin install codex@openai-codex` |
| Want to remove entirely | `/plugin uninstall codex@openai-codex` and `/plugin marketplace remove openai/codex-plugin-cc` |

---

## What this unblocks

| Unit | Description |
|------|-------------|
| **P1-U02** | `PRISMCodexBridgeEngine` — wraps `/codex:rescue` with safety-tier metadata (shop_floor → gpt-5+high, sim → gpt-5-mini+low) |
| **P1-U03** | `prism_orchestrate:codex_delegate` + `codex_review` actions wired into the dispatcher |
| **P1-U04** | `scrutinize-before-stop.mjs` upgraded to prefer `/codex:adversarial-review` over the Claude-only reviewer |
| **P2** | Plan-then-build round-trip uses `/codex:rescue` in `mode='plan'` |
| **P4** | Consensus gate consumes Codex as one of 5 providers in the quorum |

P1-U02 can begin in parallel with this install (the engine code can be written assuming the documented plugin interface; integration tests behind `CODEX_PLUGIN_AVAILABLE=1` env-gate stay skipped until install lands).

---

## Exit conditions (P1-U01)

- [ ] `/plugin marketplace add openai/codex-plugin-cc` ran without error
- [ ] `/plugin install codex@openai-codex` ran without error
- [ ] `/codex:setup` reports `ready: true` and lists shared auth
- [ ] `/codex:status` returns valid empty job list
- [ ] Install Transcript section above is filled in
- [ ] Posted to AGENT_CHAT.md so the Codex CLI session sees the plugin is live
- [ ] This file committed in the iooms1 worktree
