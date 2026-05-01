try {
  const data = JSON.parse(require('fs').readFileSync('C:\\PRISM\\mcp-server\\state\\nl_hooks\\registry.json', 'utf-8'));
  console.log('VALID JSON -', data.hooks.length, 'hooks');
} catch(e) {
  console.log('INVALID:', e.message);
}
