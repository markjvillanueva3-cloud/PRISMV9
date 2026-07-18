# ⏸ Qwen3-Coder 30B pull — ON HOLD (operator request 2026-06-04)

Paused mid-download (~75MB/18GB) — operator will resume on **home internet** (work
connection was ~1 MB/s ≈ 5h ETA). DO NOT auto-resume.

**RESUME (when home):**
```
"C:/Users/wompu/AppData/Local/Programs/Ollama/ollama.exe" pull qwen3-coder:30b
```
Then wire Hermes to it (safe, backup + auto-rollback on boot failure):
```
node H:/prism/scripts/wire-hermes-local-backend.mjs --model qwen3-coder:30b --apply
```
Purpose: 64K-native local Hermes workhorse (qwen2.5-coder:32b is only 32K < Hermes's 64K minimum).
