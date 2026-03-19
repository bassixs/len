const ICON_MAP = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
};

const DURATION_MS = 3500;
const FADE_MS = 300;

/**
 * Show a small notification toast.
 * @param {string} message  Text to display.
 * @param {'success'|'error'|'warning'} [type='success']  Visual style.
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icon = ICON_MAP[type] || ICON_MAP.success;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    const iconEl = document.createElement('i');
    iconEl.className = `fas ${icon}`;
    const textEl = document.createElement('span');
    // XSS protection: write user-provided text via textContent.
    textEl.textContent = String(message);
    el.appendChild(iconEl);
    el.appendChild(document.createTextNode(' '));
    el.appendChild(textEl);

    container.appendChild(el);

    requestAnimationFrame(() => el.classList.add('toast--visible'));

    setTimeout(() => {
        el.classList.remove('toast--visible');
        setTimeout(() => el.remove(), FADE_MS);
    }, DURATION_MS);
}
