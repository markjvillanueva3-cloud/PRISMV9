#!/usr/bin/env python3
"""crop-image-tiles.py -- crop a page image into the tile rects computed by vision-tiling-lib.

Part of P0.2 dense-page region tiling (blueprint-vision / slot xray). One Python process crops ALL
tiles of a page (one PIL startup, not N), so the JS orchestrator (vision-tiling-extract.mjs) spends a
single subprocess per page. Each tile box is clamped to the image bounds defensively.

USAGE:
  python crop-image-tiles.py <src.png> <tiles.json> <out_dir>
    tiles.json: a JSON array of {"id","x","y","w","h"} (the computeTileGrid tiles).
  Emits to stdout a JSON object { "<tile id>": "<written tile png path>", ... } for the tiles it wrote.
  Exit 0 on success (>=1 tile written), 2 if no tile could be written, 3 on arg/IO error.
"""
import sys
import os
import json


def main():
    if len(sys.argv) != 4:
        sys.stderr.write("usage: crop-image-tiles.py <src.png> <tiles.json> <out_dir>\n")
        return 3
    src, tiles_arg, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    try:
        from PIL import Image
    except Exception as e:  # Pillow missing -> fail loud, do not silently emit nothing as success
        sys.stderr.write("Pillow not available: %s\n" % e)
        return 3
    try:
        # tiles_arg may be an inline JSON string OR a path to a JSON file (large grids).
        if os.path.isfile(tiles_arg):
            with open(tiles_arg, "r", encoding="utf-8") as fh:
                tiles = json.load(fh)
        else:
            tiles = json.loads(tiles_arg)
    except Exception as e:
        sys.stderr.write("bad tiles json: %s\n" % e)
        return 3
    if not isinstance(tiles, list) or not tiles:
        sys.stderr.write("tiles json must be a non-empty array\n")
        return 3
    try:
        os.makedirs(out_dir, exist_ok=True)
        im = Image.open(src)
        im.load()
    except Exception as e:
        sys.stderr.write("cannot open src image: %s\n" % e)
        return 3

    W, H = im.size
    out = {}
    for t in tiles:
        try:
            tid = str(t["id"])
            x = max(0, int(t["x"]))
            y = max(0, int(t["y"]))
            x1 = min(W, x + int(t["w"]))
            y1 = min(H, y + int(t["h"]))
            if x1 <= x or y1 <= y:
                continue  # degenerate box (out of bounds) -> skip, do not write a 0-size png
            crop = im.crop((x, y, x1, y1))
            # sanitize id for a filesystem path (ids are like r0c1 / center -- already safe, but be defensive)
            safe = "".join(c if (c.isalnum() or c in "-_") else "_" for c in tid)
            p = os.path.join(out_dir, "tile_%s.png" % safe)
            crop.save(p)
            out[tid] = p
        except Exception as e:
            sys.stderr.write("tile %r failed: %s\n" % (t, e))
            continue

    if not out:
        sys.stderr.write("no tile written\n")
        return 2
    sys.stdout.write(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
