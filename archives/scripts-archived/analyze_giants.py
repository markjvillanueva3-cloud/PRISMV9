import re
import json
from pathlib import Path

print("ANALYZING GIANT MODULES")
print("=" * 60)

monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')

giants = [
    'PRISM_PHASE1_MANUFACTURING',
    'PRISM_NUMERICAL_ENGINE',
    'PRISM_PHASE1_OPTIMIZERS',
    'PRISM_MANUFACTURING_SEARCH_ENGINE',
    'PRISM_COLLISION_ALGORITHMS',
    'PRISM_GRAPH_ALGORITHMS',
    'PRISM_MULTI_OBJECTIVE_OPTIMIZER',
    'PRISM_ENHANCEMENTS',
    'PRISM_MACHINE_CAD_CONSTRAINT_LEARNER',
    'PRISM_PHASE3_ADVANCED_SIGNAL',
    'PRISM_RIGID_BODY_DYNAMICS_ENGINE',
]

for mod in giants:
    pattern = r'const\s+' + re.escape(mod) + r'\s*=\s*\{'
    match = re.search(pattern, content)
    if match:
        start = match.start()
        # Look for end by scanning a large area
        end_search = content[start:start+30000000]  # 30MB search
        
        # Find all { and } positions
        brace_depth = 0
        in_string = False
        string_char = None
        escape = False
        end_pos = None
        
        for i, c in enumerate(end_search):
            if escape:
                escape = False
                continue
            if c == '\\':
                escape = True
                continue
            if in_string:
                if c == string_char:
                    in_string = False
                continue
            if c in '"\'':
                in_string = True
                string_char = c
                continue
            if c == '`':
                in_string = True
                string_char = '`'
                continue
            if c == '{':
                brace_depth += 1
            elif c == '}':
                brace_depth -= 1
                if brace_depth == 0:
                    end_pos = i
                    break
        
        if end_pos:
            size = end_pos + 1
            print("{}: {:,} chars ({:.1f} MB)".format(mod, size, size/1000000))
        else:
            print("{}: COULD NOT FIND END (searched 30MB)".format(mod))
    else:
        print("{}: NO MATCH".format(mod))
