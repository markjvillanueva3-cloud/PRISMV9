---
scenario: stress
skill: de-sloppify
description: a big, messy, mixed-language blob — tests graceful degradation under a small input cap
rubric_max_input_chars: 700
rubric_must_not_contain: ["Traceback", "ReferenceError"]
rubric_min_sections: 1
rubric_must_match: ["(truncat|too (large|long|big)|first \d+ (chars|characters|lines)|portion|prioriti[sz]e|highest-impact|degrade|in batches|the visible (part|portion))"]
---
Clean up this entire module — it's a mess. (Note: this fixture deliberately sets a tiny 700-char input cap, so the skill will receive a truncated version with a `[…truncated …]` marker — the test is whether it degrades gracefully and says what it would need rather than pretending it saw the whole thing.)

```python
import os,sys,json
def proc(d):
  out={}
  for k in d:
    if d[k]==None: continue
    if type(d[k])==str: out[k]=d[k].strip()
    elif type(d[k])==list: out[k]=[x for x in d[k] if x]
    else: out[k]=d[k]
  return out
def main():
  data=json.load(open(sys.argv[1]))
  r=proc(data)
  print(json.dumps(r))
  # TODO clean this up later
  x=1;y=2;z=x+y;print(z)  # noqa
if __name__=='__main__': main()
```

```js
var globalState = {};
function doStuff(thing){ if(thing){ globalState[thing.id]=thing; return true } return false }
function moreStuff(){ for(var k in globalState){ console.log(k); delete globalState[k] } }
```

```css
.btn{color:red;background:blue;padding:5px}.btn:hover{color:blue;background:red}
```

(...imagine ~1500 more lines of similar mixed Python/JS/CSS sloppiness...)

## Expected output shape
A production-grade skill, handed a truncated input, says explicitly that it only
saw the first portion / the input was truncated, prioritises the highest-impact
fixes it CAN see (e.g. the `== None` → `is None`, the leftover `TODO`, the
`var`/`globalState` globals, the inline `x=1;y=2;z=...` debug line), and offers
to continue in batches. It does NOT silently pretend it reviewed all 1500 lines,
and it does NOT crash on the multi-language mix.
