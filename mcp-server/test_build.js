// Direct dispatcher test - bypass MCP SDK, call handlers directly
const path = require('path');
process.chdir('C:\\PRISM\\mcp-server');

// Minimal mock of server.tool to capture registrations
const registeredTools = {};
const mockServer = {
  tool: function(...args) {
    const name = args[0];
    const handler = args[args.length - 1];
    registeredTools[name] = handler;
  }
};

async function main() {
  try {
    // Load the bundle
    console.log('Loading dist/index.js...');
    const bundle = require('./dist/index.js');
    console.log('Bundle loaded. Exports:', Object.keys(bundle).slice(0, 10));
    
    // Find dispatcher registration functions
    const regFuncs = Object.keys(bundle).filter(k => k.startsWith('register') && k.includes('Dispatcher'));
    console.log('Dispatcher registration functions:', regFuncs);
    
    if (regFuncs.length === 0) {
      console.log('No dispatcher functions exported. Checking for registerTools...');
      const rtFunc = Object.keys(bundle).filter(k => k.includes('register'));
      console.log('Register functions:', rtFunc);
    }
  } catch(e) {
    console.log('ERROR loading bundle:', e.message);
    console.log('Stack:', e.stack.split('\n').slice(0, 5).join('\n'));
  }
}

main().catch(e => console.log('FATAL:', e.message));
