const OPEN_LAYERS = new Set();

function updateBodyLock() {
    document.body.classList.toggle('ui-locked', OPEN_LAYERS.size > 0);
}

export function openLayer(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('is-open');
    OPEN_LAYERS.add(selector);
    updateBodyLock();
}

export function closeLayer(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.remove('is-open');
    OPEN_LAYERS.delete(selector);
    updateBodyLock();
}

export function closeAllLayers() {
    OPEN_LAYERS.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.classList.remove('is-open');
    });
    OPEN_LAYERS.clear();
    updateBodyLock();
}

let escBound = false;
export function bindGlobalEscOnce() {
    if (escBound) return;
    escBound = true;
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeAllLayers();
        }
    });
}

