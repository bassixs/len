/**
 * Страница категории: загрузка товаров из data/products/{cat}.json,
 * фильтр по подкатегориям, пагинация по 24 товара.
 */
const PER_PAGE = 24;
const BASE = import.meta.env.BASE_URL || '/';
const DATA_BASE = (import.meta.env.BASE_URL || '/') + 'data/products/';
function categoryDataUrl(cat) {
    return DATA_BASE + encodeURIComponent(cat) + '.json';
}

const SUBCAT_LABELS = {
    // home-textile
    'kitchen-towel': 'Полотенца кухонные',
    apron: 'Фартуки',
    tablecloth: 'Скатерти',
    napkin: 'Салфетки',
    runner: 'Стриши, дорожки',
    'bedding-set': 'Постельные комплекты',
    pillowcase: 'Наволочки',
    'duvet-cover': 'Пододеяльники',
    sheet: 'Простыни',
    blanket: 'Пледы, покрывала',
    'bath-towel': 'Полотенца банные',
    // men
    shirt: 'Сорочки',
    pants: 'Брюки',
    blazer: 'Пиджаки',
    shorts: 'Шорты',
    // women
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
    // socks
    men: 'Для мужчин',
    women: 'Для женщин',
    // gifts
    toys: 'Льняные игрушки',
    souvenirs: 'Сувениры',
    gifts: 'Подарки',
    // accessories
    jewelry: 'Украшения',
    bags: 'Сумки',
    hats: 'Головные уборы',
    // fabrics
    all: 'Все',
};

function pluralize(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

function renderCard(product) {
    const price = (product.price || 0).toLocaleString('ru-RU');
    const rawImg = product.image || 'images/product.tablecloth.webp';
    const img = rawImg.startsWith('http') ? rawImg : BASE + rawImg.replace(/^\//, '');
    return `
    <div class="product-card reveal" data-sub="${product.subCategory || ''}" data-product-id="${escapeHtml(product.id || '')}">
      <div class="product-card-image">
        <img src="${img}" loading="lazy" alt="${escapeHtml(product.name)}">
        <div class="product-quick-view">
          <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-quick-btn">Подробнее</a>
        </div>
      </div>
      <div class="product-card-info">
        <h3 class="product-card-name">${escapeHtml(product.name)}</h3>
        <div class="product-card-price"><span class="price-current">${price} ₽</span></div>
        ${product.sku ? `<div class="product-card-sku">Арт. ${escapeHtml(product.sku)}</div>` : ''}
      </div>
    </div>`;
}

function escapeHtml(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
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

    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat') || 'home-textile';

    const countEl = document.querySelector('.ch-ref-count');
    const subcatsEl = document.querySelector('.ch-ref-subcats');

    grid.innerHTML = '<div class="category-loading">Загрузка товаров…</div>';

    const url = categoryDataUrl(cat);
    fetch(url)
        .then((r) => {
            if (!r.ok) {
                throw new Error(`HTTP ${r.status} for ${url}`);
            }
            return r.json();
        })
        .then((allProducts) => {
            const products = allProducts.filter((p) => (p.category || '') === cat);
            if (!products.length) {
                grid.innerHTML = '<p class="category-empty">В этой категории пока нет товаров.</p>';
                if (countEl) countEl.textContent = '(0 товаров)';
                return;
            }

            const counts = buildSubcatCounts(products);
            const total = products.length;
            const word = pluralize(total, 'товар', 'товара', 'товаров');
            if (countEl) countEl.textContent = `(${total} ${word})`;

            if (subcatsEl) {
                const backLink = subcatsEl.querySelector('.ch-ref-subcat-back');
                subcatsEl.innerHTML = '';
                if (backLink) {
                    const span = backLink.querySelector('span');
                    if (span) span.textContent = `(${total})`;
                    subcatsEl.appendChild(backLink);
                }

                const allTab = document.createElement('a');
                allTab.href = '#';
                allTab.className = 'ch-ref-subcat active';
                allTab.dataset.filter = '';
                allTab.innerHTML = `ВСЕ <span>(${total})</span>`;
                subcatsEl.appendChild(allTab);

                Object.keys(counts).forEach((key) => {
                    if (key === 'all') return;
                    const label = SUBCAT_LABELS[key] || key;
                    const a = document.createElement('a');
                    a.href = '#';
                    a.className = 'ch-ref-subcat';
                    a.dataset.filter = key;
                    a.innerHTML = `${label.toUpperCase()} <span>(${counts[key]})</span>`;
                    subcatsEl.appendChild(a);
                });
            }

            let currentFilter = '';
            let currentPage = 1;

            function getFiltered() {
                if (!currentFilter) return products;
                return products.filter((p) => (p.subCategory || '') === currentFilter);
            }

            function render(append = false) {
                const list = getFiltered();
                const start = (currentPage - 1) * PER_PAGE;
                const slice = list.slice(start, start + PER_PAGE);
                const html = slice.map(renderCard).join('');
                if (append) grid.insertAdjacentHTML('beforeend', html);
                else grid.innerHTML = html;

                const paginationEl = document.getElementById('categoryPagination');
                if (paginationEl) {
                    const totalPages = Math.ceil(list.length / PER_PAGE);
                    const hasMore = start + slice.length < list.length;
                    if (totalPages <= 1 && !hasMore) {
                        paginationEl.innerHTML = '';
                        return;
                    }
                    if (hasMore) {
                        paginationEl.innerHTML = `<button type="button" class="btn btn-outline category-load-more">Показать ещё</button>`;
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
                    currentFilter = t.dataset.filter || '';
                    currentPage = 1;
                    render();
                });
            }

            render();
        })
        .catch((err) => {
            console.error('Category products load error:', err);
            grid.innerHTML =
                '<p class="category-empty">Не удалось загрузить товары. Попробуйте позже.</p>';
        });
}
