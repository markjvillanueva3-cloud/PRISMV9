const PRISM_MANUFACTURER_LOOKUP = {
    _normalize: function(mfg) {
        return (mfg || 'DEFAULT').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/-/g, '');
    },
    
    getQuality: function(manufacturer) {
        const key = 'QUALITY_' + this._normalize(manufacturer);
        return PRISM_CONSTANTS.MANUFACTURERS[key] || PRISM_CONSTANTS.MANUFACTURERS.QUALITY_DEFAULT;
    },
    
    getTier: function(manufacturer) {
        const quality = this.getQuality(manufacturer);
        if (quality >= PRISM_CONSTANTS.MANUFACTURERS.PREMIUM_THRESHOLD) return 'premium';
        if (quality >= PRISM_CONSTANTS.MANUFACTURERS.STANDARD_THRESHOLD) return 'standard';
        if (quality >= PRISM_CONSTANTS.MANUFACTURERS.ECONOMY_THRESHOLD) return 'economy';
        return 'unknown';
    },
    
    listManufacturers: function() {
        return ['sandvik', 'kennametal', 'iscar', 'seco', 'mitsubishi', 'walter', 'tungaloy', 
                'osg', 'guhring', 'emuge', 'harvey', 'helical', 'sgs', 'kyocera', 
                'sumitomo', 'moldino', 'yg1', 'ma_ford', 'nachi'];
    }
}