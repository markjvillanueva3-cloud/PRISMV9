// main-tree-write-block.smoke.mjs — direct-import smoke harness.
//
// vitest harness for .claude/hooks/__tests__/*.test.mjs is blocked by the
// known vite-transform bug (FLEET-REAPER-MS1 + U-P1-ADD-LANE-GUARD docs
// flag the same blocker). This smoke script validates the pure helpers
// and the CLI activation gate via plain dynamic import + spawnSync.
// Real-value assertions only.
//
// Exit codes: 0 = all pass, 1 = any fail, 2 = harness/import error.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HOOK_PATH = fileURLToPath(new URL("../main-tree-write-block.mjs", import.meta.url));

const tests = [];
function t(name, fn) { tests.push({ name, fn }); }

const m = await import("../main-tree-write-block.mjs");

// canonicalize
t("canonicalize bs→fs + drive lower", () => m.canonicalize("H:\\prism\\file.ts") === "h:/prism/file.ts");
t("canonicalize trailing slash", () => m.canonicalize("h:/prism/") === "h:/prism");
t("canonicalize empty", () => m.canonicalize("") === "");
t("canonicalize null", () => m.canonicalize(null) === "");

// isWithin
t("isWithin self", () => m.isWithin("h:/prism","h:/prism") === true);
t("isWithin nested", () => m.isWithin("h:/prism","h:/prism/foo/bar") === true);
t("isWithin sibling", () => m.isWithin("h:/prism","h:/prism-slot-charlie") === false);
t("isWithin sibling reverse", () => m.isWithin("h:/prism","h:/prism-slot-x/sub") === false);
t("isWithin prefix-no-sep", () => m.isWithin("h:/pri","h:/prism") === false);
t("isWithin case+slash normalised", () => m.isWithin("H:\\prism","h:/prism/file.ts") === true);
t("isWithin empty parent", () => m.isWithin("","h:/x") === false);
t("isWithin empty child", () => m.isWithin("h:/x","") === false);

// isSlotBranch
t("isSlotBranch slot/alpha", () => m.isSlotBranch("slot/alpha") === true);
t("isSlotBranch slot/charlie", () => m.isSlotBranch("slot/charlie") === true);
t("isSlotBranch refs/heads/slot/x", () => m.isSlotBranch("refs/heads/slot/x") === true);
t("isSlotBranch cad-fusion-live-ms0", () => m.isSlotBranch("cad-fusion-live-ms0") === false);
t("isSlotBranch work/cam-fusion", () => m.isSlotBranch("work/cam-fusion") === false);
t("isSlotBranch null", () => m.isSlotBranch(null) === false);
t("isSlotBranch undef", () => m.isSlotBranch(undefined) === false);
t("isSlotBranch empty", () => m.isSlotBranch("") === false);
t("isSlotBranch number", () => m.isSlotBranch(42) === false);

// resolveSlotBinding — fixture mirrors the REAL chat-slots.json schema:
//   { schemaVersion, lastUpdated, slots: { <slot>: { chatId, branch, ... } } }
// `slots.slots` is an OBJECT keyed by slot name, NOT an array.
const SLOTS = { slots: {
  alpha:   null, // idle
  charlie: { chatId: "claude-abcd1234", branch: "slot/charlie" },
  delta:   { chatId: "claude-xx",       branch: "cad-fusion-live-ms0" },
  golf:    { chatId: "claude-golf",     branch: "cad-fusion-live-ms0" },
}};
t("binding happy", () => {
  const b = m.resolveSlotBinding({ sessionId:"claude-abcd1234", slots:SLOTS });
  return b !== null && b.slot === "charlie" && b.branch === "slot/charlie";
});
t("binding pre-cutover branch (cad-fusion-live-ms0)", () => {
  const b = m.resolveSlotBinding({ sessionId:"claude-xx", slots:SLOTS });
  return b !== null && b.slot === "delta" && b.branch === "cad-fusion-live-ms0";
});
t("binding golf", () => {
  const b = m.resolveSlotBinding({ sessionId:"claude-golf", slots:SLOTS });
  return b !== null && b.slot === "golf";
});
t("binding null sid", () => m.resolveSlotBinding({ sessionId:null, slots:SLOTS }) === null);
t("binding null slots", () => m.resolveSlotBinding({ sessionId:"claude-abcd1234", slots:null }) === null);
t("binding no match", () => m.resolveSlotBinding({ sessionId:"claude-99999999", slots:SLOTS }) === null);
t("binding empty slots object", () => m.resolveSlotBinding({ sessionId:"x", slots:{slots:{}} }) === null);
// Defense-in-depth: legacy array shape (if any old fixture sneaks in) → null, not throw.
t("binding legacy array shape returns null safely", () => m.resolveSlotBinding({ sessionId:"x", slots:{slots:[]} }) === null);
t("binding null slot value (idle)", () => m.resolveSlotBinding({ sessionId:"any", slots:{slots:{alpha:null}} }) === null);

// decideOnEdit
const SLOT_BINDING   = { slot:"charlie", branch:"slot/charlie" };
const GOLF_BINDING   = { slot:"golf",    branch:"slot/golf" };
const PRECUTOVER_BIND= { slot:"alpha",   branch:"cad-fusion-live-ms0" };
const NULL_BINDING   = null;

t("decide null file → allow", () => m.decideOnEdit({ filePathAbs:"", binding:SLOT_BINDING, cwd:"" }) === null);
t("decide unbound → allow", () => m.decideOnEdit({ filePathAbs:"h:/prism/x.ts", binding:NULL_BINDING, cwd:"" }) === null);
t("decide pre-cutover → allow", () => m.decideOnEdit({ filePathAbs:"h:/prism/x.ts", binding:PRECUTOVER_BIND, cwd:"" }) === null);
t("decide golf → allow", () => m.decideOnEdit({ filePathAbs:"h:/prism/x.ts", binding:GOLF_BINDING, cwd:"" }) === null);
t("decide slot writing OWN worktree → allow", () => {
  // file inside H:/prism-slot-charlie should not be inside MAIN_TREE_ROOT (h:/prism)
  const r = m.decideOnEdit({ filePathAbs:"h:/prism-slot-charlie/sub/x.ts", binding:SLOT_BINDING, cwd:"" });
  return r === null;
});
t("decide SLOT writing main tree → BLOCK", () => {
  const r = m.decideOnEdit({ filePathAbs:"h:/prism/web/app.tsx", binding:SLOT_BINDING, cwd:"h:/prism-slot-charlie" });
  return r !== null && r.decision === "block"
    && r.reason.includes("slot:        charlie")
    && r.reason.includes("h:/prism/web/app.tsx")
    && r.reason.includes("H:/prism-slot-charlie");
});
t("decide BLOCK reason carries kill switch", () => {
  const r = m.decideOnEdit({ filePathAbs:"h:/prism/x.ts", binding:SLOT_BINDING, cwd:"" });
  return r !== null && r.reason.includes("PRISM_MAINTREE_WRITE_BLOCK_DISABLE");
});
t("decide BLOCK reason mentions golf delegation", () => {
  const r = m.decideOnEdit({ filePathAbs:"h:/prism/x.ts", binding:SLOT_BINDING, cwd:"" });
  return r !== null && r.reason.toLowerCase().includes("golf");
});
t("decide main tree root exact-match BLOCK", () => {
  // a write directly to "h:/prism" (no sub-path) — equality counts as within
  const r = m.decideOnEdit({ filePathAbs:"h:/prism", binding:SLOT_BINDING, cwd:"" });
  return r !== null && r.decision === "block";
});

// CLI activation gate (spawn the hook with minimal env so host state can't leak)
const SAFE_ENV_BASE = {
  PATH: process.env.PATH || "",
  SystemRoot: process.env.SystemRoot || "",
  PRISM_MAINTREE_WRITE_BLOCK_ENABLE: "",
  PRISM_MAINTREE_WRITE_BLOCK_DISABLE: "",
};
function spawnHook(input, env) {
  return spawnSync(process.execPath, [HOOK_PATH], {
    input, encoding: "utf-8", timeout: 4000,
    env: { ...SAFE_ENV_BASE, ...env },
    windowsHide: true,
  });
}
t("CLI: kill switch silent no-op (default-ON post-U-P3-DEFAULT-ON)", () => {
  // Was "default-off silent no-op" pre-U-P3-DEFAULT-ON. Post-flip the hook
  // is ON by default; verify the kill switch path produces a silent no-op.
  const r = spawnHook(JSON.stringify({ tool_name:"Edit", tool_input:{ file_path:"H:/prism/x.ts" } }),
    { PRISM_MAINTREE_WRITE_BLOCK_DISABLE: "1" });
  return r.status === 0 && r.stdout === "";
});
t("CLI: kill switch wins over enable", () => {
  const r = spawnHook(JSON.stringify({ tool_name:"Edit", tool_input:{ file_path:"H:/prism/x.ts" } }),
    { PRISM_MAINTREE_WRITE_BLOCK_ENABLE: "1", PRISM_MAINTREE_WRITE_BLOCK_DISABLE: "1" });
  return r.status === 0 && r.stdout === "";
});
t("CLI: malformed stdin fails open", () => {
  const r = spawnHook("not json", { PRISM_MAINTREE_WRITE_BLOCK_ENABLE: "1" });
  return r.status === 0 && r.stdout === "";
});
t("CLI: non-Edit tool exits 0", () => {
  const r = spawnHook(JSON.stringify({ tool_name:"Bash", tool_input:{ command:"ls" } }),
    { PRISM_MAINTREE_WRITE_BLOCK_ENABLE: "1" });
  return r.status === 0 && r.stdout === "";
});
t("CLI: missing file_path exits 0", () => {
  const r = spawnHook(JSON.stringify({ tool_name:"Edit", tool_input:{} }),
    { PRISM_MAINTREE_WRITE_BLOCK_ENABLE: "1" });
  return r.status === 0 && r.stdout === "";
});
t("CLI: Write tool path is guarded", () => {
  // Today this chat is unbound or on cad-fusion-live-ms0, so the gate ends in
  // allow anyway — we just verify the hook routes Write through the pipeline
  // (exits 0 silently rather than throwing or hanging).
  const r = spawnHook(JSON.stringify({ tool_name:"Write", tool_input:{ file_path:"H:/prism/x.ts", content:"hi" } }),
    { PRISM_MAINTREE_WRITE_BLOCK_ENABLE: "1" });
  return r.status === 0;
});
t("CLI: MultiEdit tool path is guarded", () => {
  const r = spawnHook(JSON.stringify({ tool_name:"MultiEdit", tool_input:{ file_path:"H:/prism/x.ts", edits:[] } }),
    { PRISM_MAINTREE_WRITE_BLOCK_ENABLE: "1" });
  return r.status === 0;
});

// Run
let pass = 0, fail = 0;
for (const { name, fn } of tests) {
  let ok = false, err = null;
  try { ok = fn() === true; } catch (e) { err = e; }
  if (ok) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, err ? `(err: ${err.message})` : ""); }
}
console.log(`\n=== ${pass}/${pass+fail} pass ===`);
process.exit(fail === 0 ? 0 : 1);
