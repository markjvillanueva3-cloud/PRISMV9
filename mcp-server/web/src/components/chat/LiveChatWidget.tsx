/**
 * LiveChatWidget — QUOTING-PIPELINE-MS0 / U-QP10
 *
 * Embeddable troubleshoot-chat widget.
 * Calls prism_quoting:live_chat_session_{open,turn,close}.
 * Renders citation chips per assistant turn (per U-QP07 contract).
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP10-LIVE-CHAT-WIDGET
 * @author slot:charlie /goal-13 iter6, 2026-05-24
 */
import React, { useState, useCallback, useEffect } from "react";

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: Array<{ source: string; relevance: number; excerpt?: string }>;
}

interface DispatcherResult {
  sessionId?: string;
  text?: string;
  citations?: Array<{ source: string; relevance: number; excerpt?: string }>;
  closed?: boolean;
  state?: string;
  id?: string;
}

async function callQuotingAction(action: string, params: Record<string, unknown> = {}): Promise<DispatcherResult> {
  const resp = await fetch("/api/mcp/quoting", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, params }),
  });
  if (!resp.ok) return { text: `[error] http-${resp.status}` };
  return (await resp.json()) as DispatcherResult;
}

export const __testHooks = { callQuotingAction };

export const LiveChatWidget: React.FC<{ initialOpen?: boolean }> = ({ initialOpen = true }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(initialOpen);

  // Open a session on mount
  useEffect(() => {
    if (!open || sessionId) return;
    void __testHooks.callQuotingAction("live_chat_session_open").then((r) => {
      if (r.sessionId) setSessionId(r.sessionId);
    });
  }, [open, sessionId]);

  const sendTurn = useCallback(async () => {
    if (!sessionId || input.trim().length === 0 || sending) return;
    const userText = input;
    setInput("");
    setSending(true);
    const localUserId = `u-${Date.now()}`;
    setTurns((t) => [...t, { id: localUserId, role: "user", text: userText }]);
    try {
      const r = await __testHooks.callQuotingAction("live_chat_session_turn", { sessionId, userText });
      setTurns((t) => [...t, {
        id: r.id ?? `a-${Date.now()}`,
        role: "assistant",
        text: r.text ?? "[error] empty response",
        citations: r.citations ?? [],
      }]);
    } finally {
      setSending(false);
    }
  }, [sessionId, input, sending]);

  const closeChat = useCallback(async () => {
    if (sessionId) await __testHooks.callQuotingAction("live_chat_session_close", { sessionId });
    setOpen(false);
    setSessionId(null);
    setTurns([]);
  }, [sessionId]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} data-testid="lcw-reopen" style={{ position: "fixed", bottom: 16, right: 16, padding: 12, borderRadius: 24, background: "#2563eb", color: "#fff", border: "none" }}>
        💬 Chat
      </button>
    );
  }

  return (
    <div data-testid="lcw-widget" role="region" aria-label="Live troubleshooting chat" style={{ position: "fixed", bottom: 16, right: 16, width: 360, height: 480, background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, display: "flex", flexDirection: "column", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <div style={{ padding: 8, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: "bold" }}>Live troubleshoot</span>
        <button onClick={closeChat} data-testid="lcw-close" aria-label="Close chat" style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>×</button>
      </div>

      <div data-testid="lcw-turns" style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {turns.length === 0 && <p style={{ color: "#6b7280", fontSize: 12 }}>Ask a question — e.g. "why is my tool breaking?"</p>}
        {turns.map((t) => (
          <div key={t.id} data-testid={`lcw-turn-${t.role}`} style={{ marginBottom: 8, padding: 6, background: t.role === "user" ? "#dbeafe" : "#f3f4f6", borderRadius: 4 }}>
            <p style={{ margin: 0, fontSize: 13 }}>{t.text}</p>
            {t.citations && t.citations.length > 0 && (
              <div data-testid={`lcw-citations-${t.id}`} style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {t.citations.map((c, i) => (
                  <span key={i} data-testid="lcw-citation-chip" style={{ fontSize: 10, padding: "2px 6px", background: "#e5e7eb", borderRadius: 10, color: "#374151" }}>
                    {c.source} ({(c.relevance * 100).toFixed(0)}%)
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: 8, borderTop: "1px solid #e5e7eb", display: "flex", gap: 4 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void sendTurn(); }}
          placeholder="Your question…"
          data-testid="lcw-input"
          disabled={!sessionId || sending}
          style={{ flex: 1, padding: 6, border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
        />
        <button onClick={() => void sendTurn()} data-testid="lcw-send" disabled={!sessionId || sending || input.trim().length === 0} style={{ padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default LiveChatWidget;
