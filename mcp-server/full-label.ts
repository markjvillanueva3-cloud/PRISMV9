import { programLabelingPipelineEngine } from './src/engines/ProgramLabelingPipelineEngine.js';

const config = {
  rootPath: 'H:/PRISM/JM DIE/CNC LATHE',
  filePattern: '**/*.MIN',
  batchSize: 500,
  outputPath: 'H:/PRISM/mcp-server/data/training/program-labels-full.json',
  skipExisting: false,
  maxFiles: undefined // Process all
};

console.log('Starting FULL batch labeling...');
console.log('Root:', config.rootPath);

const startTime = Date.now();
programLabelingPipelineEngine.labelBatch(config).then(stats => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== FULL BATCH COMPLETE ===');
  console.log('Time:', elapsed, 'seconds');
  console.log('Stats:', JSON.stringify(stats, null, 2));
}).catch(err => {
  console.error('Error:', err.message);
});
