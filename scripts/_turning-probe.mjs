const mod = await import("../mcp-server/dist/engines/TurningPrintToProgramEngine.js");
const e = mod.turningPrintToProgramEngine || mod.default?.turningPrintToProgramEngine;
const input = {
  part_number: "PROBE-SHAFT",
  material: { material_name: "4140", iso_group: "P", hardness_hrc: 28 },
  bar_stock_od_mm: 50.8, part_length_mm: 76.2,
  controller: "okuma", chuck_type: "3_jaw", tailstock: true,
  features: [{
    id: "f1", type: "od_step", length_mm: 76.2, od_mm: 44.45,
    required_operations: ["face_finish","od_rough","od_finish","part_off"],
    profile_points: [
      { X: 50.8, Z: 0, type: "linear" },
      { X: 44.45, Z: -50.8, type: "linear" },
      { X: 44.45, Z: -76.2, type: "linear" },
    ],
  }],
};
try {
  const r = e.runPipeline(input);
  const prog = r.program_text || r.programText || r.gcode || r.program || "";
  console.log("OK. result keys:", Object.keys(r).slice(0,24).join(","));
  console.log("program_lines:", String(prog).split("\n").length);
  console.log("---first 18 lines---\n" + String(prog).split("\n").slice(0,18).join("\n"));
} catch (err) {
  console.log("ERR", err.message);
  console.log((err.stack||"").split("\n").slice(0,5).join("\n"));
}
