/**
 * Запросы к WooCommerce REST API через относительный префикс /api/wc
 * (в dev проксируется Vite и подставляет ключи на сервере — не в бандле).
 */

const BASE = '/api/wc';

function appendIfPresent(params, key, value) {
    if (value == null) return;
    const s = String(value).trim();
    if (!s) return;
    params.set(key, s);
}

export async function fetchWooProducts({
    page = 1,
    perPage = 100,
    search = '',
    category = '',
    orderBy = '',
    order = '',
    featured = null,
    exclude = [],
    fields = '',
} = {}) {
    const q = new URLSearchParams({
        page: String(page),
        per_page: String(Math.min(perPage, 100)),
        status: 'publish',
    });
    appendIfPresent(q, 'search', search);
    appendIfPresent(q, 'category', category);
    appendIfPresent(q, 'orderby', orderBy);
    appendIfPresent(q, 'order', order);
    if (featured === true) q.set('featured', 'true');
    if (Array.isArray(exclude) && exclude.length > 0) {
        const ids = exclude.map((v) => String(v).trim()).filter(Boolean);
        if (ids.length) q.set('exclude', ids.join(','));
    }
    appendIfPresent(q, '_fields', fields);

    const res = await fetch(`${BASE}/products?${q}`);
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`Woo products HTTP ${res.status}: ${t.slice(0, 200)}`);
    }
    const total = res.headers.get('X-WP-Total');
    const products = await res.json();
    return {
        products: Array.isArray(products) ? products : [],
        total: total ? parseInt(total, 10) : products.length,
    };
}

export async function fetchWooProduct(id) {
    const res = await fetch(`${BASE}/products/${encodeURIComponent(id)}`);
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`Woo product HTTP ${res.status}: ${t.slice(0, 200)}`);
    }
    return res.json();
}

export async function fetchWooCategories({ page = 1, perPage = 100, search = '' } = {}) {
    const q = new URLSearchParams({
        page: String(page),
        per_page: String(Math.min(perPage, 100)),
        hide_empty: 'true',
    });
    appendIfPresent(q, 'search', search);

    const res = await fetch(`${BASE}/products/categories?${q}`);
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`Woo categories HTTP ${res.status}: ${t.slice(0, 200)}`);
    }
    const total = res.headers.get('X-WP-Total');
    const categories = await res.json();
    return {
        categories: Array.isArray(categories) ? categories : [],
        total: total ? parseInt(total, 10) : categories.length,
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
        if (!products.length || products.length < 100 || page >= maxPages) break;
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
