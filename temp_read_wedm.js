const fs = require('fs');
const data = JSON.parse(fs.readFileSync('H:\\prism\\mcp-server\\data\\milestones\\WEDM-MS1.json', 'utf8'));
console.log(JSON.stringify(data, null, 2));
