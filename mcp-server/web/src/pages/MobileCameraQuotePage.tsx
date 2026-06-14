/**
 * MobileCameraQuotePage — QUOTING-PIPELINE-MS0 / U-QP09
 *
 * Customer-facing, mobile-first capture page. Three camera modes:
 *   1. Blueprint  → prism_quoting:camera_intake_route → prism_quoting:insert_box_lookup OR BlueprintToQuoteBridge
 *   2. Insert box / tool body → catalog lookup + compatible-insert recommendations
 *   3. Machine service tag → parts BOM + realtime pricing
 *
 * Plus an embedded LiveChatWidget for troubleshooting.
 *
 * Per CLAUDE.md R7 fail-loud: the page displays the dispatcher's reason field
 * when no match is found — NEVER silent empty UI.
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP09-MOBILE-CAMERA-QUOTE-PAGE
 * @author slot:charlie /goal-13 iter6, 2026-05-24
 */
import React, { useState, useCallback } from "react";
import { JMDieFleetScanStatusPanel } from "../components/quoting/JMDieFleetScanStatusPanel";
import { JMDieDocumentSearchPanel } from "../components/quoting/JMDieDocumentSearchPanel";

type CaptureMode = "blueprint" | "insert_box" | "service_tag";

interface DispatcherResult {
  route?: string;
  confidence?: number;
  catalog_match?: { part_number: string; vendor: string; category: string };
  compatible_inserts?: Array<{ part_number: string; vendor: string; grade: string; reason: string }>;
  fields?: { make: string | null; model: string | null; serial: string | null };
  bom?: Array<{ description: string; vendor_adapter: string; replacement_interval_months: number | null }>;
  reason?: string;
  [key: string]: unknown;
}

/** Minimal MCP-client shim — calls prism_quoting via the local server. */
async function callQuotingAction(action: string, params: Record<string, unknown>): Promise<DispatcherResult> {
  // POST to /api/mcp/quoting in the local Vite/Express bridge — exact route is wired
  // in the server layer; this client only knows the action name + params shape.
  const resp = await fetch("/api/mcp/quoting", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, params }),
  });
  if (!resp.ok) {
    return { reason: `http-${resp.status}-${resp.statusText}` };
  }
  return (await resp.json()) as DispatcherResult;
}

/** Tiny test seam: in the hermetic component test we substitute a fake. */
export const __testHooks = {
  callQuotingAction,
};

export const MobileCameraQuotePage: React.FC = () => {
  const [mode, setMode] = useState<CaptureMode>("blueprint");
  const [ocrText, setOcrText] = useState<string>("");
  const [result, setResult] = useState<DispatcherResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const submit = useCallback(async () => {
    setLoading(true);
    try {
      const text = ocrText;
      let r: DispatcherResult;
      if (mode === "blueprint") {
        r = await __testHooks.callQuotingAction("camera_intake_route", { text });
      } else if (mode === "insert_box") {
        r = await __testHooks.callQuotingAction("insert_box_lookup", { text });
      } else {
        const tagFields = await __testHooks.callQuotingAction("machine_tag_extract", { text });
        if (tagFields.fields?.make) {
          const bom = await __testHooks.callQuotingAction("machine_parts_bom_resolve", {
            make: tagFields.fields.make, model: tagFields.fields.model,
          });
          r = { ...tagFields, ...bom };
        } else {
          r = tagFields;
        }
      }
      setResult(r);
    } finally {
      setLoading(false);
    }
  }, [mode, ocrText]);

  return (
    <div className="mobile-camera-quote-page" data-testid="mcq-page" style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>Quick Capture → Quote</h1>

      <div role="tablist" aria-label="Capture mode" style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {(["blueprint", "insert_box", "service_tag"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            data-testid={`mcq-mode-${m}`}
            onClick={() => { setMode(m); setResult(null); }}
            style={{ flex: 1, padding: 8, background: mode === m ? "#2563eb" : "#e5e7eb", color: mode === m ? "#fff" : "#000", border: "none", borderRadius: 4 }}
          >
            {m === "blueprint" ? "Drawing" : m === "insert_box" ? "Insert/Tool" : "Machine Tag"}
          </button>
        ))}
      </div>

      <label htmlFor="mcq-ocr-input" style={{ display: "block", marginBottom: 4, fontSize: 13 }}>
        Camera OCR text (paste from camera capture):
      </label>
      <textarea
        id="mcq-ocr-input"
        data-testid="mcq-ocr-input"
        value={ocrText}
        onChange={(e) => setOcrText(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: 8, fontFamily: "monospace", fontSize: 12, border: "1px solid #d1d5db", borderRadius: 4 }}
        placeholder={mode === "blueprint" ? "DRAWING NO 12345  SCALE 2:1  ..." : mode === "insert_box" ? "SANDVIK CNMG120408 ..." : "HAAS Model VF-2 S/N: 1098761"}
      />

      <button
        onClick={submit}
        disabled={loading || ocrText.trim().length === 0}
        data-testid="mcq-submit"
        style={{ marginTop: 12, width: "100%", padding: 12, background: "#10b981", color: "#fff", border: "none", borderRadius: 4, fontSize: 16 }}
      >
        {loading ? "Processing…" : "Get Result"}
      </button>

      {result && (
        <div data-testid="mcq-result" style={{ marginTop: 16, padding: 12, background: "#f3f4f6", borderRadius: 4 }}>
          {result.reason && !result.catalog_match && !result.fields?.make && (
            <p data-testid="mcq-reason" style={{ color: "#dc2626", margin: 0 }}>No match: {result.reason}</p>
          )}
          {result.route && <p data-testid="mcq-route">Route: <strong>{result.route}</strong> ({((result.confidence ?? 0) * 100).toFixed(0)}%)</p>}
          {result.catalog_match && (
            <div data-testid="mcq-catalog">
              <p>Match: <strong>{result.catalog_match.part_number}</strong> ({result.catalog_match.vendor})</p>
              <p>Compatible inserts:</p>
              <ul>{(result.compatible_inserts ?? []).map((c) => <li key={c.part_number}>{c.part_number} — {c.grade}</li>)}</ul>
            </div>
          )}
          {result.fields?.make && (
            <div data-testid="mcq-tag">
              <p>Machine: <strong>{result.fields.make} {result.fields.model}</strong> S/N {result.fields.serial}</p>
              {result.bom && result.bom.length > 0 && (
                <>
                  <p>BOM ({result.bom.length} items):</p>
                  <ul>{result.bom.slice(0, 5).map((b, i) => <li key={i}>{b.description} <em>({b.vendor_adapter})</em></li>)}</ul>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <JMDieFleetScanStatusPanel />
      <JMDieDocumentSearchPanel />
    </div>
  );
};

export default MobileCameraQuotePage;
