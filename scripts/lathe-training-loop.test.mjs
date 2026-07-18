import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { runLoopForPart } from "./lathe-training-loop.mjs";

const tmp = mkdtempSync(path.join(tmpdir(), "lathe-loop-test-"));

function writeFixture(name, body) {
  const p = path.join(tmp, name);
  writeFileSync(p, body, "utf8");
  return p;
}

describe("runLoopForPart — end-to-end loop on synthetic .MIN", () => {
  it("emits 11 stage records with stages 1-3 functional and 4-11 as skeletons", () => {
    const file = writeFixture("fontana-pin.MIN", [
      "O5001 (FONTANA-PIN)",
      "G50 S3500",
      "T0101 (CNMG-432-MA OD ROUGH)",
      "G96 S180 M03",
      "G71 U2.5 R0.5",
      "G71 P10 Q20 U0.4 W0.1 F0.30",
      "T0202 (DNMG-431-PF OD FINISH)",
      "G70 P10 Q20",
      "M30",
    ].join("\n"));
    const rec = runLoopForPart(file, "P", 1, null, null);
    assert.equal(rec.iter, 1);
    assert.equal(rec.stages.length, 11);
    assert.equal(rec.stages[0].name, "GATHER");
    assert.equal(rec.stages[1].name, "PARSE");
    assert.equal(rec.stages[1].ok, true);
    assert.equal(rec.stages[2].name, "VALIDATE");
    assert.ok(typeof rec.stages[2].quality_score === "number");
    // stages 4-11 are skeletons but must be present
    for (const s of rec.stages.slice(3)) {
      assert.ok(s.status, "skeleton stage " + s.stage + " missing status");
    }
    assert.equal(rec.summary.ready_for_operator_review, true);
    assert.ok(rec.summary.operations_observed.includes("od_rough"));
    assert.ok(rec.summary.inserts_observed.includes("CNMG"));
  });

  it("handles empty .MIN gracefully (skeletons still emit)", () => {
    const file = writeFixture("empty.MIN", "");
    const rec = runLoopForPart(file, "P", 1, null, null);
    assert.equal(rec.stages[1].ok, false);
    // Quality stage may produce null/low score but skeleton stages must still exist
    assert.equal(rec.stages.length, 11);
  });

  it("records iso_group + iteration number in the output", () => {
    const file = writeFixture("iso-test.MIN", "O100\nG96 S200\nT0101\nM30\n");
    const rec = runLoopForPart(file, "M", 7, null, null);
    assert.equal(rec.iso_group, "M");
    assert.equal(rec.iter, 7);
  });
});
