/**
 * Запросы к WooCommerce REST API через относительный префикс /api/wc
 * (в dev проксируется Vite и подставляет ключи на сервере — не в бандле).
 */

const BASE = '/api/wc';
const DEFAULT_CACHE_TTL_MS = 30 * 1000;
const responseCache = new Map();
const inflightRequests = new Map();

function appendIfPresent(params, key, value) {
    if (value == null) return;
    const s = String(value).trim();
    if (!s) return;
    params.set(key, s);
}

function nowMs() {
    return Date.now();
}

function getCached(url) {
    const hit = responseCache.get(url);
    if (!hit) return null;
    if (hit.expiresAt <= nowMs()) {
        responseCache.delete(url);
        return null;
    }
    return hit.payload;
}

function setCached(url, payload, ttlMs) {
    responseCache.set(url, {
        expiresAt: nowMs() + Math.max(0, Number(ttlMs) || 0),
        payload,
    });
}

async function fetchJson(url, { ttlMs = DEFAULT_CACHE_TTL_MS, useCache = true } = {}) {
    if (useCache) {
        const cached = getCached(url);
        if (cached) return cached;
    }

    const inflight = inflightRequests.get(url);
    if (inflight) return inflight;

    const req = (async () => {
        const res = await fetch(url);
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Woo HTTP ${res.status}: ${t.slice(0, 200)}`);
        }
        const totalRaw = res.headers.get('X-WP-Total');
        const totalPagesRaw = res.headers.get('X-WP-TotalPages');
        const json = await res.json();
        const payload = {
            json,
            headers: {
                total: totalRaw ? parseInt(totalRaw, 10) : 0,
                totalPages: totalPagesRaw ? parseInt(totalPagesRaw, 10) : 0,
            },
        };
        if (useCache && ttlMs > 0) setCached(url, payload, ttlMs);
        return payload;
    })();

    inflightRequests.set(url, req);
    try {
        return await req;
    } finally {
        inflightRequests.delete(url);
    }
}

export async function fetchWooProducts({
    page = 1,
    perPage = 100,
    search = '',
    category = '',
    stockStatus = '',
    orderBy = '',
    order = '',
    featured = null,
    exclude = [],
    fields = '',
    ttlMs = DEFAULT_CACHE_TTL_MS,
    useCache = true,
} = {}) {
    const q = new URLSearchParams({
        page: String(page),
        per_page: String(Math.min(perPage, 100)),
        status: 'publish',
    });
    appendIfPresent(q, 'search', search);
    appendIfPresent(q, 'category', category);
    appendIfPresent(q, 'stock_status', stockStatus);
    appendIfPresent(q, 'orderby', orderBy);
    appendIfPresent(q, 'order', order);
    if (featured === true) q.set('featured', 'true');
    if (Array.isArray(exclude) && exclude.length > 0) {
        const ids = exclude.map((v) => String(v).trim()).filter(Boolean);
        if (ids.length) q.set('exclude', ids.join(','));
    }
    appendIfPresent(q, '_fields', fields);

    const url = `${BASE}/products?${q}`;
    const { json, headers } = await fetchJson(url, { ttlMs, useCache });
    const products = json;
    return {
        products: Array.isArray(products) ? products : [],
        total: headers.total > 0 ? headers.total : products.length,
    };
}

export async function fetchWooProduct(id) {
    const q = new URLSearchParams({
        _fields: [
            'id',
            'name',
            'price',
            'regular_price',
            'sale_price',
            'images',
            'sku',
            'categories',
            'stock_status',
            'description',
            'short_description',
        ].join(','),
    });
    const url = `${BASE}/products/${encodeURIComponent(id)}?${q}`;
    const { json } = await fetchJson(url, { ttlMs: 5 * 60 * 1000, useCache: true });
    return json;
}

export async function fetchWooCategories({ page = 1, perPage = 100, search = '' } = {}) {
    const q = new URLSearchParams({
        page: String(page),
        per_page: String(Math.min(perPage, 100)),
        hide_empty: 'true',
    });
    appendIfPresent(q, 'search', search);

    const url = `${BASE}/products/categories?${q}`;
    const { json, headers } = await fetchJson(url, { ttlMs: 5 * 60 * 1000, useCache: true });
    const categories = json;
    return {
        categories: Array.isArray(categories) ? categories : [],
        total: headers.total > 0 ? headers.total : categories.length,
    };
}

/** Все опубликованные товары (несколько страниц по 100 шт.) */
export async function fetchAllWooProducts(maxPages = 30, options = {}) {
    const all = [];
    let page = 1;
    let total = 0;
    for (;;) {
        const { products, total: t } = await fetchWooProducts({
            ...options,
            page,
            perPage: 100,
        });
        total = t;
        all.push(...products);
        if (!products.length || page >= maxPages) break;
        if (Number.isFinite(total) && total > 0 && all.length >= total) break;
        page += 1;
    }
    return { products: all, total };
}

/** Все категории Woo (несколько страниц по 100 шт.) */
export async function fetchAllWooCategories(maxPages = 10) {
    const all = [];
    let page = 1;
    let total = 0;
    for (;;) {
        const { categories, total: t } = await fetchWooCategories({ page, perPage: 100 });
        total = t;
        all.push(...categories);
        if (!categories.length || categories.length < 100 || page >= maxPages) break;
        page += 1;
    }
    return { categories: all, total };
}
