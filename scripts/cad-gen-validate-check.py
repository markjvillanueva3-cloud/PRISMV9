#!/usr/bin/env python
# cad-gen-validate-check.py -- re-import a generated STEP via cadquery and report basic solid validity.
# Trunk-side complement to slot-delta's deep cad-analyze-step.mjs: confirms the gen output is a real
# manifold solid (re-imports + has >=1 solid) -- a real "test" signal for the overnight gen loop.
# Usage: python cad-gen-validate-check.py <model.step>  -> one JSON line on stdout.
import sys, json

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"valid": False, "error": "no path arg"})); return
    path = sys.argv[1]
    try:
        import cadquery as cq
        wp = cq.importers.importStep(path)
        solids = wp.solids().size()
        faces = wp.faces().size()
        # valid = re-imported cleanly AND is a non-empty solid body (the manifold B-rep contract).
        print(json.dumps({"valid": bool(solids >= 1), "solids": int(solids), "faces": int(faces)}))
    except Exception as e:  # noqa: BLE001 -- any import/parse failure means an invalid STEP
        print(json.dumps({"valid": False, "error": str(e)[:200]}))

if __name__ == "__main__":
    main()
