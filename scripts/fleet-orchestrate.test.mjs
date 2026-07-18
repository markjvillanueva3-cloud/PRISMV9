// HERMES-MASTER-ORCHESTRATOR-MS0 — fleet-orchestrate generator tests
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseSlotDomains, composeOrchestrationBrief, buildFleetPlan, fleetStatus } from "./fleet-orchestrate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "fleet-orchestrate.mjs");

// Closes scrutiny P2: lock the --apply write-path contract (provenance prefix +
// skip-if-pending + --force overwrite) via a spawned run against a temp PRISM_ROOT.
describe("--apply write-path (spawned, temp PRISM_ROOT)", () => {
  it("writes provenance-prefixed briefs, skips pending w/o --force, overwrites w/ --force", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fleet-apply-"));
    fs.mkdirSync(path.join(root, "state/shared/slot-briefs"), { recursive: true });
    fs.writeFileSync(path.join(root, "state/shared/CHAT-SLOT-DOMAINS.md"), "| **KILO** | **CAM** |\n| **DELTA** | CAD |\n");
    const kilo = path.join(root, "state/shared/slot-briefs/kilo.md");
    const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { env: { ...process.env, PRISM_ROOT: root }, encoding: "utf8" });
    try {
      run(["--apply"]);
      const first = fs.readFileSync(kilo, "utf8");
      assert.match(first, /^> _brief from: zulu_/);                 // provenance prefix
      assert.match(first, /ZULU orchestration brief — KILO/);
      fs.writeFileSync(kilo, "SENTINEL");                            // simulate a pending brief
      run(["--apply"]);
      assert.equal(fs.readFileSync(kilo, "utf8"), "SENTINEL", "skip-if-pending must not clobber");
      run(["--apply", "--force"]);
      assert.match(fs.readFileSync(kilo, "utf8"), /ZULU orchestration brief — KILO/, "--force overwrites");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("fleetStatus", () => {
  it("classifies pending vs consumed vs un-briefed per slot", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fleet-status-"));
    fs.writeFileSync(path.join(dir, "kilo.md"), "queued");            // pending
    fs.mkdirSync(path.join(dir, "_delivered"), { recursive: true });
    fs.writeFileSync(path.join(dir, "_delivered", "alpha-100-aaaaaaaa.md"), "x"); // consumed
    const plan = [{ slot: "kilo", galaxy: "cam" }, { slot: "alpha", galaxy: "token-optimization" }, { slot: "delta", galaxy: "cad" }];
    const st = fleetStatus(dir, plan);
    assert.equal(st.find((s) => s.slot === "kilo").pending, true);
    assert.equal(st.find((s) => s.slot === "alpha").pending, false);
    assert.equal(st.find((s) => s.slot === "alpha").deliveredCount, 1);
    assert.equal(st.find((s) => s.slot === "delta").pending, false);
    assert.equal(st.find((s) => s.slot === "delta").deliveredCount, 0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("parseSlotDomains", () => {
  it("parses | **SLOT** | domain | rows, stripping bold", () => {
    const d = parseSlotDomains("| **ALPHA** | Token opt |\n| **KILO** | **CAM** |\n");
    assert.equal(d.alpha, "Token opt");
    assert.equal(d.kilo, "CAM");
  });
  it("empty on no table", () => { assert.deepEqual(parseSlotDomains("nope"), {}); });
});

describe("composeOrchestrationBrief", () => {
  it("includes domain, galaxy brain, recall, next-unit, doctrine, signature", () => {
    const b = composeOrchestrationBrief("kilo", "CAM", "cam");
    assert.match(b, /ZULU orchestration brief — KILO \(CAM\)/);
    assert.match(b, /priority-queue\.mjs --pick --slot kilo/);
    assert.match(b, /engines\/cam\/MEMORY\.md/);
    assert.match(b, /semantic_search query="CAM"/);
    assert.match(b, /per-file 2-arm scrutiny/);
    assert.match(b, /ZULU \/ Hermes fleet orchestrator/);
  });
  it("falls back to the mapped galaxy when not passed", () => {
    assert.match(composeOrchestrationBrief("bravo", "Hermes building"), /engines\/hermes-zulu\/MEMORY\.md/);
  });
});

describe("buildFleetPlan", () => {
  it("skips orchestrator slots, maps galaxies, sorts", () => {
    const plan = buildFleetPlan({ whiskey: "Lathe", zulu: "orch", zebra: "orch", alpha: "Token", kilo: "CAM" });
    const slots = plan.map((p) => p.slot);
    assert.deepEqual(slots, ["alpha", "kilo", "whiskey"]);
    assert.ok(!slots.includes("zulu") && !slots.includes("zebra"));
    assert.equal(plan.find((p) => p.slot === "kilo").galaxy, "cam");
  });
});
