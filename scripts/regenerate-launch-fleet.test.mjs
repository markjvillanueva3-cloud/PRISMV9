/**
 * regenerate-launch-fleet.test.mjs -- FLEET-LAUNCHER-IMPROVE-MS0/U-FLI04 (slot:tango, 2026-06-10)
 *
 * Guards the self-regenerating thin-wrapper output (the safety-critical part):
 *   - default run writes BOTH the generated launcher AND the thin wrapper sibling;
 *   - the thin wrapper drives the generated, refreshes recovery, marks the launch,
 *     and passes --no-thin (so a launch never overwrites the running wrapper);
 *   - --no-thin writes ONLY the generated (the no-self-overwrite path).
 *
 * CLI-spawn (the regenerator runs at module top-level). Isolated to a temp dir via
 * --out, so it NEVER touches the operator's real desktop launcher.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, "regenerate-launch-fleet.mjs");
const NODE = process.execPath;

function freshDir() {
  const d = path.join(os.tmpdir(), `regen-fleet-${process.pid}-${Math.floor(performance.now())}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}
function regen(dir, extra = []) {
  const gen = path.join(dir, "X.generated.bat");
  execFileSync(NODE, [SCRIPT, "--out", gen, ...extra], { encoding: "utf-8", timeout: 120000 });
  return { gen, thin: path.join(dir, "LAUNCH-PRISM-FLEET.bat") };
}

test("default run writes BOTH generated + thin wrapper; thin drives generated safely", () => {
  const dir = freshDir();
  try {
    const { gen, thin } = regen(dir);
    assert.ok(fs.existsSync(gen), "generated launcher must exist");
    assert.ok(fs.existsSync(thin), "thin wrapper must exist next to the generated launcher");

    const genBody = fs.readFileSync(gen, "utf-8");
    assert.match(genBody, /fleet-launch-summary\.mjs/, "generated must run the launch summary");
    assert.match(genBody, /snap-wt-quadrants\.ps1/, "generated must still snap windows (unchanged spawn logic)");

    const thinBody = fs.readFileSync(thin, "utf-8");
    assert.match(thinBody, /regenerate-launch-fleet\.mjs" --out "%GENPATH%" --no-thin/, "thin must rebuild generated with --no-thin (no self-overwrite)");
    assert.match(thinBody, /recover-today-context\.mjs" --all/, "thin must refresh recovery");
    assert.match(thinBody, /fleet-launch-summary\.mjs" --mark/, "thin must mark the launch start");
    assert.match(thinBody, /call "%GENPATH%"/, "thin must call the generated launcher");
    assert.match(thinBody, /GENPATH=%~dp0X\.generated\.bat/, "thin GENPATH must reference the actual generated basename");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("--no-thin writes ONLY the generated launcher (no thin sibling)", () => {
  const dir = freshDir();
  try {
    const { gen, thin } = regen(dir, ["--no-thin"]);
    assert.ok(fs.existsSync(gen), "generated launcher must exist");
    assert.equal(fs.existsSync(thin), false, "--no-thin must NOT write the thin wrapper");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
