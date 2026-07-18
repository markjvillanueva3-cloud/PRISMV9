#!/usr/bin/env python
# cad-topology-validity.py -- topological validity of generated CAD via the OCCT B-rep KERNEL
# (U-CADGEN-TOPOLOGY-VALIDITY, slot:delta 2026-07-04). This is the CORRECT replacement for the
# regex-on-STEP Euler counting that was deleted 2026-07-04 -- regex mis-handles holed/curved parts
# (it false-flagged valid flanges/bushings/plates-with-holes as "odd-euler non-manifold"). cadquery's
# Shape.isValid() wraps OCCT BRepCheck_Analyzer -- the authoritative geometric+topological check
# (catches non-manifold, open shells, self-intersection, degenerate faces) -- and Vertices()/Edges()/
# Faces()/Solids() come from the kernel's real topology traversal, not text scraping.
#
# Batch mode (cadquery imported ONCE): pass STEP paths as argv, or --stdin for newline-separated paths.
# Emits one JSON object per line to stdout:
#   {"path":str,"valid":true|false|null,"V":int,"E":int,"F":int,"solids":int,"error":str|null}
# valid=null => could not analyze (missing file / import failure / OCCT read error) -- distinct from
# valid=false (the kernel read it and it is topologically INVALID).
import sys
import os
import json


def analyze(cq, path):
    if not os.path.exists(path):
        return {"path": path, "valid": None, "error": "missing"}
    try:
        shp = cq.importers.importStep(path).val()
        return {
            "path": path,
            "valid": bool(shp.isValid()),
            "V": len(shp.Vertices()),
            "E": len(shp.Edges()),
            "F": len(shp.Faces()),
            "solids": len(shp.Solids()),
            "error": None,
        }
    except Exception as e:  # noqa: BLE001 -- report every failure, never crash the batch
        return {"path": path, "valid": None, "error": "%s: %s" % (type(e).__name__, str(e)[:150])}


def main(argv):
    use_stdin = "--stdin" in argv
    paths = [a for a in argv if not a.startswith("--")]
    if use_stdin:
        paths = [ln.strip() for ln in sys.stdin if ln.strip()]
    try:
        import cadquery as cq  # imported ONCE; subsequent importStep calls are fast
    except Exception as e:  # noqa: BLE001
        for p in paths:
            sys.stdout.write(json.dumps({"path": p, "valid": None, "error": "cadquery-import-failed: %s" % e}) + "\n")
        return 0
    for p in paths:
        sys.stdout.write(json.dumps(analyze(cq, p)) + "\n")
        sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
