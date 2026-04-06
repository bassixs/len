/**
 * Маппинг ответов WooCommerce REST API в формат карточек/карточки товара этого фронта.
 */

function parsePrice(p) {
    const sale = p.sale_price ? parseFloat(String(p.sale_price).replace(',', '.')) : NaN;
    const regular = parseFloat(String(p.regular_price || p.price || '0').replace(',', '.'));
    if (Number.isFinite(sale) && sale > 0 && sale < regular) {
        return { price: sale, oldPrice: regular };
    }
    return { price: Number.isFinite(regular) ? regular : 0, oldPrice: null };
}

function extractMaxWidthFromSrcset(srcset) {
    const s = String(srcset || '');
    if (!s) return 0;
    const matches = Array.from(s.matchAll(/(\d+)\s*w/g));
    if (!matches.length) return 0;
    return matches.reduce((max, m) => Math.max(max, Number(m[1] || 0)), 0);
}

function pickBestMainAndGallery(imagesRaw) {
    const images = Array.isArray(imagesRaw)
        ? imagesRaw.filter((i) => i && i.src).map((i) => ({ src: i.src, srcset: i.srcset }))
        : [];
    if (!images.length) return { main: '', gallery: [] };
    if (images.length === 1) return { main: images[0].src, gallery: [] };

    let bestIdx = 0;
    let bestScore = -1;
    images.forEach((img, idx) => {
        const score = extractMaxWidthFromSrcset(img.srcset);
        if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
        }
    });

    const main = images[bestIdx]?.src || images[0].src;
    const gallery = images.filter((_, idx) => idx !== bestIdx).map((img) => img.src);
    return { main, gallery };
}

/** Карточка каталога (как normalizeProduct) */
export function wooProductToCard(p) {
    if (!p || typeof p !== 'object') return null;
    const { price, oldPrice } = parsePrice(p);
    const imgs = Array.isArray(p.images) ? p.images.map((i) => i?.src).filter(Boolean) : [];
    const categories = Array.isArray(p.categories) ? p.categories : [];
    const mainCategory = categories[0] || null;
    const subCategory = categories[1] || null;
    return {
        id: String(p.id),
        name: String(p.name || ''),
        price,
        oldPrice,
        image: imgs[0] || '',
        badges: [],
        sizes: [],
        colors: [],
        category: mainCategory ? String(mainCategory.slug || '') : '',
        subCategory: subCategory ? String(subCategory.slug || '') : '',
        sku: String(p.sku || ''),
        url: '',
        stockStatus: String(p.stock_status || ''),
        inStock: String(p.stock_status || '').toLowerCase() === 'instock',
        wooCategories: categories.map((c) => ({
            id: Number(c?.id || 0),
            name: String(c?.name || ''),
            slug: String(c?.slug || ''),
            parent: Number(c?.parent || 0),
        })),
    };
}

/** Сырой объект под renderProduct: gallery + поля для описания */
export function wooProductToPageRaw(p) {
    if (!p || typeof p !== 'object') return null;
    const { price, oldPrice } = parsePrice(p);
    const { main, gallery } = pickBestMainAndGallery(p.images);
    const cat = Array.isArray(p.categories) && p.categories[0] ? p.categories[0] : null;
    const shortDesc = String(p.short_description || '').trim();
    const longDesc = String(p.description || '').trim();
    let wooHtmlDescription = '';
    if (longDesc) wooHtmlDescription = longDesc;
    else if (shortDesc) wooHtmlDescription = `<p>${escapeHtmlPlain(shortDesc)}</p>`;

    return {
        id: String(p.id),
        name: String(p.name || ''),
        price,
        oldPrice,
        image: main || '',
        gallery,
        badges: [],
        sizes: [],
        colors: [],
        category: '',
        subCategory: '',
        sku: String(p.sku || ''),
        url: '',
        stockStatus: String(p.stock_status || ''),
        inStock: String(p.stock_status || '').toLowerCase() === 'instock',
        wooHtmlDescription,
        wooCategoryId: cat ? Number(cat.id || 0) : 0,
        wooCategorySlug: cat ? String(cat.slug || '') : '',
        wooCategoryName: cat ? String(cat.name || '') : '',
    };
}

function escapeHtmlPlain(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
