/**
 * jm-die-tribal-wiki-classifier.test.mjs — concrete-value tests for the
 * 80-PDF JM Die TRIBAL+WIKI corpus classifier. Each assertion checks the
 * exact published classification for a real filename from the corpus.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-TRIBAL-WIKI-CORPUS
 * @slot echo
 * @iter 8
 * @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyTribalWikiPdf, classifyAll, DOMAIN_TO_ENGINE_BRIDGES } from "./jm-die-tribal-wiki-classifier.mjs";

describe("domain classification: post-processor PDFs route to post", () => {
  it("Post Processor Training Guide.pdf → domain=post, post_writing=true", () => {
    const r = classifyTribalWikiPdf("Post Processor Training Guide.pdf");
    assert.equal(r.domain, "post");
    assert.equal(r.post_writing, true);
  });

  it("Post+Processor+Documentation+-+2021-02-04.pdf → domain=post, post_writing=true", () => {
    const r = classifyTribalWikiPdf("Post+Processor+Documentation+-+2021-02-04.pdf");
    assert.equal(r.domain, "post");
    assert.equal(r.post_writing, true);
  });

  it("RC2024-PPG-Reference.pdf → domain=post (PPG = post processor generator)", () => {
    const r = classifyTribalWikiPdf("RC2024-PPG-Reference.pdf");
    assert.equal(r.domain, "post");
  });
});

describe("domain classification: lathe PDFs route to lathe", () => {
  it("CNC Lathe Programming for Turning.pdf → domain=lathe", () => {
    const r = classifyTribalWikiPdf("CNC Lathe Programming for Turning.pdf");
    assert.equal(r.domain, "lathe");
  });

  it("OSP-P200L-Macturn-Multus-Series-Operation-Manual-LE32-114-R4.pdf → domain=lathe + controller=okuma", () => {
    const r = classifyTribalWikiPdf("OSP-P200L-Macturn-Multus-Series-Operation-Manual-LE32-114-R4.pdf");
    assert.equal(r.domain, "lathe");
    assert.equal(r.controller, "okuma");
  });

  it("InventorCAM2024_Turning_&_Mill-Turn_Training_Course.pdf → domain=lathe + cam_system=inventorcam", () => {
    const r = classifyTribalWikiPdf("InventorCAM2024_Turning_&_Mill-Turn_Training_Course.pdf");
    assert.equal(r.domain, "lathe");
    assert.equal(r.cam_system, "inventorcam");
  });
});

describe("domain classification: mill PDFs route to mill", () => {
  it("WinMax-Mill-Intro-Class-Workbook.pdf → domain=mill + controller=hurco", () => {
    const r = classifyTribalWikiPdf("WinMax-Mill-Intro-Class-Workbook.pdf");
    assert.equal(r.domain, "mill");
    assert.equal(r.controller, "hurco");
  });

  it("Programming Haas CNC Control G-Codes and M-Codes.pdf → controller=haas", () => {
    const r = classifyTribalWikiPdf("Programming Haas CNC Control G-Codes and M-Codes.pdf");
    assert.equal(r.controller, "haas");
  });

  it("InventorCAM2024_3D_HSM_User_Guide.pdf → domain=mill (3D HSM is mill)", () => {
    const r = classifyTribalWikiPdf("InventorCAM2024_3D_HSM_User_Guide.pdf");
    assert.equal(r.domain, "mill");
    assert.equal(r.cam_system, "inventorcam");
  });

  it("Dynamic_Milling.pdf → domain=mill", () => {
    const r = classifyTribalWikiPdf("Dynamic_Milling.pdf");
    assert.equal(r.domain, "mill");
  });

  it("Face Mill Speeds and Feeds [Calculator, 45 or 90 Degrees_].pdf → domain=mill", () => {
    const r = classifyTribalWikiPdf("Face Mill Speeds and Feeds [Calculator, 45 or 90 Degrees_].pdf");
    assert.equal(r.domain, "mill");
  });
});

describe("domain classification: wire-EDM PDFs route to wire", () => {
  it("Mastercam-Wire-Tutorial.pdf → domain=wire + cam_system=mastercam", () => {
    const r = classifyTribalWikiPdf("Mastercam-Wire-Tutorial.pdf");
    assert.equal(r.domain, "wire");
    assert.equal(r.cam_system, "mastercam");
  });
});

describe("domain classification: CAD PDFs route to cad", () => {
  it("FUSION CAD.pdf → domain=cad + cam_system=fusion360", () => {
    const r = classifyTribalWikiPdf("FUSION CAD.pdf");
    assert.equal(r.domain, "cad");
  });

  it("David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf → cam_system=solidworks", () => {
    const r = classifyTribalWikiPdf("David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf");
    assert.equal(r.cam_system, "solidworks");
  });

  it("The Beginner's Guide to GD&T - Plus Minus Tolerancing.pdf → domain=cad (GD&T)", () => {
    const r = classifyTribalWikiPdf("The Beginner's Guide to GD&T - Plus Minus Tolerancing.pdf");
    assert.equal(r.domain, "cad");
  });
});

describe("domain classification: CAM strategy PDFs route to cam", () => {
  it("bro-cam-strategies-en.pdf → domain=cam", () => {
    const r = classifyTribalWikiPdf("bro-cam-strategies-en.pdf");
    assert.equal(r.domain, "cam");
  });

  it("Introduction_to_Multiaxis_Toolpaths.pdf → domain=cam", () => {
    const r = classifyTribalWikiPdf("Introduction_to_Multiaxis_Toolpaths.pdf");
    assert.equal(r.domain, "cam");
  });

  it("InventorCAM2024_Multiaxis_Drilling.pdf → domain=cam", () => {
    const r = classifyTribalWikiPdf("InventorCAM2024_Multiaxis_Drilling.pdf");
    assert.equal(r.domain, "cam");
  });

  it("InventorCAM2024_SWARF_Machining.pdf → domain=cam", () => {
    const r = classifyTribalWikiPdf("InventorCAM2024_SWARF_Machining.pdf");
    assert.equal(r.domain, "cam");
  });
});

describe("controller detection: vendor-specific manuals identify controllers", () => {
  it("Mazak EIA - Programming Manula for Mazatrol Matrix.pdf → controller=mazak", () => {
    const r = classifyTribalWikiPdf("Mazak EIA - Programming Manula for Mazatrol Matrix.pdf");
    assert.equal(r.controller, "mazak");
  });

  it("Siemens 5 axis.pdf → controller=siemens", () => {
    const r = classifyTribalWikiPdf("Siemens 5 axis.pdf");
    assert.equal(r.controller, "siemens");
  });
});

describe("vendor detection: vendor field populated from filename", () => {
  it("Autodesk_CNCBOOK.pdf → vendor=Autodesk", () => {
    const r = classifyTribalWikiPdf("Autodesk_CNCBOOK.pdf");
    assert.equal(r.vendor, "Autodesk");
  });

  it("Using IF and GOTO For a Poor Man's G71 Lathe Roughing Cycle - CNCCookbook_ Be A Better CNC'er.pdf → vendor=CNCCookbook", () => {
    const r = classifyTribalWikiPdf("Using IF and GOTO For a Poor Man's G71 Lathe Roughing Cycle - CNCCookbook_ Be A Better CNC'er.pdf");
    assert.equal(r.vendor, "CNCCookbook");
  });

  it("hyperMILL_Manual-en-1.pdf → vendor=OpenMind + cam_system=hypermill", () => {
    const r = classifyTribalWikiPdf("hyperMILL_Manual-en-1.pdf");
    assert.equal(r.vendor, "OpenMind");
    assert.equal(r.cam_system, "hypermill");
  });

  it("SolidCAM 2015 ... InventorCAM2024 ... → cam_system=inventorcam (InventorCAM branch checks first in classifier chain)", () => {
    const r = classifyTribalWikiPdf("SolidCAM 2015 Milling Training Course - 2.5D Milling - InventorCAM2024_2.5D_Milling_Training_Course.pdf");
    assert.equal(r.cam_system, "inventorcam");
  });
});

describe("reference PDFs: foundational/g-code/tooling route to reference", () => {
  it("CNC Basics_ Easy Learning Guide [ +Machining Tutorials ].pdf → domain=reference", () => {
    const r = classifyTribalWikiPdf("CNC Basics_ Easy Learning Guide [ +Machining Tutorials ].pdf");
    assert.equal(r.domain, "reference");
  });

  it("CS50 Notes All Weeks.pdf → domain=reference + foundational tag", () => {
    const r = classifyTribalWikiPdf("CS50 Notes All Weeks.pdf");
    assert.equal(r.domain, "reference");
    assert.ok(r.tags.includes("foundational"));
  });

  it("Total Guide to CNC Jigs, Fixtures, and Workholding Solutions for Mills.pdf → tags include tooling", () => {
    const r = classifyTribalWikiPdf("Total Guide to CNC Jigs, Fixtures, and Workholding Solutions for Mills.pdf");
    assert.ok(r.tags.includes("tooling"));
  });
});

describe("edge cases: empty + missing extension", () => {
  it("empty string → domain=reference (catch-all)", () => {
    const r = classifyTribalWikiPdf("");
    assert.equal(r.domain, "reference");
  });

  it("null filename → domain=reference (no crash)", () => {
    const r = classifyTribalWikiPdf(null);
    assert.equal(r.domain, "reference");
  });

  it("undefined filename → domain=reference (no crash)", () => {
    const r = classifyTribalWikiPdf(undefined);
    assert.equal(r.domain, "reference");
  });
});

describe("classifyAll: aggregate domain counts", () => {
  it("3 mill + 1 lathe + 1 post returns counts {mill:3, lathe:1, post:1}", () => {
    const result = classifyAll([
      "Dynamic_Milling.pdf",
      "Face Mill Speeds and Feeds [Calculator, 45 or 90 Degrees_].pdf",
      "WinMax-Mill-Intro-Class-Workbook.pdf",
      "CNC Lathe Programming for Turning.pdf",
      "Post Processor Training Guide.pdf",
    ]);
    assert.equal(result.counts.mill, 3);
    assert.equal(result.counts.lathe, 1);
    assert.equal(result.counts.post, 1);
    assert.equal(result.items.length, 5);
  });
});

describe("DOMAIN_TO_ENGINE_BRIDGES: bridge targets for each domain", () => {
  it("mill bridges include HurcoV11MillMasterPostEngine", () => {
    assert.ok(DOMAIN_TO_ENGINE_BRIDGES.mill.includes("HurcoV11MillMasterPostEngine"));
  });

  it("lathe bridges include LathePostProcessorEngine", () => {
    assert.ok(DOMAIN_TO_ENGINE_BRIDGES.lathe.includes("LathePostProcessorEngine"));
  });

  it("post bridges include MasterPostProcessorUnifiedAGIEngine", () => {
    assert.ok(DOMAIN_TO_ENGINE_BRIDGES.post.includes("MasterPostProcessorUnifiedAGIEngine"));
  });

  it("wire bridges include WireEDMPostProcessorEngine", () => {
    assert.ok(DOMAIN_TO_ENGINE_BRIDGES.wire.includes("WireEDMPostProcessorEngine"));
  });

  it("reference has no bridges (empty array)", () => {
    assert.equal(DOMAIN_TO_ENGINE_BRIDGES.reference.length, 0);
  });
});
