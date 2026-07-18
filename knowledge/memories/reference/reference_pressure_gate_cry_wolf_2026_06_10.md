---
name: pressure-gate-volatility-2026-06-10
description: "Commit-memory pressure gate readings are VOLATILE, not cry-wolf: Ollama llama-server commits the FULL resident model size as Windows commit charge (59.4GB for a 32b; ~0.3GB for nomic only), so commit swings 60-96% as keep_alive loads/evicts large models. A gate spike + a seconds-later trough are BOTH real. Reconciles the 2026-06-08 keep-alive leak finding."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.121Z
aliases: reference_pressure_gate_cry_wolf_2026_06_10
---


# Commit pressure gate: VOLATILE not false (slot:golf, 2026-06-10)

## Correction of an over-claim
Earlier this session I read a Stop-hook block `[CRITICAL MEMORY PRESSURE] 218.4/227.1 GB (96.2%)`
and, after two live reads said ~62%, called it "cry-wolf / false". That was too hasty (R12). A
deeper read reconciles it with [[reference_ollama_keepalive_commit_leak_2026_06_08]] (same gate,
same 96-98%, root-caused as a REAL Ollama keep-alive commit leak).

## Verified driver
`Get-Process llama-server` (Ollama's model backend) shows **commit charge = the full resident
model size**, even though the weights live in VRAM:
- only `nomic-embed` loaded -> llama-server commit ~0.3GB, total commit ~62%
- `qwen2.5-coder:32b` loaded -> llama-server commit **59.4GB**, total commit jumped to 67.5%
- a pinned `gpt-oss:120b` is ~65GB commit; two large models pinned via `keep_alive` + 26 Claude
  node chats can legitimately push total commit to 96% of the 227GB ceiling.

## The real picture (R7 reconciliation)
Commit pressure is **REAL and VOLATILE**, not a broken gate. The Stop gate caught a genuine spike
(large model[s] pinned); my probe seconds later caught a genuine trough (a model had evicted /
keep_alive expired). Both readings are correct - the underlying value swings 60->96% as Ollama
loads/evicts. So a pressure block is NOT automatically false. (Distinct from the SAME session's
fleet-task-health WARN, which IS a clean cry-wolf: it flagged 3 tasks MISSING/stale that
`Get-ScheduledTask` showed Ready - see [[reference_fleet_task_health_cry_wolf_2026_06_09]].)

## Mitigations in place
- Bounded Ollama keep-alive (`cebde4fd9`) caps the pinned-model commit leak.
- The new GPU-VRAM admission guard (`f3eb0c1c15`, `.claude/hooks/gpu-vram-admission-guard.mjs`)
  prevents the worst case (loading 120b on top of an already-pinned large model).
- Open: the gate's "auto-relief delta" (e.g. 96.8 -> 96.2) may still be cosmetic; and the gate's
  reading should be cross-checked against current commit, since the value is volatile.

## Apply
A pressure-gate block may be REAL - do not dismiss it as false. VERIFY current state before acting:
`Get-CimInstance Win32_OperatingSystem` (current commit) AND `Get-Process llama-server` (which
Ollama model[s] are pinned). Fastest real relief = `ollama stop <model>` (frees the model's full
commit charge instantly), not killing node chats. Knob to bypass the block: `PRISM_PRESSURE_GATE=0`.
