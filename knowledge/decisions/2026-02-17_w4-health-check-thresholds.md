# health_check uses GREEN/YELLOW/RED thresholds tied to Recovery Card modes
Type: decision | Phase: DA | MS: MS1
Date: 2026-02-17 | Confidence: verified
Tags: session_health, compaction, recovery, DA-MS1

GREEN: calls<20, tokens<50K, compactions=0. YELLOW: calls 20-35 OR tokens 50-80K OR compactions=1. RED: calls>35 OR tokens>80K OR compactions>=2. Each maps to NORMAL/REDUCED/MINIMAL boot mode.
