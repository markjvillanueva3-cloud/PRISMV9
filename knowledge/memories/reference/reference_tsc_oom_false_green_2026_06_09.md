---
name: reference_tsc_oom_false_green_2026_06_09
description: "FLEET-WIDE — bare `npx tsc --noEmit` on mcp-server OOM-aborts (exit 134/SIGABRT) BEFORE completing, emitting few/no errors = a FALSE-GREEN \"tsc clean\". Use the 16GB heap to get the real result."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.229Z
aliases: reference_tsc_oom_false_green_2026_06_09
---


# tsc "clean" can be a false-green from an OOM-aborted run (fleet-wide, observed 2026-06-09 slot:charlie)

## The trap
`cd mcp-server && npx tsc --noEmit` (no heap bump) **exits 134 (SIGABRT, V8 OOM)** on this repo and aborts BEFORE type-checking the whole project. A run that crashes early emits few or zero `error TS` lines, so a chat greps "0 errors" and reports **"tsc clean"** — but tsc never finished. This is a real false-green: a 3-of-3 arm reported "No errors found / 0 error TS lines" ~10 min before I ran the full-heap check.

## The real result
`cd mcp-server && NODE_OPTIONS="--max-old-space-size=16384" npx tsc --noEmit` **completes (exit 2)** and reveals a large PRE-EXISTING baseline of tsc errors across many files (WEDMSetupSheetEngine, cad-validation-corpus, WEDMJobCreator, SpeedFeedNineAxisOrchestrator, shopDispatcher, MillingPhysicsKernel, LatheMasterOrchestratorFacade, QuotingClosedLoopRunnerEngine AccuracyReport shape, etc.). Hundreds of `error TS` lines. (CLAUDE.md mcp-server note: `npm run build` uses a 16GB heap for exactly this reason.)

## How to verify YOUR change is tsc-clean (the honest bar)
You usually cannot zero the whole-project baseline (it's fleet-wide, GOAL-TSC-FIX territory). The correct per-unit bar: run the FULL-HEAP tsc, capture to a file, and grep that your CHANGED files have **0** error lines:
```
NODE_OPTIONS="--max-old-space-size=16384" npx tsc --noEmit > /tmp/tsc.txt 2>&1
grep -E "YourChangedFile\.ts|OtherChanged\.ts" /tmp/tsc.txt   # expect empty
```
Report honestly: "0 new tsc errors in the changed files; pre-existing full-heap baseline out of scope" — NOT bare "tsc clean".

## Why it matters
Additive-only changes (new optional fields/params) cannot cascade, so 0-hits-in-changed-files is sufficient for them. But a chat that runs bare `tsc`, sees exit-134 + no errors, and claims "clean" is making the exact false-loud-pass R12 forbids. Always heap-bump tsc before trusting its exit/error count. Pairs with R12 (fail loud) + [[feedback_verify_actual_contract_not_proxy]].
