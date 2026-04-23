#!/usr/bin/env python3
"""Classify errors as transient, permanent, or cascading."""
import re

TRANSIENT_PATTERNS = [
    r"timeout", r"ETIMEDOUT", r"ECONNRESET", r"rate.?limit",
    r"429", r"503", r"retry", r"temporary", r"network"
]

PERMANENT_PATTERNS = [
    r"not.?found", r"404", r"invalid", r"missing.?required",
    r"type.?error", r"syntax.?error", r"permission.?denied", r"401"
]

CASCADE_PATTERNS = [
    r"depends.?on", r"upstream", r"prerequisite", r"blocked.?by",
    r"pipeline.?stage", r"dependency"
]

def classify_error(error_message):
    """Classify an error message."""
    msg = error_message.lower()
    for pattern in CASCADE_PATTERNS:
        if re.search(pattern, msg):
            return "cascading"
    for pattern in TRANSIENT_PATTERNS:
        if re.search(pattern, msg):
            return "transient"
    for pattern in PERMANENT_PATTERNS:
        if re.search(pattern, msg):
            return "permanent"
    return "unknown"

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        msg = " ".join(sys.argv[1:])
        print(classify_error(msg))
    else:
        print("Usage: error_classifier.py <error message>")
