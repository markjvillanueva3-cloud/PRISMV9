const PRISM_DEV_ENHANCEMENT_GATEWAY_ROUTES = {
    // UI/UX
    'ui.theme.toggle': 'PRISM_THEME_MANAGER.toggle',
    'ui.theme.set': 'PRISM_THEME_MANAGER.setTheme',
    'ui.theme.get': 'PRISM_THEME_MANAGER.getCurrentTheme',
    'ui.shortcuts.getHelp': 'PRISM_SHORTCUTS.getHelp',
    'ui.shortcuts.register': 'PRISM_SHORTCUTS.registerHandler',
    'ui.history.execute': 'PRISM_HISTORY.execute',
    'ui.history.undo': 'PRISM_HISTORY.undo',
    'ui.history.redo': 'PRISM_HISTORY.redo',
    'ui.progress.show': 'PRISM_PROGRESS.show',
    'ui.progress.update': 'PRISM_PROGRESS.update',
    'ui.progress.hide': 'PRISM_PROGRESS.hide',
    'ui.toast.success': 'PRISM_TOAST.success',
    'ui.toast.error': 'PRISM_TOAST.error',
    'ui.toast.warning': 'PRISM_TOAST.warning',
    'ui.toast.info': 'PRISM_TOAST.info',
    
    // Architecture
    'system.lazy.load': 'PRISM_LAZY_LOADER.load',
    'system.lazy.ensure': 'PRISM_LAZY_LOADER.ensure',
    'system.lazy.status': 'PRISM_LAZY_LOADER.getStatus',
    'system.plugin.register': 'PRISM_PLUGIN_MANAGER.register',
    'system.plugin.list': 'PRISM_PLUGIN_MANAGER.getPlugins',
    'system.plugin.hook': 'PRISM_PLUGIN_MANAGER.executeHook',
    'system.sw.register': 'PRISM_SERVICE_WORKER.register',
    'system.sw.status': 'PRISM_SERVICE_WORKER.getStatus',
    
    // Coding
    'util.log.info': 'PRISM_LOGGER.info',
    'util.log.warn': 'PRISM_LOGGER.warn',
    'util.log.error': 'PRISM_LOGGER.error',
    'util.log.debug': 'PRISM_LOGGER.debug',
    'util.log.export': 'PRISM_LOGGER.export',
    'util.sanitize.html': 'PRISM_SANITIZER.escapeHTML',
    'util.sanitize.number': 'PRISM_SANITIZER.sanitizeNumber',
    'util.sanitize.string': 'PRISM_SANITIZER.sanitizeString',
    'util.sanitize.gcode': 'PRISM_SANITIZER.sanitizeGCode',
    'util.debounce': 'PRISM_DEBOUNCE.debounce',
    'util.throttle': 'PRISM_DEBOUNCE.throttle',
    
    // Testing
    'test.framework.runAll': 'PRISM_TEST_FRAMEWORK.runAll',
    'test.framework.describe': 'PRISM_TEST_FRAMEWORK.describe',
    'test.perf.benchmark': 'PRISM_PERF_TESTS.runBenchmark',
    'test.perf.suite': 'PRISM_PERF_TESTS.runSuite',
    
    // Performance
    'perf.worker.execute': 'PRISM_WORKER_POOL.execute',
    'perf.worker.status': 'PRISM_WORKER_POOL.getStatus',
    'perf.batch.load': 'PRISM_BATCH_LOADER.load',
    'perf.batch.loadMany': 'PRISM_BATCH_LOADER.loadMany'
}