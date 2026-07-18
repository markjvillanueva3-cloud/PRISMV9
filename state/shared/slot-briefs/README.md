# slot-briefs/ — targeted orchestrator→slot channel

The **targeted** counterpart to the broadcast chat-bus. The Hermes app (the slot-less
ZULU master orchestrator) and any chat issuing a cross-slot directive drop a work order
here for **one specific slot**; the `slot-brief-inject.mjs` UserPromptSubmit hook
surfaces it into that slot's next prompt and **consumes it** (archives to `_delivered/`).

## Protocol

| | |
|---|---|
| **Write a brief** | Create `state/shared/slot-briefs/<slot>.md` (lowercase NATO name, e.g. `bravo.md`). Free markdown — the first 4096 bytes are injected; put the directive up top. |
| **Delivery** | On the target slot's next prompt, `slot-brief-inject.mjs` injects the brief under a `## 📨 Orchestrator brief` header, then atomically renames it to `_delivered/<slot>-<intMtimeMs>-<hash>.md` (consume-once + audit trail). |
| **Semantics** | At-most-once. One brief per slot at a time — overwrite `<slot>.md` to replace a pending brief; queue the next only after the prior is consumed. |
| **Confirm pickup** | The orchestrator watches the bus / commit log for the slot actioning the brief, and re-issues if needed (the channel does not ACK). |

## Who writes here

- **Hermes / ZULU orchestrator** — via the filesystem path or a future `prism_*` dispatcher action. Targeted work orders, wiki+tribal+memory pointer bundles, gap corrections.
- **Any chat** issuing a cross-slot directive that should land in exactly one peer's context (vs `prism_context:chat_post`, which broadcasts to all).

## Channel comparison

| Channel | Scope | Lifetime |
|---|---|---|
| `chat-bus-inject` (`prism_context:chat_post`) | BROADCAST — all slots | re-readable |
| `slot-soul-inject` (`slot-souls/<slot>.md`) | one slot, PERSISTENT personality | every prompt |
| **`slot-brief-inject` (this)** | one slot, TARGETED work order | **consume-once** |

## Knobs

- `PRISM_SLOT_BRIEF_INJECT_DISABLE=1` — disable delivery (briefs stay queued).
- `PRISM_SLOT_BRIEF_INJECT_VERBOSE=1` — append the source path to the injected block.

Hook: `.claude/hooks/slot-brief-inject.mjs` · Tests: `.claude/hooks/__tests__/slot-brief-inject.test.mjs` · Architecture: `state/shared/specs/HERMES-MASTER-ORCHESTRATOR-ARCHITECTURE-2026-06-02.md`.

`<slot>.md` briefs and `_delivered/` are transient runtime state (git-ignored) — only this README is tracked.
