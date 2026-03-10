export function initProductPage() {
    // ===== PRODUCT PAGE — GALLERY =====
    const mainImage = document.getElementById('productMainImg');
    const thumbs = document.querySelectorAll('.thumb');
    const galleryPrev = document.getElementById('galleryPrev');
    const galleryNext = document.getElementById('galleryNext');

    if (mainImage && thumbs.length > 0) {
        let currentIndex = 0;
        const images = Array.from(thumbs).map(t => {
            const img = t.querySelector('img');
            return img ? img.src.replace(/w=200/, 'w=800') : '';
        });

        function setActiveThumb(index) {
            thumbs.forEach(t => t.classList.remove('active'));
            thumbs[index].classList.add('active');
            mainImage.src = images[index];
            currentIndex = index;
        }

        thumbs.forEach((thumb, i) => {
            thumb.addEventListener('click', () => setActiveThumb(i));
        });

        if (galleryPrev) {
            galleryPrev.addEventListener('click', () => {
                const prev = (currentIndex - 1 + images.length) % images.length;
                setActiveThumb(prev);
            });
        }

        if (galleryNext) {
            galleryNext.addEventListener('click', () => {
                const next = (currentIndex + 1) % images.length;
                setActiveThumb(next);
            });
        }
    }

    // ===== PRODUCT PAGE — TABS =====
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    if (tabBtns.length > 0 && tabPanels.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;

                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const panel = document.getElementById('tab-' + target);
                if (panel) panel.classList.add('active');
            });
        });
    }

    // ===== PRODUCT PAGE — COLOR SELECTOR =====
    const colorOptions = document.querySelectorAll('.color-selector .color-option');
    const colorNameEl = document.getElementById('colorName');

    if (colorOptions.length > 0 && colorNameEl) {
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                const name = option.getAttribute('data-color');

                colorOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');

                if (name) {
                    colorNameEl.textContent = name;
                }
            });
        });
    }

    // ===== PRODUCT PAGE — SIZE SELECTOR =====
    const sizeButtons = document.querySelectorAll('.size-selector .size-btn');

    if (sizeButtons.length > 0) {
        sizeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                sizeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    // ===== PRODUCT PAGE — QUANTITY =====
    const qtyInput = document.getElementById('qtyInput');
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');

    if (qtyInput && qtyMinus && qtyPlus) {
        qtyMinus.addEventListener('click', () => {
            let val = parseInt(qtyInput.value) || 1;
            if (val > 1) qtyInput.value = val - 1;
        });

        qtyPlus.addEventListener('click', () => {
            let val = parseInt(qtyInput.value) || 1;
            if (val < 99) qtyInput.value = val + 1;
        });
    }
}
