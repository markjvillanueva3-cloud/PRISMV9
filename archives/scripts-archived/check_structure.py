import re
from pathlib import Path

print("CHECKING GIANT MODULE STRUCTURE")
print("=" * 60)

monolith_path = Path(r'C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html')
content = monolith_path.read_text(encoding='utf-8')

giants = ['PRISM_PHASE1_MANUFACTURING', 'PRISM_NUMERICAL_ENGINE']

for mod in giants[:2]:
    pattern = r'const\s+' + re.escape(mod) + r'\s*=\s*\{'
    match = re.search(pattern, content)
    if match:
        start = match.start()
        # Show first 500 chars
        sample = content[start:start+500]
        print("{}:".format(mod))
        print("Position: {}".format(start))
        print("Sample: {}...".format(sample[:300]))
        print("")
        
        # Count total { and } in next 30MB
        chunk = content[start:start+30000000]
        opens = chunk.count('{')
        closes = chunk.count('}')
        print("In 30MB chunk - Opens: {}, Closes: {}".format(opens, closes))
        print("")
