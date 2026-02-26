const PRISM_WORKER_POOL = {
    workers: [],
    maxWorkers: navigator.hardwareConcurrency || 4,
    taskQueue: [],
    taskId: 0,
    pendingTasks: new Map(),
    initialized: false,
    
    init() {
        if (this.initialized) return;
        
        for (let i = 0; i < this.maxWorkers; i++) {
            const worker = new Worker(this._createWorkerBlob());
            worker.busy = false;
            worker.id = i;
            worker.onmessage = (e) => this._handleResult(worker, e.data);
            worker.onerror = (e) => this._handleError(worker, e);
            this.workers.push(worker);
        }
        
        this.initialized = true;
        console.log(`[PRISM_WORKER_POOL] Initialized with ${this.maxWorkers} workers`);
    },
    
    _createWorkerBlob() {
        const code = `
            // Worker code for heavy calculations
            self.onmessage = async function(e) {
                const { id, task, params } = e.data;
                
                try {
                    let result;
                    
                    switch(task) {
                        case 'matrixMultiply':
                            result = matrixMultiply(params.a, params.b);
                            break;
                        case 'sortLarge':
                            result = quickSort(params.array);
                            break;
                        case 'calculateHash':
                            result = await calculateHash(params.data);
                            break;
                        case 'searchArray':
                            result = searchArray(params.array, params.query, params.key);
                            break;
                        case 'aggregate':
                            result = aggregate(params.data, params.operation);
                            break;
                        case 'custom':
                            // Execute custom function code
                            const fn = new Function('params', params.code);
                            result = fn(params.args);
                            break;
                        default:
                            throw new Error('Unknown task: ' + task);
                    }
                    
                    self.postMessage({ id, success: true, result });
                } catch (error) {
                    self.postMessage({ id, success: false, error: error.message });
                }
            };
            
            function matrixMultiply(a, b) {
                const rowsA = a.length, colsA = a[0].length;
                const colsB = b[0].length;
                const result = Array(rowsA).fill().map(() => Array(colsB).fill(0));
                
                for (let i = 0; i < rowsA; i++) {
                    for (let j = 0; j < colsB; j++) {
                        for (let k = 0; k < colsA; k++) {
                            result[i][j] += a[i][k] * b[k][j];
                        }
                    }
                }
                return result;
            }
            
            function quickSort(arr) {
                if (arr.length <= 1) return arr;
                const pivot = arr[Math.floor(arr.length / 2)];
                const left = arr.filter(x => x < pivot);
                const middle = arr.filter(x => x === pivot);
                const right = arr.filter(x => x > pivot);
                return [...quickSort(left), ...middle, ...quickSort(right)];
            }
            
            async function calculateHash(data) {
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(data);
                const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
            
            function searchArray(array, query, key) {
                const q = query.toLowerCase();
                return array.filter(item => {
                    const value = key ? item[key] : item;
                    return String(value).toLowerCase().includes(q);
                });
            }
            
            function aggregate(data, operation) {
                switch(operation) {
                    case 'sum': return data.reduce((a, b) => a + b, 0);
                    case 'avg': return data.reduce((a, b) => a + b, 0) / data.length;
                    case 'min': return Math.min(...data);
                    case 'max': return Math.max(...data);
                    case 'count': return data.length;
                    default: return null;
                }
            }
        `;
        
        return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    },
    
    async execute(task, params = {}) {
        if (!this.initialized) this.init();
        
        return new Promise((resolve, reject) => {
            const id = ++this.taskId;
            const job = { id, task, params, resolve, reject };
            
            const availableWorker = this.workers.find(w => !w.busy);
            if (availableWorker) {
                this._runOnWorker(availableWorker, job);
            } else {
                this.taskQueue.push(job);
            }
        });
    },
    
    _runOnWorker(worker, job) {
        worker.busy = true;
        this.pendingTasks.set(job.id, { job, worker });
        worker.postMessage({ id: job.id, task: job.task, params: job.params });
    },
    
    _handleResult(worker, data) {
        const pending = this.pendingTasks.get(data.id);
        if (!pending) return;
        
        const { job } = pending;
        this.pendingTasks.delete(data.id);
        worker.busy = false;
        
        if (data.success) {
            job.resolve(data.result);
        } else {
            job.reject(new Error(data.error));
        }
        
        // Process next queued task
        if (this.taskQueue.length > 0) {
            const nextJob = this.taskQueue.shift();
            this._runOnWorker(worker, nextJob);
        }
    },
    
    _handleError(worker, error) {
        console.error(`[PRISM_WORKER_POOL] Worker ${worker.id} error:`, error);
        worker.busy = false;
    },
    
    getStatus() {
        return {
            workers: this.workers.length,
            busy: this.workers.filter(w => w.busy).length,
            queued: this.taskQueue.length,
            completed: this.taskId - this.pendingTasks.size - this.taskQueue.length
        };
    },
    
    terminate() {
        this.workers.forEach(w => w.terminate());
        this.workers = [];
        this.initialized = false;
    },
    
    selfTest() {
        const results = [];
        
        this.init();
        results.push({
            test: 'Worker pool initialization',
            passed: this.workers.length === this.maxWorkers,
            message: `${this.workers.length} workers created`
        });
        
        return results;
    }
}