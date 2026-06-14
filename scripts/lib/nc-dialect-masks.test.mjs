// nc-dialect-masks.test.mjs — real-behavior tests for per-dialect volatile masks + round-trip classifier.
// Run: node --test scripts/lib/nc-dialect-masks.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { DIALECT_MASKS, maskFor, detectDialect, roundTrip, normalizeNC } from "./nc-dialect-masks.mjs";

// ─── detectDialect (real header fixtures, copied from JM golden files) ────────

test("detectDialect identifies each controller dialect from real headers", () => {
  assert.equal(detectDialect("(=== PRISM JM-Die Lathe Upgrade v2.0.0 ===)\n(  source: H:\\PRISM\\x.nc)\n(  partNumber: 1234)"), "prism");
  assert.equal(detectDialect("(PROGRAM NAME - 9007405)\n(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)\n(MCX FILE - C:\\X.MCX-8)"), "mastercam");
  assert.equal(detectDialect("%\nL001\n(03/07/22)\n\nH175 = 0.0000\nN5 G90\nN10 M91 (Adaptive Control Off)"), "mitsubishi-edm");
  assert.equal(detectDialect("%\nO1001\n(T7 D=0.25 CR=0.01)\nG40"), "hurco");
  assert.equal(detectDialect("just some text"), "unknown");
});

test("maskFor returns the dialect set; unknown FAILS CLOSED (masks nothing)", () => {
  assert.equal(maskFor("mastercam").length, DIALECT_MASKS.mastercam.length);
  assert.equal(maskFor("hurco").length, 0); // Hurco PRISM v11 header has no volatiles
  assert.equal(maskFor("nonexistent").length, 0); // fail-closed: an unsure dialect masks NOTHING
  // each entry is compareNC-compatible {pattern, replacement, flags}
  for (const m of maskFor("mastercam")) {
    assert.equal(typeof m.pattern, "string");
    assert.equal(typeof m.replacement, "string");
  }
});

// ─── ADVERSARIAL fail-OPEN probes (the test gap that let the P0 through) ──────

test("FAIL-CLOSED: a semantic token sharing a volatile paren is NOT masked → drift surfaces", () => {
  // "(DATE=... SETUP=A)" — the SETUP token must NOT be eaten by the date mask; the difference must surface.
  const a = "%\nO1\n(DATE=DD-MM-YY - 16-11-21 SETUP=A)\nG0 X1\nM30\n%";
  const b = "%\nO1\n(DATE=DD-MM-YY - 02-06-26 SETUP=B)\nG0 X1\nM30\n%";
  assert.equal(roundTrip(a, b, { dialect: "mastercam" }).classification, "semantic-drift");
});

test("FAIL-CLOSED: a bare (paren-less) DATE= token is NOT masked (no over-reach onto macro/var lines)", () => {
  const a = "%\nO1\n#100=DATE=5\nG0 X1\nM30\n%";
  const b = "%\nO1\n#100=DATE=9\nG0 X1\nM30\n%"; // a different parameter value
  assert.equal(roundTrip(a, b, { dialect: "mastercam" }).classification, "semantic-drift");
});

test("FAIL-CLOSED: an appended token in an (NC FILE - ...) paren is NOT masked", () => {
  const a = "%\nO1\n(NC FILE - C:\\A\\x.NC TOOL=T1)\nG0 X1\nM30\n%";
  const b = "%\nO1\n(NC FILE - C:\\B\\x.NC TOOL=T9)\nG0 X1\nM30\n%"; // tool number differs
  assert.equal(roundTrip(a, b, { dialect: "mastercam" }).classification, "semantic-drift");
});

test("Mitsubishi paren-date collapse applies ONLY to the mitsubishi-edm dialect (not mastercam)", () => {
  const a = "%\nO1\n(10/24/00)\nG0 X1\nM30\n%";
  const b = "%\nO1\n(99/24/00)\nG0 X1\nM30\n%";
  // mastercam mask has no date-collapse → the paren-triples differ → semantic-drift
  assert.equal(roundTrip(a, b, { dialect: "mastercam" }).classification, "semantic-drift");
  // mitsubishi-edm intentionally treats a bare paren-date as volatile churn
  assert.equal(roundTrip(a, b, { dialect: "mitsubishi-edm" }).classification, "volatile-header-only");
});

// ─── SAFETY: a mask must NEVER alter semantic G-code (the load-bearing invariant) ──

test("SAFETY: masks leave a clean G-code body byte-identical (no over-masking of motion/tool/material)", () => {
  const body = "%\nO1234\nG90 G54\n(T1 D=0.25 - SPOT)\nT1 M6\nG0 X1.5 Y-0.5\nG1 Z-0.25 F10.0\nX3.07 Y0.22\nM30\n%";
  for (const dialect of ["mastercam", "okuma-osp", "mitsubishi-edm", "prism", "hurco", "unknown"]) {
    const masked = normalizeNC(body, { volatileCommentMask: maskFor(dialect) });
    assert.equal(masked, normalizeNC(body), `mask '${dialect}' must not change semantic content`);
  }
});

test("SAFETY: coordinates that look date-ish are NOT masked (no false date match)", () => {
  // X03 Y07 Z22 has digits but no parens/slashes → the Mitsubishi paren-date pattern must not touch it
  const body = "N5 G1 X03.0 Y07.0 Z22.0 F10";
  assert.equal(normalizeNC(body, { volatileCommentMask: maskFor("mitsubishi-edm") }), normalizeNC(body));
});

// ─── roundTrip classifier ────────────────────────────────────────────────────

const G_MASTERCAM = (date, file, x) =>
  `%\nO1234\n(PROGRAM NAME - 9007405)\n(DATE=DD-MM-YY - ${date} TIME=HH:MM - 16:40)\n(NC FILE - C:\\${file}\\9007405.MIN)\n(MATERIAL - STEEL INCH - 1030 - 200 BHN)\nG0 X${x} Z30.\nM30\n%`;

test("roundTrip: header-only churn (date + path) → volatile-header-only (SAFE)", () => {
  const golden = G_MASTERCAM("16-11-21", "USERS\\A", "20.");
  const resave = G_MASTERCAM("02-06-26", "USERS\\B", "20."); // only DATE + path changed
  const r = roundTrip(golden, resave, { dialect: "mastercam" });
  assert.equal(r.classification, "volatile-header-only");
  assert.equal(r.safe, true);
  assert.equal(r.rawEqual, false); // raw differs (headers)
  assert.equal(r.maskedEqual, true); // masked is equal (same program)
});

test("roundTrip: a real coordinate change → semantic-drift (NOT safe) with firstDiff", () => {
  const golden = G_MASTERCAM("16-11-21", "USERS\\A", "20.");
  const drift = G_MASTERCAM("02-06-26", "USERS\\B", "99."); // X20.→X99. = semantic
  const r = roundTrip(golden, drift, { dialect: "mastercam" });
  assert.equal(r.classification, "semantic-drift");
  assert.equal(r.safe, false);
  assert.ok(r.firstDiff, "semantic drift must surface the offending line");
  assert.match(r.firstDiff.a + r.firstDiff.b, /X20\.|X99\./);
});

test("roundTrip: identical programs → byte-identical", () => {
  const g = G_MASTERCAM("16-11-21", "USERS\\A", "20.");
  const r = roundTrip(g, g, { dialect: "mastercam" });
  assert.equal(r.classification, "byte-identical");
  assert.equal(r.safe, true);
});

test("roundTrip: auto-detects dialect from the golden header when not supplied", () => {
  const golden = G_MASTERCAM("16-11-21", "USERS\\A", "20.");
  const resave = G_MASTERCAM("02-06-26", "USERS\\B", "20.");
  const r = roundTrip(golden, resave); // no dialect → detect → mastercam
  assert.equal(r.dialect, "mastercam");
  assert.equal(r.safe, true);
});

test("roundTrip: Mitsubishi EDM bare paren-date churn is volatile-only; offset change is semantic", () => {
  const base = (date, h1) => `%\nL001\n(${date})\n\nH175 = 0.0000\nH1 =${h1} + H175\nN5 G90\nN10 M91 (Adaptive Control Off)\nM30`;
  const churn = roundTrip(base("03/07/22", ".0085"), base("02/06/26", ".0085"), { dialect: "mitsubishi-edm" });
  assert.equal(churn.classification, "volatile-header-only", "only the date changed");
  const semantic = roundTrip(base("03/07/22", ".0085"), base("03/07/22", ".0099"), { dialect: "mitsubishi-edm" });
  assert.equal(semantic.classification, "semantic-drift", "an offset value (H1) change is semantic");
});

test("roundTrip: PRISM_UPGRADED source-path churn is volatile-only", () => {
  const g = (src) => `(=== PRISM JM-Die Lathe Upgrade v2.0.0 ===)\n(  source: ${src})\n(  partNumber: 1234)\nG0 X20. Z30.\nM30`;
  const r = roundTrip(g("H:\\A\\1234.nc"), g("H:\\B\\1234.nc"), { dialect: "prism" });
  assert.equal(r.classification, "volatile-header-only");
});

// ─── Okuma OSP native dialect (U-CIMCO-DRIFT-GROUPING-FIX, recon-derived 2026-06-03) ──

test("detectDialect identifies native Okuma OSP from $NAME.MIN% / DEF WORK / CALL OBAR", () => {
  // Family A: native OSP with the program-name echo header (real JM golden shape).
  assert.equal(detectDialect("$CASEWSR.MIN%\nM1\nNBAR\nDEF WORK\nPS LC,[-400,0],[400,19]\n/CALL OBAR\nNAT01\nG0 X20 Z20"), "okuma-osp");
  // KOMAR variant: no $..% line, but the OSP common-call block is the signal.
  assert.equal(detectDialect("G50 S1000\nNSTRT\n/CALL OBAR\nNAT01\nG0 X20 Z20\nT010101"), "okuma-osp");
});

test("detectDialect does NOT misroute a Mastercam-posted .MIN to okuma-osp (Family B → mastercam)", () => {
  // Family B: Mastercam-posted Okuma .MIN — must stay mastercam (it has the date/file masks).
  const fb = "G140\nNSTRT\n(PROGRAM NAME - 9007405)\n(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)\n(MCX FILE - C:\\X.MCX-8)\n/CALL OBAR";
  assert.equal(detectDialect(fb), "mastercam");
});

test("maskFor okuma-osp includes the $NAME.MIN% program-name mask", () => {
  assert.equal(maskFor("okuma-osp").length, DIALECT_MASKS["okuma-osp"].length);
  assert.ok(maskFor("okuma-osp").length >= 4);
});

const G_OSP = (name, x) => `$${name}.MIN%\nM1\nNBAR\nDEF WORK\nPS LC,[-400,0],[400,19]\nEND\nDRAW\n/CALL OBAR\nNAT01 (OD RGH)\nT010101\nG0 X${x} Z20\nG50 S800\nM30`;

test("roundTrip: two OSP copies differing ONLY in the $NAME.MIN% echo → volatile-header-only (the core fix)", () => {
  // The real WSR/CASE1250.MIN vs THOMASON/CASE1250-618.MIN case: same program, only line 1 ($NAME) differs.
  const r = roundTrip(G_OSP("CASEWSR", "20"), G_OSP("CASE1250-618", "20")); // auto-detect → okuma-osp
  assert.equal(r.dialect, "okuma-osp");
  assert.equal(r.classification, "volatile-header-only");
  assert.equal(r.safe, true);
  assert.equal(r.rawEqual, false); // line 1 differs raw
});

test("roundTrip: an OSP body change (real motion) is still semantic-drift, NOT masked away", () => {
  const r = roundTrip(G_OSP("CASEWSR", "20"), G_OSP("CASEWSR", "99")); // X20→X99 = real geometry change
  assert.equal(r.classification, "semantic-drift");
  assert.equal(r.safe, false);
});

test("SAFETY: the okuma-osp mask never alters a real OSP G-code body (only the $NAME.MIN% line)", () => {
  // A clean OSP body with NO program-name line must be byte-identical after masking.
  const body = "M1\nNBAR\nDEF WORK\nNAT01\nT010101\nG0 X1.1534 Z.1641\nG50 S1500\nG96 S1500 M3\nG99 G1 Z.1141 F.008\nM30";
  assert.equal(normalizeNC(body, { volatileCommentMask: maskFor("okuma-osp") }), normalizeNC(body));
});
