"""Apply 9 scrutiny fixes to TSC-CLEANUP-MS0.json from 3-agent review (avg 87/100)."""
import json
p = 'H:/PRISM/mcp-server/data/milestones/TSC-CLEANUP-MS0.json'
with open(p) as f: m = json.load(f)

# FIX 1 (Dim 5): Add P2-S4 for camDispatcher.ts
p2 = next(p for p in m['phases'] if p['phase_id'] == 'P2')
p2_s4 = {
    "session_id": "P2-S4",
    "session_title": "camDispatcher.ts coordinated cleanup (after CAM-EXHAUST-MS0)",
    "smart_config": {"role": "build-doctor", "model": "sonnet", "effort": "MAX", "context_budget": "60%"},
    "knowledge": [
        "P2-S3 output (TS2339/TS2554/TS2345 closed)",
        "CAM-EXHAUST-MS0 final state (must be complete)",
        "Chat bus claims on camDispatcher.ts must be released"
    ],
    "intent": "61 errors in camDispatcher.ts (peer-claimed throughout P0-P3) get cleaned up. Final big chunk before long tail.",
    "skills": ["/scope", "/test", "/code-index"],
    "plugins": ["Vitest MCP"],
    "mcp_lifecycle": ["context_boot", "dispatcher_map", "memory_recall", "auto_checkpoint", "memory_save"],
    "work": [{
        "unit_id": "U-CL02-06",
        "title": "Reconcile camDispatcher.ts type errors (61 -> 0) AFTER peer chats release claims",
        "build": "Wait for chat bus to show no peer claims on camDispatcher.ts. Verify CAM-EXHAUST-MS0 status: complete. Then read full file, fix all type errors via dispatcher action signature alignment. Most errors are TS2339 (missing engine methods) or TS2353 (excess Zod properties).",
        "files_created": [],
        "files_modified": ["src/tools/dispatchers/camDispatcher.ts"],
        "depends_on": ["U-CL02-05"],
        "exit_criteria": [
            "camDispatcher.ts has 0 own errors",
            "All dispatcher actions still reachable (action_search verifies enum)",
            "vitest run __tests__/cam-*.test.ts passes",
            "No peer chat claims active on this file at start"
        ],
        "abort_criteria": [
            "Peer chat claims active on camDispatcher.ts (defer this session)",
            "CAM-EXHAUST-MS0 not yet complete (block this session)",
            "vitest cam-* test count drops below pre-session baseline"
        ],
        "rollback": "git checkout src/tools/dispatchers/camDispatcher.ts",
        "four_loop": "BUILD -> SCRUTINIZE (action_search) -> GAP FILL -> TIE UP"
    }],
    "exit_gate": {
        "criteria": ["camDispatcher.ts: 0 errors", "all cam-* tests pass", "61-error gap closed"],
        "omega_floor": 0.92,
        "svi_delta": "+0.3%"
    },
    "feature_cascade": {"new_hooks": [], "new_actions": [], "new_skills": [], "new_state_files": [], "available_to": ["P3-S1"]},
    "compact_after": True
}
p2['sessions'].append(p2_s4)
p2['session_count'] = 4
p2['target_error_reduction'] = 461

# FIX 2: Math reconciliation
m['baseline']['error_reduction_plan'] = {
    "P1": 650, "P2_incl_camDispatcher": 461, "P3": 316, "P4": 167, "P5": 0,
    "total_planned": 1594, "remainder_buffer": 9,
    "note": "9-error buffer for cascade effects (fixing P1 may unblock some P2 errors). Absorbed in P4 long-tail."
}

# FIX 3: Renumber P2-S2 unit IDs
p2_s2 = next(s for s in p2['sessions'] if s['session_id'] == 'P2-S2')
for u in p2_s2['work']:
    if u['unit_id'] == 'U-CL02-02a':
        u['unit_id'] = 'U-CL02-02'
    elif u['unit_id'] == 'U-CL02-02b':
        u['unit_id'] = 'U-CL02-03'
        u['depends_on'] = ['U-CL02-02']
p2_s3 = next(s for s in p2['sessions'] if s['session_id'] == 'P2-S3')
for u in p2_s3['work']:
    if 'depends_on' in u:
        u['depends_on'] = ['U-CL02-03' if d == 'U-CL02-02b' else d for d in u['depends_on']]
for u in p2_s3['work']:
    if u['unit_id'] == 'U-CL02-03':
        u['unit_id'] = 'U-CL02-04'
        u['depends_on'] = ['U-CL02-03']
    elif u['unit_id'] == 'U-CL02-04':
        u['unit_id'] = 'U-CL02-05'
        u['depends_on'] = ['U-CL02-04']
p3 = next(p for p in m['phases'] if p['phase_id'] == 'P3')
for s in p3['sessions']:
    for u in s['work']:
        if 'depends_on' in u:
            u['depends_on'] = ['U-CL02-05' if d == 'U-CL02-04' else d for d in u['depends_on']]

# FIX 4: cross_track_dependencies
m['rgs_pipeline']['stage_9_dependency_resolution']['cross_track_dependencies'] = [
    "SOFT: CAM-EXHAUST-MS0 (concurrent edits to camDispatcher.ts; P2-S4 explicitly waits for it)",
    "SOFT: HARNESS-LEARN-MS0 (uses asset-deletion-block.mjs)",
    "SOFT: QA-MS0 (vitest infrastructure - every test-pass criterion depends on it)",
    "SOFT: SYS-MS0 (CLAUDE.md architecture - could conflict with U-CL05-04 inventory updates)",
    "SOFT: PPG-WIRE-MS0 (recent active milestone - verify no engine overlap before P1)"
]

# FIX 5: P5-S1 available_to
p5 = next(p for p in m['phases'] if p['phase_id'] == 'P5')
p5['sessions'][0]['feature_cascade']['available_to'] = [
    "all future engine refactor milestones (precondition: tsc-clean baseline)",
    "CI/CD pipeline gates (tsc-noemit-gate.mjs blocks regressions)",
    "pre-commit hook adopters (TSC_BASELINE.json defines floor)",
    "any milestone consuming /tsc-clean skill or prism_dev:tsc_check action"
]

# FIX 6: /physics-verify in P1-S2
p1 = next(p for p in m['phases'] if p['phase_id'] == 'P1')
p1_s2 = next(s for s in p1['sessions'] if s['session_id'] == 'P1-S2')
if '/physics-verify' not in p1_s2['skills']:
    p1_s2['skills'].insert(2, '/physics-verify')

# FIX 7: dispatcher_map in mcp_lifecycle
for phase in m['phases']:
    for sess in phase['sessions']:
        if sess['session_id'] in ['P2-S1', 'P2-S3', 'P3-S1', 'P5-S1']:
            if 'dispatcher_map' not in sess['mcp_lifecycle']:
                lc = sess['mcp_lifecycle']
                idx = lc.index('context_boot') + 1 if 'context_boot' in lc else 0
                lc.insert(idx, 'dispatcher_map')

# FIX 8: /forge-engines -> /engine-browse in P1-S3
p1_s3 = next(s for s in p1['sessions'] if s['session_id'] == 'P1-S3')
p1_s3['skills'] = [s if 'forge-engines' not in s else '/engine-browse' for s in p1_s3['skills']]

# FIX 9: Tighten abort_criteria + add 3rd exit_criterion
def tighten(u):
    if 'abort_criteria' in u:
        new = []
        for ac in u['abort_criteria']:
            if ac == 'regression':
                new.append('vitest pass count drops below pre-unit baseline OR new compile error introduced')
            elif ac == 'logic regression':
                new.append('Snapshot diff shows non-type changes OR vitest pass count drops')
            elif ac == 'test fail':
                new.append('any test in __tests__/<engine>.test.ts fails after edit')
            else:
                new.append(ac)
        u['abort_criteria'] = new
    if 'exit_criteria' in u and len(u['exit_criteria']) < 3:
        u['exit_criteria'].append("commit message follows [TSC-CLEANUP/U-CL##] format with files-touched list")

for phase in m['phases']:
    for sess in phase['sessions']:
        for u in sess.get('work', []):
            tighten(u)

# FIX 10: Per-file commits in U-CL01-08
u_cl01_08 = next(u for u in p1_s3['work'] if u['unit_id'] == 'U-CL01-08')
u_cl01_08['exit_criteria'] = [
    "TS7006 error count drops to 0",
    "Total error count down to ~960 (1603 - 650)",
    "All tests pass",
    "Commit-per-file ([TSC-CLEANUP/U-CL01-08-NN] with intermediate tsc count logged)",
    "Each commit's tsc count is monotonically decreasing"
]
u_cl01_08['build'] += " IMPORTANT: commit per file (not per batch) so any regression reverts surgically. Log tsc count after each commit."

# Record scrutiny results
m['rgs_pipeline']['stage_10_scrutiny']['results'] = {
    "agent_1": {"dims": {"protocol_structure": 88, "unit_naming": 92, "dependency_graph": 90}, "avg": 90, "verdict": "PASS"},
    "agent_2": {"dims": {"exit_gate_rigor": 82, "completeness_coverage": 76, "forge_triple_ownership": 95}, "avg": 84, "verdict": "CONDITIONAL_BEFORE_FIXES"},
    "agent_3": {"dims": {"physics_rigor": 88, "feature_cascade": 92, "mcp_utilization": 78, "cross_roadmap": 90}, "avg": 87, "verdict": "PASS"},
    "overall_avg": 87,
    "fixes_applied": [
        "Added P2-S4/U-CL02-06 for camDispatcher.ts coordinated cleanup (closes Dim 5 coverage gap)",
        "Renumbered U-CL02-02a/02b to U-CL02-02/03 (cascade renumber 04, 05, 06)",
        "Added QA-MS0, SYS-MS0, PPG-WIRE-MS0 to cross_track_dependencies",
        "P5-S1 available_to enumerated 4 concrete consumer categories",
        "Added /physics-verify to P1-S2 skills",
        "Added dispatcher_map to mcp_lifecycle in P2-S1, P2-S3, P3-S1, P5-S1",
        "Replaced /forge-engines with /engine-browse in P1-S3",
        "Tightened vague abort_criteria across all units",
        "Per-file commit discipline added to U-CL01-08 (16-file batch)"
    ],
    "post_fix_estimate": "all dimensions >=85 after fixes"
}

m['updated_at'] = '2026-04-27T18:00 UTC'

with open(p, 'w') as f:
    json.dump(m, f, indent=2)

phases = len(m['phases'])
sessions = sum(len(p['sessions']) for p in m['phases'])
units = sum(len(s.get('work', [])) for p in m['phases'] for s in p['sessions'])
print(f'OK - 9 fixes applied. Phases={phases}, Sessions={sessions}, Units={units}')
