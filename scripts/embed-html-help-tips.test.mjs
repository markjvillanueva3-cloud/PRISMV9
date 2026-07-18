#!/usr/bin/env node
/**
 * embed-html-help-tips.test.mjs -- hermetic unit test for collectHtmlHelpTips, the
 * reader that folds the CAD/CAM software help-HTML tribal corpus (drain-html-help-
 * tribal.mjs) into embed-pdf-tribal-tips-into-index.mjs::collectAllTips. Verifies
 * the html- id namespace, corpus tag, software-prefixed title, and torn-line
 * tolerance so a future edit cannot silently break the only-new dedup contract.
 *
 * Run: node scripts/embed-html-help-tips.test.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectHtmlHelpTips } from "./embed-pdf-tribal-tips-into-index.mjs";

test("collectHtmlHelpTips reads per-doc tips[] into namespaced per-tip records", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "htmltips-"));
  const f = path.join(dir, "html-help-tips.jsonl");
  fs.writeFileSync(f, [
    JSON.stringify({ sha8: "abc12345", domain: "cam", software: "mastercam", title: "Backplotting toolpaths", source: "help/x.htm", tips: ["Dock the backplot window on a second monitor.", "Use the VCR bar to step through the backplot."] }),
    JSON.stringify({ sha8: "def67890", domain: "cam", software: "hypermill", title: "Roughing", source: "doc/y.htm", tips: ["Set MAXX roughing stepdown to 0.5x tool dia."] }),
    "",            // tolerate blank line
    "{bad json",   // tolerate torn line
  ].join("\n"));
  const recs = collectHtmlHelpTips(f);
  assert.equal(recs.length, 3);
  assert.equal(recs[0].id, "tip:html-abc12345-0");
  assert.equal(recs[0].domain, "cam");
  assert.equal(recs[0].sourceCorpus, "cad-cam-html-help");
  assert.ok(recs[0].title.startsWith("mastercam: "));
  assert.equal(recs[1].id, "tip:html-abc12345-1");
  assert.equal(recs[2].id, "tip:html-def67890-0");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("collectHtmlHelpTips returns [] when the jsonl is absent", () => {
  assert.deepEqual(collectHtmlHelpTips("/nonexistent/html-help-tips.jsonl"), []);
});
