---
scenario: stress
skill: calc
description: a batch of five calculations in one prompt — must answer all five, drop none
rubric_must_match: ["((\d{2,5})\s*(rpm|RPM|r/min)[\s\S]*?){3,}"]
rubric_must_not_contain: ["Traceback", "ReferenceError", "I can't help"]
rubric_min_sections: 0
---
Compute the spindle RPM for each of these (RPM = SFM · 12 / (π · D)):

1. 0.250" HSS end mill, aluminium, 300 SFM
2. 0.500" carbide end mill, 4140 steel, 400 SFM
3. 0.125" carbide drill, 304 stainless, 90 SFM
4. 1.000" face mill, cast iron, 250 SFM
5. 0.375" HSS reamer, brass, 150 SFM

## Expected output shape
Five RPM answers (≈ 4584, 3056, 2750, 955, 1528 rpm respectively), one per line,
all present, none silently dropped. The "biggest/messiest version" of a calc
request is a batch — a production-grade calc skill handles it without losing items
and without melting down on the volume.
