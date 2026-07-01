/**
 * mine-galaxy-transcripts.test.mjs -- tests for the generalized transcript miner +
 * its galaxy routing registry (GALAXY-TRANSCRIPT-MINE, slot:kilo 2026-06-09).
 *
 * R9: real reference values + intent-encoding asserts; no toBeDefined stubs. Covers
 * registry completeness/correctness, classification (incl the known hotel/india
 * precedents route correctly), spine noise filtering, the concurrency limiter,
 * vault-doc shape, coverage honesty, and discovery with injected readers (no live FS).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GALAXY_REGISTRY,
  GALAXY_KEYS,
  classifyHandoff,
  getGalaxy,
  classifyTranscriptContent,
  extractSlotHint,
} from "./lib/galaxy-mining-registry.mjs";
import {
  isNoise,
  makeLimiter,
  buildVaultDoc,
  parseCoverage,
  indexTranscripts,
  discoverPerGalaxy,
} from "./mine-galaxy-transcripts.mjs";

// ---- registry completeness + integrity --------------------------------------

test("registry covers the 34 galaxies that carry brain files", () => {
  // WHY: the goal is "every galaxy/domain accounted for". If the registry drops a
  // galaxy, that galaxy's transcripts are never mined -> a silent coverage hole.
  // 34 is the live count of engine subdirs with MEMORY.md+CLAUDE.md (measured
  // 2026-06-09). Assert a floor so a real drop fails loud; growth is allowed.
  assert.ok(GALAXY_KEYS.length >= 34, `expected >=34 galaxies, got ${GALAXY_KEYS.length}`);
});

test("every galaxy key is unique (no dup -> no double-mining/clobber)", () => {
  assert.equal(new Set(GALAXY_KEYS).size, GALAXY_KEYS.length, "duplicate galaxy key in registry");
});

test("every registry entry has the required shape", () => {
  for (const g of GALAXY_REGISTRY) {
    assert.equal(typeof g.galaxy, "string", `galaxy key must be a string`);
    assert.ok(Array.isArray(g.slots) && g.slots.length > 0, `${g.galaxy}: slots[] required`);
    assert.ok(g.topic instanceof RegExp, `${g.galaxy}: topic must be a RegExp`);
    assert.ok(typeof g.vocab === "string" && g.vocab.length > 10, `${g.galaxy}: vocab phrase required`);
  }
});

test("the canonical slot->galaxy anchors are present (CHAT-SLOT-DOMAINS.md)", () => {
  // WHY: these are operator-canonical mappings; if any drifts out, the wrong slot's
  // transcripts feed the wrong brain. Spot-check the load-bearing ones.
  const want = { cam: "kilo", lathe: "whiskey", wedm: "mike", "speed-feed": "oscar", "ai-training": "india", "fleet-hygiene": "golf" };
  for (const [galaxy, slot] of Object.entries(want)) {
    const e = getGalaxy(galaxy);
    assert.ok(e, `galaxy ${galaxy} must exist`);
    assert.ok(e.slots.includes(slot), `${galaxy} must be owned by slot ${slot}, got ${e.slots}`);
  }
});

// ---- classifyHandoff ---------------------------------------------------------

test("classifyHandoff routes a CAM handoff to the cam galaxy", () => {
  const c = classifyHandoff("HANDOFF-claude-86373eb3-kilo-cad-fusion-live.md");
  assert.ok(c, "expected a classification");
  assert.equal(c.id, "86373eb3");
  assert.ok(c.galaxies.includes("cam"), `kilo handoff must route to cam, got ${c.galaxies}`);
});

test("classifyHandoff routes the india AI-systems precedent correctly", () => {
  // WHY: the india miner is the proven precedent this generalizes; a handoff that
  // india's INDIA_TOPIC_RE caught must still route to ai-training here.
  const c = classifyHandoff("HANDOFF-claude-a1b2c3d4-india-blackwell-ai-ms0.md");
  assert.ok(c.galaxies.includes("ai-training"), `india/blackwell handoff must route to ai-training, got ${c.galaxies}`);
});

test("classifyHandoff routes the hotel business precedent correctly", () => {
  const c = classifyHandoff("HANDOFF-claude-deadbeef-hotel-transcript-mine.md");
  assert.ok(c.galaxies.includes("business"), `hotel handoff must route to business, got ${c.galaxies}`);
});

test("classifyHandoff fans a cross-domain handoff to MULTIPLE galaxies", () => {
  // WHY: a session that did lora work under a system-viz topic legitimately feeds
  // BOTH ai-training and system-viz -- routing to one only would lose context.
  const c = classifyHandoff("HANDOFF-claude-11112222-lora-system-viz-bridge.md");
  assert.ok(c.galaxies.includes("ai-training"), `must include ai-training, got ${c.galaxies}`);
  assert.ok(c.galaxies.includes("system-viz"), `must include system-viz, got ${c.galaxies}`);
});

test("classifyHandoff returns null for a non-handoff or no-topic filename (failure mode)", () => {
  assert.equal(classifyHandoff("README.md"), null);
  assert.equal(classifyHandoff("random.txt"), null);
  // pid/session/timestamp forms carry NO topic -> honest drop (null), not a silent miss.
  assert.equal(classifyHandoff("HANDOFF-session-1777565602995.md"), null, "session-timestamp form has no topic");
  assert.equal(classifyHandoff("HANDOFF-Claude@MARKV_pid-10752.md"), null, "pid form has no topic");
});

test("classifyHandoff recovers the .archive.<date> suffix form (was silently dropped)", () => {
  // WHY: 526 handoffs use `<stem>.archive.2026-05-19` instead of `.md`; the old
  // `\.md$` anchor dropped them all -> a ~526-handoff coverage hole (R12).
  const c = classifyHandoff("HANDOFF-claude-00a9c6dc-cad-fusion-live-ms0.archive.2026-05-19");
  assert.ok(c, "archive-suffixed handoff must classify");
  assert.equal(c.id, "00a9c6dc");
  assert.equal(c.mineable, true, "it has a short-id -> mineable");
  assert.ok(c.galaxies.includes("cad-fusion-live"), `got ${c.galaxies}`);
});

test("classifyHandoff recovers the long full-UUID form", () => {
  const c = classifyHandoff("HANDOFF-claude-2570c8f5-c265-4815-ad1d-a3c4e3a5863b-backend-devtools-rgs.md");
  assert.ok(c, "long-uuid handoff must classify");
  assert.equal(c.id, "2570c8f5", "id is the 8-hex prefix of the uuid");
  assert.equal(c.mineable, true);
});

test("classifyHandoff recovers the Agent@HOST_<uuid> fleet form", () => {
  const c = classifyHandoff("HANDOFF-Agent@DESKTOP-N7MI1VB_010910ec-6505-447d-8181-3ed11f186fdb-blackwell-ai.md");
  assert.ok(c, "agent-fleet handoff must classify");
  assert.equal(c.id, "010910ec");
  assert.equal(c.mineable, true);
  assert.ok(c.galaxies.includes("ai-training"), `blackwell-ai must route to ai-training, got ${c.galaxies}`);
});

test("classifyHandoff classifies a slot-keyed handoff but marks it NOT mineable", () => {
  // WHY: HANDOFF-golf-<topic> carries a galaxy signal (golf->fleet-hygiene) for
  // COVERAGE accounting, but the session short-id is unknowable from the filename,
  // so the miner can't find a transcript -> mineable:false (honest, R12).
  const c = classifyHandoff("HANDOFF-golf-fleet-reaper.md");
  assert.ok(c, "slot-keyed handoff must classify for coverage");
  assert.equal(c.id, null, "no short-id in a slot-keyed filename");
  assert.equal(c.mineable, false, "slot-keyed -> classify-only, not mineable");
  assert.ok(c.galaxies.includes("fleet-hygiene"), `golf must route to fleet-hygiene, got ${c.galaxies}`);
});

test("classifyHandoff word-boundaries the slot name (no accidental substring match)", () => {
  // WHY: slot 'mike' must not match a topic merely CONTAINING 'mike' inside another
  // word. The owning-slot test uses (^|[-_])mike([-_]|$).
  const c = classifyHandoff("HANDOFF-claude-99998888-mikeology-notes.md");
  // 'mikeology' should NOT trigger the mike->wedm slot match.
  assert.ok(!c.galaxies.includes("wedm") || GALAXY_REGISTRY.find((g) => g.galaxy === "wedm").topic.test("mikeology-notes"),
    "mikeology must not slot-match mike unless a topic keyword independently matches");
});

// ---- extractSlotHint + classifyTranscriptContent (content discovery) ---------

test("extractSlotHint reads the git-branch and cwd slot signals", () => {
  // WHY: content discovery (user directive: read transcripts not handoffs) needs
  // the slot from the transcript's OWN content -- the git branch slot/<name> or the
  // cwd H--prism-slot-<name> are the strong internal signals that survive in the
  // transcript even when the handoff is a stub.
  assert.equal(extractSlotHint("on branch slot/bravo ahead of origin"), "bravo");
  assert.equal(extractSlotHint("cwd: C:/Users/x/.claude/projects/H--prism-slot-foxtrot"), "foxtrot");
  assert.equal(extractSlotHint("working in H--prism-slot-kilo transcript"), "kilo");
  assert.equal(extractSlotHint("no slot signal here"), null);
  assert.equal(extractSlotHint(null), null);
});

test("classifyTranscriptContent routes by topic-keyword density in the spine", () => {
  // WHY: a transcript that talks about wire EDM + skim passes must route to wedm
  // even with NO slot hint and NO handoff -- the content IS the signal.
  const spine = "[assistant] Building the wedm multi-pass skim strategy. The wire-break prediction and flush adequacy gate. EDM tech tables.";
  const { galaxies } = classifyTranscriptContent(spine, { minScore: 1 });
  const top = galaxies.map((g) => g.galaxy);
  assert.ok(top.includes("wedm"), `wedm must be classified from content, got ${top}`);
});

test("classifyTranscriptContent gives the slot's galaxies a strong base score", () => {
  // WHY: even a spine with weak topic signal still routes to the slot-owner's galaxy
  // because that slot demonstrably ran the session.
  const spine = "[assistant] worked on some stuff today, nothing specific to report.";
  const { galaxies } = classifyTranscriptContent(spine, { slotHint: "whiskey", minScore: 2 });
  assert.ok(galaxies.some((g) => g.galaxy === "lathe"), `whiskey-slot session must route to lathe, got ${galaxies.map((g) => g.galaxy)}`);
});

test("classifyTranscriptContent excludes a galaxy below minScore (no false synthesis)", () => {
  // WHY: a transcript that merely MENTIONS 'cam' once in passing must not get a full
  // cam synthesis written. minScore gates one-off mentions out.
  const spine = "[user] btw the cam software was mentioned once.";
  const { galaxies } = classifyTranscriptContent(spine, { minScore: 2 });
  // a single weak match (score 1) is below minScore 2 -> excluded
  assert.ok(!galaxies.some((g) => g.galaxy === "cam" && g.score < 2), "a one-off mention must not clear minScore 2");
});

test("classifyTranscriptContent caps keyword spam so one repeated word != huge score", () => {
  // WHY: a transcript that says 'mill' 500 times should not score 500 -- the cap (5)
  // keeps a single keyword from dominating; real classification needs breadth.
  const spine = ("[assistant] mill " .repeat(500));
  const { galaxies } = classifyTranscriptContent(spine, { minScore: 1 });
  const millEntry = galaxies.find((g) => g.galaxy === "mill");
  assert.ok(millEntry, "mill should classify");
  assert.ok(millEntry.score <= 8, `mill score must be capped (topic<=5 + no slot), got ${millEntry.score}`);
});

// ---- isNoise (spine filter) --------------------------------------------------

test("isNoise drops harness boilerplate but keeps real prose", () => {
  assert.equal(isNoise("<system-reminder>blah</system-reminder>"), true);
  assert.equal(isNoise("UserPromptSubmit hook additional context: ..."), true);
  assert.equal(isNoise("# claudeMd\nrules"), true);
  assert.equal(isNoise(""), true);
  assert.equal(isNoise(null), true);
  // real conversation that MENTIONS a phrase mid-text is kept (anchored prefix, not includes)
  assert.equal(isNoise("I'll route this through the UserPromptSubmit hook later."), false);
  assert.equal(isNoise("Built the cam strategy recommender."), false);
});

// ---- makeLimiter -------------------------------------------------------------

test("makeLimiter caps concurrency and still runs everything (FIFO)", async () => {
  const limit = makeLimiter(2);
  let active = 0, peak = 0;
  const order = [];
  const task = (n) => async () => {
    active++; peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 5));
    order.push(n); active--;
    return n;
  };
  const results = await Promise.all([1, 2, 3, 4, 5].map((n) => limit(task(n))));
  assert.deepEqual(results, [1, 2, 3, 4, 5], "all tasks resolve with their value");
  assert.ok(peak <= 2, `peak concurrency must be <=2, was ${peak}`);
  assert.equal(order.length, 5, "every task ran");
});

// ---- buildVaultDoc + parseCoverage ------------------------------------------

test("buildVaultDoc emits galaxy-tagged frontmatter the synthesis-refresh reads", () => {
  // WHY: galaxy-synthesis-refresh clusters knowledge/memories/* per galaxy; the
  // galaxy: <key> frontmatter + coverage_sessions are the contract that makes the
  // mined memory discoverable + the shrink-guard honest.
  const doc = buildVaultDoc("cam", "## What this galaxy is building\n- CAM strategy", 7, 12, "2026-06-09");
  assert.match(doc, /name: reference_cam_transcript_synthesis/);
  assert.match(doc, /galaxy: cam/);
  assert.match(doc, /coverage_sessions: 7/);
  assert.match(doc, /mineable_sessions: 12/);
  assert.match(doc, /## What this galaxy is building/);
});

test("parseCoverage reads coverage_sessions back (shrink-guard input)", () => {
  const doc = buildVaultDoc("mill", "body text here", 9, 20, "2026-06-09");
  assert.equal(parseCoverage(doc), 9);
  assert.equal(parseCoverage("no frontmatter"), 0);
  assert.equal(parseCoverage(null), 0);
});

// ---- indexTranscripts + discoverPerGalaxy (injected readers, no live FS) -----

test("indexTranscripts dedups by id (first dir wins) and honors SINCE", () => {
  const stat = (p) => ({
    mtime: { toISOString: () => (p.includes("old") ? "2026-04-01T00:00:00Z" : "2026-06-01T00:00:00Z") },
    size: 1048576,
  });
  const readdir = (dir) => dir.endsWith("H--prism")
    ? ["aaaaaaaa-x.jsonl", "old0bbbb-y.jsonl"]      // old0bbbb predates SINCE -> excluded
    : ["aaaaaaaa-dup.jsonl", "cccccccc-z.jsonl"];   // aaaaaaaa dup -> first-dir wins
  const idx = indexTranscripts({
    projectDirs: ["/p/H--prism", "/p/H--"], since: "2026-05-01",
    statImpl: stat, readdirImpl: readdir, existsImpl: () => true,
  });
  assert.ok(idx.has("aaaaaaaa"), "aaaaaaaa present");
  assert.ok(idx.get("aaaaaaaa").file.includes("H--prism"), "first dir (H--prism) wins the dedup");
  assert.ok(idx.has("cccccccc"), "cccccccc present");
  assert.ok(!idx.has("old0bbbb"), "pre-SINCE transcript excluded");
});

test("discoverPerGalaxy routes handoffs to galaxies + counts unclassified honestly", () => {
  // Injected: a transcript index + two handoffs, one classifiable, one not.
  const transcripts = new Map([
    ["86373eb3", { id: "86373eb3", file: "/p/86373eb3.jsonl", mb: 4.2, mtime: "2026-06-09" }],
    ["a1b2c3d4", { id: "a1b2c3d4", file: "/p/a1b2c3d4.jsonl", mb: 9.1, mtime: "2026-06-08" }],
  ]);
  const readdir = () => [
    "HANDOFF-claude-86373eb3-kilo-cad-fusion-live.md",   // -> cam (+cad-fusion-live)
    "HANDOFF-claude-a1b2c3d4-india-blackwell-ai-ms0.md", // -> ai-training
    "HANDOFF-claude-feedfeed-zzzznomatch-xyzzy.md",       // -> NO galaxy (unclassified)
  ];
  const { perGalaxy, unclassified, totalHandoffs } = discoverPerGalaxy({
    handoffDirs: ["/h"], transcripts, readdirImpl: readdir, existsImpl: () => true,
  });
  assert.equal(totalHandoffs, 3);
  assert.equal(unclassified, 1, "the zzzznomatch handoff matched no galaxy");
  assert.equal(perGalaxy.get("cam").length, 1, "cam got the kilo session");
  assert.equal(perGalaxy.get("cam")[0].id, "86373eb3");
  assert.equal(perGalaxy.get("ai-training").length, 1, "ai-training got the india session");
});

test("discoverPerGalaxy splits preSince from missingFile (P1-C honesty)", () => {
  // WHY: a handoff whose transcript EXISTS on disk but predates SINCE must be
  // counted as preSince (re-includable via --since), NOT lumped with a genuinely
  // missing transcript -- else the operator can't see recoverable older context.
  const transcripts = new Map(); // nothing in-window
  // simulate indexTranscripts having seen one pre-SINCE id on disk
  Object.defineProperty(transcripts, "preSince", { value: new Set(["86373eb3"]), enumerable: false });
  const readdir = () => [
    "HANDOFF-claude-86373eb3-kilo-cam-work.md",   // id known, transcript pre-SINCE (on disk) -> preSince
    "HANDOFF-claude-deadbeef-kilo-cam-other.md",  // id known, transcript truly absent -> missingFile
  ];
  const r = discoverPerGalaxy({ handoffDirs: ["/h"], transcripts, readdirImpl: readdir, existsImpl: () => true });
  assert.equal(r.preSince, 1, "the on-disk pre-SINCE handoff counts as preSince");
  assert.equal(r.missingFile, 1, "the truly-absent handoff counts as missingFile");
  assert.equal(r.perGalaxy.get("cam").length, 0, "neither is mineable in-window");
});

test("discoverPerGalaxy mines each session once per galaxy even if 2 handoffs match", () => {
  // WHY: the same session can have an active + archived handoff (both match); the
  // galaxy must not mine it twice (wasted GPU + dup digest).
  const transcripts = new Map([["86373eb3", { id: "86373eb3", file: "/p/x.jsonl", mb: 1, mtime: "2026-06-09" }]]);
  const readdir = (dir) => dir === "/active"
    ? ["HANDOFF-claude-86373eb3-kilo-cam-work.md"]
    : ["HANDOFF-claude-86373eb3-kilo-cam-work.md"]; // same id in archive
  const { perGalaxy } = discoverPerGalaxy({
    handoffDirs: ["/active", "/archive"], transcripts, readdirImpl: readdir, existsImpl: () => true,
  });
  assert.equal(perGalaxy.get("cam").length, 1, "session mined once per galaxy despite 2 matching handoffs");
});
