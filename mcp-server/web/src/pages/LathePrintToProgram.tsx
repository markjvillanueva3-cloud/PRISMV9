/**
 * LathePrintToProgram.tsx — Drag-and-drop print → complete lathe program
 *
 * Exercises the full LATHE-MASTER P4 pipeline (U-LTH33..U-LTH44) through the
 * cam dispatcher. 11 canonical dispatcher actions wired end-to-end:
 *
 *   1. lathe_p2p_ingest            (U-LTH33)
 *   2. lathe_p2p_recognize_features (U-LTH34)
 *   3. lathe_p2p_tolerance_propagate (U-LTH35)
 *   4. lathe_p2p_strategy_plan      (U-LTH36)
 *   5. lathe_p2p_sequence_plan      (U-LTH37)
 *   6. lathe_p2p_setup_from_features(U-LTH38)
 *   7. lathe_p2p_toolpath_generate  (U-LTH39)
 *   8. lathe_p2p_emit               (U-LTH40)
 *   9. lathe_p2p_signoff_generate   (U-LTH41)
 *  10. lathe_p2p_dl_predict         (U-LTH42)
 *  11. lathe_p2p_reason_explain     (U-LTH43)
 *      (+ lathe_p2p_kg_ingest for U-LTH44 provenance)
 *
 * @milestone LATHE-MASTER U-LTH45
 * @route /lathe-print-to-program
 */

import { useCallback, useMemo, useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

type StepStatus = "pending" | "running" | "ok" | "failed";

interface PipelineStep {
  id: string;
  action: string;
  label: string;
  status: StepStatus;
  duration_ms?: number;
  result_summary?: string;
  error?: string;
}

interface PipelineRunResult {
  run_id: string;
  started_at: string;
  completed_at?: string;
  steps: PipelineStep[];
  gcode?: string;
  signoff_markdown?: string;
  reasoning_markdown?: string;
  dl_failure_probability?: number;
  release_ready?: boolean;
}

const PIPELINE_STEPS: Array<Omit<PipelineStep, "status">> = [
  { id: "s1", action: "lathe_p2p_ingest", label: "1. Ingest print" },
  { id: "s2", action: "lathe_p2p_recognize_features", label: "2. Recognize features" },
  { id: "s3", action: "lathe_p2p_tolerance_propagate", label: "3. Propagate tolerances" },
  { id: "s4", action: "lathe_p2p_strategy_plan", label: "4. Plan strategy" },
  { id: "s5", action: "lathe_p2p_sequence_plan", label: "5. Plan sequence" },
  { id: "s6", action: "lathe_p2p_setup_from_features", label: "6. Select workholding" },
  { id: "s7", action: "lathe_p2p_toolpath_generate", label: "7. Generate toolpath" },
  { id: "s8", action: "lathe_p2p_emit", label: "8. Emit G-code" },
  { id: "s9", action: "lathe_p2p_signoff_generate", label: "9. Signoff dossier" },
  { id: "s10", action: "lathe_p2p_dl_predict", label: "10. DL failure review" },
  { id: "s11", action: "lathe_p2p_reason_explain", label: "11. Reasoning trace" },
  { id: "s12", action: "lathe_p2p_kg_ingest", label: "12. Knowledge graph" },
];

// ============================================================================
// API CLIENT
// ============================================================================

async function callCamAction<T = unknown>(action: string, params: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/dispatch/cam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
  });
  if (!response.ok) {
    throw new Error(`${action} failed: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(`${action} failed: ${data.error ?? "unknown error"}`);
  }
  return data.data as T;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function LathePrintToProgram() {
  const [file, setFile] = useState<File | null>(null);
  const [material, setMaterial] = useState<string>("1018 Steel");
  const [controller, setController] = useState<string>("fanuc");
  const [running, setRunning] = useState<boolean>(false);
  const [run, setRun] = useState<PipelineRunResult | null>(null);

  const initialSteps: PipelineStep[] = useMemo(
    () => PIPELINE_STEPS.map(s => ({ ...s, status: "pending" as StepStatus })),
    []
  );

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
  }, []);

  const runPipeline = useCallback(async () => {
    if (!file) return;
    setRunning(true);
    const runResult: PipelineRunResult = {
      run_id: `run_${Date.now()}`,
      started_at: new Date().toISOString(),
      steps: initialSteps.map(s => ({ ...s })),
    };
    setRun(runResult);

    const updateStep = (idx: number, patch: Partial<PipelineStep>) => {
      runResult.steps[idx] = { ...runResult.steps[idx], ...patch };
      setRun({ ...runResult, steps: [...runResult.steps] });
    };

    try {
      const fileBuf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuf)));

      // Step 1: Ingest
      let t = Date.now();
      updateStep(0, { status: "running" });
      const ingest = await callCamAction<{ features: unknown[]; material: unknown }>(
        "lathe_p2p_ingest",
        { filename: file.name, content_base64: base64, material_name: material }
      );
      updateStep(0, { status: "ok", duration_ms: Date.now() - t, result_summary: "Print ingested" });

      // Step 2-11: call pipeline actions in order
      let context: Record<string, unknown> = { ingest };
      for (let i = 1; i < initialSteps.length; i++) {
        const step = initialSteps[i];
        t = Date.now();
        updateStep(i, { status: "running" });
        try {
          const result = await callCamAction(step.action, { ...context, controller });
          context = { ...context, [step.action]: result };
          updateStep(i, { status: "ok", duration_ms: Date.now() - t, result_summary: "OK" });
        } catch (err) {
          updateStep(i, {
            status: "failed",
            duration_ms: Date.now() - t,
            error: err instanceof Error ? err.message : String(err),
          });
          break;
        }
      }

      runResult.completed_at = new Date().toISOString();
      setRun({ ...runResult });
    } finally {
      setRunning(false);
    }
  }, [file, material, controller, initialSteps]);

  return (
    <div className="lathe-p2p-page" style={styles.page}>
      <h1 style={styles.h1}>Lathe Print → Program</h1>
      <p style={styles.p}>
        Drag a PDF print, select material and controller, and watch the full
        LATHE-MASTER P4 pipeline (12 steps, U-LTH33..U-LTH44) run end-to-end.
      </p>

      <div style={styles.gridTop}>
        <div
          data-testid="drop-zone"
          style={styles.dropZone}
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          {file ? (
            <div>
              <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          ) : (
            <div>
              <div>Drag & drop PDF print here</div>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFilePick}
                style={styles.fileInput}
                data-testid="file-input"
              />
            </div>
          )}
        </div>

        <div style={styles.controls}>
          <label style={styles.label}>
            Material
            <input
              type="text"
              value={material}
              onChange={e => setMaterial(e.target.value)}
              style={styles.input}
              data-testid="material-input"
            />
          </label>
          <label style={styles.label}>
            Controller
            <select
              value={controller}
              onChange={e => setController(e.target.value)}
              style={styles.input}
              data-testid="controller-select"
            >
              <option value="fanuc">Fanuc</option>
              <option value="haas">Haas</option>
              <option value="okuma_osp">Okuma OSP</option>
              <option value="mitsubishi">Mitsubishi</option>
              <option value="mazak">Mazak</option>
              <option value="siemens">Siemens 840D</option>
              <option value="generic">Generic</option>
            </select>
          </label>
          <button
            onClick={runPipeline}
            disabled={!file || running}
            style={running ? styles.buttonDisabled : styles.button}
            data-testid="run-pipeline-btn"
          >
            {running ? "Running..." : "Run pipeline"}
          </button>
        </div>
      </div>

      {run && (
        <div style={styles.results}>
          <h2 style={styles.h2}>
            Pipeline Run: {run.run_id} {run.completed_at && "(complete)"}
          </h2>
          <ol style={styles.stepList}>
            {run.steps.map(s => (
              <li
                key={s.id}
                style={{
                  ...styles.step,
                  ...(s.status === "ok" ? styles.stepOk : {}),
                  ...(s.status === "failed" ? styles.stepFailed : {}),
                  ...(s.status === "running" ? styles.stepRunning : {}),
                }}
                data-testid={`step-${s.id}`}
              >
                <span>
                  <code>{s.action}</code> — {s.label}
                </span>
                <span style={styles.stepMeta}>
                  {s.status === "running" && "…"}
                  {s.status === "ok" && s.duration_ms !== undefined && `${s.duration_ms}ms`}
                  {s.status === "failed" && s.error && `FAIL: ${s.error}`}
                </span>
              </li>
            ))}
          </ol>

          {run.release_ready !== undefined && (
            <div style={run.release_ready ? styles.releaseOk : styles.releaseBlocked}>
              {run.release_ready ? "READY FOR RELEASE" : "REQUIRES REWORK"}
            </div>
          )}

          {run.gcode && (
            <details>
              <summary>G-code preview</summary>
              <pre style={styles.pre}>{run.gcode.slice(0, 4000)}</pre>
            </details>
          )}

          {run.signoff_markdown && (
            <details>
              <summary>Signoff dossier</summary>
              <pre style={styles.pre}>{run.signoff_markdown}</pre>
            </details>
          )}

          {run.reasoning_markdown && (
            <details>
              <summary>Reasoning trace</summary>
              <pre style={styles.pre}>{run.reasoning_markdown}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px", fontFamily: "system-ui, sans-serif", color: "#222" },
  h1: { fontSize: "24px", marginBottom: "8px" },
  h2: { fontSize: "18px", marginTop: "16px", marginBottom: "8px" },
  p: { fontSize: "14px", color: "#666", marginBottom: "24px" },
  gridTop: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "16px",
    marginBottom: "24px",
  },
  dropZone: {
    border: "2px dashed #888",
    borderRadius: "8px",
    padding: "32px",
    textAlign: "center",
    background: "#fafafa",
    cursor: "pointer",
  },
  fileInput: { display: "block", margin: "16px auto 0" },
  controls: { display: "flex", flexDirection: "column", gap: "12px" },
  label: { display: "flex", flexDirection: "column", fontSize: "14px", fontWeight: 600 },
  input: {
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    marginTop: "4px",
    fontSize: "14px",
  },
  button: {
    padding: "12px 24px",
    background: "#0066cc",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  buttonDisabled: {
    padding: "12px 24px",
    background: "#aaa",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "not-allowed",
  },
  results: { marginTop: "24px", padding: "16px", background: "#f5f5f5", borderRadius: "8px" },
  stepList: { listStyle: "none", padding: 0, margin: 0 },
  step: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 12px",
    marginBottom: "4px",
    background: "#fff",
    borderRadius: "4px",
    fontSize: "13px",
    borderLeft: "4px solid #ccc",
  },
  stepOk: { borderLeftColor: "#28a745" },
  stepFailed: { borderLeftColor: "#dc3545", background: "#ffecec" },
  stepRunning: { borderLeftColor: "#ffc107", background: "#fff9e6" },
  stepMeta: { color: "#666", fontSize: "12px" },
  releaseOk: {
    padding: "12px",
    background: "#d4edda",
    color: "#155724",
    borderRadius: "4px",
    fontWeight: 600,
    marginTop: "12px",
  },
  releaseBlocked: {
    padding: "12px",
    background: "#f8d7da",
    color: "#721c24",
    borderRadius: "4px",
    fontWeight: 600,
    marginTop: "12px",
  },
  pre: {
    background: "#f0f0f0",
    padding: "12px",
    borderRadius: "4px",
    overflow: "auto",
    maxHeight: "400px",
    fontSize: "12px",
  },
};
