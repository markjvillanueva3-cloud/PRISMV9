#!/usr/bin/env node
// tier: T2
/**
 * gpu-vram-admission-guard.mjs -- PreToolUse:Bash advisory guard.
 *
 * WHY (fleet-hygiene, slot golf): the single Blackwell workstation (RTX PRO
 * 6000, 96GB) serves the whole 26-slot fleet's local inference. Launching a
 * heavy model (gpt-oss:120b ~60GB) while the card is already near-full evicts a
 * warm resident model or spills to host RAM, tanking throughput for every slot.
 * Observed live 2026-06-10: nvidia-smi 86.6/97.9 GB used while ollama /api/ps
 * showed only nomic-embed resident -- a 60GB load on ~11GB free would thrash.
 *
 * FIRES ON:  PreToolUse, tool_name == "Bash"
 * DETECTS:   a heavy local-inference launch (ollama/api context + >=20b model)
 * BLOCKING:  mode-dependent. Default "warn" => allow + systemMessage (NEVER
 *            wedges a Bash call). "ask" => permissionDecision ask. "block" =>
 *            decision block. "off" => disabled.
 * FAIL-OPEN: any parse / GPU-read failure -> {continue:true}. A GPU probe that
 *            cannot read the card must not block the agent's shell.
 *
 * KNOBS:
 *   PRISM_VRAM_GUARD_MODE       off | warn(default) | ask | block
 *   PRISM_VRAM_GUARD_FLOOR_PCT  pressure floor (default 90)
 *   PRISM_VRAM_GUARD_TEST_USED_MB / _TOTAL_MB  hermetic test seam: when BOTH
 *     are finite, bypass nvidia-smi and use these as the live reading.
 *
 * SIDE EFFECTS: spawns nvidia-smi ONLY on a confirmed heavy launch (cheap regex
 * pre-filter first). No state files, no network.
 *
 * Karpathy: CLASSIFY=admission gate; EDGE=non-Bash/empty/no-GPU/garbage/multi-GPU;
 * FAILURE=spawn timeout/parse -> fail-open.
 */

import { readFileSync } from "node:fs";
import { isHeavyInferenceLaunch, assessAdmission, readGpuVram, DEFAULT_FLOOR_PCT } from "../../scripts/lib/gpu-vram-guard.mjs";

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}
const OK = { continue: true };

function readStdin() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function resolveMode() {
  const m = String(process.env.PRISM_VRAM_GUARD_MODE || "warn").toLowerCase().trim();
  return ["off", "warn", "ask", "block"].includes(m) ? m : "warn";
}

function resolveFloor() {
  const v = Number(process.env.PRISM_VRAM_GUARD_FLOOR_PCT);
  return Number.isFinite(v) && v > 0 && v <= 100 ? v : DEFAULT_FLOOR_PCT;
}

// Test seam: deterministic VRAM reading without a live GPU.
function readVramOrSeam() {
  const u = Number(process.env.PRISM_VRAM_GUARD_TEST_USED_MB);
  const t = Number(process.env.PRISM_VRAM_GUARD_TEST_TOTAL_MB);
  if (Number.isFinite(u) && Number.isFinite(t) && t > 0) {
    return { ok: true, usedMb: u, totalMb: t, utilPct: 0, source: "test-seam" };
  }
  return readGpuVram();
}

function buildMessage(launch, vram, decision) {
  const lines = [
    "GPU VRAM ADMISSION WARNING -- heavy local-inference launch on a near-full card.",
    `  Model:    ~${launch.modelParamB}b` +
      (decision.estFootprintMb !== null ? ` (est ~${decision.estFootprintMb} MiB resident)` : ""),
    `  GPU VRAM: ${vram.usedMb} / ${vram.totalMb} MiB used (${decision.pressurePct}%) -- ${decision.freeMb} MiB free`,
    `  Risk:     ${decision.reasons.join("; ")}`,
    "Launching now will likely EVICT a warm model or spill to host RAM (slow for every slot).",
    "Options: (1) wait for VRAM to drain  (2) `ollama stop <model>` to free a resident model",
    "         (3) use a smaller tier (qwen2.5-coder:32b / gpt-oss:20b)  (4) proceed if intended.",
    `Tune: PRISM_VRAM_GUARD_FLOOR_PCT (cur ${resolveFloor()}) -- disable: PRISM_VRAM_GUARD_MODE=off`,
  ];
  return lines.join("\n");
}

function main() {
  const mode = resolveMode();
  if (mode === "off") emit(OK);

  let payload;
  try {
    const raw = readStdin();
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    emit(OK);
  }

  const toolName = payload.tool_name || payload.toolName || "";
  if (toolName !== "Bash") emit(OK);

  const toolInput = payload.tool_input || payload.toolInput || payload.input || {};
  const command = typeof toolInput.command === "string" ? toolInput.command : "";
  if (!command) emit(OK);

  // Cheap pre-filter: only confirmed heavy launches reach the GPU probe.
  const launch = isHeavyInferenceLaunch(command);
  if (!launch.heavy) emit(OK);

  const vram = readVramOrSeam();
  if (!vram.ok) emit(OK); // fail-open: cannot read the card -> do not block.

  const decision = assessAdmission({
    usedMb: vram.usedMb,
    totalMb: vram.totalMb,
    modelParamB: launch.modelParamB,
    floorPct: resolveFloor(),
  });
  if (decision.admit) emit(OK); // headroom is fine -> silent pass.

  const message = buildMessage(launch, vram, decision);
  if (mode === "block") {
    emit({ decision: "block", reason: message });
  } else if (mode === "ask") {
    emit({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: message,
      },
    });
  }
  // default "warn": allow the command, surface the warning.
  emit({ continue: true, systemMessage: message });
}

main();
