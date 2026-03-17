import { normalizeProduct, resolveImageUrl, safeText } from './product-model.js';

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

async function loadIndexPreview() {
    const resp = await fetch(`${DATA_PRODUCTS_BASE}index.json`);
    if (!resp.ok) {
        throw new Error(`Cannot load index.json: HTTP ${resp.status}`);
    }
    const index = await resp.json();
    return Array.isArray(index.preview) ? index.preview : [];
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

function applyCardData(card, rawProduct, fallbackId) {
    const product = rawProduct ? normalizeProduct(rawProduct) : null;
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
    if (img && product && product.image && isPlaceholderImage(img.getAttribute('src'))) {
        img.setAttribute('src', resolveImageUrl(product.image));
        if (product.name) img.setAttribute('alt', safeText(product.name));
    }
}

function needsEnrichment(card) {
    const quickLink = card.querySelector('.product-quick-btn');
    const addBtn = card.querySelector('.add-to-cart-btn');
    const img = card.querySelector('.product-card-image img');
    const hasLegacyLink = quickLink && /product\.html(?:$|\?)/.test(quickLink.getAttribute('href') || '');
    const missingProductId = addBtn && !addBtn.dataset.productId && !card.dataset.productId;
    const hasPlaceholder = img && isPlaceholderImage(img.getAttribute('src'));
    return Boolean(hasLegacyLink || missingProductId || hasPlaceholder);
}

function enrichCardsFromLookup(cards, lookup, products, fallbackId) {
    const unresolved = [];
    cards.forEach(card => {
        if (card.dataset.productId) {
            applyCardData(card, { id: card.dataset.productId }, fallbackId);
            return;
        }
        const name = cardName(card);
        const match = findBestMatch(name, lookup, products);
        applyCardData(card, match, fallbackId);
        if (!match) unresolved.push(card);
    });
    return unresolved;
}

async function enrichProductCards() {
    const cards = Array.from(document.querySelectorAll('.product-card')).filter(needsEnrichment);
    if (!cards.length) return;

    // Fast path: usually enough for homepage/new cards and avoids loading all category files.
    const previewProducts = await loadIndexPreview();
    const previewLookup = createLookup(previewProducts);
    const previewFallbackId = previewProducts[0]?.id || '';
    const unresolved = enrichCardsFromLookup(cards, previewLookup, previewProducts, previewFallbackId);
    if (!unresolved.length) return;

    // Fallback for legacy cards absent in preview.
    const allProducts = await loadAllProducts();
    if (!allProducts.length) return;
    const allLookup = createLookup(allProducts);
    const allFallbackId = allProducts[0]?.id || previewFallbackId;
    enrichCardsFromLookup(unresolved, allLookup, allProducts, allFallbackId);
}

export function initProductCards() {
    enrichProductCards().catch(err => {
        console.error('Product cards enrich error:', err);
    });

    // One delayed pass for asynchronously rendered sections.
    setTimeout(() => {
        enrichProductCards().catch(() => {});
    }, 1200);
}
