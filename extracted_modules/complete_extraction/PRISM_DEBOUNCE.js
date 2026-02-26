const PRISM_DEBOUNCE = {
    // Debounce: Execute after delay, reset on each call
    debounce(fn, delay = 300) {
        let timeoutId = null;
        
        const debounced = function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                fn.apply(this, args);
            }, delay);
        };
        
        debounced.cancel = () => {
            clearTimeout(timeoutId);
        };
        
        debounced.flush = () => {
            clearTimeout(timeoutId);
            fn();
        };
        
        return debounced;
    },
    
    // Throttle: Execute at most once per interval
    throttle(fn, interval = 300) {
        let lastTime = 0;
        let timeoutId = null;
        
        const throttled = function(...args) {
            const now = Date.now();
            const remaining = interval - (now - lastTime);
            
            if (remaining <= 0) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                lastTime = now;
                fn.apply(this, args);
            } else if (!timeoutId) {
                timeoutId = setTimeout(() => {
                    lastTime = Date.now();
                    timeoutId = null;
                    fn.apply(this, args);
                }, remaining);
            }
        };
        
        throttled.cancel = () => {
            clearTimeout(timeoutId);
            timeoutId = null;
        };
        
        return throttled;
    },
    
    // Leading edge debounce: Execute immediately, then ignore for delay
    debounceLeading(fn, delay = 300) {
        let timeoutId = null;
        let canRun = true;
        
        return function(...args) {
            if (canRun) {
                fn.apply(this, args);
                canRun = false;
            }
            
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                canRun = true;
            }, delay);
        };
    },
    
    // Request Animation Frame throttle
    rafThrottle(fn) {
        let rafId = null;
        let lastArgs = null;
        
        const throttled = function(...args) {
            lastArgs = args;
            
            if (rafId === null) {
                rafId = requestAnimationFrame(() => {
                    fn.apply(this, lastArgs);
                    rafId = null;
                });
            }
        };
        
        throttled.cancel = () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };
        
        return throttled;
    },
    
    selfTest() {
        const results = [];
        
        // Test debounce
        let callCount = 0;
        const debounced = this.debounce(() => callCount++, 50);
        
        debounced();
        debounced();
        debounced();
        
        results.push({
            test: 'Debounce immediate',
            passed: callCount === 0,
            message: `Called ${callCount} times (should be 0)`
        });
        
        // Test throttle
        let throttleCount = 0;
        const throttled = this.throttle(() => throttleCount++, 50);
        
        throttled();
        throttled();
        throttled();
        
        results.push({
            test: 'Throttle first call',
            passed: throttleCount === 1,
            message: `Called ${throttleCount} times (should be 1)`
        });
        
        return results;
    }
}