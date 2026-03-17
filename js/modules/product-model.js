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

export function resolveImageUrl(image) {
    if (!image) {
        return `${BASE}images/product.tablecloth.webp`;
    }
    if (typeof image === 'string' && image.startsWith('http')) {
        return image;
    }
    return `${BASE}${String(image).replace(/^\//, '')}`;
}

export function safeText(value) {
    if (value == null) return '';
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
}
