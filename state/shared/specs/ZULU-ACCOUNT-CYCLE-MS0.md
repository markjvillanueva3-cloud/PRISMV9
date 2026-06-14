# 📐 ZEBRA-ACCOUNT-CYCLE-MS0 — Design spec

> **Status:** plan (not started) · **Author:** claude-71caa41a (slot bravo) · **Date:** 2026-05-23 · **Supersedes:** `U-ZEBRA08` ghost (graph node, no on-disk spec).
>
> /goal arm 1: *"complete remaining zebra units + synergize with 6 claude accounts that I rotate around session limits. make sure zebra is capable of swapping accounts at 95% session limit"*
> /goal arm 2: *"assess zebra's synchronization with claude code cli + PSN"*

---

## 1. Problem

Operator runs **6 Claude Max-plan accounts** in rotation, each with its own 5-hour session window. Today the rotation is manual:

1. `/login` slash-command in Claude Code → URL printed.
2. Operator copies URL into Firefox, clicks **Activate**, gets a one-time code.
3. Pastes code back into terminal → login completes, `~/.claude/.credentials.json` is refreshed in-memory.
4. Operator starts ONE chat first, waits until the token counter starts ticking (the 5h window opens on the first message).
5. Then **staggers** the remaining 5 chats one-by-one into the same window (intentional — staggered joining smears API rate-limit pressure across seconds rather than peaking it).

The two pain points:
- **Re-login is mostly the same operator dance every cycle** even though the credential file is reusable until expiry.
- **No automated 95% trigger** — operator has to eyeball the token counter and decide when to swap.

Zebra is the natural automation target: it already (a) orchestrates the fleet via SendKeys, (b) reads token-awareness sidecars, (c) survives /compact via terminal-pin.

---

## 2. Hard physics of the system (constraints that the spec must respect)

| # | Constraint | Source |
|---|---|---|
| C1 | Claude Code session reads credentials **in-memory at launch**. Editing `.credentials.json` mid-chat does NOTHING to the running session. The chat MUST `/exit` and relaunch to pick up a new account. | Empirical (matches `switch-claude-profile.ps1` ending: *"RESTART CLAUDE CODE for env vars to take effect"*) |
| C2 | First-time login per account is a **browser OAuth dance** that we cannot scriptlessly automate (without driving a headless browser, which is out-of-scope and brittle against Anthropic auth flow changes). | Operator description |
| C3 | After first-time login per account, `.credentials.json` is a **reusable file** until token expiry → can be snapshotted and copied around like `switch-claude-profile.ps1` does for env vars. | OAuth refresh-token semantics |
| C4 | The **5-hour Max-plan window starts on the first message** of a fresh session, not on `/login`. Stagger pattern preserves this — first chat opens the window, others join it. | Operator description |
| C5 | Token-awareness sidecar currently shows `5h=— · 7d=—` (the placeholders are NULL). A 95% threshold trigger is **impossible until the 5h % field is actually populated**. | Live state injected this session |
| C6 | 6 chats × 1 active account = 6 windows opened against the same account → faster burn. So the rotation unit isn't "1 chat per account" — it's **"all-6-chats-on-account-N → 95% → all-6-chats-on-account-(N+1)"**. (Confirm with operator: see §10 Q1.) | Inferred from "stagger to avoid rate limits" |
| C7 | Zebra runs as a Windows scheduled task every 5 min + a Stop hook. It is **NOT in-session** with any chat — it can SendKeys directives into terminal windows but can't read in-process chat state. | Existing MS0/MS1/MS2 architecture |
| C8 | The `switch-claude-profile.ps1` already implements the **template pattern** we need: data-driven manifest, peer-active abort, atomic ACTIVE marker, snapshot-out + snapshot-in, deep-merge settings env. Account-cycle should clone the pattern, not reinvent. | `H:/prism/scripts/switch-claude-profile.ps1` (read this session) |

---

## 3. Architecture (parallel to `.claude-profiles/`)

```
H:/.claude-accounts/                       ← new sibling of .claude-profiles/
├── account-1/
│   ├── manifest.json                       (schema v1, see §4)
│   ├── .credentials.json                   ← snapshot of ~/.claude/.credentials.json after first login
│   └── settings-env.json                   ← optional per-account env overrides
├── account-2/ ...
├── account-6/
├── ACTIVE                                  ← which account is live (single line)
├── LAST_SWITCH.json                        ← {ts, from, to, by, trigger}
├── ROTATION_ORDER.json                     ← [account-1, account-2, ..., account-6] (cycle order)
└── .backups/<UTC-stamp>/                   ← live-file backups before each swap

H:/prism/scripts/
├── switch-claude-account.ps1               ← parallel to switch-claude-profile.ps1
├── lib/
│   └── claude-account-lib.mjs              ← pure helpers (resolve, peer-check, manifest read)

H:/prism/.claude/commands/
├── switch-claude-account.md                ← /switch-claude-account skill (status | <name> | next | force)
└── capture-claude-credentials.md           ← /capture-claude-credentials skill (one-time per account)

H:/prism/scripts/lib/
└── session-limit-sidecar-populator.mjs    ← populates `5h=` and `7d=` in token-awareness sidecar

H:/prism/.claude/hooks/
└── session-limit-95-watchdog.mjs          ← Stop+UserPromptSubmit hook; fires SendKeys directive when 5h%≥95

H:/prism/scripts/lib/
└── zebra-account-coordinator.mjs          ← zebra-side: pickActionableSlots respects ACTIVE account, emits /exit + relaunch + swap directive on threshold
```

**Why a sibling tree, not extend `.claude-profiles/`:** profiles control model + context-window. Accounts control credentials. They're orthogonal axes — a user may switch model on account-3, or swap account while staying on opus47-1m. Coupling them would mean N×M profile dirs (currently 2 model profiles × 6 accounts = 12 dirs, growing combinatorially). Keeping them orthogonal preserves data-drivenness.

---

## 4. `manifest.json` schema (per-account)

```jsonc
{
  "$schema": "claude-account-v1",
  "name": "account-1",
  "label": "operator-defined display name (e.g. 'work-primary', 'home-pro')",
  "credential_file": "H:/.claude-accounts/account-1/.credentials.json",
  "live_credential_path": "C:/Users/Mark Villanueva/.claude/.credentials.json",
  "settings_env_delta": "settings-env.json",        // optional, may be absent
  "rotation_position": 1,                            // 1-based slot in cycle
  "captured_at": "2026-05-23T03:00:00Z",            // when first-login snapshot was taken
  "last_used_at": null,                             // updated on swap-in
  "last_5h_window_start_at": null,                  // for stagger preservation (C4)
  "notes": "optional operator notes"
}
```

The schema deliberately omits `state_snapshot_files` (that's a model-profile concern, not account). Adding `state_snapshot_files` later is forward-compatible.

---

## 5. Unit enumeration (full — no `and others`)

| Unit | What | Depends on | Blocks | Why |
|---|---|---|---|---|
| **U1** | `capture-claude-credentials.md` skill + handler — operator runs `/capture-claude-credentials account-N`; skill captures `~/.claude/.credentials.json` into `H:/.claude-accounts/account-N/.credentials.json`, writes `manifest.json`. ONE-TIME per account; reusable until token expires. | none | U2 | C2: first login is operator-dance; this just snapshots the result. |
| **U2** | `scripts/switch-claude-account.ps1` + `scripts/lib/claude-account-lib.mjs` + tests — parallel pattern to `switch-claude-profile.ps1`. Subcommands: `status`, `swap <name>`, `next` (rotate per `ROTATION_ORDER.json`), `force`. Atomic ACTIVE marker, peer-active abort, `.credentials.json` swap, LAST_SWITCH.json log. **Does NOT relaunch the CC sessions** — outputs the operator directive. | U1 | U3, U6 | C1: file swap only; chats must /exit + relaunch. |
| **U3** | `.claude/commands/switch-claude-account.md` — thin slash-command wrapper that calls U2's `.ps1` via Bash (mirrors `switch-profile.md`). | U2 | U7 | UI surface. |
| **U4** | `scripts/lib/session-limit-sidecar-populator.mjs` + scheduled task — populates `5h=<pct>` and `7d=<pct>` in `state/shared/token-awareness-sidecar.json`. Reads Anthropic `/v1/messages` 429 `retry-after` headers + cumulative tokens from `token-economy-stats` for time-of-window estimation. | none (parallel to U1-U3) | U5 | C5: trigger is impossible until this lands. **This is the chokepoint of arm 1.** |
| **U5** | `.claude/hooks/session-limit-95-watchdog.mjs` (Stop + UserPromptSubmit hook) — reads sidecar; if `5h≥95` AND `state/shared/account-swap-in-progress.lock` absent → writes the lock + SendKeys directive: `/exit then relaunch then /startup-<slot>`. Idempotent. Knob: `PRISM_SESSION_LIMIT_95_WATCHDOG_DISABLE=1`. | U4 | U6 | Trigger detection. |
| **U6** | `scripts/lib/zebra-account-coordinator.mjs` + integration into `zebra-orchestrator-sweep.mjs` — on next sweep after U5 fires the lock: (a) call U2's `.ps1 swap next` to advance ACTIVE marker, (b) emit per-slot SendKeys directive ordered by `ROTATION_ORDER.json` honoring stagger (one chat first, others 30s later per slot), (c) clear the lock. | U2, U5 | — | C4 stagger preservation; C6 rotation unit. |
| **U7** | Wiki entry `knowledge/wiki/architecture/zebra-account-cycle.md` + memory `reference_zebra_account_cycle_ms0_<date>.md` + CLAUDE.md `## Recent shipments` pointer (via golf slot). | U2 | — | Doc reflection rule (CLAUDE.md §Doc reflection). |
| **U8** | E2E smoke test — dry-run swap with 2 captured accounts; assert ACTIVE flips, `.credentials.json` byte-equal target snapshot, LAST_SWITCH.json written, SendKeys directive composed correctly (no auto-actuate during smoke). | U1, U2, U6 | — | Variability floor (≥2 spanning accounts per comprehensive-build-enforce §Variability). |

**Variability axis covered:** 2 accounts (U8) covers happy-path + cross-account. Failure modes covered in tests: (a) missing credential file, (b) malformed manifest, (c) peer-active veto, (d) lock already held, (e) sidecar reports `5h=null` (gracefully no-op), (f) ROTATION_ORDER missing entries (fall back to alphanumeric).

---

## 6. Build order

```
U1 ─┐
    ├─ U2 ─ U3 ─┐
    │           ├─ U6 ── U8 ── U7
U4 ─┴─ U5 ──────┘
```

U1 + U4 can run in parallel (independent). U2 needs U1's manifest output to test against. U5 needs U4's sidecar populator to read non-null `5h`. U6 needs both U2 and U5. U7+U8 close.

Estimated 3-4 work iters (each iter shipping 1-2 units with per-file scrutiny gate).

---

## 7. Assess arm — zebra ↔ Claude CLI + PSN

| Surface | Sync status today | What this MS adds |
|---|---|---|
| Zebra → terminal SendKeys | working (MS2) | one new directive class: `[acct:swap]` (parallel to U-ZPSN01's `[psn:...]` tag) |
| Zebra → `chat-slots.json` | working | new field `chat-slots[slot].account` populated from ACTIVE marker |
| Zebra → token-awareness sidecar | reads `queueLength`, `ctx%` | adds read of `5h%` + `7d%` once U4 populates |
| PSN (PRISMSelfAwarenessEngine) capability matching | independent of account | unchanged — PSN is a domain/capability layer, account is a billing/access layer; orthogonal |
| Claude CLI `/login` | manual operator dance per C2 | first-login still manual; subsequent re-activations are file swaps |
| Claude CLI `/exit` + relaunch | manual today | becomes a zebra-emitted SendKeys directive on threshold |

**Conclusion of assess arm:** zebra ↔ CLI sync is already close; the gap is exclusively in (a) the 5h sidecar value being unpopulated, (b) no account swap mechanism, (c) no threshold-detection hook. PSN sync is orthogonal — no PSN changes needed for this milestone.

---

## 8. Failure modes + edge cases

1. **Credential expiry mid-cycle** — refresh-token rejected by Anthropic → swap to next account anyway + flag the expired one for re-capture (manifest `captured_at` >30 days = warning).
2. **All 6 accounts at >95%** — fleet-wide pause; zebra emits `[acct:exhausted]` directive (operator notice, no auto-swap).
3. **Operator runs `/exit` manually mid-watchdog-window** — lock present → next CC launch reads ACTIVE marker correctly; lock TTL 10 min so a stale lock doesn't wedge the fleet.
4. **Peer chat editing settings.json during swap** — U2 inherits `switch-claude-profile.ps1`'s peer-active guard (handoff-write <10 min ago aborts unless `-Force`).
5. **`5h=` source unavailable** — U4 sets it `null`, U5 no-ops, system degrades to manual operation (R12 fail-loud not fail-silent).
6. **Mid-chat token-window-context exhaust** — orthogonal to 5h limit; existing /compact path handles it. This MS does NOT touch context-window logic.
7. **Stagger order racing** — U6 enforces 30s delays via `setTimeout` between SendKeys per slot; lock prevents reentrancy.
8. **Rotation order out-of-sync** — if `ROTATION_ORDER.json` references an account that no longer has a manifest, U2 fails loud, U6 falls back to next valid entry.
9. **Two accounts share `.credentials.json` schema differences across CC versions** — manifest carries `credential_schema_version`; U2 refuses swap on mismatch.
10. **Zebra runs while operator is mid-OAuth-dance** (U1 in progress) — U1 takes a file-lock; U2 + U6 refuse if lock present.

---

## 9. Doctrine compliance

- [x] No physics constants involved (this is infra; bravo soul refuses inline-physics but isn't otherwise scope-restricted to milling here).
- [x] No stub engines — all units ship real handlers per `comprehensive-build-enforce`.
- [x] `duplicationGuardEngine.mustCheckBeforeCreating()` will be invoked before U2 (similarity to `switch-claude-profile.ps1` is by-design clone pattern, not duplicate engine).
- [x] Per-file scrutiny gate applies across U1-U8 (multi-file MS).
- [x] 3-of-3 scrutiny gate at Stop.
- [x] `[MAIN]` commit prefix (shared tree) + pathspec commits.
- [x] Memory + wiki + CLAUDE.md (golf) for doc reflection.
- [x] Reuses `switch-claude-profile.ps1` data-driven manifest template (R8 read-before-write satisfied).
- [x] R12 fail-loud across all 10 edge cases.

---

## 10. Open questions for operator (must answer before U2 build)

1. **Rotation unit (C6 inference) — confirm:** is the cycle *all-6-chats-on-1-account → 95% → all-6-chats-on-next-account* (the implied stagger semantic), or is it *6 chats spread across 6 accounts simultaneously* (one chat per account)? The former is what the manual flow describes; the latter would be a different design.
2. **Where do the 6 first-login credentials get captured?** Three options:
   - (a) `/capture-claude-credentials account-1` after operator does the Firefox dance (U1's design) — operator-initiated, one ceremony per account.
   - (b) Auto-snapshot every Claude Code launch into the currently-ACTIVE account dir (passive — capture is a side-effect of normal use).
   - (c) Hybrid: option (b) but only when ACTIVE was just changed by an explicit `/switch-claude-account`.
3. **First-time login labels** — should each account get an operator-visible label (e.g. `work-primary`, `home-pro`, `secondary-1`, …)? Used in SendKeys directive readability.
4. **5h sidecar source of truth (U4)** — three candidate signals:
   - (i) `Anthropic-Ratelimit-*` HTTP headers from the last `/v1/messages` call (if accessible).
   - (ii) Cumulative tokens since `lastSessionStart` (existing `token-economy-stats.json`) ÷ Max plan ceiling.
   - (iii) Claude Code's own `/status` output if it surfaces session-window remaining.
   - Pick one or layered fallback?
5. **At 95% — auto-`/exit` the chats, or just notify operator?** Auto-actuate matches the spirit of "zebra is capable of swapping accounts", but auto-`/exit` is a destructive operation under MS2's already-cautious `[autonomy_gate]` policy. Default proposal: **notify + 60s grace + auto-actuate unless operator hits Ctrl-C in the slot**. Override knob: `PRISM_ACCOUNT_SWAP_AUTO_ACTUATE=0`.

---

## 11. Cross-refs

- Spec template: `switch-claude-profile.ps1` (already in repo)
- U-ZPSN01 SendKeys directive pattern: `scripts/lib/zebra-bd-priority.mjs::buildAwarenessHint` (commit 8c96ebb8b4)
- Zebra MS2 actuator: `scripts/lib/zebra-orchestrator-lib.mjs::composeSendKeysText`
- Token-awareness sidecar reader: `.claude/hooks/token-awareness-sidecar.mjs` (existing)
- Memory pointer (after ship): `reference_zebra_account_cycle_ms0_<date>.md` (U7)
- Wiki entry (after ship): `knowledge/wiki/architecture/zebra-account-cycle.md` (U7)

---

## 12. Decision checkpoint

This is iter 1 of the new /goal. Spec is fully enumerated (10 edge cases, 8 units, no `and others`, no orphan planning) per `comprehensive-build-enforce` planning rules. **Awaiting operator answers to §10 Q1-Q5 before iter 2 builds U1.** Five answers will unblock U1-U8 build sequence; until then, the build is intentionally paused, not half-shipped.
