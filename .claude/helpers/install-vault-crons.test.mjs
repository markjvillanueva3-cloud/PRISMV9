// .claude/helpers/install-vault-crons.test.mjs
//
// OBSIDIAN-VAULT-OPS / U-VAULT-MAINT-CRON — structural lint for the two vault
// scheduled-task installers. PowerShell installers aren't unit-testable in a JS
// runner, so this asserts the load-bearing invariants that make them SAFE during
// the HW-migration freeze and correct as cron registrars:
//   - both files exist on disk
//   - each carries the disable KNOB env-check in its Action script (quiet without uninstall)
//   - each registers as current-user S4U (no elevation) — never SYSTEM
//   - each uses a distinct OFF-PEAK -At time (no contention)
//   - each carries the -Disabled migration-safe switch + the do-not-run-during-migration header
//   - each invokes the REAL target script with the expected flags
//   - idempotency: unregister-before-register present
// Real string assertions against file content (not stubs).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const HELPERS = "H:/prism/.claude/helpers";
const INSTALLERS = [
  {
    file: `${HELPERS}/install-vault-promotion-cron.ps1`,
    taskName: "PRISM Vault Memory Promotion Cron",
    knob: "PRISM_VAULT_PROMOTION_CRON_DISABLE",
    at: "02:47:00",
    targetScript: "promote-memory-to-wiki.mjs --apply --backlink",
  },
  {
    file: `${HELPERS}/install-vault-rot-sentinel-cron.ps1`,
    taskName: "PRISM Vault Rot Sentinel Cron",
    knob: "PRISM_VAULT_ROT_CRON_DISABLE",
    at: "00:38:00",
    targetScript: "vault-rot-sentinel.mjs --write",
  },
];

for (const inst of INSTALLERS) {
  test(`${inst.taskName} — exists`, () => {
    assert.ok(existsSync(inst.file), `installer present: ${inst.file}`);
  });

  test(`${inst.taskName} — knob env-check in Action script`, () => {
    const src = readFileSync(inst.file, "utf8");
    assert.match(src, new RegExp(`env:${inst.knob}\\s*-eq\\s*'1'`), "Action self-exits early when knob set");
    assert.match(src, new RegExp(`Knob.*${inst.knob}`), "knob documented in header");
  });

  test(`${inst.taskName} — current-user S4U principal (never SYSTEM)`, () => {
    const src = readFileSync(inst.file, "utf8");
    assert.match(src, /New-ScheduledTaskPrincipal -UserId "\$env:USERDOMAIN\\\$env:USERNAME" -LogonType S4U/);
    assert.doesNotMatch(src, /NT AUTHORITY\\SYSTEM/, "must NOT register as SYSTEM");
  });

  test(`${inst.taskName} — off-peak trigger ${inst.at}`, () => {
    const src = readFileSync(inst.file, "utf8");
    assert.match(src, new RegExp(`New-ScheduledTaskTrigger -Daily -At "${inst.at}"`));
  });

  test(`${inst.taskName} — migration-safe -Disabled switch + freeze header`, () => {
    const src = readFileSync(inst.file, "utf8");
    assert.match(src, /\[switch\]\$Disabled/, "-Disabled param present");
    assert.match(src, /Disable-ScheduledTask -TaskName \$TaskName/, "Disabled path calls Disable-ScheduledTask");
    assert.match(src, /MIGRATION FREEZE/, "do-not-run-during-migration header present");
    assert.match(src, /DO NOT run this installer/i, "explicit do-not-run instruction");
  });

  test(`${inst.taskName} — invokes the real target script + idempotent register`, () => {
    const src = readFileSync(inst.file, "utf8");
    assert.ok(src.includes(inst.targetScript), `Action calls: ${inst.targetScript}`);
    assert.match(src, /if \(\$existing\) \{[\s\S]*?Unregister-ScheduledTask/, "unregister-before-register (idempotent)");
    assert.match(src, /\[switch\]\$Uninstall/, "-Uninstall supported");
  });

  test(`${inst.taskName} — -RunNow is suppressed when -Disabled (can't arm a disabled task)`, () => {
    const src = readFileSync(inst.file, "utf8");
    // The -RunNow branch must guard on $Disabled so the two flags can't combine to
    // fire a task the operator just disabled for the migration freeze.
    assert.match(src, /if \(\$RunNow\) \{[\s\S]*?if \(\$Disabled\) \{[\s\S]*?ignored/, "-RunNow ignored when -Disabled");
  });
}

test("the two installers use DISTINCT task names + times (no collision)", () => {
  const names = new Set(INSTALLERS.map(i => i.taskName));
  const times = new Set(INSTALLERS.map(i => i.at));
  assert.equal(names.size, 2, "distinct task names");
  assert.equal(times.size, 2, "distinct trigger times — no contention");
});
