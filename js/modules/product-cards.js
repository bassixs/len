import { normalizeProduct, resolveImageUrl, safeText } from './product-model.js';
import { fetchWooProducts } from './woo-client.js';
import { wooProductToCard } from './woo-map.js';

const BASE = import.meta.env.BASE_URL || '/';
const DATA_PRODUCTS_BASE = `${BASE}data/products/`;
const USE_WOO = import.meta.env.VITE_USE_WOO === 'true';
const WOO_LIST_FIELDS = 'id,name,price,regular_price,sale_price,images,sku,categories,stock_status';

let indexJsonPromise = null;
let previewProductsPromise = null;

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
    const index = await loadIndexJson();
    const categories = Array.isArray(index.categories)
        ? index.categories.map((c) => c.id).filter(Boolean)
        : [];

    const lists = await Promise.all(
        categories.map(async (cat) => {
            const resp = await fetch(`${DATA_PRODUCTS_BASE}${encodeURIComponent(cat)}.json`);
            if (!resp.ok) return [];
            const list = await resp.json();
            return Array.isArray(list) ? list : [];
        })
    );

    const products = lists.flat().filter(Boolean);
    return products;
}

async function loadIndexJson() {
    if (indexJsonPromise) return indexJsonPromise;
    indexJsonPromise = (async () => {
        const indexResp = await fetch(`${DATA_PRODUCTS_BASE}index.json`);
        if (!indexResp.ok) {
            throw new Error(`Cannot load index.json: HTTP ${indexResp.status}`);
        }
        return indexResp.json();
    })();
    return indexJsonPromise;
}

async function loadIndexPreview() {
    if (previewProductsPromise) return previewProductsPromise;
    previewProductsPromise = (async () => {
        const index = await loadIndexJson();
        return Array.isArray(index.preview) ? index.preview : [];
    })();
    return previewProductsPromise;
}

function createLookup(products) {
    const exact = new Map();
    products.forEach((product) => {
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

    const tokens = key.split(' ').filter((t) => t.length >= 4);
    if (!tokens.length) return null;
    const sorted = tokens.sort((a, b) => b.length - a.length);
    const token = sorted[0];
    return products.find((p) => normalizeName(p.name).includes(token)) || null;
}

function applyCardData(card, rawProduct, fallbackId) {
    const product = rawProduct ? normalizeProduct(rawProduct) : null;
    const resolvedId = product?.id || fallbackId;
    if (!resolvedId) return;

    card.dataset.productId = resolvedId;
    card.querySelectorAll('.add-to-cart-btn').forEach((btn) => {
        btn.dataset.productId = resolvedId;
    });

    card.querySelectorAll('.product-quick-btn').forEach((link) => {
        const href = USE_WOO
            ? `product.html?woo=${encodeURIComponent(resolvedId)}`
            : `product.html?id=${encodeURIComponent(resolvedId)}`;
        link.setAttribute('href', href);
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
    const hasLegacyLink =
        quickLink && /product\.html(?:$|\?)/.test(quickLink.getAttribute('href') || '');
    const missingProductId = addBtn && !addBtn.dataset.productId && !card.dataset.productId;
    const hasPlaceholder = img && isPlaceholderImage(img.getAttribute('src'));
    return Boolean(hasLegacyLink || missingProductId || hasPlaceholder);
}

function enrichCardsFromLookup(cards, lookup, products, fallbackId) {
    const unresolved = [];
    cards.forEach((card) => {
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
    const unresolved = enrichCardsFromLookup(
        cards,
        previewLookup,
        previewProducts,
        previewFallbackId
    );
    if (!unresolved.length) return;

    // Fallback for legacy cards absent in preview.
    const allProducts = await loadAllProducts();
    if (!allProducts.length) return;
    const allLookup = createLookup(allProducts);
    const allFallbackId = allProducts[0]?.id || previewFallbackId;
    enrichCardsFromLookup(unresolved, allLookup, allProducts, allFallbackId);
}

function renderWooSliderCard(product) {
    const imgSrc = resolveImageUrl(product.image);
    const name = safeText(product.name);
    const currentPrice = Number(product.price || 0).toLocaleString('ru-RU');
    const oldPrice =
        product.oldPrice != null
            ? `<span class="price-old">${Number(product.oldPrice).toLocaleString('ru-RU')} ₽</span>`
            : '';
    const isOutOfStock = !product.inStock;
    const stockBadges = isOutOfStock
        ? '<div class="product-badges"><span class="badge badge-out">Нет в наличии</span></div>'
        : '';
    const href = `product.html?woo=${encodeURIComponent(product.id)}`;

    return `
        <div class="product-card" data-product-id="${safeText(product.id)}">
            <div class="product-card-image">
                <img src="${safeText(imgSrc)}" alt="${name}" loading="lazy" />
                ${stockBadges}
                <div class="product-quick-view">
                    <a href="${href}" class="product-quick-btn">Подробнее</a>
                </div>
            </div>
            <div class="product-card-info">
                <h3 class="product-card-name">${name}</h3>
                <div class="product-card-price">
                    <span class="price-current">${currentPrice} ₽</span>${oldPrice}
                </div>
                <button
                    type="button"
                    class="btn btn-outline add-to-cart-btn"
                    data-product-id="${safeText(product.id)}"
                    style="margin-top: 0.5rem; width: 100%"
                    ${isOutOfStock ? 'disabled' : ''}
                >
                    ${isOutOfStock ? 'Нет в наличии' : 'В корзину'}
                </button>
            </div>
        </div>
    `;
}

async function hydrateHomepageCardsFromWoo() {
    const slider = document.getElementById('productsSlider');
    if (!slider) return false;

    const cards = [];
    const seenIds = new Set();
    const maxPages = 4;
    const perPage = 24;

    for (let page = 1; page <= maxPages && cards.length < 8; page += 1) {
        const { products } = await fetchWooProducts({
            page,
            perPage,
            orderBy: 'date',
            order: 'desc',
            stockStatus: 'instock',
            fields: WOO_LIST_FIELDS,
        });
        const mapped = products
            .map((p) => normalizeProduct(wooProductToCard(p)))
            .filter((p) => p.id && p.name && p.inStock);

        for (const p of mapped) {
            if (seenIds.has(p.id)) continue;
            seenIds.add(p.id);
            cards.push(p);
            if (cards.length >= 8) break;
        }

        if (!products.length) break;
    }

    if (!cards.length) return false;

    slider.innerHTML = cards.slice(0, 8).map(renderWooSliderCard).join('');
    return true;
}

export function initProductCards() {
    if (USE_WOO) {
        hydrateHomepageCardsFromWoo()
            .then((ok) => {
                if (!ok) {
                    const slider = document.getElementById('productsSlider');
                    if (slider) slider.innerHTML = '';
                }
            })
            .catch((err) => {
                console.error('Woo homepage cards error:', err);
                const slider = document.getElementById('productsSlider');
                if (slider) slider.innerHTML = '';
            });
        return;
    }

    enrichProductCards()
        .then(() => {
            // One delayed pass for asynchronously rendered sections,
            // but only when there are still unresolved cards.
            const remaining = Array.from(document.querySelectorAll('.product-card')).filter(
                needsEnrichment
            ).length;
            if (!remaining) return;

            setTimeout(() => {
                enrichProductCards().catch(() => {});
            }, 1200);
        })
        .catch((err) => {
            console.error('Product cards enrich error:', err);
        });
}
