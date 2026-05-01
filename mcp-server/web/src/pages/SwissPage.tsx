/**
 * CAMX-MS19/U14 — Swiss-Type Web UI
 *
 * Guide-bushing health, gang-slide tooling layout, back-working channel,
 * bar-feeder state for Swiss-type lathes (Citizen, Star, Tornos).
 */
import React, { useState } from "react";

interface GangSlide {
  id: string;
  station: number;
  tool: string;
  engaged: boolean;
}

interface GuideBushingState {
  diameter_mm: number;
  wear_pct: number;
  concentricity_um: number;
}

export default function SwissPage(): JSX.Element {
  const [guideBushing, setGuideBushing] = useState<GuideBushingState>({
    diameter_mm: 12.0, wear_pct: 12, concentricity_um: 3,
  });
  const [gangSlides, setGangSlides] = useState<GangSlide[]>([
    { id: "GS1", station: 1, tool: "OD rough insert CNMG 432", engaged: true },
    { id: "GS2", station: 2, tool: "Threading G76 60° insert", engaged: false },
    { id: "GS3", station: 3, tool: "Part-off grooving blade",  engaged: false },
    { id: "GS4", station: 4, tool: "Live polygon 4-lobe",      engaged: false },
  ]);
  const [backWorking, setBackWorking] = useState({
    sub_spindle_engaged: true,
    back_drill_active: false,
    back_tool: "T0808 - axial drill",
  });
  const [barFeeder, setBarFeeder] = useState({
    bar_diameter_mm: 12,
    bar_length_mm: 3200,
    fed_length_mm: 1850,
    collet_grip_n: 8500,
  });

  return (
    <div className="swiss-page" style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Swiss-Type Lathe Control</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Guide Bushing</h2>
        <div data-testid="guide-bushing">
          <div>Bushing diameter: <strong>{guideBushing.diameter_mm.toFixed(3)} mm</strong></div>
          <div>Wear: <strong style={{ color: guideBushing.wear_pct > 80 ? "#c42020" : "#0a7e3b" }}>
            {guideBushing.wear_pct}%
          </strong></div>
          <div>Concentricity: <strong>{guideBushing.concentricity_um} µm</strong></div>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Gang-Slide Tooling</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Slide</th>
              <th style={th}>Station</th>
              <th style={th}>Tool</th>
              <th style={th}>Engaged</th>
            </tr>
          </thead>
          <tbody>
            {gangSlides.map((g) => (
              <tr key={g.id}>
                <td style={td}>{g.id}</td>
                <td style={td}>{g.station}</td>
                <td style={td}>{g.tool}</td>
                <td style={{ ...td, color: g.engaged ? "#0a7e3b" : "#666" }}>{g.engaged ? "YES" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Back-Working Channel</h2>
        <div data-testid="back-working">
          <div>Sub-spindle: <strong>{backWorking.sub_spindle_engaged ? "engaged" : "idle"}</strong></div>
          <div>Back drill: <strong>{backWorking.back_drill_active ? "active" : "idle"}</strong></div>
          <div>Active back tool: <strong>{backWorking.back_tool}</strong></div>
        </div>
      </section>

      <section>
        <h2>Bar Feeder</h2>
        <div data-testid="bar-feeder">
          <div>Bar diameter: <strong>{barFeeder.bar_diameter_mm} mm</strong></div>
          <div>Bar length: <strong>{barFeeder.bar_length_mm} mm</strong></div>
          <div>Fed so far: <strong>{barFeeder.fed_length_mm} mm</strong></div>
          <div>Collet grip: <strong>{barFeeder.collet_grip_n} N</strong></div>
        </div>
      </section>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ccc", padding: "6px 12px", fontWeight: 600 };
const td: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "6px 12px" };
