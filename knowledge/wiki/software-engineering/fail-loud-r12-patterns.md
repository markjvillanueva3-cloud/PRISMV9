---
name: fail-loud-r12-patterns
category: software-engineering
domain: backend-dev
tags: [r12, fail-loud, fail-safe, fail-soft, error-handling, ai-development]
last_updated: 2026-05-18
---

# Fail-Loud (R12) Patterns

Doctrine: silence is the worst output. A function that *might* have failed and didn't say so is worse than a function that throws — the silent path corrupts downstream state without anyone knowing. **R12: a result you can't fully verify is uncertainty; surface uncertainty, never hide it.**

## Three failure dispositions, by intent

**Fail-loud** — Wrong inputs / impossible state / corruption detected → throw, log, exit nonzero. The CALLER must learn this happened.

```js
if (!Array.isArray(idx.entries)) {
  throw new Error(`index ${path} corrupted: entries is ${typeof idx.entries}`);
}
```

**Fail-safe** — Operation must continue (Stop hook, telemetry, advisory injector) but the failure must be logged. Never swallow silently.

```js
try {
  appendFileSync(LEDGER, JSON.stringify(record) + "\n");
} catch (e) {
  // Fail-safe: ledger best-effort, but tell operator something failed
  process.stderr.write(`[telemetry] append failed: ${e.message}\n`);
}
```

**Fail-soft** — Optional feature degrades gracefully (Ollama unreachable, model not loaded). Returns a sentinel the caller can detect.

```js
function readGpuState() {
  try { return JSON.parse(execSync("nvidia-smi ...")); }
  catch { return { available: false, reason: "nvidia-smi-unavailable" }; }
}
// caller:
if (!gpu.available) skipGpuCoordination();
```

**Never use "fail-safe" as cover for "fail-silent."** The marker `/* fail-safe */` next to an empty catch block is one of the most-flagged patterns in PRISM reviews — it broadcasts the author chose comfort over correctness.

## Concrete anti-patterns caught in PRISM

- **Migration says "migrated 200 records" but 7 were skipped silently.** Fix: emit `{processed:200, skipped:7, skippedIds:[…]}` always, never just `200`.
- **CLI exits 0 on "no work to do" AND on "couldn't reach the API."** Operator can't tell. Fix: distinct exit codes (`0` clean, `2` validation, `3` infra, `4` write-fail).
- **`process.exit(0)` after a partial write because the temp file was deleted.** Fix: verify the rename succeeded by `existsSync` + size check before declaring success.
- **A scheduled task installed but `Logon Mode: Interactive only`.** Fix: SYSTEM/S4U principal; verify with `Get-ScheduledTask | Select Principal`.

## The "verify it worked" rail

After any write or external action, *verify the change is observable in the next read*. This is the difference between "ran the command" and "the system is now in the new state."

```js
atomicWriteJSON(path, next);
const reread = JSON.parse(readFileSync(path, "utf8"));
if (reread.retaggedCount !== expected) {
  throw new Error(`post-write verification failed: got ${reread.retaggedCount}, expected ${expected}`);
}
```

For UI / browser features: open the dev server, click the feature in a real browser. Type checking is not feature verification.

## R12 vs "summary-first" output

R12 does NOT mean "exit nonzero on every minor edge case." It means **the structured output reflects reality, not the happy path you intended.** A successful run that skipped 3 records IS a success — but the summary must say `skipped:3`, not just `success:true`.

## The hostile-payload corollary

R12 demands you write **as if** an attacker controls every external input. The 2026-05-15 hostile-payload class (greedy `slice(firstBrace, lastBrace+1)` in IdeaBlockExtractor) shipped because the author trusted the LLM-generated input. Treat all I/O as untrusted; validate shape before depending on it.

## Related

- [[karpathy-12-rule-discipline]] — full R1–R12 reference
- [[per-file-scrutiny-gate]] — the gate that catches R12 violations pre-commit
- [[atomic-write-idempotency-patterns]] — write-side R12
- CLAUDE.md §"Recent regressions" — every entry is an R12 lesson
