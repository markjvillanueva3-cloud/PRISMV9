const PRISM_SCHEDULER = {
    // Create a task scheduler
    create(options = {}) {
        return {
            tasks: new Map(),
            queue: [],
            running: new Set(),
            completed: new Set(),
            failed: new Map(),
            maxConcurrency: options.maxConcurrency || 4,
            paused: false,
            
            // Add a task
            add(id, task, options = {}) {
                if (this.tasks.has(id)) {
                    throw new Error(`Task already exists: ${id}`);
                }
                
                const taskEntry = {
                    id,
                    task,
                    priority: options.priority || 0,
                    dependencies: options.dependencies || [],
                    timeout: options.timeout || 0,
                    retries: options.retries || 0,
                    retryCount: 0,
                    status: 'pending', // pending, waiting, running, completed, failed
                    result: null,
                    error: null,
                    startTime: null,
                    endTime: null
                };
                
                this.tasks.set(id, taskEntry);
                this.queue.push(id);
                this._sortQueue();
                
                return this;
            },
            
            // Execute all tasks
            async run() {
                const promises = [];
                
                while (!this.paused) {
                    // Get next runnable task
                    const taskId = this._getNextRunnable();
                    
                    if (!taskId) {
                        // No runnable tasks - wait for running tasks or break
                        if (this.running.size === 0) {
                            break;
                        }
                        await Promise.race(promises);
                        continue;
                    }
                    
                    // Start task
                    const promise = this._runTask(taskId);
                    promises.push(promise);
                    
                    // Respect concurrency limit
                    if (this.running.size >= this.maxConcurrency) {
                        await Promise.race(promises);
                    }
                }
                
                // Wait for all running tasks
                await Promise.all(promises);
                
                return this._getResults();
            },
            
            // Run a single task
            async _runTask(taskId) {
                const taskEntry = this.tasks.get(taskId);
                taskEntry.status = 'running';
                taskEntry.startTime = Date.now();
                this.running.add(taskId);
                
                try {
                    // Set up timeout
                    let timeoutId = null;
                    const timeoutPromise = taskEntry.timeout > 0
                        ? new Promise((_, reject) => {
                            timeoutId = setTimeout(() => {
                                reject(new Error(`Task timeout: ${taskId}`));
                            }, taskEntry.timeout);
                        })
                        : null;
                    
                    // Execute task
                    const taskPromise = taskEntry.task();
                    
                    const result = timeoutPromise
                        ? await Promise.race([taskPromise, timeoutPromise])
                        : await taskPromise;
                    
                    if (timeoutId) clearTimeout(timeoutId);
                    
                    // Success
                    taskEntry.status = 'completed';
                    taskEntry.result = result;
                    taskEntry.endTime = Date.now();
                    this.completed.add(taskId);
                    
                } catch (error) {
                    // Handle failure
                    taskEntry.retryCount++;
                    
                    if (taskEntry.retryCount <= taskEntry.retries) {
                        // Retry
                        console.log(`[Scheduler] Retrying task ${taskId} (${taskEntry.retryCount}/${taskEntry.retries})`);
                        taskEntry.status = 'pending';
                        this.queue.push(taskId);
                        this._sortQueue();
                    } else {
                        // Failed
                        taskEntry.status = 'failed';
                        taskEntry.error = error;
                        taskEntry.endTime = Date.now();
                        this.failed.set(taskId, error);
                    }
                }
                
                this.running.delete(taskId);
            },
            
            // Get next runnable task
            _getNextRunnable() {
                for (let i = 0; i < this.queue.length; i++) {
                    const taskId = this.queue[i];
                    const taskEntry = this.tasks.get(taskId);
                    
                    // Check dependencies
                    const depsCompleted = taskEntry.dependencies.every(dep => 
                        this.completed.has(dep)
                    );
                    
                    const depsFailed = taskEntry.dependencies.some(dep =>
                        this.failed.has(dep)
                    );
                    
                    if (depsFailed) {
                        // Mark as failed due to dependency
                        taskEntry.status = 'failed';
                        taskEntry.error = new Error('Dependency failed');
                        this.failed.set(taskId, taskEntry.error);
                        this.queue.splice(i, 1);
                        i--;
                        continue;
                    }
                    
                    if (depsCompleted) {
                        this.queue.splice(i, 1);
                        return taskId;
                    }
                }
                
                return null;
            },
            
            _sortQueue() {
                this.queue.sort((a, b) => {
                    const taskA = this.tasks.get(a);
                    const taskB = this.tasks.get(b);
                    return taskB.priority - taskA.priority;
                });
            },
            
            _getResults() {
                const results = {};
                for (const [id, task] of this.tasks) {
                    results[id] = {
                        status: task.status,
                        result: task.result,
                        error: task.error?.message,
                        duration: task.endTime ? task.endTime - task.startTime : null
                    };
                }
                return results;
            },
            
            // Pause execution
            pause() {
                this.paused = true;
            },
            
            // Resume execution
            resume() {
                this.paused = false;
                return this.run();
            },
            
            // Cancel a task
            cancel(taskId) {
                const idx = this.queue.indexOf(taskId);
                if (idx >= 0) {
                    this.queue.splice(idx, 1);
                    const task = this.tasks.get(taskId);
                    task.status = 'cancelled';
                    return true;
                }
                return false;
            },
            
            // Get task status
            getStatus(taskId) {
                const task = this.tasks.get(taskId);
                return task ? task.status : null;
            },
            
            // Get all statuses
            getStats() {
                return {
                    total: this.tasks.size,
                    pending: this.queue.length,
                    running: this.running.size,
                    completed: this.completed.size,
                    failed: this.failed.size
                };
            },
            
            // Clear completed/failed tasks
            clear() {
                for (const id of this.completed) {
                    this.tasks.delete(id);
                }
                for (const id of this.failed.keys()) {
                    this.tasks.delete(id);
                }
                this.completed.clear();
                this.failed.clear();
            }
        };
    },
    
    // Create a worker pool
    createWorkerPool(workerScript, poolSize = 4) {
        return {
            workers: [],
            available: [],
            taskQueue: [],
            
            init() {
                for (let i = 0; i < poolSize; i++) {
                    const worker = new Worker(workerScript);
                    worker.id = i;
                    this.workers.push(worker);
                    this.available.push(worker);
                }
            },
            
            async execute(taskData) {
                return new Promise((resolve, reject) => {
                    const task = {
                        data: taskData,
                        resolve,
                        reject
                    };
                    
                    if (this.available.length > 0) {
                        this._runOnWorker(this.available.pop(), task);
                    } else {
                        this.taskQueue.push(task);
                    }
                });
            },
            
            _runOnWorker(worker, task) {
                const handler = (e) => {
                    worker.removeEventListener('message', handler);
                    worker.removeEventListener('error', errorHandler);
                    
                    this.available.push(worker);
                    this._processQueue();
                    
                    task.resolve(e.data);
                };
                
                const errorHandler = (e) => {
                    worker.removeEventListener('message', handler);
                    worker.removeEventListener('error', errorHandler);
                    
                    this.available.push(worker);
                    this._processQueue();
                    
                    task.reject(e.error);
                };
                
                worker.addEventListener('message', handler);
                worker.addEventListener('error', errorHandler);
                worker.postMessage(task.data);
            },
            
            _processQueue() {
                while (this.taskQueue.length > 0 && this.available.length > 0) {
                    const task = this.taskQueue.shift();
                    const worker = this.available.pop();
                    this._runOnWorker(worker, task);
                }
            },
            
            terminate() {
                for (const worker of this.workers) {
                    worker.terminate();
                }
                this.workers = [];
                this.available = [];
            },
            
            getStats() {
                return {
                    totalWorkers: this.workers.length,
                    available: this.available.length,
                    queuedTasks: this.taskQueue.length
                };
            }
        };
    }
}