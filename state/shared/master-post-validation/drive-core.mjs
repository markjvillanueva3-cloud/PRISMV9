const body = {
  jsonrpc: "2.0", id: 1, method: "tools/call",
  params: {
    name: "prism_cam",
    arguments: {
      action: "master_post_hurco_v11",
      params: {
        operations: [
          {
            operation_type: "pocket",
            tool_number: 3,
            tool_diameter_mm: 10,
            tool_flutes: 4,
            tool_description: "10MM 4FL CARBIDE EM",
            material_iso: "N",
            spindle_rpm: 8000,
            feed_mm_min: 1200,
            axial_depth_mm: 6,
            radial_depth_mm: 4,
            coolant: "flood",
            coordinates: [
              { x: 0, y: 0, z: 5, type: "rapid" },
              { x: 0, y: 0, z: -6, type: "linear" },
              { x: 50, y: 0, z: -6, type: "linear" },
              { x: 50, y: 30, z: -6, type: "arc_cw" }
            ],
            arc_data: [ {}, {}, {}, { i: 0, j: 15 } ]
          },
          {
            operation_type: "drill",
            tool_number: 7,
            tool_diameter_mm: 6.8,
            tool_flutes: 2,
            tool_description: "6.8MM DRILL",
            material_iso: "N",
            spindle_rpm: 5000,
            feed_mm_min: 400,
            axial_depth_mm: 12,
            coolant: "flood",
            coordinates: [
              { x: 25, y: 15, z: 5, type: "rapid" },
              { x: 25, y: 15, z: -12, type: "linear" }
            ]
          }
        ],
        config: {
          program_number: 2025,
          program_comment: "CORE GEN VALIDATION",
          use_ultimotion: true,
          coolant_mode: "flood",
          work_offset: 54,
          units: "metric",
          safe_z_mm: 50
        }
      }
    }
  }
};
const res = await fetch("http://127.0.0.1:3100/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
  body: JSON.stringify(body)
});
const text = await res.text();
// parse SSE or JSON
let payload = text;
const m = text.match(/data: (.*)/s);
if (m) payload = m[1];
let obj;
try { obj = JSON.parse(payload); } catch { console.log("RAW:", text.slice(0,800)); process.exit(1); }
const inner = obj?.result?.content?.[0]?.text;
const parsed = inner ? JSON.parse(inner) : obj;
const gc = parsed?.gcode || parsed?.data?.gcode || parsed?.result?.gcode;
console.log("HAS_GCODE:", Array.isArray(gc), "lines:", Array.isArray(gc)? gc.length : "n/a");
if (Array.isArray(gc)) console.log(gc.join("\n"));
console.log("=== KEYS ===", Object.keys(parsed));
console.log("=== WARNINGS ===", JSON.stringify(parsed?.warnings));
console.log("=== TOOLS ===", JSON.stringify(parsed?.tools_used));
console.log("=== CYCLE ===", parsed?.estimated_cycle_min);
console.log("=== PHYS ===", JSON.stringify(parsed?.physics_checks?.slice(0,3)));
console.log("=== SETUP_SHEET ===", JSON.stringify(parsed?.setup_sheet));
console.log("=== VERIFY ===", JSON.stringify(parsed?.verify ?? parsed?.verify_result ?? "n/a").slice(0,300));
