---
title: Arming a long Ollama corpus drain as an autonomous scheduled task
type: lesson
domain: ai-training
slot: india
created: 2026-06-24
tags: [tribal-knowledge, ollama, scheduled-task, corpus-drain, resumable, R5, R15]
related:
  - "[[reference_resources_tribal_drain_armed_2026_06_24]]"
  - "[[pdf-tribal-hermes-u-pdf-tribal-hermes]]"
---

# Arming a long Ollama corpus drain as an autonomous scheduled task

## Lesson
A bulk "learn the whole corpus" op (thousands of PDFs -> Ollama tip-gen -> index)
must NOT be a single in-context Claude run: it blows the session limit, burns no
Claude value (it's mechanical -- R5), and dies on any reaper/session kill. The
right shape is a **resumable bounded-batch script + a recurring scheduled task**:
the script does N items per run with a cursor + run-lock; the task fires it every
~interval; progress compounds unattended at $0 Claude. When the operator says
"run the /learn pipeline on all of X", the deliverable is: enumerate X (count),
RUN the existing pipeline (do not rebuild), and ARM the recurring task -- then
report covered-vs-total honestly (R12); a multi-day drain is "progressing", not "done".

## Three load-bearing details (each was a real bug this fire)
1. **Cap per-item work or one fat item stalls the whole run.** A single giant
   catalog PDF's chunks exceeded ~290s of qwen2.5-coder:32B tip-gen -> the run
   produced ZERO tips and the task's `ExecutionTimeLimit` killed it mid-item.
   Adding `--max-chunks-per-doc 30` (and a small `--max-pdfs`) turned delta-0 into
   +33 tips. On a scheduled drain, bound BOTH the batch size and the per-item work
   so a run always finishes inside its interval.
2. **Exec the real `node.exe` directly, not a `.cmd` shim.** A scheduled task (and
   any non-shell launcher) should `-Execute node.exe -Argument "<script> <args>"`.
   Routing a `portable-node.cmd` shim through `cmd /c "..."` invites nested-quote
   path mangling. (Bonus trap: a git-bash `cmd //c "H:/forward/slash"` test is NOT
   how Task Scheduler launches it -- MSYS munges the path and gives a false
   MODULE_NOT_FOUND. Validate against the real launcher, not a bash proxy.)
3. **Per-user task = no elevation; SYSTEM task = admin.** `New-ScheduledTaskPrincipal
   -LogonType Interactive -RunLevel Limited` (current user) registers without admin
   -- right for a dev-automation drain. Reserve the SYSTEM principal (and its
   elevation requirement) for fleet-infra like the reaper. Never assign to `$args`
   in PowerShell (reserved automatic variable) -- use a named `$taskArgs`.

## Concrete case (U-TRIBAL-DRAIN-TASK, 2026-06-24)
`scripts/install-resources-tribal-drain-task.ps1` arms zulu's
`drain-resources-tribal.mjs` (`PDF-TRIBAL-HERMES`) -- a resumable Ollama-first
resources-PDF -> tribal-tip -> `tribal-embed-index.json` drainer -- as a per-user
20-min task. zulu's unit documented "a scheduled task can run it" but never shipped
the task; this is that missing R15 autonomy wire. Corpus: 4338 resource PDFs (incl
196 MIT-course PDFs that live under `resources/`, so already indexed). The drain
feeds the tribal-injection index, so the corpus compounds into every slot's
tribal-by-domain prompt context.

## Why it matters
"Run the pipeline on everything" + a 4000-item corpus + a per-item LLM cost is a
classic place to either (a) try it all in one context and crash, or (b) claim it's
done after a sample. The honest, durable answer is an armed resumable task that
makes bounded progress forever, reported as covered-vs-total with real numbers.
