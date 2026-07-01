/**
 * jm-die-content-classifier.test.mjs — concrete-value tests for the
 * content-based fallback classifier.
 *
 * Every assertion is exact-value equality.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-CONTENT-CLASSIFIER
 * @slot echo · @iter 12 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  leadingPages,
  detectController,
  detectVendor,
  classifyWithContent,
} from "./jm-die-content-classifier.mjs";

describe("leadingPages: form-feed prefix window", () => {
  it("3-page text returns 2 pages when n=2", () => {
    assert.equal(leadingPages("a\fb\fc", 2).includes("c"), false);
  });

  it("3-page text returns 2 pages when n=2 (a present)", () => {
    assert.equal(leadingPages("a\fb\fc", 2).includes("a"), true);
  });

  it("default n=5 with 3-page text returns all 3 pages joined", () => {
    assert.equal(leadingPages("a\fb\fc").split("\n").length, 3);
  });

  it("null input returns empty string", () => {
    assert.equal(leadingPages(null, 5), "");
  });

  it("n=0 falls back to default cap (5)", () => {
    assert.equal(leadingPages("a\fb\fc", 0).includes("c"), true);
  });
});

describe("detectController: regex marker matching", () => {
  it("'Haas Automation' returns haas", () => {
    assert.equal(detectController("Manufactured by Haas Automation Inc."), "haas");
  });

  it("'Haas Mill' returns haas", () => {
    assert.equal(detectController("This Haas Mill is operated as follows"), "haas");
  });

  it("'Mazatrol Matrix' returns mazak", () => {
    assert.equal(detectController("Mazatrol Matrix programming reference"), "mazak");
  });

  it("'OSP-P200L' returns okuma", () => {
    assert.equal(detectController("OSP-P200L Operation Manual"), "okuma");
  });

  it("'WinMax' returns hurco", () => {
    assert.equal(detectController("WinMax Mill Workbook"), "hurco");
  });

  it("'Sinumerik 840D' returns siemens", () => {
    assert.equal(detectController("Sinumerik 840D documentation"), "siemens");
  });

  it("'TNC 530' returns heidenhain", () => {
    assert.equal(detectController("Heidenhain TNC 530 control reference"), "heidenhain");
  });

  it("'Fanuc 30i-' returns fanuc", () => {
    assert.equal(detectController("Fanuc 30i-Model B series"), "fanuc");
  });

  it("'Mitsubishi Electric CNC' returns mitsubishi", () => {
    assert.equal(detectController("Mitsubishi Electric CNC manual"), "mitsubishi");
  });

  it("text with no marker returns null", () => {
    assert.equal(detectController("This is just CNC programming text without vendor markers"), null);
  });

  it("null input returns null", () => {
    assert.equal(detectController(null), null);
  });
});

describe("detectVendor: vendor marker matching", () => {
  it("'Haas Automation' returns Haas", () => {
    assert.equal(detectVendor("Haas Automation, Inc."), "Haas");
  });

  it("'Autodesk Inventor CAM' returns Autodesk", () => {
    assert.equal(detectVendor("Autodesk Inventor CAM documentation"), "Autodesk");
  });

  it("'hyperMILL' returns OpenMind", () => {
    assert.equal(detectVendor("Using hyperMILL for 3D machining"), "OpenMind");
  });

  it("'Mastercam' returns Mastercam", () => {
    assert.equal(detectVendor("Mastercam 2025 user guide"), "Mastercam");
  });

  it("'iMachining' returns SolidCAM", () => {
    assert.equal(detectVendor("iMachining technology overview"), "SolidCAM");
  });

  it("'Sinumerik' returns Siemens", () => {
    assert.equal(detectVendor("Sinumerik programming basics"), "Siemens");
  });

  it("text with no marker returns null", () => {
    assert.equal(detectVendor("Plain CNC text without vendor names"), null);
  });
});

describe("classifyWithContent: filename + content merge", () => {
  it("filename has vendor — controllerSource=filename", () => {
    const r = classifyWithContent("WinMax-Mill-Intro-Class-Workbook.pdf", "");
    assert.equal(r.controllerSource, "filename");
  });

  it("filename has vendor — controller=hurco", () => {
    const r = classifyWithContent("WinMax-Mill-Intro-Class-Workbook.pdf", "");
    assert.equal(r.controller, "hurco");
  });

  it("filename lacks vendor, content has it — controllerSource=content", () => {
    const filename = "English - Mill Operator's Manual.pdf";
    const text = "Programming the Haas Mill\fThis is the Haas Automation reference manual";
    assert.equal(classifyWithContent(filename, text).controllerSource, "content");
  });

  it("filename lacks vendor, content has it — controller=haas", () => {
    const filename = "English - Mill Operator's Manual.pdf";
    const text = "Programming the Haas Mill\fThis is the Haas Automation reference manual";
    assert.equal(classifyWithContent(filename, text).controller, "haas");
  });

  it("filename lacks vendor, content has it — vendor=Haas", () => {
    const filename = "English - Mill Operator's Manual.pdf";
    const text = "Programming the Haas Mill\fThis is the Haas Automation reference manual";
    assert.equal(classifyWithContent(filename, text).vendor, "Haas");
  });

  it("neither filename nor content has vendor — controller=null", () => {
    assert.equal(classifyWithContent("generic.pdf", "generic programming text").controller, null);
  });

  it("neither filename nor content has vendor — controllerSource=null", () => {
    assert.equal(classifyWithContent("generic.pdf", "generic programming text").controllerSource, null);
  });

  it("filename has hypermill, content scan does not override — cam_system=hypermill (preserved from base)", () => {
    const r = classifyWithContent("hyperMILL_Manual-en-1.pdf", "competitor mentions Mastercam");
    assert.equal(r.cam_system, "hypermill");
  });

  it("opts.leadingPages=1 limits scan window", () => {
    const filename = "noVendor.pdf";
    const text = "page1 generic\fHaas Automation page2";
    assert.equal(classifyWithContent(filename, text, { leadingPages: 1 }).controller, null);
  });
});
