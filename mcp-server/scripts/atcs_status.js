#!/usr/bin/env node
/**
 * ATCS Status Check — Quick status across all active autonomous tasks
 * Usage: node scripts/atcs_status.js [task-id]
 */
const fs = require('fs');
const path = require('path');

const TASKS_DIR = 'C:\\PRISM\\autonomous-tasks';

function getTaskStatus(taskDir) {
  const manifestPath = path.join(taskDir, 'TASK_MANIFEST.json');
  if (!fs.existsSync(manifestPath)) return null;
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const queuePath = path.join(taskDir, 'WORK_QUEUE.json');
  let queueStats = { total: 0, completed: 0, failed: 0, pending: 0 };
  
  if (fs.existsSync(queuePath)) {
    const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
    const units = queue.units || [];
    queueStats.total = units.length;
    queueStats.completed = units.filter(u => u.status === 'COMPLETED').length;
    queueStats.failed = units.filter(u => u.status === 'FAILED').length;
    queueStats.pending = units.filter(u => u.status === 'PENDING').length;
  }
  
  const progress = queueStats.total > 0 ? ((queueStats.completed / queueStats.total) * 100).toFixed(1) : 0;
  
  return {
    task_id: manifest.task_id,
    description: manifest.description,
    status: manifest.status,
    progress: `${progress}%`,
    units: queueStats,
    current_batch: manifest.current_batch || 0,
    current_unit: manifest.current_unit_pointer || 0,
    created: manifest.created_at,
    updated: manifest.updated_at
  };
}

function main() {
  const taskId = process.argv[2];
  
  if (!fs.existsSync(TASKS_DIR)) {
    console.log('No autonomous tasks directory found.');
    return;
  }
  
  const dirs = fs.readdirSync(TASKS_DIR).filter(d => 
    fs.statSync(path.join(TASKS_DIR, d)).isDirectory()
  );
  
  if (taskId) {
    const taskDir = path.join(TASKS_DIR, taskId);
    const status = getTaskStatus(taskDir);
    if (status) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log(`Task ${taskId} not found.`);
    }
    return;
  }
  
  console.log(`\n=== ATCS Task Status (${dirs.length} tasks) ===\n`);
  for (const dir of dirs) {
    const status = getTaskStatus(path.join(TASKS_DIR, dir));
    if (status) {
      const emoji = status.status === 'COMPLETED' ? '\u2705' : status.status === 'IN_PROGRESS' ? '\u23F3' : '\u23F8\uFE0F';
      console.log(`${emoji} ${status.task_id}: ${status.progress} (${status.units.completed}/${status.units.total}) - ${status.description}`);
    }
  }
}

main();
