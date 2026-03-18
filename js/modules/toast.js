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
    el.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;

    container.appendChild(el);

    requestAnimationFrame(() => el.classList.add('toast--visible'));

    setTimeout(() => {
        el.classList.remove('toast--visible');
        setTimeout(() => el.remove(), FADE_MS);
    }, DURATION_MS);
}
