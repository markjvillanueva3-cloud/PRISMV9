---
policy:
  tier: 2
  triggers:
    - "pre-review"
    - "pre review"
    - "r1 draft"
    - "deepseek draft"
consumes:
  - "prism_ai:pre_review"
  - "prism_context:coord_sqlite"
---
# /pre-review — DeepSeek-R1 drafts, Claude refines

Manual invocation of the **pre-Claude review pattern** (sibling of automatic
hook P22-U02 + engine P22-U01): a local reasoning model (DeepSeek-R1:14b)
produces a first-pass draft + reasoning chain, then Claude reviews / refines /
overrides. Trades 5–30 s of local GPU + 0 Claude tokens (for the drafting step)
against a refinement pass that starts from an explicit reasoning skeleton instead of
a blank slate.

**When this pays:** medium-complex tasks where the *plan* is the hard part —
architecture / multi-file refactor / migration / debugging hypothesis /
spec drafting. Claude still owns final code + the 3-of-3 scrutiny gate.

**When this loses:** trivial prompts (<20 words, single-file edit, name lookup,
yes/no questions). Don't burn 8–12 GB of GPU memory to "draft" a one-line fix.

## Args: `$ARGUMENTS`

```
/pre-review <task>                              # default: deepseek-r1:14b
/pre-review --model <name> <task>               # override model
/pre-review --full-reasoning <task>             # surface up to 2000 chars of <think> chain
/pre-review --system "<prompt>" <task>          # custom system prompt (replaces default)
/pre-review --no-cache <task>                   # skip cache layer (force fresh draft)
/pre-review --allow-fallback <task>             # permit qwen2.5-coder:32b when R1 down
/pre-review --selftest                          # 60 s end-to-end smoke against a fixed prompt
```

Default model is `deepseek-r1:14b`. **Fallback is REFUSED by default** — the
reasoning chain is the load-bearing output and non-reasoning models do not produce
one. Pass `--allow-fallback` only when the operator explicitly accepts losing
the `<think>` chain (Claude will mark `reasoning_present:false` in the surface).
Fallback target: `qwen2.5-coder:32b`.

## Section 1 — Argument extraction (DO NOT use bash word-splitting)

`$ARGUMENTS` is operator-supplied free-form text. **NEVER** parse it with bash
`set` / positional params / unquoted `$ARGUMENTS` expansion — task bodies can
contain `$(...)`, backticks, `&&`, redirects, and quotes that will execute or
break the shell. **Always parse via `node`** with `process.argv` (argv is
binary-clean — no shell interpretation between the operator's text and `node`'s
memory).

Run this FIRST, before any other step. **All of Sections 1–5 SHOULD execute in
a single Bash tool call** so cleanup at end-of-section reliably fires — Claude's
Bash tool spawns a fresh shell per call, so `trap`s do NOT survive across calls.
Cleanup is therefore explicit `rm -f` at the end of every block, not `trap EXIT`.

```bash
# Resolve this chat's stable session id (used for the GPU lock + cache attribution).
STABLE="${STABLE:-$(echo '{}' | node H:/prism/.claude/helpers/stable-session-id.mjs 2>/dev/null || echo unresolved-$$)}"

# Per-call temp paths: use crypto.randomBytes — process.pid collides across chats.
NONCE="$(node -e 'console.log(require("crypto").randomBytes(8).toString("hex"))')"
PR_FLAGS_PATH="$(node -e 'const p=require("path"),os=require("os");console.log(p.join(os.tmpdir(),"pr-flags-"+process.argv[1]+".json"))' "$NONCE")"
PR_PAYLOAD_PATH="$(node -e 'const p=require("path"),os=require("os");console.log(p.join(os.tmpdir(),"pr-payload-"+process.argv[1]+".json"))' "$NONCE")"

# Parse $ARGUMENTS via node's argv — NEVER bash word-splitting.
node -e '
  // argv: [node-binary, "-e", "--", ...operator-args]. Skip first 3.
  // The "--" sentinel is at argv[2]; operator args begin at argv[3].
  const args = process.argv.slice(2).filter(a => a !== "--");
  const flags = { model: "deepseek-r1:14b", full: false, system: null,
                  cache: true, fallback: false, selftest: false };
  const tail = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--model")               flags.model    = args[++i];
    else if (a === "--full-reasoning") flags.full     = true;
    else if (a === "--system")         flags.system   = args[++i];
    else if (a === "--no-cache")       flags.cache    = false;
    else if (a === "--allow-fallback") flags.fallback = true;
    else if (a === "--selftest")       flags.selftest = true;
    else tail.push(a);
  }
  flags.task = tail.join(" ").trim();
  require("fs").writeFileSync(process.env.PR_FLAGS_PATH, JSON.stringify(flags));
' -- "$@"
```

The `-- "$@"` pattern passes argv through node's argv (NOT through bash
interpolation), so `/pre-review --system "$(cat /etc/passwd)" foo` becomes a
literal string `"$(cat /etc/passwd)"` inside `flags.system` — never executes.

**Cleanup**: at the end of every Bash tool call that produces these temp files,
include `rm -f "$PR_FLAGS_PATH" "$PR_PAYLOAD_PATH" "${PR_PAYLOAD_PATH}.resp" "${PR_PAYLOAD_PATH}.parsed" 2>/dev/null`.
On SIGKILL by the harness (which bypasses any cleanup), Claude Code's session-end
sweep handles `/tmp/pr-*` leftovers — but rely on explicit cleanup first.

**Platform note**: this skill is supported under Git Bash (Claude Code's default)
or WSL bash. Raw cmd.exe and PowerShell have different argv-quoting rules and
the `"$@"` pattern may not survive — invoke from Git Bash if running outside
the Claude Code harness.

## Section 2 — Hard preconditions (Claude MUST check before drafting)

Run checks 1–3 in parallel. If ANY fails, refuse the draft and explain.

```bash
# 1. Daemon reachable
curl -fsS -m 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1 \
  && echo "ollama:ok" || echo "ollama:DOWN"

# 2. Target model present (use jq, not grep — JSON shape can drift)
MODEL="${MODEL:-deepseek-r1:14b}"
curl -fsS -m 3 http://127.0.0.1:11434/api/tags 2>/dev/null \
  | jq -e --arg m "$MODEL" '.models[] | select(.name == $m)' >/dev/null \
  && echo "model:ok" || echo "model:missing"

# If --allow-fallback is set, ALSO verify qwen2.5-coder:32b is present:
curl -fsS -m 3 http://127.0.0.1:11434/api/tags 2>/dev/null \
  | jq -e '.models[] | select(.name == "qwen2.5-coder:32b")' >/dev/null \
  && echo "fallback:ok" || echo "fallback:missing"

# 3. GPU not held by another /pre-review (concurrency cap)
node H:/prism/scripts/claim-pre-review-gpu.mjs --session "$STABLE" --ttl 180
# Exits 0 if claim acquired or refreshed; exits 1 if another session holds it.
# If exit 1: refuse with "R1 GPU held by <other-session> — retry in N seconds."
# Falls back to a stamp file in state/shared/pre-review.lock if the script
# doesn't yet exist (this is the P22-U01 wire point — see "Sibling units").
```

### 3a. Task length / complexity gate (Claude evaluates — not bash)

Refuse with a "ask me directly" message if all of:
- task body < 20 words, AND
- no keyword from `{refactor, design, architect, migrate, debug, implement,
  draft, plan, review, audit, optimize, propose, spec, blueprint}`.

This is a token-economy guard — don't burn 8–12 GB of GPU memory for a one-line fix.

## Section 3 — Invoke ollama `/api/generate`

### 3.1 — Build the JSON payload via `node` (NEVER heredoc; NEVER `jq` with shell interpolation)

`$PR_PAYLOAD_PATH` was set in Section 1 with the same `$NONCE` used for
`$PR_FLAGS_PATH`. Re-export it if running this section in a separate Bash tool
call (NOT recommended — chain Sections 1–5 in one Bash call when possible).

```bash
# Read flags written in Section 1, build payload via node (no shell substitution).
node -e '
  const fs = require("fs");
  const flags = JSON.parse(fs.readFileSync(process.env.PR_FLAGS_PATH, "utf8"));
  const DEFAULT_SYSTEM = `You are a senior staff engineer drafting an implementation
plan for a peer review by a more capable model. Produce:
1. A 5–15 step plan (numbered, imperative).
2. The 1–3 highest-risk failure modes.
3. The 1–3 places you are MOST uncertain.
4. Explicit dependencies / preconditions.
Be concrete: cite file paths, function names, schema fields when known.
DO NOT write the actual code — only the plan. The reviewing model will write code.`;
  const payload = {
    model:  flags.model,
    prompt: flags.task,
    system: flags.system ?? DEFAULT_SYSTEM,
    stream: false,
    options: {
      num_predict: 2500,    // headroom: ~1000 think + ~1500 plan; v1 used 1500 — too tight
      temperature: 0.6,     // R1 reasoning-mode threshold (DeepSeek doc); v1 used 0.2 — too cold
      top_p: 0.95
    }
  };
  fs.writeFileSync(process.env.PR_PAYLOAD_PATH, JSON.stringify(payload));
'
```

### 3.2 — Send the request

Claude **MUST** call the Bash tool with `timeout: 200000` (200 s ms) on this
step. The default Bash timeout is 120 s, which is below R1:14b's cold-start
ceiling. The skill's documented kill point is 180 s wall-clock; the +20 s
buffer is for curl teardown.

```bash
curl -fsS -m 180 \
  -X POST http://127.0.0.1:11434/api/generate \
  -H 'Content-Type: application/json' \
  --data-binary "@$PR_PAYLOAD_PATH" \
  > "${PR_PAYLOAD_PATH}.resp"
```

If `curl -m 180` kills the request, the skill must (a) report the timeout to the
operator, (b) `rm` the half-written `.resp` (the `trap` in Section 1 handles this),
(c) NOT silently retry — wedged-R1 is a real failure mode the operator needs to see.

Empirical timing on a 12 GB consumer GPU: 8–25 s warm, 30–60 s cold-load,
60–120 s under GPU contention. >120 s = check `ollama ps` for stuck loads.
>180 s = curl-killed; restart daemon.

### 3.3 — Parse R1's response

R1 wraps its reasoning in `<think>...</think>`, then the final answer follows.

```bash
node -e '
  const r = JSON.parse(require("fs").readFileSync(process.env.PR_PAYLOAD_PATH+".resp", "utf8"));
  const body = r.response ?? "";
  const m = body.match(/<think>([\s\S]*?)<\/think>([\s\S]*)/);
  const reasoning = m ? m[1].trim() : "";
  const draft     = m ? m[2].trim() : body.trim();
  const out = {
    reasoning_present: m !== null,
    reasoning_chain:   reasoning,
    draft:             draft,
    wall_ms:           Math.round((r.total_duration ?? 0) / 1e6),
    tokens_predicted:  r.eval_count ?? 0,
    model:             r.model,
  };
  require("fs").writeFileSync(process.env.PR_PAYLOAD_PATH+".parsed", JSON.stringify(out));
  console.log(JSON.stringify({wall_ms: out.wall_ms, tokens_predicted: out.tokens_predicted, reasoning_present: out.reasoning_present}));
'
```

If `reasoning_present: false`, the model didn't engage reasoning mode. This
shouldn't happen at `temperature: 0.6` — if it does, retry with `temperature: 0.7`
or escalate to qwen2.5-coder:32b (`--allow-fallback`).

## Section 4 — Confidence heuristic (Claude judges, with path verification)

Claude grades the draft on three tiers. **Path verification is mandatory** —
R1 happily cites `mcp-server/src/engines/FrobnicatorEngine.ts` that doesn't
exist; a draft with all-fictional paths is `low`, not `high`.

```
high   — draft cites concrete PRISM-real file paths (verified via Glob/ls;
         each cited path under H:/prism/* must exist), names ≥1 failure mode
         AND ≥1 uncertainty, length 300–2500 tokens, no contradictions.
medium — draft is structurally complete but generic (no PRISM-specific paths),
         OR cites paths but omits failure modes / uncertainties.
low    — draft is < 200 tokens, OR all cited paths are fictional, OR
         contradicts itself, OR R1 emitted boilerplate ("First, we should
         consider..."), OR `<think>` was empty / absent.
```

Path verification: Claude `Glob`s or `ls`-checks every cited path under
`H:/prism/*` before grading. If ANY path is fictional, the rating cannot
exceed `medium`. If ALL cited paths are fictional, the rating is `low`.

Confidence is a **Claude judgment**, not a model-emitted number — R1 doesn't
calibrate well on its own self-assessment.

## Section 5 — Surface to the operator

Print exactly this shape (operator-readable, parseable by future hooks):

```
## /pre-review draft

**Task:** <task — first 200 chars>
**Model:** deepseek-r1:14b · **Wall:** Ns · **Tokens:** N (eval) · **Confidence:** <high|medium|low>
**Reasoning present:** <true|false> · **Cited paths verified:** <X of Y exist>

### Reasoning chain (summary)
<3–6 bullet points distilled from <think>. Full chain shown below if --full-reasoning.>

### Draft
<verbatim text after </think>>

### Claude will refine
<one-paragraph plan for what Claude does next: which steps to keep, which to
change, which to drop. THIS is the load-bearing part — the draft is just the
prompt for Claude's actual plan.>

---
<if --full-reasoning>
### Full reasoning chain (truncated at 2000 chars — full at $PR_PAYLOAD_PATH.parsed)
<first 2000 chars of <think> contents — older drafts in cache>
</if>
```

`--full-reasoning` is **capped at 2000 chars** in the surface (about 500 tokens
in Claude context). The full chain stays in `$PR_PAYLOAD_PATH.parsed` on disk
for the operator to inspect manually. Without the cap, a verbose R1 chain on a
hard problem can push net context spend above 6 K tokens.

## Section 6 — Iterate / accept (stop-and-wait)

After surfacing, **stop and wait** for the operator. Don't auto-implement.
The operator either accepts ("ok, do it"), revises ("change step 3 to..."), or
discards ("never mind, I'll do it myself"). Only on explicit acceptance does
Claude write code.

## Cache layer (optional — REQUIRES H8 coordination store)

If `H:/prism/state/shared/pre-review-cache.json` exists, hash the
`(model, system, task)` triple and check for a prior draft within the last 24 h
before re-invoking R1. The cache MUST use the H8 SQLite WAL store (`coordination.db`)
for read-modify-write protection — 6 concurrent chats sharing a single JSON
file is the exact race condition the H8 CoordinationStoreEngine was built to
eliminate. **Do NOT use a bare JSON file with `cat | jq | cat >` semantics**.

Cache flow:
1. Compute `key = sha256(JSON.stringify([model, system, canonicalize(task)]))`
   — JSON encoding is collision-resistant: a NUL or quote in any field is
   escaped before hashing, so `(system="foo\x00bar", task="hello")` and
   `(system="foo", task="bar\x00hello")` produce distinct keys. **Do NOT**
   use a NUL-delimited or any other delimiter-joined plaintext scheme — those
   collide on adversarial input.
2. Acquire `prism_context:coord_sqlite claim` on `pre-review:cache:<key>` (TTL 5s)
3. Read cache row (mtime-checked)
4. On hit + age < 24h: surface with `(cache hit, age Xm, originator: <chat-id>)`
5. On miss: invoke R1, write row back, release claim
6. Cap 100 entries, LRU eviction.

Canonicalization: strip leading/trailing whitespace, collapse internal runs to
single space, lowercase ONLY the task body. The default system prompt is
treated as a literal constant and excluded from canonicalization. The
operator-supplied `--system` stays case-sensitive (tone often matters).

`--no-cache` skips this layer entirely.

## Exit conditions checklist (per P22-U03 envelope)

- [x] `/pre-review <task>` invokes DeepSeek-R1 draft path  (Section 3 curl `/api/generate`)
- [x] Returns draft + confidence + reasoning chain          (Section 5 surface)
- [x] Claude can iterate on the draft                        (Section 6 stop-and-wait)

## Sibling units / wire path

This skill is the manual entry to the pre-review pattern. Two siblings will land
later in the same milestone (`INTEL-OLLAMA-OBSIDIAN-MS0`):

- **P22-U01 — FUTURE — `PreReviewOrchestratorEngine.ts`**: programmatic API for
  the same flow (used by hooks, dispatchers, batch jobs). Wired as
  `prism_ai:pre_review`. **Status: not yet built** — verified absent at
  `H:/prism/mcp-server/src/engines/PreReview*.ts`. Once this lands, replace
  Section 3.1's raw `node -e` payload-builder with a single dispatcher call.
- **P22-U02 — FUTURE — `pre-claude-review-inject.mjs`**: UserPromptSubmit hook
  that *auto*-invokes pre-review for medium-complex prompts (no `/pre-review`
  typed). **Status: not yet built** — verified absent at
  `H:/prism/.claude/hooks/pre-claude-review*.mjs`. Classifier: word count +
  keyword set + diff size if Edit/Write detected.
- **`scripts/claim-pre-review-gpu.mjs` — FUTURE** (referenced from Section 2
  step 3): wrapper around `prism_context:coord_sqlite claim` for the
  `pre-review:r1-gpu` lock. Until it ships, the skill falls back to a stamp
  file at `state/shared/pre-review.lock` (atomic write via `node -e
  'fs.writeFileSync(path, JSON.stringify({...}), {flag:"wx"})'` — `wx` fails
  if file exists, giving us free mutex semantics).

When U01 ships, update Section 3.1 here to call the engine. When U02 ships, this
manual skill remains useful for *explicit* drafting (e.g. when you want a
draft on a SIMPLE task the auto-classifier would have skipped).

<!-- WIRE-POINT: P22-U01 — when PreReviewOrchestratorEngine lands, the entire
Section 3 (3.1 payload-build + 3.2 curl + 3.3 parse) collapses to a single
`mcp__prism_safe__prism_ai action=pre_review` call. Leave this comment to find
the swap site. -->

## Self-test (`--selftest`)

Run a 60 s end-to-end smoke against a fixed prompt. Asserts daemon up, model
present, `<think>` parses, confidence grades, no temp-file leak.

```bash
# Synthetic prompt with all-real PRISM paths (so confidence grade is testable)
node H:/prism/.claude/commands/_pre-review-selftest.mjs
# (script doesn't exist yet — Claude inlines the equivalent for now)
```

Inline version Claude runs when `--selftest` is passed:
1. Hardcoded task: `"Draft a 5-step plan to add a new dispatcher action 'foo' to mcp-server/src/tools/dispatchers/devDispatcher.ts."`
2. Hardcoded model: `deepseek-r1:14b`
3. Run Sections 1–5 verbatim. Capture wall time + tokens + confidence.
4. Assert: `reasoning_present === true`, `tokens_predicted >= 100` (lower bound
   that still catches genuinely-empty responses — R1 on a warm GPU can answer
   a 5-step plan in ~150–180 tokens, so 200 was too tight),
   `wall_ms <= 60000` (warm) or `wall_ms <= 120000` (cold-load),
   `confidence in {high, medium}` (low = failure).
5. Print `SELFTEST: OK` or `SELFTEST: FAIL — <reason>`.
6. Clean up temp files.

## Token economy (honest accounting)

R1:14b drafting cost is ~0 Claude tokens (it's local). Surfacing the draft costs:
- Default (no `--full-reasoning`): 600–2500 Claude context tokens
  (task echo + summary bullets + draft body + confidence + refinement plan)
- With `--full-reasoning`: +500–700 tokens (the 2000-char cap)

Refinement adds another 1–3 K. **Honest net spend per /pre-review:**
- Without `--full-reasoning`: **2–5 K Claude tokens** vs **5–15 K** from scratch
- With `--full-reasoning`: **3–6 K Claude tokens** vs **5–15 K** from scratch

The savings are real when the *plan* is the hard part. If R1's draft is
`confidence:low`, **don't refine it** — start over with Claude. Refining a bad
draft costs more tokens than producing a fresh one.

## Why deepseek-r1:14b specifically

Two non-substitutable properties:

1. **Explicit reasoning chain** (`<think>` wrap): Claude reads the chain
   and can target *exactly* the weakest reasoning step in refinement. With a
   non-reasoning model (qwen2.5-coder, llama3) Claude only sees the answer and
   has to re-derive *why* it's right or wrong.
2. **Smaller bias toward "looks reasonable" code**: R1 happily says "I don't
   know how to handle case X" — qwen2.5-coder more often hallucinates a
   plausible-but-wrong API call. For drafting a *plan* (not code), the
   honesty matters more than the code accuracy.

If R1 is replaced with a newer reasoning model (`deepseek-r2`, `qwq:32b`),
update the default in this file's Args section + Section 3.1 payload-build.
The pattern (think-tag parsing, confidence heuristic, stop-and-wait) survives
the model swap.

## Failure modes (operator-facing)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ollama:DOWN` | daemon not running | `docker compose up -d ollama` or check the autostart launcher |
| `model:missing` | deepseek-r1:14b not pulled | `ollama pull deepseek-r1:14b` (8.9 GB download) |
| `fallback:missing` | qwen2.5-coder:32b not pulled but --allow-fallback set | `ollama pull qwen2.5-coder:32b` or drop the flag |
| GPU claim held | another /pre-review running in peer chat | wait or check `state/shared/pre-review.lock` for owner |
| Wall > 60 s, GPU at 100% | model still loading or contention with another `/pre-review` | wait or retry — model stays warm for ~5 min |
| `<think>` block empty | R1 didn't engage reasoning mode at `t=0.6` | retry with `temperature: 0.7` or fall back to qwen2.5-coder:32b |
| Wall > 180 s | curl killed by timeout | check `ollama ps` for stuck loads, restart daemon if model state is stale |
| Draft refuses task / safety-blocks | R1 quirk on edge prompts | retry with a more neutral system prompt or escalate to Claude directly |
| `Cited paths verified: 0 of N` | R1 hallucinated paths | demote to `low`, don't refine — re-draft with Claude |
| Bash tool timed out at 120s | Claude forgot to pass `timeout: 200000` | re-invoke with explicit Bash timeout |
| `/tmp/pr-*` files leaking | Harness SIGKILL'd the shell — POSIX traps don't fire on SIGKILL | rely on Claude Code's session-end temp sweep; for explicit cleanup, chain Sections 1–5 in a single Bash call so end-of-block `rm -f` always fires |
| `flags.task` starts with `--` | Old version pre-fix sliced argv at the wrong offset | re-run — fixed in v3 with `slice(2).filter(a => a !== "--")` |
| Cache key collision on NUL-byte input | Old plaintext-delimiter key — fixed | re-run — v3 uses `sha256(JSON.stringify(...))` |

## Notes for Claude

- **DO NOT** auto-call this skill on every prompt. The auto-trigger is P22-U02
  (UserPromptSubmit hook), and even *that* is gated to medium-complex prompts.
  Manual `/pre-review` is for when the operator explicitly types it.
- **DO** include the model wall-time + token count + cited-paths-verified count
  in your surface — these are the signals the operator uses to decide whether
  to keep using this for similar tasks.
- **DO NOT** edit the draft before surfacing. Print R1's draft verbatim, then
  put your own commentary in the "Claude will refine" section. Mixing the two
  destroys the operator's ability to evaluate the model.
- **DO** acknowledge when R1's draft beats your own first-pass thinking — and
  when it doesn't. The pattern is only worth running if it's actually adding signal.
- **DO** pass `timeout: 200000` (in ms) to the Bash tool on Section 3.2 — the
  default 120 s harness ceiling is below R1's cold-start wall.
- **DO** clean up temp files via the explicit `rm -f` at the end of every Bash
  block in Sections 1–5 — never leave `/tmp/pr-flags-*.json` /
  `/tmp/pr-payload-*.json` / `/tmp/pr-payload-*.resp` behind across chat
  sessions. POSIX `trap EXIT` does **not** survive across separate Bash tool
  calls (each is a fresh shell) and does **not** fire on SIGKILL, so explicit
  cleanup at end-of-block is load-bearing — not `trap`.
- **DO** chain Sections 1–5 in a single Bash tool call when possible — keeps
  `$NONCE` / `$PR_FLAGS_PATH` / `$PR_PAYLOAD_PATH` / `$STABLE` env vars alive
  through the full draft-and-parse flow without needing to re-export.
