# PRISM Ollama CPU Throttle (slot golf, 2026-06-03)
# Pins every `ollama` serve/runner process to the lower half of logical cores
# + BelowNormal priority, so CPU-resident inference (forced when NIM owns the
# whole GPU) yields to foreground work and can't peg the box. Idempotent +
# fail-soft. Runs every 1 min via the "PRISM Ollama CPU Throttle" scheduled task
# to close the gap where a freshly-spawned ollama runner starts unthrottled.
#
# Root cause it mitigates: ollama runners do NOT inherit a parent serve's
# affinity/priority on respawn (observed 3x in 10 fleet-hygiene ticks), and the
# durable fix for "both NIM + ollama on GPU" is blocked offline (NIM image
# ignores NIM_GPU_MEMORY_UTILIZATION; qwen2.5-coder:3b not pulled). See
# memory reference_ollama_cpu_keepalive_nim_contention_2026_06_03.
# Disable: schtasks /Change /TN "PRISM Ollama CPU Throttle" /DISABLE
# Knob: $env:PRISM_OLLAMA_THROTTLE_CORES overrides the core count (default half).

$ErrorActionPreference = 'SilentlyContinue'
$logical = [int](Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
if ($logical -lt 2) { $logical = 2 }
$cores = $env:PRISM_OLLAMA_THROTTLE_CORES
if (-not $cores) { $cores = [math]::Max(1, [int]($logical / 2)) }
$cores = [math]::Min([int]$cores, $logical)
$mask  = [IntPtr]([int64]([math]::Pow(2, $cores) - 1))   # lower $cores bits set
$changed = 0
foreach ($p in (Get-Process ollama -ErrorAction SilentlyContinue)) {
  try {
    if ($p.ProcessorAffinity -ne $mask) { $p.ProcessorAffinity = $mask; $changed++ }
    if ($p.PriorityClass -ne [System.Diagnostics.ProcessPriorityClass]::BelowNormal) {
      $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal; $changed++
    }
  } catch { }   # process may exit mid-loop, or be protected — skip
}
exit 0
