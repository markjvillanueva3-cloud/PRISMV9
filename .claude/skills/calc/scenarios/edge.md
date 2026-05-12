---
scenario: edge
skill: calc
description: incomplete input — required parameters missing; the skill must ASK, not guess or crash
rubric_must_match: ["(need|require|provide|missing|specif(y|ied)|what (is|are)|please (give|provide|specify)|cannot compute without)[\s\S]{0,60}(chip ?load|feed per tooth|fpt|rpm|spindle speed|number of (flutes|teeth)|flute count)"]
rubric_must_not_contain: ["Traceback", "ReferenceError"]
rubric_min_sections: 0
---
Calculate the table feed rate.

## Expected output shape
Feed rate (in/min) = RPM · feed-per-tooth · number-of-flutes — but the prompt
gives none of those. A rigid calc skill identifies exactly which inputs are
missing (RPM / spindle speed, feed per tooth or chip load, flute count) and asks
for them, rather than inventing defaults or throwing. Conflicting/incomplete-input
handling is the whole point of this scenario.
