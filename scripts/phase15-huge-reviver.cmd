@echo off
REM ── PRISM Docustra Phase-15 huge-chunked daemon reviver ───────────────────────
REM Self-gating: if the completion summary exists, the huge pass is DONE — exit.
REM Otherwise (re)start the daemon. daemon-supervisor 'start' is idempotent: it is
REM a no-op if the PID in state/shared/daemons/phase15-huge.json is still alive, and
REM the python script resumes by skipping doc_ids already in the OUT jsonl (zero rework).
REM Invoked every 10 min by the "PRISM Docustra Phase15-Huge Reviver" scheduled task.
REM DELETE that task (schtasks /delete /tn "PRISM Docustra Phase15-Huge Reviver" /f)
REM and this file once phase16-blueprint-program-join-v5.py has been re-run on the
REM final jsonl. Created 2026-05-12 by claude-c47ec810 (slot charlie).
if exist "H:\prism\Docustrata\.index\phase15-huge-chunked-summary.md" exit /b 0
"H:\Tools\nodejs\node.exe" "H:\prism\scripts\daemon-supervisor.mjs" start phase15-huge -- "H:\Tools\python\python.exe" "H:\prism\Docustrata\.index\phase15-deep-rescan-huge-chunked.py" 0 1
