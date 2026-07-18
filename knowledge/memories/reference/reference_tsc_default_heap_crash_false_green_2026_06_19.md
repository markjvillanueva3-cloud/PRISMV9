---
name: reference_tsc_default_heap_crash_false_green_2026_06_19
description: "Default-heap `npx tsc` CRASHES (exit 134 V8 SIGABRT) on the mcp-server codebase; rtk + grep misread the crash as \"0 errors\" -- a silent false-green. Always verify tsc with a 16GB heap."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.229Z
aliases: reference_tsc_default_heap_crash_false_green_2026_06_19
---


# tsc default-heap crash misreported as "0 errors" (silent false-green, slot:papa 2026-06-19)

**Symptom:** during a papa BUILD-QUALITY tsc-fix loop, the first cold `rtk npx tsc -p tsconfig.json --noEmit`
reported **54 errors in 30 files** (real). Every subsequent run -- warm rtk, raw `npx tsc`, even
`--incremental false` -- reported **"No errors found" / 0**, while the original error sites
(`selectStrategy`, `insertChangeSchedule`, `sinker_spark_gap`) were STILL on disk and unfixed.

**Root cause (proven by exit code):** `command npx tsc -p tsconfig.json --noEmit > out.txt 2>&1; echo $?`
returned **exit 134** with a V8 native crash trace (`v8::internal::ThreadIsolation...`, `BIO_ssl_shutdown`)
-- NOT a clean type-check. The default node heap (~2-4GB) is exhausted on this codebase's full program
type-check, so tsc ABORTS before emitting diagnostics. There are no `error TS` lines in a crash dump, so:
- `grep -cE "error TS"` returns **0** (no matches != no errors -- the run crashed).
- rtk's tsc filter prints **"TypeScript: No errors found"** for the same reason.

Both tools silently convert a CRASH into a green "0 errors" -- a false-green that invalidates any
tsc-fix loop trusting them. (`incremental:true` + `.tsbuildinfo` is a SEPARATE, compounding trap: warm
`--noEmit` runs under-report unchanged-file diagnostics; removing `.tsbuildinfo` did NOT fix the 0 here --
the crash did.)

**Fix / standing rule (fleet-wide, papa + every build chat):**
Verify tsc ONLY with a generous heap, and ALWAYS check the exit code:
```bash
cd mcp-server && export NODE_OPTIONS=--max-old-space-size=16384
command npx tsc -p tsconfig.json --noEmit --incremental false > /tmp/tsc.txt 2>&1
echo "exit=$?"; grep -cE "error TS" /tmp/tsc.txt   # exit 2 = real errors; exit 134 = CRASH, count is a lie
```
- `exit 0` = genuinely clean. `exit 2` = type errors (trust the count). `exit 134`/non-{0,2} = CRASH -- the
  count is meaningless; re-run with a bigger heap.
- This is the Blackwell "never fight a low default" doctrine ([[feedback_build_for_blackwell_hardware]]) in
  practice: the box has 136GB RAM; a 16GB tsc heap is free. The packaged `npm run build` already sets a
  16GB heap -- ad-hoc `npx tsc` does NOT.

**Live numbers this session (heap-verified):** cold 54 -> 49 (U-TSC-LITERAL-CONTRACT-49) -> 45
(U-TSC-CONTRACT-45). ~16-20 of the remaining 45 are orchestration engines calling never-implemented
methods (DARK engines), not type noise -- see the session handoff triage.

Related: [[feedback_build_for_blackwell_hardware]] · [[feedback_verify_actual_contract_not_proxy]] (a proxy
-- here a grep over a crash dump -- is not the real signal) · R12 fail-loud.
