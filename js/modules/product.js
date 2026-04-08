import { normalizeProduct, formatPrice, resolveImageUrl, safeText } from './product-model.js';
import { initAccordionGroup } from './accordion.js';
import { showToast } from './toast.js';

const DATA_PRODUCTS_BASE = `${import.meta.env.BASE_URL || '/'}data/products/`;
const RELATED_COUNT = 4;
const USE_WOO = import.meta.env.VITE_USE_WOO === 'true';
const WOO_LIST_FIELDS = 'id,name,price,regular_price,sale_price,images,sku,categories,stock_status';
const PRODUCT_HINT_TTL_MS = 5 * 60 * 1000;

const CATEGORY_LABELS = {
    'home-textile': 'Домашний текстиль',
    women: 'Женская одежда',
    men: 'Мужская одежда',
    socks: 'Льняные носки',
    gifts: 'Подарки и сувениры',
    accessories: 'Аксессуары',
    fabrics: 'Льняные ткани',
};

function isSafeHexColor(value) {
    const c = String(value ?? '').trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c);
}

function setProductLoadingState(isLoading) {
    const infoInner = document.querySelector('.product-info-inner');
    const galleryRoot = document.getElementById('productGallery');
    const titleEl = document.getElementById('productTitle');
    const priceEl = document.getElementById('productPrice');

    if (infoInner) infoInner.classList.toggle('product-loading', isLoading);
    if (titleEl && isLoading) titleEl.textContent = ' ';
    if (priceEl && isLoading) priceEl.textContent = ' ';

    if (galleryRoot && isLoading) {
        galleryRoot.innerHTML = `
            <div class="product-main-image-wrap product-main-image-skeleton" aria-hidden="true">
                <div class="product-main-image"></div>
            </div>
        `;
    }
}

export function initProductPage() {
    setProductLoadingState(true);

    const params = new URLSearchParams(window.location.search);
    const wooId = params.get('woo');

    if (USE_WOO && wooId) {
        const hint = readWooProductHint(wooId);
        if (hint) {
            renderProductHint(hint);
        }
        loadWooProductPage(wooId).catch((err) => {
            console.error('Woo product load error:', err);
            showProductLoadError();
            showToast('Не удалось загрузить карточку товара', 'error');
        });
    } else {
        const productId = params.get('id');
        loadProduct(productId).catch((err) => {
            console.error('Product load error:', err);
            showProductLoadError();
            showToast('Не удалось загрузить карточку товара', 'error');
        });
    }

    initAccordionGroup({
        triggerSelector: '.accordion-head',
        triggerActiveClass: 'active',
        bodyOpenClass: 'open',
        closeOthers: false,
    });

    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    const qtyInput = document.getElementById('qtyInput');

    if (qtyMinus && qtyPlus && qtyInput) {
        qtyMinus.addEventListener('click', (e) => {
            e.preventDefault();
            let val = parseInt(qtyInput.value) || 1;
            if (val > 1) qtyInput.value = val - 1;
        });

        qtyPlus.addEventListener('click', (e) => {
            e.preventDefault();
            let val = parseInt(qtyInput.value) || 1;
            if (val < parseInt(qtyInput.max || 10)) qtyInput.value = val + 1;
        });
    }
}

function readWooProductHint(wooId) {
    try {
        const raw = window.sessionStorage.getItem(`woo_product_hint_${String(wooId || '').trim()}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const age = Date.now() - Number(parsed?.ts || 0);
        if (!parsed || age < 0 || age > PRODUCT_HINT_TTL_MS) return null;
        if (!parsed.id || !parsed.name) return null;
        return parsed;
    } catch {
        return null;
    }
}

function renderProductHint(hint) {
    const titleEl = document.getElementById('productTitle');
    const priceEl = document.getElementById('productPrice');
    if (titleEl) titleEl.textContent = hint.name || '';
    if (priceEl) priceEl.textContent = formatPrice(hint.price || 0);
    document.title = `${hint.name || 'Товар'} — нжен ЛЁН`;

    const product = normalizeProduct({
        id: hint.id,
        name: hint.name,
        price: hint.price,
        oldPrice: hint.oldPrice,
        image: hint.image,
        stockStatus: hint.stockStatus,
        inStock: Boolean(hint.inStock),
        sku: hint.sku || '',
        category: hint.category || '',
    });
    const rawHint = {
        id: hint.id,
        name: hint.name,
        image: hint.image,
        gallery: [],
        wooCategoryId: Number(hint.wooCategoryId || 0),
        wooCategorySlug: hint.category || '',
        wooCategoryName: CATEGORY_LABELS[hint.category] || '',
    };

    renderGallery(rawHint, product);
    renderStockState(product);
    const addBtn = document.querySelector('.add-to-cart-btn');
    if (addBtn) addBtn.dataset.productId = product.id || '';
    setProductLoadingState(false);
}

async function loadWooProductPage(wooId) {
    const { fetchWooProduct, fetchWooProducts } = await import('./woo-client.js');
    const { wooProductToPageRaw, wooProductToCard } = await import('./woo-map.js');

    const p = await fetchWooProduct(wooId);
    const raw = wooProductToPageRaw(p);
    if (!raw) throw new Error('Invalid Woo product');

    renderProduct(raw, 'home-textile');

    const section = document.getElementById('relatedSection');
    const grid = document.getElementById('relatedGrid');
    if (section && grid) {
        // Defer related products so primary product content appears ASAP.
        const loadRelated = async () => {
            const { products } = await fetchWooProducts({
                page: 1,
                perPage: 8,
                category: raw.wooCategoryId || '',
                exclude: [wooId],
                fields: WOO_LIST_FIELDS,
            });
            const others = products.filter((x) => String(x.id) !== String(wooId));
            const picks = others
                .slice(0, RELATED_COUNT)
                .map((x) => normalizeProduct(wooProductToCard(x)));
            grid.innerHTML = picks
                .map((prod, i) => {
                    const imgSrc = resolveImageUrl(prod.image);
                    const name = safeText(prod.name);
                    const delay = (i % 4) + 1;
                    let priceHtml = `<span class="price-current">${formatPrice(prod.price)}</span>`;
                    if (prod.oldPrice != null) {
                        priceHtml += `<span class="price-old">${formatPrice(prod.oldPrice)}</span>`;
                    }
                    const href = USE_WOO
                        ? `product.html?woo=${encodeURIComponent(prod.id)}`
                        : `product.html?id=${encodeURIComponent(prod.id)}`;
                    const stockBadge = !prod.inStock
                        ? '<div class="product-badges"><span class="badge badge-out">Нет в наличии</span></div>'
                        : '';
                    return `
                <div class="product-card reveal reveal-delay-${delay}">
                    <div class="product-card-image">
                        <img src="${safeText(imgSrc)}" loading="lazy" alt="${name}">
                        ${stockBadge}
                        <div class="product-quick-view">
                            <a href="${href}" class="product-quick-btn">Подробнее</a>
                        </div>
                    </div>
                    <div class="product-card-info">
                        <h3 class="product-card-name">${name}</h3>
                        <div class="product-card-price">${priceHtml}</div>
                    </div>
                </div>`;
                })
                .join('');
            section.style.display = '';
        };

        setTimeout(() => {
            loadRelated().catch((err) => {
                console.error('Woo related load error:', err);
            });
        }, 150);
    }
}

async function loadProduct(id) {
    const indexResp = await fetch(`${DATA_PRODUCTS_BASE}index.json`);
    if (!indexResp.ok) throw new Error(`Cannot load index.json: HTTP ${indexResp.status}`);
    const index = await indexResp.json();
    const productCategory = index.productCategory || {};

    let resolvedId = id;
    if (!resolvedId) {
        const fallbackId =
            (Array.isArray(index.preview) && index.preview[0] && index.preview[0].id) ||
            Object.keys(productCategory)[0];
        if (!fallbackId) throw new Error('No products available for fallback');
        resolvedId = fallbackId;
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('id', resolvedId);
        window.history.replaceState({}, '', nextUrl.toString());
    }

    const cat = productCategory[resolvedId];
    if (!cat) throw new Error(`Category for product not found: ${resolvedId}`);

    const catResp = await fetch(`${DATA_PRODUCTS_BASE}${encodeURIComponent(cat)}.json`);
    if (!catResp.ok) throw new Error(`Cannot load ${cat}.json: HTTP ${catResp.status}`);
    const products = await catResp.json();
    const rawProduct = products.find((p) => p.id === resolvedId);
    if (!rawProduct) throw new Error(`Product not found in ${cat}.json for ${resolvedId}`);

    renderProduct(rawProduct, cat);
    renderRelated(products, resolvedId, cat);
}

function renderProduct(rawProduct, cat) {
    setProductLoadingState(false);

    const product = normalizeProduct(rawProduct);

    const titleEl = document.getElementById('productTitle');
    const priceEl = document.getElementById('productPrice');
    if (titleEl) titleEl.textContent = product.name || '';
    if (priceEl) priceEl.textContent = formatPrice(product.price);
    document.title = `${product.name || 'Товар'} — нжен ЛЁН`;

    const categoryCrumb = document.querySelector('.breadcrumbs a[href*="category.html"]');
    if (categoryCrumb) {
        if (rawProduct.wooCategoryName) {
            const wooCat = Number(rawProduct.wooCategoryId || 0);
            const catParam = rawProduct.wooCategorySlug || '';
            categoryCrumb.href = wooCat
                ? `category.html?cat=${encodeURIComponent(catParam || 'home-textile')}&woo_cat=${wooCat}`
                : 'catalog.html';
            categoryCrumb.textContent = rawProduct.wooCategoryName;
        } else {
            categoryCrumb.href = `category.html?cat=${encodeURIComponent(cat)}`;
            categoryCrumb.textContent = CATEGORY_LABELS[cat] || 'Категория';
        }
    }
    const lastCrumb = document.querySelector('.breadcrumbs span:last-child');
    if (lastCrumb) lastCrumb.textContent = product.name || '';

    renderGallery(rawProduct, product);
    renderStockState(product);
    renderOptions(product);
    renderSpecs(product, rawProduct);
    renderDescription(product, rawProduct);

    const addBtn = document.querySelector('.add-to-cart-btn');
    if (addBtn) addBtn.dataset.productId = product.id || '';
}

function renderStockState(product) {
    const priceEl = document.getElementById('productPrice');
    if (!priceEl) return;

    let statusEl = document.getElementById('productStockStatus');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'productStockStatus';
        statusEl.className = 'product-stock-status';
        priceEl.insertAdjacentElement('afterend', statusEl);
    }

    const isOutOfStock = !product.inStock;
    statusEl.textContent = isOutOfStock ? 'Нет в наличии' : 'В наличии';
    statusEl.classList.toggle('is-out', isOutOfStock);
    statusEl.classList.toggle('is-in', !isOutOfStock);

    const addBtn = document.querySelector('.add-to-cart-btn');
    if (addBtn) {
        addBtn.disabled = isOutOfStock;
        addBtn.textContent = isOutOfStock ? 'Нет в наличии' : 'В КОРЗИНУ';
    }

    const qtyInput = document.getElementById('qtyInput');
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    if (qtyInput) qtyInput.disabled = isOutOfStock;
    if (qtyMinus) qtyMinus.disabled = isOutOfStock;
    if (qtyPlus) qtyPlus.disabled = isOutOfStock;
}

// ===== GALLERY =====

function renderGallery(rawProduct, product) {
    const galleryRoot = document.getElementById('productGallery');
    if (!galleryRoot) return;

    const images = [];
    if (product.image) images.push(product.image);
    if (Array.isArray(rawProduct.gallery) && rawProduct.gallery.length) {
        images.push(...rawProduct.gallery);
    }
    if (!images.length) return;

    const srcs = images.map((src) => resolveImageUrl(src));
    let currentIndex = 0;

    const mainHtml = `
        <div class="product-main-image-wrap">
            <div class="product-main-image">
                <img src="${safeText(srcs[0])}" alt="${safeText(product.name || '')}" id="productMainImg" fetchpriority="high" decoding="async">
            </div>
            <button class="product-gallery-nav prev" type="button" id="galleryPrev" aria-label="Предыдущее фото">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="product-gallery-nav next" type="button" id="galleryNext" aria-label="Следующее фото">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    galleryRoot.innerHTML = mainHtml;

    const mainImg = galleryRoot.querySelector('#productMainImg');
    const prevBtn = galleryRoot.querySelector('#galleryPrev');
    const nextBtn = galleryRoot.querySelector('#galleryNext');

    const syncGallery = () => {
        if (!mainImg) return;
        mainImg.setAttribute('src', srcs[currentIndex]);
    };

    const slide = (step) => {
        if (srcs.length <= 1) return;
        currentIndex = (currentIndex + step + srcs.length) % srcs.length;
        syncGallery();
    };

    if (prevBtn) prevBtn.addEventListener('click', () => slide(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => slide(1));

    // Keyboard navigation for better desktop UX.
    galleryRoot.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            slide(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            slide(1);
        }
    });
    galleryRoot.setAttribute('tabindex', '0');

    if (srcs.length <= 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    }
}

// ===== OPTIONS (colors, sizes) =====

function renderOptions(product) {
    const formEl = document.getElementById('addToCartForm');
    const colorGroup = document.getElementById('colorGroup');
    const colorSelector = document.getElementById('colorSelector');
    const colorNameEl = document.getElementById('colorName');

    if (colorGroup && colorSelector && product.colors.length > 0) {
        colorGroup.style.display = '';
        colorSelector.innerHTML = product.colors
            .map((c, i) => {
                const color = String(c).trim();
                const safeBg = isSafeHexColor(color) ? color : '';
                const isWhite = safeBg.toUpperCase() === '#FFFFFF';
                const border = isWhite ? 'border-color:#ddd;' : '';
                const styleAttr = safeBg ? `style="background:${safeBg};${border}"` : '';
                return `<span class="color-dot${i === 0 ? ' active' : ''}" ${styleAttr} data-color="${safeText(
                    color
                )}" title="${safeText(color)}"></span>`;
            })
            .join('');

        if (colorNameEl) colorNameEl.textContent = String(product.colors[0]).trim();

        colorSelector.querySelectorAll('.color-dot').forEach((dot) => {
            dot.addEventListener('click', () => {
                colorSelector
                    .querySelectorAll('.color-dot')
                    .forEach((d) => d.classList.remove('active'));
                dot.classList.add('active');
                if (colorNameEl) colorNameEl.textContent = dot.dataset.color || '';
            });
        });
    }

    const sizeGroup = document.getElementById('sizeGroup');
    const sizeSelector = document.getElementById('sizeSelector');

    if (sizeGroup && sizeSelector && product.sizes.length > 0) {
        sizeGroup.style.display = '';
        sizeSelector.innerHTML = product.sizes
            .map(
                (s, i) =>
                    `<button type="button" class="size-btn${i === 0 ? ' active' : ''}" data-size="${safeText(s)}">${safeText(s)}</button>`
            )
            .join('');

        sizeSelector.querySelectorAll('.size-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                sizeSelector
                    .querySelectorAll('.size-btn')
                    .forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    // If both option groups are hidden, collapse empty form space.
    if (formEl) {
        const hasVisibleOptions = Array.from(formEl.querySelectorAll('.option-group')).some(
            (group) => group.style.display !== 'none'
        );
        formEl.classList.toggle('is-empty', !hasVisibleOptions);
    }
}

// ===== SPECS (SKU, category) =====

function renderSpecs(product, rawProduct = {}) {
    const table = document.getElementById('specsTable');
    if (!table) return;

    if (product.sku) {
        const row = table.insertRow(0);
        row.innerHTML = `<td>Артикул</td><td>${safeText(product.sku)}</td>`;
    }

    if (rawProduct.wooCategoryName) {
        const row = table.insertRow(-1);
        row.innerHTML = `<td>Категория</td><td>${safeText(rawProduct.wooCategoryName)}</td>`;
    } else if (product.category) {
        const label = CATEGORY_LABELS[product.category] || product.category;
        const row = table.insertRow(-1);
        row.innerHTML = `<td>Категория</td><td>${safeText(label)}</td>`;
    }
}

// ===== DESCRIPTION =====

function renderDescription(_product, rawProduct = {}) {
    const descEl = document.getElementById('productDesc');
    if (!descEl) return;

    if (rawProduct.wooHtmlDescription) {
        descEl.innerHTML = rawProduct.wooHtmlDescription;
    } else {
        descEl.textContent =
            'Изделие из 100% натурального льна. ' +
            'Лён обладает высокой терморегуляцией, отводит влагу и позволяет коже дышать. ' +
            'Натуральные оттенки гармонично дополняют любой образ.';
    }

    const toggleBtn = document.getElementById('productDescToggle');
    if (!toggleBtn) return;

    const MAX_COLLAPSED_CHARS = 420;
    const plainText = (descEl.textContent || '').replace(/\s+/g, ' ').trim();
    const needsCollapse = plainText.length > MAX_COLLAPSED_CHARS;

    if (!needsCollapse) {
        descEl.classList.remove('is-collapsed');
        toggleBtn.hidden = true;
        return;
    }

    toggleBtn.hidden = false;
    descEl.classList.add('is-collapsed');
    toggleBtn.textContent = 'Показать полностью';

    toggleBtn.onclick = () => {
        const collapsed = descEl.classList.toggle('is-collapsed');
        toggleBtn.textContent = collapsed ? 'Показать полностью' : 'Свернуть';
    };
}

// ===== RELATED PRODUCTS =====

function renderRelated(allProducts, currentId, _cat) {
    const section = document.getElementById('relatedSection');
    const grid = document.getElementById('relatedGrid');
    if (!section || !grid) return;

    const others = allProducts.filter((p) => p.id !== currentId);
    if (!others.length) return;

    const shuffled = others.sort(() => 0.5 - Math.random());
    const picks = shuffled.slice(0, RELATED_COUNT).map(normalizeProduct);

    grid.innerHTML = picks
        .map((p, i) => {
            const imgSrc = resolveImageUrl(p.image);
            const name = safeText(p.name);
            const delay = (i % 4) + 1;

            let priceHtml = `<span class="price-current">${formatPrice(p.price)}</span>`;
            if (p.oldPrice != null) {
                priceHtml += `<span class="price-old">${formatPrice(p.oldPrice)}</span>`;
            }
            const stockBadge = !p.inStock
                ? '<div class="product-badges"><span class="badge badge-out">Нет в наличии</span></div>'
                : '';

            return `
            <div class="product-card reveal reveal-delay-${delay}">
                <div class="product-card-image">
                    <img src="${safeText(imgSrc)}" loading="lazy" alt="${name}">
                    ${stockBadge}
                    <div class="product-quick-view">
                        <a href="product.html?id=${encodeURIComponent(p.id)}" class="product-quick-btn">Подробнее</a>
                    </div>
                </div>
                <div class="product-card-info">
                    <h3 class="product-card-name">${name}</h3>
                    <div class="product-card-price">${priceHtml}</div>
                </div>
            </div>`;
        })
        .join('');

    section.style.display = '';
}

function showProductLoadError() {
    setProductLoadingState(false);

    const titleEl = document.getElementById('productTitle');
    const priceEl = document.getElementById('productPrice');
    const galleryRoot = document.getElementById('productGallery');
    if (titleEl) titleEl.textContent = 'Товар временно недоступен';
    if (priceEl) priceEl.textContent = '—';
    if (galleryRoot) {
        galleryRoot.innerHTML =
            '<div class="category-empty">Не удалось загрузить карточку товара. Попробуйте позже.</div>';
    }
}
