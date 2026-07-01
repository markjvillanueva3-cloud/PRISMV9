#!/usr/bin/env python3
"""One-shot orchestrator for the chat-archive permanent-memory pipeline.

Runs, in order:
  1. ingest.py   (incremental: only new/changed sessions, plus retries errors)
  2. build_index.py
  3. build_checkin.py

Safe to run on a schedule (cron). Prints a compact summary.
"""
import subprocess, sys, os
PIPE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable

def run(args):
    print(">>>", " ".join(args), flush=True)
    r = subprocess.run([PY] + args, cwd=PIPE, capture_output=True, text=True)
    sys.stdout.write(r.stdout); 
    if r.stderr: sys.stderr.write(r.stderr)
    print("(exit %d)" % r.returncode, flush=True)
    return r.returncode

def main():
    rc = 0
    rc |= run(["ingest.py", "--source", "all"])
    rc |= run(["build_index.py"])
    rc |= run(["build_checkin.py"])
    print("PIPELINE COMPLETE rc=%d" % rc)
    sys.exit(rc)

if __name__ == "__main__":
    main()
