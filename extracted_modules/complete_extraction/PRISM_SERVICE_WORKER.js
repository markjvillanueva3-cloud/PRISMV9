const PRISM_SERVICE_WORKER = {
    registration: null,
    supported: 'serviceWorker' in navigator,
    
    async register() {
        if (!this.supported) {
            console.warn('[PRISM_SERVICE_WORKER] Service Workers not supported');
            return false;
        }
        
        try {
            // Create service worker blob (inline for single-file app)
            const swCode = this._getServiceWorkerCode();
            const blob = new Blob([swCode], { type: 'application/javascript' });
            const swUrl = URL.createObjectURL(blob);
            
            this.registration = await navigator.serviceWorker.register(swUrl);
            console.log('[PRISM_SERVICE_WORKER] Registered successfully');
            
            // Listen for updates
            this.registration.addEventListener('updatefound', () => {
                console.log('[PRISM_SERVICE_WORKER] Update found');
                if (typeof PRISM_TOAST !== 'undefined') {
                    PRISM_TOAST.info('Update available. Refresh to apply.');
                }
            });
            
            return true;
        } catch (error) {
            console.error('[PRISM_SERVICE_WORKER] Registration failed:', error);
            return false;
        }
    },
    
    _getServiceWorkerCode() {
        return `
            const CACHE_NAME = 'prism-v8.65';
            const OFFLINE_URL = '/offline.html';
            
            self.addEventListener('install', (event) => {
                event.waitUntil(
                    caches.open(CACHE_NAME).then((cache) => {
                        return cache.addAll([
                            '/',
                            '/index.html'
                        ]);
                    })
                );
                self.skipWaiting();
            });
            
            self.addEventListener('activate', (event) => {
                event.waitUntil(
                    caches.keys().then((cacheNames) => {
                        return Promise.all(
                            cacheNames
                                .filter(name => name !== CACHE_NAME)
                                .map(name => caches.delete(name))
                        );
                    })
                );
                self.clients.claim();
            });
            
            self.addEventListener('fetch', (event) => {
                event.respondWith(
                    caches.match(event.request).then((response) => {
                        if (response) {
                            return response;
                        }
                        return fetch(event.request).then((response) => {
                            if (!response || response.status !== 200) {
                                return response;
                            }
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                            return response;
                        });
                    }).catch(() => {
                        return caches.match(OFFLINE_URL);
                    })
                );
            });
        `;
    },
    
    async unregister() {
        if (this.registration) {
            await this.registration.unregister();
            this.registration = null;
            console.log('[PRISM_SERVICE_WORKER] Unregistered');
            return true;
        }
        return false;
    },
    
    async update() {
        if (this.registration) {
            await this.registration.update();
            return true;
        }
        return false;
    },
    
    isOnline() {
        return navigator.onLine;
    },
    
    getStatus() {
        return {
            supported: this.supported,
            registered: this.registration !== null,
            online: this.isOnline()
        };
    },
    
    selfTest() {
        return [{
            test: 'Service Worker support',
            passed: this.supported,
            message: this.supported ? 'Supported' : 'Not supported'
        }];
    }
}