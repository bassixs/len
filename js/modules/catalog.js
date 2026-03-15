export function initCatalog() {
    // ===== CATEGORY PAGE — FILTER GROUPS =====
    document.querySelectorAll('.filter-group-title').forEach(title => {
        title.addEventListener('click', () => {
            const body = title.nextElementSibling;
            if (body) body.classList.toggle('open');
            const icon = title.querySelector('i');
            if (icon) {
                icon.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
            }
        });
    });

    // Open first few filter groups by default
    document.querySelectorAll('.filter-group-body').forEach((body, i) => {
        if (i < 3) body.classList.add('open');
    });

    // ===== CATEGORY PAGE — FILTER SIDEBAR MOBILE TOGGLE =====
    const filterToggle = document.querySelector('.filter-toggle-btn');
    const filterSidebar = document.querySelector('.category-sidebar');

    if (filterToggle && filterSidebar) {
        filterToggle.addEventListener('click', () => {
            filterSidebar.classList.toggle('mobile-open');
            document.body.style.overflow = filterSidebar.classList.contains('mobile-open') ? 'hidden' : '';
        });
    }

    // ===== CATEGORY PAGE — VIEW TOGGLE =====
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ===== DYNAMIC PRODUCT RENDERING =====
    const catalogGrid = document.querySelector('.catalog-grid');
    if (catalogGrid) {
        const base = import.meta.env.BASE_URL || '/';
        fetch(`${base}data/products.json`)
            .then(response => response.json())
            .then(products => {
                renderProducts(products, catalogGrid);
            })
            .catch(error => console.error('Error loading products:', error));
    }
}

function renderProducts(products, container) {
    // Clear existing static HTML (if any, preserving the structure for the demo)
    // container.innerHTML = ''; 

    // For this implementation, we will just append the dynamic ones to show it works
    const html = products.map((product, index) => {
        const delay = (index % 4) + 1; // Simulated reveal delay
        
        let badgesHtml = '';
        if (product.badges && product.badges.length > 0) {
            badgesHtml = `<div class="product-badges">
                ${product.badges.map(b => `<span class="badge badge-${b.toLowerCase()}">${b}</span>`).join('')}
            </div>`;
        }

        let sizesHtml = '';
        if (product.sizes && product.sizes.length > 0) {
            sizesHtml = `<div class="product-sizes">
                ${product.sizes.map(s => `<span class="size-item available">${s}</span>`).join('')}
            </div>`;
        }

        let colorsHtml = '';
        if (product.colors && product.colors.length > 0) {
            colorsHtml = `<div class="product-colors">
                ${product.colors.map(c => {
                    const extraStyle = c === '#FFFFFF' ? 'border-color:#ddd' : '';
                    return `<span class="color-dot" style="background:${c}; ${extraStyle}"></span>`;
                }).join('')}
            </div>`;
        }

        let priceHtml = `<span class="price-current">${product.price.toLocaleString('ru-RU')} ₽</span>`;
        if (product.oldPrice) {
            priceHtml += `<span class="price-old">${product.oldPrice.toLocaleString('ru-RU')} ₽</span>`;
        }

        return `
            <div class="product-card reveal reveal-delay-${delay}">
                <div class="product-card-image">
                    <img src="${product.image}" loading="lazy" alt="${product.name}">
                    ${badgesHtml}
                    ${sizesHtml}
                    <div class="product-quick-view">
                        <a href="product.html?id=${product.id}" class="product-quick-btn">Подробнее</a>
                    </div>
                </div>
                <div class="product-card-info">
                    <h3 class="product-card-name">${product.name}</h3>
                    <div class="product-card-price">${priceHtml}</div>
                    ${colorsHtml}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html; // Replaces static content with dynamic content
}
