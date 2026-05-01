const fs = require('fs');
const data = JSON.parse(fs.readFileSync('H:\\prism\\mcp-server\\data\\milestones\\WEDM-MS1.json', 'utf8'));
const s3 = data.sessions.find(s => s.id === 'WEDM-1-S3');
if (s3 && s3.work) {
  console.log('=== WEDM-1-S3 Surface Integrity Session ===');
  console.log(JSON.stringify(s3, null, 2));
}
