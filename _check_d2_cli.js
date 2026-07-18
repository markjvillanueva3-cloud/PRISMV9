const fs = require('fs'), p = require('path'), d = 'C:\\PRISM\\scripts\\core';
const modules = [
  'attention_scorer.py', 'focus_optimizer.py', 'relevance_filter.py',
  'context_monitor.py', 'compaction_detector.py', 'auto_compress.py',
  'context_compressor.py', 'context_expander.py', 'context_pressure.py'
];

modules.forEach(f => {
  const c = fs.readFileSync(p.join(d, f), 'utf8');
  const hasMain = c.includes('__main__');
  const hasArgparse = c.includes('argparse');
  const hasJson = c.includes('--json');
  
  // Extract subcommands from argparse
  const subCmds = [];
  const subMatch = c.match(/add_subparsers|add_parser\(['"](\w+)['"]/g);
  if (subMatch) subCmds.push(...subMatch);
  
  // Extract class name
  const classMatch = c.match(/class (\w+)/);
  const className = classMatch ? classMatch[1] : 'none';
  
  // Check for main function signature
  const mainFunc = c.match(/def main\((.*?)\)/);
  
  console.log(`${f}: class=${className} main=${hasMain} argparse=${hasArgparse} json=${hasJson}`);
  if (subCmds.length) console.log(`  subcommands: ${subCmds.join(', ')}`);
  
  // Show the __main__ block
  if (hasMain) {
    const mainIdx = c.indexOf('__main__');
    const mainBlock = c.slice(mainIdx, mainIdx + 400).split('\n').slice(0, 15).join('\n');
    console.log(`  CLI:\n${mainBlock}\n`);
  }
});
