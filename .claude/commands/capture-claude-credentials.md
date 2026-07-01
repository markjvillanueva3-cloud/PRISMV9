---
description: Snapshot ~/.claude/.credentials.json into a per-account vault (ZEBRA-ACCOUNT-CYCLE-MS0/U1). One-time per account; reusable until the OAuth refresh token expires.
allowed-tools: [Bash]
---

# /capture-claude-credentials — capture a Claude Code account snapshot

Snapshots your live `~/.claude/.credentials.json` into a per-account vault under
`H:/.claude-accounts/<account-N>/` together with a manifest. Used by the multi-account
rotation cycle (ZEBRA-ACCOUNT-CYCLE-MS0) so `scripts/switch-claude-account.ps1` (U2,
pending) can swap between 6 Claude Max accounts without re-running the OAuth dance
every time.

## When to use

Run this ONCE per Claude Code account, after you finish the `/login` dance for that
account (browser flow + paste-back the one-time code). At that point your live
`~/.claude/.credentials.json` holds the fresh OAuth bundle for THAT account —
this skill captures it before you switch away.

You do NOT need to re-run this on the same account unless the refresh token has
expired (Anthropic rotates these; if a swap-in starts erroring with `401`, recapture).

## Usage

```bash
# Capture account-1 as your "home-pro" account, rotation position 1
/capture-claude-credentials account-1 home-pro 1

# With an operator note
/capture-claude-credentials account-2 work-secondary 2 --notes "ending 4242, billing on company card"

# Replace an existing snapshot (after refresh-token expiry)
/capture-claude-credentials account-3 spare 3 --overwrite

# List what's already captured
/capture-claude-credentials --list
```

## What the skill does

1. Resolves the live credential path via `os.homedir()` — works on `wompu`, `Mark Villanueva`, any operator account; never hard-coded.
2. Validates the source is a non-empty, parseable JSON file — fails loud on truncation or empty disk.
3. Atomically copies it to `H:/.claude-accounts/<account-N>/.credentials.json` (tmp + rename).
4. Best-effort `chmod 0o600` on the snapshot. **You must also run `icacls H:\.claude-accounts /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F"` ONCE per machine** for true NTFS protection — the script can't do this for you without operator privileges.
5. Writes a `manifest.json` (schema `claude-account-v1`) recording label, rotation position, captured-from-live-path, captured-at timestamp, and notes.
6. If `H:/.claude-accounts/ROTATION_ORDER.json` already exists and does NOT include this account, appends it.

## Implementation

```bash
node H:/prism/scripts/capture-claude-credentials.mjs $ARGS
```

The skill is a thin wrapper around `scripts/capture-claude-credentials.mjs`. All
behavior, validation, and atomic-write semantics live in the script — this file just
documents the surface for slash-command discovery and chat hints.

## Manifest schema

```jsonc
{
  "$schema": "claude-account-v1",
  "schemaVersion": "1.0.0",
  "name": "account-1",
  "label": "home-pro",
  "credential_file": "H:/.claude-accounts/account-1/.credentials.json",
  "captured_from_live_path": "C:/Users/wompu/.claude/.credentials.json",
  "settings_env_delta": "settings-env.json",
  "rotation_position": 1,
  "captured_at": "2026-05-23T17:55:00.000Z",
  "last_used_at": null,
  "last_5h_window_start_at": null,
  "notes": "operator note (printable ASCII, ≤512 chars)"
}
```

Note: `captured_from_live_path` is a SNAPSHOT-TIME hint, not authoritative. The swap
script (U2) resolves the live path at run-time via `resolveLiveCredentialPath()`.

## Failure modes (fail-loud, not silent)

| Error | Cause | Fix |
|-------|-------|-----|
| `source credential file not found` | `~/.claude/.credentials.json` missing | Run `/login` first, complete the OAuth dance |
| `source credential file is empty` | live file zero-byte (auth wiped) | Re-run `/login` |
| `source credential file is not valid JSON` | live file truncated/corrupt | Re-run `/login`; do NOT capture |
| `account 'account-N' already has a captured credential` | running twice on same account | Pass `--overwrite` if the refresh token rotated |
| `invalid account name '...'` | wrong shape (must be `account-N`, N=1..99) | Use `account-1` through `account-99` |
| `invalid label '...'` | label has disallowed chars (only `A-Za-z0-9_.- ` and space, 1-64 chars) | Pick a simpler label |
| `notes must be printable ASCII` | notes contain control chars / ANSI escapes | Strip control bytes |
| `notes too long (... > 512)` | notes >512 chars | Shorten |

## Related

- **U2** (pending) — `scripts/switch-claude-account.ps1` to flip the ACTIVE account
- **U4** (pending) — sidecar populator that feeds the 95% watchdog
- **U5** (pending) — Stop hook that fires SendKeys on 5h≥95%
- **U6** (pending) — zebra-account-coordinator that fans the swap directive out across the fleet
- **Spec** — `state/shared/specs/ZEBRA-ACCOUNT-CYCLE-MS0.md`
- **Lib** — `scripts/lib/claude-account-lib.mjs` (pure-core; the API consumed by U2/U5/U6)
- **Wiki** — `knowledge/wiki/architecture/zebra-account-cycle.md` (pending U7)
