---
scenario: happy
skill: de-sloppify
description: a normal sloppy-code review request — the ~80% case
rubric_must_contain: ["refactor"]
rubric_must_not_contain: ["I can't help", "I'm unable to", "cannot assist"]
rubric_min_sections: 1
rubric_must_match: ["(naming|variable name|rename|descriptive name)", "(early return|guard clause|simplif)"]
---
Review this function and clean it up — it works but it's sloppy:

  function calc(a,b,c){var r=0;if(c=='add'){r=a+b}else{if(c=='sub'){r=a-b}else{if(c=='mul'){r=a*b}else{r=NaN}}};return r}

## Expected output shape
A review that names concrete issues (one-letter names `a`/`b`/`c`/`r`, nested
`if`/`else` instead of a switch or early returns, `var`, loose `==`, no input
validation) and shows a refactored version. Sections like "Findings" /
"Refactored" expected. Client-ready: a developer could apply it as-is.
