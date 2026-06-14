/**
 * JMDieDocumentSearchPanel — JM-DIE-FLEET-SCAN-MS0 / U-FS09
 *
 * Role-tabbed search UI over the 301,948-row JM Die scan ledger. Each tab
 * routes to a different prism_quoting action, surfacing the documents an
 * employee in that role actually needs:
 *
 *   - Operator → docs_by_part   (find programs/setup sheets for the part on the machine)
 *   - Quoter   → docs_by_customer + docustrata filter (PDFs only — quote history)
 *   - Setup    → docs_by_part (same as operator but filter to PDFs)
 *   - Manager  → docs_by_machine_family (production load per machine type)
 *   - Engineer → docs_by_tokens (multi-token tool/program search)
 *
 * Calculator-Studio dark surface. R12 fail-loud: dispatcher reason rendered
 * visibly, never silent empty panel.
 *
 * @author slot:charlie /goal-16 iter2, 2026-05-24
 */
import React, { useState, useCallback } from "react";

type Role = "operator" | "quoter" | "setup" | "manager" | "engineer";

interface LedgerRowVm {
  abs_path: string;
  size_bytes: number;
  mtime_iso: string;
  machine_family?: string;
  kind?: string;
}

interface QueryResult {
  ok?: boolean;
  query?: string;
  total_matched?: number;
  returned?: number;
  results?: LedgerRowVm[];
  parse_errors?: number;
  reason?: string;
}

async function callQuery(action: string, params: Record<string, unknown>): Promise<QueryResult> {
  try {
    const resp = await fetch("/api/mcp/quoting", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, params }),
    });
    if (!resp.ok) return { reason: `http-${resp.status}-${resp.statusText}` };
    return (await resp.json()) as QueryResult;
  } catch (err) {
    return { reason: err instanceof Error ? err.message : String(err) };
  }
}

export const __testHooks = { callQuery };

const ROLE_DEFS: Array<{
  id: Role;
  label: string;
  placeholder: string;
  hint: string;
  action: string;
  buildParams: (input: string) => Record<string, unknown>;
}> = [
  { id: "operator", label: "Operator", placeholder: "Part id (e.g. 778)", hint: "Find ALL files touching this part — programs + setup + blueprints",
    action: "jm_die_docs_by_part", buildParams: (s) => ({ partId: s, limit: 20 }) },
  { id: "quoter", label: "Quoter", placeholder: "Customer (e.g. ACCURATE)", hint: "Find docustrata quote history for this customer",
    action: "jm_die_docs_by_customer", buildParams: (s) => ({ customer: s, limit: 20, kindFilter: "docustrata" }) },
  { id: "setup", label: "Setup", placeholder: "Part id (e.g. 778)", hint: "PDFs only — blueprints, fixtures, travelers",
    action: "jm_die_docs_by_part", buildParams: (s) => ({ partId: s, limit: 20, kindFilter: "docustrata" }) },
  { id: "manager", label: "Manager", placeholder: "Machine family (mill/lathe/wedm/mill_turn/micro_mill)", hint: "Production load per machine family",
    action: "jm_die_docs_by_machine_family", buildParams: (s) => ({ family: s.toLowerCase(), limit: 20 }) },
  { id: "engineer", label: "Engineer", placeholder: "Tokens comma-separated (e.g. CNMG120408, 778)", hint: "Tool-code / multi-token search (OR semantics, scored)",
    action: "jm_die_docs_by_tokens", buildParams: (s) => ({ tokens: s.split(",").map((t) => t.trim()).filter((t) => t.length > 0), limit: 20 }) },
];

export const JMDieDocumentSearchPanel: React.FC = () => {
  const [role, setRole] = useState<Role>("operator");
  const [input, setInput] = useState<string>("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const def = ROLE_DEFS.find((d) => d.id === role)!;

  const search = useCallback(async () => {
    if (input.trim().length === 0) return;
    setLoading(true);
    try {
      const r = await __testHooks.callQuery(def.action, def.buildParams(input));
      setResult(r);
    } finally {
      setLoading(false);
    }
  }, [input, def]);

  return (
    <section
      data-testid="jmdie-doc-search-panel"
      style={{
        marginTop: 16,
        padding: 16,
        background: "rgba(2,6,23,0.78)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        color: "#e2e8f0",
      }}
    >
      <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", margin: "0 0 12px", color: "#a78bfa" }}>
        JM Die Document Search — Role-Aware
      </h2>

      <div role="tablist" aria-label="Employee role" style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {ROLE_DEFS.map((d) => (
          <button
            key={d.id}
            role="tab"
            aria-selected={role === d.id}
            data-testid={`jmdie-doc-role-${d.id}`}
            onClick={() => { setRole(d.id); setInput(""); setResult(null); }}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              background: role === d.id ? "rgba(167,139,250,0.25)" : "rgba(148,163,184,0.08)",
              border: `1px solid ${role === d.id ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 4,
              color: role === d.id ? "#c4b5fd" : "#cbd5e1",
              cursor: "pointer",
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 8px" }}>{def.hint}</p>

      <div style={{ display: "flex", gap: 4 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={def.placeholder}
          data-testid="jmdie-doc-search-input"
          onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
          style={{
            flex: 1,
            padding: 8,
            fontSize: 13,
            background: "rgba(148,163,184,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            color: "#e2e8f0",
            fontFamily: "monospace",
          }}
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading || input.trim().length === 0}
          data-testid="jmdie-doc-search-submit"
          style={{
            padding: "8px 14px",
            fontSize: 12,
            background: "rgba(167,139,250,0.2)",
            border: "1px solid rgba(167,139,250,0.5)",
            borderRadius: 4,
            color: "#c4b5fd",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {result?.reason && (
        <p data-testid="jmdie-doc-search-error" style={{ color: "#f87171", margin: "8px 0 0", fontSize: 12 }}>
          {result.reason}
        </p>
      )}

      {result && !result.reason && (
        <div data-testid="jmdie-doc-search-results" style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
            {result.total_matched ?? 0} matched, showing top {result.returned ?? 0}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 320, overflowY: "auto" }}>
            {(result.results ?? []).map((row) => (
              <li
                key={row.abs_path}
                data-testid="jmdie-doc-search-row"
                style={{
                  padding: "6px 8px",
                  background: "rgba(148,163,184,0.04)",
                  borderLeft: "2px solid rgba(167,139,250,0.4)",
                  marginBottom: 3,
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
              >
                <div style={{ color: "#cbd5e1", wordBreak: "break-all" }}>{row.abs_path}</div>
                <div style={{ color: "#64748b", marginTop: 2, fontSize: 10 }}>
                  {row.machine_family ?? "—"} · {row.kind ?? "—"} · {(row.size_bytes / 1024).toFixed(1)} KB · {row.mtime_iso.slice(0, 10)}
                </div>
              </li>
            ))}
            {(result.results ?? []).length === 0 && (
              <li style={{ fontSize: 12, color: "#64748b", padding: 6 }}>No matches.</li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
};
