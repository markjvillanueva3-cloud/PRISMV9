# HANDOFF: Claude-claude-f5ac2338
Updated: 2026-04-24T18:50:18.673Z
Family: Claude | Machine: MARKV | Session: claude-f5ac2338

## STATE
Crashed twice. Detached batch + qwen3-coder:30b pull launched via PS Start-Process. Need survival check + cron setup.

## RESUME
CRITICAL FIRST: verify two detached background processes survived two crashes. (1) PowerShell: Get-Process python -EA SilentlyContinue (PRISM PDF batch was PID 23848 from H:/prism/cad-engine/scripts/batch_extract.py, writing to H:/prism/cad-engine/batch.log). (2) PowerShell: Get-Process curl -EA SilentlyContinue (qwen3-coder:30b pull was PID 13544, writing to H:/prism/cad-engine/qwen3-pull.log — was at 5%/922MB of 18557MB before crash). If batch python is DEAD, relaunch: Start-Process -FilePath 'H:/prism/cad-engine/.venv/Scripts/python.exe' -ArgumentList 'H:/prism/cad-engine/scripts/batch_extract.py' -RedirectStandardOutput 'H:/prism/cad-engine/batch.log' -RedirectStandardError 'H:/prism/cad-engine/batch.err' -WindowStyle Hidden -PassThru. Script auto-skips already-done PDFs (safe). If pull DEAD, relaunch: Start-Process -FilePath curl.exe -ArgumentList '-sN','-X','POST','http://localhost:11434/api/pull','-H','Content-Type: application/json','--data-binary','@H:/prism/cad-engine/pull-body.json' -RedirectStandardOutput 'H:/prism/cad-engine/qwen3-pull.log' -RedirectStandardError 'H:/prism/cad-engine/qwen3-pull.err' -WindowStyle Hidden -PassThru. SECOND: report status — Glob H:/prism/cad-engine/knowledge_store/*.json for done count, parse last JSON line of qwen3-pull.log for pull%. THIRD: user wants 15-min cron updates — CronCreate cron='7,22,37,52 * * * *' recurring=true prompt runs 'H:/prism/cad-engine/.venv/Scripts/python.exe H:/prism/cad-engine/scripts/batch_status.py' and reports tight summary. CONTEXT: 23 of 43 CAM PDFs done pre-crash (713 pages, 1130 tips). 20 / ~4769 pages remaining on qwen2.5-coder:7b. User considering qwen3-coder:30b for re-extract pass after batch finishes. CAM_Manual 1632p still deferred (user runs overnight separately). qwen3.5 doesn't exist on Ollama (Alibaba skipped from 2.5 to 3).

## CONTEXT

