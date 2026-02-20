const PRISM_DATABASE_STATE = {
    version: '1.0.0',

    databases: {},
    subscribers: [],

    /**
     * Register a database for tracking
     */
    registerDatabase(name, data, options = {}) {
        this.databases[name] = {
            data: data,
            version: 1,
            lastModified: Date.now(),
            options: {
                immutable: options.immutable || false,
                validationFn: options.validationFn || null
            }
        };
        console.log(`[PRISM_DB] Registered database: ${name}`);
        return this;
    },
    /**
     * Get database data
     */
    getData(name) {
        return this.databases[name]?.data || null;
    },
    /**
     * Get database version
     */
    getVersion(name) {
        return this.databases[name]?.version || 0;
    },
    /**
     * Update database data
     */
    update(name, updater) {
        const db = this.databases[name];
        if (!db) {
            console.error(`[PRISM_DB] Unknown database: ${name}`);
            return false;
        }
        const oldData = db.data;
        let newData;

        if (typeof updater === 'function') {
            newData = updater(oldData);
        } else {
            newData = updater;
        }
        if (db.options.validationFn) {
            const validation = db.options.validationFn(newData);
            if (!validation.valid) {
                console.error(`[PRISM_DB] Validation failed for ${name}:`, validation.errors);
                return false;
            }
        }
        db.data = newData;
        db.version++;
        db.lastModified = Date.now();

        this._notify(name, newData, oldData);

        return true;
    },
    /**
     * Add item to database
     */
    addItem(name, key, item) {
        const db = this.databases[name];
        if (!db) return false;

        if (Array.isArray(db.data)) {
            db.data = [...db.data, item];
        } else if (typeof db.data === 'object') {
            db.data = { ...db.data, [key]: item };
        } else {
            return false;
        }
        db.version++;
        db.lastModified = Date.now();
        this._notify(name, db.data, null);

        return true;
    },
    /**
     * Subscribe to database changes
     */
    subscribe(callback, filter = null) {
        const subscription = {
            id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            callback,
            filter
        };
        this.subscribers.push(subscription);

        return () => {
            const idx = this.subscribers.findIndex(s => s.id === subscription.id);
            if (idx !== -1) this.subscribers.splice(idx, 1);
        };
    },
    /**
     * Get all database metadata
     */
    getMetadata() {
        const meta = {};
        for (const [name, db] of Object.entries(this.databases)) {
            meta[name] = {
                version: db.version,
                lastModified: db.lastModified,
                itemCount: Array.isArray(db.data) ? db.data.length :
                          typeof db.data === 'object' ? Object.keys(db.data).length : 1
            };
        }
        return meta;
    },
    _notify(name, newData, oldData) {
        for (const sub of this.subscribers) {
            if (sub.filter === null ||
                sub.filter === name ||
                (Array.isArray(sub.filter) && sub.filter.includes(name))) {
                try {
                    sub.callback(name, newData, oldData, this.databases[name].version);
                } catch (e) {
                    console.error('[PRISM_DB] Subscriber error:', e);
                }
            }
        }
        PRISM_EVENT_BUS.publish('database:changed', {
            name,
            version: this.databases[name].version
        }, { source: 'DATABASE_STATE' });
    }
}