import os
import sys

scripts_dir = r"C:\PRISM\scripts"
results = []
total_lines = 0
total_size = 0

for root, dirs, files in os.walk(scripts_dir):
    dirs[:] = [d for d in dirs if d not in ('__pycache__', '_archive')]
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                    lines = len(fh.readlines())
                size = os.path.getsize(path)
                rel = os.path.relpath(path, scripts_dir)
                results.append((lines, size, rel))
                total_lines += lines
                total_size += size
            except:
                pass

results.sort(key=lambda x: -x[0])
print(f"{'Lines':>6}  {'KB':>7}  Path")
print("-" * 70)
for lines, size, path in results:
    print(f"{lines:>6}  {size/1024:>7.1f}  {path}")
print("-" * 70)
print(f"{total_lines:>6}  {total_size/1024:>7.1f}  TOTAL ({len(results)} files)")
