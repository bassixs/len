/**
 * Страница категории: загрузка товаров из data/products/{cat}.json,
 * фильтр по подкатегориям и цене, сортировка, пагинация по 24 товара.
 * Состояние фильтров и сортировки сохраняется в URL.
 */
import { normalizeProduct, formatPrice, resolveImageUrl, safeText } from './product-model.js';
import { showToast } from './toast.js';
import { fetchAllWooCategories, fetchWooCategories, fetchWooProducts } from './woo-client.js';
import { wooProductToCard } from './woo-map.js';

const PER_PAGE = 24;
const WOO_FETCH_PAGE_SIZE = PER_PAGE;
const DATA_BASE = (import.meta.env.BASE_URL || '/') + 'data/products/';
const USE_WOO = import.meta.env.VITE_USE_WOO === 'true';
const WOO_LIST_FIELDS = 'id,name,price,regular_price,sale_price,images,sku,categories,stock_status';
const DEFAULT_WOO_CATEGORY_BY_SITE = {
    'home-textile': 24,
    women: 370,
    men: 352,
    socks: 567,
    gifts: 592,
    accessories: 16,
    fabrics: 654,
};

const CAT_ALIAS_CANDIDATES = {
    'home-textile': [
        'home-textile',
        'home-textiles',
        'textile',
        'domashnij-tekstil',
        'домашний-текстиль',
    ],
    women: [
        'women',
        'woman',
        'womens',
        'female',
        'zhenskaya-odezhda',
        'zhenskaya',
        'для-женщин',
        'для женщин',
    ],
    men: ['men', 'male', 'mens', 'muzhskaya-odezhda', 'muzhskaya', 'для-мужчин', 'для мужчин'],
    socks: ['socks', 'noski', 'linen-socks', 'льняные-носки'],
    gifts: [
        'gifts',
        'gift',
        'souvenirs',
        'podarki',
        'suveniry',
        'подарки',
        'подарки-и-сувениры',
        'игрушки-и-сувениры',
    ],
    accessories: ['accessories', 'accessory', 'aksessuary', 'аксессуары'],
    fabrics: ['fabrics', 'fabric', 'tkani', 'linen-fabric', 'ткани', 'льняные-ткани'],
};

const SITE_CATEGORY_TITLES = {
    'home-textile': 'Домашний текстиль',
    women: 'Женская одежда',
    men: 'Мужская одежда',
    socks: 'Льняные носки',
    gifts: 'Подарки и сувениры',
    accessories: 'Аксессуары',
    fabrics: 'Льняные ткани',
};

const SUBCAT_LABELS = {
    'kitchen-towel': 'Полотенца кухонные',
    apron: 'Фартуки',
    tablecloth: 'Скатерти',
    napkin: 'Салфетки',
    runner: 'Дорожки',
    'bedding-set': 'Постельные комплекты',
    pillowcase: 'Наволочки',
    'duvet-cover': 'Пододеяльники',
    sheet: 'Простыни',
    blanket: 'Пледы, покрывала',
    'bath-towel': 'Полотенца банные',
    shirt: 'Сорочки',
    pants: 'Брюки',
    blazer: 'Пиджаки',
    shorts: 'Шорты',
    'own-line': 'Собственная линия',
    skirt: 'Юбки',
    sundress: 'Сарафаны',
    blouse: 'Блузки',
    sweater: 'Джемпера',
    jacket: 'Жакеты',
    jumpsuit: 'Комбинезоны',
    dress: 'Платья',
    top: 'Топы',
    tunic: 'Туники',
    men: 'Для мужчин',
    women: 'Для женщин',
    toys: 'Льняные игрушки',
    souvenirs: 'Сувениры',
    gifts: 'Подарки',
    jewelry: 'Украшения',
    bags: 'Сумки',
    hats: 'Головные уборы',
    all: 'Все',
};

const SORT_OPTIONS = [
    { value: '', label: 'По умолчанию' },
    { value: 'price_asc', label: 'Цена: по возрастанию' },
    { value: 'price_desc', label: 'Цена: по убыванию' },
    { value: 'name_asc', label: 'Название: А — Я' },
    { value: 'name_desc', label: 'Название: Я — А' },
];

let allWooCategoriesPromise = null;
const descendantCategoryCache = new Map();
const CATEGORY_CACHE_KEY = 'woo_categories_cache_v1';
const CATEGORY_CACHE_TTL_MS = 15 * 60 * 1000;
const PRODUCT_HINT_KEY_PREFIX = 'woo_product_hint_';
const PRODUCT_HINT_MAX_ITEMS = 40;
const PRODUCT_HINT_TTL_MS = 5 * 60 * 1000;

function pluralize(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

function sortProducts(products, sortKey) {
    if (!sortKey) return products;
    const sorted = [...products];
    switch (sortKey) {
        case 'price_asc':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'name_asc':
            sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
            break;
        case 'name_desc':
            sorted.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
            break;
    }
    return sorted;
}

function filterByPrice(products, priceFrom, priceTo) {
    return products.filter((p) => {
        if (priceFrom > 0 && p.price < priceFrom) return false;
        if (priceTo > 0 && p.price > priceTo) return false;
        return true;
    });
}

function readUrlState() {
    const params = new URLSearchParams(window.location.search);
    return {
        cat: params.get('cat') || 'home-textile',
        sub: params.get('sub') || '',
        sort: params.get('sort') || '',
        priceFrom: parseInt(params.get('priceFrom'), 10) || 0,
        priceTo: parseInt(params.get('priceTo'), 10) || 0,
    };
}

function writeUrlState(state) {
    const params = new URLSearchParams(window.location.search);
    if (state.sub) params.set('sub', state.sub);
    else params.delete('sub');
    if (state.sort) params.set('sort', state.sort);
    else params.delete('sort');
    if (state.priceFrom > 0) params.set('priceFrom', state.priceFrom);
    else params.delete('priceFrom');
    if (state.priceTo > 0) params.set('priceTo', state.priceTo);
    else params.delete('priceTo');
    params.set('cat', state.cat);
    const newUrl = window.location.pathname + '?' + params.toString();
    window.history.replaceState(null, '', newUrl);
}

function renderCard(product) {
    const imgSrc = resolveImageUrl(product.image);
    const name = safeText(product.name);

    let priceHtml = `<span class="price-current">${formatPrice(product.price)}</span>`;
    if (product.oldPrice != null) {
        priceHtml += `<span class="price-old">${formatPrice(product.oldPrice)}</span>`;
    }

    const idParam = encodeURIComponent(product.id || '');
    const detailHref = USE_WOO ? `product.html?woo=${idParam}` : `product.html?id=${idParam}`;
    const outOfStockBadge = product.inStock
        ? ''
        : '<div class="product-badges"><span class="badge badge-out">Нет в наличии</span></div>';

    return `
    <div class="product-card reveal" data-sub="${safeText(product.subCategory)}" data-product-id="${safeText(product.id)}">
      <div class="product-card-image">
        <img src="${safeText(imgSrc)}" loading="lazy" alt="${name}">
        ${outOfStockBadge}
        <div class="product-quick-view">
          <a href="${detailHref}" class="product-quick-btn">Подробнее</a>
        </div>
      </div>
      <div class="product-card-info">
        <h3 class="product-card-name">${name}</h3>
        <div class="product-card-price">${priceHtml}</div>
        ${product.sku ? `<div class="product-card-sku">Арт. ${safeText(product.sku)}</div>` : ''}
      </div>
    </div>`;
}

function renderCategorySkeletonCards(count = 8) {
    return Array.from({ length: count })
        .map(
            () => `
        <div class="product-card product-card-skeleton" aria-hidden="true">
            <div class="product-card-image"></div>
            <div class="product-card-info">
                <div class="skeleton-line skeleton-line-title"></div>
                <div class="skeleton-line skeleton-line-price"></div>
            </div>
        </div>`
        )
        .join('');
}

function saveWooProductHint(product) {
    const id = String(product?.id || '').trim();
    if (!id) return;
    try {
        // Cleanup stale/overflow hint items to keep sessionStorage bounded.
        const hintKeys = [];
        for (let i = 0; i < window.sessionStorage.length; i += 1) {
            const key = window.sessionStorage.key(i);
            if (key && key.startsWith(PRODUCT_HINT_KEY_PREFIX)) hintKeys.push(key);
        }

        const parsedHints = hintKeys
            .map((key) => {
                try {
                    const raw = window.sessionStorage.getItem(key);
                    const parsed = raw ? JSON.parse(raw) : null;
                    return { key, ts: Number(parsed?.ts || 0) };
                } catch {
                    return { key, ts: 0 };
                }
            })
            .sort((a, b) => b.ts - a.ts);

        const now = Date.now();
        parsedHints.forEach((entry, idx) => {
            const tooOld = now - entry.ts > PRODUCT_HINT_TTL_MS;
            const overflow = idx >= PRODUCT_HINT_MAX_ITEMS;
            if (tooOld || overflow) {
                window.sessionStorage.removeItem(entry.key);
            }
        });

        window.sessionStorage.setItem(
            `woo_product_hint_${id}`,
            JSON.stringify({
                id,
                name: product.name || '',
                price: product.price || 0,
                oldPrice: product.oldPrice ?? null,
                image: product.image || '',
                inStock: Boolean(product.inStock),
                stockStatus: product.stockStatus || '',
                sku: product.sku || '',
                category: product.category || '',
                wooCategoryId: Number(DEFAULT_WOO_CATEGORY_BY_SITE[product.category] || 0),
                ts: Date.now(),
            })
        );
    } catch {
        // Optional optimization cache.
    }
}

function buildSubcatCounts(products) {
    const map = {};
    products.forEach((p) => {
        const key = p.subCategory || 'all';
        map[key] = (map[key] || 0) + 1;
    });
    return map;
}

function asInt(value) {
    const n = parseInt(String(value || '').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function safeDecodeSlug(value) {
    const s = String(value || '').trim();
    if (!s) return '';
    try {
        return decodeURIComponent(s);
    } catch {
        return s;
    }
}

function normalizeCategoryName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[«»"'`]/g, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeSubcatKey(value) {
    return safeDecodeSlug(value).trim();
}

function humanizeSubcatLabel(value) {
    const decoded = normalizeSubcatKey(value);
    if (!decoded) return '';
    return decoded.replace(/[_-]+/g, ' ');
}

function findWooCategoryBySiteSlug(categories, siteCatSlug, explicitWooCatId) {
    const byId = asInt(explicitWooCatId);
    if (byId) {
        const found = categories.find((c) => Number(c?.id) === byId);
        if (found) return found;
    }

    const aliases = CAT_ALIAS_CANDIDATES[siteCatSlug] || [siteCatSlug];
    const lowerAliases = aliases.map((s) => s.toLowerCase());
    const expectedTitle = normalizeCategoryName(SITE_CATEGORY_TITLES[siteCatSlug] || '');
    const candidates = categories.filter((c) => {
        const rawSlug = String(c?.slug || '');
        const decodedSlug = safeDecodeSlug(rawSlug).toLowerCase();
        const slugNorm = normalizeCategoryName(decodedSlug);
        const nameNorm = normalizeCategoryName(c?.name || '');
        const isDirect = rawSlug === siteCatSlug || safeDecodeSlug(rawSlug) === siteCatSlug;
        const isAliasExact =
            lowerAliases.includes(rawSlug.toLowerCase()) ||
            lowerAliases.includes(decodedSlug) ||
            lowerAliases.includes(nameNorm);
        const isAliasInText = lowerAliases.some(
            (alias) => nameNorm.includes(alias) || slugNorm.includes(alias)
        );
        const isExpectedTitle = expectedTitle && nameNorm.includes(expectedTitle);
        return Boolean(isDirect || isAliasExact || isAliasInText || isExpectedTitle);
    });

    const ranked = candidates.slice().sort((a, b) => Number(b?.count || 0) - Number(a?.count || 0));
    if (ranked[0]) return ranked[0];

    if (expectedTitle) {
        const byExpectedTitle = categories
            .filter((c) => normalizeCategoryName(c?.name || '').includes(expectedTitle))
            .sort((a, b) => Number(b?.count || 0) - Number(a?.count || 0));
        if (byExpectedTitle[0]) return byExpectedTitle[0];
    }

    if (siteCatSlug === 'gifts') {
        const giftCandidates = categories
            .filter((c) => {
                const n = normalizeCategoryName(c?.name || '');
                const s = normalizeCategoryName(safeDecodeSlug(c?.slug || ''));
                return (
                    n.includes('подар') ||
                    n.includes('сувенир') ||
                    n.includes('игруш') ||
                    s.includes('подар') ||
                    s.includes('сувенир') ||
                    s.includes('игруш')
                );
            })
            .sort((a, b) => Number(b?.count || 0) - Number(a?.count || 0));
        if (giftCandidates[0]) return giftCandidates[0];
    }

    return null;
}

function mapWooProductToCategoryCard(rawWooProduct, selectedWooCategoryId, siteCatSlug) {
    const mapped = wooProductToCard(rawWooProduct);
    if (!mapped) return null;

    const categories = Array.isArray(rawWooProduct?.categories) ? rawWooProduct.categories : [];
    const selectedId = Number(selectedWooCategoryId || 0);
    const child = categories.find((c) => Number(c?.parent || 0) === selectedId);
    const fallbackSub = categories.find((c) => Number(c?.id || 0) !== selectedId);
    const selectedSub = child || fallbackSub;
    const subKey = selectedSub
        ? normalizeSubcatKey(selectedSub.slug || selectedSub.name || '')
        : '';

    return normalizeProduct({
        ...mapped,
        category: siteCatSlug,
        subCategory: subKey,
    });
}

function mergeUniqueProducts(prevProducts, nextProducts) {
    const seen = new Set(prevProducts.map((p) => String(p?.id || '')));
    const merged = [...prevProducts];
    nextProducts.forEach((p) => {
        const id = String(p?.id || '');
        if (!id || seen.has(id)) return;
        seen.add(id);
        merged.push(p);
    });
    return merged;
}

function shouldRefreshHeaderTotal(total) {
    return Number.isFinite(total) && total > 0;
}

function getHeaderTotal(useWoo, wooTotal, productsLength) {
    if (useWoo && shouldRefreshHeaderTotal(wooTotal)) return wooTotal;
    return productsLength;
}

function getHeaderTotalText(total, approximate = false) {
    const suffix = approximate ? '+' : '';
    return `(${total}${suffix} ${pluralize(total, 'товар', 'товара', 'товаров')})`;
}

function collectDescendantCategoryIds(categories, rootId) {
    const byParent = new Map();
    categories.forEach((c) => {
        const parent = Number(c?.parent || 0);
        if (!byParent.has(parent)) byParent.set(parent, []);
        byParent.get(parent).push(Number(c?.id || 0));
    });

    const result = [];
    const queue = [Number(rootId || 0)];
    const seen = new Set(queue);

    while (queue.length) {
        const current = queue.shift();
        const children = byParent.get(current) || [];
        children.forEach((childId) => {
            if (!childId || seen.has(childId)) return;
            seen.add(childId);
            result.push(childId);
            queue.push(childId);
        });
    }

    return result;
}

async function getAllWooCategoriesCached() {
    try {
        const raw = window.sessionStorage.getItem(CATEGORY_CACHE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            const age = Date.now() - Number(parsed?.ts || 0);
            if (Array.isArray(parsed?.categories) && age >= 0 && age < CATEGORY_CACHE_TTL_MS) {
                return parsed.categories;
            }
        }
    } catch {
        // Ignore malformed storage and fallback to API.
    }

    if (!allWooCategoriesPromise) {
        allWooCategoriesPromise = fetchAllWooCategories()
            .then(({ categories }) => {
                const list = categories || [];
                try {
                    window.sessionStorage.setItem(
                        CATEGORY_CACHE_KEY,
                        JSON.stringify({ ts: Date.now(), categories: list })
                    );
                } catch {
                    // Storage can be unavailable; this is optional cache.
                }
                return list;
            })
            .catch((error) => {
                allWooCategoriesPromise = null;
                throw error;
            });
    }
    return allWooCategoriesPromise;
}

async function fetchCategoryChildren(parentId) {
    const children = [];
    let page = 1;
    for (;;) {
        const { categories } = await fetchWooCategories({
            page,
            perPage: 100,
            parent: parentId,
            hideEmpty: true,
        });
        children.push(...(categories || []));
        if (!categories.length || categories.length < 100) break;
        page += 1;
        if (page > 20) break;
    }
    return children;
}

async function collectDescendantCategoryIdsByApi(rootId) {
    const root = Number(rootId || 0);
    if (!root) return [];
    if (descendantCategoryCache.has(root)) return descendantCategoryCache.get(root);

    const result = [];
    let level = [root];
    const seen = new Set([root]);

    while (level.length) {
        const childrenByParent = await Promise.all(
            level.map((parentId) => fetchCategoryChildren(parentId))
        );
        const nextLevel = [];
        childrenByParent.flat().forEach((c) => {
            const childId = Number(c?.id || 0);
            if (!childId || seen.has(childId)) return;
            seen.add(childId);
            result.push(childId);
            nextLevel.push(childId);
        });
        level = nextLevel;
    }

    descendantCategoryCache.set(root, result);
    return result;
}

async function resolveWooCategory(siteCatSlug, explicitWooCatId) {
    const categories = await getAllWooCategoriesCached();
    const byId = asInt(explicitWooCatId || DEFAULT_WOO_CATEGORY_BY_SITE[siteCatSlug]);
    if (byId) {
        const found = categories.find((c) => Number(c?.id || 0) === byId);
        const descendantIds = collectDescendantCategoryIds(categories, byId);
        const queryCategoryIds = [byId, ...descendantIds].filter(Boolean);
        return {
            selectedCategory: found || { id: byId },
            selectedCategoryId: byId,
            queryCategory: queryCategoryIds.join(','),
            selectedCategoryCount: Number(found?.count || 0),
        };
    }

    const selectedCategory = findWooCategoryBySiteSlug(categories, siteCatSlug, explicitWooCatId);
    const selectedCategoryId = Number(selectedCategory?.id || 0);
    const descendantIds = selectedCategoryId
        ? collectDescendantCategoryIds(categories, selectedCategoryId)
        : [];
    const queryCategoryIds = [selectedCategoryId, ...descendantIds].filter(Boolean);
    return {
        selectedCategory,
        selectedCategoryId,
        queryCategory: queryCategoryIds.join(','),
        selectedCategoryCount: Number(selectedCategory?.count || 0),
    };
}

export function initCategoryProducts() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;

    const state = readUrlState();
    const params = new URLSearchParams(window.location.search);
    const DEBUG_CATEGORY = params.get('debug_cat') === '1';
    const canonicalWooCatId = DEFAULT_WOO_CATEGORY_BY_SITE[state.cat] || '';
    const explicitWooCatId = canonicalWooCatId || params.get('woo_cat') || '';
    const countEl = document.querySelector('.ch-ref-count');
    const subcatsEl = document.querySelector('.ch-ref-subcats');

    const debugLog = (...args) => {
        if (DEBUG_CATEGORY) console.log('[category-debug]', ...args);
    };

    debugLog('init', { cat: state.cat, explicitWooCatId, canonicalWooCatId, useWoo: USE_WOO });

    grid.innerHTML = renderCategorySkeletonCards(PER_PAGE);
    if (countEl) countEl.textContent = '(...)';

    let wooTotal = 0;
    let wooPage = 1;
    let wooHasMore = false;
    let wooLoading = false;
    let selectedWooCategoryId = 0;
    let selectedWooCategoryQuery = '';

    const quickCategoryId = asInt(explicitWooCatId);
    const categoryResolutionPromise = USE_WOO
        ? quickCategoryId
            ? Promise.resolve({
                  selectedCategoryId: quickCategoryId,
                  selectedCategoryCount: 0,
                  queryCategory: String(quickCategoryId),
              })
            : resolveWooCategory(state.cat, explicitWooCatId)
        : Promise.resolve(null);

    const loadPromise = USE_WOO
        ? categoryResolutionPromise.then(
              async ({ selectedCategoryId, selectedCategoryCount, queryCategory }) => {
                  debugLog('resolved-category', {
                      selectedCategoryId,
                      selectedCategoryCount,
                      queryCategory,
                  });
                  selectedWooCategoryId = selectedCategoryId;
                  selectedWooCategoryQuery = queryCategory || String(selectedWooCategoryId || '');
                  if (!selectedWooCategoryId) return { products: [] };

                  // Fast path: for canonical IDs fetch first page immediately.
                  // Descendants expansion runs later after first paint.
                  let descendantsResolver = null;
                  const shouldUseFastPath =
                      Number(explicitWooCatId || DEFAULT_WOO_CATEGORY_BY_SITE[state.cat]) > 0;
                  if (shouldUseFastPath && selectedWooCategoryId) {
                      selectedWooCategoryQuery = String(selectedWooCategoryId);
                      descendantsResolver = () =>
                          collectDescendantCategoryIdsByApi(selectedWooCategoryId).then(
                              (descendantIds) => {
                                  const fullIds = [selectedWooCategoryId, ...descendantIds].filter(
                                      Boolean
                                  );
                                  const fullQuery = fullIds.join(',');
                                  if (fullIds.length > 1) {
                                      selectedWooCategoryQuery = fullQuery;
                                  }
                                  return {
                                      fullQuery,
                                      hasDescendants: fullIds.length > 1,
                                  };
                              }
                          );
                  }

                  const {
                      products: firstPageProducts,
                      total,
                      hasTotalHeader,
                  } = await fetchWooProducts({
                      page: 1,
                      perPage: PER_PAGE,
                      category: selectedWooCategoryQuery,
                      fields: WOO_LIST_FIELDS,
                  });
                  const cards = firstPageProducts
                      .map((raw) =>
                          mapWooProductToCategoryCard(raw, selectedWooCategoryId, state.cat)
                      )
                      .filter(Boolean);
                  const apiTotal = Number(total || 0);
                  if (hasTotalHeader) {
                      wooTotal = Number(apiTotal || 0);
                  } else {
                      wooTotal = Number(selectedCategoryCount || 0);
                  }
                  debugLog('first-page', {
                      firstPageCount: firstPageProducts.length,
                      mappedCardsCount: cards.length,
                      apiTotal,
                      hasTotalHeader,
                      selectedCategoryCount,
                      wooTotal,
                  });
                  wooPage = 2;
                  wooHasMore = hasTotalHeader
                      ? wooTotal > cards.length
                      : firstPageProducts.length === PER_PAGE;
                  debugLog('first-page-pagination', { wooPage, wooHasMore });
                  return { products: cards, descendantsResolver };
              }
          )
        : (async () => {
              const url = DATA_BASE + encodeURIComponent(state.cat) + '.json';
              const r = await fetch(url);
              if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
              const allProducts = await r.json();
              return {
                  products: allProducts
                      .filter((p) => (p.category || '') === state.cat)
                      .map(normalizeProduct),
              };
          })();

    loadPromise
        .then((payload) => {
            let products = payload.products || [];
            if (!products.length) {
                grid.innerHTML = '<p class="category-empty">В этой категории пока нет товаров.</p>';
                if (countEl) countEl.textContent = '(0 товаров)';
                return;
            }

            const counts = buildSubcatCounts(products);
            const totalForHeader = getHeaderTotal(USE_WOO, wooTotal, products.length);
            const approximateHeader = USE_WOO && !shouldRefreshHeaderTotal(wooTotal) && wooHasMore;
            if (countEl)
                countEl.textContent = getHeaderTotalText(totalForHeader, approximateHeader);

            buildSubcatTabs(subcatsEl, counts, totalForHeader, state.sub);
            buildSortDropdown(state.sort);
            buildPriceFilter(state.priceFrom, state.priceTo);

            let currentPage = 1;
            let processedList = [];
            let renderedCount = 0;

            function getProcessed() {
                let list = products;
                if (state.sub) {
                    list = list.filter((p) => (p.subCategory || '') === state.sub);
                }
                list = filterByPrice(list, state.priceFrom, state.priceTo);
                list = sortProducts(list, state.sort);
                return list;
            }

            async function fetchNextWooPage() {
                if (!USE_WOO || !selectedWooCategoryId || !wooHasMore || wooLoading) return false;
                wooLoading = true;
                try {
                    const {
                        products: pageProducts,
                        total,
                        hasTotalHeader,
                    } = await fetchWooProducts({
                        page: wooPage,
                        perPage: WOO_FETCH_PAGE_SIZE,
                        category: selectedWooCategoryQuery || selectedWooCategoryId,
                        fields: WOO_LIST_FIELDS,
                    });
                    const cards = pageProducts
                        .map((raw) =>
                            mapWooProductToCategoryCard(raw, selectedWooCategoryId, state.cat)
                        )
                        .filter(Boolean);
                    if (!cards.length) {
                        wooHasMore = false;
                        return false;
                    }

                    products = mergeUniqueProducts(products, cards);
                    const apiTotal = Number(total || 0);
                    if (hasTotalHeader) {
                        wooTotal = apiTotal;
                    }
                    wooPage += 1;
                    wooHasMore = hasTotalHeader
                        ? products.length < wooTotal
                        : pageProducts.length === WOO_FETCH_PAGE_SIZE;
                    debugLog('next-page', {
                        fetchedPage: wooPage,
                        pageProductsCount: pageProducts.length,
                        cardsCount: cards.length,
                        productsLength: products.length,
                        apiTotal,
                        hasTotalHeader,
                        wooTotal,
                        wooHasMore,
                    });
                    return true;
                } catch (e) {
                    console.error('Category next page load error:', e);
                    wooHasMore = false;
                    return false;
                } finally {
                    wooLoading = false;
                }
            }

            function render(appendOnly = false) {
                const list = processedList;
                const visibleCount = currentPage * PER_PAGE;
                const slice = list.slice(0, visibleCount);
                if (appendOnly && renderedCount > 0) {
                    const toAppend = list.slice(renderedCount, visibleCount);
                    if (toAppend.length) {
                        grid.insertAdjacentHTML('beforeend', toAppend.map(renderCard).join(''));
                    }
                } else {
                    const html = slice.map(renderCard).join('');
                    grid.innerHTML =
                        html || '<p class="category-empty">Нет товаров по заданным параметрам.</p>';
                }
                renderedCount = slice.length;

                const paginationEl = document.getElementById('categoryPagination');
                if (paginationEl) {
                    const hasMoreLocal = slice.length < list.length;
                    const hasMoreRemote = USE_WOO && wooHasMore;
                    const hasMore = hasMoreLocal || hasMoreRemote;
                    if (hasMore) {
                        paginationEl.innerHTML =
                            '<button type="button" class="btn btn-outline-dark category-load-more">Показать ещё</button>';
                        const button = paginationEl.querySelector('.category-load-more');
                        if (button && wooLoading) button.disabled = true;
                        paginationEl
                            .querySelector('.category-load-more')
                            .addEventListener('click', async () => {
                                if (wooLoading) return;
                                if (!hasMoreLocal && hasMoreRemote) {
                                    const loaded = await fetchNextWooPage();
                                    if (!loaded) return;
                                }
                                const headerTotal = getHeaderTotal(
                                    USE_WOO,
                                    wooTotal,
                                    products.length
                                );
                                const approximateHeader =
                                    USE_WOO && !shouldRefreshHeaderTotal(wooTotal) && wooHasMore;
                                if (countEl) {
                                    countEl.textContent = getHeaderTotalText(
                                        headerTotal,
                                        approximateHeader
                                    );
                                }
                                currentPage += 1;
                                processedList = getProcessed();
                                buildSubcatTabs(
                                    subcatsEl,
                                    buildSubcatCounts(products),
                                    headerTotal,
                                    state.sub
                                );
                                render(true);
                            });
                    } else {
                        paginationEl.innerHTML = '';
                    }
                }

                const resultCountEl = document.querySelector('.ch-ref-result-count');
                if (resultCountEl) {
                    const hasActiveFilters =
                        Boolean(state.sub) || state.priceFrom > 0 || state.priceTo > 0;
                    if (USE_WOO && !hasActiveFilters) {
                        const headerTotal = getHeaderTotal(USE_WOO, wooTotal, products.length);
                        const suffix =
                            wooHasMore &&
                            (!shouldRefreshHeaderTotal(wooTotal) || products.length < headerTotal)
                                ? '+'
                                : '';
                        resultCountEl.textContent = `${headerTotal}${suffix} ${pluralize(headerTotal, 'товар', 'товара', 'товаров')}`;
                    } else {
                        resultCountEl.textContent = `${list.length} ${pluralize(list.length, 'товар', 'товара', 'товаров')}`;
                    }
                }
                debugLog('render', {
                    currentPage,
                    visibleCount,
                    renderedCount,
                    processedCount: list.length,
                    productsLength: products.length,
                    wooTotal,
                    wooHasMore,
                    activeSub: state.sub,
                    priceFrom: state.priceFrom,
                    priceTo: state.priceTo,
                });
            }

            async function resetAndRender() {
                currentPage = 1;
                renderedCount = 0;
                writeUrlState(state);
                processedList = getProcessed();
                if (USE_WOO && !processedList.length && wooHasMore) {
                    // If filter emptied current subset, try loading extra pages before showing empty state.
                    for (let i = 0; i < 3 && !processedList.length && wooHasMore; i += 1) {
                        const loaded = await fetchNextWooPage();
                        if (!loaded) break;
                        processedList = getProcessed();
                    }
                }
                const headerTotal = getHeaderTotal(USE_WOO, wooTotal, products.length);
                const approximateHeader =
                    USE_WOO && !shouldRefreshHeaderTotal(wooTotal) && wooHasMore;
                if (countEl) {
                    countEl.textContent = getHeaderTotalText(headerTotal, approximateHeader);
                }
                buildSubcatTabs(subcatsEl, buildSubcatCounts(products), headerTotal, state.sub);
                render(false);
            }

            if (subcatsEl) {
                subcatsEl.addEventListener('click', (e) => {
                    const t = e.target.closest('.ch-ref-subcat');
                    if (!t || t.classList.contains('ch-ref-subcat-back')) return;
                    e.preventDefault();
                    subcatsEl
                        .querySelectorAll('.ch-ref-subcat')
                        .forEach((el) => el.classList.remove('active'));
                    t.classList.add('active');
                    state.sub = t.dataset.filter || '';
                    resetAndRender();
                });
            }

            grid.addEventListener(
                'pointerdown',
                (e) => {
                    const target = e.target && e.target.nodeType === 1 ? e.target : null;
                    if (!target) return;
                    const link = target.closest('a.product-quick-btn[href*="product.html?woo="]');
                    if (!link) return;
                    const card = link.closest('.product-card');
                    const productId = String(card?.dataset?.productId || '');
                    if (!productId) return;
                    const hit = products.find((p) => String(p.id) === productId);
                    if (hit) saveWooProductHint(hit);
                },
                { passive: true }
            );

            const sortSelect = document.getElementById('catalogSort');
            if (sortSelect) {
                sortSelect.addEventListener('change', () => {
                    state.sort = sortSelect.value;
                    resetAndRender();
                });
            }

            const priceForm = document.getElementById('priceFilterForm');
            if (priceForm) {
                priceForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const fromInput = document.getElementById('priceFrom');
                    const toInput = document.getElementById('priceTo');
                    state.priceFrom = parseInt(fromInput.value, 10) || 0;
                    state.priceTo = parseInt(toInput.value, 10) || 0;
                    resetAndRender();
                });
                const resetBtn = priceForm.querySelector('.price-filter-reset');
                if (resetBtn) {
                    resetBtn.addEventListener('click', () => {
                        document.getElementById('priceFrom').value = '';
                        document.getElementById('priceTo').value = '';
                        state.priceFrom = 0;
                        state.priceTo = 0;
                        resetAndRender();
                    });
                }
            }

            processedList = getProcessed();
            renderedCount = 0;
            render(false);

            if (payload.descendantsResolver) {
                setTimeout(async () => {
                    let resolved;
                    try {
                        resolved = await payload.descendantsResolver();
                    } catch (e) {
                        debugLog('descendants-fast-path-failed', e);
                        return;
                    }
                    const { fullQuery, hasDescendants } = resolved || {};
                    if (!hasDescendants || !fullQuery) return;
                    try {
                        const {
                            products: expandedPageProducts,
                            total,
                            hasTotalHeader,
                        } = await fetchWooProducts({
                            page: 1,
                            perPage: Math.max(PER_PAGE * 2, 48),
                            category: fullQuery,
                            fields: WOO_LIST_FIELDS,
                        });
                        const expandedCards = expandedPageProducts
                            .map((raw) =>
                                mapWooProductToCategoryCard(raw, selectedWooCategoryId, state.cat)
                            )
                            .filter(Boolean);
                        if (!expandedCards.length) return;

                        const beforeLen = products.length;
                        products = mergeUniqueProducts(products, expandedCards);
                        if (products.length === beforeLen) return;

                        const apiTotal = Number(total || 0);
                        if (hasTotalHeader && apiTotal > 0) {
                            wooTotal = Math.max(wooTotal, apiTotal);
                        }
                        wooHasMore = hasTotalHeader
                            ? products.length < wooTotal
                            : expandedPageProducts.length >= PER_PAGE;

                        processedList = getProcessed();
                        buildSubcatTabs(
                            subcatsEl,
                            buildSubcatCounts(products),
                            getHeaderTotal(USE_WOO, wooTotal, products.length),
                            state.sub
                        );
                        render(false);
                    } catch (e) {
                        debugLog('descendants-background-expand-failed', e);
                    }
                }, 1200);
            }
        })
        .catch((err) => {
            console.error('Category products load error:', err);
            grid.innerHTML =
                '<p class="category-empty">Не удалось загрузить товары. Попробуйте позже.</p>';
            showToast('Не удалось загрузить товары категории', 'error');
        });
}

function buildSubcatTabs(subcatsEl, counts, total, activeSub) {
    if (!subcatsEl) return;

    const backLink = subcatsEl.querySelector('.ch-ref-subcat-back');
    subcatsEl.innerHTML = '';
    if (backLink) {
        const span = backLink.querySelector('span');
        if (span) span.textContent = `(${total})`;
        subcatsEl.appendChild(backLink);
    }

    const allTab = document.createElement('a');
    allTab.href = '#';
    allTab.className = 'ch-ref-subcat' + (activeSub === '' ? ' active' : '');
    allTab.dataset.filter = '';
    allTab.innerHTML = `ВСЕ <span>(${total})</span>`;
    subcatsEl.appendChild(allTab);

    Object.keys(counts).forEach((key) => {
        if (key === 'all') return;
        const label = SUBCAT_LABELS[key] || humanizeSubcatLabel(key) || key;
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'ch-ref-subcat' + (activeSub === key ? ' active' : '');
        a.dataset.filter = key;
        // XSS protection: label comes from data keys, so must be escaped for HTML context.
        a.innerHTML = `${safeText(label.toUpperCase())} <span>(${counts[key]})</span>`;
        subcatsEl.appendChild(a);
    });
}

function buildSortDropdown(activeSort) {
    const container = document.getElementById('sortContainer');
    if (!container) return;

    const select = document.createElement('select');
    select.id = 'catalogSort';
    select.className = 'catalog-sort-select';

    SORT_OPTIONS.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === activeSort) option.selected = true;
        select.appendChild(option);
    });

    container.innerHTML = '';
    container.appendChild(select);
}

function buildPriceFilter(priceFrom, priceTo) {
    const container = document.getElementById('priceFilterContainer');
    if (!container) return;

    container.innerHTML = `
        <form id="priceFilterForm" class="price-filter-form">
            <input type="number" id="priceFrom" class="price-filter-input" placeholder="от" min="0" value="${priceFrom || ''}">
            <span class="price-filter-sep">—</span>
            <input type="number" id="priceTo" class="price-filter-input" placeholder="до" min="0" value="${priceTo || ''}">
            <button type="submit" class="btn-sm btn-primary-sm">ОК</button>
            <button type="button" class="btn-sm price-filter-reset" title="Сбросить">✕</button>
        </form>`;
}
