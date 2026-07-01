#!/usr/bin/env python3
"""Unit test for parse_holder_segments in jm-csv-to-fusion-tools.py (slot:romeo, FUSION holder libs).
Run: python scripts/test_jm_holder_segments.py   (exit 0 = pass, 1 = fail). No pytest dependency.

R9: every assertion encodes WHY the holder geometry matters. UNITS-FIRST: values are INCHES, verbatim,
NEVER scaled (a 25.4x error would put a 2in holder at 50in -> false collisions everywhere)."""
import importlib.util
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "jm_csv_to_fusion_tools", os.path.join(_HERE, "jm-csv-to-fusion-tools.py"))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
parse = _mod.parse_holder_segments

failures = []


def check(name, cond):
    if not cond:
        failures.append(name)
        print("  FAIL: " + name)
    else:
        print("  ok:   " + name)


# 1. HAPPY PATH -- the real BIG DAISHOWA ER-32-4NL profile from LTH-01 FUSION-IMPORT.csv.
real = "H1.188980 U1.988190 L1.988190; H1.950790 U1.750000 L1.750000; H0.710630 U2.403310 L2.403310"
segs = parse(real)
check("happy: 3 segments parsed", len(segs) == 3)
check("happy: H->height, U->upper, L->lower (segment 0)",
      segs[0] == {"upper-diameter": 1.98819, "lower-diameter": 1.98819, "height": 1.18898})
check("happy: order preserved verbatim (segment 2 base dia 2.40331)", segs[2]["upper-diameter"] == 2.40331)
# UNITS: value copied verbatim, NOT scaled by 25.4 (would be ~50.5)
check("units: inch value verbatim, no 25.4x scaling", abs(segs[0]["upper-diameter"] - 1.98819) < 1e-9)

# 2. EMPTY / MISSING -- must yield [] so the caller OMITS the key (no empty holder body).
check("empty string -> []", parse("") == [])
check("whitespace -> []", parse("   ") == [])
check("None -> []", parse(None) == [])

# 3. MALFORMED -- no H/U/L tokens -> skipped, not crashed.
check("garbage -> []", parse("not a segment; foo bar") == [])
check("partial token (missing L) -> skipped", parse("H1.0 U2.0") == [])

# 4. MIXED valid + invalid -> keep only the valid segments (resilient, no whole-string loss).
mixed = parse("H1.0 U2.0 L2.0; garbage; H0.5 U3.0 L3.0")
check("mixed: 2 valid kept", len(mixed) == 2)

# 5. ADVERSARIAL -- degenerate geometry rejected (0 / negative diameters are not a real holder body).
check("zero height rejected", parse("H0 U2 L2") == [])
check("negative diameter rejected", parse("H1 U-2 L2") == [])
check("trailing semicolon + extra spaces tolerated",
      len(parse("  H1.0 U2.0 L2.0 ;  ")) == 1)
# 6. case-insensitive tokens (Fusion sometimes lowercases)
check("lowercase h/u/l parsed", len(parse("h1.0 u2.0 l2.0")) == 1)
# 7. integer-only tokens accepted (robustness; live data is decimal but Fusion may emit integers)
check("integer-only segment accepted", parse("H1 U2 L2") == [{"upper-diameter": 2.0, "lower-diameter": 2.0, "height": 1.0}])

# 8. _build_holder contract (both scrutiny arms flagged this as the load-bearing anti-fabrication path):
#    no real segments -> NO "segments" key (never an empty/placeholder body); metadata always preserved.
build = _mod._build_holder
km = {"holder_description": 0, "holder_productId": 1, "holder_vendor": 2,
      "holder_productLink": 3, "holder_segments": 4}
no_seg = build(["BIG KAISER ER-16", "ER16-X", "BIG KAISER", "", ""], km)
check("build: metadata preserved (description)", no_seg["description"] == "BIG KAISER ER-16")
check("build: metadata preserved (vendor)", no_seg["vendor"] == "BIG KAISER")
check("build: NO segments key when source empty (anti-fabrication)", "segments" not in no_seg)
with_seg = build(["BIG DAISHOWA ER-32", "", "BIG DAISHOWA", "", "H1.0 U2.0 L2.0"], km)
check("build: segments emitted when real geometry present", with_seg.get("segments") == [
      {"upper-diameter": 2.0, "lower-diameter": 2.0, "height": 1.0}])
check("build: degenerate-only source -> NO segments key (omit, not empty list)",
      "segments" not in build(["X", "", "V", "", "H0 U0 L0"], km))

if failures:
    print("\n" + str(len(failures)) + " FAILURE(S): " + str(failures))
    sys.exit(1)
print("\nALL PASS")
sys.exit(0)
