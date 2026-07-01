# Plan: ZULU-OBSIDIAN-LIVE-MS0 — make the Hermes/Zulu brain LIVE + mobile

## Context
Operator shared the "I Connected Hermes Agent to My Obsidian Vault" pattern (DamiDefi/X) and asked the
designated **hermes-zulu** chat (slot bravo) to apply it. Audit finding: **PRISM already implements 5 of the
6 elements** — per-slot `SOUL.md` (26 slot souls), scheduled briefs (CLAUDE-BRIEF/`/wiki-morning`),
multi-model routing (`aiSystemRouterEngine`), skill-file creation (`/forge-triple`), and an Obsidian-format
vault (`obsidian-memory-sync.mjs` → `H:/prism/knowledge`, [[wikilinks]], galaxy-routed). The vault content
already exists; what's missing is the tweet's actual innovation: a **LIVE** Obsidian instance (Local REST API
on `:27123`) the orchestrator reads/writes *in-session*, instead of the current one-way Stop-time file copy —
plus **mobile access** (Telegram). This also completes the pending migration task #15 ("operationalize
hermes-zulu + Obsidian sync"). Operator chose scope: **Live REST + Telegram mobile**.

Today the feed is one-way only (`stop-obsidian-memory-feed.mjs` → `obsidian-memory-sync.mjs`): PRISM writes
*to* the brain but never reads *from* a running vault. No Obsidian app runs here (probed `:27123` → nothing;
no install dir; no `.obsidian` config). Outcome wanted: the zulu orchestrator can query/update the live brain
when it's up (fail-soft no-op when down), and the operator can query the brain from a phone — both without
regressing the existing file-based path.

## Approach (validated by a Plan agent against the real files)

Three additive components, all **fail-soft** (a down dependency self-no-ops — the explicit lesson from the
dead-Ollama hooks that burned 8 s timeouts every prompt). Nothing existing is modified destructively; the
existing one-way feed and the `system-viz-obsidian-bridge-v2.mjs` graph augmenter are orthogonal and untouched.

### Component 1 — `ObsidianRestBridgeEngine.ts` (live vault client, the verifiable core)
- New engine at `mcp-server/src/engines/ObsidianRestBridgeEngine.ts` (galaxy hermes-zulu; doctrine recorded in
  the doc-only `engines/hermes-zulu/` kit — the `.ts` lands in `engines/` like every other Zulu engine).
- Methods, all return `{ok:false, reason}` when down, **never throw**: `isLive()` (2 s probe, module-scoped
  `{value,at}` health cache, return cached if `now-at < 10_000`), `read(path)`, `append(path,content)`,
  `search(query)` (LIVE vault only — must NOT re-index the static `knowledge/memories` tree the ollama-bridge
  already covers), `activeNote()`.
- **Mirror the fail-soft idiom from `scripts/ollama-prism-bridge.mjs` `mcpCallStreamable`**: `AbortController` +
  `setTimeout(abort)` + `finally clearTimeout`; `AbortError` → "timed out", else "unreachable". Hard result-char
  cap (8 KB). If `PRISM_OBSIDIAN_API_KEY` unset → return `{ok:false,reason:"no-key"}` *immediately* (no socket,
  no timeout burned). `fetchImpl = fetch` injected as a param so unit tests run with no live vault.
- Talks HTTPS to `https://127.0.0.1:27123` (self-signed; accept the local cert), bearer `PRISM_OBSIDIAN_API_KEY`.

### Component 2 — wire into the orchestrator (additive) + dispatcher actions
- **Dispatcher: NEW `prism_session` actions, NOT a new dispatcher** (a `prism_obsidian` for 3 actions is
  over-engineering). Add `obsidian_status`, `obsidian_read`, `obsidian_search` to the frozen `as const`
  action-name array in `sessionDispatcher.ts` (~L559, beside the Zulu entries) + matching `switch` cases with
  lazy `await import("../../engines/ObsidianRestBridgeEngine.js")` (the established Zulu-case pattern). **No
  `obsidian_write` action in v1** (write surface stays internal-only, never reachable via Telegram).
- **Orchestrator hook = the READER, never the Governor.** `ZuluFleetGovernorEngine.checkAuthority` is a pure,
  side-effect-free gate — do NOT wire a socket there. Instead add a NEW exported `liveBrainContext(opts)` to
  `mcp-server/src/engines/lib/zuluAwarenessReader.ts`, gated behind `PRISM_OBSIDIAN_LIVE=1` (default off): when
  live, returns `{ok, activeNote, recentEdits}`; when down, returns `null` and callers keep the existing file
  envelope verbatim. `loadAwareness()`'s body is left byte-unchanged (it has no live TS consumer today, so
  there is no caller to regress).

### Component 3 — `scripts/zulu-telegram-bridge.mjs` (outward-facing, security-first, build LAST)
The one internet-facing surface on an internal-only system — hardened per the Plan agent's review:
- **Long-poll `getUpdates`** (no inbound webhook/port). Opt-in detached process, **never auto-on**.
- **READ-ONLY in v1 — no write path at all** (drop the proposed `PRISM_TELEGRAM_ALLOW_WRITE`; an
  internet-reachable write to the brain is indefensible v1).
- **Fixed verb allowlist** parsed by strict regex: `/recall <q>`, `/search <q>`, `/status`. The remainder is an
  **opaque query string** passed ONLY to the existing brain query (`memory_search` / `/wiki-query` /
  `/brain-recall`) — never a filesystem path (no traversal), shell, `eval`, or dispatcher arg.
- **Default-deny chat-ID allowlist** (`PRISM_TELEGRAM_ALLOWED_CHAT_IDS`). Unknown id → **silent drop**, no
  content logged (only a rate-limited hashed-id counter).
- **Token via `PRISM_TELEGRAM_BOT_TOKEN` only** — refuse to start without it; scrub it from every log/error.
- **Per-chat token bucket** (~1 msg/3 s, burst 5) + global ceiling; **3500-char response cap** + truncation
  marker; **output deny-regex** strips anything shaped like an env var / secret / absolute path / token before send.
- Thin client over existing brain query — no new recall logic. Flag **quebec** (phone-app domain) for coordination.

### Operator one-time setup (parallel; PRISM-side code works no-op until done)
1. **Obsidian live:** install Obsidian desktop → open `H:/prism/knowledge` as a vault → install the "Local REST
   API" community plugin → copy its API key into `PRISM_OBSIDIAN_API_KEY` + set `PRISM_OBSIDIAN_LIVE=1`.
2. **Telegram:** create a bot via `@BotFather` → put the token in `PRISM_TELEGRAM_BOT_TOKEN`, your chat id in
   `PRISM_TELEGRAM_ALLOWED_CHAT_IDS`. A `scripts/obsidian-live-setup-check.mjs` probe will report green/red for both.

## Phases (each leaves a working, no-op-safe state — dependency-first per R13)
- **P0 — worktree sync.** The `slot/bravo` worktree is a stale checkout; the Zulu engines + `zuluAwarenessReader`
  + `sessionDispatcher` Zulu wiring were migrated to main THIS session and may be absent in `H:/prism-slot-bravo`.
  Rebase/merge the worktree onto current `cad-fusion-live-ms0` (or cherry-pick the Zulu commits) so the
  integration points exist before editing. Verify the 4 Zulu files + the `sessionDispatcher` Zulu actions are present.
- **P1 — `ObsidianRestBridgeEngine.ts`** + unit tests (fake-fetch: live path, vault-down `{ok:false}` no-throw,
  no-key short-circuit). `npm run build:fast`.
- **P2 — wire 3 `prism_session` actions** (frozen list + lazy-import cases). Build, restart `:3100`, verify
  `obsidian_status` returns `{ok:false,reason}` with the vault down (proves fail-soft end-to-end).
- **P3 — additive `liveBrainContext()`** in `zuluAwarenessReader.ts` behind `PRISM_OBSIDIAN_LIVE`; assert
  `loadAwareness` file-fallback output is byte-unchanged.
- **P4 — `zulu-telegram-bridge.mjs`** (hardened spec above) + tests (allowlist deny, verb-allowlist regex,
  unknown-id silent-drop, token-scrub, size cap) + `obsidian-live-setup-check.mjs`.
- **P5 — operationalize + docs.** `galaxy-verify zulu` PASS; surface `state/shared/slot-souls/zulu.md` into the
  vault as a `SOUL.md` note (the tweet's SOUL.md = our zulu soul); reflect all 4 doc surfaces (CLAUDE.md pointer,
  MEMORY.md, wiki entry, Obsidian memory `reference_zulu_obsidian_live_2026_05_30.md`). Commit per-phase to
  **`H:/prism-slot-bravo` on `slot/bravo`** (worktree lesson — never shared main), `[SCOPE]/U-ID` subjects.

## Critical files
- NEW `mcp-server/src/engines/ObsidianRestBridgeEngine.ts` + `mcp-server/src/__tests__/ObsidianRestBridgeEngine.test.ts`
- `mcp-server/src/engines/lib/zuluAwarenessReader.ts` (additive `liveBrainContext`; preserve `loadAwareness`)
- `mcp-server/src/tools/dispatchers/sessionDispatcher.ts` (3 obsidian actions: frozen list ~L559 + switch cases)
- `mcp-server/src/engines/ZuluFleetGovernorEngine.ts` (confirm: do NOT wire here — pure gate)
- NEW `scripts/zulu-telegram-bridge.mjs` + test; NEW `scripts/obsidian-live-setup-check.mjs`
- Reuse pattern: `scripts/ollama-prism-bridge.mjs` (`mcpCallStreamable` fail-soft idiom)
- Do NOT touch: `scripts/obsidian-memory-sync.mjs`, `scripts/system-viz-obsidian-bridge-v2.mjs` (orthogonal)

## Verification (end-to-end)
1. `npx vitest run mcp-server/src/__tests__/ObsidianRestBridgeEngine.test.ts` green (live + down + no-key paths).
2. With vault DOWN: `prism_session:obsidian_status` → `{ok:false,reason}` (no throw, no hang) — proves fail-soft.
3. With vault UP (operator setup done): `obsidian_read`/`obsidian_search` return live note content; `liveBrainContext`
   populates only when `PRISM_OBSIDIAN_LIVE=1`; `loadAwareness` fallback unchanged when off.
4. `node scripts/obsidian-live-setup-check.mjs` reports green for `:27123` + token.
5. Telegram (token set): message from an allowlisted id `/status` → reply; message from a NON-allowlisted id →
   no reply, counter increments; `/recall <q>` → brain answer ≤3500 chars; verb outside allowlist → ignored.
6. `node scripts/galaxy-verify.mjs zulu` → PASS.

## Risks / caveats (fail-loud)
- **Outward-facing Telegram** is the highest-risk surface — read-only v1, default-deny, opaque-query, token-scrub,
  size+rate caps. Per-file scrutiny applies hardest here. Writes are explicitly out of v1 scope.
- **Stale worktree (P0)** — must sync before P1 or the integration points won't exist (the
  `reference_bravo_verify_against_main_not_worktree` lesson).
- **Operator dependencies** — Obsidian install + BotFather are GUI/operator steps I can't do headless; all
  PRISM-side code ships working-but-no-op until the operator lights them up.
- `npm run build` (full tsc) is independently blocked by 13 pre-existing `shop/sessionDispatcher` type errors —
  out of scope; build via `build:fast` (esbuild) + `node --check dist/index.js`.
