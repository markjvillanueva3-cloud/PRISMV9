# Fix family assignments in master database
import json

# Load
with open(r'C:\\PRISM\EXTRACTED\controllers\MASTER_ALARM_DATABASE_v2.json', 'r') as f:
    db = json.load(f)

# Fix alarms with missing family
for alarm in db['alarms']:
    if not alarm.get('controller_family'):
        aid = alarm.get('alarm_id', '')
        if 'FAN' in aid:
            alarm['controller_family'] = 'FANUC'
        elif 'HAAS' in aid:
            alarm['controller_family'] = 'HAAS'
        elif 'SIE' in aid:
            alarm['controller_family'] = 'SIEMENS'
        elif 'MAZ' in aid:
            alarm['controller_family'] = 'MAZAK'
        elif 'OKU' in aid:
            alarm['controller_family'] = 'OKUMA'
        elif 'HEI' in aid:
            alarm['controller_family'] = 'HEIDENHAIN'
        elif 'MIT' in aid:
            alarm['controller_family'] = 'MITSUBISHI'
        elif 'BRO' in aid:
            alarm['controller_family'] = 'BROTHER'
        elif 'HUR' in aid:
            alarm['controller_family'] = 'HURCO'
        elif 'FAG' in aid:
            alarm['controller_family'] = 'FAGOR'
        elif 'DMG' in aid:
            alarm['controller_family'] = 'DMG_MORI'
        elif 'DOO' in aid:
            alarm['controller_family'] = 'DOOSAN'

# Recalculate stats
stats = {}
for alarm in db['alarms']:
    family = alarm.get('controller_family', 'UNKNOWN')
    if family not in stats:
        stats[family] = {'accepted': 0}
    stats[family]['accepted'] += 1

db['statistics']['by_family'] = stats
db['metadata']['controller_families'] = len(stats)

# Save
with open(r'C:\\PRISM\EXTRACTED\controllers\MASTER_ALARM_DATABASE_v2.json', 'w') as f:
    json.dump(db, f, indent=2)

print('Fixed family assignments')
print('Total:', len(db['alarms']), 'alarms')
print('By Family:')
for k,v in sorted(stats.items(), key=lambda x:-x[1]['accepted']):
    print(f'  {k}: {v["accepted"]}')
