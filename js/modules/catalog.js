import { normalizeProduct, formatPrice, resolveImageUrl, safeText } from './product-model.js';
import { openLayer, closeLayer } from './ui-shell.js';
import { showToast } from './toast.js';
import { fetchWooProducts } from './woo-client.js';
import { wooProductToCard } from './woo-map.js';

const USE_WOO = import.meta.env.VITE_USE_WOO === 'true';
const PER_PAGE = 24;
const WOO_LIST_FIELDS = 'id,name,price,regular_price,sale_price,images,sku,categories,stock_status';

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

export function initCatalog() {
    // ===== CATEGORY PAGE — FILTER GROUPS =====
    document.querySelectorAll('.filter-group-title').forEach((title) => {
        title.addEventListener('click', () => {
            const body = title.nextElementSibling;
            if (body) body.classList.toggle('open');
            const icon = title.querySelector('i');
            if (icon) {
                icon.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
            }
        });
    });

    document.querySelectorAll('.filter-group-body').forEach((body, i) => {
        if (i < 3) body.classList.add('open');
    });

    // ===== CATEGORY PAGE — FILTER SIDEBAR MOBILE TOGGLE =====
    const filterToggle = document.querySelector('.filter-toggle-btn');
    const filterSidebar = document.querySelector('.category-sidebar');

    if (filterToggle && filterSidebar) {
        filterToggle.addEventListener('click', () => {
            const isOpen = filterSidebar.classList.contains('is-open');
            if (isOpen) {
                closeLayer('.category-sidebar');
            } else {
                openLayer('.category-sidebar');
            }
        });
    }

    // ===== CATEGORY PAGE — VIEW TOGGLE =====
    document.querySelectorAll('.view-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ===== DYNAMIC PRODUCT RENDERING: Woo или data/products/index.json =====
    const catalogGrid = document.querySelector('.catalog-grid');
    if (catalogGrid) {
        catalogGrid.innerHTML = '<div class="catalog-loading">Загрузка каталога...</div>';
        if (USE_WOO) {
            let page = 1;
            let total = 0;
            let loading = false;
            let hasMore = true;
            let activeSort = '';
            const loadedProducts = [];
            const paginationEl = document.getElementById('catalogPagination');

            const updatePagination = () => {
                if (!paginationEl) return;
                if (!hasMore) {
                    paginationEl.innerHTML = '';
                    return;
                }
                paginationEl.innerHTML =
                    '<button type="button" class="btn btn-outline-dark catalog-load-more">Показать ещё</button>';
                const btn = paginationEl.querySelector('.catalog-load-more');
                if (!btn) return;
                btn.disabled = loading;
                btn.textContent = loading ? 'Загрузка...' : 'Показать ещё';
                btn.addEventListener('click', () => {
                    if (loading) return;
                    loadPage();
                });
            };

            const renderCurrent = () => {
                const list = activeSort ? sortProducts(loadedProducts, activeSort) : loadedProducts;
                renderProducts(list, catalogGrid);
            };

            const loadPage = async () => {
                loading = true;
                updatePagination();
                try {
                    const { products, total: responseTotal } = await fetchWooProducts({
                        page,
                        perPage: PER_PAGE,
                        fields: WOO_LIST_FIELDS,
                    });

                    total = responseTotal || total;
                    const mapped = products
                        .map((p) => normalizeProduct(wooProductToCard(p)))
                        .filter((p) => p.name);
                    loadedProducts.push(...mapped);

                    if (total > 0) {
                        hasMore = loadedProducts.length < total;
                    } else {
                        hasMore = mapped.length > 0;
                    }

                    updateCatalogCount(total, loadedProducts.length);
                    renderCurrent();
                    page += 1;
                } catch (error) {
                    console.error('Woo catalog:', error);
                    if (!loadedProducts.length) {
                        catalogGrid.innerHTML =
                            '<p class="catalog-empty">Не удалось загрузить каталог из магазина. Попробуйте позже.</p>';
                        showToast('Ошибка загрузки каталога (Woo)', 'error');
                    } else {
                        hasMore = false;
                    }
                } finally {
                    loading = false;
                    updatePagination();
                }
            };

            const sortSelect = document.getElementById('catalogSortMain');
            if (sortSelect) {
                sortSelect.addEventListener('change', () => {
                    activeSort = sortSelect.value;
                    renderCurrent();
                });
            }

            loadPage();
        } else {
            const dataBase = (import.meta.env.BASE_URL || '/') + 'data/products/';
            fetch(dataBase + 'index.json')
                .then((response) => response.json())
                .then((index) => {
                    const preview = Array.isArray(index.preview)
                        ? index.preview.map(normalizeProduct)
                        : [];
                    const total = Number.isFinite(Number(index.total))
                        ? Number(index.total)
                        : preview.length;

                    updateCatalogCount(total, preview.length);
                    renderProducts(preview, catalogGrid);

                    const sortSelect = document.getElementById('catalogSortMain');
                    if (sortSelect) {
                        sortSelect.addEventListener('change', () => {
                            const sorted = sortProducts(preview, sortSelect.value);
                            renderProducts(sorted, catalogGrid);
                        });
                    }
                })
                .catch((error) => {
                    console.error('Error loading catalog index:', error);
                    catalogGrid.innerHTML =
                        '<p class="catalog-empty">Не удалось загрузить каталог. Попробуйте позже.</p>';
                    showToast('Ошибка загрузки каталога', 'error');
                });
        }
    }
}

function isSafeHexColor(value) {
    const c = String(value ?? '').trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c);
}

function updateCatalogCount(total, loadedCount) {
    const el = document.querySelector('.ch-count');
    if (!el) return;
    if (Number.isFinite(Number(total)) && Number(total) > 0) {
        el.textContent = `Все изделия (${Number(total)})`;
        return;
    }
    const loaded = Number.isFinite(Number(loadedCount)) ? Number(loadedCount) : 0;
    el.textContent = loaded > 0 ? `Все изделия (${loaded}+)` : 'Все изделия (...)';
}

function renderProducts(products, container) {
    if (!Array.isArray(products) || products.length === 0) {
        container.innerHTML = '<p class="catalog-empty">В каталоге пока нет товаров.</p>';
        return;
    }

    const html = products
        .map((raw, index) => {
            const product = normalizeProduct(raw);
            const delay = (index % 4) + 1;
            const imgSrc = resolveImageUrl(product.image);
            const name = safeText(product.name);

            let badgesHtml = '';
            const badgeList = [...product.badges];
            if (!product.inStock) {
                badgeList.unshift('Нет в наличии');
            }
            if (badgeList.length > 0) {
                badgesHtml = `<div class="product-badges">
                ${badgeList
                    .map((b) => {
                        const key = String(b).toLowerCase();
                        const cls =
                            key === 'нет в наличии'
                                ? 'badge badge-out'
                                : `badge badge-${safeText(key)}`;
                        return `<span class="${cls}">${safeText(b)}</span>`;
                    })
                    .join('')}
            </div>`;
            }

            let sizesHtml = '';
            if (product.sizes.length > 0) {
                sizesHtml = `<div class="product-sizes">
                ${product.sizes
                    .map((s) => `<span class="size-item available">${safeText(s)}</span>`)
                    .join('')}
            </div>`;
            }

            let colorsHtml = '';
            if (product.colors.length > 0) {
                colorsHtml = `<div class="product-colors">
                ${product.colors
                    .map((color) => {
                        const c = String(color).trim();
                        const safeBg = isSafeHexColor(c) ? c : '';
                        const isWhite = safeBg.toUpperCase() === '#FFFFFF';
                        const extraStyle = isWhite ? 'border-color:#ddd' : '';
                        return safeBg
                            ? `<span class="color-dot" style="background:${safeBg}; ${extraStyle}"></span>`
                            : `<span class="color-dot"></span>`;
                    })
                    .join('')}
            </div>`;
            }

            let priceHtml = `<span class="price-current">${formatPrice(product.price)}</span>`;
            if (product.oldPrice != null) {
                priceHtml += `<span class="price-old">${formatPrice(product.oldPrice)}</span>`;
            }

            const idParam = encodeURIComponent(product.id || '');
            const detailHref = USE_WOO
                ? `product.html?woo=${idParam}`
                : `product.html?id=${idParam}`;

            return `
            <div class="product-card reveal reveal-delay-${delay}" data-product-id="${safeText(
                product.id || ''
            )}">
                <div class="product-card-image">
                    <img src="${safeText(imgSrc)}" loading="lazy" alt="${name}">
                    ${badgesHtml}
                    ${sizesHtml}
                    <div class="product-quick-view">
                        <a href="${detailHref}" class="product-quick-btn">Подробнее</a>
                    </div>
                </div>
                <div class="product-card-info">
                    <h3 class="product-card-name">${name}</h3>
                    <div class="product-card-price">${priceHtml}</div>
                    ${colorsHtml}
                </div>
            </div>
        `;
        })
        .join('');

    container.innerHTML = html;
}
