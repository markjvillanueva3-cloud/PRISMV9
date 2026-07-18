const { execSync } = require('child_process');
const result = execSync('findstr /S /I "material-registry\\|machine-registry\\|alarm-registry\\|tool-registry\\|from.*\\/base" C:\\PRISM\\mcp-server\\src\\registries\\*.ts C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\*.ts C:\\PRISM\\mcp-server\\src\\services\\*.ts C:\\PRISM\\mcp-server\\src\\index.ts', { encoding: 'utf-8' });
console.log(result);
