import { mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { camDriveGateEngine } from "./CAMDriveGateEngine.js";
import { outcomeCaptureBusEngine } from "./OutcomeCaptureBusEngine.js";
import type { RecordOutcomeInput } from "./OutcomeCaptureBusEngine.js";
import type { CamDriveDeps } from "./CAMDriveRecipeEngine.js";

/**
 * CAMDriveRecipeAdapter — wires CAMDriveRecipeEngine's INJECTED deps to the REAL
 * PRISM engines so the dispatcher (cam_drive_recipe_*) can run a recipe with no
 * LLM in the loop, against production infra:
 *   gate          -> camDriveGateEngine.gate (the live safety fuse)
 *   recordOutcome -> outcomeCaptureBusEngine.record (the learning-loop bus)
 *   bridge/dispatch-> Fusion360 add-in HTTP (:18365) — the live actuation surface
 *   recordRichTrace-> append-only tier-2 ledger (state/shared/cam-drive/traces/)
 *   recordTrace   -> ActionTraceEngine.recordTrace (tier-1, best-effort)
 *
 * The engine stays dependency-injected + hermetically testable; this module is the
 * single place the real singletons are bound. Every seam is overridable so the
 * real-adapter E2E can stub the network bridge while exercising the REAL gate +
 * REAL outcome bus (the "hermetic fakes don't prove wiring" guard).
 */

/** cam_drive_* dispatcher action -> Fusion360 add-in HTTP endpoint. */
const ACTION_TO_HTTP: Readonly<Record<string, string>> = {
  cam_drive_create_setup: "/cam/setup",
  cam_drive_create_operation: "/cam/operation",
  cam_drive_assign_tool: "/cam/assign-tool",
  cam_drive_generate_toolpath: "/cam/toolpath",
  cam_drive_toolpath_status: "/cam/toolpath/status",
  cam_drive_post: "/cam/post",
};

export interface BuildDepsOptions {
  /** Stable run id (one per replay). */
  runId: string;
  /** Fusion add-in base URL. Defaults to F360_URL env or :18365. */
  bridgeUrl?: string;
  /** Tier-2 rich-trace ledger path. */
  tracePath?: string;
  /** Agent/chat id for tier-1 trace attribution. */
  agentId?: string;
  /** TEST SEAM: override the raw bridge call (stub the network in the E2E). */
  bridgeRequest?: (httpPath: string, method: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  /** TEST SEAM: clock. */
  now?: () => string;
  /**
   * TEST SEAM: override the outcome sink — receives the MAPPED RecordOutcomeInput.
   * Lets the real-adapter E2E assert the engine→adapter outcome wiring (incl. context
   * passthrough) WITHOUT writing a synthetic event into the production cam.jsonl shard.
   * Default binds the real OutcomeCaptureBus singleton.
   */
  recordOutcome?: (input: RecordOutcomeInput) => void;
}

/** Map the engine's emitted outcome object onto a typed RecordOutcomeInput (drops `ts`; record() auto-stamps timestamp). */
function toRecordOutcomeInput(o: Record<string, unknown>): RecordOutcomeInput {
  return {
    domain: o.domain as RecordOutcomeInput["domain"],
    kind: o.kind as RecordOutcomeInput["kind"],
    source: o.source as RecordOutcomeInput["source"],
    lineage_id: typeof o.lineage_id === "string" ? o.lineage_id : undefined,
    confidence: typeof o.confidence === "number" ? o.confidence : undefined,
    // U-CAM-LOOP-DOMAIN-ISOLATE: pass context through so cam_system / engine / action
    // reach the bus shard. Previously dropped here — the engine emitted context but the
    // adapter silently stripped it, so the consumer could never resolve the CAM system
    // in production (the hermetic engine test couldn't catch it — it captures the raw
    // pre-mapping object). Guard against array/non-object context.
    context:
      o.context && typeof o.context === "object" && !Array.isArray(o.context)
        ? (o.context as Record<string, unknown>)
        : undefined,
    actual: o.actual,
  };
}

/**
 * Build a production CamDriveDeps bound to the real PRISM engines.
 * Never throws on a trace/outcome side-effect failure — telemetry must not break a
 * CAM run (the gate + actuation are the load-bearing paths, and those DO surface).
 */
export function buildCamDriveDeps(opts: BuildDepsOptions): CamDriveDeps {
  const bridgeUrl = opts.bridgeUrl ?? process.env.F360_URL ?? "http://127.0.0.1:18365";
  const now = opts.now ?? (() => new Date().toISOString());
  const tracePath = opts.tracePath ?? `state/shared/cam-drive/traces/${opts.runId}.jsonl`;

  const rawBridge =
    opts.bridgeRequest ??
    (async (httpPath: string, method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
      const res = await fetch(bridgeUrl + httpPath, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(body),
      });
      return (await res.json()) as Record<string, unknown>;
    });

  return {
    callDispatcher: async (action, body) => {
      const httpPath = ACTION_TO_HTTP[action];
      if (!httpPath) throw new Error(`buildCamDriveDeps: no bridge endpoint mapped for action '${action}'`);
      return rawBridge(httpPath, "POST", body);
    },
    bridgeRequest: (httpPath, method, body) => rawBridge(httpPath, method, body),
    // REAL safety fuse (sync engine method wrapped to the async deps contract).
    // DriveGateVerdict structurally satisfies {clearedToActuate, ...} — cast bridges
    // the typed-fields shape to the deps index-signature contract (not `any`).
    gate: async (input) => camDriveGateEngine.gate(input) as unknown as { clearedToActuate: boolean; [k: string]: unknown },
    // REAL learning-loop bus (telemetry — never break the run on a record failure).
    // The sink is overridable (opts.recordOutcome) so the real-adapter E2E can assert
    // the engine→adapter outcome mapping (incl. context passthrough) without polluting
    // the production cam.jsonl shard; default binds the real OutcomeCaptureBus singleton.
    recordOutcome: (o) => {
      try {
        const mapped = toRecordOutcomeInput(o);
        if (opts.recordOutcome) opts.recordOutcome(mapped);
        else outcomeCaptureBusEngine.record(mapped);
      } catch (err) {
        // surface to stderr but do NOT throw — a dropped outcome must not abort a CAM run
        process.stderr.write(`[cam-drive] outcome record failed (non-fatal): ${err instanceof Error ? err.message : String(err)}\n`);
      }
    },
    // tier-2 rich trace — append-only ledger we own (replay + learning source).
    recordRichTrace: (line) => {
      try {
        mkdirSync(dirname(tracePath), { recursive: true });
        appendFileSync(tracePath, JSON.stringify(line) + "\n");
      } catch {
        /* telemetry best-effort */
      }
    },
    // tier-1 audit edge via ActionTraceEngine (best-effort; lazy to avoid a hard dep at module load).
    recordTrace: (edge) => {
      void (async () => {
        try {
          const mod = (await import("./ActionTraceEngine.js")) as { recordTrace?: (e: unknown) => unknown };
          mod.recordTrace?.({ agent: opts.agentId ?? "cam-drive", sessionId: opts.runId, ...edge });
        } catch {
          /* telemetry best-effort */
        }
      })();
    },
    now,
    runId: opts.runId,
  };
}
