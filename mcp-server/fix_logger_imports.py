import os
import re

src_dir = r'C:\PRISM\mcp-server\src'
count = 0
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.ts'):
            fp = os.path.join(root, f)
            with open(fp, 'r', encoding='utf-8') as file:
                content = file.read()
            # Fix lowercase logger imports to uppercase Logger
            new_content = re.sub(r'from ["\'](\.\./)*utils/logger\.js["\']', lambda m: m.group(0).replace('logger.js', 'Logger.js'), content)
            if new_content != content:
                with open(fp, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f'Fixed: {fp}')
                count += 1
print(f'Total files fixed: {count}')
