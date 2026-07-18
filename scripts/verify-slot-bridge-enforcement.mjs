#!/usr/bin/env node
/**
 * verify-slot-bridge-enforcement.mjs — [SLOT-BRIDGE-MS0]/U-SBB04 (2026-05-26).
 *
 * Pure-core verification that the seed-bindings + auto-seed bridge actually
 * arms main-tree-write-block.mjs against the live chat-slots.json. Runs
 * decideOnEdit() against three cases that prove the bridge contract:
 *
 *   1. Non-alpha armed slot (e.g. charlie) writing to H:/prism → MUST BLOCK
 *   2. Same slot writing inside its own worktree → MUST ALLOW
 *   3. Golf writing to H:/prism → MUST ALLOW (integrator exempt)
 *
 * Standalone hook invocation can't be used because resolveSessionId() spawns
 * stable-session-id.mjs which resolves the CURRENT process's chatId — so a
 * cli invocation always sees the running chat's slot, not the slot we want
 * to exercise. Pure-core testing bypasses that.
 *
 * Exit code 0 on full PASS, 1 on any FAIL — usable as a CI gate.
 */

import { decideOnEdit, resolveSlotBinding } from "../.claude/hooks/main-tree-write-block.mjs";
import { readFileSync } from "node:fs";

const slots = JSON.parse(readFileSync("H:/prism/state/shared/chat-slots.json", "utf8"));

/**
 * @type {Array<{name:string, sessionId:string, target:string, expectBlock:boolean, injectGolf?:boolean}>}
 */
const cases = [
  {
    name: "non-alpha armed slot writing to main tree → MUST BLOCK",
    sessionId: pickArmedNonAlphaChatId(slots),
    target: "H:/prism/state/shared/test-must-be-blocked.txt",
    expectBlock: true,
  },
  {
    name: "non-alpha armed slot writing inside its own worktree → ALLOW",
    sessionId: pickArmedNonAlphaChatId(slots),
    target: targetInOwnWorktree(slots),
    expectBlock: false,
  },
  {
    name: "golf writing to main tree → ALLOW (integrator)",
    sessionId: "claude-bridge-verify-golf",
    target: "H:/prism/state/shared/test-allowed-for-golf.txt",
    expectBlock: false,
    injectGolf: true,
  },
];

function pickArmedNonAlphaChatId(slotFile) {
  for (const [name, st] of Object.entries(slotFile.slots)) {
    if (name === "alpha" || name === "golf") continue;
    if (st && st.chatId && st.branch === `slot/${name}`) return st.chatId;
  }
  throw new Error("no non-alpha armed slot found — seed + backfill must run first");
}

function targetInOwnWorktree(slotFile) {
  for (const [name, st] of Object.entries(slotFile.slots)) {
    if (name === "alpha" || name === "golf") continue;
    if (st && st.chatId && st.branch === `slot/${name}`) {
      return `H:/prism-slot-${name}/state/shared/test.txt`;
    }
  }
  throw new Error("no non-alpha armed slot found");
}

let pass = 0, fail = 0;
for (const c of cases) {
  const view = JSON.parse(JSON.stringify(slots));
  if (c.injectGolf) {
    view.slots.golf = { chatId: c.sessionId, branch: "cad-fusion-live-ms0" };
  }
  const binding = resolveSlotBinding({ sessionId: c.sessionId, slots: view });
  const decision = decideOnEdit({ filePathAbs: c.target, binding, cwd: "H:/prism" });
  const blocked = !!(decision && decision.decision === "block");
  const ok = blocked === c.expectBlock;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
  console.log(`      binding=${JSON.stringify(binding)}  target=${c.target}  blocked=${blocked}  expect=${c.expectBlock}`);
  if (ok) pass++; else fail++;
}

console.log("---");
console.log(`pass=${pass}  fail=${fail}`);
process.exit(fail ? 1 : 0);
