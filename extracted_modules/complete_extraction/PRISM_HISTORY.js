const PRISM_HISTORY = {
    undoStack: [],
    redoStack: [],
    maxSize: 100,
    isExecuting: false,
    
    execute(command) {
        if (!command || typeof command.execute !== 'function' || typeof command.undo !== 'function') {
            console.error('[PRISM_HISTORY] Invalid command - must have execute() and undo()');
            return false;
        }
        
        try {
            this.isExecuting = true;
            command.execute();
            this.isExecuting = false;
            
            this.undoStack.push(command);
            this.redoStack = []; // Clear redo on new action
            
            // Enforce max size
            if (this.undoStack.length > this.maxSize) {
                this.undoStack.shift();
            }
            
            this._notifyChange();
            return true;
        } catch (error) {
            this.isExecuting = false;
            console.error('[PRISM_HISTORY] Command execution failed:', error);
            return false;
        }
    },
    
    undo() {
        if (this.undoStack.length === 0) {
            console.log('[PRISM_HISTORY] Nothing to undo');
            return false;
        }
        
        try {
            const command = this.undoStack.pop();
            this.isExecuting = true;
            command.undo();
            this.isExecuting = false;
            this.redoStack.push(command);
            this._notifyChange();
            return true;
        } catch (error) {
            this.isExecuting = false;
            console.error('[PRISM_HISTORY] Undo failed:', error);
            return false;
        }
    },
    
    redo() {
        if (this.redoStack.length === 0) {
            console.log('[PRISM_HISTORY] Nothing to redo');
            return false;
        }
        
        try {
            const command = this.redoStack.pop();
            this.isExecuting = true;
            command.execute();
            this.isExecuting = false;
            this.undoStack.push(command);
            this._notifyChange();
            return true;
        } catch (error) {
            this.isExecuting = false;
            console.error('[PRISM_HISTORY] Redo failed:', error);
            return false;
        }
    },
    
    _notifyChange() {
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('history:changed', {
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                undoCount: this.undoStack.length,
                redoCount: this.redoStack.length
            });
        }
    },
    
    canUndo() { return this.undoStack.length > 0; },
    canRedo() { return this.redoStack.length > 0; },
    
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this._notifyChange();
    },
    
    getStatus() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            maxSize: this.maxSize,
            lastCommand: this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].name : null
        };
    },
    
    selfTest() {
        const results = [];
        
        // Create test target
        const testObj = { value: 0 };
        
        // Test command execution
        const command = new SetValueCommand(testObj, 'value', 10);
        this.execute(command);
        results.push({
            test: 'Command execution',
            passed: testObj.value === 10,
            message: `Value: ${testObj.value}`
        });
        
        // Test undo
        this.undo();
        results.push({
            test: 'Undo',
            passed: testObj.value === 0,
            message: `Value after undo: ${testObj.value}`
        });
        
        // Test redo
        this.redo();
        results.push({
            test: 'Redo',
            passed: testObj.value === 10,
            message: `Value after redo: ${testObj.value}`
        });
        
        // Cleanup
        this.clear();
        
        return results;
    }
}