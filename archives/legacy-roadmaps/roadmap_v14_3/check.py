import os
BASE = r'C:\PRISM\mcp-server\roadmap_v14_3\roadmap-v14.2.1'
baselines = {
    'PRISM_PROTOCOLS_CORE.md': 1686,
    'PRISM_MASTER_INDEX.md': 439,
    'PHASE_DA_DEV_ACCELERATION.md': 291,
    'PHASE_R1_REGISTRY.md': 1203,
    'PHASE_R2_SAFETY.md': 578,
    'PHASE_R3_CAMPAIGNS.md': 761,
    'PHASE_R7_INTELLIGENCE.md': 822,
    'SYSTEM_CONTRACT.md': 379,
    'ROADMAP_INSTRUCTIONS.md': 193,
    'CLAUDE_CODE_INTEGRATION.md': 130,
    'PHASE_R6_PRODUCTION.md': 212,
    'CURRENT_POSITION.md': 1,
}
all_pass = True
for fname, baseline in baselines.items():
    fp = os.path.join(BASE, fname)
    if os.path.exists(fp):
        with open(fp, 'r', encoding='utf-8') as fh:
            new_count = len(fh.readlines())
        status = "PASS" if new_count >= baseline else "FAIL"
        if status == "FAIL": all_pass = False
        delta = new_count - baseline
        sign = '+' if delta >= 0 else ''
        print(f"  {fname}: {baseline} -> {new_count} ({sign}{delta}) [{status}]")
    else:
        print(f"  {fname}: FILE NOT FOUND [FAIL]")
        all_pass = False
print(f"\n{'ALL CHECKS PASSED' if all_pass else 'SOME CHECKS FAILED'}")
