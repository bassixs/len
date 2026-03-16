const BASE = import.meta.env.BASE_URL || '/';
const DATA_PRODUCTS_BASE = `${BASE}data/products/`;

function normalizeName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[«»"'`]/g, '')
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function cardName(card) {
    const el = card.querySelector('.product-card-name');
    return el ? el.textContent.trim() : '';
}

function isPlaceholderImage(src) {
    return /images\/product\./i.test(src || '');
}

async function loadAllProducts() {
    const indexResp = await fetch(`${DATA_PRODUCTS_BASE}index.json`);
    if (!indexResp.ok) {
        throw new Error(`Cannot load index.json: HTTP ${indexResp.status}`);
    }
    const index = await indexResp.json();
    const categories = Array.isArray(index.categories)
        ? index.categories.map(c => c.id).filter(Boolean)
        : [];

    const lists = await Promise.all(
        categories.map(async cat => {
            const resp = await fetch(`${DATA_PRODUCTS_BASE}${encodeURIComponent(cat)}.json`);
            if (!resp.ok) return [];
            const list = await resp.json();
            return Array.isArray(list) ? list : [];
        })
    );

    const products = lists.flat().filter(Boolean);
    return products;
}

function createLookup(products) {
    const exact = new Map();
    products.forEach(product => {
        const key = normalizeName(product.name);
        if (key && !exact.has(key)) {
            exact.set(key, product);
        }
    });
    return exact;
}

function findBestMatch(name, exactMap, products) {
    const key = normalizeName(name);
    if (!key) return null;
    if (exactMap.has(key)) return exactMap.get(key);

    const tokens = key.split(' ').filter(t => t.length >= 4);
    if (!tokens.length) return null;
    const sorted = tokens.sort((a, b) => b.length - a.length);
    const token = sorted[0];
    return products.find(p => normalizeName(p.name).includes(token)) || null;
}

function applyCardData(card, product, fallbackId) {
    const resolvedId = product?.id || fallbackId;
    if (!resolvedId) return;

    card.dataset.productId = resolvedId;
    card.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.dataset.productId = resolvedId;
    });

    card.querySelectorAll('.product-quick-btn').forEach(link => {
        link.setAttribute('href', `product.html?id=${encodeURIComponent(resolvedId)}`);
    });

    const img = card.querySelector('.product-card-image img');
    if (img && product?.image && isPlaceholderImage(img.getAttribute('src'))) {
        img.setAttribute('src', `${BASE}${String(product.image).replace(/^\//, '')}`);
        if (product.name) img.setAttribute('alt', product.name);
    }
}

async function enrichProductCards() {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    if (!cards.length) return;

    const products = await loadAllProducts();
    if (!products.length) return;

    const exactMap = createLookup(products);
    const fallbackId = products[0]?.id || '';

    cards.forEach(card => {
        if (card.dataset.productId) {
            applyCardData(card, { id: card.dataset.productId }, fallbackId);
            return;
        }
        const name = cardName(card);
        const match = findBestMatch(name, exactMap, products);
        applyCardData(card, match, fallbackId);
    });
}

export function initProductCards() {
    enrichProductCards().catch(err => {
        console.error('Product cards enrich error:', err);
    });

    // Some cards are rendered asynchronously (catalog/category); one extra pass keeps links consistent.
    setTimeout(() => {
        enrichProductCards().catch(() => {});
    }, 1200);
}
