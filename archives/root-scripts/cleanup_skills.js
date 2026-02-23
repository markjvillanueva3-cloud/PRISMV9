const fs = require('fs');
const path = require('path');
const SKILLS_DIR = 'C:\\PRISM\\skills-consolidated';
const SKIP = ['scripts', 'proposals'];

let fixed = 0;
const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && !SKIP.includes(d.name));

for (const dir of dirs) {
  const fp = path.join(SKILLS_DIR, dir.name, 'SKILL.md');
  if (!fs.existsSync(fp)) continue;
  
  let content = fs.readFileSync(fp, 'utf8');
  let changed = false;
  
  // Fix 1: Remove "- |" lines (YAML pipe leak)
  if (content.includes('- |')) {
    content = content.replace(/^- \|\s*$/gm, '');
    changed = true;
  }
  
  // Fix 2: Remove bare pipe lines
  if (/^\|\s*$/m.test(content)) {
    content = content.replace(/^\|\s*$/gm, '');
    changed = true;
  }
  
  // Fix 3: Enrich sparse "When To Use" triggers from description
  const fmMatch = content.match(/description:\s*\|?\s*\r?\n([\s\S]*?)(?=\n\w+:|\n---)/);
  if (fmMatch) {
    const desc = fmMatch[1].toLowerCase();
    // Extract meaningful words from description (4+ chars, not common words)
    const stopWords = new Set(['this','that','with','from','into','also','each','when','uses','used','what','have','will','been','their','them','than','then','only','just','more','some','such','both','most','very','over','under','about','where','which','while','after','before','other','those','these','first','last','every','total','lines','level','skill','prism','covers','version','source','reference','academic','consolidates','functions','provides','key','principle','part']);
    const descWords = [...new Set(desc.match(/[a-z]{4,}/g) || [])].filter(w => !stopWords.has(w));
    
    // Check if "When To Use" trigger line is sparse (≤3 keywords)
    const whenMatch = content.match(/Trigger keywords: "([^"]*)"(?:, "([^"]*)")?(?:, "([^"]*)")?/);
    if (whenMatch) {
      const existing = [whenMatch[1], whenMatch[2], whenMatch[3]].filter(Boolean);
      if (existing.length <= 3 && descWords.length > 0) {
        // Add up to 5 description-derived keywords
        const bonus = descWords.filter(w => !existing.some(e => e.toLowerCase() === w)).slice(0, 5);
        if (bonus.length > 0) {
          const allKw = [...existing, ...bonus].map(k => `"${k}"`).join(', ');
          content = content.replace(/Trigger keywords: [^\n]+/, `Trigger keywords: ${allKw}`);
          changed = true;
        }
      }
    }
  }
  
  // Fix 4: Collapse resulting double blank lines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  if (changed) {
    fs.writeFileSync(fp, content, 'utf8');
    fixed++;
  }
}
console.log(`Cleanup pass complete: ${fixed}/${dirs.length} files touched`);