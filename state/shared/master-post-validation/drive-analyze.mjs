const URL = "http://127.0.0.1:3100/mcp";
async function call(action, params) {
  const r = await fetch(URL, { method:"POST", headers:{ "Content-Type":"application/json", "Accept":"application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"tools/call", params:{ name:"prism_cam", arguments:{ action, params } } }) });
  const txt = await r.text(); const m = txt.match(/data:\s*(\{.*\})\s*$/s) || txt.match(/^\s*(\{.*\})\s*$/s);
  let json; try { json = JSON.parse(m?m[1]:txt);} catch { return {_raw:txt.slice(0,300)};}
  const inner=json?.result?.content?.[0]?.text; try { return JSON.parse(inner);} catch { return inner??json;}
}
const goodGcode = ["O2001 (PRISM)","(MACHINE: HURCO VMX24 - WINMAX V11)","G21","G90 G17 G40 G49 G80","G54","G91 G28 Z0","T1 M06","G05.3 P10","G43 H1","S3000 M03","M08","G00 Z50","G01 X10 Y0 Z-2 F800","G02 X10 Y10 R5 F800","M05","M09","G91 G28 Z0","M30","%"].join("\n");
// bad gcode: no safe start, no M05, no M09
const badGcode = ["O2002","T1 M06","G01 X10 Y0 F800","M30","%"].join("\n");

const good = await call("master_post_unified_agi_analyze", { gcode: goodGcode, controller: "hurco", material_iso: "P" });
const bad  = await call("master_post_unified_agi_analyze", { gcode: badGcode, controller: "hurco", material_iso: "P" });
console.log("GOOD:", JSON.stringify({ q: good?.data?.quality_score ?? good?.quality_score, dims: good?.data?.dimensions ?? good?.dimensions, ctrl: good?.data?.detected_controller ?? good?.detected_controller }, null, 1));
console.log("BAD:", JSON.stringify({ q: bad?.data?.quality_score ?? bad?.quality_score, dims: bad?.data?.dimensions ?? bad?.dimensions, warn: (bad?.data?.warnings ?? bad?.warnings) }, null, 1));
