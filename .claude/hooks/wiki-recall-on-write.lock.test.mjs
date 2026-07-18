// .claude/hooks/wiki-recall-on-write.lock.test.mjs
//
// OBSIDIAN-VAULT-SYNERGY/U-OBS-RECALL-COUNTER-SERIALIZE — tests for the
// lock-serialized recall-counter RMW. The bug fixed: recordRecall/recordWriteEvent
// did an unlocked load->mutate->writeStateAtomic; under the 26-chat fleet two
// concurrent recall hooks lost-update each other (atomic-rename guards corruption,
// NOT lost increments — [[reference_recall_counter_concurrency_finding_2026_05_16]]).
// Now wrapped in withExclusiveLock (shared lock path across both recall hooks).
//
// These also pin the .value-unwrap regression caught in validation: withExclusiveLock
// returns {ran,value} — a missing `.value` unwrap would break the {ok,key,count}
// contract (the caller in main() depends on it).
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { recordWriteEvent } from "./wiki-recall-on-write.mjs";

function tmpState() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-recall-lock-"));
  return { dir, sf: path.join(dir, "counts.json"), clean: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
const VAULT_MD = "H:/prism/knowledge/memories/reference/foo.md";

test("recordWriteEvent: unwraps the lock result to the {ok,key,count} contract (NOT the {ran,value} wrapper)", () => {
  const { sf, clean } = tmpState();
  try {
    const r = recordWriteEvent(VAULT_MD, "Write", { stateFile: sf });
    assert.equal(r.ok, true, "must return ok:true, not the lock wrapper");
    assert.equal(r.key, "memory/reference/foo");
    assert.equal(r.count, 1);
    assert.equal(r.ran, undefined, "must NOT leak the withExclusiveLock {ran} wrapper to the caller");
  } finally { clean(); }
});

test("recordWriteEvent: sequential increments accumulate (lock-wrapped RMW persists state)", () => {
  const { sf, clean } = tmpState();
  try {
    recordWriteEvent(VAULT_MD, "Write", { stateFile: sf });
    recordWriteEvent(VAULT_MD, "Edit", { stateFile: sf });
    const r3 = recordWriteEvent(VAULT_MD, "MultiEdit", { stateFile: sf });
    assert.equal(r3.count, 3);
    const state = JSON.parse(fs.readFileSync(sf, "utf8"));
    assert.equal(state.entries["memory/reference/foo"].count, 3);
    assert.equal(state.totalRecalls, 3);
    // The lock file is released after each call (not left dangling).
    assert.equal(fs.existsSync(sf + ".lock"), false, "lock must be released after the RMW");
  } finally { clean(); }
});

test("recordWriteEvent: distinct keys tracked independently under the lock", () => {
  const { sf, clean } = tmpState();
  try {
    recordWriteEvent("H:/prism/knowledge/memories/reference/a.md", "Write", { stateFile: sf });
    recordWriteEvent("H:/prism/knowledge/wiki/lessons/b.md", "Edit", { stateFile: sf });
    const state = JSON.parse(fs.readFileSync(sf, "utf8"));
    assert.equal(state.entries["memory/reference/a"].count, 1);
    assert.equal(state.entries["wiki/lessons/b"].count, 1);
    assert.equal(state.entryCount, 2);
    assert.equal(state.totalRecalls, 2);
  } finally { clean(); }
});

test("recordWriteEvent: non-vault / non-write inputs are rejected before the lock (cheap guard)", () => {
  const { sf, clean } = tmpState();
  try {
    assert.equal(recordWriteEvent("H:/prism/src/foo.ts", "Write", { stateFile: sf }).ok, false);
    assert.equal(recordWriteEvent(VAULT_MD, "Read", { stateFile: sf }).ok, false);
    assert.equal(fs.existsSync(sf), false, "no state file created for rejected inputs");
  } finally { clean(); }
});
