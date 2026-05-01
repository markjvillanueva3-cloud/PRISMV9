const {registryManager} = require('./dist/bundle.cjs');

async function test() {
  console.log('Initializing registries...');
  await registryManager.initialize();
  
  const skills = registryManager.skills.all();
  const agents = registryManager.agents.all();
  const alarms = registryManager.alarms.all();
  const hooks = registryManager.hooks.all();
  
  console.log('\n=== REGISTRY STATUS ===');
  console.log('SKILLS:', skills.length);
  console.log('AGENTS:', agents.length);
  console.log('ALARMS:', alarms.length);
  console.log('HOOKS:', hooks.length);
  
  if (skills.length > 0) {
    console.log('\n=== SAMPLE SKILLS ===');
    skills.slice(0, 3).forEach(s => {
      console.log(`  ${s.skill_id} | ${s.category} | ${s.name}`);
    });
  }
  
  if (agents.length > 0) {
    console.log('\n=== SAMPLE AGENTS ===');
    agents.slice(0, 3).forEach(a => {
      console.log(`  ${a.agent_id} | ${a.tier} | ${a.name}`);
    });
  }
  
  console.log('\n✅ Registry test complete');
}

test().catch(e => console.error('ERROR:', e));
