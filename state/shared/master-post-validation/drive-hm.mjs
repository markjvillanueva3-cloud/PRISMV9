// Drive hyperMILL tool/holder/machine export actions live on :3100
const URL = "http://127.0.0.1:3100/mcp";
async function call(action, params) {
  const body = { jsonrpc: "2.0", id: 1, method: "tools/call",
    params: { name: "prism_cam", arguments: { action, params } } };
  const r = await fetch(URL, { method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify(body) });
  const txt = await r.text();
  // SSE or JSON — extract result
  let json;
  if (txt.startsWith("event:") || txt.includes("data:")) {
    const line = txt.split("\n").find(l => l.startsWith("data:"));
    json = JSON.parse(line.slice(5).trim());
  } else { json = JSON.parse(txt); }
  if (json.error) return { __error: json.error };
  const inner = json.result?.content?.[0]?.text;
  try { return JSON.parse(inner); } catch { return inner; }
}

// PRISM base-job tools — INCH source, convert to mm (×25.4)
const IN = 25.4;
const jobTools = [
  { type: "facemill", diameter_mm: 2.0*IN, flutes: 5, label: "2in Face Mill", part_number: "FM-2000", manufacturer: "PRISM" },
  { type: "endmill",  diameter_mm: 0.5*IN, flutes: 4, label: "1/2in End Mill", part_number: "EM-0500", manufacturer: "PRISM" },
  { type: "endmill",  diameter_mm: 0.375*IN, flutes: 4, label: "3/8in End Mill", part_number: "EM-0375", manufacturer: "PRISM" },
  { type: "endmill",  diameter_mm: 0.25*IN, flutes: 4, label: "1/4in End Mill", part_number: "EM-0250", manufacturer: "PRISM" },
  { type: "drill",    diameter_mm: 0.25*IN, flutes: 2, label: "1/4in Drill", part_number: "DR-0250", manufacturer: "PRISM", point_angle_deg: 135 },
];

const out = {};
out.tool_export_job = await call("hypermill_tool_export_job", { job_tools: jobTools, options: {} });
out.tool_export = await call("hypermill_tool_export", { tools: [], options: { start_id: 1 } });
out.build_tool_install = await call("cam_hypermill_build_tool_install", {
  tools: jobTools.map(t => ({ tool_type: t.type, diameter_mm: t.diameter_mm, flutes: t.flutes, name: t.label, tool_number: jobTools.indexOf(t)+1 }))
});
console.log(JSON.stringify(out, null, 2).slice(0, 8000));
import("fs").then(fs => fs.writeFileSync("H:/prism/state/shared/master-post-validation/exports/hypermill/_raw-drive-output.json", JSON.stringify(out, null, 2)));
