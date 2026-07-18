import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyTranscript, topicsFromBody } from "./extract-lathe-videos-tribal.mjs";

describe("topicsFromBody (body-level topic classifier)", () => {
  it("emits g71-stock-removal-cycle when transcript discusses G71 roughing", () => {
    const text = "Let's program a G71 stock removal cycle on the lathe. The G71 roughing cycle is the workhorse — set G71 U2.0 R0.5 then G71 P10 Q20.";
    const topics = topicsFromBody(text);
    assert.ok(topics.includes("g71-stock-removal-cycle"));
  });

  it("emits g76-single-point-threading when threading is the subject", () => {
    const text = "G76 single-point threading cycle on a CNC lathe. The G76 threading cycle requires careful infeed setup.";
    const topics = topicsFromBody(text);
    assert.ok(topics.includes("g76-single-point-threading"));
  });

  it("emits multiple topics for a multi-subject video (tips + chip control + sub-spindle)", () => {
    const text = "Pro tip: chip control is crucial. The chip breaker geometry matters. Also use a sub-spindle pickoff to back-work the part. This is a hack you can use today.";
    const topics = topicsFromBody(text);
    assert.ok(topics.includes("tips-and-tricks"));
    assert.ok(topics.includes("chip-control"));
    assert.ok(topics.includes("sub-spindle-pickoff"));
  });

  it("emits controller-haas when Haas is mentioned 3+ times", () => {
    const text = "On the Haas lathe in our shop, Haas programming uses the Haas NGC controller for turning operations. Many of the shops we visit run Haas machines daily. The Haas system is very common in US tool rooms.";
    const topics = topicsFromBody(text);
    assert.ok(topics.includes("controller-haas"));
  });

  it("does NOT emit controller-haas for a single Haas mention", () => {
    const text = "We tested this on a Haas one time, but mostly on Fanuc controls. The Fanuc controller handles the G71 stock removal cycle the same way that the other systems handle the analogous canned cycle in their dialect.";
    const topics = topicsFromBody(text);
    assert.ok(!topics.includes("controller-haas"));
  });

  it("returns empty array for null/short input", () => {
    assert.deepEqual(topicsFromBody(null), []);
    assert.deepEqual(topicsFromBody("short"), []);
    assert.deepEqual(topicsFromBody(""), []);
  });
});

describe("classifyTranscript", () => {
  it("handles transcript-as-string shape", () => {
    const rec = {
      meta: { videoId: "abc123", title: "G71 Lathe Tutorial", duration_sec: 600, uploader: "Haas" },
      transcript: "On a CNC lathe you use G71 stock removal cycle then G70 finishing pass with CNMG inserts and constant surface speed G96 S180.",
    };
    const r = classifyTranscript(rec);
    assert.equal(r.video_id, "abc123");
    assert.equal(r.title, "G71 Lathe Tutorial");
    assert.equal(r.is_lathe_relevant, true);
    assert.ok(r.atoms.g_codes.includes("G71"));
    assert.ok(r.atoms.insert_codes.includes("CNMG"));
  });

  it("handles transcript-as-object shape (yt-dlp output)", () => {
    const rec = {
      meta: { videoId: "xyz789", title: "Threading lathe" },
      transcript: {
        full_text: "Use G76 threading canned cycle on the lathe for single point threading. The chuck holds the workpiece.",
        segments: [{ start: 0, end: 5, text: "Use G76 threading" }],
      },
    };
    const r = classifyTranscript(rec);
    assert.equal(r.video_id, "xyz789");
    assert.equal(r.segment_count, 1);
    assert.equal(r.is_lathe_relevant, true);
    assert.ok(r.atoms.g_codes.includes("G76"));
  });

  it("classifies mill-only content as not lathe-relevant", () => {
    const rec = {
      meta: { videoId: "millOnly" },
      transcript: "Adaptive clearing with a 4-flute end mill, step-down 1mm, helix 38 degrees. Face milling at high speed for aluminum.",
    };
    const r = classifyTranscript(rec);
    assert.equal(r.is_lathe_relevant, false);
  });

  it("returns null for empty/invalid transcripts", () => {
    assert.equal(classifyTranscript(null), null);
    assert.equal(classifyTranscript({}), null);
    assert.equal(classifyTranscript({ meta: {}, transcript: "" }), null);
    assert.equal(classifyTranscript({ meta: {}, transcript: { full_text: "" } }), null);
  });

  it("extracts vendor grades when transcript names a specific grade", () => {
    const rec = {
      meta: { videoId: "vid1" },
      transcript: "We tested AH725 for stainless turning and KCP25 for general steel — both performed well on the lathe.",
    };
    const r = classifyTranscript(rec);
    assert.ok(r.atoms.vendor_grades.includes("AH725"));
    assert.ok(r.atoms.vendor_grades.includes("KCP25"));
  });

  it("records all controller mentions", () => {
    const rec = {
      meta: { videoId: "vid2" },
      transcript: "On the Fanuc lathe controller G71 works. On Mazak Matrix lathe machines you use a similar cycle. Haas controls turning operations differently.",
    };
    const r = classifyTranscript(rec);
    assert.ok(r.atoms.controllers.some(c => /Fanuc/i.test(c)));
    assert.ok(r.atoms.controllers.some(c => /Mazak/i.test(c)));
    assert.ok(r.atoms.controllers.some(c => /Haas/i.test(c)));
  });
});
