---
scenario: happy
skill: calc
description: a normal single CNC calculation — the ~80% case (rigid skill, tight rubric)
rubric_must_match: ["\b(10[0-5])(\.\d+)?\b", "(sfm|surface (feet|ft)|ft/min|surface speed)"]
rubric_must_not_contain: ["Traceback", "ReferenceError", "I can't help"]
rubric_min_sections: 0
---
Calculate the cutting speed (SFM) for a 0.5 inch diameter HSS end mill running at 800 RPM.

## Expected output shape
SFM = π · D · RPM / 12 = π · 0.5 · 800 / 12 ≈ 104.7 SFM. A rigid calc skill returns
the number (≈104–105 SFM), ideally with the formula, terse — no fluff, no headings.
Client-ready: a machinist can read the answer in one line.
