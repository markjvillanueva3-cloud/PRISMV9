const PRISM_PIPELINE = {
    // Create a pipeline
    create(options = {}) {
        return {
            stages: [],
            errorHandler: options.errorHandler || console.error,
            
            // Add a stage
            pipe(stage) {
                this.stages.push(this._wrapStage(stage));
                return this;
            },
            
            // Add a filter stage
            filter(predicate) {
                return this.pipe({
                    name: 'filter',
                    process: async (items) => {
                        if (Array.isArray(items)) {
                            const results = [];
                            for (const item of items) {
                                if (await predicate(item)) {
                                    results.push(item);
                                }
                            }
                            return results;
                        }
                        return await predicate(items) ? items : null;
                    }
                });
            },
            
            // Add a map stage
            map(transform) {
                return this.pipe({
                    name: 'map',
                    process: async (items) => {
                        if (Array.isArray(items)) {
                            const results = [];
                            for (const item of items) {
                                results.push(await transform(item));
                            }
                            return results;
                        }
                        return await transform(items);
                    }
                });
            },
            
            // Add a reduce stage
            reduce(reducer, initial) {
                return this.pipe({
                    name: 'reduce',
                    process: async (items) => {
                        if (!Array.isArray(items)) {
                            items = [items];
                        }
                        let acc = initial;
                        for (const item of items) {
                            acc = await reducer(acc, item);
                        }
                        return acc;
                    }
                });
            },
            
            // Add a batch stage
            batch(size) {
                return this.pipe({
                    name: 'batch',
                    buffer: [],
                    process: async function(item) {
                        this.buffer.push(item);
                        if (this.buffer.length >= size) {
                            const batch = this.buffer.splice(0, size);
                            return batch;
                        }
                        return null;
                    },
                    flush: async function() {
                        const remaining = this.buffer.splice(0);
                        return remaining.length > 0 ? remaining : null;
                    }
                });
            },
            
            // Add a debounce stage
            debounce(delay) {
                let timeout = null;
                let lastItem = null;
                
                return this.pipe({
                    name: 'debounce',
                    process: async (item) => {
                        return new Promise(resolve => {
                            lastItem = item;
                            if (timeout) clearTimeout(timeout);
                            timeout = setTimeout(() => {
                                resolve(lastItem);
                                lastItem = null;
                            }, delay);
                        });
                    }
                });
            },
            
            // Add a throttle stage
            throttle(interval) {
                let lastTime = 0;
                
                return this.pipe({
                    name: 'throttle',
                    process: async (item) => {
                        const now = Date.now();
                        if (now - lastTime >= interval) {
                            lastTime = now;
                            return item;
                        }
                        return null;
                    }
                });
            },
            
            // Add a tap stage (for side effects)
            tap(fn) {
                return this.pipe({
                    name: 'tap',
                    process: async (item) => {
                        await fn(item);
                        return item;
                    }
                });
            },
            
            // Add error catching
            catch(handler) {
                this.errorHandler = handler;
                return this;
            },
            
            // Run pipeline on input
            async run(input) {
                let data = input;
                
                for (const stage of this.stages) {
                    if (data === null || data === undefined) {
                        break;
                    }
                    
                    try {
                        data = await stage.process(data);
                    } catch (error) {
                        if (this.errorHandler) {
                            this.errorHandler(error, stage.name);
                        }
                        throw error;
                    }
                }
                
                // Flush remaining data in batch stages
                for (const stage of this.stages) {
                    if (stage.flush) {
                        const flushed = await stage.flush();
                        if (flushed !== null) {
                            // Process flushed data through remaining stages
                        }
                    }
                }
                
                return data;
            },
            
            // Process a stream
            async *stream(inputStream) {
                for await (const input of inputStream) {
                    const result = await this.run(input);
                    if (result !== null && result !== undefined) {
                        yield result;
                    }
                }
            },
            
            // Clone the pipeline
            clone() {
                const cloned = PRISM_PIPELINE.create({ errorHandler: this.errorHandler });
                cloned.stages = [...this.stages];
                return cloned;
            },
            
            _wrapStage(stage) {
                if (typeof stage === 'function') {
                    return { name: 'anonymous', process: stage };
                }
                return stage;
            }
        };
    },
    
    // Create a parallel pipeline
    parallel(...pipelines) {
        return {
            name: 'parallel',
            pipelines,
            
            async run(input) {
                const results = await Promise.all(
                    this.pipelines.map(p => p.run(input))
                );
                return results;
            }
        };
    },
    
    // Create a conditional pipeline
    branch(condition, truePipeline, falsePipeline = null) {
        return {
            name: 'branch',
            
            async run(input) {
                if (await condition(input)) {
                    return truePipeline ? truePipeline.run(input) : input;
                }
                return falsePipeline ? falsePipeline.run(input) : input;
            }
        };
    },
    
    // Merge multiple streams
    merge(...pipelines) {
        return {
            name: 'merge',
            pipelines,
            
            async *stream(inputs) {
                // Interleave results from all pipelines
                const iterators = inputs.map((input, i) => 
                    this.pipelines[i].stream(input)
                );
                
                let active = iterators.length;
                
                while (active > 0) {
                    const promises = iterators.map((iter, i) => 
                        iter.next().then(result => ({ index: i, result }))
                    );
                    
                    const { index, result } = await Promise.race(promises);
                    
                    if (result.done) {
                        active--;
                        iterators[index] = { next: () => new Promise(() => {}) };
                    } else {
                        yield result.value;
                    }
                }
            }
        };
    }
}