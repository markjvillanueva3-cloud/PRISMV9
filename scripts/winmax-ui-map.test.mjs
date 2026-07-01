/**
 * Tests for winmax-ui-map.mjs — the WinMax UI navigation FSM. slot:echo.
 * Pure-core only (signatureOf/fingerprint/matchScreen/disambiguate/shortestPath) — no live driver.
 * Verifies the engine against the REAL seeded map (winmax-ui-map.json), so a drift between the
 * engine's matching logic and the seeded screen signatures fails here.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  signatureOf, fingerprint, matchScreen, disambiguateBySoftkeys, shortestPath, renderMap,
  DEFAULT_MAP_PATH, distinctiveButtons, disambiguateByButtons, pathResult,
} from "./winmax-ui-map.mjs";

const MAP_MJS = fileURLToPath(new URL("./winmax-ui-map.mjs", import.meta.url));

const MAP = JSON.parse(readFileSync(DEFAULT_MAP_PATH, "utf8"));

// fixture probes mirroring real WinMax screens
const toolSetupProbe = {
  tree: [
    { controlType: "Edit", automationId: "303", name: "0.0000" },
    { controlType: "Edit", automationId: "301", name: "1" },
    { controlType: "Edit", automationId: "310", name: "0.0000" },
    { controlType: "Edit", automationId: "322", name: "0" },
    { controlType: "Edit", automationId: "347", name: "1" },
    { controlType: "Edit", automationId: "354", name: "0" },
    { controlType: "Edit", automationId: "360", name: "0.0000" },
    { controlType: "Edit", automationId: "361", name: "0.0000" },
    { controlType: "Edit", automationId: "362", name: "0.0000" },
    { controlType: "Edit", automationId: "367", name: "-0.000" },
    { controlType: "Edit", automationId: "372", name: "0.000" },
    { controlType: "Edit", automationId: "373", name: "0.0000" },
    { controlType: "Edit", automationId: "374", name: "0.0000" },
    { controlType: "Edit", automationId: "375", name: "0.0000" },
    { controlType: "Edit", automationId: "379", name: "0.000" },
    { controlType: "Edit", automationId: "380", name: "0.000" },
    { controlType: "Button", automationId: "303", name: "F3" }, // the colliding softkey
    { controlType: "Edit", automationId: "StatusBar.Pane0", name: "" }, // chrome — must be excluded
  ],
};
const emptyMenuProbe = {
  tree: [
    { controlType: "Button", automationId: "301", name: "F1" },
    { controlType: "Button", automationId: "302", name: "F2" },
    { controlType: "Edit", automationId: "StatusBar.Pane0", name: "" },
    { controlType: "Edit", automationId: "StatusBar.Pane5", name: "" },
  ],
};
const toolDbProbe = {
  tree: [
    { controlType: "List", automationId: "" },
    { controlType: "ListItem", automationId: "" },
    { controlType: "Button", automationId: "301", name: "F1" },
    { controlType: "Edit", automationId: "StatusBar.Pane0", name: "" },
  ],
};

describe("signatureOf", () => {
  it("extracts exactly the 16 form Edit ids, excluding StatusBar chrome + the colliding Button", () => {
    const sig = signatureOf(toolSetupProbe);
    expect(sig.edits).toEqual(
      ["301", "303", "310", "322", "347", "354", "360", "361", "362", "367", "372", "373", "374", "375", "379", "380"]
    );
    expect(sig.hasList).toBe(false);
  });
  it("detects List / ListItem presence and yields no edits for the tool list", () => {
    expect(signatureOf(toolDbProbe)).toEqual({ edits: [], hasList: true, hasListItems: true, buttons: [] });
  });
  it("empty/null probe → empty signature (no throw)", () => {
    // buttons is the additive U-WINMAX-BUTTON-SIGNATURE dimension; numeric softkey id 301 in
    // toolDbProbe is excluded (it belongs to the orthogonal softkey dimension), so buttons stays [].
    expect(signatureOf(null)).toEqual({ edits: [], hasList: false, hasListItems: false, buttons: [] });
    expect(signatureOf({})).toEqual({ edits: [], hasList: false, hasListItems: false, buttons: [] });
    expect(signatureOf({ tree: [] })).toEqual({ edits: [], hasList: false, hasListItems: false, buttons: [] });
  });
  it("a Button sharing an Edit's id does not pollute the edit set", () => {
    expect(signatureOf({ tree: [{ controlType: "Button", automationId: "303", name: "F3" }] }).edits).toEqual([]);
  });
  it("dedupes a doubled Edit id from a stale tree", () => {
    const sig = signatureOf({ tree: [
      { controlType: "Edit", automationId: "301", name: "1" },
      { controlType: "Edit", automationId: "301", name: "1" },
    ] });
    expect(sig.edits).toEqual(["301"]);
  });
});

describe("fingerprint", () => {
  it("is deterministic and order-independent on edits", () => {
    const a = fingerprint({ edits: ["310", "301", "303"], hasList: false, hasListItems: false });
    const b = fingerprint({ edits: ["303", "301", "310"], hasList: false, hasListItems: false });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{12}$/);
  });
  it("differs when the edit set differs", () => {
    expect(fingerprint({ edits: ["301"] })).not.toBe(fingerprint({ edits: ["302"] }));
  });
  it("differs when hasList differs even with identical edits", () => {
    expect(fingerprint({ edits: [], hasList: true })).not.toBe(fingerprint({ edits: [], hasList: false }));
  });
});

describe("matchScreen (against the real seed map)", () => {
  it("confidently identifies TOOL_SETUP_FORM by its unique field set", () => {
    const r = matchScreen(MAP, signatureOf(toolSetupProbe));
    expect(r.match).toBe("TOOL_SETUP_FORM");
    expect(r.ambiguous).toBe(false);
    expect(r.confidence).toBe(1.0);
  });
  it("confidently identifies TOOL_DATABASE by its List signature", () => {
    const r = matchScreen(MAP, signatureOf(toolDbProbe));
    expect(r.match).toBe("TOOL_DATABASE");
    expect(r.ambiguous).toBe(false);
    expect(r.confidence).toBe(1.0);
  });
  it("returns AMBIGUOUS for a field-less menu signature, carrying each candidate's softkey labels", () => {
    const r = matchScreen(MAP, signatureOf(emptyMenuProbe));
    expect(r.match).toBeNull();
    expect(r.ambiguous).toBe(true);
    expect(r.candidates).toContain("INPUT_MENU");
    expect(r.candidates).toContain("PART_SETUP");
    expect(r.candidates).toContain("ADD_TOOL_FORM");
    // the tiebreak payload must carry the real seeded labels so a caller can vision-match
    expect(r.tiebreakSoftkeys.PART_SETUP.F2).toBe("TOOL SETUP");
    expect(r.tiebreakSoftkeys.INPUT_MENU.F8).toBe("PROGRAM MANAGER");
    // confidence is the code's 3-decimal-rounded 1/N (matchScreen: +(1/N).toFixed(3)), NOT raw 1/N —
    // assert the actual contract so adding an Nth field-less screen (e.g. DRAW_VERIFY, 5→6) can't
    // silently desync a 5-digit toBeCloseTo against a 3-digit-rounded value.
    expect(r.confidence).toBe(+(1 / r.candidates.length).toFixed(3));
  });
  it("returns no match for an unknown signature", () => {
    const r = matchScreen(MAP, { edits: ["999", "998"], hasList: false, hasListItems: false });
    expect(r.match).toBeNull();
    expect(r.candidates).toEqual([]);
    expect(r.ambiguous).toBe(false);
  });
});

describe("disambiguateBySoftkeys", () => {
  it("picks PART_SETUP from the menu ambiguity set using its softkey labels", () => {
    const cand = matchScreen(MAP, signatureOf(emptyMenuProbe)).candidates;
    const r = disambiguateBySoftkeys(MAP, cand, ["WORK OFFSETS", "TOOL SETUP", "PART PROBING", "EXIT"]);
    expect(r.match).toBe("PART_SETUP");
    expect(r.score).toBe(4);
  });
  it("picks INPUT_MENU using ITS distinct labels", () => {
    const cand = matchScreen(MAP, signatureOf(emptyMenuProbe)).candidates;
    const r = disambiguateBySoftkeys(MAP, cand, ["PROGRAM MANAGER", "TOOL REVIEW", "ERASE FUNCTIONS"]);
    expect(r.match).toBe("INPUT_MENU");
    expect(r.score).toBe(3);
  });
  it("returns null match when no labels overlap any candidate", () => {
    const r = disambiguateBySoftkeys(MAP, ["INPUT_MENU", "PART_SETUP"], ["NONEXISTENT LABEL"]);
    expect(r.match).toBeNull();
    expect(r.score).toBe(0);
  });
});

describe("shortestPath (BFS over the real seed graph)", () => {
  it("finds the 2-hop path INPUT_MENU → TOOL_SETUP_FORM", () => {
    const p = shortestPath(MAP, "INPUT_MENU", "TOOL_SETUP_FORM");
    expect(p.map((s) => s.key)).toEqual(["{F1}", "{F2}"]);
    expect(p.map((s) => s.to)).toEqual(["PART_SETUP", "TOOL_SETUP_FORM"]);
  });
  it("finds the 1-hop TOOL_DATABASE → ADD_TOOL_FORM with its label", () => {
    expect(shortestPath(MAP, "TOOL_DATABASE", "ADD_TOOL_FORM")).toEqual([
      { key: "{F1}", label: "ADD TOOL", to: "ADD_TOOL_FORM" },
    ]);
  });
  it("finds the editor exit ISNC_EDITOR → INPUT_MENU as a single {F8}", () => {
    expect(shortestPath(MAP, "ISNC_EDITOR", "INPUT_MENU").map((s) => s.key)).toEqual(["{F8}"]);
  });
  it("returns [] for same start/target", () => {
    expect(shortestPath(MAP, "PART_SETUP", "PART_SETUP")).toEqual([]);
  });
  it("returns null when no path exists (ADD_TOOL_FORM cannot reach the editor subtree)", () => {
    expect(shortestPath(MAP, "ADD_TOOL_FORM", "TAGGED_BLOCKS")).toBeNull();
  });
  it("every seeded transition references existing screens (graph integrity)", () => {
    const keys = new Set(Object.keys(MAP.screens));
    const dangling = MAP.transitions.filter((t) => !keys.has(t.from) || !keys.has(t.to));
    expect(dangling).toEqual([]);
  });
});

describe("renderMap", () => {
  it("renders a markdown map naming each screen, its fingerprint, and the dropdown blocker", () => {
    const md = renderMap(MAP);
    expect(md).toContain("TOOL_SETUP_FORM");
    expect(md).toContain("TOOL_DATABASE");
    expect(md).toContain("fingerprint:");
    expect(md).toContain("⛔ blocker"); // ADD_TOOL_FORM dropdown blocker surfaced
  });
});

// ── Button-automationId signature + tiebreak (U-WINMAX-BUTTON-SIGNATURE) ──
// The live Mill-sim Graphics/Draw/Verify screen (captured 2026-06-01): field-less (0 Edits) but
// distinctive readable Buttons — DrawButton/SingleStepButton/etc. These resolve field-less-screen
// ambiguity WITHOUT vision (the softkey labels are graphical/unreadable).
const drawVerifyProbe = {
  tree: [
    { controlType: "Button", automationId: "Minimize" },
    { controlType: "Button", automationId: "Maximize" },
    { controlType: "Button", automationId: "Close" },
    { controlType: "Button", automationId: "HeaderSite" },
    { controlType: "Button", automationId: "Button0" },
    { controlType: "Button", automationId: "DrawButton" },
    { controlType: "Button", automationId: "SingleStepButton" },
    { controlType: "Button", automationId: "NextToolChangeButton" },
    { controlType: "Button", automationId: "PauseButton" },
    { controlType: "Button", automationId: "JumpToBlockButton" },
    { controlType: "Text", automationId: "", name: "Graphics" },
  ],
};

describe("distinctiveButtons", () => {
  it("keeps distinctive control buttons and drops window chrome + generic Button<N>", () => {
    const b = distinctiveButtons(drawVerifyProbe.tree);
    expect(b).toContain("DrawButton");
    expect(b).toContain("SingleStepButton");
    expect(b).not.toContain("Minimize");
    expect(b).not.toContain("Close");
    expect(b).not.toContain("HeaderSite");
    expect(b).not.toContain("Button0");
  });
  it("dedupes + sorts, and returns [] for a treeless probe", () => {
    const dup = distinctiveButtons([{ controlType: "Button", automationId: "B" }, { controlType: "Button", automationId: "A" }, { controlType: "Button", automationId: "B" }]);
    expect(dup).toEqual(["A", "B"]);
    expect(distinctiveButtons(undefined)).toEqual([]);
  });
});

describe("signatureOf includes the additive buttons dimension", () => {
  it("captures distinctive buttons on a field-less screen (empty edits)", () => {
    const sig = signatureOf(drawVerifyProbe);
    expect(sig.edits).toEqual([]);                 // field-less — the source of the old ambiguity
    expect(sig.buttons).toContain("DrawButton");
    expect(sig.buttons).not.toContain("Minimize");
  });
});

describe("disambiguateByButtons (vision-free field-less-screen tiebreak)", () => {
  const map = {
    screens: {
      DRAW_VERIFY: { signature: { edits: [], buttons: ["DrawButton", "SingleStepButton", "NextToolChangeButton", "PauseButton", "JumpToBlockButton"] } },
      INPUT_MENU: { signature: { edits: [], buttons: [] } },        // no buttons recorded
      ADD_TOOL_FORM: { signature: { edits: [], buttons: [] } },
    },
  };
  it("resolves to the candidate whose stored buttons best overlap the live buttons", () => {
    const live = ["DrawButton", "SingleStepButton", "NextToolChangeButton", "PauseButton", "JumpToBlockButton"];
    const r = disambiguateByButtons(map, ["DRAW_VERIFY", "INPUT_MENU", "ADD_TOOL_FORM"], live);
    expect(r.match).toBe("DRAW_VERIFY");
    expect(r.score).toBe(1);                       // exact button-set overlap
  });
  it("returns no match when no candidate has stored buttons (graceful fallback to softkeys)", () => {
    const r = disambiguateByButtons(map, ["INPUT_MENU", "ADD_TOOL_FORM"], ["DrawButton"]);
    expect(r.match).toBeNull();
  });
  it("returns no match when live buttons are empty", () => {
    expect(disambiguateByButtons(map, ["DRAW_VERIFY"], []).match).toBeNull();
  });
});

describe("matchScreen — button tiebreak resolves field-less ambiguity (additive, non-breaking)", () => {
  const map = {
    screens: {
      DRAW_VERIFY: { signature: { edits: [], hasList: false, hasListItems: false, buttons: ["DrawButton", "SingleStepButton", "PauseButton"] } },
      INPUT_MENU: { signature: { edits: [], hasList: false, hasListItems: false, buttons: [] }, softkeys: { F1: "WORK OFFSETS" } },
      // a screen WITH edits — proves the primary Edit-signature path is unchanged
      TOOL_FORM: { signature: { edits: ["301", "303"], hasList: false, hasListItems: false, buttons: [] } },
    },
  };
  it("a field-less live screen with distinctive buttons resolves to the matching screen (resolvedBy:buttons)", () => {
    const live = signatureOf({ tree: [
      { controlType: "Button", automationId: "DrawButton" },
      { controlType: "Button", automationId: "SingleStepButton" },
      { controlType: "Button", automationId: "PauseButton" },
      { controlType: "Button", automationId: "Close" },
    ] });
    const m = matchScreen(map, live);
    expect(m.match).toBe("DRAW_VERIFY");
    expect(m.ambiguous).toBe(false);
    expect(m.resolvedBy).toBe("buttons");
  });
  it("primary Edit-signature exact match is unchanged by the additive buttons field", () => {
    const live = signatureOf({ tree: [
      { controlType: "Edit", automationId: "301" }, { controlType: "Edit", automationId: "303" },
    ] });
    const m = matchScreen(map, live);
    expect(m.match).toBe("TOOL_FORM");
    expect(m.confidence).toBe(1.0);
  });
  it("stays ambiguous (offers softkey tiebreak) when buttons cannot resolve", () => {
    const ambigMap = { screens: {
      A: { signature: { edits: [], buttons: [] }, softkeys: { F1: "X" } },
      B: { signature: { edits: [], buttons: [] }, softkeys: { F1: "Y" } },
    } };
    const m = matchScreen(ambigMap, signatureOf({ tree: [] }));
    expect(m.ambiguous).toBe(true);
    expect(Object.keys(m.tiebreakSoftkeys)).toEqual(["A", "B"]);
  });
});

// ── path-result envelope (U-WINMAX-NAV-PATH-CONTRACT) ──
// winmax-course-run.mjs#nav consumes `{ok, keys}` from the `path` CLI; the raw shortestPath() returns
// a bare [{key,label,to}] array (no .ok/.keys) which broke the consumer. pathResult() is the envelope.
describe("pathResult (nav envelope the consumer expects)", () => {
  it("wraps a 2-hop path into {ok, keys, steps, hops} — keys are the ordered softkeys to emit", () => {
    const r = pathResult(MAP, "INPUT_MENU", "TOOL_SETUP_FORM");
    expect(r.ok).toBe(true);
    expect(r.keys).toEqual(["{F1}", "{F2}"]);              // the exact sendkeys sequence
    expect(r.hops).toBe(2);
    expect(r.steps.map((s) => s.to)).toEqual(["PART_SETUP", "TOOL_SETUP_FORM"]);
    expect(r.keys).toEqual(r.steps.map((s) => s.key));     // keys is the .key projection of steps
  });
  it("a 1-hop path yields a single-key list", () => {
    const r = pathResult(MAP, "TOOL_DATABASE", "ADD_TOOL_FORM");
    expect(r.ok).toBe(true);
    expect(r.keys).toEqual(["{F1}"]);
    expect(r.hops).toBe(1);
  });
  it("same start/target → ok:true, no keys (already there)", () => {
    const r = pathResult(MAP, "PART_SETUP", "PART_SETUP");
    expect(r.ok).toBe(true);
    expect(r.keys).toEqual([]);
    expect(r.hops).toBe(0);
  });
  it("no path → ok:false with an error string and empty keys (consumer reports 'no path')", () => {
    const r = pathResult(MAP, "ADD_TOOL_FORM", "TAGGED_BLOCKS");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no path ADD_TOOL_FORM -> TAGGED_BLOCKS/);
    expect(r.keys).toEqual([]);
    expect(r.hops).toBe(0);
  });
  it("unknown screen name → ok:false (no throw)", () => {
    const r = pathResult(MAP, "NOPE", "ALSO_NOPE");
    expect(r.ok).toBe(false);
    expect(r.keys).toEqual([]);
  });
});

describe("path CLI emits a single-line, parseable {ok,keys} envelope (end-to-end contract)", () => {
  // Proves the actual fix: the `path` CLI stdout is what winmax-course-run.mjs#mapCli JSON-parses.
  // Before U-WINMAX-NAV-PATH-CONTRACT it emitted a bare array (no .ok/.keys) → live nav always failed.
  const runPath = (from, to) =>
    spawnSync(process.execPath, [MAP_MJS, "path", from, to], { encoding: "utf8", timeout: 20000 });

  it("a real path → exactly one JSON line that parses to {ok:true, keys:[...]}", () => {
    const r = runPath("INPUT_MENU", "TOOL_SETUP_FORM");
    expect(r.status).toBe(0);
    const lines = (r.stdout || "").trim().split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBe(1);                          // single-line (mapCli reads the last line)
    const parsed = JSON.parse(lines[0]);
    expect(parsed.ok).toBe(true);
    expect(parsed.keys).toEqual(["{F1}", "{F2}"]);
  });
  it("no path → one JSON line that parses to {ok:false, keys:[]} (NOT a bare 'no path' string)", () => {
    const r = runPath("ADD_TOOL_FORM", "TAGGED_BLOCKS");
    const last = (r.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop();
    const parsed = JSON.parse(last);                       // must be valid JSON, not a raw string
    expect(parsed.ok).toBe(false);
    expect(parsed.keys).toEqual([]);
  });
});
