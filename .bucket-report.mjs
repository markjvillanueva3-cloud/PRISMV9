import fs from 'fs';
const d=JSON.parse(fs.readFileSync('H:/prism/.bucket-cache.json','utf8'));
const {buckets,byBucket}=d;
const total=Object.values(buckets).reduce((a,b)=>a+b,0);
console.log('## Bucket counts');
console.log('| Bucket | Count | % |');
for(const [k,v] of Object.entries(buckets))console.log(`| ${k} | ${v} | ${(v/total*100).toFixed(1)}% |`);

// Top OBSOLETE = high shipped count, low/zero pending — already-shipped milestones still flagged pending in envelope
const obs=[...byBucket.OBSOLETE].sort((a,b)=>b.shipped-a.shipped).slice(0,10);
console.log('\n## Top 10 OBSOLETE');
for(const x of obs)console.log(`- ${x.id} | ship=${x.shipped} pend=${x.pending} | ${x.title.slice(0,70)} | last=${x.lastShipped.slice(0,10)}`);

// Top DORMANT-IDLE: highest pending unit count, zero shipped, no lastShipped
const idle=[...byBucket['DORMANT-IDLE']].sort((a,b)=>b.pending-a.pending).slice(0,10);
console.log('\n## Top 10 DORMANT-IDLE');
for(const x of idle)console.log(`- ${x.id} | pend=${x.pending} | ${x.title.slice(0,70)}`);

// Top-5 prefix tags per bucket
function tagsOf(arr){const t={};for(const x of arr){const tag=x.id.split('-')[0];t[tag]=(t[tag]||0)+1;}return Object.entries(t).sort((a,b)=>b[1]-a[1]).slice(0,5);}
console.log('\n## Top-5 tags per bucket');
for(const b of ['ACTIVE','DORMANT-PROGRESSING','DORMANT-IDLE','OBSOLETE']){
  const t=tagsOf(byBucket[b]);
  console.log(`${b}: ${t.map(([k,c])=>`${k}(${c})`).join(', ')}`);
}

// Auto-flip estimate: OBSOLETE with pending=0 are pure envelope-drift; safe to flip
const safeFlip=byBucket.OBSOLETE.filter(x=>x.pending===0).length;
const partialDrift=byBucket.OBSOLETE.filter(x=>x.pending>0).length;
console.log(`\n## Auto-flip estimate`);
console.log(`OBSOLETE-clean (pending=0, fully shipped): ${safeFlip} (${(safeFlip/total*100).toFixed(1)}% of 900)`);
console.log(`OBSOLETE-partial (some pending remain): ${partialDrift} (${(partialDrift/total*100).toFixed(1)}% of 900)`);
