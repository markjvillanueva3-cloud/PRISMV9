#!/usr/bin/env python
# scripts/lib/synthetic-print-gen.py
#
# U-PSGB-XRAY-CLOSED-LOOP — synthetic dimensioned-drawing generator for the OCR
# closed loop. Draws a clean engineering-style print (part outline + linear
# dimensions + hole diameter callouts + title block) with PERFECT, KNOWN ground
# truth, then emits the PNG plus a <png>.truth.json sidecar listing the true dims
# in mm (the pipeline's canonical unit). This is the gold-standard OCR training
# bootstrap: clean image + known labels → OCR → score → feedback, with none of the
# real-corpus scan-noise / sparse-CAD problems.
#
# JM convention is INCH: dimension TEXT is rendered in inches (e.g. 2.500, Ø.375),
# truth nominal_mm = inches * 25.4 so it lines up with the code-side inch->mm
# conversion the extractor does (run with --assume-units in).
#
# USAGE: python synthetic-print-gen.py --out <png> --seed <int> [--units in|mm]
# Deterministic given --seed (reproducible test cases + regression corpus).
import argparse, json, random, sys
from PIL import Image, ImageDraw, ImageFont

MM_PER_IN = 25.4
W, H = 1100, 850          # canvas (landscape, drawing-like)

def _font(size):
    for name in ("arial.ttf", "Arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

def _arrow(d, x1, y1, x2, y2):
    """Dimension line with simple arrowheads at both ends."""
    d.line((x1, y1, x2, y2), fill="black", width=2)
    a = 7
    if y1 == y2:  # horizontal
        d.polygon([(x1, y1), (x1 + a, y1 - 4), (x1 + a, y1 + 4)], fill="black")
        d.polygon([(x2, y2), (x2 - a, y2 - 4), (x2 - a, y2 + 4)], fill="black")
    else:         # vertical
        d.polygon([(x1, y1), (x1 - 4, y1 + a), (x1 + 4, y1 + a)], fill="black")
        d.polygon([(x2, y2), (x2 - 4, y2 - a), (x2 + 4, y2 - a)], fill="black")

def _fmt_in(v):
    """Inch dimension text: leading-zero-stripped to mimic drawing convention (.375)."""
    s = f"{v:.3f}".rstrip("0").rstrip(".")
    if s.startswith("0."):
        s = s[1:]
    return s

def generate(seed, units="in", difficulty="easy"):
    hard = difficulty == "hard"
    rng = random.Random(seed)
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    # hard mode: half the linear dims carry a bilateral tolerance suffix (real-print
    # clutter the OCR must read past to recover the nominal). Truth records ONLY the
    # nominal — tolerance is a distractor, not a scored value.
    def tol():
        return (f" ±{_fmt_in(rng.choice([0.001, 0.002, 0.005]))}" if hard and rng.random() < 0.6 else "")
    f_dim, f_tb = _font(26), _font(20)
    # border
    d.rectangle((20, 20, W - 20, H - 20), outline="black", width=2)

    # part outline (rectangle), sized in inches, placed centrally
    width_in = round(rng.uniform(1.0, 6.0), 3)
    height_in = round(rng.uniform(1.0, 4.0), 3)
    px_per_in = min(520 / width_in, 320 / height_in)   # fit the drawing area
    pw, ph = int(width_in * px_per_in), int(height_in * px_per_in)
    ox, oy = 300, 230
    d.rectangle((ox, oy, ox + pw, oy + ph), outline="black", width=3)

    dims = [
        {"type": "linear", "nominal_mm": round(width_in * MM_PER_IN, 4)},
        {"type": "linear", "nominal_mm": round(height_in * MM_PER_IN, 4)},
    ]
    # width dimension (below the part)
    dy = oy + ph + 55
    d.line((ox, oy + ph + 8, ox, dy + 8), fill="black", width=1)        # extension lines
    d.line((ox + pw, oy + ph + 8, ox + pw, dy + 8), fill="black", width=1)
    _arrow(d, ox, dy, ox + pw, dy)
    d.text((ox + pw / 2 - 24, dy - 32), _fmt_in(width_in) + tol(), fill="black", font=f_dim)
    # height dimension (left of the part)
    dx = ox - 55
    d.line((ox - 8, oy, dx - 8, oy), fill="black", width=1)
    d.line((ox - 8, oy + ph, dx - 8, oy + ph), fill="black", width=1)
    _arrow(d, dx, oy, dx, oy + ph)
    d.text((dx - 52, oy + ph / 2 - 12), _fmt_in(height_in) + tol(), fill="black", font=f_dim)

    # holes with diameter callouts (denser in hard mode)
    n_holes = rng.randint(2, 3) if hard else rng.randint(1, 2)
    for k in range(n_holes):
        dia_in = round(rng.uniform(0.125, 0.75), 3)
        hx = ox + int(pw * (0.3 + 0.4 * k)) + rng.randint(-15, 15)
        hy = oy + ph // 2
        r = max(6, int(dia_in * px_per_in / 2))
        d.ellipse((hx - r, hy - r, hx + r, hy + r), outline="black", width=2)
        # leader + Ø callout
        lx, ly = hx + r + 30, hy - 40 - k * 34
        d.line((hx + int(r * 0.7), hy - int(r * 0.7), lx, ly), fill="black", width=1)
        d.text((lx, ly - 12), "Ø" + _fmt_in(dia_in), fill="black", font=f_dim)
        dims.append({"type": "diameter", "nominal_mm": round(dia_in * MM_PER_IN, 4)})

    # radius (filleted top-right corner) — LENGTH type. Overlaps diameter/linear in magnitude,
    # so it exercises the type-aware scorer's separation (a radius must not match a linear/diameter
    # of equal mm value).
    rad_in = round(rng.uniform(0.06, 0.5), 3)
    rr = max(8, int(rad_in * px_per_in))
    d.arc((ox + pw - rr, oy, ox + pw + rr, oy + 2 * rr), 180, 270, fill="black", width=2)
    d.text((ox + pw + 14, oy + 6), "R" + _fmt_in(rad_in) + tol(), fill="black", font=f_dim)
    dims.append({"type": "radius", "nominal_mm": round(rad_in * MM_PER_IN, 4)})

    # chamfer (bottom-right corner) — LENGTH type (the chamfer size); the 45deg is conventional.
    ch_in = round(rng.uniform(0.03, 0.25), 3)
    cc = max(8, int(ch_in * px_per_in))
    d.line((ox + pw - cc, oy + ph, ox + pw, oy + ph - cc), fill="black", width=2)
    d.text((ox + pw + 10, oy + ph - 18), _fmt_in(ch_in) + " x 45" + chr(176), fill="black", font=f_dim)
    dims.append({"type": "chamfer", "nominal_mm": round(ch_in * MM_PER_IN, 4)})

    # angular dimension — DEGREES, NOT a length: nominal_deg holds the angle, nominal_mm is null
    # so the (length) scorer correctly DROPS it. Type-aware matching guarantees an angle never
    # cross-matches a linear mm of equal magnitude. Present for the VLM to read + a future
    # angular-aware scorer.
    ang_deg = rng.choice([15, 30, 45, 60, 90, 120])
    d.line((ox + 36, oy + ph - 6, ox + 116, oy + ph - 66), fill="black", width=2)  # an angled edge
    d.text((ox + 58, oy + ph - 44), f"{ang_deg}" + chr(176), fill="black", font=f_dim)
    dims.append({"type": "angular", "nominal_deg": ang_deg, "nominal_mm": None})

    # GD&T feature control frame — ASCII-safe (Arial lacks GD&T glyphs). The tolerance is a LENGTH
    # (x25.4). Recorded in truth.gdt[]; the dimension scorer does NOT grade GD&T (orthogonal — for
    # OCR-reading coverage + a future GD&T scorer).
    gsym = rng.choice(["POS", "FLAT", "PERP", "PARA", "TP"])
    gtol_in = rng.choice([0.001, 0.002, 0.005, 0.010])
    gdatums = rng.choice([["A"], ["A", "B"], ["A", "B", "C"]])
    fcf = f"[{gsym}] {_fmt_in(gtol_in)} (M) {'-'.join(gdatums)}"
    d.text((ox, oy - 40), fcf, fill="black", font=f_tb)
    gdt = [{"symbol": gsym, "tolerance_mm": round(gtol_in * MM_PER_IN, 4), "datum_refs": gdatums, "raw_text": fcf}]

    # title block (bottom-right)
    pn = f"{rng.randint(1000, 99999)}-{rng.randint(10, 99)}"
    mat = rng.choice(["1018 STEEL", "6061-T6 AL", "A2 TOOL STEEL", "303 SS", "C-D60"])
    tb_x, tb_y = W - 320, H - 130
    d.rectangle((tb_x, tb_y, W - 25, H - 25), outline="black", width=2)
    d.text((tb_x + 10, tb_y + 10), f"PN: {pn}", fill="black", font=f_tb)
    d.text((tb_x + 10, tb_y + 40), f"MATL: {mat}", fill="black", font=f_tb)
    d.text((tb_x + 10, tb_y + 70), "UNITS: INCH", fill="black", font=f_tb)

    # hard mode: approximate a scanned/photocopied print so the loop is a REAL
    # OCR gradient (clean-mode scores ~100% on any competent VLM and gives no signal).
    # Slight rotation + gaussian blur + salt speckle degrade legibility the way a
    # bed scan does — the truth dims are unchanged; only the rendering is harder.
    if hard:
        from PIL import ImageFilter
        img = img.rotate(rng.uniform(-2.5, 2.5), fillcolor="white", expand=False)
        img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0.5, 1.2)))
        sp = ImageDraw.Draw(img)
        for _ in range(rng.randint(250, 700)):
            g = rng.randint(0, 130)
            sp.point((rng.randint(0, W - 1), rng.randint(0, H - 1)), fill=(g, g, g))

    truth = {"seed": seed, "units": "in", "difficulty": difficulty,
             "title_block": {"part_number": pn, "material": mat},
             "dimensions": dims, "n_dims": len(dims), "gdt": gdt,
             # length dims are the scoreable set (scoreDimensionSet grades nominal_mm by type);
             # angular (nominal_deg) + gdt are present for OCR-reading coverage, not length-graded.
             "n_length_dims": sum(1 for x in dims if x.get("nominal_mm") is not None)}
    return img, truth

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, required=True)
    ap.add_argument("--units", default="in")
    ap.add_argument("--difficulty", default="easy", choices=["easy", "hard"])
    a = ap.parse_args()
    img, truth = generate(a.seed, a.units, a.difficulty)
    img.save(a.out, "PNG")
    with open(a.out + ".truth.json", "w") as fh:
        json.dump(truth, fh)
    print(f"OK: {a.out} ({W}x{H}) {truth['n_dims']} dims seed={a.seed}")

if __name__ == "__main__":
    sys.exit(main())
