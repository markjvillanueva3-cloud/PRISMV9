---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: ff90e2bda2a29cfc14524fe315c6ed57507c74ef42cfdfa0a1b25bc64191cae6
sha8: ff90e2bd
ts: 2026-06-23T02:35:18.805Z
task_type: auto-userprompt
source_session: dbe88c14-d515-45a1-9acd-bd8c13fba259
mode: compare
recommendation: accept
agreement_score: 1
success_count: 1
total_latency_ms: 7449
model_voters: ["gpt-oss:20b"]
mean_factuality: null
tags: [consensus, auto-userprompt, accept]
---

# Consensus Run `ff90e2bd`

**Recommendation:** `accept` · **Agreement:** `1` · **Voters:** `gpt-oss:20b`

## Prompt

```
please fix whatever is causing a bunch of terminal window to open
```

## Consensus answer

```
The extra terminals are coming from the **terminal‑window‑id** resolver (the 4‑Tier Window‑Pin logic) and the `rename-window-intercept` hooks that fire on every window creation.  
To stop them:

1. **Disable auto‑open in the resolver**  
   ```bash
   # In your PRISM config or script
   terminal_window_id_auto_open = false
   ```
   (If you don’t have this flag, comment out the `spawn_terminal()` call inside the resolver.)

2. **Comment out the rename intercepts**  
   ```bash
   # L10/built/rename-window-intercept-test
   # L10/built/rename-window-intercept
   # → remove or wrap in a guard that checks a flag, e.g.
   if (!disable_rename_intercept) { … }
   ```

3. **Restart PRISM** – the terminals should no longer pop up.

If you still see windows, run `prism --debug` and look for any `spawn_terminal()` calls; remove or guard them as above.
```

## Per-model responses

### gpt-oss:20b (ollama) — ok

- latency: 2666ms · tokens: n/a

```
The extra terminals are coming from the **terminal‑window‑id** resolver (the 4‑Tier Window‑Pin logic) and the `rename-window-intercept` hooks that fire on every window creation.  
To stop them:

1. **Disable auto‑open in the resolver**  
   ```bash
   # In your PRISM config or script
   terminal_window_id_auto_open = false
   ```
   (If you don’t have this flag, comment out the `spawn_terminal()` call inside the resolver.)

2. **Comment out the rename intercepts**  
   ```bash
   # L10/built/rename-window-intercept-test
   # L10/built/rename-window-intercept
   # → remove or wrap in a guard that checks a flag, e.g.
   if (!disable_rename_intercept) { … }
   ```

3. **Restart PRISM** – the terminals should no longer pop up.

If you still see windows, run `prism --debug` and look for any `spawn_terminal()` calls; remove or guard them as above.
```

## Backlinks

- task_type: [[task-type-auto-userprompt]]
- recommendation: [[consensus-accept]]
- voter: [[model-gpt-oss-20b]]
