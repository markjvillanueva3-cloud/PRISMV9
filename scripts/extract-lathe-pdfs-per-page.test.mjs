import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyPage } from "./extract-lathe-pdfs-per-page.mjs";

describe("classifyPage — lathe detection", () => {
  it("classifies a G71 roughing cycle page as lathe", () => {
    const body = [
      "G71 Stock Removal Cycle",
      "G71 U2.0 R0.5",
      "G71 P100 Q200 U0.3 W0.1 F0.25",
      "The G71 canned cycle is the workhorse for OD roughing on Fanuc lathes.",
    ].join("\n");
    const r = classifyPage(body);
    assert.equal(r.is_lathe_page, true);
    assert.ok(r.atoms.g_codes.includes("G71"));
  });

  it("classifies a constant-surface-speed page as lathe", () => {
    const body = "Constant surface speed (G96) maintains Vc as the workpiece diameter changes during facing on a CNC lathe. Use G50 S3000 to cap RPM.";
    const r = classifyPage(body);
    assert.equal(r.is_lathe_page, true);
    assert.ok(r.atoms.g_codes.includes("G96"));
    assert.ok(r.atoms.g_codes.includes("G50"));
  });

  it("classifies a milling-only page as NOT lathe", () => {
    const body = "Adaptive clearing with a 12mm end mill, 4-flute carbide, helix angle 38 degrees. Step-down 1.5mm, step-over 0.4D. Face milling at high speed.";
    const r = classifyPage(body);
    assert.equal(r.is_lathe_page, false);
    assert.ok(r.scores.mill >= r.scores.lathe);
  });

  it("classifies a turning-insert page as lathe even without G-codes", () => {
    const body = "CNMG 432-MA insert with neutral toolholder. Standard turning geometry.";
    const r = classifyPage(body);
    assert.equal(r.is_lathe_page, true);
    assert.ok(r.atoms.insert_codes.includes("CNMG"));
  });

  it("returns safe defaults for empty / non-string input", () => {
    assert.equal(classifyPage(null).is_lathe_page, false);
    assert.equal(classifyPage("").is_lathe_page, false);
    assert.equal(classifyPage("short").is_lathe_page, false);
  });

  it("detects ISO P/M/K groups in vendor-style text", () => {
    const body = "Recommended for ISO P25 steel, ISO M20 stainless, ISO K30 cast iron. Grade KCP25 is the workhorse for steel lathe turning operations.";
    const r = classifyPage(body);
    assert.ok(r.atoms.iso_groups.includes("P"));
    assert.ok(r.atoms.iso_groups.includes("M"));
    assert.ok(r.atoms.iso_groups.includes("K"));
    assert.ok(r.atoms.vendor_grades.includes("KCP25"));
  });

  it("detects controller mentions", () => {
    const body = "On the Fanuc 0i lathe, G71 works. On Okuma OSP, the equivalent is LAP cycle. Mazak Matrix supports both. The CNC lathe controller must be configured.";
    const r = classifyPage(body);
    assert.ok(r.atoms.controllers.some(c => /Fanuc/i.test(c)));
    assert.ok(r.atoms.controllers.some(c => /Okuma/i.test(c)));
    assert.ok(r.atoms.controllers.some(c => /Mazak/i.test(c)));
  });
});
