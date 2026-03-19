/**
 * Страница категории: загрузка товаров из data/products/{cat}.json,
 * фильтр по подкатегориям и цене, сортировка, пагинация по 24 товара.
 * Состояние фильтров и сортировки сохраняется в URL.
 */
import { normalizeProduct, formatPrice, resolveImageUrl, safeText } from './product-model.js';
import { showToast } from './toast.js';

const PER_PAGE = 24;
const DATA_BASE = (import.meta.env.BASE_URL || '/') + 'data/products/';

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

    return `
    <div class="product-card reveal" data-sub="${safeText(product.subCategory)}" data-product-id="${safeText(product.id)}">
      <div class="product-card-image">
        <img src="${safeText(imgSrc)}" loading="lazy" alt="${name}">
        <div class="product-quick-view">
          <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-quick-btn">Подробнее</a>
        </div>
      </div>
      <div class="product-card-info">
        <h3 class="product-card-name">${name}</h3>
        <div class="product-card-price">${priceHtml}</div>
        ${product.sku ? `<div class="product-card-sku">Арт. ${safeText(product.sku)}</div>` : ''}
      </div>
    </div>`;
}

function buildSubcatCounts(products) {
    const map = {};
    products.forEach((p) => {
        const key = p.subCategory || 'all';
        map[key] = (map[key] || 0) + 1;
    });
    return map;
}

export function initCategoryProducts() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;

    const state = readUrlState();
    const countEl = document.querySelector('.ch-ref-count');
    const subcatsEl = document.querySelector('.ch-ref-subcats');

    grid.innerHTML = '<div class="category-loading">Загрузка товаров…</div>';

    const url = DATA_BASE + encodeURIComponent(state.cat) + '.json';
    fetch(url)
        .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
            return r.json();
        })
        .then((allProducts) => {
            const products = allProducts
                .filter((p) => (p.category || '') === state.cat)
                .map(normalizeProduct);

            if (!products.length) {
                grid.innerHTML = '<p class="category-empty">В этой категории пока нет товаров.</p>';
                if (countEl) countEl.textContent = '(0 товаров)';
                return;
            }

            const counts = buildSubcatCounts(products);
            const total = products.length;
            const word = pluralize(total, 'товар', 'товара', 'товаров');
            if (countEl) countEl.textContent = `(${total} ${word})`;

            buildSubcatTabs(subcatsEl, counts, total, state.sub);
            buildSortDropdown(state.sort);
            buildPriceFilter(state.priceFrom, state.priceTo);

            let currentPage = 1;

            function getProcessed() {
                let list = products;
                if (state.sub) {
                    list = list.filter((p) => (p.subCategory || '') === state.sub);
                }
                list = filterByPrice(list, state.priceFrom, state.priceTo);
                list = sortProducts(list, state.sort);
                return list;
            }

            function render(append = false) {
                const list = getProcessed();
                const start = (currentPage - 1) * PER_PAGE;
                const slice = list.slice(start, start + PER_PAGE);
                const html = slice.map(renderCard).join('');
                if (append) grid.insertAdjacentHTML('beforeend', html);
                else
                    grid.innerHTML =
                        html || '<p class="category-empty">Нет товаров по заданным параметрам.</p>';

                const paginationEl = document.getElementById('categoryPagination');
                if (paginationEl) {
                    const hasMore = start + slice.length < list.length;
                    if (hasMore) {
                        paginationEl.innerHTML =
                            '<button type="button" class="btn btn-outline-dark category-load-more">Показать ещё</button>';
                        paginationEl
                            .querySelector('.category-load-more')
                            .addEventListener('click', () => {
                                currentPage += 1;
                                render(true);
                            });
                    } else {
                        paginationEl.innerHTML = '';
                    }
                }

                const resultCountEl = document.querySelector('.ch-ref-result-count');
                if (resultCountEl) {
                    resultCountEl.textContent = `${list.length} ${pluralize(list.length, 'товар', 'товара', 'товаров')}`;
                }
            }

            function resetAndRender() {
                currentPage = 1;
                writeUrlState(state);
                render();
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

            render();
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
        const label = SUBCAT_LABELS[key] || key;
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'ch-ref-subcat' + (activeSub === key ? ' active' : '');
        a.dataset.filter = key;
        a.innerHTML = `${label.toUpperCase()} <span>(${counts[key]})</span>`;
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
