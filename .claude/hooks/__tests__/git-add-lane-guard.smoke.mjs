// git-add-lane-guard.smoke.mjs — direct-import smoke harness.
//
// vitest harness for .claude/hooks/__tests__/*.test.mjs is blocked by a
// known vite-transform bug (FLEET-REAPER-MS1 docs flag the same blocker).
// This smoke script validates the pure helpers and the CLI activation gate
// via plain dynamic import + spawnSync. Real-value assertions only.
//
// Exit codes: 0 = all pass, 1 = any fail, 2 = harness/import error.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HOOK_PATH = fileURLToPath(new URL("../git-add-lane-guard.mjs", import.meta.url));

const tests = [];
function t(name, fn) { tests.push({ name, fn }); }

const m = await import("../git-add-lane-guard.mjs");

// canonicalize
t("canonicalize bs→fs + drive lower", () => m.canonicalize("H:\\prism\\file.ts") === "h:/prism/file.ts");
t("canonicalize trailing slash", () => m.canonicalize("h:/prism/") === "h:/prism");
t("canonicalize multi-trailing", () => m.canonicalize("h:/prism///") === "h:/prism");
t("canonicalize empty", () => m.canonicalize("") === "");
t("canonicalize null", () => m.canonicalize(null) === "");
t("canonicalize relative resolves", () => {
  const out = m.canonicalize("./foo");
  return /^[a-z]:/.test(out) && out.endsWith("/foo") && !out.includes("\\");
});

// tokenize
t("tokenize ws split", () => JSON.stringify(m.tokenize("a b c")) === JSON.stringify(["a","b","c"]));
t("tokenize dquote", () => JSON.stringify(m.tokenize('a "b c" d')) === JSON.stringify(["a","b c","d"]));
t("tokenize squote", () => JSON.stringify(m.tokenize("a 'b c' d")) === JSON.stringify(["a","b c","d"]));
t("tokenize tabs", () => JSON.stringify(m.tokenize("a\t\tb c")) === JSON.stringify(["a","b","c"]));
t("tokenize empty", () => JSON.stringify(m.tokenize("")) === JSON.stringify([]));

// parseGitAddInvocations
t("parse no git add", () => m.parseGitAddInvocations("ls -la").length === 0);
t("parse git status", () => m.parseGitAddInvocations("git status").length === 0);
t("parse null", () => m.parseGitAddInvocations(null).length === 0);
t("parse undef", () => m.parseGitAddInvocations(undefined).length === 0);
t("parse number", () => m.parseGitAddInvocations(42).length === 0);
t("parse explicit", () => {
  const r = m.parseGitAddInvocations("git add foo.txt");
  return r.length === 1 && r[0].broad === false && JSON.stringify(r[0].paths) === JSON.stringify(["foo.txt"]);
});
t("parse multi paths", () => {
  const r = m.parseGitAddInvocations("git add a.txt b.txt c.txt");
  return JSON.stringify(r[0].paths) === JSON.stringify(["a.txt","b.txt","c.txt"]);
});
t("parse broad .", () => m.parseGitAddInvocations("git add .")[0].broad === true);
t("parse broad -A", () => m.parseGitAddInvocations("git add -A")[0].broad === true);
t("parse broad --all", () => m.parseGitAddInvocations("git add --all")[0].broad === true);
t("parse broad -u", () => m.parseGitAddInvocations("git add -u")[0].broad === true);
t("parse non-broad flag", () => {
  const r = m.parseGitAddInvocations("git add -v foo.txt");
  return r[0].broad === false && JSON.stringify(r[0].paths) === JSON.stringify(["foo.txt"]);
});
t("parse && chain (1 add)", () => {
  const r = m.parseGitAddInvocations("git add a.txt && git commit -m 'x'");
  return r.length === 1 && JSON.stringify(r[0].paths) === JSON.stringify(["a.txt"]);
});
t("parse && chain (2 adds)", () => {
  const r = m.parseGitAddInvocations("git add a.txt && git add b.txt");
  return r.length === 2 && r[0].paths[0] === "a.txt" && r[1].paths[0] === "b.txt";
});
t("parse ; separator", () => {
  const r = m.parseGitAddInvocations("git add a.txt; git add b.txt");
  return r.length === 2;
});
t("parse quoted path", () => {
  const r = m.parseGitAddInvocations(`git add "my file.txt"`);
  return r[0].paths[0] === "my file.txt";
});
t("parse inside single quotes ignored", () => m.parseGitAddInvocations(`echo 'git add bogus.txt'`).length === 0);
t("parse bare git add no args", () => m.parseGitAddInvocations("git add").length === 0);
t("parse gitadd is not git add", () => m.parseGitAddInvocations("gitadd foo.txt").length === 0);
t("parse git addX is not git add", () => m.parseGitAddInvocations("git addX foo.txt").length === 0);
t("parse -- separator passes path", () => {
  const r = m.parseGitAddInvocations("git add -- foo.txt");
  return JSON.stringify(r[0].paths) === JSON.stringify(["foo.txt"]);
});
// P1-B1 hardening: quote-escape edge cases (the tokenize state machine
// must not drop or mis-classify the path on backslash+quote sequences).
t("parse escaped dquote in path", () => {
  // git add "a\"b.txt"  — the inner \" should NOT terminate the quote prematurely.
  // We accept either: (a) preserved as a single token "a\"b.txt", or
  // (b) parsed but quoted content captured. The test verifies at least one path lands.
  const r = m.parseGitAddInvocations(`git add "a\\"b.txt"`);
  return r.length === 1 && r[0].paths.length >= 1 && r[0].broad === false;
});
t("parse unclosed quote fails open", () => {
  // Unclosed quote → tokenizer should not throw; either captures partial or
  // returns empty. The hook MUST NOT crash here.
  let threw = false;
  try { m.parseGitAddInvocations(`git add "no-close.txt`); } catch { threw = true; }
  return threw === false;
});

// isWithin
t("isWithin self", () => m.isWithin("h:/prism","h:/prism") === true);
t("isWithin nested", () => m.isWithin("h:/prism","h:/prism/foo/bar") === true);
t("isWithin sibling", () => m.isWithin("h:/prism","h:/prism-slot-x") === false);
t("isWithin upward", () => m.isWithin("h:/prism/foo","h:/prism") === false);
t("isWithin prefix no sep", () => m.isWithin("h:/pri","h:/prism") === false);
t("isWithin normalises", () => m.isWithin("H:\\prism","h:/prism/file.ts") === true);
t("isWithin empty parent", () => m.isWithin("","h:/x") === false);
t("isWithin empty child", () => m.isWithin("h:/x","") === false);

// findWorktreeForBranch
const SAMPLE = ["worktree H:/prism","HEAD abc","branch refs/heads/cad-fusion-live-ms0","","worktree H:/prism-slot-charlie","HEAD def","branch refs/heads/slot/charlie","","worktree H:/prism-detached","HEAD 0","detached",""].join("\n");
t("findWT short", () => m.findWorktreeForBranch(SAMPLE, "slot/charlie") === "H:/prism-slot-charlie");
t("findWT refs/heads/", () => m.findWorktreeForBranch(SAMPLE, "refs/heads/cad-fusion-live-ms0") === "H:/prism");
t("findWT miss", () => m.findWorktreeForBranch(SAMPLE, "no/such") === null);
t("findWT empty porc", () => m.findWorktreeForBranch("", "x") === null);
t("findWT empty branch", () => m.findWorktreeForBranch(SAMPLE, "") === null);
t("findWT skip detached", () => m.findWorktreeForBranch(SAMPLE, "detached") === null);
// P1-B5: malformed porcelain (worktree line with no branch line) must
// return null + not throw — caller fail-opens on null.
t("findWT malformed porcelain (no branch line)", () => {
  const bad = ["worktree H:/orphan", "HEAD abc", ""].join("\n");
  let threw = false; let result = "boom";
  try { result = m.findWorktreeForBranch(bad, "any/branch"); } catch { threw = true; }
  return threw === false && result === null;
});
t("findWT garbage porcelain (random lines)", () => {
  const bad = "not\nany\nworktree\nformat\n";
  let threw = false; let result = "boom";
  try { result = m.findWorktreeForBranch(bad, "x"); } catch { threw = true; }
  return threw === false && result === null;
});

// resolveSlotScope — fixture mirrors the REAL chat-slots.json schema:
//   { schemaVersion, lastUpdated, slots: { <slot>: { chatId, branch, ... } } }
// (`slots.slots` is an OBJECT keyed by slot name, NOT an array. Original
// fixture used an array shape — that bug was caught by the sibling
// main-tree-write-block.mjs smoke harness against the real file.)
const SLOTS = { slots: {
  alpha:   null, // idle
  charlie: { chatId: "claude-abcd1234", branch: "slot/charlie" },
}};
t("scope happy", () => {
  const s = m.resolveSlotScope({ sessionId:"claude-abcd1234", slots:SLOTS, porcelain:SAMPLE, cwd:"H:/prism-slot-charlie" });
  return s && s.slot === "charlie" && s.branch === "slot/charlie" && s.root === "h:/prism-slot-charlie";
});
t("scope null on missing sid", () => m.resolveSlotScope({ sessionId:null, slots:SLOTS, porcelain:SAMPLE, cwd:"H:/x" }) === null);
t("scope null on missing slots", () => m.resolveSlotScope({ sessionId:"claude-abcd1234", slots:null, porcelain:SAMPLE, cwd:"H:/x" }) === null);
t("scope null on no match", () => m.resolveSlotScope({ sessionId:"claude-99999999", slots:SLOTS, porcelain:SAMPLE, cwd:"H:/x" }) === null);
t("scope null on unbound (no branch)", () => m.resolveSlotScope({ sessionId:"claude-xx", slots:{slots:{a:{chatId:"claude-xx"}}}, porcelain:SAMPLE, cwd:"H:/x" }) === null);
t("scope null on no worktree match", () => m.resolveSlotScope({ sessionId:"claude-xx", slots:{slots:{a:{chatId:"claude-xx",branch:"slot/missing"}}}, porcelain:SAMPLE, cwd:"H:/x" }) === null);
// Defense-in-depth: legacy array shape (if any old fixture sneaks in) → null, not throw.
t("scope returns null on legacy array shape", () => m.resolveSlotScope({ sessionId:"x", slots:{slots:[]}, porcelain:SAMPLE, cwd:"H:/x" }) === null);
t("scope null on idle slot (null state)", () => m.resolveSlotScope({ sessionId:"x", slots:{slots:{alpha:null}}, porcelain:SAMPLE, cwd:"H:/x" }) === null);

// decideOnInvocations
const S = { slot:"charlie", branch:"slot/charlie", root:"h:/prism-slot-charlie", cwd:"h:/prism-slot-charlie" };
const SBAD = { ...S, cwd: "h:/prism" };
t("decide empty invs", () => m.decideOnInvocations([], S) === null);
t("decide null scope", () => m.decideOnInvocations([{broad:false,paths:["x"]}], null) === null);
t("decide in-scope rel", () => m.decideOnInvocations([{broad:false,paths:["foo.txt"]}], S) === null);
t("decide in-scope abs", () => m.decideOnInvocations([{broad:false,paths:["H:/prism-slot-charlie/sub/x.ts"]}], S) === null);
t("decide out-of-scope blocks", () => {
  const r = m.decideOnInvocations([{broad:false,paths:["H:/prism/web/app.tsx"]}], S);
  return r !== null && r.decision === "block" && r.reason.includes("charlie") && r.reason.includes("h:/prism/web/app.tsx");
});
t("decide out-of-scope ../prism", () => {
  const r = m.decideOnInvocations([{broad:false,paths:["../prism/foo.ts"]}], S);
  return r !== null && r.decision === "block";
});
t("decide broad inside ok", () => m.decideOnInvocations([{broad:true,paths:[]}], S) === null);
t("decide broad outside blocks", () => {
  const r = m.decideOnInvocations([{broad:true,paths:[]}], SBAD);
  return r !== null && r.decision === "block" && r.reason.includes("broad-from-outside");
});
t("decide multi offenders reported", () => {
  const r = m.decideOnInvocations([
    {broad:false,paths:["H:/prism/a.ts","H:/prism/b.ts"]},
    {broad:false,paths:["H:/prism/c.ts"]},
  ], S);
  return r !== null && /a\.ts/.test(r.reason) && /b\.ts/.test(r.reason) && /c\.ts/.test(r.reason);
});
t("decide reason carries kill switch", () => {
  const r = m.decideOnInvocations([{broad:false,paths:["H:/prism/a.ts"]}], S);
  return r !== null && r.reason.includes("PRISM_GIT_ADD_LANE_DISABLE");
});

// CLI activation gate (spawn the hook).
// P1-B4: minimal env (PATH + SystemRoot for Windows) so the CLI-activation
// tests don't depend on the developer's shell env (e.g., a host that already
// has PRISM_GIT_ADD_LANE_ENABLE=1 exported). Pass-through PATH+SystemRoot keeps
// node + git resolvable; nothing else leaks in.
const SAFE_ENV_BASE = {
  PATH: process.env.PATH || "",
  SystemRoot: process.env.SystemRoot || "",
  PRISM_GIT_ADD_LANE_ENABLE: "",
  PRISM_GIT_ADD_LANE_DISABLE: "",
};
function spawnHook(input, env) {
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    input, encoding: "utf-8", timeout: 4000,
    env: { ...SAFE_ENV_BASE, ...env },
    windowsHide: true,
  });
  return r;
}
t("CLI: default-off silent no-op", () => {
  const r = spawnHook(JSON.stringify({ tool_name:"Bash", tool_input:{ command:"git add ." } }), {});
  return r.status === 0 && r.stdout === "";
});
t("CLI: kill switch wins over enable", () => {
  const r = spawnHook(JSON.stringify({ tool_name:"Bash", tool_input:{ command:"git add ." } }),
    { PRISM_GIT_ADD_LANE_ENABLE: "1", PRISM_GIT_ADD_LANE_DISABLE: "1" });
  return r.status === 0 && r.stdout === "";
});
t("CLI: malformed stdin fails open", () => {
  const r = spawnHook("not json", { PRISM_GIT_ADD_LANE_ENABLE: "1" });
  return r.status === 0 && r.stdout === "";
});
t("CLI: non-Bash tool exits 0", () => {
  const r = spawnHook(JSON.stringify({ tool_name:"Edit", tool_input:{ file_path:"x.ts" } }),
    { PRISM_GIT_ADD_LANE_ENABLE: "1" });
  return r.status === 0 && r.stdout === "";
});
t("CLI: git status exits 0", () => {
  const r = spawnHook(JSON.stringify({ tool_name:"Bash", tool_input:{ command:"git status" } }),
    { PRISM_GIT_ADD_LANE_ENABLE: "1" });
  return r.status === 0 && r.stdout === "";
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
