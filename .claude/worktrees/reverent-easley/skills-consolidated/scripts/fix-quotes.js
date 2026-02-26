const fs = require('fs');
const files = [
  'C:/PRISM/skills-consolidated/scripts/update-skill-index.ps1',
  'C:/PRISM/skills-consolidated/scripts/split-skill.ps1',
  'C:/PRISM/skills-consolidated/scripts/extract-course-skills.ps1'
];
files.forEach(p => {
  let t = fs.readFileSync(p, 'utf8');
  t = t.replace(/\u201c/g, '"');
  t = t.replace(/\u201d/g, '"');
  t = t.replace(/\u2018/g, "'");
  t = t.replace(/\u2019/g, "'");
  t = t.replace(/\u2013/g, '-');
  t = t.replace(/\u2014/g, '-');
  fs.writeFileSync(p, t, 'utf8');
  console.log('Fixed: ' + p);
});
