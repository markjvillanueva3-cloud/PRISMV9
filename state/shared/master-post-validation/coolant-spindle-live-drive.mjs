const BASE = "http://127.0.0.1:3100/mcp";
async function call(action, params) {
  const r = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "prism_cam", arguments: { action, params } } }),
  });
  const txt = await r.text();
  let payload = txt; const m = txt.match(/data:\s*(\{.*\})\s*$/s); if (m) payload = m[1];
  let j; try { j = JSON.parse(payload); } catch { return { raw: txt.slice(0,500) }; }
  const inner = j?.result?.content?.[0]?.text;
  if (inner) { try { return JSON.parse(inner); } catch { return { text: inner.slice(0,1500) }; } }
  return j;
}
function op(coolant, spindle_rpm, axial_depth_mm, tool_diameter_mm) {
  return { operation_type: "pocket", tool_number: 1, tool_diameter_mm, tool_flutes: 4,
    tool_description: "10mm 4FL endmill", material_iso: "P",
    spindle_rpm, feed_mm_min: 800, axial_depth_mm, radial_depth_mm: 5, coolant,
    coordinates: [{x:0,y:0,z:5,type:"rapid"},{x:10,y:0,z:-2,type:"linear"},{x:10,y:10,z:-2,type:"linear"}] };
}
const eo = (r) => r.engine_output || r;
const gcode = (r) => eo(r).gcode || [];
const grep = (r, re) => gcode(r).filter(l => re.test(l));
const warns = (r) => eo(r).warnings || [];
const phys = (r) => eo(r).physics_checks || [];

const r1 = await call("master_post_hurco_v11", { operations: [op("flood", 6000, 2, 10)], config: { program_number: 5001, coolant_mode: "flood", units: "metric", use_ultimotion: false } });
const r2 = await call("master_post_hurco_v11", { operations: [op("mist", 6000, 2, 10)], config: { program_number: 5002, units: "metric", use_ultimotion: false } });
const r3 = await call("master_post_hurco_v11", { operations: [op("tsc", 6000, 2, 10)], config: { program_number: 5003, units: "metric", use_ultimotion: false } });
const r4 = await call("master_post_hurco_v11", { operations: [op("off", 6000, 8, 10)], config: { program_number: 5004, coolant_mode: "off", units: "metric", use_ultimotion: false } });
const r5 = await call("master_post_hurco_v11", { operations: [op("flood", 15000, 2, 10)], config: { program_number: 5005, units: "metric", use_ultimotion: false } });

const out = {
  c1_flood: { topkeys: Object.keys(eo(r1)).slice(0,18), coolant: grep(r1,/M0[789]|M88|COOLANT/), spindleM03: grep(r1,/M03|M04|M05/), Sline: grep(r1,/^S\d|SPINDLE CW/) },
  c2_mist:  { coolant: grep(r2,/M0[789]|M88|COOLANT/) },
  c3_tsc:   { coolant: grep(r3,/M0[789]|M88|COOLANT/) },
  c4_off_heavy: { coolant: grep(r4,/M0[789]|M88|COOLANT/), dwell: grep(r4,/G04|DWELL/), end: grep(r4,/M05|M09|M30/) },
  c5_overmax: { warnings: warns(r5).filter(w=>/RPM|spindle/i.test(w)), Sline: grep(r5,/S15000/), physicsSpindle: phys(r5).filter(c=>/Spindle/i.test(c.check)).map(c=>({check:c.check,passed:c.passed})) },
};
console.log(JSON.stringify(out, null, 2));
