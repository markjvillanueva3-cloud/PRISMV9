---
title: node fetch() fails on localhost Ollama on this host -- use curl
type: lesson
domain: infra
slot: whiskey
date: 2026-06-26
tags: [ollama, node, fetch, undici, curl, localhost, tribal-ingest]
---

# node `fetch()` fails on localhost Ollama on this host -- use curl

## Finding (verified 2026-06-26, slot:whiskey)

On this host (DESKTOP-N7MI1VB), node's built-in `fetch` (undici) **fails** to reach the
local Ollama server at `http://127.0.0.1:11434`, while **curl reaches it fine**. Observed
building the lathe tribal ingest (`scripts/lathe-tribal-ollama-ingest.mjs`):

- `curl -s http://127.0.0.1:11434/api/generate -d '{...}'` -> HTTP 200 in 0.26s (warm model).
- node `fetch("http://127.0.0.1:11434/api/generate", {...})` -> `TypeError: fetch failed`
  (connection-level, NOT an HTTP error), even immediately after the curl pre-warm succeeded.
- `scripts/ask-ollama.mjs`'s exported `callOllama()` (also node `fetch`) returned the same
  `fetch failed` once the model was warm (and a 300s `timed out` while the model was cold --
  the cold connection HELD then aborted, masking the same underlying issue).

## Relationship to the known localhost->IPv6 finding (EXTENDS it -- not a dup)

PRISM already documents [[reference_ollama_localhost_ipv6_fetch_fail_2026_06_09]] +
[[reference_ollama_hooks_localhost_ipv6_bug_2026_05_30]] + the `localhost-ollama-hardcode-guard`
hook: node `fetch` resolves `localhost` to IPv6 `::1` first, Ollama binds IPv4 only ->
ECONNREFUSED. Their fix: use `127.0.0.1`, not `localhost`.

**This case EXTENDS that finding:** the ingest already used the literal `http://127.0.0.1:11434`
(IPv4, NOT localhost) and node `fetch` STILL failed -- so it is NOT only the localhost->IPv6
resolution issue. Likely an `HTTP(S)_PROXY` / `ALL_PROXY` env var undici honours for 127.0.0.1
but curl bypasses, or another undici quirk. The curl-subprocess workaround below is the ROBUST
fix that holds even when 127.0.0.1 also fails -- prefer it for script-side Ollama calls over
chasing the specific undici cause.

## Fix (use it for ALL local-Ollama calls in scripts on this host)

Call Ollama via a **curl subprocess**, passing the JSON body on **stdin** (`-d @-`) to dodge
Windows command-line arg-length limits on large prompts:

```js
import { spawnSync } from "node:child_process";
const payload = JSON.stringify({ model, prompt, stream: false, keep_alive: "15m",
  options: { temperature: 0.2, num_ctx: 8192, num_predict: 2048 } });
const cr = spawnSync("curl",
  ["-s", "-m", "280", "http://127.0.0.1:11434/api/generate", "-H", "content-type: application/json", "-d", "@-"],
  { input: payload, encoding: "utf8", timeout: 300000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
const resp = JSON.parse(cr.stdout).response;
```

VALIDATED: this path extracted 15 real tribal tips from the Okuma OSP-P200L manual where
node `fetch` had failed.

## Lesson

When a local-service call "fetch failed" in node but `curl` to the same URL works, do not
keep debugging undici -- route the call through a `curl` subprocess (proven path) and move on.
Pre-warming proves the server is up; if `fetch` still fails after a warm pre-warm, the problem
is the node HTTP client, not the model.

Related: [[reference_whiskey_kienzle_closed_loop_u_w2_2026_06_26]] · `scripts/lathe-tribal-ollama-ingest.mjs` · `scripts/ask-ollama.mjs` (`callOllama`).
