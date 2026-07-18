---
name: reference_resources_tribal_drain_armed_2026_06_24
description: India armed zulu's resources->tribal drain as an autonomous per-user scheduled task (operator "run the hermes /learn pipeline on all CAD/eng + MIT/college sources"). Corpus enumeration + the load-bearing chunk-cap + node.exe-direct lessons.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.145Z
aliases: reference_resources_tribal_drain_armed_2026_06_24
---


# Resources tribal-drain ARMED (autonomous /learn pipeline) -- india 2026-06-24

Operator: "run the hermes /learn pipeline on all CAD and engineering sources in
H:\PRISM\resources and all other sources from MIT and other college courses."

## The pipeline already exists -- RUN it, don't rebuild (R8)
`scripts/drain-resources-tribal.mjs` = zulu's `PDF-TRIBAL-HERMES/U-TRIBAL-OVERNIGHT-DRAIN`
(2026-06-24): resumable, Ollama-first ($0 Claude), bounded-batch drain of the
resources-PDF index -> tribal tips -> `tribal-embed-index.json` (the L1 index that
feeds tribal INJECTION -- exactly what the operator means by "adding tribal knowledge
injections"). Steps: pick next-not-attempted text PDFs -> extract text layer ->
chunk -> Ollama tip-gen (`generate-pdf-tribal-tips-hermes.mjs --ollama-only`) ->
embed delta (hash-skip). Cursors: attempted-PDF + chunk-sha8 + embed-hash. Run-lock
(skip-if-fresh, dead-PID aware). `--status` = progress only.

## Enumeration (ALL-MEANS-ALL)
`drain --status`: **totalPdfs 4338**, attempted ~152, **remaining ~4189**, drained 99,
**tips 3450** (was 3417; +33 this fire). The 196 `MIT COURSES/` PDFs live UNDER
`H:/PRISM/resources/` so they are ALREADY in `mcp-server/data/state/cad-cam-resources-pdf-index.json`
-- the resources drain COVERS the MIT courses; no separate pipeline needed for them.
(`PRISM_ULTIMATE_KNOWLEDGE_DATABASE_107_COURSES_COMPLETE.md` is a derived .md, not raw
PDFs; Docustrata is juliett's JM corpus, not courses.) Scans (non-text PDFs) are
marked done -- they need the vision-OCR pipeline (xray), a separate lane.

## What india shipped: the autonomy WIRE (zulu's drain had no scheduled task)
`scripts/install-resources-tribal-drain-task.ps1` (commits 0810d3995b + fix 454cf4127d).
Registers per-user task **"PRISM Resources Tribal Drain"**, every 20 min,
`node.exe "drain-resources-tribal.mjs" --max-pdfs 4 --max-chunks-per-doc 30`.
`-Unregister` / `-RunNow` / idempotent `-Force`. Re-run to change cadence/batch.

## LESSONS (load-bearing)
1. **`--max-chunks-per-doc` cap is LOAD-BEARING.** Without it, ONE giant catalog PDF's
   chunks exceed ~290s of qwen2.5-coder:32B tip-gen -> the run produces ZERO tips
   (delta 0) and a 20-min ExecutionTimeLimit kills it mid-PDF. WITH `--max-chunks-per-doc 20`
   a bounded batch produced +33 tips in <290s. Always cap per-doc work on a scheduled drain.
2. **Scheduled task must exec `node.exe` DIRECT, not the `portable-node.cmd` shim.** The
   `.cmd` shim is for interactive PATH use. (My first MODULE_NOT_FOUND was actually a
   git-bash `cmd //c` + forward-slash MSYS path-munging artifact of the TEST, NOT a real
   .cmd-branch defect -- analyst reproduced the .cmd branch working via Start-Process. But
   node.exe-direct is cleaner, shim-independent, and is the validated path.) Installer
   prefers `H:/Tools/nodejs/node.exe`.
3. **Per-user task = NO elevation.** `New-ScheduledTaskPrincipal -LogonType Interactive
   -RunLevel Limited` (current user) registers non-elevated. Contrast the fleet-reaper
   task (SYSTEM principal) which REQUIRES admin. PS automatic var `$args` is reserved --
   never assign to it (use `$taskArgs`).
4. **Throughput is the bottleneck, not coverage.** At ~min/PDF (32B model), the 4189
   remaining is a MULTI-DAY background drain at 4 PDFs/20min. Accelerate via larger manual
   batches (`node drain-resources-tribal.mjs --max-pdfs N --max-chunks-per-doc M`) or higher
   `PRISM_TRIBAL_DRAIN_CONCURRENCY` on the Blackwell GPU. The scheduled task is the steady floor.

## R14 note (+ a correction of my own over-broad sweep)
A `TaskStop` on a background drain kills the pipe WRAPPER but the detached `node` child
(+ its Ollama/python subprocesses) SURVIVES, holds the run-lock, and shows up as an
orphan (PID 76588 this fire). Kill the real PID + clear `state/shared/pdf-tribal-tips/resources-drain.lock`.

**MISTAKE (R12, 2026-06-24):** once the SCHEDULED TASK is armed, a BLANKET "kill every
node proc matching drain-resources-tribal|generate-pdf-tribal" is WRONG -- it kills the
TASK's healthy in-flight run too. I did this and killed the task's active run (PIDs
72108/83636) + cleared its lock while it was legitimately draining (it had just banked
+51 tips, 3450->3501). Recoverable (drain is resumable; the task fired again at 13:30,
LastResult 0) but it cut a good run short. RULE: after the task is armed, do NOT blanket-kill
drain procs. Scope any R14 sweep to PIDs YOU spawned (track the bg task's own PID), or first
check `Get-ScheduledTaskInfo` State!=Running and the run-lock isn't fresh. The armed task
OWNS continuation -- let it run; manual batches just collide (the run-lock makes them skip,
which is the correct, harmless outcome -- no need to "clean up" after a skip).
