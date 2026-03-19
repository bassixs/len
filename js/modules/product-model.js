const BASE = import.meta.env.BASE_URL || '/';

export function normalizeProduct(raw = {}) {
    const {
        id = '',
        name = '',
        price = 0,
        oldPrice = null,
        image = '',
        badges = [],
        sizes = [],
        colors = [],
        category = '',
        subCategory = '',
        sku = '',
        url = '',
    } = raw;

    return {
        id: String(id),
        name: String(name),
        price: Number.isFinite(Number(price)) ? Number(price) : 0,
        oldPrice: oldPrice != null && Number.isFinite(Number(oldPrice)) ? Number(oldPrice) : null,
        image: String(image || ''),
        badges: Array.isArray(badges) ? badges.map((b) => String(b)) : [],
        sizes: Array.isArray(sizes) ? sizes.map((s) => String(s)) : [],
        colors: Array.isArray(colors) ? colors.map((c) => String(c)) : [],
        category: String(category || ''),
        subCategory: String(subCategory || ''),
        sku: String(sku || ''),
        url: String(url || ''),
    };
}

export function formatPrice(value) {
    const num = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `${num.toLocaleString('ru-RU')} ₽`;
}

function getFallbackImageUrl() {
    return `${BASE}images/product.tablecloth.webp`;
}

function isSafeUrlString(value) {
    const s = String(value ?? '').trim();
    if (!s) return false;

    // Disallow obvious injection vectors.
    if (/[<>"'`\\\s]/.test(s)) return false;

    // block scheme-less URL like //evil.com/...
    if (s.startsWith('//')) return false;

    // Allow only http/https absolute URLs.
    if (/^https?:\/\//i.test(s)) return true;

    // Deny other schemes: data:, javascript:, vbscript:, etc.
    if (s.includes(':')) return false;

    // Allow relative paths only.
    if (
        s.startsWith('/') ||
        s.startsWith('./') ||
        s.startsWith('../') ||
        /^[a-zA-Z0-9_./%-?&#=+]+$/.test(s)
    ) {
        return true;
    }

    return false;
}

export function resolveImageUrl(image) {
    if (!image) return getFallbackImageUrl();
    const s = String(image).trim();

    if (!isSafeUrlString(s)) return getFallbackImageUrl();

    if (/^https?:\/\//i.test(s)) return s;
    return `${BASE}${s.replace(/^\//, '')}`;
}

export function safeText(value) {
    if (value == null) return '';
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
}
