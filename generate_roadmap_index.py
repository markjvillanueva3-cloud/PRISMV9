#!/usr/bin/env python3
"""Generate roadmap-index.json and skeleton milestone envelopes."""
import json, os, sys

TIMESTAMP = "2026-02-26T22:00:00Z"
VERSION = "1.0.0"
TITLE = "PRISM App — Comprehensive Layered Roadmap v3.1"
SKIP_IF_EXISTS = {"S1-MS1", "S1-MS2"}

# Milestone data is loaded from _milestones_data.json
# (written by separate step)

