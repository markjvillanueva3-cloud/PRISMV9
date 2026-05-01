const PRISM_DROPDOWN_SYSTEM = {
    instances: [],
    create: PRISM_UI_SYSTEM_COMPLETE.dropdown.create,
    closeAll: function() { document.querySelectorAll('.prism-dropdown-menu.show').forEach(m => m.classList.remove('show')); }
}