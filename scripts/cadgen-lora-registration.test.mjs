// Lock-in test: the cadgen-outcome-lora source stays REGISTERED in the fleet training inventory
// (U-CADGEN-LORA-REG-TEST, slot:delta 2026-07-04). The GEN->LoRA wire is 2-step (register a source +
// regen the snapshot); cadgen-lora-fold.integration.test.mjs (d4528e0996) guards that a PRESENT source
// FOLDS into the corpus. This guards the OTHER half: that build-fleet-training-corpus-inventory.mjs still
// REGISTERS cadgen-outcome-lora, as a full-weight lora-training-jsonl CAD source. Without it, a routine
// edit to the big SOURCES array could silently drop the CAD generation training pairs from every rebuild.
//   run: node --test scripts/cadgen-lora-registration.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { SOURCES } from "./build-fleet-training-corpus-inventory.mjs";

test("cadgen-outcome-lora is registered as a full-weight lora-training-jsonl CAD source", () => {
  const s = SOURCES.find((x) => x && x.id === "cadgen-outcome-lora");
  assert.ok(s, "cadgen-outcome-lora source is registered in SOURCES");
  assert.equal(s.kind, "lora-training-jsonl", "kind must be lora-training-jsonl so the assembler folds it");
  assert.match(s.path, /cadgen-outcome-dataset\.jsonl$/, "points at the emitter's output dataset");
  assert.ok(Array.isArray(s.domains) && s.domains.includes("cad"), "tagged to the cad domain");
  assert.equal(s.advisory, false, "executed-verified working code -> full training weight, not advisory");
});

test("SOURCES has no duplicate ids (a dup would make the assembler double-count or shadow a source)", () => {
  const ids = SOURCES.map((s) => s && s.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, "every source id is unique");
});

test("every lora-training-jsonl source has id + path (the assembler reads source.path to fold it)", () => {
  // Scoped to lora-training-jsonl: selectLoraSources filters to that kind and then reads source.path,
  // so a foldable source missing a path would crash assembly. Non-lora kinds (e.g. accuracy ledgers,
  // inventoried-only) legitimately need no path and are out of scope here.
  for (const s of SOURCES.filter((x) => x && x.kind === "lora-training-jsonl")) {
    assert.ok(typeof s.id === "string" && s.id, `lora source has an id: ${JSON.stringify(s)}`);
    assert.ok(typeof s.path === "string" && s.path, `lora source ${s.id} has a path (assembler needs it)`);
  }
});
