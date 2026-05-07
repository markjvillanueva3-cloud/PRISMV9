import json, re, os
raw = os.environ.get('_UP_INPUT', '')
d = json.loads(raw) if raw else {}
prompt = (d.get('prompt', '') or '').strip()
if not prompt: exit(0)

hints = []
slash_match = re.match(r'^/(\w[\w-]*)', prompt)
if slash_match:
    cmd = slash_match.group(1)
    skill_hints = {
        'sf': 'SpeedFeedOrchestrator: 67-point physics hub',
        'auto-speed-feed': 'AutoSpeedFeed: line-by-line G-code S/F',
        'playbook': 'MachiningPlaybook: 296 rules, 42 categories',
        'feasibility-check': 'FeasibilityOrchestrator: 43 failure modes',
        'cnc-simulate': 'CNCSimulationPipeline: 8-layer stack',
        'fusion-generate': 'Fusion360 code gen + live bridge',
        'video-replay': 'VideoActionReplay: watch & do pipeline',
        'program-gen': 'CNCProgramAssembler: full program pipeline',
    }
    if cmd in skill_hints:
        hints.append(f'Skill /{cmd} -> {skill_hints[cmd]}')

mfg_patterns = [
    (r'\b(speed|feed|rpm|sfm|ipm|chipload)\b', 'Use /sf for S/F calculations'),
    (r'\b(g-?code|program|post.?process)\b', 'Use /program-gen for CNC programs'),
    (r'\b(simulat|verify|backplot)\b', 'Use /cnc-simulate for G-code sim'),
    (r'\b(feasib|can.*(machine|cut|mill))\b', 'Use /feasibility-check'),
    (r'\b(quote|cost|price|roi)\b', 'QuoteEstimator + ROIAdvisor available'),
]
prompt_lower = prompt.lower()
for pattern, hint_msg in mfg_patterns:
    if re.search(pattern, prompt_lower) and not slash_match:
        hints.append(hint_msg)
        break

if hints: print(' | '.join(hints[:2]))
