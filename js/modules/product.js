import { normalizeProduct, formatPrice, resolveImageUrl, safeText } from './product-model.js';
import { initAccordionGroup } from './accordion.js';
import { showToast } from './toast.js';

const DATA_PRODUCTS_BASE = `${import.meta.env.BASE_URL || '/'}data/products/`;
const RELATED_COUNT = 4;
const USE_WOO = import.meta.env.VITE_USE_WOO === 'true';
const WOO_LIST_FIELDS = 'id,name,price,regular_price,sale_price,images,sku,categories,stock_status';

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

export function initProductPage() {
    const params = new URLSearchParams(window.location.search);
    const wooId = params.get('woo');

    if (USE_WOO && wooId) {
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
        const { products } = await fetchWooProducts({
            page: 1,
            perPage: 12,
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
    const mainSrc = srcs[0];
    const thumbs = srcs.slice(1);

    const mainHtml = `
        <div class="product-main-image">
            <img src="${safeText(mainSrc)}" alt="${safeText(product.name || '')}" id="productMainImg">
        </div>
    `;

    let thumbsHtml = '';
    if (thumbs.length) {
        thumbsHtml = `
            <div class="product-thumbs">
                ${thumbs
                    .map(
                        (src, i) =>
                            `<button class="product-thumb${i === 0 ? ' active' : ''}" type="button" data-src="${safeText(
                                src
                            )}">
                                <img src="${safeText(src)}" alt="${safeText(product.name || '')}">
                            </button>`
                    )
                    .join('')}
            </div>
        `;
    }

    galleryRoot.innerHTML = mainHtml + thumbsHtml;

    if (thumbs.length) {
        const mainImg = galleryRoot.querySelector('#productMainImg');
        const thumbBtns = Array.from(galleryRoot.querySelectorAll('.product-thumb'));
        thumbBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                if (mainImg) mainImg.setAttribute('src', btn.getAttribute('data-src'));
                thumbBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
}

// ===== OPTIONS (colors, sizes) =====

function renderOptions(product) {
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
