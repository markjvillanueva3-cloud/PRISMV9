const body = {
  jsonrpc: "2.0", id: 1, method: "tools/call",
  params: { name: "prism_cam", arguments: {
    action: "master_post_hurco_v11",
    params: {
      operations: [{
        operation_type: "pocket", tool_number: 3, tool_diameter_mm: 10, tool_flutes: 4,
        tool_description: "10MM EM", material_iso: "N", spindle_rpm: 8000, feed_mm_min: 1200,
        axial_depth_mm: 6, radial_depth_mm: 4, coolant: "flood",
        coordinates: [
          { x: 0, y: 0, z: 5, type: "rapid" },
          { x: 0, y: 0, z: -6, type: "linear" },
          { x: 50, y: 0, z: -6, type: "linear" }
        ]
      }],
      config: { program_number: 2025, use_ultimotion: true, work_offset: 54, units: "metric", safe_z_mm: 50 }
    }
  }}
};
const res = await fetch("http://127.0.0.1:3100/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
  body: JSON.stringify(body)
});
const text = await res.text();
let payload = text; const m = text.match(/data: (.*)/s); if (m) payload = m[1];
const obj = JSON.parse(payload);
const inner = obj?.result?.content?.[0]?.text;
const parsed = inner ? JSON.parse(inner) : obj;
console.log(JSON.stringify(parsed, null, 2).slice(0, 1500));
