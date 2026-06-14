/**
 * jm-die-tribal-wiki-classifier.mjs — pure classifier for the 80-PDF
 * JM Die TRIBAL+WIKI corpus.
 *
 * Operator directive 2026-05-26: "H:\PRISM\JM DIE\TRIBAL + WIKI" — the user
 * consolidated their tribal+wiki PDF corpus there. 80 PDFs, 1.1GB, spanning
 * mill / lathe / CAM / CAD / wire-EDM / post-processor / reference.
 *
 * Approach: filename-heuristic classification (same shape as kilo's
 * scripts/build-cad-cam-resources-pdf-index.mjs domain classifier). Each PDF
 * gets a `domain` (mill/lathe/cam/cad/wire/post/reference) + `vendor` +
 * `cam_system` + `controller` extracted from the filename. No PDF content
 * read — that's the responsibility of pdftotext + the per-domain extractor.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-TRIBAL-WIKI-CORPUS
 * @slot echo
 * @iter 8
 * @date 2026-05-26
 */

/**
 * Pure: classify a filename into a primary domain + secondary metadata.
 * Returns an object with stable keys for downstream node generation.
 */
export function classifyTribalWikiPdf(filename) {
  const lower = String(filename || "").toLowerCase();
  const stem = lower.replace(/\.pdf$/, "");
  const out = {
    filename,
    domain: "reference",
    vendor: null,
    cam_system: null,
    controller: null,
    post_writing: false,
    tags: [],
  };

  // Vendor / CAM-system detection
  if (/inventorcam/.test(stem)) { out.cam_system = "inventorcam"; out.vendor = "Autodesk"; }
  else if (/solidcam/.test(stem)) { out.cam_system = "solidcam"; out.vendor = "SolidCAM"; }
  else if (/hypermill|hyper.?mill/.test(stem)) { out.cam_system = "hypermill"; out.vendor = "OpenMind"; }
  else if (/mastercam/.test(stem)) { out.cam_system = "mastercam"; out.vendor = "Mastercam"; }
  else if (/fusion/.test(stem)) { out.cam_system = "fusion360"; out.vendor = "Autodesk"; }
  else if (/autodesk/.test(stem)) { out.vendor = "Autodesk"; }
  else if (/cnccookbook/.test(stem)) { out.vendor = "CNCCookbook"; }
  else if (/solidworks/.test(stem)) { out.cam_system = "solidworks"; out.vendor = "Dassault"; }

  // Controller detection
  if (/haas/.test(stem)) out.controller = "haas";
  else if (/mazak|mazatrol/.test(stem)) out.controller = "mazak";
  else if (/okuma|osp-p\d+/.test(stem)) out.controller = "okuma";
  else if (/hurco|winmax/.test(stem)) out.controller = "hurco";
  else if (/siemens/.test(stem)) out.controller = "siemens";
  else if (/heidenhain|tnc/.test(stem)) out.controller = "heidenhain";
  else if (/fanuc/.test(stem)) out.controller = "fanuc";
  else if (/mitsubishi|meldas/.test(stem)) out.controller = "mitsubishi";

  // Domain classification — order matters (most-specific first)
  if (/post[\s_+]*processor|post.processor.training|post.processor.documentation|postability|ppg/i.test(stem)) {
    out.domain = "post";
    out.post_writing = true;
    out.tags.push("post-writing");
  } else if (/wire|wedm|wire.?edm/.test(stem)) {
    out.domain = "wire";
    out.tags.push("wire-edm");
  } else if (/lathe|turning|mill.?turn|macturn|multus|osp-p\d+l/i.test(stem) && !/mill[^-]/.test(stem)) {
    out.domain = "lathe";
    out.tags.push("turning");
  } else if (/mill|milling|3d.?hsm|3d.?hsr|hss|m32|me32|mill.operator/i.test(stem)) {
    out.domain = "mill";
    out.tags.push("milling");
  } else if (/cad|design|gd.t|graphic|solidworks|fusion.cad/i.test(stem)) {
    out.domain = "cad";
    out.tags.push("cad");
  } else if (/cam.strategies|toolpath|multiaxis|5.axis|rotary|adaptive|swarf|geodesic|contour/i.test(stem)) {
    out.domain = "cam";
    out.tags.push("cam");
  } else if (/feeds.and.speeds|face.mill|speeds.and.feeds|chip.load/i.test(stem)) {
    out.domain = "mill";
    out.tags.push("speed-feed");
  } else if (/g.code|g-code|gcode|m.code|m-code|programming.haas|cnc.programming|cnc.basics|cnc 501|fundamentals.*machining|cnc_machining/i.test(stem)) {
    out.domain = "reference";
    out.tags.push("g-code", "programming");
  } else if (/tool.holder|workholding|jig|fixture|tool.setter/i.test(stem)) {
    out.domain = "reference";
    out.tags.push("tooling");
  } else if (/cs50|complete.engineering|engineers.handbook/i.test(stem)) {
    out.domain = "reference";
    out.tags.push("foundational");
  }

  // Tribal-tip hints from title patterns
  if (/tutorial|guide|easy.guide|beginner|introduction/i.test(stem)) {
    out.tags.push("tutorial");
  }
  if (/manual|reference|documentation/i.test(stem)) {
    out.tags.push("manual");
  }
  // Tooling-tag post-pass — fires regardless of primary domain so mill PDFs
  // that ALSO cover tool holders / fixtures / jigs get tagged for cross-ref.
  if (/tool.holder|workholding|jig|fixture|tool.setter|tooling/i.test(stem)) {
    if (!out.tags.includes("tooling")) out.tags.push("tooling");
  }

  return out;
}

/**
 * Pure: classify an array of filenames + aggregate domain counts.
 */
export function classifyAll(filenames) {
  const items = filenames.map(classifyTribalWikiPdf);
  const counts = {};
  for (const it of items) {
    counts[it.domain] = (counts[it.domain] ?? 0) + 1;
  }
  return { items, counts };
}

/**
 * Bridge target map — domain → engine IDs to wire edges to. Engine IDs match
 * graph-node basename convention (PascalCase class name).
 */
export const DOMAIN_TO_ENGINE_BRIDGES = {
  mill: [
    "HurcoV11MillMasterPostEngine",
    "MillMasterOrchestratorFacadeEngine",
    "UltimateSpeedFeedEngine",
    "AutoSpeedFeedEngine",
  ],
  lathe: [
    "LathePostProcessorEngine",
    "LatheMasterPostSelfAwarenessEngine",
    "LatheAIOrchestrationEngine",
  ],
  cam: [
    "CamToolpathEngine",
    "MasterPostProcessorUnifiedAGIEngine",
  ],
  cad: [
    "CADValidationEngine",
    "CADExtractionEngine",
  ],
  wire: [
    "WireEDMPostProcessorEngine",
  ],
  post: [
    "MasterPostProcessorEngine",
    "MasterPostProcessorUnifiedAGIEngine",
    "PostProcessorPipelineEngine",
    "HurcoV11MillMasterPostEngine",
    "OkumaOSPMillMasterPostEngine",
  ],
  reference: [],
};
