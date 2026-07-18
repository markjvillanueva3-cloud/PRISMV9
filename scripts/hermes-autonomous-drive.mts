/**
 * scripts/hermes-autonomous-drive.mts -- headless CLI runner for the GATED autonomous
 * build loop (HermesAutonomousDriveRunnerEngine). The "thin runner" the driver brief named.
 *
 * RUN VIA TSX (resolves the NodeNext `.js` -> `.ts` engine imports; bare `node` would hit
 * the Node-24 dynamic-import trap -- see reference_charlie_train_cycle_tsx_reexec_2026_06_22):
 *   PRISM_HERMES_AUTONOMOUS_DRIVE=1 npx tsx scripts/hermes-autonomous-drive.mts --subtasks '[...]'
 *   npx tsx scripts/hermes-autonomous-drive.mts --gate --goal "..." --candidates '[...]'
 *
 * DEFAULT-OFF (R6/R12): refuses to execute autonomous waves unless --gate OR
 * PRISM_HERMES_AUTONOMOUS_DRIVE=1. Executes each ready wave via LOCAL Ollama (the
 * mechanical default of the Ollama->Sonnet->Opus ladder). Prints the R15 step-3 numbers
 * (waves, per-wave trace, aggregate) as JSON.
 */
import { HermesAutonomousDriveRunnerEngine } from "../mcp-server/src/engines/HermesAutonomousDriveRunnerEngine.js";
import { ollamaClientEngine } from "../mcp-server/src/engines/OllamaClientEngine.js";

function argVal(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const gate = hasFlag("gate") || process.env.PRISM_HERMES_AUTONOMOUS_DRIVE === "1";
const model = argVal("model", "qwen2.5-coder:32b")!;
const maxParallel = Number(argVal("max-parallel", "3"));
const perSubtaskTimeoutMs = Number(argVal("timeout-ms", "180000"));
const maxRetries = Number(argVal("max-retries", "1"));
const goal = argVal("goal");
const subtasksRaw = argVal("subtasks");
const candidatesRaw = argVal("candidates");

async function main(): Promise<void> {
  if (!gate) {
    console.log(JSON.stringify({ ran: false, gated: true, reason: "default-OFF: pass --gate or PRISM_HERMES_AUTONOMOUS_DRIVE=1" }, null, 2));
    return;
  }
  const subtasks = subtasksRaw ? JSON.parse(subtasksRaw) : undefined;
  const candidates = candidatesRaw ? JSON.parse(candidatesRaw) : undefined;
  if (!subtasks && !(goal && candidates)) {
    console.error("Provide --subtasks '[...]' OR --goal \"...\" --candidates '[...]'");
    process.exitCode = 2;
    return;
  }

  if (!ollamaClientEngine.isConnected()) {
    const c = await ollamaClientEngine.connect();
    if (!c.ok) {
      console.error(`ollama-connect-failed: ${c.error ?? "unknown"} (is the daemon up on :11434?)`);
      process.exitCode = 2;
      return;
    }
  }

  // Real LOCAL-LLM executor: one Ollama generate per subtask (mechanical tier).
  const executor = async (st: { subtask_id: string; description: string; domain: string }) => {
    const r = await ollamaClientEngine.generate({
      model,
      prompt: `Execute this manufacturing-software subtask and report the result concisely.\nDomain: ${st.domain}\nTask: ${st.description}`,
    });
    return r.ok ? { ok: true, output: String(r.value ?? "").slice(0, 4000) } : { ok: false, error: r.error ?? "ollama-generate-failed" };
  };
  const decompose = async (prompt: string) => {
    const r = await ollamaClientEngine.generate({ model, prompt });
    return r.ok ? String(r.value ?? "") : "";
  };

  const t0 = Date.now();
  const result = await HermesAutonomousDriveRunnerEngine.drive({
    executor,
    subtasks,
    goal,
    candidates,
    decompose,
    bounds: { maxRetries },
    maxParallel,
    perSubtaskTimeoutMs,
    gateEnabled: true,
  });
  const elapsedMs = Date.now() - t0;

  // R15 step-3 evidence: waves planned, subtasks executed, results aggregated.
  console.log(
    JSON.stringify(
      {
        ran: result.ran,
        gated: result.gated,
        reason: result.reason,
        model,
        elapsed_ms: elapsedMs,
        waves: result.trace.length,
        aggregate: result.aggregate,
        trace: result.trace.map((w) => ({ wave: w.wave, dispatched: w.dispatched, ok: w.ok, failed: w.failed })),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(`drive-failed: ${(e as Error).message}`);
  process.exitCode = 1;
});
