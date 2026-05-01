/**
 * CAMX-MS19/U14 — Mill-Turn Web UI
 *
 * Multi-channel sync, sub-spindle transfer, bar tracking, live-turret C-axis
 * dashboard for mill-turn lathes (e.g., Okuma MULTUS, Mazak INTEGREX).
 */
import React, { useState } from "react";

interface ChannelState {
  id: string;
  program: string;
  status: "idle" | "running" | "waiting_sync" | "fault";
  active_tool: string;
}

interface BarState {
  remaining_mm: number;
  stock_diameter_mm: number;
  pieces_left: number;
}

export default function MillTurnPage(): JSX.Element {
  const [channels, setChannels] = useState<ChannelState[]>([
    { id: "$1", program: "O1001", status: "running",     active_tool: "T0101 - OD rough" },
    { id: "$2", program: "O2001", status: "waiting_sync", active_tool: "T0505 - Live mill" },
  ]);
  const [bar, setBar] = useState<BarState>({ remaining_mm: 1250, stock_diameter_mm: 32, pieces_left: 42 });
  const [syncMarkers, setSyncMarkers] = useState<string[]>(["M400 - pre-transfer", "M401 - sub-spindle grip"]);

  return (
    <div className="millturn-page" style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Mill-Turn Control</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Channels</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Channel</th>
              <th style={th}>Program</th>
              <th style={th}>Status</th>
              <th style={th}>Active Tool</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.id}>
                <td style={td}>{c.id}</td>
                <td style={td}>{c.program}</td>
                <td style={{ ...td, color: statusColor(c.status) }}>{c.status}</td>
                <td style={td}>{c.active_tool}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Sub-Spindle Transfer</h2>
        <div data-testid="sync-markers">
          {syncMarkers.map((m, i) => (
            <div key={i} style={{ fontFamily: "monospace", fontSize: 13 }}>{m}</div>
          ))}
        </div>
      </section>

      <section>
        <h2>Bar Tracking</h2>
        <div data-testid="bar-state">
          <div>Remaining: <strong>{bar.remaining_mm} mm</strong></div>
          <div>Diameter: <strong>{bar.stock_diameter_mm} mm</strong></div>
          <div>Pieces left: <strong>{bar.pieces_left}</strong></div>
        </div>
      </section>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ccc", padding: "6px 12px", fontWeight: 600 };
const td: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "6px 12px" };

function statusColor(s: ChannelState["status"]): string {
  switch (s) {
    case "running":      return "#0a7e3b";
    case "waiting_sync": return "#b07800";
    case "fault":        return "#c42020";
    default:             return "#666";
  }
}
