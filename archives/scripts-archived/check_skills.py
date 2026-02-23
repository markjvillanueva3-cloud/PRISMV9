from pathlib import Path
p = Path("C:/PRISM/skills-generated-v2")
if p.exists():
    skills = [d for d in p.iterdir() if d.is_dir()]
    print(f"Total skills in v2: {len(skills)}")
    for s in sorted(skills)[:5]:
        f = s / "SKILL.md"
        if f.exists():
            lines = len(f.read_text(encoding='utf-8').split('\n'))
            print(f"  {s.name}: {lines} lines")
else:
    print("No v2 skills dir")
