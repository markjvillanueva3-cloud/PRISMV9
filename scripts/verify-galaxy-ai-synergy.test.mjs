// verify-galaxy-ai-synergy.test.mjs (U-ALPHA-SYNERGY-VERIFY)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkGalaxy, discoverGalaxies } from "./verify-galaxy-ai-synergy.mjs";

// In-memory substrate doubles.
function mk(files) {
  return {
    existsImpl: (p) => p in files,
    readImpl: (p) => { if (!(p in files)) throw new Error("ENOENT"); return files[p]; },
  };
}
const FULL = (g) => ({
  [`mcp-server/src/engines/${g}/SOUL.md`]: "# soul\n## AI Stack (synergized -- fleet-wide)\ngalaxy-reasoning-bridge.mjs\n",
  [`mcp-server/src/engines/${g}/CLAUDE.md`]: "doc",
  [`mcp-server/src/engines/${g}/MEMORY.md`]: "brain",
  [`mcp-server/src/engines/${g}/AWARENESS.md`]: "aware",
  [`knowledge/memories/patterns/${g}_synthesis.md`]: "synth",
});

test("checkGalaxy: full substrate -> pass with all checks true", () => {
  const r = checkGalaxy("mill", mk(FULL("mill")));
  assert.equal(r.pass, true);
  assert.deepEqual(r.checks, { soul: true, claude: true, mem: true, aware: true, aiStack: true, bridgeRef: true, synth: true });
});

test("checkGalaxy: missing AI-stack block -> fail (the synergy marker is load-bearing)", () => {
  const files = FULL("mill");
  files["mcp-server/src/engines/mill/SOUL.md"] = "# soul\nno ai stack here\n";
  const r = checkGalaxy("mill", mk(files));
  assert.equal(r.pass, false);
  assert.equal(r.checks.aiStack, false);
  assert.equal(r.checks.bridgeRef, false);
});

test("checkGalaxy: missing MEMORY.md -> fail", () => {
  const files = FULL("cad");
  delete files["mcp-server/src/engines/cad/MEMORY.md"];
  const r = checkGalaxy("cad", mk(files));
  assert.equal(r.pass, false);
  assert.equal(r.checks.mem, false);
});

test("checkGalaxy: synth-only-missing still PASSES (synth is advisory, not load-bearing)", () => {
  const files = FULL("business");
  delete files["knowledge/memories/patterns/business_synthesis.md"];
  const r = checkGalaxy("business", mk(files));
  assert.equal(r.pass, true, "synth absent does not fail the load-bearing 6");
  assert.equal(r.checks.synth, false);
});

test("checkGalaxy: unreadable SOUL -> aiStack/bridge false, fail (fail-soft, no throw)", () => {
  const files = FULL("wedm");
  const dbl = mk(files);
  dbl.readImpl = () => { throw new Error("EIO"); };
  const r = checkGalaxy("wedm", dbl);
  assert.equal(r.checks.aiStack, false);
  assert.equal(r.pass, false);
});

test("discoverGalaxies: only dirs with a SOUL.md, sorted", () => {
  const readdirImpl = () => [
    { name: "mill", isDirectory: () => true },
    { name: "cad", isDirectory: () => true },
    { name: "notagalaxy", isDirectory: () => true },
    { name: "afile.ts", isDirectory: () => false },
  ];
  const existsImpl = (p) => p.endsWith("mill/SOUL.md") || p.endsWith("cad/SOUL.md");
  const got = discoverGalaxies({ readdirImpl, existsImpl });
  assert.deepEqual(got, ["cad", "mill"], "sorted, SOUL-gated, non-dirs excluded");
});
