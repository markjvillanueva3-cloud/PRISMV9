# CLAUDE.md / USER.md security policy (U-MWO15, slot:bravo 2026-05-26)

> **TL;DR for new operators:** never accept a `CLAUDE.md`, `USER.md`, or any file under `.claude/commands/`, `.claude/hooks/`, or `.claude/agents/` from an untrusted fork, gist, or pastebin. These files are auto-loaded into every session prompt and the harness executes the hooks/skills they reference. A malicious one can exfiltrate SSH keys, API tokens, or shell history.

## Threat model

**Adversa AI / LayerX (Feb 2026):** documented that CLAUDE.md files in cloned repos can instruct Claude Code to generate pipelines that exfiltrate SSH keys, API credentials, and other secrets. Anthropic patched a permission-system bypass via "command-padding" in Claude Code v2.1.90.

**Snyk audit (Feb 2026):** 13% of agent-skills packages contain critical security flaws.

**Practical attack surfaces relevant to PRISM:**
1. **Malicious CLAUDE.md** in a third-party PR or fork — auto-loads on every session, can instruct the agent to call commands the operator never intended.
2. **Malicious `.claude/commands/<name>.md` skill** — operator types `/<name>` and the model runs whatever the skill instructs, including shell commands via Bash.
3. **Malicious `.claude/hooks/<name>.mjs`** — runs in every UserPromptSubmit / PreToolUse / Stop event; has direct shell access via the harness.
4. **Malicious `.claude/agents/<name>.md`** — spawned subagents inherit the prompt + tool surface; can be primed to behave maliciously inside a subtask the operator delegates.

## Standing rules

1. **No CLAUDE.md / USER.md from untrusted forks.** Only the canonical PRISM repo + the multica-ai/andrej-karpathy-skills mirror are pre-approved sources. Any other source requires manual review.
2. **No `.claude/commands/`, `.claude/hooks/`, `.claude/agents/` additions from untrusted PRs** without line-by-line read. The Hermes-Dreaming + dream-receipt review workflow (`/dream-review`) is the canonical staged-review pattern — use it.
3. **No `--no-verify` / `--no-gpg-sign` git flags** unless the operator explicitly requests. Pre-commit hooks include duplication guard + scrutiny gate; bypassing them defeats the security perimeter.
4. **No external skill packages from npm / GitHub gists** without `/dedup` + `/dream-review` first. Even legitimate-looking skills can call out to attacker-controlled URLs in their hook payloads.
5. **Quarterly audit:** `harness-security-audit` skill (already installed) scans `settings.json`, hooks, `.mcp.json`, CLAUDE.md for misconfigurations. Run at minimum every 90 days; recommended monthly.

## Verification before merging an external CLAUDE.md / USER.md / skill

Before accepting any change to the 4 sensitive paths above from a non-operator-authored source:

- [ ] Read the file end-to-end. Look for: `bash(...)`, `exec`, `curl`, `wget`, base64 strings, network calls, file-system mutations outside the project.
- [ ] Check hook trigger conditions. A hook with `matcher: "*"` runs on every event — high risk; `matcher: "Edit|Write"` is narrow.
- [ ] Diff against the prior version. Look for additions of new event matchers, new shell commands, new dispatcher actions.
- [ ] Run via `/dream-review <bundle-id>` if the change came in via the receipt-bundle pattern (DREAM-RECEIPT-MS0).
- [ ] Reject if any of: opaque base64 payloads, dynamic-construction of shell commands, requests for unrelated environment variables, references to URLs not on the allowlist.

## Allowlist (canonical safe sources)

- `H:/prism/*` (this repo)
- `H:/.claude/*` (mirrored from `C:/Users/<user>/.claude/*` via the `c-to-h-mirror` hook)
- `multica-ai/andrej-karpathy-skills` (Karpathy CLAUDE.md template, official mirror)
- `forrestchang/andrej-karpathy-skills` (same template, original author)
- `anthropics/claude-code` (official Anthropic harness)

Any other source = untrusted until manually vetted.

## Incident response

If a malicious CLAUDE.md / USER.md / skill is suspected to have already been merged:

1. **Immediately rotate** any credentials the agent might have accessed (GitHub PAT, SSH keys, npm token, Anthropic API key).
2. **Audit recent commits** (`git log --since="1 week ago"`) for suspicious file additions in `.claude/`, especially under `hooks/` and `commands/`.
3. **Run `harness-security-audit`** for a fresh scan.
4. **Revert** the suspect file and surface the incident as a `## Recent regressions` entry in CLAUDE.md so future chats know about the historical compromise.
5. **Document in `feedback_*` memory** so the rule fires in future sessions.

## See also

- `state/shared/specs/CLAUDE-MD-PROJECT-FOLDER-OPTIMIZATION-2026-05-26.md` — U-MWO15 spec
- [[reference_hermes_dreaming_and_webwright_2026_05_26]] — source research (Adversa AI / LayerX / Snyk citations)
- [[feedback_bravo_golf_papa_quebec_fix_known_failures]] — fix-known-failures rule
- `harness-security-audit` skill — existing scanner (use proactively, not just on incident)
- Hermes Dreaming receipt-bundle pattern (U-DR01-10) — staged-review path for any mutation
