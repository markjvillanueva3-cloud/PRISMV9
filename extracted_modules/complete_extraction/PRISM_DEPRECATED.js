const PRISM_DEPRECATED = {
    modules: new Map(),

    register: function(oldName, newAuthority, reason) {
        this.modules.set(oldName, { newAuthority, reason, warned: false, warnCount: 0 });
    },
    check: function(moduleName) {
        const dep = this.modules.get(moduleName);
        if (dep) {
            dep.warnCount++;
            if (!dep.warned || dep.warnCount % 100 === 0) {
                console.warn(`[DEPRECATED] ${moduleName} → Use ${dep.newAuthority}. Reason: ${dep.reason}`);
                dep.warned = true;
            }
        }
        return dep;
    },
    list: function() {
        const result = [];
        this.modules.forEach((v, k) => result.push({ old: k, new: v.newAuthority, reason: v.reason }));
        return result;
    }
}