/**
 * R9-MS2 DNC Transfer Engine Tests
 * ==================================
 * Validates: G-code generation, DNC transfer (send/compare/verify),
 * QR code data, transfer history, dispatcher routing.
 */

import {
  dncTransfer, generateParameterBlock, executeDNCTransfer, generateQRData,
  getTransferHistory, getTransferById,
} from "../../src/engines/DNCTransferEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: dnc_generate — basic G-code parameter block ────────────────────────
console.log("T1: dnc_generate — basic G-code block");
{
  const r = dncTransfer("dnc_generate", {
    program_number: "O1234",
    material: "AISI 4140",
    machine: "Haas VF-4",
    tool: "T01 1/2\" 4FL CARBIDE",
    rpm: 3200,
    feed_mmmin: 488,
    doc_mm: 2.5,
    woc_mm: 3.2,
    strategy: "TROCHOIDAL",
    safety_score: 0.85,
    omega_score: 0.78,
    controller: "fanuc",
  });
  assert(r.program_number === "O1234", "T1.1 program number");
  assert(r.gcode.includes("S3200"), "T1.2 gcode has S3200");
  assert(r.gcode.includes("PRISM PARAMETERS"), "T1.3 gcode has header");
  assert(r.gcode.includes("AISI 4140"), "T1.4 material in gcode");
  assert(r.parameters.rpm === 3200, "T1.5 rpm in parameters");
  assert(r.parameters.feed_mmmin === 488, "T1.6 feed in parameters");
  assert(r.parameters.strategy === "TROCHOIDAL", "T1.7 strategy");
  assert(r.safety_score === 0.85, "T1.8 safety score");
}

// ─── T2: dnc_generate — Siemens controller format ───────────────────────────
console.log("T2: dnc_generate — Siemens controller");
{
  const r = dncTransfer("dnc_generate", {
    rpm: 4000,
    feed_mmmin: 600,
    controller: "siemens",
  });
  assert(r.gcode.includes("; PRISM"), "T2.1 Siemens uses semicolon comments");
  assert(!r.gcode.includes("(PRISM"), "T2.2 not Fanuc parentheses");
  assert(r.gcode.includes("S4000"), "T2.3 has RPM");
}

// ─── T3: dnc_generate — Heidenhain controller ──────────────────────────────
console.log("T3: dnc_generate — Heidenhain controller");
{
  const r = dncTransfer("dnc_generate", { controller: "heidenhain" });
  assert(r.gcode.includes("; PRISM"), "T3.1 Heidenhain uses semicolons");
}

// ─── T4: dnc_generate — default values ──────────────────────────────────────
console.log("T4: dnc_generate — defaults");
{
  const r = dncTransfer("dnc_generate", {});
  assert(r.program_number === "O0001", "T4.1 default program O0001");
  assert(r.controller === "fanuc", "T4.2 default controller fanuc");
  assert(r.parameters.rpm > 0, "T4.3 default rpm > 0");
  assert(r.gcode.length > 0, "T4.4 gcode generated");
}

// ─── T5: dnc_send — simulate file transfer ──────────────────────────────────
console.log("T5: dnc_send — file transfer");
{
  const r = dncTransfer("dnc_send", {
    program_number: "O5001",
    machine: "Haas-VF2",
    system: "haas_net",
  });
  assert(r.status === "sent", "T5.1 status is sent");
  assert(r.transfer_id.startsWith("DNC-"), "T5.2 has transfer ID");
  assert(r.program_number === "O5001", "T5.3 program number echoed");
  assert(r.machine === "Haas-VF2", "T5.4 machine echoed");
  assert(r.details.includes("sent"), "T5.5 details say sent");
}

// ─── T6: dnc_compare — verify parameters match ─────────────────────────────
console.log("T6: dnc_compare — match verification");
{
  const r = dncTransfer("dnc_compare", {
    program_number: "O5002",
    machine: "DMG-DMU50",
    content: "S3200 F19.2",
  });
  assert(r.status === "verified" || r.status === "mismatch", "T6.1 status is verified or mismatch");
  assert(r.transfer_id.startsWith("DNC-"), "T6.2 has transfer ID");
}

// ─── T7: dnc_verify — integrity check ──────────────────────────────────────
console.log("T7: dnc_verify — integrity");
{
  const r = dncTransfer("dnc_verify", {
    program_number: "O5003",
    machine: "Mazak-QT",
  });
  assert(r.status === "verified", "T7.1 verified status");
  assert(r.details.includes("verified"), "T7.2 details mention verified");
}

// ─── T8: dnc_qr — QR code data generation ──────────────────────────────────
console.log("T8: dnc_qr — QR code data");
{
  const r = dncTransfer("dnc_qr", {
    program_number: "O7001",
    material: "7075 Aluminum",
    machine: "Haas VF-4",
    tool: "T03",
    rpm: 8000,
    feed_mmmin: 2400,
    doc_mm: 3.0,
    woc_mm: 1.5,
  });
  assert(r.data.type === "prism_params", "T8.1 type is prism_params");
  assert(r.data.program === "O7001", "T8.2 program number");
  assert(r.data.rpm === 8000, "T8.3 rpm");
  assert(r.data.feed === 2400, "T8.4 feed");
  assert(typeof r.json === "string", "T8.5 json string");
  assert(r.byte_size > 0, "T8.6 byte size > 0");
  assert(r.fits_standard_qr === true, "T8.7 fits standard QR");
}

// ─── T9: dnc_qr — compact enough for QR ────────────────────────────────────
console.log("T9: dnc_qr — QR size validation");
{
  const r = dncTransfer("dnc_qr", {
    material: "A very long material name that still should fit",
    machine: "Some Machine With A Long Name Too",
  });
  assert(r.byte_size < 2048, "T9.1 under 2KB QR limit");
}

// ─── T10: dnc_systems — list DNC systems ────────────────────────────────────
console.log("T10: dnc_systems — list systems");
{
  const r = dncTransfer("dnc_systems", {});
  assert(Array.isArray(r.systems), "T10.1 systems is array");
  assert(r.total >= 7, "T10.2 at least 7 systems");
  const ids = r.systems.map((s: any) => s.id);
  assert(ids.includes("cimco"), "T10.3 has cimco");
  assert(ids.includes("predator"), "T10.4 has predator");
  assert(ids.includes("haas_net"), "T10.5 has haas_net");
  assert(ids.includes("qr_code"), "T10.6 has qr_code");
  assert(ids.includes("file_system"), "T10.7 has file_system");
}

// ─── T11: dnc_history — transfer history ────────────────────────────────────
console.log("T11: dnc_history — transfer log");
{
  const r = dncTransfer("dnc_history", {});
  assert(r.total >= 3, "T11.1 at least 3 transfers from earlier tests");
  assert(Array.isArray(r.transfers), "T11.2 transfers is array");
}

// ─── T12: dnc_history — filter by machine ───────────────────────────────────
console.log("T12: dnc_history — machine filter");
{
  const r = dncTransfer("dnc_history", { machine: "Haas-VF2" });
  assert(r.total >= 1, "T12.1 found Haas-VF2 transfers");
  assert(r.transfers.every((t: any) => t.machine === "Haas-VF2"), "T12.2 all filtered to Haas-VF2");
}

// ─── T13: dnc_get — get specific transfer ───────────────────────────────────
console.log("T13: dnc_get — specific transfer");
{
  const r = dncTransfer("dnc_get", { id: "DNC-0001" });
  assert(r.transfer_id === "DNC-0001", "T13.1 found DNC-0001");
  assert(r.status !== undefined, "T13.2 has status");
}

// ─── T14: dnc_get — not found ───────────────────────────────────────────────
console.log("T14: dnc_get — not found");
{
  const r = dncTransfer("dnc_get", { id: "DNC-9999" });
  assert(r.error !== undefined, "T14.1 error for missing transfer");
}

// ─── T15: Direct API — generateParameterBlock ───────────────────────────────
console.log("T15: Direct API — generateParameterBlock");
{
  const block = generateParameterBlock({
    rpm: 5000,
    feed_mmmin: 1200,
    material: "Inconel 718",
    controller: "fanuc",
  });
  assert(block.rpm === 5000, "T15.1 rpm");
  assert(block.gcode.includes("S5000"), "T15.2 gcode has S5000");
  assert(block.gcode.includes("Inconel 718"), "T15.3 material in gcode");
}

// ─── T16: Direct API — generateQRData ───────────────────────────────────────
console.log("T16: Direct API — generateQRData");
{
  const qr = generateQRData({ rpm: 4000, feed_mmmin: 800 });
  assert(qr.rpm === 4000, "T16.1 rpm");
  assert(qr.feed === 800, "T16.2 feed");
  assert(qr.version === "1.0", "T16.3 version");
}

// ─── T17: Direct API — executeDNCTransfer ───────────────────────────────────
console.log("T17: Direct API — executeDNCTransfer");
{
  const result = executeDNCTransfer({
    program_number: "O9001",
    machine: "Test-Machine",
    content: "S2000 F10",
    action: "send",
    system: "cimco",
  });
  assert(result.status === "sent", "T17.1 sent status");
  assert(result.machine === "Test-Machine", "T17.2 machine");
}

// ─── T18: Direct API — transfer history ─────────────────────────────────────
console.log("T18: Direct API — getTransferHistory");
{
  const history = getTransferHistory();
  assert(history.length > 0, "T18.1 history has entries");
}

// ─── T19: Multiple controller types ─────────────────────────────────────────
console.log("T19: Multiple controller types");
{
  const controllers = ["fanuc", "siemens", "haas", "mazak", "heidenhain", "generic"];
  for (const c of controllers) {
    const r = dncTransfer("dnc_generate", { controller: c, rpm: 3000 });
    assert(r.gcode.includes("S3000"), `T19 ${c} has S3000`);
    assert(r.gcode.length > 50, `T19 ${c} gcode has content`);
  }
}

// ─── T20: All DNC systems for send ──────────────────────────────────────────
console.log("T20: All DNC systems for send");
{
  const systems = ["cimco", "predator", "sfa", "haas_net", "mazak_smooth", "file_system"];
  for (const sys of systems) {
    const r = dncTransfer("dnc_send", {
      program_number: "O2000",
      machine: `test-${sys}`,
      system: sys,
    });
    assert(r.status === "sent", `T20 ${sys} sent successfully`);
  }
}

// ─── T21: Edge — unknown action ─────────────────────────────────────────────
console.log("T21: Edge — unknown action");
{
  const r = dncTransfer("dnc_nonexistent", {});
  assert(r.error !== undefined, "T21.1 unknown action returns error");
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R9-MS2 DNC Transfer: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
