import re, os, json

tools_dir = r"C:\PRISM\mcp-server\src\tools"
# Map: filename -> list of tool names registered
file_tools = {}

for fname in os.listdir(tools_dir):
    if not fname.endswith('.ts'):
        continue
    fpath = os.path.join(tools_dir, fname)
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        continue
    
    # Match server.tool("tool_name", ...) pattern
    # Also match server.tool(\n  "tool_name"
    matches = re.findall(r'server\.tool\(\s*["\']([a-zA-Z_][a-zA-Z0-9_]*)["\']', content)
    if matches:
        file_tools[fname] = matches

# Now find collisions
all_names = {}
for fname, names in sorted(file_tools.items()):
    for name in names:
        if name not in all_names:
            all_names[name] = []
        all_names[name].append(fname)

# Print disabled files and their tools
disabled = [
    'hookToolsV2.ts', 'generatorTools.ts', 'manusTools.ts',
    'hookManagementTools.ts', 'skillToolsV2.ts', 'scriptToolsV2.ts',
    'knowledgeQueryTools.ts', 'ralphLoopTools.ts', 'sessionLifecycleTools.ts'
]

print("=" * 80)
print("DISABLED FILES - TOOL NAMES")
print("=" * 80)
for fname in disabled:
    if fname in file_tools:
        print(f"\n{fname} ({len(file_tools[fname])} tools):")
        for t in file_tools[fname]:
            collision = [f for f in all_names[t] if f != fname]
            if collision:
                print(f"  [COLLISION] {t}  <-- also in {collision}")
            else:
                print(f"  [UNIQUE] {t}")

print("\n" + "=" * 80)
print("COLLISION SUMMARY")
print("=" * 80)
collisions = {n: files for n, files in all_names.items() if len(files) > 1}
for name, files in sorted(collisions.items()):
    print(f"  {name}: {files}")

print(f"\nTotal unique tool names: {len(all_names)}")
print(f"Colliding names: {len(collisions)}")
print(f"Tools in disabled files that are unique (can be enabled): ", end="")
unique_in_disabled = 0
for fname in disabled:
    if fname in file_tools:
        for t in file_tools[fname]:
            if len(all_names[t]) == 1:
                unique_in_disabled += 1
print(unique_in_disabled)
